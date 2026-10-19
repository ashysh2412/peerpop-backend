# Peerpop

A place for content creators to show their work, connect with each other, and team up on collabs. Launching in Pune.

Stack: Next.js (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth, Storage).

## Run locally

1. Create a Supabase project at https://supabase.com/dashboard.
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable (anon) key from **Project Settings > API**.
3. In Supabase, **Authentication > URL Configuration**: set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
4. Install and start:

   ```bash
   npm install
   npm run dev
   ```

Email magic links work out of the box. For **Continue with Google**, enable the Google provider under **Authentication > Sign In / Providers** with a Google OAuth client ID and secret.

## Database

The schema lives in `supabase/migrations/`. To set up a Supabase project, open **SQL Editor > New query**, paste the contents of each migration file in order, and click **Run**. (With the Supabase CLI, `supabase db push` does the same.)

The security rules are tested in `supabase/tests/`. They need a Postgres server:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run test:db
```

## Deploy (Vercel)

1. Import this repo at https://vercel.com/new.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as environment variables.
3. After the first deploy, add `https://<your-domain>/auth/callback` to Supabase Redirect URLs and set Site URL to your domain.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:db   # needs Postgres, see above
```

CI runs all of these on every pull request.
