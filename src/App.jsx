import { NavLink, Route, Routes, Link } from 'react-router-dom';
import { Show, SignInButton, UserButton } from '@clerk/react';
import { RequireAccount } from './components/Account.jsx';
import Home from './pages/Home.jsx';
import MockQuiz from './pages/MockQuiz.jsx';
import TakeQuiz from './pages/TakeQuiz.jsx';
import Results from './pages/Results.jsx';
import History from './pages/History.jsx';

function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          KomTutor
        </Link>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/mock-quiz">Mock quiz</NavLink>
          <NavLink to="/history">History</NavLink>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" className="btn btn-small">
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <span className="user-button">
              <UserButton />
            </span>
          </Show>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <p className="footer-brand">KomTutor</p>
          <p>Practice with past Komarovi math quizzes, variant 1.</p>
        </div>
        <nav aria-label="Footer">
          <Link to="/mock-quiz">Mock quiz</Link>
          <Link to="/history">History</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mock-quiz" element={<RequireAccount><MockQuiz /></RequireAccount>} />
          <Route path="/mock-quiz/:attemptId" element={<RequireAccount><TakeQuiz /></RequireAccount>} />
          <Route path="/results/:attemptId" element={<RequireAccount><Results /></RequireAccount>} />
          <Route path="/history" element={<RequireAccount><History /></RequireAccount>} />
          <Route
            path="*"
            element={
              <section className="container page">
                <h1 className="page-title">Page not found</h1>
                <Link className="btn" to="/">
                  Go home
                </Link>
              </section>
            }
          />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
