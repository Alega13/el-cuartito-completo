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
exports.generateFinancialReport = void 0;
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const exceljs_1 = __importDefault(require("exceljs"));
const generateFinancialReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate y endDate son requeridos' });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Set end to the very end of the day
        end.setHours(23, 59, 59, 999);
        const db = (0, firebaseAdmin_1.getDb)();
        // 1. Fetch Data
        console.log(`Generando reporte desde ${start.toISOString()} hasta ${end.toISOString()}`);
        const salesSnapshot = yield db.collection('sales')
            .where('timestamp', '>=', start)
            .where('timestamp', '<=', end)
            .get();
        const expensesSnapshot = yield db.collection('expenses')
            .where('date', '>=', start.toISOString().split('T')[0])
            .where('date', '<=', end.toISOString().split('T')[0])
            .get();
        // Also check fecha_factura for expenses if date is not used consistently
        const expensesByTimestampSnapshot = yield db.collection('expenses')
            .where('timestamp', '>=', start)
            .where('timestamp', '<=', end)
            .get();
        const extraIncomeSnapshot = yield db.collection('extraIncome')
            .where('date', '>=', start.toISOString().split('T')[0])
            .where('date', '<=', end.toISOString().split('T')[0])
            .get();
        const inventorySnapshot = yield db.collection('products').get();
        const inventory = inventorySnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const consignorsSnapshot = yield db.collection('consignors').get();
        const consignors = consignorsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // 2. Process Data
        let totalRevenue = 0;
        let totalNetProfit = 0;
        let totalShippingCosts = 0;
        let partnersShare = 0;
        let totalStandardVat = 0;
        let totalMarginVat = 0;
        let totalShippingVat = 0;
        let totalShippingIncome = 0;
        let totalPlatformFees = 0;
        const itemBreakdown = [];
        salesSnapshot.docs.forEach(doc => {
            var _a, _b;
            const sale = doc.data();
            const isDiscogs = ((_a = sale.channel) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'discogs';
            const gross = Number(sale.originalTotal) || Number(sale.total_amount) || Number(sale.total) || 0;
            const net = Number(sale.total) || Number(sale.total_amount) || 0;
            const platformFee = isDiscogs ? (gross - net) : 0;
            const shippingCost = Number(sale.shipping_cost) || 0;
            totalRevenue += gross;
            totalShippingCosts += shippingCost;
            totalPlatformFees += platformFee;
            let saleProfit = 0;
            const items = sale.items || [];
            if (items.length > 0) {
                items.forEach((item) => {
                    var _a;
                    const price = Number(item.priceAtSale || item.unitPrice || item.price) || 0;
                    const qty = Number(item.qty || item.quantity) || 1;
                    let itemCost = Number(item.costAtSale || item.cost) || 0;
                    const owner = (item.owner || '').toLowerCase();
                    let origin = item.providerOrigin || item.provider_origin;
                    const totalPrice = price * qty;
                    if (itemCost === 0 || !origin) {
                        const productId = item.productId || item.recordId;
                        const albumName = item.album;
                        const inventoryProduct = inventory.find((p) => (productId && (p.id === productId || p.sku === productId)) ||
                            (albumName && p.album === albumName));
                        if (inventoryProduct) {
                            if (itemCost === 0)
                                itemCost = inventoryProduct.cost || 0;
                            if (!origin)
                                origin = inventoryProduct.provider_origin;
                        }
                    }
                    if (!origin)
                        origin = 'Local_Used';
                    let vatAmount = 0;
                    if (origin === 'EU_B2B' || origin === 'DK_B2B') {
                        vatAmount = totalPrice * 0.20;
                        totalStandardVat += vatAmount;
                    }
                    else {
                        const margin = totalPrice - (itemCost * qty);
                        vatAmount = margin > 0 ? margin * 0.20 : 0;
                        totalMarginVat += vatAmount;
                    }
                    let paidToConsignor = 0;
                    if (owner === 'el cuartito' || owner === '') {
                        itemCost = Number(item.costAtSale || item.cost) || 0;
                    }
                    else {
                        if (itemCost === 0 || isNaN(itemCost)) {
                            const partner = consignors.find((c) => (c.name || '').toLowerCase() === owner);
                            const split = partner ? (partner.agreementSplit || partner.split || 70) : 70;
                            itemCost = (price * (Number(split) || 70)) / 100;
                        }
                        paidToConsignor = (itemCost * qty);
                        partnersShare += paidToConsignor;
                    }
                    const itemProfit = (price - itemCost) * qty;
                    saleProfit += itemProfit;
                    itemBreakdown.push({
                        date: ((_a = sale.timestamp) === null || _a === void 0 ? void 0 : _a.toDate) ? sale.timestamp.toDate() : new Date(sale.timestamp || sale.date),
                        orderId: doc.id,
                        channel: sale.channel || 'Shop',
                        artist: item.artist || 'N/A',
                        album: item.album || 'N/A',
                        price: price,
                        qty: qty,
                        totalPrice: totalPrice,
                        owner: owner || 'el cuartito',
                        origin: origin,
                        costOrSplit: itemCost * qty,
                        vat: vatAmount,
                        profit: itemProfit - (platformFee > 0 ? platformFee / items.length : 0) // rough distribution of platform fee
                    });
                });
            }
            else {
                saleProfit = gross;
                totalStandardVat += (gross * 0.20);
                itemBreakdown.push({
                    date: ((_b = sale.timestamp) === null || _b === void 0 ? void 0 : _b.toDate) ? sale.timestamp.toDate() : new Date(sale.timestamp || sale.date),
                    orderId: doc.id,
                    channel: sale.channel || 'Shop',
                    artist: 'Venta Genérica',
                    album: 'Venta Genérica',
                    price: gross,
                    qty: 1,
                    totalPrice: gross,
                    owner: 'el cuartito',
                    origin: 'Local_Used',
                    costOrSplit: 0,
                    vat: gross * 0.20,
                    profit: gross - platformFee
                });
            }
            const sIncome = parseFloat(sale.shipping_income || sale.shipping || sale.shipping_cost || 0);
            if (sIncome > 0) {
                totalShippingVat += (sIncome * 0.20);
                totalShippingIncome += sIncome;
            }
            totalNetProfit += (saleProfit - platformFee);
        });
        // Extra Income
        let extraIncomeTotal = 0;
        extraIncomeSnapshot.docs.forEach(doc => {
            const e = doc.data();
            const amt = Number(e.amount) || 0;
            const vat = Number(e.vatAmount) || 0;
            extraIncomeTotal += amt;
            totalRevenue += amt;
            totalNetProfit += amt;
            totalStandardVat += vat;
        });
        // Expenses
        const allExpensesMap = new Map();
        expensesSnapshot.docs.forEach(doc => allExpensesMap.set(doc.id, doc.data()));
        expensesByTimestampSnapshot.docs.forEach(doc => allExpensesMap.set(doc.id, doc.data()));
        const allExpenses = Array.from(allExpensesMap.values());
        let periodExpenses = 0;
        let totalInputVat = 0;
        const expensesByCategory = {};
        allExpenses.forEach(e => {
            const amount = Number(e.monto_total || e.amount) || 0;
            periodExpenses += amount;
            const category = (e.categoria || e.category || e.categoria_tipo || 'Otros').toLowerCase();
            expensesByCategory[category] = (expensesByCategory[category] || 0) + amount;
            const isDeductible = e.categoria_tipo === 'operativo' || e.categoria_tipo === 'stock_nuevo' || e.is_vat_deductible;
            if (isDeductible) {
                totalInputVat += parseFloat(e.monto_iva) || 0;
            }
        });
        // Add platform fees as an expense category
        if (totalPlatformFees > 0) {
            periodExpenses += totalPlatformFees;
            expensesByCategory['comisiones de plataforma (discogs)'] = totalPlatformFees;
        }
        const netProfitActual = totalNetProfit - (totalStandardVat + totalMarginVat + totalShippingVat - totalInputVat) - periodExpenses + totalPlatformFees;
        // wait, I added totalPlatformFees to periodExpenses, but earlier I did `totalNetProfit += (saleProfit - platformFee);`
        // If I now include platform fees in `periodExpenses`, it will be subtracted TWICE!
        // To fix this, I must subtract totalPlatformFees from the old equation since I artificially added it to periodExpenses.
        // Or simply:
        const taxAmount = (totalStandardVat + totalMarginVat + totalShippingVat) - totalInputVat;
        // 3. Generate Excel
        const workbook = new exceljs_1.default.Workbook();
        workbook.creator = 'El Cuartito Admin';
        workbook.created = new Date();
        // Sheet 1: Resumen
        const sheetResumen = workbook.addWorksheet('Resumen Financiero');
        sheetResumen.columns = [
            { header: 'Concepto', key: 'concepto', width: 40 },
            { header: 'Monto', key: 'monto', width: 20 }
        ];
        sheetResumen.addRow({ concepto: 'Ingresos Brutos (Ventas)', monto: totalRevenue - extraIncomeTotal });
        sheetResumen.addRow({ concepto: 'Ingresos Extra', monto: extraIncomeTotal });
        sheetResumen.addRow({ concepto: 'Total Ingresos', monto: totalRevenue });
        sheetResumen.addRow({});
        sheetResumen.addRow({ concepto: 'Gastos Operativos (Total)', monto: periodExpenses });
        Object.entries(expensesByCategory).forEach(([cat, amt]) => {
            const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
            sheetResumen.addRow({ concepto: `   - ${catName}`, monto: amt });
        });
        sheetResumen.addRow({});
        sheetResumen.addRow({ concepto: 'Impuestos Estimados (Moms Tilsvar)', monto: taxAmount });
        sheetResumen.addRow({ concepto: 'Pago a Consignadores', monto: partnersShare });
        sheetResumen.addRow({});
        sheetResumen.addRow({ concepto: 'Ganancia Neta Total', monto: netProfitActual });
        // Styling Sheet 1
        sheetResumen.getRow(1).font = { bold: true };
        sheetResumen.getColumn('B').numFmt = '#,##0.00 [$DKK]';
        // Sheet 2: Desglose por Ítem
        const sheetItems = workbook.addWorksheet('Desglose de Ventas');
        sheetItems.columns = [
            { header: 'Fecha', key: 'date', width: 15 },
            { header: 'Orden', key: 'orderId', width: 20 },
            { header: 'Canal', key: 'channel', width: 15 },
            { header: 'Artista', key: 'artist', width: 30 },
            { header: 'Álbum', key: 'album', width: 30 },
            { header: 'Precio Final', key: 'totalPrice', width: 15 },
            { header: 'Propietario', key: 'owner', width: 20 },
            { header: 'Costo/Consignación', key: 'costOrSplit', width: 20 },
            { header: 'IVA Estimado', key: 'vat', width: 15 },
            { header: 'Ganancia Retenida', key: 'profit', width: 20 }
        ];
        itemBreakdown.sort((a, b) => b.date.getTime() - a.date.getTime()).forEach(item => {
            sheetItems.addRow({
                date: item.date,
                orderId: item.orderId,
                channel: item.channel,
                artist: item.artist,
                album: item.album,
                totalPrice: item.totalPrice,
                owner: item.owner,
                costOrSplit: item.costOrSplit,
                vat: item.vat,
                profit: item.profit
            });
        });
        sheetItems.getRow(1).font = { bold: true };
        ['F', 'H', 'I', 'J'].forEach(col => {
            sheetItems.getColumn(col).numFmt = '#,##0.00 [$DKK]';
        });
        // Sheet 3: Estructura Impositiva
        const sheetTaxes = workbook.addWorksheet('Estructura Impositiva');
        sheetTaxes.columns = [
            { header: 'Concepto IVA', key: 'concepto', width: 40 },
            { header: 'Monto', key: 'monto', width: 20 }
        ];
        sheetTaxes.addRow({ concepto: 'IVA Estándar Generado (20% sobre precio)', monto: totalStandardVat });
        sheetTaxes.addRow({ concepto: 'IVA Margen Generado (20% sobre margen)', monto: totalMarginVat });
        sheetTaxes.addRow({ concepto: 'IVA de Envíos', monto: totalShippingVat });
        sheetTaxes.addRow({ concepto: 'Total IVA a Pagar (Liability)', monto: totalStandardVat + totalMarginVat + totalShippingVat });
        sheetTaxes.addRow({});
        sheetTaxes.addRow({ concepto: 'IVA Deducible (Gastos)', monto: totalInputVat });
        sheetTaxes.addRow({});
        sheetTaxes.addRow({ concepto: 'Moms Tilsvar Estimado (Neto a Pagar)', monto: taxAmount });
        sheetTaxes.getRow(1).font = { bold: true };
        sheetTaxes.getColumn('B').numFmt = '#,##0.00 [$DKK]';
        // Write to buffer and send
        const buffer = yield workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Reporte_Financiero_${start.toISOString().split('T')[0]}_al_${end.toISOString().split('T')[0]}.xlsx"`);
        res.send(Buffer.from(buffer));
    }
    catch (error) {
        console.error('Error generando reporte financiero:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.generateFinancialReport = generateFinancialReport;
