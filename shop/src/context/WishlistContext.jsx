import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getWishlist, addToWishlist, removeFromWishlist } from '../services/account';

const WishlistContext = createContext({ savedIds: new Set(), isSaved: () => false, toggle: async () => false });

export const WishlistProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [savedIds, setSavedIds] = useState(new Set());

    useEffect(() => {
        if (!currentUser) { setSavedIds(new Set()); return; }
        getWishlist()
            .then(data => setSavedIds(new Set((data.items || []).map(i => i.id))))
            .catch(err => console.error('Error loading wishlist:', err));
    }, [currentUser]);

    const isSaved = useCallback((id) => savedIds.has(id), [savedIds]);

    // Returns false when the user must log in first
    const toggle = useCallback(async (id) => {
        if (!currentUser) return false;
        const wasSaved = savedIds.has(id);
        const next = new Set(savedIds);
        wasSaved ? next.delete(id) : next.add(id);
        setSavedIds(next); // optimistic
        try {
            wasSaved ? await removeFromWishlist(id) : await addToWishlist(id);
        } catch (err) {
            console.error('Wishlist toggle error:', err);
            setSavedIds(savedIds); // revert
        }
        return true;
    }, [currentUser, savedIds]);

    return (
        <WishlistContext.Provider value={{ savedIds, isSaved, toggle }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => useContext(WishlistContext);
