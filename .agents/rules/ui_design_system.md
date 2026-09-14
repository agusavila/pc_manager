# Sistema de Diseño y Reglas de Interfaz (Material Expressive)

## 1. Declaración de Filosofía Visual
PC Manager utiliza un lenguaje de diseño **Material Expressive / Fluent Modern**: una estética de software de alta gama, sobria, tecnológica y pulcra. La interfaz debe transmitir ligereza, fluidez y precisión operativa en cada píxel.

---

## 2. Regla de Oro de Iconografía: CERO Emojis
- **Prohibición Total de Emojis**: Queda estrictamente prohibido utilizar emojis (🚀, 💻, ⚙️, 🗑️, ⚠️, etc.) como iconos en botones, menús, títulos, tarjetas o notificaciones.
- **Iconos SVG Modernos y Estandarizados**:
  - Toda la iconografía debe ser exclusivamente vectorial SVG.
  - Estilo uniforme: Trazo de 1.75px a 2px (`stroke-width`), terminales redondeadas (`stroke-linecap="round"`), proporciones cuadradas estandarizadas en cuadrículas de `20x20` o `24x24` píxeles (estilo Lucide / Material Symbols Outlined).
  - Colores heredados mediante `currentColor` para integración automática con temas oscuro/claro y estados de interacción.

---

## 3. Paleta de Color y Superficies (Dark Mode Enterprise)
La paleta prioriza un modo oscuro profundo, con niveles de elevación sutiles y contrastes accesibles:

| Token Semántico | Valor / Propósito | Apariencia |
| :--- | :--- | :--- |
| `--bg-base` | `#0b0d13` | Fondo maestro de la ventana principal |
| `--bg-surface` | `#131722` | Superficie de paneles, sidebar y modales |
| `--bg-card` | `#1a1f2e` | Fondo de tarjetas del dashboard con elevación |
| `--bg-card-hover` | `#22293d` | Estado hover de tarjetas interactivas |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Separadores y bordes ultrafinos de 1px |
| `--border-focus` | `#4d7cfe` | Anillo de enfoque accesible para inputs/botones |
| `--accent-primary` | `#3b82f6` / `#60a5fa` | Acento principal de acción |
| `--accent-success` | `#10b981` | Estados saludables y confirmaciones |
| `--accent-warning` | `#f59e0b` | Alertas de advertencia y umbrales medios |
| `--accent-danger` | `#ef4444` | Acciones críticas y detenciones forzadas |
| `--text-primary` | `#f1f5f9` | Títulos y datos primarios de alto contraste |
| `--text-secondary` | `#94a3b8` | Etiquetas, metadatos y descripciones |
| `--text-muted` | `#64748b` | Texto deshabilitado o de contexto tenue |

---

## 4. Tipografía y Radios de Borde
- **Fuente**: Familia tipográfica moderna sin serifa con renderizado nítido (`Inter`, `system-ui`, `-apple-system`, `Segoe UI Variable`).
- **Escala de Radios de Borde**:
  - Botones pill / Badges: `9999px`
  - Tarjetas de Dashboard: `16px`
  - Inputs, Comboboxes y Menús desplegables: `10px`
  - Modales y Drawers: `20px`
  - Contenedores principales: `12px`

---

## 5. Especificación de Componentes de Interfaz

## 5. Especificación de Componentes de Interfaz

### 5.1. Menú Lateral Colapsable (Sidebar)
- **Modo Expandido (`270px`)**: Muestra logotipo, títulos de secciones, grupos colapsables y badges.
- **Modo Colapsado / Minimizado (`70px`)**: Al colapsarse, los textos y badges se ocultan suavemente; únicamente permanecen visibles y centrados los iconos SVG de cada sección o módulo (`20x20`), con atributo `title` para desplegar tooltip al pasar el cursor.
- **Control Único Canónico de Colapso**:
  - El colapso y expansión del sidebar se realiza **exclusivamente interactuando con el icono de la aplicación (brand logo)**.
  - Prohibido terminantemente duplicar esta acción con botones de chevron en la cabecera o botones tipo hamburguesa en la barra superior.
- **Grupos de Módulos Colapsables y Auto-ocultamiento**:
  - Los grupos permiten desplegar y contraer sus módulos hijos mediante un botón/chevron interactivo.
  - **Sin prefijo redundante**: Prohibido anteponer la palabra *"Grupo:"*; se muestra directamente el nombre en mayúsculas limpias (*"GENERAL"*, *"PERIFÉRICOS"*).
  - **Ocultamiento Automático de Grupos Vacíos**: Cuando un módulo es deshabilitado o desinstalado, se retira del menú. Si todos los módulos de un grupo quedan inactivos o vacíos, **el grupo completo se oculta automáticamente** de la interfaz. Al reactivar un módulo, su grupo reaparece instantáneamente.

### 5.2. Barra Superior Canónica y Acceso a Notificaciones (Topbar)
- **Aprovechamiento Canónico de Espacio**: El nombre de la sección o módulo activo y su descripción se presentan de forma unificada en la barra superior (`.topbar-title-group`). Queda prohibido duplicar bloques de encabezados, títulos secundarios o subtítulos dentro del cuerpo de la vista, garantizando el 100% de espacio vertical útil para el contenido operativo.
- **Limpieza Visual Absoluta**: Prohibido incluir textos o chips decorativos e innecesarios (prohibido *"Sistema Central"*, *"Núcleo Operativo"*, contadores de *"Módulos Activos"* o botones hamburguesa redundantes en la barra).
- **Título Canónico**: La sección principal se titula exclusivamente **"Dashboard"** (prohibido *"Pizarra Central"*).
- **Acceso a Notificaciones**: El botón de notificaciones se ubica en la barra superior como un icono SVG pequeño y limpio (`btn-icon`), con un indicador circular rojo numérico (`.notification-counter`) para alertas no leídas.

### 5.3. Dashboard, Drag and Drop Fluido y Auto-organización
- Cuadrícula responsive de 10 columnas (`grid-template-columns: repeat(10, minmax(0, 1fr))`) con espaciado de `16px`.
- **Drag & Drop Fluido y Sin Parpadeos**:
  - Las tarjetas pueden moverse y reposicionarse libremente donde el usuario desee.
  - El arrastre debe ser fluido con transiciones suaves (`cubic-bezier`), sombras elevadas (`box-shadow`), opacidad translúcida e indicadores visuales de destino sin alteraciones toscas ni parpadeos continuos en la cuadrícula.
- **Botón Flotante Canónico de Auto-organización (`btn-fab`)**:
  - El Dashboard debe contar de forma obligatoria con un botón flotante canónico de **"Auto-organizar"** con icono SVG.
  - Al pulsarse, compacta y alinea las tarjetas activas de forma inteligente sin dejar huecos vacíos en la cuadrícula.
- **Regla de Oro de Tarjetas (Cero Recortes)**:
  - Los títulos y contenidos de las tarjetas nunca deben estar cortados con elipsis (`text-overflow: ellipsis`) ni truncados.
  - Todo dato, gráfico o texto debe ser 100% visible en el tamaño elegido (`1x1`, `2x1`, `2x2`, `3x2`, etc.).
  - Prohibido saturar las tarjetas con leyendas de depuración como *"Servicio Compartido: x"*.
- **Variantes de Tamaño de Tarjetas**:
  - `1x1`: Micro-métrica o chip de estado.
  - `2x1`: Métrica compacta horizontal con valor numérico y tendencia.
  - `2x2`: Tarjeta estándar cuadrada con gráfico circular o tacómetro.
  - `3x2`: Tarjeta mediana con gráfica de serie temporal o métricas agrupadas.
  - `4x2`: Tarjeta ancha para monitores de red o almacenamiento múltiple.
  - `5x2`: Media fila para listas de procesos o accesos rápidos.
  - `5x5`: Cuadrante de detalle para módulos pesados.
  - `10x2`: Franja horizontal panorámica.

### 5.4. Galería de Tarjetas (Widget Catalog)
- Panel lateral deslizable (Drawer) que expone las tarjetas disponibles de los módulos activos.
- Interruptor para activar o remover tarjetas del Dashboard en tiempo real.

### 5.5. Menú de Temas y Colores (Configuraciones)
- El panel de Configuraciones debe estructurar la personalización visual mediante **dos controles combobox encadenados**:
  1. **Tipo de Modo**: *Modo Oscuro* / *Modo Claro*.
  2. **Estilo de Fondo**: Variantes temáticas adaptadas al tipo:
     - En Modo Oscuro: *Oscuro Profundo*, *Carbon Black*, *Midnight Navy*, *Cyberpunk Dark*.
     - En Modo Claro: *Blanco Puro*, *Azul Suave*, *Gris Platino*, *Menta Suave*.
- **Paleta Extendida de Acento Primario**: Selector interactivo de colores de acento con mínimo 8 a 10 tonos (Azul Eléctrico, Verde Esmeralda, Púrpura/Violeta, Ámbar Solar, Cian Ártico, Rosa Neón, Rojo Carmesí, Naranja Fuego, Turquesa Profundo, Índigo Real) que actualizan `--accent-primary` en caliente en todo el Core y los módulos.

### 5.6. Formularios y Botones
- **Botones**: `.btn-primary`, `.btn-secondary`, y `.btn-icon` estilizados con radios consistentes y micro-animaciones.
- **Interruptores (Switches)**: Deslizadores SVG/CSS con transiciones suaves.

---

## 6. Ejemplos de Código Estándar

### Ejemplo de Icono SVG Moderno (Hardware / CPU)
```html
<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect width="16" height="16" x="4" y="4" rx="2"/>
  <rect width="6" height="6" x="9" y="9" rx="1"/>
  <path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/>
  <path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>
</svg>
```

### Ejemplo de Tarjeta de Dashboard (Estructura Base)
```html
<article class="dashboard-card card-size-2x2" data-widget-id="telemetry-processor">
  <header class="card-header">
    <div class="card-title-group">
      <svg class="icon icon-sm">...</svg>
      <h3 class="card-title">Procesador</h3>
    </div>
    <button class="btn-icon-subtle" aria-label="Opciones del widget">
      <svg class="icon icon-xs">...</svg>
    </button>
  </header>
  <div class="card-body">
    <!-- Contenido modular inyectado -->
  </div>
</article>
```

---

## 7. Contrato de Temas para Módulos (ThemeEngine & Token Binding)
Para garantizar una estética 100% coherente e inquebrantable a lo largo de toda la aplicación y sus extensiones:

1. **Prohibición de Estilos y Colores Hardcodeados en Módulos**:
   - Queda estrictamente prohibido usar colores directos como `color: #ffffff;`, `background: black;` o `border: 1px solid #333;` dentro de los módulos.
   - Todo módulo debe consumir exclusivamente las variables semánticas del Core:
     - `background-color: var(--bg-card);`
     - `color: var(--text-primary);`
     - `border-color: var(--border-subtle);`
     - `border-radius: var(--radius-md);`
2. **Adopción Inmediata de Cambios de Tema**:
   - El Core gestiona el `ThemeEngine`. Cuando el usuario cambia de tema (ej: Dark OLED, Slate Modern, o personaliza el color de acento principal), las variables `:root` se actualizan globalmente.
   - Todos los módulos, tanto en sus tarjetas del Dashboard 10x10 como en sus vistas completas de pantalla, **heredan el nuevo esquema visual instantáneamente sin recargar la aplicación**.
3. **Reutilización de Componentes Estándar**:
   - Los módulos deben utilizar las clases utilitarias provistas por el Core: `.btn`, `.btn-primary`, `.btn-secondary`, `.switch`, `.card`, `.badge`, asegurando que todos los comboboxes, interruptores y botones tengan la misma curvatura, animaciones y comportamiento en cualquier módulo.

