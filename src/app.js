/**
 * PC Manager - Controlador Principal de Aplicación
 * Version: 0.0.1-alpha
 */

import { core } from './core/index.js';
import { ICONS } from './ui/icons.js';
import { THEME_PRESETS, ACCENT_PALETTE } from './core/theme_engine.js';
import { telemetryModule } from './modules/system_telemetry/index.js';

class AppController {
  constructor() {
    this.core = core;
    this.activeSection = 'dashboard';
    this.notifications = [
      { id: 'n1', title: 'Sistema Inicializado', body: 'El núcleo de PC Manager (v0.0.1-alpha) está listo para operar.', time: 'Recién', read: false }
    ];
  }

  async init() {
    // 1. Inicializar el Core Microkernel
    await this.core.init();

    // 2. Registrar el módulo canónico de telemetría
    await this.core.moduleManager.registerModule(telemetryModule);

    // 3. Montar iconos y eventos de la UI
    this._injectIcons();
    this._setupNavigation();
    this._setupThemeControls();
    this._setupModuleManagerUI();
    this._setupDashboardDragAndDrop();
    this._setupNotificationsDrawer();
    this._setupWindowsLifecycleControls();

    // 4. Renderizar vista inicial
    this.renderSidebarModules();
    this.renderDashboard();
    this.updateNotificationBadge();

    // 5. Escuchar eventos del bus
    this.core.eventBus.subscribe('telemetry.hardware.updated', (event) => {
      this._updateTelemetryCard(event.data);
    });

    console.info('[AppController] Interfaz vinculada al Core Runtime.');
  }

  _injectIcons() {
    document.querySelectorAll('[data-icon]').forEach(el => {
      const iconKey = el.getAttribute('data-icon');
      if (ICONS[iconKey]) {
        el.innerHTML = ICONS[iconKey];
      }
    });
  }

  _setupNavigation() {
    // Colapso exclusivo pulsando el icono del logo (Regla 6)
    const brandBtn = document.getElementById('btn-brand-logo');
    const sidebar = document.getElementById('app-sidebar');
    if (brandBtn && sidebar) {
      brandBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
      });
    }

    // Navegación de secciones canónicas
    document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.getAttribute('data-section');
        this.switchSection(section);
      });
    });
  }

  switchSection(sectionId) {
    this.activeSection = sectionId;

    // Actualizar botones de navegación
    document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-section') === sectionId);
    });

    // Cambiar vistas visibles
    document.querySelectorAll('.view-container').forEach(view => {
      view.classList.toggle('active', view.id === `view-${sectionId}`);
    });

    // Actualizar títulos en top-bar unificada
    const titleEl = document.getElementById('top-bar-title');
    const subtitleEl = document.getElementById('top-bar-subtitle');

    const titles = {
      dashboard: { title: 'Dashboard', subtitle: 'Supervisión en tiempo real y widgets operativos' },
      modules: { title: 'Gestor de Módulos', subtitle: 'Administración de extensiones, dependencias y grupos' },
      settings: { title: 'Configuraciones', subtitle: 'Preferencias visuales, integración con el SO y servicios' }
    };

    if (titles[sectionId]) {
      if (titleEl) titleEl.textContent = titles[sectionId].title;
      if (subtitleEl) subtitleEl.textContent = titles[sectionId].subtitle;
    }

    if (sectionId === 'modules') {
      this.renderModuleManagerTable();
    }
  }

  _setupThemeControls() {
    const selectMode = document.getElementById('select-theme-mode');
    const selectStyle = document.getElementById('select-theme-style');
    const swatchesContainer = document.getElementById('accent-swatches-grid');

    const updateStyleOptions = (mode) => {
      if (!selectStyle) return;
      selectStyle.innerHTML = '';
      const styles = THEME_PRESETS[mode] || THEME_PRESETS.dark;
      Object.entries(styles).forEach(([key, val]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = val.name;
        selectStyle.appendChild(opt);
      });
      selectStyle.value = Object.keys(styles)[0];
    };

    if (selectMode && selectStyle) {
      updateStyleOptions(this.core.themeEngine.currentMode);

      selectMode.addEventListener('change', (e) => {
        const mode = e.target.value;
        updateStyleOptions(mode);
        this.core.themeEngine.setTheme(mode, selectStyle.value);
      });

      selectStyle.addEventListener('change', (e) => {
        this.core.themeEngine.setTheme(selectMode.value, e.target.value);
      });
    }

    // Paleta de acentos
    if (swatchesContainer) {
      swatchesContainer.innerHTML = '';
      ACCENT_PALETTE.forEach(color => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `color-swatch-btn ${color.id === this.core.themeEngine.currentAccent ? 'active' : ''}`;
        btn.style.backgroundColor = color.hex;
        btn.title = color.name;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.core.themeEngine.setAccent(color.id);
        });
        swatchesContainer.appendChild(btn);
      });
    }
  }

  renderSidebarModules() {
    const container = document.getElementById('sidebar-dynamic-groups');
    if (!container) return;

    container.innerHTML = '';
    const groupVisibility = this.core.moduleManager.getGroupVisibility();

    Object.values(groupVisibility).forEach(group => {
      // Ocultamiento automático si el grupo no tiene módulos activos
      if (!group.visible) return;

      const groupDiv = document.createElement('div');
      groupDiv.className = 'group-container';

      const header = document.createElement('div');
      header.className = 'group-header';
      header.innerHTML = `
        <span>${group.name}</span>
        <span class="group-chevron">${ICONS.chevronDown}</span>
      `;
      groupDiv.appendChild(header);

      const itemsList = document.createElement('div');
      itemsList.className = 'group-items';

      // Agregar módulos activos en este grupo
      this.core.moduleManager.listModules()
        .filter(m => m.group === group.name && m.enabled && m.status === 'ACTIVE')
        .forEach(m => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'nav-item';
          btn.innerHTML = `${ICONS.modules} <span class="nav-text">${m.name}</span>`;
          btn.addEventListener('click', () => this.switchSection('dashboard'));
          itemsList.appendChild(btn);
        });

      groupDiv.appendChild(itemsList);
      container.appendChild(groupDiv);
    });
  }

  renderDashboard() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const activeModules = this.core.moduleManager.listModules().filter(m => m.enabled && m.status === 'ACTIVE');

    activeModules.forEach(mod => {
      const def = this.core.moduleManager.modules.get(mod.id)?.definition;
      if (def && typeof def.getDashboardCards === 'function') {
        const cards = def.getDashboardCards();
        cards.forEach(c => {
          const cardEl = document.createElement('div');
          cardEl.className = 'dashboard-card';
          cardEl.draggable = true;
          cardEl.dataset.cardId = c.id;

          cardEl.innerHTML = `
            <div class="card-header">
              <span class="card-title">${c.title}</span>
              <span class="card-drag-handle">${ICONS.modules}</span>
            </div>
            <div class="card-body" id="body-${c.id}"></div>
          `;

          grid.appendChild(cardEl);
          const bodyContainer = cardEl.querySelector(`#body-${c.id}`);
          c.render(bodyContainer);
        });
      }
    });
  }

  _updateTelemetryCard(data) {
    const cpuVal = document.getElementById('val-cpu');
    const cpuBar = document.getElementById('bar-cpu');
    const ramVal = document.getElementById('val-ram');
    const ramBar = document.getElementById('bar-ram');

    if (cpuVal) cpuVal.textContent = `${data.cpuUsage}%`;
    if (cpuBar) cpuBar.style.width = `${data.cpuUsage}%`;
    if (ramVal) ramVal.textContent = `${data.ramUsage}%`;
    if (ramBar) ramBar.style.width = `${data.ramUsage}%`;
  }

  _setupDashboardDragAndDrop() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;

    let draggedItem = null;

    grid.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.dashboard-card');
      if (card) {
        draggedItem = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    grid.addEventListener('dragend', () => {
      if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
      }
    });

    grid.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(grid, e.clientY);
      if (draggedItem) {
        if (afterElement == null) {
          grid.appendChild(draggedItem);
        } else {
          grid.insertBefore(draggedItem, afterElement);
        }
      }
    });

    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.dashboard-card:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Botón canónico FAB de auto-organización (Regla 6)
    const fabBtn = document.getElementById('btn-auto-organize');
    if (fabBtn) {
      fabBtn.addEventListener('click', () => {
        this.renderDashboard();
        this.addNotification('Dashboard Auto-Organizado', 'Las tarjetas activas han sido reordenadas fluidamente.');
      });
    }
  }

  _setupNotificationsDrawer() {
    const bellBtn = document.getElementById('btn-notifications-toggle');
    const backdrop = document.getElementById('drawer-backdrop');
    const panel = document.getElementById('drawer-panel');
    const closeBtn = document.getElementById('btn-close-drawer');
    const readAllBtn = document.getElementById('btn-read-all-notifications');
    const clearAllBtn = document.getElementById('btn-clear-all-notifications');

    const toggleDrawer = (open) => {
      if (backdrop && panel) {
        backdrop.classList.toggle('open', open);
        panel.classList.toggle('open', open);
      }
    };

    if (bellBtn) bellBtn.addEventListener('click', () => toggleDrawer(true));
    if (backdrop) backdrop.addEventListener('click', () => toggleDrawer(false));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleDrawer(false));

    if (readAllBtn) {
      readAllBtn.addEventListener('click', () => {
        this.notifications.forEach(n => n.read = true);
        this.renderNotificationsList();
        this.updateNotificationBadge();
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.notifications = [];
        this.renderNotificationsList();
        this.updateNotificationBadge();
      });
    }

    this.renderNotificationsList();
  }

  addNotification(title, body) {
    this.notifications.unshift({
      id: 'n-' + Date.now(),
      title,
      body,
      time: 'Recién',
      read: false
    });
    this.renderNotificationsList();
    this.updateNotificationBadge();
  }

  renderNotificationsList() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No hay notificaciones activas.</div>`;
      return;
    }

    list.innerHTML = this.notifications.map(n => `
      <div class="notification-card" style="opacity: ${n.read ? '0.7' : '1'}">
        <span class="notification-title">${n.title}</span>
        <span class="notification-body">${n.body}</span>
        <span class="notification-time">${n.time}</span>
      </div>
    `).join('');
  }

  updateNotificationBadge() {
    const badge = document.getElementById('badge-notifications-count');
    const unreadCount = this.notifications.filter(n => !n.read).length;
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
  }

  _setupModuleManagerUI() {
    const formNewGroup = document.getElementById('form-create-group');
    if (formNewGroup) {
      formNewGroup.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('input-new-group-name');
        if (input && input.value.trim()) {
          this.core.moduleManager.createGroup(input.value.trim());
          input.value = '';
          this.renderModuleManagerTable();
          this.renderSidebarModules();
        }
      });
    }
  }

  renderModuleManagerTable() {
    const tbody = document.getElementById('modules-table-body');
    if (!tbody) return;

    const modules = this.core.moduleManager.listModules();
    tbody.innerHTML = modules.map(m => `
      <tr style="border-bottom: 1px solid var(--border-subtle)">
        <td style="padding: 12px 16px; font-weight: 600;">${m.name}</td>
        <td style="padding: 12px 16px; color: var(--text-muted);">${m.group}</td>
        <td style="padding: 12px 16px;">
          <span style="font-size: 11px; padding: 3px 8px; border-radius: var(--radius-pill); background: ${m.enabled ? 'var(--accent-glow)' : 'var(--bg-elevated)'}; color: ${m.enabled ? 'var(--accent-primary)' : 'var(--text-muted)'}; font-weight: 700;">
            ${m.status}
          </span>
        </td>
        <td style="padding: 12px 16px; text-align: right;">
          <label class="toggle-switch">
            <input type="checkbox" ${m.enabled ? 'checked' : ''} data-toggle-mod="${m.id}">
            <span class="toggle-slider"></span>
          </label>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('input[data-toggle-mod]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const modId = e.target.getAttribute('data-toggle-mod');
        await this.core.moduleManager.setModuleEnabled(modId, e.target.checked);
        this.renderSidebarModules();
        this.renderDashboard();
        this.renderModuleManagerTable();
        this.addNotification('Módulo Actualizado', `El módulo '${modId}' fue ${e.target.checked ? 'habilitado' : 'pausado'}.`);
      });
    });
  }

  _setupWindowsLifecycleControls() {
    const chkStart = document.getElementById('chk-start-windows');
    const chkTray = document.getElementById('chk-minimize-tray');
    const btnQuit = document.getElementById('btn-app-quit');

    if (chkStart) {
      chkStart.checked = this.core.lifecycle.windowsConfig.startWithWindows;
      chkStart.addEventListener('change', (e) => {
        this.core.lifecycle.updateWindowsConfig({ startWithWindows: e.target.checked });
      });
    }

    if (chkTray) {
      chkTray.checked = this.core.lifecycle.windowsConfig.minimizeToTray;
      chkTray.addEventListener('change', (e) => {
        this.core.lifecycle.updateWindowsConfig({ minimizeToTray: e.target.checked });
      });
    }

    if (btnQuit) {
      btnQuit.addEventListener('click', async () => {
        if (confirm('¿Desea cerrar la aplicación por completo y detener todos los servicios?')) {
          await this.core.lifecycle.quit('MANUAL_USER_QUIT');
          alert('Sistema detenido limpiamente. Cero procesos huérfanos.');
        }
      });
    }
  }
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
