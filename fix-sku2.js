const fs = require('fs');
let code = fs.readFileSync('admin/app.js', 'utf8');

// Replace all item.sku in the specified onClick actions with item.id
code = code.replace(/app\.openProductModal\('[^']*'\)/g, "app.openProductModal('${item.id}')");
code = code.replace(/app\.addToCart\('[^']*'(, event)?\)/g, "app.addToCart('${item.id}'$1)");
code = code.replace(/app\.openPrintLabelModal\('[^']*'\)/g, "app.openPrintLabelModal('${item.id}')");
code = code.replace(/app\.openAddVinylModal\('[^']*'\)/g, "app.openAddVinylModal('${item.id}')");
code = code.replace(/app\.deleteVinyl\('[^']*'\)/g, "app.deleteVinyl('${item.id}')");

fs.writeFileSync('admin/app.js', code);
console.log('App.js fully patched!');
