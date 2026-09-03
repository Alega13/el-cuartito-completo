import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext({
    currentUser: null,
    loading: true
});

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2000);

        const unsubscribe = onAuthStateChanged(
            auth, 
            (user) => {
                setCurrentUser(user);
                setLoading(false);
                clearTimeout(timer);
            },
            (err) => {
                console.error("Firebase auth error:", err);
                setLoading(false);
                clearTimeout(timer);
            }
        );

        return () => {
            clearTimeout(timer);
            unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
