# KomTutor

Timed mock quizzes from past Komarovi math papers (variant 1), with grading, history and step-by-step explanations.

## Pages

- **Home** (`/`): intro and links.
- **Mock quiz** (`/mock-quiz`): pick a school year, grade, quiz and time limit. The quiz shows each problem from the original paper with an answer sheet and submits itself when time runs out.
- **Results** (`/results/:id`): the score, worked out on submit, then every problem with your answer and the correct one. Open a problem to read its explanation.
- **History** (`/history`): every attempt with its score, plus average, best and recent scores.

Quizzes, results and history need a sign-in (Clerk). Each user's attempts are saved to Supabase and cached in `localStorage`, so a refresh mid-quiz keeps the clock and answers and scores follow the user to other devices.

## How scoring works

Each problem is checked one of three ways (`check` in the quiz data):

- `letter`: the correct option letter is known, so the student picks ა–ვ. Letters come from `data/answer-keys.json`, built by `npm run keys` from, in order: the explanation naming the option, the red letter on the answered paper, or the single option on the unanswered paper whose value equals the explanation's answer. About 5,400 of 8,352 problems.
- `value`: no letter, but the answer is a plain number, so the student types it and the numbers are compared (`src/lib/numbers.js`). About 1,250 problems.
- not scored: the answer is a formula, set or statement. The student can still write an answer and compare it with the correct one on the results page; it doesn't count towards the score.

Keys are read from the papers automatically, so a small share may be wrong. On problems that also have a letter in the explanation, the answered-paper keys agree 98% of the time.

## Accounts: Clerk and Supabase

Supabase is set up to trust Clerk's session tokens, so there is no separate Supabase login. Row level security on the `attempts` table lets each Clerk user see and change only their own rows (`auth.jwt()->>'sub'`).

One-time setup:

1. **Clerk**: create an application at [dashboard.clerk.com](https://dashboard.clerk.com) and copy its publishable key.
2. **Supabase**: create a project at [supabase.com/dashboard](https://supabase.com/dashboard) and copy its URL and publishable (or anon) key.
3. **Connect them**: in Clerk, open the Supabase integration setup and activate it; this adds the `role` claim Supabase needs and shows your Clerk domain. In Supabase, go to Authentication → Sign In / Providers → Third-party auth, add Clerk and paste that domain.
4. **Create the table**: run `supabase/migrations/20261027000000_attempts.sql` in the Supabase SQL editor (or `supabase db push` with the Supabase CLI linked to the project).
5. **Keys**: copy `.env.example` to `.env.local` and fill in the three values. `.env.local` is git-ignored.

Without the keys the site shows a setup message instead of the app.

## Running it

The site reads the quiz archive (`quizzes_by_year_grade`) from `../../komarovi_quizzes/quizzes_by_year_grade` by default. Point it elsewhere with `QUIZ_DATA_DIR`.

```bash
npm install
npm run dev
```

`npm run keys` (about 20 seconds) rebuilds `data/answer-keys.json`, which is committed; run it again only if the archive changes.

`npm run dev` and `npm run build` first run `npm run data`, which builds `public/data/` (the quiz index and one JSON file per quiz) and copies each quiz's unanswered paper to `public/papers/<quiz id>.pdf` (about 170 MB). Problems are drawn from those papers using the archive's crop regions, so the 3 GB of extracted problem PDFs are never needed. Both folders are committed, so a machine without the archive (like Render) builds from them; `npm run data` just reuses them there.

## Deploying to Render

`render.yaml` describes a free static site: `npm ci && npm run build`, publishing `dist/`, with every route rewritten to `index.html`. It contains the publishable Clerk and Supabase keys, which are safe to share. In Render, choose New → Blueprint, pick this repository, and apply it. Then add the site's `onrender.com` address to Clerk's allowed origins if Clerk asks for it.
