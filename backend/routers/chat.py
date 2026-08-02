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

SYSTEM_PROMPT = """You are Nova, the AI music companion inside Groove — a Spotify-style music app.

Your personality:
- Friendly, concise, a bit witty. Like a smart friend who lives for music.
- You can speak casually in English or Hinglish if the user does.

What you know about Groove:
- Search and play songs (JioSaavn catalog)
- Like songs, playlists, recently played, queue
- Album and artist pages
- Voice commands with wake word "Nova" (e.g. "Nova play Kesariya")
- Mood/language filters on Home (Romantic, Lofi, Party, Hindi, Punjabi, etc.)
- Lyrics button when a song is playing

What you can do:
- Recommend songs for mood, activity, weather, time of day
- Explain app features
- Suggest what to play next based on user's liked/recent songs (if provided)
- When recommending specific tracks, prefer real popular song names

Response format (IMPORTANT):
Always reply with valid JSON only, no markdown fences:
{
  "reply": "your message to the user",
  "action": null or one of "play_search" | "search" | "play_liked" | "show_recent" | "show_home",
  "query": "song or search query if action needs it, else null"
}

Rules:
- If user asks to play something, set action to "play_search" and query to the song/artist name.
- If they only want ideas, action can be null and list 3–5 song ideas in reply.
- Never invent private user data not in the context.
- Keep reply under 120 words unless they ask for a long list.
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

    if re.search(r"\b(who are you|what are you|your name|introduce)\b", t):
        return {
            "reply": "I'm Nova — your music buddy inside Groove. I can recommend songs for any mood, explain features, and even play tracks. Try: “play something chill” or “what can you do?”",
            "action": None,
            "query": None,
        }

    if re.search(r"\b(what can you do|features|help|kaise use)\b", t):
        return {
            "reply": "I can: recommend songs by mood, play a track (“play Kesariya”), open liked/recent, and explain Groove (search, playlists, voice “Nova play …”, filters on Home). What mood are you in?",
            "action": None,
            "query": None,
        }

    if re.search(r"\b(liked|favourites|favorites)\b", t):
        return {
            "reply": "Opening your liked songs.",
            "action": "play_liked",
            "query": None,
        }

    if re.search(r"\b(recent|history)\b", t):
        return {
            "reply": "Here's your recently played.",
            "action": "show_recent",
            "query": None,
        }

    play = re.search(r"(?:play|chalao)\s+(.+)", t)
    if play:
        q = play.group(1).strip()
        return {
            "reply": f"Playing {q} for you.",
            "action": "play_search",
            "query": q,
        }

    mood_map = [
        (r"\b(sad|upset|heartbroken|dukhi|rona)\b", "sad emotional songs arijit"),
        (r"\b(happy|party|celebrate|maza)\b", "party dance bollywood hits"),
        (r"\b(chill|lofi|relax|study|sleep)\b", "lofi chill beats"),
        (r"\b(gym|workout|energy|pump)\b", "workout gym motivation songs"),
        (r"\b(romantic|love|crush|pyar)\b", "romantic bollywood songs"),
        (r"\b(focus|concentrate|coding)\b", "instrumental focus lo-fi"),
        (r"\b(devotional|bhajan|spiritual)\b", "devotional bhajan"),
        (r"\b(rainy|barish|monsoon)\b", "rainy day hindi songs"),
    ]
    for pat, q in mood_map:
        if re.search(pat, t):
            return {
                "reply": f"For that mood, try this vibe — playing a mix around “{q}”.",
                "action": "play_search",
                "query": q,
            }

    if re.search(r"\b(recommend|suggest|suggestion|kya sunu|what should i listen)\b", t):
        return {
            "reply": "Tell me your mood (chill, sad, party, gym, romantic) or say “play [song name]”. I can also use your recent/liked taste when the AI key is configured.",
            "action": None,
            "query": None,
        }

    return {
        "reply": "I'm Nova. Ask me for a mood playlist, say “play [song]”, or ask what Groove can do. (Tip: add GROQ_API_KEY or GEMINI_API_KEY in backend .env for smarter ChatGPT-style replies.)",
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


async def call_groq(messages: List[Dict[str, str]]) -> str:
    key = os.getenv("GROQ_API_KEY")
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
                "temperature": 0.7,
                "max_tokens": 500,
            },
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


def _clean_key(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    val = val.strip().strip('"').strip("'")
    return val or None


def _clean_key(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    val = val.strip().strip('"').strip("'")
    return val or None


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

    # Prefer official systemInstruction; also prefix first user msg as backup
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
    # Current Gemini API model IDs (2026) — skip shut-down names
    models += [
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-flash-latest",
    ]
    seen = set()
    models = [m for m in models if m and not (m in seen or seen.add(m))]

    # Also try listing models available for this API key
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
    key = os.getenv("OPENAI_API_KEY")
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
                "temperature": 0.7,
                "max_tokens": 500,
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
        # graceful fallback
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
    # if user forced gemini but no key → rules
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
