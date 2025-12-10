package grades

import (
	"context"
	"database/sql"
	"fmt"
	"time"
	"strings"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/grades"
	"github.com/slomus/USOSWEB/src/backend/pkg/cache"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

var gradesLog = logger.NewLogger("grades-service")

type GradesServer struct {
	pb.UnimplementedGradesServiceServer
	db     *sql.DB
	cache  cache.Cache
	config *cache.CacheConfig
	logger *logger.Logger
}

func NewGradesServer(db *sql.DB) *GradesServer {
	return &GradesServer{
		db:     db,
		cache:  nil,
		config: cache.DefaultCacheConfig(),
		logger: logger.NewLogger("grades-service"),
	}
}

func NewGradesServerWithCache(db *sql.DB, cacheClient cache.Cache) *GradesServer {
	return &GradesServer{
		db:     db,
		cache:  cacheClient,
		config: cache.DefaultCacheConfig(),
		logger: logger.NewLogger("grades-service"),
	}
}

func (s *GradesServer) ListGrades(ctx context.Context, req *pb.ListGradesRequest) (*pb.ListGradesResponse, error) {
	albumNr, role, teachingStaffID, err := s.resolveCallerContext(ctx, req)
	if err != nil {
		return nil, err
	}

	_ = teachingStaffID

	var query string
	var args []interface{}

	if role == "admin" && req.AllStudents != nil && *req.AllStudents {
		query = `
			SELECT
				g.grade_id, g.album_nr, g.class_id, g.subject_id, g.value, g.weight, g.attempt,
				g.added_by_teaching_staff_id, g.comment, g.created_at,
				COALESCE(s.name, 'Unknown Subject') as subject_name,
				COALESCE(CONCAT(ts.degree, ' ', u.name, ' ', u.surname), 'Unknown Teacher') as added_by_name,
				COALESCE(CONCAT(u2.name, ' ', u2.surname), 'Unknown Student') as student_name,
				c.class_type
			FROM grades g
			LEFT JOIN classes c ON g.class_id = c.class_id
			LEFT JOIN subjects s ON g.subject_id = s.subject_id
			LEFT JOIN teaching_staff ts ON g.added_by_teaching_staff_id = ts.teaching_staff_id
			LEFT JOIN users u ON ts.user_id = u.user_id
			LEFT JOIN students st ON g.album_nr = st.album_nr
			LEFT JOIN users u2 ON st.user_id = u2.user_id
			ORDER BY g.created_at DESC
		`
		args = []interface{}{}
	} else {
		query = `
			SELECT
				g.grade_id, g.album_nr, g.class_id, g.subject_id, g.value, g.weight, g.attempt,
				g.added_by_teaching_staff_id, g.comment, g.created_at,
				COALESCE(s.name, 'Unknown Subject') as subject_name,
				COALESCE(CONCAT(ts.degree, ' ', u.name, ' ', u.surname), 'Unknown Teacher') as added_by_name,
				COALESCE(CONCAT(u2.name, ' ', u2.surname), 'Unknown Student') as student_name,
				c.class_type
			FROM grades g
			LEFT JOIN classes c ON g.class_id = c.class_id
			LEFT JOIN subjects s ON g.subject_id = s.subject_id
			LEFT JOIN teaching_staff ts ON g.added_by_teaching_staff_id = ts.teaching_staff_id
			LEFT JOIN users u ON ts.user_id = u.user_id
			LEFT JOIN students st ON g.album_nr = st.album_nr
			LEFT JOIN users u2 ON st.user_id = u2.user_id
			WHERE g.album_nr = $1
			ORDER BY g.created_at DESC
		`
		args = []interface{}{albumNr}
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		gradesLog.LogError("Failed to query grades", err)
		return nil, status.Error(codes.Internal, "failed to fetch grades")
	}
	defer rows.Close()

	var result []*pb.Grade
	for rows.Next() {
		g := &pb.Grade{}
		var createdAt time.Time
		var subjectName, addedByName, studentName, classType string
		var comment sql.NullString

		if err := rows.Scan(
			&g.GradeId, &g.AlbumNr, &g.ClassId, &g.SubjectId, &g.Value,
			&g.Weight, &g.Attempt, &g.AddedByTeachingStaffId, &comment,
			&createdAt, &subjectName, &addedByName, &studentName, &classType); err != nil {
			gradesLog.LogError("Failed to scan grade row", err)
			continue
		}
		g.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		g.SubjectName = &subjectName
		g.AddedByName = &addedByName
		g.StudentName = &studentName
		g.ClassType = &classType
		if comment.Valid {
			g.Comment = comment.String
		}
		result = append(result, g)
	}
	return &pb.ListGradesResponse{
		Grades:  result,
		Message: "Grades retrieved successfully",
	}, nil
}

func (s *GradesServer) AddGrade(ctx context.Context, req *pb.AddGradeRequest) (*pb.AddGradeResponse, error) {
	albumNr, role, teachingStaffID, err := s.resolveCallerContextForAdd(ctx, req)
	if err != nil {
		return nil, err
	}

	if role == "admin" && req.AsTeachingStaffId != nil {
		var exists bool
		err = s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM teaching_staff WHERE teaching_staff_id = $1)", *req.AsTeachingStaffId).Scan(&exists)
		if err != nil || !exists {
			return nil, status.Error(codes.InvalidArgument, "invalid as_teaching_staff_id")
		}
		teachingStaffID = int64(*req.AsTeachingStaffId)
		
		var teaches bool
		err = s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM course_instructors WHERE class_id = $1 AND teaching_staff_id = $2)", req.ClassId, teachingStaffID).Scan(&teaches)
		if err != nil || !teaches {
			return nil, status.Error(codes.InvalidArgument, "selected teacher does not teach this class")
		}
	}

	validValues := map[string]bool{"2.0": true, "3.0": true, "3.5": true, "4.0": true, "4.5": true, "5.0": true, "NZAL": true, "ZAL": true}
	if !validValues[req.Value] {
		return nil, status.Error(codes.InvalidArgument, "invalid grade value")
	}

	var attends bool
	err = s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM student_classes WHERE class_id = $1 AND album_nr = $2)", req.ClassId, albumNr).Scan(&attends)
	if err != nil || !attends {
		return nil, status.Error(codes.FailedPrecondition, "student is not assigned to the class")
	}

	var classSubjectId int
	err = s.db.QueryRowContext(ctx, "SELECT subject_id FROM classes WHERE class_id = $1", req.ClassId).Scan(&classSubjectId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid class_id")
	}
	if classSubjectId != int(req.SubjectId) {
		return nil, status.Error(codes.InvalidArgument, "class does not belong to provided subject")
	}

	if role == "teacher" {
		var teaches bool
		err = s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM course_instructors WHERE class_id = $1 AND teaching_staff_id = $2)", req.ClassId, teachingStaffID).Scan(&teaches)
		if err != nil || !teaches {
			return nil, status.Error(codes.PermissionDenied, "teacher does not teach this class")
		}
	}

	weight := int32(1)
	if req.Weight != nil {
		weight = *req.Weight
	}
	attempt := int32(1)
	if req.Attempt != nil {
		attempt = *req.Attempt
	}

	var comment sql.NullString
	if req.Comment != nil {
		comment = sql.NullString{String: *req.Comment, Valid: true}
	} else {
		comment = sql.NullString{Valid: false}
	}

	var (
		gradeID   int
		createdAt time.Time
	)
	insertQuery := `
        INSERT INTO grades (album_nr, class_id, subject_id, value, weight, attempt, added_by_teaching_staff_id, comment)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING grade_id, created_at`

	err = s.db.QueryRowContext(ctx, insertQuery, albumNr, req.ClassId, req.SubjectId, req.Value, weight, attempt, teachingStaffID, comment).Scan(&gradeID, &createdAt)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return nil, status.Error(codes.AlreadyExists, "grade attempt already exists for this class and student")
		}
		gradesLog.LogError("Failed to insert grade", err)
		return nil, status.Error(codes.Internal, "failed to add grade")
	}

	g := &pb.Grade{
		GradeId:                int32(gradeID),
		AlbumNr:                albumNr,
		ClassId:                req.ClassId,
		SubjectId:              req.SubjectId,
		Value:                  req.Value,
		Weight:                 weight,
		Attempt:                attempt,
		AddedByTeachingStaffId: int32(teachingStaffID),
		Comment:                getString(comment),
		CreatedAt:              createdAt.Format("2006-01-02 15:04:05"),
	}


	var subjectName, addedByName, studentName, classType string
	enrichQuery := `
			SELECT 
					COALESCE(s.name, '') as subject_name,
					COALESCE(CONCAT(ts.degree, ' ', u.name, ' ', u.surname), '') as added_by_name,
					COALESCE(CONCAT(u2.name, ' ', u2.surname), '') as student_name,
					c.class_type
			FROM grades g
			LEFT JOIN classes c ON g.class_id = c.class_id
			LEFT JOIN subjects s ON g.subject_id = s.subject_id
			LEFT JOIN teaching_staff ts ON g.added_by_teaching_staff_id = ts.teaching_staff_id
			LEFT JOIN users u ON ts.user_id = u.user_id
			LEFT JOIN students st ON g.album_nr = st.album_nr
			LEFT JOIN users u2 ON st.user_id = u2.user_id
			WHERE g.grade_id = $1
	`

	err = s.db.QueryRowContext(ctx, enrichQuery, gradeID).Scan(&subjectName, &addedByName, &studentName, &classType)
	if err != nil {
			gradesLog.LogError("Failed to enrich grade data", err)
	}

	g.SubjectName = &subjectName
	g.AddedByName = &addedByName
	g.StudentName = &studentName
	g.ClassType = &classType

	return &pb.AddGradeResponse{Grade: g, Message: "Grade added"}, nil
}


func (s *GradesServer) resolveCallerContext(ctx context.Context, req *pb.ListGradesRequest) (albumNr int32, role string, teachingStaffID int64, err error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return 0, "", 0, status.Error(codes.Unauthenticated, "no metadata")
	}
	userIDs := md.Get("user_id")
	if len(userIDs) == 0 {
		return 0, "", 0, status.Error(codes.Unauthenticated, "no user_id")
	}

	var userID int64
	fmt.Sscanf(userIDs[0], "%d", &userID)

	role, albumFromDB, teachingID, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		return 0, "", 0, status.Error(codes.Internal, "failed to resolve user role")
	}

	switch role {
	case "student":
		return int32(albumFromDB), role, teachingID, nil
	case "teacher":
		if req.AlbumNr == nil || *req.AlbumNr == 0 {
			return 0, "", 0, status.Error(codes.InvalidArgument, "album_nr is required for teacher")
		}
		return *req.AlbumNr, role, teachingID, nil
	case "admin":
		if req.AllStudents != nil && *req.AllStudents {
			return 0, role, teachingID, nil // 0 = wszystkie
		}
		if req.AlbumNr == nil || *req.AlbumNr == 0 {
			return 0, "", 0, status.Error(codes.InvalidArgument, "album_nr is required when all_students is not set")
		}
		return *req.AlbumNr, role, teachingID, nil
	default:
		return 0, "", 0, status.Error(codes.PermissionDenied, "unknown role")
	}
}


func (s *GradesServer) resolveCallerContextForAdd(ctx context.Context, req *pb.AddGradeRequest) (albumNr int32, role string, teachingStaffID int64, err error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return 0, "", 0, status.Error(codes.Unauthenticated, "no metadata")
	}
	userIDs := md.Get("user_id")
	if len(userIDs) == 0 {
		return 0, "", 0, status.Error(codes.Unauthenticated, "no user_id")
	}
	var userID int64
	fmt.Sscanf(userIDs[0], "%d", &userID)

	role, _, teachingID, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		return 0, "", 0, status.Error(codes.Internal, "failed to resolve user role")
	}

	if role == "student" {
		return 0, "", 0, status.Error(codes.PermissionDenied, "students cannot add grades")
	}

	if role == "teacher" {
		return req.AlbumNr, role, teachingID, nil
	}

	if role == "admin" {
		if req.AsTeachingStaffId == nil {
			return 0, "", 0, status.Error(codes.InvalidArgument, "admin must provide as_teaching_staff_id")
		}
		return req.AlbumNr, role, 0, nil 
	}
	
	return req.AlbumNr, role, teachingID, nil
}
func (s *GradesServer) getUserRoleAndIdentifiers(ctx context.Context, userID int64) (role string, albumNr int64, teachingStaffID int64, err error) {
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
	if err != nil {
		return "", 0, 0, err
	}
	return role, albumNr, teachingStaffID, nil
}

func stringsContains(s, sub string) bool { return (len(s) >= len(sub)) && (indexOf(s, sub) >= 0) }
func indexOf(s, sub string) int {
	return len([]rune(s[:])) - len([]rune((func() string { i := len([]rune(s)); _ = i; return s })())) /* dummy to avoid importing strings */
}
func getString(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}

func (s *GradesServer) GetRecentGrades(ctx context.Context, req *pb.GetRecentGradesRequest) (*pb.GetRecentGradesResponse, error) {
	gradesLog.LogInfo("GetRecentGrades request received")

	userID, err := getUserIDFromContext(ctx)
	if err != nil {
		gradesLog.LogError("Failed to get user_id from context", err)
		return &pb.GetRecentGradesResponse{
			Grades:  []*pb.Grade{},
			Message: "Unauthorized",
		}, status.Error(codes.Unauthenticated, "user not authenticated")
	}

	var albumNr int32
	err = s.db.QueryRowContext(ctx, "SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
	if err != nil {
		if err == sql.ErrNoRows {
			gradesLog.LogWarn(fmt.Sprintf("User %d is not a student", userID))
			return &pb.GetRecentGradesResponse{
				Grades:  []*pb.Grade{},
				Message: "User is not a student",
			}, status.Error(codes.PermissionDenied, "user is not a student")
		}
		gradesLog.LogError("Failed to get album_nr", err)
		return nil, status.Error(codes.Internal, "database error")
	}

	limit := int32(10)
	if req.Limit != nil && *req.Limit > 0 {
		limit = *req.Limit
	}

	query := `
		SELECT
			g.grade_id, g.album_nr, g.class_id, g.subject_id, g.value, g.weight, g.attempt,
			g.added_by_teaching_staff_id, g.comment, g.created_at,
			s.name as subject_name,
			CONCAT(ts.degree, ' ', u.name, ' ', u.surname) as added_by_name
		FROM grades g
		LEFT JOIN classes c ON g.class_id = c.class_id
		LEFT JOIN subjects s ON c.subject_id = s.subject_id
		LEFT JOIN teaching_staff ts ON g.added_by_teaching_staff_id = ts.teaching_staff_id
		LEFT JOIN users u ON ts.user_id = u.user_id
		WHERE g.album_nr = $1
		ORDER BY g.created_at DESC
		LIMIT $2
	`

	rows, err := s.db.QueryContext(ctx, query, albumNr, limit)
	if err != nil {
		gradesLog.LogError("Failed to query recent grades", err)
		return nil, status.Error(codes.Internal, "failed to fetch recent grades")
	}
	defer rows.Close()

	var result []*pb.Grade
	for rows.Next() {
		g := &pb.Grade{}
		var createdAt time.Time
		var subjectName, addedByName string
		var comment sql.NullString

		if err := rows.Scan(
			&g.GradeId, &g.AlbumNr, &g.ClassId, &g.SubjectId, &g.Value,
			&g.Weight, &g.Attempt, &g.AddedByTeachingStaffId, &comment,
			&createdAt, &subjectName, &addedByName); err != nil {
			gradesLog.LogError("Failed to scan grade row", err)
			continue
		}
		
		g.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		g.SubjectName = &subjectName
		g.AddedByName = &addedByName
		if comment.Valid {
			g.Comment = comment.String
		} 
		
		result = append(result, g)
	}

	gradesLog.LogInfo(fmt.Sprintf("Successfully returned %d recent grades for student %d", len(result), albumNr))
	return &pb.GetRecentGradesResponse{
		Grades:  result,
		Message: "Recent grades retrieved successfully",
	}, nil
}


func (s *GradesServer) UpdateGrade(ctx context.Context, req *pb.UpdateGradeRequest) (*pb.UpdateGradeResponse, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "no metadata")
	}
	userIDs := md.Get("user_id")
	if len(userIDs) == 0 {
		return nil, status.Error(codes.Unauthenticated, "no user_id")
	}
	var userID int64
	fmt.Sscanf(userIDs[0], "%d", &userID)

	role, _, teachingID, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to resolve user role")
	}

	if role == "student" {
		return nil, status.Error(codes.PermissionDenied, "students cannot update grades")
	}

	var classID int32
	var addedBy int64
	err = s.db.QueryRowContext(ctx, 
		"SELECT class_id, added_by_teaching_staff_id FROM grades WHERE grade_id = $1", 
		req.GradeId).Scan(&classID, &addedBy)
	if err == sql.ErrNoRows {
		return nil, status.Error(codes.NotFound, "grade not found")
	}
	if err != nil {
		gradesLog.LogError("Failed to fetch grade", err)
		return nil, status.Error(codes.Internal, "failed to fetch grade")
	}

	if role == "teacher" {
		var teaches bool
		err = s.db.QueryRowContext(ctx, 
			"SELECT EXISTS(SELECT 1 FROM course_instructors WHERE class_id = $1 AND teaching_staff_id = $2)", 
			classID, teachingID).Scan(&teaches)
		if err != nil || !teaches {
			return nil, status.Error(codes.PermissionDenied, "teacher does not teach this class")
		}
	}

	if req.Value != nil {
		validValues := map[string]bool{"2.0": true, "3.0": true, "3.5": true, "4.0": true, "4.5": true, "5.0": true, "NZAL": true, "ZAL": true}
		if !validValues[*req.Value] {
			return nil, status.Error(codes.InvalidArgument, "invalid grade value")
		}
	}

	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.Value != nil {
		updates = append(updates, fmt.Sprintf("value = $%d", argPos))
		args = append(args, *req.Value)
		argPos++
	}
	if req.Weight != nil {
		updates = append(updates, fmt.Sprintf("weight = $%d", argPos))
		args = append(args, *req.Weight)
		argPos++
	}
	if req.Comment != nil {
		updates = append(updates, fmt.Sprintf("comment = $%d", argPos))
		args = append(args, *req.Comment)
		argPos++
	}

	if len(updates) == 0 {
		return nil, status.Error(codes.InvalidArgument, "no fields to update")
	}

	args = append(args, req.GradeId)
	updateQuery := fmt.Sprintf("UPDATE grades SET %s WHERE grade_id = $%d", 
		strings.Join(updates, ", "), argPos)

	_, err = s.db.ExecContext(ctx, updateQuery, args...)
	if err != nil {
		gradesLog.LogError("Failed to update grade", err)
		return nil, status.Error(codes.Internal, "failed to update grade")
	}

	var g pb.Grade
	var createdAt time.Time
	var subjectName, addedByName string
	var comment sql.NullString

	query := `
		SELECT g.grade_id, g.album_nr, g.class_id, g.subject_id, g.value, g.weight, g.attempt,
			   g.added_by_teaching_staff_id, g.comment, g.created_at,
			   s.name, CONCAT(ts.degree, ' ', u.name, ' ', u.surname)
		FROM grades g
		LEFT JOIN classes c ON g.class_id = c.class_id
		LEFT JOIN subjects s ON c.subject_id = s.subject_id
		LEFT JOIN teaching_staff ts ON g.added_by_teaching_staff_id = ts.teaching_staff_id
		LEFT JOIN users u ON ts.user_id = u.user_id
		WHERE g.grade_id = $1
	`

	err = s.db.QueryRowContext(ctx, query, req.GradeId).Scan(
		&g.GradeId, &g.AlbumNr, &g.ClassId, &g.SubjectId, &g.Value,
		&g.Weight, &g.Attempt, &g.AddedByTeachingStaffId, &comment,
		&createdAt, &subjectName, &addedByName)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to fetch updated grade")
	}

	g.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
	g.SubjectName = &subjectName
	g.AddedByName = &addedByName
	if comment.Valid {
		g.Comment = comment.String
	}

	gradesLog.LogInfo(fmt.Sprintf("Grade %d updated by %s user %d", req.GradeId, role, userID))
	return &pb.UpdateGradeResponse{Grade: &g, Message: "Grade updated successfully"}, nil
}

func (s *GradesServer) DeleteGrade(ctx context.Context, req *pb.DeleteGradeRequest) (*pb.DeleteGradeResponse, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "no metadata")
	}
	userIDs := md.Get("user_id")
	if len(userIDs) == 0 {
		return nil, status.Error(codes.Unauthenticated, "no user_id")
	}
	var userID int64
	fmt.Sscanf(userIDs[0], "%d", &userID)

	role, _, teachingID, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to resolve user role")
	}

	if role == "student" {
		return nil, status.Error(codes.PermissionDenied, "students cannot delete grades")
	}

	var classID int32
	err = s.db.QueryRowContext(ctx, 
		"SELECT class_id FROM grades WHERE grade_id = $1", 
		req.GradeId).Scan(&classID)
	if err == sql.ErrNoRows {
		return nil, status.Error(codes.NotFound, "grade not found")
	}
	if err != nil {
		gradesLog.LogError("Failed to fetch grade", err)
		return nil, status.Error(codes.Internal, "failed to fetch grade")
	}

	if role == "teacher" {
		var teaches bool
		err = s.db.QueryRowContext(ctx, 
			"SELECT EXISTS(SELECT 1 FROM course_instructors WHERE class_id = $1 AND teaching_staff_id = $2)", 
			classID, teachingID).Scan(&teaches)
		if err != nil || !teaches {
			return nil, status.Error(codes.PermissionDenied, "teacher does not teach this class")
		}
	}

	result, err := s.db.ExecContext(ctx, "DELETE FROM grades WHERE grade_id = $1", req.GradeId)
	if err != nil {
		gradesLog.LogError("Failed to delete grade", err)
		return nil, status.Error(codes.Internal, "failed to delete grade")
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return nil, status.Error(codes.NotFound, "grade not found")
	}

	gradesLog.LogInfo(fmt.Sprintf("Grade %d deleted by %s user %d", req.GradeId, role, userID))
	return &pb.DeleteGradeResponse{Success: true, Message: "Grade deleted successfully"}, nil
}

func (s *GradesServer) GetTeacherClasses(ctx context.Context, req *pb.GetTeacherClassesRequest) (*pb.GetTeacherClassesResponse, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "no metadata")
	}
	userIDs := md.Get("user_id")
	if len(userIDs) == 0 {
		return nil, status.Error(codes.Unauthenticated, "no user_id")
	}
	var userID int64
	fmt.Sscanf(userIDs[0], "%d", &userID)

	// Sprawdź rolę
	role, _, teachingID, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to resolve user role")
	}

	if role != "teacher" && role != "admin" {
		return nil, status.Error(codes.PermissionDenied, "only teachers can access this endpoint")
	}

	if teachingID == 0 {
		return nil, status.Error(codes.PermissionDenied, "user is not a teacher")
	}

	query := `
		SELECT 
			c.class_id,
			c.subject_id,
			s.name as subject_name,
			s.alias as subject_alias,
			c.class_type,
			c.group_nr,
			c.current_capacity,
			c.capacity,
			c.classroom,
			b.name as building_name
		FROM course_instructors ci
		JOIN classes c ON ci.class_id = c.class_id
		JOIN subjects s ON c.subject_id = s.subject_id
		JOIN buildings b ON c.building_id = b.building_id
		WHERE ci.teaching_staff_id = $1
		ORDER BY s.name, c.class_type, c.group_nr
	`

	rows, err := s.db.QueryContext(ctx, query, teachingID)
	if err != nil {
		gradesLog.LogError("Failed to query teacher classes", err)
		return nil, status.Error(codes.Internal, "failed to fetch classes")
	}
	defer rows.Close()

	var classes []*pb.TeacherClass
	for rows.Next() {
		tc := &pb.TeacherClass{}
		err := rows.Scan(
			&tc.ClassId,
			&tc.SubjectId,
			&tc.SubjectName,
			&tc.SubjectAlias,
			&tc.ClassType,
			&tc.GroupNr,
			&tc.CurrentCapacity,
			&tc.Capacity,
			&tc.Classroom,
			&tc.BuildingName,
		)
		if err != nil {
			gradesLog.LogError("Failed to scan teacher class row", err)
			continue
		}
		// Ustaw wartości domyślne dla brakujących pól
		tc.Semester = "zimowy"
		tc.AcademicYear = "2024/2025"
		
		classes = append(classes, tc)
	}

	gradesLog.LogInfo(fmt.Sprintf("Successfully returned %d classes for teacher user %d", len(classes), userID))
	return &pb.GetTeacherClassesResponse{
		Classes: classes,
		Message: "Teacher classes retrieved successfully",
	}, nil
}


func (s *GradesServer) GetAdminGradeOptions(ctx context.Context, req *pb.GetAdminGradeOptionsRequest) (*pb.GetAdminGradeOptionsResponse, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "no metadata")
	}
	userIDs := md.Get("user_id")
	if len(userIDs) == 0 {
		return nil, status.Error(codes.Unauthenticated, "no user_id")
	}
	var userID int64
	fmt.Sscanf(userIDs[0], "%d", &userID)

	role, _, _, err := s.getUserRoleAndIdentifiers(ctx, userID)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to resolve user role")
	}

	if role != "admin" {
		return nil, status.Error(codes.PermissionDenied, "only admins can access this endpoint")
	}

	studentsQuery := `
		SELECT s.album_nr, CONCAT(u.name, ' ', u.surname) as name, COALESCE(c.name, 'Brak kursu') as course_name
		FROM students s
		JOIN users u ON s.user_id = u.user_id
		LEFT JOIN courses c ON s.course_id = c.course_id
		ORDER BY u.surname, u.name
	`
	studentsRows, err := s.db.QueryContext(ctx, studentsQuery)
	if err != nil {
		gradesLog.LogError("Failed to query students", err)
		return nil, status.Error(codes.Internal, "failed to fetch students")
	}
	defer studentsRows.Close()

	var students []*pb.StudentOption
	for studentsRows.Next() {
		so := &pb.StudentOption{}
		if err := studentsRows.Scan(&so.AlbumNr, &so.Name, &so.CourseName); err != nil {
			gradesLog.LogError("Failed to scan student", err)
			continue
		}
		students = append(students, so)
	}

	teachersQuery := `
		SELECT DISTINCT ts.teaching_staff_id, CONCAT(ts.degree, ' ', u.name, ' ', u.surname) as name
		FROM teaching_staff ts
		JOIN users u ON ts.user_id = u.user_id
		ORDER BY 2 
	`
	teachersRows, err := s.db.QueryContext(ctx, teachersQuery)
	if err != nil {
		gradesLog.LogError("Failed to query teachers", err)
		return nil, status.Error(codes.Internal, "failed to fetch teachers")
	}
	defer teachersRows.Close()

	var teachers []*pb.TeacherOption
	
	for teachersRows.Next() {
		to := &pb.TeacherOption{}
		if err := teachersRows.Scan(&to.TeachingStaffId, &to.Name); err != nil {
			gradesLog.LogError("Failed to scan teacher", err)
			continue
		}
		teachers = append(teachers, to)
	}

	for _, teacher := range teachers {
		subjectsQuery := `
			SELECT DISTINCT c.subject_id
			FROM course_instructors ci
			JOIN classes c ON ci.class_id = c.class_id
			WHERE ci.teaching_staff_id = $1
		`
		subRows, err := s.db.QueryContext(ctx, subjectsQuery, teacher.TeachingStaffId)
		if err != nil {
			continue
		}
		for subRows.Next() {
			var subjectID int32
			if err := subRows.Scan(&subjectID); err == nil {
				teacher.SubjectIds = append(teacher.SubjectIds, subjectID)
			}
		}
		subRows.Close()
	}

	subjectsQuery := `
		SELECT subject_id, name, alias
		FROM subjects
		ORDER BY name
	`
	subjectsRows, err := s.db.QueryContext(ctx, subjectsQuery)
	if err != nil {
		gradesLog.LogError("Failed to query subjects", err)
		return nil, status.Error(codes.Internal, "failed to fetch subjects")
	}
	defer subjectsRows.Close()

	var subjects []*pb.SubjectOption
	for subjectsRows.Next() {
		so := &pb.SubjectOption{}
		if err := subjectsRows.Scan(&so.SubjectId, &so.Name, &so.Alias); err != nil {
			gradesLog.LogError("Failed to scan subject", err)
			continue
		}
		subjects = append(subjects, so)
	}

	classesQuery := `
		SELECT c.class_id, c.subject_id, s.name as subject_name, c.class_type, c.group_nr
		FROM classes c
		JOIN subjects s ON c.subject_id = s.subject_id
		ORDER BY s.name, c.class_type, c.group_nr
	`
	classesRows, err := s.db.QueryContext(ctx, classesQuery)
	if err != nil {
		gradesLog.LogError("Failed to query classes", err)
		return nil, status.Error(codes.Internal, "failed to fetch classes")
	}
	defer classesRows.Close()

	var classes []*pb.ClassOption
	for classesRows.Next() {
		co := &pb.ClassOption{}
		if err := classesRows.Scan(&co.ClassId, &co.SubjectId, &co.SubjectName, &co.ClassType, &co.GroupNr); err != nil {
			gradesLog.LogError("Failed to scan class", err)
			continue
		}

		teachersQuery := `
			SELECT teaching_staff_id
			FROM course_instructors
			WHERE class_id = $1
		`
		teachRows, err := s.db.QueryContext(ctx, teachersQuery, co.ClassId)
		if err == nil {
			for teachRows.Next() {
				var teacherID int32
				if err := teachRows.Scan(&teacherID); err == nil {
					co.TeacherIds = append(co.TeacherIds, teacherID)
				}
			}
			teachRows.Close()
		}

		studentsQuery := `
			SELECT album_nr
			FROM student_classes
			WHERE class_id = $1
		`
		studRows, err := s.db.QueryContext(ctx, studentsQuery, co.ClassId)
		if err == nil {
			for studRows.Next() {
				var albumNr int32
				if err := studRows.Scan(&albumNr); err == nil {
					co.StudentAlbumNrs = append(co.StudentAlbumNrs, albumNr)
				}
			}
			studRows.Close()
		}

		classes = append(classes, co)
	}

	gradesLog.LogInfo(fmt.Sprintf("Admin grade options: %d students, %d teachers, %d subjects, %d classes", 
		len(students), len(teachers), len(subjects), len(classes)))

	return &pb.GetAdminGradeOptionsResponse{
		Students: students,
		Teachers: teachers,
		Subjects: subjects,
		Classes:  classes,
		Message:  "Admin grade options retrieved successfully",
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


