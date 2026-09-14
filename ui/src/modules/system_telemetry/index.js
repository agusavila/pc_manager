/**
 * Módulo Canónico: Telemetría del Sistema
 * Version: 0.0.1-alpha
 * 
 * Monitorea y expone el servicio compartido 'telemetry:hardware'
 * respetando estrictamente los principios de Marca Blanca y neutralidad técnica.
 */

export class SystemTelemetryModule {
  constructor() {
    this.id = 'system-telemetry';
    this.name = 'Telemetría del Sistema';
    this.version = '0.0.1';
    this.group = 'General';
    this.dependencies = [];
    this.serviceDependencies = [];

    this.timer = null;
    this.metrics = {
      cpuUsage: 18,
      ramUsage: 42,
      ramTotalGB: 32,
      ramUsedGB: 13.4,
      storageUsage: 61,
      storageTotalGB: 960,
      storageFreeGB: 374,
      networkActivityKBps: 245
    };
  }

  /**
   * Servicios exportados al ServiceRegistry.
   */
  getProvidedServices() {
    return [
      {
        id: 'telemetry:hardware',
        version: '0.0.1',
        instance: {
          getSnapshot: () => ({ ...this.metrics }),
          subscribeToMetrics: (callback) => {
            // Callback opcional de suscripción directa
          }
        },
        metadata: {
          description: 'Servicio neutral de métricas operativas del sistema',
          provider: this.id
        }
      }
    ];
  }

  /**
   * Inicialización del módulo con sandboxing.
   * @param {object} context
   */
  async init(context) {
    this.context = context;
    
    // Iniciar colector de fondo simulado
    this.timer = setInterval(() => {
      this._updateMetrics();
      if (this.context && this.context.eventBus) {
        this.context.eventBus.publish('telemetry.hardware.updated', { ...this.metrics }, this.id);
      }
    }, 2000);

    console.info(`[${this.id}] Módulo de telemetría inicializado.`);
  }

  /**
   * Parada limpia de colectores e hilos.
   */
  async destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.info(`[${this.id}] Colectores de telemetría detenidos.`);
  }

  /**
   * Retorna la definición de tarjeta para el Dashboard interactivo.
   */
  getDashboardCards() {
    return [
      {
        id: 'card-system-overview',
        moduleId: this.id,
        title: 'Rendimiento Global del Sistema',
        size: '2x1',
        render: (container) => {
          container.innerHTML = `
            <div class="card-telemetry-widget">
              <div class="metrics-grid">
                <div class="metric-item">
                  <span class="metric-label">Procesador (CPU)</span>
                  <div class="metric-value-row">
                    <span class="metric-value" id="val-cpu">${this.metrics.cpuUsage}%</span>
                    <span class="metric-sub">Carga normal</span>
                  </div>
                  <div class="progress-track"><div class="progress-bar" id="bar-cpu" style="width: ${this.metrics.cpuUsage}%"></div></div>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Memoria del Sistema (RAM)</span>
                  <div class="metric-value-row">
                    <span class="metric-value" id="val-ram">${this.metrics.ramUsage}%</span>
                    <span class="metric-sub">${this.metrics.ramUsedGB} / ${this.metrics.ramTotalGB} GB</span>
                  </div>
                  <div class="progress-track"><div class="progress-bar" id="bar-ram" style="width: ${this.metrics.ramUsage}%"></div></div>
                </div>
              </div>
              <div class="card-actions-row">
                <button class="btn btn-secondary btn-sm" id="btn-toggle-collector" type="button">
                  <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  <span>Muestreo Activo (2s)</span>
                </button>
              </div>
            </div>
          `;
        }
      }
    ];
  }

  _updateMetrics() {
    // Variación orgánica simulada de métricas neutrales
    this.metrics.cpuUsage = Math.min(95, Math.max(8, Math.round(this.metrics.cpuUsage + (Math.random() * 8 - 4))));
    this.metrics.ramUsage = Math.min(92, Math.max(30, Math.round(this.metrics.ramUsage + (Math.random() * 4 - 2))));
    this.metrics.ramUsedGB = parseFloat(((this.metrics.ramUsage / 100) * this.metrics.ramTotalGB).toFixed(1));
    this.metrics.networkActivityKBps = Math.round(150 + Math.random() * 400);
  }
}

export const telemetryModule = new SystemTelemetryModule();
