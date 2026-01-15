import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Shuffle, SkipForward, SkipBack, Volume2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

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

    const [isLoading, setIsLoading] = useState(false);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Shuffle - Play random track from catalog
    const handleShuffle = async () => {
        if (products.length === 0 || isLoading) return;

        setIsLoading(true);

        try {
            // Pick random product
            const randomProduct = products[Math.floor(Math.random() * products.length)];

            // Fetch tracklist from Discogs
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
                    // Pick random track
                    const randomIndex = Math.floor(Math.random() * tracks.length);
                    const randomTrack = { ...tracks[randomIndex], index: randomIndex };

                    playTrack(randomTrack, randomProduct, tracks, videos);
                }
            }
        } catch (error) {
            console.error("Error shuffling:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const trackTitle = currentTrack?.title || 'Press Shuffle to Start';
    const artistText = currentProduct?.artist || '';
    const albumText = currentProduct?.album || '';

    return (
        <div className="min-h-screen bg-neutral-950 text-white pt-24 pb-12 px-6 flex flex-col items-center justify-center">
            {/* Page Title */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-28 left-8 md:left-12"
            >
                <h1 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
                    Listening Room
                </h1>
            </motion.div>

            {/* Main Turntable Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-lg aspect-square"
            >
                {/* Turntable Base */}
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black rounded-3xl shadow-2xl border border-white/5">
                    {/* Wood grain texture overlay */}
                    <div className="absolute inset-0 rounded-3xl opacity-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_4px)]" />
                </div>

                {/* Platter */}
                <div className="absolute inset-8 md:inset-12">
                    {/* Platter Base Ring */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 shadow-inner" />

                    {/* Rubber Mat */}
                    <div className="absolute inset-2 rounded-full bg-neutral-900" />

                    {/* Spinning Vinyl */}
                    <motion.div
                        className="absolute inset-4 rounded-full bg-gradient-to-br from-neutral-950 via-neutral-900 to-black overflow-hidden shadow-2xl"
                        animate={{ rotate: isPlaying ? 360 : 0 }}
                        transition={{
                            repeat: isPlaying ? Infinity : 0,
                            duration: 1.8,
                            ease: "linear"
                        }}
                    >
                        {/* Vinyl Grooves */}
                        <div className="absolute inset-0">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute rounded-full border border-white/[0.02]"
                                    style={{
                                        inset: `${8 + i * 6}%`
                                    }}
                                />
                            ))}
                        </div>

                        {/* Shiny reflection */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />

                        {/* Center Label */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1/3 aspect-square rounded-full bg-gradient-to-br from-orange-600 to-orange-800 flex flex-col items-center justify-center shadow-lg border-2 border-orange-900/50">
                                <span className="text-[8px] md:text-[10px] font-bold text-white/80 uppercase tracking-wider text-center px-2 leading-tight">
                                    {artistText.substring(0, 12) || 'EL CUARTITO'}
                                </span>
                                <div className="w-3 h-3 rounded-full bg-neutral-900 mt-1 border border-neutral-700" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Tonearm Assembly */}
                <motion.div
                    className="absolute top-6 right-6 md:top-8 md:right-8 origin-top-right z-20"
                    animate={{ rotate: isPlaying ? 28 : 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 80 }}
                >
                    {/* Arm Base/Pivot */}
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-600 shadow-lg border border-neutral-500" />

                    {/* Counter Weight */}
                    <div className="absolute top-8 right-4 w-4 h-4 rounded-full bg-neutral-600 shadow-md" />

                    {/* Arm Tube */}
                    <div className="absolute top-4 right-2 w-1 h-32 bg-gradient-to-b from-neutral-400 via-neutral-500 to-neutral-600 rounded-full origin-top transform -rotate-12 shadow-md" />

                    {/* Headshell */}
                    <div className="absolute top-[130px] right-[-4px] w-5 h-3 bg-neutral-500 rounded-sm transform -rotate-12 origin-top-right shadow" />

                    {/* Cartridge */}
                    <div className="absolute top-[140px] right-[-2px] w-3 h-2 bg-neutral-700 rounded-sm transform -rotate-12" />

                    {/* Stylus */}
                    <motion.div
                        className="absolute top-[150px] right-0 w-[2px] h-3 bg-orange-400 rounded-b-full transform -rotate-12"
                        animate={{
                            opacity: isPlaying ? 1 : 0.4,
                            scaleY: isPlaying ? 1 : 0.8
                        }}
                    />
                </motion.div>

                {/* Power Button */}
                <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 flex items-center gap-3">
                    <motion.div
                        className="w-3 h-3 rounded-full"
                        animate={{
                            backgroundColor: isPlaying ? '#22c55e' : '#4b5563',
                            boxShadow: isPlaying ? '0 0 12px #22c55e' : 'none'
                        }}
                    />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">Power</span>
                </div>

                {/* Speed Selector (decorative) */}
                <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 flex items-center gap-2">
                    <span className="text-[8px] font-bold text-white/20">33</span>
                    <div className="w-6 h-3 bg-neutral-800 rounded-full border border-neutral-700">
                        <div className="w-2 h-2 bg-orange-500 rounded-full m-0.5" />
                    </div>
                    <span className="text-[8px] font-bold text-white/40">45</span>
                </div>
            </motion.div>

            {/* Track Info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-10 text-center max-w-md"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={trackTitle}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400/60 mb-2">
                            {isPlaying ? 'Now Playing' : 'Ready'}
                        </p>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">{trackTitle}</h2>
                        {artistText && (
                            <p className="text-sm text-white/50 mt-1">{artistText} — {albumText}</p>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Progress Bar */}
                {currentTrack && (
                    <div className="mt-6 flex items-center gap-3">
                        <span className="text-[10px] text-white/30 font-mono w-10 text-right">{formatTime(currentTime)}</span>
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-white/30 font-mono w-10">{formatTime(duration)}</span>
                    </div>
                )}
            </motion.div>

            {/* Controls */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 flex items-center gap-4"
            >
                <button
                    onClick={playPrev}
                    disabled={!currentTrack}
                    className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all disabled:opacity-30"
                >
                    <SkipBack size={20} fill="currentColor" />
                </button>

                <motion.button
                    onClick={currentTrack ? togglePlay : handleShuffle}
                    disabled={isLoading}
                    className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 disabled:opacity-50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isPlaying ? (
                        <Pause size={24} fill="currentColor" />
                    ) : (
                        <Play size={24} fill="currentColor" className="ml-1" />
                    )}
                </motion.button>

                <button
                    onClick={playNext}
                    disabled={!currentTrack}
                    className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all disabled:opacity-30"
                >
                    <SkipForward size={20} fill="currentColor" />
                </button>
            </motion.div>

            {/* Shuffle Button */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={handleShuffle}
                disabled={isLoading || products.length === 0}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-30"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <Shuffle size={16} />
                <span>Shuffle All</span>
            </motion.button>

            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                    animate={{
                        background: isPlaying
                            ? 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)'
                    }}
                    transition={{ duration: 1 }}
                />
            </div>
        </div>
    );
};

export default ListeningRoomPage;
