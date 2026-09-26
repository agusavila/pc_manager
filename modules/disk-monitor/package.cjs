/**
 * PC Manager - Script de Empaquetado y Firma Digital de Módulo (Regla 13)
 * Módulo: disk-monitor
 * Compila y firma digitalmente el paquete autónomo 'disk-monitor.pcm'
 */

const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const { ensureKeyPair, signModuleFiles } = require('../../tools/module_signer.cjs');

async function buildModulePackage() {
  const moduleDir = __dirname;
  const zip = new JSZip();

  const manifestPath = path.join(moduleDir, 'manifest.json');
  const moduleJsPath = path.join(moduleDir, 'module.js');
  const readmePath = path.join(moduleDir, 'README.md');
  const collectorPath = path.join(moduleDir, 'collector.ps1');

  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json no encontrado en el módulo disk-monitor');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const moduleJs = fs.readFileSync(moduleJsPath, 'utf8');
  const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : '# Monitoreo de Almacenamiento';

  const filesMap = {
    'manifest.json': Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
    'module.js': Buffer.from(moduleJs, 'utf8'),
    'README.md': Buffer.from(readme, 'utf8')
  };

  if (fs.existsSync(collectorPath)) {
    filesMap['collector.ps1'] = fs.readFileSync(collectorPath);
  }

  // Generar firma digital Ed25519 oficial
  const { pubHex, privateKey } = ensureKeyPair();
  const sigData = signModuleFiles(filesMap, privateKey, pubHex, manifest);

  // Agregar archivos y firma criptográfica al paquete .pcm
  for (const [name, buf] of Object.entries(filesMap)) {
    zip.file(name, buf);
  }
  zip.file('signature.sig', JSON.stringify(sigData, null, 2));

  const content = await zip.generateAsync({ type: 'nodebuffer' });

  // 1. Guardar en el directorio propio del módulo (Regla 13)
  const localOutput = path.join(moduleDir, 'disk-monitor.pcm');
  fs.writeFileSync(localOutput, content);

  // 2. Guardar también en la raíz del proyecto para retrocompatibilidad con tests de Rust
  const rootOutput = path.join(moduleDir, '..', '..', 'disk-monitor.pcm');
  fs.writeFileSync(rootOutput, content);

  console.log(`[DiskMonitor] Paquete compilado y firmado exitosamente:`);
  console.log(`  - Local: ${localOutput} (${content.length} bytes)`);
  console.log(`  - Raíz:  ${rootOutput} (${content.length} bytes)`);
  console.log(`  - Llave pública Ed25519: ${pubHex}`);
}

buildModulePackage().catch(err => {
  console.error('[DiskMonitor] Error en empaquetado:', err);
  process.exit(1);
});
