const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  view: "dashboard",
  user: null,
  summary: null,
  rxHistory: [],
  txHistory: [],
  logs: [],
  evt: null,
  cleanup: null,
  appendLog: null,
};

const viewMeta = {
  dashboard: ["Dashboard", "Stan urządzenia w czasie rzeczywistym"],
  wifi: ["Wi-Fi", "Konfiguracja sieci bezprzewodowej"],
  network: ["Sieć", "Adresacja LAN, DHCP i DNS"],
  devices: ["Urządzenia", "Klienci aktywni w sieci domowej"],
  diagnostics: ["Diagnostyka", "Testy sieciowe wykonywane po stronie routera"],
  logs: ["Logi", "Strumień zdarzeń systemowych"],
  system: ["System", "Informacje i akcje serwisowe"],
};

const text = (value) => (value == null ? "" : String(value));
const escapeHTML = (value) => text(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[char]));
const icon = (name) => `<span class="icon" data-icon="${name}" aria-hidden="true"></span>`;

async function api(path, options = {}) {
  const request = { credentials: "same-origin", ...options };
  if (request.body && typeof request.body === "object") {
    request.headers = { "Content-Type": "application/json", ...(request.headers || {}) };
    request.body = JSON.stringify(request.body);
  }

  const response = await fetch(path, request);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw Object.assign(new Error(data?.error || response.statusText), {
      status: response.status,
      data,
    });
  }

  return data;
}

async function checkAuth() {
  const me = await api("/api/auth/me");
  return me.authenticated ? me.user : null;
}

async function login(username, password) {
  return api("/api/auth/login", { method: "POST", body: { username, password } });
}

async function logout() {
  await api("/api/auth/logout", { method: "POST" });
  window.location.reload();
}

function toast(message, kind = "ok") {
  const node = document.createElement("div");
  node.className = `toast ${kind === "err" ? "toast-err" : "toast-ok"}`;
  node.textContent = message;
  $("#toasts").appendChild(node);
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    node.style.transition = "opacity .22s ease, transform .22s ease";
  }, 2600);
  setTimeout(() => node.remove(), 2920);
}

function setBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  if (label) button.dataset.readyLabel = label;
  button.innerHTML = busy ? `${icon("refresh")} Pracuje...` : button.dataset.readyLabel;
}

function statusBadge(status) {
  const ok = text(status).toLowerCase() === "up";
  return `<span class="status-badge ${ok ? "status-ok" : "status-err"}">${ok ? "online" : "offline"}</span>`;
}

function wifiBadge(enabled) {
  return `<span class="badge ${enabled ? "badge-ok" : "badge-err"}">${enabled ? "aktywne" : "wyłączone"}</span>`;
}

function ifaceBadge(iface) {
  const normalized = text(iface);
  const cls = normalized === "ethernet" ? "badge-ok" : normalized === "wifi-5g" ? "badge-warn" : "badge-neutral";
  return `<span class="badge ${cls}">${escapeHTML(normalized)}</span>`;
}

function formatMbps(value) {
  const n = Number(value || 0);
  return `${n.toFixed(1)} Mb/s`;
}

function closeMobileMenu() {
  $("#sidebar").classList.remove("is-open");
  $("#sidebarScrim").classList.add("hidden");
}

function openMobileMenu() {
  $("#sidebar").classList.add("is-open");
  $("#sidebarScrim").classList.remove("hidden");
}

async function refreshSummary() {
  state.summary = await api("/api/admin/summary");
  pushThroughput(state.summary);
  updateTopbar();
  if (state.view === "dashboard") updateDashboard();
}

function pushThroughput(summary) {
  if (!summary?.throughput) return;
  state.rxHistory.push(Number(summary.throughput.rx_mbps || 0));
  state.txHistory.push(Number(summary.throughput.tx_mbps || 0));
  if (state.rxHistory.length > 30) state.rxHistory.shift();
  if (state.txHistory.length > 30) state.txHistory.shift();
}

function updateTopbar() {
  const summary = state.summary;
  if (!summary) return;
  $("#uptimeBadge").textContent = summary.uptime || "--:--:--";
  $("#sysModelLabel").textContent = summary.system?.model || "router";
}

function drawSpark(selector, values) {
  const element = $(selector);
  if (!element) return;

  const data = values.length ? values : [0];
  const max = Math.max(1, ...data);
  element.innerHTML = data
    .map((value) => `<span style="height:${Math.max(4, Math.round((value / max) * 100))}%"></span>`)
    .join("");
}

function loadingPanel(label = "Ładowanie...") {
  return `<div class="panel empty-state">${icon("refresh")} ${escapeHTML(label)}</div>`;
}

function errorPanel(error) {
  return `
    <div class="panel page-error">
      <div>
        <h2>Coś poszło nie tak</h2>
        <p>${escapeHTML(error?.message || "Nie udało się pobrać danych.")}</p>
      </div>
      <button class="btn btn-secondary" type="button" onclick="mount('${state.view}')">${icon("refresh")} Spróbuj ponownie</button>
    </div>`;
}

const views = {
  dashboard: {
    render: () => `
      <div class="dashboard-layout">
        <section class="status-panel">
          <div class="status-content">
            <div class="status-title">
              <h2 id="statusHeadline">Router gotowy</h2>
              <span id="wanStatusBadge">${statusBadge("Up")}</span>
            </div>
            <p class="status-copy" id="statusCopy">
              Podgląd łącza, urządzeń i Wi-Fi aktualizuje się automatycznie przez Server-Sent Events.
            </p>
            <div class="status-actions">
              <button class="btn btn-primary" id="refreshSummaryBtn" type="button">${icon("refresh")} Odśwież</button>
              <button class="btn btn-secondary" type="button" data-jump-view="diagnostics">${icon("terminal")} Diagnostyka</button>
            </div>
            <div class="signal-strip">
              <span class="badge badge-neutral" id="wanTypePill">WAN: -</span>
              <span class="badge badge-neutral" id="opticalPill">RX: -</span>
              <span class="badge badge-neutral" id="txSignalPill">TX: -</span>
            </div>
          </div>
          <div class="router-stage">
            <img src="/admin/router-panel.svg" alt="Router magenta.box" />
          </div>
        </section>

        <aside class="side-stack">
          <section class="panel">
            <div class="panel-title">
              <div>
                <h3>Sieci Wi-Fi</h3>
              <p>Aktualny broadcast SSID</p>
              </div>
              <button class="icon-btn" type="button" data-jump-view="wifi" title="Edytuj Wi-Fi" aria-label="Edytuj Wi-Fi">${icon("wifi")}</button>
            </div>
            <div class="wifi-card-list">
              <div class="wifi-band">
                <span><small>2.4 GHz</small><strong id="ssid2">-</strong></span>
                <span id="wifi2Badge">${wifiBadge(true)}</span>
              </div>
              <div class="wifi-band">
                <span><small>5 GHz</small><strong id="ssid5">-</strong></span>
                <span id="wifi5Badge">${wifiBadge(true)}</span>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div>
              <h3>Ostatnie urządzenia</h3>
              <p>Najbardziej aktywni klienci</p>
              </div>
              <button class="icon-btn" type="button" data-jump-view="devices" title="Lista urządzeń" aria-label="Lista urządzeń">${icon("devices")}</button>
            </div>
            <div id="devicePreview" class="device-preview-list">
              <div class="device-preview"><span><small>Brak danych</small><strong>-</strong></span></div>
            </div>
          </section>
        </aside>
      </div>

      <div class="metric-grid">
        <article class="metric-card">
          <div class="metric-label">Status WAN <span id="wanDot">${statusBadge("Up")}</span></div>
          <strong class="metric-value" id="wanStatus">-</strong>
          <p class="metric-sub" id="wanType">-</p>
        </article>
        <article class="metric-card">
          <div class="metric-label">Czas pracy ${icon("system")}</div>
          <strong class="metric-value" id="uptimeBig">-</strong>
          <p class="metric-sub">Od ostatniego restartu</p>
        </article>
        <article class="metric-card">
          <div class="metric-label">Urządzenia ${icon("devices")}</div>
          <strong class="metric-value" id="devCount">-</strong>
          <p class="metric-sub">Aktywne klienty</p>
        </article>
        <article class="metric-card compact">
          <div class="metric-label">IPv4 WAN ${icon("network")}</div>
          <strong class="metric-value" id="wanIp">-</strong>
          <p class="metric-sub mono" id="wanIp6">-</p>
        </article>
      </div>

      <div class="chart-grid">
        <section class="chart-panel">
          <div class="panel-title">
            <div>
              <h3>Pobieranie</h3>
              <p>Ostatnie 30 próbek</p>
            </div>
            <strong class="throughput-value" id="rxNow">-</strong>
          </div>
          <div class="spark" id="rxSpark" aria-hidden="true"></div>
        </section>
        <section class="chart-panel">
          <div class="panel-title">
            <div>
              <h3>Wysyłanie</h3>
              <p>Ostatnie 30 próbek</p>
            </div>
            <strong class="throughput-value" id="txNow">-</strong>
          </div>
          <div class="spark" id="txSpark" aria-hidden="true"></div>
        </section>
      </div>
    `,
    onMount: async () => {
      updateDashboard();
      $("#refreshSummaryBtn").onclick = async (event) => {
        const button = event.currentTarget;
          setBusy(button, true, `${icon("refresh")} Odśwież`);
        try {
          await refreshSummary();
          toast("Dashboard odświeżony");
        } catch (error) {
          toast(`Błąd: ${error.message}`, "err");
        } finally {
          setBusy(button, false);
        }
      };
      await renderDevicePreview();
    },
  },

  wifi: {
    render: () => `<section id="wifiPanel">${loadingPanel("Ładowanie Wi-Fi...")}</section>`,
    onMount: async () => {
      const wifi = await api("/api/admin/wifi");
      $("#wifiPanel").innerHTML = `
        <form id="wifiForm" class="form-panel">
          <div class="panel-title">
            <div>
              <h2>Konfiguracja Wi-Fi</h2>
              <p>Zmiany są zapisywane w mockowym stanie routera.</p>
            </div>
            <button class="btn btn-secondary" id="wifiReload" type="button">${icon("refresh")} Cofnij</button>
          </div>

          <div class="form-grid">
            <label>
              <span>SSID 2.4 GHz</span>
              <input class="field" name="ssid_2g" value="${escapeHTML(wifi.ssid_2g)}" required />
            </label>
            <label>
              <span>SSID 5 GHz</span>
              <input class="field" name="ssid_5g" value="${escapeHTML(wifi.ssid_5g)}" required />
            </label>
            <div class="field-stack span-2">
              <label for="wifiPassword">Hasło Wi-Fi</label>
              <span class="password-row">
                <input id="wifiPassword" class="field" name="password" type="password" value="${escapeHTML(wifi.password)}" required />
                <button id="togglePassword" class="icon-btn" type="button" title="Pokaż hasło" aria-label="Pokaż hasło">${icon("eye")}</button>
              </span>
            </div>
            <label>
              <span>Kanal 2.4 GHz</span>
              <select class="select" name="channel_2g">
                ${["auto", "1", "6", "11"].map((channel) => `<option value="${channel}" ${channel === wifi.channel_2g ? "selected" : ""}>${channel}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Kanal 5 GHz</span>
              <select class="select" name="channel_5g">
                ${["auto", "36", "40", "44", "48", "149"].map((channel) => `<option value="${channel}" ${channel === wifi.channel_5g ? "selected" : ""}>${channel}</option>`).join("")}
              </select>
            </label>
            <label class="span-2">
              <span>SSID gościa</span>
              <input class="field" name="guest_ssid" value="${escapeHTML(wifi.guest_ssid)}" />
            </label>
          </div>

          <div class="toggle-grid">
            ${switchControl("enabled_2g", "2.4 GHz", "Sieć kompatybilna", wifi.enabled_2g)}
            ${switchControl("enabled_5g", "5 GHz", "Szybkie pasmo", wifi.enabled_5g)}
            ${switchControl("guest_enabled", "Sieć gościnna", "Izolowany dostęp", wifi.guest_enabled)}
          </div>

          <div class="button-row">
            <button id="wifiSave" class="btn btn-primary" type="submit">${icon("save")} Zapisz Wi-Fi</button>
            <button class="btn btn-secondary" type="button" data-jump-view="dashboard">${icon("dashboard")} Dashboard</button>
          </div>
        </form>`;

      $("#togglePassword").onclick = () => {
        const input = $("#wifiPassword");
        input.type = input.type === "password" ? "text" : "password";
      };
      $("#wifiReload").onclick = () => mount("wifi");
      $("#wifiForm").onsubmit = saveWifi;
    },
  },

  network: {
    render: () => `<section id="networkPanel">${loadingPanel("Ładowanie sieci...")}</section>`,
    onMount: async () => {
      const network = await api("/api/admin/network");
      $("#networkPanel").innerHTML = `
        <form id="networkForm" class="form-panel">
          <div class="panel-title">
            <div>
              <h2>Adresacja LAN</h2>
              <p>DHCP i DNS dla lokalnej sieci routera.</p>
            </div>
          </div>
          <div class="form-grid">
            ${field("lan_ip", "Adres LAN routera", network.lan_ip)}
            ${field("lan_subnet", "Maska podsieci", network.lan_subnet)}
            ${field("dhcp_start", "DHCP od", network.dhcp_start)}
            ${field("dhcp_end", "DHCP do", network.dhcp_end)}
            ${field("primary_dns", "DNS główny", network.primary_dns)}
            ${field("secondary_dns", "DNS zapasowy", network.secondary_dns)}
          </div>
          <div class="button-row">
            <button id="networkSave" class="btn btn-primary" type="submit">${icon("save")} Zapisz sieć</button>
            <button class="btn btn-secondary" type="button" data-jump-view="dashboard">${icon("dashboard")} Dashboard</button>
          </div>
        </form>`;
      $("#networkForm").onsubmit = saveNetwork;
    },
  },

  devices: {
    render: () => `
      <section class="table-panel">
        <div class="table-toolbar">
          <div>
            <h2>Podłączone urządzenia</h2>
            <p class="muted">Tabela odswieza sie automatycznie co 3 sekundy.</p>
          </div>
          <button id="refreshDevices" class="btn btn-secondary" type="button">${icon("refresh")} Odśwież</button>
        </div>
        <div class="table-wrap">
          <table class="data-table" id="devicesTable">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>IP</th>
                <th>MAC</th>
                <th>Interfejs</th>
                <th>RSSI</th>
                <th>RX</th>
                <th>TX</th>
              </tr>
            </thead>
            <tbody><tr><td colspan="7" class="muted">Ładowanie...</td></tr></tbody>
          </table>
        </div>
      </section>`,
    onMount: async () => {
      const refresh = async () => renderDevicesTable(await api("/api/admin/devices"));
      $("#refreshDevices").onclick = refresh;
      await refresh();
      const timer = setInterval(() => {
        if (state.view === "devices") refresh().catch(() => {});
      }, 3000);
      state.cleanup = () => clearInterval(timer);
    },
  },

  diagnostics: {
    render: () => `
      <section class="form-panel">
        <div class="panel-title">
          <div>
            <h2>Diagnostyka łącza</h2>
            <p>Host jest walidowany po stronie serwera. Wynik pojawi sie w terminalu ponizej.</p>
          </div>
        </div>
        <div class="diagnostic-grid">
          <label>
            <span>Host docelowy</span>
            <input id="diagHost" class="field" value="8.8.8.8" placeholder="np. 8.8.8.8" />
          </label>
          <button id="diagPing" class="btn btn-primary" type="button">${icon("terminal")} Ping</button>
          <button id="diagTrace" class="btn btn-secondary" type="button">${icon("network")} Traceroute</button>
        </div>
      </section>
      <section class="terminal-panel">
        <pre id="diagOut" class="term">Wybierz test diagnostyczny.</pre>
      </section>`,
    onMount: () => {
      $("#diagPing").onclick = () => runDiagnostic("ping");
      $("#diagTrace").onclick = () => runDiagnostic("traceroute");
    },
  },

  logs: {
    render: () => `
      <section class="terminal-panel">
        <div class="table-toolbar">
          <div>
            <h2>Live log</h2>
            <p class="muted">Nowe zdarzenia wpadaja przez SSE.</p>
          </div>
          <div class="toolbar">
            <label class="switch-card">
              <input id="logAutoScroll" type="checkbox" checked />
              <span class="switch-track" aria-hidden="true"></span>
              <span><strong>Auto-scroll</strong><small>Trzymaj dół</small></span>
            </label>
            <button id="clearLogs" class="btn btn-secondary" type="button">${icon("trash")} Wyczyść widok</button>
          </div>
        </div>
        <pre id="logOut" class="term"></pre>
      </section>`,
    onMount: async () => {
      const output = $("#logOut");
      const response = await api("/api/admin/logs");
      output.innerHTML = "";
      state.appendLog = appendLogLine;
      response.logs.forEach(appendLogLine);
      $("#clearLogs").onclick = () => { output.innerHTML = ""; };
    },
    onUnmount: () => {
      state.appendLog = null;
    },
  },

  system: {
    render: () => `<section id="systemPanel">${loadingPanel("Ładowanie systemu...")}</section>`,
    onMount: async () => {
      const system = await api("/api/admin/system");
      $("#systemPanel").innerHTML = `
        <div class="system-grid">
          <section class="panel">
            <div class="panel-title">
              <div>
                <h2>Urządzenie</h2>
                <p>Firmware i identyfikatory sprzetowe.</p>
              </div>
            </div>
            <div class="detail-list">
              ${detail("Model", system.model)}
              ${detail("Numer seryjny", system.serial)}
              ${detail("Adres MAC", system.mac)}
              ${detail("Firmware", system.firmware)}
              ${detail("Bootloader", system.bootloader)}
              ${detail("Uptime", system.uptime)}
            </div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div>
                <h2>Akcje serwisowe</h2>
                <p>Operacje symulowane przez mock backend.</p>
              </div>
            </div>
            <div class="danger-grid">
              <div class="action-tile">
                <span>
                  <strong>Restart routera</strong>
                  <p>Resetuje licznik uptime po kilku sekundach.</p>
                </span>
                <button id="restartRouter" class="btn btn-secondary" type="button">${icon("refresh")} Restart</button>
              </div>
              <div class="action-tile">
                <span>
                  <strong>Reset fabryczny</strong>
                  <p>Przywraca domyślne Wi-Fi, sieć i stan urządzenia.</p>
                </span>
                <button id="factoryReset" class="btn btn-danger" type="button">${icon("trash")} Reset</button>
              </div>
            </div>
          </section>
        </div>`;

      $("#restartRouter").onclick = restartRouter;
      $("#factoryReset").onclick = factoryReset;
    },
  },
};

function switchControl(name, title, caption, checked) {
  return `
    <label class="switch-card">
      <input type="checkbox" name="${name}" ${checked ? "checked" : ""} />
      <span class="switch-track" aria-hidden="true"></span>
      <span><strong>${escapeHTML(title)}</strong><small>${escapeHTML(caption)}</small></span>
    </label>`;
}

function field(name, label, value) {
  return `
    <label>
      <span>${escapeHTML(label)}</span>
      <input class="field" name="${name}" value="${escapeHTML(value)}" required />
    </label>`;
}

function detail(label, value) {
  return `
    <div class="detail-row">
      <small>${escapeHTML(label)}</small>
      <strong class="mono">${escapeHTML(value)}</strong>
    </div>`;
}

async function saveWifi(event) {
  event.preventDefault();
  const button = $("#wifiSave");
  setBusy(button, true, `${icon("save")} Zapisz Wi-Fi`);
  const data = new FormData(event.currentTarget);
  const body = Object.fromEntries(["ssid_2g", "ssid_5g", "password", "channel_2g", "channel_5g", "guest_ssid"]
    .map((key) => [key, data.get(key)]));
  ["enabled_2g", "enabled_5g", "guest_enabled"].forEach((key) => {
    body[key] = data.get(key) === "on";
  });

  try {
    await api("/api/admin/wifi", { method: "POST", body });
    await refreshSummary();
    toast("Wi-Fi zapisane");
  } catch (error) {
    toast(`Błąd: ${error.message}`, "err");
  } finally {
    setBusy(button, false);
  }
}

async function saveNetwork(event) {
  event.preventDefault();
  const button = $("#networkSave");
  setBusy(button, true, `${icon("save")} Zapisz sieć`);
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());

  try {
    await api("/api/admin/network", { method: "POST", body });
    toast("Sieć zapisana");
  } catch (error) {
    toast(`Błąd: ${error.message}`, "err");
  } finally {
    setBusy(button, false);
  }
}

async function renderDevicePreview() {
  const target = $("#devicePreview");
  if (!target) return;

  try {
    const response = await api("/api/admin/devices");
    target.innerHTML = response.devices.slice(0, 4).map((device) => `
      <div class="device-preview">
        <span>
          <small>${escapeHTML(device.ip)}</small>
          <strong>${escapeHTML(device.name)}</strong>
        </span>
        ${ifaceBadge(device.iface)}
      </div>`).join("");
  } catch {
    target.innerHTML = `<div class="device-preview"><span><small>Nie udało się pobrać</small><strong>Urządzenia</strong></span></div>`;
  }
}

function renderDevicesTable(response) {
  const body = $("#devicesTable tbody");
  body.innerHTML = response.devices.map((device) => `
    <tr>
      <td><strong>${escapeHTML(device.name)}</strong></td>
      <td class="mono">${escapeHTML(device.ip)}</td>
      <td class="mono">${escapeHTML(device.mac)}</td>
      <td>${ifaceBadge(device.iface)}</td>
      <td>${device.rssi == null ? "<span class=\"muted\">kablowo</span>" : `${escapeHTML(device.rssi)} dBm`}</td>
      <td class="mono">${formatMbps(device.rx)}</td>
      <td class="mono">${formatMbps(device.tx)}</td>
    </tr>`).join("");
}

async function runDiagnostic(kind) {
  const host = $("#diagHost").value.trim();
  const output = $("#diagOut");
  output.textContent = `$ ${kind} ${host}\n[uruchamianie...]`;

  try {
    const data = await api(`/api/admin/diagnostics/${kind}`, { method: "POST", body: { host } });
    output.textContent = data.output || "(brak wyjścia)";
  } catch (error) {
    output.textContent = `Błąd: ${error.message}`;
  }
}

function appendLogLine(entry) {
  const output = $("#logOut");
  if (!output) return;
  const level = text(entry.level).toLowerCase();
  const cls = level === "error" ? "log-line-error" : level === "warn" ? "log-line-warn" : "log-line-info";
  output.insertAdjacentHTML(
    "beforeend",
    `<span class="${cls}">[${escapeHTML(entry.ts)}] ${escapeHTML(level.toUpperCase().padEnd(5))}</span> ${escapeHTML(entry.msg)}\n`,
  );
  if ($("#logAutoScroll")?.checked) output.scrollTop = output.scrollHeight;
}

async function restartRouter() {
  if (!window.confirm("Zrestartować router?")) return;
  try {
    await api("/api/admin/restart", { method: "POST" });
    toast("Restart trwa");
    setTimeout(refreshSummary, 6500);
  } catch (error) {
    toast(`Błąd: ${error.message}`, "err");
  }
}

async function factoryReset() {
  if (!window.confirm("Przywrócić ustawienia fabryczne? Konfiguracja zostanie utracona.")) return;
  try {
    await api("/api/admin/factory_reset", { method: "POST" });
    await refreshSummary();
    toast("Reset fabryczny wykonany");
    mount("system");
  } catch (error) {
    toast(`Błąd: ${error.message}`, "err");
  }
}

async function mount(name) {
  const view = views[name];
  if (!view) return;

  if (state.cleanup) {
    state.cleanup();
    state.cleanup = null;
  }
  if (views[state.view]?.onUnmount) views[state.view].onUnmount();

  state.view = name;
  const [title, subtitle] = viewMeta[name];
  $("#viewTitle").textContent = title;
  $("#viewSub").textContent = subtitle;
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === name));
  $("#viewport").innerHTML = view.render();
  closeMobileMenu();
  bindJumpButtons();

  try {
    if (view.onMount) await view.onMount();
    bindJumpButtons();
  } catch (error) {
    $("#viewport").innerHTML = errorPanel(error);
  }
}

function bindJumpButtons() {
  $$("[data-jump-view]").forEach((button) => {
    button.onclick = () => mount(button.dataset.jumpView);
  });
}

function updateDashboard() {
  const summary = state.summary;
  if (!summary || state.view !== "dashboard") return;
  if (!$("#statusHeadline")) return;

  const wan = summary.wan || {};
  const wifi = summary.wifi || {};
  const status = wan.status || "Down";
  const online = text(status).toLowerCase() === "up";

  $("#statusHeadline").textContent = online ? "Połączenie działa stabilnie" : "Połączenie wymaga uwagi";
  $("#statusCopy").textContent = online
    ? "WAN jest online, a pasma Wi-Fi są dostępne dla domowych urządzeń."
    : "WAN nie odpowiada. Zacznij od diagnostyki albo restartu routera.";
  $("#wanStatusBadge").innerHTML = statusBadge(status);
  $("#wanDot").innerHTML = statusBadge(status);
  $("#wanStatus").textContent = status;
  $("#wanType").textContent = wan.type || "-";
  $("#wanTypePill").textContent = `WAN: ${wan.type || "-"}`;
  $("#opticalPill").textContent = `RX: ${wan.rx_signal ?? "-"} dBm`;
  $("#txSignalPill").textContent = `TX: ${wan.tx_signal ?? "-"} dBm`;
  $("#uptimeBig").textContent = summary.uptime || "-";
  $("#devCount").textContent = summary.devices_count ?? "-";
  $("#wanIp").textContent = wan.ipv4 || "-";
  $("#wanIp6").textContent = wan.ipv6 || "-";
  $("#rxNow").textContent = formatMbps(summary.throughput?.rx_mbps);
  $("#txNow").textContent = formatMbps(summary.throughput?.tx_mbps);
  $("#ssid2").textContent = wifi.ssid_2g || "-";
  $("#ssid5").textContent = wifi.ssid_5g || "-";
  $("#wifi2Badge").innerHTML = wifiBadge(Boolean(wifi.enabled_2g));
  $("#wifi5Badge").innerHTML = wifiBadge(Boolean(wifi.enabled_5g));
  drawSpark("#rxSpark", state.rxHistory);
  drawSpark("#txSpark", state.txHistory);
}

function startSSE() {
  if (state.evt) state.evt.close();

  const events = new EventSource("/api/stream");
  state.evt = events;

  events.addEventListener("open", () => {
    $("#liveDot").classList.remove("offline");
  });

  events.addEventListener("tick", (event) => {
    const data = JSON.parse(event.data);
    state.summary = data;
    pushThroughput(data);
    updateTopbar();
    updateDashboard();
  });

  events.addEventListener("logs", (event) => {
    const logs = JSON.parse(event.data);
    if (state.appendLog) logs.forEach(state.appendLog);
  });

  events.onerror = () => {
    $("#liveDot").classList.add("offline");
  };
}

function initTheme() {
  const preferredDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const stored = localStorage.getItem("dark");
  if (stored === "1" || (stored == null && preferredDark)) {
    document.documentElement.classList.add("dark");
  }
}

function bindShell() {
  $$(".nav-item").forEach((item) => {
    item.onclick = () => mount(item.dataset.view);
  });
  $("#logoutBtn").onclick = logout;
  $("#darkToggle").onclick = () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("dark", document.documentElement.classList.contains("dark") ? "1" : "0");
  };
  $("#menuToggle").onclick = openMobileMenu;
  $("#sidebarScrim").onclick = closeMobileMenu;
}

async function boot() {
  initTheme();

  let user = null;
  try {
    user = await checkAuth();
  } catch {
    user = null;
  }

  if (!user) {
    $("#loginScreen").classList.remove("hidden");
    $("#loginForm").onsubmit = async (event) => {
      event.preventDefault();
      $("#loginError").classList.add("hidden");
      try {
        await login($("#loginUser").value, $("#loginPass").value);
        window.location.reload();
      } catch (error) {
        $("#loginError").textContent = error.data?.error || "Błąd logowania";
        $("#loginError").classList.remove("hidden");
      }
    };
    return;
  }

  state.user = user;
  $("#loginScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  $("#navUser").textContent = user;
  $(".avatar").textContent = text(user).slice(0, 1).toUpperCase() || "A";

  bindShell();
  await refreshSummary();
  await mount("dashboard");
  startSSE();
}

boot();
