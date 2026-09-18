// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
fn ensure_single_instance() -> bool {
    use windows_sys::Win32::{
        Foundation::{GetLastError, ERROR_ALREADY_EXISTS, HWND},
        System::Threading::CreateMutexW,
        UI::WindowsAndMessaging::{
            FindWindowW, SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOW,
        },
    };

    let mutex_name: Vec<u16> = "Local\\PCManager_Core_SingleInstance_Mutex\0"
        .encode_utf16()
        .collect();
    let mutex_handle = unsafe { CreateMutexW(std::ptr::null(), 1, mutex_name.as_ptr()) };

    if unsafe { GetLastError() } == ERROR_ALREADY_EXISTS {
        // Otra instancia ya está en ejecución en Windows.
        // Buscar la ventana principal "PC Manager" y restaurarla al primer plano.
        let window_title: Vec<u16> = "PC Manager\0".encode_utf16().collect();
        let hwnd: HWND = unsafe { FindWindowW(std::ptr::null(), window_title.as_ptr()) };
        if !hwnd.is_null() {
            unsafe {
                ShowWindow(hwnd, SW_RESTORE);
                ShowWindow(hwnd, SW_SHOW);
                SetForegroundWindow(hwnd);
            }
        }
        // Salir limpiamente sin levantar WebView2 ni generar colisiones HRESULT 0x800700AA
        return false;
    }

    // El descriptor del Mutex permanece abierto en el proceso hasta su finalización
    let _ = mutex_handle;
    true
}

fn main() {
    #[cfg(target_os = "windows")]
    {
        if std::env::args().any(|a| a == "--service") {
            if let Err(e) = pc_manager_lib::service::win_service::run_service() {
                eprintln!("Error ejecutando servicio de Windows: {}", e);
            }
            return;
        }

        if !ensure_single_instance() {
            return;
        }
    }

    pc_manager_lib::run();
}

