"""
Nova Chat — music companion powered by optional LLM (Groq / Gemini / OpenAI).
Falls back to rule-based replies if no API key is set.
"""
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import re
import json
import httpx
from utils.supabase_client import supabase

router = APIRouter()

SYSTEM_PROMPT = """You are Nova, the AI music companion inside Groove — a modern music streaming app (like Spotify, powered by JioSaavn).

PERSONALITY:
- Warm, concise, slightly witty. Talk like a cool music-obsessed friend.
- Match the user's language: if they use Hinglish/Hindi, reply in Hinglish. Otherwise English.
- Never be robotic or overly formal.

WHAT YOU CAN DO:
1. Play any song/artist → action: "play_search", query: "song or artist name"
2. Recommend songs for mood/activity/weather → list 3-5 real popular songs + optionally play one
3. Open liked songs → action: "play_liked"
4. Show recently played → action: "show_recent"
5. Go to home → action: "show_home"
6. Search without playing → action: "search", query: "..."

STRICT RESPONSE FORMAT (JSON only, no markdown, no extra text):
{
  "reply": "short friendly message under 80 words",
  "action": null | "play_search" | "search" | "play_liked" | "show_recent" | "show_home",
  "query": "search query string if needed, else null"
}

RULES:
- When user says "play X" / "chalao X" / "gaana chalao" → always set action "play_search" and put the song/artist in query.
- For pure recommendations (no play request) → action null, list 3-5 real song names in reply.
- Prefer real popular Indian + international tracks that actually exist on JioSaavn.
- Use the User context (liked + recently played) to personalize when available.
- Never invent private data.
- Keep reply short and natural.
"""


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


def get_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        user = supabase.auth.get_user(token)
        if user and user.user:
            return str(user.user.id)
    except Exception:
        pass
    return None


def build_user_context(user_id: Optional[str]) -> str:
    if not user_id:
        return "User is not logged in or unknown."
    parts = [f"user_id: {user_id}"]
    try:
        liked = (
            supabase.table("liked_songs")
            .select("song_data")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(8)
            .execute()
        )
        names = []
        for row in liked.data or []:
            sd = row.get("song_data") or {}
            n = sd.get("name") or sd.get("title") or sd.get("song")
            if n:
                names.append(str(n))
        if names:
            parts.append("Liked songs: " + ", ".join(names))
    except Exception:
        pass
    try:
        hist = (
            supabase.table("listening_history")
            .select("song_data")
            .eq("user_id", user_id)
            .order("played_at", desc=True)
            .limit(8)
            .execute()
        )
        names = []
        seen = set()
        for row in hist.data or []:
            sd = row.get("song_data") or {}
            n = sd.get("name") or sd.get("title") or sd.get("song")
            if n and n not in seen:
                seen.add(n)
                names.append(str(n))
        if names:
            parts.append("Recently played: " + ", ".join(names[:8]))
    except Exception:
        pass
    return "\n".join(parts)


def rule_based_reply(message: str, context: str) -> Dict[str, Any]:
    t = message.lower().strip()

    # Play intent (stronger)
    play = re.search(r"(?:play|chalao|sunao|gaana chalao|put on)\s+(.+)", t, re.I)
    if play:
        q = play.group(1).strip().rstrip(".!?")
        return {
            "reply": f"Playing {q} for you 🎵",
            "action": "play_search",
            "query": q,
        }

    # Mood map (better queries)
    mood_map = [
        (r"\b(sad|upset|heartbroken|dukhi|rona|breakup)\b", "sad emotional arijit singh"),
        (r"\b(happy|party|celebrate|maza|dance)\b", "party bollywood dance hits"),
        (r"\b(chill|lofi|relax|study|sleep|calm)\b", "lofi chill beats"),
        (r"\b(gym|workout|energy|pump|motivation)\b", "gym workout motivation songs"),
        (r"\b(romantic|love|crush|pyar|ishq)\b", "romantic bollywood songs"),
        (r"\b(focus|concentrate|coding|study music)\b", "instrumental focus lofi"),
        (r"\b(devotional|bhajan|spiritual|aarti)\b", "devotional bhajan"),
        (r"\b(rainy|barish|monsoon|barsaat)\b", "rainy day hindi songs"),
        (r"\b(punjabi|bhangra)\b", "punjabi party hits"),
        (r"\b(english|pop|international)\b", "english pop hits"),
    ]
    for pat, q in mood_map:
        if re.search(pat, t):
            return {
                "reply": f"Got the vibe 🔥 Playing a mix for you...",
                "action": "play_search",
                "query": q,
            }

    if re.search(r"\b(liked|favourites|favorites|pasand)\b", t):
        return {"reply": "Opening your liked songs ❤️", "action": "play_liked", "query": None}

    if re.search(r"\b(recent|history|recently played)\b", t):
        return {"reply": "Here's what you played recently.", "action": "show_recent", "query": None}

    if re.search(r"\b(who are you|what are you|your name)\b", t):
        return {
            "reply": "I'm Nova 🎵 — your music buddy inside Groove. Tell me a mood or say “play [song name]”.",
            "action": None,
            "query": None,
        }

    if re.search(r"\b(what can you do|help|features)\b", t):
        return {
            "reply": "I can play any song, recommend by mood (sad, party, lofi, gym…), open your liked/recent tracks. Just say “play Kesariya” or “I’m feeling sad”.",
            "action": None,
            "query": None,
        }

    return {
        "reply": "Tell me a mood or say “play [song name]”. I’m listening 🎧",
        "action": None,
        "query": None,
    }


def parse_json_reply(text: str) -> Dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
        return {
            "reply": data.get("reply") or data.get("message") or str(data),
            "action": data.get("action"),
            "query": data.get("query"),
        }
    except Exception:
        return {"reply": text, "action": None, "query": None}


def _clean_key(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    val = val.strip().strip('"').strip("'")
    return val or None


async def call_groq(messages: List[Dict[str, str]]) -> str:
    key = _clean_key(os.getenv("GROQ_API_KEY"))
    if not key:
        raise RuntimeError("no groq key")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    async with httpx.AsyncClient(timeout=45.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.6,
                "max_tokens": 350,
            },
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def call_gemini(messages: List[Dict[str, str]]) -> str:
    key = _clean_key(os.getenv("GEMINI_API_KEY"))
    if not key:
        raise RuntimeError("GEMINI_API_KEY missing in .env")

    system = ""
    contents = []
    for m in messages:
        if m["role"] == "system":
            system += m["content"] + "\n"
        elif m["role"] == "user":
            contents.append({"role": "user", "parts": [{"text": m["content"]}]})
        else:
            contents.append({"role": "model", "parts": [{"text": m["content"]}]})

    if not contents:
        contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

    body: Dict[str, Any] = {"contents": contents}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
        contents[0]["parts"][0]["text"] = (
            "Follow the system instructions. Respond with JSON only as specified.\n\n"
            + contents[0]["parts"][0]["text"]
        )

    models = []
    preferred = os.getenv("GEMINI_MODEL", "").strip()
    if preferred:
        models.append(preferred)
    models += [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-flash-latest",
    ]
    seen = set()
    models = [m for m in models if m and not (m in seen or seen.add(m))]

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            lr = await client.get(
                "https://generativelanguage.googleapis.com/v1beta/models?key=" + key
            )
            if lr.status_code == 200:
                for m in (lr.json().get("models") or []):
                    name = (m.get("name") or "").replace("models/", "")
                    methods = m.get("supportedGenerationMethods") or m.get("supported_generation_methods") or []
                    if name and "generateContent" in methods and name not in seen:
                        models.insert(0, name)
                        seen.add(name)
    except Exception as e:
        print("ListModels failed:", e)

    last_err = None
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in models:
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                + model
                + ":generateContent?key="
                + key
            )
            try:
                r = await client.post(url, json=body)
                if r.status_code >= 400:
                    last_err = f"{model}: HTTP {r.status_code} {r.text[:300]}"
                    print("Gemini error:", last_err)
                    continue
                data = r.json()
                if "error" in data:
                    last_err = f"{model}: {data['error']}"
                    print("Gemini error:", last_err)
                    continue
                cands = data.get("candidates") or []
                if not cands:
                    last_err = f"{model}: no candidates {str(data)[:200]}"
                    continue
                parts = cands[0].get("content", {}).get("parts") or []
                if not parts:
                    last_err = f"{model}: empty parts"
                    continue
                return parts[0].get("text") or ""
            except Exception as e:
                last_err = f"{model}: {e}"
                print("Gemini exception:", last_err)
                continue
    raise RuntimeError(last_err or "Gemini failed")


async def call_openai(messages: List[Dict[str, str]]) -> str:
    key = _clean_key(os.getenv("OPENAI_API_KEY"))
    if not key:
        raise RuntimeError("no openai key")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    async with httpx.AsyncClient(timeout=45.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.6,
                "max_tokens": 350,
            },
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


@router.post("/")
async def chat(
    body: ChatRequest,
    authorization: Optional[str] = Header(None),
):
    if not body.message or not body.message.strip():
        raise HTTPException(400, "Empty message")

    user_id = get_user_id(authorization)
    context = build_user_context(user_id)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + "\n\nUser context:\n" + context},
    ]
    for h in (body.history or [])[-8:]:
        role = "assistant" if h.role == "assistant" else "user"
        messages.append({"role": role, "content": h.content})
    messages.append({"role": "user", "content": body.message.strip()})

    provider = (os.getenv("CHAT_PROVIDER") or "").lower().strip()
    has_groq = bool(_clean_key(os.getenv("GROQ_API_KEY")))
    has_gemini = bool(_clean_key(os.getenv("GEMINI_API_KEY")))
    has_openai = bool(_clean_key(os.getenv("OPENAI_API_KEY")))

    if not provider:
        if has_groq:
            provider = "groq"
        elif has_gemini:
            provider = "gemini"
        elif has_openai:
            provider = "openai"
        else:
            provider = "rules"
    if provider == "gemini" and not has_gemini:
        provider = "rules"
    if provider == "groq" and not has_groq:
        provider = "rules"
    if provider == "openai" and not has_openai:
        provider = "rules"

    try:
        if provider == "groq":
            raw = await call_groq(messages)
            result = parse_json_reply(raw)
        elif provider == "gemini":
            raw = await call_gemini(messages)
            result = parse_json_reply(raw)
        elif provider == "openai":
            raw = await call_openai(messages)
            result = parse_json_reply(raw)
        else:
            result = rule_based_reply(body.message, context)
    except Exception as e:
        result = rule_based_reply(body.message, context)
        err = str(e)[:300]
        result["reply"] = (
            result["reply"]
            + "\n\n(Offline mode — AI error: "
            + err
            + ")"
        )
        result["_error"] = err
        print("CHAT PROVIDER ERROR:", err)

    result["provider"] = provider
    return {"success": True, "data": result}


@router.get("/status")
async def chat_status():
    provider = (os.getenv("CHAT_PROVIDER") or "").lower().strip()
    has_groq = bool(_clean_key(os.getenv("GROQ_API_KEY")))
    has_gemini = bool(_clean_key(os.getenv("GEMINI_API_KEY")))
    has_openai = bool(_clean_key(os.getenv("OPENAI_API_KEY")))

    if not provider:
        if has_groq:
            provider = "groq"
        elif has_gemini:
            provider = "gemini"
        elif has_openai:
            provider = "openai"
        else:
            provider = "rules"
    if provider == "gemini" and not has_gemini:
        provider = "rules"
    if provider == "groq" and not has_groq:
        provider = "rules"
    if provider == "openai" and not has_openai:
        provider = "rules"

    return {
        "success": True,
        "provider": provider,
        "smart": provider != "rules",
        "keys": {
            "gemini": has_gemini,
            "groq": has_groq,
            "openai": has_openai,
        },
    }