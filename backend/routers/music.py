from fastapi import APIRouter, HTTPException, Query
from services import saavn

router = APIRouter()


@router.get("/search")
async def search_music(
    query: str = Query(..., min_length=1),
    page: int = 0,
    limit: int = 50,
):
    try:
        data = await saavn.search_songs(query, page, limit)
        return {"success": True, "data": data, "page": page, "limit": limit}
    except Exception as e:
        try:
            data = await saavn.search(query, page, limit)
            return {"success": True, "data": data, "page": page, "limit": limit}
        except Exception as e2:
            raise HTTPException(
                status_code=502, detail=f"Saavn search failed: {str(e2)}"
            )


@router.get("/song/{song_id}")
async def get_song(song_id: str):
    try:
        data = await saavn.get_song(song_id)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch song: {str(e)}")


@router.get("/song/{song_id}/lyrics")
async def get_lyrics(song_id: str):
    try:
        data = await saavn.get_lyrics(song_id)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Lyrics not found: {str(e)}")


@router.get("/songs")
async def get_songs(ids: str = Query(...)):
    try:
        data = await saavn.get_songs_by_ids(ids)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/album/{album_id}")
async def get_album(album_id: str):
    try:
        data = await saavn.get_album(album_id)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/playlist/{playlist_id}")
async def get_playlist(playlist_id: str):
    try:
        data = await saavn.get_playlist(playlist_id)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/artist/{artist_id}")
async def get_artist(artist_id: str):
    try:
        data = await saavn.get_artist(artist_id)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/home")
async def home():
    try:
        data = await saavn.get_home()
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/charts")
async def charts():
    try:
        data = await saavn.get_charts()
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
