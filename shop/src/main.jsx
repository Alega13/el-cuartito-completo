import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { PlayerProvider } from './context/PlayerContext'
import { SelectionsProvider } from './context/SelectionsContext'
import { CartProvider } from './context/CartContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SelectionsProvider>
      <PlayerProvider>
        <CartProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CartProvider>
      </PlayerProvider>
    </SelectionsProvider>
  </StrictMode>,
)
