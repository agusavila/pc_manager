// PC Manager - Windows Service Dedicated Daemon Binary
// Compilado como 'pc_manager_service.exe'
// Ejecuta el despachador de servicios de Windows bajo la cuenta NT AUTHORITY\SYSTEM

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "windows")]
    {
        let args: Vec<String> = std::env::args().collect();
        if args.iter().any(|a| a == "--collect-once") {
            pc_manager_lib::service::win_service::collect_once();
            println!("Telemetría generada exitosamente en C:\\ProgramData\\PCManager\\telemetry\\storage_smart.json");
            return;
        }

        if let Err(e) = pc_manager_lib::service::win_service::run_service() {
            eprintln!("Error iniciando despachador de servicio de Windows: {}", e);
        }
    }
}
