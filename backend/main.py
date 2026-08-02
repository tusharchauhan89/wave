from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers import music, playlists, voice, auth, chat

app = FastAPI(
    title="Spotify Clone API",
    description="Music streaming clone powered by JioSaavn + Supabase + Voice AI",
    version="1.0.0"
)

origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "null",  # for file:// protocol during testing
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(music.router, prefix="/api/music", tags=["Music"])
app.include_router(playlists.router, prefix="/api/playlists", tags=["Playlists & Liked"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice Assistant"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["Nova Chat"])


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Spotify Clone API is running",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
