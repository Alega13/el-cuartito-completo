import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { PlayerProvider } from './context/PlayerContext'
import { SelectionsProvider } from './context/SelectionsContext'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { WishlistProvider } from './context/WishlistContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WishlistProvider>
        <SelectionsProvider>
          <PlayerProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </PlayerProvider>
        </SelectionsProvider>
        </WishlistProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
