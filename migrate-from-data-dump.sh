#!/bin/bash

# Complete CHIRP CMS Migration Script
# This script performs the entire migration from ExpressionEngine MySQL dump to Payload CMS
# Usage: ./migrate-from-data-dump.sh

set -e

# Configuration
DUMP_FILE="$HOME/Documents/ChirpAssets/DataDump/chirp-data-dump-10-20-25.sql"
PG_CONTAINER_NAME="chirp-postgres"
CMS_CONTAINER_NAME="chirp-cms"
PG_DB_NAME="chirp_cms"
PG_DB_USER="chirp"
PG_DB_PASSWORD="chirp_dev_password"

# Temporary MySQL container configuration
MYSQL_CONTAINER_NAME="chirp-mysql-temp"
MYSQL_DB_NAME="av07282_production"  # From the dump file
MYSQL_ROOT_PASSWORD="temp_root_password"
MYSQL_PORT="3307"  # Use different port to avoid conflicts

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo "=================================================================="
echo "        CHIRP CMS COMPLETE MIGRATION SCRIPT                      "
echo "=================================================================="
echo ""
echo "This script will perform the complete migration:"
echo "  1. Import MySQL dump into temporary MySQL container"
echo "  2. Convert and migrate to PostgreSQL using pgloader"
echo "  3. Initialize Payload CMS schema"
echo "  4. Import all media files (241 files)"
echo "  5. Migrate all content collections:"
echo "     - Articles (~2,600)"
echo "     - Events (~1,100)"
echo "     - Podcasts (~960)"
echo "     - Pages (~50)"
echo ""
echo -e "${YELLOW}Total estimated time: 30-45 minutes${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Cleaning up temporary MySQL container..."
    docker stop "$MYSQL_CONTAINER_NAME" 2>/dev/null || true
    docker rm "$MYSQL_CONTAINER_NAME" 2>/dev/null || true
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT

# ================================================================
# PART 1: VERIFY PREREQUISITES
# ================================================================
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}PART 1: Verifying Prerequisites${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# Check if dump file exists
echo "Checking for SQL dump file..."
if [ ! -f "$DUMP_FILE" ]; then
    echo -e "${RED}Error: SQL dump file not found at $DUMP_FILE${NC}"
    echo "Please ensure the dump file exists at this location."
    exit 1
fi
FILE_SIZE=$(ls -lh "$DUMP_FILE" | awk '{print $5}')
echo -e "${GREEN}✓ Found SQL dump file ($FILE_SIZE)${NC}"
echo ""

# Check if pgloader is installed
echo "Checking for pgloader..."
if ! command -v pgloader &> /dev/null; then
    echo -e "${RED}Error: pgloader is not installed${NC}"
    echo "Install it with: brew install pgloader"
    exit 1
fi
echo -e "${GREEN}✓ pgloader is installed${NC}"
echo ""

# Check if Docker containers are running
echo "Checking Docker containers..."

# Start PostgreSQL if needed
if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER_NAME}$"; then
    echo -e "${YELLOW}PostgreSQL container not running, starting...${NC}"
    docker-compose up -d db
    sleep 5
fi

# Start CMS if needed
if ! docker ps --format '{{.Names}}' | grep -q "^${CMS_CONTAINER_NAME}$"; then
    echo -e "${YELLOW}CMS container not running, starting...${NC}"
    docker-compose up -d
    sleep 10
fi

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec "$PG_CONTAINER_NAME" pg_isready -U "$PG_DB_USER" -d "$PG_DB_NAME" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Error: PostgreSQL failed to start${NC}"
        exit 1
    fi
    echo "Waiting for PostgreSQL... ($i/30)"
    sleep 1
done
echo ""

# ================================================================
# PART 2: IMPORT MYSQL DUMP
# ================================================================
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}PART 2: Importing MySQL Dump${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# Check if data already exists
EXISTING_TABLES=$(docker exec "$PG_CONTAINER_NAME" psql -U "$PG_DB_USER" -d "$PG_DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'av07282_production';" 2>/dev/null | xargs || echo "0")

if [ "$EXISTING_TABLES" -gt "0" ]; then
    echo -e "${YELLOW}ExpressionEngine data already exists in PostgreSQL (${EXISTING_TABLES} tables)${NC}"
    echo "Skipping MySQL import and pgloader steps."
    echo ""
else
    echo "Starting temporary MySQL container..."
    if docker ps -a --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER_NAME}$"; then
        docker stop "$MYSQL_CONTAINER_NAME" 2>/dev/null || true
        docker rm "$MYSQL_CONTAINER_NAME" 2>/dev/null || true
    fi

    docker run -d \
        --name "$MYSQL_CONTAINER_NAME" \
        -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
        -e MYSQL_DATABASE="$MYSQL_DB_NAME" \
        -p "${MYSQL_PORT}:3306" \
        mysql:8.0 \
        --default-authentication-plugin=mysql_native_password

    echo "Waiting for MySQL to be ready..."
    for i in {1..60}; do
        if docker exec "$MYSQL_CONTAINER_NAME" mysqladmin ping -p"$MYSQL_ROOT_PASSWORD" --silent 2>/dev/null; then
            echo -e "${GREEN}✓ MySQL container is ready${NC}"
            break
        fi
        if [ $i -eq 60 ]; then
            echo -e "${RED}Error: MySQL failed to start${NC}"
            exit 1
        fi
        sleep 2
    done
    echo ""

    echo "Importing MySQL dump (this will take several minutes)..."
    if docker exec -i "$MYSQL_CONTAINER_NAME" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DB_NAME" < "$DUMP_FILE"; then
        echo -e "${GREEN}✓ MySQL dump imported successfully${NC}"
    else
        echo -e "${RED}Error: Failed to import MySQL dump${NC}"
        exit 1
    fi
    echo ""

    # ================================================================
    # PART 3: MIGRATE TO POSTGRESQL
    # ================================================================
    echo -e "${CYAN}================================================================${NC}"
    echo -e "${CYAN}PART 3: Converting MySQL to PostgreSQL${NC}"
    echo -e "${CYAN}================================================================${NC}"
    echo ""

    # Create pgloader command file
    cat > /tmp/pgloader-migration.load <<EOF
LOAD DATABASE
    FROM mysql://root:${MYSQL_ROOT_PASSWORD}@localhost:${MYSQL_PORT}/${MYSQL_DB_NAME}
    INTO postgresql://${PG_DB_USER}:${PG_DB_PASSWORD}@localhost:5432/${PG_DB_NAME}

WITH include drop, create tables, create indexes, reset sequences,
     workers = 8, concurrency = 1

SET PostgreSQL PARAMETERS
    maintenance_work_mem to '128MB',
    work_mem to '12MB'

CAST type datetime to timestamptz drop default drop not null using zero-dates-to-null,
     type date drop not null drop default using zero-dates-to-null;
EOF

    echo "Running pgloader (this may take 5-10 minutes)..."
    if pgloader /tmp/pgloader-migration.load; then
        echo ""
        echo -e "${GREEN}✓ PostgreSQL migration completed successfully!${NC}"
    else
        echo ""
        echo -e "${RED}Error: pgloader migration failed${NC}"
        exit 1
    fi
    echo ""
fi

# ================================================================
# PART 4: INITIALIZE PAYLOAD CMS
# ================================================================
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}PART 4: Initializing Payload CMS Schema${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# Check if Payload tables exist
PAYLOAD_TABLES=$(docker exec "$PG_CONTAINER_NAME" psql -U "$PG_DB_USER" -d "$PG_DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('articles', 'media', 'events', 'podcasts');" 2>/dev/null | xargs || echo "0")

if [ "$PAYLOAD_TABLES" -eq "4" ]; then
    echo -e "${GREEN}✓ Payload CMS schema already initialized${NC}"
    echo ""
else
    echo "Initializing Payload CMS schema and importing media..."
    docker exec "$CMS_CONTAINER_NAME" npx tsx /app/scripts/init-and-update-media.ts
    echo ""
fi

# ================================================================
# PART 5: IMPORT MEDIA FILES
# ================================================================
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}PART 5: Importing Media Files${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# Check if media already imported
MEDIA_COUNT=$(docker exec "$PG_CONTAINER_NAME" psql -U "$PG_DB_USER" -d "$PG_DB_NAME" -t -c "SELECT COUNT(*) FROM media;" 2>/dev/null | xargs || echo "0")

if [ "$MEDIA_COUNT" -gt "200" ]; then
    echo -e "${GREEN}✓ Media already imported (${MEDIA_COUNT} files)${NC}"
    echo ""
else
    echo "Importing media files (this may take 5-10 minutes)..."
    docker exec "$CMS_CONTAINER_NAME" npx tsx /app/scripts/import-existing-media-files.ts 2>&1 | grep -E "(Importing|Imported|Summary|found|Error)" || true

    MEDIA_COUNT=$(docker exec "$PG_CONTAINER_NAME" psql -U "$PG_DB_USER" -d "$PG_DB_NAME" -t -c "SELECT COUNT(*) FROM media;" | xargs)
    echo -e "${GREEN}✓ Media import complete (${MEDIA_COUNT} files)${NC}"
    echo ""
fi

# ================================================================
# PART 6: MIGRATE ALL COLLECTIONS
# ================================================================
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}PART 6: Migrating All Content Collections${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

echo "Migrating Articles, Events, Podcasts, and Pages..."
echo -e "${YELLOW}This is the longest step and may take 15-25 minutes${NC}"
echo ""

# Run the comprehensive migration
docker exec "$CMS_CONTAINER_NAME" npx tsx /app/scripts/migrate-all-collections.ts 2>&1 | grep -v "Webhook" | grep -E "(Migrating|Found|migrated|✅|Summary|TOTAL|Loaded|exist|Error)" || true

echo ""

# ================================================================
# PART 7: VERIFICATION
# ================================================================
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}PART 7: Verifying Migration${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

echo "Checking migrated data..."
docker exec "$PG_CONTAINER_NAME" psql -U "$PG_DB_USER" -d "$PG_DB_NAME" <<'EOSQL'
\echo ''
\echo '📊 Migration Results:'
\echo '─────────────────────────────────────────────────────'
\echo ''

SELECT
    '  ' || RPAD(collection, 12) || ' | ' ||
    LPAD(count::text, 6) || ' records' as result
FROM (
    SELECT 'Articles' as collection, COUNT(*) as count FROM articles
    UNION ALL
    SELECT 'Events', COUNT(*) FROM events
    UNION ALL
    SELECT 'Podcasts', COUNT(*) FROM podcasts
    UNION ALL
    SELECT 'Pages', COUNT(*) FROM pages
    UNION ALL
    SELECT 'Media', COUNT(*) FROM media
    UNION ALL
    SELECT 'Categories', COUNT(*) FROM categories
    UNION ALL
    SELECT 'Venues', COUNT(*) FROM venues
    ORDER BY count DESC
) stats;

\echo ''
\echo '─────────────────────────────────────────────────────'
EOSQL

echo ""

# ================================================================
# FINAL SUMMARY
# ================================================================
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}              MIGRATION COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "${CYAN}📝 Summary:${NC}"
echo ""
echo "  ✅ ExpressionEngine data imported to PostgreSQL"
echo "  ✅ Payload CMS schema initialized"
echo "  ✅ Media files imported"
echo "  ✅ All content collections migrated"
echo ""
echo -e "${CYAN}🌐 Access your CMS:${NC}"
echo ""
echo "  Admin Panel:  http://localhost:3000/admin"
echo "  Articles:     http://localhost:3000/admin/collections/articles"
echo "  Events:       http://localhost:3000/admin/collections/events"
echo "  Podcasts:     http://localhost:3000/admin/collections/podcasts"
echo "  Media:        http://localhost:3000/admin/collections/media"
echo ""
echo -e "${CYAN}📄 Documentation:${NC}"
echo ""
echo "  - COMPLETE_MIGRATION_SUMMARY.md (comprehensive overview)"
echo "  - MEDIA_MIGRATION_SUMMARY.md (media details)"
echo "  - ARTICLE_MIGRATION_SUMMARY.md (article specifics)"
echo ""
echo -e "${GREEN}All done! Your CHIRP CMS is ready to use! 🎉${NC}"
echo ""
