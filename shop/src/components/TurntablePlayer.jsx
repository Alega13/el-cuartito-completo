import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, SkipBack, SkipForward } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import defaultImage from '../assets/default-vinyl.png';

const TurntablePlayer = () => {
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

    // Helper to check if image is valid
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

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

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
                    initial={{ y: 200, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 200, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-[90] bg-gradient-to-t from-black via-black/95 to-black/90 backdrop-blur-xl text-white border-t border-white/10"
                >
                    {/* Desktop Layout */}
                    <div className="hidden md:block">
                        <div className="max-w-6xl mx-auto px-8 py-6">
                            <div className="flex items-center gap-8">
                                {/* Turntable Section */}
                                <div className="relative flex items-center gap-4">
                                    {/* Platter Base */}
                                    <div className="relative w-32 h-32">
                                        {/* Platter Shadow */}
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 shadow-2xl" />

                                        {/* Spinning Vinyl */}
                                        <motion.div
                                            className="absolute inset-1 rounded-full overflow-hidden"
                                            animate={{ rotate: isPlaying ? 360 : 0 }}
                                            transition={{
                                                repeat: isPlaying ? Infinity : 0,
                                                duration: 1.8, // ~33 RPM
                                                ease: "linear"
                                            }}
                                        >
                                            {/* Vinyl Grooves */}
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-black">
                                                {/* Groove Lines */}
                                                <div className="absolute inset-2 rounded-full border border-white/5" />
                                                <div className="absolute inset-4 rounded-full border border-white/5" />
                                                <div className="absolute inset-6 rounded-full border border-white/5" />
                                                <div className="absolute inset-8 rounded-full border border-white/5" />
                                            </div>

                                            {/* Center Label (Album Art) */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
                                                    <img
                                                        src={imageSrc}
                                                        alt="Album"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.currentTarget.src = defaultImage; }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Center Spindle */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-600 shadow-inner" />
                                            </div>
                                        </motion.div>

                                        {/* Progress Ring */}
                                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                                            <circle
                                                cx="64"
                                                cy="64"
                                                r="62"
                                                fill="none"
                                                stroke="rgba(255,255,255,0.1)"
                                                strokeWidth="2"
                                            />
                                            <motion.circle
                                                cx="64"
                                                cy="64"
                                                r="62"
                                                fill="none"
                                                stroke="url(#progressGradient)"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeDasharray={`${2 * Math.PI * 62}`}
                                                strokeDashoffset={2 * Math.PI * 62 * (1 - progress / 100)}
                                            />
                                            <defs>
                                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#f97316" />
                                                    <stop offset="100%" stopColor="#fb923c" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>

                                    {/* Tonearm */}
                                    <div className="absolute -right-2 -top-2 w-20 h-24 pointer-events-none">
                                        <motion.div
                                            className="absolute top-0 right-0 origin-top-right"
                                            animate={{ rotate: isPlaying ? 28 : 5 }}
                                            transition={{ type: "spring", damping: 20, stiffness: 100 }}
                                        >
                                            {/* Arm Base */}
                                            <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-600 shadow-lg" />

                                            {/* Arm */}
                                            <div className="absolute top-2 right-1.5 w-1 h-16 bg-gradient-to-b from-neutral-400 via-neutral-500 to-neutral-600 rounded-full shadow-md transform rotate-12 origin-top" />

                                            {/* Headshell */}
                                            <div className="absolute top-[60px] right-0 w-3 h-2 bg-neutral-500 rounded-sm transform rotate-12 origin-top-right shadow" />

                                            {/* Cartridge/Stylus */}
                                            <motion.div
                                                className="absolute top-[68px] right-0.5 w-0.5 h-2 bg-orange-400 rounded-b-full transform rotate-12"
                                                animate={{
                                                    scaleY: isPlaying ? 1 : 0.7,
                                                    opacity: isPlaying ? 1 : 0.6
                                                }}
                                            />
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Track Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400/80">
                                            Now Playing
                                        </span>
                                        <h3 className="text-lg font-bold truncate">{currentTrack.title}</h3>
                                        <p className="text-sm text-white/50 truncate">{currentProduct?.artist} — {currentProduct?.album}</p>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-4 flex items-center gap-3">
                                        <span className="text-xs text-white/40 w-10 text-right font-mono">{formatTime(currentTime)}</span>
                                        <div
                                            className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer group relative overflow-hidden"
                                            onClick={onSeekClick}
                                        >
                                            <motion.div
                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                                                style={{ width: `${progress}%` }}
                                            />
                                            <motion.div
                                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                style={{ left: `calc(${progress}% - 6px)` }}
                                            />
                                        </div>
                                        <span className="text-xs text-white/40 w-10 font-mono">{formatTime(duration)}</span>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={playPrev}
                                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:scale-105"
                                    >
                                        <SkipBack size={18} fill="currentColor" />
                                    </button>

                                    <motion.button
                                        onClick={togglePlay}
                                        className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
                                    </motion.button>

                                    <button
                                        onClick={playNext}
                                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:scale-105"
                                    >
                                        <SkipForward size={18} fill="currentColor" />
                                    </button>

                                    <div className="w-px h-8 bg-white/10 mx-2" />

                                    <button
                                        onClick={closePlayer}
                                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="md:hidden">
                        <div className="px-4 py-4">
                            <div className="flex items-center gap-4">
                                {/* Mini Spinning Vinyl */}
                                <div className="relative w-16 h-16 flex-shrink-0">
                                    <div className="absolute inset-0 rounded-full bg-neutral-900" />
                                    <motion.div
                                        className="absolute inset-0.5 rounded-full overflow-hidden"
                                        animate={{ rotate: isPlaying ? 360 : 0 }}
                                        transition={{
                                            repeat: isPlaying ? Infinity : 0,
                                            duration: 1.8,
                                            ease: "linear"
                                        }}
                                    >
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neutral-800 to-black">
                                            <div className="absolute inset-1 rounded-full border border-white/5" />
                                            <div className="absolute inset-2 rounded-full border border-white/5" />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                                                <img
                                                    src={imageSrc}
                                                    alt="Album"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.src = defaultImage; }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Mini Tonearm */}
                                    <motion.div
                                        className="absolute -top-1 -right-1 w-6 h-8 origin-top-right"
                                        animate={{ rotate: isPlaying ? 20 : 0 }}
                                        transition={{ type: "spring", damping: 15 }}
                                    >
                                        <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-neutral-500" />
                                        <div className="absolute top-1 right-0.5 w-0.5 h-6 bg-neutral-500 rounded-full transform rotate-6 origin-top" />
                                        <motion.div
                                            className="absolute top-[22px] right-0 w-0.5 h-1 bg-orange-400 rounded-b-full transform rotate-6"
                                            animate={{ opacity: isPlaying ? 1 : 0.5 }}
                                        />
                                    </motion.div>
                                </div>

                                {/* Track Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-orange-400/80 font-bold uppercase tracking-wider mb-0.5">Now Playing</p>
                                    <h4 className="font-bold text-sm truncate">{currentTrack.title}</h4>
                                    <p className="text-xs text-white/40 truncate">{currentProduct?.artist}</p>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-2">
                                    <button onClick={playPrev} className="w-8 h-8 flex items-center justify-center text-white/60">
                                        <SkipBack size={16} fill="currentColor" />
                                    </button>

                                    <motion.button
                                        onClick={togglePlay}
                                        className="w-11 h-11 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                                    </motion.button>

                                    <button onClick={playNext} className="w-8 h-8 flex items-center justify-center text-white/60">
                                        <SkipForward size={16} fill="currentColor" />
                                    </button>

                                    <button onClick={closePlayer} className="w-8 h-8 flex items-center justify-center text-white/40 ml-1">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] text-white/30 font-mono w-8">{formatTime(currentTime)}</span>
                                <div
                                    className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden"
                                    onClick={onSeekClick}
                                >
                                    <motion.div
                                        className="h-full bg-orange-500 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-white/30 font-mono w-8 text-right">{formatTime(duration)}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TurntablePlayer;
