/**
 * Invoice Service — Brugtmoms-compliant PDF generation
 * Generates invoices for all sales (POS, Webshop, Discogs),
 * uploads to Firebase Storage with quarterly folder structure,
 * and maintains sequential numbering per year.
 */

import PDFDocument from 'pdfkit';
import * as admin from 'firebase-admin';
import { getDb } from '../config/firebaseAdmin';
import path from 'path';
import fs from 'fs';

// ─── Types ───────────────────────────────────────────────────────────

export interface InvoiceItem {
    artist?: string;
    album: string;
    qty: number;
    unitPrice: number;
    total: number;
}

export interface SaleInvoiceData {
    saleId: string;
    date: string;                    // YYYY-MM-DD
    channel: 'local' | 'online' | 'discogs';
    paymentMethod: string;           // Cash, MobilePay, Card, Discogs Payment
    customerName?: string;
    customerCountry?: string;
    items: InvoiceItem[];
    totalAmount: number;
    shippingCost?: number;
}

export interface InvoiceResult {
    invoiceNumber: string;
    storagePath: string;
    downloadUrl: string;
    firestoreId: string;
}

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

async function getNextInvoiceNumber(year: number): Promise<string> {
    const db = getDb();
    const counterRef = db.collection('invoice_counters').doc(String(year));

    const result = await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
        const counterDoc = await transaction.get(counterRef);

        let nextNumber = 1;
        if (counterDoc.exists) {
            nextNumber = (counterDoc.data()?.current || 0) + 1;
        }

        transaction.set(counterRef, { current: nextNumber, year }, { merge: true });

        return nextNumber;
    });

    return `${year}-${String(result).padStart(4, '0')}`;
}

// ─── Helper: Get quarter from date ───────────────────────────────────

function getQuarter(dateStr: string): number {
    const month = new Date(dateStr).getMonth(); // 0-11
    return Math.floor(month / 3) + 1;
}

// ─── Helper: Sanitize filename ───────────────────────────────────────

function sanitizeFilename(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\-_]/g, '')
        .substring(0, 40);
}

// ─── Helper: Map payment method for display ──────────────────────────

function formatPaymentMethod(method: string): string {
    const map: Record<string, string> = {
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

function formatChannel(channel: string): string {
    const map: Record<string, string> = {
        'local': 'Butikssalg (In-Store)',
        'online': 'Webshop',
        'discogs': 'Discogs',
    };
    return map[channel] || channel;
}

// ─── Core: Generate PDF ──────────────────────────────────────────────

function generatePDFBuffer(
    invoiceNumber: string,
    sale: SaleInvoiceData
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: `Invoice ${invoiceNumber}`,
                Author: BUSINESS.name,
            }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - 100; // 50 margin each side

        // ── Logo ──
        const logoPath = path.resolve(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
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
        doc.moveTo(50, 120).lineTo(50 + pageWidth, 120).strokeColor('#E2E8F0').lineWidth(1).stroke();

        // ── Invoice title ──
        doc.fontSize(22).fillColor('#1E293B').font('Helvetica-Bold');
        doc.text('KVITTERING', 50, 140); // "Receipt" in Danish
        doc.fontSize(10).fillColor('#94A3B8').font('Helvetica');
        doc.text(`Salgsbilag / Receipt`, 50, 168);

        // ── Invoice metadata (right side) ──
        const metaX = 350;
        const metaLabelW = 100;
        const metaValueW = 100;

        doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold');
        doc.text('Faktura Nr.:', metaX, 140, { width: metaLabelW });
        doc.text('Dato:', metaX, 156, { width: metaLabelW });
        doc.text('Kanal:', metaX, 172, { width: metaLabelW });
        doc.text('Betaling:', metaX, 188, { width: metaLabelW });

        doc.font('Helvetica').fillColor('#1E293B');
        doc.text(invoiceNumber, metaX + metaLabelW, 140, { width: metaValueW });
        doc.text(sale.date, metaX + metaLabelW, 156, { width: metaValueW });
        doc.text(formatChannel(sale.channel), metaX + metaLabelW, 172, { width: metaValueW });
        doc.text(formatPaymentMethod(sale.paymentMethod), metaX + metaLabelW, 188, { width: metaValueW });

        // ── Customer ──
        let yPos = 220;
        doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold');
        doc.text('Kunde / Customer:', 50, yPos);
        doc.font('Helvetica').fillColor('#1E293B');
        const customerDisplay = sale.customerName || 'Butikskunde (Walk-in)';
        doc.text(customerDisplay, 160, yPos);
        if (sale.customerCountry) {
            doc.text(sale.customerCountry, 160, yPos + 14);
            yPos += 14;
        }

        // ── Items table ──
        yPos += 30;

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
        doc.font('Helvetica').fillColor('#334155').fontSize(9);
        sale.items.forEach((item, idx) => {
            const description = item.artist ? `${item.artist} — ${item.album}` : item.album;

            doc.text(String(idx + 1), 50, yPos, { width: 25 });
            doc.text(description, 75, yPos, { width: 250 });
            doc.text(String(item.qty), 335, yPos, { width: 40, align: 'center' });
            doc.text(`${item.unitPrice.toFixed(2)} DKK`, 385, yPos, { width: 70, align: 'right' });
            doc.text(`${item.total.toFixed(2)} DKK`, 460, yPos, { width: 85, align: 'right' });

            yPos += 20;
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
            yPos += 20;
        }

        // ── Total ──
        yPos += 5;
        doc.moveTo(350, yPos).lineTo(50 + pageWidth, yPos).strokeColor(BRAND_ORANGE).lineWidth(2).stroke();
        yPos += 10;

        doc.fontSize(12).fillColor('#1E293B').font('Helvetica-Bold');
        doc.text('TOTAL:', 350, yPos, { width: 105, align: 'right' });
        doc.fillColor(BRAND_ORANGE);
        doc.text(`${sale.totalAmount.toFixed(2)} DKK`, 460, yPos, { width: 85, align: 'right' });

        // ── Brugtmoms legal notice ──
        yPos += 50;
        doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        yPos += 15;

        // Legal box
        const boxY = yPos;
        const boxHeight = 55;
        doc.roundedRect(50, boxY, pageWidth, boxHeight, 4)
            .fillColor('#FFF7ED')
            .fill();

        doc.roundedRect(50, boxY, pageWidth, boxHeight, 4)
            .strokeColor('#FDBA74')
            .lineWidth(1)
            .stroke();

        doc.fontSize(7).fillColor(BRAND_ORANGE).font('Helvetica-Bold');
        doc.text('BRUGTMOMS / SECONDHAND GOODS MARGIN SCHEME', 62, boxY + 10, { width: pageWidth - 24 });

        doc.fontSize(8).fillColor('#9A3412').font('Helvetica');
        doc.text(BRUGTMOMS_TEXT, 62, boxY + 24, { width: pageWidth - 24 });

        doc.fontSize(7).fillColor('#94A3B8');
        doc.text('(The goods are sold under the special rules for second-hand goods — the buyer has no VAT deduction.)', 62, boxY + 38, { width: pageWidth - 24 });

        // ── Footer ──
        const footerY = doc.page.height - 60;
        doc.fontSize(7).fillColor('#CBD5E1').font('Helvetica');
        doc.text(
            `${BUSINESS.name} · ${BUSINESS.address}, ${BUSINESS.city} · ${BUSINESS.cvr}`,
            50, footerY,
            { align: 'center', width: pageWidth }
        );
        doc.text(
            `Invoice ${invoiceNumber} · Generated ${new Date().toISOString().split('T')[0]}`,
            50, footerY + 12,
            { align: 'center', width: pageWidth }
        );

        doc.end();
    });
}

// ─── Core: Upload to Firebase Storage ────────────────────────────────

async function uploadToStorage(
    pdfBuffer: Buffer,
    storagePath: string
): Promise<string> {
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    await file.save(pdfBuffer, {
        metadata: {
            contentType: 'application/pdf',
            cacheControl: 'public, max-age=31536000',
        },
    });

    // Make the file publicly accessible via a signed URL (valid for 10 years)
    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '2036-01-01',
    });

    return signedUrl;
}

// ─── Core: Save invoice metadata to Firestore ───────────────────────

async function saveInvoiceMetadata(
    invoiceNumber: string,
    saleId: string,
    sale: SaleInvoiceData,
    storagePath: string,
    downloadUrl: string
): Promise<string> {
    const db = getDb();
    const year = new Date(sale.date).getFullYear();
    const quarter = getQuarter(sale.date);

    const docRef = await db.collection('invoices').add({
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
}

// ─── Main: Generate Invoice for a Sale ───────────────────────────────

export async function generateInvoice(sale: SaleInvoiceData): Promise<InvoiceResult> {
    const year = new Date(sale.date).getFullYear();
    const quarter = getQuarter(sale.date);

    // 1. Get sequential invoice number
    const invoiceNumber = await getNextInvoiceNumber(year);

    // 2. Generate PDF
    const pdfBuffer = await generatePDFBuffer(invoiceNumber, sale);

    // 3. Build storage path
    const albumSlug = sanitizeFilename(sale.items[0]?.album || 'Unknown');
    const totalStr = Math.round(sale.totalAmount);
    const fileName = `${sale.date}_${invoiceNumber}_${albumSlug}_${totalStr}DKK.pdf`;
    const storagePath = `Contabilidad_ElCuartito_${year}/Ventas_Trimestre_${quarter}/${fileName}`;

    // 4. Upload to Firebase Storage
    const downloadUrl = await uploadToStorage(pdfBuffer, storagePath);

    // 5. Save metadata to Firestore
    const firestoreId = await saveInvoiceMetadata(
        invoiceNumber,
        sale.saleId,
        sale,
        storagePath,
        downloadUrl
    );

    console.log(`📄 Factura ${invoiceNumber} guardada en ${storagePath}. Cumple normativa Brugtmoms.`);

    return {
        invoiceNumber,
        storagePath,
        downloadUrl,
        firestoreId,
    };
}

// ─── Utility: Build SaleInvoiceData from various sale formats ────────

/**
 * Builds invoice data from a POS/manual sale (createSale format)
 */
export function buildInvoiceFromPOSSale(
    saleId: string,
    items: any[],
    channel: string,
    totalAmount: number,
    paymentMethod: string,
    customerName?: string,
): SaleInvoiceData {
    const now = new Date();
    return {
        saleId,
        date: now.toISOString().split('T')[0],
        channel: (channel as any) || 'local',
        paymentMethod: paymentMethod || 'CASH',
        customerName: customerName || undefined,
        items: items.map(item => ({
            artist: item.artist || undefined,
            album: item.album || 'Unknown',
            qty: item.qty || item.quantity || 1,
            unitPrice: item.priceAtSale || item.price || item.unitPrice || 0,
            total: (item.priceAtSale || item.price || item.unitPrice || 0) * (item.qty || item.quantity || 1),
        })),
        totalAmount,
    };
}

/**
 * Builds invoice data from a Stripe webhook sale (webshop)
 */
export function buildInvoiceFromWebshopSale(
    saleId: string,
    saleData: any,
): SaleInvoiceData {
    const customerName = saleData.customer?.name
        || saleData.customer?.firstName
        ? `${saleData.customer.firstName} ${saleData.customer.lastName || ''}`.trim()
        : undefined;
    const customerCountry = saleData.customer?.shipping?.country
        || saleData.customer?.country
        || saleData.shipping_method?.method
        || undefined;

    return {
        saleId,
        date: saleData.date || new Date().toISOString().split('T')[0],
        channel: 'online',
        paymentMethod: saleData.payment_method || 'Card',
        customerName,
        customerCountry,
        items: (saleData.items || []).map((item: any) => ({
            artist: item.artist || undefined,
            album: item.album || 'Unknown',
            qty: item.quantity || 1,
            unitPrice: item.unitPrice || item.priceAtSale || 0,
            total: (item.unitPrice || item.priceAtSale || 0) * (item.quantity || 1),
        })),
        totalAmount: saleData.total_amount || 0,
        shippingCost: saleData.shipping_cost || 0,
    };
}

/**
 * Builds invoice data from a Discogs order sync
 */
export function buildInvoiceFromDiscogsSale(
    saleId: string,
    orderData: any,
    items: any[],
    totalAmount: number,
    shippingCost: number,
): SaleInvoiceData {
    return {
        saleId,
        date: orderData.date || new Date().toISOString().split('T')[0],
        channel: 'discogs',
        paymentMethod: 'Discogs Payment',
        customerName: orderData.customerName || orderData.buyer?.username || 'Discogs Buyer',
        customerCountry: orderData.shippingAddress?.country || undefined,
        items: items.map(item => ({
            artist: item.artist || undefined,
            album: item.album || 'Unknown',
            qty: item.qty || 1,
            unitPrice: item.priceAtSale || 0,
            total: (item.priceAtSale || 0) * (item.qty || 1),
        })),
        totalAmount,
        shippingCost,
    };
}

// ─── API: List invoices ──────────────────────────────────────────────

export async function listInvoices(
    year?: number,
    quarter?: number
): Promise<any[]> {
    const db = getDb();
    let query: admin.firestore.Query = db.collection('invoices')
        .orderBy('createdAt', 'desc');

    if (year) {
        query = query.where('year', '==', year);
    }
    if (quarter) {
        query = query.where('quarter', '==', quarter);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));
}

// ─── API: Get download URL for a specific invoice ────────────────────

export async function getInvoiceDownloadUrl(invoiceId: string): Promise<string | null> {
    const db = getDb();
    const doc = await db.collection('invoices').doc(invoiceId).get();

    if (!doc.exists) return null;

    const data = doc.data();
    if (!data?.storagePath) return null;

    // Refresh signed URL
    const bucket = admin.storage().bucket();
    const file = bucket.file(data.storagePath);

    const [exists] = await file.exists();
    if (!exists) return null;

    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return signedUrl;
}

// ─── API: Get all PDFs for a quarter as individual URLs ──────────────

export async function getQuarterInvoices(
    year: number,
    quarter: number
): Promise<Array<{ invoiceNumber: string; fileName: string; downloadUrl: string }>> {
    const db = getDb();
    const snapshot = await db.collection('invoices')
        .where('year', '==', year)
        .where('quarter', '==', quarter)
        .orderBy('invoiceNumber', 'asc')
        .get();

    const bucket = admin.storage().bucket();
    const results = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.storagePath) continue;

        const file = bucket.file(data.storagePath);
        const [exists] = await file.exists();
        if (!exists) continue;

        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        results.push({
            invoiceNumber: data.invoiceNumber,
            fileName: data.storagePath.split('/').pop() || `${data.invoiceNumber}.pdf`,
            downloadUrl: signedUrl,
        });
    }

    return results;
}

// ─── Backfill: Generate invoices for existing sales ──────────────────

/**
 * Builds SaleInvoiceData from a raw Firestore sale document.
 * Handles all 3 sale formats (POS/local, online, discogs).
 */
function buildInvoiceFromSaleDoc(saleId: string, data: any): SaleInvoiceData {
    const channel = data.channel || 'local';

    // Determine date — different fields depending on channel
    let date: string;
    if (data.date) {
        date = data.date;
    } else if (data.timestamp && data.timestamp.toDate) {
        date = data.timestamp.toDate().toISOString().split('T')[0];
    } else {
        date = new Date().toISOString().split('T')[0];
    }

    // Determine total amount
    const totalAmount = data.total_amount || data.total || data.originalTotal || 0;

    // Determine payment method
    const paymentMethod = data.paymentMethod || data.payment_method || 'Unknown';

    // Customer name
    let customerName: string | undefined;
    if (data.customerName) {
        customerName = data.customerName;
    } else if (data.customer?.name) {
        customerName = data.customer.name;
    } else if (data.customer?.firstName) {
        customerName = `${data.customer.firstName} ${data.customer.lastName || ''}`.trim();
    }

    // Customer country
    const customerCountry = data.customer?.shipping?.country
        || data.shippingAddress?.country
        || data.customer?.country
        || undefined;

    // Items
    const items: InvoiceItem[] = (data.items || []).map((item: any) => ({
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
        channel: channel as any,
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
export async function backfillInvoices(limit: number = 20): Promise<{
    total: number;
    generated: number;
    skipped: number;
    errors: Array<{ saleId: string; error: string }>;
    remaining: number;
}> {
    const db = getDb();

    // 1. Fetch all existing invoices to know which sales already have one
    // Optimization: In a real large-scale system, we should query sales where 'invoice_status' is missing,
    // but for this migration, fetching all invoice IDs is acceptable (assuming < 10k invoices).
    const invoicesSnapshot = await db.collection('invoices').select('saleId').get();
    const invoicedSaleIds = new Set<string>();
    invoicesSnapshot.docs.forEach(doc => {
        const saleId = doc.data().saleId;
        if (saleId) invoicedSaleIds.add(saleId);
    });

    // 2. Fetch all sales (we have to fetch all to sort them chronologically for correct numbering)
    // Optimization: We could use a cursor, but we need global sorting by date for the numbering to be correct.
    const salesSnapshot = await db.collection('sales').select('date', 'timestamp', 'status', 'channel', 'items', 'total_amount', 'total', 'originalTotal', 'paymentMethod', 'customerName', 'customer', 'shippingAddress', 'shipping_cost', 'shipping').get();

    // 3. Filter to sales that need invoices, skip PENDING/cancelled
    const salesToProcess: Array<{ id: string; data: any; date: string }> = [];

    for (const doc of salesSnapshot.docs) {
        // Skip if already has invoice
        if (invoicedSaleIds.has(doc.id)) continue;

        const data = doc.data();

        // Skip pending / cancelled sales
        const status = (data.status || '').toLowerCase();
        if (status === 'pending' || status === 'cancelled' || status === 'failed') continue;

        // Determine date for sorting
        let date: string;
        if (data.date) {
            date = data.date;
        } else if (data.timestamp && data.timestamp.toDate) {
            date = data.timestamp.toDate().toISOString().split('T')[0];
        } else {
            date = '2026-01-01'; // fallback
        }

        salesToProcess.push({ id: doc.id, data, date });
    }

    // 4. Sort by date (chronological) to ensure numbering is in order
    salesToProcess.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`🔧 Backfill: ${salesToProcess.length} sales need invoices. Processing batch of ${limit}.`);

    // 5. Generate invoices sequentially (one at a time for numbering integrity)
    const result = {
        total: salesSnapshot.size,
        generated: 0,
        skipped: invoicedSaleIds.size,
        errors: [] as Array<{ saleId: string; error: string }>,
        remaining: Math.max(0, salesToProcess.length - limit)
    };

    // Process only up to the limit to avoid timeout
    const batch = salesToProcess.slice(0, limit);

    for (const sale of batch) {
        try {
            const invoiceData = buildInvoiceFromSaleDoc(sale.id, sale.data);

            // Skip sales with no items or zero total
            if (invoiceData.items.length === 0 && invoiceData.totalAmount === 0) {
                console.log(`⏭️ Skipping sale ${sale.id}: no items and zero total`);
                result.skipped++;
                continue;
            }

            await generateInvoice(invoiceData);
            result.generated++;
            console.log(`✅ Backfill: Generated invoice for sale ${sale.id} (${sale.date})`);
        } catch (error: any) {
            console.error(`❌ Backfill: Failed for sale ${sale.id}:`, error.message);
            result.errors.push({ saleId: sale.id, error: error.message });
        }
    }

    console.log(`🏁 Batch complete: ${result.generated} generated, ${result.errors.length} errors. Remaining: ${salesToProcess.length - batch.length}`);
    return {
        ...result,
        remaining: salesToProcess.length - batch.length
    };
}
