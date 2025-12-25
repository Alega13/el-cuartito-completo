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
import { stripeWebhookHandler } from './routes/webhookRoutes';
import { errorHandler } from './middlewares/errorHandler';






const app = express();

// Webhook endpoint - save raw body before parsing
app.post('/webhook/stripe',
    express.json({
        verify: (req: any, res, buf) => {
            req.rawBody = buf.toString('utf8');
        }
    }),
    stripeWebhookHandler
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
