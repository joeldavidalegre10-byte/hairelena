import app from './app.js';
import { env } from './config/env.js';
import { initDatabase } from './db/database.js';

// Inicializar SQLite local
initDatabase();

const server = app.listen(env.PORT, () => {
  const dbInfo = env.DB_TYPE === 'mysql'
    ? `MySQL Remoto (${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME})`
    : `SQLite Local (${env.DATABASE_PATH})`;
  console.log('================================================================');
  console.log(`💈 ELITE STUDIO POS - SERVIDOR EN EJECUCIÓN (v1.0)`);
  console.log(`🚀 Puerto: ${env.PORT}`);
  console.log(`🩺 Health check: /api/v1/health`);
  console.log(`🗄️ Base de datos: ${dbInfo}`);
  console.log(`🔐 Modo: ${env.NODE_ENV.toUpperCase()}`);
  console.log('================================================================');
});

// Graceful shutdown
const shutdown = () => {
  console.log('\nCerrando servidor de manera controlada...');
  server.close(() => {
    console.log('Servidor finalizado.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
