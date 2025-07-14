package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/slomus/USOSWEB/src/backend/configs"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
)

// ServiceRegistry manages gRPC connections to other microservices
type ServiceRegistry struct {
	connections map[string]*grpc.ClientConn
	mutex       sync.RWMutex
	logger      *logger.Logger
}

// NewServiceRegistry creates a new service registry
func NewServiceRegistry() *ServiceRegistry {
	return &ServiceRegistry{
		connections: make(map[string]*grpc.ClientConn),
		logger:      logger.NewLogger("service-registry"),
	}
}

// GetConnection returns a gRPC connection to a service
func (sr *ServiceRegistry) GetConnection(serviceName string) (*grpc.ClientConn, error) {
	sr.mutex.RLock()
	if conn, exists := sr.connections[serviceName]; exists {
		sr.mutex.RUnlock()
		return conn, nil
	}
	sr.mutex.RUnlock()

	return sr.createConnection(serviceName)
}

// createConnection establishes a new gRPC connection
func (sr *ServiceRegistry) createConnection(serviceName string) (*grpc.ClientConn, error) {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()

	// Double-check pattern
	if conn, exists := sr.connections[serviceName]; exists {
		return conn, nil
	}

	endpoint, err := sr.getServiceEndpoint(serviceName)
	if err != nil {
		return nil, err
	}

	sr.logger.LogInfo(fmt.Sprintf("Creating gRPC connection to %s at %s", serviceName, endpoint))

	// gRPC connection options
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time:                10 * time.Second,
			Timeout:             3 * time.Second,
			PermitWithoutStream: true,
		}),
		grpc.WithDefaultCallOptions(
			grpc.MaxCallRecvMsgSize(4*1024*1024), // 4MB
			grpc.MaxCallSendMsgSize(4*1024*1024), // 4MB
		),
	}

	conn, err := grpc.Dial(endpoint, opts...)
	if err != nil {
		sr.logger.LogError(fmt.Sprintf("Failed to connect to %s", serviceName), err)
		return nil, err
	}

	sr.connections[serviceName] = conn
	sr.logger.LogInfo(fmt.Sprintf("Successfully connected to %s", serviceName))

	return conn, nil
}

// getServiceEndpoint resolves service name to endpoint
func (sr *ServiceRegistry) getServiceEndpoint(serviceName string) (string, error) {
	switch serviceName {
	case "calendar":
		return configs.Envs.GetCalendarEndpoint(), nil
	case "messaging":
		return configs.Envs.GetMessagingEndpoint(), nil
	case "common":
		return configs.Envs.GetCommonEndpoint(), nil
	default:
		return "", fmt.Errorf("unknown service: %s", serviceName)
	}
}

// HealthCheck checks if all services are healthy
func (sr *ServiceRegistry) HealthCheck(ctx context.Context) map[string]bool {
	services := []string{"calendar", "messaging", "common"}
	health := make(map[string]bool)

	for _, service := range services {
		conn, err := sr.GetConnection(service)
		if err != nil {
			health[service] = false
			continue
		}

		// Simple connectivity check - GetState() returns current connection state
		state := conn.GetState()
		health[service] = state.String() == "READY" || state.String() == "IDLE"
	}

	return health
}

// Close closes all connections
func (sr *ServiceRegistry) Close() {
	sr.mutex.Lock()
	defer sr.mutex.Unlock()

	for serviceName, conn := range sr.connections {
		if err := conn.Close(); err != nil {
			sr.logger.LogError(fmt.Sprintf("Error closing connection to %s", serviceName), err)
		} else {
			sr.logger.LogInfo(fmt.Sprintf("Closed connection to %s", serviceName))
		}
	}

	sr.connections = make(map[string]*grpc.ClientConn)
}

// Global service registry instance
var GlobalRegistry = NewServiceRegistry()
