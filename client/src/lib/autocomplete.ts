export type AutocompleteContext = "table" | "column" | "mixed";

export interface WordAtCursor {
  word: string;
  start: number;
  end: number;
}

export function getWordAtCursor(text: string, cursor: number): WordAtCursor {
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  const wordBefore = before.match(/[`\w.]+$/)?.[0] ?? "";
  const wordAfter = after.match(/^[`\w.]*/)?.[0] ?? "";
  const word = wordBefore + wordAfter;
  return {
    word,
    start: cursor - wordBefore.length,
    end: cursor + wordAfter.length,
  };
}

export function stripIdentifierQuotes(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/``/g, "`");
  }
  return trimmed;
}

export function getReferencedTable(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const matches = [
    ...before.matchAll(
      /\b(?:FROM|JOIN)\s+((?:[`\w]+\.)?[`\w]+(?:\.[`\w]+)?)\s*(?:,|\s|$)/gi
    ),
  ];
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1][1];
  const parts = stripIdentifierQuotes(last).split(".").map(stripIdentifierQuotes);

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[1];
  return parts[parts.length - 1];
}

export function getAutocompleteContext(
  text: string,
  cursor: number,
  mode: "filter" | "sql"
): AutocompleteContext {
  if (mode === "filter") return "column";

  const before = text.slice(0, cursor);
  if (/\b(?:FROM|JOIN)\s+[`\w.]*$/i.test(before)) {
    return "table";
  }
  if (/\b(?:SELECT|WHERE|AND|OR|ON|ORDER BY|GROUP BY|HAVING|,)\s+.*$/i.test(before)) {
    return "column";
  }
  return "mixed";
}

export function buildSuggestions(
  context: AutocompleteContext,
  word: string,
  tables: string[],
  columns: string[]
): string[] {
  const prefix = word.toLowerCase();
  const matchesPrefix = (item: string) =>
    !prefix || item.toLowerCase().startsWith(prefix);

  let pool: string[] = [];
  if (context === "table") {
    pool = tables;
  } else if (context === "column") {
    pool = columns;
  } else {
    pool = [...new Set([...tables, ...columns])];
  }

  return pool.filter(matchesPrefix).slice(0, 25);
}

export function applySuggestion(
  text: string,
  word: WordAtCursor,
  suggestion: string
): { value: string; cursor: number } {
  const value = text.slice(0, word.start) + suggestion + text.slice(word.end);
  const cursor = word.start + suggestion.length;
  return { value, cursor };
}
