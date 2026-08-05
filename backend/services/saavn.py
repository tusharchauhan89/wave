import base64
import os
from typing import Any, Optional, List, Dict

import httpx
from dotenv import load_dotenv
from Crypto.Cipher import DES
from Crypto.Util.Padding import unpad

load_dotenv()

BASE = os.getenv("SAAVN_BASE", "https://saavn.sumit.co/api")
JIOSAAVN_NATIVE = "https://www.jiosaavn.com/api.php"
USE_NATIVE = os.getenv("SAAVN_USE_NATIVE", "false").lower() == "true"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
}


# ---------- Helpers ----------

def fix_image_url(url: str | None) -> list:
    """Return image in Sumit-style format (array of qualities)"""
    if not url:
        return []
    
    url = url.replace("http://", "https://")
    
    qualities = ["50x50", "150x150", "500x500"]
    result = []
    
    for q in qualities:
        fixed = url
        # replace any existing size
        fixed = fixed.replace("150x150", q).replace("50x50", q).replace("500x500", q)
        result.append({
            "quality": q,
            "url": fixed
        })
    
    return result


def decrypt_saavn_url(encrypted_media_url: str, quality: str = "320") -> str:
    if not encrypted_media_url:
        return ""
    try:
        key = b"38346591"
        enc = base64.b64decode(encrypted_media_url.strip())
        cipher = DES.new(key, DES.MODE_ECB)
        dec = unpad(cipher.decrypt(enc), 8).decode("utf-8")
        for q in ("320", "160", "96", "48", "12"):
            dec = dec.replace(f"_{q}.mp4", f"_{quality}.mp4")
        return dec.replace("http://", "https://")
    except Exception as e:
        print("decrypt error:", e)
        return ""


def build_download_urls(encrypted_media_url: str) -> List[Dict[str, str]]:
    qualities = ["12", "48", "96", "160", "320"]
    base = decrypt_saavn_url(encrypted_media_url, "96")
    if not base:
        return []
    out = []
    for q in qualities:
        url = base
        for other in qualities:
            url = url.replace(f"_{other}.mp4", f"_{q}.mp4")
        out.append({"quality": f"{q}kbps", "url": url})
    return out


def enrich_song(song: dict) -> dict:
    """Add downloadUrl from encrypted_media_url if missing + fix image"""
    if not isinstance(song, dict):
        return song

    # Fix image → always make it array format
    if song.get("image") and isinstance(song["image"], str):
        song["image"] = fix_image_url(song["image"])

    # already has download links (sumit API style)
    if song.get("downloadUrl") or song.get("download_url"):
        return song

    enc = (
        song.get("encrypted_media_url")
        or song.get("encryptedMediaUrl")
        or (song.get("more_info") or {}).get("encrypted_media_url")
    )
    if enc:
        urls = build_download_urls(enc)
        song["downloadUrl"] = urls
        # convenience: best url
        if urls:
            song["media_url"] = urls[-1]["url"]  # 320
    return song


# ---------- HTTP helpers ----------

async def _get(path: str, params: Optional[dict] = None) -> Any:
    async with httpx.AsyncClient(timeout=20.0, headers=HEADERS) as client:
        url = f"{BASE}{path}"
        resp = await client.get(url, params=params or {})
        resp.raise_for_status()
        return resp.json()


async def _native(params: dict) -> Any:
    async with httpx.AsyncClient(timeout=20.0, headers=HEADERS) as client:
        resp = await client.get(JIOSAAVN_NATIVE, params=params)
        resp.raise_for_status()
        # JioSaavn sometimes returns JSON with weird prefix
        text = resp.text
        if text.startswith("{"):
            return resp.json()
        # strip possible callback garbage
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            import json
            return json.loads(text[start : end + 1])
        return resp.json()


# ---------- Search ----------

async def search(query: str, page: int = 0, limit: int = 50) -> Any:
    if USE_NATIVE:
        return await search_native(query, page, limit)
    params = {"query": query, "page": page, "limit": limit}
    return await _get("/search", params)


async def search_songs(query: str, page: int = 0, limit: int = 50) -> Any:
    if USE_NATIVE:
        data = await search_native(query, page, limit)
        return {"path": "native", "data": data}

    params = {"query": query, "page": page, "limit": limit}
    for path in ("/search/songs", "/search"):
        try:
            data = await _get(path, params)
            return {"path": path, "data": data}
        except Exception:
            continue
    return await _get("/search", {"query": query})


async def search_native(query: str, page: int = 1, limit: int = 50) -> Any:
    """Direct JioSaavn web API search + decrypt URLs."""
    params = {
        "__call": "search.getResults",
        "p": max(1, page),
        "q": query,
        "n": limit,
        "_format": "json",
        "_marker": 0,
        "api_version": 4,
        "ctx": "web6dot0",
    }
    raw = await _native(params)

    # normalize results
    results = []
    if isinstance(raw, dict):
        results = (
            raw.get("results")
            or raw.get("songs")
            or (raw.get("data") or {}).get("results")
            or []
        )
        if isinstance(results, dict):
            results = results.get("data") or results.get("results") or []

    enriched = []
    for item in results or []:
        if not isinstance(item, dict):
            continue
        more = item.get("more_info") or {}
        song = {
            "id": item.get("id"),
            "name": item.get("title") or item.get("song") or item.get("name"),
            "type": "song",
            "year": item.get("year"),
            "duration": int(more.get("duration") or item.get("duration") or 0),
            "language": item.get("language"),
            "image": fix_image_url(item.get("image")),
            "url": item.get("perma_url") or item.get("url"),
            "album": {
                "name": more.get("album") or item.get("album"),
                "id": more.get("album_id"),
            },
            "artists": {
                "primary": [
                    {"name": a.strip()}
                    for a in str(
                        more.get("primary_artists")
                        or item.get("primary_artists")
                        or ""
                    ).split(",")
                    if a.strip()
                ]
            },
            "encrypted_media_url": more.get("encrypted_media_url")
            or item.get("encrypted_media_url"),
            "320kbps": more.get("320kbps") or item.get("320kbps"),
        }
        enriched.append(enrich_song(song))

    return {
        "total": len(enriched),
        "results": enriched,
    }


# ---------- Song / Album / etc ----------

async def get_song(song_id: str) -> Any:
    if USE_NATIVE:
        params = {
            "__call": "song.getDetails",
            "pids": song_id,
            "api_version": 4,
            "_format": "json",
            "_marker": 0,
            "ctx": "web6dot0",
        }
        raw = await _native(params)
        data = raw.get(song_id) if isinstance(raw, dict) else None
        if not data and isinstance(raw, dict):
            songs = raw.get("songs") or []
            data = songs[0] if songs else raw
        if isinstance(data, dict):
            if isinstance(data.get("image"), str):
                data["image"] = fix_image_url(data.get("image"))
            return enrich_song(data)
        return raw

    data = await _get(f"/songs/{song_id}")
    if isinstance(data, dict):
        if "data" in data and isinstance(data["data"], list):
            data["data"] = [enrich_song(s) for s in data["data"]]
        else:
            data = enrich_song(data)
    return data


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


async def search_artists(query: str, page: int = 0, limit: int = 20) -> Any:
    params = {"query": query, "page": page, "limit": limit}
    return await _get("/search/artists", params)