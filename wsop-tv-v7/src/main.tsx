// The demo clock goes first: every data module reads it when it loads.
import './lib/clock';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
