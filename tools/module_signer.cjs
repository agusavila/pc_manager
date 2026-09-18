const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const KEYS_DIR = path.join(__dirname, 'keys');
const PRIV_KEY_PATH = path.join(KEYS_DIR, 'core_dev.key');
const PUB_KEY_PATH = path.join(KEYS_DIR, 'core_dev.pub');

// Asegurar que existe el par de llaves oficial de desarrollo
function ensureKeyPair() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  if (!fs.existsSync(PRIV_KEY_PATH) || !fs.existsSync(PUB_KEY_PATH)) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pubRaw = publicKey.export({ type: 'spki', format: 'der' }).slice(-32);
    const privRaw = privateKey.export({ type: 'pkcs8', format: 'der' });

    fs.writeFileSync(PRIV_KEY_PATH, privRaw);
    fs.writeFileSync(PUB_KEY_PATH, pubRaw.toString('hex'));
    console.log('[ModuleSigner] Nuevo par de llaves Ed25519 generado.');
    console.log('[ModuleSigner] Llave pública oficial:', pubRaw.toString('hex'));
  }

  const pubHex = fs.readFileSync(PUB_KEY_PATH, 'utf8').trim();
  const privDer = fs.readFileSync(PRIV_KEY_PATH);
  const privateKey = crypto.createPrivateKey({ key: privDer, format: 'der', type: 'pkcs8' });

  return { pubHex, privateKey };
}

// Calcula hash SHA-256 de un buffer
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Genera el manifiesto firmado canónico y firma el contenido
function signModuleFiles(filesMap, privateKey, pubHex, manifestMeta) {
  const filesHashes = {};
  const sortedFilenames = Object.keys(filesMap).filter(name => name !== 'signature.sig').sort();

  for (const name of sortedFilenames) {
    filesHashes[name] = sha256(filesMap[name]);
  }

  const signedManifest = {
    id: manifestMeta.id,
    version: manifestMeta.version,
    files: filesHashes
  };

  const canonicalJson = JSON.stringify(signedManifest);
  const sigBuffer = crypto.sign(null, Buffer.from(canonicalJson, 'utf8'), privateKey);

  return {
    algorithm: 'ed25519',
    public_key: pubHex,
    signature: sigBuffer.toString('hex'),
    signed_manifest: signedManifest
  };
}

module.exports = {
  ensureKeyPair,
  sha256,
  signModuleFiles
};

// Si se ejecuta directamente desde terminal
if (require.main === module) {
  const { pubHex } = ensureKeyPair();
  console.log('Llave pública oficial del Core:', pubHex);
}
