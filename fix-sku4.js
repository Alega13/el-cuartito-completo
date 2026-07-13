const fs = require('fs');
let code = fs.readFileSync('admin/app.js', 'utf8');

// Replace all toggleSelection and selectedItems references
code = code.split("this.state.selectedItems.has(item.sku)").join("this.state.selectedItems.has(item.id)");
code = code.split("app.toggleSelection('${item.sku.replace(/'/g, \"\\\\'\")}')").join("app.toggleSelection('${item.id}')");
code = code.split("app.toggleProductTag('${item.sku.replace(/'/g, \"\\\\'\")}',").join("app.toggleProductTag('${item.id}',");

// Replace confirmDelete argument
code = code.split("app.confirmDelete('${item.sku}')").join("app.confirmDelete('${item.id}')");

// Update confirmDelete implementation
code = code.replace(/async confirmDelete\(sku\) \{[\s\S]*?try \{[\s\S]*?\/\/\s*Find product by SKU field first[\s\S]*?const querySnapshot = await db\.collection\('products'\)\.where\('sku', '==', sku\)\.get\(\);[\s\S]*?if \(!querySnapshot\.empty\) \{[\s\S]*?docId = querySnapshot\.docs\[0\]\.id;[\s\S]*?\} else \{[\s\S]*?docId = sku;[\s\S]*?\}/,
`async confirmDelete(id) {
        // Close confirmation modal
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) modal.remove();

        // Close product modal if open
        const productModal = document.getElementById('modal-overlay');
        if (productModal) productModal.remove();

        try {
            // Find product by exact document ID
            let docId = id;`);

fs.writeFileSync('admin/app.js', code);
console.log('App.js patched correctly for all unique IDs!');
