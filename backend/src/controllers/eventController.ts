import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

export const getEvents = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const snapshot = await db.collection('events').orderBy('date', 'asc').get();
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(events);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createEvent = async (req: Request, res: Response) => {
    try {
        const { date, title, description } = req.body;
        const db = getDb();

        const eventData = {
            date: date || new Date().toISOString().split('T')[0],
            title,
            description,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('events').add(eventData);
        res.status(201).json({ id: docRef.id, ...eventData });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        await db.collection('events').doc(id).delete();
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

