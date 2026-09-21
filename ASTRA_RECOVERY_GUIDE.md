# Recovery procedure

1. Inspect git status, branch and recent commits. Preserve the user's deleted old prompt files and untracked Prompt.txt.
2. Read PROJECT_STATE, NEXT_SESSION, DECISIONS, IMPLEMENTATION_STATUS, EXECUTION_LOG, QA_REPORT and DEPENDENCIES.
3. Confirm Node 22.13+, lockfile installation, DATA_DIR, SITE_URL and database/upload backups.
4. Inspect actual content/API/auth/schema code; documentation does not override runtime evidence.
5. Run lint/typecheck/build. Avoid concurrent dev/build writes to .next.
6. Start an isolated instance/database for browser tests. Seed its original CV. TEST_BASE_URL and test process DATA_DIR must match that server. Tests create random temporary admins; never run against production data.
7. Revalidate interrupted work before proceeding. Do not recreate correct schema or overwrite existing uploads.
8. Continue the incomplete features listed in IMPLEMENTATION_STATUS, then validate again.
9. For storage recovery use a consistent backup of the entire data volume. Restore to a new location first and verify content, inquiries, CV and media before switching traffic.

The repository has enough instructions to reconstruct the local application, but a separate-person recovery drill and actual production backup restoration have not been performed. Never label those QA gates passed based solely on this guide.
