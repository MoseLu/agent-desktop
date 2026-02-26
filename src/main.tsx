import './electron-mock';  // Import mock before anything else, in case window.electron doesn't exist
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
