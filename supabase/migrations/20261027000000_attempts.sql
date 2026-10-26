-- Quiz attempts, one row per attempt, owned by the Clerk user who wrote it.
-- Supabase verifies Clerk session tokens (Authentication → Third-party auth → Clerk), so the
-- Clerk user id is available as auth.jwt()->>'sub'.

create table public.attempts (
  id text primary key,
  user_id text not null default (auth.jwt() ->> 'sub'),
  quiz_id text not null,
  status text not null check (status in ('in-progress', 'submitted', 'graded')),
  percent integer,
  started_at timestamptz not null,
  updated_at timestamptz not null default now(),
  -- The whole attempt as the site stores it: answers, marks, score, timings.
  data jsonb not null
);

create index attempts_user_started on public.attempts (user_id, started_at desc);

alter table public.attempts enable row level security;

create policy "Users read their own attempts"
  on public.attempts for select to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

create policy "Users add their own attempts"
  on public.attempts for insert to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "Users update their own attempts"
  on public.attempts for update to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "Users delete their own attempts"
  on public.attempts for delete to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);
