# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, and API routes; feature areas live in dedicated folders (for example `app/dashboard`).
- `components/`: shared React UI; shadcn primitives in `components/ui/`, domain composites in `components/`.
- `lib/`: cross-cutting logic (`lib/ai` for model orchestration, `lib/supabase` for data access, `lib/utils.ts` for helpers) with type definitions in `types/`.
- `supabase/` and `docs/`: SQL migrations, storage policies, and reviewer guides.
- `public/` holds static assets, `scripts/` contains the job worker entry point, and Jest-style suites sit in `test/`.

## Build, Test & Development Commands
- `npm run dev`: local HTTPS-relaxed dev server; `npm run dev:secure` enforces TLS when callbacks require it.
- `npm run build`: Next.js production build; run before deployment reviews.
- `npm run start`: boots the custom Node server against `.next`; prefer for staging smoke tests.
- `npm run lint`: Next.js + ESLint rules, including Tailwind plugin expectations.
- `npm run worker`: spawns `scripts/job-worker-entry.js` for queued AI work; `npm run dev:all` runs app and worker together.

## Coding Style & Naming Conventions
- TypeScript with 2-space indentation; keep Prettier defaults and let ESLint flag drift.
- React components use PascalCase, hooks/utilities use camelCase, and feature folders adopt kebab-case (`career-tracker/`).
- Favor Tailwind utility composition; promote repeated patterns into `components/ui/` before adding bespoke CSS.
- Read environment variables in `lib/` helpers so server/client boundaries stay explicit.

## Testing Guidelines
- Primary automation lives in `test/application-qa.test.ts`, exercising AI Q&A scoring paths.
- Execute suites with `npx vitest run test/application-qa.test.ts` (install `vitest` locally if it is not yet in `devDependencies`).
- Follow the `*.test.ts` naming convention, keep fixtures lightweight but realistic, and assert both confident and fallback responses.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes seen in history (`feat:`, `fix:`, etc.) with scoped, single-purpose commits under ~72 characters.
- PRs should summarize intent, list verification commands, link issues, and attach UI captures for visual changes.
- Call out Supabase schema or policy updates explicitly and include the relevant SQL from `supabase/` so reviewers can apply them.

## Environment & Security Tips
- Copy `.env.local.example` to `.env.local`, supply Supabase, OpenRouter, Gemini, and Bright Data secrets, and keep them out of Git.
- Guard service credentials (`google_document_ai.json`, Supabase keys) via secret managers in Netlify/Replit and document new flags in `docs/`.
