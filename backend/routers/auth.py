from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .. import schemas, models, auth, crud
from ..database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/me")
async def get_me(request: Request):
    user = auth.get_current_user_from_cookie(request)
    return {"authenticated": user is not None, "user": user}

@router.post("/login")
async def login(user_data: schemas.User, response: Response, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.User).filter_by(username=user_data.username))
    user = res.scalar_one_or_none()
    
    if not user or not auth.verify_password(user_data.password, user.hashed_password):
        await crud.add_log(db, "warn", f"login failed: {user_data.username!r}")
        return JSONResponse(status_code=401, content={"ok": False, "error": "Invalid credentials"})
    
    access_token = auth.create_access_token(data={"sub": user.username})
    response.set_cookie(key="session", value=access_token, httponly=True, samesite="lax")
    await crud.add_log(db, "info", f"login success: {user.username}")
    return {"ok": True, "user": user.username}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="session", path="/")
    return {"ok": True}
