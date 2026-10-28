import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from .routers import chat, metrics, reports  # noqa: E402

app = FastAPI(title="MarketLens API", version="1.0.0",
              description="Global market intelligence: metrics, AI analyst and report exports.")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"],
                   expose_headers=["Content-Disposition"])

app.include_router(metrics.router)
app.include_router(chat.router)
app.include_router(reports.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "ai": "enabled" if os.getenv("ANTHROPIC_API_KEY") else "demo"}
