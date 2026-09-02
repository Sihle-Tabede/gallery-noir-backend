# Gallery Noir Backend — PostgreSQL

Production-oriented REST API for the Gallery Noir React frontend. It provides
authentication, artwork and merchandise catalogues, blog content, contact and
collector inquiries, and transaction-safe orders.

The API contract remains compatible with the current GalleryNoir frontend. The
database implementation is PostgreSQL through `pg`; MySQL is not required.

## Requirements

- Node.js 20 or newer
- npm
- Either:
  - a local PostgreSQL database, or
  - a hosted PostgreSQL database such as Neon

## Quick start

1. Copy the environment template:

   Windows PowerShell:

       Copy-Item .env.example .env

   macOS or Linux:

       cp .env.example .env

2. Configure either the local PostgreSQL or Neon connection described below.
3. Install the locked dependency versions:

       npm ci

4. Apply and verify the schema:

       npm run db:setup
       npm run db:check

5. Start the API:

       npm run dev

6. Confirm that the service is available:

       http://localhost:5000/api/health
       http://localhost:5000/api/health/ready

## Option A: local PostgreSQL

Create an application user and database from `psql` or pgAdmin. Run the
following as the local PostgreSQL administrator, changing the example password:

    CREATE ROLE gallery_noir
        WITH LOGIN
        PASSWORD 'replace_with_a_strong_password';

    CREATE DATABASE gallery_noir
        OWNER gallery_noir;

Configure `.env`:

    DATABASE_URL=
    DB_HOST=127.0.0.1
    DB_PORT=5432
    DB_USER=gallery_noir
    DB_PASSWORD=replace_with_a_strong_password
    DB_NAME=gallery_noir
    DB_CONNECTION_LIMIT=10
    DB_CONNECTION_TIMEOUT_MS=10000
    DB_IDLE_TIMEOUT_MS=30000
    DB_SSL=false
    DB_SSL_REJECT_UNAUTHORIZED=true

`database/schema.sql` creates the tables, indexes, constraints, JSONB fields,
foreign keys, and update-timestamp triggers inside the configured database. It
does not create the PostgreSQL server, role, or database itself.

## Option B: Neon

Create a Neon project and copy its PostgreSQL connection string. Configure
`.env` with that value:

    DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
    DB_CONNECTION_LIMIT=10
    DB_CONNECTION_TIMEOUT_MS=10000
    DB_IDLE_TIMEOUT_MS=30000
    DB_SSL=true
    DB_SSL_REJECT_UNAUTHORIZED=true

When `DATABASE_URL` is present, it takes precedence over `DB_HOST`,
`DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. Keep credentials only
in `.env` or the deployment provider's secret settings. Never commit them.

Run the same setup commands:

    npm ci
    npm run db:setup
    npm run db:check
    npm run dev

## Application environment

The remaining required settings are:

    NODE_ENV=development
    PORT=5000
    CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

    JWT_SECRET=replace_with_at_least_32_random_characters
    JWT_EXPIRES_IN=7d
    JWT_ISSUER=gallery-noir-api
    JWT_AUDIENCE=gallery-noir-web
    BCRYPT_ROUNDS=12

Generate a JWT secret:

    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

Use the generated value as `JWT_SECRET`.

## Frontend connection

In the GalleryNoir frontend environment file, set:

    VITE_API_URL=http://localhost:5000/api

Restart the frontend after changing its environment file. If Vite selects
another port, add that exact origin to `CORS_ORIGINS` and restart the backend.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start with automatic reload |
| `npm start` | Start without automatic reload |
| `npm run db:setup` | Apply the repeatable PostgreSQL schema |
| `npm run db:check` | Verify every required table and column |
| `npm run lint` | Run static code checks |
| `npm test` | Run API, validation, and embedded PostgreSQL schema tests |
| `npm run check` | Run lint and all tests |

The test suite includes a complete frontend-contract exercise covering the
exact registration, login, current-user, contact, inquiry, artwork, product,
journal, order creation, and order-history request/response shapes used by the
React application.

## API routes

| Method and route | Access | Purpose |
| --- | --- | --- |
| `GET /api/health` | Public | Liveness check |
| `GET /api/health/ready` | Public | PostgreSQL readiness check |
| `POST /api/auth/register` | Public | Create a collector account |
| `POST /api/auth/login` | Public | Sign in |
| `GET /api/auth/me` | Signed in | Current profile |
| `PUT /api/auth/update` | Signed in | Legacy-compatible profile update |
| `PATCH /api/auth/me` | Signed in | Update current profile |
| `GET /api/artworks` | Public | Artwork catalogue |
| `GET /api/artworks/featured` | Public | Featured available works |
| `GET /api/artworks/:id-or-slug` | Public | Artwork detail |
| `GET /api/products` | Public | Merchandise catalogue |
| `GET /api/products/category/:category` | Public | Merchandise by category |
| `GET /api/products/:id-or-slug` | Public | Merchandise detail |
| `GET /api/blog` | Public | Published posts |
| `GET /api/blog/:id-or-slug` | Public | Published post detail |
| `POST /api/inquiries` | Public | Collector inquiry |
| `POST /api/contacts` | Public | General contact form |
| `POST /api/orders` | Signed in | Create an order |
| `GET /api/orders/me` | Signed in | Current collector orders |
| `GET /api/orders/:id` | Owner or admin | Order detail |
| `GET /api/orders/all` | Admin | All orders |

Create, update, delete, and workflow-management routes are protected by both
authentication and the current database-backed admin role.

## Frontend compatibility

The existing response and request shapes are preserved:

- registration persists `full_name` and `phone`;
- artworks support ID or slug, medium, category, year, dimensions, status, and
  both `image` and `image_url`;
- products support ID or slug, `category`/`type`, colours, sizes, stock, and
  both image aliases;
- inquiries retain name, email, subject, and message;
- contacts retain the selected topic;
- orders return numeric IDs and totals plus object-shaped shipping addresses.

Aliases are derived at response time and are not duplicated in PostgreSQL.

## PostgreSQL implementation

- A bounded `pg.Pool` is shared by the application.
- Parameterized `$1`, `$2`, ... queries protect values.
- Product options and shipping addresses use JSONB.
- IDs use PostgreSQL identity columns.
- Order creation, stock reservation, artwork reservation, cancellation, and
  restoration use one checked-out client per transaction.
- Monetary calculations are performed in cents before values are written as
  `NUMERIC(12, 2)`.
- Database constraint codes are translated into consistent API errors.
- The schema can be applied repeatedly without duplicating tables, indexes, or
  triggers.

## Security and reliability

- Passwords are hashed with bcrypt and JWTs are constrained by algorithm,
  issuer, and audience.
- CORS uses an explicit origin allowlist.
- Helmet, compression, request-size limits, rate limits, and generic production
  errors are enabled.
- Admin permission is checked against the current database role.
- Order prices are read from PostgreSQL and never trusted from the browser.
- The server checks PostgreSQL readiness before accepting traffic and reports a
  clear configuration error if startup cannot connect.
- Graceful shutdown drains the HTTP server and PostgreSQL pool.

## Moving existing MySQL data

`npm run db:setup` creates the PostgreSQL structure but does not copy records
from an old MySQL database. If the MySQL database contains valuable users,
catalogue records, or orders, export and transform that data separately before
retiring MySQL. Do not import MySQL's schema syntax into PostgreSQL.

## Deployment

Set `NODE_ENV=production`, use a strong random `JWT_SECRET`, add every
deployed frontend URL to `CORS_ORIGINS`, and configure the production
`DATABASE_URL`. Run `npm run db:setup` once against the production database
before starting the deployed API.

Payment capture, email delivery, media upload/storage, password reset, and email
verification remain real-provider integration points and are intentionally not
faked.
