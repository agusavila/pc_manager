/**
 * PC Manager Core - Pruebas Unitarias de Arquitectura (v0.0.4)
 */

import assert from 'node:assert/strict';
import { PCManagerCore } from '../src/core/index.js';

async function runTests() {
  console.log('--- Iniciando Pruebas Unitarias del Core ---');

  const core = new PCManagerCore();
  assert.equal(core.version, '0.0.4', 'Versión debe ser 0.0.4');

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

  // 6. Prueba de Validación Robusta de Module ID (Fase 3)
  console.log('6. Verificando validación robusta de Module ID (Fase 3)...');
  const { validateModuleId } = await import('../src/core/index.js');

  // Válidos
  assert.equal(validateModuleId('storage-monitor'), true);
  assert.equal(validateModuleId('system-clock'), true);
  assert.equal(validateModuleId('dummy-widgets'), true);
  assert.equal(validateModuleId('mod-01'), true);
  assert.equal(validateModuleId('m'), true);
  assert.equal(validateModuleId('0mod'), true);
  assert.equal(validateModuleId('a'.repeat(64)), true);

  // Vacío y tipos incorrectos
  assert.throws(() => validateModuleId(''), /vacío/);
  assert.throws(() => validateModuleId(null), /vacío/);
  assert.throws(() => validateModuleId(undefined), /vacío/);

  // Espacios
  assert.throws(() => validateModuleId('   '), /espacios/);
  assert.throws(() => validateModuleId(' mod'), /espacios/);
  assert.throws(() => validateModuleId('mod '), /espacios/);
  assert.throws(() => validateModuleId('mod space'), /espacios/);
  assert.throws(() => validateModuleId('mod\tname'), /espacios/);
  assert.throws(() => validateModuleId('mod\nname'), /espacios/);

  // Traversal
  assert.throws(() => validateModuleId('.'), /inválido/);
  assert.throws(() => validateModuleId('..'), /inválido/);
  assert.throws(() => validateModuleId('../../evil'), /rutas relativas/);
  assert.throws(() => validateModuleId('../mod'), /rutas relativas/);
  assert.throws(() => validateModuleId('mod/sub'), /rutas relativas/);
  assert.throws(() => validateModuleId('mod\\sub'), /rutas relativas/);

  // Rutas absolutas
  assert.throws(() => validateModuleId('C:\\Windows'), /rutas relativas/);
  assert.throws(() => validateModuleId('c:\\system32'), /rutas relativas/);
  assert.throws(() => validateModuleId('C:'), /rutas relativas/);
  assert.throws(() => validateModuleId('/var/log'), /rutas relativas/);

  // Nombres reservados de Windows
  assert.throws(() => validateModuleId('con'), /reservado/);
  assert.throws(() => validateModuleId('CON'), /reservado/);
  assert.throws(() => validateModuleId('prn'), /reservado/);
  assert.throws(() => validateModuleId('aux'), /reservado/);
  assert.throws(() => validateModuleId('nul'), /reservado/);
  assert.throws(() => validateModuleId('com0'), /reservado/);
  assert.throws(() => validateModuleId('com1'), /reservado/);
  assert.throws(() => validateModuleId('lpt1'), /reservado/);
  assert.throws(() => validateModuleId('con.txt'), /reservado/);
  assert.throws(() => validateModuleId('nul.json'), /reservado/);

  // Caracteres inválidos
  assert.throws(() => validateModuleId('mod@name'), /caracteres no permitidos/);
  assert.throws(() => validateModuleId('mod$name'), /caracteres no permitidos/);
  assert.throws(() => validateModuleId('-starts-with-hyphen'), /letra minúscula o número/);
  assert.throws(() => validateModuleId('_starts-with-underscore'), /letra minúscula o número/);
  assert.throws(() => validateModuleId('.starts-with-dot'), /letra minúscula o número/);

  // Mayúsculas
  assert.throws(() => validateModuleId('MyModule'), /letra minúscula o número/);
  assert.throws(() => validateModuleId('moduleA'), /caracteres no permitidos/);
  assert.throws(() => validateModuleId('MOD'), /letra minúscula o número/);

  // Demasiado largos (> 64)
  assert.throws(() => validateModuleId('a'.repeat(65)), /excede el límite de 64/);

  // Bloqueo en registro de ModuleManager
  await assert.rejects(async () => {
    await core.moduleManager.registerModule({ id: '../evil-mod', name: 'Evil' });
  }, /rutas relativas/);

  console.log('--- Todas las pruebas del Core pasaron con éxito ---');
}

runTests().catch(err => {
  console.error('Fallo en pruebas unitarias:', err);
  process.exit(1);
});
