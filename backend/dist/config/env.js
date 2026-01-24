"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file
// Load environment variables from .env file
const result = dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const getEnvVar = (name, defaultValue) => {
    const value = process.env[name] || defaultValue;
    if (!value) {
        throw new Error(`Environment variable ${name} is missing.`);
    }
    return value;
};
exports.config = {
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
exports.default = exports.config;
