import { Columns3, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewMode = "data" | "schema";

interface ViewToolbarProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  disabled: boolean;
  editable: boolean;
}

export function ViewToolbar({ mode, onModeChange, disabled, editable }: ViewToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        <Button
          type="button"
          variant={mode === "data" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5"
          disabled={disabled}
          onClick={() => onModeChange("data")}
        >
          <Table2 className="h-3.5 w-3.5" />
          Data
        </Button>
        <Button
          type="button"
          variant={mode === "schema" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5"
          disabled={disabled}
          onClick={() => onModeChange("schema")}
        >
          <Columns3 className="h-3.5 w-3.5" />
          Columns
        </Button>
      </div>
      {mode === "data" && editable && (
        <span className="text-xs text-muted-foreground">Double-click a cell to edit</span>
      )}
      {mode === "data" && !editable && !disabled && (
        <span className="text-xs text-muted-foreground">No primary key — read only</span>
      )}
    </div>
  );
}
