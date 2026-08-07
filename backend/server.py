import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from core import db, client
from seed import run_seed
from routers import auth, catalog, requests as requests_router, payments, engagement, provider, admin, ai, comms

app = FastAPI(title="FixiPro API")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.include_router(auth.router, prefix="/api")
app.include_router(catalog.router, prefix="/api")
app.include_router(requests_router.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(engagement.router, prefix="/api")
app.include_router(provider.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(comms.router, prefix="/api")


@app.get("/api/")
async def root():
    return {"message": "FixiPro API", "status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await run_seed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
