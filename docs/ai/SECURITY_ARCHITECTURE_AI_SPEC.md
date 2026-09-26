# AI Specification: Arquitectura de Seguridad Criptográfica y Gobernanza de Módulos

Esta especificación formal define los contratos de datos, comandos IPC de Tauri y directivas de comportamiento para modelos de Inteligencia Artificial que generen, analicen o interactúen con módulos en el repositorio **PC Manager**.

---

## 1. Comandos IPC de Seguridad (Rust <-> Frontend)

### 1.1 `inspect_module_package`
- **Propósito**: Realiza la auditoría estática y validación criptográfica de un paquete `.pcm` antes de escribir nada en disco.
- **Entrada**:
  ```typescript
  {
    packageBytes: number[] // Bytes crudos del archivo .pcm (ZIP)
  }
  ```
- **Retorno (`PackageInspectionPayload`)**:
  ```typescript
  interface PackageInspectionPayload {
    manifest: ModuleManifest;
    security_status: "VERIFIED" | "UNVERIFIED_AUTHOR" | "TAMPERED";
    author: string;
    fingerprint: string | null; // Hex de la clave pública Ed25519 (64 caracteres)
    file_hashes: Record<string, string>; // Mapa de nombre de archivo -> SHA-256
    security_message: string;
    requires_service: boolean;
    service_reason: string | null;
  }
  ```

### 1.2 `install_module_package`
- **Propósito**: Ejecuta la instalación formal del módulo validando nuevamente la firma e incorporando los permisos explícitamente concedidos por el usuario.
- **Entrada**:
  ```typescript
  {
    packageBytes: number[];
    grantedPermissions?: string[]; // Permisos autorizados por el usuario
  }
  ```
- **Retorno (`InstalledModuleRecord`)**:
  ```typescript
  interface InstalledModuleRecord {
    manifest: ModuleManifest;
    script_code: string;
    active: boolean;
    install_date: string; // ISO 8601
    signature_status: "VERIFIED" | "UNVERIFIED_AUTHOR" | "TAMPERED";
    author_fingerprint: string | null;
    file_hashes: Record<string, string>;
    granted_permissions: string[];
  }
  ```

### 1.3 `check_service_status`
- **Propósito**: Consulta el estado operativo del servicio nativo de Windows (`services.msc`) sin permisos de elevación.
- **Retorno**:
  ```typescript
  {
    installed: boolean;
    running: boolean;
  }
  ```

### 1.4 `request_service_installation`
- **Propósito**: Solicita la instalación y arranque del servicio desacoplado de Windows para soporte pre-logon y telemetría de bajo nivel.
- **Retorno**: `string` (Mensaje de confirmación o estado del servicio).

---

## 2. Esquema de Manifiesto con Seguridad (`ModuleManifest`)

```typescript
interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  group?: string;
  entrypoint?: string;
  permissions: string[];        // Ej: ["system:storage", "system:execute"]
  dependencies: string[];
  provides_services: string[];
  meta_options: ModuleMetaOption[];
  widgets: ModuleWidget[];
  views: ModuleView[];
  requires_service?: boolean;   // true si requiere servicio de Windows
  service_reason?: string;      // justificación técnica obligatoria
}
```

---

## 3. Modelo de Confianza y Garantías Reales (Plugins Confiables)

PC Manager implementa un modelo de **Plugins Confiables con Firma Criptográfica (Ed25519 + SHA-256)**.
- **Claridad Arquitectónica**: En el frontend (WebView2), el código JavaScript de los módulos se ejecuta en el contexto del renderizador; **no constituye un sandbox a nivel de proceso del sistema operativo**.
- **Garantías Reales Implementadas**:
  1. **Autenticidad e Integridad de Autoría**: Firma asimétrica Ed25519 y comprobación SHA-256 archivo por archivo. Paquetes no firmados o manipulados (`TAMPERED`) son bloqueados.
  2. **Endurecimiento de Paquetes (Anti Zip-Slip y Zip-Bomb)**: Cuotas estrictas (25 MB archivo, 60 MB descomprimido, 250 archivos máx., 20 MB archivo individual). Bloqueo total de rutas relativas `..`, barras invertidas y nombres reservados de Windows (`CON`, `PRN`, etc.).
  3. **Identificadores de Módulo Estrictos**: Validación regex `^[a-z0-9][a-z0-9._-]{0,63}$` para evitar evasión de rutas en disco.
  4. **Instalación Transaccional con Rollback**: Extracción en `.staging/`, verificación de entrypoint y respaldo previo en `.backup/` ante actualizaciones. Si algo falla, se restaura el estado previo intacto.
  5. **Filtro Estático de Scripts en Host Nativo (Rust)**: `validate_script_safety` bloquea comandos destructivos (`Format-Volume`, `diskpart`) y acceso a directorios críticos del sistema (`System32`, `WinSxS`, registros `SAM`/`SECURITY`).
  6. **Gobernanza del Servicio de Windows**: El servicio opera en modo desacoplado de solo lectura para telemetría; está prohibida la recepción o ejecución de comandos remotos arbitrarios en el servicio.

---

## 4. Directivas de Comportamiento Estricto para Agentes IA

1. **Prohibición de Instalación No Auditada**: Los agentes de IA nunca deben saltear `inspect_module_package` al generar herramientas o scripts de prueba. Todo módulo de prueba debe compilarse con su firma respectiva utilizando `tools/module_signer.cjs`.
2. **Prohibición de Comandos en la Lista Negra**: Cualquier script que un agente genere para un módulo (`collector.ps1` o llamadas nativas) debe respetar estrictamente:
   - Cero comandos destructivos (`Format-Volume`, `diskpart`, `rmdir /s /q`).
   - Cero escrituras o manipulaciones de rutas de Windows (`System32`, `WinSxS`, colmenas del registro `SAM`, `SECURITY`, `BCD`).
3. **Mantenimiento de Llave Pública Oficial**:
   - Clave pública de desarrollo del Core:
     `73472dc909e4221426a807d52c9f6438ad58688183bfbeaf40d992be7eae71a5`
   - Toda generación de módulos oficiales debe usar esta clave para que el estado criptográfico resulte `VERIFIED`.
