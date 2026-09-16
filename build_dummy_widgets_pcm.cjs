const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function buildShowcaseModule() {
  const zip = new JSZip();

  const allSizes = [
    { size: "1x1", name: "Widget 1x1", label: "1x1" },
    { size: "2x1", name: "Widget 2x1", label: "2x1" },
    { size: "2x2", name: "Widget 2x2", label: "2x2" },
    { size: "3x2", name: "Widget 3x2", label: "3x2" },
    { size: "4x2", name: "Widget 4x2", label: "4x2" },
    { size: "4x3", name: "Widget 4x3", label: "4x3" },
    { size: "4x4", name: "Widget 4x4", label: "4x4" },
    { size: "6x2", name: "Widget 6x2", label: "6x2" },
    { size: "6x4", name: "Widget 6x4", label: "6x4" },
    { size: "8x2", name: "Widget 8x2", label: "8x2" },
    { size: "12x2", name: "Widget 12x2", label: "12x2" },
    { size: "banner", name: "Widget Banner", label: "banner" }
  ];

  const iconSvg = `<svg class="svg-icon" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>`;

  const widgets = allSizes.map(item => {
    const cardId = `card-dummy-${item.size.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    let headerHtml = '';
    let bodyHtml = '';

    if (item.size === '1x1') {
      headerHtml = `
        <header class="card-header">
          <div class="card-title-box">
            <div class="card-icon-wrap">
              ${iconSvg}
            </div>
            <h4>1x1</h4>
          </div>
        </header>
      `;
      bodyHtml = `
        <div class="card-body">
          <div class="metric-big" style="text-align:center;">1x1</div>
        </div>
      `;
    } else if (item.size === '2x1') {
      headerHtml = `
        <header class="card-header">
          <div class="card-title-box">
            <div class="card-icon-wrap">
              ${iconSvg}
            </div>
            <h4>${item.name}</h4>
          </div>
          <span class="card-badge">${item.label}</span>
        </header>
      `;
      bodyHtml = `
        <div class="card-body">
          <div class="metric-big" style="text-align:center;">${item.label}</div>
        </div>
      `;
    } else {
      headerHtml = `
        <header class="card-header">
          <div class="card-title-box">
            <div class="card-icon-wrap">
              ${iconSvg}
            </div>
            <h4>${item.name}</h4>
          </div>
          <span class="card-badge">${item.label}</span>
        </header>
      `;
      bodyHtml = `
        <div class="card-body" style="display:flex;align-items:center;justify-content:center;height:100%;min-height:0;">
          <div class="metric-big" style="font-size:28px;font-weight:700;letter-spacing:1px;color:var(--accent-primary);text-align:center;">${item.label}</div>
        </div>
      `;
    }

    return {
      id: cardId,
      name: item.name,
      size: item.size,
      html: `
        ${headerHtml.trim()}
        ${bodyHtml.trim()}
      `
    };
  });

  const manifest = {
    id: "dummy-widgets",
    name: "Muestrario de Tamaños de Widgets",
    version: "1.0.0",
    description: "Módulo demostrativo con todos los tamaños de widgets soportados por el Dashboard (1x1, 2x1, 2x2, 3x2, 4x2, 4x3, 4x4, 6x2, 6x4, 8x2, 12x2 y banner). Cada widget está vacío y muestra exclusivamente su tamaño.",
    author: "Core Engine",
    group: "General",
    entrypoint: "module.js",
    permissions: [],
    dependencies: [],
    provides_services: [],
    meta_options: [],
    widgets: widgets,
    views: [
      {
        id: "view-module-dummy-widgets",
        name: "Muestrario de Widgets",
        icon: iconSvg,
        html: `
          <div style="display:flex;flex-direction:column;gap:16px;">
            <div class="settings-card">
              <div class="settings-header" style="margin-bottom:8px;">
                <svg class="svg-icon" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>
                <h4>Muestrario de Tamaños de Widgets</h4>
                <span class="card-badge" style="color:var(--accent-primary);">v1.0.0</span>
              </div>
              <p style="font-size:13px;color:var(--text-secondary);line-height:1.5;">
                Este módulo provee 12 widgets vacíos con todos los factores de forma del sistema (1x1, 2x1, 2x2, 3x2, 4x2, 4x3, 4x4, 6x2, 6x4, 8x2, 12x2 y banner).
              </p>
              <div style="margin-top:14px;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px;">
                <div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">Instrucciones de Uso:</div>
                <ol style="font-size:12px;color:var(--text-secondary);padding-left:18px;line-height:1.6;margin:0;">
                  <li>Dirígete al <strong>Dashboard</strong> desde el menú lateral.</li>
                  <li>Pulsa el botón <strong>"Widgets"</strong> en la barra superior para abrir el catálogo lateral.</li>
                  <li>Activa cualquiera de los 12 tamaños disponibles para colocarlos y probar la reorganización matricial en tiempo real.</li>
                </ol>
              </div>
            </div>
          </div>
        `
      }
    ]
  };

  const moduleJs = `
(function() {
  console.log('[dummy-widgets] Módulo muestrario de tamaños de widgets cargado.');

  window.__CLEANUP_dummy_widgets__ = function() {
    console.log('[dummy-widgets] Limpieza de módulo ejecutada.');
    delete window.__CLEANUP_dummy_widgets__;
  };
})();
`;

  const readme = `# Módulo Muestrario de Tamaños de Widgets (v1.0.0)

Módulo demostrativo que exporta 12 widgets vacíos cubriendo todos los factores de forma del Dashboard de PC Manager:
- 1x1: Micro-totalizador
- 2x1: Chip métrico
- 2x2: Cuadrado mediano
- 3x2: Estándar 16:9
- 4x2: Control extendido
- 4x3: Historial mediano
- 4x4: Cuadrado grande
- 6x2: Panorámico medio
- 6x4: Cuadrante 50%
- 8x2: Panorámico ancho
- 12x2: Ancho completo
- banner: Banner panorámico 12x2
`;

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('module.js', moduleJs);
  zip.file('README.md', readme);

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const outputPath = path.join(__dirname, 'dummy-widgets.pcm');
  fs.writeFileSync(outputPath, content);
  console.log(`Paquete dummy-widgets.pcm generado exitosamente en la raíz: ${outputPath} (${content.length} bytes)`);

  // Guardar también en modules/dummy-widgets para referencia en el repositorio
  const modDir = path.join(__dirname, 'modules', 'dummy-widgets');
  if (!fs.existsSync(modDir)) {
    fs.mkdirSync(modDir, { recursive: true });
  }
  fs.writeFileSync(path.join(modDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(modDir, 'module.js'), moduleJs);
  fs.writeFileSync(path.join(modDir, 'README.md'), readme);
  console.log(`Archivos fuente del módulo guardados en modules/dummy-widgets/`);
}

buildShowcaseModule().catch(err => {
  console.error('Error generando paquete:', err);
  process.exit(1);
});
