import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './config/firebase';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import StorePage from './pages/StorePage';
import ProductPage from './pages/ProductPage';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import CartDrawer from './components/CartDrawer';
import GlobalPlayer from './components/GlobalPlayer';
import logo from './assets/logo.png';

function App() {
  const [page, setPage] = useState('home');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSaleId, setSearchSaleId] = useState(null);

  useEffect(() => {
    // Check for success page in URL (from Stripe redirect)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('page') === 'success') {
      setPage('success');
      setSearchSaleId(urlParams.get('saleId'));
      // Clean up URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Real-time listener for products
    const q = query(
      collection(db, 'products'),
      where('is_online', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const normalized = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          cover_image: data.cover_image || null,
          genre: data.genre || 'Electronic',
          year: data.year || '2024',
          label: data.label || 'El Cuartito',
          status: data.condition || 'VG',
          discogsId: data.discogsId || null
        };
      });
      setProducts(normalized);
      setLoading(false);
    }, (error) => {
      console.error("Failed to load products", error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);


  // Find products marked as "header" in storageLocation field
  const headerProducts = products.filter(p => p.storageLocation === 'header').slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-black selection:bg-accent selection:text-white">
      <Navbar page={page} setPage={setPage} setIsCartOpen={setIsCartOpen} setSearchQuery={setSearchQuery} />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} setPage={setPage} />

      <main>
        {page === 'home' && (
          <>
            <Hero
              products={headerProducts}
              onViewProduct={(product) => {
                setSelectedProduct(product);
                setPage('product');
              }}
            />
            <StorePage
              products={products}
              loading={loading}
              setPage={setPage}
              setSelectedProduct={setSelectedProduct}
              searchQuery={searchQuery}
            />
          </>
        )}
        {page === 'product' && (
          <ProductPage
            product={selectedProduct}
            products={products}
            setSelectedProduct={setSelectedProduct}
            setIsCartOpen={setIsCartOpen}
          />
        )}
        {page === 'checkout' && <CheckoutPage setPage={setPage} setSaleId={setSearchSaleId} />}
        {page === 'success' && <SuccessPage setPage={setPage} saleId={searchSaleId} />}
      </main>

      <GlobalPlayer />

      <footer className="py-20 px-6 border-t border-black/5 bg-white mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <img src={logo} alt="El Cuartito" className="h-10 w-auto object-contain mb-6" />
            <p className="max-w-xs text-sm text-black/60 leading-relaxed font-medium">
              Based in Copenhaguen, Vesterbro.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-16">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Shop</h4>
              <ul className="space-y-2 text-sm font-medium">
                <li><button onClick={() => setPage('home')} className="hover:opacity-50 transition-opacity">Catalogue</button></li>
                <li><a href="#" className="hover:opacity-50 transition-opacity">Shipping Info</a></li>
                <li><a href="#" className="hover:opacity-50 transition-opacity">Contact</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Follow</h4>
              <ul className="space-y-2 text-sm font-medium">
                <li><a href="https://www.instagram.com/el.cuartito.records/" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity">Instagram</a></li>
                <li><a href="https://www.discogs.com/es/user/elcuartitorecords.dk" target="_blank" rel="noopener noreferrer" className="hover:underline">Discogs</a></li>
                <li><a href="#" className="hover:underline">Facebook</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-black/5 flex justify-between items-center text-[9px] uppercase font-bold tracking-[0.3em] text-black/30">
          <div>© 2024 EL CUARTITO. ALL RIGHTS RESERVED.</div>
          <div>DYBBØLSGADE 14, 1721 KØBENHAVN</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
