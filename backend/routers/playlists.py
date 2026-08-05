from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
from utils.supabase_client import supabase

print("PLAYLISTS.PY LOADED")

router = APIRouter()


class PlaylistCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_public: bool = False


class SongAdd(BaseModel):
    song_id: str
    song_data: dict


def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header",
        )

    token = authorization.replace("Bearer ", "")

    try:
        user = supabase.auth.get_user(token)

        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        return user.user.id

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )


# ------------------ Liked Songs ------------------

@router.post("/liked")
async def like_song(body: SongAdd, user_id: str = Depends(get_user_id)):
    data = {
        "user_id": user_id,
        "song_id": body.song_id,
        "song_data": body.song_data,
    }

    res = (
        supabase.table("liked_songs")
        .upsert(data, on_conflict="user_id,song_id")
        .execute()
    )

    return {
        "success": True,
        "data": res.data[0] if res.data else None,
    }


@router.delete("/liked/{song_id}")
async def unlike_song(song_id: str, user_id: str = Depends(get_user_id)):
    (
        supabase.table("liked_songs")
        .delete()
        .eq("user_id", user_id)
        .eq("song_id", song_id)
        .execute()
    )

    return {"success": True}


@router.get("/liked/list")
async def list_liked(user_id: str = Depends(get_user_id)):
    res = (
        supabase.table("liked_songs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "success": True,
        "data": res.data or [],
    }


# ------------------ Listening History ------------------

@router.post("/history")
async def add_history(body: SongAdd, user_id: str = Depends(get_user_id)):
    data = {
        "user_id": user_id,
        "song_id": body.song_id,
        "song_data": body.song_data,
    }

    supabase.table("listening_history").insert(data).execute()

    return {"success": True}


@router.get("/history")
async def list_history(user_id: str = Depends(get_user_id)):
    print("GET HISTORY ROUTE HIT")

    res = (
        supabase.table("listening_history")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(30)
        .execute()
    )

    return {
        "success": True,
        "data": res.data or [],
    }


# ------------------ Playlists ------------------

@router.get("/")
async def list_playlists(user_id: str = Depends(get_user_id)):
    res = (
        supabase.table("playlists")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "success": True,
        "data": res.data or [],
    }


@router.post("/")
async def create_playlist(
    body: PlaylistCreate,
    user_id: str = Depends(get_user_id),
):
    data = {
        "user_id": user_id,
        "name": body.name,
        "description": body.description,
        "is_public": body.is_public,
    }

    res = supabase.table("playlists").insert(data).execute()

    return {
        "success": True,
        "data": res.data[0] if res.data else None,
    }


@router.get("/{playlist_id}")
async def get_playlist(
    playlist_id: str,
    user_id: str = Depends(get_user_id),
):
    res = (
        supabase.table("playlists")
        .select("*")
        .eq("id", playlist_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="Playlist not found",
        )

    songs = (
        supabase.table("playlist_songs")
        .select("*")
        .eq("playlist_id", playlist_id)
        .order("position")
        .execute()
    )

    return {
        "success": True,
        "data": {
            **res.data,
            "songs": songs.data or [],
        },
    }


@router.post("/{playlist_id}/songs")
async def add_song_to_playlist(
    playlist_id: str,
    body: SongAdd,
    user_id: str = Depends(get_user_id),
):
    pl = (
        supabase.table("playlists")
        .select("id")
        .eq("id", playlist_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not pl.data:
        raise HTTPException(
            status_code=404,
            detail="Playlist not found",
        )

    data = {
        "playlist_id": playlist_id,
        "song_id": body.song_id,
        "song_data": body.song_data,
    }

    res = (
        supabase.table("playlist_songs")
        .insert(data)
        .execute()
    )

    return {
        "success": True,
        "data": res.data[0] if res.data else None,
    }


@router.delete("/{playlist_id}/songs/{song_id}")
async def remove_song(
    playlist_id: str,
    song_id: str,
    user_id: str = Depends(get_user_id),
):
    pl = (
        supabase.table("playlists")
        .select("id")
        .eq("id", playlist_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not pl.data:
        raise HTTPException(
            status_code=404,
            detail="Playlist not found",
        )

    (
        supabase.table("playlist_songs")
        .delete()
        .eq("playlist_id", playlist_id)
        .eq("song_id", song_id)
        .execute()
    )

    return {"success": True}