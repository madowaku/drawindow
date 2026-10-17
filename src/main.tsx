import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import App from './App';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
