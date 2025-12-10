import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { SessionProvider } from '../contexts/SessionContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import '../styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SessionProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </SessionProvider>
    </ThemeProvider>
  </React.StrictMode>
);
