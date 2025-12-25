import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
// Load environment variables from .env file
const result = dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.log("Dotenv result:", result.error ? result.error.message : 'loaded ok');

console.log("Current ENV keys:", Object.keys(process.env).filter(k => k.includes('FIREBASE') || k.includes('STRIPE')));

const getEnvVar = (name: string, defaultValue?: string): string => {
    const value = process.env[name] || defaultValue;
    if (!value) {
        throw new Error(`Environment variable ${name} is missing.`);
    }
    return value;
};
interface Config {
    NODE_ENV: string;
    PORT: number;
    FIREBASE_PROJECT_ID: string;
    FIREBASE_CLIENT_EMAIL: string;
    FIREBASE_PRIVATE_KEY: string;
    STRIPE_SECRET_KEY: string;
    FRONTEND_URL: string;
}

export const config: Config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),

    FIREBASE_PROJECT_ID: getEnvVar('FIREBASE_PROJECT_ID'),
    FIREBASE_CLIENT_EMAIL: getEnvVar('FIREBASE_CLIENT_EMAIL'),
    FIREBASE_PRIVATE_KEY: getEnvVar('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),

    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',

    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

export default config;
