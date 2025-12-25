// ========================================
// FUNCIÓN renderOnlineSales() 
// Copiar e insertar en admin/app.js línea 3281 (justo ANTES de renderCartWidget)
// ========================================

renderOnlineSales(container) {
    // Filter only online sales
    const onlineSales = this.state.sales.filter(s => s.channel === 'online');
    const completedSales = onlineSales.filter(s => s.status === 'completed');
    const pendingSales = onlineSales.filter(s => s.status === 'PENDING');

    const totalRevenue = completedSales.reduce((sum, s) => sum + (parseFloat(s.total_amount || s.total) || 0), 0);

    container.innerHTML = `
        <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="font-display text-3xl font-bold text-brand-dark mb-2">🌐 Ventas WebShop</h1>
                    <p class="text-slate-500">Pedidos realizados a través de la tienda online</p>
                </div>
                <div class="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl">
                    <div class="text-sm font-medium opacity-90">Ingresos Totales</div>
                    <div class="text-3xl font-bold">DKK ${totalRevenue.toFixed(2)}</div>
                    <div class="text-xs opacity-75">${completedSales.length} ventas completadas</div>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-brand-dark">${completedSales.length}</div>
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wide">Completadas</div>
                        </div>
                        <div class="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                            <i class="ph-fill ph-check-circle text-2xl text-green-500"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-brand-dark">${pendingSales.length}</div>
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wide">Pendientes</div>
                        </div>
                        <div class="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                            <i class="ph-fill ph-clock text-2xl text-yellow-500"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-brand-dark">${onlineSales.length}</div>
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wide">Total</div>
                        </div>
                        <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                            <i class="ph-fill ph-storefront text-2xl text-blue-500"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sales List -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-5 border-b border-slate-100">
                    <h2 class="text-lg font-bold text-brand-dark">Pedidos Recientes</h2>
                </div>
                
                ${onlineSales.length === 0 ? `
                    <div class="p-12 text-center">
                        <i class="ph-duotone ph-shopping-cart-simple text-6xl text-slate-300 mb-4"></i>
                        <p class="text-slate-400">No hay ventas online aún</p>
                    </div>
                ` : `
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="bg-slate-50 border-b border-slate-100">
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Orden</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Productos</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Pago</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${onlineSales.sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.date);
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.date);
        return dateB - dateA;
    }).map(sale => {
        const customer = sale.customer || {};
        const orderNumber = sale.orderNumber || 'N/A';
        const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.date);
        const completedDate = sale.completed_at?.toDate ? sale.completed_at.toDate() : null;
        const displayDate = completedDate || saleDate;

        const statusColors = {
            'completed': 'bg-green-50 text-green-700 border-green-200',
            'PENDING': 'bg-yellow-50 text-yellow-700 border-yellow-200',
            'failed': 'bg-red-50 text-red-700 border-red-200'
        };
        const statusLabels = {
            'completed': '✅ Completado',
            'PENDING': '⏳ Pendiente',
            'failed': '❌ Fallido'
        };

        return `
                                        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td class="px-6 py-4">
                                                <div class="font-mono text-sm font-bold text-brand-orange">${orderNumber}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-semibold text-brand-dark">${customer.firstName || ''} ${customer.lastName || ''}</div>
                                                <div class="text-xs text-slate-500">${customer.email || 'No email'}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm">
                                                    ${(sale.items || []).map(item => `
                                                        <div class="mb-1">
                                                            <span class="font-medium">${item.album || item.record?.album || 'Unknown'}</span>
                                                            <span class="text-slate-400"> - ${item.artist || item.record?.artist || ''}</span>
                                                            ${item.quantity > 1 ? `<span class="text-xs bg-slate-100 px-1.5 py-0.5 rounded ml-1">x${item.quantity}</span>` : ''}
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-slate-600">
                                                    ${customer.address || 'N/A'}<br>
                                                    ${customer.postalCode || ''} ${customer.city || ''}<br>
                                                    ${customer.country || ''}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm">
                                                    <div class="font-medium capitalize">${sale.payment_method || sale.paymentMethod || 'card'}</div>
                                                    ${sale.paymentId ? `<div class="text-xs text-slate-400 font-mono">${sale.paymentId.slice(0, 15)}...</div>` : ''}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark">DKK ${(sale.total_amount || sale.total || 0).toFixed(2)}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex px-2 py-1 text-xs font-bold rounded-full border ${statusColors[sale.status] || 'bg-slate-50 text-slate-700'}">
                                                    ${statusLabels[sale.status] || sale.status}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-slate-600">
                                                    ${displayDate.toLocaleDateString('es-ES')}
                                                    <div class="text-xs text-slate-400">${displayDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
    }).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        </div>
    `;
},

// ========================================
// FIN DE LA FUNCIÓN
// ========================================
