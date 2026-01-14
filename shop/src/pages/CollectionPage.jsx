import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

const CollectionPage = ({ collectionName, products, setPage, setSelectedProduct, onClose }) => {

    // Filter products by collection
    const collectionProducts = products.filter(p =>
        p.collection && p.collection.toLowerCase() === collectionName.toLowerCase()
    );

    // Collection descriptions
    const collectionDescriptions = {
        'Detroit Techno': 'The Motor City sound that defined a generation. From Underground Resistance to Jeff Mills, explore the raw, industrial techno that emerged from Detroit\'s concrete landscape.',
        'Ambient Essentials': 'Atmospheric soundscapes for contemplative listening. Curated selections that transcend time and space, perfect for deep focus or late-night sessions.',
        'Staff Picks': 'Our personal favorites from the vault. The records we keep coming back to, the ones that never leave our turntables.'
    };

    const description = collectionDescriptions[collectionName] || 'Curated collection of exceptional records.';

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    if (collectionProducts.length === 0) {
        return (
            <div className="min-h-screen pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={onClose}
                        className="mb-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:opacity-60 transition-opacity"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1 className="text-6xl font-bold mb-4 uppercase">{collectionName}</h1>
                    <p className="text-black/60">No records in this collection yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Main Content */}
            <main className="pt-32 pb-20">
                {/* Back Button */}
                <div className="px-8 md:px-16 mb-12">
                    <button
                        onClick={onClose}
                        className="text-xs font-medium uppercase tracking-[0.2em] hover:opacity-60 transition-opacity flex items-center gap-2"
                    >
                        <ArrowLeft size={14} /> Back to Store
                    </button>
                </div>

                {collectionProducts.map((product, index) => {
                    const isEven = index % 2 === 0;

                    return (
                        <section
                            key={product.id}
                            className={`min-h-screen flex items-center ${index > 0 ? 'border-t border-black/5' : ''}`}
                        >
                            <div className={`w-full grid grid-cols-1 lg:grid-cols-2 gap-0`}>
                                {/* Text Side */}
                                <div
                                    className={`px-8 md:px-16 py-16 md:py-24 flex flex-col justify-center ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
                                    style={{ minHeight: '400px' }}
                                >
                                    {/* Title */}
                                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tighter leading-none mb-6">
                                        {product.album.split(' ').map((word, i) => (
                                            <div key={i}>{word}</div>
                                        ))}
                                    </h2>

                                    {/* Artist */}
                                    <p className="text-lg md:text-xl text-black/60 mb-8 uppercase tracking-wider">
                                        by {product.artist}
                                    </p>

                                    {/* Collection Note / Description */}
                                    {product.collectionNote && (
                                        <p className="text-sm md:text-base leading-relaxed text-black/60 mb-12 font-mono max-w-md">
                                            {product.collectionNote}
                                        </p>
                                    )}

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-12 text-sm font-mono">
                                        <div>
                                            <div className="text-black/30 text-xs mb-1 uppercase tracking-widest">Label</div>
                                            <div className="text-black/80">{product.label || 'El Cuartito'}</div>
                                        </div>
                                        <div>
                                            <div className="text-black/30 text-xs mb-1 uppercase tracking-widest">Genre</div>
                                            <div className="text-black/80">{product.genre}</div>
                                        </div>
                                        <div>
                                            <div className="text-black/30 text-xs mb-1 uppercase tracking-widest">Condition</div>
                                            <div className="text-black/80">{product.condition || 'VG+'}</div>
                                        </div>
                                        <div>
                                            <div className="text-black/30 text-xs mb-1 uppercase tracking-widest">Price</div>
                                            <div className="text-black/80 font-bold">{product.price} DKK</div>
                                        </div>
                                    </div>

                                    {/* CTA Button */}
                                    <button
                                        onClick={() => {
                                            setSelectedProduct(product);
                                            setPage('product');
                                        }}
                                        className="px-8 py-4 bg-black text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-black/80 transition-all"
                                    >
                                        View Full Details →
                                    </button>
                                </div>

                                {/* Image Side */}
                                <div
                                    className={`relative overflow-hidden ${isEven ? 'lg:order-2' : 'lg:order-1'}`}
                                    style={{ minHeight: '500px' }}
                                >
                                    <div className="absolute inset-0">
                                        <img
                                            src={product.cover_image || '/default-vinyl.png'}
                                            alt={product.album}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    );
                })}

                {/* Collection Info Footer */}
                <section className="border-t border-black/5 px-8 md:px-16 py-16">
                    <div className="max-w-md">
                        <h3 className="text-3xl md:text-4xl font-bold uppercase mb-6 tracking-tight">{collectionName}</h3>
                        <p className="text-sm md:text-base leading-relaxed text-black/60 font-mono mb-8">
                            {description}
                        </p>
                        <p className="text-xs text-black/30 uppercase tracking-[0.2em]">
                            {collectionProducts.length} {collectionProducts.length === 1 ? 'Record' : 'Records'} in this collection
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default CollectionPage;
