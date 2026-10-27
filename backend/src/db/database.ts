
import type { DatabaseSync } from 'node:sqlite';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const nodeRequire = createRequire(import.meta.url);
const loadSqlite = (): typeof import('node:sqlite') =>
  nodeRequire('node:sqlite');

export interface AnyStatement {
  all(...params: any[]): Promise<any[]>;
  get(...params: any[]): Promise<any>;
  run(...params: any[]): Promise<{
    changes: number;
    lastInsertRowid?: any;
  }>;
}

export interface AnyDatabase {
  prepare(sql: string): AnyStatement;
  exec(sql: string): Promise<void>;
  isMySQL(): boolean;
  close(): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Utilidades de parámetros y fechas                                  */
/* ------------------------------------------------------------------ */

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function toMySQLDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function flattenParams(params: any[], forMySQL = false): any[] {
  const flat =
    params.length === 1 && Array.isArray(params[0])
      ? params[0]
      : params;

  return flat.map((value: any) => {
    if (value === undefined) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;

    if (forMySQL) {
      if (value instanceof Date) {
        return toMySQLDateTime(value);
      }

      if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
        const date = new Date(value);

        if (!Number.isNaN(date.getTime())) {
          return toMySQLDateTime(date);
        }
      }
    }

    return value;
  });
}

/* ------------------------------------------------------------------ */
/* Traductor SQLite -> MySQL                                          */
/* ------------------------------------------------------------------ */

function translateDateFn(
  fn: string,
  rawMods: string,
  original: string,
): string {
  const mods = [...rawMods.matchAll(/'([^']*)'/g)].map((match) =>
    match[1].trim().toLowerCase(),
  );

  let expr = 'NOW()';

  for (const modifier of mods) {
    if (modifier === 'localtime' || modifier === 'utc') {
      continue;
    }

    if (modifier === 'start of month') {
      expr = `DATE_FORMAT(${expr}, '%Y-%m-01 00:00:00')`;
    } else if (modifier === 'start of year') {
      expr = `DATE_FORMAT(${expr}, '%Y-01-01 00:00:00')`;
    } else if (modifier === 'start of day') {
      expr = `DATE_FORMAT(${expr}, '%Y-%m-%d 00:00:00')`;
    } else {
      const match = modifier.match(
        /^([+-]?\d+)\s*(second|minute|hour|day|month|year)s?$/,
      );

      if (!match) return original;

      const amount = Number.parseInt(match[1], 10);
      const unit = match[2].toUpperCase();

      expr = `DATE_${amount < 0 ? 'SUB' : 'ADD'}(${expr}, INTERVAL ${Math.abs(amount)} ${unit})`;
    }
  }

  return fn.toLowerCase() === 'date'
    ? `DATE(${expr})`
    : expr;
}

function translateSqlForMySQL(sql: string): string {
  return sql
    .replace(
      /\b(datetime|date)\(\s*'now'((?:\s*,\s*'[^']*')*)\s*\)/gi,
      (match, fn: string, modifiers: string) =>
        translateDateFn(fn, modifiers, match),
    )
    .replace(/\bMAX\(\s*0\s*,/gi, 'GREATEST(0,')
    .replace(/INSERT OR IGNORE INTO/gi, 'INSERT IGNORE INTO')
    .replace(/INSERT OR REPLACE INTO/gi, 'REPLACE INTO');
}

/* ------------------------------------------------------------------ */
/* Contexto transaccional                                             */
/* ------------------------------------------------------------------ */

interface TxContext {
  conn?: mysql.PoolConnection;
}

const txStore = new AsyncLocalStorage<TxContext>();

/* ------------------------------------------------------------------ */
/* Adaptador SQLite                                                   */
/* ------------------------------------------------------------------ */

class SQLiteAdapter implements AnyDatabase {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  prepare(sql: string): AnyStatement {
    const statement = this.db.prepare(sql);

    return {
      all: async (...params: any[]) =>
        statement.all(...flattenParams(params)),

      get: async (...params: any[]) =>
        statement.get(...flattenParams(params)),

      run: async (...params: any[]) => {
        const result = statement.run(...flattenParams(params));

        return {
          changes: Number(result.changes),
          lastInsertRowid: result.lastInsertRowid,
        };
      },
    };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  isMySQL(): boolean {
    return false;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

/* ------------------------------------------------------------------ */
/* Adaptador MySQL                                                    */
/* ------------------------------------------------------------------ */

class MySQLAdapter implements AnyDatabase {
  private pool: mysql.Pool;

  private configuredConnections = new WeakSet<mysql.PoolConnection>();

  private configurationPromises = new WeakMap<
    mysql.PoolConnection,
    Promise<void>
  >();

  private timezone: string;

  constructor(pool: mysql.Pool, timezone: string) {
    this.pool = pool;
    this.timezone = timezone;
  }

  private async configureConnection(
    conn: mysql.PoolConnection,
  ): Promise<void> {
    const existing = this.configurationPromises.get(conn);

    if (existing) {
      return existing;
    }

    const configuration = (async () => {
      await conn.query(
        `SET SESSION sql_mode = CONCAT_WS(',', @@sql_mode, 'PIPES_AS_CONCAT')`,
      );

      await conn.query(
        'SET SESSION time_zone = ?',
        [this.timezone],
      );

      this.configuredConnections.add(conn);
    })();

    this.configurationPromises.set(conn, configuration);

    try {
      await configuration;
    } catch (error) {
      this.configurationPromises.delete(conn);
      throw error;
    }
  }

  private async acquireConnection(): Promise<mysql.PoolConnection> {
    const conn = await this.pool.getConnection();

    try {
      await this.configureConnection(conn);
      return conn;
    } catch (error) {
      conn.destroy();
      throw error;
    }
  }

  private async execute<T>(
    operation: (
      executor: mysql.PoolConnection,
    ) => Promise<T>,
  ): Promise<T> {
    const transactionConnection = txStore.getStore()?.conn;

    if (transactionConnection) {
      await this.configureConnection(transactionConnection);
      return operation(transactionConnection);
    }

    const conn = await this.acquireConnection();

    try {
      return await operation(conn);
    } finally {
      conn.release();
    }
  }

  async getConnection(): Promise<mysql.PoolConnection> {
    return this.acquireConnection();
  }

  prepare(sql: string): AnyStatement {
    const cleanSql = translateSqlForMySQL(sql);

    return {
      all: async (...params: any[]) =>
        this.execute(async (conn) => {
          const [rows] = await conn.query(
            cleanSql,
            flattenParams(params, true),
          );

          return rows as any[];
        }),

      get: async (...params: any[]) =>
        this.execute(async (conn) => {
          const [rows] = await conn.query(
            cleanSql,
            flattenParams(params, true),
          );

          const result = rows as any[];
          return result.length > 0 ? result[0] : undefined;
        }),

      run: async (...params: any[]) =>
        this.execute(async (conn) => {
          const [result] = await conn.query(
            cleanSql,
            flattenParams(params, true),
          );

          const header = result as mysql.ResultSetHeader;

          return {
            changes: header.affectedRows || 0,
            lastInsertRowid: header.insertId || undefined,
          };
        }),
    };
  }

  async exec(sql: string): Promise<void> {
    await this.execute(async (conn) => {
      await conn.query(translateSqlForMySQL(sql));
    });
  }

  isMySQL(): boolean {
    return true;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/* ------------------------------------------------------------------ */
/* Inicialización                                                     */
/* ------------------------------------------------------------------ */

let dbInstance: AnyDatabase | null = null;
let sqliteRaw: DatabaseSync | null = null;

export const getDb = (): AnyDatabase => {
  if (!dbInstance) {
    initDatabase();
  }

  return dbInstance!;
};

function initialPassword(
  envName: string,
  label: string,
): string {
  const fromEnv = process.env[envName];

  if (fromEnv && fromEnv.length >= 8) {
    return fromEnv;
  }

  const generated = crypto.randomBytes(9).toString('base64url');

  console.warn(
    `Usuario inicial "${label}" creado con contraseña temporal: ${generated}`,
  );

  return generated;
}

function seedDefaultUsers(raw: DatabaseSync): void {
  try {
    const row = raw
      .prepare('SELECT COUNT(*) AS c FROM users')
      .get() as { c: number } | undefined;

    if (row && Number(row.c) > 0) return;

    const now = new Date().toISOString();

    const adminHash = bcrypt.hashSync(
      initialPassword('ADMIN_INITIAL_PASSWORD', 'admin'),
      10,
    );

    const cashierHash = bcrypt.hashSync(
      initialPassword('CASHIER_INITIAL_PASSWORD', 'caja'),
      10,
    );

    raw.prepare(`
      INSERT INTO users
      (
        id, username, email, password_hash, full_name,
        role, is_active, created_at, updated_at
      )
      VALUES (
        ?, 'admin', 'admin@elitestudio.com', ?,
        'Administrador Principal', 'admin', 1, ?, ?
      )
    `).run('u-admin-01', adminHash, now, now);

    raw.prepare(`
      INSERT INTO users
      (
        id, username, email, password_hash, full_name,
        role, is_active, created_at, updated_at
      )
      VALUES (
        ?, 'caja', 'caja@elitestudio.com', ?,
        'Cajero de Turno', 'cashier', 1, ?, ?
      )
    `).run('u-cashier-01', cashierHash, now, now);
  } catch (error) {
    console.error(
      'No se pudieron crear los usuarios iniciales:',
      error,
    );
  }
}

export const initDatabase = (): AnyDatabase => {
  if (dbInstance) return dbInstance;

  if (env.DB_TYPE === 'mysql' && env.DB_USER) {
    console.log(
      `Conectando a MySQL en ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}...`,
    );

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

    const timezone = env.DB_TIMEZONE || '+00:00';

    dbInstance = new MySQLAdapter(pool, timezone);

    console.log('Pool de conexiones MySQL configurado.');
    return dbInstance;
  }

  console.log('Iniciando base de datos SQLite local...');

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

  const schemaPath = possiblePaths.find((candidate) =>
    fs.existsSync(candidate),
  );

  if (schemaPath) {
    try {
      raw.exec(fs.readFileSync(schemaPath, 'utf8'));
    } catch (error) {
      console.error(
        'Error ejecutando el esquema SQLite:',
        error,
      );
      raw.close();
      throw error;
    }
  }

  seedDefaultUsers(raw);

  sqliteRaw = raw;
  dbInstance = new SQLiteAdapter(raw);

  return dbInstance;
};

/* ------------------------------------------------------------------ */
/* Verificación de conexión y tablas                                  */
/* ------------------------------------------------------------------ */

export const verifyDatabase = async (): Promise<void> => {
  const db = getDb();

  if (db instanceof MySQLAdapter) {
    const conn = await db.getConnection();

    try {
      await conn.query('SELECT 1 AS connected');

      const requiredTables = [
        'users',
        'stylists',
        'categories',
        'services',
        'service_stylist_margins',
        'service_variants',
        'products',
        'cash_registers',
        'sales',
        'sale_items',
        'stylist_payouts',
        'commissions',
        'stylist_payout_items',
        'cash_movements',
        'settings',
        'audit_logs',
      ];

      const placeholders = requiredTables
        .map(() => '?')
        .join(',');

      const [rows] = await conn.query(
        `SELECT TABLE_NAME
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
         AND TABLE_NAME IN (${placeholders})`,
        requiredTables,
      );

      const existingTables = new Set(
        (rows as Array<{ TABLE_NAME: string }>).map(
          (row) => row.TABLE_NAME,
        ),
      );

      const missingTables = requiredTables.filter(
        (table) => !existingTables.has(table),
      );

      if (missingTables.length > 0) {
        throw new Error(
          `Faltan tablas en MySQL: ${missingTables.join(', ')}. Importá el esquema SQL desde phpMyAdmin.`,
        );
      }

      console.log('Conexión MySQL verificada correctamente.');
      console.log(
        `Estructura verificada: ${requiredTables.length} tablas.`,
      );
    } finally {
      conn.release();
    }

    return;
  }

  await db.prepare('SELECT 1 AS connected').get();

  console.log('Conexión SQLite verificada correctamente.');
};

/* ------------------------------------------------------------------ */
/* Transacciones                                                      */
/* ------------------------------------------------------------------ */

let sqliteLock: Promise<void> = Promise.resolve();

export const transaction = async <T>(
  fn: () => Promise<T> | T,
): Promise<T> => {
  if (txStore.getStore()) {
    return await fn();
  }

  const db = getDb();

  if (db instanceof MySQLAdapter) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const result = await txStore.run(
        { conn },
        async () => await fn(),
      );

      await conn.commit();
      return result;
    } catch (error) {
      try {
        await conn.rollback();
      } catch {
        // La conexión pudo haberse perdido.
      }

      throw error;
    } finally {
      conn.release();
    }
  }

  const previous = sqliteLock;

  let release!: () => void;

  sqliteLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    await db.exec('BEGIN TRANSACTION;');

    try {
      const result = await txStore.run(
        {},
        async () => await fn(),
      );

      await db.exec('COMMIT;');
      return result;
    } catch (error) {
      try {
        await db.exec('ROLLBACK;');
      } catch {
        // Sin transacción activa.
      }

      throw error;
    }
  } finally {
    release();
  }
};

/* ------------------------------------------------------------------ */
/* Respaldos                                                          */
/* ------------------------------------------------------------------ */

const backupDirPath = () =>
  path.resolve(process.cwd(), 'backups');

export const backupDatabase = () => {
  const backupDir = backupDirPath();

  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const filename = `backup_${timestamp}.db`;
  const destPath = path.join(backupDir, filename);

  const db = getDb();

  if (db.isMySQL()) {
    const metaFilename = `backup_mysql_${timestamp}.json`;
    const metaFile = path.join(backupDir, metaFilename);

    const info = {
      filename: metaFilename,
      path: metaFile,
      type: 'mysql',
      createdAt: new Date().toISOString(),
      note:
        'Base de datos MySQL. Las copias completas deben gestionarse desde phpMyAdmin o el panel de Hostinger.',
    };

    fs.writeFileSync(
      metaFile,
      JSON.stringify(info, null, 2),
      'utf8',
    );

    return info;
  }

  if (!sqliteRaw) {
    throw new Error('La conexión SQLite no está disponible.');
  }

  try {
    sqliteRaw.exec(
      `VACUUM INTO '${destPath.replace(/'/g, "''")}'`,
    );
  } catch (error) {
    const sourcePath = path.resolve(
      process.cwd(),
      env.DATABASE_PATH,
    );

    if (!fs.existsSync(sourcePath)) {
      throw error;
    }

    fs.copyFileSync(sourcePath, destPath);
  }

  return {
    filename,
    path: destPath,
    createdAt: new Date().toISOString(),
    size: fs.existsSync(destPath)
      ? fs.statSync(destPath).size
      : 0,
  };
};

export const listBackups = () => {
  const backupDir = backupDirPath();

  if (!fs.existsSync(backupDir)) return [];

  return fs
    .readdirSync(backupDir)
    .filter((file) => {
      const fullPath = path.join(backupDir, file);
      return fs.statSync(fullPath).isFile();
    })
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
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
};

export const restoreDatabase = (backupPath: string): void => {
  const db = getDb();

  if (db.isMySQL()) {
    throw new Error(
      'La restauración en MySQL debe realizarse a través de phpMyAdmin o el panel de Hostinger.',
    );
  }

  if (
    typeof backupPath !== 'string' ||
    !backupPath.trim()
  ) {
    throw new Error('Ruta de respaldo inválida.');
  }

  const backupDir = backupDirPath();
  const resolved = path.resolve(backupDir, backupPath);

  if (
    !resolved.startsWith(backupDir + path.sep) ||
    path.extname(resolved).toLowerCase() !== '.db'
  ) {
    throw new Error('Ruta de respaldo no permitida.');
  }

  if (
    !fs.existsSync(resolved) ||
    !fs.statSync(resolved).isFile()
  ) {
    throw new Error(
      'El archivo de respaldo especificado no existe.',
    );
  }

  const destPath = path.resolve(
    process.cwd(),
    env.DATABASE_PATH,
  );

  try {
    sqliteRaw?.close();
  } catch {
    // La conexión pudo estar cerrada.
  }

  sqliteRaw = null;
  dbInstance = null;

  fs.mkdirSync(path.dirname(destPath), {
    recursive: true,
  });

  fs.copyFileSync(resolved, destPath);

  for (const extension of ['-wal', '-shm']) {
    try {
      fs.rmSync(destPath + extension, { force: true });
    } catch {
      // Ignorar archivos auxiliares inexistentes.
    }
  }

  initDatabase();
};
