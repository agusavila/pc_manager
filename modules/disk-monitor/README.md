# Módulo: Monitoreo de Almacenamiento (Disk Monitor)

Módulo nativo desacoplado para la arquitectura Core-Modular de **PC Manager**, especializado en telemetría de hardware de almacenamiento, diagnóstico en tiempo real y salud de medios físicos en Windows.

## Capacidades

- **Detección de Tecnologías de Medios**: Clasifica automáticamente cada unidad física en **NVMe PCIe**, **SATA SSD** o **HDD Mecánico**.
- **Ficha Técnica Completa**: Lee modelo, número de serie de fábrica, interfaz de bus, capacidad formateada y particiones asociadas con letras de unidad de Windows (`C:`, `D:`, etc.).
- **Vigilancia Configurable**: Permite conmutar qué discos físicos están bajo vigilancia activa individual con persistencia local en disco.
- **Diagnóstico de Salud y Sectores**:
  - Estado SMART (`Healthy`, `Warning`, `Unhealthy`).
  - Inspección del registro del sistema de Windows de eventos de controlador (`disk.sys` eventos 7, 51, 153) y de archivos (`Ntfs` eventos 55, 98).
  - Auditoría de sectores segura en modo solo lectura (**Dry-Run**).
- **Acceso a Configuración**: Botón directo a la pestaña de configuración del módulo en Configuraciones.
