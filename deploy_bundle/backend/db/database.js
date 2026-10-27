import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
// node:sqlite se carga SOLO cuando se usa SQLite (en Node 20 no existe y
// un import estático rompería el arranque aunque uses MySQL).
const nodeRequire = createRequire(import.meta.url);
const loadSqlite = () => nodeRequire('node:sqlite');
/* ------------------------------------------------------------------ */
/* Utilidades de parámetros y fechas                                   */
/* ------------------------------------------------------------------ */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
// 2026-10-27T12:00:00.000Z -> 2026-10-27 12:00:00 (UTC)
function toMySQLDateTime(d) {
    return d.toISOString().slice(0, 19).replace('T', ' ');
}
function flattenParams(params, forMySQL = false) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return flat.map((p) => {
        if (p === undefined)
            return null;
        if (typeof p === 'boolean')
            return p ? 1 : 0;
        if (forMySQL) {
            if (p instanceof Date)
                return toMySQLDateTime(p);
            if (typeof p === 'string' && ISO_DATE_RE.test(p)) {
                const d = new Date(p);
                if (!Number.isNaN(d.getTime()))
                    return toMySQLDateTime(d);
            }
        }
        return p;
    });
}
/* ------------------------------------------------------------------ */
/* Traductor SQLite -> MySQL                                           */
/* ------------------------------------------------------------------ */
// datetime('now', '-7 days', 'localtime'), date('now','start of month'), etc.
function translateDateFn(fn, rawMods, original) {
    const mods = [...rawMods.matchAll(/'([^']*)'/g)].map((m) => m[1].trim().toLowerCase());
    let expr = 'NOW()';
    for (const m of mods) {
        if (m === 'localtime' || m === 'utc')
            continue;
        if (m === 'start of month') {
            expr = `DATE_FORMAT(${expr}, '%Y-%m-01 00:00:00')`;
        }
        else if (m === 'start of year') {
            expr = `DATE_FORMAT(${expr}, '%Y-01-01 00:00:00')`;
        }
        else if (m === 'start of day') {
            expr = `DATE_FORMAT(${expr}, '%Y-%m-%d 00:00:00')`;
        }
        else {
            const r = m.match(/^([+-]?\d+)\s*(second|minute|hour|day|month|year)s?$/);
            if (!r)
                return original; // modificador desconocido: no tocar
            const n = parseInt(r[1], 10);
            expr = `DATE_${n < 0 ? 'SUB' : 'ADD'}(${expr}, INTERVAL ${Math.abs(n)} ${r[2].toUpperCase()})`;
        }
    }
    return fn.toLowerCase() === 'date' ? `DATE(${expr})` : expr;
}
function translateSqlForMySQL(sql) {
    return sql
        .replace(/\b(datetime|date)\(\s*'now'((?:\s*,\s*'[^']*')*)\s*\)/gi, (match, fn, mods) => translateDateFn(fn, mods, match))
        // MAX(0, x) (escalar de 2 argumentos en SQLite) -> GREATEST(0, x)
        .replace(/\bMAX\(\s*0\s*,/gi, 'GREATEST(0,')
        .replace(/INSERT OR IGNORE INTO/gi, 'INSERT IGNORE INTO')
        .replace(/INSERT OR REPLACE INTO/gi, 'REPLACE INTO');
    // Nota: el operador || (concatenación) se resuelve activando PIPES_AS_CONCAT
    // en cada conexión MySQL (ver initDatabase), así no hay que reescribir las notas.
}
const txStore = new AsyncLocalStorage();
/* ------------------------------------------------------------------ */
/* Adaptadores                                                         */
/* ------------------------------------------------------------------ */
class SQLiteAdapter {
    db;
    constructor(db) {
        this.db = db;
    }
    prepare(sql) {
        const stmt = this.db.prepare(sql);
        return {
            all: async (...params) => stmt.all(...flattenParams(params)),
            get: async (...params) => stmt.get(...flattenParams(params)),
            run: async (...params) => {
                const res = stmt.run(...flattenParams(params));
                return { changes: Number(res.changes), lastInsertRowid: res.lastInsertRowid };
            },
        };
    }
    async exec(sql) {
        this.db.exec(sql);
    }
    isMySQL() {
        return false;
    }
    async close() {
        this.db.close();
    }
}
class MySQLAdapter {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    // Si estamos dentro de transaction(), usa SIEMPRE la conexión de la transacción.
    executor() {
        return txStore.getStore()?.conn ?? this.pool;
    }
    getConnection() {
        return this.pool.getConnection();
    }
    prepare(sql) {
        const cleanSql = translateSqlForMySQL(sql);
        return {
            all: async (...params) => {
                const [rows] = await this.executor().query(cleanSql, flattenParams(params, true));
                return rows;
            },
            get: async (...params) => {
                const [rows] = await this.executor().query(cleanSql, flattenParams(params, true));
                const arr = rows;
                return arr.length > 0 ? arr[0] : undefined;
            },
            run: async (...params) => {
                const [res] = await this.executor().query(cleanSql, flattenParams(params, true));
                const header = res;
                return {
                    changes: header.affectedRows || 0,
                    lastInsertRowid: header.insertId || undefined,
                };
            },
        };
    }
    async exec(sql) {
        await this.executor().query(translateSqlForMySQL(sql));
    }
    isMySQL() {
        return true;
    }
    async close() {
        await this.pool.end();
    }
}
/* ------------------------------------------------------------------ */
/* Inicialización                                                      */
/* ------------------------------------------------------------------ */
let dbInstance = null;
let sqliteRaw = null;
export const getDb = () => {
    if (!dbInstance) {
        initDatabase();
    }
    return dbInstance;
};
// Contraseña inicial: la de la variable de entorno o una aleatoria (se muestra UNA vez).
function initialPassword(envName, label) {
    const fromEnv = process.env[envName];
    if (fromEnv && fromEnv.length >= 8)
        return fromEnv;
    const generated = crypto.randomBytes(9).toString('base64url');
    console.warn(`🔐 Usuario inicial "${label}" creado con contraseña temporal: ${generated}  (cámbiala al primer ingreso)`);
    return generated;
}
// Crea usuarios iniciales SOLO si la tabla está vacía. Nunca pisa contraseñas existentes.
function seedDefaultUsers(raw) {
    try {
        const row = raw.prepare('SELECT COUNT(*) AS c FROM users').get();
        if (row && Number(row.c) > 0)
            return;
        const now = new Date().toISOString();
        const adminHash = bcrypt.hashSync(initialPassword('ADMIN_INITIAL_PASSWORD', 'admin'), 10);
        const cajaHash = bcrypt.hashSync(initialPassword('CASHIER_INITIAL_PASSWORD', 'caja'), 10);
        raw.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, 'admin', 'admin@elitestudio.com', ?, 'Administrador Principal', 'admin', 1, ?, ?)
    `).run('u-admin-01', adminHash, now, now);
        raw.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, 'caja', 'caja@elitestudio.com', ?, 'Cajero de Turno', 'cashier', 1, ?, ?)
    `).run('u-cashier-01', cajaHash, now, now);
    }
    catch (err) {
        console.error('No se pudieron crear los usuarios iniciales:', err);
    }
}
export const initDatabase = () => {
    if (dbInstance)
        return dbInstance;
    // MySQL (Hostinger / phpMyAdmin)
    if (env.DB_TYPE === 'mysql' && env.DB_USER) {
        console.log(`🔌 Conectando a MySQL en ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}...`);
        const pool = mysql.createPool({
            host: env.DB_HOST,
            port: env.DB_PORT,
            user: env.DB_USER,
            password: env.DB_PASSWORD,
            database: env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
            dateStrings: true,
        });
        // Ajustes por conexión: || como concatenación (igual que SQLite) y zona horaria UTC,
        // para que NOW() sea coherente con las fechas que genera el backend (toISOString = UTC).
        const tz = process.env.DB_TIMEZONE || '+00:00';
        pool.pool.on('connection', (conn) => {
            conn.query(`SET SESSION sql_mode = CONCAT(@@sql_mode, ',PIPES_AS_CONCAT'), time_zone = '${tz}'`);
        });
        dbInstance = new MySQLAdapter(pool);
        console.log('✅ Base de datos MySQL configurada.');
        return dbInstance;
    }
    // SQLite local (por defecto)
    console.log('📁 Iniciando base de datos SQLite local...');
    const { DatabaseSync: SqliteCtor } = loadSqlite();
    const dbPath = path.resolve(process.cwd(), env.DATABASE_PATH);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const raw = new SqliteCtor(dbPath);
    raw.exec('PRAGMA foreign_keys = ON;');
    raw.exec('PRAGMA journal_mode = WAL;');
    const possiblePaths = [
        path.resolve(process.cwd(), 'src', 'db', 'schema.sql'),
        path.resolve(process.cwd(), 'backend', 'src', 'db', 'schema.sql'),
        path.resolve(process.cwd(), 'dist', 'db', 'schema.sql'),
    ];
    const schemaPath = possiblePaths.find((p) => fs.existsSync(p));
    if (schemaPath) {
        try {
            raw.exec(fs.readFileSync(schemaPath, 'utf8'));
        }
        catch {
            // el esquema ya existe
        }
    }
    seedDefaultUsers(raw);
    sqliteRaw = raw;
    dbInstance = new SQLiteAdapter(raw);
    return dbInstance;
};
/* ------------------------------------------------------------------ */
/* Transacciones                                                       */
/* ------------------------------------------------------------------ */
// SQLite tiene una sola conexión: serializamos las transacciones para que
// dos peticiones no mezclen sus consultas dentro del mismo BEGIN/COMMIT.
let sqliteLock = Promise.resolve();
export const transaction = async (fn) => {
    // Transacción anidada: se reutiliza la externa.
    if (txStore.getStore()) {
        return await fn();
    }
    const db = getDb();
    if (db instanceof MySQLAdapter) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const result = await txStore.run({ conn }, async () => await fn());
            await conn.commit();
            return result;
        }
        catch (error) {
            try {
                await conn.rollback();
            }
            catch {
                // la conexión pudo haberse perdido
            }
            throw error;
        }
        finally {
            conn.release();
        }
    }
    const previous = sqliteLock;
    let release;
    sqliteLock = new Promise((resolve) => (release = resolve));
    await previous;
    try {
        await db.exec('BEGIN TRANSACTION;');
        try {
            const result = await txStore.run({}, async () => await fn());
            await db.exec('COMMIT;');
            return result;
        }
        catch (error) {
            try {
                await db.exec('ROLLBACK;');
            }
            catch {
                // sin transacción activa
            }
            throw error;
        }
    }
    finally {
        release();
    }
};
/* ------------------------------------------------------------------ */
/* Respaldos                                                           */
/* ------------------------------------------------------------------ */
const backupDirPath = () => path.resolve(process.cwd(), 'backups');
export const backupDatabase = () => {
    const backupDir = backupDirPath();
    fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.db`;
    const destPath = path.join(backupDir, filename);
    const db = getDb();
    if (db.isMySQL()) {
        const metaFile = path.join(backupDir, `backup_mysql_${timestamp}.json`);
        const info = {
            filename: `backup_mysql_${timestamp}.json`,
            path: metaFile,
            type: 'mysql',
            createdAt: new Date().toISOString(),
            note: 'Base de datos en MySQL / Hostinger. Las copias de seguridad completas se gestionan de forma segura desde phpMyAdmin o el panel de Hostinger.',
        };
        fs.writeFileSync(metaFile, JSON.stringify(info, null, 2), 'utf8');
        return info;
    }
    // VACUUM INTO genera una copia consistente (incluye lo que aún está en el WAL).
    try {
        sqliteRaw.exec(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`);
    }
    catch {
        const srcPath = path.resolve(process.cwd(), env.DATABASE_PATH);
        if (fs.existsSync(srcPath))
            fs.copyFileSync(srcPath, destPath);
    }
    return {
        filename,
        path: destPath,
        createdAt: new Date().toISOString(),
        size: fs.existsSync(destPath) ? fs.statSync(destPath).size : 0,
    };
};
export const listBackups = () => {
    const backupDir = backupDirPath();
    if (!fs.existsSync(backupDir))
        return [];
    return fs
        .readdirSync(backupDir)
        .map((file) => {
        const fullPath = path.join(backupDir, file);
        const stats = fs.statSync(fullPath);
        return {
            filename: file,
            path: fullPath,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
        };
    })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
export const restoreDatabase = (backupPath) => {
    const db = getDb();
    if (db.isMySQL()) {
        throw new Error('La restauración en MySQL debe realizarse a través de phpMyAdmin o el panel de Hostinger.');
    }
    if (typeof backupPath !== 'string' || !backupPath.trim()) {
        throw new Error('Ruta de respaldo inválida.');
    }
    // Solo se permiten archivos .db dentro de la carpeta backups/ (acepta nombre simple o ruta completa).
    const backupDir = backupDirPath();
    const resolved = path.resolve(backupDir, backupPath);
    if (!resolved.startsWith(backupDir + path.sep) || path.extname(resolved).toLowerCase() !== '.db') {
        throw new Error('Ruta de respaldo no permitida.');
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
        throw new Error('El archivo de respaldo especificado no existe.');
    }
    const destPath = path.resolve(process.cwd(), env.DATABASE_PATH);
    // Cerrar la conexión antes de sobrescribir y limpiar archivos WAL huérfanos.
    try {
        sqliteRaw?.close();
    }
    catch {
        // ya cerrada
    }
    sqliteRaw = null;
    dbInstance = null;
    fs.copyFileSync(resolved, destPath);
    for (const ext of ['-wal', '-shm']) {
        try {
            fs.rmSync(destPath + ext, { force: true });
        }
        catch {
            // ignorar
        }
    }
    // Reabre la base restaurada.
    initDatabase();
};
