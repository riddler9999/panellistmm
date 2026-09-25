import '@fontsource/noto-sans-myanmar/400.css';
import '@fontsource/noto-sans-myanmar/600.css';
import '@fontsource/noto-sans-myanmar/700.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
