# EIC Innovation Challenge

Competition site and submission platform for the Entrepreneurship & Investment Club (EIC) at Liberty High School.

- **Public site**: homepage with an interactive 3D "invention" that assembles as you scroll, overview, eligibility, project categories, requirements with a video roadmap, judging rubric, official rules and AI policy, prize, timeline, FAQ.
- **Submission system**: five-step form with email verification, private file uploads or links, AI disclosure, review, and a saved reference number. Availability and the deadline are enforced on the server.
- **Officer dashboard**: entries with search and filters, secure file access, eligibility decisions, independent judging on the official 100-point rubric, automatic averages, rankings that only include complete judging, competition settings, announcements and CSV export.

The EIC wordmark here was designed for the challenge and is not an official school logo.

---

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Three.js with React Three Fiber and Drei · GSAP with ScrollTrigger · Motion · Lenis · Supabase (Postgres, Auth, Storage) · Zod · Vitest.

## Project layout

```
src/
  content/competition.ts   All public competition wording: rules, rubric, categories, FAQ, timeline
  lib/domain/              Shared logic: submission schema, scoring, submission window, files, links
  lib/server/              Server-only: env, auth, crypto, rate limiting, submission service
    store/                 Data layer: one interface, Supabase (production) and local (development)
  app/                     Pages and API routes
    officers/              Officer dashboard (protected) and server actions
    api/                   Uploads, submissions, email verification, file access, CSV export
  components/              UI: site chrome, home sections, 3D scenes, form, dashboard
supabase/migrations/       Database schema, row-level security, storage bucket
scripts/                   seed-local.ts (fictional data), officer.ts (officer accounts)
tests/                     Unit and integration tests
```

## Where to change things

| To change… | Edit |
|---|---|
| Rules, rubric, FAQ, categories, prize wording | `src/content/competition.ts` |
| Opening time, deadline, extension, winner date, submissions on/off | Dashboard → **Settings** (admin) |
| Announcements on the homepage | Dashboard → **Settings** → Announcements |
| Allowed school email domains, email verification, sheets required per entry | Dashboard → **Settings** |
| Upload size limits | `MAX_PROTOTYPE_MB`, `MAX_VIDEO_MB` env vars (and the bucket limit in Supabase) |

No dates are hard-coded. Until an officer configures them, the site says dates will be shared through official EIC announcements, and no countdown is shown. Submissions are **closed by default** until an admin turns them on.

---

## Local development

Requirements: Node 20+ (tested on Node 24) and npm.

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run seed
```

```bash
npm run dev
```

Open http://localhost:3000.

Without Supabase credentials, the app uses the **local development store**: a JSON database and an uploads folder in `.data/` (git-ignored). It implements the same rules as the production schema (deadline, duplicates, idempotency, upload ownership).

- `npm run seed` creates three fictional officer accounts (one admin, two judges), opens submissions with a deadline 21 days out, and adds six fictional entries with sample scores. Passwords are generated and written to `.data/dev-credentials.txt`. Use `npm run seed -- --empty` for officers and settings only.
- Email verification codes are not emailed locally. They appear in the dev server log and in `.data/outbox.log`.
- Officer sign-in: http://localhost:3000/officers

To test the production build locally with the local store, `.env.local` must contain `EIC_DATA_BACKEND=local` and `EIC_ALLOW_LOCAL_STORE=true`. Then:

```bash
npm run build && npm run start
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build / server |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run seed` | Fictional data in the local store (refuses to run against Supabase) |
| `npm run officer -- add --email … --name "…" --role admin\|judge [--password …]` | Add an officer |
| `npm run officer -- deactivate --email …` | Deactivate an officer |
| `npm run officer -- list` | List officers |

---

## Production deployment

Nothing has been deployed and no paid services were enabled. These steps need someone with access to the club's accounts.

### 1. Supabase

1. Create a Supabase project (the Free plan works; it limits files to 50 MB).
2. Apply the schema: either paste `supabase/migrations/20261126000000_initial_schema.sql` into the SQL editor and run it, or use the Supabase CLI (`supabase link` then `supabase db push`). This creates the tables, row-level security policies, the `create_submission` and `check_rate_limit` functions, and the private `submission-files` bucket.
3. **Email verification codes**: in Authentication → Email Templates → *Magic Link*, include `{{ .Token }}` so students receive a 6-digit code, for example: `Your EIC Innovation Challenge code is {{ .Token }}`. For reliable delivery to school inboxes, configure custom SMTP (Authentication → SMTP); Supabase's built-in sender is heavily rate-limited.
4. Authentication → URL Configuration: set the Site URL to the deployed domain.
5. Keep email sign-ups enabled (Authentication → Providers → Email). Verification codes create student auth users; those users have no dashboard access, because officer access comes only from the `officers` table.

### 2. Hosting (for example Vercel)

Set these environment variables (server-side only; none use the `NEXT_PUBLIC_` prefix):

| Variable | Value |
|---|---|
| `EIC_DATA_BACKEND` | `supabase` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Project anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (keep secret) |
| `SUPABASE_STORAGE_BUCKET` | `submission-files` |
| `SESSION_SECRET` | 32+ random characters (`openssl rand -base64 48`) |
| `MAX_PROTOTYPE_MB`, `MAX_VIDEO_MB` | Optional; default 50 |

Do **not** set `EIC_ALLOW_LOCAL_STORE` in production. If Supabase variables are missing, the site still renders the public pages but the submission system reports that it isn't configured — it never falls back to local storage.

### 3. Officers

With the production variables in your shell (or `.env.local` pointing at Supabase):

```bash
npm run officer -- add --email officer@yourschool.org --name "Officer Name" --role admin
```

Without `--password`, Supabase emails an invite; the officer sets a password and then signs in at `/officers`. Add judges with `--role judge`.

### 4. Before opening submissions

1. Sign in as an admin → **Settings**.
2. Set allowed school email domains (once the domain is confirmed), the opening time, deadline, winner announcement date.
3. Keep "Require email verification" on.
4. Submit a test entry with a test email and check it in the dashboard, then delete it in Supabase (Table editor → `submissions`; related rows cascade).
5. Turn on **Accept submissions**.

Use a separate Supabase project for staging/testing and set `EIC_TEST_DATA=true` there, so test entries never mix with real ones.

---

## Security and privacy

- **No secrets in the browser.** All Supabase access happens on the server. The browser never receives a Supabase key.
- **Row-level security** on every table. Anonymous visitors have no table access. Signed-in non-officers see nothing. Judges can read and write only their own score sheets; only admins can change settings, read the audit log and see every judge's scores.
- **Private storage.** Files go straight from the browser to a private bucket through a one-time signed upload URL, with type and size limits enforced by the server and the bucket. Officers open files through signed links that expire after 10 minutes.
- **Server-side enforcement.** Deadline, opening time, extension and the on/off switch are checked inside the database transaction that stores an entry. Every field is validated again on the server.
- **Duplicate prevention.** A unique index means a student email can appear in only one entry (as lead or partner). Retries with the same submission key return the original reference instead of creating a second entry. With verification on, the lead email must be proven with a 6-digit code.
- **Upload ownership.** Uploads are bound to a random per-tab token, so one person's upload can't be attached to another entry.
- **Rate limiting** on verification codes, uploads, submissions and officer sign-in (database-backed in production).
- **CSRF**: JSON endpoints require a same-origin `Origin` header; officer actions use Next.js Server Actions, which reject cross-origin calls.
- **Headers**: `X-Frame-Options: DENY`, `nosniff`, strict referrer policy; officer pages are `noindex` and `no-store`.
- **No student data is sent to AI services.** The site has no AI integrations.
- **Publication**: agreeing to the rules and permission to display a project publicly are separate; display permission is optional and shown to officers on each entry.
- **Audit log** of officer actions (sign-in, entry views, eligibility, scores, settings, exports).

### Housekeeping

Uploads that were never attached to an entry (for example, a student who abandoned the form) stay in the `uploads` table and bucket. After the competition, list them with:

```sql
select id, storage_path, created_at from uploads where status <> 'attached' and created_at < now() - interval '2 days';
```

and delete the matching objects from Storage before deleting the rows.

## Judging logic

- Six categories with the official maximums (20/20/20/20/10/10 = 100). Scores must be whole numbers within each maximum (checked in the browser, on the server, and by database constraints).
- Each judge keeps one independent sheet per entry, saved as a draft or submitted. Judges don't see other judges' sheets.
- An entry's average uses submitted sheets only. It is **finalized** only when the entry is eligible, has at least the configured number of submitted sheets (default 2), and no judge still has a draft. Only finalized entries are ranked; ties share a rank.
- Admins can finalize (lock) results. Nothing is ever published automatically.

## Accessibility and performance

- Keyboard navigation throughout, visible focus, skip link, labelled form fields with inline and summary errors, ARIA tabs for categories and the video roadmap, accessible accordion.
- `prefers-reduced-motion` and a footer "Reduce visual effects" switch turn off 3D and smooth scrolling and show static illustrations.
- 3D adapts: no WebGL, phones and small screens get a static blueprint drawing; 4-core / low-memory devices (typical Chromebooks) get simplified materials at DPR 1; frame-rate monitoring lowers resolution and falls back to the drawing if a device can't keep up. Scenes load only when near the viewport and pause off-screen.
- Every competition detail is plain HTML, so the content and the form work with all effects disabled.

---

## Testing

```bash
npm test
```

Covers the official rubric, score validation (maximums, decimals, negatives, completeness), averaging and ranking (drafts and missing sheets are never ranked), submission window logic (closed by default, opening time, deadline, extension), the submission schema (teams of two, grades 9–12, AI disclosure, separate publication permission, unsafe links), and an end-to-end service test on an isolated local store: valid entries, field errors, required verification, idempotent retries, duplicate students (including as a partner), deadline/opening/switch enforcement, extensions, email domains, upload type/size/duration checks, upload ownership, oversized writes, and per-judge score sheets.

The database migration was also applied to a local PostgreSQL instance (with stand-ins for Supabase's `auth` and `storage` schemas) to check the submission function, constraints, rate limiting and row-level security.

## Remaining configuration

- Supabase project, migration, email template with `{{ .Token }}`, custom SMTP for school inboxes.
- Hosting and production environment variables, including `SESSION_SECRET`.
- Officer accounts.
- Confirmed school email domain(s), dates and deadline (entered in Settings).
- File limit above 50 MB requires a paid Supabase plan; otherwise students share large videos as links.
