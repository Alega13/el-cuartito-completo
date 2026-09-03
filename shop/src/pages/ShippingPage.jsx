import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

// Generic Asset Paths (files located in /videosshipping in shop/public)
const MEDIA_ASSETS = {
    VIDEO_1: '/videosshipping/VIDEO1.MOV',
    IMAGE_1: '/videosshipping/IMAGEN1.jpg',
    VIDEO_2: '/videosshipping/video2.mov',
    IMAGE_FINAL: '/videosshipping/IMAGENFINAL.JPG',
};

const ShippingPage = () => {
    const [activeSection, setActiveSection] = useState(0);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const scrollTop = containerRef.current.scrollTop;
            const height = containerRef.current.clientHeight;
            const index = Math.min(3, Math.max(0, Math.round(scrollTop / height)));
            setActiveSection(index);
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    return (
        <div className="w-screen h-screen overflow-hidden bg-black text-white relative font-sans select-none rounded-none shadow-none">
            <SEO
                title="Shipping & Returns"
                description="Shipping rates, delivery times, and return policy for El Cuartito Records."
                url="/shipping"
            />

            {/* Fixed Background Media Layer with Fade Transitions */}
            <div className="fixed inset-0 w-full h-full z-0 bg-black pointer-events-none">
                {/* Background 0: VIDEO1 */}
                <div
                    className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                        activeSection === 0 ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <video
                        src={MEDIA_ASSETS.VIDEO_1}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover object-center md:object-[center_57%] rounded-none filter grayscale contrast-125 brightness-75"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>

                {/* Background 1: IMAGEN1 */}
                <div
                    className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                        activeSection === 1 ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <img
                        src={MEDIA_ASSETS.IMAGE_1}
                        alt="Shipping & Vinyl"
                        className="w-full h-full object-cover object-center rounded-none filter grayscale contrast-125 brightness-75"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>

                {/* Background 2: VIDEO2 */}
                <div
                    className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                        activeSection === 2 ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <video
                        src={MEDIA_ASSETS.VIDEO_2}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover object-center rounded-none filter grayscale contrast-125 brightness-75"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>

                {/* Background 3: IMAGENFINAL */}
                <div
                    className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                        activeSection === 3 ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <img
                        src={MEDIA_ASSETS.IMAGE_FINAL}
                        alt="Returns & Final"
                        className="w-full h-full object-cover object-center rounded-none filter grayscale contrast-125 brightness-75"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>
            </div>

            {/* Fullscreen Sequential Scroll Container */}
            <div
                ref={containerRef}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory relative z-10 scroll-smooth"
            >
                {/* SECTION 0: START (VIDEO 1) */}
                <section className="w-full h-screen snap-start flex flex-col justify-center items-end text-right px-6 md:px-20 max-w-5xl ml-auto">
                    <h1 className="text-4xl md:text-8xl font-black uppercase tracking-tighter text-white mb-8 border-b-2 border-white pb-4 w-full text-right">
                        SHIPPING & RETURNS...
                    </h1>
                    <div className="space-y-6 text-lg md:text-2xl font-bold leading-snug text-white max-w-3xl uppercase tracking-tight flex flex-col items-end text-right">
                        <p>
                            <strong>WE SHIP VINYL SAFELY</strong> ACROSS DENMARK AND THE EUROPEAN UNION.
                        </p>
                        <p className="text-white/80 font-normal normal-case text-base md:text-xl">
                            All orders are handled directly from our Copenhagen store with specialized vinyl packaging to ensure perfect delivery.
                        </p>
                    </div>
                </section>

                {/* SECTION 1: RATES & DELIVERIES (IMAGEN 1) */}
                <section className="w-full h-screen snap-start flex flex-col justify-start md:justify-center items-center text-center pt-[35vh] md:pt-0 pb-10 md:pb-16 px-6 md:px-20 max-w-5xl mx-auto">
                    <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tighter text-white mb-8 border-b-2 border-white pb-4 w-full text-center">
                        RATES & DELIVERY
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 w-full text-left">
                        {/* DENMARK */}
                        <div className="border-l-2 border-white pl-6 space-y-4">
                            <div className="flex items-baseline justify-between border-b border-white/30 pb-2">
                                <h3 className="text-base md:text-xl font-black uppercase tracking-widest text-white">DENMARK</h3>
                                <span className="text-xs font-bold text-white/70 uppercase tracking-widest font-mono">1 – 3 DAYS</span>
                            </div>
                            <div className="space-y-2.5 text-sm md:text-base font-semibold text-white/90">
                                <div className="flex justify-between items-center">
                                    <span className="uppercase tracking-wider">DAO Shop Pickup</span>
                                    <span className="font-mono text-white">50 DKK</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="uppercase tracking-wider">DAO Home Delivery</span>
                                    <span className="font-mono text-white">60 DKK</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="uppercase tracking-wider">GLS Shop Pickup</span>
                                    <span className="font-mono text-white">50 DKK</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="uppercase tracking-wider">GLS Home Delivery</span>
                                    <span className="font-mono text-white">80 DKK</span>
                                </div>
                            </div>
                        </div>

                        {/* EU */}
                        <div className="border-l-2 border-white pl-6 space-y-4">
                            <div className="flex items-baseline justify-between border-b border-white/30 pb-2">
                                <h3 className="text-base md:text-xl font-black uppercase tracking-widest text-white">EUROPEAN UNION</h3>
                                <span className="text-xs font-bold text-white/70 uppercase tracking-widest font-mono">5 – 10 DAYS</span>
                            </div>
                            <div className="space-y-2.5 text-sm md:text-base font-semibold text-white/90">
                                <div className="flex justify-between items-center">
                                    <span className="uppercase tracking-wider">GLS Intl Pickup</span>
                                    <span className="font-mono text-white">105 DKK</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="uppercase tracking-wider">GLS Intl Home</span>
                                    <span className="font-mono text-white">120 DKK</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-white/60 uppercase tracking-widest pt-2 leading-relaxed">
                                * Multiple items (2–7 LPs) & live international totals calculated at checkout.
                            </p>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: SECURE PACKAGING (VIDEO 2) */}
                <section className="w-full h-screen snap-start flex flex-col justify-center items-start px-6 md:px-20 max-w-5xl">
                    <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tighter text-white mb-6 border-b-2 border-white pb-4 w-full">
                        HEAVY-DUTY PACKAGING
                    </h2>
                    <div className="space-y-6 text-lg md:text-2xl font-bold leading-snug text-white max-w-3xl uppercase tracking-tight">
                        <p>
                            ALL RECORDS ARE SHIPPED IN HEAVY-DUTY RECORD MAILERS WITH EXTRA CARDBOARD STIFFENERS TO PREVENT BENDING AND CORNER DAMAGE.
                        </p>
                        <p className="text-white/80 font-normal normal-case text-base md:text-xl">
                            For larger orders (3+ vinyls), we use specialized double-wall vinyl shipping boxes for maximum protection during transit.
                        </p>
                    </div>
                </section>

                {/* SECTION 3: RETURNS & CONTACT (IMAGEN FINAL) */}
                <section className="w-full h-screen snap-start flex flex-col justify-center px-6 md:px-20 max-w-5xl">
                    <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter text-white mb-8 border-b-2 border-white pb-4">
                        14-DAY RETURN GUARANTEE
                    </h2>

                    <div className="space-y-6 text-lg md:text-xl font-bold text-white max-w-3xl mb-10">
                        <p className="uppercase tracking-tight">
                            IF YOUR RECORD ARRIVES DAMAGED OR SIGNIFICANTLY DIFFERENT FROM DESCRIBED, CONTACT US WITHIN 14 DAYS FOR A FULL REFUND OR REPLACEMENT.
                        </p>
                        <p className="text-white/80 font-normal text-base md:text-lg">
                            Email us with photos of the issue at <strong className="text-white underline">el.cuartito.cph@gmail.com</strong> and we'll resolve it within 24 hours.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-white">
                        <Link
                            to="/"
                            className="border-2 border-white px-6 py-3 hover:bg-white hover:text-black transition-colors rounded-none"
                        >
                            SHOP CATALOG
                        </Link>
                        <a
                            href="mailto:el.cuartito.cph@gmail.com"
                            className="border-2 border-white px-6 py-3 hover:bg-white hover:text-black transition-colors rounded-none"
                        >
                            CONTACT US ↗
                        </a>
                        <a
                            href="https://www.instagram.com/el.cuartito.records/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border-2 border-white px-6 py-3 hover:bg-white hover:text-black transition-colors rounded-none"
                        >
                            INSTAGRAM ↗
                        </a>
                    </div>
                </section>
            </div>

            {/* Bottom Progress Counter */}
            <div className="fixed bottom-6 right-6 md:right-12 z-50 text-xs font-bold uppercase tracking-widest text-white mix-blend-difference pointer-events-none">
                0{activeSection + 1} / 04
            </div>
        </div>
    );
};

export default ShippingPage;

