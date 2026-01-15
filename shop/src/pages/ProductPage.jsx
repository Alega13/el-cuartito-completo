import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ExternalLink, Disc3 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import defaultImage from '../assets/default-vinyl.png';
import ProductCard from '../components/ProductCard';
import VinylSidePlayer from '../components/VinylSidePlayer';


const ProductPage = ({ product: initialProduct, products = [], setSelectedProduct }) => {
    const { playTrack, currentTrack, isPlaying, currentProduct, showSidePlayer, setShowSidePlayer } = usePlayer();

    const [product, setProduct] = useState(initialProduct);

    // Scroll to top when product changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [initialProduct?.id]);

    useEffect(() => {
        if (!initialProduct?.id) return;
        setProduct(initialProduct);
    }, [initialProduct?.id]);

    // Helper to check if image is valid
    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    const imageSrc = isValidImage(product.cover_image) ? product.cover_image : defaultImage;

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


    if (!product) return null;

    const onPlayClick = (track, index) => {
        const trackData = { ...track, index };
        playTrack(trackData, product, tracks, discogsVideos);
        // Auto-open vinyl player when playing
        if (!showSidePlayer) {
            setShowSidePlayer(true);
        }
    };

    const handleRecommendationClick = (recProduct) => {
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Set new product
        setSelectedProduct(recProduct);
    };

    const handleVinylPlayerToggle = () => {
        setShowSidePlayer(!showSidePlayer);
    };

    return (
        <div className="pt-32 pb-40 px-6 max-w-7xl mx-auto">
            {/* Listen on Vinyl Button - Top Right */}
            <AnimatePresence>
                {!showSidePlayer && (
                    <motion.button
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={handleVinylPlayerToggle}
                        className="fixed top-24 right-6 z-50 flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-black/80 transition-all hover:scale-105"
                    >
                        <Disc3 size={18} className="animate-spin-slow" />
                        <span className="text-sm font-bold uppercase tracking-wider">Escuchar en Vinilo</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Main Layout - Animated Grid */}
            <motion.div
                className="grid gap-12 lg:gap-8"
                animate={{
                    gridTemplateColumns: showSidePlayer ? '1fr 1fr 380px' : '1fr 1fr',
                }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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
                            <motion.h1
                                className="font-bold tracking-tighter uppercase"
                                animate={{ fontSize: showSidePlayer ? '2.5rem' : '3rem' }}
                                transition={{ duration: 0.4 }}
                            >
                                {product.artist}
                            </motion.h1>
                        </div>
                        <motion.p
                            className="font-medium text-black/60"
                            animate={{ fontSize: showSidePlayer ? '1.25rem' : '1.5rem' }}
                        >
                            {product.album}
                        </motion.p>
                        <div className="mt-6 flex gap-4 text-xs font-bold uppercase tracking-widest text-black/40">
                            <span>{product.label || 'Indie Label'}</span>
                            <span>—</span>
                            <span>{product.year || '2024'}</span>
                            <span>—</span>
                            <span>{product.genre}</span>
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

                {/* Center Column: Album Artwork */}
                <motion.div
                    key={product.id + "-art"}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="h-fit order-1 lg:order-2"
                >
                    <motion.div
                        className="aspect-square bg-white shadow-2xl rounded-sm overflow-hidden border border-black/5 mx-auto"
                        animate={{
                            maxWidth: showSidePlayer ? '320px' : '100%',
                        }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <img
                            src={imageSrc}
                            onError={(e) => { e.currentTarget.src = defaultImage; }}
                            alt={product.album}
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
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

            {/* Bottom Fixed Container: ONLY ADD TO CART NOW */}
            <div className="fixed bottom-0 left-0 right-0 z-[80]">
                {/* Add to Cart Bar */}
                <div className="bg-white border-t border-black/5 px-6 py-4 md:px-10 relative z-20">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-1">Vinyl 12"</span>
                            <span className="text-lg font-bold">DKK {product.price}</span>
                        </div>
                        {(() => {
                            // Generate Discogs URL if available
                            const discogsUrl = product.discogs_url ||
                                (product.discogsId ? `https://www.discogs.com/sell/list?release_id=${product.discogsId}&ev=rb` : null);

                            if (discogsUrl) {
                                return (
                                    <a
                                        href={discogsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-sm font-bold text-sm hover:bg-black/80 transition-colors"
                                    >
                                        <ExternalLink size={18} />
                                        BUY ON DISCOGS
                                    </a>
                                );
                            }

                            // Fallback: Physical store only
                            return (
                                <div className="flex items-center gap-3 text-right">
                                    <div className="max-w-xs">
                                        <p className="text-sm font-bold text-black/80 leading-tight">Available at our physical store</p>
                                        <p className="text-xs text-black/50 mt-1">Vesterbro, Copenhagen</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                                        <span className="text-xl">🏪</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductPage;
