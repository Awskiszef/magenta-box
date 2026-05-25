import asyncio
import os
import time

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from .. import schemas, models, auth, crud
from ..config import settings
from .public import fmt_uptime, uptime_seconds
from sqlalchemy import select
import re

_HOST_RE = re.compile(r"^[A-Za-z0-9.\-:]+$")

def _safe_host(h: str) -> bool:
    return bool(_HOST_RE.match(h)) and len(h) <= 100

router = APIRouter(prefix="/api/admin", tags=["admin"])

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    username = auth.get_current_user_from_cookie(request)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    res = await db.execute(select(models.User).filter_by(username=username))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.get("/summary")
async def get_summary(user: models.User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    import random
    devices = await crud.get_devices(db)
    wan = await crud.get_wan_status(db)
    wifi = await crud.get_wifi_config(db)
    sysinfo = await crud.get_system_info(db)
    
    total_rx = sum(d.rx for d in devices)
    total_tx = sum(d.tx for d in devices)
    
    return {
        "ts": time.time(),
        "uptime": fmt_uptime(uptime_seconds()),
        "uptime_seconds": uptime_seconds(),
        "wan": {c.name: getattr(wan, c.name) for c in wan.__table__.columns} if wan else {},
        "wifi": {
            "ssid_2g": wifi.ssid_2g if wifi else "",
            "ssid_5g": wifi.ssid_5g if wifi else "",
            "enabled_2g": wifi.enabled_2g if wifi else False,
            "enabled_5g": wifi.enabled_5g if wifi else False,
        },
        "throughput": {
            "rx_mbps": round(total_rx + random.uniform(-2, 2), 1),
            "tx_mbps": round(total_tx + random.uniform(-1, 1), 1),
        },
        "devices_count": len(devices),
        "system": {c.name: getattr(sysinfo, c.name) for c in sysinfo.__table__.columns} if sysinfo else {},
    }

@router.get("/wifi")
async def get_wifi(user: models.User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await crud.get_wifi_config(db)

@router.post("/wifi")
async def update_wifi(config: schemas.WifiConfigBase, user: models.User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    updated = await crud.update_wifi_config(db, config)
    await crud.add_log(db, "info", f"wifi config updated by {user.username}")
    return {"ok": True, "wifi": updated}

@router.get("/network")
async def get_network(user: models.User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await crud.get_network_config(db)

@router.post("/network")
async def update_network(config: schemas.NetworkConfigBase, user: models.User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    updated = await crud.update_network_config(db, config)
    await crud.add_log(db, "info", f"network config updated by {user.username}")
    return {"ok": True, "network": updated}

@router.get("/devices")
async def get_devices_api(user: models.User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    devices = await crud.get_devices(db)
    return {"devices": devices}

@router.get("/system")
async def get_system(user: models.User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    s = await crud.get_system_info(db)
    if not s:
        return {}
    res = {c.name: getattr(s, c.name) for c in s.__table__.columns}
    res["uptime"] = fmt_uptime(uptime_seconds())
    res["uptime_seconds"] = uptime_seconds()
    return res

@router.get("/logs")
async def get_logs_api(user: models.User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    logs = await crud.get_logs(db, 200)
    return {"logs": logs}

@router.post("/restart")
async def restart(user: models.User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await crud.add_log(db, "warn", f"router restart requested by {user.username}")
    
    async def _restart():
        await asyncio.sleep(6)
        settings.boot_time = time.time()
        from ..database import AsyncSessionLocal
        async with AsyncSessionLocal() as db_local:
            await crud.add_log(db_local, "info", "router booted")
            
    asyncio.create_task(_restart())
    return {"ok": True, "delay_seconds": 6}

@router.post("/factory_reset")
async def factory_reset(user: models.User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await crud.add_log(db, "warn", f"factory reset requested by {user.username}")
    from ..database import engine
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.drop_all)
        await conn.run_sync(models.Base.metadata.create_all)
    await crud.init_db(db)
    settings.boot_time = time.time()
    return {"ok": True}

class PingRequest(schemas.BaseModel):
    host: str

@router.post("/diagnostics/ping")
async def ping_diag(req: PingRequest, user: models.User = Depends(get_current_user)):
    host = req.host.strip()
    if not host or not _safe_host(host):
        return JSONResponse(status_code=400, content={"ok": False, "error": "Invalid host"})
    
    cmd = ["ping", "-n" if os.name == "nt" else "-c", "4", host]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return {"ok": True, "host": host, "output": "[timeout]"}
        output = stdout.decode(errors="replace") + (
            "\n" + stderr.decode(errors="replace") if stderr else ""
        )
        return {"ok": True, "host": host, "output": output}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.post("/diagnostics/traceroute")
async def tracert_diag(req: PingRequest, user: models.User = Depends(get_current_user)):
    host = req.host.strip()
    if not host or not _safe_host(host):
        return JSONResponse(status_code=400, content={"ok": False, "error": "Invalid host"})
    
    if os.name == "nt":
        cmd = ["tracert", "-h", "10", "-w", "1500", host]
    else:
        cmd = ["traceroute", "-m", "10", "-w", "2", host]
        
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=20)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return {"ok": True, "host": host, "output": "[timeout]"}
        output = stdout.decode(errors="replace") + (
            "\n" + stderr.decode(errors="replace") if stderr else ""
        )
        return {"ok": True, "host": host, "output": output}
    except Exception as e:
        return {"ok": False, "error": str(e)}
