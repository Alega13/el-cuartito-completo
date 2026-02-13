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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebaseController = __importStar(require("../controllers/firebaseController"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.isAdmin, firebaseController.getSales);
router.get('/public/:id', firebaseController.getSaleById);
router.post('/public/:id/confirm-local', firebaseController.confirmLocalPayment);
router.post('/', auth_1.isAdmin, firebaseController.createSale);
router.patch('/:id/fulfillment', auth_1.isAdmin, firebaseController.updateFulfillmentStatus);
router.patch('/:id/value', auth_1.isAdmin, firebaseController.updateSaleValue);
router.post('/:id/notify-preparing', auth_1.isAdmin, firebaseController.notifyPreparing);
router.post('/:id/update-tracking', auth_1.isAdmin, firebaseController.updateTrackingNumber);
router.post('/:id/notify-shipped', auth_1.isAdmin, firebaseController.notifyShipped);
router.post('/:id/mark-dispatched', auth_1.isAdmin, firebaseController.markAsDispatched);
router.post('/:id/notify-pickup-ready', auth_1.isAdmin, firebaseController.notifyReadyForPickup);
router.post('/:id/mark-picked-up', auth_1.isAdmin, firebaseController.markAsPickedUp);
exports.default = router;
