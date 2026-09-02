import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Pause, ShoppingBag, Check } from 'lucide-react';
import { useSelections } from '../context/SelectionsContext';
import { useCart } from '../context/CartContext';
import { usePlayer } from '../context/PlayerContext';
import defaultImage from '../assets/default-vinyl.png';



const ProductCard = ({ product }) => {
    const { isInSelections, toggleSelection } = useSelections();
    const { addToCart } = useCart();
    const { playTrack, currentProduct, currentTrack, isPlaying, togglePlay } = usePlayer();
    const isSelected = isInSelections(product.id);
    const [addedToCart, setAddedToCart] = useState(false);
    const [loadingPlay, setLoadingPlay] = useState(false);

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

    // Check if this product is currently playing
    const isThisPlaying = currentProduct?.id === product.id && currentTrack && isPlaying;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product);
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 1500);
    };

    const handlePlayClick = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // If this product is already playing, toggle play/pause
        if (currentProduct?.id === product.id && currentTrack) {
            togglePlay();
            return;
        }

        setLoadingPlay(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app');
            
            let releaseId = product.discogsId || product.discogs_release_id;

            if (!releaseId) {
                const searchQuery = encodeURIComponent(`${product.artist} ${product.album || product.title}`);
                const searchRes = await fetch(`${API_URL}/discogs/search?q=${searchQuery}`);
                const searchData = await searchRes.json();
                if (searchData.success && searchData.releaseId) {
                    releaseId = searchData.releaseId;
                }
            }

            if (releaseId) {
                const tracklistRes = await fetch(`${API_URL}/discogs/tracklist/${releaseId}`);
                const tracklistData = await tracklistRes.json();
                if (tracklistData.success && tracklistData.tracklist?.length > 0) {
                    const tracks = tracklistData.tracklist;
                    const videos = tracklistData.videos || [];
                    const firstTrack = { ...tracks[0], index: 0 };
                    const productData = {
                        ...product,
                        cover_image: product.image || product.cover_image,
                        album: product.title || product.album,
                    };
                    playTrack(firstTrack, productData, tracks, videos);
                }
            }
        } catch (err) {
            console.error('Error fetching tracklist for card play:', err);
        } finally {
            setLoadingPlay(false);
        }
    }, [product, currentProduct, currentTrack, togglePlay, playTrack]);

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

                    {/* Hover Action Buttons */}
                    {product.stock > 0 && (
                        <>
                            {/* Play Button - Bottom Left */}
                            <button
                                onClick={handlePlayClick}
                                disabled={loadingPlay}
                                className="absolute bottom-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm border border-black/10 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-200 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                                title="Play tracklist"
                            >
                                {loadingPlay ? (
                                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : isThisPlaying ? (
                                    <Pause size={14} fill="currentColor" />
                                ) : (
                                    <Play size={14} fill="currentColor" className="ml-0.5" />
                                )}
                            </button>

                            {/* Cart Button - Bottom Right */}
                            <button
                                onClick={handleAddToCart}
                                className={`absolute bottom-4 right-4 w-9 h-9 flex items-center justify-center border transition-all duration-200 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto ${
                                    addedToCart 
                                        ? 'bg-black text-white border-black !opacity-100 !pointer-events-auto' 
                                        : 'bg-white/90 backdrop-blur-sm border-black/10 hover:bg-black hover:text-white'
                                }`}
                                title="Add to cart"
                            >
                                {addedToCart ? (
                                    <Check size={14} strokeWidth={2.5} />
                                ) : (
                                    <ShoppingBag size={14} />
                                )}
                            </button>
                        </>
                    )}
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
                        
                        {product.label && (
                            <>
                                {(product.stock === 0 || product.status === 'New' || isRSD) && (
                                    <span className="text-[9px] text-black/20">•</span>
                                )}
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">
                                    {product.label}
                                </span>
                            </>
                        )}
                    </div>
                    
                    <h3 className="text-sm md:text-base font-bold text-black tracking-tight leading-tight mb-1">
                        {product.title}
                    </h3>
                    
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
