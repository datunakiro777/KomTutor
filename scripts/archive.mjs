import fs from 'node:fs';
import path from 'node:path';

// The archive sits next to the projects folder by default; override with QUIZ_DATA_DIR.
export const quizDataDir = path.resolve(
  process.env.QUIZ_DATA_DIR ?? '../../komarovi_quizzes/quizzes_by_year_grade',
);

export const readArchiveJson = (name) => JSON.parse(fs.readFileSync(path.join(quizDataDir, name), 'utf8'));

export const quizId = ({ year, grade, quiz }) =>
  `${year}_g${String(grade).padStart(2, '0')}_${quiz.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
