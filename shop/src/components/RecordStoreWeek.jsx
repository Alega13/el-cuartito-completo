import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiquidImage from './LiquidImage';

const RecordStoreWeek = ({ products }) => {
    const scrollContainerRef = useRef(null);
    const requestRef = useRef();
    const isHoveredRef = useRef(false);

    const SPEED = 0.5;

    const animate = () => {
        if (!isHoveredRef.current && scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += SPEED;

            if (scrollContainerRef.current.scrollLeft >= scrollContainerRef.current.scrollWidth / 2) {
                scrollContainerRef.current.scrollLeft = 0;
            }
        }
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (!products || products.length === 0) return;
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [products]);

    const scrollManual = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = window.innerWidth > 768 ? 600 : 300;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (!products || products.length === 0) return null;

    const displayProducts = [...products, ...products];

    return (
        <section className="py-16 md:py-24 border-b border-black/5 relative overflow-hidden">

            <div className="px-4 md:px-8 max-w-[1500px] mx-auto mb-8 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg shadow-orange-500/20 animate-pulse">
                            🎉 RSD
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-2">Record Store Week</h2>
                    <p className="text-black/50 font-medium">Hand-picked discounts on selected records.</p>
                </div>
                
                {/* Navigation Arrows */}
                <div className="hidden md:flex items-center gap-2">
                    <button 
                        onClick={() => scrollManual('left')}
                        className="w-12 h-12 flex items-center justify-center rounded-full border border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button 
                        onClick={() => scrollManual('right')}
                        className="w-12 h-12 flex items-center justify-center rounded-full border border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Scrolling Container */}
            <div 
                className="max-w-[1500px] mx-auto px-4 md:px-8 relative group"
                onMouseEnter={() => { isHoveredRef.current = true; }}
                onMouseLeave={() => { isHoveredRef.current = false; }}
                onTouchStart={() => { isHoveredRef.current = true; }}
                onTouchEnd={() => { isHoveredRef.current = false; }}
            >
                <div 
                    ref={scrollContainerRef}
                    className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-8 snap-x md:snap-none"
                    style={{ 
                        scrollBehavior: 'auto',
                        maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
                    }} 
                >
                    <div className="shrink-0 w-2 md:w-4"></div>
                    
                    {displayProducts.map((product, index) => {
                        const discountedPrice = Math.round(product.price * 0.9);
                        return (
                            <Link 
                                to={`/product/${product.id}`}
                                key={`${product.id}-${index}`}
                                className="flex-none w-[160px] md:w-[220px] lg:w-[260px] snap-center shrink-0 group/card"
                            >
                                <div className="relative aspect-square mb-4 overflow-hidden rounded-md bg-black/5 shadow-sm">
                                    <LiquidImage
                                        src={product.cover_image || product.image || '/placeholder-record.png'}
                                        alt={product.album}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                                    />
                                    {/* RSD Badge */}
                                    <div className="absolute top-2 left-2 md:top-3 md:left-3 z-10 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg shadow-orange-500/30">
                                        -10%
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm md:text-base text-black group-hover/card:text-orange-600 transition-colors truncate">
                                        {product.album}
                                    </h3>
                                    <p className="text-xs text-black/50 truncate mt-0.5 font-medium">
                                        {product.artist}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-xs text-black/30 line-through">DKK {product.price}</span>
                                        <span className="text-sm font-bold text-orange-600">DKK {discountedPrice}</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}

                    <div className="shrink-0 w-2 md:w-4"></div>
                </div>
                
                {/* Mobile Arrows */}
                <div className="absolute top-[35%] left-0 right-0 flex justify-between md:hidden pointer-events-none px-2">
                     <button 
                        onClick={(e) => { e.preventDefault(); scrollManual('left'); }}
                        className="w-10 h-10 pointer-events-auto flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md text-black hover:bg-orange-500 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                     <button 
                        onClick={(e) => { e.preventDefault(); scrollManual('right'); }}
                        className="w-10 h-10 pointer-events-auto flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md text-black hover:bg-orange-500 hover:text-white transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
            
        </section>
    );
};

export default RecordStoreWeek;
