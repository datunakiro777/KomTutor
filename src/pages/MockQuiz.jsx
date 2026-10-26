import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { loadQuizIndex, quizLabel } from '../lib/data.js';
import { createAttempt, listAttempts } from '../lib/attempts.js';

const TIME_PRESETS = [15, 30, 45, 60, 90];

function ChoiceGroup({ step, legend, name, options, value, onChange, children }) {
  return (
    <fieldset className="setup-step">
      <legend>
        <span className="step-number" aria-hidden="true">
          {step}
        </span>
        {legend}
      </legend>
      <div className="chips">
        {options.map((opt) => (
          <label key={opt.value} className="chip">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={String(value) === String(opt.value)}
              onChange={() => onChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      {children}
    </fieldset>
  );
}

export default function MockQuiz() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState(false);
  const [minutes, setMinutes] = useState(45);
  const [customMinutes, setCustomMinutes] = useState('');

  const year = params.get('year') ?? '';
  const grade = params.get('grade') ?? '';
  const quizId = params.get('quiz') ?? '';

  useEffect(() => {
    loadQuizIndex().then(setQuizzes).catch(() => setError(true));
  }, []);

  const inProgress = useMemo(
    () => listAttempts().filter((a) => a.status === 'in-progress' && a.endsAt > Date.now()),
    [],
  );

  const years = useMemo(() => [...new Set((quizzes ?? []).map((q) => q.year))].sort().reverse(), [quizzes]);
  const grades = useMemo(
    () =>
      [...new Set((quizzes ?? []).filter((q) => q.year === year).map((q) => q.grade))].sort((a, b) => a - b),
    [quizzes, year],
  );
  const quizOptions = useMemo(
    () => (quizzes ?? []).filter((q) => q.year === year && String(q.grade) === grade),
    [quizzes, year, grade],
  );
  const selected = quizOptions.find((q) => q.id === quizId);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  const custom = Number(customMinutes);
  const customValid = customMinutes === '' || (Number.isInteger(custom) && custom >= 1 && custom <= 300);
  const chosenMinutes = customMinutes !== '' ? custom : minutes;
  const canStart = selected && customValid && chosenMinutes > 0;

  const start = () => {
    const attempt = createAttempt(selected, chosenMinutes);
    navigate(`/mock-quiz/${attempt.id}`);
  };

  return (
    <section className="container page">
      <p className="eyebrow">Mock quiz</p>
      <h1 className="page-title">Set up your quiz</h1>
      <p className="lede">Pick a school year, grade and quiz, then choose how long you want to write it.</p>

      {inProgress.length > 0 && (
        <div className="notice">
          <p>
            <strong>You have a quiz in progress:</strong> {quizLabel(inProgress[0])}
          </p>
          <Link className="btn btn-small" to={`/mock-quiz/${inProgress[0].id}`}>
            Resume
          </Link>
        </div>
      )}

      {error && <p className="notice">The quiz list could not be loaded. Run <code>npm run data</code> and reload.</p>}
      {!quizzes && !error && <p>Loading quizzes…</p>}

      {quizzes && (
        <div className="book setup">
          <span className="book-tab">Your quiz</span>

          <ChoiceGroup
            step={1}
            legend="School year"
            name="year"
            value={year}
            options={years.map((y) => ({ value: y, label: y }))}
            onChange={(v) => update({ year: v, grade: null, quiz: null })}
          />

          <ChoiceGroup
            step={2}
            legend="Grade"
            name="grade"
            value={grade}
            options={grades.map((g) => ({ value: g, label: `Grade ${g}` }))}
            onChange={(v) => update({ grade: v, quiz: null })}
          >
            {!year && <p className="hint">Choose a school year first.</p>}
          </ChoiceGroup>

          <fieldset className="setup-step">
            <legend>
              <span className="step-number" aria-hidden="true">
                3
              </span>
              Quiz
            </legend>
            {!grade && <p className="hint">Choose a grade first.</p>}
            <div className="tickets">
              {quizOptions.map((q) => (
                <label key={q.id} className="ticket">
                  <input
                    type="radio"
                    name="quiz"
                    value={q.id}
                    checked={quizId === q.id}
                    onChange={() => update({ quiz: q.id })}
                  />
                  <span className="ticket-choice">{q.quiz}</span>
                  <span className="ticket-details">
                    {q.problemCount} problems
                    <small>{q.subject}</small>
                  </span>
                  <span className="ticket-action" aria-hidden="true">
                    {quizId === q.id ? 'Selected' : 'Select'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <ChoiceGroup
            step={4}
            legend="Time limit"
            name="minutes"
            value={customMinutes === '' ? minutes : ''}
            options={TIME_PRESETS.map((m) => ({ value: m, label: `${m} min` }))}
            onChange={(v) => {
              setMinutes(Number(v));
              setCustomMinutes('');
            }}
          >
            <div className="custom-time">
              <label htmlFor="custom-minutes">Or enter minutes</label>
              <input
                id="custom-minutes"
                type="number"
                inputMode="numeric"
                min="1"
                max="300"
                placeholder="e.g. 40"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                aria-invalid={!customValid}
                aria-describedby="custom-minutes-hint"
              />
              <span id="custom-minutes-hint" className="hint">
                {customValid ? 'Between 1 and 300.' : 'Enter a whole number between 1 and 300.'}
              </span>
            </div>
          </ChoiceGroup>

          <div className="setup-summary">
            <p>
              {selected ? (
                <>
                  <strong>{quizLabel(selected)}</strong> · {selected.problemCount} problems ·{' '}
                  {customValid ? `${chosenMinutes} minutes` : 'check the time'}
                </>
              ) : (
                'Choose a quiz to begin.'
              )}
            </p>
            <button type="button" className="btn" disabled={!canStart} onClick={start}>
              Start quiz
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
