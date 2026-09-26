/**
 * PC Manager Core - Module Manager
 * Version: 0.0.4
 * 
 * Gestiona el ciclo de vida de los módulos (plugins), resolución de dependencias
 * y agrupación dinámica con grupo 'General' canónico predeterminado e inborrable.
 */

export const WINDOWS_RESERVED_NAMES = [
  'con', 'prn', 'aux', 'nul',
  'com0', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt0', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
];

/**
 * Valida rigurosamente el identificador de un módulo (Fase 3).
 * Formato regex estricto: ^[a-z0-9][a-z0-9._-]{0,63}$
 * @param {string} id
 * @returns {boolean}
 */
export function validateModuleId(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('El identificador del módulo no puede estar vacío.');
  }
  if (/\s/.test(id)) {
    throw new Error('El identificador del módulo no puede contener espacios en blanco.');
  }
  if (id.length > 64) {
    throw new Error(`El identificador del módulo excede el límite de 64 caracteres (longitud: ${id.length}).`);
  }
  if (id === '.' || id === '..') {
    throw new Error(`Identificador de módulo inválido: '${id}'.`);
  }
  if (id.includes('..') || id.includes('/') || id.includes('\\') || id.includes(':')) {
    throw new Error(`El ID del módulo no puede contener rutas relativas ni separadores de directorio: '${id}'.`);
  }
  const baseName = id.split('.')[0].toLowerCase();
  const fullLower = id.toLowerCase();
  if (WINDOWS_RESERVED_NAMES.includes(baseName) || WINDOWS_RESERVED_NAMES.includes(fullLower)) {
    throw new Error(`El ID del módulo utiliza un nombre reservado de Windows incompatible con el sistema de archivos: '${baseName}'.`);
  }
  const first = id[0];
  if (!/^[a-z0-9]$/.test(first)) {
    throw new Error(`El ID del módulo debe comenzar con una letra minúscula o número (obtenido: '${first}').`);
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(id)) {
    throw new Error(`El ID del módulo contiene caracteres no permitidos: '${id}'. Solo se permiten minúsculas, números, puntos, guiones y guiones bajos.`);
  }
  return true;
}

export class ModuleManager {
  /**
   * @param {import('./event_bus.js').EventBus} eventBus
   * @param {import('./service_registry.js').ServiceRegistry} serviceRegistry
   */
  constructor(eventBus, serviceRegistry) {
    this.eventBus = eventBus;
    this.serviceRegistry = serviceRegistry;

    /** @type {Map<string, { definition: any, enabled: boolean, status: string }>} */
    this.modules = new Map();

    /** @type {Set<string>} */
    this.groups = new Set(['General']);
  }

  /**
   * Registra un nuevo módulo en el sistema.
   * @param {object} moduleDef Definición o instancia del módulo
   * @returns {Promise<boolean>}
   */
  async registerModule(moduleDef) {
    if (!moduleDef || !moduleDef.id || typeof moduleDef.id !== 'string') {
      throw new Error('[ModuleManager] El módulo carece de un identificador válido.');
    }
    validateModuleId(moduleDef.id);
    if (this.modules.has(moduleDef.id)) {
      throw new Error(`[ModuleManager] El módulo '${moduleDef.id}' ya se encuentra registrado.`);
    }

    const group = moduleDef.group ? moduleDef.group.trim() : 'General';
    this.ensureGroupExists(group);

    const record = {
      definition: moduleDef,
      enabled: moduleDef.enabled !== false,
      status: 'REGISTERED'
    };

    this.modules.set(moduleDef.id, record);

    // Si está habilitado por defecto, intentar inicializar
    if (record.enabled) {
      await this._initializeModule(record);
    }

    await this.eventBus.publish('module.registered', {
      moduleId: moduleDef.id,
      name: moduleDef.name,
      group,
      enabled: record.enabled
    });

    return true;
  }

  /**
   * Inicializa un módulo registrado respetando contratos y dependencias.
   * @private
   */
  async _initializeModule(record) {
    const mod = record.definition;

    // 1. Validar dependencias de otros módulos
    if (Array.isArray(mod.dependencies)) {
      for (const depId of mod.dependencies) {
        const depRecord = this.modules.get(depId);
        if (!depRecord || !depRecord.enabled) {
          record.status = 'BLOCKED_DEPENDENCY';
          console.warn(`[ModuleManager] Módulo '${mod.id}' bloqueado: falta dependencia '${depId}'.`);
          return false;
        }
      }
    }

    // 2. Validar servicios requeridos en el ServiceRegistry
    if (Array.isArray(mod.serviceDependencies)) {
      for (const serviceId of mod.serviceDependencies) {
        if (!this.serviceRegistry.hasService(serviceId)) {
          record.status = 'BLOCKED_SERVICE';
          console.warn(`[ModuleManager] Módulo '${mod.id}' bloqueado: falta servicio '${serviceId}'.`);
          return false;
        }
      }
    }

    // 3. Exportar servicios provistos por el módulo al ServiceRegistry
    if (typeof mod.getProvidedServices === 'function') {
      try {
        const services = mod.getProvidedServices() || [];
        for (const s of services) {
          this.serviceRegistry.registerService(s.id, s.version, mod.id, s.instance, s.metadata);
        }
      } catch (err) {
        console.error(`[ModuleManager] Error registrando servicios de '${mod.id}':`, err);
        record.status = 'ERROR';
        return false;
      }
    }

    // 4. Invocar hook de inicio (init) con sandboxing
    if (typeof mod.init === 'function') {
      try {
        const context = {
          eventBus: this.eventBus,
          serviceRegistry: this.serviceRegistry,
          moduleId: mod.id
        };
        await mod.init(context);
        record.status = 'ACTIVE';
      } catch (err) {
        console.error(`[ModuleManager] Excepción en init() de módulo '${mod.id}':`, err);
        record.status = 'ERROR';
        // Revertir servicios provistos si falla la inicialización
        this.serviceRegistry.unregisterAllFromProvider(mod.id);
        return false;
      }
    } else {
      record.status = 'ACTIVE';
    }

    return true;
  }

  /**
   * Habilita o deshabilita un módulo en tiempo de ejecución.
   * @param {string} moduleId
   * @param {boolean} enabled
   */
  async setModuleEnabled(moduleId, enabled) {
    const record = this.modules.get(moduleId);
    if (!record) {
      throw new Error(`[ModuleManager] Módulo '${moduleId}' no encontrado.`);
    }

    if (record.enabled === enabled) return;

    record.enabled = enabled;

    if (enabled) {
      await this._initializeModule(record);
      await this.eventBus.publish('module.enabled', { moduleId });
    } else {
      await this._teardownModule(record);
      record.status = 'DISABLED';
      await this.eventBus.publish('module.disabled', { moduleId });
    }
  }

  /**
   * Desmantela y limpia los recursos de un módulo.
   * @private
   */
  async _teardownModule(record) {
    const mod = record.definition;

    // Retirar servicios del ServiceRegistry
    this.serviceRegistry.unregisterAllFromProvider(mod.id);

    // Invocar método destroy si existe
    if (typeof mod.destroy === 'function') {
      try {
        await mod.destroy();
      } catch (err) {
        console.error(`[ModuleManager] Error en destroy() de '${mod.id}':`, err);
      }
    }
  }

  /**
   * Desregistra completamente un módulo del sistema.
   * @param {string} moduleId
   */
  async unregisterModule(moduleId) {
    const record = this.modules.get(moduleId);
    if (!record) return false;

    await this._teardownModule(record);
    this.modules.delete(moduleId);

    await this.eventBus.publish('module.unregistered', { moduleId });
    return true;
  }

  /**
   * Asegura la existencia de un grupo de módulos.
   * @param {string} groupName
   */
  ensureGroupExists(groupName) {
    if (!groupName) return;
    this.groups.add(groupName.trim());
  }

  /**
   * Crea un nuevo grupo personalizado de módulos.
   * @param {string} groupName
   */
  createGroup(groupName) {
    if (!groupName || !groupName.trim()) {
      throw new Error('[ModuleManager] El nombre del grupo no puede estar vacío.');
    }
    const cleanName = groupName.trim();
    this.groups.add(cleanName);
    return cleanName;
  }

  /**
   * Elimina un grupo de módulos. Los módulos pertenecientes
   * son reasignados automáticamente al grupo 'General'.
   * El grupo 'General' no puede ser eliminado.
   * @param {string} groupName
   */
  deleteGroup(groupName) {
    const cleanName = groupName.trim();
    if (cleanName.toLowerCase() === 'general') {
      throw new Error("[ModuleManager] El grupo predeterminado 'General' es inborrable.");
    }

    if (!this.groups.has(cleanName)) return false;

    // Reasignar módulos al grupo General
    for (const record of this.modules.values()) {
      if (record.definition.group === cleanName) {
        record.definition.group = 'General';
      }
    }

    this.groups.delete(cleanName);

    this.eventBus.publish('module.group_deleted', {
      deletedGroup: cleanName,
      fallbackGroup: 'General'
    });

    return true;
  }

  /**
   * Retorna el estado de visualización de grupos,
   * ocultando automáticamente aquellos sin módulos habilitados.
   */
  getGroupVisibility() {
    const result = {};
    for (const group of this.groups) {
      const activeCount = Array.from(this.modules.values()).filter(
        m => (m.definition.group || 'General') === group && m.enabled && m.status === 'ACTIVE'
      ).length;

      result[group] = {
        name: group,
        visible: activeCount > 0,
        activeModulesCount: activeCount,
        isDefault: group === 'General'
      };
    }
    return result;
  }

  /**
   * Lista todos los módulos registrados.
   */
  listModules() {
    return Array.from(this.modules.values()).map(r => ({
      id: r.definition.id,
      name: r.definition.name,
      version: r.definition.version,
      group: r.definition.group || 'General',
      enabled: r.enabled,
      status: r.status,
      dependencies: r.definition.dependencies || [],
      serviceDependencies: r.definition.serviceDependencies || []
    }));
  }
}
