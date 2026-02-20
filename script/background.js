// background.js (MV3 service worker)
// - Detecta tickets JIRA tipo JK-#### desde la omnibox/b�squedas y redirige a JIRA.
// - Comando SLOT:
//     slot <n> <host.q10.com>
//     slot subida <host.q10.com>
//     slot <n> https://siteX.q10.com/login?...   (aplica inmediato)
//     slot subida https://siteX.q10.com/login?... (aplica inmediato)
//     slot <host.q10.com>  (equivale a slot 1 <host>)
//   Nota: s�lo redirecciona cuando se usa el comando. No persiste estado m�s all� del flujo iniciado.

const JIRA_BASE = "https://q10.atlassian.net/browse/";
const TICKET_RE = /^(JK|JQ|AQ|JACK|JH|JS)-\d+$/i;

const Q10_SUFFIX_RE = /\.q10\.com\.?$/i;
const SITE_HOST_RE = /^site\d*\.q10\.com$/i; // site, site2, etc.
const QA_TARGET_RE = /^qa\d+\.q10\.com$/i;
const AZURE_SUBIDA_URL = "https://appservicejack1-staging.azurewebsites.net/";

// Reglas DNR por pesta�a (no persistimos estado manualmente)
function dnrRuleId(tabId) {
  return 100000 + Number(tabId);
}
function addSlotRedirectRule(tabId, mode, slotNum) {
  const id = dnrRuleId(tabId);
  let targetHost;
  if (mode === "subida") {
    const azure = new URL(AZURE_SUBIDA_URL);
    targetHost = azure.hostname;
  } else {
    const n = slotNum || 1;
    targetHost = `qa${n}.q10.com`;
  }
  const rule = {
    id,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { transform: { scheme: "https", host: targetHost } }
    },
    condition: {
      regexFilter: "^https?://site\\d*\\.q10\\.com/",
      resourceTypes: ["main_frame"],
      tabIds: [Number(tabId)]
    }
  };
  return new Promise((resolve) => {
    chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id], addRules: [rule] }, () => resolve());
  });
}
function removeSlotRule(tabId) {
  const id = dnrRuleId(tabId);
  return new Promise((resolve) => {
    chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id] }, () => resolve());
  });
}

function isTicket(text) {
  if (!text) return false;
  return TICKET_RE.test(String(text).trim());
}

function toJiraUrl(ticket) {
  return JIRA_BASE + String(ticket).trim().toUpperCase();
}

// Omnibox JIRA (palabra clave: jk)
if (chrome.omnibox) {
  try {
    chrome.omnibox.setDefaultSuggestion({
      description: "Abrir %s en JIRA (proyectos: JK, JQ, AQ, JACK, JH, JS)"
    });
  } catch (_) {}

  chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    const value = (text || "").trim();
    if (!isTicket(value)) return;
    const url = toJiraUrl(value);
    switch (disposition) {
      case "currentTab":
        chrome.tabs.update({ url });
        break;
      case "newForegroundTab":
        chrome.tabs.create({ url });
        break;
      case "newBackgroundTab":
        chrome.tabs.create({ url, active: false });
        break;
      default:
        chrome.tabs.update({ url });
    }
  });
}

// Utilidades SLOT
function parseHostFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      return u.hostname || null;
    }
  } catch (_) {}
  if (/^[a-z0-9.-]+$/i.test(raw)) {
    return raw.replace(/\/$/, "").toLowerCase();
  }
  return null;
}

function parseUrlFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    if (!/^https?:\/\//i.test(raw)) return null;
    return new URL(raw);
  } catch (_) {
    return null;
  }
}

function extractSlotCommand(value) {
  // Acepta:
  //   - "slot 2 pruebasordenesdepago2025.q10.com"
  //   - "slot subida pruebasordenesdepago2025.q10.com"
  //   - "slot 2 https://site2.q10.com/login?..." (aplica inmediato)
  //   - "slot subida https://site2.q10.com/login?..." (aplica inmediato)
  //   - Compat: "slot pruebasordenesdepago2025.q10.com" (equivale a slot 1)
  const v = String(value || "").trim();

  // Modo con host/url obligatorio
  let m = /^slot\s+(subida|\d+)\s+(.+)$/i.exec(v);
  if (m) {
    const modeRaw = m[1].toLowerCase();
    const targetRaw = m[2];
    const asUrl = parseUrlFromText(targetRaw);
    if (asUrl && SITE_HOST_RE.test(asUrl.hostname)) {
      if (modeRaw === "subida") return { siteUrl: asUrl, mode: "subida" };
      const slotNum = parseInt(modeRaw, 10);
      if (!Number.isFinite(slotNum) || slotNum <= 0) return null;
      return { siteUrl: asUrl, mode: "qa", slotNum };
    }
    const host = parseHostFromText(targetRaw);
    if (!host || !Q10_SUFFIX_RE.test(host)) return null;
    if (modeRaw === "subida") return { originHost: host, mode: "subida" };
    const slotNum = parseInt(modeRaw, 10);
    if (!Number.isFinite(slotNum) || slotNum <= 0) return null;
    return { originHost: host, mode: "qa", slotNum };
  }

  // Compat: "slot <host.q10.com>" => usa slotNum=1
  m = /^slot\s+(.+)$/i.exec(v);
  if (!m) return null;
  const host = parseHostFromText(m[1]);
  if (!host || !Q10_SUFFIX_RE.test(host)) return null;
  return { originHost: host, mode: "qa", slotNum: 1 };
}

async function markTabForSlot(tabId, originHost, opts) {
  const { mode, slotNum } = opts || {};
  await addSlotRedirectRule(tabId, mode, slotNum);
}

// Navegaciones: detectar tickets y comandos "slot ..."
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const rawUrl = details.url || "";
  let ticket = null;
  let slotCmd = null;
  try {
    const u = new URL(rawUrl);

    // Recorremos todos los par�metros (?q=...)
    for (const [, value] of u.searchParams.entries()) {
      const v = decodeURIComponent(value || "").trim();
      if (!ticket && isTicket(v)) ticket = v;
      if (!slotCmd) {
        const maybe = extractSlotCommand(v);
        if (maybe) slotCmd = maybe;
      }
    }

    // SLOT: comando detectado
    if (slotCmd) {
      // Directo sobre site*.q10.com ? aplicar inmediato
      if (slotCmd.siteUrl) {
        const u2 = new URL(slotCmd.siteUrl.toString());
        if (slotCmd.mode === "subida") {
          const base = new URL(AZURE_SUBIDA_URL);
          const next = new URL(u2.pathname + u2.search + u2.hash, base);
          chrome.tabs.update(details.tabId, { url: next.toString() });
          return;
        } else {
          const n = slotCmd.slotNum || 1;
          const targetHost = `qa${n}.q10.com`;
          u2.hostname = targetHost;
          chrome.tabs.update(details.tabId, { url: u2.toString() });
          return;
        }
      }

      // Con host *.q10.com ? navegar y preparar swap SOLO para este flujo
      if (slotCmd.originHost) {
        const { mode, slotNum } = slotCmd;
        const dest = `https://${slotCmd.originHost}/`;
        await markTabForSlot(details.tabId, slotCmd.originHost, { mode, slotNum });
        chrome.tabs.update(details.tabId, { url: dest });
        return;
      }
    }

    // JIRA: redirecci�n si hay ticket
    if (!ticket) return;
    const target = toJiraUrl(ticket);
    chrome.tabs.update(details.tabId, { url: target });
  } catch (_) {
    // ignorar
  }
});

// Limpieza de la regla: si ya estamos en el host destino (qaN...) o en AZURE, quitamos la regla
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  try {
    const u = new URL(details.url || "");
    const host = u.hostname || "";
    const azureHost = new URL(AZURE_SUBIDA_URL).hostname;
    if (QA_TARGET_RE.test(host) || host.toLowerCase() === azureHost.toLowerCase()) {
      await removeSlotRule(details.tabId);
    }
  } catch (_) {}
});