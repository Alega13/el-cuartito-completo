import { Router, Request, Response } from 'express';
import multer from 'multer';
import admin from '../config/firebaseAdmin';
import { getDb } from '../config/firebaseAdmin';

const router = Router();

// Simple admin key check middleware for file uploads
const checkAdminKey = (req: Request, res: Response, next: Function) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'secret-admin-key-12345') {
        return res.status(401).json({ error: 'Unauthorized: Invalid admin key' });
    }
    next();
};

// Multer setup - store in memory for direct upload to Firebase
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF and PDF are allowed.'));
        }
    }
});

// POST /upload/receipt - Upload a receipt to Firebase Storage
router.post('/receipt', checkAdminKey, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Initialize Firestore (this also initializes Storage)
        getDb();

        // Get the default bucket (uses storageBucket from app config)
        const bucket = admin.storage().bucket();

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
        const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'jpg';

        // Build filename
        const filename = `${year}-${month}-${day}_${proveedor}_${monto}dkk_${uniqueId}.${ext}`;
        const filePath = `receipts/${filename}`;

        // Create file reference
        const file = bucket.file(filePath);

        // Upload buffer to Firebase Storage
        await file.save(req.file.buffer, {
            metadata: {
                contentType: req.file.mimetype,
                metadata: {
                    originalName: req.file.originalname,
                    uploadedAt: new Date().toISOString()
                }
            }
        });

        // Make file publicly readable
        await file.makePublic();

        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        console.log('📁 Receipt uploaded:', filePath);

        res.json({
            success: true,
            url: publicUrl,
            filename: filename,
            path: filePath
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
});

export default router;
