import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './firebase';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [cart, setCart] = useState([]);

  // Sales History State
  const [salesHistory, setSalesHistory] = useState([]);
  const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  // POS Checkout State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('MobilePay');
  const [paymentChannel, setPaymentChannel] = useState('tienda');
  const [rsdExtraDiscount, setRsdExtraDiscount] = useState(false);

  // Helper: effective price per item (10% off if RSD)
  const getEffectivePrice = (item) => item.is_rsd_discount ? Math.round(item.price * 0.9) : (item.price || 0);


  const searchInputRef = useRef(null);

  // Filter State
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    let unsubscribe = () => {};

    const setupRealtimeSync = async () => {
      try {
        // Authenticate using the admin account to bypass security rules
        await signInWithEmailAndPassword(auth, 'el.cuartito.cph@gmail.com', 'Rosario123');

        // Realtime listener for products
        unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
          const productsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log("Real-time products update:", productsList.length);
          setRecords(productsList);
          setIsLoading(false);
        }, (error) => {
          console.error("Error with products listener:", error);
          setIsLoading(false);
        });

      } catch (error) {
        console.error("Error setting up auth:", error);
        setIsLoading(false);
      }
    };

    setupRealtimeSync();

    return () => unsubscribe();
  }, []);

  // Auto-focus the search input when the search tab is active
  useEffect(() => {
    if (activeTab === 'search' && searchInputRef.current && !isLoading) {
      // Small timeout to ensure DOM is ready and prevents mobile keyboard weirdness occasionally
      setTimeout(() => searchInputRef.current.focus(), 50);
    }
  }, [activeTab, isLoading]);

  const filteredRecords = useMemo(() => {
    let results = records;

    // Apply genre filter
    if (selectedGenre) {
      results = results.filter(r => (r.genre || '').toLowerCase() === selectedGenre.toLowerCase());
    }

    // Apply storage filter
    if (selectedStorage) {
      results = results.filter(r => (r.storageLocation || '').toLowerCase() === selectedStorage.toLowerCase());
    }

    // Apply text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter(record => {
        const artist = (record.artist || '').toLowerCase();
        const album = (record.album || '').toLowerCase();
        const sku = (record.sku || '').toLowerCase();
        const label = (record.label || record.sello || '').toLowerCase();
        return artist.includes(query) || album.includes(query) || sku.includes(query) || label.includes(query);
      });
    }

    // Apply sorting
    switch (sortOrder) {
      case 'newest':
        // Default Firestore order (newest first by doc index)
        results = [...results].reverse();
        break;
      case 'oldest':
        // Keep original order
        break;
      case 'price-asc':
        results = [...results].sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-desc':
        results = [...results].sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'alpha':
        results = [...results].sort((a, b) => (a.album || '').localeCompare(b.album || ''));
        break;
      default:
        break;
    }

    return results;
  }, [searchQuery, records, selectedGenre, selectedStorage, sortOrder]);

  // Compute unique genres and storage locations from records
  const uniqueGenres = useMemo(() => {
    const genres = new Set();
    records.forEach(r => { if (r.genre) genres.add(r.genre); });
    return [...genres].sort();
  }, [records]);

  const uniqueStorages = useMemo(() => {
    const storages = new Set();
    records.forEach(r => { if (r.storageLocation) storages.add(r.storageLocation); });
    return [...storages].sort();
  }, [records]);

  // Live Cart: Maps item IDs in cart state to latest product data in records state
  // This ensures that toggling RSD in Admin reflects immediately in the mobile cart/checkout
  const liveCart = useMemo(() => {
    return cart.map(cartItem => {
      const record = records.find(r => r.id === cartItem.id);
      return {
        ...record,
        ...cartItem, // keep quantity
        // Ensure we use the latest pricing data from records
        price: record?.price || cartItem.price,
        is_rsd_discount: record?.is_rsd_discount || false
      };
    });
  }, [cart, records]);

  const handleRowClick = (record) => {
    setSelectedRecord(record);
  };

  const handleAddToCart = (record, e) => {
    e.stopPropagation(); // Prevent modal interactions from bubbling up

    if (record.stock <= 0) {
      showToast('❌ Sin stock disponible', 'error');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === record.id);
      if (existing) {
        if (existing.quantity >= record.stock) {
          showToast('❌ No hay más stock de este disco', 'error');
          return prev;
        }
        showToast('✅ Agregado al carrito');
        return prev.map(item => item.id === record.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      showToast('✅ Agregado al carrito');
      return [...prev, { ...record, quantity: 1 }];
    });

    setSelectedRecord(null); // Close modal
  };

  const removeFromCart = (recordId) => {
    setCart(prev => prev.filter(item => item.id !== recordId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setIsCheckingOut(true);
    try {
      const cartTotal = liveCart.reduce((sum, item) => sum + getEffectivePrice(item) * item.quantity, 0);
      const totalItems = liveCart.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = (rsdExtraDiscount && totalItems >= 3) ? Math.round(cartTotal * 0.95) : cartTotal;

      // Get Firebase Auth token for backend authentication
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No autenticado. Por favor reinicia la app.');
      }
      const idToken = await currentUser.getIdToken();

      // Build items payload matching backend's createSale expected format
      const items = liveCart.map(item => ({
        productId: item.id,
        qty: item.quantity,
        priceAtSale: getEffectivePrice(item),
        album: item.album || 'Venta App',
      }));

      // Call backend API — handles atomic stock decrement, inventory movements, VAT & invoicing
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          items,
          channel: paymentChannel,
          totalAmount,
          paymentMethod,
          customerName: 'Venta Mostrador',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al procesar la venta en el servidor');
      }

      // Local state update removed because onSnapshot handles real-time stock sync
      setCart([]);
      setRsdExtraDiscount(false);
      setIsCheckoutModalOpen(false);
      showToast('✅ Venta procesada exitosamente');
      setActiveTab('search');
    } catch (error) {
      console.error("Error procesando checkout:", error);
      showToast('❌ ' + (error.message || 'Error al procesar venta'), 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Fetch Sales History
  const fetchSalesHistory = async () => {
    setIsLoadingSales(true);
    try {
      const salesQuery = query(
        collection(db, 'sales'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(salesQuery);
      const sales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSalesHistory(sales);
    } catch (error) {
      console.error('Error fetching sales history:', error);
      showToast('❌ Error al cargar historial', 'error');
    } finally {
      setIsLoadingSales(false);
    }
  };

  const openSalesHistory = () => {
    setIsSalesHistoryOpen(true);
    fetchSalesHistory();
  };

  const showToast = (message, type = 'success') => {
    setToastMessage({ text: message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };


  return (
    <div className="flex flex-col min-h-[100dvh] h-[100dvh] max-w-md mx-auto bg-white text-brand-dark overscroll-none shadow-2xl overflow-hidden font-sans relative">



      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scroll-smooth flex flex-col relative w-full">
        {activeTab === 'search' && (
          <div className="flex flex-col h-full w-full">
            {/* Search Header & Bar Container */}
            <div className="sticky top-0 z-20 pt-safe bg-white/95 backdrop-blur-xl border-b border-gray-100">
              <div className="px-4 py-3 flex items-center justify-center">
                <div className="flex items-center h-6 w-auto">
                  <img src="/logo.png" alt="El Cuartito Logo" className="h-full object-contain" />
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-4 pb-3">
                <div className="relative flex items-center bg-gray-100 rounded-[10px] h-9">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="absolute left-3 w-4 h-4 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar por artista, álbum, sello o SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-gray-900 pl-9 pr-9 py-0 outline-none placeholder:text-gray-400 font-medium text-[15px]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2.5 p-0.5 bg-gray-300 hover:bg-gray-400 text-white rounded-full transition-colors flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-[11px] font-semibold text-gray-400 tracking-wide uppercase">
                    {isLoading ? 'Cargando catálogo...' : `${filteredRecords.length} DISCOS`}
                  </span>
                  {(searchQuery || selectedGenre || selectedStorage) && (
                    <span className="text-[10px] bg-brand-orange/10 text-brand-orange font-bold px-2 py-0.5 rounded-full">Filtrado</span>
                  )}
                </div>

                {/* Filters Row */}
                <div className="flex gap-2 mt-2.5">
                  <div className="relative flex-1">
                    <select
                      value={selectedGenre}
                      onChange={(e) => setSelectedGenre(e.target.value)}
                      className={`w-full px-3 py-2 bg-gray-100 rounded-[10px] text-[13px] font-semibold outline-none appearance-none transition-colors ${selectedGenre ? 'text-brand-orange bg-orange-50' : 'text-gray-500'}`}
                    >
                      <option value="">Género</option>
                      {uniqueGenres.map(genre => (
                        <option key={genre} value={genre}>{genre}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${selectedGenre ? 'text-brand-orange' : 'text-gray-400'}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="relative flex-1">
                    <select
                      value={selectedStorage}
                      onChange={(e) => setSelectedStorage(e.target.value)}
                      className={`w-full px-3 py-2 bg-gray-100 rounded-[10px] text-[13px] font-semibold outline-none appearance-none transition-colors ${selectedStorage ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
                    >
                      <option value="">📍 Ubicación</option>
                      {uniqueStorages.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${selectedStorage ? 'text-blue-500' : 'text-gray-400'}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Sort Row */}
                <div className="relative mt-2">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-100 rounded-[10px] text-[13px] font-semibold outline-none appearance-none transition-colors ${sortOrder !== 'newest' ? 'text-purple-600 bg-purple-50' : 'text-gray-500'}`}
                  >
                    <option value="newest">↓ Más nuevos primero</option>
                    <option value="oldest">↑ Más viejos primero</option>
                    <option value="price-asc">💰 Precio: menor a mayor</option>
                    <option value="price-desc">💰 Precio: mayor a menor</option>
                    <option value="alpha">🔤 Alfabético (A-Z)</option>
                  </select>
                  <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${sortOrder !== 'newest' ? 'text-purple-500' : 'text-gray-400'}`}>
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* List View Container */}
            <div className="flex-1 overflow-y-auto w-full">
              {isLoading ? (
                <div className="flex flex-col gap-4 mt-4 w-full h-full justify-center items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin"></div>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-300">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">Sin resultados</h3>
                  <p className="text-gray-500 text-[15px]">No encontramos discos que coincidan con tu búsqueda.</p>
                </div>
              ) : (
                <ul className="flex flex-col pb-24 w-full bg-white">
                  {filteredRecords.map(record => (
                    <li
                      key={record.id}
                      onClick={() => handleRowClick(record)}
                      className={`group flex items-center gap-3.5 px-4 py-3 bg-white active:bg-gray-50 border-b border-gray-100 transition-colors cursor-pointer w-full ${record.stock <= 0 ? 'opacity-50 grayscale' : ''}`}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-14 h-14 rounded-[10px] flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden border border-black/5 bg-gray-100">
                        {record.cover_image ? (
                          <img src={record.cover_image} alt={record.album} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-300">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-6.184 1.707a1.125 1.125 0 01-1.426-.948L9.5 9m6.5 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-6.184 1.707a1.125 1.125 0 01-1.426-.948L9.5 9M18 6.553V3.75A2.25 2.25 0 0015.75 1.5L8.536 3.5m0 0a2.25 2.25 0 00-1.632-1.213A2.25 2.25 0 004.5 4.5v3.75a2.25 2.25 0 001.632 2.163l6.184 1.707a1.125 1.125 0 001.426-.948L8.536 3.5z" />
                            </svg>
                          </div>
                        )}
                        <div className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-bl-[10px] border-b border-l border-white/50 ${record.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      </div>

                      {/* Info */}
                      <div className="flex flex-col flex-1 min-w-0 justify-center gap-0.5">
                        <h3 className="text-[16px] font-semibold text-gray-900 truncate leading-tight tracking-tight">
                          {record.album || 'Sin Título'}
                        </h3>
                        <p className="text-[13px] text-gray-500 truncate font-medium">
                          {record.artist || 'Artista Desconocido'}
                        </p>
                        <span className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mt-0.5">
                          {record.sku || 'N/A'}
                        </span>
                      </div>

                      {/* Price & Stock info in List */}
                      <div className="flex flex-col items-end flex-shrink-0 pl-3">
                        {record.is_rsd_discount ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="text-[11px] text-gray-400 line-through leading-none">
                              {record.price || 0} DKK
                            </div>
                            <div className="text-[16px] font-semibold text-orange-500 tracking-tight leading-none">
                              {getEffectivePrice(record)} DKK
                            </div>
                            <div className="bg-orange-500 text-white text-[8px] font-black px-1 rounded-full mt-0.5 uppercase">RSD</div>
                          </div>
                        ) : (
                          <div className="text-[16px] font-semibold text-brand-orange tracking-tight px-1">
                            {record.price || 0} DKK
                          </div>
                        )}

                        {(record.stock > 0) ? (
                          <span className="text-[11px] font-medium text-gray-400 mt-1">Disp. {record.stock}</span>
                        ) : (
                          <span className="text-[11px] font-medium text-red-500 mt-1">Agotado</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )
              }
            </div>
          </div >
        )
        }

        {/* Home View - Full background image */}
        {activeTab === 'home' && (
          <div className="relative flex flex-col h-full w-full flex-1 min-h-full">
            {/* Full-bleed background image */}
            <img
              src="/home-bg.png"
              alt="El Cuartito Background"
              className="absolute inset-0 w-full h-full object-cover z-0"
            />

            {/* Buttons at the bottom */}
            <div className="mt-auto relative z-10 px-6 pb-24 pt-8">
              <div className="grid grid-cols-2 gap-3 w-full">
                <div
                  onClick={() => setActiveTab('search')}
                  className="bg-white/85 backdrop-blur-md rounded-[18px] p-4 flex flex-col items-center justify-center gap-2.5 active:scale-[0.96] transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                >
                  <div className="p-3 rounded-full bg-brand-orange/15 text-brand-orange">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  </div>
                  <span className="text-[13px] font-semibold text-gray-800 tracking-wide">Tienda</span>
                </div>
                <div
                  onClick={openSalesHistory}
                  className="bg-white/85 backdrop-blur-md rounded-[18px] p-4 flex flex-col items-center justify-center gap-2.5 active:scale-[0.96] transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                >
                  <div className="p-3 rounded-full bg-green-500/15 text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-[13px] font-semibold text-gray-800 tracking-wide">Historial</span>
                </div>
              </div>
            </div>
          </div>
        )
        }

        {/* Sales History Modal */}
        {isSalesHistoryOpen && (
          <div className="fixed inset-0 z-[60] flex justify-center bg-black/30">
            <div className="flex flex-col w-full max-w-md bg-[#f8f9fa] h-full">
              {/* Sales History Header */}
              <div className="bg-white px-4 pb-3 pt-safe border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                <button
                  onClick={() => setIsSalesHistoryOpen(false)}
                  className="text-brand-orange text-[15px] font-medium"
                >
                  ← Volver
                </button>
                <h2 className="text-[17px] font-semibold text-gray-900">Historial de Ventas</h2>
                <button
                  onClick={fetchSalesHistory}
                  className="text-brand-orange text-[15px] font-medium"
                >
                  ↻
                </button>
              </div>

              {/* Sales List */}
              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
                {isLoadingSales ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin"></div>
                    <p className="text-[13px] text-gray-400 mt-3 font-medium">Cargando ventas...</p>
                  </div>
                ) : salesHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-gray-300 mb-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-[17px] font-semibold text-gray-900 mb-1">Sin ventas registradas</p>
                    <p className="text-[15px] text-gray-500">Las ventas procesadas aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {salesHistory.map(sale => {
                      const total = sale.total_amount || sale.total || 0;
                      const itemCount = sale.items?.length || 0;
                      const firstItem = sale.items?.[0];
                      const date = sale.date || (sale.timestamp?.toDate ? sale.timestamp.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha');
                      const channel = sale.channel || 'local';
                      const method = sale.paymentMethod || sale.payment_method || '—';
                      const status = sale.status || 'completed';

                      const channelLabel = {
                        'tienda': 'Tienda',
                        'local': 'Local',
                        'feria': 'Feria',
                        'online': 'Online',
                        'discogs': 'Discogs'
                      }[channel] || channel;

                      const statusColor = {
                        'completed': 'bg-green-50 text-green-700',
                        'PENDING': 'bg-yellow-50 text-yellow-700',
                        'cancelled': 'bg-red-50 text-red-600',
                      }[status] || 'bg-gray-50 text-gray-600';

                      return (
                        <div key={sale.id} className="bg-white rounded-[16px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100">
                          {/* Top row: date + total */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[13px] font-medium text-gray-500">{date}</span>
                            <span className="text-[17px] font-semibold text-gray-900">{total} <span className="text-[12px] text-gray-400 font-medium">DKK</span></span>
                          </div>

                          {/* Items summary */}
                          <div className="flex flex-col gap-1 mb-3">
                            {(sale.items || []).slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="text-[14px] text-gray-700 truncate flex-1 pr-4">
                                  {item.album || item.title || 'Artículo'}
                                </span>
                                <span className="text-[13px] text-gray-400 flex-shrink-0">
                                  {item.qty || item.quantity || 1}x {item.unitPrice || item.priceAtSale || 0} DKK
                                </span>
                              </div>
                            ))}
                            {itemCount > 3 && (
                              <span className="text-[12px] text-gray-400 font-medium">+{itemCount - 3} más</span>
                            )}
                          </div>

                          {/* Bottom tags */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                              {status === 'completed' ? '✓ Completada' : status === 'PENDING' ? '⏳ Pendiente' : status}
                            </span>
                            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {channelLabel}
                            </span>
                            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {method}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cart Tab content */}
        {
          activeTab === 'cart' && (
            <div className="flex flex-col h-full w-full bg-[#f8f9fa] min-h-[100dvh]">
              {/* Cart Header - White with orange logo */}
              <div className="bg-white px-4 pb-3 pt-safe sticky top-0 z-20 border-b border-gray-100 flex flex-col items-center justify-center">
                <div className="flex items-center h-6 w-auto">
                  <img src="/logo.png" alt="El Cuartito Logo" className="h-full object-contain" />
                </div>
                <h2 className="text-[13px] font-medium text-gray-400 mt-1">Tu Carrito</h2>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-32 pt-6 w-full max-w-md mx-auto">
                {cart.length === 0 ? (
                  <div className="flex flex-col h-full mt-20 items-center justify-start text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-300">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <p className="font-semibold text-gray-900 text-[17px] mb-1">Tu carrito está vacío</p>
                    <p className="text-[15px] font-medium text-gray-500">Agrega discos para proceder al cobro.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 w-full">
                    {/* Items List - Inset Grouped */}
                    <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden break-inside-avoid">
                      <ul className="flex flex-col">
                        {liveCart.map((item, index) => (
                          <li key={item.id} className={`flex items-center gap-3.5 p-3 px-4 bg-white ${index !== liveCart.length - 1 ? 'border-b border-gray-100/80' : ''}`}>
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                              {item.cover_image ? (
                                <img src={item.cover_image} alt={item.album} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-4 h-4 text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-6.184 1.707a1.125 1.125 0 01-1.426-.948L9.5 9m6.5 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-6.184 1.707a1.125 1.125 0 01-1.426-.948L9.5 9M18 6.553V3.75A2.25 2.25 0 0015.75 1.5L8.536 3.5m0 0a2.25 2.25 0 00-1.632-1.213A2.25 2.25 0 004.5 4.5v3.75a2.25 2.25 0 001.632 2.163l6.184 1.707a1.125 1.125 0 001.426-.948L8.536 3.5z" /></svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <h3 className="text-[15px] font-semibold text-gray-900 truncate leading-tight tracking-tight">{item.album || 'Sin Título'}</h3>
                              <p className="text-[13px] text-gray-500 truncate font-medium mt-0.5">{item.artist || 'Artista Desconocido'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {item.is_rsd_discount ? (
                                  <>
                                    <span className="text-[12px] text-gray-400 line-through">{item.price || 0} DKK</span>
                                    <span className="text-[14px] font-semibold text-orange-500">{getEffectivePrice(item)} DKK</span>
                                    <span className="text-[9px] bg-orange-500 text-white font-black px-1.5 py-0.5 rounded-full">RSD</span>
                                  </>
                                ) : (
                                  <span className="text-[14px] font-semibold text-brand-orange">{item.price || 0} DKK</span>
                                )}
                                <span className="text-[11px] font-semibold text-gray-400">x{item.quantity}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Checkout summary */}
                    <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col gap-4">
                      <div className="flex justify-between items-center text-[17px]">
                        <span className="font-semibold text-gray-800">Total</span>
                        <span className="text-[22px] font-semibold text-gray-900">{liveCart.reduce((sum, item) => sum + getEffectivePrice(item) * item.quantity, 0)} <span className="text-[13px] text-gray-400 font-semibold ml-0.5">DKK</span></span>
                      </div>
                      <button
                        onClick={() => setIsCheckoutModalOpen(true)}
                        className="w-full py-4 bg-brand-orange text-white rounded-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-[17px] shadow-sm"
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }
      </main >

      {/* Bottom Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-t border-gray-200 px-6 pt-2 pb-safe flex justify-around items-center z-30 fixed bottom-0 w-full max-w-md shadow-[0_-1px_3px_rgba(0,0,0,0.02)]">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 min-w-[4rem] transition-colors ${activeTab === 'home' ? 'text-brand-orange' : 'text-gray-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke={activeTab === 'home' ? 'none' : 'currentColor'} strokeWidth={1.5} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-[10px] font-medium tracking-wide mt-0.5">Inicio</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 min-w-[4rem] transition-colors ${activeTab === 'search' ? 'text-brand-orange' : 'text-gray-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={activeTab === 'search' ? 'currentColor' : 'none'} stroke={activeTab === 'search' ? 'none' : 'currentColor'} strokeWidth={1.5} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="text-[10px] font-medium tracking-wide mt-0.5">Buscar</span>
        </button>

        <button
          onClick={() => setActiveTab('cart')}
          className={`relative flex flex-col items-center gap-1 min-w-[4rem] transition-colors ${activeTab === 'cart' ? 'text-brand-orange' : 'text-gray-400'}`}
        >
          {liveCart.length > 0 && (
            <div className="absolute -top-1 right-2.5 bg-brand-orange text-white text-[10px] font-bold rounded-full min-w-[17px] h-[17px] px-1 flex items-center justify-center ring-2 ring-white shadow-sm">
              {liveCart.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={activeTab === 'cart' ? 'currentColor' : 'none'} stroke={activeTab === 'cart' ? 'none' : 'currentColor'} strokeWidth={1.5} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <span className="text-[10px] font-medium tracking-wide mt-0.5">Carrito</span>
        </button>
      </nav>

      {/* POS Checkout Terminal Modal */}
      {
        isCheckoutModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
              onClick={() => setIsCheckoutModalOpen(false)}
            ></div>

            <div className="relative w-full max-w-md bg-white text-gray-900 rounded-t-[32px] sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-12 sm:pb-6 animate-fade-in-up transform transition-all flex flex-col gap-6 z-[70] max-h-[90vh] overflow-y-auto">
              {/* iOS Handle */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full sm:hidden"></div>

              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="flex flex-col items-center justify-center pt-2 mb-2">
                <h3 className="text-[20px] font-semibold text-gray-900 leading-tight">Cobro en Caja</h3>
                <p className="text-[13px] text-gray-500 font-medium mt-0.5">Confirma los datos</p>
              </div>

              {/* Total Pricing Box */}
              {(() => {
                const cartTotal = liveCart.reduce((sum, item) => sum + getEffectivePrice(item) * item.quantity, 0);
                const totalItems = liveCart.reduce((sum, item) => sum + item.quantity, 0);
                const finalTotal = (rsdExtraDiscount && totalItems >= 3) ? Math.round(cartTotal * 0.95) : cartTotal;
                return (
                  <div className="bg-gray-50/80 rounded-[20px] p-6 flex flex-col gap-2 items-center justify-center">
                    <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-widest">Total a Cobrar</span>
                    {rsdExtraDiscount && totalItems >= 3 && (
                      <span className="text-[13px] text-gray-400 line-through">{cartTotal} DKK</span>
                    )}
                    <div className="text-[40px] font-bold text-gray-900 tracking-tight leading-none mt-1">
                      {finalTotal} <span className="text-[20px] text-gray-400 font-semibold">DKK</span>
                    </div>
                    {rsdExtraDiscount && totalItems >= 3 && (
                      <span className="text-[12px] text-orange-500 font-semibold">-5% RSD aplicado</span>
                    )}
                  </div>
                );
              })()}

              {/* Method Grid */}
              <div className="flex flex-col gap-3">
                <label className="text-[12px] font-semibold text-gray-400 uppercase ml-1">Método de Pago</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setPaymentMethod('MobilePay')}
                    className={`flex flex-col items-center justify-center p-4 rounded-[16px] border transition-all gap-2
                    ${paymentMethod === 'MobilePay'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-600'
                        : 'border-gray-100 bg-white hover:border-gray-200 text-gray-500'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                    <span className="text-[11px] font-semibold">MobilePay</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('Tarjeta')}
                    className={`flex flex-col items-center justify-center p-4 rounded-[16px] border transition-all gap-2
                    ${paymentMethod === 'Tarjeta'
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-600'
                        : 'border-gray-100 bg-white hover:border-gray-200 text-gray-500'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <span className="text-[11px] font-semibold">Tarjeta</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('Efectivo')}
                    className={`flex flex-col items-center justify-center p-4 rounded-[16px] border transition-all gap-2
                    ${paymentMethod === 'Efectivo'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-600'
                        : 'border-gray-100 bg-white hover:border-gray-200 text-gray-500'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                    <span className="text-[11px] font-semibold">Efectivo</span>
                  </button>
                </div>
              </div>

              {/* RSD 5% Extra Toggle */}
              {(() => {
                const totalItems = liveCart.reduce((sum, item) => sum + item.quantity, 0);
                const canApply = totalItems >= 3;
                return (
                  <div className={`flex items-center justify-between p-4 rounded-[16px] border transition-all ${canApply ? 'border-orange-200 bg-orange-50/60' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                    <div className="flex flex-col">
                      <span className={`text-[14px] font-semibold ${canApply ? 'text-orange-700' : 'text-gray-400'}`}>🎉 Aplicar 5% extra RSD</span>
                      {!canApply && <span className="text-[11px] text-gray-400 font-medium mt-0.5">Mínimo 3 ítems en el carrito</span>}
                    </div>
                    <button
                      disabled={!canApply}
                      onClick={() => canApply && setRsdExtraDiscount(prev => !prev)}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${
                        rsdExtraDiscount && canApply ? 'bg-orange-500' : 'bg-gray-200'
                      } ${!canApply ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        rsdExtraDiscount && canApply ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                );
              })()}

              {/* Sub configuration */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold text-gray-400 uppercase ml-1">Canal de Venta</label>
                <div className="relative">
                  <select
                    value={paymentChannel}
                    onChange={(e) => setPaymentChannel(e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-[14px] font-semibold text-[15px] text-gray-800 outline-none focus:border-brand-orange transition-colors appearance-none"
                  >
                    <option value="tienda">Tienda / Local</option>
                    <option value="feria">Feria / Evento</option>
                    <option value="discogs">Discogs Local</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* MobilePay QR Code - shown when MobilePay is selected */}
              {paymentMethod === 'MobilePay' && (
                <div className="flex flex-col items-center gap-3 bg-gray-50/80 rounded-[20px] p-5 border border-gray-100">
                  <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-widest">Escanea con MobilePay</span>
                  <img src="/mobilepay-qr.png" alt="MobilePay QR Code" className="w-48 h-48 object-contain rounded-xl" />
                  <span className="text-[13px] text-gray-500 font-medium">El cliente escanea este QR para pagar</span>
                </div>
              )}
              <div className="pt-4">
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-4 bg-[#1c1c1e] hover:bg-black text-white rounded-[16px] font-semibold flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-[17px] shadow-md"
                >
                  {isCheckingOut ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.724.092m6.524-4.659A15.455 15.455 0 017.5 18c2.4 0 4.5-.45 6.22-1.22M12 9A3 3 0 1012 3a3 3 0 000 6z" />
                      </svg>
                      Confirmar y Pagar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Item Detail Modal (Bottom Sheet) */}
      {
        selectedRecord && (
          <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
              onClick={() => setSelectedRecord(null)}
            ></div>

            {/* Modal Panel */}
            <div className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-12 sm:pb-6 animate-fade-in-up transform transition-all flex flex-col gap-5 z-50 max-h-[85vh] overflow-y-auto">
              {/* Top Handle */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full sm:hidden"></div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="absolute top-5 right-5 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header info */}
              <div className="flex flex-col items-center text-center mt-6">
                <div className="w-40 h-40 rounded-[20px] overflow-hidden shadow-md flex-shrink-0 bg-gray-100 mb-4 border border-black/5">
                  {selectedRecord.cover_image ? (
                    <img src={selectedRecord.cover_image} alt={selectedRecord.album} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-gray-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-6.184 1.707a1.125 1.125 0 01-1.426-.948L9.5 9m6.5 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-6.184 1.707a1.125 1.125 0 01-1.426-.948L9.5 9M18 6.553V3.75A2.25 2.25 0 0015.75 1.5L8.536 3.5m0 0a2.25 2.25 0 00-1.632-1.213A2.25 2.25 0 004.5 4.5v3.75a2.25 2.25 0 001.632 2.163l6.184 1.707a1.125 1.125 0 001.426-.948L8.536 3.5z" />
                      </svg>
                    </div>
                  )}
                </div>

                <h2 className="text-[22px] font-semibold text-gray-900 leading-tight mb-1 truncate px-4 w-full">
                  {selectedRecord.album || 'Sin Título'}
                </h2>
                <p className="text-[15px] font-medium text-gray-500 truncate mb-1 px-4 w-full">
                  {selectedRecord.artist || 'Artista Desconocido'}
                </p>
                <div className="bg-gray-100 px-2.5 py-1 rounded-[6px] mt-2 inline-flex">
                  <span className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
                    SKU: {selectedRecord.sku || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Grid Stats */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-gray-50 rounded-[16px] p-4 flex flex-col items-center justify-center border border-gray-100">
                  <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Precio</span>
                  {selectedRecord.is_rsd_discount ? (
                    <div className="flex flex-col items-center">
                      <div className="text-[13px] text-gray-400 line-through leading-none mb-1">
                        {selectedRecord.price || 0} DKK
                      </div>
                      <div className="text-[22px] font-bold text-orange-500 leading-none">
                        {getEffectivePrice(selectedRecord)} <span className="text-[13px] text-orange-400 font-semibold inline-block translate-y-[-1px]">DKK</span>
                      </div>
                      <div className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-widest">RSD -10%</div>
                    </div>
                  ) : (
                    <div className="text-[22px] font-bold text-gray-900">{selectedRecord.price || 0} <span className="text-[13px] text-gray-400 font-semibold inline-block translate-y-[-1px]">DKK</span></div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-[16px] p-4 flex flex-col items-center justify-center border border-gray-100">
                  <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Stock</span>
                  <div className="flex items-center gap-1.5 h-[33px]">
                    {selectedRecord.stock > 0 ? (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-[22px] font-bold text-gray-900 leading-none">{selectedRecord.stock}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <span className="text-[18px] font-bold text-red-500 leading-none tracking-tight">Agotado</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-gray-50 border border-gray-100 rounded-[16px] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-500">Género</span>
                  <span className="text-[13px] font-semibold text-gray-900">{selectedRecord.genre || 'N/A'}</span>
                </div>
                <div className="w-full h-px bg-gray-200"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-500">Sello</span>
                  <span className="text-[13px] font-semibold text-gray-900 truncate max-w-[140px]">{selectedRecord.label || selectedRecord.sello || 'N/A'}</span>
                </div>
                <div className="w-full h-px bg-gray-200"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-500">Propietario / Ubicación</span>
                  <span className="text-[13px] font-semibold text-gray-900">
                    {selectedRecord.owner || 'Tienda'} • {selectedRecord.storageLocation || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  onClick={(e) => handleAddToCart(selectedRecord, e)}
                  disabled={selectedRecord.stock <= 0}
                  className={`w-full py-4 rounded-[16px] flex items-center justify-center gap-2 transition-all font-semibold text-[17px] shadow-sm ${selectedRecord.stock <= 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-brand-orange text-white active:scale-[0.98]'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
                  </svg>
                  <span>{selectedRecord.stock <= 0 ? 'Sin Stock' : 'Agregar al carrito'}</span>
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Toast Notification */}
      {
        toastMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border ${toastMessage.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-50'
              : 'bg-rose-500/20 border-rose-500/30 text-rose-50'
              }`}>
              <span className="text-sm font-bold tracking-wide">{toastMessage.text}</span>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default App;
