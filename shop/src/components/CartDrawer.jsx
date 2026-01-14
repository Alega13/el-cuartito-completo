import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import defaultImage from '../assets/default-vinyl.png';


const CartDrawer = ({ isOpen, onClose, setPage }) => {
    const { cartItems, removeFromCart, updateQuantity, subtotal } = useCart();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white/90 backdrop-blur-xl z-[110] shadow-2xl p-8 flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <ShoppingBag size={20} />
                                <h2 className="text-xl font-bold tracking-tighter uppercase">Your Basket</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto -mx-2 px-2">
                            {cartItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center text-black/20">
                                        <ShoppingBag size={32} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm tracking-widest uppercase mb-1">Basket is empty</p>
                                        <p className="text-sm text-black/40">Discover our catalogue to find your next favorite sound.</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="mt-6 border-b-2 border-black pb-1 text-xs font-bold tracking-[0.2em] uppercase hover:text-accent hover:border-accent transition-all"
                                    >
                                        Go shopping
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="flex gap-4 group">
                                            <div className="w-20 h-20 bg-black/5 rounded-sm overflow-hidden flex-shrink-0">
                                                <img
                                                    src={item.cover_image || defaultImage}
                                                    onError={(e) => { e.currentTarget.src = defaultImage; }}
                                                    alt={item.album}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between py-1">
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="text-xs font-bold uppercase tracking-tight truncate max-w-[150px]">{item.artist}</h3>
                                                        <span className="text-xs font-bold tracking-tighter">DKK {item.price * item.quantity}</span>
                                                    </div>
                                                    <p className="text-[10px] text-black/60 truncate max-w-[180px]">{item.album}</p>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center border border-black/10 rounded-sm">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            className="p-1 hover:bg-black/5 transition-colors"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <span className="text-[10px] font-bold w-6 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                            className="p-1 hover:bg-black/5 transition-colors"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="text-black/20 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-8 border-t border-black/5 space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-black/40 uppercase tracking-widest">Subtotal</span>
                                <span className="text-xl font-bold tracking-tighter">DKK {subtotal}</span>
                            </div>

                            {cartItems.length > 0 && (
                                <div className="bg-orange-50 border border-orange-100 rounded-sm p-3 text-center">
                                    <p className="text-[10px] text-orange-900 leading-relaxed">
                                        To purchase these records, visit our Discogs shop where they're available for sale.
                                    </p>
                                </div>
                            )}

                            <a
                                href="https://www.discogs.com/seller/elcuartitorecords.dk"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full bg-black text-white py-4 rounded-sm font-bold text-sm tracking-widest uppercase hover:bg-black/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${cartItems.length === 0 ? 'pointer-events-none opacity-30' : ''}`}
                            >
                                View Our Discogs Shop →
                            </a>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
