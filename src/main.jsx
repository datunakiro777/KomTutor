import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import 'katex/dist/katex.min.css';
import './styles.css';
import App from './App.jsx';
import { AccountProvider } from './components/Account.jsx';

const REQUIRED_ENV = ['VITE_CLERK_PUBLISHABLE_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
const missing = REQUIRED_ENV.filter((name) => !import.meta.env[name]);

function MissingSetup() {
  return (
    <main className="container page">
      <h1 className="page-title">Almost there</h1>
      <p className="lede">
        KomTutor needs its Clerk and Supabase keys. Copy <code>.env.example</code> to <code>.env.local</code>, fill in
        these values and restart <code>npm run dev</code>:
      </p>
      <ul>
        {missing.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {missing.length ? (
      <MissingSetup />
    ) : (
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        <AccountProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AccountProvider>
      </ClerkProvider>
    )}
  </React.StrictMode>,
);
