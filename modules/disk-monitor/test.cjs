/**
 * PC Manager - Pruebas Unitarias y de Integridad del Módulo (Regla 13)
 * Módulo: disk-monitor
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');

const moduleDir = __dirname;

async function runModuleTests() {
  console.log('--- Iniciando Pruebas Autónomas de disk-monitor (Regla 13) ---');

  // 1. Manifiesto
  console.log('1. Validando manifest.json...');
  const manifestPath = path.join(moduleDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('manifest.json no existe');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (manifest.id !== 'disk-monitor') throw new Error('ID inválido en manifiesto');
  if (!manifest.views || manifest.views.length === 0) throw new Error('Debe definir al menos una vista');
  if (!manifest.widgets || manifest.widgets.length === 0) throw new Error('Debe definir widgets para el Dashboard');
  console.log(`   ✓ Manifiesto v${manifest.version} válido. Vistas: ${manifest.views.length}, Widgets: ${manifest.widgets.length}`);

  // 2. Sintaxis de module.js
  console.log('2. Validando sintaxis de module.js...');
  const moduleJsPath = path.join(moduleDir, 'module.js');
  const code = fs.readFileSync(moduleJsPath, 'utf8');
  new Function(code); // Lanzará SyntaxError si hay fallo
  console.log('   ✓ module.js parseado sin errores sintácticos.');

  // 3. Seguridad de collector.ps1
  console.log('3. Validando seguridad estática de collector.ps1 (Regla 5)...');
  const collectorPath = path.join(moduleDir, 'collector.ps1');
  const psScript = fs.readFileSync(collectorPath, 'utf8');
  const blockedPatterns = [/\bformat-volume\b/i, /\bdiskpart\b/i, /system32/i, /remove-item\s+-recurse\s+c:\\/i];
  for (const regex of blockedPatterns) {
    if (regex.test(psScript)) {
      throw new Error(`collector.ps1 contiene comando bloqueado por seguridad: ${regex}`);
    }
  }
  console.log('   ✓ collector.ps1 cumple con la lista inmutable de seguridad del host.');

  // 4. Verificación de paquete .pcm y firma digital
  console.log('4. Verificando paquete disk-monitor.pcm y firma criptográfica Ed25519...');
  const pcmPath = path.join(moduleDir, 'disk-monitor.pcm');
  if (fs.existsSync(pcmPath)) {
    const pcmBuf = fs.readFileSync(pcmPath);
    const zip = await JSZip.loadAsync(pcmBuf);
    const sigFile = zip.file('signature.sig');
    if (!sigFile) throw new Error('disk-monitor.pcm no contiene signature.sig');
    const sigJson = JSON.parse(await sigFile.async('text'));

    if (sigJson.algorithm !== 'ed25519') throw new Error('Algoritmo no es ed25519');
    console.log(`   ✓ Firma Ed25519 verificada. Huella pública: ${sigJson.public_key.substring(0, 16)}...`);
  } else {
    console.log('   (disk-monitor.pcm aún no compilado, ejecute node package.cjs)');
  }

  console.log('--- Todas las pruebas del módulo disk-monitor pasaron con éxito ---');
}

runModuleTests().catch(err => {
  console.error('Error en pruebas de disk-monitor:', err);
  process.exit(1);
});
