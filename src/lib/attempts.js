import { writtenMatches } from './numbers.js';

// Attempts are kept in localStorage per signed-in user, so a refresh mid-quiz keeps the clock and
// answers, and every save is also sent to Supabase (see components/Account.jsx) so they follow the
// user to other devices.
const LEGACY_KEY = 'komtutor.attempts.v1';
let storageKey = LEGACY_KEY;
let remote = null;

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? {};
  } catch {
    return {};
  }
}

const readAll = () => read(storageKey);

function writeAll(attempts) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(attempts));
  } catch {
    // Storage can be full or blocked; the current page still works from memory.
  }
}

// Switches the store to this user. `sink` receives every saved attempt and the clear-all request.
// Attempts written before accounts existed (one shared key) are taken over by the first user to sign in.
export function switchAttemptStore(userId, sink) {
  storageKey = `${LEGACY_KEY}.${userId}`;
  remote = sink;
  const legacy = read(LEGACY_KEY);
  if (Object.keys(legacy).length) {
    writeAll({ ...legacy, ...readAll() });
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // Leaving the old copy behind is harmless.
    }
  }
}

// Combines attempts from Supabase with the local copy, keeping whichever was saved last.
// Returns the local attempts that are newer than (or missing from) Supabase, to be uploaded.
export function mergeRemoteAttempts(remoteAttempts) {
  const all = readAll();
  const remoteById = new Map(remoteAttempts.map((a) => [a.id, a]));
  for (const a of remoteAttempts) {
    if (!all[a.id] || (all[a.id].updatedAt ?? 0) < (a.updatedAt ?? 0)) all[a.id] = a;
  }
  writeAll(all);
  return Object.values(all).filter((a) => (remoteById.get(a.id)?.updatedAt ?? -1) < (a.updatedAt ?? 0));
}

export function listAttempts() {
  return Object.values(readAll()).sort((a, b) => b.startedAt - a.startedAt);
}

export function getAttempt(id) {
  return readAll()[id] ?? null;
}

export function saveAttempt(attempt) {
  const saved = { ...attempt, updatedAt: Date.now() };
  const all = readAll();
  all[saved.id] = saved;
  writeAll(all);
  remote?.save(saved);
  return saved;
}

export function deleteAllAttempts() {
  writeAll({});
  remote?.clear();
}

export function createAttempt(quiz, minutes) {
  const now = Date.now();
  return saveAttempt({
    id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    quizId: quiz.id,
    year: quiz.year,
    grade: quiz.grade,
    quiz: quiz.quiz,
    minutes,
    startedAt: now,
    endsAt: now + minutes * 60_000,
    status: 'in-progress',
    responses: {},
    marks: {},
  });
}

// true/false for problems the site can score, null for the ones it can't (see build-data's `check`).
export function checkResponse(problem, response) {
  if (problem.check === 'letter') return Boolean(response?.choice) && response.choice === problem.key;
  if (problem.check === 'value') {
    const text = response?.text?.trim();
    return Boolean(text) && writtenMatches(text, problem.answerNumbers);
  }
  return null;
}

// Bumped when the way scores are worked out changes, so older saved attempts are scored again.
export const SCORING_VERSION = 2;

// The score is out of every problem. Problems the site can't check count only if the student
// says they got them right (`claimed`).
function withScore(attempt) {
  const autoCorrect = Object.values(attempt.marks).filter((m) => m === true).length;
  const claimedCorrect = Object.entries(attempt.claimed ?? {}).filter(
    ([n, value]) => value && attempt.marks[n] === null,
  ).length;
  const correct = autoCorrect + claimedCorrect;
  return { ...attempt, correct, percent: Math.round((correct / attempt.total) * 100) };
}

export function gradeAttempt(attempt, problems) {
  const marks = {};
  for (const p of problems) marks[p.n] = checkResponse(p, attempt.responses[p.n]);
  return saveAttempt(
    withScore({
      ...attempt,
      status: 'graded',
      scoring: SCORING_VERSION,
      submittedAt: attempt.submittedAt ?? Math.min(Date.now(), attempt.endsAt),
      marks,
      claimed: attempt.claimed ?? {},
      total: problems.length,
      scored: Object.values(marks).filter((m) => m !== null).length,
    }),
  );
}

export function claimCorrect(attempt, n, value) {
  return saveAttempt(withScore({ ...attempt, claimed: { ...attempt.claimed, [n]: value } }));
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
