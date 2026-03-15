import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import katex from 'katex'
import { setKatex } from 'edumark-js'
import App from './App'
import './styles/index.css'

// Inject KaTeX into edumark-js so decode()/decodeAsync() render math directly
setKatex(katex)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
