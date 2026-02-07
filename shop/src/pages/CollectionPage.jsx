import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

const CollectionPage = ({ products }) => {
    const { collectionName } = useParams();
    const navigate = useNavigate();

    // Filter products by collection
    const collectionProducts = products.filter(p =>
        p.collection && p.collection.toLowerCase() === decodeURIComponent(collectionName).toLowerCase()
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

    const themeColors = {
        orange: '#ff5e00',
        dark: '#050505',
        muted: 'rgba(255, 94, 0, 0.4)'
    };

    if (collectionProducts.length === 0) {
        return (
            <div className="min-h-screen pt-32 pb-20 px-6 bg-[#050505] text-[#ff5e00]">
                <div className="max-w-7xl mx-auto flex flex-col items-center md:items-start text-center md:text-left">
                    <button
                        onClick={() => navigate('/collections')}
                        className="mb-8 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] hover:opacity-100 opacity-60 transition-opacity"
                    >
                        <ArrowLeft size={14} /> [ BACK ]
                    </button>
                    <h1 className="text-5xl md:text-6xl font-extralight mb-4 uppercase tracking-tighter">
                        {collectionName}
                    </h1>
                    <p className="font-mono text-[10px] opacity-40 uppercase tracking-widest">
                        NO ASSETS DETECTED IN THIS SECTOR.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-[#ff5e00]">
            <SEO
                title={`${collectionName} Collection`}
                description={description}
                url={`/collection/${encodeURIComponent(collectionName)}`}
            />

            {/* Grain Texture Overlay */}
            <div
                className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Main Content */}
            <main className="pt-24 md:pt-32 pb-20 relative z-10">
                {/* Header Metadata */}
                <div className="px-6 md:px-16 mb-12 md:mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#ff5e00]/10 pb-12">
                    <div className="max-w-2xl text-center md:text-left flex flex-col items-center md:items-start">
                        <button
                            onClick={() => navigate('/collections')}
                            className="text-[9px] font-mono uppercase tracking-[0.4em] mb-8 hover:opacity-100 opacity-40 transition-opacity flex items-center gap-2"
                        >
                            <ArrowLeft size={10} /> RETURN_TO_BASE
                        </button>
                        <h1 className="text-5xl md:text-8xl font-extralight tracking-[-0.05em] uppercase mb-6 leading-none">
                            {collectionName}
                        </h1>
                        <p className="font-mono text-[9px] md:text-[11px] uppercase tracking-[0.15em] opacity-40 leading-relaxed max-w-md">
                            {description}
                        </p>
                    </div>
                    <div className="text-center md:text-right font-mono text-[9px] tracking-[0.3em] opacity-40">
                        <p>SECTOR: {collectionName.toUpperCase().replace(' ', '_')}</p>
                        <p className="mt-1">ITEMS: {collectionProducts.length.toString().padStart(3, '0')}</p>
                    </div>
                </div>

                {collectionProducts.map((product, index) => {
                    const isEven = index % 2 === 0;

                    return (
                        <section
                            key={product.id}
                            className={`min-h-[60vh] md:min-h-[80vh] flex items-center border-b border-[#ff5e00]/5 py-12 md:py-0`}
                        >
                            <div className={`w-full grid grid-cols-1 lg:grid-cols-2 gap-0`}>
                                {/* Text Side */}
                                <div
                                    className={`px-6 md:px-16 py-12 md:py-24 flex flex-col justify-center ${isEven ? 'lg:order-1' : 'lg:order-2'} border-[#ff5e00]/5 ${isEven ? 'lg:border-r' : 'lg:border-l'}`}
                                >
                                    <span className="font-mono text-[9px] opacity-20 mb-4 tracking-[0.5em] text-center md:text-left block w-full">
                                        ENTRY_{index.toString().padStart(3, '0')}
                                    </span>

                                    <h2 className="text-3xl md:text-6xl font-extralight uppercase tracking-tighter leading-[1] mb-6 md:mb-8 text-center md:text-left">
                                        {product.album}
                                    </h2>

                                    <div className="flex flex-col gap-1 mb-8 md:mb-12 text-center md:text-left">
                                        <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-60">
                                            ARTIST: {product.artist}
                                        </p>
                                        <p className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-30">
                                            CAT_NO: {product.label || 'ECR-' + product.id.slice(0, 4).toUpperCase()}
                                        </p>
                                    </div>

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-12 py-8 border-y border-[#ff5e00]/10">
                                        <div>
                                            <div className="opacity-20 text-[9px] mb-1 uppercase tracking-[0.3em] font-mono">Genre</div>
                                            <div className="text-xs uppercase font-mono tracking-wider">{product.genre}</div>
                                        </div>
                                        <div>
                                            <div className="opacity-20 text-[9px] mb-1 uppercase tracking-[0.3em] font-mono">Status</div>
                                            <div className="text-xs uppercase font-mono tracking-wider">{product.condition || 'MINT'}</div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="opacity-20 text-[9px] mb-1 uppercase tracking-[0.3em] font-mono">Value</div>
                                            <div className="text-xl font-light tracking-tighter">{product.price} DKK</div>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <button
                                        onClick={() => navigate(`/product/${product.id}`)}
                                        className="mx-auto md:mx-0 self-center md:self-start px-10 py-4 border border-[#ff5e00] hover:bg-[#ff5e00] hover:text-black text-[9px] md:text-[10px] font-mono uppercase tracking-[0.3em] transition-all duration-300"
                                    >
                                        [ INITIALIZE_DETAILS ]
                                    </button>
                                </div>

                                {/* Image Side */}
                                <div
                                    className={`relative bg-[#0a0a0a]/50 flex items-center justify-center p-8 md:p-24 ${isEven ? 'lg:order-2' : 'lg:order-1'} border-t lg:border-t-0 border-[#ff5e00]/5`}
                                >
                                    <div className="relative w-full aspect-square max-w-[280px] md:max-w-md group">
                                        {/* Frame Decor */}
                                        <div className="absolute -inset-4 border border-[#ff5e00]/5 pointer-events-none group-hover:border-[#ff5e00]/20 transition-colors duration-500" />
                                        <div className="absolute top-0 left-0 w-4 h-[1px] bg-[#ff5e00]/40" />
                                        <div className="absolute top-0 left-0 w-[1px] h-4 bg-[#ff5e00]/40" />
                                        <div className="absolute bottom-0 right-0 w-4 h-[1px] bg-[#ff5e00]/40" />
                                        <div className="absolute bottom-0 right-0 w-[1px] h-4 bg-[#ff5e00]/40" />

                                        <img
                                            src={product.cover_image || '/default-vinyl.png'}
                                            alt={product.album}
                                            className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 ease-in-out"
                                        />

                                        {/* UI Scanline effect */}
                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[#ff5e00]/5 to-transparent h-1/2 w-full animate-pulse opacity-20" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    );
                })}

                {/* Footer Section */}
                <section className="px-8 md:px-16 py-32 text-center opacity-20 font-mono text-[9px] tracking-[0.5em] uppercase">
                    EOF // EL_CUARTITO_CENTRAL_ARCHIVE
                </section>
            </main>
        </div>
    );
};

export default CollectionPage;
