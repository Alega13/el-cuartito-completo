import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext();

// Helper to get the effective price of an item (with RSD discount if applicable)
export const getItemPrice = (item) => item.is_rsd_discount ? Math.round(item.price * 0.9) : item.price;

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem('el-cuartito-cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    useEffect(() => {
        localStorage.setItem('el-cuartito-cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = useCallback((product) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === product.id);
            if (existingItem) {
                return prevItems;
            }
            return [...prevItems, { ...product, quantity: 1 }];
        });
    }, []);

    const removeFromCart = useCallback((productId) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    }, []);

    const updateQuantity = useCallback((productId, quantity) => {
        setCartItems(prevItems => {
            if (quantity < 1) {
                return prevItems.filter(item => item.id !== productId);
            }
            return prevItems.map(item =>
                item.id === productId ? { ...item, quantity } : item
            )
        });
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
    }, []);

    const subtotal = cartItems.reduce((total, item) => total + (getItemPrice(item) * item.quantity), 0);
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            subtotal,
            totalItems
        }}>
            {children}
        </CartContext.Provider>
    );
};
