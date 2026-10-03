"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const firebaseAdmin_1 = __importDefault(require("../config/firebaseAdmin"));
const firebaseAdmin_2 = require("../config/firebaseAdmin");
const router = (0, express_1.Router)();
// Simple admin key check middleware for file uploads
const checkAdminKey = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'secret-admin-key-12345') {
        return res.status(401).json({ error: 'Unauthorized: Invalid admin key' });
    }
    next();
};
// Multer setup - store in memory for direct upload to Firebase
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF and PDF are allowed.'));
        }
    }
});
// POST /upload/receipt - Upload a receipt to Firebase Storage
router.post('/receipt', checkAdminKey, upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Initialize Firestore (this also initializes Storage)
        (0, firebaseAdmin_2.getDb)();
        // Get the default bucket (uses storageBucket from app config)
        const bucket = firebaseAdmin_1.default.storage().bucket();
        // Generate structured filename
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        // Get optional metadata from form
        const proveedor = (req.body.proveedor || 'Proveedor')
            .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 20)
            .trim() || 'Proveedor';
        const monto = Math.round(parseFloat(req.body.monto) || 0);
        // Generate unique ID
        const uniqueId = Math.random().toString(36).substring(2, 7).toUpperCase();
        // Get file extension
        const ext = ((_a = req.file.originalname.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'jpg';
        // Build filename
        const filename = `${year}-${month}-${day}_${proveedor}_${monto}dkk_${uniqueId}.${ext}`;
        const filePath = `receipts/${filename}`;
        // Create file reference
        const file = bucket.file(filePath);
        // Upload buffer to Firebase Storage
        yield file.save(req.file.buffer, {
            metadata: {
                contentType: req.file.mimetype,
                metadata: {
                    originalName: req.file.originalname,
                    uploadedAt: new Date().toISOString()
                }
            }
        });
        // Make file publicly readable
        yield file.makePublic();
        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        console.log('📁 Receipt uploaded:', filePath);
        res.json({
            success: true,
            url: publicUrl,
            filename: filename,
            path: filePath
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
}));
exports.default = router;
