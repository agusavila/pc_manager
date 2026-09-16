# Especificación para Modelos de IA: PC Manager Core (v0.0.3-alpha)

Esta especificación proporciona las directivas formales, esquemas de datos, contratos IPC y restricciones que cualquier agente o modelo de IA debe respetar al generar, modificar o auditar código del Core o sus extensiones.

---

## 1. Resumen Contextual y Alcance

**PC Manager Core** es una aplicación nativa de escritorio para Windows (Rust + Tauri v2 + WebView2) construida como una carcasa modular (microkernel) desacoplada responsable de:
1. Administrar el ciclo de vida del proceso en Windows (`LifecycleManager`, minimización determinista al System Tray y parada total sin procesos huérfanos).
2. Registro y persistencia de módulos `.pcm` (`module_manager` en Rust y montador dinámico en JavaScript con JSZip).
3. Publicar y consumir servicios compartidos (`ServiceRegistry`).
4. Orquestar el centro de notificaciones (filtrado de 3 capas y notificaciones Toast nativas en Windows vía `tauri-plugin-notification`).
5. Proveer el motor de personalización de Dashboard (cuadrícula isométrica 70x70, lienzo acotado sin estiramiento, perfiles independientes, Drag & Drop fluido y auto-organización).
6. Proveer el sistema de diseño reactivo, comboboxes Material Expressive y temas (`ThemeEngine`).

> [!TIP]
> Para la especificación exhaustiva de generación de extensiones modulares, esquemas de `manifest.json`, hooks de ciclo de vida y ejemplos de código para IA, consulte obligatoriamente [`MODULAR_SYSTEM_AI_SPEC.md`](file:///c:/Proyectos/pc_manager/docs/ai/MODULAR_SYSTEM_AI_SPEC.md).

---

## 2. Contratos IPC con el Backend Nativo de Windows (Tauri v2)

Toda comunicación entre la capa gráfica (WebView) y el host nativo de Windows se realiza mediante comandos invocables vía `getTauriInvoke()`:

```typescript
// Lista exhaustiva de comandos Tauri registrados en src-tauri/src/lib.rs:

// Información del sistema y telemetría de plataforma
invoke('get_system_info'): Promise<{ os_name: string, arch: string, hostname: string, version: string, status: string }>;

// Gestión de ventana y bandeja del sistema (System Tray)
invoke('minimize_to_tray'): Promise<void>;
invoke('quit_app'): Promise<void>;

// Gestión de módulos instalados y persistencia en disco
invoke('get_installed_modules'): Promise<Array<{ manifest: object, script_code: string, active: boolean }>>;
invoke('install_module_package', { packageBytes: number[] }): Promise<object>;
invoke('uninstall_module', { moduleId: string }): Promise<void>;
invoke('toggle_module_active', { moduleId: string, active: boolean }): Promise<void>;

// Almacenamiento persistente de configuraciones por módulo o subsistema
invoke('save_module_setting', { moduleId: string, optionId: string, value: any }): Promise<void>;
invoke('get_saved_settings', { moduleId: string }): Promise<Record<string, any>>;

// Orden y persistencia del Dashboard
invoke('save_dashboard_order', { cardOrder: string[] }): Promise<void>;
invoke('get_dashboard_order'): Promise<string[]>;

// Emisión de alertas nativas a Windows 10/11 (Centro de Actividades / WinRT)
invoke('show_windows_notification', { title: string, body: string }): Promise<void>;
```

---

## 3. Esquemas de Datos del Core

### 3.1. Esquema de Preferencias de Notificaciones (`core_notifications`)
```typescript
interface CoreNotificationSettings {
  systemEnabled: boolean;          // Interruptor maestro de avisos del núcleo
  windowsNativeEnabled: boolean;   // Despacho de notificaciones Toast a Windows 10/11
  modulesMasterEnabled: boolean;   // Interruptor maestro para todas las extensiones
  systemEvents: {
    modules?: boolean;             // Instalación, desinstalación o actualización de .pcm
    profiles?: boolean;            // Creación, duplicación o borrado de perfiles de dashboard
    windows_integration?: boolean; // Modo servicio o parada del núcleo
    security?: boolean;            // Alertas del sistema y dry-run
  };
  modulePermissions: Record<string, boolean>; // moduleId -> boolean
}
```

### 3.2. Esquema de Perfiles de Dashboard (`core_dashboard`)
```typescript
interface DashboardProfilesState {
  activeProfileId: string;
  profileOrder: string[];
  profiles: Record<string, {
    id: string;
    name: string;
    layout: Record<string, { col: number, row: number }>;
    hiddenWidgets: string[];
  }>;
}
```

---

## 4. Restricciones Críticas e Invariantes de Código

Al generar o modificar código para este repositorio, el modelo debe cumplir incondicionalmente:

1. **Aislamiento Total y Marca Blanca (White-Label)**:
   - PROHIBIDO el uso de rutas absolutas locales fijas (`C:\Users\...`). Usar resolución dinámica en runtime.
   - PROHIBIDO asociar lógica estática a marcas comerciales de hardware (ej. "Intel", "AMD", "Kingston").
   - PROHIBIDO el uso de posesivos ("tu PC", "tus archivos"). Usar redacción técnica neutral ("Sistema", "Almacenamiento Local").
2. **Sistema de Diseño (Material Expressive)**:
   - PROHIBIDO incluir emojis como iconos de interfaz. Todo icono debe ser un SVG vectorial limpio con trazo uniforme.
   - PROHIBIDO hardcodear colores HEX/RGB en componentes. Consumir exclusivamente variables CSS semánticas (`var(--bg-*)`, `var(--text-*)`, `var(--accent-*)`).
   - PROHIBIDO utilizar elementos `<select>` nativos sin estilizar. Usar la variante `.custom-combobox` o `.custom-combobox.combobox-sm`.
3. **Integridad de Interfaz**:
   - Títulos y contenidos de tarjetas en el Dashboard nunca deben truncarse con elipsis si ocultan información funcional relevante.
   - Todo botón, interruptor o selector debe estar conectado a lógica real (cero elementos decorativos).
4. **Política Anti-Ruido de Notificaciones**:
   - PROHIBIDO emitir notificaciones al arrancar la app durante la restauración de módulos (`isStartup = true`).
   - La campana debe iniciar siempre en cero.
5. **Compilación Continua Obligatoria**:
   - Tras cualquier cambio en código, compilar el binario nativo (`cargo build` en `src-tauri`) y registrar el fix en [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md).

---

## 5. Verificación Automática

Comandos que la IA debe invocar para certificar cambios:

```bash
# 1. Auditoría estricta de White-Label (cero PII, cero posesivos)
git grep -E "C:\\\\Users|[tT]u (PC|equipo|disco)" -- ":!docs/ai/"

# 2. Compilación del binario nativo de escritorio de Windows
cd src-tauri && cargo build
```
