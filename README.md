# KomTutor

Timed mock quizzes from past Komarovi math papers (variant 1), with grading, history and step-by-step explanations.

## Pages

- **Home** (`/`): intro and links.
- **Mock quiz** (`/mock-quiz`): pick a school year, grade, quiz and time limit. The quiz shows each problem from the original paper with an answer sheet (ა–ვ or a written answer) and submits itself when time runs out.
- **Results** (`/results/:id`): problems whose answer key names an option letter are marked automatically; the rest are marked by the student against the correct answer. Then the grade is shown and the student picks which explanations to open.
- **History** (`/history`): every attempt with its grade, plus average, best and recent grades.

Attempts are stored in the browser's `localStorage`.

## Running it

The site reads the quiz archive (`quizzes_by_year_grade`) from `../../komarovi_quizzes/quizzes_by_year_grade` by default. Point it elsewhere with `QUIZ_DATA_DIR`.

```bash
npm install
npm run dev
```

`npm run dev` first runs `npm run data`, which builds `public/data/` (the quiz index and one JSON file per quiz) from `problem_catalog.json` and `explanation_catalog.json`. Problem and explanation PDFs are served straight from the archive at `/archive/*` by a small Vite plugin, so the 9 GB folder is never copied. That also means `npm run build` output needs the archive mounted at `/archive/` by whatever serves it (`npm run preview` does this).
