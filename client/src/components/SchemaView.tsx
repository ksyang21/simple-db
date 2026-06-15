import type { TableSchemaResult } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SchemaViewProps {
  title: string;
  schema: TableSchemaResult | null;
  loading: boolean;
}

function formatDefault(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  return String(value);
}

export function SchemaView({ title, schema, loading }: SchemaViewProps) {
  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Select a table to view its columns
      </div>
    );
  }

  const { columns } = schema;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">
          {columns.length} column{columns.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Null</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Extra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No columns found
                </TableCell>
              </TableRow>
            ) : (
              columns.map((col, index) => (
                <TableRow key={col.field} className={index % 2 === 1 ? "bg-muted/20" : ""}>
                  <TableCell className="font-medium">{col.field}</TableCell>
                  <TableCell className="font-mono text-xs">{col.type}</TableCell>
                  <TableCell>{col.null ? "YES" : "NO"}</TableCell>
                  <TableCell>
                    {col.key ? (
                      <Badge variant={col.key === "PRI" ? "default" : "secondary"}>{col.key}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatDefault(col.default)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{col.extra || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
