// Builds the quiz index and per-quiz files the site reads from the Komarovi archive.
// Usage: QUIZ_DATA_DIR=/path/to/quizzes_by_year_grade node scripts/build-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { quizDataDir, quizId, readArchiveJson } from './archive.mjs';
import { answerNumbers, isNumericAnswer } from '../src/lib/numbers.js';

const outDir = path.resolve('public/data');

if (!fs.existsSync(path.join(quizDataDir, 'problem_catalog.json'))) {
  console.error(`Quiz archive not found at ${quizDataDir}. Set QUIZ_DATA_DIR.`);
  process.exit(1);
}

const problems = readArchiveJson('problem_catalog.json');
const explanations = readArchiveJson('explanation_catalog.json');
// Option letters found by scripts/build-keys.mjs.
const answerKeys = JSON.parse(fs.readFileSync('data/answer-keys.json', 'utf8'));

const explanationByProblem = new Map(
  explanations.map((e) => [`${quizId(e)}#${e.problem}`, e]),
);

const quizzes = new Map();
for (const p of problems) {
  if (p.subject !== 'Math' || p.answer_group !== 'Without answers') continue;
  const id = quizId(p);
  const e = explanationByProblem.get(`${id}#${p.problem}`);
  if (!e) continue;
  if (!quizzes.has(id)) {
    quizzes.set(id, {
      id,
      year: p.year,
      grade: p.grade,
      quiz: p.quiz,
      subject: p.subject,
      fullTest: p.full_test,
      problems: [],
    });
  }
  const key = answerKeys[id]?.[p.problem]?.key ?? null;
  const numbers = answerNumbers(e.answer);
  quizzes.get(id).problems.push({
    n: p.problem,
    file: p.file,
    // How the site checks this problem: by option letter, by the numbers in a written answer, or not at all.
    check: key ? 'letter' : isNumericAnswer(e.answer) ? 'value' : null,
    key,
    answerNumbers: key ? undefined : numbers,
    title: e.title,
    question: e.question,
    idea: e.idea,
    formulas: e.formulas,
    steps: e.steps,
    answer: e.answer,
    note: e.note,
    explanationFile: e.file,
  });
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'quiz'), { recursive: true });

const index = [];
for (const q of [...quizzes.values()].sort((a, b) => a.id.localeCompare(b.id))) {
  q.problems.sort((a, b) => a.n - b.n);
  fs.writeFileSync(path.join(outDir, 'quiz', `${q.id}.json`), JSON.stringify(q));
  index.push({
    id: q.id,
    year: q.year,
    grade: q.grade,
    quiz: q.quiz,
    subject: q.subject,
    problemCount: q.problems.length,
  });
}
fs.writeFileSync(path.join(outDir, 'quizzes.json'), JSON.stringify(index));

const checks = index.length && [...quizzes.values()].flatMap((q) => q.problems).reduce(
  (c, p) => ({ ...c, [p.check ?? 'unchecked']: (c[p.check ?? 'unchecked'] ?? 0) + 1 }),
  {},
);
console.log(`Wrote ${index.length} quizzes to ${path.relative(process.cwd(), outDir)}`, checks);
