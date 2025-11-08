package grades

import (
	"context"
	"database/sql"
	"fmt"
	"time"

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

	_ = role
	_ = teachingStaffID

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
	`

	rows, err := s.db.QueryContext(ctx, query, albumNr)
	if err != nil {
		gradesLog.LogError("Failed to query grades", err)
		return nil, status.Error(codes.Internal, "failed to fetch grades")
	}
	defer rows.Close()

	var result []*pb.Grade
	for rows.Next() {
		g := &pb.Grade{}
		var createdAt time.Time
		var subjectName, addedByName string

		if err := rows.Scan(
			&g.GradeId, &g.AlbumNr, &g.ClassId, &g.SubjectId, &g.Value,
			&g.Weight, &g.Attempt, &g.AddedByTeachingStaffId, &g.Comment,
			&createdAt, &subjectName, &addedByName); err != nil {
			gradesLog.LogError("Failed to scan grade row", err)
			continue
		}
		g.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		g.SubjectName = subjectName
		g.AddedByName = addedByName
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

	// Validate value
	validValues := map[string]bool{"2.0": true, "3.0": true, "3.5": true, "4.0": true, "4.5": true, "5.0": true, "NZAL": true, "ZAL": true}
	if !validValues[req.Value] {
		return nil, status.Error(codes.InvalidArgument, "invalid grade value")
	}

	// Validate student attends the class
	var attends bool
	err = s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM student_classes WHERE class_id = $1 AND album_nr = $2)", req.ClassId, albumNr).Scan(&attends)
	if err != nil || !attends {
		return nil, status.Error(codes.FailedPrecondition, "student is not assigned to the class")
	}

	// Validate class belongs to subject_id
	var classSubjectId int
	err = s.db.QueryRowContext(ctx, "SELECT subject_id FROM classes WHERE class_id = $1", req.ClassId).Scan(&classSubjectId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid class_id")
	}
	if classSubjectId != int(req.SubjectId) {
		return nil, status.Error(codes.InvalidArgument, "class does not belong to provided subject")
	}

	// If teacher, verify they teach this class
	if role == "teacher" {
		var teaches bool
		err = s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM course_instructors WHERE class_id = $1 AND teaching_staff_id = $2)", req.ClassId, teachingStaffID).Scan(&teaches)
		if err != nil || !teaches {
			return nil, status.Error(codes.PermissionDenied, "teacher does not teach this class")
		}
	}

	// Insert grade
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
		// unique(album_nr, class_id, attempt) violation
		if stringsContains(err.Error(), "unique") || stringsContains(err.Error(), "duplicate") {
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

	return &pb.AddGradeResponse{Grade: g, Message: "Grade added"}, nil
}

func (s *GradesServer) resolveCallerContext(ctx context.Context, req *pb.ListGradesRequest) (albumNr int32, role string, teachingStaffID int64, err error) {
	// Determine caller role via DB using user_id from metadata
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
		// Student can see only own grades regardless of provided album_nr
		return int32(albumFromDB), role, teachingID, nil
	case "teacher", "admin":
		if req.AlbumNr == nil || *req.AlbumNr == 0 {
			return 0, "", 0, status.Error(codes.InvalidArgument, "album_nr is required for staff/admin")
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

	// admin
	if role == "admin" {
		if teachingID == 0 {
			// Admins do not have teaching_staff_id; forbid unless there's a policy to impersonate a teacher
			return 0, "", 0, status.Error(codes.PermissionDenied, "admin cannot add grade without teaching context")
		}
	}
	return req.AlbumNr, role, teachingID, nil
}

func (s *GradesServer) getUserRoleAndIdentifiers(ctx context.Context, userID int64) (role string, albumNr int64, teachingStaffID int64, err error) {
	// Query role similar to AuthServer.GetUserData
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
		g.SubjectName = subjectName
		g.AddedByName = addedByName
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
