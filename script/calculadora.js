const puntosInput = document.getElementById("puntos");
const tiempoInput = document.getElementById("tiempo");
const resultEl = document.getElementById("result");
const puntosTableEl = document.getElementById("puntos-table");
const tiempoTableEl = document.getElementById("tiempo-table");

const TIME_FACTOR = 1.4;

function setResult(message) {
  if (resultEl) {
    resultEl.textContent = message;
  }
}

puntosInput.addEventListener("input", () => {
  let sanitized = puntosInput.value.replace(/[^\d.]/g, "");
  const firstDot = sanitized.indexOf(".");
  if (firstDot !== -1) {
    sanitized = sanitized.slice(0, firstDot + 1) + sanitized.slice(firstDot + 1).replace(/\./g, "");
  }
  if (sanitized !== puntosInput.value) {
    puntosInput.value = sanitized;
  }
});

puntosInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    document.getElementById("btn-calcular-puntos").click();
  }
});

tiempoInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    document.getElementById("btn-calcular-tiempo").click();
  }
});

function formatNumber(value) {
  return Number(value.toFixed(2)).toString();
}

function formatHoursMinutes(hoursDecimal) {
  const totalMinutes = Math.round(hoursDecimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function renderPuntosTable(puntos) {
  const puntosCaso = puntos * 0.2;
  const tiempoCaso = puntosCaso * TIME_FACTOR;
  const puntosTarea = puntos * 0.15;
  const tiempoTarea = puntosTarea * TIME_FACTOR;

  puntosTableEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Puntos caso</th>
          <th>Tiempo caso</th>
          <th>Puntos tarea</th>
          <th>Tiempo tarea</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${formatNumber(puntosCaso)}</td>
          <td>${formatHoursMinutes(tiempoCaso)}</td>
          <td>${formatNumber(puntosTarea)}</td>
          <td>${formatHoursMinutes(tiempoTarea)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

document.getElementById("btn-calcular-puntos").addEventListener("click", () => {
  const puntos = parseFloat(puntosInput.value);
  if (!Number.isFinite(puntos)) {
    puntosTableEl.innerHTML = "";
    setResult("Ingresa un valor válido en Puntos.");
    return;
  }

  setResult("");
  renderPuntosTable(puntos);
});

function parseTiempoInput(value) {
  const matches = value.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length > 2) {
    return null;
  }

  const hours = parseFloat(matches[0]);
  const minutes = matches.length > 1 ? parseFloat(matches[1]) : 0;

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours + minutes / 60;
}

function renderTiempoTable(puntos) {
  tiempoTableEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Puntos</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${formatNumber(puntos)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

document.getElementById("btn-calcular-tiempo").addEventListener("click", () => {
  const totalHours = parseTiempoInput(tiempoInput.value);
  if (totalHours === null) {
    tiempoTableEl.innerHTML = "";
    setResult("Ingresa un tiempo válido, ej: 2h 15 (2h 15m).");
    return;
  }

  const puntos = totalHours / TIME_FACTOR;
  setResult("");
  renderTiempoTable(puntos);
});
