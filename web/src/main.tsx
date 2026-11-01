import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initLocale } from './lib/i18n';
import { initTheme } from './lib/theme';
import './styles/globals.css';

initLocale();
initTheme();

const container = document.getElementById('root');
if (!container) throw new Error('缺少根节点 #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
