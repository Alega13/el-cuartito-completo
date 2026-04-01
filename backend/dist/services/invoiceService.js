"use strict";
/**
 * Invoice Service — Brugtmoms-compliant PDF generation
 * Generates invoices for all sales (POS, Webshop, Discogs),
 * uploads to Firebase Storage with quarterly folder structure,
 * and maintains sequential numbering per year.
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDFBuffer = generatePDFBuffer;
exports.uploadToStorage = uploadToStorage;
exports.generateInvoice = generateInvoice;
exports.buildInvoiceFromPOSSale = buildInvoiceFromPOSSale;
exports.buildInvoiceFromWebshopSale = buildInvoiceFromWebshopSale;
exports.buildInvoiceFromDiscogsSale = buildInvoiceFromDiscogsSale;
exports.generateManualInvoicePDFBuffer = generateManualInvoicePDFBuffer;
exports.generateManualInvoice = generateManualInvoice;
exports.listInvoices = listInvoices;
exports.getInvoiceDownloadUrl = getInvoiceDownloadUrl;
exports.getInvoiceFile = getInvoiceFile;
exports.getQuarterInvoices = getQuarterInvoices;
exports.buildInvoiceFromSaleDoc = buildInvoiceFromSaleDoc;
exports.backfillInvoices = backfillInvoices;
const pdfkit_1 = __importDefault(require("pdfkit"));
const admin = __importStar(require("firebase-admin"));
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// ─── Constants ───────────────────────────────────────────────────────
const BUSINESS = {
    name: 'El Cuartito Records I/S',
    address: 'Dybbølsgade 14 st tv',
    city: '1721 København V',
    country: 'Denmark',
    cvr: 'CVR: 45943216',
};
const BRUGTMOMS_TEXT = 'Varen sælges efter de særlige regler for brugte varer - køber har ikke fradrag for momsen.';
const BRAND_ORANGE = '#FF6B00';
// ─── Helper: Get next invoice number ─────────────────────────────────
function getNextInvoiceNumber(year) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, firebaseAdmin_1.getDb)();
        const counterRef = db.collection('invoice_counters').doc(String(year));
        const result = yield db.runTransaction((transaction) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const counterDoc = yield transaction.get(counterRef);
            let nextNumber = 1;
            if (counterDoc.exists) {
                nextNumber = (((_a = counterDoc.data()) === null || _a === void 0 ? void 0 : _a.current) || 0) + 1;
            }
            transaction.set(counterRef, { current: nextNumber, year }, { merge: true });
            return nextNumber;
        }));
        return `${year}-${String(result).padStart(4, '0')}`;
    });
}
// ─── Helper: Get quarter from date ───────────────────────────────────
function getQuarter(dateStr) {
    const month = new Date(dateStr).getMonth(); // 0-11
    return Math.floor(month / 3) + 1;
}
// ─── Helper: Sanitize filename ───────────────────────────────────────
function sanitizeFilename(str) {
    return str
        .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\-_]/g, '')
        .substring(0, 40);
}
// ─── Helper: Map payment method for display ──────────────────────────
function formatPaymentMethod(method) {
    const map = {
        'CASH': 'Cash / Kontant',
        'cash': 'Cash / Kontant',
        'MOBILEPAY': 'MobilePay',
        'mobilepay': 'MobilePay',
        'CARD': 'Card / Kort',
        'card': 'Card / Kort',
        'Discogs Payout': 'Discogs Payment',
        'discogs': 'Discogs Payment',
    };
    return map[method] || method;
}
// ─── Helper: Map channel for display ─────────────────────────────────
function formatChannel(channel) {
    const map = {
        'local': 'Butikssalg (In-Store)',
        'online': 'Webshop',
        'discogs': 'Discogs',
    };
    return map[channel] || channel;
}
// ─── Core: Generate PDF ──────────────────────────────────────────────
function generatePDFBuffer(invoiceNumber, sale) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({
            size: 'A4',
            margin: 50,
            info: {
                Title: `Invoice ${invoiceNumber}`,
                Author: BUSINESS.name,
            }
        });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        const pageWidth = doc.page.width - 100; // 50 margin each side
        // ── Logo ──
        const logoPath = path_1.default.resolve(__dirname, '../assets/logo.png');
        if (fs_1.default.existsSync(logoPath)) {
            doc.image(logoPath, 50, 40, { width: 80 });
        }
        // ── Header: Business info (right aligned) ──
        doc.fontSize(9).fillColor('#666666');
        doc.text(BUSINESS.name, 300, 45, { align: 'right', width: pageWidth - 250 });
        doc.text(BUSINESS.address, 300, 57, { align: 'right', width: pageWidth - 250 });
        doc.text(BUSINESS.city, 300, 69, { align: 'right', width: pageWidth - 250 });
        doc.text(BUSINESS.country, 300, 81, { align: 'right', width: pageWidth - 250 });
        doc.fontSize(9).fillColor(BRAND_ORANGE).font('Helvetica-Bold');
        doc.text(BUSINESS.cvr, 300, 96, { align: 'right', width: pageWidth - 250 });
        // ── Divider ──
        doc.moveTo(50, 110).lineTo(50 + pageWidth, 110).strokeColor('#E2E8F0').lineWidth(1).stroke();
        // ── Invoice title ──
        doc.fontSize(22).fillColor('#1E293B').font('Helvetica-Bold');
        doc.text('KVITTERING', 50, 125); // "Receipt" in Danish
        doc.fontSize(10).fillColor('#94A3B8').font('Helvetica');
        doc.text(`Salgsbilag / Receipt`, 50, 150);
        // ── Invoice metadata (right side) ──
        const metaX = 350;
        const metaLabelW = 100;
        const metaValueW = 100;
        doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold');
        doc.text('Faktura Nr.:', metaX, 125, { width: metaLabelW });
        doc.text('Dato:', metaX, 140, { width: metaLabelW });
        doc.text('Kanal:', metaX, 155, { width: metaLabelW });
        doc.text('Betaling:', metaX, 170, { width: metaLabelW });
        doc.font('Helvetica').fillColor('#1E293B');
        doc.text(invoiceNumber, metaX + metaLabelW, 125, { width: metaValueW });
        doc.text(sale.date, metaX + metaLabelW, 140, { width: metaValueW });
        doc.text(formatChannel(sale.channel), metaX + metaLabelW, 155, { width: metaValueW });
        doc.text(formatPaymentMethod(sale.paymentMethod), metaX + metaLabelW, 170, { width: metaValueW });
        // ── Customer ──
        let yPos = 195;
        doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold');
        doc.text('Kunde / Customer:', 50, yPos);
        doc.font('Helvetica').fillColor('#1E293B');
        const customerDisplay = sale.customerName || 'Butikskunde (Walk-in)';
        doc.text(customerDisplay, 160, yPos);
        if (sale.customerCountry) {
            doc.text(sale.customerCountry, 160, yPos + 12);
            yPos += 12;
        }
        // ── Items table ──
        yPos += 20;
        // Table header
        doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor(BRAND_ORANGE).lineWidth(2).stroke();
        yPos += 8;
        doc.fontSize(8).fillColor(BRAND_ORANGE).font('Helvetica-Bold');
        doc.text('#', 50, yPos, { width: 25 });
        doc.text('Beskrivelse / Description', 75, yPos, { width: 250 });
        doc.text('Antal', 335, yPos, { width: 40, align: 'center' });
        doc.text('Pris', 385, yPos, { width: 70, align: 'right' });
        doc.text('Total', 460, yPos, { width: 85, align: 'right' });
        yPos += 18;
        doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        yPos += 8;
        // Table rows
        doc.font('Helvetica').fillColor('#334155').fontSize(sale.items.length > 20 ? 8 : 9);
        const hasNew = sale.items.some(i => i.productCondition === 'New');
        const hasUsed = sale.items.some(i => i.productCondition && i.productCondition !== 'New');
        const isMixed = hasNew && hasUsed;
        // Adaptive row height
        const rowHeight = sale.items.length > 15 ? 16 : 18;
        sale.items.forEach((item, idx) => {
            let albumLabel = item.album;
            if (isMixed && item.productCondition !== 'New') {
                albumLabel += ' *';
            }
            const description = item.artist ? `${item.artist} — ${albumLabel}` : albumLabel;
            doc.text(String(idx + 1), 50, yPos, { width: 25 });
            doc.text(description, 75, yPos, { width: 250 });
            doc.text(String(item.qty), 335, yPos, { width: 40, align: 'center' });
            doc.text(`${item.unitPrice.toFixed(2)} DKK`, 385, yPos, { width: 70, align: 'right' });
            doc.text(`${item.total.toFixed(2)} DKK`, 460, yPos, { width: 85, align: 'right' });
            yPos += rowHeight;
        });
        // Shipping row if applicable
        if (sale.shippingCost && sale.shippingCost > 0) {
            doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
            yPos += 8;
            doc.fillColor('#64748B');
            doc.text('', 50, yPos, { width: 25 });
            doc.text('Forsendelse / Shipping', 75, yPos, { width: 250 });
            doc.text('', 335, yPos, { width: 40 });
            doc.text('', 385, yPos, { width: 70 });
            doc.text(`${sale.shippingCost.toFixed(2)} DKK`, 460, yPos, { width: 85, align: 'right' });
            yPos += rowHeight;
        }
        // ── Total ──
        yPos += 5;
        doc.moveTo(350, yPos).lineTo(50 + pageWidth, yPos).strokeColor(BRAND_ORANGE).lineWidth(2).stroke();
        yPos += 10;
        doc.fontSize(12).fillColor('#1E293B').font('Helvetica-Bold');
        // Label logic
        let totalLabel = 'TOTAL:';
        if (!hasNew && hasUsed) {
            totalLabel = 'Total inkl. moms:';
        }
        doc.text(totalLabel, 300, yPos, { width: 155, align: 'right' });
        // Total sum
        const calculatedTotal = sale.items.reduce((sum, item) => sum + item.total, 0) + (sale.shippingCost || 0);
        doc.fillColor(BRAND_ORANGE);
        doc.text(`${calculatedTotal.toFixed(2)} DKK`, 460, yPos, { width: 85, align: 'right' });
        // VAT Breakdown
        if (hasNew) {
            yPos += 14;
            doc.fontSize(9).fillColor('#64748B').font('Helvetica');
            let vatableAmount = 0;
            if (!hasUsed) {
                // Scenario A: Everything is new, include shipping in VAT
                vatableAmount = calculatedTotal;
            }
            else {
                // Scenario C: Mixed, only new items
                vatableAmount = sale.items
                    .filter(i => i.productCondition === 'New')
                    .reduce((sum, i) => sum + i.total, 0);
            }
            const vatExtraction = vatableAmount * 0.20; // Extracting 20% from gross price = 25% VAT. 
            doc.text('Heraf Moms (25%):', 300, yPos, { width: 155, align: 'right' });
            doc.text(`${vatExtraction.toFixed(2)} DKK`, 460, yPos, { width: 85, align: 'right' });
        }
        // ── Brugtmoms legal notice ──
        if (hasUsed) {
            yPos += 25;
            doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
            yPos += 10;
            // Legal box
            const boxY = yPos;
            const boxHeight = isMixed ? 35 : 45;
            doc.roundedRect(50, boxY, pageWidth, boxHeight, 4)
                .fillColor('#FFF7ED')
                .fill();
            doc.roundedRect(50, boxY, pageWidth, boxHeight, 4)
                .strokeColor('#FDBA74')
                .lineWidth(1)
                .stroke();
            doc.fontSize(7).fillColor(BRAND_ORANGE).font('Helvetica-Bold');
            if (isMixed) {
                // Scenario C: Mixed cart legend with *
                doc.text('BRUGTMOMS / USED GOODS MARGIN SCHEME', 62, boxY + 10, { width: pageWidth - 24 });
                doc.fontSize(8).fillColor('#9A3412').font('Helvetica');
                doc.text('* Varen sælges efter de særlige regler for brugte varer - køber har ikke fradrag for momsen for disse varer.', 62, boxY + 22, { width: pageWidth - 24 });
            }
            else {
                // Scenario B: All used
                doc.text('BRUGTMOMS / SECONDHAND GOODS MARGIN SCHEME', 62, boxY + 10, { width: pageWidth - 24 });
                doc.fontSize(8).fillColor('#9A3412').font('Helvetica');
                doc.text(BRUGTMOMS_TEXT, 62, boxY + 24, { width: pageWidth - 24 });
                doc.fontSize(7).fillColor('#94A3B8');
                doc.text('(The goods are sold under the special rules for second-hand goods — the buyer has no VAT deduction.)', 62, boxY + 38, { width: pageWidth - 24 });
            }
        }
        // ── Footer ──
        const footerY = doc.page.height - 60;
        doc.fontSize(7).fillColor('#CBD5E1').font('Helvetica');
        doc.text(`${BUSINESS.name} · ${BUSINESS.address}, ${BUSINESS.city} · ${BUSINESS.cvr}`, 50, footerY, { align: 'center', width: pageWidth });
        doc.text(`Invoice ${invoiceNumber} · Generated ${new Date().toISOString().split('T')[0]}`, 50, footerY + 12, { align: 'center', width: pageWidth });
        doc.end();
    });
}
// ─── Core: Upload to Firebase Storage ────────────────────────────────
function uploadToStorage(pdfBuffer, storagePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);
        yield file.save(pdfBuffer, {
            metadata: {
                contentType: 'application/pdf',
                cacheControl: 'public, max-age=31536000',
            },
        });
        // Make the file publicly accessible via a signed URL (valid for 10 years)
        const [signedUrl] = yield file.getSignedUrl({
            action: 'read',
            expires: '2036-01-01',
        });
        return signedUrl;
    });
}
// ─── Core: Save invoice metadata to Firestore ───────────────────────
function saveInvoiceMetadata(invoiceNumber, saleId, sale, storagePath, downloadUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, firebaseAdmin_1.getDb)();
        const year = new Date(sale.date).getFullYear();
        const quarter = getQuarter(sale.date);
        const docRef = yield db.collection('invoices').add({
            invoiceNumber,
            saleId,
            date: sale.date,
            year,
            quarter,
            channel: sale.channel,
            paymentMethod: sale.paymentMethod,
            customerName: sale.customerName || 'Butikskunde',
            totalAmount: sale.totalAmount,
            itemsSummary: sale.items.map(i => i.album).join(', '),
            storagePath,
            downloadUrl,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return docRef.id;
    });
}
// ─── Main: Generate Invoice for a Sale ───────────────────────────────
function generateInvoice(sale) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const year = new Date(sale.date).getFullYear();
        const quarter = getQuarter(sale.date);
        // 1. Get sequential invoice number
        const invoiceNumber = yield getNextInvoiceNumber(year);
        // 2. Generate PDF
        const pdfBuffer = yield generatePDFBuffer(invoiceNumber, sale);
        // 3. Build storage path
        const albumSlug = sanitizeFilename(((_a = sale.items[0]) === null || _a === void 0 ? void 0 : _a.album) || 'Unknown');
        const totalStr = Math.round(sale.totalAmount);
        const fileName = `${sale.date}_${invoiceNumber}_${albumSlug}_${totalStr}DKK.pdf`;
        const storagePath = `Contabilidad_ElCuartito_${year}/Ventas_Trimestre_${quarter}/${fileName}`;
        // 4. Upload to Firebase Storage
        const downloadUrl = yield uploadToStorage(pdfBuffer, storagePath);
        // 5. Save metadata to Firestore
        const firestoreId = yield saveInvoiceMetadata(invoiceNumber, sale.saleId, sale, storagePath, downloadUrl);
        console.log(`📄 Factura ${invoiceNumber} guardada en ${storagePath}. Cumple normativa Brugtmoms.`);
        return {
            invoiceNumber,
            storagePath,
            downloadUrl,
            firestoreId,
        };
    });
}
// ─── Utility: Build SaleInvoiceData from various sale formats ────────
/**
 * Builds invoice data from a POS/manual sale (createSale format)
 */
function buildInvoiceFromPOSSale(saleId, items, channel, totalAmount, paymentMethod, customerName) {
    const now = new Date();
    return {
        saleId,
        date: now.toISOString().split('T')[0],
        channel: channel || 'local',
        paymentMethod: paymentMethod || 'CASH',
        customerName: customerName || undefined,
        items: items.map(item => ({
            artist: item.artist || undefined,
            album: item.album || 'Unknown',
            qty: item.qty || item.quantity || 1,
            unitPrice: item.priceAtSale || item.price || item.unitPrice || 0,
            total: (item.priceAtSale || item.price || item.unitPrice || 0) * (item.qty || item.quantity || 1),
            productCondition: item.productCondition || item.condition || 'Second-hand',
        })),
        totalAmount,
    };
}
/**
 * Builds invoice data from a Stripe webhook sale (webshop)
 */
function buildInvoiceFromWebshopSale(saleId, saleData) {
    var _a, _b, _c, _d, _e, _f;
    const customerName = ((_a = saleData.customer) === null || _a === void 0 ? void 0 : _a.name)
        || ((_b = saleData.customer) === null || _b === void 0 ? void 0 : _b.firstName)
        ? `${saleData.customer.firstName} ${saleData.customer.lastName || ''}`.trim()
        : undefined;
    const customerCountry = ((_d = (_c = saleData.customer) === null || _c === void 0 ? void 0 : _c.shipping) === null || _d === void 0 ? void 0 : _d.country)
        || ((_e = saleData.customer) === null || _e === void 0 ? void 0 : _e.country)
        || ((_f = saleData.shipping_method) === null || _f === void 0 ? void 0 : _f.method)
        || undefined;
    return {
        saleId,
        date: saleData.date || new Date().toISOString().split('T')[0],
        channel: 'online',
        paymentMethod: saleData.payment_method || 'Card',
        customerName,
        customerCountry,
        items: (saleData.items || []).map((item) => ({
            artist: item.artist || undefined,
            album: item.album || 'Unknown',
            qty: item.quantity || 1,
            unitPrice: item.unitPrice || item.priceAtSale || 0,
            total: (item.unitPrice || item.priceAtSale || 0) * (item.quantity || 1),
            productCondition: item.productCondition || 'Second-hand',
        })),
        totalAmount: saleData.total_amount || 0,
        shippingCost: saleData.shipping_cost || 0,
    };
}
/**
 * Builds invoice data from a Discogs order sync
 */
function buildInvoiceFromDiscogsSale(saleId, orderData, items, totalAmount, shippingCost) {
    var _a, _b;
    return {
        saleId,
        date: orderData.date || new Date().toISOString().split('T')[0],
        channel: 'discogs',
        paymentMethod: 'Discogs Payment',
        customerName: orderData.customerName || ((_a = orderData.buyer) === null || _a === void 0 ? void 0 : _a.username) || 'Discogs Buyer',
        customerCountry: ((_b = orderData.shippingAddress) === null || _b === void 0 ? void 0 : _b.country) || undefined,
        items: items.map(item => ({
            artist: item.artist || undefined,
            album: item.album || 'Unknown',
            qty: item.qty || 1,
            unitPrice: item.priceAtSale || 0,
            total: (item.priceAtSale || 0) * (item.qty || 1),
            productCondition: 'Second-hand', // Discogs items are always marked as used
        })),
        totalAmount,
        shippingCost,
    };
}
// ─── Core: Generate Manual Invoice PDF ───────────────────────────────
function generateManualInvoicePDFBuffer(invoiceNumber, data) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({
            size: 'A4',
            margins: { top: 50, bottom: 30, left: 50, right: 50 },
            info: {
                Title: `Faktura ${invoiceNumber}`,
                Author: BUSINESS.name,
            }
        });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        const pageWidth = doc.page.width - 100; // 50 margin each side
        // ── Logo ──
        const logoPath = path_1.default.resolve(__dirname, '../assets/logo.png');
        if (fs_1.default.existsSync(logoPath)) {
            doc.image(logoPath, 50, 40, { width: 80 });
        }
        // ── Header: Business info (right aligned) ──
        doc.fontSize(9).fillColor('#666666');
        doc.text(BUSINESS.name, 300, 45, { align: 'right', width: pageWidth - 250 });
        doc.text(BUSINESS.address, 300, 57, { align: 'right', width: pageWidth - 250 });
        doc.text(BUSINESS.city, 300, 69, { align: 'right', width: pageWidth - 250 });
        doc.text(BUSINESS.country, 300, 81, { align: 'right', width: pageWidth - 250 });
        doc.fontSize(9).fillColor(BRAND_ORANGE).font('Helvetica-Bold');
        doc.text(BUSINESS.cvr, 300, 96, { align: 'right', width: pageWidth - 250 });
        // ── Divider ──
        doc.moveTo(50, 110).lineTo(50 + pageWidth, 110).strokeColor('#E2E8F0').lineWidth(1).stroke();
        // ── Invoice title ──
        doc.fontSize(22).fillColor('#1E293B').font('Helvetica-Bold');
        doc.text('FAKTURA', 50, 125);
        doc.fontSize(10).fillColor('#94A3B8').font('Helvetica');
        doc.text('Invoice', 50, 150);
        // ── Invoice metadata (right side) ──
        const metaX = 350;
        const metaLabelW = 100;
        const metaValueW = 100;
        doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold');
        doc.text('Faktura Nr.:', metaX, 125, { width: metaLabelW });
        doc.text('Dato:', metaX, 140, { width: metaLabelW });
        doc.text('Betaling:', metaX, 155, { width: metaLabelW });
        doc.font('Helvetica').fillColor('#1E293B');
        doc.text(invoiceNumber, metaX + metaLabelW, 125, { width: metaValueW });
        doc.text(data.date, metaX + metaLabelW, 140, { width: metaValueW });
        doc.text(formatPaymentMethod(data.paymentMethod || 'Transfer'), metaX + metaLabelW, 155, { width: metaValueW });
        // ── Customer info ──
        let yPos = 185;
        doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold');
        doc.text('Faktureres til / Bill to:', 50, yPos);
        yPos += 14;
        doc.font('Helvetica').fillColor('#1E293B');
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(data.customerName, 50, yPos);
        yPos += 12;
        doc.fontSize(9).font('Helvetica').fillColor('#334155');
        if (data.customerVAT) {
            doc.text(`VAT/CVR: ${data.customerVAT}`, 50, yPos);
            yPos += 12;
        }
        if (data.customerAddress) {
            doc.text(data.customerAddress, 50, yPos);
            yPos += 12;
        }
        // ── Items table ──
        yPos += 20;
        // Table header
        doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor(BRAND_ORANGE).lineWidth(2).stroke();
        yPos += 8;
        doc.fontSize(8).fillColor(BRAND_ORANGE).font('Helvetica-Bold');
        doc.text('#', 50, yPos, { width: 25 });
        doc.text('Beskrivelse / Description', 75, yPos, { width: 350 });
        doc.text('Total', 460, yPos, { width: 85, align: 'right' });
        yPos += 18;
        doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        yPos += 8;
        // Single description row
        doc.font('Helvetica').fillColor('#334155').fontSize(9);
        const descHeight = doc.heightOfString(data.description, { width: 350 });
        const rowHeight = Math.max(16, descHeight + 6);
        doc.text('1', 50, yPos, { width: 25 });
        doc.text(data.description, 75, yPos, { width: 350 });
        doc.text(`${data.amount.toFixed(2)} DKK`, 460, yPos, { width: 85, align: 'right' });
        yPos += rowHeight;
        // ── Total ──
        yPos += 5;
        doc.moveTo(350, yPos).lineTo(50 + pageWidth, yPos).strokeColor(BRAND_ORANGE).lineWidth(2).stroke();
        yPos += 10;
        doc.fontSize(12).fillColor('#1E293B').font('Helvetica-Bold');
        doc.text('TOTAL (inkl. moms):', 300, yPos, { width: 155, align: 'right' });
        doc.fillColor(BRAND_ORANGE);
        doc.text(`${data.amount.toFixed(2)} DKK`, 460, yPos, { width: 85, align: 'right' });
        if (data.vatAmount && data.vatAmount > 0) {
            yPos += 14;
            doc.fontSize(9).fillColor('#64748B').font('Helvetica');
            doc.text('Heraf moms / VAT (25%):', 300, yPos, { width: 155, align: 'right' });
            doc.text(`${data.vatAmount.toFixed(2)} DKK`, 460, yPos, { width: 85, align: 'right' });
        }
        // ── Payment Details ──
        yPos += 20;
        doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        yPos += 15;
        const boxY = yPos;
        const boxHeight = 35;
        doc.roundedRect(50, boxY, pageWidth, boxHeight, 4)
            .fillColor('#F8FAFC')
            .fill();
        doc.roundedRect(50, boxY, pageWidth, boxHeight, 4)
            .strokeColor('#E2E8F0')
            .lineWidth(1)
            .stroke();
        doc.fontSize(7).fillColor('#475569').font('Helvetica-Bold');
        doc.text('BETALINGSOPLYSNINGER / PAYMENT DETAILS', 62, boxY + 8, { width: pageWidth - 24 });
        doc.fontSize(8).fillColor('#334155').font('Helvetica');
        doc.text('Bank Transfer: Lunar Bank — Account: 6695-2002804460', 62, boxY + 20, { width: pageWidth - 24 });
        // ── Footer ──
        const footerY = doc.page.height - 80;
        doc.fontSize(7).fillColor('#CBD5E1').font('Helvetica');
        doc.text(`${BUSINESS.name} · ${BUSINESS.address}, ${BUSINESS.city} · ${BUSINESS.cvr}`, 50, footerY, { align: 'center', width: pageWidth });
        doc.text(`Faktura ${invoiceNumber} · Generated ${new Date().toISOString().split('T')[0]}`, 50, footerY + 12, { align: 'center', width: pageWidth });
        doc.end();
    });
}
// ─── Main: Generate Manual Invoice ──────────────────────────────────
function generateManualInvoice(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const year = new Date(data.date).getFullYear();
        const quarter = getQuarter(data.date);
        // 1. Get sequential invoice number (shared counter with sale invoices)
        const invoiceNumber = yield getNextInvoiceNumber(year);
        // 2. Generate PDF
        const pdfBuffer = yield generateManualInvoicePDFBuffer(invoiceNumber, data);
        // 3. Build storage path
        const customerSlug = sanitizeFilename(data.customerName);
        const totalStr = Math.round(data.amount);
        const fileName = `${data.date}_${invoiceNumber}_MANUAL_${customerSlug}_${totalStr}DKK.pdf`;
        const storagePath = `Contabilidad_ElCuartito_${year}/Facturas_Manuales_Q${quarter}/${fileName}`;
        // 4. Upload to Firebase Storage
        const downloadUrl = yield uploadToStorage(pdfBuffer, storagePath);
        // 5. Save metadata to Firestore
        const db = (0, firebaseAdmin_1.getDb)();
        const docRef = yield db.collection('invoices').add({
            invoiceNumber,
            saleId: `manual_${Date.now()}`,
            date: data.date,
            year,
            quarter,
            channel: 'manual',
            paymentMethod: data.paymentMethod || 'Transfer',
            customerName: data.customerName,
            customerVAT: data.customerVAT || null,
            customerAddress: data.customerAddress || null,
            totalAmount: data.amount,
            itemsSummary: data.description,
            storagePath,
            downloadUrl,
            isManual: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`📄 Factura manual ${invoiceNumber} generada para ${data.customerName}. ${totalStr} DKK`);
        return {
            invoiceNumber,
            storagePath,
            downloadUrl,
            firestoreId: docRef.id,
        };
    });
}
// ─── API: List invoices ──────────────────────────────────────────────
function listInvoices(year, quarter) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, firebaseAdmin_1.getDb)();
        // OPTIMIZATION: Removed .orderBy('createdAt') to avoid needing a composite index for every variation of filters.
        // We will sort in memory since the result set (per quarter) is small.
        let query = db.collection('invoices');
        if (year) {
            query = query.where('year', '==', year);
        }
        if (quarter) {
            query = query.where('quarter', '==', quarter);
        }
        try {
            const snapshot = yield query.get();
            const invoices = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            // Sort in memory by invoiceNumber descending (e.g. 2026-0005, 2026-0004...)
            invoices.sort((a, b) => {
                const numA = a.invoiceNumber || '';
                const numB = b.invoiceNumber || '';
                return numB.localeCompare(numA);
            });
            return invoices;
        }
        catch (error) {
            console.error('Error listing invoices:', error);
            throw new Error('Database error: ' + error.message);
        }
    });
}
// ─── API: Get download URL for a specific invoice ────────────────────
function getInvoiceDownloadUrl(invoiceId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, firebaseAdmin_1.getDb)();
        const doc = yield db.collection('invoices').doc(invoiceId).get();
        if (!doc.exists)
            return null;
        const data = doc.data();
        if (!(data === null || data === void 0 ? void 0 : data.storagePath))
            return null;
        // Refresh signed URL
        const bucket = admin.storage().bucket();
        const file = bucket.file(data.storagePath);
        const [exists] = yield file.exists();
        if (!exists)
            return null;
        const [signedUrl] = yield file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        return signedUrl;
    });
}
/**
 * Get a readable stream for a specific invoice PDF file.
 * This is used to proxy the file through the backend and avoid CORS issues.
 */
function getInvoiceFile(invoiceId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, firebaseAdmin_1.getDb)();
        const doc = yield db.collection('invoices').doc(invoiceId).get();
        if (!doc.exists)
            return null;
        const data = doc.data();
        if (!(data === null || data === void 0 ? void 0 : data.storagePath))
            return null;
        const bucket = admin.storage().bucket();
        const file = bucket.file(data.storagePath);
        const [exists] = yield file.exists();
        if (!exists)
            return null;
        const [metadata] = yield file.getMetadata();
        return {
            stream: file.createReadStream(),
            fileName: data.storagePath.split('/').pop() || `${data.invoiceNumber || 'invoice'}.pdf`,
            contentType: metadata.contentType || 'application/pdf'
        };
    });
}
// ─── API: Get all PDFs for a quarter as individual URLs ──────────────
function getQuarterInvoices(year, quarter) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, firebaseAdmin_1.getDb)();
        const snapshot = yield db.collection('invoices')
            .where('year', '==', year)
            .where('quarter', '==', quarter)
            .get();
        const bucket = admin.storage().bucket();
        const results = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (!data.storagePath)
                continue;
            const file = bucket.file(data.storagePath);
            const [exists] = yield file.exists();
            if (!exists)
                continue;
            const [signedUrl] = yield file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
            });
            results.push({
                id: doc.id,
                invoiceNumber: data.invoiceNumber,
                fileName: data.storagePath.split('/').pop() || `${data.invoiceNumber}.pdf`,
                downloadUrl: signedUrl,
            });
        }
        // Sort by invoiceNumber in memory
        results.sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));
        return results;
    });
}
// ─── Backfill: Generate invoices for existing sales ──────────────────
/**
 * Builds SaleInvoiceData from a raw Firestore sale document.
 * Handles all 3 sale formats (POS/local, online, discogs).
 */
function buildInvoiceFromSaleDoc(saleId, data) {
    var _a, _b, _c, _d, _e, _f;
    const channel = data.channel || 'local';
    // Determine date — different fields depending on channel
    let date;
    if (data.date) {
        date = data.date;
    }
    else if (data.timestamp && data.timestamp.toDate) {
        date = data.timestamp.toDate().toISOString().split('T')[0];
    }
    else {
        date = new Date().toISOString().split('T')[0];
    }
    // Determine total amount
    let totalAmount = data.total_amount || data.total || data.originalTotal || 0;
    // CRITICAL: For Discogs, data.total is often Net Payout. We need Gross.
    if (channel === 'Discogs' || data.discogs_order_id) {
        // If we have originalTotal (Items Subtotal) and shipping, use that sum for Gross.
        if (data.originalTotal !== undefined && data.shipping !== undefined) {
            totalAmount = Number(data.originalTotal) + Number(data.shipping);
        }
    }
    // Determine payment method
    const paymentMethod = data.paymentMethod || data.payment_method || 'Unknown';
    // Customer name
    let customerName;
    if (data.customerName) {
        customerName = data.customerName;
    }
    else if ((_a = data.customer) === null || _a === void 0 ? void 0 : _a.name) {
        customerName = data.customer.name;
    }
    else if ((_b = data.customer) === null || _b === void 0 ? void 0 : _b.firstName) {
        customerName = `${data.customer.firstName} ${data.customer.lastName || ''}`.trim();
    }
    // Customer country
    const customerCountry = ((_d = (_c = data.customer) === null || _c === void 0 ? void 0 : _c.shipping) === null || _d === void 0 ? void 0 : _d.country)
        || ((_e = data.shippingAddress) === null || _e === void 0 ? void 0 : _e.country)
        || ((_f = data.customer) === null || _f === void 0 ? void 0 : _f.country)
        || undefined;
    // Items
    const items = (data.items || []).map((item) => ({
        artist: item.artist || undefined,
        album: item.album || 'Unknown',
        qty: item.qty || item.quantity || 1,
        unitPrice: item.priceAtSale || item.unitPrice || item.price || 0,
        total: (item.priceAtSale || item.unitPrice || item.price || 0) * (item.qty || item.quantity || 1),
    }));
    // Shipping cost
    const shippingCost = data.shipping_cost || data.shipping || 0;
    return {
        saleId,
        date,
        channel: channel,
        paymentMethod,
        customerName,
        customerCountry,
        items,
        totalAmount,
        shippingCost: shippingCost > 0 ? shippingCost : undefined,
    };
}
/**
 * Backfills invoices for all existing sales that don't have one yet.
 * Processes sales sorted by date (chronological) to ensure sequential numbering.
 * Supports batch processing to avoid timeouts.
 * Returns a summary of what was processed.
 */
function backfillInvoices() {
    return __awaiter(this, arguments, void 0, function* (limit = 20) {
        const db = (0, firebaseAdmin_1.getDb)();
        console.log('🔄 Backfill: Step 1 - Fetching existing invoice mappings...');
        const invoicesSnapshot = yield db.collection('invoices').select('saleId').get();
        const invoicedSaleIds = new Set();
        invoicesSnapshot.docs.forEach(doc => {
            const saleId = doc.data().saleId;
            if (saleId)
                invoicedSaleIds.add(saleId);
        });
        console.log(`ℹ️ Found ${invoicedSaleIds.size} existing invoices.`);
        console.log('🔄 Backfill: Step 2 - Scanning sales (lightweight)...');
        // Fetch only necessary fields for filtering and sorting
        // We fetch ALL sales to ensure chronological ordering, but lightweight docs.
        const salesSnapshot = yield db.collection('sales')
            .select('date', 'timestamp', 'status')
            .get();
        console.log(`ℹ️ Scanned ${salesSnapshot.size} total sales.`);
        // 3. Filter to sales that need invoices
        const salesToProcess = [];
        for (const doc of salesSnapshot.docs) {
            if (invoicedSaleIds.has(doc.id))
                continue;
            const data = doc.data();
            const status = (data.status || '').toLowerCase();
            if (status === 'pending' || status === 'cancelled' || status === 'failed')
                continue;
            let date;
            if (data.date) {
                date = data.date;
            }
            else if (data.timestamp && data.timestamp.toDate) {
                date = data.timestamp.toDate().toISOString().split('T')[0];
            }
            else {
                date = '2026-01-01'; // fallback
            }
            salesToProcess.push({ id: doc.id, date });
        }
        // 4. Sort by date
        salesToProcess.sort((a, b) => a.date.localeCompare(b.date));
        console.log(`🔧 Backfill: ${salesToProcess.length} sales need invoices. Processing batch of ${limit}.`);
        const result = {
            total: salesSnapshot.size,
            generated: 0,
            skipped: invoicedSaleIds.size,
            errors: [],
            remaining: Math.max(0, salesToProcess.length - limit)
        };
        // 5. Fetch FULL data only for the batch
        const batch = salesToProcess.slice(0, limit);
        for (const item of batch) {
            try {
                console.log(`🔄 Backfill: Fetching full data for sale ${item.id}...`);
                const saleDoc = yield db.collection('sales').doc(item.id).get();
                if (!saleDoc.exists) {
                    console.warn(`⚠️ Sale ${item.id} not found when fetching full data.`);
                    continue;
                }
                const saleData = saleDoc.data();
                const invoiceData = buildInvoiceFromSaleDoc(item.id, saleData);
                // Skip invalid
                if (invoiceData.items.length === 0 && invoiceData.totalAmount === 0) {
                    console.log(`⏭️ Skipping sale ${item.id}: no items and zero total`);
                    result.skipped++;
                    continue;
                }
                yield generateInvoice(invoiceData);
                result.generated++;
                console.log(`✅ Backfill: Generated invoice for sale ${item.id} (${item.date})`);
            }
            catch (error) {
                console.error(`❌ Backfill: Failed for sale ${item.id}:`, error.message);
                result.errors.push({ saleId: item.id, error: error.message });
            }
        }
        console.log(`🏁 Batch complete: ${result.generated} generated, ${result.errors.length} errors. Remaining: ${result.remaining}`);
        return result;
    });
}
