import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import defaultImage from '../assets/default-vinyl.png';


const Hero = ({ products }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const navigate = useNavigate();

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
        <section className="relative min-h-[80vh] lg:h-screen flex items-center px-4 sm:px-6 overflow-hidden py-24 lg:py-0">
            <AnimatePresence mode="wait">
                <motion.div
                    key={product.id}
                    className="max-w-7xl mx-auto w-full flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center"
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={slideVariants}
                >
                    {/* Image Section - Shows on top for mobile */}
                    <div className="relative order-1 lg:order-2 w-full flex justify-center lg:block">
                        <div className="aspect-square relative z-10 w-[70%] sm:w-[60%] lg:w-[80%] lg:ml-auto">
                            <img
                                src={product.cover_image || defaultImage}
                                onError={(e) => { e.currentTarget.src = defaultImage; }}
                                alt={product.album}
                                className="w-full h-full object-cover shadow-2xl grayscale-[0.3]"
                            />
                        </div>
                        {/* Decorative Circles - Hidden on mobile for cleaner look */}
                        <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-black/5 rounded-full -z-0"></div>
                        <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] border border-black/[0.02] rounded-full -z-0"></div>
                    </div>

                    {/* Text Section */}
                    <div className="order-2 lg:order-1 text-center lg:text-left">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-4 lg:mb-6">Our Choice of the Week</h2>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-light tracking-tight leading-[0.95] mb-6 lg:mb-8">
                            {product.album} <br />
                            <span className="text-black/60">{product.artist}</span>
                        </h1>
                        <button
                            onClick={() => navigate(`/product/${product.id}`)}
                            className="border-b-2 border-black pb-2 font-bold text-xs sm:text-sm tracking-widest hover:text-accent hover:border-accent transition-all"
                        >
                            DISCOVER THE SOUND
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </section>
    );
};

export default Hero;
