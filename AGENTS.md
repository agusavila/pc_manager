# Workspace Guidelines: PC Manager Core-Modular

Bienvenido al espacio de trabajo de **PC Manager**. Estas directivas son de cumplimiento estricto e incondicional para todo agente de IA y desarrollador que participe en este proyecto.

---

## 1. Directivas Fundamentales

### Regla 0: Naturaleza del Software — Programa Nativo de Escritorio (Desktop Software)
- **Software de Computadora para Escritorio**: PC Manager es exclusivamente una **aplicación nativa de escritorio para Windows**, construida sobre la arquitectura **Rust + Tauri** con interfaz gráfica en WebView.
- **Prohibición de Servidores Web**: Queda terminantemente prohibido concebir, estructurar o tratar el proyecto como un servidor web, sitio web, API HTTP o aplicación cliente-servidor para navegador. Es un programa ejecutable local de computadora.
- **Integración Profunda con Windows**:
  - Reside y opera en el **Área de Notificación (System Tray)** de Windows mediante icono y menú contextual nativo.
  - Al cerrar la ventana, se minimiza a la bandeja del sistema por defecto para continuar operando en segundo plano.
  - Soporta inicio automático con el sistema operativo.
  - Soporta modo servicio nativo de Windows (pre-logon) para telemetría y colectores previos al inicio de sesión.
  - Parada total determinista al ordenar el cierre definitivo (cero procesos huérfanos).

### Regla 1: Aislamiento Total y Privacidad
- **Cero transferencia de datos externos**: Prohibido terminantemente buscar, leer, adaptar o reutilizar información, código, nombres de archivos, bases de datos o configuraciones de otros proyectos o directorios personales de este equipo o usuario.
- Cualquier integración externa debe ser solicitada y aprobada explícitamente por el usuario antes de implementarse.

### Regla 2: Filosofía White Label (Marca Blanca y Producción Limpia)
- El software debe ser completamente neutral, elegante, profesional y reutilizable.
- **Prohibido**:
  - Referencias a nombres de usuarios locales o rutas de perfil personales (`C:\Users\...`).
  - Mención o acoplamiento a marcas comerciales específicas de hardware (Intel, AMD, Nvidia, Kingston, etc.) salvo cuando se lean dinámicamente como datos neutrales de telemetría de la API del sistema.
  - Términos informales, referencias a pertenencias personales ("tu PC", "tus archivos"). Usar redacción formal y técnica de producción ("Sistema", "Archivos Temporales", "Almacenamiento Local").

### Regla 3: Arquitectura Core-Modular (Carcasa Extensible)
- El proyecto se concibe como un **Core (Carcasa/Microkernel)** ligero y robusto, diseñado para admitir **Módulos (Plugins)** independientes y desacoplados.
- El Core se limita a:
  1. Gestión del ciclo de vida (arranque, inicialización, parada).
  2. Registro y descubrimiento de módulos mediante contratos e interfaces formales.
  3. **Registro de Servicios Compartidos (`ServiceRegistry`)**: Permite a los módulos exportar y consumir servicios comunes (ej. telemetría de hardware) sin duplicar código ni acoplarse directamente.
  4. **Gestor de Grupos de Módulos**: Integrado canónicamente dentro del **Gestor de Módulos**. Soporta agrupación configurable de módulos, con el grupo **"General" predeterminado e inborrable**. Al eliminar cualquier grupo personalizado, sus módulos se reasignan automáticamente a "General".
  5. Bus de eventos/mensajería interna para comunicación desacoplada.
  6. Configuración centralizada y logs de auditoría.
- Los módulos deben poder añadirse, removerse o desactivarse sin que el Core o el resto de los módulos dejen de funcionar (salvo dependencias explícitas declaradas y validadas por el Core).

### Regla 4: Tríada de Documentación Obligatoria
Cada módulo o funcionalidad agregada al sistema debe mantener actualizada la documentación en tres vertientes:
1. **Manual de Usuario** (`docs/user/`): Enfocado en beneficios, casos de uso y operación sin tecnicismos.
2. **Especificación para IA** (`docs/ai/`): Contratos, esquemas de datos, APIs y directivas de contexto para modelos de IA.
3. **Guía de Desarrollador** (`docs/developer/`): Arquitectura, contratos de interfaz, patrones de diseño y guías de extensión.

### Regla 5: Seguridad Operativa del Sistema
- Las operaciones con potencial de modificación o eliminación de archivos o procesos deben contar obligatoriamente con modo de simulación previa (**Dry-Run**).
- El núcleo debe contener una lista inmutable de exclusión para proteger la estabilidad del sistema operativo anfitrión.

### Regla 6: Sistema de Diseño e Iconografía (Material Expressive)
- **Cero emojis como iconos**: Todo icono de la interfaz debe ser un gráfico vectorial SVG limpio, moderno y con trazo uniforme.
- **Motor de Temas y Colores (Modo Oscuro y Claro)**: Prohibido hardcodear colores o fuentes en módulos. Todos deben consumir las variables semánticas (`var(--bg-*)`, `var(--text-*)`, `var(--accent-*)`) del Core.
  - La sección de **Configuraciones** debe incluir dos selectores tipo combobox:
    1. **Tipo de Modo**: *Modo Oscuro* / *Modo Claro*.
    2. **Estilo de Fondo**: Variantes temáticas adaptadas al tipo elegido (Oscuro: *Oscuro Profundo*, *Carbon Black*, *Midnight Navy*, *Cyberpunk Dark*; Claro: *Blanco Puro*, *Azul Suave*, *Gris Platino*, *Menta Suave*).
  - Incluir una paleta extendida de colores de acento primario (mínimo 8-10 colores seleccionables en caliente).
- **Canonicidad de Nomenclatura**: La vista principal se denomina exclusivamente **"Dashboard"** (prohibido "Pizarra Central" o variantes).
- **Eficiencia Visual (Cero Relleno Informativo y Cero Jerga Técnica en Interfaz)**: Prohibido saturar la cabecera o las tarjetas con chips u etiquetas redundantes (prohibido "Sistema Central", "Núcleo Operativo", "Módulos Activos" o insignias como "Servicio Compartido: x" dentro de las tarjetas del Dashboard). Prohibido el uso de frases informales o jergas técnicas como "carcasa inicializada" en títulos o textos de bienvenida para el usuario.
- **Acceso y Gestión de Notificaciones**: El acceso a notificaciones en la barra superior debe ser un icono SVG pequeño (`btn-icon`), acompañado de un indicador rojito numérico de notificaciones no leídas. El panel lateral (drawer) debe contar obligatoriamente con botones de acción para **Marcar todas como leídas** y **Borrar todas**.
- **Navegación Lateral, Colapso Único y Ocultamiento de Grupos**:
  - **Un solo control canónico de colapso**: El menú lateral (sidebar) se colapsa y expande **exclusivamente pulsando el icono de la aplicación** (brand logo). Prohibido añadir botones redundantes (chevron lateral, botones tipo hamburguesa en la barra superior o cabecera).
  - Al minimizarse, se ocultan los textos y sólo permanecen visibles los iconos centrados de cada sección o módulo con tooltips explicativos.
  - Los grupos de módulos en el sidebar son colapsables para mostrar u ocultar sus componentes y no deben llevar el prefijo "Grupo:".
  - **Ocultamiento Automático de Grupos Vacíos**: Al deshabilitar un módulo, este desaparece del menú lateral. Si era el único módulo activo dentro de su grupo, el encabezado del grupo **se oculta automáticamente** para no dejar secciones vacías. Al reactivarse, el grupo reaparece de forma transparente.

- **Barra Superior Canónica y Cero Títulos Redundantes**: El nombre de la sección/módulo y su descripción residen de manera unificada y canónica en la barra superior (`top-bar`). Queda terminantemente prohibido duplicar bloques de títulos o subtítulos dentro del cuerpo de la vista o módulo, maximizando el espacio vertical útil para el contenido operativo.
- **Drag and Drop Fluido y Auto-organización del Dashboard**:
  - Las tarjetas del Dashboard pueden moverse y reubicarse libremente en la cuadrícula de forma suave y continua, con animaciones fluidas (`cubic-bezier`), sombras de elevación y retroalimentación visual clara sin saltos toscos durante el arrastre.
  - El Dashboard debe contar obligatoriamente con un **botón flotante canónico de Auto-organización** (`btn-fab`) que reacomode y compacte inteligentemente las tarjetas en la cuadrícula sin dejar huecos vacíos.

### Regla 7: Integridad Funcional, Uso de Mockups y Cero Datos Inventados
- **Visibilidad 100% en Tarjetas**: Los títulos y contenidos de las tarjetas del Dashboard no pueden estar truncados ni recortados con puntos suspensivos (`ellipsis`). Todo lo que el módulo diseñe para mostrar debe ser 100% legible y visible en el tamaño de celda elegido (`1x1`, `2x1`, `2x2`, etc.).
- **Uso Estricto de Mockups para Opciones Gráficas y Orden del UI**:
  - Los mockups (`core_shell.html` para la versión limpia de fábrica y `index.html` para el sistema con módulos activos) son las **guías canónicas de diseño, opciones gráficas, jerarquía visual y orden de la interfaz**. Todas las opciones gráficas, pestañas y componentes planteados en la maqueta deben estar presentes.
  - **Prohibición Absoluta de Opciones Falsas y Datos Inventados**: Queda terminantemente prohibido inventar datos ficticios, tarjetas dummy simulando módulos no instalados (ej. en catálogo remoto) o simulaciones con temporizadores (`setTimeout`). Si una opción o sección (como el catálogo remoto) no tiene datos disponibles o repositorios conectados, la interfaz debe mostrar con total transparencia su **estado real (Empty State)** con opciones para configurar o sincronizar fuentes reales.
- **Cero elementos placebo o decorativos**: Todo botón, switch, selector o menú debe estar conectado a lógica real. Prohibidos los placeholders o botones sin función.
- **Registro 100% dinámico**: Ningún menú, tarjeta o pestaña de configuración puede estar hardcodeado; todo se registra y desregistra dinámicamente mediante el Core y los módulos activos.
- **Cero duplicidad**: Cada sección tiene un único acceso canónico en la interfaz.
- **Documento Maestro**: Consultar [`PROJECT_SPECIFICATION.md`](file:///c:/Proyectos/pc_manager/PROJECT_SPECIFICATION.md) para el detalle exhaustivo de la arquitectura, maquetas y opciones del sistema.

### Regla 8: Ciclo de Vida del Core e Integración con Windows
- **Inicio con Windows**: Opción configurable en Configuraciones para iniciar automáticamente con el sistema operativo.
- **Minimizar a la Bandeja del Sistema (Tray)**: Habilitada por defecto. Al cerrar la ventana, la aplicación se minimiza en el área de notificación de Windows (System Tray) para continuar operando en segundo plano.
- **Cierre Total y Parada de Servicios**: Al ordenar el cierre definitivo de la aplicación (Quit / Salir desde el tray o ventana), el Core tiene la obligación de **detener inmediatamente todos los servicios, hilos de telemetría, procesos secundarios y recursos**, garantizando cero procesos huérfanos en memoria.
- **Modo Servicio de Windows (Pre-logon)**: El Core debe soportar un modo de ejecución desacoplado como servicio nativo de Windows (`services.msc`), permitiendo que las tareas esenciales y colectores de fondo operen incluso antes de que el usuario inicie sesión.

### Regla 9: Registro Obligatorio de Errores y Bug Fixes por Commit
- **Bitácora Canónica (`BUG_TRACKER.md`)**: Es terminantemente obligatorio documentar todo error, fallo de sintaxis, bug funcional o bloqueo de entorno detectado y solucionado en [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md).
- **Trazabilidad en Commits**: Cada commit que resuelva un problema debe registrar el identificador `BUG-XXX`, causa raíz, solución y archivos afectados en la bitácora, formando parte del commit o sincronizándose en conjunto.

---

## 2. Estructura de Customizaciones

Las reglas y habilidades de IA están organizadas en:
- Reglas detalladas: [`.agents/rules/`](file:///c:/Proyectos/pc_manager/.agents/rules/)
  - [`core_modular_architecture.md`](file:///c:/Proyectos/pc_manager/.agents/rules/core_modular_architecture.md): Estándares de diseño de la carcasa y plugins.
  - [`white_label_standards.md`](file:///c:/Proyectos/pc_manager/.agents/rules/white_label_standards.md): Protocolos de estilo neutral y saneamiento de datos.
  - [`isolation_and_security.md`](file:///c:/Proyectos/pc_manager/.agents/rules/isolation_and_security.md): Políticas de seguridad, sandboxing y aislamiento.
  - [`documentation_triad.md`](file:///c:/Proyectos/pc_manager/.agents/rules/documentation_triad.md): Requisitos para la tríada de documentación.
  - [`ui_design_system.md`](file:///c:/Proyectos/pc_manager/.agents/rules/ui_design_system.md): Sistema de diseño Material Expressive, iconografía SVG y componentes UI.
  - [`functional_integrity.md`](file:///c:/Proyectos/pc_manager/.agents/rules/functional_integrity.md): Integridad funcional, cero opciones de adorno o hardcodeadas.
  - [`bug_and_error_tracking.md`](file:///c:/Proyectos/pc_manager/.agents/rules/bug_and_error_tracking.md): Registro continuo de errores y bug fixes por commit.
- Skills de IA: [`.agents/skills/`](file:///c:/Proyectos/pc_manager/.agents/skills/)
  - [`core-module-scaffolder`](file:///c:/Proyectos/pc_manager/.agents/skills/core-module-scaffolder/SKILL.md): Creación estandarizada de módulos.
  - [`white-label-auditor`](file:///c:/Proyectos/pc_manager/.agents/skills/white-label-auditor/SKILL.md): Auditoría de código limpio y neutral.
  - [`documentation-triad-sync`](file:///c:/Proyectos/pc_manager/.agents/skills/documentation-triad-sync/SKILL.md): Sincronización de manuales de usuario, IA y desarrollador.


