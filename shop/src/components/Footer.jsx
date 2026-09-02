import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Footer = () => {
    const navigate = useNavigate();
    const location = useLocation();

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

    return (
        <footer className="bg-background border-t border-black/10 mt-32">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 mb-12 md:mb-16">
                    {/* INDEX */}
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-6">Index</h3>
                        <ul className="space-y-3">
                            <li><Link to="/" className="text-sm hover:opacity-60 transition-opacity">Home</Link></li>
                            <li>
                                <a href="#catalogue" onClick={handleScrollToCatalog} className="text-sm hover:opacity-60 transition-opacity cursor-pointer">
                                    Catalog
                                </a>
                            </li>
                            <li><Link to="/about" className="text-sm hover:opacity-60 transition-opacity">About</Link></li>
                        </ul>
                    </div>

                    {/* LEGAL */}
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-6">Information</h3>
                        <ul className="space-y-3">
                            <li><Link to="/shipping" className="text-sm hover:opacity-60 transition-opacity">Shipping & Returns</Link></li>
                            <li><Link to="/terms" className="text-sm hover:opacity-60 transition-opacity">Terms & Conditions</Link></li>
                            <li><Link to="/privacy" className="text-sm hover:opacity-60 transition-opacity">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* NEWSLETTER */}
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-6">Newsletter</h3>
                        <form className="flex flex-col gap-3">
                            <input
                                type="email"
                                placeholder="Email Address"
                                className="px-4 py-2 text-sm border-b border-black/20 bg-transparent focus:border-black outline-none placeholder:text-black/40"
                            />
                            <button
                                type="submit"
                                className="text-xs font-bold uppercase tracking-wider text-right hover:opacity-60 transition-opacity"
                            >
                                Submit
                            </button>
                        </form>
                    </div>
                </div>

                {/* Large Brand Name */}
                <div className="flex items-end justify-between border-t border-black/10 pt-8">
                    <h2 className="text-4xl md:text-8xl font-bold tracking-tighter">
                        EL CUARTITO
                    </h2>
                    <div className="text-xs text-black/40 text-right">
                        <p>© 2026</p>
                        <p>ALL RIGHTS RESERVED</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
