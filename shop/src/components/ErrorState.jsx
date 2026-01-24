import React from 'react';
import { RefreshCw, WifiOff, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ErrorState Component - Displays a friendly error message when something goes wrong
 * @param {string} title - Main error title
 * @param {string} message - Descriptive error message  
 * @param {function} onRetry - Optional callback for retry button
 * @param {boolean} showHomeLink - Whether to show link back home
 */
const ErrorState = ({
    title = "Something went wrong",
    message = "We're having trouble loading the data. Please try again.",
    onRetry,
    showHomeLink = true,
    icon: Icon = WifiOff
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-6">
                <Icon size={28} className="text-black/30" />
            </div>

            {/* Message */}
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            <p className="text-sm text-black/50 max-w-sm mb-6">{message}</p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center justify-center gap-2 bg-black text-white px-5 py-2.5 rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-black/80 transition-colors"
                    >
                        <RefreshCw size={14} />
                        Try Again
                    </button>
                )}
                {showHomeLink && (
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 border border-black/20 text-black px-5 py-2.5 rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-black/5 transition-colors"
                    >
                        <Home size={14} />
                        Go Home
                    </Link>
                )}
            </div>
        </div>
    );
};

export default ErrorState;
