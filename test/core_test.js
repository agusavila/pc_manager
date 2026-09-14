/**
 * PC Manager Core - Pruebas Unitarias de Arquitectura (Alpha 0.0.1)
 */

import assert from 'node:assert/strict';
import { PCManagerCore } from '../src/core/index.js';

async function runTests() {
  console.log('--- Iniciando Pruebas Unitarias del Core ---');

  const core = new PCManagerCore();
  assert.equal(core.version, '0.0.1-alpha', 'Versión debe ser 0.0.1-alpha');

  // 1. Prueba de EventBus
  console.log('1. Verificando EventBus...');
  let eventReceived = false;
  const unsub = core.eventBus.subscribe('test.event', (e) => {
    assert.equal(e.data.msg, 'hola', 'Datos de evento correctos');
    eventReceived = true;
  });
  await core.eventBus.publish('test.event', { msg: 'hola' }, 'test-suite');
  assert.equal(eventReceived, true, 'El evento debe haber sido recibido');
  unsub();

  // 2. Prueba de ServiceRegistry
  console.log('2. Verificando ServiceRegistry...');
  const fakeService = { getReading: () => 42 };
  core.serviceRegistry.registerService('telemetry:test', '1.0.0', 'mod-test', fakeService);
  assert.equal(core.serviceRegistry.hasService('telemetry:test'), true);
  assert.equal(core.serviceRegistry.getService('telemetry:test').getReading(), 42);

  // Colisión de servicio
  assert.throws(() => {
    core.serviceRegistry.registerService('telemetry:test', '1.0.0', 'mod-other', fakeService);
  }, /Conflicto/);

  // 3. Prueba de ModuleManager y Grupos
  console.log('3. Verificando ModuleManager y Grupos...');
  const testModule = {
    id: 'cooler-controller',
    name: 'Control de Enfriamiento',
    version: '0.0.1',
    group: 'Refrigeracion',
    enabled: true,
    serviceDependencies: ['telemetry:test'],
    async init(ctx) {
      this.initialized = true;
    },
    async destroy() {
      this.initialized = false;
    }
  };

  await core.moduleManager.registerModule(testModule);
  assert.equal(testModule.initialized, true, 'Módulo debe haberse inicializado');
  assert.equal(core.moduleManager.groups.has('Refrigeracion'), true, 'Grupo personalizado creado');

  // Comprobar visibilidad de grupo
  const visibility = core.moduleManager.getGroupVisibility();
  assert.equal(visibility['Refrigeracion'].visible, true);
  assert.equal(visibility['General'].isDefault, true);

  // Ocultamiento al deshabilitar
  await core.moduleManager.setModuleEnabled('cooler-controller', false);
  const visibilityAfterDisable = core.moduleManager.getGroupVisibility();
  assert.equal(visibilityAfterDisable['Refrigeracion'].visible, false, 'Grupo vacío debe ocultarse');

  // Eliminar grupo y reasignar a General
  await core.moduleManager.setModuleEnabled('cooler-controller', true);
  core.moduleManager.deleteGroup('Refrigeracion');
  assert.equal(testModule.group, 'General', 'Módulos deben reasignarse a General');

  // Prohibición de eliminar grupo General
  assert.throws(() => {
    core.moduleManager.deleteGroup('General');
  }, /inborrable/);

  // 4. Prueba de ThemeEngine
  console.log('4. Verificando ThemeEngine...');
  core.themeEngine.setTheme('dark', 'midnight');
  assert.equal(core.themeEngine.currentMode, 'dark');
  assert.equal(core.themeEngine.currentStyle, 'midnight');
  core.themeEngine.setAccent('emerald');
  assert.equal(core.themeEngine.currentAccent, 'emerald');

  // 5. Prueba de LifecycleManager
  console.log('5. Verificando LifecycleManager...');
  let cleanedUp = false;
  core.lifecycle.registerCleanupHook(() => {
    cleanedUp = true;
  });
  await core.lifecycle.boot({ minimizeToTray: true });
  assert.equal(core.lifecycle.state, 'READY');
  assert.equal(core.lifecycle.windowsConfig.minimizeToTray, true);

  await core.lifecycle.quit('TEST_COMPLETE');
  assert.equal(core.lifecycle.state, 'STOPPED');
  assert.equal(cleanedUp, true, 'Gancho de limpieza ejecutado');
  assert.equal(core.serviceRegistry.services.size, 0, 'Servicios limpiados por completo');

  console.log('--- Todas las pruebas del Core pasaron con éxito ---');
}

runTests().catch(err => {
  console.error('Fallo en pruebas unitarias:', err);
  process.exit(1);
});
