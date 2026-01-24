import React from 'react';
import { ArrowLeft, MapPin, Mail, Instagram, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const AboutPage = () => {
    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-6">
            <SEO
                title="About Us"
                description="El Cuartito Records is a record store and creative space based in Copenhagen — a small room built around sound, culture, and connection."
                url="/about"
            />

            <div className="max-w-3xl mx-auto">
                {/* Back Link */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors mb-12"
                >
                    <ArrowLeft size={14} />
                    Back to Store
                </Link>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-12">
                    ABOUT US...
                </h1>

                <div className="space-y-8 text-lg leading-relaxed text-black/80">
                    <p>
                        <strong>El Cuartito Records</strong> is a record store and creative space based in Copenhagen — a small room built around sound, culture, and connection.
                    </p>

                    <p>
                        We curate sounds, gatherings, and experiences that blend underground culture, design, and community. Our aim is simple: to create a room where music feels alive — raw, human, and timeless.
                    </p>

                    <p>
                        More than a store, it's a meeting point — a place to listen, talk, and be part of a community that values the beauty of analog and the ritual of playing vinyl.
                    </p>

                    <p>
                        <em>"El Cuartito"</em> (Spanish for "the little room") reflects what we believe in: intimacy, warmth, and authenticity.
                    </p>

                    <p className="text-xl font-medium text-black">
                        Come by, have a chat, dig through the crates, and be part of the room.
                    </p>
                </div>

                {/* Contact Info */}
                <div className="mt-16 pt-12 border-t border-black/10">
                    <h2 className="text-2xl font-bold uppercase tracking-tight mb-8">Visit Us</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Address */}
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-black rounded-sm flex items-center justify-center flex-shrink-0">
                                <MapPin size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold uppercase tracking-tight mb-1">Location</h3>
                                <p className="text-black/60">
                                    Dybbølsgade 14<br />
                                    1721 København<br />
                                    Denmark
                                </p>
                                <a
                                    href="https://maps.app.goo.gl/48xxSz6pB9ECxpkE8"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-black hover:underline mt-2 inline-block"
                                >
                                    Open in Maps →
                                </a>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-black rounded-sm flex items-center justify-center flex-shrink-0">
                                <Mail size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold uppercase tracking-tight mb-1">Contact</h3>
                                <a
                                    href="mailto:el.cuartito.cph@gmail.com"
                                    className="text-black/60 hover:text-black transition-colors"
                                >
                                    el.cuartito.cph@gmail.com
                                </a>
                                <p className="text-sm text-black/40 mt-2">
                                    We usually respond within 24 hours
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social */}
                <div className="mt-12 pt-8 border-t border-black/10">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Follow Us</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <a
                            href="https://www.instagram.com/el.cuartito.records/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-black hover:opacity-60 transition-opacity"
                        >
                            <Instagram size={20} />
                            <span className="font-medium">@el.cuartito.records</span>
                        </a>
                        <a
                            href="https://www.facebook.com/people/El-Cuartito-Records/61586707180295/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-black hover:opacity-60 transition-opacity"
                        >
                            <Facebook size={20} />
                            <span className="font-medium">El Cuartito Records</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;
