# Bring Your Own Data Service

A containerized data workspace for uploading arbitrary tabular files, turning each upload into its own PostgreSQL table, and interacting with those datasets through both an API and a React UI.

The service supports CSV ingestion, independent datasets, CRUD operations, Docker Compose, and clear API documentation. It also includes multiple uploads, pagination, filtering, XLSX support, a graphical interface, validation/error messages, and read-only SQL queries across uploaded datasets.

## Quick Start

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

### Sample Workflow

Sample files are included in [samples](samples) so the main flow can be exercised without preparing custom data:

- `customers-100.csv`
- `people-100.csv`
- `products-100.csv`
- `Dummy-Excel.xlsx`

Recommended flow:

1. Start the stack with `docker compose up --build`.
2. Open `http://localhost:5173`.
3. Upload `samples/customers-100.csv` and `samples/people-100.csv`.
4. Browse the generated `customers_100` and `people_100` datasets.
5. Switch to the query tab and run:

```sql
SELECT *
FROM customers_100 c
JOIN people_100 p ON c."First Name" = p."First Name";
```

File names are normalized into table names, so hyphens become underscores. For example, `customers-100.csv` becomes `customers_100`.

## Feature Overview

| Area | Implementation |
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
|-- samples/             # Ready-to-upload CSV/XLSX sample files
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
  -F "files=@./samples/customers-100.csv" \
  -F "files=@./samples/people-100.csv"
```

Response:

```json
{
  "message": "File processing completed",
  "results": [
    {
      "file": "customers-100.csv",
      "status": "success",
      "table": "customers_100",
      "primaryKey": "Index",
      "cols": ["Index", "Customer Id", "First Name", "Last Name", "Company"],
      "rows": 100
    }
  ]
}
```

If a table already exists, the API protects it by default. To replace it:

```bash
curl -X POST "http://localhost:3000/upload?overwrite=true" \
  -F "files=@./samples/customers-100.csv"
```

### 2. List Datasets

```bash
curl "http://localhost:3000/datasets"
```

Response:

```json
["customers_100", "people_100"]
```

### 3. Inspect Dataset Schema

```bash
curl "http://localhost:3000/datasets/customers_100/schema"
```

Response:

```json
{
  "table": "customers_100",
  "primaryKey": {
    "name": "Index",
    "isSerial": false
  },
  "columns": [
    { "name": "Index", "type": "integer" },
    { "name": "Customer Id", "type": "text" },
    { "name": "First Name", "type": "text" },
    { "name": "Last Name", "type": "text" },
    { "name": "Company", "type": "text" }
  ]
}
```

### 4. Browse Rows

```bash
curl "http://localhost:3000/datasets/customers_100?page=1&limit=25"
```

Response:

```json
{
  "table": "customers_100",
  "page": 1,
  "limit": 25,
  "total": 100,
  "data": [
    {
      "Index": 1,
      "Customer Id": "DD37Cf93aecA6Dc",
      "First Name": "Sheryl",
      "Last Name": "Baxter",
      "Company": "Rasmussen Group"
    }
  ]
}
```

Filter by column values with query parameters:

```bash
curl "http://localhost:3000/datasets/customers_100?Country=Chile&page=1&limit=10"
```

Unknown filter columns are ignored rather than interpolated into SQL.

### 5. Insert Rows

```bash
curl -X POST "http://localhost:3000/datasets/customers_100" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "Index": 101,
        "Customer Id": "NEW-CUSTOMER-101",
        "First Name": "Eddy",
        "Last Name": "Lim",
        "Company": "Demo Company",
        "City": "Kuala Lumpur",
        "Country": "Malaysia"
      }
    ]
  }'
```

Response:

```json
{
  "message": "Rows inserted successfully",
  "table": "customers_100",
  "insertedCount": 1
}
```

### 6. Update Rows

```bash
curl -X PUT "http://localhost:3000/datasets/customers_100" \
  -H "Content-Type: application/json" \
  -d '{
    "where": { "Index": 101 },
    "data": { "Company": "Updated Demo Company" }
  }'
```

Response:

```json
{
  "message": "Rows updated successfully",
  "table": "customers_100",
  "updatedCount": 1
}
```

### 7. Delete Rows

```bash
curl -X DELETE "http://localhost:3000/datasets/customers_100" \
  -H "Content-Type: application/json" \
  -d '{
    "where": { "Index": 101 }
  }'
```

Response:

```json
{
  "message": "Rows deleted successfully",
  "table": "customers_100",
  "deletedCount": 1
}
```

### 8. Run Read-Only SQL Across Datasets

Only queries beginning with `SELECT` or `WITH` are accepted, and common mutation keywords are blocked.

```bash
curl -X POST "http://localhost:3000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM customers_100 c JOIN people_100 p ON c.\"First Name\" = p.\"First Name\" LIMIT 10"
  }'
```

Response:

```json
{
  "rows": 10,
  "data": [
    {
      "...": "query result columns depend on the uploaded sample data"
    }
  ]
}
```

## Frontend Usage

The UI at `http://localhost:5173` provides a faster way to work with uploaded datasets:

- Upload one or more CSV/XLSX files from the sidebar.
- Select a dataset to browse rows.
- Add filters, adjust page size, and move between pages.
- Insert a new row using schema-derived fields.
- Edit or delete existing rows from the table.
- Switch to the query tab to run read-only SQL across datasets.

## Design Decisions And Tradeoffs

- PostgreSQL is used because arbitrary uploaded datasets become naturally queryable tables, and the SQL bonus endpoint can operate across them without inventing a custom query layer.
- The backend creates physical tables per dataset instead of storing raw files. This favors browse/query/CRUD behavior over file archival.
- Table names are derived from uploaded filenames and normalized to lowercase snake-like identifiers. This keeps API paths predictable while avoiding unsafe table-name characters.
- Schema inference samples uploaded values and maps them to PostgreSQL-friendly types such as boolean, integer, bigint, float, timestamp, and text.
- Identifier-like columns such as IDs, SKUs, phone numbers, postal codes, and UUIDs are kept as text to avoid losing leading zeroes or formatting.
- If no suitable primary key is found, the service adds a serial `id` column so the UI has a stable row handle for updates and deletes.
- SQL values are parameterized for CRUD and browse filters. Table/column identifiers are validated or generated by the service before use.
- The read-only SQL guard is intentionally conservative. It is useful for local exploration, but it is not a replacement for database-level permissions in production.
- Docker Compose runs development containers with mounted source for quick local review and iteration, not as a hardened production deployment.

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
- No authentication, production permission model, or concurrency guarantees are included.

## Reset Local Data

To stop the stack and remove the PostgreSQL volume:

```bash
docker compose down -v
```
