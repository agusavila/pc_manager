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






