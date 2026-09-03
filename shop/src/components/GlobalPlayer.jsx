import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, SkipBack, SkipForward, List } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import defaultImage from '../assets/default-vinyl.png';

const GlobalPlayer = () => {
    const location = useLocation();
    const isProductPage = location.pathname.startsWith('/product');

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
        currentProduct,
        playlist
    } = usePlayer();

    const [showTracklist, setShowTracklist] = useState(false);

    if (!currentTrack || isProductPage) return null;

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
                    className="fixed bottom-0 left-0 right-0 z-[100] bg-[#F3F3F3]/80 backdrop-blur-md text-black w-full overflow-hidden border-t border-black/10 safe-area-bottom"
                >
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-black/10 cursor-pointer group relative" onClick={onSeekClick}>
                        <motion.div
                            className="absolute top-0 left-0 h-full bg-accent group-hover:bg-accent-focus transition-colors"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                    </div>

                    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
                        {/* Track Info */}
                        <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black/10 rounded-sm overflow-hidden flex-shrink-0">
                                <img
                                    src={imageSrc}
                                    onError={(e) => { e.currentTarget.src = defaultImage; }}
                                    className="w-full h-full object-cover opacity-80"
                                    alt="Art"
                                />
                            </div>
                            <div className="flex flex-col justify-center min-w-0">
                                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-black/50 mb-0.5">Now Playing</span>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs sm:text-sm font-bold truncate">{currentTrack.title}</span>
                                    <span className="hidden sm:inline text-xs text-black/40 border-l border-black/20 pl-2 ml-2 truncate">{currentProduct?.artist}</span>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 sm:gap-6 relative">
                            {/* Tracklist Popup */}
                            <AnimatePresence>
                                {showTracklist && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute bottom-full right-0 mb-4 w-64 bg-[#F3F3F3] border border-black/10 shadow-2xl z-[101] max-h-64 overflow-y-auto"
                                    >
                                        <div className="p-3 border-b border-black/10 flex justify-between items-center bg-[#F3F3F3] sticky top-0">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">Tracklist</span>
                                            <button onClick={() => setShowTracklist(false)} className="text-black/50 hover:text-black">
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="flex flex-col">
                                            {playlist && playlist.length > 0 ? (
                                                playlist.map((track, idx) => {
                                                    const isTrackCurrent = currentTrack.index === track.index;
                                                    return (
                                                        <div key={idx} className={`px-4 py-3 flex items-center gap-3 text-sm cursor-pointer hover:bg-black/5 ${isTrackCurrent ? 'font-bold' : ''}`}>
                                                            <span className="text-[10px] text-black/30 w-4">{track.position}</span>
                                                            <span className="truncate flex-1">{track.title}</span>
                                                            {isTrackCurrent && <Play size={10} fill="currentColor" className="text-black" />}
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div className="p-4 text-xs text-black/50">No tracklist available</div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Tracklist Button (Desktop only) */}
                            <button onClick={() => setShowTracklist(!showTracklist)} className={`hidden sm:block p-1 transition-colors ${showTracklist ? 'text-black' : 'text-black/60 hover:text-black'}`}>
                                <List size={18} />
                            </button>

                            {/* Prev Button (Desktop only) */}
                            <button onClick={playPrev} className="hidden sm:block p-1 text-black/60 hover:text-black transition-colors">
                                <SkipBack size={18} fill="currentColor" />
                            </button>

                            {/* Play / Pause Button */}
                            <button
                                onClick={togglePlay}
                                className="w-8 h-8 sm:w-10 sm:h-10 text-black flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                            >
                                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                            </button>

                            {/* Next Button */}
                            <button onClick={playNext} className="p-1 text-black/60 hover:text-black transition-colors">
                                <SkipForward size={18} fill="currentColor" />
                            </button>

                            <div className="hidden sm:block w-px h-6 bg-black/20 mx-2" />

                            {/* Close Button */}
                            <button
                                onClick={closePlayer}
                                className="p-1 text-black/40 hover:text-black transition-colors ml-1 sm:ml-0"
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
