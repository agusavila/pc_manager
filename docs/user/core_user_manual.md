# Manual de Usuario: PC Manager Core (Alpha 0.0.1)

Bienvenido a la guía oficial de usuario de **PC Manager**. Este documento describe el funcionamiento, navegación y opciones del núcleo central del sistema sin tecnicismos innecesarios.

---

## 1. Resumen Ejecutivo

**PC Manager** es una plataforma centralizada y modular diseñada para supervisar, configurar y optimizar los recursos del sistema operativo de manera neutral, rápida y eficiente. 

Su diseño basado en un núcleo ligero (**Core**) permite que cada herramienta especializada funcione como un componente independiente. Si no se necesita un módulo en particular, este puede apagarse o retirarse sin alterar el resto de las funciones.

---

## 2. Elementos Principales de la Interfaz

### 2.1. Menú Lateral (Barra de Navegación)
- **Colapso y Expansión**: El menú lateral se expande o minimiza haciendo clic directamente sobre el logotipo de la aplicación en la esquina superior izquierda. Al colapsarse, los textos se ocultan y sólo se muestran los iconos centrados.
- **Grupos de Módulos**: Los módulos se organizan en categorías desplegables. El grupo predeterminado es **"General"**. Si un grupo no tiene módulos activos, se oculta automáticamente para mantener el espacio visual despejado.

### 2.2. Barra Superior Unificada
- Muestra el nombre de la sección actual y una descripción sintética de su función.
- Contiene los accesos rápidos a:
  - **Buscador global**: Para localizar rápidamente herramientas o métricas.
  - **Notificaciones del Sistema**: Indicador con el número de eventos pendientes. Al pulsarlo, se despliega un panel lateral con opciones para *Marcar todas como leídas* y *Borrar historial*.
  - **Configuraciones Globales**: Acceso al panel de personalización y ajustes del sistema.

### 2.3. Dashboard (Panel Principal)
- **Tarjetas Dinámicas**: Presentan métricas, accesos directos y widgets interactivos en tiempo real provistos por los módulos habilitados sobre una cuadrícula modular inteligente.
- **Organización Flexible y Modular Tile Grid**: Las tarjetas pueden arrastrarse y reubicarse en la cuadrícula de celdas modulares de forma suave, adaptándose a cualquier tamaño de ventana o monitor sin deformaciones.
- **Perfiles de Dashboard**: Permite crear, renombrar, duplicar y alternar entre distintas configuraciones y disposiciones de tarjetas con selección de widgets independientes.
- **Botón de Auto-organización**: Ubicado en la barra superior del Dashboard, permite compactar y reacomodar automáticamente todas las tarjetas activas para eliminar espacios vacíos.

---

## 3. Instrucciones de Uso y Configuración

### 3.1. Personalización Visual (Temas y Colores)
Dentro de la sección de **Configuraciones**:
1. **Tipo de Modo**: Seleccione entre *Modo Oscuro* (optimizado para bajo brillo) y *Modo Claro* (alta visibilidad en entornos iluminados).
2. **Estilo de Fondo**: Elija una atmósfera visual adaptada al modo seleccionado (ej. *Oscuro Profundo*, *Carbon Black*, *Midnight Navy*, *Cyberpunk Dark* o variantes claras como *Blanco Puro*, *Azul Suave*, *Gris Platino*).
3. **Color de Acento**: Seleccione uno de los 10 tonos de acento disponibles para los botones, gráficos e indicadores activos.

### 3.2. Gestión de Módulos
En la sección **Gestor de Módulos**:
- **Habilitar/Deshabilitar**: Active o pause módulos con un solo clic. Al desactivar un módulo, sus tarjetas y accesos desaparecen inmediatamente del sistema sin desinstalar sus archivos.
- **Grupos Personalizados**: Cree grupos para organizar sus módulos de trabajo. Si elimina un grupo personalizado, todos los módulos que contenía se reasignan automáticamente al grupo **General**.

### 3.3. Integración con el Sistema Operativo
- **Iniciar con el Sistema**: Hace que la aplicación arranque de forma automática en segundo plano al encender el equipo.
- **Minimizar al Área de Notificación (System Tray)**: Habilitado por defecto. Al cerrar la ventana, el programa permanece activo en segundo plano accesible desde los iconos ocultos de la barra de tareas.
- **Cierre Definitivo**: Al seleccionar "Cerrar Aplicación" desde el menú de bandeja, se detienen todos los servicios de telemetría y procesos de fondo de inmediato, liberando la memoria por completo.

---

## 4. Modo Seguro y Simulación (Dry-Run)

Todas las operaciones que involucren limpieza de almacenamiento temporal, alteración de servicios o modificación de archivos cuentan con un paso de **Simulación Previa (Dry-Run)**. 
- La aplicación muestra primero un reporte detallado del impacto estimado (archivos detectados, espacio recuperable y advertencias de seguridad).
- Ninguna acción irreversible se ejecuta sin la confirmación explícita del usuario.

---

## 5. Preguntas Frecuentes

**¿La aplicación consume recursos cuando está minimizada?**  
No. En modo minimizado a la bandeja, las animaciones de la interfaz se pausan y los colectores entran en cadencia de bajo consumo.

**¿Qué ocurre si desinstalo un módulo del que dependen otros?**  
El sistema le avisará antes de proceder, dándole la opción de desactivar en cascada los módulos dependientes o cancelar la operación para evitar fallos.

**¿Puedo usar la aplicación sin conexión a internet?**  
Sí, la totalidad de las funciones del núcleo y los colectores locales operan sin necesidad de conexión externa ni envío de telemetría fuera del equipo.
