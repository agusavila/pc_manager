# ARCHITECTURE BASELINE — PC MANAGER

> **Fase 1 del Plan de Corrección y Refactor**  
> **Fecha de Elaboración:** 2026-09-26  
> **Versión del Repositorio:** `0.0.4`  
> **Objetivo:** Fotografía técnica exacta, exhaustiva y factual del estado del código antes de intervenir la arquitectura.

---

## 1. Clasificación Canónica de Estados

Cada componente y capacidad del sistema se clasifica estrictamente en una de las siguientes cinco categorías:

- **`IMPLEMENTADO`**: El código existe, funciona en producción/runtime y está verificado con tests o validación operativa.
- **`PARCIAL`**: Existe implementación funcional pero incompleta, o desacoplada entre backend y frontend.
- **`EXPERIMENTAL`**: Funciona bajo condiciones de laboratorio o prototipado, pero no cuenta con garantías plenas de producción.
- **`PLANEADO`**: Diseñado conceptualmente en especificaciones pero sin código ejecutable en el repositorio.
- **`DOCUMENTADO PERO NO IMPLEMENTADO`**: Presentado en guías, reglas o manuales previos como si existiera, pero inexistente o meramente cosmético en el código real.

---

## 2. Inventario de Entry Points y Binarios

| Entry Point | Ruta | Tipo / Plataforma | Estado | Descripción Técnica |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop App (Main)** | [`src-tauri/src/main.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/main.rs) | Rust / Windows GUI | `IMPLEMENTADO` | Instancia única vía Mutex nativo (`Local\PCManager_Core_SingleInstance_Mutex`). Si ya existe otra instancia, restaura y enfoca la ventana existente (`ShowWindow`, `SetForegroundWindow`) y sale con 0. Lanza `pc_manager_lib::run()`. |
| **Desktop Core Lib** | [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs) | Rust / Tauri Runtime | `IMPLEMENTADO` | Configura System Tray nativo con menú contextual (`Abrir`, `Ocultar`, `Cerrar`), intercepta evento de cierre de ventana para minimizar al tray (`CloseRequested`), y registra 21 comandos Tauri IPC. |
| **Windows Service Daemon** | [`src-tauri/src/bin/service_main.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/bin/service_main.rs) | Rust / Windows Service | `IMPLEMENTADO` | Binario dedicado `pc_manager_service.exe`. Despacha el servicio nativo bajo `NT AUTHORITY\SYSTEM` o recolecta telemetría única vía `--collect-once`. |
| **Frontend Entry Point** | [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) | HTML5 / WebView2 | `IMPLEMENTADO` | Monolito de 1493 líneas que carga la interfaz, estilos y scripts. |
| **Frontend Logic** | [`ui/js/app.js`](file:///c:/Proyectos/pc_manager/ui/js/app.js) | JavaScript Client | `IMPLEMENTADO` | Monolito de 4793 líneas con la gestión visual de vistas, dashboard, perfiles, catálogo, y llamadas IPC desordenadas. |
| **Mock Core JS** | [`src/core/index.js`](file:///c:/Proyectos/pc_manager/src/core/index.js) | Node.js CommonJS/ESM | `EXPERIMENTAL` | Núcleo simulado en memoria (`PCManagerCore`, versión `0.0.1-alpha`). No se conecta a la aplicación Tauri; solo se usa en `test/core_test.js`. |

---

## 3. Inventario de Comandos Tauri IPC (`src-tauri/src/lib.rs`)

| Comando IPC | Estado | Parámetros | Retorno | Análisis Técnico Real |
| :--- | :--- | :--- | :--- | :--- |
| `get_system_info` | `IMPLEMENTADO` | Ninguno | `SystemInfoPayload` | Retorna OS, arquitectura, hostname y versión del sistema (`0.0.4`). |
| `minimize_to_tray` | `IMPLEMENTADO` | `app: AppHandle` | `Result<(), String>` | Oculta la ventana principal en la bandeja del sistema. |
| `quit_app` | `IMPLEMENTADO` | `app: AppHandle` | `()` | Invoca `coordinated_shutdown`: destruye ventanas y finaliza con `app.exit(0)`. |
| `get_installed_modules` | `IMPLEMENTADO` | `app: AppHandle` | `Vec<InstalledModuleRecord>` | Lee `%APPDATA%\com.pcmanager.core\registry.json` y retorna los registros instalados. |
| `inspect_module_package` | `IMPLEMENTADO` | `package_bytes: Vec<u8>` | `Result<PackageInspectionPayload, String>` | Valida archivo ZIP, extrae y analiza `manifest.json`, valida ID y firma Ed25519. |
| `install_module_package` | `IMPLEMENTADO` | `app, package_bytes, permissions` | `Result<InstalledModuleRecord, String>` | Extracción transaccional en `.staging`, validación de cuotas, movimiento atómico a disco y persistencia con backup `.bak`. |
| `uninstall_module` | `IMPLEMENTADO` | `app, module_id` | `Result<(), String>` | Valida remoción física de la carpeta antes de dar de baja del registro. |
| `toggle_module_active` | `IMPLEMENTADO` | `app, module_id, active` | `Result<(), String>` | Actualiza estado activo/inactivo en `registry.json` con guardado atómico. |
| `save_module_setting` | `IMPLEMENTADO` | `app, module_id, option_id, value` | `Result<(), String>` | Persiste opciones de módulos en `registry.json`. |
| `get_saved_settings` | `IMPLEMENTADO` | `app, module_id` | `HashMap<String, Value>` | Obtiene el mapa de configuraciones guardadas para un módulo. |
| `save_dashboard_order` | `IMPLEMENTADO` | `app, card_order: Vec<String>` | `Result<(), String>` | Guarda el orden de tarjetas en `registry.json`. |
| `get_dashboard_order` | `IMPLEMENTADO` | `app` | `Vec<String>` | Lee el orden de tarjetas desde `registry.json`. |
| `show_windows_notification`| `IMPLEMENTADO` | `title, body` | `Result<(), String>` | Emite notificaciones nativas de Windows vía WinRT Toast API (`tauri-winrt-notification`), sin PowerShell. |
| `execute_module_script` | `PARCIAL` | `app, module_id, script, interpreter` | `Result<String, String>` | Valida ID y lista negra de strings (`validate_script_safety`), y ejecuta PowerShell con `-EncodedCommand`. **No tiene sandbox real de SO**. |
| `check_service_status` | `IMPLEMENTADO` | Ninguno | `ServiceStatusPayload` | Consulta Windows Service Manager mediante `sc.exe query pc_manager_service`. |
| `request_service_installation`| `IMPLEMENTADO`| Ninguno | `Result<String, String>` | Solicita elevación UAC para registrar e iniciar el servicio nativo desde `%ProgramData%\PCManager\bin\`. |
| `toggle_service_state` | `IMPLEMENTADO` | `action: String` | `Result<String, String>` | Inicia o detiene el servicio Windows mediante `sc.exe start/stop`. |
| `uninstall_windows_service` | `IMPLEMENTADO` | Ninguno | `Result<String, String>` | Detiene y elimina el servicio nativo con elevación UAC. |
| `get_storage_telemetry` | `EXPERIMENTAL` | Ninguno | `Option<String>` | Lector simple de caché JSON en `%ProgramData%\PCManager\telemetry\storage_smart.json`. |
| `get_system_telemetry` | `IMPLEMENTADO` | Ninguno | `Option<String>` | Lee caché de telemetría unificada de hardware generada por el servicio. |
| `get_modules_initialization_order`| `IMPLEMENTADO`| `app` | `Result<Vec<String>, String>` | Resuelve orden de inicialización topológica de dependencias (algoritmo de Kahn) y detecta ciclos. |

---

## 4. Comparativa de Subsistemas: Rust Core vs. JavaScript

| Subsistema | Implementación en Rust Core | Implementación en JavaScript | Diagnóstico de Duplicidad y Estado |
| :--- | :--- | :--- | :--- |
| **Lifecycle** | `coordinated_shutdown()` en [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs) cierra ventanas y sale con `exit(0)`. | `src/core/lifecycle_manager.js` (desconectado). En `ui/js/app.js` solo invoca `quit_app`. | `PARCIAL`. Falta secuencia formal de shutdown que invoque `destroy()` / `stop()` en módulos y servicios antes del cierre. |
| **ModuleManager** | [`src-tauri/src/module_manager.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/module_manager.rs): autoridad persistente sobre disco, registro, zip y dependencias. | `src/core/module_manager.js` (desconectado). `ui/js/app.js` mantiene un `Map` en memoria (`installedModules`) y lee manifiestos con `JSZip`. | `PARCIAL`. Existe duplicidad conceptual. La UI hace lecturas locales innecesarias con JSZip en lugar de consumir exclusivamente la API Rust. |
| **ServiceRegistry** | **NO IMPLEMENTADO** en Rust. | `src/core/service_registry.js` (desconectado). En `ui/js/app.js`, `window.ServiceRegistry` es un `Map` en memoria global de cliente. | `PARCIAL` en JS, `NO IMPLEMENTADO` en Rust. Rust no conoce los servicios ofrecidos ni consumidos por módulos. |
| **EventBus** | **NO IMPLEMENTADO** en Rust (solo eventos nativos de Tauri ventana/tray). | `src/core/event_bus.js` (desconectado). En `ui/js/app.js` no existe EventBus; se usan llamadas directas a funciones. | `NO IMPLEMENTADO` en runtime real. Existe solo como archivo de prueba en `src/core/`. |
| **Persistencia** | `%APPDATA%\com.pcmanager.core\registry.json` con guardado seguro en `.tmp` y copia de respaldo `.bak`. | `localStorage` almacena perfiles de dashboard, orden de tarjetas, visibilidad, temas, preferencias. | `PARCIAL`. Datos críticos de configuración de interfaz viven en `localStorage` del navegador y no en la persistencia central de Rust. |
| **Seguridad de Scripts** | `validate_script_safety` en [`src-tauri/src/module_security.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/module_security.rs) bloquea rutas críticas y comandos destructivos. | Validación superficial en UI. | `PARCIAL`. La validación en Rust es estática basada en texto (AST/regex). No existe aislamiento de procesos (sandbox de Windows). |
| **Firma Criptográfica** | Firma y verificación Ed25519 + SHA256 implementada en [`src-tauri/src/module_security.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/module_security.rs). | `tools/module_signer.cjs` para firma en Node.js. | `IMPLEMENTADO`. Se verifican firmas contra `OFFICIAL_TRUSTED_KEYS`. |

---

## 5. Auditoría y Sincronización de Versiones (Fase 2)

La versión del sistema ha sido centralizada canónicamente en `0.0.4` (`Cargo.toml` como fuente de verdad en Rust con `env!("CARGO_PKG_VERSION")`, `package.json` en NPM y sincronizada en UI, Core JS, tests y documentación):

| Archivo | Versión Declarada | Estado |
| :--- | :--- | :--- |
| [`src-tauri/Cargo.toml`](file:///c:/Proyectos/pc_manager/src-tauri/Cargo.toml) | `0.0.4` | Canónico (Fuente de verdad) |
| [`src-tauri/tauri.conf.json`](file:///c:/Proyectos/pc_manager/src-tauri/tauri.conf.json) | `0.0.4` | Sincronizado |
| [`package.json`](file:///c:/Proyectos/pc_manager/package.json) | `0.0.4` | Sincronizado |
| [`package-lock.json`](file:///c:/Proyectos/pc_manager/package-lock.json) | `0.0.4` | Sincronizado |
| [`src-tauri/src/lib.rs`](file:///c:/Proyectos/pc_manager/src-tauri/src/lib.rs) (`get_system_info`) | `env!("CARGO_PKG_VERSION")` | Dinámico / Canónico |
| [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) (`<title>`) | `v0.0.4` | Sincronizado |
| [`ui/index.html`](file:///c:/Proyectos/pc_manager/ui/index.html) (`#sidebar-core-version`) | `v0.0.4` | Sincronizado |
| [`src/core/index.js`](file:///c:/Proyectos/pc_manager/src/core/index.js) | `0.0.4` | Sincronizado |
| [`src/core/lifecycle_manager.js`](file:///c:/Proyectos/pc_manager/src/core/lifecycle_manager.js) | `0.0.4` | Sincronizado |
| [`test/core_test.js`](file:///c:/Proyectos/pc_manager/test/core_test.js) | `0.0.4` | Sincronizado |
| [`README.md`](file:///c:/Proyectos/pc_manager/README.md) | `0.0.4` | Sincronizado |
| [`docs/user/core_user_manual.md`](file:///c:/Proyectos/pc_manager/docs/user/core_user_manual.md) | `v0.0.4` | Sincronizado |
| [`docs/ai/core_ai_spec.md`](file:///c:/Proyectos/pc_manager/docs/ai/core_ai_spec.md) | `v0.0.4` | Sincronizado |
| [`docs/developer/core_developer_guide.md`](file:///c:/Proyectos/pc_manager/docs/developer/core_developer_guide.md) | `v0.0.4` | Sincronizado |
| [`docs/mockups/core_shell.html`](file:///c:/Proyectos/pc_manager/docs/mockups/core_shell.html) | `v0.0.4` | Sincronizado |

---

## 6. Auditoría de Archivos Duplicados y Residuos

1. **Core Duplicado en Node (`src/core/`)**:
   - `src/core/event_bus.js`
   - `src/core/service_registry.js`
   - `src/core/module_manager.js`
   - `src/core/lifecycle_manager.js`
   - `src/core/theme_engine.js`
   - `src/core/index.js`
   *Diagnóstico*: Estos archivos no forman parte del ejecutable nativo ni del bundle de Tauri. Son una simulación paralela que confunde la autoría del sistema.
2. **Maquetas HTML Huérfanas (`docs/mockups/`)**:
   - `docs/mockups/core_shell.html` (283 KB)
   - `docs/mockups/index.html` (169 KB)
   *Diagnóstico*: Archivos monolíticos masivos que replican código viejo de la UI y no se mantienen sincronizados con `ui/index.html`.
3. **Carpetas Temporales / Accidental**:
   - `Nueva carpeta/` en la raíz del repositorio (directorio vacío no versionado).

---

## 7. Estado de las Pruebas (Test Suite Baseline)

- **Pruebas de Backend Nativo (`cargo test --lib` en `src-tauri`)**:
  - Total: **22 tests aprobados** (0 fallos).
  - Cobertura: Topología y dependencias de módulos (5), validación robusta de Module ID y rutas reservadas de Windows (2), límites de archivos y mitigación de Zip-Bombs (3), detección de paquetes saboteados (1), verificación de firmas Ed25519 (2), persistencia atómica y recuperación de `.bak` en `registry.json` (4), y validación de seguridad de scripts PowerShell (5).
- **Pruebas Unitarias de Frontend / Core JS (`npm test` $\to$ `test/core_test.js`)**:
  - Total: **6 bloques de pruebas aprobados al 100%** (0 fallos).
  - Cobertura: `EventBus`, `ServiceRegistry`, `ModuleManager` (grupos y visibilidad), `ThemeEngine`, `LifecycleManager`, y `validateModuleId` (Fase 3: exhaustivo con IDs válidos, límites, traversal, rutas absolutas, nombres reservados de Windows, mayúsculas y espacios).
- **Compilación Nativa de Escritorio (`cargo build` en `src-tauri`)**:
  - Compila exitosamente el ejecutable nativo de escritorio `src-tauri/target/debug/pc_manager.exe`.

---

## 8. Conclusiones y Próximos Pasos (Fase 4)

1. **Fase 2 (Versionado Único) y Fase 3 (Validación Robusta de Module ID) Culminadas**:
   - Versión canónica unificada a `0.0.4`.
   - `validate_module_id()` validado rigurosamente en Rust (`src-tauri/src/module_security.rs`) y en Core JS (`src/core/module_manager.js`).
   - Todos los entrypoints (`install`, `uninstall`, `toggle_active`, `save_setting`, `get_saved_settings`, `execute_script`) validan `module_id` antes de cualquier interacción con el filesystem.
2. **Siguiente Acción Inmediata (Fase 4 - Hardening del .pcm)**:
   - Robustecer la extracción y validación de paquetes `.pcm`: verificación de integridad ZIP antes de extraer, límites de archivos, mitigación de Zip-Slip y validación estructural del manifiesto.
