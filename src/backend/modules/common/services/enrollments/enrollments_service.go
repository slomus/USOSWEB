package enrollments

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/academic"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

var enrollmentsLog = logger.NewLogger("EnrollmentsService")

type EnrollmentsServer struct {
	pb.UnimplementedEnrollmentsServiceServer
	db *sql.DB
}

func NewEnrollmentsServer(db *sql.DB) *EnrollmentsServer {
	return &EnrollmentsServer{
		db: db,
	}
}

// EnrollSubject - zapisuje studenta na przedmiot
func (s *EnrollmentsServer) EnrollSubject(ctx context.Context, req *pb.EnrollSubjectRequest) (*pb.EnrollSubjectResponse, error) {
	enrollmentsLog.LogInfo(fmt.Sprintf("EnrollSubject request received for subject_id: %d", req.SubjectId))

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		enrollmentsLog.LogError("Failed to get user_id from context", err)
		return &pb.EnrollSubjectResponse{
			Success: false,
			Message: "Unauthorized: user not authenticated",
		}, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	var albumNr int
	err = s.db.QueryRow("SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
	if err != nil {
		enrollmentsLog.LogError("Failed to get album_nr", err)
		return &pb.EnrollSubjectResponse{
			Success: false,
			Message: "User is not a student",
		}, status.Error(codes.PermissionDenied, "user is not a student")
	}

	var regActive bool
	err = s.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM academic_calendar ac
			JOIN subjects s ON ac.applies_to = s.alias
			WHERE s.subject_id = $1
			  AND ac.event_type = 'registration'
			  AND CURRENT_DATE BETWEEN ac.start_date AND ac.end_date
		)
	`, req.SubjectId).Scan(&regActive)
	if err != nil || !regActive {
		return &pb.EnrollSubjectResponse{
			Success: false,
			Message: "Registration period is not active for this subject",
		}, status.Error(codes.FailedPrecondition, "registration period not active")
	}

	var alreadyEnrolled bool
	err = s.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM student_classes sc
			JOIN classes c ON sc.class_id = c.class_id
			WHERE c.subject_id = $1 AND sc.album_nr = $2
		)
	`, req.SubjectId, albumNr).Scan(&alreadyEnrolled)
	if err != nil {
		enrollmentsLog.LogError("Failed to check enrollment status", err)
		return &pb.EnrollSubjectResponse{
			Success: false,
			Message: "Database error",
		}, status.Error(codes.Internal, "database error")
	}
	if alreadyEnrolled {
		return &pb.EnrollSubjectResponse{
			Success: false,
			Message: "Already enrolled in this subject",
		}, status.Error(codes.AlreadyExists, "already enrolled")
	}

	for _, classID := range req.ClassIds {
		var belongsToSubject bool
		err = s.db.QueryRow(`
			SELECT EXISTS(SELECT 1 FROM classes WHERE class_id = $1 AND subject_id = $2)
		`, classID, req.SubjectId).Scan(&belongsToSubject)
		if err != nil || !belongsToSubject {
			return &pb.EnrollSubjectResponse{
				Success: false,
				Message: fmt.Sprintf("Class %d does not belong to subject %d", classID, req.SubjectId),
			}, status.Error(codes.InvalidArgument, "invalid class_id")
		}
	}

	for _, classID := range req.ClassIds {
		var currentCapacity, capacity int
		err = s.db.QueryRow(`
			SELECT current_capacity, capacity FROM classes WHERE class_id = $1
		`, classID).Scan(&currentCapacity, &capacity)
		if err != nil {
			enrollmentsLog.LogError("Failed to check class capacity", err)
			return &pb.EnrollSubjectResponse{
				Success: false,
				Message: "Database error",
			}, status.Error(codes.Internal, "database error")
		}
		if currentCapacity >= capacity {
			return &pb.EnrollSubjectResponse{
				Success: false,
				Message: fmt.Sprintf("No available spots in class %d", classID),
			}, status.Error(codes.ResourceExhausted, "no available spots")
		}
	}

	conflictCheck, err := s.CheckScheduleConflicts(ctx, &pb.CheckScheduleConflictsRequest{
		ClassIds: req.ClassIds,
	})
	if err != nil {
		enrollmentsLog.LogError("Failed to check schedule conflicts", err)
		return &pb.EnrollSubjectResponse{
			Success: false,
			Message: "Failed to check schedule conflicts",
		}, err
	}
	if conflictCheck.HasConflicts {
		return &pb.EnrollSubjectResponse{
			Success: false,
			Message: fmt.Sprintf("Schedule conflicts detected: %s", conflictCheck.Message),
		}, status.Error(codes.FailedPrecondition, "schedule conflicts")
	}

	tx, err := s.db.Begin()
	if err != nil {
		enrollmentsLog.LogError("Failed to begin transaction", err)
		return &pb.EnrollSubjectResponse{
			Success: false,
			Message: "Database error",
		}, status.Error(codes.Internal, "database error")
	}
	defer tx.Rollback()

	for _, classID := range req.ClassIds {
		_, err = tx.Exec(`
			INSERT INTO student_classes (class_id, album_nr)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, classID, albumNr)
		if err != nil {
			enrollmentsLog.LogError("Failed to enroll in class", err)
			return &pb.EnrollSubjectResponse{
				Success: false,
				Message: "Failed to enroll in class",
			}, status.Error(codes.Internal, "database error")
		}

		_, err = tx.Exec(`
			UPDATE classes SET current_capacity = current_capacity + 1
			WHERE class_id = $1
		`, classID)
		if err != nil {
			enrollmentsLog.LogError("Failed to update class capacity", err)
			return &pb.EnrollSubjectResponse{
				Success: false,
				Message: "Failed to update class capacity",
			}, status.Error(codes.Internal, "database error")
		}
	}

	if err = tx.Commit(); err != nil {
		enrollmentsLog.LogError("Failed to commit transaction", err)
		return &pb.EnrollSubjectResponse{
			Success: false,
			Message: "Failed to complete enrollment",
		}, status.Error(codes.Internal, "database error")
	}

	enrollment, err := s.getEnrollmentDetails(req.SubjectId, albumNr)
	if err != nil {
		enrollmentsLog.LogError("Failed to get enrollment details", err)
	}

	enrollmentsLog.LogInfo(fmt.Sprintf("Successfully enrolled student %d in subject %d", albumNr, req.SubjectId))
	return &pb.EnrollSubjectResponse{
		Success:    true,
		Message:    "Successfully enrolled in subject",
		Enrollment: enrollment,
	}, nil
}

// UnenrollSubject - wypisuje studenta z przedmiotu
func (s *EnrollmentsServer) UnenrollSubject(ctx context.Context, req *pb.UnenrollSubjectRequest) (*pb.UnenrollSubjectResponse, error) {
	enrollmentsLog.LogInfo(fmt.Sprintf("UnenrollSubject request received for subject_id: %d", req.SubjectId))

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return &pb.UnenrollSubjectResponse{
			Success: false,
			Message: "Unauthorized",
		}, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	var albumNr int
	err = s.db.QueryRow("SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
	if err != nil {
		return &pb.UnenrollSubjectResponse{
			Success: false,
			Message: "User is not a student",
		}, status.Error(codes.PermissionDenied, "user is not a student")
	}

	rows, err := s.db.Query(`
		SELECT sc.class_id
		FROM student_classes sc
		JOIN classes c ON sc.class_id = c.class_id
		WHERE c.subject_id = $1 AND sc.album_nr = $2
	`, req.SubjectId, albumNr)
	if err != nil {
		enrollmentsLog.LogError("Failed to get enrolled classes", err)
		return &pb.UnenrollSubjectResponse{
			Success: false,
			Message: "Database error",
		}, status.Error(codes.Internal, "database error")
	}
	defer rows.Close()

	var classIDs []int
	for rows.Next() {
		var classID int
		if err := rows.Scan(&classID); err != nil {
			continue
		}
		classIDs = append(classIDs, classID)
	}

	if len(classIDs) == 0 {
		return &pb.UnenrollSubjectResponse{
			Success: false,
			Message: "Not enrolled in this subject",
		}, status.Error(codes.NotFound, "not enrolled")
	}

	tx, err := s.db.Begin()
	if err != nil {
		enrollmentsLog.LogError("Failed to begin transaction", err)
		return &pb.UnenrollSubjectResponse{
			Success: false,
			Message: "Database error",
		}, status.Error(codes.Internal, "database error")
	}
	defer tx.Rollback()

	for _, classID := range classIDs {
		_, err = tx.Exec(`
			DELETE FROM student_classes WHERE class_id = $1 AND album_nr = $2
		`, classID, albumNr)
		if err != nil {
			enrollmentsLog.LogError("Failed to unenroll from class", err)
			return &pb.UnenrollSubjectResponse{
				Success: false,
				Message: "Failed to unenroll from class",
			}, status.Error(codes.Internal, "database error")
		}

		_, err = tx.Exec(`
			UPDATE classes SET current_capacity = current_capacity - 1
			WHERE class_id = $1 AND current_capacity > 0
		`, classID)
		if err != nil {
			enrollmentsLog.LogError("Failed to update class capacity", err)
			return &pb.UnenrollSubjectResponse{
				Success: false,
				Message: "Failed to update class capacity",
			}, status.Error(codes.Internal, "database error")
		}
	}

	if err = tx.Commit(); err != nil {
		enrollmentsLog.LogError("Failed to commit transaction", err)
		return &pb.UnenrollSubjectResponse{
			Success: false,
			Message: "Failed to complete unenrollment",
		}, status.Error(codes.Internal, "database error")
	}

	enrollmentsLog.LogInfo(fmt.Sprintf("Successfully unenrolled student %d from subject %d", albumNr, req.SubjectId))
	return &pb.UnenrollSubjectResponse{
		Success: true,
		Message: "Successfully unenrolled from subject",
	}, nil
}

// GetMyEnrollments - pobiera listę przedmiotów na które student jest zapisany
func (s *EnrollmentsServer) GetMyEnrollments(ctx context.Context, req *pb.GetMyEnrollmentsRequest) (*pb.GetMyEnrollmentsResponse, error) {
	enrollmentsLog.LogInfo("GetMyEnrollments request received")

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		return &pb.GetMyEnrollmentsResponse{
			Enrollments: []*pb.Enrollment{},
			Message:     "Unauthorized",
		}, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	var albumNr int
	err = s.db.QueryRow("SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
	if err != nil {
		return &pb.GetMyEnrollmentsResponse{
			Enrollments: []*pb.Enrollment{},
			Message:     "User is not a student",
		}, status.Error(codes.PermissionDenied, "user is not a student")
	}

	query := `
		SELECT DISTINCT
			s.subject_id,
			s.name
		FROM student_classes sc
		JOIN classes c ON sc.class_id = c.class_id
		JOIN subjects s ON c.subject_id = s.subject_id
		WHERE sc.album_nr = $1
		ORDER BY s.name
	`

	rows, err := s.db.Query(query, albumNr)
	if err != nil {
		enrollmentsLog.LogError("Failed to fetch enrollments", err)
		return &pb.GetMyEnrollmentsResponse{
			Enrollments: []*pb.Enrollment{},
			Message:     "Database error",
		}, status.Error(codes.Internal, "database error")
	}
	defer rows.Close()

	var enrollments []*pb.Enrollment
	for rows.Next() {
		var subjectID int
		var subjectName string
		if err := rows.Scan(&subjectID, &subjectName); err != nil {
			enrollmentsLog.LogError("Failed to scan enrollment row", err)
			continue
		}

		enrollment, err := s.getEnrollmentDetails(int32(subjectID), albumNr)
		if err != nil {
			enrollmentsLog.LogError("Failed to get enrollment details", err)
			continue
		}

		enrollments = append(enrollments, enrollment)
	}

	enrollmentsLog.LogInfo(fmt.Sprintf("Returning %d enrollments to client", len(enrollments)))
	for i, e := range enrollments {
			if i < 3 {
					enrollmentsLog.LogDebug(fmt.Sprintf("Enrollment %d: SubjectID=%d Name=%s", i, e.SubjectId, e.SubjectName))
			}
	}

	enrollmentsLog.LogInfo(fmt.Sprintf("Successfully returned %d enrollments", len(enrollments)))
	return &pb.GetMyEnrollmentsResponse{
		Enrollments: enrollments,
		Message:     "Enrollments retrieved successfully",
	}, nil
}

// CheckScheduleConflicts - sprawdza konflikty w planie zajęć
func (s *EnrollmentsServer) CheckScheduleConflicts(ctx context.Context, req *pb.CheckScheduleConflictsRequest) (*pb.CheckScheduleConflictsResponse, error) {
	enrollmentsLog.LogInfo("CheckScheduleConflicts request received")

	// TODO: Zintegrować z calendar_events aby sprawdzić rzeczywiste konflikty czasowe

	userID, _ := getUserIDFromContext(ctx)
	var albumNr int
	if userID > 0 {
		s.db.QueryRow("SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
	}

	var conflicts []*pb.ScheduleConflict
	hasConflicts := false

	// Sprawdź konflikty pomiędzy wybranymi klasami
	// Na razie placeholder - można rozszerzyć o sprawdzanie godzin z calendar_events

	if len(conflicts) > 0 {
		hasConflicts = true
	}

	return &pb.CheckScheduleConflictsResponse{
		HasConflicts: hasConflicts,
		Conflicts:    conflicts,
		Message:      "Schedule check completed",
	}, nil
}

// Pomocnicza funkcja do pobierania szczegółów enrollment
func (s *EnrollmentsServer) getEnrollmentDetails(subjectID int32, albumNr int) (*pb.Enrollment, error) {
	var enrollment pb.Enrollment

	err := s.db.QueryRow("SELECT name FROM subjects WHERE subject_id = $1", subjectID).Scan(&enrollment.SubjectName)
	if err != nil {
		return nil, err
	}

	enrollment.SubjectId = subjectID
	enrollment.EnrolledAt = timestamppb.New(time.Now())

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
		FROM student_classes sc
		JOIN classes c ON sc.class_id = c.class_id
		JOIN buildings b ON c.building_id = b.building_id
		WHERE sc.album_nr = $1 AND c.subject_id = $2
		ORDER BY c.class_type, c.group_nr
	`

	rows, err := s.db.Query(classesQuery, albumNr, subjectID)
	if err != nil {
		return nil, err
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
			continue
		}

		instructorsQuery := `
			SELECT CONCAT(u.name, ' ', u.surname) as instructor_name
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

	enrollment.EnrolledClasses = classes
	return &enrollment, nil
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
// Pomocnicza funkcja do pobierania user_id z kontekstu
