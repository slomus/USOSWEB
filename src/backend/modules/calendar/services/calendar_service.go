package calendar

import (
	"context"
	"database/sql"
	"fmt"
	"time"
	"strings"
  "google.golang.org/grpc/metadata"
	pb "github.com/slomus/USOSWEB/src/backend/modules/calendar/gen/calendar"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var calendarLog = logger.NewLogger("calendar-service")

type CalendarServer struct {
	pb.UnimplementedCalendarServiceServer
	db *sql.DB
}

func NewCalendarServer(db *sql.DB) *CalendarServer {
	return &CalendarServer{
		db: db,
	}
}

func (s *CalendarServer) GetAcademicCalendar(ctx context.Context, req *pb.GetAcademicCalendarRequest) (*pb.GetAcademicCalendarResponse, error) {
	calendarLog.LogInfo("GetAcademicCalendar request received")

	academicYear := req.AcademicYear
	if academicYear == nil || *academicYear == "" {
		year := getCurrentAcademicYear()
		academicYear = &year
	}

	conditions := []string{"academic_year = $1"}
	args := []interface{}{*academicYear}
	argCount := 2

	if req.StartDate != nil && *req.StartDate != "" {
		conditions = append(conditions, fmt.Sprintf("(end_date IS NULL OR end_date >= $%d)", argCount))
		args = append(args, *req.StartDate)
		argCount++
	}

	if req.EndDate != nil && *req.EndDate != "" {
		conditions = append(conditions, fmt.Sprintf("start_date <= $%d", argCount))
		args = append(args, *req.EndDate)
		argCount++
	}
	if req.EventType != nil && *req.EventType != "" {
		conditions = append(conditions, fmt.Sprintf("event_type = $%d", argCount))
		args = append(args, *req.EventType)
		argCount++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + conditions[0]
		for i := 1; i < len(conditions); i++ {
			whereClause += " AND " + conditions[i]
		}
	}

	query := fmt.Sprintf(`
		SELECT
			calendar_id,
			event_type,
			title,
			COALESCE(description, '') as description,
		  start_date::text,
			COALESCE(end_date::text, '') as end_date,
			academic_year,
			COALESCE(applies_to, 'all') as applies_to
		FROM academic_calendar
		%s
		ORDER BY start_date, event_type
	`, whereClause)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		calendarLog.LogError("Failed to fetch academic calendar", err)
		return nil, status.Error(codes.Internal, "failed to fetch academic calendar")
	}
	defer rows.Close()

	var events []*pb.AcademicCalendarEvent
	for rows.Next() {
		var event pb.AcademicCalendarEvent
		var endDate sql.NullString

		err := rows.Scan(
			&event.EventId,
			&event.EventType,
			&event.Title,
			&event.Description,
			&event.StartDate,
			&endDate,
			&event.AcademicYear,
			&event.AppliesTo,
		)
		if err != nil {
			calendarLog.LogError("Failed to scan calendar event", err)
			continue
		}

		if endDate.Valid {
			event.EndDate = endDate.String
		}

		events = append(events, &event)
	}

	semesterInfo, err := s.getCurrentSemesterInfoInternal(*academicYear)
	if err != nil {
		calendarLog.LogWarn("Failed to get semester info")
	}

	return &pb.GetAcademicCalendarResponse{
		Success:             true,
		Message:             fmt.Sprintf("Found %d events", len(events)),
		Events:              events,
		CurrentAcademicYear: semesterInfo,
	}, nil
}

func (s *CalendarServer) GetCurrentSemesterInfo(ctx context.Context, req *pb.GetCurrentSemesterInfoRequest) (*pb.GetCurrentSemesterInfoResponse, error) {
	calendarLog.LogInfo("GetCurrentSemesterInfo request received")

	academicYear := getCurrentAcademicYear()
	semesterInfo, err := s.getCurrentSemesterInfoInternal(academicYear)

	if err != nil {
		calendarLog.LogError("Failed to get semester info", err)
		return &pb.GetCurrentSemesterInfoResponse{
			Success: false,
			Message: "Failed to get semester info",
		}, nil
	}

	return &pb.GetCurrentSemesterInfoResponse{
		Success:      true,
		Message:      "Semester info retrieved successfully",
		SemesterInfo: semesterInfo,
	}, nil
}

func (s *CalendarServer) GetHolidays(ctx context.Context, req *pb.GetHolidaysRequest) (*pb.GetHolidaysResponse, error) {
	calendarLog.LogInfo("GetHolidays request received")

	startDate := req.StartDate
	endDate := req.EndDate

	if startDate == nil || *startDate == "" {
		now := time.Now().Format("2006-01-02")
		startDate = &now
	}

	if endDate == nil || *endDate == "" {
		future := time.Now().AddDate(0, 3, 0).Format("2006-01-02")
		endDate = &future
	}

	query := `
		SELECT
	  start_date::text,
			title,
			event_type,
			CASE
				WHEN event_type = 'holiday' THEN true
				ELSE false
			END as is_free_day
		FROM academic_calendar
		WHERE event_type IN ('holiday', 'break')
		  AND start_date BETWEEN $1 AND $2
		ORDER BY start_date
	`

	rows, err := s.db.Query(query, *startDate, *endDate)
	if err != nil {
		calendarLog.LogError("Failed to fetch holidays", err)
		return nil, status.Error(codes.Internal, "failed to fetch holidays")
	}
	defer rows.Close()

	var holidays []*pb.Holiday
	totalDaysOff := int32(0)

	for rows.Next() {
		var holiday pb.Holiday
		err := rows.Scan(
			&holiday.Date,
			&holiday.Name,
			&holiday.Type,
			&holiday.IsFreeDay,
		)
		if err != nil {
			calendarLog.LogError("Failed to scan holiday", err)
			continue
		}

		holidays = append(holidays, &holiday)
		if holiday.IsFreeDay {
			totalDaysOff++
		}
	}

	if req.IncludeWeekends {
		weekends := getWeekendsInRange(*startDate, *endDate)
		for _, weekend := range weekends {
			holidays = append(holidays, &pb.Holiday{
				Date:      weekend,
				Name:      "Weekend",
				Type:      "weekend",
				IsFreeDay: true,
			})
			totalDaysOff++
		}
	}

	return &pb.GetHolidaysResponse{
		Success:      true,
		Message:      fmt.Sprintf("Found %d holidays", len(holidays)),
		Holidays:     holidays,
		TotalDaysOff: totalDaysOff,
	}, nil
}

func (s *CalendarServer) CreateAcademicEvent(ctx context.Context, req *pb.CreateAcademicEventRequest) (*pb.CreateAcademicEventResponse, error) {
	calendarLog.LogInfo("CreateAcademicEvent request received")


	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		calendarLog.LogError("Failed to get user_id from context", err)
		return &pb.CreateAcademicEventResponse{
			Success: false,
			Message: "Unauthorized",
		}, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	var isAdmin bool
	err = s.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM administrative_staff WHERE user_id = $1
		)
	`, userID).Scan(&isAdmin)
	
	if err != nil || !isAdmin {
		calendarLog.LogWarn(fmt.Sprintf("Non-admin user %d tried to create academic event", userID))
		return &pb.CreateAcademicEventResponse{
			Success: false,
			Message: "Only administrators can create academic events",
		}, status.Error(codes.PermissionDenied, "insufficient permissions")
	}

	var endDate interface{}
	if req.EndDate != "" {
		endDate = req.EndDate
	} else {
		endDate = nil
	}

	query := `
		INSERT INTO academic_calendar (
			event_type, title, description, start_date, end_date,
			academic_year, applies_to
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING calendar_id
	`

	var eventID int64
	err = s.db.QueryRow(
		query,
		req.EventType,
		req.Title,
		req.Description,
		req.StartDate,
		endDate,
		req.AcademicYear,
		req.AppliesTo,
	).Scan(&eventID)

	if err != nil {
		calendarLog.LogError("Failed to create academic event", err)
		return &pb.CreateAcademicEventResponse{
			Success: false,
			Message: "Failed to create event",
		}, nil
	}

	calendarLog.LogInfo(fmt.Sprintf("Created academic event with ID: %d", eventID))

	return &pb.CreateAcademicEventResponse{
		Success: true,
		Message: "Event created successfully",
		Event: &pb.AcademicCalendarEvent{
			EventId:      eventID,
			EventType:    req.EventType,
			Title:        req.Title,
			Description:  req.Description,
			StartDate:    req.StartDate,
			EndDate:      req.EndDate,
			AcademicYear: req.AcademicYear,
			AppliesTo:    req.AppliesTo,
		},
	}, nil
}

func getCurrentAcademicYear() string {
	now := time.Now()
	year := now.Year()

	if now.Month() >= 10 {
		return fmt.Sprintf("%d/%d", year, year+1)
	}
	return fmt.Sprintf("%d/%d", year-1, year)
}

func (s *CalendarServer) getCurrentSemesterInfoInternal(academicYear string) (*pb.AcademicYearInfo, error) {
	now := time.Now()

	currentSemester := "winter"
	if now.Month() >= 2 && now.Month() < 10 {
		currentSemester = "summer"
	}

	var semesterStart, semesterEnd, examStart, examEnd  string

	query := `
	  SELECT start_date::text
		FROM academic_calendar
		WHERE event_type = 'semester_start'
		  AND applies_to = $1
		  AND academic_year = $2
		LIMIT 1
	`

	err := s.db.QueryRow(query,  academicYear).Scan(&semesterStart)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	weekNumber := int32(0)
	if semesterStart != "" {
		startTime, _ := time.Parse("2006-01-02", semesterStart)
		weeksSinceStart := int32(now.Sub(startTime).Hours() / 24 / 7)
		weekNumber = weeksSinceStart + 1
		if weekNumber < 1 {
			weekNumber = 1
		}
	}
	var holidays []string
	holidayQuery := `
		SELECT title
		FROM academic_calendar
		WHERE event_type = 'holiday'
	  AND start_date::text > CURRENT_DATE
	  AND start_date::text <= CURRENT_DATE + INTERVAL '30 days'
	  ORDER BY start_date::text
		LIMIT 5
	`
	rows, _ := s.db.Query(holidayQuery)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var holiday string
			rows.Scan(&holiday)
			holidays = append(holidays, holiday)
		}
	}

	return &pb.AcademicYearInfo{
		Year:             academicYear,
		CurrentSemester:  currentSemester,
		CurrentWeek:      weekNumber,
		SemesterStart:    semesterStart,
		SemesterEnd:      semesterEnd,
		ExamSessionStart: examStart,
		ExamSessionEnd:   examEnd,
		Holidays:         holidays,
	}, nil
}

func getWeekendsInRange(startDate, endDate string) []string {
	var weekends []string

	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return weekends
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return weekends
	}

	for d := start; d.Before(end) || d.Equal(end); d = d.AddDate(0, 0, 1) {
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			weekends = append(weekends, d.Format("2006-01-02"))
		}
	}

	return weekends
}

func (s *CalendarServer) GetWeekSchedule(ctx context.Context, req *pb.GetWeekScheduleRequest) (*pb.GetWeekScheduleResponse, error) {
	calendarLog.LogInfo("GetWeekSchedule request received")

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		calendarLog.LogError("Failed to get user_id from context", err)
		return &pb.GetWeekScheduleResponse{
			Success: false,
			Message: "Unauthorized",
		}, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	role, albumNr, teachingStaffID, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		calendarLog.LogError("Failed to get user role", err)
		return nil, status.Error(codes.Internal, "database error")
	}

	if role != "student" && role != "teacher" {
		return &pb.GetWeekScheduleResponse{
			Success: false,
			Message: "Only students and teachers can view schedules",
		}, status.Error(codes.PermissionDenied, "insufficient permissions")
	}

	var targetDate time.Time
	if req.Date != nil && *req.Date != "" {
		targetDate, err = time.Parse("2006-01-02", *req.Date)
		if err != nil {
			return &pb.GetWeekScheduleResponse{
				Success: false,
				Message: "Invalid date format. Use YYYY-MM-DD",
			}, status.Error(codes.InvalidArgument, "invalid date format")
		}
	} else {
		targetDate = time.Now()
	}

	weekday := int(targetDate.Weekday())
	if weekday == 0 { 
		weekday = 7
	}
	
	weekStart := targetDate.AddDate(0, 0, -(weekday - 1))
	weekEnd := weekStart.AddDate(0, 0, 4)

	baseQuery := `
		SELECT 
			sch.id as schedule_id,
			sch.class_id,
			s.name as subject_name,
			c.class_type,
			sch.day_of_week,
			sch.start_time::text,
			sch.end_time::text,
			sch.room,
			sch.building,
			COALESCE(
				STRING_AGG(
					DISTINCT CONCAT(u.name, ' ', u.surname), 
					', '
				),
				'Nie przypisano'
			) as instructor_name
		FROM schedules sch
		JOIN classes c ON sch.class_id = c.class_id
		JOIN subjects s ON c.subject_id = s.subject_id
		LEFT JOIN course_instructors ci ON c.class_id = ci.class_id
		LEFT JOIN teaching_staff ts ON ci.teaching_staff_id = ts.teaching_staff_id
		LEFT JOIN users u ON ts.user_id = u.user_id
	`

	var query string
	var args []interface{}

	if role == "student" {
		query = baseQuery + `
		JOIN student_classes sc ON c.class_id = sc.class_id
		WHERE sc.album_nr = $1
		  AND sch.valid_from <= $2
		  AND sch.valid_to >= $3
		  AND sch.day_of_week BETWEEN 1 AND 5
		GROUP BY sch.id, sch.class_id, s.name, c.class_type, sch.day_of_week, 
		         sch.start_time, sch.end_time, sch.room, sch.building
		ORDER BY sch.day_of_week, sch.start_time
		`
		args = []interface{}{albumNr, weekEnd, weekStart}
	} else { // role == "teacher"
		query = baseQuery + `
		JOIN course_instructors ci_filter ON c.class_id = ci_filter.class_id
		WHERE ci_filter.teaching_staff_id = $1
		  AND sch.valid_from <= $2
		  AND sch.valid_to >= $3
		  AND sch.day_of_week BETWEEN 1 AND 5
		GROUP BY sch.id, sch.class_id, s.name, c.class_type, sch.day_of_week, 
		         sch.start_time, sch.end_time, sch.room, sch.building
		ORDER BY sch.day_of_week, sch.start_time
		`
		args = []interface{}{teachingStaffID, weekEnd, weekStart}
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		calendarLog.LogError("Failed to query week schedule", err)
		return nil, status.Error(codes.Internal, "failed to fetch schedule")
	}
	defer rows.Close()

	var schedule []*pb.ScheduleEntry
	for rows.Next() {
		entry := &pb.ScheduleEntry{}
		
		err := rows.Scan(
			&entry.ScheduleId,
			&entry.ClassId,
			&entry.SubjectName,
			&entry.ClassType,
			&entry.DayOfWeek,
			&entry.StartTime,
			&entry.EndTime,
			&entry.Room,
			&entry.Building,
			&entry.InstructorName,
		)
		
		if err != nil {
			calendarLog.LogError("Failed to scan schedule entry", err)
			continue
		}
		
		schedule = append(schedule, entry)
	}

	calendarLog.LogInfo(fmt.Sprintf("Successfully returned %d schedule entries for %s %d", len(schedule), role, userID))
	return &pb.GetWeekScheduleResponse{
		Success:   true,
		Message:   "Week schedule retrieved successfully",
		Schedule:  schedule,
		WeekStart: weekStart.Format("2006-01-02"),
		WeekEnd:   weekEnd.Format("2006-01-02"),
	}, nil
}


func getUserIDFromContext(ctx context.Context) (int64, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return 0, fmt.Errorf("no metadata in context")
	}
	
	userIDs := md.Get("user_id")
	if len(userIDs) == 0 {
		return 0, fmt.Errorf("no user_id in metadata")
	}
	
	var userID int64
	_, err := fmt.Sscanf(userIDs[0], "%d", &userID)
	if err != nil {
		return 0, fmt.Errorf("invalid user_id format: %w", err)
	}
	
	return userID, nil
}


func (s *CalendarServer) GetActiveRegistrationPeriods(ctx context.Context, req *pb.GetActiveRegistrationPeriodsRequest) (*pb.GetActiveRegistrationPeriodsResponse, error) {
	calendarLog.LogInfo("GetActiveRegistrationPeriods request received")

	query := `
		SELECT 
			calendar_id,
			title,
			COALESCE(description, '') as description,
			start_date,
			end_date,
			COALESCE(applies_to, 'all') as applies_to,
			(CURRENT_DATE BETWEEN start_date AND end_date) as is_active,
			CASE 
				WHEN CURRENT_DATE <= end_date THEN (end_date - CURRENT_DATE)
				ELSE 0
			END as days_remaining
		FROM academic_calendar
		WHERE event_type = 'registration'
		ORDER BY start_date DESC
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		calendarLog.LogError("Failed to query registration periods", err)
		return nil, status.Error(codes.Internal, "failed to fetch registration periods")
	}
	defer rows.Close()

	var periods []*pb.RegistrationPeriod
	for rows.Next() {
		period := &pb.RegistrationPeriod{}
		var startDate, endDate time.Time
		
		err := rows.Scan(
			&period.CalendarId,
			&period.Title,
			&period.Description,
			&startDate,
			&endDate,
			&period.AppliesTo,
			&period.IsActive,
			&period.DaysRemaining,
		)
		
		if err != nil {
			calendarLog.LogError("Failed to scan registration period", err)
			continue
		}
		
		period.StartDate = startDate.Format("2006-01-02")
		period.EndDate = endDate.Format("2006-01-02")
		periods = append(periods, period)
	}

	calendarLog.LogInfo(fmt.Sprintf("Successfully returned %d registration periods", len(periods)))
	return &pb.GetActiveRegistrationPeriodsResponse{
		Success: true,
		Message: fmt.Sprintf("Found %d registration periods", len(periods)),
		Periods: periods,
	}, nil
}


func (s *CalendarServer) GetUpcomingExams(ctx context.Context, req *pb.GetUpcomingExamsRequest) (*pb.GetUpcomingExamsResponse, error) {
	calendarLog.LogInfo("GetUpcomingExams request received")

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		calendarLog.LogError("Failed to get user_id from context", err)
		return &pb.GetUpcomingExamsResponse{
			Success: false,
			Message: "Unauthorized",
		}, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	var albumNr int32
	err = s.db.QueryRowContext(ctx, "SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
	if err != nil {
		if err == sql.ErrNoRows {
			return &pb.GetUpcomingExamsResponse{
				Success: false,
				Message: "User is not a student",
			}, status.Error(codes.PermissionDenied, "user is not a student")
		}
		calendarLog.LogError("Failed to get album_nr", err)
		return nil, status.Error(codes.Internal, "database error")
	}

	daysAhead := int32(30)
	if req.DaysAhead != nil && *req.DaysAhead > 0 {
		daysAhead = *req.DaysAhead
	}

	now := time.Now()
	endDate := now.AddDate(0, 0, int(daysAhead))

	query := `
		SELECT 
			e.id as exam_id,
			e.class_id,
			s.name as subject_name,
			e.exam_date,
			COALESCE(e.location, 'Nie podano') as location,
			COALESCE(e.duration_minutes, 90) as duration_minutes,
			COALESCE(e.description, '') as description,
			COALESCE(e.exam_type, 'final') as exam_type,
			COALESCE(e.max_students, 0) as max_students,
			c.class_type
		FROM exams e
		JOIN classes c ON e.class_id = c.class_id
		JOIN subjects s ON c.subject_id = s.subject_id
		JOIN student_classes sc ON c.class_id = sc.class_id
		WHERE sc.album_nr = $1
		  AND e.exam_date >= $2
		  AND e.exam_date <= $3
		ORDER BY e.exam_date
	`

	rows, err := s.db.QueryContext(ctx, query, albumNr, now, endDate)
	if err != nil {
		calendarLog.LogError("Failed to query upcoming exams", err)
		return nil, status.Error(codes.Internal, "failed to fetch exams")
	}
	defer rows.Close()

	var exams []*pb.Exam
	for rows.Next() {
		exam := &pb.Exam{}
		var examDate time.Time
		
		err := rows.Scan(
			&exam.ExamId,
			&exam.ClassId,
			&exam.SubjectName,
			&examDate,
			&exam.Location,
			&exam.DurationMinutes,
			&exam.Description,
			&exam.ExamType,
			&exam.MaxStudents,
			&exam.ClassType,
		)
		
		if err != nil {
			calendarLog.LogError("Failed to scan exam", err)
			continue
		}
		
		exam.ExamDate = examDate.Format("2006-01-02 15:04:05")
		exams = append(exams, exam)
	}

	message := fmt.Sprintf("Found %d upcoming exams in the next %d days", len(exams), daysAhead)
	if len(exams) == 0 {
		message = fmt.Sprintf("No upcoming exams in the next %d days", daysAhead)
	}

	calendarLog.LogInfo(fmt.Sprintf("Successfully returned %d upcoming exams for student %d", len(exams), albumNr))
	return &pb.GetUpcomingExamsResponse{
		Success:    true,
		Message:    message,
		Exams:      exams,
		TotalCount: int32(len(exams)),
	}, nil
}

func (s *CalendarServer) GetExams(ctx context.Context, req *pb.GetExamsRequest) (*pb.GetExamsResponse, error) {
	calendarLog.LogInfo("GetExams request received")

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	role, albumNr, teachingStaffID, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to resolve user role")
	}

	query := `
		SELECT 
			e.id,
			e.class_id,
			s.name as subject_name,
			e.exam_date,
			e.location,
			e.duration_minutes,
			e.description,
			e.exam_type,
			e.max_students,
			c.class_type,
			c.group_nr
		FROM exams e
		JOIN classes c ON e.class_id = c.class_id
		JOIN subjects s ON c.subject_id = s.subject_id
		WHERE 1=1
	`

	args := []interface{}{}
	argPos := 1

	if role == "student" {
		query += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM student_classes sc WHERE sc.class_id = e.class_id AND sc.album_nr = $%d)", argPos)
		args = append(args, albumNr)
		argPos++
	} else if role == "teacher" {
		query += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM course_instructors ci WHERE ci.class_id = e.class_id AND ci.teaching_staff_id = $%d)", argPos)
		args = append(args, teachingStaffID)
		argPos++
	}

	if req.ExamId != nil {
		query += fmt.Sprintf(" AND e.id = $%d", argPos)
		args = append(args, *req.ExamId)
		argPos++
	}

	if req.ClassId != nil {
		query += fmt.Sprintf(" AND e.class_id = $%d", argPos)
		args = append(args, *req.ClassId)
		argPos++
	}

	if req.ExamType != nil {
		query += fmt.Sprintf(" AND e.exam_type = $%d", argPos)
		args = append(args, *req.ExamType)
		argPos++
	}

	if req.DateFrom != nil {
		query += fmt.Sprintf(" AND e.exam_date >= $%d", argPos)
		args = append(args, *req.DateFrom)
		argPos++
	}

	if req.DateTo != nil {
		query += fmt.Sprintf(" AND e.exam_date <= $%d", argPos)
		args = append(args, *req.DateTo)
		argPos++
	}

	query += " ORDER BY e.exam_date ASC"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		calendarLog.LogError("Failed to query exams", err)
		return nil, status.Error(codes.Internal, "failed to fetch exams")
	}
	defer rows.Close()

	var exams []*pb.Exam
	for rows.Next() {
		var exam pb.Exam
		var examDate time.Time
		var location, description sql.NullString
		var maxStudents sql.NullInt32

		err := rows.Scan(
			&exam.ExamId,
			&exam.ClassId,
			&exam.SubjectName,
			&examDate,
			&location,
			&exam.DurationMinutes,
			&description,
			&exam.ExamType,
			&maxStudents,
			&exam.ClassType,
			&exam.GroupNr,
		)
		if err != nil {
			calendarLog.LogError("Failed to scan exam row", err)
			continue
		}

		exam.ExamDate = examDate.Format("2006-01-02 15:04:05")
		if location.Valid {
			exam.Location = location.String
		}
		if description.Valid {
			exam.Description = description.String
		}
		if maxStudents.Valid {
			exam.MaxStudents = maxStudents.Int32
		}

		exams = append(exams, &exam)
	}

	calendarLog.LogInfo(fmt.Sprintf("Returning %d exams for %s user %d", len(exams), role, userID))
	return &pb.GetExamsResponse{
		Exams:   exams,
		Message: "Exams retrieved successfully",
	}, nil
}

func (s *CalendarServer) GetMyExams(ctx context.Context, req *pb.GetMyExamsRequest) (*pb.GetMyExamsResponse, error) {
	calendarLog.LogInfo("GetMyExams request received")

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	var albumNr int
	err = s.db.QueryRowContext(ctx, "SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
	if err != nil {
		return nil, status.Error(codes.PermissionDenied, "user is not a student")
	}

	query := `
		SELECT 
			e.id,
			e.class_id,
			s.name as subject_name,
			e.exam_date,
			e.location,
			e.duration_minutes,
			e.description,
			e.exam_type,
			e.max_students,
			c.class_type,
			c.group_nr
		FROM exams e
		JOIN classes c ON e.class_id = c.class_id
		JOIN subjects s ON c.subject_id = s.subject_id
		JOIN student_classes sc ON sc.class_id = e.class_id
		WHERE sc.album_nr = $1
		ORDER BY e.exam_date ASC
	`

	rows, err := s.db.QueryContext(ctx, query, albumNr)
	if err != nil {
		calendarLog.LogError("Failed to query student exams", err)
		return nil, status.Error(codes.Internal, "failed to fetch exams")
	}
	defer rows.Close()

	var exams []*pb.Exam
	for rows.Next() {
		var exam pb.Exam
		var examDate time.Time
		var location, description sql.NullString
		var maxStudents sql.NullInt32

		err := rows.Scan(
			&exam.ExamId,
			&exam.ClassId,
			&exam.SubjectName,
			&examDate,
			&location,
			&exam.DurationMinutes,
			&description,
			&exam.ExamType,
			&maxStudents,
			&exam.ClassType,
			&exam.GroupNr,
		)
		if err != nil {
			calendarLog.LogError("Failed to scan exam row", err)
			continue
		}

		exam.ExamDate = examDate.Format("2006-01-02 15:04:05")
		if location.Valid {
			exam.Location = location.String
		}
		if description.Valid {
			exam.Description = description.String
		}
		if maxStudents.Valid {
			exam.MaxStudents = maxStudents.Int32
		}

		exams = append(exams, &exam)
	}

	calendarLog.LogInfo(fmt.Sprintf("Returning %d exams for student %d", len(exams), albumNr))
	return &pb.GetMyExamsResponse{
		Exams:   exams,
		Message: "Exams retrieved successfully",
	}, nil
}

func (s *CalendarServer) CreateExam(ctx context.Context, req *pb.CreateExamRequest) (*pb.CreateExamResponse, error) {
	calendarLog.LogInfo("CreateExam request received")

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	role, _, teachingStaffID, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to resolve user role")
	}

	if role == "student" {
		return nil, status.Error(codes.PermissionDenied, "students cannot create exams")
	}

	// Walidacja exam_type
	validTypes := map[string]bool{
		"final": true, "retake": true, "commission": true,
		"midterm": true, "quiz": true, "project": true, "test": true,
	}
	if !validTypes[req.ExamType] {
		return nil, status.Error(codes.InvalidArgument, "invalid exam_type")
	}

	if role == "teacher" {
		var teaches bool
		err = s.db.QueryRowContext(ctx,
			"SELECT EXISTS(SELECT 1 FROM course_instructors WHERE class_id = $1 AND teaching_staff_id = $2)",
			req.ClassId, teachingStaffID).Scan(&teaches)
		if err != nil || !teaches {
			return nil, status.Error(codes.PermissionDenied, "teacher does not teach this class")
		}
	}

	examDate, err := time.Parse("2006-01-02 15:04:05", req.ExamDate)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid exam_date format (use YYYY-MM-DD HH:MM:SS)")
	}


	var examID int32
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO exams (class_id, exam_date, location, duration_minutes, description, exam_type, max_students)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, req.ClassId, examDate, req.Location, req.DurationMinutes, req.Description, req.ExamType, req.MaxStudents).Scan(&examID)

	if err != nil {
		calendarLog.LogError("Failed to create exam", err)
		return nil, status.Error(codes.Internal, "failed to create exam")
	}

	var exam pb.Exam
	err = s.db.QueryRowContext(ctx, `
		SELECT 
			e.id, e.class_id, s.name, e.exam_date, e.location, e.duration_minutes,
			e.description, e.exam_type, e.max_students, c.class_type, c.group_nr
		FROM exams e
		JOIN classes c ON e.class_id = c.class_id
		JOIN subjects s ON c.subject_id = s.subject_id
		WHERE e.id = $1
	`, examID).Scan(
		&exam.ExamId, &exam.ClassId, &exam.SubjectName, &examDate,
		&exam.Location, &exam.DurationMinutes, &exam.Description,
		&exam.ExamType, &exam.MaxStudents, &exam.ClassType, &exam.GroupNr,
	)

	exam.ExamDate = examDate.Format("2006-01-02 15:04:05")

	calendarLog.LogInfo(fmt.Sprintf("Created exam %d by %s user %d", examID, role, userID))
	return &pb.CreateExamResponse{
		Exam:    &exam,
		Message: "Exam created successfully",
	}, nil
}

func (s *CalendarServer) UpdateExam(ctx context.Context, req *pb.UpdateExamRequest) (*pb.UpdateExamResponse, error) {
	calendarLog.LogInfo(fmt.Sprintf("UpdateExam request received for exam_id: %d", req.ExamId))

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	role, _, teachingStaffID, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to resolve user role")
	}

	if role == "student" {
		return nil, status.Error(codes.PermissionDenied, "students cannot update exams")
	}

	var classID int32
	err = s.db.QueryRowContext(ctx, "SELECT class_id FROM exams WHERE id = $1", req.ExamId).Scan(&classID)
	if err == sql.ErrNoRows {
		return nil, status.Error(codes.NotFound, "exam not found")
	}
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to fetch exam")
	}

	if role == "teacher" {
		var teaches bool
		err = s.db.QueryRowContext(ctx,
			"SELECT EXISTS(SELECT 1 FROM course_instructors WHERE class_id = $1 AND teaching_staff_id = $2)",
			classID, teachingStaffID).Scan(&teaches)
		if err != nil || !teaches {
			return nil, status.Error(codes.PermissionDenied, "teacher does not teach this class")
		}
	}

	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.ExamDate != nil {
		examDate, err := time.Parse("2006-01-02 15:04:05", *req.ExamDate)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid exam_date format")
		}
		updates = append(updates, fmt.Sprintf("exam_date = $%d", argPos))
		args = append(args, examDate)
		argPos++
	}

	if req.Location != nil {
		updates = append(updates, fmt.Sprintf("location = $%d", argPos))
		args = append(args, *req.Location)
		argPos++
	}

	if req.DurationMinutes != nil {
		updates = append(updates, fmt.Sprintf("duration_minutes = $%d", argPos))
		args = append(args, *req.DurationMinutes)
		argPos++
	}

	if req.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argPos))
		args = append(args, *req.Description)
		argPos++
	}

	if req.ExamType != nil {
		updates = append(updates, fmt.Sprintf("exam_type = $%d", argPos))
		args = append(args, *req.ExamType)
		argPos++
	}

	if req.MaxStudents != nil {
		updates = append(updates, fmt.Sprintf("max_students = $%d", argPos))
		args = append(args, *req.MaxStudents)
		argPos++
	}

	
	if len(updates) == 0 {
		return nil, status.Error(codes.InvalidArgument, "no fields to update")
	}

	updates = append(updates, fmt.Sprintf("updated_at = NOW()"))
	args = append(args, req.ExamId)
	updateQuery := fmt.Sprintf("UPDATE exams SET %s WHERE id = $%d", strings.Join(updates, ", "), argPos)

	_, err = s.db.ExecContext(ctx, updateQuery, args...)
	if err != nil {
		calendarLog.LogError("Failed to update exam", err)
		return nil, status.Error(codes.Internal, "failed to update exam")
	}

	var exam pb.Exam
	var examDate time.Time
	err = s.db.QueryRowContext(ctx, `
		SELECT 
			e.id, e.class_id, s.name, e.exam_date, e.location, e.duration_minutes,
			e.description, e.exam_type, e.max_students, c.class_type, c.group_nr
		FROM exams e
		JOIN classes c ON e.class_id = c.class_id
		JOIN subjects s ON c.subject_id = s.subject_id
		WHERE e.id = $1
	`, req.ExamId).Scan(
		&exam.ExamId, &exam.ClassId, &exam.SubjectName, &examDate,
		&exam.Location, &exam.DurationMinutes, &exam.Description,
		&exam.ExamType, &exam.MaxStudents, &exam.ClassType, &exam.GroupNr,
	)

	exam.ExamDate = examDate.Format("2006-01-02 15:04:05")

	calendarLog.LogInfo(fmt.Sprintf("Updated exam %d by %s user %d", req.ExamId, role, userID))
	return &pb.UpdateExamResponse{
		Exam:    &exam,
		Message: "Exam updated successfully",
	}, nil
}

func (s *CalendarServer) DeleteExam(ctx context.Context, req *pb.DeleteExamRequest) (*pb.DeleteExamResponse, error) {
	calendarLog.LogInfo(fmt.Sprintf("DeleteExam request received for exam_id: %d", req.ExamId))

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	role, _, teachingStaffID, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to resolve user role")
	}

	if role == "student" {
		return nil, status.Error(codes.PermissionDenied, "students cannot delete exams")
	}

	var classID int32
	err = s.db.QueryRowContext(ctx, "SELECT class_id FROM exams WHERE id = $1", req.ExamId).Scan(&classID)
	if err == sql.ErrNoRows {
		return nil, status.Error(codes.NotFound, "exam not found")
	}
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to fetch exam")
	}

	if role == "teacher" {
		var teaches bool
		err = s.db.QueryRowContext(ctx,
			"SELECT EXISTS(SELECT 1 FROM course_instructors WHERE class_id = $1 AND teaching_staff_id = $2)",
			classID, teachingStaffID).Scan(&teaches)
		if err != nil || !teaches {
			return nil, status.Error(codes.PermissionDenied, "teacher does not teach this class")
		}
	}

	result, err := s.db.ExecContext(ctx, "DELETE FROM exams WHERE id = $1", req.ExamId)
	if err != nil {
		calendarLog.LogError("Failed to delete exam", err)
		return nil, status.Error(codes.Internal, "failed to delete exam")
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return nil, status.Error(codes.NotFound, "exam not found")
	}

	calendarLog.LogInfo(fmt.Sprintf("Deleted exam %d by %s user %d", req.ExamId, role, userID))
	return &pb.DeleteExamResponse{
		Success: true,
		Message: "Exam deleted successfully",
	}, nil
}

func (s *CalendarServer) getUserRoleAndIdentifiers(ctx context.Context, userID int64) (role string, albumNr int64, teachingStaffID int64, err error) {
	query := `
		SELECT
			CASE
				WHEN s.user_id IS NOT NULL THEN 'student'
				WHEN ts.user_id IS NOT NULL THEN 'teacher'
				WHEN a.user_id IS NOT NULL THEN 'admin'
				ELSE 'unknown'
			END as role,
			COALESCE(s.album_nr, 0) as album_nr,
			COALESCE(ts.teaching_staff_id, 0) as teaching_staff_id
		FROM users u
		LEFT JOIN students s ON u.user_id = s.user_id
		LEFT JOIN teaching_staff ts ON u.user_id = ts.user_id
		LEFT JOIN administrative_staff a ON u.user_id = a.user_id
		WHERE u.user_id = $1`

	err = s.db.QueryRowContext(ctx, query, userID).Scan(&role, &albumNr, &teachingStaffID)
	return
}
