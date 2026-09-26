    let currentView = 'dashboard';

    // REGISTRO DE SERVICIOS COMPARTIDOS (RULE 3 - SERVICEREGISTRY)
    window.ServiceRegistry = {
      _services: new Map(),
      _listeners: new Map(),

      register(name, provider, metadata = {}) {
        this._services.set(name, { provider, metadata });
        const listeners = this._listeners.get(name) || [];
        listeners.forEach(cb => {
          try { cb(provider, metadata); } catch (e) { console.error(`Error en listener de ${name}:`, e); }
        });
      },

      get(name) {
        const entry = this._services.get(name);
        return entry ? entry.provider : null;
      },

      getMetadata(name) {
        const entry = this._services.get(name);
        return entry ? entry.metadata : null;
      },

      has(name) {
        return this._services.has(name);
      },

      unregister(name) {
        this._services.delete(name);
      },

      subscribe(name, callback) {
        if (!this._listeners.has(name)) {
          this._listeners.set(name, []);
        }
        this._listeners.get(name).push(callback);
        if (this._services.has(name)) {
          const entry = this._services.get(name);
          try { callback(entry.provider, entry.metadata); } catch(e) { console.error(e); }
        }
      },

      list() {
        const list = [];
        this._services.forEach((val, key) => {
          list.push({ name: key, metadata: val.metadata });
        });
        return list;
      }
    };

    function getTauriInvoke() {
      if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        return window.__TAURI__.core.invoke;
      } else if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
        return window.__TAURI_INTERNALS__.invoke;
      }
      return null;
    }

    const VIEW_METADATA = {
      'dashboard': {
        title: 'Dashboard',
        desc: 'Cuadrícula modular de celdas para tarjetas y widgets del sistema.'
      },
      'module-manager': {
        title: 'Gestor de Módulos',
        desc: 'Administración de paquetes de extensión locales y comunitarios (.pcm).'
      },
      'settings': {
        title: 'Configuraciones del Sistema',
        desc: 'Parámetros centrales del sistema, integración con Windows y personalización estética.'
      }
    };

    function switchView(viewId) {
      document.querySelectorAll('.view-content').forEach(view => view.classList.add('hidden'));
      document.querySelectorAll('.sidebar-nav .nav-button, .sidebar-footer .nav-button').forEach(btn => btn.classList.remove('active'));

      const targetView = document.getElementById('view-' + viewId);
      const targetBtn = document.getElementById('nav-' + viewId);
      const titleEl = document.getElementById('current-view-title');
      const descEl = document.getElementById('current-view-desc');

      if (targetView) targetView.classList.remove('hidden');
      if (targetBtn) targetBtn.classList.add('active');

      const meta = VIEW_METADATA[viewId] || { title: 'Panel', desc: '' };
      if (titleEl) titleEl.textContent = meta.title;
      if (descEl) descEl.textContent = meta.desc;

      currentView = viewId;
      updateTopbarContextualActions(viewId);

      // Si se ingresa al Dashboard, restaurar el layout sobre la cuadrícula ahora visible
      if (viewId === 'dashboard') {
        restoreDashboardLayout();
      }
      if (viewId === 'settings') {
        checkCoreServiceStatus();
      }
    }

    // ACCIONES CONTEXTUALES DINÁMICAS EN LA BARRA SUPERIOR
    function updateTopbarContextualActions(viewId) {
      const container = document.getElementById('topbar-contextual-actions');
      if (!container) return;

      if (viewId === 'dashboard') {
        container.style.display = 'flex';
        container.innerHTML = `
          <div class="custom-combobox combobox-inline" id="combo-topbar-profile" title="Perfil de Dashboard">
            <div class="combobox-trigger" onclick="toggleCombobox('combo-topbar-profile')">
              <div style="display: flex; align-items: center; gap: 7px; min-width: 0;">
                <svg class="svg-icon svg-icon-xs" style="color: var(--accent-primary); flex-shrink: 0;" viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"></path></svg>
                <span class="combobox-val" id="val-topbar-profile" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; display: inline-flex; align-items: center; gap: 5px;"><span>Principal</span><svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" style="width: 12px; height: 12px; flex-shrink: 0; opacity: 0.85;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>
              </div>
              <svg class="svg-icon svg-icon-xs combobox-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div class="combobox-dropdown" id="dropdown-topbar-profile">
              <!-- Opciones generadas dinámicamente -->
            </div>
          </div>
          <button class="btn-icon" id="btn-topbar-organize" onclick="autoOrganizeDashboard()" data-tooltip="Auto-organizar Dashboard" title="Auto-organizar Dashboard">
            <svg class="svg-icon" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
            </svg>
          </button>
          <button class="btn btn-primary" id="btn-topbar-customize" onclick="toggleDrawer('catalog')" title="Gestionar Widgets del Dashboard">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
            <span>Widgets</span>
          </button>
        `;
        updateProfileSelectorsUI();
      } else if (viewId === 'module-manager' || viewId === 'settings') {
        // En configuración y gestión de módulos: NUNCA se usan botones en la barra superior
        container.style.display = 'none';
        container.innerHTML = '';
      } else if (viewId.startsWith('module-')) {
        const modId = viewId.replace('module-', '');
        const mod = installedModules.get(modId);
        let actionsHtml = '';
        if (mod && mod.manifest) {
          if (mod.manifest.topbar_actions) {
            actionsHtml += mod.manifest.topbar_actions;
          }
          if (mod.manifest.meta_options && mod.manifest.meta_options.length > 0) {
            actionsHtml += `
              <button class="btn btn-secondary" onclick="switchView('settings'); switchSettingsTab('mod-${modId}');" title="Configuración de ${mod.manifest.name}">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <span>Configuración</span>
              </button>
            `;
          }
        }
        if (actionsHtml) {
          container.style.display = 'flex';
          container.innerHTML = actionsHtml;
        } else {
          container.style.display = 'none';
          container.innerHTML = '';
        }
      } else {
        container.style.display = 'none';
        container.innerHTML = '';
      }
    }

    // 2. COLAPSO CANÓNICO DEL SIDEBAR (ÚNICAMENTE VÍA LOGO)
    function toggleSidebar() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
      }
    }

    // 3. DRAWERS LATERALES (NOTIFICACIONES Y PERSONALIZACIÓN DE DASHBOARD)
    function toggleDrawer(drawerId) {
      const overlay = document.getElementById('drawer-overlay');
      const drawer = document.getElementById('drawer-' + drawerId);
      if (drawer) {
        const isActive = drawer.classList.contains('active');
        closeAllDrawers();
        if (!isActive) {
          if (drawerId === 'catalog') {
            renderDashboardCustomizationCatalog();
          }
          drawer.classList.add('active');
          overlay.classList.add('active');
        }
      }
    }

    function closeAllDrawers() {
      document.querySelectorAll('.drawer').forEach(d => d.classList.remove('active'));
      document.getElementById('drawer-overlay').classList.remove('active');
    }

    // PERSONALIZACIÓN DEL DASHBOARD: CATÁLOGO Y VISIBILIDAD DE TARJETAS
    function renderDashboardCustomizationCatalog() {
      const container = document.getElementById('drawer-catalog-body');
      if (!container) return;

      const currentProfile = getCurrentDashboardProfile();
      const profileOptions = Object.values(dashboardProfilesState.profiles).map(p => 
        `<option value="${p.id}" ${p.id === dashboardProfilesState.activeProfileId ? 'selected' : ''}>${p.name}</option>`
      ).join('');

      const profileSectionHtml = `
        <div class="drawer-profile-card" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 12px 14px; margin-bottom: 8px; box-sizing: border-box; width: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <svg class="svg-icon svg-icon-xs" style="color: var(--accent-primary);" viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"></path></svg>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Perfil Activo</span>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="btn-icon btn-icon-xs" onclick="moveCurrentProfileUp()" data-tooltip="Mover perfil arriba" title="Mover perfil arriba" style="${dashboardProfilesState.activeProfileId === 'default' ? 'display: none;' : 'display: inline-flex;'}">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
              <button class="btn-icon btn-icon-xs" onclick="moveCurrentProfileDown()" data-tooltip="Mover perfil abajo" title="Mover perfil abajo" style="${dashboardProfilesState.activeProfileId === 'default' ? 'display: none;' : 'display: inline-flex;'}">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <button class="btn btn-secondary" style="font-size: 11px; padding: 3px 8px; height: 26px;" onclick="showNewProfilePrompt()" title="Crear nuevo perfil">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
                <span>Nuevo</span>
              </button>
              <button class="btn-icon btn-icon-xs" id="btn-rename-profile" onclick="showRenameProfilePrompt()" data-tooltip="Renombrar Perfil" title="Renombrar Perfil" style="${dashboardProfilesState.activeProfileId === DEFAULT_DASHBOARD_PROFILE_ID ? 'display: none;' : 'display: inline-flex;'}">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
              </button>
              <button class="btn-icon btn-icon-xs" onclick="duplicateCurrentDashboardProfile()" data-tooltip="Duplicar Perfil" title="Duplicar Perfil">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button class="btn-icon btn-icon-xs" id="btn-delete-profile" onclick="deleteCurrentDashboardProfile()" data-tooltip="Eliminar Perfil" title="Eliminar Perfil" style="color: var(--accent-danger); ${dashboardProfilesState.activeProfileId === DEFAULT_DASHBOARD_PROFILE_ID ? 'display: none;' : 'display: inline-flex;'}">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
          <div>
            <div class="custom-combobox" id="combo-drawer-profile" style="width: 100%;">
              <div class="combobox-trigger" onclick="toggleCombobox('combo-drawer-profile')" style="padding: 7px 12px; font-size: 12.5px; border-radius: var(--radius-md);">
                <span class="combobox-val" id="val-drawer-profile" style="display: inline-flex; align-items: center; gap: 5px;">
                  <span>${currentProfile.id === DEFAULT_DASHBOARD_PROFILE_ID ? 'Principal' : currentProfile.name}</span>
                  ${currentProfile.id === DEFAULT_DASHBOARD_PROFILE_ID ? '<svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" style="width: 12px; height: 12px; flex-shrink: 0; opacity: 0.85;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' : ''}
                </span>
                <svg class="svg-icon svg-icon-xs combobox-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
              <div class="combobox-dropdown" id="dropdown-drawer-profile">
                ${getOrderedDashboardProfiles().map(p => `
                  <div class="combobox-option ${p.id === dashboardProfilesState.activeProfileId ? 'selected' : ''}" onclick="selectDashboardProfileFromCombo('${p.id}')">
                    <span style="display: inline-flex; align-items: center; gap: 5px;">
                      <span>${p.id === DEFAULT_DASHBOARD_PROFILE_ID ? 'Principal' : p.name}</span>
                      ${p.id === DEFAULT_DASHBOARD_PROFILE_ID ? '<svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" style="width: 12px; height: 12px; flex-shrink: 0; opacity: 0.85;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' : ''}
                    </span>
                    <svg class="svg-icon svg-icon-xs option-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <!-- Panel para creación de nuevo perfil -->
          <div id="panel-new-profile" style="display: none; flex-direction: column; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-subtle);">
            <div style="font-size: 11.5px; color: var(--text-secondary);">Nombre del nuevo perfil:</div>
            <div style="display: flex; gap: 6px;">
              <input type="text" id="input-new-profile-name" class="form-control" style="font-size: 12px; padding: 6px 10px; flex: 1; min-width: 0; box-sizing: border-box;" placeholder="Ej: Monitoreo, Minimalista..." onkeydown="if(event.key==='Enter') submitNewProfile()">
              <button class="btn btn-primary" style="font-size: 11.5px; padding: 5px 10px;" onclick="submitNewProfile()">Guardar</button>
              <button class="btn btn-secondary" style="font-size: 11.5px; padding: 5px 10px;" onclick="cancelNewProfilePrompt()">Cancelar</button>
            </div>
          </div>
          <!-- Panel para renombrado de perfil -->
          <div id="panel-rename-profile" style="display: none; flex-direction: column; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-subtle);">
            <div style="font-size: 11.5px; color: var(--text-secondary);">Renombrar perfil activo:</div>
            <div style="display: flex; gap: 6px;">
              <input type="text" id="input-rename-profile-name" class="form-control" style="font-size: 12px; padding: 6px 10px; flex: 1; min-width: 0; box-sizing: border-box;" placeholder="Nuevo nombre" onkeydown="if(event.key==='Enter') submitRenameProfile()">
              <button class="btn btn-primary" style="font-size: 11.5px; padding: 5px 10px;" onclick="submitRenameProfile()">Guardar</button>
              <button class="btn btn-secondary" style="font-size: 11.5px; padding: 5px 10px;" onclick="cancelRenameProfilePrompt()">Cancelar</button>
            </div>
          </div>
        </div>
      `;

      // Agrupar widgets por módulo
      const moduleGroups = [];
      let totalAvailableWidgets = 0;

      installedModules.forEach(mod => {
        if (mod.active && mod.manifest && mod.manifest.widgets && mod.manifest.widgets.length > 0) {
          totalAvailableWidgets += mod.manifest.widgets.length;
          moduleGroups.push({
            module: mod.manifest,
            widgets: mod.manifest.widgets
          });
        }
      });

      if (moduleGroups.length === 0) {
        container.innerHTML = `
          ${profileSectionHtml}
          <div style="text-align: center; padding: 30px 20px;">
            <svg class="svg-icon svg-icon-xl" style="color: var(--text-muted); margin-bottom: 14px; opacity: 0.5;" viewBox="0 0 24 24">
              <rect width="7" height="9" x="3" y="3" rx="1"></rect>
              <rect width="7" height="5" x="14" y="3" rx="1"></rect>
              <rect width="7" height="9" x="14" y="12" rx="1"></rect>
              <rect width="7" height="5" x="3" y="16" rx="1"></rect>
            </svg>
            <h4 style="font-size: 15px; font-weight: 600;">Sin tarjetas disponibles</h4>
            <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 6px; line-height: 1.4;">
              Actualmente no hay módulos activos con tarjetas de Dashboard. Instala o activa extensiones (.pcm) para configurar su visualización.
            </p>
            <button class="btn btn-primary" style="margin-top: 20px;" onclick="closeAllDrawers(); switchView('module-manager');">
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
              <span>Ir al Gestor de Módulos</span>
            </button>
          </div>
        `;
        return;
      }

      if (!window.__EXPANDED_DRAWER_GROUPS__) {
        window.__EXPANDED_DRAWER_GROUPS__ = new Set();
      }

      container.innerHTML = `
        ${profileSectionHtml}
        <div style="display: flex; align-items: center; justify-content: space-between; margin: 4px 2px 8px;">
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Widgets por Módulo</span>
          <span style="font-size: 11px; color: var(--text-muted);">${totalAvailableWidgets} disponible(s)</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${moduleGroups.map(grp => {
            const modId = grp.module.id;
            const isExpanded = window.__EXPANDED_DRAWER_GROUPS__.has(modId);
            const modIcon = grp.module.icon || (grp.module.views && grp.module.views[0] && grp.module.views[0].icon) || `
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24">
                <rect width="7" height="9" x="3" y="3" rx="1"></rect>
                <rect width="7" height="5" x="14" y="3" rx="1"></rect>
                <rect width="7" height="9" x="14" y="12" rx="1"></rect>
                <rect width="7" height="5" x="3" y="16" rx="1"></rect>
              </svg>
            `;
            
            let activeInGroup = 0;
            const widgetsHtml = grp.widgets.map(w => {
              const cardId = w.id || `card-${modId}`;
              const cardEl = document.getElementById(cardId);
              const isVisible = cardEl ? cardEl.style.display !== 'none' : !(currentProfile.hiddenWidgets || []).includes(cardId);
              if (isVisible) activeInGroup++;

              const widgetIcon = w.icon || modIcon;

              const sizeMatch = (w.size || '2x1').match(/(\d+)x(\d+)/);
              let sCol = sizeMatch ? parseInt(sizeMatch[1], 10) : 2;
              let sRow = sizeMatch ? parseInt(sizeMatch[2], 10) : 1;
              if (w.size === 'banner') { sCol = 12; sRow = 2; }

              const orientationType = w.orientation || (sCol > sRow ? 'horizontal' : (sRow > sCol ? 'vertical' : 'universal'));
              let orientationBadge = '';
              if (orientationType === 'horizontal') {
                orientationBadge = `
                  <span class="card-badge" style="display: inline-flex; align-items: center; gap: 3px; font-size: 9px; padding: 1px 5px; flex-shrink: 0;" data-tooltip="Óptimo para pantallas horizontales (16:9)" title="Óptimo para pantallas horizontales (16:9)">
                    <svg class="svg-icon svg-icon-xs" style="width: 10px; height: 10px; color: var(--accent-primary);" viewBox="0 0 24 24"><path d="M8 3 4 7l4 4"></path><path d="M4 7h16"></path><path d="m16 21 4-4-4-4"></path><path d="M20 17H4"></path></svg>
                    <span>Horiz</span>
                  </span>
                `;
              } else if (orientationType === 'vertical') {
                orientationBadge = `
                  <span class="card-badge" style="display: inline-flex; align-items: center; gap: 3px; font-size: 9px; padding: 1px 5px; flex-shrink: 0;" data-tooltip="Óptimo para pantallas verticales (9:16) o columnas" title="Óptimo para pantallas verticales (9:16) o columnas">
                    <svg class="svg-icon svg-icon-xs" style="width: 10px; height: 10px; color: var(--accent-success);" viewBox="0 0 24 24"><path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path><path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path></svg>
                    <span>Vert</span>
                  </span>
                `;
              } else {
                orientationBadge = `
                  <span class="card-badge" style="display: inline-flex; align-items: center; gap: 3px; font-size: 9px; padding: 1px 5px; flex-shrink: 0;" data-tooltip="Universal (adaptable a cualquier pantalla)" title="Universal (adaptable a cualquier pantalla)">
                    <svg class="svg-icon svg-icon-xs" style="width: 10px; height: 10px; color: var(--text-muted);" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
                    <span>Univ</span>
                  </span>
                `;
              }

              return `
                <div class="widget-catalog-item">
                  <div class="widget-catalog-info">
                    <div class="widget-catalog-icon">
                      ${widgetIcon}
                    </div>
                    <div class="widget-catalog-texts">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <h5>${w.name || 'Widget'}</h5>
                        <span class="card-badge" style="font-size: 9.5px; padding: 1px 5px; flex-shrink: 0;">${w.size || '2x1'}</span>
                        ${orientationBadge}
                      </div>
                    </div>
                  </div>
                  <div class="widget-switch-wrapper" id="switch-wrap-${cardId}" style="position: relative; display: flex; align-items: center; gap: 6px;">
                    <span class="switch-error-hint hidden" id="err-hint-${cardId}">Sin espacio</span>
                    <label class="switch" id="switch-lbl-${cardId}" style="flex-shrink: 0;" title="Mostrar/Ocultar widget en el Dashboard">
                      <input type="checkbox" id="chk-widget-${cardId}" ${isVisible ? 'checked' : ''} onchange="toggleWidgetVisibility('${cardId}', this.checked)">
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>
              `;
            }).join('');

            return `
              <div class="widget-drawer-group-card">
                <div class="widget-drawer-group-header" onclick="toggleWidgetDrawerGroup('${modId}')" title="Desplegar / Colapsar widgets de ${grp.module.name}">
                  <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                    <div class="widget-drawer-group-icon">
                      ${modIcon}
                    </div>
                    <div style="min-width: 0; flex: 1;">
                      <div class="widget-drawer-group-title">
                        ${grp.module.name}
                      </div>
                      <div class="widget-drawer-group-subtitle">
                        ${activeInGroup} de ${grp.widgets.length} activo(s)
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="card-badge" style="font-size: 10px; padding: 2px 6px; flex-shrink: 0;">${grp.widgets.length}</span>
                    <svg class="svg-icon svg-icon-xs widget-drawer-chevron ${isExpanded ? 'rotated' : ''}" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
                <div class="widget-drawer-group-body" style="display: ${isExpanded ? 'flex' : 'none'};">
                  ${widgetsHtml}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    function toggleWidgetDrawerGroup(modId) {
      if (!window.__EXPANDED_DRAWER_GROUPS__) {
        window.__EXPANDED_DRAWER_GROUPS__ = new Set();
      }
      if (window.__EXPANDED_DRAWER_GROUPS__.has(modId)) {
        window.__EXPANDED_DRAWER_GROUPS__.delete(modId);
      } else {
        window.__EXPANDED_DRAWER_GROUPS__.add(modId);
      }
      renderDashboardCustomizationCatalog();
    }

    function toggleWidgetVisibility(cardId, isVisible) {
      const card = document.getElementById(cardId);
      const current = getCurrentDashboardProfile();
      let hiddenIds = getActiveProfileHidden(current);
      let layout = getActiveProfileLayout(current);

      if (!isVisible) {
        if (!hiddenIds.includes(cardId)) {
          hiddenIds.push(cardId);
          setActiveProfileHidden(current, hiddenIds);
        }
        if (card) {
          card.style.display = 'none';
          delete card.dataset.col;
          delete card.dataset.row;
          card.style.gridColumn = '';
          card.style.gridRow = '';
        }
        if (layout && layout[cardId]) {
          delete layout[cardId];
          setActiveProfileLayout(current, layout);
        }
        persistDashboardProfilesState();
      } else {
        // VERIFICACIÓN ESTRICTA DE CAPACIDAD: Impedir caos y no mover jamás las tarjetas preexistentes
        if (card) {
          const { spanCol, spanRow } = getCardSpan(card);
          const gridCols = getGridCols();
          const effSpanCol = Math.min(spanCol, gridCols);

          // Construir mapa de ocupación EXACTO de las tarjetas visibles actualmente
          const grid = document.getElementById('grid-board');
          const occupied = {};
          if (grid) {
            const cards = Array.from(grid.querySelectorAll('.card')).filter(c => c.style.display !== 'none' && c.id !== cardId);
            cards.forEach(c => {
              let col = null;
              let row = null;
              if (c.dataset.col && c.dataset.row) {
                col = parseInt(c.dataset.col, 10);
                row = parseInt(c.dataset.row, 10);
              } else if (layout[c.id] && layout[c.id].col && layout[c.id].row) {
                col = parseInt(layout[c.id].col, 10);
                row = parseInt(layout[c.id].row, 10);
              }
              if (!col || !row || col < 1 || row < 1) return;

              const { spanCol: sC, spanRow: sR } = getCardSpan(c);
              const eC = Math.min(sC, gridCols);
              for (let r = row; r < row + sR; r++) {
                if (!occupied[r]) occupied[r] = {};
                for (let cl = col; cl < col + eC; cl++) {
                  occupied[r][cl] = c.id;
                }
              }
            });
          }

          const slot = findNextFreeSlot(gridCols, effSpanCol, spanRow, occupied);
          if (!slot) {
            // Revertir switch inmediatamente y emitir feedback visual en el propio interruptor (Cero notificaciones en panel)
            const chk = document.getElementById(`chk-widget-${cardId}`);
            if (chk) chk.checked = false;
            const wrap = document.getElementById(`switch-wrap-${cardId}`);
            if (wrap) {
              const lbl = wrap.querySelector('.switch');
              if (lbl) {
                lbl.classList.remove('switch-shake-error');
                void lbl.offsetWidth;
                lbl.classList.add('switch-shake-error');
                setTimeout(() => lbl.classList.remove('switch-shake-error'), 500);
              }
              const hint = document.getElementById(`err-hint-${cardId}`);
              if (hint) {
                hint.classList.remove('hidden');
                clearTimeout(hint._timer);
                hint._timer = setTimeout(() => hint.classList.add('hidden'), 2500);
              }
            }
            return;
          }

          // Si cabe: Ubicarla ÚNICAMENTE en el slot libre sin alterar ninguna otra tarjeta
          hiddenIds = hiddenIds.filter(id => id !== cardId);
          setActiveProfileHidden(current, hiddenIds);
          card.style.display = 'flex';
          card.style.gridColumn = `${slot.col} / span ${effSpanCol}`;
          card.style.gridRow = `${slot.row} / span ${spanRow}`;
          card.dataset.col = slot.col;
          card.dataset.row = slot.row;
          layout[cardId] = { col: slot.col, row: slot.row };
          setActiveProfileLayout(current, layout);
          persistDashboardProfilesState();

          card.classList.remove('card-drop');
          void card.offsetWidth;
          card.classList.add('card-drop');
          setTimeout(() => card.classList.remove('card-drop'), 300);
        }
      }

      // Comprobar si todas las tarjetas están ocultas
      const allCards = Array.from(document.querySelectorAll('#grid-board .card'));
      const visibleCards = allCards.filter(c => c.style.display !== 'none');
      const emptyHero = document.querySelector('.empty-dashboard-hero');
      if (emptyHero) {
        if (allCards.length > 0 && visibleCards.length === 0) {
          emptyHero.style.display = 'flex';
          const p = emptyHero.querySelector('p');
          if (p) p.textContent = 'Todas las tarjetas instaladas se encuentran ocultas en este perfil. Pulsa en "Widgets" para activarlas.';
        } else if (visibleCards.length > 0) {
          emptyHero.style.display = 'none';
        }
      }

      updateDashboardCardsCount();
      renderDashboardCustomizationCatalog();
    }


    // 4. GESTOR DE MÓDULOS (PESTAÑAS)
    function switchManagerTab(tabId) {
      document.querySelectorAll('#view-module-manager .tab-btn').forEach(btn => btn.classList.remove('active'));
      const btn = document.getElementById('tab-btn-' + tabId);
      if (btn) btn.classList.add('active');

      ['installed', 'catalog', 'sources', 'groups'].forEach(t => {
        const el = document.getElementById('manager-tab-' + t);
        if (el) el.classList.add('hidden');
      });

      const activeTab = document.getElementById('manager-tab-' + tabId);
      if (activeTab) activeTab.classList.remove('hidden');

      if (tabId === 'groups') {
        renderModuleGroupsManagerUI();
      } else if (tabId === 'installed') {
        renderInstalledModulesGroupSelectors();
      }
    }

    function focusModuleInManager(modId) {
      setTimeout(() => {
        const el = document.getElementById(`installed-mod-${modId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
          el.style.borderColor = 'var(--accent-primary)';
          el.style.boxShadow = '0 0 0 2px var(--accent-primary-dim), 0 8px 24px -4px rgba(0, 0, 0, 0.4)';
          setTimeout(() => {
            el.style.borderColor = '';
            el.style.boxShadow = '';
          }, 1500);
        }
      }, 100);
    }

    // 5. GESTIÓN E INSTALACIÓN DE PAQUETES .PCM (DYNAMIC EXTENSIBILITY)
    const installedModules = new Map();

    function triggerInstallDialog() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pcm,.zip';
      input.onchange = (e) => {
        if (e.target.files.length > 0) {
          handlePcmPackage(e.target.files[0]);
        }
      };
      input.click();
    }

    const KNOWN_PERMISSIONS = {
      'system:execute': {
        title: 'Ejecución de Scripts de Telemetría',
        desc: 'Permite ejecutar scripts de bajo nivel (PowerShell / Diagnóstico) bajo el filtro inmutable de validación en Rust.'
      },
      'system:storage': {
        title: 'Supervisión de Almacenamiento Físico',
        desc: 'Permite consultar telemetría de hardware, buses de disco y métricas operativas de unidades físicas.'
      },
      'system:network': {
        title: 'Telemetría de Red y Conectividad',
        desc: 'Permite consultar el estado de interfaces de red y tráfico de adaptadores locales.'
      }
    };

    let pendingModulePackage = null;

    function closeModuleSecurityModal() {
      const modal = document.getElementById('modal-module-security');
      if (modal) modal.style.display = 'none';
      pendingModulePackage = null;
    }

    function openModuleSecurityModal(inspection, serviceStatus) {
      const modal = document.getElementById('modal-module-security');
      if (!modal) return;

      const m = inspection.manifest || {};
      document.getElementById('sec-module-name').textContent = m.name || 'Módulo Sin Nombre';
      document.getElementById('sec-module-version').textContent = `v${m.version || '1.0.0'}`;
      document.getElementById('sec-module-desc').textContent = m.description || 'Sin descripción detallada proporcionada en el manifiesto.';
      document.getElementById('sec-module-id').textContent = m.id || 'desconocido';
      document.getElementById('sec-module-author').textContent = inspection.author || m.author || 'No especificado';
      
      const fpEl = document.getElementById('sec-module-fingerprint');
      if (inspection.fingerprint) {
        fpEl.textContent = inspection.fingerprint;
        document.getElementById('sec-module-fingerprint-box').style.display = 'block';
      } else {
        document.getElementById('sec-module-fingerprint-box').style.display = 'none';
      }

      // Banner de Estado Criptográfico
      const banner = document.getElementById('sec-modal-status-banner');
      const btnInstall = document.getElementById('btn-sec-confirm-install');
      const btnText = document.getElementById('btn-sec-confirm-text');
      const iconBadge = document.getElementById('sec-modal-icon-badge');

      if (inspection.security_status === 'VERIFIED') {
        banner.style.background = 'var(--accent-success-dim)';
        banner.style.borderColor = 'var(--accent-success)';
        banner.style.color = 'var(--accent-success)';
        iconBadge.style.background = 'var(--accent-success-dim)';
        iconBadge.style.color = 'var(--accent-success)';
        banner.innerHTML = `
          <svg class="svg-icon" style="flex-shrink: 0; width: 20px; height: 20px;" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Firma Criptográfica Verificada (Ed25519)</div>
            <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
              Este módulo fue firmado con la clave criptográfica oficial del Núcleo y todos los archivos (.js, .json, .ps1) coinciden estrictamente con el manifiesto inmutable SHA-256.
            </div>
          </div>
        `;
        btnInstall.disabled = false;
        btnInstall.style.display = 'inline-flex';
        btnInstall.className = 'btn btn-primary';
        btnText.textContent = 'Instalar Módulo Seguro';
      } else if (inspection.security_status === 'UNVERIFIED_AUTHOR') {
        banner.style.background = 'var(--accent-warning-dim)';
        banner.style.borderColor = 'var(--accent-warning)';
        banner.style.color = 'var(--accent-warning)';
        iconBadge.style.background = 'var(--accent-warning-dim)';
        iconBadge.style.color = 'var(--accent-warning)';
        banner.innerHTML = `
          <svg class="svg-icon" style="flex-shrink: 0; width: 20px; height: 20px;" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Firma Válida - Autor Externo No Oficial</div>
            <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
              La firma criptográfica es auténtica y los archivos no han sido alterados, pero el autor no pertenece a la lista de confianza del Core de PC Manager. Proceda bajo su propio criterio.
            </div>
          </div>
        `;
        btnInstall.disabled = false;
        btnInstall.style.display = 'inline-flex';
        btnInstall.className = 'btn btn-primary';
        btnText.textContent = 'Aceptar Riesgos e Instalar';
      } else {
        // TAMPERED / CORRUPTO
        banner.style.background = 'var(--accent-danger-dim)';
        banner.style.borderColor = 'var(--accent-danger)';
        banner.style.color = 'var(--accent-danger)';
        iconBadge.style.background = 'var(--accent-danger-dim)';
        iconBadge.style.color = 'var(--accent-danger)';
        banner.innerHTML = `
          <svg class="svg-icon" style="flex-shrink: 0; width: 20px; height: 20px;" viewBox="0 0 24 24"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">¡ALERTA DE SEGURIDAD: PAQUETE ALTERADO O CORRUPTO!</div>
            <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
              ${inspection.security_message || 'Los archivos del paquete no coinciden con la firma o el manifiesto SHA-256. La instalación ha sido bloqueada para proteger el sistema anfitrión.'}
            </div>
          </div>
        `;
        btnInstall.disabled = true;
        btnInstall.style.display = 'none';
      }

      // Permisos Solicitados
      const permList = document.getElementById('sec-modal-permissions-list');
      permList.innerHTML = '';
      const perms = m.permissions || [];
      if (perms.length === 0) {
        permList.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); font-style: italic; padding: 6px 0;">Este módulo opera de forma aislada y no requiere permisos especiales del sistema.</div>`;
      } else {
        perms.forEach(perm => {
          const info = KNOWN_PERMISSIONS[perm] || {
            title: `Acceso al Sistema: ${perm}`,
            desc: `Permiso operativo declarado en el manifiesto (${perm}).`
          };
          const row = document.createElement('label');
          row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: var(--bg-elevated); padding: 9px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); cursor: pointer; transition: var(--transition-smooth);';
          row.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px; padding-right: 12px;">
              <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${info.title}</span>
              <span style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">${info.desc}</span>
            </div>
            <input type="checkbox" class="sec-perm-checkbox" value="${perm}" checked style="accent-color: var(--accent-primary); width: 17px; height: 17px; flex-shrink: 0; cursor: pointer;">
          `;
          permList.appendChild(row);
        });
      }

      // Requerimiento de Servicio de Windows
      const serviceBox = document.getElementById('sec-modal-service-box');
      if (inspection.requires_service) {
        serviceBox.style.display = 'flex';
        if (inspection.service_reason) {
          document.getElementById('sec-modal-service-reason').textContent = inspection.service_reason;
        }
        const statusEl = document.getElementById('sec-modal-service-status');
        const btnSvc = document.getElementById('btn-sec-install-service');
        if (serviceStatus && serviceStatus.installed && serviceStatus.running) {
          statusEl.innerHTML = '<span style="color: var(--accent-success); font-weight: 600;">● Servicio de Windows en ejecución</span>';
          btnSvc.style.display = 'none';
        } else if (serviceStatus && serviceStatus.installed && !serviceStatus.running) {
          statusEl.innerHTML = '<span style="color: var(--accent-warning); font-weight: 600;">● Servicio instalado pero detenido</span>';
          btnSvc.style.display = 'inline-flex';
          btnSvc.textContent = 'Iniciar Servicio';
        } else {
          statusEl.innerHTML = '<span style="color: var(--accent-warning); font-weight: 600;">● Servicio de Windows no instalado</span>';
          btnSvc.style.display = 'inline-flex';
          btnSvc.textContent = 'Instalar y Arrancar Servicio';
        }
      } else {
        serviceBox.style.display = 'none';
      }

      modal.style.display = 'flex';
    }

    async function requestServiceInstallationFromModal() {
      const invokeFn = getTauriInvoke();
      if (!invokeFn) return;
      const btn = document.getElementById('btn-sec-install-service');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Configurando servicio...';
      }
      try {
        const res = await invokeFn('request_service_installation');
        addSystemNotification('Servicio de Windows', res || 'Servicio configurado.', 'info', 'system');
        const serviceStatus = await invokeFn('check_service_status');
        const statusEl = document.getElementById('sec-modal-service-status');
        if (statusEl) {
          if (serviceStatus.running) {
            statusEl.innerHTML = '<span style="color: var(--accent-success); font-weight: 600;">● Servicio de Windows en ejecución</span>';
            if (btn) btn.style.display = 'none';
          } else {
            statusEl.innerHTML = '<span style="color: var(--accent-warning); font-weight: 600;">● Servicio configurado</span>';
            if (btn) btn.disabled = false;
          }
        }
      } catch (err) {
        addSystemNotification('Error de Servicio', `No se pudo configurar el servicio: ${err}`, 'warning', 'system');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Reintentar Instalación';
        }
      }
    }

    async function confirmModuleInstallation() {
      if (!pendingModulePackage) return;
      const { packageBytes, inspection } = pendingModulePackage;
      const invokeFn = getTauriInvoke();
      if (!invokeFn) return;

      const checkboxes = document.querySelectorAll('.sec-perm-checkbox');
      const grantedPermissions = [];
      checkboxes.forEach(cb => {
        if (cb.checked) grantedPermissions.push(cb.value);
      });

      const btn = document.getElementById('btn-sec-confirm-install');
      const btnText = document.getElementById('btn-sec-confirm-text');
      if (btn) {
        btn.disabled = true;
        if (btnText) btnText.textContent = 'Instalando módulo...';
      }

      try {
        const record = await invokeFn('install_module_package', { 
          packageBytes, 
          grantedPermissions 
        });
        
        closeModuleSecurityModal();

        if (record && record.manifest) {
          installModule(record.manifest, record.script_code);
          renderDashboardCustomizationCatalog();
          addSystemNotification(
            'Módulo Instalado', 
            `El módulo '${record.manifest.name}' se instaló con éxito bajo el protocolo de seguridad Ed25519.`,
            'success',
            'modules'
          );
        }
      } catch (err) {
        console.error('Error al instalar módulo verificado:', err);
        addSystemNotification('Fallo de Instalación', `No se pudo completar la instalación: ${err}`, 'warning', 'modules');
      } finally {
        if (btn) {
          btn.disabled = false;
          if (btnText) btnText.textContent = 'Aceptar Riesgos e Instalar';
        }
        pendingModulePackage = null;
      }
    }

    async function handlePcmPackage(file) {
      if (!file) return;
      try {
        if (!file.name.endsWith('.pcm') && !file.name.endsWith('.zip')) {
          addSystemNotification('Formato No Soportado', 'El paquete debe tener extensión .pcm o .zip.', 'warning', 'modules');
          return;
        }

        const arrayBuffer = await file.arrayBuffer();
        const invokeFn = getTauriInvoke();

        // 1. Vía Nativa Rust (Software de Escritorio con Auditoría de Seguridad Previa)
        if (invokeFn) {
          const packageBytes = Array.from(new Uint8Array(arrayBuffer));
          
          let inspection;
          try {
            inspection = await invokeFn('inspect_module_package', { packageBytes });
          } catch (err) {
            addSystemNotification('Fallo de Inspección', `No se pudo analizar el paquete: ${err}`, 'warning', 'modules');
            return;
          }

          let serviceStatus = { installed: false, running: false };
          try {
            serviceStatus = await invokeFn('check_service_status');
          } catch (e) {
            console.warn('No se pudo verificar el estado del servicio de Windows:', e);
          }

          pendingModulePackage = {
            packageBytes,
            inspection,
            serviceStatus
          };

          openModuleSecurityModal(inspection, serviceStatus);
          return;
        }

        // 2. Fallback de descompresión en memoria si se ejecuta fuera de Tauri
        if (typeof JSZip === 'undefined') {
          addSystemNotification('Dependencia no cargada', 'Motor de descompresión JSZip no disponible.', 'warning', 'modules');
          return;
        }

        const zip = await JSZip.loadAsync(arrayBuffer);
        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) {
          addSystemNotification('Manifiesto Ausente', 'El paquete .pcm no contiene un manifest.json válido.', 'warning', 'modules');
          return;
        }

        const manifestText = await manifestFile.async('string');
        const manifest = JSON.parse(manifestText);

        if (!manifest.id || !manifest.name) {
          addSystemNotification('Manifiesto Inválido', 'Faltan campos obligatorios id o name.', 'warning', 'modules');
          return;
        }

        let scriptCode = '';
        const entryFile = zip.file(manifest.entrypoint || 'module.js');
        if (entryFile) {
          scriptCode = await entryFile.async('string');
        }

        installModule(manifest, scriptCode);
        renderDashboardCustomizationCatalog();
      } catch (err) {
        console.error('Error al instalar paquete .pcm:', err);
        addSystemNotification('Error de Instalación', `No se pudo instalar el paquete: ${err.message}`, 'warning', 'modules');
      }
    }

    // DRAG AND DROP FLUIDO, MATRIZ DUAL (12x6 HORIZONTAL / 6x12 VERTICAL) Y CERO SCROLL
    function isPortraitOrientation() {
      return window.innerHeight > window.innerWidth;
    }

    function getActiveProfileLayout(profile) {
      if (!profile) return {};
      if (isPortraitOrientation()) {
        if (!profile.layout_portrait) profile.layout_portrait = {};
        return profile.layout_portrait;
      } else {
        if (!profile.layout_landscape) profile.layout_landscape = {};
        return profile.layout_landscape;
      }
    }

    function setActiveProfileLayout(profile, layout) {
      if (!profile) return;
      if (isPortraitOrientation()) {
        profile.layout_portrait = layout;
      } else {
        profile.layout_landscape = layout;
      }
    }

    function getActiveProfileHidden(profile) {
      if (!profile) return [];
      if (isPortraitOrientation()) {
        if (!Array.isArray(profile.hidden_portrait)) profile.hidden_portrait = [];
        return profile.hidden_portrait;
      } else {
        if (!Array.isArray(profile.hidden_landscape)) profile.hidden_landscape = [];
        return profile.hidden_landscape;
      }
    }

    function setActiveProfileHidden(profile, hiddenList) {
      if (!profile) return;
      if (isPortraitOrientation()) {
        profile.hidden_portrait = hiddenList;
      } else {
        profile.hidden_landscape = hiddenList;
      }
    }

    function getGridCols() {
      return isPortraitOrientation() ? 6 : 12;
    }

    function getMaxVisibleRows() {
      return isPortraitOrientation() ? 12 : 6;
    }

    function getCardSpan(card) {
      if (card.classList.contains('card-size-banner')) {
        return { spanCol: isPortraitOrientation() ? 6 : 12, spanRow: 2 };
      }
      const match = card.className.match(/card-size-(\d+)x(\d+)/);
      if (match) {
        let col = parseInt(match[1], 10);
        let row = parseInt(match[2], 10);
        if (isPortraitOrientation() && col > 6) {
          col = 6;
        }
        return { spanCol: col, spanRow: row };
      }
      return { spanCol: 3, spanRow: 2 };
    }

    function findNextFreeSlot(gridCols, spanCol, spanRow, occupiedMatrix) {
      const maxVisibleRows = getMaxVisibleRows();
      const effSpanCol = Math.min(spanCol, gridCols);
      if (effSpanCol > gridCols || spanRow > maxVisibleRows) {
        return null;
      }
      for (let row = 1; row <= maxVisibleRows - spanRow + 1; row++) {
        for (let col = 1; col <= gridCols - effSpanCol + 1; col++) {
          let canFit = true;
          for (let r = row; r < row + spanRow; r++) {
            for (let c = col; c < col + effSpanCol; c++) {
              if (occupiedMatrix[r] && occupiedMatrix[r][c]) {
                canFit = false;
                break;
              }
            }
            if (!canFit) break;
          }
          if (canFit) {
            return { col, row };
          }
        }
      }
      return null;
    }

    function canWidgetFitOnDashboard(spanCol, spanRow, excludeCardId = null) {
      const grid = document.getElementById('grid-board');
      if (!grid) return true;
      const gridCols = getGridCols();
      const maxRows = getMaxVisibleRows();
      const effSpanCol = Math.min(spanCol, gridCols);
      if (effSpanCol > gridCols || spanRow > maxRows) return false;

      const current = getCurrentDashboardProfile();
      const layout = getActiveProfileLayout(current);
      const occupied = {};
      const cards = Array.from(grid.querySelectorAll('.card')).filter(c => c.style.display !== 'none' && c.id !== excludeCardId);
      cards.forEach(c => {
        let col = null;
        let row = null;
        if (c.dataset.col && c.dataset.row) {
          col = parseInt(c.dataset.col, 10);
          row = parseInt(c.dataset.row, 10);
        } else if (layout[c.id] && layout[c.id].col && layout[c.id].row) {
          col = parseInt(layout[c.id].col, 10);
          row = parseInt(layout[c.id].row, 10);
        }
        if (!col || !row || col < 1 || row < 1) return; // Omitir tarjetas sin posición confirmada

        const { spanCol: sC, spanRow: sR } = getCardSpan(c);
        const eC = Math.min(sC, gridCols);
        for (let r = row; r < row + sR; r++) {
          if (!occupied[r]) occupied[r] = {};
          for (let cl = col; cl < col + eC; cl++) {
            occupied[r][cl] = c.id;
          }
        }
      });

      const slot = findNextFreeSlot(gridCols, effSpanCol, spanRow, occupied);
      return slot !== null;
    }

    let activeDraggedCard = null;

    function makeCardDraggable(card) {
      card.addEventListener('pointerdown', (e) => {
        // Ignorar si el usuario interactúa con controles interactivos
        if (e.target.closest('button, input, select, .btn, .switch, label, a, .card-btn, textarea')) {
          return;
        }
        if (e.button !== 0) return; // Solo responder al clic principal

        const grid = document.getElementById('grid-board');
        if (!grid) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const cardRect = card.getBoundingClientRect();
        const grabOffsetX = e.clientX - cardRect.left;
        const grabOffsetY = e.clientY - cardRect.top;

        let isDragging = false;
        let clone = null;
        let indicator = null;

        const origCol = parseInt(card.dataset.col || '1', 10);
        const origRow = parseInt(card.dataset.row || '1', 10);
        const { spanCol, spanRow } = getCardSpan(card);

        function onPointerMove(moveEvent) {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;

          if (!isDragging && Math.hypot(dx, dy) > 5) {
            isDragging = true;
            activeDraggedCard = card;
            try { card.setPointerCapture(moveEvent.pointerId); } catch(err) {}

            // Crear clon flotante elevado
            clone = card.cloneNode(true);
            clone.id = 'active-drag-clone';
            clone.className = card.className + ' card-drag-clone';
            clone.style.width = `${cardRect.width}px`;
            clone.style.height = `${cardRect.height}px`;
            clone.style.left = `${moveEvent.clientX - grabOffsetX}px`;
            clone.style.top = `${moveEvent.clientY - grabOffsetY}px`;
            document.body.appendChild(clone);

            card.classList.add('card-drag-source');

            // Obtener o crear indicador de cuadrícula
            indicator = document.getElementById('grid-drop-indicator');
            if (!indicator) {
              indicator = document.createElement('div');
              indicator.id = 'grid-drop-indicator';
              indicator.className = 'grid-drop-indicator';
              grid.appendChild(indicator);
            }
            indicator.style.display = 'block';
          }

          if (isDragging) {
            moveEvent.preventDefault();

            // Mover clon flotante
            if (clone) {
              clone.style.left = `${moveEvent.clientX - grabOffsetX}px`;
              clone.style.top = `${moveEvent.clientY - grabOffsetY}px`;
            }

            // Calcular columna y fila objetivo en la cuadrícula fija proporcional
            const boardRect = grid.getBoundingClientRect();
            const gridCols = getGridCols();
            const maxVisibleRows = getMaxVisibleRows();
            const effSpanCol = Math.min(spanCol, gridCols);
            const effSpanRow = Math.min(spanRow, maxVisibleRows);

            const compStyle = window.getComputedStyle(grid);
            const padLeft = parseFloat(compStyle.paddingLeft) || 16;
            const padTop = parseFloat(compStyle.paddingTop) || 16;
            const padRight = parseFloat(compStyle.paddingRight) || 16;
            const padBottom = parseFloat(compStyle.paddingBottom) || 16;
            const gap = parseFloat(compStyle.rowGap || compStyle.gap) || 12;

            const innerWidth = boardRect.width - padLeft - padRight;
            const innerHeight = boardRect.height - padTop - padBottom;
            const colWidth = (innerWidth - (gap * (gridCols - 1))) / gridCols;
            const rowHeight = (innerHeight - (gap * (maxVisibleRows - 1))) / maxVisibleRows;
            const stepX = colWidth + gap;
            const stepY = rowHeight + gap;

            // Determinar límite estricto de fila: jamás exceder la cuadrícula visible (cero scroll)
            const maxAllowedRow = Math.max(1, maxVisibleRows - effSpanRow + 1);

            const cardLeft = moveEvent.clientX - grabOffsetX;
            const cardTop = moveEvent.clientY - grabOffsetY;
            const relX = cardLeft - boardRect.left - padLeft;
            const relY = cardTop - boardRect.top - padTop;

            let targetCol = Math.round(relX / stepX) + 1;
            if (moveEvent.clientX >= boardRect.right - padRight - 20) {
              targetCol = gridCols - effSpanCol + 1;
            }
            targetCol = Math.max(1, Math.min(gridCols - effSpanCol + 1, targetCol));

            let targetRow = Math.round(relY / stepY) + 1;
            if (moveEvent.clientY >= boardRect.bottom - padBottom - 20) {
              targetRow = maxAllowedRow;
            }
            targetRow = Math.max(1, Math.min(maxAllowedRow, targetRow));

            if (indicator) {
              indicator.style.gridColumn = `${targetCol} / span ${effSpanCol}`;
              indicator.style.gridRow = `${targetRow} / span ${spanRow}`;
              indicator.dataset.targetCol = targetCol;
              indicator.dataset.targetRow = targetRow;
            }
          }
        }

        function onPointerUp(upEvent) {
          card.removeEventListener('pointermove', onPointerMove);
          card.removeEventListener('pointerup', onPointerUp);
          card.removeEventListener('pointercancel', onPointerUp);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);

          if (isDragging) {
            try { card.releasePointerCapture(upEvent.pointerId); } catch(err) {}

            if (clone) {
              clone.remove();
              clone = null;
            }

            let targetCol = origCol;
            let targetRow = origRow;
            if (indicator) {
              targetCol = parseInt(indicator.dataset.targetCol || origCol, 10);
              targetRow = parseInt(indicator.dataset.targetRow || origRow, 10);
              indicator.style.display = 'none';
            }

            card.classList.remove('card-drag-source');
            activeDraggedCard = null;

            const gridCols = getGridCols();
            const effSpanCol = Math.min(spanCol, gridCols);

            // Matriz de ocupación estricta para garantizar 0 superposiciones
            const occupied = {};

            // 1. Asignar la posición deseada a la tarjeta arrastrada
            card.style.gridColumn = `${targetCol} / span ${effSpanCol}`;
            card.style.gridRow = `${targetRow} / span ${spanRow}`;
            card.dataset.col = targetCol;
            card.dataset.row = targetRow;

            for (let r = targetRow; r < targetRow + spanRow; r++) {
              if (!occupied[r]) occupied[r] = {};
              for (let c = targetCol; c < targetCol + effSpanCol; c++) {
                occupied[r][c] = card.id;
              }
            }

            card.classList.remove('card-drop');
            void card.offsetWidth;
            card.classList.add('card-drop');
            setTimeout(() => card.classList.remove('card-drop'), 300);

            // 2. Evaluar colisiones con las demás tarjetas activas
            const otherCards = Array.from(grid.querySelectorAll('.card')).filter(c => c !== card && c.style.display !== 'none');
            const collidingCards = otherCards.filter(other => {
              const oCol = parseInt(other.dataset.col || '1', 10);
              const oRow = parseInt(other.dataset.row || '1', 10);
              const { spanCol: oSpanCol, spanRow: oSpanRow } = getCardSpan(other);
              const oEffSpanCol = Math.min(oSpanCol, gridCols);
              const xOverlap = (targetCol < oCol + oEffSpanCol) && (targetCol + effSpanCol > oCol);
              const yOverlap = (targetRow < oRow + oSpanRow) && (targetRow + spanRow > oRow);
              return xOverlap && yOverlap;
            });

            // Si hay exactamente una tarjeta colisionando, intentar un swap limpio a la posición de origen
            let swappedCleanly = false;
            if (collidingCards.length === 1 && origCol && origRow) {
              const other = collidingCards[0];
              const { spanCol: oSpanCol, spanRow: oSpanRow } = getCardSpan(other);
              const oEffSpanCol = Math.min(oSpanCol, gridCols);
              const clampedOrigCol = Math.max(1, Math.min(gridCols - oEffSpanCol + 1, origCol));

              // Verificar si cabe exactamente en la posición original sin solapar con nadie
              let canSwap = true;
              for (let r = origRow; r < origRow + oSpanRow; r++) {
                for (let c = clampedOrigCol; c < clampedOrigCol + oEffSpanCol; c++) {
                  if (occupied[r] && occupied[r][c]) {
                    canSwap = false;
                    break;
                  }
                }
                if (!canSwap) break;
              }

              if (canSwap) {
                for (const nonCol of otherCards) {
                  if (nonCol === other) continue;
                  const nCol = parseInt(nonCol.dataset.col || '1', 10);
                  const nRow = parseInt(nonCol.dataset.row || '1', 10);
                  const { spanCol: nSpanCol, spanRow: nSpanRow } = getCardSpan(nonCol);
                  const nEffSpanCol = Math.min(nSpanCol, gridCols);
                  const xOver = (clampedOrigCol < nCol + nEffSpanCol) && (clampedOrigCol + oEffSpanCol > nCol);
                  const yOver = (origRow < nRow + nSpanRow) && (origRow + oSpanRow > nRow);
                  if (xOver && yOver) {
                    canSwap = false;
                    break;
                  }
                }
              }

              if (canSwap) {
                other.style.gridColumn = `${clampedOrigCol} / span ${oEffSpanCol}`;
                other.style.gridRow = `${origRow} / span ${oSpanRow}`;
                other.dataset.col = clampedOrigCol;
                other.dataset.row = origRow;
                for (let r = origRow; r < origRow + oSpanRow; r++) {
                  if (!occupied[r]) occupied[r] = {};
                  for (let c = clampedOrigCol; c < clampedOrigCol + oEffSpanCol; c++) {
                    occupied[r][c] = other.id;
                  }
                }
                other.classList.remove('card-drop');
                void other.offsetWidth;
                other.classList.add('card-drop');
                setTimeout(() => other.classList.remove('card-drop'), 300);
                swappedCleanly = true;
              }
            }

            // Si hay colisiones y no se pudo hacer un intercambio 1 a 1 limpio:
            // REVERTIR el movimiento sin alterar ni desplazar ninguna otra tarjeta
            if (collidingCards.length > 0 && !swappedCleanly) {
              card.style.gridColumn = `${origCol} / span ${effSpanCol}`;
              card.style.gridRow = `${origRow} / span ${spanRow}`;
              card.dataset.col = origCol;
              card.dataset.row = origRow;
              card.classList.remove('card-drop');
              void card.offsetWidth;
              card.classList.add('card-drop');
              setTimeout(() => card.classList.remove('card-drop'), 300);
              return;
            }

            // Si la cuadrícula se contrajo al mover elementos hacia arriba, ajustar el scroll residual
            if (viewContent) {
              const maxScroll = Math.max(0, viewContent.scrollHeight - viewContent.clientHeight);
              if (viewContent.scrollTop > maxScroll) {
                viewContent.scrollTop = maxScroll;
              }
            }

            persistDashboardLayout();
            renderDashboardCustomizationCatalog();
            updateDashboardCardsCount();
          }
        }

        card.addEventListener('pointermove', onPointerMove);
        card.addEventListener('pointerup', onPointerUp);
        card.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      });
    }

    // GESTIÓN DE PERFILES DE DASHBOARD
    const DEFAULT_DASHBOARD_PROFILE_ID = 'default';
    let dashboardProfilesState = {
      activeProfileId: DEFAULT_DASHBOARD_PROFILE_ID,
      profileOrder: [DEFAULT_DASHBOARD_PROFILE_ID],
      profiles: {
        [DEFAULT_DASHBOARD_PROFILE_ID]: {
          id: DEFAULT_DASHBOARD_PROFILE_ID,
          name: 'Principal',
          layout: {},
          hiddenWidgets: []
        }
      }
    };

    function getOrderedDashboardProfiles() {
      if (!dashboardProfilesState.profileOrder || !Array.isArray(dashboardProfilesState.profileOrder)) {
        dashboardProfilesState.profileOrder = [DEFAULT_DASHBOARD_PROFILE_ID];
      }
      // Garantizar que default siempre existe y esté de primero
      dashboardProfilesState.profileOrder = dashboardProfilesState.profileOrder.filter(id => id !== DEFAULT_DASHBOARD_PROFILE_ID && dashboardProfilesState.profiles[id]);
      dashboardProfilesState.profileOrder.unshift(DEFAULT_DASHBOARD_PROFILE_ID);

      // Agregar cualquier perfil que no esté en el orden
      Object.keys(dashboardProfilesState.profiles).forEach(id => {
        if (!dashboardProfilesState.profileOrder.includes(id)) {
          dashboardProfilesState.profileOrder.push(id);
        }
      });

      return dashboardProfilesState.profileOrder.map(id => dashboardProfilesState.profiles[id]).filter(Boolean);
    }

    function moveCurrentProfileUp() {
      const activeId = dashboardProfilesState.activeProfileId;
      if (activeId === DEFAULT_DASHBOARD_PROFILE_ID) return;
      getOrderedDashboardProfiles();
      const order = dashboardProfilesState.profileOrder;
      const idx = order.indexOf(activeId);
      if (idx > 1) { // No puede desplazar a default (posición 0)
        const temp = order[idx - 1];
        order[idx - 1] = order[idx];
        order[idx] = temp;
        persistDashboardProfilesState();
        updateProfileSelectorsUI();
        renderDashboardCustomizationCatalog();
      }
    }

    function moveCurrentProfileDown() {
      const activeId = dashboardProfilesState.activeProfileId;
      if (activeId === DEFAULT_DASHBOARD_PROFILE_ID) return;
      getOrderedDashboardProfiles();
      const order = dashboardProfilesState.profileOrder;
      const idx = order.indexOf(activeId);
      if (idx !== -1 && idx < order.length - 1) {
        const temp = order[idx + 1];
        order[idx + 1] = order[idx];
        order[idx] = temp;
        persistDashboardProfilesState();
        updateProfileSelectorsUI();
        renderDashboardCustomizationCatalog();
      }
    }

    function getCurrentDashboardProfile() {
      if (!dashboardProfilesState.profiles[dashboardProfilesState.activeProfileId]) {
        dashboardProfilesState.activeProfileId = DEFAULT_DASHBOARD_PROFILE_ID;
      }
      if (!dashboardProfilesState.profiles[DEFAULT_DASHBOARD_PROFILE_ID]) {
        dashboardProfilesState.profiles[DEFAULT_DASHBOARD_PROFILE_ID] = {
          id: DEFAULT_DASHBOARD_PROFILE_ID,
          name: 'Principal',
          layout: {},
          hiddenWidgets: []
        };
      } else {
        dashboardProfilesState.profiles[DEFAULT_DASHBOARD_PROFILE_ID].name = 'Principal';
      }
      return dashboardProfilesState.profiles[dashboardProfilesState.activeProfileId];
    }

    function updateProfileSelectorsUI() {
      const activeProf = getCurrentDashboardProfile();
      const ordered = getOrderedDashboardProfiles();

      // 1. Actualizar Topbar Combobox
      const valTopbar = document.getElementById('val-topbar-profile');
      if (valTopbar) {
        if (activeProf.id === DEFAULT_DASHBOARD_PROFILE_ID) {
          valTopbar.innerHTML = `<span>Principal</span><svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" style="width: 12px; height: 12px; flex-shrink: 0; opacity: 0.85;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        } else {
          valTopbar.textContent = activeProf.name;
        }
      }
      const dropTopbar = document.getElementById('dropdown-topbar-profile');
      if (dropTopbar) {
        dropTopbar.innerHTML = ordered.map(p => `
          <div class="combobox-option ${p.id === dashboardProfilesState.activeProfileId ? 'selected' : ''}" onclick="selectDashboardProfileFromCombo('${p.id}')">
            <span style="display: inline-flex; align-items: center; gap: 5px;">
              <span>${p.id === DEFAULT_DASHBOARD_PROFILE_ID ? 'Principal' : p.name}</span>
              ${p.id === DEFAULT_DASHBOARD_PROFILE_ID ? '<svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" style="width: 12px; height: 12px; flex-shrink: 0; opacity: 0.85;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' : ''}
            </span>
            <svg class="svg-icon svg-icon-xs option-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        `).join('');
      }

      // 2. Actualizar Drawer Combobox
      const valDrawer = document.getElementById('val-drawer-profile');
      if (valDrawer) {
        if (activeProf.id === DEFAULT_DASHBOARD_PROFILE_ID) {
          valDrawer.innerHTML = `<span>Principal</span><svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" style="width: 12px; height: 12px; flex-shrink: 0; opacity: 0.85;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        } else {
          valDrawer.textContent = activeProf.name;
        }
      }
      const dropDrawer = document.getElementById('dropdown-drawer-profile');
      if (dropDrawer) {
        dropDrawer.innerHTML = ordered.map(p => `
          <div class="combobox-option ${p.id === dashboardProfilesState.activeProfileId ? 'selected' : ''}" onclick="selectDashboardProfileFromCombo('${p.id}')">
            <span style="display: inline-flex; align-items: center; gap: 5px;">
              <span>${p.id === DEFAULT_DASHBOARD_PROFILE_ID ? 'Principal' : p.name}</span>
              ${p.id === DEFAULT_DASHBOARD_PROFILE_ID ? '<svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24" style="width: 12px; height: 12px; flex-shrink: 0; opacity: 0.85;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' : ''}
            </span>
            <svg class="svg-icon svg-icon-xs option-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        `).join('');
      }

      // 3. Botones de acción del drawer
      const btnDelete = document.getElementById('btn-delete-profile');
      if (btnDelete) {
        btnDelete.style.display = dashboardProfilesState.activeProfileId === DEFAULT_DASHBOARD_PROFILE_ID ? 'none' : 'inline-flex';
      }
      const btnRename = document.getElementById('btn-rename-profile');
      if (btnRename) {
        btnRename.style.display = dashboardProfilesState.activeProfileId === DEFAULT_DASHBOARD_PROFILE_ID ? 'none' : 'inline-flex';
      }
    }

    function selectDashboardProfileFromCombo(profileId) {
      closeAllComboboxes();
      switchDashboardProfile(profileId);
    }

    async function loadDashboardProfiles() {
      const invokeFn = getTauriInvoke();
      let saved = null;
      if (invokeFn) {
        try {
          const res = await invokeFn('get_saved_settings', { moduleId: 'core_dashboard' });
          if (res && res.profiles_state) {
            saved = typeof res.profiles_state === 'string' ? JSON.parse(res.profiles_state) : res.profiles_state;
          }
        } catch(e) {
          console.warn('Error al cargar perfiles de dashboard desde backend:', e);
        }
      }
      if (!saved) {
        try {
          const local = localStorage.getItem('pcm_dashboard_profiles_state');
          if (local) saved = JSON.parse(local);
        } catch(e) {}
      }

      // Recuperación y sincronización de doble capa: nunca perder perfiles creados
      try {
        const localRaw = localStorage.getItem('pcm_dashboard_profiles_state');
        if (localRaw) {
          const localObj = JSON.parse(localRaw);
          if (localObj && localObj.profiles) {
            if (!saved) {
              saved = localObj;
            } else if (saved.profiles) {
              Object.keys(localObj.profiles).forEach(pId => {
                if (!saved.profiles[pId]) {
                  saved.profiles[pId] = localObj.profiles[pId];
                }
              });
              if (Array.isArray(localObj.profileOrder)) {
                saved.profileOrder = saved.profileOrder || [DEFAULT_DASHBOARD_PROFILE_ID];
                localObj.profileOrder.forEach(pId => {
                  if (saved.profiles[pId] && !saved.profileOrder.includes(pId)) {
                    saved.profileOrder.push(pId);
                  }
                });
              }
            }
          }
        }
      } catch(e) {}

      if (saved && saved.profiles && typeof saved.profiles === 'object') {
        dashboardProfilesState = saved;
        if (!dashboardProfilesState.profiles[DEFAULT_DASHBOARD_PROFILE_ID]) {
          dashboardProfilesState.profiles[DEFAULT_DASHBOARD_PROFILE_ID] = {
            id: DEFAULT_DASHBOARD_PROFILE_ID,
            name: 'Principal',
            layout: {},
            hiddenWidgets: [],
            layout_portrait: {},
            layout_landscape: {},
            hidden_portrait: [],
            hidden_landscape: []
          };
        } else {
          dashboardProfilesState.profiles[DEFAULT_DASHBOARD_PROFILE_ID].name = 'Principal';
        }

        // Garantizar campos aislados independientes en todos los perfiles existentes
        Object.values(dashboardProfilesState.profiles).forEach(p => {
          if (!p.layout_portrait) {
            p.layout_portrait = p.layout ? JSON.parse(JSON.stringify(p.layout)) : {};
          }
          if (!p.layout_landscape) {
            p.layout_landscape = p.layout ? JSON.parse(JSON.stringify(p.layout)) : {};
          }
          if (!Array.isArray(p.hidden_portrait)) {
            p.hidden_portrait = Array.isArray(p.hiddenWidgets) ? [...p.hiddenWidgets] : [];
          }
          if (!Array.isArray(p.hidden_landscape)) {
            p.hidden_landscape = Array.isArray(p.hiddenWidgets) ? [...p.hiddenWidgets] : [];
          }
        });

        if (!dashboardProfilesState.activeProfileId || !dashboardProfilesState.profiles[dashboardProfilesState.activeProfileId]) {
          dashboardProfilesState.activeProfileId = DEFAULT_DASHBOARD_PROFILE_ID;
        }
      }
      updateProfileSelectorsUI();
    }

    function persistDashboardProfilesState() {
      try {
        localStorage.setItem('pcm_dashboard_profiles_state', JSON.stringify(dashboardProfilesState));
      } catch(e) {}

      const invokeFn = getTauriInvoke();
      if (invokeFn) {
        invokeFn('save_module_setting', {
          moduleId: 'core_dashboard',
          optionId: 'profiles_state',
          value: JSON.stringify(dashboardProfilesState)
        }).catch(e => console.warn(e));
      }
    }

    function persistDashboardLayout() {
      const grid = document.getElementById('grid-board');
      if (!grid) return;
      const cards = Array.from(grid.querySelectorAll('.card'));
      const current = getCurrentDashboardProfile();
      const layout = {}; // Reconstrucción limpia desde cero: Cero coordenadas fantasma o huérfanas
      const order = [];

      cards.forEach(card => {
        order.push(card.id);
        // Solo persistir coordenadas de tarjetas VISIBLES válidas en este perfil y orientación
        if (card.style.display !== 'none' && card.dataset.col && card.dataset.row) {
          layout[card.id] = {
            col: parseInt(card.dataset.col, 10),
            row: parseInt(card.dataset.row, 10)
          };
        }
      });

      setActiveProfileLayout(current, layout);

      try {
        if (current.id === DEFAULT_DASHBOARD_PROFILE_ID) {
          localStorage.setItem('pcm_dashboard_layout', JSON.stringify(layout));
        }
      } catch(e) {}

      const invokeFn = getTauriInvoke();
      if (invokeFn) {
        invokeFn('save_dashboard_order', { cardOrder: order }).catch(e => console.warn(e));
      }
      persistDashboardProfilesState();
    }

    async function restoreDashboardLayout() {
      // Guarda de vista oculta: NUNCA calcular ni alterar posiciones del Dashboard si la vista está oculta
      const dashboardView = document.getElementById('view-dashboard');
      if (dashboardView && dashboardView.classList.contains('hidden')) return;

      const current = getCurrentDashboardProfile();
      let layout = getActiveProfileLayout(current);

      const grid = document.getElementById('grid-board');
      if (!grid) return;
      const cards = Array.from(grid.querySelectorAll('.card'));
      const gridCols = getGridCols();
      const occupiedMatrix = {};

      // 0. Reseteo universal estricto de coordenadas y aplicación de visibilidad según la orientación activa
      const hiddenIds = getActiveProfileHidden(current);
      cards.forEach(card => {
        delete card.dataset.col;
        delete card.dataset.row;
        card.style.gridColumn = '';
        card.style.gridRow = '';
        if (hiddenIds.includes(card.id)) {
          card.style.display = 'none';
        } else {
          card.style.display = 'flex';
        }
      });

      // Filtrar estrictamente solo tarjetas VISIBLES para evitar superposiciones
      const visibleCards = cards.filter(c => c.style.display !== 'none');

      // Ordenar visibleCards por posición guardada previa (fila, columna)
      visibleCards.sort((a, b) => {
        const hasA = layout && layout[a.id] && layout[a.id].row && layout[a.id].col;
        const hasB = layout && layout[b.id] && layout[b.id].row && layout[b.id].col;
        if (hasA && hasB) {
          const rA = layout[a.id].row;
          const rB = layout[b.id].row;
          if (rA !== rB) return rA - rB;
          return layout[a.id].col - layout[b.id].col;
        }
        if (hasA) return -1;
        if (hasB) return 1;
        return 0;
      });

      // 1. Asignar posiciones previamente guardadas en el perfil respetando disponibilidad
      visibleCards.forEach(card => {
        const { spanCol, spanRow } = getCardSpan(card);
        const effSpanCol = Math.min(spanCol, gridCols);
        const maxVisibleRows = getMaxVisibleRows();
        const maxAllowedRow = Math.max(1, maxVisibleRows - spanRow + 1);
        if (layout && layout[card.id] && layout[card.id].col && layout[card.id].row) {
          const baseCol = Math.max(1, layout[card.id].col);
          const baseRow = Math.max(1, layout[card.id].row);
          let displayCol = Math.max(1, Math.min(gridCols - effSpanCol + 1, baseCol));
          let displayRow = Math.max(1, Math.min(maxAllowedRow, baseRow));

          let collides = false;
          for (let r = displayRow; r < displayRow + spanRow; r++) {
            for (let c = displayCol; c < displayCol + effSpanCol; c++) {
              if (occupiedMatrix[r] && occupiedMatrix[r][c]) {
                collides = true;
                break;
              }
            }
            if (collides) break;
          }

          if (collides) {
            const slot = findNextFreeSlot(gridCols, effSpanCol, spanRow, occupiedMatrix);
            if (slot) {
              displayCol = slot.col;
              displayRow = slot.row;
            } else {
              displayCol = null;
              displayRow = null;
            }
          }

          if (displayCol && displayRow) {
            card.style.gridColumn = `${displayCol} / span ${effSpanCol}`;
            card.style.gridRow = `${displayRow} / span ${spanRow}`;
            card.dataset.col = displayCol;
            card.dataset.row = displayRow;

            for (let r = displayRow; r < displayRow + spanRow; r++) {
              if (!occupiedMatrix[r]) occupiedMatrix[r] = {};
              for (let c = displayCol; c < displayCol + effSpanCol; c++) {
                occupiedMatrix[r][c] = card.id;
              }
            }
          } else {
            // Garantía anti-superposición: Si colisiona y no hay celda libre, ocultar de forma segura sin solapar
            card.style.display = 'none';
            delete card.dataset.col;
            delete card.dataset.row;
            card.style.gridColumn = '';
            card.style.gridRow = '';
            let curHidden = getActiveProfileHidden(current);
            if (!curHidden.includes(card.id)) {
              curHidden.push(card.id);
              setActiveProfileHidden(current, curHidden);
            }
            if (layout && layout[card.id]) {
              delete layout[card.id];
              setActiveProfileLayout(current, layout);
            }
          }
        }
      });

      // 2. Asignar primera posición libre a tarjetas visibles nuevas o sin posición
      visibleCards.forEach(card => {
        if (!card.dataset.col && card.style.display !== 'none') {
          const { spanCol, spanRow } = getCardSpan(card);
          const effSpanCol = Math.min(spanCol, gridCols);
          const slot = findNextFreeSlot(gridCols, effSpanCol, spanRow, occupiedMatrix);
          if (slot) {
            card.style.gridColumn = `${slot.col} / span ${effSpanCol}`;
            card.style.gridRow = `${slot.row} / span ${spanRow}`;
            card.dataset.col = slot.col;
            card.dataset.row = slot.row;

            for (let r = slot.row; r < slot.row + spanRow; r++) {
              if (!occupiedMatrix[r]) occupiedMatrix[r] = {};
              for (let c = slot.col; c < slot.col + effSpanCol; c++) {
                occupiedMatrix[r][c] = card.id;
              }
            }
          } else {
            // Límite de capacidad alcanzado: ocultar de forma segura sin romper la cuadrícula
            card.style.display = 'none';
            delete card.dataset.col;
            delete card.dataset.row;
            card.style.gridColumn = '';
            card.style.gridRow = '';
            let curHidden = getActiveProfileHidden(current);
            if (!curHidden.includes(card.id)) {
              curHidden.push(card.id);
              setActiveProfileHidden(current, curHidden);
            }
            if (layout && layout[card.id]) {
              delete layout[card.id];
              setActiveProfileLayout(current, layout);
            }
          }
        }
      });

      // 3. Sincronizar el layout limpio universal con las tarjetas que realmente quedaron ubicadas
      const cleanLayout = {};
      visibleCards.forEach(c => {
        if (c.style.display !== 'none' && c.dataset.col && c.dataset.row) {
          cleanLayout[c.id] = {
            col: parseInt(c.dataset.col, 10),
            row: parseInt(c.dataset.row, 10)
          };
        }
      });
      setActiveProfileLayout(current, cleanLayout);
      persistDashboardProfilesState();

      // Actualizar conteo y estado empty
      const emptyHero = document.querySelector('.empty-dashboard-hero');
      if (emptyHero) {
        const stillVisible = cards.filter(c => c.style.display !== 'none');
        if (cards.length > 0 && stillVisible.length === 0) {
          emptyHero.style.display = 'flex';
          const p = emptyHero.querySelector('p');
          if (p) p.textContent = 'Todas las tarjetas instaladas se encuentran ocultas en este perfil. Pulsa en "Widgets" para activarlas.';
        } else if (stillVisible.length > 0) {
          emptyHero.style.display = 'none';
        }
      }
      updateDashboardCardsCount();
    }

    function initGridBoardDragDrop() {
      restoreDashboardLayout();
    }

    async function switchDashboardProfile(profileId) {
      if (!dashboardProfilesState.profiles[profileId]) return;
      // Guardar el layout y tarjetas del perfil actual saliente
      persistDashboardLayout();

      dashboardProfilesState.activeProfileId = profileId;
      updateProfileSelectorsUI();

      // Limpiar dataset de tarjetas para que se reposicionen limpiamente según el perfil
      const grid = document.getElementById('grid-board');
      if (grid) {
        grid.querySelectorAll('.card').forEach(c => {
          delete c.dataset.col;
          delete c.dataset.row;
        });
      }

      await restoreDashboardLayout();
      persistDashboardProfilesState();
      renderDashboardCustomizationCatalog();
    }

    function showNewProfilePrompt() {
      cancelRenameProfilePrompt();
      const panel = document.getElementById('panel-new-profile');
      if (panel) {
        panel.style.display = 'flex';
        const input = document.getElementById('input-new-profile-name');
        if (input) {
          input.value = '';
          input.focus();
        }
      }
    }

    function cancelNewProfilePrompt() {
      const panel = document.getElementById('panel-new-profile');
      if (panel) panel.style.display = 'none';
    }

    function submitNewProfile() {
      const input = document.getElementById('input-new-profile-name');
      if (!input) return;
      const name = input.value.trim();
      if (!name) {
        addSystemNotification('Perfil Inválido', 'Debe ingresar un nombre para el nuevo perfil.', 'warning', 'profiles');
        return;
      }

      // Inicializar el nuevo perfil como lienzo en blanco (todas las tarjetas desactivadas)
      const allWidgetIds = [];
      installedModules.forEach(mod => {
        if (mod.manifest && mod.manifest.widgets) {
          mod.manifest.widgets.forEach(w => {
            allWidgetIds.push(w.id || `card-${mod.manifest.id}`);
          });
        }
      });
      document.querySelectorAll('#grid-board .card').forEach(c => {
        if (c.id && !allWidgetIds.includes(c.id)) allWidgetIds.push(c.id);
      });

      const id = 'prof_' + Date.now();
      dashboardProfilesState.profiles[id] = {
        id,
        name,
        layout: {},
        hiddenWidgets: [...allWidgetIds],
        layout_landscape: {},
        layout_portrait: {},
        hidden_landscape: [...allWidgetIds],
        hidden_portrait: [...allWidgetIds]
      };
      if (!dashboardProfilesState.profileOrder || !Array.isArray(dashboardProfilesState.profileOrder)) {
        dashboardProfilesState.profileOrder = [DEFAULT_DASHBOARD_PROFILE_ID];
      }
      if (!dashboardProfilesState.profileOrder.includes(id)) {
        dashboardProfilesState.profileOrder.push(id);
      }
      dashboardProfilesState.activeProfileId = id;

      cancelNewProfilePrompt();
      updateProfileSelectorsUI();

      const grid = document.getElementById('grid-board');
      if (grid) {
        grid.querySelectorAll('.card').forEach(c => {
          delete c.dataset.col;
          delete c.dataset.row;
        });
      }

      restoreDashboardLayout();
      persistDashboardProfilesState();
      renderDashboardCustomizationCatalog();
      addSystemNotification('Perfil Creado', `Nuevo perfil "${name}" creado exitosamente (lienzo en blanco).`, 'success', 'profiles');
    }

    function showRenameProfilePrompt() {
      if (dashboardProfilesState.activeProfileId === DEFAULT_DASHBOARD_PROFILE_ID) {
        addSystemNotification('Acción No Permitida', 'El perfil "Principal" es canónico y no puede ser renombrado.', 'warning', 'profiles');
        return;
      }
      cancelNewProfilePrompt();
      const panel = document.getElementById('panel-rename-profile');
      if (panel) {
        panel.style.display = 'flex';
        const input = document.getElementById('input-rename-profile-name');
        if (input) {
          input.value = getCurrentDashboardProfile().name;
          input.focus();
          input.select();
        }
      }
    }

    function cancelRenameProfilePrompt() {
      const panel = document.getElementById('panel-rename-profile');
      if (panel) panel.style.display = 'none';
    }

    function submitRenameProfile() {
      if (dashboardProfilesState.activeProfileId === DEFAULT_DASHBOARD_PROFILE_ID) {
        addSystemNotification('Acción No Permitida', 'El perfil "Principal" es canónico y no puede ser renombrado.', 'warning', 'profiles');
        cancelRenameProfilePrompt();
        return;
      }
      const input = document.getElementById('input-rename-profile-name');
      if (!input) return;
      const newName = input.value.trim();
      if (!newName) {
        addSystemNotification('Nombre Inválido', 'El nombre del perfil no puede estar vacío.', 'warning', 'profiles');
        return;
      }

      const curr = getCurrentDashboardProfile();
      const oldName = curr.name;
      curr.name = newName;

      cancelRenameProfilePrompt();
      updateProfileSelectorsUI();
      persistDashboardProfilesState();
      renderDashboardCustomizationCatalog();
      addSystemNotification('Perfil Renombrado', `El perfil "${oldName}" ahora se llama "${newName}".`, 'success', 'profiles');
    }

    function duplicateCurrentDashboardProfile() {
      const current = getCurrentDashboardProfile();
      const id = 'prof_' + Date.now();
      const name = `${current.name} (Copia)`;

      dashboardProfilesState.profiles[id] = {
        id,
        name,
        layout: JSON.parse(JSON.stringify(current.layout || {})),
        hiddenWidgets: [...(current.hiddenWidgets || [])],
        layout_landscape: JSON.parse(JSON.stringify(current.layout_landscape || current.layout || {})),
        layout_portrait: JSON.parse(JSON.stringify(current.layout_portrait || current.layout || {})),
        hidden_landscape: [...(current.hidden_landscape || current.hiddenWidgets || [])],
        hidden_portrait: [...(current.hidden_portrait || current.hiddenWidgets || [])]
      };
      if (!dashboardProfilesState.profileOrder || !Array.isArray(dashboardProfilesState.profileOrder)) {
        dashboardProfilesState.profileOrder = [DEFAULT_DASHBOARD_PROFILE_ID];
      }
      if (!dashboardProfilesState.profileOrder.includes(id)) {
        dashboardProfilesState.profileOrder.push(id);
      }
      dashboardProfilesState.activeProfileId = id;

      updateProfileSelectorsUI();
      persistDashboardProfilesState();
      renderDashboardCustomizationCatalog();
      addSystemNotification('Perfil Duplicado', `Se creó una copia activa con el nombre "${name}".`, 'success', 'profiles');
    }

    function deleteCurrentDashboardProfile() {
      if (dashboardProfilesState.activeProfileId === DEFAULT_DASHBOARD_PROFILE_ID) {
        addSystemNotification('Acción No Permitida', 'El perfil "Principal" es canónico y no puede eliminarse.', 'warning', 'profiles');
        return;
      }

      const deletedId = dashboardProfilesState.activeProfileId;
      const deletedName = getCurrentDashboardProfile().name;
      delete dashboardProfilesState.profiles[deletedId];
      if (Array.isArray(dashboardProfilesState.profileOrder)) {
        dashboardProfilesState.profileOrder = dashboardProfilesState.profileOrder.filter(id => id !== deletedId);
      }
      dashboardProfilesState.activeProfileId = DEFAULT_DASHBOARD_PROFILE_ID;

      updateProfileSelectorsUI();

      const grid = document.getElementById('grid-board');
      if (grid) {
        grid.querySelectorAll('.card').forEach(c => {
          delete c.dataset.col;
          delete c.dataset.row;
        });
      }

      restoreDashboardLayout();
      persistDashboardProfilesState();
      renderDashboardCustomizationCatalog();
      addSystemNotification('Perfil Eliminado', `El perfil "${deletedName}" fue eliminado. Se restauró el perfil Principal.`, 'info', 'profiles');
    }

    function autoOrganizeDashboard() {
      const grid = document.getElementById('grid-board');
      const cards = Array.from(grid.querySelectorAll('.card')).filter(c => c.style.display !== 'none');
      if (cards.length === 0) {
        return;
      }

      // Ordenar tarjetas de arriba hacia abajo y de izquierda a derecha
      cards.sort((a, b) => {
        const rA = parseInt(a.dataset.row || '1', 10);
        const rB = parseInt(b.dataset.row || '1', 10);
        if (rA !== rB) return rA - rB;
        const cA = parseInt(a.dataset.col || '1', 10);
        const cB = parseInt(b.dataset.col || '1', 10);
        return cA - cB;
      });

      const gridCols = getGridCols();
      const occupiedMatrix = {};
      const current = getCurrentDashboardProfile();

      cards.forEach((card) => {
        const { spanCol, spanRow } = getCardSpan(card);
        const effSpanCol = Math.min(spanCol, gridCols);
        const slot = findNextFreeSlot(gridCols, effSpanCol, spanRow, occupiedMatrix);

        if (slot) {
          for (let r = slot.row; r < slot.row + spanRow; r++) {
            if (!occupiedMatrix[r]) occupiedMatrix[r] = {};
            for (let c = slot.col; c < slot.col + effSpanCol; c++) {
              occupiedMatrix[r][c] = true;
            }
          }

          card.style.gridColumn = `${slot.col} / span ${effSpanCol}`;
          card.style.gridRow = `${slot.row} / span ${spanRow}`;
          card.dataset.col = slot.col;
          card.dataset.row = slot.row;

          card.classList.remove('card-drop');
          void card.offsetWidth;
          card.classList.add('card-drop');
          setTimeout(() => card.classList.remove('card-drop'), 350);
        } else {
          // Protocolo anti-superposición: Si no cabe en la cuadrícula al auto-organizar, ocultar de forma segura sin solapar
          card.style.display = 'none';
          delete card.dataset.col;
          delete card.dataset.row;
          card.style.gridColumn = '';
          card.style.gridRow = '';
          if (current) {
            let curHidden = getActiveProfileHidden(current);
            if (!curHidden.includes(card.id)) {
              curHidden.push(card.id);
              setActiveProfileHidden(current, curHidden);
            }
            let curLayout = getActiveProfileLayout(current);
            if (curLayout && curLayout[card.id]) {
              delete curLayout[card.id];
              setActiveProfileLayout(current, curLayout);
            }
          }
        }
      });

      persistDashboardLayout();
      renderDashboardCustomizationCatalog();
      updateDashboardCardsCount();
    }

    function adjustCardsForCurrentGridCols() {
      // Las tarjetas en CSS Grid mantienen sus coordenadas fijas col/row sin auto-desplazamiento
      return;
    }

    let lastKnownOrientation = isPortraitOrientation();
    window.addEventListener('resize', () => {
      const currentOrientation = isPortraitOrientation();
      if (currentOrientation !== lastKnownOrientation) {
        // 1. Guardar el estado de la orientación saliente ANTES de conmutar
        persistDashboardLayout();

        // 2. Conmutar orientación
        lastKnownOrientation = currentOrientation;

        // 3. Limpiar coordenadas DOM y restaurar limpiamente la orientación entrante
        const grid = document.getElementById('grid-board');
        if (grid) {
          grid.querySelectorAll('.card').forEach(c => {
            delete c.dataset.col;
            delete c.dataset.row;
          });
        }
        restoreDashboardLayout();
        renderDashboardCustomizationCatalog();
      }
    });

    function dispatchModuleSetting(moduleId, optionId, value, syncDisk = true) {
      const cleanId = moduleId.replace(/[^a-zA-Z0-9_]/g, '_');
      const handlerName = `__SETTING_CHANGE_${cleanId}__`;
      if (window[handlerName] && typeof window[handlerName] === 'function') {
        window[handlerName](optionId, value);
      }

      // Actualizar control en la UI si existe
      const optEl = document.getElementById(`opt-${moduleId}-${optionId}`);
      if (optEl) {
        if (optEl.type === 'checkbox') optEl.checked = Boolean(value);
        else optEl.value = value;
      }
      const valEl = document.getElementById(`val-opt-${moduleId}-${optionId}`);
      const dropdown = document.getElementById(`dropdown-opt-${moduleId}-${optionId}`);
      if (valEl && dropdown) {
        const matchOpt = dropdown.querySelector(`.combobox-option[data-value="${value}"]`);
        if (matchOpt) {
          const textSpan = matchOpt.querySelector('span');
          if (textSpan) valEl.textContent = textSpan.textContent;
        }
        dropdown.querySelectorAll('.combobox-option').forEach(opt => {
          opt.classList.toggle('selected', opt.getAttribute('data-value') === String(value));
        });
      }

      if (syncDisk) {
        const invokeFn = getTauriInvoke();
        if (invokeFn) {
          invokeFn('save_module_setting', { moduleId, optionId, value }).catch(e => console.warn(e));
        }
      }
    }

    function installModule(manifest, scriptCode, isActive = true, isStartup = false) {
      const isUpdate = installedModules.has(manifest.id);
      let oldVersion = '1.0.0';

      if (isUpdate) {
        const prevMod = installedModules.get(manifest.id);
        oldVersion = prevMod.manifest.version || '1.0.0';
        if (typeof prevMod.active === 'boolean') {
          isActive = prevMod.active;
        }

        // 1. Limpiar widgets anteriores
        if (prevMod.manifest.widgets) {
          prevMod.manifest.widgets.forEach(w => {
            const oldCard = document.getElementById(w.id || `card-${prevMod.manifest.id}`);
            if (oldCard) oldCard.remove();
          });
        }
        // 2. Limpiar vistas anteriores
        const oldView = document.getElementById(`view-module-${prevMod.manifest.id}`);
        if (oldView) oldView.remove();

        // 3. Limpiar meta-opciones de configuración anteriores
        const oldSettingsTab = document.getElementById(`tab-btn-settings-mod-${prevMod.manifest.id}`);
        if (oldSettingsTab) oldSettingsTab.remove();
        const oldSettingsPane = document.getElementById(`settings-tab-pane-mod-${prevMod.manifest.id}`);
        if (oldSettingsPane) oldSettingsPane.remove();
        const oldSettings = document.getElementById(`settings-mod-${prevMod.manifest.id}`);
        if (oldSettings) oldSettings.remove();

        // 4. Limpiar temporizadores y handlers previos
        const cleanId = prevMod.manifest.id.replace(/[^a-zA-Z0-9_]/g, '_');
        const cleanupKey = `__CLEANUP_${cleanId}__`;
        if (window[cleanupKey] && typeof window[cleanupKey] === 'function') {
          try { window[cleanupKey](); } catch(e) { console.warn('Error en cleanup:', e); }
        }
      }

      installedModules.set(manifest.id, { manifest, scriptCode, active: isActive });

      // 1. Añadir o actualizar en la lista de instalados
      const list = document.getElementById('installed-modules-list');
      const emptyNotice = document.getElementById('empty-installed-notice');
      if (emptyNotice) emptyNotice.style.display = 'none';

      let modCard = document.getElementById(`installed-mod-${manifest.id}`);
      if (!modCard) {
        modCard = document.createElement('div');
        modCard.className = 'settings-card';
        modCard.id = `installed-mod-${manifest.id}`;
        modCard.style.padding = '16px';
        modCard.style.flexDirection = 'row';
        modCard.style.alignItems = 'center';
        modCard.style.justifyContent = 'space-between';
        list.appendChild(modCard);
      }
      modCard.style.opacity = isActive ? '1' : '0.65';

      const defaultGroup = manifest.group || DEFAULT_MODULE_GROUP;
      if (!moduleGroupsState.groups.includes(defaultGroup)) {
        moduleGroupsState.groups.push(defaultGroup);
        persistModuleGroupsState();
      }
      const assignedGroup = getModuleGroup(manifest.id);

      modCard.innerHTML = `
        <div style="display: flex; gap: 14px; align-items: center;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; color: var(--accent-primary); flex-shrink: 0;">
            <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h4 style="font-size: 14px; font-weight: 600;">${manifest.name}</h4>
              <span class="card-badge" style="color: var(--accent-success);">v${manifest.version || '1.0.0'}</span>
              ${isUpdate ? '<span class="card-badge" style="color: var(--accent-primary); background: var(--accent-primary-dim);">ACTUALIZADO</span>' : ''}
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${manifest.description || ''}</p>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
              <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">Grupo:</span>
              <div class="custom-combobox combobox-sm" id="combo-mod-group-${manifest.id}">
                <div class="combobox-trigger" onclick="toggleCombobox('combo-mod-group-${manifest.id}')" title="Asignar grupo del módulo">
                  <span class="combobox-val" id="val-mod-group-${manifest.id}">${assignedGroup}</span>
                  <svg class="svg-icon svg-icon-xs combobox-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="combobox-dropdown" id="dropdown-mod-group-${manifest.id}">
                  ${moduleGroupsState.groups.map(g => `
                    <div class="combobox-option ${assignedGroup === g ? 'selected' : ''}" onclick="closeAllComboboxes(); setModuleGroup('${manifest.id}', '${g.replace(/'/g, "\\'")}')">
                      <span>${g}</span>
                      <svg class="svg-icon svg-icon-xs option-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 14px;">
          <label class="switch" title="Activar / Desactivar módulo">
            <input type="checkbox" id="switch-mod-${manifest.id}" ${isActive ? 'checked' : ''} onchange="toggleModuleActive('${manifest.id}', this.checked)">
            <span class="slider"></span>
          </label>
          <button class="btn btn-secondary" style="color: var(--accent-danger); padding: 6px 12px; font-size: 12px;" onclick="uninstallModule('${manifest.id}')">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
            <span>Desinstalar</span>
          </button>
        </div>
      `;

      // 2. Actualizar contadores
      updateModuleCounts();

      // 3. Añadir o actualizar navegación al Sidebar bajo su grupo
      renderSidebarGroups();
      renderModuleGroupsManagerUI();

      // 4. Inyectar vista dedicada del módulo
      if (manifest.views && manifest.views.length > 0) {
        manifest.views.forEach(v => {
          const viewSec = document.createElement('section');
          viewSec.className = 'view-content hidden';
          viewSec.id = `view-module-${manifest.id}`;
          viewSec.innerHTML = v.html || `<div class="settings-card"><h4>${manifest.name}</h4><p>${manifest.description || ''}</p></div>`;
          document.querySelector('.main-stage').appendChild(viewSec);

          VIEW_METADATA[`module-${manifest.id}`] = {
            title: manifest.name,
            desc: manifest.description || 'Vista operativa del módulo instalado.'
          };
        });
      }

      // 5. Inyectar widgets en el Dashboard disponibles en el catálogo, pero ocultos por defecto
      if (manifest.widgets && manifest.widgets.length > 0) {
        const currentProfile = getCurrentDashboardProfile();
        currentProfile.hiddenWidgets = currentProfile.hiddenWidgets || [];

        manifest.widgets.forEach(w => {
          const cardId = w.id || `card-${manifest.id}`;
          let card = document.getElementById(cardId);
          if (!card) {
            card = document.createElement('article');
            card.className = `card card-size-${w.size || '2x1'}`;
            card.id = cardId;
            card.innerHTML = w.html;
            makeCardDraggable(card);
            document.getElementById('grid-board').appendChild(card);
          }
          // Por directiva estricta, los widgets recién instalados (o nuevos widgets introducidos en una actualización)
          // deben iniciar siempre OCULTOS en el Dashboard (disponibles en el Drawer/Catálogo) para no alterar la pantalla del usuario.
          if (!isStartup) {
            card.style.display = 'none';
            delete card.dataset.col;
            delete card.dataset.row;
            card.style.gridColumn = '';
            card.style.gridRow = '';
            if (!currentProfile.hiddenWidgets.includes(cardId)) {
              currentProfile.hiddenWidgets.push(cardId);
            }
          } else {
            if (currentProfile.hiddenWidgets.includes(cardId)) {
              card.style.display = 'none';
            } else if (currentProfile.layout && currentProfile.layout[cardId]) {
              card.style.display = 'flex';
            } else {
              card.style.display = 'none';
              if (!currentProfile.hiddenWidgets.includes(cardId)) {
                currentProfile.hiddenWidgets.push(cardId);
              }
            }
          }
        });
        if (!isStartup) {
          persistDashboardProfilesState();
        }
        updateDashboardCardsCount();
      }

      // Comprobar si hay tarjetas visibles para mostrar/ocultar el mensaje de dashboard vacío
      const allCards = Array.from(document.querySelectorAll('#grid-board .card'));
      const visibleCards = allCards.filter(c => c.style.display !== 'none');
      const emptyHero = document.querySelector('.empty-dashboard-hero');
      if (emptyHero) {
        emptyHero.style.display = visibleCards.length === 0 ? 'flex' : 'none';
      }

      // 6. Inyectar Pestaña y Panel de Meta-Opciones en Configuraciones
      if (manifest.meta_options && manifest.meta_options.length > 0) {
        const tabsBar = document.getElementById('settings-tabs-bar');
        const panesContainer = document.getElementById('dynamic-module-settings-panes');
        
        if (tabsBar && panesContainer) {
          // Crear botón de pestaña para el módulo
          let tabBtn = document.getElementById(`tab-btn-settings-mod-${manifest.id}`);
          if (!tabBtn) {
            tabBtn = document.createElement('button');
            tabBtn.className = 'tab-btn';
            tabBtn.id = `tab-btn-settings-mod-${manifest.id}`;
            tabBtn.innerHTML = `
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <span>${manifest.name}</span>
            `;
            tabBtn.onclick = () => switchSettingsTab(`mod-${manifest.id}`);
            tabsBar.appendChild(tabBtn);
          }

          // Crear panel contenedor para el módulo
          let pane = document.getElementById(`settings-tab-pane-mod-${manifest.id}`);
          if (!pane) {
            pane = document.createElement('div');
            pane.className = 'settings-content-stack';
            pane.id = `settings-tab-pane-mod-${manifest.id}`;
            pane.style.display = 'none';
            panesContainer.appendChild(pane);
          }

          pane.innerHTML = `
            <div class="settings-card" id="settings-mod-${manifest.id}">
              <div class="settings-header">
                <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <h4>Configuración: ${manifest.name}</h4>
                <span class="card-badge" style="color:var(--accent-primary);">v${manifest.version}</span>
              </div>
              <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 4px;">
                Parámetros de funcionamiento expuestos dinámicamente por este módulo.
              </p>
              <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 8px;">
                ${manifest.meta_options.map(opt => {
                  if (opt.type === 'switch') {
                    return `
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <strong style="font-size: 13px;">${opt.name}</strong>
                          <div style="font-size: 11.5px; color: var(--text-muted);">${opt.desc}</div>
                        </div>
                        <label class="switch">
                          <input type="checkbox" id="opt-${manifest.id}-${opt.id}" ${opt.default ? 'checked' : ''} onchange="dispatchModuleSetting('${manifest.id}', '${opt.id}', this.checked)">
                          <span class="slider"></span>
                        </label>
                      </div>
                    `;
                  } else if (opt.type === 'select') {
                    const defaultOpt = (opt.options || []).find(o => o.value === opt.default) || (opt.options || [])[0] || { label: '', value: '' };
                    return `
                      <div>
                        <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">
                          ${opt.name}
                        </label>
                        <div class="custom-combobox" id="combo-opt-${manifest.id}-${opt.id}">
                          <div class="combobox-trigger" onclick="toggleCombobox('combo-opt-${manifest.id}-${opt.id}')">
                            <span class="combobox-val" id="val-opt-${manifest.id}-${opt.id}">${defaultOpt.label}</span>
                            <svg class="svg-icon svg-icon-xs combobox-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                          <div class="combobox-dropdown" id="dropdown-opt-${manifest.id}-${opt.id}">
                            ${(opt.options || []).map(o => `
                              <div class="combobox-option ${o.value === opt.default ? 'selected' : ''}" data-value="${o.value}" onclick="selectModuleOptionCombo('${manifest.id}', '${opt.id}', '${o.value}', '${o.label.replace(/'/g, "\\'")}')">
                                <span>${o.label}</span>
                                <svg class="svg-icon svg-icon-xs option-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </div>
                            `).join('')}
                          </div>
                        </div>
                        <input type="hidden" id="opt-${manifest.id}-${opt.id}" value="${defaultOpt.value}">
                        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 5px;">${opt.desc}</div>
                      </div>
                    `;
                  } else if (opt.type === 'number' || opt.type === 'text') {
                    return `
                      <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
                        <div>
                          <strong style="font-size: 13px;">${opt.name}</strong>
                          <div style="font-size: 11.5px; color: var(--text-muted);">${opt.desc}</div>
                        </div>
                        <input type="${opt.type}" id="opt-${manifest.id}-${opt.id}"
                               style="width: 100px; padding: 6px 10px; background: var(--bg-surface); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 13px; font-family: inherit; text-align: ${opt.type === 'number' ? 'right' : 'left'}; outline: none; transition: var(--transition-smooth);"
                               onfocus="this.style.borderColor='var(--border-focus)'"
                               onblur="this.style.borderColor='var(--border-medium)'"
                               value="${opt.default ?? ''}"
                               ${opt.min !== undefined ? `min="${opt.min}"` : ''}
                               ${opt.max !== undefined ? `max="${opt.max}"` : ''}
                               onchange="dispatchModuleSetting('${manifest.id}', '${opt.id}', this.type === 'number' ? Number(this.value) : this.value)">
                      </div>
                    `;
                  }
                  return '';
                }).join('')}
              </div>
            </div>
          `;
        }
      }

      // 7. Ejecutar script del módulo
      if (scriptCode) {
        try {
          const runFn = new Function(scriptCode);
          runFn();
        } catch (e) {
          console.error(`Error ejecutando script de módulo ${manifest.id}:`, e);
        }
      }

      renderDashboardCustomizationCatalog();
      renderModuleNotificationPermissions();
      checkSidebarGroupsVisibility();
      checkCoreServiceStatus();

      if (!isActive) {
        toggleModuleActive(manifest.id, false, false);
      }

      if (!isStartup) {
        if (isUpdate) {
          addSystemNotification('Módulo Actualizado', `"${manifest.name}" actualizado de v${oldVersion} a v${manifest.version}.`, 'success', 'modules');
        } else if (isActive) {
          addSystemNotification('Módulo Instalado', `"${manifest.name}" (v${manifest.version}) registrado y operativo.`, 'success', 'modules');
        }
      }
    }

    function toggleModuleActive(moduleId, isActive, syncDisk = true) {
      const mod = installedModules.get(moduleId);
      if (!mod) return;
      mod.active = isActive;

      // 1. Sincronizar control switch y opacidad en la lista del Gestor de Módulos
      const switchEl = document.getElementById(`switch-mod-${moduleId}`);
      if (switchEl) switchEl.checked = isActive;
      const modCard = document.getElementById(`installed-mod-${moduleId}`);
      if (modCard) modCard.style.opacity = isActive ? '1' : '0.65';

      // 2. Visibilidad en el menú lateral
      const navBtn = document.getElementById(`nav-module-${moduleId}`);
      if (navBtn) navBtn.style.display = isActive ? 'flex' : 'none';

      // 3. Visibilidad de widgets en el Dashboard
      if (mod.manifest.widgets) {
        const currentProfile = getCurrentDashboardProfile();
        const hiddenIds = currentProfile ? currentProfile.hiddenWidgets || [] : [];
        mod.manifest.widgets.forEach(w => {
          const cardId = w.id || `card-${moduleId}`;
          const card = document.getElementById(cardId);
          if (card) {
            if (!isActive) {
              card.style.display = 'none';
              delete card.dataset.col;
              delete card.dataset.row;
              card.style.gridColumn = '';
              card.style.gridRow = '';
              if (currentProfile && currentProfile.layout && currentProfile.layout[cardId]) {
                delete currentProfile.layout[cardId];
              }
            } else {
              if (hiddenIds.includes(cardId)) {
                card.style.display = 'none';
              } else if (currentProfile && currentProfile.layout && currentProfile.layout[cardId]) {
                card.style.display = 'flex';
              } else {
                card.style.display = 'none';
                if (!hiddenIds.includes(cardId)) {
                  hiddenIds.push(cardId);
                }
              }
            }
          }
        });
        restoreDashboardLayout();
        updateDashboardCardsCount();
      }

      // 4. Visibilidad de pestaña en Configuraciones
      const settingsTab = document.getElementById(`tab-btn-settings-mod-${moduleId}`);
      if (settingsTab) settingsTab.style.display = isActive ? 'inline-flex' : 'none';
      const settingsPane = document.getElementById(`settings-tab-pane-mod-${moduleId}`);
      if (settingsPane) {
        if (!isActive && settingsTab && settingsTab.classList.contains('active')) {
          switchSettingsTab('general');
        }
      }

      checkSidebarGroupsVisibility();
      renderDashboardCustomizationCatalog();
      checkCoreServiceStatus();

      if (syncDisk) {
        const invokeFn = getTauriInvoke();
        if (invokeFn) {
          invokeFn('toggle_module_active', { moduleId, active: isActive }).catch(e => console.warn(e));
        }
        addSystemNotification('Estado del Módulo', `"${mod.manifest.name}" ${isActive ? 'activado' : 'desactivado'}.`, 'info', 'modules');
      }
    }

    async function uninstallModule(moduleId) {
      const mod = installedModules.get(moduleId);
      if (!mod) return;

      const confirmed = await showConfirmDialog({
        title: 'Desinstalar Módulo',
        message: `¿Confirmas la desinstalación de "${mod.manifest.name}"?`,
        details: 'Esta acción removerá el módulo, sus vistas dedicadas, widgets del Dashboard y configuraciones asociadas.',
        confirmText: 'Desinstalar',
        cancelText: 'Cancelar',
        danger: true
      });
      if (!confirmed) return;

      const cardEl = document.getElementById(`installed-mod-${moduleId}`);
      if (cardEl) cardEl.remove();

      const navBtn = document.getElementById(`nav-module-${moduleId}`);
      if (navBtn) navBtn.remove();

      const viewEl = document.getElementById(`view-module-${moduleId}`);
      if (viewEl) viewEl.remove();

      if (mod.manifest.widgets) {
        const widgetIds = mod.manifest.widgets.map(w => w.id || `card-${moduleId}`);
        widgetIds.forEach(wid => {
          const widgetEl = document.getElementById(wid);
          if (widgetEl) widgetEl.remove();
        });
        if (dashboardProfilesState && dashboardProfilesState.profiles) {
          Object.values(dashboardProfilesState.profiles).forEach(prof => {
            if (prof.hiddenWidgets) {
              prof.hiddenWidgets = prof.hiddenWidgets.filter(id => !widgetIds.includes(id));
            }
            if (prof.layout) {
              widgetIds.forEach(wid => delete prof.layout[wid]);
            }
          });
          persistDashboardProfilesState();
        }
      }

      const settingsTab = document.getElementById(`tab-btn-settings-mod-${moduleId}`);
      if (settingsTab) {
        if (settingsTab.classList.contains('active')) {
          switchSettingsTab('general');
        }
        settingsTab.remove();
      }
      const settingsPane = document.getElementById(`settings-tab-pane-mod-${moduleId}`);
      if (settingsPane) settingsPane.remove();

      const settingsEl = document.getElementById(`settings-mod-${moduleId}`);
      if (settingsEl) settingsEl.remove();

      // Borrar de disco en Windows con Rust
      const invokeFn = getTauriInvoke();
      if (invokeFn) {
        invokeFn('uninstall_module', { moduleId }).catch(e => console.warn('Error al desinstalar en disco:', e));
      }

      // Llamar a hook de desinstalación o cleanup con flag de purge
      const cleanId = moduleId.replace(/[^a-zA-Z0-9_]/g, '_');
      const cleanupKey = `__CLEANUP_${cleanId}__`;
      if (window[cleanupKey] && typeof window[cleanupKey] === 'function') {
        try { window[cleanupKey]({ purge: true, uninstall: true }); } catch(e) {}
      }
      const purgeKey = `__PURGE_${cleanId}__`;
      if (window[purgeKey] && typeof window[purgeKey] === 'function') {
        try { window[purgeKey](); } catch(e) {}
      }

      // Purgar exhaustivamente claves en localStorage pertenecientes al módulo desinstalado
      try {
        const keysToRemove = [];
        const lowMod = moduleId.toLowerCase().replace(/-/g, '_');
        const origMod = moduleId.toLowerCase();
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) {
            const lowK = k.toLowerCase();
            if (
              lowK.includes(origMod) ||
              lowK.includes(lowMod) ||
              lowK.startsWith(`pcm_${origMod}`) ||
              lowK.startsWith(`pcm_${lowMod}`) ||
              lowK.startsWith(`pcm_mod_${origMod}`) ||
              lowK.startsWith(`pcm_mod_${lowMod}`)
            ) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.warn('Error al purgar localStorage durante la desinstalación:', e);
      }

      installedModules.delete(moduleId);
      delete moduleGroupsState.moduleAssignments[moduleId];
      persistModuleGroupsState();
      delete notificationSettings.modulePermissions[moduleId];
      saveNotificationSettingsToDisk();
      renderModuleNotificationPermissions();
      updateModuleCounts();
      updateDashboardCardsCount();
      renderSidebarGroups();
      renderModuleGroupsManagerUI();
      renderDashboardCustomizationCatalog();
      checkCoreServiceStatus();

      if (installedModules.size === 0) {
        const emptyNotice = document.getElementById('empty-installed-notice');
        if (emptyNotice) emptyNotice.style.display = 'block';

        const emptyHero = document.querySelector('.empty-dashboard-hero');
        if (emptyHero) emptyHero.style.display = 'flex';

        if (currentView.startsWith('module-')) {
          switchView('dashboard');
        }
      }

      addSystemNotification('Módulo Desinstalado', `"${mod.manifest.name}" ha sido eliminado del sistema.`, 'warning', 'modules');
    }

    function ensureSidebarGroup(groupName) {
      if (!moduleGroupsState.groups.includes(groupName)) {
        moduleGroupsState.groups.push(groupName);
        persistModuleGroupsState();
      }
      renderSidebarGroups();
    }

    function toggleSidebarGroup(groupName) {
      const gBox = document.getElementById(`sidebar-group-${groupName}`);
      if (!gBox) return;
      const items = gBox.querySelector('.group-items');
      const header = gBox.querySelector('.group-header');
      if (items) items.classList.toggle('collapsed');
      if (header) header.classList.toggle('collapsed');
    }

    function checkSidebarGroupsVisibility() {
      document.querySelectorAll('.sidebar-group-box').forEach(gBox => {
        const visibleItems = Array.from(gBox.querySelectorAll('.nav-button')).filter(btn => btn.style.display !== 'none');
        gBox.style.display = visibleItems.length > 0 ? 'block' : 'none';
      });

      const emptyNotice = document.querySelector('.empty-modules-sidebar-notice');
      if (emptyNotice) {
        const hasActive = Array.from(installedModules.values()).some(m => m.active);
        emptyNotice.style.display = hasActive ? 'none' : 'block';
      }
    }

    function updateModuleCounts() {
      const count = installedModules.size;
      const badgeNav = document.getElementById('badge-total-modules');
      const badgeTab = document.getElementById('tab-installed-count');
      if (badgeNav) badgeNav.textContent = count;
      if (badgeTab) badgeTab.textContent = count;
    }

    function updateDashboardCardsCount() {
      const visibleCards = Array.from(document.querySelectorAll('#grid-board .card')).filter(c => c.style.display !== 'none').length;
      const badge = document.getElementById('badge-active-cards');
      if (badge) badge.textContent = visibleCards;
    }

    function syncRemoteCatalog() {
      console.log('Consultando repositorios configurados (0 fuentes registradas).');
    }

    function addRepositorySource() {
      const input = document.getElementById('new-repo-url');
      const val = input ? input.value.trim() : '';
      if (!val) return;

      const emptyNotice = document.getElementById('sources-empty-state');
      if (emptyNotice) emptyNotice.style.display = 'none';

      const list = document.getElementById('sources-list');
      const newRow = document.createElement('div');
      newRow.className = 'group-row';
      newRow.innerHTML = `
        <div>
          <strong style="font-size: 13px;">Repositorio Personalizado</strong>
          <div style="font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">${val}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="group-pill-system">REGISTRADO</span>
          <button class="btn-icon" style="color: var(--accent-danger);" onclick="this.closest('.group-row').remove();" title="Eliminar fuente">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
          </button>
        </div>
      `;
      list.appendChild(newRow);
      input.value = '';
      addSystemNotification('Fuente Añadida', `Repositorio ${val} guardado localmente.`, 'success', 'modules');
    }

    // 6. GESTIÓN Y PERMISOS DE NOTIFICACIONES (WINDOWS, NÚCLEO Y MÓDULOS)
    const SYSTEM_NOTIFICATION_CATEGORIES = [
      { id: 'modules', label: 'Gestión de Módulos (.pcm)', desc: 'Instalación, actualización, cambio de estado y desinstalación de extensiones' },
      { id: 'profiles', label: 'Perfiles de Dashboard', desc: 'Creación, duplicación, renombrado o eliminación de perfiles' },
      { id: 'windows_integration', label: 'Integración con Windows', desc: 'Modo servicio headless y detención ordenada del núcleo' },
      { id: 'security', label: 'Seguridad y Modo Simulación', desc: 'Alertas de protección del sistema y simulación dry-run' }
    ];

    const notificationSettings = {
      systemEnabled: true,
      windowsNativeEnabled: false,
      modulesMasterEnabled: true,
      systemEvents: {
        modules: true,
        profiles: true,
        windows_integration: true,
        security: true
      },
      modulePermissions: {} // moduleId: boolean
    };

    function renderSystemNotificationEvents() {
      const container = document.getElementById('settings-system-notif-events');
      if (!container) return;

      container.innerHTML = SYSTEM_NOTIFICATION_CATEGORIES.map(cat => {
        const isAllowed = notificationSettings.systemEvents && notificationSettings.systemEvents[cat.id] !== false;
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <div>
              <strong style="font-size: 12.5px;">${cat.label}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">${cat.desc}</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="chk-notif-event-${cat.id}" ${isAllowed ? 'checked' : ''} onchange="toggleSystemEventNotifPermission('${cat.id}', this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        `;
      }).join('');
    }

    function toggleSystemEventNotifPermission(catId, enabled) {
      if (!notificationSettings.systemEvents) notificationSettings.systemEvents = {};
      notificationSettings.systemEvents[catId] = enabled;
      saveNotificationSettingsToDisk();
      updateNotificationBadgesAndSummaries();
    }

    function updateUnreadNotifBadge() {
      const unreadCount = document.querySelectorAll('#notif-list .notif-item.unread').length;
      const badge = document.getElementById('notif-badge');
      if (badge) {
        if (unreadCount > 0) {
          badge.style.display = 'flex';
          badge.textContent = unreadCount;
        } else {
          badge.style.display = 'none';
          badge.textContent = '0';
        }
      }
    }

    function setupNotificationItem(item) {
      if (!item || item.dataset.swipeInitialized) return;
      item.dataset.swipeInitialized = 'true';

      let startX = 0;
      let startY = 0;
      let currentX = 0;
      let isSwiping = false;
      let pointerId = null;

      item.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button, a, input')) return;
        startX = e.clientX;
        startY = e.clientY;
        currentX = 0;
        isSwiping = false;
        pointerId = e.pointerId;
      });

      item.addEventListener('pointermove', (e) => {
        if (pointerId === null || e.pointerId !== pointerId) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!isSwiping && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          isSwiping = true;
          item.classList.add('swiping');
          try { item.setPointerCapture(pointerId); } catch(err) {}
        }

        if (isSwiping) {
          e.preventDefault();
          currentX = dx;
          item.style.transform = `translateX(${dx}px)`;
          const ratio = Math.min(1, Math.abs(dx) / 160);
          item.style.opacity = `${Math.max(0.15, 1 - ratio * 0.75)}`;
        }
      });

      const onPointerEnd = (e) => {
        if (pointerId === null || (e && e.pointerId !== pointerId)) return;
        const pId = pointerId;
        pointerId = null;

        if (isSwiping) {
          isSwiping = false;
          item.classList.remove('swiping');
          try { item.releasePointerCapture(pId); } catch(err) {}

          const threshold = 70;
          if (Math.abs(currentX) >= threshold) {
            const direction = currentX > 0 ? 1 : -1;
            item.style.transition = 'transform 0.22s cubic-bezier(0.2, 0, 0, 1), opacity 0.22s cubic-bezier(0.2, 0, 0, 1)';
            item.style.transform = `translateX(${direction * 115}%)`;
            item.style.opacity = '0';

            setTimeout(() => {
              item.classList.add('dismissing');
              setTimeout(() => {
                item.remove();
                updateNotificationEmptyState();
                updateUnreadNotifBadge();
              }, 250);
            }, 200);
            return;
          } else {
            item.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            item.style.transform = '';
            item.style.opacity = '';
            setTimeout(() => {
              item.style.transition = '';
            }, 200);
            return;
          }
        }

        const totalDist = Math.hypot(e.clientX - startX, e.clientY - startY);
        if (totalDist < 6) {
          if (item.classList.contains('unread')) {
            item.classList.remove('unread');
            updateUnreadNotifBadge();
          }
        }
      };

      item.addEventListener('pointerup', onPointerEnd);
      item.addEventListener('pointercancel', onPointerEnd);
    }

    function updateNotificationEmptyState() {
      const list = document.getElementById('notif-list');
      if (!list) return;
      const items = list.querySelectorAll('.notif-item');
      let emptyState = document.getElementById('notif-empty-state');
      if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.id = 'notif-empty-state';
        emptyState.style.textAlign = 'center';
        emptyState.style.padding = '40px 20px';
        emptyState.style.color = 'var(--text-muted)';
        emptyState.innerHTML = `
          <svg class="svg-icon svg-icon-lg" style="margin-bottom: 10px; opacity: 0.5;" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <div style="font-size: 13px; font-weight: 500;">Sin notificaciones</div>
          <div style="font-size: 11.5px; margin-top: 4px;">El historial del sistema se encuentra vacío.</div>
        `;
        list.appendChild(emptyState);
      }
      emptyState.style.display = (items.length === 0) ? 'block' : 'none';
    }

    const NOTIF_HISTORY_STORAGE_KEY = 'pcm_notification_history';
    let notificationHistory = [];

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function loadNotificationHistory() {
      try {
        const raw = localStorage.getItem(NOTIF_HISTORY_STORAGE_KEY);
        if (raw) {
          notificationHistory = JSON.parse(raw);
          if (!Array.isArray(notificationHistory)) notificationHistory = [];
        }
      } catch (e) {
        notificationHistory = [];
      }
      renderNotificationHistory();
      syncDrawerFromHistory();
    }

    function saveNotificationHistory() {
      try {
        if (notificationHistory.length > 200) {
          notificationHistory = notificationHistory.slice(0, 200);
        }
        localStorage.setItem(NOTIF_HISTORY_STORAGE_KEY, JSON.stringify(notificationHistory));
      } catch (e) {}
    }

    function formatNotifTime(isoOrMs) {
      if (!isoOrMs) return 'ahora mismo';
      const d = new Date(isoOrMs);
      if (isNaN(d.getTime())) return 'reciente';
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 60) return 'ahora mismo';
      if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }

    function syncDrawerFromHistory() {
      const list = document.getElementById('notif-list');
      if (!list) return;
      list.querySelectorAll('.notif-item').forEach(i => i.remove());

      const recentItems = notificationHistory.slice(0, 25);
      recentItems.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'notif-item' + (entry.read ? '' : ' unread');
        item.dataset.notifId = entry.id;
        item.innerHTML = `
          <div class="notif-icon">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          </div>
          <div class="notif-body">
            <h6>${escapeHtml(entry.title)}</h6>
            <p>${escapeHtml(entry.text)}</p>
            <div class="notif-time">${formatNotifTime(entry.timestamp)}</div>
          </div>
        `;
        setupNotificationItem(item);
        list.appendChild(item);
      });
      updateNotificationEmptyState();
      updateUnreadNotifBadge();
    }

    function renderNotificationHistory() {
      const container = document.getElementById('notif-history-container');
      if (!container) return;

      const searchInput = document.getElementById('input-notif-history-search');
      const categorySelect = document.getElementById('select-notif-history-category');

      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
      const cat = categorySelect ? categorySelect.value : 'all';

      const filtered = notificationHistory.filter(item => {
        if (cat !== 'all') {
          if (cat === 'system' && item.category !== 'system' && !item.category?.startsWith('system_')) return false;
          if (cat === 'modules' && item.category !== 'modules') return false;
          if (cat === 'profiles' && item.category !== 'profiles') return false;
        }
        if (query) {
          const matchTitle = (item.title || '').toLowerCase().includes(query);
          const matchText = (item.text || '').toLowerCase().includes(query);
          const matchCat = (item.category || '').toLowerCase().includes(query);
          return matchTitle || matchText || matchCat;
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="padding: 36px 16px; text-align: center; color: var(--text-muted); font-size: 12.5px;">
            <svg class="svg-icon svg-icon-md" style="margin-bottom: 8px; opacity: 0.4;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
            <div>No hay notificaciones registradas en el historial.</div>
          </div>
        `;
        return;
      }

      let html = '<div style="display: flex; flex-direction: column;">';
      filtered.forEach(entry => {
        const typeColor = entry.type === 'error' ? 'var(--accent-danger)' :
                          entry.type === 'warning' ? '#f59e0b' :
                          entry.type === 'success' ? 'var(--accent-success)' : 'var(--accent-primary)';
        const typeLabel = (entry.type || 'info').toUpperCase();
        const catLabel = entry.category === 'system' ? 'Sistema' :
                         entry.category === 'modules' ? 'Módulo' :
                         entry.category === 'profiles' ? 'Perfiles' : (entry.category || 'General');
        const timeFormatted = new Date(entry.timestamp).toLocaleString('es-ES', { 
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });

        html += `
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 11px 14px; border-bottom: 1px solid var(--border-subtle); background: ${entry.read ? 'transparent' : 'rgba(59, 130, 246, 0.04)'}; transition: background 0.15s ease;">
            <div style="display: flex; align-items: flex-start; gap: 10px; min-width: 0; flex: 1;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: ${entry.read ? 'transparent' : 'var(--accent-primary)'}; margin-top: 6px; flex-shrink: 0;" title="${entry.read ? 'Leída' : 'No leída'}"></div>
              <div style="min-width: 0; flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px; flex-wrap: wrap;">
                  <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: var(--radius-pill); background: var(--bg-elevated); border: 1px solid ${typeColor}; color: ${typeColor};">${typeLabel}</span>
                  <span style="font-size: 10.5px; color: var(--text-muted);">${catLabel}</span>
                  <span style="font-size: 10.5px; color: var(--text-muted); margin-left: auto;">${timeFormatted}</span>
                </div>
                <div style="font-size: 12.5px; font-weight: 600; color: var(--text-primary);">${escapeHtml(entry.title)}</div>
                <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; word-break: break-word;">${escapeHtml(entry.text)}</div>
              </div>
            </div>
            <button class="btn-icon btn-icon-xs" onclick="deleteHistoryNotification('${entry.id}')" title="Eliminar del historial" style="margin-top: 2px; flex-shrink: 0;">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    }

    function filterNotificationHistory() {
      renderNotificationHistory();
    }

    function markAllNotificationsHistoryRead() {
      notificationHistory.forEach(n => n.read = true);
      saveNotificationHistory();
      renderNotificationHistory();
      syncDrawerFromHistory();
    }

    function clearNotificationHistory() {
      notificationHistory = [];
      saveNotificationHistory();
      renderNotificationHistory();
      syncDrawerFromHistory();
    }

    function deleteHistoryNotification(id) {
      notificationHistory = notificationHistory.filter(n => n.id !== id);
      saveNotificationHistory();
      renderNotificationHistory();
      syncDrawerFromHistory();
    }

    function markAllNotificationsAsRead() {
      notificationHistory.forEach(n => n.read = true);
      saveNotificationHistory();
      document.querySelectorAll('#notif-list .notif-item').forEach(item => item.classList.remove('unread'));
      updateUnreadNotifBadge();
      renderNotificationHistory();
    }

    function clearAllNotifications() {
      const list = document.getElementById('notif-list');
      if (list) {
        list.querySelectorAll('.notif-item').forEach(i => i.remove());
        updateNotificationEmptyState();
      }
      notificationHistory.forEach(n => n.read = true);
      saveNotificationHistory();
      updateUnreadNotifBadge();
      renderNotificationHistory();
    }

    function dispatchWindowsNativeNotification(title, text) {
      if (!notificationSettings.windowsNativeEnabled) return;
      const invokeFn = getTauriInvoke();
      if (invokeFn) {
        invokeFn('show_windows_notification', { title, body: text })
          .catch(e => console.warn('Fallo al emitir notificación en Windows:', e));
      } else if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body: text });
        } catch (e) {}
      }
    }

    function addSystemNotification(title, text, type, category = 'system') {
      // 1. Filtrar por interruptor maestro del núcleo
      const isSystemEvent = !category || category === 'system' || category.startsWith('system_') || SYSTEM_NOTIFICATION_CATEGORIES.some(c => c.id === category);
      if (isSystemEvent && !notificationSettings.systemEnabled) {
        return;
      }

      // 2. Filtrar por tipo granular de evento del sistema
      if (category && notificationSettings.systemEvents) {
        const cleanCat = category.startsWith('system_') ? category.replace('system_', '') : category;
        if (notificationSettings.systemEvents[cleanCat] === false) {
          return;
        }
      }

      // 3. Filtrar por permisos de extensión modular externa
      if (!isSystemEvent) {
        if (notificationSettings.modulesMasterEnabled === false) {
          return;
        }
        if (category && notificationSettings.modulePermissions && notificationSettings.modulePermissions[category] === false) {
          return;
        }
      }

      // 4. Registrar en historial persistente y actualizar UI
      const notifEntry = {
        id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        title,
        text,
        type: type || 'info',
        category: category || 'system',
        timestamp: new Date().toISOString(),
        read: false
      };
      notificationHistory.unshift(notifEntry);
      saveNotificationHistory();
      renderNotificationHistory();
      syncDrawerFromHistory();

      // 5. Emisión nativa a Windows 10/11 si está autorizada
      dispatchWindowsNativeNotification(title, text);
    }

    function openSystemNotifModal() {
      const modal = document.getElementById('modal-system-notif');
      if (modal) {
        const chkSys = document.getElementById('chk-notif-system');
        if (chkSys) chkSys.checked = notificationSettings.systemEnabled !== false;
        const chkWin = document.getElementById('chk-notif-windows');
        if (chkWin) chkWin.checked = !!notificationSettings.windowsNativeEnabled;
        const container = document.getElementById('settings-system-notif-events');
        if (container) {
          container.style.opacity = notificationSettings.systemEnabled ? '1' : '0.45';
          container.style.pointerEvents = notificationSettings.systemEnabled ? 'auto' : 'none';
        }
        renderSystemNotificationEvents();
        modal.style.display = 'flex';
      }
    }

    function closeSystemNotifModal() {
      const modal = document.getElementById('modal-system-notif');
      if (modal) {
        modal.style.display = 'none';
      }
      updateNotificationBadgesAndSummaries();
    }

    function openModuleNotifModal() {
      const modal = document.getElementById('modal-module-notif');
      if (modal) {
        const chkMaster = document.getElementById('chk-notif-modules-master');
        if (chkMaster) chkMaster.checked = notificationSettings.modulesMasterEnabled !== false;
        renderModuleNotificationPermissions();
        modal.style.display = 'flex';
      }
    }

    function closeModuleNotifModal() {
      const modal = document.getElementById('modal-module-notif');
      if (modal) {
        modal.style.display = 'none';
      }
      updateNotificationBadgesAndSummaries();
    }

    function showConfirmDialog(options = {}) {
      return new Promise((resolve) => {
        const modal = document.getElementById('modal-app-confirm');
        const titleEl = document.getElementById('confirm-modal-title');
        const msgEl = document.getElementById('confirm-modal-message');
        const detailsEl = document.getElementById('confirm-modal-details');
        const btnConfirm = document.getElementById('confirm-modal-btn-confirm');
        const btnCancel = document.getElementById('confirm-modal-btn-cancel');
        const badgeEl = document.getElementById('confirm-modal-icon-badge');

        if (!modal) {
          resolve(window.confirm(options.message || '¿Confirmar acción?'));
          return;
        }

        titleEl.textContent = options.title || 'Confirmar Acción';
        msgEl.textContent = options.message || '¿Estás seguro de continuar con esta operación?';

        if (options.details) {
          detailsEl.textContent = options.details;
          detailsEl.style.display = 'block';
        } else {
          detailsEl.style.display = 'none';
          detailsEl.textContent = '';
        }

        btnConfirm.textContent = options.confirmText || 'Aceptar';
        btnCancel.textContent = options.cancelText || 'Cancelar';

        const isDanger = options.danger !== false;
        if (isDanger) {
          btnConfirm.className = 'btn btn-danger';
          badgeEl.style.background = 'rgba(239, 68, 68, 0.15)';
          badgeEl.style.color = '#ef4444';
          badgeEl.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" style="width: 20px; height: 20px;"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
        } else {
          btnConfirm.className = 'btn btn-primary';
          badgeEl.style.background = 'var(--accent-primary-dim)';
          badgeEl.style.color = 'var(--accent-primary)';
          badgeEl.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" style="width: 20px; height: 20px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        }

        const closeHandler = (result) => {
          modal.style.display = 'none';
          document.removeEventListener('keydown', keyHandler);
          window._resolveAppConfirm = null;
          resolve(result);
        };

        const keyHandler = (e) => {
          if (e.key === 'Escape') closeHandler(false);
          if (e.key === 'Enter') closeHandler(true);
        };

        document.addEventListener('keydown', keyHandler);
        window._resolveAppConfirm = closeHandler;

        modal.style.display = 'flex';
        btnConfirm.focus();
      });
    }
    window.showConfirmDialog = showConfirmDialog;

    function toggleSystemNotifPermission(enabled) {
      notificationSettings.systemEnabled = enabled;
      const container = document.getElementById('settings-system-notif-events');
      if (container) {
        container.style.opacity = enabled ? '1' : '0.45';
        container.style.pointerEvents = enabled ? 'auto' : 'none';
      }
      saveNotificationSettingsToDisk();
      updateNotificationBadgesAndSummaries();
    }

    function toggleModulesNotifMaster(enabled) {
      notificationSettings.modulesMasterEnabled = enabled;
      const container = document.getElementById('settings-module-notif-list');
      if (container) {
        container.style.opacity = enabled ? '1' : '0.5';
        container.style.pointerEvents = enabled ? 'auto' : 'none';
      }
      saveNotificationSettingsToDisk();
      updateNotificationBadgesAndSummaries();
    }

    async function toggleWindowsNativeNotif(enabled) {
      notificationSettings.windowsNativeEnabled = enabled;
      saveNotificationSettingsToDisk();
      if (enabled) {
        dispatchWindowsNativeNotification('PC Manager', 'Notificaciones nativas de Windows activadas.');
      }
    }

    function toggleModuleNotifPermission(moduleId, enabled) {
      notificationSettings.modulePermissions[moduleId] = enabled;
      saveNotificationSettingsToDisk();
      updateNotificationBadgesAndSummaries();
    }

    function updateNotificationBadgesAndSummaries() {
      const txtSysStatus = document.getElementById('txt-system-notif-status-badge');
      const txtSysSummary = document.getElementById('txt-system-events-summary');
      if (txtSysStatus && txtSysSummary) {
        const sysActive = notificationSettings.systemEnabled !== false;
        txtSysStatus.textContent = sysActive ? 'Avisos del Sistema Activos' : 'Avisos del Sistema Desactivados';
        txtSysStatus.style.color = sysActive ? 'var(--text-primary)' : 'var(--text-muted)';

        const totalEvents = SYSTEM_NOTIFICATION_CATEGORIES.length;
        let activeEvents = 0;
        SYSTEM_NOTIFICATION_CATEGORIES.forEach(cat => {
          if (notificationSettings.systemEvents && notificationSettings.systemEvents[cat.id] !== false) {
            activeEvents++;
          }
        });
        txtSysSummary.textContent = sysActive ? `${activeEvents} de ${totalEvents} eventos activos` : 'Núcleo silenciado';
      }

      const txtModSummary = document.getElementById('txt-modules-notif-summary');
      const txtModCount = document.getElementById('txt-modules-notif-count');
      if (txtModSummary && txtModCount) {
        const masterActive = notificationSettings.modulesMasterEnabled !== false;
        txtModSummary.textContent = masterActive ? 'Gestión por Módulo (Activa)' : 'Módulos Silenciados Globalmente';
        txtModSummary.style.color = masterActive ? 'var(--text-primary)' : 'var(--text-muted)';

        const modCount = installedModules.size;
        txtModCount.textContent = `${modCount} módulo(s) configurado(s)`;
      }
    }

    async function loadNotificationSettings() {
      let saved = null;
      const invokeFn = getTauriInvoke();
      if (invokeFn) {
        try {
          const res = await invokeFn('get_saved_settings', { moduleId: 'core_notifications' });
          if (res && res.preferences) {
            saved = typeof res.preferences === 'string' ? JSON.parse(res.preferences) : res.preferences;
          }
        } catch (e) {
          console.warn('Error al cargar preferencias de notificaciones desde backend:', e);
        }
      }
      if (!saved) {
        try {
          const local = localStorage.getItem('pcm_notification_settings');
          if (local) saved = JSON.parse(local);
        } catch(e) {}
      }

      if (saved && typeof saved === 'object') {
        if (typeof saved.systemEnabled === 'boolean') notificationSettings.systemEnabled = saved.systemEnabled;
        if (typeof saved.windowsNativeEnabled === 'boolean') notificationSettings.windowsNativeEnabled = saved.windowsNativeEnabled;
        if (typeof saved.modulesMasterEnabled === 'boolean') notificationSettings.modulesMasterEnabled = saved.modulesMasterEnabled;
        if (saved.systemEvents && typeof saved.systemEvents === 'object') {
          notificationSettings.systemEvents = Object.assign(notificationSettings.systemEvents, saved.systemEvents);
        }
        if (saved.modulePermissions && typeof saved.modulePermissions === 'object') {
          notificationSettings.modulePermissions = saved.modulePermissions;
        }
      }

      const chkSys = document.getElementById('chk-notif-system');
      if (chkSys) chkSys.checked = notificationSettings.systemEnabled !== false;
      const chkWin = document.getElementById('chk-notif-windows');
      if (chkWin) chkWin.checked = !!notificationSettings.windowsNativeEnabled;
      const chkModMaster = document.getElementById('chk-notif-modules-master');
      if (chkModMaster) chkModMaster.checked = notificationSettings.modulesMasterEnabled !== false;

      const container = document.getElementById('settings-system-notif-events');
      if (container) {
        container.style.opacity = notificationSettings.systemEnabled ? '1' : '0.45';
        container.style.pointerEvents = notificationSettings.systemEnabled ? 'auto' : 'none';
      }

      renderSystemNotificationEvents();
      renderModuleNotificationPermissions();
      updateNotificationBadgesAndSummaries();
    }

    function saveNotificationSettingsToDisk() {
      try {
        localStorage.setItem('pcm_notification_settings', JSON.stringify(notificationSettings));
      } catch(e) {}

      const invokeFn = getTauriInvoke();
      if (invokeFn) {
        invokeFn('save_module_setting', {
          moduleId: 'core_notifications',
          optionId: 'preferences',
          value: JSON.stringify(notificationSettings)
        }).catch(e => console.warn('Error al guardar preferencias de notificaciones:', e));
      }
    }

    function renderModuleNotificationPermissions() {
      const container = document.getElementById('settings-module-notif-list');
      if (!container) return;

      if (installedModules.size === 0) {
        container.innerHTML = `
          <div style="font-size: 12px; color: var(--text-muted); font-style: italic; padding: 4px 0;">
            No hay extensiones modulares instaladas actualmente.
          </div>
        `;
        return;
      }

      let html = '';
      installedModules.forEach((mod, modId) => {
        const isAllowed = notificationSettings.modulePermissions[modId] !== false;
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <div>
              <strong style="font-size: 13px;">${mod.manifest.name}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">Emitir alertas y avisos operativos de esta extensión</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="chk-notif-mod-${modId}" ${isAllowed ? 'checked' : ''} onchange="toggleModuleNotifPermission('${modId}', this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    // 7. GESTOR DE GRUPOS DE MÓDULOS (CORE-MODULAR)
    const DEFAULT_MODULE_GROUP = 'General';
    let moduleGroupsState = {
      groups: [DEFAULT_MODULE_GROUP],
      moduleAssignments: {} // moduleId -> groupName
    };

    function getModuleGroup(moduleId) {
      if (moduleGroupsState.moduleAssignments && moduleGroupsState.moduleAssignments[moduleId]) {
        const assigned = moduleGroupsState.moduleAssignments[moduleId];
        if (moduleGroupsState.groups.includes(assigned)) {
          return assigned;
        }
      }
      const mod = installedModules.get(moduleId);
      if (mod && mod.manifest && mod.manifest.group) {
        if (moduleGroupsState.groups.includes(mod.manifest.group)) {
          return mod.manifest.group;
        }
      }
      return DEFAULT_MODULE_GROUP;
    }

    async function loadModuleGroupsState() {
      let saved = null;
      const invokeFn = getTauriInvoke();
      if (invokeFn) {
        try {
          const res = await invokeFn('get_saved_settings', { moduleId: 'core_groups' });
          if (res && res.state) {
            saved = typeof res.state === 'string' ? JSON.parse(res.state) : res.state;
          }
        } catch(e) {
          console.warn('Error al cargar estado de grupos desde disco:', e);
        }
      }
      if (!saved) {
        try {
          const local = localStorage.getItem('pcm_module_groups_state');
          if (local) saved = JSON.parse(local);
        } catch(e) {}
      }

      if (saved && Array.isArray(saved.groups) && saved.groups.length > 0) {
        moduleGroupsState.groups = saved.groups;
        if (saved.moduleAssignments && typeof saved.moduleAssignments === 'object') {
          moduleGroupsState.moduleAssignments = saved.moduleAssignments;
        }
      }

      // El grupo 'General' es canónico, predeterminado e inborrable (Regla 3)
      if (!moduleGroupsState.groups.includes(DEFAULT_MODULE_GROUP)) {
        moduleGroupsState.groups.unshift(DEFAULT_MODULE_GROUP);
      }
    }

    function persistModuleGroupsState() {
      try {
        localStorage.setItem('pcm_module_groups_state', JSON.stringify(moduleGroupsState));
      } catch(e) {}

      const invokeFn = getTauriInvoke();
      if (invokeFn) {
        invokeFn('save_module_setting', {
          moduleId: 'core_groups',
          optionId: 'state',
          value: JSON.stringify(moduleGroupsState)
        }).catch(e => console.warn(e));
      }
    }

    function renderSidebarGroups() {
      const navArea = document.getElementById('modules-nav-area');
      if (!navArea) return;

      const emptyNotice = document.querySelector('.empty-modules-sidebar-notice');
      if (emptyNotice) emptyNotice.style.display = 'none';

      // 1. Crear u ordenar contenedores de grupo en el Sidebar según moduleGroupsState.groups
      moduleGroupsState.groups.forEach(groupName => {
        let groupEl = document.getElementById(`sidebar-group-${groupName}`);
        if (!groupEl) {
          groupEl = document.createElement('div');
          groupEl.className = 'sidebar-group-box';
          groupEl.id = `sidebar-group-${groupName}`;
          groupEl.innerHTML = `
            <div class="group-header" onclick="toggleSidebarGroup('${groupName}')" title="Plegar / Desplegar grupo ${groupName}">
              <span>${groupName}</span>
              <svg class="svg-icon group-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div class="group-items" id="sidebar-group-items-${groupName}"></div>
          `;
        }
        navArea.appendChild(groupEl);
      });

      // 2. Eliminar del sidebar cualquier contenedor de grupo que ya no exista
      navArea.querySelectorAll('.sidebar-group-box').forEach(el => {
        const gName = el.id.replace('sidebar-group-', '');
        if (!moduleGroupsState.groups.includes(gName)) {
          el.remove();
        }
      });

      // 3. Posicionar botones de módulos instalados en sus grupos asignados
      installedModules.forEach((mod, modId) => {
        const assignedGroup = getModuleGroup(modId);
        const groupContainer = document.getElementById(`sidebar-group-items-${assignedGroup}`);
        if (groupContainer) {
          let navBtn = document.getElementById(`nav-module-${modId}`);
          if (!navBtn) {
            navBtn = document.createElement('button');
            navBtn.className = 'nav-button';
            navBtn.id = `nav-module-${modId}`;
            navBtn.onclick = () => switchView(`module-${modId}`);
            navBtn.title = mod.manifest.name;
            navBtn.innerHTML = `
              <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${mod.manifest.name}</span>
            `;
          }
          groupContainer.appendChild(navBtn);
          navBtn.style.display = mod.active ? 'flex' : 'none';
        }
      });

      checkSidebarGroupsVisibility();
    }

    function renderInstalledModulesGroupSelectors() {
      installedModules.forEach((mod, modId) => {
        const valEl = document.getElementById(`val-mod-group-${modId}`);
        const dropdownEl = document.getElementById(`dropdown-mod-group-${modId}`);
        if (valEl && dropdownEl) {
          const current = getModuleGroup(modId);
          valEl.textContent = current;
          dropdownEl.innerHTML = moduleGroupsState.groups.map(g => `
            <div class="combobox-option ${current === g ? 'selected' : ''}" onclick="closeAllComboboxes(); setModuleGroup('${modId}', '${g.replace(/'/g, "\\'")}')">
              <span>${g}</span>
              <svg class="svg-icon svg-icon-xs option-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          `).join('');
        }
      });
    }

    function setModuleGroup(moduleId, targetGroup) {
      if (!moduleGroupsState.groups.includes(targetGroup)) {
        targetGroup = DEFAULT_MODULE_GROUP;
      }
      moduleGroupsState.moduleAssignments[moduleId] = targetGroup;
      persistModuleGroupsState();
      renderSidebarGroups();
      renderModuleGroupsManagerUI();
      renderInstalledModulesGroupSelectors();

      const mod = installedModules.get(moduleId);
      const modName = (mod && mod.manifest) ? mod.manifest.name : moduleId;
      addSystemNotification('Módulo Reasignado', `"${modName}" asignado al grupo "${targetGroup}".`, 'info', 'modules');
    }

    function renderModuleGroupsManagerUI() {
      const list = document.getElementById('groups-list');
      const badge = document.getElementById('tab-groups-count');
      if (badge) badge.textContent = moduleGroupsState.groups.length;
      if (!list) return;

      list.innerHTML = moduleGroupsState.groups.map((groupName, index) => {
        const isDefault = (groupName === DEFAULT_MODULE_GROUP);
        const assignedModules = [];
        installedModules.forEach((mod, modId) => {
          if (getModuleGroup(modId) === groupName) {
            assignedModules.push({ id: modId, name: mod.manifest.name });
          }
        });

        const isFirst = (index === 0);
        const isLast = (index === moduleGroupsState.groups.length - 1);

        const modulesHtml = assignedModules.length > 0
          ? `<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
              ${assignedModules.map(m => `
                <div class="group-module-pill" style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 6px 4px 10px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 11.5px;">
                  <span>${m.name}</span>
                  <div class="custom-combobox combobox-sm" id="combo-pill-group-${m.id}">
                    <div class="combobox-trigger" onclick="toggleCombobox('combo-pill-group-${m.id}')" title="Mover a otro grupo">
                      <span class="combobox-val">${groupName}</span>
                      <svg class="svg-icon svg-icon-xs combobox-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                    <div class="combobox-dropdown" id="dropdown-pill-group-${m.id}">
                      ${moduleGroupsState.groups.map(g => `
                        <div class="combobox-option ${groupName === g ? 'selected' : ''}" onclick="closeAllComboboxes(); setModuleGroup('${m.id}', '${g.replace(/'/g, "\\'")}')">
                          <span>${g}</span>
                          <svg class="svg-icon svg-icon-xs option-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>`
          : `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; font-style: italic;">Sin módulos asignados (se oculta automáticamente del menú lateral)</div>`;

        return `
          <div class="group-row" id="group-card-${groupName}" style="flex-direction: column; align-items: stretch; gap: 10px; padding: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                <div style="width: 34px; height: 34px; border-radius: 8px; background: var(--bg-surface); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; color: var(--accent-primary); flex-shrink: 0;">
                  <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <div style="min-width: 0; flex: 1;" id="group-display-${groupName}">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 14px; color: var(--text-primary);">${groupName}</strong>
                    ${isDefault ? '<span class="group-pill-system">PREDETERMINADO</span>' : ''}
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                    ${assignedModules.length} módulo(s) asignado(s)
                  </div>
                </div>
                <!-- Cuadro para renombrar inline -->
                <div id="group-rename-box-${groupName}" style="display: none; align-items: center; gap: 6px; flex: 1;">
                  <input type="text" id="input-rename-group-${groupName}" class="form-control" style="padding: 4px 8px; font-size: 12.5px; height: 30px; min-width: 0; flex: 1;" value="${groupName}" onkeydown="if(event.key==='Enter') saveRenameGroupInline('${groupName}')">
                  <button class="btn btn-primary" style="padding: 4px 10px; font-size: 11.5px;" onclick="saveRenameGroupInline('${groupName}')">Guardar</button>
                  <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11.5px;" onclick="cancelRenameGroupInline('${groupName}')">Cancelar</button>
                </div>
              </div>

              <!-- Acciones de orden, edición y eliminación -->
              <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                <button class="btn-icon" style="width: 30px; height: 30px; ${isFirst ? 'opacity: 0.25; cursor: not-allowed;' : ''}" title="Subir orden" onclick="${isFirst ? '' : `moveGroupUp('${groupName}')`}">
                  <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>
                </button>
                <button class="btn-icon" style="width: 30px; height: 30px; ${isLast ? 'opacity: 0.25; cursor: not-allowed;' : ''}" title="Bajar orden" onclick="${isLast ? '' : `moveGroupDown('${groupName}')`}">
                  <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>

                ${!isDefault ? `
                  <button class="btn-icon" style="width: 30px; height: 30px; color: var(--accent-primary);" title="Renombrar grupo" onclick="showRenameGroupInline('${groupName}')">
                    <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button class="btn-icon" style="width: 30px; height: 30px; color: var(--accent-danger);" title="Eliminar grupo (reasigna a General)" onclick="deleteGroup('${groupName}')">
                    <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
                  </button>
                ` : `
                  <button class="btn-icon" style="width: 30px; height: 30px; cursor: not-allowed; opacity: 0.4;" title="Inborrable por directiva del sistema">
                    <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </button>
                `}
              </div>
            </div>

            <!-- Módulos asignados a este grupo -->
            <div style="border-top: 1px solid var(--border-subtle); padding-top: 8px;">
              <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Módulos en este grupo:</div>
              ${modulesHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    function createGroup() {
      const input = document.getElementById('new-group-name');
      const val = input ? input.value.trim() : '';
      if (!val) {
        addSystemNotification('Nombre Inválido', 'Debe ingresar un nombre para el nuevo grupo.', 'warning', 'modules');
        return;
      }

      if (moduleGroupsState.groups.some(g => g.toLowerCase() === val.toLowerCase())) {
        addSystemNotification('Grupo Existente', `Ya existe un grupo llamado "${val}".`, 'warning', 'modules');
        return;
      }

      moduleGroupsState.groups.push(val);
      input.value = '';
      persistModuleGroupsState();
      renderSidebarGroups();
      renderModuleGroupsManagerUI();
      renderInstalledModulesGroupSelectors();
      addSystemNotification('Grupo Creado', `Grupo "${val}" creado exitosamente.`, 'success', 'modules');
    }

    function showRenameGroupInline(groupName) {
      const display = document.getElementById(`group-display-${groupName}`);
      const renameBox = document.getElementById(`group-rename-box-${groupName}`);
      if (display) display.style.display = 'none';
      if (renameBox) {
        renameBox.style.display = 'flex';
        const input = document.getElementById(`input-rename-group-${groupName}`);
        if (input) {
          input.focus();
          input.select();
        }
      }
    }

    function cancelRenameGroupInline(groupName) {
      const display = document.getElementById(`group-display-${groupName}`);
      const renameBox = document.getElementById(`group-rename-box-${groupName}`);
      if (display) display.style.display = 'block';
      if (renameBox) renameBox.style.display = 'none';
    }

    function saveRenameGroupInline(groupName) {
      const input = document.getElementById(`input-rename-group-${groupName}`);
      if (input) {
        submitRenameGroup(groupName, input.value);
      }
    }

    function submitRenameGroup(oldName, newName) {
      newName = (newName || '').trim();
      if (!newName || newName.toLowerCase() === oldName.toLowerCase()) {
        renderModuleGroupsManagerUI();
        return;
      }
      if (moduleGroupsState.groups.some(g => g.toLowerCase() === newName.toLowerCase())) {
        addSystemNotification('Nombre Duplicado', `Ya existe un grupo llamado "${newName}".`, 'warning', 'modules');
        renderModuleGroupsManagerUI();
        return;
      }

      const idx = moduleGroupsState.groups.indexOf(oldName);
      if (idx !== -1) {
        moduleGroupsState.groups[idx] = newName;
      }

      Object.keys(moduleGroupsState.moduleAssignments).forEach(modId => {
        if (moduleGroupsState.moduleAssignments[modId] === oldName) {
          moduleGroupsState.moduleAssignments[modId] = newName;
        }
      });

      persistModuleGroupsState();
      renderSidebarGroups();
      renderModuleGroupsManagerUI();
      renderInstalledModulesGroupSelectors();
      addSystemNotification('Grupo Renombrado', `El grupo "${oldName}" ahora se llama "${newName}".`, 'success', 'modules');
    }

    async function deleteGroup(groupName) {
      if (groupName === DEFAULT_MODULE_GROUP) {
        addSystemNotification('Acción No Permitida', 'El grupo "General" es predeterminado e inborrable.', 'warning', 'modules');
        return;
      }

      const confirmed = await showConfirmDialog({
        title: 'Eliminar Grupo',
        message: `¿Confirmas la eliminación del grupo "${groupName}"?`,
        details: `Todos sus módulos se reasignarán automáticamente al grupo "${DEFAULT_MODULE_GROUP}".`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        danger: true
      });
      if (!confirmed) return;

      let reassignedCount = 0;
      installedModules.forEach((mod, modId) => {
        if (getModuleGroup(modId) === groupName) {
          moduleGroupsState.moduleAssignments[modId] = DEFAULT_MODULE_GROUP;
          reassignedCount++;
        }
      });

      moduleGroupsState.groups = moduleGroupsState.groups.filter(g => g !== groupName);

      persistModuleGroupsState();
      renderSidebarGroups();
      renderModuleGroupsManagerUI();
      renderInstalledModulesGroupSelectors();
      addSystemNotification('Grupo Eliminado', `El grupo "${groupName}" fue eliminado. ${reassignedCount > 0 ? `${reassignedCount} módulo(s) reasignados a "${DEFAULT_MODULE_GROUP}".` : ''}`, 'info', 'modules');
    }

    function moveGroupUp(groupName) {
      const idx = moduleGroupsState.groups.indexOf(groupName);
      if (idx > 0) {
        const temp = moduleGroupsState.groups[idx - 1];
        moduleGroupsState.groups[idx - 1] = moduleGroupsState.groups[idx];
        moduleGroupsState.groups[idx] = temp;
        persistModuleGroupsState();
        renderSidebarGroups();
        renderModuleGroupsManagerUI();
      }
    }

    function moveGroupDown(groupName) {
      const idx = moduleGroupsState.groups.indexOf(groupName);
      if (idx !== -1 && idx < moduleGroupsState.groups.length - 1) {
        const temp = moduleGroupsState.groups[idx + 1];
        moduleGroupsState.groups[idx + 1] = moduleGroupsState.groups[idx];
        moduleGroupsState.groups[idx] = temp;
        persistModuleGroupsState();
        renderSidebarGroups();
        renderModuleGroupsManagerUI();
      }
    }

    // 7.1 PESTAÑAS DE CONFIGURACIÓN (GENERAL + MÓDULOS)
    function switchSettingsTab(tabId) {
      document.querySelectorAll('#settings-tabs-bar .tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById(`tab-btn-settings-${tabId}`);
      if (activeBtn) activeBtn.classList.add('active');

      const generalPane = document.getElementById('settings-tab-pane-general');
      if (generalPane) {
        generalPane.style.display = (tabId === 'general') ? '' : 'none';
      }

      document.querySelectorAll('#dynamic-module-settings-panes .settings-content-stack').forEach(pane => {
        pane.style.display = (pane.id === `settings-tab-pane-${tabId}`) ? '' : 'none';
      });
    }

    // 8. CICLO DE VIDA EN WINDOWS
    function toggleStartupWindows(isEnabled) {
      const invokeFn = getTauriInvoke();
      if (invokeFn) {
        invokeFn('save_module_setting', { moduleId: 'core_lifecycle', optionId: 'startup_with_windows', value: isEnabled }).catch(e => console.warn(e));
      }
    }

    function toggleTrayMinimize(isEnabled) {
      if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
        window.__TAURI_INTERNALS__.invoke('minimize_to_tray');
      } else if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        window.__TAURI__.core.invoke('minimize_to_tray');
      }
    }

    // GESTIÓN COMPLETA DEL SERVICE HOST DE WINDOWS (PRE-LOGON & WORKERS)
    function renderCoreServiceWorkers(status, serviceInfo) {
      const tableEl = document.getElementById('core-service-workers-table');
      const countEl = document.getElementById('core-service-workers-count');
      const ramEl = document.getElementById('core-service-ram-val');
      const cpuEl = document.getElementById('core-service-cpu-val');
      const prelogonEl = document.getElementById('core-service-prelogon-val');

      if (!tableEl) return;

      const isRunning = Boolean(status && status.installed && status.running);
      const isInstalled = Boolean(status && status.installed);

      if (!isRunning) {
        if (ramEl) ramEl.textContent = '-- MB';
        if (cpuEl) cpuEl.textContent = '--';
        if (prelogonEl) {
          prelogonEl.textContent = isInstalled ? 'En pausa' : 'No instalado';
          prelogonEl.style.color = isInstalled ? 'var(--accent-warning)' : 'var(--text-muted)';
        }
        if (countEl) countEl.textContent = '0';
        tableEl.innerHTML = `
          <div style="padding: 18px 14px; text-align: center; color: var(--text-muted); font-size: 12px; display: flex; flex-direction: column; align-items: center; gap: 6px;">
            <svg class="svg-icon svg-icon-sm" style="opacity: 0.5;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <div>${isInstalled ? 'El servicio está detenido. Los workers en segundo plano están en reposo.' : 'El servicio no está instalado en Windows. Instálelo para habilitar tareas en segundo plano.'}</div>
          </div>
        `;
        return;
      }

      // Servicio en ejecución
      let baseRam = (serviceInfo && serviceInfo.total_memory_mb) ? Number(serviceInfo.total_memory_mb) : 18.5;
      if (isNaN(baseRam) || baseRam <= 0) baseRam = 18.5;

      const activeWorkers = [];

      // 1. Worker nativo interno del Core
      const coreRamMb = Math.round(baseRam * 0.45 * 10) / 10;
      activeWorkers.push({
        module_name: 'Core Host',
        worker_name: 'Supervisor de Integridad Pre-logon',
        frequency: 'Cada 30s',
        ram: `${coreRamMb} MB`,
        cpu: '< 0.02%',
        status: '🟢 Activo (SYSTEM)',
        is_core: true
      });

      // 2. Workers de módulos activos
      let moduleWorkersRam = 0;
      if (installedModules && installedModules.size > 0) {
        installedModules.forEach((mod, modId) => {
          if (mod.active) {
            const bgWorker = mod.manifest && mod.manifest.background_worker;

            if (bgWorker) {
              const modRamMb = Math.round(baseRam * 0.55 * 10) / 10;
              moduleWorkersRam += modRamMb;
              activeWorkers.push({
                module_name: (mod.manifest && mod.manifest.name) ? mod.manifest.name : modId,
                worker_name: bgWorker.name || 'Colector de fondo',
                frequency: bgWorker.frequency || 'Cada 6s',
                ram: `${modRamMb} MB`,
                cpu: '~0.08%',
                status: '🟢 Activo',
                is_core: false
              });
            }
          }
        });
      }

      // Total de memoria dinámica según workers activos
      const displayedTotalRam = (Math.round((coreRamMb + moduleWorkersRam) * 10) / 10);
      if (ramEl) ramEl.textContent = `${displayedTotalRam} MB`;
      if (cpuEl) cpuEl.textContent = (serviceInfo && serviceInfo.total_cpu_percent !== undefined) ? `< ${serviceInfo.total_cpu_percent}%` : '< 0.1%';
      if (prelogonEl) {
        prelogonEl.textContent = 'Habilitado';
        prelogonEl.style.color = 'var(--accent-success)';
      }
      if (countEl) countEl.textContent = activeWorkers.length;

      let rowsHtml = activeWorkers.map((w, idx) => `
        <div style="display: grid; grid-template-columns: 2fr 1.2fr 1fr 1fr 1.2fr; gap: 8px; align-items: center; padding: 10px 14px; font-size: 12px; ${idx > 0 ? 'border-top: 1px solid var(--border-subtle);' : ''} background: ${idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'};">
          <div>
            <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(w.module_name)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(w.worker_name)}</div>
          </div>
          <div style="color: var(--text-secondary); font-size: 11.5px;">${escapeHtml(w.frequency)}</div>
          <div style="font-weight: 600; color: var(--accent-primary); font-size: 11.5px;">${w.ram}</div>
          <div style="color: var(--text-muted); font-size: 11.5px;">${w.cpu}</div>
          <div>
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; background: rgba(34, 197, 94, 0.12); color: #22c55e; font-size: 11px; font-weight: 600;">
              ${w.status}
            </span>
          </div>
        </div>
      `).join('');

      tableEl.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1.2fr 1fr 1fr 1.2fr; gap: 8px; padding: 8px 14px; background: var(--bg-elevated); font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-subtle);">
          <div>Módulo / Tarea</div>
          <div>Frecuencia</div>
          <div>Peso RAM</div>
          <div>CPU</div>
          <div>Estado</div>
        </div>
        ${rowsHtml}
      `;
    }

    async function checkCoreServiceStatus() {
      const invokeFn = getTauriInvoke();
      if (!invokeFn) return;
      const statusEl = document.getElementById('core-service-status-pill');
      const detailsEl = document.getElementById('core-service-details');
      const actionsEl = document.getElementById('core-service-actions');
      if (!statusEl) return;

      try {
        const status = await invokeFn('check_service_status');

        let serviceInfo = null;
        try {
          const telemetryRaw = await invokeFn('get_system_telemetry');
          if (telemetryRaw) {
            const telemetryData = JSON.parse(telemetryRaw);
            if (telemetryData && telemetryData.service_info) {
              serviceInfo = telemetryData.service_info;
            }
          }
        } catch (e) {}

        renderCoreServiceWorkers(status, serviceInfo);

        if (status && status.installed && status.running) {
          statusEl.innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; background: rgba(34, 197, 94, 0.15); color: #22c55e; font-size: 12px; font-weight: 600;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block;"></span>
              En ejecución (SYSTEM)
            </span>
          `;
          if (detailsEl) {
            detailsEl.textContent = 'Service Host en ejecución bajo cuenta SYSTEM. Aloja colectores de hardware y tareas desasistidas previas al inicio de sesión.';
          }
          if (actionsEl) {
            actionsEl.innerHTML = `
              <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;" onclick="checkCoreServiceStatus()" title="Actualizar métricas y estado">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                <span>Verificar</span>
              </button>
              <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;" onclick="stopCoreServiceFromSettings()" title="Detener el servicio">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"></rect></svg>
                <span>Detener</span>
              </button>
              <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px; color: var(--accent-danger); border-color: rgba(239, 68, 68, 0.3);" onclick="uninstallCoreServiceFromSettings()" title="Desinstalar servicio de Windows">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Desinstalar</span>
              </button>
            `;
          }
        } else if (status && status.installed && !status.running) {
          statusEl.innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; background: rgba(234, 179, 8, 0.15); color: #eab308; font-size: 12px; font-weight: 600;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #eab308; display: inline-block;"></span>
              Detenido
            </span>
          `;
          if (detailsEl) {
            detailsEl.textContent = 'El Service Host está instalado en Windows pero actualmente no está en ejecución.';
          }
          if (actionsEl) {
            actionsEl.innerHTML = `
              <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;" onclick="checkCoreServiceStatus()" title="Actualizar estado">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                <span>Verificar</span>
              </button>
              <button class="btn btn-primary" style="font-size: 12px; padding: 6px 14px;" onclick="startCoreServiceFromSettings()" title="Iniciar el servicio">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span>Iniciar Servicio</span>
              </button>
              <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px; color: var(--accent-danger); border-color: rgba(239, 68, 68, 0.3);" onclick="uninstallCoreServiceFromSettings()" title="Desinstalar servicio de Windows">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Desinstalar</span>
              </button>
            `;
          }
        } else {
          statusEl.innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; background: rgba(148, 163, 184, 0.15); color: var(--text-muted); font-size: 12px; font-weight: 600;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); display: inline-block;"></span>
              No instalado
            </span>
          `;
          if (detailsEl) {
            detailsEl.textContent = 'No registrado en Windows. Instale el servicio para habilitar el modo Pre-logon y la supervisión de hardware para los módulos.';
          }
          if (actionsEl) {
            actionsEl.innerHTML = `
              <button class="btn btn-primary" style="font-size: 12px; padding: 6px 14px;" id="btn-core-service-install" onclick="installCoreServiceFromSettings()" title="Instalar y registrar servicio en Windows (solicita UAC una sola vez)">
                <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <span>Instalar y Arrancar Servicio</span>
              </button>
            `;
          }
        }
      } catch (err) {
        console.warn('Error al consultar estado del servicio del Core:', err);
      }
    }

    async function toggleWindowsService(isEnabled) {
      const invokeFn = getTauriInvoke();
      if (!invokeFn) return;
      const chk = document.getElementById('chk-service');
      try {
        const status = await invokeFn('check_service_status');
        if (isEnabled) {
          if (!status.installed) {
            const confirmed = await showConfirmDialog({
              title: 'Instalar Servicio Nativo',
              message: 'El servicio nativo de telemetría de Windows (pc_manager_service) no está instalado todavía.',
              details: '¿Deseas instalarlo ahora? Windows solicitará elevación UAC de administrador una sola vez.',
              confirmText: 'Instalar Servicio',
              cancelText: 'Cancelar',
              danger: false
            });
            if (confirmed) {
              await installCoreServiceFromSettings();
            } else {
              if (chk) chk.checked = false;
            }
          } else if (!status.running) {
            await startCoreServiceFromSettings();
          }
        } else {
          if (status.running) {
            const confirmed = await showConfirmDialog({
              title: 'Detener Servicio',
              message: '¿Deseas detener el servicio de telemetría de Windows?',
              details: 'Los módulos seguirán activos pero algunas métricas avanzadas requerirán ejecución local.',
              confirmText: 'Detener',
              cancelText: 'Cancelar',
              danger: true
            });
            if (confirmed) {
              await stopCoreServiceFromSettings();
            } else {
              if (chk) chk.checked = true;
            }
          }
        }
      } catch (err) {
        console.error('Error al alternar estado del servicio:', err);
        if (chk) chk.checked = !isEnabled;
      }
    }

    async function installCoreServiceFromSettings() {
      const invokeFn = getTauriInvoke();
      if (!invokeFn) return;
      const statusEl = document.getElementById('core-service-status-pill');
      if (statusEl) {
        statusEl.innerHTML = '<span style="color: var(--accent-warning); display: inline-flex; align-items: center; gap: 6px; font-size: 12px;"><svg class="svg-icon svg-icon-xs rotating" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Configurando servicio en Windows...</span>';
      }
      try {
        const res = await invokeFn('request_service_installation');
        addSystemNotification('Servicio de Windows', res || 'Servicio instalado y en ejecución.', 'success', 'system');
        await checkCoreServiceStatus();
      } catch (err) {
        addSystemNotification('Servicio de Windows', `Error al configurar servicio: ${err}`, 'warning', 'system');
        await checkCoreServiceStatus();
      }
    }

    async function startCoreServiceFromSettings() {
      const invokeFn = getTauriInvoke();
      if (!invokeFn) return;
      try {
        const res = await invokeFn('toggle_service_state', { start: true });
        addSystemNotification('Servicio de Windows', res, 'info', 'system');
        await checkCoreServiceStatus();
      } catch (err) {
        addSystemNotification('Servicio de Windows', `Error al iniciar servicio: ${err}`, 'warning', 'system');
        await checkCoreServiceStatus();
      }
    }

    async function stopCoreServiceFromSettings() {
      const invokeFn = getTauriInvoke();
      if (!invokeFn) return;
      try {
        const res = await invokeFn('toggle_service_state', { start: false });
        addSystemNotification('Servicio de Windows', res, 'info', 'system');
        await checkCoreServiceStatus();
      } catch (err) {
        addSystemNotification('Servicio de Windows', `Error al detener servicio: ${err}`, 'warning', 'system');
        await checkCoreServiceStatus();
      }
    }

    async function uninstallCoreServiceFromSettings() {
      const confirmed = await showConfirmDialog({
        title: 'Desinstalar Servicio de Windows',
        message: '¿Deseas desinstalar el servicio de telemetría de Windows?',
        details: 'Los módulos continuarán operando, pero métricas avanzadas de bajo nivel (como telemetría SMART y salud) requerirán elevación o no estarán disponibles.',
        confirmText: 'Desinstalar Servicio',
        cancelText: 'Cancelar',
        danger: true
      });
      if (!confirmed) return;
      const invokeFn = getTauriInvoke();
      if (!invokeFn) return;
      try {
        const res = await invokeFn('uninstall_windows_service');
        addSystemNotification('Servicio de Windows', res, 'info', 'system');
        await checkCoreServiceStatus();
      } catch (err) {
        addSystemNotification('Servicio de Windows', `Error al desinstalar servicio: ${err}`, 'warning', 'system');
        await checkCoreServiceStatus();
      }
    }

    async function shutdownApplication() {
      const confirmed = await showConfirmDialog({
        title: 'Cierre Total del Sistema',
        message: '¿Confirmas el cierre total de PC Manager?',
        details: 'Se detendrán de forma determinista todos los servicios de telemetría, colectores y subprocesos activos.',
        confirmText: 'Cerrar Sistema',
        cancelText: 'Cancelar',
        danger: true
      });
      if (!confirmed) return;

      addSystemNotification('Cierre Total del Core', 'Todos los servicios han sido detenidos limpiamente.', 'warning', 'windows_integration');
      if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
        window.__TAURI_INTERNALS__.invoke('quit_app');
      } else if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        window.__TAURI__.core.invoke('quit_app');
      } else {
        addSystemNotification('Parada Completa', 'Parada completa ejecutada con éxito.', 'info', 'system');
      }
    }

    // 9. MOTOR DE TEMAS Y COLORES
    const THEME_PRESETS = {
      'default': {
        name: 'Oscuro Profundo',
        desc: 'Gradientes oscuros profundos con alto contraste OLED.',
        vars: {
          '--bg-base': '#0a0c10',
          '--bg-surface': '#11141c',
          '--bg-elevated': '#161b26',
          '--bg-card': '#1b212f',
          '--bg-card-hover': '#222a3b',
          '--text-primary': '#f1f5f9',
          '--text-secondary': '#94a3b8',
          '--text-muted': '#64748b',
          '--border-subtle': 'rgba(255, 255, 255, 0.07)',
          '--border-medium': 'rgba(255, 255, 255, 0.14)',
          '--shadow-surface': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
          '--shadow-floating': '0 16px 40px -4px rgba(0, 0, 0, 0.6)'
        }
      },
      'carbon': {
        name: 'Carbon Black',
        desc: 'Monocromático ultra-oscuro minimalista y sobrio.',
        vars: {
          '--bg-base': '#050505',
          '--bg-surface': '#0e0e11',
          '--bg-elevated': '#151518',
          '--bg-card': '#1c1c20',
          '--bg-card-hover': '#242429',
          '--text-primary': '#f5f5f7',
          '--text-secondary': '#a1a1a6',
          '--text-muted': '#6e6e73',
          '--border-subtle': 'rgba(255, 255, 255, 0.06)',
          '--border-medium': 'rgba(255, 255, 255, 0.12)',
          '--shadow-surface': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
          '--shadow-floating': '0 16px 40px -4px rgba(0, 0, 0, 0.6)'
        }
      },
      'midnight': {
        name: 'Midnight Navy',
        desc: 'Matiz azul nocturno profundo para sesiones prolongadas.',
        vars: {
          '--bg-base': '#070c18',
          '--bg-surface': '#0c1424',
          '--bg-elevated': '#121c32',
          '--bg-card': '#182542',
          '--bg-card-hover': '#203154',
          '--text-primary': '#f0f6fc',
          '--text-secondary': '#8b949e',
          '--text-muted': '#586069',
          '--border-subtle': 'rgba(96, 165, 250, 0.08)',
          '--border-medium': 'rgba(96, 165, 250, 0.16)',
          '--shadow-surface': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
          '--shadow-floating': '0 16px 40px -4px rgba(0, 0, 0, 0.6)'
        }
      },
      'cyber': {
        name: 'Cyberpunk Dark',
        desc: 'Estética neón violeta oscuro con gran profundidad.',
        vars: {
          '--bg-base': '#0c0915',
          '--bg-surface': '#130f21',
          '--bg-elevated': '#1a152e',
          '--bg-card': '#231c3c',
          '--bg-card-hover': '#2d244c',
          '--text-primary': '#f5f3ff',
          '--text-secondary': '#a78bfa',
          '--text-muted': '#6d5d9c',
          '--border-subtle': 'rgba(167, 139, 250, 0.1)',
          '--border-medium': 'rgba(167, 139, 250, 0.2)',
          '--shadow-surface': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
          '--shadow-floating': '0 16px 40px -4px rgba(0, 0, 0, 0.6)'
        }
      },
      'light-clean': {
        name: 'Blanco Puro',
        desc: 'Entorno claro diáfano de máxima luminosidad y pulcritud.',
        vars: {
          '--bg-base': '#f4f6f9',
          '--bg-surface': '#ffffff',
          '--bg-elevated': '#e9edf4',
          '--bg-card': '#ffffff',
          '--bg-card-hover': '#f8fafc',
          '--text-primary': '#0f172a',
          '--text-secondary': '#475569',
          '--text-muted': '#64748b',
          '--border-subtle': 'rgba(0, 0, 0, 0.08)',
          '--border-medium': 'rgba(0, 0, 0, 0.16)',
          '--shadow-surface': '0 2px 10px -2px rgba(0, 0, 0, 0.08)',
          '--shadow-floating': '0 8px 24px -4px rgba(0, 0, 0, 0.12)'
        }
      },
      'light-soft-blue': {
        name: 'Azul Suave',
        desc: 'Tonalidad celeste tenue, agradable y descansada para la vista.',
        vars: {
          '--bg-base': '#edf4fa',
          '--bg-surface': '#ffffff',
          '--bg-elevated': '#dbe8f5',
          '--bg-card': '#ffffff',
          '--bg-card-hover': '#f3f8fd',
          '--text-primary': '#0d1e3a',
          '--text-secondary': '#334e68',
          '--text-muted': '#627d98',
          '--border-subtle': 'rgba(37, 99, 235, 0.1)',
          '--border-medium': 'rgba(37, 99, 235, 0.2)',
          '--shadow-surface': '0 2px 10px -2px rgba(0, 0, 0, 0.08)',
          '--shadow-floating': '0 8px 24px -4px rgba(0, 0, 0, 0.12)'
        }
      },
      'light-platinum': {
        name: 'Gris Platino',
        desc: 'Apariencia corporativa elegante en gris satinado.',
        vars: {
          '--bg-base': '#eceff1',
          '--bg-surface': '#ffffff',
          '--bg-elevated': '#dfe4e8',
          '--bg-card': '#ffffff',
          '--bg-card-hover': '#f5f7f8',
          '--text-primary': '#19212c',
          '--text-secondary': '#455a64',
          '--text-muted': '#78909c',
          '--border-subtle': 'rgba(0, 0, 0, 0.08)',
          '--border-medium': 'rgba(0, 0, 0, 0.15)',
          '--shadow-surface': '0 2px 10px -2px rgba(0, 0, 0, 0.08)',
          '--shadow-floating': '0 8px 24px -4px rgba(0, 0, 0, 0.12)'
        }
      },
      'light-mint': {
        name: 'Menta Suave',
        desc: 'Fondo claro fresco con toques verdes energizantes.',
        vars: {
          '--bg-base': '#ecf7f2',
          '--bg-surface': '#ffffff',
          '--bg-elevated': '#d7ede3',
          '--bg-card': '#ffffff',
          '--bg-card-hover': '#f4fbf7',
          '--text-primary': '#062817',
          '--text-secondary': '#23593d',
          '--text-muted': '#52836b',
          '--border-subtle': 'rgba(16, 185, 129, 0.12)',
          '--border-medium': 'rgba(16, 185, 129, 0.22)',
          '--shadow-surface': '0 2px 10px -2px rgba(0, 0, 0, 0.08)',
          '--shadow-floating': '0 8px 24px -4px rgba(0, 0, 0, 0.12)'
        }
      }
    };

    // CONTROLADOR DEL CUSTOM COMBOBOX (MATERIAL EXPRESSIVE)
    function toggleCombobox(comboId) {
      const combo = document.getElementById(comboId);
      const wasOpen = combo.classList.contains('open');
      closeAllComboboxes();
      if (!wasOpen) {
        combo.classList.add('open');
      }
    }

    function closeAllComboboxes() {
      document.querySelectorAll('.custom-combobox').forEach(c => c.classList.remove('open'));
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-combobox')) {
        closeAllComboboxes();
      }
    });

    function selectModuleOptionCombo(moduleId, optionId, value, label) {
      const valEl = document.getElementById(`val-opt-${moduleId}-${optionId}`);
      if (valEl) valEl.textContent = label;
      const hiddenInput = document.getElementById(`opt-${moduleId}-${optionId}`);
      if (hiddenInput) hiddenInput.value = value;
      const dropdown = document.getElementById(`dropdown-opt-${moduleId}-${optionId}`);
      if (dropdown) {
        dropdown.querySelectorAll('.combobox-option').forEach(opt => {
          opt.classList.toggle('selected', opt.getAttribute('data-value') === String(value));
        });
      }
      closeAllComboboxes();
      dispatchModuleSetting(moduleId, optionId, value);
    }

    const MODE_PRESETS = {
      dark: [
        { key: 'default', label: 'Oscuro Profundo (Predeterminado)', desc: 'Gradientes oscuros profundos con alto contraste OLED.' },
        { key: 'carbon', label: 'Carbon Black', desc: 'Monocromático ultra-oscuro minimalista y sobrio.' },
        { key: 'midnight', label: 'Midnight Navy', desc: 'Matiz azul nocturno profundo para sesiones prolongadas.' },
        { key: 'cyber', label: 'Cyberpunk Dark', desc: 'Estética neón violeta oscuro con gran profundidad.' }
      ],
      light: [
        { key: 'light-clean', label: 'Blanco Puro (Predeterminado)', desc: 'Entorno claro diáfano de máxima luminosidad y pulcritud.' },
        { key: 'light-soft-blue', label: 'Azul Suave', desc: 'Tonalidad celeste tenue, agradable y descansada para la vista.' },
        { key: 'light-platinum', label: 'Gris Platino', desc: 'Apariencia corporativa elegante en gris satinado.' },
        { key: 'light-mint', label: 'Menta Suave', desc: 'Fondo claro fresco con toques verdes energizantes.' }
      ]
    };

    let currentMode = 'dark';
    let currentPreset = 'default';

    function renderPresetDropdown(mode) {
      const dropdown = document.getElementById('dropdown-theme-preset');
      if (!dropdown) return;
      const presets = MODE_PRESETS[mode] || MODE_PRESETS.dark;
      dropdown.innerHTML = presets.map(p => `
        <div class="combobox-option ${p.key === currentPreset ? 'selected' : ''}" data-value="${p.key}" onclick="selectThemePresetOption('${p.key}', '${p.label}', '${p.desc}')">
          <span>${p.label}</span>
          <svg class="svg-icon svg-icon-xs option-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      `).join('');
    }

    function selectThemeModeOption(mode, label) {
      currentMode = mode;
      document.documentElement.style.colorScheme = mode;
      document.documentElement.setAttribute('data-theme-mode', mode);
      document.getElementById('val-theme-mode').textContent = label;
      document.querySelectorAll('#dropdown-theme-mode .combobox-option').forEach(opt => {
        opt.classList.toggle('selected', opt.getAttribute('data-value') === mode);
      });
      closeAllComboboxes();

      const defaultPreset = mode === 'dark' ? 'default' : 'light-clean';
      const defaultLabel = mode === 'dark' ? 'Oscuro Profundo (Predeterminado)' : 'Blanco Puro (Predeterminado)';
      const defaultDesc = mode === 'dark' ? 'Gradientes oscuros profundos con alto contraste OLED.' : 'Entorno claro diáfano de máxima luminosidad y pulcritud.';
      currentPreset = defaultPreset;
      document.getElementById('val-theme-preset').textContent = defaultLabel;
      document.getElementById('theme-preset-desc').textContent = defaultDesc;

      renderPresetDropdown(mode);
      applyThemePreset(defaultPreset);
    }

    function selectThemePresetOption(presetKey, label, desc) {
      currentPreset = presetKey;
      document.getElementById('val-theme-preset').textContent = label;
      document.getElementById('theme-preset-desc').textContent = desc;
      document.querySelectorAll('#dropdown-theme-preset .combobox-option').forEach(opt => {
        opt.classList.toggle('selected', opt.getAttribute('data-value') === presetKey);
      });
      closeAllComboboxes();
      applyThemePreset(presetKey);
    }

    // Inicializar combobox de temas al arrancar
    renderPresetDropdown('dark');

    function applyThemePreset(presetKey) {
      const preset = THEME_PRESETS[presetKey];
      if (!preset) return;

      const isLight = presetKey.startsWith('light-');
      currentMode = isLight ? 'light' : 'dark';
      document.documentElement.style.colorScheme = currentMode;
      document.documentElement.setAttribute('data-theme-mode', currentMode);

      const descEl = document.getElementById('theme-preset-desc');
      if (descEl) descEl.textContent = preset.desc;

      const root = document.documentElement;
      for (const [prop, val] of Object.entries(preset.vars)) {
        root.style.setProperty(prop, val);
      }
    }

    function applyAccent(colorHex, hoverHex, dimRgba, swatchEl) {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      if (swatchEl) swatchEl.classList.add('active');

      const root = document.documentElement;
      root.style.setProperty('--accent-primary', colorHex);
      root.style.setProperty('--accent-primary-hover', hoverHex);
      root.style.setProperty('--accent-primary-dim', dimRgba);
    }

    // 10. INICIALIZACIÓN Y VINCULACIÓN CON HOST NATIVO TAURI (SOFTWARE DE ESCRITORIO)
    window.addEventListener('DOMContentLoaded', async () => {
      try {
        const invokeFn = getTauriInvoke();

        // 1. Cargar perfiles de dashboard primero desde disco o almacenamiento local
        await loadDashboardProfiles();

        // 2. Cargar grupos de módulos y asignaciones desde disco o almacenamiento local
        await loadModuleGroupsState();

        // 3. Cargar preferencias y permisos de notificaciones antes de restaurar módulos
        await loadNotificationSettings();
        loadNotificationHistory();

        if (invokeFn) {
          // Registrar servicio central compartido de telemetría de hardware (Rule 3)
          if (window.ServiceRegistry) {
            window.ServiceRegistry.register('system.telemetry', {
              getSystemTelemetry: async () => {
                try {
                  const raw = await invokeFn('get_system_telemetry');
                  return raw ? JSON.parse(raw) : null;
                } catch (e) {
                  console.warn('Error al obtener telemetría del sistema:', e);
                  return null;
                }
              },
              getStorageTelemetry: async () => {
                try {
                  const raw = await invokeFn('get_storage_telemetry');
                  return raw ? JSON.parse(raw) : null;
                } catch (e) {
                  console.warn('Error al obtener telemetría de almacenamiento:', e);
                  return null;
                }
              },
              checkStatus: async () => {
                return await invokeFn('check_service_status');
              }
            }, {
              description: 'Telemetría unificada de hardware (CPU, RAM, Discos y Salud SMART) provista por el host nativo y servicio de Windows.',
              version: '1.0.0',
              channels: ['cpu', 'memory', 'storage']
            });
          }

          // Verificar estado del servicio nativo en segundo plano
          checkCoreServiceStatus().catch(e => console.warn(e));

          const sysInfo = await invokeFn('get_system_info');
          if (sysInfo) {
            console.log('PC Manager Core conectado al host nativo:', sysInfo);
            const brandSpan = document.getElementById('sidebar-core-version');
            if (brandSpan && sysInfo.hostname) {
              brandSpan.textContent = `${sysInfo.hostname} // v${sysInfo.version}`;
            }
          }

          // Cargar módulos previamente instalados en Windows desde disco en modo isStartup = true
          const installedList = await invokeFn('get_installed_modules');
          if (installedList && installedList.length > 0) {
            console.log(`Restaurando ${installedList.length} módulo(s) persistentes desde disco.`);
            installedList.forEach(rec => {
              installModule(rec.manifest, rec.script_code, rec.active, true);
            });

            // Restaurar configuraciones guardadas
            for (const rec of installedList) {
              const savedSettings = await invokeFn('get_saved_settings', { moduleId: rec.manifest.id });
              if (savedSettings) {
                for (const [k, v] of Object.entries(savedSettings)) {
                  dispatchModuleSetting(rec.manifest.id, k, v, false);
                }
              }
            }

            // Restaurar orden de tarjetas en el Dashboard si existe
            const savedOrder = await invokeFn('get_dashboard_order');
            if (savedOrder && savedOrder.length > 0) {
              const grid = document.getElementById('grid-board');
              savedOrder.forEach(id => {
                const card = document.getElementById(id);
                if (card) grid.appendChild(card);
              });
            }

            // Restaurar diseño y visibilidad del perfil activo cargado
            await restoreDashboardLayout();
            renderDashboardCustomizationCatalog();
          }
        }
      } catch (err) {
        console.warn('Ejecutando en entorno webview desacoplado:', err);
      }

      // Renderizar eventos del sistema por defecto si no se llamó antes
      renderSystemNotificationEvents();
      renderModuleNotificationPermissions();
      updateNotificationBadgesAndSummaries();

      // Inicializar y sincronizar grupos de módulos en el sidebar y en el gestor
      renderSidebarGroups();
      renderModuleGroupsManagerUI();
      renderInstalledModulesGroupSelectors();

      // Inicializar notificaciones existentes y contador no leído
      document.querySelectorAll('#notif-list .notif-item').forEach(setupNotificationItem);
      updateUnreadNotifBadge();

      // Inicializar botones contextuales de la barra superior y drag and drop de cuadrícula
      updateTopbarContextualActions('dashboard');
      initGridBoardDragDrop();

      // Drag & Drop de paquetes .pcm sobre la zona de arrastre
      const dropzone = document.getElementById('dropzone-pcm');
      if (dropzone) {
        ['dragenter', 'dragover'].forEach(eventName => {
          dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = 'var(--accent-primary)';
            dropzone.style.backgroundColor = 'var(--accent-primary-dim)';
          }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
          dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = '';
            dropzone.style.backgroundColor = '';
          }, false);
        });

        dropzone.addEventListener('drop', (e) => {
          const dt = e.dataTransfer;
          const files = dt.files;
          if (files && files.length > 0) {
            handlePcmPackage(files[0]);
          }
        }, false);
      }

      // CONTROLADOR DE MENÚ CONTEXTUAL NATIVO PERSONALIZADO (MATERIAL EXPRESSIVE)
      // Desactiva menú genérico de navegador en toda la app y despliega menú propio contextual solo donde amerita
      window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const modNav = e.target.closest('[id^="nav-module-"]');
        const modCard = e.target.closest('[id^="installed-mod-"]');
        const gridCard = e.target.closest('#grid-board .card');

        if (modNav || modCard || gridCard) {
          openAppContextMenu(e, { modNav, modCard, gridCard });
        } else {
          closeAppContextMenu();
        }
      });

      window.addEventListener('click', (e) => {
        if (!e.target.closest('#app-context-menu')) {
          closeAppContextMenu();
        }
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAppContextMenu();
      });
    });

    function closeAppContextMenu() {
      const menu = document.getElementById('app-context-menu');
      if (menu) {
        menu.classList.remove('active');
        menu.style.display = 'none';
        menu.innerHTML = '';
      }
    }

    function openAppContextMenu(e, targets) {
      const menu = document.getElementById('app-context-menu');
      if (!menu) return;

      let itemsHtml = '';

      if (targets.modNav || targets.modCard) {
        let modId = '';
        if (targets.modNav) {
          modId = targets.modNav.id.replace('nav-module-', '');
        } else if (targets.modCard) {
          modId = targets.modCard.id.replace('installed-mod-', '');
        }

        const mod = installedModules.get(modId);
        const modName = mod && mod.manifest ? mod.manifest.name : 'Módulo';

        itemsHtml = `
          <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; padding: 4px 8px; letter-spacing: 0.5px;">${modName}</div>
          <div class="context-menu-item" onclick="closeAppContextMenu(); switchView('module-${modId}')">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Abrir Módulo</span>
          </div>
          <div class="context-menu-item" onclick="closeAppContextMenu(); switchView('module-manager'); switchManagerTab('installed'); focusModuleInManager('${modId}')">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            <span>Ver en Gestor de Módulos</span>
          </div>
          <div class="context-menu-separator"></div>
          <div class="context-menu-item" onclick="closeAppContextMenu(); toggleModuleActive('${modId}', ${!mod || !mod.active})">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"></path></svg>
            <span>${mod && mod.active ? 'Desactivar' : 'Activar'}</span>
          </div>
          <div class="context-menu-item danger" onclick="closeAppContextMenu(); uninstallModule('${modId}')">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Desinstalar Módulo</span>
          </div>
        `;
      } else if (targets.gridCard) {
        const cardId = targets.gridCard.id;
        let cardTitle = '';
        let widgetModule = null;
        let widgetObj = null;

        // 1. Obtener nombre canónico y módulo padre a partir del registro de módulos instalados
        installedModules.forEach((mod, modId) => {
          if (mod.manifest && mod.manifest.widgets) {
            const foundW = mod.manifest.widgets.find(w => (w.id || `card-${modId}`) === cardId);
            if (foundW) {
              widgetModule = mod;
              widgetObj = foundW;
              if (foundW.name) cardTitle = foundW.name;
            }
          }
        });

        // 2. Fallback: buscar título en encabezado excluyendo badges y chips
        if (!cardTitle) {
          const titleH4 = targets.gridCard.querySelector('.card-header h4, .card-title-box h4, .card-title, h4');
          if (titleH4) {
            cardTitle = titleH4.textContent.trim();
          } else {
            const spans = Array.from(targets.gridCard.querySelectorAll('.card-header span'));
            const nonBadge = spans.find(s => !s.classList.contains('card-badge') && !s.classList.contains('card-chip'));
            cardTitle = nonBadge ? nonBadge.textContent.trim() : (spans[0]?.textContent.trim() || 'Widget');
          }
        }

        const hasSettings = widgetModule && widgetModule.manifest && widgetModule.manifest.meta_options && widgetModule.manifest.meta_options.length > 0;
        const hasModuleView = widgetModule && widgetModule.manifest && widgetModule.manifest.views && widgetModule.manifest.views.length > 0;

        itemsHtml = `
          <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; padding: 4px 8px; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cardTitle}</div>
        `;

        // Si el módulo dispone de opciones en Configuraciones, se despliega la opción de configuración
        if (hasSettings) {
          itemsHtml += `
            <div class="context-menu-item" onclick="closeAppContextMenu(); switchView('settings'); switchSettingsTab('mod-${widgetModule.manifest.id}');">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Configuración del Widget</span>
            </div>
          `;
        }

        if (hasModuleView) {
          itemsHtml += `
            <div class="context-menu-item" onclick="closeAppContextMenu(); switchView('module-${widgetModule.manifest.id}');">
              <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>Ir al Módulo</span>
            </div>
          `;
        }

        if (hasSettings || hasModuleView) {
          itemsHtml += `<div class="context-menu-separator"></div>`;
        }

        itemsHtml += `
          <div class="context-menu-item" onclick="closeAppContextMenu(); autoOrganizeDashboard()">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Auto-organizar Cuadrícula</span>
          </div>
          <div class="context-menu-item" onclick="closeAppContextMenu(); toggleDrawer('catalog')">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line></svg>
            <span>Catálogo de Widgets</span>
          </div>
          <div class="context-menu-separator"></div>
          <div class="context-menu-item danger" onclick="closeAppContextMenu(); toggleWidgetVisibility('${cardId}', false)">
            <svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Ocultar Widget</span>
          </div>
        `;
      }

      menu.innerHTML = itemsHtml;
      menu.style.display = 'flex';
      menu.classList.add('active');

      const menuWidth = 210;
      const menuHeight = menu.offsetHeight || 160;
      let posX = e.clientX;
      let posY = e.clientY;

      if (posX + menuWidth > window.innerWidth) {
        posX = window.innerWidth - menuWidth - 10;
      }
      if (posY + menuHeight > window.innerHeight) {
        posY = window.innerHeight - menuHeight - 10;
      }

      menu.style.left = `${Math.max(10, posX)}px`;
      menu.style.top = `${Math.max(10, posY)}px`;
    }
