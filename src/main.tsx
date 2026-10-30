import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// All game data is bundled. The application has no account or paid API dependency.
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
