import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const SelectionsContext = createContext();

export const useSelections = () => {
    const context = useContext(SelectionsContext);
    if (!context) {
        throw new Error('useSelections must be used within a SelectionsProvider');
    }
    return context;
};

const STORAGE_KEY = 'el-cuartito-selections';

export const SelectionsProvider = ({ children }) => {
    // Load initial state from localStorage
    const [selections, setSelections] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Fly animation state
    const [flyAnimation, setFlyAnimation] = useState(null);
    const navTargetRef = useRef(null);

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Persist to localStorage whenever selections change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
        } catch (e) {
            console.error('Error saving selections to localStorage:', e);
        }
    }, [selections]);

    // Add a product to selections
    const addToSelections = (product) => {
        setSelections(prev => {
            // Prevent duplicates
            if (prev.some(p => p.id === product.id)) {
                return prev;
            }
            return [...prev, product];
        });
    };

    // Remove a product from selections
    const removeFromSelections = (productId) => {
        setSelections(prev => prev.filter(p => p.id !== productId));
    };

    // Check if a product is in selections
    const isInSelections = (productId) => {
        return selections.some(p => p.id === productId);
    };

    // Trigger fly animation
    const triggerFlyAnimation = useCallback((startElement) => {
        if (!startElement) return;

        const startRect = startElement.getBoundingClientRect();

        // Get end position - either from nav link or fallback to top-right
        let endX, endY;
        if (navTargetRef.current) {
            const endRect = navTargetRef.current.getBoundingClientRect();
            endX = endRect.left + endRect.width / 2 - 16;
            endY = endRect.top + endRect.height / 2 - 16;
        } else {
            // Fallback: fly to top-right of screen (where selections tab is)
            endX = window.innerWidth - 60;
            endY = window.innerHeight / 2;
        }

        setFlyAnimation({
            startX: startRect.left + startRect.width / 2 - 16,
            startY: startRect.top + startRect.height / 2 - 16,
            endX,
            endY,
            id: Date.now()
        });
    }, []);

    // Clear fly animation
    const clearFlyAnimation = useCallback(() => {
        setFlyAnimation(null);
    }, []);

    // Trigger toast
    const triggerToast = useCallback((message) => {
        setToastMessage(message);
        setShowToast(true);
    }, []);

    // Toggle selection with optional fly animation
    const toggleSelection = (product, triggerElement = null) => {
        if (isInSelections(product.id)) {
            removeFromSelections(product.id);
        } else {
            addToSelections(product);
            // Trigger fly animation when adding
            if (triggerElement) {
                triggerFlyAnimation(triggerElement);
            }
            // Trigger toast
            triggerToast('Added to Listening Room');
        }
    };

    // Clear all selections
    const clearSelections = () => {
        setSelections([]);
    };

    // Get selection count
    const selectionCount = selections.length;

    return (
        <SelectionsContext.Provider value={{
            selections,
            addToSelections,
            removeFromSelections,
            isInSelections,
            toggleSelection,
            clearSelections,
            selectionCount,
            flyAnimation,
            clearFlyAnimation,
            navTargetRef,
            triggerFlyAnimation,
            showToast,
            setShowToast,
            toastMessage
        }}>
            {children}
        </SelectionsContext.Provider>
    );
};
