import mysql from "mysql2/promise";

export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error("Not connected to MySQL");
  }
  return pool;
}

export function isConnected(): boolean {
  return pool !== null;
}

export async function connect(config: ConnectionConfig): Promise<string[]> {
  if (pool) {
    await pool.end();
    pool = null;
  }

  pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    waitForConnections: true,
    connectionLimit: 5,
  });

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>("SHOW DATABASES");
    return rows
      .map((row) => row.Database as string)
      .filter((name) => !["information_schema", "performance_schema", "mysql", "sys"].includes(name));
  } finally {
    connection.release();
  }
}

export async function disconnect(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export function escapeId(identifier: string): string {
  return "`" + identifier.replace(/`/g, "``") + "`";
}

export async function withDatabaseConnection<T>(
  database: string | undefined,
  fn: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool!.getConnection();
  try {
    if (database) {
      await connection.query(`USE ${escapeId(database)}`);
    }
    return await fn(connection);
  } finally {
    connection.release();
  }
}

export function validateDatabaseName(database: string): string {
  const trimmed = database.trim();
  if (!trimmed) {
    throw new Error("Database name is required");
  }
  if (!/^[a-zA-Z0-9_$]+$/.test(trimmed)) {
    throw new Error("Invalid database name");
  }
  return trimmed;
}
