package course

import (
	"context"
	"database/sql"
	"fmt"

	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/course"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/protobuf/types/known/emptypb"
)

var courseLog = logger.NewLogger("course-service")

type CourseServer struct {
	pb.UnimplementedCourseServiceServer
	db *sql.DB
}

func NewCourseServer(db *sql.DB) *CourseServer {
	return &CourseServer{db: db}
}

func (s *CourseServer) GetStudentCourseInfo(ctx context.Context, req *pb.GetStudentCourseInfoRequest) (*pb.GetStudentCourseInfoResponse, error) {
	courseLog.LogInfo(fmt.Sprintf("Received request for student course info, album_nr: %d", req.AlbumNr))

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
		LEFT JOIN teaching_staff ts ON f.faculty_id = ts.faculty_id
		LEFT JOIN users u ON ts.user_id = u.user_id
		WHERE s.album_nr = $1
		ORDER BY ts.teaching_staff_id ASC
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

	courseLog.LogInfo(fmt.Sprintf("Successfully returned course info for album_nr: %d", req.AlbumNr))
	return &pb.GetStudentCourseInfoResponse{
		CourseInfo: courseInfo,
		Message:    "Course info retrieved successfully",
	}, nil
}

func (s *CourseServer) GetAllCourses(ctx context.Context, req *emptypb.Empty) (*pb.GetAllCoursesResponse, error) {
	courseLog.LogInfo("Received request for all courses")

	// TODO: Implementuj pobieranie wszystkich kierunków z bazy
	return &pb.GetAllCoursesResponse{
		Courses: []*pb.CourseInfo{},
		Message: "GetAllCourses not implemented yet",
	}, nil
}

func (s *CourseServer) GetCourseDetails(ctx context.Context, req *pb.GetCourseDetailsRequest) (*pb.GetCourseDetailsResponse, error) {
	courseLog.LogInfo(fmt.Sprintf("Received request for course details, ID: %d", req.CourseId))

	// TODO: Implementuj pobieranie szczegółów kierunku
	return &pb.GetCourseDetailsResponse{
		Course:  nil,
		Message: "GetCourseDetails not implemented yet",
	}, nil
}

func (s *CourseServer) GetCourseSubjects(ctx context.Context, req *pb.GetCourseSubjectsRequest) (*pb.GetCourseSubjectsResponse, error) {
	courseLog.LogInfo(fmt.Sprintf("Received request for course subjects, course ID: %d", req.CourseId))

	// TODO: Implementuj pobieranie przedmiotów kierunku
	return &pb.GetCourseSubjectsResponse{
		Subjects: []*pb.CourseSubject{},
		Message:  "GetCourseSubjects not implemented yet",
	}, nil
}

func (s *CourseServer) SearchCourses(ctx context.Context, req *pb.SearchCoursesRequest) (*pb.SearchCoursesResponse, error) {
	courseLog.LogInfo("Received request for course search")

	// TODO: Implementuj wyszukiwanie kierunków
	return &pb.SearchCoursesResponse{
		Courses: []*pb.CourseInfo{},
		Message: "SearchCourses not implemented yet",
	}, nil
}

func (s *CourseServer) GetCourseStats(ctx context.Context, req *emptypb.Empty) (*pb.GetCourseStatsResponse, error) {
	courseLog.LogInfo("Received request for course statistics")

	// TODO: Implementuj pobieranie statystyk kierunków
	return &pb.GetCourseStatsResponse{
		Stats:   []*pb.CourseStats{},
		Message: "GetCourseStats not implemented yet",
	}, nil
}

func (s *CourseServer) GetFaculties(ctx context.Context, req *emptypb.Empty) (*pb.GetFacultiesResponse, error) {
	courseLog.LogInfo("Received request for all faculties")

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

	courseLog.LogInfo(fmt.Sprintf("Successfully returned %d faculties", len(faculties)))
	return &pb.GetFacultiesResponse{
		Faculties: faculties,
		Message:   "Faculties retrieved successfully",
	}, nil
}
