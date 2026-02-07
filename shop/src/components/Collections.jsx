import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import LiquidImage from './LiquidImage';

const Collections = ({ products, isFullPage = false }) => {
    const navigate = useNavigate();
    const [hoveredProduct, setHoveredProduct] = useState(null);

    const collections = [
        {
            name: "Detroit Techno",
            code: "DET.01",
            description: "Curated selections from the birthplace of techno.",
            year: "1988—",
        },
        {
            name: "Ambient Essentials",
            code: "AMB.02",
            description: "A journey through texture and space.",
            year: "1978—",
        },
        {
            name: "Staff Picks",
            code: "STF.03",
            description: "Personal favorites from El Cuartito.",
            year: "2024",
        }
    ];

    const getCollectionProducts = (collectionName) => {
        return products.filter(p =>
            p.collection && p.collection.toLowerCase().includes(collectionName.toLowerCase())
        );
    };

    if (!isFullPage) return null;

    const activeCollections = collections.filter(c => getCollectionProducts(c.name).length > 0);

    return (
        <div
            className="h-screen w-screen overflow-y-scroll snap-y snap-mandatory"
            style={{
                background: '#050505',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}
        >
            {/* Grain Texture Overlay */}
            <div
                className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            <style>{`::-webkit-scrollbar { display: none; }`}</style>

            {activeCollections.map((collection, idx) => {
                const collectionProducts = getCollectionProducts(collection.name);
                const totalItems = collectionProducts.length;

                return (
                    <section
                        key={idx}
                        className="h-screen w-screen snap-start relative flex items-center justify-center overflow-hidden"
                    >
                        {/* Corner Metadata - Top Left */}
                        <div className="absolute top-4 md:top-8 left-4 md:left-8 z-20">
                            <p className="font-mono text-[10px] text-[#ff5e00]/40 tracking-[0.3em] uppercase">
                                {collection.code}
                            </p>
                            <p className="font-mono text-[10px] text-[#ff5e00]/20 mt-1">
                                {collection.year}
                            </p>
                        </div>

                        {/* Corner Metadata - Top Right */}
                        <div className="absolute top-4 md:top-8 right-4 md:right-8 z-20 text-right">
                            <p className="font-mono text-[10px] text-[#ff5e00]/40 tracking-[0.3em] uppercase">
                                {String(idx + 1).padStart(2, '0')} / {String(activeCollections.length).padStart(2, '0')}
                            </p>
                            <p className="font-mono text-[10px] text-[#ff5e00]/20 mt-1">
                                {totalItems} ITEMS
                            </p>
                        </div>

                        {/* Center Content */}
                        <div className="relative z-10 text-center px-8 max-w-4xl flex flex-col items-center">
                            {/* Liquid Distortion Cover Art */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                className="mb-8"
                            >
                                <LiquidImage
                                    src="/collection-cover-test.jpg"
                                    alt={`${collection.name} cover`}
                                    className="w-64 h-64 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px] cursor-pointer"
                                />
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                className="text-4xl md:text-6xl font-extralight tracking-[-0.04em] text-[#ff5e00] mb-4"
                                style={{ fontWeight: 200 }}
                            >
                                {collection.name}
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.4, duration: 0.8 }}
                                className="font-mono text-[11px] text-[#ff5e00]/60 tracking-[0.15em] uppercase max-w-md mx-auto leading-relaxed"
                            >
                                {collection.description}
                            </motion.p>

                            {/* Products Grid */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                                className="mt-8 md:mt-16 flex justify-center gap-2 md:gap-3 flex-wrap max-w-2xl mx-auto px-4"
                            >
                                {collectionProducts.slice(0, 8).map((product, pIdx) => (
                                    <Link
                                        key={product.id}
                                        to={`/product/${product.id}`}
                                        className="group relative"
                                        onMouseEnter={() => setHoveredProduct(product.id)}
                                        onMouseLeave={() => setHoveredProduct(null)}
                                    >
                                        <div className="w-16 h-16 md:w-20 md:h-20 overflow-hidden border border-white/10 group-hover:border-white/40 transition-all duration-300 group-hover:scale-105">
                                            <img
                                                src={product.cover_image}
                                                alt={product.album}
                                                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Hover Tooltip */}
                                        <AnimatePresence>
                                            {hoveredProduct === product.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-50"
                                                >
                                                    <p className="font-mono text-[9px] text-[#ff5e00]/60">{product.artist}</p>
                                                    <p className="font-mono text-[8px] text-[#ff5e00]/30">{product.album}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Link>
                                ))}
                            </motion.div>

                            {/* View All Button */}
                            <motion.button
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.7, duration: 0.8 }}
                                onClick={() => navigate(`/collection/${encodeURIComponent(collection.name)}`)}
                                className="mt-12 font-mono text-[10px] text-[#ff5e00]/40 hover:text-[#ff5e00] tracking-[0.3em] uppercase flex items-center gap-2 mx-auto group transition-colors"
                            >
                                View Collection <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </div>

                        {/* Corner Metadata - Bottom Left */}
                        <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 z-20">
                            <p className="font-mono text-[8px] md:text-[9px] text-[#ff5e00]/20 tracking-wider">
                                EL CUARTITO RECORDS
                            </p>
                        </div>

                        {/* Scroll Indicator - Bottom Center */}
                        {idx < activeCollections.length - 1 && (
                            <motion.div
                                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
                                animate={{ y: [0, 8, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            >
                                <ChevronDown size={20} className="text-[#ff5e00]/20" />
                            </motion.div>
                        )}

                        {/* Vertical Progress Bar - Right */}
                        <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
                            {activeCollections.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-[2px] transition-all duration-500 ${idx === i
                                        ? 'h-8 bg-[#ff5e00]/60'
                                        : 'h-4 bg-[#ff5e00]/10'
                                        }`}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

export default Collections;
