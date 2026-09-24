from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import analyze, chat, drugs, history, prescription

app = FastAPI(title="MedCheck API", version="1.0.0")

# Allow the Vite dev server (and whatever FRONTEND_ORIGIN is set to) to call
# this API with credentials/auth headers.
allowed_origins = {settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://localhost:3000"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(prescription.router)
app.include_router(drugs.router)
app.include_router(history.router)
app.include_router(chat.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
