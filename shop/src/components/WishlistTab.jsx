import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import defaultImage from '../assets/default-vinyl.png';

const isLocal = window.location.hostname === 'localhost';
const API_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app');

const WishlistTab = ({ userId }) => {
    const [wishlistItems, setWishlistItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchWishlist = async () => {
        if (!userId) return;
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/wishlist/${userId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success && Array.isArray(data.items)) {
                setWishlistItems(data.items);
            } else {
                setWishlistItems([]);
            }
        } catch (err) {
            console.error("Error fetching wishlist:", err);
            setError("Failed to load wishlist items.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWishlist();
    }, [userId]);

    const handleRemove = async (productId, e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const response = await fetch(`${API_URL}/api/wishlist/${userId}/${productId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setWishlistItems(prev => prev.filter(item => item.id !== productId));
            }
        } catch (err) {
            console.error("Error removing item from wishlist:", err);
        }
    };

    const isValidImage = (url) => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url === 'null' || url === 'undefined') return false;
        if (url.includes('images.unsplash.com')) return false;
        return true;
    };

    if (loading) {
        return (
            <div className="border border-black p-12 text-center text-xs font-mono font-bold uppercase tracking-widest rounded-none">
                LOADING WISHLIST...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 border border-black bg-red-500/10 text-red-700 text-xs font-mono font-bold uppercase tracking-wider rounded-none mb-6">
                ⚠️ {error}
            </div>
        );
    }

    if (wishlistItems.length === 0) {
        return (
            <div className="border border-black p-12 text-center flex flex-col items-center justify-center space-y-4 rounded-none bg-white">
                <p className="text-xs font-mono font-bold uppercase tracking-widest text-black/60">
                    YOUR WISHLIST IS CURRENTLY EMPTY.
                </p>
                <Link
                    to="/"
                    className="border border-black bg-black text-white text-xs font-mono font-bold uppercase tracking-widest px-6 py-3 transition-none rounded-none"
                >
                    DISCOVER VINYLS
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Brutalist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistItems.map((product) => {
                    const imgSrc = isValidImage(product.cover_image)
                        ? product.cover_image
                        : (isValidImage(product.image) ? product.image : defaultImage);

                    return (
                        <div
                            key={product.id}
                            className="border border-black rounded-none bg-white flex flex-col justify-between overflow-hidden shadow-none"
                        >
                            {/* Image occupying 100% of cell without padding */}
                            <Link to={`/product/${product.id}`} className="block w-full aspect-square border-b border-black overflow-hidden relative">
                                <img
                                    src={imgSrc}
                                    alt={product.album || product.title}
                                    onError={(e) => { e.currentTarget.src = defaultImage; }}
                                    className="w-full h-full object-cover rounded-none transition-none"
                                />
                            </Link>

                            {/* Product Info below in uppercase monospace font (text-xs) */}
                            <div className="p-4 flex flex-col justify-between flex-1 text-left font-mono uppercase text-xs text-black bg-white">
                                <div>
                                    <div className="font-bold text-xs uppercase tracking-tight text-black line-clamp-1 mb-0.5">
                                        {product.artist || 'UNKNOWN ARTIST'}
                                    </div>
                                    <div className="font-bold text-xs uppercase tracking-tight text-black/70 line-clamp-1 mb-1">
                                        {product.album || product.title || 'VINYL RECORD'}
                                    </div>

                                    {(product.label || product.genre) && (
                                        <div className="text-[10px] text-black/50 font-mono uppercase tracking-wider mb-2">
                                            {product.label || product.genre}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-black/10 flex flex-col gap-2">
                                    <div className="flex justify-between items-center font-mono font-bold text-xs text-black">
                                        <span>PRICE:</span>
                                        <span>{product.price ? `${product.price} DKK` : 'N/A'}</span>
                                    </div>

                                    <button
                                        onClick={(e) => handleRemove(product.id, e)}
                                        className="w-full mt-2 py-2 px-3 border border-black bg-black text-white hover:bg-white hover:text-black font-mono text-[10px] font-bold uppercase tracking-wider transition-none rounded-none"
                                    >
                                        REMOVE FROM WISHLIST
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WishlistTab;
