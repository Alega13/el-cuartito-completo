// Firebase Firestore reference (initialized in index.html)
const db = firebase.firestore();

const auth = window.auth;

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_API_URL = isLocal ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app';

// OCR.space API configuration for receipt scanning
// Get free API key at: https://ocr.space/ocrapi
const OCR_API_KEY = 'K85403890688957'; // Free tier: 500 requests/day

const api = {
    async createSale(saleData) {
        // Store items data for Discogs deletion after transaction
        let itemsForDiscogsSync = [];

        await db.runTransaction(async (transaction) => {
            const itemsWithData = [];

            // 1. Validate stock and gather data
            for (const item of saleData.items) {
                const productRef = db.collection('products').doc(item.recordId || item.productId);
                const productDoc = await transaction.get(productRef);

                if (!productDoc.exists) {
                    throw new Error(`Producto ${item.recordId} no encontrado`);
                }

                const productData = productDoc.data();
                if (productData.stock < item.quantity) {
                    throw new Error(`Stock insuficiente para ${productData.artist || 'Sin Artista'} - ${productData.album || 'Sin Album'}. Disponible: ${productData.stock}`);
                }

                itemsWithData.push({
                    ref: productRef,
                    data: productData,
                    quantity: item.quantity,
                    price: productData.price,
                    cost: productData.cost || 0
                });
            }

            // 2. Perform updates
            // Use customTotal if provided (for Discogs fees, etc.), otherwise calculate from items
            const calculatedTotal = itemsWithData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const totalAmount = saleData.customTotal !== undefined ? saleData.customTotal : calculatedTotal;

            const saleRef = db.collection('sales').doc();
            transaction.set(saleRef, {
                ...saleData,
                status: 'completed', // Manual sales are always completed immediately
                fulfillment_status: (saleData.channel && saleData.channel.toLowerCase() === 'discogs') ? 'preparing' : 'fulfilled', // Discogs stays preparing
                total: totalAmount,
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                items: itemsWithData.map(item => ({
                    productId: item.ref.id,
                    artist: item.data.artist,
                    album: item.data.album,
                    sku: item.data.sku,
                    unitPrice: item.price,
                    costAtSale: item.cost,
                    qty: item.quantity
                }))
            });

            for (const item of itemsWithData) {
                transaction.update(item.ref, {
                    stock: item.data.stock - item.quantity
                });

                const logRef = db.collection('inventory_logs').doc();
                transaction.set(logRef, {
                    type: 'SOLD',
                    sku: item.data.sku || 'Unknown',
                    album: item.data.album || 'Unknown',
                    artist: item.data.artist || 'Unknown',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    details: `Venta registrada (Admin) - Canal: ${saleData.channel || 'Tienda'}`
                });
            }

            // Save for Discogs sync after transaction
            itemsForDiscogsSync = itemsWithData.map(item => ({
                discogs_listing_id: item.data.discogs_listing_id,
                artist: item.data.artist,
                album: item.data.album
            }));
        });

        // 3. If channel is Discogs, delete listings from Discogs
        if (saleData.channel && saleData.channel.toLowerCase() === 'discogs') {
            for (const item of itemsForDiscogsSync) {
                if (item.discogs_listing_id) {
                    try {
                        const response = await fetch(`${BASE_API_URL}/discogs/delete-listing/${item.discogs_listing_id}`, {
                            method: 'DELETE'
                        });
                        if (response.ok) {
                            console.log(`✅ Discogs listing ${item.discogs_listing_id} deleted for ${item.artist} - ${item.album}`);
                        } else {
                            console.warn(`⚠️ Could not delete Discogs listing ${item.discogs_listing_id}:`, await response.text());
                        }
                    } catch (err) {
                        console.error(`❌ Error deleting Discogs listing ${item.discogs_listing_id}:`, err);
                    }
                }
            }
        }
    },

    async notifyPreparing(saleId) {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch(`${BASE_API_URL}/sales/${saleId}/notify-preparing`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    async updateTracking(saleId, trackingNumber) {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch(`${BASE_API_URL}/sales/${saleId}/update-tracking`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trackingNumber })
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    async notifyShipped(saleId, trackingNumber, trackingLink = null) {
        const idToken = await auth.currentUser.getIdToken();
        const body = { trackingNumber };
        if (trackingLink) body.trackingLink = trackingLink;

        const response = await fetch(`${BASE_API_URL}/sales/${saleId}/notify-shipped`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    async markDispatched(saleId) {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch(`${BASE_API_URL}/sales/${saleId}/mark-dispatched`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    async notifyPickupReady(saleId) {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch(`${BASE_API_URL}/sales/${saleId}/notify-pickup-ready`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    async markPickedUp(saleId) {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch(`${BASE_API_URL}/sales/${saleId}/mark-picked-up`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },
};

const app = {
    state: {
        inventory: [],
        sales: [],
        expenses: [],
        consignors: [],
        cart: [],
        viewMode: 'list',
        selectedItems: new Set(),
        currentView: 'dashboard',
        filterMonths: [new Date().getMonth()],
        filterYear: new Date().getFullYear(),
        inventorySearch: '',
        salesHistorySearch: '',
        expensesSearch: '',
        events: [],
        selectedDate: new Date(),
        vatActive: false,
        manualSaleSearch: '',
        posCondition: 'Used',
        posSelectedItemSku: null,
        orderFeedFilter: 'all'
    },

    async init() {
        if (this._initialized) return;
        this._initialized = true;

        // Listen for auth state changes
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // No need to set token - we use Firestore directly via Firebase SDK

                    document.getElementById('login-view').classList.add('hidden');
                    document.getElementById('main-app').classList.remove('hidden');
                    document.getElementById('mobile-nav').classList.remove('hidden');

                    await this.loadData();

                    // Poll for updates every 60 seconds (throttled)
                    if (this._pollInterval) clearInterval(this._pollInterval);
                    this._pollInterval = setInterval(() => this.loadData(), 60000);

                    this.setupMobileMenu();
                    this.setupNavigation();
                } catch (error) {
                    console.error("Auth token error:", error);
                    // alert("Error de inicio: " + error.message); // Debug removed
                    this.logout();
                }
            } else {
                // Show login view
                document.getElementById('login-view').classList.remove('hidden');
                document.getElementById('main-app').classList.add('hidden');
                document.getElementById('mobile-nav').classList.add('hidden');

                // Reset login button if it was loading
                const loginBtn = document.getElementById('login-btn');
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span>Entrar</span>';
                }
            }
        });
    },

    async handleLogin(event) {
        event.preventDefault();
        const email = event.target.email.value;
        const password = event.target.password.value;
        const errorEl = document.getElementById('login-error');
        const loginBtn = document.getElementById('login-btn');

        errorEl.classList.add('hidden');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span>Cargando...</span>';

        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error("Login error:", error);
            errorEl.innerText = "Error: " + error.message;
            errorEl.classList.remove('hidden');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>Ingresar</span><i class="ph-bold ph-arrow-right"></i>';
        }
    },

    async updateFulfillmentStatus(event, id, status) {
        try {
            const btn = event?.target?.closest('button') || (window.event?.target?.closest('button'));
            if (btn) {
                btn.disabled = true;
                const originalContent = btn.innerHTML;
                btn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i>';
            }

            // Update fulfillment status directly in Firestore
            await db.collection('sales').doc(id).update({ fulfillment_status: status });
            await this.loadData();

            // Re-render modal if open
            if (document.getElementById('modal-overlay')) {
                document.getElementById('modal-overlay').remove();
                this.openOnlineSaleDetailModal(id);
            }

            this.showToast('Estado de envío actualizado');
        } catch (error) {
            console.error("Fulfillment update error:", error);
            this.showToast("Error al actualizar estado: " + error.message, "error");
        }
    },

    async manualShipOrder(saleId) {
        try {
            const trackingNumber = prompt("Introduce el número de seguimiento:");
            if (!trackingNumber) return; // User cancelled or empty

            const btn = event?.target?.closest('button') || (window.event?.target?.closest('button'));

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Guardando...';
            }

            const response = await fetch(`${BASE_API_URL}/api/manual-ship`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ orderId: saleId, trackingNumber })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showToast('✅ Pedido marcado como enviado');

                if (result.emailSent) {
                    this.showToast('📧 Cliente notificado por email', 'success');
                } else {
                    const errorMsg = typeof result.emailError === 'object' ? JSON.stringify(result.emailError) : result.emailError;
                    this.showToast('⚠️ Pedido marcado pero EL EMAIL FALLÓ: ' + errorMsg, 'warning');
                }

                // Refresh data and reopen modal
                await this.loadData();
                const modal = document.getElementById('sale-detail-modal');
                if (modal) {
                    modal.remove();
                    this.openUnifiedOrderDetailModal(saleId);
                }
            } else {
                throw new Error(result.error || result.message || 'Error desconocido');
            }
        } catch (error) {
            console.error("Error shipping manually:", error);
            this.showToast("❌ Error: " + (error.message || 'No se pudo procesar el envío'), 'error');
            const btn = event?.target?.closest('button') || (window.event?.target?.closest('button'));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-truck"></i> Ingresar Tracking y Cerrar';
            }
        }
    },

    async logout() {
        try {
            await auth.signOut();
            location.reload();
        } catch (error) {
            console.error("Sign out error:", error);
            location.reload();
        }
    },


    setupListeners() {
        // No more real-time listeners. Using polling in init().
    },

    async loadData() {
        try {
            // Load data directly from Firestore (no Railway needed)
            const [inventorySnap, salesSnap, expensesSnap, eventsSnap, consignorsSnap] = await Promise.all([
                db.collection('products').get(),
                db.collection('sales').get(), // ✅ Removed orderBy to avoid filtering out documents
                db.collection('expenses').get(), // ✅ Removed orderBy to avoid filtering out new docs
                db.collection('events').orderBy('date', 'desc').get(),
                db.collection('consignors').get()
            ]);

            this.state.inventory = inventorySnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,  // Firestore document ID
                    ...data,     // This includes the 'sku' field from the document
                    condition: data.condition || 'VG',
                    owner: data.owner || 'El Cuartito',
                    label: data.label || 'Desconocido',
                    storageLocation: data.storageLocation || 'Tienda',
                    cover_image: data.cover_image || data.coverImage || null
                };
            });

            this.state.sales = salesSnap.docs.map(doc => {
                const data = doc.data();
                const sale = {
                    id: doc.id,
                    ...data,
                    // Fallback: Generate date from timestamp if missing (for old online sales)
                    date: data.date || (data.timestamp?.toDate ? data.timestamp.toDate().toISOString().split('T')[0] :
                        data.created_at?.toDate ? data.created_at.toDate().toISOString().split('T')[0] :
                            new Date().toISOString().split('T')[0])
                };

                // ✅ DATA NORMALIZATION: Ensure consistent field names across local and online sales
                // This fixes NaN calculations by unifying field names

                // Normalize total amount field (online sales use 'total_amount', local use 'total')
                if (data.total_amount !== undefined && data.total === undefined) {
                    sale.total = data.total_amount;
                }

                // Normalize payment method field (online: 'payment_method', local: 'paymentMethod')
                if (data.payment_method && !data.paymentMethod) {
                    sale.paymentMethod = data.payment_method;
                }

                // Normalize items array fields if items exist
                if (sale.items && Array.isArray(sale.items)) {
                    sale.items = sale.items.map(item => ({
                        ...item,
                        // Normalize price field (online: 'unitPrice', local: 'priceAtSale')
                        priceAtSale: item.priceAtSale !== undefined ? item.priceAtSale : (item.unitPrice || 0),
                        // Normalize quantity field (online: 'quantity', local: 'qty')
                        qty: item.qty !== undefined ? item.qty : (item.quantity || 1),
                        // Normalize cost field (online: 'cost', local: 'costAtSale')
                        costAtSale: item.costAtSale !== undefined ? item.costAtSale : (item.cost || 0)
                        // Keep original fields for reference if needed
                    }));
                }

                return sale;
            })
                // ✅ FILTER: Only show completed sales (hide failed or pending/abandoned checkouts)
                .filter(sale => sale.status !== 'PENDING' && sale.status !== 'failed')
                .sort((a, b) => {
                    // ✅ Sort in-memory by date descending
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return dateB - dateA;
                });

            this.state.expenses = expensesSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Normalize date for sorting and display
                    date: data.fecha_factura || data.date || data.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0]
                };
            }).sort((a, b) => new Date(b.date) - new Date(a.date));

            this.state.events = eventsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.state.consignors = consignorsSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Map multiple possible field names to agreementSplit for UI consistency
                    agreementSplit: data.split || data.agreementSplit || (data.percentage ? Math.round(data.percentage * 100) : 70)
                };
            });

            // Load investments
            await this.loadInvestments();

            // Initialize/Update Fuse.js for fuzzy search
            this.initFuse();

            this.refreshCurrentView();
        } catch (error) {
            console.error("Failed to load data:", error);
            this.showToast("❌ Error de conexión: " + error.message, "error");
        }
    },

    refreshCurrentView() {
        const container = document.getElementById('app-content');
        if (!container) return;

        switch (this.state.currentView) {
            case 'dashboard': this.renderDashboard(container); break;
            case 'inventory': this.renderInventory(container); break;
            case 'sales': this.renderSales(container); break;
            case 'onlineSales': this.renderOnlineSales(container); break;
            case 'discogsSales': this.renderDiscogsSales(container); break;
            case 'expenses': this.renderExpenses(container); break;
            case 'consignments': this.renderConsignments(container); break;

            case 'backup': this.renderBackup(container); break;
            case 'settings': this.renderSettings(container); break;
            case 'calendar': this.renderCalendar(container); break;
            case 'shipping': this.renderShipping(container); break;
            case 'pickups': this.renderPickups(container); break;
            case 'investments': this.renderInvestments(container); break;
            case 'vatReport': this.renderVATReport(container); break;
            case 'datosLegales': this.renderDatosLegales(container); break;
        }
    },

    renderDatosLegales(container) {
        const html = `
            <div class="max-w-4xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <!-- Header Section -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 class="font-display text-3xl font-bold text-brand-dark mb-1">Datos <span class="text-brand-orange">Legales</span></h1>
                        <p class="text-slate-500 font-medium">Información corporativa y de contacto</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Company Info Card -->
                    <div class="bg-white rounded-3xl p-8 border border-orange-100 shadow-sm">
                        <div class="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-brand-orange mb-6">
                            <i class="ph-duotone ph-buildings text-2xl"></i>
                        </div>
                        <h2 class="text-xl font-bold text-brand-dark mb-6">Empresa</h2>
                        
                        <div class="space-y-6">
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre Comercial</label>
                                <p class="text-lg font-semibold text-slate-700">El Cuartito Records I/S</p>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CVR Number</label>
                                    <p class="text-slate-700 font-medium">45943216</p>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">VAT Number</label>
                                    <p class="text-slate-700 font-medium">DK45943216</p>
                                </div>
                            </div>
                            
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Dirección</label>
                                <p class="text-slate-700 leading-relaxed font-medium">
                                    Dybbølsgade 14 st tv<br>
                                    1721 København V<br>
                                    Denmark
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Contact & Links Card -->
                    <div class="bg-white rounded-3xl p-8 border border-orange-100 shadow-sm flex flex-col">
                        <div class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                            <i class="ph-duotone ph-at text-2xl"></i>
                        </div>
                        <h2 class="text-xl font-bold text-brand-dark mb-6">Contacto & Canales</h2>

                        <div class="space-y-6 flex-1">
                            <a href="mailto:el.cuartito.cph@gmail.com" class="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-orange-50 group transition-all">
                                <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-brand-orange transition-colors">
                                    <i class="ph-bold ph-envelope"></i>
                                </div>
                                <div class="flex-1">
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block">Email</label>
                                    <p class="text-sm font-bold text-slate-700">el.cuartito.cph@gmail.com</p>
                                </div>
                            </a>

                            <a href="https://elcuartito.dk" target="_blank" class="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-orange-50 group transition-all">
                                <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-brand-orange transition-colors">
                                    <i class="ph-bold ph-browser"></i>
                                </div>
                                <div class="flex-1">
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block">Web Oficial</label>
                                    <p class="text-sm font-bold text-slate-700">elcuartito.dk</p>
                                </div>
                            </a>

                            <div class="grid grid-cols-2 gap-4">
                                <a href="https://instagram.com/el.cuartito.records" target="_blank" class="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-pink-50 text-slate-400 hover:text-pink-500 transition-all group">
                                    <i class="ph-bold ph-instagram-logo text-2xl"></i>
                                    <span class="text-[10px] font-bold uppercase">Instagram</span>
                                </a>
                                <a href="https://www.discogs.com/es/user/elcuartitorecords.dk" target="_blank" class="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-200 text-slate-400 hover:text-brand-dark transition-all group">
                                    <i class="ph-bold ph-vinyl-record text-2xl"></i>
                                    <span class="text-[10px] font-bold uppercase">Discogs</span>
                                </a>
                            </div>
                        </div>

                        <div class="mt-8 pt-6 border-t border-slate-100">
                            <label class="text-[10px] font-bold text-slate-400 uppercase block mb-3">Logística & Envíos</label>
                            <a href="https://app.shipmondo.com/" target="_blank" class="flex items-center justify-between p-4 rounded-2xl bg-brand-dark text-white hover:bg-slate-800 transition-all shadow-lg shadow-brand-dark/20 group">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                        <i class="ph-bold ph-package"></i>
                                    </div>
                                    <span class="font-bold text-sm">Shipmondo App</span>
                                </div>
                                <i class="ph-bold ph-arrow-square-out group-hover:translate-x-1 transition-transform"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    navigate(view) {
        this.state.currentView = view;

        // Update UI Active States
        document.querySelectorAll('.nav-item, .nav-item-m').forEach(el => {
            el.classList.remove('bg-orange-50', 'text-brand-orange');
            el.classList.add('text-slate-500');
        });

        // Desktop
        const activeNavD = document.getElementById(`nav-d-${view}`);
        if (activeNavD) {
            activeNavD.classList.remove('text-slate-500');
            activeNavD.classList.add('bg-orange-50', 'text-brand-orange');
        }

        // Mobile
        const activeNavM = document.getElementById(`nav-m-${view}`);
        if (activeNavM) {
            activeNavM.classList.remove('text-slate-400');
            activeNavM.classList.add('text-brand-orange');
        }

        // Render View
        const content = document.getElementById('app-content');
        content.innerHTML = '';

        this.refreshCurrentView();
    },

    renderCalendar(container) {
        const currentDate = this.state.selectedDate || new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Adjust for Monday start

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Helper to check for activity on a date
        const hasActivity = (day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasSales = this.state.sales.some(s => s.date === dateStr);
            const hasExpenses = this.state.expenses.some(e => e.date === dateStr);
            const hasEvents = this.state.events.some(e => e.date === dateStr);
            return { hasSales, hasExpenses, hasEvents };
        };

        const html = `
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <div class="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
                    <!-- Calendar Grid -->
                    <div class="flex-1 bg-white rounded-2xl shadow-sm border border-orange-100 p-6 flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="font-display text-2xl font-bold text-brand-dark capitalize">
                                ${monthNames[month]} <span class="text-brand-orange">${year}</span>
                            </h2>
                            <div class="flex gap-2">
                                <button onclick="app.changeCalendarMonth(-1)" class="w-10 h-10 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-brand-orange transition-colors flex items-center justify-center">
                                    <i class="ph-bold ph-caret-left"></i>
                                </button>
                                <button onclick="app.changeCalendarMonth(1)" class="w-10 h-10 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-brand-orange transition-colors flex items-center justify-center">
                                    <i class="ph-bold ph-caret-right"></i>
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-7 gap-2 mb-2 text-center">
                            ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider py-2">${d}</div>
                            `).join('')}
                        </div>

                        <div class="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                            ${Array(startingDay).fill('<div class="bg-slate-50/50 rounded-xl"></div>').join('')}
                            ${Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = currentDate.getDate() === day;
            const activity = hasActivity(day);
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            return `
                                    <button onclick="app.selectCalendarDate('${dateStr}')" 
                                        class="relative rounded-xl p-2 flex flex-col items-center justify-start gap-1 transition-all border-2
                                        ${isSelected ? 'border-brand-orange bg-orange-50' : 'border-transparent hover:bg-slate-50'}
                                        ${isToday ? 'bg-blue-50' : ''}">
                                        <span class="text-sm font-bold ${isSelected ? 'text-brand-orange' : 'text-slate-700'} ${isToday ? 'text-blue-600' : ''}">${day}</span>
                                        <div class="flex gap-1 mt-1">
                                            ${activity.hasSales ? '<div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>' : ''}
                                            ${activity.hasExpenses ? '<div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>' : ''}
                                            ${activity.hasEvents ? '<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>' : ''}
                                        </div>
                                    </button>
                                `;
        }).join('')}
                        </div>
                    </div>

                    <!-- Day Summary -->
                    <div class="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-orange-100 p-6 flex flex-col h-full overflow-hidden">
                        ${this.renderCalendarDaySummary(currentDate)}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    getCustomerInfo(sale) {
        const customer = sale.customer || {};
        const name = sale.customerName || customer.name || (customer.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : '') || 'Cliente';
        const email = sale.customerEmail || customer.email || '-';

        let address = sale.address || customer.address || '-';
        if (customer.shipping) {
            const s = customer.shipping;
            address = `${s.line1 || ''} ${s.line2 || ''}, ${s.city || ''}, ${s.postal_code || ''}, ${s.country || ''}`.trim().replace(/^,|,$/g, '');
        }

        return { name, email, address };
    },

    renderCalendarDaySummary(date) {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const displayDate = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

        const daySales = this.state.sales.filter(s => s.date === dateStr);
        const dayExpenses = this.state.expenses.filter(e => e.date === dateStr);
        const dayEvents = this.state.events.filter(e => e.date === dateStr);

        const totalSales = daySales.reduce((sum, s) => sum + s.total, 0);
        const totalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

        return `
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h3 class="font-display text-xl font-bold text-brand-dark capitalize">${displayDate}</h3>
                    <p class="text-xs text-slate-500 mt-1">Resumen del día</p>
                </div>
                <button onclick="app.openAddEventModal('${dateStr}')" class="text-brand-orange hover:bg-orange-50 p-2 rounded-lg transition-colors" title="Agregar Evento">
                    <i class="ph-bold ph-plus"></i>
                </button>
            </div>

            <div class="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                <!-- Financial Summary -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-green-50 p-3 rounded-xl border border-green-100">
                        <p class="text-[10px] font-bold text-green-600 uppercase">Ventas</p>
                        <p class="text-lg font-bold text-brand-dark">${this.formatCurrency(totalSales)}</p>
                    </div>
                    <div class="bg-red-50 p-3 rounded-xl border border-red-100">
                        <p class="text-[10px] font-bold text-red-600 uppercase">Gastos</p>
                        <p class="text-lg font-bold text-brand-dark">${this.formatCurrency(totalExpenses)}</p>
                    </div>
                </div>

                <!-- Events -->
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Eventos / Notas</h4>
                    ${dayEvents.length > 0 ? `
                        <div class="space-y-2">
                            ${dayEvents.map(e => `
                                <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 group relative">
                                    <p class="text-sm font-medium text-brand-dark">${e.title}</p>
                                    ${e.description ? `<p class="text-xs text-slate-500 mt-1">${e.description}</p>` : ''}
                                    <button onclick="app.deleteEvent('${e.id}')" class="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600">
                                        <i class="ph-bold ph-trash"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p class="text-xs text-slate-400">No hay eventos registrados</p>
                            <button onclick="app.openAddEventModal('${dateStr}')" class="text-xs text-brand-orange font-bold mt-2 hover:underline">Agregar nota</button>
                        </div>
                    `}
                </div>

                <!-- Sales List -->
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle Ventas (${daySales.length})</h4>
                    ${daySales.length > 0 ? `
                        <div class="space-y-2">
                            ${daySales.map(s => `
                                <div class="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg text-xs">
                                    <div class="truncate flex-1 pr-2">
                                        <span class="font-bold text-slate-700 block truncate">${s.album || 'Venta rápida'}</span>
                                        <span class="text-slate-400 text-[10px]">${s.sku || '-'}</span>
                                    </div>
                                    <span class="font-bold text-brand-dark">${this.formatCurrency(s.total)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-xs text-slate-400 italic">Sin ventas</p>'}
                </div>

                <!-- Expenses List -->
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle Gastos (${dayExpenses.length})</h4>
                    ${dayExpenses.length > 0 ? `
                        <div class="space-y-2">
                            ${dayExpenses.map(e => `
                                <div class="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg text-xs">
                                    <div class="truncate flex-1 pr-2">
                                        <span class="font-bold text-slate-700 block truncate">${e.description}</span>
                                        <span class="text-slate-400 text-[10px]">${e.category}</span>
                                    </div>
                                    <span class="font-bold text-brand-dark">${this.formatCurrency(e.amount)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-xs text-slate-400 italic">Sin gastos</p>'}
                </div>
            </div>
        `;
    },

    changeCalendarMonth(offset) {
        const newDate = new Date(this.state.selectedDate);
        newDate.setMonth(newDate.getMonth() + offset);
        this.state.selectedDate = newDate;
        this.renderCalendar(document.getElementById('app-content'));
    },

    selectCalendarDate(dateStr) {
        this.state.selectedDate = new Date(dateStr);
        this.renderCalendar(document.getElementById('app-content'));
    },

    openAddEventModal(dateStr) {
        const modalHtml = `
            <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl transform scale-100 transition-all border border-orange-100">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-display text-xl font-bold text-brand-dark">Nuevo Evento</h3>
                        <button onclick="document.getElementById('modal-overlay').remove()" class="text-slate-400 hover:text-brand-dark transition-colors">
                            <i class="ph-bold ph-x text-xl"></i>
                        </button>
                    </div>

                    <form onsubmit="app.handleAddEvent(event)" class="space-y-4">
                        <input type="hidden" name="date" value="${dateStr}">
                        
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                            <input name="title" required class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none" placeholder="Ej. Evento Especial">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                            <textarea name="description" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none" placeholder="Detalles..."></textarea>
                        </div>

                        <button type="submit" class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20">
                            Guardar Evento
                        </button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    handleAddEvent(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const eventData = {
            date: formData.get('date'),
            title: formData.get('title'),
            description: formData.get('description'),
            createdAt: new Date().toISOString()
        };

        db.collection('events').add(eventData)
            .then(() => {
                this.showToast('✅ Evento agregado');
                document.getElementById('modal-overlay').remove();
                this.loadData();
            })
            .catch(err => console.error(err));
    },

    deleteEvent(id) {
        if (!confirm('¿Eliminar este evento?')) return;
        db.collection('events').doc(id).delete()
            .then(() => {
                this.showToast('✅ Evento eliminado');
                this.loadData();
            })
            .catch(err => console.error(err));
    },

    renderBackup(container) {
        const html = `
            <div class="max-w-2xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <h2 class="font-display text-2xl font-bold text-brand-dark mb-6">Backup y Restauración</h2>
                
                <div class="space-y-6">
                    <!-- Export Card -->
                    <div class="bg-white p-8 rounded-2xl shadow-sm border border-orange-100">
                        <div class="flex items-start gap-4 mb-6">
                            <div class="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-2xl">
                                <i class="ph-fill ph-download-simple"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-lg text-brand-dark">Exportar Datos</h3>
                                <p class="text-sm text-slate-500 mt-1">Descarga un archivo con todo tu inventario, ventas y gastos. Úsalo para mover tus datos a otra computadora.</p>
                            </div>
                        </div>
                        <button onclick="app.exportData()" class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                            <i class="ph-bold ph-download"></i> Descargar Copia de Seguridad
                        </button>
                        
                        <div class="flex-1 relative">
                            <input type="file" id="import-file" accept=".json" class="hidden" onchange="app.importData(this)">
                            <button onclick="document.getElementById('import-file').click()" class="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                <i class="ph-fill ph-upload-simple text-xl"></i>
                                Importar Backup
                            </button>
                        </div>
                    </div>
                </div>

                <div class="bg-red-50 p-6 rounded-2xl border border-red-100">
                    <h3 class="font-bold text-lg mb-4 text-red-700">Zona de Peligro</h3>
                    <p class="text-red-600/80 text-sm mb-4">Estas acciones borran datos permanentemente y no se pueden deshacer.</p>
                    
                    <div class="space-y-3">
                        <button type="button" onclick="app.resetSales()" class="w-full bg-white border-2 border-orange-200 text-orange-600 py-3 rounded-xl font-bold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                            <i class="ph-fill ph-receipt-x text-xl"></i>
                            Borrar Todas las Ventas
                        </button>
                        <button type="button" onclick="app.resetApplication()" class="w-full bg-white border-2 border-red-200 text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                            <i class="ph-fill ph-trash text-xl"></i>
                            Restablecer de Fábrica
                        </button>
                    </div>
                </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    renderSettings(container) {
        const token = localStorage.getItem('discogs_token') || '';
        const html = `
            <div class="max-w-2xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <h2 class="font-display text-2xl font-bold text-brand-dark mb-6">Configuración</h2>
                
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-orange-100 mb-6">
                    <h3 class="font-bold text-lg text-brand-dark mb-4">Integraciones</h3>
                    <form onsubmit="app.saveSettings(event)" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Discogs Personal Access Token</label>
                            <input type="text" name="discogs_token" value="${token}" placeholder="Ej: hSIAXlFq..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:border-brand-orange outline-none font-mono text-sm">
                            <p class="text-xs text-slate-400 mt-2">Necesario para buscar portadas y datos de discos. <a href="https://www.discogs.com/settings/developers" target="_blank" class="text-brand-orange hover:underline">Generar Token</a></p>
                        </div>
                        <button type="submit" class="bg-brand-dark text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors">
                            Guardar Configuración
                        </button>
                    </form>
                </div>

                <!-- Excel Export Section -->
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-green-200 mb-6">
                    <div class="flex items-start gap-4 mb-6">
                        <div class="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center text-2xl">
                            <i class="ph-fill ph-file-xls"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-brand-dark">Exportar Inventario a Excel</h3>
                            <p class="text-sm text-slate-500 mt-1">Genera un archivo Excel con todos los discos, categorías, precios, estado en Discogs, estado en la web y más datos relevantes.</p>
                        </div>
                    </div>
                    <button onclick="app.exportInventoryToExcel()" class="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                        <i class="ph-bold ph-file-xls"></i> Descargar Excel Completo
                    </button>
                </div>

                <div class="bg-white p-8 rounded-2xl shadow-sm border border-orange-100 mb-6">
                    <h3 class="font-bold text-lg text-brand-dark mb-4">Migraciones de Datos</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <div>
                                <p class="font-bold text-amber-900">Marcar Productos como "Usado"</p>
                                <p class="text-xs text-amber-700">Actualiza todos los productos sin condición a "Second-hand"</p>
                            </div>
                            <button onclick="app.migrateProductCondition()" class="bg-amber-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-700 transition-colors text-sm">
                                <i class="ph-bold ph-database mr-1"></i> Migrar
                            </button>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <div>
                                <p class="font-bold text-blue-900">Migrar Datos de Ventas</p>
                                <p class="text-xs text-blue-700">Agrega costo y condición a ventas sin estos datos</p>
                            </div>
                            <button onclick="app.migrateSalesData()" class="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm">
                                <i class="ph-bold ph-receipt mr-1"></i> Migrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    saveSettings(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const token = formData.get('discogs_token').trim();

        if (token) {
            localStorage.setItem('discogs_token', token);
            localStorage.setItem('discogs_token_warned', 'true'); // Clear warning
            this.showToast('Configuración guardada correctamente');
        } else {
            localStorage.removeItem('discogs_token');
            this.showToast('Token eliminado');
        }
    },

    async migrateProductCondition() {
        if (!confirm('¿Estás seguro? Esto marcará TODOS los productos como "Usado (Second-hand)".')) return;

        this.showToast('⏳ Migrando productos...', 'info');

        try {
            const snapshot = await db.collection('products').get();
            let updatedCount = 0;
            const batch = db.batch();

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Only update if product_condition is not set
                if (!data.product_condition) {
                    batch.update(doc.ref, { product_condition: 'Second-hand' });
                    updatedCount++;
                }
            });

            await batch.commit();
            this.showToast(`✅ ${updatedCount} productos marcados como "Usado"`);
            await this.loadData();
        } catch (error) {
            console.error('Migration error:', error);
            this.showToast('❌ Error durante la migración: ' + error.message, 'error');
        }
    },

    async migrateSalesData() {
        if (!confirm('¿Migrar datos de ventas? Esto agregará información de costo y condición a ventas antiguas.')) return;

        this.showToast('⏳ Migrando ventas...', 'info');

        try {
            const salesSnapshot = await db.collection('sales').get();
            let updatedCount = 0;
            let batchCount = 0;
            let batch = db.batch();

            for (const saleDoc of salesSnapshot.docs) {
                const saleData = saleDoc.data();
                const items = saleData.items || [];
                let needsUpdate = false;
                const updatedItems = [];

                for (const item of items) {
                    const updatedItem = { ...item };

                    // Check if item needs migration
                    if (!item.costAtSale && item.costAtSale !== 0) {
                        needsUpdate = true;

                        // Find product in inventory
                        const productId = item.productId || item.recordId;
                        const album = item.album;

                        const product = this.state.inventory.find(p =>
                            (productId && (p.id === productId || p.sku === productId)) ||
                            (album && p.album === album)
                        );

                        if (product) {
                            updatedItem.costAtSale = product.cost || 0;
                            updatedItem.productCondition = product.product_condition || 'Second-hand';
                            updatedItem.productId = product.id || productId;
                            if (!updatedItem.album) updatedItem.album = product.album;
                        } else {
                            // Default values if product not found
                            updatedItem.costAtSale = 0;
                            updatedItem.productCondition = 'Second-hand';
                        }
                    }

                    updatedItems.push(updatedItem);
                }

                if (needsUpdate) {
                    batch.update(saleDoc.ref, { items: updatedItems });
                    updatedCount++;
                    batchCount++;

                    // Firestore batch limit is 500
                    if (batchCount >= 450) {
                        await batch.commit();
                        batch = db.batch();
                        batchCount = 0;
                    }
                }
            }

            // Commit remaining updates
            if (batchCount > 0) {
                await batch.commit();
            }

            this.showToast(`✅ ${updatedCount} ventas actualizadas con datos de producto`);
            await this.loadData();
        } catch (error) {
            console.error('Sales migration error:', error);
            this.showToast('❌ Error: ' + error.message, 'error');
        }
    },
    exportData() {
        const data = {
            inventory: this.state.inventory,
            sales: this.state.sales,
            expenses: this.state.expenses,
            consignors: this.state.consignors,
            customGenres: this.state.customGenres,
            customCategories: this.state.customCategories,
            timestamp: new Date().toISOString()
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "el_cuartito_backup_" + new Date().toISOString().slice(0, 10) + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    exportInventoryToExcel() {
        this.showToast('⏳ Generando Excel...', 'info');

        try {
            // Prepare data for Excel
            const excelData = this.state.inventory.map(item => {
                // Collect all genres
                const genres = [item.genre, item.genre2, item.genre3, item.genre4, item.genre5]
                    .filter(Boolean)
                    .join(', ');

                return {
                    'SKU': item.sku || '',
                    'Artista': item.artist || '',
                    'Álbum': item.album || '',
                    'Sello': item.label || '',
                    'Año': item.year || '',
                    'Géneros': genres,
                    'Condición Vinilo': item.status || '',
                    'Condición Cover': item.sleeveCondition || '',
                    'Condición Producto': item.product_condition || 'Second-hand',
                    'Precio (DKK)': item.price || 0,
                    'Costo (DKK)': item.cost || 0,
                    'Stock': item.stock || 0,
                    'En Web': item.is_online ? 'Sí' : 'No',
                    'En Discogs': item.discogs_listing_id ? 'Sí' : 'No',
                    'Discogs Listing ID': item.discogs_listing_id || '',
                    'Discogs Release ID': item.discogs_release_id || item.discogsId || '',
                    'Consignatario': item.consignor || '',
                    'Ubicación': item.location || '',
                    'Notas': item.notes || '',
                    'Fecha Creación': item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES') : '',
                    'URL Imagen': item.imageUrl || ''
                };
            });

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Set column widths for better readability
            ws['!cols'] = [
                { wch: 12 },  // SKU
                { wch: 25 },  // Artista
                { wch: 30 },  // Álbum
                { wch: 20 },  // Sello
                { wch: 6 },   // Año
                { wch: 30 },  // Géneros
                { wch: 12 },  // Condición Vinilo
                { wch: 12 },  // Condición Cover
                { wch: 15 },  // Condición Producto
                { wch: 10 },  // Precio
                { wch: 10 },  // Costo
                { wch: 6 },   // Stock
                { wch: 8 },   // En Web
                { wch: 10 },  // En Discogs
                { wch: 15 },  // Discogs Listing ID
                { wch: 15 },  // Discogs Release ID
                { wch: 15 },  // Consignatario
                { wch: 12 },  // Ubicación
                { wch: 30 },  // Notas
                { wch: 12 },  // Fecha Creación
                { wch: 40 }   // URL Imagen
            ];

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

            // Generate filename with date
            const filename = `ElCuartito_Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;

            // Download the file
            XLSX.writeFile(wb, filename);

            this.showToast(`✅ Excel exportado: ${this.state.inventory.length} discos`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            this.showToast('❌ Error al exportar: ' + error.message, 'error');
        }
    },

    importData(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!confirm('¿Estás seguro de restaurar este backup? Se sobrescribirán los datos actuales.')) return;

                // Batch write to Firestore
                const batch = db.batch();

                // Clear existing collections? Firestore doesn't have a "delete collection" client-side easily.
                // For import, we might just overwrite/add. 
                // A true restore is complex in Firestore client-side without cloud functions to wipe first.
                // For now, let's just add/merge items. 
                // WARNING: This might duplicate if IDs are different or not handled.
                // Since we use SKU as ID for inventory, that merges.
                // Sales/Expenses use auto-ID usually, so they might duplicate if re-imported.

                alert('La importación completa sobrescribiendo datos en la nube es compleja. Por seguridad, esta función solo agrega/actualiza items de inventario por ahora.');

                // Example: Import Inventory
                if (data.inventory) {
                    data.inventory.forEach(item => {
                        const ref = db.collection('products').doc(item.sku);
                        batch.set(ref, item);
                    });
                }

                batch.commit().then(() => {
                    this.showToast('Datos importados (Inventario)');
                });

            } catch (err) {
                alert('Error al leer el archivo de respaldo');
                console.error(err);
            }
        };
        reader.readAsText(file);
    },

    resetApplication() {
        if (!confirm('⚠️ ¡ADVERTENCIA! ⚠️\n\nEsto borrará PERMANENTEMENTE todo el inventario, ventas, gastos y socios de la base de datos.\n\n¿Estás absolutamente seguro?')) return;

        const password = prompt('Para confirmar, ingresa la contraseña de administrador:');
        if (password !== 'alejo13') {
            alert('Contraseña incorrecta. Operación cancelada.');
            return;
        }

        this.showToast('Iniciando borrado completo...');

        // Helper to delete all docs in a collection
        const deleteCollection = (collectionName) => {
            return db.collection(collectionName).get().then(snapshot => {
                const batch = db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                return batch.commit();
            });
        };

        Promise.all([
            deleteCollection('inventory'),
            deleteCollection('sales'),
            deleteCollection('expenses'),
            deleteCollection('consignors'),
            db.collection('settings').doc('general').delete()
        ]).then(() => {
            this.showToast('♻️ Aplicación restablecida de fábrica');
            setTimeout(() => location.reload(), 1500);
        }).catch(err => {
            console.error(err);
            alert('Error al borrar datos: ' + err.message);
        });
    },

    resetSales() {
        if (!confirm('⚠️ ADVERTENCIA ⚠️\n\nEsto borrará PERMANENTEMENTE todas las ventas (manuales y online) de la base de datos.\n\nEl inventario, gastos y socios NO serán afectados.\n\n¿Estás seguro?')) return;

        const password = prompt('Para confirmar, ingresa la contraseña de administrador:');
        if (password !== 'alejo13') {
            alert('Contraseña incorrecta. Operación cancelada.');
            return;
        }

        this.showToast('Borrando todas las ventas...');

        // Delete only sales collection
        db.collection('sales').get().then(snapshot => {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        }).then(() => {
            this.showToast('✅ Todas las ventas han sido eliminadas');
            setTimeout(() => location.reload(), 1500);
        }).catch(err => {
            console.error(err);
            alert('Error al borrar ventas: ' + err.message);
        });
    },

    // --- Helper Functions ---

    // Helper to find product by SKU field (not document ID)
    async findProductBySku(sku) {
        try {
            const snapshot = await db.collection('products').where('sku', '==', sku).get();
            if (snapshot.empty) {
                return null;
            }
            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ref: doc.ref,
                data: doc.data()
            };
        } catch (error) {
            console.error('Error finding product by SKU:', error);
            return null;
        }
    },

    logInventoryMovement(type, item) {
        let details = '';
        if (type === 'EDIT') details = 'Producto actualizado';
        else if (type === 'ADD') details = 'Ingreso de inventario';
        else if (type === 'DELETE') details = 'Egreso manual';
        else if (type === 'SOLD') details = 'Venta registrada';

        db.collection('inventory_logs').add({
            type: type, // 'ADD', 'DELETE', 'EDIT', 'SOLD'
            sku: item.sku || 'Unknown',
            album: item.album || 'Unknown',
            artist: item.artist || 'Unknown',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            details: details
        }).catch(err => console.error("Error logging movement:", err));
    },

    openInventoryLogModal() {
        db.collection('inventory_logs').orderBy('timestamp', 'desc').limit(50).get().then(snapshot => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const html = `
                <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl w-full max-w-4xl p-6 md:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
                        <div class="flex justify-between items-center mb-6 shrink-0">
                            <h3 class="font-display text-2xl font-bold text-brand-dark flex items-center gap-2">
                                <i class="ph-bold ph-clock-counter-clockwise text-brand-orange"></i> Historial de Movimientos
                            </h3>
                            <button onclick="document.getElementById('modal-overlay').remove()" class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                                <i class="ph-bold ph-x text-xl"></i>
                            </button>
                        </div>

                        <div class="flex-1 overflow-y-auto custom-scrollbar rounded-xl border border-slate-100">
                            <table class="w-full text-left">
                                <thead class="bg-slate-50 sticky top-0 z-10 text-xs uppercase text-slate-500 font-bold">
                                    <tr>
                                        <th class="p-4">Fecha</th>
                                        <th class="p-4">Tipo</th>
                                        <th class="p-4">Item</th>
                                        <th class="p-4">SKU</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50 text-sm">
                                    ${logs.map(log => {
                let badgeClass = 'bg-slate-100 text-slate-600';
                if (log.type === 'ADD') badgeClass = 'bg-green-100 text-green-700';
                if (log.type === 'DELETE') badgeClass = 'bg-red-100 text-red-700';
                if (log.type === 'EDIT') badgeClass = 'bg-blue-100 text-blue-700';
                if (log.type === 'SOLD') badgeClass = 'bg-purple-100 text-purple-700';

                const date = log.timestamp ? (log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp)) : new Date();

                return `
                                            <tr>
                                                <td class="p-4 text-slate-500 whitespace-nowrap">
                                                    ${date.toLocaleDateString()} <span class="text-xs text-slate-400 opacity-75">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td class="p-4">
                                                    <span class="px-2 py-1 rounded-md text-[10px] font-bold uppercase ${badgeClass}">${log.type}</span>
                                                </td>
                                                <td class="p-4 font-bold text-brand-dark">${log.album || 'Unknown'}</td>
                                                <td class="p-4 font-mono text-xs text-slate-400">${log.sku || 'N/A'}</td>
                                            </tr>
                                        `;
            }).join('') || '<tr><td colspan="4" class="p-8 text-center text-slate-400">No hay movimientos registrados</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        });
    },

    async syncWithDiscogs() {
        const btn = document.getElementById('discogs-sync-btn');
        if (!btn) return;

        // Show loading state
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `
            <i class="ph-bold ph-circle-notch text-xl animate-spin"></i>
            <span class="text-sm font-bold hidden sm:inline">Sincronizando...</span>
        `;

        try {
            const backendUrl = BASE_API_URL;

            // 1. Sync Inventory
            const invResponse = await fetch(`${backendUrl}/discogs/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const invResult = await invResponse.json();

            // 2. Sync Orders
            const orderResponse = await fetch(`${backendUrl}/discogs/sync-orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const orderResult = await orderResponse.json();

            if (invResult.success || (orderResult && orderResult.success)) {
                let msg = `✅ Sincronizado: ${invResult.synced || 0} productos`;
                if (orderResult && orderResult.salesCreated > 0) {
                    msg += `. ¡Detectadas ${orderResult.salesCreated} nuevas ventas!`;
                }
                this.showToast(msg);

                // Reload data
                await this.loadData();
                this.refreshCurrentView();
            } else {
                throw new Error(invResult.error || (orderResult && orderResult.error) || 'Error desconocido');
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.showToast(`❌ Error al sincronizar: ${error.message}`);
        } finally {
            // Restore button
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    },

    // --- UTILS ---
    formatCurrency(amount) {
        return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(amount);
    },

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    getMonthName(monthIndex) {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[monthIndex];
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toast-message').innerText = message;
        toast.classList.remove('opacity-0', '-translate-y-20', 'md:translate-y-20');
        setTimeout(() => {
            toast.classList.add('opacity-0', '-translate-y-20', 'md:translate-y-20');
        }, 3000);
    },

    setupNavigation() {
        // Navigation is handled via inline onclick events in HTML
        // This function is kept for compatibility with init()
    },

    setupMobileMenu() {
        // Mobile menu setup
    },

    toggleMobileMenu() {
        const menu = document.getElementById('mobile-menu');
        const overlay = document.getElementById('mobile-menu-overlay');

        if (!menu || !overlay) return;

        if (menu.classList.contains('translate-y-full')) {
            // Open
            menu.classList.remove('translate-y-full');
            overlay.classList.remove('hidden');
        } else {
            // Close
            menu.classList.add('translate-y-full');
            overlay.classList.add('hidden');
        }
    },

    // --- LOGIC ---



    // --- VIEWS ---

    toggleMonthFilter(monthIndex) {
        const index = this.state.filterMonths.indexOf(monthIndex);
        if (index === -1) {
            this.state.filterMonths.push(monthIndex);
        } else {
            // Prevent deselecting the last month (always keep at least one)
            if (this.state.filterMonths.length > 1) {
                this.state.filterMonths.splice(index, 1);
            }
        }
        this.state.filterMonths.sort((a, b) => a - b);
        this.refreshCurrentView();
    },

    async setReadyForPickup(saleId) {
        try {
            const btn = event?.target?.closest('button') || (window.event?.target?.closest('button'));

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Guardando...';
            }

            const response = await fetch(`${BASE_API_URL}/api/ready-for-pickup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ orderId: saleId })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showToast('✅ Pedido listo para retiro');
                this.showToast('📧 Cliente notificado por email');

                // Refresh data and reopen modal
                await this.loadData();
                const modal = document.getElementById('sale-detail-modal');
                if (modal) {
                    modal.remove();
                    this.openUnifiedOrderDetailModal(saleId);
                }
            } else {
                throw new Error(result.error || result.message || 'Error desconocido');
            }
        } catch (error) {
            console.error("Error setting ready for pickup:", error);
            this.showToast("❌ Error: " + (error.message || 'No se pudo procesar el estado'), 'error');
            const btn = event?.target?.closest('button') || (window.event?.target?.closest('button'));
            btn.disabled = false;
            btn.innerHTML = '<i class="ph-bold ph-storefront"></i> Listo para Retiro';
        }
    },

    renderDashboard(container) {
        try {
            // 1. Data Processing
            const selectedMonths = this.state.filterMonths;
            const currentYear = this.state.filterYear;
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            const filteredSales = this.state.sales.filter(s => {
                const saleDate = s.timestamp?.toDate ? s.timestamp.toDate() : new Date(s.timestamp || s.date);
                return saleDate.getFullYear() === currentYear && selectedMonths.includes(saleDate.getMonth());
            });

            const sortedSales = [...filteredSales].sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || a.date);
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || b.date);
                return dateB - dateA;
            });

            // --- NEW: Unified Movements Feed (Last 5 Sales/Expenses) ---
            const lastMovements = [
                ...this.state.sales.map(s => ({ ...s, type: 'sale', sortDate: new Date(s.date) })),
                ...this.state.expenses.map(e => ({ ...e, type: 'expense', sortDate: new Date(e.date || e.fecha_factura) }))
            ]
                .sort((a, b) => b.sortDate - a.sortDate)
                .slice(0, 5);

            // --- NEW: 30-Day Trend Data Processing ---
            const last30Days = [];
            const last30DaysRevenue = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                last30Days.push(d.getDate());

                const dayRevenue = this.state.sales
                    .filter(s => s.date === dateStr)
                    .reduce((sum, s) => sum + (Number(s.total || s.total_amount) || 0), 0);
                last30DaysRevenue.push(dayRevenue);
            }

            // --- NEW: Card 1 - Current vs Previous Month Revenue ---
            const todayFull = new Date();
            const curM = todayFull.getMonth();
            const curY = todayFull.getFullYear();

            const prevM = curM === 0 ? 11 : curM - 1;
            const prevY = curM === 0 ? curY - 1 : curY;

            const curMonthSalesTotal = this.state.sales
                .filter(s => { const d = new Date(s.date); return d.getMonth() === curM && d.getFullYear() === curY; })
                .reduce((sum, s) => sum + (Number(s.originalTotal || s.total_amount || s.total) || 0), 0);

            const prevMonthSalesTotal = this.state.sales
                .filter(s => { const d = new Date(s.date); return d.getMonth() === prevM && d.getFullYear() === prevY; })
                .reduce((sum, s) => sum + (Number(s.originalTotal || s.total_amount || s.total) || 0), 0);

            const growth = prevMonthSalesTotal > 0 ? ((curMonthSalesTotal - prevMonthSalesTotal) / prevMonthSalesTotal) * 100 : 0;
            const growthText = `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% vs ${this.getMonthName(prevM)}`;
            // 2. Financial Calculations (Consolidated)
            let totalRevenue = 0;
            let totalNetProfit = 0;
            let totalShippingCosts = 0;
            let partnersShare = 0;

            // VAT Components for "Moms Tilsvar" Logic
            let totalStandardVat = 0;
            let totalMarginVat = 0;
            let totalShippingVat = 0;
            let totalShippingIncome = 0;

            filteredSales.forEach(sale => {
                const isDiscogs = sale.channel?.toLowerCase() === 'discogs';
                const gross = Number(sale.originalTotal) || Number(sale.total_amount) || Number(sale.total) || 0;
                const net = Number(sale.total) || Number(sale.total_amount) || 0;
                const platformFee = isDiscogs ? (gross - net) : 0;
                const shippingCost = Number(sale.shipping_cost) || 0;

                totalRevenue += gross;
                totalShippingCosts += shippingCost;

                let saleProfit = 0;
                const items = sale.items || [];

                if (items.length > 0) {
                    items.forEach(item => {
                        const price = Number(item.priceAtSale || item.unitPrice || item.price) || 0;
                        const qty = Number(item.qty || item.quantity) || 1;
                        let itemCost = Number(item.costAtSale || item.cost) || 0;
                        const owner = (item.owner || '').toLowerCase();
                        const condition = item.productCondition || item.condition || 'Used'; // Default to Margin Scheme
                        const totalPrice = price * qty;

                        // If cost is 0, try to find it from the inventory (MATCH VAT REPORT LOGIC)
                        if (itemCost === 0) {
                            const productId = item.productId || item.recordId;
                            const albumName = item.album;
                            const inventoryProduct = this.state.inventory.find(p =>
                                (productId && (p.id === productId || p.sku === productId)) ||
                                (albumName && p.album === albumName)
                            );
                            if (inventoryProduct) {
                                itemCost = inventoryProduct.cost || 0;
                            }
                        }

                        // Calculate VAT based on MOMS TILSVAR logic
                        if (condition === 'New') {
                            totalStandardVat += (totalPrice * 0.20);
                        } else {
                            const margin = totalPrice - (itemCost * qty);
                            totalMarginVat += (margin > 0 ? margin * 0.20 : 0);
                        }

                        if (owner === 'el cuartito' || owner === '') {
                            itemCost = Number(item.costAtSale || item.cost) || 0;
                        } else {
                            if (itemCost === 0 || isNaN(itemCost)) {
                                const partner = this.state.consignors ? this.state.consignors.find(c => (c.name || '').toLowerCase() === owner) : null;
                                const split = partner ? (partner.agreementSplit || partner.split || 70) : 70;
                                itemCost = (price * (Number(split) || 70)) / 100;
                            }
                            partnersShare += (itemCost * qty);
                        }
                        saleProfit += ((price - itemCost) * qty);
                    });
                } else {
                    saleProfit = gross;
                    // Fallback VAT for generic sales if no items (Standard 25% VAT extracted as 20% of gross)
                    totalStandardVat += (gross * 0.20);
                }

                // Calculate Shipping VAT (MATCH VAT REPORT LOGIC)
                const sIncome = parseFloat(sale.shipping_income || sale.shipping || sale.shipping_cost || 0);
                if (sIncome > 0) {
                    totalShippingVat += (sIncome * 0.20);
                    totalShippingIncome += sIncome;
                }

                totalNetProfit += (saleProfit - platformFee);
            });

            // Calculate deductible input VAT using EXACT SAME filter as renderVATReport
            const deductibleExpenses = this.state.expenses.filter(e => {
                const expDate = e.fecha_factura ? new Date(e.fecha_factura) : (e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp || e.date));
                const isDeductible = e.categoria_tipo === 'operativo' || e.categoria_tipo === 'stock_nuevo' || e.is_vat_deductible;
                return isDeductible && expDate.getFullYear() === currentYear && selectedMonths.includes(expDate.getMonth());
            });

            const totalInputVat = deductibleExpenses.reduce((sum, e) => sum + (parseFloat(e.monto_iva) || 0), 0);
            const momsTilsvar = (totalStandardVat + totalMarginVat + totalShippingVat) - totalInputVat;

            const taxAmount = momsTilsvar;

            // --- NEW: Card 2 - Operating Expenses for Profit Calculation ---
            const periodExpenses = this.state.expenses
                .filter(e => {
                    const d = new Date(e.date || e.fecha_factura);
                    return d.getFullYear() === currentYear && selectedMonths.includes(d.getMonth());
                })
                .reduce((sum, e) => sum + (Number(e.monto_total || e.amount) || 0), 0);

            const netProfitActual = totalNetProfit - taxAmount - periodExpenses;
            const cuartitoShare = totalNetProfit - taxAmount; // Legacy reference

            // 3. Stock Metrics
            const totalStockValueSale = this.state.inventory.reduce((sum, i) => sum + (i.price * i.stock), 0);
            const totalItems = this.state.inventory.reduce((sum, i) => sum + i.stock, 0);

            // 4. Operational Alerts
            const lowStockItems = this.state.inventory.filter(i => i.stock > 0 && i.stock < 1);
            const pendingOrders = this.state.sales.filter(s =>
                s.fulfillment_status === 'preparing' ||
                s.status === 'paid' ||
                (s.channel?.toLowerCase() === 'discogs' && s.status !== 'shipped' && s.fulfillment_status !== 'shipped')
            );

            // --- NEW: IVA Estimado (Real-time for selected period) ---
            const estimatedVAT = taxAmount;

            const periodText = selectedMonths.length === 12
                ? `Año ${currentYear} `
                : `${selectedMonths.map(m => this.getMonthName(m)).join(', ')} ${currentYear} `;

            const html = `
            <div class="max-w-7xl mx-auto space-y-8 pb-24 md:pb-8 px-4 md:px-8 pt-6">
                <!-- Header with Navigation and Filter -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-brand-orange rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl shadow-brand-orange/20">
                            <i class="ph-fill ph-house-line"></i>
                        </div>
                        <div>
                            <h2 class="font-display text-3xl font-bold text-brand-dark">Resumen Operativo</h2>
                            <p class="text-slate-500 text-sm">Monitor de actividad: <span class="font-bold text-brand-orange">${periodText}</span></p>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                        <select id="dashboard-year" onchange="app.updateFilter('year', this.value)" class="bg-slate-50 text-xs font-bold text-brand-dark px-3 py-2 rounded-xl border-none outline-none cursor-pointer">
                            <option value="2026" ${this.state.filterYear === 2026 ? 'selected' : ''}>2026</option>
                            <option value="2025" ${this.state.filterYear === 2025 ? 'selected' : ''}>2025</option>
                        </select>
                        <div class="h-6 w-px bg-slate-100 mx-1"></div>
                        <div class="flex gap-1 overflow-x-auto max-w-[300px] md:max-w-none no-scrollbar">
                            ${monthNames.map((m, i) => `
                                <button onclick="app.toggleMonthFilter(${i})" 
                                    class="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${selectedMonths.includes(i) ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'text-slate-400 hover:text-brand-dark hover:bg-slate-50'}">
                                    ${m}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- KPI Top Grid (3 Status Cards) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Card 1: Ventas del Mes (Literal Actual) -->
                    <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-brand-orange">
                                <i class="ph-bold ph-chart-line-up text-xl"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Ventas del Mes</span>
                        </div>
                        <p class="text-4xl font-display font-bold text-brand-dark mb-2">${this.formatCurrency(curMonthSalesTotal)}</p>
                        <div class="flex items-center gap-2">
                             <span class="text-[10px] font-bold ${growth >= 0 ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50'} px-2 py-0.5 rounded-full border ${growth >= 0 ? 'border-emerald-100' : 'border-red-100'}">
                                ${growthText}
                             </span>
                        </div>
                    </div>

                    <!-- Card 2: Beneficio Neto Estimado -->
                    <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                <i class="ph-bold ph-hand-coins text-xl"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Beneficio Neto</span>
                        </div>
                        <p class="text-4xl font-display font-bold text-emerald-600 mb-2">${this.formatCurrency(netProfitActual)}</p>
                        <p class="text-[10px] text-slate-400 font-medium">Incluye costos, fees y gastos operativos.</p>
                    </div>

                    <!-- Card 3: Alerta de Pedidos -->
                    <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 ${pendingOrders.length > 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'} rounded-xl flex items-center justify-center">
                                <i class="ph-bold ${pendingOrders.length > 0 ? 'ph-package' : 'ph-check-circle'} text-xl"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Alerta de Pedidos</span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            ${pendingOrders.length > 0
                    ? `<p class="text-5xl font-display font-bold text-red-500">${pendingOrders.length}</p>`
                    : `<p class="text-3xl font-display font-bold text-green-600">Al día</p>`}
                        </div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Pedidos por despachar</p>
                    </div>
                </div>

                <!-- Main Layout Grid (Asymmetric 65/35) -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    <!-- Left Column (65%) - Actividad -->
                    <div class="lg:col-span-8 space-y-8">
                        <!-- Sales Trend Chart (Last 30 Days) -->
                        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div class="flex justify-between items-center mb-6">
                                <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                    <i class="ph-bold ph-activity text-brand-orange"></i> Evolución de Ingresos (30 días)
                                </h3>
                                <div class="flex gap-2">
                                     <span class="h-2 w-2 rounded-full bg-brand-orange animate-pulse"></span>
                                     <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Actualizado</span>
                                </div>
                            </div>
                            <div class="h-64">
                                <canvas id="last30DaysChart"></canvas>
                            </div>
                        </div>

                        <!-- Recent Movements Table (Unified) -->
                        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                    <i class="ph-bold ph-swap text-slate-400"></i> Últimos Movimientos
                                </h3>
                                <div class="flex gap-2 text-[10px] uppercase font-bold text-slate-400">
                                    <span>Venta / Gasto</span>
                                </div>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left">
                                    <tbody class="divide-y divide-slate-50">
                                        ${lastMovements.map(m => {
                        const isSale = m.type === 'sale';
                        const title = isSale ? (m.album || 'Venta de Items') : (m.proveedor || m.description || 'Gasto registrado');
                        const sub = isSale ? (m.channel || 'Tienda Local') : (m.categoria || 'Operativo');

                        // Channel Icons
                        let iconClass = "ph-receipt";
                        if (isSale) {
                            const channel = (m.channel || '').toLowerCase();
                            if (channel.includes('web')) iconClass = "ph-globe-simple";
                            if (channel.includes('discogs')) iconClass = "ph-vinyl-record";
                        } else {
                            iconClass = "ph-credit-card";
                        }

                        return `
                                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                                    <td class="px-6 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <div class="w-10 h-10 rounded-xl ${isSale ? 'bg-orange-50 text-brand-orange' : 'bg-slate-100 text-slate-400'} flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                                                                 <i class="ph-bold ${iconClass} text-lg"></i>
                                                             </div>
                                                             <div class="min-w-0">
                                                                 <div class="font-bold text-sm text-brand-dark truncate max-w-[200px]" title="${title}">${title}</div>
                                                                 <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${sub}</div>
                                                             </div>
                                                         </div>
                                                     </td>
                                                     <td class="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                         ${this.formatDate(m.date || m.fecha_factura)}
                                                     </td>
                                                     <td class="px-6 py-4 text-right">
                                                         <span class="font-bold text-sm ${isSale ? 'text-brand-dark' : 'text-red-500'}">
                                                            ${!isSale ? '-' : ''}${this.formatCurrency(m.total || m.monto_total || m.amount || 0)}
                                                         </span>
                                                     </td>
                                                 </tr>
                                             `;
                    }).join('') || '<tr><td colspan="3" class="p-12 text-center text-slate-400 italic">Sin movimientos recientes</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column (35%) - Centro de Control -->
                    <div class="lg:col-span-4 space-y-8">
                        
                        <!-- Quick Actions Panel -->
                        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-brand-dark">
                            <h3 class="font-bold text-base mb-6 flex items-center gap-2">
                                <i class="ph-bold ph-lightning text-brand-orange"></i> Centro de Control
                            </h3>
                            <div class="flex flex-col gap-4">
                                <button onclick="app.navigate('sales')" class="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-orange-50 rounded-2xl transition-all border border-slate-100 hover:border-orange-100 group">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-orange shadow-sm group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-shopping-cart text-2xl"></i>
                                        </div>
                                        <div class="text-left">
                                            <span class="block font-bold text-slate-700">Nueva Venta (POS)</span>
                                            <span class="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestión operativa</span>
                                        </div>
                                    </div>
                                    <i class="ph-bold ph-caret-right text-slate-300"></i>
                                </button>

                                <button onclick="app.navigate('expenses')" class="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-orange-50 rounded-2xl transition-all border border-slate-100 hover:border-orange-100 group">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-receipt text-2xl"></i>
                                        </div>
                                        <div class="text-left">
                                            <span class="block font-bold text-slate-700">Cargar Compra/Gasto</span>
                                            <span class="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registro de facturas</span>
                                        </div>
                                    </div>
                                    <i class="ph-bold ph-caret-right text-slate-300"></i>
                                </button>

                                <button onclick="app.openAddVinylModal()" class="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-orange-50 rounded-2xl transition-all border border-slate-100 hover:border-orange-100 group">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-purple-500 shadow-sm group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-plus-circle text-2xl"></i>
                                        </div>
                                        <div class="text-left">
                                            <span class="block font-bold text-slate-700">Agregar Stock (Bulk)</span>
                                            <span class="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Alta de lotes LPs</span>
                                        </div>
                                    </div>
                                    <i class="ph-bold ph-caret-right text-slate-300"></i>
                                </button>
                            </div>

                            <!-- Mini Fiscal Summary Widget -->
                            <div class="mt-8 pt-8 border-t border-slate-50">
                                <div class="bg-brand-dark p-6 rounded-2xl text-white shadow-xl shadow-brand-dark/10 relative overflow-hidden group">
                                    <h4 class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Resumen Fiscal</h4>
                                    <div class="flex justify-between items-baseline">
                                        <span class="text-xs text-slate-300 font-bold uppercase tracking-tighter">Moms Tilsvar:</span>
                                        <span class="text-xl font-display font-bold text-brand-orange">${this.formatCurrency(estimatedVAT)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;
            container.innerHTML = html;
            this.renderDashboardCharts(filteredSales, last30Days, last30DaysRevenue);
        } catch (error) {
            console.error("Dashboard render error:", error);
            container.innerHTML = `<div class="p-12 text-center text-red-500 font-bold bg-red-50 rounded-3xl m-8 border border-red-100">
                <i class="ph-bold ph-warning-circle text-4xl mb-4"></i>
                <p>Error al cargar el dashboard: ${error.message}</p>
                <button onclick="app.loadData()" class="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl">Intentar de nuevo</button>
            </div>`;
        }
    },

    renderInventoryCart() {
        const container = document.getElementById('inventory-cart-container');
        if (!container) return;

        if (this.state.cart.length === 0) {
            container.classList.add('hidden');
            return;
        }
        container.classList.remove('hidden');

        const itemsHtml = this.state.cart.map((item, index) => `
    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                <div class="truncate pr-2">
                    <p class="font-bold text-xs text-brand-dark truncate">${item.album}</p>
                    <p class="text-[10px] text-slate-500 truncate">${this.formatCurrency(item.price)}</p>
                </div>
                <button onclick="app.removeFromCart(${index})" class="text-red-400 hover:text-red-600">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
    `).join('');

        container.innerHTML = `
    <div id="cart-widget" class="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-bold text-brand-dark flex items-center gap-2">
                        <i class="ph-fill ph-shopping-cart text-brand-orange"></i> Carrito 
                        <span class="bg-brand-orange text-white text-xs px-1.5 py-0.5 rounded-full">${this.state.cart.length}</span>
                    </h3>
                    <button onclick="app.clearCart()" class="text-xs text-red-500 font-bold hover:underline">Vaciar</button>
                </div>
                <div class="space-y-2 mb-4 max-h-40 overflow-y-auto text-sm custom-scrollbar">
                    ${itemsHtml}
                </div>
                <div class="pt-3 border-t border-slate-50 flex justify-between items-center mb-3">
                     <span class="text-xs font-bold text-slate-500">Total</span>
                     <span class="font-bold text-brand-dark text-lg">${this.formatCurrency(this.state.cart.reduce((s, i) => s + i.price, 0))}</span>
                </div>
                <button onclick="app.openCheckoutModal()" class="w-full py-2 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 text-sm hover:scale-[1.02] transition-transform">
                    Finalizar Venta
                </button>
            </div>
    `;
    },

    renderInventoryContent(container, filteredInventory, allGenres, allOwners, allStorage) {
        // CONTENT AREA (Grid/List)
        container.innerHTML = `
            ${this.state.viewMode === 'grid' ? `
                <!-- GRID VIEW -->
                ${
                // FOLDER LOGIC: If Grid Mode + No Specific Filter is active -> Show Folders
                (this.state.filterGenre === 'all' && this.state.filterOwner === 'all' && this.state.filterLabel === 'all' && this.state.filterStorage === 'all' && this.state.inventorySearch === '') ? `
                    
                    <div class="space-y-8 animate-fade-in">
                        <!-- Genres Folder -->
                        <div>
                            <h3 class="font-bold text-brand-dark text-lg mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-music-notes-simple text-brand-orange"></i> Géneros
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                ${allGenres.map(g => `
                                    <div onclick="app.navigateInventoryFolder('genre', '${g}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange cursor-pointer transition-all group text-center">
                                        <div class="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-orange group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-folder-notch text-2xl"></i>
                                        </div>
                                        <h4 class="font-bold text-brand-dark text-sm truncate">${g}</h4>
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(i => i.genre === g).length} items</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Owners Folder -->
                         <div>
                            <h3 class="font-bold text-brand-dark text-lg mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-users text-blue-500"></i> Dueños
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                ${allOwners.map(o => `
                                    <div onclick="app.navigateInventoryFolder('owner', '${o}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange cursor-pointer transition-all group text-center">
                                        <div class="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500 group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-folder-user text-2xl"></i>
                                        </div>
                                        <h4 class="font-bold text-brand-dark text-sm truncate">${o}</h4>
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(i => i.owner === o).length} items</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Labels Folder (Label Disquería) -->
                         <div>
                            <h3 class="font-bold text-brand-dark text-lg mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-tag text-purple-500"></i> Label Disquería
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                ${allStorage.map(s => `
                                    <div onclick="app.navigateInventoryFolder('storage', '${s.replace(/'/g, "\\'")}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange cursor-pointer transition-all group text-center">
                                        <div class="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-500 group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-tag text-2xl"></i>
                                        </div>
                                        <h4 class="font-bold text-brand-dark text-sm truncate">${s}</h4>
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(i => i.storageLocation === s).length} items</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    ` : ` <!-- ITEMS GRID (Filtered) -->
                    <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-fade-in">
                        <!-- Back Button if Filtered -->
                        ${(this.state.filterGenre !== 'all' || this.state.filterOwner !== 'all' || this.state.filterLabel !== 'all' || this.state.filterStorage !== 'all') ? `
                            <div onclick="app.state.filterGenre='all'; app.state.filterOwner='all'; app.state.filterLabel='all'; app.state.filterStorage='all'; app.refreshCurrentView()" 
                                class="col-span-full mb-4 flex items-center gap-2 text-slate-500 hover:text-brand-orange cursor-pointer w-fit pl-1 group">
                                <div class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-brand-orange group-hover:text-white group-hover:border-brand-orange transition-all shadow-sm">
                                    <i class="ph-bold ph-arrow-left"></i>
                                </div>
                                <span class="text-sm font-bold">Volver a Carpetas</span>
                            </div>
                        ` : ''}

                        ${filteredInventory.map(item => `
                            <!-- Item Card -->
                            <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
                                onclick="app.openProductModal('${item.sku.replace(/'/g, "\\'")}')">
                                <div class="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-4 relative shadow-inner">
                                     ${item.cover_image
                        ? `<img src="${item.cover_image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`
                        : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-fill ph-disc text-5xl"></i></div>`
                    }
                                     <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                         <button onclick="event.stopPropagation(); app.addToCart('${item.sku.replace(/'/g, "\\'")}', event)" class="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-shopping-cart text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openProductModal('${item.sku.replace(/'/g, "\\'")}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-eye text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openPrintLabelModal('${item.sku.replace(/'/g, "\\'")}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-printer text-lg"></i>
                                         </button>
                                     </div>
                                     <div class="absolute top-2 right-2">
                                         ${this.getStatusBadge(item.condition)}
                                     </div>
                                </div>
                                <div class="flex-1 flex flex-col">
                                    <h3 class="font-bold text-brand-dark leading-tight mb-1 line-clamp-1" title="${item.album}">${item.album}</h3>
                                    <p class="text-xs text-slate-500 font-bold uppercase mb-3 truncate">${item.artist}</p>
                                    <div class="mt-auto flex justify-between items-center pt-3 border-t border-slate-50">
                                        <span class="font-display font-bold text-xl text-brand-orange">${this.formatCurrency(item.price)}</span>
                                        <span class="text-xs font-bold ${item.stock > 0 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'} px-2 py-1 rounded-md">
                                            Stock: ${item.stock}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            ` : `
                <!-- LIST VIEW (Table) -->
                <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden relative">
                    <!-- Bulk Action Bar -->
                    ${this.state.selectedItems.size > 0 ? `
                        <div class="absolute top-0 left-0 w-full bg-brand-dark/95 backdrop-blur text-white p-3 flex justify-between items-center z-20 animate-fade-in">
                            <div class="flex items-center gap-3">
                                <span class="font-bold text-sm bg-white/10 px-3 py-1 rounded-lg">${this.state.selectedItems.size} seleccionados</span>
                                <button onclick="app.toggleSelectAll()" class="text-xs text-slate-300 hover:text-white underline">Deseleccionar</button>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="app.addSelectionToCart()" class="bg-brand-orange text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                                    <i class="ph-bold ph-shopping-cart"></i> Agregar al Carrito
                                </button>
                                <button onclick="app.deleteSelection()" class="bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-red-600 transition-colors flex items-center gap-2">
                                    <i class="ph-bold ph-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    <table class="w-full text-left">
                        <thead class="bg-orange-50/50 border-b border-orange-100 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th class="p-4 w-10">
                                    <input type="checkbox" onchange="app.toggleSelectAll()" 
                                        class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                        ${filteredInventory.length > 0 && filteredInventory.every(i => this.state.selectedItems.has(i.sku)) ? 'checked' : ''}>
                                </th>
                                <th class="p-3 rounded-tl-2xl">Disco</th>
                                <th class="p-3">Sello</th>
                                <th class="p-3 text-center w-16">Estado</th>
                                <th class="p-3 text-right w-20">Precio</th>
                                <th class="p-3 text-center w-16">Stock</th>
                                <th class="p-3 text-center w-12" title="Publicado en Discogs"><i class="ph-bold ph-disc text-purple-500"></i></th>
                                <th class="p-3 text-right rounded-tr-2xl w-32">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${filteredInventory.map(item => `
                                <tr class="hover:bg-orange-50/30 transition-colors group cursor-pointer relative ${this.state.selectedItems.has(item.sku) ? 'bg-orange-50/50' : ''}" 
                                    onclick="app.openProductModal('${item.sku.replace(/'/g, "\\'")}')">
                                    <td class="p-3" onclick="event.stopPropagation()">
                                        <input type="checkbox" onchange="app.toggleSelection('${item.sku.replace(/'/g, "\\'")}')"
                                            class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                            ${this.state.selectedItems.has(item.sku) ? 'checked' : ''}>
                                    </td>
                                    <td class="p-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 shrink-0 overflow-hidden shadow-sm border border-slate-100">
                                                ${item.cover_image
                            ? `<img src="${item.cover_image}" class="w-full h-full object-cover">`
                            : `<i class="ph-fill ph-disc text-lg"></i>`
                        }
                                            </div>
                                            <div class="min-w-0">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[180px]" title="${item.album}">${item.album}</div>
                                                <div class="text-xs text-slate-500 font-medium truncate max-w-[180px]">${item.artist}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-3 text-xs text-slate-500 font-medium max-w-[80px] truncate">${item.label || '-'}</td>
                                    <td class="p-3 text-center">${this.getStatusBadge(item.condition)}</td>
                                    <td class="p-3 text-right font-bold text-brand-dark font-display text-sm">${this.formatCurrency(item.price)}</td>
                                    <td class="p-3 text-center">
                                        <span class="px-2 py-0.5 rounded-full text-xs font-bold ${item.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">
                                            ${item.stock}
                                        </span>
                                    </td>
                                    <td class="p-3 text-center">
                                        ${item.discogs_listing_id
                            ? `<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-purple-100 text-purple-600" title="Publicado en Discogs"><i class="ph-bold ph-check text-xs"></i></span>`
                            : `<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-300" title="No publicado"><i class="ph-bold ph-minus text-xs"></i></span>`
                        }
                                    </td>
                                    <td class="p-3 text-right" onclick="event.stopPropagation()">
                                        <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onclick="event.stopPropagation(); app.openAddVinylModal('${item.sku.replace(/'/g, "\\'")}')" class="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-brand-dark hover:border-brand-dark transition-all flex items-center justify-center shadow-sm" title="Editar">
                                                <i class="ph-bold ph-pencil-simple text-sm"></i>
                                            </button>
                                            <button onclick="event.stopPropagation(); app.addToCart('${item.sku.replace(/'/g, "\\'")}', event)" class="w-7 h-7 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform" title="Añadir">
                                                <i class="ph-bold ph-shopping-cart text-sm"></i>
                                            </button>
                                            <button onclick="event.stopPropagation(); app.deleteVinyl('${item.sku.replace(/'/g, "\\'")}')" class="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-500 transition-all flex items-center justify-center shadow-sm" title="Eliminar">
                                                <i class="ph-bold ph-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
`;
    },

    renderInventory(container) {
        // Collect unique values for dynamic filters
        const allGenres = [...new Set(this.state.inventory.map(i => i.genre).filter(Boolean))].sort();
        const allOwners = [...new Set(this.state.inventory.map(i => i.owner).filter(Boolean))].sort();
        const allLabels = [...new Set(this.state.inventory.map(i => i.label).filter(Boolean))].sort();
        const allStorage = [...new Set(this.state.inventory.map(i => i.storageLocation).filter(Boolean))].sort();

        const filteredInventory = this.getFilteredInventory();

        // Sort Logic
        const sortBy = this.state.sortBy || 'dateDesc';
        filteredInventory.sort((a, b) => {
            if (sortBy === 'priceDesc') return (b.price || 0) - (a.price || 0);
            if (sortBy === 'priceAsc') return (a.price || 0) - (b.price || 0);
            if (sortBy === 'stockDesc') return (b.stock || 0) - (a.stock || 0);
            const dateA = a.created_at ? (a.created_at.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime()) : 0;
            const dateB = b.created_at ? (b.created_at.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime()) : 0;
            if (sortBy === 'dateDesc') return dateB - dateA;
            if (sortBy === 'dateAsc') return dateA - dateB;
            return 0;
        });

        // 1. Static Layout Init
        if (!document.getElementById('inventory-layout-root')) {
            container.innerHTML = `
    <div id="inventory-layout-root" class="max-w-7xl mx-auto pb-24 md:pb-8 px-4 md:px-8 pt-10">
                    <!--Header(Search) -->
                    <div class="sticky top-0 bg-slate-50 z-20 pb-4 pt-4 -mx-4 px-4 md:mx-0 md:px-0">
                         <div class="flex justify-between items-center mb-4">
                            <div><h2 class="font-display text-2xl font-bold text-brand-dark">Inventario</h2></div>
                             <div class="flex gap-2">
                                <button onclick="app.openInventoryLogModal()" class="bg-white border border-slate-200 text-slate-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm hover:text-brand-orange hover:border-brand-orange transition-colors">
                                    <i class="ph-bold ph-clock-counter-clockwise text-2xl"></i>
                                </button>
                                <button onclick="app.openBulkImportModal()" class="bg-emerald-500 text-white px-4 h-12 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all" title="Carga Masiva CSV">
                                    <i class="ph-bold ph-file-csv text-xl"></i>
                                    <span class="text-sm font-bold hidden sm:inline">Importar</span>
                                </button>
                                <button onclick="app.syncWithDiscogs()" id="discogs-sync-btn" class="bg-purple-500 text-white px-4 h-12 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/20 hover:bg-purple-600 transition-all" title="Sincronizar con Discogs">
                                    <i class="ph-bold ph-cloud-arrow-down text-xl"></i>
                                    <span class="text-sm font-bold hidden sm:inline">Discogs</span>
                                </button>
                                <button onclick="app.openAddVinylModal()" class="bg-brand-dark text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-brand-dark/20 hover:scale-105 transition-transform">
                                    <i class="ph-bold ph-plus text-2xl"></i>
                                </button>
                            </div>
                        </div>
                        <div class="relative group">
                            <i class="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-orange transition-colors text-lg"></i>
                            <input type="text" placeholder="Buscar artista, álbum, SKU..." value="${this.state.inventorySearch}" oninput="app.state.inventorySearch = this.value; app.refreshCurrentView()" class="w-full bg-white border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 text-brand-dark placeholder:text-slate-400 focus:border-brand-orange outline-none transition-colors font-medium">
                        </div>
                    </div>

                    <!--Main Grid-->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
        <!-- Left Sidebar -->
        <div class="hidden lg:block lg:col-span-1 space-y-6">
            <div id="inventory-cart-container" class="hidden"></div>
            <div id="inventory-filters-container"></div>
        </div>
        <!-- Content -->
        <div class="lg:col-span-3">
            <div class="flex justify-end mb-4 hidden lg:flex items-center gap-2">
                <span class="text-xs font-bold text-slate-400 uppercase mr-2">Vista:</span>
                <button onclick="app.state.viewMode='list'; app.refreshCurrentView()" class="p-2 rounded-lg transition-colors ${this.state.viewMode !== 'grid' ? 'bg-brand-dark text-white' : 'bg-white text-slate-400'}"><i class="ph-bold ph-list-dashes text-lg"></i></button>
                <button onclick="app.state.viewMode='grid'; app.refreshCurrentView()" class="p-2 rounded-lg transition-colors ${this.state.viewMode === 'grid' ? 'bg-brand-dark text-white' : 'bg-white text-slate-400'}"><i class="ph-bold ph-squares-four text-lg"></i></button>
            </div>
            <div class="space-y-4 md:hidden">
                <!-- Mobile Items (Simplified) -->
                ${this.state.inventory.map(item => `<!-- Mobile Card Placeholder - Handled by renderInventoryContent actually? No, duplicate logic. Let's merge mobile into renderInventoryContent -->`).join('')}
                <!-- Actually, let's let renderInventoryContent handle ALL content including mobile -->
            </div>
            <div id="inventory-content-container"></div>
        </div>
    </div>
                </div>
    `;

            // Render Filters (Once or Update?)
            // Filters rely on 'selected' attributes so they might need re-render on state change.
            // But they are less frequent. Let's render them here or in update.
        }

        // 2. Dynamic Updates
        this.renderInventoryCart();

        // Filters (Re-render to update counts/selected state)
        const filtersContainer = document.getElementById('inventory-filters-container');
        if (filtersContainer) {
            filtersContainer.innerHTML = `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
                    <h3 class="font-bold text-brand-dark mb-4 flex items-center gap-2"><i class="ph-bold ph-funnel text-slate-400"></i> Filtros</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Ordenar por</label>
                            <select onchange="app.state.sortBy = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-medium outline-none focus:border-brand-orange">
                                <option value="dateDesc" ${this.state.sortBy === 'dateDesc' ? 'selected' : ''}>Más Recientes</option>
                                <option value="dateAsc" ${this.state.sortBy === 'dateAsc' ? 'selected' : ''}>Más Antiguos</option>
                                <option value="priceDesc" ${this.state.sortBy === 'priceDesc' ? 'selected' : ''}>Precio: Mayor a Menor</option>
                                <option value="priceAsc" ${this.state.sortBy === 'priceAsc' ? 'selected' : ''}>Precio: Menor a Mayor</option>
                                <option value="stockDesc" ${this.state.sortBy === 'stockDesc' ? 'selected' : ''}>Stock: Mayor a Menor</option>
                            </select>
                        </div>
                        <hr class="border-slate-50">
                        <!-- Simplified Filters -->
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Género</label>
                            <select onchange="app.state.filterGenre = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todos</option>
                                ${allGenres.map(g => `<option value="${g}" ${this.state.filterGenre === g ? 'selected' : ''}>${g}</option>`).join('')}
                            </select>
                        </div>
                         <div>
                            <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">Label Disquería</label>
                            <select onchange="app.state.filterStorage = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todas</option>
                                ${allStorage.map(s => `<option value="${s}" ${this.state.filterStorage === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                         <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Sello (Discogs)</label>
                            <select onchange="app.state.filterLabel = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todos</option>
                                ${allLabels.map(l => `<option value="${l}" ${this.state.filterLabel === l ? 'selected' : ''}>${l}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Dueño</label>
                            <select onchange="app.state.filterOwner = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todos</option>
                                ${allOwners.map(o => `<option value="${o}" ${this.state.filterOwner === o ? 'selected' : ''}>${o}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Publicado en Discogs</label>
                            <select onchange="app.state.filterDiscogs = this.value; app.refreshCurrentView()" class="w-full bg-purple-50 border border-purple-200 rounded-lg p-2 text-sm outline-none focus:border-purple-500">
                                <option value="all" ${(this.state.filterDiscogs || 'all') === 'all' ? 'selected' : ''}>Todos</option>
                                <option value="yes" ${this.state.filterDiscogs === 'yes' ? 'selected' : ''}>✅ Sí</option>
                                <option value="no" ${this.state.filterDiscogs === 'no' ? 'selected' : ''}>❌ No</option>
                            </select>
                        </div>
                    </div>
                </div>
    `;
        }

        // Content (Grid/List)
        const contentContainer = document.getElementById('inventory-content-container');
        if (contentContainer) {
            this.renderInventoryContent(contentContainer, filteredInventory, allGenres, allOwners, allStorage);
        }
    },

    getStatusBadge(status) {
        const colors = {
            'NM': 'bg-green-100 text-green-700 border-green-200',
            'VG+': 'bg-blue-100 text-blue-700 border-blue-200',
            'VG': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'G': 'bg-orange-100 text-orange-700 border-orange-200',
            'B': 'bg-red-100 text-red-700 border-red-200',
            'S': 'bg-purple-100 text-purple-700 border-purple-200'
        };
        const colorClass = colors[status] || 'bg-slate-100 text-slate-600 border-slate-200';
        return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${colorClass}"> ${status}</span> `;
    },

    renderCharts(filteredSales, filteredExpenses) {
        // 1. Prepare Financial Data (Selected Months)
        const selectedMonths = this.state.filterMonths;
        const currentYear = this.state.filterYear;
        const labels = [];
        const revenueData = [];
        const expenseData = [];

        selectedMonths.forEach(m => {
            labels.push(this.getMonthName(m).substring(0, 3));

            const mSales = filteredSales.filter(s => new Date(s.date).getMonth() === m).reduce((sum, s) => sum + s.total, 0);
            const mExpenses = filteredExpenses.filter(e => new Date(e.date).getMonth() === m).reduce((sum, e) => sum + e.amount, 0);

            revenueData.push(mSales);
            expenseData.push(mExpenses);
        });

        // 2. Prepare Genre Data (Aggregated)
        const genreCounts = {};
        filteredSales.forEach(s => {
            genreCounts[s.genre] = (genreCounts[s.genre] || 0) + s.quantity;
        });

        // Chart 1: Finance (Bar)
        new Chart(document.getElementById('financeChart'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ventas',
                        data: revenueData,
                        backgroundColor: '#F05A28',
                        borderRadius: 6,
                    },
                    {
                        label: 'Gastos',
                        data: expenseData,
                        backgroundColor: '#94a3b8',
                        borderRadius: 6,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    y: { grid: { color: '#f1f5f9' }, beginAtZero: true },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderDashboardCharts(filteredSales = [], last30Days = [], last30DaysRevenue = []) {
        const salesToUse = filteredSales;

        // --- NEW: 30-Day Sales Trend Chart (Line Chart) ---
        const last30Ctx = document.getElementById('last30DaysChart')?.getContext('2d');
        if (last30Ctx) {
            if (this.last30ChartInstance) this.last30ChartInstance.destroy();
            this.last30ChartInstance = new Chart(last30Ctx, {
                type: 'line',
                data: {
                    labels: last30Days,
                    datasets: [{
                        label: 'Ventas ($)',
                        data: last30DaysRevenue,
                        borderColor: '#F05A28',
                        backgroundColor: (context) => {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return null;
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, 'rgba(240, 90, 40, 0.2)');
                            gradient.addColorStop(1, 'rgba(240, 90, 40, 0)');
                            return gradient;
                        },
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#F05A28',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: '#1e293b',
                            titleFont: { size: 10 },
                            bodyFont: { size: 12, weight: 'bold' },
                            padding: 12,
                            cornerRadius: 12,
                            displayColors: false,
                            callbacks: {
                                label: (context) => this.formatCurrency(context.parsed.y)
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f8fafc' },
                            ticks: { font: { size: 10 }, color: '#94a3b8' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { size: 10 },
                                color: '#94a3b8',
                                autoSkip: true,
                                maxRotation: 0,
                                callback: function (value, index) {
                                    return index % 5 === 0 ? this.getLabelForValue(value) : '';
                                }
                            }
                        }
                    },
                    interaction: { mode: 'index', intersect: false }
                }
            });
        }

        // Helper to create doughnut chart config
        const createConfig = (data, label) => ({
            type: 'doughnut',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: ['#F05A28', '#FDE047', '#8b5cf6', '#10b981', '#f43f5e', '#64748b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
                }
            }
        });

        // 1. Genre Chart
        const genreCounts = {};
        salesToUse.forEach(s => {
            const genre = s.genre || 'Otros';
            // Normalize quantity safety check
            let qty = Number(s.quantity) || 0;
            if (qty === 0 && s.items && Array.isArray(s.items)) {
                qty = s.items.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 1), 0);
            }
            if (qty <= 0) qty = 1;

            genreCounts[genre] = (genreCounts[genre] || 0) + Number(qty);
        });

        if (this.genreChartInstance) this.genreChartInstance.destroy();
        const genreCtx = document.getElementById('genreChart')?.getContext('2d');
        if (genreCtx) this.genreChartInstance = new Chart(genreCtx, createConfig(genreCounts, 'Género'));

        // 2. Payment Method Chart
        const paymentCounts = {};
        salesToUse.forEach(s => {
            const payment = s.paymentMethod || 'Otros';
            let qty = Number(s.quantity) || 0;
            if (qty === 0 && s.items && Array.isArray(s.items)) {
                qty = s.items.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 1), 0);
            }
            if (qty <= 0) qty = 1;

            paymentCounts[payment] = (paymentCounts[payment] || 0) + Number(qty);
        });

        if (this.paymentChartInstance) this.paymentChartInstance.destroy();
        const paymentCtx = document.getElementById('paymentChart')?.getContext('2d');
        if (paymentCtx) this.paymentChartInstance = new Chart(paymentCtx, createConfig(paymentCounts, 'Pago'));

        // 3. Channel Chart
        const channelCounts = {};
        salesToUse.forEach(s => {
            const channel = s.channel || 'Tienda';
            let qty = Number(s.quantity) || 0;
            if (qty === 0 && s.items && Array.isArray(s.items)) {
                qty = s.items.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 1), 0);
            }
            if (qty <= 0) qty = 1;

            channelCounts[channel] = (channelCounts[channel] || 0) + Number(qty);
        });

        if (this.channelChartInstance) this.channelChartInstance.destroy();
        const channelCtx = document.getElementById('channelChart')?.getContext('2d');
        if (channelCtx) this.channelChartInstance = new Chart(channelCtx, createConfig(channelCounts, 'Canal'));

        // 4. Sales Trend Chart (Monthly/Daily)
        const trendCtx = document.getElementById('salesTrendChart')?.getContext('2d');
        if (trendCtx) {
            const daysInMonth = new Array(31).fill(0).map((_, i) => i + 1);
            const dailyRevenue = new Array(31).fill(0);

            salesToUse.forEach(s => {
                const d = new Date(s.date);
                if (!isNaN(d.getDate())) {
                    dailyRevenue[d.getDate() - 1] += (parseFloat(s.total) || 0);
                }
            });

            if (this.trendChartInstance) this.trendChartInstance.destroy();
            this.trendChartInstance = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: daysInMonth,
                    datasets: [{
                        label: 'Ventas ($)',
                        data: dailyRevenue,
                        borderColor: '#F05A28',
                        backgroundColor: 'rgba(240, 90, 40, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    },

    updateFilter(type, value) {
        if (type === 'month') {
            const m = parseInt(value);
            this.state.filterMonth = m;
            this.state.filterMonths = [m]; // Sync with dashboard multi-month
        }
        if (type === 'year') this.state.filterYear = parseInt(value);
        this.renderDashboard(document.getElementById('app-content'));
    },

    renderSales(container) {
        // 1. Data Processing
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Use full state for today/yesterday KPIs, but scoped filteredSales for history
        const todaySales = this.state.sales
            .filter(s => s.date === today)
            .reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        const yesterdaySales = this.state.sales
            .filter(s => s.date === yesterday)
            .reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);

        // Orders to ship (Discogs or Web pending fulfillment)
        const toShip = this.state.sales.filter(s =>
            s.fulfillment_status === 'preparing' ||
            s.status === 'paid' ||
            (s.channel === 'Discogs' && s.status !== 'shipped')
        ).length;

        // Current Filter Context
        const currentYear = this.state.filterYear;
        const selectedMonths = this.state.filterMonths;
        const paymentFilter = document.getElementById('sales-payment-filter')?.value || 'all';
        const searchTerm = this.state.salesHistorySearch.toLowerCase();
        const searchTerms = searchTerm.split(' ').filter(t => t.length > 0);
        const feedFilter = this.state.orderFeedFilter || 'all';

        const filteredSales = this.state.sales.filter(s => {
            const d = new Date(s.date);
            const dateMatch = d.getFullYear() === currentYear && selectedMonths.includes(d.getMonth());
            const paymentMatch = paymentFilter === 'all' || s.paymentMethod === paymentFilter;

            let searchMatch = true;
            if (searchTerms.length > 0) {
                searchMatch = searchTerms.every(term => {
                    const matchesItems = s.items && s.items.some(item => {
                        return (item.album || '').toLowerCase().includes(term) ||
                            (item.artist || '').toLowerCase().includes(term) ||
                            (item.label || '').toLowerCase().includes(term) ||
                            (item.sku || '').toLowerCase().includes(term);
                    });
                    const matchesSale = (s.album || '').toLowerCase().includes(term) ||
                        (s.sku || '').toLowerCase().includes(term);
                    return matchesItems || matchesSale;
                });
            }

            // Channel/Status Feed Filter
            let feedMatch = true;
            if (feedFilter === 'to_ship') {
                feedMatch = s.status !== 'shipped' && s.source !== 'STORE';
            } else if (feedFilter === 'completed') {
                feedMatch = s.status === 'shipped';
            } else if (feedFilter === 'store') {
                feedMatch = s.source === 'STORE';
            }

            return dateMatch && paymentMatch && searchMatch && feedMatch;
        });

        const totalRevenue = filteredSales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

        const html = `
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <!-- Header Component -->
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div>
                        <h2 class="font-display text-2xl font-bold text-brand-dark">Gestión de Ventas</h2>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Sistema Operativo POS & Feed</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div class="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                            <select id="sales-year" onchange="app.updateFilter('year', this.value)" class="bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600 outline-none cursor-pointer">
                                <option value="2026" ${currentYear === 2026 ? 'selected' : ''}>2026</option>
                                <option value="2025" ${currentYear === 2025 ? 'selected' : ''}>2025</option>
                            </select>
                        </div>
                        <div class="flex flex-wrap gap-1">
                            ${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => `
                                <button onclick="app.toggleMonthFilter(${i})" 
                                    class="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedMonths.includes(i) ? 'bg-brand-dark text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}">
                                    ${m}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Minimalist KPI Cards (Prompt 1) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <!-- Tarjeta A: Ventas de Hoy -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                <i class="ph-duotone ph-currency-circle-dollar text-xl"></i>
                            </div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hoy</span>
                        </div>
                        <h3 class="text-2xl font-display font-bold text-brand-dark mb-1">${this.formatCurrency(todaySales)}</h3>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold ${todaySales >= yesterdaySales ? 'text-emerald-500' : 'text-slate-400'}">
                                ${todaySales >= yesterdaySales ? '<i class="ph-bold ph-trend-up mr-1"></i>' : '<i class="ph-bold ph-trend-down mr-1"></i>'}
                                vs. ayer (${this.formatCurrency(yesterdaySales)})
                            </span>
                        </div>
                    </div>

                    <!-- Tarjeta B: Por Despachar -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 ${toShip > 0 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'} rounded-2xl flex items-center justify-center">
                                <i class="ph-duotone ph-package text-xl"></i>
                            </div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logística</span>
                        </div>
                        <h3 class="text-2xl font-display font-bold ${toShip > 0 ? 'text-orange-600' : 'text-brand-dark'} mb-1">${toShip} Pedidos</h3>
                        <p class="text-xs text-slate-400 font-medium">Pendientes de envío inmediato</p>
                        ${toShip > 0 ? '<div class="absolute top-0 right-0 w-1.5 h-full bg-orange-500"></div>' : ''}
                    </div>

                    <!-- Tarjeta C: Ticket Promedio -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                <i class="ph-duotone ph-ticket text-xl"></i>
                            </div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Métrica</span>
                        </div>
                        <h3 class="text-2xl font-display font-bold text-brand-dark mb-1">${this.formatCurrency(avgTicket)}</h3>
                        <p class="text-xs text-slate-400 font-medium">Valor promedio por cliente</p>
                    </div>
                </div>

                <!-- Main Layout: 2 Columns (Prompt 1) -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    
                    <!-- LEFT COLUMN: POS / Sales Entry -->
                    <div class="space-y-6">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Registrar Venta (POS)</h3>
                            <div class="h-px flex-1 bg-slate-100"></div>
                        </div>

                        ${this.state.cart.length > 0 ? this.renderSalesCartWidget() : this.renderQuickPOS()}

                        <!-- Partners Quick Summary -->
                        <div class="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Stock por Dueño</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                ${['El Cuartito', ...this.state.consignors.map(c => c.name)].map(owner => {
            const stockCount = this.state.inventory.filter(i => i.owner === owner).reduce((sum, i) => sum + i.stock, 0);
            return `
                                        <div class="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                            <span class="text-xs font-bold text-slate-600 truncate mr-2">${owner}</span>
                                            <span class="bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-slate-400">${stockCount}</span>
                                        </div>
                                    `;
        }).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: History Feed -->
                    <div class="space-y-6">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2 flex-1">
                                <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Live Order Feed</h3>
                                <div class="h-px flex-1 bg-slate-100"></div>
                            </div>
                        </div>

                        <!-- Filter Tabs -->
                        <div class="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-100">
                            ${[
                { id: 'all', label: 'Todos', icon: 'ph-list' },
                { id: 'to_ship', label: 'Por Enviar', icon: 'ph-package' },
                { id: 'completed', label: 'Completados', icon: 'ph-check-circle' },
                { id: 'store', label: 'Tienda Física', icon: 'ph-storefront' }
            ].map(tab => `
                                <button onclick="app.updateOrderFeedFilter('${tab.id}')" 
                                    class="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all ${feedFilter === tab.id ? 'bg-white text-brand-dark shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}">
                                    <i class="ph-bold ${tab.icon} ${feedFilter === tab.id ? 'text-brand-orange' : ''}"></i>
                                    ${tab.label.toUpperCase()}
                                </button>
                            `).join('')}
                        </div>

                        <!-- Feed Toolbar -->
                        <div class="flex gap-2 mb-4">
                            <div class="relative flex-1">
                                <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input type="text" 
                                    value="${this.state.salesHistorySearch}"
                                    oninput="app.state.salesHistorySearch = this.value; app.renderSales(document.getElementById('app-content'))"
                                    placeholder="Buscar por album, artista o SKU..." 
                                    class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-brand-dark text-sm shadow-sm">
                            </div>
                            <select id="sales-payment-filter" onchange="app.renderSales(document.getElementById('app-content'))" class="bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-2xl px-4 py-2.5 outline-none focus:border-brand-dark shadow-sm">
                                <option value="all" ${paymentFilter === 'all' ? 'selected' : ''}>Todos Pagos</option>
                                <option value="MobilePay" ${paymentFilter === 'MobilePay' ? 'selected' : ''}>MobilePay</option>
                                <option value="Efectivo" ${paymentFilter === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                                <option value="Tarjeta" ${paymentFilter === 'Tarjeta' ? 'selected' : ''}>Tarjeta</option>
                            </select>
                        </div>

                        <!-- Feed List -->
                        <div class="space-y-3 max-h-[1200px] overflow-y-auto pr-2 custom-scrollbar">
                            ${filteredSales.map(s => {
                const isShipped = s.status === 'shipped';
                const isPaid = s.status === 'paid' || s.source === 'STORE' || s.paymentMethod !== 'Pending';
                const isDiscogs = s.channel === 'Discogs';
                const isStore = s.source === 'STORE';

                const mainItem = s.items && s.items.length > 0 ? s.items[0] : { album: s.album || 'Venta Manual', artist: s.artist || 'Desconocido' };
                const extraItems = s.items && s.items.length > 1 ? s.items.length - 1 : 0;

                return `
                                <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all cursor-pointer group flex items-center gap-4 relative" onclick="app.openUnifiedOrderDetailModal('${s.id}')">
                                    <!-- Source Icon -->
                                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDiscogs ? 'bg-slate-900 text-white' : (isStore ? 'bg-orange-100 text-brand-orange' : 'bg-blue-100 text-blue-600')}">
                                        <i class="ph-bold ${isDiscogs ? 'ph-disc' : (isStore ? 'ph-storefront' : 'ph-globe')} text-xl"></i>
                                    </div>

                                    <!-- Details -->
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-0.5">
                                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${this.formatDate(s.date)}</span>
                                            <div class="h-1 w-1 rounded-full bg-slate-200"></div>
                                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${s.paymentMethod}</span>
                                        </div>
                                        <h4 class="font-bold text-brand-dark truncate pr-2">
                                            ${mainItem.album} 
                                            ${extraItems > 0 ? `<span class="text-brand-orange font-medium text-xs ml-1">y ${extraItems} más</span>` : ''}
                                        </h4>
                                        
                                        <!-- Status Badges -->
                                        <div class="flex items-center gap-2 mt-2">
                                            <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">
                                                ${isPaid ? 'Pagado' : 'Pendiente'}
                                            </span>
                                            <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${isShipped ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-500'}">
                                                ${isShipped ? 'Enviado' : 'Por Enviar'}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Economic Breakdown -->
                                    <div class="text-right shrink-0 border-l border-slate-50 pl-4 py-1">
                                        <p class="font-display font-bold text-brand-dark text-base">${this.formatCurrency(s.total)}</p>
                                        ${s.shipping_cost > 0 ? `<p class="text-[10px] text-slate-400 font-bold">Envío: ${this.formatCurrency(s.shipping_cost)}</p>` : ''}
                                    </div>

                                    <!-- Quick Action -->
                                    <div class="relative ml-2">
                                        <button onclick="event.stopPropagation(); app.toggleOrderActionMenu('${s.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-50 text-slate-300 hover:text-brand-dark transition-colors flex items-center justify-center">
                                            <i class="ph-bold ph-dots-three-vertical text-xl"></i>
                                        </button>
                                        
                                        <!-- Dropdown (Hidden by default) -->
                                        <div id="action-menu-${s.id}" class="hidden absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 space-y-1 py-2">
                                            <button onclick="event.stopPropagation(); app.openInvoiceModal('${s.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                <i class="ph ph-file-text text-blue-500"></i> Ver Factura
                                            </button>
                                            <button onclick="event.stopPropagation(); app.openInvoiceModal('${s.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                <i class="ph ph-printer text-indigo-500"></i> Imprimir Etiqueta
                                            </button>
                                            ${!isShipped ? `
                                                <button onclick="event.stopPropagation(); app.markOrderAsShipped('${s.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                    <i class="ph ph-truck text-emerald-500"></i> Marcar Enviado
                                                </button>
                                            ` : ''}
                                            <div class="h-px bg-slate-50 mx-2 my-1"></div>
                                            <button onclick="event.stopPropagation(); app.deleteSale('${s.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors">
                                                <i class="ph ph-trash"></i> Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
            }).join('')}
                            ${filteredSales.length === 0 ? `
                                <div class="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p class="text-slate-400 italic text-sm">No hay pedidos en esta categoría.</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    // Helper to render the cart widget in sales view
    renderSalesCartWidget() {
        return `
            <div class="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 ring-2 ring-emerald-500/10">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-brand-dark flex items-center gap-2">
                        <i class="ph-duotone ph-shopping-cart text-emerald-500 text-xl"></i>
                        Venta en Progreso
                        <span class="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">${this.state.cart.length}</span>
                    </h3>
                    <button onclick="app.clearCart(); app.renderSales(document.getElementById('app-content'))" class="text-xs text-red-500 font-bold hover:underline">Vaciar Carrito</button>
                </div>
                
                <div class="space-y-3 mb-6 max-h-80 overflow-y-auto custom-scrollbar px-1">
                    ${this.state.cart.map((item, index) => `
                        <div class="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100 group">
                            <div class="truncate pr-4 flex-1">
                                <p class="font-bold text-sm text-brand-dark truncate">${item.album}</p>
                                <p class="text-[10px] text-slate-400 truncate uppercase tracking-tighter font-bold">${item.artist}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="font-bold text-sm text-brand-dark">${this.formatCurrency(item.price)}</span>
                                <button onclick="app.removeFromCart(${index}); app.renderSales(document.getElementById('app-content'))" class="w-8 h-8 rounded-lg bg-white shadow-sm text-slate-300 hover:text-red-500 border border-slate-100 transition-colors flex items-center justify-center">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="bg-slate-50 rounded-2xl p-4 mb-6 space-y-4">
                    <div class="flex justify-between items-center pb-2 border-b border-white/50">
                        <span class="text-xs font-bold text-slate-400 uppercase">Subtotal</span>
                        <span class="font-bold text-slate-600">${this.formatCurrency(this.state.cart.reduce((s, i) => s + i.price, 0))}</span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label class="text-[9px] font-bold text-slate-400 uppercase ml-1">Pago</label>
                            <select id="cart-payment" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:border-brand-dark outline-none cursor-pointer">
                                <option value="MobilePay">MobilePay</option>
                                <option value="Efectivo">Efectivo</option>
                                <option value="Tarjeta">Tarjeta</option>
                            </select>
                        </div>
                        <div class="space-y-1">
                            <label class="text-[9px] font-bold text-slate-400 uppercase ml-1">Canal</label>
                            <select id="cart-channel" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:border-brand-dark outline-none cursor-pointer">
                                <option value="Tienda">Tienda</option>
                                <option value="Discogs">Discogs</option>
                                <option value="Feria">Feria</option>
                            </select>
                        </div>
                    </div>
                </div>

                <button onclick="app.handleSalesViewCheckout()" class="w-full py-4 bg-brand-dark text-white font-bold rounded-2xl shadow-xl shadow-brand-dark/20 flex items-center justify-center gap-2 hover:bg-slate-800 transition-all hover:scale-[1.01] active:scale-[0.98]">
                    <i class="ph-bold ph-check-circle text-lg"></i>
                    Completar Venta (${this.formatCurrency(this.state.cart.reduce((s, i) => s + i.price, 0))})
                </button>
            </div>
        `;
    },

    renderQuickPOS() {
        const isUsed = this.state.posCondition === 'Used';
        const isManualInput = !this.state.posSelectedItemSku && (this.state.manualSaleSearch || '').length > 0;
        const showCostInput = isUsed && (isManualInput || !this.state.posSelectedItemSku);

        return `
            <div class="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 ring-4 ring-orange-500/5">
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-brand-orange">
                            <i class="ph-duotone ph-lightning text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="font-display text-xl font-bold text-brand-dark">Terminal de Caja</h3>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Quick POS v2.0</p>
                        </div>
                    </div>
                    
                    <!-- Toggle Estado -->
                    <div class="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button onclick="app.updatePOSCondition('New')" 
                            class="px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!isUsed ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                            NUEVO
                        </button>
                        <button onclick="app.updatePOSCondition('Used')" 
                            class="px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isUsed ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                            USADO
                        </button>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <!-- Buscador Inteligente -->
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Buscador Inteligente (Escáner o Nombre)</label>
                        <div class="relative group">
                            <i class="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-brand-orange transition-colors"></i>
                            <input type="text" id="sku-search" value="${this.state.manualSaleSearch || ''}" 
                                oninput="app.searchSku(this.value)" 
                                onblur="setTimeout(() => document.getElementById('sku-results').classList.add('hidden'), 200)"
                                placeholder="Escanea código de barras o escribe para buscar..." 
                                class="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange focus:bg-white outline-none text-base font-medium transition-all shadow-inner">
                            <div id="sku-results" class="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl hidden z-50 max-h-80 overflow-y-auto mt-3 p-2 space-y-1"></div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Precio de Venta</label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                <input type="number" id="input-price" step="0.5" 
                                    class="w-full pl-8 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-dark focus:bg-white outline-none text-xl font-display font-bold transition-all">
                            </div>
                        </div>
                        <div id="cost-container" class="${showCostInput ? '' : 'hidden'}">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Costo Original (VAT)</label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                <input type="number" id="input-cost-pos" step="0.5" 
                                    class="w-full pl-8 pr-4 py-4 bg-orange-50/50 border-2 border-orange-100 rounded-2xl focus:border-brand-orange focus:bg-white outline-none text-xl font-display font-bold transition-all text-brand-orange">
                            </div>
                        </div>
                        <!-- Hidden inputs for submission -->
                        <input type="hidden" id="input-sku" value="${this.state.posSelectedItemSku || ''}">
                        <input type="hidden" id="input-cost">
                        <input type="hidden" id="input-artist">
                        <input type="hidden" id="input-album">
                        <input type="hidden" id="input-genre">
                        <input type="hidden" id="input-owner">
                    </div>

                    <!-- Botones de Pago Grandotes -->
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-3 ml-1">Seleccionar Método de Pago</label>
                        <div class="grid grid-cols-3 gap-3">
                            <button onclick="app.selectPOSPayment('MobilePay')" id="pay-MobilePay" 
                                class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-brand-dark bg-slate-50 ring-2 ring-brand-dark/10 transition-all group">
                                <i class="ph-duotone ph-phone-call text-2xl text-blue-500 mb-2"></i>
                                <span class="text-[10px] font-bold text-blue-600">MobilePay</span>
                            </button>
                            <button onclick="app.selectPOSPayment('Tarjeta')" id="pay-Tarjeta" 
                                class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                                <i class="ph-duotone ph-credit-card text-2xl text-slate-400 group-hover:text-indigo-500 mb-2"></i>
                                <span class="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600">Tarjeta</span>
                            </button>
                            <button onclick="app.selectPOSPayment('Efectivo')" id="pay-Efectivo" 
                                class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition-all group">
                                <i class="ph-duotone ph-banknotes text-2xl text-slate-400 group-hover:text-emerald-500 mb-2"></i>
                                <span class="text-[10px] font-bold text-slate-500 group-hover:text-emerald-600">Efectivo</span>
                            </button>
                        </div>
                        <input type="hidden" id="input-payment-method" value="MobilePay">
                    </div>

                    <!-- Botón de Acción Principal -->
                    <div class="pt-4">
                        <button onclick="app.handleQuickPOSAction()" id="btn-pos-action" 
                            class="w-full py-5 bg-brand-dark text-white font-bold rounded-2xl shadow-xl shadow-brand-dark/20 flex items-center justify-center gap-3 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <i class="ph-bold ph-printer text-xl"></i>
                            Cobrar e Imprimir Ticket
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    updatePOSCondition(condition) {
        this.state.posCondition = condition;
        this.renderSales(document.getElementById('app-content'));
    },

    selectPOSPayment(method) {
        const input = document.getElementById('input-payment-method');
        if (input) input.value = method;

        // Visual feedback
        ['MobilePay', 'Tarjeta', 'Efectivo'].forEach(m => {
            const btn = document.getElementById(`pay-${m}`);
            if (btn) {
                if (m === method) {
                    btn.classList.add('border-brand-dark', 'bg-slate-50', 'ring-2', 'ring-brand-dark/10');
                    btn.classList.remove('border-slate-100', 'bg-white');
                    // Find icon and span inside
                    const icon = btn.querySelector('i');
                    const span = btn.querySelector('span');
                    if (icon) {
                        icon.classList.add(m === 'MobilePay' ? 'text-blue-500' : (m === 'Tarjeta' ? 'text-indigo-500' : 'text-emerald-500'));
                        icon.classList.remove('text-slate-400');
                    }
                    if (span) {
                        span.classList.add(m === 'MobilePay' ? 'text-blue-600' : (m === 'Tarjeta' ? 'text-indigo-600' : 'text-emerald-600'));
                        span.classList.remove('text-slate-500');
                    }
                } else {
                    btn.classList.remove('border-brand-dark', 'bg-slate-50', 'ring-2', 'ring-brand-dark/10');
                    btn.classList.add('border-slate-100', 'bg-white');
                    const icon = btn.querySelector('i');
                    const span = btn.querySelector('span');
                    if (icon) {
                        icon.className = icon.className.replace(/text-(blue|indigo|emerald)-500/g, 'text-slate-400');
                    }
                    if (span) {
                        span.className = span.className.replace(/text-(blue|indigo|emerald)-600/g, 'text-slate-500');
                    }
                }
            }
        });
    },

    async handleQuickPOSAction() {
        const btn = document.getElementById('btn-pos-action');
        const skuInput = document.getElementById('input-sku');
        const priceInput = document.getElementById('input-price');
        const paymentInput = document.getElementById('input-payment-method');
        const artistInput = document.getElementById('input-artist');
        const albumInput = document.getElementById('input-album');
        const costInput = document.getElementById('input-cost');
        const costPosInput = document.getElementById('input-cost-pos');

        const sku = skuInput?.value;
        const price = parseFloat(priceInput?.value);
        const paymentMethod = paymentInput?.value || 'MobilePay';
        const artist = artistInput?.value;
        const album = albumInput?.value;

        // Handling for "Used" items logic
        const isUsed = this.state.posCondition === 'Used';
        let cost = parseFloat(costInput?.value) || 0;

        if (isUsed) {
            const manualCost = parseFloat(costPosInput?.value);
            if (!isNaN(manualCost)) cost = manualCost;
        }

        if (!price || isNaN(price)) {
            this.showToast('⚠️ Debes ingresar un precio válido', 'error');
            return;
        }

        if (!sku && !this.state.manualSaleSearch) {
            this.showToast('⚠️ Debes buscar un producto o ingresar un nombre', 'error');
            return;
        }

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Procesando...';
            }

            const record = this.state.inventory.find(r => r.sku === sku);

            const saleData = {
                items: [{
                    recordId: record ? record.id : 'manual-' + Date.now(),
                    quantity: 1,
                    unitPrice: price,
                    costAtSale: cost,
                    artist: artist || 'Desconocido',
                    album: album || this.state.manualSaleSearch || 'Venta Manual',
                    sku: sku || 'N/A'
                }],
                paymentMethod: paymentMethod,
                customerName: 'Venta Mostrador',
                total_amount: price,
                source: 'STORE',
                channel: 'tienda',
                condition: this.state.posCondition || 'New',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            await api.createSale(saleData);

            this.showToast('✅ Venta registrada correctamente');

            // Trigger Ticket Print
            this.printTicket(saleData);

            // Reset state
            this.state.manualSaleSearch = '';
            this.state.posSelectedItemSku = null;
            this.loadData();

        } catch (error) {
            console.error("POS Action Error:", error);
            this.showToast("❌ Error: " + error.message, "error");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-printer text-xl"></i> Cobrar e Imprimir Ticket';
            }
        }
    },

    printTicket(sale) {
        const ticketWindow = window.open('', '_blank', 'width=300,height=600');
        if (!ticketWindow) {
            this.showToast('⚠️ El bloqueador de ventanas emergentes impidió imprimir el ticket', 'warning');
            return;
        }
        const item = sale.items[0];

        ticketWindow.document.write(`
            <html>
                <head>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; padding: 20px; width: 260px; }
                        .text-center { text-align: center; }
                        .bold { font-weight: bold; }
                        .divider { border-top: 1px dashed #000; margin: 10px 0; }
                        .flex { display: flex; justify-content: space-between; }
                        .header { margin-bottom: 20px; }
                        .footer { margin-top: 20px; font-size: 10px; }
                        @media print { body { padding: 0; margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="text-center header">
                        <div class="bold" style="font-size: 16px;">EL CUARTITO</div>
                        <div>Disquería Boutique</div>
                        <div>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
                    </div>
                    <div class="divider"></div>
                    <div class="bold">${item.artist}</div>
                    <div>${item.album}</div>
                    <div class="flex" style="margin-top: 5px;">
                        <span>1 x ${this.formatCurrency(item.unitPrice)}</span>
                        <span class="bold">${this.formatCurrency(item.unitPrice)}</span>
                    </div>
                    <div class="divider"></div>
                    <div class="flex bold" style="font-size: 14px;">
                        <span>TOTAL</span>
                        <span>${this.formatCurrency(sale.total_amount)}</span>
                    </div>
                    <div class="divider"></div>
                    <div class="text-center">
                        <div>Pago: ${sale.paymentMethod}</div>
                        <div class="footer">¡Gracias por tu compra!</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(() => window.close(), 500);
                        }
                    </script>
                </body>
            </html>
        `);
        ticketWindow.document.close();
    },




    updateOrderFeedFilter(filter) {
        this.state.orderFeedFilter = filter;
        this.renderSales(document.getElementById('app-content'));
    },

    toggleOrderActionMenu(orderId) {
        const menu = document.getElementById(`action-menu-${orderId}`);
        // Close all other menus
        document.querySelectorAll('[id^="action-menu-"]').forEach(el => {
            if (el.id !== `action-menu-${orderId}`) el.classList.add('hidden');
        });
        if (menu) menu.classList.toggle('hidden');
    },

    async markOrderAsShipped(orderId) {
        try {
            await db.collection('sales').doc(orderId).update({
                status: 'shipped',
                fulfillment_status: 'fulfilled',
                shipped_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.showToast('✅ Pedido marcado como enviado');
            this.loadData();
        } catch (error) {
            console.error("Error marking order as shipped:", error);
            this.showToast("❌ Error al actualizar estado", "error");
        }
    },

    searchSku(query) {
        this.state.manualSaleSearch = query;
        const resultsDiv = document.getElementById('sku-results');
        if (query.length < 2) {
            resultsDiv.classList.add('hidden');
            return;
        }

        const matches = this.state.inventory.filter(i =>
            i.artist.toLowerCase().includes(query.toLowerCase()) ||
            i.album.toLowerCase().includes(query.toLowerCase()) ||
            i.sku.toLowerCase().includes(query.toLowerCase())
        );

        if (matches.length > 0) {
            resultsDiv.innerHTML = matches.map(item => `
    <div onclick="app.selectSku('${item.sku}')" class="p-3 hover:bg-orange-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center">
                    <div>
                        <p class="font-bold text-sm text-brand-dark">${item.album}</p>
                        <p class="text-xs text-slate-500">${item.artist}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-sm text-brand-orange">${this.formatCurrency(item.price)}</p>
                        <p class="text-xs ${item.stock > 0 ? 'text-green-500' : 'text-red-500'}">Stock: ${item.stock}</p>
                    </div>
                </div>
    `).join('');
            resultsDiv.classList.remove('hidden');
        } else {
            resultsDiv.classList.add('hidden');
        }
    },

    selectSku(sku) {
        const item = this.state.inventory.find(i => i.sku === sku);
        if (!item) return;

        this.state.posSelectedItemSku = item.sku;

        // Re-render to update the view with selected item
        this.renderSales(document.getElementById('app-content'));

        // After re-render, populate inputs that might be present
        setTimeout(() => {
            const priceInput = document.getElementById('input-price');
            const skuInput = document.getElementById('input-sku');
            const costInput = document.getElementById('input-cost');
            const artistInput = document.getElementById('input-artist');
            const albumInput = document.getElementById('input-album');
            const genreInput = document.getElementById('input-genre');
            const ownerInput = document.getElementById('input-owner');
            const searchInput = document.getElementById('sku-search');

            if (priceInput) priceInput.value = item.price;
            if (skuInput) skuInput.value = item.sku;
            if (costInput) costInput.value = item.cost || 0;
            if (artistInput) artistInput.value = item.artist;
            if (albumInput) albumInput.value = item.album;
            if (genreInput) genreInput.value = item.genre;
            if (ownerInput) ownerInput.value = item.owner;
            if (searchInput) {
                searchInput.value = `${item.artist} - ${item.album}`;
                this.state.manualSaleSearch = searchInput.value;
            }

            const results = document.getElementById('sku-results');
            if (results) results.classList.add('hidden');
        }, 50);

        // STOCK CHECK
        if (item.stock <= 0) {
            this.showToast('⚠️ Este producto no tiene stock disponible', 'warning');
        }
    },

    updateTotal() {
        const price = parseFloat(document.getElementById('input-price').value) || 0;
        const qty = parseInt(document.getElementById('input-qty').value) || 1;
        const total = price * qty;
        document.getElementById('form-total').innerText = this.formatCurrency(total);
    },



    openAddVinylModal(editSku = null) {
        let item = { sku: '', artist: '', album: '', genre: 'Minimal', condition: 'NM', product_condition: 'Second-hand', price: '', cost: '', stock: 1, owner: 'El Cuartito' };
        let isEdit = false;

        if (editSku) {
            const found = this.state.inventory.find(i => i.sku === editSku);
            if (found) {
                item = found;
                isEdit = true;
            }
        }

        // Auto-generate SKU for new items
        if (!isEdit) {
            const skuNumbers = this.state.inventory
                .map(i => {
                    // Match "SKU-123", "SKU - 123", "SKU  -  123", etc.
                    const match = i.sku.match(/^SKU\s*-\s*(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                });
            const maxSku = Math.max(0, ...skuNumbers);
            // standardized format: SKU-001 (no spaces)
            item.sku = `SKU-${String(maxSku + 1).padStart(3, '0')}`;
        }

        // Custom Genres Logic
        const defaultGenres = ['Minimal', 'Techno', 'House', 'Deep House', 'Electro'];
        const allGenres = [...new Set([...defaultGenres, ...(this.state.customGenres || [])])];

        const modalHtml = `
    <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-5xl p-6 md:p-8 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div class="flex justify-between items-center mb-6 shrink-0">
                <h3 class="font-display text-2xl font-bold text-brand-dark">${isEdit ? 'Editar Vinilo' : 'Agregar Nuevo Vinilo'}</h3>
                <button onclick="document.getElementById('modal-overlay').remove()" class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                    <i class="ph-bold ph-x text-xl"></i>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-8 pr-2 custom-scrollbar">

                <!-- Left Column: Search & Image -->
                <div class="md:col-span-4 space-y-6">
                    <!-- Discogs Search -->
                    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-brand-orange opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>

                        <div class="relative z-10">
                            <div class="flex justify-between items-center mb-3">
                                <label class="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <i class="ph-fill ph-disc"></i> Buscar en Discogs
                                </label>
                                <button onclick="app.navigate('settings'); document.getElementById('modal-overlay').remove()" class="text-xs font-bold text-brand-orange hover:underline" title="Configurar Token">
                                    Configurar
                                </button>
                                ${isEdit ? '<button onclick="app.resyncMusic()" class="text-xs font-bold text-slate-400 hover:text-brand-orange ml-4 flex items-center gap-1"><i class="ph-bold ph-arrows-clockwise"></i> Resync Music</button>' : ''}
                            </div>
                            <div class="flex gap-2">
                                <input type="text" id="discogs-search-input" onkeypress="if(event.key === 'Enter') app.searchDiscogs()" placeholder="Catálogo, Artista o ID..." class="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm shadow-sm font-medium">
                                    <button onclick="app.searchDiscogs()" class="bg-brand-dark text-white w-10 rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20" title="Buscar">
                                        <i class="ph-bold ph-magnifying-glass"></i>
                                    </button>
                                    <button onclick="app.fetchDiscogsById()" class="bg-indigo-500 text-white w-10 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20" title="Importar por ID">
                                        <i class="ph-bold ph-download-simple"></i>
                                    </button>
                            </div>
                            <div id="discogs-results" class="mt-3 space-y-2 hidden max-h-60 overflow-y-auto custom-scrollbar bg-white rounded-xl shadow-inner p-1"></div>
                        </div>
                    </div>

                    <!-- Cover Preview (Large) -->
                    <div class="aspect-square bg-slate-100 rounded-2xl border-2 border-slate-200 border-dashed flex items-center justify-center relative overflow-hidden group shadow-inner">
                        <div id="cover-preview" class="${item.cover_image ? '' : 'hidden'} w-full h-full relative">
                            <img src="${item.cover_image || ''}" class="w-full h-full object-cover">
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span class="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">Portada</span>
                                </div>
                        </div>
                        <div class="${item.cover_image ? 'hidden' : ''} text-center p-6 text-slate-300">
                            <i class="ph-fill ph-image text-4xl mb-2"></i>
                            <p class="text-xs font-bold uppercase">Sin Imagen</p>
                        </div>
                    </div>

                    <!-- Tracklist Preview (populated by Discogs selection) -->
                    <div id="tracklist-preview" class="hidden bg-slate-50 rounded-xl border border-slate-200 p-4 max-h-48 overflow-y-auto custom-scrollbar">
                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center justify-between">
                            <span class="flex items-center gap-1"><i class="ph-bold ph-music-notes"></i> Tracklist (Referencia)</span>
                            <a id="discogs-release-link" href="#" target="_blank" class="text-brand-orange hover:underline flex items-center gap-1 hidden">
                                Ver en Discogs <i class="ph-bold ph-arrow-square-out"></i>
                            </a>
                        </p>
                        <div id="tracklist-preview-content" class="space-y-1 text-xs text-slate-600"></div>
                    </div>

                    <!-- Price Suggestions (populated by selection) -->
                    <div id="price-suggestions-preview" class="hidden bg-brand-bg/50 rounded-xl border border-brand-orange/20 p-4">
                        <p class="text-[10px] font-bold text-brand-orange uppercase mb-2 flex items-center gap-1">
                            <i class="ph-bold ph-tag"></i> Precios Sugeridos (Marketplace)
                        </p>
                        <div id="price-suggestions-content" class="grid grid-cols-2 gap-2">
                        </div>
                    </div>
                </div>

                <!-- Right Column: Form Data -->
                <div class="md:col-span-8">
                    <form onsubmit="app.handleAddVinyl(event, '${isEdit ? item.sku : ''}')" class="space-y-5">

                        <!-- Hidden Fields -->
                        <input type="hidden" name="cover_image" id="input-cover-image" value="${item.cover_image || ''}">
                        <input type="hidden" name="discogs_release_id" id="input-discogs-release-id" value="${item.discogs_release_id || ''}">
                            <input type="hidden" name="discogsUrl" id="input-discogs-url" value="${item.discogsUrl || ''}">
                                <input type="hidden" name="discogsId" id="input-discogs-id" value="${item.discogsId || ''}">
                                    <!-- Fixed: Add hidden SKU input for form data -->
                                    <input type="hidden" name="sku" value="${item.sku}">

                                        <!-- Main Info Group -->
                                        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                                            <h4 class="text-sm font-bold text-brand-dark flex items-center gap-2 border-b border-slate-50 pb-2">
                                                <i class="ph-fill ph-info text-brand-orange"></i> Información Principal
                                            </h4>

                                            <div class="grid grid-cols-2 gap-5">
                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Artista</label>
                                                    <input name="artist" value="${item.artist}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none font-bold text-brand-dark transition-all focus:bg-white text-sm">
                                                </div>
                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Álbum</label>
                                                    <input name="album" value="${item.album}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none font-bold text-brand-dark transition-all focus:bg-white text-sm">
                                                </div>
                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Sello / Label</label>
                                                    <input name="label" id="input-label" value="${item.label || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm">
                                                </div>
                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Collection</label>
                                                    <select name="collection" id="input-collection" onchange="app.handleCollectionChange(this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">Sin Colección</option>
                                                        <option value="Detroit Techno" ${item.collection === 'Detroit Techno' ? 'selected' : ''}>Detroit Techno</option>
                                                        <option value="Ambient Essentials" ${item.collection === 'Ambient Essentials' ? 'selected' : ''}>Ambient Essentials</option>
                                                        <option value="Staff Picks" ${item.collection === 'Staff Picks' ? 'selected' : ''}>Staff Picks</option>
                                                        <option value="other" ${(item.collection && !['Detroit Techno', 'Ambient Essentials', 'Staff Picks'].includes(item.collection)) ? 'selected' : ''}>Otro...</option>
                                                    </select>
                                                    <div id="custom-collection-container" class="${(item.collection && !['Detroit Techno', 'Ambient Essentials', 'Staff Picks'].includes(item.collection)) ? '' : 'hidden'} mt-2">
                                                        <input name="custom_collection" id="custom-collection-input" value="${(item.collection && !['Detroit Techno', 'Ambient Essentials', 'Staff Picks'].includes(item.collection)) ? item.collection : ''}" placeholder="Nombre de la colección" class="w-full bg-white border border-brand-orange rounded-xl p-2 text-sm focus:outline-none">
                                                    </div>
                                                </div>
                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género Principal</label>
                                                    <select name="genre" onchange="app.checkCustomInput(this, 'custom-genre-container')" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">Seleccionar...</option>
                                                        ${allGenres.map(g => `<option ${item.genre === g ? 'selected' : ''}>${g}</option>`).join('')}
                                                        <option value="other">Otro...</option>
                                                    </select>
                                                    <div id="custom-genre-container" class="hidden mt-2">
                                                        <input name="custom_genre" placeholder="Nuevo Género" class="w-full bg-white border border-brand-orange rounded-xl p-2 text-sm focus:outline-none">
                                                    </div>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género Secundario</label>
                                                    <select name="genre2" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${allGenres.map(g => `<option ${item.genre2 === g ? 'selected' : ''}>${g}</option>`).join('')}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género Terciario</label>
                                                    <select name="genre3" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${allGenres.map(g => `<option ${item.genre3 === g ? 'selected' : ''}>${g}</option>`).join('')}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género 4</label>
                                                    <select name="genre4" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${allGenres.map(g => `<option ${item.genre4 === g ? 'selected' : ''}>${g}</option>`).join('')}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género 5</label>
                                                    <select name="genre5" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${allGenres.map(g => `<option ${item.genre5 === g ? 'selected' : ''}>${g}</option>`).join('')}
                                                    </select>
                                                </div>
                                                
                                                <!-- Collection Note (conditional) -->
                                                <div id="collection-note-container" class="col-span-2 ${item.collection ? '' : 'hidden'}">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Collection Note</label>
                                                    <textarea name="collectionNote" id="input-collection-note" placeholder="¿Por qué elegiste este disco para esta colección?" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm resize-none">${item.collectionNote || ''}</textarea>
                                                    <p class="text-xs text-slate-400 mt-1">Aparecerá como descripción editorial en la página de la colección</p>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Inventory & Pricing Group -->
                                        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                                            <h4 class="text-sm font-bold text-brand-dark flex items-center gap-2 border-b border-slate-50 pb-2">
                                                <i class="ph-fill ph-currency-dollar text-green-600"></i> Inventario y Precio
                                            </h4>

                                            <div class="grid grid-cols-3 md:grid-cols-4 gap-4">
                                                <div class="col-span-3 md:col-span-2">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Dueño</label>
                                                    <select name="owner" id="modal-owner" onchange="app.handlePriceChange()" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none font-medium text-sm">
                                                        <option value="El Cuartito" ${item.owner === 'El Cuartito' ? 'selected' : ''}>El Cuartito (Propio)</option>
                                                        ${this.state.consignors.map(c => `<option value="${c.name}" data-split="${c.split || c.agreementSplit || 70}" ${item.owner === c.name ? 'selected' : ''}>${c.name} (${c.split || c.agreementSplit || 70}%)</option>`).join('')}
                                                    </select>
                                                </div>
                                                <div class="col-span-3 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Label Disquería</label>
                                                    <input name="storageLocation" value="${item.storageLocation || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm" placeholder="A1">
                                                </div>
                                                <div class="col-span-3 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Estado del Vinilo</label>
                                                    <select name="condition" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm font-bold">
                                                        <option value="M" ${item.condition === 'M' ? 'selected' : ''}>Mint (M)</option>
                                                        <option value="NM" ${item.condition === 'NM' ? 'selected' : ''}>Near Mint (NM)</option>
                                                        <option value="VG+" ${item.condition === 'VG+' ? 'selected' : ''}>Very Good Plus (VG+)</option>
                                                        <option value="VG" ${item.condition === 'VG' ? 'selected' : ''}>Very Good (VG)</option>
                                                        <option value="G+" ${item.condition === 'G+' ? 'selected' : ''}>Good Plus (G+)</option>
                                                        <option value="G" ${item.condition === 'G' ? 'selected' : ''}>Good (G)</option>
                                                        <option value="F" ${item.condition === 'F' ? 'selected' : ''}>Fair (F)</option>
                                                        <option value="P" ${item.condition === 'P' ? 'selected' : ''}>Poor (P)</option>
                                                    </select>
                                                </div>
                                                <div class="col-span-3 md:col-span-2">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Condición Producto</label>
                                                    <select name="product_condition" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm font-bold">
                                                        <option value="New" ${item.product_condition === 'New' ? 'selected' : ''}>🆕 Nuevo (New)</option>
                                                        <option value="Second-hand" ${item.product_condition === 'Second-hand' || !item.product_condition ? 'selected' : ''}>📦 Usado (Second-hand)</option>
                                                    </select>
                                                </div>
                                                <div class="col-span-3 md:col-span-2">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Estado de la Funda</label>
                                                    <select name="sleeveCondition" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm font-bold">
                                                        <option value="" ${!item.sleeveCondition ? 'selected' : ''}>Not Graded</option>
                                                        <option value="Generic" ${item.sleeveCondition === 'Generic' ? 'selected' : ''}>Generic</option>
                                                        <option value="No Cover" ${item.sleeveCondition === 'No Cover' ? 'selected' : ''}>No Cover</option>
                                                        <option value="M" ${item.sleeveCondition === 'M' ? 'selected' : ''}>Mint (M)</option>
                                                        <option value="NM" ${item.sleeveCondition === 'NM' ? 'selected' : ''}>Near Mint (NM)</option>
                                                        <option value="VG+" ${item.sleeveCondition === 'VG+' ? 'selected' : ''}>Very Good Plus (VG+)</option>
                                                        <option value="VG" ${item.sleeveCondition === 'VG' ? 'selected' : ''}>Very Good (VG)</option>
                                                        <option value="G+" ${item.sleeveCondition === 'G+' ? 'selected' : ''}>Good Plus (G+)</option>
                                                        <option value="G" ${item.sleeveCondition === 'G' ? 'selected' : ''}>Good (G)</option>
                                                        <option value="F" ${item.sleeveCondition === 'F' ? 'selected' : ''}>Fair (F)</option>
                                                        <option value="P" ${item.sleeveCondition === 'P' ? 'selected' : ''}>Poor (P)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div class="p-4 bg-orange-50/50 rounded-xl border border-orange-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Costo Adquisición</label>
                                                    <input name="cost" id="modal-cost" type="number" step="0.5" value="${item.cost}" required oninput="app.handleCostChange()" class="w-full bg-white border border-slate-200 rounded-xl p-2 focus:border-brand-orange outline-none text-center shadow-sm text-sm font-bold text-slate-600">
                                                </div>
                                                <div>
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ganancia %</label>
                                                    <input name="margin" id="modal-margin" type="number" step="1" value="30" oninput="app.handleMarginChange()" class="w-full bg-white border border-slate-200 rounded-xl p-2 focus:border-brand-orange outline-none text-center shadow-sm text-sm font-bold text-brand-orange">
                                                </div>
                                                <div>
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Precio Venta (Bruto)</label>
                                                    <input name="price" id="modal-price" type="number" step="0.5" value="${item.price}" required oninput="app.handlePriceChange()" class="w-full bg-white border border-slate-200 rounded-xl p-2 focus:border-brand-orange outline-none font-bold text-brand-dark text-lg text-center shadow-sm">
                                                </div>
                                                <div>
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Stock</label>
                                                    <input name="stock" type="number" value="${item.stock}" required class="w-full bg-white border border-slate-200 rounded-xl p-2 focus:border-brand-orange outline-none font-bold text-center shadow-sm">
                                                </div>
                                            </div>
                                            <div class="flex justify-between items-center px-1">
                                                <p class="text-[10px] text-slate-400" id="cost-helper">Ingresa Costo y Margen para calcular precio.</p>
                                                <p class="text-[10px] text-slate-400 font-mono">${item.sku}</p>
                                            </div>
                                        </div>

                                        <!-- Comments field for Discogs -->
                                        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                            <h4 class="text-sm font-bold text-brand-dark flex items-center gap-2 border-b border-slate-50 pb-2">
                                                <i class="ph-fill ph-note text-brand-orange"></i> Comentarios (para Discogs)
                                            </h4>
                                            <div>
                                                <textarea 
                                                    name="comments" 
                                                    rows="3" 
                                                    maxlength="255"
                                                    placeholder="Ej: Limited edition, colored vinyl, gatefold sleeve..." 
                                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm resize-none"
                                                >${item.comments || ''}</textarea>
                                                <p class="text-xs text-slate-400 mt-1">Opcional. Se mostrará en la descripción de Discogs (máx 255 caracteres).</p>
                                            </div>
                                        </div>

                                        <!-- Publishing Channels -->
                                        <div class="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border-2 border-purple-100 space-y-4">
                                            <div class="flex items-center gap-2 mb-4">
                                                <i class="ph-fill ph-broadcast text-purple-600 text-xl"></i>
                                                <h4 class="text-sm font-bold text-purple-900 uppercase tracking-wide">Canales de Publicación</h4>
                                            </div>
                                            
                                            <!-- WebShop Checkbox -->
                                            <div class="flex items-center justify-between bg-white/80 backdrop-blur rounded-xl p-4 border border-purple-100 hover:border-purple-300 transition-colors">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                                        <i class="ph-fill ph-storefront text-green-600 text-xl"></i>
                                                    </div>
                                                    <div>
                                                        <label class="text-sm font-bold text-green-900 cursor-pointer" for="channel-webshop">🌐 Publicar en WebShop</label>
                                                        <p class="text-xs text-green-700">Visible en la tienda online</p>
                                                    </div>
                                                </div>
                                                <input type="checkbox" id="channel-webshop" name="publish_webshop" ${item.publish_webshop !== false && item.is_online !== false ? 'checked' : ''} class="w-6 h-6 text-green-600 rounded border-green-300 focus:ring-green-500 cursor-pointer">
                                            </div>

                                            <!-- Discogs Checkbox -->
                                            <div class="flex items-center justify-between bg-white/80 backdrop-blur rounded-xl p-4 border border-purple-100 hover:border-purple-300 transition-colors">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                                        <i class="ph-fill ph-vinyl-record text-purple-600 text-xl"></i>
                                                    </div>
                                                    <div>
                                                        <label class="text-sm font-bold text-purple-900 cursor-pointer" for="channel-discogs">💿 Publicar en Discogs</label>
                                                        <p class="text-xs text-purple-700">Crear listing en Discogs Marketplace</p>
                                                    </div>
                                                </div>
                                                <input type="checkbox" id="channel-discogs" name="publish_discogs" ${item.publish_discogs === true || item.discogs_listing_id ? 'checked' : ''} class="w-6 h-6 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer">
                                            </div>

                                            <!-- Local Checkbox -->
                                            <div class="flex items-center justify-between bg-white/80 backdrop-blur rounded-xl p-4 border border-purple-100 hover:border-purple-300 transition-colors">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <i class="ph-fill ph-house text-blue-600 text-xl"></i>
                                                    </div>
                                                    <div>
                                                        <label class="text-sm font-bold text-blue-900 cursor-pointer" for="channel-local">📍 Disponible en Local</label>
                                                        <p class="text-xs text-blue-700">Disponible en tienda física</p>
                                                    </div>
                                                </div>
                                                <input type="checkbox" id="channel-local" name="publish_local" ${item.publish_local !== false ? 'checked' : ''} class="w-6 h-6 text-blue-600 rounded border-blue-300 focus:ring-blue-500 cursor-pointer">
                                            </div>
                                        </div>

                                        <div class="pt-2 flex gap-4">
                                            <button type="button" onclick="document.getElementById('modal-overlay').remove()" class="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors">Cancelar</button>
                                            <button type="submit" class="flex-[2] py-3 rounded-xl bg-brand-dark hover:bg-slate-800 text-white font-bold transition-all shadow-xl shadow-brand-dark/20 hover:scale-[1.02]">
                                                <i class="ph-bold ph-floppy-disk mr-2"></i> Guardar Cambios
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                </div>
                `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // --- Product Detail View (Ficha) ---
    openProductModal(sku) {
        console.log('Attempting to open modal for:', sku);
        try {
            const item = this.state.inventory.find(i => i.sku === sku);
            if (!item) {
                console.error('Item not found:', sku);
                alert('Error: No se encontró el disco. Intenta recargar.');
                return;
            }

            // Remove existing if any
            const existing = document.getElementById('modal-overlay');
            if (existing) existing.remove();

            const html = `
                <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-fadeIn" style="animation: fadeIn 0.3s forwards;">

                        <!-- Cover Image Header -->
                        <div class="h-64 w-full bg-slate-100 relative group">
                            ${item.cover_image
                    ? `<img src="${item.cover_image}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-fill ph-music-note text-6xl"></i></div>`
                }
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                            <button onclick="document.getElementById('modal-overlay').remove()" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm">
                                <i class="ph-bold ph-x text-xl"></i>
                            </button>

                            <div class="absolute bottom-0 left-0 w-full p-6 text-white">
                                <div class="flex items-center gap-2 mb-2">
                                    ${this.getStatusBadge(item.condition)}
                                    <span class="text-xs font-mono opacity-70 bg-black/30 px-2 py-1 rounded">${item.sku}</span>
                                </div>
                                <h2 class="font-display text-2xl font-bold leading-tight drop-shadow-md mb-1">${item.album}</h2>
                                <p class="text-lg font-medium text-orange-200 drop-shadow-sm">${item.artist}</p>
                            </div>
                        </div>

                        <!-- Details Body -->
                        <div class="p-6 space-y-6">
                            <div class="grid grid-cols-2 gap-6">
                                <div>
                                    <p class="text-xs text-slate-400 font-bold uppercase mb-1">Precio</p>
                                    <p class="text-3xl font-bold text-brand-dark">${this.formatCurrency(item.price)}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-slate-400 font-bold uppercase mb-1">Stock</p>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xl font-bold ${item.stock > 0 ? 'text-green-600' : 'text-red-500'}">${item.stock}</span>
                                        <span class="text-xs text-slate-400 font-medium">unidades</span>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-3 pt-4 border-t border-slate-100">
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Género</span>
                                    <span class="text-sm font-bold text-brand-dark">${item.genre}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Sello / Label</span>
                                    <span class="text-sm font-bold text-brand-dark text-right max-w-[60%] truncate">${item.label || '-'}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Dueño / Owner</span>
                                    <span class="text-sm font-bold text-brand-dark">${item.owner}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Ubicación / Storage</span>
                                    <span class="text-sm font-bold text-brand-dark">${item.storageLocation || '-'}</span>
                                </div>
                            </div>

                            <div class="pt-4 flex flex-wrap gap-3">
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openAddVinylModal('${item.sku}')" class="flex-1 min-w-[120px] bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/20 text-sm">
                                    <i class="ph-bold ph-pencil-simple"></i>
                                    Editar
                                </button>
                                <button id="refresh-metadata-btn" onclick="app.refreshProductMetadata('${item.id || item.sku}')" 
                                    class="flex-1 min-w-[120px] bg-emerald-50 text-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 border border-emerald-100 text-sm"
                                    title="Actualizar datos desde Discogs">
                                    <i class="ph-bold ph-arrows-clockwise"></i>
                                    Re-sync
                                </button>
                                ${item.discogsUrl
                    ? `<a href="${item.discogsUrl}" target="_blank" class="flex-1 min-w-[120px] bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="ph-bold ph-disc"></i> Discogs
                                   </a>`
                    : `<a href="https://www.discogs.com/search/?q=${encodeURIComponent(item.artist + ' ' + item.album)}&type=release" target="_blank" class="flex-1 min-w-[120px] bg-slate-50 text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="ph-bold ph-magnifying-glass"></i> Buscar
                                   </a>`
                }
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openTracklistModal('${item.sku}')" class="flex-1 min-w-[120px] bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border border-indigo-100 text-sm">
                                    <i class="ph-bold ph-list-numbers"></i> Tracks
                                </button>
                                <button onclick="app.addToCart('${item.sku}'); document.getElementById('modal-overlay').remove()" class="flex-1 min-w-[120px] bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 text-sm">
                                    <i class="ph-bold ph-shopping-cart"></i>
                                    Vender
                                </button>
                                <button onclick="app.deleteVinyl('${item.sku}'); document.getElementById('modal-overlay').remove()" class="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm" title="Eliminar Disco">
                                    <i class="ph-bold ph-trash text-xl"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                `;

            document.body.insertAdjacentHTML('beforeend', html);

        } catch (error) {
            console.error('Error opening product modal:', error);
            alert('Hubo un error al abrir la ficha. Por favor recarga la página.');
        }
    },

    // --- End Product Detail View ---

    handleCostChange() {
        const cost = parseFloat(document.getElementById('modal-cost').value) || 0;
        const ownerSelect = document.getElementById('modal-owner');
        const split = ownerSelect.options[ownerSelect.selectedIndex].getAttribute('data-split');
        const marginInput = document.getElementById('modal-margin');
        const priceInput = document.getElementById('modal-price');

        if (split) {
            // Consignor: Price = Cost / (Split / 100)
            const factor = parseFloat(split) / 100;
            if (factor > 0) {
                const price = cost / factor;
                priceInput.value = Math.ceil(price);
            }
        } else {
            // Propio: Price = Cost / (1 - Margin / 100)
            const margin = parseFloat(marginInput.value) || 0;
            const factor = 1 - (margin / 100);
            if (factor > 0) {
                const price = cost / factor;
                priceInput.value = Math.ceil(price);
            }
        }
    },

    handlePriceChange() {
        const price = parseFloat(document.getElementById('modal-price').value) || 0;
        const ownerSelect = document.getElementById('modal-owner');
        const split = ownerSelect.options[ownerSelect.selectedIndex].getAttribute('data-split');
        const marginInput = document.getElementById('modal-margin');
        const costInput = document.getElementById('modal-cost');
        const helperText = document.getElementById('cost-helper');

        if (split) {
            // Consignor: Cost = Price * (Split / 100)
            const factor = parseFloat(split) / 100;
            const cost = price * factor;
            costInput.value = Math.round(cost);

            // Set Margin Display (Fixed)
            marginInput.value = 100 - parseFloat(split);
            marginInput.readOnly = true;
            marginInput.classList.add('opacity-50');

            if (helperText) helperText.innerText = `Consignación: ${split}% Socio`;
        } else {
            // Propio: Calculate Markup from Price/Cost (percentage of cost, not sale)
            const cost = parseFloat(costInput.value) || 0;
            if (cost > 0 && price > 0) {
                const markup = ((price - cost) / cost) * 100; // Markup % of Cost (can be > 100%)
                marginInput.value = Math.round(markup);
            }
            marginInput.readOnly = false;
            marginInput.classList.remove('opacity-50');
            if (helperText) helperText.innerText = 'Modo Propio: Margen variable';
        }
    },

    handleMarginChange() {
        const markup = parseFloat(document.getElementById('modal-margin').value) || 0;
        const cost = parseFloat(document.getElementById('modal-cost').value) || 0;
        const priceInput = document.getElementById('modal-price');

        // Markup formula: price = cost * (1 + markup/100)
        // This works for any markup %, including > 100%
        if (cost > 0) {
            const price = cost * (1 + markup / 100);
            priceInput.value = Math.ceil(price);
        }
    },

    checkCustomInput(select, containerId) {
        const container = document.getElementById(containerId);
        if (select.value === 'other') {
            container.classList.remove('hidden');
            container.querySelector('input').required = true;
            container.querySelector('input').focus();
        } else {
            container.classList.add('hidden');
            container.querySelector('input').required = false;
        }
    },

    toggleCollectionNote(collectionValue) {
        const container = document.getElementById('collection-note-container');
        if (container && collectionValue && collectionValue !== '') {
            container.classList.remove('hidden');
        } else if (container) {
            container.classList.add('hidden');
        }
    },

    handleCollectionChange(value) {
        const customContainer = document.getElementById('custom-collection-container');
        const noteContainer = document.getElementById('collection-note-container');

        // Show/hide custom input
        if (value === 'other') {
            customContainer?.classList.remove('hidden');
            customContainer?.querySelector('input')?.focus();
        } else {
            customContainer?.classList.add('hidden');
        }

        // Show/hide collection note
        if (value && value !== '') {
            noteContainer?.classList.remove('hidden');
        } else {
            noteContainer?.classList.add('hidden');
        }
    },

    openAddSaleModal() {
        const cartItemsSvg = this.state.cart.length > 0
            ? this.state.cart.map(item => `
                <div class="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <div class="min-w-0 pr-2">
                        <p class="font-bold text-xs text-brand-dark truncate">${item.album}</p>
                        <p class="text-[10px] text-slate-500">${this.formatCurrency(item.price)}</p>
                    </div>
                </div>`).join('')
            : '<p class="text-sm text-slate-400 italic text-center py-4">El carrito está vacío</p>';

        const modalHtml = `
                <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl w-full max-w-5xl p-6 md:p-8 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
                        <div class="flex justify-between items-center mb-6 shrink-0">
                            <h3 class="font-display text-2xl font-bold text-brand-dark">Nueva Venta</h3>
                            <button onclick="document.getElementById('modal-overlay').remove()" class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                                <i class="ph-bold ph-x text-xl"></i>
                            </button>
                        </div>

                        <div class="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-8 pr-2 custom-scrollbar">

                            <!-- Left Column: Cart Summary -->
                            <div class="md:col-span-5 space-y-6 border-r border-slate-100 pr-6">
                                <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <h4 class="font-bold text-brand-dark mb-4 flex items-center gap-2">
                                        <i class="ph-fill ph-shopping-cart text-brand-orange"></i> Carrito Actual
                                        <span class="bg-brand-dark text-white text-xs px-2 py-0.5 rounded-full">${this.state.cart.length}</span>
                                    </h4>
                                    <div class="max-h-60 overflow-y-auto mb-4 bg-white rounded-xl border border-slate-100 p-3 shadow-inner custom-scrollbar">
                                        ${cartItemsSvg}
                                    </div>
                                    ${this.state.cart.length > 0 ? `
                                <div class="flex justify-between items-center mb-4 pt-2 border-t border-slate-200">
                                    <span class="text-sm font-bold text-slate-500">Total</span>
                                    <span class="text-xl font-bold text-brand-dark">${this.formatCurrency(this.state.cart.reduce((s, i) => s + i.price, 0))}</span>
                                </div>
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openCheckoutModal()" class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20 flex items-center justify-center gap-2">
                                    <i class="ph-bold ph-check-circle"></i> Finalizar Compra Carrito
                                </button>
                            ` : ''}
                                </div>
                            </div>

                            <!-- Right Column: Manual Sale Form -->
                            <div class="md:col-span-7">
                                <div class="mb-4">
                                    <h4 class="font-bold text-brand-dark flex items-center gap-2 mb-2">
                                        <i class="ph-fill ph-lightning text-yellow-500"></i> Venta Manual (Item Único)
                                    </h4>
                                    <p class="text-xs text-slate-500 mb-4">Usa esto para vender un item suelto fuera del inventario o rápidamente.</p>
                                </div>

                                <form onsubmit="app.handleSaleSubmit(event)" class="space-y-4">
                                    <!-- SKU Search -->
                                    <div class="relative">
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Buscar Producto</label>
                                        <div class="relative">
                                            <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                            <input type="text" id="sku-search" onkeyup="app.searchSku(this.value)" placeholder="SKU / Artista..." autocomplete="off"
                                                class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all text-sm font-medium">
                                        </div>
                                        <div id="sku-results" class="absolute w-full bg-white shadow-xl rounded-xl mt-2 max-h-60 overflow-y-auto z-50 hidden border border-orange-100"></div>
                                    </div>

                                    <!-- Selected Item Info -->
                                    <div class="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 text-sm">
                                        <div class="flex justify-between mb-2">
                                            <span class="text-slate-500 font-medium">Item:</span>
                                            <span id="form-album" class="font-bold text-brand-dark text-right truncate ml-4">-</span>
                                        </div>
                                        <div class="flex justify-between items-center mb-2">
                                            <span class="text-slate-500 font-medium">Precio:</span>
                                            <input type="number" name="price" id="input-price" step="0.5" class="w-24 text-right font-bold text-brand-dark bg-white border border-slate-200 rounded-lg px-2 py-1 focus:border-brand-orange outline-none">
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-slate-500 font-medium">Stock:</span>
                                            <span id="form-stock" class="font-medium text-slate-700">-</span>
                                        </div>
                                    </div>

                                    <!-- Customer Info -->
                                    <div class="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                                        <h4 class="text-xs font-bold text-indigo-800 uppercase flex items-center gap-2">
                                            <i class="ph-fill ph-user"></i> Cliente
                                        </h4>
                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <input name="customerName" placeholder="Nombre" class="w-full bg-white border border-indigo-200 rounded-xl p-2.5 text-sm focus:border-indigo-500 outline-none">
                                            </div>
                                            <div>
                                                <input name="customerEmail" type="email" placeholder="Email" class="w-full bg-white border border-indigo-200 rounded-xl p-2.5 text-sm focus:border-indigo-500 outline-none">
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <input type="checkbox" name="requestInvoice" id="check-invoice" class="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500">
                                                <label for="check-invoice" class="text-xs font-medium text-indigo-700">Solicitar Factura</label>
                                        </div>
                                    </div>

                                    <!-- Hidden Inputs -->
                                    <input type="hidden" name="sku" id="input-sku">
                                        <input type="hidden" name="cost" id="input-cost">
                                            <input type="hidden" name="genre" id="input-genre">
                                                <input type="hidden" name="artist" id="input-artist">
                                                    <input type="hidden" name="album" id="input-album">
                                                        <input type="hidden" name="owner" id="input-owner">
                                                            <input type="hidden" name="quantity" id="input-qty" value="1">

                                                                <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                                                    <div>
                                                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha</label>
                                                                        <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}"
                                                                            class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none text-sm font-medium">
                                                                    </div>
                                                                    <div>
                                                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pago</label>
                                                                        <select name="paymentMethod" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none text-sm font-medium">
                                                                            <option value="MobilePay">MobilePay</option>
                                                                            <option value="Efectivo">Efectivo</option>
                                                                            <option value="Tarjeta">Tarjeta</option>
                                                                            <option value="Transferencia">Transferencia</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ingreso Envío (VAT 25%)</label>
                                                                        <input type="number" name="shipping_income" step="0.5" value="0"
                                                                            class="w-full px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl focus:border-brand-orange outline-none text-sm font-bold text-blue-700">
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Canal</label>
                                                                    <select name="soldAt" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none text-sm font-medium">
                                                                        <option>Tienda</option>
                                                                        <option>Discogs</option>
                                                                        <option>Feria</option>
                                                                    </select>
                                                                </div>

                                                                <div class="flex items-center justify-between p-3 bg-brand-dark text-white rounded-lg">
                                                                    <span class="text-sm font-medium">Total</span>
                                                                    <span id="form-total" class="font-display font-bold text-xl">0 kr.</span>
                                                                </div>

                                                                <button type="submit" id="btn-submit-sale-modal" class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20 flex items-center justify-center gap-2">
                                                                    <i class="ph-bold ph-check"></i>
                                                                    Registrar Venta
                                                                </button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                    `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Focus search
        setTimeout(() => document.getElementById('sku-search').focus(), 100);
    },

    addToCart(sku, event) {
        if (event) event.stopPropagation();

        const item = this.state.inventory.find(i => i.sku === sku);
        if (!item) return;

        // Stock Check for Cart
        const currentInCart = this.state.cart.filter(i => i.sku === sku).length;
        if (currentInCart >= item.stock) {
            this.showToast(`⚠️ No queda más stock de "${item.album}"`, 'warning');
            return;
        }

        this.openAddSaleModal();
        setTimeout(() => {
            const input = document.getElementById('sku-search');
            input.value = sku;
            this.searchSku(sku);
            // Auto select first result after delay
            setTimeout(() => {
                const firstResult = document.getElementById('sku-results').firstElementChild;
                if (firstResult) firstResult.click();
            }, 500);
        }, 200);
    },

    openUnifiedOrderDetailModal(saleId) {
        const sale = this.state.sales.find(s => s.id === saleId);
        if (!sale) return;

        const customerInfo = this.getCustomerInfo(sale);
        const history = sale.history || [];
        const createdDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : (sale.date ? new Date(sale.date) : new Date());

        // Timeline management
        let timelineItems = [];
        if (history.length > 0) {
            timelineItems = history.map(h => ({
                status: h.status,
                timestamp: new Date(h.timestamp),
                note: h.note
            })).sort((a, b) => b.timestamp - a.timestamp);
        } else {
            timelineItems.push({
                status: sale.fulfillment_status || 'pending',
                timestamp: sale.updated_at?.toDate ? sale.updated_at.toDate() : (sale.updated_at ? new Date(sale.updated_at) : new Date()),
                note: 'Última actualización'
            });
        }
        timelineItems.push({
            status: 'created',
            timestamp: createdDate,
            note: `Orden recibida via ${sale.channel || sale.soldAt || 'Sistema'}`
        });

        // Helpers for aesthetics
        const getStatusTheme = (status) => {
            const themes = {
                'created': { icon: 'ph-shopping-cart', color: 'bg-slate-100 text-slate-500', label: 'Recibido' },
                'preparing': { icon: 'ph-package', color: 'bg-blue-100 text-blue-600', label: 'En Preparación' },
                'ready_for_pickup': { icon: 'ph-storefront', color: 'bg-emerald-100 text-emerald-600', label: 'Listo para Retiro' },
                'in_transit': { icon: 'ph-truck', color: 'bg-orange-100 text-orange-600', label: 'En Tránsito' },
                'shipped': { icon: 'ph-archive', color: 'bg-green-100 text-green-600', label: 'Despachado' },
                'picked_up': { icon: 'ph-check-circle', color: 'bg-green-100 text-green-600', label: 'Retirado' },
                'completed': { icon: 'ph-check-circle', color: 'bg-green-100 text-green-600', label: 'Confirmado' },
                'failed': { icon: 'ph-x-circle', color: 'bg-red-100 text-red-600', label: 'Fallido' },
                'PENDING': { icon: 'ph-clock', color: 'bg-yellow-100 text-yellow-600', label: 'Pendiente' }
            };
            return themes[status] || { icon: 'ph-info', color: 'bg-slate-100', label: status };
        };

        const subtotal = sale.items ? sale.items.reduce((sum, item) => sum + ((item.unitPrice || item.priceAtSale || item.record?.price || 0) * (item.qty || item.quantity || 1)), 0) : (sale.total || 0);
        const shippingCost = parseFloat(sale.shipping_income || sale.shipping_cost || sale.shipping || (sale.shipping_method?.price) || 0);
        const shippingVat = shippingCost * 0.20;
        const fees = (sale.discogsFee || 0) + (sale.paypalFee || 0);
        const total = sale.total_amount || sale.total || (subtotal + shippingCost);

        const modalHtml = `
        <div id="unified-modal" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative animate-fadeIn flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] font-bold text-brand-orange uppercase tracking-widest">Orden #${sale.orderNumber || sale.id.slice(0, 8)}</span>
                            <span class="px-2 py-0.5 rounded-full ${getStatusTheme(sale.status).color} text-[9px] font-bold uppercase">${getStatusTheme(sale.status).label}</span>
                        </div>
                        <h2 class="font-display text-2xl font-bold text-brand-dark">Detalle de Venta</h2>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="window.print()" class="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                            <i class="ph-bold ph-printer text-xl"></i>
                        </button>
                        <button onclick="document.getElementById('unified-modal').remove()" class="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                            <i class="ph-bold ph-x text-xl"></i>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        <!-- Left Column: Order Info & Items -->
                        <div class="lg:col-span-2 space-y-8">
                            
                            <!-- Status Summary -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Canal de Venta</p>
                                    <div class="flex items-center gap-2">
                                        <i class="ph-fill ${sale.channel === 'online' ? 'ph-globe' : (sale.channel === 'discogs' ? 'ph-vinyl-record' : 'ph-storefront')} text-brand-orange"></i>
                                        <span class="font-bold text-brand-dark capitalize">${sale.channel || sale.soldAt || 'Local'}</span>
                                    </div>
                                </div>
                                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fulfillment</p>
                                    <div class="font-bold text-brand-dark capitalize">${(sale.fulfillment_status || 'Pendiente').replace('_', ' ')}</div>
                                </div>
                                <div class="bg-brand-dark p-4 rounded-2xl text-white">
                                    <p class="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Monto Total</p>
                                    <div class="text-xl font-bold">${this.formatCurrency(total)}</div>
                                </div>
                            </div>

                            <!-- Items -->
                            <div class="space-y-4">
                                <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                    <i class="ph-fill ph-package text-brand-orange"></i> Items Comprados
                                </h3>
                                <div class="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table class="w-full text-sm">
                                        <thead class="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                                            <tr>
                                                <th class="px-4 py-3 text-left">Producto</th>
                                                <th class="px-4 py-3 text-center">SKU</th>
                                                <th class="px-4 py-3 text-center">Cant.</th>
                                                <th class="px-4 py-3 text-right">Precio</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-50">
                                            ${(sale.items || []).map(item => `
                                                <tr>
                                                    <td class="px-4 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <img src="${item.image || item.cover_image || item.record?.cover_image || 'https://elcuartito.dk/default-vinyl.png'}" class="w-10 h-10 rounded-lg object-cover shadow-sm">
                                                            <div>
                                                                <p class="font-bold text-brand-dark">${item.album || item.record?.album || 'Desconocido'}</p>
                                                                <p class="text-[10px] text-slate-500">${item.artist || item.record?.artist || ''}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-4 py-4 text-center font-mono text-xs text-slate-400">${item.sku || item.record?.sku || '-'}</td>
                                                    <td class="px-4 py-4 text-center font-medium">${item.quantity || item.qty || 1}</td>
                                                    <td class="px-4 py-4 text-right font-bold text-brand-dark">${this.formatCurrency(item.unitPrice || item.priceAtSale || item.record?.price || 0)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Payment Details -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                                    <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumen Financiero</h4>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-slate-500">Subtotal</span>
                                            <span class="font-medium text-brand-dark">${this.formatCurrency(subtotal)}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-slate-500">Envío (Gross)</span>
                                            <span class="font-medium text-brand-dark">${this.formatCurrency(shippingCost)}</span>
                                        </div>
                                        <div class="flex justify-between text-blue-600 text-[10px] font-bold">
                                            <span>↳ Salgsmoms Envío (25%)</span>
                                            <span>${this.formatCurrency(shippingVat)}</span>
                                        </div>
                                        ${fees !== 0 ? `
                                            <div class="flex justify-between text-red-500">
                                                <span>Fees (Discogs/PayPal)</span>
                                                <span class="font-medium">-${this.formatCurrency(fees)}</span>
                                            </div>
                                        ` : ''}
                                        <div class="flex justify-between font-bold text-brand-dark pt-2 border-t border-slate-200">
                                            <span>Monto Final</span>
                                            <span>${this.formatCurrency(total)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                                    <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método de Pago</h4>
                                    <div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                        <div class="w-10 h-10 bg-brand-orange/10 rounded-lg flex items-center justify-center text-brand-orange">
                                            <i class="ph-fill ph-credit-card text-xl"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm font-bold text-brand-dark capitalize">${sale.payment_method || sale.paymentMethod || 'Tarjeta'}</p>
                                            <p class="text-[10px] text-slate-400">${sale.paymentId ? 'ID: ' + sale.paymentId.slice(0, 15) + '...' : 'Venta Directa'}</p>
                                        </div>
                                    </div>
                                    <div class="text-[10px] text-slate-400 flex items-center gap-1">
                                        <i class="ph ph-calendar"></i>
                                        Registrado el ${createdDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Customer & History -->
                        <div class="space-y-8">
                            
                            <!-- Customer Info -->
                            <div class="space-y-4">
                                <h4 class="font-bold text-brand-dark flex items-center gap-2">
                                    <i class="ph-fill ph-user-circle text-brand-orange"></i> Cliente
                                </h4>
                                <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre</p>
                                        <p class="font-bold text-brand-dark">${customerInfo.name}</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Email</p>
                                        <p class="text-sm font-medium text-slate-600 truncate">${customerInfo.email}</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Teléfono</p>
                                        <p class="text-sm font-medium text-slate-600">${sale.customer?.phone || '-'}</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección</p>
                                        <p class="text-xs font-medium text-slate-600 leading-relaxed">${customerInfo.address}</p>
                                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customerInfo.address)}" target="_blank" class="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-1">
                                            <i class="ph ph-map-pin"></i> Ver en Maps
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <!-- Fulfillment Actions -->
                            ${sale.channel === 'online' || sale.channel === 'discogs' ? `
                                <div class="space-y-4">
                                    <h4 class="font-bold text-brand-dark flex items-center gap-2">
                                        <i class="ph-fill ph-truck text-brand-orange"></i> Gestión de Envío
                                    </h4>
                                    <div class="flex flex-col gap-2">
                                        <button onclick="app.updateFulfillmentStatus(event, '${sale.id}', 'preparing')" class="w-full px-4 py-2.5 rounded-xl border ${sale.fulfillment_status === 'preparing' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} text-xs font-bold transition-all flex items-center gap-2">
                                            <i class="ph ph-package"></i> Preparación
                                        </button>
                                        <button onclick="app.updateFulfillmentStatus(event, '${sale.id}', 'ready_for_pickup')" class="w-full px-4 py-2.5 rounded-xl border ${sale.fulfillment_status === 'ready_for_pickup' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} text-xs font-bold transition-all flex items-center gap-2">
                                            <i class="ph ph-storefront"></i> Listo para Retiro
                                        </button>
                                        <button onclick="app.updateFulfillmentStatus(event, '${sale.id}', 'shipped')" class="w-full px-4 py-2.5 rounded-xl border ${sale.fulfillment_status === 'shipped' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} text-xs font-bold transition-all flex items-center gap-2">
                                            <i class="ph ph-paper-plane-tilt"></i> Enviado / Despachado
                                        </button>
                                    </div>
                                </div>
                            ` : ''}

                            <!-- History Timeline -->
                            <div class="space-y-4">
                                <h4 class="font-bold text-brand-dark flex items-center gap-2">
                                    <i class="ph-fill ph-clock-counter-clockwise text-brand-orange"></i> Movimientos
                                </h4>
                                <div class="relative pl-4 border-l-2 border-slate-100 space-y-6">
                                    ${timelineItems.map((item, index) => {
            const theme = getStatusTheme(item.status);
            return `
                                            <div class="relative">
                                                <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${index === 0 ? 'bg-brand-orange ring-4 ring-orange-50' : 'bg-slate-300'}"></div>
                                                <div class="flex flex-col gap-0.5">
                                                    <div class="flex items-center gap-2">
                                                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${theme.color}">
                                                            ${theme.label}
                                                        </span>
                                                        <span class="text-[9px] text-slate-400 font-mono">
                                                            ${item.timestamp.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} ${item.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p class="text-xs text-slate-500">${item.note || '-'}</p>
                                                </div>
                                            </div>
                                        `;
        }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                    <button onclick="document.getElementById('unified-modal').remove()" class="flex-1 bg-brand-dark text-white py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-brand-dark/20">
                        Cerrar Detalle
                    </button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    openInvoiceModal(saleId) {
        const sale = this.state.sales.find(s => s.id === saleId);
        if (!sale) {
            this.showToast('Sale not found', 'error');
            return;
        }

        const items = sale.items || [];
        const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date || sale.timestamp);

        // Generate unique invoice number: ECR-YYYYMMDD-XXXX (year+month+day + last 4 of sale ID)
        const dateStr = saleDate.toISOString().slice(0, 10).replace(/-/g, '');
        const invoiceNumber = sale.invoiceNumber || `ECR-${dateStr}-${saleId.slice(-4).toUpperCase()}`;

        // Separate items by condition
        const newItems = items.filter(i => i.productCondition === 'New');
        const usedItems = items.filter(i => i.productCondition !== 'New');

        // Calculate VAT
        let totalNewVAT = 0;
        let subtotal = 0;

        const formatItemRows = (itemsList, isNew) => {
            return itemsList.map(item => {
                const price = item.priceAtSale || item.price || 0;
                const qty = item.qty || item.quantity || 1;
                const lineTotal = price * qty;
                subtotal += lineTotal;

                if (isNew) {
                    const vat = lineTotal * 0.20;
                    totalNewVAT += vat;
                    return `
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${item.album || 'Product'}</div>
                                <div style="font-size: 11px; color: #666;">${item.artist || ''}</div>
                                <div style="font-size: 11px; color: #2563eb; margin-top: 4px;">✓ Moms (25%): DKK ${vat.toFixed(2)}</div>
                            </td>
                            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eee;">${qty}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee;">DKK ${price.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">DKK ${lineTotal.toFixed(2)}</td>
                        </tr>
                    `;
                } else {
                    return `
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${item.album || 'Product'}</div>
                                <div style="font-size: 11px; color: #666;">${item.artist || ''}</div>
                                <div style="font-size: 10px; color: #d97706; margin-top: 4px; font-style: italic;">Brugtmoms - Køber har ikke fradrag for momsen</div>
                            </td>
                            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eee;">${qty}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee;">DKK ${price.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">DKK ${lineTotal.toFixed(2)}</td>
                        </tr>
                    `;
                }
            }).join('');
        };

        // Build sections for mixed orders
        let itemsSection = '';
        if (newItems.length > 0 && usedItems.length > 0) {
            itemsSection = `
                <tr><td colspan="4" style="padding: 15px 0 8px 0; font-size: 12px; font-weight: bold; color: #2563eb; text-transform: uppercase;">🆕 New Products (VAT Deductible)</td></tr>
                ${formatItemRows(newItems, true)}
                <tr><td colspan="4" style="padding: 20px 0 8px 0; font-size: 12px; font-weight: bold; color: #d97706; text-transform: uppercase;">📦 Used Products (Margin Scheme / Brugtmoms)</td></tr>
                ${formatItemRows(usedItems, false)}
            `;
        } else {
            itemsSection = formatItemRows(newItems, true) + formatItemRows(usedItems, false);
        }

        const shipping = parseFloat(sale.shipping_income || sale.shipping || sale.shipping_cost || 0);
        const shippingVAT = shipping * 0.20;
        const total = subtotal + shipping;

        const customerName = sale.customer ? `${sale.customer.firstName || ''} ${sale.customer.lastName || ''}`.trim() : (sale.customerName || 'Customer');
        const customerAddress = sale.customer ? `${sale.customer.address || ''}<br>${sale.customer.postalCode || ''} ${sale.customer.city || ''}<br>${sale.customer.country || ''}` : '';

        const invoiceHtml = `
            <div id="invoice-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick="if(event.target.id === 'invoice-modal') this.remove()">
                <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div class="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                        <h3 class="font-bold text-lg text-brand-dark flex items-center gap-2">
                            <i class="ph-fill ph-file-text text-brand-orange"></i>
                            Invoice ${invoiceNumber}
                        </h3>
                        <div class="flex items-center gap-2">
                            <button onclick="app.printInvoice()" class="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-600 transition-colors text-sm flex items-center gap-2">
                                <i class="ph-bold ph-printer"></i> Print
                            </button>
                            <button onclick="document.getElementById('invoice-modal').remove()" class="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-300 transition-colors text-sm">
                                Close
                            </button>
                        </div>
                    </div>
                    <div class="overflow-auto p-6" id="invoice-content">
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0;">EL CUARTITO RECORDS</h1>
                                <p style="font-size: 12px; color: #999; margin-top: 5px;">Dybbølsgade 14, 1721 København V, Denmark</p>
                                <p style="font-size: 11px; color: #999;">CVR: 45943216</p>
                            </div>

                            <div style="display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px;">
                                <div>
                                    <p style="font-weight: bold; margin-bottom: 5px;">Bill To:</p>
                                    <p style="color: #666; margin: 0;">${customerName}</p>
                                    ${customerAddress ? `<p style="color: #666; margin: 5px 0; font-size: 12px;">${customerAddress}</p>` : ''}
                                </div>
                                <div style="text-align: right;">
                                    <p style="margin: 0;"><strong>Invoice:</strong> ${invoiceNumber}</p>
                                    <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${saleDate.toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>

                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                <thead>
                                    <tr style="background: #f5f5f5;">
                                        <th style="text-align: left; padding: 10px; font-size: 11px; color: #666; text-transform: uppercase;">Product</th>
                                        <th style="text-align: center; padding: 10px; font-size: 11px; color: #666; text-transform: uppercase;">Qty</th>
                                        <th style="text-align: right; padding: 10px; font-size: 11px; color: #666; text-transform: uppercase;">Price</th>
                                        <th style="text-align: right; padding: 10px; font-size: 11px; color: #666; text-transform: uppercase;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsSection}
                                </tbody>
                            </table>

                            <div style="border-top: 2px solid #eee; padding-top: 15px; font-size: 14px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>Subtotal:</span>
                                    <span>DKK ${subtotal.toFixed(2)}</span>
                                </div>
                                ${totalNewVAT > 0 ? `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #2563eb; font-size: 13px;">
                                    <span>↳ Heraf moms (25%):</span>
                                    <span>DKK ${totalNewVAT.toFixed(2)}</span>
                                </div>
                                ` : ''}
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>Shipping (incl. 25% VAT):</span>
                                    <span>DKK ${shipping.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #2563eb; font-size: 11px;">
                                    <span>↳ Shipping VAT (25%):</span>
                                    <span>DKK ${shippingVAT.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #333; font-weight: 900; font-size: 18px;">
                                    <span>Total:</span>
                                    <span>DKK ${total.toFixed(2)}</span>
                                </div>
                            </div>

                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 11px;">
                                <p>Thank you for your purchase!</p>
                                <p>hola@elcuartito.dk | elcuartito.dk</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', invoiceHtml);
    },

    printInvoice() {
        const invoiceContent = document.getElementById('invoice-content').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - El Cuartito Records</title>
                <style>
                    body { margin: 0; padding: 20px; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${invoiceContent}
                <script>window.print(); setTimeout(() => window.close(), 500);</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    navigateInventoryFolder(type, value) {
        if (type === 'genre') this.state.filterGenre = value;
        if (type === 'owner') this.state.filterOwner = value;
        if (type === 'label') this.state.filterLabel = value; // assuming 'label' is 'label'
        if (type === 'storage') this.state.filterStorage = value;
        this.refreshCurrentView();
    },

    toggleSelection(sku) {
        if (this.state.selectedItems.has(sku)) {
            this.state.selectedItems.delete(sku);
        } else {
            this.state.selectedItems.add(sku);
        }
        this.refreshCurrentView();
    },

    openPrintLabelModal(sku) {
        const item = this.state.inventory.find(i => i.sku === sku);
        if (!item) return;

        const modalHtml = `
    <div id="print-label-modal" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" >
                                                        <div class="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-orange-100 overflow-hidden max-h-[90vh] flex flex-col relative">

                                                            <!-- Header -->
                                                            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                                                <div>
                                                                    <h2 class="text-2xl font-display font-bold text-brand-dark">Imprimir Etiqueta</h2>
                                                                    <p class="text-slate-500 text-sm">Configura e imprime la etiqueta para ${item.sku}</p>
                                                                </div>
                                                                <button onclick="document.getElementById('print-label-modal').remove()" class="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors">
                                                                    <i class="ph-bold ph-x"></i>
                                                                </button>
                                                            </div>

                                                            <!-- Body -->
                                                            <div class="p-8 flex-1 overflow-y-auto">
                                                                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                    <!-- Controls -->
                                                                    <div class="space-y-6">
                                                                        <div>
                                                                            <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Comentario Personalizado</label>
                                                                            <textarea id="label-comment" rows="4"
                                                                                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-orange focus:ring-4 focus:ring-orange-500/10 outline-none transition-all resize-none text-sm"
                                                                                placeholder="Escribe un comentario para la etiqueta (ej. Info extra, estado, precio promocional)..."
                                                                                oninput="document.getElementById('preview-comment').innerText = this.value"></textarea>
                                                                        </div>

                                                                        <div class="bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-700 text-sm">
                                                                            <i class="ph-fill ph-info text-lg shrink-0"></i>
                                                                            <p>La etiqueta está diseñada para 7cm x 4cm. Asegúrate de configurar la impresora con estas medidas.</p>
                                                                        </div>

                                                                        <button onclick="window.print()" class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                                                            <i class="ph-bold ph-printer"></i>
                                                                            Imprimir
                                                                        </button>
                                                                    </div>

                                                                    <!-- Preview Container -->
                                                                    <div class="flex flex-col items-center justify-center bg-gray-100 rounded-xl p-8 border border-dashed border-gray-300">
                                                                        <span class="text-xs font-bold text-slate-400 uppercase mb-4">Vista Previa (7cm x 4cm)</span>

                                                                        <!-- THE LABEL (Print Target: Template Overlay) -->
                                                                        <div id="printable-label" class="bg-white relative overflow-hidden"
                                                                            style="width: 7cm; height: 4cm; box-sizing: border-box; font-family: 'Rockwell', 'Courier New', Courier, serif; color: black; line-height: 1;">

                                                                            <!-- Background Template Image (Clean) -->
                                                                            <img src="assets/label_clean.png"
                                                                                style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;"
                                                                                alt="Label Template">

                                                                                <!-- Content Layer (Absolute Positioning) -->
                                                                                <div style="position: relative; z-index: 10; height: 100%; width: 100%;">

                                                                                    <!-- Top Main Section -->
                                                                                    <div style="position: absolute; top: 4mm; left: 4mm; width: calc(100% - 8mm);">
                                                                                        <div style="font-size: 10pt; font-weight: bold; margin-bottom: 2px; line-height: 1.1; letter-spacing: -0.3px;">${item.album}</div>
                                                                                        <div style="font-size: 8pt; margin-bottom: 12px; letter-spacing: -0.2px;">${item.artist}</div>
                                                                                        <div style="font-size: 8pt; color: #444; font-weight: bold; font-style: italic;">${item.genre || ''}</div>
                                                                                    </div>

                                                                                    <!-- Comment Section -->
                                                                                    <div style="position: absolute; top: 21mm; left: 4mm; width: calc(100% - 8mm); height: 9mm; display: flex; align-items: start;">
                                                                                        <p id="preview-comment" style="font-size: 7pt; line-height: 1.4; padding-top: 3px; margin: 0; white-space: pre-wrap; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                                                                                            ${/* Comment injects here */ ''}
                                                                                        </p>
                                                                                    </div>

                                                                                    <!-- Footer Section -->
                                                                                    <div style="position: absolute; bottom: 1.5mm; left: 4mm; width: calc(100% - 8mm);">
                                                                                        <div style="font-size: 11pt; font-weight: bold; letter-spacing: -0.5px; line-height: 0.9; margin-bottom: 2px;">${item.sku}</div>
                                                                                        <div style="font-size: 7pt; font-weight: normal; text-transform: uppercase; color: #555; line-height: 1;">${item.storageLocation || 'Sin Ubicación'}</div>
                                                                                    </div>
                                                                                </div>
                                                                        </div>

                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!--Injected Print Styles-- >
    <style>
        @media print {
            @page {
            size: 7cm 4cm;
        margin: 0;
                    }
        body * {
            visibility: hidden;
                    }
        #printable-label, #printable-label * {
            visibility: visible;
                    }
        #printable-label {
            position: fixed;
        left: 0;
        top: 0;
        margin: 0;
        border: none;
        width: 7cm !important;
        height: 4cm !important;
        box-shadow: none;
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
                    }
        .modal-container, .modal-backdrop {
            display: none !important;
                    }
                }
    </style>
                                                    </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },
    initFuse() {
        if (typeof Fuse === 'undefined') {
            console.warn('Fuse.js not loaded yet');
            return;
        }

        const options = {
            keys: [
                { name: 'artist', weight: 0.4 },
                { name: 'album', weight: 0.3 },
                { name: 'label', weight: 0.2 },
                { name: 'sku', weight: 0.1 },
                { name: 'genre', weight: 0.05 },
                { name: 'notes', weight: 0.05 }
            ],
            threshold: 0.4, // Lower is stricter, 0.4 is a good balance for typos
            distance: 100,
            ignoreLocation: true,
            minMatchCharLength: 2
        };

        this.fuse = new Fuse(this.state.inventory, options);
    },

    getFilteredInventory() {
        const searchTerm = (this.state.inventorySearch || '').trim().toLowerCase();

        const currentGenreFilter = this.state.filterGenre || 'all';
        const currentOwnerFilter = this.state.filterOwner || 'all';
        const currentLabelFilter = this.state.filterLabel || 'all';
        const currentStorageFilter = this.state.filterStorage || 'all';
        const currentDiscogsFilter = this.state.filterDiscogs || 'all';

        let results = this.state.inventory;

        // 1. Fuzzy Search (if term exists)
        if (searchTerm.length >= 2) {
            if (this.fuse) {
                results = this.fuse.search(searchTerm).map(r => r.item);
            } else {
                // Fallback to basic search if fuse not ready
                const terms = searchTerm.split(' ').filter(t => t.length > 0);
                results = results.filter(item => {
                    return terms.every(term => {
                        return (item.artist || '').toLowerCase().includes(term) ||
                            (item.album || '').toLowerCase().includes(term) ||
                            (item.label || '').toLowerCase().includes(term) ||
                            (item.genre || '').toLowerCase().includes(term) ||
                            (item.notes || '').toLowerCase().includes(term) ||
                            (item.sku || '').toLowerCase().includes(term);
                    });
                });
            }
        }

        // 2. Apply static filters
        return results.filter(item => {
            const matchesGenre = currentGenreFilter === 'all' || item.genre === currentGenreFilter;
            const matchesOwner = currentOwnerFilter === 'all' || item.owner === currentOwnerFilter;
            const matchesLabel = currentLabelFilter === 'all' || item.label === currentLabelFilter;
            const matchesStorage = currentStorageFilter === 'all' || item.storageLocation === currentStorageFilter;

            const hasDiscogs = !!item.discogs_listing_id;
            const matchesDiscogs = currentDiscogsFilter === 'all' ||
                (currentDiscogsFilter === 'yes' && hasDiscogs) ||
                (currentDiscogsFilter === 'no' && !hasDiscogs);

            return matchesGenre && matchesOwner && matchesLabel && matchesStorage && matchesDiscogs;
        });
    },
    toggleSelectAll() {
        const filtered = this.getFilteredInventory();

        if (filtered.length > 0 && filtered.every(i => this.state.selectedItems.has(i.sku))) {
            // All visible are already selected, so Deselect All
            filtered.forEach(i => this.state.selectedItems.delete(i.sku));
        } else {
            // Select All visible
            filtered.forEach(i => this.state.selectedItems.add(i.sku));
        }

        this.refreshCurrentView();
    },

    addSelectionToCart() {
        this.state.selectedItems.forEach(sku => {
            const item = this.state.inventory.find(i => i.sku === sku);
            if (item && item.stock > 0) {
                // Simple addToCart logic duplication or loop
                // Check if already in cart
                if (!this.state.cart.find(c => c.sku === sku)) {
                    this.state.cart.push(item);
                }
            }
        });
        this.state.selectedItems.clear();
        this.showToast(`${this.state.cart.length} items agregados al carrito`);
        this.refreshCurrentView();
    },

    deleteSelection() {
        if (!confirm(`¿Estás seguro de eliminar ${this.state.selectedItems.size} productos ? `)) return;

        const batch = db.batch();
        const itemsToDelete = []; // Track for logging
        this.state.selectedItems.forEach(sku => {
            const ref = db.collection('products').doc(sku);
            const item = this.state.inventory.find(i => i.sku === sku);
            if (item) itemsToDelete.push(item);
            batch.delete(ref);
        });

        batch.commit().then(() => {
            this.showToast('Productos eliminados');
            // Log deleted items
            itemsToDelete.forEach(item => this.logInventoryMovement('DELETE', item));
            this.state.selectedItems.clear();
        }).catch(err => {
            console.error("Error logging movement:", err);
            alert('Error al eliminar');
        });
    },
    openAddExpenseModal() {
        // Custom Categories Logic
        const defaultCategories = ['Alquiler', 'Servicios', 'Marketing', 'Suministros', 'Honorarios'];
        const allCategories = [...new Set([...defaultCategories, ...(this.state.customCategories || [])])];

        const modalHtml = `
    <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" >
        <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform scale-100 transition-all border border-orange-100">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-display text-xl font-bold text-brand-dark">Registrar Gasto</h3>
                <button onclick="document.getElementById('modal-overlay').remove()" class="text-slate-400 hover:text-slate-600">
                    <i class="ph-bold ph-x text-xl"></i>
                </button>
            </div>
            <form onsubmit="app.handleExpenseSubmit(event)" class="space-y-4">
                <input type="hidden" name="id" id="expense-id">

                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                        <input name="description" id="expense-description" required class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Monto</label>
                            <input name="amount" id="expense-amount" type="number" step="0.01" required class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                            <select name="category" id="expense-category" onchange="app.checkCustomInput(this, 'custom-expense-category-container')" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                                ${allCategories.map(c => `<option>${c}</option>`).join('')}
                                <option value="other">Otra...</option>
                            </select>
                        </div>
                    </div>

                    <div id="custom-expense-category-container" class="hidden">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva Categoría</label>
                        <input name="custom_category" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none" placeholder="Nombre de categoría">
                    </div>

                    <div class="flex items-center gap-2">
                        <input type="checkbox" name="hasVat" id="hasVat" class="w-4 h-4 text-brand-orange rounded border-slate-300 focus:ring-brand-orange">
                            <label for="hasVat" class="text-sm text-slate-600">Incluye IVA (25%)</label>
                    </div>

                    <button type="submit" class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20">
                        Guardar Gasto
                    </button>
            </form>
        </div>
                                                    </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async handleAddVinyl(e, editSku) {
        e.preventDefault();
        const formData = new FormData(e.target);

        let genre = formData.get('genre');
        if (genre === 'other') {
            genre = formData.get('custom_genre');
        }

        let collection = formData.get('collection');
        if (collection === 'other') {
            collection = formData.get('custom_collection');
        }

        const sku = formData.get('sku');

        // Get publishing flags
        const publishWebshop = formData.get('publish_webshop') === 'on';
        const publishDiscogs = formData.get('publish_discogs') === 'on';
        const publishLocal = formData.get('publish_local') === 'on';

        const recordData = {
            sku: sku,
            artist: formData.get('artist'),
            album: formData.get('album'),
            genre: genre,
            genre2: formData.get('genre2') || null,
            genre3: formData.get('genre3') || null,
            genre4: formData.get('genre4') || null,
            genre5: formData.get('genre5') || null,
            label: formData.get('label'),
            collection: collection || null,
            collectionNote: formData.get('collectionNote') || null,
            condition: formData.get('condition'),
            product_condition: formData.get('product_condition') || 'Second-hand',
            sleeveCondition: formData.get('sleeveCondition') || '',
            comments: formData.get('comments') || '',
            price: parseFloat(formData.get('price')),
            cost: parseFloat(formData.get('cost')) || 0,
            stock: parseInt(formData.get('stock')),
            storageLocation: formData.get('storageLocation'),
            owner: formData.get('owner'),
            is_online: publishWebshop, // backward compatibility
            publish_webshop: publishWebshop,
            publish_discogs: publishDiscogs,
            publish_local: publishLocal,
            cover_image: formData.get('cover_image') || null,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            let productId = null;
            let existingProduct = null;

            if (editSku) {
                // Update existing - find by SKU first
                const product = await this.findProductBySku(editSku);
                if (!product) {
                    this.showToast('❌ Producto no encontrado', 'error');
                    return;
                }
                existingProduct = product.data;
                productId = product.id;
                await product.ref.update(recordData);
                this.showToast('✅ Disco actualizado');
            } else {
                // Create new with auto-generated ID
                const docRef = await db.collection('products').add(recordData);
                productId = docRef.id;
                this.showToast('✅ Disco agregado al inventario');
            }

            // Handle Discogs publishing
            if (publishDiscogs) {
                const releaseId = formData.get('discogs_release_id');

                // Check if we need to create or update Discogs listing
                if (existingProduct && existingProduct.discogs_listing_id) {
                    // Update existing listing
                    try {
                        const response = await fetch(`${BASE_API_URL}/discogs/update-listing/${existingProduct.discogs_listing_id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ product: recordData })
                        });
                        const result = await response.json();
                        if (result.success) {
                            this.showToast('💿 Listing de Discogs actualizado');
                        } else {
                            throw new Error(result.error || 'Error desconocido');
                        }
                    } catch (error) {
                        console.error('Error updating Discogs listing:', error);
                        this.showToast(`⚠️ Error Discogs: ${error.message}`, 'error');
                    }
                } else if (releaseId) {
                    // Create new listing
                    try {
                        const response = await fetch(`${BASE_API_URL}/discogs/create-listing`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ releaseId: parseInt(releaseId), product: recordData })
                        });
                        const result = await response.json();
                        if (result.success && result.listingId) {
                            // Update product with discogs_listing_id
                            await db.collection('products').doc(productId).update({
                                discogs_listing_id: String(result.listingId),
                                discogs_release_id: parseInt(releaseId)
                            });
                            this.showToast('💿 Publicado en Discogs correctamente');
                        } else {
                            throw new Error(result.error || 'Error desconocido');
                        }
                    } catch (error) {
                        console.error('Error creating Discogs listing:', error);
                        // Provide clearer error messages for common Discogs issues
                        let errorMsg = error.message;
                        if (errorMsg.toLowerCase().includes('mp3') || errorMsg.toLowerCase().includes('digital') || errorMsg.toLowerCase().includes('format')) {
                            errorMsg = 'Discogs solo permite formatos físicos (Vinyl, CD, Cassette). Este release es digital o MP3.';
                        }
                        this.showToast(`⚠️ Error Discogs: ${errorMsg}`, 'error');
                    }
                } else {
                    this.showToast('⚠️ Necesitas buscar el disco en Discogs primero para publicarlo', 'warning');
                }
            }

            document.getElementById('modal-overlay').remove();
            this.loadData();
        } catch (err) {
            console.error(err);
            this.showToast('❌ Error: ' + (err.message || 'desconocido'), 'error');
        }
    },

    deleteVinyl(sku) {
        const item = this.state.inventory.find(i => i.sku === sku);
        if (!item) {
            alert('Error: Item not found');
            return;
        }

        // Custom confirmation modal
        const modalHtml = `
                                                    <div id="delete-confirm-modal" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                                                        <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform scale-100 transition-all">
                                                            <div class="flex items-center gap-4 mb-4">
                                                                <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                                                                    <i class="ph-fill ph-warning text-2xl text-red-500"></i>
                                                                </div>
                                                                <div>
                                                                    <h3 class="font-display text-xl font-bold text-brand-dark">¿Eliminar disco?</h3>
                                                                    <p class="text-sm text-slate-500">Esta acción no se puede deshacer</p>
                                                                </div>
                                                            </div>
                                                            <div class="bg-slate-50 rounded-xl p-4 mb-6">
                                                                <p class="font-bold text-brand-dark mb-1">${item.album}</p>
                                                                <p class="text-sm text-slate-500">${item.artist}</p>
                                                                <p class="text-xs text-slate-400 mt-2">SKU: ${item.sku}</p>
                                                            </div>
                                                            <div class="flex gap-3">
                                                                <button onclick="document.getElementById('delete-confirm-modal').remove()" class="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                                                    Cancelar
                                                                </button>
                                                                <button onclick="app.confirmDelete('${item.sku}')" class="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async confirmDelete(sku) {
        // Close confirmation modal
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) modal.remove();

        // Close product modal if open
        const productModal = document.getElementById('modal-overlay');
        if (productModal) productModal.remove();

        try {
            // Find product by SKU field first
            const product = await this.findProductBySku(sku);
            if (!product) {
                this.showToast('❌ Producto no encontrado', 'error');
                return;
            }

            console.log('Product to delete:', product.data);
            console.log('Has discogs_listing_id?', product.data.discogs_listing_id);

            // If product has discogs_listing_id, delete from Discogs first
            if (product.data.discogs_listing_id) {
                console.log('Attempting to delete from Discogs:', product.data.discogs_listing_id);
                try {
                    const response = await fetch(`${BASE_API_URL}/discogs/delete-listing/${product.data.discogs_listing_id}`, {
                        method: 'DELETE'
                    });
                    console.log('Discogs delete response status:', response.status);
                    const result = await response.json();
                    console.log('Discogs delete result:', result);
                    if (result.success) {
                        console.log('Discogs listing deleted successfully');
                        this.showToast('💿 Eliminado de Discogs');
                    } else {
                        this.showToast('⚠️ ' + (result.error || 'Error en Discogs'), 'warning');
                    }
                } catch (error) {
                    console.error('Error deleting from Discogs:', error);
                    this.showToast('⚠️ Error eliminando de Discogs, pero continuando...', 'warning');
                }
            } else {
                console.log('No discogs_listing_id found, skipping Discogs deletion');
            }

            // Delete using the real document ID
            await product.ref.delete();
            this.showToast('✅ Disco eliminado');
            await this.loadData(); // Await to ensure inventory is refreshed
        } catch (error) {
            console.error("Error removing document: ", error);
            this.showToast('❌ Error al eliminar: ' + error.message, 'error');
        }
    },

    handleSaleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Strict SKU Validation
        let sku = formData.get('sku');
        if (!sku) sku = document.getElementById('input-sku')?.value;

        const record = this.state.inventory.find(r => r.sku === sku);
        if (!record) {
            this.showToast('⚠️ Debes seleccionar un producto válido del listado', 'error');
            const searchInput = document.getElementById('sku-search');
            if (searchInput) {
                searchInput.focus();
                searchInput.classList.add('border-red-500', 'animate-pulse');
                setTimeout(() => searchInput.classList.remove('border-red-500', 'animate-pulse'), 2000);
            }
            return;
        }

        let qty = parseInt(formData.get('quantity'));
        if (isNaN(qty)) qty = parseInt(document.getElementById('input-qty')?.value) || 1;

        // Final Stock Check
        if (record.stock < qty) {
            this.showToast(`❌ Stock insuficiente. Disponible: ${record.stock}`, 'error');
            return;
        }

        let price = parseFloat(formData.get('price'));
        if (isNaN(price)) price = parseFloat(document.getElementById('input-price')?.value) || 0;

        const cost = parseFloat(formData.get('cost')) || 0;
        const shippingIncome = parseFloat(formData.get('shipping_income')) || 0;
        const total = (price * qty) + shippingIncome;

        const date = formData.get('date') || new Date().toISOString();
        const paymentMethod = formData.get('paymentMethod');
        const soldAt = formData.get('soldAt');
        const comment = formData.get('comment');

        // Flattened Data
        let artist = formData.get('artist');
        if (!artist) artist = document.getElementById('input-artist')?.value;

        let album = formData.get('album');
        if (!album) album = document.getElementById('input-album')?.value;

        let genre = formData.get('genre');
        if (!genre) genre = document.getElementById('input-genre')?.value;

        let owner = formData.get('owner');
        if (!owner) owner = document.getElementById('input-owner')?.value;

        // Customer Data
        const customerName = formData.get('customerName');
        const customerEmail = formData.get('customerEmail');
        const requestInvoice = formData.get('requestInvoice') === 'on';

        // Find the record by SKU to get its ID for the sale

        // Create sale using API
        const saleApiData = {
            items: [{
                recordId: record.id,
                quantity: qty,
                unitPrice: price,
                costAtSale: cost
            }],
            paymentMethod: paymentMethod || 'CASH',
            customerName: customerName || 'Venta Manual',
            customerEmail: customerEmail || null,
            shipping_income: shippingIncome,
            total_amount: total,
            source: 'STORE',
            channel: soldAt?.toLowerCase() || 'store'
        };

        api.createSale(saleApiData)
            .then(() => {
                this.showToast(requestInvoice ? 'Venta registrada (Factura Solicitada)' : 'Venta registrada');
                const modal = document.getElementById('modal-overlay');
                if (modal) modal.remove();

                // If in non-modal (Sales View), clear form
                const salesForm = e.target;
                if (salesForm) salesForm.reset();

                // Reset "form-total" if exists
                const totalDisplay = document.getElementById('form-total');
                if (totalDisplay) totalDisplay.innerText = '$0.00';

                // Clear SKU Search
                const skuSearch = document.getElementById('sku-search');
                if (skuSearch) skuSearch.value = '';
                this.state.manualSaleSearch = '';

                // Reload data to reflect updated stock
                this.loadData();
            })
            .catch(error => {
                console.error("Error adding sale: ", error);
                this.showToast("❌ Error al registrar venta: " + (error.message || ''), "error");
            });
    },

    // --- CART & MULTI-ITEM SALES ---

    addToCart(sku, event) {
        if (event) event.stopPropagation();

        const item = this.state.inventory.find(i => i.sku === sku);
        if (!item) return;

        // Check if stock is sufficient
        const inCart = this.state.cart.filter(i => i.sku === sku).length;
        if (inCart >= item.stock) {
            this.showToast('⚠️ No hay más stock disponible');
            return;
        }

        this.state.cart.push(item);

        // If in Inventory view, ensure widget is rendered
        if (document.getElementById('inventory-cart-container')) {
            this.renderInventoryCart();
        } else {
            this.renderCartWidget();
        }

        this.showToast('Agregado al carrito');
    },

    removeFromCart(index) {
        this.state.cart.splice(index, 1);
        this.renderCartWidget();
    },

    clearCart() {
        this.state.cart = [];
        this.renderCartWidget();
    },
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
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Método Envío</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Pago</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado Envío</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                    <th class="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${onlineSales.map(s => {
            const date = s.timestamp?.toDate ? s.timestamp.toDate() : new Date(s.date || 0);
            return { ...s, _sortDate: date.getTime() };
        }).sort((a, b) => b._sortDate - a._sortDate).map(sale => {
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
                                        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${sale.id}')">
                                            <td class="px-6 py-4">
                                                <div class="font-mono text-sm font-bold text-brand-orange">${orderNumber}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-semibold text-brand-dark">${customer.name || (customer.firstName ? `${customer.firstName} ${customer.lastName || ''}` : '') || customer.stripe_info?.name || 'Cliente'}</div>
                                                <div class="text-xs text-slate-500">${customer.email || customer.stripe_info?.email || 'No email'}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-slate-600 truncate max-w-[200px]">
                                                    ${customer.shipping?.line1 || customer.address || customer.stripe_info?.shipping?.line1 || 'Sin dirección'}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm">
                                                    ${sale.shipping_method ? `
                                                        <div class="font-semibold text-brand-dark">${sale.shipping_method.method || 'Standard'}</div>
                                                        <div class="text-xs text-slate-500">DKK ${(sale.shipping_method.price || 0).toFixed(2)}</div>
                                                        ${sale.shipping_method.estimatedDays ? `<div class="text-[10px] text-slate-400">${sale.shipping_method.estimatedDays} días</div>` : ''}
                                                    ` : '<span class="text-xs text-slate-400">No especificado</span>'}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm">
                                                    <div class="font-medium capitalize text-xs">${sale.payment_method || sale.paymentMethod || 'card'}</div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark">DKK ${(sale.total_amount || sale.total || 0).toFixed(2)}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full border ${statusColors[sale.status] || 'bg-slate-50 text-slate-700'}">
                                                    ${statusLabels[sale.status] || sale.status}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${sale.fulfillment_status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    sale.fulfillment_status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                        sale.fulfillment_status === 'delivered' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-600'
                }">
                                                    ${(sale.fulfillment_status || 'pendiente').toUpperCase()}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-xs text-slate-600">
                                                    ${displayDate.toLocaleDateString('es-ES')}
                                                    <div class="text-[10px] text-slate-400">${displayDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-center" onclick="event.stopPropagation()">
                                                <button onclick="app.deleteSale('${sale.id}')" class="text-slate-300 hover:text-red-500 transition-colors" title="Eliminar Pedido">
                                                    <i class="ph-fill ph-trash"></i>
                                                </button>
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

    openOnlineSaleDetailModal(id) {
        const sale = this.state.sales.find(s => s.id === id);
        if (!sale) return;

        const customer = sale.customer || {};
        const stripeInfo = customer.stripe_info || {};
        const ship = customer.shipping || stripeInfo.shipping || {};

        // Robust address detection
        const addr = {
            line1: ship.line1 || customer.address || 'Sin dirección',
            line2: ship.line2 || '',
            city: ship.city || customer.city || '',
            postal: ship.postal_code || customer.postalCode || '',
            country: ship.country || customer.country || 'Denmark'
        };

        const addressHtml = `
            <p class="font-medium">${addr.line1}</p>
            ${addr.line2 ? `<p class="font-medium">${addr.line2}</p>` : ''}
            <p class="text-slate-500">${addr.postal} ${addr.city}</p>
            <p class="text-slate-500 font-bold mt-1 uppercase tracking-wider">${addr.country}</p>
        `;

        const html = `
        <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative animate-fadeIn flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <div class="text-xs font-bold text-brand-orange uppercase tracking-widest mb-1">Detalle del Pedido</div>
                        <h2 class="font-display text-2xl font-bold text-brand-dark line-clamp-1">${sale.orderNumber || 'Sin número de orden'}</h2>
                    </div>
                    <button onclick="document.getElementById('modal-overlay').remove()" class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                        <i class="ph-bold ph-x text-xl"></i>
                    </button>
                </div>

                <!-- Content -->
                <div class="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    
                    <!-- Top section: Status & Total -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado de Pago</p>
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full ${sale.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}"></span>
                                <span class="font-bold text-brand-dark capitalize">${sale.status === 'completed' ? 'Pagado' : sale.status}</span>
                            </div>
                        </div>
                        <div class="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                            <p class="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Envío</p>
                            <div class="font-bold text-orange-700 capitalize">${sale.fulfillment_status || 'pendiente'}</div>
                        </div>
                        <div class="bg-brand-dark p-4 rounded-2xl text-white">
                            <p class="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Total</p>
                            <div class="text-xl font-bold">DKK ${(sale.total_amount || sale.total || 0).toFixed(2)}</div>
                        </div>
                    </div>

                    <!-- Fulfillment Controls -->
                    <div class="space-y-4">
                         <h3 class="font-bold text-brand-dark flex items-center gap-2">
                            <i class="ph-fill ph-truck text-brand-orange"></i> Gestión de Envío
                        </h3>
                        <div class="flex flex-wrap gap-2">
                            <button onclick="app.updateFulfillmentStatus(event, '${sale.id}', 'preparing')" class="px-4 py-2 rounded-lg border ${sale.fulfillment_status === 'preparing' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} text-xs font-bold transition-all flex items-center gap-2">
                                <i class="ph ph-package"></i> Preparación
                            </button>
                            <button onclick="app.updateFulfillmentStatus(event, '${sale.id}', 'shipped')" class="px-4 py-2 rounded-lg border ${sale.fulfillment_status === 'shipped' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} text-xs font-bold transition-all flex items-center gap-2">
                                <i class="ph ph-paper-plane-tilt"></i> Enviado
                            </button>
                            <button onclick="app.updateFulfillmentStatus(event, '${sale.id}', 'delivered')" class="px-4 py-2 rounded-lg border ${sale.fulfillment_status === 'delivered' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} text-xs font-bold transition-all flex items-center gap-2">
                                <i class="ph ph-check-circle"></i> Entregado
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Customer Info -->
                        <div class="space-y-4">
                            <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                <i class="ph-fill ph-user-circle text-brand-orange"></i> Datos de Envío
                            </h3>
                            <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 text-sm">
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Destinatario</p>
                                    <p class="font-bold text-brand-dark text-base">${customer.name || (customer.firstName ? `${customer.firstName} ${customer.lastName || ''}` : '') || customer.stripe_info?.name || 'Cliente'}</p>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección</p>
                                    <div class="text-brand-dark space-y-0.5">
                                        ${addressHtml}
                                    </div>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Contacto</p>
                                    <p class="font-medium text-brand-dark">${customer.email || stripeInfo.email || 'Sin email'}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Payment & Metadata -->
                        <div class="space-y-4">
                            <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                <i class="ph-fill ph-credit-card text-brand-orange"></i> Detalles de Pago
                            </h3>
                            <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 text-sm text-brand-dark">
                                <div class="flex justify-between items-center pb-2 border-b border-slate-200/50">
                                    <span class="text-slate-500 text-xs">Método</span>
                                    <span class="font-bold capitalize">${sale.payment_method || sale.paymentMethod || 'card'}</span>
                                </div>
                                <div class="flex justify-between items-center pb-2 border-b border-slate-200/50">
                                    <span class="text-slate-500 text-xs">Fecha</span>
                                    <span class="font-bold">${new Date(sale.timestamp?.toDate ? sale.timestamp.toDate() : (sale.completed_at?.toDate ? sale.completed_at.toDate() : sale.date)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                                <div class="space-y-1">
                                    <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Stripe ID</span>
                                    <p class="font-mono text-[9px] break-all bg-white p-2 rounded border border-slate-200">${sale.paymentId || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Shipping Method Info (NEW) -->
                    <div class="space-y-4">
                        <h3 class="font-bold text-brand-dark flex items-center gap-2">
                            <i class="ph-fill ph-truck text-brand-orange"></i> Método de Envío
                        </h3>
                        <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 text-sm text-brand-dark">
                            ${sale.shipping_method ? `
                                <div class="flex justify-between items-center pb-2 border-b border-slate-200/50">
                                    <span class="text-slate-500 text-xs">Método</span>
                                    <span class="font-bold">${sale.shipping_method.method || 'Standard'}</span>
                                </div>
                                <div class="flex justify-between items-center pb-2 border-b border-slate-200/50">
                                    <span class="text-slate-500 text-xs">Costo</span>
                                    <span class="font-bold">DKK ${(sale.shipping_method.price || 0).toFixed(2)}</span>
                                </div>
                                ${sale.shipping_method.estimatedDays ? `
                                    <div class="flex justify-between items-center pb-2 border-b border-slate-200/50">
                                        <span class="text-slate-500 text-xs">Tiempo estimado</span>
                                        <span class="font-bold">${sale.shipping_method.estimatedDays} días</span>
                                    </div>
                                ` : ''}
                                ${sale.shipping_method.id ? `
                                    <div class="space-y-1">
                                        <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">ID Método</span>
                                        <p class="font-mono text-[9px] bg-white p-2 rounded border border-slate-200">${sale.shipping_method.id}</p>
                                    </div>
                                ` : ''}
                            ` : `
                                <div class="text-center py-4">
                                    <p class="text-slate-400 text-sm">No se especificó método de envío</p>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Order Items -->
                    <div class="space-y-4">
                        <h3 class="font-bold text-brand-dark flex items-center gap-2">
                            <i class="ph-fill ph-package text-brand-orange"></i> Items comprados
                        </h3>
                        <div class="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                            <table class="w-full text-sm">
                                <thead class="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                                    <tr>
                                        <th class="px-4 py-3 text-left">Producto</th>
                                        <th class="px-4 py-3 text-center">Cant.</th>
                                        <th class="px-4 py-3 text-right">Precio</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50">
                                    ${(sale.items || []).map(item => `
                                        <tr>
                                            <td class="px-4 py-3">
                                                <p class="font-bold text-brand-dark">${item.album || item.record?.album || 'Unknown'}</p>
                                                <p class="text-xs text-slate-500">${item.artist || item.record?.artist || ''}</p>
                                            </td>
                                            <td class="px-4 py-3 text-center font-medium">${item.quantity || 1}</td>
                                            <td class="px-4 py-3 text-right font-bold text-brand-dark">DKK ${(item.unitPrice || (item.record?.price || 0)).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Footer / Actions -->
                <div class="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                    <button onclick="window.print()" class="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                        <i class="ph-bold ph-printer"></i> Imprimir Packing Slip
                    </button>
                    <button onclick="document.getElementById('modal-overlay').remove()" class="flex-1 bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    renderCartWidget() {
        const widget = document.getElementById('cart-widget');
        if (!widget) return;

        const count = document.getElementById('cart-count');
        const list = document.getElementById('cart-items-mini');
        const totalEl = document.getElementById('cart-total-mini');

        if (this.state.cart.length === 0) {
            widget.classList.add('hidden');
            return;
        }

        widget.classList.remove('hidden');
        count.innerText = this.state.cart.length;

        const total = this.state.cart.reduce((sum, i) => sum + i.price, 0);
        totalEl.innerText = this.formatCurrency(total);

        list.innerHTML = this.state.cart.map((item, index) => `
                                                                <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                                                    <div class="truncate pr-2">
                                                                        <p class="font-bold text-xs text-brand-dark truncate">${item.album}</p>
                                                                        <p class="text-[10px] text-slate-500 truncate">${item.price} kr.</p>
                                                                    </div>
                                                                    <button onclick="app.removeFromCart(${index})" class="text-red-400 hover:text-red-600">
                                                                        <i class="ph-bold ph-x"></i>
                                                                    </button>
                                                                </div>
                                                                `).join('');
    },

    openCheckoutModal(prefillPayment, prefillChannel) {
        if (this.state.cart.length === 0) return;

        const total = this.state.cart.reduce((sum, i) => sum + i.price, 0);

        const modalHtml = `
            <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl transform scale-100 transition-all border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div class="flex justify-between items-center mb-8">
                        <div>
                            <h3 class="font-display text-2xl font-bold text-brand-dark">Registrar Venta</h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${this.state.cart.length} productos seleccionados</p>
                        </div>
                        <button onclick="document.getElementById('modal-overlay').remove()" class="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                            <i class="ph-bold ph-x text-xl"></i>
                        </button>
                    </div>

                    <div class="bg-slate-50/50 rounded-2xl p-5 mb-8 border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                        ${this.state.cart.map(item => `
                            <div class="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                                <span class="truncate pr-4 font-bold text-slate-700">${item.album}</span>
                                <span class="font-mono font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(item.price)}</span>
                            </div>
                        `).join('')}
                    </div>

                    <form onsubmit="app.handleCheckoutSubmit(event)" class="space-y-6">
                        <!-- Customer Info -->
                        <div class="bg-blue-50/30 p-5 rounded-2xl border border-blue-100 space-y-4">
                            <h4 class="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                <i class="ph-fill ph-user"></i> Información del Cliente
                            </h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <input name="customerName" placeholder="Nombre completo" class="w-full bg-white border border-blue-100 rounded-xl p-3 text-sm focus:border-blue-500 outline-none shadow-sm font-medium">
                                </div>
                                <div>
                                    <input name="customerEmail" type="email" placeholder="Email (opcional)" class="w-full bg-white border border-blue-100 rounded-xl p-3 text-sm focus:border-blue-500 outline-none shadow-sm font-medium">
                                </div>
                            </div>
                            <div class="flex items-center gap-3 bg-white/50 p-2 rounded-lg">
                                <input type="checkbox" name="requestInvoice" id="check-invoice-checkout" class="w-5 h-5 text-blue-600 rounded-lg border-blue-200 focus:ring-blue-500">
                                <label for="check-invoice-checkout" class="text-xs font-bold text-blue-700 cursor-pointer">Emitir factura electrónica</label>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Fecha de Venta</label>
                                <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}"
                                    class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-dark outline-none text-sm font-bold shadow-sm">
                            </div>
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Método de Pago</label>
                                <select name="paymentMethod" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-dark outline-none text-sm font-bold shadow-sm cursor-pointer">
                                    <option value="MobilePay" ${prefillPayment === 'MobilePay' ? 'selected' : ''}>MobilePay</option>
                                    <option value="Efectivo" ${prefillPayment === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                                    <option value="Tarjeta" ${prefillPayment === 'Tarjeta' ? 'selected' : ''}>Tarjeta</option>
                                    <option value="Transferencia" ${prefillPayment === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
                                    <option value="Discogs Payout" ${prefillPayment === 'Discogs Payout' ? 'selected' : ''}>Discogs Payout</option>
                                </select>
                            </div>
                        </div>

                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Canal de Venta</label>
                            <select name="soldAt" onchange="app.onCheckoutChannelChange(this.value)" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-dark outline-none text-sm font-bold shadow-sm cursor-pointer">
                                <option value="Tienda" ${prefillChannel === 'Tienda' ? 'selected' : ''}>Tienda Física</option>
                                <option value="Discogs" ${prefillChannel === 'Discogs' ? 'selected' : ''}>Discogs Marketplace</option>
                                <option value="Feria" ${prefillChannel === 'Feria' ? 'selected' : ''}>Feria / Pop-up</option>
                            </select>
                        </div>

                        <!-- Editable Final Price -->
                        <div class="bg-brand-dark p-6 rounded-3xl shadow-xl shadow-brand-dark/20 space-y-4">
                            <div class="flex items-center justify-between">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <i class="ph-fill ph-currency-circle-dollar text-emerald-500"></i> Total a Recibir
                                </label>
                                <span class="text-[10px] text-slate-500 font-bold uppercase">Precio Lista: ${this.formatCurrency(total)}</span>
                            </div>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold text-lg">kr.</span>
                                <input type="number" name="finalPrice" id="checkout-final-price" step="0.01" min="0" value="${total}"
                                    class="w-full pl-12 pr-4 py-4 bg-white/5 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-3xl font-display font-bold text-white text-center">
                            </div>
                            
                            <!-- Discogs Fee Display -->
                            <div id="discogs-fee-section" class="flex items-center justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/20 hidden">
                                <span class="text-[10px] font-bold text-red-400 flex items-center gap-2 uppercase tracking-wider">
                                    <i class="ph-fill ph-percent"></i> Discogs Fee (Auto)
                                </span>
                                <span id="discogs-fee-value" class="text-sm font-mono font-bold text-red-400">- kr. 0</span>
                            </div>
                        </div>

                        <button type="submit" class="w-full py-5 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 text-lg hover:scale-[1.01] active:scale-[0.99]">
                            <i class="ph-bold ph-check-circle"></i>
                            Confirmar Registro
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Store original total for fee calculation
        const originalTotal = total;

        // Add event listener to update total display and fee when price changes
        const priceInput = document.getElementById('checkout-final-price');
        const feeSection = document.getElementById('discogs-fee-section');
        const feeValue = document.getElementById('discogs-fee-value');

        const updateFeeDisplay = () => {
            const newTotal = parseFloat(priceInput.value) || 0;
            const fee = originalTotal - newTotal;

            document.getElementById('checkout-total-value').innerText = this.formatCurrency(newTotal);

            // Show fee section if there's a difference
            if (fee > 0) {
                feeSection.classList.remove('hidden');
                feeValue.innerText = `- kr.${fee.toFixed(0)} `;
            } else {
                feeSection.classList.add('hidden');
            }
        };

        priceInput.addEventListener('input', updateFeeDisplay);
    },

    onCheckoutChannelChange(channel) {
        // No additional action needed - fee section shows automatically when price differs
    },



    handleCheckoutSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Get the custom final price (for Discogs fees, etc.)
        const finalPrice = parseFloat(formData.get('finalPrice')) || 0;
        const originalTotal = this.state.cart.reduce((sum, i) => sum + i.price, 0);

        // Prepare Sale Data
        const saleData = {
            items: this.state.cart.map(item => ({
                recordId: item.id, // Assuming loaded items have 'id' from Prisma
                quantity: 1
            })),
            paymentMethod: formData.get('paymentMethod'),
            customerName: formData.get('customerName'),
            customerEmail: formData.get('customerEmail'),
            channel: formData.get('soldAt') || 'Tienda', // Add channel from form
            source: 'STORE', // Explicitly store sale
            // Custom pricing
            customTotal: finalPrice,
            originalTotal: originalTotal,
            feeDeducted: originalTotal - finalPrice // Track the fee difference
        };

        api.createSale(saleData)
            .then(() => {
                const channelMsg = saleData.channel === 'Discogs' ? ' (Discogs listing eliminado)' : '';
                const feeMsg = saleData.feeDeducted > 0 ? ` | Fee: ${this.formatCurrency(saleData.feeDeducted)} ` : '';
                this.showToast(`Venta de ${this.state.cart.length} items por ${this.formatCurrency(finalPrice)} registrada!${channelMsg}${feeMsg} `);
                this.clearCart();
                document.getElementById('modal-overlay').remove();
                this.loadData();
            })
            .catch(err => {
                console.error("Error checkout", err);
                alert("Error al procesar venta: " + err.message);
            });
    },


    handleSalesViewCheckout() {
        if (this.state.cart.length === 0) {
            this.showToast('El carrito está vacío');
            return;
        }

        const prefillPayment = document.getElementById('cart-payment')?.value;
        const prefillChannel = document.getElementById('cart-channel')?.value;

        this.openCheckoutModal(prefillPayment, prefillChannel);
    },

    async notifyPreparingDiscogs(saleId) {
        try {
            this.showToast('Enviando notificación "Preparando"...', 'info');
            await api.notifyPreparing(saleId);
            this.showToast('✅ Cliente notificado (Preparando Orden)');
            await this.loadData();
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error in notifyPreparingDiscogs:', error);
            this.showToast('❌ Error: ' + error.message, 'error');
        }
    },

    async notifyShippedDiscogs(saleId, inputId, linkInputId) {
        try {
            const trackingInput = document.getElementById(inputId);
            const trackingNumber = trackingInput ? trackingInput.value.trim() : '';

            const linkInput = linkInputId ? document.getElementById(linkInputId) : null;
            const trackingLink = linkInput ? linkInput.value.trim() : null;

            if (!trackingNumber) {
                this.showToast('⚠️ Ingresa un número de seguimiento', 'warning');
                return;
            }

            this.showToast('Enviando notificación de envío...', 'info');
            await api.notifyShipped(saleId, trackingNumber, trackingLink);
            this.showToast('✅ Cliente notificado y Tracking guardado');
            await this.loadData();
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error in notifyShippedDiscogs:', error);
            this.showToast('❌ Error: ' + error.message, 'error');
        }
    },

    async markDispatchedDiscogs(saleId) {
        try {
            if (!confirm('¿Marcar como despachado? Esto moverá la orden al historial.')) return;
            this.showToast('Marcando como despachado...', 'info');
            await api.markDispatched(saleId);
            this.showToast('✅ Orden despachada y archivada');
            await this.loadData();
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error in markDispatchedDiscogs:', error);
            this.showToast('❌ Error: ' + error.message, 'error');
        }
    },

    async notifyPickupReadyDiscogs(saleId) {
        try {
            this.showToast('Enviando notificación "Listo para Retirar"...', 'info');
            await api.notifyPickupReady(saleId);
            this.showToast('✅ Cliente notificado (Listo para Retirar)');
            await this.loadData();
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error in notifyPickupReadyDiscogs:', error);
            this.showToast('❌ Error: ' + error.message, 'error');
        }
    },

    async markPickedUpDiscogs(saleId) {
        try {
            if (!confirm('¿El cliente ya retiró el pedido? Esto moverá la orden al historial.')) return;
            this.showToast('Marcando como retirado...', 'info');
            await api.markPickedUp(saleId);
            this.showToast('✅ Orden retirada y archivada');
            await this.loadData();
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error in markPickedUpDiscogs:', error);
            this.showToast('❌ Error: ' + error.message, 'error');
        }
    },

    async deleteSale(id) {
        if (!confirm('¿Eliminar esta venta y restaurar stock?')) return;

        const sale = this.state.sales.find(s => s.id === id);
        if (!sale) {
            this.showToast('❌ Venta no encontrada', 'error');
            return;
        }

        try {
            const batch = db.batch();
            const saleRef = db.collection('sales').doc(id);
            batch.delete(saleRef);

            // Restore stock based on sale type
            if (sale.items && Array.isArray(sale.items)) {
                // Multi-item sale (both in-store and online)
                for (const item of sale.items) {
                    // Try to find product by multiple methods
                    const productId = item.productId || item.recordId;
                    const sku = item.sku || item.record?.sku;
                    const quantity = parseInt(item.quantity || item.qty) || 1;

                    let product = null;

                    // Method 1: Try finding by product/record ID (most reliable for online sales)
                    if (productId) {
                        try {
                            const productDoc = await db.collection('products').doc(productId).get();
                            if (productDoc.exists) {
                                product = { ref: productDoc.ref, data: productDoc.data() };
                            }
                        } catch (e) {
                            console.warn('Could not find product by ID:', productId);
                        }
                    }

                    // Method 2: Fallback to SKU search (for local sales)
                    if (!product && sku) {
                        product = await this.findProductBySku(sku);
                    }

                    if (product) {
                        batch.update(product.ref, {
                            stock: firebase.firestore.FieldValue.increment(quantity)
                        });
                    } else {
                        console.warn('Could not restore stock for item:', item);
                    }
                }
            } else if (sale.sku) {
                // Legacy single-item sale
                const product = await this.findProductBySku(sale.sku);
                if (product) {
                    const quantity = parseInt(sale.quantity) || 1;
                    batch.update(product.ref, {
                        stock: firebase.firestore.FieldValue.increment(quantity)
                    });
                }
            }

            await batch.commit();
            this.showToast('✅ Venta eliminada y stock restaurado');
            this.loadData();
        } catch (err) {
            console.error('Error deleting sale:', err);
            this.showToast('❌ Error al eliminar venta: ' + err.message, 'error');
        }
    },



    renderExpenses(container) {
        // Expense Categories with Types for VAT Logic
        const expenseCategories = [
            // Gastos Operativos (VAT deductible from SKAT)
            { value: 'alquiler', label: 'Alquiler', type: 'operativo' },
            { value: 'servicios', label: 'Servicios (internet, luz)', type: 'operativo' },
            { value: 'marketing', label: 'Marketing', type: 'operativo' },
            { value: 'envios', label: 'Envíos/Packaging', type: 'operativo' },
            { value: 'software', label: 'Software/Suscripciones', type: 'operativo' },
            { value: 'honorarios', label: 'Honorarios Profesionales', type: 'operativo' },
            { value: 'oficina', label: 'Material de Oficina', type: 'operativo' },
            { value: 'transporte', label: 'Transporte', type: 'operativo' },
            { value: 'otros_op', label: 'Otros Gastos Operativos', type: 'operativo' },
            // Stock purchases (trigger inventory ingest)
            { value: 'stock_nuevo', label: '📦 Stock: Vinilos NUEVOS (Distribuidor)', type: 'stock_nuevo' },
            { value: 'stock_usado', label: '📦 Stock: Vinilos USADOS (Particular/Brugtmoms)', type: 'stock_usado' },
        ];

        // Store categories globally for other functions to access
        window.expenseCategories = expenseCategories;

        const searchTerm = (this.state.expensesSearch || '').toLowerCase();
        const filteredExpenses = this.state.expenses.filter(e =>
            !searchTerm ||
            (e.description || e.proveedor || '').toLowerCase().includes(searchTerm) ||
            (e.category || e.categoria || '').toLowerCase().includes(searchTerm) ||
            (e.proveedor || '').toLowerCase().includes(searchTerm)
        );

        const html = `
    <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6" >
                <h2 class="font-display text-2xl font-bold text-brand-dark mb-6">
                    <i class="ph-duotone ph-file-text text-brand-orange mr-2"></i>
                    Registro de Compras
                </h2>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Form Panel -->
                    <div class="lg:col-span-1">
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 sticky top-4">
                            <h3 id="expense-form-title" class="font-bold text-lg mb-4 flex items-center gap-2">
                                <i class="ph-duotone ph-plus-circle text-brand-orange"></i>
                                Nueva Compra
                            </h3>
                            
                            <!-- File Upload Zone -->
                            <div class="mb-6">
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    Factura / Recibo
                                </label>
                                <div id="upload-zone" 
                                    onclick="document.getElementById('receipt-file').click()"
                                    class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-orange hover:bg-orange-50/30 transition-all group">
                                    <input type="file" id="receipt-file" accept="image/*,.pdf" class="hidden" onchange="app.handleReceiptUpload(this)">
                                    <div id="upload-placeholder">
                                        <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                                        <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                                            Subir Factura/Recibo
                                        </p>
                                        <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
                                    </div>
                                    <div id="upload-preview" class="hidden">
                                        <img id="receipt-preview-img" src="" alt="Preview" class="max-h-32 mx-auto rounded-lg shadow-sm mb-2">
                                        <p id="receipt-filename" class="text-xs text-slate-500 truncate"></p>
                                        <button type="button" onclick="event.stopPropagation(); app.clearReceiptUpload()" 
                                            class="mt-2 text-xs text-red-500 hover:text-red-600 font-medium">
                                            <i class="ph-bold ph-x"></i> Quitar
                                        </button>
                                    </div>
                                </div>
                                <input type="hidden" id="receipt-url" name="receiptUrl">
                            </div>

                            <form id="expense-form" onsubmit="app.handleExpenseSubmit(event)" class="space-y-4">
                                <input type="hidden" name="id" id="expense-id">
                                
                                <!-- Provider -->
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        Proveedor *
                                    </label>
                                    <input name="proveedor" id="expense-proveedor" required 
                                        placeholder="Nombre de tienda/empresa"
                                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none">
                                </div>

                                <!-- Invoice Date -->
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        Fecha de Factura *
                                    </label>
                                    <input type="date" name="fecha_factura" id="expense-fecha" required 
                                        value="${new Date().toISOString().split('T')[0]}"
                                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none">
                                </div>

                                <!-- Total Amount -->
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        Monto Total (DKK) *
                                    </label>
                                    <input type="number" name="monto_total" id="expense-monto" step="0.01" min="0" required
                                        placeholder="0.00"
                                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-lg font-bold">
                                </div>

                                <!-- VAT Amount -->
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        Monto IVA / Moms (DKK)
                                    </label>
                                    <input type="number" name="monto_iva" id="expense-iva" step="0.01" min="0" value="0"
                                        placeholder="0.00"
                                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none">
                                    <p class="text-[10px] text-slate-400 mt-1 italic">
                                        💡 Puede ser 0 si el proveedor es extranjero o particular
                                    </p>
                                </div>

                                <!-- Category -->
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        Categoría del Gasto *
                                    </label>
                                    <select name="categoria" id="expense-categoria" required
                                        onchange="app.handleExpenseCategoryChange(this)"
                                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none">
                                        <option value="" disabled selected>Seleccionar categoría...</option>
                                        ${expenseCategories.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                                    </select>
                                    <p id="category-warning" class="text-[10px] text-amber-600 mt-1 italic hidden">
                                        ⚠️ Los vinilos usados (Brugtmoms) no tienen IVA deducible.
                                    </p>
                                </div>

                                <!-- Description (Optional) -->
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        Notas / Descripción
                                    </label>
                                    <textarea name="descripcion" id="expense-descripcion" rows="2"
                                        placeholder="Detalles adicionales (opcional)"
                                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none resize-none"></textarea>
                                </div>

                                <!-- Buttons -->
                                <div class="flex gap-2 pt-2">
                                    <button type="submit" id="expense-submit-btn" 
                                        class="flex-1 py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                                        <i class="ph-bold ph-floppy-disk"></i>
                                        Guardar
                                    </button>
                                    <button type="button" id="expense-cancel-btn" onclick="app.resetExpenseForm()" 
                                        class="hidden px-4 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Expenses List -->
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                            <!-- Search -->
                            <div class="p-4 border-b border-orange-50">
                                <div class="relative">
                                    <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    <input type="text"
                                        value="${this.state.expensesSearch || ''}"
                                        oninput="app.state.expensesSearch = this.value; app.renderExpenses(document.getElementById('app-content'))"
                                        placeholder="Buscar por proveedor, categoría..."
                                        class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-orange">
                                </div>
                            </div>

                            <!-- Table -->
                            <div class="overflow-x-auto">
                                <table class="w-full text-left">
                                    <thead class="bg-orange-50/50 text-xs uppercase text-slate-500 font-medium">
                                        <tr>
                                            <th class="p-4">Fecha</th>
                                            <th class="p-4">Proveedor</th>
                                            <th class="p-4">Categoría</th>
                                            <th class="p-4 text-right">Total</th>
                                            <th class="p-4 text-right">IVA</th>
                                            <th class="p-4 text-center">Estado</th>
                                            <th class="p-4 w-20"></th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-orange-50">
                                        ${filteredExpenses.length > 0 ? filteredExpenses.map(e => `
                                            <tr class="hover:bg-orange-50/30 transition-colors group">
                                                <td class="p-4 text-xs text-slate-500 whitespace-nowrap">
                                                    ${this.formatDate(e.fecha_factura || e.date)}
                                                </td>
                                                <td class="p-4">
                                                    <p class="text-sm font-bold text-brand-dark">${e.proveedor || e.description || '-'}</p>
                                                    ${e.descripcion ? `<p class="text-xs text-slate-400 truncate max-w-[200px]">${e.descripcion}</p>` : ''}
                                                </td>
                                                <td class="p-4">
                                                    <span class="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                                        ${expenseCategories.find(c => c.value === (e.categoria || e.category))?.label || e.categoria || e.category || '-'}
                                                    </span>
                                                    ${(e.categoria === 'stock_nuevo' || e.categoria === 'stock_usado' || e.category === 'Inventario (compra de vinilos)') ? `
                                                        <button onclick="app.openInventoryIngest('${e.id}')" 
                                                            class="ml-2 text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded hover:bg-orange-600 transition-colors">
                                                            Ingresar Stock
                                                        </button>
                                                    ` : ''}
                                                </td>
                                                <td class="p-4 text-right font-bold text-brand-dark">
                                                    ${this.formatCurrency(e.monto_total || e.amount || 0)}
                                                </td>
                                                <td class="p-4 text-right text-sm ${(e.monto_iva || 0) > 0 ? 'text-green-600' : 'text-slate-400'}">
                                                    ${this.formatCurrency(e.monto_iva || 0)}
                                                </td>
                                                <td class="p-4 text-center">
                                                    ${e.receiptUrl ? `
                                                        <div class="relative inline-block group/preview">
                                                            <a href="${e.receiptUrl}" target="_blank" 
                                                                class="inline-flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors" 
                                                                title="Comprobante respaldado ✓">
                                                                <i class="ph-fill ph-paperclip text-lg"></i>
                                                                <i class="ph-fill ph-check-circle text-xs"></i>
                                                            </a>
                                                            <!-- Hover Preview Tooltip -->
                                                            <div class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 invisible group-hover/preview:opacity-100 group-hover/preview:visible transition-all duration-200 pointer-events-none">
                                                                <div class="bg-white rounded-xl shadow-2xl border border-slate-200 p-2 w-48">
                                                                    <img src="${e.receiptUrl}" alt="Preview" class="w-full h-32 object-cover rounded-lg mb-1" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                                                    <div class="hidden items-center justify-center h-32 bg-slate-100 rounded-lg">
                                                                        <i class="ph-duotone ph-file-pdf text-4xl text-red-500"></i>
                                                                    </div>
                                                                    <p class="text-[10px] text-slate-500 text-center font-medium">
                                                                        <i class="ph-bold ph-eye"></i> Click para abrir
                                                                    </p>
                                                                </div>
                                                                <div class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white -mt-px"></div>
                                                            </div>
                                                        </div>
                                                    ` : `
                                                        <span class="inline-flex items-center gap-1 text-red-500" title="⚠️ Sin comprobante - Peligro fiscal">
                                                            <i class="ph-fill ph-paperclip text-lg"></i>
                                                            <i class="ph-fill ph-warning text-xs"></i>
                                                        </span>
                                                    `}
                                                </td>
                                                <td class="p-4">
                                                    <div class="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onclick="app.editExpense('${e.id}')" 
                                                            class="text-slate-400 hover:text-brand-orange p-2 rounded-lg hover:bg-orange-50 transition-all" 
                                                            title="Editar">
                                                            <i class="ph-fill ph-pencil-simple"></i>
                                                        </button>
                                                        <button onclick="app.deleteExpense('${e.id}')" 
                                                            class="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all" 
                                                            title="Eliminar">
                                                            <i class="ph-fill ph-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="7" class="p-8 text-center text-slate-400 italic">
                                                    <i class="ph-duotone ph-receipt text-4xl mb-2 block opacity-30"></i>
                                                    No hay compras registradas
                                                </td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>

                            <!-- Summary -->
                            ${filteredExpenses.length > 0 ? `
                                <div class="p-4 bg-slate-50 border-t border-orange-100">
                                    <div class="flex justify-between items-center mb-3">
                                        <div class="flex items-center gap-4">
                                            <span class="text-xs text-slate-500">${filteredExpenses.length} registro(s)</span>
                                            <span class="text-xs text-slate-400">|</span>
                                            <span class="text-xs ${filteredExpenses.filter(e => e.receiptUrl).length === filteredExpenses.length ? 'text-green-600' : 'text-red-500'}">
                                                <i class="ph-fill ph-paperclip"></i>
                                                ${filteredExpenses.filter(e => e.receiptUrl).length}/${filteredExpenses.length} respaldados
                                            </span>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-xs text-slate-500">Total IVA Recuperable</p>
                                            <p class="text-lg font-bold text-green-600">
                                                ${this.formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.monto_iva || 0), 0))}
                                            </p>
                                        </div>
                                    </div>
                                    <!-- Export Button -->
                                    <button onclick="app.downloadReceiptsZip()" 
                                        class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm">
                                        <i class="ph-bold ph-file-zip"></i>
                                        Descargar Comprobantes del Mes (ZIP)
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
    `;
        container.innerHTML = html;
    },

    editExpense(id) {
        if (!confirm('¿Seguro que deseas editar esta compra?')) return;

        const expense = this.state.expenses.find(e => e.id === id);
        if (!expense) return;

        // Populate Form
        document.getElementById('expense-id').value = expense.id;
        document.getElementById('expense-proveedor').value = expense.proveedor || expense.description || '';
        document.getElementById('expense-fecha').value = expense.fecha_factura || (expense.date ? expense.date.split('T')[0] : '');
        document.getElementById('expense-monto').value = expense.monto_total || expense.amount || 0;
        document.getElementById('expense-iva').value = expense.monto_iva || 0;
        document.getElementById('expense-categoria').value = expense.categoria || expense.category || 'Otros';
        document.getElementById('expense-descripcion').value = expense.descripcion || '';

        // Trigger category change logic to set IVA field state (disabled if stock_usado)
        const catSelect = document.getElementById('expense-categoria');
        if (catSelect) {
            catSelect.value = expense.categoria || expense.category || '';
            this.handleExpenseCategoryChange(catSelect);
        }

        // Handle receipt preview if exists
        if (expense.receiptUrl) {
            document.getElementById('receipt-url').value = expense.receiptUrl;
            document.getElementById('upload-placeholder').classList.add('hidden');
            document.getElementById('upload-preview').classList.remove('hidden');
            document.getElementById('receipt-preview-img').src = expense.receiptUrl;
            document.getElementById('receipt-filename').textContent = 'Recibo guardado';
        }

        // Update UI State
        document.getElementById('expense-form-title').innerHTML = '<i class="ph-duotone ph-pencil-simple text-brand-orange"></i> Editar Compra';
        document.getElementById('expense-submit-btn').innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Actualizar';
        document.getElementById('expense-cancel-btn').classList.remove('hidden');
    },



    resetExpenseForm() {
        document.getElementById('expense-form').reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('expense-fecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('expense-iva').value = '0';
        document.getElementById('expense-form-title').innerHTML = '<i class="ph-duotone ph-plus-circle text-brand-orange"></i> Nueva Compra';
        document.getElementById('expense-submit-btn').innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Guardar';
        document.getElementById('expense-cancel-btn').classList.add('hidden');

        // Reset file upload
        document.getElementById('receipt-url').value = '';
        document.getElementById('receipt-file').value = '';
        document.getElementById('upload-placeholder').classList.remove('hidden');
        document.getElementById('upload-preview').classList.add('hidden');
        document.getElementById('receipt-preview-img').src = '';
        document.getElementById('receipt-filename').textContent = '';
    },

    handleExpenseSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const catValue = formData.get('categoria');
        const cat = (window.expenseCategories || []).find(c => c.value === catValue);

        const expenseData = {
            proveedor: formData.get('proveedor'),
            fecha_factura: formData.get('fecha_factura'),
            date: formData.get('fecha_factura'), // Dual field for query compatibility
            monto_total: parseFloat(formData.get('monto_total')) || 0,
            monto_iva: parseFloat(formData.get('monto_iva')) || 0,
            categoria: catValue,
            categoria_label: cat?.label || catValue,
            categoria_tipo: cat?.type || 'operativo',
            is_vat_deductible: cat?.type === 'operativo' || cat?.type === 'stock_nuevo',
            descripcion: formData.get('descripcion') || '',
            receiptUrl: document.getElementById('receipt-url').value || '',
            timestamp: new Date().toISOString()
        };

        const id = formData.get('id');
        if (id) {
            db.collection('expenses').doc(id).update(expenseData)
                .then(() => {
                    this.showToast('✅ Compra actualizada');
                    this.loadData();
                })
                .catch(err => console.error(err));
        } else {
            db.collection('expenses').add(expenseData)
                .then(() => {
                    this.showToast('✅ Compra registrada');
                    this.loadData();
                })
                .catch(err => console.error(err));
        }

        this.resetExpenseForm();
    },

    handleExpenseCategoryChange(select) {
        const value = select.value;
        const cat = (window.expenseCategories || []).find(c => c.value === value);
        const ivaInput = document.getElementById('expense-iva');
        const warning = document.getElementById('category-warning');

        if (cat?.type === 'stock_usado') {
            ivaInput.value = '0';
            ivaInput.disabled = true;
            ivaInput.classList.add('bg-slate-100', 'cursor-not-allowed');
            warning.classList.remove('hidden');
        } else {
            ivaInput.disabled = false;
            ivaInput.classList.remove('bg-slate-100', 'cursor-not-allowed');
            warning.classList.add('hidden');
        }
    },

    openInventoryIngest(expenseId) {
        const expense = this.state.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        // Open "Add Item" modal and pre-fill data if possible
        // For now, navigate to inventory and show prompt
        this.navigate('inventory');
        this.showToast('ℹ️ Usa "Añadir Disco" para ingresar el stock de esta compra.');

        // FUTURE: Automate this by passing expense data to the modal
    },

    deleteExpense(id) {
        const expense = this.state.expenses.find(e => e.id === id);

        // Check if expense has a receipt attached - require double confirmation
        if (expense?.receiptUrl) {
            // First confirmation
            if (!confirm('⚠️ ATENCIÓN: Este gasto tiene un recibo adjunto.\n\n¿Estás seguro de que quieres eliminarlo?')) {
                return;
            }

            // Second confirmation with legal warning
            if (!confirm('🔒 CONFIRMACIÓN LEGAL REQUERIDA\n\n' +
                'La ley exige guardar documentos contables durante 5 AÑOS.\n\n' +
                'Fecha del gasto: ' + (expense.fecha_factura || expense.date || 'Desconocida') + '\n' +
                'Proveedor: ' + (expense.proveedor || 'Sin nombre') + '\n' +
                'Monto: ' + this.formatCurrency(expense.monto_total || expense.amount || 0) + '\n\n' +
                '¿CONFIRMAS que deseas eliminar permanentemente este registro y su recibo?')) {
                this.showToast('ℹ️ Eliminación cancelada');
                return;
            }
        } else {
            // Single confirmation for expenses without receipt
            if (!confirm('¿Eliminar esta compra?')) return;
        }

        db.collection('expenses').doc(id).delete()
            .then(() => {
                this.showToast('✅ Compra eliminada');
                this.loadData();
            })
            .catch(err => console.error(err));
    },

    // Download all receipts from current month as ZIP
    async downloadReceiptsZip() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed

        // Filter expenses for current month that have receipts
        const monthExpenses = this.state.expenses.filter(e => {
            const expenseDate = new Date(e.fecha_factura || e.date);
            return expenseDate.getFullYear() === currentYear &&
                expenseDate.getMonth() === currentMonth &&
                e.receiptUrl;
        });

        if (monthExpenses.length === 0) {
            this.showToast('ℹ️ No hay comprobantes con recibo este mes');
            return;
        }

        // Show progress
        this.showToast(`📦 Preparando ZIP con ${monthExpenses.length} comprobantes...`);

        try {
            const zip = new JSZip();
            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            const folderName = `Comprobantes_${currentYear}_${String(currentMonth + 1).padStart(2, '0')}_${monthNames[currentMonth]}`;
            const folder = zip.folder(folderName);

            // Create index/summary file
            let indexContent = `RESUMEN DE COMPROBANTES - ${monthNames[currentMonth]} ${currentYear}\n`;
            indexContent += `${'='.repeat(50)}\n\n`;
            indexContent += `Generado: ${now.toLocaleString('es-ES')}\n`;
            indexContent += `Total comprobantes: ${monthExpenses.length}\n`;
            indexContent += `Total gastos: ${this.formatCurrency(monthExpenses.reduce((sum, e) => sum + (e.monto_total || e.amount || 0), 0))}\n`;
            indexContent += `Total IVA: ${this.formatCurrency(monthExpenses.reduce((sum, e) => sum + (e.monto_iva || 0), 0))}\n\n`;
            indexContent += `${'='.repeat(50)}\n\n`;
            indexContent += `DETALLE:\n\n`;

            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < monthExpenses.length; i++) {
                const expense = monthExpenses[i];
                const expenseDate = new Date(expense.fecha_factura || expense.date);
                const dateStr = expenseDate.toISOString().split('T')[0];

                // Sanitize provider name
                const proveedor = (expense.proveedor || 'SinNombre')
                    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
                    .replace(/\s+/g, '-')
                    .substring(0, 20)
                    .trim();

                const monto = Math.round(expense.monto_total || expense.amount || 0);

                // Try to determine file extension from URL
                let ext = 'jpg';
                if (expense.receiptUrl.includes('.pdf')) ext = 'pdf';
                else if (expense.receiptUrl.includes('.png')) ext = 'png';

                const filename = `${String(i + 1).padStart(3, '0')}_${dateStr}_${proveedor}_${monto}DKK.${ext}`;

                try {
                    // Fetch the file
                    const response = await fetch(expense.receiptUrl);
                    if (!response.ok) throw new Error('Fetch failed');
                    const blob = await response.blob();
                    folder.file(filename, blob);
                    successCount++;

                    // Add to index
                    indexContent += `${String(i + 1).padStart(3, '0')}. ${dateStr} | ${proveedor}\n`;
                    indexContent += `    Total: ${this.formatCurrency(expense.monto_total || expense.amount || 0)} | IVA: ${this.formatCurrency(expense.monto_iva || 0)}\n`;
                    indexContent += `    Archivo: ${filename}\n\n`;

                } catch (err) {
                    console.warn(`Could not fetch receipt for ${expense.proveedor}:`, err);
                    errorCount++;
                    indexContent += `${String(i + 1).padStart(3, '0')}. ${dateStr} | ${proveedor} - ⚠️ ERROR: No se pudo descargar\n\n`;
                }
            }

            // Add index file
            folder.file('_INDICE.txt', indexContent);

            // Generate and download ZIP
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            const zipFilename = `${folderName}.zip`;
            saveAs(content, zipFilename);

            if (errorCount > 0) {
                this.showToast(`⚠️ ZIP generado: ${successCount} OK, ${errorCount} con error`);
            } else {
                this.showToast(`✅ ZIP descargado: ${successCount} comprobantes`);
            }

        } catch (error) {
            console.error('ZIP generation error:', error);
            this.showToast('❌ Error al generar ZIP');
        }
    },

    // File upload handlers for expense receipts
    async handleReceiptUpload(input) {
        const file = input.files[0];
        if (!file) return;

        const placeholder = document.getElementById('upload-placeholder');
        const preview = document.getElementById('upload-preview');
        const previewImg = document.getElementById('receipt-preview-img');
        const filename = document.getElementById('receipt-filename');
        const receiptUrl = document.getElementById('receipt-url');

        // Show loading state
        placeholder.innerHTML = '<i class="ph-duotone ph-spinner text-4xl text-brand-orange animate-spin mb-2"></i><p class="text-sm text-slate-500">Subiendo...</p>';

        try {
            // Store original file temporarily for OCR
            this._pendingReceiptFile = file;
            this._pendingReceiptOriginalName = file.name;

            // Get file extension
            const ext = file.name.split('.').pop().toLowerCase();

            // Generate structured filename and path
            const { structuredPath, structuredFilename } = this.generateReceiptPath(ext);

            // Create storage reference with structured path
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(structuredPath);

            // Upload file directly to Firebase Storage
            await fileRef.put(file);
            const url = await fileRef.getDownloadURL();

            // Update hidden inputs
            receiptUrl.value = url;

            // Store structured path for later update
            document.getElementById('receipt-url').dataset.structuredPath = structuredPath;
            document.getElementById('receipt-url').dataset.structuredFilename = structuredFilename;

            // Show preview
            if (file.type.startsWith('image/')) {
                previewImg.src = URL.createObjectURL(file);
                previewImg.classList.remove('hidden');
            } else if (file.type === 'application/pdf') {
                previewImg.src = '';
                previewImg.classList.add('hidden');

                const existingIcon = previewImg.parentNode.querySelector('.ph-file-pdf');
                if (existingIcon) existingIcon.remove();

                const pdfIcon = document.createElement('i');
                pdfIcon.className = 'ph-duotone ph-file-pdf text-6xl text-red-500 mb-2 block mx-auto';
                previewImg.parentNode.insertBefore(pdfIcon, previewImg);
            }

            filename.textContent = structuredFilename;
            placeholder.classList.add('hidden');
            preview.classList.remove('hidden');

            // Restore placeholder content for future use
            placeholder.innerHTML = `
                <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                    Subir Factura/Recibo
                </p>
                <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
            `;

            this.showToast('✅ Archivo subido - procesando OCR...');

            // Process OCR after upload (Background process - NO AWAIT)
            this.processReceiptOCR(url);

        } catch (error) {
            console.error('Upload error details:', error);
            // Show explicit error to help debugging
            alert('Error al subir: ' + error.message);

            placeholder.innerHTML = `
                <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                    Subir Factura/Recibo
                </p>
                <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
            `;
            this.showToast('❌ Error: ' + error.message);
        }
    },

    // Generate structured path for receipt files
    // Format: receipts/YYYY-MM-DD_Proveedor_Monto_ID.ext
    generateReceiptPath(ext) {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();

            // Get form values if available (for better naming)
            const proveedor = document.getElementById('expense-proveedor')?.value || 'Proveedor';
            const monto = document.getElementById('expense-monto')?.value || '0';

            // Sanitize provider name (remove special chars, limit length)
            const sanitizedProveedor = proveedor
                .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 20)
                .trim() || 'Proveedor';

            // Format amount
            const formattedMonto = Math.round(parseFloat(monto) || 0) + 'dkk';

            // Generate unique ID (5 chars)
            const uniqueId = Math.random().toString(36).substring(2, 7).toUpperCase();

            // Build filename: YYYY-MM-DD_Proveedor_Monto_ID.ext
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const structuredFilename = `${dateStr}_${sanitizedProveedor}_${formattedMonto}_${uniqueId}.${ext}`;

            // We use 'receipts/' as root to ensure we have permission, but keep structured name
            const structuredPath = `receipts/${structuredFilename}`;

            console.log('📁 Structured Receipt Path:', structuredPath);

            return { structuredPath, structuredFilename };
        } catch (err) {
            console.error('Error in generateReceiptPath:', err);
            // Fallback to simple unique name if anything fails
            const fallbackName = `receipt_${Date.now()}.${ext}`;
            return { structuredPath: `receipts/${fallbackName}`, structuredFilename: fallbackName };
        }
    },

    // OCR Processing for receipts
    async processReceiptOCR(fileUrl) {
        try {
            // Show OCR processing indicator
            const formTitle = document.getElementById('expense-form-title');
            const originalTitle = formTitle.innerHTML;
            formTitle.innerHTML = '<i class="ph-duotone ph-scan text-brand-orange animate-pulse"></i> Escaneando recibo...';

            // Prepare form data for OCR.space API
            const formData = new FormData();
            formData.append('url', fileUrl);
            formData.append('language', 'dan'); // Danish
            formData.append('isOverlayRequired', 'false');
            formData.append('OCREngine', '2'); // Engine 2 is better for receipts
            formData.append('scale', 'true');
            formData.append('isTable', 'false'); // Changed to false as it sometimes causes issues with simple receipts

            // Call OCR.space API
            const response = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: {
                    'apikey': OCR_API_KEY
                },
                body: formData
            });

            const result = await response.json();

            if (result.IsErroredOnProcessing) {
                throw new Error(result.ErrorMessage || 'OCR processing failed');
            }

            // Extract text from result
            const extractedText = result.ParsedResults?.[0]?.ParsedText || '';
            console.log('OCR Raw Text:', extractedText);

            // Parse extracted data
            const extractedData = this.parseReceiptText(extractedText);

            // Auto-fill form with extracted data
            this.autoFillExpenseForm(extractedData);

            // Restore title with success indicator
            formTitle.innerHTML = '<i class="ph-duotone ph-check-circle text-green-500"></i> Datos extraídos - verifica';

            // Show appropriate toast based on extraction success
            const fieldsFound = Object.values(extractedData).filter(v => v).length;
            if (fieldsFound >= 3) {
                this.showToast('✨ Datos extraídos correctamente');
            } else if (fieldsFound > 0) {
                this.showToast('⚠️ Algunos datos extraídos - completa manualmente');
            } else {
                this.showToast('ℹ️ No se detectaron datos - ingresa manualmente');
                formTitle.innerHTML = originalTitle;
            }

        } catch (error) {
            console.error('OCR Error:', error);
            this.showToast('⚠️ OCR no disponible - ingresa datos manualmente');
            // Restore original title
            const formTitle = document.getElementById('expense-form-title');
            formTitle.innerHTML = '<i class="ph-duotone ph-plus-circle text-brand-orange"></i> Nueva Compra';
        }
    },

    // Convert file to base64 for OCR API
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // Parse text extracted from receipt to find key data
    parseReceiptText(text) {
        const data = {
            fecha: null,
            proveedor: null,
            monto_total: null,
            monto_iva: null
        };

        // Normalize text
        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

        // Extract Date - multiple formats
        const datePatterns = [
            /(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/,           // DD/MM/YYYY or DD-MM-YYYY
            /(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2})/,             // YYYY-MM-DD
            /(\d{1,2}\.\s?\w+\.?\s?\d{2,4})/i                   // DD. Month YYYY
        ];

        for (const pattern of datePatterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                data.fecha = this.normalizeDate(match[1]);
                break;
            }
        }

        // Extract Total Amount - Danish and international formats
        const totalPatterns = [
            /(?:i\s*alt|total|sum|totalt|att\s*betala)[:\s]*(\d+[.,]\d{2})/i,
            /(?:total|sum)[:\s]*(?:kr\.?|dkk)?\s*(\d+[.,]\d{2})/i,
            /(\d+[.,]\d{2})\s*(?:dkk|kr)/i
        ];

        for (const pattern of totalPatterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                data.monto_total = parseFloat(match[1].replace(',', '.'));
                break;
            }
        }

        // Extract VAT/Moms - Danish tax (25%)
        const vatPatterns = [
            /(?:moms|25%|heraf\s*moms)[:\s]*(\d+[.,]\d{2})/i,
            /(?:vat|iva|tax)[:\s]*(\d+[.,]\d{2})/i,
            /moms\s*(?:kr\.?|dkk)?\s*(\d+[.,]\d{2})/i
        ];

        for (const pattern of vatPatterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                data.monto_iva = parseFloat(match[1].replace(',', '.'));
                break;
            }
        }

        // If total found but no VAT, calculate 25% Danish VAT
        if (data.monto_total && !data.monto_iva) {
            // Calculate VAT as 25% of net (total = net + 25% of net)
            // So VAT = total * 0.2 (since total = net * 1.25)
            data.monto_iva = Math.round((data.monto_total * 0.2) * 100) / 100;
        }

        // Extract Provider name - usually first meaningful line
        // Skip common receipt headers
        const skipWords = ['kvittering', 'receipt', 'bon', 'faktura', 'invoice', 'kopi', 'copy'];
        for (const line of lines.slice(0, 5)) {
            const cleanLine = line.trim();
            if (cleanLine.length > 2 &&
                cleanLine.length < 50 &&
                !skipWords.some(w => cleanLine.toLowerCase().includes(w)) &&
                !/^\d+$/.test(cleanLine) &&
                !/^[\d\s\-\/\.]+$/.test(cleanLine)) {
                data.proveedor = cleanLine;
                break;
            }
        }

        // Alternative: Look for CVR number line and get company name before/after
        const cvrMatch = normalizedText.match(/(?:cvr|org\.?\s*nr)[:\s]*(\d{8})/i);
        if (cvrMatch && lines.length > 0) {
            const cvrLineIndex = lines.findIndex(l => l.includes(cvrMatch[0]));
            if (cvrLineIndex > 0 && !data.proveedor) {
                data.proveedor = lines[cvrLineIndex - 1];
            }
        }

        console.log('Parsed Receipt Data:', data);
        return data;
    },

    // Normalize various date formats to YYYY-MM-DD
    normalizeDate(dateStr) {
        try {
            // Clean the string
            const cleaned = dateStr.replace(/\s/g, '').replace(/[\.\/]/g, '-');
            const parts = cleaned.split('-');

            if (parts.length >= 3) {
                let day, month, year;

                // Check if first part looks like a year (4 digits)
                if (parts[0].length === 4) {
                    // YYYY-MM-DD format
                    [year, month, day] = parts;
                } else {
                    // DD-MM-YYYY format
                    [day, month, year] = parts;
                    // Handle 2-digit years
                    if (year.length === 2) {
                        year = '20' + year;
                    }
                }

                // Pad with zeros if needed
                day = day.padStart(2, '0');
                month = month.padStart(2, '0');

                return `${year}-${month}-${day}`;
            }
        } catch (e) {
            console.warn('Date normalization failed:', dateStr);
        }
        return null;
    },

    // Auto-fill expense form with extracted data
    autoFillExpenseForm(data) {
        // Fill date
        if (data.fecha) {
            const fechaInput = document.getElementById('expense-fecha');
            if (fechaInput) {
                fechaInput.value = data.fecha;
                this.highlightAutoFilled(fechaInput);
            }
        }

        // Fill provider
        if (data.proveedor) {
            const proveedorInput = document.getElementById('expense-proveedor');
            if (proveedorInput) {
                proveedorInput.value = data.proveedor;
                this.highlightAutoFilled(proveedorInput);
            }
        }

        // Fill total amount
        if (data.monto_total) {
            const montoInput = document.getElementById('expense-monto');
            if (montoInput) {
                montoInput.value = data.monto_total.toFixed(2);
                this.highlightAutoFilled(montoInput);
            }
        }

        // Fill VAT
        if (data.monto_iva) {
            const ivaInput = document.getElementById('expense-iva');
            if (ivaInput && !ivaInput.disabled) {
                ivaInput.value = data.monto_iva.toFixed(2);
                this.highlightAutoFilled(ivaInput);
            }
        }
    },

    // Visual feedback for auto-filled fields
    highlightAutoFilled(input) {
        input.classList.add('ring-2', 'ring-green-400', 'bg-green-50');
        // Remove highlight after 5 seconds or on focus
        const removeHighlight = () => {
            input.classList.remove('ring-2', 'ring-green-400', 'bg-green-50');
            input.removeEventListener('focus', removeHighlight);
        };
        input.addEventListener('focus', removeHighlight);
        setTimeout(removeHighlight, 5000);
    },

    clearReceiptUpload() {
        document.getElementById('receipt-file').value = '';
        document.getElementById('receipt-url').value = '';
        document.getElementById('upload-placeholder').classList.remove('hidden');
        document.getElementById('upload-preview').classList.add('hidden');
        document.getElementById('receipt-preview-img').src = '';
        document.getElementById('receipt-filename').textContent = '';
    },

    renderConsignments(container) {
        if (!container) return;

        const html = `
    <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6 animate-fadeIn" >
                                                                    <div class="flex justify-between items-center mb-8">
                                                                        <h2 class="font-display text-2xl font-bold text-brand-dark">Socios y Consignación</h2>
                                                                        <button onclick="app.openAddConsignorModal()" class="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                                            <i class="ph-bold ph-plus"></i>
                                                                            Nuevo Socio
                                                                        </button>
                                                                    </div>

                                                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        ${this.state.consignors.map(c => {
            // Stats
            const partnerName = c.name;
            const partnerItems = this.state.inventory.filter(i => i.owner === partnerName);
            const inStockCount = partnerItems.reduce((acc, curr) => acc + curr.stock, 0);

            // Comprehensive Item Extraction for this partner (supporting multi-item sales)
            const soldItems = [];
            this.state.sales.forEach(s => {
                const partnerRelatedItems = (s.items || []).filter(item => {
                    if ((item.owner || '').toLowerCase() === partnerName.toLowerCase()) return true;
                    const product = this.state.inventory.find(p => p.id === (item.productId || item.recordId));
                    return product && (product.owner || '').toLowerCase() === partnerName.toLowerCase();
                });

                partnerRelatedItems.forEach(item => {
                    const price = Number(item.priceAtSale || item.unitPrice || 0);
                    const split = c.agreementSplit || c.split || 70;
                    const calculatedCost = (price * split) / 100;

                    soldItems.push({
                        ...item,
                        id: s.id,
                        date: s.date,
                        cost: item.costAtSale || item.cost || calculatedCost, // Owed to partner
                        payoutStatus: s.payoutStatus || 'pending',
                        payoutDate: s.payoutDate || null
                    });
                });

                // Legacy fallback for sales without items array
                if ((!s.items || s.items.length === 0) && (s.owner || '').toLowerCase() === partnerName.toLowerCase()) {
                    soldItems.push({
                        ...s,
                        album: s.album || s.sku || 'Record',
                        cost: s.cost || ((Number(s.total) || 0) * (c.agreementSplit || 70) / 100)
                    });
                }
            });

            soldItems.sort((a, b) => new Date(b.date) - new Date(a.date));
            const totalSold = soldItems.reduce((acc, curr) => acc + (Number(curr.qty || curr.quantity) || 1), 0);

            // Financials
            const totalDue = soldItems.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
            const alreadyPaid = soldItems.filter(s => s.payoutStatus === 'paid').reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
            const pendingPay = totalDue - alreadyPaid;

            return `
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div class="flex justify-between items-start mb-6">
                                <div>
                                    <h3 class="font-display text-xl font-bold text-brand-dark">${c.name}</h3>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">${c.agreementSplit || c.split || 70}% Acuerdo</span>
                                    </div>
                                </div>
                                <button onclick="app.deleteConsignor('${c.id}')" class="text-slate-300 hover:text-red-400 transition-colors">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Stock Actual</p>
                                    <p class="font-display font-bold text-xl text-brand-dark">${inStockCount}</p>
                                </div>
                                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Pendiente Pago</p>
                                    <p class="font-display font-bold text-xl ${pendingPay > 0 ? 'text-brand-orange' : 'text-slate-500'}">${this.formatCurrency(pendingPay)}</p>
                                </div>
                            </div>

                            <div class="border-t border-slate-100 pt-4">
                                <div class="flex justify-between items-center mb-4">
                                    <h4 class="font-bold text-sm text-brand-dark">Historial de Ventas</h4>
                                    <span class="text-xs text-slate-500 font-medium">Pagado: ${this.formatCurrency(alreadyPaid)}</span>
                                </div>
                                <div class="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                    ${soldItems.length > 0 ? soldItems.map(s => `
                                        <div class="flex items-center justify-between p-3 rounded-xl border ${s.payoutStatus === 'paid' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-orange-100 shadow-sm'} transition-all">
                                            <div class="flex-1 min-w-0 pr-3">
                                                <div class="font-bold text-xs truncate text-brand-dark">${s.album || s.sku}</div>
                                                <div class="text-[10px] text-slate-400">${this.formatDate(s.date)} • ${this.formatCurrency(s.cost)}</div>
                                                ${s.payoutStatus === 'paid' && s.payoutDate
                    ? `<div class="text-[9px] text-green-600 font-bold mt-0.5"><i class="ph-bold ph-check"></i> Pagado: ${this.formatDate(s.payoutDate)}</div>`
                    : ''}
                                            </div>
                                            <button 
                                                onclick="app.togglePayoutStatus('${s.id}', '${s.payoutStatus || 'pending'}')"
                                                class="shrink-0 h-8 px-3 rounded-lg text-[10px] font-bold border transition-colors ${s.payoutStatus === 'paid'
                    ? 'bg-slate-200 border-slate-300 text-slate-500 hover:bg-slate-300'
                    : 'bg-green-100 border-green-200 text-green-700 hover:bg-green-200'
                }"
                                            >
                                                ${s.payoutStatus === 'paid' ? 'PAGADO' : 'PAGAR'}
                                            </button>
                                        </div>
                                    `).join('') : '<div class="text-center py-4 text-xs text-slate-400 italic">No hay ventas registradas</div>'}
                                </div>
                            </div>
                        </div>
                        `;
        }).join('')}
                                                                        ${this.state.consignors.length === 0 ? `
                        <div class="col-span-full text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <i class="ph-bold ph-users text-3xl"></i>
                            </div>
                            <h3 class="text-lg font-bold text-brand-dark mb-2">No hay socios registrados</h3>
                            <p class="text-slate-500 mb-6 max-w-md mx-auto">Agrega socios para gestionar ventas en consignación y calcular pagos automáticamente.</p>
                            <button onclick="app.openAddConsignorModal()" class="text-brand-orange font-bold hover:underline">Agregar primer socio</button>
                        </div>
                    ` : ''}
                                                                    </div>
                                                                </div>
    `;
        container.innerHTML = html;
    },

    togglePayoutStatus(saleId, currentStatus) {
        if (!confirm(`¿Marcar esta venta como ${currentStatus === 'paid' ? 'PENDIENTE' : 'PAGADA'}?`)) return;

        const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
        const updateData = { payoutStatus: newStatus };

        if (newStatus === 'paid') {
            updateData.payoutDate = new Date().toISOString();
        } else {
            updateData.payoutDate = null;
        }

        // TODO: Migrate to API
        console.warn('updateSaleStatus not yet migrated to API');
        this.showToast('Esta función aún no está migrada al nuevo backend');
    },

    openAddConsignorModal() {
        const modalHtml = `
    <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" >
        <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform scale-100 transition-all border border-orange-100">
            <h3 class="font-display text-xl font-bold mb-4 text-brand-dark">Nuevo Socio</h3>
            <form onsubmit="app.handleAddConsignor(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre y Apellido</label>
                    <input name="name" required class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Porcentaje del Socio (%)</label>
                    <input name="split" type="number" min="0" max="100" value="70" required class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                        <p class="text-[10px] text-slate-400 mt-1">El porcentaje de la venta que se queda el dueño del vinilo.</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Email (Opcional)</label>
                        <input name="email" type="email" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono (Opcional)</label>
                        <input name="phone" type="tel" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                    </div>
                </div>
                <div class="pt-4 flex gap-3">
                    <button type="button" onclick="document.getElementById('modal-overlay').remove()" class="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors">Cancelar</button>
                    <button type="submit" class="flex-1 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold transition-colors">Guardar</button>
                </div>
            </form>
        </div>

`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    handleAddConsignor(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newConsignor = {
            name: formData.get('name'),
            agreementSplit: parseFloat(formData.get('split')),
            email: formData.get('email'),
            phone: formData.get('phone')
        };

        db.collection('consignors').add(newConsignor)
            .then(() => {
                this.showToast('✅ Socio registrado correctamente');
                document.getElementById('modal-overlay').remove();
                this.loadData();
            })
            .catch(err => {
                console.error(err);
                this.showToast('❌ Error al crear socio: ' + err.message, 'error');
            });
    },

    deleteConsignor(id) {
        if (!confirm('¿Eliminar este socio?')) return;
        db.collection('consignors').doc(id).delete()
            .then(() => {
                this.showToast('✅ Socio eliminado');
                this.loadData();
            })
            .catch(err => {
                console.error(err);
                this.showToast('❌ Error al eliminar socio: ' + err.message, 'error');
            });
    },

    saveData() {
        try {
            const settings = {};
            localStorage.setItem('el-cuartito-settings', JSON.stringify(settings));
        } catch (e) {
            console.error("Error saving settings:", e);
        }
    },



    // --- Discogs Integration (Restored) ---
    searchDiscogs() {
        const query = document.getElementById('discogs-search-input').value;
        const resultsContainer = document.getElementById('discogs-results');
        if (!query) return;

        resultsContainer.innerHTML = '<p class="text-xs text-slate-400 animate-pulse p-2">Buscando en Discogs...</p>';
        resultsContainer.classList.remove('hidden');

        // Check if query is numeric (Direct ID)
        if (/^\d+$/.test(query.trim())) {
            this.fetchDiscogsById(query.trim());
            return;
        }

        fetch(`${BASE_API_URL}/discogs/search?q=${encodeURIComponent(query)}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Error ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                // Backend proxy returns { success: true, results: [...] }
                const results = data.results || [];
                if (results.length > 0) {
                    resultsContainer.innerHTML = results.slice(0, 10).map(r => `
                        <div onclick='app.handleDiscogsSelection(${JSON.stringify(r).replace(/'/g, "&#39;")})' class="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-brand-orange hover:shadow-sm transition-all">
                            <img src="${r.thumb || 'logo.jpg'}" class="w-12 h-12 rounded object-cover bg-slate-100 flex-shrink-0">
                            <div class="flex-1 min-w-0">
                                <p class="font-bold text-xs text-brand-dark leading-tight mb-1">${r.title}</p>
                                <p class="text-[10px] text-slate-500">${r.year || '?'} · ${r.format ? r.format.join(', ') : 'Vinyl'} · ${r.country || ''}</p>
                                <p class="text-[10px] text-slate-400">${r.label ? r.label[0] : ''}</p>
                            </div>
                            <i class="ph-bold ph-plus-circle text-brand-orange text-lg flex-shrink-0"></i>
                        </div>
                    `).join('');
                } else {
                    resultsContainer.innerHTML = '<p class="text-xs text-slate-400 p-2">No se encontraron resultados.</p>';
                }
            })
            .catch(err => {
                console.error(err);
                resultsContainer.innerHTML = `
                    <div class="text-center py-4 px-3">
                        <p class="text-xs text-red-500 font-bold mb-2">❌ ${err.message}</p>
                        <p class="text-[10px] text-slate-400">Hubo un error al buscar en Discogs a través del servidor.</p>
                    </div>
                `;
            });
    },

    resyncMusic() {
        // Clear stored IDs
        ['input-discogs-id', 'input-discogs-release-id', 'input-discogs-url', 'input-cover-image'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        // Populate search input with current Artist + Album
        const artist = document.querySelector('input[name="artist"]').value;
        const album = document.querySelector('input[name="album"]').value;
        const searchInput = document.getElementById('discogs-search-input');

        if (searchInput && artist && album) {
            searchInput.value = `${artist} - ${album}`;
            this.searchDiscogs();
            this.showToast('✅ Música desvinculada. Selecciona una nueva edición.', 'success');
        } else {
            this.showToast('⚠️ Falta Artista o Álbum para buscar.', 'error');
        }
    },

    handleDiscogsSelection(release) {
        const parts = release.title.split(' - ');
        const artist = parts[0] || '';
        const album = parts.slice(1).join(' - ') || release.title;

        const form = document.querySelector('#modal-overlay form');
        if (!form) return;

        // Set basic info immediately from search result
        if (form.artist) form.artist.value = artist;
        if (form.album) form.album.value = album;
        if (form.year && release.year) form.year.value = release.year;

        // Set Label from search result
        if (form.label && release.label && release.label.length > 0) {
            form.label.value = release.label[0];
        }

        // Set Image from search result
        if (release.thumb || release.cover_image) {
            const imgUrl = release.cover_image || release.thumb;
            const input = document.getElementById('input-cover-image');
            const preview = document.getElementById('cover-preview');
            if (input) input.value = imgUrl;
            if (preview) {
                preview.querySelector('img').src = imgUrl;
                preview.classList.remove('hidden');
            }
        }

        // Save Discogs Release ID
        const releaseIdInput = document.getElementById('input-discogs-release-id');
        if (releaseIdInput && release.id) {
            releaseIdInput.value = release.id;
        }

        // Fetch FULL release details to get all genres/styles
        if (release.id) {
            this.showToast('⏳ Cargando géneros...', 'info');
            fetch(`${BASE_API_URL}/discogs/release/${release.id}`)
                .then(res => res.json())
                .then(fullRelease => {
                    console.log("Full Discogs Release:", fullRelease);

                    // Get all styles and genres from full release
                    const rawGenres = [...(fullRelease.styles || []), ...(fullRelease.genres || [])];
                    console.log("ALL Genres/Styles from full release:", rawGenres);
                    const uniqueGenres = [...new Set(rawGenres)];

                    if (uniqueGenres.length > 0) {
                        const select1 = form.querySelector('select[name="genre"]');
                        const select2 = form.querySelector('select[name="genre2"]');
                        const select3 = form.querySelector('select[name="genre3"]');
                        const select4 = form.querySelector('select[name="genre4"]');
                        const select5 = form.querySelector('select[name="genre5"]');
                        const selects = [select1, select2, select3, select4, select5];

                        uniqueGenres.slice(0, 5).forEach((g, i) => {
                            if (selects[i]) {
                                // Check if option exists, if not add it
                                let found = false;
                                for (let opt of selects[i].options) {
                                    if (opt.value === g) {
                                        selects[i].value = g;
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) {
                                    const opt = document.createElement('option');
                                    opt.value = g;
                                    opt.text = g;
                                    opt.selected = true;
                                    selects[i].add(opt);
                                }
                            }
                        });
                        this.showToast(`✅ ${uniqueGenres.length} géneros cargados`, 'success');
                    }

                    // Update image with higher quality version if available
                    if (fullRelease.images && fullRelease.images.length > 0) {
                        const bestImage = fullRelease.images[0].uri;
                        const input = document.getElementById('input-cover-image');
                        const preview = document.getElementById('cover-preview');
                        if (input) input.value = bestImage;
                        if (preview) {
                            preview.querySelector('img').src = bestImage;
                        }
                    }

                    // Populate tracklist preview (display only, not saved)
                    const tracklistPreview = document.getElementById('tracklist-preview');
                    const tracklistContent = document.getElementById('tracklist-preview-content');
                    if (tracklistPreview && tracklistContent && fullRelease.tracklist && fullRelease.tracklist.length > 0) {
                        tracklistContent.innerHTML = fullRelease.tracklist.map(track => `
                            <div class="flex items-center gap-2 py-1 border-b border-slate-100 last:border-0">
                                <span class="text-[10px] font-mono text-slate-400 w-6">${track.position || ''}</span>
                                <span class="flex-1">${track.title}</span>
                                <span class="text-[10px] text-slate-400">${track.duration || ''}</span>
                            </div>
                        `).join('');
                        tracklistPreview.classList.remove('hidden');
                    }

                    // NEW: Fetch Price Suggestions & Link
                    const pricePreview = document.getElementById('price-suggestions-preview');
                    const priceContent = document.getElementById('price-suggestions-content');
                    const releaseLink = document.getElementById('discogs-release-link');

                    if (releaseLink && fullRelease.uri) {
                        const discogsUrl = fullRelease.uri.startsWith('http') ? fullRelease.uri : 'https://www.discogs.com' + fullRelease.uri;
                        releaseLink.href = discogsUrl;
                        releaseLink.classList.remove('hidden');
                    }

                    if (pricePreview && priceContent) {
                        priceContent.innerHTML = '<div class="col-span-2 text-[10px] text-slate-400 animate-pulse">Consultando mercado...</div>';
                        pricePreview.classList.remove('hidden');

                        const backendUrl = BASE_API_URL;

                        fetch(`${backendUrl}/discogs/price-suggestions/${release.id}`)
                            .then(res => res.json())
                            .then(data => {
                                if (data.success && data.suggestions) {
                                    const s = data.suggestions;
                                    const currency = s.currency === 'DKK' ? ' kr.' : (s.currency === 'USD' ? ' $' : ' ' + s.currency);

                                    const renderPrice = (label, key) => {
                                        const val = s[key];
                                        return `
                                            <div class="bg-white p-2 rounded-lg border border-brand-orange/10">
                                                <span class="text-[9px] text-slate-400 block leading-none mb-1">${label}</span>
                                                <span class="font-bold text-brand-dark">${val ? val.value.toFixed(0) + currency : 'N/A'}</span>
                                            </div>
                                        `;
                                    };

                                    priceContent.innerHTML = `
                                        ${renderPrice('Mint (M)', 'Mint (M)')}
                                        ${renderPrice('Near Mint (NM)', 'Near Mint (NM or M-)')}
                                        ${renderPrice('Very Good Plus (VG+)', 'Very Good Plus (VG+)')}
                                        ${renderPrice('Very Good (VG)', 'Very Good (VG)')}
                                    `;
                                } else {
                                    priceContent.innerHTML = '<div class="col-span-2 text-[10px] text-slate-400">Precios no disponibles para este release</div>';
                                }
                            })
                            .catch(err => {
                                console.error('Price suggestion error:', err);
                                priceContent.innerHTML = '<div class="col-span-2 text-[10px] text-red-400 italic">Error al consultar precios</div>';
                            });
                    }
                })
                .catch(err => {
                    console.error('Error fetching full release:', err);
                    this.showToast('⚠️ No se pudieron cargar todos los géneros', 'warning');
                });
        } else {
            // Fallback: use search result data (limited - usually only 1 genre)
            const rawGenres = [...(release.style || []), ...(release.genre || [])];
            console.log("Fallback Genres (limited, no token):", rawGenres);
            const uniqueGenres = [...new Set(rawGenres)];

            if (uniqueGenres.length > 0) {
                const select1 = form.querySelector('select[name="genre"]');
                if (select1) {
                    const g = uniqueGenres[0];
                    let found = false;
                    for (let opt of select1.options) {
                        if (opt.value === g) {
                            select1.value = g;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        const opt = document.createElement('option');
                        opt.value = g;
                        opt.text = g;
                        opt.selected = true;
                        select1.add(opt);
                    }
                }
            }
        }

        // Set Discogs URL
        if (release.uri || release.resource_url) {
            const uri = release.uri || release.resource_url;
            const fullUrl = uri.startsWith('http') ? uri : 'https://www.discogs.com' + uri;
            const urlInput = document.getElementById('input-discogs-url');
            if (urlInput) urlInput.value = fullUrl;
        }

        // Set Discogs ID
        if (release.id) {
            const idInput = document.getElementById('input-discogs-id');
            if (idInput) idInput.value = release.id;
        }

        document.getElementById('discogs-results').classList.add('hidden');
    },

    openTracklistModal(sku) {
        const item = this.state.inventory.find(i => i.sku === sku);
        if (!item) return;

        // Try to find Discogs ID
        let discogsId = item.discogsId;

        // Render Loading State
        const loadingHtml = `
                                                                <div id="tracklist-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-fadeIn">
                                                                        <h3 class="font-display text-xl font-bold text-brand-dark mb-4">Lista de Temas (Tracklist)</h3>
                                                                        <div class="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                                                            <i class="ph-bold ph-spinner animate-spin text-4xl text-brand-orange"></i>
                                                                            <p class="font-medium">Cargando tracks desde Discogs...</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `;
        document.body.insertAdjacentHTML('beforeend', loadingHtml);

        // Fetch Function
        const fetchAndRender = (id) => {
            fetch(`${BASE_API_URL}/discogs/release/${id}`)
                .then(res => {
                    if (!res.ok) throw new Error('Release not found');
                    return res.json();
                })
                .then(data => {
                    const tracks = data.tracklist || [];
                    const trackHtml = tracks.map(t => `
                                                                <div class="flex items-center justify-between py-3 border-b border-slate-50 hover:bg-slate-50 px-2 transition-colors rounded-lg group">
                                                                    <div class="flex items-center gap-3">
                                                                        <span class="text-xs font-mono font-bold text-slate-400 w-8">${t.position}</span>
                                                                        <span class="text-sm font-bold text-brand-dark group-hover:text-brand-orange transition-colors">${t.title}</span>
                                                                    </div>
                                                                    <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">${t.duration || '--:--'}</span>
                                                                </div>
                                                                `).join('');

                    const finalHtml = `
                                                                <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative animate-fadeIn max-h-[85vh] flex flex-col overflow-hidden">
                                                                    <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                                                                        <div>
                                                                            <h3 class="font-display text-xl font-bold text-brand-dark">Lista de Temas</h3>
                                                                            <p class="text-xs text-slate-500">${item.artist} - ${item.album}</p>
                                                                        </div>
                                                                        <button onclick="document.getElementById('tracklist-overlay').remove()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                                                                            <i class="ph-bold ph-x text-lg"></i>
                                                                        </button>
                                                                    </div>
                                                                    <div class="p-4 overflow-y-auto custom-scrollbar flex-1">
                                                                        ${tracks.length > 0 ? trackHtml : '<p class="text-center text-slate-500 py-8">No se encontraron temas para esta edición.</p>'}
                                                                    </div>
                                                                    <div class="p-3 bg-slate-50 text-center shrink-0 border-t border-slate-100">
                                                                        <a href="https://www.discogs.com/release/${id}" target="_blank" class="text-xs font-bold text-brand-orange hover:underline flex items-center justify-center gap-1">
                                                                            Ver release completo en Discogs <i class="ph-bold ph-arrow-square-out"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                `;
                    document.getElementById('tracklist-overlay').innerHTML = finalHtml;
                })
                .catch(err => {
                    console.error(err);
                    document.getElementById('tracklist-overlay').innerHTML = `
                                                                <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                                                                    <div class="text-center py-6">
                                                                        <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                                                                            <i class="ph-bold ph-warning-circle text-3xl"></i>
                                                                        </div>
                                                                        <h3 class="font-bold text-brand-dark mb-2">Error al cargar</h3>
                                                                        <p class="text-sm text-slate-500 mb-4">No pudimos obtener el tracklist. El ID de Discogs podría ser incorrecto o faltar.</p>
                                                                        <button onclick="document.getElementById('tracklist-overlay').remove()" class="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors">Cerrar</button>
                                                                    </div>
                                                                </div>
                                                                `;
                });
        };

        if (discogsId) {
            fetchAndRender(discogsId);
        } else {
            // Fallback: Try to search by Artist + Album to get ID
            const query = `${item.artist} - ${item.album}`;
            fetch(`${BASE_API_URL}/discogs/search?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.results && data.results.length > 0) {
                        fetchAndRender(data.results[0].id);
                    } else {
                        throw new Error("No results found in fallback search");
                    }
                })
                .catch(() => {
                    document.getElementById('tracklist-overlay').innerHTML = `
                         <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                            <div class="text-center py-6">
                                <div class="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-orange">
                                    <i class="ph-bold ph-question text-3xl"></i>
                                </div>
                                <h3 class="font-bold text-brand-dark mb-2">Tracklist no disponible</h3>
                                <p class="text-sm text-slate-500 mb-4">Este disco no tiene un ID de Discogs asociado y la búsqueda automática falló.</p>
                                <button onclick="document.getElementById('tracklist-overlay').remove()" class="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors">Cerrar</button>
                            </div>
                        </div>
                    `;
                });
        }
    },


    renderDiscogsSales(container) {
        // Filter only Discogs sales
        const discogsSales = this.state.sales.filter(s => s.channel === 'discogs');

        // Helper to get net total (total minus fees)
        const getNetTotal = (s) => parseFloat(s.total) || 0;
        const getOriginalTotal = (s) => parseFloat(s.originalTotal) || (parseFloat(s.total) + (parseFloat(s.discogsFee || 0) + parseFloat(s.paypalFee || 0)));
        const getFees = (s) => getOriginalTotal(s) - getNetTotal(s);

        const totalRevenue = discogsSales.reduce((sum, s) => sum + getNetTotal(s), 0);
        const totalFees = discogsSales.reduce((sum, s) => sum + getFees(s), 0);

        const totalProfit = discogsSales.reduce((sum, s) => {
            const net = getNetTotal(s);
            let saleCost = 0;
            if (s.items && Array.isArray(s.items)) {
                saleCost = s.items.reduce((c, i) => {
                    const itemCost = parseFloat(i.costAtSale || 0);
                    const itemQty = parseInt(i.qty || i.quantity) || 1;
                    return c + (itemCost * itemQty);
                }, 0);
            }
            return sum + (net - saleCost);
        }, 0);

        container.innerHTML = `
        <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="font-display text-3xl font-bold text-brand-dark mb-2">💿 Ventas Discogs</h1>
                    <p class="text-slate-500">Ventas realizadas a través de Discogs Marketplace</p>
                </div>
                <div class="bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-2xl shadow-xl">
                    <div class="text-sm font-medium opacity-90">Ingresos Netos (Caja)</div>
                    <div class="text-3xl font-bold">${this.formatCurrency(totalRevenue)}</div>
                    <div class="text-xs opacity-75">${discogsSales.length} ventas registradas</div>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-brand-dark">${discogsSales.length}</div>
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wide">Ventas Totales</div>
                        </div>
                        <div class="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                            <i class="ph-fill ph-shopping-cart text-2xl text-purple-500"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-red-600">${this.formatCurrency(totalFees)}</div>
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wide">Fees Acumulados</div>
                        </div>
                        <div class="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                            <i class="ph-fill ph-percent text-2xl text-red-500"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-green-600">${this.formatCurrency(totalProfit)}</div>
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wide">Ganancia Real</div>
                        </div>
                        <div class="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                            <i class="ph-fill ph-coins text-2xl text-green-500"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sales List -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 class="text-lg font-bold text-brand-dark">Historial de Ventas</h2>
                    <button onclick="app.syncWithDiscogs()" class="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                        <i class="ph-bold ph-arrows-clockwise"></i> Sincronizar para detectar nuevas ventas
                    </button>
                </div>
                
                ${discogsSales.length === 0 ? `
                    <div class="p-12 text-center">
                        <i class="ph-duotone ph-vinyl-record text-6xl text-slate-300 mb-4"></i>
                        <p class="text-slate-400 mb-4">No hay ventas de Discogs detectadas aún</p>
                        <p class="text-sm text-slate-500">Las ventas se detectan automáticamente al sincronizar con Discogs</p>
                        <button onclick="app.syncWithDiscogs()" class="mt-4 bg-purple-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-600 transition-colors">
                            Sincronizar ahora
                        </button>
                    </div>
                ` : `
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="bg-slate-50 border-b border-slate-100">
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Detalles de Cobro</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fees</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Neto Recibido</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${discogsSales.map(s => {
            const date = s.timestamp?.toDate ? s.timestamp.toDate() : (s.date ? new Date(s.date) : new Date(0));
            return { ...s, _sortDate: date.getTime() };
        }).sort((a, b) => b._sortDate - a._sortDate).map(sale => {
            const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.date);
            const item = sale.items && sale.items[0];
            const originalTotal = sale.originalTotal || (sale.total + (sale.discogsFee || 0) + (sale.paypalFee || 0));
            const discogsFee = sale.discogsFee || 0;
            const paypalFee = sale.paypalFee || 0;
            const netReceived = sale.total;
            const isPending = sale.status === 'pending_review' || sale.needsReview;

            return `
                                        <tr class="border-b border-slate-50 hover:bg-purple-50/30 transition-colors cursor-pointer ${isPending ? 'bg-orange-50/50' : ''}" onclick="app.openUnifiedOrderDetailModal('${sale.id}')">
                                            <td class="px-6 py-4 text-sm text-slate-600">${saleDate.toLocaleDateString('es-ES')}</td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[200px]">${item?.album || 'Producto'}</div>
                                                <div class="text-xs text-slate-500">${item?.artist || '-'}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-xs text-slate-500">Precio Lista: <span class="font-bold text-slate-700">${this.formatCurrency(originalTotal)}</span></div>
                                                ${sale.discogs_order_id ? `<div class="text-[10px] text-purple-600 font-medium">Order: ${sale.discogs_order_id}</div>` : ''}
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-[10px] text-red-500 font-bold">Total Fees: -${this.formatCurrency(originalTotal - netReceived)}</div>
                                                <div class="text-[10px] text-slate-400 font-medium">
                                                    ${originalTotal > 0 ? `(${(((originalTotal - netReceived) / originalTotal) * 100).toFixed(1)}%)` : ''}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm font-bold text-brand-dark">${this.formatCurrency(netReceived)}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="flex flex-col gap-2">
                                                    ${isPending ? `
                                                        <span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider text-center">Pendiente</span>
                                                    ` : `
                                                        <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider text-center">Confirmado</span>
                                                    `}
                                                    <button onclick="app.openUpdateSaleValueModal('${sale.id}', ${originalTotal}, ${netReceived})" class="w-full py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1">
                                                        <i class="ph-bold ph-pencil-simple"></i> Editar Neto
                                                    </button>
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

            <!-- Info Note -->
            <div class="mt-6 bg-purple-50 border border-purple-100 rounded-xl p-5">
                <div class="flex items-start gap-3">
                    <i class="ph-fill ph-info text-purple-500 text-xl shrink-0 mt-0.5"></i>
                    <div class="text-sm text-purple-900">
                        <p class="font-bold mb-1">¿Cómo gestionar los fees?</p>
                        <p class="text-purple-700">Las ventas de Discogs se registran inicialmente por el <b>precio bruto</b>. Haz clic en "Actualizar Valor" e ingresa el monto real recibido en PayPal. El sistema calculará automáticamente la diferencia como fee y ajustará tus ingresos netos.</p>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    openUpdateSaleValueModal(id, originalTotal) {
        const modalHtml = `
            <div id="update-sale-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
                <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div class="p-8">
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                                <i class="ph-fill ph-currency-circle-dollar text-2xl"></i>
                            </div>
                            <div>
                                <h3 class="font-display text-xl font-bold text-brand-dark">Actualizar Valor Real</h3>
                                <p class="text-sm text-slate-500">Registra el monto neto recibido</p>
                            </div>
                        </div>

                        <form onsubmit="app.handleSaleValueUpdate(event, '${id}', ${originalTotal})">
                            <div class="space-y-6">
                                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div class="text-xs font-bold text-slate-400 uppercase mb-1">Precio Original (Bruto)</div>
                                    <div class="text-xl font-bold text-slate-600">${this.formatCurrency(originalTotal)}</div>
                                </div>

                                <div class="space-y-2">
                                    <label class="text-xs font-bold text-brand-dark uppercase">Monto Neto Recibido (PayPal)</label>
                                    <div class="relative">
                                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">kr.</span>
                                        <input type="number" name="netReceived" step="0.01" required autofocus
                                            class="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-purple-500 outline-none text-2xl font-bold text-brand-dark transition-all"
                                            placeholder="0.00" oninput="app.calculateModalFee(this.value, ${originalTotal})">
                                    </div>
                                </div>

                                <div id="modal-fee-display" class="p-4 bg-red-50 rounded-2xl border border-red-100 hidden">
                                    <div class="flex items-center justify-between mb-1">
                                        <span class="text-xs font-bold text-red-600 uppercase">Fee Calculado</span>
                                        <span id="modal-fee-value" class="text-sm font-bold text-red-600">- kr. 0.00</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-[10px] text-red-400 uppercase font-bold tracking-wider">Porcentaje del Fee</span>
                                        <span id="modal-fee-percent" class="text-[10px] font-bold text-red-400">0.0%</span>
                                    </div>
                                </div>

                                <div class="flex gap-3 pt-2">
                                    <button type="button" onclick="this.closest('#update-sale-modal').remove()" 
                                        class="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors">
                                        Cancelar
                                    </button>
                                    <button type="submit" id="update-sale-submit-btn"
                                        class="flex-[2] py-4 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2">
                                        Confirmar Ajuste
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    calculateModalFee(netReceived, originalTotal) {
        const net = parseFloat(netReceived) || 0;
        const fee = originalTotal - net;
        const percent = originalTotal > 0 ? (fee / originalTotal) * 100 : 0;
        const display = document.getElementById('modal-fee-display');
        const value = document.getElementById('modal-fee-value');

        if (fee > 0) {
            display.classList.remove('hidden');
            value.innerText = `- kr. ${fee.toFixed(2)}`;
            const percentEl = document.getElementById('modal-fee-percent');
            if (percentEl) percentEl.innerText = `${percent.toFixed(1)}%`;
        } else {
            display.classList.add('hidden');
        }
    },

    async handleSaleValueUpdate(e, id, originalTotal) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const netReceived = formData.get('netReceived');
        const btn = document.getElementById('update-sale-submit-btn');

        if (!netReceived) return;

        btn.disabled = true;
        btn.innerHTML = `<i class="ph-bold ph-circle-notch animate-spin"></i> Guardando...`;

        try {
            const backendUrl = BASE_API_URL;

            // Get current Firebase ID token for authentication
            const token = await auth.currentUser.getIdToken();

            const response = await fetch(`${backendUrl}/firebase/sales/${id}/value`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ netReceived })
            });

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("Non-JSON response received:", text);
                throw new Error(`Server returned non-JSON response (${response.status})`);
            }

            const result = await response.json();

            if (result.success) {
                this.showToast('✅ Venta actualizada y fee registrado');
                document.getElementById('update-sale-modal').remove();
                await this.loadData();
                this.refreshCurrentView();
            } else {
                throw new Error(result.error || 'Error al actualizar');
            }
        } catch (error) {
            console.error('Update sale error:', error);
            this.showToast(`❌ Error: ${error.message}`);
            btn.disabled = false;
            btn.innerText = 'Confirmar Ajuste';
        }
    },


    renderPickups(container) {
        // Filter Sales for pickups (Online sales with local_pickup method)
        const pickupSales = this.state.sales.filter(s =>
            s.channel === 'online' && (s.shipping_method?.id === 'local_pickup' || s.shipping_cost === 0 && s.status !== 'failed')
        );

        const pendingPickups = pickupSales.filter(s => s.status === 'completed' || s.status === 'paid' || s.status === 'paid_pending');
        const readyPickups = pickupSales.filter(s => s.status === 'ready_for_pickup');
        const deliveredPickups = pickupSales.filter(s => s.status === 'shipped' || s.status === 'delivered' || s.status === 'picked_up');

        const html = `
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 pt-6">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h2 class="font-display text-3xl font-bold text-brand-dark">Gestión de Retiros</h2>
                        <p class="text-slate-500 text-sm">Administra los pedidos para retirar en tienda.</p>
                    </div>
                    <div class="flex gap-4">
                        <div class="bg-blue-100 text-blue-600 px-4 py-2 rounded-xl border border-blue-200 flex items-center gap-3">
                            <i class="ph-fill ph-storefront text-xl"></i>
                            <div>
                                <p class="text-[10px] uppercase font-bold leading-none">Pendientes</p>
                                <p class="text-xl font-display font-bold">${pendingPickups.length}</p>
                            </div>
                        </div>
                        <div class="bg-green-100 text-green-600 px-4 py-2 rounded-xl border border-green-200 flex items-center gap-3">
                            <i class="ph-fill ph-check-circle text-xl"></i>
                            <div>
                                <p class="text-[10px] uppercase font-bold leading-none">Listos</p>
                                <p class="text-xl font-display font-bold">${readyPickups.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pending Pickups -->
                <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden mb-8">
                    <div class="p-6 border-b border-orange-50 bg-orange-50/30">
                        <h3 class="font-bold text-brand-dark flex items-center gap-2">
                            <i class="ph-fill ph-clock-counter-clockwise text-brand-orange"></i> Retiros Pendientes de Preparar
                        </h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                                <tr>
                                    <th class="p-4">Orden</th>
                                    <th class="p-4">Cliente</th>
                                    <th class="p-4">Items</th>
                                    <th class="p-4">Fecha Pago</th>
                                    <th class="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${pendingPickups.length === 0 ? `
                                    <tr>
                                        <td colspan="5" class="p-12 text-center text-slate-400 italic">No hay retiros pendientes.</td>
                                    </tr>
                                ` : pendingPickups.map(s => `
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${s.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${s.id.slice(0, 8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${s.customer?.name || s.customerName || 'Cliente'}</td>
                                        <td class="p-4 text-xs text-slate-500">${s.items?.length || 0} items</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate(s.date)}</td>
                                        <td class="p-4 text-center" onclick="event.stopPropagation()">
                                            <button onclick="app.setReadyForPickup('${s.id}')" class="bg-brand-dark text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto">
                                                <i class="ph-bold ph-bell"></i> Notificar Listo
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Ready for Pickup -->
                <div class="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden mb-8">
                    <div class="p-6 border-b border-green-50 bg-green-50/30">
                        <h3 class="font-bold text-green-700 flex items-center gap-2">
                            <i class="ph-fill ph-check-circle"></i> Listos para Retiro (Avisados)
                        </h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                                <tr>
                                    <th class="p-4">Orden</th>
                                    <th class="p-4">Cliente</th>
                                    <th class="p-4">Fecha Aviso</th>
                                    <th class="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${readyPickups.length === 0 ? `
                                    <tr>
                                        <td colspan="4" class="p-12 text-center text-slate-400 italic">No hay pedidos esperando retiro.</td>
                                    </tr>
                                ` : readyPickups.map(s => `
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${s.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${s.id.slice(0, 8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${s.customer?.name || s.customerName || 'Cliente'}</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate(s.updated_at?.toDate ? s.updated_at.toDate() : s.updated_at || s.date)}</td>
                                        <td class="p-4 text-center" onclick="event.stopPropagation()">
                                            <button onclick="app.markAsDelivered('${s.id}')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto">
                                                <i class="ph-bold ph-hand-tap"></i> Ya lo Retiró
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Recent Deliveries -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden opacity-75">
                    <div class="p-6 bg-slate-50/50 border-b border-slate-100">
                        <h3 class="font-bold text-slate-500">Entregas Recientes</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <tbody class="divide-y divide-slate-50">
                                ${deliveredPickups.slice(0, 10).map(s => `
                                    <tr>
                                        <td class="p-4 text-sm font-medium text-slate-400">#${s.id.slice(0, 8)}</td>
                                        <td class="p-4 text-sm text-slate-500">${s.customerName || 'Cliente'}</td>
                                        <td class="p-4 text-right">
                                            <span class="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase">Entregado</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    async setReadyForPickup(id) {
        try {
            const btn = event?.target?.closest('button');
            if (btn) btn.disabled = true;

            const response = await fetch(`${BASE_API_URL}/shipping/ready-for-pickup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: id })
            });

            if (response.ok) {
                this.showToast('✅ Cliente notificado - El pedido está listo para retiro');
                await this.loadData();
                this.refreshCurrentView();
            } else {
                throw new Error('Error al notificar');
            }
        } catch (error) {
            this.showToast('❌ error: ' + error.message, 'error');
        }
    },

    async markAsDelivered(id) {
        try {
            const btn = event?.target?.closest('button');
            if (btn) btn.disabled = true;

            await db.collection('sales').doc(id).update({
                status: 'picked_up',
                fulfillment_status: 'delivered',
                picked_up_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.showToast('✅ Pedido retirado correctamente');
            await this.loadData();
            this.refreshCurrentView();
        } catch (error) {
            this.showToast('❌ Error: ' + error.message, 'error');
        }
    },

    // ====== VAT REPORT MODULE ======
    async deleteExpenseVAT(id) {
        const expense = this.state.expenses.find(e => e.id === id);

        // Check if expense has a receipt attached - require double confirmation
        if (expense?.receiptUrl) {
            // First confirmation
            if (!confirm('⚠️ ATENCIÓN: Este gasto tiene un recibo adjunto.\n\n¿Estás seguro de que quieres eliminarlo?')) {
                return;
            }

            // Second confirmation with legal warning
            if (!confirm('🔒 CONFIRMACIÓN LEGAL REQUERIDA\n\n' +
                'La ley exige guardar documentos contables durante 5 AÑOS.\n\n' +
                'Fecha del gasto: ' + (expense.fecha_factura || expense.date || 'Desconocida') + '\n' +
                'Proveedor: ' + (expense.proveedor || 'Sin nombre') + '\n' +
                'Monto: ' + this.formatCurrency(expense.monto_total || expense.amount || 0) + '\n\n' +
                '¿CONFIRMAS que deseas eliminar permanentemente este registro y su recibo?')) {
                this.showToast('ℹ️ Eliminación cancelada');
                return;
            }
        } else {
            // Single confirmation for expenses without receipt
            if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) return;
        }

        try {
            await db.collection('expenses').doc(id).delete();
            this.showToast('✅ Gasto eliminado');
            this.loadData();
        } catch (error) {
            console.error('Error deleting expense:', error);
            this.showToast('❌ Error al eliminar gasto');
        }
    },

    renderVATReport(container) {
        // Get current quarter filter from state or default to current quarter
        const now = new Date();
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        const currentYear = now.getFullYear();
        const selectedQuarter = this.state.vatReportQuarter || currentQuarter;
        const selectedYear = this.state.vatReportYear || currentYear;

        // Calculate quarter date range
        const quarterStartMonth = (selectedQuarter - 1) * 3;
        const startDate = new Date(selectedYear, quarterStartMonth, 1);
        const endDate = new Date(selectedYear, quarterStartMonth + 3, 0, 23, 59, 59);

        // Filter sales by date range
        const filteredSales = this.state.sales.filter(sale => {
            const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp || sale.date);
            return saleDate >= startDate && saleDate <= endDate;
        });

        // Separate sales into Standard (New) and Margin Scheme (Used)
        let standardVatItems = [];
        let marginSchemeItems = [];
        let shippingVatItems = [];
        let totalStandardVat = 0;
        let totalMarginVat = 0;
        let totalShippingVat = 0;
        let totalShippingIncome = 0;
        let totalNetSales = 0;

        filteredSales.forEach(sale => {
            const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp || sale.date);
            const items = sale.items || [];

            items.forEach(item => {
                const price = item.priceAtSale || item.price || 0;
                // Lookup cost from sale item, or fallback to current inventory cost
                let cost = item.costAtSale || item.cost || 0;
                const productId = item.productId || item.recordId;
                const albumName = item.album;

                // If cost is 0, try to find it from the inventory
                if (cost === 0) {
                    const inventoryProduct = this.state.inventory.find(p =>
                        (productId && (p.id === productId || p.sku === productId)) ||
                        (albumName && p.album === albumName)
                    );
                    if (inventoryProduct) {
                        cost = inventoryProduct.cost || 0;
                    }
                }
                const qty = item.qty || item.quantity || 1;
                const condition = item.productCondition || 'Second-hand';
                const totalPrice = price * qty;
                const totalCost = cost * qty;

                if (condition === 'New') {
                    // Standard VAT: 25% on full price (extract: price * 0.20)
                    const vat = totalPrice * 0.20;
                    totalStandardVat += vat;
                    totalNetSales += (totalPrice - vat);
                    standardVatItems.push({
                        date: saleDate,
                        productId: item.productId || item.album || 'N/A',
                        album: item.album || 'N/A',
                        salePrice: totalPrice,
                        vat: vat
                    });
                } else {
                    // Margin Scheme: VAT on margin only
                    const margin = totalPrice - totalCost;
                    const vat = margin > 0 ? margin * 0.20 : 0;
                    totalMarginVat += vat;
                    totalNetSales += (totalPrice - vat);
                    marginSchemeItems.push({
                        date: saleDate,
                        productId: item.productId || item.album || 'N/A',
                        album: item.album || 'N/A',
                        cost: totalCost,
                        salePrice: totalPrice,
                        margin: margin,
                        vat: vat
                    });
                }
            });

            // Calculate Shipping VAT (Always 25% standard)
            const shippingIncome = parseFloat(sale.shipping_income || sale.shipping || sale.shipping_cost || 0);
            if (shippingIncome > 0) {
                const vat = shippingIncome * 0.20;
                totalShippingVat += vat;
                totalShippingIncome += shippingIncome;
                totalNetSales += (shippingIncome - vat);
                shippingVatItems.push({
                    date: saleDate,
                    orderId: sale.orderNumber || (sale.id && typeof sale.id === 'string' ? sale.id.slice(-8) : 'N/A'),
                    income: shippingIncome,
                    vat: vat
                });
            }
        });

        const totalVatToPaySalida = totalStandardVat + totalMarginVat + totalShippingVat;

        // Calculate deductible input VAT from expenses (IVA de entrada)
        const deductibleExpenses = this.state.expenses.filter(e => {
            const expDate = e.fecha_factura ? new Date(e.fecha_factura) : (e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp || e.date));
            const isDeductible = e.categoria_tipo === 'operativo' || e.categoria_tipo === 'stock_nuevo' || e.is_vat_deductible;
            return isDeductible && expDate >= startDate && expDate <= endDate;
        });

        // Separate General Expenses vs Shipping Expenses
        const generalExpenses = deductibleExpenses.filter(e => e.categoria !== 'envios');
        const shippingExpenses = deductibleExpenses.filter(e => e.categoria === 'envios');

        const totalGeneralInputVat = generalExpenses.reduce((sum, e) => sum + (parseFloat(e.monto_iva) || 0), 0);
        const totalShippingExpenseVat = shippingExpenses.reduce((sum, e) => sum + (parseFloat(e.monto_iva) || 0), 0);
        const totalShippingExpenseGross = shippingExpenses.reduce((sum, e) => sum + (parseFloat(e.monto_total) || 0), 0);

        const totalInputVat = totalGeneralInputVat + totalShippingExpenseVat;
        const totalVatToPayFinal = totalVatToPaySalida - totalInputVat;

        // Logistics Net Logic
        const netoEnvios = totalShippingIncome - totalShippingExpenseGross;

        // Calculate Payment Deadline (Danish Quarterly Rules)
        const deadlines = {
            1: `1 de junio, ${selectedYear}`,
            2: `1 de septiembre, ${selectedYear}`,
            3: `1 de diciembre, ${selectedYear}`,
            4: `1 de marzo, ${selectedYear + 1}`
        };
        const paymentDeadline = deadlines[selectedQuarter];

        // Status Logic (Defaulting to "Pendiente" as we don't store declared status yet)
        const statusLabel = "Pendiente";
        const statusColor = "bg-slate-100 text-slate-500";

        const html = `
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <!-- Header Section -->
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange text-2xl">
                            <i class="ph-duotone ph-chart-pie-slice"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-3">
                                <h2 class="font-display text-2xl font-bold text-brand-dark">VAT (Moms)</h2>
                                <span class="${statusColor} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${statusLabel}</span>
                            </div>
                            <p class="text-xs text-slate-400 uppercase font-bold tracking-wider mt-0.5">Régimen de IVA Dinamarca</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div class="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                            <select id="vat-quarter-select" onchange="app.updateVATQuarter()" class="bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600 outline-none cursor-pointer">
                                <option value="1" ${selectedQuarter === 1 ? 'selected' : ''}>Q1 ${selectedYear}</option>
                                <option value="2" ${selectedQuarter === 2 ? 'selected' : ''}>Q2 ${selectedYear}</option>
                                <option value="3" ${selectedQuarter === 3 ? 'selected' : ''}>Q3 ${selectedYear}</option>
                                <option value="4" ${selectedQuarter === 4 ? 'selected' : ''}>Q4 ${selectedYear}</option>
                            </select>
                        </div>

                        <button onclick="app.downloadVATAuditReport()" class="flex-1 lg:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                            <i class="ph-bold ph-file-csv"></i>
                            Exportar Auditoría
                        </button>
                    </div>
                </div>

                <!-- Main KPIs Section (Prompt 1) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <!-- Tarjeta A: Moms Tilsvar (Total a Pagar) -->
                    <div class="${totalVatToPayFinal > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'} rounded-3xl p-8 border shadow-sm relative overflow-hidden group">
                        <p class="${totalVatToPayFinal > 0 ? 'text-red-700/60' : 'text-emerald-700/60'} text-xs font-bold uppercase tracking-widest mb-4">Moms Tilsvar</p>
                        <p class="text-4xl font-display font-bold mb-2 ${totalVatToPayFinal > 0 ? 'text-red-700' : 'text-emerald-700'}">${this.formatCurrency(totalVatToPayFinal)}</p>
                        <p class="text-[11px] ${totalVatToPayFinal > 0 ? 'text-red-600/70' : 'text-emerald-600/70'} mt-4 italic font-medium">
                            <i class="ph-bold ph-calendar"></i> Límite de pago: ${paymentDeadline}
                        </p>
                    </div>

                    <!-- Tarjeta B: Salgsmoms (IVA Recaudado) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Salgsmoms</p>
                            <span class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-bold ph-arrow-up-right"></i></span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(totalVatToPaySalida)}</p>
                        <p class="text-[11px] text-slate-400 mt-4 leading-relaxed font-medium">IVA generado por Ventas + Envíos Cobrados.</p>
                    </div>

                    <!-- Tarjeta C: Købsmoms (IVA Deducible) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Købsmoms</p>
                            <span class="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-bold ph-arrow-down-left"></i></span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(totalInputVat)}</p>
                        <p class="text-[11px] text-slate-400 mt-4 leading-relaxed font-medium">IVA soportado en Gastos, Envíos Pagados y Stock.</p>
                    </div>
                </div>

                <!-- Breakdown Panels Section (Prompt 2) -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    
                    <!-- LEFT COLUMN: Origen del IVA (Ingresos) -->
                    <div class="space-y-6">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Origen del IVA (Salgsmoms)</h3>
                            <div class="h-px flex-1 bg-slate-100"></div>
                        </div>

                        <!-- Income Breakdown Card -->
                        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div class="p-6 space-y-6">
                                <!-- Standard Sales -->
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="font-bold text-brand-dark">Ventas Estándar (Nuevos)</p>
                                        <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Monto: ${this.formatCurrency(standardVatItems.reduce((s, i) => s + i.salePrice, 0))}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-lg font-bold text-blue-600">${this.formatCurrency(totalStandardVat)}</p>
                                        <p class="text-[10px] text-slate-400 font-bold">IVA (25%)</p>
                                    </div>
                                </div>
                                <div class="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div class="h-full bg-blue-500 rounded-full" style="width: ${totalVatToPaySalida > 0 ? (totalStandardVat / totalVatToPaySalida) * 100 : 0}%"></div>
                                </div>

                                <!-- Margin Scheme Sales -->
                                <div class="pt-4 border-t border-slate-50">
                                    <div class="flex items-center justify-between mb-1">
                                        <div>
                                            <p class="font-bold text-brand-dark">Régimen Margen (Usados)</p>
                                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Margen total: ${this.formatCurrency(marginSchemeItems.reduce((s, i) => s + i.margin, 0))}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-amber-600">${this.formatCurrency(totalMarginVat)}</p>
                                            <p class="text-[10px] text-slate-400 font-bold">IVA s/Margen</p>
                                        </div>
                                    </div>
                                    ${marginSchemeItems.some(i => i.margin < 0) ? `
                                        <div class="flex items-center gap-1.5 text-red-500 text-[11px] font-bold bg-red-50 px-3 py-1.5 rounded-lg mt-2 border border-red-100/50">
                                            <i class="ph-bold ph-warning-circle"></i>
                                            Alerta: Se detectaron ventas con margen negativo.
                                        </div>
                                    ` : ''}
                                </div>

                                <!-- Shipping Revenue -->
                                <div class="pt-4 border-t border-slate-50">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <p class="font-bold text-brand-dark">Ingresos por Envío</p>
                                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Total cobrado: ${this.formatCurrency(totalShippingIncome)}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-indigo-500">${this.formatCurrency(totalShippingVat)}</p>
                                            <p class="text-[10px] text-slate-400 font-bold">IVA (25%)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: Deducciones y Logística (Gastos) -->
                    <div class="space-y-8">
                        <div>
                            <div class="flex items-center gap-2 mb-4">
                                <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Balance de Logística (Shipping P&L)</h3>
                                <div class="h-px flex-1 bg-slate-100"></div>
                            </div>
                            
                            <!-- Logistics P&L Panel -->
                            <div class="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10">
                                <div class="flex justify-between items-center mb-6">
                                    <div class="space-y-1">
                                        <p class="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Balance Neto IVA</p>
                                        <p class="text-2xl font-display font-bold ${totalShippingVat - totalShippingExpenseVat >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                                            ${this.formatCurrency(totalShippingVat - totalShippingExpenseVat)}
                                        </p>
                                    </div>
                                    <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">
                                        <i class="ph-bold ph-scales"></i>
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex justify-between text-xs">
                                        <span class="text-slate-400 italic">IVA Cobrado (Ingreso)</span>
                                        <span class="font-bold text-emerald-400">+ ${this.formatCurrency(totalShippingVat)}</span>
                                    </div>
                                    <div class="flex justify-between text-xs">
                                        <span class="text-slate-400 italic">IVA Pagado (Gasto)</span>
                                        <span class="font-bold text-red-400">- ${this.formatCurrency(totalShippingExpenseVat)}</span>
                                    </div>
                                    <div class="pt-3 border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-2">
                                        <i class="ph-bold ph-info"></i>
                                        Balance operativo de impuestos en logística.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div class="flex items-center gap-2 mb-4">
                                <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Otros Gastos (Købsmoms)</h3>
                                <div class="h-px flex-1 bg-slate-100"></div>
                            </div>

                            <!-- Categorized Deductions Panel -->
                            <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                                ${Object.entries(generalExpenses.reduce((acc, e) => {
            const cat = e.categoria || 'otros';
            acc[cat] = (acc[cat] || 0) + (parseFloat(e.monto_iva) || 0);
            return acc;
        }, {})).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => `
                                    <div class="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <i class="ph-bold ph-tag"></i>
                                            </div>
                                            <span class="font-bold text-slate-600 capitalize text-sm">${cat.replace('_', ' ')}</span>
                                        </div>
                                        <span class="font-bold text-slate-900 text-sm">${this.formatCurrency(amount)}</span>
                                    </div>
                                `).join('') || `
                                    <div class="p-8 text-center text-slate-400 italic text-sm">No se registraron otros gastos deducibles.</div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tables Section -->
                <div class="space-y-8">
                    <!-- Table 1: Standard -->
                    <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div class="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <div>
                                <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                    <span class="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-sm">N</span>
                                    Tabla 1: Productos Nuevos (Venta Estándar)
                                </h3>
                                <p class="text-[11px] text-slate-400 mt-1">IVA 25% incluido en el precio total de venta</p>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                                    <tr>
                                        <th class="px-6 py-4 text-left">Fecha</th>
                                        <th class="px-6 py-4 text-left">Producto</th>
                                        <th class="px-6 py-4 text-right">Venta</th>
                                        <th class="px-6 py-4 text-right">IVA (25%)</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50">
                                    ${standardVatItems.length > 0 ? standardVatItems.map(item => `
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-slate-500 tabular-nums">${item.date.toLocaleDateString('es-DK')}</td>
                                            <td class="px-6 py-4 font-bold text-brand-dark">${item.album}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-600">${this.formatCurrency(item.salePrice)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-blue-600">${this.formatCurrency(item.vat)}</td>
                                        </tr>
                                    `).join('') : `
                                        <tr><td colspan="4" class="px-6 py-12 text-center text-slate-400 italic">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-slate-50/30 font-bold">
                                    <tr class="text-brand-dark">
                                        <td colspan="3" class="px-6 py-4 text-right text-xs uppercase tracking-wider">Total IVA Estándar:</td>
                                        <td class="px-6 py-4 text-right text-lg text-blue-600">${this.formatCurrency(totalStandardVat)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <!-- Table 2: Margin -->
                    <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div class="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <div>
                                <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                    <span class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 text-sm">M</span>
                                    Tabla 2: Productos Usados (Brugtmoms)
                                </h3>
                                <p class="text-[11px] text-slate-400 mt-1">IVA 25% calculado únicamente sobre el margen de beneficio</p>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                                    <tr>
                                        <th class="px-6 py-4 text-left">Fecha</th>
                                        <th class="px-6 py-4 text-left">Producto</th>
                                        <th class="px-6 py-4 text-right">Costo</th>
                                        <th class="px-6 py-4 text-right">Venta</th>
                                        <th class="px-6 py-4 text-right">Margen</th>
                                        <th class="px-6 py-4 text-right">IVA s/Margen</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50">
                                    ${marginSchemeItems.length > 0 ? marginSchemeItems.map(item => `
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-slate-500 tabular-nums">${item.date.toLocaleDateString('es-DK')}</td>
                                            <td class="px-6 py-4 font-bold text-brand-dark">${item.album}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-400">${this.formatCurrency(item.cost)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-600">${this.formatCurrency(item.salePrice)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums ${item.margin > 0 ? 'text-emerald-600' : 'text-red-500'}">${this.formatCurrency(item.margin)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-amber-600">${this.formatCurrency(item.vat)}</td>
                                        </tr>
                                    `).join('') : `
                                        <tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 italic">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-slate-50/30 font-bold">
                                    <tr class="text-brand-dark">
                                        <td colspan="5" class="px-6 py-4 text-right text-xs uppercase tracking-wider">Total IVA Margen:</td>
                                        <td class="px-6 py-4 text-right text-lg text-amber-600">${this.formatCurrency(totalMarginVat)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <!-- Table 3: Shipping -->
                    <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div class="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <div>
                                <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                    <span class="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-sm">🚚</span>
                                    Tabla 3: Ingresos por Envío
                                </h3>
                                <p class="text-[11px] text-slate-400 mt-1">IVA Estándar 25% incluido en el cobro de transporte</p>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                                    <tr>
                                        <th class="px-6 py-4 text-left">Fecha</th>
                                        <th class="px-6 py-4 text-left">Orden</th>
                                        <th class="px-6 py-4 text-right">Ingreso</th>
                                        <th class="px-6 py-4 text-right">IVA (25%)</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50">
                                    ${shippingVatItems.length > 0 ? shippingVatItems.map(item => `
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-slate-500 tabular-nums">${item.date.toLocaleDateString('es-DK')}</td>
                                            <td class="px-6 py-4 font-bold text-brand-dark">#${item.orderId}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-600">${this.formatCurrency(item.income)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-blue-600">${this.formatCurrency(item.vat)}</td>
                                        </tr>
                                    `).join('') : `
                                        <tr><td colspan="4" class="px-6 py-12 text-center text-slate-400 italic">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-slate-50/30 font-bold">
                                    <tr class="text-brand-dark">
                                        <td colspan="3" class="px-6 py-4 text-right text-xs uppercase tracking-wider">Total IVA Envíos:</td>
                                        <td class="px-6 py-4 text-right text-lg text-blue-600">${this.formatCurrency(totalShippingVat)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    updateVATQuarter() {
        const quarter = parseInt(document.getElementById('vat-quarter-select').value);
        const year = parseInt(document.getElementById('vat-year-select').value);
        this.state.vatReportQuarter = quarter;
        this.state.vatReportYear = year;
        this.renderVATReport(document.getElementById('app-content'));
    },

    downloadVATAuditReport() {
        const now = new Date();
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        const currentYear = now.getFullYear();
        const selectedQuarter = this.state.vatReportQuarter || currentQuarter;
        const selectedYear = this.state.vatReportYear || currentYear;

        // Calculate quarter date range
        const quarterStartMonth = (selectedQuarter - 1) * 3;
        const startDate = new Date(selectedYear, quarterStartMonth, 1);
        const endDate = new Date(selectedYear, quarterStartMonth + 3, 0, 23, 59, 59);

        // Filter sales by date range
        const filteredSales = this.state.sales.filter(sale => {
            const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp || sale.date);
            return saleDate >= startDate && saleDate <= endDate;
        });

        // Build audit data rows
        const auditRows = [];
        let invoiceCounter = 1;

        filteredSales.forEach(sale => {
            const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp || sale.date);
            const dateStr = saleDate.toISOString().slice(0, 10).replace(/-/g, '');
            const items = sale.items || [];

            items.forEach(item => {
                const price = item.priceAtSale || item.price || 0;
                let cost = item.costAtSale || item.cost || 0;
                const productId = item.productId || item.recordId;
                const albumName = item.album;

                // Lookup cost from inventory if not stored
                if (cost === 0) {
                    const inventoryProduct = this.state.inventory.find(p =>
                        (productId && (p.id === productId || p.sku === productId)) ||
                        (albumName && p.album === albumName)
                    );
                    if (inventoryProduct) {
                        cost = inventoryProduct.cost || 0;
                    }
                }

                const qty = item.qty || item.quantity || 1;
                const condition = item.productCondition || 'Second-hand';
                const isNew = condition === 'New';
                const totalPrice = price * qty;
                const totalCost = cost * qty;

                // Calculation logic
                let calculationBasis, outputVAT;
                if (isNew) {
                    calculationBasis = totalPrice;
                    outputVAT = totalPrice * 0.20; // 25% VAT extracted
                } else {
                    const margin = totalPrice - totalCost;
                    calculationBasis = margin > 0 ? margin : 0;
                    outputVAT = margin > 0 ? margin * 0.20 : 0; // 0 if negative margin
                }

                // Generate unique transaction ID
                const transactionId = `ECR-${dateStr}-${String(invoiceCounter).padStart(4, '0')}`;
                invoiceCounter++;

                auditRows.push({
                    transactionId,
                    date: saleDate.toISOString().slice(0, 10),
                    productName: `${item.album || 'N/A'} - ${item.artist || 'N/A'}`,
                    sku: item.sku || productId || 'N/A',
                    condition: isNew ? 'New' : 'Second-hand',
                    costPrice: totalCost.toFixed(2),
                    salesPrice: totalPrice.toFixed(2),
                    calculationBasis: calculationBasis.toFixed(2),
                    outputVAT: outputVAT.toFixed(2)
                });
            });

            // Add Shipping Income to Audit
            const shippingIncome = parseFloat(sale.shipping_income || sale.shipping || sale.shipping_cost || 0);
            if (shippingIncome > 0) {
                const transactionId = `ECR-SHIP-${dateStr}-${String(invoiceCounter).padStart(4, '0')}`;
                invoiceCounter++;
                auditRows.push({
                    transactionId,
                    date: saleDate.toISOString().slice(0, 10),
                    productName: `Envío - Orden: ${sale.orderNumber || (sale.id && typeof sale.id === 'string' ? sale.id.slice(-8) : 'N/A')}`,
                    sku: 'SHIPPING',
                    condition: 'Service',
                    costPrice: '0.00',
                    salesPrice: shippingIncome.toFixed(2),
                    calculationBasis: shippingIncome.toFixed(2),
                    outputVAT: (shippingIncome * 0.20).toFixed(2)
                });
            }
        });

        // Generate CSV content
        const headers = [
            'Transaction ID',
            'Date',
            'Product Name',
            'SKU',
            'Condition',
            'Cost Price (DKK)',
            'Sales Price (DKK)',
            'Calculation Basis (DKK)',
            'Output VAT / Salgsmoms (DKK)'
        ];

        const csvContent = [
            headers.join(','),
            ...auditRows.map(row => [
                row.transactionId,
                row.date,
                `"${row.productName.replace(/"/g, '""')}"`,
                row.sku,
                row.condition,
                row.costPrice,
                row.salesPrice,
                row.calculationBasis,
                row.outputVAT
            ].join(','))
        ].join('\n');

        // Add BOM for Excel UTF-8 compatibility
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `VAT_Audit_Report_Q${selectedQuarter}_${selectedYear}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showToast(`✅ Audit report downloaded: ${auditRows.length} transactions`);
    },

    // ====== INVESTMENTS MODULE ======
    renderInvestments(container) {
        const partners = ['Alejo', 'Facundo', 'Rafael'];
        const investments = this.state.investments || [];

        // Calculate totals per partner
        const totals = partners.reduce((acc, partner) => {
            acc[partner] = investments
                .filter(i => i.partner === partner)
                .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
            return acc;
        }, {});

        const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

        const html = `
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 pt-6">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h2 class="font-display text-3xl font-bold text-brand-dark">💰 Inversiones</h2>
                        <p class="text-slate-500 text-sm">Registro de inversiones de los socios</p>
                    </div>
                    <button onclick="app.openAddInvestmentModal()" class="bg-brand-dark text-white px-5 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg">
                        <i class="ph-bold ph-plus"></i> Nueva Inversión
                    </button>
                </div>

                <!-- Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    ${partners.map(partner => `
                        <div class="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 hover:shadow-md transition-shadow">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-lg">
                                    ${partner.charAt(0)}
                                </div>
                                <h3 class="font-bold text-brand-dark">${partner}</h3>
                            </div>
                            <p class="text-2xl font-display font-bold text-brand-dark">${this.formatCurrency(totals[partner])}</p>
                            <p class="text-xs text-slate-400">${investments.filter(i => i.partner === partner).length} inversiones</p>
                        </div>
                    `).join('')}
                    <div class="bg-brand-dark rounded-2xl shadow-lg p-5 text-white">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                <i class="ph-bold ph-coins"></i>
                            </div>
                            <h3 class="font-bold">Total Invertido</h3>
                        </div>
                        <p class="text-2xl font-display font-bold">${this.formatCurrency(grandTotal)}</p>
                        <p class="text-xs text-white/60">${investments.length} inversiones totales</p>
                    </div>
                </div>

                <!-- Investments per Partner -->
                ${partners.map(partner => {
            const partnerInvestments = investments.filter(i => i.partner === partner)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            return `
                    <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden mb-6">
                        <div class="p-5 border-b border-orange-50 bg-orange-50/30 flex justify-between items-center">
                            <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                <span class="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold">${partner.charAt(0)}</span>
                                ${partner}
                            </h3>
                            <span class="text-lg font-display font-bold text-brand-orange">${this.formatCurrency(totals[partner])}</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left">
                                <thead class="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                                    <tr>
                                        <th class="p-4">Fecha</th>
                                        <th class="p-4">Descripción</th>
                                        <th class="p-4 text-right">Monto</th>
                                        <th class="p-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${partnerInvestments.length === 0 ? `
                                        <tr>
                                            <td colspan="4" class="p-8 text-center text-slate-400 italic">
                                                Sin inversiones registradas
                                            </td>
                                        </tr>
                                    ` : partnerInvestments.map(inv => `
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-4 text-sm text-slate-500">${this.formatDate(inv.date)}</td>
                                            <td class="p-4 text-sm font-medium text-brand-dark">${inv.description}</td>
                                            <td class="p-4 text-sm font-bold text-brand-orange text-right">${this.formatCurrency(inv.amount)}</td>
                                            <td class="p-4 text-center">
                                                <button onclick="app.deleteInvestment('${inv.id}')" class="text-slate-400 hover:text-red-500 transition-colors">
                                                    <i class="ph-bold ph-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    `;
        }).join('')}
            </div>
        `;
        container.innerHTML = html;
    },

    openAddInvestmentModal() {
        const partners = ['Alejo', 'Facundo', 'Rafael'];
        const today = new Date().toISOString().split('T')[0];

        const modalHtml = `
            <div id="add-investment-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onclick="if(event.target === this) this.remove()">
                <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                    <div class="bg-brand-dark p-6 text-white">
                        <h2 class="font-display font-bold text-xl">Nueva Inversión</h2>
                        <p class="text-white/60 text-sm">Registrar aporte de socio</p>
                    </div>
                    <form onsubmit="app.saveInvestment(event)" class="p-6 space-y-4">
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Socio</label>
                            <select name="partner" required class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange transition-all">
                                ${partners.map(p => `<option value="${p}">${p}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Monto (DKK)</label>
                            <input type="number" name="amount" required step="0.01" min="0" placeholder="1000" 
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange transition-all">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Descripción</label>
                            <input type="text" name="description" required placeholder="Compra de vinilos, gastos locación, etc." 
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange transition-all">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Fecha</label>
                            <input type="date" name="date" required value="${today}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange transition-all">
                        </div>
                        <div class="flex gap-3 pt-4">
                            <button type="button" onclick="document.getElementById('add-investment-modal').remove()" 
                                class="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" class="flex-1 py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                <i class="ph-bold ph-plus"></i> Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async saveInvestment(event) {
        event.preventDefault();
        const form = event.target;
        const data = {
            partner: form.partner.value,
            amount: parseFloat(form.amount.value),
            description: form.description.value,
            date: form.date.value,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('investments').add(data);
            document.getElementById('add-investment-modal').remove();
            this.showToast('✅ Inversión registrada');
            await this.loadInvestments();
            this.refreshCurrentView();
        } catch (error) {
            this.showToast('❌ Error: ' + error.message, 'error');
        }
    },

    async deleteInvestment(id) {
        if (!confirm('¿Eliminar esta inversión?')) return;
        try {
            await db.collection('investments').doc(id).delete();
            this.showToast('🗑️ Inversión eliminada');
            await this.loadInvestments();
            this.refreshCurrentView();
        } catch (error) {
            this.showToast('❌ Error: ' + error.message, 'error');
        }
    },

    async loadInvestments() {
        const snapshot = await db.collection('investments').get();
        this.state.investments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    // ====== END INVESTMENTS MODULE ======

    renderShipping(container) {
        // Helper to identify order type
        const isPickup = (s) => {
            return (s.shipping_method?.id === 'local_pickup') ||
                (s.shipping_method && typeof s.shipping_method === 'string' && s.shipping_method.toLowerCase().includes('pickup')) ||
                (s.shippingMethod && s.shippingMethod.toLowerCase().includes('pickup'));
        };

        const isShippable = (s) => !isPickup(s);

        // Helper to check if order is active (not closed)
        // Closed states: 'shipped', 'picked_up'
        const isActive = (s) => !['shipped', 'picked_up'].includes(s.fulfillment_status);

        // Filter Sales
        // 1. Active Pickups (Online + Discogs)
        const activePickups = this.state.sales.filter(s =>
            (s.channel === 'online' || s.channel?.toLowerCase() === 'discogs') &&
            isPickup(s) &&
            isActive(s)
        ).sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first

        // 2. Active Shipping (Online + Discogs)
        const activeShipping = this.state.sales.filter(s =>
            (s.channel === 'online' || s.channel?.toLowerCase() === 'discogs') &&
            isShippable(s) &&
            isActive(s)
        ).sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first

        // 3. History (Recently Closed)
        const history = this.state.sales.filter(s =>
            (s.channel === 'online' || s.channel?.toLowerCase() === 'discogs') &&
            !isActive(s)
        ).sort((a, b) => new Date(b.updated_at?.toDate ? b.updated_at.toDate() : (b.updated_at || b.date)) - new Date(a.updated_at?.toDate ? a.updated_at.toDate() : (a.updated_at || a.date)))
            .slice(0, 20);

        const html = `
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 pt-6 animate-fadeIn">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h2 class="font-display text-3xl font-bold text-brand-dark">Gestión de Envíos</h2>
                        <p class="text-slate-500 text-sm">Administra el flujo de despacho y retiro de órdenes online y Discogs.</p>
                    </div>
                   <div class="flex gap-4">
                        <div class="bg-indigo-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center gap-4">
                            <i class="ph-fill ph-hand-coins text-2xl opacity-80"></i>
                            <div>
                                <p class="text-[10px] text-indigo-100 font-bold uppercase leading-none mb-1">Dinero Envíos (Aprox)</p>
                                <p class="text-2xl font-display font-bold">${this.formatCurrency(this.state.sales.reduce((sum, s) => sum + (parseFloat(s.shipping || s.shipping_cost || 0)), 0))}</p>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-2 rounded-xl shadow-sm border border-orange-100 flex items-center gap-3">
                            <i class="ph-fill ph-clock text-brand-orange text-xl"></i>
                            <div>
                                <p class="text-[10px] text-slate-400 font-bold uppercase leading-none">Pendientes</p>
                                <p class="text-xl font-display font-bold text-brand-dark">${activePickups.length + activeShipping.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECTION 1: PICKUP ORDERS -->
                <div class="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden mb-8">
                    <div class="p-6 bg-blue-50/30 border-b border-blue-50 flex justify-between items-center">
                        <h3 class="font-bold text-brand-dark flex items-center gap-2">
                            <i class="ph-fill ph-storefront text-blue-500 text-xl"></i> 
                            Retiro en Tienda (Pickup)
                            <span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">${activePickups.length}</span>
                        </h3>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-blue-50/50 text-xs uppercase text-slate-500 font-bold">
                                <tr>
                                    <th class="p-4 w-24">Orden</th>
                                    <th class="p-4 w-48">Cliente</th>
                                    <th class="p-4">Items</th>
                                    <th class="p-4 w-32 hidden md:table-cell">Canal</th>
                                    <th class="p-4 text-center w-64">Workflow</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-blue-50">
                                ${activePickups.length > 0 ? activePickups.map(s => {
            const customerInfo = this.getCustomerInfo(s);
            const status = s.fulfillment_status || 'unfulfilled';

            // Workflow Logic
            // 1. Preparing (Default) -> Button "Avisar Preparando"
            // 2. Ready (ready_for_pickup) -> Button "Avisar Listo"
            // 3. Picked Up (picked_up) -> Button "Ya Retiró"

            let actionUI = '';
            if (status === 'preparing') {
                actionUI = `
                                            <div class="flex flex-col gap-2 items-center">
                                                <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">En Preparación</span>
                                                <button onclick="app.notifyPickupReadyDiscogs('${s.id}')" 
                                                        class="w-full bg-brand-orange hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                                                    <i class="ph-bold ph-bell-ringing"></i> Listo para Retirar
                                                </button>
                                            </div>
                                        `;
            } else if (status === 'ready_for_pickup') {
                actionUI = `
                                            <div class="flex flex-col gap-2 items-center">
                                                <span class="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Esperando Retiro</span>
                                                <button onclick="app.markPickedUpDiscogs('${s.id}')" 
                                                        class="w-full bg-brand-dark hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                                                    <i class="ph-bold ph-check-circle"></i> Ya Retiró
                                                </button>
                                            </div>
                                        `;
            } else {
                // Default / Unfulfilled
                actionUI = `
                                            <button onclick="app.notifyPreparingDiscogs('${s.id}')" 
                                                    class="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                                                <i class="ph-bold ph-package"></i> Avisar Preparando
                                            </button>
                                        `;
            }

            return `
                                    <tr class="hover:bg-blue-50/20 transition-colors">
                                        <td class="p-4 font-bold text-brand-dark">
                                            #${s.orderNumber || s.id.slice(0, 6)}
                                            <div class="text-[10px] text-slate-400 font-normal mt-0.5">${this.formatDate(s.date)}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="font-bold text-sm text-brand-dark">${customerInfo.name}</div>
                                            <div class="text-xs text-slate-500 truncate max-w-[150px]" title="${customerInfo.email}">${customerInfo.email}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="flex -space-x-2 overflow-hidden">
                                                ${(s.items || []).slice(0, 3).map(i =>
                `<img src="${i.image || i.cover_image || 'https://elcuartito.dk/default-vinyl.png'}" 
                                                         class="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                                                         title="${i.album}">`
            ).join('')}
                                                ${(s.items || []).length > 3 ? `<span class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] ring-2 ring-white text-slate-500 font-bold">+${s.items.length - 3}</span>` : ''}
                                            </div>
                                            <div class="text-[10px] text-slate-400 mt-1">${s.items?.length || 0} items</div>
                                        </td>
                                        <td class="p-4 hidden md:table-cell">
                                            <span class="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                ${s.channel || 'Online'}
                                            </span>
                                        </td>
                                        <td class="p-4">
                                            ${actionUI}
                                        </td>
                                    </tr>
                                    `;
        }).join('') : `
                                    <tr>
                                        <td colspan="5" class="p-8 text-center text-slate-400 italic">No hay retiros pendientes</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SECTION 2: SHIPPING ORDERS -->
                <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden mb-8">
                     <div class="p-6 bg-orange-50/30 border-b border-orange-50 flex justify-between items-center">
                        <h3 class="font-bold text-brand-dark flex items-center gap-2">
                            <i class="ph-fill ph-truck text-brand-orange text-xl"></i> 
                            Envíos por Correo
                            <span class="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">${activeShipping.length}</span>
                        </h3>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-orange-50/50 text-xs uppercase text-slate-500 font-bold">
                                <tr>
                                    <th class="p-4 w-24">Orden</th>
                                    <th class="p-4 w-48">Cliente</th>
                                    <th class="p-4">Items</th>
                                    <th class="p-4 hidden md:table-cell">Destino</th>
                                    <th class="p-4 text-center w-64">Workflow</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-orange-50">
                                ${activeShipping.length > 0 ? activeShipping.map(s => {
            const customerInfo = this.getCustomerInfo(s);
            const status = s.fulfillment_status || 'unfulfilled';

            // Workflow Logic
            // 1. Preparing (Default) -> Button "Avisar Preparando"
            // 2. In Transit -> Button "Cargar Tracking" -> Updates to in_transit
            // 3. Shipped (Closed) -> Button "Marcar Despachado"

            let actionUI = '';
            if (status === 'preparing') {
                actionUI = `
                                            <div class="flex flex-col gap-2">
                                                 <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 text-center">En Preparación</span>
                                                 <div class="flex flex-col gap-1 w-full">
                                                     <input type="text" id="tracking-${s.id}" placeholder="Tracking #" 
                                                           value="${s.tracking_number || ''}"
                                                           class="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:border-brand-orange outline-none font-mono">
                                                     
                                                     <div class="flex gap-1">
                                                         <input type="text" id="tracking-link-${s.id}" placeholder="Link (Opcional)" 
                                                               class="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:border-brand-orange outline-none font-mono text-slate-500">
                                                         <button onclick="app.notifyShippedDiscogs('${s.id}', 'tracking-${s.id}', 'tracking-link-${s.id}')" 
                                                                 class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors shrink-0" title="Enviar Tracking">
                                                             <i class="ph-bold ph-paper-plane-right"></i>
                                                         </button>
                                                     </div>
                                                </div>
                                            </div>
                                        `;
            } else if (status === 'in_transit') {
                actionUI = `
                                            <div class="flex flex-col gap-2 items-center">
                                                <span class="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">En Tránsito</span>
                                                <div class="text-[10px] font-mono text-slate-500">${s.tracking_number}</div>
                                                <button onclick="app.markDispatchedDiscogs('${s.id}')" 
                                                        class="w-full bg-brand-dark hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                                                    <i class="ph-bold ph-archive"></i> Finalizar (Despachado)
                                                </button>
                                            </div>
                                        `;
            } else {
                // Default / Unfulfilled
                actionUI = `
                                            <button onclick="app.notifyPreparingDiscogs('${s.id}')" 
                                                    class="w-full bg-brand-orange hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                                                <i class="ph-bold ph-package"></i> Avisar Preparando
                                            </button>
                                        `;
            }

            return `
                                    <tr class="hover:bg-orange-50/20 transition-colors">
                                        <td class="p-4 font-bold text-brand-dark">
                                            #${s.orderNumber || s.id.slice(0, 6)}
                                            <div class="text-[10px] text-slate-400 font-normal mt-0.5">${this.formatDate(s.date)}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="font-bold text-sm text-brand-dark">${customerInfo.name}</div>
                                            <div class="text-xs text-slate-500 truncate max-w-[150px]" title="${customerInfo.email}">${customerInfo.email}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="flex -space-x-2 overflow-hidden">
                                                ${(s.items || []).slice(0, 3).map(i =>
                `<img src="${i.image || i.cover_image || 'https://elcuartito.dk/default-vinyl.png'}" 
                                                         class="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                                                         title="${i.album}">`
            ).join('')}
                                                ${(s.items || []).length > 3 ? `<span class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] ring-2 ring-white text-slate-500 font-bold">+${s.items.length - 3}</span>` : ''}
                                            </div>
                                            <div class="text-[10px] text-slate-400 mt-1">${s.items?.length || 0} items</div>
                                        </td>
                                        <td class="p-4 hidden md:table-cell text-xs text-slate-500">
                                            ${s.city || ''}, ${s.country || 'DK'}
                                        </td>
                                        <td class="p-4">
                                            ${actionUI}
                                        </td>
                                    </tr>
                                    `;
        }).join('') : `
                                    <tr>
                                        <td colspan="5" class="p-8 text-center text-slate-400 italic">No hay envíos pendientes</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SECTION 3: HISTORY (Last 20) -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8 opacity-75 hover:opacity-100 transition-opacity">
                    <div class="p-6 bg-slate-50 border-b border-slate-100">
                         <h3 class="font-bold text-slate-600 flex items-center gap-2">
                            <i class="ph-fill ph-clock-counter-clockwise"></i> Historial Reciente (Completados)
                        </h3>
                    </div>
                     <div class="overflow-x-auto">
                        <table class="w-full text-left">
                             <thead class="bg-slate-50 text-xs uppercase text-slate-400 font-bold">
                                <tr>
                                    <th class="p-4">Orden</th>
                                    <th class="p-4">Ref</th>
                                    <th class="p-4 text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                ${history.map(s => `
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${s.id}')" title="Ver historial">
                                        <td class="p-4 text-sm font-medium text-slate-500">
                                            #${s.orderNumber || s.id.slice(0, 8)}
                                            <i class="ph-bold ph-clock-counter-clockwise text-xs ml-1 text-slate-300"></i>
                                        </td>
                                        <td class="p-4 text-xs text-slate-400">
                                            ${this.formatDate(s.updated_at?.toDate ? s.updated_at.toDate() : (s.updated_at || s.date))}
                                        </td>
                                        <td class="p-4 text-right">
                                            <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${s.fulfillment_status === 'shipped' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">
                                                ${s.fulfillment_status === 'shipped' ? 'Despachado' : 'Retirado'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    openOrderHistoryModal(saleId) {
        const sale = this.state.sales.find(s => s.id === saleId);
        if (!sale) return;

        const history = sale.history || [];
        const createdDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.date);

        // Build generic timeline entries if history is empty (Legacy support)
        let timelineItems = [];

        if (history.length > 0) {
            // New orders with history tracking
            timelineItems = history.map(h => ({
                status: h.status,
                timestamp: new Date(h.timestamp),
                note: h.note
            })).sort((a, b) => b.timestamp - a.timestamp); // Newest first
        } else {
            // Legacy fallback
            timelineItems.push({
                status: sale.fulfillment_status,
                timestamp: sale.updated_at?.toDate ? sale.updated_at.toDate() : new Date(),
                note: 'Última actualización'
            });
        }

        // Always add creation event at end
        timelineItems.push({
            status: 'created',
            timestamp: createdDate,
            note: `Orden recibida via ${sale.channel || 'Online'}`
        });


        const getStatusIcon = (status) => {
            if (status === 'created') return 'ph-shopping-cart';
            if (status === 'preparing') return 'ph-package';
            if (status === 'ready_for_pickup') return 'ph-storefront';
            if (status === 'in_transit') return 'ph-truck';
            if (status === 'shipped') return 'ph-archive';
            if (status === 'picked_up') return 'ph-check-circle';
            return 'ph-info';
        };

        const getStatusColor = (status) => {
            if (status === 'created') return 'bg-slate-100 text-slate-500';
            if (status === 'preparing') return 'bg-blue-100 text-blue-600';
            if (status === 'ready_for_pickup') return 'bg-emerald-100 text-emerald-600';
            if (status === 'in_transit') return 'bg-orange-100 text-orange-600';
            if (status === 'shipped' || status === 'picked_up') return 'bg-green-100 text-green-600';
            return 'bg-slate-100';
        };

        const getStatusLabel = (status) => {
            const map = {
                'created': 'Orden Creada',
                'preparing': 'En Preparación',
                'ready_for_pickup': 'Listo para Retiro',
                'in_transit': 'En Tránsito',
                'shipped': 'Despachado',
                'picked_up': 'Retirado',
            };
            return map[status] || status;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.innerHTML = `
            <div class="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div class="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-xl text-brand-dark">Historial de Orden</h3>
                        <p class="text-sm text-slate-500">#${sale.orderNumber || sale.id.slice(0, 8)}</p>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
                
                <div class="p-8 max-h-[60vh] overflow-y-auto">
                    <div class="relative pl-4 border-l-2 border-slate-100 space-y-8">
                        ${timelineItems.map((item, index) => `
                            <div class="relative">
                                <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${index === 0 ? 'bg-brand-orange ring-4 ring-orange-50' : 'bg-slate-300'}"></div>
                                
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-bold px-2 py-0.5 rounded-full ${getStatusColor(item.status)}">
                                            ${getStatusLabel(item.status)}
                                        </span>
                                        <span class="text-xs text-slate-400 font-mono">
                                            ${item.timestamp.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    <p class="text-sm text-slate-600 mt-1">${item.note || '-'}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="mt-8 pt-6 border-t border-slate-50 flex justify-between items-end">
                       <div class="text-xs text-slate-400">
                            Cliente: <span class="font-bold text-slate-600">${sale.customerName || sale.customer?.name || (sale.customer?.firstName + ' ' + sale.customer?.lastName)}</span><br>
                            Email: ${sale.customerEmail || sale.customer?.email}
                       </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    fetchDiscogsById(manualId = null) {
        const id = manualId || document.getElementById('discogs-search-input').value.trim();
        const resultsContainer = document.getElementById('discogs-results');
        if (!id || !/^\d+$/.test(id)) {
            this.showToast('⚠️ Ingresa un ID numérico válido', 'error');
            return;
        }

        const token = localStorage.getItem('discogs_token');
        if (!token) {
            this.showToast('⚠️ Token no configurado', 'error');
            return;
        }

        if (resultsContainer) {
            resultsContainer.innerHTML = '<p class="text-xs text-slate-400 animate-pulse p-2">Importando Release por ID...</p>';
            resultsContainer.classList.remove('hidden');
        }

        fetch(`${BASE_API_URL}/discogs/release/${id}`)
            .then(res => {
                if (!res.ok) throw new Error(`Error ${res.status}`);
                return res.json();
            })
            .then(data => {
                // Normalize data structure for handleDiscogsSelection
                const normalized = {
                    id: data.id,
                    title: `${data.artists_sort || data.artists[0]?.name} - ${data.title}`,
                    year: data.year,
                    thumb: data.thumb,
                    cover_image: data.images ? data.images[0].uri : null,
                    label: data.labels ? [data.labels[0].name] : [],
                    format: data.formats ? [data.formats[0].name] : []
                };
                this.handleDiscogsSelection(normalized);
                if (resultsContainer) resultsContainer.classList.add('hidden');
                this.showToast('✅ Datos importados con éxito');
            })
            .catch(err => {
                console.error(err);
                this.showToast('❌ Error al importar ID: ' + err.message, 'error');
                if (resultsContainer) resultsContainer.classList.add('hidden');
            });
    },

    openBulkImportModal() {
        const modal = document.createElement('div');
        modal.id = 'bulk-import-modal';
        modal.className = 'fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div class="bg-emerald-500 p-6 text-white flex justify-between items-center">
                    <div>
                        <h3 class="font-display text-2xl font-bold">Carga Masiva (CSV)</h3>
                        <p class="text-emerald-100 text-sm">Pega el contenido de tu archivo CSV aquí.</p>
                    </div>
                    <button onclick="document.getElementById('bulk-import-modal').remove()" class="text-white/80 hover:text-white transition-colors">
                        <i class="ph-bold ph-x text-2xl"></i>
                    </button>
                </div>
                <div class="p-8 space-y-6">
                    <div class="space-y-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest">Contenido del CSV</label>
                        <textarea id="bulk-csv-data" rows="10" placeholder="Artículo;Identificador;Estado;Condición Funda;Comentarios;Precio costo;Precio Venta..." 
                            class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-mono focus:border-emerald-500 outline-none transition-all resize-none"></textarea>
                    </div>
                    
                    <div class="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                        <i class="ph-fill ph-info text-blue-500 text-xl"></i>
                        <p class="text-xs text-blue-700 leading-relaxed">
                            <strong>Nota:</strong> El sistema publicará automáticamente cada disco en Discogs y en tu WebShop. 
                            Este proceso puede tardar unos segundos por cada disco debido a las limitaciones de la API de Discogs.
                        </p>
                    </div>

                    <div class="flex gap-4">
                        <button onclick="document.getElementById('bulk-import-modal').remove()" class="flex-1 px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button id="start-bulk-import-btn" onclick="app.handleBulkImportBatch()" class="flex-1 bg-emerald-500 text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                            <i class="ph-bold ph-rocket-launch"></i> Comenzar Importación
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async handleBulkImportBatch() {
        const csvData = document.getElementById('bulk-csv-data').value.trim();
        if (!csvData) {
            this.showToast('Por favor, pega el contenido del CSV.', 'error');
            return;
        }

        const btn = document.getElementById('start-bulk-import-btn');
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Importando...';

        try {
            const response = await fetch(`${BASE_API_URL}/discogs/bulk-import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csvData })
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast(`✅ ${result.summary}`);
                document.getElementById('bulk-import-modal').remove();
                await this.loadData();
                this.refreshCurrentView();
            }
        } catch (error) {
            console.error('Bulk import error:', error);
            this.showToast('❌ ' + error.message, 'error');
            const btn = document.getElementById('start-bulk-import-btn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-rocket-launch"></i> Comenzar Importación';
            }
        }
    },

    async refreshProductMetadata(productId) {
        const btn = document.getElementById('refresh-metadata-btn');
        if (!btn) return;

        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> ...';

        try {
            // Find the item in state to get document ID if needed
            let finalId = productId;
            const item = this.state.inventory.find(i => i.sku === productId || i.id === productId);
            if (item && item.id) {
                finalId = item.id;
            }

            const response = await fetch(`${BASE_API_URL}/discogs/refresh-metadata/${finalId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast('✅ Metadata actualizada correctamente');

                // Remove modal to force refresh
                const modal = document.getElementById('modal-overlay');
                if (modal) modal.remove();

                // Reload data
                await this.loadData();
                this.refreshCurrentView();

                // Reopen modal to show new data
                if (item) {
                    this.openProductModal(item.sku);
                }
            } else {
                throw new Error(result.error || 'Error al actualizar metadata');
            }
        } catch (error) {
            console.error('Refresh metadata error:', error);
            this.showToast('❌ ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    }

};

// Make app global for HTML event attributes
window.app = app;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
