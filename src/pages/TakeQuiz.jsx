import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import PdfView from '../components/PdfView.jsx';
import { loadQuiz, OPTION_LETTERS, quizLabel } from '../lib/data.js';
import { formatDuration, getAttempt, gradeAttempt, saveAttempt } from '../lib/attempts.js';

// Problems with a known answer letter get option bubbles; the rest take a typed answer.
function AnswerRow({ problem, response, onChange }) {
  const { n, check } = problem;
  const choice = response?.choice ?? '';
  return (
    <div className="answer-row">
      {check === 'letter' ? (
        <fieldset className="bubbles">
          <legend className="visually-hidden">Answer for problem {n}</legend>
          {OPTION_LETTERS.map((letter) => (
            <label key={letter} className="bubble">
              <input
                type="radio"
                name={`problem-${n}`}
                value={letter}
                checked={choice === letter}
                onChange={() => onChange({ choice: letter })}
              />
              <span>{letter}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <label className="written">
          <span className="written-label">
            {check === 'value' ? 'Type your answer' : 'Your answer (not scored automatically)'}
          </span>
          <input
            type="text"
            placeholder={check === 'value' ? 'e.g. 12 or -1/2' : 'Write your answer'}
            value={response?.text ?? ''}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        </label>
      )}
      {(choice || response?.text) && (
        <button type="button" className="link-button" onClick={() => onChange({})}>
          Clear
        </button>
      )}
    </div>
  );
}

export default function TakeQuiz() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(() => getAttempt(attemptId));
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const dialogRef = useRef(null);

  useEffect(() => {
    if (attempt) loadQuiz(attempt.quizId).then(setQuiz).catch(() => setError(true));
  }, [attempt?.quizId]);

  const finish = useCallback(() => {
    const graded = gradeAttempt(getAttempt(attemptId) ?? attempt, quiz.problems);
    navigate(`/results/${graded.id}`, { replace: true });
  }, [attemptId, attempt, quiz, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = attempt ? attempt.endsAt - now : 0;
  useEffect(() => {
    if (quiz && attempt?.status === 'in-progress' && remaining <= 0) finish();
  }, [quiz, attempt?.status, remaining, finish]);

  if (!attempt) {
    return (
      <section className="container page">
        <h1 className="page-title">Quiz not found</h1>
        <p className="lede">This attempt is not saved in this browser.</p>
        <Link className="btn" to="/mock-quiz">
          Set up a quiz
        </Link>
      </section>
    );
  }
  if (attempt.status !== 'in-progress') return <Navigate to={`/results/${attempt.id}`} replace />;

  const setResponse = (n, response) => {
    const next = { ...attempt, responses: { ...attempt.responses, [n]: response } };
    setAttempt(saveAttempt(next));
  };

  const isAnswered = (n) => {
    const r = attempt.responses[n];
    return Boolean(r?.choice || r?.text?.trim());
  };
  const answered = quiz ? quiz.problems.filter((p) => isAnswered(p.n)).length : 0;
  const lowTime = remaining < 5 * 60_000;

  return (
    <div className="quiz-page">
      <div className="quiz-bar">
        <div className="container quiz-bar-inner">
          <div>
            <p className="eyebrow">Mock quiz</p>
            <p className="quiz-bar-title">{quizLabel(attempt)}</p>
          </div>
          <p className={`timer${lowTime ? ' timer-low' : ''}`} role="timer" aria-label="Time remaining">
            {formatDuration(remaining)}
          </p>
          <p className="quiz-progress">
            {answered}/{quiz?.problems.length ?? '–'} answered
          </p>
          <button type="button" className="btn btn-small" disabled={!quiz} onClick={() => dialogRef.current.showModal()}>
            Submit
          </button>
        </div>
      </div>

      <div className="container quiz-layout">
        <div className="problems">
          {error && <p className="notice">This quiz could not be loaded.</p>}
          {!quiz && !error && <p>Loading problems…</p>}
          {quiz && (
            <p className="hint">
              Choose the letter you would circle on the paper. Where there are no letters to choose, type your answer.
              <a href={quiz.paper} target="_blank" rel="noreferrer">
                {' '}
                Open the full paper
              </a>
              .
            </p>
          )}
          {quiz?.problems.map((p) => (
            <article key={p.n} id={`problem-${p.n}`} className="problem-card">
              <header>
                <h2 className="problem-number">Problem {p.n}</h2>
              </header>
              <PdfView url={quiz.paper} regions={p.regions} label={`Problem ${p.n}`} />
              <AnswerRow problem={p} response={attempt.responses[p.n]} onChange={(r) => setResponse(p.n, r)} />
            </article>
          ))}
        </div>

        {quiz && (
          <nav className="navigator" aria-label="Problems">
            <p className="navigator-title">Jump to</p>
            <ol>
              {quiz.problems.map((p) => (
                <li key={p.n}>
                  <a href={`#problem-${p.n}`} className={isAnswered(p.n) ? 'is-answered' : ''}>
                    {p.n}
                    <span className="visually-hidden">{isAnswered(p.n) ? ', answered' : ', not answered'}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>

      <dialog ref={dialogRef} className="dialog" aria-labelledby="submit-title">
        <h2 id="submit-title">Submit your quiz?</h2>
        <p>
          You answered {answered} of {quiz?.problems.length} problems
          {quiz && answered < quiz.problems.length ? '. Blank problems count as incorrect.' : '.'}
        </p>
        <div className="actions">
          <button type="button" className="btn" onClick={finish}>
            Submit now
          </button>
          <button type="button" className="btn btn-plain" onClick={() => dialogRef.current.close()}>
            Keep writing
          </button>
        </div>
      </dialog>
    </div>
  );
}
