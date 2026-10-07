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

// Estado del botón "Avisar al cliente" (un solo envío por tipo)
console.log('shipNotifyState');
const shipNotifyState = new Function('s', 'type', extractMethod('shipNotifyState'));
ok(shipNotifyState({ notifications: { preparing: { status: 'sent' } } }, 'preparing') === 'sent', 'notificación enviada → sent');
ok(shipNotifyState({ notifications: { preparing: { status: 'sent' } } }, 'shipped') === 'idle', 'otro tipo → idle');
ok(shipNotifyState({ notifications: { preparing: { status: 'sending' } } }, 'preparing') === 'idle', 'claim trabado → idle (reintentable, el backend igual no duplica)');
ok(shipNotifyState({}, 'preparing') === 'idle', 'sin notifications → idle');
ok(shipNotifyState(null, 'preparing') === 'idle', 'sale null → idle');
ok(src.includes('Avisado ✓') && src.includes("shipNotifyState(s, type) === 'sent'"), 'la tarjeta pinta "Avisado ✓" deshabilitado cuando ya se envió');

// Aviso de devolución de stock al eliminar la ficha
console.log('shipDeleteStockWarning');
const shipDeleteStockWarning = new Function('s', extractMethod('shipDeleteStockWarning'));
const w1 = shipDeleteStockWarning({ stockDecremented: true, linkedInventory: { productId: 'p1', artist: 'Moodymann', album: 'Black Mahogani' } });
ok(w1.willReturn === true && w1.label === 'Moodymann — Black Mahogani', 'con stockDecremented avisa la devolución');
ok(shipDeleteStockWarning({ stockDecremented: false, linkedInventory: { productId: 'p1' } }).willReturn === false, 'sin stockDecremented no devuelve');
ok(shipDeleteStockWarning({ stockDecremented: true }).willReturn === false, 'sin vínculo no devuelve');
ok(shipDeleteStockWarning({}).willReturn === false, 'venta vacía no devuelve');

// Eliminar ficha: botón discreto + modal propio + borrado sin recargar
console.log('eliminar ficha');
ok(src.includes('openDeleteShipmentModal') && src.includes('confirmDeleteShipment'), 'flujo de borrado presente');
ok(src.includes('api.deleteSale'), 'usa DELETE /sales/:id del backend');
ok(src.includes('data-sale-id'), 'la tarjeta tiene data-sale-id para quitarla del DOM');
ok(src.includes('delete-shipment-modal') && src.includes('Esta acción no se puede deshacer'), 'modal propio de confirmación');
ok(!/openDeleteShipmentModal[\s\S]{0,400}window\.confirm/.test(src), 'el borrado no usa window.confirm');

// Selector de punto de retiro en el Pre-Flight (reemplaza el ID manual)
console.log('ecShopMethodCarrier');
function extractTopFn(name) {
    const startMark = `function ${name}(`;
    const start = src.indexOf(startMark);
    if (start < 0) throw new Error(`fn no encontrada: ${name}`);
    const braceOpen = src.indexOf('{', start);
    let depth = 0;
    for (let i = braceOpen; i < src.length; i++) {
        if (src[i] === '{') depth++;
        if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
    }
    throw new Error(`llave sin cerrar: ${name}`);
}
const ecShopMethodCarrier = new Function('method', `return (${extractTopFn('ecShopMethodCarrier')})(method);`);
ok(ecShopMethodCarrier('dao_shop') === 'dao', 'dao_shop → dao');
ok(ecShopMethodCarrier('gls_shop') === 'gls', 'gls_shop → gls');
ok(ecShopMethodCarrier('postnord_shop') === 'postnord', 'postnord_shop → postnord');
ok(ecShopMethodCarrier('bring_shop') === 'bring', 'bring_shop → bring');
ok(ecShopMethodCarrier('dhl_shop') === 'dhl', 'dhl_shop → dhl');
ok(ecShopMethodCarrier('GLSDK_PS') === 'gls', 'product code real GLSDK_PS → gls');
ok(ecShopMethodCarrier('shop') === '', 'shop genérico → "" (elige el usuario)');
ok(ecShopMethodCarrier('home') === '', 'home → ""');
ok(ecShopMethodCarrier('') === '' && ecShopMethodCarrier(null) === '', 'vacío/null → ""');

console.log('ecServicePointBlockHTML');
const spPreamble = extractTopFn('ecEsc') + '\n' + extractTopFn('ecShopMethodCarrier') + '\n'
    + src.match(/const EC_SP_CARRIERS = \[[\s\S]*?\];/)[0] + '\n';
const ecServicePointBlockHTML = new Function('saleId', 'ui', 'input',
    spPreamble + 'const fn = function(saleId, ui, input) {' + extractMethod('ecServicePointBlockHTML') + '}; return fn(saleId, ui, input);');
const spInput = (method, cc = 'DK', zip = '8000') => ({ shippingMethod: method, receiver: { country_code: cc, zipcode: zip } });

let h = ecServicePointBlockHTML('s1', { servicePointId: '9743', spSelected: { name: 'Pakkeshop Aarhus', address1: 'Gade 1', city: 'Aarhus' } }, spInput('dao_shop'));
ok(h.includes('Pakkeshop Aarhus') && h.includes('Cambiar') && !h.includes('Buscar puntos cercanos'), 'punto elegido → chip con nombre + Cambiar');
h = ecServicePointBlockHTML('s1', { servicePointId: '9743' }, spInput('dao_shop'));
ok(h.includes('Punto 9743') && h.includes('ID 9743'), 'punto manual → chip con fallback al ID');
h = ecServicePointBlockHTML('s1', {}, spInput('gls_shop'));
ok(h.includes('Buscar puntos cercanos') && !h.includes('>Transportista<') && !h.includes('disabled'), 'gls_shop → busca directo, botón habilitado');
h = ecServicePointBlockHTML('s1', {}, spInput('shop'));
ok(h.includes('>Transportista<') && h.includes('value="dao"') && h.includes('>DAO<'), 'shop genérico → select de transportista');
h = ecServicePointBlockHTML('s1', {}, spInput('dao_shop', 'DK', ''));
ok(h.includes('disabled') && h.includes('código postal'), 'sin CP → botón deshabilitado con hint');
h = ecServicePointBlockHTML('s1', { spSearchStatus: 'ready', spPoints: [{ id: '9743', name: 'Pakkeshop X', address1: 'Gade 1', zipcode: '8000', city: 'Aarhus', distanceKm: 1.2 }] }, spInput('dao_shop'));
ok(h.includes('sp-item') && h.includes('Pakkeshop X') && h.includes('1.2 km') && h.includes("ecPickServicePoint"), 'resultados → lista elegible con distancia');
h = ecServicePointBlockHTML('s1', { spSearchStatus: 'error', spPoints: [] }, spInput('dao_shop'));
ok(h.includes('ID manual') && h.includes('No se encontraron puntos'), 'error API → fallback manual con aviso');
h = ecServicePointBlockHTML('s1', { spSearchStatus: 'ready', spPoints: [] }, spInput('dao_shop'));
ok(h.includes('ID manual') && h.includes('No se encontraron puntos'), 'sin resultados → fallback manual con aviso');
h = ecServicePointBlockHTML('s1', { spManual: true }, spInput('dao_shop'));
ok(h.includes('ID manual') && h.includes('volver a buscar puntos'), 'toggle manual → input + link para volver');
ok(!src.includes('Al integrar la API'), 'el placeholder viejo ya no existe en el código');
ok(src.includes('ecSearchServicePoints') && src.includes('/api/shipmondo/service-points'), 'la búsqueda usa el endpoint real del proxy');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
