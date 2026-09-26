# Módulo: Monitoreo de Almacenamiento (Disk Monitor v2.0)

Módulo desacoplado para la arquitectura Core-Modular de **PC Manager**, especializado en telemetría de hardware de almacenamiento en tiempo real, supervisión de salud SMART, desglose de particiones y widgets operativos de Dashboard para Windows.

---

## Características Principales

1. **Descubrimiento Automático Inmediato**: Detecta y presenta todas las unidades físicas y particiones montadas de inmediato al abrir la vista, sin requerir pasos intermedios ni configuraciones manuales previas.
2. **Widgets Canónicos de Dashboard**:
   - `card-disk-overview` (2x1): Barra global de ocupación de almacenamiento, capacidad total/usada y salud del sistema.
   - `card-disk-drive-c` (2x1): Telemetría dedicada de la unidad principal del sistema (C:), porcentaje de uso, espacio libre y temperatura en vivo.
3. **Clasificación Exhaustiva de Hardware**:
   - **NVMe PCIe**: Porcentaje de vida útil de celdas flash, temperatura operativa e interfaz PCIe.
   - **SATA SSD**: Monitoreo de desgaste flash SMART y volúmenes NTFS/exFAT.
   - **HDD Mecánico**: Estado operacional de platos rotacionales, horas de funcionamiento y control de sectores.
   - **USB Extraíble**: Detección dinámica de memorias flash y discos externos conectados.
4. **Desglose de Particiones y Volúmenes**: Muestra letras de unidad (`C:`, `D:`, `E:`), etiqueta de volumen, sistema de archivos (`NTFS`, `exFAT`), y barra de progreso de capacidad con código de color dinámico.
5. **Autonomía y Regla 13**:
   - Scripts de empaquetado (`package.cjs`), pruebas (`test.cjs`), telemetría (`collector.ps1`) y manifiesto residen de manera autocontenida dentro de su carpeta.

## Compilación y Empaquetado

```bash
# Dentro de modules/disk-monitor/
node package.cjs
node test.cjs
```
