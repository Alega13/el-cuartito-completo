import React, { useState } from 'react';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../config/firebase';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [resetSending, setResetSending] = useState(false);

    const navigate = useNavigate();

    const handleGoogleAuth = async () => {
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            setSuccessMsg(`Welcome ${result.user.displayName || result.user.email}!`);
            setTimeout(() => navigate('/'), 800);
        } catch (err) {
            console.error("Google Auth error:", err);
            setError(err.message || "Failed to sign in with Google.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setError('');
        setSuccessMsg('');
        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address first to reset your password.');
            return;
        }

        setResetSending(true);
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setSuccessMsg(`✓ Password reset email sent to ${email.trim()}! Check your inbox.`);
        } catch (err) {
            console.error("Reset password error:", err);
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email address.');
            } else {
                setError(err.message || 'Could not send reset email.');
            }
        } finally {
            setResetSending(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        const targetEmail = email.trim().toLowerCase();
        const targetPassword = password;

        if (!targetEmail || !targetPassword) {
            setError('Please enter both email and password.');
            return;
        }

        if (targetPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);

        try {
            if (isRegistering) {
                // Mode: REGISTER
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, targetPassword);
                    setSuccessMsg(`✓ Account created successfully for ${userCredential.user.email}!`);
                    setTimeout(() => navigate('/'), 1000);
                } catch (regErr) {
                    if (regErr.code === 'auth/email-already-in-use') {
                        // Attempt auto sign in
                        try {
                            const userCred = await signInWithEmailAndPassword(auth, targetEmail, targetPassword);
                            setSuccessMsg(`✓ Account already existed. Signed in as ${userCred.user.email}!`);
                            setTimeout(() => navigate('/'), 1000);
                        } catch (loginErr) {
                            setIsRegistering(false);
                            setError('An account with this email already exists. Please enter your password to sign in, or click "Reset Password" below.');
                        }
                    } else if (regErr.code === 'auth/weak-password') {
                        setError('Password should be at least 6 characters.');
                    } else {
                        setError(regErr.message);
                    }
                }
            } else {
                // Mode: SIGN IN
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, targetEmail, targetPassword);
                    setSuccessMsg(`✓ Welcome back, ${userCredential.user.email}!`);
                    setTimeout(() => navigate('/'), 800);
                } catch (loginErr) {
                    if (loginErr.code === 'auth/user-not-found') {
                        // Attempt auto create
                        try {
                            const userCred = await createUserWithEmailAndPassword(auth, targetEmail, targetPassword);
                            setSuccessMsg(`✓ Account created and signed in as ${userCred.user.email}!`);
                            setTimeout(() => navigate('/'), 1000);
                        } catch (regErr) {
                            setError(regErr.message);
                        }
                    } else if (loginErr.code === 'auth/invalid-credential' || loginErr.code === 'auth/wrong-password') {
                        setError('Incorrect password for this email address. If you forgot it, click "Reset Password" below.');
                    } else if (loginErr.code === 'auth/too-many-requests') {
                        setError('Too many failed login attempts. Please wait a few minutes or click "Reset Password".');
                    } else {
                        setError(loginErr.message);
                    }
                }
            }
        } catch (err) {
            console.error("Authentication error:", err);
            setError(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#F3F3F3] text-black flex flex-col justify-center items-center px-4 py-20">
            <div className="w-full max-w-md bg-transparent border-2 border-black p-8 md:p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                
                {/* Header */}
                <div className="border-b-2 border-black pb-4 mb-6 text-left">
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
                        {isRegistering ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
                    </h1>
                    <p className="text-xs font-bold uppercase tracking-widest text-black/60 mt-1 font-mono">
                        {isRegistering ? 'Register to start collecting' : 'Sign in to access your wishlist & orders'}
                    </p>
                </div>

                {/* Segmented Control Tabs */}
                <div className="flex border-2 border-black mb-6 rounded-none">
                    <button
                        type="button"
                        onClick={() => { setIsRegistering(false); setError(''); setSuccessMsg(''); }}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors rounded-none ${!isRegistering ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'}`}
                    >
                        SIGN IN
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsRegistering(true); setError(''); setSuccessMsg(''); }}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors rounded-none ${isRegistering ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'}`}
                    >
                        REGISTER
                    </button>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="mb-6 p-4 border border-black bg-red-500/10 text-red-800 text-xs font-bold uppercase tracking-wider rounded-none text-left">
                        ⚠️ {error}
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 p-4 border border-black bg-green-500/10 text-green-900 text-xs font-bold uppercase tracking-wider rounded-none text-left">
                        {successMsg}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
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
                            className="w-full border border-black rounded-none p-3.5 text-sm font-bold uppercase tracking-wider text-black bg-transparent outline-none focus:bg-white transition-colors placeholder:text-black/30"
                        />
                    </div>

                    <div className="flex flex-col text-left">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black">
                                PASSWORD
                            </label>
                            {!isRegistering && (
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    disabled={resetSending}
                                    className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/60 hover:text-black underline cursor-pointer"
                                >
                                    {resetSending ? 'Sending...' : 'Reset Password?'}
                                </button>
                            )}
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full border border-black rounded-none p-3.5 text-sm font-bold tracking-wider text-black bg-transparent outline-none focus:bg-white transition-colors placeholder:text-black/30"
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

                {/* Google Sign-in Divider & Button */}
                <div className="my-6 flex items-center justify-between gap-3">
                    <div className="h-px bg-black/20 flex-1"></div>
                    <span className="text-[10px] font-mono font-bold uppercase text-black/40">OR</span>
                    <div className="h-px bg-black/20 flex-1"></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="w-full border-2 border-black bg-white text-black font-black uppercase tracking-wider text-xs p-3.5 rounded-none hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
                    </svg>
                    <span>Continue with Google</span>
                </button>

                {/* Return link */}
                <div className="mt-8 pt-4 border-t border-black/20 flex justify-center">
                    <Link
                        to="/"
                        className="text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 hover:text-black transition-colors"
                    >
                        ← Return to shop
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
