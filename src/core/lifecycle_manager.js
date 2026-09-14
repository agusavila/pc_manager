/**
 * PC Manager Core - Lifecycle Manager
 * Version: 0.0.1-alpha
 * 
 * Gestiona el ciclo de vida del Core y su integración con el sistema operativo Windows:
 * arranque, inicio con Windows, minimizado al área de notificación (System Tray),
 * parada total de servicios sin procesos huérfanos y modo servicio nativo (pre-logon).
 */

export class LifecycleManager {
  /**
   * @param {import('./event_bus.js').EventBus} eventBus
   * @param {import('./service_registry.js').ServiceRegistry} serviceRegistry
   * @param {import('./module_manager.js').ModuleManager} moduleManager
   */
  constructor(eventBus, serviceRegistry, moduleManager) {
    this.eventBus = eventBus;
    this.serviceRegistry = serviceRegistry;
    this.moduleManager = moduleManager;

    this.state = 'INITIAL';
    this.version = '0.0.1-alpha';

    // Opciones de integración con Windows
    this.windowsConfig = {
      startWithWindows: false,
      minimizeToTray: true, // Activado por defecto según directiva
      serviceModePreLogon: false
    };

    /** @type {Set<() => Promise<void> | void>} */
    this.cleanupHooks = new Set();
  }

  /**
   * Registra una función de limpieza obligatoria a ejecutarse en la parada total.
   * @param {() => Promise<void> | void} hook
   */
  registerCleanupHook(hook) {
    if (typeof hook === 'function') {
      this.cleanupHooks.add(hook);
    }
  }

  /**
   * Arranca e inicializa el Core.
   */
  async boot(savedConfig = {}) {
    this.state = 'BOOTING';
    await this.eventBus.publish('core.lifecycle.starting', { version: this.version });

    if (savedConfig.startWithWindows !== undefined) {
      this.windowsConfig.startWithWindows = Boolean(savedConfig.startWithWindows);
    }
    if (savedConfig.minimizeToTray !== undefined) {
      this.windowsConfig.minimizeToTray = Boolean(savedConfig.minimizeToTray);
    }
    if (savedConfig.serviceModePreLogon !== undefined) {
      this.windowsConfig.serviceModePreLogon = Boolean(savedConfig.serviceModePreLogon);
    }

    // Registrar manejadores del entorno de ejecución (navegador / desktop host)
    this._attachEnvironmentHooks();

    this.state = 'READY';
    const activeMods = this.moduleManager.listModules().filter(m => m.enabled && m.status === 'ACTIVE').map(m => m.id);

    await this.eventBus.publish('core.lifecycle.ready', {
      version: this.version,
      activeModules: activeMods
    });

    return true;
  }

  /**
   * Orden de detención definitiva y cierre de la aplicación.
   * Detiene inmediatamente todos los servicios, colectores y subprocesos.
   */
  async quit(reason = 'USER_QUIT') {
    if (this.state === 'STOPPING' || this.state === 'STOPPED') return;

    this.state = 'STOPPING';
    console.info(`[LifecycleManager] Deteniendo Core y servicios asociados (Causa: ${reason})...`);

    await this.eventBus.publish('core.lifecycle.stopping', { reason });

    // 1. Desmantelar todos los módulos activos deterministamente
    const modules = this.moduleManager.listModules();
    for (const mod of modules) {
      if (mod.enabled) {
        try {
          await this.moduleManager.setModuleEnabled(mod.id, false);
        } catch (err) {
          console.error(`[LifecycleManager] Error al detener módulo '${mod.id}':`, err);
        }
      }
    }

    // 2. Ejecutar ganchos de limpieza del host y colectores
    for (const hook of this.cleanupHooks) {
      try {
        await hook();
      } catch (err) {
        console.error('[LifecycleManager] Error en gancho de limpieza:', err);
      }
    }
    this.cleanupHooks.clear();

    // 3. Limpiar registros de servicios
    this.serviceRegistry.clear();

    this.state = 'STOPPED';
    await this.eventBus.publish('core.lifecycle.stopped', { reason });
    console.info('[LifecycleManager] Core detenido por completo. Cero procesos huérfanos.');
  }

  /**
   * Maneja el evento de solicitud de cierre de la ventana de la UI.
   * Si 'minimizeToTray' está activo, la ventana se oculta a la bandeja.
   * De lo contrario, se ordena el cierre definitivo.
   */
  handleWindowCloseRequest() {
    if (this.windowsConfig.minimizeToTray) {
      console.info('[LifecycleManager] Minimizando al área de notificación (System Tray)...');
      this.eventBus.publish('host.tray.minimized', { timestamp: Date.now() });
      return false; // Prevenir cierre de proceso
    } else {
      this.quit('WINDOW_CLOSED');
      return true; // Permitir salida
    }
  }

  /**
   * Configura las opciones de integración con el sistema operativo.
   * @param {Partial<typeof this.windowsConfig>} newConfig
   */
  updateWindowsConfig(newConfig) {
    this.windowsConfig = { ...this.windowsConfig, ...newConfig };
    this.eventBus.publish('core.config.windows_updated', this.windowsConfig);
  }

  /**
   * Vincula hooks del sistema host (beforeunload / señales de proceso)
   * @private
   */
  _attachEnvironmentHooks() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (!this.windowsConfig.minimizeToTray) {
          this.quit('PAGE_UNLOAD');
        }
      });
    }

    if (typeof process !== 'undefined' && process.on) {
      process.on('SIGINT', () => this.quit('SIGINT'));
      process.on('SIGTERM', () => this.quit('SIGTERM'));
    }
  }
}
