# QA report — 2026-09-21

## Verified evidence

- `npm install`: 354 packages audited, zero reported vulnerabilities at installation time.
- `npm run lint`: passed with no errors/warnings.
- `npm run typecheck`: passed.
- `npm run build`: production BUILD_ID generated, TypeScript completed; production runtime served HTTP 200.
- Playwright against production server on port 3001 and isolated temporary database: **5 passed (4.9 s)**.
  1. Media upload, private preview, activation, public retrieval, deletion.
  2. Disabled AI 503 fallback and invalid contact rejection.
  3. ID/EN rendering, theme switching, optional exploration, 390px viewport without horizontal overflow, persisted contact success.
  4. Anonymous CMS rejection, cross-origin write rejection, Indonesian PDF, missing English CV, HTTP 404.
  5. CMS authentication, save draft, publish, restore revision, logout.
- Browser page and screenshot tools exercised; page title/content verified. Screenshot tool returned an attachment without dependable visual detail in this agent context; no pixel-quality certification claimed.

## Failures encountered and resolved

- Missing Playwright Chromium: installed the matching browser.
- Next development CSP needed development-only unsafe-eval: scoped to development, not production.
- Origin comparison used internal host: now compares exact configured SITE_URL (localhost default).
- Streamed unknown-language page returned HTTP 200: proxy now returns explicit HTTP 404 for unknown top-level routes.
- React lint issues: external-store theme subscription, async initial fetch and Next Link fixes.
- Browser test raced hydration on locale navigation: added interactive hydration confirmation.
- Repeated tests hit real persistent rate limits: final run used isolated production database instead of weakening limits.

## Unverified / release blockers

Live AI provider, production HTTPS/proxy, Docker image/Compose/Dev Container/Codespaces, PostgreSQL migration, storage resilience, full keyboard/screen-reader audit, Lighthouse budgets, visual anti-template review, adversarial security audit, production backup/restore and independent operator recovery. No Docker CLI or external deployment/AI credentials are available. See IMPLEMENTATION_STATUS.md for remaining implementation gaps.

Tests must not run against production data. Test administrator credentials are randomly generated in memory and cleaned up; no real owner account was created.
