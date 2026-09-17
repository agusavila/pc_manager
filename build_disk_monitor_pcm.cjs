const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function buildDiskMonitorModule() {
  const zip = new JSZip();

  const manifestPath = path.join(__dirname, 'modules', 'disk-monitor', 'manifest.json');
  const moduleJsPath = path.join(__dirname, 'modules', 'disk-monitor', 'module.js');
  const readmePath = path.join(__dirname, 'modules', 'disk-monitor', 'README.md');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const moduleJs = fs.readFileSync(moduleJsPath, 'utf8');
  const readme = fs.readFileSync(readmePath, 'utf8');

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('module.js', moduleJs);
  zip.file('README.md', readme);

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const outputPath = path.join(__dirname, 'disk-monitor.pcm');
  fs.writeFileSync(outputPath, content);

  console.log(`Paquete disk-monitor.pcm generado exitosamente en la raíz: ${outputPath} (${content.length} bytes)`);
}

buildDiskMonitorModule().catch(err => {
  console.error('Error generando paquete disk-monitor.pcm:', err);
  process.exit(1);
});
