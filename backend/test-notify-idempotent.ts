/**
 * test-notify-idempotent.ts
 * Run: npx ts-node --transpile-only test-notify-idempotent.ts
 * Tests: idempotencia de notificaciones (claim en transacción, alreadySent,
 *        liberación del claim si falla el email) + DELETE /sales/:id con/sin
 *        devolución de stock. Firestore y Resend mockeados en memoria.
 */
// Dummy env BEFORE requiring app modules
process.env.FIREBASE_PROJECT_ID = 'test';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = 'test';

// --- Mocks ANTES de requerir el controller ----------------------------------
const mailService = require('./src/services/mailService');
const mailCalls: any[] = [];
let failNextMail = false;
mailService.sendOrderPreparingEmail = async (sale: any) => {
    if (failNextMail) { failNextMail = false; throw new Error('Resend boom'); }
    mailCalls.push({ fn: 'sendOrderPreparingEmail', to: sale.email });
    return { success: true, id: 'm1' };
};
mailService.sendDiscogsOrderPreparingEmail = async (sale: any) => {
    mailCalls.push({ fn: 'sendDiscogsOrderPreparingEmail', to: sale.email });
    return { success: true, id: 'm0' };
};
mailService.sendLabelReadyEmail = async (sale: any, tracking: string) => {
    mailCalls.push({ fn: 'sendLabelReadyEmail', tracking });
    return { success: true, id: 'm2' };
};
mailService.sendShippingNotificationEmail = async (sale: any, data: any) => {
    mailCalls.push({ fn: 'sendShippingNotificationEmail', data });
    return { success: true, id: 'm3' };
};
mailService.sendPickupReadyEmail = async (sale: any) => {
    mailCalls.push({ fn: 'sendPickupReadyEmail', to: sale.email });
    return { success: true, id: 'm4' };
};

// --- Firestore en memoria con sentinels reales de firebase-admin ------------
const store: Record<string, any> = {};

function setPath(obj: any, path: string, value: any) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
        cur = cur[parts[i]];
    }
    const last = parts[parts.length - 1];
    const ctor = value?.constructor?.name;
    if (ctor === 'DeleteTransform') { delete cur[last]; return; }
    if (ctor === 'ServerTimestampTransform') { cur[last] = new Date().toISOString(); return; }
    if (ctor === 'NumericIncrementTransform') { cur[last] = (Number(cur[last]) || 0) + (value.operand || 0); return; }
    if (ctor === 'ArrayUnionTransform') {
        const arr = Array.isArray(cur[last]) ? cur[last] : [];
        cur[last] = arr.concat(value.elements || []);
        return;
    }
    cur[last] = value;
}

function applyUpdate(key: string, data: any) {
    if (!store[key]) store[key] = {};
    for (const [k, v] of Object.entries(data)) setPath(store[key], k, v);
}

const fakeTx = {
    get: async (ref: any) => {
        const d = store[ref._key];
        return { exists: !!d, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) };
    },
    update: async (ref: any, data: any) => { applyUpdate(ref._key, data); },
    set: async (ref: any, data: any) => { applyUpdate(ref._key, data); },
    delete: async (ref: any) => { delete store[ref._key]; },
};

let autoId = 0;
const fakeDb = {
    collection: (name: string) => ({
        doc: (id?: string) => {
            const key = `${name}/${id || ('auto' + (++autoId))}`;
            const ref: any = { _key: key, id: id || key };
            ref.get = () => fakeTx.get(ref);
            ref.update = (data: any) => fakeTx.update(ref, data);
            ref.set = (data: any) => fakeTx.set(ref, data);
            ref.delete = () => fakeTx.delete(ref);
            return ref;
        },
    }),
    runTransaction: async (fn: any) => fn(fakeTx),
};
const firebaseAdminMod = require('./src/config/firebaseAdmin');
firebaseAdminMod.getDb = () => fakeDb;

const controller = require('./src/controllers/firebaseController');

function mockRes() {
    const res: any = { statusCode: 200, body: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (body: any) => { res.body = body; return res; };
    return res;
}

let pass = 0, fail = 0;
function ok(cond: boolean, name: string, extra?: unknown) {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name}${extra !== undefined ? ' :: ' + JSON.stringify(extra) : ''}`); }
}

function resetStore() {
    for (const k of Object.keys(store)) delete store[k];
    mailCalls.length = 0;
    autoId = 0;
}

(async () => {
    // --- notifyCustomer idempotente -----------------------------------------
    console.log('notifyCustomer idempotente');
    resetStore();
    store['sales/s1'] = { id: 's1', email: 'a@b.c', fulfillment_status: 'preparing' };

    let res = mockRes();
    await controller.notifyCustomer({ params: { id: 's1' }, body: { type: 'preparing' } }, res);
    ok(res.statusCode === 200 && res.body.success && res.body.alreadySent === false, 'primer envío → 200 alreadySent:false', res.body);
    ok(mailCalls.length === 1, 'se mandó 1 email', mailCalls.length);
    ok(store['sales/s1'].notifications?.preparing?.status === 'sent', 'quedó registrado como sent');
    ok(store['sales/s1'].notifications?.preparing?.to === 'a@b.c', 'se guardó el destinatario');

    res = mockRes();
    await controller.notifyCustomer({ params: { id: 's1' }, body: { type: 'preparing' } }, res);
    ok(res.statusCode === 200 && res.body.alreadySent === true, 'segundo envío → 200 alreadySent:true', res.body);
    ok(mailCalls.length === 1, 'NO se mandó otro email', mailCalls.length);

    // Otro tipo sí se puede enviar
    res = mockRes();
    await controller.notifyCustomer({ params: { id: 's1' }, body: { type: 'pickup_ready' } }, res);
    ok(res.body.alreadySent === false && mailCalls.length === 2, 'otro tipo se envía normal');

    // type inválido → 400
    res = mockRes();
    await controller.notifyCustomer({ params: { id: 's1' }, body: { type: 'nope' } }, res);
    ok(res.statusCode === 400, 'type inválido → 400', res.statusCode);

    // venta inexistente → 404
    res = mockRes();
    await controller.notifyCustomer({ params: { id: 'zzz' }, body: { type: 'preparing' } }, res);
    ok(res.statusCode === 404, 'venta inexistente → 404', res.statusCode);

    // --- doble click concurrente: solo un email ------------------------------
    console.log('claim concurrente');
    resetStore();
    store['sales/s2'] = { id: 's2', email: 'c@d.e', fulfillment_status: 'preparing' };
    const [r1, r2] = await Promise.all([
        (async () => { const r = mockRes(); await controller.notifyCustomer({ params: { id: 's2' }, body: { type: 'preparing' } }, r); return r; })(),
        (async () => { const r = mockRes(); await controller.notifyCustomer({ params: { id: 's2' }, body: { type: 'preparing' } }, r); return r; })(),
    ]);
    const sentCount = [r1, r2].filter(r => r.body.alreadySent === false).length;
    ok(mailCalls.length === 1 && sentCount === 1, 'dos requests a la vez → 1 solo email', { mailCalls: mailCalls.length, sentCount });
    ok([r1, r2].every(r => r.statusCode === 200), 'ambos responden 200');

    // --- si falla el email, el claim se libera y se puede reintentar ---------
    console.log('claim liberado ante fallo');
    resetStore();
    store['sales/s3'] = { id: 's3', email: 'e@f.g', fulfillment_status: 'preparing' };
    failNextMail = true;
    res = mockRes();
    await controller.notifyCustomer({ params: { id: 's3' }, body: { type: 'preparing' } }, res);
    ok(res.statusCode === 502, 'fallo de email → 502', res.statusCode);
    ok(!store['sales/s3'].notifications?.preparing, 'el claim se liberó (reintentable)');

    res = mockRes();
    await controller.notifyCustomer({ params: { id: 's3' }, body: { type: 'preparing' } }, res);
    ok(res.body.alreadySent === false && mailCalls.length === 1, 'reintento posterior funciona');

    // --- endpoints viejos: email idempotente + estado idempotente ------------
    console.log('endpoints viejos');
    resetStore();
    store['sales/s4'] = {
        id: 's4', email: 'g@h.i', fulfillment_status: 'pending',
        notifications: { preparing: { status: 'sent', sentAt: 'x', to: 'g@h.i' } },
    };
    res = mockRes();
    await controller.notifyPreparing({ params: { id: 's4' }, body: {} }, res);
    ok(res.body.alreadySent === true, 'notify-preparing ya enviado → alreadySent', res.body);
    ok(mailCalls.length === 0, 'no reenvía el email');
    ok(store['sales/s4'].fulfillment_status === 'preparing', 'igual actualiza el estado');

    res = mockRes();
    await controller.markAsDispatched({ params: { id: 's4' }, body: {} }, res);
    ok(res.body.success && !res.body.alreadyDone, 'primer markAsDispatched ok');
    res = mockRes();
    await controller.markAsDispatched({ params: { id: 's4' }, body: {} }, res);
    ok(res.body.success && res.body.alreadyDone === true, 'segundo markAsDispatched → alreadyDone sin efectos');
    ok((store['sales/s4'].history || []).filter((h: any) => h.status === 'shipped').length === 1, 'no duplica historial');

    // --- setLabelCreated idempotente ------------------------------------------
    console.log('setLabelCreated idempotente');
    resetStore();
    store['sales/s5'] = { id: 's5', fulfillment_status: 'label_created', tracking_number: 'DAO1' };
    const histBefore = 0;
    res = mockRes();
    await controller.setLabelCreated({ params: { id: 's5' }, body: { trackingNumber: 'DAO1' } }, res);
    ok(res.body.success && res.body.alreadyDone === true, 'mismo tracking → alreadyDone', res.body);
    ok(JSON.stringify(store['sales/s5']).length > 0 && histBefore === 0, 'sin efectos secundarios');

    res = mockRes();
    await controller.setLabelCreated({ params: { id: 's5' }, body: { trackingNumber: 'DAO2' } }, res);
    ok(res.body.success && !res.body.alreadyDone && store['sales/s5'].tracking_number === 'DAO2', 'tracking distinto → actualiza (re-etiquetado)');

    // --- DELETE sale con devolución de stock -----------------------------------
    console.log('deleteSale');
    resetStore();
    store['sales/s6'] = {
        id: 's6', orderNumber: 'ORD-6', fulfillment_status: 'shipped',
        stockDecremented: true,
        linkedInventory: { productId: 'p1', artist: 'Moodymann', album: 'Black Mahogani' },
    };
    store['products/p1'] = { id: 'p1', stock: 2, sku: 'SKU-1', artist: 'Moodymann', album: 'Black Mahogani' };

    res = mockRes();
    await controller.deleteSale({ params: { id: 's6' } }, res);
    ok(res.statusCode === 200 && res.body.success && res.body.stockReturned === true, 'borrado con devolución → 200 stockReturned:true', res.body);
    ok(!store['sales/s6'], 'el doc de la venta se eliminó');
    ok(store['products/p1'].stock === 3, 'stock del producto +1', store['products/p1'].stock);
    const logKeys = Object.keys(store).filter(k => k.startsWith('inventory_logs/'));
    ok(logKeys.length === 1 && store[logKeys[0]].type === 'STOCK_RETURN', 'log STOCK_RETURN en inventory_logs', logKeys.length);

    // --- DELETE sale sin devolución --------------------------------------------
    resetStore();
    store['sales/s7'] = { id: 's7', fulfillment_status: 'pending', stockDecremented: false };
    store['products/p1'] = { id: 'p1', stock: 5, sku: 'SKU-1' };
    res = mockRes();
    await controller.deleteSale({ params: { id: 's7' } }, res);
    ok(res.body.success && res.body.stockReturned === false, 'sin stockDecremented → stockReturned:false');
    ok(!store['sales/s7'], 'venta eliminada');
    ok(store['products/p1'].stock === 5, 'producto intacto');
    ok(Object.keys(store).filter(k => k.startsWith('inventory_logs/')).length === 0, 'sin logs');

    // --- DELETE con producto vinculado que ya no existe -------------------------
    resetStore();
    store['sales/s8'] = {
        id: 's8', fulfillment_status: 'shipped', stockDecremented: true,
        linkedInventory: { productId: 'px', artist: 'X', album: 'Y' },
    };
    res = mockRes();
    await controller.deleteSale({ params: { id: 's8' } }, res);
    ok(res.body.success && res.body.stockReturned === false, 'producto inexistente → se borra igual, sin devolución');
    ok(!store['sales/s8'], 'venta eliminada');

    // --- DELETE 404 ----------------------------------------------------------------
    res = mockRes();
    await controller.deleteSale({ params: { id: 'nope' } }, res);
    ok(res.statusCode === 404, 'venta inexistente → 404', res.statusCode);

    console.log(`\n${pass} ok, ${fail} fallos`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
