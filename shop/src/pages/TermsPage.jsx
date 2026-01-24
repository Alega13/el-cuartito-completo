import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const TermsPage = () => {
    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-6">
            <SEO
                title="Terms & Conditions"
                description="Terms and conditions for using El Cuartito Records online store."
                url="/terms"
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
                    Terms & Conditions
                </h1>

                <p className="text-sm text-black/40 mb-12">Last updated: January 2026</p>

                <div className="prose prose-sm max-w-none space-y-8">
                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">1. General Information</h2>
                        <p className="text-black/70 leading-relaxed">
                            These terms and conditions govern your use of the El Cuartito Records website and the purchase of vinyl records from our store. By accessing our website and placing an order, you agree to be bound by these terms.
                        </p>
                        <p className="text-black/70 leading-relaxed mt-3">
                            El Cuartito Records is operated from Copenhagen, Denmark. All prices are displayed in Danish Kroner (DKK) and include applicable VAT for EU customers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">2. Product Information</h2>
                        <p className="text-black/70 leading-relaxed">
                            All vinyl records are second-hand/used items unless otherwise stated. We grade all records according to the Goldmine grading standard. Product photos are representative; the actual item may have minor variations.
                        </p>
                        <ul className="list-disc list-inside text-black/70 space-y-2 mt-3">
                            <li><strong>Mint (M):</strong> Perfect, unplayed condition</li>
                            <li><strong>Near Mint (NM):</strong> Nearly perfect with minimal signs of handling</li>
                            <li><strong>Very Good Plus (VG+):</strong> Shows some wear but plays without issues</li>
                            <li><strong>Very Good (VG):</strong> Noticeable wear affecting playback minimally</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">3. Orders & Payment</h2>
                        <p className="text-black/70 leading-relaxed">
                            Orders are processed through our secure Discogs shop. Payment is handled securely via PayPal or credit card through Discogs' payment system. All transactions are encrypted and secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">4. Shipping</h2>
                        <p className="text-black/70 leading-relaxed">
                            We ship worldwide from Copenhagen, Denmark. Shipping costs are calculated based on destination and package weight. All records are carefully packed to ensure safe delivery. Please see our <Link to="/shipping" className="text-black font-medium hover:underline">Shipping Policy</Link> for detailed information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">5. Returns & Refunds</h2>
                        <p className="text-black/70 leading-relaxed">
                            If a record arrives damaged or significantly differs from its described condition, please contact us within 14 days of receipt. We will arrange a return or refund. The buyer is responsible for return shipping costs unless the item was incorrectly described.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">6. Contact</h2>
                        <p className="text-black/70 leading-relaxed">
                            For questions regarding these terms or your order, please contact us at:
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

export default TermsPage;
