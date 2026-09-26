(function() {
  'use strict';

  const MODULE_ID = 'disk-monitor';
  const CLEANUP_KEY = '__CLEANUP_disk_monitor__';

  // Configuración local del módulo
  let currentFilter = 'all';
  let cachedTelemetry = null;
  let refreshTimer = null;
  let isScanning = false;

  // Opciones de configuración
  let moduleSettings = {
    auto_refresh: true,
    refresh_interval: '30s',
    include_usb: true,
    notify_health_change: true
  };

  // Helper para invocar Tauri IPC
  function getInvoke() {
    if (typeof getTauriInvoke === 'function') {
      const fn = getTauriInvoke();
      if (fn) return fn;
    }
    return window.__TAURI__?.core?.invoke || window.__TAURI__?.tauri?.invoke || window.__TAURI_INVOKE__;
  }

  // Formateador estándar de bytes a unidades legibles
  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
  }

  // Detección y clasificación visual de tecnología de almacenamiento
  function detectTechnology(disk) {
    const driveType = (disk.DriveType || '').toUpperCase();
    const bus = (disk.BusType || '').toUpperCase();
    const media = (disk.MediaType || '').toUpperCase();
    const friendly = (disk.FriendlyName || disk.Model || '').toUpperCase();
    const isRemovable = Boolean(disk.IsRemovable);
    const isHdd = Boolean(disk.IsHdd) || driveType === 'HDD' || media === 'HDD' || friendly.includes('HARDDRIVE') || (friendly.includes('ST1000') || friendly.includes('ST2000') || (friendly.includes('WD') && !friendly.includes('SSD')));

    if (driveType === 'USB' || bus === 'USB' || isRemovable) {
      return {
        type: 'USB',
        label: 'USB Extraíble',
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

  // Recolección nativa de telemetría de almacenamiento
  async function fetchTelemetry() {
    const invokeFn = getInvoke();
    if (!invokeFn) return null;

    try {
      // 1. Intentar primero con el comando de telemetría precompilada del servicio de Windows
      try {
        const serviceTelemetry = await invokeFn('get_storage_telemetry');
        if (serviceTelemetry) {
          const parsed = JSON.parse(serviceTelemetry);
          if (parsed && Array.isArray(parsed.disks) && parsed.disks.length > 0) {
            return parsed;
          }
        }
      } catch (e) {}

      // 2. Si el servicio de Windows no tiene caché reciente, ejecutar colector nativo PowerShell
      const collectorScript = `
$ErrorActionPreference = 'SilentlyContinue'
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
    if ($isUsb) { $driveType = 'USB' }
    elseif ($p -and $p.BusType -eq 'NVMe') { $driveType = 'NVMe' }
    elseif ($p -and $p.MediaType -eq 'SSD') { $driveType = 'SSD' }
    elseif ($p -and $p.MediaType -eq 'HDD') { $driveType = 'HDD' }
    elseif ($d.BusType) { $driveType = [string]$d.BusType }

    $isHdd = ($driveType -eq 'HDD' -or ($p -and $p.MediaType -eq 'HDD'))
    $healthPercent = $null
    if (-not $isHdd -and $c -and $c.Wear -ne $null) {
        $healthPercent = [Math]::Max(0, 100 - [int]$c.Wear)
    }

    $targetPartitions = @($parts | Where-Object { [string]$_.DiskNumber -eq [string]$d.Number })
    $diskVols = @($targetPartitions | ForEach-Object {
        $ltr = $_.DriveLetter
        if ($ltr) { $vols | Where-Object { [string]$_.DriveLetter -eq [string]$ltr } }
    })
    $fileSystems = @($diskVols | Where-Object { $_.FileSystem } | ForEach-Object { [string]$_.FileSystem } | Select-Object -Unique)

    $serial = if ($p -and $p.SerialNumber) { [string]$p.SerialNumber.Trim() } else { [string]$d.SerialNumber }
    if (-not $serial) { $serial = 'N/D' }
    $model = if ($p -and $p.Model) { [string]$p.Model.Trim() } else { [string]$d.Model }
    if (-not $model) { $model = $d.FriendlyName }

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
        Partitions = $targetPartitions
        Volumes = $diskVols
    }
})

$events = @(Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName=@('disk','Ntfs','stornvme','partmgr'); Id=7,55,98,153} -MaxEvents 10 -ErrorAction SilentlyContinue | ForEach-Object {
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')
        Id = $_.Id
        ProviderName = $_.ProviderName
        Message = $_.Message
    }
})

[PSCustomObject]@{
    service_active = $false
    disks = $disks
    events = $events
    timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
} | ConvertTo-Json -Depth 6
`;

      const stdout = await invokeFn('execute_module_script', {
        moduleId: MODULE_ID,
        script: collectorScript,
        interpreter: 'powershell'
      });

      if (!stdout) return null;
      return JSON.parse(stdout);
    } catch (err) {
      console.warn('[DiskMonitor] Error consultando telemetría de almacenamiento:', err);
      return null;
    }
  }

  // Renderizar la vista principal del módulo
  function renderView(telemetry) {
    const container = document.getElementById('dm-main-content-area');
    if (!container) return;

    if (!telemetry || !Array.isArray(telemetry.disks) || telemetry.disks.length === 0) {
      container.innerHTML = `
        <div class="settings-card" style="padding: 40px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; border: 2px dashed var(--border-subtle); background: var(--bg-surface);">
          <div style="width: 56px; height: 56px; border-radius: var(--radius-xl); background: var(--accent-primary-dim); color: var(--accent-primary); display: flex; align-items: center; justify-content: center;">
            <svg class="svg-icon" style="width: 28px; height: 28px;" viewBox="0 0 24 24"><path d="M22 12H2"></path><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1=\"6\" y1=\"16\" x2=\"6.01\" y2=\"16\"></line><line x1=\"10\" y1=\"16\" x2=\"10.01\" y2=\"16\"></line></svg>
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">Sin unidades de almacenamiento detectadas</h3>
            <p style="font-size: 13px; color: var(--text-secondary); max-width: 480px; margin: 8px auto 0; line-height: 1.5;">
              No se detectaron discos locales disponibles o el subsistema de telemetría se encuentra inicializando. Pulsa en "Actualizar" para forzar un nuevo escaneo del bus.
            </p>
          </div>
          <button class="btn btn-primary" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.refreshDisks()">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span>Escanear Bus de Discos</span>
          </button>
        </div>
      `;
      return;
    }

    let allDisks = telemetry.disks;
    if (!moduleSettings.include_usb) {
      allDisks = allDisks.filter(d => !d.IsRemovable && d.DriveType !== 'USB' && d.BusType !== 'USB');
    }

    // Filtrar por categoría activa
    const filteredDisks = allDisks.filter(d => {
      const tech = detectTechnology(d);
      if (currentFilter === 'nvme') return tech.type === 'NVMe';
      if (currentFilter === 'ssd') return tech.type === 'SSD';
      if (currentFilter === 'hdd') return tech.type === 'HDD';
      if (currentFilter === 'usb') return tech.type === 'USB';
      return true;
    });

    // Cálculos de métricas globales del sistema
    let totalCapacity = 0;
    let totalUsed = 0;
    let totalFree = 0;
    let healthyCount = 0;
    let warningCount = 0;
    let partitionsCount = 0;

    allDisks.forEach(d => {
      const size = Number(d.Size) || 0;
      totalCapacity += size;
      const isHealthy = (!d.HealthStatus || d.HealthStatus.toLowerCase() === 'healthy') &&
                        (!d.ReadErrorsUncorrected || Number(d.ReadErrorsUncorrected) === 0);
      if (isHealthy) healthyCount++;
      else warningCount++;

      if (Array.isArray(d.Volumes)) {
        d.Volumes.forEach(v => {
          if (v && v.Size) {
            partitionsCount++;
            const vSize = Number(v.Size) || 0;
            const vFree = Number(v.SizeRemaining) || 0;
            totalUsed += Math.max(0, vSize - vFree);
            totalFree += vFree;
          }
        });
      }
    });

    if (totalUsed === 0 && totalCapacity > 0) {
      totalFree = totalCapacity;
    }

    const overallUsedPct = totalCapacity > 0 ? Math.min(100, Math.round((totalUsed / totalCapacity) * 100)) : 0;

    // Resumen métrico superior
    const bannerHtml = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        <div class="settings-card" style="padding: 14px 18px; gap: 4px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-subtle);">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Capacidad Total</div>
          <div style="font-size: 20px; font-weight: 800; color: var(--accent-primary);">${formatBytes(totalCapacity)}</div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">${formatBytes(totalUsed)} usados (${overallUsedPct}%)</div>
        </div>
        <div class="settings-card" style="padding: 14px 18px; gap: 4px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-subtle);">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Unidades Físicas</div>
          <div style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${allDisks.length} <span style="font-size: 13px; font-weight: 500; color: var(--text-muted);">unidades</span></div>
          <div style="font-size: 11.5px; color: #10b981;">${healthyCount} saludables ${warningCount > 0 ? `<span style="color: #ef4444;">(${warningCount} atención)</span>` : ''}</div>
        </div>
        <div class="settings-card" style="padding: 14px 18px; gap: 4px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-subtle);">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Volúmenes Montados</div>
          <div style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${partitionsCount} <span style="font-size: 13px; font-weight: 500; color: var(--text-muted);">particiones</span></div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">${formatBytes(totalFree)} libres en volúmenes</div>
        </div>
      </div>
    `;

    // Renderizado de tarjetas de discos físicos
    const cardsHtml = filteredDisks.map(d => {
      const tech = detectTechnology(d);
      const isHealthy = (!d.HealthStatus || d.HealthStatus.toLowerCase() === 'healthy') &&
                        (!d.ReadErrorsUncorrected || Number(d.ReadErrorsUncorrected) === 0);

      // Particiones / Volúmenes
      let volumesHtml = '';
      if (Array.isArray(d.Volumes) && d.Volumes.length > 0) {
        volumesHtml = d.Volumes.map(v => {
          const ltr = v.DriveLetter ? `${v.DriveLetter}:` : 'Sin letra';
          const label = v.FileSystemLabel ? `"${v.FileSystemLabel}"` : '';
          const fs = v.FileSystem || 'NTFS';
          const vSize = Number(v.Size) || 0;
          const vFree = Number(v.SizeRemaining) || 0;
          const vUsed = Math.max(0, vSize - vFree);
          const vPct = vSize > 0 ? Math.min(100, Math.round((vUsed / vSize) * 100)) : 0;
          const barColor = vPct > 90 ? '#ef4444' : (vPct > 75 ? '#f59e0b' : 'var(--accent-primary)');

          return `
            <div style="display: flex; flex-direction: column; gap: 5px; background: var(--bg-surface); padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 12px;">
                <span style="font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                  <span style="padding: 2px 6px; border-radius: 4px; background: var(--accent-primary-dim); color: var(--accent-primary); font-size: 11px;">${ltr}</span>
                  <span>${label}</span>
                  <span style="font-size: 10.5px; color: var(--text-muted); font-weight: normal;">(${fs})</span>
                </span>
                <span style="font-size: 11.5px; font-weight: 600; color: var(--text-secondary);">${formatBytes(vFree)} libres de ${formatBytes(vSize)}</span>
              </div>
              <div style="width: 100%; height: 6px; border-radius: 3px; background: var(--bg-elevated); overflow: hidden;">
                <div style="height: 100%; width: ${vPct}%; border-radius: 3px; background: ${barColor}; transition: width 0.3s ease;"></div>
              </div>
            </div>
          `;
        }).join('');
      } else {
        volumesHtml = `
          <div style="padding: 10px; font-size: 12px; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); text-align: center;">
            Sin volúmenes asignados o partición no formateada
          </div>
        `;
      }

      // Atributos SMART y físicos
      const tempBadge = d.Temperature ? `<span style="padding: 3px 8px; border-radius: 6px; background: rgba(6, 182, 212, 0.15); color: #06b6d4; font-size: 11px; font-weight: 700;">${d.Temperature} °C</span>` : '';
      const healthBadge = d.HealthPercent !== null
        ? `<span style="padding: 3px 8px; border-radius: 6px; background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 11px; font-weight: 700;">${d.HealthPercent}% Vida Útil</span>`
        : `<span style="padding: 3px 8px; border-radius: 6px; background: ${isHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${isHealthy ? '#10b981' : '#ef4444'}; font-size: 11px; font-weight: 700;">${isHealthy ? 'Saludable' : 'Alerta'}</span>`;

      const powerHours = d.PowerOnHours ? `${Math.floor(d.PowerOnHours / 24)}d (${Number(d.PowerOnHours).toLocaleString()}h)` : 'N/D';

      return `
        <div class="settings-card" style="padding: 18px; gap: 14px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-subtle); display: flex; flex-direction: column;">
          <!-- Cabecera de Tarjeta -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: ${tech.bg}; color: ${tech.color}; display: flex; align-items: center; justify-content: center;">
                ${tech.icon}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-size: 14.5px; font-weight: 700; color: var(--text-primary);">${d.Model || d.FriendlyName}</span>
                  <span style="padding: 2px 7px; border-radius: 4px; background: ${tech.bg}; color: ${tech.color}; font-size: 11px; font-weight: 700;">${tech.label}</span>
                  ${d.IsBoot ? '<span style="padding: 2px 6px; border-radius: 4px; background: var(--accent-primary-dim); color: var(--accent-primary); font-size: 10px; font-weight: 700;">Arranque</span>' : ''}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                  Capacidad Física: <strong>${formatBytes(d.Size)}</strong> &bull; Disco #${d.DeviceId} &bull; S/N: <span style="font-family: monospace; color: var(--text-muted); cursor: pointer;" onclick="navigator.clipboard.writeText('${d.SerialNumber}')" title="Copiar">${d.SerialNumber}</span>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${tempBadge}
              ${healthBadge}
            </div>
          </div>

          <!-- Métricas Físicas SMART -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; background: var(--bg-elevated); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); font-size: 11.5px;">
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 10.5px;">Horas Encendido</span>
              <strong style="color: var(--text-primary);">${powerHours}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 10.5px;">Bus / Enlace</span>
              <strong style="color: var(--text-primary);">${d.BusType || 'SATA'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 10.5px;">Errores de Lectura</span>
              <strong style="color: ${Number(d.ReadErrorsUncorrected) > 0 ? '#ef4444' : 'var(--text-primary)'};">${d.ReadErrorsTotal || 0} (${d.ReadErrorsUncorrected || 0} uncorr)</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 10.5px;">Errores de Escritura</span>
              <strong style="color: ${Number(d.WriteErrorsUncorrected) > 0 ? '#ef4444' : 'var(--text-primary)'};">${d.WriteErrorsTotal || 0} (${d.WriteErrorsUncorrected || 0} uncorr)</strong>
            </div>
          </div>

          <!-- Lista de Volúmenes y Particiones -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Particiones y Espacio en Disco</div>
            ${volumesHtml}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${bannerHtml}
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${cardsHtml}
        </div>
      </div>
    `;

    // Actualizar indicador de escaneo
    const timeEl = document.getElementById('dm-last-scan-time');
    if (timeEl) {
      timeEl.textContent = `Actualizado: ${new Date().toLocaleTimeString()} (${allDisks.length} unidades)`;
    }
  }

  // Actualizar los widgets activos en el Dashboard
  function updateDashboardWidgets(telemetry) {
    if (!telemetry || !Array.isArray(telemetry.disks)) return;

    let allDisks = telemetry.disks;
    if (!moduleSettings.include_usb) {
      allDisks = allDisks.filter(d => !d.IsRemovable && d.DriveType !== 'USB' && d.BusType !== 'USB');
    }

    let totalCap = 0;
    let totalUsed = 0;
    let totalFree = 0;
    let allHealthy = true;

    // Buscar disco C:
    let diskC = null;
    let volC = null;

    allDisks.forEach(d => {
      totalCap += Number(d.Size) || 0;
      if (d.HealthStatus && d.HealthStatus.toLowerCase() !== 'healthy') allHealthy = false;
      if (d.Volumes && Array.isArray(d.Volumes)) {
        d.Volumes.forEach(v => {
          if (v && v.Size) {
            const vSize = Number(v.Size) || 0;
            const vFree = Number(v.SizeRemaining) || 0;
            totalUsed += Math.max(0, vSize - vFree);
            totalFree += vFree;
            if (v.DriveLetter && v.DriveLetter.toUpperCase() === 'C') {
              diskC = d;
              volC = v;
            }
          }
        });
      }
    });

    if (totalUsed === 0 && totalCap > 0) {
      totalFree = totalCap;
    }

    const usedPct = totalCap > 0 ? Math.min(100, Math.round((totalUsed / totalCap) * 100)) : 0;

    // 1. Actualizar Widget Overview (card-disk-overview)
    const wCount = document.getElementById('dm-w-disks-count');
    if (wCount) wCount.textContent = `${allDisks.length} Discos`;

    const wUsedText = document.getElementById('dm-w-used-text');
    if (wUsedText) wUsedText.textContent = `${formatBytes(totalUsed)} / ${formatBytes(totalCap)} (${usedPct}%)`;

    const wUsedBar = document.getElementById('dm-w-used-bar');
    if (wUsedBar) {
      wUsedBar.style.width = `${usedPct}%`;
      wUsedBar.style.background = usedPct > 90 ? '#ef4444' : (usedPct > 75 ? '#f59e0b' : 'var(--accent-primary)');
    }

    const wFreeText = document.getElementById('dm-w-free-text');
    if (wFreeText) wFreeText.textContent = `Disponible: ${formatBytes(totalFree)}`;

    const wHealth = document.getElementById('dm-w-health-badge');
    if (wHealth) {
      wHealth.textContent = allHealthy ? 'Salud: Óptima' : 'Salud: Atención';
      wHealth.style.color = allHealthy ? '#10b981' : '#ef4444';
    }

    // 2. Actualizar Widget Disco C (card-disk-drive-c)
    if (volC) {
      const cSize = Number(volC.Size) || 0;
      const cFree = Number(volC.SizeRemaining) || 0;
      const cUsed = Math.max(0, cSize - cFree);
      const cPct = cSize > 0 ? Math.min(100, Math.round((cUsed / cSize) * 100)) : 0;

      const wCLabel = document.getElementById('dm-w-c-label');
      if (wCLabel) wCLabel.textContent = `C: (${volC.FileSystem || 'NTFS'})`;

      const wCPct = document.getElementById('dm-w-c-pct');
      if (wCPct) wCPct.textContent = `${cPct}%`;

      const wCBar = document.getElementById('dm-w-c-bar');
      if (wCBar) {
        wCBar.style.width = `${cPct}%`;
        wCBar.style.background = cPct > 90 ? '#ef4444' : (cPct > 75 ? '#f59e0b' : 'var(--accent-primary)');
      }

      const wCSpace = document.getElementById('dm-w-c-space');
      if (wCSpace) wCSpace.textContent = `${formatBytes(cFree)} libre de ${formatBytes(cSize)}`;

      const wCTemp = document.getElementById('dm-w-c-temp');
      if (wCTemp) {
        if (diskC && diskC.Temperature) {
          wCTemp.textContent = `${diskC.Temperature} °C`;
          wCTemp.style.color = diskC.Temperature > 60 ? '#ef4444' : '#06b6d4';
        } else if (diskC && diskC.HealthPercent !== null) {
          wCTemp.textContent = `${diskC.HealthPercent}% Vida`;
          wCTemp.style.color = '#10b981';
        } else {
          wCTemp.textContent = 'Saludable';
          wCTemp.style.color = '#10b981';
        }
      }
    }
  }

  // Ejecución del sondeo y renderizado completo
  async function performScan(forceSpin = false) {
    if (isScanning) return;
    isScanning = true;

    const spinIcon = document.getElementById('icon-dm-spin');
    if (spinIcon) spinIcon.classList.add('rotating');

    try {
      const telemetry = await fetchTelemetry();
      if (telemetry) {
        cachedTelemetry = telemetry;
        renderView(telemetry);
        updateDashboardWidgets(telemetry);

        // Compartir en ServiceRegistry para otros módulos
        if (window.ServiceRegistry) {
          window.ServiceRegistry.register('storage.telemetry', {
            getDisks: () => cachedTelemetry?.disks || [],
            getRawTelemetry: () => cachedTelemetry,
            getLastUpdated: () => new Date().toISOString()
          });
        }
      }
    } finally {
      isScanning = false;
      if (spinIcon) spinIcon.classList.remove('rotating');
    }
  }

  // Gestión de filtros de visualización
  function setFilter(filter) {
    currentFilter = filter;
    const chipsContainer = document.getElementById('dm-filter-chips');
    if (chipsContainer) {
      chipsContainer.querySelectorAll('button').forEach(btn => {
        if (btn.dataset.filter === filter) {
          btn.className = 'btn btn-sm btn-primary';
        } else {
          btn.className = 'btn btn-sm btn-secondary';
        }
      });
    }
    if (cachedTelemetry) {
      renderView(cachedTelemetry);
    }
  }

  // Programar temporizador de muestreo en segundo plano
  function scheduleAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }

    if (!moduleSettings.auto_refresh || moduleSettings.refresh_interval === 'manual') {
      return;
    }

    let intervalMs = 30000;
    if (moduleSettings.refresh_interval === '15s') intervalMs = 15000;
    else if (moduleSettings.refresh_interval === '30s') intervalMs = 30000;
    else if (moduleSettings.refresh_interval === '60s') intervalMs = 60000;
    else if (moduleSettings.refresh_interval === '300s') intervalMs = 300000;

    refreshTimer = setInterval(() => {
      performScan(false);
    }, intervalMs);
  }

  // Ventana modal de auditoría de eventos de almacenamiento
  function openAuditModal() {
    const modal = document.getElementById('dm-audit-modal');
    const content = document.getElementById('dm-audit-content-area');
    if (!modal || !content) return;

    const events = cachedTelemetry?.events || [];
    if (events.length === 0) {
      content.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #10b981; font-size: 13px;">
          ✓ No se registran errores recientes de hardware, NTFS ni sectores defectuosos en el visor del sistema.
        </div>
      `;
    } else {
      content.innerHTML = events.map(e => `
        <div style="padding: 8px 10px; border-radius: 6px; background: var(--bg-surface); border: 1px solid var(--border-subtle); font-size: 12px;">
          <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 11px;">
            <span>${e.ProviderName} (ID: ${e.Id})</span>
            <span>${e.TimeCreated}</span>
          </div>
          <div style="margin-top: 4px; color: var(--text-primary);">${e.Message || 'Evento registrado'}</div>
        </div>
      `).join('');
    }

    modal.style.display = 'flex';
  }

  function closeAuditModal() {
    const modal = document.getElementById('dm-audit-modal');
    if (modal) modal.style.display = 'none';
  }

  // Interfaz pública para controladores de la vista
  window.__DISK_MONITOR__ = {
    refreshDisks: () => performScan(true),
    setFilter: (f) => setFilter(f),
    openAuditModal: () => openAuditModal(),
    closeAuditModal: () => closeAuditModal()
  };

  // Escuchar cambios de configuración desde el panel central
  window.__SETTING_CHANGE_disk_monitor__ = function(optionId, value) {
    if (optionId in moduleSettings) {
      moduleSettings[optionId] = value;
      scheduleAutoRefresh();
      if (cachedTelemetry) {
        renderView(cachedTelemetry);
        updateDashboardWidgets(cachedTelemetry);
      }
    }
  };

  // Cargar configuraciones guardadas
  const invokeFn = getInvoke();
  if (invokeFn) {
    invokeFn('get_saved_settings', { moduleId: MODULE_ID })
      .then(saved => {
        if (saved && typeof saved === 'object') {
          Object.assign(moduleSettings, saved);
        }
        scheduleAutoRefresh();
      })
      .catch(() => scheduleAutoRefresh());
  } else {
    scheduleAutoRefresh();
  }

  // Descubrimiento inmediato al cargar
  performScan(false);

  // Escuchar si el usuario cambia a la vista de este módulo para actualizar vista si los widgets cargaron antes
  document.addEventListener('view:changed', (e) => {
    if (e.detail?.viewId === 'view-module-disk-monitor' && cachedTelemetry) {
      renderView(cachedTelemetry);
    }
  });

  // Limpieza al desmontar el módulo
  window[CLEANUP_KEY] = function() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    delete window.__DISK_MONITOR__;
    delete window.__SETTING_CHANGE_disk_monitor__;
  };

})();
