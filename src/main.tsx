import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import { Page } from './Page';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><Page /></React.StrictMode>);

// Standalone offline edition: precache the complete build after first online install.
// The iframe demo/live editions do not register a worker.
if (import.meta.env.VITE_OFFLINE_EDITION === 'true' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const root = new URL(import.meta.env.BASE_URL || './', document.baseURI);
    void navigator.serviceWorker.register(new URL('sw.js', root).href, { scope: root.pathname })
      .catch(error => { if (import.meta.env.DEV) console.warn('Offline installation unavailable:', error); });
  });
}
