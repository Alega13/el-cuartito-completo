import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CartProvider } from './context/CartContext'
import { PlayerProvider } from './context/PlayerContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CartProvider>
      <PlayerProvider>
        <App />
      </PlayerProvider>
    </CartProvider>
  </StrictMode>,
)
