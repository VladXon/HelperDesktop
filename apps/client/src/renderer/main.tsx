
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

if (import.meta.env.DEV) {
  const { scan } = await import('react-scan');
  scan({ enabled: false });
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
