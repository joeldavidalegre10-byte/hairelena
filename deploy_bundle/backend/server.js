import app from './app.js';
import { env } from './config/env.js';
import { initDatabase, verifyDatabase } from './db/database.js';
let server = null;
// Cierre controlado
const shutdown = () => {
    console.log('\nCerrando servidor de manera controlada...');
    if (!server) {
        process.exit(0);
        return;
    }
    server.close(() => {
        console.log('Servidor finalizado.');
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Iniciar solamente después de verificar la base de datos
async function startServer() {
    initDatabase();
    console.log('Verificando base de datos...');
    await verifyDatabase();
    server = app.listen(env.PORT, () => {
        const dbInfo = env.DB_TYPE === 'mysql'
            ? `MySQL Remoto (${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME})`
            : `SQLite Local (${env.DATABASE_PATH})`;
        console.log('================================================================');
        console.log('ELITE STUDIO POS - SERVIDOR EN EJECUCIÓN (v1.0)');
        console.log(`Puerto: ${env.PORT}`);
        console.log('Health check: /api/v1/health');
        console.log(`Base de datos: ${dbInfo}`);
        console.log(`Modo: ${env.NODE_ENV.toUpperCase()}`);
        console.log('================================================================');
    });
}
startServer().catch((error) => {
    console.error('ERROR: No se pudo iniciar el servidor.');
    console.error(error);
    process.exit(1);
});
