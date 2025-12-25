#!/bin/bash

# El Cuartito - Project Reorganization Script
# This script reorganizes the project into a clean monorepo structure

set -e  # Exit on error

echo "🎵 El Cuartito - Starting Project Reorganization..."
echo ""

# Navigate to Downloads
cd /Users/alejo/Downloads

# Step 1: Create backup
echo "📦 Step 1/7: Creating backup..."
BACKUP_DIR="el-cuartito-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r el-cuartito-app "$BACKUP_DIR/"
cp -r el-cuartito-shop "$BACKUP_DIR/"
echo "✅ Backup created at: $BACKUP_DIR"
echo ""

# Step 2: Create new project structure
echo "📁 Step 2/7: Creating new project structure..."
mkdir -p el-cuartito
echo "✅ Created el-cuartito/ directory"
echo ""

# Step 3: Move backend
echo "🔧 Step 3/7: Moving backend..."
mv el-cuartito-app el-cuartito/backend
echo "✅ Moved el-cuartito-app → el-cuartito/backend"
echo ""

# Step 4: Move admin
echo "👨‍💼 Step 4/7: Moving admin app..."
mv "el-cuartito-shop/stock-app/el-cuartito-app copy" el-cuartito/admin
echo "✅ Moved admin app → el-cuartito/admin"
echo ""

# Step 5: Move shop
echo "🛒 Step 5/7: Reorganizing shop..."
mkdir -p el-cuartito/shop
# Copy shop source files
cp -r el-cuartito-shop/src/* el-cuartito/shop/
cp el-cuartito-shop/package.json el-cuartito/shop/
cp el-cuartito-shop/vite.config.js el-cuartito/shop/
cp el-cuartito-shop/index.html el-cuartito/shop/
cp el-cuartito-shop/.gitignore el-cuartito/shop/ 2>/dev/null || true
cp el-cuartito-shop/postcss.config.js el-cuartito/shop/ 2>/dev/null || true
cp el-cuartito-shop/eslint.config.js el-cuartito/shop/ 2>/dev/null || true
cp el-cuartito-shop/README.md el-cuartito/shop/ 2>/dev/null || true
echo "✅ Shop files copied → el-cuartito/shop"
echo ""

# Step 6: Clean up old structure
echo "🧹 Step 6/7: Cleaning up old structure..."
rm -rf el-cuartito-shop
echo "✅ Removed old el-cuartito-shop directory"
echo ""

# Step 7: Create root documentation
echo "📝 Step 7/7: Creating root README..."
cat > el-cuartito/README.md << 'EOF'
# El Cuartito Records - Integrated System

Complete vinyl record store management system with admin panel and e-commerce shop.

## 🏗️ Architecture

This is a monorepo containing three main applications:

```
el-cuartito/
├── backend/    # Node.js API (Express + Prisma + SQLite)
├── admin/      # Admin panel (Vanilla JS + Tailwind)
└── shop/       # E-commerce frontend (React + Vite)
```

## 🚀 Quick Start

### 1. Start the Backend API
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3001
```

### 2. Start the Admin Panel
```bash
cd admin
npm install
npm run dev
# Runs on http://localhost:5174
```

### 3. Start the Shop
```bash
cd shop
npm install
npm run dev
# Runs on http://localhost:5173
```

## 📊 Database

The backend uses a single SQLite database managed by Prisma:

```bash
cd backend
npx prisma studio  # Open database GUI
npx prisma migrate dev  # Run migrations
```

## 🔗 How It Works

1. **Backend** serves a REST API for both admin and shop
2. **Admin** manages inventory, sales, expenses, and consignors
3. **Shop** displays available records and handles online checkout

Both frontends connect to the same backend API (`http://localhost:3001`).

## 📚 Documentation

- [Backend API Documentation](./backend/README.md)
- [Admin Panel Guide](./admin/README.md)
- [Shop Documentation](./shop/README.md)

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Prisma, SQLite, Stripe
- **Admin**: Vanilla JavaScript, Tailwind CSS
- **Shop**: React, Vite, Tailwind CSS, Stripe

## 📝 License

Proprietary - El Cuartito Records
EOF

echo "✅ Created root README.md"
echo ""

echo "🎉 Reorganization complete!"
echo ""
echo "📂 New structure:"
echo "   el-cuartito/"
echo "   ├── backend/"
echo "   ├── admin/"
echo "   └── shop/"
echo ""
echo "💾 Backup saved at: $BACKUP_DIR"
echo ""
echo "🚀 Next steps:"
echo "   1. cd el-cuartito/backend && npm run dev"
echo "   2. cd el-cuartito/admin && npm run dev"
echo "   3. cd el-cuartito/shop && npm run dev"
echo ""
