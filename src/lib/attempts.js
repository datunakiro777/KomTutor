// Attempts live in localStorage so a refresh mid-quiz keeps the clock and answers.
const STORAGE_KEY = 'komtutor.attempts.v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeAll(attempts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    // Storage can be full or blocked; the current page still works from memory.
  }
}

export function listAttempts() {
  return Object.values(readAll()).sort((a, b) => b.startedAt - a.startedAt);
}

export function getAttempt(id) {
  return readAll()[id] ?? null;
}

export function saveAttempt(attempt) {
  const all = readAll();
  all[attempt.id] = attempt;
  writeAll(all);
  return attempt;
}

export function deleteAllAttempts() {
  writeAll({});
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

const isBlank = (r) => !r || (!r.choice && !r.text?.trim());

// true/false when the answer can be judged without the student, otherwise null.
export function autoMark(problem, response) {
  if (isBlank(response)) return false;
  if (problem.key && response.choice) return response.choice === problem.key;
  return null;
}

export function submitAttempt(attempt, problems) {
  const marks = {};
  for (const p of problems) marks[p.n] = autoMark(p, attempt.responses[p.n]);
  return saveAttempt({
    ...attempt,
    status: 'submitted',
    submittedAt: Math.min(Date.now(), attempt.endsAt),
    total: problems.length,
    marks,
  });
}

export function gradeAttempt(attempt) {
  const correct = Object.values(attempt.marks).filter((m) => m === true).length;
  return saveAttempt({
    ...attempt,
    status: 'graded',
    correct,
    percent: Math.round((correct / attempt.total) * 100),
  });
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
