#!/bin/bash

# Development script for backend services
# Usage: ./dev.sh <command>

set -e

CONTAINER_NAME="neo4j-myfun"
IMAGE="neo4j:latest"
HTTP_PORT="7475"
BOLT_PORT="7688"
NEO4J_PASSWORD="myfun123"
DATABASE_NAME="myfun"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if container is running
is_container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Function to check if container exists (even if stopped)
container_exists() {
    docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Function to start Neo4j database
start_db() {
    echo -e "${YELLOW}Checking Neo4j container status...${NC}"
    
    if is_container_running; then
        echo -e "${GREEN}✓ Neo4j container '${CONTAINER_NAME}' is already running${NC}"
        echo -e "  HTTP: http://localhost:${HTTP_PORT}"
        echo -e "  Bolt: bolt://localhost:${BOLT_PORT}"
        return 0
    fi
    
    if container_exists; then
        echo -e "${YELLOW}Container exists but is stopped. Starting...${NC}"
        docker start "${CONTAINER_NAME}"
        echo -e "${GREEN}✓ Neo4j container started${NC}"
    else
        echo -e "${YELLOW}Creating and starting Neo4j container...${NC}"
        
        # Create volumes if they don't exist
        docker volume create neo4j-myfun-data > /dev/null 2>&1 || true
        docker volume create neo4j-myfun-logs > /dev/null 2>&1 || true
        docker volume create neo4j-myfun-import > /dev/null 2>&1 || true
        docker volume create neo4j-myfun-plugins > /dev/null 2>&1 || true
        
        docker run -d \
            --name "${CONTAINER_NAME}" \
            -p "${HTTP_PORT}:7474" \
            -p "${BOLT_PORT}:7687" \
            -e NEO4J_AUTH="neo4j/${NEO4J_PASSWORD}" \
            -e NEO4J_PLUGINS='["apoc"]' \
            -e NEO4J_dbms_default__database="${DATABASE_NAME}" \
            -e NEO4J_server_memory_heap_initial__size=512m \
            -e NEO4J_server_memory_heap_max__size=2G \
            -e NEO4J_server_memory_pagecache_size=1G \
            -v neo4j-myfun-data:/data \
            -v neo4j-myfun-logs:/logs \
            -v neo4j-myfun-import:/var/lib/neo4j/import \
            -v neo4j-myfun-plugins:/plugins \
            --restart unless-stopped \
            --health-cmd='wget --no-verbose --tries=1 --spider http://localhost:7474 || exit 1' \
            --health-interval=10s \
            --health-timeout=5s \
            --health-retries=5 \
            "${IMAGE}"
        
        echo -e "${GREEN}✓ Neo4j container created and started${NC}"
    fi
    
    echo -e "${GREEN}✓ Neo4j is available at:${NC}"
    echo -e "  HTTP: http://localhost:${HTTP_PORT}"
    echo -e "  Bolt: bolt://localhost:${BOLT_PORT}"
    echo -e "  Username: neo4j"
    echo -e "  Password: ${NEO4J_PASSWORD}"
    echo -e ""
    echo -e "${YELLOW}Waiting for Neo4j to be ready...${NC}"
    
    # Wait for Neo4j to be healthy
    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker exec "${CONTAINER_NAME}" wget --no-verbose --tries=1 --spider http://localhost:7474 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Neo4j is ready!${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo -e "\n${YELLOW}⚠ Neo4j is starting but may not be fully ready yet${NC}"
    echo -e "Check status with: docker logs ${CONTAINER_NAME}"
}

# Function to stop Neo4j database
stop_db() {
    if is_container_running; then
        echo -e "${YELLOW}Stopping Neo4j container...${NC}"
        docker stop "${CONTAINER_NAME}"
        echo -e "${GREEN}✓ Neo4j container stopped${NC}"
    else
        echo -e "${YELLOW}Neo4j container is not running${NC}"
    fi
}

# Function to show database status
status_db() {
    if is_container_running; then
        echo -e "${GREEN}✓ Neo4j container '${CONTAINER_NAME}' is running${NC}"
        echo -e "  HTTP: http://localhost:${HTTP_PORT}"
        echo -e "  Bolt: bolt://localhost:${BOLT_PORT}"
        docker ps --filter "name=${CONTAINER_NAME}" --format "  Status: {{.Status}}"
    elif container_exists; then
        echo -e "${YELLOW}⚠ Neo4j container '${CONTAINER_NAME}' exists but is stopped${NC}"
        docker ps -a --filter "name=${CONTAINER_NAME}" --format "  Status: {{.Status}}"
    else
        echo -e "${RED}✗ Neo4j container '${CONTAINER_NAME}' does not exist${NC}"
    fi
}

# Function to show logs
logs_db() {
    if container_exists; then
        docker logs -f "${CONTAINER_NAME}"
    else
        echo -e "${RED}✗ Neo4j container '${CONTAINER_NAME}' does not exist${NC}"
        exit 1
    fi
}

# Function to remove Neo4j container and volumes
remove_db() {
    if is_container_running; then
        echo -e "${YELLOW}Stopping Neo4j container...${NC}"
        docker stop "${CONTAINER_NAME}"
    fi
    
    if container_exists; then
        echo -e "${YELLOW}Removing Neo4j container...${NC}"
        docker rm "${CONTAINER_NAME}"
        echo -e "${GREEN}✓ Container removed${NC}"
        
        read -p "Do you want to remove volumes as well? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker volume rm neo4j-myfun-data neo4j-myfun-logs neo4j-myfun-import neo4j-myfun-plugins 2>/dev/null || true
            echo -e "${GREEN}✓ Volumes removed${NC}"
        fi
    else
        echo -e "${YELLOW}Container does not exist${NC}"
    fi
}

# Function to start FastAPI backend
start() {
    echo -e "${YELLOW}Starting FastAPI backend server...${NC}"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating virtual environment...${NC}"
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies if needed
    if [ ! -f "venv/.installed" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        pip install --upgrade pip > /dev/null 2>&1
        pip install -r requirements.txt
        touch venv/.installed
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    fi
    
    # Load environment variables if .env exists
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Check if Neo4j is running
    if ! is_container_running; then
        echo -e "${YELLOW}⚠ Neo4j container is not running. Starting it...${NC}"
        start_db
    fi
    
    # Run the server
    echo -e "${GREEN}✓ Starting FastAPI server on http://${API_HOST:-0.0.0.0}:${API_PORT:-8000}${NC}"
    echo -e "${GREEN}✓ API Documentation: http://localhost:${API_PORT:-8000}/docs${NC}"
    echo ""
    uvicorn app.main:app --host ${API_HOST:-0.0.0.0} --port ${API_PORT:-8000} --reload
}

# Main command handler
case "$1" in
    start)
        start
        ;;
    start-db)
        start_db
        ;;
    stop-db)
        stop_db
        ;;
    status-db)
        status_db
        ;;
    logs-db)
        logs_db
        ;;
    remove-db)
        remove_db
        ;;
    *)
        echo "Usage: $0 {start|start-db|stop-db|status-db|logs-db|remove-db}"
        echo ""
        echo "Commands:"
        echo "  start       - Start FastAPI backend server (with auto-setup)"
        echo "  start-db    - Check and start Neo4j container"
        echo "  stop-db     - Stop Neo4j container"
        echo "  status-db   - Show Neo4j container status"
        echo "  logs-db     - Show Neo4j container logs"
        echo "  remove-db   - Remove Neo4j container (and optionally volumes)"
        exit 1
        ;;
esac

