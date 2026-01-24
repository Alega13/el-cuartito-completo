"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const discogsController_1 = require("../controllers/discogsController");
const router = (0, express_1.Router)();
// POST /discogs/sync - Trigger manual inventory sync
router.post('/sync', discogsController_1.syncInventory);
// POST /discogs/sync-orders - Sync orders from Discogs (auto-create sales)
router.post('/sync-orders', discogsController_1.syncOrders);
// GET /discogs/status - Check sync configuration
router.get('/status', discogsController_1.getSyncStatus);
// POST /discogs/create-listing - Create new Discogs listing
router.post('/create-listing', discogsController_1.createListing);
// PUT /discogs/update-listing/:id - Update existing listing
router.put('/update-listing/:id', discogsController_1.updateListing);
// DELETE /discogs/delete-listing/:id - Delete listing
router.delete('/delete-listing/:id', discogsController_1.deleteListing);
// GET /discogs/price-suggestions/:releaseId - Get suggested prices
router.get('/price-suggestions/:releaseId', discogsController_1.getPriceSuggestions);
exports.default = router;
