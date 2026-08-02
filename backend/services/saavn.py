import httpx
from typing import Any, Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

BASE = os.getenv("SAAVN_BASE", "https://saavn.sumit.co/api")


async def _get(path: str, params: Optional[dict] = None) -> Any:
    async with httpx.AsyncClient(timeout=20.0) as client:
        url = f"{BASE}{path}"
        resp = await client.get(url, params=params or {})
        resp.raise_for_status()
        return resp.json()


def _unwrap_song_list(payload: Any) -> List[dict]:
    """Normalize various Saavn search response shapes into a list of song dicts."""
    d = payload
    if isinstance(d, dict) and "data" in d:
        d = d["data"]
    songs: List[dict] = []

    def take(lst):
        if not isinstance(lst, list):
            return
        for s in lst:
            if isinstance(s, dict) and (s.get("type") in (None, "song") or s.get("name") or s.get("title")):
                if s.get("type") and s.get("type") not in ("song",):
                    # allow items without type if they look like songs
                    if s.get("type") in ("album", "artist", "playlist"):
                        continue
                songs.append(s)

    if isinstance(d, list):
        take(d)
    elif isinstance(d, dict):
        if "results" in d:
            take(d["results"])
        if "songs" in d:
            block = d["songs"]
            if isinstance(block, dict):
                take(block.get("results") or [])
            else:
                take(block)
        if "topQuery" in d and isinstance(d["topQuery"], dict):
            take(d["topQuery"].get("results") or [])
    # dedupe by id
    seen = set()
    out = []
    for s in songs:
        sid = str(s.get("id") or "")
        if sid and sid in seen:
            continue
        if sid:
            seen.add(sid)
        out.append(s)
    return out


async def search(query: str, page: int = 0, limit: int = 50) -> Any:
    params = {"query": query, "page": page, "limit": limit}
    return await _get("/search", params)


async def search_songs(query: str, page: int = 0, limit: int = 50) -> Any:
    """
    Better song search:
    1) /search/songs with full query
    2) also search without 'by'
    3) if multi-word, search artist-like token alone and merge
    """
    q = (query or "").strip()
    q = q.replace(" by ", " ").replace(" By ", " ")
    q = " ".join(q.split())

    all_songs: List[dict] = []
    queries = [q]

    # split: "Jogi Thiarajxtt" → also try artist-only + title-only order
    parts = q.split()
    if len(parts) >= 2:
        # artist often last token(s) for "Song Artist" pattern
        queries.append(parts[-1])  # Thiarajxtt
        queries.append(" ".join(parts[:-1]))  # Jogi
        queries.append(" ".join(reversed(parts)))  # Thiarajxtt Jogi

    # unique queries
    seen_q = set()
    uniq_q = []
    for qq in queries:
        qq = qq.strip()
        if qq and qq.lower() not in seen_q:
            seen_q.add(qq.lower())
            uniq_q.append(qq)

    for qq in uniq_q[:4]:
        try:
            data = await _get(
                "/search/songs",
                {"query": qq, "page": page, "limit": limit},
            )
            all_songs.extend(_unwrap_song_list(data))
        except Exception:
            try:
                data = await _get("/search", {"query": qq, "page": page, "limit": limit})
                all_songs.extend(_unwrap_song_list(data))
            except Exception:
                continue

    # dedupe
    seen = set()
    merged = []
    for s in all_songs:
        sid = str(s.get("id") or "")
        if sid and sid in seen:
            continue
        if sid:
            seen.add(sid)
        merged.append(s)

    return {
        "path": "/search/songs+merged",
        "query": q,
        "data": {"results": merged, "total": len(merged)},
    }


async def get_song(song_id: str) -> Any:
    return await _get(f"/songs/{song_id}")


async def get_songs_by_ids(ids: str) -> Any:
    return await _get("/songs", {"ids": ids})


async def get_album(album_id: str) -> Any:
    try:
        return await _get("/albums", {"id": album_id})
    except Exception:
        return await _get(f"/albums/{album_id}")


async def get_playlist(playlist_id: str) -> Any:
    try:
        return await _get("/playlists", {"id": playlist_id})
    except Exception:
        return await _get(f"/playlists/{playlist_id}")


async def get_artist(artist_id: str) -> Any:
    try:
        return await _get(f"/artists/{artist_id}")
    except Exception:
        return await _get("/artists", {"id": artist_id})


async def get_lyrics(song_id: str) -> Any:
    return await _get(f"/songs/{song_id}/lyrics")


async def get_home() -> Any:
    try:
        return await _get("/modules")
    except Exception:
        return {"data": []}


async def get_charts() -> Any:
    queries = ["trending hindi", "arijit singh", "punjabi hits", "english pop"]
    results = {}
    for q in queries:
        try:
            results[q] = await search_songs(q, page=0, limit=20)
        except Exception:
            results[q] = None
    return results
