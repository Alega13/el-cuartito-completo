# El Cuartito Admin App

Admin frontend for managing inventory, sales, expenses, and consignors for El Cuartito Records.

## Features

- **Dashboard** - Overview of sales, revenue, stock, and consignor stats
- **Inventory Management** - Add, edit, delete, and search vinyl records
- **Sales Tracking** - Record manual sales and view sales history
- **Expense Management** - Track business expenses with categories
- **Consignor Management** - Manage consignors and track their inventory
- **Calendar** - Event scheduling and management

## Tech Stack

- **Frontend**: Vanilla JavaScript with modular design
- **Styling**: Tailwind CSS
- **Icons**: Phosphor Icons
- **Backend API**: Node.js/Express (see `el-cuartito-app`)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API endpoint:**
   The app connects to the backend API at `http://localhost:3001` by default.
   Update `admin-api.js` if your backend runs on a different port.

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   Open [http://localhost:5174](http://localhost:5174) in your browser.

## Project Structure

```
el-cuartito-app copy/
├── admin-api.js          # API client for backend communication
├── app.js                # Main application logic (4,100+ lines)
├── index.html            # HTML structure and Tailwind setup
├── assets/               # Static assets
└── package.json          # Dependencies
```

## API Integration

This admin app communicates with the backend API for all data operations:

- `GET /records` - Fetch inventory
- `POST /records` - Create new record
- `PATCH /records/:id` - Update record
- `DELETE /records/:id` - Delete record
- `GET /sales` - Fetch sales
- `POST /sales` - Create sale
- `GET /expenses` - Fetch expenses
- `POST /expenses` - Create expense
- `GET /consignors` - Fetch consignors

See backend API documentation for full endpoint details.

## Known Issues & Technical Debt

### Firebase Migration
Some features still use Firebase for data storage and need to be migrated to the new API:
- `resetApp()` - Settings deletion
- `logInventoryMovement()` - Inventory logs
- `openInventoryLogModal()` - Inventory log display
- `deleteSale()` - Sale deletion with stock restoration
- `deleteSelection()` - Batch delete operations

### Code Organization
- ⚠️ **Large monolithic file**: `app.js` is over 4,000 lines and should be refactored into modules
- Consider splitting into:
  - `views/` - Dashboard, Inventory, Sales, etc.
  - `components/` - Modals, Forms, Tables
  - `utils/` - Formatters, Validators, Constants

## Future Improvements

1. **Modularize codebase** - Split app.js into logical modules
2. **Complete Firebase migration** - Move remaining features to API
3. **Add TypeScript** - Type safety for better maintainability
4. **Unit tests** - Add testing for critical business logic
5. **Error boundaries** - Better error handling and user feedback
6. **Offline support** - Service worker for offline functionality

## Contributing

When making changes:
1. Test all critical flows (add/edit/delete inventory, sales, expenses)
2. Verify error messages are descriptive
3. Check mobile responsiveness
4. Ensure no console errors

## License

Proprietary - El Cuartito Records
