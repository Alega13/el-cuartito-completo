import React from 'react';

const Collections = ({ products, onCollectionClick }) => {
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

    return (
        <section className="max-w-7xl mx-auto px-6 py-20" data-section="collections">
            <div className="mb-12">
                <h2 className="text-5xl md:text-6xl font-bold tracking-tighter uppercase mb-4 italic text-black">
                    Curated Collections
                </h2>
                <p className="text-black/60 font-medium">Hand-picked selections from our catalog</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {collections.map((collection, idx) => {
                    const count = getCollectionCount(collection.name);
                    if (count === 0) return null; // Don't show empty collections

                    return (
                        <button
                            key={idx}
                            onClick={() => onCollectionClick(collection.name)}
                            className="group relative h-64 rounded-2xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${collection.gradient}`} />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

                            <div className="relative h-full flex flex-col justify-end p-8">
                                <h3 className="text-3xl md:text-4xl font-bold text-white mb-2 italic tracking-tight">
                                    {collection.name.split(' ').map((word, i) => (
                                        <React.Fragment key={i}>
                                            {word}
                                            {i < collection.name.split(' ').length - 1 && <br />}
                                        </React.Fragment>
                                    ))}
                                </h3>
                                <p className="text-white/80 text-sm font-medium mb-3">{collection.description}</p>
                                <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-widest">
                                    <span>{count} {count === 1 ? 'Record' : 'Records'}</span>
                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default Collections;
