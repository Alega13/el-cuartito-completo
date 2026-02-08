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
import uploadRoutes from './routes/uploadRoutes';
import healthRoutes from './routes/health';
import { stripeWebhookHandler } from './routes/webhookRoutes';
import { errorHandler } from './middlewares/errorHandler';






const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'https://el-cuartito-app.web.app',
    'https://el-cuartito-admin-records.web.app',
    'https://elcuartito.dk'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Webhook endpoint - must use express.raw to preserve signature
// This must come BEFORE any other body-parser middleware
app.post('/api/webhook/stripe',
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

// Upload routes (for receipt uploads via backend proxy)
app.use('/upload', uploadRoutes);


// Health check endpoint
app.use('/api', healthRoutes);
app.use('/api', shippingRoutes); // Added to support /api/ship-order

app.get('/', (req, res) => {
    res.send("<h1>El Cuartito API is running 🎵</h1><p>Go to <a href='/records/online'>/records/online</a> to see products.</p>");
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
