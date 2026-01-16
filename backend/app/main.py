from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import profiles, settings
from app.config import settings as app_settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="myFun Backend API",
    description="Backend service for myFun Chrome Extension",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(profiles.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting myFun Backend API")
    logger.info(f"Neo4j URI: {app_settings.neo4j_uri}")
    logger.info(f"Neo4j Database: {app_settings.neo4j_database}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    from app.services.neo4j_service import neo4j_service
    neo4j_service.close()
    logger.info("Shutting down myFun Backend API")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "myFun Backend API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        from app.services.neo4j_service import neo4j_service
        neo4j_service.driver.verify_connectivity()
        return {"status": "healthy", "neo4j": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

