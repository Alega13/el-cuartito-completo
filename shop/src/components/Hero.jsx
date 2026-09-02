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
        <section className="relative min-h-screen bg-[#F3F3F3] flex flex-col justify-center px-10 md:px-20 pt-24 pb-12">
            <AnimatePresence mode="wait">
                <motion.div
                    key={product.id}
                    className="w-full h-full flex flex-col md:grid md:grid-cols-12 gap-8 items-center justify-center flex-1 cursor-pointer"
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={slideVariants}
                    onClick={() => navigate(`/product/${product.id}`)}
                >
                    {/* Image Section - Takes up majority of space */}
                    <div className="w-full md:col-span-7 md:col-start-2 flex justify-center items-center">
                        <img
                            src={product.cover_image || defaultImage}
                            onError={(e) => { e.currentTarget.src = defaultImage; }}
                            alt={product.album}
                            className="w-[80%] md:w-[70%] max-h-[70vh] object-contain drop-shadow-xl"
                        />
                    </div>

                    {/* Text Section - Far right */}
                    <div className="w-full md:col-span-3 flex flex-col items-start justify-center">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[0.95] text-black mb-2">
                            {product.album}
                        </h1>
                        <h2 className="text-lg md:text-xl font-light text-black/70 mb-1">
                            {product.artist}
                        </h2>
                        <p className="text-[10px] font-bold uppercase text-black/40 tracking-widest mb-6">
                            {product.label || 'EL CUARTITO'}
                        </p>
                        <p className="text-xs font-bold text-black/50">
                            {product.price ? `${product.price} DKK` : '40 DKK'}
                        </p>
                    </div>
                </motion.div>
            </AnimatePresence>
        </section>
    );
};

export default Hero;
