import express from 'express';
import cors from 'cors';
import recordRoutes from './routes/recordRoutes';
import saleRoutes from './routes/saleRoutes';
import checkoutRoutes from './routes/checkoutRoutes';
import shippingRoutes from './routes/shippingRoutes';
import expenseRoutes from './routes/expenseRoutes';
import eventRoutes from './routes/eventRoutes';
import consignorRoutes from './routes/consignorRoutes';
import firebaseRecordRoutes from './routes/firebaseRecordRoutes';
import firebaseSaleRoutes from './routes/firebaseSaleRoutes';
import discogsRoutes from './routes/discogsRoutes';
import healthRoutes from './routes/health';
import { stripeWebhookHandler } from './routes/webhookRoutes';
import { errorHandler } from './middlewares/errorHandler';






const app = express();

app.use(cors());

// Webhook endpoint - must use express.raw to preserve signature
// This must come BEFORE any other body-parser middleware
app.post('/webhook/stripe',
    express.raw({ type: 'application/json' }),
    stripeWebhookHandler
);

app.use(express.json());

app.use('/records', recordRoutes);
app.use('/sales', saleRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/shipping', shippingRoutes);
app.use('/expenses', expenseRoutes);
app.use('/events', eventRoutes);
app.use('/consignors', consignorRoutes);

// Firebase-backed routes
app.use('/firebase/records', firebaseRecordRoutes);
app.use('/firebase/sales', firebaseSaleRoutes);

// Discogs integration
app.use('/discogs', discogsRoutes);


// Health check endpoint
app.use('/api', healthRoutes);
app.use('/api', shippingRoutes); // Added to support /api/ship-order

app.get('/', (req, res) => {
    res.send("<h1>El Cuartito API is running 🎵</h1><p>Go to <a href='/records/online'>/records/online</a> to see products.</p>");
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
