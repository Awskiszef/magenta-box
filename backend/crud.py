from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from . import models, schemas
from .auth import get_password_hash

async def init_db(db: AsyncSession):
    # Check if admin user exists
    res = await db.execute(select(models.User).filter_by(username="admin"))
    user = res.scalar_one_or_none()
    if not user:
        user = models.User(username="admin", hashed_password=get_password_hash("admin"))
        db.add(user)
    
    # Check if wifi config exists
    res = await db.execute(select(models.WifiConfig))
    if not res.scalar_one_or_none():
        db.add(models.WifiConfig(
            ssid_2g="Telekom-DEMO-2.4G",
            ssid_5g="Telekom-DEMO-5G",
            password="ChangeMe123!",
            channel_2g="auto",
            channel_5g="auto",
            enabled_2g=True,
            enabled_5g=True,
            guest_enabled=False,
            guest_ssid="Telekom-GUEST"
        ))
        
    res = await db.execute(select(models.NetworkConfig))
    if not res.scalar_one_or_none():
        db.add(models.NetworkConfig(
            primary_dns="8.8.8.8",
            secondary_dns="1.1.1.1",
            lan_ip="192.168.1.1",
            lan_subnet="255.255.255.0",
            dhcp_start="192.168.1.100",
            dhcp_end="192.168.1.200"
        ))
        
    res = await db.execute(select(models.SystemInfo))
    if not res.scalar_one_or_none():
        db.add(models.SystemInfo(
            model="Sagemcom FAST5670",
            serial="DEMO123456789",
            firmware="1.2.3-demo",
            bootloader="U-Boot 2020.04-demo",
            mac="AA:BB:CC:DD:EE:FF"
        ))
        
    res = await db.execute(select(models.WanStatus))
    if not res.scalar_one_or_none():
        db.add(models.WanStatus(
            type="GPON",
            status="Up",
            ipv4="85.222.10.42",
            ipv6="2a00:1450:4001:81b::200e",
            rx_signal=-18.4,
            tx_signal=2.3,
            downstream_mbps=1000,
            upstream_mbps=1000
        ))
        
    res = await db.execute(select(models.Device))
    if not res.scalars().first():
        devices = [
            {"name": "Dev-Laptop", "mac": "AA:BB:CC:11:22:33", "ip": "192.168.1.101", "iface": "wifi-5g", "rssi": -42, "rx": 145.2, "tx": 22.1},
            {"name": "iPhone-15", "mac": "AA:BB:CC:11:22:34", "ip": "192.168.1.102", "iface": "wifi-5g", "rssi": -58, "rx": 12.0, "tx": 3.4},
            {"name": "Smart-TV-LG", "mac": "AA:BB:CC:11:22:35", "ip": "192.168.1.103", "iface": "wifi-2g", "rssi": -67, "rx": 320.5, "tx": 5.2},
            {"name": "PS5-Console", "mac": "AA:BB:CC:11:22:36", "ip": "192.168.1.104", "iface": "ethernet", "rssi": None, "rx": 88.3, "tx": 14.7},
            {"name": "Printer-HP", "mac": "AA:BB:CC:11:22:37", "ip": "192.168.1.105", "iface": "wifi-2g", "rssi": -71, "rx": 0.1, "tx": 0.0},
            {"name": "Echo-Kitchen", "mac": "AA:BB:CC:11:22:38", "ip": "192.168.1.106", "iface": "wifi-2g", "rssi": -64, "rx": 1.2, "tx": 0.4},
        ]
        for d in devices:
            db.add(models.Device(**d))
            
    await db.commit()

async def get_wifi_config(db: AsyncSession):
    res = await db.execute(select(models.WifiConfig))
    return res.scalar_one_or_none()

async def update_wifi_config(db: AsyncSession, config: schemas.WifiConfigBase):
    db_config = await get_wifi_config(db)
    update_data = config.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_config, key, value)
    await db.commit()
    await db.refresh(db_config)
    return db_config

async def get_network_config(db: AsyncSession):
    res = await db.execute(select(models.NetworkConfig))
    return res.scalar_one_or_none()

async def update_network_config(db: AsyncSession, config: schemas.NetworkConfigBase):
    db_config = await get_network_config(db)
    update_data = config.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_config, key, value)
    await db.commit()
    await db.refresh(db_config)
    return db_config

async def get_devices(db: AsyncSession):
    res = await db.execute(select(models.Device))
    return res.scalars().all()

async def get_system_info(db: AsyncSession):
    res = await db.execute(select(models.SystemInfo))
    return res.scalar_one_or_none()

async def get_wan_status(db: AsyncSession):
    res = await db.execute(select(models.WanStatus))
    return res.scalar_one_or_none()

async def add_log(db: AsyncSession, level: str, msg: str):
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    log = models.Log(ts=ts, level=level, msg=msg)
    db.add(log)
    await db.commit()
    
    # keep only last 500
    res = await db.execute(select(func.count(models.Log.id)))
    count = res.scalar_one()
    if count > 500:
        res = await db.execute(select(models.Log).order_by(models.Log.id.asc()).limit(1))
        oldest = res.scalar_one_or_none()
        if oldest:
            await db.delete(oldest)
            await db.commit()
    return log

async def get_logs(db: AsyncSession, limit: int = 200):
    res = await db.execute(select(models.Log).order_by(models.Log.id.desc()).limit(limit))
    return res.scalars().all()[::-1]
