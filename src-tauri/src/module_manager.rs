use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};
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
    #[serde(default)]
    pub background_worker: Option<ModuleBackgroundWorker>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleBackgroundWorker {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub frequency: Option<String>,
    #[serde(default)]
    pub script: Option<String>,
    #[serde(default)]
    pub run_prelogon: Option<bool>,
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


/// Carga el registro con recuperación automática ante corrupción desde un directorio
pub fn load_registry_from_dir(storage_dir: &Path) -> RegistryState {
    let reg_path = storage_dir.join("registry.json");
    let bak_path = storage_dir.join("registry.json.bak");

    // 1. Intentar cargar el archivo principal
    if reg_path.exists() {
        match fs::read_to_string(&reg_path) {
            Ok(content) => match serde_json::from_str::<RegistryState>(&content) {
                Ok(state) => return state,
                Err(err) => {
                    log::error!(
                        "CRÍTICO: registry.json está corrupto o malformado: {}. Intentando restaurar desde .bak...",
                        err
                    );
                }
            },
            Err(err) => {
                log::error!(
                    "CRÍTICO: Error leyendo registry.json: {}. Intentando restaurar desde .bak...",
                    err
                );
            }
        }
    }

    // 2. Si falló el principal, intentar recuperar desde el respaldo .bak
    if bak_path.exists() {
        if let Ok(bak_content) = fs::read_to_string(&bak_path) {
            if let Ok(bak_state) = serde_json::from_str::<RegistryState>(&bak_content) {
                log::warn!("Recuperando registro de módulos exitosamente desde 'registry.json.bak'...");
                // Restaurar el backup como archivo activo
                let _ = fs::copy(&bak_path, &reg_path);
                return bak_state;
            } else {
                log::error!("CRÍTICO: El archivo de respaldo 'registry.json.bak' también está corrupto.");
            }
        }
    }

    // 3. Si ninguno existe (primera ejecución limpia), retornar registro vacío
    if !reg_path.exists() && !bak_path.exists() {
        return RegistryState::default();
    }

    // 4. Si ambos existían y ambos están corruptos, preservar el corrupto y emitir alerta
    let corrupt_path = storage_dir.join(format!("registry.json.corrupt_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs()));
    let _ = fs::rename(&reg_path, &corrupt_path);
    log::error!("Fallo irrecuperable: Se ha preservado el registro corrupto en {:?}.", corrupt_path);
    RegistryState::default()
}

/// Carga el registro con recuperación automática ante corrupción (Auditoría Técnica P0)
fn load_registry_unlocked(app: &AppHandle) -> RegistryState {
    let Ok(storage_dir) = get_storage_dir(app) else {
        return RegistryState::default();
    };
    load_registry_from_dir(&storage_dir)
}

/// Carga el estado del registro desde el disco duro de Windows con exclusión mutua
pub fn load_registry(app: &AppHandle) -> RegistryState {
    let _guard = REGISTRY_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
    load_registry_unlocked(app)
}

/// Guarda el estado del registro atómicamente en un directorio (.tmp -> sync -> .bak -> rename)
pub fn save_registry_to_dir(storage_dir: &Path, state: &RegistryState) -> Result<(), String> {
    let reg_path = storage_dir.join("registry.json");
    let tmp_path = storage_dir.join("registry.json.tmp");
    let bak_path = storage_dir.join("registry.json.bak");

    let content = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Error al serializar registry.json: {}", e))?;

    // 1. Escribir y sincronizar en archivo temporal
    {
        let mut file = File::create(&tmp_path)
            .map_err(|e| format!("Error al crear registry.json.tmp: {}", e))?;
        file.write_all(content.as_bytes())
            .map_err(|e| format!("Error al escribir en registry.json.tmp: {}", e))?;
        file.sync_all()
            .map_err(|e| format!("Error sincronizando registry.json.tmp a disco: {}", e))?;
    }

    // 2. Respaldar versión anterior a .bak si existe
    if reg_path.exists() {
        let _ = fs::copy(&reg_path, &bak_path);
    }

    // 3. Reemplazo atómico
    #[cfg(windows)]
    {
        if fs::rename(&tmp_path, &reg_path).is_err() {
            let _ = fs::remove_file(&reg_path);
            fs::rename(&tmp_path, &reg_path)
                .map_err(|e| format!("Error al reemplazar registry.json atómicamente: {}", e))?;
        }
    }
    #[cfg(not(windows))]
    {
        fs::rename(&tmp_path, &reg_path)
            .map_err(|e| format!("Error al reemplazar registry.json atómicamente: {}", e))?;
    }

    Ok(())
}

/// Guarda el estado del registro atómicamente (.tmp -> sync -> .bak -> rename) (Auditoría Técnica P0)
fn save_registry_unlocked(app: &AppHandle, state: &RegistryState) -> Result<(), String> {
    let storage_dir = get_storage_dir(app)?;
    save_registry_to_dir(&storage_dir, state)
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

    // 3. Validación estricta del identificador del módulo
    crate::module_security::validate_module_id(&manifest.id)?;

    if manifest.name.trim().is_empty() {
        return Err("El manifest.json debe contener un nombre (name) válido".to_string());
    }

    // 4. Verificar que el entrypoint declarado existe dentro del paquete
    let entrypoint_name = manifest.entrypoint.clone().unwrap_or_else(|| "module.js".to_string());
    if archive.by_name(&entrypoint_name).is_err() {
        return Err(format!(
            "El archivo de entrada '{}' declarado en manifest.json no existe en el paquete.",
            entrypoint_name
        ));
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

/// Instala un paquete físico .pcm con verificación criptográfica, staging y rollback atómico
pub fn install_package_bytes(
    app: &AppHandle,
    bytes: Vec<u8>,
    granted_permissions: Option<Vec<String>>,
) -> Result<InstalledModuleRecord, String> {
    // 1. Verificación obligatoria de integridad criptográfica y límites de paquete
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

    // Validación estricta del identificador
    crate::module_security::validate_module_id(&manifest.id)?;

    if manifest.name.trim().is_empty() {
        return Err("El manifest.json debe contener un nombre (name) válido".to_string());
    }

    let entrypoint_name = manifest.entrypoint.clone().unwrap_or_else(|| "module.js".to_string());
    if archive.by_name(&entrypoint_name).is_err() {
        return Err(format!(
            "El archivo de entrada '{}' declarado en manifest.json no existe en el paquete.",
            entrypoint_name
        ));
    }

    // 3. Preparación de Staging Transaccional (Auditoría Técnica P0)
    let storage_dir = get_storage_dir(app)?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let staging_parent = storage_dir.join("modules").join(".staging");
    fs::create_dir_all(&staging_parent)
        .map_err(|e| format!("Error al crear directorio de staging: {}", e))?;

    let staging_dir = staging_parent.join(format!("{}_{}", manifest.id, now));
    fs::create_dir_all(&staging_dir)
        .map_err(|e| format!("Error al crear directorio de preparación para el módulo: {}", e))?;

    // 4. Extracción segura hacia el directorio de staging con control anti-Zip-Slip
    let mut script_code = String::new();

    let extract_result: Result<(), String> = (|| {
        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("Error leyendo entrada {} del ZIP: {}", i, e))?;

            let enclosed = file.enclosed_name().ok_or_else(|| {
                format!("Intento de Zip Slip bloqueado en archivo '{}'", file.name())
            })?;

            let outpath = staging_dir.join(enclosed);

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
        Ok(())
    })();

    if let Err(err) = extract_result {
        // Rollback: limpiar staging incompleto
        let _ = fs::remove_dir_all(&staging_dir);
        return Err(format!("Fallo en extracción del paquete: {}", err));
    }

    // 5. Promoción atómica: Staging -> modules/<id>/ con respaldo si es actualización
    let module_dir = storage_dir.join("modules").join(&manifest.id);
    let backup_dir = storage_dir.join("modules").join(".backup").join(&manifest.id);
    let is_upgrade = module_dir.exists();

    if is_upgrade {
        if backup_dir.exists() {
            let _ = fs::remove_dir_all(&backup_dir);
        }
        if let Some(p) = backup_dir.parent() {
            let _ = fs::create_dir_all(p);
        }
        if let Err(e) = fs::rename(&module_dir, &backup_dir) {
            let _ = fs::remove_dir_all(&staging_dir);
            return Err(format!("Error al respaldar versión previa del módulo: {}", e));
        }
    }

    // Mover staging a module_dir
    if let Err(e) = fs::rename(&staging_dir, &module_dir) {
        // Rollback desde backup
        if is_upgrade && backup_dir.exists() {
            let _ = fs::rename(&backup_dir, &module_dir);
        }
        let _ = fs::remove_dir_all(&staging_dir);
        return Err(format!("Error al promover directorio de módulo desde staging: {}", e));
    }

    // 6. Registrar en registry.json con guardado atómico
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

    let save_res = {
        let _guard = REGISTRY_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
        let mut registry = load_registry_unlocked(app);
        registry.modules.insert(manifest.id.clone(), record.clone());
        save_registry_unlocked(app, &registry)
    };

    if let Err(err) = save_res {
        // Rollback físico si falla la persistencia del registro
        let _ = fs::remove_dir_all(&module_dir);
        if is_upgrade && backup_dir.exists() {
            let _ = fs::rename(&backup_dir, &module_dir);
        }
        return Err(format!("Fallo al persistir registro: {}", err));
    }

    // Éxito completo: limpiar backup temporal si existía
    if backup_dir.exists() {
        let _ = fs::remove_dir_all(&backup_dir);
    }

    log::info!(
        "Módulo '{}' (v{}) instalado exitosamente. Firma: {}",
        manifest.name,
        manifest.version,
        record.signature_status
    );

    Ok(record)
}

/// Desinstala un módulo transaccionalmente: borra su carpeta física y limpia el registro
pub fn uninstall_package(app: &AppHandle, module_id: &str) -> Result<(), String> {
    crate::module_security::validate_module_id(module_id)?;

    let storage_dir = get_storage_dir(app)?;
    let module_dir = storage_dir.join("modules").join(module_id);

    // 1. Borrado físico del directorio comprobando errores
    if module_dir.exists() {
        fs::remove_dir_all(&module_dir).map_err(|e| {
            format!(
                "Error al eliminar archivos físicos del módulo '{}': {}. El módulo NO ha sido removido del registro.",
                module_id, e
            )
        })?;
    }

    // 2. Si el borrado físico tuvo éxito (o no existía), limpiar registro
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
    crate::module_security::validate_module_id(module_id)?;
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
    crate::module_security::validate_module_id(module_id)?;
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
    crate::module_security::validate_module_id(module_id)?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn create_test_dir(prefix: &str) -> PathBuf {
        let count = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("pcm_{}_{}_{}", prefix, std::process::id(), count));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn test_atomic_save_and_load_registry() {
        let dir = create_test_dir("reg_basic");
        let mut state = RegistryState::default();
        state.card_order.push("card_1".to_string());
        state.card_order.push("card_2".to_string());

        let res = save_registry_to_dir(&dir, &state);
        assert!(res.is_ok(), "save_registry_to_dir failed: {:?}", res);

        let loaded = load_registry_from_dir(&dir);
        assert_eq!(loaded.card_order, vec!["card_1", "card_2"]);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_registry_backup_created_on_second_save() {
        let dir = create_test_dir("reg_bak");
        let mut state_a = RegistryState::default();
        state_a.card_order.push("initial".to_string());
        save_registry_to_dir(&dir, &state_a).unwrap();

        assert!(dir.join("registry.json").exists());
        assert!(!dir.join("registry.json.bak").exists());

        let mut state_b = RegistryState::default();
        state_b.card_order.push("updated".to_string());
        save_registry_to_dir(&dir, &state_b).unwrap();

        assert!(dir.join("registry.json").exists());
        assert!(dir.join("registry.json.bak").exists());

        let bak_content = fs::read_to_string(dir.join("registry.json.bak")).unwrap();
        let bak_state: RegistryState = serde_json::from_str(&bak_content).unwrap();
        assert_eq!(bak_state.card_order, vec!["initial"]);

        let loaded = load_registry_from_dir(&dir);
        assert_eq!(loaded.card_order, vec!["updated"]);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_registry_recovers_from_backup_when_primary_corrupted() {
        let dir = create_test_dir("reg_recover");
        let mut state_a = RegistryState::default();
        state_a.card_order.push("good_data".to_string());
        save_registry_to_dir(&dir, &state_a).unwrap();

        let mut state_b = RegistryState::default();
        state_b.card_order.push("state_b".to_string());
        save_registry_to_dir(&dir, &state_b).unwrap();

        // Corrupt the primary registry.json
        fs::write(dir.join("registry.json"), "{ NOT_VALID_JSON !!!").unwrap();

        // Load must recover from .bak (state_a)
        let loaded = load_registry_from_dir(&dir);
        assert_eq!(loaded.card_order, vec!["good_data"]);

        // registry.json must now be repaired (restored from .bak)
        let repaired_content = fs::read_to_string(dir.join("registry.json")).unwrap();
        let repaired_state: RegistryState = serde_json::from_str(&repaired_content).unwrap();
        assert_eq!(repaired_state.card_order, vec!["good_data"]);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_registry_handles_both_corrupted_gracefully() {
        let dir = create_test_dir("reg_both_corrupt");
        fs::write(dir.join("registry.json"), "CORRUPTED_PRIMARY").unwrap();
        fs::write(dir.join("registry.json.bak"), "CORRUPTED_BACKUP").unwrap();

        let loaded = load_registry_from_dir(&dir);
        assert!(loaded.modules.is_empty());
        assert!(loaded.card_order.is_empty());

        let _ = fs::remove_dir_all(&dir);
    }
}
