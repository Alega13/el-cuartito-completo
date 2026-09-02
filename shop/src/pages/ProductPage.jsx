import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Play, Pause, ExternalLink, Disc3, ShoppingCart, Check, SkipForward } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { useCart } from '../context/CartContext';
import defaultImage from '../assets/default-vinyl.png';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';


const ProductPage = ({ products = [] }) => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { playTrack, togglePlay, playNext, currentTrack, isPlaying, currentProduct, currentTime, duration, handleSeek, volume, handleVolume } = usePlayer();
    const { addToCart, cartItems } = useCart();
    const [addedToCart, setAddedToCart] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [isCartSticky, setIsCartSticky] = useState(false);
    const [isDescSticky, setIsDescSticky] = useState(false);
    const cartRef = useRef(null);
    const descRef = useRef(null);
    const { scrollY } = useScroll();
    const cartLineWidth = useTransform(scrollY, [100, 800], ["0%", "100%"]);

    // Drag states for custom sliders
    const isDraggingSeek = useRef(false);
    const isDraggingVolume = useRef(false);

    // Find product from URL params or use the passed product (if any - handling legacy)
    const urlProduct = productId ? products.find(p => p.id === productId || p.id === parseInt(productId)) : null;

    // We can just use urlProduct directly instead of state if we want, or sync state
    const [product, setProduct] = useState(urlProduct);

    // Sync product when ID changes
    useEffect(() => {
        if (urlProduct) {
            setProduct(urlProduct);
        }
    }, [urlProduct]);


    // Scroll to top when product changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [productId]);

    // Helper to check if image is valid
    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    const imageSrc = product && isValidImage(product.cover_image) ? product.cover_image : defaultImage;

    const [tracks, setTracks] = useState([]);
    const [loadingTracks, setLoadingTracks] = useState(true);
    const [discogsVideos, setDiscogsVideos] = useState([]);
    // Watch ID changes

    useEffect(() => {
        const handleScroll = () => {
            if (cartRef.current) {
                const { top } = cartRef.current.getBoundingClientRect();
                setIsCartSticky(top <= 1);
            }
            if (descRef.current) {
                const { top } = descRef.current.getBoundingClientRect();
                setIsDescSticky(top <= 1);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        // Find the product fresh each time - this ensures we get the latest data
        const currentProductData = productId ? products.find(p => p.id === productId || p.id === parseInt(productId)) : null;

        // Get API URL from environment or use default
        const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app');

        // If products haven't loaded yet, wait
        if (products.length === 0) {
            setLoadingTracks(true);
            return;
        }

        // If product not found after products loaded, stop loading
        if (!currentProductData) {
            setLoadingTracks(false);
            return;
        }

        // Reset tracks when product changes
        setTracks([]);
        setLoadingTracks(true);

        const fetchTracks = async () => {
            try {
                // First, try to use the discogsId if we have it
                let releaseId = currentProductData.discogsId || currentProductData.discogs_release_id;

                // If no discogsId, search via our backend proxy (avoids CORS issues)
                if (!releaseId) {
                    const searchQuery = encodeURIComponent(`${currentProductData.artist} ${currentProductData.album}`);
                    const searchRes = await fetch(`${API_URL}/discogs/search?q=${searchQuery}`);
                    const searchData = await searchRes.json();
                    if (searchData.success && searchData.releaseId) {
                        releaseId = searchData.releaseId;
                    }
                }

                // Fetch tracklist via our backend proxy (avoids CORS issues)
                if (releaseId) {
                    const tracklistRes = await fetch(`${API_URL}/discogs/tracklist/${releaseId}`);
                    const tracklistData = await tracklistRes.json();
                    if (tracklistData.success) {
                        setTracks(tracklistData.tracklist || []);
                        setDiscogsVideos(tracklistData.videos || []);
                    }
                }
            } catch (error) {
                console.error("Error fetching tracks:", error);
            } finally {
                setLoadingTracks(false);
            }
        };

        fetchTracks();
    }, [productId, products.length]); // Re-run when productId or products array changes

    // Recommendations Logic
    const getRecommendations = () => {
        if (!product || !products || products.length === 0) return [];

        // Exclude current and out of stock
        const otherProducts = products.filter(p => p.id !== product.id && p.stock > 0);

        // Priority 1: Same Artist
        const sameArtist = otherProducts.filter(p => p.artist?.toLowerCase() === product.artist?.toLowerCase());

        // Priority 2: Same Genre (excluding those already in sameArtist)
        const sameGenre = otherProducts.filter(p =>
            p.genre === product.genre &&
            !sameArtist.some(sa => sa.id === p.id)
        );

        // Combine and limit
        const recommendations = [...sameArtist, ...sameGenre].slice(0, 20);
        return recommendations;
    };

    const recommendations = getRecommendations();


    if (!product) {
        // Handle loading or not found state
        if (products.length === 0) {
            // Likely still loading products
            return (
                <div className="pt-32 pb-40 px-6 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-4 border-black/5 border-t-black animate-spin"></div>
                        <p className="text-xs font-bold tracking-widest text-black/20 uppercase">Loading Details...</p>
                    </div>
                </div>
            )
        }
        return <div className="pt-32 pb-40 px-6">Product not found.</div>;
    }

    const onPlayClick = (track, index) => {
        const trackData = { ...track, index };
        playTrack(trackData, product, tracks, discogsVideos);
    };

    const handleRecommendationClick = (recProduct) => {
        // Navigate
        navigate(`/product/${recProduct.id}`);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };



    // SEO data
    const seoTitle = `${product.artist} - ${product.album}`;
    const seoDescription = `Buy ${product.album} by ${product.artist} on vinyl. ${product.genre ? `Genre: ${product.genre}.` : ''} Condition: ${product.status || 'VG'}. Available at El Cuartito Records, Copenhagen.`;

    return (
        <div className="bg-[#F3F3F3] min-h-screen pt-24 md:pt-32 pb-20 md:pb-40 px-4 md:px-12 lg:px-20">
            {/* Dynamic SEO */}
            <SEO
                title={seoTitle}
                description={seoDescription}
                image={imageSrc}
                url={`/product/${product.id}`}
                type="product"
            />



            <motion.div
                className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-24"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Left Column: Details */}
                <motion.div
                    key={product.id + "-info"}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col lg:col-span-1 pt-4 lg:pt-10 h-full relative"
                >
                    <h1 className="text-[32px] sm:text-[48px] lg:text-[70px] xl:text-[85px] font-bold tracking-tighter leading-[0.9] text-black mb-4 md:mb-6">
                        {product.album}<br />
                        <span className="font-light text-black/70">{product.artist}</span>
                    </h1>

                    <div className="flex items-center gap-4 mb-8 md:mb-12">
                        {product.is_rsd_discount ? (
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-medium text-black">{Math.round(product.price * 0.9)} DKK</span>
                                <span className="text-xl text-black/40 line-through">{product.price} DKK</span>
                                <span className="text-xs font-bold bg-black text-white px-2 py-1 uppercase tracking-widest">
                                    RSD -10%
                                </span>
                            </div>
                        ) : (
                            <span className="text-2xl font-medium text-black">{product.price} DKK</span>
                        )}
                    </div>

                    <div ref={descRef} className="lg:sticky lg:top-0 pb-10">
                        {/* Adjust padding to align border-t with hamburger menu vertically when stuck */}
                        <div className="border-t border-transparent w-full max-w-sm pt-6 md:pt-8 mb-4 mt-8 md:mt-[56px] transition-all"></div>

                    <div className="mb-4">
                        <h2 className={`font-semibold tracking-normal text-black mb-6 uppercase transition-all duration-300 ${isDescSticky ? 'text-2xl' : 'text-sm'}`}>Description</h2>
                        <p className="text-[17px] md:text-[19px] leading-[1.3] tracking-tight text-black max-w-md font-medium">
                            {product.description || `Condition: ${product.status}. This release is part of the El Cuartito curated collection. Shipping from Copenhaguen.`}
                        </p>
                        <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-[14px] font-medium tracking-tight text-black">
                            <span>{product.label || 'Indie Label'}</span>
                            <span>—</span>
                            <span>{product.year || '2024'}</span>
                            <span>—</span>
                            <span>{[product.genre, product.genre2, product.genre3, product.genre4, product.genre5].filter(Boolean).join(', ')}</span>
                        </div>
                    </div>

                    {tracks.length > 0 && (
                        <>
                            <div className="border-t border-black w-full max-w-sm pt-8 my-8"></div>
                            <div className="mb-4 w-full max-w-md">
                                <h2 className="text-sm font-semibold tracking-normal text-black mb-6 uppercase">Tracklist</h2>
                                <div className="divide-y divide-black/10">
                                    {tracks.map((track, index) => {
                                        const isCurrent = currentTrack?.index === index && currentProduct?.id === product.id;

                                        return (
                                            <div key={track.position || index} className="group py-3 flex items-center justify-between hover:bg-black/5 transition-colors -mx-4 px-4 rounded-sm">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <button
                                                        onClick={() => onPlayClick(track, index)}
                                                        className={`flex items-center justify-center transition-all ${isCurrent
                                                            ? 'text-black scale-110'
                                                            : 'text-black/50 group-hover:text-black'
                                                            }`}
                                                    >
                                                        {isCurrent && isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                                    </button>
                                                    <span className="text-[10px] font-bold text-black/30 w-6">{track.position}</span>
                                                    <span className={`text-sm font-medium transition-colors ${isCurrent ? 'text-black font-bold' : 'text-black/80'}`}>
                                                        {track.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold tracking-wider text-black/40">{track.duration}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                    </div>
                </motion.div>

                {/* Right Column: Visuals & Action */}
                <motion.div
                    key={product.id + "-art"}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center lg:items-end w-full lg:col-span-2"
                >
                    {/* Image */}
                    <div className="w-full aspect-square bg-transparent flex items-center justify-center mb-12 relative max-w-2xl lg:mr-12">
                        <img
                            src={imageSrc}
                            onError={(e) => { e.currentTarget.src = defaultImage; }}
                            alt={product.album}
                            className="w-[85%] h-[85%] object-cover shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                        />
                    </div>

                    {/* Add to Cart - Sticky Below Image */}
                    <div ref={cartRef} className="w-full pb-6 md:pb-8 border-b lg:border-b-0 border-t border-black/20 pt-6 md:pt-8 mb-8 md:mb-12 lg:sticky lg:top-0 bg-[#F3F3F3] z-30 transition-colors duration-300 relative">
                        {/* Animated Bottom Line */}
                        <motion.div 
                            className="absolute bottom-0 right-0 h-px bg-black hidden lg:block origin-right"
                            style={{ width: cartLineWidth }}
                        />
                        <div className="flex flex-row items-center w-full lg:pr-12">
                            {/* Left side: Mini Player & Volume */}
                            {currentTrack && (
                                <>
                                    <div className="hidden lg:flex items-center gap-4 shrink-0 min-w-0 pr-8">
                                        <button 
                                            onClick={() => togglePlay()}
                                            className="text-black shrink-0 flex items-center justify-center transition-transform hover:scale-110"
                                        >
                                            {isPlaying ? (
                                                <svg width="84" height="84" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M5 4h5v16H5zm9 0h5v16h-5z" />
                                                </svg>
                                            ) : (
                                                <svg width="84" height="84" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6 3v18l15-9z" />
                                                </svg>
                                            )}
                                        </button>

                                        <div className="flex flex-col justify-center min-w-[200px] max-w-[250px]">
                                            <span className="text-xs font-bold tracking-widest uppercase truncate w-full mb-2">
                                                {currentTrack.title}
                                            </span>
                                            {/* Progress Bar */}
                                            <div 
                                                className="w-full h-[2px] bg-black/10 relative cursor-pointer group touch-none"
                                                onPointerDown={(e) => {
                                                    isDraggingSeek.current = true;
                                                    e.currentTarget.setPointerCapture(e.pointerId);
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                                                    handleSeek((x / rect.width) * duration);
                                                }}
                                                onPointerMove={(e) => {
                                                    if (!isDraggingSeek.current) return;
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                                                    handleSeek((x / rect.width) * duration);
                                                }}
                                                onPointerUp={(e) => {
                                                    isDraggingSeek.current = false;
                                                    e.currentTarget.releasePointerCapture(e.pointerId);
                                                }}
                                            >
                                                <div 
                                                    className="absolute top-0 left-0 bottom-0 bg-black transition-all group-hover:h-[4px] group-hover:-top-[1px]" 
                                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => playNext(tracks, product, discogsVideos)}
                                            className="text-black hover:scale-110 transition-transform ml-2"
                                        >
                                            <SkipForward size={16} fill="black" />
                                        </button>
                                    </div>

                                    {/* Center: Vertical Volume / Divider Line */}
                                    <div className="hidden lg:flex flex-1 items-center justify-center">
                                        <div 
                                            className="h-16 w-[1px] bg-black/20 relative group cursor-pointer touch-none"
                                            onPointerDown={(e) => {
                                                isDraggingVolume.current = true;
                                                e.currentTarget.setPointerCapture(e.pointerId);
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                let y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
                                                handleVolume(1 - (y / rect.height));
                                            }}
                                            onPointerMove={(e) => {
                                                if (!isDraggingVolume.current) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                let y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
                                                handleVolume(1 - (y / rect.height));
                                            }}
                                            onPointerUp={(e) => {
                                                isDraggingVolume.current = false;
                                                e.currentTarget.releasePointerCapture(e.pointerId);
                                            }}
                                        >
                                            <div 
                                                className="absolute bottom-0 left-[-1px] right-[-1px] bg-black transition-all group-hover:left-[-2px] group-hover:right-[-2px]"
                                                style={{ height: `${volume * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Right side */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 md:gap-8 flex-wrap sm:flex-nowrap shrink-0 ml-auto w-full sm:w-auto">
                                {product.stock > 0 ? (
                                    <>
                                        <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:text-right gap-2 sm:mr-8 shrink-0">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs sm:text-sm tracking-widest uppercase truncate max-w-[180px]">{product.album}</span>
                                                <span className="text-[9px] sm:text-[10px] text-black/50 uppercase tracking-widest font-light truncate max-w-[180px] mt-0.5">{product.artist}</span>
                                            </div>
                                            <span className="font-bold text-sm sm:text-lg tracking-widest uppercase shrink-0">
                                            {product.is_rsd_discount ? Math.round(product.price * 0.9) : product.price} DKK
                                            </span>
                                        </div>
                                        <button
                                        onClick={() => {
                                            for(let i=0; i<quantity; i++) addToCart(product);
                                            setAddedToCart(true);
                                            setTimeout(() => setAddedToCart(false), 2000);
                                        }}
                                        disabled={addedToCart}
                                        className={`w-full sm:w-auto px-6 md:px-24 py-4 md:py-10 font-bold text-xs sm:text-lg tracking-widest uppercase transition-all border-2 shrink-0 ${
                                            addedToCart
                                                ? 'bg-black text-white border-black'
                                                : isCartSticky 
                                                    ? 'bg-black text-white border-black hover:bg-transparent hover:text-black' 
                                                    : 'bg-transparent text-black border-black hover:bg-black hover:text-white'
                                        }`}
                                    >
                                        {addedToCart ? 'IN CART' : 'IN CART'}
                                    </button>
                                    </>
                                ) : (
                                    <div className="px-6 md:px-24 py-6 md:py-10 border-2 border-red-200 bg-red-50 text-red-600 font-bold text-sm md:text-lg tracking-widest uppercase text-center w-full">
                                        OUT OF STOCK
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Recommendations Section in Right Column */}
                    {recommendations.length > 0 && (
                        <div className="w-full mt-24">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-8 lg:sticky lg:top-[174px] bg-[#F3F3F3] z-20 pt-4 pb-4">
                                You Might Also Like
                            </h3>
                            <div className="grid grid-cols-2 gap-8 sm:gap-16">
                                {recommendations.map(rec => (
                                    <div key={rec.id} onClick={() => handleRecommendationClick(rec)} className="cursor-pointer">
                                        <ProductCard product={{
                                            ...rec,
                                            image: rec.cover_image,
                                            title: rec.album,
                                        }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

            </motion.div>
        </div>
    );
};

export default ProductPage;
