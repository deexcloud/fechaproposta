import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './landing.css'
import './flows.css'
import './theme.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
