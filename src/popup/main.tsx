import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { SessionProvider } from '../contexts/SessionContext';
import '../styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </SessionProvider>
  </React.StrictMode>
);
