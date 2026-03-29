import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { Buffer } from 'buffer';

window.Buffer = Buffer;
window.process = { env: {} };

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
