"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const recordRoutes_1 = __importDefault(require("./routes/recordRoutes"));
const saleRoutes_1 = __importDefault(require("./routes/saleRoutes"));
const checkoutRoutes_1 = __importDefault(require("./routes/checkoutRoutes"));
const shippingRoutes_1 = __importDefault(require("./routes/shippingRoutes"));
const expenseRoutes_1 = __importDefault(require("./routes/expenseRoutes"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
const consignorRoutes_1 = __importDefault(require("./routes/consignorRoutes"));
const firebaseRecordRoutes_1 = __importDefault(require("./routes/firebaseRecordRoutes"));
const firebaseSaleRoutes_1 = __importDefault(require("./routes/firebaseSaleRoutes"));
const discogsRoutes_1 = __importDefault(require("./routes/discogsRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const invoiceRoutes_1 = __importDefault(require("./routes/invoiceRoutes"));
const health_1 = __importDefault(require("./routes/health"));
const webhookRoutes_1 = require("./routes/webhookRoutes");
const errorHandler_1 = require("./middlewares/errorHandler");
const app = (0, express_1.default)();
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'https://el-cuartito-app.web.app',
    'https://el-cuartito-admin-records.web.app',
    'https://elcuartito.dk'
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
// Webhook endpoint - must use express.raw to preserve signature
// This must come BEFORE any other body-parser middleware
app.post('/api/webhook/stripe', express_1.default.raw({ type: 'application/json' }), webhookRoutes_1.stripeWebhookHandler);
app.use(express_1.default.json());
app.use('/records', recordRoutes_1.default);
app.use('/sales', saleRoutes_1.default);
app.use('/checkout', checkoutRoutes_1.default);
app.use('/shipping', shippingRoutes_1.default);
app.use('/expenses', expenseRoutes_1.default);
app.use('/events', eventRoutes_1.default);
app.use('/consignors', consignorRoutes_1.default);
// Firebase-backed routes
app.use('/firebase/records', firebaseRecordRoutes_1.default);
app.use('/firebase/sales', firebaseSaleRoutes_1.default);
// Discogs integration
app.use('/discogs', discogsRoutes_1.default);
// Upload routes (for receipt uploads via backend proxy)
app.use('/upload', uploadRoutes_1.default);
// Invoice routes (Brugtmoms-compliant PDF invoices)
app.use('/invoices', invoiceRoutes_1.default);
// Health check endpoint
app.use('/api', health_1.default);
app.use('/api', shippingRoutes_1.default); // Added to support /api/ship-order
app.get('/', (req, res) => {
    res.send("<h1>El Cuartito API is running 🎵</h1><p>Go to <a href='/records/online'>/records/online</a> to see products.</p>");
});
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
exports.default = app;
