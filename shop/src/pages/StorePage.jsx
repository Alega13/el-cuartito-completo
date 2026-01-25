import React, { useState, useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import { Filter, ArrowUpDown } from 'lucide-react';
import Fuse from 'fuse.js';

const StorePage = ({ products, loading, searchQuery, collectionFilter, onClearCollection }) => {
    // New Filter State
    const [selectedFilters, setSelectedFilters] = useState({
        genre: [],
        label: [],
        condition: [],
        year: [],
        format: []
    });
    const [sortOption, setSortOption] = useState('newest'); // 'newest', 'price-asc', 'price-desc', 'year-desc'
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Initialize Fuse.js for fuzzy search
    const fuse = useMemo(() => {
        return new Fuse(products, {
            keys: ['title', 'artist', 'album', 'genre', 'label'],
            threshold: 0.3, // Tolerance for typos (0.0 = exact, 1.0 = match anything)
            distance: 100,
        });
    }, [products]);

    const filters = useMemo(() => {
        return {
            genres: [...new Set(products.flatMap(p => [p.genre, p.genre2, p.genre3, p.genre4, p.genre5]).filter(Boolean))].sort(),
            labels: [...new Set(products.map(p => p.label).filter(Boolean))].sort(),
            years: [...new Set(products.map(p => p.year).filter(Boolean))].sort((a, b) => b - a), // Newest years first
        };
    }, [products]);

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
        if (onClearCollection) onClearCollection();
    };

    // Filter & Sort Logic
    const filteredProducts = useMemo(() => {
        let result = products;

        // 1. Search (Fuzzy or simple)
        if (searchQuery) {
            const fuseResults = fuse.search(searchQuery);
            result = fuseResults.map(res => res.item);
        }

        // 2. Filters
        result = result.filter(product => {
            // Collection Filter (e.g. from Hero)
            if (collectionFilter && (!product.collection || !product.collection.toLowerCase().includes(collectionFilter.toLowerCase()))) return false;

            // Sidebar Filters
            if (selectedFilters.genre.length > 0) {
                const productGenres = [product.genre, product.genre2, product.genre3, product.genre4, product.genre5].filter(Boolean);
                if (!selectedFilters.genre.some(g => productGenres.includes(g))) return false;
            }
            if (selectedFilters.label.length > 0 && !selectedFilters.label.includes(product.label)) return false;
            if (selectedFilters.year.length > 0 && !selectedFilters.year.includes(product.year?.toString())) return false;
            if (selectedFilters.condition.length > 0 && !selectedFilters.condition.includes(product.status)) return false;

            // Format Filter (approximated for now based on title or logic)
            // Ideally backend should provide format field.

            return true;
        });

        // 3. Sorting
        return [...result].sort((a, b) => {
            switch (sortOption) {
                case 'price-asc':
                    return (a.price || 0) - (b.price || 0);
                case 'price-desc':
                    return (b.price || 0) - (a.price || 0);
                case 'year-desc':
                    return (b.year || 0) - (a.year || 0);
                case 'year-asc':
                    return (a.year || 0) - (b.year || 0);
                case 'newest':
                default:
                    // Assuming 'id' correlates with time or use explicit 'dateAdded' if available
                    // For now, reverse order of ID if no date
                    return 0; // Keeping default order (usually newest from backend)
            }
        });
    }, [products, searchQuery, collectionFilter, selectedFilters, sortOption, fuse]);


    if (loading) {
        return (
            <div className="pt-32 pb-20 px-6 max-w-[1400px] mx-auto flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-black/5 border-t-black animate-spin"></div>
                    <p className="text-xs font-bold tracking-widest text-black/20 uppercase">Loading Sounds...</p>
                </div>
            </div>
        );
    }

    return (
        <div id="catalogue" className="pt-32 pb-20 px-4 md:px-8 max-w-[1600px] mx-auto">

            {/* Header Area */}
            <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-2">Catalog</h1>
                    <p className="text-black/60 font-medium max-w-md">
                        Curated selection of electronic sounds. {filteredProducts.length} releases found.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Sort Dropdown */}
                    <div className="relative group z-30">
                        <div className="flex items-center gap-2 cursor-pointer py-2 px-4 rounded-full border border-black/10 hover:border-black/30 bg-white transition-all">
                            <ArrowUpDown size={14} className="text-black/50" />
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="text-xs font-bold uppercase tracking-widest bg-transparent border-none outline-none appearance-none cursor-pointer pr-4"
                            >
                                <option value="newest">Newest First</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                                <option value="year-desc">Year: Newest</option>
                                <option value="year-asc">Year: Oldest</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowMobileFilters(true)}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-black text-white px-5 py-2.5 rounded-full md:hidden hover:bg-neutral-800 transition-colors"
                    >
                        <Filter size={14} />
                        Filters
                    </button>
                </div>
            </header>

            <div className="flex gap-12">
                {/* Advanced Sidebar */}
                <FilterSidebar
                    filters={filters}
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                    showMobile={showMobileFilters}
                    onCloseMobile={() => setShowMobileFilters(false)}
                />

                {/* Product Grid */}
                <div className="flex-1 min-w-0">
                    {filteredProducts.length === 0 ? (
                        <div className="py-20 text-center border-t border-black/5">
                            <h3 className="text-xl font-bold mb-2">No matches found</h3>
                            <p className="text-sm text-black/40 mb-6">Try adjusting your filters or search terms.</p>
                            <button
                                onClick={clearFilters}
                                className="text-xs font-bold uppercase tracking-widest text-accent hover:text-accent/70 border-b border-accent pb-0.5"
                            >
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-y-10 gap-x-6 md:gap-x-8">
                            {filteredProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={{
                                        ...product,
                                        image: product.image || product.cover_image,
                                        title: product.album, // Ensure title is mapped for card
                                        year: product.year || '2024'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StorePage;
