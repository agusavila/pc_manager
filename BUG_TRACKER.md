# Bitácora de Errores y Correcciones: PC Manager (Bug Tracker)

Este documento registra de forma histórica, detallada y auditable todos los errores, excepciones, fallos de entorno y correcciones (**Bug Fixes**) implementados en el proyecto **PC Manager**, vinculados a su correspondiente commit y versión del sistema.

---

## 📊 Resumen Estadístico de Incidencias

| Versión | Total Incidencias | Críticas | Altas | Medias | Bajas | Estado |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `0.0.1-alpha` | 5 | 1 | 3 | 1 | 0 | 100% Resueltas |

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

