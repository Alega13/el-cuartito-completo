import React from 'react';
import { ArrowLeft, Package, MapPin, Clock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const ShippingPage = () => {
    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-6">
            <SEO
                title="Shipping & Returns"
                description="Shipping rates, delivery times, and return policy for El Cuartito Records."
                url="/shipping"
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
                    Shipping & Returns
                </h1>

                {/* Quick Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                    <div className="bg-black text-white p-6 rounded-sm">
                        <MapPin size={24} className="mb-3" />
                        <h3 className="font-bold uppercase tracking-tight mb-1">Denmark & EU</h3>
                        <p className="text-sm text-white/60">We ship within Europe</p>
                    </div>
                    <div className="bg-black text-white p-6 rounded-sm">
                        <Clock size={24} className="mb-3" />
                        <h3 className="font-bold uppercase tracking-tight mb-1">1-3 Days</h3>
                        <p className="text-sm text-white/60">Processing time</p>
                    </div>
                    <div className="bg-black text-white p-6 rounded-sm">
                        <Package size={24} className="mb-3" />
                        <h3 className="font-bold uppercase tracking-tight mb-1">Secure</h3>
                        <p className="text-sm text-white/60">Careful packaging</p>
                    </div>
                </div>

                <div className="prose prose-sm max-w-none space-y-8">
                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">Shipping Rates</h2>
                        <div className="bg-white border border-black/10 rounded-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-black/5">
                                    <tr>
                                        <th className="text-left p-4 font-bold uppercase tracking-tight">Destination</th>
                                        <th className="text-left p-4 font-bold uppercase tracking-tight">1-2 Records</th>
                                        <th className="text-left p-4 font-bold uppercase tracking-tight">3+ Records</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    <tr>
                                        <td className="p-4 text-black/70">Denmark</td>
                                        <td className="p-4 text-black/70">DKK 39</td>
                                        <td className="p-4 text-black/70">DKK 49</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 text-black/70">EU Countries</td>
                                        <td className="p-4 text-black/70">DKK 89</td>
                                        <td className="p-4 text-black/70">DKK 119</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm text-black/50 mt-3">
                            * Exact shipping cost will be calculated at checkout based on your location and order size.
                        </p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-4 mt-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Note:</strong> We currently only ship to Denmark and EU countries. For inquiries about other destinations, please contact us.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">Delivery Times</h2>
                        <ul className="space-y-2 text-black/70">
                            <li><strong>Denmark:</strong> 1-3 business days</li>
                            <li><strong>EU:</strong> 5-10 business days</li>
                        </ul>
                        <p className="text-sm text-black/50 mt-3">
                            Delivery times are estimates and may vary due to customs processing.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">Packaging</h2>
                        <p className="text-black/70 leading-relaxed">
                            All records are shipped in sturdy record mailers with additional cardboard stiffeners to prevent bending. For orders of 3+ records, we use specialized vinyl shipping boxes for extra protection.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
                            <RefreshCw size={18} />
                            Returns Policy
                        </h2>
                        <p className="text-black/70 leading-relaxed">
                            We want you to be completely satisfied with your purchase. If something isn't right, here's what you can do:
                        </p>
                        <div className="bg-orange-50 border border-orange-100 rounded-sm p-4 mt-4">
                            <h4 className="font-bold text-orange-900 mb-2">14-Day Return Window</h4>
                            <p className="text-sm text-orange-800">
                                If your record arrives damaged or is significantly different from its described condition, contact us within 14 days of receipt for a full refund or replacement.
                            </p>
                        </div>
                        <ul className="list-disc list-inside text-black/70 space-y-2 mt-4">
                            <li>Contact us with photos of any damage</li>
                            <li>Original packaging should be retained</li>
                            <li>Refunds processed within 5-7 business days</li>
                            <li>Buyer pays return shipping unless item was misrepresented</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold uppercase tracking-tight mb-4">Questions?</h2>
                        <p className="text-black/70 leading-relaxed">
                            Contact us at <strong>el.cuartito.cph@gmail.com</strong> and we'll get back to you within 24 hours.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ShippingPage;

