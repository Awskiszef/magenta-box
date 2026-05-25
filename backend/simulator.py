import asyncio
import random
import time
from .database import AsyncSessionLocal
from . import crud, models
from .event_hub import hub
from .config import settings

async def simulator_task():
    async with AsyncSessionLocal() as db:
        await crud.add_log(db, "info", "router booted, simulator started")
    
    msgs_info = [
        "DHCP lease renewed for {ip}",
        "WiFi client {mac} associated on {iface}",
        "DNS query resolved (cache hit)",
        "PPPoE keepalive ok",
        "GPON OMCI heartbeat",
    ]
    msgs_warn = [
        "WiFi client {mac} weak signal ({rssi} dBm)",
        "DNS upstream slow ({ms} ms)",
        "Optical RX signal degraded ({rx} dBm)",
    ]
    
    def uptime_seconds():
        return int(time.time() - settings.boot_time)

    def fmt_uptime(secs: int) -> str:
        d, r = divmod(secs, 86400)
        h, r = divmod(r, 3600)
        m, s = divmod(r, 60)
        if d:
            return f"{d}d {h:02d}:{m:02d}:{s:02d}"
        return f"{h:02d}:{m:02d}:{s:02d}"

    while True:
        await asyncio.sleep(random.uniform(2.0, 5.0))
        async with AsyncSessionLocal() as db:
            try:
                devices = await crud.get_devices(db)
                wan = await crud.get_wan_status(db)
                
                for d in devices:
                    d.rx = max(0.0, d.rx + random.uniform(-3.0, 5.0))
                    d.tx = max(0.0, d.tx + random.uniform(-1.0, 1.5))
                    if d.rssi is not None:
                        d.rssi = max(-90, min(-30, d.rssi + random.choice([-1, 0, 1])))
                
                if wan:
                    wan.rx_signal = round(-18.0 + random.uniform(-1.5, 1.5), 1)
                
                await db.commit()
                
                new_logs = []
                if devices and random.random() < 0.6:
                    d = random.choice(devices)
                    log = await crud.add_log(db, "info", random.choice(msgs_info).format(
                        ip=d.ip, mac=d.mac, iface=d.iface))
                    new_logs.append(log)
                elif devices:
                    d = random.choice(devices)
                    log = await crud.add_log(db, "warn", random.choice(msgs_warn).format(
                        mac=d.mac, rssi=d.rssi or -70,
                        ms=random.randint(120, 800),
                        rx=wan.rx_signal if wan else -18.0))
                    new_logs.append(log)
                    
                wifi = await crud.get_wifi_config(db)
                sysinfo = await crud.get_system_info(db)
                
                total_rx = sum(d.rx for d in devices)
                total_tx = sum(d.tx for d in devices)
                
                payload = {
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
                
                await hub.publish("tick", payload)
                if new_logs:
                    logs_data = [{"ts": l.ts, "level": l.level, "msg": l.msg} for l in new_logs]
                    await hub.publish("logs", logs_data)
                        
            except Exception as e:
                import logging
                logging.error(f"[sim] error: {e}")
                await db.rollback()
