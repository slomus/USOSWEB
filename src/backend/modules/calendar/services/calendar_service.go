package calendar

import (
	"context"
	"database/sql"
	"fmt"
	"time"

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

	var albumNr int32
	err = s.db.QueryRowContext(ctx, "SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
	if err != nil {
		if err == sql.ErrNoRows {
			return &pb.GetWeekScheduleResponse{
				Success: false,
				Message: "User is not a student",
			}, status.Error(codes.PermissionDenied, "user is not a student")
		}
		calendarLog.LogError("Failed to get album_nr", err)
		return nil, status.Error(codes.Internal, "database error")
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

	query := `
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
		JOIN student_classes sc ON c.class_id = sc.class_id
		LEFT JOIN course_instructors ci ON c.class_id = ci.class_id
		LEFT JOIN teaching_staff ts ON ci.teaching_staff_id = ts.teaching_staff_id
		LEFT JOIN users u ON ts.user_id = u.user_id
		WHERE sc.album_nr = $1
		  AND sch.valid_from<= $2
		  AND sch.valid_to >= $3
		  AND sch.day_of_week BETWEEN 1 AND 5
		GROUP BY sch.id, sch.class_id, s.name, c.class_type, sch.day_of_week, 
		         sch.start_time, sch.end_time, sch.room, sch.building
		ORDER BY sch.day_of_week, sch.start_time
	`

	rows, err := s.db.QueryContext(ctx, query, albumNr, weekStart, weekEnd)
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

	calendarLog.LogInfo(fmt.Sprintf("Successfully returned %d schedule entries for student %d", len(schedule), albumNr))
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
