import './electron-mock' // 浏览器环境注入 window.electron mock（必须最先加载）
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

// 导入虚拟模块以注册 SVG icons
import 'virtual:svg-icons-register'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
