# Regla de Integridad Funcional: Cero Opciones Hardcodeadas o de Adorno

## 1. Principio Fundamental
En **PC Manager**, cada elemento visual interactivo debe tener una función real, verificable y respaldada por lógica de negocio activa. Queda terminantemente prohibido el desarrollo de interfaces cosméticas con opciones "de adorno", botones placebo o datos hardcodeados simulados.

---

## 2. Directivas Específicas

### 2.1. Prohibición de Elementos Placebo o "Mock"
- **Prohibido**:
  - Botones que no ejecutan ninguna acción o que solo imprimen en consola sin efecto real.
  - Opciones de menú con etiquetas como *"Próximamente"*, *"En desarrollo"* o deshabilitadas sin razón funcional.
  - Métricas estáticas o simuladas (números fijos inventados de uso de CPU o memoria en lugar de lecturas reales de telemetría).
  - Interruptores o checkboxes que no persistan su estado en la configuración del sistema.

### 2.2. Uso de Mockups vs. Prohibición de Datos Inventados
- **Mockups como Guía Canónica de Opciones Gráficas**: Las maquetas (`core_shell.html` para la carcasa limpia y `index.html` para el entorno con módulos) determinan la ergonomía, la distribución espacial, las opciones gráficas y la jerarquía de la interfaz. Todas las opciones y pestañas planteadas deben estar disponibles.
- **Prohibición de Datos Ficticios**: Ningún componente debe poblarse con datos inventados (tarjetas dummy en catálogos, repositorios fingidos con estado ACTIVO o temporizadores `setTimeout` simulando descargas). Si no hay datos reales o no hay conexión configurada, el componente debe mostrar de forma transparente su **estado real (Empty State)** informativo con opciones para configurar o sincronizar fuentes.

### 2.3. Prohibición de Opciones y Rutas Hardcodeadas
- Todo elemento del menú lateral (Sidebar), toda tarjeta en la galería del Dashboard y toda pestaña en la vista de Configuraciones debe ser **registrado dinámicamente** por el Core o por los módulos formalmente instalados.
- Si un módulo es desinstalado o desactivado, su tarjeta del Dashboard, su pestaña de configuración y su ítem del Sidebar **deben desaparecer automáticamente** de la interfaz.

### 2.4. Unicidad y Coherencia de Controles (Cero Duplicidad)
- Cada vista o acción debe tener **un único lugar canónico** en la interfaz.
- No duplicar accesos de manera descuidada (por ejemplo, tener un botón de "Configuraciones" tanto en la barra superior como en el menú lateral).
- Estructura unificada de navegación:
  - **Sidebar Lateral**:
    1. **Dashboard** (fijo superior).
    2. **Slots de Módulos y Grupos** (inyectados dinámicamente en el centro según módulos activos; grupos vacíos se auto-ocultan).
    3. **Configuraciones** (fijo inferior, único punto de acceso a opciones del Core y pestañas de módulos).
  - **Barra Superior (Topbar)**:
    - **Centro de Notificaciones**: Icono SVG compacto con indicador circular rojo de alertas no leídas.
- **Control Único de Colapso del Menú Lateral**:
  - Prohibida la redundancia de botones de colapso. El único control canónico para alternar el menú lateral (expandido / minimizado a iconos) es el **icono de la aplicación** (`.brand-symbol`).
- **Ciclo de Vida y Servicios en Windows**:
  - Los controles de inicio con Windows, minimizar a la bandeja (Tray, activo por defecto) y Modo Servicio de Windows deben estar respaldados por llamadas al sistema.
  - Al ejecutar la orden de salida definitiva (*Quit*), el Core debe garantizar la parada inmediata de todos los servicios, hilos de telemetría y subprocesos hijos sin procesos huérfanos.

---

## 3. Checklist de Verificación de Integridad Funcional
Antes de entregar cualquier pantalla, componente o módulo:
- [ ] ¿Cada botón ejecuta una acción real respaldada por un servicio o endpoint? (Debe ser SÍ).
- [ ] ¿Cada dato mostrado en pantalla proviene de una fuente de datos real o telemetría activa? (Debe ser SÍ).
- [ ] ¿Cada interruptor persiste su cambio en el almacén de configuración? (Debe ser SÍ).
- [ ] ¿Se eliminaron todos los textos temporales, opciones redundantes o controles de adorno? (Debe ser SÍ).
- [ ] ¿La interfaz se adapta limpiamente si hay 0 módulos instalados? (Debe ser SÍ).
