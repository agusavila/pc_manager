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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledModuleRecord {
    pub manifest: ModuleManifest,
    pub script_code: String,
    pub active: bool,
    pub install_date: String,
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

/// Ruta del archivo de registro central (registry.json)
fn get_registry_path(app: &AppHandle) -> Result<PathBuf, String> {
    let storage_dir = get_storage_dir(app)?;
    Ok(storage_dir.join("registry.json"))
}

/// Carga el estado del registro desde el disco duro de Windows
pub fn load_registry(app: &AppHandle) -> RegistryState {
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

/// Guarda el estado del registro atómicamente en el disco
pub fn save_registry(app: &AppHandle, state: &RegistryState) -> Result<(), String> {
    let path = get_registry_path(app)?;
    let content = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Error al serializar registry.json: {}", e))?;
    fs::write(&path, content)
        .map_err(|e| format!("Error al escribir registry.json: {}", e))?;
    Ok(())
}

/// Instala un paquete físico .pcm (descomprime en disco, persiste en registro)
pub fn install_package_bytes(app: &AppHandle, bytes: Vec<u8>) -> Result<InstalledModuleRecord, String> {
    let mut archive = zip::ZipArchive::new(Cursor::new(bytes))
        .map_err(|e| format!("El archivo no es un paquete .pcm (ZIP) válido: {}", e))?;

    // 1. Leer y validar manifest.json
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

    // 2. Extraer archivos en %APPDATA%\com.pcmanager.core\modules\<id>\
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

    // 3. Registrar en registry.json
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let record = InstalledModuleRecord {
        manifest: manifest.clone(),
        script_code,
        active: true,
        install_date: format!("{}", now),
    };

    let mut registry = load_registry(app);
    registry.modules.insert(manifest.id.clone(), record.clone());
    save_registry(app, &registry)?;

    log::info!(
        "Módulo '{}' (v{}) instalado físicamente en {:?}",
        manifest.name,
        manifest.version,
        module_dir
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

    let mut registry = load_registry(app);
    registry.modules.remove(module_id);
    registry.settings.remove(module_id);
    save_registry(app, &registry)?;

    log::info!("Módulo '{}' desinstalado y eliminado del disco duro.", module_id);
    Ok(())
}

/// Modifica el estado activo/inactivo de un módulo en disco
pub fn set_module_active(app: &AppHandle, module_id: &str, active: bool) -> Result<(), String> {
    let mut registry = load_registry(app);
    if let Some(record) = registry.modules.get_mut(module_id) {
        record.active = active;
        save_registry(app, &registry)?;
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
    let mut registry = load_registry(app);
    let mod_settings = registry.settings.entry(module_id.to_string()).or_default();
    mod_settings.insert(option_id.to_string(), value);
    save_registry(app, &registry)?;
    Ok(())
}

/// Guarda el orden de las tarjetas en el Dashboard
pub fn set_dashboard_order(app: &AppHandle, order: Vec<String>) -> Result<(), String> {
    let mut registry = load_registry(app);
    registry.card_order = order;
    save_registry(app, &registry)?;
    Ok(())
}
