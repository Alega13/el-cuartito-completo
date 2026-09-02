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
    const [hasScrolled, setHasScrolled] = useState(false);
    const { totalItems } = useCart();
    const { totalItems: _unused, selectionCount } = useSelections();

    const location = useLocation();
    const navigate = useNavigate();
    const { navTargetRef } = useSelections();

    const isAbout = location.pathname === '/about';
    const isHome = location.pathname === '/';
    const isCheckout = location.pathname.startsWith('/checkout');
    const isBackMode = isCheckout || location.pathname.startsWith('/product');

    // Track scroll to show/hide mobile navbar
    useEffect(() => {
        const handleScroll = () => {
            setHasScrolled(window.scrollY > 80);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // check initial state
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleCloseSearch = () => {
        setIsSearchOpen(false);
        setSearchQuery('');
    };



    const handleScrollToCatalog = (e) => {
        if (e) e.preventDefault();
        
        if (location.pathname !== '/') {
            navigate('/');
            setTimeout(() => {
                const el = document.getElementById('catalogue');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            const el = document.getElementById('catalogue');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 w-full px-4 py-4 md:px-20 md:py-8 transition-colors duration-300 text-black ${!hasScrolled ? 'bg-[#F3F3F3]' : 'bg-transparent pointer-events-none'}`}>
                <div className="flex items-center justify-between">
                    {/* Left: SHOP or BACK */}
                    <div className="flex items-center gap-4 flex-1">
                        {!isBackMode ? (
                            <>
                                <a 
                                    href="#catalogue" 
                                    onClick={handleScrollToCatalog} 
                                    className={`text-sm md:text-xs font-light md:font-bold uppercase tracking-widest md:tracking-tight hover:opacity-60 transition-opacity duration-300 pointer-events-auto ${hasScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                >
                                    SHOP
                                </a>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate(-1)}
                                className={`flex items-center gap-1 hover:opacity-60 transition-opacity duration-300 pointer-events-auto`}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                <span className="text-sm md:text-xs font-light md:font-bold uppercase tracking-widest md:tracking-tight">BACK</span>
                            </button>
                        )}
                    </div>

                    {/* Center: Logo */}
                    <div className="flex-1 flex justify-center">
                        <Link 
                            to="/" 
                            className={`hover:opacity-80 transition-opacity duration-300 ${hasScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
                        >
                            <img src={logo} alt="El Cuartito" className="h-6 md:h-10 w-auto object-contain" />
                        </Link>
                    </div>

                    {/* Right: Empty for now (Search removed) */}
                    <div className="flex items-center gap-6 flex-1 justify-end">
                        
                    </div>
                </div>
            </nav>

            {/* A24 Style Fixed Right Edge Cart */}
            {!isCheckout && (
                <button
                    onClick={() => setIsCartOpen(true)}
                    className="fixed right-4 md:right-16 top-5 md:top-10 z-50 hover:opacity-60 transition-opacity"
                >
                    <AnimatePresence mode="wait">
                        {!hasScrolled ? (
                            <motion.div
                                key="top-cart"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-end"
                            >
                                {/* Mobile: inline CART + number */}
                                <div className="flex md:hidden items-center gap-2">
                                    <span className="text-sm font-light uppercase tracking-widest text-black leading-none">CART</span>
                                    <span className="text-sm font-light leading-none">{totalItems}</span>
                                </div>
                                {/* Desktop: CART with corner lines */}
                                <div className="hidden md:flex flex-col items-end">
                                    <div className="flex items-start">
                                        <span className="text-base font-light uppercase tracking-widest text-black mr-3 leading-none">CART</span>
                                        <div className="w-12 h-12 border-t border-r border-black mt-[6px]"></div>
                                    </div>
                                    <div className="pr-px mt-2">
                                        <span className="text-sm font-bold leading-none inline-block translate-x-1/2">{totalItems}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="scrolled-cart"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center gap-4"
                            >
                                <span 
                                    className="text-sm md:text-base font-light uppercase tracking-widest text-black" 
                                    style={{ writingMode: 'vertical-rl' }}
                                >
                                    CART
                                </span>
                                <div className="h-6 border-l border-black"></div>
                                <span className="text-sm md:text-base font-light leading-none">{totalItems}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </button>
            )}

            {/* Cart Drawer */}
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </>
    );
};

export default Navbar;
