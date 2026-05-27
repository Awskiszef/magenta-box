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
  lang: localStorage.getItem("adminLang") || "pl",
};

const viewMeta = {
  dashboard: ["nav.dashboard", "view.dashboardSub"],
  wifi: ["nav.wifi", "view.wifiSub"],
  network: ["nav.network", "view.networkSub"],
  devices: ["nav.devices", "view.devicesSub"],
  diagnostics: ["nav.diagnostics", "view.diagnosticsSub"],
  logs: ["nav.logs", "view.logsSub"],
  system: ["nav.system", "view.systemSub"],
};

const I18N = {
  pl: {
    "app.langLabel": "Język",
    "login.eyebrow": "Panel administracyjny",
    "login.title": "Zarządzaj siecią bez zgadywania.",
    "login.copy": "Live status, konfiguracja Wi-Fi, diagnostyka i logi w jednym czystym widoku.",
    "login.password": "Hasło",
    "login.submit": "Zaloguj",
    "login.demo": "Demo:",
    "login.error": "Błąd logowania",
    "aria.sidebar": "Nawigacja",
    "aria.nav": "Główne widoki",
    "aria.theme": "Zmień motyw",
    "aria.logout": "Wyloguj",
    "aria.menu": "Otwórz menu",
    "nav.dashboard": "Dashboard",
    "nav.wifi": "Wi-Fi",
    "nav.network": "Sieć",
    "nav.devices": "Urządzenia",
    "nav.diagnostics": "Diagnostyka",
    "nav.logs": "Logi",
    "nav.system": "System",
    "sidebar.logged": "Zalogowany",
    "topbar.live": "live",
    "view.dashboardSub": "Stan urządzenia w czasie rzeczywistym",
    "view.wifiSub": "Konfiguracja sieci bezprzewodowej",
    "view.networkSub": "Adresacja LAN, DHCP i DNS",
    "view.devicesSub": "Klienci aktywni w sieci domowej",
    "view.diagnosticsSub": "Testy sieciowe wykonywane po stronie routera",
    "view.logsSub": "Strumień zdarzeń systemowych",
    "view.systemSub": "Informacje i akcje serwisowe",
    "common.loading": "Ładowanie...",
    "common.loadingWifi": "Ładowanie Wi-Fi...",
    "common.loadingNetwork": "Ładowanie sieci...",
    "common.loadingSystem": "Ładowanie systemu...",
    "common.working": "Pracuje...",
    "common.refresh": "Odśwież",
    "common.retry": "Spróbuj ponownie",
    "common.errorTitle": "Coś poszło nie tak",
    "common.fetchError": "Nie udało się pobrać danych.",
    "common.errorPrefix": "Błąd",
    "common.dashboard": "Dashboard",
    "common.save": "Zapisz",
    "common.back": "Cofnij",
    "common.noData": "Brak danych",
    "common.noOutput": "(brak wyjścia)",
    "common.starting": "uruchamianie...",
    "status.online": "online",
    "status.offline": "offline",
    "status.active": "aktywne",
    "status.disabled": "wyłączone",
    "status.wired": "kablowo",
    "dashboard.ready": "Router gotowy",
    "dashboard.statusCopy": "Podgląd łącza, urządzeń i Wi-Fi aktualizuje się automatycznie przez Server-Sent Events.",
    "dashboard.headlineOnline": "Połączenie działa stabilnie",
    "dashboard.headlineOffline": "Połączenie wymaga uwagi",
    "dashboard.copyOnline": "WAN jest online, a pasma Wi-Fi są dostępne dla domowych urządzeń.",
    "dashboard.copyOffline": "WAN nie odpowiada. Zacznij od diagnostyki albo restartu routera.",
    "dashboard.wifiTitle": "Sieci Wi-Fi",
    "dashboard.wifiSub": "Aktualny broadcast SSID",
    "dashboard.editWifi": "Edytuj Wi-Fi",
    "dashboard.devicesTitle": "Ostatnie urządzenia",
    "dashboard.devicesSub": "Najbardziej aktywni klienci",
    "dashboard.devicesLink": "Lista urządzeń",
    "dashboard.statusWan": "Status WAN",
    "dashboard.uptime": "Czas pracy",
    "dashboard.uptimeSub": "Od ostatniego restartu",
    "dashboard.devicesMetric": "Urządzenia",
    "dashboard.devicesMetricSub": "Aktywne klienty",
    "dashboard.download": "Pobieranie",
    "dashboard.upload": "Wysyłanie",
    "dashboard.samples": "Ostatnie 30 próbek",
    "dashboard.refreshed": "Dashboard odświeżony",
    "wifi.title": "Konfiguracja Wi-Fi",
    "wifi.sub": "Zmiany są zapisywane w mockowym stanie routera.",
    "wifi.password": "Hasło Wi-Fi",
    "wifi.showPassword": "Pokaż hasło",
    "wifi.channel24": "Kanał 2.4 GHz",
    "wifi.channel5": "Kanał 5 GHz",
    "wifi.guestSsid": "SSID gościa",
    "wifi.compat": "Sieć kompatybilna",
    "wifi.fastBand": "Szybkie pasmo",
    "wifi.guest": "Sieć gościnna",
    "wifi.guestSub": "Izolowany dostęp",
    "wifi.save": "Zapisz Wi-Fi",
    "wifi.saved": "Wi-Fi zapisane",
    "network.title": "Adresacja LAN",
    "network.sub": "DHCP i DNS dla lokalnej sieci routera.",
    "network.lanIp": "Adres LAN routera",
    "network.subnet": "Maska podsieci",
    "network.dhcpStart": "DHCP od",
    "network.dhcpEnd": "DHCP do",
    "network.primaryDns": "DNS główny",
    "network.secondaryDns": "DNS zapasowy",
    "network.save": "Zapisz sieć",
    "network.saved": "Sieć zapisana",
    "devices.title": "Podłączone urządzenia",
    "devices.sub": "Tabela odświeża się automatycznie co 3 sekundy.",
    "devices.name": "Nazwa",
    "devices.interface": "Interfejs",
    "devices.fetchError": "Nie udało się pobrać",
    "diagnostics.title": "Diagnostyka łącza",
    "diagnostics.sub": "Host jest walidowany po stronie serwera. Wynik pojawi się w terminalu poniżej.",
    "diagnostics.host": "Host docelowy",
    "diagnostics.placeholder": "np. 8.8.8.8",
    "diagnostics.ready": "Wybierz test diagnostyczny.",
    "logs.title": "Live log",
    "logs.sub": "Nowe zdarzenia wpadają przez SSE.",
    "logs.autoscroll": "Auto-scroll",
    "logs.keepBottom": "Trzymaj dół",
    "logs.clear": "Wyczyść widok",
    "system.title": "Urządzenie",
    "system.sub": "Firmware i identyfikatory sprzętowe.",
    "system.serial": "Numer seryjny",
    "system.mac": "Adres MAC",
    "system.actions": "Akcje serwisowe",
    "system.actionsSub": "Operacje symulowane przez mock backend.",
    "system.restartTitle": "Restart routera",
    "system.restartSub": "Resetuje licznik uptime po kilku sekundach.",
    "system.factoryTitle": "Reset fabryczny",
    "system.factorySub": "Przywraca domyślne Wi-Fi, sieć i stan urządzenia.",
    "system.restartConfirm": "Zrestartować router?",
    "system.factoryConfirm": "Przywrócić ustawienia fabryczne? Konfiguracja zostanie utracona.",
    "system.restartToast": "Restart trwa",
    "system.factoryToast": "Reset fabryczny wykonany",
  },
  en: {
    "app.langLabel": "Language",
    "login.eyebrow": "Admin panel",
    "login.title": "Manage your network without guesswork.",
    "login.copy": "Live status, Wi-Fi settings, diagnostics, and logs in one clean view.",
    "login.password": "Password",
    "login.submit": "Sign in",
    "login.demo": "Demo:",
    "login.error": "Login failed",
    "aria.sidebar": "Navigation",
    "aria.nav": "Main views",
    "aria.theme": "Change theme",
    "aria.logout": "Log out",
    "aria.menu": "Open menu",
    "nav.dashboard": "Dashboard",
    "nav.wifi": "Wi-Fi",
    "nav.network": "Network",
    "nav.devices": "Devices",
    "nav.diagnostics": "Diagnostics",
    "nav.logs": "Logs",
    "nav.system": "System",
    "sidebar.logged": "Signed in",
    "topbar.live": "live",
    "view.dashboardSub": "Real-time device status",
    "view.wifiSub": "Wireless network configuration",
    "view.networkSub": "LAN addressing, DHCP, and DNS",
    "view.devicesSub": "Active clients on the home network",
    "view.diagnosticsSub": "Network tests run by the router",
    "view.logsSub": "System event stream",
    "view.systemSub": "Device information and service actions",
    "common.loading": "Loading...",
    "common.loadingWifi": "Loading Wi-Fi...",
    "common.loadingNetwork": "Loading network...",
    "common.loadingSystem": "Loading system...",
    "common.working": "Working...",
    "common.refresh": "Refresh",
    "common.retry": "Try again",
    "common.errorTitle": "Something went wrong",
    "common.fetchError": "Could not load data.",
    "common.errorPrefix": "Error",
    "common.dashboard": "Dashboard",
    "common.save": "Save",
    "common.back": "Cancel",
    "common.noData": "No data",
    "common.noOutput": "(no output)",
    "common.starting": "starting...",
    "status.online": "online",
    "status.offline": "offline",
    "status.active": "active",
    "status.disabled": "disabled",
    "status.wired": "wired",
    "dashboard.ready": "Router ready",
    "dashboard.statusCopy": "Link, device, and Wi-Fi status updates automatically through Server-Sent Events.",
    "dashboard.headlineOnline": "Connection is stable",
    "dashboard.headlineOffline": "Connection needs attention",
    "dashboard.copyOnline": "WAN is online, and Wi-Fi bands are available for home devices.",
    "dashboard.copyOffline": "WAN is not responding. Start with diagnostics or restart the router.",
    "dashboard.wifiTitle": "Wi-Fi networks",
    "dashboard.wifiSub": "Current SSID broadcast",
    "dashboard.editWifi": "Edit Wi-Fi",
    "dashboard.devicesTitle": "Recent devices",
    "dashboard.devicesSub": "Most active clients",
    "dashboard.devicesLink": "Device list",
    "dashboard.statusWan": "WAN status",
    "dashboard.uptime": "Uptime",
    "dashboard.uptimeSub": "Since last restart",
    "dashboard.devicesMetric": "Devices",
    "dashboard.devicesMetricSub": "Active clients",
    "dashboard.download": "Download",
    "dashboard.upload": "Upload",
    "dashboard.samples": "Last 30 samples",
    "dashboard.refreshed": "Dashboard refreshed",
    "wifi.title": "Wi-Fi configuration",
    "wifi.sub": "Changes are saved into the router mock state.",
    "wifi.password": "Wi-Fi password",
    "wifi.showPassword": "Show password",
    "wifi.channel24": "2.4 GHz channel",
    "wifi.channel5": "5 GHz channel",
    "wifi.guestSsid": "Guest SSID",
    "wifi.compat": "Compatible network",
    "wifi.fastBand": "Fast band",
    "wifi.guest": "Guest network",
    "wifi.guestSub": "Isolated access",
    "wifi.save": "Save Wi-Fi",
    "wifi.saved": "Wi-Fi saved",
    "network.title": "LAN addressing",
    "network.sub": "DHCP and DNS for the local router network.",
    "network.lanIp": "Router LAN address",
    "network.subnet": "Subnet mask",
    "network.dhcpStart": "DHCP from",
    "network.dhcpEnd": "DHCP to",
    "network.primaryDns": "Primary DNS",
    "network.secondaryDns": "Secondary DNS",
    "network.save": "Save network",
    "network.saved": "Network saved",
    "devices.title": "Connected devices",
    "devices.sub": "The table refreshes automatically every 3 seconds.",
    "devices.name": "Name",
    "devices.interface": "Interface",
    "devices.fetchError": "Could not load",
    "diagnostics.title": "Link diagnostics",
    "diagnostics.sub": "The host is validated server-side. Output appears in the terminal below.",
    "diagnostics.host": "Target host",
    "diagnostics.placeholder": "e.g. 8.8.8.8",
    "diagnostics.ready": "Choose a diagnostic test.",
    "logs.title": "Live log",
    "logs.sub": "New events arrive through SSE.",
    "logs.autoscroll": "Auto-scroll",
    "logs.keepBottom": "Keep bottom",
    "logs.clear": "Clear view",
    "system.title": "Device",
    "system.sub": "Firmware and hardware identifiers.",
    "system.serial": "Serial number",
    "system.mac": "MAC address",
    "system.actions": "Service actions",
    "system.actionsSub": "Operations simulated by the mock backend.",
    "system.restartTitle": "Router restart",
    "system.restartSub": "Resets the uptime counter after a few seconds.",
    "system.factoryTitle": "Factory reset",
    "system.factorySub": "Restores default Wi-Fi, network, and device state.",
    "system.restartConfirm": "Restart the router?",
    "system.factoryConfirm": "Restore factory settings? Configuration will be lost.",
    "system.restartToast": "Restart in progress",
    "system.factoryToast": "Factory reset completed",
  },
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
const t = (key) => I18N[state.lang]?.[key] || I18N.pl[key] || key;

function applyLanguage() {
  if (!I18N[state.lang]) state.lang = "pl";
  document.documentElement.lang = state.lang;
  localStorage.setItem("adminLang", state.lang);
  $$("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  $$("[data-i18n-title]").forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });
  $$("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
  $$("[data-lang]").forEach((button) => {
    const active = button.dataset.lang === state.lang;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

async function setLanguage(lang) {
  if (!I18N[lang] || state.lang === lang) return;
  state.lang = lang;
  applyLanguage();
  if (!$("#appShell").classList.contains("hidden")) {
    await mount(state.view);
  }
}

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
  button.innerHTML = busy ? `${icon("refresh")} ${t("common.working")}` : button.dataset.readyLabel;
}

function statusBadge(status) {
  const ok = text(status).toLowerCase() === "up";
  return `<span class="status-badge ${ok ? "status-ok" : "status-err"}">${ok ? t("status.online") : t("status.offline")}</span>`;
}

function wifiBadge(enabled) {
  return `<span class="badge ${enabled ? "badge-ok" : "badge-err"}">${enabled ? t("status.active") : t("status.disabled")}</span>`;
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

function loadingPanel(label = t("common.loading")) {
  return `<div class="panel empty-state">${icon("refresh")} ${escapeHTML(label)}</div>`;
}

function errorPanel(error) {
  return `
    <div class="panel page-error">
      <div>
        <h2>${t("common.errorTitle")}</h2>
        <p>${escapeHTML(error?.message || t("common.fetchError"))}</p>
      </div>
      <button class="btn btn-secondary" type="button" onclick="mount('${state.view}')">${icon("refresh")} ${t("common.retry")}</button>
    </div>`;
}

const views = {
  dashboard: {
    render: () => `
      <div class="dashboard-layout">
        <section class="status-panel">
          <div class="status-content">
            <div class="status-title">
              <h2 id="statusHeadline">${t("dashboard.ready")}</h2>
              <span id="wanStatusBadge">${statusBadge("Up")}</span>
            </div>
            <p class="status-copy" id="statusCopy">
              ${t("dashboard.statusCopy")}
            </p>
            <div class="status-actions">
              <button class="btn btn-primary" id="refreshSummaryBtn" type="button">${icon("refresh")} ${t("common.refresh")}</button>
              <button class="btn btn-secondary" type="button" data-jump-view="diagnostics">${icon("terminal")} ${t("nav.diagnostics")}</button>
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
                <h3>${t("dashboard.wifiTitle")}</h3>
              <p>${t("dashboard.wifiSub")}</p>
              </div>
              <button class="icon-btn" type="button" data-jump-view="wifi" title="${t("dashboard.editWifi")}" aria-label="${t("dashboard.editWifi")}">${icon("wifi")}</button>
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
              <h3>${t("dashboard.devicesTitle")}</h3>
              <p>${t("dashboard.devicesSub")}</p>
              </div>
              <button class="icon-btn" type="button" data-jump-view="devices" title="${t("dashboard.devicesLink")}" aria-label="${t("dashboard.devicesLink")}">${icon("devices")}</button>
            </div>
            <div id="devicePreview" class="device-preview-list">
              <div class="device-preview"><span><small>${t("common.noData")}</small><strong>-</strong></span></div>
            </div>
          </section>
        </aside>
      </div>

      <div class="metric-grid">
        <article class="metric-card">
          <div class="metric-label">${t("dashboard.statusWan")} <span id="wanDot">${statusBadge("Up")}</span></div>
          <strong class="metric-value" id="wanStatus">-</strong>
          <p class="metric-sub" id="wanType">-</p>
        </article>
        <article class="metric-card">
          <div class="metric-label">${t("dashboard.uptime")} ${icon("system")}</div>
          <strong class="metric-value" id="uptimeBig">-</strong>
          <p class="metric-sub">${t("dashboard.uptimeSub")}</p>
        </article>
        <article class="metric-card">
          <div class="metric-label">${t("dashboard.devicesMetric")} ${icon("devices")}</div>
          <strong class="metric-value" id="devCount">-</strong>
          <p class="metric-sub">${t("dashboard.devicesMetricSub")}</p>
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
              <h3>${t("dashboard.download")}</h3>
              <p>${t("dashboard.samples")}</p>
            </div>
            <strong class="throughput-value" id="rxNow">-</strong>
          </div>
          <div class="spark" id="rxSpark" aria-hidden="true"></div>
        </section>
        <section class="chart-panel">
          <div class="panel-title">
            <div>
              <h3>${t("dashboard.upload")}</h3>
              <p>${t("dashboard.samples")}</p>
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
          setBusy(button, true, `${icon("refresh")} ${t("common.refresh")}`);
        try {
          await refreshSummary();
          toast(t("dashboard.refreshed"));
        } catch (error) {
          toast(`${t("common.errorPrefix")}: ${error.message}`, "err");
        } finally {
          setBusy(button, false);
        }
      };
      await renderDevicePreview();
    },
  },

  wifi: {
    render: () => `<section id="wifiPanel">${loadingPanel(t("common.loadingWifi"))}</section>`,
    onMount: async () => {
      const wifi = await api("/api/admin/wifi");
      $("#wifiPanel").innerHTML = `
        <form id="wifiForm" class="form-panel">
          <div class="panel-title">
            <div>
              <h2>${t("wifi.title")}</h2>
              <p>${t("wifi.sub")}</p>
            </div>
            <button class="btn btn-secondary" id="wifiReload" type="button">${icon("refresh")} ${t("common.back")}</button>
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
              <label for="wifiPassword">${t("wifi.password")}</label>
              <span class="password-row">
                <input id="wifiPassword" class="field" name="password" type="password" value="${escapeHTML(wifi.password)}" required />
                <button id="togglePassword" class="icon-btn" type="button" title="${t("wifi.showPassword")}" aria-label="${t("wifi.showPassword")}">${icon("eye")}</button>
              </span>
            </div>
            <label>
              <span>${t("wifi.channel24")}</span>
              <select class="select" name="channel_2g">
                ${["auto", "1", "6", "11"].map((channel) => `<option value="${channel}" ${channel === wifi.channel_2g ? "selected" : ""}>${channel}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>${t("wifi.channel5")}</span>
              <select class="select" name="channel_5g">
                ${["auto", "36", "40", "44", "48", "149"].map((channel) => `<option value="${channel}" ${channel === wifi.channel_5g ? "selected" : ""}>${channel}</option>`).join("")}
              </select>
            </label>
            <label class="span-2">
              <span>${t("wifi.guestSsid")}</span>
              <input class="field" name="guest_ssid" value="${escapeHTML(wifi.guest_ssid)}" />
            </label>
          </div>

          <div class="toggle-grid">
            ${switchControl("enabled_2g", "2.4 GHz", t("wifi.compat"), wifi.enabled_2g)}
            ${switchControl("enabled_5g", "5 GHz", t("wifi.fastBand"), wifi.enabled_5g)}
            ${switchControl("guest_enabled", t("wifi.guest"), t("wifi.guestSub"), wifi.guest_enabled)}
          </div>

          <div class="button-row">
            <button id="wifiSave" class="btn btn-primary" type="submit">${icon("save")} ${t("wifi.save")}</button>
            <button class="btn btn-secondary" type="button" data-jump-view="dashboard">${icon("dashboard")} ${t("common.dashboard")}</button>
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
    render: () => `<section id="networkPanel">${loadingPanel(t("common.loadingNetwork"))}</section>`,
    onMount: async () => {
      const network = await api("/api/admin/network");
      $("#networkPanel").innerHTML = `
        <form id="networkForm" class="form-panel">
          <div class="panel-title">
            <div>
              <h2>${t("network.title")}</h2>
              <p>${t("network.sub")}</p>
            </div>
          </div>
          <div class="form-grid">
            ${field("lan_ip", t("network.lanIp"), network.lan_ip)}
            ${field("lan_subnet", t("network.subnet"), network.lan_subnet)}
            ${field("dhcp_start", t("network.dhcpStart"), network.dhcp_start)}
            ${field("dhcp_end", t("network.dhcpEnd"), network.dhcp_end)}
            ${field("primary_dns", t("network.primaryDns"), network.primary_dns)}
            ${field("secondary_dns", t("network.secondaryDns"), network.secondary_dns)}
          </div>
          <div class="button-row">
            <button id="networkSave" class="btn btn-primary" type="submit">${icon("save")} ${t("network.save")}</button>
            <button class="btn btn-secondary" type="button" data-jump-view="dashboard">${icon("dashboard")} ${t("common.dashboard")}</button>
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
            <h2>${t("devices.title")}</h2>
            <p class="muted">${t("devices.sub")}</p>
          </div>
          <button id="refreshDevices" class="btn btn-secondary" type="button">${icon("refresh")} ${t("common.refresh")}</button>
        </div>
        <div class="table-wrap">
          <table class="data-table" id="devicesTable">
            <thead>
              <tr>
                <th>${t("devices.name")}</th>
                <th>IP</th>
                <th>MAC</th>
                <th>${t("devices.interface")}</th>
                <th>RSSI</th>
                <th>RX</th>
                <th>TX</th>
              </tr>
            </thead>
            <tbody><tr><td colspan="7" class="muted">${t("common.loading")}</td></tr></tbody>
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
            <h2>${t("diagnostics.title")}</h2>
            <p>${t("diagnostics.sub")}</p>
          </div>
        </div>
        <div class="diagnostic-grid">
          <label>
            <span>${t("diagnostics.host")}</span>
            <input id="diagHost" class="field" value="8.8.8.8" placeholder="${t("diagnostics.placeholder")}" />
          </label>
          <button id="diagPing" class="btn btn-primary" type="button">${icon("terminal")} Ping</button>
          <button id="diagTrace" class="btn btn-secondary" type="button">${icon("network")} Traceroute</button>
        </div>
      </section>
      <section class="terminal-panel">
        <pre id="diagOut" class="term">${t("diagnostics.ready")}</pre>
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
            <h2>${t("logs.title")}</h2>
            <p class="muted">${t("logs.sub")}</p>
          </div>
          <div class="toolbar">
            <label class="switch-card">
              <input id="logAutoScroll" type="checkbox" checked />
              <span class="switch-track" aria-hidden="true"></span>
              <span><strong>${t("logs.autoscroll")}</strong><small>${t("logs.keepBottom")}</small></span>
            </label>
            <button id="clearLogs" class="btn btn-secondary" type="button">${icon("trash")} ${t("logs.clear")}</button>
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
    render: () => `<section id="systemPanel">${loadingPanel(t("common.loadingSystem"))}</section>`,
    onMount: async () => {
      const system = await api("/api/admin/system");
      $("#systemPanel").innerHTML = `
        <div class="system-grid">
          <section class="panel">
            <div class="panel-title">
              <div>
                <h2>${t("system.title")}</h2>
                <p>${t("system.sub")}</p>
              </div>
            </div>
            <div class="detail-list">
              ${detail("Model", system.model)}
              ${detail(t("system.serial"), system.serial)}
              ${detail(t("system.mac"), system.mac)}
              ${detail("Firmware", system.firmware)}
              ${detail("Bootloader", system.bootloader)}
              ${detail("Uptime", system.uptime)}
            </div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div>
                <h2>${t("system.actions")}</h2>
                <p>${t("system.actionsSub")}</p>
              </div>
            </div>
            <div class="danger-grid">
              <div class="action-tile">
                <span>
                  <strong>${t("system.restartTitle")}</strong>
                  <p>${t("system.restartSub")}</p>
                </span>
                <button id="restartRouter" class="btn btn-secondary" type="button">${icon("refresh")} Restart</button>
              </div>
              <div class="action-tile">
                <span>
                  <strong>${t("system.factoryTitle")}</strong>
                  <p>${t("system.factorySub")}</p>
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
  setBusy(button, true, `${icon("save")} ${t("wifi.save")}`);
  const data = new FormData(event.currentTarget);
  const body = Object.fromEntries(["ssid_2g", "ssid_5g", "password", "channel_2g", "channel_5g", "guest_ssid"]
    .map((key) => [key, data.get(key)]));
  ["enabled_2g", "enabled_5g", "guest_enabled"].forEach((key) => {
    body[key] = data.get(key) === "on";
  });

  try {
    await api("/api/admin/wifi", { method: "POST", body });
    await refreshSummary();
    toast(t("wifi.saved"));
  } catch (error) {
    toast(`${t("common.errorPrefix")}: ${error.message}`, "err");
  } finally {
    setBusy(button, false);
  }
}

async function saveNetwork(event) {
  event.preventDefault();
  const button = $("#networkSave");
  setBusy(button, true, `${icon("save")} ${t("network.save")}`);
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());

  try {
    await api("/api/admin/network", { method: "POST", body });
    toast(t("network.saved"));
  } catch (error) {
    toast(`${t("common.errorPrefix")}: ${error.message}`, "err");
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
    target.innerHTML = `<div class="device-preview"><span><small>${t("devices.fetchError")}</small><strong>${t("nav.devices")}</strong></span></div>`;
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
      <td>${device.rssi == null ? `<span class="muted">${t("status.wired")}</span>` : `${escapeHTML(device.rssi)} dBm`}</td>
      <td class="mono">${formatMbps(device.rx)}</td>
      <td class="mono">${formatMbps(device.tx)}</td>
    </tr>`).join("");
}

async function runDiagnostic(kind) {
  const host = $("#diagHost").value.trim();
  const output = $("#diagOut");
  output.textContent = `$ ${kind} ${host}\n[${t("common.starting")}]`;

  try {
    const data = await api(`/api/admin/diagnostics/${kind}`, { method: "POST", body: { host } });
    output.textContent = data.output || t("common.noOutput");
  } catch (error) {
    output.textContent = `${t("common.errorPrefix")}: ${error.message}`;
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
  if (!window.confirm(t("system.restartConfirm"))) return;
  try {
    await api("/api/admin/restart", { method: "POST" });
    toast(t("system.restartToast"));
    setTimeout(refreshSummary, 6500);
  } catch (error) {
    toast(`${t("common.errorPrefix")}: ${error.message}`, "err");
  }
}

async function factoryReset() {
  if (!window.confirm(t("system.factoryConfirm"))) return;
  try {
    await api("/api/admin/factory_reset", { method: "POST" });
    await refreshSummary();
    toast(t("system.factoryToast"));
    mount("system");
  } catch (error) {
    toast(`${t("common.errorPrefix")}: ${error.message}`, "err");
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
  $("#viewTitle").textContent = t(title);
  $("#viewSub").textContent = t(subtitle);
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

  $("#statusHeadline").textContent = online ? t("dashboard.headlineOnline") : t("dashboard.headlineOffline");
  $("#statusCopy").textContent = online
    ? t("dashboard.copyOnline")
    : t("dashboard.copyOffline");
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

function bindLanguageControls() {
  $$("[data-lang]").forEach((button) => {
    button.onclick = () => setLanguage(button.dataset.lang);
  });
}

async function boot() {
  initTheme();
  applyLanguage();
  bindLanguageControls();

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
        $("#loginError").textContent = error.data?.error || t("login.error");
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
  applyLanguage();
  await refreshSummary();
  await mount("dashboard");
  startSSE();
}

boot();
