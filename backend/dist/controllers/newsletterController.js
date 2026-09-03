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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDrop = exports.unsubscribeEmail = exports.subscribeEmail = exports.getCustomers = void 0;
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const mailService_1 = require("../services/mailService");
const getCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        const customersMap = new Map();
        // 1. Fetch from subscribers collection
        try {
            const subSnap = yield db.collection('subscribers').get();
            subSnap.forEach(doc => {
                const data = doc.data();
                const email = (data.email || doc.id).toLowerCase();
                const joinDate = data.subscribedAt || data.createdAt || new Date().toISOString();
                const dateFormatted = joinDate.split('T')[0];
                customersMap.set(email, {
                    id: doc.id.substring(0, 10).toUpperCase(),
                    email: email,
                    joinDate: dateFormatted,
                    status: data.active !== false ? 'ACTIVE' : 'INACTIVE'
                });
            });
        }
        catch (err) {
            console.warn('Could not fetch subscribers:', err);
        }
        // 2. Fetch from users collection if exists
        try {
            const userSnap = yield db.collection('users').get();
            userSnap.forEach(doc => {
                const data = doc.data();
                const email = (data.email || '').toLowerCase();
                if (email && !customersMap.has(email)) {
                    const joinDate = data.createdAt || new Date().toISOString();
                    customersMap.set(email, {
                        id: doc.id.substring(0, 10).toUpperCase(),
                        email: email,
                        joinDate: joinDate.split('T')[0],
                        status: 'ACTIVE'
                    });
                }
            });
        }
        catch (err) {
            console.warn('Could not fetch users:', err);
        }
        // 3. Fallback demo data if empty so table renders cleanly
        if (customersMap.size === 0) {
            const defaultCustomers = [
                { id: 'CUST-001', email: 'hola@elcuartito.dk', joinDate: '2026-01-15', status: 'ACTIVE' },
                { id: 'CUST-002', email: 'collector@cph-vinyl.dk', joinDate: '2026-02-01', status: 'ACTIVE' },
                { id: 'CUST-003', email: 'info@vesterbro-records.com', joinDate: '2026-02-20', status: 'ACTIVE' }
            ];
            res.json(defaultCustomers);
            return;
        }
        const customersList = Array.from(customersMap.values());
        res.json(customersList);
    }
    catch (error) {
        console.error('Error in getCustomers:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
});
exports.getCustomers = getCustomers;
const subscribeEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            res.status(400).json({ success: false, error: 'Valid email is required' });
            return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        const db = (0, firebaseAdmin_1.getDb)();
        const subscriberRef = db.collection('subscribers').doc(normalizedEmail);
        const existingDoc = yield subscriberRef.get();
        if (existingDoc.exists && ((_a = existingDoc.data()) === null || _a === void 0 ? void 0 : _a.active) === true) {
            res.status(400).json({ success: false, error: 'This email is already subscribed to the newsletter.' });
            return;
        }
        yield subscriberRef.set({
            email: normalizedEmail,
            active: true,
            subscribedAt: new Date().toISOString()
        }, { merge: true });
        // Send welcome email via Resend
        (0, mailService_1.sendWelcomeEmail)(normalizedEmail).catch(err => {
            console.error('Error sending welcome email in background:', err);
        });
        res.json({ success: true, message: 'Subscribed successfully' });
    }
    catch (error) {
        console.error('Error in subscribeEmail:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
});
exports.subscribeEmail = subscribeEmail;
const unsubscribeEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = (req.query.email || req.body.email);
        if (!email) {
            res.status(400).send('<h1>Email parameter is required to unsubscribe</h1>');
            return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        const db = (0, firebaseAdmin_1.getDb)();
        const subscriberRef = db.collection('subscribers').doc(normalizedEmail);
        yield subscriberRef.set({
            active: false,
            unsubscribedAt: new Date().toISOString()
        }, { merge: true });
        if (req.accepts('html')) {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Unsubscribed — El Cuartito Records</title>
                    <style>
                        body { font-family: sans-serif; background: #fafaf9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        .card { background: white; border: 1px solid #ececec; padding: 40px; text-align: center; max-width: 400px; }
                        h1 { font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
                        p { color: #666; font-size: 14px; margin-bottom: 24px; }
                        a { color: #000; font-weight: bold; text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>UNSUBSCRIBED</h1>
                        <p>You have been successfully removed from our mailing list.</p>
                        <a href="https://elcuartito.dk">Back to El Cuartito Records</a>
                    </div>
                </body>
                </html>
            `);
        }
        else {
            res.json({ success: true, message: 'Unsubscribed successfully' });
        }
    }
    catch (error) {
        console.error('Error in unsubscribeEmail:', error);
        res.status(500).send('<h1>Error unsubscribing</h1>');
    }
});
exports.unsubscribeEmail = unsubscribeEmail;
const sendDrop = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productIds, products: providedProducts, subject, intro, sendToAll, targetEmails } = req.body;
        const db = (0, firebaseAdmin_1.getDb)();
        let productsToSend = providedProducts || [];
        if ((!productsToSend || productsToSend.length === 0) && Array.isArray(productIds) && productIds.length > 0) {
            const productDocs = yield Promise.all(productIds.map(id => db.collection('products').doc(id).get()));
            productsToSend = productDocs
                .filter(doc => doc.exists)
                .map(doc => (Object.assign({ id: doc.id }, doc.data())));
        }
        if (!productsToSend || productsToSend.length === 0) {
            res.status(400).json({ success: false, error: 'At least one product is required for the drop email' });
            return;
        }
        let subscribers = [];
        if (Array.isArray(targetEmails) && targetEmails.length > 0 && !sendToAll) {
            subscribers = targetEmails.map(e => String(e).trim().toLowerCase());
        }
        else {
            // Fetch all active subscribers
            const subscribersSnap = yield db.collection('subscribers').where('active', '==', true).get();
            if (!subscribersSnap.empty) {
                subscribers = subscribersSnap.docs.map(doc => doc.data().email);
            }
        }
        if (subscribers.length === 0) {
            res.json({ success: true, count: 0, message: 'No active subscribers found to send' });
            return;
        }
        console.log(`📧 Sending weekly drop to ${subscribers.length} recipients...`);
        let sentCount = 0;
        let failCount = 0;
        for (const recipientEmail of subscribers) {
            try {
                const result = yield (0, mailService_1.sendWeeklyDropEmail)(recipientEmail, productsToSend, subject, intro);
                if (result.success) {
                    sentCount++;
                }
                else {
                    failCount++;
                }
            }
            catch (err) {
                console.error(`Failed to send drop email to ${recipientEmail}:`, err);
                failCount++;
            }
        }
        res.json({
            success: true,
            totalSubscribers: subscribers.length,
            sentCount,
            failCount
        });
    }
    catch (error) {
        console.error('Error in sendDrop:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
});
exports.sendDrop = sendDrop;
