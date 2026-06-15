# SimpleDB

A minimal local MySQL database viewer for developers. Connect to your MySQL instance, browse databases and tables, inspect schema, filter rows, run read-only SELECT queries, and edit individual cells — all from a clean, dark UI.

## Why SimpleDB?

When I'm working on a project with a local MySQL database, I often just need to **look at a few rows**, **check a column type**, or **fix a single value** — not open a full database IDE, spin up phpMyAdmin in Docker, or dig through an ORM console.

Existing tools are great, but they tend to be heavy (lots of features I don't use daily), paid, or browser-based with extra setup. SimpleDB is the opposite: a small app that does one job well.

- **Fast to open** — web mode in a tab, or a native macOS app in the dock
- **Focused** — browse, filter, sort, inspect schema, edit a cell; nothing else
- **Local-first** — credentials stay in memory on your machine; no cloud account required
- **Yours to hack** — small TypeScript codebase (React + Hono + mysql2) if you want to extend it

If you reach for TablePlus or Sequel Ace for everything, you probably don't need this. If you want a lightweight viewer that stays out of the way during day-to-day dev, SimpleDB is for you.

## Features

- Connect to local (or reachable) MySQL — host, port, user, password
- Browse databases and tables with sidebar search
- Paginated table data (50 / 100 / 200 rows per page)
- Column sorting — click headers for server-side `ORDER BY`
- **Data / Columns toggle** — switch between row data and schema view (`DESCRIBE`-style)
- **Inline cell editing** — double-click a cell to edit; requires a primary key on the table
- Filter rows with a WHERE clause fragment — **autocomplete for column names**
- Run read-only SELECT queries in SQL mode — **uses the selected database by default**; qualify with `other_db.table` for cross-database queries
- **Autocomplete** in Filter and SQL — tables after `FROM`/`JOIN`, columns elsewhere; Tab/↑↓ to pick
- Dark theme UI built with Tailwind CSS and shadcn/ui
- **Web mode** — run in the browser for development or always-on use
- **Desktop app (macOS)** — native `.app` with embedded server, no separate terminal

## Prerequisites

- **Node.js 18+**
- **MySQL** running locally or reachable on your network
- **Rust toolchain** (only if building the macOS desktop app)

## Setup

```bash
git clone https://github.com/ksyang21/simple-db.git
cd simple-db
npm install
```

## Development

For active development with hot reload:

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

This runs two processes:

- **Frontend** (Vite) on port **8080** — proxies API calls to the server
- **API server** on port **3001** — internal; you don't open this directly

Port 5173 stays free for other projects.

## Production (web, always-on)

Build once and run a **single process** on port **8080**:

```bash
npm run build
npm start
```

Open [http://localhost:8080](http://localhost:8080). No need to run client and server separately.

To keep it running after closing the terminal:

```bash
npm run build
pm2 start npm --name simpledb -- start
pm2 save
```

## Desktop app (macOS)

Package as a native macOS app — one icon in the dock, no browser tab:

```bash
npm run build:app
```

Output: `src-tauri/target/release/bundle/macos/SimpleDB.app`

Drag **SimpleDB.app** to **Applications** (replace the existing copy if updating), then launch from the dock. The app embeds its own Node server on port **38472** (won't conflict with tools on 8080 or 5173).

To rebuild after code changes:

```bash
npm run build:app
cp -R src-tauri/target/release/bundle/macos/SimpleDB.app /Applications/
```

On first launch, macOS may block the unsigned app — right-click → **Open**, or allow it in **System Settings → Privacy & Security**.

Development mode for the desktop app:

```bash
npm run dev:app
```

## Usage

1. Enter your MySQL connection details and click **Connect**
2. Select a database from the sidebar dropdown
3. Search or click a table name to view its data
4. Use **Data** / **Columns** to switch between rows and schema
5. Click column headers to sort; double-click a cell to edit (tables with a primary key only)
6. Use the **Filter** tab for a WHERE clause, or the **SQL** tab for a SELECT query
   - **Filter** — autocomplete suggests columns from the selected table
   - **SQL** — queries run against the selected database automatically (`SELECT * FROM users` works without a database prefix). Use `other_db.table` to query another database
   - **Autocomplete** — type in Filter or SQL; use **Tab** or **↑/↓** + **Enter** to insert table/column names
7. Click **Run** (or press ⌘+Enter) to apply filters

## Security

SimpleDB is designed for **local development on your own machine**. It is **not** a production database admin panel and should **never** be exposed to the public internet.

### What stays private

- **Your database data is never uploaded.** Pushing this repo to GitHub only publishes application source code — not your MySQL databases, tables, or rows.
- **Credentials are not saved to disk.** Connection details are held in server memory only while the app is running. They are not written to config files, logs, or the repository.
- **No `.env` in the repo.** Environment files are gitignored. Do not commit passwords, dumps, or connection strings.

### What to watch out for

| Risk | Details |
|------|---------|
| **No authentication** | The API has no login. Anyone who can reach the server while it is running can query (and potentially update) data using the MySQL user's permissions. |
| **Network exposure** | Web mode (`npm start`) may listen on all network interfaces. Other devices on your LAN could connect if the port is open. Prefer the desktop app or bind to `127.0.0.1` only. |
| **Write access** | Inline cell editing runs real `UPDATE` statements. The MySQL user you connect with determines what can be changed. Use a read-only MySQL user if you only need to browse. |
| **SQL validation** | Filter and SQL modes block obvious destructive keywords, but this is not a full SQL injection sandbox. Only connect to databases you trust, with credentials you control. |

### Safe usage checklist

- Run on **localhost only** — do not port-forward or deploy to a public server
- Use a **dedicated dev MySQL user** with limited privileges when possible
- Do not commit `.env`, SQL dumps, or screenshots containing real credentials
- Treat the desktop app as safer than web mode for everyday use (internal port, not meant for LAN access)

### Reporting issues

If you find a security problem, please open a GitHub issue or contact the maintainer privately before disclosing publicly.

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Hono, mysql2 |
| Desktop | Tauri 2 (macOS) |

## License

[MIT](LICENSE) — free to use, modify, and share. See [Security](#security) before running this tool beyond your local machine.
