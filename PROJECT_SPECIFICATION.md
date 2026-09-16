# PC Manager // Especificación Maestra de Arquitectura, UI y Reglas de Desarrollo

Este documento compila de manera unificada, detallada y canónica toda la planificación, decisiones de diseño, preferencias de interfaz de usuario y reglas acordadas a lo largo de la concepción de **PC Manager**.

---

## 1. Naturaleza del Proyecto y Filosofía Base

### 1.1 Software Nativo de Escritorio para Windows (Desktop Software)
- **Tecnología**: Construido exclusivamente sobre **Rust + Tauri v2** con capa gráfica en WebView nativo de alto rendimiento.
- **Prohibición de Servidores Web**: PC Manager **no es ni debe tratarse como un servidor web, API HTTP remota o aplicación cliente-servidor para navegador**. Es un programa ejecutable local para Windows (`pc_manager.exe`).
- **Integración con el Sistema Operativo**:
  - **System Tray (Área de Notificación)**: Reside en la bandeja del sistema con menú contextual nativo (*Abrir*, *Ocultar*, *Cerrar*).
  - **Minimizar al Cerrar**: La acción de cerrar la ventana principal la oculta hacia el System Tray por defecto para operar en segundo plano sin interrumpir tareas esenciales.
  - **Arranque con Windows**: Capacidad configurable para iniciar automáticamente con el inicio de sesión del usuario.
  - **Modo Servicio de Windows (Pre-logon)**: Soporte desacoplado para operar como servicio nativo (`services.msc`), recolectando telemetría o ejecutando tareas de fondo antes del inicio de sesión de usuario.
  - **Parada Determinista**: Al pulsar *"Cerrar"* o *"Salir"* definitivamente, el Core detiene todos los hilos de telemetría, procesos secundarios y servicios en ejecución. Cero procesos huérfanos en memoria.

### 1.2 Filosofía White Label (Marca Blanca Neutral)
- Software formal, técnico y universalmente reutilizable.
- **Prohibiciones estrictas**:
  - Cero rutas personales o nombres de usuarios del sistema anfitrión (`C:\Users\...`).
  - Cero referencias a marcas comerciales de hardware específicas en textos fijos (Intel, AMD, Nvidia, Kingston, etc.). Las marcas solo pueden aparecer si se leen de forma dinámica y neutral desde las APIs del sistema de telemetría.
  - Cero lenguaje informal o posesivo ("tu PC", "tus discos", "carcasa inicializada"). Usar nomenclatura técnica de producción ("Sistema", "Almacenamiento Local", "Panel de Control").

### 1.3 Aislamiento, Privacidad y Seguridad Operativa
- **Cero transferencia no autorizada**: No se leen, copian ni transfieren datos de otros proyectos ni del entorno personal sin consentimiento explícito.
- **Modo Simulación (Dry-Run)**: Cualquier operación con capacidad destructiva o de modificación de archivos/procesos debe contar obligatoriamente con simulación previa.
- **Lista Negra de Protección del Sistema**: Protección inmutable de componentes críticos de Windows (`C:\Windows`, `System32`, `WinSxS`, procesos del kernel).

---

## 2. El Rol de las Maquetas: `core_shell.html` vs. `index.html`

El proyecto cuenta con dos prototipos de referencia en la raíz del repositorio, cada uno con un propósito específico:

### 2.1 `core_shell.html`: La Referencia Canónica de la Carcasa Limpia (v0.0.1-alpha)
- **Propósito**: Representa fielmente **cómo debe lucir y estar ordenada la primera versión del Core (v0.0.1-alpha) al salir de fábrica**, es decir, **completamente limpia y sin módulos instalados**.
- **Comportamiento**:
  - El Dashboard es una cuadrícula modular limpia con su mensaje de bienvenida (*Empty State*) invitando a instalar paquetes `.pcm`.
  - El menú lateral (sidebar) no tiene módulos cargados; muestra una notificación sutil indicando que no hay módulos activos.
  - El Gestor de Módulos muestra 0 módulos instalados y su zona dropzone vacía.
  - Toda la jerarquía visual, espaciado, colores, tipografía y disposición de componentes en esta maqueta es el modelo a seguir para el binario final de la Carcasa.

### 2.2 `index.html`: La Referencia de un Sistema Poblado con Módulos
- **Propósito**: Representa cómo luce y se comporta el sistema **una vez que el usuario ha instalado y activado módulos de extensión**.
- **Comportamiento**:
  - Muestra el Dashboard poblado con tarjetas de distintos tamaños (`1x1`, `2x1`, `2x2`, etc.) aportadas por los módulos.
  - Las tarjetas contienen controles interactivos funcionales (switches de activación, lectura en vivo, botones que redirigen a la pantalla propia del módulo).
  - El menú lateral agrupa las secciones añadidas por los módulos dentro de sus respectivos grupos (ej. *General*, *Periféricos*).
  - Sirve como guía de integración y experiencia de usuario (UX) para cuando se desarrollen módulos.

### 2.3 Regla Canónica: Uso de Mockups vs. Integridad Funcional
- **Los mockups definen el diseño visual y las opciones gráficas**: El layout, las pestañas, los formularios y la estructura de navegación de los mockups son la guía canónica y **deben estar presentes en la interfaz**.
- **Prohibido copiar o inventar datos ficticios**:
  - En la aplicación real **no deben existir tarjetas dummy** que simulen módulos que no están instalados (ej. "Telemetría v1.0.0", "Almacenamiento Local" inventados en el catálogo remoto).
  - **No simular con timers (`setTimeout`) descargas o instalaciones falsas**.
  - Si una opción o sección del catálogo remoto no tiene un repositorio conectado o datos reales disponibles, la interfaz debe mostrar de forma transparente su **estado real (Empty State)**: *"0 Módulos disponibles en catálogo // Sin fuentes sincronizadas"*, ofreciendo la opción de configurar o actualizar las fuentes de repositorios.

---

## 3. Desglose Detallado de Cada Sección y Preferencias de UI

### 3.1 Menú Lateral de Navegación (Sidebar)
1. **Control Único de Colapso**:
   - El sidebar se colapsa y expande **exclusivamente haciendo clic sobre el logotipo de la aplicación** (`.brand-symbol`).
   - Queda prohibido añadir botones redundantes (chevrons laterales, botones tipo hamburguesa junto a los títulos de vista).
2. **Comportamiento al Colapsarse**:
   - Los textos desaparecen suavemente y solo quedan visibles los iconos vectoriales SVG centrados, con tooltips nativos explicativos (`title`).
   - Los avisos informativos (como *"Sin módulos activos"*) se ocultan completamente para evitar deformaciones del texto o barras de scroll horizontal indeseadas.
3. **Grupos de Módulos en el Sidebar**:
   - Los grupos son colapsables (permiten desplegar y plegar la lista de módulos que contienen).
   - **Sin prefijo redundante**: El encabezado muestra únicamente el nombre del grupo (ej. *"Periféricos"*), sin la palabra *"Grupo:"*.
   - **Ocultamiento Automático de Grupos Vacíos**: Si se desactiva o elimina un módulo y era el único dentro de su grupo, el encabezado del grupo **se oculta automáticamente** del sidebar para no dejar secciones vacías. Al reactivarse el módulo, el grupo reaparece limpiamente.

### 3.2 Barra Superior Canónica (`.topbar`)
1. **Espacio Canónico Único para Título y Descripción**:
   - El nombre de la sección activa (ej. *"Dashboard"*, *"Gestor de Módulos"*) y su descripción residen de manera centralizada en la barra superior.
   - **Prohibición de títulos redundantes**: No se deben duplicar encabezados o títulos dentro del cuerpo de la vista, liberando el máximo espacio vertical para el contenido operativo.
2. **Acceso al Centro de Notificaciones**:
   - Botón de icono SVG compacto (`.btn-icon`) con un indicador numérico rojito (`.notification-counter`) que refleja la cantidad de notificaciones no leídas.
3. **Botón de Personalización del Dashboard**:
   - Permite desplegar el panel lateral (drawer) de selección y activación de tarjetas disponibles.

### 3.3 El Dashboard (Cuadrícula Modular Tile Grid)
1. **Nombre Canónico**:
   - Se denomina estrictamente **"Dashboard"** (prohibido "Pizarra Central" u otras variantes).
2. **Eficiencia Visual (Cero Relleno Informativo)**:
   - Prohibido saturar con insignias irrelevantes como *"Sistema Central"*, *"Núcleo Operativo"* o chips dentro de las tarjetas como *"Servicio Compartido: x"*.
3. **Integridad de las Tarjetas (Cero Recortes)**:
   - Los títulos y contenidos de las tarjetas deben ser **100% legibles y visibles** en el tamaño asignado (`1x1`, `2x1`, `2x2`, etc.). Queda prohibido el truncamiento con puntos suspensivos (`ellipsis`).
   - Las tarjetas pueden incorporar opciones interactivas directas (botones de acción rápida, switches, enlaces para abrir la vista completa del módulo).
4. **Drag and Drop Fluido y Botón FAB de Auto-organización**:
   - Arrastre suave con elevación de sombras y animaciones con curvas `cubic-bezier(0.2, 0, 0, 1)`.
   - **Botón Flotante Canónico de Auto-organización (`#btn-auto-organize`)**: Ubicado en la esquina inferior del Dashboard, permite con un solo clic reordenar y compactar las tarjetas activas de forma inteligente para eliminar huecos vacíos en la cuadrícula.

### 3.4 Centro de Notificaciones (Drawer Lateral)
- Desplegable desde el margen derecho con desenfoque de fondo (`backdrop-filter: blur`).
- **Botones de Acción Obligatorios**:
  - **Marcar todas como leídas**: Cambia el estado visual de los elementos no leídos y reinicia el badge de la barra superior.
  - **Borrar todas**: Limpia el listado de notificaciones históricas.

### 3.5 Gestor de Módulos y Grupos
El Gestor de Módulos integra canónicamente cuatro pestañas ordenadas:

1. **Pestaña "Instalados"**:
   - **Zona de Arrastre (.pcm)**: Dropzone para instalar paquetes locales mediante arrastrar y soltar o mediante selector de archivos de Windows.
   - **Listado de Módulos**: Muestra los módulos cargados con su interruptor para activar/desactivar, versión, grupo asignado y botón de desinstalación.
   - En la v0.0.1-alpha inicial, arranca con el estado limpio (*"No hay módulos instalados actualmente en el equipo"*).
2. **Pestaña "Catálogo Remoto"**:
   - Pestaña canónica para explorar módulos disponibles desde repositorios en línea.
   - **Estado Real**: En la versión inicial sin repositorio conectado, muestra su estado real con un Empty State claro (*"0 Módulos disponibles en catálogo // Sin fuentes sincronizadas"*) y opciones para sincronizar o configurar fuentes. Cero módulos falsos ni simulaciones con `setTimeout`.
3. **Pestaña "Repositorios Configurados"**:
   - Administración de URLs de catálogos e índices remotos de módulos (ej. GitHub Releases / JSON Index).
   - Formulario para añadir, validar y remover fuentes de repositorios.
4. **Pestaña "Grupos de Módulos"**:
   - **Grupo "General" Inmutable**: Viene creado de fábrica, es predeterminado y está protegido contra eliminación.
   - **Reasignación Automática**: Al eliminar cualquier grupo personalizado, todos los módulos pertenecientes a dicho grupo se reasignan automáticamente al grupo "General".
   - Formulario para crear nuevos grupos personalizados.

### 3.6 Arquitectura y Ciclo de Vida de los Módulos (`.pcm`)
1. **Formato de Paquete (.pcm)**:
   - Los módulos son paquetes independientes comprimidos (zip con extensión `.pcm`) que contienen su manifiesto (`manifest.json`), lógica (`module.js`), interfaz gráfica (`ui/`) y recursos complementarios.
2. **Registro de Servicios Compartidos (`ServiceRegistry`)**:
   - El Core expone un registro para que los módulos publiquen y consuman servicios comunes.
   - *Ejemplo canónico*: Un módulo de *Telemetría* publica métricas de CPU/GPU en el `ServiceRegistry`. Un módulo posterior de *Control de Refrigeración / Pantalla de Disipador* consume dichas métricas directamente del servicio sin necesidad de duplicar el código de lectura de sensores ni acoplarse rígidamente.
3. **Desinstalación y Dependencias No Bloqueantes**:
   - Si un módulo posee dependencias activas (ej. otro módulo depende de sus servicios compartidos), su desinstalación no se bloquea de forma arbitraria.
   - En su lugar, el sistema consulta al usuario si desea desactivar los módulos dependientes o proceder con una desinstalación coordinada.

### 3.7 Pantalla de Configuraciones del Core
1. **Motor de Temas y Colores (Modo Oscuro y Claro)**:
   - **Cero colores hardcodeados**: Toda la interfaz utiliza variables semánticas CSS (`var(--bg-*)`, `var(--text-*)`, `var(--accent-*)`).
   - **Dos Selectores Homogéneos (Comboboxes)**:
     1. *Tipo de Modo*: Selector entre **Modo Oscuro** y **Modo Claro**.
     2. *Estilo de Fondo*: Variantes temáticas según el tipo seleccionado:
        - **Oscuro**: *Oscuro Profundo*, *Carbon Black*, *Midnight Navy*, *Cyberpunk Dark*.
        - **Claro**: *Blanco Puro*, *Azul Suave*, *Gris Platino*, *Menta Suave*.
   - **Paleta Extendida de Acento**: Mínimo 8-10 colores seleccionables con cambio en caliente (Azul Eléctrico, Esmeralda, Violeta Neón, Ámbar, Carmín, Cian, etc.).
   - **Diseño Homogéneo de Tarjetas y Formularios**: Todas las tarjetas de configuración mantienen dimensiones, bordes, radios y tipografías perfectamente consistentes con el diseño Material Expressive.
2. **Integración con Windows y Ciclo de Vida**:
   - Interruptor: *Iniciar con Windows* (configuración en registro de Windows / startup).
   - Interruptor: *Minimizar a la Bandeja del Sistema (Tray)* (habilitado por defecto).
   - Interruptor: *Modo Servicio de Windows (Pre-logon)* (para colectores previos al inicio de sesión).
   - Interruptor: *Modo Simulación Permanente (Dry-Run)* (activo por defecto para seguridad).

---

## 4. Estándares de Calidad, Bitácora y Control de Versiones

### 4.1 Bitácora Obligatoria (`BUG_TRACKER.md`)
- Todo fallo, bug funcional, error de sintaxis o desviación detectada y corregida debe quedar inmediatamente registrada en [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md).
- Cada registro incluye: Identificador único (`BUG-XXX`), Fecha, Severidad, Componente afectado, Causa Raíz, Solución Aplicada y Estado.

### 4.2 Trazabilidad en Git y GitHub
- Cada commit en el repositorio debe ser **atómico**, con mensaje descriptivo y referencia al identificador `BUG-XXX` o a la funcionalidad implementada.
- Las versiones se incrementan siguiendo Versionado Semántico: **v0.0.1-alpha** para la Carcasa limpia inicial, mientras que las etapas Beta, RC y Releases oficiales son indicadas exclusivamente por el usuario.

### 4.3 Tríada de Documentación Obligatoria
Todo componente o módulo desarrollado debe sincronizar su documentación en:
1. **Manual de Usuario** (`docs/user/`): Beneficios prácticos y modo de empleo en lenguaje accesible.
2. **Especificación para IA** (`docs/ai/`): Esquemas de datos, APIs de Rust/Tauri, eventos y contratos para modelos de IA.
3. **Guía de Desarrollador** (`docs/developer/`): Estructura de código, patrones de diseño y guías para extender el sistema.
