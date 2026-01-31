import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ExternalLink, Disc3, ShoppingCart, Check } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { useCart } from '../context/CartContext';
import defaultImage from '../assets/default-vinyl.png';
import ProductCard from '../components/ProductCard';
import VinylSidePlayer from '../components/VinylSidePlayer';
import SEO from '../components/SEO';


const ProductPage = ({ products = [] }) => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { playTrack, currentTrack, isPlaying, currentProduct, showSidePlayer, setShowSidePlayer } = usePlayer();
    const { addToCart, cartItems } = useCart();
    const [addedToCart, setAddedToCart] = useState(false);

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
        // Reset tracks when ID changes to avoid showing old tracks momentarily
        setTracks([]);
        setLoadingTracks(true);

        const fetchTracks = async () => {
            if (!product) return;
            setLoadingTracks(true);

            const token = "BVpmDeAWjZxLXksEHfHPjAztaNfYoUEsFrRxCLwK";

            try {
                let releaseId = product.discogsId;

                if (!releaseId) {
                    const searchRes = await fetch(`https://api.discogs.com/database/search?q=${encodeURIComponent(product.artist + ' ' + product.album)}&type=release&token=${token}`);
                    const searchData = await searchRes.json();
                    if (searchData.results?.length > 0) {
                        releaseId = searchData.results[0].id;
                    }
                }

                if (releaseId) {
                    const releaseRes = await fetch(`https://api.discogs.com/releases/${releaseId}?token=${token}`);
                    const releaseData = await releaseRes.json();
                    setTracks(releaseData.tracklist || []);
                    setDiscogsVideos(releaseData.videos || []);
                }
            } catch (error) {
                console.error("Error fetching tracks:", error);
            } finally {
                setLoadingTracks(false);
            }
        };

        fetchTracks();
    }, [product?.id, product?.discogsId]); // Watch product ID specifically

    // Recommendations Logic
    const getRecommendations = () => {
        if (!product || !products || products.length === 0) return [];

        // Exclude current
        const otherProducts = products.filter(p => p.id !== product.id);

        // Priority 1: Same Artist
        const sameArtist = otherProducts.filter(p => p.artist?.toLowerCase() === product.artist?.toLowerCase());

        // Priority 2: Same Genre (excluding those already in sameArtist)
        const sameGenre = otherProducts.filter(p =>
            p.genre === product.genre &&
            !sameArtist.some(sa => sa.id === p.id)
        );

        // Combine and limit
        const recommendations = [...sameArtist, ...sameGenre].slice(0, 4);
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
        // Auto-open vinyl player when playing
        if (!showSidePlayer) {
            setShowSidePlayer(true);
        }
    };

    const handleRecommendationClick = (recProduct) => {
        // Navigate
        navigate(`/product/${recProduct.id}`);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleVinylPlayerToggle = () => {
        setShowSidePlayer(!showSidePlayer);
    };

    // SEO data
    const seoTitle = `${product.artist} - ${product.album}`;
    const seoDescription = `Buy ${product.album} by ${product.artist} on vinyl. ${product.genre ? `Genre: ${product.genre}.` : ''} Condition: ${product.status || 'VG'}. Available at El Cuartito Records, Copenhagen.`;

    return (
        <div className="pt-32 pb-40 px-6 max-w-7xl mx-auto">
            {/* Dynamic SEO */}
            <SEO
                title={seoTitle}
                description={seoDescription}
                image={imageSrc}
                url={`/product/${product.id}`}
                type="product"
            />

            {/* Listen on Vinyl Button - Floating */}
            <AnimatePresence>
                {!showSidePlayer && (
                    <motion.button
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={handleVinylPlayerToggle}
                        className="fixed top-24 right-4 sm:right-6 z-50 flex items-center gap-2 bg-black text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-lg hover:bg-black/80 transition-all hover:scale-105"
                    >
                        <Disc3 size={16} className="animate-spin-slow" />
                        <span className="text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider">Listen on Vinyl</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Main Layout - Responsive Grid */}
            <motion.div
                className={`grid grid-cols-1 ${showSidePlayer ? 'lg:grid-cols-[1fr_1fr_380px]' : 'lg:grid-cols-2'} gap-8 lg:gap-12`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Left Column: Tracklist & Info */}
                <motion.div
                    key={product.id + "-info"}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-12 order-2 lg:order-1"
                >
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tighter uppercase leading-none">
                                {product.artist}
                            </h1>
                        </div>
                        <p className="text-lg sm:text-xl lg:text-2xl font-medium text-black/60">
                            {product.album}
                        </p>
                        <div className="mt-4 lg:mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-black/40">
                            <span>{product.label || 'Indie Label'}</span>
                            <span>—</span>
                            <span>{product.year || '2024'}</span>
                            <span>—</span>
                            <span>{[product.genre, product.genre2, product.genre3, product.genre4, product.genre5].filter(Boolean).join(', ')}</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-black/40">Tracklist</h2>
                        <div className="divide-y divide-black/5">
                            {loadingTracks ? (
                                <p className="text-xs text-black/40 py-4 italic">Fetching tracks from Discogs...</p>
                            ) : tracks.length > 0 ? (
                                tracks.map((track, index) => {
                                    const isCurrent = currentTrack?.index === index && currentProduct?.id === product.id;

                                    return (
                                        <div key={track.position || index} className="group py-4 flex items-center justify-between hover:bg-black/[0.02] transition-colors px-2 -mx-2">
                                            <div className="flex items-center gap-4 flex-1">
                                                <button
                                                    onClick={() => onPlayClick(track, index)}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isCurrent
                                                        ? 'bg-accent text-white scale-110'
                                                        : 'bg-black/5 text-black/40 group-hover:bg-black/10 group-hover:text-black group-hover:scale-110'
                                                        }`}
                                                >
                                                    {isCurrent && isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                                                </button>
                                                <span className="text-[10px] font-bold text-black/20 w-6">{track.position}</span>
                                                <span className={`text-sm font-medium transition-colors ${isCurrent ? 'text-accent' : ''}`}>
                                                    {track.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-black/40">{track.duration}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-black/40 py-4 italic">No tracklist found for this release.</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-black/40">Information</h2>
                        <p className="text-sm leading-relaxed text-black/60 max-w-md">
                            {product.description || `Condition: ${product.status}. This release is part of the El Cuartito curated collection. Shipping from Copenhaguen.`}
                        </p>
                    </div>
                </motion.div>

                {/* Album Artwork Column */}
                <motion.div
                    key={product.id + "-art"}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="order-1 lg:order-2 w-full max-w-[400px] lg:max-w-none mx-auto"
                >
                    <div className="aspect-square bg-white shadow-2xl rounded-sm overflow-hidden border border-black/5">
                        <img
                            src={imageSrc}
                            onError={(e) => { e.currentTarget.src = defaultImage; }}
                            alt={product.album}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </motion.div>

                {/* Right Column: Vinyl Player (Conditional) */}
                <AnimatePresence>
                    {showSidePlayer && (
                        <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="order-3 hidden lg:block"
                        >
                            <div className="sticky top-32">
                                <VinylSidePlayer
                                    product={product}
                                    isVisible={showSidePlayer}
                                    onClose={() => setShowSidePlayer(false)}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Recommendations Section */}
            {recommendations.length > 0 && (
                <div className="mt-32 border-t border-black/5 pt-12">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-black/40 mb-8">You Might Also Like</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-8">
                        {recommendations.map(rec => (
                            <div key={rec.id} onClick={() => handleRecommendationClick(rec)} className="cursor-pointer">
                                <ProductCard product={{
                                    ...rec,
                                    image: rec.cover_image,
                                    title: rec.album,
                                    // ensure ProductCard expects correct props
                                }} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom Fixed Container: ADD TO CART */}
            <div
                className="fixed left-0 right-0 z-[80] safe-area-bottom transition-all duration-300"
                style={{
                    bottom: currentTrack ? '72px' : '0px'
                }}
            >
                <div className="bg-white/95 backdrop-blur-sm border-t border-black/5 px-6 py-4 md:px-10">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex flex-col min-w-fit">
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-0.5">Vinyl 12"</span>
                            <span className="text-base sm:text-lg font-bold">DKK {product.price}</span>
                        </div>
                        {product.stock > 0 ? (
                            <button
                                onClick={() => {
                                    addToCart(product);
                                    setAddedToCart(true);
                                    setTimeout(() => setAddedToCart(false), 2000);
                                }}
                                disabled={addedToCart}
                                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 sm:px-10 py-3 sm:py-3.5 rounded-full font-bold text-[11px] sm:text-xs tracking-widest transition-all ${addedToCart
                                    ? 'bg-green-600 text-white'
                                    : 'bg-black text-white hover:bg-black/80'
                                    }`}
                            >
                                {addedToCart ? (
                                    <>
                                        <Check size={16} />
                                        ADDED
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={16} />
                                        ADD TO CART
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 text-right">
                                <div className="max-w-xs">
                                    <p className="text-xs sm:text-sm font-bold text-red-600 leading-tight uppercase tracking-tight">Out of Stock</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ProductPage;
