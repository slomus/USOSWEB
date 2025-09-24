package calendar

import (
	"context"
	"database/sql"
	"fmt"
	"time"

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
		conditions = append(conditions, fmt.Sprintf("start_date >= $%d", argCount))
		args = append(args, *req.StartDate)
		argCount++
	}

	if req.EndDate != nil && *req.EndDate != "" {
		conditions = append(conditions, fmt.Sprintf("(end_date <= $%d OR end_date IS NULL)", argCount))
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
			start_date,
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
			start_date,
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
	err := s.db.QueryRow(
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

	var semesterStart, semesterEnd, examStart, examEnd time.Time

	query := `
		SELECT start_date
		FROM academic_calendar
		WHERE event_type = 'semester_start'
		  AND applies_to = $1
		  AND academic_year = $2
		LIMIT 1
	`

	err := s.db.QueryRow(query, currentSemester, academicYear).Scan(&semesterStart)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	weekNumber := int32(0)
	if !semesterStart.IsZero() {
		weeksSinceStart := int32(now.Sub(semesterStart).Hours() / 24 / 7)
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
		  AND start_date > CURRENT_DATE
		  AND start_date <= CURRENT_DATE + INTERVAL '30 days'
		ORDER BY start_date
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
		SemesterStart:    semesterStart.Format("2006-01-02"),
		SemesterEnd:      semesterEnd.Format("2006-01-02"),
		ExamSessionStart: examStart.Format("2006-01-02"),
		ExamSessionEnd:   examEnd.Format("2006-01-02"),
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
