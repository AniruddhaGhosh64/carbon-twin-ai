from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import carbon, twin, simulator, recommendations, progress, eco, auth

app = FastAPI(
    title="CarbonTwin AI API",
    description="Backend API for the CarbonTwin AI climate intelligence suite",
    version="1.0.0"
)

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development. Will restrict in production.
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
