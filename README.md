# NestJS Microservices

Two NestJS services share MongoDB and Redis. Service A fetches a public JSON API, stores uploaded rows, and searches them. Service B records every Service A action and turns that history into a PDF.

## Requirements

- Docker 24 or newer, with Docker Compose
- Node.js 24 and npm 11, only if you run a service outside Docker

| Piece                  | Role                                                      |
| ---------------------- | --------------------------------------------------------- |
| NestJS 12              | HTTP API for both services                                |
| MongoDB 8              | `service_a` stores records, `service_b` stores event logs |
| Redis Stack Server 7.4 | Pub/sub between the services, plus RedisTimeSeries        |
| ExcelJS                | Writes and reads `.xlsx` files in Service A               |
| PDFKit                 | Draws the Service B report                                |

Service A listens on host port **3001**. Service B listens on host port **3002**. Inside the containers both processes use port 3000.

## Installation

From the repository root:

```bash
cp .env.example .env
docker compose up --build -d
```

`.env` only changes the host ports. The defaults are Service A `3001`, Service B `3002`, MongoDB `27017`, and Redis `6379`.

Check that the containers are healthy:

```bash
docker compose ps
```

Stop the stack with `docker compose down`. `docker compose down -v` also deletes the MongoDB, Redis, fetched-file, and upload volumes.

## Usage

Swagger:

- Service A: [http://localhost:3001/api](http://localhost:3001/api)
- Service B: [http://localhost:3002/api](http://localhost:3002/api)

### 1. Fetch a public API

`POST /data/fetch` downloads JSON in the service and saves it under Service A's data volume.

```bash
curl -X POST http://localhost:3001/data/fetch \
  -H 'content-type: application/json' \
  -d '{"url":"https://jsonplaceholder.typicode.com/users","filename":"users"}'
```

`format` is `json` by default. Set `"format":"excel"` to write `users.xlsx` instead. `filename` may contain letters, numbers, `_`, and `-`.

The response includes `filepath` and `recordCount`. Copy the file out if you want to upload it next:

```bash
docker cp nestjs-microservices-service-a-1:/data/users.json ./users.json
```

### 2. Upload the file into MongoDB

`POST /data/upload` accepts one `.json` or `.xlsx` file, up to 50MB, in the `file` field.

```bash
curl -F 'file=@users.json;type=application/json' http://localhost:3001/data/upload
```

Rows are inserted into the `records` collection in batches. A text index covers the document fields, and `createdAt` is indexed for sorting.

### 3. Search records

```bash
curl 'http://localhost:3001/records/search?q=Leanne&page=1&limit=10'
```

| Query       | Meaning                               |
| ----------- | ------------------------------------- |
| `q`         | Text search. Omit it to list records. |
| `page`      | Page number, starting at 1            |
| `limit`     | Page size, from 1 to 100. Default 10  |
| `sortBy`    | Field name. Default `createdAt`       |
| `sortOrder` | `asc` or `desc`                       |

One record: `GET /records/:id`.

### 4. Read the event log

Each fetch, upload, search, and record lookup is published to Service B and stored in RedisTimeSeries under `api_action:<ACTION>`. The value is how long the request took, in milliseconds.

```bash
curl 'http://localhost:3002/logs?type=DATA_FETCHED&startDate=2026-01-01&endDate=2026-12-31'
```

`type` is one of `DATA_FETCHED`, `FILE_UPLOADED`, `RECORDS_SEARCHED`, or `RECORD_RETRIEVED`. `startDate` and `endDate` are optional `YYYY-MM-DD` filters. `page` and `limit` work the same way as search.

### 5. Download a PDF report

`startDate` and `endDate` are required. `type` is optional.

```bash
curl -o report.pdf \
  'http://localhost:3002/reports/pdf?startDate=2026-01-01&endDate=2026-12-31'
```

The PDF has a page per event type, with count, average, min, max, and a line chart, followed by a summary page.
