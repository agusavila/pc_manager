# Especificación Técnica para IA: Módulo de Monitoreo de Almacenamiento (`disk-monitor` v2.0)

Especificación formal del módulo `disk-monitor` para modelos de inteligencia artificial y agentes desarrolladores.

---

## 1. Resumen Contextual y Objetivo

El módulo `disk-monitor` proporciona una interfaz estandarizada de descubrimiento, supervisión en tiempo real y widgets operativos para unidades de almacenamiento en Windows. Implementa auto-descubrimiento inmediato sin estado vacío bloqueante, expone widgets canónicos (`card-disk-overview`, `card-disk-drive-c`) y opera con lectura directa y fidedigna de hardware (Regla 7: Cero Datos Inventados).

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
        "DriveType": "NVMe | SSD | HDD | USB",
        "MediaType": "SSD | HDD | Removable | Fixed",
        "BusType": "NVMe | SATA | USB",
        "Size": 1024209543168,
        "HealthStatus": "Healthy | Warning | Unhealthy",
        "OperationalStatus": "OK | Degraded",
        "HealthPercent": 100,
        "Temperature": 48,
        "PowerOnHours": 13877,
        "ReadErrorsTotal": 0,
        "WriteErrorsTotal": 0,
        "ReadErrorsUncorrected": 0,
        "WriteErrorsUncorrected": 0,
        "IsRemovable": false,
        "IsBoot": true,
        "IsSystem": true,
        "FileSystems": ["NTFS"],
        "Partitions": [...],
        "Volumes": [
          {
            "DriveLetter": "C",
            "FileSystemLabel": "",
            "FileSystem": "NTFS",
            "HealthStatus": "Healthy",
            "SizeRemaining": 80097705984,
            "Size": 248901529600
          }
        ]
      }
    ],
    "events": []
  }
  ```

---

## 3. Invariantes Arquitectónicos de Implementación

1. **Auto-descubrimiento Inmediato**: Al montar el módulo, se invoca de inmediato la telemetría y se renderizan todas las unidades físicas sin exigir clics manuales ni abrir modales innecesarios.
2. **Widgets Canónicos de Dashboard**: Expone `card-disk-overview` y `card-disk-drive-c` en `manifest.widgets`, manteniendo sincronizado el estado del tablero principal.
3. **Regla 13 de Aislamiento Modular**: Toda herramienta de empaquetado, pruebas, scripts y manifiesto reside dentro de `modules/disk-monitor/` y sus commits son 100% aislados y atómicos.
4. **Regla 2 (Marca Blanca)**: Cero referencias a marcas comerciales específicas o rutas de usuario personalizadas.
