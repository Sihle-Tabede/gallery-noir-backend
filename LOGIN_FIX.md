# Repeat-login and password fix

The previous 60-second resend cooldown could reject a new login even after the preceding code was successfully used. A fresh password-authenticated login can now request a new code when no previous login challenge remains. Outstanding login challenges retain the cooldown; the five-email-per-hour limit and five wrong-code-attempt limit remain enforced. Rate-limit responses show the wait in seconds and include Retry-After.

New password minimum is eight characters for registration, recovery and password change. The maximum remains 72 UTF-8 bytes, with existing predictable-password checks. The frontend still needs its matching minimum and wording updated; the latest frontend upload was unavailable.

Provider delivery failures now log a safe provider HTTP status and return a clearer error. No OTP, recipient, secret or raw provider response is logged. Actual delivery cannot be verified from these files. Resend's test sender still only sends to your Resend account address. A verified sending domain is required for other customers with this integration.

Copy the backend folder contents into your existing backend project, preserving .env. Restart npm run dev. No new database migration is needed for this fix if the earlier security migration already ran. For Render, push the backend code and redeploy the existing service. Preserve your environment variables.
