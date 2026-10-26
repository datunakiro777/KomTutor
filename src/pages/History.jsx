import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteAllAttempts, formatDuration, listAttempts } from '../lib/attempts.js';
import { quizLabel } from '../lib/data.js';

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

const STATUS = {
  'in-progress': { label: 'In progress', action: 'Resume', to: (a) => `/mock-quiz/${a.id}` },
  submitted: { label: 'Needs marking', action: 'Finish marking', to: (a) => `/results/${a.id}` },
  graded: { label: 'Graded', action: 'Review', to: (a) => `/results/${a.id}` },
};

export default function History() {
  const [attempts, setAttempts] = useState(() => listAttempts());
  const graded = attempts.filter((a) => a.status === 'graded');
  const recent = graded.slice(0, 12).reverse();
  const average = graded.length ? Math.round(graded.reduce((s, a) => s + a.percent, 0) / graded.length) : null;
  const best = graded.length ? Math.max(...graded.map((a) => a.percent)) : null;

  const clear = () => {
    if (window.confirm('Delete all saved attempts from this browser?')) {
      deleteAllAttempts();
      setAttempts([]);
    }
  };

  return (
    <section className="container page">
      <p className="eyebrow">History</p>
      <h1 className="page-title">Your performance</h1>

      {attempts.length === 0 ? (
        <div className="book">
          <span className="book-tab">No attempts yet</span>
          <p className="lede">Write a mock quiz and your grades will show up here.</p>
          <Link className="btn" to="/mock-quiz">
            Start a mock quiz
          </Link>
        </div>
      ) : (
        <>
          <dl className="fact-strip">
            <div>
              <dt>Quizzes graded</dt>
              <dd>{graded.length}</dd>
            </div>
            <div>
              <dt>Average</dt>
              <dd>{average === null ? '–' : `${average}%`}</dd>
            </div>
            <div>
              <dt>Best</dt>
              <dd>{best === null ? '–' : `${best}%`}</dd>
            </div>
            <div>
              <dt>Latest</dt>
              <dd>{graded[0] ? `${graded[0].percent}%` : '–'}</dd>
            </div>
          </dl>

          {recent.length > 1 && (
            <div className="book section">
              <span className="book-tab">Recent grades</span>
              <ol className="bars" aria-label="Grades of your recent quizzes, oldest first">
                {recent.map((a) => (
                  <li key={a.id}>
                    <span className="bar-value">{a.percent}%</span>
                    <span className="bar-track" aria-hidden="true">
                      <span className="bar" style={{ height: `${Math.max(a.percent, 3)}%` }} />
                    </span>
                    <span className="bar-label">
                      G{a.grade} {a.quiz.replace('Quiz ', 'Q')}
                      <span className="visually-hidden">, {a.year}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <ul className="attempt-list section">
            {attempts.map((a) => {
              const status = STATUS[a.status];
              return (
                <li key={a.id} className="ticket attempt">
                  <span className="ticket-choice">{a.status === 'graded' ? `${a.percent}%` : '—'}</span>
                  <span className="ticket-details">
                    {quizLabel(a)}
                    <small>
                      {dateFormat.format(a.startedAt)} · {status.label}
                      {a.status === 'graded' &&
                        ` · ${a.correct}/${a.total} · ${formatDuration(a.submittedAt - a.startedAt)} of ${a.minutes} min`}
                    </small>
                  </span>
                  <Link className="btn btn-small" to={status.to(a)}>
                    {status.action}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button type="button" className="link-button" onClick={clear}>
            Clear history
          </button>
        </>
      )}
    </section>
  );
}
