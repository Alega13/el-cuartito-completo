import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import defaultImage from '../assets/default-vinyl.png';


const Hero = ({ products, onViewProduct }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-rotate every 10 seconds
    useEffect(() => {
        if (!products || products.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % products.length);
        }, 10000);

        return () => clearInterval(interval);
    }, [products]);

    if (!products || products.length === 0) return null;

    const product = products[currentIndex];

    // Variants for the slide animation
    const slideVariants = {
        enter: {
            x: 100,
            opacity: 0
        },
        center: {
            x: 0,
            opacity: 1,
            transition: {
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1] // Fluid ease-out
            }
        },
        exit: {
            x: -100,
            opacity: 0,
            transition: {
                duration: 0.5,
                ease: "easeIn"
            }
        }
    };

    return (
        <section className="relative h-screen flex items-center px-6 overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.div
                    key={product.id} // Key change triggers the animation
                    className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center absolute inset-0 m-auto px-6"
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={slideVariants}
                >
                    {/* Text Section */}
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-6">Our Choice of the Week</h2>
                        <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-[0.9] mb-8">
                            {product.album} <br />
                            <span className="text-black/60">{product.artist}</span>
                        </h1>
                        <button
                            onClick={() => onViewProduct(product)}
                            className="border-b-2 border-black pb-2 font-bold text-sm tracking-widest hover:text-accent hover:border-accent transition-all"
                        >
                            DISCOVER THE SOUND
                        </button>
                    </div>

                    {/* Image Section */}
                    <div className="relative hidden lg:block">
                        <div className="aspect-square relative z-10 w-[80%] ml-auto">
                            <img
                                src={product.cover_image || defaultImage}
                                onError={(e) => { e.currentTarget.src = defaultImage; }}
                                alt={product.album}
                                className="w-full h-full object-cover shadow-2xl grayscale-[0.3]"
                            />
                        </div>
                        {/* Decorative Circles (Static relative to slide or moving with it? Moving with it looks better for "slide out") */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-black/5 rounded-full -z-0"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] border border-black/[0.02] rounded-full -z-0"></div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </section>
    );
};

export default Hero;
