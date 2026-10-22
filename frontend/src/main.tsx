import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { BffProvider } from './BffContext';
import { bff } from './bff';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Elemento #root não encontrado.');
}

createRoot(root).render(
  <StrictMode>
    <BffProvider bff={bff}>
      <App />
    </BffProvider>
  </StrictMode>,
);
