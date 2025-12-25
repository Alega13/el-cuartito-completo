# El Cuartito Backend API

Node.js/Express backend for El Cuartito Disqueria with Firebase/Firestore integration.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore enabled
- Firebase Admin SDK credentials

### Installation

```bash
# Install dependencies
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Firebase credentials

# Start development server with PM2
npm run dev
```

### PM2 Commands

```bash
npm run dev       # Start backend with PM2
npm run stop      # Stop backend
npm run restart   # Restart backend
npm run logs      # View logs (last 100 lines)
npm run status    # Check PM2 status
npm run monit     # Real-time monitoring dashboard
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Firebase, environment config
│   ├── controllers/     # Business logic
│   ├── middlewares/     # Auth, error handling
│   ├── routes/          # API endpoints
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── logs/                # PM2 logs (git-ignored)
├── ecosystem.config.js  # PM2 configuration
├── .env                 # Environment variables (git-ignored)
└── .env.example         # Environment template
```

## 🔧 Environment Variables

Create `.env` file from `.env.example`:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Stripe (optional, for online payments only)
STRIPE_SECRET_KEY=sk_test_...

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173
```

## 🏥 Health Check

```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-25T10:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

## 📡 API Endpoints

### Products
- `GET /records` - Get all products (admin)
- `GET /records/online` - Get online-available products (public)
- `POST /records` - Create product (admin, requires auth)
- `PUT /records/:id` - Update product (admin, requires auth)
- `DELETE /records/:id` - Delete product (admin, requires auth)

### Sales
- `GET /sales` - Get all sales (admin, requires auth)
- `POST /sales` - Create sale (admin, requires auth)

### Checkout
- `POST /checkout/create-session` - Create Stripe checkout (public)
- `POST /checkout/webhook` - Stripe webhook handler (public)

### Other
- `GET /expenses` - Expenses management (admin)
- `GET /events` - Events management (admin)
- `GET /consignors` - Consignors management (admin)

## 🔐 Authentication

Admin endpoints require Firebase ID token in `Authorization` header:

```bash
curl -H "Authorization: Bearer <firebase-id-token>" \
  http://localhost:3001/records
```

## 🚢 Deployment

### Option 1: Railway (Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and initialize
railway login
railway init

# Set environment variables in Railway dashboard
# Then deploy
railway up
```

### Option 2: Render

1. Connect GitHub repository
2. Create new "Web Service"
3. Build Command: `npm run build`
4. Start Command: `npm start`
5. Add environment variables in dashboard

### Option 3: Google Cloud Run

```bash
# Build production
npm run build

# Or use Docker (see Dockerfile)
docker build -t el-cuartito-api .
gcloud builds submit --tag gcr.io/PROJECT_ID/el-cuartito-api
gcloud run deploy --image gcr.io/PROJECT_ID/el-cuartito-api
```

## 🛠️ Development

### Watch mode with auto-reload
PM2 is configured to watch `src/` directory and auto-restart on file changes.

### View logs
```bash
# Tail logs in real-time
npm run logs

# Or directly
pm2 logs el-cuartito-api

# Check error logs only
cat logs/err.log
```

### Debugging crashes
If the server crashes frequently:
1. Check `logs/err.log` for stack traces
2. PM2 will auto-restart (up to 10 times)
3. Use `npm run monit` for real-time monitoring

## 📝 Notes

- PM2 runs as daemon in background
- `Ctrl+C` won't stop the server - use `npm run stop`
- Logs are written to `logs/` directory
- Firebase credentials must use actual newlines (`\n`), not escaped strings
- First request may be slow due to Firebase initialization

## 🐛 Troubleshooting

**Backend won't start:**
- Check `.env` file exists and has correct values
- Verify Firebase credentials are valid
- Check port 3001 isn't already in use: `lsof -i :3001`

**Can't stop backend:**
- Use `npm run stop` instead of Ctrl+C
- Or: `pm2 delete el-cuartito-api`

**Health check fails:**
- Ensure Firestore is accessible
- Check network/firewall settings
- Verify Firebase Admin SDK permissions
