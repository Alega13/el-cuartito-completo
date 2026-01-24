import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
// Load environment variables from .env file
const result = dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    STRIPE_WEBHOOK_SECRET: string;
    FRONTEND_URL: string;
    RESEND_API_KEY: string;
    SHIPMONDO_API_USER: string;
    SHIPMONDO_API_KEY: string;
    SHIPMONDO_SANDBOX: boolean;
}

export const config: Config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),

    FIREBASE_PROJECT_ID: getEnvVar('FIREBASE_PROJECT_ID'),
    FIREBASE_CLIENT_EMAIL: getEnvVar('FIREBASE_CLIENT_EMAIL'),
    FIREBASE_PRIVATE_KEY: getEnvVar('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),

    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    RESEND_API_KEY: process.env.RESEND_API_KEY || 're_placeholder',
    SHIPMONDO_API_USER: getEnvVar('SHIPMONDO_API_USER'),
    SHIPMONDO_API_KEY: getEnvVar('SHIPMONDO_API_KEY'),
    SHIPMONDO_SANDBOX: process.env.SHIPMONDO_SANDBOX === 'true',
};

export default config;
