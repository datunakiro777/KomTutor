import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import MathText from '../components/MathText.jsx';
import PdfView from '../components/PdfView.jsx';
import { archiveUrl, loadQuiz, quizLabel } from '../lib/data.js';
import { autoMark, formatDuration, getAttempt, gradeAttempt, saveAttempt } from '../lib/attempts.js';

const yourAnswer = (r) =>
  [r?.choice && `Option ${r.choice}`, r?.text?.trim()].filter(Boolean).join(' · ') || 'No answer';

function MarkRow({ problem, response, mark, onMark }) {
  const auto = autoMark(problem, response);
  return (
    <li className={`mark-row${mark === true ? ' is-right' : mark === false ? ' is-wrong' : ''}`}>
      <div className="mark-head">
        <h3 className="problem-number">Problem {problem.n}</h3>
        {auto !== null && <span className="tag">{response?.choice || response?.text ? 'Checked automatically' : 'Left blank'}</span>}
      </div>
      <dl className="mark-answers">
        <div>
          <dt>Your answer</dt>
          <dd>{yourAnswer(response)}</dd>
        </div>
        <div>
          <dt>Correct answer</dt>
          <dd>
            <MathText text={problem.answer} />
          </dd>
        </div>
      </dl>
      <details className="disclosure">
        <summary>Show problem</summary>
        <PdfView url={archiveUrl(problem.file)} label={`Problem ${problem.n}`} />
      </details>
      <fieldset className="mark-choice">
        <legend>Did you get it right?</legend>
        <label className="chip">
          <input type="radio" name={`mark-${problem.n}`} checked={mark === true} onChange={() => onMark(true)} />
          <span>Correct</span>
        </label>
        <label className="chip chip-wrong">
          <input type="radio" name={`mark-${problem.n}`} checked={mark === false} onChange={() => onMark(false)} />
          <span>Incorrect</span>
        </label>
      </fieldset>
    </li>
  );
}

function Marking({ attempt, quiz, onChange }) {
  const pending = quiz.problems.filter((p) => typeof attempt.marks[p.n] !== 'boolean').length;
  const setMark = (n, value) => onChange(saveAttempt({ ...attempt, marks: { ...attempt.marks, [n]: value } }));

  return (
    <>
      <p className="lede">
        Problems with a known answer letter are checked for you. Compare the rest with the correct answer and mark
        them yourself.
      </p>
      <ol className="mark-list">
        {quiz.problems.map((p) => (
          <MarkRow
            key={p.n}
            problem={p}
            response={attempt.responses[p.n]}
            mark={attempt.marks[p.n]}
            onMark={(v) => setMark(p.n, v)}
          />
        ))}
      </ol>
      <div className="setup-summary sticky-summary">
        <p>{pending ? `${pending} problem${pending === 1 ? '' : 's'} left to mark` : 'All problems marked.'}</p>
        <button type="button" className="btn" disabled={pending > 0} onClick={() => onChange(gradeAttempt(attempt))}>
          See my grade
        </button>
      </div>
    </>
  );
}

function Explanation({ problem, correct }) {
  return (
    <article className="explanation" id={`explanation-${problem.n}`}>
      <header>
        <p className="eyebrow">
          Problem {problem.n} · {correct ? 'You got this right' : 'You got this wrong'}
        </p>
        <h3>{problem.title}</h3>
      </header>
      <MathText as="p" className="explanation-question" text={problem.question} />
      {problem.idea && (
        <p>
          <strong>Idea: </strong>
          <MathText text={problem.idea} />
        </p>
      )}
      {problem.formulas?.length > 0 && (
        <>
          <h4>Formulas used</h4>
          <ul>
            {problem.formulas.map((f, i) => (
              <MathText key={i} as="li" text={f} />
            ))}
          </ul>
        </>
      )}
      <h4>Steps</h4>
      <ol className="explanation-steps">
        {problem.steps.map((s, i) => (
          <MathText key={i} as="li" text={s} />
        ))}
      </ol>
      <p className="explanation-answer">
        <strong>Answer: </strong>
        <MathText text={problem.answer} />
      </p>
      {problem.note && (
        <p className="hint">
          <strong>Note: </strong>
          <MathText text={problem.note} />
        </p>
      )}
      <p className="explanation-links">
        <a href={archiveUrl(problem.file)} target="_blank" rel="noreferrer">
          Problem PDF
        </a>
        <a href={archiveUrl(problem.explanationFile)} target="_blank" rel="noreferrer">
          Explanation PDF
        </a>
      </p>
    </article>
  );
}

function Graded({ attempt, quiz, onEditMarks }) {
  const wrong = useMemo(() => quiz.problems.filter((p) => !attempt.marks[p.n]).map((p) => p.n), [quiz, attempt]);
  const [picked, setPicked] = useState(() => new Set(wrong));
  const [shown, setShown] = useState([]);

  const toggle = (n) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const show = () => {
    setShown(quiz.problems.filter((p) => picked.has(p.n)).map((p) => p.n));
    requestAnimationFrame(() => document.getElementById('explanations')?.focus());
  };

  return (
    <>
      <div className="grade-panel">
        <div className="grade-badge" aria-hidden="true">
          {attempt.percent}%
        </div>
        <div>
          <p className="eyebrow">Your grade</p>
          <p className="grade-score">
            {attempt.correct} / {attempt.total} correct
          </p>
          <p>
            {attempt.percent}% · time used {formatDuration(attempt.submittedAt - attempt.startedAt)} of{' '}
            {attempt.minutes} min
          </p>
          <div className="actions">
            <Link className="btn btn-small" to={`/mock-quiz?year=${attempt.year}&grade=${attempt.grade}&quiz=${attempt.quizId}`}>
              Try again
            </Link>
            <button type="button" className="btn btn-small btn-plain" onClick={onEditMarks}>
              Change marks
            </button>
          </div>
        </div>
      </div>

      <div className="book section">
        <span className="book-tab">Explanations</span>
        <h2 className="section-title">Which explanations do you want to see?</h2>
        <p>Problems you got wrong are selected to start with.</p>
        <div className="quick-select">
          <button type="button" className="link-button" onClick={() => setPicked(new Set(wrong))}>
            Wrong ones
          </button>
          <button type="button" className="link-button" onClick={() => setPicked(new Set(quiz.problems.map((p) => p.n)))}>
            All
          </button>
          <button type="button" className="link-button" onClick={() => setPicked(new Set())}>
            None
          </button>
        </div>
        <fieldset className="pick-grid">
          <legend className="visually-hidden">Problems</legend>
          {quiz.problems.map((p) => (
            <label key={p.n} className={`pick${attempt.marks[p.n] ? ' is-right' : ' is-wrong'}`}>
              <input type="checkbox" checked={picked.has(p.n)} onChange={() => toggle(p.n)} />
              <span>
                {p.n}
                <span className="visually-hidden">{attempt.marks[p.n] ? ', correct' : ', incorrect'}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="legend-row">
          <span className="key key-right" aria-hidden="true" /> Correct <span className="key key-wrong" aria-hidden="true" /> Incorrect
        </p>
        <button type="button" className="btn" disabled={picked.size === 0} onClick={show}>
          Show {picked.size} explanation{picked.size === 1 ? '' : 's'}
        </button>
      </div>

      {shown.length > 0 && (
        <section id="explanations" tabIndex={-1} className="explanations" aria-label="Explanations">
          {quiz.problems
            .filter((p) => shown.includes(p.n))
            .map((p) => (
              <Explanation key={p.n} problem={p} correct={attempt.marks[p.n]} />
            ))}
        </section>
      )}
    </>
  );
}

export default function Results() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(() => getAttempt(attemptId));
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (attempt) loadQuiz(attempt.quizId).then(setQuiz).catch(() => setError(true));
  }, [attempt?.quizId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [attempt?.status]);

  if (!attempt) {
    return (
      <section className="container page">
        <h1 className="page-title">Result not found</h1>
        <p className="lede">This attempt is not saved in this browser.</p>
        <Link className="btn" to="/history">
          Go to history
        </Link>
      </section>
    );
  }
  if (attempt.status === 'in-progress') return <Navigate to={`/mock-quiz/${attempt.id}`} replace />;

  return (
    <section className="container page">
      <p className="eyebrow">{attempt.status === 'graded' ? 'Results' : 'Check your answers'}</p>
      <h1 className="page-title">{quizLabel(attempt)}</h1>
      {error && <p className="notice">This quiz could not be loaded.</p>}
      {!quiz && !error && <p>Loading…</p>}
      {quiz && attempt.status === 'submitted' && <Marking attempt={attempt} quiz={quiz} onChange={setAttempt} />}
      {quiz && attempt.status === 'graded' && (
        <Graded
          attempt={attempt}
          quiz={quiz}
          onEditMarks={() => setAttempt(saveAttempt({ ...attempt, status: 'submitted' }))}
        />
      )}
    </section>
  );
}
