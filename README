# Database

Delineo Data Library & Database

## Setup

You'll need to install [node](https://nodejs.org/) and [pnpm](https://pnpm.io/) first.

Then, you'll want to install [PostgreSQL](https://www.postgresql.org/) and start the postgres instance.

Next, clone this repository and create a `.env` file in the root directory with the following schema:

```text
DATABASE_URL=<POSTGRES_DB_URL>
```

Finally, run the following commands:

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm dev
```

This will install all dependencies, database migrations, and start the development server.

## Routes

### `GET` `/`

Used for pinging the backend for uptime

#### Response

```json
{
  "message": "Hello, World!" 
}
```

### `GET` `/convenience-zones`

Returns a list of all convenience zones from the backend

#### Example Response

```json
{
  "data": [
    {
      "id": 1,
      "label": "Barnsdall, OK",
      "name": "barnsdall",
      "latitude": 36.562036,
      "longitude": -96.160775,
      "cbg_list": [],
      "size": 3477,
      "created_at": "2025-02-24T19:22:06.559Z"
    }
  ]
}
```

### `POST` `/convenience-zones`

Creates a new convenience zone for use in simulation and visualization

#### Parameters

```json
{
  "name": "barnsdall",      # internal name
  "label": "Null Island",   # display name
  "latitude": 0.0,          # location data
  "longitude": 0.0,
  "cbg_list": [],           # list of associated census block groups
  "size": 0                 # population size
}
```

#### Example Response

Returns the created zone object

```json
{
  "data": {
    "id": 1,
    "label": "Barnsdall, OK",
    "name": "barnsdall",
    "latitude": 36.562036,
    "longitude": -96.160775,
    "cbg_list": [],
    "size": 3477,
    "created_at": "2025-02-24T19:22:06.559Z"
  }
}
```
