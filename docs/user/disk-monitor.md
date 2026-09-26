# Manual de Usuario: Monitoreo de Almacenamiento (Disk Monitor v2.0)

Bienvenido a la guía de operación del módulo de **Monitoreo de Almacenamiento** para **PC Manager**. Este módulo proporciona supervisión de salud, diagnóstico de medios físicos, desglose de particiones y widgets en vivo para el Dashboard en tiempo real.

---

## 1. Resumen Ejecutivo

El módulo está diseñado para proporcionar visibilidad completa y sin fricción de todo el almacenamiento de la computadora:
- **Descubrimiento Automático Inmediato**: Al abrir el módulo, se detectan e incorporan de inmediato todas las unidades físicas y volúmenes montados, sin pasos manuales ni pantallas vacías de bienvenida.
- **Widgets en el Dashboard**: Dispone de dos widgets dedicados para anclar en el Dashboard:
  - **Almacenamiento General (2x1)**: Resumen global de espacio usado, libre, capacidad total y estado de salud de todas las unidades.
  - **Unidad del Sistema (C:) (2x1)**: Monitoreo en vivo de la unidad donde reside Windows, con espacio restante, porcentaje de ocupación y temperatura.
- **Detección Neutral de Tecnologías**: Clasifica de forma transparente entre **NVMe PCIe**, **SATA SSD**, **HDD Mecánico** y **USB Extraíble** según los estándares del bus del sistema operativo.
- **Desglose de Particiones y Volúmenes**: Identifica y exhibe la etiqueta, letra de unidad (`C:`, `D:`, `E:`) y sistema de archivos (`NTFS`, `exFAT`, `FAT32`, `ReFS`) de cada partición con su barra de progreso de capacidad.
- **Telemetría SMART y Salud Física**: Lectura de porcentaje de vida útil en unidades flash (SSD/NVMe), temperatura operativa (°C), horas de encendido y contadores de errores de hardware.

---

## 2. Instrucciones de Uso

### Instalación del Módulo
1. Abra **PC Manager**.
2. Diríjase a la sección **Gestor de Módulos** desde el menú lateral.
3. En la pestaña **Catálogo Local**, utilice la opción **Instalar Módulo (.pcm)** y seleccione el archivo `disk-monitor.pcm`.
4. El módulo se registrará en el sistema bajo el grupo predeterminado **General** y activará sus vistas y widgets.

### Navegación y Filtros
1. Ingrese a la vista **Monitoreo de Almacenamiento** desde el menú lateral.
2. La vista cargará de inmediato todas las unidades detectadas.
3. Utilice los botones de filtro (**Todos**, **NVMe**, **SATA SSD**, **HDD**, **USB**) para visualizar únicamente el tipo de almacenamiento deseado.
4. Presione **Actualizar** para forzar un re-escaneo del bus en caliente (por ejemplo, al conectar una memoria USB).
5. Presione **Configuración** para ajustar el intervalo de sondeo periódico o desactivar la inclusión de memorias USB.

### Añadir Widgets al Dashboard
1. Vaya a la vista **Dashboard**.
2. Presione el botón **Widgets** en la esquina superior derecha.
3. En el catálogo desplegable, active los interruptores de **Almacenamiento General** o **Unidad del Sistema (C:)**.
4. Los widgets se posicionarán en el dashboard y se mantendrán sincronizados en tiempo real.

---

## 3. Preguntas Frecuentes (FAQ)

**¿Cómo detecta el módulo los dispositivos USB?**  
El colector analiza el bus de conexión y el atributo de medio extraíble del sistema operativo. Al conectar o retirar un pendrive o disco externo, pulsar "Actualizar" sincronizará el estado al instante.

**¿Se modifican o escriben datos en mis discos?**  
No. Todas las lecturas de telemetría y eventos operan estrictamente en modo de solo lectura (Dry-Run), sin alterar particiones ni datos de usuario.
