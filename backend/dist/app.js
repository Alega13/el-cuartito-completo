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
const health_1 = __importDefault(require("./routes/health"));
const webhookRoutes_1 = require("./routes/webhookRoutes");
const errorHandler_1 = require("./middlewares/errorHandler");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
// Webhook endpoint - must use express.raw to preserve signature
// This must come BEFORE any other body-parser middleware
app.post('/webhook/stripe', express_1.default.raw({ type: 'application/json' }), webhookRoutes_1.stripeWebhookHandler);
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
// Health check endpoint
app.use('/api', health_1.default);
app.get('/', (req, res) => {
    res.send("<h1>El Cuartito API is running 🎵</h1><p>Go to <a href='/records/online'>/records/online</a> to see products.</p>");
});
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
exports.default = app;
