# Guía de Desarrollador: Empaquetado, Firmado Criptográfico y Sandbox de Módulos

Esta guía técnica explica los estándares obligatorios para desarrollar, firmar y empaquetar extensiones `.pcm` para **PC Manager Core**.

---

## 1. Estructura Canónica de un Módulo `.pcm`

Un paquete `.pcm` es un archivo comprimido ZIP que contiene los siguientes archivos fundamentales:

```
mi-modulo.pcm (ZIP)
├── manifest.json       (Metadatos, permisos, vistas, widgets y opciones)
├── module.js           (Lógica JavaScript del módulo para WebView)
├── signature.sig       (Manifiesto sellado y firma asimétrica Ed25519)
├── README.md           (Documentación y notas de versión)
├── icon.svg            (Icono vectorial SVG oficial del módulo)
└── collector.ps1       (Opcional: script de telemetría para host nativo)
```

---

## 2. Definición del Manifiesto (`manifest.json`)

El manifiesto debe declarar de manera explícita todos los accesos requeridos.

```json
{
  "id": "mi-modulo",
  "name": "Nombre Formal del Módulo",
  "version": "1.0.0",
  "description": "Descripción concisa sin jergas informales.",
  "author": "White-Label Modular",
  "group": "General",
  "entrypoint": "module.js",
  "permissions": [
    "system:storage",
    "system:execute"
  ],
  "requires_service": true,
  "service_reason": "Lectura directa de telemetría física SMART mediante el colector del servicio de Windows.",
  "dependencies": [],
  "provides_services": [
    "mi_modulo.telemetria"
  ],
  "meta_options": [],
  "widgets": [],
  "views": []
}
```

### Campos de Seguridad Clave:
- `permissions`: Matriz de identificadores de permisos solicitados (`system:execute`, `system:storage`, `system:network`).
- `requires_service`: Valor booleano indicando si requiere el servicio de Windows de fondo.
- `service_reason`: Cadena de texto explicando formalmente el motivo técnico de dicho requerimiento para el usuario.

---

## 3. Generación del Archivo de Firma (`signature.sig`)

### 3.1 Estructura de `signature.sig`
```json
{
  "algorithm": "ed25519",
  "public_key": "73472dc909e4221426a807d52c9f6438ad58688183bfbeaf40d992be7eae71a5",
  "signature": "8a01f4c3... (128 caracteres hex, 64 bytes)",
  "signed_manifest": {
    "id": "mi-modulo",
    "version": "1.0.0",
    "files": {
      "README.md": "3c98a...",
      "collector.ps1": "a1b2c...",
      "icon.svg": "e4f5a...",
      "manifest.json": "0d4e7...",
      "module.js": "99b82..."
    }
  }
}
```

### 3.2 Reglas Criptográficas:
1. Todos los archivos del paquete (excepto el propio `signature.sig`) deben ser ordenados alfabéticamente por nombre antes de ser hasheados con **SHA-256**.
2. El objeto `signed_manifest` debe serializarse a JSON canónico estricto (`JSON.stringify(signedManifest)`).
3. La firma se calcula sobre los bytes UTF-8 del JSON serializado usando la clave privada **Ed25519**.

---

## 4. Utilidad de Firmado Automatizado (`tools/module_signer.cjs`)

El repositorio incluye una herramienta oficial para gestionar claves y firmar módulos:

```javascript
const { ensureKeyPair, signModuleFiles } = require('./tools/module_signer.cjs');

// Obtener par de claves oficial de desarrollo
const { pubHex, privateKey } = ensureKeyPair();

// Mapa de buffers de archivos a empaquetar
const filesMap = {
  'manifest.json': manifestBuffer,
  'module.js': moduleJsBuffer,
  'README.md': readmeBuffer
};

// Generar firma criptográfica
const sigData = signModuleFiles(filesMap, privateKey, pubHex, manifest);

// Incorporar signature.sig al ZIP antes de guardarlo
zip.file('signature.sig', JSON.stringify(sigData, null, 2));
```

---

## 5. Filtro de Seguridad de Scripts en Host Nativo (Sandbox Rust)

Cuando el módulo solicita ejecutar un script a través del IPC de Tauri (`execute_module_script`), el host nativo en Rust aplica las siguientes validaciones previas a la ejecución:

1. **Permiso Concedido**: El módulo debe tener `system:execute` en `granted_permissions`.
2. **Integridad de Hash**: El hash SHA-256 del script en disco debe coincidir con el registrado al momento de la instalación.
3. **Análisis de Contenido de Comandos (`validate_script_safety`)**:
   - Queda estrictamente bloqueado el acceso a carpetas del sistema (`C:\Windows\System32`, `WinSxS`).
   - Queda bloqueado el acceso a colmenas críticas del registro (`SAM`, `SECURITY`, `BCD`).
   - Se bloquean comandos destructivos de disco (`Format-Volume`, `diskpart`, `rmdir /s /q`).
