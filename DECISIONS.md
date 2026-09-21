# Decisions

## Source and design

Compared three directions: technical blueprint (too diagram-dense), dark spatial console (too dashboard-like), and warm editorial infrastructure. Selected warm paper, forest ink, compact monospace labels, asymmetric editorial grids, restrained network illustration, and optional service exploration. No external fonts, stock imagery, copied assets, heavy 3D, or mandatory animation. The sampled MP4 was opened as a contact sheet, but this session's image tool did not expose dependable visual details for a confident shot-by-shot analysis. No claim of faithfully reproducing video motion is made.

The full PDF was extracted locally using pdf-parse. Exact source date ranges are preserved; the 2025 CV's “present” employment is not asserted as verified in 2026. Degree wording is ambiguous, so public copy states the subject/institution rather than inventing a credential. No fabricated projects, testimonials, clients, performance metrics, or social accounts.

## Persistence deviation

OLD: prompt preference PostgreSQL + Prisma/Drizzle + S3-compatible storage.
NEW: Node built-in SQLite + parameterized SQL + local persistent uploads.
WHY: no database/container infrastructure supplied; establish a runnable, real persistent local system without external credentials.
IMPACT: single-instance deployment only; experimental Node SQLite API; no object storage or ORM migration history. This is a documented architectural deviation, not full satisfaction of the preferred production architecture.
MIGRATION: map current tables to PostgreSQL, migrate records/media IDs, replace DB adapter and storage layer, then rerun integration and backup tests.
REVERSAL: preserve this checkpoint and a complete database/upload snapshot before migration.

## AI credentials

Keys are environment-managed rather than browser-editable CMS settings. Provider hostname allowlist is operator-controlled to limit server-side requests. CMS controls model, Base URL, prompt and enablement. Live provider verification is blocked until credentials are supplied. Prompt-injection resistance is best effort; an LLM cannot guarantee factual answers.

## Source preservation

Existing deleted `All prompt.txt` and `Iki prompt.e.txt`, and user-provided `Prompt.txt`, are not staged as implementation changes. No reference attachment is sent to third-party services.
