const FORBIDDEN_KEYWORDS = [
  "DROP",
  "DELETE",
  "INSERT",
  "UPDATE",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "REPLACE",
  "GRANT",
  "REVOKE",
  "EXEC",
  "EXECUTE",
  "CALL",
  "LOAD",
  "INTO",
  "OUTFILE",
  "DUMPFILE",
  "SET",
  "LOCK",
  "UNLOCK",
];

export function validateFilter(filter: string): void {
  const trimmed = filter.trim();
  if (!trimmed) return;

  if (trimmed.includes(";")) {
    throw new Error("Filter cannot contain semicolons");
  }

  const upper = trimmed.toUpperCase();
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`);
    if (pattern.test(upper)) {
      throw new Error(`Filter contains forbidden keyword: ${keyword}`);
    }
  }
}

export function validateSelectSql(sql: string): void {
  const trimmed = sql.trim();
  if (!trimmed) {
    throw new Error("SQL query cannot be empty");
  }

  if (!/^\s*SELECT\b/i.test(trimmed)) {
    throw new Error("Only SELECT queries are allowed");
  }

  if (trimmed.includes(";")) {
    const parts = trimmed.split(";").filter((p) => p.trim());
    if (parts.length > 1) {
      throw new Error("Multiple statements are not allowed");
    }
  }

  const upper = trimmed.toUpperCase();
  for (const keyword of ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "TRUNCATE"]) {
    const pattern = new RegExp(`\\b${keyword}\\b`);
    if (pattern.test(upper)) {
      throw new Error(`Query contains forbidden keyword: ${keyword}`);
    }
  }
}

export function clampLimit(limit: number): number {
  return Math.min(Math.max(1, limit), 200);
}

export function clampPage(page: number): number {
  return Math.max(1, page);
}

export function parseSortOrder(order: string | undefined): "ASC" | "DESC" {
  if (!order) return "ASC";
  const upper = order.toUpperCase();
  if (upper === "ASC" || upper === "DESC") return upper;
  throw new Error("Sort order must be asc or desc");
}

export function validateSortColumn(column: string, allowedColumns: string[]): string {
  const trimmed = column.trim();
  if (!trimmed) {
    throw new Error("Sort column is required");
  }
  if (!allowedColumns.includes(trimmed)) {
    throw new Error(`Invalid sort column: ${trimmed}`);
  }
  return trimmed;
}

export function validateSortColumnName(column: string): string {
  const trimmed = column.trim();
  if (!trimmed) {
    throw new Error("Sort column is required");
  }
  if (!/^[a-zA-Z0-9_$]+$/.test(trimmed)) {
    throw new Error("Sort column contains invalid characters");
  }
  return trimmed;
}

export interface ColumnSchema {
  field: string;
  type: string;
  null: boolean;
  key: string;
  default: unknown;
  extra: string;
}

export function serializeDefault(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

export function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[key] = serializeValue(value);
  }
  return result;
}
