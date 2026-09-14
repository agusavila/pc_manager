/**
 * PC Manager Core - Event Bus
 * Version: 0.0.1-alpha
 * 
 * Implementa un bus de eventos pub/sub desacoplado y tipado
 * para la comunicación inter-modular sin dependencias directas.
 */

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.subscribers = new Map();
  }

  /**
   * Suscribe una función manejadora a un tópico.
   * @param {string} topic Tópico en formato 'dominio.entidad.accion' o comodín 'dominio.*'
   * @param {Function} handler Función callback (event) => void
   * @returns {() => void} Función para desuscribirse
   */
  subscribe(topic, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`[EventBus] El handler para el tópico '${topic}' debe ser una función.`);
    }

    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }

    const handlers = this.subscribers.get(topic);
    handlers.add(handler);

    return () => this.unsubscribe(topic, handler);
  }

  /**
   * Remueve una suscripción existente.
   * @param {string} topic
   * @param {Function} handler
   */
  unsubscribe(topic, handler) {
    if (!this.subscribers.has(topic)) return;
    const handlers = this.subscribers.get(topic);
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.subscribers.delete(topic);
    }
  }

  /**
   * Publica un evento sincrónico o asincrónico a los suscriptores.
   * @param {string} topic
   * @param {unknown} [data=null]
   * @param {string} [source='core'] Identificador del origen
   * @returns {Promise<void>}
   */
  async publish(topic, data = null, source = 'core') {
    const event = {
      id: this._generateUUID(),
      timestamp: Date.now(),
      source,
      topic,
      data
    };

    const promises = [];

    // Notificar suscriptores exactos
    if (this.subscribers.has(topic)) {
      for (const handler of this.subscribers.get(topic)) {
        try {
          const res = handler(event);
          if (res instanceof Promise) promises.push(res);
        } catch (err) {
          console.error(`[EventBus] Error en manejador de tópico '${topic}':`, err);
        }
      }
    }

    // Notificar suscriptores globales o de comodín (ej. 'core.*')
    for (const [registeredTopic, handlers] of this.subscribers.entries()) {
      if (registeredTopic.endsWith('.*')) {
        const prefix = registeredTopic.slice(0, -2);
        if (topic.startsWith(prefix) && registeredTopic !== topic) {
          for (const handler of handlers) {
            try {
              const res = handler(event);
              if (res instanceof Promise) promises.push(res);
            } catch (err) {
              console.error(`[EventBus] Error en manejador con comodín '${registeredTopic}':`, err);
            }
          }
        }
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * Limpia todos los suscriptores activos.
   */
  clear() {
    this.subscribers.clear();
  }

  /**
   * Generador de identificadores universales neutrales.
   * @private
   */
  _generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'ev-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
  }
}
