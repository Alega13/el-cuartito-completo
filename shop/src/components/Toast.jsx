import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Check } from 'lucide-react';

const Toast = ({ show, message, onComplete }) => {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: 0 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    onAnimationComplete={() => {
                        // Auto-hide after 2 seconds
                        setTimeout(onComplete, 2000);
                    }}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 9998,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 20px',
                        background: '#000',
                        color: '#fff',
                        borderRadius: 4,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: '0.02em'
                    }}
                >
                    <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Headphones size={12} />
                    </div>
                    {message}
                    <Check size={14} style={{ opacity: 0.7, marginLeft: 4 }} />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
