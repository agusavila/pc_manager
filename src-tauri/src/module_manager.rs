use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Cursor, Read, Write};
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleMetaOption {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub r#type: String,
    pub default: Value,
    #[serde(default)]
    pub options: Option<Vec<Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleWidget {
    pub id: String,
    pub name: String,
    pub size: String,
    pub html: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleView {
    pub id: String,
    pub name: String,
    pub html: String,
    #[serde(default)]
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub group: Option<String>,
    #[serde(default)]
    pub entrypoint: Option<String>,
    #[serde(default)]
    pub permissions: Vec<String>,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub provides_services: Vec<String>,
    #[serde(default)]
    pub meta_options: Vec<ModuleMetaOption>,
    #[serde(default)]
    pub widgets: Vec<ModuleWidget>,
    #[serde(default)]
    pub views: Vec<ModuleView>,
    #[serde(default)]
    pub requires_service: Option<bool>,
    #[serde(default)]
    pub service_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledModuleRecord {
    pub manifest: ModuleManifest,
    pub script_code: String,
    pub active: bool,
    pub install_date: String,
    #[serde(default)]
    pub signature_status: String,
    #[serde(default)]
    pub author_fingerprint: Option<String>,
    #[serde(default)]
    pub file_hashes: HashMap<String, String>,
    #[serde(default)]
    pub granted_permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageInspectionPayload {
    pub manifest: ModuleManifest,
    pub security_status: String,
    pub author: String,
    pub fingerprint: Option<String>,
    pub file_hashes: HashMap<String, String>,
    pub security_message: String,
    pub requires_service: bool,
    pub service_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RegistryState {
    pub modules: HashMap<String, InstalledModuleRecord>,
    pub settings: HashMap<String, HashMap<String, Value>>,
    pub card_order: Vec<String>,
}

/// Obtiene la ruta persistente de almacenamiento de PC Manager en Windows (%APPDATA%\com.pcmanager.core)
pub fn get_storage_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error al resolver app_data_dir: {}", e))?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Error al crear app_data_dir: {}", e))?;
    }
    Ok(dir)
}

use std::sync::Mutex;

static REGISTRY_MUTEX: Mutex<()> = Mutex::new(());

/// Ruta del archivo de registro central (registry.json)
fn get_registry_path(app: &AppHandle) -> Result<PathBuf, String> {
    let storage_dir = get_storage_dir(app)?;
    Ok(storage_dir.join("registry.json"))
}

fn load_registry_unlocked(app: &AppHandle) -> RegistryState {
    match get_registry_path(app) {
        Ok(path) => {
            if path.exists() {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(state) = serde_json::from_str::<RegistryState>(&content) {
                        return state;
                    }
                }
            }
        }
        Err(err) => {
            log::warn!("No se pudo resolver la ruta de registro: {}", err);
        }
    }
    RegistryState::default()
}

/// Carga el estado del registro desde el disco duro de Windows con exclusión mutua
pub fn load_registry(app: &AppHandle) -> RegistryState {
    let _guard = REGISTRY_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
    load_registry_unlocked(app)
}

fn save_registry_unlocked(app: &AppHandle, state: &RegistryState) -> Result<(), String> {
    let path = get_registry_path(app)?;
    let content = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Error al serializar registry.json: {}", e))?;
    fs::write(&path, content)
        .map_err(|e| format!("Error al escribir registry.json: {}", e))?;
    Ok(())
}

/// Guarda el estado del registro atómicamente en el disco con exclusión mutua
#[allow(dead_code)]
pub fn save_registry(app: &AppHandle, state: &RegistryState) -> Result<(), String> {
    let _guard = REGISTRY_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
    save_registry_unlocked(app, state)
}

/// Inspecciona un paquete físico .pcm antes de su instalación (auditoría previa)
pub fn inspect_package_bytes(bytes: &[u8]) -> Result<PackageInspectionPayload, String> {
    // 1. Verificación criptográfica y cálculo de hashes SHA-256
    let sec_result = crate::module_security::verify_archive_security(bytes)?;

    // 2. Extraer y parsear manifest.json
    let mut archive = zip::ZipArchive::new(Cursor::new(bytes))
        .map_err(|e| format!("El archivo no es un paquete .pcm (ZIP) válido: {}", e))?;

    let mut manifest_str = String::new();
    {
        let mut manifest_file = archive
            .by_name("manifest.json")
            .map_err(|_| "El paquete .pcm no contiene un manifest.json en su raíz".to_string())?;
        manifest_file
            .read_to_string(&mut manifest_str)
            .map_err(|e| format!("Error al leer manifest.json: {}", e))?;
    }

    let manifest: ModuleManifest = serde_json::from_str(&manifest_str)
        .map_err(|e| format!("Error al parsear manifest.json: {}", e))?;

    if manifest.id.trim().is_empty() || manifest.name.trim().is_empty() {
        return Err("El manifest.json debe contener id y name válidos".to_string());
    }

    let requires_service = manifest.requires_service.unwrap_or(false);
    let service_reason = manifest.service_reason.clone();

    Ok(PackageInspectionPayload {
        manifest,
        security_status: sec_result.status_code,
        author: sec_result.author,
        fingerprint: sec_result.fingerprint,
        file_hashes: sec_result.file_hashes,
        security_message: sec_result.message,
        requires_service,
        service_reason,
    })
}

/// Instala un paquete físico .pcm con verificación criptográfica y permisos concedidos
pub fn install_package_bytes(
    app: &AppHandle,
    bytes: Vec<u8>,
    granted_permissions: Option<Vec<String>>,
) -> Result<InstalledModuleRecord, String> {
    // 1. Verificación obligatoria de integridad criptográfica
    let sec_result = crate::module_security::verify_archive_security(&bytes)?;
    if sec_result.status == crate::module_security::SecurityStatus::Tampered {
        return Err(format!(
            "Instalación bloqueada por seguridad: {}",
            sec_result.message
        ));
    }

    let mut archive = zip::ZipArchive::new(Cursor::new(&bytes))
        .map_err(|e| format!("El archivo no es un paquete .pcm (ZIP) válido: {}", e))?;

    // 2. Leer y validar manifest.json
    let mut manifest_str = String::new();
    {
        let mut manifest_file = archive
            .by_name("manifest.json")
            .map_err(|_| "El paquete .pcm no contiene un manifest.json en su raíz".to_string())?;
        manifest_file
            .read_to_string(&mut manifest_str)
            .map_err(|e| format!("Error al leer manifest.json: {}", e))?;
    }

    let manifest: ModuleManifest = serde_json::from_str(&manifest_str)
        .map_err(|e| format!("Error al parsear manifest.json: {}", e))?;

    if manifest.id.trim().is_empty() || manifest.name.trim().is_empty() {
        return Err("El manifest.json debe contener id y name válidos".to_string());
    }

    // 3. Extraer archivos en %APPDATA%\com.pcmanager.core\modules\<id>\
    let storage_dir = get_storage_dir(app)?;
    let module_dir = storage_dir.join("modules").join(&manifest.id);
    if !module_dir.exists() {
        fs::create_dir_all(&module_dir)
            .map_err(|e| format!("Error al crear directorio para el módulo: {}", e))?;
    }

    let mut script_code = String::new();
    let entrypoint_name = manifest.entrypoint.clone().unwrap_or_else(|| "module.js".to_string());

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Error leyendo entrada {} del ZIP: {}", i, e))?;
        
        let outpath = match file.enclosed_name() {
            Some(path) => module_dir.join(path),
            None => continue,
        };

        if file.is_dir() {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            outfile.write_all(&buffer).map_err(|e| e.to_string())?;

            if file.name() == entrypoint_name {
                script_code = String::from_utf8_lossy(&buffer).to_string();
            }
        }
    }

    // 4. Registrar en registry.json con auditoría de seguridad
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let perms = granted_permissions.unwrap_or_else(|| manifest.permissions.clone());

    let record = InstalledModuleRecord {
        manifest: manifest.clone(),
        script_code,
        active: true,
        install_date: format!("{}", now),
        signature_status: sec_result.status_code,
        author_fingerprint: sec_result.fingerprint,
        file_hashes: sec_result.file_hashes,
        granted_permissions: perms,
    };

    {
        let _guard = REGISTRY_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
        let mut registry = load_registry_unlocked(app);
        registry.modules.insert(manifest.id.clone(), record.clone());
        save_registry_unlocked(app, &registry)?;
    }

    log::info!(
        "Módulo '{}' (v{}) instalado físicamente. Firma: {}",
        manifest.name,
        manifest.version,
        record.signature_status
    );

    Ok(record)
}

/// Desinstala un módulo: borra su carpeta física en disco y limpia el registro
pub fn uninstall_package(app: &AppHandle, module_id: &str) -> Result<(), String> {
    let storage_dir = get_storage_dir(app)?;
    let module_dir = storage_dir.join("modules").join(module_id);
    if module_dir.exists() {
        let _ = fs::remove_dir_all(&module_dir);
    }

    {
        let _guard = REGISTRY_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
        let mut registry = load_registry_unlocked(app);
        registry.modules.remove(module_id);
        registry.settings.remove(module_id);
        save_registry_unlocked(app, &registry)?;
    }

    log::info!("Módulo '{}' desinstalado y eliminado del disco duro.", module_id);
    Ok(())
}

/// Modifica el estado activo/inactivo de un módulo en disco
pub fn set_module_active(app: &AppHandle, module_id: &str, active: bool) -> Result<(), String> {
    let _guard = REGISTRY_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
    let mut registry = load_registry_unlocked(app);
    if let Some(record) = registry.modules.get_mut(module_id) {
        record.active = active;
        save_registry_unlocked(app, &registry)?;
        log::info!("Módulo '{}' cambiado a active={}.", module_id, active);
        Ok(())
    } else {
        Err(format!("Módulo '{}' no encontrado en el registro", module_id))
    }
}

/// Guarda un ajuste de meta-opción en disco
pub fn set_module_setting(
    app: &AppHandle,
    module_id: &str,
    option_id: &str,
    value: Value,
) -> Result<(), String> {
    let _guard = REGISTRY_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
    let mut registry = load_registry_unlocked(app);
    let mod_settings = registry.settings.entry(module_id.to_string()).or_default();
    mod_settings.insert(option_id.to_string(), value);
    save_registry_unlocked(app, &registry)?;
    Ok(())
}

/// Guarda el orden de las tarjetas en el Dashboard
pub fn set_dashboard_order(app: &AppHandle, order: Vec<String>) -> Result<(), String> {
    let _guard = REGISTRY_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
    let mut registry = load_registry_unlocked(app);
    registry.card_order = order;
    save_registry_unlocked(app, &registry)?;
    Ok(())
}

/// Valida si un módulo tiene permisos de ejecución en su manifiesto y no ha sido vulnerado
pub fn can_module_execute(app: &AppHandle, module_id: &str) -> Result<bool, String> {
    let _guard = REGISTRY_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
    let registry = load_registry_unlocked(app);
    if let Some(record) = registry.modules.get(module_id) {
        if !record.active {
            return Err(format!("El módulo '{}' está desactivado", module_id));
        }

        if record.signature_status == "TAMPERED" {
            return Err(format!(
                "Ejecución bloqueada por seguridad: La firma del módulo '{}' está corrupta o el paquete fue manipulado tras la instalación.",
                module_id
            ));
        }

        let perms = if !record.granted_permissions.is_empty() {
            &record.granted_permissions
        } else {
            &record.manifest.permissions
        };

        let has_perm = perms.iter().any(|p| {
            p == "system:execute" || p == "system:storage" || p == "system:hardware" || p == "system:all"
        });

        if !has_perm {
            return Err(format!(
                "El módulo '{}' no posee permisos autorizados para ejecutar scripts en el sistema operativo (requiere 'system:execute' o 'system:storage')",
                module_id
            ));
        }
        Ok(true)
    } else {
        Err(format!("Módulo '{}' no encontrado en el registro", module_id))
    }
}

