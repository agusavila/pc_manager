# Manual de Usuario: Monitoreo de Almacenamiento (Disk Monitor)

Bienvenido a la guía de operación del módulo de **Monitoreo de Almacenamiento** para **PC Manager**. Este módulo proporciona supervisión de salud, diagnóstico de medios físicos y auditoría de sectores en tiempo real.

---

## 1. Resumen Ejecutivo

El módulo está diseñado con una arquitectura estándar que no asume configuraciones previas ni hardware predefinido:
- **Estado Inicial de Fábrica**: El módulo inicia limpio, permitiendo al usuario decidir qué discos o unidades USB desea supervisar.
- **Descubrimiento y Selección**: Mediante la función **"Buscar Discos"**, el sistema detecta todas las unidades conectadas al equipo (fijas y extraíbles USB) y permite seleccionar cuáles incorporar a la vista activa.
- **Detección Neutral de Tecnologías y USB**: Clasifica de forma transparente entre **NVMe PCIe**, **SATA SSD**, **HDD Mecánico** y **Almacenamiento USB (Externo)** según los estándares del bus del sistema operativo.
- **Porcentaje de Salud e Integridad Transparente**: Presenta el porcentaje numérico de salud (**% de Salud**) con barra de vida útil cuando el sistema operativo dispone de contadores SMART; si se ejecuta como usuario estándar sin elevación UAC, expone honestamente el estado operativo del controlador aclarando que el detalle de desgaste SMART numérico requiere elevación.
- **Disposición en Cuadrícula de 2 Columnas**: Organiza los discos como cuadros limpios y proporcionados a 2 por fila.
- **Sistemas de Archivos Visibles**: Identifica y exhibe la etiqueta y sistema de archivos de cada partición (**NTFS**, **exFAT**, **FAT32**, **ReFS**).
- **Frecuencia de Muestreo Personalizada**: Permite configurar intervalos periódicos en segundos (o modo manual) desde Configuraciones.
- **Diagnóstico Real de Bloques y Registro (Dry-Run)**: Comprueba la salud del hardware y consulta eventos reales de errores de I/O en el registro del sistema de Windows sin simulación.

---

## 2. Instrucciones de Uso

### Instalación del Módulo
1. Abra **PC Manager**.
2. Diríjase a la sección **Gestor de Módulos** desde el menú lateral.
3. En la pestaña **Catálogo Local**, utilice la opción **Instalar Módulo (.pcm)** y seleccione el archivo `disk-monitor.pcm`.
4. El módulo se registrará en el sistema bajo el grupo predeterminado **General**.

### Descubrimiento y Selección de Unidades
1. Ingrese a la vista **Monitoreo de Almacenamiento** desde el menú lateral.
2. Si no hay unidades agregadas, verá la pantalla de bienvenida. Haga clic en **"Buscar y Agregar Discos"** (o en el botón **"Buscar Discos"** de la barra superior).
3. Se abrirá la ventana de **Descubrimiento de Unidades Físicas** mostrando todos los discos detectados en el equipo, incluyendo unidades USB conectadas con su estado y capacidad.
4. Marque las casillas de los discos que desea vigilar y pulse **"Agregar al Monitoreo"**.
5. El panel se actualizará de inmediato mostrando las tarjetas de las unidades en 2 columnas.

### Gestión de Unidades en el Tablero
- **Remover Unidad**: En la esquina superior derecha de cualquier tarjeta de disco, pulse el botón **"Remover"** si desea dejar de vigilar esa unidad en particular.
- **Filtrar por Tecnología**: Utilice las píldoras superiores (**Todos**, **NVMe**, **SATA SSD**, **HDD**, **USB**, **Alertas**) para enfocar la vista en tipos específicos de medios.
- **Agregar Nuevas Unidades**: En cualquier momento puede volver a pulsar **"Buscar Discos"** para incorporar discos que no hubiese agregado anteriormente.

---

## 3. Diagnóstico de Bloques y Registro de Windows (Modo Seguro)

Para verificar el estado físico de los bloques de almacenamiento:
1. En la tarjeta del disco deseado, pulse **"Diagnóstico de Bloques y Registro"**.
2. Se desplegará una ventana de evaluación técnica que consulta los contadores de errores de lectura/escritura y el registro de eventos de almacenamiento de Windows (proveedores `disk`, `Ntfs`, `stornvme`).
3. **Garantía No Destructiva**: La operación opera estrictamente en modo de solo lectura (Dry-Run), sin formatear ni modificar particiones ni escribir datos en el disco.
4. Si no se reportan inconsistencias, se confirmará que la unidad se encuentra libre de advertencias en el sistema operativo.

---

## 4. Preguntas Frecuentes (FAQ)

**¿Por qué el módulo no muestra discos al instalarse por primera vez?**  
Porque sigue la filosofía de diseño modular estándar: no precarga unidades de forma arbitraria, otorgando al usuario el control de descubrir y elegir qué unidades supervisar.

**¿Cómo cambio el grupo del módulo?**  
Vaya a **Gestor de Módulos -> Grupos**. Allí puede asignar el módulo a cualquier grupo personalizado existente o crear uno nuevo.
