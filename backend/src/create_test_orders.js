
const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = admin.firestore();

async function createTestOrders() {
    try {
        console.log('🚀 Creating test orders for alejogalli98@gmail.com...');

        const testOrders = [
            {
                customerEmail: 'alejogalli98@gmail.com',
                customerName: 'Alejo Galli',
                items: [
                    { album: 'Test Album Online Ship', artist: 'Test Artist', quantity: 1, price: 100, recordId: 'TEST_REC_1' }
                ],
                total: 150,
                channel: 'online',
                fulfillment_status: 'preparing', // Online Shipping
                date: new Date().toISOString(),
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                shipping_method: 'shipping',
                shipping_cost: 50,
                customer: {
                    email: 'alejogalli98@gmail.com',
                    firstName: 'Alejo',
                    lastName: 'Galli',
                    address: 'Test Street 123',
                    postalCode: '1234',
                    city: 'Copenhagen',
                    country: 'Denmark'
                }
            }
        ];

        for (const order of testOrders) {
            const res = await db.collection('sales').add(order);
            console.log(`✅ Created Order ID: ${res.id} (${order.fulfillment_status})`);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

createTestOrders();
