# ESPECIFICACIÓN ARQUITECTÓNICA: MOTOR DE DASHBOARD MATRICIAL HORIZONTAL (KIOSK 12x6)
**Documento Técnico Universal para Modelos de Inteligencia Artificial y Agentes de Software**  
**Alcance**: Arquitectura de Pizarra Interactiva, Cuadrícula Matricial Fija, Física de Arrastre, Detección de Colisiones y Capacidad Estricta.  
**Restricción de Diseño**: Exclusivamente Orientación Horizontal (Landscape). Agnóstico de lenguaje y framework.

---

## 1. Declaración de Misión y Filosofía Arquitectónica

El sistema se define como un **Lienzo Kiosk Finito y Bidimensional** de visualización y control en tiempo real. Se fundamenta en cuatro postulados inviolables:

1. **Modelo Zero-Scroll (Lienzo Finito Inviolable)**:
   - El área útil de trabajo está estrictamente acotada a la ventana física visible ($100\%$ de ancho, $100\%$ de alto).
   - Queda terminantemente prohibido el desplazamiento vertical u horizontal (`overflow = hidden`). La pantalla opera como un tablero físico de instrumentos; si un widget no cabe en el espacio visible, **no se permite su inserción**.
2. **Inviolabilidad Espacial y Cero Superposiciones**:
   - Dos componentes jamás pueden ocupar o compartir la misma celda de la cuadrícula. Toda colisión debe ser resuelta mediante desplazamiento determinista, intercambio o rechazo atómico.
3. **Derivación Espacial Top-Down (Cero Residuo)**:
   - Las dimensiones de las celdas no se definen con píxeles fijos ("bottom-up"), sino que se derivan proporcionalmente dividiendo el espacio total disponible entre la cantidad exacta de filas y columnas, absorbiendo el $100\%$ del lienzo sin huecos muertos en los bordes.
4. **Desacoplamiento Absoluto (Cajas Negras)**:
   - Los widgets desconocen la posición física o la lógica interna de los demás widgets. La orquestación espacial, resolución de colisiones y persistencia recaen exclusivamente en el **Motor del Dashboard**.

---

## 2. Topología Matricial y Sistema de Coordenadas

### 2.1 Matriz Base: 12 Columnas $\times$ 6 Filas
La cuadrícula se estructura en una matriz discreta bidimensional de **12 columnas** por **6 filas**:
- **Eje Horizontal ($X$)**: $C = 12$ columnas indexadas en el rango $c \in [1, 12]$.
- **Eje Vertical ($Y$)**: $R = 6$ filas indexadas en el rango $r \in [1, 6]$.
- **Separación ($G$)**: Espacio de separación uniforme entre celdas adyacentes ($\text{gap} = G$).

```text
    c=1   c=2   c=3   c=4   c=5   c=6   c=7   c=8   c=9   c=10  c=11  c=12
r=1 [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ]
r=2 [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ]
r=3 [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ]
r=4 [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ]
r=5 [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ]
r=6 [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ] [   ]
```

### 2.2 Divisibilidad Armónica de las 12 Columnas
La elección de 12 columnas proporciona una subdivisión entera sin fracciones para todos los anchos estándar de componentes:
- **Ancho Completo (100%)**: Tarjeta de `span 12` (1 por fila).
- **Medio Ancho (50%)**: Tarjeta de `span 6` (2 por fila).
- **Tercio de Ancho (33.3%)**: Tarjeta de `span 4` (3 por fila).
- **Cuarto de Ancho (25%)**: Tarjeta de `span 3` (4 por fila).
- **Sexto de Ancho (16.6%)**: Tarjeta de `span 2` (6 por fila).
- **Totalizador Unitario (8.3%)**: Tarjeta de `span 1` (12 por fila).

### 2.3 Altura Ergonómica de 6 Filas
Seis filas representan el balance óptimo para resoluciones de escritorio:
- En **Full HD (1080p)**: Permite celdas de $\approx 140\text{px}$ de alto, otorgando amplitud a tarjetas de `span 1` y permitiendo gráficos y tablas ricas en tarjetas de `span 2` y `span 3`.
- En **HD Estándar (720p)**: Asigna $\approx 90\text{px}$ por fila, permitiendo que cabeceras, botones y valores métricos se muestren al $100\%$ sin recorte ni compresión destructiva.

### 2.4 Fórmulas de Derivación Espacial Continua
Dado un contenedor con ancho visible $W_{\text{net}}$ y alto visible $H_{\text{net}}$, con un espaciado intercelular $G$:

$$\text{Paso Horizontal } (\Delta X) = \frac{W_{\text{net}} + G}{12}, \quad W_{\text{cell}} = \Delta X - G$$

$$\text{Paso Vertical } (\Delta Y) = \frac{H_{\text{net}} + G}{6}, \quad H_{\text{cell}} = \Delta Y - G$$

El tamaño físico de cualquier tarjeta de dimensiones $(s_c, s_r)$ es:
$$W_{\text{widget}} = s_c \times W_{\text{cell}} + (s_c - 1) \times G$$
$$H_{\text{widget}} = s_r \times H_{\text{cell}} + (s_r - 1) \times G$$

---

## 3. Estructuras de Datos del Sistema

### 3.1 Definición de Widget (`WidgetDefinition`)
```text
Structure WidgetDefinition:
    id: String                      // Identificador único (ej. "mod-telemetry-clock")
    title: String                   // Rótulo legible
    span_col: Integer               // Columnas que ocupa (rango: 1..12)
    span_row: Integer               // Filas que ocupa (rango: 1..6)
    is_resizable: Boolean           // Permite cambio de tamaño en caliente
    min_span_col: Integer           // Límite mínimo de columnas (ej. 1)
    min_span_row: Integer           // Límite mínimo de filas (ej. 1)
```

### 3.2 Posicionamiento en Cuadrícula (`GridPosition`)
```text
Structure GridPosition:
    col: Integer                    // Columna inicial (1..12)
    row: Integer                    // Fila inicial (1..6)
    span_col: Integer               // Ancho efectivo en celdas
    span_row: Integer               // Alto efectivo en celdas
```

### 3.3 Matriz de Ocupación (`OccupancyMatrix`)
Estructura en memoria utilizada por el motor espacial para cálculo instantáneo de colisiones:
```text
Type OccupancyMatrix = Array[1..12, 1..6] of Nullable(String)
// Cada posición contiene el WidgetId que ocupa la celda, o Null si está vacía.
```

### 3.4 Perfil de Distribución (`DashboardProfile`)
```text
Structure DashboardProfile:
    id: String                      // Identificador del perfil (ej. "default")
    name: String                    // Nombre visual (ej. "General")
    layout: Map<String, GridPosition> // Diccionario { WidgetId -> GridPosition }
    hidden_widgets: List<String>    // Lista de WidgetIds registrados pero inactivos
```

---

## 4. Algoritmos Fundamentales del Motor Espacial

### 4.1 Construcción de la Matriz de Ocupación
Convierte la lista de widgets visibles en una cuadrícula binaria/referencial para validación $O(1)$.

```text
Function ConstruirMatrizOcupacion(widgets_visibles, layout):
    matriz = Matriz 12x6 inicializada con Null
    
    Para cada widget en widgets_visibles:
        pos = layout.obtener(widget.id)
        Si pos no es nulo:
            Para c desde pos.col hasta (pos.col + pos.span_col - 1):
                Para r desde pos.row hasta (pos.row + pos.span_row - 1):
                    Si c <= 12 y r <= 6:
                        matriz[c, r] = widget.id
                        
    Retornar matriz
```

### 4.2 Algoritmo de Búsqueda de Espacio Libre (`FindNextFreeSlot`)
Escaneo determinista por filas mayores (Row-Major: izquierda a derecha, arriba hacia abajo) para encontrar el primer bloque rectangular continuo que aloje al widget.

```text
Function EncontrarSiguienteHuecoLibre(span_col, span_row, matriz):
    max_c = 12 - span_col + 1
    max_r = 6 - span_row + 1

    Para r desde 1 hasta max_r:
        Para c desde 1 hasta max_c:
            espacio_libre = Verdadero
            
            // Comprobar que todas las celdas del rectángulo estén vacías
            Para sub_r desde r hasta (r + span_row - 1):
                Para sub_c desde c hasta (c + span_col - 1):
                    Si matriz[sub_c, sub_r] != Null:
                        espacio_libre = Falso
                        Romper ciclo interno
                Si espacio_libre == Falso:
                    Romper ciclo interno
            
            Si espacio_libre == Verdadero:
                Retornar Posicion(col = c, row = r)
                
    Retornar Null // No cabe en ningún lugar del lienzo
```

### 4.3 Detección de Colisiones
Determina si un widget en coordenadas tentativas colisiona con otros componentes existentes.

```text
Function DetectarColisiones(c_origen, r_origen, span_c, span_r, widget_id_ignorado, matriz):
    colisiones = ConjuntoVacio()
    
    Para c desde c_origen hasta (c_origen + span_c - 1):
        Para r desde r_origen hasta (r_origen + span_r - 1):
            Si c > 12 o r > 6:
                Retornar Error("Fuera de límites físicos del lienzo")
            ocupante = matriz[c, r]
            Si ocupante != Null y ocupante != widget_id_ignorado:
                colisiones.agregar(ocupante)
                
    Retornar colisiones
```

---

## 5. Política Estricta de Capacidad y Admisión ("Si no cabe, no entra")

Para erradicar la sobrepoblación del lienzo y el surgimiento de barras de desplazamiento, el motor aplica una **puerta de enlace transaccional estricta**:

```text
Function IntentarActivarWidget(nuevo_widget, layout_actual, lista_ocultos):
    matriz = ConstruirMatrizOcupacion(widgets_activos, layout_actual)
    
    // 1. Validar si existen coordenadas previas válidas y libres
    pos_previa = layout_actual.obtener(nuevo_widget.id)
    Si pos_previa != Null:
        colisiones = DetectarColisiones(pos_previa.col, pos_previa.row, 
                                        nuevo_widget.span_col, nuevo_widget.span_row, 
                                        nuevo_widget.id, matriz)
        Si colisiones.estaVacio():
            // Restaurar en su posición histórica
            layout_actual.fijar(nuevo_widget.id, pos_previa)
            lista_ocultos.remover(nuevo_widget.id)
            Retornar Exito("Widget restaurado en su posición previa")

    // 2. Buscar un nuevo hueco contiguo en la cuadrícula 12x6
    hueco = EncontrarSiguienteHuecoLibre(nuevo_widget.span_col, nuevo_widget.span_row, matriz)
    
    Si hueco != Null:
        layout_actual.fijar(nuevo_widget.id, Posicion(col = hueco.col, row = hueco.row, 
                                                      span_col = nuevo_widget.span_col, 
                                                      span_row = nuevo_widget.span_row))
        lista_ocultos.remover(nuevo_widget.id)
        Retornar Exito("Widget activado y posicionado")
    Sino:
        // Transacción denegada: Rollback del estado
        nuevo_widget.activo = Falso
        Si nuevo_widget.id no está en lista_ocultos:
            lista_ocultos.agregar(nuevo_widget.id)
            
        EmitirNotificacionSistema("Capacidad Excedida: No hay espacio suficiente en el Dashboard.")
        Retornar Rechazo("Capacidad insuficiente")
```

---

## 6. Física de Arrastre y Cuantización Continua (Drag & Drop Engine)

A diferencia del arrastre estándar de sistemas operativos basado en cajas fantasmas o flujo de texto, este motor implementa **captura de puntero con cuantización matricial en tiempo real**.

### 6.1 Ciclo de Arrastre en 3 Fases

#### Fase 1: Inicio de Arrastre (`OnPointerDown`)
1. Comprobar que el origen del puntero provenga de la cabecera o asa de arrastre (`drag-handle`). Elementos interactivos internos (`input`, `button`, `select`) quedan excluidos del inicio de arrastre.
2. Registrar punto de anclaje inicial: $(X_{\text{start}}, Y_{\text{start}})$.
3. Registrar posición del widget en la matriz: $(c_{\text{orig}}, r_{\text{orig}})$.
4. Calcular el desplazamiento relativo del cursor dentro del widget:
   $$\text{offset}_X = X_{\text{start}} - \text{Widget.Left}, \quad \text{offset}_Y = Y_{\text{start}} - \text{Widget.Top}$$
5. Elevar el z-index del componente e insertar un **Indicador de Destino Fantasma (Drop Indicator)** en la posición original.

#### Fase 2: Movimiento y Cuantización (`OnPointerMove`)
1. Calcular la posición visual continua del componente:
   $$X_{\text{drag}} = X_{\text{pointer}} - \text{offset}_X - \text{Lienzo.Left}$$
   $$Y_{\text{drag}} = Y_{\text{pointer}} - \text{offset}_Y - \text{Lienzo.Top}$$

2. Cuantizar las coordenadas continuas en índices enteros de cuadrícula:
   $$c_{\text{tentativa}} = \text{Redondear}\left(\frac{X_{\text{drag}}}{\Delta X}\right) + 1$$
   $$r_{\text{tentativa}} = \text{Redondear}\left(\frac{Y_{\text{drag}}}{\Delta Y}\right) + 1$$

3. **Acotamiento Inviolable de Bordes (Clamping)**:
   $$c_{\text{clamped}} = \text{Limitar}\left(c_{\text{tentativa}}, 1, 12 - \text{span\_col} + 1\right)$$
   $$r_{\text{clamped}} = \text{Limitar}\left(r_{\text{tentativa}}, 1, 6 - \text{span\_row} + 1\right)$$

4. **Actualización del Indicador Fantasma**:
   - Mover el drop indicator a $(c_{\text{clamped}}, r_{\text{clamped}})$.
   - Si la celda tentativa está en colisión, teñir el drop indicator con advertencia visual.

#### Fase 3: Soltado y Resolución de Colisiones (`OnPointerUp`)
Al liberar el puntero:
1. Si $(c_{\text{clamped}}, r_{\text{clamped}}) == (c_{\text{orig}}, r_{\text{orig}})$: el widget no se desplazó; finalizar sin cambios.
2. Evaluar colisiones en la posición final excluyendo al widget arrastrado:
   $$\text{colisionados} = \text{DetectarColisiones}(c_{\text{clamped}}, r_{\text{clamped}}, \text{span\_col}, \text{span\_row}, \text{widget.id}, \text{matriz})$$

3. **Protocolo de Reubicación Asistida**:
   - Asignar al widget arrastrado las coordenadas $(c_{\text{clamped}}, r_{\text{clamped}})$.
   - Para cada widget colisionado:
     - Intentar reubicarlo buscando el siguiente hueco libre mediante `EncontrarSiguienteHuecoLibre`.
     - Si no existe ningún hueco libre en la cuadrícula de $12 \times 6$: **el widget colisionado se desplaza a la lista de componentes ocultos (`hidden_widgets`) de forma segura**, notificando al usuario. **Bajo ninguna circunstancia se permite que dos widgets compartan la misma celda ni que el lienzo se expanda en altura**.

---

## 7. Algoritmo de Auto-Organización y Compactación

Función ejecutada por el usuario (mediante botón de acción) para defragmentar la cuadrícula y eliminar huecos muertos:

```text
Function AutoOrganizarDashboard(widgets_activos, layout_actual, lista_ocultos):
    matriz_nueva = Matriz 12x6 inicializada con Null
    layout_nuevo = DiccionarioVacio()

    // 1. Ordenar widgets por tamaño y estabilidad (prioridad a grandes y superiores)
    widgets_ordenados = Ordenar(widgets_activos, Criterio:
        - Primero mayor altura (span_row descendente)
        - Segundo mayor ancho (span_col descendente)
        - Tercero posición original más alta (row ascendente, col ascendente)
    )

    // 2. Empaque voraz determinista
    Para cada widget en widgets_ordenados:
        hueco = EncontrarSiguienteHuecoLibre(widget.span_col, widget.span_row, matriz_nueva)
        
        Si hueco != Null:
            layout_nuevo.fijar(widget.id, Posicion(col = hueco.col, row = hueco.row, 
                                                   span_col = widget.span_col, 
                                                   span_row = widget.span_row))
            // Ocupar las celdas en la nueva matriz
            Para c desde hueco.col hasta (hueco.col + widget.span_col - 1):
                Para r desde hueco.row hasta (hueco.row + widget.span_row - 1):
                    matriz_nueva[c, r] = widget.id
        Sino:
            // Si el widget no cabe tras compactar, se relega limpiamente a ocultos
            widget.visible = Falso
            layout_nuevo.remover(widget.id)
            Si widget.id no está en lista_ocultos:
                lista_ocultos.agregar(widget.id)

    // 3. Aplicar y persistir el nuevo estado atómicamente
    layout_actual = layout_nuevo
    PersistirEstado(layout_actual, lista_ocultos)
```

---

## 8. Persistencia e Hidratación Determinista

### 8.1 Problema de Desplazamiento en Cascada
Si al cargar un perfil guardado las tarjetas se restauran en el orden aleatorio del almacenamiento, una tarjeta de fila inferior procesada antes que una tarjeta superior puede ocupar sus celdas, generando colisiones falsas y corrompiendo la distribución.

### 8.2 Protocolo de Hidratación por Coordenadas
Para garantizar determinismo matemático idéntico en cada inicio:

1. **Ordenamiento de Restauración**: Antes de posicionar cualquier elemento, ordenar la lista de widgets activos por:
   $$\text{Prioridad} = (\text{row} \times 100) + \text{col}$$
   Las tarjetas de la fila 1 se ubican primero (de izquierda a derecha), seguidas por la fila 2, garantizando que cada componente reclame con precisión su espacio histórico.
2. **Purga de Coordenadas Fantasma**: Al persistir el estado, el motor solo guarda las tarjetas que se encuentren físicamente activas y visibles. Entradas huérfanas de componentes eliminados se descartan del archivo de configuración.

---

## 9. Adaptabilidad Multi-Resolución y Escalado Elástico

Para asegurar que la cuadrícula $12 \times 6$ funcione con excelencia estética y ergonomía tanto en monitores compactos (720p/768p) como en pantallas de alta densidad (1080p, 2K, 4K), el motor debe aplicar las siguientes directivas de diseño:

### 9.1 Prohibición de Medidas Rígidas en Píxeles
- **Prohibido**: Definir alturas fijas de tarjeta como `height: 250px` o fuentes fijas en `28px`. En pantallas compactas, esto genera desbordamiento; en pantallas 4K, genera componentes diminutos.
- **Mandatorio**: Utilizar funciones de acotamiento elástico:
  $$\text{Valor} = \text{Clamp}(\text{Mínimo}, \text{Porcentaje Relativo del Contenedor}, \text{Máximo})$$

### 9.2 Contención por Contenedor (Container Queries / Bounds)
Cada tarjeta debe operar como un micro-universo de diseño independiente:
- **Tarjeta Compacta ($W < 180\text{px}$)**: Reducción de espaciados internos, títulos en tamaño base (11-12px), valores métricos compactos y badges en modo solo-icono.
- **Tarjeta Estándar ($W \in [180\text{px}, 320\text{px}]$)**: Tipografía holgada, etiquetas descriptivas visibles y márgenes simétricos.
- **Tarjeta Panorámica ($W > 320\text{px}$)**: Distribución interna horizontal de métricas y gráficos en paralelo.

---

## 10. Matriz de Verificación e Invariantes para Implementación por IA

Todo modelo de lenguaje o agente que implemente este motor debe comprobar los siguientes criterios de aceptación:

| ID | Invariante de Diseño | Criterio de Verificación |
| :--- | :--- | :--- |
| **INV-01** | **Cero Scroll** | La propiedad de desbordamiento en el contenedor del dashboard es estrictamente `hidden`. Ninguna tarjeta puede empujar la altura del lienzo más allá de la ventana. |
| **INV-02** | **Matriz Fija 12x6** | La cuadrícula horizontal posee exactamente 12 columnas y 6 filas. |
| **INV-03** | **Cero Solapamiento** | La intersección espacial entre cualquier par de tarjetas activas $A$ y $B$ es el conjunto vacío ($\text{Rect}(A) \cap \text{Rect}(B) = \emptyset$). |
| **INV-04** | **Rechazo Atómico** | Si un widget nuevo no cabe en celdas contiguas dentro del marco $12 \times 6$, su activación es cancelada y se notifica al usuario. |
| **INV-05** | **Clamping de Arrastre** | Durante el arrastre, las coordenadas están acotadas a $c \in [1, 12 - \text{span\_c} + 1]$ y $r \in [1, 6 - \text{span\_r} + 1]$. |
| **INV-06** | **Determinismo de Carga** | Recargar el perfil desde almacenamiento produce exactamente la misma disposición espacial sin desplazamientos accidentales. |
