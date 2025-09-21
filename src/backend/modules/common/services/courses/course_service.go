package course

import (
	"context"
	"database/sql"
	"fmt"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/course"
	"github.com/slomus/USOSWEB/src/backend/pkg/cache"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/protobuf/types/known/emptypb"
	"strings"
	"time"
)

var courseLog = logger.NewLogger("course-service")

type CourseServer struct {
	pb.UnimplementedCourseServiceServer
	db     *sql.DB
	cache  cache.Cache
	config *cache.CacheConfig
	logger *logger.Logger
}

func NewCourseServer(db *sql.DB) *CourseServer {
	return &CourseServer{
		db:     db,
		cache:  nil,
		config: cache.DefaultCacheConfig(),
		logger: logger.NewLogger("course-service"),
	}
}

func NewCourseServerWithCache(db *sql.DB, cacheClient cache.Cache) *CourseServer {
	return &CourseServer{
		db:     db,
		cache:  cacheClient,
		config: cache.DefaultCacheConfig(),
		logger: logger.NewLogger("course-service"),
	}
}

func (s *CourseServer) GetStudentCourseInfo(ctx context.Context, req *pb.GetStudentCourseInfoRequest) (*pb.GetStudentCourseInfoResponse, error) {
	courseLog.LogInfo(fmt.Sprintf("Received request for student course info, album_nr: %d", req.AlbumNr))

	// Check in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "student_info", req.AlbumNr)
		var cachedResponse pb.GetStudentCourseInfoResponse
		err := s.cache.Get(ctx, cacheKey, &cachedResponse)
		if err == nil {
			courseLog.LogInfo(fmt.Sprintf("Student course info for album_nr %d fetched from cache", req.AlbumNr))
			return &cachedResponse, nil
		}
	}

	query := `
    SELECT
        'Uniwersytet Michała Wielkiego' as university_name,
        CASE
            WHEN f.name LIKE '%Informatyki%' OR f.name LIKE '%Matematyki%' THEN 'Kolegium II'
            WHEN f.name LIKE '%Fizyki%' OR f.name LIKE '%Mechatroniki%' THEN 'Kolegium I'
            ELSE 'Kolegium Główne'
        END as college_name,
        f.name as faculty_name,
        COALESCE(b.address, 'Adres nie został określony') as faculty_address,
        c.name as course_name,
        c.year as year,
        c.semester as semester,
        CASE
            WHEN c.semester % 2 = 1 THEN 'Zimowy'
            ELSE 'Letni'
        END as semester_name,
        CASE
            WHEN c.course_mode = 'stacjonarne' THEN 'Stacjonarne'
            WHEN c.course_mode = 'niestacjonarne' THEN 'Niestacjonarne'
            ELSE c.course_mode
        END as study_mode,
        COALESCE(m.name, 'Nie przypisano') as module_name,
        COALESCE(
            CASE
                WHEN ts.degree IS NOT NULL AND ts.title IS NOT NULL THEN
                    CONCAT(ts.degree, ' ', u.name, ' ', u.surname, ', ', ts.title)
                WHEN ts.degree IS NOT NULL THEN
                    CONCAT(ts.degree, ' ', u.name, ' ', u.surname)
                ELSE
                    CONCAT(u.name, ' ', u.surname)
            END,
            'Nie przypisano'
        ) as supervisor_name
    FROM students s
    JOIN users us ON s.user_id = us.user_id
    JOIN student_classes sc ON s.album_nr = sc.album_nr
    JOIN classes cl ON sc.class_id = cl.class_id
    JOIN subjects sub ON cl.subject_id = sub.subject_id
    JOIN course_subjects cs ON sub.subject_id = cs.subject_id
    JOIN courses c ON cs.course_id = c.course_id
    JOIN faculties f ON c.faculty_id = f.faculty_id
    LEFT JOIN buildings b ON f.name LIKE CONCAT('%', REPLACE(b.name, 'Instytut ', ''), '%')
    LEFT JOIN modules m ON c.course_id = m.course_id
    LEFT JOIN course_instructors ci ON cl.class_id = ci.class_id
    LEFT JOIN teaching_staff ts ON ci.teaching_staff_id = ts.teaching_staff_id
    LEFT JOIN users u ON ts.user_id = u.user_id
    WHERE s.album_nr = $1
    ORDER BY cl.class_id ASC
    LIMIT 1`

	var (
		universityName string
		collegeName    string
		facultyName    string
		facultyAddress string
		courseName     string
		year           int32
		semester       int32
		semesterName   string
		studyMode      string
		moduleName     string
		supervisorName string
	)

	err := s.db.QueryRow(query, req.AlbumNr).Scan(
		&universityName,
		&collegeName,
		&facultyName,
		&facultyAddress,
		&courseName,
		&year,
		&semester,
		&semesterName,
		&studyMode,
		&moduleName,
		&supervisorName,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			courseLog.LogInfo(fmt.Sprintf("Student with album_nr %d not found", req.AlbumNr))
			return &pb.GetStudentCourseInfoResponse{
				CourseInfo: nil,
				Message:    "Student not found",
			}, nil
		}
		courseLog.LogError(fmt.Sprintf("Failed to fetch course info for album_nr %d", req.AlbumNr), err)
		return nil, fmt.Errorf("failed to fetch student course info: %w", err)
	}

	courseInfo := &pb.StudentCourseInfo{
		UniversityName: universityName,
		CollegeName:    collegeName,
		FacultyName:    facultyName,
		FacultyAddress: facultyAddress,
		CourseName:     courseName,
		Year:           year,
		Semester:       semester,
		SemesterName:   semesterName,
		StudyMode:      studyMode,
		ModuleName:     moduleName,
		SupervisorName: supervisorName,
	}

	response := &pb.GetStudentCourseInfoResponse{
		CourseInfo: courseInfo,
		Message:    "Course info retrieved successfully",
	}

	// Save in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "student_info", req.AlbumNr)
		s.cache.Set(ctx, cacheKey, response, s.config.StudentsTTL)
	}

	courseLog.LogInfo(fmt.Sprintf("Successfully returned course info for album_nr: %d", req.AlbumNr))
	return response, nil
}

func (s *CourseServer) GetAllCourses(ctx context.Context, req *emptypb.Empty) (*pb.GetAllCoursesResponse, error) {
	courseLog.LogInfo("Received request for all courses")

	// Check in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "all", "list")
		var cachedResponse pb.GetAllCoursesResponse
		err := s.cache.Get(ctx, cacheKey, &cachedResponse)
		if err == nil {
			courseLog.LogInfo("All courses fetched from cache")
			return &cachedResponse, nil
		}
	}

	query := `
	SELECT
		c.course_id,
		c.alias,
		c.name,
		c.year,
		c.semester,
		c.course_mode,
		c.degree_type,
		c.degree,
		f.name as faculty_name,
		c.faculty_id,
		COALESCE(student_count.count, 0) as enrolled_students_count
	FROM courses c
	JOIN faculties f ON c.faculty_id = f.faculty_id
	LEFT JOIN (
		SELECT
			cs.course_id,
			COUNT(DISTINCT s.album_nr) as count
		FROM course_subjects cs
		JOIN subjects sub ON cs.subject_id = sub.subject_id
		JOIN classes cl ON sub.subject_id = cl.subject_id
		JOIN student_classes sc ON cl.class_id = sc.class_id
		JOIN students s ON sc.album_nr = s.album_nr
		GROUP BY cs.course_id
	) student_count ON c.course_id = student_count.course_id
	ORDER BY f.name, c.name`

	rows, err := s.db.Query(query)
	if err != nil {
		courseLog.LogError("Failed to fetch all courses", err)
		return &pb.GetAllCoursesResponse{
			Courses: nil,
			Message: "Failed to fetch courses",
		}, err
	}
	defer rows.Close()

	var courses []*pb.CourseInfo
	for rows.Next() {
		var course pb.CourseInfo
		err := rows.Scan(
			&course.CourseId,
			&course.Alias,
			&course.Name,
			&course.Year,
			&course.Semester,
			&course.CourseMode,
			&course.DegreeType,
			&course.Degree,
			&course.FacultyName,
			&course.FacultyId,
			&course.EnrolledStudentsCount,
		)
		if err != nil {
			courseLog.LogError("Failed to scan course row", err)
			continue
		}
		courses = append(courses, &course)
	}

	if err = rows.Err(); err != nil {
		courseLog.LogError("Error occurred during rows iteration", err)
		return &pb.GetAllCoursesResponse{
			Courses: nil,
			Message: "Error occurred while processing courses",
		}, err
	}

	response := &pb.GetAllCoursesResponse{
		Courses: courses,
		Message: "Courses retrieved successfully",
	}

	// Save in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "all", "list")
		s.cache.Set(ctx, cacheKey, response, s.config.CoursesTTL)
	}

	courseLog.LogInfo(fmt.Sprintf("Successfully returned %d courses", len(courses)))
	return response, nil
}

func (s *CourseServer) GetCourseDetails(ctx context.Context, req *pb.GetCourseDetailsRequest) (*pb.GetCourseDetailsResponse, error) {
	courseLog.LogInfo(fmt.Sprintf("Received request for course details, ID: %d", req.CourseId))

	// Check in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "details", req.CourseId)
		var cachedResponse pb.GetCourseDetailsResponse
		err := s.cache.Get(ctx, cacheKey, &cachedResponse)
		if err == nil {
			courseLog.LogInfo(fmt.Sprintf("Course details for ID %d fetched from cache", req.CourseId))
			return &cachedResponse, nil
		}
	}

	query := `
	SELECT
		c.course_id,
		c.alias,
		c.name,
		c.year,
		c.semester,
		c.course_mode,
		c.degree_type,
		c.degree,
		f.name as faculty_name,
		c.faculty_id,
		m.alias as module_alias,
		m.name as module_name,
		u.name as supervisor_name,
		u.surname as supervisor_surname,
		ts.degree as supervisor_degree,
		ts.title as supervisor_title
	FROM courses c
	JOIN faculties f ON c.faculty_id = f.faculty_id
	LEFT JOIN modules m ON c.course_id = m.course_id
	LEFT JOIN (
		SELECT DISTINCT ON (cs.course_id)
			cs.course_id,
			ts.teaching_staff_id,
			ts.degree,
			ts.title,
			u.name,
			u.surname,
			COUNT(*) OVER (PARTITION BY cs.course_id, ts.teaching_staff_id) as class_count
		FROM course_subjects cs
		JOIN subjects sub ON cs.subject_id = sub.subject_id
		JOIN classes cl ON sub.subject_id = cl.subject_id
		JOIN course_instructors ci ON cl.class_id = ci.class_id
		JOIN teaching_staff ts ON ci.teaching_staff_id = ts.teaching_staff_id
		JOIN users u ON ts.user_id = u.user_id
		ORDER BY cs.course_id, class_count DESC, ts.teaching_staff_id
	) supervisor_info ON c.course_id = supervisor_info.course_id
	LEFT JOIN teaching_staff ts ON supervisor_info.teaching_staff_id = ts.teaching_staff_id
	LEFT JOIN users u ON ts.user_id = u.user_id
	WHERE c.course_id = $1`

	var course pb.CourseDetails
	var moduleAlias, moduleName, supervisorName, supervisorSurname, supervisorDegree, supervisorTitle sql.NullString

	err := s.db.QueryRow(query, req.CourseId).Scan(
		&course.CourseId,
		&course.Alias,
		&course.Name,
		&course.Year,
		&course.Semester,
		&course.CourseMode,
		&course.DegreeType,
		&course.Degree,
		&course.FacultyName,
		&course.FacultyId,
		&moduleAlias,
		&moduleName,
		&supervisorName,
		&supervisorSurname,
		&supervisorDegree,
		&supervisorTitle,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			courseLog.LogInfo(fmt.Sprintf("Course with ID %d not found", req.CourseId))
			return &pb.GetCourseDetailsResponse{
				Course:  nil,
				Message: "Course not found",
			}, nil
		}
		courseLog.LogError(fmt.Sprintf("Failed to fetch course details for ID %d", req.CourseId), err)
		return nil, fmt.Errorf("failed to fetch course details: %w", err)
	}

	if moduleAlias.Valid {
		course.ModuleAlias = &moduleAlias.String
	}
	if moduleName.Valid {
		course.ModuleName = &moduleName.String
	}
	if supervisorName.Valid {
		course.SupervisorName = &supervisorName.String
	}
	if supervisorSurname.Valid {
		course.SupervisorSurname = &supervisorSurname.String
	}
	if supervisorDegree.Valid {
		course.SupervisorDegree = &supervisorDegree.String
	}
	if supervisorTitle.Valid {
		course.SupervisorTitle = &supervisorTitle.String
	}

	response := &pb.GetCourseDetailsResponse{
		Course:  &course,
		Message: "Course details retrieved successfully",
	}

	// Save in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "details", req.CourseId)
		s.cache.Set(ctx, cacheKey, response, s.config.CoursesTTL)
	}

	courseLog.LogInfo(fmt.Sprintf("Successfully returned course details for ID: %d", req.CourseId))
	return response, nil
}

func (s *CourseServer) GetCourseSubjects(ctx context.Context, req *pb.GetCourseSubjectsRequest) (*pb.GetCourseSubjectsResponse, error) {
	courseLog.LogInfo(fmt.Sprintf("Received request for course subjects, course ID: %d", req.CourseId))

	// Check in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "subjects", req.CourseId)
		var cachedResponse pb.GetCourseSubjectsResponse
		err := s.cache.Get(ctx, cacheKey, &cachedResponse)
		if err == nil {
			courseLog.LogInfo(fmt.Sprintf("Course subjects for ID %d fetched from cache", req.CourseId))
			return &cachedResponse, nil
		}
	}

	var exists bool
	checkQuery := "SELECT EXISTS(SELECT 1 FROM courses WHERE course_id = $1)"
	err := s.db.QueryRow(checkQuery, req.CourseId).Scan(&exists)
	if err != nil {
		courseLog.LogError(fmt.Sprintf("Failed to check if course exists for ID %d", req.CourseId), err)
		return nil, fmt.Errorf("failed to verify course existence: %w", err)
	}

	if !exists {
		courseLog.LogInfo(fmt.Sprintf("Course with ID %d not found", req.CourseId))
		return &pb.GetCourseSubjectsResponse{
			Subjects: nil,
			Message:  "Course not found",
		}, nil
	}

	query := `
	SELECT
		s.subject_id,
		s.alias,
		s.name,
		s.ects,
		COALESCE(s.description, '') as description,
		COALESCE(s.syllabus, '') as syllabus
	FROM course_subjects cs
	JOIN subjects s ON cs.subject_id = s.subject_id
	WHERE cs.course_id = $1
	ORDER BY s.name`

	rows, err := s.db.Query(query, req.CourseId)
	if err != nil {
		courseLog.LogError(fmt.Sprintf("Failed to fetch subjects for course ID %d", req.CourseId), err)
		return &pb.GetCourseSubjectsResponse{
			Subjects: nil,
			Message:  "Failed to fetch course subjects",
		}, err
	}
	defer rows.Close()

	var subjects []*pb.CourseSubject
	for rows.Next() {
		var subject pb.CourseSubject
		err := rows.Scan(
			&subject.SubjectId,
			&subject.Alias,
			&subject.Name,
			&subject.Ects,
			&subject.Description,
			&subject.Syllabus,
		)
		if err != nil {
			courseLog.LogError("Failed to scan subject row", err)
			continue
		}
		subjects = append(subjects, &subject)
	}

	if err = rows.Err(); err != nil {
		courseLog.LogError("Error occurred during subjects rows iteration", err)
		return &pb.GetCourseSubjectsResponse{
			Subjects: nil,
			Message:  "Error occurred while processing subjects",
		}, err
	}

	response := &pb.GetCourseSubjectsResponse{
		Subjects: subjects,
		Message:  "Course subjects retrieved successfully",
	}

	// Save in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "subjects", req.CourseId)
		s.cache.Set(ctx, cacheKey, response, s.config.StudentsTTL)
	}

	courseLog.LogInfo(fmt.Sprintf("Successfully returned %d subjects for course ID: %d", len(subjects), req.CourseId))
	return response, nil
}

func (s *CourseServer) SearchCourses(ctx context.Context, req *pb.SearchCoursesRequest) (*pb.SearchCoursesResponse, error) {
	courseLog.LogInfo("Received request for course search")

	// Check in cache
	if s.cache != nil {
		searchParams := fmt.Sprintf("name:%v_year:%v_mode:%v_type:%v_faculty:%v",
			req.Name, req.Year, req.CourseMode, req.DegreeType, req.FacultyId)
		cacheKey := cache.GenerateKey("courses", "search", searchParams)
		var cachedResponse pb.SearchCoursesResponse
		err := s.cache.Get(ctx, cacheKey, &cachedResponse)
		if err == nil {
			courseLog.LogInfo("Course search results fetched from cache")
			return &cachedResponse, nil
		}
	}

	baseQuery := `
	SELECT
		c.course_id,
		c.alias,
		c.name,
		c.year,
		c.semester,
		c.course_mode,
		c.degree_type,
		c.degree,
		f.name as faculty_name,
		c.faculty_id,
		COALESCE(student_count.count, 0) as enrolled_students_count
	FROM courses c
	JOIN faculties f ON c.faculty_id = f.faculty_id
	LEFT JOIN (
		SELECT
			cs.course_id,
			COUNT(DISTINCT s.album_nr) as count
		FROM course_subjects cs
		JOIN subjects sub ON cs.subject_id = sub.subject_id
		JOIN classes cl ON sub.subject_id = cl.subject_id
		JOIN student_classes sc ON cl.class_id = sc.class_id
		JOIN students s ON sc.album_nr = s.album_nr
		GROUP BY cs.course_id
	) student_count ON c.course_id = student_count.course_id`

	var whereConditions []string
	var args []interface{}
	argIndex := 1

	if req.Name != nil && *req.Name != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("c.name ILIKE $%d", argIndex))
		args = append(args, "%"+*req.Name+"%")
		argIndex++
	}

	if req.Year != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("c.year = $%d", argIndex))
		args = append(args, *req.Year)
		argIndex++
	}

	if req.CourseMode != nil && *req.CourseMode != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("c.course_mode = $%d", argIndex))
		args = append(args, *req.CourseMode)
		argIndex++
	}

	if req.DegreeType != nil && *req.DegreeType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("c.degree_type = $%d", argIndex))
		args = append(args, *req.DegreeType)
		argIndex++
	}

	if req.FacultyId != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("c.faculty_id = $%d", argIndex))
		args = append(args, *req.FacultyId)
		argIndex++
	}

	finalQuery := baseQuery
	if len(whereConditions) > 0 {
		finalQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}
	finalQuery += " ORDER BY f.name, c.name"

	courseLog.LogInfo(fmt.Sprintf("Executing search query with %d filters", len(whereConditions)))

	rows, err := s.db.Query(finalQuery, args...)
	if err != nil {
		courseLog.LogError("Failed to execute course search", err)
		return &pb.SearchCoursesResponse{
			Courses: nil,
			Message: "Failed to search courses",
		}, err
	}
	defer rows.Close()

	var courses []*pb.CourseInfo
	for rows.Next() {
		var course pb.CourseInfo
		err := rows.Scan(
			&course.CourseId,
			&course.Alias,
			&course.Name,
			&course.Year,
			&course.Semester,
			&course.CourseMode,
			&course.DegreeType,
			&course.Degree,
			&course.FacultyName,
			&course.FacultyId,
			&course.EnrolledStudentsCount,
		)
		if err != nil {
			courseLog.LogError("Failed to scan course search row", err)
			continue
		}
		courses = append(courses, &course)
	}

	if err = rows.Err(); err != nil {
		courseLog.LogError("Error occurred during course search rows iteration", err)
		return &pb.SearchCoursesResponse{
			Courses: nil,
			Message: "Error occurred while processing search results",
		}, err
	}

	response := &pb.SearchCoursesResponse{
		Courses: courses,
		Message: "Course search completed successfully",
	}

	// Save in cache
	if s.cache != nil {
		searchParams := fmt.Sprintf("name:%v_year:%v_mode:%v_type:%v_faculty:%v",
			req.Name, req.Year, req.CourseMode, req.DegreeType, req.FacultyId)
		cacheKey := cache.GenerateKey("courses", "search", searchParams)
		s.cache.Set(ctx, cacheKey, response, 15*time.Minute)
	}

	courseLog.LogInfo(fmt.Sprintf("Successfully returned %d courses from search", len(courses)))
	if courses == nil {
		return &pb.SearchCoursesResponse{
			Courses: courses,
			Message: "Course search failed",
		}, nil
	}
	return response, nil
}

func (s *CourseServer) GetCourseStats(ctx context.Context, req *emptypb.Empty) (*pb.GetCourseStatsResponse, error) {
	courseLog.LogInfo("Received request for course statistics")

	// Check in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "stats", "all")
		var cachedResponse pb.GetCourseStatsResponse
		err := s.cache.Get(ctx, cacheKey, &cachedResponse)
		if err == nil {
			courseLog.LogInfo("Course stats fetched from cache")
			return &cachedResponse, nil
		}
	}

	query := `
	SELECT
		f.name as faculty_name,
		COUNT(*) as total_courses,
		COUNT(CASE WHEN c.course_mode = 'stacjonarne' THEN 1 END) as full_time_courses,
		COUNT(CASE WHEN c.course_mode = 'niestacjonarne' THEN 1 END) as part_time_courses,
		COUNT(CASE WHEN c.degree_type = 'inżynierskie' THEN 1 END) as engineering_courses,
		COUNT(CASE WHEN c.degree_type = 'licencjackie' THEN 1 END) as bachelor_courses,
		COUNT(CASE WHEN c.degree_type = 'magisterskie' THEN 1 END) as master_courses
	FROM courses c
	JOIN faculties f ON c.faculty_id = f.faculty_id
	GROUP BY f.faculty_id, f.name
	ORDER BY f.name`

	rows, err := s.db.Query(query)
	if err != nil {
		courseLog.LogError("Failed to fetch course statistics", err)
		return &pb.GetCourseStatsResponse{
			Stats:   nil,
			Message: "Failed to fetch course statistics",
		}, err
	}
	defer rows.Close()

	var stats []*pb.CourseStats
	for rows.Next() {
		var stat pb.CourseStats
		err := rows.Scan(
			&stat.FacultyName,
			&stat.TotalCourses,
			&stat.FullTimeCourses,
			&stat.PartTimeCourses,
			&stat.EngineeringCourses,
			&stat.BachelorCourses,
			&stat.MasterCourses,
		)
		if err != nil {
			courseLog.LogError("Failed to scan course stats row", err)
			continue
		}
		stats = append(stats, &stat)
	}

	if err = rows.Err(); err != nil {
		courseLog.LogError("Error occurred during course stats rows iteration", err)
		return &pb.GetCourseStatsResponse{
			Stats:   nil,
			Message: "Error occurred while processing statistics",
		}, err
	}

	response := &pb.GetCourseStatsResponse{
		Stats:   stats,
		Message: "Course statistics retrieved successfully",
	}

	// Save in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "stats", "all")
		s.cache.Set(ctx, cacheKey, response, s.config.CoursesTTL)
	}

	courseLog.LogInfo(fmt.Sprintf("Successfully returned statistics for %d faculties", len(stats)))
	return response, nil
}

func (s *CourseServer) GetFaculties(ctx context.Context, req *emptypb.Empty) (*pb.GetFacultiesResponse, error) {
	courseLog.LogInfo("Received request for all faculties")

	// Check in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "faculties", "all")
		var cachedResponse pb.GetFacultiesResponse
		err := s.cache.Get(ctx, cacheKey, &cachedResponse)
		if err == nil {
			courseLog.LogInfo("Faculties fetched from cache")
			return &cachedResponse, nil
		}
	}

	query := "SELECT faculty_id, name FROM faculties ORDER BY name"
	rows, err := s.db.Query(query)
	if err != nil {
		courseLog.LogError("Failed to fetch faculties", err)
		return &pb.GetFacultiesResponse{
			Faculties: nil,
			Message:   "Failed to fetch faculties",
		}, err
	}
	defer rows.Close()

	var faculties []*pb.Faculty
	for rows.Next() {
		var faculty pb.Faculty
		err := rows.Scan(&faculty.FacultyId, &faculty.Name)
		if err != nil {
			courseLog.LogError("Failed to scan faculty row", err)
			continue
		}
		faculties = append(faculties, &faculty)
	}

	response := &pb.GetFacultiesResponse{
		Faculties: faculties,
		Message:   "Faculties retrieved successfully",
	}

	// Save in cache
	if s.cache != nil {
		cacheKey := cache.GenerateKey("courses", "faculties", "all")
		s.cache.Set(ctx, cacheKey, response, 2*time.Hour)
	}

	courseLog.LogInfo(fmt.Sprintf("Successfully returned %d faculties", len(faculties)))
	return response, nil
}
