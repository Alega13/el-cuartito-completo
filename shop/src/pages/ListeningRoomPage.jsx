import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Play, Pause, Shuffle, SkipForward, SkipBack } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import defaultImage from '../assets/default-vinyl.png';

const ListeningRoomPage = ({ products = [] }) => {
    const {
        currentTrack,
        isPlaying,
        togglePlay,
        playNext,
        playPrev,
        currentTime,
        duration,
        currentProduct,
        playTrack
    } = usePlayer();

    const [isShuffling, setIsShuffling] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const carouselControls = useAnimation();
    const containerRef = useRef(null);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const CARD_WIDTH = 180;
    const CARD_GAP = 16;

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Shuffle animation
    const handleShuffle = async () => {
        if (products.length === 0 || isShuffling) return;

        setIsShuffling(true);

        // Pick random product
        const randomIndex = Math.floor(Math.random() * products.length);
        const randomProduct = products[randomIndex];

        // Calculate carousel animation
        const totalWidth = products.length * (CARD_WIDTH + CARD_GAP);
        const spins = 2; // Number of full rotations
        const targetOffset = -(randomIndex * (CARD_WIDTH + CARD_GAP));

        // Animate: accelerate through multiple loops, then decelerate to target
        await carouselControls.start({
            x: [0, -totalWidth * spins + targetOffset],
            transition: {
                duration: 3,
                ease: [0.12, 0, 0.39, 0], // Ease out - starts fast, slows down
            }
        });

        // Snap to position (wrap around)
        carouselControls.set({ x: targetOffset });
        setSelectedIndex(randomIndex);

        // Fetch and play random track from this album
        try {
            const token = "BVpmDeAWjZxLXksEHfHPjAztaNfYoUEsFrRxCLwK";
            let releaseId = randomProduct.discogsId;

            if (!releaseId) {
                const searchRes = await fetch(`https://api.discogs.com/database/search?q=${encodeURIComponent(randomProduct.artist + ' ' + randomProduct.album)}&type=release&token=${token}`);
                const searchData = await searchRes.json();
                if (searchData.results?.length > 0) {
                    releaseId = searchData.results[0].id;
                }
            }

            if (releaseId) {
                const releaseRes = await fetch(`https://api.discogs.com/releases/${releaseId}?token=${token}`);
                const releaseData = await releaseRes.json();
                const tracks = releaseData.tracklist || [];
                const videos = releaseData.videos || [];

                if (tracks.length > 0) {
                    const trackIndex = Math.floor(Math.random() * tracks.length);
                    const track = { ...tracks[trackIndex], index: trackIndex };
                    playTrack(track, randomProduct, tracks, videos);
                }
            }
        } catch (error) {
            console.error("Error playing track:", error);
        }

        setIsShuffling(false);
    };

    // Continuous slow scroll when not shuffling
    useEffect(() => {
        if (!isShuffling && products.length > 0) {
            const totalWidth = products.length * (CARD_WIDTH + CARD_GAP);

            carouselControls.start({
                x: [-totalWidth],
                transition: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: products.length * 3,
                    ease: "linear"
                }
            });
        }

        return () => carouselControls.stop();
    }, [isShuffling, products.length]);

    const trackTitle = currentTrack?.title || 'Press Shuffle to Start';
    const artistText = currentProduct?.artist || '';
    const albumText = currentProduct?.album || '';

    // Helper to check if image is valid
    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        return true;
    };

    // Double the products array for seamless loop
    const displayProducts = [...products, ...products];

    return (
        <div className="min-h-screen bg-white text-black pt-28 pb-12 overflow-hidden">
            {/* Page Title */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-8 md:px-12 mb-8"
            >
                <h1 className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/30">
                    Listening Room
                </h1>
            </motion.div>

            <div className="flex flex-col lg:flex-row min-h-[70vh]">
                {/* Left Side - Turntable */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-full lg:w-1/2 flex flex-col items-center justify-center px-8 lg:px-16"
                >
                    {/* Turntable */}
                    <div className="relative w-full max-w-md aspect-square">
                        {/* Turntable Base */}
                        <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-white to-neutral-50 rounded-3xl shadow-xl border border-black/5">
                            <div className="absolute inset-0 rounded-3xl opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.01)_2px,rgba(0,0,0,0.01)_4px)]" />
                        </div>

                        {/* Platter */}
                        <div className="absolute inset-8 md:inset-12">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 shadow-inner" />
                            <div className="absolute inset-2 rounded-full bg-neutral-100" />

                            {/* Spinning Vinyl */}
                            <motion.div
                                className="absolute inset-4 rounded-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-black overflow-hidden shadow-2xl"
                                animate={{ rotate: isPlaying ? 360 : 0 }}
                                transition={{
                                    repeat: isPlaying ? Infinity : 0,
                                    duration: 1.8,
                                    ease: "linear"
                                }}
                            >
                                {/* Vinyl Grooves */}
                                {[...Array(10)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute rounded-full border border-white/[0.03]"
                                        style={{ inset: `${10 + i * 6}%` }}
                                    />
                                ))}

                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />

                                {/* Center Label */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-1/3 aspect-square rounded-full bg-white flex flex-col items-center justify-center shadow-lg border border-black/5">
                                        <span className="text-[8px] md:text-[10px] font-bold text-black/60 uppercase tracking-wider text-center px-2 leading-tight">
                                            {artistText.substring(0, 12) || 'EL CUARTITO'}
                                        </span>
                                        <div className="w-2 h-2 rounded-full bg-black/20 mt-1" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Tonearm */}
                        <motion.div
                            className="absolute top-6 right-6 md:top-8 md:right-8 origin-top-right z-20"
                            animate={{ rotate: isPlaying ? 28 : 0 }}
                            transition={{ type: "spring", damping: 20, stiffness: 80 }}
                        >
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-neutral-300 to-neutral-400 shadow-md border border-neutral-400" />
                            <div className="absolute top-3 right-1.5 w-1 h-28 bg-gradient-to-b from-neutral-300 via-neutral-400 to-neutral-500 rounded-full origin-top transform -rotate-12 shadow" />
                            <div className="absolute top-[115px] right-[-2px] w-4 h-2.5 bg-neutral-400 rounded-sm transform -rotate-12 origin-top-right shadow-sm" />
                            <motion.div
                                className="absolute top-[130px] right-0 w-[2px] h-2 bg-black rounded-b-full transform -rotate-12"
                                animate={{ opacity: isPlaying ? 1 : 0.3 }}
                            />
                        </motion.div>

                        {/* Power LED */}
                        <div className="absolute bottom-6 left-6 flex items-center gap-2">
                            <motion.div
                                className="w-2 h-2 rounded-full"
                                animate={{
                                    backgroundColor: isPlaying ? '#22c55e' : '#d1d5db',
                                    boxShadow: isPlaying ? '0 0 8px #22c55e' : 'none'
                                }}
                            />
                            <span className="text-[8px] font-bold uppercase tracking-widest text-black/20">Power</span>
                        </div>
                    </div>

                    {/* Track Info & Controls */}
                    <div className="mt-8 text-center w-full max-w-md">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={trackTitle}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-2">
                                    {isPlaying ? 'Now Playing' : 'Ready'}
                                </p>
                                <h2 className="text-lg md:text-xl font-bold tracking-tight">{trackTitle}</h2>
                                {artistText && (
                                    <p className="text-sm text-black/50 mt-1">{artistText} — {albumText}</p>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Progress Bar */}
                        {currentTrack && (
                            <div className="mt-4 flex items-center gap-3">
                                <span className="text-[10px] text-black/30 font-mono w-10 text-right">{formatTime(currentTime)}</span>
                                <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-black rounded-full"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-black/30 font-mono w-10">{formatTime(duration)}</span>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="mt-6 flex items-center justify-center gap-4">
                            <button
                                onClick={playPrev}
                                disabled={!currentTrack}
                                className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-all disabled:opacity-30"
                            >
                                <SkipBack size={18} fill="currentColor" />
                            </button>

                            <motion.button
                                onClick={currentTrack ? togglePlay : handleShuffle}
                                disabled={isShuffling}
                                className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-50"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isShuffling ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : isPlaying ? (
                                    <Pause size={22} fill="currentColor" />
                                ) : (
                                    <Play size={22} fill="currentColor" className="ml-1" />
                                )}
                            </motion.button>

                            <button
                                onClick={playNext}
                                disabled={!currentTrack}
                                className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-all disabled:opacity-30"
                            >
                                <SkipForward size={18} fill="currentColor" />
                            </button>
                        </div>

                        {/* Shuffle Button */}
                        <motion.button
                            onClick={handleShuffle}
                            disabled={isShuffling || products.length === 0}
                            className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-black/5 hover:bg-black/10 rounded-full text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-30 mx-auto"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Shuffle size={14} />
                            <span>Shuffle</span>
                        </motion.button>
                    </div>
                </motion.div>

                {/* Right Side - Album Carousel */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="w-full lg:w-1/2 flex items-center overflow-hidden relative mt-12 lg:mt-0"
                    ref={containerRef}
                >
                    {/* Gradient fade edges */}
                    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                    {/* Carousel */}
                    <motion.div
                        className="flex gap-4 py-8"
                        animate={carouselControls}
                        style={{ x: 0 }}
                    >
                        {displayProducts.map((product, index) => {
                            const imageSrc = isValidImage(product.cover_image) ? product.cover_image : defaultImage;
                            const isSelected = currentProduct?.id === product.id;

                            return (
                                <motion.div
                                    key={`${product.id}-${index}`}
                                    className={`flex-shrink-0 w-44 transition-all duration-300 ${isSelected ? 'scale-110 z-20' : 'opacity-70 hover:opacity-100'}`}
                                >
                                    <div className={`aspect-square rounded-lg overflow-hidden shadow-lg ${isSelected ? 'ring-2 ring-black ring-offset-2' : ''}`}>
                                        <img
                                            src={imageSrc}
                                            alt={product.album}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.src = defaultImage; }}
                                        />
                                    </div>
                                    <div className="mt-3 text-center">
                                        <p className="text-xs font-bold truncate">{product.album}</p>
                                        <p className="text-[10px] text-black/40 truncate">{product.artist}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default ListeningRoomPage;
