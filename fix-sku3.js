const fs = require('fs');
let code = fs.readFileSync('admin/app.js', 'utf8');

// Replace the string replacements exactly. The backslashes need to be matched exactly.
// Let's use string split and join instead of regex to avoid backslash hell.

let occurrences = [
    "${item.sku.replace(/'/g, \"\\\\'\")}",
    "${item.sku.replace(/'/g, \"\\\\\\\\'\")}"
];

for (let occ of occurrences) {
    code = code.split(occ).join("${item.id}");
}

// Update find functions
const findReplacements = [
    { search: "this.state.inventory.find(i => i.sku === sku)", replace: "this.state.inventory.find(i => i.id === sku || i.sku === sku)" },
    { search: "this.state.inventory.find(i => i.sku === itemId)", replace: "this.state.inventory.find(i => i.id === itemId || i.sku === itemId)" },
    { search: "this.state.inventory.findIndex(i => i.sku === sku)", replace: "this.state.inventory.findIndex(i => i.id === sku || i.sku === sku)" },
    { search: "this.state.inventory.findIndex(i => i.sku === itemId)", replace: "this.state.inventory.findIndex(i => i.id === itemId || i.sku === itemId)" }
];

for (let rep of findReplacements) {
    code = code.split(rep.search).join(rep.replace);
}

fs.writeFileSync('admin/app.js', code);
console.log('App.js patched correctly!');
