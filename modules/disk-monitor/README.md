# Módulo: Monitoreo de Almacenamiento (Disk Monitor)

Módulo desacoplado para la arquitectura Core-Modular de **PC Manager**, especializado en telemetría de hardware de almacenamiento, supervisión de salud y auditoría de sectores en sistemas operativos Windows.

## Flujo Operativo Estándar

1. **Estado Inicial Limpio (Empty State)**: Al instalarse, el módulo no impone ni precarga ninguna unidad. Muestra un estado transparente invitando al usuario a buscar los discos conectados al sistema.
2. **Descubrimiento y Selección**: A través del menú **"Buscar Discos"**, el usuario escanea el bus de almacenamiento del sistema operativo y selecciona explícitamente cuáles unidades incorporar a su panel de monitoreo.
3. **Supervisión Continua**: Diagnóstico de salud SMART, detección neutral de tecnología (**NVMe PCIe**, **SATA SSD**, **HDD Mecánico**, **USB**), número de serie, capacidad formateada y volúmenes montados.
4. **Gestión Flexible**: Cada unidad en el panel puede removerse del monitoreo en cualquier momento.
5. **Auditoría de Sectores en Modo Seguro (Dry-Run)**: Comprobación de integridad física de lectura sin modificar particiones ni escribir datos (Regla 5).
