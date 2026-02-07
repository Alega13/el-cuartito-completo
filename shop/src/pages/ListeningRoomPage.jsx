import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Shuffle, SkipForward, SkipBack, ExternalLink, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import defaultImage from '../assets/default-vinyl.png';
import SEO from '../components/SEO';
import SelectionsSidebar from '../components/SelectionsSidebar';
import listeningRoomLogo from '../assets/listening-room-logo.png';
import './ListeningRoom.css';

// Sound effect URLs (royalty-free vinyl sounds)
const SOUNDS = {
    motorStart: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    armLift: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    needleDrop: 'https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3',
};

const ListeningRoomPage = ({ products = [] }) => {
    const navigate = useNavigate();
    const {
        currentTrack,
        isPlaying,
        togglePlay,
        playNext,
        playPrev,
        currentTime,
        duration,
        currentProduct,
        playTrack,
        setShowSidePlayer,
        playlist,
        activeVideos
    } = usePlayer();

    // States
    const [isShuffling, setIsShuffling] = useState(false);
    const [ritualPhase, setRitualPhase] = useState('idle'); // idle, motor, arm-lift, arm-swing, needle-drop, playing
    const [showNowPlaying, setShowNowPlaying] = useState(false);
    const [currentTracks, setCurrentTracks] = useState([]);
    const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);

    // Get unique genres from products
    const genres = useMemo(() => {
        const allGenres = products
            .flatMap(p => p.genre?.split(',').map(g => g.trim()) || [])
            .filter(Boolean);
        return [...new Set(allGenres)].sort();
    }, [products]);

    // Filter products by selected genre
    const filteredProducts = useMemo(() => {
        if (!selectedGenre) return products;
        return products.filter(p =>
            p.genre?.toLowerCase().includes(selectedGenre.toLowerCase())
        );
    }, [products, selectedGenre]);

    // Refs for sound effects
    const motorSoundRef = useRef(null);
    const armSoundRef = useRef(null);
    const needleSoundRef = useRef(null);

    // Preload sounds
    useEffect(() => {
        motorSoundRef.current = new Audio(SOUNDS.motorStart);
        armSoundRef.current = new Audio(SOUNDS.armLift);
        needleSoundRef.current = new Audio(SOUNDS.needleDrop);

        // Set volumes
        if (motorSoundRef.current) motorSoundRef.current.volume = 0.3;
        if (armSoundRef.current) armSoundRef.current.volume = 0.4;
        if (needleSoundRef.current) needleSoundRef.current.volume = 0.5;

        return () => {
            [motorSoundRef, armSoundRef, needleSoundRef].forEach(ref => {
                if (ref.current) {
                    ref.current.pause();
                    ref.current = null;
                }
            });
        };
    }, []);

    // Update ritual phase based on playback state
    useEffect(() => {
        if (isPlaying && ritualPhase === 'idle') {
            setRitualPhase('playing');
            setShowNowPlaying(true);
        } else if (!isPlaying && !currentTrack && ritualPhase === 'playing') {
            setRitualPhase('idle');
            setShowNowPlaying(false);
        }
    }, [isPlaying, currentTrack, ritualPhase]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Helper to check if image is valid
    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        return true;
    };

    // The Ritual - Multisensory playback sequence
    const executeRitual = useCallback(async (trackToPlay, productToPlay, tracks, videos) => {
        // Phase 1: Motor starts
        setRitualPhase('motor');
        try {
            motorSoundRef.current?.play();
        } catch (e) { /* Audio may be blocked */ }

        await new Promise(r => setTimeout(r, 600));

        // Phase 2: Arm lifts
        setRitualPhase('arm-lift');
        try {
            armSoundRef.current?.play();
        } catch (e) { /* Audio may be blocked */ }

        await new Promise(r => setTimeout(r, 500));

        // Phase 3: Arm swings to record
        setRitualPhase('arm-swing');
        await new Promise(r => setTimeout(r, 800));

        // Phase 4: Needle drops
        setRitualPhase('needle-drop');
        try {
            needleSoundRef.current?.play();
        } catch (e) { /* Audio may be blocked */ }

        await new Promise(r => setTimeout(r, 600));

        // Phase 5: Show now playing and start music
        setShowNowPlaying(true);
        setRitualPhase('playing');

        // Actually play the track
        playTrack(trackToPlay, productToPlay, tracks, videos);
        setShowSidePlayer(true);
    }, [playTrack, setShowSidePlayer]);

    // Handle manual track click from the tracklist
    const handleTrackClick = useCallback((track) => {
        if (!currentProduct || isShuffling) return;

        // Prevent clicking if a ritual is already in progress (unless already playing)
        if (ritualPhase !== 'idle' && ritualPhase !== 'playing') return;

        // If we're already playing this record, just switch tracks instantly
        if (ritualPhase === 'playing') {
            playTrack(track, currentProduct, playlist, activeVideos);
            setShowSidePlayer(true);
        } else {
            // If it's stopped, run the ritual
            executeRitual(track, currentProduct, playlist, activeVideos);
        }
    }, [currentProduct, isShuffling, ritualPhase, playTrack, playlist, activeVideos, executeRitual, setShowSidePlayer]);

    // Shuffle with ritual
    const handleShuffle = async () => {
        if (filteredProducts.length === 0 || isShuffling) return;

        setIsShuffling(true);

        // Pick random product from filtered list, excluding the current one if possible
        const otherProducts = filteredProducts.filter(p => p.id !== currentProduct?.id);
        const pool = otherProducts.length > 0 ? otherProducts : filteredProducts;

        const randomIndex = Math.floor(Math.random() * pool.length);
        const randomProduct = pool[randomIndex];

        // Fetch track info with timeout
        try {
            const token = "BVpmDeAWjZxLXksEHfHPjAztaNfYoUEsFrRxCLwK";
            let releaseId = randomProduct.discogsId || randomProduct.discogs_release_id;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            try {
                if (!releaseId) {
                    const searchRes = await fetch(
                        `https://api.discogs.com/database/search?q=${encodeURIComponent(randomProduct.artist + ' ' + randomProduct.album)}&type=release&token=${token}`,
                        { signal: controller.signal }
                    );
                    const searchData = await searchRes.json();
                    if (searchData.results?.length > 0) {
                        releaseId = searchData.results[0].id;
                    }
                }

                if (releaseId) {
                    const releaseRes = await fetch(
                        `https://api.discogs.com/releases/${releaseId}?token=${token}`,
                        { signal: controller.signal }
                    );
                    const releaseData = await releaseRes.json();
                    const tracks = releaseData.tracklist || [];
                    const videos = releaseData.videos || [];
                    // currentReleaseVideos state removed, playTrack will handle setting activeVideos

                    if (tracks.length > 0) {
                        const trackIndex = Math.floor(Math.random() * tracks.length);
                        const track = { ...tracks[trackIndex], index: trackIndex };

                        // Execute the ritual with the track
                        await executeRitual(track, randomProduct, tracks, videos);
                    }
                }
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn("Discogs API request timed out");
            } else {
                console.error("Error fetching/playing track:", error);
            }
            setRitualPhase('idle');
        } finally {
            setIsShuffling(false);
        }
    };

    const trackTitle = currentTrack?.title || 'Ready to Play';
    const artistText = currentProduct?.artist || '';
    const albumText = currentProduct?.album || '';
    const albumCover = currentProduct && isValidImage(currentProduct.cover_image)
        ? currentProduct.cover_image
        : null;

    const isVinylSpinning = (ritualPhase === 'motor' || ritualPhase === 'arm-lift' ||
        ritualPhase === 'arm-swing' || ritualPhase === 'needle-drop' ||
        ritualPhase === 'playing') && isPlaying;

    const isTonearmPlaying = (ritualPhase === 'arm-swing' || ritualPhase === 'needle-drop' ||
        ritualPhase === 'playing') && isPlaying;

    const isStylusDropped = (ritualPhase === 'needle-drop' || ritualPhase === 'playing') && isPlaying;

    return (
        <div className="listening-room">
            <SEO
                title="Listening Room"
                description="Experience vinyl in high-fidelity. An interactive listening room with realistic turntable animation. Discover and preview records from our curated collection."
                url="/listening"
            />
            {/* Page Title - Top Center */}
            <div className="listening-title-block">
                <img src={listeningRoomLogo} alt="The Listening Room" className="listening-room-logo" />
            </div>

            {/* Left Panel - Visualizer */}
            <div className="left-panel">
                <div className="album-visualizer-container">
                    {/* Dynamic Ambient Glow */}
                    <AnimatePresence mode='wait'>
                        {currentProduct && (
                            <motion.div
                                key={`glow-${currentProduct.id}`}
                                className="ambient-glow"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1 }}
                                style={{
                                    backgroundImage: `url(${albumCover || defaultImage})`
                                }}
                            />
                        )}
                    </AnimatePresence>

                    {/* The Rotating Disc (Picture Disc) */}
                    <div className="visualizer-platter">
                        <motion.div
                            className={`picture-disc ${isPlaying ? 'spinning' : ''}`}
                            animate={{
                                rotate: isPlaying ? 360 : 0
                            }}
                            transition={{
                                repeat: isPlaying ? Infinity : 0,
                                duration: 1.8, // 33.3 RPM
                                ease: "linear"
                            }}
                        >
                            <div
                                className="disc-art"
                                style={{
                                    backgroundImage: `url(${albumCover || defaultImage})`
                                }}
                            />
                            {/* Realistic Overlays */}
                            <div className="disc-vinyl-shimmer" />
                            <div className="disc-grooves" />
                            <div className="disc-spindle-hole" />
                        </motion.div>

                        {/* Shadow and Depth Under the Disc */}
                        <div className="disc-shadow" />
                    </div>
                </div>

                {/* Title and Controls */}
                <div className="listening-controls">
                    <div className="genre-filter-container">
                        <div className="genre-filter">
                            <button
                                className="genre-filter-btn dropdown"
                                onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
                            >
                                {selectedGenre || 'All Genres'}
                                <ChevronDown size={14} className={isGenreDropdownOpen ? 'rotated' : ''} />
                            </button>

                            <AnimatePresence>
                                {isGenreDropdownOpen && (
                                    <motion.div
                                        className="genre-dropdown minimalist"
                                        initial={{ opacity: 0, y: -10, x: "-50%" }}
                                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                                        exit={{ opacity: 0, y: -10, x: "-50%" }}
                                    >
                                        <button
                                            className={`genre-option ${!selectedGenre ? 'active' : ''}`}
                                            onClick={() => { setSelectedGenre(null); setIsGenreDropdownOpen(false); }}
                                        >
                                            All Genres
                                        </button>
                                        {genres.map(genre => (
                                            <button
                                                key={genre}
                                                className={`genre-option ${selectedGenre === genre ? 'active' : ''}`}
                                                onClick={() => { setSelectedGenre(genre); setIsGenreDropdownOpen(false); }}
                                            >
                                                {genre}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Discover Button - Redesigned */}
                    <button
                        className="discover-grooves-btn"
                        onClick={handleShuffle}
                        disabled={isShuffling || filteredProducts.length === 0}
                    >
                        {isShuffling ? (
                            <span className="shuffle-loading">Seeking magic...</span>
                        ) : (
                            <>
                                <Shuffle size={18} />
                                <span>Discover new grooves</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Right Panel - Random Pick Section */}
            <div className="right-panel">
                <AnimatePresence>
                    {currentProduct && (
                        <motion.div
                            className="random-pick-section"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 30 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            <h3 className="random-pick-title">Random Pick</h3>

                            <div className="random-pick-content">
                                <div className="random-pick-grid">
                                    {/* Left Column: Album ONLY */}
                                    <div className="random-pick-left-col">
                                        <div className="random-pick-album">
                                            <img
                                                src={albumCover || defaultImage}
                                                alt={albumText}
                                                onError={(e) => { e.currentTarget.src = defaultImage; }}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Tracklist */}
                                    <div className="random-pick-right-col">
                                        <div className="random-pick-tracklist-container">
                                            <div className="tracklist-header">Tracklist</div>
                                            <div className="random-pick-tracklist">
                                                {playlist && playlist.map((track, index) => (
                                                    <div
                                                        key={index}
                                                        className={`tracklist-item ${currentTrack?.index === index ? 'active' : ''}`}
                                                        onClick={() => handleTrackClick({ ...track, index })}
                                                    >
                                                        <span className="track-number">{(index + 1).toString().padStart(2, '0')}</span>
                                                        <span className="track-name">{track.title}</span>
                                                        {currentTrack?.index === index && isPlaying && (
                                                            <div className="playing-bars">
                                                                <div className="bar" />
                                                                <div className="bar" />
                                                                <div className="bar" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {currentProduct.description && (
                                            <div className="random-pick-notes">
                                                <div className="notes-header">Record Notes</div>
                                                <div className="notes-content">{currentProduct.description}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Metadata & Controls Row (Red Box Area) */}
                                <div className="random-pick-player-row">
                                    <div className="random-pick-meta">
                                        <div className="random-pick-track">{trackTitle}</div>
                                        <div className="random-pick-artist">{artistText}</div>
                                    </div>

                                    <div className="random-pick-bottom-controls">
                                        <div className="random-pick-progress">
                                            <div className="progress-bar">
                                                <motion.div
                                                    className="progress-fill"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <div className="progress-times">
                                                <span>{formatTime(currentTime)}</span>
                                                <span>{formatTime(duration)}</span>
                                            </div>
                                        </div>

                                        <div className="random-pick-controls">
                                            <button className="pick-control-btn" onClick={playPrev}>
                                                <SkipBack size={16} />
                                            </button>
                                            <button className="pick-control-btn play-btn" onClick={togglePlay}>
                                                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                                            </button>
                                            <button className="pick-control-btn" onClick={playNext}>
                                                <SkipForward size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider Line (Green Line) */}
                                <div className="random-pick-divider" />

                                {/* View Catalog Button (Blue Box Area) */}
                                <div className="random-pick-actions">
                                    <button
                                        className="view-catalog-btn"
                                        onClick={() => {
                                            if (currentProduct) {
                                                navigate(`/product/${currentProduct.id}`);
                                            }
                                        }}
                                    >
                                        View in Catalog
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty state when no track selected */}
                {!currentProduct && (
                    <div className="empty-pick-state">
                        <div className="empty-pick-icon">
                            <Shuffle size={48} />
                        </div>
                        <p className="empty-pick-text">Press Shuffle to discover a random record</p>
                    </div>
                )}
            </div>

            {/* Selections Sidebar */}
            <SelectionsSidebar />
        </div>
    );
};

export default ListeningRoomPage;
