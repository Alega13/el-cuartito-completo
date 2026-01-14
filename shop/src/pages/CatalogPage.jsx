import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import defaultImage from '../assets/default-vinyl.png';

const CatalogPage = ({ products, setPage, setSelectedProduct }) => {
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [selectedFormats, setSelectedFormats] = useState([]);
    const [sortBy, setSortBy] = useState('recent');
    const [artistSearch, setArtistSearch] = useState('');

    // Filter products with stock
    const availableProducts = products.filter(p => p.stock > 0);

    // Get unique genres and formats
    const genres = [...new Set(availableProducts.map(p => p.genre).filter(Boolean))];
    const formats = ['Vinyl 12"', 'Vinyl 7"', 'Digital']; // Can be dynamic if you have this field

    // Apply filters
    let filteredProducts = availableProducts;

    if (selectedGenres.length > 0) {
        filteredProducts = filteredProducts.filter(p =>
            selectedGenres.some(g => p.genre?.toLowerCase().includes(g.toLowerCase()))
        );
    }

    if (artistSearch.trim()) {
        filteredProducts = filteredProducts.filter(p =>
            p.artist?.toLowerCase().includes(artistSearch.toLowerCase())
        );
    }

    // Sort products
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (sortBy === 'recent') return 0;
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'artist') return (a.artist || '').localeCompare(b.artist || '');
        return 0;
    });

    const toggleGenre = (genre) => {
        setSelectedGenres(prev =>
            prev.includes(genre)
                ? prev.filter(g => g !== genre)
                : [...prev, genre]
        );
    };

    const clearAllFilters = () => {
        setSelectedGenres([]);
        setSelectedFormats([]);
        setArtistSearch('');
    };

    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    const activeFiltersCount = selectedGenres.length + selectedFormats.length + (artistSearch ? 1 : 0);

    return (
        <div className="min-h-screen bg-background pt-32 pb-20">
            <div className="max-w-7xl mx-auto px-6">

                <div className="flex gap-12">

                    {/* Sidebar Filters */}
                    <div className="w-64 flex-shrink-0 sticky top-32 self-start hidden md:block">

                        {/* Genre Filter */}
                        <div className="mb-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-4">
                                Genre
                            </h3>
                            <div className="space-y-2">
                                {genres.map((genre) => (
                                    <label key={genre} className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={selectedGenres.includes(genre)}
                                            onChange={() => toggleGenre(genre)}
                                            className="w-4 h-4 border border-black/20 rounded-sm checked:bg-black checked:border-black focus:ring-0 cursor-pointer"
                                        />
                                        <span className="text-sm font-medium group-hover:opacity-60 transition-opacity">
                                            {genre}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Artist Search */}
                        <div className="mb-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-4">
                                Artist
                            </h3>
                            <input
                                type="text"
                                value={artistSearch}
                                onChange={(e) => setArtistSearch(e.target.value)}
                                placeholder="Find artist..."
                                className="w-full px-3 py-2 text-sm border border-black/20 rounded-sm focus:border-black outline-none"
                            />
                        </div>

                        {/* Format Filter */}
                        <div className="mb-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-4">
                                Format
                            </h3>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 border border-black/20 rounded-sm checked:bg-black checked:border-black focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium group-hover:opacity-60 transition-opacity">
                                        Vinyl 12"
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 border border-black/20 rounded-sm checked:bg-black checked:border-black focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium group-hover:opacity-60 transition-opacity">
                                        Digital
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">

                        {/* Header */}
                        <div className="mb-12">
                            <h1 className="text-7xl md:text-8xl font-light tracking-tight mb-2">
                                CATALOG
                            </h1>
                            <div className="text-sm text-black/40 font-medium">
                                {sortedProducts.length} {sortedProducts.length === 1 ? 'ITEM' : 'ITEMS'} // {availableProducts.length} RESULTS FOUND
                            </div>
                        </div>

                        {/* Active Filters */}
                        {activeFiltersCount > 0 && (
                            <div className="mb-8">
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-3">
                                    Active Filters
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedGenres.map(genre => (
                                        <button
                                            key={genre}
                                            onClick={() => toggleGenre(genre)}
                                            className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-2 hover:bg-black/80 transition-colors"
                                        >
                                            {genre}
                                            <X className="w-3 h-3" />
                                        </button>
                                    ))}
                                    {artistSearch && (
                                        <button
                                            onClick={() => setArtistSearch('')}
                                            className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-2 hover:bg-black/80 transition-colors"
                                        >
                                            ARTIST: "{artistSearch}"
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button
                                        onClick={clearAllFilters}
                                        className="px-3 py-1.5 border border-black/20 text-black text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-black/5 transition-colors"
                                    >
                                        CLEAR ALL
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Sort */}
                        <div className="flex justify-end mb-8 pb-4 border-b border-black/10">
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-black/40">
                                    Sort:
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer uppercase"
                                >
                                    <option value="recent">New Arrivals</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                    <option value="artist">Artist A-Z</option>
                                </select>
                            </div>
                        </div>

                        {/* Product Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {sortedProducts.map((product) => (
                                <motion.div
                                    key={product.id}
                                    onClick={() => {
                                        setSelectedProduct(product);
                                        setPage('product');
                                    }}
                                    className="group cursor-pointer"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    {/* Image */}
                                    <div className="aspect-square bg-black/5 rounded-sm overflow-hidden mb-3 relative">
                                        <img
                                            src={isValidImage(product.cover_image) ? product.cover_image : defaultImage}
                                            alt={product.album}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(e) => { e.currentTarget.src = defaultImage; }}
                                        />
                                        {product.stock === 0 && (
                                            <div className="absolute top-2 right-2 bg-black text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm">
                                                Sold Out
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <h3 className="font-medium text-sm mb-1 group-hover:opacity-60 transition-opacity uppercase tracking-wide">
                                            {product.album}
                                        </h3>
                                        <div className="text-xs text-black/60 mb-2 font-medium">
                                            {product.artist}
                                        </div>
                                        <div className="text-sm font-bold">
                                            {product.price} DKK
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {sortedProducts.length === 0 && (
                            <div className="text-center py-20 text-black/40">
                                <p className="text-sm font-medium">No products match your filters</p>
                                <button
                                    onClick={clearAllFilters}
                                    className="mt-4 text-xs font-bold uppercase tracking-wider text-black hover:opacity-60 transition-opacity"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CatalogPage;
