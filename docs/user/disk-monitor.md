# Manual de Usuario: Monitoreo de Almacenamiento (Disk Monitor)

Bienvenido a la guía de operación del módulo de **Monitoreo de Almacenamiento** para **PC Manager**. Este módulo proporciona supervisión de salud, diagnóstico de medios físicos y auditoría de sectores en tiempo real.

---

## 1. Resumen Ejecutivo

El módulo está diseñado con una arquitectura estándar que no asume configuraciones previas ni hardware predefinido:
- **Estado Inicial de Fábrica**: El módulo inicia limpio, permitiendo al usuario decidir qué discos desea supervisar.
- **Descubrimiento y Selección**: Mediante la función **"Buscar Discos"**, el sistema detecta las unidades conectadas al equipo y permite seleccionar cuáles incorporar a la vista activa.
- **Detección Neutral de Tecnologías**: Clasifica de forma transparente entre **NVMe PCIe**, **SATA SSD**, **HDD Mecánico** y **Almacenamiento USB** según los estándares del bus del sistema operativo.
- **Ficha Técnica**: Presenta el identificador de disco, modelo comercial reportado por el firmware, número de serie, capacidad formateada y volúmenes asignados (`C:`, `D:`, etc.).
- **Diagnóstico y Auditoría Segura**: Comprueba la salud SMART y permite ejecutar auditorías de lectura no destructivas (**Dry-Run**).

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
3. Se abrirá la ventana de **Descubrimiento de Unidades Físicas** mostrando todos los discos detectados en el equipo.
4. Marque las casillas de los discos que desea vigilar y pulse **"Agregar al Monitoreo"**.
5. El panel se actualizará de inmediato mostrando las métricas y tarjetas de las unidades seleccionadas.

### Gestión de Unidades en el Tablero
- **Remover Unidad**: En la esquina superior derecha de cualquier tarjeta de disco, pulse el botón **"Remover"** si desea dejar de vigilar esa unidad en particular.
- **Filtrar por Tecnología**: Utilice las píldoras superiores (**Todos**, **NVMe**, **SATA SSD**, **HDD**, **Alertas**) para enfocar la vista en tipos específicos de medios.
- **Agregar Nuevas Unidades**: En cualquier momento puede volver a pulsar **"Buscar Discos"** para incorporar discos que no hubiese agregado anteriormente.

---

## 3. Modo Seguro y Auditoría de Sectores (Dry-Run)

Para verificar el estado físico de los bloques de almacenamiento:
1. En la tarjeta del disco deseado, pulse **"Auditar Sectores"**.
2. Se iniciará una rutina de diagnóstico que evalúa la integridad de lectura de bloques y consulta el registro de eventos del sistema operativo.
3. **Garantía No Destructiva**: La operación opera estrictamente en modo de solo lectura, sin formatear ni modificar particiones ni escribir datos en el disco.
4. Al concluir, se presentará el veredicto de integridad de superficie.

---

## 4. Preguntas Frecuentes (FAQ)

**¿Por qué el módulo no muestra discos al instalarse por primera vez?**  
Porque sigue la filosofía de diseño modular estándar: no precarga unidades de forma arbitraria, otorgando al usuario el control de descubrir y elegir qué unidades supervisar.

**¿Cómo cambio el grupo del módulo?**  
Vaya a **Gestor de Módulos -> Grupos**. Allí puede asignar el módulo a cualquier grupo personalizado existente o crear uno nuevo.
