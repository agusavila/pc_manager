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

## 3. Protocolos de Operación Segura

### 3.1. Principio Dry-Run (Simulación Previa Obligatoria)
- Toda función con capacidad destructiva o de modificación (liberación de espacio, eliminación de cachés, detención de servicios) debe implementar un modo `dry_run=True`.
- En modo Dry-Run, el sistema calcula y reporta:
  1. Lista detallada de elementos afectados.
  2. Tamaño total de bytes recuperables o estado previo/posterior.
  3. Advertencias de seguridad si algún archivo está en uso.
- La ejecución real solo se efectúa tras la validación y confirmación explícita del usuario o de la política configurada.

### 3.2. Prioridad de la Papelera de Reciclaje
- Salvo configuración técnica expresa para archivos temporales volátiles (archivos `.tmp` huérfanos con antigüedad validada), los archivos eliminados deben enviarse prioritariamente a la Papelera de Reciclaje del sistema para permitir recuperación en caso de error.

### 3.3. Trazabilidad y Registro de Auditoría
- Cada acción ejecutada por el Core o sus Módulos debe emitir un registro de auditoría con:
  - Marca de tiempo UTC e ISO local.
  - Identificador del módulo originador.
  - Acción ejecutada y parámetros aplicados.
  - Resultado (Éxito, Error, Omitido).
  - En caso de error, detalle seguro de la excepción sin filtrar información sensible del usuario.
