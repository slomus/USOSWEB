#!/bin/sh
set -e

echo "=========================================="
echo "  USOSWEB Database Seeder"
echo "=========================================="

# Default values
DB_HOST="${DB_HOST:-postgres-service}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-usosweb}"

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
    echo "PostgreSQL not ready, waiting..."
    sleep 3
done
echo "✅ PostgreSQL is ready!"

# Check which script to run based on argument
case "${1:-all}" in
    mock)
        echo "📦 Loading mock_data.sql..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /seeds/mock_data.sql
        echo "✅ mock_data.sql loaded!"
        ;;
    relations)
        echo "📦 Loading init_relations.sql..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /seeds/init_relations.sql
        echo "✅ init_relations.sql loaded!"
        ;;
    all)
        echo "📦 Loading mock_data.sql..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /seeds/mock_data.sql
        echo "✅ mock_data.sql loaded!"
        
        echo ""
        echo "📦 Loading init_relations.sql..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /seeds/init_relations.sql
        echo "✅ init_relations.sql loaded!"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Usage: $0 {mock|relations|all}"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "  ✓ Seeding step completed!"
echo "=========================================="

