import express from 'express';
import cors from 'cors';
import recordRoutes from './routes/recordRoutes';
import saleRoutes from './routes/saleRoutes';
import checkoutRoutes from './routes/checkoutRoutes';
import expenseRoutes from './routes/expenseRoutes';
import eventRoutes from './routes/eventRoutes';
import consignorRoutes from './routes/consignorRoutes';
import firebaseRecordRoutes from './routes/firebaseRecordRoutes';
import firebaseSaleRoutes from './routes/firebaseSaleRoutes';
import healthRoutes from './routes/health';
import webhookRoutes from './routes/webhookRoutes';
import { errorHandler } from './middlewares/errorHandler';






const app = express();

// Webhook endpoint - MUST be before express.json() to get raw body
app.post('/webhook/stripe',
    express.raw({ type: 'application/json' }),
    require('./routes/webhookRoutes').stripeWebhookHandler
);

app.use(cors());
app.use(express.json());

app.use('/records', recordRoutes);
app.use('/sales', saleRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/expenses', expenseRoutes);
app.use('/events', eventRoutes);
app.use('/consignors', consignorRoutes);

// Firebase-backed routes
app.use('/firebase/records', firebaseRecordRoutes);
app.use('/firebase/sales', firebaseSaleRoutes);


// Health check endpoint
app.use('/api', healthRoutes);

app.get('/', (req, res) => {
    res.send("<h1>El Cuartito API is running 🎵</h1><p>Go to <a href='/records/online'>/records/online</a> to see products.</p>");
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
