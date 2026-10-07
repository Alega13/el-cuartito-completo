/**
 * test-webshop.cjs
 * Run: node test-webshop.cjs
 * Extrae los helpers REALES de la sección Webshop de admin/app.js y testea
 * el filtrado por tag, la elegibilidad (stock + online) y el conteo del
 * tag legacy 'Nuevos', sin DOM.
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

const wsFilterByTag = new Function('products', 'tag', extractMethod('wsFilterByTag'));
const wsIsEligible = new Function('p', extractMethod('wsIsEligible'));
const wsTabLabel = new Function('tag', extractMethod('wsTabLabel'));
const wsCountLegacyNuevos = new Function('products', extractMethod('wsCountLegacyNuevos'))
    .bind({ wsFilterByTag });

let pass = 0, fail = 0;
function ok(cond, name, extra) {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name}${extra !== undefined ? ' :: ' + JSON.stringify(extra) : ''}`); }
}

const P = (tags, stock = 1, is_online = true) => ({ tags, stock, is_online });

console.log('wsFilterByTag');
ok(wsFilterByTag([P(['hero']), P(['new_arrival']), P(['hero', 'new_arrival'])], 'hero').length === 2, 'filtra hero (2)');
ok(wsFilterByTag([P(['hero']), P(['new_arrival'])], 'new_arrival').length === 1, 'filtra new_arrival (1)');
ok(wsFilterByTag([P(['hero']), P([]), {}], 'hero').length === 1, 'ignora docs sin tags');
ok(wsFilterByTag([P(['Hero']), P(['HERO'])], 'hero').length === 0, 'match exacto, case-sensitive');
ok(wsFilterByTag(null, 'hero').length === 0, 'null → []');
ok(wsFilterByTag(undefined, 'hero').length === 0, 'undefined → []');

console.log('wsIsEligible');
ok(wsIsEligible(P(['hero'], 1, true)) === true, 'stock>0 + online → elegible');
ok(wsIsEligible(P(['hero'], 0, true)) === false, 'stock 0 → no elegible');
ok(wsIsEligible(P(['hero'], 1, false)) === false, 'no online → no elegible');
ok(wsIsEligible(P(['hero'], '2', true)) === true, 'stock string "2" → elegible');
ok(wsIsEligible({}) === false, 'doc vacío → no elegible');

console.log('wsTabLabel');
ok(wsTabLabel('hero') === 'Hero', "hero → 'Hero'");
ok(wsTabLabel('new_arrival') === 'New Arrivals', "new_arrival → 'New Arrivals'");

console.log('wsCountLegacyNuevos');
ok(wsCountLegacyNuevos([P(['Nuevos']), P(['new_arrival']), P(['Nuevos', 'hero'])]) === 2, 'cuenta tag legacy Nuevos (2)');
ok(wsCountLegacyNuevos([P(['new_arrival'])]) === 0, 'new_arrival no cuenta como legacy');
ok(wsCountLegacyNuevos([]) === 0, 'lista vacía → 0');

console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
