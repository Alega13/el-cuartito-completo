/**
 * test-shipping-frontend.cjs
 * Run: node test-shipping-frontend.cjs
 * Extrae los métodos REALES de admin/app.js y testea la máquina de estados del
 * kanban + detección de pickup, sin DOM.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');

// Extrae el cuerpo de un método `name(args) { ... }` (indentado a 4 espacios)
function extractMethod(name) {
    const startMark = `    ${name}(`;
    const start = src.indexOf(startMark);
    if (start < 0) throw new Error(`método no encontrado: ${name}`);
    const braceOpen = src.indexOf('{', start);
    let depth = 0;
    for (let i = braceOpen; i < src.length; i++) {
        if (src[i] === '{') depth++;
        if (src[i] === '}') { depth--; if (depth === 0) return src.slice(braceOpen + 1, i); }
    }
    throw new Error(`llave sin cerrar: ${name}`);
}

const shipKanbanColumnBody = extractMethod('shipKanbanColumn');
const isPickupOrderBody = extractMethod('isPickupOrder');

function makeCtx(issues = []) {
    return {
        getShippingIssues: () => issues,
    };
}
const shipKanbanColumn = new Function('s', shipKanbanColumnBody).bind(makeCtx());
const shipKanbanColumnWithIssues = new Function('s', shipKanbanColumnBody).bind(makeCtx(['x']));
const isPickupOrder = new Function('s', isPickupOrderBody);

let pass = 0, fail = 0;
function ok(cond, name, extra) {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name}${extra !== undefined ? ' :: ' + JSON.stringify(extra) : ''}`); }
}

console.log('shipKanbanColumn');
ok(shipKanbanColumn({}) === 'preparar', 'sin estado → preparar');
ok(shipKanbanColumn({ fulfillment_status: 'preparing' }) === 'etiqueta', 'preparing → etiqueta');
ok(shipKanbanColumn({ fulfillment_status: 'label_created' }) === 'etiqueta', 'label_created → etiqueta (NUEVO)');
ok(shipKanbanColumn({ fulfillment_status: 'ready_for_pickup' }) === 'etiqueta', 'ready_for_pickup → etiqueta');
ok(shipKanbanColumn({ fulfillment_status: 'in_transit' }) === 'etiqueta', 'in_transit → etiqueta');
ok(shipKanbanColumn({ fulfillment_status: 'shipped' }) === 'despachado', 'shipped → despachado');
ok(shipKanbanColumn({ fulfillment_status: 'picked_up' }) === 'despachado', 'picked_up → despachado');
ok(shipKanbanColumn({ fulfillment_status: 'canceled' }) === 'despachado', 'canceled → despachado');
ok(shipKanbanColumnWithIssues({ fulfillment_status: 'preparing' }) === 'excepcion', 'con issues → excepcion (prioridad)');
ok(shipKanbanColumnWithIssues({ fulfillment_status: 'shipped' }) === 'despachado', 'cerrado + issues → despachado (no reabre)');

console.log('isPickupOrder');
ok(isPickupOrder({ shipping_method: { id: 'local_pickup' } }) === true, 'local_pickup id → pickup');
ok(isPickupOrder({ shippingMethod: 'LOCAL PICKUP' }) === true, 'shippingMethod pickup → pickup');
ok(isPickupOrder({ shipping: 0, shipping_method: { id: 'x' } }) === true, 'shipping 0 → pickup');
ok(isPickupOrder({ shipping: 43.25, shipping_method: { id: 'dao' } }) === false, 'con costo → no pickup');

// La tarjeta de cotización de pickup debe existir en el código (0 kr, sin Shipmondo)
console.log('pickup 0kr (estático)');
ok(src.includes('Retiro en tienda') && src.includes('0,00 kr'), 'renderQuoteSection muestra "Retiro en tienda — 0,00 kr"');

// El botón de avisar existe y es visualmente distinto (outline + campana)
console.log('botón Avisar al cliente');
ok(src.includes('Avisar al cliente') && src.includes('ph-bell-ringing'), 'botón secundario con campana');

// El modal de etiqueta tiene los dos caminos
console.log('modal de etiqueta');
ok(src.includes('saveManualTracking') && src.includes('buyLabelViaAPI'), 'caminos API + manual presentes');
ok(src.includes('testMode: !real'), 'testMode=true por defecto, real solo con confirmación');
ok(src.includes('COMPRA REAL'), 'confirmación explícita antes de compra real');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
