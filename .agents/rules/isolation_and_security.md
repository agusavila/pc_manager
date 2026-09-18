# Reglas de Aislamiento y Seguridad Operativa

## 1. Aislamiento Estricto de Proyectos (Zero Data Leakage)
- **Hermetismo de Contexto**: La IA y las herramientas de automatización tienen prohibido inspeccionar carpetas externas a `c:\Proyectos\pc_manager` (como otros directorios en `c:\Proyectos\` o rutas del usuario).
- **Prohibición de Suposiciones Cruzadas**: No se debe asumir que dependencias, variables de entorno, claves de API o configuraciones existentes en otros repositorios de la máquina deben trasladarse a este proyecto.
- Cualquier dato externo requiere consentimiento expreso, explícito y registrado del usuario.

---

## 2. Protección Inmutable del Sistema Operativo
Al tratarse de una herramienta que administra y diagnostica recursos del sistema en Windows, se establecen barreras de contención inquebrantables:

### 2.1. Lista de Rutas del Sistema Protegidas (Blacklist)
Está terminantemente prohibida cualquier operación de escritura, modificación o eliminación sobre:
- `%SystemRoot%` y subcarpetas (`C:\Windows`, `C:\Windows\System32`, `C:\Windows\SysWOW64`).
- Almacén de componentes y controladores (`WinSxS`, `DriverStore`).
- Directorios de arranque y particiones EFI / Recovery.
- Claves maestras del Registro de Windows que comprometan el arranque (`SYSTEM`, `SAM`, `SECURITY`, controladores de booteo).

### 2.2. Lista de Procesos Esenciales Protegidos
El Core y cualquier módulo de gestión de procesos deben bloquear intentos de finalización sobre los siguientes procesos críticos:
- `System`, `Registry`, `smss.exe`, `csrss.exe`, `wininit.exe`, `services.exe`, `lsass.exe`, `fontdrvhost.exe`.
- El proceso del shell (`explorer.exe`) solo podrá ser reiniciado (`restart`), nunca finalizado de forma definitiva sin confirmación de emergencia.

---

## 3. Modelo de Seguridad Criptográfica de Módulos (5 Capas de Contención)

Para impedir la ejecución de código no autorizado o malicioso a través de módulos `.pcm`, se implementa un modelo de defensa en profundidad de 5 capas:

### Capa 1: Firma Criptográfica Asimétrica (Ed25519 + SHA-256)
- Todo paquete `.pcm` contiene obligatoriamente un archivo `signature.sig` con:
  1. Hashes SHA-256 de cada archivo individual (`manifest.json`, `module.js`, `collector.ps1`, `icon.svg`, etc.).
  2. Firma digital Ed25519 generada sobre el manifiesto inmutable canónico con la clave privada del autor.
- El Core verifica la firma contra la lista de claves públicas de confianza (clave oficial del Core y autores verificados).
- Si un archivo es alterado, añadido o eliminado, el estado pasa inmediatamente a `TAMPERED` y el módulo queda **terminantemente bloqueado**.

### Capa 2: Inspección Previa y Diálogo de Consentimiento Explícito
- Ningún módulo se instala de forma silenciosa ni automática.
- Al cargar un paquete `.pcm`, el Core ejecuta una inspección (`inspect_module_package`) y presenta al usuario el **Modal de Seguridad y Auditoría de Permisos**:
  - Insignia de estado criptográfico (Verificado / Autor No Oficial / Alterado).
  - Huella digital pública del autor (Ed25519 fingerprint).
  - Lista granular de permisos solicitados con casillas de verificación para conceder o denegar privilegios.
  - Requerimientos de fondo (Servicio de Windows) con justificación técnica visible.

### Capa 3: Validación Estática de Scripts y Sandbox en Host Nativo
- Antes de invocar cualquier script (`execute_module_script`), el host nativo en Rust analiza su contenido (`validate_script_safety`):
  - Detección y bloqueo de comandos destructivos (`Format-Volume`, `diskpart`, `rmdir /s /q`, etc.).
  - Bloqueo de accesos a rutas restringidas del sistema operativo (`C:\Windows\System32`, `WinSxS`, colmenas `SAM`/`SECURITY`).
  - Verificación estricta de que el módulo cuenta con el permiso concedido (`system:execute`).

### Capa 4: Integridad Dinámica en Tiempo de Ejecución
- Antes de despachar cualquier llamada o permitir que un módulo registrado opere (`can_module_execute`), el Core recalcula los hashes SHA-256 de los archivos almacenados en disco contra el registro inmutable sellado al momento de la instalación.
- Si un script o archivo fue editado externamente tras la instalación, la ejecución se cancela de inmediato emitiendo una alerta de seguridad.

### Capa 5: Gobernanza del Servicio Nativo de Windows
- Los módulos no tienen acceso para ejecutar comandos arbitrarios en el contexto del servicio de Windows (`LocalSystem`).
- El servicio expone únicamente endpoints tipados y de solo lectura para telemetría de hardware (contadores de desgaste SMART, estado físico de buses).
- Si un módulo requiere el servicio (`requires_service: true`), debe declararlo en su manifiesto junto con la justificación técnica (`service_reason`), y el usuario debe autorizar la vinculación explícitamente.

---

## 4. Protocolos de Operación Segura

### 4.1. Principio Dry-Run (Simulación Previa Obligatoria)
- Toda función con capacidad destructiva o de modificación (liberación de espacio, eliminación de cachés, detención de servicios) debe implementar un modo `dry_run=True`.
- En modo Dry-Run, el sistema calcula y reporta:
  1. Lista detallada de elementos afectados.
  2. Tamaño total de bytes recuperables o estado previo/posterior.
  3. Advertencias de seguridad si algún archivo está en uso.
- La ejecución real solo se efectúa tras la validación y confirmación explícita del usuario o de la política configurada.

### 4.2. Prioridad de la Papelera de Reciclaje
- Salvo configuración técnica expresa para archivos temporales volátiles (archivos `.tmp` huérfanos con antigüedad validada), los archivos eliminados deben enviarse prioritariamente a la Papelera de Reciclaje del sistema para permitir recuperación en caso de error.

### 4.3. Trazabilidad y Registro de Auditoría
- Cada acción ejecutada por el Core o sus Módulos debe emitir un registro de auditoría con:
  - Marca de tiempo UTC e ISO local.
  - Identificador del módulo originador.
  - Acción ejecutada y parámetros aplicados.
  - Resultado (Éxito, Error, Omitido).
  - En caso de error, detalle seguro de la excepción sin filtrar información sensible del usuario.
