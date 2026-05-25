from pydantic import BaseModel
from typing import Optional, List

class User(BaseModel):
    username: str
    password: str

class WifiConfigBase(BaseModel):
    ssid_2g: Optional[str] = None
    ssid_5g: Optional[str] = None
    password: Optional[str] = None
    channel_2g: Optional[str] = None
    channel_5g: Optional[str] = None
    enabled_2g: Optional[bool] = None
    enabled_5g: Optional[bool] = None
    guest_enabled: Optional[bool] = None
    guest_ssid: Optional[str] = None

class WifiConfig(WifiConfigBase):
    class Config:
        from_attributes = True

class NetworkConfigBase(BaseModel):
    primary_dns: Optional[str] = None
    secondary_dns: Optional[str] = None
    lan_ip: Optional[str] = None
    lan_subnet: Optional[str] = None
    dhcp_start: Optional[str] = None
    dhcp_end: Optional[str] = None

class NetworkConfig(NetworkConfigBase):
    class Config:
        from_attributes = True

class Device(BaseModel):
    name: str
    mac: str
    ip: str
    iface: str
    rssi: Optional[int] = None
    rx: float
    tx: float
    
    class Config:
        from_attributes = True

class SystemInfo(BaseModel):
    model: str
    serial: str
    firmware: str
    bootloader: str
    mac: str
    
    class Config:
        from_attributes = True

class Log(BaseModel):
    ts: str
    level: str
    msg: str
    
    class Config:
        from_attributes = True

class WanStatus(BaseModel):
    type: str
    status: str
    ipv4: str
    ipv6: str
    rx_signal: float
    tx_signal: float
    downstream_mbps: int
    upstream_mbps: int
    
    class Config:
        from_attributes = True
