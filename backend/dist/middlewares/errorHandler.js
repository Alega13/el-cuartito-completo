"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json(Object.assign({ error: message }, (process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details
    })));
};
exports.errorHandler = errorHandler;
