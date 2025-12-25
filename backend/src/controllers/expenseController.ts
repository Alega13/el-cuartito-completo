import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

export const getExpenses = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const snapshot = await db.collection('expenses').orderBy('date', 'desc').get();
        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(expenses);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createExpense = async (req: Request, res: Response) => {
    try {
        const { date, category, description, amount, receiptUrl } = req.body;
        const db = getDb();

        const expenseData = {
            date: date || new Date().toISOString().split('T')[0],
            category,
            description,
            amount: parseFloat(amount),
            receiptUrl,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('expenses').add(expenseData);
        res.status(201).json({ id: docRef.id, ...expenseData });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const db = getDb();

        const updateData = {
            ...data,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        if (data.amount) updateData.amount = parseFloat(data.amount);

        await db.collection('expenses').doc(id).update(updateData);
        res.json({ id, ...updateData });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        await db.collection('expenses').doc(id).delete();
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

