import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Headphones, Check } from 'lucide-react';
import { useSelections } from '../context/SelectionsContext';
import defaultImage from '../assets/default-vinyl.png';



const ProductCard = ({ product }) => {
    const { isInSelections, toggleSelection } = useSelections();
    const isSelected = isInSelections(product.id);

    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    const imageSrc = isValidImage(product.image) ? product.image : defaultImage;

    // Create a product object with proper fields for selections
    const productForSelection = {
        ...product,
        cover_image: product.image || product.cover_image,
        album: product.title || product.album
    };

    const handleSaveClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSelection(productForSelection, e.currentTarget);
    };

    return (
        <Link to={`/product/${product.id}`} className="block">
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
                        loading="lazy"
                        decoding="async"
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

                    {/* Save to Listening Room button */}
                    <button
                        onClick={handleSaveClick}
                        className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 z-10 shadow-md
                            ${isSelected
                                ? 'bg-black text-white'
                                : 'bg-white/95 text-black/70 hover:bg-black hover:text-white'
                            }
                            hover:scale-110`}
                        title={isSelected ? 'Remove from Listening Room' : 'Save to Listening Room'}
                    >
                        {isSelected ? <Check size={16} /> : <Headphones size={16} />}
                    </button>
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
        </Link>
    );
};

export default ProductCard;
