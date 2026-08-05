from fastapi import APIRouter
from pydantic import BaseModel
import re

router = APIRouter()


class VoiceCommand(BaseModel):
    text: str


@router.post("/parse")
async def parse_command(body: VoiceCommand):
    """Rule-based parser — English + common Hindi transliterations."""
    raw = body.text.strip()
    text = raw.lower()
    # keep hindi letters, strip other punctuation
    text = re.sub(r"[^\w\s\u0900-\u097F]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    def clean_q(q: str) -> str:
        q = re.sub(r"^(the|a|an|song|gaana|gana|please)\s+", "", q.strip())
        q = re.sub(r"\s+(please|song|gaana|gana)$", "", q)
        return q.strip()

    # Play song
    m = re.search(
        r"(?:play|start|chalao|chala\s*do|gaana\s*chalao)\s+(.+)", text
    )
    if m and "liked" not in text and "playlist" not in text:
        q = clean_q(m.group(1))
        if q and q not in ("song", "music", "gaana"):
            return {"action": "play_search", "query": q, "original": raw}

    if re.search(r"\b(pause|stop|ruk|roko|band)\b", text):
        return {"action": "pause", "original": raw}

    if re.search(r"\b(resume|continue|unpause|dobara)\b", text):
        return {"action": "resume", "original": raw}

    if re.search(r"\b(next|skip|aage|agli|agla)\b", text):
        return {"action": "next", "original": raw}

    if re.search(r"\b(previous|prev|back|peeche|pichla)\b", text):
        return {"action": "previous", "original": raw}

    if re.search(r"volume\s*(up|high)|louder|awaz\s*badhao|volume\s*badhao|tez", text):
        return {"action": "volume_up", "original": raw}

    if re.search(r"volume\s*(down|low|kam)|softer|awaz\s*kam|volume\s*kam|dhime", text):
        return {"action": "volume_down", "original": raw}

    if re.search(r"\b(unmute)\b", text):
        return {"action": "unmute", "original": raw}

    if re.search(r"\b(mute|chup)\b", text):
        return {"action": "mute", "original": raw}

    if re.search(r"\b(liked|favourite|favorite|pasand)\b", text):
        return {"action": "play_liked", "original": raw}

    m = re.search(r"(?:search|khojo|dhundo|find)\s+(.+)", text)
    if m:
        return {"action": "search", "query": clean_q(m.group(1)), "original": raw}

    # bare song name fallback if short phrase
    if 1 <= len(text.split()) <= 6 and not re.search(
        r"\b(what|who|how|when|where|why)\b", text
    ):
        return {"action": "play_search", "query": clean_q(text), "original": raw}

    return {
        "action": "unknown",
        "message": "Sorry, I didn't understand that command.",
        "original": raw,
    }