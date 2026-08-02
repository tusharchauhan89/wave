from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
from utils.supabase_client import supabase

router = APIRouter()


class SignUp(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class SignIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup")
async def signup(body: SignUp):
    try:
        res = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {
                    "full_name": body.full_name or body.email.split("@")[0]
                }
            }
        })
        if res.user:
            # create profile
            try:
                supabase.table("profiles").upsert({
                    "id": res.user.id,
                    "username": body.email.split("@")[0],
                    "full_name": body.full_name or body.email.split("@")[0]
                }).execute()
            except Exception:
                pass
        return {
            "success": True,
            "user": res.user.model_dump() if res.user else None,
            "session": res.session.model_dump() if res.session else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin")
async def signin(body: SignIn):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password
        })
        return {
            "success": True,
            "user": res.user.model_dump() if res.user else None,
            "session": res.session.model_dump() if res.session else None
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/signout")
async def signout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        try:
            supabase.auth.sign_out()
        except Exception:
            pass
    return {"success": True}


@router.get("/me")
async def me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        profile = supabase.table("profiles").select("*").eq("id", user.user.id).single().execute()
        return {
            "success": True,
            "user": user.user.model_dump(),
            "profile": profile.data
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
