export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export type SortOrder = "asc" | "desc";

export interface TableDataResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sort?: string | null;
  order?: SortOrder | null;
  primaryKeys?: string[];
  editable?: boolean;
}

export interface ColumnSchema {
  field: string;
  type: string;
  null: boolean;
  key: string;
  default: unknown;
  extra: string;
}

export interface TableSchemaResult {
  columns: ColumnSchema[];
  primaryKeys: string[];
}

export interface SortState {
  column: string | null;
  order: SortOrder | null;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data as T;
}

export async function connect(config: ConnectionConfig): Promise<string[]> {
  const data = await request<{ databases: string[] }>("/api/connect", {
    method: "POST",
    body: JSON.stringify(config),
  });
  return data.databases;
}

export async function disconnect(): Promise<void> {
  await request("/api/disconnect", { method: "POST" });
}

export async function fetchTables(database: string): Promise<string[]> {
  const data = await request<{ tables: string[] }>(
    `/api/databases/${encodeURIComponent(database)}/tables`
  );
  return data.tables;
}

export async function fetchTableSchema(
  database: string,
  table: string
): Promise<TableSchemaResult> {
  return request<TableSchemaResult>(
    `/api/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/schema`
  );
}

export async function updateTableCell(
  database: string,
  table: string,
  primaryKey: Record<string, unknown>,
  column: string,
  value: unknown
): Promise<void> {
  await request(
    `/api/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/row`,
    {
      method: "PATCH",
      body: JSON.stringify({ primaryKey, column, value: value === "" ? null : value }),
    }
  );
}

export async function fetchTableData(
  database: string,
  table: string,
  page: number,
  limit: number,
  filter?: string,
  sort?: SortState
): Promise<TableDataResult> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (filter?.trim()) {
    params.set("filter", filter.trim());
  }
  if (sort?.column && sort.order) {
    params.set("sort", sort.column);
    params.set("order", sort.order);
  }
  return request<TableDataResult>(
    `/api/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}?${params}`
  );
}

export async function runQuery(
  sql: string,
  database: string,
  page: number,
  limit: number,
  sort?: SortState
): Promise<TableDataResult> {
  return request<TableDataResult>("/api/query", {
    method: "POST",
    body: JSON.stringify({
      sql,
      database,
      page,
      limit,
      sort: sort?.column ?? undefined,
      order: sort?.order ?? undefined,
    }),
  });
}
