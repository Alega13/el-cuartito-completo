import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const PrivacyPage = () => {
    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-6">
            <SEO
                title="Privacy Policy"
                description="How El Cuartito Records collects, uses, and protects your personal information."
                url="/privacy"
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

                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-8">
                    Privacy Policy
                </h1>

                <p className="text-sm text-black/40 mb-12">Last updated: January 2026</p>

                <div className="prose prose-sm max-w-none space-y-8">
                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">1. Information We Collect</h2>
                        <p className="text-black/70 leading-relaxed">
                            When you browse our website, we collect minimal data to improve your experience. When you make a purchase through Discogs, the following information is collected:
                        </p>
                        <ul className="list-disc list-inside text-black/70 space-y-2 mt-3">
                            <li>Name and contact information</li>
                            <li>Shipping address</li>
                            <li>Email address</li>
                            <li>Order history</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">2. How We Use Your Information</h2>
                        <p className="text-black/70 leading-relaxed">
                            Your information is used solely for:
                        </p>
                        <ul className="list-disc list-inside text-black/70 space-y-2 mt-3">
                            <li>Processing and shipping your orders</li>
                            <li>Communicating about your order status</li>
                            <li>Providing customer support</li>
                            <li>Improving our website and services</li>
                        </ul>
                        <p className="text-black/70 leading-relaxed mt-3">
                            We never sell, rent, or share your personal information with third parties for marketing purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">3. Cookies</h2>
                        <p className="text-black/70 leading-relaxed">
                            Our website uses essential cookies to remember your preferences (like cart contents) and provide a better browsing experience. We do not use tracking cookies for advertising purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">4. Data Security</h2>
                        <p className="text-black/70 leading-relaxed">
                            We take appropriate measures to protect your personal information. All payment transactions are processed securely through Discogs/PayPal and we never store credit card information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">5. Your Rights (GDPR)</h2>
                        <p className="text-black/70 leading-relaxed">
                            Under GDPR, you have the right to:
                        </p>
                        <ul className="list-disc list-inside text-black/70 space-y-2 mt-3">
                            <li>Access your personal data</li>
                            <li>Request correction of inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Object to processing of your data</li>
                            <li>Data portability</li>
                        </ul>
                        <p className="text-black/70 leading-relaxed mt-3">
                            To exercise any of these rights, please contact us at el.cuartito.cph@gmail.com
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">6. Contact</h2>
                        <p className="text-black/70 leading-relaxed">
                            For privacy-related inquiries, contact us at:
                        </p>
                        <p className="text-black/70 mt-3">
                            <strong>Email:</strong> el.cuartito.cph@gmail.com<br />
                            <strong>Location:</strong> Copenhagen, Denmark
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;
