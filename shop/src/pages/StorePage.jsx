import React, { useState, useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import { Filter, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import Fuse from 'fuse.js';

const StorePage = ({ products, loading, searchQuery, collectionFilter, onClearCollection }) => {
    // New Filter State
    const [selectedFilters, setSelectedFilters] = useState({
        availability: [],
        genre: [],
        label: [],
        condition: [],
        year: [],
        format: []
    });
    const [sortOption, setSortOption] = useState('newest'); // 'newest', 'price-asc', 'price-desc', 'year-desc'
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [localSearch, setLocalSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 28;

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

    const filterCounts = useMemo(() => {
        const counts = {
            availability: {},
            genre: {},
            label: {},
            year: {},
            condition: {},
            format: {}
        };
        products.forEach(p => {
            if (p.stock !== 0) counts.availability['In stock'] = (counts.availability['In stock'] || 0) + 1;
            
            const productGenres = [p.genre, p.genre2, p.genre3, p.genre4, p.genre5].filter(Boolean);
            productGenres.forEach(g => { counts.genre[g] = (counts.genre[g] || 0) + 1; });
            
            if (p.label) counts.label[p.label] = (counts.label[p.label] || 0) + 1;
            if (p.year) counts.year[p.year?.toString()] = (counts.year[p.year?.toString()] || 0) + 1;
            if (p.status) counts.condition[p.status] = (counts.condition[p.status] || 0) + 1;
            
            // Format is mocked in UI, just count them as LP for now if undefined
            counts.format['LP'] = (counts.format['LP'] || 0) + 1;
        });
        return counts;
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
            availability: [],
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
        const activeSearch = localSearch || searchQuery;
        if (activeSearch) {
            const fuseResults = fuse.search(activeSearch);
            result = fuseResults.map(res => res.item);
        }

        // 2. Filters
        result = result.filter(product => {
            // Collection Filter (e.g. from Hero)
            if (collectionFilter && (!product.collection || !product.collection.toLowerCase().includes(collectionFilter.toLowerCase()))) return false;

            // Sidebar Filters
            if (selectedFilters.availability?.length > 0) {
                if (selectedFilters.availability.includes('In stock') && product.stock === 0) return false;
            }

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
                default: {
                    const dateA = a.created_at ? (a.created_at._seconds || a.created_at.seconds || new Date(a.created_at).getTime() / 1000) : 0;
                    const dateB = b.created_at ? (b.created_at._seconds || b.created_at.seconds || new Date(b.created_at).getTime() / 1000) : 0;
                    return dateB - dateA;
                }
            }
        });
    }, [products, searchQuery, localSearch, collectionFilter, selectedFilters, sortOption, fuse]);

    // Reset to page 1 when filters/search change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [localSearch, searchQuery, selectedFilters, sortOption, collectionFilter]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        const catalogElement = document.getElementById('catalogue');
        if (catalogElement) {
            catalogElement.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredProducts.slice(startIndex, endIndex);
    }, [filteredProducts, currentPage, ITEMS_PER_PAGE]);

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
        <div id="catalogue" className="pb-20 px-4 md:px-20 w-full">

            {/* Header Area */}
            <header className="sticky top-0 z-40 bg-[#F3F3F3] pb-4 md:pb-6 flex flex-col gap-4 md:gap-6 pt-6 md:pt-12 -mx-4 px-4 md:-mx-20 md:px-20 relative">
                {/* Top Row: CATALOG Title + FILTERS + Desktop SORT */}
                <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-4 md:gap-8">
                        <h2 className="text-[22px] md:text-[42px] leading-none font-bold uppercase tracking-widest text-black">
                            CATALOG
                        </h2>

                        <div className="flex items-center gap-4 text-xs font-light uppercase tracking-widest text-black">
                            <div className="flex items-center gap-2 relative">
                                <button 
                                    onClick={() => setShowMobileFilters(!showMobileFilters)} 
                                    className="flex items-center gap-1 hover:opacity-50 transition-opacity"
                                >
                                    FILTERS <span className="ml-1 text-[8px]">{showMobileFilters ? '✕' : '▼'}</span>
                                </button>
                                {showMobileFilters && (
                                    <button 
                                        onClick={clearFilters} 
                                        className="text-[9px] text-black/40 hover:text-black capitalize font-normal tracking-normal ml-2"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            
                            <div className="hidden md:flex flex-wrap items-baseline gap-6 text-black/40 text-xs font-light uppercase tracking-widest">
                                <button className="text-black transition-colors hover:opacity-50">ALL</button>
                                <button className="text-black transition-colors">VINYL <sup className="text-[9px] ml-0.5">{filteredProducts.length}</sup></button>
                                
                                {/* Active Filters */}
                                {Object.entries(selectedFilters).flatMap(([key, values]) => 
                                    values.map(val => (
                                        <button 
                                            key={`${key}-${val}`} 
                                            onClick={() => handleFilterChange(key, val)}
                                            className="text-black transition-colors hover:text-black/50 flex items-center gap-1"
                                        >
                                            {val} <X size={8} strokeWidth={3} className="ml-0.5" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: SORT DROPDOWN (DESKTOP ONLY) */}
                    <div className="hidden md:flex items-center text-[10px] font-bold uppercase tracking-widest text-black shrink-0 pr-4 md:pr-16">
                        <div className="relative group z-30 flex items-center gap-1">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="bg-transparent border-none outline-none appearance-none cursor-pointer pr-4 hover:opacity-50 transition-opacity"
                            >
                                <option value="newest">FEATURED</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                                <option value="year-desc">Year: Newest</option>
                                <option value="year-asc">Year: Oldest</option>
                            </select>
                            <span className="pointer-events-none absolute right-0 text-[8px]">▼</span>
                        </div>
                    </div>
                </div>

                {/* MIDDLE: BIG SEARCH BAR */}
                <div className="flex-1 w-full flex items-center">
                    <div className="flex-1 flex items-center border-b border-black/40 pb-2">
                        <Search className="w-6 h-6 text-black/50 mr-4 shrink-0" strokeWidth={1.5} />
                        <input 
                            type="text" 
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-base md:text-xl lg:text-2xl placeholder-black/30"
                            placeholder="Search..."
                        />
                    </div>
                    <div className="w-[48px] flex justify-center shrink-0 ml-2">
                        {localSearch && (
                            <button 
                                onClick={() => setLocalSearch('')} 
                                className="text-black/40 hover:text-black transition-colors"
                            >
                                <X className="w-7 h-7" strokeWidth={1} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-8 md:gap-16">
                {showMobileFilters && (
                    <div className="w-full md:w-56 shrink-0">
                        <FilterSidebar
                            filters={filters}
                            selectedFilters={selectedFilters}
                            filterCounts={filterCounts}
                            onFilterChange={handleFilterChange}
                            onClearFilters={clearFilters}
                            showMobile={showMobileFilters}
                            onCloseMobile={() => setShowMobileFilters(false)}
                        />
                    </div>
                )}

                {/* Product Grid */}
                <div className="flex-1 min-w-0">
                    {/* Search Bar Removed from here */}
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
                        <>
                            <div className={`grid grid-cols-2 ${showMobileFilters ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-y-12 md:gap-y-20 lg:gap-y-24 gap-x-4 md:gap-x-16 lg:gap-x-20`}>
                                {paginatedProducts.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={{
                                            ...product,
                                            image: product.image || product.cover_image,
                                            title: product.album,
                                            year: product.year || '2024'
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Minimalist Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-6 mt-16 pt-8 border-t border-black/10">
                                    <button
                                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1.5 text-xs font-light uppercase tracking-widest text-black hover:opacity-50 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
                                    >
                                        <ChevronLeft size={14} />
                                        PREV
                                    </button>

                                    <div className="flex items-center gap-3">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`px-2 py-0.5 text-xs transition-all ${currentPage === pageNum
                                                        ? 'font-bold text-black border-b border-black'
                                                        : 'text-black/40 hover:text-black font-light'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1.5 text-xs font-light uppercase tracking-widest text-black hover:opacity-50 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
                                    >
                                        NEXT
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Page info */}
                            {totalPages > 1 && (
                                <p className="text-center text-xs text-black/40 mt-4">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} releases
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StorePage;
