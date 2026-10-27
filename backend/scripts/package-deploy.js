
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const deployDir = path.join(projectRoot, 'deploy_bundle');
const backendDist = path.join(projectRoot, 'backend', 'dist');
const frontendDist = path.join(projectRoot, 'frontend', 'dist');

console.log('Preparando paquete de despliegue para Hostinger...');

if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
}

fs.mkdirSync(deployDir, { recursive: true });

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`No se encontró la carpeta: ${src}`);
  }

  fs.mkdirSync(dest, { recursive: true });

  for (const item of fs.readdirSync(src)) {
    const source = path.join(src, item);
    const destination = path.join(dest, item);

    if (fs.statSync(source).isDirectory()) {
      copyRecursiveSync(source, destination);
    } else {
      fs.copyFileSync(source, destination);
    }
  }
}

console.log('Copiando backend...');
copyRecursiveSync(backendDist, path.join(deployDir, 'backend'));

console.log('Copiando frontend...');
copyRecursiveSync(frontendDist, path.join(deployDir, 'backend', 'public'));

fs.copyFileSync(
  path.join(projectRoot, 'backend', 'package.json'),
  path.join(deployDir, 'backend', 'package.json')
);

console.log('Paquete de despliegue generado correctamente.');
console.log(`Ubicación: ${deployDir}`);
