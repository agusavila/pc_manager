# Manual de Usuario: Monitoreo de Almacenamiento (Disk Monitor)

Bienvenido a la guía oficial del módulo de **Monitoreo de Almacenamiento** para **PC Manager**. Este módulo proporciona visibilidad integral, diagnóstico de salud en tiempo real y supervisión continua de las unidades de disco de su equipo.

---

## 1. Resumen Ejecutivo

El módulo de Monitoreo de Almacenamiento supervisa activamente todas las unidades de almacenamiento físicas conectadas al sistema:
- **Detección Automática de Tecnologías**: Identifica al instante si una unidad es **NVMe PCIe** (ultra-rápida), **SATA SSD** (estado sólido) o **HDD Mecánico** (disco duro magnético tradicional).
- **Ficha Técnica y Diagnóstico**: Muestra modelo de fábrica, número de serie, capacidad formateada, particiones asociadas y estado operativo de salud SMART.
- **Selección de Vigilancia Personalizada**: Permite decidir exactamente qué unidades mantener bajo monitoreo activo y cuáles omitir.
- **Detección de Sectores Defectuosos**: Analiza la bitácora del sistema operativo en busca de bloques defectuosos o errores de lectura/escritura.
- **Auditoría Segura en Modo Dry-Run**: Comprueba la integridad física de las unidades mediante lecturas no destructivas.

---

## 2. Instrucciones de Uso

### Acceso a la Vista del Módulo
1. Abra el menú lateral (Sidebar) de PC Manager.
2. En la sección o grupo **Almacenamiento**, haga clic en **Monitoreo de Almacenamiento**.
3. Se presentará el panel operativo con el resumen general de capacidades y la lista de discos detectados.

### Selección de Unidades a Vigilar
- Cada tarjeta de disco dispone de un interruptor toggle denominado **"Vigilar este Disco"**.
- Al desactivar el interruptor, el disco se atenúa visualmente y queda excluido del cómputo de salud vigilada.
- Sus preferencias de vigilancia se guardan automáticamente y se preservan entre reinicios del equipo.

### Filtros Rápidos
Utilice las píldoras de filtrado ubicadas en la parte superior del listado:
- **Todos**: Muestra la totalidad de unidades físicas conectadas.
- **Vigilados**: Muestra únicamente las unidades con monitoreo activo.
- **NVMe**: Filtra las unidades de estado sólido de alta velocidad por PCIe.
- **SATA SSD**: Filtra los discos de estado sólido SATA convencionales.
- **HDD Mecánico**: Filtra los discos duros tradicionales de platos magnéticos.
- **Alertas**: Muestra de inmediato unidades que presenten advertencias de salud o sectores defectuosos.

---

## 3. Modo Seguro y Auditoría de Sectores (Dry-Run)

El módulo incorpora una herramienta de **Auditoría de Sectores en Modo Seguro**:
1. En la tarjeta de la unidad que desee verificar, pulse el botón **"Auditar Sectores"**.
2. Se abrirá una ventana que evalúa bloques de almacenamiento mediante operaciones estrictas de **solo lectura**.
3. **Garantía No Destructiva**: La auditoría jamás escribe, formatea ni altera sus datos o particiones.
4. Al finalizar, el módulo reportará la latencia media de respuesta, el total de bloques inspeccionados y confirmará si existen sectores dañados.

---

## 4. Preguntas Frecuentes (FAQ)

**¿El monitoreo continuo degrada el rendimiento de mis discos o consume batería?**  
No. Las consultas de telemetría son pasivas y leen directamente la información provista por el subsistema de almacenamiento de Windows sin generar carga intensiva de Entrada/Salida.

**¿Qué debo hacer si una unidad muestra el estado "Advertencia"?**  
Un estado de advertencia indica que el sistema operativo o el controlador físico ha registrado eventos de reintento de lectura o bloques defectuosos. Se recomienda realizar una copia de seguridad inmediata de los datos importantes de esa unidad.

**¿Puedo cambiar el intervalo de actualización automática?**  
Sí. Pulse el botón **"Configuración"** en la barra de herramientas del módulo para acceder a las opciones de frecuencia de muestreo (15s, 30s, 1m, 5m o Manual).
