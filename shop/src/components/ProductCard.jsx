import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Headphones, Check, ShoppingBag } from 'lucide-react';
import { useSelections } from '../context/SelectionsContext';
import { useCart } from '../context/CartContext';
import defaultImage from '../assets/default-vinyl.png';



const ProductCard = ({ product }) => {
    const { isInSelections, toggleSelection } = useSelections();
    const { addToCart } = useCart();
    const isSelected = isInSelections(product.id);

    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    const imageSrc = isValidImage(product.image) ? product.image : (isValidImage(product.cover_image) ? product.cover_image : defaultImage);

    // RSD Discount logic
    const isRSD = product.is_rsd_discount;
    const originalPrice = product.price;
    const discountedPrice = isRSD ? Math.round(originalPrice * 0.9) : originalPrice;

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

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product);
    };

    return (
        <Link to={`/product/${product.id}`} className="block">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group cursor-pointer flex flex-col"
            >
                <div className="w-full aspect-square mb-6 flex items-center justify-center p-6 md:p-8 lg:p-10">
                    <img
                        src={imageSrc}
                        alt={product.title}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.currentTarget.src = defaultImage; }}
                        className={`w-full h-full object-contain mix-blend-multiply drop-shadow-xl transition-transform duration-500 ${product.stock === 0 ? 'grayscale opacity-50' : 'group-hover:scale-105'}`}
                    />
                </div>
                
                <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                        {product.stock === 0 ? (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-red-500/70">
                                OUT OF STOCK
                            </span>
                        ) : product.status === 'New' ? (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">
                                BRAND NEW
                            </span>
                        ) : isRSD ? (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500">
                                RSD
                            </span>
                        ) : null}
                        
                        {product.label && (
                            <>
                                {(product.stock === 0 || product.status === 'New' || isRSD) && (
                                    <span className="text-[9px] text-black/20">•</span>
                                )}
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">
                                    {product.label}
                                </span>
                            </>
                        )}
                    </div>
                    
                    <h3 className="text-sm md:text-base font-bold text-black tracking-tight leading-tight mb-1">
                        {product.title}
                    </h3>
                    
                    {product.price && (
                        isRSD ? (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-black/40 line-through">{originalPrice} DKK</span>
                                <span className="text-xs font-bold text-orange-600">{discountedPrice} DKK</span>
                            </div>
                        ) : (
                            <span className="text-xs font-bold text-black/50">{product.price} DKK</span>
                        )
                    )}
                </div>
            </motion.div>
        </Link>
    );
};

export default ProductCard;
