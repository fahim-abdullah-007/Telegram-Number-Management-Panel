import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './legacy.css';
import './polish.css';
import App from './AppRedesigned';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);