"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const discogsController_1 = require("../controllers/discogsController");
const router = (0, express_1.Router)();
// POST /discogs/sync - Trigger manual sync
router.post('/sync', discogsController_1.syncInventory);
// GET /discogs/status - Check sync configuration
router.get('/status', discogsController_1.getSyncStatus);
// POST /discogs/create-listing - Create new Discogs listing
router.post('/create-listing', discogsController_1.createListing);
// PUT /discogs/update-listing/:id - Update existing listing
router.put('/update-listing/:id', discogsController_1.updateListing);
// DELETE /discogs/delete-listing/:id - Delete listing
router.delete('/delete-listing/:id', discogsController_1.deleteListing);
exports.default = router;
