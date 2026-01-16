# Backend Service

This directory contains the backend service for the myFun Chrome Extension.

## Neo4j Database

A Neo4j database is configured for data storage using Docker. The database is managed through the `dev.sh` script.

### Connection Details

- **Container Name**: `neo4j-myfun`
- **Database Name**: `myfun`
- **HTTP Port**: `7475` (Browser UI: http://localhost:7475)
- **Bolt Port**: `7688` (Connection string: `bolt://localhost:7688`)
- **Default Username**: `neo4j`
- **Default Password**: `myfun123` (⚠️ Change this in production!)

### Managing the Database

Use the `dev.sh` script to manage the Neo4j container:

#### Start the database:
```bash
./dev.sh start-db
```
This command will check if the container is running, and if not, create and start it.

#### Check database status:
```bash
./dev.sh status-db
```

#### Stop the database:
```bash
./dev.sh stop-db
```

#### View logs:
```bash
./dev.sh logs-db
```

#### Remove the database (and optionally volumes):
```bash
./dev.sh remove-db
```

#### Access Neo4j Browser:
Open http://localhost:7475 in your browser and login with:
- Username: `neo4j`
- Password: `myfun123`

#### Connection String for Applications:
```
bolt://localhost:7688
```

### Security Note

⚠️ **Important**: The default password `myfun123` should be changed before deploying to production. Update the `NEO4J_PASSWORD` variable in `dev.sh` with a strong password.

### Volumes

The following Docker volumes are created for data persistence:
- `neo4j-myfun-data`: Database data files
- `neo4j-myfun-logs`: Log files
- `neo4j-myfun-import`: Import directory for CSV/JSON files
- `neo4j-myfun-plugins`: APOC and other plugins

### Health Check

The container includes a health check that verifies Neo4j is responding. The `start-db` command will wait for Neo4j to be ready before completing.

