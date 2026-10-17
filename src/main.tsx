import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import App from './App';
import './styles/app.css';

const Page = new URLSearchParams(window.location.search).has('character-preview')
  ? React.lazy(() => import('./components/CharacterPreview').then(module => ({ default: module.CharacterPreview })))
  : App;

createRoot(document.getElementById('root')!).render(<React.StrictMode><React.Suspense fallback={<p>Loading…</p>}><Page /></React.Suspense></React.StrictMode>);
