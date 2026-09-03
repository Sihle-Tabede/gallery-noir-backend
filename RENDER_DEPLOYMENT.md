# Gallery Noir Backend: Render Deployment

This repository is ready to deploy as a Render Node web service. It requires a
hosted PostgreSQL database; a PostgreSQL server running on your own computer at
`127.0.0.1` cannot be reached from Render.

## Before deployment

1. Push this clean project to the `main` branch of the backend GitHub repository.
2. Do not commit `.env`, `node_modules`, or `.git` inside another repository.
3. Have these values ready:
   - the exact Netlify site origin, such as `https://your-site.netlify.app`;
   - a hosted PostgreSQL connection string;
   - no trailing `/api` on the CORS origin.

## Recommended Render Blueprint deployment

1. In Render, select **New > Blueprint**.
2. Connect the GitHub repository containing this `render.yaml` file.
3. Set `CORS_ORIGINS` to the exact Netlify origin. Add multiple origins as a
   comma-separated list only when needed.
4. Set `DATABASE_URL` to the hosted PostgreSQL URL. Keep the URL secret.
5. Allow Render to create the service. The configured build installs locked
   dependencies, applies the repeatable schema, synchronizes changed images
   into PostgreSQL, and checks the schema before starting the API.

The generated JWT secret is managed by Render. The service binds to Render's
`PORT` on `0.0.0.0`, and Render checks `/api/health/ready`.

## Manual Render web-service deployment

Use these settings if repairing an existing service instead of using Blueprint:

| Render setting | Value |
| --- | --- |
| Language | Node |
| Branch | `main` |
| Root Directory | Leave empty when `package.json` is at the repo root |
| Build Command | `npm ci && npm run db:setup && npm run db:seed-media && npm run db:check` |
| Start Command | `npm start` |
| Health Check Path | `/api/health/ready` |

Add the following environment variables one key at a time, or use Render's
**Add from .env** feature. Do not paste a complete `KEY=value` line into the
Key field.

```dotenv
NODE_ENV=production
CORS_ORIGINS=https://your-exact-netlify-site.netlify.app
DATABASE_URL=PASTE_THE_RENDER_INTERNAL_DATABASE_URL_HERE
JWT_SECRET=replace_with_a_random_secret_of_at_least_32_characters
JWT_EXPIRES_IN=7d
JWT_ISSUER=gallery-noir-api
JWT_AUDIENCE=gallery-noir-web
DB_CONNECTION_LIMIT=5
DB_CONNECTION_TIMEOUT_MS=10000
DB_IDLE_TIMEOUT_MS=30000
BCRYPT_ROUNDS=12
```

Do not manually create a `PORT` variable. Render supplies it automatically.
Do not add `DB_SSL=true` when the service uses Render's Internal Database URL.
For a local computer using the External Database URL, set `DB_SSL=true` in the
local `.env` instead.

## Verify the deployed API

Open these URLs after Render reports **Live**:

```text
https://YOUR-RENDER-SERVICE.onrender.com/
https://YOUR-RENDER-SERVICE.onrender.com/api/health
https://YOUR-RENDER-SERVICE.onrender.com/api/health/ready
```

All three should return JSON. The readiness endpoint must return
`{"status":"ready"}`.

## Connect the Netlify frontend

In the Netlify site, add or update this environment variable:

```dotenv
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
```

Then trigger a new Netlify production deploy. Vite embeds this value during the
build, so changing it without rebuilding does not update the deployed frontend.

## Important data note

The schema setup preserves existing users, orders, and other records. The media
seed step inserts new images and updates only images whose SHA-256 content hash
changed. It does not delete user-created data.

For the complete GitHub-to-live workflow and the difference between Render's
Internal and External database URLs, see `LIVE_DEPLOYMENT_GUIDE.md`.
