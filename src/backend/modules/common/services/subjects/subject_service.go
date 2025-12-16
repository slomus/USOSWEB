package subjects

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/academic"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

var subjectsLog = logger.NewLogger("SubjectsService")

type SubjectsServer struct {
	pb.UnimplementedSubjectsServiceServer
	db *sql.DB
}

func NewSubjectsServer(db *sql.DB) *SubjectsServer {
	return &SubjectsServer{
		db: db,
	}
}

// GetSubjects - pobiera listę dostępnych przedmiotów z podstawowymi informacjami
func (s *SubjectsServer) GetSubjects(ctx context.Context, req *pb.GetSubjectsRequest) (*pb.GetSubjectsResponse, error) {
	subjectsLog.LogInfo("GetSubjects request received")

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		subjectsLog.LogWarn("Could not get user_id from context, is_enrolled will be false")
		userID = 0 
	}

	var albumNr int
	if userID > 0 {
		err := s.db.QueryRow("SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
		if err != nil && err != sql.ErrNoRows {
			subjectsLog.LogError("Failed to get album_nr", err)
		}
	}

	query := `
		WITH subject_stats AS (
			SELECT 
				s.subject_id,
				s.alias,
				s.name,
				s.ects,
				SUM(c.capacity) as total_capacity,
				SUM(c.current_capacity) as total_enrolled
			FROM subjects s
			LEFT JOIN classes c ON s.subject_id = c.subject_id
			GROUP BY s.subject_id, s.alias, s.name, s.ects
		),
		enrollment_check AS (
			SELECT DISTINCT
				cl.subject_id,
				TRUE as is_enrolled
			FROM student_classes sc
			JOIN classes cl ON sc.class_id = cl.class_id
			WHERE sc.album_nr = $1
		),
		registration_periods AS (
    SELECT 
        ac.applies_to as subject_alias,
        ac.start_date::text as start_date,
        ac.end_date::text as end_date,
        (CURRENT_DATE BETWEEN ac.start_date AND ac.end_date) as is_active
    FROM academic_calendar ac
    WHERE ac.event_type = 'registration'
      AND CURRENT_DATE <= ac.end_date + INTERVAL '30 days'
    ORDER BY 
      CASE WHEN ac.applies_to = 'all' THEN 1 ELSE 0 END,  
      ac.start_date DESC
		)	
		SELECT 
			ss.subject_id,
			ss.alias,
			ss.name,
			ss.ects,
			COALESCE(ss.total_capacity, 0) as total_capacity,
			COALESCE(ss.total_enrolled, 0) as total_enrolled,
			COALESCE(ss.total_capacity - ss.total_enrolled, 0) as available_spots,
			COALESCE(ec.is_enrolled, FALSE) as is_enrolled,
			rp.start_date,
			rp.end_date,
			COALESCE(rp.is_active, FALSE) as reg_is_active
		FROM subject_stats ss
		LEFT JOIN enrollment_check ec ON ss.subject_id = ec.subject_id
		LEFT JOIN registration_periods rp ON (ss.alias = rp.subject_alias OR rp.subject_alias = 'all')
		WHERE ($2::int IS NULL OR EXISTS (
			SELECT 1 FROM course_subjects cs 
			WHERE cs.subject_id = ss.subject_id 
			AND cs.course_id = $2
		))
		ORDER BY ss.name
	`
	var courseID *int32
	if req.CourseId != nil {
		courseID = req.CourseId
	}

	rows, err := s.db.Query(query, albumNr, courseID)	

	var subjects []*pb.SubjectSummary
	for rows.Next() {
		var subject pb.SubjectSummary
		var startDate, endDate sql.NullString
		var regIsActive bool

		err := rows.Scan(
			&subject.SubjectId,
			&subject.Alias,
			&subject.Name,
			&subject.Ects,
			&subject.TotalCapacity,
			&subject.TotalEnrolled,
			&subject.AvailableSpots,
			&subject.IsEnrolled,
			&startDate,
			&endDate,
			&regIsActive,
		)
		if err != nil {
			subjectsLog.LogError("Failed to scan subject row", err)
			continue
		}

		if startDate.Valid && endDate.Valid {
			subject.RegistrationPeriod = &pb.RegistrationPeriod{
				StartDate: startDate.String,
				EndDate:   endDate.String,
				IsActive:  regIsActive,
			}
		}

		subjects = append(subjects, &subject)
	}

	if err = rows.Err(); err != nil {
		subjectsLog.LogError("Error occurred during rows iteration", err)
		return nil, status.Error(codes.Internal, "database error")
	}

	subjectsLog.LogInfo(fmt.Sprintf("Returning %d subjects to client", len(subjects)))
	for i, s := range subjects {
			if i < 3 {
					subjectsLog.LogDebug(fmt.Sprintf("Subject %d: ID=%d Name=%s", i, s.SubjectId, s.Name))
			}
	}

	subjectsLog.LogInfo(fmt.Sprintf("Successfully returned %d subjects", len(subjects)))
	return &pb.GetSubjectsResponse{
		Subjects: subjects,
		Message:  "Subjects retrieved successfully",
	}, nil
}

// GetSubjectDetails - pobiera szczegółowe informacje o przedmiocie wraz z grupami zajęciowymi
func (s *SubjectsServer) GetSubjectDetails(ctx context.Context, req *pb.GetSubjectDetailsRequest) (*pb.GetSubjectDetailsResponse, error) {
	subjectsLog.LogInfo(fmt.Sprintf("GetSubjectDetails request received for subject_id: %d", req.SubjectId))

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		subjectsLog.LogWarn("Could not get user_id from context")
		userID = 0
	}

	var albumNr int
	if userID > 0 {
		err := s.db.QueryRow("SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
		if err != nil && err != sql.ErrNoRows {
			subjectsLog.LogError("Failed to get album_nr", err)
		}
	}

	var subject pb.SubjectDetails
	var isEnrolled bool
	var startDate, endDate sql.NullString
	var regIsActive bool

	err = s.db.QueryRow(`
		WITH registration_periods AS (
			SELECT 
				ac.applies_to as subject_alias,
				ac.start_date::text as start_date,
				ac.end_date::text as end_date,
				(CURRENT_DATE BETWEEN ac.start_date AND ac.end_date) as is_active
			FROM academic_calendar ac
			WHERE ac.event_type = 'registration'
			  AND CURRENT_DATE <= ac.end_date + INTERVAL '30 days'
			ORDER BY 
			  CASE WHEN ac.applies_to != 'all' THEN 0 ELSE 1 END,
			  ac.start_date DESC
		)
		SELECT 
			s.subject_id,
			s.alias,
			s.name,
			s.ects,
			s.description,
			s.syllabus,
			COALESCE(
				(SELECT TRUE FROM student_classes sc 
				 JOIN classes c ON sc.class_id = c.class_id 
				 WHERE c.subject_id = s.subject_id AND sc.album_nr = $2 
				 LIMIT 1),
				FALSE
			) as is_enrolled,
			rp.start_date,
			rp.end_date,
			COALESCE(rp.is_active, FALSE) as reg_is_active
		FROM subjects s
		LEFT JOIN registration_periods rp ON (s.alias = rp.subject_alias OR rp.subject_alias = 'all')
		WHERE s.subject_id = $1
		LIMIT 1
	`, req.SubjectId, albumNr).Scan(
		&subject.SubjectId,
		&subject.Alias,
		&subject.Name,
		&subject.Ects,
		&subject.Description,
		&subject.Syllabus,
		&isEnrolled,
		&startDate,
		&endDate,
		&regIsActive,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			subjectsLog.LogWarn(fmt.Sprintf("Subject not found: %d", req.SubjectId))
			return nil, status.Error(codes.NotFound, "subject not found")
		}
		subjectsLog.LogError("Failed to fetch subject details", err)
		return nil, status.Error(codes.Internal, "failed to fetch subject details")
	}

	subject.IsEnrolled = isEnrolled

	if startDate.Valid && endDate.Valid {
		subject.RegistrationPeriod = &pb.RegistrationPeriod{
			StartDate: startDate.String,
			EndDate:   endDate.String,
			IsActive:  regIsActive,
		}
	}

	classesQuery := `
		SELECT 
			c.class_id,
			c.class_type,
			c.group_nr,
			c.current_capacity,
			c.capacity,
			(c.capacity - c.current_capacity) as available_spots,
			c.classroom,
			b.name as building_name
		FROM classes c
		JOIN buildings b ON c.building_id = b.building_id
		WHERE c.subject_id = $1
		ORDER BY c.class_type, c.group_nr
	`

	rows, err := s.db.Query(classesQuery, req.SubjectId)
	if err != nil {
		subjectsLog.LogError("Failed to fetch classes", err)
		return nil, status.Error(codes.Internal, "failed to fetch classes")
	}
	defer rows.Close()

	var classes []*pb.ClassInfo
	for rows.Next() {
		var class pb.ClassInfo
		var classroom int
		var buildingName string

		err := rows.Scan(
			&class.ClassId,
			&class.ClassType,
			&class.GroupNr,
			&class.CurrentCapacity,
			&class.Capacity,
			&class.AvailableSpots,
			&classroom,
			&buildingName,
		)
		if err != nil {
			subjectsLog.LogError("Failed to scan class row", err)
			continue
		}

		instructorsQuery := `
			SELECT 
				CONCAT(u.name, ' ', u.surname) as instructor_name
			FROM course_instructors ci
			JOIN teaching_staff ts ON ci.teaching_staff_id = ts.teaching_staff_id
			JOIN users u ON ts.user_id = u.user_id
			WHERE ci.class_id = $1
		`
		instructorRows, err := s.db.Query(instructorsQuery, class.ClassId)
		if err == nil {
			defer instructorRows.Close()
			var instructors []string
			for instructorRows.Next() {
				var instructorName string
				if err := instructorRows.Scan(&instructorName); err == nil {
					instructors = append(instructors, instructorName)
				}
			}
			class.Instructors = instructors
		}

		class.Schedule = []*pb.TimeSlot{
			{
				DayOfWeek:    "Poniedziałek",
				StartTime:    "08:00",
				EndTime:      "09:30",
				Classroom:    int32(classroom),
				BuildingName: buildingName,
			},
		}

		classes = append(classes, &class)
	}

	subject.Classes = classes

	subjectsLog.LogInfo(fmt.Sprintf("Successfully returned subject details for subject_id: %d", req.SubjectId))
	return &pb.GetSubjectDetailsResponse{
		Subject: &subject,
		Message: "Subject details retrieved successfully",
	}, nil
}


func (s *SubjectsServer) GetAvailableSubjects(ctx context.Context, req *pb.GetAvailableSubjectsRequest) (*pb.GetAvailableSubjectsResponse, error) {
	subjectsLog.LogInfo("GetAvailableSubjects request received")
	
	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "user not authenticated")
	}
	
	var albumNr int
	var courseID int32
	var moduleID sql.NullInt32
	
	err = s.db.QueryRow(`
		SELECT album_nr, course_id, module_id 
		FROM students 
		WHERE user_id = $1
	`, userID).Scan(&albumNr, &courseID, &moduleID)
	
	if err != nil {
		subjectsLog.LogError("Failed to get student info", err)
		return nil, status.Error(codes.Internal, "failed to get student info")
	}
	
	query := `
		WITH available_subjects AS (
			SELECT DISTINCT s.subject_id
			FROM subjects s
			WHERE EXISTS (
				SELECT 1 FROM course_subjects cs 
				WHERE cs.subject_id = s.subject_id 
				AND cs.course_id = $2
			)
			OR ($3::int IS NOT NULL AND EXISTS (
				SELECT 1 FROM module_subjects ms
				WHERE ms.subject_id = s.subject_id
				AND ms.module_id = $3
			))
		),
		subject_stats AS (
			SELECT 
				s.subject_id,
				s.alias,
				s.name,
				s.ects,
				SUM(c.capacity) as total_capacity,
				SUM(c.current_capacity) as total_enrolled
			FROM subjects s
			JOIN available_subjects avs ON s.subject_id = avs.subject_id
			LEFT JOIN classes c ON s.subject_id = c.subject_id
			GROUP BY s.subject_id, s.alias, s.name, s.ects
		),
		enrollment_check AS (
			SELECT DISTINCT
				cl.subject_id,
				TRUE as is_enrolled
			FROM student_classes sc
			JOIN classes cl ON sc.class_id = cl.class_id
			WHERE sc.album_nr = $1
		),
		registration_periods AS (
			SELECT 
				ac.applies_to as subject_alias,
				ac.start_date::text as start_date,
				ac.end_date::text as end_date,
				(CURRENT_DATE BETWEEN ac.start_date AND ac.end_date) as is_active
			FROM academic_calendar ac
			WHERE ac.event_type = 'registration'
			  AND CURRENT_DATE <= ac.end_date + INTERVAL '30 days'
		)
		SELECT 
			ss.subject_id,
			ss.alias,
			ss.name,
			ss.ects,
			COALESCE(ss.total_capacity, 0),
			COALESCE(ss.total_enrolled, 0),
			COALESCE(ss.total_capacity - ss.total_enrolled, 0),
			COALESCE(ec.is_enrolled, FALSE),
			rp.start_date,
			rp.end_date,
			COALESCE(rp.is_active, FALSE)
		FROM subject_stats ss
		LEFT JOIN enrollment_check ec ON ss.subject_id = ec.subject_id
		LEFT JOIN registration_periods rp ON (ss.alias = rp.subject_alias OR rp.subject_alias = 'all')
		ORDER BY ss.name
	`
	
	rows, err := s.db.Query(query, albumNr, courseID, moduleID)

	var subjects []*pb.SubjectSummary
		for rows.Next() {
			var subject pb.SubjectSummary
			var startDate, endDate sql.NullString
			var regIsActive bool

			err := rows.Scan(
				&subject.SubjectId,
				&subject.Alias,
				&subject.Name,
				&subject.Ects,
				&subject.TotalCapacity,
				&subject.TotalEnrolled,
				&subject.AvailableSpots,
				&subject.IsEnrolled,
				&startDate,
				&endDate,
				&regIsActive,
			)
			if err != nil {
				subjectsLog.LogError("Failed to scan subject row", err)
				continue
			}

			if startDate.Valid && endDate.Valid {
				subject.RegistrationPeriod = &pb.RegistrationPeriod{
					StartDate: startDate.String,
					EndDate:   endDate.String,
					IsActive:  regIsActive,
				}
			}

			subjects = append(subjects, &subject)
		}

		if err = rows.Err(); err != nil {
			subjectsLog.LogError("Error occurred during rows iteration", err)
			return nil, status.Error(codes.Internal, "database error")
		}

	return &pb.GetAvailableSubjectsResponse{
		Subjects: subjects,
		Message: fmt.Sprintf("Found %d available subjects", len(subjects)),
		CourseId: courseID,
		ModuleId: func() int32 { if moduleID.Valid { return moduleID.Int32 }; return 0 }(),
	}, nil
}

// Pomocnicza funkcja do pobierania user_id z kontekstu
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
		return 0, err
	}

	return userID, nil
}


func (s *SubjectsServer) CreateSubject(ctx context.Context, req *pb.CreateSubjectRequest) (*pb.CreateSubjectResponse, error) {
	subjectsLog.LogInfo("CreateSubject request received")

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return &pb.CreateSubjectResponse{
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
		subjectsLog.LogWarn(fmt.Sprintf("Non-admin user %d tried to create subject", userID))
		return &pb.CreateSubjectResponse{
			Success: false,
			Message: "Only administrators can create subjects",
		}, status.Error(codes.PermissionDenied, "insufficient permissions")
	}

	if req.Alias == "" || req.Name == "" {
		return &pb.CreateSubjectResponse{
			Success: false,
			Message: "Alias and name are required",
		}, status.Error(codes.InvalidArgument, "missing required fields")
	}

	if req.Ects <= 0 {
		return &pb.CreateSubjectResponse{
			Success: false,
			Message: "ECTS must be greater than 0",
		}, status.Error(codes.InvalidArgument, "invalid ECTS value")
	}

	var subjectID int32
	err = s.db.QueryRow(`
		INSERT INTO subjects (alias, name, ects, description, syllabus)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING subject_id
	`, req.Alias, req.Name, req.Ects, req.Description, req.Syllabus).Scan(&subjectID)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			subjectsLog.LogError("Subject with this alias or name already exists", err)
			return &pb.CreateSubjectResponse{
				Success: false,
				Message: "Subject with this alias or name already exists",
			}, status.Error(codes.AlreadyExists, "duplicate subject")
		}
		subjectsLog.LogError("Failed to create subject", err)
		return &pb.CreateSubjectResponse{
			Success: false,
			Message: "Failed to create subject",
		}, status.Error(codes.Internal, "database error")
	}

	subjectsLog.LogInfo(fmt.Sprintf("Successfully created subject with ID: %d", subjectID))
	return &pb.CreateSubjectResponse{
		Success:   true,
		Message:   "Subject created successfully",
		SubjectId: subjectID,
	}, nil
}

func (s *SubjectsServer) UpdateSubject(ctx context.Context, req *pb.UpdateSubjectRequest) (*pb.UpdateSubjectResponse, error) {
	subjectsLog.LogInfo(fmt.Sprintf("UpdateSubject request received for subject_id: %d", req.SubjectId))

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return &pb.UpdateSubjectResponse{
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
		subjectsLog.LogWarn(fmt.Sprintf("Non-admin user %d tried to update subject", userID))
		return &pb.UpdateSubjectResponse{
			Success: false,
			Message: "Only administrators can update subjects",
		}, status.Error(codes.PermissionDenied, "insufficient permissions")
	}

	var exists bool
	err = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM subjects WHERE subject_id = $1)", req.SubjectId).Scan(&exists)
	if err != nil || !exists {
		subjectsLog.LogWarn(fmt.Sprintf("Subject not found: %d", req.SubjectId))
		return &pb.UpdateSubjectResponse{
			Success: false,
			Message: "Subject not found",
		}, status.Error(codes.NotFound, "subject not found")
	}

	if req.Alias == "" || req.Name == "" {
		return &pb.UpdateSubjectResponse{
			Success: false,
			Message: "Alias and name are required",
		}, status.Error(codes.InvalidArgument, "missing required fields")
	}

	if req.Ects <= 0 {
		return &pb.UpdateSubjectResponse{
			Success: false,
			Message: "ECTS must be greater than 0",
		}, status.Error(codes.InvalidArgument, "invalid ECTS value")
	}

	_, err = s.db.Exec(`
		UPDATE subjects 
		SET alias = $1, name = $2, ects = $3, description = $4, syllabus = $5
		WHERE subject_id = $6
	`, req.Alias, req.Name, req.Ects, req.Description, req.Syllabus, req.SubjectId)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			subjectsLog.LogError("Subject with this alias or name already exists", err)
			return &pb.UpdateSubjectResponse{
				Success: false,
				Message: "Subject with this alias or name already exists",
			}, status.Error(codes.AlreadyExists, "duplicate subject")
		}
		subjectsLog.LogError("Failed to update subject", err)
		return &pb.UpdateSubjectResponse{
			Success: false,
			Message: "Failed to update subject",
		}, status.Error(codes.Internal, "database error")
	}

	subjectsLog.LogInfo(fmt.Sprintf("Successfully updated subject with ID: %d", req.SubjectId))
	return &pb.UpdateSubjectResponse{
		Success: true,
		Message: "Subject updated successfully",
	}, nil
}

func (s *SubjectsServer) DeleteSubject(ctx context.Context, req *pb.DeleteSubjectRequest) (*pb.DeleteSubjectResponse, error) {
	subjectsLog.LogInfo(fmt.Sprintf("DeleteSubject request received for subject_id: %d", req.SubjectId))

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return &pb.DeleteSubjectResponse{
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
		subjectsLog.LogWarn(fmt.Sprintf("Non-admin user %d tried to delete subject", userID))
		return &pb.DeleteSubjectResponse{
			Success: false,
			Message: "Only administrators can delete subjects",
		}, status.Error(codes.PermissionDenied, "insufficient permissions")
	}

	var exists bool
	err = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM subjects WHERE subject_id = $1)", req.SubjectId).Scan(&exists)
	if err != nil || !exists {
		subjectsLog.LogWarn(fmt.Sprintf("Subject not found: %d", req.SubjectId))
		return &pb.DeleteSubjectResponse{
			Success: false,
			Message: "Subject not found",
		}, status.Error(codes.NotFound, "subject not found")
	}

	var hasClasses bool
	err = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM classes WHERE subject_id = $1)", req.SubjectId).Scan(&hasClasses)
	if err != nil {
		subjectsLog.LogError("Failed to check subject usage", err)
		return &pb.DeleteSubjectResponse{
			Success: false,
			Message: "Failed to check subject usage",
		}, status.Error(codes.Internal, "database error")
	}

	if hasClasses {
		return &pb.DeleteSubjectResponse{
			Success: false,
			Message: "Cannot delete subject with existing classes",
		}, status.Error(codes.FailedPrecondition, "subject has classes")
	}

	_, err = s.db.Exec("DELETE FROM subjects WHERE subject_id = $1", req.SubjectId)
	if err != nil {
		subjectsLog.LogError("Failed to delete subject", err)
		return &pb.DeleteSubjectResponse{
			Success: false,
			Message: "Failed to delete subject",
		}, status.Error(codes.Internal, "database error")
	}

	subjectsLog.LogInfo(fmt.Sprintf("Successfully deleted subject with ID: %d", req.SubjectId))
	return &pb.DeleteSubjectResponse{
		Success: true,
		Message: "Subject deleted successfully",
	}, nil
}

func (s *SubjectsServer) GetSubjectInfo(ctx context.Context, req *pb.GetSubjectInfoRequest) (*pb.GetSubjectInfoResponse, error) {
	subjectsLog.LogInfo(fmt.Sprintf("GetSubjectInfo request received for subject_id: %d", req.SubjectId))

	_, err := getUserIDFromContext(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "unauthorized")
	}

	if req.SubjectId <= 0 {
		subjectsLog.LogWarn("Invalid subject_id provided")
		return nil, status.Error(codes.InvalidArgument, "invalid subject_id")
	}

	query := `
		SELECT 
			subject_id,
			alias,
			name,
			ects,
			COALESCE(description, '') as description,
			COALESCE(syllabus, '') as syllabus
		FROM subjects
		WHERE subject_id = $1
	`

	var response pb.GetSubjectInfoResponse
	err = s.db.QueryRow(query, req.SubjectId).Scan(
		&response.SubjectId,
		&response.Alias,
		&response.Name,
		&response.Ects,
		&response.Description,
		&response.Syllabus,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			subjectsLog.LogWarn(fmt.Sprintf("Subject not found: %d", req.SubjectId))
			return nil, status.Error(codes.NotFound, "subject not found")
		}
		subjectsLog.LogError("Failed to fetch subject info", err)
		return nil, status.Error(codes.Internal, "failed to fetch subject info")
	}

	subjectsLog.LogInfo(fmt.Sprintf("Successfully fetched info for subject_id: %d", req.SubjectId))
	return &response, nil
}

func (s *SubjectsServer) GetClassInfo(ctx context.Context, req *pb.GetClassInfoRequest) (*pb.GetClassInfoResponse, error) {
	subjectsLog.LogInfo(fmt.Sprintf("GetClassInfo request received for class_id: %d", req.ClassId))

	_, err := getUserIDFromContext(ctx)
		if err != nil {
			return nil, status.Error(codes.Unauthenticated, "unauthorized")
		}

	if req.ClassId <= 0 {
		subjectsLog.LogWarn("Invalid class_id provided")
		return nil, status.Error(codes.InvalidArgument, "invalid class_id")
	}

	query := `
		SELECT 
			c.class_id,
			c.class_type,
			c.credit,
			c.span_of_hours,
			c.group_nr,
			c.current_capacity,
			c.capacity,
			c.classroom,
			b.name as building_name,
			b.address as building_address,
			s.name as subject_name,
			s.alias as subject_alias
		FROM classes c
		JOIN buildings b ON c.building_id = b.building_id
		JOIN subjects s ON c.subject_id = s.subject_id
		WHERE c.class_id = $1
	`

	var response pb.GetClassInfoResponse
	err = s.db.QueryRow(query, req.ClassId).Scan(
		&response.ClassId,
		&response.ClassType,
		&response.Credit,
		&response.SpanOfHours,
		&response.GroupNr,
		&response.CurrentCapacity,
		&response.Capacity,
		&response.Classroom,
		&response.BuildingName,
		&response.BuildingAddress,
		&response.SubjectName,
		&response.SubjectAlias,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			subjectsLog.LogWarn(fmt.Sprintf("Class not found: %d", req.ClassId))
			return nil, status.Error(codes.NotFound, "class not found")
		}
		subjectsLog.LogError("Failed to fetch class info", err)
		return nil, status.Error(codes.Internal, "failed to fetch class info")
	}

	subjectsLog.LogInfo(fmt.Sprintf("Successfully fetched info for class_id: %d", req.ClassId))
	return &response, nil
}
