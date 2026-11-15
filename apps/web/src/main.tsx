import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './shell/tokens.css'
import './styles.css'
import './liquid/liquid-glass.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('The AnalogOS root container was not found.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
