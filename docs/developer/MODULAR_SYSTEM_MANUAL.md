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

### 3.6. Widgets para el Dashboard Isométrico (Isometric Modular Grid)

Los módulos pueden exportar una o más tarjetas para el Dashboard de **PC Manager**. Para diseñar widgets armónicos, legibles y bien encajados, todo desarrollador debe conocer la geometría física exacta del sistema:

#### A. Jerarquía Espacial y Dimensiones Reales del Lienzo Útil
El lienzo de colocación de widgets (`#grid-board`) reside dentro de una cadena de contención espacial que descuenta elementos estructurales fijos de la ventana:

1. **Sidebar lateral**: Ocupa **271 px** horizontales expandido (o **71 px** colapsado).
2. **Barra superior (`topbar`)**: Ocupa **65 px** verticales (64px de altura + 1px de borde inferior).
3. **Contenedor de vista (`#view-dashboard`)**: Aplica `padding: 20px 24px;` (descuenta 48px horizontales y 40px verticales).
4. **Marco del tablero (`#grid-board`)**: Aplica `border: 1px solid var(--border-subtle);` y `padding: 16px;` perimetral (descuenta 34px horizontales y 34px verticales).

**Dimensiones Físicas del Área Neta Útil (Espacio Real para Widgets con Ventana Maximizada):**

| Resolución de Pantalla | Ancho Exterior `#grid-board` | Alto Exterior `#grid-board` | **Área Neta Útil (Lienzo disponible)** |
| :--- | :--- | :--- | :--- |
| **HD / 720p** (1280 × 720) | 961 px | 615 px | **927 px de ancho $\times$ 581 px de alto** |
| **Full HD / 1080p** (1920 × 1080) | 1601 px | 975 px | **1567 px de ancho $\times$ 941 px de alto** *(1767 px con sidebar colapsado)* |
| **2K / QHD** (2560 × 1440) | 2241 px | 1335 px | **2207 px de ancho $\times$ 1301 px de alto** |

*(En Windows, si la barra de tareas está fija y ocupa ~40px, la altura neta disponible disminuye aproximadamente 40px).*

---

#### B. Matriz Proporcional Top-Down (12 Columnas $\times$ 8 Filas) y Tamaños Finales
Para garantizar que **no sobre ni un solo píxel al fondo (cero residuo vertical)** y permitir la máxima divisibilidad armónica, el sistema adopta una matriz canónica de **12 columnas $\times$ 8 filas**:

$$\text{Ancho Celda } (W_{\text{cell}}) = \frac{W_{\text{net}} - (11 \times \text{gap})}{12}$$

$$\text{Alto Celda } (H_{\text{cell}}) = \frac{H_{\text{net}} - (7 \times \text{gap})}{8}$$

En resolución de referencia **1080p** (con barra de tareas de Windows, $W_{\text{net}} = 1567\text{ px}$, $H_{\text{net}} = 901\text{ px}$, $\text{gap} = 12\text{ px}$):
- **$W_{\text{cell}} \approx \mathbf{120\text{ px}}$**
- **$H_{\text{cell}} \approx \mathbf{102\text{ px}}$**
- **Relación de Aspecto de Celda**: $\approx 1.17$ (proporción cuasi-cuadrada ergonómica).

#### Catálogo Oficial de 19 Tamaños de Widgets y Metadatos de Orientación:

Los widgets deben declarar en su manifiesto el atributo opcional `orientation` (`"horizontal"`, `"vertical"` o `"universal"`). Si no se declara, el Core lo deduce automáticamente comparando `spanCol` y `spanRow`:

| Tamaño / Clase | Proporción Matricial | Orientación | Dimensión Física en 1080p | Propósito y Caso de Uso |
| :--- | :--- | :--- | :--- | :--- |
| **`1x1`** | 1 col $\times$ 1 fila | ⊞ Universal | $\approx \mathbf{120 \times 102\text{ px}}$ | **Micro-Totalizador**: Indicador único compacto (ej. % CPU, Ping ms, Temperatura °C). |
| **`1x2`** | 1 col $\times$ 2 filas | ↕ Vertical | $\approx \mathbf{120 \times 216\text{ px}}$ | **Torre Métrica Compacta**: Columna delgada de 2 filas para medidores de aguja o nivel vertical. |
| **`1x3`** | 1 col $\times$ 3 filas | ↕ Vertical | $\approx \mathbf{120 \times 330\text{ px}}$ | **Torre Métrica Mediana**: Indicadores triples apilados o barras verticales de progreso. |
| **`1x4`** | 1 col $\times$ 4 filas | ↕ Vertical | $\approx \mathbf{120 \times 444\text{ px}}$ | **Torre Métrica Alta**: Medidores verticales de rango extendido o barras de ecualizador. |
| **`2x1`** | 2 cols $\times$ 1 fila | ↔ Horizontal | $\approx \mathbf{252 \times 102\text{ px}}$ | **Chip Métrico Horizontal**: Panel con icono, título, métrica dual y mini barra de estado. |
| **`2x2`** | 2 cols $\times$ 2 filas | ⊞ Universal | $\approx \mathbf{252 \times 216\text{ px}}$ | **Widget Cuadrado Mediano**: Reloj analógico, medidor tipo tacómetro circular, batería. |
| **`2x3`** | 2 cols $\times$ 3 filas | ↕ Vertical | $\approx \mathbf{252 \times 330\text{ px}}$ | **Columna Vertical Mediana**: Lista compacta de eventos, controles verticales apilados. |
| **`2x4`** | 2 cols $\times$ 4 filas | ↕ Vertical | $\approx \mathbf{252 \times 444\text{ px}}$ | **Columna Vertical Alta**: Monitor de puertos de red, barra completa de sensores. |
| **`3x2`** | 3 cols $\times$ 2 filas | ↔ Horizontal | $\approx \mathbf{384 \times 216\text{ px}}$ | **Tarjeta Estándar 16:9**: Reloj digital con fecha, Temporizador o Cronómetro. |
| **`3x4`** | 3 cols $\times$ 4 filas | ↕ Vertical | $\approx \mathbf{384 \times 444\text{ px}}$ | **Columna Ancha Vertical**: Diseñada para monitores verticales (9:16) y consolas intermedias. |
| **`4x2`** | 4 cols $\times$ 2 filas | ↔ Horizontal | $\approx \mathbf{516 \times 216\text{ px}}$ | **Tarjeta Extendida de Monitoreo**: Monitoreo de red con mini gráfica, audio multicanal. |
| **`4x3`** | 4 cols $\times$ 3 filas | ↔ Horizontal | $\approx \mathbf{516 \times 330\text{ px}}$ | **Panel con Historial**: Controles interactivos + lista inferior con scroll interno. |
| **`4x4`** | 4 cols $\times$ 4 filas | ⊞ Universal | $\approx \mathbf{516 \times 444\text{ px}}$ | **Widget Cuadrado Grande**: Gráficas de alta resolución, visualizadores de espectro. |
| **`4x6`** | 4 cols $\times$ 6 filas | ↕ Vertical | $\approx \mathbf{516 \times 672\text{ px}}$ | **Consola Vertical Extendida**: Optimizado para pantallas verticales 9:16 en paneles completos. |
| **`6x2`** | 6 cols $\times$ 2 filas | ↔ Horizontal | $\approx \mathbf{780 \times 216\text{ px}}$ | **Panel Panorámico Medio**: Barra de estado extendida, telemetría de CPU multi-core. |
| **`6x4`** | 6 cols $\times$ 4 filas | ↔ Horizontal | $\approx \mathbf{780 \times 444\text{ px}}$ | **Medio Lienzo (Cuadrante)**: 50% de ancho $\times$ 50% de alto del tablero completo en landscape. |
| **`8x2`** | 8 cols $\times$ 2 filas | ↔ Horizontal | $\approx \mathbf{1044 \times 216\text{ px}}$ | **Panorámico Ancho**: Monitor de procesos extendido, panel multi-partición. |
| **`12x2`** | 12 cols $\times$ 2 filas | ↔ Horizontal | $\approx \mathbf{1567 \times 216\text{ px}}$ | **Ancho Completo**: Ocupa las 12 columnas en Landscape (o se ajusta a 6 en Portrait). |
| **`banner`** | 1 / -1 $\times$ 2 filas | ↔ Horizontal | $\approx \mathbf{100\% \times 216\text{ px}}$ | **Banner Panorámico Completo**: Alertas críticas y línea de tiempo de auditoría. |

#### Modo Vertical (Portrait 9:16 / 1080x1920):
En pantallas orientadas verticalmente, el Core reorganiza la cuadrícula a **6 columnas $\times$ 14 filas**. Los widgets verticales (`1x2`, `1x3`, `1x4`, `2x3`, `2x4`, `3x4`, `4x6`) y universales (`1x1`, `2x2`, `4x4`) resultan óptimos para esta disposición, mientras que los banners y widgets anchos se adaptan al ancho disponible manteniendo su altura fija de 2 filas para evitar deformaciones.


---

#### C. Las 4 Capas de Protección de Márgenes y Bordes
Para garantizar que ningún widget tape el marco de la aplicación, choque contra bordes o solape a sus vecinos, el Core implementa 4 capas de contención perimetral:

1. **Capa 1 (Colchón Exterior del Viewport)**: `#view-dashboard` aplica `padding: 20px 24px;`. Separa el tablero 20px de la topbar y del borde inferior, y 24px del sidebar y del borde derecho de Windows.
2. **Capa 2 (Colchón Interior del Tablero)**: `#grid-board` aplica `padding: 16px;` y `border: 1px solid var(--border-subtle);` con `border-radius: var(--radius-xl)`. Toda tarjeta en `col = 1` o `row = 1` mantiene una distancia libre de **16 px del marco**. Prohibido tocar la línea de borde.
3. **Capa 3 (Canal Inter-Widget)**: `gap: 12px;` tanto vertical como horizontalmente. Garantiza que exista siempre un pasillo visual de 12px con el fondo punteado (`radial-gradient`) entre cualquier par de widgets contiguos.
4. **Capa 4 (Contención Matemática en Drag & Drop)**: El motor de arrastre calcula dinámicamente los topes:
   - Horizontal: `targetCol = Math.max(1, Math.min(gridCols - spanCol + 1, targetCol))`. No permite arrastrar una tarjeta fuera del borde derecho.
   - Vertical: `targetRow = Math.max(1, Math.min(maxAllowedRow, targetRow))`, donde `maxAllowedRow = Math.max(1, maxVisibleRows - spanRow + 1)`. Impide soltar un widget en una fila que genere scroll vertical o desborde el alto de `#grid-board`.

---

#### D. Reglas de Visibilidad y Adaptabilidad Ergonómica (Regla 12)
- **Visibilidad 100% de Títulos**: Si un widget utiliza un tamaño compacto (`1x1` o `2x1`), debe diseñar su tipografía e iconos para que nada quede truncado. Si el texto o contenido requiere más de 150px de ancho para leerse con soltura, el widget debe declarar como mínimo `size: "3x2"` o `size: "4x2"`.
- **Adaptabilidad Multi-Resolución**: Todo widget debe diseñarse pensando en cómo se comportará en pantallas pequeñas (720p, donde el ancho total útil es de 927px) y en pantallas de alta densidad (2K/4K, donde el lienzo útil supera los 2200px). Consumir siempre variables semánticas (`var(--bg-*)`, `var(--text-*)`, `var(--accent-*)`) y evitar anchos rígidos en píxeles hijos dentro de la tarjeta.
- **Menú Contextual Integrado**: Al hacer clic derecho sobre la tarjeta, el Core despliega automáticamente opciones para configurar el módulo, abrir su pantalla principal, auto-organizar la cuadrícula u ocultar el widget.

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
