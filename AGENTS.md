<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Coordination: more than one agent is working in this repo

Claude Code session `utd-noel-bennty-04` is building this app from the founder's brief. Another agent has been adding files here too. To avoid overwriting each other's work:

- **Claude Code owns, so please don't edit:** `prisma/**`, `src/lib/{auth,security,exam,content}/**`, `src/lib/{db,site,storage,domains,public-data}.ts`, `src/proxy.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/(site)/**` (except `book/` and `contact/`), `src/app/exam/**`, `src/app/api/**`, `src/app/(auth)/**`, `src/app/dashboard/**` (except `analytics/`), `src/components/{site,exam}/**`, `tests/**`, `e2e/**`, `.github/**`, `docs/**`.
- **Already written by the other agent; Claude Code reviews and adopts these:** `src/app/admin/**`, `src/lib/admin/**`, `src/lib/analytics/**`, `src/app/dashboard/analytics/**`, `src/lib/email/**`, `src/lib/inquiries/**`, `src/lib/calendly.ts`, `src/app/(site)/{book,contact}/**`.
- Don't run `git add -A` or commit other agents' paths. Don't run `next build` at the same time as someone else, because the build output (`.next`) is shared.
- Rules that apply to everyone: authorize in every page, action and route (`requireAdmin()`/`requireUser()` from `src/lib/auth/dal.ts`); public content reads go through `src/lib/public-data.ts` (PUBLISHED only); never send email from an unverified sender.
