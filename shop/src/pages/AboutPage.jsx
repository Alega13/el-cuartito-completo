import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

// Generic Asset File Names (files located in VIDEOSABOUTUS folder in shop/public)
// Replace these paths or file names as needed:
// image_0_fachada.jpg -> /VIDEOSABOUTUS/IMAGENFACHADA1.JPG
// image_1_interior.jpg -> /VIDEOSABOUTUS/IMAGENINTERIOR2.jpg
// video_2_mood.mp4 -> /VIDEOSABOUTUS/VIDEOINT3.MOV
// video_3_final.mp4 -> /VIDEOSABOUTUS/VIDEOFINAL.mov
const MEDIA_ASSETS = {
    FACHADA_1: '/VIDEOSABOUTUS/IMAGENFACHADA1.JPG',
    INTERIOR_2: '/VIDEOSABOUTUS/IMAGENINTERIOR2.jpg',
    VIDEO_INT_3: '/VIDEOSABOUTUS/VIDEOINT3.MOV',
    VIDEO_FINAL: '/VIDEOSABOUTUS/VIDEOFINAL.mov',
};

const AboutPage = () => {
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
                title="About Us"
                description="El Cuartito Records is a record store and creative space based in Copenhagen — a small room built around sound, culture, and connection."
                url="/about"
            />

            {/* Persistent Navigation Bar */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 flex items-center justify-between mix-blend-difference pointer-events-auto">
                <Link
                    to="/"
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white hover:opacity-50 transition-opacity"
                >
                    <ArrowLeft size={14} />
                    SHOP
                </Link>

                <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-white">
                    <button
                        onClick={() => {
                            if (containerRef.current) {
                                containerRef.current.scrollTo({
                                    top: containerRef.current.clientHeight * 3,
                                    behavior: 'smooth'
                                });
                            }
                        }}
                        className="hover:opacity-50 transition-opacity uppercase"
                    >
                        VISIT US
                    </button>
                </div>
            </header>

            {/* Fixed Background Media Layer with Fade Transitions */}
            <div className="fixed inset-0 w-full h-full z-0 bg-black pointer-events-none">
                {/* Background 0: Fachada Image (IMAGENFACHADA1.JPG / image_0_fachada.jpg) */}
                <div
                    className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                        activeSection === 0 ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <img
                        src={MEDIA_ASSETS.FACHADA_1}
                        alt="Fachada"
                        className="w-full h-full object-cover rounded-none filter grayscale contrast-125 brightness-75"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>

                {/* Background 1: Interior Image (IMAGENINTERIOR2.jpg / image_1_interior.jpg) */}
                <div
                    className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                        activeSection === 1 ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <img
                        src={MEDIA_ASSETS.INTERIOR_2}
                        alt="Interior"
                        className="w-full h-full object-cover rounded-none filter grayscale contrast-125 brightness-75"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>

                {/* Background 2: Mood Video (VIDEOINT3.MOV / video_2_mood.mp4) */}
                <div
                    className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                        activeSection === 2 ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <video
                        src={MEDIA_ASSETS.VIDEO_INT_3}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover rounded-none filter grayscale contrast-125 brightness-75"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>

                {/* Background 3: Final Video (VIDEOFINAL.mov / video_3_final.mp4) */}
                <div
                    className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                        activeSection === 3 ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <video
                        src={MEDIA_ASSETS.VIDEO_FINAL}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover rounded-none filter grayscale contrast-125 brightness-75"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>
            </div>

            {/* Fullscreen Sequential Scroll Container */}
            <div
                ref={containerRef}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory relative z-10 scroll-smooth"
            >
                {/* SECTION 0: FACHADA & TITLE */}
                <section className="w-full h-screen snap-start flex flex-col justify-center px-6 md:px-20 max-w-5xl">
                    <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white mb-8 border-b-2 border-white pb-4">
                        ABOUT US...
                    </h1>
                    <div className="space-y-6 text-lg md:text-2xl font-bold leading-snug text-white max-w-3xl uppercase tracking-tight">
                        <p>
                            <strong>EL CUARTITO RECORDS</strong> IS A RECORD STORE AND CREATIVE SPACE BASED IN COPENHAGEN — A SMALL ROOM BUILT AROUND SOUND, CULTURE, AND CONNECTION.
                        </p>
                        <p className="text-white/80 font-normal normal-case text-base md:text-xl">
                            We curate sounds, gatherings, and experiences that blend underground culture, design, and community. Our aim is simple: to create a room where music feels alive — raw, human, and timeless.
                        </p>
                    </div>
                </section>

                {/* SECTION 1: INTERIOR */}
                <section className="w-full h-screen snap-start flex flex-col justify-center px-6 md:px-20 max-w-5xl">
                    <div className="space-y-8 text-lg md:text-2xl font-bold leading-snug text-white max-w-3xl">
                        <p className="uppercase tracking-tight border-l-4 border-white pl-6 py-2">
                            MORE THAN A STORE, IT'S A MEETING POINT — A PLACE TO LISTEN, TALK, AND BE PART OF A COMMUNITY THAT VALUES THE BEAUTY OF ANALOG AND THE RITUAL OF PLAYING VINYL.
                        </p>
                        <p className="text-white/80 font-normal text-base md:text-xl leading-relaxed">
                            <em>"El Cuartito"</em> (Spanish for "the little room") reflects what we believe in: intimacy, warmth, and authenticity.
                        </p>
                    </div>
                </section>

                {/* SECTION 2: MOOD VIDEO INT 3 */}
                <section className="w-full h-screen snap-start flex flex-col justify-center px-6 md:px-20 max-w-5xl">
                    <div className="space-y-6 text-2xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none max-w-3xl">
                        <p className="border-b-4 border-white pb-6">
                            COME BY, HAVE A CHAT, DIG THROUGH THE CRATES, AND BE PART OF THE ROOM.
                        </p>
                    </div>
                </section>

                {/* SECTION 3: FINAL VIDEO & VISIT US */}
                <section className="w-full h-screen snap-start flex flex-col justify-center px-6 md:px-20 max-w-5xl">
                    <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter text-white mb-8 border-b-2 border-white pb-4">
                        VISIT US
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-white mb-10">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">LOCATION</h3>
                            <p className="font-bold text-base md:text-lg leading-snug">
                                Dybbølsgade 14<br />
                                1721 København<br />
                                Denmark
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">CONTACT</h3>
                            <a
                                href="mailto:el.cuartito.cph@gmail.com"
                                className="font-bold text-base md:text-lg underline hover:opacity-60 transition-opacity block"
                            >
                                el.cuartito.cph@gmail.com
                            </a>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">HOURS</h3>
                            <p className="font-bold text-base md:text-lg leading-snug">
                                Tuesday – Saturday<br />
                                11:00 – 17:00
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-white">
                        <Link
                            to="/"
                            className="border-2 border-white px-6 py-3 hover:bg-white hover:text-black transition-colors rounded-none"
                        >
                            SHOP CATALOG
                        </Link>
                        <a
                            href="https://maps.app.goo.gl/48xxSz6pB9ECxpkE8"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border-2 border-white px-6 py-3 hover:bg-white hover:text-black transition-colors rounded-none"
                        >
                            OPEN IN MAPS ↗
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

export default AboutPage;
