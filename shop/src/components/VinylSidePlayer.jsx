import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, X, Volume2, Maximize2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const VinylSidePlayer = ({ product, onClose, isVisible, isMini = false, onExpand }) => {
    const {
        currentTrack,
        isPlaying,
        togglePlay,
        playNext,
        playPrev,
        handleSeek,
        currentTime,
        duration,
        currentProduct
    } = usePlayer();

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
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

    // Get album name for the label
    const labelText = currentProduct?.album?.substring(0, 20) || product?.album?.substring(0, 20) || 'VINYL';
    const artistText = currentProduct?.artist || product?.artist || '';
    const trackTitle = currentTrack?.title || 'Select a track';

    // MINI MODE - Compact sidebar for catalog browsing
    if (isMini) {
        return (
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-4 top-1/2 -translate-y-1/2 z-[85]"
                    >
                        {/* Mini Player Container */}
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/5 p-4 flex flex-col items-center gap-4 relative w-28">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg z-10"
                            >
                                <X size={12} />
                            </button>

                            {/* Mini Spinning Vinyl */}
                            <div className="relative w-20 h-20">
                                <div className="absolute inset-0 rounded-full bg-neutral-200 shadow-inner" />
                                <motion.div
                                    className="absolute inset-1 rounded-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-black overflow-hidden"
                                    animate={{ rotate: isPlaying ? 360 : 0 }}
                                    transition={{
                                        repeat: isPlaying ? Infinity : 0,
                                        duration: 1.8,
                                        ease: "linear"
                                    }}
                                >
                                    {/* Grooves */}
                                    <div className="absolute inset-2 rounded-full border border-white/[0.05]" />
                                    <div className="absolute inset-4 rounded-full border border-white/[0.05]" />
                                    <div className="absolute inset-6 rounded-full border border-white/[0.05]" />

                                    {/* Center Label */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                            <span className="text-[6px] font-bold text-black/60 uppercase tracking-tight text-center leading-tight">
                                                {artistText.substring(0, 8)}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Mini Tonearm */}
                                <motion.div
                                    className="absolute -top-1 -right-1 origin-top-right z-10"
                                    animate={{ rotate: isPlaying ? 18 : -5 }}
                                    transition={{ type: "spring", damping: 15 }}
                                >
                                    <div className="w-2 h-2 rounded-full bg-neutral-500" />
                                    <div className="absolute top-1.5 right-0.5 w-[2px] h-8 bg-neutral-500 rounded-full origin-top transform -rotate-12" />
                                </motion.div>
                            </div>

                            {/* Track Info */}
                            <div className="text-center w-full px-1">
                                <p className="text-[10px] font-bold truncate">{trackTitle}</p>
                                <p className="text-[8px] text-black/40 truncate">{artistText}</p>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-black rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            {/* Controls Row */}
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={playPrev}
                                    className="w-8 h-8 flex items-center justify-center text-black/40 hover:text-black transition-colors rounded-full hover:bg-black/5"
                                >
                                    <SkipBack size={14} fill="currentColor" />
                                </button>

                                <motion.button
                                    onClick={togglePlay}
                                    className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-lg"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                                </motion.button>

                                <button
                                    onClick={playNext}
                                    className="w-8 h-8 flex items-center justify-center text-black/40 hover:text-black transition-colors rounded-full hover:bg-black/5"
                                >
                                    <SkipForward size={14} fill="currentColor" />
                                </button>
                            </div>

                            {/* Expand Button */}
                            {onExpand && (
                                <button
                                    onClick={onExpand}
                                    className="text-[9px] font-bold uppercase tracking-wider text-black/40 hover:text-black flex items-center gap-1 transition-colors"
                                >
                                    <Maximize2 size={10} />
                                    <span>Ver Album</span>
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // FULL MODE - Original side player for product page
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="h-full flex flex-col"
                >
                    {/* Close Button */}
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                        >
                            <X size={16} className="text-black/40" />
                        </button>
                    </div>

                    {/* Turntable Container */}
                    <div className="bg-[#f5f5f5] rounded-2xl p-6 shadow-lg relative">
                        {/* Tonearm */}
                        <motion.div
                            className="absolute top-4 right-8 origin-top-right z-10"
                            animate={{ rotate: isPlaying ? 22 : -5 }}
                            transition={{ type: "spring", damping: 15, stiffness: 80 }}
                        >
                            {/* Arm Base (pivot point) */}
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-600 shadow-md" />

                            {/* Arm Shaft */}
                            <div className="absolute top-3 right-1 w-[3px] h-28 bg-gradient-to-b from-neutral-500 via-neutral-600 to-neutral-700 rounded-full origin-top transform -rotate-12" />

                            {/* Headshell */}
                            <div className="absolute top-[110px] right-[-2px] w-4 h-3 bg-neutral-600 rounded-sm transform -rotate-12 origin-top-right shadow-sm" />

                            {/* Stylus */}
                            <motion.div
                                className="absolute top-[125px] right-0 w-[2px] h-3 bg-neutral-800 rounded-b-full transform -rotate-12"
                                animate={{ opacity: isPlaying ? 1 : 0.5 }}
                            />
                        </motion.div>

                        {/* Platter */}
                        <div className="relative w-full aspect-square max-w-[280px] mx-auto">
                            {/* Outer Ring */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 shadow-inner" />

                            {/* Vinyl Disc */}
                            <motion.div
                                className="absolute inset-2 rounded-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-black overflow-hidden"
                                animate={{ rotate: isPlaying ? 360 : 0 }}
                                transition={{
                                    repeat: isPlaying ? Infinity : 0,
                                    duration: 1.8,
                                    ease: "linear"
                                }}
                            >
                                {/* Vinyl Grooves */}
                                <div className="absolute inset-0">
                                    <div className="absolute inset-4 rounded-full border border-white/[0.03]" />
                                    <div className="absolute inset-8 rounded-full border border-white/[0.03]" />
                                    <div className="absolute inset-12 rounded-full border border-white/[0.03]" />
                                    <div className="absolute inset-16 rounded-full border border-white/[0.03]" />
                                    <div className="absolute inset-20 rounded-full border border-white/[0.05]" />
                                </div>

                                {/* Center Label */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                                        <span className="text-[8px] font-bold text-black/60 uppercase tracking-wider mb-1">
                                            {artistText.substring(0, 15)}
                                        </span>
                                        <span className="text-[10px] font-bold text-black uppercase tracking-tight text-center px-2 leading-tight">
                                            {labelText}
                                        </span>
                                    </div>
                                </div>

                                {/* Center Spindle */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-neutral-300 to-neutral-500 border-2 border-neutral-400" />
                                </div>
                            </motion.div>
                        </div>

                        {/* Vintage Label */}
                        <div className="absolute bottom-4 left-6 text-[10px] font-bold uppercase tracking-[0.2em] text-black/20">
                            VINTAGE
                        </div>

                        {/* Power LED */}
                        <motion.div
                            className="absolute bottom-4 right-6 w-2 h-2 rounded-full"
                            animate={{
                                backgroundColor: isPlaying ? '#22c55e' : '#9ca3af',
                                boxShadow: isPlaying ? '0 0 8px #22c55e' : 'none'
                            }}
                        />
                    </div>

                    {/* Track Info */}
                    <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-center">
                            <p className="font-bold text-sm truncate">{trackTitle}</p>
                            <p className="text-xs text-black/40 mt-1">{formatTime(currentTime)} / {formatTime(duration)}</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
                        {/* Progress Bar */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-[10px] text-black/30 font-mono w-8">{formatTime(currentTime)}</span>
                            <div
                                className="flex-1 h-1 bg-black/10 rounded-full cursor-pointer relative overflow-hidden"
                                onClick={onSeekClick}
                            >
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-black rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-black rounded-full shadow-md"
                                    style={{ left: `calc(${progress}% - 6px)` }}
                                />
                            </div>
                            <span className="text-[10px] text-black/30 font-mono w-8 text-right">{formatTime(duration)}</span>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center justify-center gap-6">
                            <button
                                onClick={playPrev}
                                className="w-10 h-10 flex items-center justify-center text-black/40 hover:text-black transition-colors"
                            >
                                <SkipBack size={20} fill="currentColor" />
                            </button>

                            <motion.button
                                onClick={togglePlay}
                                className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-lg"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
                            </motion.button>

                            <button
                                onClick={playNext}
                                className="w-10 h-10 flex items-center justify-center text-black/40 hover:text-black transition-colors"
                            >
                                <SkipForward size={20} fill="currentColor" />
                            </button>
                        </div>

                        {/* Volume (decorative) */}
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <Volume2 size={14} className="text-black/30" />
                            <div className="w-24 h-1 bg-black/10 rounded-full relative">
                                <div className="absolute top-0 left-0 h-full w-2/3 bg-black/30 rounded-full" />
                                <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-black rounded-full" style={{ left: 'calc(66% - 4px)' }} />
                            </div>
                        </div>
                    </div>

                    {/* Playlist Hint */}
                    <div className="mt-4 text-center">
                        <p className="text-[10px] text-black/30 uppercase tracking-widest">
                            Click tracks on the left to play
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default VinylSidePlayer;
