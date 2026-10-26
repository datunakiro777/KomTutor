// Builds the quiz index and per-quiz files the site reads from the Komarovi archive.
// Usage: QUIZ_DATA_DIR=/path/to/quizzes_by_year_grade node scripts/build-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { quizDataDir } from './data-dir.mjs';

const outDir = path.resolve('public/data');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(quizDataDir, name), 'utf8'));

if (!fs.existsSync(path.join(quizDataDir, 'problem_catalog.json'))) {
  console.error(`Quiz archive not found at ${quizDataDir}. Set QUIZ_DATA_DIR.`);
  process.exit(1);
}

const problems = readJson('problem_catalog.json');
const explanations = readJson('explanation_catalog.json');

const quizId = ({ year, grade, quiz }) =>
  `${year}_g${String(grade).padStart(2, '0')}_${quiz.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

// Only answers that name exactly one Georgian option letter can be marked automatically.
const keyPattern = /(?:option|choice)\s*\(?([ა-ჰ])\)?/g;
const answerKey = (answer) => {
  const letters = new Set([...answer.matchAll(keyPattern)].map((m) => m[1]));
  return letters.size === 1 ? [...letters][0] : null;
};

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
  quizzes.get(id).problems.push({
    n: p.problem,
    file: p.file,
    key: answerKey(e.answer),
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
    autoMarked: q.problems.filter((p) => p.key).length,
  });
}
fs.writeFileSync(path.join(outDir, 'quizzes.json'), JSON.stringify(index));

console.log(`Wrote ${index.length} quizzes to ${path.relative(process.cwd(), outDir)}`);
