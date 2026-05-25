from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from .. import crud, models
import time
from ..config import settings

router = APIRouter(prefix="/api", tags=["public"])

def uptime_seconds() -> int:
    return int(time.time() - settings.boot_time)

def fmt_uptime(secs: int) -> str:
    d, r = divmod(secs, 86400)
    h, r = divmod(r, 3600)
    m, s = divmod(r, 60)
    if d:
        return f"{d}d {h:02d}:{m:02d}:{s:02d}"
    return f"{h:02d}:{m:02d}:{s:02d}"

@router.get("/getRouterStatus")
async def get_router_status(request: Request, db: AsyncSession = Depends(get_db)):
    wan = await crud.get_wan_status(db)
    wifi = await crud.get_wifi_config(db)
    net = await crud.get_network_config(db)
    partner_id = request.query_params.get("partner", "telekom-pl")
    
    return {
        "partner_id": partner_id,
        "internetStatus": "Up" if wan and wan.status == "Up" else "Down",
        "broadbandStatus": "Up", "phoneStatus": "Up",
        "lanStatus": True, "wifiStatus": wifi.enabled_2g or wifi.enabled_5g if wifi else False,
        "wifi_ssid": wifi.ssid_2g if wifi else "",
        "ipAdd": net.lan_ip if net else "",
        "ipv6_address": wan.ipv6 if wan else "",
        "hostname": "magenta.box", "upgradeStatus": False,
    }

@router.get("/getUpgradeStatus")
async def get_upgrade_status():
    return {"upgradeStatus": False}

@router.get("/getDeviceInfo")
async def get_device_info(db: AsyncSession = Depends(get_db)):
    s = await crud.get_system_info(db)
    if not s:
        return {}
    return {
        "serialNum": s.serial, "vendor": "Sagemcom",
        "model": s.model, "uptime": fmt_uptime(uptime_seconds()),
        "oui": "00:11:22", "macAdd": s.mac,
        "swVersion": s.firmware, "bootloader_version": s.bootloader,
    }

@router.get("/getNetworkInfo")
async def get_network_info(db: AsyncSession = Depends(get_db)):
    n = await crud.get_network_config(db)
    w = await crud.get_wan_status(db)
    if not n or not w:
        return {}
    return {
        "primary_dns": n.primary_dns, "secondary_dns": n.secondary_dns,
        "subnetMask": n.lan_subnet, "public_ipv4Address": w.ipv4,
        "public_ipv6Address": w.ipv6, "ipv6Prefix": "2a00:1450:4001:81b::/64",
        "ipv4_lan_cidr": f"{n.lan_ip}/24", "ipv6_lan_address": "fd00::1/64",
        "third_dns": "-", "fourth_dns": "-", "fifth_dns": "-", "sixth_dns": "-",
    }

@router.get("/getPPPOEInfo")
async def get_pppoe_info():
    from datetime import datetime, timezone
    return {
        "pppoe_status": "Up", "pppoe_connection_status": "Connected",
        "alias": "wan_pppoe",
        "last_status_change": datetime.fromtimestamp(settings.boot_time, tz=timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "last_status_error": "ERROR_NONE", "session_id": "0x4242",
    }

@router.get("/getWanType")
async def get_wan_type(request: Request, db: AsyncSession = Depends(get_db)):
    w = await crud.get_wan_status(db)
    partner_id = request.query_params.get("partner", "telekom-pl")
    if not w:
        return {}
    return {
        "GPON_link_status": "O5", "DSL_link_status": "Down", "wanoe_mode": "false",
        "type": w.type, "optical_model": "Sercomm SFP-GPON",
        "gpon_serial_number": "TMPL00000042", "registration_state": "Registered",
        "optical_link_status": "Up",
        "rx_signal_level": f"{w.rx_signal} dBm",
        "tx_signal_level": f"{w.tx_signal} dBm",
        "voltage_level": "3.30 V",
        "signal_fail": "No", "signal_degrade": "No", "frames_lost": "0",
        "gpon_downstream": f"{w.downstream_mbps} Mbps",
        "gpon_upstream": f"{w.upstream_mbps} Mbps",
        "partner_id": partner_id,
    }

@router.get("/getEUTelephoneInfo")
async def get_eu_telephone_info():
    return {
        "registered_phone_numbers": 2,
        "phone_numbers": "+302100000001,+302100000002,+302100000003",
        "phone_numbers_reach": "In_reach,In_reach,Out_of_reach",
        "phone_numbers_uptime": ";1d 2h;0d 5h;-",
    }
