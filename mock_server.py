"""
Advanced mock backend for the Telekom router landing + admin panel.

Run:
    python mock_server.py [port]      # default 8000

Features:
- Original landing page at /                (unchanged, served as before)
- Admin SPA at /admin/                      (new)
- Login at POST /api/auth/login             (default creds: admin / admin)
- Session via Set-Cookie: session=<token>   (HttpOnly)
- Persistent state in state.json
- Live updates via Server-Sent Events: GET /api/stream
- Real ping/traceroute helpers (subprocess) for diagnostics
- Read-only device list with realistic mock data
- All read endpoints from before still work for the landing page

This is a *demo* backend. No security guarantees; do not deploy.
"""
from __future__ import annotations

import base64
import json
import os
import secrets
import shlex
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import HTTPServer, ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent
STATE_FILE = ROOT / "state.json"

# 1x1 transparent PNG
TRANSPARENT_PNG = base64.b64decode(
    b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)

DEFAULT_STATE = {
    "partner_id": "telekom-pl",
    "boot_time": time.time(),
    "credentials": {"admin": "admin"},
    "wifi": {
        "ssid_2g": "Telekom-DEMO-2.4G",
        "ssid_5g": "Telekom-DEMO-5G",
        "password": "ChangeMe123!",
        "channel_2g": "auto",
        "channel_5g": "auto",
        "enabled_2g": True,
        "enabled_5g": True,
        "guest_enabled": False,
        "guest_ssid": "Telekom-GUEST",
    },
    "network": {
        "primary_dns": "8.8.8.8",
        "secondary_dns": "1.1.1.1",
        "lan_ip": "192.168.1.1",
        "lan_subnet": "255.255.255.0",
        "dhcp_start": "192.168.1.100",
        "dhcp_end": "192.168.1.200",
    },
    "devices": [
        {"name": "Dev-Laptop",     "mac": "AA:BB:CC:11:22:33", "ip": "192.168.1.101", "iface": "wifi-5g",  "rssi": -42, "rx": 145.2, "tx": 22.1},
        {"name": "iPhone-15",      "mac": "AA:BB:CC:11:22:34", "ip": "192.168.1.102", "iface": "wifi-5g",  "rssi": -58, "rx": 12.0,  "tx": 3.4},
        {"name": "Smart-TV-LG",    "mac": "AA:BB:CC:11:22:35", "ip": "192.168.1.103", "iface": "wifi-2g",  "rssi": -67, "rx": 320.5, "tx": 5.2},
        {"name": "PS5-Console",    "mac": "AA:BB:CC:11:22:36", "ip": "192.168.1.104", "iface": "ethernet", "rssi": None,"rx": 88.3,  "tx": 14.7},
        {"name": "Printer-HP",     "mac": "AA:BB:CC:11:22:37", "ip": "192.168.1.105", "iface": "wifi-2g",  "rssi": -71, "rx": 0.1,   "tx": 0.0},
        {"name": "Echo-Kitchen",   "mac": "AA:BB:CC:11:22:38", "ip": "192.168.1.106", "iface": "wifi-2g",  "rssi": -64, "rx": 1.2,   "tx": 0.4},
    ],
    "logs": [],
    "system": {
        "model": "Sagemcom FAST5670",
        "serial": "DEMO123456789",
        "firmware": "1.2.3-demo",
        "bootloader": "U-Boot 2020.04-demo",
        "mac": "AA:BB:CC:DD:EE:FF",
    },
    "wan": {
        "type": "GPON",
        "status": "Up",
        "ipv4": "85.222.10.42",
        "ipv6": "2a00:1450:4001:81b::200e",
        "rx_signal": -18.4,
        "tx_signal": 2.3,
        "downstream_mbps": 1000,
        "upstream_mbps": 1000,
    },
}

# In-memory session store: token -> {"user": str, "created": float}
SESSIONS: dict = {}
SESSIONS_LOCK = threading.Lock()

# State + lock
STATE: dict = {}
STATE_LOCK = threading.Lock()


def load_state():
    global STATE
    if STATE_FILE.is_file():
        try:
            STATE = json.loads(STATE_FILE.read_text("utf-8"))
            # Always reset boot_time on startup so uptime is fresh
            STATE["boot_time"] = time.time()
            STATE["logs"] = []
            return
        except Exception as e:
            print(f"[state] failed to load: {e}; using defaults")
    STATE = json.loads(json.dumps(DEFAULT_STATE))


def _factory_reset():
    global STATE
    with STATE_LOCK:
        STATE = json.loads(json.dumps(DEFAULT_STATE))
        STATE["boot_time"] = time.time()
    save_state()


def save_state():
    with STATE_LOCK:
        try:
            # Don't persist volatile fields
            snapshot = {k: v for k, v in STATE.items() if k != "logs"}
            STATE_FILE.write_text(json.dumps(snapshot, indent=2), "utf-8")
        except Exception as e:
            print(f"[state] save failed: {e}")


def add_log(level: str, msg: str):
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "level": level,
        "msg": msg,
    }
    with STATE_LOCK:
        STATE["logs"].append(entry)
        if len(STATE["logs"]) > 500:
            STATE["logs"] = STATE["logs"][-500:]


def uptime_seconds() -> int:
    return int(time.time() - STATE.get("boot_time", time.time()))


def fmt_uptime(secs: int) -> str:
    d, r = divmod(secs, 86400)
    h, r = divmod(r, 3600)
    m, s = divmod(r, 60)
    if d:
        return f"{d}d {h:02d}:{m:02d}:{s:02d}"
    return f"{h:02d}:{m:02d}:{s:02d}"


# ---------------------------------------------------------------------------
# Background "router activity" simulator
# ---------------------------------------------------------------------------
def _simulator():
    import random
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
    add_log("info", "router booted, simulator started")
    while True:
        time.sleep(random.uniform(2.0, 5.0))
        try:
            with STATE_LOCK:
                # Drift throughput on devices
                for d in STATE["devices"]:
                    d["rx"] = max(0.0, d["rx"] + random.uniform(-3.0, 5.0))
                    d["tx"] = max(0.0, d["tx"] + random.uniform(-1.0, 1.5))
                    if d["rssi"] is not None:
                        d["rssi"] = max(-90, min(-30, d["rssi"] + random.choice([-1, 0, 1])))
                STATE["wan"]["rx_signal"] = round(-18.0 + random.uniform(-1.5, 1.5), 1)

            # Random log entry
            if random.random() < 0.6:
                d = random.choice(STATE["devices"])
                add_log("info", random.choice(msgs_info).format(
                    ip=d["ip"], mac=d["mac"], iface=d["iface"]))
            else:
                d = random.choice(STATE["devices"])
                add_log("warn", random.choice(msgs_warn).format(
                    mac=d["mac"], rssi=d["rssi"] or -70,
                    ms=random.randint(120, 800),
                    rx=STATE["wan"]["rx_signal"]))
        except Exception as e:
            print(f"[sim] {e}")


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
def parse_cookies(header_val: str) -> dict:
    if not header_val:
        return {}
    c = SimpleCookie()
    c.load(header_val)
    return {k: v.value for k, v in c.items()}


def get_session_user(cookies: dict) -> str | None:
    tok = cookies.get("session")
    if not tok:
        return None
    with SESSIONS_LOCK:
        s = SESSIONS.get(tok)
        if not s:
            return None
        # 30 min idle expiry
        if time.time() - s["created"] > 1800:
            SESSIONS.pop(tok, None)
            return None
        return s["user"]


def create_session(user: str) -> str:
    tok = secrets.token_urlsafe(24)
    with SESSIONS_LOCK:
        SESSIONS[tok] = {"user": user, "created": time.time()}
    return tok


def destroy_session(token: str):
    with SESSIONS_LOCK:
        SESSIONS.pop(token, None)


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------
class Handler(SimpleHTTPRequestHandler):
    server_version = "MockRouter/2.0"

    # ---- helpers --------------------------------------------------------
    def _json(self, status: int, payload, extra_headers: dict | None = None):
        body = json.dumps(payload, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self) -> dict:
        n = int(self.headers.get("Content-Length", "0") or 0)
        if not n:
            return {}
        raw = self.rfile.read(n)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def _cookies(self) -> dict:
        return parse_cookies(self.headers.get("Cookie", ""))

    def _require_auth(self) -> str | None:
        user = get_session_user(self._cookies())
        if not user:
            self._json(401, {"error": "unauthorized"})
            return None
        return user

    def log_message(self, fmt, *args):
        sys.stderr.write("[mock] %s - %s\n" % (self.address_string(), fmt % args))

    # ---- dispatch -------------------------------------------------------
    def do_GET(self):  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        # partner override (legacy)
        if "partner" in qs:
            with STATE_LOCK:
                STATE["partner_id"] = qs["partner"][0]

        # ---- public legacy API (landing page) ----
        if path == "/api/getRouterStatus":
            return self._json(200, self._mock_router_status())
        if path == "/api/getUpgradeStatus":
            return self._json(200, {"upgradeStatus": False})
        if path == "/api/getDeviceInfo":
            s = STATE["system"]
            return self._json(200, {
                "serialNum": s["serial"], "vendor": "Sagemcom",
                "model": s["model"], "uptime": fmt_uptime(uptime_seconds()),
                "oui": "00:11:22", "macAdd": s["mac"],
                "swVersion": s["firmware"], "bootloader_version": s["bootloader"],
            })
        if path == "/api/getNetworkInfo":
            n = STATE["network"]; w = STATE["wan"]
            return self._json(200, {
                "primary_dns": n["primary_dns"], "secondary_dns": n["secondary_dns"],
                "subnetMask": n["lan_subnet"], "public_ipv4Address": w["ipv4"],
                "public_ipv6Address": w["ipv6"], "ipv6Prefix": "2a00:1450:4001:81b::/64",
                "ipv4_lan_cidr": f"{n['lan_ip']}/24", "ipv6_lan_address": "fd00::1/64",
                "third_dns": "-", "fourth_dns": "-", "fifth_dns": "-", "sixth_dns": "-",
            })
        if path == "/api/getPPPOEInfo":
            return self._json(200, {
                "pppoe_status": "Up", "pppoe_connection_status": "Connected",
                "alias": "wan_pppoe",
                "last_status_change": datetime.fromtimestamp(STATE["boot_time"]).isoformat(timespec="seconds"),
                "last_status_error": "ERROR_NONE", "session_id": "0x4242",
            })
        if path == "/api/getWanType":
            w = STATE["wan"]
            return self._json(200, {
                "GPON_link_status": "O5", "DSL_link_status": "Down", "wanoe_mode": "false",
                "type": w["type"], "optical_model": "Sercomm SFP-GPON",
                "gpon_serial_number": "TMPL00000042", "registration_state": "Registered",
                "optical_link_status": "Up",
                "rx_signal_level": f"{w['rx_signal']} dBm",
                "tx_signal_level": f"{w['tx_signal']} dBm",
                "voltage_level": "3.30 V",
                "signal_fail": "No", "signal_degrade": "No", "frames_lost": "0",
                "gpon_downstream": f"{w['downstream_mbps']} Mbps",
                "gpon_upstream": f"{w['upstream_mbps']} Mbps",
                "partner_id": STATE["partner_id"],
            })
        if path == "/api/getEUTelephoneInfo":
            return self._json(200, {
                "registered_phone_numbers": 2,
                "phone_numbers": "+302100000001,+302100000002,+302100000003",
                "phone_numbers_reach": "In_reach,In_reach,Out_of_reach",
                "phone_numbers_uptime": ";1d 2h;0d 5h;-",
            })

        # ---- new admin API ----
        if path == "/api/auth/me":
            user = get_session_user(self._cookies())
            return self._json(200, {"authenticated": user is not None, "user": user})

        if path == "/api/admin/summary":
            if not (user := self._require_auth()): return
            return self._summary()

        if path == "/api/admin/wifi":
            if not (user := self._require_auth()): return
            return self._json(200, STATE["wifi"])

        if path == "/api/admin/network":
            if not (user := self._require_auth()): return
            return self._json(200, STATE["network"])

        if path == "/api/admin/devices":
            if not (user := self._require_auth()): return
            return self._json(200, {"devices": STATE["devices"]})

        if path == "/api/admin/system":
            if not (user := self._require_auth()): return
            return self._json(200, {**STATE["system"], "uptime": fmt_uptime(uptime_seconds()),
                                     "uptime_seconds": uptime_seconds()})

        if path == "/api/admin/logs":
            if not (user := self._require_auth()): return
            return self._json(200, {"logs": STATE["logs"][-200:]})

        if path == "/api/stream":
            return self._sse_stream()

        # ---- static fallbacks ----
        if path.startswith("/images/") and not (ROOT / path.lstrip("/")).is_file():
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(TRANSPARENT_PNG)))
            self.end_headers()
            self.wfile.write(TRANSPARENT_PNG)
            return

        # case-insensitive fallback
        if path.startswith("/js/") and not (ROOT / path.lstrip("/")).is_file():
            self.path = "/JS/" + path[len("/js/"):]
        elif path.startswith("/css/") and not (ROOT / path.lstrip("/")).is_file():
            self.path = "/CSS/" + path[len("/css/"):]

        # /admin/ -> /admin/index.html
        if path == "/admin" or path == "/admin/":
            self.path = "/admin/index.html"
        return super().do_GET()

    def do_POST(self):  # noqa: N802
        path = urlparse(self.path).path

        if path == "/api/auth/login":
            body = self._read_body()
            user = (body.get("username") or "").strip()
            pw = body.get("password") or ""
            if STATE["credentials"].get(user) == pw:
                tok = create_session(user)
                add_log("info", f"login success: {user}")
                # SameSite=Lax for browser-friendliness; HttpOnly to mimic real apps
                cookie = f"session={tok}; HttpOnly; SameSite=Lax; Path=/"
                return self._json(200, {"ok": True, "user": user},
                                  extra_headers={"Set-Cookie": cookie})
            add_log("warn", f"login failed: {user!r}")
            return self._json(401, {"ok": False, "error": "Invalid credentials"})

        if path == "/api/auth/logout":
            tok = self._cookies().get("session")
            if tok:
                destroy_session(tok)
            return self._json(200, {"ok": True},
                              extra_headers={"Set-Cookie": "session=; Path=/; Max-Age=0"})

        if path == "/api/admin/wifi":
            if not (user := self._require_auth()): return
            body = self._read_body()
            allowed = {"ssid_2g", "ssid_5g", "password", "channel_2g", "channel_5g",
                       "enabled_2g", "enabled_5g", "guest_enabled", "guest_ssid"}
            with STATE_LOCK:
                for k, v in body.items():
                    if k in allowed:
                        STATE["wifi"][k] = v
            save_state()
            add_log("info", f"wifi config updated by {user}: {sorted(body.keys())}")
            return self._json(200, {"ok": True, "wifi": STATE["wifi"]})

        if path == "/api/admin/network":
            if not (user := self._require_auth()): return
            body = self._read_body()
            allowed = {"primary_dns", "secondary_dns", "lan_ip", "lan_subnet",
                       "dhcp_start", "dhcp_end"}
            with STATE_LOCK:
                for k, v in body.items():
                    if k in allowed:
                        STATE["network"][k] = v
            save_state()
            add_log("info", f"network config updated by {user}")
            return self._json(200, {"ok": True, "network": STATE["network"]})

        if path == "/api/admin/restart":
            if not (user := self._require_auth()): return
            add_log("warn", f"router restart requested by {user}")
            # fake reset boot time after 6s
            def _restart():
                time.sleep(6)
                with STATE_LOCK:
                    STATE["boot_time"] = time.time()
                add_log("info", "router booted")
            threading.Thread(target=_restart, daemon=True).start()
            return self._json(200, {"ok": True, "delay_seconds": 6})

        if path == "/api/admin/factory_reset":
            if not (user := self._require_auth()): return
            add_log("warn", f"factory reset requested by {user}")
            _factory_reset()
            return self._json(200, {"ok": True})

        if path == "/api/admin/diagnostics/ping":
            if not (user := self._require_auth()): return
            body = self._read_body()
            host = (body.get("host") or "").strip()
            if not host or not _safe_host(host):
                return self._json(400, {"ok": False, "error": "Invalid host"})
            output = _run_cmd(_ping_cmd(host), timeout=10)
            return self._json(200, {"ok": True, "host": host, "output": output})

        if path == "/api/admin/diagnostics/traceroute":
            if not (user := self._require_auth()): return
            body = self._read_body()
            host = (body.get("host") or "").strip()
            if not host or not _safe_host(host):
                return self._json(400, {"ok": False, "error": "Invalid host"})
            output = _run_cmd(_tracert_cmd(host), timeout=20)
            return self._json(200, {"ok": True, "host": host, "output": output})

        return self._json(404, {"error": "not found"})

    # ---- SSE ------------------------------------------------------------
    def _sse_stream(self):
        # No auth required for SSE in this demo (panel polls separately).
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        last_log_n = 0
        try:
            while True:
                payload = self._summary_payload()
                self.wfile.write(b"event: tick\n")
                self.wfile.write(("data: " + json.dumps(payload) + "\n\n").encode("utf-8"))
                # incremental logs
                with STATE_LOCK:
                    new_logs = STATE["logs"][last_log_n:]
                    last_log_n = len(STATE["logs"])
                if new_logs:
                    self.wfile.write(b"event: logs\n")
                    self.wfile.write(("data: " + json.dumps(new_logs) + "\n\n").encode("utf-8"))
                self.wfile.flush()
                time.sleep(2)
        except (BrokenPipeError, ConnectionResetError):
            return

    # ---- payload builders ----------------------------------------------
    def _summary(self):
        return self._json(200, self._summary_payload())

    def _summary_payload(self):
        import random
        with STATE_LOCK:
            total_rx = sum(d["rx"] for d in STATE["devices"])
            total_tx = sum(d["tx"] for d in STATE["devices"])
            return {
                "ts": time.time(),
                "uptime": fmt_uptime(uptime_seconds()),
                "uptime_seconds": uptime_seconds(),
                "wan": dict(STATE["wan"]),
                "wifi": {
                    "ssid_2g": STATE["wifi"]["ssid_2g"],
                    "ssid_5g": STATE["wifi"]["ssid_5g"],
                    "enabled_2g": STATE["wifi"]["enabled_2g"],
                    "enabled_5g": STATE["wifi"]["enabled_5g"],
                },
                "throughput": {
                    "rx_mbps": round(total_rx + random.uniform(-2, 2), 1),
                    "tx_mbps": round(total_tx + random.uniform(-1, 1), 1),
                },
                "devices_count": len(STATE["devices"]),
                "system": dict(STATE["system"]),
            }

    def _mock_router_status(self):
        w = STATE["wan"]
        return {
            "partner_id": STATE["partner_id"],
            "internetStatus": "Up" if w["status"] == "Up" else "Down",
            "broadbandStatus": "Up", "phoneStatus": "Up",
            "lanStatus": True, "wifiStatus": STATE["wifi"]["enabled_2g"] or STATE["wifi"]["enabled_5g"],
            "wifi_ssid": STATE["wifi"]["ssid_2g"],
            "ipAdd": STATE["network"]["lan_ip"],
            "ipv6_address": w["ipv6"],
            "hostname": "magenta.box", "upgradeStatus": False,
        }


# ---------------------------------------------------------------------------
# Subprocess helpers (real ping/traceroute, on the server's host)
# ---------------------------------------------------------------------------
import re
_HOST_RE = re.compile(r"^[A-Za-z0-9.\-:]+$")


def _safe_host(h: str) -> bool:
    return bool(_HOST_RE.match(h)) and len(h) <= 100


def _ping_cmd(host: str) -> list[str]:
    if os.name == "nt":
        return ["ping", "-n", "4", host]
    return ["ping", "-c", "4", host]


def _tracert_cmd(host: str) -> list[str]:
    if os.name == "nt":
        return ["tracert", "-h", "10", "-w", "1500", host]
    return ["traceroute", "-m", "10", "-w", "2", host]


def _run_cmd(cmd: list[str], timeout: int = 10) -> str:
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, shell=False)
        return (out.stdout or "") + (("\n" + out.stderr) if out.stderr else "")
    except subprocess.TimeoutExpired:
        return f"$ {' '.join(shlex.quote(c) for c in cmd)}\n[timeout]"
    except FileNotFoundError:
        return f"command not found: {cmd[0]}"
    except Exception as e:
        return f"error: {e}"


# ---------------------------------------------------------------------------
def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    load_state()
    threading.Thread(target=_simulator, daemon=True).start()
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"=== Mock router up: http://127.0.0.1:{port}/")
    print(f"    Landing page : http://127.0.0.1:{port}/")
    print(f"    Admin panel  : http://127.0.0.1:{port}/admin/   (login: admin / admin)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")


if __name__ == "__main__":
    main()
