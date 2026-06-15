import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, TableProperties, X } from "lucide-react";
import type { SortOrder, TableDataResult } from "@/api";
import { cn, formatCellValue, isTruncated } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/Pagination";

interface DataGridProps {
  title: string;
  data: TableDataResult | null;
  loading: boolean;
  page: number;
  limit: number;
  sortColumn: string | null;
  sortOrder: SortOrder | null;
  editable: boolean;
  saving: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSortChange: (column: string | null, order: SortOrder | null) => void;
  onCellSave: (
    row: Record<string, unknown>,
    column: string,
    value: string
  ) => Promise<void>;
}

export function DataGrid({
  title,
  data,
  loading,
  page,
  limit,
  sortColumn,
  sortOrder,
  editable,
  saving,
  onPageChange,
  onLimitChange,
  onSortChange,
  onCellSave,
}: DataGridProps) {
  const [expandedCell, setExpandedCell] = useState<{ column: string; value: string } | null>(null);
  const [editing, setEditing] = useState<{ rowIndex: number; column: string; value: string } | null>(
    null
  );

  function handleSort(column: string) {
    if (sortColumn !== column) {
      onSortChange(column, "asc");
      return;
    }
    if (sortOrder === "asc") {
      onSortChange(column, "desc");
      return;
    }
    onSortChange(null, null);
  }

  function sortIcon(column: string) {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    }
    if (sortOrder === "desc") {
      return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
    }
    return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
  }

  async function handleSaveEdit() {
    if (!editing || !data) return;
    const row = data.rows[editing.rowIndex];
    await onCellSave(row, editing.column, editing.value);
    setEditing(null);
  }

  function startEdit(rowIndex: number, column: string, value: unknown) {
    if (!editable || saving || !data) return;
    if (data.primaryKeys?.includes(column)) return;
    setEditing({
      rowIndex,
      column,
      value: value === null || value === undefined ? "" : String(value),
    });
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <TableProperties className="h-12 w-12 opacity-40" />
        <p className="text-sm">Select a table to view its data</p>
      </div>
    );
  }

  const { columns, rows, total, totalPages, primaryKeys = [] } = data;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">
          {total.toLocaleString()} row{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {columns.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No rows found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col} className="whitespace-nowrap p-0">
                    <button
                      type="button"
                      onClick={() => handleSort(col)}
                      className={cn(
                        "flex h-10 w-full items-center gap-1.5 px-3 text-left transition-colors hover:bg-accent/50",
                        sortColumn === col && "text-primary"
                      )}
                    >
                      <span>{col}</span>
                      {sortIcon(col)}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No rows found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className={rowIndex % 2 === 1 ? "bg-muted/20" : ""}>
                    {columns.map((col) => {
                      const value = row[col];
                      const isEditing =
                        editing?.rowIndex === rowIndex && editing.column === col;
                      const isPrimaryKey = primaryKeys.includes(col);

                      if (isEditing) {
                        return (
                          <TableCell key={col} className="p-1">
                            <div className="flex min-w-[200px] items-center gap-1">
                              <Input
                                value={editing.value}
                                onChange={(e) =>
                                  setEditing({ ...editing, value: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void handleSaveEdit();
                                  if (e.key === "Escape") setEditing(null);
                                }}
                                className="h-8 font-mono text-xs"
                                autoFocus
                                disabled={saving}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                onClick={() => void handleSaveEdit()}
                                disabled={saving}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                onClick={() => setEditing(null)}
                                disabled={saving}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        );
                      }

                      const display = formatCellValue(value);
                      const truncated = isTruncated(value);
                      return (
                        <TableCell
                          key={col}
                          className={cn(
                            "max-w-xs whitespace-nowrap font-mono text-xs",
                            truncated && "cursor-pointer hover:text-primary",
                            value === null && "text-muted-foreground italic",
                            isPrimaryKey && "bg-primary/5",
                            editable && !isPrimaryKey && "cursor-text"
                          )}
                          onClick={
                            truncated
                              ? () => setExpandedCell({ column: col, value: String(value) })
                              : undefined
                          }
                          onDoubleClick={() => startEdit(rowIndex, col, value)}
                          title={
                            editable
                              ? "Double-click to edit"
                              : truncated
                                ? "Click to expand"
                                : undefined
                          }
                        >
                          {display}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />

      <Dialog open={expandedCell !== null} onOpenChange={() => setExpandedCell(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>{expandedCell?.column}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap break-all font-mono text-sm">
            {expandedCell?.value}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
