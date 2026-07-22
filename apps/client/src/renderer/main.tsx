
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

window.addEventListener('error', (e) => {
  const body = document.getElementById('root');
  if (body) {
    body.innerHTML = `<pre style="color:red;padding:20px;font-size:14px">${e.error?.stack ?? e.message ?? 'Unknown error'}</pre>`;
  }
  console.error('[global error]', e);
});

window.addEventListener('unhandledrejection', (e) => {
  const body = document.getElementById('root');
  if (body) {
    body.innerHTML = `<pre style="color:red;padding:20px;font-size:14px">Unhandled Rejection: ${e.reason?.stack ?? e.reason?.message ?? String(e.reason)}</pre>`;
  }
  console.error('[unhandled rejection]', e.reason);
});

if (import.meta.env.DEV) {
  const { scan } = await import('react-scan');
  scan({ enabled: false });
}

const rootEl = document.getElementById('root');
if (rootEl) {
  try {
    createRoot(rootEl).render(<App />);
  } catch (e) {
    rootEl.innerHTML = `<pre style="color:red;padding:20px;font-size:14px">${(e as Error)?.stack ?? String(e)}</pre>`;
  }
}
