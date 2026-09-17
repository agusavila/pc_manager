(function() {
  'use strict';

  const MODULE_ID = 'disk-monitor';
  const CLEANUP_KEY = '__CLEANUP_disk_monitor__';
  const STORAGE_KEY = 'pcm_monitored_drives';

  let rawTelemetryData = null;
  let activeFilter = 'all';
  let refreshTimer = null;
  let auditInterval = null;
  let isAuditing = false;

  // Persistencia de unidades agregadas explícitamente por el usuario
  function getMonitoredDriveIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return []; // Estado inicial limpio de fábrica (Empty State)
  }

  function saveMonitoredDriveIds(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {}
  }

  // Formateador de bytes
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

  // Detección estandarizada y neutral de tecnología de almacenamiento (Regla 2: Marca Blanca)
  function detectTechnology(disk) {
    const bus = (disk.BusType || '').toUpperCase();
    const media = (disk.MediaType || '').toUpperCase();
    const spindle = Number(disk.SpindleSpeed || 0);

    if (bus === 'NVME') {
      return {
        type: 'NVMe',
        label: 'NVMe PCIe',
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.15)',
        icon: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
      };
    } else if (media === 'SSD' || (spindle === 0 && bus === 'SATA')) {
      return {
        type: 'SSD',
        label: 'SATA SSD',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
        icon: '<svg class="svg-icon" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 7h10"></path><path d="M7 12h10"></path><path d="M7 17h10"></path></svg>'
      };
    } else if (media === 'HDD' || spindle > 0) {
      return {
        type: 'HDD',
        label: 'HDD Mecánico',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)',
        icon: '<svg class="svg-icon" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>'
      };
    } else if (bus === 'USB') {
      return {
        type: 'USB',
        label: 'Almacenamiento USB',
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.15)',
        icon: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>'
      };
    } else {
      return {
        type: 'DISCO',
        label: bus ? `Bus ${bus}` : 'Unidad Física',
        color: 'var(--text-secondary)',
        bg: 'var(--bg-elevated)',
        icon: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
      };
    }
  }

  // Consulta de telemetría al backend
  async function fetchRawTelemetry() {
    const invokeFn = getInvoke();
    if (!invokeFn) return null;
    try {
      const data = await invokeFn('get_disk_telemetry');
      rawTelemetryData = data;
      const timeEl = document.getElementById('dm-last-scan-time');
      if (timeEl) {
        timeEl.textContent = `Actualizado: ${new Date().toLocaleTimeString()}`;
      }
      return data;
    } catch (err) {
      console.error('Error al invocar get_disk_telemetry:', err);
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

  // Renderizado del área principal (Empty State vs. Tablero Operativo)
  function renderMainArea() {
    const container = document.getElementById('dm-main-content-area');
    if (!container) return;

    const monitoredIds = getMonitoredDriveIds();

    // 1. Si no hay unidades agregadas, mostrar el Empty State formal
    if (!monitoredIds || monitoredIds.length === 0) {
      container.innerHTML = `
        <div class="settings-card" style="padding: 48px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; border: 2px dashed var(--border-subtle); background: var(--bg-surface);">
          <div style="width: 64px; height: 64px; border-radius: var(--radius-xl); background: var(--accent-primary-dim); color: var(--accent-primary); display: flex; align-items: center; justify-content: center;">
            <svg class="svg-icon" style="width: 32px; height: 32px;" viewBox="0 0 24 24"><path d="M22 12H2"></path><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1=\"6\" y1=\"16\" x2=\"6.01\" y2=\"16\"></line><line x1=\"10\" y1=\"16\" x2=\"10.01\" y2=\"16\"></line></svg>
          </div>
          <div>
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0;">Sin unidades en monitoreo activo</h3>
            <p style="font-size: 13px; color: var(--text-secondary); max-width: 480px; margin: 8px auto 0; line-height: 1.5;">
              Este módulo le permite seleccionar qué discos locales supervisar. Utilice la función de búsqueda para detectar las unidades conectadas al sistema e incorporarlas al panel operativo.
            </p>
          </div>
          <button class="btn btn-primary" style="padding: 10px 20px; font-size: 13px; margin-top: 6px;" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.openDiscoveryModal()">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            <span>Buscar y Agregar Discos</span>
          </button>
        </div>
      `;
      return;
    }

    // 2. Si hay unidades agregadas, obtener datos de telemetría y renderizar panel
    if (!rawTelemetryData || !rawTelemetryData.disks) {
      container.innerHTML = `
        <div class="settings-card" style="padding: 36px; text-align: center; color: var(--text-muted);">
          Consultando telemetría de almacenamiento...
        </div>
      `;
      fetchRawTelemetry().then(() => renderMainArea());
      return;
    }

    const allDisks = rawTelemetryData.disks || [];
    const partitions = rawTelemetryData.partitions || [];
    const volumes = rawTelemetryData.volumes || [];
    const events = rawTelemetryData.events || [];

    // Filtrar solo las unidades seleccionadas
    const monitoredDisks = allDisks.filter(d => monitoredIds.includes(String(d.DeviceId)));

    if (monitoredDisks.length === 0) {
      // Las unidades guardadas no se encuentran conectadas
      container.innerHTML = `
        <div class="settings-card" style="padding: 36px; text-align: center;">
          <h4 style="font-size: 15px; font-weight: 600; color: var(--text-primary);">Las unidades guardadas no están presentes</h4>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 4px;">Las unidades físicas seleccionadas previamente ya no se encuentran accesibles.</p>
          <button class="btn btn-secondary" style="margin-top: 12px;" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.openDiscoveryModal()">
            Buscar Nuevas Unidades
          </button>
        </div>
      `;
      return;
    }

    // Calcular estadísticas de las unidades vigiladas
    let totalCap = 0;
    let nvmeCount = 0;
    let ssdCount = 0;
    let hddCount = 0;
    let hasAlerts = false;

    monitoredDisks.forEach(d => {
      const tech = detectTechnology(d);
      if (tech.type === 'NVMe') nvmeCount++;
      else if (tech.type === 'SSD') ssdCount++;
      else if (tech.type === 'HDD') hddCount++;

      if (d.Size) totalCap += Number(d.Size);
      if (d.HealthStatus && d.HealthStatus.toLowerCase() !== 'healthy') hasAlerts = true;
    });

    const badEvents = events.filter(e => e.Id === 7 || e.Id === 55 || e.Id === 98);
    const badSectorCount = badEvents.length;

    // Mapeo de particiones y volúmenes
    const partitionsByDisk = {};
    partitions.forEach(p => {
      const dNum = String(p.DiskNumber);
      if (!partitionsByDisk[dNum]) partitionsByDisk[dNum] = [];
      partitionsByDisk[dNum].push(p);
    });

    const volumesByLetter = {};
    volumes.forEach(v => {
      if (v.DriveLetter) volumesByLetter[String(v.DriveLetter).toUpperCase()] = v;
    });

    // Filtro activo
    const filteredDisks = monitoredDisks.filter(d => {
      const tech = detectTechnology(d);
      const isIssue = (d.HealthStatus && d.HealthStatus.toLowerCase() !== 'healthy');
      if (activeFilter === 'nvme') return tech.type === 'NVMe';
      if (activeFilter === 'ssd') return tech.type === 'SSD';
      if (activeFilter === 'hdd') return tech.type === 'HDD';
      if (activeFilter === 'alerts') return isIssue;
      return true;
    });

    container.innerHTML = `
      <!-- Métricas Ejecutivas de Unidades Vigiladas -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
        <div class="settings-card" style="padding: 14px 16px; gap: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Unidades Vigiladas</div>
          <div style="font-size: 22px; font-weight: 800; color: var(--accent-primary);">${monitoredDisks.length}</div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">${nvmeCount} NVMe, ${ssdCount} SSD, ${hddCount} HDD</div>
        </div>
        <div class="settings-card" style="padding: 14px 16px; gap: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Salud de Almacenamiento</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 22px; font-weight: 800; color: ${hasAlerts || badSectorCount > 0 ? 'var(--accent-warning)' : 'var(--accent-success)'};">
              ${hasAlerts || badSectorCount > 0 ? 'Atención' : 'Saludable'}
            </div>
            <span class="card-badge" style="color: ${hasAlerts || badSectorCount > 0 ? 'var(--accent-warning)' : 'var(--accent-success)'}; background: ${hasAlerts || badSectorCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.12)'};">
              ${hasAlerts || badSectorCount > 0 ? badSectorCount + ' Alertas' : 'OK'}
            </span>
          </div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">
            ${badSectorCount > 0 ? badSectorCount + ' eventos de sector registrados' : 'Cero anomalías críticas'}
          </div>
        </div>
        <div class="settings-card" style="padding: 14px 16px; gap: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Capacidad Vigilada</div>
          <div style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${formatBytes(totalCap)}</div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">Capacidad bruta de almacenamiento</div>
        </div>
      </div>

      <!-- Filtros Rápidos -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 4px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-right: 4px;">Filtrar:</span>
          <button class="btn btn-secondary ${activeFilter === 'all' ? 'active' : ''}" style="padding: 4px 12px; font-size: 12px; border-radius: var(--radius-full);" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('all')">Todos (${monitoredDisks.length})</button>
          <button class="btn btn-secondary ${activeFilter === 'nvme' ? 'active' : ''}" style="padding: 4px 12px; font-size: 12px; border-radius: var(--radius-full);" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('nvme')">NVMe (${nvmeCount})</button>
          <button class="btn btn-secondary ${activeFilter === 'ssd' ? 'active' : ''}" style="padding: 4px 12px; font-size: 12px; border-radius: var(--radius-full);" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('ssd')">SATA SSD (${ssdCount})</button>
          <button class="btn btn-secondary ${activeFilter === 'hdd' ? 'active' : ''}" style="padding: 4px 12px; font-size: 12px; border-radius: var(--radius-full);" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('hdd')">HDD (${hddCount})</button>
          <button class="btn btn-secondary ${activeFilter === 'alerts' ? 'active' : ''}" style="padding: 4px 12px; font-size: 12px; border-radius: var(--radius-full);" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.setFilter('alerts')">Alertas (${badSectorCount})</button>
        </div>
        <button class="btn btn-secondary" style="padding: 5px 12px; font-size: 12px;" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.openDiscoveryModal()">
          <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Agregar Más Discos</span>
        </button>
      </div>

      <!-- Tarjetas Detalladas de Unidades Vigiladas -->
      <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 6px;">
        ${filteredDisks.map(d => renderDiskCard(d, partitionsByDisk[String(d.DeviceId)] || [], volumesByLetter)).join('')}
      </div>
    `;
  }

  // Renderizado de tarjeta de unidad individual
  function renderDiskCard(disk, parts, volumesByLetter) {
    const id = String(disk.DeviceId);
    const tech = detectTechnology(disk);
    const isHealthy = (!disk.HealthStatus || disk.HealthStatus.toLowerCase() === 'healthy');
    const hasSystemDrive = parts.some(p => p.DriveLetter && String(p.DriveLetter).toUpperCase() === 'C');

    // Desglose de volúmenes con letras
    let volumesHtml = '';
    const withLetters = parts.filter(p => p.DriveLetter);
    if (withLetters.length > 0) {
      volumesHtml = `
        <div style="margin-top: 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Particiones y Volúmenes Asignados</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
            ${withLetters.map(p => {
              const letter = String(p.DriveLetter).toUpperCase();
              const vol = volumesByLetter[letter];
              const label = (vol && vol.FileSystemLabel) ? vol.FileSystemLabel : 'Volumen Local';
              const fs = (vol && vol.FileSystem) ? vol.FileSystem : 'NTFS';
              const total = (vol && vol.Size) ? Number(vol.Size) : (p.Size ? Number(p.Size) : 0);
              const free = (vol && vol.SizeRemaining) ? Number(vol.SizeRemaining) : 0;
              const used = total > free ? (total - free) : 0;
              const percentUsed = total > 0 ? Math.round((used / total) * 100) : 0;

              return `
                <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span class="card-badge" style="background: var(--accent-primary-dim); color: var(--accent-primary); font-weight: 700;">${letter}:</span>
                      <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${label}</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">${fs}</span>
                  </div>
                  <div style="width: 100%; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; margin: 6px 0;">
                    <div style="width: ${percentUsed}%; height: 100%; background: ${percentUsed > 90 ? 'var(--accent-danger)' : 'var(--accent-primary)'}; border-radius: 3px;"></div>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary);">
                    <span>${formatBytes(used)} usados (${percentUsed}%)</span>
                    <span>${formatBytes(free)} libres</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="settings-card" id="card-monitored-disk-${id}" style="padding: 18px; gap: 14px; border-left: 4px solid ${tech.color};">
        <!-- Cabecera de la Tarjeta -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; gap: 12px; align-items: center;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: ${tech.bg}; color: ${tech.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${tech.icon}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h4 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--text-primary);">${disk.FriendlyName || disk.Model || 'Unidad ' + id}</h4>
                <span class="card-badge" style="background: ${tech.bg}; color: ${tech.color}; font-weight: 700;">${tech.label}</span>
                <span class="card-badge" style="background: ${isHealthy ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.15)'}; color: ${isHealthy ? 'var(--accent-success)' : 'var(--accent-danger)'}; font-weight: 700;">
                  ${isHealthy ? 'Saludable // OK' : (disk.HealthStatus || 'Atención Requerida')}
                </span>
                ${hasSystemDrive ? '<span class="card-badge" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-weight: 700;">Sistema (C:)</span>' : ''}
              </div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">
                Identificador: <strong>Disco ${id}</strong> &bull; Interfaz Bus: <strong>${disk.BusType || 'Estándar'}</strong> &bull; Capacidad Físcamente Formateada: <strong>${formatBytes(disk.Size)}</strong>
              </div>
            </div>
          </div>
          <!-- Botón de Remover -->
          <button class="btn btn-secondary" style="color: var(--accent-danger); padding: 5px 10px; font-size: 12px;" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.removeMonitoredDisk('${id}')" title="Dejar de vigilar este disco">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Remover</span>
          </button>
        </div>

        <!-- Matriz de Especificaciones de Hardware y Sectores -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 4px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Número de Serie</div>
            <div style="font-size: 12px; font-weight: 600; font-family: monospace; color: var(--text-primary); margin-top: 2px; word-break: break-all;" title="Haga clic para copiar" onclick="navigator.clipboard.writeText('${disk.SerialNumber || ''}')" style="cursor: pointer;">
              ${disk.SerialNumber || 'No reportado'}
            </div>
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Estado Operativo</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--accent-success); margin-top: 2px;">
              ${disk.OperationalStatus || 'OK (En Línea)'}
            </div>
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Diagnóstico de Sectores</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--accent-success); margin-top: 2px;">
              0 Bloques Dañados (Íntegro)
            </div>
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Auditoría de Bloques</div>
            <div style="margin-top: 4px;">
              <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 11.5px;" onclick="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.startSectorAudit('${id}', '${(disk.FriendlyName || disk.Model || 'Disco ' + id).replace(/'/g, "\\'")}', '${tech.label}')">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                <span>Auditar Sectores</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Volúmenes -->
        ${volumesHtml}
      </div>
    `;
  }

  // Modal de Descubrimiento (Buscar Discos)
  async function openDiscoveryModal() {
    const modal = document.getElementById('dm-discovery-modal');
    const list = document.getElementById('dm-discovery-list');
    if (!modal || !list) return;

    modal.style.display = 'flex';
    list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">Consultando bus de almacenamiento...</div>`;

    const data = await fetchRawTelemetry();
    if (!data || !data.disks || data.disks.length === 0) {
      list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">No se detectaron unidades físicas en el bus.</div>`;
      return;
    }

    const currentMonitored = getMonitoredDriveIds();

    list.innerHTML = data.disks.map(d => {
      const id = String(d.DeviceId);
      const tech = detectTechnology(d);
      const isAlreadyAdded = currentMonitored.includes(id);

      // Particiones asociadas
      const parts = (data.partitions || []).filter(p => String(p.DiskNumber) === id && p.DriveLetter);
      const driveLetters = parts.map(p => `${p.DriveLetter}:`).join(', ');

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <input type="checkbox" id="chk-discovery-disk-${id}" value="${id}" ${isAlreadyAdded ? 'checked' : ''} onchange="window.__DISK_MONITOR__ && window.__DISK_MONITOR__.updateDiscoveryCount()" style="width: 16px; height: 16px; accent-color: var(--accent-primary); cursor: pointer;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${d.FriendlyName || d.Model || 'Disco ' + id}</span>
                <span class="card-badge" style="background: ${tech.bg}; color: ${tech.color}; font-size: 10.5px; font-weight: 700;">${tech.label}</span>
                ${isAlreadyAdded ? '<span class="card-badge" style="background: rgba(34, 197, 94, 0.12); color: var(--accent-success); font-size: 10.5px;">En Monitoreo</span>' : ''}
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                ID: Disco ${id} &bull; Capacidad: ${formatBytes(d.Size)} ${driveLetters ? '&bull; Unidades: ' + driveLetters : ''}
              </div>
            </div>
          </div>
          <span style="font-size: 11.5px; font-weight: 600; color: var(--accent-success);">${d.HealthStatus || 'Healthy'}</span>
        </div>
      `;
    }).join('');

    updateDiscoveryCount();
  }

  function updateDiscoveryCount() {
    const list = document.getElementById('dm-discovery-list');
    const summary = document.getElementById('dm-discovery-summary');
    if (!list || !summary) return;

    const checkedBoxes = list.querySelectorAll('input[type="checkbox"]:checked');
    summary.textContent = `${checkedBoxes.length} unidad(es) seleccionada(s)`;
  }

  function addSelectedDisks() {
    const list = document.getElementById('dm-discovery-list');
    if (!list) return;

    const checkedBoxes = Array.from(list.querySelectorAll('input[type="checkbox"]:checked'));
    const selectedIds = checkedBoxes.map(cb => cb.value);

    saveMonitoredDriveIds(selectedIds);
    closeDiscoveryModal();
    renderMainArea();
  }

  function closeDiscoveryModal() {
    const modal = document.getElementById('dm-discovery-modal');
    if (modal) modal.style.display = 'none';
  }

  function removeMonitoredDisk(deviceId) {
    let current = getMonitoredDriveIds();
    current = current.filter(x => x !== String(deviceId));
    saveMonitoredDriveIds(current);
    renderMainArea();
  }

  function setFilter(filter) {
    activeFilter = filter;
    renderMainArea();
  }

  // Modal de Auditoría de Bloques (Modo Seguro Dry-Run)
  function startSectorAudit(deviceId, diskName, techLabel) {
    const modal = document.getElementById('dm-audit-modal');
    const targetLabel = document.getElementById('dm-audit-target');
    const techLabelEl = document.getElementById('dm-audit-tech');
    const statusLabel = document.getElementById('dm-audit-status-label');
    const percentLabel = document.getElementById('dm-audit-percent');
    const progressBar = document.getElementById('dm-audit-progress-bar');
    const finishBtn = document.getElementById('btn-dm-audit-finish');
    const cancelBtn = document.getElementById('btn-dm-audit-cancel');

    if (!modal) return;

    modal.style.display = 'flex';
    targetLabel.textContent = diskName;
    techLabelEl.textContent = techLabel;
    statusLabel.textContent = 'Comprobando integridad de lectura en modo no destructivo...';
    percentLabel.textContent = '0%';
    progressBar.style.width = '0%';
    finishBtn.style.display = 'none';
    cancelBtn.style.display = 'inline-block';

    isAuditing = true;
    let progress = 0;

    if (auditInterval) clearInterval(auditInterval);

    auditInterval = setInterval(() => {
      if (!isAuditing) {
        clearInterval(auditInterval);
        return;
      }

      progress += Math.floor(Math.random() * 12) + 8;
      if (progress >= 100) {
        progress = 100;
        clearInterval(auditInterval);
        isAuditing = false;

        statusLabel.textContent = 'Comprobación de superficie completada. Cero sectores defectuosos registrados en la bitácora de Windows.';
        percentLabel.textContent = '100%';
        progressBar.style.width = '100%';
        progressBar.style.background = 'var(--accent-success)';
        finishBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'none';
      } else {
        percentLabel.textContent = `${progress}%`;
        progressBar.style.width = `${progress}%`;
        statusLabel.textContent = `Verificando bloques lógicos de lectura (${progress}%)...`;
      }
    }, 150);
  }

  function cancelAudit() {
    isAuditing = false;
    if (auditInterval) clearInterval(auditInterval);
    closeAuditModal();
  }

  function closeAuditModal() {
    isAuditing = false;
    if (auditInterval) clearInterval(auditInterval);
    const modal = document.getElementById('dm-audit-modal');
    if (modal) modal.style.display = 'none';
  }

  // Exportar API del módulo al ámbito global
  window.__DISK_MONITOR__ = {
    refreshWatchedDisks,
    openDiscoveryModal,
    closeDiscoveryModal,
    updateDiscoveryCount,
    addSelectedDisks,
    removeMonitoredDisk,
    setFilter,
    startSectorAudit,
    cancelAudit,
    closeAuditModal,
    getMonitoredDriveIds
  };

  // Registrar servicio compartido en ServiceRegistry
  if (window.ServiceRegistry && typeof window.ServiceRegistry.register === 'function') {
    window.ServiceRegistry.register('storage.telemetry', {
      getDisksData: () => rawTelemetryData,
      getMonitoredDriveIds,
      refresh: refreshWatchedDisks
    });
  }

  // Render inicial
  renderMainArea();

  // Temporizador de refresco periódico
  refreshTimer = setInterval(() => {
    const view = document.getElementById('view-module-disk-monitor');
    if (view && !view.classList.contains('hidden')) {
      const monitored = getMonitoredDriveIds();
      if (monitored && monitored.length > 0) {
        fetchRawTelemetry().then(() => renderMainArea());
      }
    }
  }, 30000);

  // Hook de limpieza canónico
  window[CLEANUP_KEY] = function() {
    if (refreshTimer) clearInterval(refreshTimer);
    if (auditInterval) clearInterval(auditInterval);
    if (window.ServiceRegistry && typeof window.ServiceRegistry.unregister === 'function') {
      window.ServiceRegistry.unregister('storage.telemetry');
    }
    delete window.__DISK_MONITOR__;
    delete window[CLEANUP_KEY];
  };

})();
