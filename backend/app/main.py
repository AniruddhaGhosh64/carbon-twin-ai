from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import carbon, twin, simulator, recommendations, progress, eco, auth
from app.core.config import settings

app = FastAPI(
    title="CarbonTwin AI API",
    description="Backend API for the CarbonTwin AI climate intelligence suite",
    version="1.0.0"
)

# Allow CORS for Next.js frontend
origins = [settings.FRONTEND_URL]
if "localhost" not in settings.FRONTEND_URL and "127.0.0.1" not in settings.FRONTEND_URL:
    origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(carbon.router)
app.include_router(twin.router)
app.include_router(simulator.router)
app.include_router(recommendations.router)
app.include_router(progress.router)
app.include_router(eco.router)

@app.get("/")
async def root():
    return {"message": "CarbonTwin AI API is running"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "CarbonTwin AI API"
    }
