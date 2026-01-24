import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-background border-t border-black/10 mt-32">
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                    {/* INDEX */}
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-6">Index</h3>
                        <ul className="space-y-3">
                            <li><Link to="/" className="text-sm hover:opacity-60 transition-opacity">Home</Link></li>
                            <li><Link to="/catalog" className="text-sm hover:opacity-60 transition-opacity">Catalog</Link></li>
                            <li><Link to="/collections" className="text-sm hover:opacity-60 transition-opacity">Collections</Link></li>
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
                    <h2 className="text-6xl md:text-8xl font-bold tracking-tighter">
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
