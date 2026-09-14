# Bitácora de Errores y Correcciones: PC Manager (Bug Tracker)

Este documento registra de forma histórica, detallada y auditable todos los errores, excepciones, fallos de entorno y correcciones (**Bug Fixes**) implementados en el proyecto **PC Manager**, vinculados a su correspondiente commit y versión del sistema.

---

## 📊 Resumen Estadístico de Incidencias

| Versión | Total Incidencias | Críticas | Altas | Medias | Bajas | Estado |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `0.0.1-alpha` | 8 | 2 | 5 | 1 | 0 | 100% Resueltas |

---

## 📝 Registro Detallado de Errores y Bug Fixes

### [BUG-001] Bloqueo de sesión por tarea asíncrona en background en verificación de credenciales
- **Fecha**: 2026-09-13
- **Commit**: `0210f84` / `9a973ff`
- **Versión**: `v0.0.1-alpha`
- **Severidad**: `CRÍTICA`
- **Componente**: `Tooling / Entorno de Agente (Antigravity)`
- **Descripción del Fallo**: 
  El agente de la sesión anterior ejecutó una llamada a `Invoke-WebRequest -Method Head` para verificar los scopes del token de GitHub. La llamada se desvió a segundo plano (`task-1275`). El agente quedó bloqueado en bucle de sondeo (`manage_task status`) sin responder al usuario, paralizando la sesión.
- **Causa Raíz**: 
  Uso de llamadas asíncronas con redirección a segundo plano en scripts de validación que requerían ejecución síncrona inmediata con timeout acotado.
- **Solución Implementada**: 
  Se reemplazó la validación por scripts síncronos directos en PowerShell con `Invoke-RestMethod` y `WaitMsBeforeAsync` suficiente (8000ms), recuperando el control y reanudando la sesión mediante lectura local del transcript.
- **Archivos Afectados / Relacionados**: 
  - Entorno de agente / scripts de inicialización de Git.
- **Estado**: `RESUELTO`

---

### [BUG-002] Detección de jerga técnica informal ("carcasa inicializada") en log del Core
- **Fecha**: 2026-09-13
- **Commit**: `079eaa6`
- **Versión**: `v0.0.1-alpha`
- **Severidad**: `MEDIA`
- **Componente**: `Core Runtime (src/core/index.js)`
- **Descripción del Fallo**: 
  Al inicializar el Core, la consola emitía el mensaje `[PCManagerCore] Carcasa inicializada correctamente`, violando la Regla 6 de Eficiencia Visual y Cero Jerga Técnica.
- **Causa Raíz**: 
  Uso de término de diseño interno en lugar de la redacción técnica neutral de producción.
- **Solución Implementada**: 
  Se refactorizó el mensaje de registro a `[PCManagerCore] Sistema inicializado correctamente (v${this.version})`.
- **Archivos Afectados**: 
  - [`src/core/index.js`](file:///c:/Proyectos/pc_manager/src/core/index.js)
- **Estado**: `RESUELTO`

---

### [BUG-003] Deformación de texto informativo y desborde horizontal al colapsar el menú lateral
- **Fecha**: 2026-09-13
- **Commit**: `f8d14c8`
- **Versión**: `v0.0.1-alpha`
- **Severidad**: `ALTA`
- **Componente**: `UI / Shell (`[`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  Al colapsar el sidebar, la leyenda "Sin módulos activos..." no se ocultaba, adaptándose forzadamente al ancho mínimo y provocando un scrollbar horizontal indeseado.
- **Causa Raíz**: 
  Falta de regla CSS para ocultar contenedores de texto descriptivo bajo la clase `.sidebar.collapsed`.
- **Solución Implementada**: 
  Se agregaron estilos de transición con `opacity: 0`, `pointer-events: none` y `overflow: hidden` al estado colapsado, preservando únicamente los iconos vectoriales SVG centrados.
- **Archivos Afectados**: 
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`index.html`](file:///c:/Proyectos/pc_manager/index.html)
- **Estado**: `RESUELTO`

---

### [BUG-004] Reasignación huérfana de módulos ante la eliminación de grupos personalizados
- **Fecha**: 2026-09-13
- **Commit**: `079eaa6`
- **Versión**: `v0.0.1-alpha`
- **Severidad**: `ALTA`
- **Componente**: `Core / ModuleManager (`[`src/core/module_manager.js`](file:///c:/Proyectos/pc_manager/src/core/module_manager.js)`)`
- **Descripción del Fallo**: 
  Al eliminar un grupo de módulos personalizado, los módulos asociados podían quedar en un estado inconsistente sin grupo asignado o desaparecer del árbol de visualización.
- **Causa Raíz**: 
  Ausencia de un mecanismo canónico de reubicación por defecto al grupo base inborrable.
- **Solución Implementada**: 
  Se implementó en `deleteGroup(groupName)` la reasignación forzosa y automática de todos los módulos del grupo eliminado hacia el grupo inmutable **"General"**, arrojando además un error controlado si se intenta eliminar "General".
- **Archivos Afectados**: 
  - [`src/core/module_manager.js`](file:///c:/Proyectos/pc_manager/src/core/module_manager.js)
  - [`test/core_test.js`](file:///c:/Proyectos/pc_manager/test/core_test.js)
- **Estado**: `RESUELTO`

---

### [BUG-005] Desacoplamiento e integración funcional del Core Microkernel con la UI del Shell
- **Fecha**: 2026-09-13
- **Commit**: `29d9100`
- **Versión**: `v0.0.1-alpha`
- **Severidad**: `ALTA`
- **Componente**: `UI Shell / Runtime Integrator (`[`index.html`](file:///c:/Proyectos/pc_manager/index.html)`, `[`src/app.js`](file:///c:/Proyectos/pc_manager/src/app.js)`)`
- **Descripción del Fallo**: 
  La interfaz visual operaba anteriormente como maquetas estáticas con código inline desacoplado de las clases del microkernel (`src/core/`), imposibilitando la ejecución de la aplicación como un sistema integral ejecutable.
- **Causa Raíz**: 
  Separación de la fase de prototipado HTML frente a la fase de implementación del microkernel.
- **Solución Implementada**: 
  Se modularizó el sistema con `package.json`, servidor local zero-dependency `scripts/serve.js`, controlador de vista `src/app.js`, estilos unificados `src/ui/styles.css`, e integración del módulo canónico `SystemTelemetryModule` (`telemetry:hardware`) que renderiza en tiempo real sus tarjetas y actualiza el Dashboard y menú lateral.
- **Archivos Afectados**: 
  - [`index.html`](file:///c:/Proyectos/pc_manager/index.html)
  - [`package.json`](file:///c:/Proyectos/pc_manager/package.json)
  - [`scripts/serve.js`](file:///c:/Proyectos/pc_manager/scripts/serve.js)
  - [`src/app.js`](file:///c:/Proyectos/pc_manager/src/app.js)
  - [`src/ui/styles.css`](file:///c:/Proyectos/pc_manager/src/ui/styles.css)
  - [`src/ui/icons.js`](file:///c:/Proyectos/pc_manager/src/ui/icons.js)
  - [`src/modules/system_telemetry/index.js`](file:///c:/Proyectos/pc_manager/src/modules/system_telemetry/index.js)
- **Estado**: `RESUELTO`

---

### [BUG-006] Desvío arquitectónico: concepción errónea de servidor web en lugar de software nativo de escritorio (Rust + Tauri)
- **Fecha**: 2026-09-13
- **Commit**: `75c0e03`
- **Versión**: `v0.0.1-alpha`
- **Severidad**: `CRÍTICA`
- **Componente**: `Arquitectura Global / Directivas de Sistema`
- **Descripción del Fallo**: 
  Se introdujo un script de servidor web (`scripts/serve.js`) para visualización en navegador, desviando el proyecto de su naturaleza canónica de software de computadora ejecutable en el escritorio.
- **Causa Raíz**: 
  Asunción errónea de entrega web al encontrar prototipos basados en HTML/CSS/JS sin backend de escritorio inicializado.
- **Solución Implementada**: 
  1. Se eliminó completamente `scripts/serve.js` y se reconfiguró `package.json` para Tauri.
  2. Se instituyó la **Regla 0** en [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md) y [`.agents/rules/core_modular_architecture.md`](file:///c:/Proyectos/pc_manager/.agents/rules/core_modular_architecture.md) fijando que PC Manager es exclusivamente un **Software de Escritorio Nativo de Computadora (Rust + Tauri)** para Windows.
  3. Se reforzó el requisito de operación y minimizado al **System Tray (área de notificación)** de Windows.
- **Archivos Afectados**: 
  - [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)
  - [`.agents/rules/core_modular_architecture.md`](file:///c:/Proyectos/pc_manager/.agents/rules/core_modular_architecture.md)
  - [`README.md`](file:///c:/Proyectos/pc_manager/README.md)
  - [`package.json`](file:///c:/Proyectos/pc_manager/package.json)
  - `scripts/serve.js` (eliminado)
- **Estado**: `RESUELTO`

---

### [BUG-007] Colisión de lectura de activos en build de Tauri y estructuración del host de escritorio nativo
- **Fecha**: 2026-09-14
- **Commit**: `1ee6331`
- **Versión**: `v0.0.1-alpha`
- **Severidad**: `ALTA`
- **Componente**: `Tauri Desktop Host (`[`src-tauri/`](file:///c:/Proyectos/pc_manager/src-tauri)`)`
- **Descripción del Fallo**: 
  Al compilar el proyecto Tauri con `cargo check` o `cargo build`, el compilador arrojaba el error `failed to read asset at ..\target\debug\.cargo-build-lock (os error 33)`.
- **Causa Raíz**: 
  La propiedad `frontendDist` en `tauri.conf.json` apuntaba a la raíz (`../`), provocando que el empaquetador de Tauri escaneara recursivamente su propia carpeta interna de compilación de Rust (`src-tauri/target/`).
- **Solución Implementada**: 
  1. Se aisló la distribución de la interfaz gráfica en [`ui/`](file:///c:/Proyectos/pc_manager/ui) (`frontendDist: "../ui"`).
  2. Se configuró e implementó en Rust el soporte completo del **System Tray (área de notificación)** de Windows en [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs) con menú nativo (*Abrir*, *Ocultar*, *Cerrar sin huérfanos*).
  3. Se interceptó el evento de cierre de ventana (`WindowEvent::CloseRequested`) para minimizar a la bandeja del sistema por defecto según la Regla 8.
  4. Se compiló satisfactoriamente el ejecutable nativo de Windows: `src-tauri/target/debug/pc_manager.exe` (13.4 MB).
- **Archivos Afectados**: 
  - [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml)
  - [`src-tauri/tauri.conf.json`](file:///c:/Proyectos/pc_manager/src-tauri/tauri.conf.json)
  - [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs)
  - [`src-tauri/src/main.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/main.rs)
  - [`.gitignore`](file:///c:/Proyectos/pc_manager/.gitignore)
  - [`ui/`](file:///c:/Proyectos/pc_manager/ui)
- **Estado**: `RESUELTO`

---

### [BUG-008] Reversión de módulos de prueba no solicitados y restauración canónica de la Carcasa / Core limpio (v0.0.1-alpha)
- **Fecha**: 2026-09-14
- **Commit**: `ee4e4f8`
- **Versión**: `v0.0.1-alpha`
- **Severidad**: `ALTA`
- **Componente**: `Carcasa / Core UI (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, `[`index.html`](file:///c:/Proyectos/pc_manager/index.html)`)`
- **Descripción del Fallo**: 
  Se había inyectado un módulo simulado de telemetría de hardware dentro de la primera versión del sistema, cuando la especificación requería estrictamente que la versión 0.0.1 fuera la Carcasa Limpia (Core base sin módulos instalados) según la maqueta canónica `core_shell.html`.
- **Causa Raíz**: 
  Inclusión anticipada de módulos de prueba en lugar de preservar el estado limpio de fábrica del Core.
- **Solución Implementada**: 
  1. Se eliminó por completo el módulo de telemetría y cualquier archivo de prueba en `src/modules/` y `ui/src/`.
  2. Se sincronizó la interfaz con la maqueta canónica [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) en [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) e [`index.html`](file:///c:/Proyectos/pc_manager/index.html), conteniendo:
     - Dashboard 10x10 con Hero State de bienvenida y botón flotante canónico de Auto-organización (`btn-fab`).
     - Gestor de Módulos con pestañas integradas de *Módulos del Sistema* y *Gestor de Grupos* (grupo *General* predeterminado e inborrable).
     - Configuraciones homogéneas con 2 comboboxes de tema (Modo y Estilo) y paleta de 10 colores de acento.
     - Directivas de integración con Windows y comandos nativos Tauri vinculados para minimizado al System Tray y parada total sin procesos huérfanos.
  3. Se recompiló el ejecutable nativo de escritorio `pc_manager.exe`.
- **Archivos Afectados**: 
  - `src/modules/` (eliminado)
  - `ui/src/` (eliminado)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`index.html`](file:///c:/Proyectos/pc_manager/index.html)
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-009] Formalización de Roles de Maquetas (index vs core_shell) y Prohibición de Datos Inventados
- **Fecha**: 2026-09-14
- **Severidad**: `Media`
- **Componente**: `Gobernanza / Reglas (`[`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)`, [`.agents/rules/functional_integrity.md`](file:///c:/Proyectos/pc_manager/.agents/rules/functional_integrity.md)`, [`PROJECT_SPECIFICATION.md`](file:///c:/Proyectos/pc_manager/PROJECT_SPECIFICATION.md)`)`
- **Descripción del Fallo**: 
  Falta de especificación formal sobre la distinción entre las dos maquetas (`index.html` como referencia de sistema con módulos activos y `core_shell.html` como referencia limpia de fábrica para la v0.0.1-alpha), lo que condujo a confusiones donde se pretendían eliminar pestañas canónicas (como Catálogo Remoto) o se incluían datos inventados y simulaciones con timers.
- **Causa Raíz**: 
  Ausencia de un documento maestro unificado que consolide toda la historia, decisiones de diseño, preferencias de UI y la regla canónica que establece que los mockups definen las opciones y la jerarquía gráfica, pero nunca deben poblarse con datos falsos.
- **Solución Implementada**: 
  1. Se releyó la transcripción completa de la concepción del proyecto (pasos 0 a 1229) para extraer todas las preferencias y requisitos técnicos.
  2. Se creó el documento maestro [`PROJECT_SPECIFICATION.md`](file:///c:/Proyectos/pc_manager/PROJECT_SPECIFICATION.md) en la raíz del repositorio, detallando la filosofía de software nativo de escritorio, el rol exacto de ambas maquetas, el desglose de cada sección de la interfaz y las reglas del ciclo de vida en Windows.
  3. Se actualizó la Regla 7 en [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md) y en [`.agents/rules/functional_integrity.md`](file:///c:/Proyectos/pc_manager/.agents/rules/functional_integrity.md) para fijar el uso estricto de mockups como guías de opciones gráficas y orden del UI, prohibiendo absolutamente opciones falsas, tarjetas dummy y datos inventados.
- **Archivos Afectados**: 
  - [`PROJECT_SPECIFICATION.md`](file:///c:/Proyectos/pc_manager/PROJECT_SPECIFICATION.md) (creado)
  - [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)
  - [`.agents/rules/functional_integrity.md`](file:///c:/Proyectos/pc_manager/.agents/rules/functional_integrity.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-010] Depuración Final del Core Shell: IPC Tauri, Purga de Temporizadores y Auditoría de Estilo
- **Fecha**: 2026-09-14
- **Severidad**: `Baja`
- **Componente**: `Carcasa / Core UI (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`src-tauri/tauri.conf.json`](file:///c:/Proyectos/pc_manager/src-tauri/tauri.conf.json)`)`
- **Descripción del Fallo**: 
  1. `triggerInstallDialog` contenía un `setTimeout` residual simulando la instalación inmediata de paquetes locales con alertas inventadas.
  2. Falta de invocación nativa IPC al comando `get_system_info` en el arranque de la vista WebView.
  3. No estaba explícitamente activado `withGlobalTauri: true` en `tauri.conf.json` para garantizar el acceso al objeto global `window.__TAURI__`.
- **Causa Raíz**: 
  Residuos de código de prototipado temprano en la gestión de archivos y falta de enlace entre la capa gráfica y los comandos Tauri.
- **Solución Implementada**: 
  1. Se eliminaron los temporizadores `setTimeout` de `triggerInstallDialog`, reemplazándolos por una lectura transparente de metadatos del paquete local (.pcm).
  2. Se configuró `withGlobalTauri: true` en [`src-tauri/tauri.conf.json`](file:///c:/Proyectos/pc_manager/src-tauri/tauri.conf.json).
  3. Se añadió el listener `DOMContentLoaded` en [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) para invocar `get_system_info` e informar la conexión con el host nativo de Windows.
  4. Se sincronizó [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) con la versión depurada y se pasó la auditoría de White-Label y Cero Emojis.
  5. Se recompiló `pc_manager.exe` y se validó en ejecución con ~42 MB de memoria de trabajo (dentro de los límites de bajo consumo).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`src-tauri/tauri.conf.json`](file:///c:/Proyectos/pc_manager/src-tauri/tauri.conf.json)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-011] Creación del Módulo Dummy (.pcm) e Implementación del Instalador Dinámico Real en el Core
- **Fecha**: 2026-09-14
- **Severidad**: `Media`
- **Componente**: `Gestor de Módulos (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)`)`
- **Descripción del Fallo**: 
  El Core disponía de una zona de arrastrar y soltar (dropzone) y un diálogo para seleccionar paquetes `.pcm`, pero carecía de la capacidad técnica para descomprimir archivos ZIP (.pcm), validar su `manifest.json`, registrar sus componentes en caliente y ejecutar su lógica real en el Dashboard y la Navegación sin inventar datos ni usar timers simulados.
- **Causa Raíz**: 
  El formato de paquete `.pcm` es un archivo ZIP estándar, el cual no podía ser procesado por el WebView sin una librería de descompresión en memoria como JSZip y una API de montaje dinámico en el Core.
- **Solución Implementada**: 
  1. Se creó el generador formal de módulos dummy [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs) que compila un paquete real [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm) con `manifest.json`, `module.js` (reloj en vivo con hora UTC y local), `icon.svg` y `README.md`.
  2. Se integró [`ui/vendor/jszip.min.js`](file:///c:/Proyectos/pc_manager/ui/vendor/jszip.min.js) para descomprimir y analizar paquetes `.pcm` localmente en memoria sin llamadas a servidores externos.
  3. Se programó el cargador e instalador dinámico en [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html):
     - Soporta Drag & Drop directo sobre la zona de carga y selección mediante diálogo de archivos.
     - Valida campos obligatorios del `manifest.json` (`id`, `name`, `version`, `entry`, etc.).
     - Registra el módulo en la lista de *Módulos Instalados*, monta su tarjeta widget (2x1) en el Dashboard 10x10, crea su botón de acceso en el grupo del menú lateral y monta su vista detallada.
     - Soporta conmutación activa/inactiva y desinstalación completa limpia (retornando al estado vacío si no quedan módulos).
  4. Se sincronizó [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y se recompiló el binario nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)
  - [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm)
  - [`ui/vendor/jszip.min.js`](file:///c:/Proyectos/pc_manager/ui/vendor/jszip.min.js)
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`package.json`](file:///c:/Proyectos/pc_manager/package.json)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-012] Corrección de Tarjetas No Estilizadas, Implementación de Drag & Drop, Auto-organización, Meta-Opciones y Actualización de Módulos (v1.1.0)
- **Fecha**: 2026-09-14
- **Severidad**: `Media`
- **Componente**: `Dashboard y Gestor de Módulos (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)`)`
- **Descripción del Fallo**: 
  1. Los widgets inyectados en el Dashboard aparecían como texto desprovisto de formato de tarjeta (sin fondo, sin bordes y sin variantes de tamaño grid).
  2. No era posible mover las tarjetas mediante arrastrar y soltar (drag & drop) ni funcionaba el botón flotante de Auto-organizar.
  3. Faltaba soporte para que los módulos registren meta-opciones de configuración dinámicas dentro de la sección de *Configuraciones*.
  4. Faltaban widgets operativos para cronómetro y temporizador interactivos con botones de control.
  5. El instalador no contemplaba el flujo de actualización en caliente para paquetes `.pcm` (ej. actualizar de v1.0.0 a v1.1.0 sin duplicar elementos).
- **Causa Raíz**: 
  1. Las clases CSS `.card`, `.card-size-*`, `.card-header`, etc., no habían sido incluidas en la hoja de estilos de la carcasa.
  2. Faltaban los listeners de arrastre HTML5 (`dragstart`, `dragover`, `drop`, `dragend`) asociados a los elementos del grid y la lógica de reordenamiento e inserción relativa.
  3. El Core carecía de un contenedor para meta-opciones de módulos y de un despachador de eventos de cambio de ajustes.
- **Solución Implementada**: 
  1. Se incorporaron en [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) y [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) las reglas completas de `.card`, variantes de tamaño (`1x1` a `10x2`), animaciones fluidas `cardDrop` y `cardPulse`, y estados visuales `.dragging` y `.drag-target`.
  2. Se programó la función `makeCardDraggable(card)` para habilitar drag & drop suave entre tarjetas y `autoOrganizeDashboard()` con compactación y retroalimentación animada.
  3. Se creó el contenedor `#dynamic-module-settings-container` y el despachador `dispatchModuleSetting(moduleId, optId, val)` para que los módulos expongan opciones configurables (selectores, switches) en caliente.
  4. Se implementó el soporte de actualización en `installModule`: si el módulo ya existe, purga los widgets y vistas anteriores, refresca los metadatos de versión en la lista de módulos instalados con la etiqueta `ACTUALIZADO`, monta los nuevos componentes y emite la notificación correspondiente.
  5. Se actualizó el paquete [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm) a la versión `1.1.0` con 3 widgets (Reloj digital 2x1, Cronómetro interactivo con vueltas 2x2 y Temporizador con barra de progreso y alarma sonora Web Audio 2x2), además de 3 meta-opciones funcionales en Configuraciones (formato 24h/12h, mostrar/ocultar segundos, alerta sonora).
  6. Se sincronizó `core_shell.html` y se recompiló el ejecutable nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)
  - [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-013] Transición a Arquitectura Nativa de Escritorio (Alpha 0.0.2): Persistencia en Windows (Rust) y Cuadrícula Responsive
- **Fecha**: 2026-09-14
- **Severidad**: `ALTA`
- **Componente**: `Core Nativo Rust (`[`src-tauri/src/module_manager.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/module_manager.rs)`, [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs)`) y Presentación (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. Al cerrar la aplicación, todos los módulos instalados y sus ajustes se desinstalaban/perdían completamente, ya que la gestión ocurría únicamente en memoria volátil de JavaScript (comportamiento de navegador web no deseado, violando la Regla 0).
  2. En ventanas no maximizadas, la cuadrícula fija de 10 columnas (`grid-template-columns: repeat(10, minmax(0, 1fr))`) reducía el ancho de las celdas a ~50px, provocando que los widgets se deformaran, montando textos y botones unos encima de otros.
- **Causa Raíz**: 
  1. Ausencia de un módulo gestor nativo en Rust con acceso al sistema de archivos de Windows (`%APPDATA%\com.pcmanager.core\`).
  2. Falta de reglas responsive con media queries y `min-width` protector para las tarjetas del Dashboard.
- **Solución Implementada**: 
  1. Se implementó el módulo nativo [`src-tauri/src/module_manager.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/module_manager.rs) con soporte completo para:
     - Descompresión nativa de archivos `.pcm` mediante crate `zip`.
     - Almacenamiento físico de archivos en `%APPDATA%\com.pcmanager.core\modules\<id>\`.
     - Base de datos persistente en `%APPDATA%\com.pcmanager.core\registry.json` que registra módulos, estado activo/inactivo, ajustes y orden de tarjetas.
  2. Se expusieron comandos IPC nativos en [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs): `get_installed_modules`, `install_module_package`, `uninstall_module`, `toggle_module_active`, `save_module_setting`, `get_saved_settings`, `save_dashboard_order` y `get_dashboard_order`.
  3. Se conectó [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) con la IPC de Tauri: al arrancar el programa, lee y restaura automáticamente del disco todos los módulos y ajustes guardados; al instalar, desinstalar o modificar, sincroniza atómicamente con Windows.
  4. Se rediseñó la cuadrícula del Dashboard con media queries adaptativas (`10` columnas en pantallas anchas, `6` columnas en < 1400px y `4` columnas en < 1080px) y `min-width` protector, impidiendo la deformación de tarjetas en ventanas no maximizadas.
  5. Se incrementó la versión a `0.0.2-alpha` en `Cargo.toml`, `tauri.conf.json`, `package.json`, `ui/index.html` y `core_shell.html`.
  6. Se compiló el ejecutable nativo de Windows: [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe) (14.4 MB).
- **Archivos Afectados**: 
  - [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml)
  - [`src-tauri/tauri.conf.json`](file:///c:/Proyectos/pc_manager/src-tauri/tauri.conf.json)
  - [`src-tauri/src/module_manager.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/module_manager.rs) (creado)
  - [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs)
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`package.json`](file:///c:/Proyectos/pc_manager/package.json)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-014] Personalización de Tarjetas del Dashboard, Drag & Drop sin Bloqueos y Botones Contextuales Dinámicos
- **Fecha**: 2026-09-14
- **Severidad**: `Media`
- **Componente**: `Dashboard & Carcasa UI (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. El panel lateral (drawer) "Personalizar Dashboard" (`#drawer-catalog`) mostraba únicamente un texto estático de "Sin tarjetas disponibles", impidiendo visualizar los widgets de los módulos instalados para activar o desactivar su presencia en la cuadrícula.
  2. El drag & drop de tarjetas no respondía o se cancelaba debido a que los elementos cosméticos hijos internos disparaban eventos `dragleave`, `* { user-select: none; }` interfería con el inicio de arrastre en Chromium/WebView2 y el contenedor `#grid-board` no gestionaba eventos `dragover`/`drop` directos.
  3. El botón "Personalizar Dashboard" era visible en todas las pantallas (incluyendo Configuración y Gestor de Módulos), cuando únicamente correspondía a la vista del Dashboard.
  4. El botón de Notificaciones no ocupaba la posición canónica extrema derecha de la barra superior.
- **Causa Raíz**: 
  1. Ausencia de una función `renderDashboardCustomizationCatalog()` que recorra los widgets instalados y genere switches para alternar la visibilidad de cada tarjeta.
  2. Ausencia de regla CSS `-webkit-user-drag: element`, interferencia de nodos hijos en el bubbling del drag y falta de exclusión para que los clics en botones de widgets no inicien arrastres accidentales.
  3. Estructura fija de botones en `.topbar-actions` sin contenedor dinámico dependiente de `currentView`.
- **Solución Implementada**: 
  1. Se implementó `renderDashboardCustomizationCatalog()` y `toggleWidgetVisibility()`:
     - Genera dinámicamente tarjetas en el drawer con nombre, tamaño (`2x1`, `2x2`), módulo padre y un switch para mostrar u ocultar la tarjeta en el Dashboard.
     - Persiste la lista de tarjetas ocultas en disco de Windows mediante Tauri IPC (`save_module_setting` en `core_dashboard.hidden_widgets`) y restaura su estado en el arranque.
     - Se actualiza automáticamente al instalar, activar/desactivar, desinstalar módulos o al abrir el drawer.
  2. Se optimizó el Drag & Drop:
     - Aplicadas reglas CSS `-webkit-user-drag: element;`, `cursor: grab / grabbing` y `pointer-events: none` en hijos cosméticos, preservando `pointer-events: auto !important` en botones y controles interactivos.
     - Se añadió verificación en `dragstart` para no arrastrar si el puntero se posó sobre un control interactivo (permitiendo pulsar botones de cronómetro/temporizador con total fluidez).
     - Se agregaron listeners `dragover` y `drop` en `#grid-board` y cálculo preciso de mitad de tarjeta (`after`/`before`) al soltar.
  3. Se rediseñó la barra superior:
     - Contenedor `#topbar-contextual-actions` que inyecta los botones "Auto-organizar" y "Personalizar Dashboard" únicamente cuando la vista activa es `dashboard`. En `settings` y `module-manager` el contenedor se vacía y oculta automáticamente.
     - El botón de Notificaciones `#topbar-notif-btn` se ubicó de manera fija y permanente en el extremo derecho de la barra superior.
  4. Se sincronizó `core_shell.html` y se recompiló el ejecutable nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`










