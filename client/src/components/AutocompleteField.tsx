import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  applySuggestion,
  buildSuggestions,
  getAutocompleteContext,
  getReferencedTable,
  getWordAtCursor,
} from "@/lib/autocomplete";

interface AutocompleteFieldProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  mode: "filter" | "sql";
  tables: string[];
  columns: string[];
  tableColumns: Record<string, string[]>;
  onRequestTableColumns?: (table: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AutocompleteField({
  value,
  onChange,
  onKeyDown,
  mode,
  tables,
  columns,
  tableColumns,
  onRequestTableColumns,
  multiline = false,
  rows = 3,
  placeholder,
  disabled,
  className,
}: AutocompleteFieldProps) {
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(0);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const word = useMemo(() => getWordAtCursor(value, cursor), [value, cursor]);
  const context = useMemo(
    () => getAutocompleteContext(value, cursor, mode),
    [value, cursor, mode]
  );

  const activeColumns = useMemo(() => {
    if (mode === "filter") return columns;
    const referencedTable = getReferencedTable(value, cursor);
    if (referencedTable && tableColumns[referencedTable]?.length) {
      return tableColumns[referencedTable];
    }
    return columns;
  }, [mode, value, cursor, columns, tableColumns]);

  useEffect(() => {
    if (mode !== "sql" || !onRequestTableColumns) return;
    const referencedTable = getReferencedTable(value, cursor);
    if (referencedTable && !tableColumns[referencedTable]) {
      onRequestTableColumns(referencedTable);
    }
  }, [mode, value, cursor, tableColumns, onRequestTableColumns]);

  const filtered = useMemo(
    () => buildSuggestions(context, word.word, tables, activeColumns),
    [context, word.word, tables, activeColumns]
  );

  const showDropdown = open && filtered.length > 0 && !disabled;

  const syncCursor = useCallback(() => {
    const field = fieldRef.current;
    if (!field) return;
    setCursor(field.selectionStart ?? value.length);
  }, [value.length]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [word.word, context, tables, activeColumns]);

  function pickSuggestion(suggestion: string) {
    const next = applySuggestion(value, word, suggestion);
    onChange(next.value);
    setOpen(false);
    requestAnimationFrame(() => {
      const field = fieldRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(next.cursor, next.cursor);
      setCursor(next.cursor);
    });
  }

  function handleChange(nextValue: string) {
    onChange(nextValue);
    setOpen(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (showDropdown) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((index) => (index + 1) % filtered.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex((index) => (index - 1 + filtered.length) % filtered.length);
        return;
      }
      if (event.key === "Tab" || (event.key === "Enter" && !event.metaKey && !event.ctrlKey)) {
        event.preventDefault();
        pickSuggestion(filtered[highlightIndex] ?? filtered[0]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
    }

    onKeyDown?.(event);
  }

  const fieldClassName = cn(
    "flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
    className
  );

  const contextLabel =
    context === "table" ? "table" : context === "column" ? "col" : "hint";

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={fieldRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(event) => {
            handleChange(event.target.value);
            setCursor(event.target.selectionStart ?? event.target.value.length);
          }}
          onClick={syncCursor}
          onKeyUp={syncCursor}
          onFocus={() => {
            syncCursor();
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={fieldClassName}
        />
      ) : (
        <input
          ref={fieldRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={(event) => {
            handleChange(event.target.value);
            setCursor(event.target.selectionStart ?? event.target.value.length);
          }}
          onClick={syncCursor}
          onKeyUp={syncCursor}
          onFocus={() => {
            syncCursor();
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={fieldClassName}
        />
      )}

      {showDropdown && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md">
          {filtered.map((item, index) => (
            <li key={item}>
              <button
                type="button"
                className={cn(
                  "flex w-full px-3 py-1.5 text-left font-mono hover:bg-accent",
                  index === highlightIndex && "bg-accent"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pickSuggestion(item)}
              >
                <span className="w-10 shrink-0 text-xs uppercase text-muted-foreground">
                  {contextLabel}
                </span>
                <span>{item}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
