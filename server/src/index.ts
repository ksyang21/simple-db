import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { connect, disconnect, escapeId, getPool, isConnected, validateDatabaseName, withDatabaseConnection } from "./db.js";
import {
  clampLimit,
  clampPage,
  parseSortOrder,
  serializeRow,
  validateFilter,
  validateSelectSql,
  validateSortColumn,
  validateSortColumnName,
} from "./query.js";

const app = new Hono();

app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, connected: isConnected() }));

app.post("/api/connect", async (c) => {
  try {
    const body = await c.req.json<{
      host?: string;
      port?: number;
      user?: string;
      password?: string;
    }>();

    const host = body.host?.trim() || "127.0.0.1";
    const port = body.port ?? 3306;
    const user = body.user?.trim();
    const password = body.password ?? "";

    if (!user) {
      return c.json({ error: "Username is required" }, 400);
    }

    const databases = await connect({ host, port, user, password });
    return c.json({ databases });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return c.json({ error: message }, 400);
  }
});

app.post("/api/disconnect", async (c) => {
  await disconnect();
  return c.json({ ok: true });
});

app.get("/api/databases/:db/tables", async (c) => {
  try {
    const db = c.req.param("db");
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SHOW TABLES FROM ${escapeId(db)}`
    );
    const key = `Tables_in_${db}`;
    const tables = rows.map((row) => row[key] as string);
    return c.json({ tables });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list tables";
    return c.json({ error: message }, 400);
  }
});

app.get("/api/databases/:db/tables/:table/schema", async (c) => {
  try {
    const db = c.req.param("db");
    const table = c.req.param("table");
    const schema = await getTableSchema(db, table);
    return c.json(schema);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch schema";
    return c.json({ error: message }, 400);
  }
});

app.get("/api/databases/:db/tables/:table", async (c) => {
  try {
    const db = c.req.param("db");
    const table = c.req.param("table");
    const page = clampPage(Number(c.req.query("page") ?? 1));
    const limit = clampLimit(Number(c.req.query("limit") ?? 50));
    const filter = c.req.query("filter")?.trim() ?? "";
    const offset = (page - 1) * limit;

    validateFilter(filter);

    const pool = getPool();
    const tableRef = `${escapeId(db)}.${escapeId(table)}`;
    const whereClause = filter ? ` WHERE ${filter}` : "";
    const columns = await getTableColumns(db, table);
    const { primaryKeys } = await getTableSchema(db, table);

    const sortParam = c.req.query("sort")?.trim() ?? "";
    const orderParam = c.req.query("order")?.trim();
    let orderClause = "";
    if (sortParam) {
      const sortColumn = validateSortColumn(sortParam, columns);
      const sortOrder = parseSortOrder(orderParam);
      orderClause = ` ORDER BY ${escapeId(sortColumn)} ${sortOrder}`;
    }

    const countSql = `SELECT COUNT(*) AS total FROM ${tableRef}${whereClause}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql);
    const total = Number(countRows[0]?.total ?? 0);

    const dataSql = `SELECT * FROM ${tableRef}${whereClause}${orderClause} LIMIT ? OFFSET ?`;
    const [rows] = await pool.query<RowDataPacket[]>(dataSql, [limit, offset]);

    return c.json({
      columns,
      rows: rows.map((row) => serializeRow(row as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      sort: sortParam || null,
      order: sortParam ? (orderParam?.toLowerCase() === "desc" ? "desc" : "asc") : null,
      primaryKeys,
      editable: primaryKeys.length > 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch table data";
    return c.json({ error: message }, 400);
  }
});

app.patch("/api/databases/:db/tables/:table/row", async (c) => {
  try {
    const db = c.req.param("db");
    const table = c.req.param("table");
    const body = await c.req.json<{
      primaryKey?: Record<string, unknown>;
      column?: string;
      value?: unknown;
    }>();

    const column = body.column?.trim();
    if (!column) {
      return c.json({ error: "Column is required" }, 400);
    }
    if (!body.primaryKey || Object.keys(body.primaryKey).length === 0) {
      return c.json({ error: "Primary key values are required" }, 400);
    }

    const schema = await getTableSchema(db, table);
    if (schema.primaryKeys.length === 0) {
      return c.json({ error: "Table has no primary key — cannot update rows safely" }, 400);
    }

    validateSortColumn(column, schema.columns.map((col) => col.field));

    for (const pk of schema.primaryKeys) {
      if (!(pk in body.primaryKey)) {
        return c.json({ error: `Missing primary key value for: ${pk}` }, 400);
      }
    }

    const pool = getPool();
    const tableRef = `${escapeId(db)}.${escapeId(table)}`;
    const setClause = `${escapeId(column)} = ?`;
    const whereParts = schema.primaryKeys.map((pk) => `${escapeId(pk)} = ?`);
    const sql = `UPDATE ${tableRef} SET ${setClause} WHERE ${whereParts.join(" AND ")}`;

    const params = [
      body.value === undefined ? null : body.value,
      ...schema.primaryKeys.map((pk) => body.primaryKey![pk] ?? null),
    ];

    const [result] = await pool.query(sql, params);
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) {
      return c.json({ error: "No row was updated — row may not exist" }, 400);
    }

    return c.json({ ok: true, affected });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return c.json({ error: message }, 400);
  }
});

app.post("/api/query", async (c) => {
  try {
    const body = await c.req.json<{
      sql?: string;
      database?: string;
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    }>();
    const sql = body.sql?.trim() ?? "";
    const page = clampPage(body.page ?? 1);
    const limit = clampLimit(body.limit ?? 50);
    const offset = (page - 1) * limit;
    const sortParam = body.sort?.trim() ?? "";
    const defaultDatabase = body.database?.trim()
      ? validateDatabaseName(body.database)
      : undefined;

    validateSelectSql(sql);

    const runQuery = async (connection: PoolConnection) => {
      const countSql = `SELECT COUNT(*) AS total FROM (${sql}) AS _q`;
      const [countRows] = await connection.query<RowDataPacket[]>(countSql);
      const total = Number(countRows[0]?.total ?? 0);

      let dataSql = `SELECT * FROM (${sql}) AS _q`;
      if (sortParam) {
        const sortColumn = validateSortColumnName(sortParam);
        const sortOrder = parseSortOrder(body.order);
        dataSql += ` ORDER BY ${escapeId(sortColumn)} ${sortOrder}`;
      }
      dataSql += " LIMIT ? OFFSET ?";
      const [rows] = await connection.query<RowDataPacket[]>(dataSql, [limit, offset]);

      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        columns,
        rows: rows.map((row) => serializeRow(row as Record<string, unknown>)),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        sort: sortParam || null,
        order: sortParam ? (body.order?.toLowerCase() === "desc" ? "desc" : "asc") : null,
      };
    };

    const result = await withDatabaseConnection(defaultDatabase, runQuery);

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    return c.json({ error: message }, 400);
  }
});

async function getTableSchema(db: string, table: string) {
  const pool = getPool();
  const tableRef = `${escapeId(db)}.${escapeId(table)}`;
  const [descRows] = await pool.query<RowDataPacket[]>(`DESCRIBE ${tableRef}`);

  const columns = descRows.map((row) => ({
    field: row.Field as string,
    type: row.Type as string,
    null: row.Null === "YES",
    key: (row.Key as string) || "",
    default: row.Default ?? null,
    extra: (row.Extra as string) || "",
  }));

  const primaryKeys = columns.filter((col) => col.key === "PRI").map((col) => col.field);

  return { columns, primaryKeys };
}

async function getTableColumns(db: string, table: string): Promise<string[]> {
  const { columns } = await getTableSchema(db, table);
  return columns.map((col) => col.field);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = process.env.CLIENT_DIST
  ? path.resolve(process.env.CLIENT_DIST)
  : path.resolve(__dirname, "../../client/dist");
const serveStaticFiles =
  process.env.NODE_ENV === "production" || Boolean(process.env.CLIENT_DIST);

if (serveStaticFiles) {
  app.use("*", serveStatic({ root: clientDist }));
  app.get("*", serveStatic({ path: "index.html", root: clientDist }));
}

const port = Number(process.env.PORT ?? (serveStaticFiles ? 8080 : 3001));
console.log(`Server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
