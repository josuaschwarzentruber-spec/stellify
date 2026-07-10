import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// Ensure process.env is available in the browser
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

/* ── Resilience layer ────────────────────────────────────────────────────────
   Three guarantees so a visitor never faces a dead page:
   1. A crash anywhere in React shows a friendly branded reload screen
      instead of a white page (ErrorBoundary below).
   2. After a new deploy, old browser tabs whose lazy chunks no longer
      exist reload themselves once instead of erroring (chunk guard).
   3. The splash overlay is force-removed as a last resort so nobody can
      be stuck behind it (also guarded in index.html). */

function removeSplash() {
  try {
    const el = document.getElementById('stellify-splash');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    document.body.classList.remove('stellify-splashing');
  } catch { /* never let cleanup itself throw */ }
}

// 2) Stale-chunk guard: dynamic import failures right after a deploy are
// fixed by a single reload (new HTML → new chunk URLs). Reload at most
// once per session so a genuinely broken network can't loop.
function isChunkLoadError(msg: string): boolean {
  return /dynamically imported module|Loading chunk|Importing a module script failed|Failed to fetch dynamically/i.test(msg);
}
function reloadOnceForNewDeploy(): boolean {
  try {
    if (sessionStorage.getItem('stellify_chunk_reload') === '1') return false;
    sessionStorage.setItem('stellify_chunk_reload', '1');
    window.location.reload();
    return true;
  } catch { return false; }
}
window.addEventListener('unhandledrejection', (e) => {
  const msg = String((e.reason && (e.reason.message || e.reason)) || '');
  if (isChunkLoadError(msg) && reloadOnceForNewDeploy()) e.preventDefault();
});
window.addEventListener('error', (e) => {
  if (isChunkLoadError(String(e.message || ''))) reloadOnceForNewDeploy();
});

// Any fatal error gets ONE automatic silent reload per session before a
// visitor ever sees the recovery screen — most failures (stale deploy,
// flaky mobile network, interrupted download) are fixed by exactly that.
function autoRecoverOnce(): boolean {
  try {
    if (sessionStorage.getItem('stellify_auto_recover') === '1') return false;
    sessionStorage.setItem('stellify_auto_recover', '1');
    window.location.reload();
    return true;
  } catch { return false; }
}

// 1) Branded, friendly recovery screen. Used by the error boundary AND as
// the fallback when the app bundle itself fails to load or crashes on
// import (module-level error), so a visitor never sees a white page.
const RecoveryScreen = () => {
  const lang = (() => { try { return localStorage.getItem('language') || 'DE'; } catch { return 'DE'; } })();
  const title = lang === 'FR' ? 'Petite interruption' : lang === 'IT' ? 'Breve interruzione' : lang === 'EN' ? 'Brief interruption' : 'Kurze Unterbrechung';
  const desc = lang === 'FR' ? 'Un souci est survenu. Tes données sont en sécurité. Un clic et ça repart.'
    : lang === 'IT' ? 'Qualcosa è andato storto. I tuoi dati sono al sicuro. Un clic e si riparte.'
    : lang === 'EN' ? 'Something went wrong. Your data is safe. One click and you are back.'
    : 'Etwas ist schiefgelaufen. Deine Daten sind sicher. Ein Klick genügt und es geht weiter.';
  const btn = lang === 'FR' ? 'Recharger la page' : lang === 'IT' ? 'Ricarica la pagina' : lang === 'EN' ? 'Reload page' : 'Seite neu laden';
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      background: '#FAFAF8', color: '#1A1A18', padding: 24,
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <svg width="40" height="40" viewBox="0 0 28 28" fill="none" aria-hidden="true" style={{ marginBottom: 20 }}>
        <path d="M14 2.5L17 10.5L25.5 14L17 17L14 25.5L11 17L2.5 14L11 10.5Z" fill="#00A854"/>
      </svg>
      <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 26, margin: '0 0 10px' }}>
        {title}
      </h1>
      <p style={{ fontSize: 14, fontWeight: 300, color: '#5C5C58', maxWidth: 420, lineHeight: 1.6, margin: '0 0 24px' }}>
        {desc}
      </p>
      <button
        onClick={() => { try { sessionStorage.removeItem('stellify_auto_recover'); sessionStorage.removeItem('stellify_chunk_reload'); } catch { /* ignore */ } window.location.reload(); }}
        style={{
          background: '#004225', color: '#fff', border: 'none', cursor: 'pointer',
          padding: '14px 32px', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.2em', textTransform: 'uppercase',
        }}
      >
        {btn}
      </button>
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) {
    console.error('[STELLIFY ERROR BOUNDARY]', error);
    removeSplash();
    // A crash during initial mount can also be a stale-deploy issue; one
    // automatic reload often fixes it without the user noticing.
    const msg = String((error as any)?.message || '');
    if (isChunkLoadError(msg)) { reloadOnceForNewDeploy(); return; }
    autoRecoverOnce();
  }
  render() {
    if (this.state.hasError) return <RecoveryScreen />;
    return this.props.children;
  }
}

// Load the app bundle dynamically so even a module-level crash (a bug that
// throws while the bundle is imported) lands on the recovery screen
// instead of leaving the splash or a white page.
const root = createRoot(document.getElementById('root')!);
import('./App.tsx')
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  })
  .catch((err) => {
    console.error('[STELLIFY BOOT]', err);
    if (isChunkLoadError(String(err?.message || '')) && reloadOnceForNewDeploy()) return;
    if (autoRecoverOnce()) return;
    removeSplash();
    root.render(<RecoveryScreen />);
  });
