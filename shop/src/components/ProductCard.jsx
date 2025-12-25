import React from 'react';
import { motion } from 'framer-motion';
import defaultImage from '../assets/default-vinyl.png';



const ProductCard = ({ product }) => {
    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    const imageSrc = isValidImage(product.image) ? product.image : defaultImage;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group cursor-pointer"
        >
            <div className="aspect-square overflow-hidden bg-gray-100 rounded-sm mb-4 relative">
                <img
                    src={imageSrc}
                    alt={product.title}
                    onError={(e) => { e.currentTarget.src = defaultImage; }}
                    className={`w-full h-full object-cover transition-all duration-500 ${product.stock === 0 ? 'grayscale opacity-50' : 'grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105'}`}
                />
                {product.stock === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-black/80 text-white text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 rounded-sm">
                            Sin Stock
                        </span>
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <div className="flex justify-between items-start">
                    <h3 className="text-sm font-semibold uppercase tracking-tight">{product.artist}</h3>
                    {product.price && <span className="text-sm font-bold">DKK {product.price}</span>}
                </div>
                <p className="text-sm text-black/60">{product.title}</p>
                <p className="text-xs text-black/40 mt-2">{product.label} — {product.year}</p>
            </div>
        </motion.div>
    );
};

export default ProductCard;
