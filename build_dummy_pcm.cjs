const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function buildDummyModule() {
  const zip = new JSZip();

  const manifest = {
    id: "system-clock",
    name: "Reloj del Sistema",
    version: "1.0.0",
    description: "Módulo de muestra con widget interactivo de reloj y tiempo operativo.",
    author: "Modular Engine",
    group: "General",
    entrypoint: "module.js",
    permissions: [],
    dependencies: [],
    requires_services: [],
    provides_services: ["system.clock"],
    widgets: [
      {
        id: "card-system-clock",
        name: "Reloj Digital del Sistema",
        size: "2x1",
        html: `<header class="card-header"><div class="card-title-box"><div class="card-icon-wrap"><svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div><h4>Reloj del Sistema</h4></div><span class="card-badge">2x1</span></header><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:baseline;"><div class="metric-big" id="clock-time-display" style="font-size:24px;">--:--:--</div><span class="card-badge" style="color:var(--accent-success);">EN VIVO</span></div><div class="metric-label" id="clock-date-display">Sincronizado con tiempo local</div></div>`
      }
    ],
    views: [
      {
        id: "view-module-clock",
        name: "Reloj del Sistema",
        icon: `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        html: `<div class="settings-card"><div class="settings-header"><svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><h4>Panel de Reloj del Sistema</h4></div><p style="font-size:13px;color:var(--text-secondary);">Módulo independiente cargado dinámicamente desde paquete .pcm.</p><div style="display:flex;gap:20px;margin-top:16px;"><div style="background:var(--bg-elevated);padding:16px;border-radius:var(--radius-md);flex:1;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Hora Local Actual</div><div id="full-clock-time" style="font-size:32px;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent-primary);margin-top:6px;">--:--:--</div></div><div style="background:var(--bg-elevated);padding:16px;border-radius:var(--radius-md);flex:1;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Fecha del Sistema</div><div id="full-clock-date" style="font-size:20px;font-family:'JetBrains Mono',monospace;font-weight:600;margin-top:12px;">--</div></div></div></div>`
      }
    ]
  };

  const moduleJs = `
function updateClockDisplays() {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const dateStr = now.toLocaleDateString();

  const cardTime = document.getElementById('clock-time-display');
  const cardDate = document.getElementById('clock-date-display');
  const fullTime = document.getElementById('full-clock-time');
  const fullDate = document.getElementById('full-clock-date');

  if (cardTime) cardTime.textContent = timeStr;
  if (cardDate) cardDate.textContent = dateStr;
  if (fullTime) fullTime.textContent = timeStr;
  if (fullDate) fullDate.textContent = dateStr;
}

if (!window.__CLOCK_TIMER__) {
  window.__CLOCK_TIMER__ = setInterval(updateClockDisplays, 1000);
  updateClockDisplays();
}
`;

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

  const readme = `# Módulo Reloj del Sistema
Paquete .pcm compilado para pruebas de instalación en caliente en PC Manager Core.
`;

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('module.js', moduleJs);
  zip.file('icon.svg', iconSvg);
  zip.file('README.md', readme);

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const outputPath = path.join(__dirname, 'system-clock.pcm');
  fs.writeFileSync(outputPath, content);
  console.log(`Paquete generado exitosamente: ${outputPath} (${content.length} bytes)`);
}

buildDummyModule().catch(err => {
  console.error('Error generando paquete:', err);
  process.exit(1);
});
