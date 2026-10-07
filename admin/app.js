// Firebase Firestore reference (initialized in index.html)
const db = firebase.firestore();
const APP_VERSION = '2026.03.20.1';
console.log('🚀 El Cuartito Admin v' + APP_VERSION + ' loaded');

const auth = window.auth;

/* ============================================================
   PRE-FLIGHT Shipmondo — validadores sin dependencias
   Spec: ~/workspace/your_files/shipmondo-preflight/shipmondo-preflight-validacion.md
   Reglas idénticas a los esquemas Zod de la Parte A.
   Cada validador devuelve un array de { field, message } (vacío = OK).
   ============================================================ */

const EC_EU_COUNTRIES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU",
  "IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
]);

/* Métodos que exigen retiro en punto de servicio (shop delivery).
   "shop" es el valor genérico de la UI; el resto son códigos reales de
   producto de Shipmondo — agregar aquí los que se usen al integrar la API. */
const EC_SHOP_DELIVERY_METHODS = new Set([
  "shop",
  "dao_shop", "gls_shop", "postnord_shop", "dhl_shop", "bring_shop",
]);

const EC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EC_HAS_LETTER = (s) => /[\p{L}]/u.test(s || "");
const EC_HAS_DIGIT  = (s) => /\d/.test(s || "");
const ecDigits = (s) => String(s || "").replace(/\D/g, "");

/* Etiquetas cortas para las píldoras de alerta de la tarjeta */
const EC_FIELD_LABELS = {
  "receiver.name":         "Falta nombre",
  "receiver.address1":     "Falta dirección",
  "receiver.zipcode":      "Falta código postal",
  "receiver.city":         "Falta ciudad",
  "receiver.country_code": "Falta país",
  "receiver.email":        "Falta email",
  "receiver.phone":        "Falta teléfono",
  "parcel.weight":         "Falta peso",
  "shippingMethod":        "Falta método",
  "service_point.id":      "Falta punto de retiro",
  "customs":               "Falta aduana",
};

/* ---------- 1. Destinatario (Receiver Strict Schema) ---------- */
function ecValidateReceiver(r = {}) {
  const out = [];
  const name = String(r.name || "").trim();
  if (!name) out.push({ field: "receiver.name", message: "Falta nombre del destinatario" });
  else if (!EC_HAS_LETTER(name)) out.push({ field: "receiver.name", message: "El nombre no puede contener solo caracteres especiales" });

  const a1 = String(r.address1 || "").trim();
  if (a1.length <= 5) out.push({ field: "receiver.address1", message: "La dirección debe tener más de 5 caracteres" });
  else {
    if (!EC_HAS_LETTER(a1)) out.push({ field: "receiver.address1", message: "La dirección debe contener letras" });
    if (!EC_HAS_DIGIT(a1))  out.push({ field: "receiver.address1", message: "La dirección debe incluir el número de puerta" });
  }

  if (!String(r.zipcode || "").trim()) out.push({ field: "receiver.zipcode", message: "Falta código postal" });
  if (!String(r.city || "").trim())    out.push({ field: "receiver.city", message: "Falta ciudad" });

  const cc = String(r.country_code || "").trim();
  if (!/^[A-Z]{2}$/.test(cc)) out.push({ field: "receiver.country_code", message: "El país debe ser ISO alpha-2 en mayúsculas (ej. DK)" });

  const email = String(r.email || "").trim();
  if (!EC_EMAIL_RE.test(email)) out.push({ field: "receiver.email", message: "Email inválido" });

  const phone = String(r.phone || "").trim();
  if (!/^\+?[0-9\s\-().]{8,20}$/.test(phone) || ecDigits(phone).length < 8)
    out.push({ field: "receiver.phone", message: "Teléfono inválido: solo números con prefijo internacional (ej. +45) y mínimo 8 dígitos" });

  return out;
}

/* ---------- 2. Paquete (Parcel Schema) ---------- */
function ecValidateParcel(p = {}) {
  const out = [];
  const w = p.weight;
  if (!Number.isInteger(w) || w <= 0)
    out.push({ field: "parcel.weight", message: "El peso debe ser un entero mayor a 0 (gramos)" });
  else if (w === 500 && !p.weightConfirmed)
    // 500 g es el default para un disco simple: válido solo si el operador lo confirmó
    out.push({ field: "parcel.weight", message: "Confirmá el peso del paquete (500 g pre-cargados)" });
  return out;
}

/* ---------- 3 + 4. Shipment completo (validaciones condicionales) ---------- */
function ecValidateShipment(input = {}) {
  const blockers = [
    ...ecValidateReceiver(input.receiver),
    ...ecValidateParcel(input.parcel),
  ];

  if (!String(input.shippingMethod || "").trim())
    blockers.push({ field: "shippingMethod", message: "Falta método de envío" });

  // Regla 3: shop delivery -> service_point.id obligatorio
  if (EC_SHOP_DELIVERY_METHODS.has(input.shippingMethod) && !String(input.service_point?.id || "").trim()) {
    blockers.push({ field: "service_point.id", message: "Este método exige retiro en tienda: ingresá el ID del punto de servicio" });
  }

  // Regla 4: fuera de la UE -> customs obligatorio
  const cc = String(input.receiver?.country_code || "").trim();
  const customs = input.customs || [];
  if (cc && !EC_EU_COUNTRIES.has(cc)) {
    if (!customs.length) {
      blockers.push({ field: "customs", message: `Destino fuera de la UE (${cc}): la declaración de aduana es obligatoria` });
    } else customs.forEach((c, i) => {
      if (!String(c.description || "").trim()) blockers.push({ field: `customs.${i}.description`, message: "Falta descripción del ítem para aduana" });
      if (!(Number(c.value) > 0))                 blockers.push({ field: `customs.${i}.value`, message: "El valor declarado debe ser mayor a 0" });
      if (!/^[A-Z]{3}$/.test(String(c.currency || ""))) blockers.push({ field: `customs.${i}.currency`, message: "Moneda ISO 4217 (ej. DKK, EUR)" });
    });
  }
  return blockers;
}

const ecCanGenerateLabel = (input) => ecValidateShipment(input).length === 0;

/* ---------- Payload Shipmondo (se arma solo si ecCanGenerateLabel es true) ---------- */
function ecBuildShipmondoPayload(sale, input) {
  const r = input.receiver;
  const payload = {
    order_id: sale.orderNumber || sale.id,
    receiver_name: r.name,
    receiver_address1: r.address1,
    receiver_zipcode: r.zipcode,
    receiver_city: r.city,
    receiver_country_code: r.country_code,
    receiver_email: r.email,
    receiver_mobile: r.phone,
    parcels: [{ weight: input.parcel.weight }],
    // Si se eligió una tarifa real (Live Rates), su productCode viaja tal cual;
    // si no, placeholders hasta integrar la API.
    product_code: (() => {
      const m = input.shippingMethod || "home";
      if (m !== "home" && m !== "shop") return m;
      return m === "shop" ? "SHOP_PRODUCT_CODE" : "HOME_PRODUCT_CODE";
    })(),
    service_codes: "email_notification,sms_notification",
  };
  if (input.service_point && input.service_point.id) {
    payload.parties = [{ type: "service_point", service_point_id: input.service_point.id }];
  }
  if (input.customs && input.customs.length) {
    payload.customs = input.customs;
  }
  return payload;
}

/* ============================================================
   LIVE RATES · Cotización en tiempo real (Shipmondo)
   El frontend llama al backend propio (proxy); la API key nunca
   viaja al navegador. Si los endpoints no existen → QUOTE_ERROR
   elegante con reintento, sin romper nada.
   ============================================================ */

/* Config tienda (Datos Legales): Dybbølsgade 14 st tv, 1721 København V */
const EC_SENDER_ZIP = "1721";
const EC_SENDER_COUNTRY = "DK";

/* Máquina de estados por pedido */
const QUOTE_IDLE = "idle";        // nada pedido aún
const QUOTE_LOADING = "loading";  // esperando tarifas
const QUOTE_ERROR = "error";      // falló la cotización (reintentable)
const QUOTE_READY = "ready";      // tarifas en pantalla, sin selección
const QUOTE_POINTS = "points";    // cargando puntos de retiro
const QUOTE_SELECTED = "selected";// tarifa (+ punto si aplica) elegida

function ecNewQuoteState() {
  return { status: QUOTE_IDLE, rates: [], selectedRateId: null, servicePoints: [], selectedPointId: null, error: null };
}

/* Precio danés: 39 -> "39,00 kr." */
function formatDKK(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr.";
}

/* Prereq lite para cotizar: CP + país + peso (puro, testeable).
   El Pre-Flight completo (email, teléfono, dirección) se exige al comprar, no al cotizar. */
function ecQuotePrereq(input = {}) {
  const out = [];
  const r = input.receiver || {};
  if (!String(r.zipcode || "").trim()) out.push({ field: "receiver.zipcode", message: "Falta código postal" });
  const cc = String(r.country_code || "").trim();
  if (!/^[A-Z]{2}$/.test(cc)) out.push({ field: "receiver.country_code", message: "Falta país válido (ISO alpha-2)" });
  const w = input.parcel ? input.parcel.weight : undefined;
  if (!Number.isInteger(w) || w <= 0) out.push({ field: "parcel.weight", message: "Falta peso válido" });
  return out;
}

/* Tarifas ordenadas por precio ascendente (puro, testeable) */
function ecSortRates(rates = []) {
  return rates.slice().sort((a, b) => Number(a.price) - Number(b.price));
}

/* Estado del botón final a partir del state (puro, testeable) */
function ecQuoteBuyState(st = {}) {
  const rate = (st.rates || []).find(r => r.id === st.selectedRateId) || null;
  if (!rate) return { ready: false, rate: null, needsPoint: false, label: "Elegí una tarifa para continuar" };
  const needsPoint = rate.serviceType === "shop";
  const ready = !needsPoint || !!st.selectedPointId;
  return { ready, rate, needsPoint, label: `Comprar Etiqueta — ${formatDKK(rate.price)}` };
}

/* Escape HTML mínimo para datos que vienen del backend */
function ecEsc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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
                    cost: productData.cost || 0,
                    providerOrigin: productData.provider_origin || 'Local_Used',
                    productCondition: item.productCondition || item.condition || productData.product_condition || productData.condition || 'Used'
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
                    qty: item.quantity,
                    providerOrigin: item.providerOrigin || 'Local_Used',
                    productCondition: item.productCondition || 'Used'
                }))
            });

            for (const item of itemsWithData) {
                transaction.update(item.ref, {
                    stock: firebase.firestore.FieldValue.increment(-item.quantity)
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

    async cancelOrder(saleId) {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch(`${BASE_API_URL}/sales/${saleId}/cancel-order`, {
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
    // --- SKU HISTORICAL FIX SCRIPT ---
    async runSkuFix_v3() {
        if (localStorage.getItem('sku_fix_run_v3')) return;
        localStorage.setItem('sku_fix_run_v3', 'true');
        console.log("🔍 Buscando el SKU histórico más alto absoluto...");
        
        try {
            // 1. Get all products
            const pSnap = await db.collection('products').get();
            let maxSku = 0;
            const skuRe = /^SKU-(\d+)$/;
            
            pSnap.docs.forEach(d => {
                const s = d.data().sku;
                if (s) {
                    const m = s.match(skuRe);
                    if (m) maxSku = Math.max(maxSku, parseInt(m[1]));
                }
            });
            
            // 2. Get all sales items
            const sSnap = await db.collection('sales').get();
            sSnap.docs.forEach(d => {
                const items = d.data().items || [];
                items.forEach(item => {
                    const s = item.sku;
                    if (s) {
                        const m = s.match(skuRe);
                        if (m) maxSku = Math.max(maxSku, parseInt(m[1]));
                    }
                });
            });
            
            console.log("✅ El SKU histórico más alto encontrado es:", maxSku);
            
            const usedSkus = new Set();
            // Add all sold SKUs to used
            sSnap.docs.forEach(d => {
                (d.data().items || []).forEach(i => {
                    if (i.sku) usedSkus.add(i.sku);
                });
            });
            
            const duplicates = [];
            // Sort products from oldest to newest so older products keep their SKU
            const products = pSnap.docs.map(d => ({id: d.id, ref: d.ref, data: d.data()}))
                                       .sort((a,b) => (a.data.created_at?.seconds || 0) - (b.data.created_at?.seconds || 0));
                                       
            for (const p of products) {
                const s = p.data.sku;
                if (s) {
                    if (usedSkus.has(s)) {
                        // Conflict! This SKU is used by a sale or older product
                        duplicates.push(p);
                    } else {
                        usedSkus.add(s);
                    }
                }
            }
            
            if (duplicates.length > 0) {
                console.log(`⚠️ Encontrados ${duplicates.length} productos con SKU en conflicto. Arreglando...`);
                let count = maxSku;
                let msg = "";
                await db.runTransaction(async (t) => {
                    const cRef = db.collection('metadata').doc('vinylCounter');
                    for (const p of duplicates) {
                        count++;
                        const nSku = `SKU-${String(count).padStart(3, '0')}`;
                        const qId = String(count).padStart(4, '0');
                        t.update(p.ref, { sku: nSku, quickId: qId });
                        msg += `- ${p.data.album} (era ${p.data.sku}) -> ahora es ${nSku}\n`;
                    }
                    t.set(cRef, { current: count }, { merge: true });
                });
                alert("🛠️ Arreglo histórico completado!\nSe reasignaron los SKUs que chocaban con discos viejos vendidos:\n\n" + msg + "\nPor favor, recarga la página.");
            } else {
                // Update counter just in case it's lagging
                const cRef = db.collection('metadata').doc('vinylCounter');
                const cDoc = await cRef.get();
                const current = cDoc.exists ? (cDoc.data().current || 0) : 0;
                if (maxSku > current) {
                    await cRef.set({ current: maxSku }, { merge: true });
                    console.log(`🆙 Contador actualizado a ${maxSku}`);
                }
                console.log("✅ No hay conflictos de SKU.");
            }
        } catch (e) {
            console.error("❌ Error en script histórico:", e);
        }
    },
    // ------------------------------------------

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
        expenseFilterYear: new Date().getFullYear(),
        expenseFilterMonths: [new Date().getMonth()],
        expenseCategoryFilter: 'all',
        expenseWizard: null,
        incomeFilterYear: new Date().getFullYear(),
        incomeFilterMonths: [new Date().getMonth()],
        incomeSearch: '',
        incomeCategoryFilter: 'all',
        incomeUninvoicedOnly: false,
        showIncomeForm: false,
        invoicePrefill: null,
        events: [],
        selectedDate: new Date(),
        vatActive: false,
        manualSaleSearch: '',
        posCondition: 'Used',
        posSelectedItemSku: null,
        orderFeedFilter: 'all',
        filterGenre: 'all',
        filterOwner: 'all',
        filterLabel: 'all',
        filterLot: 'all',
        filterStorage: 'all',
        filterDiscogs: 'all',
        filterStock: 'all',
        filterCondition: 'all',
        filterStockTime: [],
        showStats: false,
        showAdvancedFilters: false,
        privacyMode: false,
        rsdExtraDiscount: false,
        dashboardAnalysisMode: 'genre'
    },

    // Helper: Get effective price for an item (with RSD 10% discount if applicable)
    getEffectivePrice(item) {
        return item.is_rsd_discount ? Math.round(item.price * 0.9) : item.price;
    },

    async init() {
        this.runSkuFix_v3(); // Historical duplicate SKU fix
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
                    
                    // Set up real-time inventory listeners
                    this.setupListeners();

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

        // Global click listener to hide search results when clicking outside
        document.addEventListener('click', (e) => {
            const discogsResults = document.getElementById('discogs-results');
            const discogsInput = document.getElementById('discogs-search-input');
            if (discogsResults && !discogsResults.contains(e.target) && e.target !== discogsInput) {
                discogsResults.classList.add('hidden');
            }

            const skuResults = document.getElementById('sku-results');
            const skuInput = document.getElementById('sku-search');
            if (skuResults && !skuResults.contains(e.target) && e.target !== skuInput) {
                skuResults.classList.add('hidden');
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
            const um = document.getElementById('unified-modal');
            if (um) {
                um.remove();
                this.openUnifiedOrderDetailModal(id);
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
        // Real-time inventory listener to instantly reflect backend stock drops
        if (this._unsubscribeProducts) {
            this._unsubscribeProducts();
        }
        this._unsubscribeProducts = db.collection('products').onSnapshot(snapshot => {
            this.state.inventory = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    condition: data.condition || 'VG',
                    owner: data.owner || 'El Cuartito',
                    label: data.label || 'Desconocido',
                    storageLocation: data.storageLocation || 'Tienda',
                    cover_image: data.cover_image || data.coverImage || null
                };
            });
            // Re-render UI if we are on a tab that shows inventory
            if (this.state.currentTab === 'inventory' || this.state.currentTab === 'dashboard') {
                this.renderCurrentTab();
            }
        }, err => {
            console.error("Inventory listener error:", err);
        });
    },

    async loadData() {
        try {
            // Load data directly from Firestore (no Railway needed)
            const [inventorySnap, salesSnap, expensesSnap, eventsSnap, consignorsSnap, extraIncomeSnap] = await Promise.all([
                db.collection('products').get(),
                db.collection('sales').get(), // ✅ Removed orderBy to avoid filtering out documents
                db.collection('expenses').get(), // ✅ Removed orderBy to avoid filtering out new docs
                db.collection('events').orderBy('date', 'desc').get(),
                db.collection('consignors').get(),
                db.collection('extra_income').get()
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

            // Load extra income
            this.state.extraIncome = extraIncomeSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => new Date(b.date) - new Date(a.date));

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
            case 'pos': this.renderPOS(container); break;
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
            case 'contabilidad': this.renderContabilidad(container); break;
            case 'facturasManual': this.renderFacturasManual(container); break;
            case 'extraIncome': this.renderExtraIncome(container); break;
            case 'newsletter': this.renderNewsletter(container); break;
        }
    },

    async renderNewsletter(container) {
        if (!this.state.newsletterSelectedIds) {
            this.state.newsletterSelectedIds = [];
        }

        let subscriberCount = 0;
        let subscribersList = [];
        try {
            const snap = await db.collection('subscribers').where('active', '==', true).get();
            subscriberCount = snap.size;
            subscribersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
            console.warn('Could not fetch subscribers count:', err);
        }
        this.state.subscribersList = subscribersList;

        let products = (this.state.inventory && this.state.inventory.length > 0)
            ? [...this.state.inventory]
            : [...(this.state.products || [])];

        if (products.length === 0) {
            try {
                const snap = await db.collection('products').get();
                products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.state.inventory = products;
            } catch (e) {
                console.warn("Could not fetch products for newsletter:", e);
            }
        }

        // Sort products newest first (by created_at, createdAt, timestamp, quickId, or SKU)
        const getProductTime = (p) => {
            if (p.created_at) {
                const t = new Date(p.created_at).getTime();
                if (!isNaN(t)) return t;
            }
            if (p.createdAt) {
                const t = new Date(p.createdAt).getTime();
                if (!isNaN(t)) return t;
            }
            if (p.timestamp) {
                if (typeof p.timestamp.seconds === 'number') return p.timestamp.seconds * 1000;
                const t = new Date(p.timestamp).getTime();
                if (!isNaN(t)) return t;
            }
            if (p.quickId) {
                const num = parseInt(p.quickId, 10);
                if (!isNaN(num)) return num;
            }
            if (p.sku && p.sku.startsWith('SKU-')) {
                const num = parseInt(p.sku.replace('SKU-', ''), 10);
                if (!isNaN(num)) return num;
            }
            return 0;
        };

        products.sort((a, b) => getProductTime(b) - getProductTime(a));

        const selectedProducts = products.filter(p => this.state.newsletterSelectedIds.includes(p.id));

        const html = `
            <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                ${this.sectionHeader({
                    title: 'Drops & Newsletter',
                    subtitle: 'Envía las novedades semanales a tus suscriptores de Resend',
                    filters: `
                    <div onclick="app.showSubscribersModal()" class="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 cursor-pointer hover:border-brand-orange hover:shadow-md transition-all group">
                        <div class="w-10 h-10 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center group-hover:scale-110 transition-transform">
                            <i class="ph-bold ph-users text-xl"></i>
                        </div>
                        <div>
                            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                Suscriptores activos
                                <i class="ph-bold ph-caret-right text-brand-orange"></i>
                            </div>
                            <div class="text-xl font-bold text-brand-dark">${subscriberCount} <span class="text-xs font-normal text-slate-400 underline">(ver lista)</span></div>
                        </div>
                    </div>`
                })}

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <!-- Left Column: Form & Selected Items -->
                    <div class="lg:col-span-7 space-y-6">
                        <!-- Campaign Settings Card -->
                        <div class="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm space-y-4">
                            <h2 class="text-lg font-bold text-brand-dark flex items-center gap-2">
                                <i class="ph-bold ph-paper-plane-tilt text-brand-orange"></i>
                                Configuración del Envío
                            </h2>

                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Asunto del Email</label>
                                <input type="text" id="newsletter-subject" 
                                    value="New This Week — El Cuartito Records" 
                                    placeholder="Ej: Fresh Drops This Week 🎵"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white text-sm font-medium text-brand-dark">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Mensaje de Introducción</label>
                                <textarea id="newsletter-intro" rows="3"
                                    placeholder="Mensaje personalizado de introducción..."
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white text-sm font-medium text-brand-dark">Fresh drops just landed at El Cuartito Records. Here's what's new this week.</textarea>
                            </div>
                        </div>

                        <!-- Selected Vinyls Box -->
                        <div class="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm space-y-4">
                            <div class="flex items-center justify-between">
                                <h2 class="text-lg font-bold text-brand-dark flex items-center gap-2">
                                    <i class="ph-bold ph-disc text-brand-orange"></i>
                                    Discos Seleccionados (${selectedProducts.length})
                                </h2>
                                ${selectedProducts.length > 0 ? `
                                    <button onclick="app.state.newsletterSelectedIds=[]; app.renderNewsletter(document.getElementById('app-content'));" className="text-xs font-bold text-red-500 hover:underline">
                                        Limpiar Selección
                                    </button>
                                ` : ''}
                            </div>

                            ${selectedProducts.length === 0 ? `
                                <div class="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                                    <i class="ph-duotone ph-disc text-4xl text-slate-300 mb-2"></i>
                                    <p class="text-sm font-medium text-slate-500">No has seleccionado ningún disco aún.</p>
                                    <p class="text-xs text-slate-400 mt-1">Elige los discos de la lista de la derecha para incluirlos en el drop.</p>
                                </div>
                            ` : `
                                <div class="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                                    ${selectedProducts.map(p => `
                                        <div class="py-3 flex items-center justify-between gap-3">
                                            <div class="flex items-center gap-3">
                                                <img src="${p.cover_image || p.image || 'logo.jpg'}" class="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0">
                                                <div>
                                                    <div class="text-sm font-bold text-brand-dark leading-tight">${p.title || p.album || 'Sin Título'}</div>
                                                    <div class="text-xs text-slate-500 uppercase">${p.artist || 'Desconocido'} · DKK ${p.price || 0}</div>
                                                </div>
                                            </div>
                                            <button onclick="app.toggleNewsletterProduct('${p.id}')" class="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors">
                                                <i class="ph-bold ph-x text-xs"></i>
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            `}

                            <button onclick="app.sendNewsletterDrop()" id="send-drop-btn"
                                ${selectedProducts.length === 0 || subscriberCount === 0 ? 'disabled' : ''}
                                class="w-full bg-brand-dark text-white font-bold py-4 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2">
                                <i class="ph-bold ph-paper-plane-tilt"></i>
                                <span>Enviar Weekly Drop a ${subscriberCount} Suscriptores</span>
                            </button>
                        </div>
                    </div>

                    <!-- Right Column: Product Picker -->
                    <div class="lg:col-span-5">
                        <div class="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm space-y-4">
                            <h2 class="text-lg font-bold text-brand-dark flex items-center gap-2">
                                <i class="ph-bold ph-magnifying-glass text-brand-orange"></i>
                                Buscar e Incluir Discos (${products.length})
                            </h2>

                            <input type="text" id="newsletter-product-search" 
                                oninput="app.filterNewsletterProducts(this.value)"
                                placeholder="Buscar por título, artista o sello..."
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white text-sm font-medium text-brand-dark">

                            <div id="newsletter-product-list" class="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                ${this.renderNewsletterProductList(products, '')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    renderNewsletterProductList(products, query) {
        let filtered = products;
        if (query && query.trim()) {
            const q = query.toLowerCase().trim();
            filtered = products.filter(p => 
                (p.title && p.title.toLowerCase().includes(q)) ||
                (p.album && p.album.toLowerCase().includes(q)) ||
                (p.artist && p.artist.toLowerCase().includes(q)) ||
                (p.label && p.label.toLowerCase().includes(q))
            );
        }

        const selectedIds = this.state.newsletterSelectedIds || [];

        return filtered.slice(0, 50).map(p => {
            const isSelected = selectedIds.includes(p.id);
            return `
                <div onclick="app.toggleNewsletterProduct('${p.id}')" 
                    class="p-3 rounded-2xl border ${isSelected ? 'border-brand-orange bg-orange-50/50' : 'border-slate-100 hover:border-slate-200'} cursor-pointer flex items-center justify-between gap-3 transition-all">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <img src="${p.cover_image || p.image || 'logo.jpg'}" class="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0">
                        <div class="truncate">
                            <div class="text-sm font-bold text-brand-dark truncate">${p.title || p.album || 'Sin Título'}</div>
                            <div class="text-xs text-slate-500 uppercase truncate">${p.artist || 'Desconocido'} · DKK ${p.price || 0}</div>
                        </div>
                    </div>
                    <div class="w-6 h-6 rounded-lg ${isSelected ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-400'} flex items-center justify-center shrink-0">
                        <i class="ph-bold ${isSelected ? 'ph-check' : 'ph-plus'} text-xs"></i>
                    </div>
                </div>
            `;
        }).join('');
    },

    filterNewsletterProducts(query) {
        const listEl = document.getElementById('newsletter-product-list');
        const products = (this.state.inventory && this.state.inventory.length > 0) ? this.state.inventory : (this.state.products || []);
        if (listEl) {
            listEl.innerHTML = this.renderNewsletterProductList(products, query);
        }
    },

    async showSubscribersModal() {
        let subscribers = this.state.subscribersList || [];
        try {
            const snap = await db.collection('subscribers').get();
            subscribers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (err) {
            console.error('Error fetching subscribers list:', err);
        }

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'subscribers-modal';
        modalOverlay.className = 'fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn';

        const modalContent = `
            <div class="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative max-h-[85vh] flex flex-col">
                <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center">
                            <i class="ph-bold ph-users text-xl"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-brand-dark">Lista de Suscriptores</h2>
                            <p class="text-xs text-slate-400 font-medium">${subscribers.length} correos registrados</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('subscribers-modal').remove()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <i class="ph-bold ph-x text-sm"></i>
                    </button>
                </div>

                <div class="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
                    ${subscribers.length === 0 ? `
                        <div class="p-8 text-center text-slate-400 font-medium">No hay suscriptores registrados aún.</div>
                    ` : subscribers.map(sub => `
                        <div class="py-3 flex items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center uppercase">
                                    ${(sub.email || 'U')[0]}
                                </div>
                                <div>
                                    <div class="text-sm font-bold text-brand-dark">${sub.email}</div>
                                    <div class="text-xs text-slate-400">Suscrito: ${sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString() : 'Reciente'}</div>
                                </div>
                            </div>
                            <span class="px-3 py-1 rounded-full text-xs font-bold ${sub.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">
                                ${sub.active !== false ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                        </div>
                    `).join('')}
                </div>

                <div class="pt-4 border-t border-slate-100 flex justify-end">
                    <button onclick="document.getElementById('subscribers-modal').remove()" class="bg-brand-dark text-white font-bold px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-sm">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        modalOverlay.innerHTML = modalContent;
        document.body.appendChild(modalOverlay);
    },

    toggleNewsletterProduct(id) {
        if (!this.state.newsletterSelectedIds) this.state.newsletterSelectedIds = [];
        const idx = this.state.newsletterSelectedIds.indexOf(id);
        if (idx > -1) {
            this.state.newsletterSelectedIds.splice(idx, 1);
        } else {
            this.state.newsletterSelectedIds.push(id);
        }
        this.renderNewsletter(document.getElementById('app-content'));
    },

    async sendNewsletterDrop() {
        const selectedIds = this.state.newsletterSelectedIds || [];
        if (selectedIds.length === 0) {
            alert('Debes seleccionar al menos un disco');
            return;
        }

        const subject = document.getElementById('newsletter-subject')?.value || 'New This Week — El Cuartito Records';
        const intro = document.getElementById('newsletter-intro')?.value || 'Fresh drops just landed at El Cuartito Records.';

        if (!confirm(`¿Estás seguro de enviar este Weekly Drop a todos los suscriptores?`)) {
            return;
        }

        const btn = document.getElementById('send-drop-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Enviando newsletter...';
        }

        const isLocal = window.location.hostname === 'localhost';
        const API_URL = isLocal ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app';

        try {
            const res = await fetch(`${API_URL}/api/newsletter/send-drop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productIds: selectedIds,
                    subject,
                    intro
                })
            });

            const data = await res.json();
            if (data.success) {
                this.showToast(`🚀 Drop enviado exitosamente a ${data.sentCount} suscriptores`, 'success');
                this.state.newsletterSelectedIds = [];
                this.renderNewsletter(document.getElementById('app-content'));
            } else {
                throw new Error(data.error || 'Error enviando newsletter');
            }
        } catch (err) {
            console.error('Error sending drop:', err);
            alert('Error al enviar el newsletter: ' + err.message);
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    renderDatosLegales(container) {
        const html = `
            <div class="max-w-4xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                ${this.sectionHeader({
                    title: 'Datos Legales',
                    subtitle: 'Información corporativa y de contacto'
                })}

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

    // ── Contabilidad (Brugtmoms Invoices) ──────────────────────────

    renderContabilidad(container) {
        const currentYear = new Date().getFullYear();
        const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

        // Initialize state if needed
        if (!this.state.contabilidadYear) this.state.contabilidadYear = currentYear;
        if (!this.state.contabilidadQuarter) this.state.contabilidadQuarter = currentQuarter;
        if (!this.state.contabilidadInvoices) this.state.contabilidadInvoices = [];
        if (!this.state.contabilidadLoading) this.state.contabilidadLoading = false;

        const year = this.state.contabilidadYear;
        const quarter = this.state.contabilidadQuarter;
        const invoices = this.state.contabilidadInvoices;
        const loading = this.state.contabilidadLoading;

        const channelBadge = (ch) => {
            const colors = { local: 'bg-emerald-100 text-emerald-700', online: 'bg-blue-100 text-blue-700', discogs: 'bg-purple-100 text-purple-700' };
            const labels = { local: 'Tienda', online: 'Webshop', discogs: 'Discogs' };
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[ch] || 'bg-slate-100 text-slate-600'}">${labels[ch] || ch}</span>`;
        };

        const html = `
            <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                ${this.sectionHeader({
                    title: 'Contabilidad',
                    subtitle: 'Facturas de venta — Brugtmoms compliance'
                })}

                <!-- Filters + Download Quarter -->
                <div class="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 mb-6">
                    <div class="flex flex-wrap items-center gap-4">
                        <div class="flex items-center gap-2">
                            <label class="text-xs font-bold text-slate-400 uppercase">Año</label>
                            <select id="contab-year" onchange="app.state.contabilidadYear = parseInt(this.value); app.loadInvoices()" class="dashboard-input bg-white h-10 px-3 rounded-lg border border-slate-200 font-semibold text-sm">
                                ${[currentYear, currentYear - 1, currentYear - 2].map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-xs font-bold text-slate-400 uppercase">Trimestre</label>
                            <select id="contab-quarter" onchange="app.state.contabilidadQuarter = parseInt(this.value); app.loadInvoices()" class="dashboard-input bg-white h-10 px-3 rounded-lg border border-slate-200 font-semibold text-sm">
                                ${[1, 2, 3, 4].map(q => `<option value="${q}" ${q === quarter ? 'selected' : ''}>Q${q} (${['Ene-Mar', 'Abr-Jun', 'Jul-Sep', 'Oct-Dic'][q - 1]})</option>`).join('')}
                            </select>
                        </div>

                        <div class="flex-1"></div>

                        <button onclick="app.loadInvoices()" class="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-sm text-slate-600 transition-colors">
                            <i class="ph-bold ph-arrows-clockwise"></i> Actualizar
                        </a>

                        <button onclick="app.backfillInvoices()" class="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-semibold text-sm text-emerald-700 transition-colors">
                            <i class="ph-bold ph-database"></i> Generar facturas anteriores
                        </a>

                        <button onclick="app.downloadQuarterInvoices()" class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-orange to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all hover:scale-[1.02]">
                            <i class="ph-bold ph-download-simple"></i> Descargar Trimestre Q${quarter}
                        </a>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="kpi-card">
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Facturas</div>
                        <div class="text-2xl font-bold text-brand-dark">${invoices.length}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Ventas Totales</div>
                        <div class="text-2xl font-bold text-brand-orange">${this.formatCurrency(invoices.reduce((s, i) => s + (i.totalAmount || 0), 0))}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Tienda</div>
                        <div class="text-2xl font-bold text-emerald-600">${invoices.filter(i => i.channel === 'local').length}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Online + Discogs</div>
                        <div class="text-2xl font-bold text-blue-600">${invoices.filter(i => i.channel !== 'local').length}</div>
                    </div>
                </div>

                <!-- Invoice Table -->
                <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                    ${loading ? `
                        <div class="flex items-center justify-center py-20">
                            <div class="text-center">
                                <div class="animate-spin w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p class="text-slate-400 font-medium">Cargando facturas...</p>
                            </div>
                        </div>
                    ` : invoices.length === 0 ? `
                        <div class="flex flex-col items-center justify-center py-20">
                            <i class="ph-duotone ph-receipt text-6xl text-slate-300 mb-4"></i>
                            <p class="text-slate-400 font-medium text-lg">No hay facturas para Q${quarter} ${year}</p>
                            <p class="text-slate-300 text-sm mt-1">Las facturas se generan automáticamente con cada venta</p>
                        </div>
                    ` : `
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b border-orange-100 bg-orange-50/50">
                                        <th class="text-left px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">#</th>
                                        <th class="text-left px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">Fecha</th>
                                        <th class="text-left px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">Canal</th>
                                        <th class="text-left px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">Cliente</th>
                                        <th class="text-left px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">Descripción</th>
                                        <th class="text-right px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">Total</th>
                                        <th class="text-center px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">PDF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${invoices.map((inv, idx) => `
                                        <tr class="inv-row border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}">
                                            <td class="px-5 py-3 text-sm font-mono font-bold text-brand-dark">${inv.invoiceNumber || '-'}</td>
                                            <td class="px-5 py-3 text-sm text-slate-600">${inv.date || '-'}</td>
                                            <td class="px-5 py-3">${channelBadge(inv.channel)}</td>
                                            <td class="px-5 py-3 text-sm font-medium text-slate-700 max-w-[150px] truncate">${inv.customerName || 'Butikskunde'}</td>
                                            <td class="px-5 py-3 text-sm text-slate-500 max-w-[200px] truncate">${inv.itemsSummary || '-'}</td>
                                            <td class="px-5 py-3 text-sm font-bold text-brand-dark text-right">${this.formatCurrency(inv.totalAmount || 0)}</td>
                                            <td class="px-5 py-3 text-center">
                                                <a href="${inv.downloadUrl || '#'}" target="_blank" class="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange hover:bg-brand-orange hover:text-white transition-all flex items-center justify-center mx-auto" title="Descargar PDF">
                                                    <i class="ph-bold ph-file-pdf"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>

                <!-- Brugtmoms Notice -->
                <div class="mt-6 bg-orange-50 border border-orange-200 rounded-2xl p-5">
                    <div class="flex items-start gap-3">
                        <i class="ph-duotone ph-scales text-2xl text-brand-orange mt-1"></i>
                        <div>
                            <p class="font-bold text-brand-dark text-sm mb-1">Brugtmoms — Margin Scheme Compliance</p>
                            <p class="text-sm text-slate-600">Todas las facturas incluyen la frase legal: <em>"Varen sælges efter de særlige regler for brugte varer - køber har ikke fradrag for momsen."</em></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Auto-load invoices if not already loaded
        if (!this.state.contabilidadLoaded) {
            this.loadInvoices();
        }
    },

    async loadInvoices() {
        this.state.contabilidadLoading = true;
        this.state.contabilidadLoaded = true;
        this.refreshCurrentView();

        try {
            const year = this.state.contabilidadYear;
            const quarter = this.state.contabilidadQuarter;
            const token = await auth.currentUser.getIdToken();
            const resp = await fetch(`${BASE_API_URL}/invoices?year=${year}&quarter=${quarter}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resp.ok) throw new Error('Error cargando facturas');
            const data = await resp.json();
            this.state.contabilidadInvoices = data.invoices || [];
        } catch (err) {
            console.error('Error loading invoices:', err);
            alert('Error cargando facturas: ' + err.message);
            this.showToast('Error cargando facturas', 'error');
            this.state.contabilidadInvoices = [];
        }

        this.state.contabilidadLoading = false;
        this.refreshCurrentView();
    },

    async downloadInvoicePdf(invoiceId) {
        try {
            const token = await auth.currentUser.getIdToken();
            const resp = await fetch(`${BASE_API_URL}/invoices/${invoiceId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resp.ok) throw new Error('Error descargando factura');
            const data = await resp.json();

            if (data.downloadUrl) {
                window.open(data.downloadUrl, '_blank');
            }
        } catch (err) {
            console.error('Error downloading invoice:', err);
            alert('Error descargando factura: ' + err.message);
            this.showToast('Error descargando factura', 'error');
        }
    },

    async downloadQuarterInvoices() {
        try {
            const year = this.state.contabilidadYear;
            const quarter = this.state.contabilidadQuarter;
            const token = await auth.currentUser.getIdToken();

            this.showToast(`Preparando descarga Q${quarter} ${year}...`);

            const resp = await fetch(`${BASE_API_URL}/invoices/quarter-download?year=${year}&quarter=${quarter}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resp.ok) throw new Error('Error descargando trimestre');
            const data = await resp.json();

            if (!data.invoices || data.invoices.length === 0) {
                this.showToast('No hay facturas para este trimestre', 'error');
                return;
            }

            // Download all PDFs using JSZip (already loaded in index.html)
            const zip = new JSZip();
            const folder = zip.folder(`Contabilidad_ElCuartito_${year}_Q${quarter}`);

            for (const inv of data.invoices) {
                try {
                    // Use backend proxy to avoid CORS issues
                    const pdfResp = await fetch(`${BASE_API_URL}/invoices/${inv.id}/file`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (!pdfResp.ok) throw new Error(`Fetch failed for ${inv.invoiceNumber}`);
                    
                    const blob = await pdfResp.blob();
                    folder.file(inv.fileName, blob);
                } catch (e) {
                    console.error(`Error downloading ${inv.fileName}:`, e);
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `Contabilidad_ElCuartito_${year}_Q${quarter}.zip`);
            this.showToast(`✅ ${data.invoices.length} facturas descargadas`);
        } catch (err) {
            console.error('Error downloading quarter:', err);
            alert('Error descargando trimestre: ' + err.message);
            this.showToast('Error descargando trimestre', 'error');
        }
    },

    async backfillInvoices() {
        if (!confirm('¿Generar facturas PDF para todas las ventas anteriores que no tienen factura?\n\nEsto se hará por lotes para evitar errores.')) return;

        try {
            this.showToast('🔄 Verificando conexión...');
            const token = await auth.currentUser.getIdToken();

            // 1. Connection Check (Pre-flight)
            try {
                const health = await fetch(`${BASE_API_URL}/api/health`);
                if (!health.ok) throw new Error('Servidor responde con error');
            } catch (e) {
                console.error('Health check failed:', e);
                // We let it slide if health check fails? No, better to warn.
                // But maybe /api/health is not open to CORS? (It should be)
                // Let's just proceed but warn console.
            }

            this.showToast('🔄 Iniciando backfill (Modo Seguro)...');

            let totalGenerated = 0;
            let totalSkipped = 0;
            let totalErrors = 0;
            let remaining = 1;
            const batchSize = 1; // ⚠️ SAFE MODE: 1 at a time

            while (remaining > 0) {
                const resp = await fetch(`${BASE_API_URL}/invoices/backfill`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ limit: batchSize })
                });

                if (!resp.ok) {
                    const text = await resp.text();
                    try {
                        const errData = JSON.parse(text);
                        throw new Error(errData.error || `Error ${resp.status}: ${resp.statusText}`);
                    } catch (e) {
                        throw new Error(`Error ${resp.status}: ${text.slice(0, 100)}`);
                    }
                }

                const data = await resp.json();

                if (!data.success) {
                    throw new Error(data.error || 'Unknown error from backend');
                }

                totalGenerated += data.generated;
                totalSkipped += data.skipped;
                remaining = data.remaining;

                if (data.errors) totalErrors += data.errors.length;

                this.showToast(`✅ Lote procesado: +${data.generated} facturas. Restantes: ${remaining}`);

                // Small delay to be nice to the server
                if (remaining > 0) await new Promise(r => setTimeout(r, 1000));
            }

            const msg = `✅ Backfill completado!\nGeneradas: ${totalGenerated}\nErrores: ${totalErrors}\nOmitidas: ${totalSkipped}`;
            alert(msg);
            this.showToast('Backfill completado');

            // Refresh the invoice list
            await this.loadInvoices();
        } catch (err) {
            console.error('Error in backfill:', err);
            alert(`❌ Error en backfill:\n\n${err.message}`);
            this.showToast('Error en backfill', 'error');
        }
    },

    // ── Facturas Manuales (Manual Invoice Generator) ─────────────────

    renderFacturasManual(container) {
        // Load existing manual invoices from state
        const manualInvoices = (this.state.contabilidadInvoices || []).filter(i => i.channel === 'manual' || i.isManual);
        const prefill = this.state.invoicePrefill || null;
        const pesc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const html = `
            <div class="max-w-4xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                ${this.sectionHeader({
                    title: 'Generar Factura',
                    subtitle: 'Facturas manuales para eventos, servicios y otros'
                })}

                ${prefill ? `
                <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0"><i class="ph-bold ph-file-plus text-lg text-blue-600"></i></div>
                        <div>
                            <p class="text-sm font-bold text-blue-900">Generando factura desde ingreso extra</p>
                            <p class="text-xs text-blue-600">${pesc(prefill.description || '')}${prefill.amount !== '' && prefill.amount != null ? ' · ' + this.formatCurrency(Number(prefill.amount) || 0) : ''}</p>
                        </div>
                    </div>
                    <button onclick="app.cancelInvoicePrefill()" class="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap">Cancelar</button>
                </div>` : ''}

                <!-- Invoice Form -->
                <form id="manual-invoice-form" onsubmit="app.submitManualInvoice(event)" class="bg-white rounded-3xl shadow-sm border border-orange-100 p-8 mb-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <!-- Customer Name -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Nombre del Cliente *</label>
                            <input type="text" name="customerName" required placeholder="Ej: København Festival A/S" value="${pesc(prefill?.customerName)}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                        </div>

                        <!-- Customer VAT -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">VAT / CVR del Cliente</label>
                            <input type="text" name="customerVAT" placeholder="Ej: DK12345678" value="${pesc(prefill?.customerVAT)}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                        </div>

                        <!-- Customer Address -->
                        <div class="md:col-span-2">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Dirección del Cliente</label>
                            <input type="text" name="customerAddress" placeholder="Ej: Vesterbrogade 100, 1620 København V, Denmark" value="${pesc(prefill?.customerAddress)}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                        </div>

                        <!-- Description -->
                        <div class="md:col-span-2">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Descripción del Servicio *</label>
                            <textarea name="description" required rows="3" placeholder="Ej: DJ Set para evento privado — 4 horas, incluyendo equipo de sonido"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark resize-none">${pesc(prefill?.description)}</textarea>
                        </div>

                        <!-- Amount -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Precio Total (DKK) *</label>
                            <div class="relative">
                                <input type="number" name="amount" required step="0.01" min="0" placeholder="5000" value="${prefill?.amount ?? ''}"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-16 outline-none focus:border-brand-orange focus:bg-white transition-all font-bold text-xl text-brand-dark">
                                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">DKK</span>
                            </div>
                        </div>

                        <!-- VAT Amount -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Heraf Moms / VAT (DKK)</label>
                            <div class="relative">
                                <input type="number" name="vatAmount" step="0.01" min="0" placeholder="1000" value="${prefill?.vatAmount ?? ''}"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-16 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">DKK</span>
                            </div>
                            <p class="text-[10px] text-slate-400 mt-1">Opcional. Cantidad de IVA incluida en el total.</p>
                        </div>

                        <!-- Date -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Fecha de Factura *</label>
                            <input type="date" name="date" required value="${pesc(prefill?.date) || new Date().toISOString().split('T')[0]}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                        </div>

                        <!-- Payment Method -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Método de Pago</label>
                            <select name="paymentMethod" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                                <option value="Transfer" ${(prefill?.paymentMethod || 'Transfer') === 'Transfer' ? 'selected' : ''}>Transferencia Bancaria</option>
                                <option value="MobilePay" ${prefill?.paymentMethod === 'MobilePay' ? 'selected' : ''}>MobilePay</option>
                                <option value="CASH" ${prefill?.paymentMethod === 'CASH' ? 'selected' : ''}>Efectivo / Cash</option>
                                <option value="CARD" ${prefill?.paymentMethod === 'CARD' ? 'selected' : ''}>Tarjeta / Card</option>
                            </select>
                        </div>
                    </div>

                    <!-- Submit -->
                    <div class="flex items-center justify-between pt-4 border-t border-slate-100">
                        <p class="text-xs text-slate-400">La factura se generará en PDF y se guardará automáticamente</p>
                        <button type="submit" id="manual-invoice-btn"
                            class="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-orange to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all hover:scale-[1.02]">
                            <i class="ph-bold ph-file-pdf"></i> Generar Factura PDF
                        </button>
                    </div>
                </form>

                <!-- Result area (shown after generation) -->
                <div id="manual-invoice-result" class="hidden mb-8">
                    <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <i class="ph-bold ph-check-circle text-xl text-emerald-600"></i>
                            </div>
                            <div>
                                <p class="font-bold text-emerald-800" id="result-invoice-number"></p>
                                <p class="text-sm text-emerald-600">Factura generada correctamente</p>
                            </div>
                        </div>
                        <a id="result-download-link" href="#" target="_blank"
                            class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors">
                            <i class="ph-bold ph-download-simple"></i> Descargar PDF
                        </a>
                    </div>
                </div>

                <!-- Recent Manual Invoices -->
                <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                    <div class="px-6 py-4 border-b border-orange-100 bg-orange-50/30">
                        <h3 class="font-bold text-brand-dark">Facturas Manuales Recientes</h3>
                    </div>
                    ${manualInvoices.length === 0 ? `
                        <div class="py-16 text-center">
                            <i class="ph-duotone ph-note-blank text-5xl text-slate-300 mb-3 block"></i>
                            <p class="text-slate-400 font-medium">No hay facturas manuales aún</p>
                            <p class="text-slate-300 text-sm mt-1">Las facturas generadas aparecerán aquí</p>
                        </div>
                    ` : `
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b border-orange-100">
                                        <th class="text-left px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">#</th>
                                        <th class="text-left px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">Fecha</th>
                                        <th class="text-left px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">Cliente</th>
                                        <th class="text-left px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">Descripción</th>
                                        <th class="text-right px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">Total</th>
                                        <th class="text-center px-5 py-3 text-[10px] font-black text-brand-orange uppercase tracking-wider">PDF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${manualInvoices.map((inv, idx) => `
                                        <tr class="inv-row border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}">
                                            <td class="px-5 py-3 text-sm font-mono font-bold text-brand-dark">${inv.invoiceNumber || '-'}</td>
                                            <td class="px-5 py-3 text-sm text-slate-600">${inv.date || '-'}</td>
                                            <td class="px-5 py-3 text-sm font-medium text-slate-700 max-w-[150px] truncate">${inv.customerName || '-'}</td>
                                            <td class="px-5 py-3 text-sm text-slate-500 max-w-[200px] truncate">${inv.itemsSummary || '-'}</td>
                                            <td class="px-5 py-3 text-sm font-bold text-brand-dark text-right">${this.formatCurrency(inv.totalAmount || 0)}</td>
                                            <td class="px-5 py-3 text-center">
                                                <a href="${inv.downloadUrl || '#'}" target="_blank" class="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange hover:bg-brand-orange hover:text-white transition-all flex items-center justify-center mx-auto" title="Descargar PDF">
                                                    <i class="ph-bold ph-file-pdf"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Auto-load manual invoices
        if (!this.state.manualInvoicesLoaded) {
            this.loadManualInvoices();
        }
    },

    async loadManualInvoices() {
        try {
            const token = await auth.currentUser.getIdToken();
            const resp = await fetch(`${BASE_API_URL}/invoices?year=${new Date().getFullYear()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!resp.ok) throw new Error('Error cargando facturas');
            const data = await resp.json();
            this.state.contabilidadInvoices = data.invoices || [];
            this.state.manualInvoicesLoaded = true;
            if (this.state.currentView === 'facturasManual') this.refreshCurrentView();
        } catch (err) {
            console.error('Error loading manual invoices:', err);
        }
    },

    async submitManualInvoice(event) {
        event.preventDefault();
        const form = document.getElementById('manual-invoice-form');
        const btn = document.getElementById('manual-invoice-btn');
        const formData = new FormData(form);

        const data = {
            customerName: formData.get('customerName'),
            customerVAT: formData.get('customerVAT') || undefined,
            customerAddress: formData.get('customerAddress') || undefined,
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            vatAmount: formData.get('vatAmount') ? parseFloat(formData.get('vatAmount')) : undefined,
            date: formData.get('date'),
            paymentMethod: formData.get('paymentMethod'),
        };

        if (!data.customerName || !data.description || !data.amount || !data.date) {
            this.showToast('Completa todos los campos obligatorios', 'error');
            return;
        }

        // Guard anti-doble-facturación: si viene de un ingreso ya facturado, bloquear
        const _prefill = this.state.invoicePrefill;
        if (_prefill && _prefill.extraIncomeId) {
            const _inc = (this.state.extraIncome || []).find(x => x.id === _prefill.extraIncomeId);
            if (_inc && _inc.invoiced) {
                this.showToast('⚠️ Este ingreso ya fue facturado', 'error');
                return;
            }
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Generando...';

        try {
            const token = await auth.currentUser.getIdToken();
            const resp = await fetch(`${BASE_API_URL}/invoices/manual`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!resp.ok) {
                const errData = await resp.json();
                throw new Error(errData.error || 'Error generando factura');
            }

            const result = await resp.json();

            // Flujo desde Ingresos Extra: vincular la factura al ingreso y volver
            const _pf = this.state.invoicePrefill;
            if (_pf && _pf.extraIncomeId) {
                await this.markExtraIncomeInvoiced(_pf.extraIncomeId, result.invoiceNumber);
                this.state.invoicePrefill = null;
                if (result.downloadUrl) window.open(result.downloadUrl, '_blank');
                this.showToast(`✅ Factura ${result.invoiceNumber} generada y vinculada al ingreso`);
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-file-pdf"></i> Generar Factura PDF';
                // Reload manual invoices list y volver a Ingresos Extra con el badge actualizado
                this.state.manualInvoicesLoaded = false;
                this.loadManualInvoices();
                this.navigate('extraIncome');
                return;
            }

            // Show success result
            const resultDiv = document.getElementById('manual-invoice-result');
            document.getElementById('result-invoice-number').textContent = `Factura ${result.invoiceNumber} generada`;
            document.getElementById('result-download-link').href = result.downloadUrl;
            resultDiv.classList.remove('hidden');

            this.showToast(`✅ Factura ${result.invoiceNumber} generada correctamente`);

            // Reset form
            form.reset();
            document.querySelector('[name="date"]').value = new Date().toISOString().split('T')[0];

            // Reload manual invoices list
            this.state.manualInvoicesLoaded = false;
            this.loadManualInvoices();

        } catch (err) {
            console.error('Error generating manual invoice:', err);
            this.showToast('❌ Error: ' + err.message, 'error');
            alert('Error generando factura: ' + err.message);
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-file-pdf"></i> Generar Factura PDF';
    },

    // ── Ingresos Extra (Extra Income) ─────────────────────────────────

    renderExtraIncome(container) {
        const allIncome = this.state.extraIncome || [];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        // Período propio de la vista (no pisa filtros globales)
        const fYear = this.state.incomeFilterYear ?? new Date().getFullYear();
        const fMonths = this.state.incomeFilterMonths ?? [new Date().getMonth()];
        const periodIncome = allIncome.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date + 'T00:00:00');
            return d.getFullYear() === fYear && fMonths.includes(d.getMonth());
        });
        const periodLabel = fMonths.length === 12 ? `Todo ${fYear}` : `${fMonths.map(m => monthNames[m]).join(', ')} ${fYear}`;

        // KPIs del período
        const kpiTotal = periodIncome.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const kpiVat = periodIncome.reduce((s, e) => s + (Number(e.vatAmount) || 0), 0);
        const pendingList = periodIncome.filter(e => !e.invoiced);
        const pendingCount = pendingList.length;
        const pendingAmount = pendingList.reduce((s, e) => s + (Number(e.amount) || 0), 0);

        // Filtros de tabla
        const searchTerm = (this.state.incomeSearch || '').toLowerCase();
        const catFilter = this.state.incomeCategoryFilter || 'all';
        const uninvoicedOnly = !!this.state.incomeUninvoicedOnly;
        const filtered = periodIncome.filter(e => {
            if (uninvoicedOnly && e.invoiced) return false;
            if (catFilter !== 'all' && (e.category || '') !== catFilter) return false;
            if (searchTerm) {
                const hay = `${e.description || ''} ${e.clientName || ''} ${e.category || ''}`.toLowerCase();
                if (!hay.includes(searchTerm)) return false;
            }
            return true;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        const categoryBadge = (cat) => {
            const map = {
                event: { label: 'Evento', cls: 'bg-violet-100 text-violet-700' },
                service: { label: 'Servicio', cls: 'bg-blue-100 text-blue-700' },
                other: { label: 'Otro', cls: 'bg-slate-100 text-slate-600' },
            };
            const c = map[cat] || { label: cat || '—', cls: 'bg-slate-100 text-slate-600' };
            return `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full ${c.cls} whitespace-nowrap">${c.label}</span>`;
        };
        const invoiceBadge = (e) => e.invoiced
            ? `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">Facturado${e.invoiceNumber ? ' #' + esc(e.invoiceNumber) : ''}</span>`
            : `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">Pendiente</span>`;

        const rows = filtered.map(e => `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td class="py-3 px-4 text-sm text-slate-500 whitespace-nowrap">${esc(e.date) || '—'}</td>
                <td class="py-3 px-4 text-sm font-medium text-brand-dark">${esc(e.clientName) || '<span class="text-slate-300">—</span>'}</td>
                <td class="py-3 px-4 text-sm text-slate-600 max-w-[220px] truncate" title="${esc(e.description)}">${esc(e.description) || '—'}</td>
                <td class="py-3 px-4">${categoryBadge(e.category)}</td>
                <td class="py-3 px-4 text-sm font-bold text-brand-dark text-right whitespace-nowrap">${this.formatCurrency(Number(e.amount) || 0)}</td>
                <td class="py-3 px-4 text-sm text-slate-500 text-right whitespace-nowrap">${this.formatCurrency(Number(e.vatAmount) || 0)}</td>
                <td class="py-3 px-4">${invoiceBadge(e)}</td>
                <td class="py-3 px-4">
                    <div class="flex items-center justify-center gap-1">
                        ${e.invoiced
                            ? `<button onclick="app.navigate('facturasManual')" class="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1.5 transition-colors" title="Ver factura ${esc(e.invoiceNumber || '')}">
                                <i class="ph-bold ph-file-text"></i> Ver
                               </button>`
                            : `<button onclick="app.invoiceFromExtraIncome('${e.id}')" class="flex items-center gap-1.5 text-[11px] font-bold text-white bg-brand-dark hover:bg-slate-800 rounded-lg px-2.5 py-1.5 transition-colors" title="Generar factura desde este ingreso">
                                <i class="ph-bold ph-file-plus"></i> Facturar
                               </button>
                               <button onclick="app.openLinkInvoiceModal('${e.id}')" class="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors" title="Vincular una factura ya generada">
                                <i class="ph-bold ph-link"></i> Vincular
                               </button>`}
                        <button onclick="app.deleteExtraIncome('${e.id}')" class="w-8 h-8 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors" title="Eliminar">
                            <i class="ph-bold ph-trash text-base"></i>
                        </button>
                    </div>
                </td>
            </tr>`).join('');

        const showForm = !!this.state.showIncomeForm;

        container.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                ${this.sectionHeader({
                    title: 'Ingresos Extra',
                    subtitle: 'Eventos, servicios y otros conceptos no relacionados con ventas de discos',
                    primary: { label: 'Registrar ingreso', icon: 'ph-plus', onclick: 'app.toggleIncomeForm()' }
                })}

                <!-- Selector de período -->
                <div class="flex flex-wrap items-center gap-3 mb-6">
                    <div class="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                        <select onchange="app.setIncomeFilterYear(this.value)" class="bg-slate-50 text-xs font-bold text-brand-dark px-3 py-2 rounded-xl border-none outline-none cursor-pointer">
                            <option value="2026" ${fYear === 2026 ? 'selected' : ''}>2026</option>
                            <option value="2025" ${fYear === 2025 ? 'selected' : ''}>2025</option>
                        </select>
                        <div class="h-6 w-px bg-slate-100 mx-1"></div>
                        <div class="flex gap-1 overflow-x-auto max-w-[300px] md:max-w-none no-scrollbar bg-slate-100/80 rounded-xl p-1">
                            <button onclick="app.setIncomeFilterMonthsAll()"
                                class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${fMonths.length === 12 ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-brand-dark'}">
                                Todo
                            </button>
                            ${monthNames.map((m, i) => `
                                <button onclick="app.toggleIncomeMonth(${i})"
                                    class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${fMonths.includes(i) ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-brand-dark'}">
                                    ${m}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <p class="text-xs text-slate-400">Período: <span class="font-bold text-brand-dark">${periodLabel}</span></p>
                </div>

                <!-- KPIs del período -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-brand-orange"><i class="ph-bold ph-wallet"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total del período</span>
                        </div>
                        <p class="text-2xl font-display font-bold text-brand-dark">${this.formatCurrency(kpiTotal)}</p>
                        <p class="text-[11px] text-slate-400 mt-1">${periodIncome.length} ingreso${periodIncome.length === 1 ? '' : 's'}</p>
                    </div>
                    <button onclick="app.toggleIncomeUninvoiced()" class="text-left bg-white p-5 rounded-2xl border ${pendingCount > 0 ? 'border-amber-200' : 'border-slate-100'} shadow-sm hover:shadow-md hover:border-amber-300 transition-all">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500"><i class="ph-bold ph-file-text"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendiente de facturar</span>
                        </div>
                        <p class="text-2xl font-display font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}">${pendingCount}</p>
                        <p class="text-[11px] text-slate-400 mt-1">${pendingCount > 0 ? this.formatCurrency(pendingAmount) + ' · clic para filtrar' : 'Todo facturado'}</p>
                    </button>
                    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><i class="ph-bold ph-percent"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IVA del período</span>
                        </div>
                        <p class="text-2xl font-display font-bold text-emerald-600">${this.formatCurrency(kpiVat)}</p>
                        <p class="text-[11px] text-slate-400 mt-1">Del período seleccionado</p>
                    </div>
                </div>

                ${showForm ? `
                <!-- Formulario de alta (colapsable) -->
                <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                    <h2 class="text-lg font-bold text-brand-dark mb-4">Registrar Nuevo Ingreso</h2>
                    <form onsubmit="app.addExtraIncome(event)" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Descripción *</label>
                            <input type="text" name="description" required placeholder="DJ Event - Venue X"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all text-sm">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Cliente / Organizador</label>
                            <input type="text" name="clientName" placeholder="Ej: Jolene Bar"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all text-sm">
                            <p class="text-[10px] text-slate-400 mt-1">Se usa para pre-cargar la factura.</p>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Categoría *</label>
                            <select name="category" required
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all text-sm">
                                <option value="event">Evento</option>
                                <option value="service">Servicio</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Monto Total (DKK) *</label>
                            <div class="relative">
                                <input type="number" name="amount" required step="0.01" min="0" placeholder="3750"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-16 outline-none focus:border-brand-orange focus:bg-white transition-all font-bold text-lg text-brand-dark">
                                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">DKK</span>
                            </div>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Monto VAT (DKK)</label>
                            <div class="relative">
                                <input type="number" name="vatAmount" step="0.01" min="0" placeholder="750"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-16 outline-none focus:border-brand-orange focus:bg-white transition-all text-sm">
                                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">DKK</span>
                            </div>
                            <p class="text-[10px] text-slate-400 mt-1">Opcional. Cantidad de IVA incluida en el total.</p>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Fecha *</label>
                            <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all text-sm">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Método de Pago</label>
                            <select name="paymentMethod"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all text-sm">
                                <option value="Transfer">Transferencia</option>
                                <option value="MobilePay">MobilePay</option>
                                <option value="Cash">Efectivo</option>
                                <option value="Card">Tarjeta</option>
                            </select>
                        </div>
                        <div class="md:col-span-2 lg:col-span-3 flex justify-end gap-2">
                            <button type="button" onclick="app.toggleIncomeForm()"
                                class="px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors text-sm">Cancelar</button>
                            <button type="submit"
                                class="bg-brand-dark text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 transition-colors text-sm flex items-center gap-2">
                                <i class="ph-bold ph-plus-circle"></i> Registrar Ingreso
                            </button>
                        </div>
                    </form>
                </div>
                ` : ''}

                <!-- Filtros: mismo patrón de pills que Inventario/Ventas -->
                <div class="flex flex-wrap items-center gap-2 mb-4">
                    <div class="relative flex-1 min-w-[220px]">
                        <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" id="income-search-input"
                            value="${esc(this.state.incomeSearch)}"
                            oninput="app.setIncomeSearch(this.value)"
                            placeholder="Buscar por descripción o cliente..."
                            class="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-full focus:outline-none focus:border-brand-orange shadow-sm text-sm">
                    </div>
                    <div class="filter-chip ${catFilter !== 'all' ? 'active' : ''}" title="Filtrar por categoría">
                        <i class="ph-bold ph-tag text-xs"></i>
                        <select onchange="app.setIncomeCategoryFilter(this.value)">
                            <option value="all">Todas las categorías</option>
                            <option value="event" ${catFilter === 'event' ? 'selected' : ''}>Evento</option>
                            <option value="service" ${catFilter === 'service' ? 'selected' : ''}>Servicio</option>
                            <option value="other" ${catFilter === 'other' ? 'selected' : ''}>Otro</option>
                        </select>
                    </div>
                    <button onclick="app.toggleIncomeUninvoiced()" class="quick-pill ${uninvoicedOnly ? 'active' : ''}" title="Mostrar solo ingresos sin facturar">
                        <i class="ph-bold ph-file-text text-xs"></i> Sin facturar
                        ${pendingCount > 0 ? `<span class="w-5 h-5 rounded-full ${uninvoicedOnly ? 'bg-white/30' : 'bg-amber-100 text-amber-700'} flex items-center justify-center text-[10px] font-bold">${pendingCount}</span>` : ''}
                    </button>
                </div>

                <!-- Tabla -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    ${filtered.length === 0 ? `
                        <div class="p-12 text-center">
                            <i class="ph-duotone ph-coins text-5xl text-slate-200 mb-3 block"></i>
                            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Sin ingresos registrados</p>
                            <p class="text-sm text-slate-400 mt-1">Usá "Registrar ingreso" para agregar uno.</p>
                        </div>
                    ` : `
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-100">
                                        <th class="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                                        <th class="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                                        <th class="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descripción</th>
                                        <th class="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoría</th>
                                        <th class="text-right py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monto</th>
                                        <th class="text-right py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">VAT</th>
                                        <th class="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facturación</th>
                                        <th class="text-center py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    async addExtraIncome(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const data = {
            description: formData.get('description'),
            clientName: (formData.get('clientName') || '').trim(),
            category: formData.get('category'),
            amount: parseFloat(formData.get('amount')),
            vatAmount: formData.get('vatAmount') ? parseFloat(formData.get('vatAmount')) : 0,
            date: formData.get('date'),
            paymentMethod: formData.get('paymentMethod') || 'Transfer',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('extra_income').add(data);
            this.showToast('✅ Ingreso extra registrado correctamente');
            this.state.showIncomeForm = false;
            // Reload and re-render
            const snap = await db.collection('extra_income').get();
            this.state.extraIncome = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.date) - new Date(a.date));
            this.renderExtraIncome(document.getElementById('app-content'));
        } catch (err) {
            console.error('Error adding extra income:', err);
            this.showToast('❌ Error: ' + err.message, 'error');
        }
    },

    async deleteExtraIncome(id) {
        if (!confirm('¿Eliminar este ingreso extra?')) return;
        try {
            await db.collection('extra_income').doc(id).delete();
            this.state.extraIncome = this.state.extraIncome.filter(e => e.id !== id);
            this.showToast('🗑️ Ingreso eliminado');
            this.renderExtraIncome(document.getElementById('app-content'));
        } catch (err) {
            console.error('Error deleting extra income:', err);
            this.showToast('❌ Error: ' + err.message, 'error');
        }
    },

    navigate(view) {
        // Legacy: las vistas separadas de ventas ahora redirigen a la bandeja unificada
        if (view === 'onlineSales' || view === 'discogsSales') view = 'sales';
        this.state.currentView = view;

        // Blueprint Sec 04: los drill-downs del dashboard no quedan pegados al navegar a otra pantalla
        if (view !== 'expenses') this.state.expenseMissingReceiptOnly = false;

        // El prefill de factura desde ingreso extra solo vive en Generar Factura
        if (view !== 'facturasManual') this.state.invoicePrefill = null;
        // El filtro "solo sin facturar" no queda pegado al navegar a otra pantalla
        if (view !== 'extraIncome') this.state.incomeUninvoicedOnly = false;

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
        this.updateNavBadges();
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
                                </a>
                                <button onclick="app.changeCalendarMonth(1)" class="w-10 h-10 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-brand-orange transition-colors flex items-center justify-center">
                                    <i class="ph-bold ph-caret-right"></i>
                                </a>
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
                                    </a>
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
        // Sin placeholders inventados: '' si no hay dato (el render decide qué mostrar)
        const email = (sale.customerEmail || customer.email || '').trim();
        const phone = (customer.phone || sale.customerPhone || sale.phone || '').trim();

        // Dirección: WebShop trae customer.shipping {line1,line2,city,postal_code,country};
        // Discogs/otros usan sale.address o customer.address (string libre)
        let address = '';
        let hasAddress = false;
        if (customer.shipping && (customer.shipping.line1 || customer.shipping.city || customer.shipping.postal_code)) {
            const s = customer.shipping;
            const street = [s.line1, s.line2].filter(Boolean).join(' ');
            const cityLine = [s.postal_code || s.zip, s.city].filter(Boolean).join(' ');
            address = [street, cityLine, s.country].filter(Boolean).join(', ');
            hasAddress = true;
        } else {
            const raw = (sale.address || customer.address || '').trim();
            if (raw && raw !== '-') { address = raw; hasAddress = true; }
        }

        return { name, email, phone, address, hasAddress };
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
                </a>
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
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p class="text-xs text-slate-400">No hay eventos registrados</p>
                            <button onclick="app.openAddEventModal('${dateStr}')" class="text-xs text-brand-orange font-bold mt-2 hover:underline">Agregar nota</a>
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
                        </a>
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
                        </a>
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
                ${this.sectionHeader({
                    title: 'Respaldo',
                    subtitle: 'Copias de seguridad y restauración de datos'
                })}
                
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
                        </a>
                        
                        <div class="flex-1 relative">
                            <input type="file" id="import-file" accept=".json" class="hidden" onchange="app.importData(this)">
                            <button onclick="document.getElementById('import-file').click()" class="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                <i class="ph-fill ph-upload-simple text-xl"></i>
                                Importar Backup
                            </a>
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
                        </a>
                        <button type="button" onclick="app.resetApplication()" class="w-full bg-white border-2 border-red-200 text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                            <i class="ph-fill ph-trash text-xl"></i>
                            Restablecer de Fábrica
                        </a>
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
                ${this.sectionHeader({
                    title: 'Configuración',
                    subtitle: 'Preferencias y conexiones del panel'
                })}
                
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
                        </a>
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
                    </a>
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
                            </a>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <div>
                                <p class="font-bold text-blue-900">Migrar Datos de Ventas</p>
                                <p class="text-xs text-blue-700">Agrega costo y condición a ventas sin estos datos</p>
                            </div>
                            <button onclick="app.migrateSalesData()" class="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm">
                                <i class="ph-bold ph-receipt mr-1"></i> Migrar
                            </a>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                            <div>
                                <p class="font-bold text-purple-900">Normalizar SKUs</p>
                                <p class="text-xs text-purple-700">Asigna formato SKU-001 a todos los productos que no lo tengan</p>
                            </div>
                            <button onclick="app.normalizeAllSkus()" class="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-purple-700 transition-colors text-sm">
                                <i class="ph-bold ph-barcode mr-1"></i> Normalizar
                            </a>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                            <div>
                                <p class="font-bold text-indigo-900">Backfill QuickIDs</p>
                                <p class="text-xs text-indigo-700">Asigna quickId secuencial (0001, 0002...) a productos sin él</p>
                            </div>
                            <button onclick="app.backfillQuickIds()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm">
                                <i class="ph-bold ph-hash mr-1"></i> Backfill
                            </a>
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

    async normalizeAllSkus() {
        const skuPattern = /^SKU\s*-\s*(\d+)$/;
        const productsToFix = this.state.inventory.filter(p => !skuPattern.test(p.sku));
        const validSkus = this.state.inventory
            .map(p => { const m = p.sku.match(skuPattern); return m ? parseInt(m[1]) : 0; });
        let maxSku = Math.max(0, ...validSkus);

        if (productsToFix.length === 0) {
            this.showToast('✅ Todos los SKUs ya tienen formato SKU-xxx');
            return;
        }

        if (!confirm(`Se encontraron ${productsToFix.length} productos con SKU irregular.\n\nSe les asignará un nuevo SKU desde SKU-${String(maxSku + 1).padStart(3, '0')} en adelante.\n\n¿Continuar?`)) return;

        this.showToast('⏳ Normalizando SKUs...', 'info');
        try {
            // Process in batches of 500
            for (let i = 0; i < productsToFix.length; i += 500) {
                const batch = db.batch();
                const chunk = productsToFix.slice(i, i + 500);

                for (const product of chunk) {
                    maxSku++;
                    const newSku = `SKU-${String(maxSku).padStart(3, '0')}`;
                    const docRef = await this.findProductBySku(product.sku);
                    if (docRef) {
                        batch.update(docRef.ref, { sku: newSku, old_sku: product.sku });
                        console.log(`  → ${product.sku} → ${newSku} (${product.artist} - ${product.album})`);
                    }
                }
                await batch.commit();
            }

            this.showToast(`✅ ${productsToFix.length} SKUs normalizados`);
            await this.loadData();
        } catch (error) {
            console.error('SKU normalization error:', error);
            this.showToast('❌ Error: ' + error.message, 'error');
        }
    },

    async backfillQuickIds() {
        const productsWithout = this.state.inventory.filter(p => !p.quickId);

        if (productsWithout.length === 0) {
            this.showToast('✅ Todos los productos ya tienen quickId');
            return;
        }

        // Sort by created_at (oldest first)
        productsWithout.sort((a, b) => {
            const dateA = a.created_at ? (a.created_at.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime()) : 0;
            const dateB = b.created_at ? (b.created_at.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime()) : 0;
            return dateA - dateB;
        });

        if (!confirm(`Se encontraron ${productsWithout.length} productos sin quickId.\n\nSe les asignará un ID secuencial (0001, 0002...).\n\n¿Continuar?`)) return;

        this.showToast('⏳ Asignando QuickIDs...', 'info');
        try {
            // Get current counter
            const counterRef = db.collection('metadata').doc('vinylCounter');
            const counterDoc = await counterRef.get();
            let currentCount = counterDoc.exists ? (counterDoc.data().current || 0) : 0;

            for (let i = 0; i < productsWithout.length; i += 500) {
                const batch = db.batch();
                const chunk = productsWithout.slice(i, i + 500);

                for (const product of chunk) {
                    currentCount++;
                    const quickId = String(currentCount).padStart(4, '0');
                    const docRef = await this.findProductBySku(product.sku);
                    if (docRef) {
                        batch.update(docRef.ref, { quickId });
                        console.log(`  → ${quickId}: ${product.artist} - ${product.album}`);
                    }
                }
                await batch.commit();
            }

            // Update counter
            await counterRef.set({ current: currentCount }, { merge: true });

            this.showToast(`✅ ${productsWithout.length} QuickIDs asignados (hasta ${String(currentCount).padStart(4, '0')})`);
            await this.loadData();
        } catch (error) {
            console.error('QuickID backfill error:', error);
            this.showToast('❌ Error: ' + error.message, 'error');
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
                    'Label Disquería': item.storageLocation || '',
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
                { wch: 15 },  // Label Disquería
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
                            </a>
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
    formatCurrency(amount, isPrivate = true) {
        const formatted = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(amount);
        return isPrivate ? `<span class="blur-money">${formatted}</span>` : `<span>${formatted}</span>`;
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
        document.getElementById('toast-message').innerHTML = message;
        toast.classList.remove('opacity-0', '-translate-y-20', 'md:translate-y-20');
        setTimeout(() => {
            toast.classList.add('opacity-0', '-translate-y-20', 'md:translate-y-20');
        }, 3000);
    },

    setupNavigation() {
        // Navigation is handled via inline onclick events in HTML
        // This function is kept for compatibility with init()
        this.restoreNavGroups();
        this.updateNavBadges();
    },

    setupMobileMenu() {
        // Mobile menu setup
    },

    togglePrivacyMode() {
        this.state.privacyMode = !this.state.privacyMode;

        // Toggle CSS class on body
        if (this.state.privacyMode) {
            document.body.classList.add('privacy-active');
        } else {
            document.body.classList.remove('privacy-active');
        }

        // Update icons
        const iconClass = this.state.privacyMode ? 'ph-bold ph-eye-slash' : 'ph-bold ph-eye';
        const desktopIcon = document.querySelector('#privacy-toggle-desktop i');
        const mobileIcon = document.querySelector('#privacy-toggle-mobile i');

        if (desktopIcon) desktopIcon.className = iconClass;
        if (mobileIcon) mobileIcon.className = iconClass;

        // Visual feedback
        this.showToast(this.state.privacyMode ? '🔒 Modo Privacidad Activado' : '👁️ Modo Privacidad Desactivado');
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

    // --- Blueprint Sec 01/03: Grupos de navegación colapsables ---
    toggleNavGroup(key) {
        const body = document.getElementById(`nav-group-${key}`);
        const caret = document.getElementById(`nav-caret-${key}`);
        if (!body) return;
        const collapsed = body.classList.toggle('hidden');
        if (caret) caret.style.transform = collapsed ? 'rotate(-90deg)' : '';
        try {
            const saved = JSON.parse(localStorage.getItem('ec_nav_groups') || '{}');
            saved[key] = collapsed;
            localStorage.setItem('ec_nav_groups', JSON.stringify(saved));
        } catch (e) { /* noop */ }
    },

    // Blueprint Sec 06: colapsar/expandir opciones avanzadas del formulario de disco
    toggleVinylAdvanced() {
        const panel = document.getElementById('vinyl-advanced-options');
        const caret = document.getElementById('vinyl-advanced-caret');
        if (!panel) return;
        const hidden = panel.classList.toggle('hidden');
        if (caret) {
            caret.classList.toggle('ph-caret-down', hidden);
            caret.classList.toggle('ph-caret-up', !hidden);
        }
    },

    restoreNavGroups() {
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem('ec_nav_groups') || '{}'); } catch (e) { /* noop */ }
        ['operacion', 'catalogo', 'finanzas', 'administracion'].forEach(key => {
            if (saved[key]) {
                const body = document.getElementById(`nav-group-${key}`);
                const caret = document.getElementById(`nav-caret-${key}`);
                if (body) body.classList.add('hidden');
                if (caret) caret.style.transform = 'rotate(-90deg)';
            }
        });
    },

    // Badges solo para pendientes reales (Blueprint Sec 03)
    updateNavBadges() {
        const setBadge = (id, count) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (count > 0) {
                el.textContent = count > 99 ? '99+' : count;
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        };
        // Compras sin comprobante
        const missingReceipt = (this.state.expenses || []).filter(e => !e.receiptUrl && !e.comprobante && e.receiptPending !== false && !e.receiptExempt).length;
        setBadge('nav-badge-expenses', missingReceipt);
        // Envíos pendientes: solo WebShop/Discogs con fulfillment no cerrado (el local nunca envía)
        const doneFs = ['shipped', 'picked_up', 'delivered', 'fulfilled', 'canceled'];
        const pendingShip = (this.state.sales || []).filter(s => {
            if (!this.isShippableChannel(s)) return false;
            return !doneFs.includes((s.fulfillment_status || '').toLowerCase());
        }).length;
        setBadge('nav-badge-shipping', pendingShip);
    },

    // --- Blueprint Sec 01: Encabezado contextual con una acción primaria ---
    sectionHeader({ title, subtitle = '', primary = null, filters = '' }) {
        const primaryBtn = primary ? `
            <button onclick="${primary.onclick}" class="${primary.class || 'bg-brand-dark text-white px-4 h-10 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-dark/20 hover:scale-105 transition-transform'}">
                <i class="ph-bold ${primary.icon || 'ph-plus'} text-lg"></i>
                <span class="text-xs font-bold hidden sm:inline">${primary.label}</span>
            </button>` : '';
        return `
            <div class="flex flex-wrap justify-between items-center gap-3 mb-5">
                <div>
                    <h2 class="font-display text-2xl font-bold text-brand-dark">${title}</h2>
                    ${subtitle ? `<p class="text-xs text-slate-400 mt-1">${subtitle}</p>` : ''}
                </div>
                <div class="flex gap-2 items-center">
                    ${filters}
                    ${primaryBtn}
                </div>
            </div>`;
    },

    // --- LOGIC ---



    // --- VIEWS ---

    showFinancialReportModal() {
        const modalId = 'financialReportModal';
        if (document.getElementById(modalId)) {
            document.getElementById(modalId).remove();
        }

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];

        const html = `
            <div id="${modalId}" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
                    <button onclick="document.getElementById('${modalId}').remove()" class="absolute top-4 right-4 text-slate-400 hover:text-brand-dark transition-colors">
                        <i class="ph-bold ph-x text-xl"></i>
                    </button>
                    <div class="p-8">
                        <div class="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                            <i class="ph-fill ph-microsoft-excel-logo text-2xl"></i>
                        </div>
                        <h3 class="font-display text-2xl font-bold text-brand-dark mb-2">Exportar Informe</h3>
                        <p class="text-sm text-slate-500 mb-6">Selecciona el rango de fechas para el reporte financiero en Excel.</p>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fecha Desde</label>
                                <input type="date" id="reportStartDate" value="${firstDayOfMonth}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fecha Hasta</label>
                                <input type="date" id="reportEndDate" value="${today}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all">
                            </div>
                        </div>

                        <div class="mt-8 flex gap-3">
                            <button onclick="document.getElementById('${modalId}').remove()" class="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">
                                Cancelar
                            </button>
                            <button id="btnDownloadReport" onclick="app.downloadFinancialReport()" class="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all flex justify-center items-center gap-2">
                                <i class="ph-bold ph-download-simple"></i> Descargar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    async downloadFinancialReport() {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const btn = document.getElementById('btnDownloadReport');

        if (!startDate || !endDate) {
            app.showToast('Por favor, selecciona ambas fechas', 'error');
            return;
        }

        if (startDate > endDate) {
            app.showToast('La fecha "Desde" no puede ser mayor a "Hasta"', 'error');
            return;
        }

        const originalBtnContent = btn.innerHTML;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Procesando...';
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-not-allowed');

        try {
            const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
            const url = `${BASE_API_URL}/api/reports/financial?startDate=${startDate}&endDate=${endDate}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error al generar el reporte: ${response.statusText}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Reporte_Financiero_${startDate}_al_${endDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
            
            document.getElementById('financialReportModal').remove();
            app.showToast('Reporte descargado con éxito');
        } catch (error) {
            console.error('Error downloading report:', error);
            app.showToast(error.message, 'error');
        } finally {
            if (document.getElementById('btnDownloadReport')) {
                btn.innerHTML = originalBtnContent;
                btn.disabled = false;
                btn.classList.remove('opacity-70', 'cursor-not-allowed');
            }
        }
    },

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
                .reduce((sum, s) => sum + (Number(s.originalTotal || s.total_amount || s.total) || 0), 0)
                + (this.state.extraIncome || []).filter(e => { const d = new Date(e.date); return d.getMonth() === curM && d.getFullYear() === curY; })
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            const prevMonthSalesTotal = this.state.sales
                .filter(s => { const d = new Date(s.date); return d.getMonth() === prevM && d.getFullYear() === prevY; })
                .reduce((sum, s) => sum + (Number(s.originalTotal || s.total_amount || s.total) || 0), 0)
                + (this.state.extraIncome || []).filter(e => { const d = new Date(e.date); return d.getMonth() === prevM && d.getFullYear() === prevY; })
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

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
                        let origin = item.providerOrigin || item.provider_origin;
                        const totalPrice = price * qty;

                        // If cost is 0 or origin is missing, try to find it from the inventory (MATCH VAT REPORT LOGIC)
                        if (itemCost === 0 || !origin) {
                            const productId = item.productId || item.recordId;
                            const albumName = item.album;
                            const inventoryProduct = this.state.inventory.find(p =>
                                (productId && (p.id === productId || p.sku === productId)) ||
                                (albumName && p.album === albumName)
                            );
                            if (inventoryProduct) {
                                if (itemCost === 0) itemCost = inventoryProduct.cost || 0;
                                if (!origin) origin = inventoryProduct.provider_origin;
                            }
                        }
                        if (!origin) origin = 'Local_Used'; // Default to Margin Scheme

                        // Calculate VAT based on MOMS TILSVAR logic
                        if (origin === 'EU_B2B' || origin === 'DK_B2B') {
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

            // ── Add Extra Income to totals ──
            const filteredExtraIncome = (this.state.extraIncome || []).filter(e => {
                const eDate = new Date(e.date);
                return eDate.getFullYear() === currentYear && selectedMonths.includes(eDate.getMonth());
            });
            let extraIncomeTotal = 0;
            filteredExtraIncome.forEach(e => {
                const amt = Number(e.amount) || 0;
                const vat = Number(e.vatAmount) || 0;
                extraIncomeTotal += amt;
                totalRevenue += amt;
                totalNetProfit += amt;
                totalStandardVat += vat;
            });

            // Calculate deductible input VAT using EXACT SAME filter as renderVATReport
            const deductibleExpenses = this.state.expenses.filter(e => {
                const expDate = e.fecha_factura ? new Date(e.fecha_factura) : (e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp || e.date));
                const isDeductible = e.categoria_tipo === 'operativo' || e.categoria_tipo === 'stock_nuevo' || e.is_vat_deductible;
                return isDeductible && expDate.getFullYear() === currentYear && selectedMonths.includes(expDate.getMonth());
            });

            const totalInputVat = deductibleExpenses.reduce((sum, e) => sum + (parseFloat(e.monto_iva) || 0), 0);

            // Micro-IVA: EU B2B Reverse Charge (both sides, net 0) + DK B2B (pure deduction)
            const dashboardPhantomVat = (this.state.inventory || [])
                .filter(p => {
                    if (!p.item_phantom_vat || p.item_phantom_vat <= 0 || p.provider_origin !== 'EU_B2B') return false;
                    const acqDate = p.acquisition_date ? new Date(p.acquisition_date) : null;
                    if (!acqDate) return false;
                    return acqDate.getFullYear() === currentYear && selectedMonths.includes(acqDate.getMonth());
                })
                .reduce((sum, p) => sum + (p.item_phantom_vat || 0), 0);

            const dashboardDkB2bVat = (this.state.inventory || [])
                .filter(p => {
                    if (!p.item_real_vat || p.item_real_vat <= 0 || p.provider_origin !== 'DK_B2B') return false;
                    const acqDate = p.acquisition_date ? new Date(p.acquisition_date) : null;
                    if (!acqDate) return false;
                    return acqDate.getFullYear() === currentYear && selectedMonths.includes(acqDate.getMonth());
                })
                .reduce((sum, p) => sum + (p.item_real_vat || 0), 0);

            // Reverse Charge: phantomVat on both sides cancels out. DK B2B is pure deduction.
            const totalLiability = (totalStandardVat + totalMarginVat + totalShippingVat) + dashboardPhantomVat;
            const totalDeductions = totalInputVat + dashboardPhantomVat + dashboardDkB2bVat;
            const momsTilsvar = totalLiability - totalDeductions;

            const taxAmount = momsTilsvar;

            // --- NEW: Card 2 - Operating Expenses for Profit Calculation ---
            const periodExpenses = this.state.expenses
                .filter(e => {
                    const d = new Date(e.date || e.fecha_factura);
                    return d.getFullYear() === currentYear && selectedMonths.includes(d.getMonth());
                })
                .reduce((sum, e) => sum + (Number(e.monto_total || e.amount) || 0), 0);

            // NET PROFIT: IVA is tax-neutral per SKAT (Denmark) — NOT an operating expense.
            // Formula: Gross Profit (sales margin - platform fees) + Extra Income - Operating Expenses
            const netProfitActual = totalNetProfit - periodExpenses;
            const cuartitoShare = totalNetProfit; // Legacy reference (IVA excluded per SKAT rules)

            // 3. Stock Metrics
            const totalStockValueSale = this.state.inventory.reduce((sum, i) => sum + (i.price * i.stock), 0);
            const totalItems = this.state.inventory.reduce((sum, i) => sum + i.stock, 0);

            // 4. Operational Alerts
            // El local nunca cuenta como pendiente de envío (ni POS web ni app mobile)
            const pendingOrders = this.state.sales.filter(s =>
                this.isShippableChannel(s) && (
                    s.fulfillment_status === 'preparing' ||
                    s.status === 'paid' ||
                    (s.channel?.toLowerCase() === 'discogs' && s.status !== 'shipped' && s.fulfillment_status !== 'shipped')
                )
            );

            // --- NEW: IVA Estimado (Real-time for selected period) ---
            const estimatedVAT = taxAmount;

            // --- Blueprint Sec 04: métricas comparables ---
            const stockValueCost = this.state.inventory.reduce((sum, i) => sum + ((parseFloat(i.cost) || 0) * (Number(i.stock) || 0)), 0);
            const missingReceiptCount = (this.state.expenses || []).filter(e => !e.receiptUrl && !e.comprobante).length;
            const seenExpenseKeys = new Set();
            let possibleDuplicates = 0;
            (this.state.expenses || []).forEach(e => {
                const key = `${e.date || e.fecha_factura || ''}|${(e.description || e.proveedor || '').toLowerCase().trim()}|${Number(e.monto_total || e.amount || 0).toFixed(2)}`;
                if (seenExpenseKeys.has(key)) possibleDuplicates++;
                else seenExpenseKeys.add(key);
            });

            const periodText = selectedMonths.length === 12
                ? `Año ${currentYear} `
                : `${selectedMonths.map(m => this.getMonthName(m)).join(', ')} ${currentYear} `;

            // --- Sales Analysis Data Processing (Genre / Storage) ---
            const analysisMode = this.state.dashboardAnalysisMode || 'genre';
            const categoryUnits = {};
            const categoryRevenue = {};
            let totalUnitsSold = 0;
            let newUnits = 0;
            let usedUnits = 0;

            filteredSales.forEach(sale => {
                const items = sale.items || [];

                // Resolve category per item from inventory
                const resolveFromInventory = (productId, albumName) => {
                    const invProduct = this.state.inventory.find(p =>
                        (productId && (p.id === productId || p.sku === productId)) ||
                        (albumName && p.album === albumName)
                    );
                    if (!invProduct) return null;
                    if (analysisMode === 'storage') return invProduct.storageLocation || null;
                    const rawGenres = [
                        invProduct.genre, invProduct.genre2, invProduct.genre3,
                        invProduct.genre4, invProduct.genre5
                    ].filter(Boolean);
                    
                    const itemGenres = [];
                    rawGenres.forEach(rg => {
                        itemGenres.push(...rg.split(',').map(s => s.trim()).filter(Boolean));
                    });

                    // Clean and unique
                    const uniqueGenres = [...new Set(itemGenres)];

                    // Electronic omission rule
                    const nonElectronic = uniqueGenres.filter(g => g.toLowerCase() !== 'electronic');
                    const effectiveGenres = nonElectronic.length > 0 ? nonElectronic : (uniqueGenres.length > 0 ? uniqueGenres : ['Otros']);

                    return effectiveGenres[0] || null;
                };

                if (items.length > 0) {
                    items.forEach(item => {
                        const productId = item.productId || item.recordId;
                        const itemCategory = resolveFromInventory(productId, item.album) ||
                            (analysisMode === 'storage' ? 'Sin ubicación' : (sale.genre || 'Otros'));
                        const qty = Number(item.qty || item.quantity) || 1;
                        const price = Number(item.priceAtSale || item.unitPrice || item.price) || 0;
                        categoryUnits[itemCategory] = (categoryUnits[itemCategory] || 0) + qty;
                        categoryRevenue[itemCategory] = (categoryRevenue[itemCategory] || 0) + (price * qty);
                        totalUnitsSold += qty;
                        const cond = item.productCondition || item.condition || 'Used';
                        if (cond === 'New') newUnits += qty; else usedUnits += qty;
                    });
                } else {
                    const qty = Number(sale.quantity) || 1;
                    const gross = Number(sale.originalTotal || sale.total_amount || sale.total) || 0;
                    const saleCategory = analysisMode === 'storage' ? 'Sin ubicación' : (sale.genre || 'Otros');
                    categoryUnits[saleCategory] = (categoryUnits[saleCategory] || 0) + qty;
                    categoryRevenue[saleCategory] = (categoryRevenue[saleCategory] || 0) + gross;
                    totalUnitsSold += qty;
                    usedUnits += qty;
                }
            });

            const sortedCategories = Object.entries(categoryUnits).sort((a, b) => b[1] - a[1]);
            const sortedCategoriesByRevenue = Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1]);
            const topRevenueCategory = sortedCategoriesByRevenue.length > 0
                ? { name: sortedCategoriesByRevenue[0][0], revenue: sortedCategoriesByRevenue[0][1] }
                : { name: 'N/A', revenue: 0 };
            const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
            const newPercent = totalUnitsSold > 0 ? Math.round((newUnits / totalUnitsSold) * 100) : 0;
            const usedPercent = totalUnitsSold > 0 ? Math.round((usedUnits / totalUnitsSold) * 100) : 0;
            const genreColorPalette = ['#FF6B4A', '#F59E0B', '#14B8A6', '#8B5CF6', '#F43F5E', '#0EA5E9', '#84CC16', '#D946EF', '#64748B'];
            const analysisTitle = analysisMode === 'storage' ? 'Análisis por Ubicación' : 'Análisis por Género Musical';
            const analysisIcon = analysisMode === 'storage' ? 'ph-map-pin' : 'ph-music-notes-simple';
            const topLabel = analysisMode === 'storage' ? 'Ubicación Más Rentable' : 'Género Más Rentable';

            const html = `
            <div class="max-w-7xl mx-auto space-y-8 pb-24 md:pb-8 px-4 md:px-8 pt-6">
                <!-- Header with Navigation and Filter -->
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h2 class="font-display text-3xl font-bold text-brand-dark">Resumen Operativo</h2>
                        <p class="text-slate-500 text-sm">Actividad: <span class="font-bold text-brand-dark">${periodText}</span></p>
                    </div>

                    <div class="flex flex-wrap items-center gap-3">
                        <div class="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                            <select id="dashboard-year" onchange="app.updateFilter('year', this.value)" class="bg-slate-50 text-xs font-bold text-brand-dark px-3 py-2 rounded-xl border-none outline-none cursor-pointer">
                                <option value="2026" ${this.state.filterYear === 2026 ? 'selected' : ''}>2026</option>
                                <option value="2025" ${this.state.filterYear === 2025 ? 'selected' : ''}>2025</option>
                            </select>
                            <div class="h-6 w-px bg-slate-100 mx-1"></div>
                            <div class="flex gap-1 overflow-x-auto max-w-[300px] md:max-w-none no-scrollbar bg-slate-100/80 rounded-xl p-1">
                                <button onclick="app.state.filterMonths=[0,1,2,3,4,5,6,7,8,9,10,11];app.refreshCurrentView()"
                                    class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${selectedMonths.length === 12 ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-brand-dark'}">
                                    Todo
                                </button>
                                ${monthNames.map((m, i) => `
                                    <button onclick="app.toggleMonthFilter(${i})"
                                        class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${selectedMonths.includes(i) ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-brand-dark'}">
                                        ${m}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <button onclick="app.showFinancialReportModal()" class="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:border-brand-orange hover:text-brand-orange px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm">
                            <i class="ph-bold ph-download-simple text-lg"></i> Exportar
                        </button>
                    </div>
                </div>

                <!-- Blueprint Sec 04: 5 indicadores comparables (clicables = drill-down) -->
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <button onclick="app.navigate('sales')" class="text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange transition-all group">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-brand-orange"><i class="ph-bold ph-chart-line-up"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ventas período</span>
                        </div>
                        <p class="text-2xl font-display font-bold text-brand-dark">${this.formatCurrency(totalRevenue)}</p>
                        <p class="text-[11px] font-bold mt-1 ${growth >= 0 ? 'text-emerald-600' : 'text-red-500'}">${growthText}</p>
                    </button>
                    <button onclick="app.navigate('contabilidad')" class="text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange transition-all group">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500"><i class="ph-bold ph-hand-coins"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margen</span>
                        </div>
                        <p class="text-2xl font-display font-bold ${netProfitActual >= 0 ? 'text-emerald-600' : 'text-red-500'}">${this.formatCurrency(netProfitActual)}</p>
                        <p class="text-[11px] text-slate-400 mt-1">Bruto + extras − operativos</p>
                    </button>
                    <button onclick="app.navigate('inventory')" class="text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange transition-all group">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500"><i class="ph-bold ph-disc"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock a costo</span>
                        </div>
                        <p class="text-2xl font-display font-bold text-brand-dark">${this.formatCurrency(stockValueCost)}</p>
                        <p class="text-[11px] text-slate-400 mt-1">${totalItems} unidades</p>
                    </button>
                    <button onclick="app.navigate('sales')" class="text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange transition-all group">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500"><i class="ph-bold ph-receipt"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ticket promedio</span>
                        </div>
                        <p class="text-2xl font-display font-bold text-brand-dark">${this.formatCurrency(avgTicket)}</p>
                        <p class="text-[11px] text-slate-400 mt-1">${filteredSales.length} ventas</p>
                    </button>
                    <button onclick="app.navigate('vatReport')" class="text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange transition-all group">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500"><i class="ph-bold ph-bank"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">VAT estimado</span>
                        </div>
                        <p class="text-2xl font-display font-bold ${estimatedVAT >= 0 ? 'text-amber-600' : 'text-emerald-600'}">${this.formatCurrency(estimatedVAT)}</p>
                        <p class="text-[11px] text-slate-400 mt-1">Período seleccionado</p>
                    </button>
                </div>

                <!-- Blueprint Sec 04: Colas de trabajo accionables -->
                <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 class="font-bold text-sm text-brand-dark flex items-center gap-2 mb-4">
                        <i class="ph-bold ph-warning-circle text-brand-orange"></i> Requiere atención
                    </h3>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <button onclick="app.state.expenseMissingReceiptOnly = true; app.navigate('expenses')" class="flex items-center gap-3 p-4 bg-slate-50 hover:bg-orange-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-all text-left">
                            <span class="text-2xl font-display font-bold ${missingReceiptCount > 0 ? 'text-red-500' : 'text-emerald-500'}">${missingReceiptCount}</span>
                            <span class="text-xs font-bold text-slate-600 leading-tight">Gastos sin<br>comprobante</span>
                        </button>
                        <button onclick="app.navigate('expenses')" class="flex items-center gap-3 p-4 bg-slate-50 hover:bg-orange-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-all text-left">
                            <span class="text-2xl font-display font-bold ${possibleDuplicates > 0 ? 'text-amber-500' : 'text-emerald-500'}">${possibleDuplicates}</span>
                            <span class="text-xs font-bold text-slate-600 leading-tight">Posibles<br>duplicados</span>
                        </button>
                        <button onclick="app.navigate('shipping')" class="flex items-center gap-3 p-4 bg-slate-50 hover:bg-orange-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-all text-left">
                            <span class="text-2xl font-display font-bold ${pendingOrders.length > 0 ? 'text-red-500' : 'text-emerald-500'}">${pendingOrders.length}</span>
                            <span class="text-xs font-bold text-slate-600 leading-tight">Envíos<br>pendientes</span>
                        </button>
                    </div>
                </div>

                <!-- Análisis por Categoría (Género / Ubicación) -->
                <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                        <h3 class="font-bold text-lg text-brand-dark flex items-center gap-3">
                            <div class="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-brand-orange">
                                <i class="ph-bold ${analysisIcon} text-xl"></i>
                            </div>
                            ${analysisTitle}
                        </h3>
                        <div class="flex items-center gap-3">
                            <select onchange="app.state.dashboardAnalysisMode = this.value; app.renderDashboard(document.getElementById('app-content'))"
                                class="bg-slate-50 text-xs font-bold text-brand-dark px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer hover:border-brand-orange transition-colors">
                                <option value="genre" ${analysisMode === 'genre' ? 'selected' : ''}>🎵 Por Género</option>
                                <option value="storage" ${analysisMode === 'storage' ? 'selected' : ''}>📍 Por Ubicación</option>
                            </select>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <i class="ph-bold ph-vinyl-record mr-1"></i> ${totalUnitsSold} unidades vendidas
                            </span>
                        </div>
                    </div>
                    ${sortedCategories.length > 0 ? `
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div class="lg:col-span-5">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Cuota de Mercado</p>
                            <div class="h-80">
                                <canvas id="genreDonutChart"></canvas>
                            </div>
                        </div>
                        <div class="lg:col-span-7">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Ranking por Volumen</p>
                            <div style="height: ${Math.max(280, sortedCategories.length * 40)}px">
                                <canvas id="genreBarChart"></canvas>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <div class="text-center py-12">
                        <i class="ph-bold ph-chart-pie-slice text-4xl text-slate-200 mb-3 block"></i>
                        <p class="text-sm text-slate-400 font-medium">No hay ventas en el período seleccionado</p>
                    </div>
                    `}
                </div>

                <!-- KPIs Estratégicos -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Categoría Más Rentable -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                                <i class="ph-bold ph-crown text-xl"></i>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${topLabel}</span>
                        </div>
                        <p class="text-2xl font-display font-bold text-brand-dark mb-1">${topRevenueCategory.name}</p>
                        <p class="text-sm font-bold text-amber-500">${this.formatCurrency(topRevenueCategory.revenue)} en ingresos</p>
                    </div>

                    <!-- Ticket Promedio -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                <i class="ph-bold ph-tag text-xl"></i>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ticket Promedio</span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark mb-1">${this.formatCurrency(avgTicket)}</p>
                        <p class="text-[10px] text-slate-400 font-medium">Gasto promedio por transacción</p>
                    </div>

                    <!-- Distribución Nuevo vs. Usado -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-500">
                                <i class="ph-bold ph-stack text-xl"></i>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nuevo vs. Usado</span>
                        </div>
                        <div class="mt-2">
                            <div class="flex items-center gap-3">
                                <div class="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden relative">
                                    <div class="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-700 ease-out" style="width: ${newPercent}%"></div>
                                </div>
                            </div>
                            <div class="flex justify-between mt-2.5">
                                <span class="text-[10px] font-bold text-teal-600 flex items-center gap-1">
                                    <span class="inline-block w-2 h-2 rounded-full bg-teal-500"></span> Nuevo ${newPercent}% (${newUnits})
                                </span>
                                <span class="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    <span class="inline-block w-2 h-2 rounded-full bg-slate-300"></span> Usado ${usedPercent}% (${usedUnits})
                                </span>
                            </div>
                        </div>
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

                            <!-- Posición SKAT — Pasivo de IVA (no afecta P&L) -->
                            <div class="mt-8 pt-8 border-t border-slate-50">
                                <div class="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
                                    <div class="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                    <div class="flex items-center gap-2 mb-4">
                                        <div class="w-7 h-7 bg-brand-orange/10 rounded-lg flex items-center justify-center">
                                            <i class="ph-bold ph-bank text-sm text-brand-orange"></i>
                                        </div>
                                        <h4 class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Posición SKAT · Moms</h4>
                                    </div>
                                    <div class="flex justify-between items-baseline mb-3">
                                        <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Moms Tilsvar:</span>
                                        <span class="text-2xl font-display font-bold ${estimatedVAT > 0 ? 'text-red-400' : 'text-emerald-400'}">${this.formatCurrency(estimatedVAT)}</span>
                                    </div>
                                    <div class="grid grid-cols-2 gap-3 text-[10px]">
                                        <div class="bg-white/5 rounded-lg p-2.5">
                                            <span class="text-slate-500 block mb-0.5">Output (ventas)</span>
                                            <span class="text-white font-bold">${this.formatCurrency(totalLiability)}</span>
                                        </div>
                                        <div class="bg-white/5 rounded-lg p-2.5">
                                            <span class="text-slate-500 block mb-0.5">Input (compras)</span>
                                            <span class="text-emerald-400 font-bold">-${this.formatCurrency(totalDeductions)}</span>
                                        </div>
                                    </div>
                                    <p class="text-[9px] text-slate-500 mt-3">Impuesto neutro — pasivo de flujo de caja, no afecta rentabilidad.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;
            container.innerHTML = html;
            this.renderDashboardCharts(filteredSales, last30Days, last30DaysRevenue);

            // --- Genre Analysis Charts ---
            const donutCtx = document.getElementById('genreDonutChart')?.getContext('2d');
            if (donutCtx && sortedCategories.length > 0) {
                if (this.genreDonutChartInstance) this.genreDonutChartInstance.destroy();
                const donutLabels = sortedCategories.map(g => g[0]);
                const donutData = sortedCategories.map(g => g[1]);
                const donutColors = sortedCategories.map((_, i) => genreColorPalette[i % genreColorPalette.length]);

                this.genreDonutChartInstance = new Chart(donutCtx, {
                    type: 'doughnut',
                    data: {
                        labels: donutLabels,
                        datasets: [{
                            data: donutData,
                            backgroundColor: donutColors,
                            borderWidth: 0,
                            hoverOffset: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '62%',
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    boxWidth: 12, boxHeight: 12, borderRadius: 3,
                                    useBorderRadius: true, padding: 14,
                                    font: { size: 11, weight: '600', family: "'DM Sans', sans-serif" },
                                    color: '#334155'
                                }
                            },
                            tooltip: {
                                backgroundColor: '#1e293b',
                                titleFont: { size: 11, weight: '700' },
                                bodyFont: { size: 13, weight: '700' },
                                padding: 14, cornerRadius: 12,
                                callbacks: {
                                    label: (ctx) => {
                                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                        const pct = ((ctx.parsed / total) * 100).toFixed(1);
                                        return ` ${ctx.parsed} uds \u2014 ${pct}%`;
                                    }
                                }
                            }
                        }
                    },
                    plugins: [{
                        id: 'centerText',
                        beforeDraw(chart) {
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return;
                            ctx.save();
                            const cx = (chartArea.left + chartArea.right) / 2;
                            const cy = (chartArea.top + chartArea.bottom) / 2;
                            const sz = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 7;
                            ctx.font = `bold ${sz}px 'DM Sans', sans-serif`;
                            ctx.textBaseline = 'middle';
                            ctx.textAlign = 'center';
                            ctx.fillStyle = '#1e293b';
                            const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            ctx.fillText(total, cx, cy - sz * 0.35);
                            ctx.font = `600 ${sz * 0.42}px 'DM Sans', sans-serif`;
                            ctx.fillStyle = '#94a3b8';
                            ctx.fillText('unidades', cx, cy + sz * 0.55);
                            ctx.restore();
                        }
                    }]
                });
            }

            const barCtx = document.getElementById('genreBarChart')?.getContext('2d');
            if (barCtx && sortedCategories.length > 0) {
                if (this.genreBarChartInstance) this.genreBarChartInstance.destroy();
                const barLabels = sortedCategories.map(g => g[0]);
                const barData = sortedCategories.map(g => g[1]);
                const barColors = sortedCategories.map((_, i) => genreColorPalette[i % genreColorPalette.length]);

                this.genreBarChartInstance = new Chart(barCtx, {
                    type: 'bar',
                    data: {
                        labels: barLabels,
                        datasets: [{
                            label: 'Unidades',
                            data: barData,
                            backgroundColor: barColors.map(c => c + '30'),
                            borderColor: barColors,
                            borderWidth: 2,
                            borderRadius: 8,
                            borderSkipped: false,
                            barThickness: 28
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: '#1e293b',
                                titleFont: { size: 11, weight: '700' },
                                bodyFont: { size: 13, weight: '700' },
                                padding: 14, cornerRadius: 12,
                                callbacks: {
                                    label: (ctx) => ` ${ctx.parsed.x} unidades vendidas`
                                }
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                grid: { color: '#f1f5f9' },
                                ticks: { font: { size: 10, weight: '600' }, color: '#94a3b8' }
                            },
                            y: {
                                grid: { display: false },
                                ticks: { font: { size: 11, weight: '700', family: "'DM Sans', sans-serif" }, color: '#334155', padding: 8 }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error("Dashboard render error:", error);
            container.innerHTML = `<div class="p-12 text-center text-red-500 font-bold bg-red-50 rounded-3xl m-8 border border-red-100">
                <i class="ph-bold ph-warning-circle text-4xl mb-4"></i>
                <p>Error al cargar el dashboard: ${error.message}</p>
                <button onclick="app.loadData()" class="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl">Intentar de nuevo</a>
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
                    <p class="text-[10px] text-slate-500 truncate">${item.is_rsd_discount ? `<span class="line-through opacity-50">${this.formatCurrency(item.price, false)}</span> <span class="text-orange-600 font-bold">${this.formatCurrency(this.getEffectivePrice(item), false)}</span>` : this.formatCurrency(item.price, false)}</p>
                </div>
                <button onclick="app.removeFromCart(${index})" class="text-red-400 hover:text-red-600">
                    <i class="ph-bold ph-x"></i>
                </a>
            </div>
    `).join('');

        container.innerHTML = `
    <div id="cart-widget" class="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-bold text-brand-dark flex items-center gap-2">
                        <i class="ph-fill ph-shopping-cart text-brand-orange"></i> Carrito 
                        <span class="bg-brand-orange text-white text-xs px-1.5 py-0.5 rounded-full">${this.state.cart.length}</span>
                    </h3>
                    <button onclick="app.clearCart()" class="text-xs text-red-500 font-bold hover:underline">Vaciar</a>
                </div>
                <div class="space-y-2 mb-4 max-h-40 overflow-y-auto text-sm custom-scrollbar">
                    ${itemsHtml}
                </div>
                <div class="pt-3 border-t border-slate-50 flex justify-between items-center mb-3">
                     <span class="text-xs font-bold text-slate-500">Total</span>
                     <span class="font-bold text-brand-dark text-lg">${this.formatCurrency(this.state.cart.reduce((s, i) => s + this.getEffectivePrice(i), 0))}</span>
                </div>
                <button onclick="app.openCheckoutModal()" class="w-full py-2 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 text-sm hover:scale-[1.02] transition-transform">
                    Finalizar Venta
                </a>
            </div>
    `;
    },

    // Blueprint Sec 05: paginacion (no renderizar ~1000 filas de una vez)
    setInvPage(page) {
        this.state.invPage = page;
        this.refreshCurrentView();
        const el = document.getElementById('inventory-content-container');
        if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    },

    setInvPageSize(size) {
        this.state.invPageSize = parseInt(size, 10) || 50;
        this.state.invPage = 1;
        this.refreshCurrentView();
    },

    renderInvPagination(total, context) {
        const size = this.state.invPageSize || 50;
        const totalPages = Math.max(1, Math.ceil(total / size));
        const page = Math.min(Math.max(1, this.state.invPage || 1), totalPages);
        const from = total === 0 ? 0 : (page - 1) * size + 1;
        const to = Math.min(page * size, total);
        const btn = (p, label, opts = {}) => `
            <button onclick="app.setInvPage(${p})" ${opts.disabled ? 'disabled' : ''}
                class="min-w-[36px] h-9 px-2 rounded-lg text-xs font-bold transition-all ${opts.active ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-brand-orange hover:text-brand-orange'} ${opts.disabled ? 'opacity-40 cursor-not-allowed' : ''}">
                ${label}
            </button>`;
        let nums = '';
        const win = [];
        for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) win.push(p);
        if (win[0] > 1) { win.unshift(1); if (win[1] > 2) win.splice(1, 0, '...'); }
        if (win[win.length - 1] < totalPages) { if (win[win.length - 1] < totalPages - 1) win.push('...'); win.push(totalPages); }
        win.forEach(p => { nums += p === '...' ? '<span class="text-slate-300 text-xs px-1">…</span>' : btn(p, p, { active: p === page }); });
        return `
            <div class="flex flex-wrap items-center justify-between gap-3 mt-4" data-pagination="${context}">
                <div class="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <span>Mostrando <b class="text-brand-dark">${from}–${to}</b> de <b class="text-brand-dark">${total}</b></span>
                    <select onchange="app.setInvPageSize(this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-brand-dark outline-none cursor-pointer">
                        ${[25, 50, 100, 200].map(s => `<option value="${s}" ${s === size ? 'selected' : ''}>${s}/pág</option>`).join('')}
                    </select>
                </div>
                <div class="flex items-center gap-1.5">
                    ${btn(1, '<i class="ph-bold ph-caret-double-left"></i>', { disabled: page <= 1 })}
                    ${btn(page - 1, '<i class="ph-bold ph-caret-left"></i>', { disabled: page <= 1 })}
                    ${nums}
                    ${btn(page + 1, '<i class="ph-bold ph-caret-right"></i>', { disabled: page >= totalPages })}
                    ${btn(totalPages, '<i class="ph-bold ph-caret-double-right"></i>', { disabled: page >= totalPages })}
                </div>
            </div>`;
    },

    renderInventoryContent(container, filteredInventory, allGenres, allOwners, allStorage) {
        // CONTENT AREA (Grid/List)
        container.innerHTML = `
            ${this.state.viewMode === 'grid' ? `
                <!-- GRID VIEW -->
                ${
                // FOLDER LOGIC: If Grid Mode + No Specific Filter is active -> Show Folders
                (this.state.filterGenre === 'all' && this.state.filterOwner === 'all' && this.state.filterLabel === 'all' && this.state.filterLot === 'all' && this.state.filterStorage === 'all' && this.state.inventorySearch === '') ? `
                    
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
                        ${(this.state.filterGenre !== 'all' || this.state.filterOwner !== 'all' || this.state.filterLabel !== 'all' || this.state.filterLot !== 'all' || this.state.filterStorage !== 'all') ? `
                            <div onclick="app.clearAllFilters()" 
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
                                onclick="app.openProductModal('${item.id}')">
                                <div class="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-4 relative shadow-inner">
                                     ${item.cover_image
                        ? `<img src="${item.cover_image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`
                        : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-fill ph-disc text-5xl"></i></div>`
                    }
                                     <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                         <button onclick="event.stopPropagation(); app.addToCart('${item.id}', event)" class="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-shopping-cart text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openProductModal('${item.id}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-eye text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openPrintLabelModal('${item.id}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-printer text-lg"></i>
                                         </button>
                                     </div>
                                     <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                         ${this.getStatusBadge(item.condition)}
                                         ${this.getTimeInStockBadge(this.getTimeInStockCategory(item.created_at))}
                                     </div>
                                </div>
                                <div class="flex-1 flex flex-col">
                                    <h3 class="font-bold text-brand-dark leading-tight mb-1 line-clamp-1" title="${item.album}">${item.album}</h3>
                                    <p class="text-xs text-slate-500 font-bold uppercase mb-3 truncate">${item.artist}</p>
                                    <div class="flex flex-wrap gap-1 mt-1">${this.stockStatusBadges(item)}</div>
                                    <div class="mt-auto flex justify-between items-center pt-3 border-t border-slate-50">
                                        <span class="font-display font-bold text-xl text-brand-orange">${this.formatCurrency(item.price, false)}</span>
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
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
                    <!-- Bulk Action Bar -->
                    ${this.state.selectedItems.size > 0 ? `
                        <div class="absolute top-0 left-0 w-full bg-brand-dark/95 backdrop-blur text-white p-3 flex justify-between items-center z-20 animate-slide-up">
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
                        <thead class="bg-slate-50 border-b border-slate-100">
                            <tr class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <th class="p-4 w-10">
                                    <input type="checkbox" onchange="app.toggleSelectAll()" 
                                        class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                        ${filteredInventory.length > 0 && filteredInventory.every(i => this.state.selectedItems.has(i.sku)) ? 'checked' : ''}>
                                </th>
                                <th class="p-3">Disco</th>
                                <th class="p-3 hidden md:table-cell">Sello</th>
                                <th class="p-3 text-center w-16 hidden sm:table-cell">Estado</th>
                                <th class="p-3 text-right w-24">Precio</th>
                                <th class="p-3 text-center w-12 hidden sm:table-cell" title="Héroe / Destacado"><i class="ph-bold ph-star text-amber-400"></i></th>
                                <th class="p-3 text-center w-12 hidden sm:table-cell" title="New Arrival / Novedad"><i class="ph-bold ph-sketch-logo text-blue-400"></i></th>
                                <th class="p-3 text-center w-12 hidden sm:table-cell" title="Imprimir Etiqueta"><i class="ph-bold ph-printer text-purple-400"></i></th>
                                <th class="p-3 text-center w-16 hidden sm:table-cell">Stock</th>
                                <th class="p-3 text-center w-12 hidden md:table-cell" title="Publicado en Discogs"><i class="ph-bold ph-disc text-purple-400"></i></th>
                                <th class="p-3 text-right w-28">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${(() => {
                                const size = this.state.invPageSize || 50;
                                const totalPages = Math.max(1, Math.ceil(filteredInventory.length / size));
                                const page = Math.min(Math.max(1, this.state.invPage || 1), totalPages);
                                this.state.invPage = page;
                                return filteredInventory.slice((page - 1) * size, page * size);
                            })().map(item => `
                                <tr class="inv-row cursor-pointer ${this.state.selectedItems.has(item.id) ? 'bg-orange-50/50' : ''}" 
                                    onclick="app.openProductModal('${item.id}')">
                                    <td class="p-3" onclick="event.stopPropagation()">
                                        <input type="checkbox" onchange="app.toggleSelection('${item.id}')"
                                            class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                            ${this.state.selectedItems.has(item.id) ? 'checked' : ''}>
                                    </td>
                                    <td class="p-3">
                                        <div class="flex items-center gap-3">
                                            <div class="relative">
                                                <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 shrink-0 overflow-hidden shadow-md border border-slate-100">
                                                    ${item.cover_image
                                ? `<img src="${item.cover_image}" class="w-full h-full object-cover">`
                                : `<i class="ph-fill ph-disc text-xl"></i>`
                            }
                                                </div>
                                                <div class="absolute -top-1 -right-1 border-2 border-white rounded-full">
                                                    ${this.getTimeInStockBadge(this.getTimeInStockCategory(item.created_at))}
                                                </div>
                                            </div>
                                            <div class="min-w-0">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[220px]" title="${item.album}">${item.album}</div>
                                                <div class="text-xs text-slate-400 font-medium truncate max-w-[220px]">${item.artist}</div>
                                                <div class="flex flex-wrap gap-1 mt-1">${this.stockStatusBadges(item)}</div>
                                                <div class="text-[10px] text-slate-300 font-mono mt-0.5 sm:hidden">${item.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-3 text-xs text-slate-500 font-medium max-w-[100px] truncate hidden md:table-cell">${item.label || '-'}</td>
                                    <td class="p-3 text-center hidden sm:table-cell">${this.getStatusBadge(item.condition)}</td>
                                    <td class="p-3 text-right">
                                        ${item.is_rsd_discount
                                            ? `<div><span class="text-[10px] text-slate-400 line-through">${this.formatCurrency(item.price, false)}</span><br><span class="font-bold text-orange-600 font-display text-sm">${this.formatCurrency(this.getEffectivePrice(item), false)}</span></div>`
                                            : `<span class="font-bold text-brand-dark font-display text-sm">${this.formatCurrency(item.price, false)}</span>`
                                        }
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.toggleProductTag('${item.id}', 'hero')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center ${item.tags && item.tags.includes('hero') ? 'bg-amber-50 text-amber-500 shadow-sm border border-amber-100' : 'text-slate-200 hover:bg-slate-50 hover:text-slate-400'}" 
                                            title="Marcar como Destacado">
                                            <i class="ph-fill ph-star text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.toggleProductTag('${item.id}', 'new_arrival')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center ${item.tags && item.tags.includes('new_arrival') ? 'bg-blue-50 text-blue-500 shadow-sm border border-blue-100' : 'text-slate-200 hover:bg-slate-50 hover:text-slate-400'}" 
                                            title="Marcar como Novedad">
                                            <i class="ph-fill ph-sketch-logo text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.openPrintLabelModal('${item.id}')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center text-slate-200 hover:bg-purple-50 hover:text-purple-600" 
                                            title="Imprimir Etiqueta">
                                            <i class="ph-bold ph-printer text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell">
                                        <span class="inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-full text-xs font-bold ${item.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}">
                                            ${item.stock}
                                        </span>
                                    </td>
                                    <td class="p-3 text-center hidden md:table-cell">
                                        ${item.discogs_listing_id
                            ? `<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-purple-100 text-purple-600" title="Publicado en Discogs"><i class="ph-bold ph-check text-xs"></i></span>`
                            : `<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-slate-50 text-slate-300" title="No publicado"><i class="ph-bold ph-minus text-xs"></i></span>`
                        }
                                    </td>
                                    <td class="p-3 text-right" onclick="event.stopPropagation()">
                                        <div class="flex justify-end gap-1">
                                            <button onclick="event.stopPropagation(); app.openAddVinylModal('${item.id}')" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-brand-dark hover:bg-slate-100 transition-all flex items-center justify-center" title="Editar">
                                                <i class="ph-bold ph-pencil-simple text-sm"></i>
                                            </button>

                                            <button onclick="event.stopPropagation(); app.addToCart('${item.id}')" class="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange hover:bg-brand-orange hover:text-white transition-all flex items-center justify-center" title="Agregar al carrito">
                                                <i class="ph-bold ph-shopping-cart text-sm"></i>
                                            </button>
                                            <button onclick="event.stopPropagation(); app.deleteVinyl('${item.id}')" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center" title="Eliminar">
                                                <i class="ph-bold ph-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="bg-white rounded-2xl border border-slate-100 px-4 py-3">
                    ${this.renderInvPagination(filteredInventory.length, 'list')}
                </div>

            `}
        `;
    },

    renderInventory(container) {
        // Collect unique values for dynamic filters
        const allGenres = [...new Set(this.state.inventory.flatMap(i => {
            const rawGenres = [i.genre, i.genre2, i.genre3, i.genre4, i.genre5].filter(Boolean);
            const itemGenres = [];
            rawGenres.forEach(rg => {
                itemGenres.push(...rg.split(',').map(s => s.trim()).filter(Boolean));
            });
            const uniqueGenres = [...new Set(itemGenres)];
            const nonElectronic = uniqueGenres.filter(g => g.toLowerCase() !== 'electronic');
            return nonElectronic.length > 0 ? nonElectronic : (uniqueGenres.length > 0 ? uniqueGenres : ['Otros']);
        }))].sort();
        const allOwners = [...new Set(this.state.inventory.map(i => i.owner).filter(Boolean))].sort();
        const allLabels = [...new Set(this.state.inventory.map(i => i.label).filter(Boolean))].sort();
        const allLots = [...new Set(this.state.inventory.map(i => i.lot).filter(Boolean))].sort();
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

        // KPI calculations — DERIVED from filteredInventory
        const globalTotal = this.state.inventory.length;
        const totalItems = filteredInventory.length;
        const totalValue = filteredInventory.reduce((sum, i) => {
            const stock = Number(i.stock) || 0;
            return sum + (stock > 0 ? (parseFloat(i.price) || 0) * stock : 0);
        }, 0);
        const inStock = filteredInventory.filter(i => (i.stock || 0) > 0).length;
        const onDiscogs = filteredInventory.filter(i => i.discogs_listing_id).length;

        // Active filter tracking (for tags)
        const activeFiltersList = [];
        if (this.state.filterStock === 'inStock') activeFiltersList.push({ key: 'filterStock', label: 'Solo en Stock', icon: 'ph-check-circle' });
        if (this.state.filterStock === 'outOfStock') activeFiltersList.push({ key: 'filterStock', label: 'Solo Agotados', icon: 'ph-x-circle' });
        if (this.state.filterDiscogs === 'yes') activeFiltersList.push({ key: 'filterDiscogs', label: 'En Discogs', icon: 'ph-disc' });
        if (this.state.filterDiscogs === 'no') activeFiltersList.push({ key: 'filterDiscogs', label: 'No en Discogs', icon: 'ph-disc' });
        if (this.state.filterCondition === 'used') activeFiltersList.push({ key: 'filterCondition', label: 'Brugtmoms (Usados)', icon: 'ph-recycle' });
        if (this.state.filterCondition === 'new') activeFiltersList.push({ key: 'filterCondition', label: 'Nuevos', icon: 'ph-sparkle' });
        if (this.state.filterGenre !== 'all') activeFiltersList.push({ key: 'filterGenre', label: `Género: ${this.state.filterGenre}`, icon: 'ph-music-notes' });
        if (this.state.filterLabel !== 'all') activeFiltersList.push({ key: 'filterLabel', label: `Sello: ${this.state.filterLabel}`, icon: 'ph-vinyl-record' });
        if (this.state.filterLot !== 'all') activeFiltersList.push({ key: 'filterLot', label: `Lote: ${this.state.filterLot}`, icon: 'ph-package' });
        if (this.state.filterOwner !== 'all') activeFiltersList.push({ key: 'filterOwner', label: `Dueño: ${this.state.filterOwner}`, icon: 'ph-user' });
        if (this.state.filterStorage !== 'all') activeFiltersList.push({ key: 'filterStorage', label: `Disquería: ${this.state.filterStorage}`, icon: 'ph-tag' });
        if (this.state.filterHero === 'yes') activeFiltersList.push({ key: 'filterHero', label: 'Destacados', icon: 'ph-star' });
        if (this.state.filterPriceMin || this.state.filterPriceMax) activeFiltersList.push({ key: 'filterPrice', label: `Precio: ${this.state.filterPriceMin || '0'}–${this.state.filterPriceMax || '∞'} kr`, icon: 'ph-currency-circle-dollar' });
        if (this.state.filterHero === 'no') activeFiltersList.push({ key: 'filterHero', label: 'No Destacados', icon: 'ph-star' });
        if (this.state.filterStockTime.length > 0) {
            const timeLabels = { green: '0-2m', orange: '2-4m', red: '4-6m', purple: '+6m' };
            activeFiltersList.push({ key: 'filterStockTime', label: `Antigüedad: ${this.state.filterStockTime.map(t => timeLabels[t]).join(', ')}`, icon: 'ph-clock', resetValue: 'stockTime' });
        }
        const hasActiveFilters = activeFiltersList.length > 0 || this.state.inventorySearch.length > 0;
        const isFiltered = activeFiltersList.length > 0;

        // 1. Static Layout Init
        if (!document.getElementById('inventory-layout-root')) {
            container.innerHTML = `
    <div id="inventory-layout-root" class="max-w-7xl mx-auto pb-24 md:pb-8 px-4 md:px-8 pt-10">
                    <!--Header -->
                    <div class="sticky top-0 bg-slate-50 z-20 pb-4 pt-4 -mx-4 px-4 md:mx-0 md:px-0">
                         <div class="flex justify-between items-center mb-5">
                            <div>
                                <h2 class="font-display text-2xl font-bold text-brand-dark">Inventario</h2>
                                <p class="text-xs text-slate-400 mt-1" id="inventory-subtitle">${globalTotal} discos registrados</p>
                            </div>
                             <div class="flex gap-2">
                                <button onclick="app.openInventoryLogModal()" class="bg-white border border-slate-200 text-slate-500 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm hover:text-brand-orange hover:border-brand-orange transition-colors" title="Historial">
                                    <i class="ph-bold ph-clock-counter-clockwise text-lg"></i>
                                </button>
                                <button onclick="app.openBulkImportModal()" class="bg-white border border-slate-200 text-slate-600 px-3 h-10 rounded-xl flex items-center gap-2 shadow-sm hover:border-emerald-400 hover:text-emerald-600 transition-all" title="Carga Masiva CSV">
                                    <i class="ph-bold ph-file-csv text-lg"></i>
                                    <span class="text-xs font-bold hidden sm:inline">Importar</span>
                                </button>
                                <button onclick="app.syncWithDiscogs()" id="discogs-sync-btn" class="bg-white border border-slate-200 text-slate-600 px-3 h-10 rounded-xl flex items-center gap-2 shadow-sm hover:border-purple-400 hover:text-purple-600 transition-all" title="Sincronizar con Discogs">
                                    <i class="ph-bold ph-cloud-arrow-down text-lg"></i>
                                    <span class="text-xs font-bold hidden sm:inline">Discogs</span>
                                </button>
                                <button onclick="app.openQuickAddWizard()" class="bg-white border border-slate-200 text-slate-600 hover:border-brand-orange hover:text-brand-orange px-4 h-10 rounded-xl flex items-center gap-2 shadow-sm transition-all" title="Carga rápida paso a paso (Flujo A)">
                                    <i class="ph-bold ph-lightning text-lg text-brand-orange"></i>
                                    <span class="text-xs font-bold hidden sm:inline">Carga rápida</span>
                                </button>
                                <button onclick="app.openAddVinylModal()" class="bg-brand-dark text-white px-4 h-10 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-dark/20 hover:scale-105 transition-transform">
                                    <i class="ph-bold ph-plus text-lg"></i>
                                    <span class="text-xs font-bold hidden sm:inline">Nuevo</span>
                                </button>
                            </div>
                        </div>

                        <!-- Search Bar -->
                        <div class="relative group mb-4">
                            <i class="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-orange transition-colors text-lg"></i>
                            <input type="text" placeholder="Buscar artista, álbum, sello, SKU..." value="${this.state.inventorySearch}" oninput="app.state.inventorySearch = this.value; app.state.invPage = 1; app.refreshCurrentView()" class="w-full bg-white border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 text-brand-dark placeholder:text-slate-400 focus:border-brand-orange outline-none transition-colors font-medium shadow-sm">
                        </div>

                        <!-- KPI Stats Row -->
                        <div id="inventory-kpi-container" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"></div>

                        <!-- Quick Filter Pills + Sort + Advanced -->
                        <div id="inventory-filters-container" class="flex flex-wrap items-center gap-2 mb-2"></div>

                        <!-- Active Filter Tags -->
                        <div id="inventory-active-tags" class="flex flex-wrap items-center gap-2"></div>
                    </div>

                    <!-- Mini-Dashboard Stats -->
                    <div id="inventory-stats-section" class="stats-section"></div>

                    <!-- Cart (if items present) -->
                    <div id="inventory-cart-container" class="hidden mb-4"></div>

                    <!-- View Toggle + Content -->
                    <div class="mt-4">
                        <div class="flex justify-between items-center mb-3">
                            <p class="text-xs font-bold text-slate-400" id="inventory-results-count">${filteredInventory.length} resultado${filteredInventory.length !== 1 ? 's' : ''}</p>
                            <div class="hidden lg:flex items-center gap-2">
                                <button onclick="app.state.viewMode='list'; app.refreshCurrentView()" class="p-2 rounded-lg transition-colors ${this.state.viewMode !== 'grid' ? 'bg-brand-dark text-white' : 'bg-white text-slate-400 border border-slate-200'}"><i class="ph-bold ph-list-dashes text-sm"></i></button>
                                <button onclick="app.state.viewMode='grid'; app.refreshCurrentView()" class="p-2 rounded-lg transition-colors ${this.state.viewMode === 'grid' ? 'bg-brand-dark text-white' : 'bg-white text-slate-400 border border-slate-200'}"><i class="ph-bold ph-squares-four text-sm"></i></button>
                            </div>
                        </div>
                        <div id="inventory-content-container"></div>
                    </div>
                </div>

    <!-- Advanced Filters Slide-over -->
    <div id="advanced-filters-backdrop" class="slide-over-backdrop" onclick="app.toggleAdvancedFilters()"></div>
    <div id="advanced-filters-panel" class="slide-over-panel">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 class="font-display font-bold text-lg text-brand-dark flex items-center gap-2">
                <i class="ph-bold ph-sliders-horizontal text-brand-orange"></i> Filtros Avanzados
            </h3>
            <button onclick="app.toggleAdvancedFilters()" class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all">
                <i class="ph-bold ph-x"></i>
            </button>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-5" id="advanced-filters-content"></div>
        <div class="p-4 border-t border-slate-100 flex gap-2">
            <button onclick="app.clearAllFilters(); app.toggleAdvancedFilters()" class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all">
                <i class="ph-bold ph-x"></i> Limpiar
            </button>
            <button onclick="app.toggleAdvancedFilters()" class="flex-1 py-2.5 rounded-xl bg-brand-dark text-white font-bold text-sm shadow-lg shadow-brand-dark/20 hover:scale-[1.02] transition-transform">
                Aplicar
            </button>
        </div>
    </div>
    `;
        }

        // 2. Dynamic Updates — KPI Stats (derived from filteredInventory)
        const kpiContainer = document.getElementById('inventory-kpi-container');
        if (kpiContainer) {
            const filteredBadge = isFiltered ? `<span class="ml-1.5 text-[9px] bg-orange-100 text-brand-orange px-1.5 py-0.5 rounded-full font-bold"><i class="ph-bold ph-funnel text-[8px]"></i> Filtrado</span>` : '';
            kpiContainer.innerHTML = `
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Discos ${filteredBadge}</p>
                    <p class="text-xl font-bold text-brand-dark font-display mt-1">${totalItems}${isFiltered ? ` <span class="text-xs text-slate-400 font-normal">/ ${globalTotal}</span>` : ''}</p>
                </div>
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total ${filteredBadge}</p>
                    <p class="text-xl font-bold text-brand-orange font-display mt-1">${this.formatCurrency(totalValue)}</p>
                </div>
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Stock ${filteredBadge}</p>
                    <p class="text-xl font-bold text-emerald-600 font-display mt-1">${inStock} <span class="text-xs text-slate-400 font-normal">/ ${totalItems}</span></p>
                </div>
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Discogs ${filteredBadge}</p>
                    <p class="text-xl font-bold text-purple-600 font-display mt-1">${onDiscogs} <span class="text-xs text-slate-400 font-normal">/ ${totalItems}</span></p>
                </div>
            `;
        }

        // 3. Dynamic Updates — Quick Pills + Sort + Advanced Filters button
        const filtersContainer = document.getElementById('inventory-filters-container');
        if (filtersContainer) {
            filtersContainer.innerHTML = `
                <div class="filter-chip ${this.state.sortBy && this.state.sortBy !== 'dateDesc' ? 'active' : ''}">
                    <i class="ph-bold ph-sort-ascending text-xs"></i>
                    <select onchange="app.state.sortBy = this.value; app.refreshCurrentView()">
                        <option value="dateDesc" ${this.state.sortBy === 'dateDesc' || !this.state.sortBy ? 'selected' : ''}>Más Recientes</option>
                        <option value="dateAsc" ${this.state.sortBy === 'dateAsc' ? 'selected' : ''}>Más Antiguos</option>
                        <option value="priceDesc" ${this.state.sortBy === 'priceDesc' ? 'selected' : ''}>Precio ↓</option>
                        <option value="priceAsc" ${this.state.sortBy === 'priceAsc' ? 'selected' : ''}>Precio ↑</option>
                        <option value="stockDesc" ${this.state.sortBy === 'stockDesc' ? 'selected' : ''}>Stock ↓</option>
                    </select>
                </div>

                <div class="h-6 w-px bg-slate-200 mx-1"></div>

                <!-- Quick Filter Pills -->
                <button onclick="app.toggleQuickFilter('filterStock', 'inStock')" class="quick-pill ${this.state.filterStock === 'inStock' ? 'active' : ''}">
                    <i class="ph-bold ph-check-circle text-xs"></i> En Stock
                </button>
                <button onclick="app.toggleQuickFilter('filterStock', 'outOfStock')" class="quick-pill ${this.state.filterStock === 'outOfStock' ? 'active' : ''}">
                    <i class="ph-bold ph-x-circle text-xs"></i> Agotados
                </button>
                <button onclick="app.toggleQuickFilter('filterDiscogs', 'yes')" class="quick-pill ${this.state.filterDiscogs === 'yes' ? 'active' : ''}">
                    <i class="ph-bold ph-disc text-xs"></i> Discogs
                </button>
                <button onclick="app.toggleQuickFilter('filterCondition', 'used')" class="quick-pill ${this.state.filterCondition === 'used' ? 'active' : ''}">
                    <i class="ph-bold ph-recycle text-xs"></i> Brugtmoms
                </button>
                <button onclick="app.toggleQuickFilter('filterCondition', 'new')" class="quick-pill ${this.state.filterCondition === 'new' ? 'active' : ''}">
                    <i class="ph-bold ph-sparkle text-xs"></i> Nuevos
                </button>

                <div class="h-6 w-px bg-slate-200 mx-1"></div>

                <!-- Advanced Filters button -->
                <button onclick="app.toggleAdvancedFilters()" class="quick-pill ${isFiltered && activeFiltersList.some(f => ['filterGenre','filterLabel','filterLot','filterOwner','filterStorage','filterHero','filterStockTime'].includes(f.key)) ? 'active' : ''}">
                    <i class="ph-bold ph-sliders-horizontal text-xs"></i> Más Filtros
                    ${(() => { const advCount = activeFiltersList.filter(f => ['filterGenre','filterLabel','filterLot','filterOwner','filterStorage','filterHero','filterStockTime'].includes(f.key)).length; return advCount > 0 ? `<span class="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[10px]">${advCount}</span>` : ''; })()}
                </button>

                <!-- Stats Toggle -->
                <button onclick="app.toggleStats()" class="quick-pill ${this.state.showStats ? 'active' : ''}">
                    <i class="ph-bold ph-chart-bar text-xs"></i> Estadísticas
                </button>
            `;
        }

        // 3b. Active Filter Tags
        const tagsContainer = document.getElementById('inventory-active-tags');
        if (tagsContainer) {
            if (activeFiltersList.length > 0) {
                tagsContainer.innerHTML = `
                    <div class="flex flex-wrap items-center gap-2 mt-2 animate-fade-in">
                        ${activeFiltersList.map(f => `
                            <span class="active-tag">
                                <i class="ph-bold ${f.icon} text-[10px]"></i>
                                ${f.label}
                                <span class="tag-remove" onclick="app.clearSingleFilter('${f.key}'${f.resetValue ? ", '" + f.resetValue + "'" : ''})">
                                    <i class="ph-bold ph-x"></i>
                                </span>
                            </span>
                        `).join('')}
                        <button onclick="app.clearAllFilters()" class="active-tag hover:!bg-red-100 hover:!border-red-300 hover:!text-red-600" style="background:#fee2e2;border-color:#fca5a5;color:#ef4444;">
                            <i class="ph-bold ph-x text-[10px]"></i> Limpiar todo (${activeFiltersList.length})
                        </button>
                    </div>
                `;
            } else {
                tagsContainer.innerHTML = '';
            }
        }

        // 3c. Advanced Filters Slide-over content
        const advContent = document.getElementById('advanced-filters-content');
        if (advContent) {
            advContent.innerHTML = `
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Género</label>
                    <select onchange="app.state.filterGenre = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los géneros</option>
                        ${allGenres.map(g => `<option value="${g}" ${this.state.filterGenre === g ? 'selected' : ''}>${g}</option>`).join('')}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Sello</label>
                    <select onchange="app.state.filterLabel = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los sellos</option>
                        ${allLabels.map(l => `<option value="${l}" ${this.state.filterLabel === l ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Lote</label>
                    <select onchange="app.state.filterLot = this.value; app.state.invPage = 1; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los lotes</option>
                        ${allLots.map(l => `<option value="${l}" ${this.state.filterLot === l ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Dueño</label>
                    <select onchange="app.state.filterOwner = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los dueños</option>
                        ${allOwners.map(o => `<option value="${o}" ${this.state.filterOwner === o ? 'selected' : ''}>${o}</option>`).join('')}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Disquería</label>
                    <select onchange="app.state.filterStorage = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todas las disquerías</option>
                        ${allStorage.map(s => `<option value="${s}" ${this.state.filterStorage === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Rango de precio (DKK)</label>
                    <div class="flex items-center gap-2">
                        <input type="number" min="0" placeholder="Mín" value="${this.state.filterPriceMin || ''}"
                            onchange="app.state.filterPriceMin = this.value; app.state.invPage = 1; app.refreshCurrentView()"
                            class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <span class="text-slate-300 font-bold">–</span>
                        <input type="number" min="0" placeholder="Máx" value="${this.state.filterPriceMax || ''}"
                            onchange="app.state.filterPriceMax = this.value; app.state.invPage = 1; app.refreshCurrentView()"
                            class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                    </div>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Héroe / Destacado</label>
                    <select onchange="app.state.filterHero = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all" ${(this.state.filterHero || 'all') === 'all' ? 'selected' : ''}>Todos</option>
                        <option value="yes" ${this.state.filterHero === 'yes' ? 'selected' : ''}>🌟 Destacados</option>
                        <option value="no" ${this.state.filterHero === 'no' ? 'selected' : ''}>➖ Normales</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Antigüedad en Stock</label>
                    <div class="flex items-center gap-3">
                        <button onclick="app.toggleStockTimeFilter('green'); " class="flex items-center gap-2 px-3 py-2 rounded-xl border ${this.state.filterStockTime.includes('green') ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'} hover:border-emerald-400 transition-all text-xs font-bold">
                            <span class="w-3 h-3 rounded-full bg-emerald-500"></span> 0-2m
                        </button>
                        <button onclick="app.toggleStockTimeFilter('orange'); " class="flex items-center gap-2 px-3 py-2 rounded-xl border ${this.state.filterStockTime.includes('orange') ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-500'} hover:border-orange-400 transition-all text-xs font-bold">
                            <span class="w-3 h-3 rounded-full bg-orange-500"></span> 2-4m
                        </button>
                        <button onclick="app.toggleStockTimeFilter('red'); " class="flex items-center gap-2 px-3 py-2 rounded-xl border ${this.state.filterStockTime.includes('red') ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'} hover:border-red-400 transition-all text-xs font-bold">
                            <span class="w-3 h-3 rounded-full bg-red-500"></span> 4-6m
                        </button>
                        <button onclick="app.toggleStockTimeFilter('purple'); " class="flex items-center gap-2 px-3 py-2 rounded-xl border ${this.state.filterStockTime.includes('purple') ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-500'} hover:border-purple-400 transition-all text-xs font-bold">
                            <span class="w-3 h-3 rounded-full bg-purple-500"></span> +6m
                        </button>
                    </div>
                </div>
            `;
        }

        // 3d. Mini-Dashboard Stats (rendered when showStats is true)
        const statsSection = document.getElementById('inventory-stats-section');
        if (statsSection) {
            if (this.state.showStats) {
                // Genre distribution from filtered inventory
                const genreCounts = {};
                filteredInventory.forEach(item => {
                    const rawGenres = [item.genre, item.genre2, item.genre3, item.genre4, item.genre5].filter(Boolean);
                    const itemGenres = [];
                    rawGenres.forEach(rg => { itemGenres.push(...rg.split(',').map(s => s.trim()).filter(Boolean)); });
                    const uniqueGenres = [...new Set(itemGenres)];
                    const nonElectronic = uniqueGenres.filter(g => g.toLowerCase() !== 'electronic');
                    const effectiveGenres = nonElectronic.length > 0 ? nonElectronic : (uniqueGenres.length > 0 ? uniqueGenres : ['Otros']);
                    effectiveGenres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
                });
                const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
                const maxGenreCount = sortedGenres.length > 0 ? sortedGenres[0][1] : 1;
                const genreColors = ['#F05A28', '#e04d1c', '#f97316', '#fb923c', '#fdba74', '#8b5cf6', '#a78bfa', '#3b82f6', '#60a5fa', '#22c55e'];

                // Stock vs Sold value
                const stockValue = filteredInventory.reduce((sum, i) => {
                    const s = Number(i.stock) || 0;
                    return sum + (s > 0 ? (parseFloat(i.price) || 0) * s : 0);
                }, 0);
                const soldValue = filteredInventory.reduce((sum, i) => {
                    const s = Number(i.stock) || 0;
                    return sum + (s <= 0 ? (parseFloat(i.price) || 0) : 0);
                }, 0);
                const maxBarValue = Math.max(stockValue, soldValue, 1);

                statsSection.innerHTML = `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <!-- Genre Distribution -->
                        <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                            <h4 class="font-bold text-brand-dark text-sm mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-music-notes-simple text-brand-orange"></i> Distribución por Género
                                <span class="text-[10px] text-slate-400 font-normal">(Top 10)</span>
                            </h4>
                            <div class="space-y-2.5">
                                ${sortedGenres.map(([genre, count], idx) => `
                                    <div>
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="text-xs font-bold text-slate-600 truncate max-w-[160px]">${genre}</span>
                                            <span class="text-xs font-bold text-slate-400">${count}</span>
                                        </div>
                                        <div class="stat-bar-track">
                                            <div class="stat-bar-fill" style="width: ${Math.max((count / maxGenreCount) * 100, 8)}%; background: ${genreColors[idx % genreColors.length]};"></div>
                                        </div>
                                    </div>
                                `).join('')}
                                ${sortedGenres.length === 0 ? '<p class="text-xs text-slate-400 text-center py-4">Sin datos</p>' : ''}
                            </div>
                        </div>

                        <!-- Stock vs Sold Value -->
                        <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                            <h4 class="font-bold text-brand-dark text-sm mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-chart-bar text-brand-orange"></i> Valor de Inventario
                            </h4>
                            <div class="space-y-4">
                                <div>
                                    <div class="flex justify-between items-center mb-1.5">
                                        <span class="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><i class="ph-fill ph-package text-sm"></i> En Stock</span>
                                        <span class="text-sm font-bold text-brand-dark font-display">${this.formatCurrency(stockValue)}</span>
                                    </div>
                                    <div class="stat-bar-track">
                                        <div class="stat-bar-fill" style="width: ${Math.max((stockValue / maxBarValue) * 100, 5)}%; background: linear-gradient(90deg, #22c55e, #4ade80);"></div>
                                    </div>
                                </div>
                                <div>
                                    <div class="flex justify-between items-center mb-1.5">
                                        <span class="text-xs font-bold text-slate-500 flex items-center gap-1.5"><i class="ph-fill ph-shopping-cart text-sm"></i> Vendido (Agotado)</span>
                                        <span class="text-sm font-bold text-brand-dark font-display">${this.formatCurrency(soldValue)}</span>
                                    </div>
                                    <div class="stat-bar-track">
                                        <div class="stat-bar-fill" style="width: ${Math.max((soldValue / maxBarValue) * 100, 5)}%; background: linear-gradient(90deg, #94a3b8, #cbd5e1);"></div>
                                    </div>
                                </div>
                                <div class="pt-3 border-t border-slate-100">
                                    <div class="flex justify-between items-center">
                                        <span class="text-xs font-bold text-slate-400">Valor Total Registrado</span>
                                        <span class="text-lg font-bold text-brand-orange font-display">${this.formatCurrency(stockValue + soldValue)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                // Ensure section is visually open
                statsSection.classList.add('open');
            } else {
                statsSection.classList.remove('open');
            }
        }

        // 3e. Update results count and subtitle
        const resultsCount = document.getElementById('inventory-results-count');
        if (resultsCount) {
            resultsCount.textContent = `${filteredInventory.length} resultado${filteredInventory.length !== 1 ? 's' : ''}`;
        }
        const subtitle = document.getElementById('inventory-subtitle');
        if (subtitle) {
            subtitle.textContent = `${globalTotal} discos registrados`;
        }

        // 4. Cart
        this.renderInventoryCart();

        // 5. Content (Grid/List)
        const contentContainer = document.getElementById('inventory-content-container');
        if (contentContainer) {
            this.renderInventoryContent(contentContainer, filteredInventory, allGenres, allOwners, allStorage);
        }
    },



    getTimeInStockCategory(createdAt) {
        if (!createdAt) return 'unknown';
        const date = createdAt.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt);
        if (isNaN(date.getTime())) return 'unknown';

        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const months = diffDays / 30.44;

        if (months <= 2) return 'green';
        if (months <= 4) return 'orange';
        if (months <= 6) return 'red';
        return 'purple';
    },

    getTimeInStockBadge(category) {
        switch(category) {
            case 'green': return '<span class="w-3 h-3 block rounded-full bg-emerald-500 shadow-sm" title="Antigüedad: 0 a 2 meses"></span>';
            case 'orange': return '<span class="w-3 h-3 block rounded-full bg-orange-500 shadow-sm" title="Antigüedad: 2 a 4 meses"></span>';
            case 'red': return '<span class="w-3 h-3 block rounded-full bg-red-500 shadow-sm" title="Antigüedad: 4 a 6 meses"></span>';
            case 'purple': return '<span class="w-3 h-3 block rounded-full bg-purple-500 shadow-sm" title="Antigüedad: Más de 6 meses"></span>';
            default: return '<span class="w-3 h-3 block rounded-full bg-slate-300 shadow-sm" title="Antigüedad: Desconocida"></span>';
        }
    },

    toggleStockTimeFilter(category) {
        const index = this.state.filterStockTime.indexOf(category);
        if (index === -1) {
            this.state.filterStockTime.push(category);
        } else {
            this.state.filterStockTime.splice(index, 1);
        }
        this.refreshCurrentView();
    },

    toggleQuickFilter(filterName, value) {
        // Toggle: if already set to this value, reset to 'all'; otherwise set it
        if (this.state[filterName] === value) {
            this.state[filterName] = 'all';
        } else {
            this.state[filterName] = value;
        }
        this.state.invPage = 1; // Blueprint Sec 05: volver a la primera pagina al filtrar
        this.refreshCurrentView();
    },

    toggleAdvancedFilters() {
        this.state.showAdvancedFilters = !this.state.showAdvancedFilters;
        const backdrop = document.getElementById('advanced-filters-backdrop');
        const panel = document.getElementById('advanced-filters-panel');
        if (backdrop && panel) {
            if (this.state.showAdvancedFilters) {
                backdrop.classList.add('open');
                panel.classList.add('open');
            } else {
                backdrop.classList.remove('open');
                panel.classList.remove('open');
            }
        }
    },

    toggleStats() {
        this.state.showStats = !this.state.showStats;
        const section = document.getElementById('inventory-stats-section');
        if (section) {
            if (this.state.showStats) {
                section.classList.add('open');
            } else {
                section.classList.remove('open');
            }
        }
        // Re-render to update stat content
        this.refreshCurrentView();
    },

    clearSingleFilter(filterName, resetValue) {
        if (resetValue === 'stockTime') {
            this.state.filterStockTime = [];
        } else if (filterName === 'filterPrice') {
            this.state.filterPriceMin = '';
            this.state.filterPriceMax = '';
            this.state.invPage = 1;
        } else {
            this.state[filterName] = resetValue !== undefined ? resetValue : 'all';
        }
        this.refreshCurrentView();
    },

    clearAllFilters() {
        this.state.filterGenre = 'all';
        this.state.filterOwner = 'all';
        this.state.filterLabel = 'all';
        this.state.filterLot = 'all';
        this.state.filterStorage = 'all';
        this.state.filterDiscogs = 'all';
        this.state.filterHero = 'all';
        this.state.filterStock = 'all';
        this.state.filterCondition = 'all';
        this.state.filterStockTime = [];
        this.state.filterPriceMin = '';
        this.state.filterPriceMax = '';
        this.state.invPage = 1;
        this.refreshCurrentView();
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
        this.refreshCurrentView();
    },

    renderSales(container) {
        // 1. Data Processing — bandeja unificada de los 3 canales
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const channelFilter = this.state.salesChannelFilter || 'all';
        const channelMatch = (s) => channelFilter === 'all' || this.normalizeSaleChannel(s) === channelFilter;

        // KPIs calculados sobre el conjunto filtrado por canal
        const todaySales = this.state.sales
            .filter(s => s.date === today && channelMatch(s))
            .reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        const yesterdaySales = this.state.sales
            .filter(s => s.date === yesterday && channelMatch(s))
            .reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);

        // Orders to ship (WebShop o Discogs con fulfillment pendiente; el local nunca envía)
        const toShip = this.state.sales.filter(s =>
            channelMatch(s) && this.isShippableChannel(s) && (
                s.fulfillment_status === 'preparing' ||
                s.status === 'paid' ||
                (this.normalizeSaleChannel(s) === 'discogs' && s.status !== 'shipped')
            )
        ).length;

        // Current Filter Context
        const currentYear = this.state.filterYear;
        const selectedMonths = this.state.filterMonths;
        const paymentFilter = document.getElementById('sales-payment-filter')?.value || 'all';
        const searchTerm = (this.state.salesHistorySearch || '').toLowerCase();
        const searchTerms = searchTerm.split(' ').filter(t => t.length > 0);
        const feedFilter = this.state.orderFeedFilter || 'all';

        const filteredSales = this.state.sales.filter(s => {
            const d = new Date(s.date);
            const dateMatch = d.getFullYear() === currentYear && selectedMonths.includes(d.getMonth());
            const paymentMatch = paymentFilter === 'all' || s.paymentMethod === paymentFilter;

            let searchMatch = true;
            if (searchTerms.length > 0) {
                searchMatch = searchTerms.every(term => {
                    const matchesItems = Array.isArray(s.items) && s.items.some(item => {
                        const album = (item.album || item.record?.album || '').toLowerCase();
                        const artist = (item.artist || item.record?.artist || '').toLowerCase();
                        const label = (item.label || item.record?.label || '').toLowerCase();
                        const sku = (item.sku || item.record?.sku || '').toLowerCase();
                        return album.includes(term) || artist.includes(term) || label.includes(term) || sku.includes(term);
                    });
                    const matchesSale = (s.album || '').toLowerCase().includes(term) ||
                        (s.sku || '').toLowerCase().includes(term) ||
                        (s.customerName || '').toLowerCase().includes(term) ||
                        (s.orderNumber || '').toLowerCase().includes(term);
                    return matchesItems || matchesSale;
                });
            }

            // Status Feed Filter
            let feedMatch = true;
            if (feedFilter === 'to_ship') {
                feedMatch = s.status !== 'shipped' && this.normalizeSaleChannel(s) !== 'local';
            } else if (feedFilter === 'completed') {
                feedMatch = s.status === 'shipped';
            }

            return dateMatch && paymentMatch && searchMatch && feedMatch && channelMatch(s);
        });

        const totalRevenue = filteredSales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

        // Conteos por canal para los chips (respetan año/mes, no el filtro de canal)
        const channelCounts = { all: 0, local: 0, online: 0, discogs: 0 };
        this.state.sales.forEach(s => {
            const d = new Date(s.date);
            if (d.getFullYear() === currentYear && selectedMonths.includes(d.getMonth())) {
                channelCounts.all++;
                channelCounts[this.normalizeSaleChannel(s)]++;
            }
        });

        const html = `
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                ${this.sectionHeader({
                    title: 'Ventas',
                    subtitle: 'Bandeja unificada · Local, WebShop y Discogs',
                    filters: `
                        <button onclick="app.syncWithDiscogs()" class="bg-white border border-slate-200 text-slate-600 px-4 h-10 rounded-xl flex items-center gap-2 shadow-sm hover:border-purple-400 hover:text-purple-600 transition-all text-xs font-bold">
                            <i class="ph-bold ph-arrows-clockwise text-base"></i>
                            <span class="hidden sm:inline">Sincronizar Discogs</span>
                        </button>`
                })}

                <!-- Período -->
                <div class="flex flex-wrap items-center gap-3 mb-6">
                    <div class="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <select id="sales-year" onchange="app.updateFilter('year', this.value)" class="bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600 outline-none cursor-pointer">
                            <option value="2026" ${currentYear === 2026 ? 'selected' : ''}>2026</option>
                            <option value="2025" ${currentYear === 2025 ? 'selected' : ''}>2025</option>
                        </select>
                    </div>
                    <div class="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        ${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => `
                            <button onclick="app.toggleMonthFilter(${i})"
                                class="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedMonths.includes(i) ? 'bg-brand-dark text-white' : 'text-slate-400 hover:bg-slate-100'}">
                                ${m}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- KPI Cards: calculadas sobre el conjunto filtrado -->
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
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

                    <!-- Tarjeta B: Ingresos del Período (filtrado) -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                <i class="ph-duotone ph-wallet text-xl"></i>
                            </div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Período</span>
                        </div>
                        <h3 class="text-2xl font-display font-bold text-brand-dark mb-1">${this.formatCurrency(totalRevenue)}</h3>
                        <p class="text-xs text-slate-400 font-medium">${filteredSales.length} ventas en el filtro</p>
                    </div>

                    <!-- Tarjeta C: Por Despachar -->
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

                <!-- Bandeja unificada: ancho completo (el POS vive en su propia sección) -->
                <div class="space-y-6">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2 flex-1">
                            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Bandeja de ventas</h3>
                            <div class="h-px flex-1 bg-slate-100"></div>
                        </div>
                    </div>

                    <!-- Filtro por canal -->
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Canal</span>
                        ${[
                            { id: 'all', label: 'Todos' },
                            { id: 'local', label: 'Local' },
                            { id: 'online', label: 'WebShop' },
                            { id: 'discogs', label: 'Discogs' }
                        ].map(ch => `
                            <button onclick="app.updateSalesChannelFilter('${ch.id}')"
                                class="px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${channelFilter === ch.id
                                    ? 'bg-brand-dark text-white border-brand-dark shadow-sm'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}">
                                ${ch.label}
                                <span class="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] ${channelFilter === ch.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}">${channelCounts[ch.id]}</span>
                            </button>
                        `).join('')}
                    </div>

                        <!-- Filter Tabs -->
                        <div class="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-100">
                            ${[
                { id: 'all', label: 'Todos', icon: 'ph-list' },
                { id: 'to_ship', label: 'Por Enviar', icon: 'ph-package' },
                { id: 'completed', label: 'Completados', icon: 'ph-check-circle' }
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
                                    id="sales-history-search"
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
                        <div class="space-y-3 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar pb-10">
                            ${filteredSales.map(s => {
                const isShipped = s.status === 'shipped';
                const isPaid = s.status === 'paid' || s.source === 'STORE' || s.paymentMethod !== 'Pending';
                const isDiscogs = s.channel === 'Discogs';
                const isStore = s.source === 'STORE';

                const mainItem = s.items && s.items.length > 0 ? s.items[0] : { album: s.album || 'Venta Manual', artist: s.artist || 'Desconocido' };
                const extraItems = s.items && s.items.length > 1 ? s.items.length - 1 : 0;
                const mainCover = this.resolveItemCover(mainItem);

                return `
                                <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all cursor-pointer group flex items-center gap-4 relative" onclick="app.openUnifiedOrderDetailModal('${s.id}')">
                                    <!-- Tapa real del disco vendido (fallback: icono de canal) -->
                                    ${mainCover
                                        ? `<img src="${mainCover}" class="w-12 h-12 rounded-2xl object-cover shrink-0 border border-slate-100" alt="">`
                                        : `<div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDiscogs ? 'bg-slate-900 text-white' : (isStore ? 'bg-orange-100 text-brand-orange' : 'bg-blue-100 text-blue-600')}">
                                        <i class="ph-bold ${isDiscogs ? 'ph-disc' : (isStore ? 'ph-storefront' : 'ph-globe')} text-xl"></i>
                                    </div>`}

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
                                        <div class="flex items-center gap-2 mt-2 flex-wrap">
                                            ${this.saleChannelBadge(s)}
                                            <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">
                                                ${isPaid ? 'Pagado' : 'Pendiente'}
                                            </span>
                                            ${this.isShippableChannel(s) ? `
                                            <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${isShipped ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-500'}">
                                                ${isShipped ? 'Enviado' : 'Por Enviar'}
                                            </span>` : ''}
                                        </div>
                                    </div>

                                    <!-- Economic Breakdown -->
                                    <div class="text-right shrink-0 border-l border-slate-50 pl-4 py-1">
                                        <p class="font-display font-bold text-brand-dark text-base">${this.formatCurrency(s.total)}</p>
                                        ${s.shipping_cost > 0 ? `<p class="text-[10px] text-slate-400 font-bold">Envío: ${this.formatCurrency(s.shipping_cost)}</p>` : ''}
                                    </div>

                                    <!-- Quick Action -->
                                    <div class="relative ml-2" onclick="event.stopPropagation()">
                                        <button onclick="app.toggleOrderActionMenu('${s.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-50 text-slate-300 hover:text-brand-dark transition-colors flex items-center justify-center">
                                            <i class="ph-bold ph-dots-three-vertical text-xl"></i>
                                        </button>
                                        
                                        <!-- Dropdown (Hidden by default) -->
                                        <div id="action-menu-${s.id}" class="hidden absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 z-[100] p-2 space-y-1">
                                            <button onclick="app.openInvoiceModal('${s.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                <i class="ph ph-file-text text-blue-500"></i> Ver Factura
                                            </button>
                                            <button onclick="app.openInvoiceModal('${s.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                <i class="ph ph-printer text-indigo-500"></i> Imprimir Etiqueta
                                            </button>
                                            ${!isShipped ? `
                                                <button onclick="app.markOrderAsShipped('${s.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                    <i class="ph ph-truck text-emerald-500"></i> Marcar Enviado
                                                </button>
                                            ` : ''}
                                            <div class="h-px bg-slate-100 mx-2 my-1"></div>
                                            <button onclick="app.deleteSale('${s.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors">
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
        `;
        container.innerHTML = html;
        
        // Restore focus to search input if active
        if (this.state.salesHistorySearch) {
            const searchInput = document.getElementById('sales-history-search');
            if (searchInput) {
                searchInput.focus();
                // Cursor at the end
                const val = searchInput.value;
                searchInput.value = '';
                searchInput.value = val;
            }
        }
    },

    // ── POS web: sección propia, separada de Ventas ────────────────────
    renderPOS(container) {
        const html = `
            <div class="max-w-4xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                ${this.sectionHeader({
                    title: 'POS',
                    subtitle: 'Terminal de caja web · ventas de mostrador'
                })}
                ${this.state.cart.length > 0 ? this.renderSalesCartWidget() : this.renderQuickPOS()}
            </div>
        `;
        container.innerHTML = html;
    },

    // Helper to render the cart widget in POS view
    renderSalesCartWidget() {
        return `
            <div class="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 ring-2 ring-emerald-500/10">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-brand-dark flex items-center gap-2">
                        <i class="ph-duotone ph-shopping-cart text-emerald-500 text-xl"></i>
                        Venta en Progreso
                        <span class="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">${this.state.cart.length}</span>
                    </h3>
                    <button onclick="app.clearCart(); app.refreshCurrentView()" class="text-xs text-red-500 font-bold hover:underline">Vaciar Carrito</button>
                </div>
                
                <div class="space-y-3 mb-6 max-h-80 overflow-y-auto custom-scrollbar px-1">
                    ${this.state.cart.map((item, index) => `
                        <div class="flex justify-between items-center ${item.is_rsd_discount ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-50/50 border-slate-100'} p-3 rounded-2xl border group">
                            <div class="truncate pr-4 flex-1">
                                <p class="font-bold text-sm text-brand-dark truncate">${item.album} ${item.is_rsd_discount ? '<span class="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-black ml-1">RSD</span>' : ''}</p>
                                <p class="text-[10px] text-slate-400 truncate uppercase tracking-tighter font-bold">${item.artist}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                ${item.is_rsd_discount
                                    ? `<div class="text-right"><span class="text-[10px] text-slate-400 line-through block">${this.formatCurrency(item.price, false)}</span><span class="font-bold text-sm text-orange-600">${this.formatCurrency(this.getEffectivePrice(item), false)}</span></div>`
                                    : `<span class="font-bold text-sm text-brand-dark">${this.formatCurrency(item.price, false)}</span>`
                                }
                                <button onclick="app.removeFromCart(${index}); app.refreshCurrentView()" class="w-8 h-8 rounded-lg bg-white shadow-sm text-slate-300 hover:text-red-500 border border-slate-100 transition-colors flex items-center justify-center">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="bg-slate-50 rounded-2xl p-4 mb-6 space-y-4">
                    <div class="flex justify-between items-center pb-2 border-b border-white/50">
                        <span class="text-xs font-bold text-slate-400 uppercase">Subtotal</span>
                        <span class="font-bold text-slate-600">${this.formatCurrency(this.state.cart.reduce((s, i) => s + this.getEffectivePrice(i), 0))}</span>
                    </div>

                    <!-- RSD 5% Extra Discount Toggle -->
                    <div class="flex items-center justify-between p-3 rounded-xl border ${this.state.cart.length >= 3 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100 opacity-50'}">
                        <div class="flex items-center gap-2">
                            <span class="text-sm">🎉</span>
                            <div>
                                <span class="text-[10px] font-bold ${this.state.cart.length >= 3 ? 'text-orange-700' : 'text-slate-400'} uppercase tracking-wider">Aplicar 5% extra RSD</span>
                                ${this.state.cart.length < 3 ? '<p class="text-[9px] text-slate-400 mt-0.5">Mínimo 3 items en carrito</p>' : ''}
                            </div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="rsd-extra-toggle" ${this.state.rsdExtraDiscount ? 'checked' : ''} ${this.state.cart.length < 3 ? 'disabled' : ''}
                                onchange="app.state.rsdExtraDiscount = this.checked; app.refreshCurrentView()">
                            <span class="slider"></span>
                        </label>
                    </div>
                    ${this.state.rsdExtraDiscount && this.state.cart.length >= 3 ? `
                    <div class="flex justify-between items-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                        <span class="text-[10px] font-bold text-orange-600 uppercase">5% RSD Descuento</span>
                        <span class="text-xs font-bold text-orange-700">- ${this.formatCurrency(this.state.cart.reduce((s, i) => s + this.getEffectivePrice(i), 0) * 0.05)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-emerald-600 uppercase">Total Final</span>
                        <span class="font-bold text-emerald-700 text-lg">${this.formatCurrency(this.state.cart.reduce((s, i) => s + this.getEffectivePrice(i), 0) * 0.95)}</span>
                    </div>
                    ` : ''}
                    
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
                    Completar Venta (${this.formatCurrency(this.state.cart.reduce((s, i) => s + this.getEffectivePrice(i), 0) * (this.state.rsdExtraDiscount && this.state.cart.length >= 3 ? 0.95 : 1))})
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
        this.refreshCurrentView();
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
                    sku: sku || 'N/A',
                    providerOrigin: record?.provider_origin || 'Local_Used',
                    productCondition: record?.product_condition || this.state.posCondition || 'New'
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
                        <span>1 x ${this.formatCurrency(item.unitPrice, false)}</span>
                        <span class="bold">${this.formatCurrency(item.unitPrice, false)}</span>
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

    // ── Ventas unificadas: canal ─────────────────────────────────────
    // Normaliza el canal de una venta a 'local' | 'online' | 'discogs'
    normalizeSaleChannel(s) {
        const ch = (s.channel || '').toString().toLowerCase().trim();
        if (ch.includes('discogs')) return 'discogs';
        if (ch === 'online' || ch.includes('web') || ch.includes('shop')) return 'online';
        if (ch === 'local' || ch === 'tienda' || ch === 'store' || s.source === 'STORE') return 'local';
        // Heurísticas para registros viejos sin canal explícito
        const ord = (s.orderNumber || '').toString();
        if (/^#?WEB-/i.test(ord)) return 'online';
        if (s.discogs_order_id || s.discogsOrderId) return 'discogs';
        if (s.customer && (s.customer.email || s.shipping_method)) return 'online';
        if (s.source === 'STORE') return 'local';
        return 'local';
    },

    // El local nunca hace envíos: solo WebShop y Discogs pueden estar pendientes de envío.
    // Centraliza la regla para nav, dashboard, Ventas y Envíos.
    isShippableChannel(s) {
        const ch = this.normalizeSaleChannel(s);
        return ch === 'online' || ch === 'discogs';
    },

    // Badge pastel por canal (lenguaje visual de la app)
    saleChannelBadge(s) {
        const ch = this.normalizeSaleChannel(s);
        const map = {
            local:   { label: 'Local',   cls: 'bg-emerald-100 text-emerald-700' },
            online:  { label: 'WebShop', cls: 'bg-blue-100 text-blue-700' },
            discogs: { label: 'Discogs', cls: 'bg-purple-100 text-purple-700' }
        };
        const m = map[ch] || map.local;
        return `<span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${m.cls}">${m.label}</span>`;
    },

    // --- Tapas reales para ítems vendidos ---
    // Resuelve la imagen de tapa de un ítem vendido contra el inventario en memoria
    // (por SKU, luego por título+artista). Null si no hay match → el render usa fallback genérico.
    _normCoverKey(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    },

    _buildCoverCache() {
        const inv = this.state.inventory || [];
        if (this._coverCache && this._coverCacheSrc === inv) return this._coverCache;
        const bySku = {}, byTitle = {};
        for (const p of inv) {
            const cover = p.cover_image || p.image || null;
            if (!cover) continue;
            const sku = String(p.sku || '').trim().toUpperCase();
            if (sku && !bySku[sku]) bySku[sku] = cover;
            const t = this._normCoverKey(p.album || p.title);
            const a = this._normCoverKey(p.artist);
            if (t) {
                const k = t + '|' + a;
                if (!byTitle[k]) byTitle[k] = cover;
                if (!byTitle[t]) byTitle[t] = cover;
            }
        }
        this._coverCache = { bySku, byTitle };
        this._coverCacheSrc = inv;
        return this._coverCache;
    },

    resolveItemCover(item) {
        if (!item) return null;
        const direct = item.image || item.cover_image || (item.record && item.record.cover_image);
        if (direct) return direct;
        const { bySku, byTitle } = this._buildCoverCache();
        const sku = String(item.sku || (item.record && item.record.sku) || '').trim().toUpperCase();
        if (sku && bySku[sku]) return bySku[sku];
        const t = this._normCoverKey(item.album || item.title || (item.record && (item.record.album || item.record.title)));
        const a = this._normCoverKey(item.artist || (item.record && item.record.artist));
        if (t && byTitle[t + '|' + a]) return byTitle[t + '|' + a];
        if (t && byTitle[t]) return byTitle[t];
        return null;
    },

    updateSalesChannelFilter(channel) {
        this.state.salesChannelFilter = channel;
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
                        <p class="font-bold text-sm text-brand-orange">${this.formatCurrency(item.price, false)}</p>
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
        const item = this.state.inventory.find(i => i.id === sku || i.sku === sku);
        if (!item) return;

        this.state.posSelectedItemSku = item.sku;

        // Re-render to update the view with selected item
        this.refreshCurrentView();

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



    // ============================================================
    // Blueprint Sec 12 · FLUJO A: Carga rapida de un nuevo disco
    // Paso a paso: Identificar (Discogs) -> Duplicados -> Esencial ->
    // Canales -> Guardar. Reutiliza la API de Discogs ya integrada
    // (proxy ${BASE_API_URL}/discogs/*) y delega el alta en
    // handleAddVinyl para no duplicar la logica de persistencia.
    // ============================================================
    openQuickAddWizard(presetLot = '', presetOrigin = '') {
        this.state.quickAdd = {
            step: 1,
            search: '',
            searching: false,
            results: [],
            manualMode: false,
            artist: '',
            album: '',
            label: '',
            genre: '',
            condition: 'NM',
            productCondition: 'Second-hand',
            cost: '',
            price: '',
            stock: 1,
            cover: '',
            discogsId: '',
            discogsUrl: '',
            year: '',
            lot: '',
            chPos: true,      // Tienda activa por defecto
            chWeb: true,
            chDiscogs: false,
            dupChecked: false,
            hardDup: null,
            softDups: [],
        };
        if (presetLot) this.state.quickAdd.lot = presetLot;
        if (presetOrigin) this.state.quickAdd.presetOrigin = presetOrigin;
        const overlay = document.createElement('div');
        overlay.id = 'quickadd-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn';
        overlay.innerHTML = `<div id="quickadd-card" class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-100"></div>`;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeQuickAddWizard(); });
        document.body.appendChild(overlay);
        this.renderQuickAddStep();
    },

    closeQuickAddWizard() {
        document.getElementById('quickadd-overlay')?.remove();
        this.state.quickAdd = null;
    },

    quickAddGo(step) {
        const qa = this.state.quickAdd;
        if (!qa) return;
        // Validaciones por paso
        if (step > 1 && qa.step === 1) {
            if (!qa.manualMode && !qa.artist) {
                // Si eligio un resultado de Discogs, artist ya viene cargado
                if (!qa.artist || !qa.album) {
                    this.showToast('Buscá en Discogs o cargá artista y título manualmente.');
                    return;
                }
            }
            if (qa.manualMode && (!qa.artist.trim() || !qa.album.trim())) {
                this.showToast('Completá artista y título para continuar.');
                return;
            }
        }
        if (step > 3 && qa.step === 3) {
            const cost = parseFloat(qa.cost), price = parseFloat(qa.price), stock = parseInt(qa.stock, 10);
            if (isNaN(cost) || cost < 0) { this.showToast('El costo debe ser un número válido.'); return; }
            if (isNaN(price) || price <= 0) { this.showToast('El precio debe ser un número válido mayor a 0.'); return; }
            if (isNaN(stock) || stock < 1) { this.showToast('El stock inicial debe ser al menos 1.'); return; }
        }
        qa.step = step;
        if (step === 2 && !qa.dupChecked) this.quickAddCheckDuplicates();
        this.renderQuickAddStep();
    },

    quickAddSteps() {
        return [
            { n: 1, label: 'Identificar', icon: 'ph-magnifying-glass' },
            { n: 2, label: 'Duplicados', icon: 'ph-copy' },
            { n: 3, label: 'Esencial', icon: 'ph-disc' },
            { n: 4, label: 'Canales', icon: 'ph-storefront' },
            { n: 5, label: 'Confirmar', icon: 'ph-check-circle' },
        ];
    },

    renderQuickAddStep() {
        const qa = this.state.quickAdd;
        const card = document.getElementById('quickadd-card');
        if (!qa || !card) return;
        const steps = this.quickAddSteps();
        let body = '';
        if (qa.step === 1) body = this.quickAddStepIdentify(qa);
        else if (qa.step === 2) body = this.quickAddStepDuplicates(qa);
        else if (qa.step === 3) body = this.quickAddStepEssential(qa);
        else if (qa.step === 4) body = this.quickAddStepChannels(qa);
        else body = this.quickAddStepReview(qa);

        card.innerHTML = `
            <div class="p-6 border-b border-slate-100">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-display text-xl font-bold text-brand-dark flex items-center gap-2">
                        <i class="ph-bold ph-lightning text-brand-orange"></i> Carga rápida
                    </h3>
                    <button onclick="app.closeQuickAddWizard()" class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
                <div class="flex items-center gap-1">
                    ${steps.map(s => `
                        <div class="flex-1 flex items-center gap-2 ${s.n <= qa.step ? '' : 'opacity-40'}">
                            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${s.n < qa.step ? 'bg-emerald-500 text-white' : s.n === qa.step ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-400'}">
                                ${s.n < qa.step ? '<i class="ph-bold ph-check"></i>' : s.n}
                            </div>
                            <span class="text-[10px] font-bold uppercase tracking-wide hidden sm:inline ${s.n === qa.step ? 'text-brand-dark' : 'text-slate-400'}">${s.label}</span>
                            ${s.n < steps.length ? '<div class="flex-1 h-px bg-slate-200 mx-1"></div>' : ''}
                        </div>`).join('')}
                </div>
            </div>
            <div class="p-6 overflow-y-auto flex-1">${body}</div>
            <div class="p-4 border-t border-slate-100 flex justify-between gap-3 bg-slate-50/50">
                ${qa.step > 1
                    ? `<button onclick="app.quickAddGo(${qa.step - 1})" class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-white transition-all flex items-center gap-2"><i class="ph-bold ph-arrow-left"></i> Atrás</button>`
                    : `<button onclick="app.closeQuickAddWizard()" class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-white transition-all">Cancelar</button>`}
                ${qa.step < 5
                    ? `<button onclick="app.quickAddGo(${qa.step + 1})" class="px-6 py-2.5 rounded-xl bg-brand-dark text-white font-bold text-sm shadow-lg hover:scale-[1.02] transition-transform flex items-center gap-2">Continuar <i class="ph-bold ph-arrow-right"></i></button>`
                    : `<button onclick="app.quickAddSave()" class="px-6 py-2.5 rounded-xl bg-brand-orange text-white font-bold text-sm shadow-lg shadow-brand-orange/30 hover:scale-[1.02] transition-transform flex items-center gap-2"><i class="ph-bold ph-check"></i> Guardar disco</button>`}
            </div>`;
    },

    // --- Paso 1: Identificar (Discogs API existente) ---
    quickAddStepIdentify(qa) {
        return `
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Buscar en Discogs <span class="normal-case font-medium text-slate-300">(o pegá el ID numérico del release)</span></label>
            <div class="flex gap-2 mb-3">
                <input id="qa-search" type="text" value="${qa.search.replace(/"/g, '&quot;')}" placeholder="Artista - Título..."
                    onkeypress="if(event.key==='Enter'){event.preventDefault();app.quickAddSearchDiscogs();}"
                    class="flex-1 h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:border-brand-orange outline-none">
                <button onclick="app.quickAddSearchDiscogs()" class="h-11 px-5 rounded-xl bg-brand-dark text-white text-sm font-bold hover:scale-[1.02] transition-transform flex items-center gap-2">
                    <i class="ph-bold ph-magnifying-glass"></i> Buscar
                </button>
            </div>
            <div id="qa-results" class="space-y-2 mb-4 max-h-56 overflow-y-auto">
                ${qa.searching ? '<p class="text-xs text-slate-400 animate-pulse p-2">Buscando en Discogs...</p>' : ''}
                ${!qa.searching && qa.results.length === 0 && qa.search ? '<p class="text-xs text-slate-400 p-2">Sin resultados. Probá con otra búsqueda o cargá manualmente abajo.</p>' : ''}
                ${qa.results.map((r, i) => `
                    <div onclick="app.quickAddSelectRelease(${i})" class="flex items-center gap-3 p-3 bg-white rounded-xl border ${String(qa.discogsId) === String(r.id) ? 'border-brand-orange shadow-md' : 'border-slate-200'} cursor-pointer hover:border-brand-orange hover:shadow-sm transition-all">
                        <img src="${r.thumb || ''}" class="w-12 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0" onerror="this.style.display='none'">
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-xs text-brand-dark leading-tight truncate">${r.title || ''}</p>
                            <p class="text-[10px] text-slate-500">${r.year || '?'} · ${r.country || ''} · ${(r.label && r.label[0]) || ''}</p>
                        </div>
                        ${String(qa.discogsId) === String(r.id) ? '<i class="ph-fill ph-check-circle text-brand-orange text-xl"></i>' : '<i class="ph-bold ph-plus-circle text-slate-300 text-xl"></i>'}
                    </div>`).join('')}
            </div>
            <div class="border-t border-dashed border-slate-200 pt-4">
                <button onclick="app.state.quickAdd.manualMode=!app.state.quickAdd.manualMode;app.renderQuickAddStep()" class="text-xs font-bold text-brand-orange hover:underline flex items-center gap-1">
                    <i class="ph-bold ${qa.manualMode ? 'ph-caret-up' : 'ph-caret-down'}"></i>
                    ${qa.manualMode ? 'Ocultar carga manual' : 'Cargar manualmente sin Discogs'}
                </button>
                ${qa.manualMode ? `
                <div class="grid grid-cols-2 gap-3 mt-3">
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase block mb-1">Artista *</label>
                        <input id="qa-artist" type="text" value="${qa.artist.replace(/"/g, '&quot;')}" oninput="app.state.quickAdd.artist=this.value" class="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm focus:border-brand-orange outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase block mb-1">Título *</label>
                        <input id="qa-album" type="text" value="${qa.album.replace(/"/g, '&quot;')}" oninput="app.state.quickAdd.album=this.value" class="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm focus:border-brand-orange outline-none">
                    </div>
                </div>` : ''}
                ${qa.artist && qa.album && !qa.manualMode ? `
                <div class="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                    ${qa.cover ? `<img src="${qa.cover}" class="w-10 h-10 rounded-lg object-cover">` : ''}
                    <div class="text-xs"><p class="font-bold text-emerald-800">${qa.artist} — ${qa.album}</p><p class="text-emerald-600">Datos completados desde Discogs</p></div>
                </div>` : ''}
            </div>`;
    },

    async quickAddSearchDiscogs() {
        const qa = this.state.quickAdd;
        const input = document.getElementById('qa-search');
        const q = (input?.value || '').trim();
        if (!q) return;
        qa.search = q;
        qa.searching = true;
        qa.results = [];
        this.renderQuickAddStep();
        try {
            let data;
            if (/^\d+$/.test(q)) {
                const res = await fetch(`${BASE_API_URL}/discogs/release/${q}`);
                const full = await res.json();
                const rel = full.release || full;
                data = { results: [{ id: rel.id, title: `${(rel.artists_sort || '')} - ${rel.title || ''}`, year: rel.year, country: rel.country, label: (rel.labels || []).map(l => l.name), thumb: (rel.images && rel.images[0] || {}).thumb || (rel.images && rel.images[0] || {}).uri, _full: rel }] };
            } else {
                const res = await fetch(`${BASE_API_URL}/discogs/search?q=${encodeURIComponent(q)}`);
                data = await res.json();
            }
            qa.results = (data.results || []).slice(0, 10);
        } catch (err) {
            console.error(err);
            this.showToast('Error buscando en Discogs: ' + (err.message || 'desconocido'));
        }
        qa.searching = false;
        this.renderQuickAddStep();
    },

    async quickAddSelectRelease(idx) {
        const qa = this.state.quickAdd;
        const r = qa.results[idx];
        if (!r) return;
        qa.discogsId = r.id;
        qa.dupChecked = false;
        const parts = (r.title || '').split(' - ');
        qa.artist = parts[0] || '';
        qa.album = parts.slice(1).join(' - ') || r.title || '';
        qa.year = r.year || '';
        qa.cover = r.thumb || '';
        qa.label = (r.label && r.label[0]) || '';
        // Detalle completo para sello/genero/portada
        try {
            const res = await fetch(`${BASE_API_URL}/discogs/release/${r.id}`);
            const data = await res.json();
            const full = data.release || data;
            if (full) {
                const labels = (full.labels || []).map(l => l.name).filter(Boolean);
                if (labels.length) qa.label = labels[0];
                const styles = [...new Set(full.styles || [])];
                if (styles.length) qa.genre = styles[0];
                const img = (full.images && full.images[0]) || {};
                if (img.uri || img.thumb) qa.cover = img.uri || img.thumb;
                if (full.uri) qa.discogsUrl = full.uri.startsWith('http') ? full.uri : 'https://www.discogs.com' + full.uri;
                qa._tracks = full.tracklist || [];
            }
        } catch (err) { console.warn('Detalle Discogs no disponible:', err); }
        this.showToast('Datos completados desde Discogs');
        this.renderQuickAddStep();
    },

    // --- Paso 2: Duplicados ---
    quickAddCheckDuplicates() {
        const qa = this.state.quickAdd;
        qa.dupChecked = true;
        const norm = (s) => this.normalizeText(s || '');
        const a = norm(qa.artist), b = norm(qa.album);
        qa.hardDup = null;
        qa.softDups = [];
        (this.state.inventory || []).forEach(item => {
            if (qa.discogsId && String(item.discogs_release_id || item.discogsId || '') === String(qa.discogsId)) {
                qa.hardDup = item;
                return;
            }
            const ia = norm(item.artist), ib = norm(item.album);
            if (a && b && ia === a && ib === b) { qa.hardDup = qa.hardDup || item; return; }
            if ((a && ia && (ia.includes(a) || a.includes(ia))) || (b && ib && (ib.includes(b) || b.includes(ib)))) {
                if (qa.softDups.length < 5) qa.softDups.push(item);
            }
        });
    },

    quickAddStepDuplicates(qa) {
        if (!qa.dupChecked) this.quickAddCheckDuplicates();
        if (qa.hardDup) {
            const d = qa.hardDup;
            return `
                <div class="bg-red-50 border border-red-200 rounded-2xl p-5">
                    <h4 class="font-bold text-red-700 flex items-center gap-2 mb-2"><i class="ph-bold ph-warning-circle text-xl"></i> Posible duplicado</h4>
                    <p class="text-sm text-red-600 mb-4">Ya existe <b>${d.artist} — ${d.album}</b> (${d.sku || 'sin SKU'}, stock: ${d.stock || 0}). El alta está bloqueada hasta que elijas:</p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button onclick="app.quickAddIncreaseStock('${d.id}')" class="p-4 bg-white border border-red-200 rounded-xl hover:border-brand-orange transition-all text-left">
                            <i class="ph-bold ph-plus-circle text-brand-orange text-xl mb-1 block"></i>
                            <p class="text-xs font-bold text-brand-dark">Aumentar stock</p>
                            <p class="text-[10px] text-slate-400">Suma ${qa.stock} ud. al existente</p>
                        </button>
                        <button onclick="app.closeQuickAddWizard();app.openAddVinylModal('${d.id}')" class="p-4 bg-white border border-red-200 rounded-xl hover:border-brand-orange transition-all text-left">
                            <i class="ph-bold ph-pencil-simple text-brand-orange text-xl mb-1 block"></i>
                            <p class="text-xs font-bold text-brand-dark">Editar existente</p>
                            <p class="text-[10px] text-slate-400">Abre la ficha completa</p>
                        </button>
                        <button onclick="app.state.quickAdd.hardDup=null;app.renderQuickAddStep()" class="p-4 bg-white border border-red-200 rounded-xl hover:border-brand-orange transition-all text-left">
                            <i class="ph-bold ph-copy text-brand-orange text-xl mb-1 block"></i>
                            <p class="text-xs font-bold text-brand-dark">Es otra edición</p>
                            <p class="text-[10px] text-slate-400">Continuar con el alta</p>
                        </button>
                    </div>
                </div>`;
        }
        return `
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-4 flex items-center gap-3">
                <i class="ph-fill ph-check-circle text-emerald-500 text-3xl"></i>
                <div><p class="font-bold text-emerald-800 text-sm">Sin duplicados exactos</p><p class="text-xs text-emerald-600">Podés continuar con la carga.</p></div>
            </div>
            ${qa.softDups.length ? `
            <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p class="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1"><i class="ph-bold ph-warning"></i> Coincidencias parciales (revisá antes de guardar):</p>
                ${qa.softDups.map(d => `<p class="text-xs text-amber-700 truncate">· ${d.artist} — ${d.album} <span class="text-amber-400">(${d.sku || ''})</span></p>`).join('')}
            </div>` : ''}`;
    },

    async quickAddIncreaseStock(productId) {
        const qa = this.state.quickAdd;
        const qty = parseInt(qa.stock, 10) || 1;
        try {
            const ref = db.collection('products').doc(productId);
            const snap = await ref.get();
            const cur = (snap.data() || {}).stock || 0;
            await ref.update({ stock: cur + qty, updated_at: firebase.firestore.FieldValue.serverTimestamp() });
            this.showToast(`Stock actualizado: ${cur} → ${cur + qty}`);
            this.closeQuickAddWizard();
            this.loadData();
        } catch (err) {
            console.error(err);
            this.showToast('Error actualizando stock: ' + err.message);
        }
    },

    // --- Paso 3: Esencial ---
    quickAddStepEssential(qa) {
        const field = (label, inner) => `
            <div><label class="text-[10px] font-black text-slate-400 uppercase block mb-1">${label}</label>${inner}</div>`;
        const inputCls = 'w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm focus:border-brand-orange outline-none';
        return `
            <div class="grid grid-cols-2 gap-3">
                ${field('Artista', `<input type="text" value="${qa.artist.replace(/"/g, '&quot;')}" oninput="app.state.quickAdd.artist=this.value" class="${inputCls}">`)}
                ${field('Título', `<input type="text" value="${qa.album.replace(/"/g, '&quot;')}" oninput="app.state.quickAdd.album=this.value" class="${inputCls}">`)}
                ${field('Sello', `<input type="text" value="${qa.label.replace(/"/g, '&quot;')}" oninput="app.state.quickAdd.label=this.value" class="${inputCls}" placeholder="Record label">`)}
                ${field('Género', `<input type="text" value="${qa.genre.replace(/"/g, '&quot;')}" oninput="app.state.quickAdd.genre=this.value" class="${inputCls}" placeholder="Minimal">`)}
                ${field('Condición (vinilo)', `
                    <select onchange="app.state.quickAdd.condition=this.value" class="${inputCls}">
                        ${['M', 'NM', 'VG+', 'VG', 'G'].map(c => `<option value="${c}" ${qa.condition === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>`)}
                ${field('Nuevo / Usado', `
                    <select onchange="app.state.quickAdd.productCondition=this.value" class="${inputCls}">
                        <option value="Second-hand" ${qa.productCondition === 'Second-hand' ? 'selected' : ''}>Usado</option>
                        <option value="New" ${qa.productCondition === 'New' ? 'selected' : ''}>Nuevo</option>
                    </select>`)}
                ${field('Costo (kr)', `<input type="number" min="0" step="0.5" value="${qa.cost}" oninput="app.state.quickAdd.cost=this.value" class="${inputCls}" placeholder="0">`)}
                ${field('Precio (kr)', `<input type="number" min="0" step="0.5" value="${qa.price}" oninput="app.state.quickAdd.price=this.value" class="${inputCls}" placeholder="0">`)}
                ${field('Stock inicial', `<input type="number" min="1" step="1" value="${qa.stock}" oninput="app.state.quickAdd.stock=this.value" class="${inputCls}">`)}
                ${field('Portada', qa.cover
                    ? `<div class="flex items-center gap-2"><img src="${qa.cover}" class="w-10 h-10 rounded-lg object-cover"><span class="text-[10px] text-emerald-600 font-bold">Desde Discogs ✓</span></div>`
                    : `<span class="text-[11px] text-slate-400">Sin imagen (se puede agregar después)</span>`)}
                ${field('Lote <span class="normal-case font-medium text-slate-300">(opcional)</span>', `
                    <input list="qa-lot-list" value="${(qa.lot || '').replace(/"/g, '&quot;')}" oninput="app.state.quickAdd.lot=this.value" class="${inputCls}" placeholder="RUSHOUR-123">
                    <datalist id="qa-lot-list">${this.getRecentLots(20).map(l => `<option value="${l}">`).join('')}</datalist>`)}
            </div>
            <p class="text-[11px] text-slate-400 mt-4 flex items-center gap-1"><i class="ph-bold ph-info"></i> Año, pressing y más detalles quedan en <b>Opciones avanzadas</b> de la ficha completa.</p>`;
    },

    // --- Paso 4: Canales ---
    quickAddStepChannels(qa) {
        const toggle = (key, label, desc, icon, color) => `
            <button onclick="app.state.quickAdd.${key}=!app.state.quickAdd.${key};app.renderQuickAddStep()"
                class="w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${qa[key] ? 'border-brand-orange bg-orange-50/50 shadow-sm' : 'border-slate-200 bg-white'}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center ${qa[key] ? color : 'bg-slate-100 text-slate-300'}"><i class="ph-fill ${icon} text-xl"></i></div>
                    <div class="text-left"><p class="text-sm font-bold text-brand-dark">${label}</p><p class="text-[11px] text-slate-400">${desc}</p></div>
                </div>
                <div class="w-11 h-6 rounded-full p-1 transition-colors ${qa[key] ? 'bg-brand-orange' : 'bg-slate-200'}">
                    <div class="w-4 h-4 bg-white rounded-full shadow transition-transform ${qa[key] ? 'translate-x-5' : ''}"></div>
                </div>
            </button>`;
        return `
            <div class="space-y-3">
                ${toggle('chPos', 'Tienda (POS)', 'Disponible en caja', 'ph-storefront', 'bg-orange-100 text-brand-orange')}
                ${toggle('chWeb', 'WebShop', 'Visible en la tienda online', 'ph-globe', 'bg-blue-100 text-blue-600')}
                ${toggle('chDiscogs', 'Discogs', 'Crea el listing al guardar (requiere datos de Discogs)', 'ph-vinyl-record', 'bg-purple-100 text-purple-600')}
            </div>
            ${qa.chDiscogs && !qa.discogsId ? `
            <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2">
                <i class="ph-bold ph-warning"></i> Para publicar en Discogs necesitás haber elegido un release en el paso 1.
            </div>` : ''}`;
    },

    // --- Paso 5: Revisar y guardar ---
    quickAddStepReview(qa) {
        const row = (k, v) => `<div class="flex justify-between py-1.5 border-b border-slate-50 last:border-0"><span class="text-xs text-slate-400 font-medium">${k}</span><span class="text-xs font-bold text-brand-dark text-right">${v || '—'}</span></div>`;
        return `
            <div class="bg-slate-50 rounded-2xl p-4 mb-4">
                ${row('Disco', `${qa.artist} — ${qa.album}`)}
                ${row('Sello / Género', `${qa.label || '—'} · ${qa.genre || '—'}`)}
                ${row('Condición', `${qa.condition} (${qa.productCondition === 'New' ? 'Nuevo' : 'Usado'})`)}
                ${row('Costo / Precio', `${qa.cost || 0} kr / ${qa.price || 0} kr`)}
                ${row('Stock inicial', qa.stock)}
                ${row('Lote', qa.lot || '—')}
                ${row('Canales', [qa.chPos && 'Tienda', qa.chWeb && 'WebShop', qa.chDiscogs && 'Discogs'].filter(Boolean).join(' · ') || 'Ninguno')}
            </div>
            <p class="text-[11px] text-slate-400">Al guardar se crea el producto con SKU automático, fecha y usuario actual.</p>`;
    },

    async quickAddSave() {
        const qa = this.state.quickAdd;
        if (!qa) return;
        if (qa.chDiscogs && !qa.discogsId) {
            this.showToast('Elegí un release de Discogs en el paso 1 para publicar ahí, o desactivá el canal.');
            return;
        }
        // Construir un form real con los names que espera handleAddVinyl y delegar
        const form = document.createElement('form');
        const set = (name, value) => {
            const i = document.createElement('input');
            i.type = 'hidden'; i.name = name; i.value = value ?? '';
            form.appendChild(i);
        };
        const setCheck = (name, on) => { if (on) set(name, 'on'); };
        set('artist', qa.artist.trim());
        set('album', qa.album.trim());
        set('genre', qa.genre.trim());
        set('label', qa.label.trim());
        set('condition', qa.condition);
        set('product_condition', qa.productCondition);
        set('provider_origin', qa.presetOrigin || (qa.productCondition === 'New' ? 'EU_B2B' : 'Local_Used'));
        set('cost', qa.cost || '0');
        set('price', qa.price || '0');
        set('stock', qa.stock || '1');
        set('year', qa.year || '');
        set('owner', 'El Cuartito');
        set('cover_image', qa.cover || '');
        set('discogsId', qa.discogsId || '');
        set('discogs_release_id', qa.discogsId || '');
        set('discogsUrl', qa.discogsUrl || '');
        set('lot', (qa.lot || '').trim());
        set('tracks', JSON.stringify(qa._tracks || []));
        setCheck('publish_local', qa.chPos);
        setCheck('is_online', qa.chWeb);
        setCheck('publish_discogs', qa.chDiscogs);
        setCheck('tag_new', true); // Nuevo ingreso
        document.body.appendChild(form);
        const overlayId = 'quickadd-overlay';
        try {
            await this.handleAddVinyl({ preventDefault() {}, target: form }, '');
            this.showToast('Producto creado');
        } catch (err) {
            console.error(err);
            this.showToast('Error: ' + (err.message || 'desconocido'));
        } finally {
            form.remove();
            document.getElementById(overlayId)?.remove();
            this.state.quickAdd = null;
        }
    },

    openAddVinylModal(editSku = null) {
        let item = { sku: '', artist: '', album: '', genre: 'Minimal', condition: 'NM', product_condition: 'Second-hand', provider_origin: 'EU_B2B', acquisition_date: '', item_phantom_vat: 0, item_real_vat: 0, price: '', cost: '', stock: 1, owner: 'El Cuartito' };
        let isEdit = false;

        if (editSku) {
            const found = this.state.inventory.find(i => i.id === editSku || i.sku === editSku);
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
    <div id="modal-overlay" class="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <style>
            .dashboard-card { background: white; border: 1px solid #F1F5F9; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            .dashboard-input { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 13px; font-weight: 600; padding: 10px 14px; transition: all 0.2s; }
            .dashboard-input:focus { border-color: #FF6B00; background: white; outline: none; box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.1); }
            
            /* Custom Toggle Switch */
            .switch { position: relative; display: inline-block; width: 34px; height: 20px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #E2E8F0; transition: .4s; border-radius: 34px; }
            .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
            input:checked + .slider { background-color: #FF6B00; }
            input:checked + .slider:before { transform: translateX(14px); }
            
            .meta-chip { background: #F1F5F9; color: #475569; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
            .track-item { font-size: 10px; border-bottom: 1px solid #F8FAFC; padding: 4px 0; color: #64748b; }
            .track-item:last-child { border: none; }
            .profit-tag { background: #ECFDF5; color: #059669; padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; border: 1px solid #D1FAE5; }
        </style>
        
        <div class="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden border border-slate-200/50 animate-in zoom-in-95 duration-300">
            <!-- Header -->
            <div class="px-8 py-5 border-b border-slate-50 flex justify-between items-center shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF6B00]">
                        <i class="ph-fill ph-plus-circle text-lg"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 tracking-tight">${isEdit ? 'Edit Record' : 'Add to Inventory'}</h3>
                </div>
                <button type="button" onclick="document.getElementById('modal-overlay').remove()" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-300 hover:text-slate-900">
                    <i class="ph-bold ph-x"></i>
                </a>
            </div>

            <form id="vinyl-form" onsubmit="app.handleAddVinyl(event, '${isEdit ? item.sku : ''}')" class="flex-1 flex flex-col overflow-hidden">
                <div class="px-8 py-4 space-y-6 overflow-hidden">
                    
                    <!-- Top Grid: Identity + Pricing -->
                    <div class="grid grid-cols-12 gap-5 shrink-0">
                        
                        <!-- Block A: Album Identity -->
                        <div class="col-span-12 lg:col-span-7 dashboard-card p-5 flex gap-5">
                            <div class="relative w-28 h-28 shrink-0 group">
                                <div id="cover-preview" class="absolute inset-0 bg-slate-50 rounded-2xl border-2 border-slate-100 border-dashed flex items-center justify-center overflow-hidden">
                                    <img src="${item.cover_image || ''}" class="${item.cover_image ? '' : 'hidden'} w-full h-full object-cover">
                                    <div id="cover-placeholder" class="${item.cover_image ? 'hidden' : ''}">
                                        <i class="ph-fill ph-vinyl-record text-4xl text-slate-100"></i>
                                    </div>
                                </div>
                                <div id="discogs-results" class="hidden absolute top-full left-0 w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 mt-2 max-h-[300px] overflow-y-auto"></div>
                            </div>
                            
                            <div class="flex-1 space-y-3">
                                <div class="relative group">
                                    <i class="ph-bold ph-magnifying-glass absolute left-3 top-[34px] text-slate-300 group-focus-within:text-[#FF6B00] text-sm"></i>
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Search Discogs</label>
                                    <input type="text" id="discogs-search-input" onkeypress="if(event.key === 'Enter') { event.preventDefault(); app.searchDiscogs(); }" placeholder="Artist, Title, Label..." 
                                           autocomplete="off" spellcheck="false"
                                           class="dashboard-input w-full pl-9 h-10">
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Artist</label>
                                        <input name="artist" value="${item.artist}" required class="dashboard-input w-full h-10">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Album</label>
                                        <input name="album" value="${item.album}" required class="dashboard-input w-full h-10">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Block B: Pricing & Margins -->
                        <div class="col-span-12 lg:col-span-5 dashboard-card p-5 bg-slate-50/30 border-dashed flex flex-col justify-center">
                            <div class="space-y-3 mb-3">
                                <div class="space-y-1">
                                    <label class="text-[9px] font-bold text-slate-400 uppercase block">Buy Cost</label>
                                    <input name="cost" id="modal-cost" type="number" step="0.5" value="${item.cost || 0}" oninput="app.onCostChange()" class="dashboard-input w-full h-10">
                                </div>
                                <div id="multiplier-row" class="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-100">
                                    <i class="ph-bold ph-x text-[10px] text-slate-400"></i>
                                    <input type="number" id="modal-multiplier" step="0.1" min="1" value="${(() => { const c = parseFloat(item.cost) || 0; const p = parseFloat(item.price) || 0; if (c > 0 && p > 0) return (p / c).toFixed(1); return c > 100 ? '2.2' : '2.5'; })()}" oninput="app.applyPriceMultiplier()" class="w-16 text-center font-black text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 focus:border-[#FF6B00] focus:bg-white outline-none transition-all">
                                    <span id="multiplier-label" class="text-[9px] font-bold uppercase tracking-wider ${(() => { const c = parseFloat(item.cost) || 0; return c > 100 ? 'text-amber-600' : 'text-emerald-600'; })()}">${(() => { const c = parseFloat(item.cost) || 0; return c > 100 ? 'Disco caro (+100kr)' : 'Disco barato (≤100kr)'; })()}</span>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-bold text-slate-400 uppercase block">Retail Price</label>
                                    <input name="price" id="modal-price" type="number" step="0.5" value="${item.price || 0}" oninput="app.calculateProfit()" class="dashboard-input w-full h-10 border-[#FF6B00]/40 bg-white">
                                </div>
                            </div>
                            <div class="bg-white rounded-xl px-4 py-2 border border-slate-100 flex items-center justify-between">
                                <p id="profit-percent" class="text-lg font-black text-slate-900 leading-none">0%</p>
                                <span id="profit-label" class="profit-tag">+$0.00</span>
                            </div>

                            <!-- Provider Origin & Phantom VAT -->
                            <div class="mt-3 space-y-2">
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase block">Provider Origin</label>
                                        <select name="provider_origin" id="modal-provider-origin" onchange="app.onProviderOriginChange()" class="dashboard-input w-full h-10 bg-white">
                                            <option value="Local_Used" ${item.provider_origin === 'Local_Used' || !item.provider_origin ? 'selected' : ''}>🏪 Local</option>
                                            <option value="EU_B2B" ${item.provider_origin === 'EU_B2B' ? 'selected' : ''}>🇪🇺 EU B2B (Factura)</option>
                                            <option value="DK_B2B" ${item.provider_origin === 'DK_B2B' ? 'selected' : ''}>🇩🇰 DK B2B (Factura)</option>
                                        </select>
                                    </div>
                                    <div id="acquisition-date-container" class="space-y-1 ${item.provider_origin === 'EU_B2B' || item.provider_origin === 'DK_B2B' ? '' : 'hidden'}">
                                        <label class="text-[9px] font-black text-slate-400 uppercase block">Fecha Factura</label>
                                        <input name="acquisition_date" id="modal-acquisition-date" type="date" value="${item.acquisition_date || new Date().toISOString().split('T')[0]}" class="dashboard-input w-full h-10 bg-white">
                                    </div>
                                </div>
                                <div id="phantom-vat-preview" class="${item.provider_origin === 'EU_B2B' ? '' : 'hidden'} bg-blue-50 rounded-lg px-3 py-2 border border-blue-100 flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <i class="ph-bold ph-receipt text-blue-500 text-sm"></i>
                                        <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">EU Reverse Charge (25%)</span>
                                    </div>
                                    <span id="phantom-vat-amount" class="text-sm font-black text-blue-700">${item.item_phantom_vat ? item.item_phantom_vat.toFixed(2) + ' DKK' : '0.00 DKK'}</span>
                                </div>
                                <div id="real-vat-preview" class="${item.provider_origin === 'DK_B2B' ? '' : 'hidden'} bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100 flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <i class="ph-bold ph-receipt text-emerald-500 text-sm"></i>
                                        <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">IVA Factura DK (25%)</span>
                                    </div>
                                    <span id="real-vat-amount" class="text-sm font-black text-emerald-700">${item.item_real_vat ? item.item_real_vat.toFixed(2) + ' DKK' : '0.00 DKK'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Metadata Area -->
                    <div id="discogs-metadata-area" class="${isEdit ? '' : 'hidden'} dashboard-card overflow-hidden">
                        <div class="bg-slate-50 border-b border-slate-100 flex items-center justify-between px-5 py-2">
                             <h5 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Discogs Info</h5>
                             <a id="discogs-link" href="${item.discogsUrl || '#'}" target="_blank" class="${item.discogsUrl ? '' : 'hidden'} text-[10px] font-bold text-[#FF6B00] hover:underline flex items-center gap-1">
                                <i class="ph-bold ph-disc"></i> View release
                             </a>
                        </div>
                        <div class="px-5 py-3 grid grid-cols-12 gap-4">
                            <div class="col-span-4">
                                <p class="text-[8px] font-bold text-slate-400 uppercase mb-1.5">Genres & Styles</p>
                                <div id="metadata-tags" class="flex flex-wrap gap-1 min-h-[20px]">
                                    ${((item.genre || '') + (item.styles ? ', ' + item.styles : '')).split(',').filter(t => t.trim()).map(t => `<span class="meta-chip border border-slate-200">${t.trim()}</span>`).join('')}
                                </div>
                            </div>
                            <div class="col-span-8 border-l border-slate-100 pl-4">
                                <p class="text-[8px] font-bold text-slate-400 uppercase mb-1.5">Reference Tracklist</p>
                                <div id="metadata-tracks" class="max-h-28 overflow-y-auto pr-2 custom-scrollbar space-y-0.5">
                                    ${item.tracks && item.tracks.length > 0
                ? item.tracks.map(t => `<div class="track-item flex justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
                                            <span class="font-bold w-6 opacity-40 shrink-0 capitalize text-[9px]">${t.position || '•'}</span>
                                            <span class="flex-1 truncate font-medium text-slate-600 text-[10px]">${t.title}</span>
                                            <span class="opacity-40 text-[9px] font-mono shrink-0">${t.duration || ''}</span>
                                        </div>`).join('')
                : '<p class="text-[10px] text-slate-400 italic">Select a Discogs result to load tracks...</p>'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Additional Details & Channels -->
                    <div class="grid grid-cols-12 gap-5 items-start">
                        <!-- Left: Record Details -->
                        <div class="col-span-8 space-y-4">
                            <!-- Núcleo: lo esencial para cargar rápido -->
                            <div class="grid grid-cols-5 gap-3">
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Vinyl Grade</label>
                                    <select name="condition" class="dashboard-input w-full h-10 bg-white">
                                        <option value="M" ${item.condition === 'M' ? 'selected' : ''}>M (Mint)</option>
                                        <option value="NM" ${item.condition === 'NM' || !item.condition ? 'selected' : ''}>NM (Near Mint)</option>
                                        <option value="VG+" ${item.condition === 'VG+' ? 'selected' : ''}>VG+ (Very Good Plus)</option>
                                        <option value="VG" ${item.condition === 'VG' ? 'selected' : ''}>VG (Very Good)</option>
                                        <option value="G" ${item.condition === 'G' ? 'selected' : ''}>G (Good)</option>
                                    </select>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Stock</label>
                                    <input name="stock" type="number" value="${item.stock || 1}" class="dashboard-input w-full h-10 bg-white">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Genre</label>
                                    <input name="genre" id="genre-1" value="${item.genre || ''}" placeholder="e.g. Minimal" class="dashboard-input w-full h-10 bg-white">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Label / Sello</label>
                                    <input name="label" value="${item.label || ''}" placeholder="Record label" class="dashboard-input w-full h-10 bg-white">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Owner</label>
                                    <select name="owner" id="modal-owner" class="dashboard-input w-full h-10 bg-white">
                                        <option value="El Cuartito" ${item.owner === 'El Cuartito' || !item.owner ? 'selected' : ''}>El Cuartito</option>
                                        ${this.state.consignors.map(c => `<option value="${c.name}" data-split="${c.agreementSplit}" ${item.owner === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <!-- Blueprint Sec 06: Opciones avanzadas colapsadas por defecto -->
                            ${(() => {
                                const hasAdvanced = !!(item.sleeveCondition || item.year || item.genre2 || item.genre3 || item.storageLocation || item.comments);
                                return `
                            <button type="button" onclick="app.toggleVinylAdvanced()" class="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-slate-200 text-slate-400 hover:text-brand-orange hover:border-brand-orange transition-all">
                                <span class="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <i class="ph-bold ph-sliders-horizontal"></i> Opciones avanzadas
                                    ${hasAdvanced ? '<span class="text-[9px] bg-orange-100 text-brand-orange px-1.5 py-0.5 rounded-full normal-case tracking-normal">con datos</span>' : ''}
                                </span>
                                <i id="vinyl-advanced-caret" class="ph-bold ${hasAdvanced ? 'ph-caret-up' : 'ph-caret-down'}"></i>
                            </button>
                            <div id="vinyl-advanced-options" class="${hasAdvanced ? '' : 'hidden'} space-y-4 animate-fade-in">
                                <div class="grid grid-cols-3 gap-3">
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase block">Sleeve Grade</label>
                                        <select name="sleeveCondition" class="dashboard-input w-full h-10 bg-white">
                                            <option value="" ${!item.sleeveCondition ? 'selected' : ''}>—</option>
                                            <option value="M" ${item.sleeveCondition === 'M' ? 'selected' : ''}>M (Mint)</option>
                                            <option value="NM" ${item.sleeveCondition === 'NM' ? 'selected' : ''}>NM (Near Mint)</option>
                                            <option value="VG+" ${item.sleeveCondition === 'VG+' ? 'selected' : ''}>VG+ (Very Good Plus)</option>
                                            <option value="VG" ${item.sleeveCondition === 'VG' ? 'selected' : ''}>VG (Very Good)</option>
                                            <option value="G" ${item.sleeveCondition === 'G' ? 'selected' : ''}>G (Good)</option>
                                            <option value="Generic" ${item.sleeveCondition === 'Generic' ? 'selected' : ''}>Generic</option>
                                            <option value="No Cover" ${item.sleeveCondition === 'No Cover' ? 'selected' : ''}>No Cover</option>
                                        </select>
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase block">Year / Pressing</label>
                                        <input name="year" value="${item.year || ''}" placeholder="e.g. 2023" class="dashboard-input w-full h-10 bg-white">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase block">Storage Location</label>
                                        <input name="storageLocation" value="${item.storageLocation || ''}" placeholder="e.g. Shelf A" class="dashboard-input w-full h-10 bg-white">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase block">Lote</label>
                                        <input name="lot" list="vinyl-lot-list" value="${(item.lot || '').replace(/"/g, '&quot;')}" placeholder="RUSHOUR-123" class="dashboard-input w-full h-10 bg-white">
                                        <datalist id="vinyl-lot-list">${this.getRecentLots(20).map(l => `<option value="${l}">`).join('')}</datalist>
                                    </div>
                                </div>
                                <div class="grid grid-cols-3 gap-3">
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase block">Genre 2</label>
                                        <input name="genre2" id="genre-2" value="${item.genre2 || ''}" placeholder="e.g. Techno" class="dashboard-input w-full h-10 bg-white">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase block">Genre 3</label>
                                        <input name="genre3" id="genre-3" value="${item.genre3 || ''}" placeholder="e.g. Deep House" class="dashboard-input w-full h-10 bg-white">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase block">Comments</label>
                                        <input name="comments" value="${item.comments || ''}" placeholder="Optional notes" class="dashboard-input w-full h-10 bg-white">
                                    </div>
                                </div>
                            </div>`;
                            })()}
                        </div>

                        <!-- Right Column: Channels & Shop Visibility -->
                        <div class="col-span-4 space-y-4">
                            
                            <!-- Channels (Compact Toggles) -->
                            <div class="dashboard-card p-4 space-y-3 bg-slate-50 border-dashed">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <i class="ph-fill ph-vinyl-record text-slate-900 text-xs"></i>
                                        <span class="text-[10px] font-bold text-slate-700">Discogs</span>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" name="publish_discogs" ${item.publish_discogs || item.discogs_listing_id ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <i class="ph-fill ph-storefront text-[#FF6B00] text-xs"></i>
                                        <span class="text-[10px] font-bold text-slate-700">Online Web</span>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" name="is_online" ${item.is_online !== false ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <i class="ph-fill ph-storefront text-[#10B981] text-xs"></i>
                                        <span class="text-[10px] font-bold text-slate-700">In-Store POS</span>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" name="publish_local" ${item.publish_local !== false ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            </div>

                            <!-- Shop Visibility (Tags) -->
                            <div class="dashboard-card p-4 bg-orange-50/30 border-orange-100">
                                <h5 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Shop Visibility</h5>
                                <div class="space-y-3">
                                    
                                    <!-- Hero Toggle -->
                                    <label class="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white rounded-lg transition-colors">
                                        <div class="relative flex items-center">
                                            <input type="checkbox" name="tag_hero" value="hero" ${item.tags && item.tags.includes('hero') ? 'checked' : ''} class="peer h-4 w-4 text-[#FF6B00] border-slate-300 rounded focus:ring-[#FF6B00]">
                                        </div>
                                        <span class="text-xs font-bold text-slate-700 group-hover:text-[#FF6B00] transition-colors">Hero / Destacado</span>
                                    </label>

                                    <!-- New Arrival Toggle -->
                                    <label class="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white rounded-lg transition-colors">
                                        <div class="relative flex items-center">
                                            <input type="checkbox" name="tag_new" value="new_arrival" ${item.tags && item.tags.includes('new_arrival') ? 'checked' : ''} class="peer h-4 w-4 text-[#FF6B00] border-slate-300 rounded focus:ring-[#FF6B00]">
                                        </div>
                                        <span class="text-xs font-bold text-slate-700 group-hover:text-[#FF6B00] transition-colors">💥 New Arrival / Novedad</span>
                                    </label>

                                    <!-- RSD Discount Toggle -->
                                    <label class="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white rounded-lg transition-colors">
                                        <div class="relative flex items-center">
                                            <input type="checkbox" name="is_rsd_discount" ${item.is_rsd_discount ? 'checked' : ''} class="peer h-4 w-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500">
                                        </div>
                                        <span class="text-xs font-bold text-slate-700 group-hover:text-orange-500 transition-colors">🎉 10% Descuento RSD</span>
                                    </label>

                                    <div class="h-px bg-slate-100 my-2"></div>
                                    <p class="text-[8px] font-bold text-slate-400 uppercase mb-2">Collection / Agrupación</p>

                                    <div class="relative">
                                        <input name="collection_tag" list="collections-list" 
                                            value="${(item.tags || []).find(t => t !== 'hero' && t !== 'new_arrival') || ''}" 
                                            placeholder="Escribe para crear o buscar..." 
                                            class="dashboard-input w-full h-10 bg-white border-orange-200 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] text-xs">
                                        <datalist id="collections-list">
                                            ${[...new Set(this.state.inventory.flatMap(i => i.tags || []).filter(t => t !== 'hero' && t !== 'new_arrival'))].map(tag => `<option value="${tag}">`).join('')}
                                        </datalist>
                                        <i class="ph-bold ph-magnifying-glass absolute right-3 top-3 text-slate-400 pointer-events-none text-xs"></i>
                                    </div>
                                    <p class="text-[9px] text-slate-400 mt-1 italic">Si escribes un nombre nuevo, se creará una nueva colección.</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <!-- Hidden Fields -->
                <input type="hidden" name="cover_image" id="input-cover-image" value="${item.cover_image || ''}">
                <input type="hidden" name="discogs_release_id" id="input-discogs-release-id" value="${item.discogs_release_id || ''}">
                <input type="hidden" name="discogsUrl" id="input-discogs-url" value="${item.discogsUrl || ''}">
                <input type="hidden" name="discogsId" id="input-discogs-id" value="${item.discogsId || ''}">
                <input type="hidden" name="sku" value="${item.sku}">
                <!-- New Hidden Input for Tracks (JSON) -->
                <input type="hidden" name="tracks" id="input-tracks" value='${item.tracks ? JSON.stringify(item.tracks).replace(/'/g, "&#39;") : ""}'>
                <!-- label is now a visible field above -->

                <!-- Footer Actions -->
                <div class="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU: <span class="text-slate-900">${item.sku}</span></p>
                    <div class="flex gap-4">
                        <button type="button" onclick="document.getElementById('modal-overlay').remove()" class="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">Cancel</a>
                        <button type="submit" class="bg-[#FF6B00] text-white px-10 py-3 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
                            <i class="ph-bold ph-plus"></i>
                            ${isEdit ? 'Update Inventory' : 'Add to Inventory'}
                        </a>
                    </div>
                </div>
            </form>
        </div>
    </div>
                `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // --- Product Detail View (Ficha) ---
    openProductModal(sku) {
        console.log('Attempting to open modal for:', sku);
        try {
            const item = this.state.inventory.find(i => i.id === sku || i.sku === sku);
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
                                    <p class="text-3xl font-bold text-brand-dark">${this.formatCurrency(item.price, false)}</p>
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
                                    <span class="text-sm text-slate-500 font-medium">Fecha de Carga</span>
                                    <span class="text-sm font-bold text-brand-dark">${item.created_at ? new Date(item.created_at.seconds ? item.created_at.seconds * 1000 : item.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Desconocida'}</span>
                                </div>
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
                                ${item.lot ? `
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Lote</span>
                                    <button onclick="document.getElementById('modal-overlay').remove(); app.gotoInventoryLot('${item.lot}')" class="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-all" title="Ver discos de este lote">
                                        <i class="ph-bold ph-package"></i>${item.lot}
                                    </button>
                                </div>` : ''}
                                ${item.provider_origin ? `
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Origen Proveedor</span>
                                    <span class="text-sm font-bold ${item.provider_origin === 'EU_B2B' ? 'text-blue-600' : item.provider_origin === 'DK_B2B' ? 'text-emerald-600' : 'text-brand-dark'}">${item.provider_origin === 'EU_B2B' ? '🇪🇺 EU B2B' : item.provider_origin === 'DK_B2B' ? '🇩🇰 DK B2B' : '🏪 Local'}</span>
                                </div>` : ''}
                                ${item.item_phantom_vat ? `
                                <div class="flex justify-between items-center py-2 border-b border-slate-50 bg-blue-50/50 -mx-5 px-5 rounded">
                                    <span class="text-sm text-blue-600 font-medium">EU Reverse Charge (25%)</span>
                                    <span class="text-sm font-bold text-blue-700">${item.item_phantom_vat.toFixed(2)} DKK</span>
                                </div>` : ''}
                                ${item.item_real_vat ? `
                                <div class="flex justify-between items-center py-2 border-b border-slate-50 bg-emerald-50/50 -mx-5 px-5 rounded">
                                    <span class="text-sm text-emerald-600 font-medium">IVA Factura DK (25%)</span>
                                    <span class="text-sm font-bold text-emerald-700">${item.item_real_vat.toFixed(2)} DKK</span>
                                </div>` : ''}
                                ${item.acquisition_date ? `
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Fecha Factura (SKAT)</span>
                                    <span class="text-sm font-bold text-brand-dark">${new Date(item.acquisition_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>` : ''}
                            </div>

                            <div class="pt-4 flex flex-wrap gap-3">
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openAddVinylModal('${item.id}')" class="flex-1 min-w-[120px] bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/20 text-sm">
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
                                <button onclick="app.addToCart('${item.id}'); document.getElementById('modal-overlay').remove()" class="flex-1 min-w-[120px] bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 text-sm">
                                    <i class="ph-bold ph-shopping-cart"></i>
                                    Vender
                                </button>
                                <button onclick="app.deleteVinyl('${item.id}'); document.getElementById('modal-overlay').remove()" class="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm" title="Eliminar Disco">
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

    calculateMargin() {
        const costInput = document.getElementById('modal-cost');
        const priceInput = document.getElementById('modal-price');
        const profitPercent = document.getElementById('profit-percent');
        const profitLabel = document.getElementById('profit-label');

        if (!costInput || !priceInput || !profitPercent || !profitLabel) return;

        const cost = parseFloat(costInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;

        if (price > 0) {
            const profit = price - cost;
            const margin = (profit / price) * 100;
            profitPercent.innerText = `${Math.round(margin)}%`;
            profitLabel.innerText = `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`;

            if (profit >= 0) {
                profitLabel.className = 'profit-tag';
            } else {
                profitLabel.className = 'profit-tag bg-red-50 text-red-600 border-red-100';
            }
        } else {
            profitPercent.innerText = '0%';
            profitLabel.innerText = '+$0.00';
            profitLabel.className = 'profit-tag';
        }
    },

    calculateProfit() {
        this.calculateMargin();
    },

    // Smart multiplier: auto-set multiplier based on cost and recalculate price
    onCostChange() {
        const costInput = document.getElementById('modal-cost');
        const multiplierInput = document.getElementById('modal-multiplier');
        const multiplierLabel = document.getElementById('multiplier-label');
        if (!costInput || !multiplierInput) return;

        const cost = parseFloat(costInput.value) || 0;

        // Only auto-set the multiplier if the user is not actively editing it
        if (document.activeElement !== multiplierInput) {
            if (cost > 100) {
                multiplierInput.value = '2.2';
                if (multiplierLabel) {
                    multiplierLabel.textContent = 'Disco caro (+100kr)';
                    multiplierLabel.className = 'text-[9px] font-bold uppercase tracking-wider text-amber-600';
                }
            } else {
                multiplierInput.value = '2.5';
                if (multiplierLabel) {
                    multiplierLabel.textContent = 'Disco barato (≤100kr)';
                    multiplierLabel.className = 'text-[9px] font-bold uppercase tracking-wider text-emerald-600';
                }
            }
        }

        this.applyPriceMultiplier();
        this.updatePhantomVatPreview();
    },

    // Recalculate retail price from cost × multiplier
    applyPriceMultiplier() {
        const costInput = document.getElementById('modal-cost');
        const multiplierInput = document.getElementById('modal-multiplier');
        const priceInput = document.getElementById('modal-price');
        if (!costInput || !multiplierInput || !priceInput) return;

        const cost = parseFloat(costInput.value) || 0;
        const multiplier = parseFloat(multiplierInput.value) || 1;

        if (cost > 0) {
            // Round to nearest 5 for clean pricing
            const raw = cost * multiplier;
            const rounded = Math.round(raw / 5) * 5;
            priceInput.value = rounded;
        }

        this.calculateMargin();
    },

    // Micro-IVA: Toggle fields based on provider origin
    onProviderOriginChange() {
        const origin = document.getElementById('modal-provider-origin')?.value;
        const dateContainer = document.getElementById('acquisition-date-container');
        const phantomPreview = document.getElementById('phantom-vat-preview');
        const realVatPreview = document.getElementById('real-vat-preview');
        if (origin === 'EU_B2B') {
            dateContainer?.classList.remove('hidden');
            phantomPreview?.classList.remove('hidden');
            realVatPreview?.classList.add('hidden');
            this.updatePhantomVatPreview();
        } else if (origin === 'DK_B2B') {
            dateContainer?.classList.remove('hidden');
            phantomPreview?.classList.add('hidden');
            realVatPreview?.classList.remove('hidden');
            this.updatePhantomVatPreview();
        } else {
            dateContainer?.classList.add('hidden');
            phantomPreview?.classList.add('hidden');
            realVatPreview?.classList.add('hidden');
        }
    },

    // Micro-IVA: Calculate and display VAT preview in real-time
    updatePhantomVatPreview() {
        const cost = parseFloat(document.getElementById('modal-cost')?.value) || 0;
        const origin = document.getElementById('modal-provider-origin')?.value;
        const vat25 = Math.round((cost * 0.25) * 100) / 100;

        if (origin === 'EU_B2B') {
            const phantomEl = document.getElementById('phantom-vat-amount');
            if (phantomEl) phantomEl.textContent = vat25.toFixed(2) + ' DKK';
        } else if (origin === 'DK_B2B') {
            const realEl = document.getElementById('real-vat-amount');
            if (realEl) realEl.textContent = vat25.toFixed(2) + ' DKK';
        }
    },

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
                        <p class="text-[10px] text-slate-500">${this.formatCurrency(item.price, false)}</p>
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
                            </a>
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
                                </a>
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
                                                                </a>
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

        const item = this.state.inventory.find(i => i.id === sku || i.sku === sku);
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
                            ${this.saleChannelBadge(sale)}
                            <span class="px-2 py-0.5 rounded-full ${getStatusTheme(sale.status).color} text-[9px] font-bold uppercase">${getStatusTheme(sale.status).label}</span>
                        </div>
                        <h2 class="font-display text-2xl font-bold text-brand-dark">Detalle de Venta</h2>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="window.print()" class="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                            <i class="ph-bold ph-printer text-xl"></i>
                        </a>
                        <button onclick="document.getElementById('unified-modal').remove()" class="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                            <i class="ph-bold ph-x text-xl"></i>
                        </a>
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
                                                            <img src="${this.resolveItemCover(item) || 'https://elcuartito.dk/default-vinyl.png'}" class="w-10 h-10 rounded-lg object-cover shadow-sm">
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
                                    <button onclick="app.toggleCustomerEdit('${sale.id}')" title="Editar datos del cliente"
                                        class="ml-auto w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-brand-orange hover:border-brand-orange flex items-center justify-center transition-colors">
                                        <i class="ph-bold ph-pencil-simple"></i>
                                    </button>
                                </h4>
                                <div id="ci-view">${this.renderCustomerInfoView(sale)}</div>
                                <div id="ci-form" class="hidden">${this.renderCustomerInfoForm(sale)}</div>
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
                                        </a>
                                        <button onclick="app.setReadyForPickup('${sale.id}', event)" class="w-full px-4 py-2.5 rounded-xl border ${sale.fulfillment_status === 'ready_for_pickup' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} text-xs font-bold transition-all flex items-center gap-2">
                                            <i class="ph ph-storefront"></i> Listo para Retiro
                                        </a>
                                        <button onclick="app.updateFulfillmentStatus(event, '${sale.id}', 'shipped')" class="w-full px-4 py-2.5 rounded-xl border ${sale.fulfillment_status === 'shipped' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} text-xs font-bold transition-all flex items-center gap-2">
                                            <i class="ph ph-paper-plane-tilt"></i> Enviado / Despachado
                                        </a>
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
                    </a>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // --- Datos del cliente (ficha de envío): vista + edición inline ---
    renderCustomerInfoView(sale) {
        const ci = this.getCustomerInfo(sale);
        return `
            <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre</p>
                    <p class="font-bold text-brand-dark">${ci.name}</p>
                </div>
                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Email</p>
                    <p class="text-sm font-medium text-slate-600 truncate">${ci.email || '-'}</p>
                </div>
                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Teléfono</p>
                    <p class="text-sm font-medium text-slate-600">${ci.phone || '-'}</p>
                </div>
                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección</p>
                    <p class="text-xs font-medium text-slate-600 leading-relaxed">${ci.address || 'Sin dirección registrada'}</p>
                    ${ci.hasAddress ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ci.address)}" target="_blank" class="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-1">
                        <i class="ph ph-map-pin"></i> Ver en Maps
                    </a>` : ''}
                </div>
            </div>`;
    },

    renderCustomerInfoForm(sale) {
        const escA = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const customer = sale.customer || {};
        const ship = customer.shipping || {};
        const name = sale.customerName || customer.name || '';
        const email = sale.customerEmail || customer.email || '';
        const phone = customer.phone || sale.customerPhone || sale.phone || '';
        const field = (id, label, value, type = 'text', placeholder = '') => `
            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">${label}</label>
                <input id="${id}" type="${type}" value="${escA(value)}" placeholder="${placeholder}"
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none text-sm font-medium text-brand-dark">
            </div>`;
        return `
            <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                ${field('ci-name', 'Nombre', name, 'text', 'Nombre del cliente')}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${field('ci-email', 'Email', email, 'email', 'cliente@mail.com')}
                    ${field('ci-phone', 'Teléfono', phone, 'tel', '+45 ...')}
                </div>
                ${field('ci-addr1', 'Dirección (línea 1)', ship.line1 || '', 'text', 'Calle y número')}
                ${field('ci-addr2', 'Dirección (línea 2)', ship.line2 || '', 'text', 'Piso, puerta (opcional)')}
                <div class="grid grid-cols-2 gap-3">
                    ${field('ci-city', 'Ciudad', ship.city || '', 'text', 'Copenhague')}
                    ${field('ci-zip', 'Código postal', ship.postal_code || ship.zip || '', 'text', '1050')}
                </div>
                ${field('ci-country', 'País', ship.country || '', 'text', 'Dinamarca')}
                <div class="flex gap-2 pt-1">
                    <button onclick="app.saveCustomerInfo('${sale.id}')"
                        class="flex-1 py-2.5 bg-brand-dark text-white text-xs font-bold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2">
                        <i class="ph-bold ph-check"></i> Guardar datos
                    </button>
                    <button onclick="app.toggleCustomerEdit('${sale.id}')"
                        class="px-4 py-2.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors">
                        Cancelar
                    </button>
                </div>
            </div>`;
    },

    toggleCustomerEdit(saleId) {
        const v = document.getElementById('ci-view');
        const f = document.getElementById('ci-form');
        if (!v || !f) return;
        v.classList.toggle('hidden');
        f.classList.toggle('hidden');
    },

    async saveCustomerInfo(saleId) {
        const sale = this.state.sales.find(s => s.id === saleId);
        if (!sale) return;
        const val = (id) => (document.getElementById(id)?.value || '').trim();
        const name = val('ci-name');
        const email = val('ci-email');
        const phone = val('ci-phone');
        const line1 = val('ci-addr1'), line2 = val('ci-addr2'), city = val('ci-city');
        const zip = val('ci-zip'), country = val('ci-country');

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showToast('⚠️ El email no tiene un formato válido');
            return;
        }

        // Paths canónicos que lee getCustomerInfo (sirven para WebShop y Discogs)
        const updates = {
            'customer.name': name,
            'customer.email': email,
            'customer.phone': phone,
            'customer.shipping.line1': line1,
            'customer.shipping.line2': line2,
            'customer.shipping.city': city,
            'customer.shipping.postal_code': zip,
            'customer.shipping.country': country,
        };
        // Sincronizar campos planos legacy si el registro los usa
        if (sale.customerName !== undefined) updates['customerName'] = name;
        if (sale.customerEmail !== undefined) updates['customerEmail'] = email;
        if (sale.customerPhone !== undefined) updates['customerPhone'] = phone;
        if (sale.phone !== undefined) updates['phone'] = phone;
        // Sincronizar dirección en formato string si el registro no usaba customer.shipping
        const hadStructured = !!(sale.customer && sale.customer.shipping);
        const composed = [[line1, line2].filter(Boolean).join(' '), [zip, city].filter(Boolean).join(' '), country].filter(Boolean).join(', ');
        if (!hadStructured) {
            if (sale.address !== undefined) updates['address'] = composed;
            else if (sale.customer && sale.customer.address !== undefined) updates['customer.address'] = composed;
        }

        try {
            await db.collection('sales').doc(saleId).update(updates);
            // Merge en memoria
            sale.customer = sale.customer || {};
            sale.customer.name = name;
            sale.customer.email = email;
            sale.customer.phone = phone;
            sale.customer.shipping = { line1, line2, city, postal_code: zip, country };
            if (sale.customerName !== undefined) sale.customerName = name;
            if (sale.customerEmail !== undefined) sale.customerEmail = email;
            if (sale.customerPhone !== undefined) sale.customerPhone = phone;
            if (sale.phone !== undefined) sale.phone = phone;
            if (!hadStructured) {
                if (sale.address !== undefined) sale.address = composed;
                else if (sale.customer.address !== undefined) sale.customer.address = composed;
            }
            // Refrescar la vista de fondo (kanban) sin recargar la página
            this.refreshCurrentView();
            // Refrescar la ficha del modal
            const v = document.getElementById('ci-view');
            const f = document.getElementById('ci-form');
            if (v) { v.innerHTML = this.renderCustomerInfoView(sale); v.classList.remove('hidden'); }
            if (f) { f.innerHTML = this.renderCustomerInfoForm(sale); f.classList.add('hidden'); }
            this.showToast('✅ Datos del cliente actualizados');
        } catch (e) {
            console.error('saveCustomerInfo:', e);
            this.showToast('⚠️ Error al guardar: ' + e.message);
        }
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
                            </a>
                            <button onclick="document.getElementById('invoice-modal').remove()" class="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-300 transition-colors text-sm">
                                Close
                            </a>
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

    async openPrintLabelModal(sku) {
        // Find item in state first for immediate feedback
        const stateItem = this.state.inventory.find(i => i.id === sku || i.sku === sku);
        if (!stateItem) return;

        // Fetch fresh document from Firestore to get all fields (incl. year) reliably
        let item = { ...stateItem };
        try {
            // Use document ID directly instead of querying by SKU field
            const docSnap = await db.collection('products').doc(stateItem.id).get();
            if (docSnap.exists) {
                // Merge raw Firestore data so no field is lost
                item = { ...stateItem, ...docSnap.data() };
            }
        } catch (e) {
            console.warn('[printLabel] Could not fetch fresh product data, using state copy', e);
        }

        // Defensive year display: convert to string, treat 0 as missing
        const displayYear = item.year && Number(item.year) !== 0 ? String(item.year) : '—';

        const rawPrice = item.price ? Number(item.price).toLocaleString('da-DK') : '—';

        const modalHtml = `
<div id="print-label-modal" data-sku="${item.sku}" data-orientation="landscape" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl w-full max-w-[92vw] shadow-2xl border border-orange-100 overflow-hidden max-h-[95vh] flex flex-col relative">

        <!-- Modal header -->
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
                <h2 class="text-2xl font-display font-bold text-brand-dark">Imprimir Etiqueta</h2>
                <p class="text-slate-500 text-sm">Configura e imprime la etiqueta para ${item.album}</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold font-mono">${item.sku}</span>
                <button onclick="app.closePrintLabelModal()" class="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
        </div>

        <!-- Modal body -->
        <div class="p-5 flex-1 overflow-hidden">
            <div class="grid gap-5" style="grid-template-columns: 1fr 1fr auto; height:100%;">
                <!-- ── Column A: Disc info card + text fields ── -->
                <div class="space-y-4 overflow-y-auto pr-1">
                    <!-- Disc info card -->
                    <div class="bg-slate-50 rounded-xl p-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0 shadow-sm">
                                ${item.cover_image ? `<img src="${item.cover_image}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-slate-400"><i class="ph-fill ph-disc text-2xl"></i></div>`}
                            </div>
                            <div class="min-w-0">
                                <div class="font-bold text-brand-dark text-sm truncate">${item.album}</div>
                                <div class="text-xs text-slate-500">${item.artist}</div>
                                <div class="flex gap-2 mt-1">
                                    <span class="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">${item.label || 'Sin sello'}</span>
                                    <span class="text-[10px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded border border-orange-100">${this.formatCurrency(item.price, false)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ── Editable label fields ── -->
                    <div class="space-y-2.5">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><i class="ph ph-pencil-simple"></i> Datos de la etiqueta <span class="font-normal normal-case">(solo impresión)</span></p>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-title">Título</label>
                            <input id="label-edit-title" type="text" value="${item.album || ''}" 
                                class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm font-bold"
                                oninput="document.getElementById('preview-title').innerText = this.value || '—'">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-artist">Artista</label>
                            <input id="label-edit-artist" type="text" value="${item.artist || ''}" 
                                class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm"
                                oninput="document.getElementById('preview-artist').innerText = this.value || '—'">
                        </div>
                        <div class="flex gap-2">
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-genre1">Género 1</label>
                                <input id="label-edit-genre1" type="text" value="${item.genre || ''}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm"
                                    placeholder="Ej: Electronic"
                                    oninput="(function(v){ var el=document.getElementById('preview-genre-bar'); if(el){ var g2=document.getElementById('label-edit-genre2'); el.innerText=((v||'VINYL')+(g2&&g2.value?' / '+g2.value:'')).toUpperCase();} })(this.value)">
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-genre2">Género 2</label>
                                <input id="label-edit-genre2" type="text" value="${item.genre2 || ''}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm"
                                    placeholder="Ej: Techno"
                                    oninput="(function(v){ var el=document.getElementById('preview-genre-bar'); if(el){ var g1=document.getElementById('label-edit-genre1'); el.innerText=((g1&&g1.value?g1.value:'VINYL')+(v?' / '+v:'')).toUpperCase();} })(this.value)">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ── Column B: Numeric fields + orientation + actions ── -->
                <div class="space-y-3 overflow-y-auto pr-1">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><i class="ph ph-sliders"></i> Opciones</p>
                    <div class="space-y-2.5">
                        <div class="flex gap-2">
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-year">Año</label>
                                <input id="label-edit-year" type="text" value="${displayYear !== '—' ? displayYear : ''}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm font-mono"
                                    placeholder="—"
                                    oninput="(function(v){ var el = document.getElementById('preview-meta-year'); if(el) el.innerText = v || '—'; })(this.value)">
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-price">Precio (DKK)</label>
                                <input id="label-edit-price" type="number" value="${item.price || ''}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm font-mono"
                                    placeholder="—"
                                    oninput="(function(v){ var el = document.getElementById('preview-price'); if(el) el.innerText = v ? Number(v).toLocaleString('da-DK') : '—'; })(this.value)">
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-cond">Condición</label>
                                <input id="label-edit-cond" type="text" value="${item.condition || ''}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm font-mono"
                                    placeholder="Ej: VG+"
                                    oninput="(function(v){ var el = document.getElementById('preview-meta-cond'); if(el) el.innerText = v || '—'; })(this.value)">
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-loc">Ubicación</label>
                                <input id="label-edit-loc" type="text" value="${item.storageLocation || ''}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm font-mono"
                                    placeholder="Ej: A1"
                                    oninput="(function(v){ var el = document.getElementById('preview-meta-loc'); if(el) el.innerText = v || '—'; })(this.value)">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nota / Descripción</label>
                            <textarea id="label-comment" rows="5"
                                class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all resize-none text-sm"
                                placeholder="Ej: Original pressing..."
                                oninput="document.getElementById('preview-comment').innerText = this.value"></textarea>
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Orientación</label>
                        <div class="flex bg-slate-100 rounded-xl p-1 gap-1">
                            <button id="orient-h" onclick="app.setLabelOrientation('landscape')"
                                class="flex-1 py-1.5 bg-white text-brand-dark font-bold rounded-lg text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all">
                                Horiz. <span class="font-mono text-[9px] text-slate-400">62×40</span>
                            </button>
                            <button id="orient-v" onclick="app.setLabelOrientation('portrait')"
                                class="flex-1 py-1.5 text-slate-500 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all">
                                Vert. <span class="font-mono text-[9px] text-slate-400">40×62</span>
                            </button>
                        </div>
                    </div>

                    <div class="bg-blue-50 p-3 rounded-xl flex gap-2 text-blue-700 text-xs">
                        <i class="ph-fill ph-info text-base shrink-0"></i>
                        <p>Brother QL 62mm. Horiz: 62×40mm · Vert: 40×62mm.</p>
                    </div>

                    <div class="flex gap-2 pt-1">
                        <button onclick="app.closePrintLabelModal()" class="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm">
                            <i class="ph-bold ph-x"></i> Cancelar
                        </button>
                        <button onclick="app.confirmPrintLabel()" class="flex-1 py-2.5 bg-brand-dark text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-sm">
                            <i class="ph-bold ph-printer"></i> Imprimir
                        </button>
                    </div>
                </div>

                <!-- ── Column C: Preview ── -->
                <div class="flex flex-col items-center justify-center bg-[#ede8e3] rounded-xl px-6 py-5 border border-dashed border-gray-300">
                    <span class="text-xs font-bold text-slate-400 uppercase mb-3">Vista Previa</span>

                    <!-- LABEL: scale up 1.5x for screen preview, prints at true 62×40mm -->
                    <div class="vinyl-label-scaler" style="transform-origin: top left; transform: scale(1.5); margin-bottom: calc(40mm * 0.5); margin-right: calc(62mm * 0.5);">
                        <div id="printable-label" class="label-b">
                            <!-- Top black bar -->
                            <div class="label-b__bar">
                                <span class="label-b__genre" id="preview-genre-bar">${((item.genre || 'VINYL') + (item.genre2 ? ' / ' + item.genre2 : '')).toUpperCase()}</span>
                                <div class="label-b__logo-wrap"><img class="label-b__logo" src="logo-broadsheet.png" alt="El Cuartito"></div>
                            </div>
                            <!-- Body -->
                            <div class="label-b__body">
                                <!-- Left column -->
                                <div class="label-b__left">
                                    <div>
                                        <div class="label-b__title" id="preview-title">${item.album}</div>
                                        <div class="label-b__artist" id="preview-artist">${item.artist}</div>
                                        ${item.label ? `<div class="label-b__sello-row"><span class="label-b__sello-key">Label</span><span class="label-b__sello-val">${item.label}</span></div>` : ''}
                                    </div>
                                    <div class="label-b__comment-wrap">
                                        <div class="label-b__comment" id="preview-comment"></div>
                                    </div>
                                    <div>
                                        <div class="label-b__hairline"></div>
                                        <div class="label-b__meta">
                                            <span class="label-b__meta-item label-b__meta-item--left"><span class="label-b__meta-key">Loc </span><span class="label-b__meta-mono" id="preview-meta-loc">${item.storageLocation || '—'}</span></span>
                                            <span class="label-b__meta-item label-b__meta-item--center"><span class="label-b__meta-key">Cond </span><span class="label-b__meta-mono" id="preview-meta-cond">${item.condition || '—'}</span></span>
                                            <span class="label-b__meta-item label-b__meta-item--right"><span class="label-b__meta-key">Year </span><span class="label-b__meta-mono" id="preview-meta-year">${displayYear}</span></span>
                                        </div>
                                    </div>
                                </div>
                                <!-- Right column -->
                                <div class="label-b__right">
                                    <div class="label-b__qr-wrap">
                                        <div class="label-b__qr" id="qr-container"></div>
                                        <div class="label-b__sku">${item.sku}</div>
                                    </div>
                                    <div class="label-b__price-box">
                                        <div class="label-b__price" id="preview-price">${rawPrice}</div>
                                        <div class="label-b__currency">DKK</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <style>
        @media print {
            @page { size: 62mm 40mm; margin: 0; }
            body * { visibility: hidden !important; }
            .vinyl-label-scaler { transform: none !important; margin: 0 !important; }
            .label-b, .label-b * { visibility: visible !important; }
            .label-b {
                position: fixed !important;
                top: 0 !important; left: 0 !important;
                width: 62mm !important; height: 40mm !important;
                transform: none !important;
                box-shadow: none !important;
            }
        }
        .label-b {
            width: 62mm; height: 40mm;
            background: #fff; color: #000;
            font-family: 'DM Sans', sans-serif;
            position: relative; overflow: hidden;
            box-sizing: border-box;
            display: flex; flex-direction: column;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            /* Hard-reset ALL inherited spacing & justification from parent page */
            word-spacing: 0 !important;
            letter-spacing: 0 !important;
            text-align: left !important;
            text-align-last: left !important;
            text-justify: none !important;
            font-feature-settings: normal !important;
        }
        /* Top black bar */
        .label-b__bar {
            height: 5.5mm; background: #000; color: #fff;
            display: flex; align-items: center;
            padding: 0 1.6mm; flex-shrink: 0;
            position: relative;
        }
        .label-b__genre {
            flex: 1;
            font-size: 2.2mm; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.05em;
        }
        .label-b__logo-wrap {
            /* Centre logo over the right column (18mm wide) */
            width: 18mm;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .label-b__logo {
            height: 3mm; object-fit: contain;
            filter: brightness(0) invert(1);
            margin-right: 0;
        }
        /* Body */
        .label-b__body { display: flex; flex: 1; overflow: hidden; }
        /* Left column */
        .label-b__left {
            flex: 1; min-width: 0;
            padding: 1.1mm 0.95mm 1.6mm 1.6mm;
            display: flex; flex-direction: column; align-items: flex-start;
        }
        .label-b__title {
            font-size: 3.8mm; font-weight: 800;
            line-height: 1.1; color: #000;
            display: block; width: 100%;
            max-height: calc(3.8mm * 1.1 * 2); overflow: hidden;
            word-spacing: 0 !important; letter-spacing: -0.01em;
            word-break: normal; white-space: normal;
            text-align: left !important; text-align-last: left !important;
            text-justify: none !important;
        }
        .label-b__artist {
            font-size: 2.4mm; font-weight: 600;
            color: rgba(0,0,0,0.5); margin-top: 0.5mm;
            display: block; width: 100%;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            word-spacing: 0 !important;
            text-align: left !important; text-align-last: left !important;
            text-justify: none !important;
        }
        .label-b__sello-row {
            display: flex; align-items: baseline; gap: 0.8mm; margin-top: 0.6mm;
        }
        .label-b__sello-key {
            font-size: 1.9mm; font-weight: 700; color: rgba(0,0,0,0.35);
            text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0;
        }
        .label-b__sello-val {
            font-size: 2.2mm; font-weight: 600; color: #333;
            overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
        }
        /* Comment */
        .label-b__comment-wrap { flex: 1; display: flex; align-items: flex-start; width: 100%; overflow: hidden; padding-top: 0.4mm; }
        .label-b__comment {
            font-size: 2.1mm; font-style: italic; color: rgba(0,0,0,0.4);
            padding-left: 1.5mm; border-left: 0.5px solid rgba(0,0,0,0.2);
            max-width: 100%; white-space: normal; word-break: break-word;
            line-height: 1.3;
            max-height: calc(2.1mm * 1.3 * 5); overflow: hidden;
            display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical;
            text-align: left !important; text-align-last: left !important;
            text-justify: none !important; word-spacing: 0 !important;
        }
        /* Hairline + meta */
        .label-b__hairline { height: 0.5px; background: rgba(0,0,0,0.15); margin-bottom: 0.8mm; }
        .label-b__meta { display: flex; align-items: baseline; }
        .label-b__meta-item { flex: 1; font-size: 2mm; color: rgba(0,0,0,0.45); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .label-b__meta-item--left { text-align: left; }
        .label-b__meta-item--center { text-align: center; }
        .label-b__meta-item--right { text-align: right; }
        .label-b__meta-key {
            font-size: 1.8mm; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.05em;
        }
        .label-b__meta-mono {
            font-family: 'DM Mono', monospace; font-weight: 700; color: rgba(0,0,0,0.6);
        }
        /* Right column */
        .label-b__right {
            display: flex; flex-direction: column;
            align-items: center; justify-content: space-between;
            padding: 1.1mm 1.6mm 1.6mm;
            border-left: 0.5px solid rgba(0,0,0,0.12);
            flex-shrink: 0;
        }
        .label-b__qr-wrap {
            display: flex; flex-direction: column; align-items: center; gap: 0.4mm;
        }
        .label-b__qr { width: 15mm; height: 15mm; flex-shrink: 0; }
        .label-b__qr canvas, .label-b__qr img { width: 100% !important; height: 100% !important; display: block; }
        .label-b__sku {
            font-size: 1.9mm; font-family: 'DM Mono', monospace;
            font-weight: 600; color: rgba(0,0,0,0.45);
            letter-spacing: 0.02em; text-align: center;
        }
        /* Price block */
        .label-b__price-box {
            background: #000; color: #fff;
            width: 15mm; height: 12mm;
            min-width: 15mm; max-width: 15mm;
            min-height: 12mm; max-height: 12mm;
            flex-shrink: 0; flex-grow: 0;
            box-sizing: border-box; overflow: hidden;
            border-radius: 0.8mm;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            text-align: center;
        }
        .label-b__price {
            font-size: 5.2mm; font-weight: 800;
            font-family: 'DM Mono', monospace; line-height: 1; letter-spacing: -0.02em;
        }
        .label-b__currency {
            font-size: 2mm; font-weight: 700;
            color: #fff; letter-spacing: 0.05em; margin-top: 0.3mm;
        }
        .label-b--portrait {
            width: 40mm !important; height: 62mm !important;
        }
    </style>
</div>
`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Generate QR code encoding the SKU
        setTimeout(() => {
            const qrContainer = document.getElementById('qr-container');
            if (qrContainer && typeof QRCode !== 'undefined') {
                qrContainer.innerHTML = '';
                new QRCode(qrContainer, {
                    text: item.sku,
                    width: 57,
                    height: 57,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }, 50);
    },

    closePrintLabelModal() {
        const modal = document.getElementById('print-label-modal');
        if (modal) {
            // Clean up comment input
            const commentInput = document.getElementById('label-comment');
            if (commentInput) commentInput.value = '';
            modal.remove();
        }
    },

    setLabelOrientation(o) {
        const modal = document.getElementById('print-label-modal');
        if (!modal) return;
        modal.dataset.orientation = o;
        const hBtn = document.getElementById('orient-h');
        const vBtn = document.getElementById('orient-v');
        const ACTIVE = 'flex-1 py-2 bg-white text-brand-dark font-bold rounded-lg text-sm shadow-sm flex items-center justify-center gap-1.5 transition-all';
        const INACTIVE = 'flex-1 py-2 text-slate-500 font-bold rounded-lg text-sm flex items-center justify-center gap-1.5 transition-all';
        if (hBtn) hBtn.className = o === 'landscape' ? ACTIVE : INACTIVE;
        if (vBtn) vBtn.className = o === 'portrait' ? ACTIVE : INACTIVE;
        const labelEl = document.getElementById('printable-label');
        if (labelEl) labelEl.classList.toggle('label-b--portrait', o === 'portrait');
    },

    async confirmPrintLabel() {
        const commentInput = document.getElementById('label-comment');
        const previewComment = document.getElementById('preview-comment');
        const comment = commentInput ? commentInput.value : '';
        if (commentInput && previewComment) previewComment.innerText = comment;

        const btn = document.querySelector('#print-label-modal button[onclick="app.confirmPrintLabel()"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph-bold ph-circle-notch animate-spin"></i> Imprimiendo…';
        }

        try {
            // Build the label image using direct Canvas 2D drawing
            // (bypasses html2canvas which has unfixable word-spacing bugs with variable fonts)
            const modal2 = document.getElementById('print-label-modal');
            const orientation = modal2 ? (modal2.dataset.orientation || 'landscape') : 'landscape';
            const canvas = await this._drawLabelCanvas(comment, orientation);
            const base64 = canvas.toDataURL('image/png').split(',')[1];

            const res = await fetch(`${BASE_API_URL}/api/print-label`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error desconocido');

            if (btn) {
                btn.innerHTML = '<i class="ph-bold ph-check"></i> ¡Enviado!';
                btn.classList.replace('bg-brand-dark', 'bg-green-600');
            }
            this.showToast('✅ Etiqueta enviada a la impresora');
            setTimeout(() => this.closePrintLabelModal(), 1500);

        } catch (err) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-printer"></i> Imprimir';
            }
            this.showToast('Error al imprimir: ' + err.message, 'error');
        }
    },

    // Draw the label directly on a Canvas using 2D API — no html2canvas, no CSS word-spacing issues.
    async _drawLabelCanvas(comment, orientation = 'landscape') {
        const modal = document.getElementById('print-label-modal');
        const sku = modal ? modal.dataset.sku : null;
        const baseItem = sku ? (this.state.inventory.find(i => i.id === sku || i.sku === sku) || {}) : {};

        // Override with any values the user edited in the modal fields (label-only, no DB write)
        const getField = (id, fallback) => { const el = document.getElementById(id); return (el && el.value.trim()) ? el.value.trim() : fallback; };
        const item = {
            ...baseItem,
            album:           getField('label-edit-title',  baseItem.album),
            artist:          getField('label-edit-artist', baseItem.artist),
            year:            getField('label-edit-year',   baseItem.year),
            price:           getField('label-edit-price',  baseItem.price),
            genre:           getField('label-edit-genre1', baseItem.genre),
            genre2:          getField('label-edit-genre2', baseItem.genre2),
            condition:       getField('label-edit-cond',   baseItem.condition),
            storageLocation: getField('label-edit-loc',    baseItem.storageLocation),
        };

        const ppm = 300 / 25.4;
        const isPortrait = orientation === 'portrait';
        const W = Math.round((isPortrait ? 40 : 62) * ppm);
        const H = Math.round((isPortrait ? 62 : 40) * ppm);

        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');

        // Canvas word/letter spacing reset (native API, no CSS involved)
        if ('wordSpacing' in ctx) ctx.wordSpacing = '0px';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

        // ── Background ──────────────────────────────────────────────────
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // ── Top black bar ────────────────────────────────────────────────
        const barH = Math.round(5.5 * ppm);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, barH);

        // Genre text (genre1 + optional genre2, separated by " / ")
        const genreSz = Math.round(2.2 * ppm);
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${genreSz}px "DM Sans", Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const genreText = ((item.genre || 'VINYL') + (item.genre2 ? ' / ' + item.genre2 : '')).toUpperCase();
        ctx.fillText(genreText, Math.round(1.6 * ppm), barH / 2);

        // Logo (right side of bar) — load, invert to white, draw
        try {
            const logoImg = await new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = 'logo-broadsheet.png';
            });
            if (logoImg) {
                const logoH = Math.round(3 * ppm);
                const logoW = Math.round(logoImg.naturalWidth * (logoH / logoImg.naturalHeight));
                // Draw to temp canvas and invert pixels to white
                const tmp = document.createElement('canvas');
                tmp.width = logoImg.naturalWidth; tmp.height = logoImg.naturalHeight;
                const tc = tmp.getContext('2d');
                tc.drawImage(logoImg, 0, 0);
                const id = tc.getImageData(0, 0, tmp.width, tmp.height);
                const d = id.data;
                for (let j = 0; j < d.length; j += 4) {
                    if (d[j + 3] > 0) { d[j] = 255; d[j + 1] = 255; d[j + 2] = 255; }
                }
                tc.putImageData(id, 0, 0);
                // Centre logo horizontally over the right column (rightW = 18mm)
                const rightWmm = 18;
                const rightWpx = Math.round(rightWmm * ppm);
                const logoX = W - rightWpx + Math.round((rightWpx - logoW) / 2);
                const logoY = (barH - logoH) / 2;
                ctx.drawImage(tmp, logoX, logoY, logoW, logoH);
            }
        } catch(e) { /* logo optional */ }

        if (!isPortrait) {
        // ── Left column text ──────────────────────────────────────────────
        const bodyY = barH;
        const rightW = Math.round(18 * ppm);   // QR + price column width
        const leftW  = W - rightW;
        const padL   = Math.round(1.6 * ppm);
        const padT   = Math.round(1.1 * ppm);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Album title (bold, up to 2 lines)
        const titleSz = Math.round(3.8 * ppm);
        ctx.font = `800 ${titleSz}px "DM Sans", Arial, sans-serif`;
        ctx.fillStyle = '#000000';
        const titleMaxW = leftW - padL - Math.round(0.95 * ppm);
        const titleLines = this._wrapText(ctx, item.album || '', titleMaxW, 2);
        titleLines.forEach((line, i) => {
            ctx.fillText(line, padL, bodyY + padT + i * Math.round(titleSz * 1.1));
        });

        // Artist
        const artistSz = Math.round(2.4 * ppm);
        ctx.font = `600 ${artistSz}px "DM Sans", Arial, sans-serif`;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        const artistY = bodyY + padT + (titleLines.length * Math.round(titleSz * 1.1)) + Math.round(0.5 * ppm);
        const artist = this._truncateText(ctx, item.artist || '', titleMaxW);
        ctx.fillText(artist, padL, artistY);

        // Track content bottom for comment vertical centering
        let contentBottomY = artistY + artistSz;

        // Label / Sello
        if (item.label && item.label !== 'Desconocido') {
            const selloSz = Math.round(2.2 * ppm);
            const selloY = contentBottomY + Math.round(0.6 * ppm);
            ctx.font = `700 ${Math.round(1.9 * ppm)}px "DM Sans", Arial, sans-serif`;
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillText('LABEL', padL, selloY);
            ctx.font = `600 ${selloSz}px "DM Sans", Arial, sans-serif`;
            ctx.fillStyle = '#333333';
            const selloX = padL + ctx.measureText('LABEL ').width;
            ctx.fillText(this._truncateText(ctx, item.label, titleMaxW - selloX + padL), selloX, selloY);
            contentBottomY = selloY + selloSz;
        }

        // Hairline y position (needed for comment centering)
        const hairlineY = H - Math.round(5.0 * ppm);

        // Comment — wrapped up to 2 lines, centered vertically between content and hairline
        if (comment) {
            const commentSz = Math.round(2.1 * ppm);
            ctx.font = `italic 600 ${commentSz}px "DM Sans", Arial, sans-serif`;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.textBaseline = 'top';
            const commentMaxW = titleMaxW - Math.round(2 * ppm);
            const commentLines = this._wrapText(ctx, comment, commentMaxW, 5);
            const lineH = Math.round(commentSz * 1.35);
            const totalH = commentLines.length * lineH;
            const commentStartY = contentBottomY + (hairlineY - contentBottomY - totalH) / 2;
            commentLines.forEach((line, i) => {
                ctx.fillText(line, padL + Math.round(1.5 * ppm), commentStartY + i * lineH);
            });
        }

        // Bottom meta row: Loc | Cond | Year — 3 equal invisible columns
        const metaSz = Math.round(2.0 * ppm);
        const keySz  = Math.round(1.8 * ppm);
        const metaY  = H - Math.round(2.5 * ppm);
        const metaAreaW = leftW - padL - Math.round(0.95 * ppm);
        const colW = metaAreaW / 3;

        // Hairline above meta
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padL, hairlineY);
        ctx.lineTo(leftW - Math.round(0.95 * ppm), hairlineY);
        ctx.stroke();

        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        const drawMetaCol = (label, value, colX) => {
            ctx.font = `700 ${keySz}px "DM Sans", Arial, sans-serif`;
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillText(label + ' ', colX, metaY);
            const keyW = ctx.measureText(label + ' ').width;
            ctx.font = `700 ${metaSz}px "DM Mono", "Courier New", monospace`;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillText(value, colX + keyW, metaY);
        };

        drawMetaCol('Loc',  item.storageLocation || '—',  padL);
        drawMetaCol('Cond', item.condition || '—',         padL + colW);
        drawMetaCol('Year', item.year && Number(item.year) !== 0 ? String(item.year) : '—', padL + colW * 2);

        // ── Right column: QR + Price ──────────────────────────────────────
        const rightX = leftW;

        // Divider line
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rightX, bodyY);
        ctx.lineTo(rightX, H);
        ctx.stroke();

        // QR code: grab the canvas already rendered by QRCode.js
        const qrContainer = document.getElementById('qr-container');
        const qrCanvas = qrContainer ? qrContainer.querySelector('canvas') : null;
        const qrSizeMm = 15;
        const qrSize = Math.round(qrSizeMm * ppm);
        const qrX = rightX + Math.round((rightW - qrSize) / 2);
        const qrY = bodyY + Math.round(1.1 * ppm);
        if (qrCanvas) {
            ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
        } else {
            ctx.strokeStyle = '#ccc';
            ctx.strokeRect(qrX, qrY, qrSize, qrSize);
        }

        // SKU text under QR
        const skuSz = Math.round(1.9 * ppm);
        ctx.font = `600 ${skuSz}px "DM Mono", "Courier New", monospace`;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(item.sku || '', rightX + rightW / 2, qrY + qrSize + Math.round(0.4 * ppm));

        // Price box
        const priceBoxH = Math.round(12 * ppm);
        const priceBoxW = Math.round(15 * ppm);
        const priceBoxX = rightX + Math.round((rightW - priceBoxW) / 2);
        const priceBoxY = H - priceBoxH - Math.round(1.6 * ppm);

        ctx.fillStyle = '#000000';
        const r = Math.round(0.8 * ppm);
        ctx.beginPath();
        ctx.moveTo(priceBoxX + r, priceBoxY);
        ctx.lineTo(priceBoxX + priceBoxW - r, priceBoxY);
        ctx.quadraticCurveTo(priceBoxX + priceBoxW, priceBoxY, priceBoxX + priceBoxW, priceBoxY + r);
        ctx.lineTo(priceBoxX + priceBoxW, priceBoxY + priceBoxH - r);
        ctx.quadraticCurveTo(priceBoxX + priceBoxW, priceBoxY + priceBoxH, priceBoxX + priceBoxW - r, priceBoxY + priceBoxH);
        ctx.lineTo(priceBoxX + r, priceBoxY + priceBoxH);
        ctx.quadraticCurveTo(priceBoxX, priceBoxY + priceBoxH, priceBoxX, priceBoxY + priceBoxH - r);
        ctx.lineTo(priceBoxX, priceBoxY + r);
        ctx.quadraticCurveTo(priceBoxX, priceBoxY, priceBoxX + r, priceBoxY);
        ctx.closePath();
        ctx.fill();

        const rawPrice = item.price ? Number(item.price).toLocaleString('da-DK') : '—';
        const priceSz = Math.round(4.8 * ppm);
        const dkkSz = Math.round(2.0 * ppm);
        const priceLineH = priceSz * 1.1;
        const dkkLineH = dkkSz * 1.1;
        const totalTextH = priceLineH + dkkLineH;
        const priceTextY = priceBoxY + (priceBoxH - totalTextH) / 2 + priceLineH / 2;
        const dkkTextY = priceTextY + priceLineH / 2 + dkkLineH / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = `800 ${priceSz}px "DM Mono", "Courier New", monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(rawPrice, priceBoxX + priceBoxW / 2, priceTextY);

        const dkkSz2 = Math.round(2.2 * ppm);
        ctx.font = `700 ${dkkSz2}px "DM Sans", Arial, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('DKK', priceBoxX + priceBoxW / 2, dkkTextY);
        } else {
            // ── Portrait body (40mm × 62mm) ────────────────────────────────
            const padLP = Math.round(1.6 * ppm);
            const contentWP = W - padLP * 2;

            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // Title
            const titleSzP = Math.round(3.8 * ppm);
            ctx.font = `800 ${titleSzP}px "DM Sans", Arial, sans-serif`;
            ctx.fillStyle = '#000000';
            const titleLinesP = this._wrapText(ctx, item.album || '', contentWP, 2);
            let textYP = barH + Math.round(1.1 * ppm);
            titleLinesP.forEach((line, i) => {
                ctx.fillText(line, padLP, textYP + i * Math.round(titleSzP * 1.1));
            });
            textYP += titleLinesP.length * Math.round(titleSzP * 1.1);

            // Artist
            const artistSzP = Math.round(2.4 * ppm);
            ctx.font = `600 ${artistSzP}px "DM Sans", Arial, sans-serif`;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            textYP += Math.round(0.5 * ppm);
            ctx.fillText(this._truncateText(ctx, item.artist || '', contentWP), padLP, textYP);
            textYP += artistSzP;

            // Label / sello
            if (item.label && item.label !== 'Desconocido') {
                const selloSzP = Math.round(2.2 * ppm);
                textYP += Math.round(0.6 * ppm);
                ctx.font = `700 ${Math.round(1.9 * ppm)}px "DM Sans", Arial, sans-serif`;
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.fillText('LABEL', padLP, textYP);
                const kwP = ctx.measureText('LABEL ').width;
                ctx.font = `600 ${selloSzP}px "DM Sans", Arial, sans-serif`;
                ctx.fillStyle = '#333333';
                ctx.fillText(this._truncateText(ctx, item.label, contentWP - kwP), padLP + kwP, textYP);
                textYP += selloSzP;
            }

            // Comment — wrapped up to 2 lines
            if (comment) {
                const commentSzP = Math.round(2.1 * ppm);
                ctx.font = `italic 600 ${commentSzP}px "DM Sans", Arial, sans-serif`;
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.textBaseline = 'top';
                const commentMaxWP = contentWP - Math.round(3 * ppm);
                const commentLinesP = this._wrapText(ctx, comment, commentMaxWP, 5);
                const lineHP = Math.round(commentSzP * 1.35);
                const commentStartYP = textYP + Math.round(1.8 * ppm);
                commentLinesP.forEach((line, i) => {
                    ctx.fillText(line, padLP + Math.round(1.5 * ppm), commentStartYP + i * lineHP);
                });
            }

            // Bottom section (price box + meta row, anchored from bottom)
            const priceBoxHP = Math.round(12 * ppm);
            const priceBoxWP = Math.round(20 * ppm);
            const priceBoxXP = Math.round((W - priceBoxWP) / 2);
            const priceBoxYP = H - priceBoxHP - Math.round(1.6 * ppm);
            const hairlineYP = priceBoxYP - Math.round(4.5 * ppm);
            const metaYP = hairlineYP - Math.round(2.2 * ppm);

            // Hairline
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padLP, hairlineYP);
            ctx.lineTo(W - padLP, hairlineYP);
            ctx.stroke();

            // Meta row: Loc | Cond | Year
            const metaSzP = Math.round(2.0 * ppm);
            const keySzP = Math.round(1.8 * ppm);
            const colWP = contentWP / 3;
            ctx.textBaseline = 'middle';
            const drawMetaP = (lbl, val, colX) => {
                ctx.textAlign = 'left';
                ctx.font = `700 ${keySzP}px "DM Sans", Arial, sans-serif`;
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                ctx.fillText(lbl + ' ', colX, metaYP);
                const kw3 = ctx.measureText(lbl + ' ').width;
                ctx.font = `700 ${metaSzP}px "DM Mono", "Courier New", monospace`;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillText(val, colX + kw3, metaYP);
            };
            drawMetaP('Loc', item.storageLocation || '—', padLP);
            drawMetaP('Cond', item.condition || '—', padLP + colWP);
            drawMetaP('Year', item.year && Number(item.year) !== 0 ? String(item.year) : '—', padLP + colWP * 2);

            // QR code (centered between content bottom and bottom section)
            const qrSzP = Math.round(13 * ppm);
            const qrXP = Math.round((W - qrSzP) / 2);
            const skuSzP = Math.round(1.9 * ppm);
            const qrAreaTop = textYP + Math.round(2.5 * ppm);
            const qrAreaBot = metaYP - Math.round(skuSzP + Math.round(0.4 * ppm) + 4);
            const qrYP = qrAreaTop + Math.max(0, Math.round((qrAreaBot - qrAreaTop - qrSzP) / 2));

            const qrContP = document.getElementById('qr-container');
            const qrCvP = qrContP ? qrContP.querySelector('canvas') : null;
            if (qrCvP) {
                ctx.drawImage(qrCvP, qrXP, qrYP, qrSzP, qrSzP);
            } else {
                ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
                ctx.strokeRect(qrXP, qrYP, qrSzP, qrSzP);
            }

            ctx.font = `600 ${skuSzP}px "DM Mono", "Courier New", monospace`;
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(item.sku || '', W / 2, qrYP + qrSzP + Math.round(0.4 * ppm));

            // Price box (rounded rect, centered)
            ctx.fillStyle = '#000000';
            const rP = Math.round(0.8 * ppm);
            ctx.beginPath();
            ctx.moveTo(priceBoxXP + rP, priceBoxYP);
            ctx.lineTo(priceBoxXP + priceBoxWP - rP, priceBoxYP);
            ctx.quadraticCurveTo(priceBoxXP + priceBoxWP, priceBoxYP, priceBoxXP + priceBoxWP, priceBoxYP + rP);
            ctx.lineTo(priceBoxXP + priceBoxWP, priceBoxYP + priceBoxHP - rP);
            ctx.quadraticCurveTo(priceBoxXP + priceBoxWP, priceBoxYP + priceBoxHP, priceBoxXP + priceBoxWP - rP, priceBoxYP + priceBoxHP);
            ctx.lineTo(priceBoxXP + rP, priceBoxYP + priceBoxHP);
            ctx.quadraticCurveTo(priceBoxXP, priceBoxYP + priceBoxHP, priceBoxXP, priceBoxYP + priceBoxHP - rP);
            ctx.lineTo(priceBoxXP, priceBoxYP + rP);
            ctx.quadraticCurveTo(priceBoxXP, priceBoxYP, priceBoxXP + rP, priceBoxYP);
            ctx.closePath();
            ctx.fill();

            const rawPriceP = item.price ? Number(item.price).toLocaleString('da-DK') : '—';
            const priceSzP = Math.round(4.8 * ppm);
            const dkkSzP2 = Math.round(2.2 * ppm);
            const priceLineHP = priceSzP * 1.1;
            const dkkLineHP = dkkSzP2 * 1.1;
            const priceTextYP = priceBoxYP + (priceBoxHP - priceLineHP - dkkLineHP) / 2 + priceLineHP / 2;
            const dkkTextYP = priceTextYP + priceLineHP / 2 + dkkLineHP / 2;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `800 ${priceSzP}px "DM Mono", "Courier New", monospace`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(rawPriceP, priceBoxXP + priceBoxWP / 2, priceTextYP);
            ctx.font = `700 ${dkkSzP2}px "DM Sans", Arial, sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText('DKK', priceBoxXP + priceBoxWP / 2, dkkTextYP);
        }

        return cv;
    },

    // Wrap text to maxLines, returns array of strings
    _wrapText(ctx, text, maxWidth, maxLines) {
        const words = text.split(' ');
        const lines = [];
        let current = '';
        for (const word of words) {
            const test = current ? current + ' ' + word : word;
            if (ctx.measureText(test).width > maxWidth && current) {
                lines.push(current);
                current = word;
                if (lines.length >= maxLines) break;
            } else {
                current = test;
            }
        }
        if (current && lines.length < maxLines) lines.push(current);
        // If last line overflows, truncate with ellipsis
        if (lines.length > 0) {
            const last = lines[lines.length - 1];
            lines[lines.length - 1] = this._truncateText(ctx, last, maxWidth);
        }
        return lines;
    },

    // Truncate text with ellipsis if wider than maxWidth
    _truncateText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let truncated = text;
        while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
            truncated = truncated.slice(0, -1);
        }
        return truncated + '…';
    },


    initFuse() {
        if (typeof Fuse === 'undefined') {
            console.warn('Fuse.js not loaded yet');
            return;
        }

        const options = {
            keys: [
                { name: 'artist', weight: 0.35 },
                { name: 'album', weight: 0.25 },
                { name: 'label', weight: 0.15 },
                { name: 'storageLocation', weight: 0.15 },
                { name: 'sku', weight: 0.1 },
                { name: 'lot', weight: 0.1 },
                { name: 'quickId', weight: 0.1 },
                { name: 'genre', weight: 0.03 },
                { name: 'notes', weight: 0.02 }
            ],
            threshold: 0.4, // Lower is stricter, 0.4 is a good balance for typos
            distance: 100,
            ignoreLocation: true,
            minMatchCharLength: 2
        };

        this.fuse = new Fuse(this.state.inventory, options);
    },

    // Blueprint Sec 05: badges de estado de stock
    stockStatusBadges(item) {
        const badges = [];
        const stock = Number(item.stock) || 0;
        if (stock <= 0) {
            badges.push('<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold"><i class="ph-bold ph-x-circle"></i>Agotado</span>');
        }
        // Reservado = en el carrito de venta activo
        if ((this.state.cart || []).some(c => c.id === item.id || c.sku === item.sku)) {
            badges.push('<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-bold"><i class="ph-bold ph-handshake"></i>Reservado</span>');
        }
        // Nuevo ingreso = creado en los ultimos 14 dias
        const created = item.created_at ? (item.created_at.seconds ? item.created_at.seconds * 1000 : new Date(item.created_at).getTime()) : 0;
        if (created && (Date.now() - created) < 14 * 24 * 60 * 60 * 1000) {
            badges.push('<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold"><i class="ph-bold ph-sparkle"></i>Nuevo</span>');
        }
        return badges.join(' ');
    },

    getFilteredInventory() {
        const searchTerm = (this.state.inventorySearch || '').trim().toLowerCase();

        const currentGenreFilter = this.state.filterGenre || 'all';
        const currentOwnerFilter = this.state.filterOwner || 'all';
        const currentLabelFilter = this.state.filterLabel || 'all';
        const currentLotFilter = this.state.filterLot || 'all';
        const currentStorageFilter = this.state.filterStorage || 'all';
        const currentDiscogsFilter = this.state.filterDiscogs || 'all';
        const currentHeroFilter = this.state.filterHero || 'all';
        const currentStockFilter = this.state.filterStock || 'all';
        const currentConditionFilter = this.state.filterCondition || 'all';
        const priceMin = this.state.filterPriceMin !== undefined && this.state.filterPriceMin !== '' ? parseFloat(this.state.filterPriceMin) : null;
        const priceMax = this.state.filterPriceMax !== undefined && this.state.filterPriceMax !== '' ? parseFloat(this.state.filterPriceMax) : null;

        let results = this.state.inventory;

        // Blueprint Sec 05: rango de precio
        if (priceMin !== null || priceMax !== null) {
            results = results.filter(item => {
                const p = parseFloat(item.price) || 0;
                return (priceMin === null || p >= priceMin) && (priceMax === null || p <= priceMax);
            });
        }

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
                            (item.storageLocation || '').toLowerCase().includes(term) ||
                            (item.genre || '').toLowerCase().includes(term) ||
                            (item.notes || '').toLowerCase().includes(term) ||
                            (item.lot || '').toLowerCase().includes(term) ||
                            (item.sku || '').toLowerCase().includes(term);
                    });
                });
            }
        }

        // 2. Apply static filters
        return results.filter(item => {
            const rawGenres = [item.genre, item.genre2, item.genre3, item.genre4, item.genre5].filter(Boolean);
            const itemGenres = [];
            rawGenres.forEach(rg => {
                itemGenres.push(...rg.split(',').map(s => s.trim()).filter(Boolean));
            });
            const uniqueGenres = [...new Set(itemGenres)];
            const nonElectronic = uniqueGenres.filter(g => g.toLowerCase() !== 'electronic');
            const effectiveGenres = nonElectronic.length > 0 ? nonElectronic : (uniqueGenres.length > 0 ? uniqueGenres : ['Otros']);

            const matchesGenre = currentGenreFilter === 'all' || effectiveGenres.includes(currentGenreFilter);
            const matchesOwner = currentOwnerFilter === 'all' || item.owner === currentOwnerFilter;
            const matchesLabel = currentLabelFilter === 'all' || item.label === currentLabelFilter;
            const matchesLot = currentLotFilter === 'all' || (item.lot || '') === currentLotFilter;
            const matchesStorage = currentStorageFilter === 'all' || item.storageLocation === currentStorageFilter;

            const hasDiscogs = !!item.discogs_listing_id;
            const matchesDiscogs = currentDiscogsFilter === 'all' ||
                (currentDiscogsFilter === 'yes' && hasDiscogs) ||
                (currentDiscogsFilter === 'no' && !hasDiscogs);

            const isHero = item.tags && (Array.isArray(item.tags) ? item.tags.includes('hero') : item.tags.includes('hero'));
            const matchesHero = currentHeroFilter === 'all' ||
                (currentHeroFilter === 'yes' && isHero) ||
                (currentHeroFilter === 'no' && !isHero);

            const stockAge = this.getTimeInStockCategory(item.created_at || null);
            const matchesStockTime = this.state.filterStockTime.length === 0 || this.state.filterStockTime.includes(stockAge);

            const itemStock = Number(item.stock) || 0;
            const matchesStock = currentStockFilter === 'all' ||
                (currentStockFilter === 'inStock' && itemStock > 0) ||
                (currentStockFilter === 'outOfStock' && itemStock <= 0);

            const itemCondition = item.product_condition || 'Second-hand';
            const matchesCondition = currentConditionFilter === 'all' ||
                (currentConditionFilter === 'used' && itemCondition === 'Second-hand') ||
                (currentConditionFilter === 'new' && itemCondition !== 'Second-hand');

            return matchesGenre && matchesOwner && matchesLabel && matchesLot && matchesStorage && matchesDiscogs && matchesHero && matchesStockTime && matchesStock && matchesCondition;
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
            const item = this.state.inventory.find(i => i.id === sku || i.sku === sku);
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
            const item = this.state.inventory.find(i => i.id === sku || i.sku === sku);
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
    async handleAddVinyl(e, editSku) {
        e.preventDefault();
        const formData = new FormData(e.target);

        let genre = formData.get('genre');

        let collection = formData.get('collection');
        if (collection === 'other') {
            collection = formData.get('custom_collection');
        }

        const sku = formData.get('sku');

        // Get publishing flags
        const publishWebshop = formData.get('is_online') === 'on';
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
            lot: (formData.get('lot') || '').trim(),
            collectionNote: formData.get('collectionNote') || null,
            year: formData.get('year') ? parseInt(formData.get('year')) : null,
            condition: formData.get('condition'),

            provider_origin: formData.get('provider_origin') || 'Local_Used',
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
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            // Shop Tags
            // Shop Tags
            tags: [
                formData.get('tag_hero') ? 'hero' : null,
                formData.get('tag_new') ? 'new_arrival' : null,
                formData.get('collection_tag') ? formData.get('collection_tag').trim() : null
            ].filter(Boolean),
            is_rsd_discount: formData.get('is_rsd_discount') === 'on',
            // Persistence Fields
            discogsUrl: formData.get('discogsUrl'),
            discogsId: formData.get('discogsId'),
            discogs_release_id: formData.get('discogs_release_id') || formData.get('discogsId'),
            tracks: (() => {
                try {
                    return JSON.parse(formData.get('tracks') || '[]');
                } catch (e) { return []; }
            })()
        };

        // Micro-IVA: Calculate VAT fields based on provider origin
        if (recordData.provider_origin === 'EU_B2B') {
            recordData.item_phantom_vat = Math.round((recordData.cost * 0.25) * 100) / 100;
            recordData.item_real_vat = 0;
            recordData.acquisition_date = formData.get('acquisition_date') || new Date().toISOString().split('T')[0];
        } else if (recordData.provider_origin === 'DK_B2B') {
            recordData.item_phantom_vat = 0;
            recordData.item_real_vat = Math.round((recordData.cost * 0.25) * 100) / 100;
            recordData.acquisition_date = formData.get('acquisition_date') || new Date().toISOString().split('T')[0];
        } else {
            recordData.item_phantom_vat = 0;
            recordData.item_real_vat = 0;
            recordData.acquisition_date = null;
        }

        console.log(`[handleAddVinyl] editSku: ${editSku}, recordData:`, recordData);

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
                const skuNumbers = this.state.inventory
                    .map(i => {
                        const match = (i.sku && typeof i.sku === 'string') ? i.sku.match(/^SKU\s*-\s*(\d+)/) : null;
                        return match ? parseInt(match[1]) : 0;
                    });
                const localMaxSku = Math.max(0, ...skuNumbers);

                // Create new with auto-generated quickId (atomic transaction)
                recordData.created_at = firebase.firestore.FieldValue.serverTimestamp();
                
                productId = await db.runTransaction(async (transaction) => {
                    const counterRef = db.collection('metadata').doc('vinylCounter');
                    const counterDoc = await transaction.get(counterRef);
                    
                    let currentCount = 0;
                    if (counterDoc.exists) {
                        currentCount = counterDoc.data().current || 0;
                    }
                    
                    // Ensure the new counter is strictly greater than both the DB counter and the local max SKU
                    const newCount = Math.max(currentCount, localMaxSku) + 1;
                    const quickId = String(newCount).padStart(4, '0');
                    
                    // Update counter
                    transaction.set(counterRef, { current: newCount }, { merge: true });
                    
                    // Safely assign both quickId and sku inside the atomic transaction
                    recordData.quickId = quickId;
                    recordData.sku = `SKU-${String(newCount).padStart(3, '0')}`;
                    
                    const newDocRef = db.collection('products').doc();
                    transaction.set(newDocRef, recordData);
                    
                    return newDocRef.id;
                });
                
                this.showToast(`✅ Disco agregado (ID: ${recordData.quickId})`);
            }

            // Handle Discogs publishing
            if (publishDiscogs) {
                // Fallback to discogsId if discogs_release_id is missing
                const releaseId = formData.get('discogs_release_id') || formData.get('discogsId');

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

            document.getElementById('modal-overlay')?.remove();
            this.loadData();
        } catch (err) {
            console.error(err);
            this.showToast('❌ Error: ' + (err.message || 'desconocido'), 'error');
        }
    },

    async toggleProductTag(sku, tag) {
        try {
            const product = this.state.inventory.find(i => i.id === sku || i.sku === sku);
            if (!product) {
                this.showToast('❌ Producto no encontrado', 'error');
                return;
            }

            let tags = product.tags || [];
            if (tags.includes(tag)) {
                tags = tags.filter(t => t !== tag);
            } else {
                tags.push(tag);
            }

            // Use document ID directly to find the correct Firestore document
            const docRef = db.collection('products').doc(product.id);
            const docSnap = await docRef.get();
            if (!docSnap.exists) {
                this.showToast('❌ Error: Documento no encontrado', 'error');
                return;
            }
            await docRef.update({ 
                tags: tags,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.showToast(`✅ ${tag === 'hero' ? 'Héroe' : 'Novedad'} actualizado`);
            
            // Sync local state
            product.tags = tags;
            this.refreshCurrentView();
        } catch (error) {
            console.error("Error toggling product tag:", error);
            this.showToast("❌ Error al actualizar tag", "error");
        }
    },

    async toggleRsdDiscount(sku) {
        try {
            const product = this.state.inventory.find(i => i.id === sku || i.sku === sku);
            if (!product) {
                this.showToast('❌ Producto no encontrado', 'error');
                return;
            }

            const newValue = !product.is_rsd_discount;

            // Use document ID directly to find the correct Firestore document
            const docRef = db.collection('products').doc(product.id);
            const docSnap = await docRef.get();
            if (!docSnap.exists) {
                this.showToast('❌ Error: Documento no encontrado', 'error');
                return;
            }
            await docRef.update({ 
                is_rsd_discount: newValue,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.showToast(`✅ RSD ${newValue ? 'activado' : 'desactivado'} — ${product.album}`);
            
            // Sync local state
            product.is_rsd_discount = newValue;
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error toggling RSD discount:', error);
            this.showToast('❌ Error al actualizar RSD', 'error');
        }
    },

    deleteVinyl(sku) {
        const item = this.state.inventory.find(i => i.id === sku || i.sku === sku);
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
                                                                </a>
                                                                <button onclick="app.confirmDelete('${item.id}')" class="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                                                                    Eliminar
                                                                </a>
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
            // Find product using document ID directly (sku param may be doc ID or actual SKU)
            const stateItem = this.state.inventory.find(i => i.id === sku || i.sku === sku);
            const docId = stateItem ? stateItem.id : sku;
            const docSnap = await db.collection('products').doc(docId).get();
            if (!docSnap.exists) {
                this.showToast('❌ Producto no encontrado', 'error');
                return;
            }
            const product = { id: docSnap.id, ref: docSnap.ref, data: docSnap.data() };

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

        const item = this.state.inventory.find(i => i.id === sku || i.sku === sku);
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
                                                                    </a>
                                                                </div>
                                                                `).join('');
    },

    openCheckoutModal(prefillPayment, prefillChannel, rsdExtraRate = 0) {
        if (this.state.cart.length === 0) return;

        const subtotal = this.state.cart.reduce((sum, i) => sum + this.getEffectivePrice(i), 0);
        const total = rsdExtraRate > 0 ? Math.round(subtotal * (1 - rsdExtraRate) * 100) / 100 : subtotal;

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
                        </a>
                    </div>

                    <div class="bg-slate-50/50 rounded-2xl p-5 mb-8 border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                        ${this.state.cart.map(item => `
                            <div class="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                                <span class="truncate pr-4 font-bold text-slate-700">${item.album} ${item.is_rsd_discount ? '<span class="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-black">RSD</span>' : ''}</span>
                                ${item.is_rsd_discount
                                    ? `<span class="whitespace-nowrap"><span class="text-[10px] text-slate-400 line-through mr-1">${this.formatCurrency(item.price, false)}</span><span class="font-mono font-bold text-orange-600">${this.formatCurrency(this.getEffectivePrice(item), false)}</span></span>`
                                    : `<span class="font-mono font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(item.price, false)}</span>`
                                }
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
                        </a>
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
                feeValue.innerHTML = `- ${this.formatCurrency(fee)}`;
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
        const originalTotal = this.state.cart.reduce((sum, i) => sum + this.getEffectivePrice(i), 0);

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

        // Calculate RSD 5% extra discount if applicable
        const rsdExtra = (this.state.rsdExtraDiscount && this.state.cart.length >= 3) ? 0.05 : 0;
        this.openCheckoutModal(prefillPayment, prefillChannel, rsdExtra);
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

    async cancelOrderDiscogs(saleId) {
        if (!confirm('¿Estás seguro que deseas cancelar esta orden? Esta acción cambiará el estado a cancelado.')) {
            return;
        }
        try {
            this.showToast('Cancelando orden...', 'info');
            await api.cancelOrder(saleId);
            this.showToast('✅ Orden cancelada correctamente');
            await this.loadData();
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error in cancelOrderDiscogs:', error);
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



    getExpenseCategories() {
        return [
            // Gastos Operativos (deducibles de IVA ante SKAT)
            { value: 'alquiler', label: 'Alquiler', type: 'operativo' },
            { value: 'servicios', label: 'Servicios (internet, luz)', type: 'operativo' },
            { value: 'marketing', label: 'Marketing', type: 'operativo' },
            { value: 'envios', label: 'Envíos/Packaging', type: 'operativo' },
            { value: 'software', label: 'Software/Suscripciones', type: 'operativo' },
            { value: 'honorarios', label: 'Honorarios Profesionales', type: 'operativo' },
            { value: 'oficina', label: 'Material de Oficina', type: 'operativo' },
            { value: 'transporte', label: 'Transporte', type: 'operativo' },
            { value: 'otros_op', label: 'Otros Gastos Operativos', type: 'operativo' },
            // Compras de stock (disparan ingreso a inventario)
            { value: 'stock_nuevo', label: 'Stock: Vinilos NUEVOS (Distribuidor)', type: 'stock_nuevo' },
            { value: 'stock_usado', label: 'Stock: Vinilos USADOS (Particular/Brugtmoms)', type: 'stock_usado' },
        ];
    },

    // --- Filtros de período y categoría (propios de Registro de Compras) ---
    toggleExpenseMonth(i) {
        const arr = this.state.expenseFilterMonths;
        const ix = arr.indexOf(i);
        if (ix >= 0) { if (arr.length > 1) arr.splice(ix, 1); }
        else arr.push(i);
        arr.sort((a, b) => a - b);
        this.refreshCurrentView();
    },

    setExpenseFilterMonthsAll() {
        this.state.expenseFilterMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        this.refreshCurrentView();
    },

    setExpenseFilterYear(y) {
        this.state.expenseFilterYear = Number(y);
        this.refreshCurrentView();
    },

    toggleExpenseMissingReceipt() {
        this.state.expenseMissingReceiptOnly = !this.state.expenseMissingReceiptOnly;
        this.refreshCurrentView();
    },

    // --- Filtros propios de Ingresos Extra ---
    toggleIncomeMonth(i) {
        const arr = this.state.incomeFilterMonths;
        const ix = arr.indexOf(i);
        if (ix >= 0) { if (arr.length > 1) arr.splice(ix, 1); }
        else arr.push(i);
        arr.sort((a, b) => a - b);
        this.refreshCurrentView();
    },

    setIncomeFilterMonthsAll() {
        this.state.incomeFilterMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        this.refreshCurrentView();
    },

    setIncomeFilterYear(y) {
        this.state.incomeFilterYear = Number(y);
        this.refreshCurrentView();
    },

    setIncomeSearch(v) {
        this.state.incomeSearch = v;
        this.refreshCurrentView();
        const el = document.getElementById('income-search-input');
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    },

    setIncomeCategoryFilter(v) {
        this.state.incomeCategoryFilter = v;
        this.refreshCurrentView();
    },

    toggleIncomeUninvoiced() {
        this.state.incomeUninvoicedOnly = !this.state.incomeUninvoicedOnly;
        this.refreshCurrentView();
    },

    toggleIncomeForm() {
        this.state.showIncomeForm = !this.state.showIncomeForm;
        this.refreshCurrentView();
    },

    // --- Factura desde ingreso extra ---
    invoiceFromExtraIncome(id) {
        const e = (this.state.extraIncome || []).find(x => x.id === id);
        if (!e) return;
        if (e.invoiced) { this.navigate('facturasManual'); return; }
        const pmMap = { Transfer: 'Transfer', MobilePay: 'MobilePay', Cash: 'CASH', Card: 'CARD' };
        this.state.invoicePrefill = {
            extraIncomeId: e.id,
            customerName: e.clientName || '',
            description: e.description || '',
            amount: e.amount ?? '',
            vatAmount: e.vatAmount ?? '',
            date: e.date || new Date().toISOString().split('T')[0],
            paymentMethod: pmMap[e.paymentMethod] || 'Transfer',
        };
        this.navigate('facturasManual');
        this.showToast('Datos del ingreso cargados en la factura');
    },

    cancelInvoicePrefill() {
        this.state.invoicePrefill = null;
        this.refreshCurrentView();
    },

    async markExtraIncomeInvoiced(id, invoiceNumber) {
        try {
            await db.collection('extra_income').doc(id).update({ invoiced: true, invoiceNumber: invoiceNumber || '' });
            const e = (this.state.extraIncome || []).find(x => x.id === id);
            if (e) { e.invoiced = true; e.invoiceNumber = invoiceNumber || ''; }
        } catch (err) {
            console.error('Error marcando ingreso como facturado:', err);
            this.showToast('⚠️ Factura generada, pero no se pudo marcar el ingreso', 'error');
        }
    },

    // --- Vincular factura existente a un ingreso extra ---
    async openLinkInvoiceModal(id) {
        const e = (this.state.extraIncome || []).find(x => x.id === id);
        if (!e || e.invoiced) return;
        if (!this.state.manualInvoicesLoaded) {
            try { await this.loadManualInvoices(); } catch (err) { console.error(err); }
        }
        const invoices = (this.state.contabilidadInvoices || []).slice()
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const rows = invoices.length === 0
            ? `<div class="py-10 text-center"><i class="ph-duotone ph-note-blank text-4xl text-slate-300 mb-2 block"></i><p class="text-sm text-slate-400 font-medium">No hay facturas en el sistema</p></div>`
            : invoices.map(inv => {
                const num = esc(inv.invoiceNumber || 's/n');
                const search = `${inv.invoiceNumber || ''} ${inv.customerName || ''} ${inv.itemsSummary || ''}`.toLowerCase().replace(/"/g, '');
                return `
                <div class="link-inv-row flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-orange hover:bg-orange-50/30 cursor-pointer transition-colors" data-search="${esc(search)}" onclick="app.linkInvoiceToExtraIncome('${id}', '${num}')">
                    <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><i class="ph-bold ph-file-text"></i></div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-bold text-brand-dark">#${num}</p>
                        <p class="text-xs text-slate-500 truncate">${esc(inv.customerName || '—')} · ${esc(inv.date || '')}</p>
                    </div>
                    <span class="text-sm font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(inv.totalAmount || 0)}</span>
                </div>`;
            }).join('');

        const modalHtml = `
            <div id="link-invoice-modal" class="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onclick="if(event.target === this) this.remove()">
                <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
                    <div class="p-5 border-b border-slate-100">
                        <h3 class="font-bold text-brand-dark text-lg">Vincular factura</h3>
                        <p class="text-sm text-slate-500 mt-0.5 truncate">${esc(e.description || 'Ingreso')} · ${this.formatCurrency(Number(e.amount) || 0)}</p>
                        <input id="link-invoice-search" placeholder="Buscar por nº, cliente..." oninput="app.filterLinkInvoiceList(this.value)"
                            class="mt-3 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange">
                    </div>
                    <div id="link-invoice-list" class="overflow-y-auto flex-1 p-3 space-y-2">
                        ${rows}
                    </div>
                    <div class="p-5 border-t border-slate-100 bg-slate-50">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">¿La factura no está en el sistema?</p>
                        <div class="flex gap-2">
                            <input id="manual-invoice-number" placeholder="Nº de factura (ej. 2026-014)"
                                class="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange">
                            <button onclick="app.markExtraIncomeManual('${id}')"
                                class="px-4 py-2.5 bg-brand-dark text-white text-sm font-bold rounded-xl hover:bg-black transition-colors whitespace-nowrap">
                                Marcar facturado
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    filterLinkInvoiceList(q) {
        const term = (q || '').toLowerCase();
        document.querySelectorAll('#link-invoice-list .link-inv-row').forEach(r => {
            r.style.display = (r.dataset.search || '').toLowerCase().includes(term) ? '' : 'none';
        });
    },

    async linkInvoiceToExtraIncome(incomeId, invoiceNumber) {
        const e = (this.state.extraIncome || []).find(x => x.id === incomeId);
        if (!e || e.invoiced) { this.showToast('Este ingreso ya está facturado', 'error'); return; }
        try {
            await db.collection('extra_income').doc(incomeId).update({ invoiced: true, invoiceNumber: invoiceNumber || '', linkedManually: true });
            e.invoiced = true;
            e.invoiceNumber = invoiceNumber || '';
            e.linkedManually = true;
            document.getElementById('link-invoice-modal')?.remove();
            this.refreshCurrentView();
            this.showToast(`✅ Factura ${invoiceNumber} vinculada al ingreso`);
        } catch (err) {
            console.error('Error vinculando factura:', err);
            this.showToast('⚠️ Error al vincular: ' + err.message, 'error');
        }
    },

    async markExtraIncomeManual(incomeId) {
        const num = (document.getElementById('manual-invoice-number')?.value || '').trim();
        if (!num) { this.showToast('Ingresá el número de factura', 'error'); return; }
        await this.linkInvoiceToExtraIncome(incomeId, num);
    },

    setExpenseCategoryFilter(v) {
        this.state.expenseCategoryFilter = v;
        this.refreshCurrentView();
    },

    setExpensesSearch(v) {
        this.state.expensesSearch = v;
        this.refreshCurrentView();
        const el = document.getElementById('expenses-search-input');
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    },

    renderExpenses(container) {
        const expenseCategories = this.getExpenseCategories();
        // Store categories globally for other functions to access
        window.expenseCategories = expenseCategories;

        const searchTerm = (this.state.expensesSearch || '').toLowerCase();
        const missingOnly = !!this.state.expenseMissingReceiptOnly;
        const catFilter = this.state.expenseCategoryFilter || 'all';
        const fYear = this.state.expenseFilterYear;
        const fMonths = this.state.expenseFilterMonths || [];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthNamesLong = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const inPeriod = (e) => {
            const d = new Date(e.fecha_factura || e.date || e.timestamp);
            if (isNaN(d.getTime())) return true;
            return d.getFullYear() === fYear && fMonths.includes(d.getMonth());
        };
        const isMissingReceipt = (e) => !e.receiptUrl && !e.comprobante;

        // KPIs: siempre sobre el período seleccionado
        const periodExpenses = (this.state.expenses || []).filter(inPeriod);
        const kpiTotal = periodExpenses.reduce((s, e) => s + (Number(e.monto_total || e.amount) || 0), 0);
        const kpiMissing = periodExpenses.filter(isMissingReceipt).length;
        const kpiIva = periodExpenses.reduce((s, e) => s + (Number(e.monto_iva) || 0), 0);

        // Tabla: período + categoría + búsqueda + sin comprobante (combinables)
        const filteredExpenses = (this.state.expenses || []).filter(e => {
            if (!inPeriod(e)) return false;
            if (missingOnly && !isMissingReceipt(e)) return false;
            if (catFilter !== 'all' && (e.categoria || e.category) !== catFilter) return false;
            return !searchTerm ||
                (e.description || e.proveedor || '').toLowerCase().includes(searchTerm) ||
                (e.category || e.categoria || '').toLowerCase().includes(searchTerm) ||
                (e.lotRef || '').toLowerCase().includes(searchTerm) ||
                (e.proveedor || '').toLowerCase().includes(searchTerm);
        });

        const periodLabel = fMonths.length === 12 ? `${fYear}`
            : fMonths.length === 1 ? `${monthNamesLong[fMonths[0]]} ${fYear}`
            : `${fMonths.length} meses · ${fYear}`;

        const html = `
    <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                ${this.sectionHeader({
                    title: 'Registro de Compras',
                    subtitle: 'Gastos del negocio con comprobantes, categorías e IVA',
                    primary: { label: 'Registrar compra', icon: 'ph-plus', onclick: 'app.openExpenseWizard()' }
                })}
                ${missingOnly ? `
                <div class="mb-4 flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm font-bold">
                    <span class="flex items-center gap-2"><i class="ph-bold ph-warning-circle"></i> Mostrando solo gastos sin comprobante</span>
                    <button onclick="app.state.expenseMissingReceiptOnly = false; app.refreshCurrentView()" class="underline hover:no-underline">Mostrar todos</button>
                </div>` : ''}

                <!-- Selector de período -->
                <div class="flex flex-wrap items-center gap-3 mb-6">
                    <div class="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                        <select onchange="app.setExpenseFilterYear(this.value)" class="bg-slate-50 text-xs font-bold text-brand-dark px-3 py-2 rounded-xl border-none outline-none cursor-pointer">
                            <option value="2026" ${fYear === 2026 ? 'selected' : ''}>2026</option>
                            <option value="2025" ${fYear === 2025 ? 'selected' : ''}>2025</option>
                        </select>
                        <div class="h-6 w-px bg-slate-100 mx-1"></div>
                        <div class="flex gap-1 overflow-x-auto max-w-[300px] md:max-w-none no-scrollbar bg-slate-100/80 rounded-xl p-1">
                            <button onclick="app.setExpenseFilterMonthsAll()"
                                class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${fMonths.length === 12 ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-brand-dark'}">
                                Todo
                            </button>
                            ${monthNames.map((m, i) => `
                                <button onclick="app.toggleExpenseMonth(${i})"
                                    class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${fMonths.includes(i) ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-brand-dark'}">
                                    ${m}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <p class="text-xs text-slate-400">Período: <span class="font-bold text-brand-dark">${periodLabel}</span></p>
                </div>

                <!-- KPIs del período -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-brand-orange"><i class="ph-bold ph-wallet"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total del período</span>
                        </div>
                        <p class="text-2xl font-display font-bold text-brand-dark">${this.formatCurrency(kpiTotal)}</p>
                        <p class="text-[11px] text-slate-400 mt-1">${periodExpenses.length} compra${periodExpenses.length === 1 ? '' : 's'}</p>
                    </div>
                    <button onclick="app.state.expenseMissingReceiptOnly = true; app.refreshCurrentView()" class="text-left bg-white p-5 rounded-2xl border ${kpiMissing > 0 ? 'border-amber-200' : 'border-slate-100'} shadow-sm hover:shadow-md hover:border-amber-300 transition-all">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500"><i class="ph-bold ph-paperclip"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin comprobante</span>
                        </div>
                        <p class="text-2xl font-display font-bold ${kpiMissing > 0 ? 'text-amber-600' : 'text-emerald-600'}">${kpiMissing}</p>
                        <p class="text-[11px] text-slate-400 mt-1">${kpiMissing > 0 ? 'Clic para filtrar' : 'Todo respaldado'}</p>
                    </button>
                    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><i class="ph-bold ph-percent"></i></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IVA recuperable</span>
                        </div>
                        <p class="text-2xl font-display font-bold text-emerald-600">${this.formatCurrency(kpiIva)}</p>
                        <p class="text-[11px] text-slate-400 mt-1">Del período seleccionado</p>
                    </div>
                </div>

                <!-- Filtros: mismo patrón de pills que Inventario/Ventas -->
                <div class="flex flex-wrap items-center gap-2 mb-4">
                    <div class="relative flex-1 min-w-[220px]">
                        <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" id="expenses-search-input"
                            value="${(this.state.expensesSearch || '').replace(/"/g, '&quot;')}"
                            oninput="app.setExpensesSearch(this.value)"
                            placeholder="Buscar por proveedor, categoría, lote..."
                            class="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-full focus:outline-none focus:border-brand-orange shadow-sm text-sm">
                    </div>
                    <div class="filter-chip ${catFilter !== 'all' ? 'active' : ''}" title="Filtrar por categoría">
                        <i class="ph-bold ph-tag text-xs"></i>
                        <select onchange="app.setExpenseCategoryFilter(this.value)">
                            <option value="all">Todas las categorías</option>
                            ${expenseCategories.map(c => `<option value="${c.value}" ${catFilter === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="app.toggleExpenseMissingReceipt()" class="quick-pill ${missingOnly ? 'active' : ''}" title="Mostrar solo gastos sin comprobante">
                        <i class="ph-bold ph-paperclip text-xs"></i> Sin comprobante
                        ${kpiMissing > 0 ? `<span class="w-5 h-5 rounded-full ${missingOnly ? 'bg-white/30' : 'bg-amber-100 text-amber-700'} flex items-center justify-center text-[10px] font-bold">${kpiMissing}</span>` : ''}
                    </button>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <!-- Totales por categoría + exportación (siguen el filtro activo) -->
                    ${(() => {
                        const byCat = {};
                        let totIva = 0;
                        filteredExpenses.forEach(e => {
                            const label = expenseCategories.find(c => c.value === (e.categoria || e.category))?.label || e.categoria || e.category || 'Sin categoría';
                            const amt = Number(e.monto_total || e.amount) || 0;
                            byCat[label] = (byCat[label] || 0) + amt;
                            totIva += Number(e.monto_iva) || 0;
                        });
                        const tot = Object.values(byCat).reduce((a, b) => a + b, 0);
                        const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);
                        return `
                        <div class="bg-slate-50/60 border-b border-slate-100 p-4">
                            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <div class="flex items-center gap-5">
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total filtrado</p>
                                        <p class="text-xl font-display font-bold text-brand-dark">${this.formatCurrency(tot)}</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IVA</p>
                                        <p class="text-xl font-display font-bold text-emerald-600">${this.formatCurrency(totIva)}</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registros</p>
                                        <p class="text-xl font-display font-bold text-slate-500">${filteredExpenses.length}</p>
                                    </div>
                                </div>
                                <button onclick="app.exportExpensesToCSV()" class="flex items-center gap-2 bg-white border border-slate-200 hover:border-brand-orange hover:text-brand-orange text-slate-500 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                                    <i class="ph-bold ph-download-simple"></i> Exportar CSV
                                </button>
                            </div>
                            ${top.length > 0 ? `
                            <div class="flex flex-wrap gap-2">
                                ${top.map(([label, amt]) => `
                                    <span class="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-[11px] font-bold text-slate-600">
                                        ${label} <span class="text-brand-dark">${this.formatCurrency(amt)}</span>
                                    </span>`).join('')}
                            </div>` : ''}
                        </div>`;
                    })()}

<!-- Table -->
                            <div class="overflow-x-auto">
                                <table class="w-full text-left">
                                    <thead class="bg-slate-50 border-b border-slate-100">
                                        <tr class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            <th class="p-4">Fecha</th>
                                            <th class="p-4">Proveedor</th>
                                            <th class="p-4">Categoría</th>
                                            <th class="p-4 text-right">Total</th>
                                            <th class="p-4 text-right">IVA</th>
                                            <th class="p-4 text-center">Estado</th>
                                            <th class="p-4 w-20"></th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-50">
                                        ${filteredExpenses.length > 0 ? filteredExpenses.map(e => `
                                            <tr id="expense-${e.id}" class="hover:bg-slate-50 transition-colors group ${this.state.expenseIdHighlight === e.id ? 'bg-amber-50' : ''}">
                                                <td class="p-4 text-xs text-slate-500 whitespace-nowrap">
                                                    ${this.formatDate(e.fecha_factura || e.date)}
                                                </td>
                                                <td class="p-4">
                                                    <p class="text-sm font-bold text-brand-dark">${e.proveedor || e.description || '-'}</p>
                                                    ${e.descripcion ? `<p class="text-xs text-slate-400 truncate max-w-[200px]">${e.descripcion}</p>` : ''}
                                                    ${e.lotRef ? `
                                                    <button onclick="app.gotoInventoryLot('${e.lotRef}')" class="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-all" title="Ver discos vinculados a este lote">
                                                        <i class="ph-bold ph-package"></i>${e.lotRef}
                                                        <span class="bg-white/80 px-1.5 rounded-full">${app.countDiscsInLot(e.lotRef)} discos</span>
                                                    </button>` : ''}
                                                </td>
                                                <td class="p-4">
                                                    <span class="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                                                        ${expenseCategories.find(c => c.value === (e.categoria || e.category))?.label || e.categoria || e.category || '-'}
                                                    </span>
                                                    ${e.categoria === 'stock_nuevo' ? (() => {
                                                        const t = e.vat_treatment === 'dk' ? 'dk' : (e.vat_treatment === 'eu' || e.is_inventory_invoice ? 'eu' : null);
                                                        return t ? `<span class="block mt-1.5 text-[10px] font-bold ${t === 'dk' ? 'text-emerald-600' : 'text-blue-600'}">${t === 'dk' ? 'DK · 25%' : 'UE · reverse charge'}</span>` : '';
                                                    })() : ''}
                                                    ${(e.categoria === 'stock_nuevo' || e.categoria === 'stock_usado' || e.category === 'Inventario (compra de vinilos)') ? `
                                                        <button onclick="app.openInventoryIngest('${e.id}')" 
                                                            class="ml-2 text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded hover:bg-orange-600 transition-colors">
                                                            Ingresar Stock
                                                        </a>
                                                    ` : ''}
                                                </td>
                                                <td class="p-4 text-right font-bold text-brand-dark">
                                                    ${this.formatCurrency(e.monto_total || e.amount || 0)}
                                                </td>
                                                <td class="p-4 text-right text-sm ${(e.monto_iva || 0) > 0 ? 'text-green-600' : 'text-slate-400'}">
                                                    ${this.formatCurrency(e.monto_iva || 0)}
                                                </td>
                                                <td class="p-4 text-center">
                                                    ${e.receiptPending && !e.receiptUrl ? `
                                                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold" title="Comprobante pendiente de subir">
                                                            <i class="ph-bold ph-clock"></i> En revisión
                                                        </span>
                                                    ` : e.receiptUrl ? `
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
                                                        </a>
                                                        <button onclick="app.deleteExpense('${e.id}')" 
                                                            class="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all" 
                                                            title="Eliminar">
                                                            <i class="ph-fill ph-trash"></i>
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="7" class="p-12 text-center">
                                                    <i class="ph-duotone ph-receipt text-4xl text-slate-200 block mb-3"></i>
                                                    <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Sin compras registradas</p>
                                                </td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>

                            <!-- Summary -->
                            ${filteredExpenses.length > 0 ? `
                                <div class="p-4 bg-slate-50 border-t border-slate-100">
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
                                    </a>
                                </div>
                            ` : ''}
                        </div>
            </div>
    `;
        container.innerHTML = html;
    },

    editExpense(id) {
        this.openExpenseWizard(id);
    },

    // --- Wizard: Registrar / Editar compra en 3 pasos ---
    expenseWizardSteps() {
        return [
            { n: 1, label: 'Compra', icon: 'ph-receipt' },
            { n: 2, label: 'Importes', icon: 'ph-calculator' },
            { n: 3, label: 'Revisión', icon: 'ph-check-circle' },
        ];
    },

    // --- Tratamiento de IVA para compras de stock: 'eu' (reverse charge) | 'dk' (25% moms) ---
    // El default es 'eu' (99% de los distribuidores son de la UE). Se recuerda por proveedor.
    vatTreatmentStorageKey() { return 'ec_vat_treatment_by_supplier'; },
    getRememberedVatTreatment(supplier) {
        try {
            const map = JSON.parse(localStorage.getItem(this.vatTreatmentStorageKey()) || '{}');
            return map[this.normalizeLotSupplier(supplier)] || null;
        } catch (e) { return null; }
    },
    rememberVatTreatment(supplier, treatment) {
        if (!supplier || !treatment) return;
        try {
            const key = this.vatTreatmentStorageKey();
            const map = JSON.parse(localStorage.getItem(key) || '{}');
            map[this.normalizeLotSupplier(supplier)] = treatment;
            localStorage.setItem(key, JSON.stringify(map));
        } catch (e) { /* noop */ }
    },
    // Al editar: respeta lo guardado; si no hay dato, deriva de los campos legacy
    deriveVatTreatment(editing) {
        if (!editing) return 'eu';
        if (editing.vat_treatment === 'dk' || editing.vat_treatment === 'eu') return editing.vat_treatment;
        if (editing.is_inventory_invoice) return 'eu';
        if ((Number(editing.monto_iva) || 0) > 0) return 'dk';
        return 'eu';
    },
    setExpenseVatTreatment(t) {
        const wz = this.state.expenseWizard;
        if (!wz) return;
        wz.vatTreatment = t;
        wz.vatTreatmentTouched = true;
        this.refreshExpenseVatTreatmentUI();
    },
    refreshExpenseVatTreatmentUI() {
        const wz = this.state.expenseWizard;
        const box = document.getElementById('expense-vat-treatment-options');
        if (wz && box) box.innerHTML = this.expenseVatTreatmentOptionsHTML(wz);
    },
    expenseVatTreatmentOptionsHTML(wz) {
        const t = wz.vatTreatment || 'eu';
        const opt = (val, title, help, icon) => {
            const sel = t === val;
            return `<button type="button" onclick="app.setExpenseVatTreatment('${val}')"
                class="text-left p-3 rounded-xl border-2 transition-all ${sel ? 'border-brand-orange bg-orange-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}">
                <span class="flex items-center gap-2 font-bold text-sm ${sel ? 'text-brand-dark' : 'text-slate-600'}">
                    <i class="ph-bold ${icon} ${sel ? 'text-brand-orange' : 'text-slate-400'}"></i> ${title}
                </span>
                <span class="block text-[11px] text-slate-400 mt-1 leading-snug">${help}</span>
            </button>`;
        };
        return opt('eu', 'UE · Reverse charge', 'El distribuidor factura sin IVA. Se declara y deduce solo en el Reporte VAT (neto 0).', 'ph-globe')
            + opt('dk', 'Dinamarca · 25% moms', 'Proveedor danés con IVA en la factura. Se deduce en el Reporte VAT.', 'ph-bank');
    },
    // Al tipear el proveedor: si tiene tratamiento recordado y el usuario no lo tocó, aplicarlo
    expenseSupplierChanged(v) {
        const wz = this.state.expenseWizard;
        if (wz) wz.proveedor = v;
        this.updateLotPreview();
        if (wz && !wz.vatTreatmentTouched && wz.categoria === 'stock_nuevo') {
            const remembered = this.getRememberedVatTreatment(v);
            if (remembered && remembered !== wz.vatTreatment) {
                wz.vatTreatment = remembered;
                this.refreshExpenseVatTreatmentUI();
            }
        }
    },

    openExpenseWizard(editId = null) {
        const expenseCategories = this.getExpenseCategories();
        window.expenseCategories = expenseCategories;
        const editing = editId ? (this.state.expenses || []).find(e => e.id === editId) : null;
        const today = new Date().toISOString().split('T')[0];
        this.state.expenseWizard = {
            step: 1,
            id: editId || null,
            fecha: editing ? (editing.fecha_factura || (editing.date || '').slice(0, 10) || today) : today,
            proveedor: editing ? (editing.proveedor || editing.description || '') : '',
            descripcion: editing ? (editing.descripcion || '') : '',
            categoria: editing ? (editing.categoria || editing.category || '') : '',
            invoiceNumber: editing ? (editing.invoiceNumber || '') : '',
            total: editing ? (editing.monto_total || editing.amount || '') : '',
            iva: editing ? (editing.monto_iva || 0) : 0,
            vatTreatment: this.deriveVatTreatment(editing),
            vatTreatmentTouched: false,
            noReceipt: editing ? !!editing.receiptPending : false,
            receiptUrl: editing ? (editing.receiptUrl || '') : '',
            dupAck: false,
        };
        if (document.getElementById('expensewizard-overlay')) return;
        const suppliers = [...new Set((this.state.expenses || []).map(e => e.proveedor).filter(Boolean))].sort();
        const overlay = document.createElement('div');
        overlay.id = 'expensewizard-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn';
        overlay.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-100">
            <div class="p-6 border-b border-slate-100">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-display text-xl font-bold text-brand-dark flex items-center gap-2">
                        <i class="ph-bold ph-receipt text-brand-orange"></i> ${editing ? 'Editar compra' : 'Registrar compra'}
                    </h3>
                    <button onclick="app.closeExpenseWizard()" class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
                <div class="flex items-center gap-1" id="expensewizard-steps"></div>
            </div>
            <div class="p-6 overflow-y-auto flex-1" id="expensewizard-body"></div>
            <div class="p-4 border-t border-slate-100 flex justify-between gap-3 bg-slate-50/50" id="expensewizard-footer"></div>
            <datalist id="expense-supplier-list">
                ${suppliers.map(p => `<option value="${String(p).replace(/"/g, '&quot;')}">`).join('')}
            </datalist>
        </div>`;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeExpenseWizard(); });
        document.body.appendChild(overlay);
        this.renderExpenseWizardStep();
    },

    closeExpenseWizard() {
        document.getElementById('expensewizard-overlay')?.remove();
        this.state.expenseWizard = null;
    },

    renderExpenseWizardStep() {
        const wz = this.state.expenseWizard;
        const stepsEl = document.getElementById('expensewizard-steps');
        const body = document.getElementById('expensewizard-body');
        const footer = document.getElementById('expensewizard-footer');
        if (!wz || !stepsEl || !body || !footer) return;
        const steps = this.expenseWizardSteps();
        stepsEl.innerHTML = steps.map(s => `
            <div class="flex-1 flex items-center gap-2 ${s.n <= wz.step ? '' : 'opacity-40'}">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${s.n < wz.step ? 'bg-emerald-500 text-white' : s.n === wz.step ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-400'}">
                    ${s.n < wz.step ? '<i class="ph-bold ph-check"></i>' : s.n}
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wide hidden sm:inline ${s.n === wz.step ? 'text-brand-dark' : 'text-slate-400'}">${s.label}</span>
                ${s.n < steps.length ? '<div class="flex-1 h-px bg-slate-200 mx-1"></div>' : ''}
            </div>`).join('');
        body.innerHTML = wz.step === 1 ? this.expenseWizardStepWhat(wz)
            : wz.step === 2 ? this.expenseWizardStepAmounts(wz)
            : this.expenseWizardStepReview(wz);
        footer.innerHTML = `
            ${wz.step > 1
                ? `<button onclick="app.expenseWizardGo(${wz.step - 1})" class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-white transition-all flex items-center gap-2"><i class="ph-bold ph-arrow-left"></i> Atrás</button>`
                : `<button onclick="app.closeExpenseWizard()" class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-white transition-all">Cancelar</button>`}
            ${wz.step < 3
                ? `<button onclick="app.expenseWizardGo(${wz.step + 1})" class="px-6 py-2.5 rounded-xl bg-brand-dark text-white font-bold text-sm shadow-lg hover:scale-[1.02] transition-transform flex items-center gap-2">Continuar <i class="ph-bold ph-arrow-right"></i></button>`
                : `<button onclick="app.saveExpenseWizard()" class="px-6 py-2.5 rounded-xl bg-brand-orange text-white font-bold text-sm shadow-lg shadow-brand-orange/30 hover:scale-[1.02] transition-transform flex items-center gap-2"><i class="ph-bold ph-check"></i> ${wz.id ? 'Actualizar compra' : 'Guardar compra'}</button>`}`;
        if (wz.step === 3) this.renderExpenseWizardReview();
        if (wz.step === 2) this.expenseWizardUpdateNet();
    },

    // Lee los campos visibles del paso actual hacia el estado del wizard
    captureExpenseWizardFields() {
        const wz = this.state.expenseWizard;
        if (!wz) return;
        const g = (id) => document.getElementById(id);
        if (g('expense-fecha')) wz.fecha = g('expense-fecha').value;
        if (g('expense-proveedor')) wz.proveedor = g('expense-proveedor').value;
        if (g('expense-descripcion')) wz.descripcion = g('expense-descripcion').value;
        if (g('expense-categoria')) wz.categoria = g('expense-categoria').value;
        if (g('expense-invoice-number')) wz.invoiceNumber = g('expense-invoice-number').value;
        if (g('expense-monto')) wz.total = g('expense-monto').value;
        if (g('expense-iva')) wz.iva = g('expense-iva').value;
        if (g('expense-no-receipt')) wz.noReceipt = g('expense-no-receipt').checked;
        if (g('expense-dup-ack')) wz.dupAck = g('expense-dup-ack').checked;
        if (g('receipt-url') && g('receipt-url').value) wz.receiptUrl = g('receipt-url').value;
    },

    expenseWizardGo(step) {
        const wz = this.state.expenseWizard;
        if (!wz) return;
        this.captureExpenseWizardFields();
        if (step > 1 && wz.step === 1) {
            if (!wz.fecha || !(wz.proveedor || '').trim() || !wz.categoria) {
                this.showToast('Completá fecha, proveedor y categoría para continuar.');
                return;
            }
        }
        if (step > 2 && wz.step === 2) {
            const total = parseFloat(wz.total);
            const ivaLocked = wz.categoria === 'stock_usado' || (wz.categoria === 'stock_nuevo' && (wz.vatTreatment || 'eu') === 'eu');
            const iva = ivaLocked ? 0 : (parseFloat(wz.iva) || 0);
            if (isNaN(total) || total <= 0) { this.showToast('El monto total debe ser mayor a 0.'); return; }
            if (iva < 0 || iva > total) { this.showToast('El IVA debe estar entre 0 y el total.'); return; }
            wz.iva = iva;
        }
        wz.step = step;
        this.renderExpenseWizardStep();
    },

    expenseWizardCategoryChanged(sel) {
        const wz = this.state.expenseWizard;
        if (wz) wz.categoria = sel.value;
        this.toggleExpenseLotFields();
        if (wz && wz.categoria === 'stock_usado') wz.iva = 0;
    },

    expenseWizardCalcVat() {
        const wz = this.state.expenseWizard;
        const total = parseFloat(wz?.total) || parseFloat(document.getElementById('expense-monto')?.value) || 0;
        if (!total) { this.showToast('Ingresá primero el monto total.'); return; }
        const iva = Math.round((total - total / 1.25) * 100) / 100;
        if (wz) wz.iva = iva;
        const el = document.getElementById('expense-iva');
        if (el) el.value = iva;
        this.expenseWizardUpdateNet();
    },

    expenseWizardUpdateNet() {
        const total = parseFloat(document.getElementById('expense-monto')?.value) || 0;
        const iva = parseFloat(document.getElementById('expense-iva')?.value) || 0;
        const net = document.getElementById('expense-neto');
        if (net) net.textContent = this.formatCurrency(total - iva);
        const warn = document.getElementById('expense-iva-warn');
        if (warn) warn.classList.toggle('hidden', !(total > 0 && iva > total * 0.2 + 0.005));
    },

    // --- Paso 1: Qué se compró ---
    expenseWizardStepWhat(wz) {
        const expenseCategories = this.getExpenseCategories();
        const isStock = wz.categoria === 'stock_nuevo' || wz.categoria === 'stock_usado';
        const esc = (s) => String(s || '').replace(/"/g, '&quot;');
        const escT = (s) => String(s || '').replace(/</g, '&lt;');
        return `
            <input type="hidden" id="expense-id" value="${wz.id || ''}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de factura *</label>
                    <input type="date" id="expense-fecha" value="${wz.fecha || ''}"
                        oninput="app.state.expenseWizard.fecha=this.value;app.updateLotPreview()"
                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Proveedor *</label>
                    <input id="expense-proveedor" list="expense-supplier-list" value="${esc(wz.proveedor)}"
                        placeholder="Nombre de tienda/empresa"
                        oninput="app.expenseSupplierChanged(this.value)"
                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none">
                </div>
            </div>
            <div class="mt-4">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría del gasto *</label>
                <select id="expense-categoria" onchange="app.expenseWizardCategoryChanged(this)"
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none">
                    <option value="" disabled ${!wz.categoria ? 'selected' : ''}>Seleccionar categoría...</option>
                    ${expenseCategories.map(c => `<option value="${c.value}" ${wz.categoria === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                </select>
            </div>
            <div id="expense-lot-fields" class="${isStock ? '' : 'hidden'} mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Nº de Factura <span class="normal-case font-medium text-slate-400">(del proveedor)</span>
                </label>
                <input id="expense-invoice-number" value="${esc(wz.invoiceNumber)}" placeholder="Ej. 12345"
                    oninput="app.state.expenseWizard.invoiceNumber=this.value;app.updateLotPreview()"
                    class="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-brand-orange outline-none">
                <div class="mt-2 flex items-center gap-2 text-xs">
                    <span class="text-slate-400 font-bold uppercase tracking-wide">Lote:</span>
                    <span id="expense-lot-preview" class="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">${this.buildLotRef(wz.proveedor, wz.invoiceNumber, wz.fecha, wz.id || null) || '—'}</span>
                </div>
                <p class="text-[10px] text-slate-400 mt-1">Vincula esta factura con los discos que ingresen al inventario.</p>
                <div id="expense-vat-treatment" class="${wz.categoria === 'stock_nuevo' ? '' : 'hidden'} mt-3 pt-3 border-t border-indigo-100">
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Tratamiento de IVA</label>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2" id="expense-vat-treatment-options">
                        ${this.expenseVatTreatmentOptionsHTML(wz)}
                    </div>
                </div>
            </div>
            <div class="mt-4">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Notas / Descripción</label>
                <textarea id="expense-descripcion" rows="2" placeholder="Detalles adicionales (opcional)"
                    oninput="app.state.expenseWizard.descripcion=this.value"
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none resize-none">${escT(wz.descripcion)}</textarea>
            </div>`;
    },

    // --- Paso 2: Importes ---
    expenseWizardStepAmounts(wz) {
        const isUsado = wz.categoria === 'stock_usado';
        const treat = (wz.vatTreatment || 'eu');
        const isEu = wz.categoria === 'stock_nuevo' && treat === 'eu';
        const isDk = wz.categoria === 'stock_nuevo' && treat === 'dk';
        const ivaLocked = isUsado || isEu;
        const ivaVal = ivaLocked ? 0 : (wz.iva === '' || wz.iva == null ? 0 : wz.iva);
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Monto total (DKK) *</label>
                    <input type="number" id="expense-monto" step="0.01" min="0" value="${wz.total === '' || wz.total == null ? '' : wz.total}"
                        placeholder="0.00"
                        oninput="app.state.expenseWizard.total=this.value;app.expenseWizardUpdateNet()"
                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none text-lg font-bold">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Monto IVA / Moms (DKK)</label>
                    <div class="flex gap-2">
                        <input type="number" id="expense-iva" step="0.01" min="0" value="${ivaVal}"
                            placeholder="0.00" ${ivaLocked ? 'disabled' : ''}
                            oninput="app.state.expenseWizard.iva=this.value;app.expenseWizardUpdateNet()"
                            class="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none ${ivaLocked ? 'bg-slate-100 cursor-not-allowed' : ''}">
                        ${ivaLocked ? '' : `<button type="button" onclick="app.expenseWizardCalcVat()" class="px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:border-brand-orange hover:text-brand-orange transition-all" title="Calcular IVA 25% incluido en el total">25%</button>`}
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <i class="ph-bold ph-info"></i> ${isDk ? 'Factura danesa: ingresá el 25% de IVA incluido en el total.' : 'Puede ser 0 si el proveedor es extranjero o particular'}
                    </p>
                </div>
            </div>
            ${isUsado ? `
            <p class="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                <i class="ph-bold ph-warning"></i> Vinilos usados (Brugtmoms): sin IVA deducible.
            </p>` : ''}
            ${isEu ? `
            <p class="mt-3 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center gap-2">
                <i class="ph-bold ph-info"></i> Reverse charge UE: la factura viene al 0%. El IVA se autoliquida por disco en el Reporte VAT (se declara y se deduce, neto 0).
            </p>` : ''}
            <div class="mt-4 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Subtotal neto</span>
                <span id="expense-neto" class="text-lg font-display font-bold text-brand-dark"></span>
            </div>
            <p id="expense-iva-warn" class="hidden mt-2 text-[11px] text-amber-700 flex items-center gap-1">
                <i class="ph-bold ph-warning"></i> El IVA supera el 25% danés — revisá los importes.
            </p>`;
    },

    // --- Paso 3: Comprobante y revisión ---
    expenseWizardStepReview(wz) {
        return `
            <div class="mb-4">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Factura / Recibo *</label>
                <div id="upload-zone" onclick="document.getElementById('receipt-file').click()"
                    class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-orange hover:bg-orange-50/30 transition-all group">
                    <input type="file" id="receipt-file" accept="image/*,.pdf" class="hidden" onchange="app.handleReceiptUpload(this)">
                    <div id="upload-placeholder">
                        <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                        <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">Subir Factura/Recibo</p>
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
                <input type="hidden" id="receipt-url" value="">
                <label class="mt-3 flex items-start gap-3 p-3 rounded-xl border border-dashed border-slate-200 cursor-pointer hover:border-amber-300 hover:bg-amber-50/50 transition-all">
                    <input type="checkbox" id="expense-no-receipt" ${wz.noReceipt ? 'checked' : ''} onchange="app.state.expenseWizard.noReceipt=this.checked" class="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300">
                    <span class="text-xs text-slate-500">
                        <span class="font-bold text-slate-700">Cargar sin comprobante por ahora</span><br>
                        El registro quedará marcado <strong>en revisión</strong> hasta que subas el comprobante.
                    </span>
                </label>
            </div>
            <div id="expensewizard-dup"></div>
            <div id="expensewizard-summary"></div>`;
    },

    renderExpenseWizardReview() {
        const wz = this.state.expenseWizard;
        if (!wz) return;
        const dup = this.findDuplicateExpense(wz.fecha, wz.total, wz.proveedor, wz.descripcion, wz.id || null);
        const dupBox = document.getElementById('expensewizard-dup');
        if (dupBox) {
            dupBox.innerHTML = dup ? `
                <div class="mb-4 p-4 rounded-2xl border border-amber-200 bg-amber-50">
                    <p class="text-sm font-bold text-amber-800 flex items-center gap-2"><i class="ph-bold ph-warning"></i> Posible duplicado</p>
                    <p class="text-xs text-amber-700 mt-1">Ya existe <strong>${dup.proveedor || dup.description || ''}</strong> el ${this.formatDate(dup.fecha_factura || dup.date)} por ${this.formatCurrency(Number(dup.monto_total || dup.amount || 0))}.</p>
                    <label class="mt-3 flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" id="expense-dup-ack" ${wz.dupAck ? 'checked' : ''} onchange="app.state.expenseWizard.dupAck=this.checked" class="mt-0.5 w-4 h-4 rounded text-amber-600 border-amber-300">
                        <span class="text-xs text-amber-800 font-bold">Entiendo, guardar igual</span>
                    </label>
                </div>` : '';
        }
        const expenseCategories = this.getExpenseCategories();
        const catLabel = expenseCategories.find(c => c.value === wz.categoria)?.label || wz.categoria || '—';
        const total = parseFloat(wz.total) || 0;
        const treat = (wz.vatTreatment || 'eu');
        const ivaLocked = wz.categoria === 'stock_usado' || (wz.categoria === 'stock_nuevo' && treat === 'eu');
        const iva = ivaLocked ? 0 : (parseFloat(wz.iva) || 0);
        const isStock = wz.categoria === 'stock_nuevo' || wz.categoria === 'stock_usado';
        const lot = (isStock && (wz.proveedor || '').trim()) ? (this.buildLotRef(wz.proveedor, wz.invoiceNumber, wz.fecha, wz.id || null) || '—') : null;
        const receiptUrl = document.getElementById('receipt-url')?.value || wz.receiptUrl || '';
        const sumBox = document.getElementById('expensewizard-summary');
        if (sumBox) {
            const row = (k, v) => `<div class="flex justify-between gap-4 py-2 border-b border-slate-50 last:border-0"><span class="text-xs text-slate-400 font-bold uppercase tracking-wide">${k}</span><span class="text-sm font-bold text-brand-dark text-right">${v}</span></div>`;
            sumBox.innerHTML = `
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resumen</p>
                <div class="bg-slate-50/60 border border-slate-100 rounded-2xl px-4 py-2">
                    ${row('Fecha', this.formatDate(wz.fecha))}
                    ${row('Proveedor', wz.proveedor || '—')}
                    ${row('Categoría', catLabel)}
                    ${row('Total', this.formatCurrency(total))}
                    ${row('IVA', this.formatCurrency(iva))}
                    ${wz.categoria === 'stock_nuevo' ? row('Tratamiento IVA', treat === 'dk' ? '<span class="text-emerald-700">Dinamarca · 25%</span>' : '<span class="text-blue-700">UE · Reverse charge</span>') : ''}
                    ${row('Subtotal neto', this.formatCurrency(total - iva))}
                    ${lot ? row('Lote', `<span class="text-indigo-700">${lot}</span>`) : ''}
                    ${row('Comprobante', receiptUrl ? '<span class="text-emerald-600">Subido</span>' : (wz.noReceipt ? '<span class="text-amber-600">En revisión</span>' : '<span class="text-red-500">Falta</span>'))}
                </div>`;
        }
        // Restaurar vista previa del comprobante si se está editando
        if (wz.receiptUrl && !document.getElementById('receipt-url')?.value) {
            const rurl = document.getElementById('receipt-url');
            if (rurl) rurl.value = wz.receiptUrl;
            document.getElementById('upload-placeholder')?.classList.add('hidden');
            document.getElementById('upload-preview')?.classList.remove('hidden');
            const img = document.getElementById('receipt-preview-img');
            if (img) img.src = wz.receiptUrl;
            const fn = document.getElementById('receipt-filename');
            if (fn) fn.textContent = 'Comprobante guardado';
        }
    },

    saveExpenseWizard() {
        const wz = this.state.expenseWizard;
        if (!wz) return;
        this.captureExpenseWizardFields();
        const receiptUrl = document.getElementById('receipt-url')?.value || wz.receiptUrl || '';
        if (!receiptUrl && !wz.noReceipt) {
            this.showToast('Subí el comprobante o marcá "Cargar sin comprobante por ahora".');
            return;
        }
        const dup = this.findDuplicateExpense(wz.fecha, wz.total, wz.proveedor, wz.descripcion, wz.id || null);
        if (dup && !wz.dupAck) {
            this.showToast('Posible duplicado: revisá el aviso y marcá "guardar igual" para continuar.');
            return;
        }
        const cat = (window.expenseCategories || []).find(c => c.value === wz.categoria);
        const vatTreatment = wz.categoria === 'stock_nuevo' ? (wz.vatTreatment || 'eu') : '';
        const ivaLocked = wz.categoria === 'stock_usado' || vatTreatment === 'eu';
        const expenseData = {
            proveedor: (wz.proveedor || '').trim(),
            fecha_factura: wz.fecha,
            date: wz.fecha,
            monto_total: parseFloat(wz.total) || 0,
            monto_iva: ivaLocked ? 0 : (parseFloat(wz.iva) || 0),
            categoria: wz.categoria,
            categoria_label: cat?.label || wz.categoria,
            categoria_tipo: cat?.type || 'operativo',
            is_vat_deductible: cat?.type === 'operativo' || cat?.type === 'stock_nuevo',
            vat_treatment: vatTreatment,
            descripcion: (wz.descripcion || '').trim(),
            receiptUrl,
            timestamp: new Date().toISOString(),
            receiptPending: !receiptUrl && !!wz.noReceipt,
            invoiceNumber: (wz.invoiceNumber || '').trim(),
            supplier: (wz.proveedor || '').trim(),
            lotRef: ((wz.categoria === 'stock_nuevo' || wz.categoria === 'stock_usado') && (wz.proveedor || '').trim())
                ? this.buildLotRef(wz.proveedor, wz.invoiceNumber, wz.fecha, wz.id || null)
                : '',
        };
        // UE reverse charge: el IVA se autoliquida por disco (micro-IVA) en el Reporte VAT,
        // por eso el gasto queda en 0 y no duplica la deducción.
        if (vatTreatment) this.rememberVatTreatment(wz.proveedor, vatTreatment);
        const done = () => {
            this.showToast(wz.id ? 'Compra actualizada' : 'Compra registrada');
            this.closeExpenseWizard();
            this.loadData();
        };
        const fail = (err) => { console.error(err); this.showToast('Error al guardar'); };
        if (wz.id) {
            db.collection('expenses').doc(wz.id).update(expenseData).then(done).catch(fail);
        } else {
            db.collection('expenses').add(expenseData).then(done).catch(fail);
        }
    },

    // Blueprint Sec 09: normalizacion para deteccion de duplicados
    normalizeText(s) {
        return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    },

    findDuplicateExpense(fecha, monto, proveedor, descripcion, excludeId) {
        const target = this.normalizeText(`${proveedor || ''} ${descripcion || ''}`);
        const targetDate = (fecha || '').slice(0, 10);
        const targetAmount = Number(monto) || 0;
        if (!targetDate || !targetAmount) return null;
        return (this.state.expenses || []).find(e => {
            if (excludeId && e.id === excludeId) return false;
            if ((e.fecha_factura || e.date || '').slice(0, 10) !== targetDate) return false;
            if (Math.abs((Number(e.monto_total || e.amount) || 0) - targetAmount) > 0.005) return false;
            const existing = this.normalizeText(`${e.proveedor || e.description || ''} ${e.descripcion || ''}`);
            if (!target || !existing) return false;
            return existing.includes(target) || target.includes(existing);
        }) || null;
    },

    // Referencia de lote: linkeo liviano factura -> inventario
    // Proveedor normalizado en mayusculas sin espacios ni tildes: "Rush Hour" -> "RUSHOUR"
    normalizeLotSupplier(s) {
        return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '').toUpperCase();
    },

    // Deriva un lotRef estable y unico por compra: PROVEEDOR-FACTURA o PROVEEDOR-YYYYMMDD
    buildLotRef(supplier, invoiceNumber, dateStr, excludeId) {
        const sup = this.normalizeLotSupplier(supplier);
        if (!sup) return '';
        const inv = (invoiceNumber || '').trim().replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
        const datePart = (dateStr || '').slice(0, 10).replace(/-/g, '');
        let base = inv ? `${sup}-${inv}` : `${sup}-${datePart || 'SINF'}`;
        let lot = base, n = 2;
        const taken = new Set((this.state.expenses || []).filter(e => e.id !== excludeId).map(e => e.lotRef).filter(Boolean));
        while (taken.has(lot)) lot = `${base}-${n++}`;
        return lot;
    },

    // Lotes recientes (de compras y de discos) para selectores con autocompletado
    getRecentLots(limit = 20) {
        const lots = new Map();
        (this.state.expenses || []).forEach(e => {
            if (e.lotRef) lots.set(e.lotRef, (e.fecha_factura || e.date || '').slice(0, 10));
        });
        (this.state.inventory || []).forEach(i => {
            if (i.lot && !lots.has(i.lot)) lots.set(i.lot, '');
        });
        return [...lots.keys()].slice(0, limit);
    },

    countDiscsInLot(lotRef) {
        if (!lotRef) return 0;
        return (this.state.inventory || []).filter(i => (i.lot || '') === lotRef).length;
    },

    gotoInventoryLot(lotRef) {
        if (!lotRef) return;
        this.state.filterLot = lotRef;
        this.state.invPage = 1;
        this.navigate('inventory');
    },

    // Muestra/oculta los campos de lote segun la categoria (solo compras de stock)
    toggleExpenseLotFields() {
        const cat = document.getElementById('expense-categoria')?.value || '';
        const wrap = document.getElementById('expense-lot-fields');
        if (!wrap) return;
        const isStock = cat === 'stock_nuevo' || cat === 'stock_usado';
        wrap.classList.toggle('hidden', !isStock);
        const treat = document.getElementById('expense-vat-treatment');
        if (treat) treat.classList.toggle('hidden', cat !== 'stock_nuevo');
        if (isStock) this.updateLotPreview();
    },

    // Vista previa en vivo del lotRef mientras se escribe
    updateLotPreview() {
        const el = document.getElementById('expense-lot-preview');
        if (!el) return;
        const prov = document.getElementById('expense-proveedor')?.value || '';
        const inv = document.getElementById('expense-invoice-number')?.value || '';
        const fecha = document.getElementById('expense-fecha')?.value || '';
        const editingId = document.getElementById('expense-id')?.value || null;
        const lot = this.buildLotRef(prov, inv, fecha, editingId);
        el.textContent = lot || '—';
    },

    // Blueprint Sec 09: exportar compras a CSV (con IVA visible)
    exportExpensesToCSV() {
        const rows = this.state.expenses || [];
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const header = ['Fecha', 'Proveedor', 'N Factura', 'Lote', 'Descripcion', 'Categoria', 'Tratamiento IVA', 'Total (kr)', 'IVA (kr)', 'Comprobante'];
        const lines = [header.map(esc).join(';')];
        const treatLabel = (e) => {
            if (e.categoria !== 'stock_nuevo') return '';
            const t = e.vat_treatment === 'dk' ? 'dk' : (e.vat_treatment === 'eu' || e.is_inventory_invoice ? 'eu' : null);
            return t === 'dk' ? 'Dinamarca 25%' : (t === 'eu' ? 'UE reverse charge' : '');
        };
        rows.forEach(e => {
            lines.push([
                esc((e.fecha_factura || e.date || '').slice(0, 10)),
                esc(e.proveedor || e.description || ''),
                esc(e.invoiceNumber || ''),
                esc(e.lotRef || ''),
                esc(e.descripcion || ''),
                esc(e.categoria_label || e.categoria || e.category || ''),
                esc(treatLabel(e)),
                esc(Number(e.monto_total || e.amount || 0).toFixed(2)),
                esc(Number(e.monto_iva || 0).toFixed(2)),
                esc(e.receiptUrl ? 'Si' : (e.receiptPending ? 'En revision' : 'No'))
            ].join(';'));
        });
        const blob = new Blob(["\ufeff" + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `registro_compras_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.showToast('✅ CSV exportado (' + rows.length + ' registros)');
    },

    openInventoryIngest(expenseId) {
        const expense = this.state.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        // Abrir el wizard de carga rapida con el lote de la compra pre-seleccionado
        // y el origen (EU_B2B / DK_B2B) según el tratamiento de IVA de la factura
        const presetOrigin = expense.categoria === 'stock_nuevo'
            ? (expense.vat_treatment === 'dk' ? 'DK_B2B' : 'EU_B2B')
            : '';
        this.openQuickAddWizard(expense.lotRef || '', presetOrigin);
        if (expense.lotRef) this.showToast(`Cargando discos del lote ${expense.lotRef}`);
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

            this.showToast('✅ Archivo subido correctamente');

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
                                                                    ${this.sectionHeader({
                                                                        title: 'Socios y Consignación',
                                                                        subtitle: 'Saldos y stock en consignación por socio',
                                                                        primary: { label: 'Nuevo Socio', icon: 'ph-plus', onclick: "app.openAddConsignorModal()" }
                                                                    })}

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

            // Build stock items preview for hover tooltip
            const stockItemsHtml = partnerItems.filter(i => i.stock > 0).slice(0, 12).map(i => `
                <div class="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <img src="${i.cover_image || i.image || 'https://elcuartito.dk/default-vinyl.png'}" class="w-10 h-10 rounded-md object-cover border border-white/10 shrink-0" onerror="this.src='https://elcuartito.dk/default-vinyl.png'">
                    <div class="min-w-0 flex-1">
                        <p class="text-[10px] font-bold text-white truncate">${i.album || i.title || 'Sin título'}</p>
                        <p class="text-[9px] text-slate-400 truncate">${i.artist || ''} ${i.location ? '· 📍' + i.location : ''}</p>
                        <p class="text-[9px] text-brand-orange font-bold">${this.formatCurrency(i.price || 0)} × ${i.stock}</p>
                    </div>
                </div>
            `).join('');
            const remainingStock = partnerItems.filter(i => i.stock > 0).length - 12;
            const stockOverflowHtml = remainingStock > 0 ? `<p class="text-[9px] text-slate-500 text-center mt-1">+${remainingStock} más...</p>` : '';

            return `
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div class="flex justify-between items-start mb-6">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="font-display text-xl font-bold text-brand-dark">${c.name}</h3>
                                        <!-- Info Button -->
                                        <div class="relative" id="info-wrap-${c.id}">
                                            <button onclick="event.stopPropagation(); const el = document.getElementById('info-pop-${c.id}'); el.classList.toggle('hidden'); el.classList.toggle('opacity-0'); el.classList.toggle('opacity-100');" 
                                                class="w-7 h-7 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-all" title="Ver contacto">
                                                <i class="ph-bold ph-info text-sm"></i>
                                            </button>
                                            <!-- Info Popover -->
                                            <div id="info-pop-${c.id}" class="hidden opacity-0 absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50 transition-all duration-200">
                                                <div class="absolute -top-1.5 left-4 w-3 h-3 bg-white border-t border-l border-slate-100 rotate-45"></div>
                                                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Datos de Contacto</h4>
                                                <div class="space-y-2">
                                                    <div class="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg">
                                                        <div class="w-7 h-7 bg-blue-50 rounded-md flex items-center justify-center text-blue-500 shrink-0">
                                                            <i class="ph-bold ph-envelope-simple text-sm"></i>
                                                        </div>
                                                        ${c.email 
                                                            ? `<a href="mailto:${c.email}" class="text-xs text-brand-dark font-medium hover:text-blue-600 transition-colors truncate">${c.email}</a>` 
                                                            : `<span class="text-xs text-slate-400 italic">No registrado</span>`}
                                                    </div>
                                                    <div class="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg">
                                                        <div class="w-7 h-7 bg-green-50 rounded-md flex items-center justify-center text-green-500 shrink-0">
                                                            <i class="ph-bold ph-phone text-sm"></i>
                                                        </div>
                                                        ${c.phone 
                                                            ? `<a href="tel:${c.phone}" class="text-xs text-brand-dark font-medium hover:text-green-600 transition-colors">${c.phone}</a>` 
                                                            : `<span class="text-xs text-slate-400 italic">No registrado</span>`}
                                                    </div>
                                                </div>
                                                <div class="mt-3 pt-3 border-t border-slate-50">
                                                    <div class="flex items-center gap-2 text-[10px] text-slate-400">
                                                        <i class="ph-bold ph-handshake text-xs"></i>
                                                        <span>Acuerdo: <strong class="text-brand-orange">${c.agreementSplit || c.split || 70}%</strong> para el socio</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">${c.agreementSplit || c.split || 70}% Acuerdo</span>
                                    </div>
                                </div>
                                <button onclick="app.deleteConsignor('${c.id}')" class="text-slate-300 hover:text-red-400 transition-colors">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <!-- Stock Actual with hover preview -->
                                <div class="relative group/stock bg-slate-50 p-3 rounded-xl border border-slate-100 cursor-default">
                                    <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Stock Actual</p>
                                    <p class="font-display font-bold text-xl text-brand-dark">${inStockCount}</p>
                                    ${inStockCount > 0 ? `
                                    <!-- Stock hover tooltip -->
                                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-brand-dark rounded-xl shadow-2xl border border-slate-700 p-3 opacity-0 invisible group-hover/stock:opacity-100 group-hover/stock:visible transition-all duration-200 z-50 pointer-events-none">
                                        <div class="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-brand-dark"></div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2"><i class="ph-bold ph-vinyl-record mr-1"></i>Discos en stock (${inStockCount})</p>
                                        <div class="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                            ${stockItemsHtml || '<p class="text-[10px] text-slate-500 text-center py-2">Sin items</p>'}
                                            ${stockOverflowHtml}
                                        </div>
                                    </div>
                                    ` : ''}
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

        // Close info popovers on click outside
        document.addEventListener('click', function closeInfoPopovers(e) {
            if (!e.target.closest('[id^="info-wrap-"]')) {
                document.querySelectorAll('[id^="info-pop-"]').forEach(p => {
                    p.classList.add('hidden', 'opacity-0');
                    p.classList.remove('opacity-100');
                });
            }
        }, { once: false });
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

        db.collection('sales').doc(saleId).update(updateData)
            .then(() => {
                this.showToast(newStatus === 'paid' ? '✅ Venta marcada como PAGADA' : '✅ Venta marcada como PENDIENTE');
                this.loadData();
            })
            .catch(err => {
                console.error(err);
                this.showToast('❌ Error al actualizar: ' + err.message, 'error');
            });
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
        // Hide results list
        const resultsContainer = document.getElementById('discogs-results');
        if (resultsContainer) resultsContainer.classList.add('hidden');

        const parts = release.title.split(' - ');
        const artist = parts[0] || '';
        const album = parts.slice(1).join(' - ') || release.title;

        const form = document.querySelector('#modal-overlay form');
        if (!form) return;

        // Auto-check Discogs publishing toggle if present
        // if (form.publish_discogs && !form.publish_discogs.checked) {
        //     form.publish_discogs.checked = true;
        // }

        // Set basic info immediately
        if (form.artist) form.artist.value = artist;
        if (form.album) form.album.value = album;
        if (form.year && release.year) form.year.value = release.year;

        // Set Image
        if (release.thumb || release.cover_image) {
            const imgUrl = release.cover_image || release.thumb;
            const input = document.getElementById('input-cover-image');
            const preview = document.getElementById('cover-preview');
            if (input) input.value = imgUrl;
            if (preview) {
                const img = preview.querySelector('img');
                const placeholder = document.getElementById('cover-placeholder');
                if (img) {
                    img.src = imgUrl;
                    img.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
            }
        }

        // Save Discogs IDs
        const releaseIdInput = document.getElementById('input-discogs-id');
        if (releaseIdInput && release.id) releaseIdInput.value = release.id;

        // Set Discogs URL for hidden field
        if (release.uri || release.resource_url) {
            const uri = release.uri || release.resource_url;
            const fullUrl = uri.startsWith('http') ? uri : 'https://www.discogs.com' + uri;
            const urlInput = document.getElementById('input-discogs-url');
            if (urlInput) urlInput.value = fullUrl;
        }

        // Fetch FULL release details
        if (release.id) {
            const metadataArea = document.getElementById('discogs-metadata-area');
            const tracksList = document.getElementById('metadata-tracks');
            const tagsContainer = document.getElementById('metadata-tags');
            const discogsLink = document.getElementById('discogs-link');

            console.log("Metadata Area Found:", !!metadataArea);

            // SHOW METADATA AREA IMMEDIATELY
            if (metadataArea) {
                metadataArea.classList.remove('hidden');
                metadataArea.style.display = 'grid'; // Force display
            }

            if (tracksList) tracksList.innerHTML = '<p class="text-[10px] text-slate-400 animate-pulse">Loading tracks...</p>';

            this.showToast('⏳ Cargando detalles...', 'info');
            fetch(`${BASE_API_URL}/discogs/release/${release.id}`)
                .then(res => res.json())
                .then(data => {
                    const fullRelease = data.release || data;
                    console.log("Full Release Data:", fullRelease);

                    // Force show again in case it was hidden
                    if (metadataArea) {
                        metadataArea.classList.remove('hidden');
                        metadataArea.style.display = 'grid';
                    }

                    // Set Discogs Link UI
                    if (discogsLink && fullRelease.uri) {
                        const fullUrl = fullRelease.uri.startsWith('http') ? fullRelease.uri : 'https://www.discogs.com' + fullRelease.uri;
                        discogsLink.href = fullUrl;
                        discogsLink.classList.remove('hidden');
                        discogsLink.style.display = 'flex'; // Force display
                    }

                    // Render Styles (up to 3)
                    const rawGenres = fullRelease.styles || [];
                    const uniqueGenres = [...new Set(rawGenres)];
                    if (tagsContainer) {
                        tagsContainer.innerHTML = uniqueGenres.map(g => `<span class="meta-chip border border-slate-200">${g}</span>`).join('');
                    }

                    // Auto-populate genre input fields from Discogs (up to 3)
                    for (let gi = 0; gi < Math.min(uniqueGenres.length, 3); gi++) {
                        const genreInput = document.getElementById(`genre-${gi + 1}`);
                        if (genreInput) genreInput.value = uniqueGenres[gi];
                    }

                    // Render Tracklist
                    if (tracksList) {
                        if (fullRelease.tracklist && fullRelease.tracklist.length > 0) {
                            // Populate Hidden Input
                            const tracksInput = document.getElementById('input-tracks');
                            if (tracksInput) tracksInput.value = JSON.stringify(fullRelease.tracklist);

                            tracksList.innerHTML = fullRelease.tracklist.map(t => `
                                <div class="track-item flex justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
                                    <span class="font-bold w-6 opacity-40 shrink-0 capitalize text-[9px]">${t.position || '•'}</span>
                                    <span class="flex-1 truncate font-medium text-slate-600 text-[10px]">${t.title}</span>
                                    <span class="opacity-40 text-[9px] font-mono shrink-0">${t.duration || ''}</span>
                                </div>
                            `).join('');
                        } else {
                            tracksList.innerHTML = '<p class="text-[10px] text-slate-400 italic">No tracks found.</p>';
                        }
                    }

                    // Populate label for record
                    if (form.label && fullRelease.labels && fullRelease.labels.length > 0) {
                        form.label.value = fullRelease.labels[0].name;
                    }
                })
                .catch(err => {
                    console.error("Error fetching full release:", err);
                    if (tracksList) tracksList.innerHTML = '<p class="text-[10px] text-red-400">Error loading tracklist.</p>';
                });
        }
    },


    openTracklistModal(sku) {
        const item = this.state.inventory.find(i => i.id === sku || i.sku === sku);
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
                .then(response => {
                    // Backend wraps response in { success, release }, unwrap it
                    const data = response.release || response;
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
                                            <button onclick="app.setReadyForPickup('${s.id}', event)" class="bg-brand-dark text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto">
                                                <i class="ph-bold ph-bell"></i> Notificar Listo
                                            </a>
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
                                            <button onclick="app.markAsDelivered('${s.id}', event)" class="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto">
                                                <i class="ph-bold ph-hand-tap"></i> Ya lo Retiró
                                            </a>
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

    async setReadyForPickup(id, event) {
        try {
            const currentEvent = event || window.event;
            const btn = currentEvent?.target?.closest('button');
            if (btn) {
                btn.disabled = true;
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="ph-bold ph-circle-notch animate-spin"></i> Notificando...';
            }

            const response = await fetch(`${BASE_API_URL}/api/ready-for-pickup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: id })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showToast('✅ Cliente notificado - El pedido está listo para retiro');
                await this.loadData();
                
                // If we are in the detail modal, refresh it
                const unifiedModal = document.getElementById('unified-modal');
                if (unifiedModal) {
                    unifiedModal.remove();
                    this.openUnifiedOrderDetailModal(id);
                } else {
                    this.refreshCurrentView();
                }
            } else {
                throw new Error(result.error || result.message || 'Error al notificar');
            }
        } catch (error) {
            console.error("Error in setReadyForPickup:", error);
            this.showToast('❌ Error: ' + error.message, 'error');
            const currentEvent = event || window.event;
            const btn = currentEvent?.target?.closest('button');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-bell"></i> Notificar Listo';
            }
        }
    },

    async markAsDelivered(id, event) {
        try {
            const currentEvent = event || window.event;
            const btn = currentEvent?.target?.closest('button');
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
        const selectedQuarter = this.state.vatReportQuarter !== undefined ? this.state.vatReportQuarter : currentQuarter;
        const selectedYear = this.state.vatReportYear || currentYear;

        // Calculate date range (quarter=0 means full year)
        let startDate, endDate;
        if (selectedQuarter === 0) {
            startDate = new Date(selectedYear, 0, 1);
            endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
        } else {
            const quarterStartMonth = (selectedQuarter - 1) * 3;
            startDate = new Date(selectedYear, quarterStartMonth, 1);
            endDate = new Date(selectedYear, quarterStartMonth + 3, 0, 23, 59, 59);
        }

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

                let origin = item.providerOrigin || item.provider_origin;

                // If cost is 0 or origin missing, try to find it from the inventory
                if (cost === 0 || !origin) {
                    const inventoryProduct = this.state.inventory.find(p =>
                        (productId && (p.id === productId || p.sku === productId)) ||
                        (albumName && p.album === albumName)
                    );
                    if (inventoryProduct) {
                        if (cost === 0) cost = inventoryProduct.cost || 0;
                        if (!origin) origin = inventoryProduct.provider_origin || 'Local_Used';
                    }
                }
                if (!origin) origin = 'Local_Used'; // fallback
                const qty = item.qty || item.quantity || 1;
                const totalPrice = price * qty;
                const totalCost = cost * qty;

                if (origin === 'EU_B2B' || origin === 'DK_B2B') {
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

        // ── Add Extra Income to VAT Report ──
        const filteredExtraIncome = (this.state.extraIncome || []).filter(e => {
            const eDate = new Date(e.date);
            return eDate >= startDate && eDate <= endDate;
        });
        filteredExtraIncome.forEach(e => {
            const amt = Number(e.amount) || 0;
            const vat = Number(e.vatAmount) || 0;
            totalStandardVat += vat;
            totalNetSales += (amt - vat);
            standardVatItems.push({
                date: new Date(e.date),
                productId: 'EXTRA',
                album: `💰 ${e.description || 'Ingreso Extra'} (${e.category || 'other'})`,
                salePrice: amt,
                vat: vat
            });
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

        // ── Micro-IVA: Calculate Phantom VAT from EU B2B acquisitions (REVERSE CHARGE) ──
        // Uses acquisition_date (invoice date) for quarterly SKAT assignment
        // IMPORTANT: Reverse Charge means phantom VAT goes on BOTH sides:
        //   - Liability: Rubrik A (Moms af varekøb i udlandet)
        //   - Deduction: Købsmoms
        //   Net effect on Moms Tilsvar = 0
        const phantomVatItems = (this.state.inventory || []).filter(p => {
            if (!p.item_phantom_vat || p.item_phantom_vat <= 0 || p.provider_origin !== 'EU_B2B') return false;
            const acqDate = p.acquisition_date ? new Date(p.acquisition_date) : null;
            if (!acqDate) return false;
            return acqDate >= startDate && acqDate <= endDate;
        });
        const totalPhantomVat = phantomVatItems.reduce((sum, p) => sum + (p.item_phantom_vat || 0), 0);

        // ── Micro-IVA: Calculate Real VAT from DK B2B acquisitions ──
        // DK invoices carry actual 25% VAT → goes ONLY to Købsmoms (pure deduction)
        // Anti-duplicación: si el lote ya deduce su IVA vía un gasto con tratamiento 'dk',
        // los discos de ese lote no vuelven a deducir por micro-IVA (el gasto ya lo reclama).
        const dkClaimedLots = new Set((this.state.expenses || [])
            .filter(e => e.vat_treatment === 'dk' && e.lotRef)
            .map(e => e.lotRef));
        const dkB2bVatItems = (this.state.inventory || []).filter(p => {
            if (!p.item_real_vat || p.item_real_vat <= 0 || p.provider_origin !== 'DK_B2B') return false;
            if (p.lot && dkClaimedLots.has(p.lot)) return false;
            const acqDate = p.acquisition_date ? new Date(p.acquisition_date) : null;
            if (!acqDate) return false;
            return acqDate >= startDate && acqDate <= endDate;
        });
        const totalDkB2bVat = dkB2bVatItems.reduce((sum, p) => sum + (p.item_real_vat || 0), 0);

        // Liability side: Sales VAT + EU Reverse Charge (Rubrik A)
        const totalVatLiability = totalVatToPaySalida + totalPhantomVat;

        // Deduction side: Expenses + EU Reverse Charge + DK B2B real VAT
        const totalInputVat = totalGeneralInputVat + totalShippingExpenseVat + totalPhantomVat + totalDkB2bVat;

        // Final Moms Tilsvar = Liability - Deductions
        // EU phantom VAT cancels out (appears on both sides). DK_B2B is pure deduction.
        const totalVatToPayFinal = totalVatLiability - totalInputVat;

        // Logistics Net Logic
        const netoEnvios = totalShippingIncome - totalShippingExpenseGross;

        // Calculate Payment Deadline (Danish Quarterly Rules)
        const deadlines = {
            0: `Resumen anual ${selectedYear}`,
            1: `1 de junio, ${selectedYear}`,
            2: `1 de septiembre, ${selectedYear}`,
            3: `1 de diciembre, ${selectedYear}`,
            4: `1 de marzo, ${selectedYear + 1}`
        };
        const paymentDeadline = deadlines[selectedQuarter];
        const periodLabel = selectedQuarter === 0 ? `Año ${selectedYear}` : `Q${selectedQuarter} ${selectedYear}`;

        // Status Logic (Defaulting to "Pendiente" as we don't store declared status yet)
        const statusLabel = selectedQuarter === 0 ? 'Anual' : 'Pendiente';
        const statusColor = selectedQuarter === 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500';

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
                        <div class="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1">
                            <select id="vat-year-select" onchange="app.updateVATQuarter()" class="bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600 outline-none cursor-pointer">
                                ${[currentYear, currentYear - 1, currentYear - 2].map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
                            </select>
                            <select id="vat-quarter-select" onchange="app.updateVATQuarter()" class="bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600 outline-none cursor-pointer">
                                <option value="0" ${selectedQuarter === 0 ? 'selected' : ''}>Todo el año</option>
                                <option value="1" ${selectedQuarter === 1 ? 'selected' : ''}>Q1</option>
                                <option value="2" ${selectedQuarter === 2 ? 'selected' : ''}>Q2</option>
                                <option value="3" ${selectedQuarter === 3 ? 'selected' : ''}>Q3</option>
                                <option value="4" ${selectedQuarter === 4 ? 'selected' : ''}>Q4</option>
                            </select>
                        </div>

                        <button onclick="app.downloadVATAuditReport()" class="flex-1 lg:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                            <i class="ph-bold ph-file-csv"></i>
                            Exportar Auditoría
                        </a>
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

                    <!-- Tarjeta B: Salgsmoms + Rubrik A (IVA Liability Total) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Salgsmoms + Rubrik A</p>
                            <span class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-bold ph-arrow-up-right"></i></span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(totalVatLiability)}</p>
                        <div class="mt-3 space-y-1">
                            <p class="text-[11px] text-slate-400 font-medium">Ventas + Envíos: ${this.formatCurrency(totalVatToPaySalida)}</p>
                            ${totalPhantomVat > 0 ? `<p class="text-[11px] text-blue-500 font-bold">Rubrik A (EU-Moms): + ${this.formatCurrency(totalPhantomVat)}</p>` : ''}
                        </div>
                    </div>

                    <!-- Tarjeta C: Købsmoms (IVA Deducible) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Købsmoms</p>
                            <span class="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-bold ph-arrow-down-left"></i></span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(totalInputVat)}</p>
                        <p class="text-[11px] text-slate-400 mt-4 leading-relaxed font-medium">IVA soportado: Gastos, Envíos, Stock DK + EU Reverse Charge.</p>
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

                        ${totalPhantomVat > 0 ? `
                        <div>
                            <div class="flex items-center gap-2 mb-4">
                                <h3 class="text-sm font-bold text-blue-500 uppercase tracking-widest">EU Reverse Charge (Rubrik A)</h3>
                                <div class="h-px flex-1 bg-blue-100"></div>
                            </div>
                            <div class="bg-blue-50 rounded-3xl shadow-sm border border-blue-100 overflow-hidden">
                                <div class="p-5 flex items-center justify-between border-b border-blue-100">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-lg">
                                            <i class="ph-bold ph-arrows-left-right"></i>
                                        </div>
                                        <div>
                                            <p class="font-bold text-blue-800">Moms af varekøb i udlandet</p>
                                            <p class="text-[10px] text-blue-500 uppercase font-bold tracking-tighter">${phantomVatItems.length} producto${phantomVatItems.length > 1 ? 's' : ''} EU B2B · Efecto neto: 0</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xl font-bold text-blue-700">${this.formatCurrency(totalPhantomVat)}</p>
                                        <p class="text-[10px] text-blue-500 font-bold">± Ambos lados</p>
                                    </div>
                                </div>
                                <div class="px-5 py-2 bg-blue-100/40 border-b border-blue-100 flex gap-6 text-[10px] font-bold">
                                    <span class="text-red-500">▲ Liability: +${this.formatCurrency(totalPhantomVat)}</span>
                                    <span class="text-emerald-600">▼ Købsmoms: -${this.formatCurrency(totalPhantomVat)}</span>
                                    <span class="text-blue-600">= Neto: ${this.formatCurrency(0)}</span>
                                </div>
                                <div class="divide-y divide-blue-100/50 max-h-48 overflow-y-auto">
                                    ${phantomVatItems.map(p => `
                                    <div class="px-5 py-3 flex items-center justify-between hover:bg-blue-100/30 transition-colors">
                                        <div>
                                            <p class="text-xs font-bold text-blue-800">${p.artist || ''} — ${p.album || ''}</p>
                                            <p class="text-[10px] text-blue-500">Costo: ${this.formatCurrency(p.cost || 0)} · Factura: ${p.acquisition_date || '-'}</p>
                                        </div>
                                        <span class="text-xs font-bold text-blue-700">${this.formatCurrency(p.item_phantom_vat)}</span>
                                    </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        ${totalDkB2bVat > 0 ? `
                        <div>
                            <div class="flex items-center gap-2 mb-4">
                                <h3 class="text-sm font-bold text-emerald-500 uppercase tracking-widest">Stock DK B2B (Købsmoms)</h3>
                                <div class="h-px flex-1 bg-emerald-100"></div>
                            </div>
                            <div class="bg-emerald-50 rounded-3xl shadow-sm border border-emerald-100 overflow-hidden">
                                <div class="p-5 flex items-center justify-between border-b border-emerald-100">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-lg">
                                            <i class="ph-bold ph-receipt"></i>
                                        </div>
                                        <div>
                                            <p class="font-bold text-emerald-800">IVA Facturas DK Deducible</p>
                                            <p class="text-[10px] text-emerald-500 uppercase font-bold tracking-tighter">${dkB2bVatItems.length} producto${dkB2bVatItems.length > 1 ? 's' : ''} DK B2B</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xl font-bold text-emerald-700">${this.formatCurrency(totalDkB2bVat)}</p>
                                        <p class="text-[10px] text-emerald-500 font-bold">Deducción pura</p>
                                    </div>
                                </div>
                                <div class="divide-y divide-emerald-100/50 max-h-48 overflow-y-auto">
                                    ${dkB2bVatItems.map(p => `
                                    <div class="px-5 py-3 flex items-center justify-between hover:bg-emerald-100/30 transition-colors">
                                        <div>
                                            <p class="text-xs font-bold text-emerald-800">${p.artist || ''} — ${p.album || ''}</p>
                                            <p class="text-[10px] text-emerald-500">Costo: ${this.formatCurrency(p.cost || 0)} · Factura: ${p.acquisition_date || '-'}</p>
                                        </div>
                                        <span class="text-xs font-bold text-emerald-700">${this.formatCurrency(p.item_real_vat)}</span>
                                    </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        ` : ''}
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

        // ==========================================
        // 1. SALES LEDGER (Salgsmoms)
        // ==========================================
        const filteredSales = this.state.sales.filter(sale => {
            const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp || sale.date);
            return saleDate >= startDate && saleDate <= endDate;
        });

        const salesRows = [];
        let salesCounter = 1;

        filteredSales.forEach(sale => {
            const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp || sale.date);
            const dateStr = saleDate.toISOString().slice(0, 10).replace(/-/g, '');
            const channel = sale.channel || 'N/A';
            const items = sale.items || [];

            items.forEach(item => {
                const price = item.priceAtSale || item.price || 0;
                let cost = item.costAtSale || item.cost || 0;
                const productId = item.productId || item.recordId;
                const albumName = item.album;
                
                let providerOrigin = 'Local_Used';
                let acquisitionDate = 'N/A';

                // Lookup extra data from inventory
                const inventoryProduct = this.state.inventory.find(p =>
                    (productId && (p.id === productId || p.sku === productId)) ||
                    (albumName && p.album === albumName)
                );
                if (inventoryProduct) {
                    cost = cost === 0 ? (inventoryProduct.cost || 0) : cost;
                    providerOrigin = inventoryProduct.provider_origin || 'Local_Used';
                    if (inventoryProduct.acquisition_date) {
                        acquisitionDate = new Date(inventoryProduct.acquisition_date).toISOString().slice(0, 10);
                    }
                }

                const qty = item.qty || item.quantity || 1;
                const origin = item.providerOrigin || providerOrigin;
                const isB2B = origin === 'EU_B2B' || origin === 'DK_B2B';
                const totalPrice = price * qty;
                const totalCost = cost * qty;

                // Calculation logic
                let calculationBasis, outputVAT, schemeApplied;
                if (isB2B) {
                    calculationBasis = totalPrice;
                    outputVAT = totalPrice * 0.20; // 25% of net -> 20% of gross
                    schemeApplied = 'Standard Rate';
                } else {
                    const margin = totalPrice - totalCost;
                    calculationBasis = margin > 0 ? margin : 0;
                    outputVAT = margin > 0 ? margin * 0.20 : 0; 
                    schemeApplied = 'Margin Scheme';
                }

                const acqDateObj = inventoryProduct && inventoryProduct.acquisition_date ? new Date(inventoryProduct.acquisition_date) : null;
                const isAcquiredInPeriod = acqDateObj && acqDateObj >= startDate && acqDateObj <= endDate;
                
                const phantomVatVal = (isAcquiredInPeriod && providerOrigin === 'EU_B2B') ? (inventoryProduct.item_phantom_vat || 0) : 0;
                const inputVatVal = isAcquiredInPeriod ? (providerOrigin === 'DK_B2B' ? (inventoryProduct.item_real_vat || 0) : phantomVatVal) : 0;

                salesRows.push({
                    transactionId: `ECR-${dateStr}-${String(salesCounter).padStart(4, '0')}`,
                    date: saleDate.toISOString().slice(0, 10),
                    channel: channel,
                    productName: `${item.album || 'N/A'} - ${item.artist || 'N/A'}`,
                    sku: item.sku || productId || 'N/A',
                    providerOrigin: providerOrigin,
                    acquisitionDate: acquisitionDate,
                    condition: condition,
                    costPrice: totalCost.toFixed(2),
                    salesPrice: totalPrice.toFixed(2),
                    calculationBasis: calculationBasis.toFixed(2),
                    schemeApplied: schemeApplied,
                    outputVat: outputVAT.toFixed(2),
                    euPhantomVat: phantomVatVal.toFixed(2),
                    inputVat: inputVatVal.toFixed(2)
                });
                salesCounter++;
            });

            // Add Shipping Income to Sales Audit
            const shippingIncome = parseFloat(sale.shipping_income || sale.shipping || sale.shipping_cost || 0);
            if (shippingIncome > 0) {
                salesRows.push({
                    transactionId: `ECR-SHIP-${dateStr}-${String(salesCounter).padStart(4, '0')}`,
                    date: saleDate.toISOString().slice(0, 10),
                    channel: channel,
                    productName: `Envío Cobrado - Orden: ${sale.orderNumber || 'N/A'}`,
                    sku: 'SHIPPING',
                    providerOrigin: 'N/A',
                    acquisitionDate: 'N/A',
                    condition: 'Service',
                    costPrice: '0.00',
                    salesPrice: shippingIncome.toFixed(2),
                    calculationBasis: shippingIncome.toFixed(2),
                    schemeApplied: 'Standard Rate',
                    outputVat: (shippingIncome * 0.20).toFixed(2),
                    euPhantomVat: '0.00',
                    inputVat: '0.00'
                });
                salesCounter++;
            }
        });

        // ==========================================
        // 2. PURCHASES LEDGER (Købsmoms & Rubrik A)
        // ==========================================
        const purchaseRows = [];
        let purchaseCounter = 1;

        // A. General Expenses (Købsmoms)
        const deductibleExpenses = this.state.expenses.filter(e => {
            const expDate = e.fecha_factura ? new Date(e.fecha_factura) : (e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp || e.date));
            const isDeductible = e.categoria_tipo === 'operativo' || e.categoria_tipo === 'stock_nuevo' || e.is_vat_deductible;
            return isDeductible && expDate >= startDate && expDate <= endDate;
        });

        deductibleExpenses.forEach(exp => {
            const expDate = exp.fecha_factura ? new Date(exp.fecha_factura) : (exp.timestamp?.toDate ? exp.timestamp.toDate() : new Date(exp.timestamp || exp.date));
            const dateStr = expDate.toISOString().slice(0, 10).replace(/-/g, '');
            
            purchaseRows.push({
                transactionId: `ECP-EXP-${dateStr}-${String(purchaseCounter).padStart(4, '0')}`,
                invoiceDate: expDate.toISOString().slice(0, 10),
                category: exp.categoria === 'envios' ? 'Shipping Expense' : 'Operational Expense',
                vendor: exp.proveedor || exp.nombre || 'N/A',
                description: exp.descripcion || exp.categoria || 'N/A',
                sku: 'N/A',
                grossAmount: parseFloat(exp.monto_total || 0).toFixed(2),
                euPhantomVat: '0.00', // Only for EU B2B
                inputVat: parseFloat(exp.monto_iva || 0).toFixed(2)
            });
            purchaseCounter++;
        });

        // B. Stock Acquisitions (Micro-IVA: EU_B2B & DK_B2B)
        const inventoryAcquisitions = (this.state.inventory || []).filter(p => {
            const isB2b = p.provider_origin === 'EU_B2B' || p.provider_origin === 'DK_B2B';
            if (!isB2b) return false;
            const acqDate = p.acquisition_date ? new Date(p.acquisition_date) : null;
            if (!acqDate) return false;
            return acqDate >= startDate && acqDate <= endDate;
        });

        inventoryAcquisitions.forEach(item => {
            const acqDate = new Date(item.acquisition_date);
            const dateStr = acqDate.toISOString().slice(0, 10).replace(/-/g, '');
            const cost = parseFloat(item.cost || 0);

            const phantomVat = item.provider_origin === 'EU_B2B' ? (item.item_phantom_vat || 0) : 0;
            const inputVat = item.provider_origin === 'DK_B2B' ? (item.item_real_vat || 0) : phantomVat; // In EU_B2B, input VAT equals phantom VAT

            purchaseRows.push({
                transactionId: `ECP-INV-${dateStr}-${String(purchaseCounter).padStart(4, '0')}`,
                invoiceDate: acqDate.toISOString().slice(0, 10),
                category: `Stock Import (${item.provider_origin})`,
                vendor: item.provider_origin,
                description: `${item.album || 'N/A'} - ${item.artist || 'N/A'}`,
                sku: item.sku || 'N/A',
                grossAmount: cost.toFixed(2),
                euPhantomVat: phantomVat.toFixed(2), // Liability Side (Rubrik A)
                inputVat: inputVat.toFixed(2)        // Deduction Side (Købsmoms)
            });
            purchaseCounter++;
        });

        // ==========================================
        // 3. EXPORT LOGIC
        // ==========================================
        const BOM = '\uFEFF';
        
        // Helper to format rows to CSV string
        const buildCsvString = (headers, rows) => {
            return [
                headers.join(','),
                ...rows.map(row => headers.map(h => {
                    const key = Object.keys(row)[headers.indexOf(h)];
                    const val = String(row[key] || '');
                    return `"${val.replace(/"/g, '""')}"`;
                }).join(','))
            ].join('\n');
        };

        const salesHeaders = [
            'Transaction ID', 'Transaction Date', 'Sales Channel', 'Product Name', 
            'SKU / Item ID', 'Provider Origin', 'Acquisition Date', 'Condition', 
            'Cost Price (DKK)', 'Sales Price (DKK)', 'Calculation Basis (DKK)', 
            'VAT Scheme Applied', 'Output VAT / Salgsmoms (DKK)', 
            'EU Phantom VAT / Rubrik A (DKK)', 'Input VAT / Købsmoms (DKK)'
        ];

        const purchaseHeaders = [
            'Transaction ID', 'Invoice Date', 'Category', 'Vendor / Origin', 
            'Description', 'SKU / Item ID', 'Gross Amount / Cost (DKK)', 
            'EU Phantom VAT / Rubrik A (DKK)', 'Input VAT / Købsmoms (DKK)'
        ];

        const salesCsvContent = buildCsvString(salesHeaders, salesRows);
        const purchaseCsvContent = buildCsvString(purchaseHeaders, purchaseRows);

        // Download Sales file
        const blob1 = new Blob([BOM + salesCsvContent], { type: 'text/csv;charset=utf-8;' });
        const link1 = document.createElement('a');
        link1.href = URL.createObjectURL(blob1);
        link1.download = `Sales_VAT_Ledger_Q${selectedQuarter}_${selectedYear}.csv`;
        link1.style.display = 'none';
        document.body.appendChild(link1);
        link1.click();
        
        // Download Purchases file (with slight delay to allow browser to process both)
        setTimeout(() => {
            const blob2 = new Blob([BOM + purchaseCsvContent], { type: 'text/csv;charset=utf-8;' });
            const link2 = document.createElement('a');
            link2.href = URL.createObjectURL(blob2);
            link2.download = `Purchases_VAT_Ledger_Q${selectedQuarter}_${selectedYear}.csv`;
            link2.style.display = 'none';
            document.body.appendChild(link2);
            link2.click();
            
            document.body.removeChild(link1);
            document.body.removeChild(link2);
            URL.revokeObjectURL(link1.href);
            URL.revokeObjectURL(link2.href);
        }, 300);

        this.showToast(`✅ Exported ${salesRows.length} sales & ${purchaseRows.length} purchase records.`);
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
                ${this.sectionHeader({
                    title: 'Inversiones',
                    subtitle: 'Registro de inversiones de los socios · Total: ' + this.formatCurrency(grandTotal),
                    primary: { label: 'Nueva Inversión', icon: 'ph-plus', onclick: "app.openAddInvestmentModal()" }
                })}

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
                                        <th class="p-4">Gasto vinculado</th>
                                        <th class="p-4 text-right">Monto</th>
                                        <th class="p-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${partnerInvestments.length === 0 ? `
                                        <tr>
                                            <td colspan="5" class="p-8 text-center text-slate-400 italic">
                                                Sin inversiones registradas
                                            </td>
                                        </tr>
                                    ` : partnerInvestments.map(inv => {
                                        const linkedExpense = inv.expenseId ? (this.state.expenses || []).find(x => x.id === inv.expenseId) : null;
                                        return `
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-4 text-sm text-slate-500">${this.formatDate(inv.date)}</td>
                                            <td class="p-4 text-sm font-medium text-brand-dark">${inv.description}</td>
                                            <td class="p-4">${this.investmentExpenseBadge(inv, linkedExpense)}</td>
                                            <td class="p-4 text-sm font-bold text-brand-orange text-right">${this.formatCurrency(inv.amount)}</td>
                                            <td class="p-4 text-center whitespace-nowrap">
                                                <button onclick="app.openEditInvestmentModal('${inv.id}')" class="text-slate-400 hover:text-brand-orange transition-colors mr-3" title="Editar">
                                                    <i class="ph-bold ph-pencil-simple"></i>
                                                </button>
                                                <button onclick="app.deleteInvestment('${inv.id}')" class="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                                                    <i class="ph-bold ph-trash"></i>
                                                </button>
                                            </td>
                                        </tr>`;
                                    }).join('')}
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

    // Badge del gasto vinculado a una inversión (clicable → va al gasto; icono si hay comprobante)
    investmentExpenseBadge(inv, linkedExpense) {
        if (!inv.expenseId) return `<span class="text-slate-300 text-xs">—</span>`;
        if (!linkedExpense) return `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">Gasto no encontrado</span>`;
        const prov = linkedExpense.proveedor || linkedExpense.supplier || 'Gasto';
        const amt = this.formatCurrency(linkedExpense.monto_total || 0);
        const receiptUrl = linkedExpense.receiptUrl || linkedExpense.comprobante || '';
        const desc = (linkedExpense.descripcion || '').slice(0, 40);
        return `
            <div class="flex items-center gap-1.5">
                <button onclick="app.goToExpense('${linkedExpense.id}')" class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 whitespace-nowrap transition-colors" title="${desc ? desc + ' · ' : ''}Ir al gasto">
                    <i class="ph-bold ph-receipt"></i> ${prov} · ${amt}
                </button>
                ${receiptUrl ? `<a href="${receiptUrl}" target="_blank" class="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-brand-orange hover:bg-orange-50 flex items-center justify-center transition-colors" title="Abrir comprobante"><i class="ph-bold ph-paperclip"></i></a>` : ''}
            </div>`;
    },

    goToExpense(expenseId) {
        const x = (this.state.expenses || []).find(e => e.id === expenseId);
        if (x) {
            const d = new Date(((x.fecha_factura || x.date) || '') + 'T00:00:00');
            if (!isNaN(d)) {
                this.state.expenseFilterYear = d.getFullYear();
                this.state.expenseFilterMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
            }
        }
        this.state.expensesSearch = '';
        this.state.expenseCategoryFilter = 'all';
        this.state.expenseMissingReceiptOnly = false;
        this.state.expenseIdHighlight = expenseId;
        this.navigate('expenses');
        setTimeout(() => {
            const el = document.getElementById('expense-' + expenseId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
    },

    openAddInvestmentModal() {
        this.openInvestmentModal(null);
    },

    openEditInvestmentModal(id) {
        this.openInvestmentModal(id);
    },

    openInvestmentModal(id) {
        const partners = ['Alejo', 'Facundo', 'Rafael'];
        const today = new Date().toISOString().split('T')[0];
        const inv = id ? (this.state.investments || []).find(x => x.id === id) : null;
        const isEdit = !!inv;
        const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const expenses = (this.state.expenses || []).slice()
            .sort((a, b) => new Date(b.fecha_factura || b.date || 0) - new Date(a.fecha_factura || a.date || 0));
        const expenseOptions = expenses.map(x => {
            const prov = x.proveedor || x.supplier || 'Sin proveedor';
            const d = x.fecha_factura || x.date || '';
            const desc = (x.descripcion || '').slice(0, 35);
            const sel = inv && inv.expenseId === x.id ? 'selected' : '';
            return `<option value="${x.id}" ${sel}>${esc(d)} · ${esc(prov)} · ${esc(desc)} · ${this.formatCurrency(x.monto_total || 0)}</option>`;
        }).join('');

        const modalHtml = `
            <div id="add-investment-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onclick="if(event.target === this) this.remove()">
                <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
                    <div class="bg-brand-dark p-6 text-white">
                        <h2 class="font-display font-bold text-xl">${isEdit ? 'Editar Inversión' : 'Nueva Inversión'}</h2>
                        <p class="text-white/60 text-sm">${isEdit ? 'Modificar aporte de socio' : 'Registrar aporte de socio'}</p>
                    </div>
                    <form onsubmit="app.saveInvestment(event)" class="p-6 space-y-4">
                        <input type="hidden" name="investmentId" value="${inv ? inv.id : ''}">
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Socio</label>
                            <select name="partner" required class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange transition-all">
                                ${partners.map(p => `<option value="${p}" ${inv && inv.partner === p ? 'selected' : ''}>${p}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Monto (DKK)</label>
                            <input type="number" name="amount" required step="0.01" min="0" placeholder="1000" value="${inv ? esc(inv.amount) : ''}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange transition-all">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Descripción</label>
                            <input type="text" name="description" required placeholder="Compra de vinilos, gastos locación, etc." value="${inv ? esc(inv.description) : ''}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange transition-all">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Fecha</label>
                            <input type="date" name="date" required value="${inv ? esc(inv.date) : today}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange transition-all">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-500 uppercase block mb-2">Gasto vinculado (Registro de Compras)</label>
                            <select name="expenseId" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange transition-all">
                                <option value="">Sin vincular</option>
                                ${expenseOptions}
                            </select>
                            <p class="text-[11px] text-slate-400 mt-1.5">Vincula esta inversión con el gasto y su factura correspondiente.</p>
                        </div>
                        <div class="flex gap-3 pt-4">
                            <button type="button" onclick="document.getElementById('add-investment-modal').remove()"
                                class="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" class="flex-1 py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                <i class="ph-bold ${isEdit ? 'ph-check' : 'ph-plus'}"></i> ${isEdit ? 'Guardar cambios' : 'Guardar'}
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
        const invId = form.investmentId && form.investmentId.value ? form.investmentId.value : null;
        const data = {
            partner: form.partner.value,
            amount: parseFloat(form.amount.value),
            description: form.description.value,
            date: form.date.value,
            expenseId: form.expenseId.value || null,
        };

        try {
            if (invId) {
                await db.collection('investments').doc(invId).update(data);
                document.getElementById('add-investment-modal').remove();
                this.showToast('✅ Inversión actualizada');
            } else {
                data.created_at = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('investments').add(data);
                document.getElementById('add-investment-modal').remove();
                this.showToast('✅ Inversión registrada');
            }
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

    // --- Envíos: flujo por pasos (kanban) ---
    // Un pedido es "retiro en tienda" si el método de envío es pickup o no se cobra envío
    isPickupOrder(s) {
        return (s.shipping_method?.id === 'local_pickup') ||
            (s.shipping_method && typeof s.shipping_method === 'string' && s.shipping_method.toLowerCase().includes('pickup')) ||
            (s.shippingMethod && s.shippingMethod.toLowerCase().includes('pickup')) ||
            (Number(s.shipping) === 0) ||
            (Number(s.shipping_cost) === 0) ||
            (Number(s.shipping_income) === 0);
    },

    // Motivos bloqueantes que mandan un pedido activo a la columna EXCEPCIÓN
    getShippingIssues(s) {
        const issues = [];
        const ci = this.getCustomerInfo(s);
        if (!this.isPickupOrder(s) && !ci.hasAddress) {
            issues.push('Falta dirección de envío');
        }
        if (!ci.email && !ci.phone) {
            issues.push('Sin datos de contacto');
        }
        return issues;
    },

    // Columna del kanban según fulfillment_status. Las excepciones tienen prioridad.
    shipKanbanColumn(s) {
        const fs = (s.fulfillment_status || '').toLowerCase();
        const closed = ['shipped', 'picked_up', 'delivered', 'fulfilled', 'canceled'];
        if (!closed.includes(fs) && this.getShippingIssues(s).length > 0) return 'excepcion';
        if (['preparing', 'ready_for_pickup', 'in_transit'].includes(fs)) return 'etiqueta';
        if (closed.includes(fs)) return 'despachado';
        return 'preparar';
    },

    // Tarjeta de pedido del kanban con datos completos del cliente
    renderShipCard(s) {
        const ci = this.getCustomerInfo(s);
        const col = this.shipKanbanColumn(s);
        const fs = (s.fulfillment_status || '').toLowerCase();
        const isPickup = this.isPickupOrder(s);
        const issues = this.getShippingIssues(s);
        const items = s.items || [];
        const displayName = ci.name && ci.name !== 'Cliente' ? ci.name : (ci.email || 'Cliente');
        const firstTitle = items[0] ? (items[0].album || items[0].title || items[0].name || 'Item') : '';
        const firstCover = items[0] ? this.resolveItemCover(items[0]) : null;

        // Bloque de datos del cliente: solo lo que existe, sin placeholders inventados
        const customerBlock = `
            ${ci.hasAddress ? `
            <div class="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 mt-2">
                <i class="ph-bold ph-map-pin text-slate-400 text-sm mt-0.5"></i>
                <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-snug">${ci.address}</span>
            </div>` : ''}
            ${(ci.phone || ci.email) ? `
            <div class="mt-2 space-y-1">
                ${ci.phone ? `<div class="flex items-center gap-2 text-xs text-slate-600"><i class="ph-bold ph-phone text-slate-400"></i><a href="tel:${ci.phone}" class="font-semibold hover:text-brand-orange">${ci.phone}</a></div>` : ''}
                ${ci.email ? `<div class="flex items-center gap-2 text-xs text-slate-600 truncate"><i class="ph-bold ph-envelope-simple text-slate-400"></i><span class="truncate font-medium" title="${ci.email}">${ci.email}</span></div>` : ''}
            </div>` : ''}`;

        // Acción contextual según la columna (patrón fulfillment por pasos)
        let actionBtn = '';
        if (col === 'preparar') {
            actionBtn = `<button onclick="app.updateFulfillmentStatus(event, '${s.id}', 'preparing')" class="w-full mt-3 px-3 py-2.5 rounded-xl bg-brand-dark text-white text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"><i class="ph-bold ph-package"></i>Iniciar preparación</button>`;
        } else if (col === 'etiqueta') {
            if (isPickup && fs === 'ready_for_pickup') {
                actionBtn = `<button onclick="app.markPickedUpDiscogs('${s.id}')" class="w-full mt-3 px-3 py-2.5 rounded-xl bg-brand-dark text-white text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"><i class="ph-bold ph-check-circle"></i>Confirmar recogida</button>`;
            } else if (isPickup) {
                actionBtn = `<button onclick="app.setReadyForPickup('${s.id}', event)" class="w-full mt-3 px-3 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"><i class="ph-bold ph-bell-ringing"></i>Lista para retiro</button>`;
            } else {
                actionBtn = `
                <div class="mt-3 space-y-2">
                    <input type="text" id="track-${s.id}" placeholder="Tracking # (opcional)" value="${s.tracking_number || ''}"
                        class="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none font-mono" onclick="event.stopPropagation()">
                    <button onclick="app.shipOrderFromKanban('${s.id}', 'track-${s.id}')" class="w-full px-3 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"><i class="ph-bold ph-paper-plane-tilt"></i>Marcar despachado</button>
                </div>`;
            }
        } else if (col === 'excepcion') {
            actionBtn = `<button onclick="app.openUnifiedOrderDetailModal('${s.id}')" class="w-full mt-3 px-3 py-2.5 rounded-xl bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"><i class="ph-bold ph-warning-circle"></i>Resolver problema</button>`;
        }

        return `
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    ${this.saleChannelBadge(s)}
                    <span class="font-bold text-sm text-brand-dark truncate">#${s.orderNumber || s.id.slice(0, 6)}</span>
                </div>
                <span class="text-[11px] text-slate-400 font-medium whitespace-nowrap">${this.formatDate(s.date)}</span>
            </div>
            <div class="mt-2 font-bold text-brand-dark text-[15px] truncate" title="${displayName}">${displayName}</div>
            <div class="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                ${firstCover
                    ? `<img src="${firstCover}" class="w-9 h-9 rounded-lg object-cover border border-slate-100 shrink-0" alt="">`
                    : `<i class="ph-bold ph-disc text-brand-orange"></i>`}
                <span class="font-bold text-slate-600">${items.length}</span>
                ${firstTitle ? `<span class="truncate">${firstTitle}${items.length > 1 ? ` <span class="text-slate-400">+${items.length - 1}</span>` : ''}</span>` : ''}
            </div>
            <div class="mt-1.5">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${isPickup ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}">
                    <i class="ph-bold ${isPickup ? 'ph-storefront' : 'ph-truck'}"></i>${isPickup ? 'Retiro' : 'Envío'}
                </span>
            </div>
            ${customerBlock}
            ${(!isPickup && col !== "despachado") ? this.ecPreflightBlock(s) : ""}
            ${issues.length > 0 ? `<div class="mt-2 flex flex-wrap gap-1.5">${issues.map(i => `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold"><i class="ph-bold ph-warning"></i>${i}</span>`).join('')}</div>` : ''}
            ${actionBtn}
            <button onclick="app.openUnifiedOrderDetailModal('${s.id}')" class="w-full mt-2 text-[11px] font-bold text-slate-400 hover:text-brand-orange transition-colors">Ver detalle</button>
        </div>`;
    },

    // Despacha desde el kanban: guarda tracking (si hay), notifica al comprador de Discogs y marca shipped
    async shipOrderFromKanban(saleId, inputId) {
        try {
            const input = document.getElementById(inputId);
            const tracking = input ? input.value.trim() : '';
            const sale = (this.state.sales || []).find(s => s.id === saleId);
            const ch = sale ? this.normalizeSaleChannel(sale) : '';
            if (tracking && ch === 'discogs') {
                await api.notifyShipped(saleId, tracking, null);
                this.showToast('Cliente notificado con el tracking');
            } else if (tracking) {
                await db.collection('sales').doc(saleId).update({ tracking_number: tracking });
            }
            await db.collection('sales').doc(saleId).update({ fulfillment_status: 'shipped' });
            this.showToast('Pedido marcado como despachado');
            await this.loadData();
            this.refreshCurrentView();
        } catch (e) {
            console.error('shipOrderFromKanban:', e);
            this.showToast('Error al despachar: ' + e.message, 'error');
        }
    },

    // Exporta la lista de envíos activos a CSV
    exportShippingList() {
        const rows = this.state.sales.filter(s => this.isShippableChannel(s));
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = [['Orden', 'Fecha', 'Canal', 'Cliente', 'Email', 'Teléfono', 'Dirección', 'Items', 'Total', 'Estado'].join(';')];
        rows.forEach(s => {
            const ci = this.getCustomerInfo(s);
            lines.push([s.orderNumber || s.id.slice(0, 8), s.date || '', this.normalizeSaleChannel(s), ci.name, ci.email, ci.phone, ci.address, (s.items || []).length, s.total || 0, s.fulfillment_status || 'pendiente'].map(q).join(';'));
        });
        const blob = new Blob(["\ufeff" + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `envios-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        this.showToast('Lista de envíos exportada');
    },

    // ============================================================
    // PRE-FLIGHT Shipmondo — estado efímero, alertas y modales
    // Spec: ~/workspace/your_files/shipmondo-preflight/shipmondo-preflight-validacion.md
    // ============================================================

    /* Estado efímero por pedido: peso, confirmación, método, service point, customs.
       Los datos del cliente viven en Firestore; esto solo guarda contexto de UI. */
    ecShipUI(saleId) {
        this._shipUI = this._shipUI || {};
        if (!this._shipUI[saleId]) this._shipUI[saleId] = {};
        return this._shipUI[saleId];
    },

    /* Arma el input de validación desde la venta + contexto de UI (derivado, no duplicado) */
    ecBuildShipmentInput(sale, ui = {}) {
        const c = sale.customer || {};
        const ship = c.shipping || {};
        let line1 = ship.line1 || "", line2 = ship.line2 || "";
        let zip = ship.postal_code || ship.zip || "", city = ship.city || "", country = ship.country || "";
        if (!line1 && !city && !zip) {
            // Formato legacy "calle número, CP ciudad, país" — parseo best-effort
            const parts = String(sale.address || c.address || "").split(",").map(s => s.trim()).filter(Boolean);
            if (parts[0]) line1 = parts[0];
            if (parts[1]) { const t = parts[1].split(/\s+/); zip = t[0] || ""; city = t.slice(1).join(" "); }
            if (parts[2]) country = parts[2];
        }
        return {
            receiver: {
                name: String(sale.customerName || c.name || "").trim(),
                address1: [line1, line2].filter(Boolean).join(", "),
                zipcode: String(zip).trim(),
                city: String(city).trim(),
                country_code: String(country).trim().toUpperCase(),
                email: String(sale.customerEmail || c.email || "").trim(),
                phone: String(c.phone || sale.customerPhone || sale.phone || "").trim(),
            },
            parcel: {
                weight: Number.isInteger(ui.weight) ? ui.weight : 500,
                weightConfirmed: ui.weightConfirmed === true,
            },
            shippingMethod: ui.shippingMethod || sale.shipping_method || "home",
            service_point: ui.servicePointId ? { id: ui.servicePointId } : undefined,
            customs: ui.customs || undefined,
        };
    },

    ecShipmentBlockers(saleId) {
        const sale = (this.state.sales || []).find(s => s.id === saleId);
        if (!sale) return [];
        return ecValidateShipment(this.ecBuildShipmentInput(sale, this.ecShipUI(saleId)));
    },

    /* Píldoras de alerta roja por cada dato faltante (clicables → modal rápido) */
    ecReadinessAlerts(saleId) {
        const blockers = this.ecShipmentBlockers(saleId);
        if (!blockers.length) {
            return `<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full"><i class="ph-bold ph-check-circle"></i>Listo para etiqueta</span>`;
        }
        return blockers.map(b => {
            const key = b.field.startsWith("customs") ? "customs" : b.field;
            const label = EC_FIELD_LABELS[key] || "Falta dato";
            const safeMsg = b.message.replace(/"/g, "&quot;");
            return `<button onclick="app.openQuickFixModal('${saleId}', '${key}')" title="${safeMsg}"
                class="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full cursor-pointer hover:bg-red-100 transition-colors">
                <i class="ph-bold ph-warning-circle"></i>${label}</button>`;
        }).join("");
    },

    /* Bloque Pre-Flight dentro de la tarjeta del kanban */
    ecPreflightBlock(s) {
        const ui = this.ecShipUI(s.id);
        const input = this.ecBuildShipmentInput(s, ui);
        const blockers = ecValidateShipment(input);
        const canGo = blockers.length === 0;
        const isShop = EC_SHOP_DELIVERY_METHODS.has(input.shippingMethod);
        const cc = input.receiver.country_code;
        const needsCustoms = cc && !EC_EU_COUNTRIES.has(cc);
        const firstBlocker = blockers.length ? blockers[0].message.replace(/"/g, "&quot;") : "";
        const weightConfirmed = !!ui.weightConfirmed;

        return `
        <div class="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3" onclick="event.stopPropagation()">
            <div class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <i class="ph-bold ph-shield-check"></i>Pre-Flight · Etiqueta Shipmondo
            </div>
            <div class="flex flex-wrap gap-1.5 mb-2.5">${this.ecReadinessAlerts(s.id)}</div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Peso (g)</label>
                    <div class="flex gap-1 mt-1">
                        <input type="number" min="1" step="1" value="${input.parcel.weight}"
                            onchange="app.ecOnWeightChange('${s.id}', this.value)" onclick="event.stopPropagation()"
                            class="w-full text-xs font-bold border ${weightConfirmed ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white"} rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange">
                        <button onclick="app.ecConfirmWeight('${s.id}')" title="Confirmar peso"
                            class="shrink-0 w-8 rounded-lg text-sm font-black transition-colors ${weightConfirmed ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}">
                            <i class="ph-bold ${weightConfirmed ? "ph-check" : "ph-question"}"></i>
                        </button>
                    </div>
                </div>
                <div>
                    <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Método</label>
                    <select onchange="app.ecSetShippingMethod('${s.id}', this.value)" onclick="event.stopPropagation()"
                        class="mt-1 w-full text-xs font-bold border border-slate-200 bg-white rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange">
                        <option value="home" ${input.shippingMethod === "home" ? "selected" : ""}>Envío a domicilio</option>
                        <option value="shop" ${isShop ? "selected" : ""}>Retiro en punto de servicio</option>
                    </select>
                </div>
            </div>
            ${isShop ? `
            <div class="mt-2">
                <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">ID punto de servicio</label>
                <input type="text" value="${(ui.servicePointId || "").replace(/"/g, "&quot;")}" placeholder="Ej. 9743"
                    onchange="app.ecSetServicePoint('${s.id}', this.value)" onclick="event.stopPropagation()"
                    class="mt-1 w-full text-xs font-bold border border-slate-200 bg-white rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange font-mono">
                <p class="text-[10px] text-slate-400 mt-1">Por ahora se ingresa el ID manual. Al integrar la API irá aquí el selector de puntos de retiro.</p>
            </div>` : ""}
            ${needsCustoms ? `
            <div class="mt-2 flex items-center justify-between gap-2 rounded-lg ${ui.customs ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"} px-2.5 py-2">
                <span class="text-[10px] font-extrabold uppercase tracking-wider ${ui.customs ? "text-emerald-700" : "text-amber-700"}">
                    <i class="ph-bold ${ui.customs ? "ph-check-circle" : "ph-warning"}"></i>
                    ${ui.customs ? `Aduana lista (${ui.customs.length} ítems)` : `Fuera de la UE (${cc}): falta aduana`}
                </span>
                ${ui.customs ? "" : `<button onclick="app.openQuickFixModal('${s.id}', 'customs')" class="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 underline hover:text-amber-900">Completar</button>`}
            </div>` : ""}
            <div data-quote-section="${s.id}"></div>
            <button ${canGo ? "" : "disabled"} title="${canGo ? "Generar etiqueta en Shipmondo" : "Faltan datos: " + firstBlocker}"
                onclick="app.ecGenerateLabel('${s.id}')"
                class="w-full mt-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${canGo ? "bg-brand-dark text-white hover:bg-black" : "bg-slate-200 text-slate-400 cursor-not-allowed"}">
                <i class="ph-bold ph-tag"></i>Generar Etiqueta
            </button>
        </div>`;
    },

    ecOnWeightChange(saleId, value) {
        const ui = this.ecShipUI(saleId);
        const w = parseInt(value, 10);
        ui.weight = Number.isInteger(w) ? w : 500;
        ui.weightConfirmed = false; // cualquier edición exige nueva confirmación
        this.ecInvalidateQuote(saleId); // las tarifas viejas ya no valen
        this.refreshCurrentView();
    },

    ecConfirmWeight(saleId) {
        const ui = this.ecShipUI(saleId);
        const w = Number.isInteger(ui.weight) ? ui.weight : 500;
        if (!Number.isInteger(w) || w <= 0) { this.showToast("⚠️ El peso debe ser un entero mayor a 0"); return; }
        ui.weight = w;
        ui.weightConfirmed = true;
        this.showToast("✅ Peso confirmado: " + w + " g");
        this.refreshCurrentView();
    },

    ecSetShippingMethod(saleId, value) {
        const ui = this.ecShipUI(saleId);
        ui.shippingMethod = value;
        if (!EC_SHOP_DELIVERY_METHODS.has(value)) delete ui.servicePointId;
        this.ecInvalidateQuote(saleId); // el método manual cambió: re-cotizar
        this.refreshCurrentView();
    },

    ecSetServicePoint(saleId, value) {
        const ui = this.ecShipUI(saleId);
        ui.servicePointId = String(value || "").trim();
        this.refreshCurrentView();
    },

    /* Config del modal rápido por campo */
    ecQuickFixConfig(field) {
        const cfgs = {
            "receiver.name":         { label: "Nombre del destinatario", placeholder: "Piotr Zaleś", type: "text" },
            "receiver.email":        { label: "Email", placeholder: "cliente@mail.com", type: "email" },
            "receiver.phone":        { label: "Teléfono", placeholder: "+45 31 22 33 44", type: "tel" },
            "receiver.address1":     { label: "Dirección", placeholder: "Kartuska 104/1", type: "text" },
            "receiver.zipcode":      { label: "Código postal", placeholder: "80-111", type: "text" },
            "receiver.city":         { label: "Ciudad", placeholder: "Gdańsk", type: "text" },
            "receiver.country_code": { label: "País (ISO alpha-2)", placeholder: "PL", type: "text", maxlength: 2, upper: true },
            "parcel.weight":         { label: "Peso (gramos)", placeholder: "500", type: "number" },
            "service_point.id":      { label: "ID del punto de servicio", placeholder: "Ej. 9743", type: "text", note: "Por ahora se ingresa el ID manual. Al integrar la API de Shipmondo, aquí irá el selector de puntos de retiro." },
            "shippingMethod":        { label: "Método de envío", type: "select", options: [["home", "Envío a domicilio"], ["shop", "Retiro en punto de servicio"]] },
        };
        return cfgs[field] || null;
    },

    ecQuickFixCurrentValue(sale, field) {
        const ui = this.ecShipUI(sale.id);
        if (field === "parcel.weight") return ui.weight ?? 500;
        if (field === "service_point.id") return ui.servicePointId || "";
        if (field === "shippingMethod") return this.ecBuildShipmentInput(sale, ui).shippingMethod;
        const keys = field.split(".");
        let o = this.ecBuildShipmentInput(sale, ui);
        for (const k of keys) o = o?.[k];
        return o ?? "";
    },

    /* Modal rápido: un solo campo, guardar sin recargar la página */
    openQuickFixModal(saleId, field) {
        if (field === "customs") { this.openCustomsFixModal(saleId); return; }
        const cfg = this.ecQuickFixConfig(field);
        if (!cfg) return;
        const sale = (this.state.sales || []).find(s => s.id === saleId);
        if (!sale) return;
        const current = this.ecQuickFixCurrentValue(sale, field);
        const shortLabel = EC_FIELD_LABELS[field] || "Completar dato";
        let inputHtml;
        if (cfg.type === "select") {
            inputHtml = `<select id="qf-input" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand-orange bg-white">
                ${cfg.options.map(([v, t]) => `<option value="${v}" ${String(current) === v ? "selected" : ""}>${t}</option>`).join("")}
            </select>`;
        } else {
            inputHtml = `<input id="qf-input" type="${cfg.type}" value="${String(current).replace(/"/g, "&quot;")}"
                placeholder="${cfg.placeholder || ""}" ${cfg.maxlength ? `maxlength="${cfg.maxlength}"` : ""}
                class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand-orange">`;
        }
        const html = `
        <div id="qf-modal-overlay" class="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4" onclick="if(event.target.id==='qf-modal-overlay')app.closeQuickFixModal()">
            <div class="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 p-6" onclick="event.stopPropagation()">
                <h3 class="text-base font-bold text-brand-dark">Completar dato</h3>
                <p class="text-xs text-slate-500 mt-0.5 mb-4">Pedido <b>#${sale.orderNumber || sale.id.slice(0, 6)}</b> · ${shortLabel} · se valida al guardar</p>
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${cfg.label}</label>
                ${inputHtml}
                ${cfg.note ? `<p class="text-[11px] text-slate-400 mt-2">${cfg.note}</p>` : ""}
                <p id="qf-error" class="hidden text-xs text-red-600 font-semibold mt-2"></p>
                <div class="flex justify-end gap-2 mt-5">
                    <button onclick="app.closeQuickFixModal()" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                    <button onclick="app.saveQuickFix('${saleId}', '${field}')" class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-dark text-white hover:bg-black transition-colors">Guardar</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML("beforeend", html);
        setTimeout(() => document.getElementById("qf-input")?.focus(), 50);
    },

    closeQuickFixModal() {
        document.getElementById("qf-modal-overlay")?.remove();
        document.getElementById("qf-customs-overlay")?.remove();
    },

    /* Update de Firestore con dot-notation (paths canónicos + espejos legacy) */
    ecQuickFixUpdates(sale, field, v) {
        const up = {};
        switch (field) {
            case "receiver.name":
                up["customer.name"] = v;
                if (sale.customerName !== undefined) up["customerName"] = v;
                break;
            case "receiver.email":
                up["customer.email"] = v;
                if (sale.customerEmail !== undefined) up["customerEmail"] = v;
                break;
            case "receiver.phone":
                up["customer.phone"] = v;
                if (sale.customerPhone !== undefined) up["customerPhone"] = v;
                if (sale.phone !== undefined) up["phone"] = v;
                break;
            case "receiver.address1": up["customer.shipping.line1"] = v; break;
            case "receiver.zipcode": up["customer.shipping.postal_code"] = v; break;
            case "receiver.city": up["customer.shipping.city"] = v; break;
            case "receiver.country_code": up["customer.shipping.country"] = v.toUpperCase(); break;
        }
        return up;
    },

    /* Merge en memoria para re-render inmediato */
    ecQuickFixApplyMemory(sale, field, v) {
        sale.customer = sale.customer || {};
        const cmap = { "receiver.name": "name", "receiver.email": "email", "receiver.phone": "phone" };
        const smap = { "receiver.address1": "line1", "receiver.zipcode": "postal_code", "receiver.city": "city", "receiver.country_code": "country" };
        if (cmap[field]) {
            sale.customer[cmap[field]] = v;
            if (field === "receiver.name" && sale.customerName !== undefined) sale.customerName = v;
            if (field === "receiver.email" && sale.customerEmail !== undefined) sale.customerEmail = v;
            if (field === "receiver.phone") {
                if (sale.customerPhone !== undefined) sale.customerPhone = v;
                if (sale.phone !== undefined) sale.phone = v;
            }
        }
        if (smap[field]) {
            sale.customer.shipping = sale.customer.shipping || {};
            sale.customer.shipping[smap[field]] = v;
        }
    },

    /* Guarda el campo (Firestore o estado efímero), valida antes y re-renderiza sin reload */
    async saveQuickFix(saleId, field) {
        const cfg = this.ecQuickFixConfig(field);
        if (!cfg) return;
        let value = document.getElementById("qf-input").value;
        if (cfg.upper) value = value.trim().toUpperCase();
        const sale = (this.state.sales || []).find(s => s.id === saleId);
        if (!sale) return;
        const ui = this.ecShipUI(saleId);
        const errEl = document.getElementById("qf-error");

        // Validar lo tipeado ANTES de guardar: parche temporal sobre el input
        const tmp = this.ecBuildShipmentInput(sale, { ...ui });
        if (field === "parcel.weight") { tmp.parcel.weight = parseInt(value, 10); tmp.parcel.weightConfirmed = true; }
        else if (field === "service_point.id") { tmp.service_point = { id: value.trim() }; }
        else if (field === "shippingMethod") { tmp.shippingMethod = value; }
        else {
            const keys = field.split(".");
            let o = tmp;
            for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
            o[keys[keys.length - 1]] = value.trim();
        }
        const errs = ecValidateShipment(tmp).filter(e => e.field === field || e.field.startsWith(field + "."));
        if (errs.length) {
            errEl.textContent = errs[0].message;
            errEl.classList.remove("hidden");
            return;
        }

        try {
            if (field === "parcel.weight") {
                ui.weight = parseInt(value, 10);
                ui.weightConfirmed = true;
                this.ecInvalidateQuote(saleId); // el peso cambió: re-cotizar
            } else if (field === "service_point.id") {
                ui.servicePointId = value.trim();
            } else if (field === "shippingMethod") {
                ui.shippingMethod = value;
                if (!EC_SHOP_DELIVERY_METHODS.has(value)) delete ui.servicePointId;
            } else {
                await db.collection("sales").doc(saleId).update(this.ecQuickFixUpdates(sale, field, value.trim()));
                this.ecQuickFixApplyMemory(sale, field, value.trim());
                if (field === "receiver.zipcode" || field === "receiver.city" || field === "receiver.country_code") {
                    this.ecInvalidateQuote(saleId); // cambió el destino: re-cotizar
                }
            }
            this.closeQuickFixModal();
            this.showToast("✅ Dato guardado");
            this.refreshCurrentView();
        } catch (e) {
            console.error("saveQuickFix:", e);
            errEl.textContent = "⚠️ Error al guardar: " + e.message;
            errEl.classList.remove("hidden");
        }
    },

    /* Modal de aduana: genera las líneas desde los ítems del pedido y las confirma */
    openCustomsFixModal(saleId) {
        const sale = (this.state.sales || []).find(s => s.id === saleId);
        if (!sale) return;
        const items = sale.items || [];
        const lines = items.map((it) => {
            const title = it.album || it.title || it.name || "Vinilo";
            const artist = it.artist ? ` — ${it.artist}` : "";
            const qty = it.qty || it.quantity || 1;
            const price = Number(it.priceAtSale || it.price || 0);
            return {
                description: `Vinyl record: ${title}${artist}`.slice(0, 120),
                value: Math.round(price * qty * 100) / 100,
                currency: "DKK",
            };
        });
        const rows = lines.map((l, i) => `
            <div class="grid grid-cols-[1fr_90px_70px] gap-2 items-center">
                <input id="qc-desc-${i}" type="text" value="${l.description.replace(/"/g, "&quot;")}" class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-orange">
                <input id="qc-val-${i}" type="number" min="0" step="0.01" value="${l.value}" class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-orange">
                <input id="qc-cur-${i}" type="text" value="${l.currency}" maxlength="3" class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-orange uppercase">
            </div>`).join("");
        const html = `
        <div id="qf-customs-overlay" class="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4" onclick="if(event.target.id==='qf-customs-overlay')app.closeQuickFixModal()">
            <div class="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 p-6" onclick="event.stopPropagation()">
                <h3 class="text-base font-bold text-brand-dark">Declaración de aduana</h3>
                <p class="text-xs text-slate-500 mt-0.5 mb-4">Pedido <b>#${sale.orderNumber || sale.id.slice(0, 6)}</b> · destino fuera de la UE · revisá y confirmá</p>
                <div class="grid grid-cols-[1fr_90px_70px] gap-2 mb-1 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <span>Descripción</span><span>Valor</span><span>Moneda</span>
                </div>
                <div class="space-y-2 max-h-64 overflow-y-auto">${rows || `<p class="text-xs text-slate-400">Sin ítems en el pedido.</p>`}</div>
                <p id="qf-error" class="hidden text-xs text-red-600 font-semibold mt-2"></p>
                <div class="flex justify-end gap-2 mt-5">
                    <button onclick="app.closeQuickFixModal()" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                    <button onclick="app.saveCustomsFix('${saleId}', ${lines.length})" class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-dark text-white hover:bg-black transition-colors">Confirmar aduana</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML("beforeend", html);
    },

    saveCustomsFix(saleId, n) {
        const customs = [];
        for (let i = 0; i < n; i++) {
            customs.push({
                description: document.getElementById(`qc-desc-${i}`).value.trim(),
                value: Number(document.getElementById(`qc-val-${i}`).value),
                currency: document.getElementById(`qc-cur-${i}`).value.trim().toUpperCase(),
            });
        }
        const ui = this.ecShipUI(saleId);
        const sale = (this.state.sales || []).find(s => s.id === saleId);
        const tmp = this.ecBuildShipmentInput(sale, { ...ui, customs });
        const errs = ecValidateShipment(tmp).filter(e => e.field.startsWith("customs"));
        const errEl = document.getElementById("qf-error");
        if (errs.length) {
            errEl.textContent = errs[0].message;
            errEl.classList.remove("hidden");
            return;
        }
        ui.customs = customs;
        this.closeQuickFixModal();
        this.showToast("✅ Aduana confirmada");
        this.refreshCurrentView();
    },

    /* Generar Etiqueta: barrera pre-flight + payload listo (sin fetch real todavía) */
    ecGenerateLabel(saleId) {
        const sale = (this.state.sales || []).find(s => s.id === saleId);
        if (!sale) return;
        const ui = this.ecShipUI(saleId);
        const input = this.ecBuildShipmentInput(sale, ui);

        // Barrera de seguridad: ningún fetch sale con bloqueadores pendientes
        if (!ecCanGenerateLabel(input)) {
            const b = ecValidateShipment(input);
            this.showToast("⚠️ Faltan datos: " + (b[0] ? b[0].message : ""));
            return;
        }

        const payload = ecBuildShipmondoPayload(sale, input);
        const pretty = JSON.stringify(payload, null, 2).replace(/</g, "&lt;");

        // TODO(API): integración directa con Shipmondo — el fetch vive detrás de la barrera:
        // if (!ecCanGenerateLabel(input)) return; // pre-flight: 0% error
        // const res = await fetch("https://api.shipmondo.com/v1/shipments", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json", "Authorization": "Bearer <API_KEY>" },
        //   body: JSON.stringify(payload),
        // });

        const html = `
        <div id="qf-modal-overlay" class="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4" onclick="if(event.target.id==='qf-modal-overlay')app.closeQuickFixModal()">
            <div class="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 p-6" onclick="event.stopPropagation()">
                <h3 class="text-base font-bold text-brand-dark flex items-center gap-2"><i class="ph-bold ph-shield-check text-emerald-600"></i>Pre-Flight OK · Payload Shipmondo</h3>
                <p class="text-xs text-slate-500 mt-0.5 mb-4">Pedido <b>#${sale.orderNumber || sale.id.slice(0, 6)}</b> · validación 100% superada · copiá el JSON o generá la etiqueta en Shipmondo</p>
                <pre id="ec-payload-pre" class="bg-slate-900 text-emerald-300 text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto max-h-72 overflow-y-auto font-mono">${pretty}</pre>
                <div class="flex justify-end gap-2 mt-5">
                    <button onclick="app.closeQuickFixModal()" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cerrar</button>
                    <button onclick="app.ecCopyPayload()" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors flex items-center gap-1.5"><i class="ph-bold ph-copy"></i>Copiar JSON</button>
                    <a href="https://app.shipmondo.com/" target="_blank" rel="noopener" class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-dark text-white hover:bg-black transition-colors flex items-center gap-1.5"><i class="ph-bold ph-arrow-square-out"></i>Abrir Shipmondo</a>
                </div>
                <p class="text-[10px] text-slate-400 mt-3">TODO(API): al integrar la API directa, el fetch va detrás de <span class="font-mono">if (!ecCanGenerateLabel(input)) return;</span></p>
            </div>
        </div>`;
        document.body.insertAdjacentHTML("beforeend", html);
    },

    ecCopyPayload() {
        const pre = document.getElementById("ec-payload-pre");
        const text = pre ? pre.innerText : "";
        const done = () => this.showToast("✅ Payload copiado al portapapeles");
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => this.showToast("⚠️ No se pudo copiar"));
        } else {
            const ta = document.createElement("textarea");
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand("copy"); done(); } catch (e) { this.showToast("⚠️ No se pudo copiar"); }
            ta.remove();
        }
    },

    /* ============ LIVE RATES · Cotización en tiempo real ============ */

    ecQuoteUI(saleId) {
        this._quoteUI = this._quoteUI || {};
        if (!this._quoteUI[saleId]) this._quoteUI[saleId] = ecNewQuoteState();
        return this._quoteUI[saleId];
    },

    /* Vuelve la cotización a idle: las tarifas viejas ya no valen si cambió peso/CP/país/método */
    ecInvalidateQuote(saleId) {
        if (this._quoteUI) this._quoteUI[saleId] = ecNewQuoteState();
        this.renderQuoteSection(saleId);
    },

    /* Re-renderiza las secciones de cotización visibles (tras refreshCurrentView) */
    ecRestoreQuoteSections() {
        if (!this._quoteUI) return;
        Object.keys(this._quoteUI).forEach(saleId => this.renderQuoteSection(saleId));
    },

    /* Disparo: solo si CP + país + peso pasan el prereq lite.
       El Pre-Flight completo se exige al comprar, no al cotizar. */
    async fetchLiveRates(saleId) {
        const sale = (this.state.sales || []).find(s => s.id === saleId);
        if (!sale) return;
        const ui = this.ecShipUI(saleId);
        const input = this.ecBuildShipmentInput(sale, ui);
        const prereq = ecQuotePrereq(input);
        if (prereq.length) {
            this.showToast("⚠️ Completá CP, país y peso para cotizar: " + prereq[0].message);
            return;
        }
        const st = (this._quoteUI[saleId] = ecNewQuoteState());
        st.status = QUOTE_LOADING;
        this.renderQuoteSection(saleId);

        try {
            const res = await fetch(`${BASE_API_URL}/api/shipmondo/quotes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: saleId,
                    sender: { country_code: EC_SENDER_COUNTRY, zipcode: EC_SENDER_ZIP },
                    receiver: {
                        country_code: input.receiver.country_code,
                        zipcode: input.receiver.zipcode,
                    },
                    parcels: [{ weight: input.parcel.weight }],
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            st.rates = ecSortRates(data.rates || []);
            if (!st.rates.length) throw new Error("Sin tarifas");
            st.status = QUOTE_READY;
        } catch (e) {
            // Endpoints aún no implementados en el backend → error elegante con reintento
            st.status = QUOTE_ERROR;
            st.error = "No se pudieron cargar las tarifas. Revisá la conexión e intentá de nuevo.";
        }
        this.renderQuoteSection(saleId);
    },

    /* Renderiza la sección en [data-quote-section]; idempotente */
    renderQuoteSection(saleId) {
        const el = document.querySelector(`[data-quote-section="${saleId}"]`);
        if (!el) return;
        const st = this.ecQuoteUI(saleId);
        const head = `
            <div class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <i class="ph-bold ph-tag"></i>Cotización en tiempo real
            </div>`;

        if (st.status === QUOTE_IDLE) {
            const sale = (this.state.sales || []).find(s => s.id === saleId);
            const prereq = sale ? ecQuotePrereq(this.ecBuildShipmentInput(sale, this.ecShipUI(saleId))) : [{ message: "" }];
            el.innerHTML = `
            <div class="mt-2.5 rounded-xl border border-dashed border-slate-200 bg-white/60 p-3" onclick="event.stopPropagation()">
                ${head}
                ${prereq.length
                    ? `<p class="text-[11px] text-slate-400 font-semibold">Completá código postal, país y peso para cotizar las tarifas.</p>`
                    : `<button onclick="app.fetchLiveRates('${saleId}')" class="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:border-brand-orange hover:text-brand-orange transition-colors flex items-center justify-center gap-2">
                        <i class="ph-bold ph-tag"></i>Cotizar envío</button>
                       <p class="text-[10px] text-slate-400 mt-1.5 text-center">Tarifas en vivo de Shipmondo según peso y destino</p>`}
            </div>`;
            return;
        }
        if (st.status === QUOTE_LOADING) {
            el.innerHTML = `
            <div class="mt-2.5 rounded-xl border border-slate-200 bg-white/60 p-3" onclick="event.stopPropagation()">
                ${head}
                <div class="rate-group" aria-hidden="true">
                    ${[1, 2, 3].map(() => `<div class="rate-card skeleton"><div class="sk-line"></div><div class="sk-line short"></div></div>`).join("")}
                </div>
            </div>`;
            return;
        }
        if (st.status === QUOTE_ERROR) {
            el.innerHTML = `
            <div class="mt-2.5 rounded-xl border border-slate-200 bg-white/60 p-3" onclick="event.stopPropagation()">
                ${head}
                <div class="quote-error">
                    <i class="ph-bold ph-warning-circle text-base shrink-0"></i>
                    <span class="flex-1">${ecEsc(st.error)}</span>
                    <button onclick="app.fetchLiveRates('${saleId}')" class="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-[11px] font-bold hover:bg-red-50 transition-colors">Reintentar</button>
                </div>
            </div>`;
            return;
        }
        /* ready / points / selected */
        el.innerHTML = `
        <div class="mt-2.5 rounded-xl border border-slate-200 bg-white/60 p-3" onclick="event.stopPropagation()">
            <div class="flex items-center justify-between mb-1">
                <div class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <i class="ph-bold ph-tag"></i>Cotización en tiempo real
                </div>
                <button onclick="app.fetchLiveRates('${saleId}')" title="Actualizar tarifas" class="text-[10px] font-bold text-slate-400 hover:text-brand-orange uppercase tracking-wider flex items-center gap-1">
                    <i class="ph-bold ph-arrows-clockwise"></i>Actualizar
                </button>
            </div>
            <p class="quote-title">Elegí el método de envío</p>
            <div class="rate-group" role="radiogroup" aria-label="Métodos de envío">
                ${st.rates.map(r => this.ecRateCardHTML(saleId, r, st)).join("")}
            </div>
            ${this.ecBuyButtonHTML(saleId, st)}
        </div>`;
    },

    ecRateCardHTML(saleId, r, st) {
        const selected = st.selectedRateId === r.id;
        const isShop = r.serviceType === "shop";
        return `
        <label class="rate-card ${selected ? "selected" : ""}">
            <input type="radio" name="rate-${saleId}" value="${ecEsc(r.id)}" class="sr-only"
                ${selected ? "checked" : ""} onchange="app.selectRate('${saleId}', '${ecEsc(r.id)}')" />
            <span class="rate-radio" aria-hidden="true"></span>
            <span class="rate-carrier" data-carrier="${ecEsc(r.carrier)}">${ecEsc(r.carrierName || r.carrier)}</span>
            <span class="rate-service">${ecEsc(r.serviceLabel || "")}</span>
            <span class="rate-eta">${ecEsc(r.deliveryEstimate || "")}</span>
            <span class="rate-price">${formatDKK(r.price)}</span>
            ${selected && isShop ? this.ecServicePointPickerHTML(saleId, st) : ""}
        </label>`;
    },

    /* Desplegable de puntos de retiro: se renderiza DENTRO de la tarjeta seleccionada */
    ecServicePointPickerHTML(saleId, st) {
        if (st.status === QUOTE_POINTS)
            return `<span class="sp-loading">Buscando puntos cercanos…</span>`;
        if (!st.servicePoints.length)
            return `<span class="sp-empty">No se encontraron puntos cercanos.</span>`;
        return `
        <span class="sp-list" role="radiogroup" aria-label="Punto de retiro">
            ${st.servicePoints.map(p => `
            <label class="sp-item ${st.selectedPointId === p.id ? "selected" : ""}">
                <input type="radio" name="sp-${saleId}" value="${ecEsc(p.id)}" class="sr-only"
                    ${st.selectedPointId === p.id ? "checked" : ""}
                    onchange="app.selectServicePoint('${saleId}', '${ecEsc(p.id)}')" />
                <span class="sp-radio" aria-hidden="true"></span>
                <span class="sp-name">${ecEsc(p.name)}</span>
                <span class="sp-addr">${ecEsc(p.address1)}, ${ecEsc(p.zipcode)} ${ecEsc(p.city)}</span>
                <span class="sp-dist">${p.distanceKm != null ? ecEsc(p.distanceKm) + " km" : ""}</span>
            </label>`).join("")}
        </span>`;
    },

    ecBuyButtonHTML(saleId, st) {
        const bs = ecQuoteBuyState(st);
        if (!bs.rate) {
            return `<button class="w-full mt-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-400 cursor-not-allowed" disabled>Elegí una tarifa para continuar</button>`;
        }
        return `
        <button onclick="app.buyLabel('${saleId}')" ${bs.ready ? "" : "disabled"}
            class="w-full mt-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${bs.ready ? "bg-brand-dark text-white hover:bg-black" : "bg-slate-200 text-slate-400 cursor-not-allowed"}">
            <i class="ph-bold ph-tag"></i>${bs.label}</button>
        <p class="buy-hint">${bs.ready ? "Se descuenta de tu saldo de Shipmondo" : (bs.needsPoint ? "Elegí un punto de retiro para continuar" : "Elegí una tarifa para continuar")}</p>`;
    },

    async selectRate(saleId, rateId) {
        const st = this.ecQuoteUI(saleId);
        const rate = (st.rates || []).find(r => r.id === rateId);
        if (!rate) return;
        st.selectedRateId = rateId;
        st.selectedPointId = null;
        st.servicePoints = [];

        if (rate.serviceType === "shop") {
            // Parcel Shop: buscar los 3 puntos más cercanos al CP del cliente
            st.status = QUOTE_POINTS;
            this.renderQuoteSection(saleId);
            try {
                const sale = (this.state.sales || []).find(s => s.id === saleId);
                const c = (sale && sale.customer) || {};
                const ship = c.shipping || {};
                const q = new URLSearchParams({
                    country_code: String(ship.country || "").trim().toUpperCase(),
                    zipcode: String(ship.postal_code || ship.zip || "").trim(),
                    carrier: rate.carrier || "",
                    limit: "3",
                });
                const res = await fetch(`${BASE_API_URL}/api/shipmondo/service-points?${q.toString()}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                st.servicePoints = (data.servicePoints || []).slice(0, 3);
            } catch (e) {
                st.servicePoints = [];
            }
            st.status = QUOTE_READY;
        } else {
            st.status = QUOTE_SELECTED;
        }
        // Sincronizar con el Pre-Flight: el método elegido alimenta la validación
        const ui = this.ecShipUI(saleId);
        ui.shippingMethod = rate.productCode || rate.id;
        if (rate.serviceType !== "shop") delete ui.servicePointId;
        this.refreshCurrentView(); // re-render + ecRestoreQuoteSections mantiene la sección
    },

    selectServicePoint(saleId, pointId) {
        const st = this.ecQuoteUI(saleId);
        if (!(st.servicePoints || []).some(p => p.id === pointId)) return;
        st.selectedPointId = pointId;
        st.status = QUOTE_SELECTED;
        // El Pre-Flight exige service_point.id para shop delivery: se lo entregamos
        const ui = this.ecShipUI(saleId);
        ui.servicePointId = pointId;
        this.refreshCurrentView(); // re-render + ecRestoreQuoteSections mantiene la sección
    },

    /* Compra final: la barrera del Pre-Flight completo va ANTES de cualquier acción */
    buyLabel(saleId) {
        const sale = (this.state.sales || []).find(s => s.id === saleId);
        if (!sale) return;
        const ui = this.ecShipUI(saleId);
        const input = this.ecBuildShipmentInput(sale, ui);
        const blockers = ecValidateShipment(input);
        if (blockers.length) {
            this.showToast("⚠️ Faltan datos para generar la etiqueta: " + blockers[0].message);
            return; // no sale ningún fetch
        }
        const st = this.ecQuoteUI(saleId);
        const bs = ecQuoteBuyState(st);
        if (!bs.ready) {
            this.showToast("⚠️ Elegí una tarifa" + (bs.needsPoint ? " y un punto de retiro" : "") + " para continuar");
            return;
        }
        const rate = bs.rate;
        const point = (st.servicePoints || []).find(p => p.id === st.selectedPointId);
        const payload = ecBuildShipmondoPayload(sale, input);
        const pretty = JSON.stringify(payload, null, 2).replace(/</g, "&lt;");

        // TODO(API): POST tu-backend/api/shipmondo/shipments con { orderId, productCode, servicePointId?, parcel }
        // La API key vive SOLO en el backend (proxy). El fetch va detrás de la barrera de arriba.

        const html = `
        <div id="qf-modal-overlay" class="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4" onclick="if(event.target.id==='qf-modal-overlay')app.closeQuickFixModal()">
            <div class="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 p-6" onclick="event.stopPropagation()">
                <h3 class="text-base font-bold text-brand-dark flex items-center gap-2"><i class="ph-bold ph-tag text-brand-orange"></i>Comprar Etiqueta</h3>
                <p class="text-xs text-slate-500 mt-0.5 mb-4">Pedido <b>#${sale.orderNumber || sale.id.slice(0, 6)}</b> · validación 100% superada</p>
                <div class="flex items-center justify-between rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 mb-4">
                    <div>
                        <p class="text-xs font-extrabold text-brand-dark">${ecEsc(rate.carrierName || rate.carrier)} · ${ecEsc(rate.serviceLabel || "")}</p>
                        ${point ? `<p class="text-[11px] text-slate-500 mt-0.5">→ ${ecEsc(point.name)}, ${ecEsc(point.address1)}, ${ecEsc(point.zipcode)} ${ecEsc(point.city)}</p>` : ""}
                        ${rate.deliveryEstimate ? `<p class="text-[11px] text-slate-400">${ecEsc(rate.deliveryEstimate)}</p>` : ""}
                    </div>
                    <p class="text-lg font-extrabold text-brand-dark whitespace-nowrap">${formatDKK(rate.price)}</p>
                </div>
                <pre id="ec-payload-pre" class="bg-slate-900 text-emerald-300 text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto max-h-56 overflow-y-auto font-mono">${pretty}</pre>
                <div class="flex justify-end gap-2 mt-5">
                    <button onclick="app.closeQuickFixModal()" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cerrar</button>
                    <button onclick="app.ecCopyPayload()" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors flex items-center gap-1.5"><i class="ph-bold ph-copy"></i>Copiar JSON</button>
                    <a href="https://app.shipmondo.com/" target="_blank" rel="noopener" class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-dark text-white hover:bg-black transition-colors flex items-center gap-1.5"><i class="ph-bold ph-arrow-square-out"></i>Abrir Shipmondo</a>
                </div>
                <p class="text-[10px] text-slate-400 mt-3">TODO(API): al integrar la API directa, el POST a <span class="font-mono">/api/shipmondo/shipments</span> va detrás de la barrera Pre-Flight de arriba. Hoy la etiqueta se genera manual en Shipmondo.</p>
            </div>
        </div>`;
        document.body.insertAdjacentHTML("beforeend", html);
        this.showToast(`✅ Etiqueta lista para comprar — ${formatDKK(rate.price)}`);
    },

    renderShipping(container) {
        // Solo WebShop y Discogs: el local nunca hace envíos
        const shipSales = this.state.sales.filter(s => this.isShippableChannel(s));

        const byCol = { preparar: [], etiqueta: [], despachado: [], excepcion: [] };
        shipSales.forEach(s => { byCol[this.shipKanbanColumn(s)].push(s); });
        const byDateAsc = (a, b) => new Date(a.date) - new Date(b.date);
        byCol.preparar.sort(byDateAsc);
        byCol.etiqueta.sort(byDateAsc);
        byCol.excepcion.sort(byDateAsc);
        byCol.despachado.sort((a, b) => new Date(b.updated_at?.toDate ? b.updated_at.toDate() : (b.updated_at || b.date)) - new Date(a.updated_at?.toDate ? a.updated_at.toDate() : (a.updated_at || a.date)));
        const despachados = byCol.despachado.slice(0, 12);

        const pendingCount = byCol.preparar.length + byCol.etiqueta.length + byCol.excepcion.length;

        const columns = [
            { key: 'preparar', label: 'Preparar', dot: 'bg-slate-400', colBg: 'bg-slate-50/70', hint: 'Pedidos nuevos por preparar' },
            { key: 'etiqueta', label: 'Etiqueta creada', dot: 'bg-blue-500', colBg: 'bg-blue-50/40', hint: 'Listos para despachar o retirar' },
            { key: 'despachado', label: 'Despachado', dot: 'bg-green-500', colBg: 'bg-green-50/40', hint: 'Últimos 12 cerrados' },
            { key: 'excepcion', label: 'Excepción', dot: 'bg-red-500', colBg: 'bg-red-50/40', hint: 'Requieren acción' },
        ];

        const html = `
            <div class="max-w-[1600px] mx-auto px-4 md:px-8 pb-24 pt-6 animate-fadeIn">
                <div class="flex flex-wrap justify-between items-center gap-4 mb-8">
                    <div>
                        <h2 class="font-display text-3xl font-bold text-brand-dark">Envíos y Logística</h2>
                        <p class="text-slate-500 text-sm mt-1 flex items-center gap-1.5"><i class="ph-bold ph-truck text-brand-orange"></i>Bandeja de trabajo Shipmondo y Pickup</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-3">
                        <div class="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                            <i class="ph-fill ph-hand-coins text-indigo-500 text-2xl"></i>
                            <div>
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Envíos (aprox)</p>
                                <p class="text-2xl font-display font-bold text-brand-dark">${this.formatCurrency(shipSales.reduce((sum, s) => sum + (parseFloat(s.shipping || s.shipping_cost || 0)), 0))}</p>
                            </div>
                        </div>
                        <div class="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                            <i class="ph-fill ph-clock text-brand-orange text-2xl"></i>
                            <div>
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Pendientes</p>
                                <p class="text-2xl font-display font-bold text-brand-dark">${pendingCount}</p>
                            </div>
                        </div>
                        <button onclick="app.exportShippingList()" class="bg-white border border-slate-200 text-slate-600 px-4 h-12 rounded-xl flex items-center gap-2 shadow-sm hover:border-brand-orange hover:text-brand-orange transition-all text-xs font-bold">
                            <i class="ph-bold ph-download-simple text-base"></i><span class="hidden sm:inline">Exportar Lista</span>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
                    ${columns.map(c => {
                        const list = c.key === 'despachado' ? despachados : byCol[c.key];
                        return `
                        <div class="rounded-2xl border border-slate-100 ${c.colBg} p-3">
                            <div class="flex items-center justify-between px-2 pt-1 pb-3">
                                <div class="flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full ${c.dot}"></span>
                                    <span class="text-[11px] font-bold uppercase tracking-widest text-slate-600">${c.label}</span>
                                </div>
                                <span class="min-w-[24px] h-6 px-2 rounded-full text-[11px] font-bold flex items-center justify-center ${list.length > 0 ? 'bg-white text-slate-600 shadow-sm border border-slate-100' : 'bg-slate-100 text-slate-400'}">${list.length}</span>
                            </div>
                            <div class="space-y-3 max-h-[70vh] overflow-y-auto pr-0.5 custom-scrollbar">
                                ${list.length > 0 ? list.map(s => this.renderShipCard(s)).join('') : `
                                <div class="bg-white/60 border border-dashed border-slate-200 rounded-2xl py-10 px-4 text-center">
                                    <p class="text-[11px] font-bold uppercase tracking-widest text-slate-300">Bandeja vacía</p>
                                </div>`}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
        container.innerHTML = html;
        this.ecRestoreQuoteSections();
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
                    </a>
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
            .then(response => {
                // Backend wraps response in { success, release }, unwrap it
                const data = response.release || response;
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
                    </a>
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
                        <button onclick="document.getElementById('bulk-import-modal').remove()" class="flex-1 px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</a>
                        <button id="start-bulk-import-btn" onclick="app.handleBulkImportBatch()" class="flex-1 bg-emerald-500 text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                            <i class="ph-bold ph-rocket-launch"></i> Comenzar Importación
                        </a>
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
