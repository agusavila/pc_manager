# Especificación Técnica para IA: Módulo de Monitoreo de Almacenamiento (`disk-monitor`)

Especificación formal del módulo `disk-monitor` para modelos de inteligencia artificial y agentes desarrolladores.

---

## 1. Resumen Contextual y Objetivo

El módulo `disk-monitor` proporciona una interfaz estandarizada de descubrimiento, supervisión y auditoría de unidades físicas de almacenamiento en sistemas operativos Windows. No asume configuraciones predeterminadas de hardware ni precarga discos automáticamente; implementa un flujo de descubrimiento explícito donde el usuario inspecciona el bus de almacenamiento y selecciona qué dispositivos supervisar.

---

## 2. Esquema de Datos y Eventos

### Invocación Nativa IPC: `execute_module_script`
- **Método**: `invoke('execute_module_script', { moduleId: 'disk-monitor', script: COLLECTOR_SCRIPT, interpreter: 'powershell' }) -> Result<String, String>`
- **Comportamiento**: El Core Microkernel valida permisos de ejecución (`system:storage`, `system:execute`) en `registry.json` mediante `module_manager::can_module_execute`. Si está autorizado, ejecuta el script PowerShell del módulo en un proceso sin ventana (`CREATE_NO_WINDOW`) y retorna la cadena JSON de stdout.
- **Esquema de Retorno Deserializado**:
  ```json
  {
    "disks": [
      {
        "DeviceId": "STRING",
        "FriendlyName": "STRING",
        "Model": "STRING",
        "SerialNumber": "STRING",
        "DriveType": "NVMe | SSD | HDD | USB | STRING",
        "MediaType": "SSD | HDD | Removable | Fixed",
        "BusType": "NVMe | SATA | SCSI | USB",
        "Size": 1024209543168,
        "HealthStatus": "Healthy | Warning | Unhealthy",
        "OperationalStatus": "OK | Degraded",
        "HealthPercent": 100, // null si la lectura SMART detallada no está disponible por falta de elevación UAC (Regla 7: Cero Datos Inventados)
        "IsRemovable": false,
        "FileSystems": ["NTFS", "exFAT"],
        "Volumes": [
          {
            "DriveLetter": "C",
            "FileSystemLabel": "Windows",
            "FileSystem": "NTFS",
            "SizeRemaining": 98111770624,
            "Size": 248901529600
          }
        ]
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
   - Queda estrictamente prohibido introducir condiciones de código o heurísticas que contengan nombres de marcas comerciales, líneas de productos o modelos de mercado.
   - La clasificación de tecnologías se basa exclusivamente en enumeradores estándar: `BusType == 'USB' || IsRemovable` $\to$ Almacenamiento USB (Externo); `BusType == 'NVMe'` $\to$ NVMe; `MediaType == 'SSD'` o `SpindleSpeed == 0` $\to$ SSD; `MediaType == 'HDD'` o `SpindleSpeed > 0` $\to$ HDD.
2. **Control de Usuario sobre Selección (Cero Asunciones)**:
   - El módulo almacena en `localStorage` la clave `pcm_disk_monitor_drives`.
   - Si la clave está ausente o vacía, la interfaz debe renderizar el **Empty State** invitando a buscar discos.
3. **Limpieza Absoluta en Desinstalación**:
   - Expone `__CLEANUP_disk_monitor__(opts)` y `__PURGE_disk_monitor__()` para eliminar todas las claves de persistencia local en desinstalación.
4. **Disposición Matricial a 2 Columnas**:
   - Las tarjetas de discos configurados se despliegan en `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;`.
5. **Seguridad Operativa (Regla 5 - Modo Seguro)**:
   - Toda rutina de auditoría es estrictamente de solo lectura (Dry-Run).
6. **Cero Placebos (Regla 7)**:
   - Todos los datos de números de serie, capacidades, salud porcentual, filesystem y sectores provienen de llamadas reales al subsistema de almacenamiento del sistema operativo.
