import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import MathText from '../components/MathText.jsx';
import PdfView from '../components/PdfView.jsx';
import { loadQuiz, quizLabel } from '../lib/data.js';
import { claimCorrect, formatDuration, getAttempt, gradeAttempt, SCORING_VERSION } from '../lib/attempts.js';

const yourAnswer = (r) =>
  [r?.choice && `Option ${r.choice}`, r?.text?.trim()].filter(Boolean).join(' · ') || 'No answer';

const STATUS = {
  true: { className: 'is-right', label: 'Correct', mark: '✓' },
  false: { className: 'is-wrong', label: 'Incorrect', mark: '✕' },
  null: { className: 'is-unscored', label: 'Not checked automatically', mark: '–' },
  claimed: { className: 'is-unscored', label: 'Marked correct by you', mark: '✓' },
};

function Explanation({ problem, paper }) {
  return (
    <div className="explanation-body">
      <h3>{problem.title}</h3>
      <div className="explanation-problem">
        <PdfView url={paper} regions={problem.regions} label={`Problem ${problem.n}`} />
      </div>
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
    </div>
  );
}

function ProblemRow({ problem, paper, response, mark, claimed, onClaim }) {
  const status = mark === null && claimed ? STATUS.claimed : STATUS[mark];
  return (
    <li className={`result-row ${status.className}`}>
      <details>
        <summary>
          <span className="result-mark" aria-hidden="true">
            {status.mark}
          </span>
          <span className="result-main">
            <span className="result-title">
              Problem {problem.n} <span className="visually-hidden">, {status.label}</span>
            </span>
            <span className="result-answers">
              <span>
                You: <strong>{yourAnswer(response)}</strong>
              </span>
              <span>
                Answer:{' '}
                <strong>
                  {problem.key && !/option|choice/.test(problem.answer) && `Option ${problem.key} · `}
                  <MathText text={problem.answer} />
                </strong>
              </span>
            </span>
          </span>
          <span className="result-toggle">Explanation</span>
        </summary>
        <Explanation problem={problem} paper={paper} />
      </details>
      {mark === null && (
        <label className="self-mark">
          <input type="checkbox" checked={Boolean(claimed)} onChange={(e) => onClaim(e.target.checked)} />
          <span>Not checked automatically. I got this one right</span>
        </label>
      )}
    </li>
  );
}

function Graded({ attempt, quiz, onChange }) {
  const unscored = attempt.total - attempt.scored;
  return (
    <>
      <div className="grade-panel">
        <div className="grade-badge" aria-hidden="true">
          {attempt.percent}%
        </div>
        <div>
          <p className="eyebrow">Your score</p>
          <p className="grade-score">
            {attempt.correct} / {attempt.total} correct
          </p>
          <p>
            {attempt.percent}% · time used {formatDuration(attempt.submittedAt - attempt.startedAt)} of{' '}
            {attempt.minutes} min
          </p>
          {unscored > 0 && (
            <p className="hint">
              {unscored} problem{unscored === 1 ? '' : 's'} can't be checked automatically. Compare your answer with the
              correct one below and tick the ones you got right to add them to your score.
            </p>
          )}
          <div className="actions">
            <Link className="btn btn-small" to={`/mock-quiz?year=${attempt.year}&grade=${attempt.grade}&quiz=${attempt.quizId}`}>
              Try again
            </Link>
            <Link className="btn btn-small btn-plain" to="/history">
              History
            </Link>
          </div>
        </div>
      </div>

      <section aria-labelledby="problems-title">
        <h2 id="problems-title" className="section-title">
          Problems
        </h2>
        <p>Open a problem to see its explanation.</p>
        <ol className="result-list">
          {quiz.problems.map((p) => (
            <ProblemRow
              key={p.n}
              problem={p}
              paper={quiz.paper}
              response={attempt.responses[p.n]}
              mark={attempt.marks[p.n]}
              claimed={attempt.claimed?.[p.n]}
              onClaim={(value) => onChange(claimCorrect(attempt, p.n, value))}
            />
          ))}
        </ol>
      </section>
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

  // Attempts saved by an older version of the scoring are scored again here.
  const needsGrading = attempt && quiz && attempt.status !== 'in-progress' && attempt.scoring !== SCORING_VERSION;
  useEffect(() => {
    if (needsGrading) setAttempt(gradeAttempt(attempt, quiz.problems));
  }, [needsGrading]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
      <p className="eyebrow">Results</p>
      <h1 className="page-title">{quizLabel(attempt)}</h1>
      {error && <p className="notice">This quiz could not be loaded.</p>}
      {(!quiz || needsGrading) && !error && <p>Loading…</p>}
      {quiz && !needsGrading && <Graded attempt={attempt} quiz={quiz} onChange={setAttempt} />}
    </section>
  );
}
