import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import defaultImage from '../assets/default-vinyl.png';
import { useAuth } from '../context/AuthContext';

const isLocal = window.location.hostname === 'localhost';
const API_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app');

const ProductCard = ({ product }) => {
    const { currentUser } = useAuth();
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [heartAnimating, setHeartAnimating] = useState(false);

    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    const imageSrc = isValidImage(product.image) ? product.image : (isValidImage(product.cover_image) ? product.cover_image : defaultImage);

    // RSD Discount logic
    const isRSD = product.is_rsd_discount;
    const originalPrice = product.price;
    const discountedPrice = isRSD ? Math.round(originalPrice * 0.9) : originalPrice;

    const handleWishlistToggle = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUser) {
            // Redirect to login if not authenticated
            window.location.href = '/login';
            return;
        }

        setHeartAnimating(true);
        setTimeout(() => setHeartAnimating(false), 400);

        try {
            if (isWishlisted) {
                await fetch(`${API_URL}/api/wishlist/${currentUser.uid}/${product.id}`, { method: 'DELETE' });
                setIsWishlisted(false);
            } else {
                await fetch(`${API_URL}/api/wishlist/${currentUser.uid}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId: product.id })
                });
                setIsWishlisted(true);
            }
        } catch (err) {
            console.error('Wishlist toggle error:', err);
        }
    };

    return (
        <Link to={`/product/${product.id}`} className="block">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group cursor-pointer flex flex-col"
            >
                <div className="w-full aspect-square mb-4 md:mb-6 flex items-center justify-center p-3 md:p-8 lg:p-10 relative">
                    <img
                        src={imageSrc}
                        alt={product.title}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.currentTarget.src = defaultImage; }}
                        className={`w-full h-full object-contain mix-blend-multiply drop-shadow-xl transition-transform duration-500 ${product.stock === 0 ? 'grayscale opacity-50' : 'group-hover:scale-105'}`}
                    />

                    {/* Wishlist Heart Button */}
                    <button
                        onClick={handleWishlistToggle}
                        className="absolute top-2 right-2 md:top-4 md:right-4 z-10 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        aria-label="Add to wishlist"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill={isWishlisted ? '#F2610E' : 'none'}
                            stroke={isWishlisted ? '#F2610E' : '#000'}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`transition-transform duration-200 ${heartAnimating ? 'scale-125' : 'scale-100'}`}
                        >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                        {product.stock === 0 ? (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-red-500/70">
                                OUT OF STOCK
                            </span>
                        ) : product.status === 'New' ? (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">
                                BRAND NEW
                            </span>
                        ) : isRSD ? (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500">
                                RSD
                            </span>
                        ) : null}
                    </div>
                    
                    <h3 className="text-sm md:text-base font-bold text-black tracking-tight leading-tight mb-0.5">
                        {product.title}
                    </h3>
                    
                    {(product.label || product.record_label || product.publisher) && (
                        <span className="text-xs font-semibold uppercase tracking-wider text-black/60 mb-1">
                            {product.label || product.record_label || product.publisher}
                        </span>
                    )}

                    {product.price && (
                        isRSD ? (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-black/40 line-through">{originalPrice} DKK</span>
                                <span className="text-xs font-bold text-orange-600">{discountedPrice} DKK</span>
                            </div>
                        ) : (
                            <span className="text-xs font-bold text-black/50">{product.price} DKK</span>
                        )
                    )}
                </div>
            </motion.div>
        </Link>
    );
};

export default ProductCard;
