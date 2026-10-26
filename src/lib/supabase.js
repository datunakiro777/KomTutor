import { createClient } from '@supabase/supabase-js';

// Supabase accepts Clerk session tokens directly (Clerk is set up as a third-party auth provider),
// so every request carries the signed-in user's token and row level security does the rest.
export function createSupabase(getToken) {
  return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => (await getToken()) ?? null,
  });
}

const toRow = (attempt) => ({
  id: attempt.id,
  quiz_id: attempt.quizId,
  status: attempt.status,
  percent: attempt.status === 'graded' ? attempt.percent : null,
  started_at: new Date(attempt.startedAt).toISOString(),
  updated_at: new Date(attempt.updatedAt ?? Date.now()).toISOString(),
  data: attempt,
});

export async function fetchAttempts(supabase) {
  const { data, error } = await supabase.from('attempts').select('data').order('started_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => row.data);
}

export async function upsertAttempts(supabase, attempts) {
  if (!attempts.length) return;
  const { error } = await supabase.from('attempts').upsert(attempts.map(toRow));
  if (error) throw error;
}

export async function deleteAttempts(supabase) {
  // Row level security limits this to the signed-in user's rows.
  const { error } = await supabase.from('attempts').delete().neq('id', '');
  if (error) throw error;
}
