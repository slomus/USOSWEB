package applications

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/applications"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc/metadata"
)

var appLog = logger.NewLogger("applications-service")

type ApplicationsServer struct {
	pb.UnimplementedApplicationsServiceServer
	db *sql.DB
}

func NewApplicationsServer(db *sql.DB) *ApplicationsServer {
	return &ApplicationsServer{db: db}
}

func (s *ApplicationsServer) GetApplications(ctx context.Context, req *pb.GetApplicationsRequest) (*pb.GetApplicationsResponse, error) {
	// Resolve caller album number if student
	userAlbum, _ := s.resolveCallerAlbum(ctx)

	// If applicationId provided, return single
	if req.ApplicationId != nil {
		q := `SELECT application_id, category_id, album_nr, title, content, status,
                     to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
                     to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS')
              FROM applications WHERE application_id = $1`
		var item pb.ApplicationItem
		err := s.db.QueryRowContext(ctx, q, *req.ApplicationId).Scan(
			&item.ApplicationId, &item.CategoryId, &item.AlbumNr, &item.Title, &item.Content, &item.Status, &item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			if err == sql.ErrNoRows {
				return &pb.GetApplicationsResponse{Items: nil, Total: 0, Page: 1, PageSize: 0}, nil
			}
			return nil, fmt.Errorf("failed to fetch application: %w", err)
		}
		// authorization: if student, ensure own
		if userAlbum != 0 && item.AlbumNr != userAlbum {
			return &pb.GetApplicationsResponse{Items: nil, Total: 0, Page: 1, PageSize: 0}, nil
		}
		return &pb.GetApplicationsResponse{Items: []*pb.ApplicationItem{&item}, Total: 1, Page: 1, PageSize: 1}, nil
	}

	// List with filters
	filters := []string{"1=1"}
	args := []interface{}{}
	idx := 1

	if userAlbum != 0 {
		filters = append(filters, fmt.Sprintf("album_nr = $%d", idx))
		args = append(args, userAlbum)
		idx++
	} else if req.AlbumNr != nil {
		filters = append(filters, fmt.Sprintf("album_nr = $%d", idx))
		args = append(args, *req.AlbumNr)
		idx++
	}
	if req.CategoryId != nil {
		filters = append(filters, fmt.Sprintf("category_id = $%d", idx))
		args = append(args, *req.CategoryId)
		idx++
	}
	if req.Status != nil && strings.TrimSpace(*req.Status) != "" {
		filters = append(filters, fmt.Sprintf("status = $%d", idx))
		args = append(args, *req.Status)
		idx++
	}

	page := int32(1)
	size := int32(20)
	if req.Page != nil && *req.Page > 0 {
		page = *req.Page
	}
	if req.PageSize != nil && *req.PageSize > 0 && *req.PageSize <= 100 {
		size = *req.PageSize
	}
	offset := (page - 1) * size

	base := `SELECT application_id, category_id, album_nr, title, content, status,
                     to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
                     to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS')
              FROM applications WHERE ` + strings.Join(filters, " AND ") + " ORDER BY created_at DESC LIMIT $%d OFFSET $%d"
	q := fmt.Sprintf(base, idx, idx+1)
	args = append(args, size, offset)

	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list applications: %w", err)
	}
	defer rows.Close()

	var items []*pb.ApplicationItem
	for rows.Next() {
		var it pb.ApplicationItem
		if err := rows.Scan(&it.ApplicationId, &it.CategoryId, &it.AlbumNr, &it.Title, &it.Content, &it.Status, &it.CreatedAt, &it.UpdatedAt); err != nil {
			continue
		}
		items = append(items, &it)
	}

	// total
	ctQ := `SELECT COUNT(*) FROM applications WHERE ` + strings.Join(filters, " AND ")
	var total int32
	_ = s.db.QueryRowContext(ctx, ctQ, args[:len(args)-2]...).Scan(&total)

	return &pb.GetApplicationsResponse{Items: items, Total: total, Page: page, PageSize: size}, nil
}

func (s *ApplicationsServer) CreateOrUpdateApplication(ctx context.Context, req *pb.CreateOrUpdateApplicationRequest) (*pb.CreateOrUpdateApplicationResponse, error) {
	// Resolve caller album number if student
	callerAlbum, _ := s.resolveCallerAlbum(ctx)
	album := req.AlbumNr
	if callerAlbum != 0 { // student
		v := callerAlbum
		album = &v
	}
	// For UPDATE we don't require albumNr for staff/admin; only for CREATE
	if (req.ApplicationId == nil || *req.ApplicationId == 0) && (album == nil || *album == 0) {
		return nil, fmt.Errorf("album_nr required")
	}
	if strings.TrimSpace(req.Title) == "" || len(req.Title) < 3 {
		return nil, fmt.Errorf("title too short")
	}
	if strings.TrimSpace(req.Content) == "" || len(req.Content) < 10 {
		return nil, fmt.Errorf("content too short")
	}

	// verify category exists and active
	var exists bool
	if err := s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM application_categories WHERE category_id=$1 AND active=true)", req.CategoryId).Scan(&exists); err != nil || !exists {
		return nil, fmt.Errorf("invalid category_id")
	}

	// update or insert
	if req.ApplicationId != nil && *req.ApplicationId > 0 {
		// ownership for student
		if callerAlbum != 0 {
			var owner int32
			err := s.db.QueryRowContext(ctx, "SELECT album_nr FROM applications WHERE application_id=$1", *req.ApplicationId).Scan(&owner)
			if err != nil {
				return nil, fmt.Errorf("application not found")
			}
			if owner != callerAlbum {
				return nil, fmt.Errorf("forbidden")
			}
		}
		// status optional (for staff/admin only) - jeśli student -> ignorujemy status
		if callerAlbum != 0 {
			req.Status = nil
		}

		_, err := s.db.ExecContext(ctx, `UPDATE applications SET category_id=$1, title=$2, content=$3,
            status=COALESCE($4, status), updated_at=NOW() WHERE application_id=$5`,
			req.CategoryId, req.Title, req.Content, req.Status, *req.ApplicationId)
		if err != nil {
			return nil, fmt.Errorf("update failed: %w", err)
		}
		return &pb.CreateOrUpdateApplicationResponse{ApplicationId: *req.ApplicationId, Message: "Application updated"}, nil
	}

	// insert
	var newID int32
	err := s.db.QueryRowContext(ctx, `INSERT INTO applications (category_id, album_nr, title, content, status)
        VALUES ($1,$2,$3,$4,'submitted') RETURNING application_id`, req.CategoryId, *album, req.Title, req.Content).Scan(&newID)
	if err != nil {
		return nil, fmt.Errorf("create failed: %w", err)
	}
	return &pb.CreateOrUpdateApplicationResponse{ApplicationId: newID, Message: "Application created"}, nil
}

func (s *ApplicationsServer) resolveCallerAlbum(ctx context.Context) (int32, bool) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return 0, false
	}
	vals := md.Get("user_id")
	if len(vals) == 0 {
		return 0, false
	}
	var userID int64
	_, _ = fmt.Sscanf(vals[0], "%d", &userID)
	if userID == 0 {
		return 0, false
	}
	var album int32
	if err := s.db.QueryRow("SELECT album_nr FROM students WHERE user_id=$1", userID).Scan(&album); err != nil {
		return 0, false
	}
	return album, true
}

// Categories
func (s *ApplicationsServer) GetApplicationCategories(ctx context.Context, _ *pb.GetApplicationCategorsRequest) (*pb.GetApplicationCategoriesResponse, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT category_id, name, description, application_start_date, application_end_date, active FROM application_categories WHERE active=true ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("failed to list categories: %w", err)
	}
	defer rows.Close()
	var items []*pb.CategoryItem
	for rows.Next() {
		var it pb.CategoryItem
		var desc sql.NullString
		var start, end string
		if err := rows.Scan(&it.CategoryId, &it.Name, &desc, &start, &end, &it.Active); err != nil {
			continue
		}
		if desc.Valid {
			v := desc.String
			it.Description = &v
		}
		it.ApplicationStartDate = start
		it.ApplicationEndDate = end
		items = append(items, &it)
	}
	return &pb.GetApplicationCategoriesResponse{Items: items}, nil
}

func (s *ApplicationsServer) CreateOrUpdateCategory(ctx context.Context, req *pb.CreateOrUpdateCategoryRequest) (*pb.CreateOrUpdateCategoryResponse, error) {
	// Only non-students can create/update categories
	if album, ok := s.resolveCallerAlbum(ctx); ok && album != 0 {
		return nil, fmt.Errorf("forbidden")
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, fmt.Errorf("name required")
	}
	// dates required on create
	if (req.CategoryId == nil || *req.CategoryId == 0) && (req.ApplicationStartDate == nil || strings.TrimSpace(*req.ApplicationStartDate) == "") {
		return nil, fmt.Errorf("application_start_date required")
	}
	if (req.CategoryId == nil || *req.CategoryId == 0) && (req.ApplicationEndDate == nil || strings.TrimSpace(*req.ApplicationEndDate) == "") {
		return nil, fmt.Errorf("application_end_date required")
	}

	active := true
	if req.Active != nil {
		active = *req.Active
	}

	if req.CategoryId != nil && *req.CategoryId > 0 {
		_, err := s.db.ExecContext(ctx, `UPDATE application_categories SET name=$1, description=$2, application_start_date=COALESCE($3, application_start_date), application_end_date=COALESCE($4, application_end_date), active=$5 WHERE category_id=$6`,
			name, req.Description, req.ApplicationStartDate, req.ApplicationEndDate, active, *req.CategoryId)
		if err != nil {
			return nil, fmt.Errorf("update failed: %w", err)
		}
		return &pb.CreateOrUpdateCategoryResponse{CategoryId: *req.CategoryId, Message: "Category updated"}, nil
	}
	var newID int32
	err := s.db.QueryRowContext(ctx, `INSERT INTO application_categories (name, description, application_start_date, application_end_date, active) VALUES ($1,$2,$3,$4,$5) RETURNING category_id`,
		name, req.Description, req.ApplicationStartDate, req.ApplicationEndDate, active).Scan(&newID)
	if err != nil {
		return nil, fmt.Errorf("create failed: %w", err)
	}
	return &pb.CreateOrUpdateCategoryResponse{CategoryId: newID, Message: "Category created"}, nil
}
