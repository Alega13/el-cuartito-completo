import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../config/firebase';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        setLoading(true);

        try {
            if (isRegistering) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                setSuccessMsg(`Account created successfully for ${userCredential.user.email}!`);
                setTimeout(() => navigate('/'), 1200);
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                setSuccessMsg(`Welcome back, ${userCredential.user.email}!`);
                setTimeout(() => navigate('/'), 1000);
            }
        } catch (err) {
            console.error("Authentication error:", err);
            let friendlyMsg = err.message;
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                friendlyMsg = 'Invalid email or password credentials.';
            } else if (err.code === 'auth/email-already-in-use') {
                friendlyMsg = 'An account with this email already exists.';
            } else if (err.code === 'auth/weak-password') {
                friendlyMsg = 'Password should be at least 6 characters.';
            }
            setError(friendlyMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#F3F3F3] text-black flex flex-col justify-center items-center px-4 py-20">
            <div className="w-full max-w-md bg-transparent border-2 border-black p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {/* Header */}
                <div className="border-b-2 border-black pb-4 mb-8 text-left">
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
                        {isRegistering ? 'REGISTER' : 'LOGIN'}
                    </h1>
                    <p className="text-xs font-bold uppercase tracking-widest text-black/60 mt-1 font-mono">
                        {isRegistering ? 'Create your El Cuartito account' : 'Access your account'}
                    </p>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="mb-6 p-4 border border-black bg-red-500/10 text-red-700 text-xs font-bold uppercase tracking-wider rounded-none">
                        ⚠️ {error}
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 p-4 border border-black bg-green-500/10 text-green-800 text-xs font-bold uppercase tracking-wider rounded-none">
                        ✓ {successMsg}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col text-left">
                        <label className="text-xs font-black uppercase tracking-widest text-black mb-2">
                            EMAIL ADDRESS
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="w-full border border-black rounded-none p-4 text-sm font-bold uppercase tracking-wider text-black bg-transparent outline-none focus:bg-white transition-colors placeholder:text-black/30"
                        />
                    </div>

                    <div className="flex flex-col text-left">
                        <label className="text-xs font-black uppercase tracking-widest text-black mb-2">
                            PASSWORD
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full border border-black rounded-none p-4 text-sm font-bold tracking-wider text-black bg-transparent outline-none focus:bg-white transition-colors placeholder:text-black/30"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full border-2 border-black bg-black text-white font-black uppercase tracking-widest text-sm p-4 rounded-none hover:bg-white hover:text-black transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                    >
                        {loading ? 'PROCESSING...' : (isRegistering ? 'CREATE ACCOUNT' : 'SIGN IN')}
                    </button>
                </form>

                {/* Toggle Register / Login */}
                <div className="mt-8 pt-6 border-t border-black/20 flex flex-col items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                            setSuccessMsg('');
                        }}
                        className="text-xs font-black uppercase tracking-widest text-black hover:underline cursor-pointer"
                    >
                        {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register here'}
                    </button>

                    <Link
                        to="/"
                        className="text-[11px] font-bold uppercase tracking-widest text-black/50 hover:text-black transition-colors mt-2"
                    >
                        ← Return to catalog
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
