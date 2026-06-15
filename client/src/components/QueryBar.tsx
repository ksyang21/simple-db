import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type QueryMode = "filter" | "sql";

interface QueryBarProps {
  mode: QueryMode;
  onModeChange: (mode: QueryMode) => void;
  onRun: (mode: QueryMode, value: string) => void;
  loading: boolean;
  disabled: boolean;
}

export function QueryBar({
  mode,
  onModeChange,
  onRun,
  loading,
  disabled,
}: QueryBarProps) {
  const [filter, setFilter] = useState("");
  const [sql, setSql] = useState("");

  function handleRun() {
    onRun(mode, mode === "filter" ? filter : sql);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleRun();
    }
  }

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
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="WHERE clause, e.g. status = 'active' AND id > 100"
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Enter a WHERE clause fragment. Press ⌘+Enter to run.
          </p>
        </TabsContent>
        <TabsContent value="sql" className="mt-3">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="SELECT * FROM users WHERE status = 'active'"
            disabled={false}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Read-only SELECT queries only. Press ⌘+Enter to run.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
