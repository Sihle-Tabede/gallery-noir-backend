> Latest backend change: see LOGIN_FIX.md for repeat-login cooldown and eight-character password policy. Frontend update is pending re-upload.

# Gallery Noir — account security upgrade

This update is prepared for your existing live Render frontend, backend and PostgreSQL database. It has not been pushed to GitHub or deployed by the assistant. Do not delete your services or recreate your database.

## What customers can now do

- Show or hide passwords using accessible eye buttons on signup, sign-in and account security forms.
- See a live estimated password-strength meter, with feedback for predictable passwords.
- Register and verify their email with a six-digit code before an account is created.
- Sign in using their existing password followed by an email code.
- Recover a forgotten password using an email code and a new password.
- Open My account from their name in the header; update their name and South African mobile number.
- Change their email by confirming their current password and verifying the new email address. The old address remains active until verification.
- Change their password and invalidate other sessions; sign out on all devices.
- Open their wishlist from the heart in the header or the account page. Saved artwork slugs are stored against their user ID in PostgreSQL and persist across devices. Heart buttons throughout the gallery share the same state. Guests are prompted to sign in.

Existing artwork browsing, studio content, media, catalogue and order functionality are retained. Wishlists save artworks, matching the existing heart buttons; merchandise wishlists are not added. Old anonymous browser-only favourites are not automatically imported because they were not tied to a verified account.

## Security behaviour

Email OTP is required for signup and every sign-in. It confirms access to the mailbox; it is not phishing-resistant MFA and does not verify the mobile number. Codes are generated cryptographically, HMAC-hashed with a server secret, valid for 10 minutes and single-use. Five incorrect attempts exhaust a code. Resending invalidates the previous code. Recipient limits allow one send per minute and up to five per hour across OTP purposes; these limits persist in PostgreSQL. Existing IP-based authentication limits also apply (20 requests per 15 minutes, including verification). Email provider failures do not grant a session or leave a newly issued valid challenge behind.

New passwords must have 15–72 characters and fit within bcrypt's 72-byte UTF-8 limit. Passwords are never trimmed or silently truncated; basic highly predictable patterns are rejected. The browser meter is guidance, not a guarantee or a breached-password lookup. Existing passwords still work for sign-in, including existing shorter passwords; changing or resetting one applies the new policy.

Sessions use signed bearer JWTs, validated against the current database user and session version on every protected request. Default expiry is one hour. Old pre-upgrade JWTs are rejected. Password reset/change, email change and sign-out invalidate previous sessions and pending challenges linked to their old version. Roles are read from the database rather than trusted from old token claims. Customers cannot promote themselves or choose another user's profile/wishlist ID.

The existing bearer transport is retained for your separate Render origins. Tokens now use sessionStorage instead of localStorage, so they are not intentionally retained after a tab session closes. Browsers can restore tab sessions; expiry and server-side revocation remain authoritative. This does not make tokens immune to XSS. Journal HTML is now sanitized with DOMPurify, and the frontend Blueprint includes frame, MIME and referrer headers. Auth, wishlist and order responses use no-store caching. Production error logs avoid raw query strings and raw database error details.

## 1. Set up email delivery before replacing the live code

Use Resend's HTTPS email API; no SMTP connection or additional email SDK is needed.

1. Sign in at https://resend.com and add a domain you own under Domains.
2. Add the DNS records Resend supplies with that domain's DNS provider and wait for verification. You cannot verify an onrender.com subdomain that belongs to Render. Your website can stay on its Render URL; the verified email domain can be separate.
3. Create a sending API key, preferably restricted to the verified sending domain.
4. Choose a sender, such as `Gallery Noir <security@your-domain.com>`.
5. In Render → gallery-noir-backend → Environment, add `RESEND_API_KEY` and `EMAIL_FROM` using your actual values. Keep them backend-only.

Resend's test sender is restricted and is not a substitute for a verified domain when emailing customers. Delivery quotas and billing depend on your email-provider plan. Without a working API key and sender, signup/sign-in/recovery cannot send codes and return a clear unavailable message. There is no production OTP bypass or console-code fallback.

Official setup references:
- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/api-reference/emails/send-email

## 2. Update the existing repositories

1. Download and extract both updated ZIPs.
2. Copy the CONTENTS of `Gallery-Noir` into your existing frontend project folder, and the CONTENTS of `gallery-noir-backend` into your existing backend project folder. Do not create another nested project folder.
3. Keep your existing Git repositories. Include both `package.json` and `package-lock.json` in the commit.
4. Never commit real `.env` files, database URLs, API keys, tokens or passwords. The archives contain examples only and exclude `.git`, `node_modules` and build output.
5. Coordinate the two deployments in a quiet period: backend first, then frontend immediately. Old frontend authentication cannot understand the new OTP challenge response during that brief transition.

## 3. Backend Render settings

Use the existing Web Service connected to your backend GitHub repository.

| Setting | Value |
| --- | --- |
| Root directory | Leave blank when package.json is at the repository root |
| Runtime | Node |
| Node version | 24 |
| Build command | `npm ci --omit=dev` |
| Start command | `npm run db:migrate:security && npm run db:check && npm start` |
| Health check | `/api/health/ready` |
| Backend URL | `https://gallery-noir-backend.onrender.com` |

The new start command applies a small additive, repeatable migration under a PostgreSQL advisory lock and inside a transaction, then checks the schema and starts the API. This is usable on a free service without a shell or pre-deploy command. It requires the database role to be able to alter your users table and create the new tables. If the migration fails, startup stops; inspect the error rather than bypassing the check.

On a service that supports pre-deploy commands, you can instead use `npm run db:migrate:security` there and retain `npm run db:check && npm start` as the start command. Do not run both approaches unnecessarily. Future unrelated migrations need their own review.

The migration adds `users.email_verified_at`, `users.session_version`, `auth_challenges`, `auth_delivery_limits` and `wishlists`. It preserves users, artwork, images and orders. Existing users verify their email at their next sign-in; the update does not assume old email addresses were verified. No media reseeding or database recreation is required. Take a database backup before deployment.

### Backend environment variables

| Variable | What to enter |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24` |
| `DATABASE_URL` | Keep the working hosted PostgreSQL connection string you already configured |
| `CORS_ORIGINS` | Your actual frontend HTTPS origin, no trailing slash or path; comma-separate only if multiple origins are genuinely required |
| `JWT_SECRET` | Keep your strong existing private secret, at least 32 random characters |
| `JWT_EXPIRES_IN` | Set explicitly to `1h`, replacing any old `7d` value |
| `JWT_ISSUER` | `gallery-noir-api` (default) |
| `JWT_AUDIENCE` | `gallery-noir-web` (default) |
| `DB_SSL` | `true` |
| `DB_SSL_REJECT_UNAUTHORIZED` | `true` |
| `DB_CONNECTION_LIMIT` | `5` recommended for your small service; code default 10 |
| `DB_CONNECTION_TIMEOUT_MS` | `10000` (default) |
| `DB_IDLE_TIMEOUT_MS` | `30000` (default) |
| `BCRYPT_ROUNDS` | `12` (default) |
| `RESEND_API_KEY` | Your private sending API key — NEW |
| `EMAIL_FROM` | Your sender on a verified domain — NEW |
| `PORT` | Supplied by Render automatically; do not set a hard-coded production port |

Local-development alternatives `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` remain supported outside production if DATABASE_URL is absent. They must not replace DATABASE_URL in production. There are no OTP, email or database secrets on the frontend.

After setting these values and updating the start command, push the backend changes. Wait for migration success, database compatibility, and `Your service is live` in the Render logs.

## 4. Frontend Render settings

| Setting | Value |
| --- | --- |
| Service type | Static Site |
| Root directory | Leave blank when package.json is at the repository root |
| Build command | `npm ci --include=dev && npm run build` |
| Publish directory | `dist` |
| Start command | None |
| `NODE_VERSION` | `24` |
| `VITE_API_URL` | `https://gallery-noir-backend.onrender.com/api` |

No other browser configuration is required. Push the frontend changes after the backend is live. VITE_API_URL is built into the JavaScript; changing it requires a rebuild.

Keep the Render rewrite `/*` → `/index.html` with action Rewrite so `/account`, `/wishlist` and `/forgot-password` work when opened directly or refreshed.

For services created manually, `render.yaml` is documentation until the service is managed through a Blueprint. Add these entries in the frontend Render service's Headers page; the updated Blueprint includes them for Blueprint-managed services:

| Path | Header | Value |
| --- | --- | --- |
| `/*` | `X-Content-Type-Options` | `nosniff` |
| `/*` | `X-Frame-Options` | `DENY` |
| `/*` | `Referrer-Policy` | `strict-origin-when-cross-origin` |

Official Render instructions: https://render.com/docs/static-site-headers

## 5. Check the actual deployed application

These live checks must be done after deployment; they have not been performed by the assistant.

1. Open the frontend over HTTPS. Register using an inbox you control. Check password visibility, strength feedback and matching-password validation.
2. Confirm no logged-in session exists before entering the email code. Check Inbox and Spam, then enter the code. You should reach `/account` with your verified email.
3. Sign out, sign in again, and confirm the second email code is required.
4. Update your name/mobile number, refresh and confirm the values persist. Verify a new email address and confirm the old email cannot still be used to sign in.
5. Save a gallery artwork, open Wishlist, refresh, and sign in from another browser to confirm the saved selection persists. Another customer should see only their own selection.
6. Try password recovery. Confirm old sessions stop working after reset/change and after Sign out on all devices.
7. Refresh `/account` and `/wishlist` directly. Check the browser's Network panel for HTTPS API requests, no localhost calls and no CORS errors.
8. Open the backend `/api/health/ready`. Expect HTTP 200 and `status: ready`. This checks database connectivity, not email delivery.
9. Verify the production database in pgAdmin with these read-only queries:

```sql
SELECT id, full_name, email, role, email_verified_at
FROM public.users
ORDER BY created_at DESC;

SELECT user_id, slug, created_at
FROM public.wishlists
ORDER BY created_at DESC;
```

OTP troubleshooting: wait 60 seconds before resending; only the newest code works; it expires after 10 minutes and five wrong entries exhaust it. After five code sends to an address in an hour, wait for the limit to reset. If the server reports email unavailable, inspect the sender verification and API-key configuration in Resend/Render without sharing the secret. A free Render backend may take time to wake up.

## Verification and remaining limits

See VERIFICATION.md in either ZIP. Local tests cover the API against PGlite's PostgreSQL engine, with email delivery stubbed; no live database was modified. Frontend tests run in jsdom, not a full browser. The browser preview could not open this workspace in this environment, so visual layout on real devices is still a deployment check. Production build succeeds; the existing 3D gallery and the new password-estimation dictionary produce bundle-size warnings.

This is a tested security improvement, not a guarantee that every part of the platform is secure or a penetration-test certification. A compromised email inbox can defeat email OTP; authenticator-app MFA is a sensible next step for studio administrators. General IP request limits remain process-local; use a shared edge/rate-limit service if you scale to several backend instances or face distributed abuse. Use MFA on GitHub, Render and the email-provider account, keep backups, and continue applying dependency updates. Never weaken database certificate verification to resolve a deployment error.

Security references used in the review:
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
