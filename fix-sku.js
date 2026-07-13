const fs = require('fs');
let code = fs.readFileSync('admin/app.js', 'utf8');

// 1. Update all modal opening to use id instead of sku string replacement
code = code.replace(/\$\{item\.sku\.replace\(\/'\/g,\s*"\\\\'"\)\}/g, '${item.id}');
code = code.replace(/\$\{item\.sku\.replace\(\/'\/g,\s*"\\'"\)\}/g, '${item.id}');

// 2. Also replace straightforward ${item.sku} in onClick events if they exist
code = code.replace(/openProductModal\('\$\{item\.sku\}'\)/g, 'openProductModal(\'${item.id}\')');
code = code.replace(/deleteVinyl\('\$\{item\.sku\}'\)/g, 'deleteVinyl(\'${item.id}\')');
code = code.replace(/addToCart\('\$\{item\.sku\}'\)/g, 'addToCart(\'${item.id}\')');
code = code.replace(/openPrintLabelModal\('\$\{item\.sku\}'\)/g, 'openPrintLabelModal(\'${item.id}\')');
code = code.replace(/openAddVinylModal\('\$\{item\.sku\}'\)/g, 'openAddVinylModal(\'${item.id}\')');

// 3. Update the find functions to check both ID and SKU so it supports both!
const findReplacements = [
    { search: /this\.state\.inventory\.find\(i => i\.sku === sku\)/g, replace: 'this.state.inventory.find(i => i.id === sku || i.sku === sku)' },
    { search: /this\.state\.inventory\.find\(i => i\.sku === itemId\)/g, replace: 'this.state.inventory.find(i => i.id === itemId || i.sku === itemId)' },
    { search: /this\.state\.inventory\.findIndex\(i => i\.sku === sku\)/g, replace: 'this.state.inventory.findIndex(i => i.id === sku || i.sku === sku)' },
    { search: /this\.state\.inventory\.findIndex\(i => i\.sku === itemId\)/g, replace: 'this.state.inventory.findIndex(i => i.id === itemId || i.sku === itemId)' }
];

for (const r of findReplacements) {
    code = code.replace(r.search, r.replace);
}

fs.writeFileSync('admin/app.js', code);
console.log('App.js updated successfully!');
