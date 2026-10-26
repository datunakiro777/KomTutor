import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroShapes, Confetti } from '../components/Shapes.jsx';
import { loadQuizIndex } from '../lib/data.js';

const STEPS = [
  { title: 'Pick a quiz', text: 'Choose the school year, grade and quiz you want to practise.', shape: 'circle' },
  { title: 'Set your time', text: 'Give yourself the time you want. The quiz is submitted when the clock runs out.', shape: 'square' },
  { title: 'See your grade', text: 'Check each answer, get your score, then open the explanations you need.', shape: 'arch' },
];

export default function Home() {
  const [facts, setFacts] = useState(null);

  useEffect(() => {
    loadQuizIndex()
      .then((quizzes) =>
        setFacts({
          quizzes: quizzes.length,
          years: new Set(quizzes.map((q) => q.year)).size,
          grades: new Set(quizzes.map((q) => q.grade)).size,
          problems: quizzes.reduce((sum, q) => sum + q.problemCount, 0),
        }),
      )
      .catch(() => setFacts(null));
  }, []);

  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <p className="eyebrow">Komarovi math practice</p>
          <h1 className="hero-title">Write a past quiz against the clock.</h1>
          <p className="lede">
            Choose a quiz from any school year, set your time, and get a grade at the end. Then pick the
            problems you want explained, step by step.
          </p>
          <div className="actions">
            <Link className="btn" to="/mock-quiz">
              Start a mock quiz
            </Link>
            <Link className="btn btn-plain" to="/history">
              View history
            </Link>
          </div>
        </div>
        <HeroShapes />
      </section>

      {facts && (
        <section className="container" aria-label="What is included">
          <dl className="fact-strip">
            <div>
              <dt>Quizzes</dt>
              <dd>{facts.quizzes}</dd>
            </div>
            <div>
              <dt>School years</dt>
              <dd>{facts.years}</dd>
            </div>
            <div>
              <dt>Grades</dt>
              <dd>{facts.grades}</dd>
            </div>
            <div>
              <dt>Explained problems</dt>
              <dd>{facts.problems.toLocaleString('en')}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="container section">
        <div className="book">
          <span className="book-tab">How it works</span>
          <h2 className="section-title">Three steps, one sitting.</h2>
          <ol className="steps">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className={`step-badge step-${step.shape}`} aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container section">
        <div className="back-cover">
          <Confetti />
          <h2 className="section-title">Ready when you are.</h2>
          <p>Your attempts are saved in this browser, so you can track your grades over time.</p>
          <Link className="btn" to="/mock-quiz">
            Choose a quiz
          </Link>
        </div>
      </section>
    </>
  );
}
