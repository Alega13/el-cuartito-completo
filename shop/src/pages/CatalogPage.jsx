import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Filter, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import FilterSidebar from '../components/FilterSidebar';
import Fuse from 'fuse.js';

const CatalogPage = ({ products }) => {
    const navigate = useNavigate();

    // Filter State (Matching StorePage)
    const [selectedFilters, setSelectedFilters] = useState({
        genre: [],
        label: [],
        condition: [],
        year: [],
        format: []
    });
    const [sortOption, setSortOption] = useState('newest');
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [artistSearch, setArtistSearch] = useState('');

    // Filter products with stock
    const availableProducts = useMemo(() => products.filter(p => p.stock > 0), [products]);

    // Initialize Fuse.js for fuzzy search
    const fuse = useMemo(() => {
        return new Fuse(availableProducts, {
            keys: ['artist', 'album', 'genre', 'label'],
            threshold: 0.3,
            distance: 100,
        });
    }, [availableProducts]);

    // Extract unique filter options
    const filters = useMemo(() => {
        return {
            genres: [...new Set(availableProducts.flatMap(p => [p.genre, p.genre2, p.genre3, p.genre4, p.genre5]).filter(Boolean))].sort(),
            labels: [...new Set(availableProducts.map(p => p.label).filter(Boolean))].sort(),
            years: [...new Set(availableProducts.map(p => p.year).filter(Boolean))].sort((a, b) => b - a),
        };
    }, [availableProducts]);

    // Handle Filter Changes
    const handleFilterChange = (type, value) => {
        setSelectedFilters(prev => {
            const current = prev[type];
            const updated = current.includes(value)
                ? current.filter(item => item !== value)
                : [...current, value];
            return { ...prev, [type]: updated };
        });
    };

    const clearFilters = () => {
        setSelectedFilters({
            genre: [],
            label: [],
            condition: [],
            year: [],
            format: []
        });
        setArtistSearch('');
    };

    // Filter & Sort Logic
    const sortedProducts = useMemo(() => {
        let result = availableProducts;

        // 1. Search
        if (artistSearch.trim()) {
            const fuseResults = fuse.search(artistSearch);
            result = fuseResults.map(res => res.item);
        }

        // 2. Filters
        result = result.filter(product => {
            // Sidebar Filters
            if (selectedFilters.genre.length > 0) {
                const productGenres = [product.genre, product.genre2, product.genre3, product.genre4, product.genre5].filter(Boolean);
                if (!selectedFilters.genre.some(g => productGenres.includes(g))) return false;
            }
            if (selectedFilters.label.length > 0 && !selectedFilters.label.includes(product.label)) return false;
            if (selectedFilters.year.length > 0 && !selectedFilters.year.includes(product.year?.toString())) return false;
            if (selectedFilters.condition.length > 0 && !selectedFilters.condition.includes(product.condition)) return false;

            return true;
        });

        // 3. Sorting
        return [...result].sort((a, b) => {
            switch (sortOption) {
                case 'price-low':
                    return (a.price || 0) - (b.price || 0);
                case 'price-high':
                    return (b.price || 0) - (a.price || 0);
                case 'artist':
                    return (a.artist || '').localeCompare(b.artist || '');
                case 'newest':
                default:
                    return 0;
            }
        });
    }, [availableProducts, selectedFilters, sortOption, artistSearch, fuse]);

    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    const activeFiltersCount = selectedFilters.genre.length + selectedFilters.label.length +
        selectedFilters.condition.length + selectedFilters.year.length +
        (artistSearch ? 1 : 0);

    return (
        <div className="min-h-screen bg-background pt-32 pb-20">
            <SEO
                title="Catalog"
                description="Browse our complete collection of hand-picked vinyl records. Filter by genre, search by artist. Techno, ambient, electronic & more from Copenhagen."
                url="/catalog"
            />
            <div className="max-w-7xl mx-auto px-6">

                {/* Header Area */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-7xl md:text-8xl font-light tracking-tight mb-2">Catalog</h1>
                        <div className="text-sm text-black/40 font-medium uppercase tracking-widest">
                            {sortedProducts.length} {sortedProducts.length === 1 ? 'ITEM' : 'ITEMS'} // {availableProducts.length} TOTAL IN STOCK
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Sort Dropdown */}
                        <div className="relative group">
                            <div className="flex items-center gap-2 cursor-pointer py-2 px-4 rounded-full border border-black/10 hover:border-black/30 bg-white transition-all">
                                <ArrowUpDown size={14} className="text-black/50" />
                                <select
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value)}
                                    className="text-xs font-bold uppercase tracking-widest bg-transparent border-none outline-none appearance-none cursor-pointer pr-4"
                                >
                                    <option value="newest">New Arrivals</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                    <option value="artist">Artist A-Z</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowMobileFilters(true)}
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-primary text-white px-5 py-2.5 rounded-full md:hidden hover:bg-neutral-800 transition-colors"
                        >
                            <Filter size={14} />
                            Filters
                        </button>
                    </div>
                </header>

                <div className="flex gap-12">
                    {/* Sidebar Filters */}
                    <FilterSidebar
                        filters={filters}
                        selectedFilters={selectedFilters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={clearFilters}
                        showMobile={showMobileFilters}
                        onCloseMobile={() => setShowMobileFilters(false)}
                    />

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Artist Search Search Enhancement */}
                        <div className="mb-10 max-w-md">
                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-3">
                                Search Everything
                            </div>
                            <input
                                type="text"
                                value={artistSearch}
                                onChange={(e) => setArtistSearch(e.target.value)}
                                placeholder="Search artist, album, label..."
                                className="w-full px-4 py-3 text-sm bg-black/5 border border-transparent rounded-lg focus:bg-white focus:border-black/10 outline-none transition-all"
                            />
                        </div>

                        {/* Active Filters */}
                        {activeFiltersCount > 0 && (
                            <div className="mb-8">
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-3">
                                    Active Filters
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedFilters.genre.map(genre => (
                                        <button
                                            key={genre}
                                            onClick={() => handleFilterChange('genre', genre)}
                                            className="px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-2 hover:opacity-80 transition-opacity"
                                        >
                                            {genre}
                                            <X className="w-3 h-3" />
                                        </button>
                                    ))}
                                    {artistSearch && (
                                        <button
                                            onClick={() => setArtistSearch('')}
                                            className="px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-2 hover:opacity-80 transition-opacity"
                                        >
                                            SEARCH: "{artistSearch}"
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button
                                        onClick={clearFilters}
                                        className="px-3 py-1.5 border border-black/20 text-black text-[10px] font-bold uppercase tracking-wider rounded-full hover:bg-black/5 transition-colors"
                                    >
                                        CLEAR ALL
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Product Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 gap-x-6 md:gap-x-8">
                            {sortedProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        {sortedProducts.length === 0 && (
                            <div className="text-center py-32 border-t border-black/5">
                                <p className="text-sm font-bold uppercase tracking-widest text-black/20">No matching releases found</p>
                                <button
                                    onClick={clearFilters}
                                    className="mt-4 text-xs font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 hover:opacity-60 transition-opacity"
                                >
                                    Reset Filters
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
