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
Object.defineProperty(exports, "__esModule", { value: true });
const firebaseAdmin_1 = require("./src/config/firebaseAdmin");
const invoiceService_1 = require("./src/services/invoiceService");
/**
 * Regenerate Invoice 2026-0002 with Gross Total (Items + Shipping)
 * because Discogs "total" field was Net Payout (-Fees).
 */
function regenerate() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('🔄 Starting regeneration of 2026-0002...');
        const db = (0, firebaseAdmin_1.getDb)();
        // 1. Get existing invoice
        const snapshot = yield db.collection('invoices').where('invoiceNumber', '==', '2026-0002').get();
        if (snapshot.empty) {
            console.error('❌ Invoice 2026-0002 not found.');
            return;
        }
        const invoiceDoc = snapshot.docs[0];
        const invoiceData = invoiceDoc.data();
        const invoiceId = invoiceDoc.id;
        console.log(`✅ Found Invoice: ${invoiceId} (Sale ID: ${invoiceData.saleId})`);
        // 2. Get Sale Document
        const saleDoc = yield db.collection('sales').doc(invoiceData.saleId).get();
        if (!saleDoc.exists) {
            console.error('❌ Sale document not found.');
            return;
        }
        const saleData = saleDoc.data();
        if (!saleData) {
            console.error('❌ Sale data is undefined.');
            return;
        }
        console.log(`✅ Found Sale: ${saleData.orderNumber || invoiceData.saleId}`);
        // 3. Re-build Invoice Data (using updated logic in invoiceService)
        // Theoretically, buildInvoiceFromSaleDoc now handles the Gross calculation for Discogs.
        const newInvoiceData = (0, invoiceService_1.buildInvoiceFromSaleDoc)(invoiceData.saleId, saleData);
        // Verify totalAmount
        console.log(`🔍 Old Total: ${invoiceData.totalAmount}`);
        console.log(`🔍 New Total (Gross): ${newInvoiceData.totalAmount}`);
        if (newInvoiceData.totalAmount < invoiceData.totalAmount) {
            console.warn("⚠️ Warning: New total is SMALLER than old total. Check logic.");
        }
        // 4. Generate PDF
        console.log('🔄 Generating PDF...');
        const pdfBuffer = yield (0, invoiceService_1.generatePDFBuffer)('2026-0002', newInvoiceData);
        // 5. Upload to Storage (Overwrite existing file?)
        // Re-use storage path if possible to avoid orphans?
        // Or generate new path?
        // Using invoiceService logic for file naming:
        const year = new Date(newInvoiceData.date).getFullYear();
        const quarter = Math.ceil((new Date(newInvoiceData.date).getMonth() + 1) / 3);
        const albumSlug = (((_a = newInvoiceData.items[0]) === null || _a === void 0 ? void 0 : _a.album) || 'Unknown').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const totalStr = Math.round(newInvoiceData.totalAmount);
        // Path: Contabilidad_ElCuartito_2026/Ventas_Trimestre_1/2026-02-08_2026-0002_Album_280DKK.pdf
        const fileName = `${newInvoiceData.date}_2026-0002_${albumSlug}_${totalStr}DKK.pdf`;
        const storagePath = `Contabilidad_ElCuartito_${year}/Ventas_Trimestre_${quarter}/${fileName}`;
        console.log(`📤 Uploading to: ${storagePath}`);
        const downloadUrl = yield (0, invoiceService_1.uploadToStorage)(pdfBuffer, storagePath);
        console.log(`✅ Upload Check: ${downloadUrl}`);
        // 6. Update Firestore
        console.log('💾 Updating Firestore...');
        yield db.collection('invoices').doc(invoiceId).update({
            totalAmount: newInvoiceData.totalAmount,
            storagePath: storagePath,
            downloadUrl: downloadUrl,
            items: newInvoiceData.items, // Update items if mapping changed
            updatedAt: new Date()
        });
        console.log('🎉 Invoice 2026-0002 regenerated successfully!');
    });
}
regenerate().catch(console.error);
