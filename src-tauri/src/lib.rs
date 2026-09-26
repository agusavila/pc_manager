mod module_manager;
mod module_security;
pub mod service;

use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use module_manager::InstalledModuleRecord;
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfoPayload {
    pub os_name: String,
    pub arch: String,
    pub hostname: String,
    pub version: String,
    pub status: String,
}

#[tauri::command]
fn get_system_info() -> SystemInfoPayload {
    let hostname = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "HOST-PC".to_string());

    SystemInfoPayload {
        os_name: "Windows NT".to_string(),
        arch: std::env::consts::ARCH.to_string(),
        hostname,
        version: "0.0.4".to_string(),
        status: "OPERATIONAL".to_string(),
    }
}

#[tauri::command]
fn minimize_to_tray(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn coordinated_shutdown(app: &AppHandle) {
    log::info!("Iniciando parada determinista y coordinada del sistema (Regla 0 y Regla 8)...");

    // 1. Cerrar ventanas activas de forma ordenada
    for (label, window) in app.webview_windows() {
        log::info!("Cerrando ventana: {}", label);
        let _ = window.destroy();
    }

    log::info!("Parada determinista completada. Saliendo del proceso.");
    app.exit(0);
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    coordinated_shutdown(&app);
}

#[tauri::command]
fn get_modules_initialization_order(app: AppHandle) -> Result<Vec<String>, String> {
    let registry = module_manager::load_registry(&app);
    module_manager::resolve_module_activation_order(&registry.modules)
}

#[tauri::command]
fn get_installed_modules(app: AppHandle) -> Vec<InstalledModuleRecord> {
    let registry = module_manager::load_registry(&app);
    registry.modules.into_values().collect()
}

#[tauri::command]
fn inspect_module_package(package_bytes: Vec<u8>) -> Result<module_manager::PackageInspectionPayload, String> {
    module_manager::inspect_package_bytes(&package_bytes)
}

#[tauri::command]
fn install_module_package(
    app: AppHandle,
    package_bytes: Vec<u8>,
    granted_permissions: Option<Vec<String>>,
) -> Result<InstalledModuleRecord, String> {
    module_manager::install_package_bytes(&app, package_bytes, granted_permissions)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatusPayload {
    pub installed: bool,
    pub running: bool,
    pub status: String,
}

#[tauri::command]
fn check_service_status() -> ServiceStatusPayload {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let mut cmd = Command::new("sc.exe");
        cmd.args(["query", "pc_manager_service"]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        if let Ok(output) = cmd.output() {
            let out = String::from_utf8_lossy(&output.stdout).to_string()
                + &String::from_utf8_lossy(&output.stderr);
            if out.contains("RUNNING") {
                return ServiceStatusPayload {
                    installed: true,
                    running: true,
                    status: "RUNNING".to_string(),
                };
            } else if out.contains("STOPPED")
                || out.contains("PAUSED")
                || out.contains("START_PENDING")
                || out.contains("STOP_PENDING")
            {
                return ServiceStatusPayload {
                    installed: true,
                    running: false,
                    status: "STOPPED".to_string(),
                };
            }
        }
    }
    ServiceStatusPayload {
        installed: false,
        running: false,
        status: "NOT_INSTALLED".to_string(),
    }
}

#[tauri::command]
fn request_service_installation() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let exe_path = std::env::current_exe()
            .map_err(|e| format!("No se pudo determinar la ruta del ejecutable: {}", e))?;
        let parent_dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
        let service_exe = parent_dir.join("pc_manager_service.exe");
        let service_exe_str = service_exe.to_string_lossy().to_string();

        let ps_code = format!(
            r#"$ErrorActionPreference = 'Stop'
$dir = "$env:ProgramData\PCManager\telemetry"
if (-not (Test-Path $dir)) {{
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}}
icacls $dir /grant "*S-1-5-32-545:(OI)(CI)R" /t /q | Out-Null

$binDir = "$env:ProgramData\PCManager\bin"
if (-not (Test-Path $binDir)) {{
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}}
$installedBin = "$binDir\pc_manager_service.exe"
Copy-Item -Path '{}' -Destination $installedBin -Force

$svc = Get-Service -Name 'pc_manager_service' -ErrorAction SilentlyContinue
if (-not $svc) {{
    New-Service -Name 'pc_manager_service' -DisplayName 'PC Manager Core Host Service (Pre-logon & Telemetry)' -BinaryPathName ('"' + $installedBin + '"') -StartupType Automatic
}} else {{
    Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Services\pc_manager_service' -Name 'ImagePath' -Value ('"' + $installedBin + '"')
    Set-Service -Name 'pc_manager_service' -StartupType Automatic
}}
try {{
    Start-Service -Name 'pc_manager_service' -ErrorAction SilentlyContinue
}} catch {{}}
"#,
            service_exe_str.replace('\'', "''")
        );

        let b64 = encode_powershell_script(&ps_code);
        let launch_cmd = format!(
            "Start-Process powershell.exe -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand {}'",
            b64
        );

        let mut cmd = Command::new("powershell.exe");
        cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &launch_cmd]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        let output = cmd.output().map_err(|e| format!("Error al solicitar elevación UAC: {}", e))?;
        if !output.status.success() {
            return Err("La solicitud de instalación del servicio fue denegada o cancelada por el usuario.".to_string());
        }

        std::thread::sleep(std::time::Duration::from_millis(1000));

        let status = check_service_status();
        return if status.running {
            Ok("Servicio nativo del Core (Pre-logon y Service Host) instalado y en ejecución.".to_string())
        } else if status.installed {
            Ok("Servicio nativo del Core registrado correctamente en Windows.".to_string())
        } else {
            Err("No se pudo confirmar el registro del servicio en Windows Service Manager.".to_string())
        };
    }
    #[allow(unreachable_code)]
    Ok("Servicio no disponible en esta plataforma.".to_string())
}

#[tauri::command]
fn uninstall_module(app: AppHandle, module_id: String) -> Result<(), String> {
    module_manager::uninstall_package(&app, &module_id)
}

#[tauri::command]
fn toggle_module_active(app: AppHandle, module_id: String, active: bool) -> Result<(), String> {
    module_manager::set_module_active(&app, &module_id, active)
}

#[tauri::command]
fn save_module_setting(
    app: AppHandle,
    module_id: String,
    option_id: String,
    value: Value,
) -> Result<(), String> {
    module_manager::set_module_setting(&app, &module_id, &option_id, value)
}

#[tauri::command]
fn get_saved_settings(app: AppHandle, module_id: String) -> HashMap<String, Value> {
    let registry = module_manager::load_registry(&app);
    registry.settings.get(&module_id).cloned().unwrap_or_default()
}

#[tauri::command]
fn save_dashboard_order(app: AppHandle, card_order: Vec<String>) -> Result<(), String> {
    module_manager::set_dashboard_order(&app, card_order)
}

#[tauri::command]
fn get_dashboard_order(app: AppHandle) -> Vec<String> {
    let registry = module_manager::load_registry(&app);
    registry.card_order
}

#[tauri::command]
fn show_windows_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| format!("Error al emitir notificación en Windows: {}", e))?;
    Ok(())
}

fn base64_encode_bytes(data: &[u8]) -> String {
    const B64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        out.push(B64_CHARS[((triple >> 18) & 0x3F) as usize] as char);
        out.push(B64_CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(B64_CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(B64_CHARS[(triple & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

fn encode_powershell_script(script: &str) -> String {
    let utf16: Vec<u8> = script
        .encode_utf16()
        .flat_map(|u| u.to_le_bytes())
        .collect();
    base64_encode_bytes(&utf16)
}

#[tauri::command]
fn execute_module_script(
    app: AppHandle,
    module_id: String,
    script: String,
    interpreter: Option<String>,
) -> Result<String, String> {
    // 1. Validar permisos del módulo en el registro y que no esté vulnerado
    module_manager::can_module_execute(&app, &module_id)?;

    // 2. Validar que el script no atente contra la lista negra inmutable del sistema (Regla 5)
    module_security::validate_script_safety(&script)?;

    // 3. Determinar intérprete (default: powershell)
    let interp = interpreter.unwrap_or_else(|| "powershell".to_string());
    if interp == "powershell" || interp == "pwsh" {
        let utf16: Vec<u16> = script.encode_utf16().collect();
        let mut bytes = Vec::with_capacity(utf16.len() * 2);
        for u in utf16 {
            bytes.extend_from_slice(&u.to_le_bytes());
        }
        let encoded = base64_encode_bytes(&bytes);

        let mut cmd = std::process::Command::new("powershell");
        cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", &encoded]);

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let output = cmd.output().map_err(|e| format!("Error al ejecutar script para el módulo {}: {}", module_id, e))?;
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Fallo en la ejecución del script del módulo {}: {}", module_id, err));
        }

        let stdout_str = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout_str)
    } else {
        Err(format!("Intérprete no soportado o no autorizado: {}", interp))
    }
}

#[tauri::command]
fn get_storage_telemetry() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let path = std::path::Path::new(r"C:\ProgramData\PCManager\telemetry\storage_smart.json");
        if path.exists() {
            if let Ok(meta) = std::fs::metadata(path) {
                if let Ok(modified) = meta.modified() {
                    if let Ok(elapsed) = modified.elapsed() {
                        if elapsed.as_secs() < 120 {
                            if let Ok(content) = std::fs::read_to_string(path) {
                                return Some(content);
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
fn get_system_telemetry() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let path = std::path::Path::new(r"C:\ProgramData\PCManager\telemetry\system_telemetry.json");
        if path.exists() {
            if let Ok(meta) = std::fs::metadata(path) {
                if let Ok(modified) = meta.modified() {
                    if let Ok(elapsed) = modified.elapsed() {
                        if elapsed.as_secs() < 120 {
                            if let Ok(content) = std::fs::read_to_string(path) {
                                return Some(content);
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
fn toggle_service_state(start: bool) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let action = if start { "Start-Service" } else { "Stop-Service" };
        let ps_code = format!("{} -Name 'pc_manager_service'", action);
        let b64 = encode_powershell_script(&ps_code);
        let launch_cmd = format!(
            "Start-Process powershell.exe -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand {}'",
            b64
        );

        let mut cmd = Command::new("powershell.exe");
        cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &launch_cmd]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        let _ = cmd.output().map_err(|e| format!("Error modificando estado del servicio: {}", e))?;
        std::thread::sleep(std::time::Duration::from_millis(800));
        let status = check_service_status();
        return Ok(status.status);
    }
    #[allow(unreachable_code)]
    Ok("STOPPED".to_string())
}

#[tauri::command]
fn uninstall_windows_service() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let ps_code = "Stop-Service -Name 'pc_manager_service' -Force -ErrorAction SilentlyContinue; sc.exe delete pc_manager_service";
        let b64 = encode_powershell_script(ps_code);
        let launch_cmd = format!(
            "Start-Process powershell.exe -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand {}'",
            b64
        );

        let mut cmd = Command::new("powershell.exe");
        cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &launch_cmd]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        let _ = cmd.output().map_err(|e| format!("Error al desinstalar el servicio: {}", e))?;
        std::thread::sleep(std::time::Duration::from_millis(800));
        return Ok("Servicio eliminado del sistema.".to_string());
    }
    #[allow(unreachable_code)]
    Ok("Servicio no disponible.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            minimize_to_tray,
            quit_app,
            get_installed_modules,
            inspect_module_package,
            install_module_package,
            uninstall_module,
            toggle_module_active,
            save_module_setting,
            get_saved_settings,
            save_dashboard_order,
            get_dashboard_order,
            show_windows_notification,
            execute_module_script,
            check_service_status,
            request_service_installation,
            toggle_service_state,
            uninstall_windows_service,
            get_storage_telemetry,
            get_system_telemetry,
            get_modules_initialization_order
        ])
        .setup(|app| {
            // 1. Configuración del menú contextual nativo del Tray
            let show_item = MenuItem::with_id(app, "show", "Abrir PC Manager", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Ocultar a la Bandeja", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Cerrar PC Manager", true, None::<&str>)?;

            let tray_menu = Menu::with_items(app, &[
                &show_item,
                &hide_item,
                &quit_item,
            ])?;

            // 2. Construcción del icono del System Tray
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("PC Manager Core v0.0.4")
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => {
                        log::info!("Deteniendo aplicación y servicios desde menú de bandeja...");
                        coordinated_shutdown(app);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Interceptar evento de cierre para minimizar al System Tray (Regla 0 y Regla 8)
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
                log::info!("Ventana cerrada por el usuario: minimizada al System Tray.");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running PC Manager desktop application");
}
