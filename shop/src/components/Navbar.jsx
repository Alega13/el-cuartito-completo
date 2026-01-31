import React, { useState, useRef, useEffect } from 'react';
import { Search, Menu, X, ArrowLeft, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelections } from '../context/SelectionsContext';
import { useCart } from '../context/CartContext';
import CartDrawer from './CartDrawer';
import logo from '../assets/logo.png';

const Navbar = ({ setSearchQuery }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const inputRef = useRef(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { totalItems } = useCart();
    const { totalItems: _unused, selectionCount } = useSelections();

    const location = useLocation();
    const navigate = useNavigate();
    const { navTargetRef } = useSelections();

    // Check if we're in listening room mode
    const isListeningMode = location.pathname === '/listening';
    const isHome = location.pathname === '/';

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleCloseSearch = () => {
        setIsSearchOpen(false);
        setSearchQuery('');
    };

    // Minimized navbar for Listening Room - Expandable arrow design
    if (isListeningMode) {
        return (
            <nav className="fixed top-4 left-0 z-50 group">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center"
                >
                    {/* Arrow button - always visible */}
                    <div
                        className="listening-nav-trigger"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            background: 'rgba(40, 40, 40, 0.95)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '0 20px 20px 0',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <ArrowLeft size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                    </div>

                    {/* Expandable menu - shows on hover */}
                    <div
                        className="listening-nav-menu"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            background: 'rgba(40, 40, 40, 0.95)',
                            backdropFilter: 'blur(10px)',
                            padding: '8px 20px 8px 0',
                            borderRadius: '0 20px 20px 0',
                            marginLeft: '-20px',
                            maxWidth: '0',
                            overflow: 'hidden',
                            opacity: '0',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <img src={logo} alt="El Cuartito" style={{ height: '24px', width: 'auto' }} />
                        <Link
                            to="/"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '11px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'color 0.2s',
                                textDecoration: 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#fff'}
                            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
                        >
                            Home
                        </Link>
                        <Link
                            to="/listening"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '11px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'color 0.2s',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#fff'}
                            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
                        >
                            Listening Room
                            {selectionCount > 0 && (
                                <span style={{
                                    background: '#000',
                                    color: '#fff',
                                    fontSize: '9px',
                                    fontWeight: 'bold',
                                    padding: '1px 4px',
                                    borderRadius: '10px',
                                    minWidth: '14px',
                                    textAlign: 'center'
                                }}>
                                    {selectionCount}
                                </span>
                            )}
                        </Link>
                        <Link
                            to="/catalog"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '11px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'color 0.2s',
                                textDecoration: 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#fff'}
                            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
                        >
                            Catalog
                        </Link>
                        <Link
                            to="/collections"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '11px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'color 0.2s',
                                textDecoration: 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#fff'}
                            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.7)'}
                        >
                            Collections
                        </Link>
                    </div>
                </motion.div>

                {/* CSS-in-JS styles for hover effect */}
                <style>{`
                    .listening-nav-trigger:hover + .listening-nav-menu,
                    .listening-nav-menu:hover {
                        max-width: 400px !important;
                        opacity: 1 !important;
                        padding-left: 16px !important;
                    }
                    .group:hover .listening-nav-trigger {
                        border-radius: 0 !important;
                        background: transparent !important;
                    }
                    .group:hover .listening-nav-menu {
                        max-width: 400px !important;
                        opacity: 1 !important;
                        padding-left: 16px !important;
                        margin-left: -40px !important;
                        padding-left: 56px !important;
                    }
                `}</style>
            </nav>
        );
    }

    return (
        <>
            <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-6">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    layout
                    className="bg-white/80 backdrop-blur-md px-5 md:px-8 py-3 rounded-full shadow-2xl border border-white/50 flex items-center gap-3 md:gap-6 overflow-hidden max-w-[95vw]"
                >
                    <AnimatePresence mode="wait">
                        {isSearchOpen ? (
                            <motion.div
                                key="search-bar"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="flex items-center gap-2 w-full md:w-[400px]"
                            >
                                <Search size={18} className="text-black/40 flex-shrink-0" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search artist, album..."
                                    className="bg-transparent border-none outline-none text-sm font-medium w-full placeholder:text-black/30"
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button onClick={handleCloseSearch} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                                    <X size={16} />
                                </button>
                            </motion.div>
                        ) : (
                            <>
                                <motion.div className="flex items-center gap-2 md:gap-4 mr-2 md:mr-6">
                                    {!isHome && (
                                        <motion.button
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            onClick={() => navigate('/')}
                                            className="p-1 hover:bg-black/5 rounded-full transition-colors"
                                        >
                                            <ArrowLeft size={18} />
                                        </motion.button>
                                    )}

                                    <motion.div
                                        key="logo"
                                        layout="position"
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center"
                                    >
                                        <Link to="/">
                                            <img src={logo} alt="El Cuartito" className="h-8 md:h-10 w-auto object-contain cursor-pointer" />
                                        </Link>
                                    </motion.div>
                                </motion.div>

                                <motion.div
                                    key="menu"
                                    layout="position"
                                    className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest flex-shrink-0"
                                >
                                    <Link to="/listening" ref={navTargetRef} className="hover:opacity-40 transition-opacity flex items-center gap-1.5">
                                        Listening Room
                                        {selectionCount > 0 && (
                                            <span className="bg-black text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[16px] flex items-center justify-center">
                                                {selectionCount}
                                            </span>
                                        )}
                                    </Link>
                                    <Link to="/catalog" className="hover:opacity-40 transition-opacity">Catalog</Link>
                                    <Link to="/collections" className="hover:opacity-40 transition-opacity">Collections</Link>
                                </motion.div>

                                <motion.div key="actions" layout="position" className="flex items-center gap-4 flex-shrink-0 ml-auto">
                                    <button
                                        onClick={() => {
                                            setIsSearchOpen(true);
                                            const catalogueSection = document.getElementById('catalogue');
                                            if (catalogueSection) {
                                                catalogueSection.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                        className="p-2 hover:bg-black/5 rounded-full transition-colors font-bold"
                                    >
                                        <Search size={18} strokeWidth={2.5} />
                                    </button>
                                    {/* Cart */}
                                    <button
                                        onClick={() => setIsCartOpen(true)}
                                        className="relative p-2 hover:bg-black/5 rounded-full transition-colors font-bold"
                                    >
                                        <ShoppingBag size={18} strokeWidth={2.5} />
                                        {totalItems > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                {totalItems}
                                            </span>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setIsMobileMenuOpen(true)}
                                        className="md:hidden p-2 hover:bg-black/5 rounded-full transition-colors"
                                    >
                                        <Menu size={18} strokeWidth={2.5} />
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </motion.div>
            </nav>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: '-100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '-100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 bg-white z-[60] flex flex-col p-6"
                    >
                        <div className="flex justify-between items-center mb-12">
                            <img src={logo} alt="El Cuartito" className="h-10 w-auto object-contain" />
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 bg-black/5 rounded-full hover:bg-black/10"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-8 text-3xl font-bold uppercase tracking-tighter">
                            <Link to="/listening" onClick={() => setIsMobileMenuOpen(false)} className="text-left hover:text-accent transition-colors flex items-center justify-between">
                                Listening Room
                                {selectionCount > 0 && (
                                    <span className="bg-black text-white text-sm px-3 py-1 rounded-full">
                                        {selectionCount}
                                    </span>
                                )}
                            </Link>
                            <Link to="/catalog" onClick={() => setIsMobileMenuOpen(false)} className="text-left hover:text-accent transition-colors">Catalog</Link>
                            <Link to="/collections" onClick={() => setIsMobileMenuOpen(false)} className="text-left hover:text-accent transition-colors">Collections</Link>
                        </div>

                        <div className="mt-auto text-sm font-medium text-black/40">
                            <p>Based in Copenhaguen, Vesterbro.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Drawer */}
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </>
    );
};

export default Navbar;
