const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const { ensureKeyPair, signModuleFiles } = require('./tools/module_signer.cjs');

async function buildDiskMonitorModule() {
  const zip = new JSZip();

  const manifestPath = path.join(__dirname, 'modules', 'disk-monitor', 'manifest.json');
  const moduleJsPath = path.join(__dirname, 'modules', 'disk-monitor', 'module.js');
  const readmePath = path.join(__dirname, 'modules', 'disk-monitor', 'README.md');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const moduleJs = fs.readFileSync(moduleJsPath, 'utf8');
  const readme = fs.readFileSync(readmePath, 'utf8');

  const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
  const moduleJsBuffer = Buffer.from(moduleJs, 'utf8');
  const readmeBuffer = Buffer.from(readme, 'utf8');

  const filesMap = {
    'manifest.json': manifestBuffer,
    'module.js': moduleJsBuffer,
    'README.md': readmeBuffer
  };

  const collectorPath = path.join(__dirname, 'modules', 'disk-monitor', 'collector.ps1');
  if (fs.existsSync(collectorPath)) {
    const collectorBuffer = fs.readFileSync(collectorPath);
    filesMap['collector.ps1'] = collectorBuffer;
  }

  const { pubHex, privateKey } = ensureKeyPair();
  const sigData = signModuleFiles(filesMap, privateKey, pubHex, manifest);

  for (const [name, buf] of Object.entries(filesMap)) {
    zip.file(name, buf);
  }
  zip.file('signature.sig', JSON.stringify(sigData, null, 2));

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const outputPath = path.join(__dirname, 'disk-monitor.pcm');
  fs.writeFileSync(outputPath, content);

  console.log(`Paquete disk-monitor.pcm firmado y compilado exitosamente: ${outputPath} (${content.length} bytes)`);
  console.log(`Firma criptográfica generada con llave pública: ${pubHex}`);
}

buildDiskMonitorModule().catch(err => {
  console.error('Error empaquetando disk-monitor.pcm:', err);
  process.exit(1);
});
