package search

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/search"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var searchLog = logger.NewLogger("SearchService")

type SearchServer struct {
	pb.UnimplementedSearchServiceServer
	db *sql.DB
}

func NewSearchServer(db *sql.DB) *SearchServer {
	return &SearchServer{
		db: db,
	}
}

func (s *SearchServer) GlobalSearch(ctx context.Context, req *pb.GlobalSearchRequest) (*pb.GlobalSearchResponse, error) {
	searchLog.LogInfo(fmt.Sprintf("GlobalSearch request received: query='%s'", req.Query))

	if req.Query == "" {
		return &pb.GlobalSearchResponse{
			Message: "Query cannot be empty",
		}, status.Error(codes.InvalidArgument, "empty query")
	}

	limit := req.LimitPerType
	if limit == 0 {
		limit = 5
	}

	query := "%" + req.Query + "%"
	
	entityTypes := req.EntityTypes
	searchAll := len(entityTypes) == 0

	response := &pb.GlobalSearchResponse{}
	var wg sync.WaitGroup
	var mu sync.Mutex

	// Search users
	if searchAll || contains(entityTypes, "users") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			users := s.searchUsers(ctx, query, limit)
			mu.Lock()
			response.Users = users
			mu.Unlock()
		}()
	}

	// Search subjects
	if searchAll || contains(entityTypes, "subjects") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			subjects := s.searchSubjects(ctx, query, limit)
			mu.Lock()
			response.Subjects = subjects
			mu.Unlock()
		}()
	}

	// Search courses
	if searchAll || contains(entityTypes, "courses") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			courses := s.searchCourses(ctx, query, limit)
			mu.Lock()
			response.Courses = courses
			mu.Unlock()
		}()
	}

	// Search buildings
	if searchAll || contains(entityTypes, "buildings") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			buildings := s.searchBuildings(ctx, query, limit)
			mu.Lock()
			response.Buildings = buildings
			mu.Unlock()
		}()
	}

	// Search classes
	if searchAll || contains(entityTypes, "classes") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			classes := s.searchClasses(ctx, query, limit)
			mu.Lock()
			response.Classes = classes
			mu.Unlock()
		}()
	}

	wg.Wait()

	totalResults := len(response.Users) + len(response.Subjects) + 
		len(response.Courses) + len(response.Buildings) + len(response.Classes)
	
	response.TotalResults = int32(totalResults)
	response.Message = fmt.Sprintf("Found %d results", totalResults)

	searchLog.LogInfo(fmt.Sprintf("GlobalSearch completed: %d total results", totalResults))


	for i, subj := range response.Subjects {
        searchLog.LogInfo(fmt.Sprintf("Response subject %d: ID=%d Desc='%s'", i, subj.SubjectId, subj.Description))
    }
	return response, nil
}

func (s *SearchServer) searchUsers(ctx context.Context, query string, limit int32) []*pb.UserSearchResult {
	sqlQuery := `
		SELECT 
			u.user_id,
			u.name,
			u.surname,
			u.email,
			CASE 
				WHEN s.user_id IS NOT NULL THEN 'student'
				WHEN ts.user_id IS NOT NULL THEN 'teacher'
				WHEN a.user_id IS NOT NULL THEN 'admin'
				ELSE 'unknown'
			END as role,
			CASE 
				WHEN u.name ILIKE $1 || '%' THEN 100
				WHEN u.surname ILIKE $1 || '%' THEN 100
				WHEN u.name ILIKE $2 THEN 50
				WHEN u.surname ILIKE $2 THEN 50
				ELSE 10
			END as score
		FROM users u
		LEFT JOIN students s ON u.user_id = s.user_id
		LEFT JOIN teaching_staff ts ON u.user_id = ts.user_id
		LEFT JOIN administrative_staff a ON u.user_id = a.user_id
		WHERE 
			u.name ILIKE $2 
			OR u.surname ILIKE $2 
			OR u.email ILIKE $2
		ORDER BY score DESC, u.surname, u.name
		LIMIT $3
	`

	rows, err := s.db.QueryContext(ctx, sqlQuery, query[1:len(query)-1], query, limit)
	if err != nil {
		searchLog.LogError("Failed to search users", err)
		return []*pb.UserSearchResult{}
	}
	defer rows.Close()

	var results []*pb.UserSearchResult
	for rows.Next() {
		var r pb.UserSearchResult
		var score int
		if err := rows.Scan(&r.UserId, &r.Name, &r.Surname, &r.Email, &r.Role, &score); err != nil {
			searchLog.LogError("Failed to scan user row", err)
			continue
		}
		results = append(results, &r)
	}



	return results
}

func (s *SearchServer) searchSubjects(ctx context.Context, query string, limit int32) []*pb.SubjectSearchResult {
	sqlQuery := `
		SELECT 
			subject_id,
			name,
			alias,
			ects,
			description,
			LENGTH(description) as desc_len,  -- DODAJ TO
			CASE 
				WHEN name ILIKE $1 || '%' THEN 100
				WHEN alias ILIKE $1 || '%' THEN 90
				WHEN name ILIKE $2 THEN 50
				WHEN alias ILIKE $2 THEN 40
				ELSE 10
			END as score
		FROM subjects
		WHERE 
			name ILIKE $2 
			OR alias ILIKE $2
			OR description ILIKE $2
		ORDER BY score DESC, name
		LIMIT $3
	`
	rows, err := s.db.QueryContext(ctx, sqlQuery, query[1:len(query)-1], query, limit)
	if err != nil {
		searchLog.LogError("Failed to search subjects", err)
		return []*pb.SubjectSearchResult{}
	}
	defer rows.Close()
	
	var results []*pb.SubjectSearchResult
	for rows.Next() {
		var r pb.SubjectSearchResult
		var score int
		var descLen int  
		
		if err := rows.Scan(&r.SubjectId, &r.Name, &r.Alias, &r.Ects, &r.Description, &descLen, &score); err != nil {
			searchLog.LogError("Failed to scan subject row", err)
			continue
		}
		
		searchLog.LogInfo(fmt.Sprintf("SCANNED: ID=%d Name='%s' Desc='%s' DescLen=%d", 
			r.SubjectId, r.Name, r.Description, descLen))
		
		results = append(results, &r)
	}
	
	searchLog.LogInfo(fmt.Sprintf("Returning %d subjects", len(results)))

	return results
}

func (s *SearchServer) searchCourses(ctx context.Context, query string, limit int32) []*pb.CourseSearchResult {
	sqlQuery := `
		SELECT 
			c.course_id,
			c.name,
			c.alias,
			f.name as faculty_name,
			CASE 
				WHEN c.name ILIKE $1 || '%' THEN 100
				WHEN c.alias ILIKE $1 || '%' THEN 90
				WHEN c.name ILIKE $2 THEN 50
				WHEN c.alias ILIKE $2 THEN 40
				ELSE 10
			END as score
		FROM courses c
		JOIN faculties f ON c.faculty_id = f.faculty_id
		WHERE 
			c.name ILIKE $2 
			OR c.alias ILIKE $2
		ORDER BY score DESC, c.name
		LIMIT $3
	`

	rows, err := s.db.QueryContext(ctx, sqlQuery, query[1:len(query)-1], query, limit)
	if err != nil {
		searchLog.LogError("Failed to search courses", err)
		return []*pb.CourseSearchResult{}
	}
	defer rows.Close()

	var results []*pb.CourseSearchResult
	for rows.Next() {
		var r pb.CourseSearchResult
		var score int
		if err := rows.Scan(&r.CourseId, &r.Name, &r.Alias, &r.FacultyName, &score); err != nil {
			searchLog.LogError("Failed to scan course row", err)
			continue
		}
		results = append(results, &r)
	}

	return results
}

func (s *SearchServer) searchBuildings(ctx context.Context, query string, limit int32) []*pb.BuildingSearchResult {
	sqlQuery := `
		SELECT 
			building_id,
			name,
			address,
			CASE 
				WHEN name ILIKE $1 || '%' THEN 100
				WHEN name ILIKE $2 THEN 50
				ELSE 10
			END as score
		FROM buildings
		WHERE 
			name ILIKE $2 
			OR address ILIKE $2
		ORDER BY score DESC, name
		LIMIT $3
	`

	rows, err := s.db.QueryContext(ctx, sqlQuery, query[1:len(query)-1], query, limit)
	if err != nil {
		searchLog.LogError("Failed to search buildings", err)
		return []*pb.BuildingSearchResult{}
	}
	defer rows.Close()

	var results []*pb.BuildingSearchResult
	for rows.Next() {
		var r pb.BuildingSearchResult
		var score int
		if err := rows.Scan(&r.BuildingId, &r.Name, &r.Address, &score); err != nil {
			searchLog.LogError("Failed to scan building row", err)
			continue
		}
		results = append(results, &r)
	}

	return results
}

func (s *SearchServer) searchClasses(ctx context.Context, query string, limit int32) []*pb.ClassSearchResult {
	sqlQuery := `
		SELECT 
			c.class_id,
			s.name as subject_name,
			c.class_type,
			c.group_nr,
			b.name as building_name
		FROM classes c
		JOIN subjects s ON c.subject_id = s.subject_id
		JOIN buildings b ON c.building_id = b.building_id
		WHERE 
			s.name ILIKE $1
			OR c.class_type ILIKE $1
		LIMIT $2
	`

	rows, err := s.db.QueryContext(ctx, sqlQuery, query, limit)
	if err != nil {
		searchLog.LogError("Failed to search classes", err)
		return []*pb.ClassSearchResult{}
	}
	defer rows.Close()

	var results []*pb.ClassSearchResult
	for rows.Next() {
		var r pb.ClassSearchResult
		if err := rows.Scan(&r.ClassId, &r.SubjectName, &r.ClassType, &r.GroupNr, &r.BuildingName); err != nil {
			searchLog.LogError("Failed to scan class row", err)
			continue
		}
		results = append(results, &r)
	}

	return results
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
