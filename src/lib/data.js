const cache = new Map();

function fetchJson(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`Could not load ${url}`);
        return res.json();
      }),
    );
  }
  return cache.get(url);
}

export const loadQuizIndex = () => fetchJson('/data/quizzes.json');
export const loadQuiz = (id) => fetchJson(`/data/quiz/${id}.json`);

export const quizLabel = (q) => `${q.year} · Grade ${q.grade} · ${q.quiz}`;

// Georgian answer letters in the order they appear on the papers.
export const OPTION_LETTERS = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ'];
