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
const env_1 = __importDefault(require("./config/env"));
const app_1 = __importDefault(require("./app"));
const discogsController_1 = require("./controllers/discogsController");
const PORT = env_1.default.PORT || 3001;
app_1.default.listen(PORT, () => {
    console.log(`🚀 El Cuartito API running on port ${PORT}`);
    console.log(`Environment: ${env_1.default.NODE_ENV}`);
    // Initial sync on startup
    console.log('🔄 Initial Discogs sync triggered...');
    runSync();
    // Set up background sync every 30 minutes
    setInterval(() => {
        console.log('⏰ Scheduled Discogs sync starting...');
        runSync();
    }, 30 * 60 * 1000);
});
function runSync() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Mock request and response for controller methods
            const mockReq = {};
            const mockRes = {
                status: () => ({ json: () => { } }),
                json: () => { }
            };
            console.log('  📦 Syncing inventory...');
            yield (0, discogsController_1.syncInventory)(mockReq, mockRes);
            console.log('  🛒 Syncing orders...');
            yield (0, discogsController_1.syncOrders)(mockReq, mockRes);
            console.log('✅ Background sync completed.');
        }
        catch (error) {
            console.error('❌ Background sync failed:', error);
        }
    });
}
