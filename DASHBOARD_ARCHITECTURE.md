# Arquitectura Técnica del Dashboard, Drag and Drop y Widgets

Este documento detalla exhaustivamente el diseño arquitectónico, los modelos matemáticos y la implementación interna del sistema de **Dashboard**, **Widgets Modulares**, **Motor de Drag and Drop (Arrastre y Suelta)** y **Gestión de Perfiles** en el Core de **PC Manager**.

---

## 1. Visión General y Principios de Diseño

El sistema de visualización principal (denominado canónicamente **Dashboard**) opera como una cuadrícula matricial bidimensional desacoplada de flujos rígidos de maquetación HTML. A diferencia de interfaces tradicionales basadas en flujo de bloque (`block layout`) o flexbox unidimensional, el Dashboard de PC Manager implementa una **matriz de posicionamiento libre asistido por colisiones** sobre una cuadrícula CSS Grid programable en tiempo de ejecución.

### Principios Clave:
1. **Desacoplamiento Modular Total**: Los widgets no conocen la existencia de otros widgets ni la lógica interna del motor de arrastre. Se registran a través del contrato formal del Core.
2. **Cero Dependencia de HTML5 Drag & Drop Nativo**: La API estándar de arrastre de HTML5 adolece de problemas severos en entornos incrustados (WebView2 / Tauri), tales como bloqueos de eventos en elementos interactivos hijos (`input`, `select`, `button`), ghosting inconsistente y falta de control sobre el snapping continuo. Se diseñó un motor propio basado en la **Pointer Events API**.
3. **Persistencia No Destructiva ante Responsive**: El redimensionamiento de ventana o cambios de resolución no corrompen ni sobreescriben las coordenadas absolutas de las tarjetas.
4. **Perfiles Dinámicos con Aislamiento de Estado**: Los perfiles permiten múltiples vistas operativas sin duplicación de recursos en memoria.

---

## 2. Topología de la Cuadrícula Matricial (Grid Board)

### 2.1 Estructura Geométrica

El contenedor `#grid-board` define una cuadrícula basada en CSS Grid con columnas dinámicas y altura de fila uniforme:

```css
#grid-board {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-auto-rows: 110px;
  gap: 16px;
  position: relative;
  min-height: 480px;
}
```

- **Gap intercelular**: $16\text{ px}$ constantes en ambos ejes ($X$ e $Y$).
- **Altura base de fila ($H_{\text{row}}$)**: $110\text{ px}$.
- **Columnas nominales ($C_{\text{max}}$)**: $10$ columnas en resoluciones de escritorio amplias ($> 1400\text{ px}$).
- **Escalado responsivo de columnas**:
  - Pantallas amplias ($> 1400\text{ px}$): $10$ columnas.
  - Pantallas intermedias ($1081\text{ px} - 1400\text{ px}$): $6$ columnas.
  - Pantallas compactas ($\le 1080\text{ px}$): $4$ columnas.

### 2.2 Coordenadas y Dimensiones de los Widgets

Cada tarjeta (`.dashboard-card`) se define en la matriz mediante cuatro parámetros:

$$\text{Card} = \{ \text{col}, \text{row}, \text{spanCol}, \text{spanRow} \}$$

- $\text{col} \in [1, C_{\text{max}}]$: Índice de columna inicial (1-indexed según especificación CSS Grid).
- $\text{row} \in [1, \infty)$: Índice de fila inicial.
- $\text{spanCol} \in [1, C_{\text{max}}]$: Número de columnas que abarca la tarjeta.
- $\text{spanRow} \in [1, \infty)$: Número de filas que abarca la tarjeta.

El posicionamiento en el DOM se aplica mediante propiedades CSS inline sobre cada elemento:

```javascript
card.style.gridColumn = `${displayCol} / span ${effSpanCol}`;
card.style.gridRow = `${row} / span ${spanRow}`;
```

---

## 3. Ciclo de Vida y Registro de Widgets

Los widgets son instanciados dinámicamente por los módulos o por el núcleo operativo. Cada widget declara sus propiedades métricas y su interfaz de renderizado:

```mermaid
sequenceDiagram
    participant M as Módulo / Core
    participant W as Widget Registry
    participant D as Dashboard Controller
    participant G as Grid Board (DOM)

    M->>W: registerWidget(id, metadata, defaultGrid, renderFn)
    W-->>D: Notifica nuevo widget disponible
    D->>D: Consulta perfil activo (DashboardProfilesState)
    alt Widget está activo en el perfil
        D->>G: Inyecta .dashboard-card con dataset {col, row, spanCol, spanRow}
        D->>M: Ejecuta renderFn(cardBody)
        D->>D: Asocia manejadores de Pointer Events
    else Widget marcado como oculto
        D->>D: Añade a la lista de widgets inactivos del perfil
    end
```

### 3.1 Contrato de Datos del Widget

En el DOM, cada tarjeta almacena su estado en atributos `data-*`:
- `data-widget-id`: Identificador único canónico (ej. `core_storage_overview`).
- `data-col`: Coordenada absoluta de columna nominal en la cuadrícula de 10 columnas.
- `data-row`: Coordenada absoluta de fila.
- `data-span-col`: Ancho en celdas.
- `data-span-row`: Alto en celdas.

---

## 4. Motor de Drag and Drop (Arrastre y Suelta)

El motor fue implementado íntegramente en JavaScript vainilla utilizando **Pointer Events API** (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`), garantizando compatibilidad unificada tanto para mouse como para dispositivos táctiles o stylus.

```mermaid
flowchart TD
    A[Pointer Down en .dashboard-card] --> B{¿Es elemento interactivo?}
    B -- Sí (input, button, switch) --> C[Ignorar Drag / Permitir interacción nativa]
    B -- No --> D[Registrar coordenadas iniciales de puntero]
    D --> E[Esperar movimiento de puntero]
    E --> F{¿Delta > DRAG_THRESHOLD (5px)?}
    F -- No --> G[Click estándar en tarjeta]
    F -- Sí --> H[Iniciar sesión de arrastre]
    H --> I[Crear Clon Flotante (.card-drag-clone)]
    H --> J[Ocultar tarjeta original (.card-dragging)]
    H --> K[Crear Indicador de Celda (.grid-drop-indicator)]
    K --> L[Capturar Pointermove en Window]
    L --> M[Calcular coordenadas proyectadas col, row]
    M --> N[Actualizar posición del indicador en Grid]
    L --> O[Actualizar posición del Clon en tiempo real]
    O --> P[Pointer Up / Drop]
    P --> Q[Resolver Colisiones AABB / Swapping]
    Q --> R[Asentar tarjeta original con animación .card-drop]
    R --> S[Destruir Clon e Indicador]
    S --> T[Persistir nueva configuración del perfil]
```

### 4.1 Detección de Intención y Umbral de Activación (`DRAG_THRESHOLD`)

Para permitir que los controles dentro de las tarjetas (botones de acción, selectores combobox, interruptores y campos de texto) funcionen sin activar un arrastre accidental, se evalúa:

1. **Filtro de Elementos Interactivos**:
   ```javascript
   const interactive = e.target.closest('button, input, select, .btn, .switch, label, a, .card-btn, textarea');
   if (interactive) return;
   ```
2. **Umbral de Distancia Euclidiana ($5\text{ px}$)**:
   El arrastre no comienza inmediatamente en `pointerdown`. Se calcula la distancia acumulada antes de tomar control de la interfaz:
   $$\Delta d = \sqrt{(x - x_0)^2 + (y - y_0)^2} > 5$$

### 4.2 Arquitectura del Clon Flotante y el Indicador de Snapping

Al confirmarse el arrastre:
- **Tarjeta Original**: Recibe la clase `.card-dragging`, reduciendo su visibilidad al $20\%$ para servir de referencia de origen.
- **Clon Flotante (`.card-drag-clone`)**:
  - Se clona el nodo de la tarjeta (`card.cloneNode(true)`).
  - Se inyecta directamente en `document.body` con posición fija (`position: fixed; pointer-events: none; z-index: 10000;`).
  - Conserva exactamente el ancho y alto medidos mediante `getBoundingClientRect()` para evitar saltos dimensionales.
  - Se le aplica una elevación tridimensional con sombra extendida, ligera escala de $1.02$ y una rotación de $1.5^\circ$ para brindar sensación de desprendimiento físico.
- **Indicador de Posición (`.grid-drop-indicator`)**:
  - Elemento con borde punteado de acento primario (`var(--accent-primary)`) y fondo semitransparente con desenfoque de fondo (`backdrop-filter`).
  - Se inserta en el `#grid-board` ocupando exactamente las mismas celdas de cuadrícula calculadas en caliente:
    ```javascript
    indicator.style.gridColumn = `${targetCol} / span ${spanCol}`;
    indicator.style.gridRow = `${targetRow} / span ${spanRow}`;
    ```

### 4.3 Cálculo Matemático de Snapping (Proyección Puntero $\to$ Celda Matricial)

En cada evento `pointermove`, se proyecta la posición del puntero dentro de la cuadrícula:

1. Se obtiene el rectángulo del `#grid-board` mediante `grid.getBoundingClientRect()`.
2. Se descuenta el desplazamiento de scroll del contenedor principal (`dashboardSection.scrollTop`).
3. Se calculan las dimensiones efectivas de una celda:
   $$W_{\text{cell}} = \frac{W_{\text{grid}} - (C_{\text{cols}} - 1) \cdot \text{gap}}{C_{\text{cols}}}$$
   $$H_{\text{cell}} = 110\text{ px}$$
4. Coordenada relativa del puntero respecto al origen de la tarjeta:
   $$X_{\text{rel}} = X_{\text{pointer}} - \text{rect}_{\text{grid}}.left - X_{\text{grabOffset}}$$
   $$Y_{\text{rel}} = Y_{\text{pointer}} - \text{rect}_{\text{grid}}.top + \text{scroll}_{\text{top}} - Y_{\text{grabOffset}}$$
5. Determinación de fila y columna por truncamiento de celda con límites de seguridad:
   $$\text{targetCol} = \text{clamp}\left( \left\lfloor \frac{X_{\text{rel}}}{W_{\text{cell}} + \text{gap}} \right\rfloor + 1, \; 1, \; C_{\text{cols}} - \text{spanCol} + 1 \right)$$
   $$\text{targetRow} = \max\left( 1, \; \left\lfloor \frac{Y_{\text{rel}}}{H_{\text{cell}} + \text{gap}} \right\rfloor + 1 \right)$$

---

## 5. Detección y Resolución de Colisiones (AABB)

Cuando el usuario suelta la tarjeta (`pointerup`), el sistema debe acomodar las tarjetas preexistentes para evitar solapamientos visuales ilegítimos. Se emplea el modelo de **Cajas Delimitadoras Alineadas a los Ejes (AABB - Axis-Aligned Bounding Box)** en coordenadas enteras de la cuadrícula.

### 5.1 Test de Intersección

Dos tarjetas $A$ y $B$ colisionan si y solo si se solapan simultáneamente en ambos ejes cartesianos:

$$\text{Colisión}(A, B) \iff \neg \Big( A_{\text{col2}} \le B_{\text{col1}} \lor A_{\text{col1}} \ge B_{\text{col2}} \lor A_{\text{row2}} \le B_{\text{row1}} \lor A_{\text{row1}} \ge B_{\text{row2}} \Big)$$

Donde:
$$A_{\text{col1}} = A_{\text{col}}, \quad A_{\text{col2}} = A_{\text{col}} + A_{\text{spanCol}}$$
$$A_{\text{row1}} = A_{\text{row}}, \quad A_{\text{row2}} = A_{\text{row}} + A_{\text{spanRow}}$$

### 5.2 Estrategia de Resolución: Swap Inteligente y Cascada

1. **Intercambio Directo (1 a 1)**:
   Si la tarjeta arrastrada cae sobre **una única tarjeta existente**, el motor intenta realizar un *swap* o intercambio simétrico: la tarjeta receptora toma la posición anterior de la tarjeta arrastrada si sus dimensiones lo permiten.
2. **Desplazamiento en Cascada (Múltiples Colisiones)**:
   Si la tarjeta arrastrada ocupa el espacio de múltiples elementos, los elementos afectados son desplazados hacia abajo en el eje $Y$:
   $$B_{\text{row}} = A_{\text{row}} + A_{\text{spanRow}}$$

### 5.3 Asentamiento con Animación de Retorno (`.card-drop`)

Al soltar la tarjeta, se le añade temporalmente la clase `.card-drop` que aplica una función de aceleración `cubic-bezier(0.2, 0, 0, 1)` a nivel CSS durante 250ms, produciendo una desaceleración fluida al ocupar su celda definitiva.

---

## 6. Algoritmo de Auto-organización 2D (Bin-Packing Matricial)

El botón flotante canónico de Auto-organización (`.btn-fab` con icono de varita mágica) ejecuta un empaquetador espacial bidimensional sin fragmentación:

```mermaid
flowchart TD
    Start[Click en Auto-organizar] --> Read[Leer todas las tarjetas activas ordenadas por Row ASC, Col ASC]
    Read --> Matrix[Inicializar Matriz de Ocupación occupiedMatrix vacío]
    Matrix --> Loop[Iterar sobre cada tarjeta T]
    Loop --> Find[findNextFreeSlot para T con spanCol, spanRow]
    Find --> Check{¿Slot encontrado en col, row?}
    Check --> Place[Asignar T.col = col, T.row = row]
    Place --> Mark[Marcar celdas ocupadas en occupiedMatrix]
    Mark --> Next{¿Quedan tarjetas?}
    Next -- Sí --> Loop
    Next -- No --> Render[Actualizar gridColumn y gridRow en DOM con transición suave]
    Render --> Save[Guardar estado del perfil]
```

### 6.1 Matriz de Ocupación Espacial

La función `findNextFreeSlot(gridCols, spanCol, spanRow, occupied)` evalúa la disponibilidad celda por celda:

```javascript
function findNextFreeSlot(gridCols, spanCol, spanRow, occupied) {
  let r = 1;
  while (true) {
    for (let c = 1; c <= gridCols - spanCol + 1; c++) {
      let fits = true;
      for (let dr = 0; dr < spanRow; dr++) {
        for (let dc = 0; dc < spanCol; dc++) {
          if (occupied[`${c + dc},${r + dr}`]) {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }
      if (fits) return { col: c, row: r };
    }
    r++;
  }
}
```

Este algoritmo garantiza la eliminación absoluta de huecos muertos, manteniendo la jerarquía de lectura visual natural (de arriba a abajo y de izquierda a derecha).

---

## 7. Adaptación Responsiva No Destructiva

Uno de los problemas más críticos en interfaces de cuadrícula libre es la pérdida de diseño cuando el usuario desmaximiza o redimensiona la ventana hacia anchos menores.

### 7.1 El Desafío de la Reducción de Columnas

Si una tarjeta fue colocada por el usuario en la columna $9$ de una cuadrícula de $10$ columnas, y la ventana se reduce a $6$ columnas, la tarjeta queda fuera de los límites visibles si se fuerza la posición absoluta. Sin embargo, si se sobreescribiera la coordenada original con la posición reducida, al volver a maximizar la ventana la tarjeta jamás volvería a la columna $9$.

### 7.2 Solución Implementada: Coordenadas Absolutas vs. Coordenadas de Presentación

Se implementó el desacoplamiento estricto entre:
1. **Coordenada Maestra Nominal (`dataset.col`, `dataset.row`)**: Almacenada en la tarjeta y en la base de datos de perfiles. Inmutable ante cambios de ancho de ventana.
2. **Coordenada de Presentación Calculada (`displayCol`)**: Calculada dinámicamente por la función `adjustCardsForCurrentGridCols()` invocada por el `ResizeObserver` del contenedor.

$$\text{displayCol} = \min\left( \text{dataset.col}, \; C_{\text{actual}} - \text{effSpanCol} + 1 \right)$$
$$\text{effSpanCol} = \min\left( \text{dataset.spanCol}, \; C_{\text{actual}} \right)$$

Al restaurar o maximizar la ventana, $C_{\text{actual}}$ retorna a $10$, por lo que $\text{displayCol}$ vuelve a reflejar exactamente el $\text{dataset.col}$ original sin desfase alguno.

---

## 8. Sistema de Perfiles de Dashboard

El sistema soporta múltiples perfiles de usuario configurables para organizar diferentes escenarios de trabajo (ej. *Monitoreo General*, *Desarrollo y Depuración*, *Servicios de Red*).

### 8.1 Estructura del Estado de Perfiles (`dashboardProfilesState`)

```typescript
interface DashboardProfile {
  id: string;                      // Identificador único (ej. "default", "profile_1726354890")
  name: string;                    // Nombre legible en interfaz
  cardPositions: Record<string, {  // Diccionario por widgetId
    col: number;
    row: number;
  }>;
  hiddenWidgets: string[];         // Lista de widgets apagados en este perfil
}

interface DashboardProfilesState {
  activeProfileId: string;
  profiles: DashboardProfile[];
}
```

### 8.2 Principio de Lienzo en Blanco para Nuevos Perfiles

Al crear un nuevo perfil mediante el botón de creación (`+`):
- El Core **no clona ni copia** los widgets activos del perfil previo.
- El perfil nuevo nace como un **lienzo en blanco**: su lista `hiddenWidgets` se inicializa conteniendo todos los identificadores de widgets registrados en el sistema.
- El usuario utiliza el **Drawer de Catálogo de Widgets** para activar de forma intencional y limpia únicamente los widgets que necesita en esa vista.
- Si el usuario desea basarse en su distribución previa, el sistema provee la acción explícita de **Duplicar Perfil Actual**.

### 8.3 Inmutabilidad del Perfil Predeterminado

El perfil `"default"` (*Predeterminado*) es canónico e inborrable. La interfaz desactiva automáticamente los botones de eliminación para proteger la estabilidad del sistema base. Si un perfil secundario es eliminado, el Core conmuta de forma transparente al perfil `"default"`.

---

## 9. Capa de Persistencia Dual (IPC Rust + LocalStorage)

La persistencia de la distribución matricial y los perfiles opera en dos niveles sincronizados para máxima resiliencia:

```mermaid
flowchart LR
    UI[Dashboard Controller en WebView] -->|1. window.__TAURI__.invoke| IPC[Tauri Core en Rust]
    IPC -->|save_module_setting| FS[Almacenamiento Local Seguro en Disco]
    UI -->|2. Fallback de Redundancia| LS[localStorage del WebView]
```

1. **Persistencia Primaria en Backend Nativo (Rust / Tauri)**:
   El estado se serializa en formato JSON y se envía al comando IPC `save_module_setting`:
   - Módulo: `"core_dashboard"`.
   - Clave: `"profiles_config"`.
   - Payload: Objeto serializado con `activeProfileId` y el array completo de `profiles`.
2. **Fallback y Caché de Redundancia (LocalStorage)**:
   Para arranques ultrarrápidos previos a la conexión IPC de Tauri, el estado se replica en `localStorage.getItem('pcm_dashboard_profiles_v1')`.

---

## 10. Resumen de Archivos y Responsabilidades

| Archivo | Responsabilidad Arquitectónica |
| :--- | :--- |
| `ui/index.html` | Implementación del motor de Drag and Drop, lógica de colisiones AABB, algoritmo Bin-Packing, observador de redimensionamiento responsivo, y gestión del estado de perfiles. |
| `core_shell.html` | Maqueta canónica de referencia para la versión limpia de fábrica sin módulos de terceros. |
| `src-tauri/src/modules/mod.rs` | Gestión del ciclo de vida, persistencia centralizada y servicios compartidos (`ServiceRegistry`). |
| `src-tauri/src/commands.rs` | Comandos IPC (`get_module_setting`, `save_module_setting`, `get_system_specs`). |
