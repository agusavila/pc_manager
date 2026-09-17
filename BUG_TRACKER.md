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

---

### [BUG-015] Optimización del Espacio Vertical del Dashboard y Botón de Auto-organizar en Barra Superior
- **Fecha**: 2026-09-14
- **Severidad**: `Baja`
- **Componente**: `Dashboard UI (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. El botón flotante inferior de Auto-organización (`.fab-auto-organize`) se encontraba duplicado tras incorporarse la acción en la barra superior, ocupando espacio visual valioso en el pie del Dashboard y tapando tarjetas inferiores.
  2. En la barra superior, el botón "Auto-organizar" se presentaba como un botón ancho con texto, en lugar de un botón compacto tipo icono (`btn-icon`) con retroalimentación explicativa en hover.
- **Causa Raíz**: 
  Convivencia de dos controles para la misma acción tras la migración a la barra superior y falta de un componente de tooltip enriquecido para botones tipo icono.
- **Solución Implementada**: 
  1. Se eliminó completamente el botón flotante inferior `#btn-auto-organize` (`.fab-auto-organize`) de la vista del Dashboard en [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) y [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html), liberando el 100% del espacio vertical útil para la cuadrícula y sus tarjetas.
  2. Se transformó el botón de la barra superior en un botón compacto tipo icono (`btn-icon`) utilizando el icono vectorial canónico de cuadrícula compacta (4 cuadrantes).
  3. Se implementó el sistema CSS de micro-tooltips `[data-tooltip]` con animación suave y elevación en hover (`data-tooltip="Auto-organizar Dashboard"`), junto al atributo `title` nativo.
  4. Se sincronizó `core_shell.html` y se recompiló el ejecutable nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-016] Expansión Total del Dashboard y Rediseño de la Pantalla de Configuraciones por Pestañas
- **Fecha**: 2026-09-14
- **Severidad**: `Media`
- **Componente**: `UI / Dashboard & Settings (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. Tras retirar el botón flotante inferior en el Dashboard, la cuadrícula (`.grid-board`) mantenía un `min-height: calc(100vh - 180px)` rígido, dejando una franja inutilizada al pie de la ventana en lugar de expandirse hasta el fondo.
  2. La pantalla de Configuraciones agrupaba todas las tarjetas (Core y módulos) en una cuadrícula compacta compartida (`.settings-grid`), sin segmentación modular y sin abarcar todo el espacio horizontal disponible (`max-width: 1160px`).
- **Causa Raíz**: 
  1. Falta de propiedad `flex: 1` y `min-height: 100%` en `.dashboard-container` y `.grid-board`.
  2. Falta de un sistema de navegación por pestañas (`switchSettingsTab`) para separar las configuraciones generales del Core de las de cada módulo instalado, así como estilo de tarjetas estrechas.
- **Solución Implementada**: 
  1. Se actualizó `.dashboard-container` y `.grid-board` a `min-height: 100%; flex: 1;`, logrando que la cuadrícula del Dashboard aproveche el 100% del área vertical disponible hasta el fondo.
  2. Se rediseñó la pantalla de Configuraciones implementando:
     - Barra superior de pestañas de configuración (`#settings-tabs-bar`) con la pestaña predeterminada e inmutable **"General"**.
     - Inyección dinámica de pestañas y paneles dedicados (`switchSettingsTab`) cuando un módulo `.pcm` declara `meta_options` en su `manifest.json`.
     - Tarjetas de configuración (`.settings-card`) a ancho completo (`width: 100%`, `box-sizing: border-box`) dentro de un contenedor en columna (`.settings-content-stack`).
     - Sincronización transparente en el ciclo de vida: al desactivar o desinstalar un módulo, su pestaña y panel se ocultan/eliminan y se restablece la pestaña General.
  3. Se saneó `Cargo.toml` (`authors = ["PC Manager Team"]`) cumpliendo estrictamente con la Regla 2 de Marca Blanca.
  4. Se sincronizó `core_shell.html` y se recompiló el ejecutable nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-017] Corrección del Estado Vacío en Centro de Notificaciones, Gestión de Permisos por Módulo/Sistema, Alertas Nativas de Windows 10/11 y Botón "Widgets"
- **Fecha**: 2026-09-14
- **Severidad**: `Media`
- **Componente**: `Centro de Notificaciones / Configuraciones / UI (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)`)`
- **Descripción del Fallo**: 
  1. En el Centro de Notificaciones se mostraba simultáneamente una tarjeta de notificación activa y el aviso de lista vacía ("Sin notificaciones / El historial del sistema se encuentra vacío.") debajo de ella.
  2. No existían opciones en la pantalla de Configuraciones para gestionar la emisión de alertas (habilitar/deshabilitar avisos del núcleo o permisos individuales por módulo).
  3. No existía opción para derivar las notificaciones hacia el sistema operativo anfitrión (Centro de Notificaciones y Actividades de Windows 10/11).
  4. El botón principal del Dashboard en la barra superior conservaba el texto "Personalizar Dashboard" en vez del término conciso "Widgets".
- **Causa Raíz**: 
  1. `clearAllNotifications` sobrescribía el contenido interno de `#notif-list` con el bloque HTML del estado vacío. Al ingresar una nueva notificación, `addSystemNotification` ejecutaba `list.prepend(item)`, insertando la tarjeta antes del bloque vacío sin eliminarlo ni ocultarlo.
  2. Inexistencia de un gestor de preferencias de notificaciones (`notificationSettings`) persistido en disco y de una interfaz de control en la pestaña General de Configuraciones.
  3. Falta de invocación y enlace con la API nativa de notificaciones de Windows (`window.Notification`) dentro del WebView del Core.
  4. Texto extenso no simplificado en la barra superior del Dashboard.
- **Solución Implementada**: 
  1. Se estandarizó el elemento `#notif-empty-state` dentro de `#notif-list` y se creó la rutina `updateNotificationEmptyState()`, la cual valida la cantidad de elementos `.notif-item` activos, mostrando el mensaje de vacío únicamente cuando el conteo es estrictamente cero y ocultándolo transparentemente en cuanto existe una o más notificaciones.
  2. Se añadió una nueva tarjeta en la pestaña General de Configuraciones: **"Gestión y Permisos de Notificaciones"**, con:
     - Interruptor para activar/desactivar notificaciones del núcleo del sistema (`toggleSystemNotifPermission`).
     - Interruptor para habilitar notificaciones nativas en Windows 10/11 (`toggleWindowsNativeNotif`) solicitando permisos al sistema operativo.
     - Lista dinámica de extensiones modulares (`renderModuleNotificationPermissions`), permitiendo conceder o revocar permisos de emisión de alertas a cada módulo individualmente.
     - Persistencia de configuración en disco mediante el comando Rust `save_module_setting` (`moduleId: 'core_notifications'`).
  3. Se conectó `addSystemNotification` con el filtrado de permisos (núcleo y módulos) y con `dispatchWindowsNativeNotification` para emitir avisos al Centro de Notificaciones de Windows 10/11.
  4. Se cambió el texto del botón contextual de la barra superior y los textos auxiliares de "Personalizar Dashboard" a "Widgets".
  5. Se actualizó el constructor del módulo de prueba [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs) asociando el identificador de módulo `system-clock` y se recompiló [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm).
  6. Se sincronizó [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y se recompiló el ejecutable nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)
  - [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-018] Sincronización del Interruptor de Activación en el Gestor de Módulos al Restaurar Estado Inactivo desde Disco
- **Fecha**: 2026-09-14
- **Severidad**: `Baja`
- **Componente**: `Gestor de Módulos / UI (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  Al desactivar un módulo, cerrar la aplicación y reabrirla, el módulo se mantenía desactivado en el Dashboard y la barra lateral, pero en la lista del Gestor de Módulos el interruptor aparecía en posición activada (`checked`).
- **Causa Raíz**: 
  1. El elemento `<input type="checkbox">` del switch en `installModule` carecía de un identificador de control único (ej. `switch-mod-${manifest.id}`) y se insertaba con el atributo `checked` hardcodeado.
  2. La función `toggleModuleActive` alteraba la visibilidad de los widgets y botones de navegación, pero nunca actualizaba el estado del switch ni la apariencia de la fila en el Gestor de Módulos.
  3. `installModule` no recibía el estado `isActive` como parámetro en su llamada inicial durante `DOMContentLoaded`.
- **Solución Implementada**: 
  1. Se actualizó `installModule(manifest, scriptCode, isActive = true)` para aceptar el estado de activación real y configurar el switch con `${isActive ? 'checked' : ''}` e identificador `id="switch-mod-${manifest.id}"`.
  2. Se configuró atenuación visual (`opacity: 0.65`) en la tarjeta del módulo cuando se encuentra inactivo.
  3. Se modificó `toggleModuleActive` para sincronizar en tiempo real el elemento `switchEl.checked = isActive` y su opacidad.
  4. Se condicionó la alerta emergente `addSystemNotification` para emitirse únicamente ante cambios de usuario (`syncDisk = true`), evitando avisos redundantes en el arranque del sistema.
  5. Se sincronizó [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y se recompiló el ejecutable nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-019] Corrección de Anidamiento de Tarjeta de Notificaciones, Rediseño del Drawer de Widgets con Iconos Reales de Módulo y Reemplazo de Drag & Drop por Sistema Robusto de PointerEvents
- **Fecha**: 2026-09-14
- **Severidad**: `Media`
- **Componente**: `UI / Configuraciones / Widgets Drawer / Drag & Drop (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)`)`
- **Descripción del Fallo**: 
  1. La tarjeta de configuración de notificaciones quedó anidada visualmente dentro de la tarjeta de temas y colores debido a etiquetas de cierre omitidas.
  2. En el panel lateral de Widgets, las tarjetas aparecían desalineadas (el interruptor centrado verticalmente debajo del texto) y todas mostraban un icono genérico de cuadrícula en vez del icono representativo del módulo.
  3. El Drag and Drop de las tarjetas del Dashboard no funcionaba debido a interferencias de eventos CSS (`pointer-events: none` en hijos de la tarjeta) y al bloqueo de eventos nativos OLE DnD de WebView2/Tauri en Windows.
- **Causa Raíz**: 
  1. En [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html), faltaban las dos etiquetas `</div></div>` para cerrar el flex container y la tarjeta de Temas y Colores antes de abrir `card-notification-settings`.
  2. El catálogo del drawer utilizaba la clase `.settings-card` (cuya dirección flex es en columna) en vez de un componente horizontal dedicado, y usaba un SVG genérico hardcodeado.
  3. El sistema de Drag and Drop previo se basaba en el API HTML5 Drag and Drop (`draggable="true"`), que en WebView2 bajo Windows dentro de Tauri sufre bloqueos por el manejador de drop de ventana de Tauri, sumado a la regla CSS `.card > *:not(...) { pointer-events: none; }` que bloqueaba eventos de inicio de arrastre.
- **Solución Implementada**: 
  1. Se cerró formalmente la tarjeta de Temas y Colores en la plantilla general, independizando la tarjeta de Notificaciones como un bloque de primer nivel en la pantalla de Configuraciones.
  2. Se diseñó el componente horizontal `.widget-catalog-item` para el Drawer con icono del módulo/widget a la izquierda, títulos y badges en el centro y switch alineado a la derecha.
  3. Se enriqueció el constructor del paquete dummy [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs) proveyendo iconos vectoriales SVG limpios tanto a nivel de módulo como individual para cada widget, y se regeneró [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm).
  4. Se reemplazó el motor de arrastre por un sistema de **PointerEvents** (`pointerdown`, `pointermove`, `pointerup` con `setPointerCapture`), independiente de las limitaciones OLE de Windows/Tauri. Al arrastrar una tarjeta, detecta de forma continua la posición respecto a otras tarjetas del Dashboard y las reordena fluidamente en caliente, persistiendo el orden al soltar.
  5. Se eliminó la regla `pointer-events: none` sobre los hijos de las tarjetas y se agregó `touch-action: none;` para garantizar control suave y sin conflictos.
  6. Se sincronizó [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y se recompiló el ejecutable [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)
  - [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-020] Motor de Posicionamiento Libre por Coordenadas en Cuadrícula, Vista Previa de Snapping y Auto-organización con Empaquetado 2D
- **Fecha**: 2026-09-14
- **Severidad**: `Media`
- **Componente**: `Dashboard / Drag & Drop / Grid System (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  El mecanismo de arrastre previo dependía exclusivamente del flujo DOM secuencial de CSS Grid (`grid-auto-flow`). Al arrastrar una tarjeta solo permitía intercambiarla de posición con tarjetas contiguas, imposibilitando ubicar tarjetas en posiciones arbitrarias de la cuadrícula (ej. dejar espacios vacíos, mover una tarjeta a una columna o fila específica alejada) y provocando saltos bruscos al mover el cursor.
- **Causa Raíz**: 
  1. Las tarjetas carecían de asignación explícita de coordenadas de inicio en la cuadrícula (`grid-column-start`, `grid-row-start`), dependiendo del orden natural de los elementos DOM, lo que forzaba a CSS Grid a compactar secuencialmente todo elemento sin admitir huecos ni libre albedrío de ubicación.
  2. No existía un indicador visual de celda de destino (`grid-drop-indicator`) ni un clon flotante con elevación visual que siguiera de forma suave y desacoplada al cursor sin alterar el flujo del DOM mientras duraba el arrastre.
  3. El botón de Auto-organizar se limitaba a disparar una animación visual sin recalcular la distribución óptima de las tarjetas en la cuadrícula.
- **Solución Implementada**: 
  1. **Sistema de Coordenadas de Cuadrícula Fijas y Libres**:
     - Cada tarjeta ahora posee atributos `data-col` y `data-row` y estilos inline explícitos (`gridColumn: ${col} / span ${spanCol}`, `gridRow: ${row} / span ${spanRow}`).
     - El usuario puede mover cualquier tarjeta a cualquier columna o fila del Dashboard con total libertad, dejando celdas vacías o agrupándolas a voluntad.
  2. **Motor de Arrastre Fluido con Clon y Previsualización de Snapping**:
     - Al iniciar el arrastre (umbral > 5px), se crea un clon flotante con elevación suave (`.card-drag-clone`, z-index 999999, ligera rotación de 0.8° y sombra Material Expressive).
     - La tarjeta de origen se atenúa sutilmente (`.card-drag-source`).
     - Se proyecta en tiempo real un indicador de celda de destino (`#grid-drop-indicator`) dentro de la cuadrícula con borde punteado del acento primario y fondo translúcido, calculando con precisión matemática la celda más cercana según la posición del cursor, padding y gaps de la cuadrícula.
     - Se incorporó desplazamiento automático suave (auto-scroll) si el puntero se acerca a los extremos superior o inferior del área visible.
  3. **Resolución Inteligente de Colisiones**:
     - Si la tarjeta se suelta en una celda vacía, se asienta en ella inmediatamente sin desplazar ninguna otra.
     - Si se suelta sobre una tarjeta existente, se intercambian las coordenadas de manera fluida y táctil. Si colisiona con múltiples tarjetas, estas se desplazan hacia filas inferiores para mantener la coherencia espacial.
  4. **Auto-organización Real con Algoritmo de Empaquetado 2D (Bin-Packing)**:
     - La función `autoOrganizeDashboard()` ordena las tarjetas activas de arriba a abajo y de izquierda a derecha, calculando con una matriz de ocupación el primer hueco libre disponible sin dejar espacios vacíos, compactándolas con animación `.card-drop`.
  5. **Persistencia Completa de Coordenadas y Adaptabilidad**:
     - Las coordenadas `{ col, row }` se persisten en Rust (`save_module_setting` en `core_dashboard`) y `localStorage`, restaurándose fielmente al iniciar el sistema.
     - Se añadió listener de `resize` para adaptar y re-clampear las coordenadas cuando la ventana reduce sus columnas a 6 o 4 tracks.
  6. **Sincronización y Compilación**:
     - Sincronizado en [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y recompilado en el binario nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-021] Pérdida de Coordenadas de Tarjetas en Cuadrícula al Redimensionar la Ventana e Implementación Canónica de Perfiles de Dashboard en el Core Shell
- **Fecha**: 2026-09-14
- **Severidad**: `Media`
- **Componente**: `Dashboard / Grid System / Responsive Layout / Perfiles de Dashboard (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. Al ubicar una tarjeta en una columna lateral o esquina con la ventana maximizada y desmaximizar la ventana a un tamaño menor, la tarjeta se desplazaba hacia la izquierda para ajustarse a las 6 o 4 columnas reducidas. No obstante, al volver a maximizar la ventana a pantalla completa, la tarjeta no retornaba a su posición original de la esquina, quedando desplazada de manera irreversible.
  2. El Core carecía de un gestor de Perfiles de Dashboard que permitiera al usuario guardar, duplicar, alternar y eliminar distintas configuraciones de tarjetas y visibilidad de widgets (ej. monitoreo de hardware intensivo, modo minimalista, vista de trabajo) de manera independiente y con persistencia en disco.
- **Causa Raíz**: 
  1. En la función `adjustCardsForCurrentGridCols()`, cuando las columnas disponibles decrecían, se ejecutaba `card.dataset.col = col;`, sobrescribiendo de forma destructiva la coordenada de origen de la tarjeta con el valor recortado temporal. Al volver a expandir la ventana, la tarjeta ya no conocía su coordenada base original.
  2. Inexistencia en la arquitectura de la carcasa Core de una entidad de perfiles de Dashboard (`dashboardProfilesState`), carencia de selectores contextuales sincronizados en la barra superior y panel lateral, y falta de persistencia modular desacoplada por perfil.
- **Solución Implementada**: 
  1. **Adaptación Responsive No Destructiva**:
     - Se modificó `adjustCardsForCurrentGridCols()` y `restoreDashboardLayout()` para mantener siempre inmutable la coordenada de origen en `card.dataset.col = baseCol`.
     - El clamp restrictivo para anchos de pantalla reducidos se calcula y aplica únicamente en caliente a la regla CSS `card.style.gridColumn = ${displayCol} / span ${effSpanCol}`.
     - Al volver a maximizar la ventana, el cálculo utiliza la coordenada base intacta, restituyendo de forma inmediata y matemática la tarjeta a su columna o esquina original sin desajustes.
  2. **Arquitectura y Motor de Perfiles de Dashboard en el Core**:
     - Se implementó el estado central `dashboardProfilesState` con perfiles independientes, cada uno con su propio mapa de posiciones `{ col, row }` (`layout`) y lista de widgets ocultos (`hiddenWidgets`).
     - **Perfil Canónico "Predeterminado"**: Inmutable, predeterminado por diseño y protegido contra eliminación conforme a la directiva de la Regla 3.
     - **Selector Contextual en Barra Superior**: Selector tipo combobox discreto y alineado con Material Expressive (`#select-topbar-profile`) dentro del contenedor de acciones contextuales del Dashboard.
     - **Gestión Integral en el Drawer Lateral ("Widgets")**: Tarjeta superior con selector sincronizado, botón de creación de nuevos perfiles (`#panel-new-profile`), botón de duplicación rápida del perfil activo y botón de eliminación (oculto de forma transparente en el perfil Predeterminado).
     - **Visibilidad y Posicionamiento Desacoplado por Perfil**: Al alternar de perfil, se limpian las coordenadas en pantalla, se restauran las posiciones del perfil elegido y se aplican los estados de visibilidad de las tarjetas con animación fluida.
     - **Persistencia Completa y Retrocompatible**: Guardado y restauración en disco con el comando Tauri Rust `save_module_setting` (`moduleId: 'core_dashboard'`, opción `profiles_state`), manteniendo compatibilidad retroactiva con `layout` y `hidden_widgets`.
  3. **Sincronización y Compilación**:
     - Sincronizado en la maqueta canónica [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y recompilado en el binario nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-022] Error HRESULT 0x800700AA en WebView2 ("Ya se está usando el recurso solicitado") por Ejecución Concurrente Multi-instancia e Implementación de Mutex Nativo Pre-Runtime
- **Fecha**: 2026-09-15
- **Severidad**: `Alta`
- **Componente**: `Core / Runtime de Escritorio / Ciclo de Vida / Windows Mutex (`[`src-tauri/src/main.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/main.rs)`, [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml)`)`
- **Descripción del Fallo**: 
  Al intentar abrir PC Manager cuando la aplicación ya se encontraba en ejecución (por ejemplo, minimizada en la bandeja del sistema - System Tray), el segundo proceso arrojaba un error crítico al inicializar la ventana gráfica:
  `[tauri_runtime_wry][ERROR] failed to create webview: WebView2 error: WindowsError(Error { code: HRESULT(0x800700AA), message: "Ya se está usando el recurso solicitado." })`.
- **Causa Raíz**: 
  El motor Microsoft Edge WebView2 en Windows emplea un directorio exclusivo de datos de usuario (`EBWebView`). Si un segundo proceso ejecutable arranca y pretende crear un entorno WebView2 sobre la misma carpeta de perfil bloqueada por la primera instancia activa, la API del sistema operativo deniega el acceso con el error Win32 `0x800700AA` (`ERROR_BUSY` / recurso en uso). La arquitectura carecía de un mecanismo de instancia única a nivel de punto de entrada (`main`), permitiendo que el segundo proceso intentara crear una ventana WebView2 en lugar de enfocarse en la existente.
- **Solución Implementada**: 
  1. **Control de Instancia Única Nativo Pre-Runtime (`ensure_single_instance`)**:
     - Se implementó en [`src-tauri/src/main.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/main.rs) una comprobación atómica previa a cualquier inicialización de Tauri, WRY o WebView2 mediante la API de Windows `CreateMutexW` con identificador único de sesión local (`Local\PCManager_Core_SingleInstance_Mutex`).
     - Si la llamada detecta `ERROR_ALREADY_EXISTS` (otra instancia ya está en ejecución):
       - Localiza inmediatamente la ventana principal de la aplicación mediante `FindWindowW` (`"PC Manager"`).
       - Restaura la ventana si estaba minimizada o en bandeja (`ShowWindow(hwnd, SW_RESTORE)` y `ShowWindow(hwnd, SW_SHOW)`).
       - La sitúa en primer plano para el usuario (`SetForegroundWindow(hwnd)`).
       - Termina de inmediato la segunda ejecución con código de salida `0` en 0 milisegundos, sin tocar WebView2 ni generar contención de recursos en disco.
     - Si es la primera instancia, retiene el descriptor del Mutex durante la vida del proceso y procede normalmente al arranque de la aplicación.
  2. **Dependencias y Compilación**:
     - Se integró `windows-sys` (`Win32_Foundation`, `Win32_Security`, `Win32_System_Threading`, `Win32_UI_WindowsAndMessaging`) en [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml).
     - Compilado y verificado en [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`src-tauri/src/main.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/main.rs)
  - [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs)
  - [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-023] Desarmonía en alturas de controles superiores, selectores nativos sin estilo Material Expressive, scrollbar horizontal en panel de widgets, texto no neutral en System Tray y falta de control granular en notificaciones
- **Fecha**: 2026-09-15
- **Severidad**: `Media`
- **Componente**: `UI / Shell (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`), Backend Rust (`[`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs)`)`
- **Descripción del Fallo**: 
  1. Los controles de la barra superior (`topbar-actions`) presentaban alturas dispares (38px en `.btn-icon`, 32-34px en `.btn`, y 28px en `.topbar-profile-box`).
  2. Los selectores de perfiles de dashboard en la barra superior y en el panel lateral empleaban controles `<select>` nativos del navegador con estética gris tosca, incumpliendo el sistema de diseño Material Expressive (Regla 6).
  3. Al abrir el drawer de Widgets se generaba un scrollbar horizontal indeseado al pie del panel debido a falta de contención (`overflow-x: hidden !important`) y cajas sin `box-sizing: border-box`.
  4. El menú contextual del System Tray empleaba la expresión `"Cerrar Aplicación (Cero Huérfanos)"`, violando la política White-Label (Regla 2).
  5. Las notificaciones del sistema no ofrecían un control granular para activar y desactivar tipos específicos de eventos (host, módulos, ajustes, perfiles, auto-organización, etc.).
  6. En el encabezado lateral se mostraba un texto estático `CORE // v0.0.1-alpha` en lugar del nombre de host de la máquina en uso (`COMPUTERNAME`).
  7. Al crear un nuevo perfil de dashboard, este heredaba las tarjetas previamente activas en lugar de inicializarse como un lienzo en blanco configurable, y no existía la opción de renombrar perfiles.
- **Causa Raíz**: 
  Falta de estandarización dimensional fija (`36px`) en la barra superior; uso de elementos HTML por defecto en lugar del componente `.custom-combobox`; ausencia de contención de desborde horizontal en `.drawer` y `.drawer-body`; redacción con jerga interna en el System Tray; lógica de perfiles que inicializaba `hiddenWidgets: []` en nuevos perfiles; y ausencia de desglose por categoría de eventos en el gestor de notificaciones.
- **Solución Implementada**: 
  1. Se fijó una altura canónica de `36px` con `box-sizing: border-box` y alineación centrada para todos los botones y controles de la barra superior (`.topbar-actions .btn`, `.topbar-actions .btn-icon`, `.custom-combobox.combobox-inline .combobox-trigger`).
  2. Se reemplazaron todos los selectores nativos por el componente `.custom-combobox` con su variante `.combobox-inline` para la barra superior, con menús flotantes translúcidos (`backdrop-filter`), bordes semánticos, chevrons animados y checkmarks de selección activa.
  3. Se erradicó el scrollbar horizontal fijando `overflow-x: hidden !important; width: 100%; box-sizing: border-box;` en `.drawer`, `.drawer-body` y sus componentes internos.
  4. Se saneó el texto del System Tray en Rust (`src-tauri/src/lib.rs`) a `"Cerrar PC Manager"`, alineado estrictamente con la política de Marca Blanca.
  5. Se implementó la arquitectura `SYSTEM_NOTIFICATION_CATEGORIES` con interruptores individuales en la pestaña General de Configuraciones y filtrado granular por categoría (`host`, `modules`, `profiles`, `organize`, `settings`, `windows_integration`, `security`) en `addSystemNotification`.
  6. Se extendió `get_system_info` en Rust para obtener `hostname` dinámicamente (`COMPUTERNAME` o `HOSTNAME`) y se actualizó `#sidebar-core-version` a `${sysInfo.hostname} // v${sysInfo.version}`.
  7. Se actualizó `submitNewProfile()` para iniciar como lienzo en blanco (`hiddenWidgets = [todos los widgets disponibles]`) y se añadió el botón y panel de renombrado (`#panel-rename-profile`, `submitRenameProfile()`).
  8. Se sincronizaron al 100% las maquetas [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) y [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html).
- **Archivos Afectados**: 
  - [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs)
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
### [BUG-024] Superposición de widgets en el Dashboard, expansión desmedida del área vertical hacia el vacío al arrastrar abajo y bloqueo de movimiento
- **Fecha**: 2026-09-15
- **Severidad**: `Alta`
- **Componente**: `UI / Dashboard (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md)`)`
- **Descripción del Fallo**: 
  1. Al arrastrar y soltar widgets en la cuadrícula, en determinados escenarios las tarjetas se superponían unas encima de otras (solapamiento parcial o total de celdas).
  2. Al intentar colocar un widget hacia la parte inferior del área de visualización, el sistema no lo acoplaba al final de las tarjetas ni al área visible, sino que calculaba filas astronómicas (`targetRow` hasta 25 en el vacío), forzando a CSS Grid a instanciar decenas de filas vacías y creando una barra de desplazamiento vertical gigantesca.
  3. Al quedar un widget colocado en una fila lejana inferior, el usuario no podía moverlo un poco más arriba para desacoplarlo debido a la existencia de filas intermedias vacías que sostenían la cuadrícula estirada, requiriendo arrastrarlo forzosamente hasta arriba del todo.
  4. Disparidad dimensional entre la altura base de fila en CSS (`90px`), la altura requerida por los widgets (`~106-118px`) y la calibración del paso en JavaScript (`stepY`), produciendo un desfase progresivo acumulado entre el puntero y la celda de snapping.
- **Causa Raíz**: 
  1. La resolución de colisiones ejecutaba swaps unidireccionales sin comprobar si la tarjeta desplazada colisionaba a su vez con terceras tarjetas adyacentes a la posición de origen; en colisiones múltiples, desplazaba todas las tarjetas en conflicto a la misma fila sin comprobar disponibilidad espacial ni registrar ocupación estricta en una matriz global.
  2. `targetRow` no disponía de un límite coherente con la geometría del área ni con la fila máxima ocupada (`maxOccupiedRow`), permitiendo valores de hasta 25 en el vacío estelar; sumado a un auto-scroll en `.view-content` que se disparaba sin validar si existía desbordamiento real de contenido.
  3. Inconsistencia entre `grid-auto-rows: 90px;` y los requerimientos físicos de los widgets, lo que provocaba que el navegador estirase las filas dinámicamente descalibrando el paso de cálculo $Y$.
- **Solución Implementada**: 
  1. Se calibró la altura base de fila canónica en CSS a `grid-auto-rows: 110px;` y `min-height: 110px;` en el indicador de drop, asegurando que todos los widgets quepan holgadamente sin forzar estiramientos arbitrarios en el motor de diseño del navegador.
  2. Se implementó el **Acoplamiento Magnético Vertical Coherente (`maxAllowedRow`)**: el cálculo de `targetRow` ahora se acota por `Math.max(visibleRowsInViewport - spanRow + 1, maxOccupiedRow + 1)`, permitiendo soltar widgets libremente dentro del área visible de la pantalla o a lo sumo en la fila inmediatamente contigua a las tarjetas existentes, erradicando la creación de filas vacías en el vacío y scrollbars desmedidos.
  3. Se diseñó el **Algoritmo de Matriz de Ocupación Estricta con Swap Bidireccional Verificado**:
     - La tarjeta arrastrada por el usuario reclama su posición con prioridad absoluta y bloquea sus celdas en `occupied`.
     - Si hay un conflicto 1 a 1, se verifica exhaustivamente si la tarjeta afectada cabe limpiamente en la posición de origen sin rozar ninguna celda ocupada ni vecinos preexistentes antes de autorizar el swap.
     - Si hay múltiples tarjetas o el swap no cabe limpiamente, cada tarjeta desplazada busca el siguiente hueco libre de forma secuencial con `findNextFreeSlot`, garantizando **0 superposiciones matemáticas** bajo cualquier circunstancia.
  4. Se acondicionó el auto-scroll durante el arrastre para activarse únicamente si el contenedor realmente desborda (`scrollHeight > clientHeight + 20`) y con velocidad suave (5px).
  5. Se implementó la contracción dinámica del contenedor y limpieza de `scrollTop` residual (`scrollTop = maxScroll`), permitiendo que al mover cualquier widget hacia arriba, el área inferior vacía colapse inmediatamente y la barra de desplazamiento se contraiga al instante.
  6. Se perfeccionó `restoreDashboardLayout` y `adjustCardsForCurrentGridCols` para verificar colisiones con `occupiedMatrix` tanto al cargar perfiles como al redimensionar la ventana hacia anchos reducidos.
  7. Se actualizó [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md) con las fórmulas geométricas y diagramas de la nueva arquitectura de acoplamiento y colisiones.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-025] Cuadrícula en Configuraciones, Submenús de Notificaciones, Reordenamiento de Perfiles, Scrollbars Universales y Menú Contextual Controlado
- **Fecha**: 2026-09-15
- **Severidad**: `Media`
- **Componente**: `UI / Settings / Notificaciones / Perfiles / Scrollbars / Context Menu (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)`, [`.agents/rules/ui_design_system.md`](file:///c:/Proyectos/pc_manager/.agents/rules/ui_design_system.md)`)`
- **Descripción del Fallo**: 
  1. En Configuraciones las tarjetas estaban estiradas a una sola columna horizontal en pantallas medianas/anchas perdiendo aprovechamiento espacial.
  2. La tarjeta de notificaciones concentraba interruptores directos dentro de la tarjeta en lugar de delegar a submenús organizados.
  3. En el panel de widgets del Dashboard el selector combobox de perfiles presentaba dificultades de renderizado de opciones.
  4. Ausencia de un mecanismo para alterar el orden de los perfiles de Dashboard guardados, manteniendo el perfil predeterminado en primera posición.
  5. Barras de desplazamiento con aspecto genérico de navegador en subcontenedores con desbordamiento explícito.
  6. Activación del menú contextual genérico de navegador mediante clic derecho en cualquier punto del software.
- **Causa Raíz**: 
  1. `grid-template-columns: minmax(440px, 1fr)` forzaba columnas simples excesivamente anchas.
  2. Falta de desacoplamiento entre las tarjetas de vista general y la configuración granular de eventos y módulos.
  3. Ausencia de array de orden de perfiles (`profileOrder`) y botones interactivos de subida/bajada.
  4. Selectores CSS de scrollbar no aplicados con selector universal `*::-webkit-scrollbar`.
  5. Carencia de un listener global de `contextmenu` y componente visual de menú contextual personalizado.
- **Solución Implementada**: 
  1. Se reestructuró la pila de configuraciones a cuadrícula de dos columnas simétricas (`repeat(2, minmax(0, 1fr))`) con salto automático a 1 columna en pantallas reducidas (<980px).
  2. Se dividió la sección de notificaciones en dos tarjetas independientes ("Notificaciones del Sistema" y "Notificaciones de Módulos"), trasladando todos los interruptores y selectores a submenús modales con `backdrop-filter`.
  3. Se pobló el combobox de perfiles en el drawer de widgets directamente con `getOrderedDashboardProfiles()`.
  4. Se implementaron las funciones `getOrderedDashboardProfiles()`, `moveCurrentProfileUp()` y `moveCurrentProfileDown()`, incorporando `profileOrder` con seguro inmutable para el perfil `default` en índice 0 y botones de flechas en la cabecera.
  5. Se aplicaron estilos universales de scrollbar `*::-webkit-scrollbar` (6px, bordes redondeados y realce con `--accent-primary`) y se reforzó la directiva en [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md) y [`.agents/rules/ui_design_system.md`](file:///c:/Proyectos/pc_manager/.agents/rules/ui_design_system.md).
  6. Se anuló el menú contextual genérico del navegador (`e.preventDefault()`) e implementó el componente `.custom-context-menu` adaptativo con acciones reales en módulos (abrir, gestor, activar/desactivar, desinstalar) y widgets del dashboard (auto-organizar, personalizar, ocultar).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)
  - [`.agents/rules/ui_design_system.md`](file:///c:/Proyectos/pc_manager/.agents/rules/ui_design_system.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-026] Visibilidad Inmediata en Sidebar al Reinstalar Módulos y Ocultamiento por Defecto de Widgets al Instalar
- **Fecha**: 2026-09-15
- **Severidad**: `Media`
- **Componente**: `Gestor de Módulos / Dashboard / Sidebar (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. Al desinstalar un módulo y reinstalarlo posteriormente mediante un paquete `.pcm`, sus widgets se creaban pero el módulo no aparecía de inmediato en el menú lateral (sidebar).
  2. La instalación de un módulo ubicaba automáticamente sus widgets en el lienzo del Dashboard activo, saturando el espacio del usuario en lugar de dejar que el usuario decida si desea colocarlos.
- **Causa Raíz**: 
  1. Al desinstalar el último módulo de un grupo, `checkSidebarGroupsVisibility()` ocultaba el contenedor del grupo (`style.display = 'none'`). Al reinstalar, `ensureSidebarGroup` encontraba el elemento existente pero no restablecía su visibilidad, y `installModule` no ejecutaba `checkSidebarGroupsVisibility()`.
  2. `installModule` insertaba las tarjetas de widget en `#grid-board` de forma visible y ejecutaba el auto-layout, sin registrar los nuevos widgets en la lista de `hiddenWidgets` del perfil activo.
- **Solución Implementada**: 
  1. Se modificó `ensureSidebarGroup` para garantizar `groupEl.style.display = 'block'` y ocultar la notificación de sidebar vacío, agregando la llamada canónica a `checkSidebarGroupsVisibility()` al final de `installModule`.
  2. En `installModule`, los widgets asociados al módulo se inicializan en estado oculto (`card.style.display = 'none'`) y se agregan a `hiddenWidgets` del perfil activo en `dashboardProfilesState`, quedando disponibles en el catálogo del drawer para su activación manual sin invadir el Dashboard.
  3. En `uninstallModule` se depuraron las referencias residuales de widgets en los perfiles guardados (`hiddenWidgets` y `layout`) y se validó el estado de `empty-dashboard-hero`.
  4. Se corrigieron las llamadas de acción en el menú contextual personalizado vinculándolas con `installedModules.get(modId)`, `switchView` y `toggleModuleActive`.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-027] Falta de Declaración de Funciones para Apertura y Cierre de Submenús Modales de Notificaciones
- **Fecha**: 2026-09-15
- **Severidad**: `Media`
- **Componente**: `Configuraciones / Submenús de Notificaciones (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  Al interactuar con los botones "Configurar Alertas..." y "Permisos de Módulos..." dentro de las tarjetas de configuración de notificaciones, los submenús modales no se desplegaban ni respondían a los clics.
- **Causa Raíz**: 
  Los botones del HTML llamaban a `openSystemNotifModal()` y `openModuleNotifModal()`, pero dichas funciones, junto con sus contrapartes de cierre (`closeSystemNotifModal`, `closeModuleNotifModal`) y el controlador maestro `toggleModulesNotifMaster`, no habían sido implementadas en el script de la interfaz.
- **Solución Implementada**: 
  1. Se implementaron las funciones `openSystemNotifModal()` y `closeSystemNotifModal()`, enlazando los estados con `notificationSettings.systemEnabled` y `notificationSettings.windowsNativeEnabled` con renderizado dinámico de categorías operativas.
  2. Se implementaron `openModuleNotifModal()`, `closeModuleNotifModal()` y `toggleModulesNotifMaster(enabled)`, permitiendo activar o silenciar globalmente o por módulo los avisos de las extensiones.
  3. Se creó la función `updateNotificationBadgesAndSummaries()` para reflejar dinámicamente en las tarjetas de configuración el resumen de eventos del sistema activos ("X de 7 eventos activos") y el estado de módulos ("N módulo(s) configurado(s)").
  4. Se sincronizó `core_shell.html` y se aseguró la persistencia en disco de `modulesMasterEnabled`.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-028] Purga de Notificaciones Redundantes de Sistema y Establecimiento de Política Anti-Ruido
- **Fecha**: 2026-09-15
- **Severidad**: `Baja`
- **Componente**: `Notificaciones / UI / Gobernanza (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)`, [`.agents/rules/ui_design_system.md`](file:///c:/Proyectos/pc_manager/.agents/rules/ui_design_system.md)`)`
- **Descripción del Fallo**: 
  Saturación excesiva del centro de notificaciones con alertas innecesarias y redundantes. Acciones inmediatas en pantalla (como cambiar de tema, alternar paletas de acento, reordenar perfiles con flechas, compactar la cuadrícula o mover switches) generaban notificaciones irrelevantes; asimismo, el arranque normal de la aplicación disparaba alertas automáticas ("Host Nativo Conectado", "Módulos Restaurados"), encendiendo permanentemente el indicador rojo de la campana sin que hubiese ocurrido ningún evento de interés real.
- **Causa Raíz**: 
  Inclusión de llamadas directas a `addSystemNotification` dentro de callbacks de eventos visuales inmediatos y en el hook `DOMContentLoaded`.
- **Solución Implementada**: 
  1. Se eliminaron las 12 notificaciones de ruido identificadas en [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) y [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html):
     - Feedbacks visuales de UI: `Tema Visual Aplicado`, `Color de Acento Actualizado`, `Perfil Cambiado`, `Perfil Reordenado`, `Dashboard Auto-organizado`, `Auto-organización`, `Ajuste Guardado en Disco`, `Arranque del Sistema`, `Bandeja del Sistema`, `Instalación Nativa` y `Catálogo Remoto`.
     - Spam de arranque: `Host Nativo Windows Conectado` y `Módulos Restaurados`.
  2. Se reestructuraron las categorías operativas en `SYSTEM_NOTIFICATION_CATEGORIES` consolidando 4 grupos de valor real: Módulos, Perfiles, Integración con Windows y Seguridad.
  3. Se formalizó la **Política Anti-Ruido y Cero Alertas Placebo** como regla estricta en [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md) (Regla 6) y [`.agents/rules/ui_design_system.md`](file:///c:/Proyectos/pc_manager/.agents/rules/ui_design_system.md) (Sección 5.2), prohibiendo terminantemente generar alertas para acciones de UI cuyo resultado ya es visible en tiempo real o rutinas de arranque estándar.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)
  - [`.agents/rules/ui_design_system.md`](file:///c:/Proyectos/pc_manager/.agents/rules/ui_design_system.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
---

### [BUG-029] Restauración de Grupos de Módulos Colapsables en Menú Lateral y Estiramiento de Tarjetas en Gestor de Módulos
- **Fecha**: 2026-09-15
- **Severidad**: `Media`
- **Componente**: `UI / Sidebar & Gestor de Módulos (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. En el menú lateral (sidebar), los encabezados de grupos de módulos habían dejado de colapsar y expandir sus listas de módulos hijos al hacer clic sobre ellos (`.group-items` permanecía visible y el chevron no rotaba).
  2. En el Gestor de Módulos, las pestañas "Repositorios Configurados" y "Grupos de Módulos" contenían tarjetas fijas a `max-width: 720px`, lo que causaba que no se estiraran a lo ancho del contenedor y desentonaran con las pestañas "Instalados" y "Catálogo Remoto" (las cuales se expanden al 100%).
- **Causa Raíz**: 
  1. Ausencia de reglas CSS dedicadas para `.group-items.collapsed { display: none !important; }` y rotación de `.group-chevron`, junto con una regla `.sidebar.collapsed .modules-nav-area { display: none !important; }` que ocultaba los iconos al minimizar el sidebar.
  2. Restricción CSS en línea `style="max-width: 720px;"` heredada en las tarjetas de configuración de repositorios y grupos dentro de `#manager-tab-sources` y `#manager-tab-groups`.
- **Solución Implementada**: 
  1. Se implementaron estilos CSS canónicos con tokens Material Expressive para `.sidebar-group-box`, `.group-header`, `.group-chevron` (con `transition: transform 0.2s` y rotación de -90deg en estado colapsado), `.group-items` y `.group-items.collapsed { display: none !important; }`.
  2. Se implementó la función `toggleSidebarGroup(groupName)` para conmutar limpiamente la clase `collapsed` en la lista y cabecera del grupo.
  3. Se removió la regla que ocultaba `.modules-nav-area` en el sidebar minimizado, permitiendo que los iconos centrados de los módulos instalados se muestren correctamente según la Regla 6.
  4. Se reemplazó `max-width: 720px` por `width: 100%; box-sizing: border-box;` en todas las tarjetas de "Repositorios Configurados" y "Grupos de Módulos", unificando el ancho completo con las demás pestañas del gestor.
  5. Se sincronizó `core_shell.html`.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-030] Corrección de Persistencia de Perfiles de Dashboard, Centrado Universal de la Tarjeta Central y Homogeneización de Temas Claros
- **Fecha**: 2026-09-16
- **Severidad**: `Alta`
- **Componente**: `Dashboard / Perfiles / UI & Temas (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. Los perfiles de dashboard no se estaban guardando de forma consistente: al reiniciar la aplicación o cambiar perfiles, se sobreescribían con el perfil inicial predeterminado.
  2. Al desmaximizar la ventana o reducir el ancho de pantalla, la tarjeta central del Dashboard (`.empty-dashboard-hero`) dejaba de centrarse y se desplazaba a la derecha o rompía el orden de la cuadrícula.
  3. Los temas claros presentaban partes negras y contrastes inconsistentes: la barra superior (`.topbar`), el pie del menú lateral (`.sidebar-footer`), el fondo de la cuadrícula (`.grid-board`), la zona de arrastre de paquetes (`.dropzone-pcm`), los scrollbars universales y las sombras se mantenían en tonalidades oscuras fijas.
- **Causa Raíz**: 
  1. En `DOMContentLoaded`, `installedList.forEach(installModule)` se ejecutaba antes de `loadDashboardProfiles()`, provocando que `installModule` llamara a `persistDashboardProfilesState()` con el estado en blanco predeterminado antes de leer los perfiles guardados del disco. Asimismo, faltaba persistir el layout del perfil saliente en `switchDashboardProfile` y se sobreescribía la visibilidad con una clave legada de `core_dashboard`.
  2. `.empty-dashboard-hero` utilizaba `grid-column: 2 / span 8;` fijo; en resoluciones no maximizadas (donde el grid cambia a 6 o 4 columnas), dicho span forzaba la creación de columnas implícitas deformando el centrado.
  3. Múltiples clases de interfaz (`.sidebar-footer`, `.topbar`, `.grid-board`, `.dropzone-pcm`, `*::-webkit-scrollbar`) tenían colores oscuros fijos (`rgba(17, 20, 28, ...)` y `rgba(22, 27, 38, ...)`) en lugar de variables semánticas (`var(--bg-surface)`, `var(--bg-elevated)`, `var(--border-medium)`), y no se sincronizaba `color-scheme` en el elemento raíz ni sombras suaves para temas claros en `THEME_PRESETS`.
- **Solución Implementada**: 
  1. Se anticipó la llamada a `await loadDashboardProfiles()` al inicio de `DOMContentLoaded`, se agregó el flag `isStartup` en `installModule` para evitar mutaciones erróneas durante la restauración, se sincronizó el guardado del perfil saliente en `switchDashboardProfile(profileId)` con `persistDashboardLayout()` y se actualizaron `submitNewProfile`, `duplicateCurrentDashboardProfile` y `deleteCurrentDashboardProfile` con sincronización de `profileOrder`.
  2. Se ajustó `.empty-dashboard-hero` con `grid-column: 1 / -1; justify-self: center; align-self: center; width: 100%; max-width: 680px; margin: 20px auto;`, garantizando un centrado perfecto en cualquier resolución y número de columnas (10, 6, 4).
  3. Se purgaron todos los colores oscuros hardcodeados, asignando variables semánticas en `.sidebar-footer`, `.topbar`, `.grid-board`, `.dropzone-pcm` y scrollbars, se incorporó el componente CSS `.form-control`, se agregaron sombras específicas para temas claros (`--shadow-surface`, `--shadow-floating`) y se conectó `document.documentElement.style.colorScheme` al conmutar entre modos oscuro y claro.
  4. Se sincronizó `core_shell.html`.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-031] Persistencia de Posiciones por Perfil en Dashboard, Cero Superposiciones de Widgets y Gestión Interactiva de Notificaciones (Click-to-Read y Swipe-to-Dismiss)
- **Fecha**: 2026-09-16
- **Severidad**: `Alta`
- **Componente**: `Dashboard / Perfiles / Notificaciones / Gestos (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. Las posiciones de los widgets no se guardaban de forma aislada e independiente en los diferentes perfiles del dashboard, sobreescribiéndose o perdiéndose al conmutar entre perfiles.
  2. Los widgets volvían a superponerse al activarse y desactivarse desde el panel de Widgets (drawer): al habilitar una tarjeta, se ubicaba sobre coordenadas obsoletas sin comprobar colisiones contra las tarjetas ya visibles.
  3. Al pulsar sobre una notificación en el panel lateral, esta no se marcaba como leída ni se actualizaba el indicador numérico de la barra superior.
  4. No era posible deslizar (swipe) una notificación hacia la izquierda o derecha para descartarla y retirarla del historial.
  5. La campana de la barra superior arrancaba con un "1" rojo y una notificación hardcodeada ("Sistema Inicializado"), en conflicto con la política anti-ruido y cero spam en el arranque.
- **Causa Raíz**: 
  1. `restoreDashboardLayout` evaluaba tarjetas ocultas dentro del cálculo de ocupación (`occupiedMatrix`) y recurría a un fallback global de `localStorage` que transfería el layout del último perfil modificado a los nuevos perfiles.
  2. En `toggleWidgetVisibility`, la condición `if (card && !card.dataset.col)` evitaba ejecutar la reasignación de cuadrícula cuando la tarjeta ya contenía un atributo `dataset.col` previo, mostrándose exactamente sobre la misma celda que otra tarjeta ya visible.
  3. Los elementos `.notif-item` carecían de listeners de clic y puntero para retirar la clase `.unread` y actualizar la función de conteo del badge.
  4. Ausencia de controlador de gestos de puntero (`pointerdown`, `pointermove`, `pointerup`) con captura de eventos, cálculo de desplazamiento horizontal y animación de salida para descartar notificaciones.
- **Solución Implementada**: 
  1. Se refactorizó `restoreDashboardLayout` para que cada perfil opere exclusivamente sobre su propio mapa `current.layout`, limpiando coordenadas de tarjetas ocultas y calculando la matriz de colisiones únicamente con tarjetas visibles. Se garantiza la asignación del primer slot libre ante cualquier colisión detectada.
  2. Se actualizó `toggleWidgetVisibility` para purgar coordenadas previas al activar o desactivar tarjetas y ejecutar de manera determinista `restoreDashboardLayout()`, asegurando cero superposiciones y persistencia inmediata.
  3. Se creó la función `updateUnreadNotifBadge()` y el controlador `setupNotificationItem(item)` que detecta clics directos para marcar como leída la notificación y actualizar la campana.
  4. Se implementó el soporte completo de deslizamiento táctil y ratón (swipe horizontal izquierda/derecha con umbral de 70px), con transición fluida (`translateX(±115%)`), reducción de opacidad y animación de colapso vertical al removerse.
  5. Se eliminó la notificación dummy del HTML, iniciando la campana en 0 oculta y el contenedor de notificaciones en estado vacío limpio.
  6. Se sincronizó `core_shell.html`.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-032] Gestión Integral de Grupos de Módulos: Reordenamiento, Edición/Renombrado y Asignación Dinámica de Módulos
- **Fecha**: 2026-09-16
- **Severidad**: `Alta`
- **Componente**: `Gestor de Módulos / Grupos / Sidebar (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. Los grupos de módulos en la pestaña "Grupos de Módulos" del Gestor de Módulos no permitían editar ni renombrar sus nombres.
  2. No se permitía cambiar el orden de los grupos: el orden era rígido tanto en la lista del gestor como en el menú lateral (Sidebar).
  3. No era posible seleccionar ni reasignar a qué grupo pertenece cada módulo instalado, ni desde la tarjeta del módulo ni desde la pestaña de grupos.
- **Causa Raíz**: 
  1. El sistema de grupos carecía de un modelo de estado persistente (`moduleGroupsState`), dependiendo de filas estáticas en el DOM HTML que solo permitían `.remove()` sin mecanismo de renombrado o persistencia.
  2. `installModule` asignaba el grupo del manifiesto como texto plano estático no editable y renderizaba el botón de navegación del sidebar directamente en el primer grupo encontrado sin permitir reubicación ni alterar el orden.
  3. No existían selectores (`<select>`) en las tarjetas de módulos instalados para conmutar su grupo en caliente, ni controles de desplazamiento arriba/abajo (`moveGroupUp`, `moveGroupDown`) en la lista de grupos.
- **Solución Implementada**: 
  1. **Modelo de Estado y Persistencia Integral (`moduleGroupsState`)**:
     - Estructura con `groups: ['General', ...]` y mapa de asignaciones `moduleAssignments: { moduleId: groupName }`.
     - Persistencia sincrónica y asincrónica en disco mediante `localStorage` (`pcm_module_groups_state`) y el comando nativo Tauri `save_module_setting` (`moduleId: 'core_groups'`, `optionId: 'state'`).
     - Cumplimiento incondicional de la Regla 3: el grupo "General" es permanente e inborrable con insignia y candado de directiva del sistema. Al eliminar cualquier grupo personalizado, todos sus módulos se reasignan automáticamente a "General".
  2. **Reordenamiento Dinámico de Grupos (`moveGroupUp`, `moveGroupDown`)**:
     - Se dotó a cada tarjeta de grupo de botones con flechas SVG (`▲`, `▼`) para subir o bajar su posición en la jerarquía.
     - `renderSidebarGroups()` sincroniza físicamente el orden de los contenedores `.sidebar-group-box` en el menú lateral conforme al orden establecido en `moduleGroupsState.groups`.
  3. **Edición y Renombrado Inline de Grupos (`showRenameGroupInline`, `saveRenameGroupInline`)**:
     - Se integró un formulario de edición inline por grupo con validaciones de nombre no vacío y prevención de duplicados, actualizando en caliente el nombre del grupo en el sidebar y reasignando automáticamente los módulos dependientes.
  4. **Asignación Dinámica de Módulos a Grupos**:
     - En cada tarjeta de módulo instalado se incorporó un selector desplegable (`<select id="select-group-mod-${id}">`) que lista dinámicamente los grupos registrados y reubica el módulo de inmediato (`setModuleGroup`) en el sidebar y en el modelo persistido.
     - En cada tarjeta de la pestaña de grupos se muestran chips interactivos de los módulos asignados con un selector rápido para transferirlos directamente a cualquier otro grupo.
  5. **Sincronización en Arranque**:
     - Se cargó el estado en `DOMContentLoaded` con `await loadModuleGroupsState()`, invocando `renderSidebarGroups()`, `renderModuleGroupsManagerUI()` y `renderInstalledModulesGroupSelectors()`.
  6. **Sincronización y Compilación**:
     - Sincronizado en [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y verificado para compilación nativa del binario de escritorio.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-033] Corrección de Título Canónico y Opciones Dinámicas en Menú Contextual de Widgets y Regla de Botón de Configuración en Pantalla Principal de Módulos
- **Fecha**: 2026-09-16
- **Severidad**: `Media`
- **Componente**: `Dashboard / Widgets / Menú Contextual / Gobernanza de Módulos (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)`, [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)`)`
- **Descripción del Fallo**: 
  1. El menú contextual nativo al hacer clic derecho sobre un widget del Dashboard tomaba el texto de la insignia/chip descriptivo (ej: `"24H"`, `"LISTO"`, `"EN VIVO"`) en vez del nombre real del widget.
  2. Las opciones del menú contextual arrojaban errores de ejecución y no funcionaban: `autoOrganizeDashboardGrid` no existía (era `autoOrganizeDashboard`), `openDrawer('drawer-dashboard-custom')` no existía (era `toggleDrawer('catalog')`), y `toggleDashboardWidget` no existía (era `toggleWidgetVisibility`).
  3. Se mostraban opciones estáticas e inexistentes en widgets que no contaban con personalización (ej. "Personalizar Widgets" indiscriminadamente en el widget de reloj).
  4. Los módulos que añadían parámetros a Configuraciones carecían de una directiva obligatoria para proveer un botón directo de configuración en su propia pantalla principal (vista dedicada).
- **Causa Raíz**: 
  1. `openAppContextMenu` utilizaba `targets.gridCard.querySelector('.card-header span')`, seleccionando el primer elemento `span` dentro del encabezado que en la mayoría de widgets corresponde a insignias (`.card-badge` o `.card-chip`).
  2. Nombres de funciones desfasadas en los atributos `onclick` del HTML generado en el menú contextual respecto a la API real del Core.
  3. Ausencia de verificación condicional sobre las capacidades (`meta_options`, `views`) del módulo al que pertenece el widget.
  4. Falta de estandarización en las reglas de arquitectura y scaffolding sobre el acceso directo a la configuración desde la interfaz del módulo.
- **Solución Implementada**: 
  1. **Resolución Canónica del Nombre del Widget**:
     - Se indexa en caliente contra `installedModules` para recuperar el nombre exacto declarado en el manifiesto (`widget.name`). Si no se encuentra, se prioriza `h4` y se filtran expresamente elementos con clase `.card-badge` y `.card-chip`.
  2. **Opciones Dinámicas y Funcionales**:
     - Conexión con las funciones reales del Core: `autoOrganizeDashboard()`, `toggleDrawer('catalog')` y `toggleWidgetVisibility(cardId, false)`.
     - Si el widget o su módulo posee `meta_options`, se expone la opción "Configuración del Widget", llevando directo a `switchView('settings')` y `switchSettingsTab('mod-' + moduleId)`. Si no posee opciones configurables, se oculta limpiamente.
     - Si el módulo posee vista dedicada en el sidebar, se expone "Ir al Módulo" (`switchView('module-' + moduleId)`).
  3. **Regla de Arquitectura y Botón de Configuración en Módulos**:
     - Se incorporó la regla en [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md) (Regla 3, punto 7) y [`.agents/rules/core_modular_architecture.md`](file:///c:/Proyectos/pc_manager/.agents/rules/core_modular_architecture.md): si un módulo agrega opciones a Configuraciones, su pantalla principal debe incluir obligatoriamente un botón directo hacia su pestaña de configuración.
     - La barra superior del Core respalda automáticamente esta navegación inyectando el botón contextual de Configuración al visualizar el módulo.
     - Se actualizó el generador y la plantilla de `system-clock` en [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs) y se recompiló [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm).
  4. **Sincronización y Compilación**:
     - Sincronizado en [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y compilado el ejecutable nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)
  - [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm)
  - [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)
  - [`.agents/rules/core_modular_architecture.md`](file:///c:/Proyectos/pc_manager/.agents/rules/core_modular_architecture.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-034] Homogeneización de Comboboxes Material Expressive, Regla de Ajuste de Nombres en Sidebar a Una Sola Línea y Manual Integral del Sistema de Módulos
- **Fecha**: 2026-09-16
- **Severidad**: `Media`
- **Componente**: `UI / Componentes / Combobox / Sidebar / Documentación (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)`, [`docs/developer/MODULAR_SYSTEM_MANUAL.md`](file:///c:/Proyectos/pc_manager/docs/developer/MODULAR_SYSTEM_MANUAL.md)`)`
- **Descripción del Fallo**: 
  1. Los selectores tipo combobox en las opciones de grupos de módulos no respetaban la línea de diseño Material Expressive de la app, mostrando bordes y flechas nativas del navegador sin coherencia estética.
  2. Nombres largos de módulos o grupos en el menú lateral podían desbordar a múltiples líneas o alterar la simetría vertical del sidebar.
  3. Faltaba un manual integral y unificado de desarrollo de módulos que explicara la raíz de los módulos, almacenamiento en disco en Windows, proceso de empaquetado `.pcm`, APIs utilizables de la carcasa, reglas de interfaz y código de ejemplo completo.
- **Causa Raíz**: 
  1. La clase `.form-select` carecía de `appearance: none`, icono SVG de flecha integrado en background y variante compacta `.form-select-sm`, dependiendo de estilos inline ad-hoc.
  2. Los elementos `.nav-button span` y `.group-header span` no tenían aplicada la regla estricta de elipsis en una sola línea (`white-space: nowrap; text-overflow: ellipsis; overflow: hidden;`).
  3. Ausencia del documento maestro `MODULAR_SYSTEM_MANUAL.md` enfocado en desarrolladores de extensiones.
- **Solución Implementada**: 
  1. **Línea de Diseño Estricta para Comboboxes y Scrollbars**:
     - Se actualizó `.form-select` con `appearance: none`, flecha SVG semántica (`data:image/svg+xml`), padding dinámico, bordes sutiles y foco con anillo de acento primario.
     - Se creó `.form-select.form-select-sm` para selectores en tarjetas y listas de grupos, eliminando estilos inline toscos.
     - Se reforzó la compatibilidad estándar de scrollbars (`scrollbar-width: thin; scrollbar-color: var(--border-medium) transparent;`) en `html, *`.
  2. **Ajuste Estricto a Una Línea en Sidebar**:
     - Se aplicó `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` a `.nav-button span` y `.group-header span`.
     - Se formalizó la directiva en [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md) (Regla 6) y [`.agents/rules/ui_design_system.md`](file:///c:/Proyectos/pc_manager/.agents/rules/ui_design_system.md).
  3. **Manual Integral del Sistema de Módulos**:
     - Se redactó el documento exhaustivo [`docs/developer/MODULAR_SYSTEM_MANUAL.md`](file:///c:/Proyectos/pc_manager/docs/developer/MODULAR_SYSTEM_MANUAL.md) con arquitectura, raíz de almacenamiento en `%APPDATA%\pc_manager\modules\`, empaquetado `.pcm`, APIs de la carcasa (`ServiceRegistry`, EventBus, `meta_options`, cleanup, widgets), directivas de diseño y módulo de ejemplo completo (`memory-monitor`).
  4. **Sincronización y Compilación**:
     - Sincronizado en [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y compilado el ejecutable nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)
  - [`.agents/rules/ui_design_system.md`](file:///c:/Proyectos/pc_manager/.agents/rules/ui_design_system.md)
  - [`docs/developer/MODULAR_SYSTEM_MANUAL.md`](file:///c:/Proyectos/pc_manager/docs/developer/MODULAR_SYSTEM_MANUAL.md)
  - [`docs/developer/core_developer_guide.md`](file:///c:/Proyectos/pc_manager/docs/developer/core_developer_guide.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-035] Pérdida de Perfiles y Coordenadas de Widgets al Actualizar Módulos y Disposición Apretada de Tarjetas en Configuración General
- **Fecha**: 2026-09-16
- **Severidad**: `Alta`
- **Componente**: `Perfiles de Dashboard / Pipeline de Actualización de Módulos / Disposición de Configuraciones (`[`src-tauri/src/module_manager.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/module_manager.rs)`, [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. Al actualizar un paquete de módulo (`.pcm`), las tarjetas del módulo desaparecían o se ocultaban del Dashboard, y los perfiles de widgets perdían sus coordenadas o volvían al estado predeterminado.
  2. En la vista de Configuraciones Generales, las tarjetas de opciones se mostraban estrechas y comprimidas en una sola fila horizontal en lugar de ocupar el espacio de manera organizada en su cuadrícula habitual de dos columnas.
- **Causa Raíz**: 
  1. En `installModule()`, cuando `isUpdate` era verdadero (actualización de un módulo existente), el sistema eliminaba las tarjetas anteriores y forzaba las nuevas con `style.display = 'none'`, agregándolas forzadamente a `hiddenWidgets`.
  2. En `restoreDashboardLayout()`, se recreaba `current.layout = verifiedLayout` usando únicamente las tarjetas visibles en ese momento, eliminando de forma destructiva las coordenadas guardadas de cualquier widget que se encontrara oculto en ese perfil.
  3. En `persistDashboardProfilesState()`, se ejecutaban tres llamadas asíncronas paralelas a Tauri Rust (`profiles_state`, `layout`, `hidden_widgets`). En el backend de Rust (`module_manager.rs`), la lectura y escritura de `registry.json` carecía de exclusión mutua (`Mutex`), provocando que los hilos concurrentes del runtime sobrescribieran el archivo con lecturas obsoletas y truncaran `profiles_state`.
  4. En `switchSettingsTab('general')`, se asignaba inline `generalPane.style.display = 'flex'`, lo que anulaba la regla de cuadrícula de 2 columnas de `.settings-content-stack` (`display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));`), apretando las cuatro tarjetas como flex items en un único renglón.
- **Solución Implementada**: 
  1. **Exclusión Mutua Atómica en Backend Rust (`REGISTRY_MUTEX`)**:
     - Se implementó `static REGISTRY_MUTEX: Mutex<()>` en [`src-tauri/src/module_manager.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/module_manager.rs).
     - Todas las funciones de mutación (`set_module_setting`, `set_module_active`, `install_package_bytes`, `uninstall_package`, `set_dashboard_order`) adquieren el cerrojo durante todo el ciclo de lectura, mutación y guardado en disco, impidiendo condiciones de carrera.
  2. **Persistencia No Destructiva de Coordenadas de Widgets Ocultos**:
     - En `restoreDashboardLayout()`, `verifiedLayout` se inicializa clonando el layout previo (`Object.assign({}, current.layout || {})`), actualizando solo las coordenadas de las tarjetas visibles sin perder las coordenadas de las tarjetas ocultas.
  3. **Integridad de Visibilidad en Actualizaciones de Módulos**:
     - En `installModule()`, la condición `if (!isUpdate && !isStartup)` garantiza que si un módulo ya estaba instalado y activo, sus widgets no se fuercen a ocultos ni se añadan a `hiddenWidgets`.
     - En `handlePcmPackage()`, tras procesar el paquete se ejecutan de inmediato `restoreDashboardLayout()` y `renderDashboardCustomizationCatalog()`, manteniendo las tarjetas visibles y en sus posiciones.
  4. **Recuperación y Sincronización de Doble Capa en `loadDashboardProfiles()`**:
     - Se implementó una rutina de fusión segura entre el almacenamiento de disco de Windows (`registry.json`) y `localStorage`, recuperando perfiles creados por el usuario ante cualquier inconsistencia.
     - `persistDashboardProfilesState()` ahora persiste atómicamente la clave maestra `profiles_state` de manera limpia y secuencial.
  5. **Restauración de Cuadrícula en Configuración General**:
     - En `switchSettingsTab()`, se cambió `generalPane.style.display = ''` (y para los paneles dinámicos), permitiendo que la clase CSS `.settings-content-stack` aplique su cuadrícula de 2 columnas (`repeat(2, minmax(0, 1fr))`), espaciosa, balanceada y responsiva.
  6. **Sincronización y Compilación**:
     - Se sincronizó [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y se recompiló el binario nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`src-tauri/src/module_manager.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/module_manager.rs)
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-036] Deformación Horizontal de Insignias Numéricas (Badges) y Truncamiento Indebido de "Gestor de Módulos" en el Menú Lateral
- **Fecha**: 2026-09-16
- **Severidad**: `Media`
- **Componente**: `Sidebar / Navigation Layout / UI Design System (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. En el menú lateral (Sidebar), las insignias numéricas (`.nav-badge`) de los botones "Dashboard" y "Gestor de Módulos" se estiraban de manera desproporcionada hacia la derecha, adoptando una forma de barra horizontal vacía.
  2. Debido al espacio excesivo consumido por el badge estirado, el texto del botón canónico "Gestor de Módulos" quedaba comprimido y se truncaba toscamente como `"Gestor de..."`.
- **Causa Raíz**: 
  La regla CSS `.nav-button span` aplicada para obligar al nombre a ajustarse en una sola línea con elipsis (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;`) seleccionaba indiscriminadamente a todos los `span` hijos del botón. Dado que las insignias numéricas se declaran como `<span class="nav-badge">`, el badge recibió también `flex: 1`, forzándolo a crecer y ocupar el 50% del ancho del botón como flex item, dejando sin espacio al texto descriptivo.
- **Solución Implementada**: 
  1. **Ajuste Específico del Selector de Texto**: Se cambió el selector a `.nav-button > span:not(.nav-badge)`, asegurando que únicamente el rótulo del botón reciba `flex: 1`, `min-width: 0` y la propiedad de elipsis.
  2. **Insignia Fija No Deformable**: Se configuró explícitamente `.nav-badge` con `flex: 0 0 auto; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; line-height: 1.2;`. La insignia conserva su tamaño compacto de píldora ajustada al dígito, y "Gestor de Módulos" recupera todo el ancho útil del sidebar, mostrándose completo y nítido.
  3. **Sincronización y Compilación**: Se sincronizó [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y se recompiló el ejecutable nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-037] Sustitución de Selectores Nativos HTML por Comboboxes Personalizados Material Expressive en Gestión de Grupos y Opciones de Módulos
- **Fecha**: 2026-09-16
- **Severidad**: `Media`
- **Componente**: `UI Design System / Material Expressive / Combobox Components (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  1. En el Gestor de Módulos (pestaña Grupos), el selector de reasignación de grupo en las píldoras de cada módulo (`.group-module-pill`) utilizaba un elemento `<select>` nativo de HTML. Al desplegarlo en Windows / WebView2, se abría un menú emergente tosco, gris y plano del sistema operativo, desentonando por completo con la línea de diseño Material Expressive de la aplicación.
  2. En las tarjetas de módulos instalados (`#installed-modules-list`), el selector desplegable de asignación de grupo también empleaba un elemento `<select>` nativo.
  3. En las opciones de configuración de módulos declaradas con `type: 'select'` dentro de `meta_options`, se utilizaba de igual manera un elemento `<select class="form-select">` nativo.
- **Causa Raíz**: 
  A pesar de contar con estilos CSS para `.form-select`, los elementos `<select>` en WebView2 renderizan el popup desplegable del sistema operativo Windows sin capacidad de personalización temática, transparencia de fondo ni iconografía vectorial. La arquitectura contaba con el componente canónico `.custom-combobox` para selectores del sistema (temas, presets, perfiles), pero no se había implementado una variante compacta (`.custom-combobox.combobox-sm`) para su uso en píldoras, tarjetas y opciones dinámicas.
- **Solución Implementada**: 
  1. **Componente `.custom-combobox.combobox-sm`**:
     - Se crearon los estilos de combobox compacto con altura de 24px, padding proporcionado, rotación fluida de flecha chevron SVG, borde semántico interactivo, foco con anillo de acento primario y dropdown flotante con `backdrop-filter: blur(16px)`, sombras de elevación y checkmarks SVG para la opción seleccionada.
  2. **Reemplazo en Gestor de Grupos (`renderModuleGroupsManagerUI`)**:
     - Las píldoras `.group-module-pill` ahora integran un `.custom-combobox.combobox-sm`, invocando `toggleCombobox` y actualizando el grupo mediante `setModuleGroup` de forma totalmente armónica con el tema activo.
  3. **Reemplazo en Módulos Instalados (`installModule` y `renderInstalledModulesGroupSelectors`)**:
     - Se sustituyó el select nativo en las tarjetas de módulos instalados por `.custom-combobox.combobox-sm`, sincronizando en caliente el valor y las opciones dinámicas sin elementos nativos.
  4. **Reemplazo en `meta_options` (`opt.type === 'select'`)**:
     - Se migró el renderizado de opciones select de extensiones a `.custom-combobox`, añadiendo el manejador reactivo `selectModuleOptionCombo` y actualizando `dispatchModuleSetting` para sincronizar automáticamente el texto y la clase seleccionada tanto en eventos de usuario como en carga inicial.
  5. **Erradicación Total de `<select>` Nativos**:
     - La aplicación eliminó el 100% de los elementos `<select>` nativos, garantizando homogeneidad visual y cumplimiento estricto de la Regla 6.
  6. **Sincronización y Compilación**:
     - Sincronizado en [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y compilado el binario nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
- **Estado**: `RESUELTO`

---

### [BUG-038] Corrección de Centrado y Geometría en Switches Toggle, Erradicación de Spam de Notificaciones en Arranque e Integración de Notificaciones Nativas de Windows con Tauri Plugin
- **Fecha**: 2026-09-16
- **Severidad**: `Alta`
- **Componente**: `UI Design System / Switches / Notification System / Windows Toast Notifications (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs)`, [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml)`, [`src-tauri/capabilities/default.json`](file:///c:/Proyectos/pc_manager/src-tauri/capabilities/default.json)`)`
- **Descripción del Fallo**: 
  1. **Descuadre en interruptores (Switches)**: El botón toggle presentaba su círculo interior (thumb blanco) visualmente caído hacia el borde inferior y asimétrico horizontalmente (3px de margen izquierdo en reposo vs 5px de margen derecho al activarse).
  2. **Spam de notificaciones en arranque**: Cada vez que se abría la aplicación, se emitían notificaciones de "Módulo Instalado" por cada extensión persistida, violentando la política anti-ruido de la Regla 6.
  3. **Inoperancia al desactivar notificaciones de sistema**: Al desactivar notificaciones de sistema o módulos, la configuración no se leía a tiempo durante el arranque ya que se cargaba después de restaurar los módulos desde disco.
  4. **Fallo en notificaciones de Windows**: Al habilitar la opción de notificaciones hacia Windows, no llegaban al Centro de Actividades porque se utilizaba la Web Notification API del navegador (`new Notification`), la cual es suprimida/bloqueada en entornos de escritorio nativo Windows con WebView2.
- **Causa Raíz**: 
  1. En CSS, `.switch` tenía un ancho de 44px y `.slider:before` utilizaba `bottom: 3px; left: 3px; transform: translateX(18px);` sin centrado vertical porcentual, lo que en WebView2 causaba caída por redondeo de subpíxeles y un desfase de 2px respecto al margen derecho en estado activo (`42px - 37px = 5px`).
  2. En `installModule`, la emisión de notificaciones de instalación no verificaba el parámetro `isStartup`, disparándose de manera redundante en cada inicio de la app.
  3. En `DOMContentLoaded`, la restauración de preferencias de notificación se ejecutaba al final en lugar de antes de montar los módulos, y no contaba con sincronización bidireccional local inmediata.
  4. En Windows nativo de escritorio, las notificaciones del Centro de Actividades requieren el uso del subsistema WinRT Toast del sistema operativo mediante Tauri IPC y no la API web del DOM.
- **Solución Implementada**: 
  1. **Geometría y Centrado Exacto de Switches**:
     - Se rediseñó el CSS de `.switch` a 42px de ancho y 24px de alto.
     - Se aplicó centrado vertical exacto al thumb con `top: 50%; transform: translateY(-50%)` y `left: 3px`.
     - En estado `:checked`, se traslada exactamente a `transform: translate(18px, -50%)`, obteniendo 3px de separación simétrica tanto en reposo como activo en todos los lados, con sombra de elevación Material suave (`box-shadow: 0 1px 3px rgba(0,0,0,0.25)`).
  2. **Erradicación de Notificaciones en Arranque**:
     - Se envolvió la emisión de avisos en `installModule` con `if (!isStartup)`, erradicando por completo los avisos al arrancar el programa.
  3. **Carga y Persistencia de Notificaciones**:
     - Se implementó la función asíncrona `loadNotificationSettings()`, invocada al principio de `DOMContentLoaded` antes de restaurar módulos.
     - Se añadió sincronización inmediata con `localStorage` y `save_module_setting` en Rust, actualizando también la opacidad y accesibilidad de los eventos granulares al apagar el interruptor maestro.
  4. **Notificaciones Nativas de Windows 10/11 con Tauri Plugin**:
     - Se incorporó `tauri-plugin-notification = "2.4.0"` y su capacidad en `src-tauri/capabilities/default.json`.
     - Se implementó el comando de Rust `show_windows_notification` en `src-tauri/src/lib.rs` conectado a `app.notification().builder()`.
     - En JavaScript, `dispatchWindowsNativeNotification` invoca dicho comando nativo por IPC, enviando alertas reales al Centro de Actividades de Windows con sonido y persistencia nativa.
  5. **Sincronización y Compilación**:
     - Se replicaron las mejoras en [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) y se compiló el binario nativo [`pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe).
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs)
  - [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml)
  - [`src-tauri/capabilities/default.json`](file:///c:/Proyectos/pc_manager/src-tauri/capabilities/default.json)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
  - [`src-tauri/target/debug/pc_manager.exe`](file:///c:/Proyectos/pc_manager/src-tauri/target/debug/pc_manager.exe)
---

### [BUG-039] Regresión Dimensional en Tarjetas de Configuración y Widgets, y Formalización de la Regla 11 de No Regresiones
- **Fecha**: 2026-09-16
- **Severidad**: `Alta`
- **Componente**: `UI / Settings / Dashboard Grid / Normativa (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)`, [`.agents/rules/preservation_of_working_features.md`](file:///c:/Proyectos/pc_manager/.agents/rules/preservation_of_working_features.md)`)`
- **Descripción del Fallo**: 
  1. Las tarjetas de la sección de Configuraciones se apreciaban reducidas, comprimidas y apretadas en comparación con el día anterior, apiñando interruptores, comboboxes y textos largos.
  2. La cuadrícula de widgets del Dashboard presentaba una altura base de fila incrementada (`110px` en lugar de los `90px` canónicos aprobados del día anterior), alterando las proporciones compactas originales de las tarjetas `2x1` y `2x2`.
  3. Necesidad obligatoria de blindar el proyecto contra regresiones de funciones o interfaces que ya operan adecuadamente.
- **Causa Raíz**: 
  1. En commits anteriores se reestructuró la clase `.settings-content-stack` a una cuadrícula CSS de dos columnas (`repeat(2, minmax(0, 1fr))`), dividiendo el ancho disponible al 50% y reduciendo a la mitad el espacio horizontal de todas las tarjetas de configuración (General, Windows, Temas y módulos dinámicos). En el diseño canónico original del día anterior, dichas tarjetas se disponían en una pila vertical de ancho completo (`100% flex column`), garantizando holgura y simetría.
  2. Se había alterado `grid-auto-rows: 90px;` a `110px;` junto con `min-height: 110px;` y `stepY = 110 + gap;` en el algoritmo de arrastre, descalibrando la altura base original con la que se concibieron los widgets `2x1` y `2x2`.
- **Solución Implementada**: 
  1. **Restauración de Configuraciones al Ancho Completo (100%)**:
     - Se restableció `.settings-content-stack` a `display: flex; flex-direction: column; gap: 20px; width: 100%;` en [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) y [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html), erradicando la compresión de dos columnas y devolviendo a cada tarjeta su amplitud ergonómica completa del día anterior.
  2. **Restauración de Dimensiones del Dashboard**:
     - Se restituyó `grid-auto-rows: 90px;` en `.grid-board`.
     - Se restituyó `min-height: 90px;` en el indicador de drop `.grid-drop-indicator`.
     - Se calibró el paso de arrastre en JavaScript a `const stepY = 90 + gap;`.
  3. **Formalización de la Regla 11 en [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md) y [`.agents/rules/preservation_of_working_features.md`](file:///c:/Proyectos/pc_manager/.agents/rules/preservation_of_working_features.md)**:
     - Se decretó la **Regla 11: Preservación de Funciones e Interfaces Operativas (Prohibición Estricta de Regresiones)**: prohíbe terminantemente degradar o romper lo que ya funciona, imponiendo que si un cambio exige intervenir componentes existentes, este debe justificarse técnicamente, documentarse exhaustivamente en la bitácora y validarse sin efectos colaterales.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)
  - [`.agents/rules/preservation_of_working_features.md`](file:///c:/Proyectos/pc_manager/.agents/rules/preservation_of_working_features.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-040] Tarjetas del Dashboard se Descuadran al Maximizar la Ventana (Salto de 6 a 10 Columnas)
- **Fecha**: 2026-09-16
- **Severidad**: `Alta`
- **Componente**: `UI / Dashboard Grid Layout ([`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html), [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html), [`index.html`](file:///c:/Proyectos/pc_manager/index.html))`
- **Descripción del Fallo**: 
  1. Al iniciar la aplicación en ventana no maximizada (~1180px de ancho), las 3 tarjetas del Dashboard (Temporizador 2×2, Cronómetro 2×2, Reloj del Sistema 2×1) se visualizaban correctamente llenando el 100% del ancho de la fila (33.3% cada una).
  2. Al maximizar la ventana (>1400px en un monitor 1080p), la cuadrícula saltaba abruptamente de **6 a 10 columnas**. Las tarjetas de `span 2` pasaban de ocupar 2/6 (33%) a 2/10 (20%) del ancho, encogiendo cada tarjeta un 40%.
  3. Quedaba un vacío de 40% en el lado derecho (columnas 7-10 sin contenido).
  4. En la tarjeta `Reloj del Sistema` (2×1), el texto `11:35:50 AM` con la insignia `EN VIVO` no cabía en el ancho reducido, provocando que `AM` saltara a una segunda línea y ambos elementos (`AM` y `EN VIVO`) se recortaran por overflow hidden en la altura fija de 90px.
- **Causa Raíz**: 
  1. La cuadrícula base `.grid-board` estaba definida con `grid-template-columns: repeat(10, minmax(0, 1fr))` para >1400px, mientras el `@media (max-width: 1400px)` la reducía a 6 columnas. Este salto discontinuo de 6→10 columnas al cruzar el umbral de 1400px era incompatible con tarjetas diseñadas para una cuadrícula de 6 columnas.
  2. La función JavaScript `getGridCols()` replicaba la misma lógica: retornaba 10 para >1400px, causando que el algoritmo de posicionamiento y arrastre usara 10 columnas mientras las tarjetas solo tenían `span 2`.
  3. La altura base de fila era 90px (`grid-auto-rows: 90px`), demasiado ajustada para el contenido con la nueva anchura.
- **Solución Implementada**: 
  1. **Unificación a 6 columnas canónicas para escritorio estándar**: Se cambió la cuadrícula base de `repeat(10, ...)` a `repeat(6, minmax(0, 1fr))` en `.grid-board`. Esto garantiza que 3 tarjetas de `span 2` ocupen 100% del ancho tanto en ventana normal como maximizada.
  2. **`getGridCols()` simplificado**: Retorna 6 para todas las resoluciones de escritorio (>1080px), eliminando el salto discontinuo a 10 columnas.
  3. **Altura de fila incrementada a 110px**: Se actualizó `grid-auto-rows` de 90px a 110px para dar más espacio vertical al contenido de las tarjetas, especialmente las de tipo `2×1`. Se sincronizó el `stepY` del drag & drop (`110 + gap`) y el `min-height` del indicador de drop.
  4. **Media query `@media (max-width: 1400px)` simplificada**: Ya no necesita redefinir el grid-template-columns (es 6 por defecto), solo ajusta el gap y los spans de tarjetas extra-anchas.
  5. **Sincronización en los 3 archivos**: `ui/index.html`, `core_shell.html` e `index.html` (mockup raíz).
- **Justificación de Modificación de Componente Preexistente (Regla 11)**:
  El cambio de `grid-auto-rows` de 90px a 110px es una modificación intencional y necesaria. Con 6 columnas canónicas, las tarjetas `2×1` reciben mayor ancho (~33% vs. 20%), y la altura de 90px resultaba demasiado comprimida para el contenido visible (reloj + badge). Se verificó que los widgets `2×2` (Temporizador, Cronómetro) mantienen sus proporciones armónicas con 110px × 2 + gap = 234px de alto.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`index.html`](file:///c:/Proyectos/pc_manager/index.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-041] Corrección de Estiramiento Excesivo de Tarjetas: Restauración de Cuadrícula 10x10 Canónica y Protección Dimensional en 2x1
- **Fecha**: 2026-09-16
- **Severidad**: `Alta`
- **Componente**: `UI / Dashboard Grid / Developer Manual Specs (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`index.html`](file:///c:/Proyectos/pc_manager/index.html)`, [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md)`, [`docs/developer/MODULAR_SYSTEM_MANUAL.md`](file:///c:/Proyectos/pc_manager/docs/developer/MODULAR_SYSTEM_MANUAL.md)`)`
- **Descripción del Fallo**: 
  1. En la solución temporal previa de BUG-040, se redujo la cuadrícula general a 6 columnas fijas. Esto provocó que en monitores de escritorio estándar y pantallas maximizadas (1920×1080), las tarjetas de tamaño `2×1` y `2×2` abarcaran cada una el 33.3% del ancho total (~550px por tarjeta), estirándose excesivamente hasta cubrir todo el espacio de manera desproporcionada y violando la norma canónica estipulada en la sección 3.6 del [`MODULAR_SYSTEM_MANUAL.md`](file:///c:/Proyectos/pc_manager/docs/developer/MODULAR_SYSTEM_MANUAL.md) ("Dashboard 10×10").
  2. En tarjetas `2×1` (como `Reloj del Sistema`), al mantener la altura base de 90px con padding estándar (16px) y margen de cabecera de 12px, el contenido métrico junto a badges e indicadores se recortaba verticalmente por `overflow: hidden`.
- **Causa Raíz**: 
  1. Forzar 6 columnas canónicas en pantallas amplias (>1400px) en lugar de respetar la cuadrícula base de 10 columnas del sistema modular.
  2. Falta de calibración ergonómica específica para tarjetas de una sola fila (`card-size-2x1` y `card-size-1x1`), requiriendo padding compacto (12px) y márgenes de cabecera proporcionados (6px) para garantizar visibilidad al 100% (Regla 7).
- **Solución Implementada**: 
  1. **Restauración de la Cuadrícula Canónica de 10 Columnas**:
     - Se restituyó `repeat(10, minmax(0, 1fr))` en `.grid-board` para resoluciones amplias (>1400px), asegurando proporciones estéticas óptimas (~310-320px para tarjetas `2x1` y `2x2`).
     - Se conservó la adaptabilidad fluida responsiva a 6 columnas para ventanas intermedias/no maximizadas (`@media (max-width: 1400px)`) y 4 columnas para compactas (`@media (max-width: 1080px)`).
     - Se calibró `getGridCols()` en JS para retornar 10 (>1400px), 6 (<=1400px) y 4 (<=1080px).
     - Se restituyó la altura canónica de fila a 90px con `stepY = 90 + gap`.
  2. **Calibración Dimensional Ergonómica en `card-size-2x1` y `card-size-1x1`**:
     - Se aplicó padding compacto (`12px 16px` en `2x1` y `12px 14px` en `1x1`) y margen inferior de cabecera reducido (`6px`).
     - Se ajustó la tipografía de valor métrico en `2x1` a `font-size: 20px` con `white-space: nowrap; font-variant-numeric: tabular-nums;`, garantizando que hora, segundos, AM/PM e insignias no se quiebren en múltiples líneas ni se recorten.
  3. **Sincronización Total en Mockups y Módulos**:
     - Modificaciones reflejadas fielmente en [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html), [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html), [`index.html`](file:///c:/Proyectos/pc_manager/index.html), [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs) y [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md).
- **Justificación de Modificación de Componente Preexistente (Regla 11)**:
  La readecuación a 10 columnas y el ajuste de padding en `2x1` son estrictamente indispensables para cumplir con la especificación de diseño §3.6 del manual modular y evitar el sobre-estiramiento en pantalla completa, protegiendo al 100% la legibilidad y proporciones de todos los widgets.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`index.html`](file:///c:/Proyectos/pc_manager/index.html)
  - [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md)
  - [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-042] Transición a Alpha 0.0.3: Centrado Vertical Ergonómico en Tarjetas 2×1, Clarificación de Política Anti-Spam e Historial de Notificaciones en Configuraciones
- **Fecha**: 2026-09-16
- **Severidad**: `Media`
- **Componente**: `UI / Settings / Notifications / Card Layout (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`, [`index.html`](file:///c:/Proyectos/pc_manager/index.html)`, [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)`, [`package.json`](file:///c:/Proyectos/pc_manager/package.json)`, [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml)`, [`src-tauri/tauri.conf.json`](file:///c:/Proyectos/pc_manager/src-tauri/tauri.conf.json)`, [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs)`, [`docs/ai/MODULAR_SYSTEM_AI_SPEC.md`](file:///c:/Proyectos/pc_manager/docs/ai/MODULAR_SYSTEM_AI_SPEC.md)`)`
- **Descripción del Fallo**: 
  1. En las tarjetas compactas `2×1` (como `Reloj del Sistema`), los elementos quedaban visualmente apretados y pegados contra el borde inferior de la tarjeta, debido a una desproporción entre la altura de la cabecera (icono de 28px) y el padding vertical, dejando la fecha pegada a la curvatura inferior.
  2. La regla contra spam de notificaciones en arranque fue interpretada con excesiva rigidez, prohibiendo cualquier aviso al inicio. El usuario clarificó que lo prohibido es el bucle repetitivo de "módulo instalado" cada vez que se abre la app y se restauran módulos desde disco, mientras que las notificaciones legítimas de instalación manual, alertas de sistema o eventos reales de servicios sí deben emitirse.
  3. No existía un registro persistente ni vista de Historial de Notificaciones en la sección de Configuraciones.
- **Causa Raíz**: 
  1. Espaciado interno no calibrado para tarjetas de una sola fila (`2x1`), donde la cabecera y el cuerpo carecían de márgenes compactos proporcionales.
  2. Falta de distinción conceptual en la especificación entre la restauración rutinaria de módulos en arranque y los eventos legítimos de notificación.
  3. El Centro de Notificaciones solo existía como un panel lateral temporal (drawer) en memoria DOM, sin historial persistente auditable en Configuraciones.
- **Solución Implementada**: 
  1. **Subida de Versión a Alpha 0.0.3**:
     - Incrementada la versión a `0.0.3-alpha` en `package.json`, `Cargo.toml`, `tauri.conf.json`, `src/lib.rs`, `ui/index.html`, `core_shell.html` y documentación técnica.
  2. **Calibración Ergonómica Vertical de Tarjetas 2×1 y 1×1**:
     - Reducido el padding vertical a `10px 14px` y el icono de cabecera a `22px` con `margin-bottom: 4px`.
     - Centrado vertical simétrico con `justify-content: center; gap: 2px;` y métricas proporcionales (19px), garantizando ~15px de holgura limpia y simétrica tanto arriba como abajo del texto de fecha.
  3. **Clarificación Formal de la Política Anti-Spam (docs/ai/MODULAR_SYSTEM_AI_SPEC.md)**:
     - Clarificado que las alertas de instalación manual, eventos de sistema, alertas de salud de servicios y notificaciones intencionadas de módulos sí son legítimas, prohibiendo únicamente la re-emisión redundante de módulos restaurados desde disco en el arranque.
  4. **Historial Persistente de Notificaciones en Configuraciones**:
     - Se incorporó la tarjeta `Historial de Notificaciones` en `Configuraciones -> General` ([`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) y [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)).
     - Persistencia estructurada en `localStorage` (`pcm_notification_history`).
     - Filtros interactivos en tiempo real por término de búsqueda y por categoría (Todas, Sistema, Módulos, Perfiles).
     - Acciones de "Marcar Leídas" y "Limpiar Historial", sincronizadas en tiempo real con el drawer lateral.
- **Justificación de Modificación de Componente Preexistente (Regla 11)**:
  El ajuste de espaciado en tarjetas 2x1 y la adición del historial en configuraciones enriquecen la ergonomía visual y la observabilidad del sistema sin alterar ninguna función previa ni causar regresiones en otros componentes.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`index.html`](file:///c:/Proyectos/pc_manager/index.html)
  - [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)
  - [`package.json`](file:///c:/Proyectos/pc_manager/package.json)
  - [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml)
  - [`src-tauri/tauri.conf.json`](file:///c:/Proyectos/pc_manager/src-tauri/tauri.conf.json)
  - [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs)
  - [`docs/ai/core_ai_spec.md`](file:///c:/Proyectos/pc_manager/docs/ai/core_ai_spec.md)
  - [`docs/ai/MODULAR_SYSTEM_AI_SPEC.md`](file:///c:/Proyectos/pc_manager/docs/ai/MODULAR_SYSTEM_AI_SPEC.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-044] Calibración de Anclaje a la Última Fila Visible del Lienzo en Dashboard Drag & Drop
- **Fecha**: 2026-09-16
- **Severidad**: `Media`
- **Componente**: `UI / Dashboard Drag & Drop (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)`)`
- **Descripción del Fallo**: 
  Al arrastrar widgets hacia el fondo del lienzo, las tarjetas se bloqueaban una fila por encima del borde inferior, impidiendo ocupar el espacio de la última fila disponible dentro del contenedor visual del lienzo.
- **Causa Raíz**: 
  El cálculo de `visibleRowsInViewport` utilizaba `Math.floor` estricto sin tolerancia de paso, truncando filas que cabían físicamente; sumado a que al arrastrar desde el centro o parte inferior de la tarjeta (`grabOffsetY`), `relY` no alcanzaba el umbral de redondeo hacia la última fila física al aproximarse al fondo.
- **Solución Implementada**: 
  1. Se calibró `visibleRowsInViewport` con tolerancia de medio paso (`+ stepY * 0.5`), reconociendo la última fila física disponible en el contenedor.
  2. Se añadió detección de proximidad al borde inferior (`moveEvent.clientY >= boardRect.bottom - padTop - 20`), permitiendo el snapping directo a `maxAllowedRow` cuando el usuario arrastra hasta la base del lienzo.
  3. Cero modificaciones dimensionales ni estiramientos artificiales del lienzo.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-045] Transición Integral de Cuadrícula Teórica "10x10" a Arquitectura de Celdas Modular Tile Grid (Auto-Fill)
- **Fecha**: 2026-09-16
- **Severidad**: `Alta`
- **Componente**: `UI / Dashboard / Grid Layout & Drag and Drop (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, Documentación y Especificaciones)`
- **Descripción del Fallo**: 
  El concepto rígido y teórico de "10x10" columnas fijas provocaba una discordancia geométrica insalvable en pantallas intermedias, monitores verticales o ventanas no maximizadas: al dividir el lienzo en 10 columnas forzadas (~70-80px cada una), colisionaba con los `min-width` físicos de las tarjetas (`220px`), provocando que el navegador estirara asimétricamente las columnas ocupadas y aplastara las columnas vacías. Esto desincronizaba el cálculo de columnas en JavaScript (`stepX`) respecto a las columnas físicas reales del DOM, generando saltos imprecisos y anomalías al soltar las tarjetas en los bordes.
- **Causa Raíz**: 
  1. Uso de `repeat(10, minmax(0, 1fr))` y media queries arbitrarias que alteraban bruscamente el conteo de columnas.
  2. `getGridCols()` utilizaba puntos de corte de ancho de ventana (`window.innerWidth`) desacoplados de la cuadrícula real computada en el contenedor.
  3. Tamaño y espaciado de tarjetas no alineados con un sistema de celdas atómicas e invariables.
- **Solución Implementada**: 
  1. **Modular Tile Grid Nativo**: Se migró la cuadrícula del Dashboard a `grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));` y `grid-auto-rows: 90px; gap: 14px;`, estableciendo una celda elemental base de ~130x90px.
  2. **Dimensionamiento Limpio de Tarjetas**: Las clases `.card-size-*` aplican `grid-column: span N` y `grid-row: span M` con `min-width: 0`, permitiendo que las tarjetas ocupen múltiplos enteros exactos de celdas sin deformarse jamás (~274px para 2x1 en cualquier pantalla o resolución).
  3. **Sincronización Dinámica del DOM**: `getGridCols()` ahora lee directamente las columnas computadas por el navegador (`window.getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length`), asegurando precisión matemática milimétrica al arrastrar.
  4. **Snapping Ergonómico a Bordes**: Se implementó acoplamiento asistido tanto al borde derecho (`gridCols - effSpanCol + 1`) como al borde inferior (`maxAllowedRow`) ante proximidad del puntero.
  5. **Actualización Integral de Documentación**: Se sincronizaron la especificación maestra, manual de desarrollador, especificaciones para IA y manual de usuario.
  6. **Exclusión Estricta de Maquetas**: Las maquetas de prototipado (`core_shell.html` e `index.html`) fueron preservadas intactas y excluidas de la operación según directiva explícita del usuario.
- **Justificación de Modificación de Componente Preexistente (Regla 11)**:
  La transición a la cuadrícula modular de celdas resuelve de forma definitiva la física del Dashboard en cualquier relación de aspecto o resolución de pantalla sin romper ninguna funcionalidad previa, garantizando un arrastre fluido, predecible y estéticamente superior.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)
  - [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm)
  - [`docs/developer/MODULAR_SYSTEM_MANUAL.md`](file:///c:/Proyectos/pc_manager/docs/developer/MODULAR_SYSTEM_MANUAL.md)
  - [`PROJECT_SPECIFICATION.md`](file:///c:/Proyectos/pc_manager/PROJECT_SPECIFICATION.md)
  - [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md)
  - [`docs/ai/MODULAR_SYSTEM_AI_SPEC.md`](file:///c:/Proyectos/pc_manager/docs/ai/MODULAR_SYSTEM_AI_SPEC.md)
  - [`docs/ai/core_ai_spec.md`](file:///c:/Proyectos/pc_manager/docs/ai/core_ai_spec.md)
  - [`docs/user/core_user_manual.md`](file:///c:/Proyectos/pc_manager/docs/user/core_user_manual.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-046] Cuadrícula Isométrica Pura (70x70), Totalizadores Unitarios (1x1) y Acotamiento Estricto de Lienzo (Cero Estiramiento Vertical)
- **Fecha**: 2026-09-16
- **Severidad**: `Alta`
- **Componente**: `UI / Dashboard / Grid Layout & Drag and Drop (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, Documentación y Especificaciones)`
- **Descripción del Fallo**: 
  1. **Asimetría de Arrastre**: Al arrastrar widgets en horizontal, se desplazaban en pasos equivalentes a la mitad de su propio ancho (desfase visual intermedio), mientras que en vertical se desplazaban por alturas completas.
  2. **Estiramiento Vertical Indeseado y Scrollbar de ~70px**: Al desplazar cualquier widget hacia el fondo de la pantalla, el motor de arrastre permitía posicionarlo en una fila que excedía la altura física del contenedor, forzando un estiramiento vertical del lienzo y la aparición de una barra de desplazamiento residual de media celda.
- **Causa Raíz**: 
  1. Uso de celdas rectangulares asimétricas (130px ancho × 90px alto) combinadas con widgets de 2 columnas de ancho.
  2. El cálculo de filas permitidas (`maxAllowedRow`) incorporaba tolerancias heurísticas (`+ stepY * 0.5` y `maxOccupiedRow + 1`) que habilitaban filas fuera del área visible, sumado a que `.grid-board` y `#view-dashboard` poseían `overflow-y: auto;` permitiendo el crecimiento hacia abajo.
- **Solución Implementada**: 
  1. **Cuadrícula Isométrica Pura (1:1)**: Se redefinió la cuadrícula a celdas cuadradas de `70px × 70px` con `gap: 12px;`. El paso de arrastre en $X$ y en $Y$ es ahora idéntico e uniforme ($\Delta X = \Delta Y \approx 82\text{px}$).
  2. **Widget Totalizador Unitario (1x1)**: Se formalizó el tamaño `1x1` (70×70px) para totalizadores, micro-métricas y chips de estado esenciales (ej. nuevo widget `Segundero` en tiempo real).
  3. **Escala Armónica de Widgets**: Los widgets estándar de control (Reloj, Temporizador, Cronómetro) se adaptaron a `4x2` (~316×152px) y `4x3`, encajando exactamente en la cuadrícula sin apretujarse.
  4. **Lienzo Acotado (Cero Estiramiento Vertical)**: Se aplicó `overflow: hidden !important; height: 100%; max-height: 100%;` a `#view-dashboard`, `.dashboard-container` y `.grid-board`.
  5. **Cálculo Estricto de Filas Visibles**: `maxVisibleRows` se computa estrictamente con `Math.floor((gridVisibleHeight + gap) / stepY)` sin tolerancias desbordantes, y `maxAllowedRow` se fija en `Math.max(1, maxVisibleRows - spanRow + 1)`. Ninguna tarjeta puede sobrepasar la altura visible ni provocar scrollbars.
  6. **Exclusión Estricta de Maquetas**: Las maquetas [`core_shell.html`](file:///c:/Proyectos/pc_manager/core_shell.html) e [`index.html`](file:///c:/Proyectos/pc_manager/index.html) no fueron tocadas.
- **Justificación de Modificación de Componente Preexistente (Regla 11)**:
  La transición a la cuadrícula isométrica 70x70 con totalizadores y límite vertical rígido elimina las anomalías de arrastre y resuelve de forma definitiva el desbordamiento del lienzo solicitado por el usuario.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)
  - [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm)
  - [`docs/developer/MODULAR_SYSTEM_MANUAL.md`](file:///c:/Proyectos/pc_manager/docs/developer/MODULAR_SYSTEM_MANUAL.md)
  - [`PROJECT_SPECIFICATION.md`](file:///c:/Proyectos/pc_manager/PROJECT_SPECIFICATION.md)
  - [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md)
  - [`docs/ai/MODULAR_SYSTEM_AI_SPEC.md`](file:///c:/Proyectos/pc_manager/docs/ai/MODULAR_SYSTEM_AI_SPEC.md)
  - [`docs/ai/core_ai_spec.md`](file:///c:/Proyectos/pc_manager/docs/ai/core_ai_spec.md)
  - [`docs/user/core_user_manual.md`](file:///c:/Proyectos/pc_manager/docs/user/core_user_manual.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-047] Cuadrícula Proporcional Top-Down (12x8), Eliminación de Residuo Vertical Muerto y Formalización de la Regla 12 de Asesoría Técnica Proactiva
- **Fecha**: 2026-09-16
- **Commit**: `3ab991b`
- **Versión**: `v0.0.3-alpha`
- **Severidad**: `ALTA`
- **Componente**: `UI / Dashboard Grid (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`) & Directivas de IA (`[`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)`)`
- **Descripción del Fallo**: 
  1. Al arrastrar un widget hacia el límite inferior del lienzo en el Dashboard, se producía un espacio muerto inservible (~50px en 1080p) donde no cabía otra tarjeta completa pero que dejaba un hueco antiestético.
  2. Al forzar celdas de 70x70, tarjetas de 2 columnas se comprimían a ~152px de ancho, provocando que títulos de widgets como "Temporizador" o "Reloj del Sistema" se quebraran en múltiples líneas de forma deforme.
  3. Complacencia pasiva del agente de IA ante números o medidas exploratorias aportadas informalmente por el usuario durante sesiones de vibe-coding, violando el rol de consultor técnico crítico.
- **Causa Raíz**: 
  - Enfoque "bottom-up" con medidas fijas en píxeles ($70\text{px}$ celda $+ 12\text{px}$ gap $= 82\text{px}$). Al dividir una altura visible dinámica ($941\text{px}$ netos) por $82\text{px}$, el residuo $941 \pmod{82} = 51\text{px}$ quedaba como espacio muerto porque `grid-auto-rows` no admite `1fr`.
  - Aceptación no contrastada de ejemplos intuitivos del usuario sin validación previa multi-resolución (720p vs 1080p vs 2K).
- **Solución Implementada**: 
  1. **Regla 12 en `AGENTS.md` y `.agents/rules/proactive_technical_advisory.md`**: Obliga al agente a tratar los valores del usuario como intenciones exploratorias, contrastar matemáticamente la viabilidad, asesorar proactivamente y jamás "dar la razón porque sí".
  2. **Matriz Proporcional Top-Down (12x8)**: En lugar de forzar píxeles fijos, la cuadrícula deriva sus celdas directamente del alto y ancho disponible mediante `repeat(12, minmax(0, 1fr))` y `repeat(8, minmax(0, 1fr))`. En 1080p estándar, esto genera celdas de $\approx 120 \times 102\text{ px}$ con **residuo exactamente cero**, eliminando cualquier hueco al fondo y garantizando que el widget toque la línea de borde sin provocar scrollbars.
  3. **Catálogo de Tamaños Finales**: Se calibraron las clases `.card-size-*` para la matriz 12x8 (`1x1` de 120x102px con espacio holgado para títulos y números; `2x1` de 252x102px; `2x2` de 252x216px; `3x2` de 384x216px; `4x2` de 516x216px; etc.).
  4. **Adaptabilidad a 720p**: Se integró media query `@media (max-width: 1280px)` que conmuta a una matriz de $8 \times 6$, preservando la legibilidad táctil en pantallas compactas sin encoger los textos por debajo del umbral ergonómico.
  5. **Actualización de Documentación Triad**: Se sincronizó `DASHBOARD_ARCHITECTURE.md`, `MODULAR_SYSTEM_MANUAL.md` y `MODULAR_SYSTEM_AI_SPEC.md`.
- **Archivos Afectados**: 
  - [`AGENTS.md`](file:///c:/Proyectos/pc_manager/AGENTS.md)
  - [`.agents/rules/proactive_technical_advisory.md`](file:///c:/Proyectos/pc_manager/.agents/rules/proactive_technical_advisory.md)
  - [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md)
  - [`docs/developer/MODULAR_SYSTEM_MANUAL.md`](file:///c:/Proyectos/pc_manager/docs/developer/MODULAR_SYSTEM_MANUAL.md)
  - [`docs/ai/MODULAR_SYSTEM_AI_SPEC.md`](file:///c:/Proyectos/pc_manager/docs/ai/MODULAR_SYSTEM_AI_SPEC.md)
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`build_dummy_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_pcm.cjs)
  - [`system-clock.pcm`](file:///c:/Proyectos/pc_manager/system-clock.pcm)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)

---

### [BUG-048] Soporte para clase card-size-banner en getCardSpan y Creación del Paquete de Muestrario Dummy con Todos los Tamaños de Widgets
- **Fecha**: 2026-09-16
- **Commit**: `334db49`
- **Versión**: `v0.0.4-alpha`
- **Severidad**: `BAJA`
- **Componente**: `UI / Dashboard (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`) & Extensiones (`[`dummy-widgets.pcm`](file:///c:/Proyectos/pc_manager/dummy-widgets.pcm)`)`
- **Descripción del Fallo**: 
  1. Al arrastrar o reposicionar widgets declarados con `size: "banner"`, la función `getCardSpan(card)` no reconocía el tamaño porque la expresión regular `card-size-(\d+)x(\d+)` esperaba dos números explícitos, haciendo que cayera en el fallback genérico (`3x2`) en lugar de ocupar las 12 columnas completas.
  2. Ausencia de un paquete modular oficial de prueba (`.pcm`) en la raíz del proyecto para validar visualmente todos los tamaños matriciales soportados (1x1, 2x1, 2x2, 3x2, 4x2, 4x3, 4x4, 6x2, 6x4, 8x2, 12x2 y banner).
- **Causa Raíz**: 
  La clase `.card-size-banner` usa una denominación semántica para ancho completo (100% de la cuadrícula = 12 columnas $\times$ 2 filas) en lugar del formato numérico `NxM`.
- **Solución Implementada**: 
  1. Se añadió detección explícita en `getCardSpan(card)` para `card-size-banner`, retornando `{ spanCol: 12, spanRow: 2 }`.
  2. Se creó el script de empaquetado [`build_dummy_widgets_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_widgets_pcm.cjs) y se generó el paquete [`dummy-widgets.pcm`](file:///c:/Proyectos/pc_manager/dummy-widgets.pcm) directamente en la raíz del proyecto. El paquete contiene los 12 tamaños disponibles, cada uno completamente vacío y con tipografía limpia indicando únicamente su tamaño.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`build_dummy_widgets_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_widgets_pcm.cjs)
  - [`dummy-widgets.pcm`](file:///c:/Proyectos/pc_manager/dummy-widgets.pcm)
  - [`modules/dummy-widgets/manifest.json`](file:///c:/Proyectos/pc_manager/modules/dummy-widgets/manifest.json)
  - [`modules/dummy-widgets/module.js`](file:///c:/Proyectos/pc_manager/modules/dummy-widgets/module.js)
  - [`modules/dummy-widgets/README.md`](file:///c:/Proyectos/pc_manager/modules/dummy-widgets/README.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-049] Adaptación Elástica Responsiva en Ventanas Pequeñas, Formatos Verticales de Widgets (1x2, 2x3, 2x4) y Agrupación por Módulos con Acordeón Colapsable en Catálogo Lateral
- **Fecha**: 2026-09-16
- **Commit**: `2f30f2b`
- **Versión**: `v0.0.4-alpha`
- **Severidad**: `ALTA`
- **Componente**: `UI / Dashboard / Grid Layout, Widgets & Drawer Lateral (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, `[`build_dummy_widgets_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_widgets_pcm.cjs)`, `[`dummy-widgets.pcm`](file:///c:/Proyectos/pc_manager/dummy-widgets.pcm)`)`
- **Descripción del Fallo**: 
  1. Al desmaximizar la aplicación o abrirla en pantallas con resolución menor (ventanas estrechas), los widgets se apretujaban y deformaban: los títulos de cabecera como "Temporizador" se partían en sílabas antiestéticas ("Temporiza / dor") y los botones de acción interna (como los 3 botones de control del temporizador/cronómetro) quedaban recortados o desbordaban el borde derecho de la tarjeta.
  2. La arquitectura del Dashboard carecía de widgets verticales (sólo contemplaba formatos horizontales o cuadrados), impidiendo el diseño de barras de sensores en torre, monitores de puertos o columnas medianas/altas.
  3. En el drawer lateral de personalización de widgets, todos los widgets se listaban en una única lista plana desordenada, lo que generaba un desplazamiento (scroll) kilométrico e incómodo cuando se instalaban módulos con múltiples componentes.
- **Causa Raíz**: 
  1. Ausencia de container queries para la escala interna de elementos interactivos dentro de tarjetas, sumado a que `.card-title-box h4` admitía saltos de línea con `word-break: break-word`, y que se habían retirado los breakpoints responsivos intermedios forzando 12 columnas incluso en anchos reducidos.
  2. No existían reglas CSS para tamaños donde `spanRow > spanCol` más allá del micro-widget 1x1.
  3. `renderDashboardCustomizationCatalog()` iteraba linealmente todos los widgets sin agruparlos bajo el identificador de su módulo emisor ni proveer estado de colapso/expansión.
- **Solución Implementada**: 
  1. **Container Queries y Escala Elástica Interna**:
     - Se añadió `container-type: inline-size; container-name: card;` a `.card`.
     - Regla `@container card (max-width: 280px)` que reduce dinámicamente paddings de tarjeta y botones (`padding: 4px 6px !important; font-size: 10.5px !important; gap: 4px !important;`), garantizando que los 3 botones del temporizador/cronómetro encajen con 100% de visibilidad sin cortes.
     - Se protegió `.card-title-box h4` con `clamp(11.5px, 1.25vw, 13px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`, eliminando de raíz el quiebre de palabras.
     - Se reincorporaron breakpoints responsivos en CSS y JS (`<= 1360px` a 8 cols, 6 rows; `<= 1080px` a 6 cols, 6 rows) con posicionamiento no destructivo en `adjustCardsForCurrentGridCols()`.
  2. **Formatos Verticales Canónicos (1x2, 2x3, 2x4)**:
     - Se implementaron las clases CSS `.card-size-1x2` (Torre métrica compacta), `.card-size-2x3` (Columna mediana) y `.card-size-2x4` (Columna alta).
     - Se actualizó el generador y el paquete [`dummy-widgets.pcm`](file:///c:/Proyectos/pc_manager/dummy-widgets.pcm) en la raíz a 15 formatos oficiales, y se sincronizó la documentación en `MODULAR_SYSTEM_MANUAL.md` y `DASHBOARD_ARCHITECTURE.md`.
  3. **Drawer Lateral con Acordeones Colapsables por Módulo**:
     - Se reestructuró `renderDashboardCustomizationCatalog()` para agrupar widgets bajo el módulo que los provee (`grp.module.name`).
     - Cada módulo se muestra como una tarjeta acordeón con cabecera interactiva, icono SVG del módulo, conteo total y cantidad de widgets activos en el perfil actual.
     - Vienen colapsados por defecto (`window.__EXPANDED_DRAWER_GROUPS__`) y se expanden o contraen mediante `toggleWidgetDrawerGroup(modId)`.
- **Justificación de Modificación de Componente Preexistente (Regla 11)**:
  La escala elástica mediante container queries y el restablecimiento de breakpoints responsivos corrigen la degradación visual en ventanas pequeñas sin alterar ninguna funcionalidad ni dimensión en ventanas maximizadas. La agrupación por módulos en el drawer optimiza la ergonomía de navegación sin afectar la persistencia ni el orden de los perfiles.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`build_dummy_widgets_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_widgets_pcm.cjs)
  - [`dummy-widgets.pcm`](file:///c:/Proyectos/pc_manager/dummy-widgets.pcm)
  - [`modules/dummy-widgets/manifest.json`](file:///c:/Proyectos/pc_manager/modules/dummy-widgets/manifest.json)
  - [`modules/dummy-widgets/module.js`](file:///c:/Proyectos/pc_manager/modules/dummy-widgets/module.js)
  - [`modules/dummy-widgets/README.md`](file:///c:/Proyectos/pc_manager/modules/dummy-widgets/README.md)
  - [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md)
  - [`docs/developer/MODULAR_SYSTEM_MANUAL.md`](file:///c:/Proyectos/pc_manager/docs/developer/MODULAR_SYSTEM_MANUAL.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-050] Control Estricto de Capacidad, Topología Portrait 6x14, Badges de Orientación, Navegación Contextual y Paquete dummy-widgets.pcm v1.1.0
- **Fecha**: `2026-09-16`
- **Commit**: `8664651`
- **Versión**: `v0.0.4-alpha`
- **Severidad**: `ALTA`
- **Componente**: `UI / Dashboard / Control de Capacidad, Topología Portrait 6x14, Badges de Orientación, Navegación Contextual & dummy-widgets.pcm v1.1.0 (`[`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)`, `[`build_dummy_widgets_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_widgets_pcm.cjs)`, `[`dummy-widgets.pcm`](file:///c:/Proyectos/pc_manager/dummy-widgets.pcm)`)`
- **Descripción del Fallo**: 
  1. Caos por falta de control de capacidad en el Dashboard: al activar widgets en el Drawer lateral o durante reorganizaciones, no se validaba si existía espacio contiguo disponible en el tablero visible; resultado: widgets empujados, desbordamientos, solapamientos y redimensionamientos en cadena.
  2. En monitores y ventanas verticales (Portrait 9:16 / 1080x1920), al imponerse la topología de 8 filas en ~1750px de altura útil, cada fila medía entre 220-290px de alto, haciendo que widgets de 2 filas midieran 580px (hipertrofia visual desproporcionada) empujando a los demás fuera de la pantalla.
  3. En el Drawer lateral de widgets, no se informaba al usuario si los widgets estaban concebidos para monitores horizontales o verticales.
  4. En el menú contextual del Sidebar (clic derecho sobre un módulo), la opción "Ver en Gestor de Módulos" llamaba a `switchView('modules')` (vista inexistente), provocando una pantalla en blanco.
  5. Al actualizar un módulo `.pcm` (`isUpdate`), los widgets recién introducidos en el paquete que no existían previamente aparecían activos de forma invasiva en el Dashboard en vez de iniciar apagados en `hiddenWidgets`.
  6. El módulo de muestrario de widgets no contaba con versión semántica incrementada (`1.1.0`) y faltaban los formatos verticales complementarios (`1x3`, `1x4`, `3x4`, `4x6`).
- **Causa Raíz**: 
  1. Ausencia de algoritmo preventivo de validación de capacidad antes de `toggleWidgetVisibility` y falta de `canWidgetFitOnDashboard()`.
  2. Ausencia de media query de orientación portrait con grid de 14 filas para equiparar la proporción de celdas a ~113px x 110px.
  3. Falta de metadata `orientation` y badges SVG en el catálogo de personalización.
  4. Discrepancia de identificador: la vista en el DOM es `view-module-manager`, no `view-modules`.
  5. En `installModule`, la condición `if (!isUpdate && !isStartup)` omitía ocultar widgets nuevos introducidos en una actualización de paquete.
- **Solución Implementada**: 
  1. Se implementó `canWidgetFitOnDashboard()` en `ui/index.html`. Si un widget no cabe dentro del límite físico de filas del Dashboard, se bloquea su activación, se revierte el interruptor en el Drawer y se emite un toast de advertencia al usuario.
  2. Se añadieron media queries `@media (orientation: portrait), (max-aspect-ratio: 1/1)` en CSS con `grid-template-columns: repeat(6, minmax(0, 1fr))` y `grid-template-rows: repeat(14, minmax(0, 1fr))`, junto con las funciones JS `isPortraitOrientation()`, `getGridCols()` y `getMaxVisibleRows()`.
  3. Se incorporaron insignias vectoriales SVG en el catálogo del Drawer para ↔ Horizontal, ↕ Vertical y ⊞ Universal con tooltips explicativos.
  4. Se corrigió el menú contextual para invocar `switchView('module-manager')`, activar la pestaña `installed` con `switchManagerTab('installed')` y enfocar suavemente la tarjeta del módulo mediante `focusModuleInManager(modId)`.
  5. Se corrigió `installModule` para que cualquier widget nuevo o no rastreado previamente inicie siempre oculto en `hiddenWidgets` aún durante la actualización (`isUpdate`).
  6. Se crearon las clases CSS `.card-size-1x3`, `.card-size-1x4`, `.card-size-3x4` y `.card-size-4x6`, se actualizó `build_dummy_widgets_pcm.cjs` a la versión `1.1.0` con los 19 formatos soportados y se regeneró `dummy-widgets.pcm` en la raíz.
- **Justificación de Modificación de Componente Preexistente (Regla 11)**:
  Los cambios refuerzan la contención matemática y la ergonomía sin alterar el comportamiento de escritorios horizontales ya verificados. Se previene la corrupción de layouts por colisiones y se garantiza navegación confiable sin pantallas en blanco.
- **Archivos Afectados**: 
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`build_dummy_widgets_pcm.cjs`](file:///c:/Proyectos/pc_manager/build_dummy_widgets_pcm.cjs)
  - [`dummy-widgets.pcm`](file:///c:/Proyectos/pc_manager/dummy-widgets.pcm)
  - [`modules/dummy-widgets/manifest.json`](file:///c:/Proyectos/pc_manager/modules/dummy-widgets/manifest.json)
  - [`modules/dummy-widgets/module.js`](file:///c:/Proyectos/pc_manager/modules/dummy-widgets/module.js)
  - [`modules/dummy-widgets/README.md`](file:///c:/Proyectos/pc_manager/modules/dummy-widgets/README.md)
  - [`PROJECT_SPECIFICATION.md`](file:///c:/Proyectos/pc_manager/PROJECT_SPECIFICATION.md)
  - [`DASHBOARD_ARCHITECTURE.md`](file:///c:/Proyectos/pc_manager/DASHBOARD_ARCHITECTURE.md)
  - [`docs/developer/MODULAR_SYSTEM_MANUAL.md`](file:///c:/Proyectos/pc_manager/docs/developer/MODULAR_SYSTEM_MANUAL.md)
  - [`docs/ai/MODULAR_SYSTEM_AI_SPEC.md`](file:///c:/Proyectos/pc_manager/docs/ai/MODULAR_SYSTEM_AI_SPEC.md)
  - [`docs/user/core_user_manual.md`](file:///c:/Proyectos/pc_manager/docs/user/core_user_manual.md)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`

---

### [BUG-051] Superposición y solapamiento de widgets existentes en el Dashboard al instalar módulos .pcm

- **Fecha**: 2026-09-16
- **Módulo**: Core Dashboard / Module Manager
- **Severidad**: Alta
- **Descripción**: Al instalar un paquete de módulo (.pcm) desde el Gestor de Módulos, las tarjetas y widgets que el usuario ya tenía configurados y activos en el Dashboard se superponían y solapaban unas sobre otras, corrompiendo el diseño y montando múltiples tarjetas en las mismas coordenadas de la cuadrícula.
- **Causa Raíz**:
  1. *Invocación prematura en vista oculta*: `handlePcmPackage()` ejecutaba `await restoreDashboardLayout()` mientras el usuario se encontraba en la vista del Gestor de Módulos (`#view-module-manager`). Como `#view-dashboard` poseía la clase `.hidden` (`display: none !important`), `#grid-board` no disponía de propiedades de grid calculadas por el motor de renderizado (`getComputedStyle` devolvía `'none'`).
  2. *Cálculo degradado por fallback de ventana*: Al fallar el cómputo del grid, `getGridCols()` recurría al fallback de ancho de ventana, calculando 8 columnas (para 1180px) o 6 columnas (en vertical) en lugar de las 12 columnas apaisadas. Esto forzaba a recortar y comprimir hacia la izquierda todas las tarjetas con columna base superior a 5 o 3, provocando colisiones artificiales.
  3. *Fallback defectuoso ante colisión*: En `restoreDashboardLayout()` y `adjustCardsForCurrentGridCols()`, cuando una tarjeta colisionaba (`collides === true`) y `findNextFreeSlot()` no hallaba celdas libres disponibles, `displayCol` y `displayRow` no se anulaban; permanecían con las coordenadas colisionadas y la tarjeta se posicionaba exactamente en la misma celda de su vecina (`style.gridColumn = displayCol / span ...`).
  4. *Sobrescritura destructiva del layout maestro*: El paso 3 de `restoreDashboardLayout()` sobrescribía `current.layout` con las posiciones colisionadas y degradadas a 8 o 6 columnas y las persistía en disco mediante `persistDashboardProfilesState()`, destruyendo de forma irreversible el diseño original del usuario.
  5. *Coordenadas sucias en `dataset.col`*: Al no limpiarse universalmente `dataset.col` al iniciar el layout, tarjetas visibles omitidas en el paso 1 no eran procesadas por el paso 2 y no se registraban en `occupiedMatrix`, permitiendo que otras tarjetas ocuparan sus mismas celdas.
  6. *Fuga de widgets en reinstalación*: `installModule()` no forzaba el estado oculto en todos los widgets de un módulo instalado o actualizado, inyectándolos en el Dashboard si tenían alguna referencia previa en `layout`.
- **Solución Implementada**:
  1. Se eliminó la llamada a `restoreDashboardLayout()` de `handlePcmPackage()`, garantizando que la instalación de extensiones en segundo plano nunca altere la cuadrícula del Dashboard.
  2. Se incorporó una guarda estricta de vista oculta en `restoreDashboardLayout()` y `adjustCardsForCurrentGridCols()` para abortar inmediatamente si `#view-dashboard` tiene la clase `.hidden`.
  3. Se conectó `restoreDashboardLayout()` en `switchView('dashboard')` para que el renderizado de la cuadrícula solo se ejecute cuando la vista es visible y las columnas computadas son 100% reales y fidedignas.
  4. Se implementó el protocolo **Anti-Superimposition**: si una tarjeta colisiona y no existe ninguna celda libre en la cuadrícula, `displayCol` y `displayRow` se anulan (`null`), impidiendo categóricamente que dos tarjetas compartan la misma celda. La tarjeta excedente se oculta de forma segura (`style.display = 'none'` y registro en `hiddenWidgets`).
  5. Se estableció el reseteo universal incondicional de `dataset.col`, `dataset.row`, `style.gridColumn` y `style.gridRow` para todas las tarjetas al inicio de `restoreDashboardLayout()`.
  6. Se eliminó la sobrescritura destructiva de `current.layout` en `restoreDashboardLayout()`, preservando las posiciones maestras originales y registrando únicamente tarjetas nuevas que carecían de coordenadas previas.
  7. Se reforzó `installModule()` para que ante cualquier instalación o actualización (`!isStartup`), todos los widgets del paquete inicien estrictamente ocultos (`style.display = 'none'`) en `hiddenWidgets`, requiriendo su activación explícita desde el Drawer.
- **Justificación de Modificación de Componente Preexistente (Regla 11)**:
  La intervención en `restoreDashboardLayout()` y `installModule()` fue indispensable para erradicar el solapamiento de tarjetas y evitar la corrupción irreversible del layout del usuario al instalar módulos. Se preservaron intactas todas las capacidades de drag & drop, cambio de perfiles y auto-organización, validando que no existan regresiones estéticas ni funcionales.
- **Archivos Afectados**:
  - [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html)
  - [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md)
- **Estado**: `RESUELTO`


























