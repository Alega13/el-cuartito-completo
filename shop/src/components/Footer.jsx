import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Footer = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleScrollToCatalog = (e) => {
        if (e) e.preventDefault();
        
        if (location.pathname !== '/') {
            navigate('/');
            setTimeout(() => {
                const el = document.getElementById('catalogue');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            const el = document.getElementById('catalogue');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (email.trim()) {
            setSubscribed(true);
            setEmail('');
            setTimeout(() => setSubscribed(false), 3000);
        }
    };

    return (
        <footer className="bg-[#F3F3F3] border-t border-black/10 mt-32 relative text-black">
            <div className="max-w-7xl mx-auto px-6 sm:px-12 py-12 md:py-20">
                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 items-start mb-16">
                    
                    {/* Left: Large Stacked Underlined Links */}
                    <div className="md:col-span-6 flex flex-col space-y-3 sm:space-y-4">
                        <Link 
                            to="/" 
                            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight underline decoration-2 underline-offset-4 hover:opacity-60 transition-opacity w-fit"
                        >
                            Home
                        </Link>
                        <a 
                            href="#catalogue" 
                            onClick={handleScrollToCatalog} 
                            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight underline decoration-2 underline-offset-4 hover:opacity-60 transition-opacity w-fit cursor-pointer"
                        >
                            Catalog
                        </a>
                        <Link 
                            to="/about" 
                            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight underline decoration-2 underline-offset-4 hover:opacity-60 transition-opacity w-fit"
                        >
                            About
                        </Link>
                        <Link 
                            to="/shipping" 
                            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight underline decoration-2 underline-offset-4 hover:opacity-60 transition-opacity w-fit"
                        >
                            Shipping & Returns
                        </Link>
                        <Link 
                            to="/terms" 
                            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight underline decoration-2 underline-offset-4 hover:opacity-60 transition-opacity w-fit"
                        >
                            Terms & Conditions
                        </Link>
                        <Link 
                            to="/privacy" 
                            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight underline decoration-2 underline-offset-4 hover:opacity-60 transition-opacity w-fit"
                        >
                            Privacy Policy
                        </Link>
                    </div>

                    {/* Center: Vinyl Disc Dot Icon */}
                    <div className="hidden md:flex md:col-span-2 justify-center pt-2">
                        <div className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-black"></div>
                        </div>
                    </div>

                    {/* Right: Newsletter + Gramophone Illustration */}
                    <div className="md:col-span-4 flex flex-col items-start md:items-end justify-between h-full space-y-12">
                        {/* Newsletter Form */}
                        <form onSubmit={handleSubscribe} className="w-full flex items-end justify-between md:justify-end gap-4">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Your Email"
                                required
                                className="flex-1 md:flex-none md:w-56 px-0 py-2 text-sm md:text-base border-b border-black/30 bg-transparent focus:border-black outline-none placeholder:text-black/50 font-light"
                            />
                            <button
                                type="submit"
                                className="font-black text-lg md:text-xl tracking-tighter uppercase border-b-2 border-black pb-1 hover:opacity-60 transition-opacity shrink-0"
                            >
                                {subscribed ? 'THANKS!' : 'SUBSCRIBE'}
                            </button>
                        </form>

                        {/* Gramophone & Dog Illustration */}
                        <div className="pt-4 flex justify-end">
                            <svg className="w-32 h-28 md:w-40 md:h-32 text-black" viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                {/* Gramophone Base */}
                                <rect x="15" y="85" width="55" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="3" />
                                <line x1="15" y1="94" x2="70" y2="94" strokeWidth="2" />
                                <circle cx="30" cy="94" r="2" fill="currentColor" />
                                <circle cx="55" cy="94" r="2" fill="currentColor" />

                                {/* Turntable platter & Record */}
                                <ellipse cx="42.5" cy="83" rx="24" ry="4" fill="currentColor" />
                                <ellipse cx="42.5" cy="83" rx="6" ry="1" fill="#F3F3F3" />
                                
                                {/* Tonearm / Horn Stem */}
                                <path d="M42.5 83 L42.5 70 Q42.5 60 55 55 L70 50" fill="none" strokeWidth="3" />

                                {/* Gramophone Horn */}
                                <path d="M70 50 L95 25 Q105 15 90 40 Q80 55 70 50" fill="none" strokeWidth="3" />
                                <ellipse cx="95" cy="30" rx="14" ry="22" transform="rotate(-30 95 30)" fill="none" strokeWidth="3" />

                                {/* Dog Listening */}
                                <g transform="translate(100, 45)">
                                    {/* Dog Body */}
                                    <path d="M25 60 Q20 35 30 25 Q35 20 40 25 Q45 30 42 45 L45 60 L25 60 Z" fill="none" strokeWidth="3" />
                                    {/* Dog Head & Ear */}
                                    <circle cx="28" cy="18" r="10" fill="none" strokeWidth="3" />
                                    <path d="M20 16 Q14 20 18 28" fill="none" strokeWidth="3" /> {/* Snout */}
                                    <path d="M18 20 L12 22" fill="none" strokeWidth="3" />
                                    <circle cx="16" cy="21" r="1.5" fill="currentColor" /> {/* Nose */}
                                    <circle cx="26" cy="15" r="1.5" fill="currentColor" /> {/* Eye */}
                                    <path d="M33 12 Q38 8 36 18" fill="none" strokeWidth="3" /> {/* Ear */}
                                    {/* Dog Front Paws */}
                                    <path d="M22 45 L20 60 M28 45 L27 60" fill="none" strokeWidth="3" />
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Bottom Legal / Copyright Bar */}
                <div className="border-t border-black/10 pt-8 text-[9px] sm:text-[10px] tracking-widest text-black/50 text-center uppercase font-medium">
                    <p>
                        © 2026 EL CUARTITO. ALL RIGHTS RESERVED | <Link to="/privacy" className="hover:text-black">PRIVACY POLICY</Link> | <Link to="/terms" className="hover:text-black">TERMS & CONDITIONS</Link> | <Link to="/shipping" className="hover:text-black">SHIPPING & RETURNS</Link>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
