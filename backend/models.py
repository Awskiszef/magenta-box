from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class WifiConfig(Base):
    __tablename__ = "wifi_config"
    id = Column(Integer, primary_key=True, index=True)
    ssid_2g = Column(String)
    ssid_5g = Column(String)
    password = Column(String)
    channel_2g = Column(String)
    channel_5g = Column(String)
    enabled_2g = Column(Boolean)
    enabled_5g = Column(Boolean)
    guest_enabled = Column(Boolean)
    guest_ssid = Column(String)

class NetworkConfig(Base):
    __tablename__ = "network_config"
    id = Column(Integer, primary_key=True, index=True)
    primary_dns = Column(String)
    secondary_dns = Column(String)
    lan_ip = Column(String)
    lan_subnet = Column(String)
    dhcp_start = Column(String)
    dhcp_end = Column(String)

class SystemInfo(Base):
    __tablename__ = "system_info"
    id = Column(Integer, primary_key=True, index=True)
    model = Column(String)
    serial = Column(String)
    firmware = Column(String)
    bootloader = Column(String)
    mac = Column(String)

class WanStatus(Base):
    __tablename__ = "wan_status"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    status = Column(String)
    ipv4 = Column(String)
    ipv6 = Column(String)
    rx_signal = Column(Float)
    tx_signal = Column(Float)
    downstream_mbps = Column(Integer)
    upstream_mbps = Column(Integer)

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    mac = Column(String, unique=True, index=True)
    ip = Column(String)
    iface = Column(String)
    rssi = Column(Integer, nullable=True)
    rx = Column(Float)
    tx = Column(Float)

class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    ts = Column(String)
    level = Column(String)
    msg = Column(String)
