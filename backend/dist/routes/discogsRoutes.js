"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const discogsController_1 = require("../controllers/discogsController");
const router = (0, express_1.Router)();
// PUBLIC ENDPOINTS (no auth needed - for shop frontend)
// GET /discogs/search?q=artist+album - Search for a release (proxy to avoid CORS)
router.get('/search', discogsController_1.searchRelease);
// GET /discogs/tracklist/:id - Get tracklist for a release (proxy to avoid CORS)
router.get('/tracklist/:id', discogsController_1.getTracklist);
// PROTECTED ENDPOINTS (for admin panel)
// POST /discogs/sync - Trigger manual inventory sync
router.post('/sync', discogsController_1.syncInventory);
// POST /discogs/bulk-import - Bulk import from CSV string
router.post('/bulk-import', discogsController_1.bulkImport);
// POST /discogs/refresh-metadata/:id - Refresh metadata for a specific product
router.post('/refresh-metadata/:id', discogsController_1.refreshMetadata);
// POST /discogs/sync-orders - Sync orders from Discogs (auto-create sales)
router.post('/sync-orders', discogsController_1.syncOrders);
// GET /discogs/status - Check sync configuration
router.get('/status', discogsController_1.getSyncStatus);
// GET /discogs/release/:id - Get specific release
router.get('/release/:id', discogsController_1.getReleaseById);
// GET /discogs/listing/:id - Get specific listing
router.get('/listing/:id', discogsController_1.getListingById);
// POST /discogs/create-listing - Create new Discogs listing
router.post('/create-listing', discogsController_1.createListing);
// PUT /discogs/update-listing/:id - Update existing listing
router.put('/update-listing/:id', discogsController_1.updateListing);
// DELETE /discogs/delete-listing/:id - Delete listing
router.delete('/delete-listing/:id', discogsController_1.deleteListing);
// GET /discogs/price-suggestions/:releaseId - Get suggested prices
router.get('/price-suggestions/:releaseId', discogsController_1.getPriceSuggestions);
exports.default = router;
