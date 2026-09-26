# PLAN DE CORRECCIÓN Y REFACTOR DE PC MANAGER

## Objetivo

Este documento define el trabajo que debe realizar Antigravity para llevar `agusavila/pc_manager` desde su estado actual hasta una arquitectura sólida, coherente, mantenible y segura.

**Regla principal:** no intentar solucionar todo en un único cambio.

Cada fase debe:
1. Tener un objetivo concreto.
2. Mantener la aplicación compilable.
3. Ejecutar los tests existentes.
4. Agregar tests para lo modificado cuando corresponda.
5. No introducir funcionalidades fuera de la fase.
6. No reescribir archivos grandes innecesariamente.
7. Actualizar la documentación si cambia el comportamiento real.

---

# 0. REGLAS PARA ANTIGRAVITY

Antes de modificar código:

- Leer `AGENTS.md`.
- Inspeccionar el código actual; no asumir que la documentación describe correctamente la implementación.
- No inventar funcionalidades.
- No marcar una característica como implementada si solamente existe la UI.
- No crear otro sistema paralelo para resolver un problema existente.
- No duplicar lógica entre Rust y JavaScript.
- No hacer una migración masiva sin fases.
- No eliminar código antiguo hasta que el reemplazo esté funcionando.
- No ignorar errores con `let _ = ...` cuando puedan afectar el estado.
- No utilizar comentarios como sustituto de una implementación.
- No afirmar que existe sandboxing si los módulos ejecutan código con los mismos privilegios de la aplicación.
- No agregar dependencias innecesarias.

## Regla de oro

> Primero hacer que la arquitectura existente sea correcta. Después agregar funcionalidades nuevas.

---

# 1. ESTADO OBJETIVO

La arquitectura final debe aproximarse a:

```text
                         ┌──────────────────────┐
                         │         UI           │
                         │ HTML / CSS / JS      │
                         └──────────┬───────────┘
                                    │
                              Typed IPC
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      RUST CORE       │
                         │                      │
                         │ Lifecycle            │
                         │ ModuleManager        │
                         │ ServiceRegistry      │
                         │ EventBus             │
                         │ Security             │
                         │ Persistence           │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
                 Module A        Module B        Module C
```

Rust debe ser la autoridad real para:

- módulos
- servicios
- lifecycle
- persistencia
- seguridad
- configuración
- operaciones privilegiadas

JavaScript debe encargarse principalmente de:

- interfaz
- navegación
- formularios
- renderizado
- estado visual
- llamadas IPC mediante wrappers

---

# 2. FASE 1 — INVENTARIO Y BASELINE

**Dificultad: BÁSICA**

## Objetivo

Crear una fotografía exacta del proyecto antes de tocar arquitectura.

## Tareas

Documentar:

- estructura de carpetas
- entry points
- comandos Tauri
- comandos JavaScript
- Core Rust
- Core JavaScript
- ModuleManager Rust
- ModuleManager JS
- Lifecycle Rust
- Lifecycle JS
- ServiceRegistry
- EventBus
- instalación `.pcm`
- persistencia
- tests
- archivos duplicados
- versiones actuales

Crear:

`docs/ARCHITECTURE_BASELINE.md`

Clasificar todo como:

```text
IMPLEMENTADO
PARCIAL
EXPERIMENTAL
PLANEADO
DOCUMENTADO PERO NO IMPLEMENTADO
```

## Criterio de terminado

- Compila.
- Tests actuales pasan.
- Existe inventario real.
- La documentación no presenta como implementado algo inexistente.

---

# 3. FASE 2 — VERSIONADO ÚNICO

**Dificultad: BÁSICA**

## Problema

Hay referencias a versiones diferentes entre Rust, JS, tests y documentación.

## Objetivo

Tener una única fuente de verdad.

## Tareas

Centralizar la versión y hacer que la utilicen:

- Tauri
- Rust
- JS
- tests
- documentación

Buscar el repositorio completo y eliminar referencias antiguas que pretendan representar la versión actual.

---

# 4. FASE 3 — VALIDACIÓN ROBUSTA DE MODULE ID

**Dificultad: BÁSICA**

El `manifest.id` forma parte de rutas del filesystem.

## Regla recomendada

Aceptar:

```text
^[a-z0-9][a-z0-9._-]{0,63}$
```

Rechazar además:

```text
..
.
/
\
C:
CON
PRN
AUX
NUL
COM1...
LPT1...
```

## Tareas

Crear una única función:

`validate_module_id()`

Usarla antes de:

- instalar
- activar
- desactivar
- configurar
- desinstalar
- construir rutas

## Tests

Agregar casos para:

- IDs válidos
- vacío
- traversal
- rutas absolutas
- caracteres inválidos
- nombres reservados
- demasiado largos
- mayúsculas
- espacios

## Criterio

Ningún `manifest.id` llega al filesystem sin validación.

---

# 5. FASE 4 — HARDENING DEL .PCM

**Dificultad: MEDIA**

## Objetivo

Hacer que instalar un `.pcm` sea seguro.

Antes de extraer:

1. ZIP válido.
2. `manifest.json` presente.
3. JSON válido.
4. Manifest válido.
5. ID válido.
6. Versión válida.
7. Rutas seguras.
8. Sin rutas absolutas.
9. Sin `..`.
10. `enclosed_name()` válido.
11. Límite de archivos.
12. Límite de tamaño total descomprimido.
13. Límite por archivo.
14. Límite de profundidad.

Definir constantes como:

```text
MAX_FILES
MAX_TOTAL_UNCOMPRESSED_SIZE
MAX_FILE_SIZE
MAX_PATH_DEPTH
```

No usar números mágicos repartidos por el código.

---

# 6. FASE 5 — INSTALACIÓN TRANSACCIONAL

**Dificultad: MEDIA**

Nunca extraer directamente sobre:

```text
modules/<id>
```

Usar:

```text
PCM
 ↓
VALIDAR
 ↓
STAGING DIRECTORY
 ↓
extraer
 ↓
validar
 ↓
verificar integridad
 ↓
COMMIT
 ↓
modules/<id>
 ↓
registry
```

Si algo falla, eliminar staging y dejar el sistema como estaba.

## Criterio

Una instalación fallida no puede dejar un módulo aparentemente instalado.

---

# 7. FASE 6 — REGISTRY ROBUSTO

**Dificultad: MEDIA**

El registry debe sobrevivir a:

- crash
- cierre inesperado
- escritura incompleta
- corrupción

Usar:

```text
registry.json.tmp
registry.json
registry.json.bak
```

Flujo:

```text
crear contenido
 ↓
escribir .tmp
 ↓
flush/sync
 ↓
backup del actual
 ↓
rename .tmp → registry.json
```

Al arrancar:

```text
registry válido → usar

registry corrupto → recuperar backup

ambos corruptos → informar y conservar archivos
```

No convertir silenciosamente un registry corrupto en un registry vacío.

---

# 8. FASE 7 — DESINSTALACIÓN SEGURA

**Dificultad: BÁSICA**

No ignorar errores como:

```rust
let _ = fs::remove_dir_all(...)
```

Flujo:

```text
validar
 ↓
detener módulo
 ↓
eliminar filesystem
 ↓
¿éxito?
 ├─ NO → mantener registry
 └─ SÍ → actualizar registry
```

Si la carpeta no pudo eliminarse, el módulo no desaparece silenciosamente del registry.

---

# 9. FASE 8 — UNIFICAR EL CORE

**Dificultad: MEDIA**

Esta es la fase arquitectónica principal.

Rust pasa a ser el Core real.

No borrar todo el Core JS de golpe.

Definir progresivamente:

```text
RustCore
├── ModuleManager
├── ServiceRegistry
├── LifecycleManager
├── EventBus
├── SecurityManager
└── PersistenceManager
```

Migrar consumidores JS uno por uno.

Cuando una responsabilidad JS ya no tenga consumidores:

- eliminarla
- eliminar tests obsoletos
- actualizar documentación

## Regla

No mantener dos implementaciones activas de la misma responsabilidad.

---

# 10. FASE 9 — IPC LIMPIO Y TIPADO

**Dificultad: MEDIA**

La UI no debe conocer detalles internos de Rust.

Crear wrappers como:

```text
ui/api/modules.js
ui/api/settings.js
ui/api/system.js
```

Flujo:

```text
UI
 ↓
API wrapper
 ↓
Tauri invoke
 ↓
Rust command
 ↓
Core
```

Evitar `invoke()` arbitrariamente desde toda la UI.

---

# 11. FASE 10 — LIFECYCLE REAL

**Dificultad: MEDIA**

Debe existir una única secuencia de shutdown:

```text
REQUEST SHUTDOWN
 ↓
STOP NEW OPERATIONS
 ↓
STOP MODULES
 ↓
STOP SERVICES
 ↓
CANCEL TASKS
 ↓
PERSIST STATE
 ↓
CLEANUP
 ↓
APP EXIT
```

Todo cierre normal debe pasar por ella:

- botón Quit
- tray
- cierre de ventana
- otros caminos de cierre controlables

No usar directamente `app.exit(0)` como camino normal de shutdown.

---

# 12. FASE 11 — SEGURIDAD CRIPTOGRÁFICA

**Dificultad: MEDIA**

Solo después de estabilizar las fases anteriores.

Si `AGENTS.md` exige firmas, implementarlas realmente.

## Firma

Usar Ed25519:

```text
module.pcm
signature.sig
public key
 ↓
VERIFY
```

## Trust store

Estados claros:

```text
trusted
unknown
revoked
invalid
tampered
```

## Importante

Firma e aislamiento son cosas diferentes.

No llamar "sandbox" a un módulo simplemente porque esté firmado.

---

# 13. FASE 12 — PERMISOS REALES

**Dificultad: MEDIA**

Si el manifest declara permisos, deben aplicarse realmente.

Ejemplos:

```text
filesystem.read
filesystem.write
process.execute
network
input
system
```

Si un permiso todavía no está implementado:

> No presentarlo como una protección efectiva.

---

# 14. FASE 13 — INTEGRIDAD DINÁMICA

**Dificultad: MEDIA**

Si el sistema declara detectar modificaciones posteriores a la instalación:

```text
installed module
 ↓
known hashes
 ↓
runtime check
 ↓
OK / TAMPERED
```

Ante `TAMPERED`:

- informar al usuario
- registrar motivo
- aplicar la política definida
- no ocultar el problema

---

# 15. FASE 14 — TESTS DEL RUNTIME REAL

**Dificultad: MEDIA**

Mantener tests JS útiles, pero agregar tests Rust para el código realmente utilizado por Tauri.

## Mínimo

### Manifest
- válido
- inválido
- campos faltantes
- versiones inválidas

### Seguridad
- ID traversal
- path traversal
- ZIP malicioso
- archivos gigantes
- demasiados archivos
- permisos

### Registry
- lectura
- escritura
- corrupción
- backup
- recuperación

### Modules
- instalación
- reinstalación
- activación
- desactivación
- desinstalación
- errores

### Lifecycle
- startup
- shutdown
- stop de módulos
- stop de servicios
- persistencia

### Integridad
- hash correcto
- archivo modificado
- firma válida
- firma inválida
- clave desconocida

---

# 16. FASE 15 — DIVIDIR ui/index.html

**Dificultad: MEDIA**

Hacerlo después de estabilizar el Core.

Propuesta:

```text
ui/
├── index.html
├── css/
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   └── modules.css
│
├── js/
│   ├── app.js
│   ├── state.js
│   ├── navigation.js
│   ├── dashboard.js
│   ├── modules.js
│   ├── settings.js
│   └── notifications.js
│
└── api/
    ├── modules.js
    ├── settings.js
    └── system.js
```

No rediseñar la aplicación en esta fase. Solo separar responsabilidades.

---

# 17. FASE 16 — SEGURIDAD DE UI

**Dificultad: BÁSICA/MEDIA**

Revisar `innerHTML`.

Si el contenido viene de:

- manifest
- nombre de módulo
- configuración
- usuario
- filesystem

preferir:

```javascript
textContent
```

o creación explícita de nodos.

## CSP

Cuando la UI esté preparada, reemplazar:

```json
"csp": null
```

por una política deliberada y compatible con la aplicación real.

---

# 18. FASE 17 — ELIMINAR FUNCIONES FALSAS

**Dificultad: BÁSICA**

Buscar botones/settings que solamente:

- guardan una variable
- muestran una notificación
- aparentan hacer algo que no hacen

Para cada uno decidir:

```text
IMPLEMENTAR
DESACTIVAR
EXPERIMENTAL
ELIMINAR
```

Nunca dejar una UI que prometa una función inexistente.

---

# 19. FASE 18 — ELIMINAR DUPLICACIÓN

**Dificultad: BÁSICA**

Revisar archivos como:

```text
index.html
core_shell.html
ui/index.html
```

Eliminar copias manuales que representen la misma fuente.

Objetivo:

```text
una única fuente de verdad
```

---

# 20. FASE 19 — DOCUMENTACIÓN FINAL

**Dificultad: BÁSICA**

Actualizar:

```text
README.md
AGENTS.md
docs/
```

Separar:

```text
IMPLEMENTADO
EXPERIMENTAL
PLANEADO
```

La documentación debe describir el código actual, no la arquitectura deseada.

---

# 21. FASE 20 — PREPARAR MÓDULOS GRANDES

**Dificultad: MEDIA**

Solo después de completar las fases anteriores.

Los módulos deben comunicarse con Core mediante APIs definidas.

No deben:

- modificar directamente estructuras privadas del Core
- crear otro lifecycle
- crear otro ServiceRegistry
- acceder arbitrariamente a archivos internos
- depender de hacks de la UI

---

# 22. FASE 21 — INPUT MANAGER

**Dificultad: MEDIA**

Esta será una buena primera funcionalidad grande después del refactor.

No llamarlo simplemente "Macro Module".

Debe ser:

# Input Manager

Con capacidades similares conceptualmente a herramientas de remapeo por aplicación.

## Funciones

### Remapeo global

```text
Mouse 4 → Alt+Left
Mouse 5 → Alt+Right
```

### Perfiles por proceso

```text
GLOBAL
Chrome
Game.exe
Photoshop.exe
etc.
```

### Capas

```text
GLOBAL
 └── APPLICATION
      └── WINDOW
           └── LAYER
```

El perfil más específico sobrescribe al menos específico.

## Acciones

Un binding puede ejecutar:

```text
passthrough
key
hotkey
mouse button
macro
text
program
volume
disable
AHK
```

---

# 23. ARQUITECTURA DEL INPUT MANAGER

No implementar AHK como el Core.

Propuesta:

```text
Rust Core
└── InputManager
    ├── DeviceManager
    ├── ProfileManager
    ├── ProcessDetector
    ├── LayerManager
    ├── BindingResolver
    ├── MacroEngine
    └── Backends
         ├── NativeInput
         └── AutoHotkey
```

AHK debe ser un backend, no la representación interna de todos los macros.

Guardar macros en una estructura propia:

```json
{
  "id": "copy-paste",
  "name": "Copy Paste",
  "actions": [
    { "type": "key", "value": "CTRL+C" },
    { "type": "delay", "ms": 50 },
    { "type": "key", "value": "CTRL+V" }
  ]
}
```

Después el sistema puede traducirlos al backend correspondiente.

---

# 24. FASE 22 — CALIDAD FINAL

**Dificultad: BÁSICA**

Ejecutar todos los comandos de validación del proyecto, incluyendo cuando corresponda:

```text
cargo test
cargo check
npm test
npm run build
```

Revisar:

- warnings
- errores ignorados
- TODOs críticos
- código muerto
- dependencias sin uso
- documentación incorrecta
- logs excesivos
- permisos innecesarios
- comandos IPC innecesarios

Buscar específicamente:

```text
let _ =
unwrap()
expect()
innerHTML
app.exit(
fs::write(
remove_dir_all(
new Function(
eval(
withGlobalTauri
```

Cada aparición debe revisarse individualmente.

---

# 25. ORDEN RECOMENDADO DE COMMITS

Mantener commits pequeños:

```text
01 docs: add architecture baseline
02 refactor: centralize version
03 security: validate module ids
04 security: harden pcm extraction
05 refactor: transactional module installation
06 fix: transactional registry persistence
07 fix: safe module uninstall
08 refactor: introduce rust core services
09 refactor: migrate ipc to rust core
10 refactor: unify lifecycle
11 test: add rust runtime tests
12 security: add module signatures
13 security: add module permissions
14 security: add integrity verification
15 refactor: split ui assets
16 security: harden ui and csp
17 cleanup: remove fake features
18 cleanup: remove duplicated files
19 docs: synchronize implementation docs
20 feature: add input manager foundation
21 feature: add per-process input profiles
22 feature: add macro engine
23 feature: add ahk backend
```

Los nombres pueden variar, pero cada commit debe tener una responsabilidad clara.

---

# 26. CRITERIOS DE PROYECTO TERMINADO

## Arquitectura

- [ ] Rust es el Core real.
- [ ] No existen dos ModuleManager funcionales.
- [ ] No existen dos LifecycleManager funcionales.
- [ ] No existen dos ServiceRegistry funcionales.
- [ ] La UI utiliza IPC.
- [ ] Los módulos utilizan APIs del Core.

## Seguridad

- [ ] Module ID validado.
- [ ] ZIP endurecido.
- [ ] Instalación transaccional.
- [ ] Registry transaccional.
- [ ] Desinstalación segura.
- [ ] Firma Ed25519 implementada si se declara como requisito.
- [ ] Integridad implementada si se declara como requisito.
- [ ] Permisos realmente aplicados si se declaran como seguridad.
- [ ] No se afirma que existe sandboxing si no existe aislamiento real.

## Lifecycle

- [ ] Startup centralizado.
- [ ] Shutdown centralizado.
- [ ] Tray utiliza shutdown coordinado.
- [ ] Cierre de ventana utiliza shutdown coordinado.
- [ ] Módulos reciben stop.
- [ ] Servicios reciben stop.
- [ ] Estado persistido correctamente.

## UI

- [ ] `ui/index.html` ya no es un monolito.
- [ ] CSS separado.
- [ ] JS separado por responsabilidad.
- [ ] API IPC centralizada.
- [ ] `innerHTML` peligroso eliminado.
- [ ] CSP definida.
- [ ] No hay funciones falsas.

## Tests

- [ ] Tests Rust.
- [ ] Tests de manifest.
- [ ] Tests de ZIP.
- [ ] Tests de registry.
- [ ] Tests de instalación.
- [ ] Tests de desinstalación.
- [ ] Tests de lifecycle.
- [ ] Tests de seguridad.
- [ ] Tests de IPC donde corresponda.

## Documentación

- [ ] README coincide con el código.
- [ ] AGENTS coincide con la arquitectura real.
- [ ] IMPLEMENTADO / EXPERIMENTAL / PLANEADO están separados.
- [ ] No se documentan capacidades inexistentes.

---

# 27. REGLA FINAL PARA ANTIGRAVITY

No intentes demostrar que puedes reescribir todo el proyecto.

El objetivo es que cada fase deje el proyecto un poco más correcto que antes, sin romper lo anterior.

Cuando una fase termine:

1. Compilar.
2. Ejecutar tests.
3. Revisar cambios.
4. Corregir regresiones.
5. Documentar.
6. Hacer commit.
7. Recién entonces comenzar la siguiente fase.

Si una fase resulta demasiado grande, dividirla nuevamente.

## Prioridad absoluta

```text
CORRECCIÓN
    ↓
SEGURIDAD
    ↓
ESTABILIDAD
    ↓
ARQUITECTURA
    ↓
TESTS
    ↓
MANTENIBILIDAD
    ↓
NUEVAS FUNCIONES
```

No invertir ese orden.

---

# FIN
