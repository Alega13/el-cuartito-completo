import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';

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

    const [isSubmitting, setIsSubmitting] = useState(false);

    const isLocal = window.location.hostname === 'localhost';
    const API_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app');

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const targetEmail = email.trim();

        const trySubscribe = async (baseUrl) => {
            const res = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        };

        try {
            try {
                await trySubscribe(API_URL);
            } catch (err) {
                await trySubscribe('https://el-cuartito-shop.up.railway.app');
            }
            setSubscribed(true);
            setEmail('');
            setTimeout(() => setSubscribed(false), 4000);
        } catch (error) {
            console.error('Subscription error:', error);
            alert('Could not subscribe at this time. Please try again.');
        } finally {
            setIsSubmitting(false);
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

                        {/* El Cuartito Logo */}
                        <div className="pt-4 flex justify-end">
                            <img src={logo} alt="El Cuartito" className="h-12 md:h-16 w-auto object-contain" />
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
