/**
 * El Cuartito - App Logic (Upgraded)
 */

// Initial Data from CSV
const INITIAL_INVENTORY = [
    { sku: "SKU-0001", artist: "Ricardo Villalobos", album: "Late Night Grooves EP", genre: "Minimal/Techno", status: "NM", cost: 180, price: 270, stock: 1, supplier: "Distribuidor DK", owner: "Miguel", channel: "Discogs + Local" },
    { sku: "SKU-0002", artist: "Priku", album: "Bucharest Loops", genre: "Minimal rumano", status: "G", cost: 150, price: 225, stock: 1, supplier: "Acervo Vesterbro", owner: "Morten", channel: "Discogs" },
    { sku: "SKU-0003", artist: "Sublee", album: "Deep Patterns", genre: "Minimal/House", status: "NM", cost: 140, price: 210, stock: 1, supplier: "Distribuidor DK", owner: "Santaolalla", channel: "Local" },
    { sku: "SKU-0004", artist: "Kirk", album: "Analog Heat", genre: "Techno", status: "VG", cost: 170, price: 255, stock: 1, supplier: "Vinyl Supply", owner: "Alejo", channel: "Local" },
    { sku: "SKU-0005", artist: "Various Artists", album: "Nordic House Sessions Vol.1", genre: "House", status: "VG+", cost: 120, price: 180, stock: 1, supplier: "Acervo Vesterbro", owner: "Alejo", channel: "Local" },
    { sku: "SKU-0006", artist: "Ricardo Villalobos & Friends", album: "Groove Ritual", genre: "Minimal/Techno", status: "VG", cost: 210, price: 315, stock: 1, supplier: "Distribuidor DK", owner: "El Cuartito", channel: "Local" },
    { sku: "SKU-0007", artist: "Priku", album: "Eastern Echoes EP", genre: "Minimal rumano", status: "NM", cost: 140, price: 210, stock: 1, supplier: "Distribuidor DK", owner: "El Cuartito", channel: "Local" },
    { sku: "SKU-0008", artist: "Sublee", album: "Late Afternoon Mix", genre: "Deep House", status: "G", cost: 125, price: 200, stock: 1, supplier: "Acervo Vesterbro", owner: "El Cuartito", channel: "Local" },
    { sku: "SKU-0009", artist: "Kirk", album: "Basement Frequencies", genre: "Techno", status: "NM", cost: 160, price: 240, stock: 1, supplier: "Vinyl Supply", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0010", artist: "Local DJ Collective", album: "Vesterbro Sounds", genre: "House/Techno", status: "B", cost: 110, price: 165, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0011", artist: "Ricardo Villalobos", album: "Peruvian Nights", genre: "Minimal", status: "NM", cost: 200, price: 300, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0012", artist: "Priku & Guest", album: "Club Shadows", genre: "Minimal rumano", status: "B", cost: 155, price: 232.5, stock: 1, supplier: "Distribuidor DK", owner: "alejo", channel: "Local" },
    { sku: "SKU-0013", artist: "Sublee", album: "Ocean Drive", genre: "Minimal/Chill", status: "NM", cost: 110, price: 165, stock: 1, supplier: "Acervo Vesterbro", owner: "Miguel", channel: "Local" },
    { sku: "SKU-0014", artist: "Kirk", album: "Circuit City", genre: "Techno industrial", status: "G", cost: 180, price: 270, stock: 1, supplier: "Vinyl Supply", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0015", artist: "DJ Import", album: "Global House Beats Vol.2", genre: "House", status: "VG", cost: 130, price: 195, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0016", artist: "Ricardo Villalobos", album: "Sunset Edits", genre: "Minimal/Edits", status: "NM", cost: 210, price: 315, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0017", artist: "Priku", album: "Underground Letters", genre: "Minimal rumano", status: "VG+", cost: 145, price: 217.5, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0018", artist: "Sublee", album: "Room 17 Mix", genre: "Deep House", status: "VG+", cost: 130, price: 195, stock: 1, supplier: "Vinyl Supply", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0019", artist: "Kirk", album: "Night Shift", genre: "Techno", status: "VG+", cost: 170, price: 255, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0020", artist: "Various Artists", album: "Wax & Coffee", genre: "Lounge/House", status: "VG+", cost: 100, price: 150, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0021", artist: "Ricardo Villalobos", album: "Minimal Moods", genre: "Minimal", status: "NM", cost: 195, price: 292.5, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0022", artist: "Priku", album: "B-side Stories", genre: "Minimal rumano", status: "G", cost: 140, price: 210, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0023", artist: "Sublee", album: "Sunrise EP", genre: "Deep House", status: "NM", cost: 120, price: 180, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0024", artist: "Kirk", album: "Rough Cuts", genre: "Techno/Minimal", status: "S", cost: 175, price: 262.5, stock: 1, supplier: "Vinyl Supply", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0025", artist: "DJ Vesterbro", album: "Midnight Mixes", genre: "House/Techno", status: "S", cost: 125, price: 187.5, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0026", artist: "Ricardo Villalobos", album: "Groove Anatomy", genre: "Minimal", status: "VG", cost: 200, price: 300, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0027", artist: "Priku", album: "Concrete Waves", genre: "Minimal rumano", status: "VG", cost: 150, price: 225, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0028", artist: "Sublee & Kirk", album: "Split EP", genre: "Minimal/Techno", status: "VG+", cost: 160, price: 240, stock: 1, supplier: "Vinyl Supply", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0029", artist: "Various Artists", album: "Copenhagen Clubcuts", genre: "Techno/House", status: "VG", cost: 115, price: 172.5, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0030", artist: "Curated Selection", album: "El Cuartito Picks Vol.1", genre: "Eclectic", status: "VG+", cost: 135, price: 202.5, stock: 0, supplier: "El Cuartito Records", owner: "Manuel ", channel: "Discogs" }
];

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBj0bgdOtb5snSrn3tteblFdVUtA0BpFss",
    authDomain: "el-cuartito-app.firebaseapp.com",
    projectId: "el-cuartito-app",
    storageBucket: "el-cuartito-app.firebasestorage.app",
    messagingSenderId: "116723400888",
    appId: "1:116723400888:web:47ec6d99818d391d6ab44d"
};

// Initialize Firebase
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} catch (err) {
    console.error("Firebase Init Error:", err);
}

const app = {
    state: {
        inventory: [],
        sales: [],
        expenses: [],
        consignors: [],
        customGenres: [],
        customCategories: [],
        vatActive: true,
        currentView: 'dashboard',
        filterMonths: [new Date().getMonth()],
        filterYear: new Date().getFullYear(),
        inventorySearch: '',
        salesHistorySearch: '',
        expensesSearch: '',
        events: [],
        selectedDate: new Date()
    },

    init() {
        if (typeof db !== 'undefined') {
            this.setupListeners();
        } else {
            console.warn("Firebase DB not initialized. Loading offline data.");
            this.state.inventory = INITIAL_INVENTORY;
            this.showToast('Modo Offline: Base de datos no conectada');
        }

        this.renderDashboard(document.getElementById('app-content'));
        this.setupMobileMenu();
        this.setupNavigation();
    },



    setupListeners() {
        // Inventory Listener
        db.collection('inventory').onSnapshot(snapshot => {
            this.state.inventory = [];
            snapshot.forEach(doc => {
                this.state.inventory.push(doc.data());
            });
            this.refreshCurrentView();
        });

        // Sales Listener
        db.collection('sales').onSnapshot(snapshot => {
            this.state.sales = [];
            snapshot.forEach(doc => {
                this.state.sales.push({ id: doc.id, ...doc.data() });
            });
            this.refreshCurrentView();
        });

        // Expenses Listener
        db.collection('expenses').onSnapshot(snapshot => {
            this.state.expenses = [];
            snapshot.forEach(doc => {
                this.state.expenses.push({ id: doc.id, ...doc.data() });
            });
            this.refreshCurrentView();
        });

        // Consignors Listener
        db.collection('consignors').onSnapshot(snapshot => {
            this.state.consignors = [];
            snapshot.forEach(doc => {
                this.state.consignors.push({ id: doc.id, ...doc.data() });
            });
            this.refreshCurrentView();
        });

        // Settings Listener (for custom genres/categories)
        db.collection('settings').doc('general').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                this.state.customGenres = data.customGenres || [];
                this.state.customCategories = data.customCategories || [];
                this.state.discogsToken = data.discogsToken || '';
            }
        });

        // Events Listener
        // Events Listener
        db.collection('events').onSnapshot(snapshot => {
            this.state.events = [];
            snapshot.forEach(doc => {
                this.state.events.push({ id: doc.id, ...doc.data() });
            });
            if (this.state.currentView === 'calendar') {
                this.renderCalendar(document.getElementById('app-content'));
            }
        }, error => {
            console.error("Events listener error:", error);
        });
    },

    refreshCurrentView() {
        const container = document.getElementById('app-content');
        if (!container) return;

        switch (this.state.currentView) {
            case 'dashboard': this.renderDashboard(container); break;
            case 'inventory': this.renderInventory(container); break;
            case 'sales': this.renderSales(container); break;
            case 'expenses': this.renderExpenses(container); break;
            case 'consignments': this.renderConsignments(container); break;
            case 'calendar': this.renderCalendar(container); break;
            case 'vat': this.renderVAT(container); break;
        }
    },

    saveData() {
        // No-op: Data is saved directly to Firestore in action methods
    },

    loadData() {
        // No-op: Data is loaded via listeners
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

        switch (view) {
            case 'dashboard': this.renderDashboard(content); break;
            case 'sales': this.renderSales(content); break;
            case 'inventory': this.renderInventory(content); break;
            case 'expenses': this.renderExpenses(content); break;
            case 'consignments': this.renderConsignments(content); break;
            case 'calendar': this.renderCalendar(content); break;
            case 'vat': this.renderVAT(content); break;
            case 'backup': this.renderBackup(content); break;
        }
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
                this.showToast('Evento agregado');
                document.getElementById('modal-overlay').remove();
            })
            .catch(err => console.error(err));
    },

    deleteEvent(id) {
        if (!confirm('¿Eliminar este evento?')) return;
        db.collection('events').doc(id).delete()
            .then(() => this.showToast('Evento eliminado'))
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
                    <p class="text-red-600/80 text-sm mb-4">Esta acción borrará TODOS los datos de la base de datos (Inventario, Ventas, Gastos, Socios). No se puede deshacer.</p>
                    
                    <button onclick="app.resetApplication()" class="w-full bg-white border-2 border-red-200 text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                        <i class="ph-fill ph-trash text-xl"></i>
                        Restablecer de Fábrica
                    </button>
                </div>
            </div>
        `;
        container.innerHTML = html;
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
                        const ref = db.collection('inventory').doc(item.sku);
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

    // Calculates the VAT component (20% of gross) if VAT is active
    getVatComponent(amount) {
        if (!this.state.vatActive) return 0;
        return amount * 0.20;
    },

    getNetPrice(amount) {
        if (!this.state.vatActive) return amount;
        return amount * 0.80;
    },

    // 50,000 DKK Threshold Logic (Rolling 12 months)
    getRolling12MonthSales() {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        return this.state.sales
            .filter(s => new Date(s.date) >= oneYearAgo)
            .reduce((sum, s) => sum + this.getNetPrice(s.total), 0);
    },

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

    renderDashboard(container) {
        // Calculate Metrics based on Filters
        const selectedMonths = this.state.filterMonths;
        const currentYear = this.state.filterYear;
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const filteredSales = this.state.sales.filter(s => {
            const d = new Date(s.date);
            return d.getFullYear() === currentYear && selectedMonths.includes(d.getMonth());
        });

        // Sort sales by date descending (newest first)
        const sortedSales = [...filteredSales].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Financial Calculations
        const totalRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

        // Calculate Partners Share (Cost of goods for consignment items)
        // Handles both flat sales (new) and nested items (old)
        const partnersShare = filteredSales.reduce((sum, s) => {
            // Check top-level owner first (new structure)
            // Case-insensitive check for 'El Cuartito'
            const owner = s.owner || '';
            if (owner && owner.toLowerCase() !== 'el cuartito') {
                return sum + (Number(s.cost) || 0);
            }
            // Fallback to items array (old structure or multi-item sales)
            if (s.items && Array.isArray(s.items)) {
                return sum + s.items.reduce((isum, i) => {
                    const iOwner = i.owner || '';
                    return (iOwner && iOwner.toLowerCase() !== 'el cuartito') ? isum + (Number(i.cost) || 0) : isum;
                }, 0);
            }
            return sum;
        }, 0);

        // Calculate Tax (VAT) - Simplified estimation based on total revenue if VAT active
        const taxAmount = this.state.vatActive ? (totalRevenue - (totalRevenue / 1.25)) : 0; // Assuming 25% VAT included

        // El Cuartito Share = Revenue - Partners Share - Tax
        const cuartitoShare = totalRevenue - partnersShare - taxAmount;

        // Stock Metrics
        const totalStockValueSale = this.state.inventory.reduce((sum, i) => sum + (i.price * i.stock), 0);
        const totalStockValueCost = this.state.inventory.reduce((sum, i) => sum + (i.cost * i.stock), 0);
        const totalItems = this.state.inventory.reduce((sum, i) => sum + i.stock, 0);

        const periodText = selectedMonths.length === 12
            ? `Año ${currentYear}`
            : `${selectedMonths.map(m => this.getMonthName(m)).join(', ')} ${currentYear}`;

        const html = `
            <div class="max-w-7xl mx-auto space-y-6 pb-24 md:pb-8 px-4 md:px-8 pt-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="flex items-center gap-4">
                        <button onclick="app.navigate('dashboard')" class="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center text-white text-2xl shadow-lg shadow-brand-orange/30 hover:scale-105 transition-transform">
                            <i class="ph-fill ph-vinyl-record"></i>
                        </button>
                        <div>
                            <h2 class="font-display text-3xl font-bold text-brand-dark">Dashboard</h2>
                            <p class="text-slate-500">Resumen de <span class="font-bold text-brand-orange">${periodText}</span></p>
                        </div>
                    </div>

                    <!-- Date Selectors -->
                    <div class="flex flex-col gap-2 self-end md:self-auto">
                         <div class="flex gap-2 bg-white p-1 rounded-lg border border-orange-100 shadow-sm self-end">
                            <select id="dashboard-year" onchange="app.updateFilter('year', this.value)" class="bg-transparent text-sm font-medium text-slate-600 p-2 outline-none">
                                <option value="2024" ${this.state.filterYear === 2024 ? 'selected' : ''}>2024</option>
                                <option value="2025" ${this.state.filterYear === 2025 ? 'selected' : ''}>2025</option>
                            </select>
                        </div>
                        <div class="flex flex-wrap gap-1 max-w-md justify-end">
                            ${monthNames.map((m, i) => `
                                <button onclick="app.toggleMonthFilter(${i})" 
                                    class="px-2 py-1 rounded text-[10px] font-bold transition-all ${selectedMonths.includes(i) ? 'bg-brand-orange text-white' : 'bg-white border border-orange-100 text-slate-400 hover:text-brand-orange'}">
                                    ${m}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Quick Actions (Top) -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onclick="app.openAddSaleModal()" class="bg-white p-3 rounded-xl border border-slate-200 hover:border-brand-orange hover:text-brand-orange transition-colors flex items-center gap-3 shadow-sm group">
                        <div class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-colors">
                            <i class="ph-bold ph-plus-circle text-lg"></i>
                        </div>
                        <span class="font-bold text-sm">Nueva Venta</span>
                    </button>
                    <button onclick="app.openAddVinylModal()" class="bg-white p-3 rounded-xl border border-slate-200 hover:border-brand-orange hover:text-brand-orange transition-colors flex items-center gap-3 shadow-sm group">
                        <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <i class="ph-bold ph-disc text-lg"></i>
                        </div>
                        <span class="font-bold text-sm">Agregar Disco</span>
                    </button>
                    <button onclick="app.openAddExpenseModal()" class="bg-white p-3 rounded-xl border border-slate-200 hover:border-brand-orange hover:text-brand-orange transition-colors flex items-center gap-3 shadow-sm group">
                        <div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                            <i class="ph-bold ph-receipt text-lg"></i>
                        </div>
                        <span class="font-bold text-sm">Registrar Gasto</span>
                    </button>
                    <button onclick="app.openAddConsignorModal()" class="bg-white p-3 rounded-xl border border-slate-200 hover:border-brand-orange hover:text-brand-orange transition-colors flex items-center gap-3 shadow-sm group">
                        <div class="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                            <i class="ph-bold ph-users text-lg"></i>
                        </div>
                        <span class="font-bold text-sm">Nuevo Socio</span>
                    </button>
                </div>

                <!-- Main Metrics Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    <!-- Financial Breakdown -->
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 class="font-bold text-lg text-brand-dark mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-chart-pie-slice text-brand-orange"></i> Desglose Financiero
                        </h3>
                        
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <p class="text-sm text-slate-500 uppercase font-bold">Ventas Totales</p>
                                <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(totalRevenue)}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-slate-400 uppercase font-bold">Ganancia Neta</p>
                                <p class="text-xl font-bold text-green-600">${this.formatCurrency(cuartitoShare)}</p>
                            </div>
                        </div>

                        <div class="space-y-3">
                            <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                                <span class="text-sm font-bold text-green-700">El Cuartito</span>
                                <span class="font-bold text-green-700">${this.formatCurrency(cuartitoShare)}</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <span class="text-sm font-bold text-blue-700">Socios (Pagos)</span>
                                <span class="font-bold text-blue-700">${this.formatCurrency(partnersShare)}</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <span class="text-sm font-bold text-slate-600">Impuestos (Estimado)</span>
                                <span class="font-bold text-slate-600">${this.formatCurrency(taxAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Stock Overview -->
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                        <div>
                            <h3 class="font-bold text-lg text-brand-dark mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-stack text-blue-500"></i> Estado del Stock
                            </h3>
                            
                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <p class="text-xs text-slate-500 font-bold uppercase">Valor Venta</p>
                                    <p class="text-xl font-bold text-brand-dark">${this.formatCurrency(totalStockValueSale)}</p>
                                </div>
                                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <p class="text-xs text-slate-500 font-bold uppercase">Valor Costo</p>
                                    <p class="text-xl font-bold text-slate-600">${this.formatCurrency(totalStockValueCost)}</p>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 bg-purple-50 rounded-xl border border-purple-100 flex justify-between items-center mt-auto">
                            <span class="text-sm font-bold text-purple-700 uppercase">Total Discos</span>
                            <span class="text-2xl font-bold text-purple-700">${totalItems}</span>
                        </div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h4 class="font-bold text-sm text-slate-500 uppercase mb-4 text-center">Por Género</h4>
                        <div class="h-40 flex items-center justify-center">
                            <canvas id="genreChart"></canvas>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h4 class="font-bold text-sm text-slate-500 uppercase mb-4 text-center">Por Método Pago</h4>
                        <div class="h-40 flex items-center justify-center">
                            <canvas id="paymentChart"></canvas>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h4 class="font-bold text-sm text-slate-500 uppercase mb-4 text-center">Por Canal</h4>
                        <div class="h-40 flex items-center justify-center">
                            <canvas id="channelChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Recent Sales -->
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-lg text-brand-dark">Últimas Ventas</h3>
                        <button onclick="app.navigate('sales')" class="text-sm font-bold text-brand-orange hover:underline">Ver todas</button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="text-xs text-slate-400 border-b border-slate-100">
                                    <th class="py-2 font-bold uppercase">Items</th>
                                    <th class="py-2 font-bold uppercase">Fecha</th>
                                    <th class="py-2 font-bold uppercase text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody class="text-sm">
                                ${sortedSales.slice(0, 5).map(sale => `
                                    <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td class="py-3 font-medium text-brand-dark max-w-[200px] truncate">
                                            ${sale.album || (sale.items && sale.items[0] ? sale.items[0].album : 'Venta rápida')}
                                        </td>
                                        <td class="py-3 text-slate-500">${this.formatDate(sale.date)}</td>
                                        <td class="py-3 font-bold text-brand-dark text-right">${this.formatCurrency(sale.total)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="3" class="text-center py-4 text-slate-400">No hay ventas recientes</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        this.renderDashboardCharts(filteredSales);
    },

    renderInventory(container) {
        // Collect unique values for dynamic filters
        const allGenres = [...new Set(this.state.inventory.map(i => i.genre).filter(Boolean))].sort();
        const allLabels = [...new Set(this.state.inventory.map(i => i.storeLabel).filter(Boolean))].sort();

        const filteredInventory = this.state.inventory.filter(item => {
            const search = this.state.inventorySearch.toLowerCase();
            const matchesSearch = item.artist.toLowerCase().includes(search) ||
                item.album.toLowerCase().includes(search) ||
                item.sku.toLowerCase().includes(search);

            // Safe access to state with defaults
            const currentGenreFilter = this.state.filterGenre || 'all';
            const currentLabelFilter = this.state.filterStoreLabel || 'all';

            const matchesGenre = currentGenreFilter === 'all' || item.genre === currentGenreFilter;
            const matchesLabel = currentLabelFilter === 'all' || item.storeLabel === currentLabelFilter;

            return matchesSearch && matchesGenre && matchesLabel;
        });

        const html = `
            <div class="max-w-7xl mx-auto pb-24 md:pb-8 px-4 md:px-8 pt-10">
                <!-- Header & Search -->
                <div class="sticky top-0 bg-slate-50 z-20 pb-4 pt-4 -mx-4 px-4 md:mx-0 md:px-0" id="inventory-header">
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <h2 class="font-display text-2xl font-bold text-brand-dark">Inventario</h2>
                            <p class="text-slate-500 text-sm">${filteredInventory.length} discos</p>
                        </div>
                        <button onclick="app.openAddVinylModal()" class="bg-brand-dark text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">
                            <i class="ph-bold ph-plus text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="relative">
                            <i class="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                            <input type="text" 
                                placeholder="Buscar..." 
                                value="${this.state.inventorySearch}"
                                oninput="app.state.inventorySearch = this.value; app.refreshCurrentView()"
                                class="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-brand-dark placeholder:text-slate-400 focus:ring-2 focus:ring-brand-orange/20 outline-none">
                        </div>
                        
                        <!-- Filters -->
                        <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <select onchange="app.state.filterGenre = this.value; app.refreshCurrentView()" 
                                class="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-600 outline-none focus:border-brand-orange min-w-[120px]">
                                <option value="all">Todos los Géneros</option>
                                ${allGenres.map(g => `<option value="${g}" ${this.state.filterGenre === g ? 'selected' : ''}>${g}</option>`).join('')}
                            </select>

                            <select onchange="app.state.filterStoreLabel = this.value; app.refreshCurrentView()" 
                                class="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-600 outline-none focus:border-brand-orange min-w-[120px]">
                                <option value="all">Todas las Ubicaciones</option>
                                ${allLabels.map(l => `<option value="${l}" ${this.state.filterStoreLabel === l ? 'selected' : ''}>${l}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Mobile List View (Simple Cards) -->
                <div class="space-y-3 md:hidden mt-2">
                    ${filteredInventory.map(item => `
                        <div class="bg-white p-4 rounded-xl border border-slate-200 flex gap-4 items-center active:scale-95 transition-transform" onclick="app.openVinylDetails('${item.sku}')">
                            <div class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                                ${item.coverUrl ? `<img src="${item.coverUrl}" class="w-full h-full object-cover">` : '<i class="ph-fill ph-music-note text-xl"></i>'}
                            </div>
                            
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-start">
                                    <h3 class="font-bold text-brand-dark truncate pr-2 text-sm">${item.artist}</h3>
                                    <span class="font-bold text-brand-orange text-sm">${Math.round(item.price)}.-</span>
                                </div>
                                <p class="text-xs text-slate-500 truncate mb-1">${item.album}</p>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] font-mono text-slate-400">${item.sku}</span>
                                    ${this.getStatusBadge(item.status)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    ${filteredInventory.length === 0 ? '<div class="text-center py-8 text-slate-400"><p>No se encontraron discos</p></div>' : ''}
                </div>

                <!-- Desktop Table View -->
                <div class="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th class="p-4 text-xs font-bold text-slate-500 uppercase">Disco</th>
                                <th class="p-4 text-xs font-bold text-slate-500 uppercase">SKU</th>
                                <th class="p-4 text-xs font-bold text-slate-500 uppercase">Estado</th>
                                <th class="p-4 text-xs font-bold text-slate-500 uppercase">Precio</th>
                                <th class="p-4 text-xs font-bold text-slate-500 uppercase">Stock</th>
                                <th class="p-4 text-xs font-bold text-slate-500 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${filteredInventory.map(item => `
                                <tr onclick="app.openVinylDetails('${item.sku}')" class="hover:bg-slate-50 transition-colors group cursor-pointer">
                                    <td class="p-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                                                 ${item.coverUrl ? `<img src="${item.coverUrl}" class="w-full h-full object-cover">` : '<i class="ph-fill ph-music-note"></i>'}
                                            </div>
                                            <div>
                                                <div class="font-bold text-brand-dark text-sm">${item.artist}</div>
                                                <div class="text-xs text-slate-500">${item.album}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-4 text-xs text-slate-500 font-mono">${item.sku}</td>
                                    <td class="p-4">${this.getStatusBadge(item.status)}</td>
                                    <td class="p-4 font-bold text-brand-dark text-sm">${this.formatCurrency(item.price)}</td>
                                    <td class="p-4">
                                        <span class="px-2 py-1 rounded text-xs font-bold ${item.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                            ${item.stock}
                                        </span>
                                    </td>
                                    <td class="p-4 text-right">
                                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onclick="app.openAddVinylModal('${item.sku}')" class="text-slate-400 hover:text-brand-orange transition-colors">
                                                <i class="ph-bold ph-pencil-simple text-lg"></i>
                                            </button>
                                            <button onclick="app.deleteVinyl('${item.sku}')" class="text-slate-400 hover:text-red-500 transition-colors">
                                                <i class="ph-bold ph-trash text-lg"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        container.innerHTML = html;
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
        return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${colorClass}">${status}</span>`;
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

    renderDashboardCharts(filteredSales = []) {
        const salesToUse = filteredSales.length > 0 ? filteredSales : this.state.sales;

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
            const genre = s.genre || 'Desconocido';
            genreCounts[genre] = (genreCounts[genre] || 0) + s.quantity;
        });

        if (this.genreChartInstance) this.genreChartInstance.destroy();
        const genreCtx = document.getElementById('genreChart')?.getContext('2d');
        if (genreCtx) this.genreChartInstance = new Chart(genreCtx, createConfig(genreCounts, 'Género'));

        // 2. Payment Method Chart
        const paymentCounts = {};
        salesToUse.forEach(s => {
            const payment = s.paymentMethod || 'Desconocido';
            paymentCounts[payment] = (paymentCounts[payment] || 0) + s.quantity;
        });

        if (this.paymentChartInstance) this.paymentChartInstance.destroy();
        const paymentCtx = document.getElementById('paymentChart')?.getContext('2d');
        if (paymentCtx) this.paymentChartInstance = new Chart(paymentCtx, createConfig(paymentCounts, 'Pago'));

        // 3. Channel Chart
        const channelCounts = {};
        salesToUse.forEach(s => {
            const channel = s.channel || 'Local';
            channelCounts[channel] = (channelCounts[channel] || 0) + s.quantity;
        });

        if (this.channelChartInstance) this.channelChartInstance.destroy();
        const channelCtx = document.getElementById('channelChart')?.getContext('2d');
        if (channelCtx) this.channelChartInstance = new Chart(channelCtx, createConfig(channelCounts, 'Canal'));
    },

    updateFilter(type, value) {
        if (type === 'month') this.state.filterMonth = parseInt(value);
        if (type === 'year') this.state.filterYear = parseInt(value);
        this.renderDashboard(document.getElementById('app-content'));
    },

    renderSales(container) {
        // Filter Sales
        const currentYear = this.state.filterYear;
        const selectedMonths = this.state.filterMonths;
        const paymentFilter = document.getElementById('sales-payment-filter')?.value || 'all';
        const searchTerm = this.state.salesHistorySearch.toLowerCase();

        const filteredSales = this.state.sales.filter(s => {
            const d = new Date(s.date);
            const dateMatch = d.getFullYear() === currentYear && selectedMonths.includes(d.getMonth());
            const paymentMatch = paymentFilter === 'all' || s.paymentMethod === paymentFilter;
            const searchMatch = !searchTerm ||
                s.album.toLowerCase().includes(searchTerm) ||
                s.artist.toLowerCase().includes(searchTerm) ||
                s.sku.toLowerCase().includes(searchTerm);
            return dateMatch && paymentMatch && searchMatch;
        });

        const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
        const totalProfit = filteredSales.reduce((sum, s) => sum + (s.total - (s.cost * s.quantity)), 0);

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const html = `
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 pt-6">
                <!-- Header & Filters -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 class="font-display text-2xl font-bold text-brand-dark">Gestión de Ventas</h2>
                        <p class="text-xs text-slate-500">Periodo: <span class="font-bold text-brand-orange">${selectedMonths.map(m => this.getMonthName(m)).join(', ')} ${currentYear}</span></p>
                    </div>
                    
                    <!-- Date Selectors -->
                    <div class="flex flex-col gap-2 mt-4 md:mt-0">
                         <div class="flex gap-2 bg-white p-1 rounded-lg border border-orange-100 shadow-sm">
                            <select id="sales-year" onchange="app.updateFilter('year', this.value)" class="bg-transparent text-sm font-medium text-slate-600 p-2 outline-none">
                                <option value="2024" ${this.state.filterYear === 2024 ? 'selected' : ''}>2024</option>
                                <option value="2025" ${this.state.filterYear === 2025 ? 'selected' : ''}>2025</option>
                            </select>
                        </div>
                        <div class="flex flex-wrap gap-1 max-w-md justify-end">
                            ${monthNames.map((m, i) => `
                                <button onclick="app.toggleMonthFilter(${i})" 
                                    class="px-2 py-1 rounded text-[10px] font-bold transition-all ${selectedMonths.includes(i) ? 'bg-brand-orange text-white' : 'bg-white border border-orange-100 text-slate-400 hover:text-brand-orange'}">
                                    ${m}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Left Column: Form -->
                    <div class="lg:col-span-1 sticky top-6 h-fit">
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                            <h3 class="font-bold text-lg mb-4 text-brand-dark">Nueva Venta</h3>
                            <form onsubmit="app.handleSaleSubmit(event)" class="space-y-4">
                                
                                <!-- SKU Search -->
                                <div class="relative">
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Buscar Producto</label>
                                    <div class="relative">
                                        <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                        <input type="text" id="sku-search" onkeyup="app.searchSku(this.value)" placeholder="SKU / Artista..." autocomplete="off"
                                            class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all text-sm">
                                    </div>
                                    <div id="sku-results" class="absolute w-full bg-white shadow-xl rounded-xl mt-2 max-h-60 overflow-y-auto z-50 hidden border border-orange-100"></div>
                                </div>

                                <!-- Selected Item Info -->
                                <div class="p-3 bg-orange-50/50 rounded-lg border border-orange-100 text-sm">
                                    <div class="flex justify-between mb-1">
                                        <span class="text-slate-500">Item:</span>
                                        <span id="form-album" class="font-bold text-brand-dark text-right truncate ml-2">-</span>
                                    </div>
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-slate-500">Precio Unit.:</span>
                                        <!-- Editable Price Input -->
                                        <input type="number" name="price" id="input-price" step="0.5" class="w-20 text-right font-bold text-brand-dark bg-white border border-slate-200 rounded px-1 focus:border-brand-orange outline-none">
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-slate-500">Stock:</span>
                                        <span id="form-stock" class="font-medium text-slate-700">-</span>
                                    </div>
                                </div>

                                <!-- Hidden Inputs -->
                                <input type="hidden" name="sku" id="input-sku">
                                <input type="hidden" name="cost" id="input-cost">
                                <!-- price is now a visible input -->
                                <input type="hidden" name="genre" id="input-genre">
                                <input type="hidden" name="artist" id="input-artist">
                                <input type="hidden" name="album" id="input-album">
                                <input type="hidden" name="owner" id="input-owner">

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha</label>
                                        <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}"
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cantidad</label>
                                        <input type="number" name="quantity" value="1" min="1" required onchange="app.updateTotal()" id="input-qty"
                                            class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-orange transition-all text-sm">
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pago</label>
                                        <select name="paymentMethod" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-orange transition-all text-sm">
                                            <option value="MobilePay">MobilePay</option>
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Tarjeta">Tarjeta</option>
                                            <option value="Transferencia">Transferencia</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Canal</label>
                                        <select name="soldAt" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                                            <option>Tienda</option>
                                            <option>Discogs</option>
                                            <option>Feria</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nota</label>
                                    <textarea name="comment" rows="2" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm"></textarea>
                                </div>

                                <div class="flex items-center justify-between p-3 bg-brand-dark text-white rounded-lg">
                                    <span class="text-sm font-medium">Total</span>
                                    <span id="form-total" class="font-display font-bold text-xl">0 kr.</span>
                                </div>

                                <button type="submit" id="btn-submit-sale" class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20 flex items-center justify-center gap-2">
                                    <i class="ph-bold ph-check"></i>
                                    Registrar Venta
                                </button>
                            </form>
                        </div>

                    <!-- Partners Summary (New Section) -->
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 mt-6">
                        <h3 class="font-bold text-lg mb-4 text-brand-dark">Resumen de Socios</h3>
                        <div class="space-y-4">
                            ${['El Cuartito', ...this.state.consignors.map(c => c.name)].map(owner => {
            const stockCount = this.state.inventory.filter(i => i.owner === owner).reduce((sum, i) => sum + i.stock, 0);

            const soldCount = filteredSales.reduce((sum, s) => {
                // Check flat sale structure
                if (s.owner === owner) return sum + (s.quantity || 1);

                // Check nested items structure (legacy)
                if (s.items && Array.isArray(s.items)) {
                    return sum + s.items.filter(i => i.owner === owner).length;
                }
                return sum;
            }, 0);

            const total = stockCount + soldCount;
            const stockPercent = total > 0 ? (stockCount / total) * 100 : 0;
            const soldPercent = total > 0 ? (soldCount / total) * 100 : 0;

            return `
                                    <div>
                                        <div class="flex justify-between items-end mb-1">
                                            <span class="font-bold text-sm text-brand-dark">${owner}</span>
                                            <span class="text-xs text-slate-500">Stock: <span class="font-bold text-blue-600">${stockCount}</span> | Vendidos: <span class="font-bold text-orange-600">${soldCount}</span></span>
                                        </div>
                                        <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                            <div style="width: ${stockPercent}%" class="h-full bg-blue-500"></div>
                                            <div style="width: ${soldPercent}%" class="h-full bg-brand-orange"></div>
                                        </div>
                                    </div>
                                `;
        }).join('')}
                    </div>
                    </div>
                </div>

                    <!-- Right Column: History -->
                    <div class="lg:col-span-2 space-y-6">
                        <!-- Summary Cards -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-brand-orange text-white p-5 rounded-2xl shadow-lg shadow-brand-orange/20 relative overflow-hidden">
                                <div class="relative z-10">
                                    <p class="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1">Ventas Totales</p>
                                    <h3 class="text-3xl font-display font-bold">${this.formatCurrency(totalRevenue)}</h3>
                                </div>
                                <i class="ph-fill ph-trend-up absolute -right-4 -bottom-4 text-8xl text-white/10"></i>
                            </div>
                            <div class="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden">
                                <div class="relative z-10">
                                    <p class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Ganancia Neta</p>
                                    <h3 class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(totalProfit)}</h3>
                                </div>
                                <i class="ph-fill ph-coins absolute -right-4 -bottom-4 text-8xl text-brand-orange/5"></i>
                            </div>
                        </div>

                        <!-- List -->
                        <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                            <div class="p-4 border-b border-orange-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <h3 class="font-bold text-brand-dark">Historial de Ventas</h3>
                                <div class="flex gap-2 w-full sm:w-auto">
                                    <!-- Search History -->
                                    <div class="relative flex-1 sm:w-48">
                                        <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                        <input type="text" 
                                            value="${this.state.salesHistorySearch}"
                                            oninput="app.state.salesHistorySearch = this.value; app.renderSales(document.getElementById('app-content'))"
                                            placeholder="Buscar en historial..." 
                                            class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-orange text-xs">
                                    </div>
                                    <!-- Payment Filter -->
                                    <select id="sales-payment-filter" onchange="app.renderSales(document.getElementById('app-content'))" class="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-brand-orange">
                                        <option value="all" ${paymentFilter === 'all' ? 'selected' : ''}>Todos</option>
                                        <option value="MobilePay" ${paymentFilter === 'MobilePay' ? 'selected' : ''}>MobilePay</option>
                                        <option value="Efectivo" ${paymentFilter === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                                        <option value="Tarjeta" ${paymentFilter === 'Tarjeta' ? 'selected' : ''}>Tarjeta</option>
                                    </select>
                                </div>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left">
                                    <thead class="bg-orange-50/50 text-xs uppercase text-slate-500 font-medium">
                                        <tr>
                                            <th class="p-4">Fecha</th>
                                            <th class="p-4">Item</th>
                                            <th class="p-4 text-center">Cant.</th>
                                            <th class="p-4 text-right">Total</th>
                                            <th class="p-4 text-center">Pago</th>
                                            <th class="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-orange-50">
                                        ${filteredSales.slice().reverse().map(s => `
                                            <tr class="hover:bg-orange-50/30 transition-colors">
                                                <td class="p-4 text-xs text-slate-500 whitespace-nowrap">
                                                    ${this.formatDate(s.date)}
                                                    <span class="block text-[10px] text-slate-400">${new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td class="p-4">
                                                    <p class="text-sm font-bold text-brand-dark truncate max-w-[150px]" title="${s.album}">${s.album}</p>
                                                    <p class="text-xs text-slate-500 truncate max-w-[150px]">${s.artist}</p>
                                                </td>
                                                <td class="p-4 text-center text-sm text-slate-600">${s.quantity}</td>
                                                <td class="p-4 text-right font-bold text-brand-dark">${this.formatCurrency(s.total)}</td>
                                                <td class="p-4 text-center">
                                                    <span class="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wide">${s.paymentMethod}</span>
                                                </td>
                                                <td class="p-4 text-center">
                                                    <button onclick="app.deleteSale('${s.id}')" class="text-slate-300 hover:text-red-500 transition-colors" title="Eliminar Venta">
                                                        <i class="ph-fill ph-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                        ${filteredSales.length === 0 ? `
                                            <tr>
                                                <td colspan="6" class="p-8 text-center text-slate-400 italic">No hay ventas registradas en este periodo.</td>
                                            </tr>
                                        ` : ''}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Restore focus
        const searchInput = container.querySelector('input[placeholder="Buscar en historial..."]');
        if (searchInput) {
            searchInput.focus();
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
    },



    searchSku(query) {
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

        // Fill Form UI
        // document.getElementById('form-artist').innerText = item.artist; // Removed from DOM
        document.getElementById('form-album').innerText = `${item.artist} - ${item.album}`;
        document.getElementById('input-price').value = item.price;
        document.getElementById('form-stock').innerText = item.stock;

        // Hide Results
        document.getElementById('sku-results').classList.add('hidden');
        document.getElementById('sku-search').value = ''; // Clear search input

        // Fill Hidden Inputs
        document.getElementById('input-sku').value = item.sku;
        document.getElementById('input-cost').value = item.cost;
        // input-price is already set above
        document.getElementById('input-genre').value = item.genre;
        document.getElementById('input-artist').value = item.artist;
        document.getElementById('input-album').value = item.album;
        document.getElementById('input-owner').value = item.owner;

        // Hide Results
        document.getElementById('sku-results').classList.add('hidden');
        document.getElementById('sku-search').value = `${item.artist} - ${item.album}`;

        this.updateTotal();

        // Stock Check for Button State
        const btnPage = document.getElementById('btn-submit-sale');
        const btnModal = document.getElementById('btn-submit-sale-modal');

        const isOutOfStock = item.stock <= 0;

        const updateButton = (btn) => {
            if (!btn) return;
            if (isOutOfStock) {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
                btn.innerHTML = '<i class="ph-bold ph-warning"></i> Sin Stock';
            } else {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
                btn.innerHTML = '<i class="ph-bold ph-check"></i> Registrar Venta';
            }
        };

        updateButton(btnPage);
        updateButton(btnModal);

        if (isOutOfStock) {
            this.showToast('⚠️ Producto sin stock');
        }
    },

    updateTotal() {
        const price = parseFloat(document.getElementById('input-price').value) || 0;
        const qty = parseInt(document.getElementById('input-qty').value) || 1;
        const total = price * qty;
        document.getElementById('form-total').innerText = this.formatCurrency(total);
    },

    openVinylDetails(sku) {
        const item = this.state.inventory.find(i => i.sku === sku);
        if (!item) return;

        const modalHtml = `
            <div id="modal-overlay-details" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform scale-100 transition-all border border-orange-100 max-h-[90vh] overflow-y-auto relative">
                    <button onclick="document.getElementById('modal-overlay-details').remove()" class="absolute top-4 right-4 text-slate-400 hover:text-brand-dark p-2 z-10 bg-white/50 rounded-full">
                        <i class="ph-bold ph-x text-xl"></i>
                    </button>
                    
                    <div class="flex flex-col items-center mb-6">
                        <div class="w-48 h-48 bg-slate-100 rounded-lg shadow-lg mb-4 overflow-hidden border border-slate-200">
                            ${item.coverUrl
                ? `<img src="${item.coverUrl}" class="w-full h-full object-cover">`
                : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-fill ph-disc text-6xl"></i></div>`
            }
                        </div>
                        <h2 class="text-2xl font-display font-bold text-brand-dark text-center leading-tight mb-1">${item.album}</h2>
                        <p class="text-lg text-slate-500 font-medium text-center">${item.artist}</p>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="bg-orange-100 text-brand-orange px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">${item.genre}</span>
                            ${this.getStatusBadge(item.status)}
                        </div>
                    </div>

                    <div class="space-y-4 bg-slate-50/50 rounded-xl p-4 border border-slate-100 mb-6">
                        <div class="flex justify-between border-b border-slate-200 pb-2">
                        <span class="text-slate-500 text-sm">Año</span>
                        <span class="font-bold text-brand-dark text-sm">${item.year || '-'}</span>
                    </div>
                    <div class="flex justify-between border-b border-slate-200 pb-2">
                        <span class="text-slate-500 text-sm">Label Disquería</span>
                        <span class="font-bold text-brand-dark text-sm">${item.storeLabel || '-'}</span>
                    </div>
                    <div class="flex justify-between border-b border-slate-200 pb-2">
                        <span class="text-slate-500 text-sm">SKU</span>
                        <span class="font-mono font-bold text-slate-400 text-xs">${item.sku}</span>
                    </div>
                        <div class="flex justify-between border-b border-slate-200 pb-2">
                            <span class="text-slate-500 text-sm">Precio</span>
                            <span class="font-bold text-brand-dark text-lg">${this.formatCurrency(item.price)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500 text-sm">Stock</span>
                            <span class="font-bold text-brand-dark text-sm">${item.stock} u.</span>
                        </div>
                    </div>

                    <button onclick="document.getElementById('modal-overlay-details').remove(); app.openAddVinylModal('${item.sku}')" 
                        class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20 flex items-center justify-center gap-2">
                        <i class="ph-bold ph-pencil-simple"></i>
                        Editar Vinilo
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    openAddVinylModal(editSku = null) {
        let item = { sku: '', artist: '', album: '', year: '', genre: 'Minimal', storeLabel: '', status: 'NM', price: '', cost: '', stock: 1, owner: 'El Cuartito' };
        let isEdit = false;

        if (editSku) {
            const found = this.state.inventory.find(i => i.sku === editSku);
            if (found) {
                item = { ...item, ...found }; // Merge to ensure storeLabel exists
                isEdit = true;
            }
        }

        // Auto-generate SKU for new items
        if (!isEdit) {
            const skuNumbers = this.state.inventory
                .map(i => {
                    const match = i.sku.match(/^SKU-(\d+)$/);
                    return match ? parseInt(match[1]) : 0;
                });
            const maxSku = Math.max(0, ...skuNumbers);
            item.sku = `SKU-${String(maxSku + 1).padStart(3, '0')}`;
        }

        // Custom Genres Logic
        const defaultGenres = ['Minimal', 'Techno', 'House', 'Deep House', 'Electro'];
        const allGenres = [...new Set([...defaultGenres, ...(this.state.customGenres || [])])];

        const modalHtml = `
            <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick="if(event.target === this) document.getElementById('modal-overlay').remove()">
                <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform scale-100 transition-all border border-orange-100 max-h-[90vh] overflow-y-auto relative">
                    <button onclick="document.getElementById('modal-overlay').remove()" class="absolute top-4 right-4 text-slate-400 hover:text-brand-dark p-2 z-10 bg-white/50 rounded-full">
                        <i class="ph-bold ph-x text-xl"></i>
                    </button>
                    <h3 class="font-display text-xl font-bold mb-4 text-brand-dark flex justify-between items-center pr-10">
                    ${isEdit ? 'Editar Vinilo' : 'Agregar Nuevo Vinilo'}
                    <button type="button" onclick="app.saveDiscogsToken()" class="text-slate-400 hover:text-brand-orange transition-colors" title="Configurar Token Discogs">
                        <i class="ph-bold ph-gear"></i>
                    </button>
                </h3>

                <!-- Discogs Search -->
                <div class="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Buscar en Discogs</label>
                <div class="flex gap-2">
                    <input type="text" id="discogs-search-input" placeholder="Artista, Álbum o Catálogo..." 
                        class="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-sm focus:border-brand-orange outline-none"
                        onkeypress="if(event.key === 'Enter') { event.preventDefault(); app.searchDiscogs(this.value); }">
                    <button type="button" onclick="app.searchDiscogs(document.getElementById('discogs-search-input').value)" 
                        class="bg-brand-dark text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors">
                        <i class="ph-bold ph-magnifying-glass"></i>
                    </button>
                    <button type="button" onclick="app.startBarcodeScanner()" 
                        class="bg-brand-dark text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors" title="Escanear Código de Barras">
                        <i class="ph-bold ph-barcode"></i>
                    </button>
                </div>
                <div id="reader" class="hidden mt-3 rounded-lg overflow-hidden border border-slate-200"></div>
                <!-- Results Container -->
                <div id="discogs-results" class="hidden mt-3 max-h-48 overflow-y-auto bg-white rounded-lg border border-slate-100 shadow-sm"></div>
            </div>

                <form onsubmit="app.handleAddVinyl(event, '${isEdit ? item.sku : ''}')" class="space-y-4">
                    
                    <!-- Cover Preview -->
                    <div id="discogs-preview" class="hidden flex justify-center mb-4"></div>

                    <!-- Owner Selection -->
                        <div class="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dueño / Consignación</label>
                            <select name="owner" id="modal-owner" onchange="app.updateCostFromOwner()" class="w-full bg-white border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none font-medium text-brand-dark">
                                <option value="El Cuartito" ${item.owner === 'El Cuartito' ? 'selected' : ''}>El Cuartito (Propio)</option>
                                ${this.state.consignors.map(c => `<option value="${c.name}" data-split="${c.agreementSplit}" ${item.owner === c.name ? 'selected' : ''}>${c.name} (${c.agreementSplit}%)</option>`).join('')}
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">SKU (Auto)</label>
                                <input name="sku" value="${item.sku}" readonly class="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-500 outline-none cursor-not-allowed font-mono font-bold">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Artista</label>
                                <input name="artist" value="${item.artist}" required class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Álbum</label>
                            <input name="album" value="${item.album}" required class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                        </div>
                        <div class="grid grid-cols-3 gap-4">
                            <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Año</label>
                            <input name="year" type="number" value="${item.year || ''}" placeholder="Ej. 1999" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Label Disquería</label>
                            <input name="storeLabel" value="${item.storeLabel || ''}" placeholder="Ej. Estante A" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Género</label>
                        <select name="genre" onchange="this.value === 'other' ? document.getElementById('custom-genre-container').classList.remove('hidden') : document.getElementById('custom-genre-container').classList.add('hidden')" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                            ${allGenres.map(g => `<option value="${g}" ${item.genre === g ? 'selected' : ''}>${g}</option>`).join('')}
                            <option value="other" ${!defaultGenres.includes(item.genre) && !this.state.customGenres.includes(item.genre) ? 'selected' : ''}>Otro...</option>
                        </select>
                    </div>            <div id="custom-genre-container" class="hidden mt-2">
                                    <input name="custom_genre" placeholder="Nuevo Género" class="w-full bg-white border border-brand-orange rounded-lg p-2 text-sm focus:outline-none">
                            </div>
                        </div>

                        <!-- Status & Price -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
                                <select name="status" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-orange outline-none">
                            <button type="submit" class="flex-1 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold transition-colors">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    updateCostFromOwner() {
        const ownerSelect = document.getElementById('modal-owner');
        const priceInput = document.getElementById('modal-price');
        const costInput = document.getElementById('modal-cost');
        const helperText = document.getElementById('cost-helper');
        const marginInput = document.getElementById('modal-margin');

        const selectedOption = ownerSelect.options[ownerSelect.selectedIndex];
        const split = selectedOption.getAttribute('data-split');
        const price = parseFloat(priceInput.value) || 0;

        if (split) {
            // Consignment Logic: Cost = Price * (Split / 100)
            // Example: Price 100, Split 70% -> Cost (Amount to Pay) = 70
            const cost = price * (parseFloat(split) / 100);
            costInput.value = Math.round(cost);
            costInput.readOnly = true;
            costInput.classList.add('bg-slate-100', 'text-slate-500');
            marginInput.disabled = true;
            helperText.innerText = `Costo calculado automáticamente (${split}% para ${ownerSelect.value})`;
        } else {
            // Own Inventory Logic
            costInput.readOnly = false;
            costInput.classList.remove('bg-slate-100', 'text-slate-500');
            marginInput.disabled = false;
            helperText.innerText = 'Calculado manualmente o por margen.';
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

    calculatePrice() {
        const ownerSelect = document.getElementById('modal-owner');
        if (ownerSelect.value !== 'El Cuartito') return; // Don't use margin logic for consignments

        const cost = parseFloat(document.getElementById('modal-cost').value) || 0;
        const margin = parseFloat(document.getElementById('modal-margin').value) || 0;
        const price = cost + (cost * (margin / 100));
        document.getElementById('modal-price').value = Math.ceil(price);
    },

    calculateMarginFromPrice() {
        const ownerSelect = document.getElementById('modal-owner');
        if (ownerSelect.value !== 'El Cuartito') return;

        const cost = parseFloat(document.getElementById('modal-cost').value) || 0;
        const price = parseFloat(document.getElementById('modal-price').value) || 0;

        if (cost > 0 && price > 0) {
            const margin = ((price - cost) / cost) * 100;
            document.getElementById('modal-margin').value = Math.round(margin);
            document.getElementById('margin-value').innerText = Math.round(margin) + '%';
        }
    },

    openAddSaleModal() {
        const modalHtml = `
            <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform scale-100 transition-all border border-orange-100 max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-display text-xl font-bold text-brand-dark">Nueva Venta</h3>
                        <button onclick="document.getElementById('modal-overlay').remove()" class="text-slate-400 hover:text-slate-600">
                            <i class="ph-bold ph-x text-xl"></i>
                        </button>
                    </div>
                    <form onsubmit="app.handleSaleSubmit(event)" class="space-y-4">
                        <!-- SKU Search -->
                        <div class="relative">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Buscar Producto</label>
                            <div class="relative">
                                <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input type="text" id="sku-search" onkeyup="app.searchSku(this.value)" placeholder="SKU / Artista..." autocomplete="off"
                                    class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all text-sm">
                            </div>
                            <div id="sku-results" class="absolute w-full bg-white shadow-xl rounded-xl mt-2 max-h-60 overflow-y-auto z-50 hidden border border-orange-100"></div>
                        </div>

                        <!-- Selected Item Info -->
                        <div class="p-3 bg-orange-50/50 rounded-lg border border-orange-100 text-sm">
                            <div class="flex justify-between mb-1">
                                <span class="text-slate-500">Item:</span>
                                <span id="form-album" class="font-bold text-brand-dark text-right truncate ml-2">-</span>
                            </div>
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-slate-500">Precio Unit.:</span>
                                <input type="number" name="price" id="input-price" step="0.5" class="w-20 text-right font-bold text-brand-dark bg-white border border-slate-200 rounded px-1 focus:border-brand-orange outline-none">
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-500">Stock:</span>
                                <span id="form-stock" class="font-medium text-slate-700">-</span>
                            </div>
                        </div>

                        <!-- Hidden Inputs -->
                        <input type="hidden" name="sku" id="input-sku">
                        <input type="hidden" name="cost" id="input-cost">
                        <input type="hidden" name="genre" id="input-genre">
                        <input type="hidden" name="artist" id="input-artist">
                        <input type="hidden" name="album" id="input-album">
                        <input type="hidden" name="owner" id="input-owner">

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha</label>
                                <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}"
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cantidad</label>
                                <input type="number" name="quantity" value="1" min="1" required onchange="app.updateTotal()" id="input-qty"
                                    class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-orange transition-all text-sm">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pago</label>
                                <select name="paymentMethod" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-orange transition-all text-sm">
                                    <option value="MobilePay">MobilePay</option>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                    <option value="Transferencia">Transferencia</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Canal</label>
                                <select name="soldAt" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                                    <option>Tienda</option>
                                    <option>Discogs</option>
                                    <option>Feria</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nota</label>
                            <textarea name="comment" rows="2" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm"></textarea>
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
    },

    openAddExpenseModal() {
        // Custom Categories Logic
        const defaultCategories = ['Alquiler', 'Servicios', 'Marketing', 'Suministros', 'Honorarios'];
        const allCategories = [...new Set([...defaultCategories, ...(this.state.customCategories || [])])];

        const modalHtml = `
            <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

    calculateMargin() {
        // Only for own inventory
        const ownerSelect = document.getElementById('modal-owner');
        if (ownerSelect.value === 'El Cuartito') {
            this.calculatePrice();
            // Update margin display text
            const margin = document.getElementById('modal-margin').value;
            document.getElementById('margin-value').innerText = margin + '%';
        }
    },

    handleAddVinyl(e, editSku) {
        e.preventDefault();
        const formData = new FormData(e.target);

        let genre = formData.get('genre');
        if (genre === 'other') {
            genre = formData.get('custom_genre');
            // Save new genre to Firestore settings
            if (!this.state.customGenres) this.state.customGenres = [];
            if (!this.state.customGenres.includes(genre)) {
                const newGenres = [...this.state.customGenres, genre];
                db.collection('settings').doc('general').set({ customGenres: newGenres }, { merge: true });
            }
        }
        const yearVal = formData.get('year');
        const selectedOwnerOption = document.getElementById('modal-owner').options[document.getElementById('modal-owner').selectedIndex];
        const newItem = {
            sku: formData.get('sku'), // Keep original SKU
            artist: formData.get('artist'),
            album: formData.get('album'),
            year: yearVal ? parseInt(yearVal) : null,
            genre: genre,
            storeLabel: formData.get('storeLabel') || '',
            status: formData.get('status'),
            price: parseFloat(formData.get('price')),
            cost: parseFloat(formData.get('cost')) || 0,
            stock: parseInt(formData.get('stock')),
            owner: formData.get('owner'),
            agreementSplit: parseInt(selectedOwnerOption.dataset.split || 70), // Default 70% to owner
            coverUrl: formData.get('coverUrl') || null,
            dateAdded: new Date().toISOString()
        };
        if (editSku) {
            // Update existing
            db.collection('inventory').doc(editSku).set(newItem, { merge: true })
                .then(() => this.showToast('Vinilo actualizado'))
                .catch(err => console.error(err));
        } else {
            // Add new
            // Check if SKU exists (optional, but Firestore set will overwrite if we use SKU as ID)
            // We use SKU as ID, so we just set it.
            db.collection('inventory').doc(newItem.sku).set(newItem)
                .then(() => this.showToast('Vinilo agregado'))
                .catch(err => console.error(err));
        }

        document.getElementById('modal-overlay').remove();
    },

    deleteVinyl(sku) {
        if (!confirm('¿Estás seguro de eliminar este item?')) return;

        db.collection('inventory').doc(sku).delete()
            .then(() => this.showToast('Item eliminado'))
            .catch(err => console.error(err));
    },

    handleSaleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const sku = formData.get('sku');
        const qty = parseInt(formData.get('quantity'));
        const price = parseFloat(formData.get('price'));
        const cost = parseFloat(formData.get('cost'));
        const paymentMethod = formData.get('paymentMethod');
        const album = document.getElementById('form-album').innerText;

        // Find owner from current state (since it's not in form hidden inputs usually, or we can fetch it)
        // Better to trust the form or state. Let's look up the item in state to get the owner.
        const item = this.state.inventory.find(i => i.sku === sku);
        const owner = item ? item.owner : 'El Cuartito';

        const saleData = {
            date: new Date().toISOString(),
            sku: sku,
            album: album, // Storing name for history
            artist: item ? item.artist : '',
            genre: item ? item.genre : 'Desconocido',
            quantity: qty,
            price: price,
            cost: cost,
            total: price * qty,
            paymentMethod: paymentMethod,
            channel: formData.get('soldAt') || 'Local',
            owner: owner
        };

        const batch = db.batch();
        const saleRef = db.collection('sales').doc(); // Auto ID
        const inventoryRef = db.collection('inventory').doc(sku);

        batch.set(saleRef, saleData);
        batch.update(inventoryRef, {
            stock: firebase.firestore.FieldValue.increment(-qty)
        });

        batch.commit()
            .then(() => {
                this.showToast('Venta registrada');
                // Reset form
                e.target.reset();
                document.getElementById('form-album').innerText = '-';
                document.getElementById('form-stock').innerText = '-';
                document.getElementById('form-total').innerText = '0 kr.';
                document.getElementById('input-sku').value = '';
                // Re-render handled by listener
            })
            .catch(err => {
                console.error(err);
                alert('Error al registrar venta: ' + err.message);
            });
    },

    deleteSale(id) {
        if (!confirm('¿Eliminar esta venta y restaurar stock?')) return;

        const sale = this.state.sales.find(s => s.id === id);
        if (!sale) return;

        const batch = db.batch();
        const saleRef = db.collection('sales').doc(id);

        // Only restore stock if the item still exists in inventory (it should)
        // If we deleted the item, this might fail. But assuming item exists:
        const inventoryRef = db.collection('inventory').doc(sale.sku);

        batch.delete(saleRef);
        batch.update(inventoryRef, {
            stock: firebase.firestore.FieldValue.increment(sale.quantity)
        });

        batch.commit()
            .then(() => this.showToast('Venta eliminada y stock restaurado'))
            .catch(err => console.error(err));
    },



    renderExpenses(container) {
        // Custom Categories Logic
        const defaultCategories = ['Alquiler', 'Servicios', 'Marketing', 'Suministros', 'Honorarios'];
        const allCategories = [...new Set([...defaultCategories, ...(this.state.customCategories || [])])];

        const searchTerm = this.state.expensesSearch.toLowerCase();
        const filteredExpenses = this.state.expenses.filter(e =>
            !searchTerm ||
            e.description.toLowerCase().includes(searchTerm) ||
            e.category.toLowerCase().includes(searchTerm)
        );

        const html = `
            <div class="max-w-4xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <h2 class="font-display text-2xl font-bold text-brand-dark mb-6">Gastos Operativos</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Form -->
                    <div class="md:col-span-1">
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 sticky top-4">
                            <h3 id="expense-form-title" class="font-bold text-lg mb-4">Nuevo Gasto</h3>
                            <form id="expense-form" onsubmit="app.handleExpenseSubmit(event)" class="space-y-4">
                                <input type="hidden" name="id" id="expense-id">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                                    <input name="description" id="expense-description" required class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                                    <select name="category" id="expense-category" onchange="app.checkCustomInput(this, 'custom-expense-category-container')" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none">
                                        ${allCategories.map(c => `<option>${c}</option>`).join('')}
                                        <option value="other">Otra...</option>
                                    </select>
                                    <div id="custom-expense-category-container" class="hidden mt-2">
                                        <input name="custom_category" placeholder="Nueva Categoría" class="w-full bg-white border border-brand-orange rounded-lg p-2 text-sm focus:outline-none">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Monto</label>
                                    <input name="amount" id="expense-amount" type="number" step="0.01" required class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none">
                                </div>
                                <div class="flex items-center gap-2 py-2">
                                    <input type="checkbox" name="hasVat" id="hasVat" class="w-4 h-4 text-brand-orange rounded border-slate-300 focus:ring-brand-orange">
                                    <label for="hasVat" class="text-sm text-slate-600 font-medium">Incluye VAT (Sí/No)</label>
                                </div>
                                <div class="flex gap-2">
                                    <button type="submit" id="expense-submit-btn" class="flex-1 py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors">
                                        Guardar
                                    </button>
                                    <button type="button" id="expense-cancel-btn" onclick="app.resetExpenseForm()" class="hidden px-4 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- List -->
                    <div class="md:col-span-2">
                        <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                            <div class="p-4 border-b border-orange-50">
                                <div class="relative">
                                    <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                    <input type="text" 
                                        value="${this.state.expensesSearch}"
                                        oninput="app.state.expensesSearch = this.value; app.renderExpenses(document.getElementById('app-content'))"
                                        placeholder="Buscar gasto..." 
                                        class="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-orange text-sm">
                                </div>
                            </div>
                            <table class="w-full text-left">
                                <thead class="bg-orange-50/50 text-xs uppercase text-slate-500 font-medium">
                                    <tr>
                                        <th class="p-4">Fecha</th>
                                        <th class="p-4">Descripción</th>
                                        <th class="p-4 text-right">Monto</th>
                                        <th class="p-4 text-center">VAT</th>
                                        <th class="p-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-orange-50">
                                    ${filteredExpenses.slice().reverse().map(e => `
                                        <tr class="hover:bg-orange-50/30 transition-colors group">
                                            <td class="p-4 text-xs text-slate-500">${this.formatDate(e.date)}</td>
                                            <td class="p-4">
                                                <p class="text-sm font-bold text-brand-dark">${e.description}</p>
                                                <p class="text-xs text-slate-500">${e.category}</p>
                                            </td>
                                            <td class="p-4 text-right font-medium text-brand-dark">${this.formatCurrency(e.amount)}</td>
                                            <td class="p-4 text-center">
                                                ${e.hasVat ? '<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Sí</span>' : '<span class="text-xs bg-slate-100 text-slate-400 px-2 py-1 rounded">No</span>'}
                                            </td>
                                            <td class="p-4 text-center">
                                                <div class="flex gap-1 justify-center">
                                                    <button onclick="app.editExpense('${e.id}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-orange transition-all p-2" title="Editar">
                                                        <i class="ph-fill ph-pencil-simple"></i>
                                                    </button>
                                                    <button onclick="app.deleteExpense('${e.id}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-2" title="Eliminar">
                                                        <i class="ph-fill ph-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                    ${filteredExpenses.length === 0 ? `
                                        <tr>
                                            <td colspan="5" class="p-8 text-center text-slate-400 italic">No se encontraron gastos.</td>
                                        </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Restore focus
        const searchInput = container.querySelector('input[placeholder="Buscar gasto..."]');
        if (searchInput) {
            searchInput.focus();
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
    },

    editExpense(id) {
        if (!confirm('¿Seguro que deseas editar este gasto?')) return;

        const expense = this.state.expenses.find(e => e.id === id);
        if (!expense) return;

        // Populate Form
        document.getElementById('expense-id').value = expense.id;
        document.getElementById('expense-description').value = expense.description;
        document.getElementById('expense-amount').value = expense.amount;
        document.getElementById('hasVat').checked = expense.hasVat;

        // Handle Category
        const categorySelect = document.getElementById('expense-category');
        if ([...categorySelect.options].some(o => o.value === expense.category)) {
            categorySelect.value = expense.category;
        } else {
            // If category is not in list (shouldn't happen with dynamic list, but safe fallback)
            categorySelect.value = 'other';
            app.checkCustomInput(categorySelect, 'custom-expense-category-container');
            document.querySelector('[name="custom_category"]').value = expense.category;
        }

        // Update UI State
        document.getElementById('expense-form-title').innerText = 'Editar Gasto';
        document.getElementById('expense-submit-btn').innerText = 'Actualizar';
        document.getElementById('expense-cancel-btn').classList.remove('hidden');
    },



    resetExpenseForm() {
        document.getElementById('expense-form').reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('expense-form-title').innerText = 'Nuevo Gasto';
        document.getElementById('expense-submit-btn').innerText = 'Guardar';
        document.getElementById('expense-cancel-btn').classList.add('hidden');
        document.getElementById('custom-expense-category-container').classList.add('hidden');
    },

    handleExpenseSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Handle Custom Category
        let category = formData.get('category');
        if (category === 'other') {
            category = formData.get('custom_category');
            if (!this.state.customCategories) this.state.customCategories = [];
            if (!this.state.customCategories.includes(category)) {
                const newCategories = [...this.state.customCategories, category];
                db.collection('settings').doc('general').set({ customCategories: newCategories }, { merge: true });
            }
        }

        const expenseData = {
            description: formData.get('description'),
            category: category,
            amount: parseFloat(formData.get('amount')),
            hasVat: formData.get('hasVat') === 'on',
            date: new Date().toISOString() // Or keep existing date if editing?
        };

        const id = formData.get('id');
        if (id) {
            // Update
            // Don't overwrite date on edit unless intended. 
            // Ideally we fetch the existing doc to keep the date, or pass it in hidden field.
            // For simplicity, let's assume we keep the original date if possible, or just update it.
            // Actually, let's fetch the existing expense from state to preserve date.
            const existing = this.state.expenses.find(e => e.id === id);
            if (existing) expenseData.date = existing.date;

            db.collection('expenses').doc(id).update(expenseData)
                .then(() => this.showToast('Gasto actualizado'))
                .catch(err => console.error(err));
        } else {
            // Create
            db.collection('expenses').add(expenseData)
                .then(() => this.showToast('Gasto registrado'))
                .catch(err => console.error(err));
        }

        this.resetExpenseForm();
    },

    deleteExpense(id) {
        if (!confirm('¿Eliminar este gasto?')) return;
        db.collection('expenses').doc(id).delete()
            .then(() => this.showToast('Gasto eliminado'))
            .catch(err => console.error(err));
    },

    // --- DISCOGS INTEGRATION ---

    async searchDiscogs(query) {
        const token = this.state.discogsToken;
        if (!token) {
            alert('Por favor configura tu Token de Discogs primero.');
            return;
        }

        const resultsDiv = document.getElementById('discogs-results');
        resultsDiv.innerHTML = '<div class="text-center py-4"><i class="ph-bold ph-spinner animate-spin text-2xl text-brand-orange"></i></div>';
        resultsDiv.classList.remove('hidden');

        try {
            const response = await fetch(`https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&token=${token}`, {
                headers: {
                    'User-Agent': 'ElCuartitoApp/1.0'
                }
            });

            if (!response.ok) throw new Error('Error en Discogs API');

            const data = await response.json();
            const results = data.results.slice(0, 10); // Limit to 10

            if (results.length === 0) {
                resultsDiv.innerHTML = '<p class="text-center text-slate-500 py-4">No se encontraron resultados.</p>';
                return;
            }

            resultsDiv.innerHTML = results.map(r => `
                <div onclick='app.handleDiscogsSelect(${JSON.stringify(r).replace(/'/g, "&#39;")})' class="flex items-center gap-3 p-2 hover:bg-orange-50 rounded-lg cursor-pointer border-b border-slate-100 last:border-0 transition-colors">
                    <div class="w-12 h-12 bg-slate-200 rounded overflow-hidden shrink-0">
                        ${r.thumb ? `<img src="${r.thumb}" class="w-full h-full object-cover">` : '<i class="ph-fill ph-disc text-2xl text-slate-400 m-auto"></i>'}
                    </div>
                    <div class="min-w-0">
                        <p class="font-bold text-sm text-brand-dark truncate">${r.title}</p>
                        <p class="text-xs text-slate-500">${r.year || 'Año desc.'} • ${r.format ? r.format.join(', ') : 'Formato desc.'}</p>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error(err);
            resultsDiv.innerHTML = '<p class="text-center text-red-500 py-4">Error al buscar en Discogs.</p>';
        }
    },

    startBarcodeScanner() {
        const readerDiv = document.getElementById('reader');
        readerDiv.classList.remove('hidden');

        // If scanner already exists, clear it? Or assume executed only once contextually.
        // Html5QrcodeScanner cleans up itself usually/or we should handle instance reuse.
        // For simplicity, new instance.

        // Check if script loaded
        if (typeof Html5QrcodeScanner === 'undefined') {
            alert('Librería de escáner no cargada. Revisa tu conexión.');
            return;
        }

        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false);

        scanner.render((decodedText, decodedResult) => {
            // Success
            console.log(`Code scanned = ${decodedText}`, decodedResult);
            document.getElementById('discogs-search-input').value = decodedText;
            app.searchDiscogs(decodedText);

            scanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
            readerDiv.classList.add('hidden');
        }, (errorMessage) => {
            // Scan Parse Error (ignore)
        });
    },

    saveDiscogsToken() {
        const token = prompt('Ingresa tu Personal Access Token de Discogs:');
        if (token) {
            this.state.discogsToken = token;
            db.collection('settings').doc('general').set({ discogsToken: token }, { merge: true })
                .then(() => this.showToast('Token guardado'))
                .catch(err => console.error(err));
        }
    },

    handleDiscogsSelect(release) {
        // Parse Title "Artist - Album"
        let artist = 'Desconocido';
        let album = release.title;

        if (release.title.includes(' - ')) {
            const parts = release.title.split(' - ');
            artist = parts[0];
            album = parts.slice(1).join(' - '); // Join back in case album has hyphen
        }

        // Fill Form
        document.querySelector('input[name="artist"]').value = artist;
        document.querySelector('input[name="album"]').value = album;
        document.querySelector('input[name="year"]').value = release.year || '';

        // Genre Mapping
        // 1. Check styles first (more specific)
        // 2. Check genres
        // 3. Fallback to 'other'
        const discogsStyles = release.style || [];
        const discogsGenres = release.genre || [];
        const allTags = [...discogsStyles, ...discogsGenres].map(t => t.toLowerCase());

        const genreSelect = document.querySelector('select[name="genre"]');
        let matchedGenre = 'other';

        // Helper to find match in select options
        const findMatch = (tags) => {
            for (let i = 0; i < genreSelect.options.length; i++) {
                const optVal = genreSelect.options[i].value;
                // Exact match or partial match? Let's try flexible matching
                // If our App Genre is "Minimal", match if tag includes "minimal"
                if (tags.some(tag => tag.includes(optVal.toLowerCase()))) {
                    return optVal;
                }
            }
            return null;
        };

        matchedGenre = findMatch(allTags) || 'other';

        genreSelect.value = matchedGenre;

        // Trigger custom input check if 'other'
        if (matchedGenre === 'other') {
            const customInput = document.getElementById('custom-genre-container');
            customInput.classList.remove('hidden');
            // Try to prepopulate custom genre with the first style
            if (discogsStyles.length > 0) {
                customInput.querySelector('input').value = discogsStyles[0];
            }
        } else {
            document.getElementById('custom-genre-container').classList.add('hidden');
        }

        // Cover Image (Store URL)
        // We need a hidden input for cover URL or handle it in state
        let coverInput = document.querySelector('input[name="coverUrl"]');
        if (!coverInput) {
            coverInput = document.createElement('input');
            coverInput.type = 'hidden';
            coverInput.name = 'coverUrl';
            document.querySelector('form').appendChild(coverInput);
        }
        coverInput.value = release.cover_image || release.thumb || '';

        // Show preview
        const previewDiv = document.getElementById('discogs-preview');
        if (previewDiv) {
            previewDiv.innerHTML = `<img src="${release.cover_image || release.thumb}" class="w-16 h-16 object-cover rounded-lg shadow-sm border border-slate-200">`;
            previewDiv.classList.remove('hidden');
        }

        // Hide Results
        document.getElementById('discogs-results').classList.add('hidden');
        this.showToast('Datos cargados de Discogs');
    },

    saveDiscogsToken() {
        const token = prompt('Ingresa tu Personal Access Token de Discogs:');
        if (token) {
            this.state.discogsToken = token;
            db.collection('settings').doc('general').set({ discogsToken: token }, { merge: true })
                .then(() => this.showToast('Token guardado'))
                .catch(err => console.error(err));
        }
    },

    renderConsignments(container) {
        const currentYear = this.state.filterYear;
        const selectedMonths = this.state.filterMonths;
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Helper to get selected period text
        const periodText = selectedMonths.length === 12
            ? `Año ${currentYear}`
            : `${selectedMonths.map(m => monthNames[m]).join(', ')} ${currentYear}`;

        const html = `
            <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 class="font-display text-2xl font-bold text-brand-dark">Consignaciones</h2>
                        <p class="text-sm text-slate-500">Reporte para: <span class="font-bold text-brand-orange">${periodText}</span></p>
                    </div>
                    
                    <div class="flex flex-col items-end gap-2">
                        <div class="flex bg-white rounded-xl shadow-sm border border-orange-100 p-1">
                            ${monthNames.map((m, i) => `
                                <button onclick="app.toggleMonthFilter(${i}); app.renderConsignments(document.getElementById('app-content'))" 
                                    class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedMonths.includes(i) ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-400 hover:bg-orange-50 hover:text-brand-orange'}">
                                    ${m}
                                </button>
                            `).join('')}
                        </div>
                        <select onchange="app.state.filterYear = parseInt(this.value); app.saveData(); app.renderConsignments(document.getElementById('app-content'))" class="bg-white border border-orange-100 text-slate-600 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:border-brand-orange">
                            <option value="2024" ${currentYear === 2024 ? 'selected' : ''}>2024</option>
                            <option value="2025" ${currentYear === 2025 ? 'selected' : ''}>2025</option>
                        </select>
                    </div>

                    <button onclick="app.openAddConsignorModal()" class="bg-brand-dark text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20">
                        + Nuevo Socio
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${this.state.consignors.map(c => {
            // Calculate Stats
            const theirItems = this.state.inventory.filter(i => i.owner === c.name);
            const inStockCount = theirItems.reduce((sum, i) => sum + i.stock, 0);

            const soldItems = this.state.sales.filter(s => {
                const d = new Date(s.date);
                return s.owner === c.name &&
                    d.getFullYear() === currentYear &&
                    selectedMonths.includes(d.getMonth());
            });

            const totalSold = soldItems.length;
            const totalPayout = soldItems.reduce((sum, s) => sum + s.cost, 0);

            return `
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 hover:shadow-md transition-shadow flex flex-col h-full">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <h3 class="font-bold text-lg text-brand-dark">${c.name}</h3>
                                    <p class="text-xs text-slate-500">Acuerdo: <span class="font-bold text-brand-orange">${c.agreementSplit}%</span> para el socio</p>
                                </div>
                                <button onclick="app.deleteConsignor('${c.id}')" class="text-slate-300 hover:text-red-500 transition-colors">
                                    <i class="ph-fill ph-trash"></i>
                                </button>
                            </div>
                            
                            <div class="space-y-3 mb-6 flex-1">
                                <div class="flex justify-between text-sm">
                                    <span class="text-slate-500">En Stock:</span>
                                    <span class="font-bold text-brand-dark">${inStockCount} vinilos</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-slate-500">Vendidos (${periodText}):</span>
                                    <span class="font-bold text-brand-dark">${totalSold} u.</span>
                                </div>
                                <div class="flex justify-between text-sm pt-2 border-t border-orange-50">
                                    <span class="font-bold text-brand-dark">A Pagar:</span>
                                    <span class="font-display font-bold text-xl text-brand-orange">${this.formatCurrency(totalPayout)}</span>
                                </div>
                            </div>

                            <div class="bg-orange-50/50 rounded-xl p-3">
                                <p class="text-[10px] uppercase font-bold text-slate-400 mb-2">Detalle de Ventas</p>
                                <div class="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    ${soldItems.length > 0 ? soldItems.map(s => `
                                        <div class="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-orange-100/50">
                                            <div class="flex flex-col truncate w-2/3">
                                                <span class="font-medium text-slate-700 truncate" title="${s.album}">${s.album}</span>
                                                <span class="text-[10px] text-slate-400">${this.formatDate(s.date)}</span>
                                            </div>
                                            <span class="font-bold text-brand-dark">${this.formatCurrency(s.cost)}</span>
                                        </div>
                                    `).join('') : '<p class="text-xs text-slate-400 italic text-center py-2">Sin ventas en este periodo</p>'}
                                </div>
                            </div>
                        </div>
                        `;
        }).join('')}
                    
                    ${this.state.consignors.length === 0 ? `
                        <div class="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                            <p class="text-slate-400 mb-4">No hay socios registrados.</p>
                            <button onclick="app.openAddConsignorModal()" class="text-brand-orange font-bold hover:underline">Agregar el primero</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    openAddConsignorModal() {
        const modalHtml = `
            <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                this.showToast('Socio registrado correctamente');
                document.getElementById('modal-overlay').remove();
            })
            .catch(err => console.error(err));
    },

    deleteConsignor(id) {
        if (!confirm('¿Eliminar este socio?')) return;
        db.collection('consignors').doc(id).delete()
            .then(() => this.showToast('Socio eliminado'))
            .catch(err => console.error(err));
    },

    renderVAT(container) {
        // Filter by selected year
        const yearSales = this.state.sales.filter(s => new Date(s.date).getFullYear() === this.state.filterYear);
        const yearExpenses = this.state.expenses.filter(e => new Date(e.date).getFullYear() === this.state.filterYear);

        // Calculate VAT
        let totalSalesVAT = 0;
        let totalExpensesVAT = 0;

        if (this.state.vatActive) {
            totalSalesVAT = yearSales.reduce((sum, s) => sum + this.getVatComponent(s.total), 0);
            totalExpensesVAT = yearExpenses
                .filter(e => e.hasVat)
                .reduce((sum, e) => sum + this.getVatComponent(e.amount), 0);
        }

        const netVAT = totalSalesVAT - totalExpensesVAT;

        const html = `
            <div class="max-w-4xl mx-auto px-4 md:px-8 pb-24 pt-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="font-display text-2xl font-bold text-brand-dark">Reporte VAT (Moms)</h2>
                    <div class="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-orange-100">
                        <span class="text-sm font-medium text-slate-600">VAT Activo</span>
                        <button onclick="app.toggleVAT()" class="w-12 h-6 rounded-full transition-colors relative ${this.state.vatActive ? 'bg-brand-orange' : 'bg-slate-300'}">
                            <div class="w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${this.state.vatActive ? 'left-7' : 'left-1'}"></div>
                        </button>
                    </div>
                </div>

                <div class="bg-brand-dark text-white rounded-3xl p-8 mb-8 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-brand-orange opacity-10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div class="relative z-10 text-center">
                        <p class="text-slate-400 font-medium mb-2">Balance VAT (${this.state.filterYear})</p>
                        <h2 class="text-6xl font-display font-bold mb-2">${this.formatCurrency(netVAT)}</h2>
                        <p class="text-sm text-slate-400">${netVAT > 0 ? 'A pagar a Skat' : 'A reclamar'}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                        <h3 class="font-bold text-lg mb-4 text-brand-dark">VAT Recaudado (Ventas)</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between text-sm">
                                <span class="text-slate-500">Ventas Brutas</span>
                                <span class="font-medium">${this.formatCurrency(yearSales.reduce((s, i) => s + i.total, 0))}</span>
                            </div>
                            <div class="flex justify-between text-sm pt-3 border-t border-slate-100">
                                <span class="font-bold text-brand-orange">Total VAT (25%)</span>
                                <span class="font-bold text-brand-orange">${this.formatCurrency(totalSalesVAT)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                        <h3 class="font-bold text-lg mb-4 text-brand-dark">VAT Deducible (Gastos)</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between text-sm">
                                <span class="text-slate-500">Gastos con VAT</span>
                                <span class="font-medium">${this.formatCurrency(yearExpenses.filter(e => e.hasVat).reduce((s, i) => s + i.amount, 0))}</span>
                            </div>
                            <div class="flex justify-between text-sm pt-3 border-t border-slate-100">
                                <span class="font-bold text-green-600">Total Deducible</span>
                                <span class="font-bold text-green-600">${this.formatCurrency(totalExpensesVAT)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    toggleVAT() {
        this.state.vatActive = !this.state.vatActive;
        this.saveData();
        this.renderVAT(document.getElementById('app-content'));
    },


};

// Start App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
