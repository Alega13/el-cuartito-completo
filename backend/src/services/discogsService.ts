import axios from 'axios';

interface DiscogsListing {
    id: number;
    release: {
        id: number;
        description: string;
        artist: string;
        title: string;
        year?: number;
        label?: string;
        labels?: Array<{ name: string }>;
        format?: string;
        formats?: Array<{ name: string }>;
        genres?: string[];
        styles?: string[];
        images?: Array<{ uri: string; type: string }>;
    };
    price: {
        value: number;
        currency: string;
    };
    condition: string;
    sleeve_condition?: string;
    status: string;
    quantity?: number;
    comments?: string;
}

interface DiscogsInventoryResponse {
    listings: DiscogsListing[];
    pagination: {
        page: number;
        pages: number;
        per_page: number;
        items: number;
    };
}

interface NormalizedProduct {
    sku: string;
    artist: string;
    album: string;
    price: number;
    stock: number;
    is_online: boolean;
    genre?: string;
    condition: string;
    sleeveCondition?: string;
    year?: number;
    label?: string;
    cover_image?: string;
    format?: string;
    discogs_listing_id?: string;
    discogs_release_id?: number;
}

export class DiscogsService {
    private baseUrl = 'https://api.discogs.com';
    private username: string;
    private token: string;

    constructor(username: string, token: string) {
        this.username = username;
        this.token = token;
    }

    /**
     * Fetch all inventory listings from Discogs
     */
    async fetchInventory(): Promise<NormalizedProduct[]> {
        const allListings: DiscogsListing[] = [];
        let currentPage = 1;
        let totalPages = 1;

        try {
            // Fetch all pages
            while (currentPage <= totalPages) {
                const response = await axios.get<DiscogsInventoryResponse>(
                    `${this.baseUrl}/users/${this.username}/inventory`,
                    {
                        headers: {
                            'Authorization': `Discogs token=${this.token}`,
                            'User-Agent': 'ElCuartitoRecords/1.0'
                        },
                        params: {
                            page: currentPage,
                            per_page: 100,
                            status: 'For Sale' // Only fetch items for sale
                        }
                    }
                );

                allListings.push(...response.data.listings);
                totalPages = response.data.pagination.pages;
                currentPage++;

                // Rate limiting: Discogs allows 60 requests per minute
                if (currentPage <= totalPages) {
                    await this.sleep(1000); // Wait 1 second between requests
                }
            }

            console.log(`Fetched ${allListings.length} listings from Discogs`);
            return allListings.map(listing => this.normalizeProduct(listing));
        } catch (error: any) {
            console.error('Error fetching Discogs inventory:', error.response?.data || error.message);
            throw new Error(`Failed to fetch Discogs inventory: ${error.message}`);
        }
    }

    /**
     * Fetch orders from Discogs marketplace
     * Returns orders that have been paid but may not be shipped yet
     */
    async fetchOrders(): Promise<any[]> {
        const allOrders: any[] = [];
        let currentPage = 1;
        let totalPages = 1;

        try {
            while (currentPage <= totalPages) {
                const response = await axios.get(
                    `${this.baseUrl}/marketplace/orders`,
                    {
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
                    }
                );

                allOrders.push(...response.data.orders);
                totalPages = response.data.pagination.pages;
                currentPage++;

                if (currentPage <= totalPages) {
                    await this.sleep(1000);
                }
            }

            console.log(`Fetched ${allOrders.length} orders from Discogs`);
            return allOrders;
        } catch (error: any) {
            console.error('Error fetching Discogs orders:', error.response?.data || error.message);
            throw new Error(`Failed to fetch Discogs orders: ${error.message}`);
        }
    }

    /**
     * Fetch a specific release from Discogs
     */
    async getRelease(releaseId: number): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/releases/${releaseId}`,
                {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0'
                    }
                }
            );

            return response.data;
        } catch (error: any) {
            console.error(`Error fetching Discogs release ${releaseId}:`, error.response?.data || error.message);
            throw new Error(`Failed to fetch Discogs release: ${error.message}`);
        }
    }

    /**
     * Fetch a specific listing from Discogs
     */
    async getListing(listingId: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/marketplace/listings/${listingId}`,
                {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0'
                    }
                }
            );

            return response.data;
        } catch (error: any) {
            console.error(`Error fetching Discogs listing ${listingId}:`, error.response?.data || error.message);
            throw new Error(`Failed to fetch Discogs listing: ${error.message}`);
        }
    }


    /**
     * Normalize Discogs listing to Firebase product schema
     */
    private normalizeProduct(listing: DiscogsListing): NormalizedProduct {
        const { release, price, condition, quantity, status } = listing;

        // Find the best image (prefer primary, fallback to first available)
        const primaryImage = release.images?.find(img => img.type === 'primary');
        const coverImage = primaryImage?.uri || release.images?.[0]?.uri;

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
            label: release.label || release.labels?.[0]?.name,
            cover_image: coverImage,
            format: release.format || release.formats?.[0]?.name || 'Vinyl',
            discogs_listing_id: String(listing.id),
            discogs_release_id: release.id
        };
    }

    /**
     * Map Discogs condition to our condition system
     */
    private mapCondition(discogsCondition: string): string {
        const conditionMap: { [key: string]: string } = {
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
    async createListing(releaseId: number, product: any): Promise<number> {
        try {
            const listingData: any = {
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

            const response = await axios.post(
                `${this.baseUrl}/marketplace/listings`,
                listingData,
                {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0',
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`Created Discogs listing ${response.data.listing_id} for ${product.artist} - ${product.album}`);
            return response.data.listing_id;
        } catch (error: any) {
            console.error('Error creating Discogs listing:', error.response?.data || error.message);
            throw new Error(`Failed to create Discogs listing: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Update an existing Discogs listing
     */
    async updateListing(listingId: string, product: any): Promise<void> {
        try {
            const listingData: any = {
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

            await axios.post(
                `${this.baseUrl}/marketplace/listings/${listingId}`,
                listingData,
                {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0',
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`Updated Discogs listing ${listingId}`);
        } catch (error: any) {
            console.error('Error updating Discogs listing:', error.response?.data || error.message);
            throw new Error(`Failed to update Discogs listing: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Delete a Discogs listing
     */
    async deleteListing(listingId: string): Promise<void> {
        try {
            await axios.delete(
                `${this.baseUrl}/marketplace/listings/${listingId}`,
                {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0'
                    }
                }
            );

            console.log(`Deleted Discogs listing ${listingId}`);
        } catch (error: any) {
            console.error('Error deleting Discogs listing:', error.response?.data || error.message);
            throw new Error(`Failed to delete Discogs listing: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get price suggestions for a release
     * Requires seller permissions in token
     */
    async getPriceSuggestions(releaseId: number): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/marketplace/price_suggestions/${releaseId}`,
                {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0'
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Error fetching price suggestions:', error.response?.data || error.message);
            // Some tokens might not have seller permissions, return null instead of throwing
            if (error.response?.status === 403 || error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }


    /**
     * Reverse map our condition format to Discogs format
     */
    private reverseMapCondition(ourCondition: string): string {
        const reverseMap: { [key: string]: string } = {
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
    async searchRelease(query: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/database/search`,
                {
                    headers: {
                        'Authorization': `Discogs token=${this.token}`,
                        'User-Agent': 'ElCuartitoRecords/1.0'
                    },
                    params: {
                        q: query,
                        type: 'release',
                        per_page: 1
                    }
                }
            );

            if (response.data.results && response.data.results.length > 0) {
                return response.data.results[0];
            }
            return null;
        } catch (error: any) {
            console.error(`Error searching Discogs release for "${query}":`, error.response?.data || error.message);
            throw new Error(`Failed to search Discogs release: ${error.message}`);
        }
    }

    /**
     * Sleep utility for rate limiting
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
