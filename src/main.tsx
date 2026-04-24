import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabaseConfigured } from './supabase';

// Ensure process.env is available in the browser
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px', margin: '4rem auto' }}>
          <h1 style={{ color: '#004225' }}>Stellify – Konfigurationsfehler</h1>
          <p>Die App konnte nicht gestartet werden. Bitte stelle sicher, dass folgende Umgebungsvariablen auf Vercel gesetzt sind:</p>
          <ul style={{ background: '#f5f4f0', padding: '1rem 1.5rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.9rem' }}>
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>Fehler: {this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

if (!supabaseConfigured) {
  console.warn('[Stellify] App runs without valid Supabase credentials – authentication and data will not work.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
