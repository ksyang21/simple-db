import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutocompleteField } from "@/components/AutocompleteField";

export type QueryMode = "filter" | "sql";

interface QueryBarProps {
  mode: QueryMode;
  onModeChange: (mode: QueryMode) => void;
  onRun: (mode: QueryMode, value: string) => void;
  loading: boolean;
  disabled: boolean;
  filter: string;
  sql: string;
  onFilterChange: (value: string) => void;
  onSqlChange: (value: string) => void;
  selectedDatabase: string;
  tables: string[];
  columns: string[];
  tableColumns: Record<string, string[]>;
  onRequestTableColumns: (table: string) => void;
}

export function QueryBar({
  mode,
  onModeChange,
  onRun,
  loading,
  disabled,
  filter,
  sql,
  onFilterChange,
  onSqlChange,
  selectedDatabase,
  tables,
  columns,
  tableColumns,
  onRequestTableColumns,
}: QueryBarProps) {
  function handleRun() {
    onRun(mode, mode === "filter" ? filter : sql);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleRun();
    }
  }

  const databaseHint = selectedDatabase
    ? `Queries use database \`${selectedDatabase}\` unless you qualify with another name (e.g. other_db.table).`
    : "Select a database first.";

  return (
    <div className="border-b p-4">
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as QueryMode)}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="filter">Filter</TabsTrigger>
            <TabsTrigger value="sql">SQL</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={handleRun} disabled={loading || disabled}>
            {loading ? <Loader2 className="animate-spin" /> : <Play className="h-4 w-4" />}
            Run
          </Button>
        </div>
        <TabsContent value="filter" className="mt-3">
          <AutocompleteField
            mode="filter"
            value={filter}
            onChange={onFilterChange}
            onKeyDown={handleKeyDown}
            tables={tables}
            columns={columns}
            tableColumns={tableColumns}
            placeholder="WHERE clause, e.g. status = 'active' AND id > 100"
            disabled={disabled}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Enter a WHERE clause fragment. Tab/↑↓ to autocomplete columns. Press ⌘+Enter to run.
          </p>
        </TabsContent>
        <TabsContent value="sql" className="mt-3">
          <AutocompleteField
            mode="sql"
            value={sql}
            onChange={onSqlChange}
            onKeyDown={handleKeyDown}
            tables={tables}
            columns={columns}
            tableColumns={tableColumns}
            onRequestTableColumns={onRequestTableColumns}
            multiline
            rows={3}
            placeholder="SELECT * FROM users WHERE status = 'active'"
            disabled={!selectedDatabase}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {databaseHint} Tab/↑↓ to autocomplete tables and columns. Press ⌘+Enter to run.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
