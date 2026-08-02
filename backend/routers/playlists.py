from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
from utils.supabase_client import supabase

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
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header. Please login again.")
    token = authorization.replace("Bearer ", "")
    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token. Please login again.")
        return str(user.user.id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {str(e)}")


def ensure_profile(user_id: str):
    """Create profile row if missing (needed for FK on liked_songs)."""
    try:
        existing = (
            supabase.table("profiles")
            .select("id")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if existing.data:
            return
        supabase.table("profiles").upsert(
            {"id": user_id, "username": user_id[:8], "full_name": "User"}
        ).execute()
    except Exception as e:
        # try insert without maybe_single
        try:
            supabase.table("profiles").upsert(
                {"id": user_id, "username": user_id[:8], "full_name": "User"}
            ).execute()
        except Exception as e2:
            print("ensure_profile error:", e2)


@router.post("/liked")
async def like_song(body: SongAdd, user_id: str = Depends(get_user_id)):
    if not body.song_id:
        raise HTTPException(status_code=400, detail="song_id is required")
    ensure_profile(user_id)
    data = {
        "user_id": user_id,
        "song_id": str(body.song_id),
        "song_data": body.song_data or {},
    }
    try:
        # try upsert first
        res = (
            supabase.table("liked_songs")
            .upsert(data, on_conflict="user_id,song_id")
            .execute()
        )
        return {"success": True, "data": (res.data[0] if res.data else data)}
    except Exception as e1:
        # fallback: check exists then insert
        try:
            existing = (
                supabase.table("liked_songs")
                .select("id")
                .eq("user_id", user_id)
                .eq("song_id", str(body.song_id))
                .execute()
            )
            if existing.data:
                return {"success": True, "data": existing.data[0], "message": "already liked"}
            res = supabase.table("liked_songs").insert(data).execute()
            return {"success": True, "data": res.data[0] if res.data else data}
        except Exception as e2:
            raise HTTPException(
                status_code=500,
                detail=f"Could not like song. DB error: {str(e2)}. Original: {str(e1)}",
            )


@router.delete("/liked/{song_id}")
async def unlike_song(song_id: str, user_id: str = Depends(get_user_id)):
    try:
        supabase.table("liked_songs").delete().eq("user_id", user_id).eq(
            "song_id", song_id
        ).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/liked/list")
async def list_liked(user_id: str = Depends(get_user_id)):
    try:
        res = (
            supabase.table("liked_songs")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"success": True, "data": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/history")
async def add_history(body: SongAdd, user_id: str = Depends(get_user_id)):
    ensure_profile(user_id)
    data = {
        "user_id": user_id,
        "song_id": str(body.song_id),
        "song_data": body.song_data or {},
    }
    try:
        supabase.table("listening_history").insert(data).execute()
    except Exception:
        pass
    return {"success": True}


@router.get("/history/list")
async def list_history(user_id: str = Depends(get_user_id)):
    try:
        res = (
            supabase.table("listening_history")
            .select("*")
            .eq("user_id", user_id)
            .order("played_at", desc=True)
            .limit(50)
            .execute()
        )
        rows = res.data or []
        # dedupe by song_id keeping most recent
        seen = set()
        unique = []
        for row in rows:
            sid = str(row.get("song_id") or "")
            if not sid or sid in seen:
                continue
            seen.add(sid)
            unique.append(row)
        return {"success": True, "data": unique}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_playlists(user_id: str = Depends(get_user_id)):
    res = (
        supabase.table("playlists")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"success": True, "data": res.data or []}


@router.post("/")
async def create_playlist(body: PlaylistCreate, user_id: str = Depends(get_user_id)):
    ensure_profile(user_id)
    data = {
        "user_id": user_id,
        "name": body.name,
        "description": body.description or "",
        "is_public": body.is_public,
    }
    try:
        res = supabase.table("playlists").insert(data).execute()
        return {"success": True, "data": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{playlist_id}")
async def get_playlist(playlist_id: str, user_id: str = Depends(get_user_id)):
    res = (
        supabase.table("playlists")
        .select("*")
        .eq("id", playlist_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Playlist not found")
    songs = (
        supabase.table("playlist_songs")
        .select("*")
        .eq("playlist_id", playlist_id)
        .order("position")
        .execute()
    )
    return {"success": True, "data": {**res.data, "songs": songs.data or []}}


@router.post("/{playlist_id}/songs")
async def add_song_to_playlist(
    playlist_id: str, body: SongAdd, user_id: str = Depends(get_user_id)
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
        raise HTTPException(status_code=404, detail="Playlist not found")
    data = {
        "playlist_id": playlist_id,
        "song_id": str(body.song_id),
        "song_data": body.song_data or {},
    }
    res = supabase.table("playlist_songs").insert(data).execute()
    return {"success": True, "data": res.data[0] if res.data else None}


@router.delete("/{playlist_id}/songs/{song_id}")
async def remove_song(
    playlist_id: str, song_id: str, user_id: str = Depends(get_user_id)
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
        raise HTTPException(status_code=404, detail="Playlist not found")
    (
        supabase.table("playlist_songs")
        .delete()
        .eq("playlist_id", playlist_id)
        .eq("song_id", song_id)
        .execute()
    )
    return {"success": True}
