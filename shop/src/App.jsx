import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { getOnlineRecords } from './services/api';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import StorePage from './pages/StorePage';
import ProductPage from './pages/ProductPage';
import CollectionPage from './pages/CollectionPage';
import CatalogPage from './pages/CatalogPage';
import ListeningRoomPage from './pages/ListeningRoomPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccess from './pages/PaymentSuccess';
import SuccessPage from './pages/SuccessPage';
import NotFoundPage from './pages/NotFoundPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ShippingPage from './pages/ShippingPage';
import AboutPage from './pages/AboutPage';
import VinylSidePlayer from './components/VinylSidePlayer';
import FlyAnimation from './components/FlyAnimation';
import Toast from './components/Toast';
import Collections from './components/Collections';
import Footer from './components/Footer';
import { usePlayer } from './context/PlayerContext';
import { useSelections } from './context/SelectionsContext';
import ErrorState from './components/ErrorState';
import ScrollToTop from './components/ScrollToTop';
import logo from './assets/logo.png';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { showSidePlayer, setShowSidePlayer, currentProduct } = usePlayer();
  const {
    flyAnimation,
    clearFlyAnimation,
    showToast,
    setShowToast,
    toastMessage
  } = useSelections();
  const location = useLocation();
  const navigate = useNavigate();

  // Cache configuration
  const CACHE_KEY = 'el_cuartito_products';
  const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    // Fetch products from Railway backend API with caching
    const fetchProducts = async (forceRefresh = false) => {
      try {
        // Check localStorage cache first (unless forcing refresh)
        if (!forceRefresh) {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const isExpired = Date.now() - timestamp > CACHE_EXPIRY_MS;

            if (!isExpired && data?.length > 0) {
              setProducts(data);
              setLoading(false);
              setError(null);
              // Still fetch in background to update cache
              fetchProducts(true);
              return;
            }
          }
        }

        setLoading(products.length === 0); // Only show loading if no cached data
        const data = await getOnlineRecords(); // Uses Railway API

        // Normalize data to match expected format
        const normalized = data.map(product => ({
          ...product,
          cover_image: product.cover_image || null,
          genre: product.genre || 'Electronic',
          year: product.year || '2024',
          label: product.label || 'El Cuartito',
          status: product.condition || 'VG',
          discogsId: product.discogsId || null
        }));

        // Save to cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: normalized,
          timestamp: Date.now()
        }));

        setProducts(normalized);
        setError(null);
      } catch (err) {
        console.error("Failed to load products", err);
        // Only show error if we have no cached data
        if (products.length === 0) {
          setError('Unable to load products. Please check your connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    // Poll for updates every 2 minutes (reduced from 30 seconds)
    const interval = setInterval(() => fetchProducts(true), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExpandPlayer = () => {
    // Navigate to current product page
    if (currentProduct) {
      navigate(`/product/${currentProduct.id}`);
    }
  };


  // Find products marked as "header" in storageLocation field
  const headerProducts = products.filter(p => p.storageLocation === 'header').slice(0, 3);

  // Determine if we're on product page (full mode) or elsewhere (mini mode)
  // Check if pathname starts with /product/
  const isOnProductPage = location.pathname.startsWith('/product/');
  const isListeningPage = location.pathname === '/listening';

  return (
    <div className="min-h-screen bg-background text-black selection:bg-accent selection:text-white">
      <Navbar setSearchQuery={setSearchQuery} />
      <ScrollToTop />

      <main>
        <Routes>
          <Route path="/" element={
            <>
              <Hero products={headerProducts} />
              {error && products.length === 0 ? (
                <ErrorState
                  title="Couldn't Load Records"
                  message={error}
                  onRetry={() => window.location.reload()}
                  showHomeLink={false}
                />
              ) : (
                <StorePage
                  products={products}
                  loading={loading}
                  searchQuery={searchQuery}
                />
              )}
            </>
          } />

          <Route path="/catalog" element={
            <CatalogPage products={products} />
          } />

          <Route path="/collections" element={
            <Collections products={products} isFullPage={true} />
          } />

          <Route path="/collection/:collectionName" element={
            <CollectionPage products={products} />
          } />

          <Route path="/product/:productId" element={
            <ProductPage products={products} />
          } />

          <Route path="/listening" element={
            <ListeningRoomPage products={products} />
          } />

          <Route path="/checkout" element={
            <CheckoutPage />
          } />

          <Route path="/checkout/success" element={
            <PaymentSuccess />
          } />

          <Route path="/success" element={
            <SuccessPage />
          } />

          {/* Legal Pages */}
          <Route path="/terms" element={
            <TermsPage />
          } />
          <Route path="/privacy" element={
            <PrivacyPage />
          } />
          <Route path="/shipping" element={
            <ShippingPage />
          } />
          <Route path="/about" element={
            <AboutPage />
          } />

          {/* 404 Catch-all Route */}
          <Route path="*" element={
            <NotFoundPage />
          } />
        </Routes>
      </main>

      {/* Global Mini Vinyl Player (shows when not on product page or listening room) */}
      {!isOnProductPage && !isListeningPage && showSidePlayer && (
        <VinylSidePlayer
          product={currentProduct}
          isVisible={showSidePlayer}
          onClose={() => setShowSidePlayer(false)}
          isMini={true}
          onExpand={handleExpandPlayer}
        />
      )}

      {/* Fly Animation for Listening Room */}
      <FlyAnimation animation={flyAnimation} onComplete={clearFlyAnimation} />

      {/* Toast Notification */}
      <Toast
        show={showToast}
        message={toastMessage}
        onComplete={() => setShowToast(false)}
      />

      <Footer />
    </div>
  );
}

export default App;

