/**
 * test-shipping-notify.ts
 * Run: npx ts-node --transpile-only test-shipping-notify.ts
 * Tests: setLabelCreated + notifyCustomer (Firestore y templates mockeados).
 * No toca producción: todo es en memoria.
 */
// Dummy env BEFORE requiring app modules (env.ts/firebaseAdmin lo agradecen)
process.env.FIREBASE_PROJECT_ID = 'test';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = 'test';

// --- Mocks ANTES de requerir el controller ----------------------------------
const mailService = require('./src/services/mailService');
const mailCalls: any[] = [];
mailService.sendOrderPreparingEmail = async (sale: any) => { mailCalls.push({ fn: 'sendOrderPreparingEmail', sale }); return { success: true, id: 'm1' }; };
mailService.sendLabelReadyEmail = async (sale: any, tracking: string) => { mailCalls.push({ fn: 'sendLabelReadyEmail', tracking }); return { success: true, id: 'm2' }; };
mailService.sendShippingNotificationEmail = async (sale: any, data: any) => { mailCalls.push({ fn: 'sendShippingNotificationEmail', data }); return { success: true, id: 'm3' }; };
mailService.sendPickupReadyEmail = async (sale: any) => { mailCalls.push({ fn: 'sendPickupReadyEmail', sale }); return { success: true, id: 'm4' }; };

const updates: any[] = [];
const saleDocs: Record<string, any> = {
    'sale1': { exists: true, data: () => ({ id: 'sale1', tracking_number: 'DAO123', label_carrier: 'DAO' }) },
    'sale2': { exists: true, data: () => ({ id: 'sale2' }) }, // sin tracking
};
const fakeDb = {
    collection: (_name: string) => ({
        doc: (id: string) => ({
            get: async () => saleDocs[id] || { exists: false },
            update: async (data: any) => { updates.push({ id, data }); },
        }),
    }),
    // Los endpoints nuevos reclaman la notificación en transacción
    runTransaction: async (fn: any) => {
        const tx = {
            get: (ref: any) => ref.get(),
            update: (ref: any, data: any) => ref.update(data),
            set: (ref: any, data: any) => ref.update(data),
            delete: (_ref: any) => Promise.resolve(),
        };
        return fn(tx);
    },
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

(async () => {
    // --- setLabelCreated ----------------------------------------------------
    console.log('setLabelCreated');
    let res = mockRes();
    await controller.setLabelCreated({ params: { id: 'sale1' }, body: {} }, res);
    ok(res.statusCode === 400, 'sin trackingNumber → 400', res.statusCode);

    res = mockRes();
    await controller.setLabelCreated(
        { params: { id: 'sale1' }, body: { trackingNumber: '  DAO999 ', carrier: 'DAO', labelUrl: 'http://x/y.pdf' } },
        res
    );
    const upd = updates[updates.length - 1];
    ok(res.statusCode === 200 && res.body.success === true, 'guarda OK → 200', res.body);
    ok(upd.data.tracking_number === 'DAO999', 'tracking trimmeado', upd.data.tracking_number);
    ok(upd.data.fulfillment_status === 'label_created', 'estado = label_created', upd.data.fulfillment_status);
    ok(upd.data.label_carrier === 'DAO', 'guarda carrier');
    ok(upd.data.label_url === 'http://x/y.pdf', 'guarda label_url');
    ok(upd.data.history !== undefined, 'agrega entrada al historial');

    res = mockRes();
    await controller.setLabelCreated({ params: { id: 'nope' }, body: { trackingNumber: 'X' } }, res);
    ok(res.statusCode === 404, 'venta inexistente → 404', res.statusCode);

    // --- notifyCustomer -----------------------------------------------------
    console.log('notifyCustomer');
    mailCalls.length = 0;

    res = mockRes();
    await controller.notifyCustomer({ params: { id: 'sale1' }, body: { type: 'bogus' } }, res);
    ok(res.statusCode === 400, 'type inválido → 400', res.statusCode);

    res = mockRes();
    await controller.notifyCustomer({ params: { id: 'sale1' }, body: { type: 'preparing' } }, res);
    ok(res.statusCode === 200 && mailCalls.some(c => c.fn === 'sendOrderPreparingEmail'), 'preparing → template genérico');

    res = mockRes();
    await controller.notifyCustomer({ params: { id: 'sale1' }, body: { type: 'label_created' } }, res);
    ok(res.statusCode === 200 && mailCalls.some(c => c.fn === 'sendLabelReadyEmail' && c.tracking === 'DAO123'), 'label_created → template con tracking');

    res = mockRes();
    await controller.notifyCustomer({ params: { id: 'sale2' }, body: { type: 'label_created' } }, res);
    ok(res.statusCode === 400, 'label_created sin tracking → 400', res.statusCode);

    res = mockRes();
    await controller.notifyCustomer({ params: { id: 'sale1' }, body: { type: 'shipped' } }, res);
    ok(res.statusCode === 200 && mailCalls.some(c => c.fn === 'sendShippingNotificationEmail' && c.data.tracking_number === 'DAO123'), 'shipped → template con tracking');

    res = mockRes();
    await controller.notifyCustomer({ params: { id: 'sale1' }, body: { type: 'pickup_ready' } }, res);
    ok(res.statusCode === 200 && mailCalls.some(c => c.fn === 'sendPickupReadyEmail'), 'pickup_ready → template retiro');

    res = mockRes();
    await controller.notifyCustomer({ params: { id: 'nope' }, body: { type: 'preparing' } }, res);
    ok(res.statusCode === 404, 'venta inexistente → 404', res.statusCode);

    // notify es puro aviso: nunca cambia fulfillment_status
    const statusChanges = updates.filter(u => u.data.fulfillment_status && u.data.fulfillment_status !== 'label_created');
    ok(statusChanges.length === 0, 'notify no cambia fulfillment_status');

    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})();
