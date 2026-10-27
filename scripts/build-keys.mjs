// Builds data/answer-keys.json: the correct option letter for every problem where it can be found.
// Slow (it reads every Math paper), so its output is committed and only rebuilt when the archive changes.
// Usage: QUIZ_DATA_DIR=/path/to/quizzes_by_year_grade node scripts/build-keys.mjs
//
// Sources, in order of trust:
//   explanation  - the checked English explanation names the option letter
//   answer-sheet - the answered paper prints the correct option's letter in red
//   matched      - exactly one option on the unanswered paper has the explanation's final value
// When answer-sheet and matched disagree, the problem is left without a key.
import fs from 'node:fs';
import path from 'node:path';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { quizDataDir, quizId, readArchiveJson } from './archive.mjs';
import { answerNumbers, optionNumbers, sameNumbers } from '../src/lib/numbers.js';

const SHOW_TEXT = OPS.showText;
const SET_RGB = OPS.setFillRGBColor;
const OTHER_FILLS = new Set(
  ['setFillColorSpace', 'setFillColor', 'setFillColorN', 'setFillGray', 'setFillCMYKColor', 'setFillTransparent'].map(
    (name) => OPS[name],
  ),
);
// A printed problem number such as "7." (not a decimal like "1.25" or "2,5").
const PROBLEM_NUMBER = /(?:^|[^\d.,])(\d{1,2})\s*\.(?![\d,])/g;
const LEADING_LETTER = /^\s*([ა-ვ])\s*\)/;
const LONE_LETTER = /^\s*([ა-ვ])\s*$/;

const isRed = (rgb) => rgb.length === 3 && rgb[0] > 150 && rgb[1] < 110 && rgb[2] < 110;

// Papers typed in the old Georgian fonts (AcadNusx and similar) store ა ბ გ დ ე ვ as À Á Â Ã Ä Å.
const LEGACY_LETTERS = /[À-Å]/g;
const fromLegacyFont = (text) => text.replace(LEGACY_LETTERS, (c) => 'აბგდევ'[c.charCodeAt(0) - 0xc0]);

// Text runs of a PDF in drawing order, with whether each was filled red.
async function readRuns(file) {
  const doc = await getDocument({ url: file, verbosity: 0 }).promise;
  const runs = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const ops = await (await doc.getPage(p)).getOperatorList();
    let red = false;
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];
      if (fn === SET_RGB) red = isRed(Array.from(args.length === 3 ? args : (args[0] ?? [])));
      else if (OTHER_FILLS.has(fn)) red = false;
      if (fn !== SHOW_TEXT) continue;
      const text = fromLegacyFont(
        args[0].map((g) => g?.unicode ?? (typeof g === 'number' && g < -200 ? ' ' : '')).join(''),
      );
      if (text.trim()) runs.push({ text, red });
    }
  }
  await doc.destroy();
  return runs;
}

// Problems are numbered in sequence; accept a number only if it is shortly after the current one.
function nextProblem(text, current, onNumber) {
  let n = current;
  for (const m of text.matchAll(PROBLEM_NUMBER)) {
    const candidate = Number(m[1]);
    if (candidate > n && candidate <= n + 3) {
      onNumber?.(candidate, m.index, m.index + m[0].length);
      n = candidate;
    }
  }
  return n;
}

function redLetters(runs) {
  const found = {};
  let current = 0;
  runs.forEach((run, i) => {
    if (!run.red) {
      current = nextProblem(run.text, current);
      return;
    }
    if (runs[i - 1]?.red) return; // only the start of a red run names the answer
    const lead = LEADING_LETTER.exec(run.text);
    const lone = LONE_LETTER.exec(run.text);
    const letter = lead?.[1] ?? (lone && /^\s*\)/.test(runs[i + 1]?.text ?? '') ? lone[1] : null);
    if (letter) (found[current] ??= new Set()).add(letter);
  });
  return Object.fromEntries(
    Object.entries(found).filter(([, letters]) => letters.size === 1).map(([n, letters]) => [n, [...letters][0]]),
  );
}

function optionsByProblem(runs) {
  const text = {};
  let current = 0;
  for (const { text: run } of runs) {
    let from = 0;
    current = nextProblem(run, current, (n, start, end) => {
      text[current] = (text[current] ?? '') + ' ' + run.slice(from, start);
      from = end;
    });
    text[current] = (text[current] ?? '') + ' ' + run.slice(from);
  }
  const options = {};
  for (const [n, t] of Object.entries(text)) {
    const parts = [...t.matchAll(/([ა-ვ])\s*\)\s*([\s\S]*?)(?=[ა-ვ]\s*\)|$)/g)].map((m) => [m[1], m[2]]);
    if (parts.length >= 3) options[n] = parts;
  }
  return options;
}

async function runsOrNull(file) {
  try {
    const runs = await readRuns(path.join(quizDataDir, file));
    return runs.length >= 20 ? runs : null; // scanned pages have no usable text
  } catch {
    return null;
  }
}

const catalog = readArchiveJson('catalog.json').filter((c) => c.subject === 'Math');
const explanations = readArchiveJson('explanation_catalog.json');
const letterInExplanation = /(?:option|choice)\s*\(?([ა-ჰ])\)?/g;

const sheetKeys = {};
const options = {};
for (const [i, c] of catalog.entries()) {
  if (i % 100 === 0) console.log(`Reading papers ${i + 1}/${catalog.length}`);
  const runs = await runsOrNull(c.file);
  if (!runs) continue;
  if (c.answer_group === 'Answers') sheetKeys[quizId(c)] = redLetters(runs);
  else options[quizId(c)] = optionsByProblem(runs);
}

const keys = {};
const counts = { explanation: 0, 'answer-sheet': 0, matched: 0, conflict: 0, none: 0 };
for (const e of explanations) {
  const id = quizId(e);
  const named = new Set([...e.answer.matchAll(letterInExplanation)].map((m) => m[1]));
  const sheet = sheetKeys[id]?.[e.problem];
  const expected = answerNumbers(e.answer);
  const hits = new Set(
    (options[id]?.[e.problem] ?? []).filter(([, t]) => sameNumbers(optionNumbers(t), expected)).map(([l]) => l),
  );
  const matched = hits.size === 1 ? [...hits][0] : null;

  let entry = null;
  if (named.size === 1) entry = { key: [...named][0], source: 'explanation' };
  else if (sheet && matched && sheet !== matched) counts.conflict++;
  else if (sheet) entry = { key: sheet, source: 'answer-sheet' };
  else if (matched) entry = { key: matched, source: 'matched' };

  if (entry) {
    (keys[id] ??= {})[e.problem] = entry;
    counts[entry.source]++;
  } else counts.none++;
}

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/answer-keys.json', JSON.stringify(keys, null, 0));
console.log('Answer keys:', counts);
