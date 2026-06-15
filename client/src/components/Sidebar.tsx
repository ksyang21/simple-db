import { useEffect, useMemo, useState } from "react";
import { Search, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarProps {
  databases: string[];
  selectedDatabase: string;
  onDatabaseChange: (db: string) => void;
  tables: string[];
  selectedTable: string | null;
  onTableSelect: (table: string) => void;
  loadingTables: boolean;
}

export function Sidebar({
  databases,
  selectedDatabase,
  onDatabaseChange,
  tables,
  selectedTable,
  onTableSelect,
  loadingTables,
}: SidebarProps) {
  const [search, setSearch] = useState("");

  const filteredTables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tables;
    return tables.filter((table) => table.toLowerCase().includes(query));
  }, [tables, search]);

  useEffect(() => {
    setSearch("");
  }, [selectedDatabase]);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-card/50">
      <div className="space-y-2 p-4">
        <Label>Database</Label>
        <Select value={selectedDatabase} onValueChange={onDatabaseChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select database" />
          </SelectTrigger>
          <SelectContent>
            {databases.map((db) => (
              <SelectItem key={db} value={db}>
                {db}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground">
        <Table2 className="h-4 w-4" />
        Tables
      </div>
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tables…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loadingTables ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : tables.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground">No tables found</p>
        ) : filteredTables.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground">No matching tables</p>
        ) : (
          <ul className="space-y-0.5">
            {filteredTables.map((table) => (
              <li key={table}>
                <button
                  type="button"
                  onClick={() => onTableSelect(table)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    selectedTable === table &&
                      "border-l-2 border-primary bg-accent font-medium text-primary pl-[10px]"
                  )}
                >
                  {table}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
