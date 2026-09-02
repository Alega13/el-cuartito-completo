import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import defaultImage from '../assets/default-vinyl.png';

const NewArrivals = ({ products }) => {
    const [startIndex, setStartIndex] = useState(0);

    if (!products || products.length === 0) return null;

    // Use only the 4 products starting from startIndex
    const displayProducts = products.slice(startIndex, startIndex + 4);

    const handleNext = () => {
        setStartIndex((prev) => {
            const next = prev + 4;
            return next >= products.length ? 0 : next;
        });
    };

    return (
        <section className="bg-[#F3F3F3] pb-12 relative px-10 md:px-20 overflow-hidden">
            {/* Top Line & Title */}
            <div className="border-t border-black pt-2 mb-12 md:mb-20">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-black">
                    NEW ARRIVALS
                </h2>
            </div>

            {/* Grid container */}
            <div className="relative">
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={startIndex}
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '-100%', opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 w-full"
                    >
                        {displayProducts.map((product) => (
                            <Link 
                                to={`/product/${product.id}`}
                                key={product.id}
                                className="flex flex-col group"
                            >
                                <div className="w-full aspect-square mb-8 flex items-center justify-center p-8 md:p-12 lg:p-16">
                                    <img
                                        src={product.cover_image || product.image || defaultImage}
                                        alt={product.album}
                                        className="w-full h-full object-contain mix-blend-multiply drop-shadow-xl transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => { e.currentTarget.src = defaultImage; }}
                                    />
                                </div>
                                
                                <div className="flex flex-col">
                                    {product.status === 'New' && (
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 mb-1">
                                            BRAND NEW
                                        </span>
                                    )}
                                    <h3 className="text-sm md:text-base font-bold text-black tracking-tight leading-tight mb-1">
                                        {product.album}
                                    </h3>
                                    <p className="text-xs font-bold text-black/50">
                                        {product.price ? `${product.price} DKK` : '40 DKK'}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {/* Right Arrow to navigate */}
                <button 
                    onClick={handleNext}
                    className="hidden md:flex absolute top-1/3 -right-8 -translate-y-1/2 hover:opacity-50 transition-opacity cursor-pointer focus:outline-none"
                >
                    <ChevronRight size={48} strokeWidth={0.5} className="text-black/30" />
                </button>
            </div>
            
            {/* Bottom Line (separating next section) */}
            <div className="border-t border-black mt-24"></div>
        </section>
    );
};

export default NewArrivals;
