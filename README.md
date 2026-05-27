# magenta.box — Telekom Router Demo

> 🇵🇱 Polska (ten plik) · 🇬🇧 [English version](./README.en.md)

> ⚠️ **Educational, non-commercial demo.** See [Disclaimer & Legal](#disclaimer--legal) below.

Lokalne, w pełni działające demo panelu zarządzania routerem Telekom / T-Mobile (RDK-B / CCSP).
Składa się z trzech warstw:

1. **Oryginalny landing page** (`/`) — frontend z firmware'u operatora (PL / CZ / GR / …), zasilany mockowanym TR-181-like API.
2. **Własny panel administracyjny** (`/admin/`) — SPA w czystym JS/CSS, motyw Magenta, dark mode, mobile drawer, live update przez SSE.
3. **Dwa wymienne backendy** — lekki stdlib (`mock_server.py`) i pełnoprawny FastAPI (`backend/`) z SQLite, JWT, bcrypt i pub/sub event hub.

| | Landing `/` | Admin `/admin/` |
|---|---|---|
| Frontend | jQuery + tmpl.js (oryginał Telekom) | vanilla JS, custom CSS, TeleNeo |
| Auth | brak (read-only) | login `admin` / `admin`, cookie sesji |
| Live update | polling co 5 s | SSE `/api/stream` (event-hub pub/sub) |
| Mutacja stanu | nie | Wi-Fi, sieć, restart, factory reset |

![Dashboard](./admin-dashboard.png)

---

## Disclaimer & Legal

**This repository is an educational, non-commercial demonstration project.**

- **"Telekom"**, **"T-Mobile"**, **"Cosmote"**, **"Magenta"** and **"magenta.box"** are
  registered trademarks of **Deutsche Telekom AG** and its affiliates. Use here is
  strictly **nominative** (referring to the product being mocked) — no affiliation,
  sponsorship or endorsement is implied.
- The original landing page assets (`index.html`, `CSS/style.css`, `CSS/common.css`,
  `JS/index.js`, `JS/translator.js`, `JS/utility.js`, `*PopUp.html`,
  `open_source_license.html`, `languages/*.json`) and the **TeleNeo Web font**
  (`CSS/fonts/TeleNeoWeb-*.woff2`) are property of **Deutsche Telekom AG**.
  They are included **solely** to demonstrate that the mock backend renders the
  original UI correctly.

**Rights holders**: If you are a representative of Deutsche Telekom AG (or any
affiliate) and want any content removed, please open a GitHub issue or send a
DMCA notice to GitHub — I will comply within 24 hours.

---

## Spis treści

- [Wymagania](#wymagania)
- [Szybki start](#szybki-start)
- [Wybór backendu](#wybór-backendu)
- [Endpointy API](#endpointy-api)
- [Funkcje panelu admina](#funkcje-panelu-admina)
- [Struktura repozytorium](#struktura-repozytorium)
- [Persystencja stanu](#persystencja-stanu)
- [Rozszerzanie](#rozszerzanie)
- [Bezpieczeństwo](#bezpieczeństwo)
- [License](#license)

---

## Wymagania

- **Python 3.10+** (testowane na 3.11, 3.12, 3.14)
- `pip` i `venv` (Debian/Ubuntu: `sudo apt install python3-venv python3-pip`)
- Opcjonalnie `iputils-ping` i `traceroute` dla widoku diagnostyki:

  ```bash
  sudo apt install iputils-ping traceroute    # Debian / Ubuntu
  sudo dnf install iputils traceroute         # Fedora / RHEL
  sudo pacman -S iputils traceroute           # Arch
  ```

  Bez tych pakietów panel diagnostyki pokaże `command not found` — reszta aplikacji działa.

---

## Szybki start

### Wariant A — stdlib (zero zależności)

```bash
python3 mock_server.py            # port 8000
python3 mock_server.py 9000       # własny port
```

### Wariant B — FastAPI (pełna baza danych)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

<details>
<summary>Windows PowerShell — kliknij, żeby rozwinąć</summary>

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

</details>

Po starcie (oba warianty) otwórz:

| URL | Co robi |
|---|---|
| <http://127.0.0.1:8000/>           | Landing routera (oryginał Telekom) |
| <http://127.0.0.1:8000/admin/>     | Panel admina — login `admin` / `admin` |
| <http://127.0.0.1:8000/api/stream> | SSE — `event: tick`, `event: logs` |

Przełączanie wariantu krajowego dla landing-page (motyw + branding):

```
?partner=telekom-pl   (domyślny)
?partner=telekom-cz | telekom-sk | telekom-hr | telekom-hu
?partner=telekom-gr   (Cosmote)
?partner=telekom-me | telekom-mk
```

### Serwis systemd (opcjonalnie, dla wariantu B)

Jeśli chcesz mieć backend jako usługę, dorzuć `/etc/systemd/system/magenta-box.service`:

```ini
[Unit]
Description=magenta.box router demo
After=network.target

[Service]
Type=simple
User=awski
WorkingDirectory=/home/awski/magenta-box
Environment="PATH=/home/awski/magenta-box/.venv/bin"
EnvironmentFile=-/home/awski/magenta-box/.env
ExecStart=/home/awski/magenta-box/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now magenta-box
sudo systemctl status magenta-box
journalctl -u magenta-box -f
```

---

## Wybór backendu

| Kryterium | `mock_server.py` (stdlib) | `backend/` (FastAPI) |
|---|---|---|
| Zależności | brak | `requirements.txt` (FastAPI, SQLAlchemy, sse-starlette, bcrypt, PyJWT, …) |
| Persystencja | `state.json` w roocie | SQLite (`router.db` w roocie) |
| Auth | sesja in-memory, token w cookie | JWT (HS256, PyJWT) w cookie HttpOnly + natywne bcrypt |
| Symulator | wątek w tle (`threading`) | async task (`asyncio`) |
| SSE | bezpośrednio w handlerze (per-klient pętla) | `sse-starlette` + `EventHub` (pub/sub do wielu subskrybentów) |
| Diagnostyka (`ping`/`traceroute`) | `subprocess.run` blokujący | `asyncio.create_subprocess_exec` + kill po timeout |
| Cykl życia | główny wątek do Ctrl-C | `lifespan` context (proper startup + shutdown) |
| Hot-reload | nie | `uvicorn --reload` |

Oba backendy serwują **identyczny** SPA `admin/` i landing `index.html`, więc można je swobodnie podmieniać.

---

## Endpointy API

### Public (landing) — bez autoryzacji

| Method | Path | Zwraca |
|---|---|---|
| GET | `/api/getRouterStatus`    | `partner_id`, `internetStatus`, `wifi_ssid`, `ipAdd`, … |
| GET | `/api/getUpgradeStatus`   | `{ upgradeStatus: false }` |
| GET | `/api/getDeviceInfo`      | model, serial, MAC, firmware, uptime |
| GET | `/api/getNetworkInfo`     | DNS, public IPv4/IPv6, LAN CIDR |
| GET | `/api/getPPPOEInfo`       | `pppoe_status`, alias, `last_status_change` |
| GET | `/api/getWanType`         | GPON/DSL link, sygnały RX/TX, prędkości |
| GET | `/api/getEUTelephoneInfo` | numery telefonów (wariant grecki) |

### Auth

| Method | Path | Body / Effect |
|---|---|---|
| GET  | `/api/auth/me`     | `{ authenticated, user }` |
| POST | `/api/auth/login`  | `{ username, password }` → ustawia cookie `session=` |
| POST | `/api/auth/logout` | usuwa cookie |

### Admin (wymaga sesji)

| Method | Path | Opis |
|---|---|---|
| GET  | `/api/admin/summary`                | snapshot: WAN, Wi-Fi, throughput, devices_count, uptime |
| GET/POST | `/api/admin/wifi`               | konfiguracja 2.4G/5G/guest (SSID, hasło, kanał, on/off) |
| GET/POST | `/api/admin/network`            | LAN IP, maska, zakres DHCP, DNS |
| GET  | `/api/admin/devices`                | lista klientów (driftuje co 2–5 s) |
| GET  | `/api/admin/system`                 | model, serial, firmware, MAC, uptime |
| GET  | `/api/admin/logs`                   | ostatnie 200 wpisów |
| POST | `/api/admin/restart`                | resetuje uptime po 6 s |
| POST | `/api/admin/factory_reset`          | dropuje DB / nadpisuje state.json |
| POST | `/api/admin/diagnostics/ping`       | `{ host }` → realny `ping` po stronie serwera (regex whitelist hosta) |
| POST | `/api/admin/diagnostics/traceroute` | `{ host }` → `traceroute` / `tracert` |

Szybki test z curl (Linux):

```bash
# zapisz cookie sesji
curl -c /tmp/mb.cookies -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# użyj cookie do wywołań admin
curl -b /tmp/mb.cookies http://127.0.0.1:8000/api/admin/summary | jq

# SSE — strumień ticków i logów
curl -N -b /tmp/mb.cookies http://127.0.0.1:8000/api/stream
```

### SSE

`GET /api/stream` — strumień zdarzeń:

```
event: tick
data: { uptime, wan, wifi, throughput, devices_count, system, ts }

event: logs
data: [ { ts, level, msg }, ... ]
```

W FastAPI strumień jest kolejkowany przez `EventHub` (`backend/event_hub.py`) — symulator publikuje raz, wszyscy subskrybenci dostają to samo.

---

## Funkcje panelu admina

| Widok | Co tu jest |
|---|---|
| **Dashboard** | hero z grafiką routera (`router-panel.svg`), 4 kafelki (status WAN, uptime, urządzenia, IPv4), sparkliny RX/TX (30 próbek), pasma Wi-Fi, podgląd top-4 urządzeń |
| **Wi-Fi**    | SSID 2.4/5G, hasło z toggle pokaż/ukryj, wybór kanału, switche on/off (2.4 / 5 / guest), guest SSID |
| **Sieć**     | LAN IP/maska, zakres DHCP, DNS główny/zapasowy |
| **Urządzenia** | tabela 7 kolumn (nazwa, IP, MAC, interfejs, RSSI, RX, TX), auto-odświeżanie co 3 s |
| **Diagnostyka** | input hosta + `Ping` / `Traceroute`, output w terminalu (motyw nocny) |
| **Logi**     | live tail przez SSE, kolory per-level (`info`/`warn`/`error`), auto-scroll, czyszczenie widoku |
| **System**   | info o urządzeniu + akcje serwisowe (restart, factory reset z `confirm()`) |

Dodatkowo:

- **Dark mode** — przełącznik w stopce sidebara, zapisany w `localStorage`.
- **Mobile drawer** — sidebar zamyka się w drawer + scrim poniżej 900 px.
- **Toasty** — `toast()` w prawym dolnym rogu, animacja in/out.
- **XSS-safe** — wszystkie wartości z API trafiają do DOM przez `escapeHTML(...)`.
- **Ikony** — pojedyncze inline SVG osadzone w CSS jako `mask-image` (zero zewnętrznych zależności, kolorowane przez `currentColor`).

![Dashboard view](./admin-dashboard-view.png)
![Mobile view](./admin-mobile-view.png)

---

## Struktura repozytorium

```
magenta-box/
├── index.html                         # Oryginalny landing routera (Telekom — patrz Disclaimer)
├── open_source_license.html           # Modal Open Source (Telekom)
├── restartPopUp.html                  # Modal Restart (idle)
├── restartUpgradePopUp.html           # Modal Restart (during upgrade)
├── resetPopUp.html                    # Modal Factory reset (idle)
├── resetUpgradePopUp.html             # Modal Factory reset (during upgrade)
│
├── CSS/                               # Oryginalne style Telekom (patrz Disclaimer)
│   ├── bootstrap.min.css
│   ├── common.css
│   ├── style.css
│   └── fonts/                         # TeleNeo Web (© Deutsche Telekom AG)
│
├── JS/                                # Oryginalne skrypty Telekom (patrz Disclaimer)
│   ├── jquery.min.js
│   ├── bootstrap.min.js
│   ├── tmpl.js
│   ├── translator.js
│   ├── utility.js
│   └── index.js
│
├── languages/
│   ├── index.json                     # Lista plików językowych
│   ├── pl.json
│   └── en_pl.json
│
├── admin/                             # ⭐ Własny panel administracyjny (SPA) — MIT
│   ├── index.html                     # Shell + login screen
│   ├── admin.css                      # Custom CSS (Magenta theme, dark mode, mobile)
│   ├── admin.js                       # Vanilla JS router widoków, SSE client, fetch API
│   └── router-panel.svg               # Grafika hero w dashboardzie
│
├── mock_server.py                     # ⭐ Backend #1 — stdlib (zero deps) — MIT
├── state.json                         # Stan persystowany przez mock_server.py (gitignored)
│
├── backend/                           # ⭐ Backend #2 — FastAPI — MIT
│   ├── main.py                        # FastAPI app, lifespan, mounty static, SSE endpoint
│   ├── config.py                      # pydantic-settings (.env support)
│   ├── database.py                    # async SQLAlchemy + sessionmaker
│   ├── models.py                      # User, WifiConfig, NetworkConfig, SystemInfo,
│   │                                  # WanStatus, Device, Log
│   ├── schemas.py                     # Pydantic schemas
│   ├── crud.py                        # init_db (seedy), get/update helpers
│   ├── auth.py                        # PyJWT (HS256) + natywne bcrypt
│   ├── event_hub.py                   # In-process pub/sub dla SSE
│   ├── simulator.py                   # Async task: drift devices, publish events
│   └── routers/
│       ├── public.py                  # Legacy /api/get* (landing)
│       ├── auth.py                    # /api/auth/{me,login,logout}
│       └── admin.py                   # /api/admin/*
│
├── requirements.txt                   # Dla wariantu B (FastAPI)
├── router.db                          # SQLite — tworzona automatycznie (gitignored)
│
├── admin-dashboard.png                # Zrzuty ekranu (do README)
├── admin-dashboard-view.png
├── admin-mobile-view.png
│
├── LICENSE                            # MIT — z zakresem ograniczonym do oryginalnego kodu
└── README.md                          # ten plik
```

⭐ = własna praca, MIT.  
Pozostałe pliki — patrz [Disclaimer & Legal](#disclaimer--legal).

---

## Persystencja stanu

### `mock_server.py`

Stan trzymany w **`state.json`** w roocie. Zapisywany po każdej mutacji. Logi są volatile (resetują się przy restarcie).

### `backend/`

Stan w **`router.db`** (SQLite via aiosqlite). Tabele tworzą się przy starcie (`models.Base.metadata.create_all`). Dane seedowe wstawia `crud.init_db()` (admin user, default Wi-Fi, sieć, system info, WAN, 6 urządzeń).

Reset bazy:

```bash
rm -f router.db
# kolejny start odtworzy schema + seed
```

Konfiguracja przez `.env` (obok `backend/`):

```bash
cat > .env <<'EOF'
DATABASE_URL=sqlite+aiosqlite:///./router.db
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRE_MINUTES=60
EOF
```

---

## Rozszerzanie

### Dodanie nowego widoku w admin SPA

Edytuj `admin/admin.js`:

1. Dodaj wpis do `viewMeta` (tytuł, podtytuł).
2. Dodaj klucz do obiektu `views` z metodami `render()` (zwraca string HTML) i `onMount()` (po dodaniu do DOM).
3. Dodaj `<button class="nav-item" data-view="...">` w `admin/index.html`.

### Nowy endpoint backendu

- **stdlib**: dopisz `if path == ...` w `Handler.do_GET` lub `do_POST` (`mock_server.py`).
- **FastAPI**: dodaj router-handler w `backend/routers/<plik>.py`, jeśli wymaga sesji to `Depends(get_current_user)`.

### Dodatkowe języki dla landing page

Dorzuć `languages/<lang>.json` i wpisz go do `languages/index.json`. Translator (`JS/translator.js`) załaduje pierwszy pasujący do `navigator.language`.

---

## Bezpieczeństwo

To jest **demo do testów lokalnych**, nie produkcja. W szczególności:

- Domyślne hasło `admin` jest hardcoded w `crud.init_db()` / `mock_server.DEFAULT_STATE`.
- `JWT_SECRET` ma fallback `super-secret-key-for-router-demo` — nadpisz przez ENV (`.env`) przed jakimkolwiek wystawieniem na sieć. Wygeneruj porządny: `openssl rand -hex 32`.
- Cookie sesji ma `SameSite=Lax`, `HttpOnly`, ale **bez** `Secure` (bo HTTP localhost). Dla HTTPS dorzuć `secure=True` w `response.set_cookie(...)`.
- Diagnostyka wykonuje realne `ping`/`traceroute` po stronie serwera. Whitelist hosta to regex `^[A-Za-z0-9.\-:]{1,100}$` — nie wystawiaj endpointu publicznie bez dodatkowego ograniczenia.
- CORS nie jest skonfigurowany — backend zakłada same-origin.

Domyślnie nasłuchuje na `127.0.0.1`. Żeby wystawić poza localhost, użyj `uvicorn --host 0.0.0.0` lub zmień bind w `mock_server.py`. **Wcześniej** popraw powyższe punkty.

Reverse proxy (nginx) dla wariantu B:

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location /api/stream {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_read_timeout 24h;
}
```

---

## Stack i podziękowania

**Własny kod** (MIT, © 2026 Awski):

- Backend FastAPI (`backend/`) — async SQLAlchemy + PyJWT + bcrypt + sse-starlette
- Backend stdlib (`mock_server.py`) — czysta biblioteka standardowa Pythona
- Admin SPA (`admin/`) — vanilla JS + custom CSS, ~2000 linii, zero zewnętrznych zależności frontu

**Open Source dependencies** (FastAPI wariant):

- [FastAPI](https://fastapi.tiangolo.com/) (MIT) · [Starlette](https://www.starlette.io/) (BSD) · [SQLAlchemy](https://www.sqlalchemy.org/) (MIT)
- [Pydantic](https://docs.pydantic.dev/) (MIT) · [PyJWT](https://pyjwt.readthedocs.io/) (MIT) · [bcrypt](https://github.com/pyca/bcrypt/) (Apache 2.0)
- [sse-starlette](https://github.com/sysid/sse-starlette) (BSD) · [aiosqlite](https://github.com/omnilib/aiosqlite) (MIT) · [uvicorn](https://www.uvicorn.org/) (BSD)

**Frontend landing (3rd-party, in original UI)**:

- jQuery, Bootstrap 3, JavaScript Templates (`tmpl.js`) — MIT

---

## License

All original code written specifically for this project (`admin/`, `backend/`,
`mock_server.py`, simulator code and custom SVG assets) is © 2026 Awski and
licensed under the **MIT License** — see [`LICENSE`](./LICENSE) for the full
text and exact scope.

Third-party Telekom / T-Mobile assets (the landing page, TeleNeo fonts,
trademarks, branding) are **not** covered by this license and remain the
property of their respective rights holders. See
[Disclaimer & Legal](#disclaimer--legal) for the rights-holder contact procedure.

Vendored open-source libraries (jQuery, Bootstrap, tmpl.js, …) retain their
original MIT licenses.

---

## Kontakt

Pytania, sugestie, PR-y mile widziane. Issues / DMCA notice:
<https://github.com/Awskiszef/magenta-box/issues>
