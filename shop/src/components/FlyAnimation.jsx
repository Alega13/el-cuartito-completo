import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones } from 'lucide-react';

const FlyAnimation = ({ animation, onComplete }) => {
    if (!animation) return null;

    const { startX, startY, endX, endY, id } = animation;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={id}
                initial={{
                    x: startX,
                    y: startY,
                    scale: 1,
                    opacity: 1
                }}
                animate={{
                    x: endX,
                    y: endY,
                    scale: 0.4,
                    opacity: 0
                }}
                transition={{
                    duration: 0.5,
                    ease: [0.4, 0, 0.2, 1]
                }}
                onAnimationComplete={onComplete}
                style={{
                    position: 'fixed',
                    zIndex: 9999,
                    pointerEvents: 'none'
                }}
            >
                <div
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                    }}
                >
                    <Headphones size={14} color="#fff" />
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FlyAnimation;
