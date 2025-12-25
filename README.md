# El Cuartito Records - Integrated System

Complete vinyl record store management system with admin panel and e-commerce shop.

## 🏗️ Architecture

This is a monorepo containing three main applications:

```
 el-cuartito/
 ├── backend/    # Node.js API (Express + Firebase Admin)
 ├── admin/      # Admin panel (Vanilla JS + Tailwind + Firebase Auth)
 └── shop/       # E-commerce frontend (React + Vite + Firebase)
 ```
 
 ## 🚀 Quick Start
@@ -42,12 +42,9 @@ Both frontends connect to the same backend API (`http://localhost:3001`).
 
 ## 📊 Database
 
-The backend uses a single SQLite database managed by Prisma:
-
-```bash
-cd backend
-npx prisma studio  # Open database GUI
-npx prisma migrate dev  # Run migrations
-```
+The system uses Cloud Firestore as the single source of truth.
+- **Host**: Firebase
+- **SDK**: Firebase Admin (Backend), Firebase JS SDK (Frontend)
+- **Auth**: Firebase Authentication (Admin panel access control)
 
 ## 🔗 How It Works
@@ -66,7 +63,7 @@ Both frontends connect to the same backend API (`http://localhost:3001`).
 ## 🛠️ Tech Stack
 
-- **Backend**: Node.js, Express, Prisma, SQLite, Stripe
+- **Backend**: Node.js, Express, Firebase Admin, Stripe
 - **Admin**: Vanilla JavaScript, Tailwind CSS, Firebase Auth
 - **Shop**: React, Vite, Tailwind CSS, Stripe


## 📝 License

Proprietary - El Cuartito Records
