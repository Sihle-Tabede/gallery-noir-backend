# Gallery Noir — Render deployment guide

## What was inspected and changed

Frontend: React 19, Vite 8, Axios, React Router. Backend: Node.js, Express 5, PostgreSQL through `pg`; no ORM. Use Node 24 for both projects.

- Retained the shared Axios client and `VITE_API_URL` normalization (`/api` is appended when needed).
- Builds now reject a missing, HTTP, local, credential-bearing, or malformed API URL.
- Increased the API timeout to 60 seconds to accommodate slow service startup. A network failure no longer deletes the saved JWT; an API 401 still does.
- Production backend requires `DATABASE_URL`, exact HTTPS CORS origins, a JWT secret of at least 32 characters, and verified database TLS. It cannot silently select the local development DB.
- Prevented PostgreSQL URL SSL query parameters from overriding certificate verification.
- Retained `PORT`, binding to `0.0.0.0`, proxy trust, security headers, rate limiting, JWT verification and graceful shutdown.
- Schema setup remains transactional and repeatable, with a migration advisory lock and bounded lock/statement waits. Build commands no longer alter database records.
- Added frontend and backend `render.yaml`, environment examples, runtime pinning and production configuration tests. Kept existing UI, routes and business logic.

## 1. Update your repositories

Extract each ZIP and copy the contents of its project folder into the matching existing repository. Commit the changed files, including package-lock.json, .node-version, .env.example and render.yaml. Do not replace your existing Git metadata. The downloads exclude .git, node_modules, dist and actual .env files.

These are separate repositories: normally leave Render's **Root Directory blank** because package.json is at each repository root. If you put both folders in one repository, use `Gallery-Noir` for the frontend root and `gallery-noir-backend` for the backend root. The supplied Blueprints are per repository; do not combine them without adding those rootDir values.

## 2. Select the existing production PostgreSQL database

Use your existing hosted database; creating a new empty database would not preserve your users or catalogue. Back it up before schema changes. Confirm its hostname, database name and environment in your provider dashboard. Code cannot determine whether a remote database is your intended production database.

Copy its TLS-capable PostgreSQL connection string into **backend only** `DATABASE_URL`. Use the provider's external TLS endpoint for the simplest portable configuration. Allow the Render backend's outbound connections in the database provider's network rules. Never put the URL in frontend variables, source code, screenshots or Git.

The backend verifies the server certificate. Do not set DB_SSL_REJECT_UNAUTHORIZED=false. If your provider uses a private CA, supply its CA through a Render secret file and set Node's `NODE_EXTRA_CA_CERTS` to that file's absolute path. SSL-related parameters in DATABASE_URL are deliberately removed when explicit TLS is enabled, so they cannot downgrade TLS. Other connection parameters are preserved.

For an internal database endpoint, first confirm that it supports TLS with a verifiable hostname and is accessible in the selected Render region. Otherwise use the external TLS endpoint.

## 3. Configure the backend Web Service

Create or update a Render **Web Service**, using the backend repository and your intended production branch.

| Setting | Exact value |
|---|---|
| Runtime | Node |
| Root directory | Blank for the separate backend repository |
| Build command | `npm ci --omit=dev` |
| Normal start command | `npm run db:check && npm start` |
| Health check path | `/api/health/ready` |
| Node version | `24` |
| Auto deploy | On commit to the selected production branch |

The backend is plain JavaScript and needs no compilation. Render supplies PORT. Do not run nodemon in production. Public HTTPS terminates at Render; Express listens on Render's internal HTTP port.

### Backend environment variables

| Variable | Required / value |
|---|---|
| NODE_ENV | Required: `production` |
| NODE_VERSION | Render runtime: `24` |
| DATABASE_URL | Required private hosted PostgreSQL connection string |
| CORS_ORIGINS | Required: `https://<frontend-service>.onrender.com`; exact origin, no trailing slash or path. Multiple origins separated by commas. Include a custom frontend domain if used. |
| JWT_SECRET | Required private random secret, at least 32 characters. Keep the existing strong production secret to preserve existing sessions. |
| DB_SSL | `true` (production default) |
| DB_SSL_REJECT_UNAUTHORIZED | `true` (required in production) |
| DB_CONNECTION_LIMIT | `5` recommended starting value; configurable 1–50, default 10 |
| DB_CONNECTION_TIMEOUT_MS | `10000`; configurable 1000–60000 |
| DB_IDLE_TIMEOUT_MS | `30000`; configurable 1000–300000 |
| JWT_EXPIRES_IN | Optional: `7d` |
| JWT_ISSUER | Optional: `gallery-noir-api`; keep consistent across deployments |
| JWT_AUDIENCE | Optional: `gallery-noir-web`; keep consistent across deployments |
| BCRYPT_ROUNDS | Optional: `12`; allowed 10–15 |
| PORT | Automatically supplied by Render; do not manually set |
| NODE_EXTRA_CA_CERTS | Only for a provider-specific private CA: absolute path to its PEM secret file |

Generate a new JWT secret locally only if needed:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

There are no session secrets, cookie secrets, third-party private API keys, SMTP keys or payment gateway credentials consumed by the current code. Do not invent additional variables. Development-only DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME are supported locally when NODE_ENV is not production and DATABASE_URL is unset. Their defaults are 127.0.0.1, 5432, gallery_noir, empty password and gallery_noir respectively; do not configure them on Render.

## 4. Initialize or update the schema explicitly

The existing project uses `database/schema.sql`, not an ORM migration tool. `npm run db:setup` creates missing tables/indexes and refreshes timestamp triggers inside a transaction. It does not delete table data. It is not a schema-diff engine: an incompatible existing table requires a reviewed additive SQL migration, not a database reset.

With a Render plan supporting pre-deploy commands, set:

```sh
npm run db:setup && npm run db:check
```

This is the migration/pre-deploy command, not the build command. For the first installation, if the bundled media must be imported, run:

```sh
npm run db:setup && npm run db:seed-media && npm run db:check
```

Use Render Shell or a one-off job with the backend environment for this command. If your plan offers neither Shell nor pre-deploy, temporarily use that command followed by `&& npm start` as the backend Start Command for the initial deploy. Once successful, restore `npm run db:check && npm start` and redeploy. The normal start command intentionally fails on a missing/incompatible schema.

Media seeding stores bundled images as BYTEA in the hosted database; it replaces the bytes at matching media paths when their checksums differ. Run it only when you intend to synchronize those images. It does not create users, products, artworks or blog posts. Preserve the existing catalogue database. If it is empty, use the existing admin API to populate it.

Future source-code pushes do not automatically translate into database changes. Run reviewed migrations when the schema changes; run media synchronization when bundled database-backed images change. Never use destructive reset commands on production.

## 5. Configure the frontend Static Site

Create or update a Render **Static Site** using the frontend repository.

| Setting | Exact value |
|---|---|
| Root directory | Blank for the separate frontend repository |
| Build command | `npm ci --include=dev && npm run build` |
| Publish directory | `dist` |
| Start command | None — Render serves the static build |
| Rewrite | Source `/*`, destination `/index.html`, action **Rewrite** |
| Node version | `24` |
| Auto deploy | On commit to the selected production branch |

### Frontend environment variables

| Variable | Value |
|---|---|
| VITE_API_URL | `https://<backend-service>.onrender.com/api` — public browser value |
| NODE_VERSION | `24` — build runtime setting |

VITE_API_URL may also be the backend origin without /api. Use the actual assigned backend URL, not a guessed service name. Set it before building. Changing it requires a new frontend build and deployment. Do not set DATABASE_URL, JWT_SECRET or any other backend secret on this service: VITE_ values are compiled into browser JavaScript.

After Render assigns the frontend URL, update backend CORS_ORIGINS to that exact origin and redeploy the backend. Both services must point to each other's actual assigned URLs. For an existing deployment, retain its domains and database.

## 6. Blueprint option

Each repository has its own render.yaml. Import each through Render's Blueprint workflow, supply the prompted URL/secret values, and review the selected branch and service name. The backend Blueprint keeps the original free plan and Frankfurt region; change those only deliberately to match your existing service/database. It references your existing database via DATABASE_URL and does not provision a replacement database.

Database setup is explicit as described above. The backend Blueprint's normal startup will reject an uninitialized database. Paid pre-deploy commands can be added as `preDeployCommand: npm run db:setup && npm run db:check`. Review any plan costs in Render before applying.

## 7. Authentication behavior

Login/register returns an HS256 JWT. The frontend stores it under gallery-noir:token in localStorage and sends `Authorization: Bearer <token>` to the HTTPS API. The backend verifies signature, expiry, issuer and audience. CORS permits Authorization and Content-Type preflights only from configured frontend origins. Cookie credentials remain disabled because this application does not use cookie sessions.

Existing localStorage tokens are scoped to the frontend origin. Moving to a different domain requires sign-in again. Changing JWT_SECRET, issuer or audience invalidates existing tokens. A temporary network failure retains the saved token; reload once the API recovers. localStorage tokens remain accessible to same-origin JavaScript, so only trusted/sanitized HTML should enter blog content. This change does not redesign authentication or claim to complete an application-wide security audit.

## 8. Live acceptance checks (required after deployment)

1. Backend `/api/health` must return 200. `/api/health/ready` must return 200 with `{"status":"ready"}`; the latter performs an actual database query.
2. `npm run db:check` must succeed with the Render environment. Confirm the selected database identity in the provider dashboard and verify an existing known record.
3. Open the frontend, then Developer Tools → Network. API requests must target the actual HTTPS backend, never localhost or the frontend static host.
4. Check a preflight response: Access-Control-Allow-Origin must equal the frontend origin; Authorization must be allowed. Requests from another browser origin must not receive CORS permission.
5. Register a test customer, log out, sign in, reload and view the profile. Confirm the user row exists in the intended hosted database. Test an invalid/expired token returns 401.
6. Submit a contact/inquiry and verify it in that database. Check an existing product, artwork and a `/api/media/...` image. Test ordering with designated test catalogue data.
7. Refresh a nested frontend route directly. It must load through the SPA rewrite, not return a Render 404.
8. Check browser Console for mixed content/CORS errors and Render logs for startup errors. Confirm persistence after a backend restart/redeploy.

The existing catalogue deliberately falls back to bundled content on an empty response or API error. That working behavior is preserved; seeing images or products alone does NOT prove database connectivity. Use the health, authenticated API and database checks above. Some archive images remain static frontend assets by design.

## Verification in this delivery

See VERIFICATION.md for checks actually executed and their limits. No Render service was deployed and no live production database credentials were used. Completing the live checks above is necessary before calling the deployed application production-ready.

## Troubleshooting

| Symptom | Check |
|---|---|
| Build rejects VITE_API_URL | Set the real HTTPS backend URL in frontend Render environment and rebuild |
| CORS 403 | Exact frontend origin in backend CORS_ORIGINS, without slash/path; redeploy backend |
| Backend startup fails | Required environment variables, hosted DB network access, TLS certificate and schema check |
| TLS certificate error | Correct provider endpoint and trusted CA; do not disable verification |
| Readiness 503 | Backend cannot currently query the configured database |
| Missing schema | Run explicit db:setup, then db:check; review incompatible columns rather than dropping tables |
| Missing database images | Run the intentional db:seed-media synchronization against the correct database |
| Session invalid after deployment | Preserve JWT secret/issuer/audience or sign in again after intentional rotation |
| API request timeout | Check backend availability and plan startup behavior; the client waits up to 60 seconds |
| Direct page refresh 404 | Add the /* → /index.html rewrite on the Static Site |

Official references: [Render Static Sites](https://render.com/docs/static-sites), [Render Express deployment](https://render.com/docs/deploy-node-express-app), [Render Blueprint specification](https://render.com/docs/blueprint-spec), [Render deployment lifecycle](https://render.com/docs/deploys), [Vite deployment](https://vite.dev/guide/static-deploy), [node-postgres TLS configuration](https://node-postgres.com/features/ssl).
