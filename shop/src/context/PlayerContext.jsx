import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
};

export const PlayerProvider = ({ children }) => {
    // Top loaded product info (for metadata and fallback searches)
    const [currentProduct, setCurrentProduct] = useState(null);
    const [playlist, setPlaylist] = useState([]); // Array of tracks

    // Audio State
    const [currentTrack, setCurrentTrack] = useState(null); // { index, title, url, source, duration, ... }
    const [isPlaying, setIsPlaying] = useState(false);
    const [previews, setPreviews] = useState({}); // Cache: { trackIndex: { url, source } }

    // Progress
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Refs
    const audioRef = useRef(null);
    const youtubePlayerRef = useRef(null);

    // Initialize YouTube API global
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }, []);


    // --- HELPERS (Migrated from ProductPage) ---

    // 1. iTunes
    const fetchItunesPreview = async (track, product) => {
        try {
            const cleanTitle = track.title.split('(')[0].trim();
            const query = `${product.artist} ${cleanTitle}`;
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`);
            const data = await res.json();
            if (data.results?.length > 0 && data.results[0].previewUrl) {
                return { url: data.results[0].previewUrl, source: 'itunes' };
            }
        } catch (e) { console.error(e); }
        return null;
    };

    // 2. YouTube (Native search if no direct video list provided? Or pass videos?)
    // In ProductPage we had discogsVideos. We need to pass that in playTrack.
    const findYoutubeVideo = (track, product, discogsVideos) => {
        if (!discogsVideos || discogsVideos.length === 0) return null;

        const trackTitle = track.title.toLowerCase();
        const artist = product.artist?.toLowerCase() || '';

        const match = discogsVideos.find(v => {
            const vidTitle = v.title.toLowerCase();
            return vidTitle.includes(trackTitle) || (vidTitle.includes(artist) && vidTitle.includes(trackTitle));
        });

        if (match) {
            let id = match.uri.split('v=')[1];
            if (id) {
                const ampersandPosition = id.indexOf('&');
                if (ampersandPosition !== -1) {
                    id = id.substring(0, ampersandPosition);
                }
                return { url: id, source: 'youtube', title: match.title };
            }
        }
        return null;
    };

    // 3. Bandcamp
    const fetchBandcampPreview = async (track, product) => {
        try {
            const query = encodeURIComponent(`${product.artist} ${product.album}`);
            const searchUrl = `https://bandcamp.com/search?q=${query}`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;

            const searchRes = await fetch(proxyUrl);
            const searchJson = await searchRes.json();
            const searchHtml = searchJson.contents;

            const linkMatch = searchHtml.match(/<div class="itemurl">\s*<a href="([^"]+)"/);
            if (!linkMatch) return null;

            let albumUrl = linkMatch[1];
            if (albumUrl.startsWith('//')) albumUrl = 'https:' + albumUrl;

            const albumProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(albumUrl)}`;
            const albumRes = await fetch(albumProxy);
            const albumJson = await albumRes.json();
            const albumHtml = albumJson.contents;

            const dataMatch = albumHtml.match(/data-tralbum="([^"]+)"/);
            if (!dataMatch) return null;

            const tralbumData = JSON.parse(dataMatch[1].replace(/&quot;/g, '"'));

            const cleanTrackTitle = track.title.toLowerCase().trim();
            const bcTrack = tralbumData.trackinfo.find(t => t.title.toLowerCase().includes(cleanTrackTitle) || cleanTrackTitle.includes(t.title.toLowerCase()));

            if (bcTrack && bcTrack.file) {
                const mp3 = bcTrack.file['mp3-128'];
                if (mp3) return { url: mp3, source: 'bandcamp' };
            }

        } catch (e) {
            console.error("Bandcamp fetch error:", e);
        }
        return null;
    };


    // --- CONTROLS ---

    const stopAll = () => {
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (youtubePlayerRef.current && youtubePlayerRef.current.stopVideo) {
            youtubePlayerRef.current.stopVideo();
        }
    };

    const togglePlay = () => {
        if (!currentTrack) return;

        if (isPlaying) {
            // Pause
            if (currentTrack.source === 'itunes' || currentTrack.source === 'bandcamp') audioRef.current?.pause();
            if (currentTrack.source === 'youtube') youtubePlayerRef.current?.pauseVideo();
            setIsPlaying(false);
        } else {
            // Play
            if (currentTrack.source === 'itunes' || currentTrack.source === 'bandcamp') audioRef.current?.play();
            if (currentTrack.source === 'youtube') youtubePlayerRef.current?.playVideo();
            setIsPlaying(true);
        }
    };

    // Main Play Function
    const playTrack = async (track, product, tracksList, discogsVideos = []) => {
        // If clicking same track, toggle
        if (currentTrack?.index === track.index && currentProduct?.id === product.id) {
            togglePlay();
            return;
        }

        // Setup new context
        stopAll();
        setCurrentProduct(product);
        setPlaylist(tracksList);
        setIsPlaying(true); // Optimistic

        // Check cache (use a composite key of productID + trackIndex)
        const cacheKey = `${product.id}-${track.index}`;
        let preview = previews[cacheKey];

        if (!preview) {
            // 1. iTunes
            preview = await fetchItunesPreview(track, product);

            // 2. Bandcamp
            if (!preview) {
                preview = await fetchBandcampPreview(track, product);
            }

            // 3. YouTube
            if (!preview) {
                preview = findYoutubeVideo(track, product, discogsVideos);
            }

            if (preview) {
                setPreviews(prev => ({ ...prev, [cacheKey]: preview }));
            }
        }

        if (preview) {
            const newTrack = { ...track, ...preview };
            setCurrentTrack(newTrack);

            if (preview.source === 'itunes' || preview.source === 'bandcamp') {
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.src = preview.url;
                        audioRef.current.play();
                    }
                }, 50);
            } else if (preview.source === 'youtube') {
                // Handled in useEffect
            }

        } else {
            console.log("No audio source found");
            setIsPlaying(false);
            // Could set an error state here
        }
    };

    const playNext = () => {
        if (!currentTrack || playlist.length === 0) return;
        // Find current index in the playlist
        // Note: track.index needs to be reliable.
        const idx = currentTrack.index;
        const nextIdx = (idx + 1) % playlist.length;
        playTrack(playlist[nextIdx], currentProduct, playlist, []); // Note: discogsVideos might be missing if we don't store them in 'currentProduct'
    };

    const playPrev = () => {
        if (!currentTrack || playlist.length === 0) return;
        const idx = currentTrack.index;
        const prevIdx = (idx - 1 + playlist.length) % playlist.length;
        playTrack(playlist[prevIdx], currentProduct, playlist, []);
    };

    const handleSeek = (newTime) => {
        if ((currentTrack.source === 'itunes' || currentTrack.source === 'bandcamp') && audioRef.current) {
            audioRef.current.currentTime = newTime;
        } else if (currentTrack.source === 'youtube' && youtubePlayerRef.current) {
            youtubePlayerRef.current.seekTo(newTime);
        }
        setCurrentTime(newTime);
    };

    const closePlayer = () => {
        stopAll();
        setCurrentTrack(null);
        setIsPlaying(false);
    };


    // --- EFFECTS ---

    // YouTube Player Logic
    useEffect(() => {
        if (currentTrack?.source === 'youtube' && window.YT) {
            if (youtubePlayerRef.current && youtubePlayerRef.current.loadVideoById) {
                youtubePlayerRef.current.loadVideoById(currentTrack.url);
            } else {
                new window.YT.Player('hidden-youtube-player-global', {
                    height: '0',
                    width: '0',
                    videoId: currentTrack.url,
                    playerVars: { 'autoplay': 1, 'controls': 0, 'disablekb': 1, 'fs': 0 },
                    events: {
                        'onReady': (event) => {
                            youtubePlayerRef.current = event.target;
                            event.target.playVideo();
                        },
                        'onStateChange': (event) => {
                            if (event.data === window.YT.PlayerState.PLAYING) {
                                setIsPlaying(true);
                                setDuration(youtubePlayerRef.current.getDuration());
                            } else if (event.data === window.YT.PlayerState.PAUSED) {
                                setIsPlaying(false);
                            } else if (event.data === window.YT.PlayerState.ENDED) {
                                setIsPlaying(false);
                                // Auto next?
                            }
                        }
                    }
                });
            }
        }
    }, [currentTrack?.url, currentTrack?.source]);

    // Update time for YouTube
    useEffect(() => {
        let interval;
        if (isPlaying && currentTrack?.source === 'youtube') {
            interval = setInterval(() => {
                if (youtubePlayerRef.current && youtubePlayerRef.current.getCurrentTime) {
                    setCurrentTime(youtubePlayerRef.current.getCurrentTime());
                }
            }, 500);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentTrack]);


    return (
        <PlayerContext.Provider value={{
            currentTrack,
            isPlaying,
            currentTime,
            duration,
            currentProduct,
            playTrack,
            togglePlay,
            playNext,
            playPrev,
            handleSeek,
            closePlayer
        }}>
            {children}

            {/* Global Hidden Audio Elements */}
            <audio
                ref={audioRef}
                onTimeUpdate={(e) => {
                    setCurrentTime(e.currentTarget.currentTime);
                    setDuration(e.currentTarget.duration || 30);
                }}
                onEnded={() => playNext()}
            />
            <div id="hidden-youtube-player-global" className="fixed top-0 left-0 w-0 h-0 opacity-0 pointer-events-none" />
        </PlayerContext.Provider>
    );
};
