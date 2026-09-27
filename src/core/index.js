/**
 * PC Manager Core - Microkernel Entrypoint
 * Version: 0.0.4
 * 
 * Orquestador principal que integra el EventBus, ServiceRegistry,
 * ModuleManager, ThemeEngine y LifecycleManager.
 */

import { EventBus } from './event_bus.js';
import { ServiceRegistry } from './service_registry.js';
import { ModuleManager, validateModuleId, validateSemVer, WINDOWS_RESERVED_NAMES } from './module_manager.js';
import { ThemeEngine } from './theme_engine.js';
import { LifecycleManager } from './lifecycle_manager.js';

export class PCManagerCore {
  constructor() {
    this.version = '0.0.4';
    this.eventBus = new EventBus();
    this.serviceRegistry = new ServiceRegistry();
    this.moduleManager = new ModuleManager(this.eventBus, this.serviceRegistry);
    this.themeEngine = new ThemeEngine(this.eventBus);
    this.lifecycle = new LifecycleManager(this.eventBus, this.serviceRegistry, this.moduleManager);
  }

  /**
   * Inicializa el núcleo y los subsistemas.
   * @param {object} [initialConfig={}]
   */
  async init(initialConfig = {}) {
    // 1. Iniciar motor de temas
    this.themeEngine.init(initialConfig.theme);

    // 2. Iniciar ciclo de vida
    await this.lifecycle.boot(initialConfig.windows);

    console.info(`[PCManagerCore] Sistema inicializado correctamente (v${this.version}).`);
    return this;
  }
}

// Instancia singleton por defecto
export const core = new PCManagerCore();

export {
  EventBus,
  ServiceRegistry,
  ModuleManager,
  ThemeEngine,
  LifecycleManager,
  validateModuleId,
  validateSemVer,
  WINDOWS_RESERVED_NAMES
};
