> Account security upgrade: follow [SECURITY_UPGRADE.md](SECURITY_UPGRADE.md) for the current OTP flow, migration, email settings and deployment commands. It supersedes earlier authentication and start-command instructions below.

# Gallery Noir live deployment and database media

## Live architecture

| Component | Host | Production update source |
| --- | --- | --- |
| React frontend | Netlify | Frontend GitHub repository, `main` branch |
| Node/Express API | Render | Backend GitHub repository, `main` branch |
| PostgreSQL database | Render (`gallery-noir-db`) | Repeatable backend schema and media sync commands |

The frontend calls `https://gallery-noir-backend.onrender.com/api`. The backend
uses the Render **Internal Database URL** only while running inside Render.

## What updates after a GitHub push

### Frontend repository

A push to `main` triggers Netlify. `netlify.toml` runs `npm ci && npm run build`
and publishes `dist`. Changes to React, CSS, text, routes, and static fallback
files become live when the Netlify deployment succeeds.

### Backend repository

A push to `main` triggers Render. The Blueprint build command runs:

```text
npm ci && npm run db:setup && npm run db:seed-media && npm run db:check
```

This applies compatible schema additions, synchronizes new or changed images,
checks the production schema, and then starts the API. Existing users, orders,
and other live records are preserved.

### Database

GitHub does not replace a live database. Database structure changes must be
written as repeatable SQL in `database/schema.sql`. Image bytes under
`seed/media` are synchronized into `media_assets` during the backend build.
Files with unchanged SHA-256 hashes are not rewritten.

To update an existing image while keeping its URL:

1. Replace the file under `seed/media` using the same relative path.
2. Keep the frontend reference in `/media/...` format.
3. Commit and push the backend change.
4. Wait for the Render deployment to become **Live**.

For a new image, add it to `seed/media`, reference the matching `/media/...`
path in the frontend, and push both repositories. The frontend converts that
path to the live backend `/api/media/...` endpoint automatically.

## Why the local backend crashed

The uploaded local `.env` used the Render Internal Database URL. Its private
`dpg-...-a` hostname can only resolve inside Render, so Windows reported:

```text
getaddrinfo ENOTFOUND
```

For local development, open `gallery-noir-db` in Render, select **Connect**, and
use the **External Database URL** in the local `.env` with `DB_SSL=true`. Keep
the backend service on Render configured with the Internal Database URL.

Never commit `.env`, paste database URLs into source code, or include secrets
in screenshots.

## Production verification

After a backend deployment becomes Live, open:

```text
https://gallery-noir-backend.onrender.com/api/health/ready
```

Expected response:

```json
{"status":"ready"}
```

Test one stored image by opening a known path such as:

```text
https://gallery-noir-backend.onrender.com/api/media/artworks/portraits/fragmented-gaze.webp
```

The browser should display the image directly.
