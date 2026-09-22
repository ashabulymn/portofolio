# Deployment and operations

## Environment

- `SITE_URL`: exact public origin. Required in Compose. Use HTTPS in production.
- `DATA_DIR`: persistent database/upload directory; default `data`.
- `AI_API_KEY`: optional secret supplied by operator, server only.
- `AI_ALLOWED_HOSTS`: comma-separated exact provider hostnames, no spaces.
- `TRUST_PROXY`: false by default. Enable only behind a proxy that replaces untrusted forwarding headers and blocks direct origin access. Otherwise rate limiting deliberately shares a bucket across visitors.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: one-time process variables for bootstrap. Remove immediately afterward.

## VPS / Cloudflare

Docker configuration is supplied but has not been executed in the current environment (Docker CLI absent). Validate before deployment.

```powershell
docker compose up --build -d
docker compose exec portfolio node --experimental-strip-types scripts/seed-cv.ts
docker compose exec -e ADMIN_EMAIL -e ADMIN_PASSWORD portfolio node --experimental-strip-types scripts/create-admin.ts
```

Inject admin environment securely from your operator shell; do not place passwords in command history or source files. The runtime image uses a non-root user. Only loopback port 3000 is exposed. There is no public database port. Reverse proxy through Caddy/Nginx or a Cloudflare Tunnel running on the host. Configure Cloudflare SSL **Full (strict)**, valid origin TLS, WAF/rate limits, and a 6 MB request body limit. Never cache `/admin`, `/api/*`, preview URLs, or personalized responses. Do not cache HTML until publication invalidation is designed. Static `/_next/static` assets may be cached.

Secure cookies require HTTPS in production. The public domain must match `SITE_URL`. Verify CSRF rejections, login, media and contact through the actual proxy before opening traffic. Keep a single app replica; SQLite files must not be placed on shared network filesystems.

## Backups

Stop writes during a full backup: stop the application and copy the entire persistent volume, including SQLite/WAL/SHM if present and uploads. Encrypt backups and restrict operator access: inquiries contain personal data. Retain according to an owner-approved retention policy. Test restore into a separate directory/volume, never over a live database. Restart against restored storage and verify CMS login, published pages, media, CV downloads, and inquiry counts. Online SQLite backups should use the SQLite backup API, not copying only the main file while running.

## Emergency safe mode

In CMS settings, enable `safeMode`, save and preview, then publish. Safe mode disables animation, optional service exploration, project images and the AI interface/backend while preserving services, experience, CV and direct contact links. `exploration` and `projectImages` can also be disabled separately. No WebGL or analytics dependency is loaded, so neither is needed for core rendering. Published settings apply independently to each language.

## Inquiry retention

Set `INQUIRY_RETENTION_DAYS` to the owner-approved interval (1–3650 days). Run `npm run inquiries:prune` for a dry run, then `npm run inquiries:prune -- --apply` to delete expired inquiries. Schedule the apply command daily through the host scheduler using the same `DATA_DIR`; it is not scheduled automatically. Backups require their own matching expiration policy. This operation does not send data to an external mail or analytics service.

## Upload policy

Authenticated uploads accept PDF, PNG, JPEG and WebP up to 5 MB; the complete multipart request is capped at 6 MB while streaming. Images must decode successfully within a 24-megapixel limit and are resized to fit 2400 × 2400, stripped of metadata and stored as WebP. PDFs remain original downloads, not sanitized documents: upload only trusted owner-reviewed CVs. No antivirus service is configured.

HTML scripts use a fresh CSP nonce per request. Do not cache HTML at a proxy: cached markup and fresh policy nonces must not be mixed. Inline styles remain allowed.

## Rollback

Keep the previous image and a consistent volume backup. Stop the current app, restore its matching volume snapshot into a new volume, and run the prior image against that volume. Do not run old code against an incompatible future schema. Current schema initialization is idempotent `CREATE TABLE IF NOT EXISTS`; future structural migrations need an explicit versioned migration system.

## Codespaces

Open in the provided Dev Container. After port forwarding is ready, update `SITE_URL` to its exact HTTPS origin and restart the application. Keep the CMS forwarded port private. Codespaces is a development environment, not the production host.

## Troubleshooting

- POST returns 403: verify Origin and `SITE_URL`; do not disable the origin check.
- 429: wait for the rate window; check trusted-proxy configuration.
- AI 503: verify key, model, approved hostname, credit and provider availability.
- Missing CV: import the original or activate a language-specific PDF in CMS.
- Database unavailable: verify directory permissions, disk space and volume mounting.
- Build output conflicts: stop dev before building; restart the development task afterward.

## Optional inquiry notification worker
Notifications are disabled by default. To opt in, configure these server-only environment variables:
- `NOTIFICATION_ENABLED=true`
- `NOTIFICATION_API_KEY`: Resend API key
- `NOTIFICATION_FROM`: sender on a verified domain
- `NOTIFICATION_TO`: owner notification address
- `SITE_URL`: public portfolio origin

Run `npm run notifications:send` through an operator-managed scheduler (for example once per minute). The worker handles at most 20 queued jobs per run, uses a two-minute claim lease, a ten-second request timeout, provider idempotency keys, and exponential retry delays capped at one hour. Jobs stop after eight failed attempts; inspect `inquiry_notifications` for exhausted jobs and reset attempts/available only after correcting provider configuration. Idempotency is subject to the provider retention window; delivery is not guaranteed exactly once.

Inquiry storage and optional queue insertion are one transaction. Provider outages do not block the contact endpoint. Notification messages include only an inbox link and reference number, never the visitor name, email or message. Enabling delivery shares the configured sender/recipient and site URL with Resend. No real email has been sent or provider credentials validated during local QA. Deleted inquiries are removed from the queue at the next worker run. Disabling notifications stops new queuing and the operator worker; existing jobs remain pending.
