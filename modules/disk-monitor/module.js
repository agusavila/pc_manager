(function() {
  'use strict';

  const MODULE_ID = 'disk-monitor';
  const CLEANUP_KEY = '__CLEANUP_disk_monitor__';
  const STORAGE_KEY = 'pcm_disk_monitor_drives';
  const CACHE_KEY = 'pcm_disk_monitor_meta_cache';

  // Script PowerShell de recolección nativa de telemetría (White-Label, Cero Simulación)
  const COLLECTOR_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'

# 1. Verificar si el Servicio de Windows (SYSTEM) ha generado telemetría reciente
$telemetryPath = "$env:ProgramData\\PCManager\\telemetry\\system_telemetry.json"
if (-not (Test-Path $telemetryPath)) {
    $telemetryPath = "$env:ProgramData\\PCManager\\telemetry\\storage_smart.json"
}
if (Test-Path $telemetryPath) {
    $raw = Get-Content -Raw -Path $telemetryPath -ErrorAction SilentlyContinue
    if ($raw) {
        $cached = $raw | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($cached -and $cached.storage -and $cached.storage.disks) {
            Write-Output ($cached.storage | ConvertTo-Json -Depth 5)
            exit 0
        } elseif ($cached -and $cached.disks) {
            Write-Output $raw
            exit 0
        }
    }
}

# 2. Colector de respaldo directo si el servicio no está en ejecución
$pdisks = @(Get-PhysicalDisk -ErrorAction SilentlyContinue)
$counters = @(Get-PhysicalDisk -ErrorAction SilentlyContinue | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue)
$parts = @(Get-Partition -ErrorAction SilentlyContinue | Select-Object DiskNumber, PartitionNumber, DriveLetter, Size)
$vols = @(Get-Volume -ErrorAction SilentlyContinue | Select-Object DriveLetter, FileSystemLabel, FileSystem, HealthStatus, SizeRemaining, Size, DriveType)

$disks = @(Get-Disk -ErrorAction SilentlyContinue | ForEach-Object {
    $d = $_
    $p = $pdisks | Where-Object { [string]$_.DeviceId -eq [string]$d.Number } | Select-Object -First 1
    $c = $counters | Where-Object { [string]$_.DeviceId -eq [string]$d.Number } | Select-Object -First 1

    $driveType = 'Almacenamiento'
    $isUsb = ($d.BusType -eq 'USB' -or $d.IsRemovable -or ($p -and $p.BusType -eq 'USB'))
    if ($isUsb) {
        $driveType = 'USB'
    } elseif ($p -and $p.BusType -eq 'NVMe') {
        $driveType = 'NVMe'
    } elseif ($p -and $p.MediaType -eq 'SSD') {
        $driveType = 'SSD'
    } elseif ($p -and $p.MediaType -eq 'HDD') {
        $driveType = 'HDD'
    } elseif ($d.BusType) {
        $driveType = [string]$d.BusType
    }

    $isHdd = ($driveType -eq 'HDD' -or ($p -and $p.MediaType -eq 'HDD'))

    # Desgaste SMART: Solo para medios flash (SSD / NVMe). Para HDDs NUNCA se calcula desgaste de celdas.
    $healthPercent = $null
    if (-not $isHdd -and $c -and $c.Wear -ne $null) {
        $healthPercent = [Math]::Max(0, 100 - [int]$c.Wear)
    }

    $diskPartitions = @($parts | Where-Object { [string]$_.DiskNumber -eq [string]$d.Number })
    $diskVols = @($diskPartitions | ForEach-Object {
        $ltr = $_.DriveLetter
        if ($ltr) {
            $vols | Where-Object { [string]$_.DriveLetter -eq [string]$ltr }
        }
    })

    $fileSystems = @($diskVols | Where-Object { $_.FileSystem } | ForEach-Object { [string]$_.FileSystem } | Select-Object -Unique)

    $serial = if ($p -and $p.SerialNumber) { [string]$p.SerialNumber.Trim() } else { [string]$d.SerialNumber }
    if (-not $serial -or $serial -eq '') { $serial = 'N/D' }

    $model = if ($p -and $p.Model) { [string]$p.Model.Trim() } else { [string]$d.Model }
    if (-not $model -or $model -eq '') { $model = $d.FriendlyName }

    [PSCustomObject]@{
        DeviceId = [string]$d.Number
        FriendlyName = [string]$d.FriendlyName
        Model = $model
        SerialNumber = $serial
        BusType = if ($p -and $p.BusType) { [string]$p.BusType } else { [string]$d.BusType }
        DriveType = $driveType
        MediaType = if ($p -and $p.MediaType) { [string]$p.MediaType } else { if ($isUsb) { 'Removable' } else { 'Fixed' } }
        IsHdd = [bool]$isHdd
        HealthStatus = if ($p -and $p.HealthStatus) { [string]$p.HealthStatus } else { [string]$d.HealthStatus }
        OperationalStatus = if ($p -and $p.OperationalStatus) { [string]$p.OperationalStatus } else { [string]$d.OperationalStatus }
        HealthPercent = $healthPercent
        Temperature = if ($c -and $c.Temperature -gt 0) { [int]$c.Temperature } else { $null }
        ReadErrorsTotal = if ($c -and $c.ReadErrorsTotal -ne $null) { [int]$c.ReadErrorsTotal } else { 0 }
        WriteErrorsTotal = if ($c -and $c.WriteErrorsTotal -ne $null) { [int]$c.WriteErrorsTotal } else { 0 }
        ReadErrorsUncorrected = if ($c -and $c.ReadErrorsUncorrected -ne $null) { [int]$c.ReadErrorsUncorrected } else { 0 }
        WriteErrorsUncorrected = if ($c -and $c.WriteErrorsUncorrected -ne $null) { [int]$c.WriteErrorsUncorrected } else { 0 }
        PowerOnHours = if ($c -and $c.PowerOnHours -ne $null) { [int]$c.PowerOnHours } else { $null }
        Size = [int64]$d.Size
        IsRemovable = [bool]$isUsb
        IsBoot = [bool]$d.IsBoot
        IsSystem = [bool]$d.IsSystem
        IsConnected = $true
        FileSystems = $fileSystems
        Partitions = $diskPartitions
        Volumes = $diskVols
    }
})

$events = @(Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName=@('disk','Ntfs','stornvme','partmgr'); Id=7,55,98,153} -MaxEvents 12 -ErrorAction SilentlyContinue | ForEach-Object {
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')
        Id = $_.Id
        ProviderName = $_.ProviderName
        Message = $_.Message
    }
})

[PSCustomObject]@{
    disks = $disks
    events = $events
    timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
} | ConvertTo-Json -Depth 5
`.trim();

  let rawTelemetryData = null;
  let activeFilter = 'all';
  let refreshTimer = null;

  let refreshIntervalSetting = '30s';
  let customIntervalSeconds = 45;
  let autoRefreshEnabled = true;

  // Persistencia de unidades vigiladas por el usuario
  function getMonitoredDriveIds() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = localStorage.getItem('pcm_monitored_drives');
      }
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function saveMonitoredDriveIds(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {}
  }

  // Caché de metadatos de discos (para identificar limpiamente desconexiones USB)
  function getCachedDisksMetadata() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  function updateDisksCache(disks) {
    if (!disks || !Array.isArray(disks)) return;
    try {
      const cache = getCachedDisksMetadata();
      disks.forEach(d => {
        const id = String(d.DeviceId);
        cache[id] = {
          DeviceId: id,
          FriendlyName: d.FriendlyName || d.Model,
          Model: d.Model,
          SerialNumber: d.SerialNumber,
          BusType: d.BusType,
          DriveType: d.DriveType,
          MediaType: d.MediaType,
          IsHdd: d.IsHdd,
          IsRemovable: d.IsRemovable,
          Size: d.Size,
          FileSystems: d.FileSystems || []
        };
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {}
  }

  // Formateador estándar de bytes
  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
  }

  // Helper para invocar Tauri IPC
  function getInvoke() {
    if (typeof getTauriInvoke === 'function') {
      const fn = getTauriInvoke();
      if (fn) return fn;
    }
    return window.__TAURI__?.core?.invoke || window.__TAURI__?.tauri?.invoke || window.__TAURI_INVOKE__;
  }

  // Clasificación precisa de tecnología de almacenamiento
  function detectTechnology(disk) {
    const driveType = (disk.DriveType || '').toUpperCase();
    const bus = (disk.BusType || '').toUpperCase();
    const media = (disk.MediaType || '').toUpperCase();
    const friendly = (disk.FriendlyName || disk.Model || '').toUpperCase();
    const isRemovable = Boolean(disk.IsRemovable);
    const isHdd = Boolean(disk.IsHdd) || driveType === 'HDD' || media === 'HDD' || friendly.includes('HARDDRIVE') || (friendly.includes('ST1000') || friendly.includes('ST2000') || friendly.includes('WD') && !friendly.includes('SSD'));

    if (driveType === 'USB' || bus === 'USB' || isRemovable) {
      return {
        type: 'USB',
        label: 'Almacenamiento USB',
        color: '#06b6d4',
        bg: 'rgba(6, 182, 212, 0.15)',
        icon: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>'
      };
    } else if (driveType === 'NVME' || bus === 'NVME' || friendly.includes('NVME')) {
      return {
        type: 'NVMe',
        label: 'NVMe PCIe',
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.15)',
        icon: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
      };
    } else if (isHdd) {
      return {
        type: 'HDD',
        label: 'HDD Mecánico',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)',
        icon: '<svg class="svg-icon" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>'
      };
    } else if (driveType === 'SSD' || media === 'SSD' || friendly.includes('SSD')) {
      return {
        type: 'SSD',
        label: 'SATA SSD',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
        icon: '<svg class="svg-icon" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 7h10"></path><path d="M7 12h10"></path><path d="M7 17h10"></path></svg>'
      };
    } else {
      return {
        type: 'DISCO',
        label: bus ? `Bus ${bus}` : 'Unidad Local',
        color: 'var(--text-secondary)',
        bg: 'var(--bg-elevated)',
        icon: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
      };
    }
  }

  // Recolección de telemetría: Prioridad al Servicio de Windows (SYSTEM) sin requerir elevación UAC en la app
  async function fetchRawTelemetry() {
    const invokeFn = getInvoke();
    if (!invokeFn) return null;

    try {
      // 1. Intentar primero consumir la telemetría del Servicio mediante ServiceRegistry o IPC directo
      if (window.ServiceRegistry && window.ServiceRegistry.has('system.telemetry')) {
        try {
          const sysSvc = window.ServiceRegistry.get('system.telemetry');
          if (sysSvc && typeof sysSvc.getStorageTelemetry === 'function') {
            const parsed = await sysSvc.getStorageTelemetry();
            if (parsed && Array.isArray(parsed.disks) && parsed.disks.length > 0) {
              rawTelemetryData = parsed;
              updateDisksCache(parsed.disks);
              const timeEl = document.getElementById('dm-last-scan-time');
              if (timeEl) {
                timeEl.textContent = `Actualizado (Servicio): ${new Date().toLocaleTimeString()}`;
              }
              return parsed;
            }
          }
        } catch (regErr) {
          // Fallback al IPC directo
        }
      }

      try {
        const serviceTelemetry = await invokeFn('get_storage_telemetry');
        if (serviceTelemetry) {
          const parsed = JSON.parse(serviceTelemetry);
          if (parsed && Array.isArray(parsed.disks) && parsed.disks.length > 0) {
            rawTelemetryData = parsed;
            updateDisksCache(parsed.disks);
            const timeEl = document.getElementById('dm-last-scan-time');
            if (timeEl) {
              timeEl.textContent = `Actualizado (Servicio): ${new Date().toLocaleTimeString()}`;
            }
            return parsed;
          }
        }
      } catch (svcErr) {
        // Fallback silencioso si el comando aún no está disponible
      }

      // 2. Fallback: colector nativo a través de execute_module_script
      const stdout = await invokeFn('execute_module_script', {
        moduleId: MODULE_ID,
        script: COLLECTOR_SCRIPT,
        interpreter: 'powershell'
      });
      if (!stdout) return null;
      const data = JSON.parse(stdout);
      rawTelemetryData = data;
      if (data && data.disks) {
        updateDisksCache(data.disks);
      }
      const timeEl = document.getElementById('dm-last-scan-time');
      if (timeEl) {
        timeEl.textContent = `Actualizado: ${new Date().toLocaleTimeString()}`;
      }
      return data;
    } catch (err) {
      console.error('Error al consultar telemetría nativa del módulo disk-monitor:', err);
      return null;
    }
  }

  // Refrescar unidades vigiladas
  async function refreshWatchedDisks() {
    const spinIcon = document.getElementById('icon-dm-spin');
    if (spinIcon) spinIcon.classList.add('rotating');
    try {
      await fetchRawTelemetry();
      renderMainArea();
    } finally {
      if (spinIcon) spinIcon.classList.remove('rotating');
    }
  }

  // Renderizado del área principal con soporte exhaustivo de filtros y dispositivos desconectados
  function renderMainArea() {
    const container = document.getElementById('dm-main-content-area');
    if (!container) return;

    const monitoredIds = getMonitoredDriveIds();

    // 1. Empty State de fábrica
    if (!monitoredIds || monitoredIds.length === 0) {
      container.innerHTML = `
        <div class="settings-card" style="padding: 48px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; border: 2px dashed var(--border-subtle); background: var(--bg-surface);">
          <div style="width: 64px; height: 64px; border-radius: var(--radius-xl); background: var(--accent-primary-dim); color: var(--accent-primary); display: flex; align-items: center; justify-content: center;">
            <svg class="svg-icon" style="width: 32px; height: 32px;" viewBox="0 0 24 24"><path d="M22 12H2"></path><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>
          </div>
          <div>
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0;">Sin unidades en monitoreo activo</h3>
            <p style="font-size: 13px; color: var(--text-secondary); max-width: 500px; margin: 8px auto 0; line-height: 1.5;">
              Seleccione de forma precisa qué unidades locales o dispositivos USB supervisar. Utilice la función de búsqueda para detectar las unidades físicas del equipo e incorporarlas al panel operativo.
            </p>
          </div>
          <button class="btn btn-primary" style="padding: 10px 20px; font-size: 13px; margin-top: 6px;" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.openDiscoveryModal()">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            <span>Buscar y Seleccionar Unidades</span>
          </button>
        </div>
      `;
      return;
    }

    // 2. Consulta de telemetría si aún no está en memoria
    if (!rawTelemetryData) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 12px;">
          <svg class="svg-icon rotating" style="width: 28px; height: 28px;" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
          <span>Leyendo telemetría de almacenamiento del sistema...</span>
        </div>
      `;
      fetchRawTelemetry().then(() => renderMainArea());
      return;
    }

    const liveDisks = rawTelemetryData.disks || [];
    const events = rawTelemetryData.events || [];
    const cache = getCachedDisksMetadata();

    // Mapeo exhaustivo: Unidades vigiladas conectadas vs. desconectadas (reactividad de pendrives)
    const monitoredItems = monitoredIds.map(id => {
      const live = liveDisks.find(d => String(d.DeviceId) === String(id));
      if (live) {
        return { isConnected: true, disk: live };
      }
      const cached = cache[String(id)] || {
        DeviceId: String(id),
        FriendlyName: `Dispositivo USB (${id})`,
        Model: 'Almacenamiento Extraíble',
        DriveType: 'USB',
        BusType: 'USB',
        IsRemovable: true,
        Size: 0
      };
      return { isConnected: false, disk: cached };
    });

    // Métricas por tipo de tecnología
    let nvmeCount = 0;
    let ssdCount = 0;
    let hddCount = 0;
    let usbCount = 0;
    let totalCap = 0;
    let alertsCount = 0;

    monitoredItems.forEach(item => {
      const d = item.disk;
      const tech = detectTechnology(d);
      if (tech.type === 'NVMe') nvmeCount++;
      else if (tech.type === 'SSD') ssdCount++;
      else if (tech.type === 'HDD') hddCount++;
      else if (tech.type === 'USB') usbCount++;

      if (d.Size && item.isConnected) totalCap += Number(d.Size);

      const hasAlert = !item.isConnected ||
                       (d.HealthStatus && d.HealthStatus.toLowerCase() !== 'healthy') ||
                       (Number(d.ReadErrorsUncorrected) > 0) ||
                       (Number(d.WriteErrorsUncorrected) > 0);
      if (hasAlert) alertsCount++;
    });

    const badEventsCount = events.length;

    // Filtros activos respetando la categoría exacta
    const filteredItems = monitoredItems.filter(item => {
      const d = item.disk;
      const tech = detectTechnology(d);
      const isAlert = !item.isConnected ||
                      (d.HealthStatus && d.HealthStatus.toLowerCase() !== 'healthy') ||
                      (Number(d.ReadErrorsUncorrected) > 0) ||
                      (Number(d.WriteErrorsUncorrected) > 0);

      if (activeFilter === 'nvme') return tech.type === 'NVMe';
      if (activeFilter === 'ssd') return tech.type === 'SSD';
      if (activeFilter === 'hdd') return tech.type === 'HDD';
      if (activeFilter === 'usb') return tech.type === 'USB';
      if (activeFilter === 'alerts') return isAlert;
      return true;
    });

    container.innerHTML = `
      <!-- Métricas Resumen -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
        <div class="settings-card" style="padding: 14px 16px; gap: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Unidades Vigiladas</div>
          <div style="font-size: 22px; font-weight: 800; color: var(--accent-primary);">${monitoredItems.length}</div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">${nvmeCount} NVMe, ${ssdCount} SSD, ${hddCount} HDD${usbCount > 0 ? ', ' + usbCount + ' USB' : ''}</div>
        </div>
        <div class="settings-card" style="padding: 14px 16px; gap: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Estado Global</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 22px; font-weight: 800; color: ${alertsCount > 0 || badEventsCount > 0 ? 'var(--accent-warning)' : 'var(--accent-success)'};">
              ${alertsCount > 0 || badEventsCount > 0 ? 'Revisión' : 'Saludable'}
            </div>
            <span class="card-badge" style="color: ${alertsCount > 0 || badEventsCount > 0 ? 'var(--accent-warning)' : 'var(--accent-success)'}; background: ${alertsCount > 0 || badEventsCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.12)'}; font-weight: 700;">
              ${alertsCount > 0 ? alertsCount + ' Alertas' : (badEventsCount > 0 ? badEventsCount + ' Eventos' : 'Operativo')}
            </span>
          </div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">
            ${badEventsCount > 0 ? badEventsCount + ' advertencias de hardware en registro' : (alertsCount > 0 ? alertsCount + ' unidades requieren atención o están desconectadas' : 'Subsistema sin anomalías reportadas')}
          </div>
        </div>
        <div class="settings-card" style="padding: 14px 16px; gap: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Capacidad Supervisada</div>
          <div style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${formatBytes(totalCap)}</div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">Almacenamiento total conectado</div>
        </div>
      </div>

      <!-- Barra de Filtros Material Expressive -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 4px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-right: 4px;">Filtrar:</span>
          <button class="filter-chip ${activeFilter === 'all' ? 'active' : ''}" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('all')">
            <span>Todos</span>
            <span class="chip-count">${monitoredItems.length}</span>
          </button>
          <button class="filter-chip ${activeFilter === 'nvme' ? 'active' : ''}" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('nvme')">
            <span>NVMe</span>
            <span class="chip-count">${nvmeCount}</span>
          </button>
          <button class="filter-chip ${activeFilter === 'ssd' ? 'active' : ''}" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('ssd')">
            <span>SATA SSD</span>
            <span class="chip-count">${ssdCount}</span>
          </button>
          <button class="filter-chip ${activeFilter === 'hdd' ? 'active' : ''}" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('hdd')">
            <span>HDD</span>
            <span class="chip-count">${hddCount}</span>
          </button>
          <button class="filter-chip ${activeFilter === 'usb' ? 'active' : ''}" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('usb')">
            <span>USB</span>
            <span class="chip-count">${usbCount}</span>
          </button>
          <button class="filter-chip ${activeFilter === 'alerts' ? 'active' : ''}" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('alerts')">
            <span>Alertas</span>
            <span class="chip-count">${alertsCount}</span>
          </button>
        </div>
        <button class="btn btn-secondary" style="padding: 6px 14px; font-size: 12px;" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.openDiscoveryModal()">
          <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Seleccionar Unidades</span>
        </button>
      </div>

      <!-- Cuadrícula Canónica: Tarjetas Cuadradas y Reactivas -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; margin-top: 10px;">
        ${filteredItems.length === 0 ? `
          <div class="settings-card" style="grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--text-secondary);">
            No hay unidades que coincidan con el filtro seleccionado ("${activeFilter.toUpperCase()}").
          </div>
        ` : filteredItems.map(item => item.isConnected ? renderDiskCard(item.disk) : renderDisconnectedDiskCard(item.disk)).join('')}
      </div>
    `;
  }

  // Tarjeta para Dispositivos Desconectados / Extraídos (Pendrives quitados reactivamente)
  function renderDisconnectedDiskCard(disk) {
    const id = String(disk.DeviceId);
    const tech = detectTechnology(disk);

    return `
      <div class="settings-card" id="card-monitored-disk-${id}" style="padding: 16px; gap: 12px; border-left: 4px solid var(--accent-danger); display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm); min-height: 290px; background: var(--bg-card);">
        <div>
          <!-- Cabecera -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
            <div style="display: flex; gap: 10px; align-items: center; min-width: 0; flex: 1;">
              <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.12); color: var(--accent-danger); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg class="svg-icon" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
              </div>
              <div style="min-width: 0; flex: 1;">
                <h4 style="font-size: 14px; font-weight: 700; margin: 0; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${disk.FriendlyName || disk.Model}">
                  ${disk.FriendlyName || disk.Model || 'Dispositivo ' + id}
                </h4>
                <div style="display: flex; align-items: center; gap: 5px; margin-top: 3px; flex-wrap: wrap;">
                  <span class="card-badge" style="background: rgba(239, 68, 68, 0.15); color: var(--accent-danger); font-weight: 700; font-size: 9.5px;">Desconectado</span>
                  <span class="card-badge" style="background: var(--bg-surface); color: var(--text-secondary); font-size: 9.5px;">${tech.label}</span>
                </div>
              </div>
            </div>
            <!-- Botón Quitar de Vigilancia -->
            <button class="btn btn-secondary" style="color: var(--accent-danger); padding: 4px 8px; font-size: 11px; flex-shrink: 0;" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.removeMonitoredDisk('${id}')" title="Quitar de la lista de vigilancia">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <!-- Banner de Dispositivo Extraído -->
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-sm); padding: 12px; margin-top: 12px;">
            <div style="display: flex; align-items: center; gap: 7px; color: var(--accent-danger); font-size: 12px; font-weight: 700;">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>Dispositivo Extraído del Bus</span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 5px; line-height: 1.4;">
              Esta unidad ya no se encuentra conectada físicamente al sistema. Si vuelve a insertarla, el monitoreo se reanudará de manera automática.
            </div>
          </div>

          <!-- Especificaciones registradas previamente -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; margin-top: 10px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 10px; opacity: 0.75;">
            <div>
              <div style="font-size: 9.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Capacidad</div>
              <div style="font-size: 11.5px; font-weight: 700; color: var(--text-primary); margin-top: 1px;">
                ${disk.Size ? formatBytes(disk.Size) : 'N/D'}
              </div>
            </div>
            <div>
              <div style="font-size: 9.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Bus / Puerto</div>
              <div style="font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin-top: 1px;">
                ${disk.BusType || 'USB'}
              </div>
            </div>
          </div>
        </div>

        <div>
          <button class="btn btn-secondary" style="padding: 7px 12px; font-size: 11.5px; width: 100%; justify-content: center; color: var(--accent-danger); border-color: rgba(239,68,68,0.3);" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.removeMonitoredDisk('${id}')">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Quitar de la lista de vigilancia</span>
          </button>
        </div>
      </div>
    `;
  }

  // Renderizado de tarjeta individual conectada (HDDs sin métrica falsa de desgaste de celdas flash)
  function renderDiskCard(disk) {
    const id = String(disk.DeviceId);
    const tech = detectTechnology(disk);
    const isHealthy = (!disk.HealthStatus || disk.HealthStatus.toLowerCase() === 'healthy');
    const isSystemDrive = Boolean(disk.IsSystem || disk.IsBoot);
    const isHdd = Boolean(disk.IsHdd) || tech.type === 'HDD' || (disk.MediaType || '').toUpperCase() === 'HDD';

    let healthBadgeHtml = '';
    let healthBoxHtml = '';

    if (isHdd) {
      // TRATAMIENTO RIGUROSO DE HDD MECÁNICO:
      // Un HDD rotacional no posee celdas de silicio flash ni desgaste por ciclos de borrado.
      // Queda terminantemente prohibido mostrar % de desgaste en HDDs (Regla 7).
      const uncorrectedRead = Number(disk.ReadErrorsUncorrected) || 0;
      const uncorrectedWrite = Number(disk.WriteErrorsUncorrected) || 0;
      const totalErrors = uncorrectedRead + uncorrectedWrite;
      const hColor = totalErrors === 0 ? 'var(--accent-success)' : 'var(--accent-warning)';
      const hBg = totalErrors === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';

      healthBadgeHtml = `
        <span class="card-badge" style="background: ${hBg}; color: ${hColor}; font-weight: 700; font-size: 10px; border: 1px solid ${hColor}33;">
          ${totalErrors === 0 ? 'Integridad Óptima' : 'Sectores con Error'}
        </span>
      `;

      healthBoxHtml = `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 10px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
            <span style="color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">Integridad de Superficie</span>
            <strong style="color: ${hColor}; font-size: 11.5px;">${totalErrors === 0 ? '0 Errores No Corregidos' : totalErrors + ' anomalías I/O'}</strong>
          </div>
          <div style="font-size: 10.5px; color: var(--text-secondary); margin-top: 3px; line-height: 1.3;">
            Unidad rotacional magnética: desgaste de celdas no aplicable.
          </div>
        </div>
      `;
    } else {
      // MEDIOS FLASH (SSD / NVMe):
      const hasWearMetric = (disk.HealthPercent !== undefined && disk.HealthPercent !== null);
      const healthPercentVal = hasWearMetric ? Number(disk.HealthPercent) : null;

      if (hasWearMetric) {
        const hColor = healthPercentVal >= 90 ? 'var(--accent-success)' : (healthPercentVal >= 70 ? 'var(--accent-warning)' : 'var(--accent-danger)');
        const hBg = healthPercentVal >= 90 ? 'rgba(16, 185, 129, 0.15)' : (healthPercentVal >= 70 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)');

        healthBadgeHtml = `
          <span class="card-badge" style="background: ${hBg}; color: ${hColor}; font-weight: 700; font-size: 10px; border: 1px solid ${hColor}33;">
            ${healthPercentVal}% Vida Útil
          </span>
        `;
        healthBoxHtml = `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 10px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 4px;">
              <span style="color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">Desgaste SMART (Flash)</span>
              <strong style="color: ${hColor}; font-size: 11.5px;">${healthPercentVal}% Salud</strong>
            </div>
            <div style="width: 100%; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden;">
              <div style="width: ${healthPercentVal}%; height: 100%; background: ${hColor}; border-radius: 3px; transition: width 0.3s ease;"></div>
            </div>
          </div>
        `;
      } else {
        const hColor = isHealthy ? 'var(--accent-success)' : 'var(--accent-warning)';
        const hBg = isHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
        healthBadgeHtml = `
          <span class="card-badge" style="background: ${hBg}; color: ${hColor}; font-weight: 700; font-size: 10px; border: 1px solid ${hColor}33;">
            ${disk.HealthStatus || 'Saludable'}
          </span>
        `;
        healthBoxHtml = `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 10px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span style="color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">Estado Operativo</span>
              <strong style="color: ${hColor}; font-size: 11.5px;">${disk.HealthStatus || 'OK'}</strong>
            </div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
              (Sondeo de desgaste pendiente del Servicio de Windows)
            </div>
          </div>
        `;
      }
    }

    // Particiones y Volúmenes reales con Filesystem
    const volumes = disk.Volumes || [];
    let volumesHtml = '';
    if (volumes.length > 0) {
      volumesHtml = `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 9px 10px; margin-top: 10px; display: flex; flex-direction: column; gap: 7px;">
          <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">Volúmenes y Sistema de Archivos</div>
          ${volumes.map(vol => {
            const letter = vol.DriveLetter ? `${vol.DriveLetter}:` : 'Vol';
            const label = vol.FileSystemLabel ? vol.FileSystemLabel : 'Unidad Local';
            const fs = vol.FileSystem ? String(vol.FileSystem).toUpperCase() : 'NTFS';
            const total = Number(vol.Size) || 0;
            const free = Number(vol.SizeRemaining) || 0;
            const used = total > free ? (total - free) : 0;
            const percentUsed = total > 0 ? Math.round((used / total) * 100) : 0;

            return `
              <div style="background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 7px 9px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
                    <span class="card-badge" style="background: var(--accent-primary-dim); color: var(--accent-primary); font-weight: 800; font-size: 11px;">${letter}</span>
                    <span style="font-size: 11.5px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</span>
                  </div>
                  <span class="card-badge" style="background: var(--bg-surface); color: var(--text-primary); font-weight: 700; border: 1px solid var(--border-medium); font-size: 10px; padding: 2px 6px;">${fs}</span>
                </div>
                <div style="width: 100%; height: 5px; background: var(--bg-surface); border-radius: 3px; overflow: hidden; margin: 4px 0;">
                  <div style="width: ${percentUsed}%; height: 100%; background: ${percentUsed > 90 ? 'var(--accent-danger)' : 'var(--accent-primary)'}; border-radius: 3px;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-secondary);">
                  <span>${formatBytes(used)} (${percentUsed}%)</span>
                  <span>${formatBytes(free)} libres</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // Insignia de temperatura si está disponible
    const tempBadge = (disk.Temperature && Number(disk.Temperature) > 0)
      ? `<span class="card-badge" style="background: rgba(14, 165, 233, 0.15); color: #0ea5e9; font-weight: 700; font-size: 9.5px;">${disk.Temperature}°C</span>`
      : '';

    return `
      <div class="settings-card" id="card-monitored-disk-${id}" style="padding: 16px; gap: 10px; border-left: 4px solid ${tech.color}; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm); min-height: 290px;">
        <div>
          <!-- Cabecera -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
            <div style="display: flex; gap: 10px; align-items: center; min-width: 0; flex: 1;">
              <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background: ${tech.bg}; color: ${tech.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${tech.icon}
              </div>
              <div style="min-width: 0; flex: 1;">
                <h4 style="font-size: 14px; font-weight: 700; margin: 0; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${disk.FriendlyName || disk.Model}">
                  ${disk.FriendlyName || disk.Model || 'Unidad ' + id}
                </h4>
                <div style="display: flex; align-items: center; gap: 5px; margin-top: 3px; flex-wrap: wrap;">
                  <span class="card-badge" style="background: ${tech.bg}; color: ${tech.color}; font-weight: 700; font-size: 9.5px;">${tech.label}</span>
                  ${healthBadgeHtml}
                  ${tempBadge}
                  ${isSystemDrive ? '<span class="card-badge" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-weight: 700; font-size: 9.5px;">Sistema</span>' : ''}
                </div>
              </div>
            </div>
            <!-- Botón Quitar de Vigilancia -->
            <button class="btn btn-secondary" style="color: var(--accent-danger); padding: 4px 8px; font-size: 11px; flex-shrink: 0;" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.removeMonitoredDisk('${id}')" title="Dejar de vigilar este disco">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <!-- Bloque de Salud -->
          ${healthBoxHtml}

          <!-- Cuadrícula de Especificaciones Físicas -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; margin-top: 10px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 10px;">
            <div>
              <div style="font-size: 9.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Capacidad</div>
              <div style="font-size: 11.5px; font-weight: 700; color: var(--text-primary); margin-top: 1px;">
                ${formatBytes(disk.Size)}
              </div>
            </div>
            <div>
              <div style="font-size: 9.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Interfaz / Bus</div>
              <div style="font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin-top: 1px;">
                ${disk.BusType || 'Estándar'}
              </div>
            </div>
            <div>
              <div style="font-size: 9.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Nº de Serie</div>
              <div style="font-size: 10.5px; font-weight: 600; font-family: monospace; color: var(--text-secondary); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${disk.SerialNumber}">
                ${disk.SerialNumber || 'No reportado'}
              </div>
            </div>
            <div>
              <div style="font-size: 9.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Estado Operativo</div>
              <div style="font-size: 10.5px; font-weight: 700; color: var(--accent-success); margin-top: 1px;">
                ${disk.OperationalStatus || 'OK'}
              </div>
            </div>
          </div>
        </div>

        <!-- Volúmenes y Acción de Diagnóstico Real -->
        <div>
          ${volumesHtml}
          <div style="margin-top: 10px;">
            <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 11px; width: 100%; justify-content: center;" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.openRealAudit('${id}')">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>Diagnóstico de Bloques y Registro</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Modal de Descubrimiento de Unidades Físicas (Checkboxes Material Expressive con SVG)
  async function openDiscoveryModal() {
    const modal = document.getElementById('dm-discovery-modal');
    const list = document.getElementById('dm-discovery-list');
    if (!modal || !list) return;

    modal.style.display = 'flex';
    list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">Consultando bus de almacenamiento del sistema...</div>`;

    const data = await fetchRawTelemetry();
    if (!data || !data.disks || data.disks.length === 0) {
      list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">No se detectaron unidades físicas en el bus del sistema.</div>`;
      return;
    }

    const currentMonitored = getMonitoredDriveIds();

    list.innerHTML = data.disks.map(d => {
      const id = String(d.DeviceId);
      const tech = detectTechnology(d);
      const isChecked = currentMonitored.includes(id);
      const fsText = (d.FileSystems && d.FileSystems.length > 0) ? d.FileSystems.join(', ') : 'Desconocido';

      return `
        <label class="custom-checkbox" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; gap: 12px; transition: border-color 0.15s ease;">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
            <input type="checkbox" class="dm-drive-checkbox" value="${id}" ${isChecked ? 'checked' : ''} onchange="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.updateDiscoveryCount()">
            <div class="checkbox-indicator">
              <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${tech.bg}; color: ${tech.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${tech.icon}
            </div>
            <div style="min-width: 0;">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${d.FriendlyName || d.Model || 'Unidad ' + id}
              </div>
              <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                <span class="card-badge" style="background: ${tech.bg}; color: ${tech.color}; font-size: 9.5px;">${tech.label}</span>
                <span>${formatBytes(d.Size)}</span>
                <span>•</span>
                <span>FS: ${fsText}</span>
              </div>
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 10.5px; font-weight: 700; color: var(--accent-success);">${d.OperationalStatus || 'OK'}</div>
            <div style="font-size: 10px; font-family: monospace; color: var(--text-muted);">${d.SerialNumber ? d.SerialNumber.substring(0, 14) : ''}</div>
          </div>
        </label>
      `;
    }).join('');

    updateDiscoveryCount();
  }

  function closeDiscoveryModal() {
    const modal = document.getElementById('dm-discovery-modal');
    if (modal) modal.style.display = 'none';
  }

  function updateDiscoveryCount() {
    const summary = document.getElementById('dm-discovery-summary');
    const checked = document.querySelectorAll('.dm-drive-checkbox:checked');
    if (summary) {
      summary.textContent = `${checked.length} ${checked.length === 1 ? 'unidad seleccionada' : 'unidades seleccionadas'}`;
    }
  }

  function addSelectedDisks() {
    const checked = document.querySelectorAll('.dm-drive-checkbox:checked');
    const ids = Array.from(checked).map(c => c.value);
    saveMonitoredDriveIds(ids);
    closeDiscoveryModal();
    renderMainArea();
  }

  function removeMonitoredDisk(id) {
    let ids = getMonitoredDriveIds();
    ids = ids.filter(i => String(i) !== String(id));
    saveMonitoredDriveIds(ids);
    renderMainArea();
  }

  function setFilter(filter) {
    activeFilter = filter;
    renderMainArea();
  }

  // Diagnóstico de Bloques y Registro de Windows (Cero Animaciones Falsas, Cero Placebos)
  function openRealAudit(diskId) {
    const modal = document.getElementById('dm-audit-modal');
    const content = document.getElementById('dm-audit-content-area');
    if (!modal || !content) return;

    modal.style.display = 'flex';

    if (!rawTelemetryData || !rawTelemetryData.disks) {
      content.innerHTML = `<div style="color: var(--text-muted);">Cargando telemetría...</div>`;
      return;
    }

    const disk = rawTelemetryData.disks.find(d => String(d.DeviceId) === String(diskId));
    if (!disk) {
      content.innerHTML = `
        <div style="padding: 12px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-sm); color: var(--accent-danger); font-size: 12px;">
          <strong>Dispositivo no accesible en el bus físico.</strong><br>
          La unidad seleccionada fue desconectada o retirada del sistema. El diagnóstico de hardware en tiempo real requiere que el dispositivo esté presente físicamente.
        </div>
      `;
      return;
    }

    const tech = detectTechnology(disk);
    const events = rawTelemetryData.events || [];
    const readTotal = Number(disk.ReadErrorsTotal) || 0;
    const writeTotal = Number(disk.WriteErrorsTotal) || 0;
    const readUncorrected = Number(disk.ReadErrorsUncorrected) || 0;
    const writeUncorrected = Number(disk.WriteErrorsUncorrected) || 0;

    let eventsListHtml = '';
    if (events.length > 0) {
      eventsListHtml = `
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto;">
          ${events.map(e => `
            <div style="background: var(--bg-surface); border-left: 3px solid var(--accent-warning); padding: 6px 10px; font-size: 11px; border-radius: 2px;">
              <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 10px;">
                <span>${e.TimeCreated}</span>
                <span>ID: ${e.Id} (${e.ProviderName})</span>
              </div>
              <div style="color: var(--text-primary); margin-top: 2px;">${e.Message || 'Evento de I/O de almacenamiento'}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      eventsListHtml = `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px; text-align: center; color: var(--accent-success); font-size: 12px; font-weight: 600;">
          ✓ 0 anomalías o errores de I/O reportados en los registros del controlador del sistema de Windows.
        </div>
      `;
    }

    content.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11.5px;">
        <div>Unidad: <strong style="color: var(--text-primary);">${disk.FriendlyName || disk.Model}</strong></div>
        <div>Tecnología: <strong style="color: ${tech.color};">${tech.label}</strong></div>
        <div>Nº Serie: <strong style="color: var(--text-secondary); font-family: monospace;">${disk.SerialNumber}</strong></div>
        <div>Estado Operativo: <strong style="color: var(--accent-success);">${disk.OperationalStatus || 'OK'}</strong></div>
        <div>Errores I/O Lectura Totales: <strong style="color: ${readTotal > 0 ? 'var(--accent-warning)' : 'var(--accent-success)'};">${readTotal}</strong></div>
        <div>Errores I/O Escritura Totales: <strong style="color: ${writeTotal > 0 ? 'var(--accent-warning)' : 'var(--accent-success)'};">${writeTotal}</strong></div>
        <div>Errores No Corregidos (Lectura): <strong style="color: ${readUncorrected > 0 ? 'var(--accent-danger)' : 'var(--accent-success)'};">${readUncorrected}</strong></div>
        <div>Errores No Corregidos (Escritura): <strong style="color: ${writeUncorrected > 0 ? 'var(--accent-danger)' : 'var(--accent-success)'};">${writeUncorrected}</strong></div>
      </div>
      <div style="margin-top: 6px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Eventos de Bloques y Controladores de Almacenamiento (EventLog)</div>
        ${eventsListHtml}
      </div>
    `;
  }

  function closeAuditModal() {
    const modal = document.getElementById('dm-audit-modal');
    if (modal) modal.style.display = 'none';
  }

  // Sondeo periódico configurable
  function updateRefreshTimer() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (!autoRefreshEnabled || refreshIntervalSetting === 'manual') {
      return;
    }

    let ms = 30000;
    if (refreshIntervalSetting === '15s') ms = 15000;
    else if (refreshIntervalSetting === '30s') ms = 30000;
    else if (refreshIntervalSetting === '60s') ms = 60000;
    else if (refreshIntervalSetting === '300s') ms = 300000;
    else if (refreshIntervalSetting === 'custom') {
      ms = Math.max(5, Number(customIntervalSeconds) || 45) * 1000;
    }

    refreshTimer = setInterval(() => {
      const view = document.getElementById('view-module-disk-monitor');
      if (view && !view.classList.contains('hidden')) {
        const monitored = getMonitoredDriveIds();
        if (monitored && monitored.length > 0) {
          fetchRawTelemetry().then(() => renderMainArea());
        }
      }
    }, ms);
  }

  // Manejador de meta-opciones
  window.__SETTING_CHANGE_disk_monitor__ = function(optId, val) {
    if (optId === 'auto_refresh') {
      autoRefreshEnabled = Boolean(val);
      updateRefreshTimer();
    } else if (optId === 'refresh_interval') {
      refreshIntervalSetting = String(val);
      updateRefreshTimer();
    } else if (optId === 'custom_interval_seconds') {
      customIntervalSeconds = Math.max(5, Number(val) || 45);
      if (refreshIntervalSetting === 'custom') {
        updateRefreshTimer();
      }
    }
  };

  // API pública del módulo
  window.__DISK_MONITOR__ = {
    refreshWatchedDisks,
    openDiscoveryModal,
    closeDiscoveryModal,
    updateDiscoveryCount,
    addSelectedDisks,
    removeMonitoredDisk,
    setFilter,
    openRealAudit,
    closeAuditModal,
    getMonitoredDriveIds
  };

  // Registro de servicio compartido
  if (window.ServiceRegistry && typeof window.ServiceRegistry.register === 'function') {
    window.ServiceRegistry.register('storage.telemetry', {
      getDisksData: () => rawTelemetryData,
      getMonitoredDriveIds,
      refresh: refreshWatchedDisks
    });
  }

  // Render inicial
  renderMainArea();

  // Temporizador de refresco
  updateRefreshTimer();

  // Hook de limpieza canónico
  window[CLEANUP_KEY] = function(opts) {
    if (refreshTimer) clearInterval(refreshTimer);
    if (window.ServiceRegistry && typeof window.ServiceRegistry.unregister === 'function') {
      window.ServiceRegistry.unregister('storage.telemetry');
    }
    if (opts && (opts.purge || opts.uninstall)) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('pcm_monitored_drives');
        localStorage.removeItem(CACHE_KEY);
      } catch (e) {}
    }
    delete window.__DISK_MONITOR__;
    delete window.__SETTING_CHANGE_disk_monitor__;
    delete window.__PURGE_disk_monitor__;
    delete window[CLEANUP_KEY];
  };

  // Hook de purga de datos
  window.__PURGE_disk_monitor__ = function() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('pcm_monitored_drives');
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {}
  };

})();
