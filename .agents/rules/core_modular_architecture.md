# Regla de Arquitectura: Core-Modular (Carcasa Extensible)

## 1. Principio Fundamental y Naturaleza del Sistema
El proyecto **PC Manager** no es un script monolítico ni una aplicación web cliente-servidor. Es un **Software de Escritorio Nativo de Computadora (Desktop Application)** para Windows basado en **Rust + Tauri** con arquitectura **Core-Modular** (microkernel / plugin-driven).

- **Backend / Core Shell en Rust**: Encargado de la ventana nativa, integración profunda con el **System Tray (bandeja del sistema)** de Windows, inicio con el SO, modo servicio pre-logon y gestión determinista de subprocesos.
- **Frontend / Capa de Presentación**: Interfaz gráfica moderna (Material Expressive) renderizada en la WebView de Tauri, interactuando con el Core mediante contratos desacoplados.
- **Prohibición Expresa**: Queda terminantemente prohibido concebir este proyecto como una aplicación web alojada en servidor HTTP. Es un programa ejecutable nativo para PC.

---

## 2. Responsabilidades del Core (La Carcasa)
El Core debe permanecer ligero, robusto y centrado en la orquestación:
1. **Gestor de Ciclo de Vida**: Controla las fases de arranque (`boot`), registro de módulos (`register`), inicialización (`init`), ejecución (`run`) y apagado ordenado (`shutdown`).
2. **Registro de Módulos (Plugin Registry)**:
   - Permite el descubrimiento dinámico y registro explícito de módulos.
   - Valida que cada módulo implemente la interfaz contractual base (`IModule` / `BaseModule`).
   - Permite habilitar o deshabilitar módulos mediante configuración sin recompilar o alterar el núcleo.
3. **Bus de Eventos / Mensajería Interna**:
   - Facilita la comunicación desacoplada entre módulos o entre el Core y la interfaz de usuario.
   - Prohíbe el acoplamiento directo punto a punto entre módulos (el Módulo A nunca debe importar directamente el Módulo B; la interacción se realiza mediante eventos o servicios expuestos al registro).
4. **Configuración y Almacenamiento Centralizado**:
   - Proporciona a los módulos acceso seguro a sus propios espacios de configuración y caché local.
5. **Auditoría y Telemetría Interna**:
   - Registro unificado de eventos y errores con niveles estructurados (DEBUG, INFO, WARN, ERROR, AUDIT).

---

## 3. Contrato de Módulo (Plugin Standard)
Todo módulo debe satisfacer los siguientes requisitos:
- **Aislamiento de Fallos**: Si un módulo lanza una excepción no capturada o falla durante su ejecución, el Core debe aislar el error, registrarlo y continuar operando con los demás módulos activos.
- **Manifiesto de Módulo (`manifest.json` o metadatos)**:
  - Identificador único (kebab-case, neutral).
  - Nombre legible en formato White-Label.
  - Versión semántica (`semver`).
  - Descripción funcional.
  - Grupo al que pertenece (por defecto `"General"`).
  - Capacidades/Servicios que provee (`provides_services`).
  - Dependencias obligatorias de otros módulos o servicios (`dependencies` / `requires_services`).
- **Ciclo de Vida Estandarizado**:
  - `on_load(context)`: Carga de dependencias internas, acceso al registro de servicios compartidos y lectura de configuración.
  - `on_enable()`: Activación de tareas periódicas o escucha de eventos.
  - `on_disable()`: Limpieza de recursos, timers o descriptores abiertos.
  - `get_status()`: Estado de salud y métricas operativas del módulo.
- **Acceso Obligatorio a Configuraciones desde Pantalla Principal**:
  - Si un módulo declara opciones de configuración (`manifest.meta_options` o panel en Configuraciones), su pantalla principal (vista dedicada en `manifest.views`) debe incluir obligatoriamente en su cabecera o interfaz un botón estilizado (`btn btn-secondary` o `btn-icon`) que dirija al usuario directamente a la pestaña de configuración de ese módulo (`switchView('settings')` y `switchSettingsTab('mod-' + moduleId)`).
  - La barra superior del Core (`top-bar`) inyectará de forma complementaria esta acción para garantizar navegación inmediata y sin fricciones.

---

## 4. Grupos de Módulos y Reagrupación Automática
Para organizar la aplicación a medida que crece el catálogo de extensiones:
1. **Grupo "General" Inmutable**:
   - Existe por defecto en el sistema y es **inborrable**.
   - Todo módulo nuevo que no declare un grupo específico se asigna a `"General"`.
2. **Grupos Personalizados**:
   - El usuario puede crear, renombrar y eliminar grupos personalizados (ej: *"Monitoreo"*, *"Almacenamiento"*, *"Periféricos"*).
3. **Cascarón de Seguridad ante Eliminación de Grupos**:
   - Si el usuario elimina un grupo personalizado que contiene módulos activos, **el Core reasigna automáticamente todos los módulos afectados al grupo "General"**, evitando módulos huérfanos o inconsistencias visuales.
4. **Ocultamiento Automático de Grupos Vacíos**:
   - Si todos los módulos asignados a un grupo son deshabilitados o desinstalados, el encabezado del grupo **se oculta automáticamente de la navegación lateral**.
   - Tan pronto como al menos un módulo del grupo vuelva a habilitarse, el grupo reaparece de inmediato en el Sidebar.

---

## 5. Servicios Compartidos y Protocolo Estricto de Dependencias
Para evitar duplicar código (por ejemplo, evitar que múltiples módulos lean independientemente la telemetría de CPU/temperatura):
1. **Registro de Servicios del Core (`ServiceRegistry`)**:
   - Un módulo proveedor (ej. `telemetry-provider`) registra un servicio formal en el Core: `context.services.register("hardware.telemetry", TelemetryServiceInstance)`.
2. **Consumo de Servicios por Módulos Dependientes**:
   - Un módulo de control periférico (ej. `cooler-controller` con pantalla digital) declara en su manifiesto:
     ```json
     "dependencies": ["telemetry-provider"],
     "requires_services": ["hardware.telemetry"]
     ```
   - El módulo consumidor obtiene los datos directamente: `telemetry = context.services.get("hardware.telemetry")`.
3. **Bloqueo Estricto por Dependencias Insatisfechas**:
   - **Regla de Bloqueo Total**: Si un usuario instala un módulo que requiere otro (ej: `cooler-controller` requiere `telemetry-provider`), el sistema **impide su activación** y muestra una advertencia de bloqueo explícita:
     > *"Este módulo no puede habilitarse porque requiere el módulo 'Telemetría de Sistema'. Por favor, instale y active dicho módulo primero."*
   - El botón de habilitar queda **deshabilitado con estado bloqueado** hasta que la dependencia esté físicamente instalada y en estado activo.
4. **Protocolo Asistido ante Desinstalación con Dependencias (Sin Bloqueo Ciego)**:
   - Si el usuario solicita eliminar un módulo proveedor (ej. `telemetry-provider`) del cual dependen otros módulos (ej. `cooler-controller`), el sistema **no bloquea arbitrariamente la acción**.
   - En su lugar, el Core despliega un diálogo de decisión donde el usuario elige:
     a) **Desactivar módulos dependientes**: Se elimina el módulo proveedor y los módulos dependientes se conservan instalados pero pasan automáticamente a estado inactivo/suspendido.
     b) **Eliminar en cascada**: Se desinstala el módulo proveedor y todos los módulos dependientes asociados en una sola operación.
     c) **Cancelar**: Se cancela la desinstalación y todo permanece intacto.

---

## 6. Formato Nativo de Módulo: `.pcm` (PC Manager Module)
El formato canónico, oficial y universal de paquetes para PC Manager es **`.pcm`** (*PC Manager Module*):
- Todo módulo exportado o compartido debe tener la extensión `.pcm`.
- Un archivo `.pcm` es un paquete comprimido y firmado estructuralmente que contiene:
  1. `manifest.json`: Metadatos, dependencias, grupo y servicios.
  2. `icon.svg`: Iconografía vectorial limpia.
  3. `widgets/`: Componentes para el Dashboard 10x10.
  4. `views/`: Vista dedicada para el Sidebar.
  5. `docs/`: Tríada obligatoria de documentación.

---

## 7. Pantalla del Gestor de Módulos (Module Manager)
La aplicación cuenta con una vista dedicada en la interfaz para la administración integral de módulos:
1. **Instalación de Módulos**:
   - Botón *"Instalar Módulo (.pcm)"* para seleccionar paquetes.
   - Soporte para **arrastrar y soltar (Drag & Drop)** archivos `.pcm` directamente sobre la ventana.
   - Verificación previa del `manifest.json` e integridad antes de la extracción a `%APPDATA%\PCManager\modules\`.
2. **Habilitación / Deshabilitación en Caliente**:
   - Switch de estado (Activo / Inactivo).
   - Al deshabilitar: se liberan los recursos, se cancelan los timers, sus tarjetas se retiran del Dashboard 10x10 y su opción desaparece del Sidebar, sin borrar los archivos del disco.
3. **Desinstalación y Limpieza**:
   - Botón de eliminación con el protocolo asistido de resolución de dependencias (desactivar dependientes, eliminar en cascada o cancelar).
4. **Exportación de Módulos a Paquete `.pcm`**:
   - Cualquier módulo instalado puede ser empaquetado y exportado con un solo clic como un archivo `.pcm` listo para ser compartido.
5. **Reasignación de Grupos**:
   - Selector directo para mover el módulo entre los grupos existentes o enviarlo al grupo inmutable `"General"`.

---

## 8. Módulo de Rendimiento y Telemetría: Dashboard Propio y Control Granular
La vista dedicada del módulo de telemetría debe funcionar como un cockpit de monitoreo avanzado y ofrecer **control granular de muestreo**:
- El usuario puede activar o desactivar individualmente qué subsistemas de hardware toman datos:
  - **Sensor de Procesador (CPU)**: Carga por núcleos, frecuencia y temperatura.
  - **Sensor de Memoria (RAM)**: Consumo activo, caché y paginación.
  - **Sensor de Acelerador Gráfico (GPU)**: Carga del motor, VRAM y temperatura.
  - **Sensor de Almacenamiento**: Velocidad de lectura/escritura y tiempo de respuesta.
  - **Sensor de Red**: Ancho de banda de subida y bajada.
- Al desactivar un sensor, el Core detiene inmediatamente el hilo de muestreo correspondiente para garantizar un consumo de CPU prácticamente nulo en segundo plano.

---

## 9. Estructura de Directorios Recomendada
```text
pc_manager/
├── core/                  # La Carcasa (Kernel, EventBus, ServiceRegistry, ModuleManager, Logger)
│   ├── engine.py / .ts    # Punto de entrada y orquestador
│   ├── registry/          # Catálogo de módulos, grupos y servicios compartidos
│   ├── installer/         # Gestor de instalación, descompresión y exportación de paquetes .pcm
│   ├── events/            # Bus de eventos desacoplado
│   └── interfaces/        # Contratos formales (IModule, IService, IEvent)
├── modules/               # Directorio de módulos independientes
│   ├── hardware_telemetry/# Módulo proveedor de CPU, RAM, GPU, temperaturas (Widgets Dashboard)
│   ├── cooler_control/    # Módulo consumidor que usa hardware_telemetry para su pantalla
│   └── storage_cleaner/   # Módulo de mantenimiento
└── docs/                  # Tríada de documentación
```

---

## 10. Escalabilidad Futura
Cualquier nueva funcionalidad debe concebirse exclusivamente como un nuevo módulo dentro de `modules/`, aprovechando los servicios ya expuestos por otros módulos o publicando nuevos servicios para el ecosistema.

---

## 11. Sistema de Repositorios Remotos y Distribución vía GitHub
Para permitir la instalación, descubrimiento y actualización automática de módulos sin intermediarios propietarios:

### 1. Repositorio Índice Centralizado (`index.json` / Catálogo)
- Se mantiene un repositorio en GitHub (ej. `pc-manager-modules-registry`) que actúa como índice público.
- Expone un archivo `index.json` accesible mediante GitHub Pages o Raw URL (`https://raw.githubusercontent.com/<org>/pc-manager-registry/main/v1/index.json`).
- Estructura del catálogo:
  ```json
  {
    "schema_version": "1.0",
    "updated_at": "2026-09-13T00:00:00Z",
    "modules": [
      {
        "id": "cooler-controller",
        "name": "Controlador de Refrigeración",
        "version": "1.1.0",
        "description": "Control de pantalla digital para disipadores líquidos.",
        "author": "Ecosistema Modular",
        "min_core_version": "1.0.0",
        "category": "Periféricos",
        "provides_services": ["cooler.display"],
        "requires_services": ["hardware.telemetry"],
        "download_url": "https://github.com/<org>/pcm-cooler-controller/releases/download/v1.1.0/cooler-controller.pcm",
        "sha256": "3a88c2e6f43e1d1...2b8c",
        "repo_url": "https://github.com/<org>/pcm-cooler-controller"
      }
    ]
  }
  ```

### 2. Distribución y Alojamiento vía GitHub Releases
- Cada módulo mantiene su propio repositorio de código abierto en GitHub.
- El proceso de integración continua (GitHub Actions) empaqueta el artefacto `.pcm`, genera su suma de comprobación criptográfica (`sha256`) y lo publica como un activo (*Release Asset*) descargable.

### 3. Comprobador de Actualizaciones y Descarga en 1 Clic
- El Core compara las versiones instaladas contra las listadas en `index.json`.
- Si `remote.version > local.version`, la interfaz despliega una insignia de *"Actualización disponible"* con su respectivo botón de acción.
- Al confirmar, el Core descarga el archivo `.pcm` a un área de *staging*, valida el hash SHA-256 y ejecuta el protocolo transaccional de actualización en caliente.

### 4. Soporte Multi-Repositorio (Filosofía White-Label)
- El Core no se acopla rígidamente a una única URL. Permite añadir repositorios comunitarios, institucionales o privados en la configuración `config.json` mediante pares `name` / `url`.

---

## 12. Ciclo de Vida del Core e Integración con Windows

### 1. Inicio con Windows (Startup on Boot)
- Permite configurar el arranque automático junto al inicio de sesión de usuario mediante la clave del registro `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` o a través del Programador de Tareas de Windows (*Task Scheduler*).

### 2. Minimizar a la Bandeja del Sistema (System Tray) - Activo por Defecto
- **Predeterminado**: Activado de fábrica.
- Al pulsar el botón de cerrar (`X`) de la ventana principal, la aplicación no se destruye; oculta su ventana y se mantiene residente en la bandeja del sistema (*System Tray*).
- El menú contextual del icono del Tray ofrece:
  - *"Abrir Dashboard"*
  - *"Pausar / Reanudar Telemetría"*
  - *"Configuraciones"*
  - *"Cerrar y Salir Totalmente"*

### 3. Cierre Total y Parada Limpia de Servicios (Graceful Clean Shutdown)
- Al invocar la orden de salida definitiva (*Quit* o *Terminar Aplicación*):
  - El Core notifica a todos los módulos mediante `on_disable()`.
  - Se cancelan todos los temporizadores e hilos de recolección de telemetría.
  - Se cierran los descriptores de hardware, handles y sockets de comunicación interna.
  - Se terminan todos los subprocesos hijos.
  - **Garantía Estricta**: Queda prohibido dejar procesos huérfanos o servicios en ejecución consumiendo memoria en segundo plano tras el cierre definitivo.

### 4. Modo Servicio de Windows (Headless Pre-Logon Service)
- Para entornos que requieran recolección de telemetría o control de periféricos (como pantallas de refrigeración o curvas térmicas) antes de que el usuario inicie sesión en Windows:
  - El Core soporta ser instalado y ejecutado como **Servicio de Windows (`services.msc`)** nativo.
  - Opera con privilegios locales (`LocalSystem` o cuenta de servicio dedicada) en modo sin cabecera (*headless*).
  - La interfaz gráfica de usuario (GUI) se conecta localmente vía IPC/Named Pipes al servicio central cuando el usuario inicia sesión.

