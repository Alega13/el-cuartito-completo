"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTracklist = exports.searchRelease = exports.getListingById = exports.refreshMetadata = exports.bulkImport = exports.getReleaseById = exports.getPriceSuggestions = exports.deleteListing = exports.updateListing = exports.createListing = exports.syncOrders = exports.getSyncStatus = exports.syncInventory = void 0;
const discogsService_1 = require("../services/discogsService");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const admin = __importStar(require("firebase-admin"));
const invoiceService_1 = require("../services/invoiceService");
/**
 * Sync inventory from Discogs to Firebase
 */
const syncInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured. Please set DISCOGS_USERNAME and DISCOGS_TOKEN in .env'
            });
        }
        console.log(`Starting Discogs sync for user: ${username}`);
        const discogsService = new discogsService_1.DiscogsService(username, token);
        const products = yield discogsService.fetchInventory();
        console.log(`Normalized ${products.length} products from Discogs`);
        const db = (0, firebaseAdmin_1.getDb)();
        const result = {
            success: true,
            synced: 0,
            created: 0,
            updated: 0,
            salesDetected: 0,
            errors: [],
            message: ''
        };
        // Process each product
        for (const product of products) {
            try {
                // First, try to find by discogs_listing_id (most reliable)
                let existingQuery = yield db.collection('products')
                    .where('discogs_listing_id', '==', product.discogs_listing_id)
                    .limit(1)
                    .get();
                // If not found by listing_id, try by SKU (for backwards compatibility)
                if (existingQuery.empty) {
                    existingQuery = yield db.collection('products')
                        .where('sku', '==', product.sku)
                        .limit(1)
                        .get();
                }
                // Remove undefined fields to avoid Firestore errors
                const cleanProduct = {};
                Object.keys(product).forEach(key => {
                    const value = product[key];
                    if (value !== undefined) {
                        cleanProduct[key] = value;
                    }
                });
                const productData = Object.assign(Object.assign({}, cleanProduct), { updated_at: admin.firestore.FieldValue.serverTimestamp() });
                if (existingQuery.empty) {
                    // Create new product - only if it doesn't exist
                    yield db.collection('products').add(productData);
                    result.created++;
                    console.log(`Created: ${product.artist} - ${product.album}`);
                }
                else {
                    // Update existing product and detect sales
                    const docId = existingQuery.docs[0].id;
                    const existingProduct = existingQuery.docs[0].data();
                    const oldStock = existingProduct.stock || 0;
                    const newStock = product.stock || 0;
                    // Detect sale: stock decreased
                    if (newStock < oldStock) {
                        const quantitySold = oldStock - newStock;
                        console.log(`🔔 Sale detected! ${product.artist} - ${product.album}: ${quantitySold} sold`);
                        // Create sale record
                        yield db.collection('sales').add({
                            items: [{
                                    productId: docId,
                                    album: product.album,
                                    artist: product.artist,
                                    qty: quantitySold,
                                    priceAtSale: product.price,
                                    costAtSale: existingProduct.cost || 0
                                }],
                            channel: 'discogs',
                            total_amount: product.price * quantitySold,
                            paymentMethod: 'Discogs',
                            customerName: null,
                            customerEmail: null,
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            status: 'completed',
                            discogs_listing_id: product.discogs_listing_id
                        });
                        // Create inventory movement log
                        yield db.collection('inventory_movements').add({
                            product_id: docId,
                            album: product.album,
                            change: -quantitySold,
                            reason: 'sale',
                            channel: 'discogs',
                            timestamp: admin.firestore.FieldValue.serverTimestamp()
                        });
                        result.salesDetected++;
                    }
                    yield db.collection('products').doc(docId).update(productData);
                    result.updated++;
                    console.log(`Updated: ${product.artist} - ${product.album}`);
                }
                result.synced++;
            }
            catch (error) {
                const errorMsg = `Error syncing ${product.artist} - ${product.album}: ${error.message}`;
                console.error(errorMsg);
                result.errors.push(errorMsg);
            }
        }
        result.message = `Successfully synced ${result.synced} products (${result.created} created, ${result.updated} updated)`;
        if (result.salesDetected > 0) {
            result.message += `. 🎉 ${result.salesDetected} Discogs sale(s) detected!`;
        }
        if (result.errors.length > 0) {
            result.message += ` with ${result.errors.length} errors`;
        }
        console.log(result.message);
        res.json(result);
    }
    catch (error) {
        console.error('Sync failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            synced: 0,
            created: 0,
            updated: 0,
            salesDetected: 0,
            errors: [error.message],
            message: 'Sync failed'
        });
    }
});
exports.syncInventory = syncInventory;
/**
 * Get sync status/configuration
 */
const getSyncStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const username = process.env.DISCOGS_USERNAME;
    const hasToken = !!process.env.DISCOGS_TOKEN;
    res.json({
        configured: !!username && hasToken,
        username: username || null,
        tokenConfigured: hasToken
    });
});
exports.getSyncStatus = getSyncStatus;
/**
 * Sync orders from Discogs - creates sales for orders that haven't been synced yet
 */
const syncOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }
        console.log('Starting Discogs orders sync...');
        const discogsService = new discogsService_1.DiscogsService(username, token);
        const orders = yield discogsService.fetchOrders();
        const db = (0, firebaseAdmin_1.getDb)();
        const result = {
            success: true,
            ordersProcessed: 0,
            salesCreated: 0,
            alreadySynced: 0,
            errors: []
        };
        for (const order of orders) {
            try {
                // Skip if not a completed/paid order
                const validStatuses = ['Payment Received', 'Shipped', 'Merged'];
                if (!validStatuses.includes(order.status)) {
                    continue;
                }
                // Check if this order was already synced
                const existingOrderQuery = yield db.collection('sales')
                    .where('discogs_order_id', '==', order.id)
                    .limit(1)
                    .get();
                if (!existingOrderQuery.empty) {
                    result.alreadySynced++;
                    continue;
                }
                // Extract order details
                const orderDate = new Date(order.created);
                const totalBruto = ((_a = order.total) === null || _a === void 0 ? void 0 : _a.value) || 0;
                const shipping = ((_b = order.shipping) === null || _b === void 0 ? void 0 : _b.value) || 0;
                const netAmount = totalBruto;
                // Map items from order
                const items = order.items.map((item) => {
                    var _a, _b, _c;
                    return ({
                        discogs_listing_id: String(item.id),
                        artist: ((_a = item.release) === null || _a === void 0 ? void 0 : _a.artist) || 'Unknown',
                        album: ((_b = item.release) === null || _b === void 0 ? void 0 : _b.title) || 'Unknown',
                        priceAtSale: ((_c = item.price) === null || _c === void 0 ? void 0 : _c.value) || 0,
                        qty: 1,
                        costAtSale: 0
                    });
                });
                // Create sale record
                yield db.collection('sales').add({
                    discogs_order_id: order.id,
                    channel: 'discogs',
                    status: 'pending_review',
                    total: netAmount,
                    originalTotal: totalBruto,
                    discogsFee: 0,
                    paypalFee: 0,
                    totalFees: 0,
                    shipping: shipping,
                    shipping_income: shipping, // Map to new field for VAT reporting
                    date: orderDate.toISOString().split('T')[0],
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    customerName: ((_c = order.buyer) === null || _c === void 0 ? void 0 : _c.username) || 'Discogs Buyer',
                    customerEmail: ((_d = order.buyer) === null || _d === void 0 ? void 0 : _d.email) || null,
                    paymentMethod: 'Discogs Payout',
                    items: items,
                    shippingAddress: order.shipping_address || null,
                    orderStatus: order.status,
                    needsReview: true
                });
                console.log(`✅ Created sale for Discogs order ${order.id}: ${items.map((i) => i.album).join(', ')}`);
                result.salesCreated++;
                result.ordersProcessed++;
                // Generate invoice in background
                const saleDocRef = yield db.collection('sales')
                    .where('discogs_order_id', '==', order.id)
                    .limit(1)
                    .get();
                if (!saleDocRef.empty) {
                    const saleId = saleDocRef.docs[0].id;
                    const invoiceData = (0, invoiceService_1.buildInvoiceFromDiscogsSale)(saleId, { date: orderDate.toISOString().split('T')[0], customerName: (_e = order.buyer) === null || _e === void 0 ? void 0 : _e.username, shippingAddress: order.shipping_address }, items, netAmount, shipping);
                    (0, invoiceService_1.generateInvoice)(invoiceData).catch(e => console.error(`⚠️ Invoice generation failed for Discogs order ${order.id}:`, e.message));
                }
                // Update stock for matching products
                for (const item of items) {
                    const productQuery = yield db.collection('products')
                        .where('discogs_listing_id', '==', item.discogs_listing_id)
                        .limit(1)
                        .get();
                    if (!productQuery.empty) {
                        const productDoc = productQuery.docs[0];
                        const currentStock = productDoc.data().stock || 0;
                        yield productDoc.ref.update({
                            stock: Math.max(0, currentStock - 1)
                        });
                        console.log(`  📦 Updated stock for ${item.album}`);
                    }
                }
            }
            catch (orderError) {
                result.errors.push(`Order ${order.id}: ${orderError.message}`);
            }
        }
        const message = `Synced ${result.ordersProcessed} orders. Created ${result.salesCreated} sales. ${result.alreadySynced} already synced.`;
        console.log(message);
        res.json(Object.assign(Object.assign({}, result), { message }));
    }
    catch (error) {
        console.error('Orders sync failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.syncOrders = syncOrders;
/**
 * Create a new Discogs listing
 */
const createListing = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }
        const { releaseId, product } = req.body;
        if (!releaseId || !product) {
            return res.status(400).json({
                error: 'releaseId and product are required'
            });
        }
        const discogsService = new discogsService_1.DiscogsService(username, token);
        const listingId = yield discogsService.createListing(releaseId, product);
        res.json({
            success: true,
            listingId,
            message: `Listing created successfully`
        });
    }
    catch (error) {
        console.error('Create listing failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.createListing = createListing;
/**
 * Update an existing Discogs listing
 */
const updateListing = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }
        const { id } = req.params;
        const { product } = req.body;
        if (!product) {
            return res.status(400).json({
                error: 'product data is required'
            });
        }
        const discogsService = new discogsService_1.DiscogsService(username, token);
        yield discogsService.updateListing(id, product);
        res.json({
            success: true,
            message: `Listing ${id} updated successfully`
        });
    }
    catch (error) {
        console.error('Update listing failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.updateListing = updateListing;
/**
 * Delete a Discogs listing
 */
const deleteListing = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }
        const { id } = req.params;
        const discogsService = new discogsService_1.DiscogsService(username, token);
        yield discogsService.deleteListing(id);
        res.json({
            success: true,
            message: `Listing ${id} deleted successfully`
        });
    }
    catch (error) {
        console.error('Delete listing failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.deleteListing = deleteListing;
/**
 * Get price suggestions for a release
 */
const getPriceSuggestions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }
        const { releaseId } = req.params;
        if (!releaseId) {
            return res.status(400).json({
                error: 'releaseId is required'
            });
        }
        const discogsService = new discogsService_1.DiscogsService(username, token);
        const suggestions = yield discogsService.getPriceSuggestions(parseInt(releaseId));
        res.json({
            success: true,
            suggestions
        });
    }
    catch (error) {
        console.error('Fetch price suggestions failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.getPriceSuggestions = getPriceSuggestions;
/**
 * Get a specific release from Discogs
 */
const getReleaseById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                error: 'id is required'
            });
        }
        const discogsService = new discogsService_1.DiscogsService(username, token);
        const release = yield discogsService.getRelease(parseInt(id));
        res.json({
            success: true,
            release
        });
    }
    catch (error) {
        console.error('Fetch release failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.getReleaseById = getReleaseById;
/**
 * Bulk import products from CSV
 */
const bulkImport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        const { csvData, defaultStorage, defaultOwner } = req.body;
        if (!username || !token) {
            return res.status(500).json({ error: 'Discogs credentials not configured' });
        }
        if (!csvData) {
            return res.status(400).json({ error: 'csvData is required' });
        }
        console.log('🚀 Starting bulk import...');
        const lines = csvData.trim().split('\n');
        // Filter out header if present (checking for "Identificador")
        const dataLines = lines.filter((line) => !line.includes('Identificador'));
        const discogsService = new discogsService_1.DiscogsService(username, token);
        const db = (0, firebaseAdmin_1.getDb)();
        const results = {
            total: dataLines.length,
            success: 0,
            failed: 0,
            errors: []
        };
        for (const line of dataLines) {
            try {
                // Format: Artículo;Identificador;Estado;Condición Funda;Comentarios;Precio costo;Precio Venta
                const [itemName, releaseIdStr, mediaCondition, sleeveCondition, comments, costStr, priceStr] = line.split(';');
                if (!itemName && !releaseIdStr)
                    continue;
                const releaseIdRaw = parseInt(releaseIdStr === null || releaseIdStr === void 0 ? void 0 : releaseIdStr.trim());
                let releaseId = isNaN(releaseIdRaw) ? null : releaseIdRaw;
                // Parse prices (remove "kr.", replace "," with ".")
                const parsePrice = (s) => s ? parseFloat(s.replace('kr.', '').replace(',', '.').trim()) || 0 : 0;
                const cost = parsePrice(costStr);
                const price = parsePrice(priceStr);
                console.log(`📦 Processing ${itemName} (ID: ${releaseIdStr || 'Missing'})`);
                // 1. Get metadata from Discogs (Handle missing ID or Listing ID)
                let release;
                try {
                    // Scenario A: No ID provided -> Search by name
                    if (!releaseId) {
                        console.log(`🔍 No ID provided for "${itemName}". Searching on Discogs...`);
                        const searchResult = yield discogsService.searchRelease(itemName);
                        if (!searchResult) {
                            throw new Error('No se encontró el disco en Discogs mediante búsqueda.');
                        }
                        releaseId = searchResult.id;
                        console.log(`✅ Found Release ID ${releaseId} via search`);
                    }
                    if (releaseId !== null && releaseId > 200000000) {
                        try {
                            console.log(`🔍 ID ${releaseId} looks like a Listing ID. Fetching listing details first...`);
                            const listing = yield discogsService.getListing(String(releaseId));
                            releaseId = listing.release.id;
                            console.log(`✅ Found Release ID ${releaseId} from listing`);
                        }
                        catch (err) {
                            console.log(`⚠️ Failed to fetch listing ${releaseId}. Falling back to search by name...`);
                            releaseId = null; // Trigger search below
                        }
                    }
                    if (releaseId === null) {
                        console.log(`🔍 Searching on Discogs for "${itemName}"...`);
                        const searchResult = yield discogsService.searchRelease(itemName);
                        if (!searchResult) {
                            throw new Error('No se encontró el disco en Discogs mediante búsqueda.');
                        }
                        releaseId = searchResult.id;
                        console.log(`✅ Found Release ID ${releaseId} via search`);
                    }
                    if (releaseId === null) {
                        throw new Error('No se pudo determinar el Release ID.');
                    }
                    // Fetch full release details
                    release = yield discogsService.getRelease(releaseId);
                }
                catch (err) {
                    // Scenario C: If it's a number but getRelease failed, maybe it's a Listing ID after all? (Fallback)
                    if (releaseId !== null && releaseId <= 200000000 && !release) {
                        try {
                            console.log(`🔍 Release fetch failed for ${releaseId}. Trying as Listing ID...`);
                            const listing = yield discogsService.getListing(String(releaseId));
                            releaseId = listing.release.id;
                            release = yield discogsService.getRelease(releaseId);
                        }
                        catch (innerErr) {
                            console.log(`⚠️ Listing fallback failed. Trying search by name as last resort...`);
                            const searchResult = yield discogsService.searchRelease(itemName);
                            if (searchResult) {
                                releaseId = searchResult.id;
                                release = yield discogsService.getRelease(releaseId);
                            }
                            else {
                                throw err; // Throw original error
                            }
                        }
                    }
                    else {
                        throw err;
                    }
                }
                // 2. Map conditions
                // Our system uses simpler codes (M, NM, VG+, etc). Discogs service handles mapping.
                // We'll trust the input or fallback to VG if unknown.
                const mapInputCondition = (c) => {
                    if (c.includes('Near Mint'))
                        return 'NM';
                    if (c.includes('Mint'))
                        return 'M';
                    if (c.includes('Very Good Plus'))
                        return 'VG+';
                    if (c.includes('Very Good'))
                        return 'VG';
                    if (c.includes('Good Plus'))
                        return 'G+';
                    if (c.includes('Good'))
                        return 'G';
                    if (c.includes('Fair'))
                        return 'F';
                    if (c.includes('Poor'))
                        return 'P';
                    return 'VG';
                };
                const product = {
                    artist: release.artists_sort || ((_a = release.artists[0]) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
                    album: release.title || 'Unknown',
                    condition: mapInputCondition(mediaCondition),
                    sleeveCondition: mapInputCondition(sleeveCondition),
                    price: price,
                    cost: cost,
                    stock: 1,
                    comments: comments === null || comments === void 0 ? void 0 : comments.trim(),
                    discogs_release_id: release.id,
                    is_online: true
                };
                // 3. Create listing on Discogs
                const listingId = yield discogsService.createListing(releaseId, product);
                // 4. Save to Firestore
                const sku = `DISCOGS-${listingId}`;
                const existing = yield db.collection('products').where('sku', '==', sku).get();
                if (!existing.empty) {
                    console.log(`⏩ Skipping ${sku} - already exists`);
                    results.success++; // Count as success since it's already there
                    continue;
                }
                const primaryImage = (_b = release.images) === null || _b === void 0 ? void 0 : _b.find((img) => img.type === 'primary');
                const coverImage = (primaryImage === null || primaryImage === void 0 ? void 0 : primaryImage.uri) || ((_d = (_c = release.images) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.uri) || '';
                yield db.collection('products').add({
                    sku: `DISCOGS-${listingId}`,
                    artist: product.artist,
                    album: product.album,
                    price: product.price,
                    cost: product.cost,
                    stock: product.stock,
                    condition: product.condition,
                    sleeveCondition: product.sleeveCondition,
                    comments: product.comments,
                    genre: [...(release.genres || []), ...(release.styles || [])].join(', ') || 'Unknown',
                    year: release.year || 0,
                    label: ((_f = (_e = release.labels) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.name) || 'Unknown',
                    cover_image: coverImage,
                    format: ((_h = (_g = release.formats) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.name) || 'Vinyl',
                    discogs_listing_id: String(listingId),
                    discogs_release_id: release.id,
                    is_online: true,
                    storageLocation: defaultStorage || 'Tienda',
                    owner: defaultOwner || 'El Cuartito',
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
                results.success++;
                // Delay between items to respect Discogs rate limits (2s)
                yield new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (err) {
                console.error(`❌ Error importing line: ${line}`, err.message);
                if (err.message.includes('429')) {
                    console.log('🛑 Rate limit hit (429). Pausing for 60 seconds...');
                    results.errors.push('PAUSA_LIMITE_TASA'); // Flag to indicate we paused
                    yield new Promise(resolve => setTimeout(resolve, 60000));
                    // Optional: retry this specific line once? No, let's just continue
                }
                results.failed++;
                results.errors.push(`Error en: ${line.slice(0, 30)}... -> ${err.message}`);
            }
        }
        res.json({
            success: true,
            summary: `Importación completada: ${results.success} éxitos, ${results.failed} errores.`,
            details: results
        });
    }
    catch (error) {
        console.error('Bulk import failed:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.bulkImport = bulkImport;
/**
 * Refresh metadata for a specific product from Discogs
 */
const refreshMetadata = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const { id } = req.params;
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({ error: 'Discogs credentials not configured' });
        }
        const db = (0, firebaseAdmin_1.getDb)();
        const productDoc = yield db.collection('products').doc(id).get();
        if (!productDoc.exists) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productDoc.data();
        const releaseId = product === null || product === void 0 ? void 0 : product.discogs_release_id;
        if (!releaseId) {
            return res.status(400).json({ error: 'This product is not linked to a Discogs Release ID' });
        }
        console.log(`🔄 Refreshing metadata for product ${id} (Discogs Release: ${releaseId})`);
        const discogsService = new discogsService_1.DiscogsService(username, token);
        const release = yield discogsService.getRelease(releaseId);
        // Map fresh data
        const primaryImage = (_a = release.images) === null || _a === void 0 ? void 0 : _a.find((img) => img.type === 'primary');
        const coverImage = (primaryImage === null || primaryImage === void 0 ? void 0 : primaryImage.uri) || ((_c = (_b = release.images) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.uri) || (product === null || product === void 0 ? void 0 : product.cover_image);
        const updatedData = {
            artist: release.artists_sort || ((_d = release.artists[0]) === null || _d === void 0 ? void 0 : _d.name) || (product === null || product === void 0 ? void 0 : product.artist),
            album: release.title || (product === null || product === void 0 ? void 0 : product.album),
            genre: [...(release.genres || []), ...(release.styles || [])].join(', ') || 'Unknown',
            year: release.year || (product === null || product === void 0 ? void 0 : product.year) || 0,
            label: ((_f = (_e = release.labels) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.name) || (product === null || product === void 0 ? void 0 : product.label) || 'Unknown',
            cover_image: coverImage,
            format: ((_h = (_g = release.formats) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.name) || (product === null || product === void 0 ? void 0 : product.format) || 'Vinyl',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        yield db.collection('products').doc(id).update(updatedData);
        res.json({
            success: true,
            message: 'Metadata actualizada correctamente desde Discogs',
            data: updatedData
        });
    }
    catch (error) {
        console.error('Refresh metadata failed:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.refreshMetadata = refreshMetadata;
/**
 * Get a specific listing from Discogs
 */
const getListingById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                error: 'id is required'
            });
        }
        const discogsService = new discogsService_1.DiscogsService(username, token);
        const listing = yield discogsService.getListing(id);
        res.json({
            success: true,
            listing
        });
    }
    catch (error) {
        console.error('Fetch listing failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.getListingById = getListingById;
/**
 * Search for a release by query string (PUBLIC - for shop frontend to avoid CORS)
 */
const searchRelease = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({
                error: 'Query parameter "q" is required'
            });
        }
        const discogsService = new discogsService_1.DiscogsService(username, token);
        const results = yield discogsService.searchReleases(q);
        res.json({
            success: true,
            results: results
        });
    }
    catch (error) {
        console.error('Search release failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.searchRelease = searchRelease;
/**
 * Get tracklist and videos for a release (PUBLIC - for shop frontend to avoid CORS)
 */
const getTracklist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                error: 'Release ID is required'
            });
        }
        const discogsService = new discogsService_1.DiscogsService(username, token);
        const release = yield discogsService.getRelease(parseInt(id));
        res.json({
            success: true,
            tracklist: release.tracklist || [],
            videos: release.videos || []
        });
    }
    catch (error) {
        console.error('Fetch tracklist failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.getTracklist = getTracklist;
