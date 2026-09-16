# Especificación para Modelos de IA: Sistema Modular de PC Manager

Esta especificación proporciona las directivas técnicas formales, esquemas JSON estrictos, contratos de ejecución JavaScript, APIs globales y reglas de arquitectura para que cualquier modelo o agente de IA genere, valide o audite **Módulos (`.pcm`)** en **PC Manager**.

---

## 1. Esquema Formal del Manifiesto (`manifest.json`)

Todo módulo debe incluir un archivo `manifest.json` en su raíz. El contenido debe apegarse estrictamente a la siguiente estructura TypeScript / JSON Schema:

```typescript
interface ModuleManifest {
  /** Identificador único en kebab-case (ej. "cpu-monitor", "storage-cleaner"). Prohibido espacios o mayúsculas. */
  id: string;

  /** Nombre formal y legible para el usuario en interfaz (12 a 24 caracteres recomendados). */
  name: string;

  /** Versión del módulo en formato SemVer (ej. "1.0.0"). */
  version: string;

  /** Descripción técnica y neutral del propósito del módulo. */
  description: string;

  /** Identificador o nombre del autor / organización. */
  author: string;

  /** Grupo al que se asigna inicialmente en el sidebar. Por defecto "General". */
  group?: string;

  /** Icono vectorial SVG representativo en 24x24 (cero emojis). */
  icon: string;

  /** Archivo JavaScript de punto de entrada (generalmente "module.js"). */
  entrypoint: string;

  /** Lista de permisos declarados (ej. ["system:hardware", "notifications"]). */
  permissions?: string[];

  /** IDs de otros módulos que deben estar presentes y activos. */
  dependencies?: string[];

  /** IDs de servicios requeridos de ServiceRegistry. */
  requires_services?: string[];

  /** IDs de servicios que este módulo exporta al ServiceRegistry. */
  provides_services?: string[];

  /** Parámetros configurables que el Core inyecta automáticamente en la pestaña de Configuraciones. */
  meta_options?: ModuleMetaOption[];

  /** Tarjetas exportadas para la cuadrícula del Dashboard. */
  widgets?: ModuleWidgetDefinition[];

  /** Pantallas o vistas dedicadas que se agregan a la navegación del Sidebar. */
  views?: ModuleViewDefinition[];

  /** HTML de botones o acciones contextuales inyectables en la barra superior al estar en la vista del módulo. */
  topbar_actions?: string;
}

interface ModuleMetaOption {
  /** Identificador del parámetro dentro del módulo (snake_case recomendado). */
  id: string;

  /** Etiqueta visible del control. */
  name: string;

  /** Explicación del impacto de esta opción. */
  desc: string;

  /** Tipo de control UI generado por el Core. */
  type: "switch" | "select";

  /** Valor por defecto (booleano para switch, string para select). */
  default: boolean | string;

  /** Opciones disponibles si el tipo es "select". */
  options?: Array<{
    value: string;
    label: string;
  }>;
}

interface ModuleWidgetDefinition {
  /** Identificador único del widget en el DOM (ej. "card-cpu-temp"). */
  id: string;

  /** Nombre del widget mostrado en el catálogo de personalización. */
  name: string;

  /** Tamaño asignado en la cuadrícula del Dashboard (cols x rows). */
  size: "1x1" | "1x2" | "1x3" | "1x4" | "2x1" | "2x2" | "2x3" | "2x4" | "3x2" | "3x4" | "4x2" | "4x3" | "4x4" | "4x6" | "6x2" | "6x4" | "8x2" | "12x2" | "banner";

  /** Orientación recomendada para visualización e insignia en el Drawer. */
  orientation?: "horizontal" | "vertical" | "universal";

  /** Icono vectorial SVG para el catálogo. */
  icon?: string;

  /** Estructura HTML de la tarjeta (debe incluir cabecera, título, icono y cuerpo). */
  html: string;
}

interface ModuleViewDefinition {
  /** Identificador de la vista. El Core la registrará internamente como "view-module-<manifest.id>". */
  id: string;

  /** Nombre visible de la pantalla en la barra superior y navegación. */
  name: string;

  /** Icono vectorial SVG de navegación. */
  icon?: string;

  /** HTML que compone el cuerpo operativo de la pantalla principal. */
  html: string;
}
```

---

## 2. Convenciones de Identificadores y Sanitización

El Core convierte el `manifest.id` en un formato seguro para nombres de funciones y variables globales de JavaScript:

```javascript
const cleanId = manifest.id.replace(/[^a-zA-Z0-9_]/g, '_');
```

- Si `manifest.id` es `"memory-monitor"`, `cleanId` es `"memory_monitor"`.
- Los hooks del ciclo de vida se nombran obligatoriamente:
  - `window.__SETTING_CHANGE_${cleanId}__ = function(optionId, value) { ... }`
  - `window.__CLEANUP_${cleanId}__ = function() { ... }`

---

## 3. APIs Globales Expuestas por el Core

Todo script `module.js` se ejecuta en el contexto global del WebView y tiene acceso a las siguientes funciones canónicas:

| Función | Firma | Descripción |
| :--- | :--- | :--- |
| `switchView(viewId)` | `(viewId: string) => void` | Navega a cualquier pantalla de la aplicación. Para ir a la vista del módulo: `switchView('module-' + manifest.id)`. Para ir al Dashboard: `switchView('dashboard')`. Para ir a Ajustes: `switchView('settings')`. |
| `switchSettingsTab(tabId)` | `(tabId: string) => void` | Cambia la pestaña activa en la vista de Ajustes. Para la pestaña de este módulo: `switchSettingsTab('mod-' + manifest.id)`. |
| `addSystemNotification` | `(title: string, text: string, type: 'info'\|'success'\|'warning'\|'danger', category?: string) => void` | Emite una notificación en la campana/drawer y, si el usuario lo activó, un aviso Toast nativo a Windows 10/11. |
| `getTauriInvoke()` | `() => Function \| null` | Retorna la función de invocación nativa IPC de Tauri (`window.__TAURI__.core.invoke`). Permite comunicarse con el backend Rust. |
| `window.ServiceRegistry` | `Object` | Bus de servicios desacoplados: `register(id, instance)`, `unregister(id)`, `get(id)`, `has(id)`, `list()`. |

---

## 4. Patrones de Interacción Obligatorios

### 4.1. Widget con Redirección a la Pantalla Principal del Módulo
Para que una tarjeta del Dashboard o uno de sus botones lleve al usuario directamente a la vista dedicada del módulo:

```html
<!-- En el HTML del widget (manifest.widgets[...].html): -->
<header class="card-header" onclick="switchView('module-mi-modulo')" style="cursor: pointer;" title="Abrir pantalla del módulo">
  <div class="card-title-box">
    <div class="card-icon-wrap">
      <!-- Icono SVG -->
    </div>
    <h4>Telemetría en Vivo</h4>
  </div>
  <button class="card-btn" onclick="event.stopPropagation(); switchView('module-mi-modulo');" title="Maximizar en pantalla completa">
    <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
  </button>
</header>
```

> [!IMPORTANT]
> **Detener Propagación de Arrastre (`event.stopPropagation()`)**: El Dashboard implementa Drag & Drop en las tarjetas. Todo elemento interactivo (botones, selectores, enlaces, switches) dentro de un widget DEBE invocar `event.stopPropagation()` en sus eventos de clic o cambio para evitar que el puntero inicie un arrastre accidental de la tarjeta.

---

### 4.2. Acceso Obligatorio a Configuraciones
Si el módulo define `manifest.meta_options`, es **estrictamente obligatorio** proveer un botón visible en su pantalla principal (`manifest.views[0].html`) que conduzca a su pestaña en Configuraciones:

```html
<button class="btn btn-secondary" onclick="switchView('settings'); switchSettingsTab('mod-mi-modulo');" title="Configuración del Módulo">
  <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
  <span>Configuración</span>
</button>
```

---

### 4.3. Acciones Interactivas y Mini-Switches Dentro de Widgets
Los widgets pueden incluir botones de ejecución rápida o interruptores toggle compactos:

```html
<!-- Mini Switch dentro de una tarjeta -->
<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
  <span style="font-size: 11px; color: var(--text-secondary);">Modo Automático</span>
  <label class="switch" onclick="event.stopPropagation()">
    <input type="checkbox" id="chk-auto-mode" onchange="miModuloToggleAuto(this.checked)">
    <span class="slider"></span>
  </label>
</div>

<!-- Botón de acción rápida -->
<button class="btn btn-secondary" onclick="event.stopPropagation(); miModuloEjecutarAccion();" style="font-size: 11px; padding: 4px 8px; height: 26px;">
  <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
  <span>Optimizar</span>
</button>
```

### 4.3. Especificación Geométrica del Tablero Proporcional (Matriz 12x8)

Todo agente de IA que genere widgets para el Dashboard debe basarse en el contrato geométrico top-down del Core:

#### Matriz Canónica Proporcional (12 Columnas $\times$ 8 Filas)
- **Lienzo Bounded**: El alto y ancho de celda se calculan directamente a partir del espacio útil del contenedor `#grid-board`, logrando **residuo cero al fondo**:
  - $W_{\text{cell}} = (W_{\text{net}} - 11 \times \text{gap}) / 12$
  - $H_{\text{cell}} = (H_{\text{net}} - 7 \times \text{gap}) / 8$
- **En 1080p estándar** ($W_{\text{net}} = 1567\text{ px}$, $H_{\text{net}} = 901\text{ px}$, $\text{gap} = 12\text{ px}$):
  - $W_{\text{cell}} \approx \mathbf{120\text{ px}}$
  - $H_{\text{cell}} \approx \mathbf{102\text{ px}}$

#### Catálogo de Tamaños Finales de Widgets
$$\text{Ancho en px} = (\text{spanCol} \times W_{\text{cell}}) + ((\text{spanCol} - 1) \times 12\text{px})$$
$$\text{Alto en px} = (\text{spanRow} \times H_{\text{cell}}) + ((\text{spanRow} - 1) \times 12\text{px})$$

- **`1x1`** ($\approx \mathbf{120 \times 102\text{ px}}$): Micro-totalizador / KPI unitario con valor y badge.
- **`2x1`** ($\approx \mathbf{252 \times 102\text{ px}}$): Chip métrico horizontal (RAM, disco rápido).
- **`2x2`** ($\approx \mathbf{252 \times 216\text{ px}}$): Reloj analógico, medidores circulares.
- **`3x2`** ($\approx \mathbf{384 \times 216\text{ px}}$): Tarjeta estándar 16:9 (Reloj digital, temporizador, cronómetro).
- **`4x2`** ($\approx \mathbf{516 \times 216\text{ px}}$): Monitoreo extendido de red o doble disco.
- **`4x3` / `4x4`** ($\approx \mathbf{516 \times 330\text{ px}}$ / $\approx \mathbf{516 \times 444\text{ px}}$): Historiales con scroll interno y gráficas ricas.
- **`6x2`** ($\approx \mathbf{780 \times 216\text{ px}}$): Panel panorámico medio.
- **`6x4`** ($\approx \mathbf{780 \times 444\text{ px}}$): Cuadrante de medio lienzo (50% de ancho $\times$ 50% de alto).
- **`12x2` / `banner`** ($\approx \mathbf{1567 \times 216\text{ px}}$): Banner horizontal de ancho completo.

#### Capas de Márgenes de Seguridad
1. Viewport: `padding: 20px 24px;`.
2. Tablero: `padding: 16px;` y `border: 1px`.
3. Inter-widget: `gap: 12px;`.
4. Contención Drag & Drop: `targetCol` en $[1, 12 - \text{spanCol} + 1]$, `targetRow` en $[1, 8 - \text{spanRow} + 1]$. Cero scrollbars.

---

## 5. Arquitectura del Ciclo de Vida en `module.js`

El código de `module.js` debe estructurarse como una función auto-ejecutable (IIFE) para no contaminar el espacio global excepto por los hooks obligatorios:

```javascript
(function() {
  const MODULE_ID = 'mi-modulo';
  const CLEAN_ID = 'mi_modulo';

  // 1. Estado local del módulo
  let configState = {
    pollingInterval: 2000,
    notifyThreshold: 80
  };
  let intervalTimer = null;

  // 2. Registro en ServiceRegistry (Opcional)
  if (window.ServiceRegistry) {
    window.ServiceRegistry.register('diagnostics.storage', {
      getQuickReport: () => ({ status: 'HEALTHY', usagePct: 42 })
    });
  }

  // 3. Funciones operativas de actualización
  function tick() {
    const valueEl = document.getElementById('widget-val-storage');
    if (valueEl) {
      valueEl.textContent = `${Math.floor(Math.random() * 30 + 40)}%`;
    }
  }

  function start() {
    if (intervalTimer) clearInterval(intervalTimer);
    tick();
    intervalTimer = setInterval(tick, configState.pollingInterval);
  }

  // 4. Hook Reactivo de Cambio de Configuraciones (OBLIGATORIO si hay meta_options)
  window[`__SETTING_CHANGE_${CLEAN_ID}__`] = function(optionId, value) {
    if (optionId === 'sampling_rate') {
      configState.pollingInterval = parseInt(value, 10) || 2000;
      start();
    }
  };

  // 5. Hook de Limpieza Determinista (OBLIGATORIO)
  window[`__CLEANUP_${CLEAN_ID}__`] = function() {
    if (intervalTimer) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
    if (window.ServiceRegistry) {
      window.ServiceRegistry.unregister('diagnostics.storage');
    }
    console.log(`[${MODULE_ID}] Recursos detenidos y desregistrados deterministamente.`);
  };

  // 6. Arranque inicial
  start();
})();
```

---

## 6. Persistencia de Datos con Rust / Tauri IPC

Si el módulo necesita persistir datos propios en disco (más allá de las `meta_options` automáticas):

```javascript
const invokeFn = getTauriInvoke();
if (invokeFn) {
  // Guardar configuración personalizada en disco
  invokeFn('save_module_setting', {
    moduleId: 'mi-modulo',
    optionId: 'custom_cache_data',
    value: JSON.stringify({ lastRun: Date.now(), items: [1, 2, 3] })
  }).catch(err => console.warn('Error persistiendo en disco:', err));

  // Leer configuración al inicio
  invokeFn('get_saved_settings', { moduleId: 'mi-modulo' })
    .then(settings => {
      if (settings && settings.custom_cache_data) {
        const data = JSON.parse(settings.custom_cache_data);
      }
    });
}
```

---

## 7. Catálogo de Clases CSS Oficiales (Material Expressive)

Todo módulo debe utilizar las clases CSS ya definidas en la carcasa:

### 7.1. Botones y Controles
- `.btn`: Botón base con padding semántico y transiciones `cubic-bezier`.
- `.btn-primary`: Fondo acento primario y texto blanco.
- `.btn-secondary`: Fondo elevado `--bg-elevated` y borde sutil `--border-medium`.
- `.btn-icon`: Botón cuadrado de 38x38 centrado para iconos.
- `.btn-icon-xs`: Botón compacto de 24x24 para barras de herramientas internas.
- `.switch` + `.slider`: Interruptor de palanca con thumb perfectamente centrado.
- `[data-tooltip="Texto"]`: Micro-tooltip interactivo al posar el cursor (`hover`).

### 7.2. Tarjetas y Métricas
- `.card-header`: Cabecera estándar de tarjeta con título y acciones.
- `.card-title-box`: Contenedor flexible para icono y nombre.
- `.card-icon-wrap`: Caja 28x28 para el icono del sensor.
- `.card-badge`: Píldora de texto en fuente monoespaciada con borde sutil.
- `.card-body`: Contenedor central flexible para métricas.
- `.metric-big`: Tipografía de 26px JetBrains Mono para números grandes.
- `.metric-label`: Etiqueta secundaria en 11.5px.
- `.metric-progress-bg` + `.metric-progress-bar`: Barra de progreso redondeada.

---

## 8. Tres Ejemplos Graduales de Implementación

### 8.1. Ejemplo Básico: Contador Operativo con Botón a Pantalla de Módulo
```json
{
  "id": "quick-counter",
  "name": "Contador Rápido",
  "version": "1.0.0",
  "description": "Widget ligero para seguimiento de eventos locales.",
  "author": "Core Lab",
  "icon": "<svg class=\"svg-icon\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/></svg>",
  "entrypoint": "module.js",
  "widgets": [
    {
      "id": "card-quick-counter",
      "name": "Contador de Eventos",
      "size": "2x1",
      "html": "<header class=\"card-header\" onclick=\"switchView('module-quick-counter')\" style=\"cursor:pointer;\"><div class=\"card-title-box\"><div class=\"card-icon-wrap\"><svg class=\"svg-icon\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/></svg></div><h4>Contador</h4></div><button class=\"card-btn\" onclick=\"event.stopPropagation(); switchView('module-quick-counter');\"><svg class=\"svg-icon svg-icon-xs\" viewBox=\"0 0 24 24\"><polyline points=\"15 3 21 3 21 9\"/><polyline points=\"9 21 3 21 3 15\"/></svg></button></header><div class=\"card-body\"><div style=\"display:flex;justify-content:space-between;align-items:center;\"><div class=\"metric-big\" id=\"counter-num\">0</div><button class=\"btn btn-primary\" onclick=\"event.stopPropagation(); window.__incrementCounter();\" style=\"padding:4px 10px;font-size:12px;\">+1</button></div></div>"
    }
  ],
  "views": [
    {
      "id": "view-module-quick-counter",
      "name": "Contador Rápido",
      "html": "<div class=\"settings-card\"><h4>Historial del Contador</h4><p>Registro local de eventos contados.</p><div id=\"counter-view-total\" style=\"font-size:32px;font-weight:700;margin-top:10px;\">0</div></div>"
    }
  ]
}
```

---

## 9. Invariantes Críticas para Modelos de IA

1. **PROHIBIDO EMOJIS**: Generar únicamente gráficos vectoriales `<svg class="svg-icon" viewBox="0 0 24 24">` con trazos modernos.
2. **PROHIBIDO COLORES HARDCODEADOS**: Nunca emitir estilos como `background: #111` o `color: white`. Usar siempre variables semánticas (`var(--bg-card)`, `var(--text-primary)`).
3. **PROHIBIDO PERDER EVENTOS POR PROPAGACIÓN**: Añadir siempre `onclick="event.stopPropagation(); ..."` a los botones o controles situados dentro del cuerpo o cabecera de las tarjetas del Dashboard.
4. **PROHIBIDO CREAR MÓDULOS HUÉRFANOS SIN CLEANUP**: Todo script debe declarar `window.__CLEANUP_<cleanId>__` que destruya intervalos y temporizadores.
5. **POLÍTICA DE NOTIFICACIONES Y CERO SPAM RUTINARIO**: Las notificaciones son legítimas y bienvenidas al instalar un módulo nuevo, al configurarse parámetros, o cuando el núcleo o los módulos detecten eventos de sistema, alertas de salud o condiciones operativas (incluso durante el inicio del sistema si hay condiciones reales que reportar). Lo que queda estrictamente prohibido es re-emitir en bucle notificaciones rutinarias de 'módulo instalado' cada vez que el Core abre y restaura los módulos preexistentes desde el disco.
6. **FORMATO DE EMPAQUETADO**: El entregable final de un módulo es un archivo ZIP comprimido con extensión `.pcm` que contenga `manifest.json`, `module.js`, `icon.svg` y la carpeta `docs/`.
