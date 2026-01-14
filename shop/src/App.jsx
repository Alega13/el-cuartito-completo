import React, { useState, useEffect } from 'react';
import { getOnlineRecords } from './services/api';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import StorePage from './pages/StorePage';
import ProductPage from './pages/ProductPage';
import CollectionPage from './pages/CollectionPage';
import CatalogPage from './pages/CatalogPage';
import GlobalPlayer from './components/GlobalPlayer';
import Collections from './components/Collections';
import Footer from './components/Footer';
import logo from './assets/logo.png';

function App() {
  const [page, setPage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);

  useEffect(() => {
    // Fetch products from Railway backend API
    const fetchProducts = async () => {
      try {
        setLoading(true);
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

        setProducts(normalized);
      } catch (error) {
        console.error("Failed to load products", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchProducts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCollectionClick = (collectionName) => {
    setSelectedCollection(collectionName);
    setPage('collection');
  };


  // Find products marked as "header" in storageLocation field
  const headerProducts = products.filter(p => p.storageLocation === 'header').slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-black selection:bg-accent selection:text-white">
      <Navbar page={page} setPage={setPage} setSearchQuery={setSearchQuery} />

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
              collectionFilter={collectionFilter}
              onClearCollection={() => setCollectionFilter(null)}
            />
          </>
        )}
        {page === 'catalog' && (
          <CatalogPage
            products={products}
            setPage={setPage}
            setSelectedProduct={setSelectedProduct}
          />
        )}
        {page === 'collections' && (
          <Collections
            products={products}
            onCollectionClick={handleCollectionClick}
            isFullPage={true}
          />
        )}
        {page === 'product' && (
          <ProductPage
            product={selectedProduct}
            products={products}
            setSelectedProduct={setSelectedProduct}
          />
        )}
        {page === 'collection' && (
          <CollectionPage
            collectionName={selectedCollection}
            products={products}
            setPage={setPage}
            setSelectedProduct={setSelectedProduct}
            onClose={() => setPage('collections')}
          />
        )}
      </main>


      <Footer />
    </div>
  );
}

export default App;
