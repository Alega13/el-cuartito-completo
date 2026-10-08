import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';

const WishlistHeart = ({ productId, className = '', size = 18 }) => {
    const { isSaved, toggle } = useWishlist();
    const navigate = useNavigate();
    const location = useLocation();
    const [pop, setPop] = useState(false);
    const saved = isSaved(productId);

    const handleClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await toggle(productId);
        if (!ok) {
            navigate('/login', { state: { from: location.pathname } });
            return;
        }
        setPop(true);
        setTimeout(() => setPop(false), 300);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={saved}
            className={`flex items-center justify-center text-black hover:opacity-60 transition-all ${pop ? 'scale-125' : 'scale-100'} ${className}`}
        >
            <Heart size={size} strokeWidth={1.5} fill={saved ? 'currentColor' : 'none'} />
        </button>
    );
};

export default WishlistHeart;
