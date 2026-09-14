/**
 * PC Manager Core - Service Registry
 * Version: 0.0.1-alpha
 * 
 * Gestiona el registro y consumo de servicios compartidos entre módulos,
 * evitando la duplicación de código y desacoplando implementaciones concretas.
 */

export class ServiceRegistry {
  constructor() {
    /** @type {Map<string, { id: string, version: string, provider: string, instance: any, metadata: object }>} */
    this.services = new Map();
  }

  /**
   * Registra un servicio compartido en el microkernel.
   * @param {string} id Identificador único con namespace (ej. 'telemetry:hardware')
   * @param {string} version Versión SemVer del servicio
   * @param {string} provider Identificador del módulo que ofrece el servicio
   * @param {any} instance Objeto o API ejecutable del servicio
   * @param {Record<string, unknown>} [metadata={}] Metadatos adicionales
   */
  registerService(id, version, provider, instance, metadata = {}) {
    if (!id || typeof id !== 'string') {
      throw new Error('[ServiceRegistry] El identificador del servicio es inválido.');
    }
    if (!instance) {
      throw new Error(`[ServiceRegistry] No se puede registrar una instancia nula para '${id}'.`);
    }
    if (this.services.has(id)) {
      const existing = this.services.get(id);
      throw new Error(`[ServiceRegistry] Conflicto: el servicio '${id}' ya está provisto por '${existing.provider}'.`);
    }

    this.services.set(id, {
      id,
      version: version || '0.0.1',
      provider: provider || 'core',
      instance,
      metadata
    });
  }

  /**
   * Recupera la instancia de un servicio registrado.
   * @template T
   * @param {string} id
   * @returns {T}
   */
  getService(id) {
    if (!this.services.has(id)) {
      throw new Error(`[ServiceRegistry] El servicio requerido '${id}' no se encuentra registrado.`);
    }
    return this.services.get(id).instance;
  }

  /**
   * Verifica si un servicio está registrado.
   * @param {string} id
   * @returns {boolean}
   */
  hasService(id) {
    return this.services.has(id);
  }

  /**
   * Desregistra un servicio provisto por un módulo específico.
   * @param {string} id
   * @param {string} [provider] Proveedor autorizado para desregistrar
   * @returns {boolean}
   */
  unregisterService(id, provider = null) {
    if (!this.services.has(id)) return false;
    const service = this.services.get(id);
    if (provider && service.provider !== provider) {
      console.warn(`[ServiceRegistry] Intento no autorizado de desregistrar servicio '${id}' por '${provider}'.`);
      return false;
    }
    return this.services.delete(id);
  }

  /**
   * Desregistra todos los servicios provistos por un módulo.
   * @param {string} provider
   */
  unregisterAllFromProvider(provider) {
    for (const [id, service] of this.services.entries()) {
      if (service.provider === provider) {
        this.services.delete(id);
      }
    }
  }

  /**
   * Retorna una lista descriptiva de los servicios activos.
   */
  listServices() {
    return Array.from(this.services.values()).map(s => ({
      id: s.id,
      version: s.version,
      provider: s.provider,
      metadata: s.metadata
    }));
  }

  /**
   * Limpia el registro de servicios.
   */
  clear() {
    this.services.clear();
  }
}
