import { useCallback, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import {
  disconnect,
  fetchTableData,
  fetchTableSchema,
  fetchTables,
  runQuery,
  updateTableCell,
  type SortOrder,
  type SortState,
  type TableDataResult,
  type TableSchemaResult,
} from "@/api";
import { ConnectForm } from "@/components/ConnectForm";
import { DataGrid } from "@/components/DataGrid";
import { QueryBar, type QueryMode } from "@/components/QueryBar";
import { SchemaView } from "@/components/SchemaView";
import { Sidebar } from "@/components/Sidebar";
import { ViewToolbar, type ViewMode } from "@/components/ViewToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [savingCell, setSavingCell] = useState(false);
  const [data, setData] = useState<TableDataResult | null>(null);
  const [schema, setSchema] = useState<TableSchemaResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("data");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [queryMode, setQueryMode] = useState<QueryMode>("filter");
  const [filter, setFilter] = useState("");
  const [sql, setSql] = useState("");
  const [tableColumnsCache, setTableColumnsCache] = useState<Record<string, string[]>>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortState: SortState = { column: sortColumn, order: sortOrder };
  const canUseTableViews = queryMode === "filter" && Boolean(selectedTable);
  const editable = Boolean(data?.editable && canUseTableViews);

  const loadTables = useCallback(async (database: string) => {
    setLoadingTables(true);
    setError(null);
    try {
      const result = await fetchTables(database);
      setTables(result);
      setSelectedTable(null);
      setData(null);
      setSchema(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tables");
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, []);

  const loadSchema = useCallback(async (database: string, table: string) => {
    setLoadingSchema(true);
    setError(null);
    try {
      const result = await fetchTableSchema(database, table);
      setSchema(result);
      setTableColumnsCache((prev) => ({
        ...prev,
        [table]: result.columns.map((col) => col.field),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schema");
      setSchema(null);
    } finally {
      setLoadingSchema(false);
    }
  }, []);

  const loadData = useCallback(
    async (
      database: string,
      table: string | null,
      currentPage: number,
      currentLimit: number,
      mode: QueryMode,
      currentFilter: string,
      currentSql: string,
      currentSort: SortState
    ) => {
      if (mode === "filter" && !table) return;
      if (mode === "sql" && !currentSql.trim()) return;

      setLoadingData(true);
      setError(null);
      try {
        let result: TableDataResult;
        if (mode === "sql") {
          result = await runQuery(currentSql, database, currentPage, currentLimit, currentSort);
        } else {
          result = await fetchTableData(
            database,
            table!,
            currentPage,
            currentLimit,
            currentFilter,
            currentSort
          );
        }
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setData(null);
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  const requestTableColumns = useCallback(
    async (table: string) => {
      if (!selectedDatabase) return;
      try {
        const result = await fetchTableSchema(selectedDatabase, table);
        const fields = result.columns.map((col) => col.field);
        setTableColumnsCache((prev) =>
          prev[table] ? prev : { ...prev, [table]: fields }
        );
      } catch {
        // Ignore schema lookup failures during autocomplete.
      }
    },
    [selectedDatabase]
  );

  const activeColumns =
    schema?.columns.map((col) => col.field) ??
    (selectedTable ? tableColumnsCache[selectedTable] : undefined) ??
    [];

  function handleConnected(dbs: string[]) {
    setDatabases(dbs);
    setConnected(true);
    if (dbs.length > 0) {
      setSelectedDatabase(dbs[0]);
    }
  }

  async function handleDisconnect() {
    await disconnect();
    setConnected(false);
    setDatabases([]);
    setSelectedDatabase("");
    setTables([]);
    setSelectedTable(null);
    setData(null);
    setSchema(null);
    setViewMode("data");
    setFilter("");
    setSql("");
    setTableColumnsCache({});
    setSortColumn(null);
    setSortOrder(null);
    setPage(1);
    setError(null);
  }

  function handleDatabaseChange(db: string) {
    setSelectedDatabase(db);
    setSelectedTable(null);
    setData(null);
    setSchema(null);
    setPage(1);
    setFilter("");
    setTableColumnsCache({});
    setSortColumn(null);
    setSortOrder(null);
    setViewMode("data");
  }

  function handleTableSelect(table: string) {
    setSelectedTable(table);
    setPage(1);
    setFilter("");
    setSortColumn(null);
    setSortOrder(null);
    setQueryMode("filter");
    setViewMode("data");
  }

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    if (mode === "schema" && selectedTable && selectedDatabase) {
      loadSchema(selectedDatabase, selectedTable);
    }
  }

  function handleRun(mode: QueryMode, value: string) {
    if (mode === "filter") {
      setFilter(value);
    } else {
      setSql(value);
    }
    setPage(1);
    setViewMode("data");
    loadData(
      selectedDatabase,
      selectedTable,
      1,
      limit,
      mode,
      mode === "filter" ? value : filter,
      mode === "sql" ? value : sql,
      sortState
    );
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    loadData(selectedDatabase, selectedTable, newPage, limit, queryMode, filter, sql, sortState);
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
    loadData(selectedDatabase, selectedTable, 1, newLimit, queryMode, filter, sql, sortState);
  }

  function handleSortChange(column: string | null, order: SortOrder | null) {
    setSortColumn(column);
    setSortOrder(order);
    setPage(1);
    loadData(
      selectedDatabase,
      selectedTable,
      1,
      limit,
      queryMode,
      filter,
      sql,
      { column, order }
    );
  }

  async function handleCellSave(
    row: Record<string, unknown>,
    column: string,
    value: string
  ) {
    if (!selectedDatabase || !selectedTable || !data?.primaryKeys?.length) return;

    const primaryKey: Record<string, unknown> = {};
    for (const pk of data.primaryKeys) {
      primaryKey[pk] = row[pk];
    }

    setSavingCell(true);
    setError(null);
    try {
      await updateTableCell(selectedDatabase, selectedTable, primaryKey, column, value);
      await loadData(
        selectedDatabase,
        selectedTable,
        page,
        limit,
        queryMode,
        filter,
        sql,
        sortState
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cell");
    } finally {
      setSavingCell(false);
    }
  }

  useEffect(() => {
    if (selectedDatabase) {
      loadTables(selectedDatabase);
    }
  }, [selectedDatabase, loadTables]);

  useEffect(() => {
    if (selectedTable && queryMode === "filter") {
      loadData(selectedDatabase, selectedTable, 1, limit, "filter", "", sql, {
        column: null,
        order: null,
      });
      loadSchema(selectedDatabase, selectedTable);
    }
  }, [selectedTable]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewMode === "schema" && selectedTable && selectedDatabase) {
      loadSchema(selectedDatabase, selectedTable);
    }
  }, [viewMode, selectedTable, selectedDatabase, loadSchema]);

  if (!connected) {
    return <ConnectForm onConnected={handleConnected} />;
  }

  const gridTitle =
    queryMode === "sql" ? "Query results" : selectedTable ?? "No table selected";

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">SimpleDB</h1>
          <Badge variant="secondary" className="gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Connected
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleDisconnect}>
          <LogOut className="h-4 w-4" />
          Disconnect
        </Button>
      </header>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2">
          <Badge variant="destructive">{error}</Badge>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          databases={databases}
          selectedDatabase={selectedDatabase}
          onDatabaseChange={handleDatabaseChange}
          tables={tables}
          selectedTable={selectedTable}
          onTableSelect={handleTableSelect}
          loadingTables={loadingTables}
        />

        <main className="flex flex-1 flex-col overflow-hidden">
          <QueryBar
            mode={queryMode}
            onModeChange={(mode) => {
              setQueryMode(mode);
              if (mode === "sql") setViewMode("data");
            }}
            onRun={handleRun}
            loading={loadingData}
            disabled={
              !selectedDatabase || (queryMode === "filter" && !selectedTable)
            }
            filter={filter}
            sql={sql}
            onFilterChange={setFilter}
            onSqlChange={setSql}
            selectedDatabase={selectedDatabase}
            tables={tables}
            columns={activeColumns}
            tableColumns={tableColumnsCache}
            onRequestTableColumns={requestTableColumns}
          />
          <ViewToolbar
            mode={viewMode}
            onModeChange={handleViewModeChange}
            disabled={!canUseTableViews}
            editable={editable}
          />
          {viewMode === "schema" ? (
            <SchemaView
              title={selectedTable ? `${selectedTable} — columns` : gridTitle}
              schema={schema}
              loading={loadingSchema}
            />
          ) : (
            <DataGrid
              title={gridTitle}
              data={queryMode === "filter" && !selectedTable ? null : data}
              loading={loadingData}
              page={page}
              limit={limit}
              sortColumn={sortColumn}
              sortOrder={sortOrder}
              editable={editable}
              saving={savingCell}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              onSortChange={handleSortChange}
              onCellSave={handleCellSave}
            />
          )}
        </main>
      </div>
    </div>
  );
}
