import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { Filter, X } from 'lucide-react';


const StorePage = ({ products, loading, setPage, setSelectedProduct, searchQuery, collectionFilter, onClearCollection }) => {
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    // Extract unique values
    const genres = [...new Set(products.map(p => p.genre).filter(Boolean))].sort();

    // Filter products
    const filteredProducts = products.filter(product => {
        // Genre Filter
        if (selectedGenre && product.genre !== selectedGenre) return false;

        // Collection Filter
        if (collectionFilter && (!product.collection || !product.collection.toLowerCase().includes(collectionFilter.toLowerCase()))) return false;

        // Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchArtist = product.artist?.toLowerCase().includes(query);
            const matchAlbum = product.album?.toLowerCase().includes(query);
            const matchGenre = product.genre?.toLowerCase().includes(query);
            if (!matchArtist && !matchAlbum && !matchGenre) return false;
        }

        return true;
    });

    const clearFilters = () => {
        setSelectedGenre(null);
        if (onClearCollection) onClearCollection();
    };

    if (loading) {
        return (
            <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-black/5 border-t-black animate-spin"></div>
                    <p className="text-xs font-bold tracking-widest text-black/20 uppercase">Loading Sounds...</p>
                </div>
            </div>
        );
    }

    return (
        <div id="catalogue" className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
            <header className="mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tighter mb-2">CATALOGUE</h1>
                        <p className="text-black/60 italic font-medium">Curated selection of electronic sounds.</p>
                        {collectionFilter && (
                            <div className="mt-3 inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                                <span>{collectionFilter}</span>
                                <button onClick={onClearCollection} className="hover:text-accent/70">
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-accent transition-colors md:hidden"
                    >
                        <Filter size={14} />
                        Filters
                    </button>

                    <div className={`flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 transition-all overflow-hidden ${showFilters ? 'h-auto opacity-100 mt-4 md:mt-0' : 'h-0 opacity-0 md:h-auto md:opacity-100'}`}>

                        {/* Genre Filter */}
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Genre:</span>
                            {genres.map(genre => (
                                <button
                                    key={genre}
                                    onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                                    className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${selectedGenre === genre ? 'text-accent' : 'text-black/60 hover:text-black'
                                        }`}
                                >
                                    {genre}
                                </button>
                            ))}
                        </div>



                        {selectedGenre && (
                            <button
                                onClick={clearFilters}
                                className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 flex items-center gap-1"
                            >
                                <X size={12} /> Clear
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {filteredProducts.length === 0 ? (
                <div className="py-20 text-center border-t border-black/5">
                    <p className="text-sm text-black/40">No items match your selection.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-4 md:gap-x-8">
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            onClick={() => {
                                setSelectedProduct(product);
                                setPage('product');
                            }}
                        >
                            <ProductCard product={{
                                ...product,
                                image: product.cover_image,
                                title: product.album,
                                year: product.year || '2024'
                            }} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StorePage;
