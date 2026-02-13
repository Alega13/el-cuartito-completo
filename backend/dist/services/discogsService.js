"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscogsService = void 0;
const axios_1 = __importDefault(require("axios"));
class DiscogsService {
    constructor(username, token) {
        this.baseUrl = 'https://api.discogs.com';
        this.username = username;
        this.token = token;
    }
    /**
     * Fetch all inventory listings from Discogs
     */
    fetchInventory() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const allListings = [];
            let currentPage = 1;
            let totalPages = 1;
            try {
                // Fetch all pages
                while (currentPage <= totalPages) {
                    const response = yield axios_1.default.get(`${this.baseUrl}/users/${this.username}/inventory`, {
                        headers: {
                            'Authorization': `Discogs token=${this.token}`,
                            'User-Agent': 'ElCuartitoRecords/1.0'
                        },
                        params: {
                            page: currentPage,
                            per_page: 100,
                            status: 'For Sale' // Only fetch items for sale
                        }
                    });
                    allListings.push(...response.data.listings);
                    totalPages = response.data.pagination.pages;
                    currentPage++;
                    // Rate limiting: Discogs allows 60 requests per minute
                    if (currentPage <= totalPages) {
                        yield this.sleep(1000); // Wait 1 second between requests
                    }
                }
                console.log(`Fetched ${allListings.length} listings from Discogs`);
                return allListings.map(listing => this.normalizeProduct(listing));
            }
            catch (error) {
                console.error('Error fetching Discogs inventory:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Failed to fetch Discogs inventory: ${error.message}`);
            }
        });
    }
    /**
     * Fetch orders from Discogs marketplace
     * Returns orders that have been paid but may not be shipped yet
     */
    fetchOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const allOrders = [];
            let currentPage = 1;
            let totalPages = 1;
            try {
                while (currentPage <= totalPages) {
                    const response = yield axios_1.default.get(`${this.baseUrl}/marketplace/orders`, {
                        headers: {
                            'Authorization': `Discogs token=${this.token}`,
                            'User-Agent': 'ElCuartitoRecords/1.0'
                        },
                        params: {
                            page: currentPage,
                            per_page: 50,
                            sort: 'created',
                            sort_order: 'desc'
                        }
                    });
                    allOrders.push(...response.data.orders);
                    totalPages = response.data.pagination.pages;
                    currentPage++;
                    if (currentPage <= totalPages) {
                        yield this.sleep(1000);
                    }
                }
                console.log(`Fetched ${allOrders.length} orders from Discogs`);
                return allOrders;
            }
            catch (error) {
                console.error('Error fetching Discogs orders:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Failed to fetch Discogs orders: ${error.message}`);
            }
        });
    }
    /**
     * Fetch a specific release from Discogs
     */
    getRelease(releaseId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.get(`${this.baseUrl}/releases/${releaseId}`, {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0'
                    }
                });
                return response.data;
            }
            catch (error) {
                console.error(`Error fetching Discogs release ${releaseId}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Failed to fetch Discogs release: ${error.message}`);
            }
        });
    }
    /**
     * Fetch a specific listing from Discogs
     */
    getListing(listingId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.get(`${this.baseUrl}/marketplace/listings/${listingId}`, {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0'
                    }
                });
                return response.data;
            }
            catch (error) {
                console.error(`Error fetching Discogs listing ${listingId}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Failed to fetch Discogs listing: ${error.message}`);
            }
        });
    }
    /**
     * Normalize Discogs listing to Firebase product schema
     */
    normalizeProduct(listing) {
        var _a, _b, _c, _d, _e, _f, _g;
        const { release, price, condition, quantity, status } = listing;
        // Find the best image (prefer primary, fallback to first available)
        const primaryImage = (_a = release.images) === null || _a === void 0 ? void 0 : _a.find(img => img.type === 'primary');
        const coverImage = (primaryImage === null || primaryImage === void 0 ? void 0 : primaryImage.uri) || ((_c = (_b = release.images) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.uri);
        // Generate SKU from Discogs listing ID
        const sku = `DISCOGS-${listing.id}`;
        // Map Discogs condition to our system
        const normalizedCondition = this.mapCondition(condition);
        return {
            sku,
            artist: release.artist || 'Unknown Artist',
            album: release.title || 'Unknown Album',
            price: price.value || 0,
            stock: quantity || 1,
            is_online: status === 'For Sale', // Only mark as online if actively for sale
            genre: [...(release.genres || []), ...(release.styles || [])].join(', '),
            condition: normalizedCondition,
            sleeveCondition: listing.sleeve_condition ? this.mapCondition(listing.sleeve_condition) : undefined,
            year: release.year,
            label: release.label || ((_e = (_d = release.labels) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.name),
            cover_image: coverImage,
            format: release.format || ((_g = (_f = release.formats) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.name) || 'Vinyl',
            discogs_listing_id: String(listing.id),
            discogs_release_id: release.id
        };
    }
    /**
     * Map Discogs condition to our condition system
     */
    mapCondition(discogsCondition) {
        const conditionMap = {
            'Mint (M)': 'M',
            'Near Mint (NM or M-)': 'NM',
            'Very Good Plus (VG+)': 'VG+',
            'Very Good (VG)': 'VG',
            'Good Plus (G+)': 'G+',
            'Good (G)': 'G',
            'Fair (F)': 'F',
            'Poor (P)': 'P'
        };
        return conditionMap[discogsCondition] || 'VG';
    }
    /**
     * Create a new listing on Discogs
     * @param releaseId - Discogs release ID
     * @param product - Product data
     * @returns Listing ID
     */
    createListing(releaseId, product) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const listingData = {
                    release_id: releaseId,
                    condition: this.reverseMapCondition(product.condition),
                    price: product.price,
                    quantity: product.stock || 1, // Stock quantity
                    status: product.stock > 0 ? 'For Sale' : 'Draft',
                    comments: product.comments || undefined,
                    location: 'Denmark',
                    weight: 0, // Will be calculated by Discogs
                    format_quantity: 1
                };
                // Add sleeve_condition if provided
                if (product.sleeveCondition) {
                    listingData.sleeve_condition = this.reverseMapCondition(product.sleeveCondition);
                }
                const response = yield axios_1.default.post(`${this.baseUrl}/marketplace/listings`, listingData, {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0',
                        'Content-Type': 'application/json'
                    }
                });
                console.log(`Created Discogs listing ${response.data.listing_id} for ${product.artist} - ${product.album}`);
                return response.data.listing_id;
            }
            catch (error) {
                console.error('Error creating Discogs listing:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Failed to create Discogs listing: ${((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error.message}`);
            }
        });
    }
    /**
     * Update an existing Discogs listing
     */
    updateListing(listingId, product) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const listingData = {
                    release_id: product.discogs_release_id,
                    condition: this.reverseMapCondition(product.condition),
                    price: product.price,
                    quantity: product.stock || 1, // Update stock/quantity
                    status: product.stock > 0 ? 'For Sale' : 'Draft', // Set to Draft if out of stock
                    comments: product.comments || undefined
                };
                // Add sleeve_condition if provided
                if (product.sleeveCondition) {
                    listingData.sleeve_condition = this.reverseMapCondition(product.sleeveCondition);
                }
                yield axios_1.default.post(`${this.baseUrl}/marketplace/listings/${listingId}`, listingData, {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0',
                        'Content-Type': 'application/json'
                    }
                });
                console.log(`Updated Discogs listing ${listingId}`);
            }
            catch (error) {
                console.error('Error updating Discogs listing:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Failed to update Discogs listing: ${((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error.message}`);
            }
        });
    }
    /**
     * Delete a Discogs listing
     */
    deleteListing(listingId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                yield axios_1.default.delete(`${this.baseUrl}/marketplace/listings/${listingId}`, {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0'
                    }
                });
                console.log(`Deleted Discogs listing ${listingId}`);
            }
            catch (error) {
                console.error('Error deleting Discogs listing:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Failed to delete Discogs listing: ${((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error.message}`);
            }
        });
    }
    /**
     * Get price suggestions for a release
     * Requires seller permissions in token
     */
    getPriceSuggestions(releaseId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const response = yield axios_1.default.get(`${this.baseUrl}/marketplace/price_suggestions/${releaseId}`, {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0'
                    }
                });
                return response.data;
            }
            catch (error) {
                console.error('Error fetching price suggestions:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                // Some tokens might not have seller permissions, return null instead of throwing
                if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 403 || ((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) === 404) {
                    return null;
                }
                throw error;
            }
        });
    }
    /**
     * Reverse map our condition format to Discogs format
     */
    reverseMapCondition(ourCondition) {
        const reverseMap = {
            'M': 'Mint (M)',
            'NM': 'Near Mint (NM or M-)',
            'VG+': 'Very Good Plus (VG+)',
            'VG': 'Very Good (VG)',
            'G+': 'Good Plus (G+)',
            'G': 'Good (G)',
            'F': 'Fair (F)',
            'P': 'Poor (P)'
        };
        return reverseMap[ourCondition] || 'Very Good (VG)';
    }
    /**
     * Search for a release by query string
     */
    searchRelease(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield this.searchReleases(query, 1);
            return results.length > 0 ? results[0] : null;
        });
    }
    /**
     * Search for releases by query string
     */
    searchReleases(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, perPage = 20) {
            var _a;
            try {
                const response = yield axios_1.default.get(`${this.baseUrl}/database/search`, {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0'
                    },
                    params: {
                        q: query,
                        type: 'release',
                        per_page: perPage
                    }
                });
                return response.data.results || [];
            }
            catch (error) {
                console.error(`Error searching Discogs releases for "${query}":`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Failed to search Discogs releases: ${error.message}`);
            }
        });
    }
    /**
     * Get tracklist and other details for a release
     */
    getTracklist(releaseId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const release = yield this.getRelease(releaseId);
                return release.tracklist || [];
            }
            catch (error) {
                console.error(`Error fetching tracklist for release ${releaseId}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Failed to fetch tracklist: ${error.message}`);
            }
        });
    }
    /**
     * Sleep utility for rate limiting
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.DiscogsService = DiscogsService;
