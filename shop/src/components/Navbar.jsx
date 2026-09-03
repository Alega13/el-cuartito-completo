import React, { useState, useRef, useEffect } from 'react';
import { Search, Menu, X, ArrowLeft, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelections } from '../context/SelectionsContext';
import { useCart } from '../context/CartContext';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import CartDrawer from './CartDrawer';
import logo from '../assets/logo.png';

const Navbar = ({ setSearchQuery }) => {
    const { currentUser } = useAuth();
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

    const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

    const isDarkPage = location.pathname === '/about' || location.pathname === '/shipping';
    const isAbout = location.pathname === '/about';
    const isHome = location.pathname === '/';
    const isAccount = location.pathname.startsWith('/account');
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

    const navTextColor = isDarkPage ? 'text-[#F3F3F3]' : 'text-black';
    const cornerBorderColor = isDarkPage ? 'border-[#F3F3F3]' : 'border-black';

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 w-full px-4 py-4 md:px-20 md:py-8 transition-colors duration-300 bg-transparent ${hasScrolled ? 'pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                    {/* Left: SHOP or BACK */}
                    <div className="flex items-center gap-4 flex-1">
                        {!isBackMode ? (
                            <div 
                                className="relative pointer-events-auto"
                                onMouseEnter={() => setIsShopMenuOpen(true)}
                                onMouseLeave={() => setIsShopMenuOpen(false)}
                            >
                                <a 
                                    href="#catalogue" 
                                    onClick={handleScrollToCatalog} 
                                    className={`text-sm md:text-base font-light uppercase tracking-widest ${navTextColor} hover:opacity-60 transition-opacity duration-300 block ${hasScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                >
                                    SHOP
                                </a>

                                <AnimatePresence>
                                    {isShopMenuOpen && !hasScrolled && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-full left-0 pt-3 flex flex-col space-y-3 whitespace-nowrap z-50 bg-transparent"
                                        >
                                            <Link
                                                to="/about"
                                                onClick={() => setIsShopMenuOpen(false)}
                                                className={`text-sm md:text-base font-light uppercase tracking-widest ${navTextColor} hover:opacity-60 transition-opacity duration-200 block`}
                                            >
                                                ABOUT US
                                            </Link>
                                            <Link
                                                to="/shipping"
                                                onClick={() => setIsShopMenuOpen(false)}
                                                className={`text-sm md:text-base font-light uppercase tracking-widest ${navTextColor} hover:opacity-60 transition-opacity duration-200 block`}
                                            >
                                                SHIPPING & RETURNS
                                            </Link>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate(-1)}
                                className={`flex items-center gap-1 ${navTextColor} hover:opacity-60 transition-opacity duration-300 pointer-events-auto`}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                <span className={`text-sm md:text-xs font-light md:font-bold uppercase tracking-widest md:tracking-tight ${navTextColor}`}>BACK</span>
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

                    {/* Right: Empty */}
                    <div className="flex items-center gap-6 flex-1 justify-end">
                        
                    </div>
                </div>
            </nav>

            {/* A24 Style Fixed Right Edge Cart & Account */}
            {!isCheckout && (
                <div className="fixed right-4 md:right-16 top-5 md:top-10 z-50 pointer-events-auto">
                    <AnimatePresence mode="wait">
                        {/* STATE 1: Not scrolled → corner-angle CART */}
                        {!hasScrolled && (
                            <motion.div
                                key="top-state"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-baseline gap-5 md:gap-8"
                            >
                                {/* CART with corner angle */}
                                <button onClick={() => setIsCartOpen(true)} className="hover:opacity-60 transition-opacity">
                                    {/* Mobile */}
                                    <div className="flex md:hidden items-center gap-2">
                                        <span className={`text-sm font-light uppercase tracking-widest ${navTextColor} leading-none`}>CART</span>
                                        <span className={`text-sm font-light leading-none ${navTextColor}`}>{totalItems}</span>
                                    </div>
                                    {/* Desktop */}
                                    <div className="hidden md:flex flex-col items-end">
                                        <div className="flex items-start">
                                            <span className={`text-base font-light uppercase tracking-widest ${navTextColor} mr-3 leading-none`}>CART</span>
                                            <div className={`w-12 h-12 border-t border-r ${cornerBorderColor} mt-[6px]`}></div>
                                        </div>
                                        <div className="pr-px mt-2">
                                            <span className={`text-sm font-bold leading-none inline-block translate-x-1/2 ${navTextColor}`}>{totalItems}</span>
                                        </div>
                                    </div>
                                </button>
                            </motion.div>
                        )}

                        {/* STATE 2: Scrolled → vertical CART */}
                        {hasScrolled && (
                            <motion.div
                                key="scrolled-state"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center gap-3"
                            >
                                {/* Vertical CART */}
                                <button onClick={() => setIsCartOpen(true)} className="hover:opacity-60 transition-opacity flex flex-col items-center gap-3">
                                    <span className={`text-sm md:text-base font-light uppercase tracking-widest ${navTextColor}`} style={{ writingMode: 'vertical-rl' }}>CART</span>
                                    <div className={`h-6 border-l ${cornerBorderColor}`}></div>
                                    <span className={`text-sm md:text-base font-light leading-none ${navTextColor}`}>{totalItems}</span>
                                </button>
                            </motion.div>
                        )}

                        {/* STATE 3: On /account → horizontal "MY ACCOUNT" + flat inline CART */}
                        {isAccount && (
                            <motion.div
                                key="account-state"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-baseline gap-5 md:gap-8"
                            >
                                {/* MY ACCOUNT text with dropdown */}
                                <div 
                                    className="relative"
                                    onMouseEnter={() => setIsAccountMenuOpen(true)}
                                    onMouseLeave={() => setIsAccountMenuOpen(false)}
                                >
                                    <Link
                                        to="/account"
                                        className={`text-sm md:text-base font-light uppercase tracking-widest text-black hover:opacity-60 transition-opacity duration-300 block`}
                                    >
                                        MY ACCOUNT
                                    </Link>

                                    <AnimatePresence>
                                        {isAccountMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 4 }}
                                                transition={{ duration: 0.2 }}
                                                className="absolute top-full left-0 pt-3 flex flex-col space-y-3 whitespace-nowrap z-50 bg-transparent text-left"
                                            >
                                                <Link to="/account" onClick={() => setIsAccountMenuOpen(false)} className="text-sm md:text-base font-light uppercase tracking-widest text-black hover:opacity-60 transition-opacity duration-200 block text-left">WISHLIST</Link>
                                                <button onClick={async () => { setIsAccountMenuOpen(false); await signOut(auth); navigate('/login'); }} className="text-sm md:text-base font-light uppercase tracking-widest text-black hover:opacity-60 transition-opacity duration-200 block text-left w-full">LOGOUT</button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Flat inline CART (no corner angle) */}
                                <button onClick={() => setIsCartOpen(true)} className="hover:opacity-60 transition-opacity flex items-baseline gap-2">
                                    <span className="text-sm md:text-base font-light uppercase tracking-widest text-black leading-none">CART</span>
                                    <span className="text-sm md:text-base font-light leading-none text-black">{totalItems}</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Cart Drawer */}
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </>
    );
};

export default Navbar;
