# Especificación Técnica para IA: Módulo de Monitoreo de Almacenamiento (`disk-monitor`)

Especificación formal del módulo `disk-monitor` para modelos de inteligencia artificial y agentes desarrolladores.

---

## 1. Resumen Contextual y Objetivo

El módulo `disk-monitor` proporciona una interfaz estandarizada de descubrimiento, supervisión y auditoría de unidades físicas de almacenamiento en sistemas operativos Windows. No asume configuraciones predeterminadas de hardware ni precarga discos automáticamente; implementa un flujo de descubrimiento explícito donde el usuario inspecciona el bus de almacenamiento y selecciona qué dispositivos supervisar.

---

## 2. Esquema de Datos y Eventos

### Invocación Nativa IPC: `get_disk_telemetry`
- **Método**: `invoke('get_disk_telemetry') -> Result<Value, String>`
- **Comportamiento**: Ejecuta de forma silenciosa (`CREATE_NO_WINDOW`) consultas nativas a Windows Storage PowerShell (`Get-PhysicalDisk`, `Get-Partition`, `Get-Volume`, `Get-WinEvent`).
- **Esquema de Retorno**:
  ```json
  {
    "disks": [
      {
        "DeviceId": "STRING",
        "FriendlyName": "STRING",
        "Model": "STRING",
        "SerialNumber": "STRING",
        "MediaType": "SSD | HDD | SCM",
        "BusType": "NVMe | SATA | SCSI | USB",
        "SpindleSpeed": 0,
        "Size": 1024209543168,
        "HealthStatus": "Healthy | Warning | Unhealthy",
        "OperationalStatus": "OK | Degraded"
      }
    ],
    "partitions": [
      {
        "DiskNumber": 0,
        "PartitionNumber": 1,
        "DriveLetter": "C",
        "Size": 248901533696
      }
    ],
    "volumes": [
      {
        "DriveLetter": "C",
        "FileSystemLabel": "Windows",
        "FileSystem": "NTFS",
        "HealthStatus": "Healthy",
        "SizeRemaining": 98111770624,
        "Size": 248901529600
      }
    ],
    "events": [
      {
        "TimeCreated": "DATE_STRING",
        "Id": 7,
        "ProviderName": "disk",
        "Message": "STRING"
      }
    ]
  }
  ```

---

## 3. Invariantes Arquitectónicos de Implementación

1. **Neutralidad Total (Regla 2 - Marca Blanca)**:
   - Queda estrictamente prohibido introducir condiciones de código o heurísticas que contengan nombres de marcas comerciales, líneas de productos o modelos de mercado (prohibido `model.includes('...')` para marcas particulares).
   - La clasificación de tecnologías se basa exclusivamente en enumeradores estándar: `BusType == 'NVMe'` $\to$ NVMe; `MediaType == 'SSD'` o `SpindleSpeed == 0` $\to$ SSD; `MediaType == 'HDD'` o `SpindleSpeed > 0` $\to$ HDD.
2. **Control de Usuario sobre Selección (Cero Asunciones)**:
   - El módulo almacena en `localStorage` la clave `pcm_monitored_drives`.
   - Si la clave está ausente o vacía, la interfaz debe renderizar el **Empty State** invitando a buscar discos. No debe poblar automáticamente el tablero con todos los discos del equipo.
3. **Seguridad Operativa (Regla 5 - Modo Seguro)**:
   - Toda rutina de auditoría es estrictamente de solo lectura (Dry-Run).
4. **Cero Placebos (Regla 7)**:
   - Todos los datos de números de serie, capacidades, salud y sectores provienen de llamadas reales al subsistema de almacenamiento del sistema operativo.
