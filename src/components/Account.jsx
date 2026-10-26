import { createContext, useContext, useEffect, useState } from 'react';
import { ClerkLoading, Show, SignInButton, useSession, useUser } from '@clerk/react';
import { mergeRemoteAttempts, switchAttemptStore } from '../lib/attempts.js';
import { createSupabase, deleteAttempts, fetchAttempts, upsertAttempts } from '../lib/supabase.js';

const AccountContext = createContext({ ready: false, syncError: null });

const PUSH_DELAY = 1500;

// Points the attempt store at the signed-in user and keeps it in step with Supabase:
// pulls their attempts on sign-in, uploads anything newer saved locally, then sends each save
// (batched for a moment, since answers are saved on every keystroke).
export function AccountProvider({ children }) {
  const { user } = useUser();
  const { session } = useSession();
  const [state, setState] = useState({ ready: false, syncError: null });
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !session) {
      setState({ ready: false, syncError: null });
      return;
    }
    const supabase = createSupabase(() => session.getToken());
    const pending = new Map();
    let timer = null;
    let cancelled = false;
    const reportError = (error) => {
      console.error('Supabase sync failed', error);
      if (!cancelled) setState((s) => ({ ...s, syncError: error.message ?? String(error) }));
    };
    const flush = () => {
      clearTimeout(timer);
      timer = null;
      const batch = [...pending.values()];
      pending.clear();
      // Anything that fails stays newer locally and is uploaded again at the next sign-in.
      upsertAttempts(supabase, batch).catch(reportError);
    };

    switchAttemptStore(userId, {
      save(attempt) {
        pending.set(attempt.id, attempt);
        timer ??= setTimeout(flush, PUSH_DELAY);
      },
      clear() {
        pending.clear();
        deleteAttempts(supabase).catch(reportError);
      },
    });
    const flushOnHide = () => document.visibilityState === 'hidden' && pending.size && flush();
    document.addEventListener('visibilitychange', flushOnHide);

    setState({ ready: false, syncError: null });
    fetchAttempts(supabase)
      .then((remote) => upsertAttempts(supabase, mergeRemoteAttempts(remote)))
      .catch(reportError)
      // The site still works from the local copy when Supabase can't be reached.
      .finally(() => !cancelled && setState((s) => ({ ...s, ready: true })));

    return () => {
      cancelled = true;
      if (pending.size) flush();
      document.removeEventListener('visibilitychange', flushOnHide);
    };
  }, [userId, session?.id]);

  return <AccountContext.Provider value={state}>{children}</AccountContext.Provider>;
}

export const useAccount = () => useContext(AccountContext);

function SignInPrompt() {
  return (
    <section className="container page">
      <div className="book">
        <span className="book-tab">Sign in</span>
        <h1 className="section-title">Sign in to write quizzes</h1>
        <p className="lede">Your attempts and scores are saved to your account, so you can see them on any device.</p>
        <SignInButton mode="modal">
          <button type="button" className="btn">
            Sign in
          </button>
        </SignInButton>
      </div>
    </section>
  );
}

// Shows the page once the user is signed in and their attempts are loaded.
export function RequireAccount({ children }) {
  const { ready, syncError } = useAccount();
  return (
    <>
      <ClerkLoading>
        <section className="container page">
          <p>Loading…</p>
        </section>
      </ClerkLoading>
      <Show when="signed-in" fallback={<SignInPrompt />}>
        {ready ? (
          <>
            {syncError && (
              <div className="container">
                <p className="notice">
                  Your attempts couldn't be synced with your account, so they're only saved in this browser for now.
                </p>
              </div>
            )}
            {children}
          </>
        ) : (
          <section className="container page">
            <p>Loading your attempts…</p>
          </section>
        )}
      </Show>
    </>
  );
}
