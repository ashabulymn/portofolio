# Ashabul Yamin — portfolio platform

Custom bilingual editorial portfolio with a server-backed content studio, SQLite persistence, contact inbox, versioned CV/media, draft/publish/restore, and optional provider-backed AI.

**Status: verified local implementation checkpoint, not production-approved.** See [QA_REPORT.md](QA_REPORT.md) and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for explicit remaining work. The master prompt's complete Definition of Done has not been met.

## Local setup

Requires Node.js 22.13+ (tested 22.23.2) and npm. SQLite is built into this runtime and currently emits an experimental warning.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run seed:cv
$env:ADMIN_EMAIL = Read-Host 'Administrator email'
$credential = Get-Credential -UserName $env:ADMIN_EMAIL -Message 'Choose a unique password of at least 14 characters'
$env:ADMIN_PASSWORD = $credential.GetNetworkCredential().Password
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000/id or http://localhost:3000/en. CMS: http://localhost:3000/admin. No default administrator exists. The provided Indonesian PDF is imported by `seed:cv`; an English CV is not fabricated. A missing English CV has an explicit Indonesian download alternative.

`SITE_URL` must exactly match the browser origin, including scheme and port. Change it for staging, Codespaces forwarded URLs, or production. CLI setup scripts read process environment, not Next.js environment files; set `DATA_DIR` in the process when using a non-default directory.

## Editing

Sign in, choose language, edit profile or category records, save draft, preview, then publish. Languages have independent drafts and publications. Entries support visibility, ordering and featured flags. Revisions restore into draft only. Inquiries appear in the dashboard and can be deleted. Media uploads remain private until activation; activating a CV deactivates other CVs in the same language. API keys remain server environment variables.

## Validation

Start the development server before browser tests. Tests create and remove a random administrator and inquiry. They write revisions containing unchanged content; use a dedicated development database, not production.

```powershell
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

VS Code task: **Portfolio development server**. Do not run a production build concurrently with a development server when validating generated artifacts; both use `.next`.

## AI

Set `AI_API_KEY`, configure model/Base URL in CMS settings, review the system prompt, publish, and enable AI. Hosts must appear in `AI_ALLOWED_HOSTS`; HTTPS only and redirects rejected. Default hosts are OpenAI and OpenRouter. The browser never receives API keys. Approved published content supplies knowledge; chat is stateless, rate-limited, time-limited, and has a contact fallback. No live provider response has been verified because no provider credentials were supplied. Visitors must not submit sensitive information to the assistant. Confirm provider retention policies before enabling it.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md). SQLite and uploaded media require a persistent local volume and one application instance. PostgreSQL/ORM and object-storage migration are not implemented. Cloudflare Workers/Pages cannot run this Node/SQLite server directly; use a VPS behind Cloudflare instead.

## Recovery and operations

Read [NEXT_SESSION.md](NEXT_SESSION.md), [PROJECT_STATE.md](PROJECT_STATE.md), and [ASTRA_RECOVERY_GUIDE.md](ASTRA_RECOVERY_GUIDE.md) before continuing. Source attachments remain untouched. No external upload of source assets is needed. No production secrets are committed.
