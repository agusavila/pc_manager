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


















