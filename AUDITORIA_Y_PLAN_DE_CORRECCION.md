# PC Manager — Auditoría técnica y plan obligatorio de corrección

## Destinatario

Este documento debe ser tratado como una **orden de refactorización y corrección técnica** para el agente que mantiene este repositorio.

El proyecto fue desarrollado principalmente mediante IA. El objetivo de esta auditoría es evitar que la documentación y la arquitectura aspiracional estén más avanzadas que la implementación real.

> **No agregues nuevas funcionalidades importantes hasta resolver los problemas críticos y de arquitectura indicados aquí.**

---

# 1. Diagnóstico general

El proyecto tiene buenas ideas arquitectónicas:

- arquitectura modular;
- `EventBus`;
- `ServiceRegistry`;
- lifecycle;
- módulos instalables;
- perfiles;
- dashboard configurable;
- Tauri + Rust;
- persistencia local;
- sistema `.pcm`.

Sin embargo, existe una diferencia importante entre la arquitectura documentada y la arquitectura realmente ejecutada.

El problema principal es que actualmente existen **dos arquitecturas parcialmente independientes**:

1. Un Core JavaScript en `src/core/`.
2. Un Core real en Rust/Tauri (`src-tauri/`), que maneja buena parte de la aplicación.

Esto genera código duplicado, tests que pueden pasar sobre componentes que no son el camino de ejecución principal y documentación que promete capacidades que todavía no están implementadas.

---

# 2. PRIORIDAD CRÍTICA

Orden obligatorio:

## P0 — Seguridad y consistencia

1. Seguridad del sistema de módulos `.pcm`.
2. Validación estricta de IDs y paths.
3. Decidir y documentar el modelo de seguridad de plugins.
4. Corregir persistencia transaccional.
5. Corregir instalación/desinstalación parcialmente fallida.
6. Eliminar capacidades falsas de la UI.
7. Unificar el Core.

## P1 — Arquitectura

8. Rust debe ser el Core real de la aplicación.
9. Definir API IPC clara entre UI y Rust.
10. Convertir `ServiceRegistry`, `EventBus`, lifecycle y ModuleManager en responsabilidades reales del Core.
11. Eliminar código duplicado/histórico.

## P2 — Mantenibilidad

12. Dividir `ui/index.html`.
13. Eliminar duplicación entre `index.html`, `core_shell.html` y `ui/index.html`.
14. Centralizar versionado.
15. Mejorar tests.

## P3 — Nuevas funcionalidades

Solo después de P0/P1/P2.

---

# 3. PROBLEMA CRÍTICO: seguridad de plugins

## Situación actual

El sistema carga código de módulos mediante una técnica equivalente a:

```js
const runFn = new Function(scriptCode);
runFn();
```

Esto significa que el código del módulo se ejecuta dentro del contexto de la aplicación.

Esto **NO constituye sandboxing**.

Por lo tanto hay que tomar una decisión explícita.

---

## Opción recomendada para esta etapa: plugins confiables

Para no convertir el proyecto en un sistema de sandboxing extremadamente complejo:

### Declarar oficialmente que los `.pcm` son código ejecutable confiable.

La documentación debe dejar claro:

> Instalar un módulo `.pcm` permite ejecutar código del módulo dentro del contexto de PC Manager. Los módulos deben considerarse software ejecutable y solo deben instalarse desde fuentes confiables.

No utilizar la palabra:

- sandbox;
- aislamiento;
- ejecución segura;

si no existe realmente ese aislamiento.

### IMPORTANTE

Las permissions del manifest no deben presentarse como mecanismo de seguridad si realmente no restringen las capacidades del módulo.

---

# 4. Validación estricta de `manifest.id`

Actualmente el ID del módulo participa en la construcción de paths.

Esto es peligroso.

Debe existir una función centralizada:

```rust
validate_module_id(id: &str) -> Result<(), Error>
```

Debe rechazar:

```text
..
.
/
\
:
C:
rutas absolutas
UNC paths
caracteres inválidos
IDs vacíos
IDs excesivamente largos
```

Preferir un formato similar a:

```regex
^[a-z0-9][a-z0-9._-]{0,63}$
```

La validación debe ejecutarse:

- al leer `manifest.json`;
- al instalar;
- al activar;
- al desinstalar;
- al cargar el registry.

No confiar únicamente en que la UI haya validado el valor.

---

# 5. Seguridad del ZIP `.pcm`

El instalador debe tratar el archivo `.pcm` como entrada completamente no confiable.

Validar:

- ZIP corrupto;
- manifest ausente;
- múltiples manifests;
- archivos con paths peligrosos;
- paths absolutos;
- `..`;
- tamaño máximo del paquete;
- cantidad máxima de archivos;
- tamaño total descomprimido;
- archivos individuales excesivamente grandes;
- manifest inválido;
- entrypoint inexistente;
- ID inválido;
- versión inválida;
- dependencias inválidas.

Debe existir protección contra ZIP bombs.

No extraer directamente a:

```text
modules/<id>/
```

---

# 6. Instalación transaccional

La instalación debe seguir aproximadamente este flujo:

```text
.pcm
 |
 v
validar ZIP
 |
 v
leer manifest
 |
 v
validar manifest
 |
 v
validar ID
 |
 v
crear staging directory
 |
 v
extraer al staging
 |
 v
validar contenido
 |
 v
rename/move atómico al destino final
 |
 v
actualizar registry
 |
 v
persistir registry
```

Ejemplo:

```text
modules/
    .staging/
        <uuid>/
    system.clock/
```

Si cualquier paso falla:

```text
staging/
    <uuid>/
```

debe eliminarse.

Nunca dejar una instalación medio realizada.

---

# 7. Persistencia del registry

Actualmente existe una escritura directa similar a:

```rust
fs::write(path, content)
```

No debe describirse como "atomic write".

Implementar una estrategia real:

```text
registry.json
registry.json.tmp
registry.json.bak
```

Flujo:

```text
serialize
    |
    v
registry.json.tmp
    |
    v
flush/sync cuando corresponda
    |
    v
backup anterior
    |
    v
rename tmp -> registry.json
```

Si `registry.json` está corrupto:

1. Intentar `.bak`.
2. Si `.bak` es válido, restaurarlo.
3. Si ambos fallan, informar claramente al usuario.
4. NO fingir silenciosamente que no existen módulos.

El comportamiento actual de:

```text
JSON corrupto
      ↓
RegistryState::default()
```

puede hacer parecer que todos los módulos desaparecieron.

Eso debe corregirse.

---

# 8. Desinstalación transaccional

Actualmente no se debe ignorar un error de:

```rust
remove_dir_all(...)
```

Nunca hacer:

```rust
let _ = fs::remove_dir_all(...)
```

sin comprobar el resultado.

La desinstalación debe:

1. comprobar que el módulo existe;
2. comprobar que no hay operaciones activas;
3. eliminar/mover el directorio;
4. comprobar el resultado;
5. actualizar registry;
6. persistir registry;
7. devolver éxito solamente cuando todos los pasos importantes hayan terminado.

Si falla la eliminación, el registry NO debe declarar el módulo como eliminado.

---

# 9. Lifecycle real

Existe un `LifecycleManager` JavaScript, pero la aplicación Tauri real tiene rutas que salen directamente mediante:

```rust
app.exit(0);
```

Eso rompe el concepto de shutdown coordinado.

Debe existir un único flujo:

```text
request_shutdown()
        |
        v
Core.shutdown()
        |
        +--> detener módulos
        |
        +--> detener servicios
        |
        +--> cancelar tareas
        |
        +--> persistir estado
        |
        +--> limpiar recursos
        |
        v
app.exit()
```

El Tray NO debe saltarse este proceso.

---

# 10. UNIFICAR EL CORE

## Decisión arquitectónica obligatoria

Para este proyecto, el Core real debe ser **Rust**.

La razón:

- Tauri ya usa Rust;
- las operaciones de sistema son nativas;
- hardware/servicios Windows pertenecen naturalmente al backend;
- evita duplicar lógica;
- permite un único lifecycle;
- permite un único ModuleManager;
- permite un único ServiceRegistry;
- facilita control de permisos.

---

# 11. Qué hacer con `src/core/`

No borrar inmediatamente.

Primero clasificar cada archivo:

```text
src/core/
    event_bus.js
    service_registry.js
    module_manager.js
    lifecycle_manager.js
    theme_engine.js
    index.js
```

Para cada uno determinar:

- ¿Tiene equivalente real en Rust?
- ¿Se utiliza actualmente?
- ¿Es código muerto?
- ¿Es prototipo?
- ¿Debe migrarse?
- ¿Debe convertirse en contrato/documentación?

La lógica de negocio no debe existir duplicada en JS y Rust.

Objetivo final:

```text
UI JS
  |
  | IPC
  v
Rust Core
  |
  +-- EventBus
  +-- ServiceRegistry
  +-- ModuleManager
  +-- Lifecycle
  +-- Persistence
  +-- Security
  +-- Services
```

---

# 12. IPC

Definir una API clara.

Ejemplo:

```text
module.list
module.install
module.uninstall
module.enable
module.disable
module.configure

system.info
system.telemetry

settings.get
settings.set

app.shutdown
```

La UI no debe implementar lógica de negocio duplicada.

La UI:

```text
render
user input
IPC
state presentation
```

El backend:

```text
validation
security
business logic
persistence
system access
```

---

# 13. ServiceRegistry

Mantener la idea de ServiceRegistry, pero hacerlo real.

Debe soportar:

```text
service ID
service version
provider module
dependencies
availability
```

Las versiones deben tener utilidad real.

Si un módulo necesita:

```text
telemetry.hardware >= 2.0
```

el Core debe poder comprobarlo.

No basta con:

```text
hasService(id)
```

---

# 14. ModuleManager

El ModuleManager debe tener:

```text
validate manifest
resolve dependencies
detect circular dependencies
topological initialization order
enable
disable
rollback
uninstall
upgrade
```

Debe detectar:

```text
A -> B
B -> C
C -> A
```

como ciclo inválido.

---

# 15. Estados de módulos

Definir estados explícitos:

```text
Installed
Disabled
Initializing
Enabled
Stopping
Failed
Blocked
Uninstalling
```

Evitar estados ambiguos.

Ejemplo:

Un módulo con dependencia faltante no debe aparecer como:

```text
Enabled
```

sino:

```text
Blocked
```

con una razón:

```text
Requires service telemetry.hardware >= 2.0
```

---

# 16. UI: `ui/index.html`

El archivo tiene aproximadamente 5.392 líneas.

Debe dividirse.

No hace falta introducir React si no se desea.

Vanilla JS es perfectamente válido.

Propuesta:

```text
ui/
├── index.html
├── css/
│   ├── tokens.css
│   ├── layout.css
│   ├── components.css
│   ├── dashboard.css
│   └── settings.css
│
└── js/
    ├── app.js
    ├── ipc.js
    ├── state/
    ├── dashboard/
    ├── modules/
    ├── settings/
    ├── profiles/
    ├── notifications/
    └── components/
```

No convertir esto en una reescritura estética.

El objetivo es mantenibilidad.

---

# 17. `innerHTML`

Reducir el uso de:

```js
element.innerHTML = ...
```

especialmente cuando el contenido proviene de:

- manifests;
- nombres de módulos;
- descripciones;
- IDs;
- configuraciones;
- datos externos.

Preferir:

```js
textContent
```

o creación explícita de nodos DOM.

Si se necesita HTML dinámico, sanitizarlo explícitamente.

---

# 18. CSP

Actualmente:

```json
"csp": null
```

Esto debe revisarse.

Definir una CSP adecuada para la aplicación.

IMPORTANTE:

No romper Tauri simplemente colocando una CSP arbitraria.

Primero identificar:

- recursos necesarios;
- inline scripts;
- inline styles;
- Tauri IPC;
- fuentes;
- assets.

Después aplicar una política restrictiva compatible con la aplicación.

---

# 19. `withGlobalTauri`

Revisar:

```json
"withGlobalTauri": true
```

Preferir APIs explícitas/importadas cuando sea posible.

El objetivo es reducir la superficie global disponible para código de módulos.

---

# 20. Permissions de módulos

Actualmente el manifest tiene algo como:

```json
"permissions": []
```

pero esto no debe venderse como seguridad si no está aplicado.

Decidir:

### Si los plugins son trusted:

Documentarlo claramente.

### Si se quieren plugins no confiables:

No fingir seguridad.

Habrá que diseñar aislamiento real, probablemente mediante procesos separados + IPC.

No implementar un "sandbox" falso con filtros JavaScript.

---

# 21. Funcionalidades falsas en UI

Revisar toda la UI buscando controles que aparentan implementar algo que todavía no existe.

Ejemplos conocidos:

```text
Iniciar con Windows
Modo Servicio
Minimizar al Tray
```

Si una función no está implementada:

### Opción A

Implementarla realmente.

### Opción B

Ocultarla/deshabilitarla.

### Opción C

Mostrar claramente:

```text
Experimental / Not implemented
```

Nunca hacer que un botón simplemente muestre una notificación diciendo que hizo algo cuando solamente guardó una configuración.

---

# 22. Archivos duplicados

Revisar:

```text
index.html
core_shell.html
ui/index.html
```

Hay grandes cantidades de UI duplicada.

Debe quedar una sola fuente de verdad.

Si `core_shell.html` es solamente un mockup:

Moverlo a:

```text
docs/
```

o a una carpeta explícitamente marcada como prototipo.

No mantener tres aplicaciones potenciales.

---

# 23. Versionado

Actualmente existen inconsistencias entre:

```text
package.json
package-lock.json
src/core/index.js
README
Tauri/Cargo
```

Debe existir una única fuente de versión.

Objetivo:

```text
0.0.2-alpha
```

debe aparecer de forma consistente.

No editar manualmente cinco versiones distintas.

---

# 24. Tests

Los tests actuales del Core JS son útiles, pero insuficientes porque gran parte de la aplicación real utiliza Rust.

Agregar tests para:

## Manifest

```text
valid manifest
missing manifest
invalid JSON
invalid ID
invalid version
missing entrypoint
invalid dependencies
```

## ZIP

```text
normal package
corrupt package
path traversal
absolute path
zip bomb
huge file
too many files
```

## Registry

```text
valid registry
corrupt registry
backup recovery
atomic save
duplicate module
```

## Lifecycle

```text
startup
module initialization
module failure
rollback
shutdown
module cleanup
```

## Dependencies

```text
missing dependency
dependency ordering
circular dependency
version mismatch
```

## Installation

```text
install
duplicate install
failed extraction
failed registry write
rollback
uninstall failure
```

---

# 25. Tests de seguridad obligatorios

Crear tests específicamente para:

```text
../../evil
../../../evil
..\..\evil
C:\evil
C:/evil
\\server\share
/absolute/path
```

También:

```text
module ID = ""
module ID = "."
module ID = ".."
module ID = "CON"
module ID = "NUL"
```

y casos de Windows reservados.

---

# 26. `build_dummy_pcm.cjs`

Convertir el módulo dummy en fixture.

Preferible:

```text
tests/
└── fixtures/
    └── system-clock/
        ├── manifest.json
        ├── module.js
        └── ...
```

y un script de packaging.

No mezclar fixtures de test con lógica del producto.

---

# 27. Documentación

La documentación debe distinguir claramente:

```text
IMPLEMENTED
EXPERIMENTAL
PLANNED
```

No documentar como existente algo que solo está diseñado.

Especialmente revisar afirmaciones sobre:

- sandbox;
- Windows Service;
- startup;
- permisos;
- lifecycle;
- aislamiento;
- atomicidad;
- dry-run.

---

# 28. `AGENTS.md`

Actualizar las instrucciones para IA.

Agregar reglas:

1. No implementar una feature ficticia.
2. No declarar sandbox si no existe aislamiento real.
3. No ignorar errores de filesystem.
4. No usar `unwrap()` en caminos de entrada externa.
5. No añadir lógica de negocio duplicada entre Rust y JS.
6. No crear otro ModuleManager.
7. No modificar tres UIs diferentes para una misma pantalla.
8. Ejecutar tests después de cambios.
9. Añadir tests para cada bug de seguridad.
10. Actualizar documentación cuando cambie la arquitectura.
11. No crear deuda técnica para "hacerlo funcionar rápido".
12. No continuar agregando features P3 si existen P0/P1 abiertos.

---

# 29. Criterios de aceptación P0

No considerar esta refactorización terminada hasta que:

- [ ] IDs de módulo estén estrictamente validados.
- [ ] No existan paths traversal.
- [ ] ZIPs estén validados antes de instalación.
- [ ] Exista límite de tamaño descomprimido.
- [ ] Instalación sea transaccional.
- [ ] Desinstalación maneje errores correctamente.
- [ ] Registry tenga escritura segura.
- [ ] Registry corrupto pueda recuperarse mediante backup.
- [ ] Shutdown sea coordinado.
- [ ] No se ignore silenciosamente ningún error crítico.
- [ ] Se haya decidido/documentado el modelo de seguridad de plugins.
- [ ] No se use "sandbox" para describir `new Function()`.

---

# 30. Criterios de aceptación P1

- [ ] Existe un único Core real.
- [ ] Rust es el Core.
- [ ] UI utiliza IPC.
- [ ] Existe un único ModuleManager.
- [ ] Existe un único lifecycle.
- [ ] Existe un único ServiceRegistry.
- [ ] Dependencias tienen resolución y detección de ciclos.
- [ ] Versiones de servicios tienen semántica real.
- [ ] Estados de módulos son explícitos.
- [ ] Los módulos bloqueados muestran la razón.

---

# 31. Criterios de aceptación P2

- [ ] `ui/index.html` está dividido.
- [ ] No existen tres UIs duplicadas.
- [ ] Versionado centralizado.
- [ ] Tests cubren Rust.
- [ ] Tests de seguridad existen.
- [ ] Fixtures de módulos están separados.
- [ ] Documentación distingue implementación actual de roadmap.

---

# 32. Regla importante para el agente

## NO hagas esto

No quiero una solución cosmética.

Ejemplos de soluciones incorrectas:

```text
Cambiar comentarios.
Cambiar README.
Renombrar funciones.
Agregar TODO.
Agregar try/catch que ignore errores.
Agregar una permission que nadie verifica.
Decir "sandbox" porque el módulo se ejecuta en una función.
Crear otra capa encima de la arquitectura existente.
```

Eso no resuelve los problemas.

---

# 33. Forma correcta de trabajar

Para cada problema:

1. Reproducirlo.
2. Identificar causa raíz.
3. Implementar solución.
4. Añadir test que reproduzca el bug.
5. Ejecutar tests.
6. Verificar compilación.
7. Revisar regresiones.
8. Actualizar documentación.
9. Recién entonces pasar al siguiente problema.

---

# 34. No hacer una reescritura innecesaria

NO borrar todo el proyecto y comenzar desde cero.

Conservar:

- diseño modular;
- conceptos de EventBus;
- ServiceRegistry;
- lifecycle;
- dashboard;
- perfiles;
- `.pcm`;
- ThemeEngine;
- diseño visual;
- documentación útil.

La tarea es **consolidar y endurecer**, no destruir el trabajo existente.

---

# 35. Orden de commits recomendado

Separar los cambios:

```text
fix(security): validate module identifiers and package paths

fix(security): harden pcm extraction

fix(storage): make registry persistence transactional

fix(modules): make install and uninstall transactional

fix(lifecycle): centralize application shutdown

refactor(core): make Rust the single application core

refactor(ui): split monolithic frontend

refactor(version): centralize application version

test(security): add malicious pcm package cases

test(modules): add dependency and rollback coverage

docs(architecture): align documentation with implementation
```

No mezclar todos los cambios en un commit gigante.

---

# 36. Resultado esperado

La arquitectura final debería parecerse conceptualmente a:

```text
                    ┌─────────────────────┐
                    │         UI          │
                    │ HTML / CSS / JS     │
                    └──────────┬──────────┘
                               │
                         Typed IPC
                               │
                    ┌──────────▼──────────┐
                    │      Rust Core      │
                    ├─────────────────────┤
                    │ Lifecycle           │
                    │ ModuleManager       │
                    │ ServiceRegistry     │
                    │ EventBus            │
                    │ Persistence         │
                    │ Security            │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
          Telemetry         Storage          Network
              │                │                │
              └────────────────┴────────────────┘
                               │
                         Windows APIs
```

Los módulos deben ser consumidores de servicios del Core y no convertirse en otra aplicación paralela dentro de PC Manager.

---

# 37. Checklist final que debe entregar el agente

Al terminar, entregar:

```text
1. Lista de archivos modificados.
2. Lista de archivos eliminados.
3. Lista de archivos nuevos.
4. Problemas P0 resueltos.
5. Problemas P1 resueltos.
6. Problemas P2 resueltos.
7. Tests añadidos.
8. Resultado de tests.
9. Resultado de cargo check/build.
10. Resultado de npm test si sigue existiendo.
11. Decisión final sobre seguridad de plugins.
12. Diagrama actualizado de arquitectura.
13. Lista de funcionalidades todavía NO implementadas.
14. Riesgos técnicos restantes.
```

---

# 38. Mensaje final al agente

No optimices para que el repositorio "parezca terminado".

Optimiza para que:

- el código haga realmente lo que dice la documentación;
- la documentación describa realmente lo que hace el código;
- los errores no se oculten;
- los módulos no puedan corromper el sistema de instalación;
- exista un único Core;
- exista una única fuente de verdad;
- y cada problema corregido tenga una prueba que impida que vuelva a aparecer.

**Primero corrige la arquitectura y seguridad. Después seguimos agregando funcionalidades.**

