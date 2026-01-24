import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X, Headphones } from 'lucide-react';
import { useSelections } from '../context/SelectionsContext';
import { usePlayer } from '../context/PlayerContext';
import defaultImage from '../assets/default-vinyl.png';

const SelectionsSidebar = () => {
    const { selections, removeFromSelections, selectionCount } = useSelections();
    const { playTrack, currentProduct } = usePlayer();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Don't render if no selections
    if (selectionCount === 0) return null;

    const handlePlaySelection = async (product) => {
        if (isLoading) return;
        setIsLoading(true);

        const token = "BVpmDeAWjZxLXksEHfHPjAztaNfYoUEsFrRxCLwK";
        let tracks = [];
        let discogsVideos = [];

        try {
            let releaseId = product.discogsId || product.discogs_release_id;

            // 1. If no releaseId, search for it
            if (!releaseId) {
                const searchRes = await fetch(`https://api.discogs.com/database/search?q=${encodeURIComponent(product.artist + ' ' + product.album)}&type=release&token=${token}`);
                const searchData = await searchRes.json();
                if (searchData.results?.length > 0) {
                    releaseId = searchData.results[0].id;
                }
            }

            // 2. Fetch full release details
            if (releaseId) {
                const releaseRes = await fetch(`https://api.discogs.com/releases/${releaseId}?token=${token}`);
                const releaseData = await releaseRes.json();
                tracks = releaseData.tracklist || [];
                discogsVideos = releaseData.videos || [];
            }

            // Fallback if still nothing found
            if (tracks.length === 0) {
                tracks = product.tracklist || [{ title: product.album, index: 0, position: '1' }];
            }

            const firstTrack = { ...tracks[0], index: 0 };
            playTrack(firstTrack, product, tracks, discogsVideos);
        } catch (e) {
            console.error("Error fetching discogs data for selection:", e);
            // Fallback
            tracks = product.tracklist || [{ title: product.album, index: 0, position: '1' }];
            const firstTrack = { ...tracks[0], index: 0 };
            playTrack(firstTrack, product, tracks, discogsVideos);
        } finally {
            setIsLoading(false);
        }
    };

    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    return (
        <>
            {/* Hover trigger zone */}
            <div
                className="selections-trigger-zone"
                onMouseEnter={() => setIsExpanded(true)}
            >
                <motion.div
                    className="selections-trigger-tab"
                    initial={{ x: 10 }}
                    animate={{ x: isExpanded ? -10 : 0 }}
                    whileHover={{ x: -5 }}
                >
                    <Headphones size={14} />
                    <span className="selections-trigger-count">{selectionCount}</span>
                </motion.div>
            </div>

            {/* Sidebar */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="selections-sidebar"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        onMouseLeave={() => setIsExpanded(false)}
                    >
                        <div className="selections-sidebar-header">
                            <h3 className="selections-sidebar-title">
                                <Headphones size={20} />
                                My Selections
                            </h3>
                            <span className="selections-sidebar-count">{selectionCount} records</span>
                        </div>

                        <div className="selections-sidebar-list">
                            {selections.map((product) => (
                                <motion.div
                                    key={product.id}
                                    className={`selections-item ${currentProduct?.id === product.id ? 'active' : ''}`}
                                    onClick={() => handlePlaySelection(product)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.98 }}
                                    layout
                                >
                                    <div className="selections-item-cover">
                                        <img
                                            src={isValidImage(product.cover_image) ? product.cover_image : defaultImage}
                                            alt={product.album}
                                        />
                                        <div className="selections-item-overlay">
                                            <Headphones size={24} />
                                        </div>
                                    </div>
                                    <div className="selections-item-info">
                                        <span className="selections-item-album">{product.album}</span>
                                        <span className="selections-item-artist">{product.artist}</span>
                                    </div>
                                    <button
                                        className="selections-item-remove"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFromSelections(product.id);
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SelectionsSidebar;
