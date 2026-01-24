import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, Disc3 } from 'lucide-react';
import SEO from '../components/SEO';

const NotFoundPage = () => {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
            <SEO
                title="Page Not Found"
                description="The page you're looking for doesn't exist."
                noIndex={true}
            />

            <div className="text-center max-w-md">
                {/* Vinyl Animation */}
                <div className="relative w-32 h-32 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full bg-black animate-spin" style={{ animationDuration: '3s' }}>
                        {/* Grooves */}
                        <div className="absolute inset-2 rounded-full border border-white/10" />
                        <div className="absolute inset-4 rounded-full border border-white/10" />
                        <div className="absolute inset-6 rounded-full border border-white/10" />
                        <div className="absolute inset-8 rounded-full border border-white/10" />
                        {/* Center Label */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                                <span className="text-2xl font-bold text-black">?</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                <h1 className="text-6xl font-bold tracking-tighter mb-2">404</h1>
                <p className="text-xl font-medium text-black/60 mb-2">Record Not Found</p>
                <p className="text-sm text-black/40 mb-8">
                    Looks like this track got lost in the crates. Let's get you back on beat.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-black/80 transition-colors"
                    >
                        <Home size={16} />
                        Back Home
                    </Link>
                    <Link
                        to="/catalog"
                        className="inline-flex items-center justify-center gap-2 border-2 border-black text-black px-6 py-3 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                    >
                        <Search size={16} />
                        Browse Catalog
                    </Link>
                </div>

                {/* Listening Room Link */}
                <div className="mt-8 pt-8 border-t border-black/10">
                    <Link
                        to="/listening"
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors"
                    >
                        <Disc3 size={14} className="animate-spin" style={{ animationDuration: '2s' }} />
                        Or discover something new in the Listening Room
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
