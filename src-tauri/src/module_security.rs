use std::collections::{BTreeMap, HashMap};
use std::io::{Cursor, Read};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};

pub const OFFICIAL_TRUSTED_KEYS: &[&str] = &[
    "73472dc909e4221426a807d52c9f6438ad58688183bfbeaf40d992be7eae71a5",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SecurityStatus {
    Verified,
    UnverifiedAuthor,
    Unsigned,
    Tampered,
}

impl SecurityStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            SecurityStatus::Verified => "VERIFIED",
            SecurityStatus::UnverifiedAuthor => "UNVERIFIED_AUTHOR",
            SecurityStatus::Unsigned => "UNSIGNED",
            SecurityStatus::Tampered => "TAMPERED",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedManifest {
    pub id: String,
    pub version: String,
    pub files: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleSignatureFile {
    pub algorithm: String,
    pub public_key: String,
    pub signature: String,
    pub signed_manifest: SignedManifest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityVerificationResult {
    pub status: SecurityStatus,
    pub status_code: String,
    pub author: String,
    pub fingerprint: Option<String>,
    pub file_hashes: HashMap<String, String>,
    pub message: String,
}

/// Calcula el hash SHA-256 en formato hexadecimal de un buffer de bytes
pub fn compute_sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

/// Valida la seguridad, integridad y firma de un archivo .pcm en memoria
pub fn verify_archive_security(archive_bytes: &[u8]) -> Result<SecurityVerificationResult, String> {
    let mut archive = zip::ZipArchive::new(Cursor::new(archive_bytes))
        .map_err(|e| format!("El paquete no es un archivo .pcm (ZIP) válido: {}", e))?;

    let mut files_content: HashMap<String, Vec<u8>> = HashMap::new();
    let mut signature_raw: Option<Vec<u8>> = None;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Error leyendo entrada {} del paquete: {}", i, e))?;

        if file.is_dir() {
            continue;
        }

        let name = file.name().to_string();
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .map_err(|e| format!("Error leyendo archivo '{}': {}", name, e))?;

        if name == "signature.sig" {
            signature_raw = Some(buffer);
        } else {
            files_content.insert(name, buffer);
        }
    }

    if !files_content.contains_key("manifest.json") {
        return Err("El paquete no contiene un archivo 'manifest.json' en la raíz.".to_string());
    }

    let mut calculated_hashes = HashMap::new();
    for (name, content) in &files_content {
        calculated_hashes.insert(name.clone(), compute_sha256_hex(content));
    }

    let sig_bytes = match signature_raw {
        Some(b) => b,
        None => {
            return Ok(SecurityVerificationResult {
                status: SecurityStatus::Unsigned,
                status_code: SecurityStatus::Unsigned.as_str().to_string(),
                author: "Autor Desconocido / No Firmado".to_string(),
                fingerprint: None,
                file_hashes: calculated_hashes,
                message: "El módulo no contiene una firma criptográfica de autenticidad. Proceda con precaución.".to_string(),
            });
        }
    };

    let sig_file: ModuleSignatureFile = serde_json::from_slice(&sig_bytes)
        .map_err(|e| format!("Archivo signature.sig corrupto o malformado: {}", e))?;

    if sig_file.algorithm != "ed25519" {
        return Ok(SecurityVerificationResult {
            status: SecurityStatus::Tampered,
            status_code: SecurityStatus::Tampered.as_str().to_string(),
            author: "Desconocido".to_string(),
            fingerprint: None,
            file_hashes: calculated_hashes,
            message: format!("Algoritmo de firma no soportado: '{}'. Se requiere ed25519.", sig_file.algorithm),
        });
    }

    // 1. Validar integridad de cada archivo contra el manifiesto firmado
    for (filename, expected_hash) in &sig_file.signed_manifest.files {
        match calculated_hashes.get(filename) {
            Some(calc_hash) => {
                if calc_hash != expected_hash {
                    return Ok(SecurityVerificationResult {
                        status: SecurityStatus::Tampered,
                        status_code: SecurityStatus::Tampered.as_str().to_string(),
                        author: "Firma Rota".to_string(),
                        fingerprint: Some(sig_file.public_key.clone()),
                        file_hashes: calculated_hashes,
                        message: format!("El archivo '{}' ha sido modificado o está corrupto tras su firma.", filename),
                    });
                }
            }
            None => {
                return Ok(SecurityVerificationResult {
                    status: SecurityStatus::Tampered,
                    status_code: SecurityStatus::Tampered.as_str().to_string(),
                    author: "Firma Rota".to_string(),
                    fingerprint: Some(sig_file.public_key.clone()),
                    file_hashes: calculated_hashes,
                    message: format!("Falta el archivo requerido '{}' declarado en la firma.", filename),
                });
            }
        }
    }

    // Verificar si hay archivos extra no firmados
    let all_filenames: Vec<String> = calculated_hashes.keys().cloned().collect();
    for filename in all_filenames {
        if !sig_file.signed_manifest.files.contains_key(&filename) {
            return Ok(SecurityVerificationResult {
                status: SecurityStatus::Tampered,
                status_code: SecurityStatus::Tampered.as_str().to_string(),
                author: "Firma Rota".to_string(),
                fingerprint: Some(sig_file.public_key.clone()),
                file_hashes: calculated_hashes,
                message: format!("El paquete contiene un archivo no declarado en la firma: '{}'.", filename),
            });
        }
    }

    // 2. Verificar la firma Ed25519 sobre el manifiesto canónico
    let pub_bytes = hex::decode(&sig_file.public_key)
        .map_err(|e| format!("Llave pública inválida en signature.sig: {}", e))?;
    if pub_bytes.len() != 32 {
        return Err("La llave pública Ed25519 debe tener exactamente 32 bytes.".to_string());
    }

    let mut pub_array = [0u8; 32];
    pub_array.copy_from_slice(&pub_bytes);

    let verifying_key = VerifyingKey::from_bytes(&pub_array)
        .map_err(|e| format!("Error deserializando llave pública Ed25519: {}", e))?;

    let sig_raw_bytes = hex::decode(&sig_file.signature)
        .map_err(|e| format!("Firma inválida en signature.sig: {}", e))?;
    if sig_raw_bytes.len() != 64 {
        return Err("La firma Ed25519 debe tener exactamente 64 bytes.".to_string());
    }

    let mut sig_array = [0u8; 64];
    sig_array.copy_from_slice(&sig_raw_bytes);
    let signature = Signature::from_bytes(&sig_array);

    let canonical_json = serde_json::to_string(&sig_file.signed_manifest)
        .map_err(|e| format!("Error serializando manifiesto firmado: {}", e))?;

    if let Err(e) = verifying_key.verify(canonical_json.as_bytes(), &signature) {
        return Ok(SecurityVerificationResult {
            status: SecurityStatus::Tampered,
            status_code: SecurityStatus::Tampered.as_str().to_string(),
            author: "Firma Inválida".to_string(),
            fingerprint: Some(sig_file.public_key.clone()),
            file_hashes: calculated_hashes,
            message: format!("La firma criptográfica no es válida para este paquete: {}", e),
        });
    }

    // 3. Comprobar si la llave es de confianza oficial
    let is_trusted = OFFICIAL_TRUSTED_KEYS.contains(&sig_file.public_key.as_str());

    if is_trusted {
        Ok(SecurityVerificationResult {
            status: SecurityStatus::Verified,
            status_code: SecurityStatus::Verified.as_str().to_string(),
            author: "PC Manager Core Oficial (Verificado)".to_string(),
            fingerprint: Some(sig_file.public_key),
            file_hashes: calculated_hashes,
            message: "Firma criptográfica válida y emitida por la autoridad de desarrollo oficial de PC Manager.".to_string(),
        })
    } else {
        Ok(SecurityVerificationResult {
            status: SecurityStatus::UnverifiedAuthor,
            status_code: SecurityStatus::UnverifiedAuthor.as_str().to_string(),
            author: format!("Desarrollador Externo [{}]", &sig_file.public_key[..8]),
            fingerprint: Some(sig_file.public_key),
            file_hashes: calculated_hashes,
            message: "Firma criptográfica válida pero emitida por un desarrollador externo no registrado en las llaves maestras del Core.".to_string(),
        })
    }
}

/// Valida si un script viola la lista negra inmutable del sistema (Regla 5 de Seguridad)
pub fn validate_script_safety(script: &str) -> Result<(), String> {
    let lower = script.to_lowercase();

    // 1. Rutas del sistema y registros protegidos (búsqueda por subcadena estricta)
    let dangerous_paths = [
        "c:\\windows",
        "c:/windows",
        "system32",
        "syswow64",
        "winsxs",
        "driverstore",
        "hklm:\\sam",
        "hklm:\\security",
        "hklm:\\system",
        "del /s /q c:\\",
        "remove-item -recurse c:\\",
    ];

    for path in dangerous_paths {
        if lower.contains(path) {
            return Err(format!(
                "Operación bloqueada por política de seguridad inmutable (Regla 5): El script contiene la ruta protegida '{}'",
                path
            ));
        }
    }

    // 2. Comandos destructivos (verificación con límites de palabra para evitar falsos positivos con variables como $diskParts)
    let dangerous_commands = [
        "diskpart",
        "format",
        "clean all",
        "clear-disk",
        "remove-partition",
        "format-volume",
    ];

    for cmd in dangerous_commands {
        let mut start = 0;
        while let Some(idx) = lower[start..].find(cmd) {
            let abs_idx = start + idx;
            let before_char = if abs_idx > 0 {
                lower[..abs_idx].chars().last()
            } else {
                None
            };
            let after_idx = abs_idx + cmd.len();
            let after_char = lower[after_idx..].chars().next();

            // Caracteres que indican que es parte de una palabra, identificador o variable
            let is_preceded_by_var = before_char == Some('$');
            let is_preceded_by_word_char = match before_char {
                Some(c) => c.is_alphanumeric() || c == '_' || c == '-',
                None => false,
            };
            let is_followed_by_word_char = match after_char {
                Some(c) => c.is_alphanumeric() || c == '_' || c == '-',
                None => false,
            };

            // Es un comando ejecutable si no está dentro de un identificador/variable mayor
            if !is_preceded_by_var && !is_preceded_by_word_char && !is_followed_by_word_char {
                return Err(format!(
                    "Operación bloqueada por política de seguridad inmutable (Regla 5): El script contiene el comando no permitido '{}'",
                    cmd
                ));
            }
            start = abs_idx + cmd.len();
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_script_safety_allowed() {
        let safe_script = "Get-CimInstance Win32_DiskDrive | Select-Object Model, Size";
        assert!(validate_script_safety(safe_script).is_ok());

        // Verificar que variables como $diskParts o $parts no sean bloqueadas por error
        let variable_script = "$diskParts = @($parts | Where-Object { $_.DiskNumber -eq 0 }); $vols = $diskParts;";
        assert!(validate_script_safety(variable_script).is_ok());
    }

    #[test]
    fn test_collector_ps1_passes_validation() {
        let path = std::path::Path::new("../modules/disk-monitor/collector.ps1");
        if path.exists() {
            let script = fs::read_to_string(path).expect("No se pudo leer collector.ps1");
            let res = validate_script_safety(&script);
            assert!(res.is_ok(), "Fallo validando collector.ps1: {:?}", res.err());
        }
    }

    #[test]
    fn test_script_safety_blocked_diskpart_command() {
        let bad_script = "diskpart /s script.txt";
        let res = validate_script_safety(bad_script);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("diskpart"));
    }

    #[test]
    fn test_script_safety_blocked_system32() {
        let bad_script = "Remove-Item System32\\drivers -Recurse";
        let res = validate_script_safety(bad_script);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("system32"));
    }

    #[test]
    fn test_script_safety_blocked_format() {
        let bad_script = "format C: /FS:NTFS /Q";
        let res = validate_script_safety(bad_script);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("format"));
    }

    #[test]
    fn test_verify_disk_monitor_pcm() {
        let path = std::path::Path::new("../disk-monitor.pcm");
        if path.exists() {
            let bytes = fs::read(path).expect("No se pudo leer disk-monitor.pcm");
            let res = verify_archive_security(&bytes).expect("Fallo durante verificación");
            assert_eq!(res.status, SecurityStatus::Verified);
            assert_eq!(res.author, "PC Manager Core Oficial (Verificado)");
        }
    }

    #[test]
    fn test_verify_system_clock_pcm() {
        let path = std::path::Path::new("../system-clock.pcm");
        if path.exists() {
            let bytes = fs::read(path).expect("No se pudo leer system-clock.pcm");
            let res = verify_archive_security(&bytes).expect("Fallo durante verificación");
            assert_eq!(res.status, SecurityStatus::Verified);
        }
    }

    #[test]
    fn test_verify_dummy_widgets_pcm() {
        let path = std::path::Path::new("../dummy-widgets.pcm");
        if path.exists() {
            let bytes = fs::read(path).expect("No se pudo leer dummy-widgets.pcm");
            let res = verify_archive_security(&bytes).expect("Fallo durante verificación");
            assert_eq!(res.status, SecurityStatus::Verified);
            assert_eq!(res.author, "PC Manager Core Oficial (Verificado)");
        }
    }

    #[test]
    fn test_tampered_package_detected() {
        let path = std::path::Path::new("../disk-monitor.pcm");
        if path.exists() {
            let mut bytes = fs::read(path).expect("No se pudo leer disk-monitor.pcm");
            // Alterar deliberadamente bytes internos del archivo ZIP para simular sabotaje
            if bytes.len() > 100 {
                bytes[50] ^= 0xFF;
                let res = verify_archive_security(&bytes);
                // Debe fallar o retornar Tampered
                if let Ok(sec_res) = res {
                    assert_eq!(sec_res.status, SecurityStatus::Tampered);
                } else {
                    assert!(res.is_err());
                }
            }
        }
    }
}



