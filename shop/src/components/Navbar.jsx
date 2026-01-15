import React, { useState, useRef, useEffect } from 'react';
import { Search, Menu, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

const Navbar = ({ page, setPage, setSearchQuery }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const inputRef = useRef(null);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleCloseSearch = () => {
        setIsSearchOpen(false);
        setSearchQuery('');
    };

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
                                    {page !== 'home' && (
                                        <motion.button
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            onClick={() => setPage('home')}
                                            className="p-1 hover:bg-black/5 rounded-full transition-colors"
                                        >
                                            <ArrowLeft size={18} />
                                        </motion.button>
                                    )}

                                    <motion.button
                                        key="logo"
                                        layout="position"
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setPage('home')}
                                        className="flex items-center"
                                    >
                                        <img src={logo} alt="El Cuartito" className="h-8 md:h-10 w-auto object-contain" />
                                    </motion.button>
                                </motion.div>

                                <motion.div
                                    key="menu"
                                    layout="position"
                                    className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest flex-shrink-0"
                                >
                                    <button onClick={() => setPage('listening')} className="hover:opacity-40 transition-opacity">Listening Room</button>
                                    <button onClick={() => setPage('catalog')} className="hover:opacity-40 transition-opacity">Catalog</button>
                                    <button onClick={() => setPage('collections')} className="hover:opacity-40 transition-opacity">Collections</button>
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
                            <button onClick={() => { setPage('listening'); setIsMobileMenuOpen(false); }} className="text-left hover:text-accent transition-colors">Listening Room</button>
                            <button onClick={() => { setPage('catalog'); setIsMobileMenuOpen(false); }} className="text-left hover:text-accent transition-colors">Catalog</button>
                            <button onClick={() => { setPage('collections'); setIsMobileMenuOpen(false); }} className="text-left hover:text-accent transition-colors">Collections</button>
                        </div>

                        <div className="mt-auto text-sm font-medium text-black/40">
                            <p>Based in Copenhaguen, Vesterbro.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
