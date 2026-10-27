// Compares answers by the numbers they contain, e.g. "A=(200,1)." and "A ( 200 ; 1 )" both give [200, 1].
// Shared by the build scripts (matching answers to options) and the browser (checking written answers).

const NUMBER = /-?\d+(?:\.\d+)?/g;

const GEORGIAN_COUNTS = {
  არცერთი: '0',
  ერთი: '1',
  ორი: '2',
  სამი: '3',
  ოთხი: '4',
  ხუთი: '5',
  ექვსი: '6',
};

// Papers often space out the sign, as in "y = 2x – 16.5"; keep it attached to the number.
const clean = (s) =>
  s
    .normalize('NFKC')
    .replace(/[−–]/g, '-')
    .replace(/-\s+(?=\d)/g, '-');
const canon = (list) => list.map((x) => String(Number(x)));
const numbersIn = (s) => canon(s.match(NUMBER) ?? []);

// Option text on the Georgian papers: a comma between digits is a decimal point.
export function optionNumbers(text) {
  const s = clean(text).trim().replace(/[\s;.,]+$/, '');
  if (GEORGIAN_COUNTS[s]) return [GEORGIAN_COUNTS[s]];
  return numbersIn(s.replace(/(?<=\d),(?=\d)/g, '.'));
}

// The English explanations: keep only the final value, before any "(option …)" or "equivalently …".
const answerCore = (answer) =>
  clean(answer)
    .split(/\((?:option|choice)|\bequivalently\b|\bi\.e\./)[0]
    .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[${}]/g, ' ')
    .replace(/(?<=\d),(?=\d{3}\b)/g, '');

export const answerNumbers = (answer) => numbersIn(answerCore(answer));

const UNITS =
  /\b(?:mm|cm|dm|km|m|kg|g|l|ml|h|min|s|hours?|minutes?|seconds?|days?|years?|degrees?|units?|square|cubic|percent|lari|values?|solutions?|ways?|points?|numbers?|times|and)\b/gi;

// True when the answer is just a number or a few numbers ("36.", "12 cm", "x=3"), so a typed answer can be
// compared with it. Formulas, sets and statements are not.
export function isNumericAnswer(answer) {
  // Powers, roots, π and intervals don't survive being reduced to a list of numbers.
  if (/\d[⁰¹²³⁴-⁹]|\^|√|π|∞|∪|\\(?:sqrt|pi|infty|cup)/.test(answer)) return false;
  const core = answerCore(answer)
    .replace(/^\s*[a-zA-Z]\s*=/, '')
    .replace(UNITS, ' ')
    .replace(/[\s.,;:()\-+/²³°%]/g, '');
  return /^\d+$/.test(core);
}

export const sameNumbers = (a, b) => a.length > 0 && a.length === b.length && a.every((x, i) => x === b[i]);

// A student may write either convention, so accept a match under either reading of commas.
export const writtenMatches = (text, expected) =>
  sameNumbers(optionNumbers(text), expected) || sameNumbers(numbersIn(clean(text)), expected);
