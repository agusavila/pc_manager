# Manual del Desarrollador: Sistema de Módulos (PC Manager)

Este manual documenta la arquitectura técnica, estándares de diseño, opciones disponibles de la carcasa (Core), directivas de interfaz y procedimientos de programación para desarrollar y empaquetar extensiones modulares (**Plugins / Módulos `.pcm`**) en **PC Manager**.

---

## 1. Arquitectura y Filosofía del Sistema

PC Manager es un **Software de Escritorio Nativo para Windows** construido sobre una arquitectura **Core-Modular (Microkernel)**. 

### 1.1. Principios Fundamentales
- **Desacoplamiento Absoluto**: El núcleo (Core) proporciona únicamente la carcasa de ejecución, gestión del ciclo de vida, bus de eventos, sistema de temas y registro de servicios. Ninguna lógica de negocio específica de hardware o diagnósticos particulares reside en el Core.
- **Aislamiento de Fallos**: Los módulos operan de forma aislada. Si un módulo arroja un error en tiempo de ejecución, el Core atrapa la excepción y garantiza la continuidad operativa de los demás módulos activos.
- **Filosofía White-Label (Marca Blanca)**: Toda extensión debe usar redacción técnica, formal y neutral (ej: *"Almacenamiento Local"*, *"Memoria en Uso"* en lugar de *"Tu PC"* o referencias a marcas comerciales como Intel/AMD salvo que se lean dinámicamente como telemetría).
- **Cero Modos Web**: Queda prohibido asumir la presencia de un servidor HTTP o backend remoto obligatorio. La ejecución es 100% local en la estación de trabajo.

---

## 2. Raíz del Módulo, Almacenamiento y Formato `.pcm`

### 2.1. Dónde se Guardan los Módulos en Windows
Los paquetes instalados se gestionan en el directorio de datos local de la aplicación en Windows:
- **Ruta en disco**: `%APPDATA%\pc_manager\modules\<modulo-id>\` (o la ruta provista por la API nativa de Tauri `app_data_dir()`).
- **Persistencia de Configuración**: Los estados de activación, orden, asignación de grupos y parámetros de configuración (`meta_options`) se persisten mediante comandos nativos en disco (`save_module_setting` en el backend Rust de Tauri).

### 2.2. Estructura Raíz de un Módulo
Todo módulo se organiza bajo la siguiente estructura de archivos:

```text
mi-modulo/
├── manifest.json             # Metadatos, vistas, widgets, dependencias y meta_options
├── icon.svg                  # Icono vectorial SVG (trazo limpio 24x24)
├── module.js                 # Lógica ejecutable (JavaScript de frontend y controladores)
├── widgets/                  # Plantillas de widgets para el Dashboard (opcional si van en manifest)
│   └── card-sensor.html
├── views/                    # Pantalla principal dedicada para el Sidebar
│   └── main-view.html
└── docs/                     # Tríada obligatoria de documentación
    ├── user/                 # Manual de Usuario sin tecnicismos
    ├── ai/                   # Especificación para modelos de IA y contratos
    └── developer/            # Guía técnica de desarrollo y extensión
```

### 2.3. Formato Canónico `.pcm` y Empaquetado
El paquete de distribución es un archivo comprimido estándar con extensión **`.pcm`** (*PC Manager Module*). Para empaquetarlo se utiliza cualquier herramienta ZIP o un script Node.js automatizado.

#### Script de Empaquetado (`package_module.cjs`):
```javascript
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function packagePcm() {
  const zip = new JSZip();
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('module.js', fs.readFileSync('module.js', 'utf8'));
  if (fs.existsSync('icon.svg')) {
    zip.file('icon.svg', fs.readFileSync('icon.svg', 'utf8'));
  }

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const outputName = `${manifest.id}.pcm`;
  fs.writeFileSync(outputName, content);
  console.log(`Paquete generado exitosamente: ${outputName} (${content.length} bytes)`);
}

packagePcm().catch(console.error);
```

---

## 3. Capacidades y Opciones de la Carcasa (Core) Disponibles

Un módulo puede interactuar con múltiples subsistemas expuestos por la carcasa:

### 3.1. Registro de Servicios Compartidos (`ServiceRegistry`)
Permite a los módulos exportar funcionalidades reutilizables para que otros módulos las consuman sin duplicar código ni acoplarse directamente.
- **Publicar un servicio**:
  ```javascript
  if (window.ServiceRegistry) {
    window.ServiceRegistry.register('system.memory_monitor', {
      getMemoryUsage: () => currentMemoryStats,
      onAlert: (callback) => alertCallbacks.push(callback)
    });
  }
  ```
- **Consumir un servicio de otro módulo**:
  ```javascript
  if (window.ServiceRegistry && window.ServiceRegistry.has('system.memory_monitor')) {
    const memoryService = window.ServiceRegistry.get('system.memory_monitor');
    const stats = memoryService.getMemoryUsage();
  }
  ```

### 3.2. Parámetros en Configuraciones (`meta_options`)
Si el módulo requiere parámetros configurables por el usuario, los declara en su `manifest.json`. El Core genera automáticamente la pestaña correspondiente dentro de **Configuraciones**:
- Tipos de control soportados: `switch` (booleano) y `select` (desplegable).
- **Recepción de cambios en caliente**: El Core invoca la función global `__SETTING_CHANGE_${moduleIdClean}__`:
  ```javascript
  window.__SETTING_CHANGE_mi_modulo__ = function(optionId, value) {
    if (optionId === 'refresh_rate') {
      updateInterval(parseInt(value, 10));
    } else if (optionId === 'enable_alerts') {
      alertsActive = Boolean(value);
    }
  };
  ```

### 3.3. Navegación Directa e Integración entre Vistas y Widgets
El Core proporciona la función global `switchView(viewId)` para transicionar instantáneamente entre cualquier sección de la aplicación sin recargas:

- **Navegar a la pantalla principal de un módulo**:
  ```javascript
  switchView('module-' + manifest.id);
  ```
- **Navegar al Dashboard**:
  ```javascript
  switchView('dashboard');
  ```
- **Navegar a la sección de Configuraciones**:
  ```javascript
  switchView('settings');
  ```

#### Patrón A: Vincular la Cabecera del Widget a la Pantalla del Módulo
Para que el usuario pueda hacer clic en el encabezado de una tarjeta del Dashboard y abrir la pantalla completa del módulo correspondiente:

```html
<header class="card-header" onclick="switchView('module-mi-modulo')" style="cursor: pointer;" title="Abrir pantalla completa del módulo">
  <div class="card-title-box">
    <div class="card-icon-wrap">
      <svg class="svg-icon" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    </div>
    <h4>Monitor de Telemetría</h4>
  </div>
  <div class="card-actions">
    <!-- Botón de apertura rápida explícito -->
    <button class="card-btn" onclick="event.stopPropagation(); switchView('module-mi-modulo');" data-tooltip="Ver detalles del módulo" title="Ver detalles del módulo">
      <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
    </button>
  </div>
</header>
```

#### Patrón B: Botón de Acceso a Configuraciones desde la Pantalla Principal
> [!IMPORTANT]
> **Regla de Gobernanza de Interfaz**: Si un módulo añade opciones a Configuraciones (`manifest.meta_options`), su pantalla principal (vista dedicada en `manifest.views`) debe contener obligatoriamente un botón visible y estilizado (`btn btn-secondary` o `btn-icon`) que dirija al usuario directamente a sus opciones en la pantalla de configuraciones (`switchView('settings')` y `switchSettingsTab('mod-' + moduleId)`).

```html
<div class="settings-header" style="justify-content: space-between;">
  <div style="display: flex; align-items: center; gap: 8px;">
    <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    <h4>Panel de Control Operativo</h4>
  </div>
  <button class="btn btn-secondary" onclick="switchView('settings'); switchSettingsTab('mod-mi-modulo');" title="Configurar parámetros del módulo" style="padding: 6px 12px; font-size: 12px;">
    <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    <span>Configuración</span>
  </button>
</div>
```

---

### 3.4. Componentes Interactivos Dentro de Widgets (Botones, Switches y Barras)

Las tarjetas del Dashboard admiten controles interactivos ricos.

#### Aislamiento de Drag & Drop (`event.stopPropagation`)
Debido a que el Dashboard permite arrastrar y reorganizar las tarjetas fluidamente, cualquier clic o interacción sobre un botón, input o switch debe detener la propagación del evento:

```html
<!-- Botón de acción rápida en el widget -->
<button class="btn btn-secondary" onclick="event.stopPropagation(); window.miModuloEjecutarAccion();" style="padding: 4px 10px; font-size: 11.5px; height: 26px;">
  <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
  <span>Iniciar Test</span>
</button>
```

#### Mini Switch Toggle Integrado en Tarjeta
Para alternar estados operativos directamente desde la cuadrícula:
```html
<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
  <span style="font-size: 11.5px; color: var(--text-secondary);">Modo Turbo</span>
  <label class="switch" onclick="event.stopPropagation()" title="Activar / Desactivar modo turbo">
    <input type="checkbox" id="chk-mi-modulo-turbo" onchange="event.stopPropagation(); window.miModuloSetTurbo(this.checked);">
    <span class="slider"></span>
  </label>
</div>
```

#### Barra de Progreso Dinámica
```html
<div class="metric-progress-bg">
  <div class="metric-progress-bar" id="prog-mi-modulo" style="width: 65%;"></div>
</div>
```
Para actualizarla desde JavaScript:
```javascript
const bar = document.getElementById('prog-mi-modulo');
if (bar) bar.style.width = `${porcentaje}%`;
```

---

### 3.5. Ciclo de Vida y Limpieza Determinista (`Cleanup Handler`)
Al deshabilitar o desinstalar un módulo, el Core invoca automáticamente el handler de limpieza para evitar fugas de memoria o procesos huérfanos:
```javascript
window.__CLEANUP_mi_modulo__ = function() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  if (window.ServiceRegistry) {
    window.ServiceRegistry.unregister('system.memory');
  }
  console.log('Módulo mi-modulo detenido limpiamente.');
};
```

---

### 3.6. Widgets para el Dashboard 10x10
Los módulos pueden exportar una o más tarjetas para la cuadrícula adaptable del Dashboard:
- **Tamaños disponibles**:
  - `1x1`: Micro-métrica o chip de estado (min-width: 140px).
  - `2x1`: Métrica horizontal con valor y tendencia (min-width: 220px).
  - `2x2`: Tarjeta estándar cuadrada con gráfico o reloj (min-width: 220px).
  - `3x2`: Métrica agrupada o gráfica de serie temporal (min-width: 300px).
  - `4x2`: Paneles anchos de monitoreo o listas cortas (min-width: 380px).
  - `5x2` / `5x5`: Paneles de análisis profundo o tablas (min-width: 440px).
  - `10x2`: Banner panorámico de ancho completo.
- **Regla de Cero Recortes**: Los títulos y valores deben ser 100% legibles. Prohibido recortar textos esenciales con puntos suspensivos (`ellipsis`) dentro del cuerpo de la tarjeta.
- **Menú Contextual Integrado**: Al hacer clic derecho sobre la tarjeta, el Core despliega opciones dinámicas: acceso a configuración del módulo (si posee `meta_options`), acceso a su pantalla principal, auto-organización de la cuadrícula y ocultamiento del widget.

---

### 3.7. Emisión de Notificaciones y Alertas a Windows
Los módulos pueden emitir avisos a la campana del Core y al Centro de Actividades de Windows 10/11:
```javascript
if (typeof addSystemNotification === 'function') {
  addSystemNotification(
    'Alerta de Rendimiento',
    'El consumo de recursos superó el 85%.',
    'warning',
    'modules' // Categoría
  );
}
```

---

## 4. Reglas Estrictas de Diseño y UI (Material Expressive)

Todo módulo debe acatar incondicionalmente las directivas visuales de la aplicación:

### 4.1. Nombres en el Menú Lateral (Sidebar) en Una Sola Línea
- El nombre del módulo en el sidebar debe ser conciso (recomendado: 12 a 24 caracteres).
- **Restricción CSS Obligatoria**: El Core aplica `text-overflow: ellipsis; white-space: nowrap; overflow: hidden;` sobre los textos del sidebar. El módulo debe diseñar su nombre legible en una sola línea sin depender de saltos de línea.
- Al colapsar el sidebar (mediante clic en el icono de la aplicación), el texto se oculta y sólo permanece visible el icono SVG centrado con tooltip nativo.

### 4.2. Cero Emojis como Iconos
Todo icono debe ser un gráfico vectorial SVG limpio (`<svg class="svg-icon" viewBox="0 0 24 24">...`), con trazo de `1.75px` a `2px`, esquinas redondeadas y color heredado `currentColor`. Prohibido utilizar emojis como iconos de botón o de estado.

### 4.3. Consumo Estricto de Tokens Semánticos (Cero Colores Hardcodeados)
Queda terminantemente prohibido hardcodear colores (`#000000`, `#ffffff`, `#1a1a1a`). Todos los módulos deben consumir las variables CSS del Core para integrarse armónicamente con los modos Oscuro y Claro:

| Token Semántico | Uso Recomendado |
| :--- | :--- |
| `var(--bg-card)` | Fondo de tarjetas y paneles |
| `var(--bg-elevated)` | Fondo de contenedores secundarios o inputs |
| `var(--bg-surface)` | Superficie de la vista principal |
| `var(--border-subtle)` | Bordes sutiles de separación (1px) |
| `var(--border-medium)` | Bordes activos o de tarjetas interactivas |
| `var(--text-primary)` | Títulos y métricas numéricas principales |
| `var(--text-secondary)` | Subtítulos y etiquetas secundarias |
| `var(--text-muted)` | Textos de apoyo o contexto tenue |
| `var(--accent-primary)` | Color de acento primario (seleccionable por el usuario) |
| `var(--accent-success)` | Valores nominales o estados en línea |
| `var(--accent-warning)` | Umbrales de advertencia |
| `var(--accent-danger)` | Errores o umbrales críticos |

### 4.4. Controles de Selección y Comboboxes
- Prohibido utilizar elementos `<select>` nativos del navegador sin estilizar.
- Los módulos deben utilizar las clases estandarizadas `.form-select` o `.form-select-sm` del Core, que incorporan apariencia personalizada (`appearance: none`), flecha vectorial SVG integrada y bordes semánticos.

---

## 5. Módulo de Ejemplo Completo: `memory-monitor`

A continuación se presenta un módulo de producción completo que implementa todas las directivas:

### 5.1. `manifest.json`
```json
{
  "id": "memory-monitor",
  "name": "Monitor de Memoria",
  "version": "1.0.0",
  "description": "Telemetría en tiempo real del uso de memoria RAM y detección de picos de carga.",
  "author": "Equipo de Desarrollo",
  "group": "General",
  "icon": "<svg class=\"svg-icon\" viewBox=\"0 0 24 24\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M9 3v18M15 3v18\"/></svg>",
  "entrypoint": "module.js",
  "permissions": ["system:memory"],
  "dependencies": [],
  "requires_services": [],
  "provides_services": ["system.memory"],
  "meta_options": [
    {
      "id": "refresh_interval",
      "name": "Intervalo de Muestreo",
      "desc": "Frecuencia con la que se actualizan las métricas del módulo.",
      "type": "select",
      "options": [
        { "value": "1000", "label": "1 Segundo (Alta Precisión)" },
        { "value": "3000", "label": "3 Segundos (Estándar)" },
        { "value": "5000", "label": "5 Segundos (Bajo Consumo)" }
      ],
      "default": "3000"
    },
    {
      "id": "alert_high_usage",
      "name": "Alertar Consumo Elevado",
      "desc": "Emitir aviso en la campana si la memoria supera el 85%.",
      "type": "switch",
      "default": true
    }
  ],
  "widgets": [
    {
      "id": "card-memory-monitor",
      "name": "Uso de Memoria RAM",
      "size": "2x1",
      "icon": "<svg class=\"svg-icon\" viewBox=\"0 0 24 24\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M9 3v18M15 3v18\"/></svg>",
      "html": "<header class=\"card-header\"><div class=\"card-title-box\"><div class=\"card-icon-wrap\"><svg class=\"svg-icon\" viewBox=\"0 0 24 24\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M9 3v18M15 3v18\"/></svg></div><h4>Uso de Memoria</h4></div><span class=\"card-badge\" id=\"mem-usage-badge\">ACTIVO</span></header><div class=\"card-body\"><div style=\"display:flex;justify-content:space-between;align-items:baseline;\"><div class=\"metric-big\" id=\"mem-usage-pct\">-- %</div><span class=\"card-badge\" style=\"color:var(--accent-primary);\">RAM</span></div><div class=\"metric-label\" id=\"mem-usage-gb\">Cargando telemetría...</div></div>"
    }
  ],
  "views": [
    {
      "id": "view-module-memory",
      "name": "Monitor de Memoria",
      "icon": "<svg class=\"svg-icon\" viewBox=\"0 0 24 24\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M9 3v18M15 3v18\"/></svg>",
      "html": "<div style=\"display:flex;flex-direction:column;gap:16px;\"><div class=\"settings-card\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\"><div class=\"settings-header\" style=\"margin-bottom:0;\"><svg class=\"svg-icon\" viewBox=\"0 0 24 24\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M9 3v18M15 3v18\"/></svg><h4>Panel de Memoria del Sistema</h4><span class=\"card-badge\" style=\"color:var(--accent-primary);\">v1.0.0</span></div><button class=\"btn btn-secondary\" onclick=\"switchView('settings'); switchSettingsTab('mod-memory-monitor');\" title=\"Configurar parámetros del módulo\" style=\"padding:6px 12px;font-size:12px;\"><svg class=\"svg-icon svg-icon-xs\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z\"/></svg><span>Configuración</span></button></div><p style=\"font-size:13px;color:var(--text-secondary);\">Supervisión del consumo y distribución de memoria operativa física.</p><div style=\"display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:16px;margin-top:14px;\"><div style=\"background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;\"><div style=\"font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;\">Memoria en Uso</div><div id=\"view-mem-pct\" style=\"font-size:32px;font-weight:700;color:var(--accent-primary);margin-top:6px;\">-- %</div><div id=\"view-mem-details\" style=\"font-size:12px;color:var(--text-secondary);margin-top:4px;\">Calculando...</div></div></div></div></div>"
    }
  ]
}
```

### 5.2. `module.js`
```javascript
(function() {
  const MODULE_ID = 'memory-monitor';
  let samplingInterval = 3000;
  let alertsEnabled = true;
  let timerId = null;

  let memoryStats = {
    usedPct: 48,
    usedGb: 7.68,
    totalGb: 16.0
  };

  // 1. Exportar servicio compartido a ServiceRegistry
  if (window.ServiceRegistry) {
    window.ServiceRegistry.register('system.memory', {
      getStats: () => ({ ...memoryStats })
    });
  }

  // 2. Función de recolección y actualización de UI
  function sampleMemory() {
    // Simulación neutral de telemetría de memoria
    const variance = (Math.random() * 4) - 2;
    memoryStats.usedPct = Math.min(95, Math.max(20, Math.round(memoryStats.usedPct + variance)));
    memoryStats.usedGb = parseFloat(((memoryStats.usedPct / 100) * memoryStats.totalGb).toFixed(2));

    // Actualizar Widget en Dashboard si está montado
    const pctEl = document.getElementById('mem-usage-pct');
    const gbEl = document.getElementById('mem-usage-gb');
    if (pctEl) pctEl.textContent = `${memoryStats.usedPct}%`;
    if (gbEl) gbEl.textContent = `${memoryStats.usedGb} GB de ${memoryStats.totalGb} GB`;

    // Actualizar Vista Principal si está visible
    const viewPct = document.getElementById('view-mem-pct');
    const viewDetails = document.getElementById('view-mem-details');
    if (viewPct) viewPct.textContent = `${memoryStats.usedPct}%`;
    if (viewDetails) viewDetails.textContent = `${memoryStats.usedGb} GB utilizados de ${memoryStats.totalGb} GB totales`;

    // Alerta condicional
    if (alertsEnabled && memoryStats.usedPct > 85) {
      if (typeof addSystemNotification === 'function') {
        addSystemNotification('Memoria Elevada', `Consumo en ${memoryStats.usedPct}%.`, 'warning', 'modules');
      }
    }
  }

  function startSampling() {
    if (timerId) clearInterval(timerId);
    sampleMemory();
    timerId = setInterval(sampleMemory, samplingInterval);
  }

  // 3. Listener de Meta-Opciones de Configuración
  window.__SETTING_CHANGE_memory_monitor__ = function(optionId, value) {
    if (optionId === 'refresh_interval') {
      samplingInterval = parseInt(value, 10) || 3000;
      startSampling();
    } else if (optionId === 'alert_high_usage') {
      alertsEnabled = Boolean(value);
    }
  };

  // 4. Handler de Limpieza Determinista al Desactivar o Desinstalar
  window.__CLEANUP_memory_monitor__ = function() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    if (window.ServiceRegistry) {
      window.ServiceRegistry.unregister('system.memory');
    }
    console.log('[memory-monitor] Recursos y timers liberados.');
  };

  // Arranque inmediato
  startSampling();
})();
```

---

## 6. Lista de Comprobación (Checklist) de Calidad de un Módulo

Antes de generar el paquete `.pcm` y distribuirlo, verifique los siguientes puntos:

- [ ] **White-Label**: No hay nombres personales ni rutas locales `C:\Users\...`.
- [ ] **Iconografía**: Todos los iconos son SVG vectoriales con trazo uniforme (cero emojis).
- [ ] **Tokens CSS**: Todos los elementos consumen `var(--bg-*)`, `var(--text-*)`, `var(--accent-*)`.
- [ ] **Sidebar en 1 Línea**: El nombre del módulo en el menú lateral es conciso y soporta `ellipsis`.
- [ ] **Acceso a Configuraciones**: Si declara `meta_options`, la vista principal incluye el botón directo hacia su pestaña en Configuraciones.
- [ ] **Cleanup**: Declara la función global `__CLEANUP_<id>__` cancelando timers, listeners e intervalos.
- [ ] **Widgets**: Todo widget en el Dashboard es 100% visible sin recortes en su tamaño de celda.
- [ ] **Empaquetado**: Contiene `manifest.json`, `module.js`, `icon.svg` y la carpeta `docs/` con la tríada documental.
