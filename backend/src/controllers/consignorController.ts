import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

export const getConsignors = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const snapshot = await db.collection('consignors').get();
        const consignors = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                agreementSplit: (data.percentage || 0) * 100
            };
        });
        res.json(consignors);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createConsignor = async (req: Request, res: Response) => {
    try {
        const { name, agreementSplit, email, phone } = req.body;
        const db = getDb();

        const consignorData = {
            name,
            percentage: (agreementSplit || 0) / 100,
            email,
            phone,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('consignors').add(consignorData);
        res.status(201).json({
            id: docRef.id,
            ...consignorData,
            agreementSplit: (consignorData.percentage || 0) * 100
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteConsignor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        await db.collection('consignors').doc(id).delete();
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

