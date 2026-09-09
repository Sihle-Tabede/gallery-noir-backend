# Start here — environment setup fixed

The ZIPs did not contain real .env credentials. This update automates local file creation; it cannot recover credentials from your Render or Resend accounts.

1. Extract the frontend and backend ZIPs. Copy their contents into the matching existing project folders. Keep your existing .env and .git folders private; setup will not overwrite an existing .env.
2. In the BACKEND terminal run:

```powershell
npm ci
npm run setup
```

3. Open the newly created backend `.env` beside package.json. Only fill these three entries:

| Entry | Where the value comes from |
| --- | --- |
| DATABASE_URL | Render → gallery-noir-db → Connect → External → copy the full database URL |
| RESEND_API_KEY | Your Resend sending API key |
| EMAIL_FROM | A sender on your verified Resend domain, e.g. `Gallery Noir <security@your-domain.com>` |

The script fills the local port, frontend CORS URLs, TLS settings and generates a local JWT secret. If .env already existed, it is preserved: check it against .env.example, keeping real credentials. Do not paste passwords or keys into chat.

4. Save .env, then run:

```powershell
npm run env:check
npm run db:check
npm run dev
```

If db:check specifically reports missing security tables/columns, run `npm run db:migrate:security`, then `npm run db:check` again. This migration modifies the hosted database additively; it does not recreate it. It has already been tested against an isolated database, but your live database has not been accessed here.

5. In a second terminal, inside the FRONTEND folder, run:

```powershell
npm ci
npm run dev
```

The frontend now creates `.env.development.local` automatically with `VITE_API_URL=http://localhost:5000/api`. Open http://localhost:5173. Keep both terminals running. Local requests use the local backend and the hosted database configured above. Writes affect that hosted database.

## Existing Render deployment

Keep the Render services and their existing private credentials. Do not upload your local .env to GitHub or change Render CORS to localhost.

Backend: NODE_ENV=production, CORS_ORIGINS=your actual frontend HTTPS origin, DATABASE_URL=your working hosted database URL, JWT_SECRET=your existing strong production secret, JWT_EXPIRES_IN=1h, DB_SSL=true, DB_SSL_REJECT_UNAUTHORIZED=true, RESEND_API_KEY and EMAIL_FROM=your configured sender credentials. PORT is supplied by Render. Full variable template: .env.render.example. Build: `npm ci --omit=dev`. Start: `npm run db:migrate:security && npm run db:check && npm start`.

Frontend: VITE_API_URL=https://gallery-noir-backend.onrender.com/api; NODE_VERSION=24. Build: `npm ci --include=dev && npm run build`. Publish: dist. No start command. Keep rewrite /* → /index.html. Both repository roots can stay blank when package.json is at their root.

The local setup runs on npm run dev, not npm start or Render builds. Vite ignores .env.development.local in production mode. Render environment variables take precedence over file values.

## What was fixed

- Backend loads .env relative to its own folder instead of depending on terminal location.
- Automatic setup creates local configuration without overwriting existing files or bundling real secrets.
- Local frontend API URL and backend CORS origins match.
- Missing database credentials produce an actionable configuration error before PostgreSQL's cryptic password error.
- Local and Render examples are separate.

Missing email-provider credentials still prevent OTP delivery; there is no OTP bypass. You need a verified sending domain for customer email. Neither live database connectivity nor email delivery can be verified without your configured services.
