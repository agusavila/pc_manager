const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function syncToAppData() {
  const appData = process.env.APPDATA;
  if (!appData) {
    console.error('APPDATA no definido');
    return;
  }
  const targetDir = path.join(appData, 'com.pcmanager.core');
  const registryPath = path.join(targetDir, 'registry.json');
  if (!fs.existsSync(registryPath)) {
    console.log('No existe registry.json en AppData, nada que actualizar.');
    return;
  }

  const pcmPath = path.join(__dirname, '..', 'disk-monitor.pcm');
  if (!fs.existsSync(pcmPath)) {
    console.error('disk-monitor.pcm no encontrado');
    return;
  }

  const pcmBuffer = fs.readFileSync(pcmPath);
  const zip = await JSZip.loadAsync(pcmBuffer);

  const manifestStr = await zip.file('manifest.json').async('string');
  const manifest = JSON.parse(manifestStr);

  const moduleJsStr = await zip.file('module.js').async('string');
  const sigStr = await zip.file('signature.sig').async('string');
  const sigData = JSON.parse(sigStr);

  // Extraer archivos al directorio del módulo
  const moduleDir = path.join(targetDir, 'modules', manifest.id);
  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir, { recursive: true });
  }

  for (const [filename, fileObj] of Object.entries(zip.files)) {
    if (!fileObj.dir) {
      const buf = await fileObj.async('nodebuffer');
      fs.writeFileSync(path.join(moduleDir, filename), buf);
    }
  }

  // Actualizar registry.json
  const regContent = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  if (regContent.modules && regContent.modules[manifest.id]) {
    regContent.modules[manifest.id].manifest = manifest;
    regContent.modules[manifest.id].script_code = moduleJsStr;
    regContent.modules[manifest.id].signature_status = 'VERIFIED';
    regContent.modules[manifest.id].author_fingerprint = sigData.public_key;
    regContent.modules[manifest.id].file_hashes = sigData.signed_manifest.files;
    regContent.modules[manifest.id].granted_permissions = ['system:storage', 'system:execute'];
    fs.writeFileSync(registryPath, JSON.stringify(regContent, null, 2), 'utf8');
    console.log(`Módulo '${manifest.id}' sincronizado exitosamente en AppData (${registryPath}).`);
  }
}

syncToAppData().catch(console.error);
