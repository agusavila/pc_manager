const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function syncToAppData() {
  const appData = process.env.APPDATA;
  if (!appData) return;
  const targetDir = path.join(appData, 'com.pcmanager.core');
  const registryPath = path.join(targetDir, 'registry.json');
  if (!fs.existsSync(registryPath)) return;

  const rootDir = path.join(__dirname, '..');
  const pcmFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.pcm'));

  for (const pcmFile of pcmFiles) {
    const pcmPath = path.join(rootDir, pcmFile);
    try {
      const pcmBuffer = fs.readFileSync(pcmPath);
      const zip = await JSZip.loadAsync(pcmBuffer);
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) continue;
      const manifest = JSON.parse(await manifestFile.async('string'));
      const moduleJsFile = zip.file('module.js');
      const moduleJsStr = moduleJsFile ? await moduleJsFile.async('string') : '';
      const sigFile = zip.file('signature.sig');
      const sigData = sigFile ? JSON.parse(await sigFile.async('string')) : null;

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

      const regContent = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      if (regContent.modules && regContent.modules[manifest.id] && sigData) {
        regContent.modules[manifest.id].manifest = manifest;
        regContent.modules[manifest.id].script_code = moduleJsStr;
        regContent.modules[manifest.id].signature_status = 'VERIFIED';
        regContent.modules[manifest.id].author_fingerprint = sigData.public_key;
        regContent.modules[manifest.id].file_hashes = sigData.signed_manifest.files;
        fs.writeFileSync(registryPath, JSON.stringify(regContent, null, 2), 'utf8');
      }
    } catch (e) {}
  }
}

syncToAppData();
