use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfoPayload {
    pub os_name: String,
    pub arch: String,
    pub version: String,
    pub status: String,
}

#[tauri::command]
fn get_system_info() -> SystemInfoPayload {
    SystemInfoPayload {
        os_name: "Windows NT".to_string(),
        arch: std::env::consts::ARCH.to_string(),
        version: "0.0.1-alpha".to_string(),
        status: "OPERATIONAL".to_string(),
    }
}

#[tauri::command]
fn minimize_to_tray(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    log::info!("Cierre definitivo ordenado desde el Core. Deteniendo subprocesos...");
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            minimize_to_tray,
            quit_app
        ])
        .setup(|app| {
            // 1. Configuración del menú contextual nativo del Tray
            let show_item = MenuItem::with_id(app, "show", "Abrir PC Manager", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Ocultar a la Bandeja", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Cerrar Aplicación (Cero Huérfanos)", true, None::<&str>)?;

            let tray_menu = Menu::with_items(app, &[
                &show_item,
                &hide_item,
                &quit_item,
            ])?;

            // 2. Construcción del icono del System Tray
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("PC Manager Core v0.0.1")
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
