# Dependency registry

| Dependency | Classification | Fallback / operational note |
|---|---|---|
| Node.js 22.13+ | Required, critical | Built-in node:sqlite currently experimental; pin/test runtime |
| Next.js / React / TypeScript | Required, critical | Lockfile committed; npm ci |
| SQLite persistent volume | Required, critical | Backups mandatory; no automatic storage failover |
| Local uploads volume | Required for media/CV | Missing CV page remains functional |
| PostgreSQL / ORM | Preferred but not implemented | SQLite deviation documented |
| AI provider / API key | Optional, non-critical | Disabled by default; contact fallback |
| SMTP provider | Optional, not integrated | CMS inbox stores inquiries; mailto/WhatsApp remain available |
| Cloudflare / DNS / TLS | Required only for chosen production deployment | Local app works without external infrastructure |
| Docker | Deployment tool, unavailable in current environment | Local Node runtime verified; container execution unverified |
| pdf-parse | Development/source extraction | Not loaded into application runtime |
| ffmpeg | Local source analysis only | No runtime dependency |
| Playwright Chromium | Development verification | Installed after missing-browser failure |
| Fonts / external CDN | None | System fonts, local CSS/SVG |

Package versions and integrity hashes are in package-lock.json. npm install reported no known vulnerabilities at installation; this is not a security audit. AI endpoints may receive visitor messages only after operator activation and visible privacy notice.
