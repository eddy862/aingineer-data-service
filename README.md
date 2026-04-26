# AIngineer Take-Home: Bring Your Own Data Service

Prepared by:
- Name: Eddy Lim Yee Yang
- Email: limeddy1125@gmail.com
- Date: 27 April 2026

A containerized data workspace for uploading arbitrary tabular files, turning each upload into its own PostgreSQL table, and interacting with those datasets through both an API and a React UI.

The assessment asks for CSV ingestion, independent datasets, CRUD operations, Docker Compose, and clear API documentation. This implementation covers the required flow and adds several optional enhancements: multiple uploads, pagination, filtering, XLSX support, a graphical interface, validation/error messages, and read-only SQL queries across uploaded datasets.

## Evaluation Quick Start

### Prerequisites

- Docker
- Docker Compose

No project-specific dependencies need to be installed on the host machine.

### Run Everything

From the repository root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL: `localhost:5432` by default, or the value of `DB_PORT`
- Backend API: `http://localhost:3000` by default, or the value of `PORT`
- Frontend UI: `http://localhost:5173`

Open the UI, upload one or more `.csv` or `.xlsx` files, then browse/edit rows or use the SQL query panel.

## What To Look For

| Assessment area | Implementation |
| --- | --- |
| Upload CSV files | `POST /upload` accepts CSV files |
| Independent datasets | Each uploaded file becomes a separate PostgreSQL table |
| Dataset discovery | `GET /datasets` lists available tables |
| Schema inspection | `GET /datasets/:name/schema` returns columns, types, and primary key info |
| Browse rows | `GET /datasets/:name?page=1&limit=50` |
| Insert rows | `POST /datasets/:name` |
| Update rows | `PUT /datasets/:name` |
| Delete rows | `DELETE /datasets/:name` |
| Dockerized runtime | Root `docker-compose.yml` runs API, UI, and database together |
| No third-party APIs | Runs locally with Express, React, and PostgreSQL |

Bonus features included:

- Multi-file upload, up to 10 files per request.
- Pagination with a maximum page size of 50.
- Column-value filtering while browsing.
- React UI for uploads, browsing, editing, deleting, inserting, and querying.
- XLSX upload support in addition to CSV.
- Read-only SQL endpoint for cross-dataset queries.
- Schema inference with basic type coercion for inserts and updates.
- Friendly validation responses with hints for common user mistakes.

## Project Structure

```text
.
|-- data-service/        # Express + TypeScript API
|   |-- src/controllers  # Request handlers for upload, datasets, query
|   |-- src/routes       # API route definitions
|   |-- src/services     # CSV/XLSX parsing, database access, query execution
|   `-- src/utils        # Schema inference, table-name cleanup, type coercion
|-- frontend/            # Vite + React UI
`-- docker-compose.yml   # API, UI, and PostgreSQL orchestration
```

## Configuration

The repo includes [.env.example](.env.example):

```bash
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=datasets
DB_PORT=5432
PORT=3000
VITE_API_URL=http://localhost:3000
```

Copy it to `.env` if you want to override defaults:

```bash
cp .env.example .env
```

Important notes:

- `PORT` controls the backend container and host port.
- `VITE_API_URL` must match the backend URL used by the browser.
- If port `3000` is already taken, set `PORT=3001` and `VITE_API_URL=http://localhost:3001`.

## API Reference

Examples assume the default backend URL: `http://localhost:3000`.

### 1. Upload Dataset Files

Uploads one or more CSV/XLSX files. The field name is `files`.

```bash
curl -X POST "http://localhost:3000/upload" \
  -F "files=@./sales.csv" \
  -F "files=@./customers.csv"
```

Response:

```json
{
  "message": "File processing completed",
  "results": [
    {
      "file": "sales.csv",
      "status": "success",
      "table": "sales",
      "primaryKey": "order_id",
      "cols": ["order_id", "amount", "date"],
      "rows": 100
    }
  ]
}
```

If a table already exists, the API protects it by default. To replace it:

```bash
curl -X POST "http://localhost:3000/upload?overwrite=true" \
  -F "files=@./sales.csv"
```

### 2. List Datasets

```bash
curl "http://localhost:3000/datasets"
```

Response:

```json
["customers", "sales"]
```

### 3. Inspect Dataset Schema

```bash
curl "http://localhost:3000/datasets/sales/schema"
```

Response:

```json
{
  "table": "sales",
  "primaryKey": {
    "name": "order_id",
    "isSerial": false
  },
  "columns": [
    { "name": "order_id", "type": "text" },
    { "name": "amount", "type": "double precision" },
    { "name": "date", "type": "timestamp without time zone" }
  ]
}
```

### 4. Browse Rows

```bash
curl "http://localhost:3000/datasets/sales?page=1&limit=25"
```

Response:

```json
{
  "table": "sales",
  "page": 1,
  "limit": 25,
  "total": 100,
  "data": [
    {
      "order_id": "A1001",
      "amount": 42.5,
      "date": "2026-04-01T00:00:00.000Z"
    }
  ]
}
```

Filter by column values with query parameters:

```bash
curl "http://localhost:3000/datasets/sales?country=MY&page=1&limit=10"
```

Unknown filter columns are ignored rather than interpolated into SQL.

### 5. Insert Rows

```bash
curl -X POST "http://localhost:3000/datasets/sales" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "order_id": "A1002",
        "amount": 99.9,
        "date": "2026-04-02"
      }
    ]
  }'
```

Response:

```json
{
  "message": "Rows inserted successfully",
  "table": "sales",
  "insertedCount": 1
}
```

### 6. Update Rows

```bash
curl -X PUT "http://localhost:3000/datasets/sales" \
  -H "Content-Type: application/json" \
  -d '{
    "where": { "order_id": "A1002" },
    "data": { "amount": 120.25 }
  }'
```

Response:

```json
{
  "message": "Rows updated successfully",
  "table": "sales",
  "updatedCount": 1
}
```

### 7. Delete Rows

```bash
curl -X DELETE "http://localhost:3000/datasets/sales" \
  -H "Content-Type: application/json" \
  -d '{
    "where": { "order_id": "A1002" }
  }'
```

Response:

```json
{
  "message": "Rows deleted successfully",
  "table": "sales",
  "deletedCount": 1
}
```

### 8. Run Read-Only SQL Across Datasets

Only queries beginning with `SELECT` or `WITH` are accepted, and common mutation keywords are blocked.

```bash
curl -X POST "http://localhost:3000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT s.order_id, s.amount, c.name FROM sales s JOIN customers c ON s.customer_id = c.customer_id LIMIT 10"
  }'
```

Response:

```json
{
  "rows": 1,
  "data": [
    {
      "order_id": "A1001",
      "amount": 42.5,
      "name": "Ada"
    }
  ]
}
```

## Frontend Usage

The UI at `http://localhost:5173` is included to make evaluation faster:

- Upload one or more CSV/XLSX files from the sidebar.
- Select a dataset to browse rows.
- Add filters, adjust page size, and move between pages.
- Insert a new row using schema-derived fields.
- Edit or delete existing rows from the table.
- Switch to the query tab to run read-only SQL across datasets.

## Design Decisions And Tradeoffs

- PostgreSQL is used because arbitrary uploaded datasets become naturally queryable tables, and the SQL bonus endpoint can operate across them without inventing a custom query layer.
- The backend creates physical tables per dataset instead of storing raw files. This favors browse/query/CRUD behavior over file archival, which matches the assessment goal.
- Table names are derived from uploaded filenames and normalized to lowercase snake-like identifiers. This keeps API paths predictable while avoiding unsafe table-name characters.
- Schema inference samples uploaded values and maps them to PostgreSQL-friendly types such as boolean, integer, bigint, float, timestamp, and text.
- Identifier-like columns such as IDs, SKUs, phone numbers, postal codes, and UUIDs are kept as text to avoid losing leading zeroes or formatting.
- If no suitable primary key is found, the service adds a serial `id` column so the UI has a stable row handle for updates and deletes.
- SQL values are parameterized for CRUD and browse filters. Table/column identifiers are validated or generated by the service before use.
- The read-only SQL guard is intentionally conservative. It is useful for local evaluation, but it is not a replacement for database-level permissions in production.
- Docker Compose runs development containers with mounted source for quick review and iteration, not as a hardened production deployment.

## Assumptions And Limitations

- Supported upload formats are CSV and XLSX.
- Uploaded files need a header row and at least one data row so the service can infer a schema.
- Dataset names come from filenames after normalization. For example, `Sales Report.csv` becomes `sales_report`.
- Uploading a file whose normalized table name already exists fails unless `overwrite=true` is provided.
- Browse filters are exact-match filters joined with `AND`.
- Page size is capped at 50 rows to keep responses and the UI manageable.
- The original uploaded files are deleted after processing; PostgreSQL tables are the persisted runtime representation.
- Query access is limited by application-level keyword checks, so some harmless queries with blocked words inside identifiers may be rejected.
- CORS is configured for the bundled frontend at `http://localhost:5173`.
- No authentication, production permission model, or concurrency guarantees are included, matching the stated constraints.

## Reset Local Data

To stop the stack and remove the PostgreSQL volume:

```bash
docker compose down -v
```
