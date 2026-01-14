import React from 'react';

const Collections = ({ products, onCollectionClick, isFullPage = false }) => {
    const collections = [
        {
            name: "Detroit Techno",
            gradient: "from-gray-900 to-black",
            description: "Pure Motor City sound"
        },
        {
            name: "Ambient Essentials",
            gradient: "from-cyan-400 via-pink-300 to-pink-400",
            description: "Atmospheric journeys"
        },
        {
            name: "Staff Picks",
            gradient: "from-orange-400 via-amber-300 to-green-600",
            description: "Our personal favorites"
        }
    ];

    // Count products in each collection
    const getCollectionCount = (collectionName) => {
        return products.filter(p =>
            p.collection && p.collection.toLowerCase().includes(collectionName.toLowerCase())
        ).length;
    };

    const containerClass = isFullPage
        ? "min-h-screen bg-background pt-24 pb-20"
        : "";

    const contentClass = isFullPage
        ? "max-w-7xl mx-auto px-6"
        : "max-w-7xl mx-auto px-6 py-20";

    return (
        <div className={containerClass}>
            <section className={contentClass} data-section="collections">
                <div className="mb-12">
                    {isFullPage && (
                        <div className="text-sm font-medium text-black/40 mb-4">/ Collections</div>
                    )}
                    <h2 className="text-5xl md:text-6xl font-light tracking-tight mb-4">
                        Curated Collections
                    </h2>
                    <p className="text-black/60 font-medium">Hand-picked selections from our catalog</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    {collections.map((collection, idx) => {
                        const count = getCollectionCount(collection.name);
                        if (count === 0) return null;

                        return (
                            <button
                                key={idx}
                                onClick={() => onCollectionClick(collection.name)}
                                className="group text-left border-l-2 border-black/10 pl-6 py-6 hover:border-black transition-colors"
                            >
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-3">
                                    LOC. 0{idx + 1}
                                </div>
                                <h3 className="text-3xl md:text-4xl font-light tracking-tight mb-2 group-hover:opacity-60 transition-opacity">
                                    {collection.name}
                                </h3>
                                <p className="text-sm text-black/60 mb-4">{collection.description}</p>
                                <div className="text-xs text-black/40">
                                    {count} {count === 1 ? 'Record' : 'Records'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default Collections;
