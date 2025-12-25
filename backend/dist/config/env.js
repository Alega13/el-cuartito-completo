"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
/**
 * Validates that all required environment variables are present
 */
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
    STRIPE_SECRET_KEY: getEnvVar('STRIPE_SECRET_KEY'),
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
exports.default = exports.config;
