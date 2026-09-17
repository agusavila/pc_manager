# Especificación Técnica para IA: Módulo de Monitoreo de Almacenamiento (`disk-monitor`)

Documento formal de especificación para modelos de inteligencia artificial y agentes desarrolladores en **PC Manager Core-Modular**.

---

## 1. Resumen Contextual y Objetivo

El módulo `disk-monitor` proporciona supervisión de hardware de almacenamiento local en sistemas Windows nativos. Expone telemetría física de discos (HDD, SSD SATA, SSD NVMe PCIe), salud SMART, topología de particiones/volúmenes y detección de errores de bloques de superficie a través de comandos IPC de Tauri.

---

## 2. Esquema de Datos y Contratos IPC

### Comando IPC Backend: `get_disk_telemetry`
Invocación: `invoke('get_disk_telemetry') -> Result<Value, String>`

#### Estructura del Payload JSON Retornado:
```json
{
  "disks": [
    {
      "DeviceId": "0",
      "FriendlyName": "STRING",
      "Model": "STRING",
      "SerialNumber": "STRING",
      "MediaType": "SSD | HDD | SCM",
      "BusType": "NVMe | SATA | SCSI | USB",
      "Size": 480103981056,
      "HealthStatus": "Healthy | Warning | Unhealthy",
      "OperationalStatus": "OK | Degraded | Error"
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
      "TimeCreated": "/Date(1789081496347)/",
      "Id": 7,
      "ProviderName": "disk",
      "Message": "Descripción del evento de bloque"
    }
  ]
}
```

### Servicio Compartido (`ServiceRegistry`)
- Identificador del servicio: `storage.telemetry`
- Interfaz:
  ```typescript
  interface IStorageTelemetryService {
    getDisksData(): StoragePayload | null;
    getWatchedDisks(): string[] | null;
    refresh(): Promise<void>;
  }
  ```

---

## 3. Invariantes y Restricciones de Generación de Código

1. **Aislamiento y Privacidad (Regla 1)**: Prohibido enviar telemetría de disco fuera del host local. No registrar rutas de usuarios personales.
2. **Marca Blanca (Regla 2)**: Prohibido hardcodear marcas comerciales fijas (Kingston, Samsung, Western Digital); todos los nombres deben provenir dinámicamente de las propiedades `FriendlyName` / `Model` de la API de hardware.
3. **Seguridad Operativa y Dry-Run (Regla 5)**: Cualquier rutina de auditoría de sectores debe ejecutarse estrictamente en modo solo lectura (`read-only`). Prohibida toda operación que altere la tabla de particiones o escriba en el disco sin consentimiento explícito.
4. **Cero Placebos (Regla 7)**: Los contadores de sectores y estados de salud deben reflejar datos reales de la API del sistema operativo. Si no hay eventos de error, el conteo de sectores dañados debe ser `0` demostrable.

---

## 4. Comandos CLI de Verificación

```powershell
# 1. Validar telemetría de discos físicos
powershell -Command "Get-PhysicalDisk | Select-Object DeviceId, Model, MediaType, BusType, HealthStatus | ConvertTo-Json"

# 2. Validar particiones asociadas
powershell -Command "Get-Partition | Select-Object DiskNumber, DriveLetter, Size | ConvertTo-Json"

# 3. Compilar el binario nativo de PC Manager
cd c:\Proyectos\pc_manager\src-tauri; cargo check
```
