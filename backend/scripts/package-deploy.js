const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const deployDir = path.join(rootDir, 'deploy_bundle');
const backendDist = path.join(rootDir, 'backend', 'dist');
const frontendDist = path.join(rootDir, 'frontend', 'dist');

console.log('📦 Preparando paquete de despliegue para Hostinger...');

if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
}

function copyRecursiveSync(src, dest) {
    if (fs.existsSync(src)) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
            const srcItem = path.join(src, childItemName);
            const destItem = path.join(dest, childItemName);
            const stats = fs.statSync(srcItem);
            if (stats.isDirectory()) {
                copyRecursiveSync(srcItem, destItem);
            } else {
                fs.copyFileSync(srcItem, destItem);
            }
        });
    }
}

console.log('🚀 Copiando archivos del Backend...');
copyRecursiveSync(backendDist, path.join(deployDir, 'backend'));

console.log('🎨 Copiando archivos del Frontend...');
copyRecursiveSync(frontendDist, path.join(deployDir, 'frontend'));

if (fs.existsSync(path.join(rootDir, 'backend', 'package.json'))) {
    fs.copyFileSync(
        path.join(rootDir, 'backend', 'package.json'),
        path.join(deployDir, 'backend', 'package.json')
    );
}

console.log('✅ ¡Paquete de despliegue generado con éxito en la carpeta /deploy_bundle!');