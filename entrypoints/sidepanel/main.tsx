import React from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';
import App from './App';
import { setupDatabase } from '../../core/db-migration';

console.log('Sidepanel main.tsx loading...');

// Initialize database before rendering
setupDatabase().then(() => {
  console.log('Database setup complete, rendering App...');
  const rootElement = document.getElementById('root');
  console.log('Root element:', rootElement);

  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log('App rendered!');
  } else {
    console.error('Root element not found!');
  }
}).catch(err => {
  console.error('Database setup failed:', err);
});
