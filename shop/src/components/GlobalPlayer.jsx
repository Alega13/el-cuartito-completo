import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, SkipBack, SkipForward } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import defaultImage from '../assets/default-vinyl.png';

const GlobalPlayer = () => {
    const {
        currentTrack,
        isPlaying,
        togglePlay,
        playNext,
        playPrev,
        closePlayer,
        handleSeek,
        currentTime,
        duration,
        currentProduct
    } = usePlayer();

    if (!currentTrack) return null;

    // Helper to check if image is valid (duplicate logic but safe)
    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    const imageSrc = currentProduct && isValidImage(currentProduct.cover_image)
        ? currentProduct.cover_image
        : defaultImage;

    const onSeekClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        const newTime = percent * duration;
        handleSeek(newTime);
    };

    return (
        <AnimatePresence>
            {currentTrack && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    className="fixed bottom-0 left-0 right-0 z-[90] bg-black text-white w-full overflow-hidden border-t border-white/10"
                >
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-white/10 cursor-pointer group relative" onClick={onSeekClick}>
                        <motion.div
                            className="absolute top-0 left-0 h-full bg-accent group-hover:bg-accent-focus transition-colors"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                    </div>

                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        {/* Track Info */}
                        <div className="flex items-center gap-6 flex-1">
                            <div className="w-10 h-10 bg-white/10 rounded-sm overflow-hidden flex-shrink-0">
                                <img
                                    src={imageSrc}
                                    onError={(e) => { e.currentTarget.src = defaultImage; }}
                                    className="w-full h-full object-cover opacity-80"
                                    alt="Art"
                                />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Now Playing</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold truncate max-w-[150px] md:max-w-xs">{currentTrack.title}</span>
                                    <span className="hidden md:inline text-xs text-white/40 border-l border-white/20 pl-2 ml-2">{currentProduct?.artist}</span>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-4 md:gap-6">
                            <button onClick={playPrev} className="text-white/60 hover:text-white transition-colors">
                                <SkipBack size={20} fill="currentColor" />
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                            >
                                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                            </button>

                            <button onClick={playNext} className="text-white/60 hover:text-white transition-colors">
                                <SkipForward size={20} fill="currentColor" />
                            </button>

                            <div className="w-px h-6 bg-white/20 mx-2" />

                            <button
                                onClick={closePlayer}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalPlayer;
