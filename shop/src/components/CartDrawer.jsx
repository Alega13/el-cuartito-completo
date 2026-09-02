import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart, getItemPrice } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import defaultImage from '../assets/default-vinyl.png';


const CartDrawer = ({ isOpen, onClose }) => {
    const { cartItems, removeFromCart, updateQuantity, subtotal } = useCart();
    const navigate = useNavigate();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 z-[100]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white z-[110] flex flex-col pt-4 md:pt-6 pb-0"
                    >
                        {/* Top Title & Close Button */}
                        <div className="flex justify-between items-start px-4 md:px-8 mb-4">
                            <h2 className="text-2xl md:text-4xl font-bold tracking-tighter uppercase mt-2">YOUR CART</h2>
                            <button
                                onClick={onClose}
                                className="text-black hover:opacity-50 transition-opacity"
                            >
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="square" strokeLinejoin="miter">
                                    <path d="M4 4l16 16m0-16L4 20" />
                                </svg>
                            </button>
                        </div>

                        {/* Top Divider */}
                        <div className="px-8 mb-12">
                            <div className="w-full h-px bg-black"></div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8">
                            {cartItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                    <p className="font-normal text-lg mb-1">Basket is empty</p>
                                    <button
                                        onClick={onClose}
                                        className="mt-6 border-b border-black pb-1 text-sm font-normal uppercase hover:text-black/50 transition-all"
                                    >
                                        Go shopping
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="flex items-start gap-8">
                                            {/* Image */}
                                            <div className="w-24 h-24 bg-black/5 flex-shrink-0">
                                                <img
                                                    src={item.cover_image || defaultImage}
                                                    onError={(e) => { e.currentTarget.src = defaultImage; }}
                                                    alt={item.album}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            
                                            {/* Details */}
                                            <div className="flex-1 flex flex-col pt-1">
                                                <h3 className="text-[17px] font-normal leading-tight mb-1">{item.album}</h3>
                                                <p className="text-[15px] text-black/50 mb-0.5">{item.artist}</p>
                                                <p className="text-[13px] text-black/30 uppercase tracking-widest">{item.label}</p>

                                                {/* Controls */}
                                                <div className="flex items-center gap-6 mt-auto">
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="text-[13px] text-black/50 hover:text-black transition-colors uppercase tracking-widest"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="text-right pt-1">
                                                <span className="text-[17px] font-normal tracking-wide">
                                                    {getItemPrice(item)} DKK
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bottom Section */}
                        {cartItems.length > 0 && (
                            <div className="mt-auto">
                                <div className="px-8 pb-8 flex flex-col gap-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[17px] font-normal">Subtotal (DKK)</span>
                                        <span className="text-2xl font-normal tracking-wide">{subtotal} DKK</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-[17px] font-normal">Shipping</span>
                                        <span className="text-[17px] font-normal text-black/50">Enter shipping address</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate('/checkout');
                                    }}
                                    className="w-full bg-black text-white py-8 text-2xl font-normal uppercase hover:bg-black/90 transition-colors flex items-center justify-center"
                                >
                                    Checkout
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
