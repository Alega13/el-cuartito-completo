import config from './config/env';
import app from './app';
import { syncInventory, syncOrders } from './controllers/discogsController';

const PORT = config.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 El Cuartito API running on port ${PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);

    // Initial sync on startup
    console.log('🔄 Initial Discogs sync triggered...');
    runSync();

    // Set up background sync every 30 minutes
    setInterval(() => {
        console.log('⏰ Scheduled Discogs sync starting...');
        runSync();
    }, 30 * 60 * 1000);
});

async function runSync() {
    try {
        // Mock request and response for controller methods
        const mockReq = {} as any;
        const mockRes = {
            status: () => ({ json: () => { } }),
            json: () => { }
        } as any;

        console.log('  📦 Syncing inventory...');
        await syncInventory(mockReq, mockRes);

        console.log('  🛒 Syncing orders...');
        await syncOrders(mockReq, mockRes);

        console.log('✅ Background sync completed.');
    } catch (error) {
        console.error('❌ Background sync failed:', error);
    }
}
