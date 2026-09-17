mod module_manager;

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

#[tauri::command]
fn quit_app(app: AppHandle) {
    log::info!("Cierre definitivo ordenado desde el Core. Deteniendo subprocesos...");
    app.exit(0);
}

#[tauri::command]
fn get_installed_modules(app: AppHandle) -> Vec<InstalledModuleRecord> {
    let registry = module_manager::load_registry(&app);
    registry.modules.into_values().collect()
}

#[tauri::command]
fn install_module_package(app: AppHandle, package_bytes: Vec<u8>) -> Result<InstalledModuleRecord, String> {
    module_manager::install_package_bytes(&app, package_bytes)
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

#[tauri::command]
fn get_disk_telemetry() -> Result<Value, String> {
    let script = r#"
$disks = @(Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, Model, SerialNumber, MediaType, BusType, Size, HealthStatus, OperationalStatus)
$parts = @(Get-Partition | Select-Object DiskNumber, PartitionNumber, DriveLetter, Size)
$vols = @(Get-Volume | Select-Object DriveLetter, FileSystemLabel, FileSystem, HealthStatus, SizeRemaining, Size)
$events = @(Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName=@('disk','Ntfs'); Id=7,55,98} -MaxEvents 15 -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id, ProviderName, Message)

[PSCustomObject]@{
    disks = $disks
    partitions = $parts
    volumes = $vols
    events = $events
} | ConvertTo-Json -Depth 4
"#;

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

    let output = cmd.output().map_err(|e| format!("Error al ejecutar telemetría de almacenamiento: {}", e))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Fallo en comando de telemetría de almacenamiento: {}", err));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let val: Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Error al deserializar telemetría de disco: {}. Salida: {}", e, json_str))?;
    Ok(val)
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
            install_module_package,
            uninstall_module,
            toggle_module_active,
            save_module_setting,
            get_saved_settings,
            save_dashboard_order,
            get_dashboard_order,
            show_windows_notification,
            get_disk_telemetry
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
                        app.exit(0);
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
