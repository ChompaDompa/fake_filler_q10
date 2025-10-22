// background.js (MV3 service worker)
// Detecta códigos JIRA tipo JK-#### desde la omnibox y búsquedas, y redirige a la URL de JIRA.

const JIRA_BASE = "https://q10.atlassian.net/browse/";
// Valida formatos de ticket para varios proyectos: JK-, JQ-, AQ-, JACK-, JH-, JS-
const TICKET_RE = /^(JK|JQ|AQ|JACK|JH|JS)-\d+$/i;

function isTicket(text) {
  if (!text) return false;
  return TICKET_RE.test(String(text).trim());
}

function toJiraUrl(ticket) {
  return JIRA_BASE + String(ticket).trim().toUpperCase();
}

// Omnibox: al escribir "jk <código>", si coincide el patrón, abrimos la URL de JIRA.
if (chrome.omnibox) {
  try {
    chrome.omnibox.setDefaultSuggestion({
      description:
        "Abrir %s en JIRA (proyectos: JK, JQ, AQ, JACK, JH, JS)"
    });
  } catch (_) {
    // Algunos navegadores pueden no soportar setDefaultSuggestion en ciertos contextos.
  }

  chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    const value = (text || "").trim();
    if (!isTicket(value)) return; // Si no coincide, no hacemos nada.

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

// Búsquedas normales: si una navegación de pestaña apunta a un buscador con una query exacta JK-####, redirigimos.
chrome.webNavigation.onCommitted.addListener(async (details) => {
  // Solo marco principal de la pestaña
  if (details.frameId !== 0) return;

  const rawUrl = details.url || "";
  let ticket = null;
  try {
    const u = new URL(rawUrl);

    // Recorremos todos los parámetros de la query (?q=JK-1234, etc.)
    for (const [, value] of u.searchParams.entries()) {
      const v = decodeURIComponent(value || "").trim();
      if (isTicket(v)) {
        ticket = v;
        break;
      }
    }

    // Si no hay parámetro exacto, no hacemos nada (permitimos navegación normal)
    if (!ticket) return;

    const target = toJiraUrl(ticket);
    chrome.tabs.update(details.tabId, { url: target });
  } catch (_) {
    // Si la URL no se puede parsear, ignoramos y dejamos navegación normal.
  }
});
