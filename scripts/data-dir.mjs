import path from 'node:path';

// The archive sits next to the projects folder by default; override with QUIZ_DATA_DIR.
export const quizDataDir = path.resolve(
  process.env.QUIZ_DATA_DIR ?? '../../komarovi_quizzes/quizzes_by_year_grade',
);
