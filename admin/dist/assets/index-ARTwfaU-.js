(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const n of a.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&o(n)}).observe(document,{childList:!0,subtree:!0});function s(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(r){if(r.ep)return;r.ep=!0;const a=s(r);fetch(r.href,a)}})();const C=firebase.firestore(),Fe="2026.03.20.1";console.log("🚀 El Cuartito Admin v"+Fe+" loaded");const re=window.auth,Ne=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1",R=Ne?"http://localhost:3001":"https://el-cuartito-shop.up.railway.app",Ve="K85403890688957",fe={async createSale(t){let e=[];if(await C.runTransaction(async s=>{const o=[];for(const i of t.items){const l=C.collection("products").doc(i.recordId||i.productId),c=await s.get(l);if(!c.exists)throw new Error(`Producto ${i.recordId} no encontrado`);const p=c.data();if(p.stock<i.quantity)throw new Error(`Stock insuficiente para ${p.artist||"Sin Artista"} - ${p.album||"Sin Album"}. Disponible: ${p.stock}`);o.push({ref:l,data:p,quantity:i.quantity,price:p.price,cost:p.cost||0,productCondition:i.productCondition||i.condition||p.product_condition||p.condition||"Used"})}const r=o.reduce((i,l)=>i+l.price*l.quantity,0),a=t.customTotal!==void 0?t.customTotal:r,n=C.collection("sales").doc();s.set(n,{...t,status:"completed",fulfillment_status:t.channel&&t.channel.toLowerCase()==="discogs"?"preparing":"fulfilled",total:a,date:new Date().toISOString().split("T")[0],timestamp:firebase.firestore.FieldValue.serverTimestamp(),items:o.map(i=>({productId:i.ref.id,artist:i.data.artist,album:i.data.album,sku:i.data.sku,unitPrice:i.price,costAtSale:i.cost,qty:i.quantity,productCondition:i.productCondition||"Used"}))});for(const i of o){s.update(i.ref,{stock:firebase.firestore.FieldValue.increment(-i.quantity)});const l=C.collection("inventory_logs").doc();s.set(l,{type:"SOLD",sku:i.data.sku||"Unknown",album:i.data.album||"Unknown",artist:i.data.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:`Venta registrada (Admin) - Canal: ${t.channel||"Tienda"}`})}e=o.map(i=>({discogs_listing_id:i.data.discogs_listing_id,artist:i.data.artist,album:i.data.album}))}),t.channel&&t.channel.toLowerCase()==="discogs"){for(const s of e)if(s.discogs_listing_id)try{const o=await fetch(`${R}/discogs/delete-listing/${s.discogs_listing_id}`,{method:"DELETE"});o.ok?console.log(`✅ Discogs listing ${s.discogs_listing_id} deleted for ${s.artist} - ${s.album}`):console.warn(`⚠️ Could not delete Discogs listing ${s.discogs_listing_id}:`,await o.text())}catch(o){console.error(`❌ Error deleting Discogs listing ${s.discogs_listing_id}:`,o)}}},async notifyPreparing(t){const e=await re.currentUser.getIdToken(),s=await fetch(`${R}/sales/${t}/notify-preparing`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async updateTracking(t,e){const s=await re.currentUser.getIdToken(),o=await fetch(`${R}/sales/${t}/update-tracking`,{method:"POST",headers:{Authorization:`Bearer ${s}`,"Content-Type":"application/json"},body:JSON.stringify({trackingNumber:e})});if(!o.ok)throw new Error(await o.text());return o.json()},async notifyShipped(t,e,s=null){const o=await re.currentUser.getIdToken(),r={trackingNumber:e};s&&(r.trackingLink=s);const a=await fetch(`${R}/sales/${t}/notify-shipped`,{method:"POST",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"},body:JSON.stringify(r)});if(!a.ok)throw new Error(await a.text());return a.json()},async markDispatched(t){const e=await re.currentUser.getIdToken(),s=await fetch(`${R}/sales/${t}/mark-dispatched`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async notifyPickupReady(t){const e=await re.currentUser.getIdToken(),s=await fetch(`${R}/sales/${t}/notify-pickup-ready`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async markPickedUp(t){const e=await re.currentUser.getIdToken(),s=await fetch(`${R}/sales/${t}/mark-picked-up`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()}},Pe={state:{inventory:[],sales:[],expenses:[],consignors:[],cart:[],viewMode:"list",selectedItems:new Set,currentView:"dashboard",filterMonths:[new Date().getMonth()],filterYear:new Date().getFullYear(),inventorySearch:"",salesHistorySearch:"",expensesSearch:"",events:[],selectedDate:new Date,vatActive:!1,manualSaleSearch:"",posCondition:"Used",posSelectedItemSku:null,orderFeedFilter:"all",filterGenre:"all",filterOwner:"all",filterLabel:"all",filterStorage:"all",filterDiscogs:"all",filterStockTime:[],privacyMode:!1,rsdExtraDiscount:!1,dashboardAnalysisMode:"genre"},getEffectivePrice(t){return t.is_rsd_discount?Math.round(t.price*.9):t.price},async init(){this._initialized||(this._initialized=!0,re.onAuthStateChanged(async t=>{if(t)try{document.getElementById("login-view").classList.add("hidden"),document.getElementById("main-app").classList.remove("hidden"),document.getElementById("mobile-nav").classList.remove("hidden"),await this.loadData(),this._pollInterval&&clearInterval(this._pollInterval),this._pollInterval=setInterval(()=>this.loadData(),6e4),this.setupListeners(),this.setupMobileMenu(),this.setupNavigation()}catch(e){console.error("Auth token error:",e),this.logout()}else{document.getElementById("login-view").classList.remove("hidden"),document.getElementById("main-app").classList.add("hidden"),document.getElementById("mobile-nav").classList.add("hidden");const e=document.getElementById("login-btn");e&&(e.disabled=!1,e.innerHTML="<span>Entrar</span>")}}),document.addEventListener("click",t=>{const e=document.getElementById("discogs-results"),s=document.getElementById("discogs-search-input");e&&!e.contains(t.target)&&t.target!==s&&e.classList.add("hidden");const o=document.getElementById("sku-results"),r=document.getElementById("sku-search");o&&!o.contains(t.target)&&t.target!==r&&o.classList.add("hidden")}))},async handleLogin(t){t.preventDefault();const e=t.target.email.value,s=t.target.password.value,o=document.getElementById("login-error"),r=document.getElementById("login-btn");o.classList.add("hidden"),r.disabled=!0,r.innerHTML="<span>Cargando...</span>";try{await re.signInWithEmailAndPassword(e,s)}catch(a){console.error("Login error:",a),o.innerText="Error: "+a.message,o.classList.remove("hidden"),r.disabled=!1,r.innerHTML='<span>Ingresar</span><i class="ph-bold ph-arrow-right"></i>'}},async updateFulfillmentStatus(t,e,s){var o,r,a;try{const n=((o=t==null?void 0:t.target)==null?void 0:o.closest("button"))||((a=(r=window.event)==null?void 0:r.target)==null?void 0:a.closest("button"));if(n){n.disabled=!0;const i=n.innerHTML;n.innerHTML='<i class="ph ph-circle-notch animate-spin"></i>'}await C.collection("sales").doc(e).update({fulfillment_status:s}),await this.loadData(),document.getElementById("modal-overlay")&&(document.getElementById("modal-overlay").remove(),this.openOnlineSaleDetailModal(e)),this.showToast("Estado de envío actualizado")}catch(n){console.error("Fulfillment update error:",n),this.showToast("Error al actualizar estado: "+n.message,"error")}},async manualShipOrder(t){var e,s,o,r,a,n;try{const i=prompt("Introduce el número de seguimiento:");if(!i)return;const l=((e=event==null?void 0:event.target)==null?void 0:e.closest("button"))||((o=(s=window.event)==null?void 0:s.target)==null?void 0:o.closest("button"));l&&(l.disabled=!0,l.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Guardando...');const c=await fetch(`${R}/api/manual-ship`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t,trackingNumber:i})}),p=await c.json();if(c.ok&&p.success){if(this.showToast("✅ Pedido marcado como enviado"),p.emailSent)this.showToast("📧 Cliente notificado por email","success");else{const d=typeof p.emailError=="object"?JSON.stringify(p.emailError):p.emailError;this.showToast("⚠️ Pedido marcado pero EL EMAIL FALLÓ: "+d,"warning")}await this.loadData();const b=document.getElementById("sale-detail-modal");b&&(b.remove(),this.openUnifiedOrderDetailModal(t))}else throw new Error(p.error||p.message||"Error desconocido")}catch(i){console.error("Error shipping manually:",i),this.showToast("❌ Error: "+(i.message||"No se pudo procesar el envío"),"error");const l=((r=event==null?void 0:event.target)==null?void 0:r.closest("button"))||((n=(a=window.event)==null?void 0:a.target)==null?void 0:n.closest("button"));l&&(l.disabled=!1,l.innerHTML='<i class="ph-bold ph-truck"></i> Ingresar Tracking y Cerrar')}},async logout(){try{await re.signOut(),location.reload()}catch(t){console.error("Sign out error:",t),location.reload()}},setupListeners(){this._unsubscribeProducts&&this._unsubscribeProducts(),this._unsubscribeProducts=C.collection("products").onSnapshot(t=>{this.state.inventory=t.docs.map(e=>{const s=e.data();return{id:e.id,...s,condition:s.condition||"VG",owner:s.owner||"El Cuartito",label:s.label||"Desconocido",storageLocation:s.storageLocation||"Tienda",cover_image:s.cover_image||s.coverImage||null}}),(this.state.currentTab==="inventory"||this.state.currentTab==="dashboard")&&this.renderCurrentTab()},t=>{console.error("Inventory listener error:",t)})},async loadData(){try{const[t,e,s,o,r,a]=await Promise.all([C.collection("products").get(),C.collection("sales").get(),C.collection("expenses").get(),C.collection("events").orderBy("date","desc").get(),C.collection("consignors").get(),C.collection("extra_income").get()]);this.state.inventory=t.docs.map(n=>{const i=n.data();return{id:n.id,...i,condition:i.condition||"VG",owner:i.owner||"El Cuartito",label:i.label||"Desconocido",storageLocation:i.storageLocation||"Tienda",cover_image:i.cover_image||i.coverImage||null}}),this.state.sales=e.docs.map(n=>{var c,p;const i=n.data(),l={id:n.id,...i,date:i.date||((c=i.timestamp)!=null&&c.toDate?i.timestamp.toDate().toISOString().split("T")[0]:(p=i.created_at)!=null&&p.toDate?i.created_at.toDate().toISOString().split("T")[0]:new Date().toISOString().split("T")[0])};return i.total_amount!==void 0&&i.total===void 0&&(l.total=i.total_amount),i.payment_method&&!i.paymentMethod&&(l.paymentMethod=i.payment_method),l.items&&Array.isArray(l.items)&&(l.items=l.items.map(b=>({...b,priceAtSale:b.priceAtSale!==void 0?b.priceAtSale:b.unitPrice||0,qty:b.qty!==void 0?b.qty:b.quantity||1,costAtSale:b.costAtSale!==void 0?b.costAtSale:b.cost||0}))),l}).filter(n=>n.status!=="PENDING"&&n.status!=="failed").sort((n,i)=>{const l=new Date(n.date);return new Date(i.date)-l}),this.state.expenses=s.docs.map(n=>{var l;const i=n.data();return{id:n.id,...i,date:i.fecha_factura||i.date||((l=i.timestamp)==null?void 0:l.split("T")[0])||new Date().toISOString().split("T")[0]}}).sort((n,i)=>new Date(i.date)-new Date(n.date)),this.state.events=o.docs.map(n=>({id:n.id,...n.data()})),this.state.consignors=r.docs.map(n=>{const i=n.data();return{id:n.id,...i,agreementSplit:i.split||i.agreementSplit||(i.percentage?Math.round(i.percentage*100):70)}}),await this.loadInvestments(),this.state.extraIncome=a.docs.map(n=>({id:n.id,...n.data()})).sort((n,i)=>new Date(i.date)-new Date(n.date)),this.initFuse(),this.refreshCurrentView()}catch(t){console.error("Failed to load data:",t),this.showToast("❌ Error de conexión: "+t.message,"error")}},refreshCurrentView(){const t=document.getElementById("app-content");if(t)switch(this.state.currentView){case"dashboard":this.renderDashboard(t);break;case"inventory":this.renderInventory(t);break;case"sales":this.renderSales(t);break;case"onlineSales":this.renderOnlineSales(t);break;case"discogsSales":this.renderDiscogsSales(t);break;case"expenses":this.renderExpenses(t);break;case"consignments":this.renderConsignments(t);break;case"backup":this.renderBackup(t);break;case"settings":this.renderSettings(t);break;case"calendar":this.renderCalendar(t);break;case"shipping":this.renderShipping(t);break;case"pickups":this.renderPickups(t);break;case"investments":this.renderInvestments(t);break;case"vatReport":this.renderVATReport(t);break;case"datosLegales":this.renderDatosLegales(t);break;case"contabilidad":this.renderContabilidad(t);break;case"facturasManual":this.renderFacturasManual(t);break;case"extraIncome":this.renderExtraIncome(t);break}},renderDatosLegales(t){const e=`
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
        `;t.innerHTML=e},renderContabilidad(t){const e=new Date().getFullYear(),s=Math.floor(new Date().getMonth()/3)+1;this.state.contabilidadYear||(this.state.contabilidadYear=e),this.state.contabilidadQuarter||(this.state.contabilidadQuarter=s),this.state.contabilidadInvoices||(this.state.contabilidadInvoices=[]),this.state.contabilidadLoading||(this.state.contabilidadLoading=!1);const o=this.state.contabilidadYear,r=this.state.contabilidadQuarter,a=this.state.contabilidadInvoices,n=this.state.contabilidadLoading,i=c=>{const p={local:"bg-emerald-100 text-emerald-700",online:"bg-blue-100 text-blue-700",discogs:"bg-purple-100 text-purple-700"},b={local:"Tienda",online:"Webshop",discogs:"Discogs"};return`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${p[c]||"bg-slate-100 text-slate-600"}">${b[c]||c}</span>`},l=`
            <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 class="font-display text-3xl font-bold text-brand-dark mb-1">📑 <span class="text-brand-orange">Contabilidad</span></h1>
                        <p class="text-slate-500 font-medium">Facturas de venta — Brugtmoms compliance</p>
                    </div>
                </div>

                <!-- Filters + Download Quarter -->
                <div class="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 mb-6">
                    <div class="flex flex-wrap items-center gap-4">
                        <div class="flex items-center gap-2">
                            <label class="text-xs font-bold text-slate-400 uppercase">Año</label>
                            <select id="contab-year" onchange="app.state.contabilidadYear = parseInt(this.value); app.loadInvoices()" class="dashboard-input bg-white h-10 px-3 rounded-lg border border-slate-200 font-semibold text-sm">
                                ${[e,e-1,e-2].map(c=>`<option value="${c}" ${c===o?"selected":""}>${c}</option>`).join("")}
                            </select>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-xs font-bold text-slate-400 uppercase">Trimestre</label>
                            <select id="contab-quarter" onchange="app.state.contabilidadQuarter = parseInt(this.value); app.loadInvoices()" class="dashboard-input bg-white h-10 px-3 rounded-lg border border-slate-200 font-semibold text-sm">
                                ${[1,2,3,4].map(c=>`<option value="${c}" ${c===r?"selected":""}>Q${c} (${["Ene-Mar","Abr-Jun","Jul-Sep","Oct-Dic"][c-1]})</option>`).join("")}
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
                            <i class="ph-bold ph-download-simple"></i> Descargar Trimestre Q${r}
                        </a>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="kpi-card">
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Facturas</div>
                        <div class="text-2xl font-bold text-brand-dark">${a.length}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Ventas Totales</div>
                        <div class="text-2xl font-bold text-brand-orange">${this.formatCurrency(a.reduce((c,p)=>c+(p.totalAmount||0),0))}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Tienda</div>
                        <div class="text-2xl font-bold text-emerald-600">${a.filter(c=>c.channel==="local").length}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Online + Discogs</div>
                        <div class="text-2xl font-bold text-blue-600">${a.filter(c=>c.channel!=="local").length}</div>
                    </div>
                </div>

                <!-- Invoice Table -->
                <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                    ${n?`
                        <div class="flex items-center justify-center py-20">
                            <div class="text-center">
                                <div class="animate-spin w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p class="text-slate-400 font-medium">Cargando facturas...</p>
                            </div>
                        </div>
                    `:a.length===0?`
                        <div class="flex flex-col items-center justify-center py-20">
                            <i class="ph-duotone ph-receipt text-6xl text-slate-300 mb-4"></i>
                            <p class="text-slate-400 font-medium text-lg">No hay facturas para Q${r} ${o}</p>
                            <p class="text-slate-300 text-sm mt-1">Las facturas se generan automáticamente con cada venta</p>
                        </div>
                    `:`
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
                                    ${a.map((c,p)=>`
                                        <tr class="inv-row border-b border-slate-50 ${p%2===0?"bg-white":"bg-slate-50/30"}">
                                            <td class="px-5 py-3 text-sm font-mono font-bold text-brand-dark">${c.invoiceNumber||"-"}</td>
                                            <td class="px-5 py-3 text-sm text-slate-600">${c.date||"-"}</td>
                                            <td class="px-5 py-3">${i(c.channel)}</td>
                                            <td class="px-5 py-3 text-sm font-medium text-slate-700 max-w-[150px] truncate">${c.customerName||"Butikskunde"}</td>
                                            <td class="px-5 py-3 text-sm text-slate-500 max-w-[200px] truncate">${c.itemsSummary||"-"}</td>
                                            <td class="px-5 py-3 text-sm font-bold text-brand-dark text-right">${this.formatCurrency(c.totalAmount||0)}</td>
                                            <td class="px-5 py-3 text-center">
                                                <a href="${c.downloadUrl||"#"}" target="_blank" class="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange hover:bg-brand-orange hover:text-white transition-all flex items-center justify-center mx-auto" title="Descargar PDF">
                                                    <i class="ph-bold ph-file-pdf"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    `).join("")}
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
        `;t.innerHTML=l,this.state.contabilidadLoaded||this.loadInvoices()},async loadInvoices(){this.state.contabilidadLoading=!0,this.state.contabilidadLoaded=!0,this.refreshCurrentView();try{const t=this.state.contabilidadYear,e=this.state.contabilidadQuarter,s=await re.currentUser.getIdToken(),o=await fetch(`${R}/invoices?year=${t}&quarter=${e}`,{headers:{Authorization:`Bearer ${s}`}});if(!o.ok)throw new Error("Error cargando facturas");const r=await o.json();this.state.contabilidadInvoices=r.invoices||[]}catch(t){console.error("Error loading invoices:",t),alert("Error cargando facturas: "+t.message),this.showToast("Error cargando facturas","error"),this.state.contabilidadInvoices=[]}this.state.contabilidadLoading=!1,this.refreshCurrentView()},async downloadInvoicePdf(t){try{const e=await re.currentUser.getIdToken(),s=await fetch(`${R}/invoices/${t}/download`,{headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error("Error descargando factura");const o=await s.json();o.downloadUrl&&window.open(o.downloadUrl,"_blank")}catch(e){console.error("Error downloading invoice:",e),alert("Error descargando factura: "+e.message),this.showToast("Error descargando factura","error")}},async downloadQuarterInvoices(){try{const t=this.state.contabilidadYear,e=this.state.contabilidadQuarter,s=await re.currentUser.getIdToken();this.showToast(`Preparando descarga Q${e} ${t}...`);const o=await fetch(`${R}/invoices/quarter-download?year=${t}&quarter=${e}`,{headers:{Authorization:`Bearer ${s}`}});if(!o.ok)throw new Error("Error descargando trimestre");const r=await o.json();if(!r.invoices||r.invoices.length===0){this.showToast("No hay facturas para este trimestre","error");return}const a=new JSZip,n=a.folder(`Contabilidad_ElCuartito_${t}_Q${e}`);for(const l of r.invoices)try{const c=await fetch(`${R}/invoices/${l.id}/file`,{headers:{Authorization:`Bearer ${s}`}});if(!c.ok)throw new Error(`Fetch failed for ${l.invoiceNumber}`);const p=await c.blob();n.file(l.fileName,p)}catch(c){console.error(`Error downloading ${l.fileName}:`,c)}const i=await a.generateAsync({type:"blob"});saveAs(i,`Contabilidad_ElCuartito_${t}_Q${e}.zip`),this.showToast(`✅ ${r.invoices.length} facturas descargadas`)}catch(t){console.error("Error downloading quarter:",t),alert("Error descargando trimestre: "+t.message),this.showToast("Error descargando trimestre","error")}},async backfillInvoices(){if(confirm(`¿Generar facturas PDF para todas las ventas anteriores que no tienen factura?

Esto se hará por lotes para evitar errores.`))try{this.showToast("🔄 Verificando conexión...");const t=await re.currentUser.getIdToken();try{if(!(await fetch(`${R}/api/health`)).ok)throw new Error("Servidor responde con error")}catch(i){console.error("Health check failed:",i)}this.showToast("🔄 Iniciando backfill (Modo Seguro)...");let e=0,s=0,o=0,r=1;const a=1;for(;r>0;){const i=await fetch(`${R}/invoices/backfill`,{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"},body:JSON.stringify({limit:a})});if(!i.ok){const c=await i.text();try{const p=JSON.parse(c);throw new Error(p.error||`Error ${i.status}: ${i.statusText}`)}catch{throw new Error(`Error ${i.status}: ${c.slice(0,100)}`)}}const l=await i.json();if(!l.success)throw new Error(l.error||"Unknown error from backend");e+=l.generated,s+=l.skipped,r=l.remaining,l.errors&&(o+=l.errors.length),this.showToast(`✅ Lote procesado: +${l.generated} facturas. Restantes: ${r}`),r>0&&await new Promise(c=>setTimeout(c,1e3))}const n=`✅ Backfill completado!
Generadas: ${e}
Errores: ${o}
Omitidas: ${s}`;alert(n),this.showToast("Backfill completado"),await this.loadInvoices()}catch(t){console.error("Error in backfill:",t),alert(`❌ Error en backfill:

${t.message}`),this.showToast("Error en backfill","error")}},renderFacturasManual(t){const e=(this.state.contabilidadInvoices||[]).filter(o=>o.channel==="manual"||o.isManual),s=`
            <div class="max-w-4xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 class="font-display text-3xl font-bold text-brand-dark mb-1">🧾 <span class="text-brand-orange">Generar Factura</span></h1>
                        <p class="text-slate-500 font-medium">Facturas manuales para eventos, servicios y otros</p>
                    </div>
                </div>

                <!-- Invoice Form -->
                <form id="manual-invoice-form" onsubmit="app.submitManualInvoice(event)" class="bg-white rounded-3xl shadow-sm border border-orange-100 p-8 mb-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <!-- Customer Name -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Nombre del Cliente *</label>
                            <input type="text" name="customerName" required placeholder="Ej: København Festival A/S" 
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                        </div>

                        <!-- Customer VAT -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">VAT / CVR del Cliente</label>
                            <input type="text" name="customerVAT" placeholder="Ej: DK12345678"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                        </div>

                        <!-- Customer Address -->
                        <div class="md:col-span-2">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Dirección del Cliente</label>
                            <input type="text" name="customerAddress" placeholder="Ej: Vesterbrogade 100, 1620 København V, Denmark"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                        </div>

                        <!-- Description -->
                        <div class="md:col-span-2">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Descripción del Servicio *</label>
                            <textarea name="description" required rows="3" placeholder="Ej: DJ Set para evento privado — 4 horas, incluyendo equipo de sonido"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark resize-none"></textarea>
                        </div>

                        <!-- Amount -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Precio Total (DKK) *</label>
                            <div class="relative">
                                <input type="number" name="amount" required step="0.01" min="0" placeholder="5000"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-16 outline-none focus:border-brand-orange focus:bg-white transition-all font-bold text-xl text-brand-dark">
                                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">DKK</span>
                            </div>
                        </div>

                        <!-- VAT Amount -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Heraf Moms / VAT (DKK)</label>
                            <div class="relative">
                                <input type="number" name="vatAmount" step="0.01" min="0" placeholder="1000"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-16 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">DKK</span>
                            </div>
                            <p class="text-[10px] text-slate-400 mt-1">Opcional. Cantidad de IVA incluida en el total.</p>
                        </div>

                        <!-- Date -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Fecha de Factura *</label>
                            <input type="date" name="date" required value="${new Date().toISOString().split("T")[0]}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                        </div>

                        <!-- Payment Method -->
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Método de Pago</label>
                            <select name="paymentMethod" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-dark">
                                <option value="Transfer">Transferencia Bancaria</option>
                                <option value="MobilePay">MobilePay</option>
                                <option value="CASH">Efectivo / Cash</option>
                                <option value="CARD">Tarjeta / Card</option>
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
                    ${e.length===0?`
                        <div class="py-16 text-center">
                            <i class="ph-duotone ph-note-blank text-5xl text-slate-300 mb-3 block"></i>
                            <p class="text-slate-400 font-medium">No hay facturas manuales aún</p>
                            <p class="text-slate-300 text-sm mt-1">Las facturas generadas aparecerán aquí</p>
                        </div>
                    `:`
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
                                    ${e.map((o,r)=>`
                                        <tr class="inv-row border-b border-slate-50 ${r%2===0?"bg-white":"bg-slate-50/30"}">
                                            <td class="px-5 py-3 text-sm font-mono font-bold text-brand-dark">${o.invoiceNumber||"-"}</td>
                                            <td class="px-5 py-3 text-sm text-slate-600">${o.date||"-"}</td>
                                            <td class="px-5 py-3 text-sm font-medium text-slate-700 max-w-[150px] truncate">${o.customerName||"-"}</td>
                                            <td class="px-5 py-3 text-sm text-slate-500 max-w-[200px] truncate">${o.itemsSummary||"-"}</td>
                                            <td class="px-5 py-3 text-sm font-bold text-brand-dark text-right">${this.formatCurrency(o.totalAmount||0)}</td>
                                            <td class="px-5 py-3 text-center">
                                                <a href="${o.downloadUrl||"#"}" target="_blank" class="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange hover:bg-brand-orange hover:text-white transition-all flex items-center justify-center mx-auto" title="Descargar PDF">
                                                    <i class="ph-bold ph-file-pdf"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;t.innerHTML=s,this.state.manualInvoicesLoaded||this.loadManualInvoices()},async loadManualInvoices(){try{const t=await re.currentUser.getIdToken(),e=await fetch(`${R}/invoices?year=${new Date().getFullYear()}`,{headers:{Authorization:`Bearer ${t}`}});if(!e.ok)throw new Error("Error cargando facturas");const s=await e.json();this.state.contabilidadInvoices=s.invoices||[],this.state.manualInvoicesLoaded=!0,this.state.currentView==="facturasManual"&&this.refreshCurrentView()}catch(t){console.error("Error loading manual invoices:",t)}},async submitManualInvoice(t){t.preventDefault();const e=document.getElementById("manual-invoice-form"),s=document.getElementById("manual-invoice-btn"),o=new FormData(e),r={customerName:o.get("customerName"),customerVAT:o.get("customerVAT")||void 0,customerAddress:o.get("customerAddress")||void 0,description:o.get("description"),amount:parseFloat(o.get("amount")),vatAmount:o.get("vatAmount")?parseFloat(o.get("vatAmount")):void 0,date:o.get("date"),paymentMethod:o.get("paymentMethod")};if(!r.customerName||!r.description||!r.amount||!r.date){this.showToast("Completa todos los campos obligatorios","error");return}s.disabled=!0,s.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Generando...';try{const a=await re.currentUser.getIdToken(),n=await fetch(`${R}/invoices/manual`,{method:"POST",headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json"},body:JSON.stringify(r)});if(!n.ok){const c=await n.json();throw new Error(c.error||"Error generando factura")}const i=await n.json(),l=document.getElementById("manual-invoice-result");document.getElementById("result-invoice-number").textContent=`Factura ${i.invoiceNumber} generada`,document.getElementById("result-download-link").href=i.downloadUrl,l.classList.remove("hidden"),this.showToast(`✅ Factura ${i.invoiceNumber} generada correctamente`),e.reset(),document.querySelector('[name="date"]').value=new Date().toISOString().split("T")[0],this.state.manualInvoicesLoaded=!1,this.loadManualInvoices()}catch(a){console.error("Error generating manual invoice:",a),this.showToast("❌ Error: "+a.message,"error"),alert("Error generando factura: "+a.message)}s.disabled=!1,s.innerHTML='<i class="ph-bold ph-file-pdf"></i> Generar Factura PDF'},renderExtraIncome(t){const e=this.state.extraIncome||[],s=e.reduce((n,i)=>n+(Number(i.amount)||0),0),o=e.reduce((n,i)=>n+(Number(i.vatAmount)||0),0),r=n=>({event:"🎵 Evento",service:"🔧 Servicio",other:"📦 Otro"})[n]||n,a=e.map(n=>`
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td class="py-3 px-4 text-sm text-slate-600">${n.date||"-"}</td>
                <td class="py-3 px-4 text-sm font-medium text-brand-dark">${n.description||"-"}</td>
                <td class="py-3 px-4"><span class="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">${r(n.category)}</span></td>
                <td class="py-3 px-4 text-sm font-bold text-brand-dark text-right">${Number(n.amount).toFixed(2)} DKK</td>
                <td class="py-3 px-4 text-sm text-slate-500 text-right">${Number(n.vatAmount||0).toFixed(2)} DKK</td>
                <td class="py-3 px-4 text-sm text-slate-400">${n.paymentMethod||"Transfer"}</td>
                <td class="py-3 px-4 text-center">
                    <button onclick="app.deleteExtraIncome('${n.id}')" class="text-red-400 hover:text-red-600 transition-colors" title="Eliminar">
                        <i class="ph-bold ph-trash text-lg"></i>
                    </a>
                </td>
            </tr>
        `).join("");t.innerHTML=`
            <div class="max-w-5xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 class="text-2xl font-black text-brand-dark">💰 Ingresos Extra</h1>
                        <p class="text-sm text-slate-400 mt-1">Registra ingresos por eventos, servicios y otros conceptos no relacionados con ventas de discos.</p>
                    </div>
                    <div class="flex gap-3">
                        <div class="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl px-5 py-3 text-center">
                            <p class="text-[10px] font-bold text-green-600 uppercase tracking-wider">Total Ingresos</p>
                            <p class="text-xl font-black text-green-700">${s.toFixed(2)} DKK</p>
                        </div>
                        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl px-5 py-3 text-center">
                            <p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Total VAT</p>
                            <p class="text-xl font-black text-blue-700">${o.toFixed(2)} DKK</p>
                        </div>
                    </div>
                </div>

                <!-- Add Form -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
                    <h2 class="text-lg font-bold text-brand-dark mb-4">Registrar Nuevo Ingreso</h2>
                    <form onsubmit="app.addExtraIncome(event)" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Descripción *</label>
                            <input type="text" name="description" required placeholder="DJ Event - Venue X"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all text-sm">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Categoría *</label>
                            <select name="category" required
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange focus:bg-white transition-all text-sm">
                                <option value="event">🎵 Evento</option>
                                <option value="service">🔧 Servicio</option>
                                <option value="other">📦 Otro</option>
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
                            <input type="date" name="date" required value="${new Date().toISOString().split("T")[0]}"
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
                        <div class="md:col-span-2 lg:col-span-3 flex justify-end">
                            <button type="submit"
                                class="bg-gradient-to-r from-brand-orange to-orange-500 text-white font-bold py-3 px-8 rounded-xl hover:shadow-lg hover:shadow-orange-200 transition-all">
                                <i class="ph-bold ph-plus-circle"></i> Registrar Ingreso
                            </a>
                        </div>
                    </form>
                </div>

                <!-- List -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-100">
                        <h2 class="text-lg font-bold text-brand-dark">Historial de Ingresos Extra</h2>
                    </div>
                    ${e.length===0?`
                        <div class="p-12 text-center text-slate-400">
                            <i class="ph-duotone ph-coins text-5xl mb-3"></i>
                            <p class="font-medium">No hay ingresos extra registrados</p>
                            <p class="text-sm mt-1">Usa el formulario de arriba para agregar uno.</p>
                        </div>
                    `:`
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="bg-slate-50">
                                        <th class="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                                        <th class="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descripción</th>
                                        <th class="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoría</th>
                                        <th class="text-right py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monto</th>
                                        <th class="text-right py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">VAT</th>
                                        <th class="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pago</th>
                                        <th class="text-center py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider"></th>
                                    </tr>
                                </thead>
                                <tbody>${a}</tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `},async addExtraIncome(t){t.preventDefault();const e=t.target,s=new FormData(e),o={description:s.get("description"),category:s.get("category"),amount:parseFloat(s.get("amount")),vatAmount:s.get("vatAmount")?parseFloat(s.get("vatAmount")):0,date:s.get("date"),paymentMethod:s.get("paymentMethod")||"Transfer",createdAt:firebase.firestore.FieldValue.serverTimestamp()};try{await C.collection("extra_income").add(o),this.showToast("✅ Ingreso extra registrado correctamente");const r=await C.collection("extra_income").get();this.state.extraIncome=r.docs.map(a=>({id:a.id,...a.data()})).sort((a,n)=>new Date(n.date)-new Date(a.date)),this.renderExtraIncome(document.getElementById("app-content"))}catch(r){console.error("Error adding extra income:",r),this.showToast("❌ Error: "+r.message,"error")}},async deleteExtraIncome(t){if(confirm("¿Eliminar este ingreso extra?"))try{await C.collection("extra_income").doc(t).delete(),this.state.extraIncome=this.state.extraIncome.filter(e=>e.id!==t),this.showToast("🗑️ Ingreso eliminado"),this.renderExtraIncome(document.getElementById("app-content"))}catch(e){console.error("Error deleting extra income:",e),this.showToast("❌ Error: "+e.message,"error")}},navigate(t){this.state.currentView=t,document.querySelectorAll(".nav-item, .nav-item-m").forEach(r=>{r.classList.remove("bg-orange-50","text-brand-orange"),r.classList.add("text-slate-500")});const e=document.getElementById(`nav-d-${t}`);e&&(e.classList.remove("text-slate-500"),e.classList.add("bg-orange-50","text-brand-orange"));const s=document.getElementById(`nav-m-${t}`);s&&(s.classList.remove("text-slate-400"),s.classList.add("text-brand-orange"));const o=document.getElementById("app-content");o.innerHTML="",this.refreshCurrentView()},renderCalendar(t){const e=this.state.selectedDate||new Date,s=e.getFullYear(),o=e.getMonth(),r=new Date(s,o,1),n=new Date(s,o+1,0).getDate(),i=r.getDay()===0?6:r.getDay()-1,l=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],c=b=>{const d=`${s}-${String(o+1).padStart(2,"0")}-${String(b).padStart(2,"0")}`,v=this.state.sales.some(w=>w.date===d),h=this.state.expenses.some(w=>w.date===d),f=this.state.events.some(w=>w.date===d);return{hasSales:v,hasExpenses:h,hasEvents:f}},p=`
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <div class="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
                    <!-- Calendar Grid -->
                    <div class="flex-1 bg-white rounded-2xl shadow-sm border border-orange-100 p-6 flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="font-display text-2xl font-bold text-brand-dark capitalize">
                                ${l[o]} <span class="text-brand-orange">${s}</span>
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
                            ${["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(b=>`
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider py-2">${b}</div>
                            `).join("")}
                        </div>

                        <div class="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                            ${Array(i).fill('<div class="bg-slate-50/50 rounded-xl"></div>').join("")}
                            ${Array.from({length:n},(b,d)=>{const v=d+1,h=`${s}-${String(o+1).padStart(2,"0")}-${String(v).padStart(2,"0")}`,f=e.getDate()===v,w=c(v),u=new Date().toDateString()===new Date(s,o,v).toDateString();return`
                                    <button onclick="app.selectCalendarDate('${h}')" 
                                        class="relative rounded-xl p-2 flex flex-col items-center justify-start gap-1 transition-all border-2
                                        ${f?"border-brand-orange bg-orange-50":"border-transparent hover:bg-slate-50"}
                                        ${u?"bg-blue-50":""}">
                                        <span class="text-sm font-bold ${f?"text-brand-orange":"text-slate-700"} ${u?"text-blue-600":""}">${v}</span>
                                        <div class="flex gap-1 mt-1">
                                            ${w.hasSales?'<div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>':""}
                                            ${w.hasExpenses?'<div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>':""}
                                            ${w.hasEvents?'<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>':""}
                                        </div>
                                    </a>
                                `}).join("")}
                        </div>
                    </div>

                    <!-- Day Summary -->
                    <div class="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-orange-100 p-6 flex flex-col h-full overflow-hidden">
                        ${this.renderCalendarDaySummary(e)}
                    </div>
                </div>
            </div>
        `;t.innerHTML=p},getCustomerInfo(t){const e=t.customer||{},s=t.customerName||e.name||(e.firstName?`${e.firstName} ${e.lastName||""}`.trim():"")||"Cliente",o=t.customerEmail||e.email||"-";let r=t.address||e.address||"-";if(e.shipping){const a=e.shipping;r=`${a.line1||""} ${a.line2||""}, ${a.city||""}, ${a.postal_code||""}, ${a.country||""}`.trim().replace(/^,|,$/g,"")}return{name:s,email:o,address:r}},renderCalendarDaySummary(t){const e=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,s=t.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}),o=this.state.sales.filter(l=>l.date===e),r=this.state.expenses.filter(l=>l.date===e),a=this.state.events.filter(l=>l.date===e),n=o.reduce((l,c)=>l+c.total,0),i=r.reduce((l,c)=>l+c.amount,0);return`
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h3 class="font-display text-xl font-bold text-brand-dark capitalize">${s}</h3>
                    <p class="text-xs text-slate-500 mt-1">Resumen del día</p>
                </div>
                <button onclick="app.openAddEventModal('${e}')" class="text-brand-orange hover:bg-orange-50 p-2 rounded-lg transition-colors" title="Agregar Evento">
                    <i class="ph-bold ph-plus"></i>
                </a>
            </div>

            <div class="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                <!-- Financial Summary -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-green-50 p-3 rounded-xl border border-green-100">
                        <p class="text-[10px] font-bold text-green-600 uppercase">Ventas</p>
                        <p class="text-lg font-bold text-brand-dark">${this.formatCurrency(n)}</p>
                    </div>
                    <div class="bg-red-50 p-3 rounded-xl border border-red-100">
                        <p class="text-[10px] font-bold text-red-600 uppercase">Gastos</p>
                        <p class="text-lg font-bold text-brand-dark">${this.formatCurrency(i)}</p>
                    </div>
                </div>

                <!-- Events -->
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Eventos / Notas</h4>
                    ${a.length>0?`
                        <div class="space-y-2">
                            ${a.map(l=>`
                                <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 group relative">
                                    <p class="text-sm font-medium text-brand-dark">${l.title}</p>
                                    ${l.description?`<p class="text-xs text-slate-500 mt-1">${l.description}</p>`:""}
                                    <button onclick="app.deleteEvent('${l.id}')" class="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600">
                                        <i class="ph-bold ph-trash"></i>
                                    </a>
                                </div>
                            `).join("")}
                        </div>
                    `:`
                        <div class="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p class="text-xs text-slate-400">No hay eventos registrados</p>
                            <button onclick="app.openAddEventModal('${e}')" class="text-xs text-brand-orange font-bold mt-2 hover:underline">Agregar nota</a>
                        </div>
                    `}
                </div>

                <!-- Sales List -->
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle Ventas (${o.length})</h4>
                    ${o.length>0?`
                        <div class="space-y-2">
                            ${o.map(l=>`
                                <div class="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg text-xs">
                                    <div class="truncate flex-1 pr-2">
                                        <span class="font-bold text-slate-700 block truncate">${l.album||"Venta rápida"}</span>
                                        <span class="text-slate-400 text-[10px]">${l.sku||"-"}</span>
                                    </div>
                                    <span class="font-bold text-brand-dark">${this.formatCurrency(l.total)}</span>
                                </div>
                            `).join("")}
                        </div>
                    `:'<p class="text-xs text-slate-400 italic">Sin ventas</p>'}
                </div>

                <!-- Expenses List -->
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle Gastos (${r.length})</h4>
                    ${r.length>0?`
                        <div class="space-y-2">
                            ${r.map(l=>`
                                <div class="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg text-xs">
                                    <div class="truncate flex-1 pr-2">
                                        <span class="font-bold text-slate-700 block truncate">${l.description}</span>
                                        <span class="text-slate-400 text-[10px]">${l.category}</span>
                                    </div>
                                    <span class="font-bold text-brand-dark">${this.formatCurrency(l.amount)}</span>
                                </div>
                            `).join("")}
                        </div>
                    `:'<p class="text-xs text-slate-400 italic">Sin gastos</p>'}
                </div>
            </div>
        `},changeCalendarMonth(t){const e=new Date(this.state.selectedDate);e.setMonth(e.getMonth()+t),this.state.selectedDate=e,this.renderCalendar(document.getElementById("app-content"))},selectCalendarDate(t){this.state.selectedDate=new Date(t),this.renderCalendar(document.getElementById("app-content"))},openAddEventModal(t){const e=`
            <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl transform scale-100 transition-all border border-orange-100">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-display text-xl font-bold text-brand-dark">Nuevo Evento</h3>
                        <button onclick="document.getElementById('modal-overlay').remove()" class="text-slate-400 hover:text-brand-dark transition-colors">
                            <i class="ph-bold ph-x text-xl"></i>
                        </a>
                    </div>

                    <form onsubmit="app.handleAddEvent(event)" class="space-y-4">
                        <input type="hidden" name="date" value="${t}">
                        
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
        `;document.body.insertAdjacentHTML("beforeend",e)},handleAddEvent(t){t.preventDefault();const e=new FormData(t.target),s={date:e.get("date"),title:e.get("title"),description:e.get("description"),createdAt:new Date().toISOString()};C.collection("events").add(s).then(()=>{this.showToast("✅ Evento agregado"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>console.error(o))},deleteEvent(t){confirm("¿Eliminar este evento?")&&C.collection("events").doc(t).delete().then(()=>{this.showToast("✅ Evento eliminado"),this.loadData()}).catch(e=>console.error(e))},renderBackup(t){const e=`
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
        `;t.innerHTML=e},renderSettings(t){const s=`
            <div class="max-w-2xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <h2 class="font-display text-2xl font-bold text-brand-dark mb-6">Configuración</h2>
                
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-orange-100 mb-6">
                    <h3 class="font-bold text-lg text-brand-dark mb-4">Integraciones</h3>
                    <form onsubmit="app.saveSettings(event)" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Discogs Personal Access Token</label>
                            <input type="text" name="discogs_token" value="${localStorage.getItem("discogs_token")||""}" placeholder="Ej: hSIAXlFq..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:border-brand-orange outline-none font-mono text-sm">
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
        `;t.innerHTML=s},saveSettings(t){t.preventDefault();const s=new FormData(t.target).get("discogs_token").trim();s?(localStorage.setItem("discogs_token",s),localStorage.setItem("discogs_token_warned","true"),this.showToast("Configuración guardada correctamente")):(localStorage.removeItem("discogs_token"),this.showToast("Token eliminado"))},async migrateProductCondition(){if(confirm('¿Estás seguro? Esto marcará TODOS los productos como "Usado (Second-hand)".')){this.showToast("⏳ Migrando productos...","info");try{const t=await C.collection("products").get();let e=0;const s=C.batch();t.docs.forEach(o=>{o.data().product_condition||(s.update(o.ref,{product_condition:"Second-hand"}),e++)}),await s.commit(),this.showToast(`✅ ${e} productos marcados como "Usado"`),await this.loadData()}catch(t){console.error("Migration error:",t),this.showToast("❌ Error durante la migración: "+t.message,"error")}}},async normalizeAllSkus(){const t=/^SKU\s*-\s*(\d+)$/,e=this.state.inventory.filter(r=>!t.test(r.sku)),s=this.state.inventory.map(r=>{const a=r.sku.match(t);return a?parseInt(a[1]):0});let o=Math.max(0,...s);if(e.length===0){this.showToast("✅ Todos los SKUs ya tienen formato SKU-xxx");return}if(confirm(`Se encontraron ${e.length} productos con SKU irregular.

Se les asignará un nuevo SKU desde SKU-${String(o+1).padStart(3,"0")} en adelante.

¿Continuar?`)){this.showToast("⏳ Normalizando SKUs...","info");try{for(let r=0;r<e.length;r+=500){const a=C.batch(),n=e.slice(r,r+500);for(const i of n){o++;const l=`SKU-${String(o).padStart(3,"0")}`,c=await this.findProductBySku(i.sku);c&&(a.update(c.ref,{sku:l,old_sku:i.sku}),console.log(`  → ${i.sku} → ${l} (${i.artist} - ${i.album})`))}await a.commit()}this.showToast(`✅ ${e.length} SKUs normalizados`),await this.loadData()}catch(r){console.error("SKU normalization error:",r),this.showToast("❌ Error: "+r.message,"error")}}},async backfillQuickIds(){const t=this.state.inventory.filter(e=>!e.quickId);if(t.length===0){this.showToast("✅ Todos los productos ya tienen quickId");return}if(t.sort((e,s)=>{const o=e.created_at?e.created_at.seconds?e.created_at.seconds*1e3:new Date(e.created_at).getTime():0,r=s.created_at?s.created_at.seconds?s.created_at.seconds*1e3:new Date(s.created_at).getTime():0;return o-r}),!!confirm(`Se encontraron ${t.length} productos sin quickId.

Se les asignará un ID secuencial (0001, 0002...).

¿Continuar?`)){this.showToast("⏳ Asignando QuickIDs...","info");try{const e=C.collection("metadata").doc("vinylCounter"),s=await e.get();let o=s.exists&&s.data().current||0;for(let r=0;r<t.length;r+=500){const a=C.batch(),n=t.slice(r,r+500);for(const i of n){o++;const l=String(o).padStart(4,"0"),c=await this.findProductBySku(i.sku);c&&(a.update(c.ref,{quickId:l}),console.log(`  → ${l}: ${i.artist} - ${i.album}`))}await a.commit()}await e.set({current:o},{merge:!0}),this.showToast(`✅ ${t.length} QuickIDs asignados (hasta ${String(o).padStart(4,"0")})`),await this.loadData()}catch(e){console.error("QuickID backfill error:",e),this.showToast("❌ Error: "+e.message,"error")}}},async migrateSalesData(){if(confirm("¿Migrar datos de ventas? Esto agregará información de costo y condición a ventas antiguas.")){this.showToast("⏳ Migrando ventas...","info");try{const t=await C.collection("sales").get();let e=0,s=0,o=C.batch();for(const r of t.docs){const n=r.data().items||[];let i=!1;const l=[];for(const c of n){const p={...c};if(!c.costAtSale&&c.costAtSale!==0){i=!0;const b=c.productId||c.recordId,d=c.album,v=this.state.inventory.find(h=>b&&(h.id===b||h.sku===b)||d&&h.album===d);v?(p.costAtSale=v.cost||0,p.productCondition=v.product_condition||"Second-hand",p.productId=v.id||b,p.album||(p.album=v.album)):(p.costAtSale=0,p.productCondition="Second-hand")}l.push(p)}i&&(o.update(r.ref,{items:l}),e++,s++,s>=450&&(await o.commit(),o=C.batch(),s=0))}s>0&&await o.commit(),this.showToast(`✅ ${e} ventas actualizadas con datos de producto`),await this.loadData()}catch(t){console.error("Sales migration error:",t),this.showToast("❌ Error: "+t.message,"error")}}},exportData(){const t={inventory:this.state.inventory,sales:this.state.sales,expenses:this.state.expenses,consignors:this.state.consignors,customGenres:this.state.customGenres,customCategories:this.state.customCategories,timestamp:new Date().toISOString()},e="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(t)),s=document.createElement("a");s.setAttribute("href",e),s.setAttribute("download","el_cuartito_backup_"+new Date().toISOString().slice(0,10)+".json"),document.body.appendChild(s),s.click(),s.remove()},exportInventoryToExcel(){this.showToast("⏳ Generando Excel...","info");try{const t=this.state.inventory.map(r=>{const a=[r.genre,r.genre2,r.genre3,r.genre4,r.genre5].filter(Boolean).join(", ");return{SKU:r.sku||"",Artista:r.artist||"",Álbum:r.album||"",Sello:r.label||"",Año:r.year||"",Géneros:a,"Condición Vinilo":r.status||"","Condición Cover":r.sleeveCondition||"","Condición Producto":r.product_condition||"Second-hand","Precio (DKK)":r.price||0,"Costo (DKK)":r.cost||0,Stock:r.stock||0,"En Web":r.is_online?"Sí":"No","En Discogs":r.discogs_listing_id?"Sí":"No","Discogs Listing ID":r.discogs_listing_id||"","Discogs Release ID":r.discogs_release_id||r.discogsId||"",Consignatario:r.consignor||"","Label Disquería":r.storageLocation||"",Ubicación:r.location||"",Notas:r.notes||"","Fecha Creación":r.createdAt?new Date(r.createdAt).toLocaleDateString("es-ES"):"","URL Imagen":r.imageUrl||""}}),e=XLSX.utils.book_new(),s=XLSX.utils.json_to_sheet(t);s["!cols"]=[{wch:12},{wch:25},{wch:30},{wch:20},{wch:6},{wch:30},{wch:12},{wch:12},{wch:15},{wch:10},{wch:10},{wch:6},{wch:8},{wch:10},{wch:15},{wch:15},{wch:15},{wch:15},{wch:12},{wch:30},{wch:12},{wch:40}],XLSX.utils.book_append_sheet(e,s,"Inventario");const o=`ElCuartito_Inventario_${new Date().toISOString().slice(0,10)}.xlsx`;XLSX.writeFile(e,o),this.showToast(`✅ Excel exportado: ${this.state.inventory.length} discos`)}catch(t){console.error("Error exporting to Excel:",t),this.showToast("❌ Error al exportar: "+t.message,"error")}},importData(t){const e=t.files[0];if(!e)return;const s=new FileReader;s.onload=o=>{try{const r=JSON.parse(o.target.result);if(!confirm("¿Estás seguro de restaurar este backup? Se sobrescribirán los datos actuales."))return;const a=C.batch();alert("La importación completa sobrescribiendo datos en la nube es compleja. Por seguridad, esta función solo agrega/actualiza items de inventario por ahora."),r.inventory&&r.inventory.forEach(n=>{const i=C.collection("products").doc(n.sku);a.set(i,n)}),a.commit().then(()=>{this.showToast("Datos importados (Inventario)")})}catch(r){alert("Error al leer el archivo de respaldo"),console.error(r)}},s.readAsText(e)},resetApplication(){if(!confirm(`⚠️ ¡ADVERTENCIA! ⚠️

Esto borrará PERMANENTEMENTE todo el inventario, ventas, gastos y socios de la base de datos.

¿Estás absolutamente seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Iniciando borrado completo...");const e=s=>C.collection(s).get().then(o=>{const r=C.batch();return o.docs.forEach(a=>{r.delete(a.ref)}),r.commit()});Promise.all([e("inventory"),e("sales"),e("expenses"),e("consignors"),C.collection("settings").doc("general").delete()]).then(()=>{this.showToast("♻️ Aplicación restablecida de fábrica"),setTimeout(()=>location.reload(),1500)}).catch(s=>{console.error(s),alert("Error al borrar datos: "+s.message)})},resetSales(){if(!confirm(`⚠️ ADVERTENCIA ⚠️

Esto borrará PERMANENTEMENTE todas las ventas (manuales y online) de la base de datos.

El inventario, gastos y socios NO serán afectados.

¿Estás seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Borrando todas las ventas..."),C.collection("sales").get().then(e=>{const s=C.batch();return e.docs.forEach(o=>{s.delete(o.ref)}),s.commit()}).then(()=>{this.showToast("✅ Todas las ventas han sido eliminadas"),setTimeout(()=>location.reload(),1500)}).catch(e=>{console.error(e),alert("Error al borrar ventas: "+e.message)})},async findProductBySku(t){try{const e=await C.collection("products").where("sku","==",t).get();if(e.empty)return null;const s=e.docs[0];return{id:s.id,ref:s.ref,data:s.data()}}catch(e){return console.error("Error finding product by SKU:",e),null}},logInventoryMovement(t,e){let s="";t==="EDIT"?s="Producto actualizado":t==="ADD"?s="Ingreso de inventario":t==="DELETE"?s="Egreso manual":t==="SOLD"&&(s="Venta registrada"),C.collection("inventory_logs").add({type:t,sku:e.sku||"Unknown",album:e.album||"Unknown",artist:e.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:s}).catch(o=>console.error("Error logging movement:",o))},openInventoryLogModal(){C.collection("inventory_logs").orderBy("timestamp","desc").limit(50).get().then(t=>{const s=`
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
                                    ${t.docs.map(o=>({id:o.id,...o.data()})).map(o=>{let r="bg-slate-100 text-slate-600";o.type==="ADD"&&(r="bg-green-100 text-green-700"),o.type==="DELETE"&&(r="bg-red-100 text-red-700"),o.type==="EDIT"&&(r="bg-blue-100 text-blue-700"),o.type==="SOLD"&&(r="bg-purple-100 text-purple-700");const a=o.timestamp?o.timestamp.toDate?o.timestamp.toDate():new Date(o.timestamp):new Date;return`
                                            <tr>
                                                <td class="p-4 text-slate-500 whitespace-nowrap">
                                                    ${a.toLocaleDateString()} <span class="text-xs text-slate-400 opacity-75">${a.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                                                </td>
                                                <td class="p-4">
                                                    <span class="px-2 py-1 rounded-md text-[10px] font-bold uppercase ${r}">${o.type}</span>
                                                </td>
                                                <td class="p-4 font-bold text-brand-dark">${o.album||"Unknown"}</td>
                                                <td class="p-4 font-mono text-xs text-slate-400">${o.sku||"N/A"}</td>
                                            </tr>
                                        `}).join("")||'<tr><td colspan="4" class="p-8 text-center text-slate-400">No hay movimientos registrados</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;document.body.insertAdjacentHTML("beforeend",s)})},async syncWithDiscogs(){const t=document.getElementById("discogs-sync-btn");if(!t)return;const e=t.innerHTML;t.disabled=!0,t.innerHTML=`
            <i class="ph-bold ph-circle-notch text-xl animate-spin"></i>
            <span class="text-sm font-bold hidden sm:inline">Sincronizando...</span>
        `;try{const s=R,r=await(await fetch(`${s}/discogs/sync`,{method:"POST",headers:{"Content-Type":"application/json"}})).json(),n=await(await fetch(`${s}/discogs/sync-orders`,{method:"POST",headers:{"Content-Type":"application/json"}})).json();if(r.success||n&&n.success){let i=`✅ Sincronizado: ${r.synced||0} productos`;n&&n.salesCreated>0&&(i+=`. ¡Detectadas ${n.salesCreated} nuevas ventas!`),this.showToast(i),await this.loadData(),this.refreshCurrentView()}else throw new Error(r.error||n&&n.error||"Error desconocido")}catch(s){console.error("Sync error:",s),this.showToast(`❌ Error al sincronizar: ${s.message}`)}finally{t.disabled=!1,t.innerHTML=e}},formatCurrency(t,e=!0){const s=new Intl.NumberFormat("da-DK",{style:"currency",currency:"DKK"}).format(t);return e?`<span class="blur-money">${s}</span>`:`<span>${s}</span>`},formatDate(t){return t?new Date(t).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}):"-"},getMonthName(t){return["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][t]},generateId(){return Date.now().toString(36)+Math.random().toString(36).substr(2)},showToast(t){const e=document.getElementById("toast");document.getElementById("toast-message").innerHTML=t,e.classList.remove("opacity-0","-translate-y-20","md:translate-y-20"),setTimeout(()=>{e.classList.add("opacity-0","-translate-y-20","md:translate-y-20")},3e3)},setupNavigation(){},setupMobileMenu(){},togglePrivacyMode(){this.state.privacyMode=!this.state.privacyMode,this.state.privacyMode?document.body.classList.add("privacy-active"):document.body.classList.remove("privacy-active");const t=this.state.privacyMode?"ph-bold ph-eye-slash":"ph-bold ph-eye",e=document.querySelector("#privacy-toggle-desktop i"),s=document.querySelector("#privacy-toggle-mobile i");e&&(e.className=t),s&&(s.className=t),this.showToast(this.state.privacyMode?"🔒 Modo Privacidad Activado":"👁️ Modo Privacidad Desactivado")},toggleMobileMenu(){const t=document.getElementById("mobile-menu"),e=document.getElementById("mobile-menu-overlay");!t||!e||(t.classList.contains("translate-y-full")?(t.classList.remove("translate-y-full"),e.classList.remove("hidden")):(t.classList.add("translate-y-full"),e.classList.add("hidden")))},toggleMonthFilter(t){const e=this.state.filterMonths.indexOf(t);e===-1?this.state.filterMonths.push(t):this.state.filterMonths.length>1&&this.state.filterMonths.splice(e,1),this.state.filterMonths.sort((s,o)=>s-o),this.refreshCurrentView()},renderDashboard(t){var e,s;try{const o=this.state.filterMonths,r=this.state.filterYear,a=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],n=this.state.sales.filter(m=>{var K;const k=(K=m.timestamp)!=null&&K.toDate?m.timestamp.toDate():new Date(m.timestamp||m.date);return k.getFullYear()===r&&o.includes(k.getMonth())}),i=[...n].sort((m,k)=>{var j,A;const K=(j=m.timestamp)!=null&&j.toDate?m.timestamp.toDate():new Date(m.timestamp||m.date);return((A=k.timestamp)!=null&&A.toDate?k.timestamp.toDate():new Date(k.timestamp||k.date))-K}),l=[...this.state.sales.map(m=>({...m,type:"sale",sortDate:new Date(m.date)})),...this.state.expenses.map(m=>({...m,type:"expense",sortDate:new Date(m.date||m.fecha_factura)}))].sort((m,k)=>k.sortDate-m.sortDate).slice(0,5),c=[],p=[];for(let m=29;m>=0;m--){const k=new Date;k.setDate(k.getDate()-m);const K=k.toISOString().split("T")[0];c.push(k.getDate());const B=this.state.sales.filter(j=>j.date===K).reduce((j,A)=>j+(Number(A.total||A.total_amount)||0),0);p.push(B)}const b=new Date,d=b.getMonth(),v=b.getFullYear(),h=d===0?11:d-1,f=d===0?v-1:v,w=this.state.sales.filter(m=>{const k=new Date(m.date);return k.getMonth()===d&&k.getFullYear()===v}).reduce((m,k)=>m+(Number(k.originalTotal||k.total_amount||k.total)||0),0)+(this.state.extraIncome||[]).filter(m=>{const k=new Date(m.date);return k.getMonth()===d&&k.getFullYear()===v}).reduce((m,k)=>m+(Number(k.amount)||0),0),u=this.state.sales.filter(m=>{const k=new Date(m.date);return k.getMonth()===h&&k.getFullYear()===f}).reduce((m,k)=>m+(Number(k.originalTotal||k.total_amount||k.total)||0),0)+(this.state.extraIncome||[]).filter(m=>{const k=new Date(m.date);return k.getMonth()===h&&k.getFullYear()===f}).reduce((m,k)=>m+(Number(k.amount)||0),0),g=u>0?(w-u)/u*100:0,$=`${g>=0?"+":""}${g.toFixed(1)}% vs ${this.getMonthName(h)}`;let E=0,S=0,I=0,y=0,D=0,_=0,M=0,N=0;n.forEach(m=>{var we;const k=((we=m.channel)==null?void 0:we.toLowerCase())==="discogs",K=Number(m.originalTotal)||Number(m.total_amount)||Number(m.total)||0,B=Number(m.total)||Number(m.total_amount)||0,j=k?K-B:0,A=Number(m.shipping_cost)||0;E+=K,I+=A;let oe=0;const me=m.items||[];me.length>0?me.forEach(X=>{const pe=Number(X.priceAtSale||X.unitPrice||X.price)||0,$e=Number(X.qty||X.quantity)||1;let xe=Number(X.costAtSale||X.cost)||0;const Ae=(X.owner||"").toLowerCase();let Ee=X.productCondition||X.condition;const Le=pe*$e;if(xe===0||!Ee){const ge=X.productId||X.recordId,_e=X.album,De=this.state.inventory.find(je=>ge&&(je.id===ge||je.sku===ge)||_e&&je.album===_e);De&&(xe===0&&(xe=De.cost||0),Ee||(Ee=De.product_condition||De.condition||"Used"))}if(Ee||(Ee="Used"),Ee==="New")D+=Le*.2;else{const ge=Le-xe*$e;_+=ge>0?ge*.2:0}if(Ae==="el cuartito"||Ae==="")xe=Number(X.costAtSale||X.cost)||0;else{if(xe===0||isNaN(xe)){const ge=this.state.consignors?this.state.consignors.find(De=>(De.name||"").toLowerCase()===Ae):null,_e=ge&&(ge.agreementSplit||ge.split)||70;xe=pe*(Number(_e)||70)/100}y+=xe*$e}oe+=(pe-xe)*$e}):(oe=K,D+=K*.2);const ce=parseFloat(m.shipping_income||m.shipping||m.shipping_cost||0);ce>0&&(M+=ce*.2,N+=ce),S+=oe-j}),(this.state.extraIncome||[]).filter(m=>{const k=new Date(m.date);return k.getFullYear()===r&&o.includes(k.getMonth())}).forEach(m=>{const k=Number(m.amount)||0,K=Number(m.vatAmount)||0;E+=k,S+=k,D+=K});const G=this.state.expenses.filter(m=>{var B;const k=m.fecha_factura?new Date(m.fecha_factura):(B=m.timestamp)!=null&&B.toDate?m.timestamp.toDate():new Date(m.timestamp||m.date);return(m.categoria_tipo==="operativo"||m.categoria_tipo==="stock_nuevo"||m.is_vat_deductible)&&k.getFullYear()===r&&o.includes(k.getMonth())}).reduce((m,k)=>m+(parseFloat(k.monto_iva)||0),0),Z=(this.state.inventory||[]).filter(m=>{if(!m.item_phantom_vat||m.item_phantom_vat<=0||m.provider_origin!=="EU_B2B")return!1;const k=m.acquisition_date?new Date(m.acquisition_date):null;return k?k.getFullYear()===r&&o.includes(k.getMonth()):!1}).reduce((m,k)=>m+(k.item_phantom_vat||0),0),Q=(this.state.inventory||[]).filter(m=>{if(!m.item_real_vat||m.item_real_vat<=0||m.provider_origin!=="DK_B2B")return!1;const k=m.acquisition_date?new Date(m.acquisition_date):null;return k?k.getFullYear()===r&&o.includes(k.getMonth()):!1}).reduce((m,k)=>m+(k.item_real_vat||0),0),ee=D+_+M+Z,te=G+Z+Q,T=ee-te,O=this.state.expenses.filter(m=>{const k=new Date(m.date||m.fecha_factura);return k.getFullYear()===r&&o.includes(k.getMonth())}).reduce((m,k)=>m+(Number(k.monto_total||k.amount)||0),0),se=S-T-O,ae=S-T,L=this.state.inventory.reduce((m,k)=>m+k.price*k.stock,0),ie=this.state.inventory.reduce((m,k)=>m+k.stock,0),de=this.state.inventory.filter(m=>m.stock>0&&m.stock<1),H=this.state.sales.filter(m=>{var k;return m.fulfillment_status==="preparing"||m.status==="paid"||((k=m.channel)==null?void 0:k.toLowerCase())==="discogs"&&m.status!=="shipped"&&m.fulfillment_status!=="shipped"}),W=T,V=o.length===12?`Año ${r} `:`${o.map(m=>this.getMonthName(m)).join(", ")} ${r} `,F=this.state.dashboardAnalysisMode||"genre",U={},z={};let P=0,q=0,ue=0;n.forEach(m=>{const k=m.items||[],K=(B,j)=>{const A=this.state.inventory.find(pe=>B&&(pe.id===B||pe.sku===B)||j&&pe.album===j);if(!A)return null;if(F==="storage")return A.storageLocation||null;const oe=[A.genre,A.genre2,A.genre3,A.genre4,A.genre5].filter(Boolean),me=[];oe.forEach(pe=>{me.push(...pe.split(",").map($e=>$e.trim()).filter(Boolean))});const ce=[...new Set(me)],we=ce.filter(pe=>pe.toLowerCase()!=="electronic");return(we.length>0?we:ce.length>0?ce:["Otros"])[0]||null};if(k.length>0)k.forEach(B=>{const j=B.productId||B.recordId,A=K(j,B.album)||(F==="storage"?"Sin ubicación":m.genre||"Otros"),oe=Number(B.qty||B.quantity)||1,me=Number(B.priceAtSale||B.unitPrice||B.price)||0;U[A]=(U[A]||0)+oe,z[A]=(z[A]||0)+me*oe,P+=oe,(B.productCondition||B.condition||"Used")==="New"?q+=oe:ue+=oe});else{const B=Number(m.quantity)||1,j=Number(m.originalTotal||m.total_amount||m.total)||0,A=F==="storage"?"Sin ubicación":m.genre||"Otros";U[A]=(U[A]||0)+B,z[A]=(z[A]||0)+j,P+=B,ue+=B}});const ne=Object.entries(U).sort((m,k)=>k[1]-m[1]),ve=Object.entries(z).sort((m,k)=>k[1]-m[1]),ye=ve.length>0?{name:ve[0][0],revenue:ve[0][1]}:{name:"N/A",revenue:0},Te=n.length>0?E/n.length:0,Ie=P>0?Math.round(q/P*100):0,be=P>0?Math.round(ue/P*100):0,le=["#FF6B4A","#F59E0B","#14B8A6","#8B5CF6","#F43F5E","#0EA5E9","#84CC16","#D946EF","#64748B"],he=F==="storage"?"Análisis por Ubicación":"Análisis por Género Musical",ke=F==="storage"?"ph-map-pin":"ph-music-notes-simple",Me=F==="storage"?"Ubicación Más Rentable":"Género Más Rentable",Be=`
            <div class="max-w-7xl mx-auto space-y-8 pb-24 md:pb-8 px-4 md:px-8 pt-6">
                <!-- Header with Navigation and Filter -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-brand-orange rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl shadow-brand-orange/20">
                            <i class="ph-fill ph-house-line"></i>
                        </div>
                        <div>
                            <h2 class="font-display text-3xl font-bold text-brand-dark">Resumen Operativo</h2>
                            <p class="text-slate-500 text-sm">Monitor de actividad: <span class="font-bold text-brand-orange">${V}</span></p>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                        <select id="dashboard-year" onchange="app.updateFilter('year', this.value)" class="bg-slate-50 text-xs font-bold text-brand-dark px-3 py-2 rounded-xl border-none outline-none cursor-pointer">
                            <option value="2026" ${this.state.filterYear===2026?"selected":""}>2026</option>
                            <option value="2025" ${this.state.filterYear===2025?"selected":""}>2025</option>
                        </select>
                        <div class="h-6 w-px bg-slate-100 mx-1"></div>
                        <div class="flex gap-1 overflow-x-auto max-w-[300px] md:max-w-none no-scrollbar">
                            <button onclick="app.state.filterMonths=[0,1,2,3,4,5,6,7,8,9,10,11];app.refreshCurrentView()"
                                class="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${o.length===12?"bg-brand-orange text-white shadow-lg shadow-brand-orange/20":"text-slate-400 hover:text-brand-dark hover:bg-slate-50"}">
                                Todo
                            </button>
                            <div class="w-px bg-slate-200 mx-0.5 self-stretch"></div>
                            ${a.map((m,k)=>`
                                <button onclick="app.toggleMonthFilter(${k})" 
                                    class="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${o.includes(k)?"bg-brand-orange text-white shadow-lg shadow-brand-orange/20":"text-slate-400 hover:text-brand-dark hover:bg-slate-50"}">
                                    ${m}
                                </button>
                            `).join("")}
                        </div>
                    </div>
                </div>

                <!-- KPI Top Grid (3 Status Cards) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Card 1: Ingresos del Período -->
                    <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-brand-orange">
                                <i class="ph-bold ph-chart-line-up text-xl"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Ingresos del Período</span>
                        </div>
                        <p class="text-4xl font-display font-bold text-brand-dark mb-2">${this.formatCurrency(E)}</p>
                        <div class="flex items-center gap-2">
                             <span class="text-[10px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                ${n.length} ventas · ${P} uds
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
                        <p class="text-4xl font-display font-bold text-emerald-600 mb-2">${this.formatCurrency(se)}</p>
                        <p class="text-[10px] text-slate-400 font-medium">Incluye costos, fees y gastos operativos.</p>
                    </div>

                    <!-- Card 3: Alerta de Pedidos -->
                    <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 ${H.length>0?"bg-red-50 text-red-500":"bg-green-50 text-green-500"} rounded-xl flex items-center justify-center">
                                <i class="ph-bold ${H.length>0?"ph-package":"ph-check-circle"} text-xl"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Alerta de Pedidos</span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            ${H.length>0?`<p class="text-5xl font-display font-bold text-red-500">${H.length}</p>`:'<p class="text-3xl font-display font-bold text-green-600">Al día</p>'}
                        </div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Pedidos por despachar</p>
                    </div>
                </div>

                <!-- Análisis por Categoría (Género / Ubicación) -->
                <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                        <h3 class="font-bold text-lg text-brand-dark flex items-center gap-3">
                            <div class="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-brand-orange">
                                <i class="ph-bold ${ke} text-xl"></i>
                            </div>
                            ${he}
                        </h3>
                        <div class="flex items-center gap-3">
                            <select onchange="app.state.dashboardAnalysisMode = this.value; app.renderDashboard(document.getElementById('app-content'))"
                                class="bg-slate-50 text-xs font-bold text-brand-dark px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer hover:border-brand-orange transition-colors">
                                <option value="genre" ${F==="genre"?"selected":""}>🎵 Por Género</option>
                                <option value="storage" ${F==="storage"?"selected":""}>📍 Por Ubicación</option>
                            </select>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <i class="ph-bold ph-vinyl-record mr-1"></i> ${P} unidades vendidas
                            </span>
                        </div>
                    </div>
                    ${ne.length>0?`
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div class="lg:col-span-5">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Cuota de Mercado</p>
                            <div class="h-80">
                                <canvas id="genreDonutChart"></canvas>
                            </div>
                        </div>
                        <div class="lg:col-span-7">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Ranking por Volumen</p>
                            <div style="height: ${Math.max(280,ne.length*40)}px">
                                <canvas id="genreBarChart"></canvas>
                            </div>
                        </div>
                    </div>
                    `:`
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
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${Me}</span>
                        </div>
                        <p class="text-2xl font-display font-bold text-brand-dark mb-1">${ye.name}</p>
                        <p class="text-sm font-bold text-amber-500">${this.formatCurrency(ye.revenue)} en ingresos</p>
                    </div>

                    <!-- Ticket Promedio -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                <i class="ph-bold ph-tag text-xl"></i>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ticket Promedio</span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark mb-1">${this.formatCurrency(Te)}</p>
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
                                    <div class="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-700 ease-out" style="width: ${Ie}%"></div>
                                </div>
                            </div>
                            <div class="flex justify-between mt-2.5">
                                <span class="text-[10px] font-bold text-teal-600 flex items-center gap-1">
                                    <span class="inline-block w-2 h-2 rounded-full bg-teal-500"></span> Nuevo ${Ie}% (${q})
                                </span>
                                <span class="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    <span class="inline-block w-2 h-2 rounded-full bg-slate-300"></span> Usado ${be}% (${ue})
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
                                        ${l.map(m=>{const k=m.type==="sale",K=k?m.album||"Venta de Items":m.proveedor||m.description||"Gasto registrado",B=k?m.channel||"Tienda Local":m.categoria||"Operativo";let j="ph-receipt";if(k){const A=(m.channel||"").toLowerCase();A.includes("web")&&(j="ph-globe-simple"),A.includes("discogs")&&(j="ph-vinyl-record")}else j="ph-credit-card";return`
                                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                                    <td class="px-6 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <div class="w-10 h-10 rounded-xl ${k?"bg-orange-50 text-brand-orange":"bg-slate-100 text-slate-400"} flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                                                                 <i class="ph-bold ${j} text-lg"></i>
                                                             </div>
                                                             <div class="min-w-0">
                                                                 <div class="font-bold text-sm text-brand-dark truncate max-w-[200px]" title="${K}">${K}</div>
                                                                 <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${B}</div>
                                                             </div>
                                                         </div>
                                                     </td>
                                                     <td class="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                         ${this.formatDate(m.date||m.fecha_factura)}
                                                     </td>
                                                     <td class="px-6 py-4 text-right">
                                                         <span class="font-bold text-sm ${k?"text-brand-dark":"text-red-500"}">
                                                            ${k?"":"-"}${this.formatCurrency(m.total||m.monto_total||m.amount||0)}
                                                         </span>
                                                     </td>
                                                 </tr>
                                             `}).join("")||'<tr><td colspan="3" class="p-12 text-center text-slate-400 italic">Sin movimientos recientes</td></tr>'}
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
                                        <span class="text-xl font-display font-bold text-brand-orange">${this.formatCurrency(W)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;t.innerHTML=Be,this.renderDashboardCharts(n,c,p);const Se=(e=document.getElementById("genreDonutChart"))==null?void 0:e.getContext("2d");if(Se&&ne.length>0){this.genreDonutChartInstance&&this.genreDonutChartInstance.destroy();const m=ne.map(B=>B[0]),k=ne.map(B=>B[1]),K=ne.map((B,j)=>le[j%le.length]);this.genreDonutChartInstance=new Chart(Se,{type:"doughnut",data:{labels:m,datasets:[{data:k,backgroundColor:K,borderWidth:0,hoverOffset:8}]},options:{responsive:!0,maintainAspectRatio:!1,cutout:"62%",plugins:{legend:{position:"bottom",labels:{boxWidth:12,boxHeight:12,borderRadius:3,useBorderRadius:!0,padding:14,font:{size:11,weight:"600",family:"'DM Sans', sans-serif"},color:"#334155"}},tooltip:{backgroundColor:"#1e293b",titleFont:{size:11,weight:"700"},bodyFont:{size:13,weight:"700"},padding:14,cornerRadius:12,callbacks:{label:B=>{const j=B.dataset.data.reduce((oe,me)=>oe+me,0),A=(B.parsed/j*100).toFixed(1);return` ${B.parsed} uds — ${A}%`}}}}},plugins:[{id:"centerText",beforeDraw(B){const{ctx:j,chartArea:A}=B;if(!A)return;j.save();const oe=(A.left+A.right)/2,me=(A.top+A.bottom)/2,ce=Math.min(A.right-A.left,A.bottom-A.top)/7;j.font=`bold ${ce}px 'DM Sans', sans-serif`,j.textBaseline="middle",j.textAlign="center",j.fillStyle="#1e293b";const we=B.data.datasets[0].data.reduce((X,pe)=>X+pe,0);j.fillText(we,oe,me-ce*.35),j.font=`600 ${ce*.42}px 'DM Sans', sans-serif`,j.fillStyle="#94a3b8",j.fillText("unidades",oe,me+ce*.55),j.restore()}}]})}const Ce=(s=document.getElementById("genreBarChart"))==null?void 0:s.getContext("2d");if(Ce&&ne.length>0){this.genreBarChartInstance&&this.genreBarChartInstance.destroy();const m=ne.map(B=>B[0]),k=ne.map(B=>B[1]),K=ne.map((B,j)=>le[j%le.length]);this.genreBarChartInstance=new Chart(Ce,{type:"bar",data:{labels:m,datasets:[{label:"Unidades",data:k,backgroundColor:K.map(B=>B+"30"),borderColor:K,borderWidth:2,borderRadius:8,borderSkipped:!1,barThickness:28}]},options:{responsive:!0,maintainAspectRatio:!1,indexAxis:"y",plugins:{legend:{display:!1},tooltip:{backgroundColor:"#1e293b",titleFont:{size:11,weight:"700"},bodyFont:{size:13,weight:"700"},padding:14,cornerRadius:12,callbacks:{label:B=>` ${B.parsed.x} unidades vendidas`}}},scales:{x:{beginAtZero:!0,grid:{color:"#f1f5f9"},ticks:{font:{size:10,weight:"600"},color:"#94a3b8"}},y:{grid:{display:!1},ticks:{font:{size:11,weight:"700",family:"'DM Sans', sans-serif"},color:"#334155",padding:8}}}}})}}catch(o){console.error("Dashboard render error:",o),t.innerHTML=`<div class="p-12 text-center text-red-500 font-bold bg-red-50 rounded-3xl m-8 border border-red-100">
                <i class="ph-bold ph-warning-circle text-4xl mb-4"></i>
                <p>Error al cargar el dashboard: ${o.message}</p>
                <button onclick="app.loadData()" class="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl">Intentar de nuevo</a>
            </div>`}},renderInventoryCart(){const t=document.getElementById("inventory-cart-container");if(!t)return;if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden");const e=this.state.cart.map((s,o)=>`
    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                <div class="truncate pr-2">
                    <p class="font-bold text-xs text-brand-dark truncate">${s.album}</p>
                    <p class="text-[10px] text-slate-500 truncate">${s.is_rsd_discount?`<span class="line-through opacity-50">${this.formatCurrency(s.price,!1)}</span> <span class="text-orange-600 font-bold">${this.formatCurrency(this.getEffectivePrice(s),!1)}</span>`:this.formatCurrency(s.price,!1)}</p>
                </div>
                <button onclick="app.removeFromCart(${o})" class="text-red-400 hover:text-red-600">
                    <i class="ph-bold ph-x"></i>
                </a>
            </div>
    `).join("");t.innerHTML=`
    <div id="cart-widget" class="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-bold text-brand-dark flex items-center gap-2">
                        <i class="ph-fill ph-shopping-cart text-brand-orange"></i> Carrito 
                        <span class="bg-brand-orange text-white text-xs px-1.5 py-0.5 rounded-full">${this.state.cart.length}</span>
                    </h3>
                    <button onclick="app.clearCart()" class="text-xs text-red-500 font-bold hover:underline">Vaciar</a>
                </div>
                <div class="space-y-2 mb-4 max-h-40 overflow-y-auto text-sm custom-scrollbar">
                    ${e}
                </div>
                <div class="pt-3 border-t border-slate-50 flex justify-between items-center mb-3">
                     <span class="text-xs font-bold text-slate-500">Total</span>
                     <span class="font-bold text-brand-dark text-lg">${this.formatCurrency(this.state.cart.reduce((s,o)=>s+this.getEffectivePrice(o),0))}</span>
                </div>
                <button onclick="app.openCheckoutModal()" class="w-full py-2 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 text-sm hover:scale-[1.02] transition-transform">
                    Finalizar Venta
                </a>
            </div>
    `},renderInventoryContent(t,e,s,o,r){t.innerHTML=`
            ${this.state.viewMode==="grid"?`
                <!-- GRID VIEW -->
                ${this.state.filterGenre==="all"&&this.state.filterOwner==="all"&&this.state.filterLabel==="all"&&this.state.filterStorage==="all"&&this.state.inventorySearch===""?`
                    
                    <div class="space-y-8 animate-fade-in">
                        <!-- Genres Folder -->
                        <div>
                            <h3 class="font-bold text-brand-dark text-lg mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-music-notes-simple text-brand-orange"></i> Géneros
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                ${s.map(a=>`
                                    <div onclick="app.navigateInventoryFolder('genre', '${a}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange cursor-pointer transition-all group text-center">
                                        <div class="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-orange group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-folder-notch text-2xl"></i>
                                        </div>
                                        <h4 class="font-bold text-brand-dark text-sm truncate">${a}</h4>
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(n=>n.genre===a).length} items</p>
                                    </div>
                                `).join("")}
                            </div>
                        </div>

                        <!-- Owners Folder -->
                         <div>
                            <h3 class="font-bold text-brand-dark text-lg mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-users text-blue-500"></i> Dueños
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                ${o.map(a=>`
                                    <div onclick="app.navigateInventoryFolder('owner', '${a}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange cursor-pointer transition-all group text-center">
                                        <div class="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500 group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-folder-user text-2xl"></i>
                                        </div>
                                        <h4 class="font-bold text-brand-dark text-sm truncate">${a}</h4>
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(n=>n.owner===a).length} items</p>
                                    </div>
                                `).join("")}
                            </div>
                        </div>

                        <!-- Labels Folder (Label Disquería) -->
                         <div>
                            <h3 class="font-bold text-brand-dark text-lg mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-tag text-purple-500"></i> Label Disquería
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                ${r.map(a=>`
                                    <div onclick="app.navigateInventoryFolder('storage', '${a.replace(/'/g,"\\'")}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange cursor-pointer transition-all group text-center">
                                        <div class="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-500 group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-tag text-2xl"></i>
                                        </div>
                                        <h4 class="font-bold text-brand-dark text-sm truncate">${a}</h4>
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(n=>n.storageLocation===a).length} items</p>
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    </div>

                    `:` <!-- ITEMS GRID (Filtered) -->
                    <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-fade-in">
                        <!-- Back Button if Filtered -->
                        ${this.state.filterGenre!=="all"||this.state.filterOwner!=="all"||this.state.filterLabel!=="all"||this.state.filterStorage!=="all"?`
                            <div onclick="app.state.filterGenre='all'; app.state.filterOwner='all'; app.state.filterLabel='all'; app.state.filterStorage='all'; app.refreshCurrentView()" 
                                class="col-span-full mb-4 flex items-center gap-2 text-slate-500 hover:text-brand-orange cursor-pointer w-fit pl-1 group">
                                <div class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-brand-orange group-hover:text-white group-hover:border-brand-orange transition-all shadow-sm">
                                    <i class="ph-bold ph-arrow-left"></i>
                                </div>
                                <span class="text-sm font-bold">Volver a Carpetas</span>
                            </div>
                        `:""}

                        ${e.map(a=>`
                            <!-- Item Card -->
                            <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
                                onclick="app.openProductModal('${a.sku.replace(/'/g,"\\'")}')">
                                <div class="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-4 relative shadow-inner">
                                     ${a.cover_image?`<img src="${a.cover_image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`:'<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-fill ph-disc text-5xl"></i></div>'}
                                     <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                         <button onclick="event.stopPropagation(); app.addToCart('${a.sku.replace(/'/g,"\\'")}', event)" class="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-shopping-cart text-lg"></i>
                                         </a>
                                         <button onclick="event.stopPropagation(); app.openProductModal('${a.sku.replace(/'/g,"\\'")}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-eye text-lg"></i>
                                         </a>
                                         <button onclick="event.stopPropagation(); app.openPrintLabelModal('${a.sku.replace(/'/g,"\\'")}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-printer text-lg"></i>
                                         </a>
                                     </div>
                                     <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                         ${this.getStatusBadge(a.condition)}
                                         ${this.getTimeInStockBadge(this.getTimeInStockCategory(a.created_at))}
                                     </div>
                                </div>
                                <div class="flex-1 flex flex-col">
                                    <h3 class="font-bold text-brand-dark leading-tight mb-1 line-clamp-1" title="${a.album}">${a.album}</h3>
                                    <p class="text-xs text-slate-500 font-bold uppercase mb-3 truncate">${a.artist}</p>
                                    <div class="mt-auto flex justify-between items-center pt-3 border-t border-slate-50">
                                        <span class="font-display font-bold text-xl text-brand-orange">${this.formatCurrency(a.price,!1)}</span>
                                        <span class="text-xs font-bold ${a.stock>0?"text-green-600 bg-green-50":"text-red-500 bg-red-50"} px-2 py-1 rounded-md">
                                            Stock: ${a.stock}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                `}
            `:`
                <!-- LIST VIEW (Table) -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
                    <!-- Bulk Action Bar -->
                    ${this.state.selectedItems.size>0?`
                        <div class="absolute top-0 left-0 w-full bg-brand-dark/95 backdrop-blur text-white p-3 flex justify-between items-center z-20 animate-slide-up">
                            <div class="flex items-center gap-3">
                                <span class="font-bold text-sm bg-white/10 px-3 py-1 rounded-lg">${this.state.selectedItems.size} seleccionados</span>
                                <button onclick="app.toggleSelectAll()" class="text-xs text-slate-300 hover:text-white underline">Deseleccionar</a>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="app.addSelectionToCart()" class="bg-brand-orange text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                                    <i class="ph-bold ph-shopping-cart"></i> Agregar al Carrito
                                </a>
                                <button onclick="app.deleteSelection()" class="bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-red-600 transition-colors flex items-center gap-2">
                                    <i class="ph-bold ph-trash"></i> Eliminar
                                </a>
                            </div>
                        </div>
                    `:""}

                    <table class="w-full text-left">
                        <thead class="bg-slate-50 border-b border-slate-100">
                            <tr class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <th class="p-4 w-10">
                                    <input type="checkbox" onchange="app.toggleSelectAll()" 
                                        class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                        ${e.length>0&&e.every(a=>this.state.selectedItems.has(a.sku))?"checked":""}>
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
                            ${e.map(a=>`
                                <tr class="inv-row cursor-pointer ${this.state.selectedItems.has(a.sku)?"bg-orange-50/50":""}" 
                                    onclick="app.openProductModal('${a.sku.replace(/'/g,"\\\\'")}')">
                                    <td class="p-3" onclick="event.stopPropagation()">
                                        <input type="checkbox" onchange="app.toggleSelection('${a.sku.replace(/'/g,"\\\\'")}')"
                                            class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                            ${this.state.selectedItems.has(a.sku)?"checked":""}>
                                    </td>
                                    <td class="p-3">
                                        <div class="flex items-center gap-3">
                                            <div class="relative">
                                                <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 shrink-0 overflow-hidden shadow-md border border-slate-100">
                                                    ${a.cover_image?`<img src="${a.cover_image}" class="w-full h-full object-cover">`:'<i class="ph-fill ph-disc text-xl"></i>'}
                                                </div>
                                                <div class="absolute -top-1 -right-1 border-2 border-white rounded-full">
                                                    ${this.getTimeInStockBadge(this.getTimeInStockCategory(a.created_at))}
                                                </div>
                                            </div>
                                            <div class="min-w-0">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[220px]" title="${a.album}">${a.album}</div>
                                                <div class="text-xs text-slate-400 font-medium truncate max-w-[220px]">${a.artist}</div>
                                                <div class="text-[10px] text-slate-300 font-mono mt-0.5 sm:hidden">${a.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-3 text-xs text-slate-500 font-medium max-w-[100px] truncate hidden md:table-cell">${a.label||"-"}</td>
                                    <td class="p-3 text-center hidden sm:table-cell">${this.getStatusBadge(a.condition)}</td>
                                    <td class="p-3 text-right">
                                        ${a.is_rsd_discount?`<div><span class="text-[10px] text-slate-400 line-through">${this.formatCurrency(a.price,!1)}</span><br><span class="font-bold text-orange-600 font-display text-sm">${this.formatCurrency(this.getEffectivePrice(a),!1)}</span></div>`:`<span class="font-bold text-brand-dark font-display text-sm">${this.formatCurrency(a.price,!1)}</span>`}
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.toggleProductTag('${a.sku.replace(/'/g,"\\\\'")}', 'hero')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center ${a.tags&&a.tags.includes("hero")?"bg-amber-50 text-amber-500 shadow-sm border border-amber-100":"text-slate-200 hover:bg-slate-50 hover:text-slate-400"}" 
                                            title="Marcar como Destacado">
                                            <i class="ph-fill ph-star text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.toggleProductTag('${a.sku.replace(/'/g,"\\\\'")}', 'new_arrival')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center ${a.tags&&a.tags.includes("new_arrival")?"bg-blue-50 text-blue-500 shadow-sm border border-blue-100":"text-slate-200 hover:bg-slate-50 hover:text-slate-400"}" 
                                            title="Marcar como Novedad">
                                            <i class="ph-fill ph-sketch-logo text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.openPrintLabelModal('${a.sku.replace(/'/g,"\\\\'")}')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center text-slate-200 hover:bg-purple-50 hover:text-purple-600" 
                                            title="Imprimir Etiqueta">
                                            <i class="ph-bold ph-printer text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell">
                                        <span class="inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-full text-xs font-bold ${a.stock>0?"bg-emerald-50 text-emerald-600":"bg-red-50 text-red-500"}">
                                            ${a.stock}
                                        </span>
                                    </td>
                                    <td class="p-3 text-center hidden md:table-cell">
                                        ${a.discogs_listing_id?'<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-purple-100 text-purple-600" title="Publicado en Discogs"><i class="ph-bold ph-check text-xs"></i></span>':'<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-slate-50 text-slate-300" title="No publicado"><i class="ph-bold ph-minus text-xs"></i></span>'}
                                    </td>
                                    <td class="p-3 text-right" onclick="event.stopPropagation()">
                                        <div class="flex justify-end gap-1">
                                            <button onclick="event.stopPropagation(); app.openAddVinylModal('${a.sku.replace(/'/g,"\\\\'")}')" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-brand-dark hover:bg-slate-100 transition-all flex items-center justify-center" title="Editar">
                                                <i class="ph-bold ph-pencil-simple text-sm"></i>
                                            </a>

                                            <button onclick="event.stopPropagation(); app.addToCart('${a.sku.replace(/'/g,"\\\\'")}')" class="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange hover:bg-brand-orange hover:text-white transition-all flex items-center justify-center" title="Agregar al carrito">
                                                <i class="ph-bold ph-shopping-cart text-sm"></i>
                                            </a>
                                            <button onclick="event.stopPropagation(); app.deleteVinyl('${a.sku.replace(/'/g,"\\\\'")}')" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center" title="Eliminar">
                                                <i class="ph-bold ph-trash text-sm"></i>
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

            `}
        `},renderInventory(t){const e=[...new Set(this.state.inventory.flatMap(f=>{const w=[f.genre,f.genre2,f.genre3,f.genre4,f.genre5].filter(Boolean),u=[];w.forEach(E=>{u.push(...E.split(",").map(S=>S.trim()).filter(Boolean))});const g=[...new Set(u)],$=g.filter(E=>E.toLowerCase()!=="electronic");return $.length>0?$:g.length>0?g:["Otros"]}))].sort(),s=[...new Set(this.state.inventory.map(f=>f.owner).filter(Boolean))].sort(),o=[...new Set(this.state.inventory.map(f=>f.label).filter(Boolean))].sort(),r=[...new Set(this.state.inventory.map(f=>f.storageLocation).filter(Boolean))].sort(),a=this.getFilteredInventory(),n=this.state.sortBy||"dateDesc";a.sort((f,w)=>{if(n==="priceDesc")return(w.price||0)-(f.price||0);if(n==="priceAsc")return(f.price||0)-(w.price||0);if(n==="stockDesc")return(w.stock||0)-(f.stock||0);const u=f.created_at?f.created_at.seconds?f.created_at.seconds*1e3:new Date(f.created_at).getTime():0,g=w.created_at?w.created_at.seconds?w.created_at.seconds*1e3:new Date(w.created_at).getTime():0;return n==="dateDesc"?g-u:n==="dateAsc"?u-g:0});const i=this.state.inventory.length,l=this.state.inventory.reduce((f,w)=>{const u=Number(w.stock)||0;return f+(u>0?(parseFloat(w.price)||0)*u:0)},0),c=this.state.inventory.filter(f=>(f.stock||0)>0).length,p=this.state.inventory.filter(f=>f.discogs_listing_id).length,b=[this.state.filterGenre!=="all"?1:0,this.state.filterOwner!=="all"?1:0,this.state.filterLabel!=="all"?1:0,this.state.filterStorage!=="all"?1:0,this.state.filterDiscogs&&this.state.filterDiscogs!=="all"?1:0,this.state.filterHero&&this.state.filterHero!=="all"?1:0].reduce((f,w)=>f+w,0);document.getElementById("inventory-layout-root")||(t.innerHTML=`
    <div id="inventory-layout-root" class="max-w-7xl mx-auto pb-24 md:pb-8 px-4 md:px-8 pt-10">
                    <!--Header -->
                    <div class="sticky top-0 bg-slate-50 z-20 pb-4 pt-4 -mx-4 px-4 md:mx-0 md:px-0">
                         <div class="flex justify-between items-center mb-5">
                            <div>
                                <h2 class="font-display text-2xl font-bold text-brand-dark">Inventario</h2>
                                <p class="text-xs text-slate-400 mt-1">${i} discos registrados</p>
                            </div>
                             <div class="flex gap-2">
                                <button onclick="app.openInventoryLogModal()" class="bg-white border border-slate-200 text-slate-500 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm hover:text-brand-orange hover:border-brand-orange transition-colors" title="Historial">
                                    <i class="ph-bold ph-clock-counter-clockwise text-lg"></i>
                                </a>
                                <button onclick="app.openBulkImportModal()" class="bg-white border border-slate-200 text-slate-600 px-3 h-10 rounded-xl flex items-center gap-2 shadow-sm hover:border-emerald-400 hover:text-emerald-600 transition-all" title="Carga Masiva CSV">
                                    <i class="ph-bold ph-file-csv text-lg"></i>
                                    <span class="text-xs font-bold hidden sm:inline">Importar</span>
                                </a>
                                <button onclick="app.syncWithDiscogs()" id="discogs-sync-btn" class="bg-white border border-slate-200 text-slate-600 px-3 h-10 rounded-xl flex items-center gap-2 shadow-sm hover:border-purple-400 hover:text-purple-600 transition-all" title="Sincronizar con Discogs">
                                    <i class="ph-bold ph-cloud-arrow-down text-lg"></i>
                                    <span class="text-xs font-bold hidden sm:inline">Discogs</span>
                                </a>
                                <button onclick="app.openAddVinylModal()" class="bg-brand-dark text-white px-4 h-10 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-dark/20 hover:scale-105 transition-transform">
                                    <i class="ph-bold ph-plus text-lg"></i>
                                    <span class="text-xs font-bold hidden sm:inline">Nuevo</span>
                                </a>
                            </div>
                        </div>

                        <!-- Search Bar -->
                        <div class="relative group mb-4">
                            <i class="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-orange transition-colors text-lg"></i>
                            <input type="text" placeholder="Buscar artista, álbum, sello, SKU..." value="${this.state.inventorySearch}" oninput="app.state.inventorySearch = this.value; app.refreshCurrentView()" class="w-full bg-white border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 text-brand-dark placeholder:text-slate-400 focus:border-brand-orange outline-none transition-colors font-medium shadow-sm">
                        </div>

                        <!-- KPI Stats Row -->
                        <div id="inventory-kpi-container" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"></div>

                        <!-- Inline Filter Chips -->
                        <div id="inventory-filters-container" class="flex flex-wrap items-center gap-2"></div>
                    </div>

                    <!-- Cart (if items present) -->
                    <div id="inventory-cart-container" class="hidden mb-4"></div>

                    <!-- View Toggle + Content -->
                    <div class="mt-4">
                        <div class="flex justify-between items-center mb-3">
                            <p class="text-xs font-bold text-slate-400">${a.length} resultado${a.length!==1?"s":""}</p>
                            <div class="hidden lg:flex items-center gap-2">
                                <button onclick="app.state.viewMode='list'; app.refreshCurrentView()" class="p-2 rounded-lg transition-colors ${this.state.viewMode!=="grid"?"bg-brand-dark text-white":"bg-white text-slate-400 border border-slate-200"}"><i class="ph-bold ph-list-dashes text-sm"></i></a>
                                <button onclick="app.state.viewMode='grid'; app.refreshCurrentView()" class="p-2 rounded-lg transition-colors ${this.state.viewMode==="grid"?"bg-brand-dark text-white":"bg-white text-slate-400 border border-slate-200"}"><i class="ph-bold ph-squares-four text-sm"></i></a>
                            </div>
                        </div>
                        <div id="inventory-content-container"></div>
                    </div>
                </div>
    `);const d=document.getElementById("inventory-kpi-container");d&&(d.innerHTML=`
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Discos</p>
                    <p class="text-xl font-bold text-brand-dark font-display mt-1">${i}</p>
                </div>
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total</p>
                    <p class="text-xl font-bold text-brand-orange font-display mt-1">${this.formatCurrency(l)}</p>
                </div>
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Stock</p>
                    <p class="text-xl font-bold text-emerald-600 font-display mt-1">${c} <span class="text-xs text-slate-400 font-normal">/ ${i}</span></p>
                </div>
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Discogs</p>
                    <p class="text-xl font-bold text-purple-600 font-display mt-1">${p} <span class="text-xs text-slate-400 font-normal">/ ${i}</span></p>
                </div>
            `);const v=document.getElementById("inventory-filters-container");v&&(v.innerHTML=`
                <div class="filter-chip ${this.state.sortBy&&this.state.sortBy!=="dateDesc"?"active":""}">
                    <i class="ph-bold ph-sort-ascending text-xs"></i>
                    <select onchange="app.state.sortBy = this.value; app.refreshCurrentView()">
                        <option value="dateDesc" ${this.state.sortBy==="dateDesc"||!this.state.sortBy?"selected":""}>Más Recientes</option>
                        <option value="dateAsc" ${this.state.sortBy==="dateAsc"?"selected":""}>Más Antiguos</option>
                        <option value="priceDesc" ${this.state.sortBy==="priceDesc"?"selected":""}>Precio ↓</option>
                        <option value="priceAsc" ${this.state.sortBy==="priceAsc"?"selected":""}>Precio ↑</option>
                        <option value="stockDesc" ${this.state.sortBy==="stockDesc"?"selected":""}>Stock ↓</option>
                    </select>
                </div>
                <div class="filter-chip ${this.state.filterGenre!=="all"?"active":""}">
                    <i class="ph-bold ph-music-notes text-xs"></i>
                    <select onchange="app.state.filterGenre = this.value; app.refreshCurrentView()">
                        <option value="all">Género</option>
                        ${e.map(f=>`<option value="${f}" ${this.state.filterGenre===f?"selected":""}>${f}</option>`).join("")}
                    </select>
                </div>
                <div class="filter-chip ${this.state.filterLabel!=="all"?"active":""}">
                    <i class="ph-bold ph-vinyl-record text-xs"></i>
                    <select onchange="app.state.filterLabel = this.value; app.refreshCurrentView()">
                        <option value="all">Sello</option>
                        ${o.map(f=>`<option value="${f}" ${this.state.filterLabel===f?"selected":""}>${f}</option>`).join("")}
                    </select>
                </div>
                <div class="filter-chip ${this.state.filterStorage!=="all"?"active":""}">
                    <i class="ph-bold ph-tag text-xs"></i>
                    <select onchange="app.state.filterStorage = this.value; app.refreshCurrentView()">
                        <option value="all">Disquería</option>
                        ${r.map(f=>`<option value="${f}" ${this.state.filterStorage===f?"selected":""}>${f}</option>`).join("")}
                    </select>
                </div>
                <div class="filter-chip ${this.state.filterOwner!=="all"?"active":""}">
                    <i class="ph-bold ph-user text-xs"></i>
                    <select onchange="app.state.filterOwner = this.value; app.refreshCurrentView()">
                        <option value="all">Dueño</option>
                        ${s.map(f=>`<option value="${f}" ${this.state.filterOwner===f?"selected":""}>${f}</option>`).join("")}
                    </select>
                </div>

                <!-- Stock Time Filter -->
                <div class="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-4 py-1">
                    <span class="text-[10px] font-bold text-slate-400 uppercase mr-1">Antigüedad:</span>
                    <button onclick="app.toggleStockTimeFilter('green')" class="w-6 h-6 rounded-full flex items-center justify-center border-2 ${this.state.filterStockTime.includes("green")?"border-emerald-500 bg-emerald-500 text-white":"border-emerald-200 bg-white text-emerald-500"} hover:scale-110 transition-all" title="0-2 meses">
                        <span class="w-2 h-2 rounded-full ${this.state.filterStockTime.includes("green")?"bg-white":"bg-emerald-500"}"></span>
                    </a>
                    <button onclick="app.toggleStockTimeFilter('orange')" class="w-6 h-6 rounded-full flex items-center justify-center border-2 ${this.state.filterStockTime.includes("orange")?"border-orange-500 bg-orange-500 text-white":"border-orange-200 bg-white text-orange-500"} hover:scale-110 transition-all" title="2-4 meses">
                        <span class="w-2 h-2 rounded-full ${this.state.filterStockTime.includes("orange")?"bg-white":"bg-orange-500"}"></span>
                    </a>
                    <button onclick="app.toggleStockTimeFilter('red')" class="w-6 h-6 rounded-full flex items-center justify-center border-2 ${this.state.filterStockTime.includes("red")?"border-red-500 bg-red-500 text-white":"border-red-200 bg-white text-red-500"} hover:scale-110 transition-all" title="4-6 meses">
                        <span class="w-2 h-2 rounded-full ${this.state.filterStockTime.includes("red")?"bg-white":"bg-red-500"}"></span>
                    </a>
                    <button onclick="app.toggleStockTimeFilter('purple')" class="w-6 h-6 rounded-full flex items-center justify-center border-2 ${this.state.filterStockTime.includes("purple")?"border-purple-500 bg-purple-500 text-white":"border-purple-200 bg-white text-purple-500"} hover:scale-110 transition-all" title="+6 meses">
                        <span class="w-2 h-2 rounded-full ${this.state.filterStockTime.includes("purple")?"bg-white":"bg-purple-500"}"></span>
                    </a>
                </div>
                <div class="filter-chip ${this.state.filterDiscogs&&this.state.filterDiscogs!=="all"?"active":""}">
                    <i class="ph-bold ph-disc text-xs"></i>
                    <select onchange="app.state.filterDiscogs = this.value; app.refreshCurrentView()">
                        <option value="all" ${(this.state.filterDiscogs||"all")==="all"?"selected":""}>Discogs</option>
                        <option value="yes" ${this.state.filterDiscogs==="yes"?"selected":""}>✅ Publicado</option>
                        <option value="no" ${this.state.filterDiscogs==="no"?"selected":""}>❌ No pub.</option>
                    </select>
                </div>
                <div class="filter-chip ${this.state.filterHero&&this.state.filterHero!=="all"?"active":""}">
                    <i class="ph-bold ph-star text-xs"></i>
                    <select onchange="app.state.filterHero = this.value; app.refreshCurrentView()">
                        <option value="all" ${(this.state.filterHero||"all")==="all"?"selected":""}>Héroe</option>
                        <option value="yes" ${this.state.filterHero==="yes"?"selected":""}>🌟 Destacado</option>
                        <option value="no" ${this.state.filterHero==="no"?"selected":""}>➖ Normal</option>
                    </select>
                </div>
                ${b>0||this.state.filterStockTime.length>0?`
                    <button onclick="app.state.filterGenre='all'; app.state.filterOwner='all'; app.state.filterLabel='all'; app.state.filterStorage='all'; app.state.filterDiscogs='all'; app.state.filterHero='all'; app.state.filterStockTime=[]; app.refreshCurrentView()" class="filter-chip hover:!bg-red-50 hover:!border-red-300 hover:!text-red-500">
                        <i class="ph-bold ph-x text-xs"></i> Limpiar (${b+this.state.filterStockTime.length})
                    </a>
                `:""}
            `),this.renderInventoryCart();const h=document.getElementById("inventory-content-container");h&&this.renderInventoryContent(h,a,e,s,r)},getTimeInStockCategory(t){if(!t)return"unknown";const e=t.seconds?new Date(t.seconds*1e3):new Date(t);if(isNaN(e.getTime()))return"unknown";const o=Math.abs(new Date-e),a=Math.ceil(o/(1e3*60*60*24))/30.44;return a<=2?"green":a<=4?"orange":a<=6?"red":"purple"},getTimeInStockBadge(t){switch(t){case"green":return'<span class="w-3 h-3 block rounded-full bg-emerald-500 shadow-sm" title="Antigüedad: 0 a 2 meses"></span>';case"orange":return'<span class="w-3 h-3 block rounded-full bg-orange-500 shadow-sm" title="Antigüedad: 2 a 4 meses"></span>';case"red":return'<span class="w-3 h-3 block rounded-full bg-red-500 shadow-sm" title="Antigüedad: 4 a 6 meses"></span>';case"purple":return'<span class="w-3 h-3 block rounded-full bg-purple-500 shadow-sm" title="Antigüedad: Más de 6 meses"></span>';default:return'<span class="w-3 h-3 block rounded-full bg-slate-300 shadow-sm" title="Antigüedad: Desconocida"></span>'}},toggleStockTimeFilter(t){const e=this.state.filterStockTime.indexOf(t);e===-1?this.state.filterStockTime.push(t):this.state.filterStockTime.splice(e,1),this.refreshCurrentView()},getStatusBadge(t){return`<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${{NM:"bg-green-100 text-green-700 border-green-200","VG+":"bg-blue-100 text-blue-700 border-blue-200",VG:"bg-yellow-100 text-yellow-700 border-yellow-200",G:"bg-orange-100 text-orange-700 border-orange-200",B:"bg-red-100 text-red-700 border-red-200",S:"bg-purple-100 text-purple-700 border-purple-200"}[t]||"bg-slate-100 text-slate-600 border-slate-200"}"> ${t}</span> `},renderCharts(t,e){const s=this.state.filterMonths;this.state.filterYear;const o=[],r=[],a=[];s.forEach(i=>{o.push(this.getMonthName(i).substring(0,3));const l=t.filter(p=>new Date(p.date).getMonth()===i).reduce((p,b)=>p+b.total,0),c=e.filter(p=>new Date(p.date).getMonth()===i).reduce((p,b)=>p+b.amount,0);r.push(l),a.push(c)});const n={};t.forEach(i=>{n[i.genre]=(n[i.genre]||0)+i.quantity}),new Chart(document.getElementById("financeChart"),{type:"bar",data:{labels:o,datasets:[{label:"Ventas",data:r,backgroundColor:"#F05A28",borderRadius:6},{label:"Gastos",data:a,backgroundColor:"#94a3b8",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom"}},scales:{y:{grid:{color:"#f1f5f9"},beginAtZero:!0},x:{grid:{display:!1}}}}})},renderDashboardCharts(t=[],e=[],s=[]){var v,h,f,w,u;const o=t,r=(v=document.getElementById("last30DaysChart"))==null?void 0:v.getContext("2d");r&&(this.last30ChartInstance&&this.last30ChartInstance.destroy(),this.last30ChartInstance=new Chart(r,{type:"line",data:{labels:e,datasets:[{label:"Ventas ($)",data:s,borderColor:"#F05A28",backgroundColor:g=>{const $=g.chart,{ctx:E,chartArea:S}=$;if(!S)return null;const I=E.createLinearGradient(0,S.top,0,S.bottom);return I.addColorStop(0,"rgba(240, 90, 40, 0.2)"),I.addColorStop(1,"rgba(240, 90, 40, 0)"),I},borderWidth:3,fill:!0,tension:.4,pointRadius:0,pointHoverRadius:6,pointBackgroundColor:"#F05A28",pointBorderColor:"#fff",pointBorderWidth:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{mode:"index",intersect:!1,backgroundColor:"#1e293b",titleFont:{size:10},bodyFont:{size:12,weight:"bold"},padding:12,cornerRadius:12,displayColors:!1,callbacks:{label:g=>this.formatCurrency(g.parsed.y)}}},scales:{y:{beginAtZero:!0,grid:{color:"#f8fafc"},ticks:{font:{size:10},color:"#94a3b8"}},x:{grid:{display:!1},ticks:{font:{size:10},color:"#94a3b8",autoSkip:!0,maxRotation:0,callback:function(g,$){return $%5===0?this.getLabelForValue(g):""}}}},interaction:{mode:"index",intersect:!1}}}));const a=(g,$)=>({type:"doughnut",data:{labels:Object.keys(g),datasets:[{data:Object.values(g),backgroundColor:["#F05A28","#FDE047","#8b5cf6","#10b981","#f43f5e","#64748b"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{boxWidth:10,font:{size:10}}}}}}),n={};o.forEach(g=>{const $=g.genre||"Otros";let E=Number(g.quantity)||0;E===0&&g.items&&Array.isArray(g.items)&&(E=g.items.reduce((S,I)=>S+(Number(I.qty||I.quantity)||1),0)),E<=0&&(E=1),n[$]=(n[$]||0)+Number(E)}),this.genreChartInstance&&this.genreChartInstance.destroy();const i=(h=document.getElementById("genreChart"))==null?void 0:h.getContext("2d");i&&(this.genreChartInstance=new Chart(i,a(n)));const l={};o.forEach(g=>{const $=g.paymentMethod||"Otros";let E=Number(g.quantity)||0;E===0&&g.items&&Array.isArray(g.items)&&(E=g.items.reduce((S,I)=>S+(Number(I.qty||I.quantity)||1),0)),E<=0&&(E=1),l[$]=(l[$]||0)+Number(E)}),this.paymentChartInstance&&this.paymentChartInstance.destroy();const c=(f=document.getElementById("paymentChart"))==null?void 0:f.getContext("2d");c&&(this.paymentChartInstance=new Chart(c,a(l)));const p={};o.forEach(g=>{const $=g.channel||"Tienda";let E=Number(g.quantity)||0;E===0&&g.items&&Array.isArray(g.items)&&(E=g.items.reduce((S,I)=>S+(Number(I.qty||I.quantity)||1),0)),E<=0&&(E=1),p[$]=(p[$]||0)+Number(E)}),this.channelChartInstance&&this.channelChartInstance.destroy();const b=(w=document.getElementById("channelChart"))==null?void 0:w.getContext("2d");b&&(this.channelChartInstance=new Chart(b,a(p)));const d=(u=document.getElementById("salesTrendChart"))==null?void 0:u.getContext("2d");if(d){const g=new Array(31).fill(0).map((E,S)=>S+1),$=new Array(31).fill(0);o.forEach(E=>{const S=new Date(E.date);isNaN(S.getDate())||($[S.getDate()-1]+=parseFloat(E.total)||0)}),this.trendChartInstance&&this.trendChartInstance.destroy(),this.trendChartInstance=new Chart(d,{type:"line",data:{labels:g,datasets:[{label:"Ventas ($)",data:$,borderColor:"#F05A28",backgroundColor:"rgba(240, 90, 40, 0.1)",borderWidth:3,fill:!0,tension:.4,pointRadius:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,grid:{color:"#f1f5f9"}},x:{grid:{display:!1}}}}})}},updateFilter(t,e){if(t==="month"){const s=parseInt(e);this.state.filterMonth=s,this.state.filterMonths=[s]}t==="year"&&(this.state.filterYear=parseInt(e)),this.renderDashboard(document.getElementById("app-content"))},renderSales(t){var w;const e=new Date().toISOString().split("T")[0],s=new Date(Date.now()-864e5).toISOString().split("T")[0],o=this.state.sales.filter(u=>u.date===e).reduce((u,g)=>u+(parseFloat(g.total)||0),0),r=this.state.sales.filter(u=>u.date===s).reduce((u,g)=>u+(parseFloat(g.total)||0),0),a=this.state.sales.filter(u=>u.fulfillment_status==="preparing"||u.status==="paid"||u.channel==="Discogs"&&u.status!=="shipped").length,n=this.state.filterYear,i=this.state.filterMonths,l=((w=document.getElementById("sales-payment-filter"))==null?void 0:w.value)||"all",p=this.state.salesHistorySearch.toLowerCase().split(" ").filter(u=>u.length>0),b=this.state.orderFeedFilter||"all",d=this.state.sales.filter(u=>{const g=new Date(u.date),$=g.getFullYear()===n&&i.includes(g.getMonth()),E=l==="all"||u.paymentMethod===l;let S=!0;p.length>0&&(S=p.every(y=>{const D=Array.isArray(u.items)&&u.items.some(M=>{var Z,Q,ee,te;const N=(M.album||((Z=M.record)==null?void 0:Z.album)||"").toLowerCase(),Y=(M.artist||((Q=M.record)==null?void 0:Q.artist)||"").toLowerCase(),J=(M.label||((ee=M.record)==null?void 0:ee.label)||"").toLowerCase(),G=(M.sku||((te=M.record)==null?void 0:te.sku)||"").toLowerCase();return N.includes(y)||Y.includes(y)||J.includes(y)||G.includes(y)}),_=(u.album||"").toLowerCase().includes(y)||(u.sku||"").toLowerCase().includes(y)||(u.customerName||"").toLowerCase().includes(y)||(u.orderNumber||"").toLowerCase().includes(y);return D||_}));let I=!0;return b==="to_ship"?I=u.status!=="shipped"&&u.source!=="STORE":b==="completed"?I=u.status==="shipped":b==="store"&&(I=u.source==="STORE"),$&&E&&S&&I}),v=d.reduce((u,g)=>u+(parseFloat(g.total)||0),0),h=d.length>0?v/d.length:0,f=`
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
                                <option value="2026" ${n===2026?"selected":""}>2026</option>
                                <option value="2025" ${n===2025?"selected":""}>2025</option>
                            </select>
                        </div>
                        <div class="flex flex-wrap gap-1">
                            ${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((u,g)=>`
                                <button onclick="app.toggleMonthFilter(${g})" 
                                    class="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${i.includes(g)?"bg-brand-dark text-white":"bg-slate-50 text-slate-400 hover:bg-slate-100"}">
                                    ${u}
                                </button>
                            `).join("")}
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
                        <h3 class="text-2xl font-display font-bold text-brand-dark mb-1">${this.formatCurrency(o)}</h3>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold ${o>=r?"text-emerald-500":"text-slate-400"}">
                                ${o>=r?'<i class="ph-bold ph-trend-up mr-1"></i>':'<i class="ph-bold ph-trend-down mr-1"></i>'}
                                vs. ayer (${this.formatCurrency(r)})
                            </span>
                        </div>
                    </div>

                    <!-- Tarjeta B: Por Despachar -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 ${a>0?"bg-orange-50 text-orange-600":"bg-slate-50 text-slate-400"} rounded-2xl flex items-center justify-center">
                                <i class="ph-duotone ph-package text-xl"></i>
                            </div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logística</span>
                        </div>
                        <h3 class="text-2xl font-display font-bold ${a>0?"text-orange-600":"text-brand-dark"} mb-1">${a} Pedidos</h3>
                        <p class="text-xs text-slate-400 font-medium">Pendientes de envío inmediato</p>
                        ${a>0?'<div class="absolute top-0 right-0 w-1.5 h-full bg-orange-500"></div>':""}
                    </div>

                    <!-- Tarjeta C: Ticket Promedio -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                <i class="ph-duotone ph-ticket text-xl"></i>
                            </div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Métrica</span>
                        </div>
                        <h3 class="text-2xl font-display font-bold text-brand-dark mb-1">${this.formatCurrency(h)}</h3>
                        <p class="text-xs text-slate-400 font-medium">Valor promedio por cliente</p>
                    </div>
                </div>

                <!-- Main Layout: 2 Columns (Prompt 1) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                    
                    <!-- LEFT COLUMN: POS / Sales Entry -->
                    <div class="space-y-6">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Registrar Venta (POS)</h3>
                            <div class="h-px flex-1 bg-slate-100"></div>
                        </div>

                        ${this.state.cart.length>0?this.renderSalesCartWidget():this.renderQuickPOS()}

                        <!-- Partners Quick Summary -->
                        <div class="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Stock por Dueño</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                ${["El Cuartito",...this.state.consignors.map(u=>u.name)].map(u=>{const g=this.state.inventory.filter($=>$.owner===u).reduce(($,E)=>$+E.stock,0);return`
                                        <div class="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                            <span class="text-xs font-bold text-slate-600 truncate mr-2">${u}</span>
                                            <span class="bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-slate-400">${g}</span>
                                        </div>
                                    `}).join("")}
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
                            ${[{id:"all",label:"Todos",icon:"ph-list"},{id:"to_ship",label:"Por Enviar",icon:"ph-package"},{id:"completed",label:"Completados",icon:"ph-check-circle"},{id:"store",label:"Tienda Física",icon:"ph-storefront"}].map(u=>`
                                <button onclick="app.updateOrderFeedFilter('${u.id}')" 
                                    class="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all ${b===u.id?"bg-white text-brand-dark shadow-sm ring-1 ring-slate-200":"text-slate-400 hover:text-slate-600"}">
                                    <i class="ph-bold ${u.icon} ${b===u.id?"text-brand-orange":""}"></i>
                                    ${u.label.toUpperCase()}
                                </button>
                            `).join("")}
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
                                <option value="all" ${l==="all"?"selected":""}>Todos Pagos</option>
                                <option value="MobilePay" ${l==="MobilePay"?"selected":""}>MobilePay</option>
                                <option value="Efectivo" ${l==="Efectivo"?"selected":""}>Efectivo</option>
                                <option value="Tarjeta" ${l==="Tarjeta"?"selected":""}>Tarjeta</option>
                            </select>
                        </div>

                        <!-- Feed List -->
                        <div class="space-y-3 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar pb-10">
                            ${d.map(u=>{const g=u.status==="shipped",$=u.status==="paid"||u.source==="STORE"||u.paymentMethod!=="Pending",E=u.channel==="Discogs",S=u.source==="STORE",I=u.items&&u.items.length>0?u.items[0]:{album:u.album||"Venta Manual",artist:u.artist||"Desconocido"},y=u.items&&u.items.length>1?u.items.length-1:0;return`
                                <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all cursor-pointer group flex items-center gap-4 relative" onclick="app.openUnifiedOrderDetailModal('${u.id}')">
                                    <!-- Source Icon -->
                                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${E?"bg-slate-900 text-white":S?"bg-orange-100 text-brand-orange":"bg-blue-100 text-blue-600"}">
                                        <i class="ph-bold ${E?"ph-disc":S?"ph-storefront":"ph-globe"} text-xl"></i>
                                    </div>

                                    <!-- Details -->
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-0.5">
                                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${this.formatDate(u.date)}</span>
                                            <div class="h-1 w-1 rounded-full bg-slate-200"></div>
                                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${u.paymentMethod}</span>
                                        </div>
                                        <h4 class="font-bold text-brand-dark truncate pr-2">
                                            ${I.album} 
                                            ${y>0?`<span class="text-brand-orange font-medium text-xs ml-1">y ${y} más</span>`:""}
                                        </h4>
                                        
                                        <!-- Status Badges -->
                                        <div class="flex items-center gap-2 mt-2">
                                            <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${$?"bg-emerald-50 text-emerald-600":"bg-amber-50 text-amber-600"}">
                                                ${$?"Pagado":"Pendiente"}
                                            </span>
                                            <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${g?"bg-slate-100 text-slate-500":"bg-rose-50 text-rose-500"}">
                                                ${g?"Enviado":"Por Enviar"}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Economic Breakdown -->
                                    <div class="text-right shrink-0 border-l border-slate-50 pl-4 py-1">
                                        <p class="font-display font-bold text-brand-dark text-base">${this.formatCurrency(u.total)}</p>
                                        ${u.shipping_cost>0?`<p class="text-[10px] text-slate-400 font-bold">Envío: ${this.formatCurrency(u.shipping_cost)}</p>`:""}
                                    </div>

                                    <!-- Quick Action -->
                                    <div class="relative ml-2" onclick="event.stopPropagation()">
                                        <button onclick="app.toggleOrderActionMenu('${u.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-50 text-slate-300 hover:text-brand-dark transition-colors flex items-center justify-center">
                                            <i class="ph-bold ph-dots-three-vertical text-xl"></i>
                                        </button>
                                        
                                        <!-- Dropdown (Hidden by default) -->
                                        <div id="action-menu-${u.id}" class="hidden absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 z-[100] p-2 space-y-1">
                                            <button onclick="app.openInvoiceModal('${u.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                <i class="ph ph-file-text text-blue-500"></i> Ver Factura
                                            </button>
                                            <button onclick="app.openInvoiceModal('${u.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                <i class="ph ph-printer text-indigo-500"></i> Imprimir Etiqueta
                                            </button>
                                            ${g?"":`
                                                <button onclick="app.markOrderAsShipped('${u.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                    <i class="ph ph-truck text-emerald-500"></i> Marcar Enviado
                                                </button>
                                            `}
                                            <div class="h-px bg-slate-100 mx-2 my-1"></div>
                                            <button onclick="app.deleteSale('${u.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors">
                                                <i class="ph ph-trash"></i> Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `}).join("")}
                            ${d.length===0?`
                                <div class="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p class="text-slate-400 italic text-sm">No hay pedidos en esta categoría.</p>
                                </div>
                            `:""}
                        </div>
                    </div>
                </div>
            </div>
        `;if(t.innerHTML=f,this.state.salesHistorySearch){const u=document.getElementById("sales-history-search");if(u){u.focus();const g=u.value;u.value="",u.value=g}}},renderSalesCartWidget(){return`
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
                    ${this.state.cart.map((t,e)=>`
                        <div class="flex justify-between items-center ${t.is_rsd_discount?"bg-orange-50/50 border-orange-100":"bg-slate-50/50 border-slate-100"} p-3 rounded-2xl border group">
                            <div class="truncate pr-4 flex-1">
                                <p class="font-bold text-sm text-brand-dark truncate">${t.album} ${t.is_rsd_discount?'<span class="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-black ml-1">RSD</span>':""}</p>
                                <p class="text-[10px] text-slate-400 truncate uppercase tracking-tighter font-bold">${t.artist}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                ${t.is_rsd_discount?`<div class="text-right"><span class="text-[10px] text-slate-400 line-through block">${this.formatCurrency(t.price,!1)}</span><span class="font-bold text-sm text-orange-600">${this.formatCurrency(this.getEffectivePrice(t),!1)}</span></div>`:`<span class="font-bold text-sm text-brand-dark">${this.formatCurrency(t.price,!1)}</span>`}
                                <button onclick="app.removeFromCart(${e}); app.renderSales(document.getElementById('app-content'))" class="w-8 h-8 rounded-lg bg-white shadow-sm text-slate-300 hover:text-red-500 border border-slate-100 transition-colors flex items-center justify-center">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join("")}
                </div>

                <div class="bg-slate-50 rounded-2xl p-4 mb-6 space-y-4">
                    <div class="flex justify-between items-center pb-2 border-b border-white/50">
                        <span class="text-xs font-bold text-slate-400 uppercase">Subtotal</span>
                        <span class="font-bold text-slate-600">${this.formatCurrency(this.state.cart.reduce((t,e)=>t+this.getEffectivePrice(e),0))}</span>
                    </div>

                    <!-- RSD 5% Extra Discount Toggle -->
                    <div class="flex items-center justify-between p-3 rounded-xl border ${this.state.cart.length>=3?"bg-orange-50 border-orange-200":"bg-slate-50 border-slate-100 opacity-50"}">
                        <div class="flex items-center gap-2">
                            <span class="text-sm">🎉</span>
                            <div>
                                <span class="text-[10px] font-bold ${this.state.cart.length>=3?"text-orange-700":"text-slate-400"} uppercase tracking-wider">Aplicar 5% extra RSD</span>
                                ${this.state.cart.length<3?'<p class="text-[9px] text-slate-400 mt-0.5">Mínimo 3 items en carrito</p>':""}
                            </div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="rsd-extra-toggle" ${this.state.rsdExtraDiscount?"checked":""} ${this.state.cart.length<3?"disabled":""}
                                onchange="app.state.rsdExtraDiscount = this.checked; app.renderSales(document.getElementById('app-content'))">
                            <span class="slider"></span>
                        </label>
                    </div>
                    ${this.state.rsdExtraDiscount&&this.state.cart.length>=3?`
                    <div class="flex justify-between items-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                        <span class="text-[10px] font-bold text-orange-600 uppercase">5% RSD Descuento</span>
                        <span class="text-xs font-bold text-orange-700">- ${this.formatCurrency(this.state.cart.reduce((t,e)=>t+this.getEffectivePrice(e),0)*.05)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-emerald-600 uppercase">Total Final</span>
                        <span class="font-bold text-emerald-700 text-lg">${this.formatCurrency(this.state.cart.reduce((t,e)=>t+this.getEffectivePrice(e),0)*.95)}</span>
                    </div>
                    `:""}
                    
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
                    Completar Venta (${this.formatCurrency(this.state.cart.reduce((t,e)=>t+this.getEffectivePrice(e),0)*(this.state.rsdExtraDiscount&&this.state.cart.length>=3?.95:1))})
                </button>
            </div>
        `},renderQuickPOS(){const t=this.state.posCondition==="Used",e=!this.state.posSelectedItemSku&&(this.state.manualSaleSearch||"").length>0,s=t&&(e||!this.state.posSelectedItemSku);return`
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
                            class="px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${t?"text-slate-400 hover:text-slate-600":"bg-white text-brand-dark shadow-sm"}">
                            NUEVO
                        </button>
                        <button onclick="app.updatePOSCondition('Used')" 
                            class="px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${t?"bg-white text-brand-dark shadow-sm":"text-slate-400 hover:text-slate-600"}">
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
                            <input type="text" id="sku-search" value="${this.state.manualSaleSearch||""}" 
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
                        <div id="cost-container" class="${s?"":"hidden"}">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Costo Original (VAT)</label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                <input type="number" id="input-cost-pos" step="0.5" 
                                    class="w-full pl-8 pr-4 py-4 bg-orange-50/50 border-2 border-orange-100 rounded-2xl focus:border-brand-orange focus:bg-white outline-none text-xl font-display font-bold transition-all text-brand-orange">
                            </div>
                        </div>
                        <!-- Hidden inputs for submission -->
                        <input type="hidden" id="input-sku" value="${this.state.posSelectedItemSku||""}">
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
        `},updatePOSCondition(t){this.state.posCondition=t,this.renderSales(document.getElementById("app-content"))},selectPOSPayment(t){const e=document.getElementById("input-payment-method");e&&(e.value=t),["MobilePay","Tarjeta","Efectivo"].forEach(s=>{const o=document.getElementById(`pay-${s}`);if(o)if(s===t){o.classList.add("border-brand-dark","bg-slate-50","ring-2","ring-brand-dark/10"),o.classList.remove("border-slate-100","bg-white");const r=o.querySelector("i"),a=o.querySelector("span");r&&(r.classList.add(s==="MobilePay"?"text-blue-500":s==="Tarjeta"?"text-indigo-500":"text-emerald-500"),r.classList.remove("text-slate-400")),a&&(a.classList.add(s==="MobilePay"?"text-blue-600":s==="Tarjeta"?"text-indigo-600":"text-emerald-600"),a.classList.remove("text-slate-500"))}else{o.classList.remove("border-brand-dark","bg-slate-50","ring-2","ring-brand-dark/10"),o.classList.add("border-slate-100","bg-white");const r=o.querySelector("i"),a=o.querySelector("span");r&&(r.className=r.className.replace(/text-(blue|indigo|emerald)-500/g,"text-slate-400")),a&&(a.className=a.className.replace(/text-(blue|indigo|emerald)-600/g,"text-slate-500"))}})},async handleQuickPOSAction(){const t=document.getElementById("btn-pos-action"),e=document.getElementById("input-sku"),s=document.getElementById("input-price"),o=document.getElementById("input-payment-method"),r=document.getElementById("input-artist"),a=document.getElementById("input-album"),n=document.getElementById("input-cost"),i=document.getElementById("input-cost-pos"),l=e==null?void 0:e.value,c=parseFloat(s==null?void 0:s.value),p=(o==null?void 0:o.value)||"MobilePay",b=r==null?void 0:r.value,d=a==null?void 0:a.value,v=this.state.posCondition==="Used";let h=parseFloat(n==null?void 0:n.value)||0;if(v){const f=parseFloat(i==null?void 0:i.value);isNaN(f)||(h=f)}if(!c||isNaN(c)){this.showToast("⚠️ Debes ingresar un precio válido","error");return}if(!l&&!this.state.manualSaleSearch){this.showToast("⚠️ Debes buscar un producto o ingresar un nombre","error");return}try{t&&(t.disabled=!0,t.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Procesando...');const f=this.state.inventory.find(u=>u.sku===l),w={items:[{recordId:f?f.id:"manual-"+Date.now(),quantity:1,unitPrice:c,costAtSale:h,artist:b||"Desconocido",album:d||this.state.manualSaleSearch||"Venta Manual",sku:l||"N/A",productCondition:(f==null?void 0:f.product_condition)||this.state.posCondition||"New"}],paymentMethod:p,customerName:"Venta Mostrador",total_amount:c,source:"STORE",channel:"tienda",condition:this.state.posCondition||"New",timestamp:firebase.firestore.FieldValue.serverTimestamp()};await fe.createSale(w),this.showToast("✅ Venta registrada correctamente"),this.printTicket(w),this.state.manualSaleSearch="",this.state.posSelectedItemSku=null,this.loadData()}catch(f){console.error("POS Action Error:",f),this.showToast("❌ Error: "+f.message,"error")}finally{t&&(t.disabled=!1,t.innerHTML='<i class="ph-bold ph-printer text-xl"></i> Cobrar e Imprimir Ticket')}},printTicket(t){const e=window.open("","_blank","width=300,height=600");if(!e){this.showToast("⚠️ El bloqueador de ventanas emergentes impidió imprimir el ticket","warning");return}const s=t.items[0];e.document.write(`
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
                    <div class="bold">${s.artist}</div>
                    <div>${s.album}</div>
                    <div class="flex" style="margin-top: 5px;">
                        <span>1 x ${this.formatCurrency(s.unitPrice,!1)}</span>
                        <span class="bold">${this.formatCurrency(s.unitPrice,!1)}</span>
                    </div>
                    <div class="divider"></div>
                    <div class="flex bold" style="font-size: 14px;">
                        <span>TOTAL</span>
                        <span>${this.formatCurrency(t.total_amount)}</span>
                    </div>
                    <div class="divider"></div>
                    <div class="text-center">
                        <div>Pago: ${t.paymentMethod}</div>
                        <div class="footer">¡Gracias por tu compra!</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(() => window.close(), 500);
                        }
                    <\/script>
                </body>
            </html>
        `),e.document.close()},updateOrderFeedFilter(t){this.state.orderFeedFilter=t,this.renderSales(document.getElementById("app-content"))},toggleOrderActionMenu(t){const e=document.getElementById(`action-menu-${t}`);document.querySelectorAll('[id^="action-menu-"]').forEach(s=>{s.id!==`action-menu-${t}`&&s.classList.add("hidden")}),e&&e.classList.toggle("hidden")},async markOrderAsShipped(t){try{await C.collection("sales").doc(t).update({status:"shipped",fulfillment_status:"fulfilled",shipped_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast("✅ Pedido marcado como enviado"),this.loadData()}catch(e){console.error("Error marking order as shipped:",e),this.showToast("❌ Error al actualizar estado","error")}},searchSku(t){this.state.manualSaleSearch=t;const e=document.getElementById("sku-results");if(t.length<2){e.classList.add("hidden");return}const s=this.state.inventory.filter(o=>o.artist.toLowerCase().includes(t.toLowerCase())||o.album.toLowerCase().includes(t.toLowerCase())||o.sku.toLowerCase().includes(t.toLowerCase()));s.length>0?(e.innerHTML=s.map(o=>`
    <div onclick="app.selectSku('${o.sku}')" class="p-3 hover:bg-orange-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center">
                    <div>
                        <p class="font-bold text-sm text-brand-dark">${o.album}</p>
                        <p class="text-xs text-slate-500">${o.artist}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-sm text-brand-orange">${this.formatCurrency(o.price,!1)}</p>
                        <p class="text-xs ${o.stock>0?"text-green-500":"text-red-500"}">Stock: ${o.stock}</p>
                    </div>
                </div>
    `).join(""),e.classList.remove("hidden")):e.classList.add("hidden")},selectSku(t){const e=this.state.inventory.find(s=>s.sku===t);e&&(this.state.posSelectedItemSku=e.sku,this.renderSales(document.getElementById("app-content")),setTimeout(()=>{const s=document.getElementById("input-price"),o=document.getElementById("input-sku"),r=document.getElementById("input-cost"),a=document.getElementById("input-artist"),n=document.getElementById("input-album"),i=document.getElementById("input-genre"),l=document.getElementById("input-owner"),c=document.getElementById("sku-search");s&&(s.value=e.price),o&&(o.value=e.sku),r&&(r.value=e.cost||0),a&&(a.value=e.artist),n&&(n.value=e.album),i&&(i.value=e.genre),l&&(l.value=e.owner),c&&(c.value=`${e.artist} - ${e.album}`,this.state.manualSaleSearch=c.value);const p=document.getElementById("sku-results");p&&p.classList.add("hidden")},50),e.stock<=0&&this.showToast("⚠️ Este producto no tiene stock disponible","warning"))},updateTotal(){const t=parseFloat(document.getElementById("input-price").value)||0,e=parseInt(document.getElementById("input-qty").value)||1,s=t*e;document.getElementById("form-total").innerText=this.formatCurrency(s)},openAddVinylModal(t=null){let e={sku:"",artist:"",album:"",genre:"Minimal",condition:"NM",product_condition:"Second-hand",provider_origin:"Local_Used",acquisition_date:"",item_phantom_vat:0,item_real_vat:0,price:"",cost:"",stock:1,owner:"El Cuartito"},s=!1;if(t){const a=this.state.inventory.find(n=>n.sku===t);a&&(e=a,s=!0)}if(!s){const a=this.state.inventory.map(i=>{const l=i.sku.match(/^SKU\s*-\s*(\d+)/);return l?parseInt(l[1]):0}),n=Math.max(0,...a);e.sku=`SKU-${String(n+1).padStart(3,"0")}`}const o=["Minimal","Techno","House","Deep House","Electro"];[...new Set([...o,...this.state.customGenres||[]])];const r=`
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
                    <h3 class="text-lg font-bold text-slate-900 tracking-tight">${s?"Edit Record":"Add to Inventory"}</h3>
                </div>
                <button type="button" onclick="document.getElementById('modal-overlay').remove()" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-300 hover:text-slate-900">
                    <i class="ph-bold ph-x"></i>
                </a>
            </div>

            <form id="vinyl-form" onsubmit="app.handleAddVinyl(event, '${s?e.sku:""}')" class="flex-1 flex flex-col overflow-hidden">
                <div class="px-8 py-4 space-y-6 overflow-hidden">
                    
                    <!-- Top Grid: Identity + Pricing -->
                    <div class="grid grid-cols-12 gap-5 shrink-0">
                        
                        <!-- Block A: Album Identity -->
                        <div class="col-span-12 lg:col-span-7 dashboard-card p-5 flex gap-5">
                            <div class="relative w-28 h-28 shrink-0 group">
                                <div id="cover-preview" class="absolute inset-0 bg-slate-50 rounded-2xl border-2 border-slate-100 border-dashed flex items-center justify-center overflow-hidden">
                                    <img src="${e.cover_image||""}" class="${e.cover_image?"":"hidden"} w-full h-full object-cover">
                                    <div id="cover-placeholder" class="${e.cover_image?"hidden":""}">
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
                                        <input name="artist" value="${e.artist}" required class="dashboard-input w-full h-10">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Album</label>
                                        <input name="album" value="${e.album}" required class="dashboard-input w-full h-10">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Block B: Pricing & Margins -->
                        <div class="col-span-12 lg:col-span-5 dashboard-card p-5 bg-slate-50/30 border-dashed flex flex-col justify-center">
                            <div class="grid grid-cols-2 gap-4 mb-3">
                                <div class="space-y-1">
                                    <label class="text-[9px] font-bold text-slate-400 uppercase block">Buy Cost</label>
                                    <input name="cost" id="modal-cost" type="number" step="0.5" value="${e.cost||0}" oninput="app.calculateMargin(); app.updatePhantomVatPreview()" class="dashboard-input w-full h-10">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-bold text-slate-400 uppercase block">Retail Price</label>
                                    <input name="price" id="modal-price" type="number" step="0.5" value="${e.price||0}" oninput="app.calculateProfit()" class="dashboard-input w-full h-10 border-[#FF6B00]/40 bg-white">
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
                                            <option value="Local_Used" ${e.provider_origin==="Local_Used"||!e.provider_origin?"selected":""}>🏪 Local / Usado</option>
                                            <option value="EU_B2B" ${e.provider_origin==="EU_B2B"?"selected":""}>🇪🇺 EU B2B (Factura)</option>
                                            <option value="DK_B2B" ${e.provider_origin==="DK_B2B"?"selected":""}>🇩🇰 DK B2B (Factura)</option>
                                        </select>
                                    </div>
                                    <div id="acquisition-date-container" class="space-y-1 ${e.provider_origin==="EU_B2B"||e.provider_origin==="DK_B2B"?"":"hidden"}">
                                        <label class="text-[9px] font-black text-slate-400 uppercase block">Fecha Factura</label>
                                        <input name="acquisition_date" id="modal-acquisition-date" type="date" value="${e.acquisition_date||new Date().toISOString().split("T")[0]}" class="dashboard-input w-full h-10 bg-white">
                                    </div>
                                </div>
                                <div id="phantom-vat-preview" class="${e.provider_origin==="EU_B2B"?"":"hidden"} bg-blue-50 rounded-lg px-3 py-2 border border-blue-100 flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <i class="ph-bold ph-receipt text-blue-500 text-sm"></i>
                                        <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">EU Reverse Charge (25%)</span>
                                    </div>
                                    <span id="phantom-vat-amount" class="text-sm font-black text-blue-700">${e.item_phantom_vat?e.item_phantom_vat.toFixed(2)+" DKK":"0.00 DKK"}</span>
                                </div>
                                <div id="real-vat-preview" class="${e.provider_origin==="DK_B2B"?"":"hidden"} bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100 flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <i class="ph-bold ph-receipt text-emerald-500 text-sm"></i>
                                        <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">IVA Factura DK (25%)</span>
                                    </div>
                                    <span id="real-vat-amount" class="text-sm font-black text-emerald-700">${e.item_real_vat?e.item_real_vat.toFixed(2)+" DKK":"0.00 DKK"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Metadata Area -->
                    <div id="discogs-metadata-area" class="${s?"":"hidden"} dashboard-card overflow-hidden">
                        <div class="bg-slate-50 border-b border-slate-100 flex items-center justify-between px-5 py-2">
                             <h5 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Discogs Info</h5>
                             <a id="discogs-link" href="${e.discogsUrl||"#"}" target="_blank" class="${e.discogsUrl?"":"hidden"} text-[10px] font-bold text-[#FF6B00] hover:underline flex items-center gap-1">
                                <i class="ph-bold ph-disc"></i> View release
                             </a>
                        </div>
                        <div class="px-5 py-3 grid grid-cols-12 gap-4">
                            <div class="col-span-4">
                                <p class="text-[8px] font-bold text-slate-400 uppercase mb-1.5">Genres & Styles</p>
                                <div id="metadata-tags" class="flex flex-wrap gap-1 min-h-[20px]">
                                    ${((e.genre||"")+(e.styles?", "+e.styles:"")).split(",").filter(a=>a.trim()).map(a=>`<span class="meta-chip border border-slate-200">${a.trim()}</span>`).join("")}
                                </div>
                            </div>
                            <div class="col-span-8 border-l border-slate-100 pl-4">
                                <p class="text-[8px] font-bold text-slate-400 uppercase mb-1.5">Reference Tracklist</p>
                                <div id="metadata-tracks" class="max-h-28 overflow-y-auto pr-2 custom-scrollbar space-y-0.5">
                                    ${e.tracks&&e.tracks.length>0?e.tracks.map(a=>`<div class="track-item flex justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
                                            <span class="font-bold w-6 opacity-40 shrink-0 capitalize text-[9px]">${a.position||"•"}</span>
                                            <span class="flex-1 truncate font-medium text-slate-600 text-[10px]">${a.title}</span>
                                            <span class="opacity-40 text-[9px] font-mono shrink-0">${a.duration||""}</span>
                                        </div>`).join(""):'<p class="text-[10px] text-slate-400 italic">Select a Discogs result to load tracks...</p>'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Additional Details & Channels -->
                    <div class="grid grid-cols-12 gap-5 items-start">
                        <!-- Left: Record Details -->
                        <div class="col-span-8 space-y-4">
                            <div class="grid grid-cols-5 gap-3">
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Vinyl Grade</label>
                                    <select name="condition" class="dashboard-input w-full h-10 bg-white">
                                        <option value="M" ${e.condition==="M"?"selected":""}>M (Mint)</option>
                                        <option value="NM" ${e.condition==="NM"||!e.condition?"selected":""}>NM (Near Mint)</option>
                                        <option value="VG+" ${e.condition==="VG+"?"selected":""}>VG+ (Very Good Plus)</option>
                                        <option value="VG" ${e.condition==="VG"?"selected":""}>VG (Very Good)</option>
                                        <option value="G" ${e.condition==="G"?"selected":""}>G (Good)</option>
                                    </select>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Sleeve Grade</label>
                                    <select name="sleeveCondition" class="dashboard-input w-full h-10 bg-white">
                                        <option value="" ${e.sleeveCondition?"":"selected"}>—</option>
                                        <option value="M" ${e.sleeveCondition==="M"?"selected":""}>M (Mint)</option>
                                        <option value="NM" ${e.sleeveCondition==="NM"?"selected":""}>NM (Near Mint)</option>
                                        <option value="VG+" ${e.sleeveCondition==="VG+"?"selected":""}>VG+ (Very Good Plus)</option>
                                        <option value="VG" ${e.sleeveCondition==="VG"?"selected":""}>VG (Very Good)</option>
                                        <option value="G" ${e.sleeveCondition==="G"?"selected":""}>G (Good)</option>
                                        <option value="Generic" ${e.sleeveCondition==="Generic"?"selected":""}>Generic</option>
                                        <option value="No Cover" ${e.sleeveCondition==="No Cover"?"selected":""}>No Cover</option>
                                    </select>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Condición Prod.</label>
                                    <select name="product_condition" class="dashboard-input w-full h-10 bg-white">
                                        <option value="Second-hand" ${e.product_condition==="Second-hand"||!e.product_condition?"selected":""}>Usado (Second-hand)</option>
                                        <option value="New" ${e.product_condition==="New"?"selected":""}>Nuevo (New)</option>
                                    </select>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Year</label>
                                    <input name="year" value="${e.year||""}" class="dashboard-input w-full h-10 bg-white">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Stock</label>
                                    <input name="stock" type="number" value="${e.stock||1}" class="dashboard-input w-full h-10 bg-white">
                                </div>
                            </div>
                            <div class="grid grid-cols-3 gap-3">
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Genre 1</label>
                                    <input name="genre" id="genre-1" value="${e.genre||""}" placeholder="e.g. Electronic" class="dashboard-input w-full h-10 bg-white">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Genre 2</label>
                                    <input name="genre2" id="genre-2" value="${e.genre2||""}" placeholder="e.g. Techno" class="dashboard-input w-full h-10 bg-white">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Genre 3</label>
                                    <input name="genre3" id="genre-3" value="${e.genre3||""}" placeholder="e.g. Minimal" class="dashboard-input w-full h-10 bg-white">
                                </div>
                            </div>
                            <div class="grid grid-cols-4 gap-3">
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Label / Sello</label>
                                    <input name="label" value="${e.label||""}" placeholder="Record label" class="dashboard-input w-full h-10 bg-white">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Owner</label>
                                    <select name="owner" id="modal-owner" class="dashboard-input w-full h-10 bg-white">
                                        <option value="El Cuartito" ${e.owner==="El Cuartito"||!e.owner?"selected":""}>El Cuartito</option>
                                        ${this.state.consignors.map(a=>`<option value="${a.name}" data-split="${a.agreementSplit}" ${e.owner===a.name?"selected":""}>${a.name}</option>`).join("")}
                                    </select>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Storage Location</label>
                                    <input name="storageLocation" value="${e.storageLocation||""}" placeholder="e.g. Shelf A" class="dashboard-input w-full h-10 bg-white">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase block">Comments</label>
                                    <input name="comments" value="${e.comments||""}" placeholder="Optional notes" class="dashboard-input w-full h-10 bg-white">
                                </div>
                            </div>
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
                                        <input type="checkbox" name="publish_discogs" ${e.publish_discogs||e.discogs_listing_id?"checked":""}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <i class="ph-fill ph-storefront text-[#FF6B00] text-xs"></i>
                                        <span class="text-[10px] font-bold text-slate-700">Online Web</span>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" name="is_online" ${e.is_online!==!1?"checked":""}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <i class="ph-fill ph-storefront text-[#10B981] text-xs"></i>
                                        <span class="text-[10px] font-bold text-slate-700">In-Store POS</span>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" name="publish_local" ${e.publish_local!==!1?"checked":""}>
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
                                            <input type="checkbox" name="tag_hero" value="hero" ${e.tags&&e.tags.includes("hero")?"checked":""} class="peer h-4 w-4 text-[#FF6B00] border-slate-300 rounded focus:ring-[#FF6B00]">
                                        </div>
                                        <span class="text-xs font-bold text-slate-700 group-hover:text-[#FF6B00] transition-colors">Hero / Destacado</span>
                                    </label>

                                    <!-- New Arrival Toggle -->
                                    <label class="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white rounded-lg transition-colors">
                                        <div class="relative flex items-center">
                                            <input type="checkbox" name="tag_new" value="new_arrival" ${e.tags&&e.tags.includes("new_arrival")?"checked":""} class="peer h-4 w-4 text-[#FF6B00] border-slate-300 rounded focus:ring-[#FF6B00]">
                                        </div>
                                        <span class="text-xs font-bold text-slate-700 group-hover:text-[#FF6B00] transition-colors">💥 New Arrival / Novedad</span>
                                    </label>

                                    <!-- RSD Discount Toggle -->
                                    <label class="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white rounded-lg transition-colors">
                                        <div class="relative flex items-center">
                                            <input type="checkbox" name="is_rsd_discount" ${e.is_rsd_discount?"checked":""} class="peer h-4 w-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500">
                                        </div>
                                        <span class="text-xs font-bold text-slate-700 group-hover:text-orange-500 transition-colors">🎉 10% Descuento RSD</span>
                                    </label>

                                    <div class="h-px bg-slate-100 my-2"></div>
                                    <p class="text-[8px] font-bold text-slate-400 uppercase mb-2">Collection / Agrupación</p>

                                    <div class="relative">
                                        <input name="collection_tag" list="collections-list" 
                                            value="${(e.tags||[]).find(a=>a!=="hero"&&a!=="new_arrival")||""}" 
                                            placeholder="Escribe para crear o buscar..." 
                                            class="dashboard-input w-full h-10 bg-white border-orange-200 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] text-xs">
                                        <datalist id="collections-list">
                                            ${[...new Set(this.state.inventory.flatMap(a=>a.tags||[]).filter(a=>a!=="hero"&&a!=="new_arrival"))].map(a=>`<option value="${a}">`).join("")}
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
                <input type="hidden" name="cover_image" id="input-cover-image" value="${e.cover_image||""}">
                <input type="hidden" name="discogs_release_id" id="input-discogs-release-id" value="${e.discogs_release_id||""}">
                <input type="hidden" name="discogsUrl" id="input-discogs-url" value="${e.discogsUrl||""}">
                <input type="hidden" name="discogsId" id="input-discogs-id" value="${e.discogsId||""}">
                <input type="hidden" name="sku" value="${e.sku}">
                <!-- New Hidden Input for Tracks (JSON) -->
                <input type="hidden" name="tracks" id="input-tracks" value='${e.tracks?JSON.stringify(e.tracks).replace(/'/g,"&#39;"):""}'>
                <!-- label is now a visible field above -->

                <!-- Footer Actions -->
                <div class="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU: <span class="text-slate-900">${e.sku}</span></p>
                    <div class="flex gap-4">
                        <button type="button" onclick="document.getElementById('modal-overlay').remove()" class="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">Cancel</a>
                        <button type="submit" class="bg-[#FF6B00] text-white px-10 py-3 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
                            <i class="ph-bold ph-plus"></i>
                            ${s?"Update Inventory":"Add to Inventory"}
                        </a>
                    </div>
                </div>
            </form>
        </div>
    </div>
                `;document.body.insertAdjacentHTML("beforeend",r)},openProductModal(t){console.log("Attempting to open modal for:",t);try{const e=this.state.inventory.find(r=>r.sku===t);if(!e){console.error("Item not found:",t),alert("Error: No se encontró el disco. Intenta recargar.");return}const s=document.getElementById("modal-overlay");s&&s.remove();const o=`
                <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-fadeIn" style="animation: fadeIn 0.3s forwards;">

                        <!-- Cover Image Header -->
                        <div class="h-64 w-full bg-slate-100 relative group">
                            ${e.cover_image?`<img src="${e.cover_image}" class="w-full h-full object-cover">`:'<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-fill ph-music-note text-6xl"></i></div>'}
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                            <button onclick="document.getElementById('modal-overlay').remove()" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm">
                                <i class="ph-bold ph-x text-xl"></i>
                            </a>

                            <div class="absolute bottom-0 left-0 w-full p-6 text-white">
                                <div class="flex items-center gap-2 mb-2">
                                    ${this.getStatusBadge(e.condition)}
                                    <span class="text-xs font-mono opacity-70 bg-black/30 px-2 py-1 rounded">${e.sku}</span>
                                </div>
                                <h2 class="font-display text-2xl font-bold leading-tight drop-shadow-md mb-1">${e.album}</h2>
                                <p class="text-lg font-medium text-orange-200 drop-shadow-sm">${e.artist}</p>
                            </div>
                        </div>

                        <!-- Details Body -->
                        <div class="p-6 space-y-6">
                            <div class="grid grid-cols-2 gap-6">
                                <div>
                                    <p class="text-xs text-slate-400 font-bold uppercase mb-1">Precio</p>
                                    <p class="text-3xl font-bold text-brand-dark">${this.formatCurrency(e.price,!1)}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-slate-400 font-bold uppercase mb-1">Stock</p>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xl font-bold ${e.stock>0?"text-green-600":"text-red-500"}">${e.stock}</span>
                                        <span class="text-xs text-slate-400 font-medium">unidades</span>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-3 pt-4 border-t border-slate-100">
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Fecha de Carga</span>
                                    <span class="text-sm font-bold text-brand-dark">${e.created_at?new Date(e.created_at.seconds?e.created_at.seconds*1e3:e.created_at).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"}):"Desconocida"}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Género</span>
                                    <span class="text-sm font-bold text-brand-dark">${e.genre}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Sello / Label</span>
                                    <span class="text-sm font-bold text-brand-dark text-right max-w-[60%] truncate">${e.label||"-"}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Dueño / Owner</span>
                                    <span class="text-sm font-bold text-brand-dark">${e.owner}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Ubicación / Storage</span>
                                    <span class="text-sm font-bold text-brand-dark">${e.storageLocation||"-"}</span>
                                </div>
                                ${e.provider_origin?`
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Origen Proveedor</span>
                                    <span class="text-sm font-bold ${e.provider_origin==="EU_B2B"?"text-blue-600":e.provider_origin==="DK_B2B"?"text-emerald-600":"text-brand-dark"}">${e.provider_origin==="EU_B2B"?"🇪🇺 EU B2B":e.provider_origin==="DK_B2B"?"🇩🇰 DK B2B":"🏪 Local / Usado"}</span>
                                </div>`:""}
                                ${e.item_phantom_vat?`
                                <div class="flex justify-between items-center py-2 border-b border-slate-50 bg-blue-50/50 -mx-5 px-5 rounded">
                                    <span class="text-sm text-blue-600 font-medium">EU Reverse Charge (25%)</span>
                                    <span class="text-sm font-bold text-blue-700">${e.item_phantom_vat.toFixed(2)} DKK</span>
                                </div>`:""}
                                ${e.item_real_vat?`
                                <div class="flex justify-between items-center py-2 border-b border-slate-50 bg-emerald-50/50 -mx-5 px-5 rounded">
                                    <span class="text-sm text-emerald-600 font-medium">IVA Factura DK (25%)</span>
                                    <span class="text-sm font-bold text-emerald-700">${e.item_real_vat.toFixed(2)} DKK</span>
                                </div>`:""}
                                ${e.acquisition_date?`
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Fecha Factura (SKAT)</span>
                                    <span class="text-sm font-bold text-brand-dark">${new Date(e.acquisition_date).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"})}</span>
                                </div>`:""}
                            </div>

                            <div class="pt-4 flex flex-wrap gap-3">
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openAddVinylModal('${e.sku}')" class="flex-1 min-w-[120px] bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/20 text-sm">
                                    <i class="ph-bold ph-pencil-simple"></i>
                                    Editar
                                </a>
                                <button id="refresh-metadata-btn" onclick="app.refreshProductMetadata('${e.id||e.sku}')" 
                                    class="flex-1 min-w-[120px] bg-emerald-50 text-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 border border-emerald-100 text-sm"
                                    title="Actualizar datos desde Discogs">
                                    <i class="ph-bold ph-arrows-clockwise"></i>
                                    Re-sync
                                </a>
                                ${e.discogsUrl?`<a href="${e.discogsUrl}" target="_blank" class="flex-1 min-w-[120px] bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="ph-bold ph-disc"></i> Discogs
                                   </a>`:`<a href="https://www.discogs.com/search/?q=${encodeURIComponent(e.artist+" "+e.album)}&type=release" target="_blank" class="flex-1 min-w-[120px] bg-slate-50 text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="ph-bold ph-magnifying-glass"></i> Buscar
                                   </a>`}
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openTracklistModal('${e.sku}')" class="flex-1 min-w-[120px] bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border border-indigo-100 text-sm">
                                    <i class="ph-bold ph-list-numbers"></i> Tracks
                                </a>
                                <button onclick="app.addToCart('${e.sku}'); document.getElementById('modal-overlay').remove()" class="flex-1 min-w-[120px] bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 text-sm">
                                    <i class="ph-bold ph-shopping-cart"></i>
                                    Vender
                                </a>
                                <button onclick="app.deleteVinyl('${e.sku}'); document.getElementById('modal-overlay').remove()" class="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm" title="Eliminar Disco">
                                    <i class="ph-bold ph-trash text-xl"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                `;document.body.insertAdjacentHTML("beforeend",o)}catch(e){console.error("Error opening product modal:",e),alert("Hubo un error al abrir la ficha. Por favor recarga la página.")}},calculateMargin(){const t=document.getElementById("modal-cost"),e=document.getElementById("modal-price"),s=document.getElementById("profit-percent"),o=document.getElementById("profit-label");if(!t||!e||!s||!o)return;const r=parseFloat(t.value)||0,a=parseFloat(e.value)||0;if(a>0){const n=a-r,i=n/a*100;s.innerText=`${Math.round(i)}%`,o.innerText=`${n>=0?"+":""}$${n.toFixed(2)}`,n>=0?o.className="profit-tag":o.className="profit-tag bg-red-50 text-red-600 border-red-100"}else s.innerText="0%",o.innerText="+$0.00",o.className="profit-tag"},calculateProfit(){this.calculateMargin()},onProviderOriginChange(){var a;const t=(a=document.getElementById("modal-provider-origin"))==null?void 0:a.value,e=document.getElementById("acquisition-date-container"),s=document.getElementById("phantom-vat-preview"),o=document.getElementById("real-vat-preview"),r=document.querySelector('[name="product_condition"]');t==="EU_B2B"?(e==null||e.classList.remove("hidden"),s==null||s.classList.remove("hidden"),o==null||o.classList.add("hidden"),r&&(r.value="New"),this.updatePhantomVatPreview()):t==="DK_B2B"?(e==null||e.classList.remove("hidden"),s==null||s.classList.add("hidden"),o==null||o.classList.remove("hidden"),r&&(r.value="New"),this.updatePhantomVatPreview()):(e==null||e.classList.add("hidden"),s==null||s.classList.add("hidden"),o==null||o.classList.add("hidden"))},updatePhantomVatPreview(){var o,r;const t=parseFloat((o=document.getElementById("modal-cost"))==null?void 0:o.value)||0,e=(r=document.getElementById("modal-provider-origin"))==null?void 0:r.value,s=Math.round(t*.25*100)/100;if(e==="EU_B2B"){const a=document.getElementById("phantom-vat-amount");a&&(a.textContent=s.toFixed(2)+" DKK")}else if(e==="DK_B2B"){const a=document.getElementById("real-vat-amount");a&&(a.textContent=s.toFixed(2)+" DKK")}},handleCostChange(){const t=parseFloat(document.getElementById("modal-cost").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),o=document.getElementById("modal-margin"),r=document.getElementById("modal-price");if(s){const a=parseFloat(s)/100;if(a>0){const n=t/a;r.value=Math.ceil(n)}}else{const n=1-(parseFloat(o.value)||0)/100;if(n>0){const i=t/n;r.value=Math.ceil(i)}}},handlePriceChange(){const t=parseFloat(document.getElementById("modal-price").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),o=document.getElementById("modal-margin"),r=document.getElementById("modal-cost"),a=document.getElementById("cost-helper");if(s){const n=parseFloat(s)/100,i=t*n;r.value=Math.round(i),o.value=100-parseFloat(s),o.readOnly=!0,o.classList.add("opacity-50"),a&&(a.innerText=`Consignación: ${s}% Socio`)}else{const n=parseFloat(r.value)||0;if(n>0&&t>0){const i=(t-n)/n*100;o.value=Math.round(i)}o.readOnly=!1,o.classList.remove("opacity-50"),a&&(a.innerText="Modo Propio: Margen variable")}},handleMarginChange(){const t=parseFloat(document.getElementById("modal-margin").value)||0,e=parseFloat(document.getElementById("modal-cost").value)||0,s=document.getElementById("modal-price");if(e>0){const o=e*(1+t/100);s.value=Math.ceil(o)}},checkCustomInput(t,e){const s=document.getElementById(e);t.value==="other"?(s.classList.remove("hidden"),s.querySelector("input").required=!0,s.querySelector("input").focus()):(s.classList.add("hidden"),s.querySelector("input").required=!1)},toggleCollectionNote(t){const e=document.getElementById("collection-note-container");e&&t&&t!==""?e.classList.remove("hidden"):e&&e.classList.add("hidden")},handleCollectionChange(t){var o;const e=document.getElementById("custom-collection-container"),s=document.getElementById("collection-note-container");t==="other"?(e==null||e.classList.remove("hidden"),(o=e==null?void 0:e.querySelector("input"))==null||o.focus()):e==null||e.classList.add("hidden"),t&&t!==""?s==null||s.classList.remove("hidden"):s==null||s.classList.add("hidden")},openAddSaleModal(){const t=this.state.cart.length>0?this.state.cart.map(s=>`
                <div class="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <div class="min-w-0 pr-2">
                        <p class="font-bold text-xs text-brand-dark truncate">${s.album}</p>
                        <p class="text-[10px] text-slate-500">${this.formatCurrency(s.price,!1)}</p>
                    </div>
                </div>`).join(""):'<p class="text-sm text-slate-400 italic text-center py-4">El carrito está vacío</p>',e=`
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
                                        ${t}
                                    </div>
                                    ${this.state.cart.length>0?`
                                <div class="flex justify-between items-center mb-4 pt-2 border-t border-slate-200">
                                    <span class="text-sm font-bold text-slate-500">Total</span>
                                    <span class="text-xl font-bold text-brand-dark">${this.formatCurrency(this.state.cart.reduce((s,o)=>s+o.price,0))}</span>
                                </div>
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openCheckoutModal()" class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20 flex items-center justify-center gap-2">
                                    <i class="ph-bold ph-check-circle"></i> Finalizar Compra Carrito
                                </a>
                            `:""}
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
                                                                        <input type="date" name="date" required value="${new Date().toISOString().split("T")[0]}"
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
                                                    `;document.body.insertAdjacentHTML("beforeend",e),setTimeout(()=>document.getElementById("sku-search").focus(),100)},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(r=>r.sku===t);if(!s)return;if(this.state.cart.filter(r=>r.sku===t).length>=s.stock){this.showToast(`⚠️ No queda más stock de "${s.album}"`,"warning");return}this.openAddSaleModal(),setTimeout(()=>{const r=document.getElementById("sku-search");r.value=t,this.searchSku(t),setTimeout(()=>{const a=document.getElementById("sku-results").firstElementChild;a&&a.click()},500)},200)},openUnifiedOrderDetailModal(t){var v,h,f,w;const e=this.state.sales.find(u=>u.id===t);if(!e)return;const s=this.getCustomerInfo(e),o=e.history||[],r=(v=e.timestamp)!=null&&v.toDate?e.timestamp.toDate():e.date?new Date(e.date):new Date;let a=[];o.length>0?a=o.map(u=>({status:u.status,timestamp:new Date(u.timestamp),note:u.note})).sort((u,g)=>g.timestamp-u.timestamp):a.push({status:e.fulfillment_status||"pending",timestamp:(h=e.updated_at)!=null&&h.toDate?e.updated_at.toDate():e.updated_at?new Date(e.updated_at):new Date,note:"Última actualización"}),a.push({status:"created",timestamp:r,note:`Orden recibida via ${e.channel||e.soldAt||"Sistema"}`});const n=u=>({created:{icon:"ph-shopping-cart",color:"bg-slate-100 text-slate-500",label:"Recibido"},preparing:{icon:"ph-package",color:"bg-blue-100 text-blue-600",label:"En Preparación"},ready_for_pickup:{icon:"ph-storefront",color:"bg-emerald-100 text-emerald-600",label:"Listo para Retiro"},in_transit:{icon:"ph-truck",color:"bg-orange-100 text-orange-600",label:"En Tránsito"},shipped:{icon:"ph-archive",color:"bg-green-100 text-green-600",label:"Despachado"},picked_up:{icon:"ph-check-circle",color:"bg-green-100 text-green-600",label:"Retirado"},completed:{icon:"ph-check-circle",color:"bg-green-100 text-green-600",label:"Confirmado"},failed:{icon:"ph-x-circle",color:"bg-red-100 text-red-600",label:"Fallido"},PENDING:{icon:"ph-clock",color:"bg-yellow-100 text-yellow-600",label:"Pendiente"}})[u]||{icon:"ph-info",color:"bg-slate-100",label:u},i=e.items?e.items.reduce((u,g)=>{var $;return u+(g.unitPrice||g.priceAtSale||(($=g.record)==null?void 0:$.price)||0)*(g.qty||g.quantity||1)},0):e.total||0,l=parseFloat(e.shipping_income||e.shipping_cost||e.shipping||((f=e.shipping_method)==null?void 0:f.price)||0),c=l*.2,p=(e.discogsFee||0)+(e.paypalFee||0),b=e.total_amount||e.total||i+l,d=`
        <div id="unified-modal" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative animate-fadeIn flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] font-bold text-brand-orange uppercase tracking-widest">Orden #${e.orderNumber||e.id.slice(0,8)}</span>
                            <span class="px-2 py-0.5 rounded-full ${n(e.status).color} text-[9px] font-bold uppercase">${n(e.status).label}</span>
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
                                        <i class="ph-fill ${e.channel==="online"?"ph-globe":e.channel==="discogs"?"ph-vinyl-record":"ph-storefront"} text-brand-orange"></i>
                                        <span class="font-bold text-brand-dark capitalize">${e.channel||e.soldAt||"Local"}</span>
                                    </div>
                                </div>
                                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fulfillment</p>
                                    <div class="font-bold text-brand-dark capitalize">${(e.fulfillment_status||"Pendiente").replace("_"," ")}</div>
                                </div>
                                <div class="bg-brand-dark p-4 rounded-2xl text-white">
                                    <p class="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Monto Total</p>
                                    <div class="text-xl font-bold">${this.formatCurrency(b)}</div>
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
                                            ${(e.items||[]).map(u=>{var g,$,E,S,I;return`
                                                <tr>
                                                    <td class="px-4 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <img src="${u.image||u.cover_image||((g=u.record)==null?void 0:g.cover_image)||"https://elcuartito.dk/default-vinyl.png"}" class="w-10 h-10 rounded-lg object-cover shadow-sm">
                                                            <div>
                                                                <p class="font-bold text-brand-dark">${u.album||(($=u.record)==null?void 0:$.album)||"Desconocido"}</p>
                                                                <p class="text-[10px] text-slate-500">${u.artist||((E=u.record)==null?void 0:E.artist)||""}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-4 py-4 text-center font-mono text-xs text-slate-400">${u.sku||((S=u.record)==null?void 0:S.sku)||"-"}</td>
                                                    <td class="px-4 py-4 text-center font-medium">${u.quantity||u.qty||1}</td>
                                                    <td class="px-4 py-4 text-right font-bold text-brand-dark">${this.formatCurrency(u.unitPrice||u.priceAtSale||((I=u.record)==null?void 0:I.price)||0)}</td>
                                                </tr>
                                            `}).join("")}
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
                                            <span class="font-medium text-brand-dark">${this.formatCurrency(i)}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-slate-500">Envío (Gross)</span>
                                            <span class="font-medium text-brand-dark">${this.formatCurrency(l)}</span>
                                        </div>
                                        <div class="flex justify-between text-blue-600 text-[10px] font-bold">
                                            <span>↳ Salgsmoms Envío (25%)</span>
                                            <span>${this.formatCurrency(c)}</span>
                                        </div>
                                        ${p!==0?`
                                            <div class="flex justify-between text-red-500">
                                                <span>Fees (Discogs/PayPal)</span>
                                                <span class="font-medium">-${this.formatCurrency(p)}</span>
                                            </div>
                                        `:""}
                                        <div class="flex justify-between font-bold text-brand-dark pt-2 border-t border-slate-200">
                                            <span>Monto Final</span>
                                            <span>${this.formatCurrency(b)}</span>
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
                                            <p class="text-sm font-bold text-brand-dark capitalize">${e.payment_method||e.paymentMethod||"Tarjeta"}</p>
                                            <p class="text-[10px] text-slate-400">${e.paymentId?"ID: "+e.paymentId.slice(0,15)+"...":"Venta Directa"}</p>
                                        </div>
                                    </div>
                                    <div class="text-[10px] text-slate-400 flex items-center gap-1">
                                        <i class="ph ph-calendar"></i>
                                        Registrado el ${r.toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"})}
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
                                        <p class="font-bold text-brand-dark">${s.name}</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Email</p>
                                        <p class="text-sm font-medium text-slate-600 truncate">${s.email}</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Teléfono</p>
                                        <p class="text-sm font-medium text-slate-600">${((w=e.customer)==null?void 0:w.phone)||"-"}</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección</p>
                                        <p class="text-xs font-medium text-slate-600 leading-relaxed">${s.address}</p>
                                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}" target="_blank" class="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-1">
                                            <i class="ph ph-map-pin"></i> Ver en Maps
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <!-- Fulfillment Actions -->
                            ${e.channel==="online"||e.channel==="discogs"?`
                                <div class="space-y-4">
                                    <h4 class="font-bold text-brand-dark flex items-center gap-2">
                                        <i class="ph-fill ph-truck text-brand-orange"></i> Gestión de Envío
                                    </h4>
                                    <div class="flex flex-col gap-2">
                                        <button onclick="app.updateFulfillmentStatus(event, '${e.id}', 'preparing')" class="w-full px-4 py-2.5 rounded-xl border ${e.fulfillment_status==="preparing"?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"} text-xs font-bold transition-all flex items-center gap-2">
                                            <i class="ph ph-package"></i> Preparación
                                        </a>
                                        <button onclick="app.setReadyForPickup('${e.id}', event)" class="w-full px-4 py-2.5 rounded-xl border ${e.fulfillment_status==="ready_for_pickup"?"bg-emerald-600 text-white border-emerald-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"} text-xs font-bold transition-all flex items-center gap-2">
                                            <i class="ph ph-storefront"></i> Listo para Retiro
                                        </a>
                                        <button onclick="app.updateFulfillmentStatus(event, '${e.id}', 'shipped')" class="w-full px-4 py-2.5 rounded-xl border ${e.fulfillment_status==="shipped"?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"} text-xs font-bold transition-all flex items-center gap-2">
                                            <i class="ph ph-paper-plane-tilt"></i> Enviado / Despachado
                                        </a>
                                    </div>
                                </div>
                            `:""}

                            <!-- History Timeline -->
                            <div class="space-y-4">
                                <h4 class="font-bold text-brand-dark flex items-center gap-2">
                                    <i class="ph-fill ph-clock-counter-clockwise text-brand-orange"></i> Movimientos
                                </h4>
                                <div class="relative pl-4 border-l-2 border-slate-100 space-y-6">
                                    ${a.map((u,g)=>{const $=n(u.status);return`
                                            <div class="relative">
                                                <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${g===0?"bg-brand-orange ring-4 ring-orange-50":"bg-slate-300"}"></div>
                                                <div class="flex flex-col gap-0.5">
                                                    <div class="flex items-center gap-2">
                                                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${$.color}">
                                                            ${$.label}
                                                        </span>
                                                        <span class="text-[9px] text-slate-400 font-mono">
                                                            ${u.timestamp.toLocaleDateString("es-ES",{day:"2-digit",month:"short"})} ${u.timestamp.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
                                                        </span>
                                                    </div>
                                                    <p class="text-xs text-slate-500">${u.note||"-"}</p>
                                                </div>
                                            </div>
                                        `}).join("")}
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
        `;document.body.insertAdjacentHTML("beforeend",d)},openInvoiceModal(t){var g;const e=this.state.sales.find($=>$.id===t);if(!e){this.showToast("Sale not found","error");return}const s=e.items||[],o=(g=e.date)!=null&&g.toDate?e.date.toDate():new Date(e.date||e.timestamp),r=o.toISOString().slice(0,10).replace(/-/g,""),a=e.invoiceNumber||`ECR-${r}-${t.slice(-4).toUpperCase()}`,n=s.filter($=>$.productCondition==="New"),i=s.filter($=>$.productCondition!=="New");let l=0,c=0;const p=($,E)=>$.map(S=>{const I=S.priceAtSale||S.price||0,y=S.qty||S.quantity||1,D=I*y;if(c+=D,E){const _=D*.2;return l+=_,`
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${S.album||"Product"}</div>
                                <div style="font-size: 11px; color: #666;">${S.artist||""}</div>
                                <div style="font-size: 11px; color: #2563eb; margin-top: 4px;">✓ Moms (25%): DKK ${_.toFixed(2)}</div>
                            </td>
                            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eee;">${y}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee;">DKK ${I.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">DKK ${D.toFixed(2)}</td>
                        </tr>
                    `}else return`
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${S.album||"Product"}</div>
                                <div style="font-size: 11px; color: #666;">${S.artist||""}</div>
                                <div style="font-size: 10px; color: #d97706; margin-top: 4px; font-style: italic;">Brugtmoms - Køber har ikke fradrag for momsen</div>
                            </td>
                            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eee;">${y}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee;">DKK ${I.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">DKK ${D.toFixed(2)}</td>
                        </tr>
                    `}).join("");let b="";n.length>0&&i.length>0?b=`
                <tr><td colspan="4" style="padding: 15px 0 8px 0; font-size: 12px; font-weight: bold; color: #2563eb; text-transform: uppercase;">🆕 New Products (VAT Deductible)</td></tr>
                ${p(n,!0)}
                <tr><td colspan="4" style="padding: 20px 0 8px 0; font-size: 12px; font-weight: bold; color: #d97706; text-transform: uppercase;">📦 Used Products (Margin Scheme / Brugtmoms)</td></tr>
                ${p(i,!1)}
            `:b=p(n,!0)+p(i,!1);const d=parseFloat(e.shipping_income||e.shipping||e.shipping_cost||0),v=d*.2,h=c+d,f=e.customer?`${e.customer.firstName||""} ${e.customer.lastName||""}`.trim():e.customerName||"Customer",w=e.customer?`${e.customer.address||""}<br>${e.customer.postalCode||""} ${e.customer.city||""}<br>${e.customer.country||""}`:"",u=`
            <div id="invoice-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick="if(event.target.id === 'invoice-modal') this.remove()">
                <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div class="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                        <h3 class="font-bold text-lg text-brand-dark flex items-center gap-2">
                            <i class="ph-fill ph-file-text text-brand-orange"></i>
                            Invoice ${a}
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
                                    <p style="color: #666; margin: 0;">${f}</p>
                                    ${w?`<p style="color: #666; margin: 5px 0; font-size: 12px;">${w}</p>`:""}
                                </div>
                                <div style="text-align: right;">
                                    <p style="margin: 0;"><strong>Invoice:</strong> ${a}</p>
                                    <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${o.toLocaleDateString("en-GB")}</p>
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
                                    ${b}
                                </tbody>
                            </table>

                            <div style="border-top: 2px solid #eee; padding-top: 15px; font-size: 14px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>Subtotal:</span>
                                    <span>DKK ${c.toFixed(2)}</span>
                                </div>
                                ${l>0?`
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #2563eb; font-size: 13px;">
                                    <span>↳ Heraf moms (25%):</span>
                                    <span>DKK ${l.toFixed(2)}</span>
                                </div>
                                `:""}
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>Shipping (incl. 25% VAT):</span>
                                    <span>DKK ${d.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #2563eb; font-size: 11px;">
                                    <span>↳ Shipping VAT (25%):</span>
                                    <span>DKK ${v.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #333; font-weight: 900; font-size: 18px;">
                                    <span>Total:</span>
                                    <span>DKK ${h.toFixed(2)}</span>
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
        `;document.body.insertAdjacentHTML("beforeend",u)},printInvoice(){const t=document.getElementById("invoice-content").innerHTML,e=window.open("","_blank");e.document.write(`
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
                ${t}
                <script>window.print(); setTimeout(() => window.close(), 500);<\/script>
            </body>
            </html>
        `),e.document.close()},navigateInventoryFolder(t,e){t==="genre"&&(this.state.filterGenre=e),t==="owner"&&(this.state.filterOwner=e),t==="label"&&(this.state.filterLabel=e),t==="storage"&&(this.state.filterStorage=e),this.refreshCurrentView()},toggleSelection(t){this.state.selectedItems.has(t)?this.state.selectedItems.delete(t):this.state.selectedItems.add(t),this.refreshCurrentView()},async openPrintLabelModal(t){const e=this.state.inventory.find(n=>n.sku===t);if(!e)return;let s={...e};try{const n=await this.findProductBySku(t);n&&n.data&&(s={...e,...n.data})}catch(n){console.warn("[printLabel] Could not fetch fresh product data, using state copy",n)}const o=s.year&&Number(s.year)!==0?String(s.year):"—",r=s.price?Number(s.price).toLocaleString("da-DK"):"—",a=`
<div id="print-label-modal" data-sku="${s.sku}" data-orientation="landscape" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl w-full max-w-[92vw] shadow-2xl border border-orange-100 overflow-hidden max-h-[95vh] flex flex-col relative">

        <!-- Modal header -->
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
                <h2 class="text-2xl font-display font-bold text-brand-dark">Imprimir Etiqueta</h2>
                <p class="text-slate-500 text-sm">Configura e imprime la etiqueta para ${s.album}</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold font-mono">${s.sku}</span>
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
                                ${s.cover_image?`<img src="${s.cover_image}" class="w-full h-full object-cover">`:'<div class="w-full h-full flex items-center justify-center text-slate-400"><i class="ph-fill ph-disc text-2xl"></i></div>'}
                            </div>
                            <div class="min-w-0">
                                <div class="font-bold text-brand-dark text-sm truncate">${s.album}</div>
                                <div class="text-xs text-slate-500">${s.artist}</div>
                                <div class="flex gap-2 mt-1">
                                    <span class="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">${s.label||"Sin sello"}</span>
                                    <span class="text-[10px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded border border-orange-100">${this.formatCurrency(s.price,!1)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ── Editable label fields ── -->
                    <div class="space-y-2.5">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><i class="ph ph-pencil-simple"></i> Datos de la etiqueta <span class="font-normal normal-case">(solo impresión)</span></p>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-title">Título</label>
                            <input id="label-edit-title" type="text" value="${s.album||""}" 
                                class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm font-bold"
                                oninput="document.getElementById('preview-title').innerText = this.value || '—'">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-artist">Artista</label>
                            <input id="label-edit-artist" type="text" value="${s.artist||""}" 
                                class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm"
                                oninput="document.getElementById('preview-artist').innerText = this.value || '—'">
                        </div>
                        <div class="flex gap-2">
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-genre1">Género 1</label>
                                <input id="label-edit-genre1" type="text" value="${s.genre||""}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm"
                                    placeholder="Ej: Electronic"
                                    oninput="(function(v){ var el=document.getElementById('preview-genre-bar'); if(el){ var g2=document.getElementById('label-edit-genre2'); el.innerText=((v||'VINYL')+(g2&&g2.value?' / '+g2.value:'')).toUpperCase();} })(this.value)">
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-genre2">Género 2</label>
                                <input id="label-edit-genre2" type="text" value="${s.genre2||""}" 
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
                                <input id="label-edit-year" type="text" value="${o!=="—"?o:""}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm font-mono"
                                    placeholder="—"
                                    oninput="(function(v){ var el = document.getElementById('preview-meta-year'); if(el) el.innerText = v || '—'; })(this.value)">
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-price">Precio (DKK)</label>
                                <input id="label-edit-price" type="number" value="${s.price||""}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm font-mono"
                                    placeholder="—"
                                    oninput="(function(v){ var el = document.getElementById('preview-price'); if(el) el.innerText = v ? Number(v).toLocaleString('da-DK') : '—'; })(this.value)">
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-cond">Condición</label>
                                <input id="label-edit-cond" type="text" value="${s.condition||""}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm font-mono"
                                    placeholder="Ej: VG+"
                                    oninput="(function(v){ var el = document.getElementById('preview-meta-cond'); if(el) el.innerText = v || '—'; })(this.value)">
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="label-edit-loc">Ubicación</label>
                                <input id="label-edit-loc" type="text" value="${s.storageLocation||""}" 
                                    class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm font-mono"
                                    placeholder="Ej: A1"
                                    oninput="(function(v){ var el = document.getElementById('preview-meta-loc'); if(el) el.innerText = v || '—'; })(this.value)">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nota / Descripción</label>
                            <textarea id="label-comment" rows="2"
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
                                <span class="label-b__genre" id="preview-genre-bar">${((s.genre||"VINYL")+(s.genre2?" / "+s.genre2:"")).toUpperCase()}</span>
                                <div class="label-b__logo-wrap"><img class="label-b__logo" src="logo-broadsheet.png" alt="El Cuartito"></div>
                            </div>
                            <!-- Body -->
                            <div class="label-b__body">
                                <!-- Left column -->
                                <div class="label-b__left">
                                    <div>
                                        <div class="label-b__title" id="preview-title">${s.album}</div>
                                        <div class="label-b__artist" id="preview-artist">${s.artist}</div>
                                        ${s.label?`<div class="label-b__sello-row"><span class="label-b__sello-key">Label</span><span class="label-b__sello-val">${s.label}</span></div>`:""}
                                    </div>
                                    <div class="label-b__comment-wrap">
                                        <div class="label-b__comment" id="preview-comment"></div>
                                    </div>
                                    <div>
                                        <div class="label-b__hairline"></div>
                                        <div class="label-b__meta">
                                            <span class="label-b__meta-item label-b__meta-item--left"><span class="label-b__meta-key">Loc </span><span class="label-b__meta-mono" id="preview-meta-loc">${s.storageLocation||"—"}</span></span>
                                            <span class="label-b__meta-item label-b__meta-item--center"><span class="label-b__meta-key">Cond </span><span class="label-b__meta-mono" id="preview-meta-cond">${s.condition||"—"}</span></span>
                                            <span class="label-b__meta-item label-b__meta-item--right"><span class="label-b__meta-key">Year </span><span class="label-b__meta-mono" id="preview-meta-year">${o}</span></span>
                                        </div>
                                    </div>
                                </div>
                                <!-- Right column -->
                                <div class="label-b__right">
                                    <div class="label-b__qr-wrap">
                                        <div class="label-b__qr" id="qr-container"></div>
                                        <div class="label-b__sku">${s.sku}</div>
                                    </div>
                                    <div class="label-b__price-box">
                                        <div class="label-b__price" id="preview-price">${r}</div>
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
        .label-b__comment-wrap { flex: 1; display: flex; align-items: center; width: 100%; }
        .label-b__comment {
            font-size: 2.1mm; font-style: italic; color: rgba(0,0,0,0.4);
            padding-left: 1.5mm; border-left: 0.5px solid rgba(0,0,0,0.2);
            max-width: 100%; white-space: normal; word-break: break-word;
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
`;document.body.insertAdjacentHTML("beforeend",a),setTimeout(()=>{const n=document.getElementById("qr-container");n&&typeof QRCode<"u"&&(n.innerHTML="",new QRCode(n,{text:s.sku,width:57,height:57,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M}))},50)},closePrintLabelModal(){const t=document.getElementById("print-label-modal");if(t){const e=document.getElementById("label-comment");e&&(e.value=""),t.remove()}},setLabelOrientation(t){const e=document.getElementById("print-label-modal");if(!e)return;e.dataset.orientation=t;const s=document.getElementById("orient-h"),o=document.getElementById("orient-v"),r="flex-1 py-2 bg-white text-brand-dark font-bold rounded-lg text-sm shadow-sm flex items-center justify-center gap-1.5 transition-all",a="flex-1 py-2 text-slate-500 font-bold rounded-lg text-sm flex items-center justify-center gap-1.5 transition-all";s&&(s.className=t==="landscape"?r:a),o&&(o.className=t==="portrait"?r:a);const n=document.getElementById("printable-label");n&&n.classList.toggle("label-b--portrait",t==="portrait")},async confirmPrintLabel(){const t=document.getElementById("label-comment"),e=document.getElementById("preview-comment"),s=t?t.value:"";t&&e&&(e.innerText=s);const o=document.querySelector('#print-label-modal button[onclick="app.confirmPrintLabel()"]');o&&(o.disabled=!0,o.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Imprimiendo…');try{const r=document.getElementById("print-label-modal"),a=r&&r.dataset.orientation||"landscape",i=(await this._drawLabelCanvas(s,a)).toDataURL("image/png").split(",")[1],l=await fetch(`${R}/api/print-label`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:i})}),c=await l.json();if(!l.ok)throw new Error(c.error||"Error desconocido");o&&(o.innerHTML='<i class="ph-bold ph-check"></i> ¡Enviado!',o.classList.replace("bg-brand-dark","bg-green-600")),this.showToast("✅ Etiqueta enviada a la impresora"),setTimeout(()=>this.closePrintLabelModal(),1500)}catch(r){o&&(o.disabled=!1,o.innerHTML='<i class="ph-bold ph-printer"></i> Imprimir'),this.showToast("Error al imprimir: "+r.message,"error")}},async _drawLabelCanvas(t,e="landscape"){const s=document.getElementById("print-label-modal"),o=s?s.dataset.sku:null,r=o?this.state.inventory.find(w=>w.sku===o)||{}:{},a=(w,u)=>{const g=document.getElementById(w);return g&&g.value.trim()?g.value.trim():u},n={...r,album:a("label-edit-title",r.album),artist:a("label-edit-artist",r.artist),year:a("label-edit-year",r.year),price:a("label-edit-price",r.price),genre:a("label-edit-genre1",r.genre),genre2:a("label-edit-genre2",r.genre2),condition:a("label-edit-cond",r.condition),storageLocation:a("label-edit-loc",r.storageLocation)},i=300/25.4,l=e==="portrait",c=Math.round((l?40:62)*i),p=Math.round((l?62:40)*i),b=document.createElement("canvas");b.width=c,b.height=p;const d=b.getContext("2d");"wordSpacing"in d&&(d.wordSpacing="0px"),"letterSpacing"in d&&(d.letterSpacing="0px"),d.fillStyle="#ffffff",d.fillRect(0,0,c,p);const v=Math.round(5.5*i);d.fillStyle="#000000",d.fillRect(0,0,c,v);const h=Math.round(2.2*i);d.fillStyle="#ffffff",d.font=`800 ${h}px "DM Sans", Arial, sans-serif`,d.textBaseline="middle",d.textAlign="left";const f=((n.genre||"VINYL")+(n.genre2?" / "+n.genre2:"")).toUpperCase();d.fillText(f,Math.round(1.6*i),v/2);try{const w=await new Promise(u=>{const g=new Image;g.crossOrigin="anonymous",g.onload=()=>u(g),g.onerror=()=>u(null),g.src="logo-broadsheet.png"});if(w){const u=Math.round(3*i),g=Math.round(w.naturalWidth*(u/w.naturalHeight)),$=document.createElement("canvas");$.width=w.naturalWidth,$.height=w.naturalHeight;const E=$.getContext("2d");E.drawImage(w,0,0);const S=E.getImageData(0,0,$.width,$.height),I=S.data;for(let N=0;N<I.length;N+=4)I[N+3]>0&&(I[N]=255,I[N+1]=255,I[N+2]=255);E.putImageData(S,0,0);const D=Math.round(18*i),_=c-D+Math.round((D-g)/2),M=(v-u)/2;d.drawImage($,_,M,g,u)}}catch{}if(l){const w=Math.round(1.6*i),u=c-w*2;d.textAlign="left",d.textBaseline="top";const g=Math.round(3.8*i);d.font=`800 ${g}px "DM Sans", Arial, sans-serif`,d.fillStyle="#000000";const $=this._wrapText(d,n.album||"",u,2);let E=v+Math.round(1.1*i);$.forEach((z,P)=>{d.fillText(z,w,E+P*Math.round(g*1.1))}),E+=$.length*Math.round(g*1.1);const S=Math.round(2.4*i);if(d.font=`600 ${S}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.5)",E+=Math.round(.5*i),d.fillText(this._truncateText(d,n.artist||"",u),w,E),E+=S,n.label&&n.label!=="Desconocido"){const z=Math.round(2.2*i);E+=Math.round(.6*i),d.font=`700 ${Math.round(1.9*i)}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.35)",d.fillText("LABEL",w,E);const P=d.measureText("LABEL ").width;d.font=`600 ${z}px "DM Sans", Arial, sans-serif`,d.fillStyle="#333333",d.fillText(this._truncateText(d,n.label,u-P),w+P,E),E+=z}if(t){const z=Math.round(2.1*i);d.font=`italic 600 ${z}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.4)",d.textBaseline="top";const P=u-Math.round(3*i),q=this._wrapText(d,t,P,2),ue=Math.round(z*1.35),ne=E+Math.round(1.8*i);q.forEach((ve,ye)=>{d.fillText(ve,w+Math.round(1.5*i),ne+ye*ue)})}const I=Math.round(12*i),y=Math.round(20*i),D=Math.round((c-y)/2),_=p-I-Math.round(1.6*i),M=_-Math.round(4.5*i),N=M-Math.round(2.2*i);d.strokeStyle="rgba(0,0,0,0.15)",d.lineWidth=1,d.beginPath(),d.moveTo(w,M),d.lineTo(c-w,M),d.stroke();const Y=Math.round(2*i),J=Math.round(1.8*i),G=u/3;d.textBaseline="middle";const Z=(z,P,q)=>{d.textAlign="left",d.font=`700 ${J}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.45)",d.fillText(z+" ",q,N);const ue=d.measureText(z+" ").width;d.font=`700 ${Y}px "DM Mono", "Courier New", monospace`,d.fillStyle="rgba(0,0,0,0.7)",d.fillText(P,q+ue,N)};Z("Loc",n.storageLocation||"—",w),Z("Cond",n.condition||"—",w+G),Z("Year",n.year&&Number(n.year)!==0?String(n.year):"—",w+G*2);const Q=Math.round(13*i),ee=Math.round((c-Q)/2),te=Math.round(1.9*i),x=E+Math.round(2.5*i),T=N-Math.round(te+Math.round(.4*i)+4),O=x+Math.max(0,Math.round((T-x-Q)/2)),se=document.getElementById("qr-container"),ae=se?se.querySelector("canvas"):null;ae?d.drawImage(ae,ee,O,Q,Q):(d.strokeStyle="#ccc",d.lineWidth=1,d.strokeRect(ee,O,Q,Q)),d.font=`600 ${te}px "DM Mono", "Courier New", monospace`,d.fillStyle="rgba(0,0,0,0.45)",d.textAlign="center",d.textBaseline="top",d.fillText(n.sku||"",c/2,O+Q+Math.round(.4*i)),d.fillStyle="#000000";const L=Math.round(.8*i);d.beginPath(),d.moveTo(D+L,_),d.lineTo(D+y-L,_),d.quadraticCurveTo(D+y,_,D+y,_+L),d.lineTo(D+y,_+I-L),d.quadraticCurveTo(D+y,_+I,D+y-L,_+I),d.lineTo(D+L,_+I),d.quadraticCurveTo(D,_+I,D,_+I-L),d.lineTo(D,_+L),d.quadraticCurveTo(D,_,D+L,_),d.closePath(),d.fill();const ie=n.price?Number(n.price).toLocaleString("da-DK"):"—",de=Math.round(4.8*i),H=Math.round(2.2*i),W=de*1.1,V=H*1.1,F=_+(I-W-V)/2+W/2,U=F+W/2+V/2;d.textAlign="center",d.textBaseline="middle",d.font=`800 ${de}px "DM Mono", "Courier New", monospace`,d.fillStyle="#ffffff",d.fillText(ie,D+y/2,F),d.font=`700 ${H}px "DM Sans", Arial, sans-serif`,d.fillStyle="#ffffff",d.fillText("DKK",D+y/2,U)}else{const w=v,u=Math.round(18*i),g=c-u,$=Math.round(1.6*i),E=Math.round(1.1*i);d.textAlign="left",d.textBaseline="top";const S=Math.round(3.8*i);d.font=`800 ${S}px "DM Sans", Arial, sans-serif`,d.fillStyle="#000000";const I=g-$-Math.round(.95*i),y=this._wrapText(d,n.album||"",I,2);y.forEach((be,le)=>{d.fillText(be,$,w+E+le*Math.round(S*1.1))});const D=Math.round(2.4*i);d.font=`600 ${D}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.5)";const _=w+E+y.length*Math.round(S*1.1)+Math.round(.5*i),M=this._truncateText(d,n.artist||"",I);d.fillText(M,$,_);let N=_+D;if(n.label&&n.label!=="Desconocido"){const be=Math.round(2.2*i),le=N+Math.round(.6*i);d.font=`700 ${Math.round(1.9*i)}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.35)",d.fillText("LABEL",$,le),d.font=`600 ${be}px "DM Sans", Arial, sans-serif`,d.fillStyle="#333333";const he=$+d.measureText("LABEL ").width;d.fillText(this._truncateText(d,n.label,I-he+$),he,le),N=le+be}const Y=p-Math.round(5*i);if(t){const be=Math.round(2.1*i);d.font=`italic 600 ${be}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.4)",d.textBaseline="top";const le=I-Math.round(2*i),he=this._wrapText(d,t,le,2),ke=Math.round(be*1.35),Me=he.length*ke,Be=N+(Y-N-Me)/2;he.forEach((Se,Ce)=>{d.fillText(Se,$+Math.round(1.5*i),Be+Ce*ke)})}const J=Math.round(2*i),G=Math.round(1.8*i),Z=p-Math.round(2.5*i),ee=(g-$-Math.round(.95*i))/3;d.strokeStyle="rgba(0,0,0,0.15)",d.lineWidth=1,d.beginPath(),d.moveTo($,Y),d.lineTo(g-Math.round(.95*i),Y),d.stroke(),d.textBaseline="middle",d.textAlign="left";const te=(be,le,he)=>{d.font=`700 ${G}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.45)",d.fillText(be+" ",he,Z);const ke=d.measureText(be+" ").width;d.font=`700 ${J}px "DM Mono", "Courier New", monospace`,d.fillStyle="rgba(0,0,0,0.7)",d.fillText(le,he+ke,Z)};te("Loc",n.storageLocation||"—",$),te("Cond",n.condition||"—",$+ee),te("Year",n.year&&Number(n.year)!==0?String(n.year):"—",$+ee*2);const x=g;d.strokeStyle="rgba(0,0,0,0.12)",d.lineWidth=1,d.beginPath(),d.moveTo(x,w),d.lineTo(x,p),d.stroke();const T=document.getElementById("qr-container"),O=T?T.querySelector("canvas"):null,ae=Math.round(15*i),L=x+Math.round((u-ae)/2),ie=w+Math.round(1.1*i);O?d.drawImage(O,L,ie,ae,ae):(d.strokeStyle="#ccc",d.strokeRect(L,ie,ae,ae));const de=Math.round(1.9*i);d.font=`600 ${de}px "DM Mono", "Courier New", monospace`,d.fillStyle="rgba(0,0,0,0.45)",d.textAlign="center",d.textBaseline="top",d.fillText(n.sku||"",x+u/2,ie+ae+Math.round(.4*i));const H=Math.round(12*i),W=Math.round(15*i),V=x+Math.round((u-W)/2),F=p-H-Math.round(1.6*i);d.fillStyle="#000000";const U=Math.round(.8*i);d.beginPath(),d.moveTo(V+U,F),d.lineTo(V+W-U,F),d.quadraticCurveTo(V+W,F,V+W,F+U),d.lineTo(V+W,F+H-U),d.quadraticCurveTo(V+W,F+H,V+W-U,F+H),d.lineTo(V+U,F+H),d.quadraticCurveTo(V,F+H,V,F+H-U),d.lineTo(V,F+U),d.quadraticCurveTo(V,F,V+U,F),d.closePath(),d.fill();const z=n.price?Number(n.price).toLocaleString("da-DK"):"—",P=Math.round(4.8*i),q=Math.round(2*i),ue=P*1.1,ne=q*1.1,ve=ue+ne,ye=F+(H-ve)/2+ue/2,Te=ye+ue/2+ne/2;d.textAlign="center",d.textBaseline="middle",d.font=`800 ${P}px "DM Mono", "Courier New", monospace`,d.fillStyle="#ffffff",d.fillText(z,V+W/2,ye);const Ie=Math.round(2.2*i);d.font=`700 ${Ie}px "DM Sans", Arial, sans-serif`,d.fillStyle="#ffffff",d.fillText("DKK",V+W/2,Te)}return b},_wrapText(t,e,s,o){const r=e.split(" "),a=[];let n="";for(const i of r){const l=n?n+" "+i:i;if(t.measureText(l).width>s&&n){if(a.push(n),n=i,a.length>=o)break}else n=l}if(n&&a.length<o&&a.push(n),a.length>0){const i=a[a.length-1];a[a.length-1]=this._truncateText(t,i,s)}return a},_truncateText(t,e,s){if(t.measureText(e).width<=s)return e;let o=e;for(;o.length>1&&t.measureText(o+"…").width>s;)o=o.slice(0,-1);return o+"…"},initFuse(){if(typeof Fuse>"u"){console.warn("Fuse.js not loaded yet");return}const t={keys:[{name:"artist",weight:.35},{name:"album",weight:.25},{name:"label",weight:.15},{name:"storageLocation",weight:.15},{name:"sku",weight:.1},{name:"quickId",weight:.1},{name:"genre",weight:.03},{name:"notes",weight:.02}],threshold:.4,distance:100,ignoreLocation:!0,minMatchCharLength:2};this.fuse=new Fuse(this.state.inventory,t)},getFilteredInventory(){const t=(this.state.inventorySearch||"").trim().toLowerCase(),e=this.state.filterGenre||"all",s=this.state.filterOwner||"all",o=this.state.filterLabel||"all",r=this.state.filterStorage||"all",a=this.state.filterDiscogs||"all",n=this.state.filterHero||"all";let i=this.state.inventory;if(t.length>=2)if(this.fuse)i=this.fuse.search(t).map(l=>l.item);else{const l=t.split(" ").filter(c=>c.length>0);i=i.filter(c=>l.every(p=>(c.artist||"").toLowerCase().includes(p)||(c.album||"").toLowerCase().includes(p)||(c.label||"").toLowerCase().includes(p)||(c.storageLocation||"").toLowerCase().includes(p)||(c.genre||"").toLowerCase().includes(p)||(c.notes||"").toLowerCase().includes(p)||(c.sku||"").toLowerCase().includes(p)))}return i.filter(l=>{const c=[l.genre,l.genre2,l.genre3,l.genre4,l.genre5].filter(Boolean),p=[];c.forEach(D=>{p.push(...D.split(",").map(_=>_.trim()).filter(Boolean))});const b=[...new Set(p)],d=b.filter(D=>D.toLowerCase()!=="electronic"),v=d.length>0?d:b.length>0?b:["Otros"],h=e==="all"||v.includes(e),f=s==="all"||l.owner===s,w=o==="all"||l.label===o,u=r==="all"||l.storageLocation===r,g=!!l.discogs_listing_id,$=a==="all"||a==="yes"&&g||a==="no"&&!g,E=l.tags&&(Array.isArray(l.tags),l.tags.includes("hero")),S=n==="all"||n==="yes"&&E||n==="no"&&!E,I=this.getTimeInStockCategory(l.created_at||null),y=this.state.filterStockTime.length===0||this.state.filterStockTime.includes(I);return h&&f&&w&&u&&$&&S&&y})},toggleSelectAll(){const t=this.getFilteredInventory();t.length>0&&t.every(e=>this.state.selectedItems.has(e.sku))?t.forEach(e=>this.state.selectedItems.delete(e.sku)):t.forEach(e=>this.state.selectedItems.add(e.sku)),this.refreshCurrentView()},addSelectionToCart(){this.state.selectedItems.forEach(t=>{const e=this.state.inventory.find(s=>s.sku===t);e&&e.stock>0&&(this.state.cart.find(s=>s.sku===t)||this.state.cart.push(e))}),this.state.selectedItems.clear(),this.showToast(`${this.state.cart.length} items agregados al carrito`),this.refreshCurrentView()},deleteSelection(){if(!confirm(`¿Estás seguro de eliminar ${this.state.selectedItems.size} productos ? `))return;const t=C.batch(),e=[];this.state.selectedItems.forEach(s=>{const o=C.collection("products").doc(s),r=this.state.inventory.find(a=>a.sku===s);r&&e.push(r),t.delete(o)}),t.commit().then(()=>{this.showToast("Productos eliminados"),e.forEach(s=>this.logInventoryMovement("DELETE",s)),this.state.selectedItems.clear()}).catch(s=>{console.error("Error logging movement:",s),alert("Error al eliminar")})},openAddExpenseModal(){const t=["Alquiler","Servicios","Marketing","Suministros","Honorarios"],s=`
    <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" >
        <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform scale-100 transition-all border border-orange-100">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-display text-xl font-bold text-brand-dark">Registrar Gasto</h3>
                <button onclick="document.getElementById('modal-overlay').remove()" class="text-slate-400 hover:text-slate-600">
                    <i class="ph-bold ph-x text-xl"></i>
                </a>
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
                                ${[...new Set([...t,...this.state.customCategories||[]])].map(o=>`<option>${o}</option>`).join("")}
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
                    </a>
            </form>
        </div>
                                                    </div>
    `;document.body.insertAdjacentHTML("beforeend",s)},async handleAddVinyl(t,e){t.preventDefault();const s=new FormData(t.target);let o=s.get("genre"),r=s.get("collection");r==="other"&&(r=s.get("custom_collection"));const a=s.get("sku"),n=s.get("is_online")==="on",i=s.get("publish_discogs")==="on",l=s.get("publish_local")==="on",c={sku:a,artist:s.get("artist"),album:s.get("album"),genre:o,genre2:s.get("genre2")||null,genre3:s.get("genre3")||null,genre4:s.get("genre4")||null,genre5:s.get("genre5")||null,label:s.get("label"),collection:r||null,collectionNote:s.get("collectionNote")||null,year:s.get("year")?parseInt(s.get("year")):null,condition:s.get("condition"),product_condition:s.get("product_condition")||"Second-hand",provider_origin:s.get("provider_origin")||"Local_Used",sleeveCondition:s.get("sleeveCondition")||"",comments:s.get("comments")||"",price:parseFloat(s.get("price")),cost:parseFloat(s.get("cost"))||0,stock:parseInt(s.get("stock")),storageLocation:s.get("storageLocation"),owner:s.get("owner"),is_online:n,publish_webshop:n,publish_discogs:i,publish_local:l,cover_image:s.get("cover_image")||null,updated_at:firebase.firestore.FieldValue.serverTimestamp(),tags:[s.get("tag_hero")?"hero":null,s.get("tag_new")?"new_arrival":null,s.get("collection_tag")?s.get("collection_tag").trim():null].filter(Boolean),is_rsd_discount:s.get("is_rsd_discount")==="on",discogsUrl:s.get("discogsUrl"),discogsId:s.get("discogsId"),discogs_release_id:s.get("discogs_release_id")||s.get("discogsId"),tracks:(()=>{try{return JSON.parse(s.get("tracks")||"[]")}catch{return[]}})()};c.provider_origin==="EU_B2B"?(c.product_condition="New",c.item_phantom_vat=Math.round(c.cost*.25*100)/100,c.item_real_vat=0,c.acquisition_date=s.get("acquisition_date")||new Date().toISOString().split("T")[0]):c.provider_origin==="DK_B2B"?(c.product_condition="New",c.item_phantom_vat=0,c.item_real_vat=Math.round(c.cost*.25*100)/100,c.acquisition_date=s.get("acquisition_date")||new Date().toISOString().split("T")[0]):(c.item_phantom_vat=0,c.item_real_vat=0,c.acquisition_date=null),console.log(`[handleAddVinyl] editSku: ${e}, recordData:`,c);try{let p=null,b=null;if(e){const d=await this.findProductBySku(e);if(!d){this.showToast("❌ Producto no encontrado","error");return}b=d.data,p=d.id,await d.ref.update(c),this.showToast("✅ Disco actualizado")}else c.created_at=firebase.firestore.FieldValue.serverTimestamp(),p=await C.runTransaction(async d=>{const v=C.collection("metadata").doc("vinylCounter"),h=await d.get(v);let f=0;h.exists&&(f=h.data().current||0);const w=f+1,u=String(w).padStart(4,"0");d.set(v,{current:w},{merge:!0}),c.quickId=u;const g=C.collection("products").doc();return d.set(g,c),g.id}),this.showToast(`✅ Disco agregado (ID: ${c.quickId})`);if(i){const d=s.get("discogs_release_id")||s.get("discogsId");if(b&&b.discogs_listing_id)try{const h=await(await fetch(`${R}/discogs/update-listing/${b.discogs_listing_id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({product:c})})).json();if(h.success)this.showToast("💿 Listing de Discogs actualizado");else throw new Error(h.error||"Error desconocido")}catch(v){console.error("Error updating Discogs listing:",v),this.showToast(`⚠️ Error Discogs: ${v.message}`,"error")}else if(d)try{const h=await(await fetch(`${R}/discogs/create-listing`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({releaseId:parseInt(d),product:c})})).json();if(h.success&&h.listingId)await C.collection("products").doc(p).update({discogs_listing_id:String(h.listingId),discogs_release_id:parseInt(d)}),this.showToast("💿 Publicado en Discogs correctamente");else throw new Error(h.error||"Error desconocido")}catch(v){console.error("Error creating Discogs listing:",v);let h=v.message;(h.toLowerCase().includes("mp3")||h.toLowerCase().includes("digital")||h.toLowerCase().includes("format"))&&(h="Discogs solo permite formatos físicos (Vinyl, CD, Cassette). Este release es digital o MP3."),this.showToast(`⚠️ Error Discogs: ${h}`,"error")}else this.showToast("⚠️ Necesitas buscar el disco en Discogs primero para publicarlo","warning")}document.getElementById("modal-overlay").remove(),this.loadData()}catch(p){console.error(p),this.showToast("❌ Error: "+(p.message||"desconocido"),"error")}},async toggleProductTag(t,e){try{const s=this.state.inventory.find(n=>n.sku===t);if(!s){this.showToast("❌ Producto no encontrado","error");return}let o=s.tags||[];o.includes(e)?o=o.filter(n=>n!==e):o.push(e);const r=await C.collection("products").where("sku","==",t).limit(1).get();if(r.empty){this.showToast("❌ Error: Documento no encontrado","error");return}await r.docs[0].ref.update({tags:o,updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast(`✅ ${e==="hero"?"Héroe":"Novedad"} actualizado`),s.tags=o,this.refreshCurrentView()}catch(s){console.error("Error toggling product tag:",s),this.showToast("❌ Error al actualizar tag","error")}},async toggleRsdDiscount(t){try{const e=this.state.inventory.find(a=>a.sku===t);if(!e){this.showToast("❌ Producto no encontrado","error");return}const s=!e.is_rsd_discount,o=await C.collection("products").where("sku","==",t).limit(1).get();if(o.empty){this.showToast("❌ Error: Documento no encontrado","error");return}await o.docs[0].ref.update({is_rsd_discount:s,updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast(`✅ RSD ${s?"activado":"desactivado"} — ${e.album}`),e.is_rsd_discount=s,this.refreshCurrentView()}catch(e){console.error("Error toggling RSD discount:",e),this.showToast("❌ Error al actualizar RSD","error")}},deleteVinyl(t){const e=this.state.inventory.find(o=>o.sku===t);if(!e){alert("Error: Item not found");return}const s=`
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
                                                                <p class="font-bold text-brand-dark mb-1">${e.album}</p>
                                                                <p class="text-sm text-slate-500">${e.artist}</p>
                                                                <p class="text-xs text-slate-400 mt-2">SKU: ${e.sku}</p>
                                                            </div>
                                                            <div class="flex gap-3">
                                                                <button onclick="document.getElementById('delete-confirm-modal').remove()" class="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                                                    Cancelar
                                                                </a>
                                                                <button onclick="app.confirmDelete('${e.sku}')" class="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                                                                    Eliminar
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},async confirmDelete(t){const e=document.getElementById("delete-confirm-modal");e&&e.remove();const s=document.getElementById("modal-overlay");s&&s.remove();try{const o=await this.findProductBySku(t);if(!o){this.showToast("❌ Producto no encontrado","error");return}if(console.log("Product to delete:",o.data),console.log("Has discogs_listing_id?",o.data.discogs_listing_id),o.data.discogs_listing_id){console.log("Attempting to delete from Discogs:",o.data.discogs_listing_id);try{const r=await fetch(`${R}/discogs/delete-listing/${o.data.discogs_listing_id}`,{method:"DELETE"});console.log("Discogs delete response status:",r.status);const a=await r.json();console.log("Discogs delete result:",a),a.success?(console.log("Discogs listing deleted successfully"),this.showToast("💿 Eliminado de Discogs")):this.showToast("⚠️ "+(a.error||"Error en Discogs"),"warning")}catch(r){console.error("Error deleting from Discogs:",r),this.showToast("⚠️ Error eliminando de Discogs, pero continuando...","warning")}}else console.log("No discogs_listing_id found, skipping Discogs deletion");await o.ref.delete(),this.showToast("✅ Disco eliminado"),await this.loadData()}catch(o){console.error("Error removing document: ",o),this.showToast("❌ Error al eliminar: "+o.message,"error")}},handleSaleSubmit(t){var $,E,S,I,y,D,_;t.preventDefault();const e=new FormData(t.target);let s=e.get("sku");s||(s=($=document.getElementById("input-sku"))==null?void 0:$.value);const o=this.state.inventory.find(M=>M.sku===s);if(!o){this.showToast("⚠️ Debes seleccionar un producto válido del listado","error");const M=document.getElementById("sku-search");M&&(M.focus(),M.classList.add("border-red-500","animate-pulse"),setTimeout(()=>M.classList.remove("border-red-500","animate-pulse"),2e3));return}let r=parseInt(e.get("quantity"));if(isNaN(r)&&(r=parseInt((E=document.getElementById("input-qty"))==null?void 0:E.value)||1),o.stock<r){this.showToast(`❌ Stock insuficiente. Disponible: ${o.stock}`,"error");return}let a=parseFloat(e.get("price"));isNaN(a)&&(a=parseFloat((S=document.getElementById("input-price"))==null?void 0:S.value)||0);const n=parseFloat(e.get("cost"))||0,i=parseFloat(e.get("shipping_income"))||0,l=a*r+i;e.get("date")||new Date().toISOString();const c=e.get("paymentMethod"),p=e.get("soldAt");e.get("comment");let b=e.get("artist");b||(b=(I=document.getElementById("input-artist"))==null?void 0:I.value);let d=e.get("album");d||(d=(y=document.getElementById("input-album"))==null?void 0:y.value);let v=e.get("genre");v||(v=(D=document.getElementById("input-genre"))==null?void 0:D.value);let h=e.get("owner");h||(h=(_=document.getElementById("input-owner"))==null?void 0:_.value);const f=e.get("customerName"),w=e.get("customerEmail"),u=e.get("requestInvoice")==="on",g={items:[{recordId:o.id,quantity:r,unitPrice:a,costAtSale:n}],paymentMethod:c||"CASH",customerName:f||"Venta Manual",customerEmail:w||null,shipping_income:i,total_amount:l,source:"STORE",channel:(p==null?void 0:p.toLowerCase())||"store"};fe.createSale(g).then(()=>{this.showToast(u?"Venta registrada (Factura Solicitada)":"Venta registrada");const M=document.getElementById("modal-overlay");M&&M.remove();const N=t.target;N&&N.reset();const Y=document.getElementById("form-total");Y&&(Y.innerText="$0.00");const J=document.getElementById("sku-search");J&&(J.value=""),this.state.manualSaleSearch="",this.loadData()}).catch(M=>{console.error("Error adding sale: ",M),this.showToast("❌ Error al registrar venta: "+(M.message||""),"error")})},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(r=>r.sku===t);if(!s)return;if(this.state.cart.filter(r=>r.sku===t).length>=s.stock){this.showToast("⚠️ No hay más stock disponible");return}this.state.cart.push(s),document.getElementById("inventory-cart-container")?this.renderInventoryCart():this.renderCartWidget(),this.showToast("Agregado al carrito")},removeFromCart(t){this.state.cart.splice(t,1),this.renderCartWidget()},clearCart(){this.state.cart=[],this.renderCartWidget()},renderOnlineSales(t){const e=this.state.sales.filter(a=>a.channel==="online"),s=e.filter(a=>a.status==="completed"),o=e.filter(a=>a.status==="PENDING"),r=s.reduce((a,n)=>a+(parseFloat(n.total_amount||n.total)||0),0);t.innerHTML=`
        <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="font-display text-3xl font-bold text-brand-dark mb-2">🌐 Ventas WebShop</h1>
                    <p class="text-slate-500">Pedidos realizados a través de la tienda online</p>
                </div>
                <div class="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl">
                    <div class="text-sm font-medium opacity-90">Ingresos Totales</div>
                    <div class="text-3xl font-bold">DKK ${r.toFixed(2)}</div>
                    <div class="text-xs opacity-75">${s.length} ventas completadas</div>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-brand-dark">${s.length}</div>
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
                            <div class="text-2xl font-bold text-brand-dark">${o.length}</div>
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
                            <div class="text-2xl font-bold text-brand-dark">${e.length}</div>
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
                
                ${e.length===0?`
                    <div class="p-12 text-center">
                        <i class="ph-duotone ph-shopping-cart-simple text-6xl text-slate-300 mb-4"></i>
                        <p class="text-slate-400">No hay ventas online aún</p>
                    </div>
                `:`
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
                                ${e.map(a=>{var i;const n=(i=a.timestamp)!=null&&i.toDate?a.timestamp.toDate():new Date(a.date||0);return{...a,_sortDate:n.getTime()}}).sort((a,n)=>n._sortDate-a._sortDate).map(a=>{var v,h,f,w,u,g,$;const n=a.customer||{},i=a.orderNumber||"N/A",l=(v=a.timestamp)!=null&&v.toDate?a.timestamp.toDate():new Date(a.date),p=((h=a.completed_at)!=null&&h.toDate?a.completed_at.toDate():null)||l,b={completed:"bg-green-50 text-green-700 border-green-200",PENDING:"bg-yellow-50 text-yellow-700 border-yellow-200",failed:"bg-red-50 text-red-700 border-red-200"},d={completed:"✅ Completado",PENDING:"⏳ Pendiente",failed:"❌ Fallido"};return`
                                        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${a.id}')">
                                            <td class="px-6 py-4">
                                                <div class="font-mono text-sm font-bold text-brand-orange">${i}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-semibold text-brand-dark">${n.name||(n.firstName?`${n.firstName} ${n.lastName||""}`:"")||((f=n.stripe_info)==null?void 0:f.name)||"Cliente"}</div>
                                                <div class="text-xs text-slate-500">${n.email||((w=n.stripe_info)==null?void 0:w.email)||"No email"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-slate-600 truncate max-w-[200px]">
                                                    ${((u=n.shipping)==null?void 0:u.line1)||n.address||(($=(g=n.stripe_info)==null?void 0:g.shipping)==null?void 0:$.line1)||"Sin dirección"}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm">
                                                    ${a.shipping_method?`
                                                        <div class="font-semibold text-brand-dark">${a.shipping_method.method||"Standard"}</div>
                                                        <div class="text-xs text-slate-500">DKK ${(a.shipping_method.price||0).toFixed(2)}</div>
                                                        ${a.shipping_method.estimatedDays?`<div class="text-[10px] text-slate-400">${a.shipping_method.estimatedDays} días</div>`:""}
                                                    `:'<span class="text-xs text-slate-400">No especificado</span>'}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm">
                                                    <div class="font-medium capitalize text-xs">${a.payment_method||a.paymentMethod||"card"}</div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark">DKK ${(a.total_amount||a.total||0).toFixed(2)}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full border ${b[a.status]||"bg-slate-50 text-slate-700"}">
                                                    ${d[a.status]||a.status}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${a.fulfillment_status==="shipped"?"bg-blue-100 text-blue-700":a.fulfillment_status==="preparing"?"bg-orange-100 text-orange-700":a.fulfillment_status==="delivered"?"bg-green-100 text-green-700":"bg-slate-100 text-slate-600"}">
                                                    ${(a.fulfillment_status||"pendiente").toUpperCase()}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-xs text-slate-600">
                                                    ${p.toLocaleDateString("es-ES")}
                                                    <div class="text-[10px] text-slate-400">${p.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-center" onclick="event.stopPropagation()">
                                                <button onclick="app.deleteSale('${a.id}')" class="text-slate-300 hover:text-red-500 transition-colors" title="Eliminar Pedido">
                                                    <i class="ph-fill ph-trash"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    `}).join("")}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        </div>
    `},openOnlineSaleDetailModal(t){var l,c,p;const e=this.state.sales.find(b=>b.id===t);if(!e)return;const s=e.customer||{},o=s.stripe_info||{},r=s.shipping||o.shipping||{},a={line1:r.line1||s.address||"Sin dirección",line2:r.line2||"",city:r.city||s.city||"",postal:r.postal_code||s.postalCode||"",country:r.country||s.country||"Denmark"},n=`
            <p class="font-medium">${a.line1}</p>
            ${a.line2?`<p class="font-medium">${a.line2}</p>`:""}
            <p class="text-slate-500">${a.postal} ${a.city}</p>
            <p class="text-slate-500 font-bold mt-1 uppercase tracking-wider">${a.country}</p>
        `,i=`
        <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative animate-fadeIn flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <div class="text-xs font-bold text-brand-orange uppercase tracking-widest mb-1">Detalle del Pedido</div>
                        <h2 class="font-display text-2xl font-bold text-brand-dark line-clamp-1">${e.orderNumber||"Sin número de orden"}</h2>
                    </div>
                    <button onclick="document.getElementById('modal-overlay').remove()" class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                        <i class="ph-bold ph-x text-xl"></i>
                    </a>
                </div>

                <!-- Content -->
                <div class="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    
                    <!-- Top section: Status & Total -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado de Pago</p>
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full ${e.status==="completed"?"bg-green-500":"bg-yellow-500"}"></span>
                                <span class="font-bold text-brand-dark capitalize">${e.status==="completed"?"Pagado":e.status}</span>
                            </div>
                        </div>
                        <div class="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                            <p class="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Envío</p>
                            <div class="font-bold text-orange-700 capitalize">${e.fulfillment_status||"pendiente"}</div>
                        </div>
                        <div class="bg-brand-dark p-4 rounded-2xl text-white">
                            <p class="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Total</p>
                            <div class="text-xl font-bold">DKK ${(e.total_amount||e.total||0).toFixed(2)}</div>
                        </div>
                    </div>

                    <!-- Fulfillment Controls -->
                    <div class="space-y-4">
                         <h3 class="font-bold text-brand-dark flex items-center gap-2">
                            <i class="ph-fill ph-truck text-brand-orange"></i> Gestión de Envío
                        </h3>
                        <div class="flex flex-wrap gap-2">
                            <button onclick="app.updateFulfillmentStatus(event, '${e.id}', 'preparing')" class="px-4 py-2 rounded-lg border ${e.fulfillment_status==="preparing"?"bg-orange-600 text-white border-orange-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"} text-xs font-bold transition-all flex items-center gap-2">
                                <i class="ph ph-package"></i> Preparación
                            </a>
                            <button onclick="app.updateFulfillmentStatus(event, '${e.id}', 'shipped')" class="px-4 py-2 rounded-lg border ${e.fulfillment_status==="shipped"?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"} text-xs font-bold transition-all flex items-center gap-2">
                                <i class="ph ph-paper-plane-tilt"></i> Enviado
                            </a>
                            <button onclick="app.updateFulfillmentStatus(event, '${e.id}', 'delivered')" class="px-4 py-2 rounded-lg border ${e.fulfillment_status==="delivered"?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"} text-xs font-bold transition-all flex items-center gap-2">
                                <i class="ph ph-check-circle"></i> Entregado
                            </a>
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
                                    <p class="font-bold text-brand-dark text-base">${s.name||(s.firstName?`${s.firstName} ${s.lastName||""}`:"")||((l=s.stripe_info)==null?void 0:l.name)||"Cliente"}</p>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección</p>
                                    <div class="text-brand-dark space-y-0.5">
                                        ${n}
                                    </div>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Contacto</p>
                                    <p class="font-medium text-brand-dark">${s.email||o.email||"Sin email"}</p>
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
                                    <span class="font-bold capitalize">${e.payment_method||e.paymentMethod||"card"}</span>
                                </div>
                                <div class="flex justify-between items-center pb-2 border-b border-slate-200/50">
                                    <span class="text-slate-500 text-xs">Fecha</span>
                                    <span class="font-bold">${new Date((c=e.timestamp)!=null&&c.toDate?e.timestamp.toDate():(p=e.completed_at)!=null&&p.toDate?e.completed_at.toDate():e.date).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</span>
                                </div>
                                <div class="space-y-1">
                                    <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Stripe ID</span>
                                    <p class="font-mono text-[9px] break-all bg-white p-2 rounded border border-slate-200">${e.paymentId||"N/A"}</p>
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
                            ${e.shipping_method?`
                                <div class="flex justify-between items-center pb-2 border-b border-slate-200/50">
                                    <span class="text-slate-500 text-xs">Método</span>
                                    <span class="font-bold">${e.shipping_method.method||"Standard"}</span>
                                </div>
                                <div class="flex justify-between items-center pb-2 border-b border-slate-200/50">
                                    <span class="text-slate-500 text-xs">Costo</span>
                                    <span class="font-bold">DKK ${(e.shipping_method.price||0).toFixed(2)}</span>
                                </div>
                                ${e.shipping_method.estimatedDays?`
                                    <div class="flex justify-between items-center pb-2 border-b border-slate-200/50">
                                        <span class="text-slate-500 text-xs">Tiempo estimado</span>
                                        <span class="font-bold">${e.shipping_method.estimatedDays} días</span>
                                    </div>
                                `:""}
                                ${e.shipping_method.id?`
                                    <div class="space-y-1">
                                        <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">ID Método</span>
                                        <p class="font-mono text-[9px] bg-white p-2 rounded border border-slate-200">${e.shipping_method.id}</p>
                                    </div>
                                `:""}
                            `:`
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
                                    ${(e.items||[]).map(b=>{var d,v,h;return`
                                        <tr>
                                            <td class="px-4 py-3">
                                                <p class="font-bold text-brand-dark">${b.album||((d=b.record)==null?void 0:d.album)||"Unknown"}</p>
                                                <p class="text-xs text-slate-500">${b.artist||((v=b.record)==null?void 0:v.artist)||""}</p>
                                            </td>
                                            <td class="px-4 py-3 text-center font-medium">${b.quantity||1}</td>
                                            <td class="px-4 py-3 text-right font-bold text-brand-dark">DKK ${(b.unitPrice||((h=b.record)==null?void 0:h.price)||0).toFixed(2)}</td>
                                        </tr>
                                    `}).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Footer / Actions -->
                <div class="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                    <button onclick="window.print()" class="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                        <i class="ph-bold ph-printer"></i> Imprimir Packing Slip
                    </a>
                    <button onclick="document.getElementById('modal-overlay').remove()" class="flex-1 bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">
                        Cerrar
                    </a>
                </div>
            </div>
        </div>
    `;document.body.insertAdjacentHTML("beforeend",i)},renderCartWidget(){const t=document.getElementById("cart-widget");if(!t)return;const e=document.getElementById("cart-count"),s=document.getElementById("cart-items-mini"),o=document.getElementById("cart-total-mini");if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden"),e.innerText=this.state.cart.length;const r=this.state.cart.reduce((a,n)=>a+n.price,0);o.innerText=this.formatCurrency(r),s.innerHTML=this.state.cart.map((a,n)=>`
                                                                <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                                                    <div class="truncate pr-2">
                                                                        <p class="font-bold text-xs text-brand-dark truncate">${a.album}</p>
                                                                        <p class="text-[10px] text-slate-500 truncate">${a.price} kr.</p>
                                                                    </div>
                                                                    <button onclick="app.removeFromCart(${n})" class="text-red-400 hover:text-red-600">
                                                                        <i class="ph-bold ph-x"></i>
                                                                    </a>
                                                                </div>
                                                                `).join("")},openCheckoutModal(t,e,s=0){if(this.state.cart.length===0)return;const o=this.state.cart.reduce((b,d)=>b+this.getEffectivePrice(d),0),r=s>0?Math.round(o*(1-s)*100)/100:o,a=`
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
                        ${this.state.cart.map(b=>`
                            <div class="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                                <span class="truncate pr-4 font-bold text-slate-700">${b.album} ${b.is_rsd_discount?'<span class="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-black">RSD</span>':""}</span>
                                ${b.is_rsd_discount?`<span class="whitespace-nowrap"><span class="text-[10px] text-slate-400 line-through mr-1">${this.formatCurrency(b.price,!1)}</span><span class="font-mono font-bold text-orange-600">${this.formatCurrency(this.getEffectivePrice(b),!1)}</span></span>`:`<span class="font-mono font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(b.price,!1)}</span>`}
                            </div>
                        `).join("")}
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
                                <input type="date" name="date" required value="${new Date().toISOString().split("T")[0]}"
                                    class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-dark outline-none text-sm font-bold shadow-sm">
                            </div>
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Método de Pago</label>
                                <select name="paymentMethod" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-dark outline-none text-sm font-bold shadow-sm cursor-pointer">
                                    <option value="MobilePay" ${t==="MobilePay"?"selected":""}>MobilePay</option>
                                    <option value="Efectivo" ${t==="Efectivo"?"selected":""}>Efectivo</option>
                                    <option value="Tarjeta" ${t==="Tarjeta"?"selected":""}>Tarjeta</option>
                                    <option value="Transferencia" ${t==="Transferencia"?"selected":""}>Transferencia</option>
                                    <option value="Discogs Payout" ${t==="Discogs Payout"?"selected":""}>Discogs Payout</option>
                                </select>
                            </div>
                        </div>

                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Canal de Venta</label>
                            <select name="soldAt" onchange="app.onCheckoutChannelChange(this.value)" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-dark outline-none text-sm font-bold shadow-sm cursor-pointer">
                                <option value="Tienda" ${e==="Tienda"?"selected":""}>Tienda Física</option>
                                <option value="Discogs" ${e==="Discogs"?"selected":""}>Discogs Marketplace</option>
                                <option value="Feria" ${e==="Feria"?"selected":""}>Feria / Pop-up</option>
                            </select>
                        </div>

                        <!-- Editable Final Price -->
                        <div class="bg-brand-dark p-6 rounded-3xl shadow-xl shadow-brand-dark/20 space-y-4">
                            <div class="flex items-center justify-between">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <i class="ph-fill ph-currency-circle-dollar text-emerald-500"></i> Total a Recibir
                                </label>
                                <span class="text-[10px] text-slate-500 font-bold uppercase">Precio Lista: ${this.formatCurrency(r)}</span>
                            </div>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold text-lg">kr.</span>
                                <input type="number" name="finalPrice" id="checkout-final-price" step="0.01" min="0" value="${r}"
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
        `;document.body.insertAdjacentHTML("beforeend",a);const n=r,i=document.getElementById("checkout-final-price"),l=document.getElementById("discogs-fee-section"),c=document.getElementById("discogs-fee-value"),p=()=>{const b=parseFloat(i.value)||0,d=n-b;document.getElementById("checkout-total-value").innerText=this.formatCurrency(b),d>0?(l.classList.remove("hidden"),c.innerHTML=`- ${this.formatCurrency(d)}`):l.classList.add("hidden")};i.addEventListener("input",p)},onCheckoutChannelChange(t){},handleCheckoutSubmit(t){t.preventDefault();const e=new FormData(t.target),s=parseFloat(e.get("finalPrice"))||0,o=this.state.cart.reduce((a,n)=>a+this.getEffectivePrice(n),0),r={items:this.state.cart.map(a=>({recordId:a.id,quantity:1})),paymentMethod:e.get("paymentMethod"),customerName:e.get("customerName"),customerEmail:e.get("customerEmail"),channel:e.get("soldAt")||"Tienda",source:"STORE",customTotal:s,originalTotal:o,feeDeducted:o-s};fe.createSale(r).then(()=>{const a=r.channel==="Discogs"?" (Discogs listing eliminado)":"",n=r.feeDeducted>0?` | Fee: ${this.formatCurrency(r.feeDeducted)} `:"";this.showToast(`Venta de ${this.state.cart.length} items por ${this.formatCurrency(s)} registrada!${a}${n} `),this.clearCart(),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(a=>{console.error("Error checkout",a),alert("Error al procesar venta: "+a.message)})},handleSalesViewCheckout(){var o,r;if(this.state.cart.length===0){this.showToast("El carrito está vacío");return}const t=(o=document.getElementById("cart-payment"))==null?void 0:o.value,e=(r=document.getElementById("cart-channel"))==null?void 0:r.value,s=this.state.rsdExtraDiscount&&this.state.cart.length>=3?.05:0;this.openCheckoutModal(t,e,s)},async notifyPreparingDiscogs(t){try{this.showToast('Enviando notificación "Preparando"...',"info"),await fe.notifyPreparing(t),this.showToast("✅ Cliente notificado (Preparando Orden)"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in notifyPreparingDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async notifyShippedDiscogs(t,e,s){try{const o=document.getElementById(e),r=o?o.value.trim():"",a=s?document.getElementById(s):null,n=a?a.value.trim():null;if(!r){this.showToast("⚠️ Ingresa un número de seguimiento","warning");return}this.showToast("Enviando notificación de envío...","info"),await fe.notifyShipped(t,r,n),this.showToast("✅ Cliente notificado y Tracking guardado"),await this.loadData(),this.refreshCurrentView()}catch(o){console.error("Error in notifyShippedDiscogs:",o),this.showToast("❌ Error: "+o.message,"error")}},async markDispatchedDiscogs(t){try{if(!confirm("¿Marcar como despachado? Esto moverá la orden al historial."))return;this.showToast("Marcando como despachado...","info"),await fe.markDispatched(t),this.showToast("✅ Orden despachada y archivada"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in markDispatchedDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async notifyPickupReadyDiscogs(t){try{this.showToast('Enviando notificación "Listo para Retirar"...',"info"),await fe.notifyPickupReady(t),this.showToast("✅ Cliente notificado (Listo para Retirar)"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in notifyPickupReadyDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async markPickedUpDiscogs(t){try{if(!confirm("¿El cliente ya retiró el pedido? Esto moverá la orden al historial."))return;this.showToast("Marcando como retirado...","info"),await fe.markPickedUp(t),this.showToast("✅ Orden retirada y archivada"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in markPickedUpDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async deleteSale(t){var s;if(!confirm("¿Eliminar esta venta y restaurar stock?"))return;const e=this.state.sales.find(o=>o.id===t);if(!e){this.showToast("❌ Venta no encontrada","error");return}try{const o=C.batch(),r=C.collection("sales").doc(t);if(o.delete(r),e.items&&Array.isArray(e.items))for(const a of e.items){const n=a.productId||a.recordId,i=a.sku||((s=a.record)==null?void 0:s.sku),l=parseInt(a.quantity||a.qty)||1;let c=null;if(n)try{const p=await C.collection("products").doc(n).get();p.exists&&(c={ref:p.ref,data:p.data()})}catch{console.warn("Could not find product by ID:",n)}!c&&i&&(c=await this.findProductBySku(i)),c?o.update(c.ref,{stock:firebase.firestore.FieldValue.increment(l)}):console.warn("Could not restore stock for item:",a)}else if(e.sku){const a=await this.findProductBySku(e.sku);if(a){const n=parseInt(e.quantity)||1;o.update(a.ref,{stock:firebase.firestore.FieldValue.increment(n)})}}await o.commit(),this.showToast("✅ Venta eliminada y stock restaurado"),this.loadData()}catch(o){console.error("Error deleting sale:",o),this.showToast("❌ Error al eliminar venta: "+o.message,"error")}},renderExpenses(t){const e=[{value:"alquiler",label:"Alquiler",type:"operativo"},{value:"servicios",label:"Servicios (internet, luz)",type:"operativo"},{value:"marketing",label:"Marketing",type:"operativo"},{value:"envios",label:"Envíos/Packaging",type:"operativo"},{value:"software",label:"Software/Suscripciones",type:"operativo"},{value:"honorarios",label:"Honorarios Profesionales",type:"operativo"},{value:"oficina",label:"Material de Oficina",type:"operativo"},{value:"transporte",label:"Transporte",type:"operativo"},{value:"otros_op",label:"Otros Gastos Operativos",type:"operativo"},{value:"stock_nuevo",label:"📦 Stock: Vinilos NUEVOS (Distribuidor)",type:"stock_nuevo"},{value:"stock_usado",label:"📦 Stock: Vinilos USADOS (Particular/Brugtmoms)",type:"stock_usado"}];window.expenseCategories=e;const s=(this.state.expensesSearch||"").toLowerCase(),o=this.state.expenses.filter(a=>!s||(a.description||a.proveedor||"").toLowerCase().includes(s)||(a.category||a.categoria||"").toLowerCase().includes(s)||(a.proveedor||"").toLowerCase().includes(s)),r=`
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
                                        </a>
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
                                        value="${new Date().toISOString().split("T")[0]}"
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
                                        ${e.map(a=>`<option value="${a.value}">${a.label}</option>`).join("")}
                                    </select>
                                    <p id="category-warning" class="text-[10px] text-amber-600 mt-1 italic hidden">
                                        ⚠️ Los vinilos usados (Brugtmoms) no tienen IVA deducible.
                                    </p>
                                </div>

                                <!-- Inventory Invoice Toggle (Micro-IVA sync bypass) -->
                                <div class="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-start gap-3 mt-2">
                                    <input type="checkbox" name="is_inventory_invoice" id="expense-inventory-invoice"
                                        class="mt-1 w-4 h-4 text-blue-600 bg-white border-blue-300 rounded focus:ring-blue-500 cursor-pointer"
                                        onchange="app.handleInventoryInvoiceToggle(this)">
                                    <div>
                                        <label for="expense-inventory-invoice" class="text-sm font-bold text-blue-800 cursor-pointer">Factura de Inventario B2B</label>
                                        <p class="text-[10px] text-blue-600 leading-tight mt-1">
                                            Marca esto si los vinilos de esta factura ya manejan su propio Micro-IVA. 
                                            Registraremos el gasto para balances, pero lo <strong class="uppercase">ignoraremos fiscalmente</strong> para evitar doble contabilización.
                                        </p>
                                    </div>
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
                                        Guardar Gasto
                                    </a>
                                    <button type="button" id="expense-cancel-btn" onclick="app.resetExpenseForm()" 
                                        class="hidden px-4 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                        Cancelar
                                    </a>
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
                                        value="${this.state.expensesSearch||""}"
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
                                        ${o.length>0?o.map(a=>{var n;return`
                                            <tr class="hover:bg-orange-50/30 transition-colors group">
                                                <td class="p-4 text-xs text-slate-500 whitespace-nowrap">
                                                    ${this.formatDate(a.fecha_factura||a.date)}
                                                </td>
                                                <td class="p-4">
                                                    <p class="text-sm font-bold text-brand-dark">${a.proveedor||a.description||"-"}</p>
                                                    ${a.descripcion?`<p class="text-xs text-slate-400 truncate max-w-[200px]">${a.descripcion}</p>`:""}
                                                </td>
                                                <td class="p-4">
                                                    <span class="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                                        ${((n=e.find(i=>i.value===(a.categoria||a.category)))==null?void 0:n.label)||a.categoria||a.category||"-"}
                                                    </span>
                                                    ${a.categoria==="stock_nuevo"||a.categoria==="stock_usado"||a.category==="Inventario (compra de vinilos)"?`
                                                        <button onclick="app.openInventoryIngest('${a.id}')" 
                                                            class="ml-2 text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded hover:bg-orange-600 transition-colors">
                                                            Ingresar Stock
                                                        </a>
                                                    `:""}
                                                </td>
                                                <td class="p-4 text-right font-bold text-brand-dark">
                                                    ${this.formatCurrency(a.monto_total||a.amount||0)}
                                                </td>
                                                <td class="p-4 text-right text-sm ${(a.monto_iva||0)>0?"text-green-600":"text-slate-400"}">
                                                    ${this.formatCurrency(a.monto_iva||0)}
                                                </td>
                                                <td class="p-4 text-center">
                                                    ${a.receiptUrl?`
                                                        <div class="relative inline-block group/preview">
                                                            <a href="${a.receiptUrl}" target="_blank" 
                                                                class="inline-flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors" 
                                                                title="Comprobante respaldado ✓">
                                                                <i class="ph-fill ph-paperclip text-lg"></i>
                                                                <i class="ph-fill ph-check-circle text-xs"></i>
                                                            </a>
                                                            <!-- Hover Preview Tooltip -->
                                                            <div class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 invisible group-hover/preview:opacity-100 group-hover/preview:visible transition-all duration-200 pointer-events-none">
                                                                <div class="bg-white rounded-xl shadow-2xl border border-slate-200 p-2 w-48">
                                                                    <img src="${a.receiptUrl}" alt="Preview" class="w-full h-32 object-cover rounded-lg mb-1" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
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
                                                    `:`
                                                        <span class="inline-flex items-center gap-1 text-red-500" title="⚠️ Sin comprobante - Peligro fiscal">
                                                            <i class="ph-fill ph-paperclip text-lg"></i>
                                                            <i class="ph-fill ph-warning text-xs"></i>
                                                        </span>
                                                    `}
                                                </td>
                                                <td class="p-4">
                                                    <div class="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onclick="app.editExpense('${a.id}')" 
                                                            class="text-slate-400 hover:text-brand-orange p-2 rounded-lg hover:bg-orange-50 transition-all" 
                                                            title="Editar">
                                                            <i class="ph-fill ph-pencil-simple"></i>
                                                        </a>
                                                        <button onclick="app.deleteExpense('${a.id}')" 
                                                            class="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all" 
                                                            title="Eliminar">
                                                            <i class="ph-fill ph-trash"></i>
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        `}).join(""):`
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
                            ${o.length>0?`
                                <div class="p-4 bg-slate-50 border-t border-orange-100">
                                    <div class="flex justify-between items-center mb-3">
                                        <div class="flex items-center gap-4">
                                            <span class="text-xs text-slate-500">${o.length} registro(s)</span>
                                            <span class="text-xs text-slate-400">|</span>
                                            <span class="text-xs ${o.filter(a=>a.receiptUrl).length===o.length?"text-green-600":"text-red-500"}">
                                                <i class="ph-fill ph-paperclip"></i>
                                                ${o.filter(a=>a.receiptUrl).length}/${o.length} respaldados
                                            </span>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-xs text-slate-500">Total IVA Recuperable</p>
                                            <p class="text-lg font-bold text-green-600">
                                                ${this.formatCurrency(o.reduce((a,n)=>a+(n.monto_iva||0),0))}
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
                            `:""}
                        </div>
                    </div>
                </div>
            </div>
    `;t.innerHTML=r},editExpense(t){if(!confirm("¿Seguro que deseas editar esta compra?"))return;const e=this.state.expenses.find(r=>r.id===t);if(!e)return;document.getElementById("expense-id").value=e.id,document.getElementById("expense-proveedor").value=e.proveedor||e.description||"",document.getElementById("expense-fecha").value=e.fecha_factura||(e.date?e.date.split("T")[0]:""),document.getElementById("expense-monto").value=e.monto_total||e.amount||0,document.getElementById("expense-iva").value=e.monto_iva||0,document.getElementById("expense-categoria").value=e.categoria||e.category||"Otros",document.getElementById("expense-descripcion").value=e.descripcion||"";const s=document.getElementById("expense-inventory-invoice");s&&(s.checked=!!e.is_inventory_invoice);const o=document.getElementById("expense-categoria");o&&(o.value=e.categoria||e.category||"",s&&s.checked?this.handleInventoryInvoiceToggle(s):this.handleExpenseCategoryChange(o)),e.receiptUrl&&(document.getElementById("receipt-url").value=e.receiptUrl,document.getElementById("upload-placeholder").classList.add("hidden"),document.getElementById("upload-preview").classList.remove("hidden"),document.getElementById("receipt-preview-img").src=e.receiptUrl,document.getElementById("receipt-filename").textContent="Recibo guardado"),document.getElementById("expense-form-title").innerHTML='<i class="ph-duotone ph-pencil-simple text-brand-orange"></i> Editar Compra',document.getElementById("expense-submit-btn").innerHTML='<i class="ph-bold ph-floppy-disk"></i> Actualizar',document.getElementById("expense-cancel-btn").classList.remove("hidden")},resetExpenseForm(){document.getElementById("expense-form").reset(),document.getElementById("expense-id").value="",document.getElementById("expense-fecha").value=new Date().toISOString().split("T")[0],document.getElementById("expense-iva").value="0",document.getElementById("expense-iva").disabled=!1,document.getElementById("expense-iva").classList.remove("bg-slate-100","cursor-not-allowed"),document.getElementById("expense-form-title").innerHTML='<i class="ph-duotone ph-plus-circle text-brand-orange"></i> Nueva Compra',document.getElementById("expense-submit-btn").innerHTML='<i class="ph-bold ph-floppy-disk"></i> Guardar Gasto',document.getElementById("expense-cancel-btn").classList.add("hidden"),document.getElementById("receipt-url").value="",document.getElementById("receipt-file").value="",document.getElementById("upload-placeholder").classList.remove("hidden"),document.getElementById("upload-preview").classList.add("hidden"),document.getElementById("receipt-preview-img").src="",document.getElementById("receipt-filename").textContent=""},handleExpenseSubmit(t){t.preventDefault();const e=new FormData(t.target),s=e.get("categoria"),o=(window.expenseCategories||[]).find(i=>i.value===s),r=e.get("is_inventory_invoice")==="on",a={proveedor:e.get("proveedor"),fecha_factura:e.get("fecha_factura"),date:e.get("fecha_factura"),monto_total:parseFloat(e.get("monto_total"))||0,monto_iva:parseFloat(e.get("monto_iva"))||0,categoria:s,categoria_label:(o==null?void 0:o.label)||s,categoria_tipo:(o==null?void 0:o.type)||"operativo",is_vat_deductible:(o==null?void 0:o.type)==="operativo"||(o==null?void 0:o.type)==="stock_nuevo",is_inventory_invoice:r,descripcion:e.get("descripcion")||"",receiptUrl:document.getElementById("receipt-url").value||"",timestamp:new Date().toISOString()};r&&(a.monto_iva=0,a.is_vat_deductible=!1,a.categoria_tipo="stock_factura_global");const n=e.get("id");n?C.collection("expenses").doc(n).update(a).then(()=>{this.showToast("✅ Compra actualizada"),this.loadData()}).catch(i=>console.error(i)):C.collection("expenses").add(a).then(()=>{this.showToast("✅ Compra registrada"),this.loadData()}).catch(i=>console.error(i)),this.resetExpenseForm()},handleInventoryInvoiceToggle(t){const e=document.getElementById("expense-iva");if(t.checked)e.value="0",e.disabled=!0,e.classList.add("bg-slate-100","cursor-not-allowed");else{const s=document.getElementById("expense-categoria");this.handleExpenseCategoryChange(s)}},handleExpenseCategoryChange(t){const e=t.value,s=(window.expenseCategories||[]).find(n=>n.value===e),o=document.getElementById("expense-iva"),r=document.getElementById("category-warning"),a=document.getElementById("expense-inventory-invoice");if(a&&a.checked){o.value="0",o.disabled=!0,o.classList.add("bg-slate-100","cursor-not-allowed");return}(s==null?void 0:s.type)==="stock_usado"?(o.value="0",o.disabled=!0,o.classList.add("bg-slate-100","cursor-not-allowed"),r.classList.remove("hidden")):(o.disabled=!1,o.classList.remove("bg-slate-100","cursor-not-allowed"),r.classList.add("hidden"))},openInventoryIngest(t){this.state.expenses.find(s=>s.id===t)&&(this.navigate("inventory"),this.showToast('ℹ️ Usa "Añadir Disco" para ingresar el stock de esta compra.'))},deleteExpense(t){const e=this.state.expenses.find(s=>s.id===t);if(e!=null&&e.receiptUrl){if(!confirm(`⚠️ ATENCIÓN: Este gasto tiene un recibo adjunto.

¿Estás seguro de que quieres eliminarlo?`))return;if(!confirm(`🔒 CONFIRMACIÓN LEGAL REQUERIDA

La ley exige guardar documentos contables durante 5 AÑOS.

Fecha del gasto: `+(e.fecha_factura||e.date||"Desconocida")+`
Proveedor: `+(e.proveedor||"Sin nombre")+`
Monto: `+this.formatCurrency(e.monto_total||e.amount||0)+`

¿CONFIRMAS que deseas eliminar permanentemente este registro y su recibo?`)){this.showToast("ℹ️ Eliminación cancelada");return}}else if(!confirm("¿Eliminar esta compra?"))return;C.collection("expenses").doc(t).delete().then(()=>{this.showToast("✅ Compra eliminada"),this.loadData()}).catch(s=>console.error(s))},async downloadReceiptsZip(){const t=new Date,e=t.getFullYear(),s=t.getMonth(),o=this.state.expenses.filter(r=>{const a=new Date(r.fecha_factura||r.date);return a.getFullYear()===e&&a.getMonth()===s&&r.receiptUrl});if(o.length===0){this.showToast("ℹ️ No hay comprobantes con recibo este mes");return}this.showToast(`📦 Preparando ZIP con ${o.length} comprobantes...`);try{const r=new JSZip,a=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],n=`Comprobantes_${e}_${String(s+1).padStart(2,"0")}_${a[s]}`,i=r.folder(n);let l=`RESUMEN DE COMPROBANTES - ${a[s]} ${e}
`;l+=`${"=".repeat(50)}

`,l+=`Generado: ${t.toLocaleString("es-ES")}
`,l+=`Total comprobantes: ${o.length}
`,l+=`Total gastos: ${this.formatCurrency(o.reduce((v,h)=>v+(h.monto_total||h.amount||0),0))}
`,l+=`Total IVA: ${this.formatCurrency(o.reduce((v,h)=>v+(h.monto_iva||0),0))}

`,l+=`${"=".repeat(50)}

`,l+=`DETALLE:

`;let c=0,p=0;for(let v=0;v<o.length;v++){const h=o[v],w=new Date(h.fecha_factura||h.date).toISOString().split("T")[0],u=(h.proveedor||"SinNombre").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,"").replace(/\s+/g,"-").substring(0,20).trim(),g=Math.round(h.monto_total||h.amount||0);let $="jpg";h.receiptUrl.includes(".pdf")?$="pdf":h.receiptUrl.includes(".png")&&($="png");const E=`${String(v+1).padStart(3,"0")}_${w}_${u}_${g}DKK.${$}`;try{const S=await fetch(h.receiptUrl);if(!S.ok)throw new Error("Fetch failed");const I=await S.blob();i.file(E,I),c++,l+=`${String(v+1).padStart(3,"0")}. ${w} | ${u}
`,l+=`    Total: ${this.formatCurrency(h.monto_total||h.amount||0)} | IVA: ${this.formatCurrency(h.monto_iva||0)}
`,l+=`    Archivo: ${E}

`}catch(S){console.warn(`Could not fetch receipt for ${h.proveedor}:`,S),p++,l+=`${String(v+1).padStart(3,"0")}. ${w} | ${u} - ⚠️ ERROR: No se pudo descargar

`}}i.file("_INDICE.txt",l);const b=await r.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}}),d=`${n}.zip`;saveAs(b,d),p>0?this.showToast(`⚠️ ZIP generado: ${c} OK, ${p} con error`):this.showToast(`✅ ZIP descargado: ${c} comprobantes`)}catch(r){console.error("ZIP generation error:",r),this.showToast("❌ Error al generar ZIP")}},async handleReceiptUpload(t){const e=t.files[0];if(!e)return;const s=document.getElementById("upload-placeholder"),o=document.getElementById("upload-preview"),r=document.getElementById("receipt-preview-img"),a=document.getElementById("receipt-filename"),n=document.getElementById("receipt-url");s.innerHTML='<i class="ph-duotone ph-spinner text-4xl text-brand-orange animate-spin mb-2"></i><p class="text-sm text-slate-500">Subiendo...</p>';try{const i=e.name.split(".").pop().toLowerCase(),{structuredPath:l,structuredFilename:c}=this.generateReceiptPath(i),b=firebase.storage().ref().child(l);await b.put(e);const d=await b.getDownloadURL();if(n.value=d,document.getElementById("receipt-url").dataset.structuredPath=l,document.getElementById("receipt-url").dataset.structuredFilename=c,e.type.startsWith("image/"))r.src=URL.createObjectURL(e),r.classList.remove("hidden");else if(e.type==="application/pdf"){r.src="",r.classList.add("hidden");const v=r.parentNode.querySelector(".ph-file-pdf");v&&v.remove();const h=document.createElement("i");h.className="ph-duotone ph-file-pdf text-6xl text-red-500 mb-2 block mx-auto",r.parentNode.insertBefore(h,r)}a.textContent=c,s.classList.add("hidden"),o.classList.remove("hidden"),s.innerHTML=`
                <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                    Subir Factura/Recibo
                </p>
                <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
            `,this.showToast("✅ Archivo subido correctamente")}catch(i){console.error("Upload error details:",i),alert("Error al subir: "+i.message),s.innerHTML=`
                <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                    Subir Factura/Recibo
                </p>
                <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
            `,this.showToast("❌ Error: "+i.message)}},generateReceiptPath(t){var e,s;try{const o=new Date,r=o.getFullYear(),a=o.getMonth()+1,n=o.getDate(),i=((e=document.getElementById("expense-proveedor"))==null?void 0:e.value)||"Proveedor",l=((s=document.getElementById("expense-monto"))==null?void 0:s.value)||"0",c=i.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,"").replace(/\s+/g,"-").substring(0,20).trim()||"Proveedor",p=Math.round(parseFloat(l)||0)+"dkk",b=Math.random().toString(36).substring(2,7).toUpperCase(),v=`${`${r}-${String(a).padStart(2,"0")}-${String(n).padStart(2,"0")}`}_${c}_${p}_${b}.${t}`,h=`receipts/${v}`;return console.log("📁 Structured Receipt Path:",h),{structuredPath:h,structuredFilename:v}}catch(o){console.error("Error in generateReceiptPath:",o);const r=`receipt_${Date.now()}.${t}`;return{structuredPath:`receipts/${r}`,structuredFilename:r}}},async processReceiptOCR(t){var e,s;try{const o=document.getElementById("expense-form-title"),r=o.innerHTML;o.innerHTML='<i class="ph-duotone ph-scan text-brand-orange animate-pulse"></i> Escaneando recibo...';const a=new FormData;a.append("url",t),a.append("language","dan"),a.append("isOverlayRequired","false"),a.append("OCREngine","2"),a.append("scale","true"),a.append("isTable","false");const i=await(await fetch("https://api.ocr.space/parse/image",{method:"POST",headers:{apikey:Ve},body:a})).json();if(i.IsErroredOnProcessing)throw new Error(i.ErrorMessage||"OCR processing failed");const l=((s=(e=i.ParsedResults)==null?void 0:e[0])==null?void 0:s.ParsedText)||"";console.log("OCR Raw Text:",l);const c=this.parseReceiptText(l);this.autoFillExpenseForm(c),o.innerHTML='<i class="ph-duotone ph-check-circle text-green-500"></i> Datos extraídos - verifica';const p=Object.values(c).filter(b=>b).length;p>=3?this.showToast("✨ Datos extraídos correctamente"):p>0?this.showToast("⚠️ Algunos datos extraídos - completa manualmente"):(this.showToast("ℹ️ No se detectaron datos - ingresa manualmente"),o.innerHTML=r)}catch(o){console.error("OCR Error:",o),this.showToast("⚠️ OCR no disponible - ingresa datos manualmente");const r=document.getElementById("expense-form-title");r.innerHTML='<i class="ph-duotone ph-plus-circle text-brand-orange"></i> Nueva Compra'}},fileToBase64(t){return new Promise((e,s)=>{const o=new FileReader;o.onload=()=>e(o.result),o.onerror=s,o.readAsDataURL(t)})},parseReceiptText(t){const e={fecha:null,proveedor:null,monto_total:null,monto_iva:null},s=t.replace(/\r\n/g,`
`).replace(/\s+/g," "),o=t.split(/\r?\n/).map(c=>c.trim()).filter(c=>c),r=[/(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/,/(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2})/,/(\d{1,2}\.\s?\w+\.?\s?\d{2,4})/i];for(const c of r){const p=s.match(c);if(p){e.fecha=this.normalizeDate(p[1]);break}}const a=[/(?:i\s*alt|total|sum|totalt|att\s*betala)[:\s]*(\d+[.,]\d{2})/i,/(?:total|sum)[:\s]*(?:kr\.?|dkk)?\s*(\d+[.,]\d{2})/i,/(\d+[.,]\d{2})\s*(?:dkk|kr)/i];for(const c of a){const p=s.match(c);if(p){e.monto_total=parseFloat(p[1].replace(",","."));break}}const n=[/(?:moms|25%|heraf\s*moms)[:\s]*(\d+[.,]\d{2})/i,/(?:vat|iva|tax)[:\s]*(\d+[.,]\d{2})/i,/moms\s*(?:kr\.?|dkk)?\s*(\d+[.,]\d{2})/i];for(const c of n){const p=s.match(c);if(p){e.monto_iva=parseFloat(p[1].replace(",","."));break}}e.monto_total&&!e.monto_iva&&(e.monto_iva=Math.round(e.monto_total*.2*100)/100);const i=["kvittering","receipt","bon","faktura","invoice","kopi","copy"];for(const c of o.slice(0,5)){const p=c.trim();if(p.length>2&&p.length<50&&!i.some(b=>p.toLowerCase().includes(b))&&!/^\d+$/.test(p)&&!/^[\d\s\-\/\.]+$/.test(p)){e.proveedor=p;break}}const l=s.match(/(?:cvr|org\.?\s*nr)[:\s]*(\d{8})/i);if(l&&o.length>0){const c=o.findIndex(p=>p.includes(l[0]));c>0&&!e.proveedor&&(e.proveedor=o[c-1])}return console.log("Parsed Receipt Data:",e),e},normalizeDate(t){try{const s=t.replace(/\s/g,"").replace(/[\.\/]/g,"-").split("-");if(s.length>=3){let o,r,a;return s[0].length===4?[a,r,o]=s:([o,r,a]=s,a.length===2&&(a="20"+a)),o=o.padStart(2,"0"),r=r.padStart(2,"0"),`${a}-${r}-${o}`}}catch{console.warn("Date normalization failed:",t)}return null},autoFillExpenseForm(t){if(t.fecha){const e=document.getElementById("expense-fecha");e&&(e.value=t.fecha,this.highlightAutoFilled(e))}if(t.proveedor){const e=document.getElementById("expense-proveedor");e&&(e.value=t.proveedor,this.highlightAutoFilled(e))}if(t.monto_total){const e=document.getElementById("expense-monto");e&&(e.value=t.monto_total.toFixed(2),this.highlightAutoFilled(e))}if(t.monto_iva){const e=document.getElementById("expense-iva");e&&!e.disabled&&(e.value=t.monto_iva.toFixed(2),this.highlightAutoFilled(e))}},highlightAutoFilled(t){t.classList.add("ring-2","ring-green-400","bg-green-50");const e=()=>{t.classList.remove("ring-2","ring-green-400","bg-green-50"),t.removeEventListener("focus",e)};t.addEventListener("focus",e),setTimeout(e,5e3)},clearReceiptUpload(){document.getElementById("receipt-file").value="",document.getElementById("receipt-url").value="",document.getElementById("upload-placeholder").classList.remove("hidden"),document.getElementById("upload-preview").classList.add("hidden"),document.getElementById("receipt-preview-img").src="",document.getElementById("receipt-filename").textContent=""},renderConsignments(t){if(!t)return;const e=`
    <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6 animate-fadeIn" >
                                                                    <div class="flex justify-between items-center mb-8">
                                                                        <h2 class="font-display text-2xl font-bold text-brand-dark">Socios y Consignación</h2>
                                                                        <button onclick="app.openAddConsignorModal()" class="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                                            <i class="ph-bold ph-plus"></i>
                                                                            Nuevo Socio
                                                                        </button>
                                                                    </div>

                                                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        ${this.state.consignors.map(s=>{const o=s.name,a=this.state.inventory.filter(p=>p.owner===o).reduce((p,b)=>p+b.stock,0),n=[];this.state.sales.forEach(p=>{(p.items||[]).filter(d=>{if((d.owner||"").toLowerCase()===o.toLowerCase())return!0;const v=this.state.inventory.find(h=>h.id===(d.productId||d.recordId));return v&&(v.owner||"").toLowerCase()===o.toLowerCase()}).forEach(d=>{const v=Number(d.priceAtSale||d.unitPrice||0),h=s.agreementSplit||s.split||70,f=v*h/100;n.push({...d,id:p.id,date:p.date,cost:d.costAtSale||d.cost||f,payoutStatus:p.payoutStatus||"pending",payoutDate:p.payoutDate||null})}),(!p.items||p.items.length===0)&&(p.owner||"").toLowerCase()===o.toLowerCase()&&n.push({...p,album:p.album||p.sku||"Record",cost:p.cost||(Number(p.total)||0)*(s.agreementSplit||70)/100})}),n.sort((p,b)=>new Date(b.date)-new Date(p.date)),n.reduce((p,b)=>p+(Number(b.qty||b.quantity)||1),0);const i=n.reduce((p,b)=>p+(Number(b.cost)||0),0),l=n.filter(p=>p.payoutStatus==="paid").reduce((p,b)=>p+(Number(b.cost)||0),0),c=i-l;return`
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div class="flex justify-between items-start mb-6">
                                <div>
                                    <h3 class="font-display text-xl font-bold text-brand-dark">${s.name}</h3>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">${s.agreementSplit||s.split||70}% Acuerdo</span>
                                    </div>
                                </div>
                                <button onclick="app.deleteConsignor('${s.id}')" class="text-slate-300 hover:text-red-400 transition-colors">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Stock Actual</p>
                                    <p class="font-display font-bold text-xl text-brand-dark">${a}</p>
                                </div>
                                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Pendiente Pago</p>
                                    <p class="font-display font-bold text-xl ${c>0?"text-brand-orange":"text-slate-500"}">${this.formatCurrency(c)}</p>
                                </div>
                            </div>

                            <div class="border-t border-slate-100 pt-4">
                                <div class="flex justify-between items-center mb-4">
                                    <h4 class="font-bold text-sm text-brand-dark">Historial de Ventas</h4>
                                    <span class="text-xs text-slate-500 font-medium">Pagado: ${this.formatCurrency(l)}</span>
                                </div>
                                <div class="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                    ${n.length>0?n.map(p=>`
                                        <div class="flex items-center justify-between p-3 rounded-xl border ${p.payoutStatus==="paid"?"bg-slate-50 border-slate-100 opacity-60":"bg-white border-orange-100 shadow-sm"} transition-all">
                                            <div class="flex-1 min-w-0 pr-3">
                                                <div class="font-bold text-xs truncate text-brand-dark">${p.album||p.sku}</div>
                                                <div class="text-[10px] text-slate-400">${this.formatDate(p.date)} • ${this.formatCurrency(p.cost)}</div>
                                                ${p.payoutStatus==="paid"&&p.payoutDate?`<div class="text-[9px] text-green-600 font-bold mt-0.5"><i class="ph-bold ph-check"></i> Pagado: ${this.formatDate(p.payoutDate)}</div>`:""}
                                            </div>
                                            <button 
                                                onclick="app.togglePayoutStatus('${p.id}', '${p.payoutStatus||"pending"}')"
                                                class="shrink-0 h-8 px-3 rounded-lg text-[10px] font-bold border transition-colors ${p.payoutStatus==="paid"?"bg-slate-200 border-slate-300 text-slate-500 hover:bg-slate-300":"bg-green-100 border-green-200 text-green-700 hover:bg-green-200"}"
                                            >
                                                ${p.payoutStatus==="paid"?"PAGADO":"PAGAR"}
                                            </button>
                                        </div>
                                    `).join(""):'<div class="text-center py-4 text-xs text-slate-400 italic">No hay ventas registradas</div>'}
                                </div>
                            </div>
                        </div>
                        `}).join("")}
                                                                        ${this.state.consignors.length===0?`
                        <div class="col-span-full text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <i class="ph-bold ph-users text-3xl"></i>
                            </div>
                            <h3 class="text-lg font-bold text-brand-dark mb-2">No hay socios registrados</h3>
                            <p class="text-slate-500 mb-6 max-w-md mx-auto">Agrega socios para gestionar ventas en consignación y calcular pagos automáticamente.</p>
                            <button onclick="app.openAddConsignorModal()" class="text-brand-orange font-bold hover:underline">Agregar primer socio</button>
                        </div>
                    `:""}
                                                                    </div>
                                                                </div>
    `;t.innerHTML=e},togglePayoutStatus(t,e){if(!confirm(`¿Marcar esta venta como ${e==="paid"?"PENDIENTE":"PAGADA"}?`))return;const s=e==="paid"?"pending":"paid",o={payoutStatus:s};s==="paid"?o.payoutDate=new Date().toISOString():o.payoutDate=null,C.collection("sales").doc(t).update(o).then(()=>{this.showToast(s==="paid"?"✅ Venta marcada como PAGADA":"✅ Venta marcada como PENDIENTE"),this.loadData()}).catch(r=>{console.error(r),this.showToast("❌ Error al actualizar: "+r.message,"error")})},openAddConsignorModal(){document.body.insertAdjacentHTML("beforeend",`
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

`)},handleAddConsignor(t){t.preventDefault();const e=new FormData(t.target),s={name:e.get("name"),agreementSplit:parseFloat(e.get("split")),email:e.get("email"),phone:e.get("phone")};C.collection("consignors").add(s).then(()=>{this.showToast("✅ Socio registrado correctamente"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>{console.error(o),this.showToast("❌ Error al crear socio: "+o.message,"error")})},deleteConsignor(t){confirm("¿Eliminar este socio?")&&C.collection("consignors").doc(t).delete().then(()=>{this.showToast("✅ Socio eliminado"),this.loadData()}).catch(e=>{console.error(e),this.showToast("❌ Error al eliminar socio: "+e.message,"error")})},saveData(){try{const t={};localStorage.setItem("el-cuartito-settings",JSON.stringify(t))}catch(t){console.error("Error saving settings:",t)}},searchDiscogs(){const t=document.getElementById("discogs-search-input").value,e=document.getElementById("discogs-results");if(t){if(e.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Buscando en Discogs...</p>',e.classList.remove("hidden"),/^\d+$/.test(t.trim())){this.fetchDiscogsById(t.trim());return}fetch(`${R}/discogs/search?q=${encodeURIComponent(t)}`).then(s=>{if(!s.ok)throw new Error(`Error ${s.status}`);return s.json()}).then(s=>{const o=s.results||[];o.length>0?e.innerHTML=o.slice(0,10).map(r=>`
                        <div onclick='app.handleDiscogsSelection(${JSON.stringify(r).replace(/'/g,"&#39;")})' class="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-brand-orange hover:shadow-sm transition-all">
                            <img src="${r.thumb||"logo.jpg"}" class="w-12 h-12 rounded object-cover bg-slate-100 flex-shrink-0">
                            <div class="flex-1 min-w-0">
                                <p class="font-bold text-xs text-brand-dark leading-tight mb-1">${r.title}</p>
                                <p class="text-[10px] text-slate-500">${r.year||"?"} · ${r.format?r.format.join(", "):"Vinyl"} · ${r.country||""}</p>
                                <p class="text-[10px] text-slate-400">${r.label?r.label[0]:""}</p>
                            </div>
                            <i class="ph-bold ph-plus-circle text-brand-orange text-lg flex-shrink-0"></i>
                        </div>
                    `).join(""):e.innerHTML='<p class="text-xs text-slate-400 p-2">No se encontraron resultados.</p>'}).catch(s=>{console.error(s),e.innerHTML=`
                    <div class="text-center py-4 px-3">
                        <p class="text-xs text-red-500 font-bold mb-2">❌ ${s.message}</p>
                        <p class="text-[10px] text-slate-400">Hubo un error al buscar en Discogs a través del servidor.</p>
                    </div>
                `})}},resyncMusic(){["input-discogs-id","input-discogs-release-id","input-discogs-url","input-cover-image"].forEach(o=>{const r=document.getElementById(o);r&&(r.value="")});const t=document.querySelector('input[name="artist"]').value,e=document.querySelector('input[name="album"]').value,s=document.getElementById("discogs-search-input");s&&t&&e?(s.value=`${t} - ${e}`,this.searchDiscogs(),this.showToast("✅ Música desvinculada. Selecciona una nueva edición.","success")):this.showToast("⚠️ Falta Artista o Álbum para buscar.","error")},handleDiscogsSelection(t){const e=document.getElementById("discogs-results");e&&e.classList.add("hidden");const s=t.title.split(" - "),o=s[0]||"",r=s.slice(1).join(" - ")||t.title,a=document.querySelector("#modal-overlay form");if(!a)return;if(a.publish_discogs&&!a.publish_discogs.checked&&(a.publish_discogs.checked=!0),a.artist&&(a.artist.value=o),a.album&&(a.album.value=r),a.year&&t.year&&(a.year.value=t.year),t.thumb||t.cover_image){const i=t.cover_image||t.thumb,l=document.getElementById("input-cover-image"),c=document.getElementById("cover-preview");if(l&&(l.value=i),c){const p=c.querySelector("img"),b=document.getElementById("cover-placeholder");p&&(p.src=i,p.classList.remove("hidden")),b&&b.classList.add("hidden")}}const n=document.getElementById("input-discogs-id");if(n&&t.id&&(n.value=t.id),t.uri||t.resource_url){const i=t.uri||t.resource_url,l=i.startsWith("http")?i:"https://www.discogs.com"+i,c=document.getElementById("input-discogs-url");c&&(c.value=l)}if(t.id){const i=document.getElementById("discogs-metadata-area"),l=document.getElementById("metadata-tracks"),c=document.getElementById("metadata-tags"),p=document.getElementById("discogs-link");console.log("Metadata Area Found:",!!i),i&&(i.classList.remove("hidden"),i.style.display="grid"),l&&(l.innerHTML='<p class="text-[10px] text-slate-400 animate-pulse">Loading tracks...</p>'),this.showToast("⏳ Cargando detalles...","info"),fetch(`${R}/discogs/release/${t.id}`).then(b=>b.json()).then(b=>{const d=b.release||b;if(console.log("Full Release Data:",d),i&&(i.classList.remove("hidden"),i.style.display="grid"),p&&d.uri){const f=d.uri.startsWith("http")?d.uri:"https://www.discogs.com"+d.uri;p.href=f,p.classList.remove("hidden"),p.style.display="flex"}const v=d.styles||[],h=[...new Set(v)];c&&(c.innerHTML=h.map(f=>`<span class="meta-chip border border-slate-200">${f}</span>`).join(""));for(let f=0;f<Math.min(h.length,3);f++){const w=document.getElementById(`genre-${f+1}`);w&&(w.value=h[f])}if(l)if(d.tracklist&&d.tracklist.length>0){const f=document.getElementById("input-tracks");f&&(f.value=JSON.stringify(d.tracklist)),l.innerHTML=d.tracklist.map(w=>`
                                <div class="track-item flex justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
                                    <span class="font-bold w-6 opacity-40 shrink-0 capitalize text-[9px]">${w.position||"•"}</span>
                                    <span class="flex-1 truncate font-medium text-slate-600 text-[10px]">${w.title}</span>
                                    <span class="opacity-40 text-[9px] font-mono shrink-0">${w.duration||""}</span>
                                </div>
                            `).join("")}else l.innerHTML='<p class="text-[10px] text-slate-400 italic">No tracks found.</p>';a.label&&d.labels&&d.labels.length>0&&(a.label.value=d.labels[0].name)}).catch(b=>{console.error("Error fetching full release:",b),l&&(l.innerHTML='<p class="text-[10px] text-red-400">Error loading tracklist.</p>')})}},openTracklistModal(t){const e=this.state.inventory.find(a=>a.sku===t);if(!e)return;let s=e.discogsId;document.body.insertAdjacentHTML("beforeend",`
                                                                <div id="tracklist-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-fadeIn">
                                                                        <h3 class="font-display text-xl font-bold text-brand-dark mb-4">Lista de Temas (Tracklist)</h3>
                                                                        <div class="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                                                            <i class="ph-bold ph-spinner animate-spin text-4xl text-brand-orange"></i>
                                                                            <p class="font-medium">Cargando tracks desde Discogs...</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `);const r=a=>{fetch(`${R}/discogs/release/${a}`).then(n=>{if(!n.ok)throw new Error("Release not found");return n.json()}).then(n=>{const l=(n.release||n).tracklist||[],c=l.map(b=>`
                                                                <div class="flex items-center justify-between py-3 border-b border-slate-50 hover:bg-slate-50 px-2 transition-colors rounded-lg group">
                                                                    <div class="flex items-center gap-3">
                                                                        <span class="text-xs font-mono font-bold text-slate-400 w-8">${b.position}</span>
                                                                        <span class="text-sm font-bold text-brand-dark group-hover:text-brand-orange transition-colors">${b.title}</span>
                                                                    </div>
                                                                    <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">${b.duration||"--:--"}</span>
                                                                </div>
                                                                `).join(""),p=`
                                                                <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative animate-fadeIn max-h-[85vh] flex flex-col overflow-hidden">
                                                                    <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                                                                        <div>
                                                                            <h3 class="font-display text-xl font-bold text-brand-dark">Lista de Temas</h3>
                                                                            <p class="text-xs text-slate-500">${e.artist} - ${e.album}</p>
                                                                        </div>
                                                                        <button onclick="document.getElementById('tracklist-overlay').remove()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-brand-dark flex items-center justify-center transition-colors">
                                                                            <i class="ph-bold ph-x text-lg"></i>
                                                                        </button>
                                                                    </div>
                                                                    <div class="p-4 overflow-y-auto custom-scrollbar flex-1">
                                                                        ${l.length>0?c:'<p class="text-center text-slate-500 py-8">No se encontraron temas para esta edición.</p>'}
                                                                    </div>
                                                                    <div class="p-3 bg-slate-50 text-center shrink-0 border-t border-slate-100">
                                                                        <a href="https://www.discogs.com/release/${a}" target="_blank" class="text-xs font-bold text-brand-orange hover:underline flex items-center justify-center gap-1">
                                                                            Ver release completo en Discogs <i class="ph-bold ph-arrow-square-out"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                `;document.getElementById("tracklist-overlay").innerHTML=p}).catch(n=>{console.error(n),document.getElementById("tracklist-overlay").innerHTML=`
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
                                                                `})};if(s)r(s);else{const a=`${e.artist} - ${e.album}`;fetch(`${R}/discogs/search?q=${encodeURIComponent(a)}`).then(n=>n.json()).then(n=>{if(n.results&&n.results.length>0)r(n.results[0].id);else throw new Error("No results found in fallback search")}).catch(()=>{document.getElementById("tracklist-overlay").innerHTML=`
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
                    `})}},renderDiscogsSales(t){const e=this.state.sales.filter(l=>l.channel==="discogs"),s=l=>parseFloat(l.total)||0,o=l=>parseFloat(l.originalTotal)||parseFloat(l.total)+(parseFloat(l.discogsFee||0)+parseFloat(l.paypalFee||0)),r=l=>o(l)-s(l),a=e.reduce((l,c)=>l+s(c),0),n=e.reduce((l,c)=>l+r(c),0),i=e.reduce((l,c)=>{const p=s(c);let b=0;return c.items&&Array.isArray(c.items)&&(b=c.items.reduce((d,v)=>{const h=parseFloat(v.costAtSale||0),f=parseInt(v.qty||v.quantity)||1;return d+h*f},0)),l+(p-b)},0);t.innerHTML=`
        <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="font-display text-3xl font-bold text-brand-dark mb-2">💿 Ventas Discogs</h1>
                    <p class="text-slate-500">Ventas realizadas a través de Discogs Marketplace</p>
                </div>
                <div class="bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-2xl shadow-xl">
                    <div class="text-sm font-medium opacity-90">Ingresos Netos (Caja)</div>
                    <div class="text-3xl font-bold">${this.formatCurrency(a)}</div>
                    <div class="text-xs opacity-75">${e.length} ventas registradas</div>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-brand-dark">${e.length}</div>
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
                            <div class="text-2xl font-bold text-red-600">${this.formatCurrency(n)}</div>
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
                            <div class="text-2xl font-bold text-green-600">${this.formatCurrency(i)}</div>
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
                
                ${e.length===0?`
                    <div class="p-12 text-center">
                        <i class="ph-duotone ph-vinyl-record text-6xl text-slate-300 mb-4"></i>
                        <p class="text-slate-400 mb-4">No hay ventas de Discogs detectadas aún</p>
                        <p class="text-sm text-slate-500">Las ventas se detectan automáticamente al sincronizar con Discogs</p>
                        <button onclick="app.syncWithDiscogs()" class="mt-4 bg-purple-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-600 transition-colors">
                            Sincronizar ahora
                        </button>
                    </div>
                `:`
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
                                ${e.map(l=>{var p;const c=(p=l.timestamp)!=null&&p.toDate?l.timestamp.toDate():l.date?new Date(l.date):new Date(0);return{...l,_sortDate:c.getTime()}}).sort((l,c)=>c._sortDate-l._sortDate).map(l=>{var h;const c=(h=l.timestamp)!=null&&h.toDate?l.timestamp.toDate():new Date(l.date),p=l.items&&l.items[0],b=l.originalTotal||l.total+(l.discogsFee||0)+(l.paypalFee||0);l.discogsFee,l.paypalFee;const d=l.total,v=l.status==="pending_review"||l.needsReview;return`
                                        <tr class="border-b border-slate-50 hover:bg-purple-50/30 transition-colors cursor-pointer ${v?"bg-orange-50/50":""}" onclick="app.openUnifiedOrderDetailModal('${l.id}')">
                                            <td class="px-6 py-4 text-sm text-slate-600">${c.toLocaleDateString("es-ES")}</td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[200px]">${(p==null?void 0:p.album)||"Producto"}</div>
                                                <div class="text-xs text-slate-500">${(p==null?void 0:p.artist)||"-"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-xs text-slate-500">Precio Lista: <span class="font-bold text-slate-700">${this.formatCurrency(b)}</span></div>
                                                ${l.discogs_order_id?`<div class="text-[10px] text-purple-600 font-medium">Order: ${l.discogs_order_id}</div>`:""}
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-[10px] text-red-500 font-bold">Total Fees: -${this.formatCurrency(b-d)}</div>
                                                <div class="text-[10px] text-slate-400 font-medium">
                                                    ${b>0?`(${((b-d)/b*100).toFixed(1)}%)`:""}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm font-bold text-brand-dark">${this.formatCurrency(d)}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="flex flex-col gap-2">
                                                    ${v?`
                                                        <span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider text-center">Pendiente</span>
                                                    `:`
                                                        <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider text-center">Confirmado</span>
                                                    `}
                                                    <button onclick="app.openUpdateSaleValueModal('${l.id}', ${b}, ${d})" class="w-full py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1">
                                                        <i class="ph-bold ph-pencil-simple"></i> Editar Neto
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `}).join("")}
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
        `},openUpdateSaleValueModal(t,e){const s=`
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

                        <form onsubmit="app.handleSaleValueUpdate(event, '${t}', ${e})">
                            <div class="space-y-6">
                                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div class="text-xs font-bold text-slate-400 uppercase mb-1">Precio Original (Bruto)</div>
                                    <div class="text-xl font-bold text-slate-600">${this.formatCurrency(e)}</div>
                                </div>

                                <div class="space-y-2">
                                    <label class="text-xs font-bold text-brand-dark uppercase">Monto Neto Recibido (PayPal)</label>
                                    <div class="relative">
                                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">kr.</span>
                                        <input type="number" name="netReceived" step="0.01" required autofocus
                                            class="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-purple-500 outline-none text-2xl font-bold text-brand-dark transition-all"
                                            placeholder="0.00" oninput="app.calculateModalFee(this.value, ${e})">
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
        `;document.body.insertAdjacentHTML("beforeend",s)},calculateModalFee(t,e){const s=parseFloat(t)||0,o=e-s,r=e>0?o/e*100:0,a=document.getElementById("modal-fee-display"),n=document.getElementById("modal-fee-value");if(o>0){a.classList.remove("hidden"),n.innerText=`- kr. ${o.toFixed(2)}`;const i=document.getElementById("modal-fee-percent");i&&(i.innerText=`${r.toFixed(1)}%`)}else a.classList.add("hidden")},async handleSaleValueUpdate(t,e,s){t.preventDefault();const r=new FormData(t.target).get("netReceived"),a=document.getElementById("update-sale-submit-btn");if(r){a.disabled=!0,a.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Guardando...';try{const n=R,i=await re.currentUser.getIdToken(),l=await fetch(`${n}/firebase/sales/${e}/value`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${i}`},body:JSON.stringify({netReceived:r})}),c=l.headers.get("content-type");if(!c||!c.includes("application/json")){const b=await l.text();throw console.error("Non-JSON response received:",b),new Error(`Server returned non-JSON response (${l.status})`)}const p=await l.json();if(p.success)this.showToast("✅ Venta actualizada y fee registrado"),document.getElementById("update-sale-modal").remove(),await this.loadData(),this.refreshCurrentView();else throw new Error(p.error||"Error al actualizar")}catch(n){console.error("Update sale error:",n),this.showToast(`❌ Error: ${n.message}`),a.disabled=!1,a.innerText="Confirmar Ajuste"}}},renderPickups(t){const e=this.state.sales.filter(n=>{var i;return n.channel==="online"&&(((i=n.shipping_method)==null?void 0:i.id)==="local_pickup"||n.shipping_cost===0&&n.status!=="failed")}),s=e.filter(n=>n.status==="completed"||n.status==="paid"||n.status==="paid_pending"),o=e.filter(n=>n.status==="ready_for_pickup"),r=e.filter(n=>n.status==="shipped"||n.status==="delivered"||n.status==="picked_up"),a=`
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
                                <p class="text-xl font-display font-bold">${s.length}</p>
                            </div>
                        </div>
                        <div class="bg-green-100 text-green-600 px-4 py-2 rounded-xl border border-green-200 flex items-center gap-3">
                            <i class="ph-fill ph-check-circle text-xl"></i>
                            <div>
                                <p class="text-[10px] uppercase font-bold leading-none">Listos</p>
                                <p class="text-xl font-display font-bold">${o.length}</p>
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
                                ${s.length===0?`
                                    <tr>
                                        <td colspan="5" class="p-12 text-center text-slate-400 italic">No hay retiros pendientes.</td>
                                    </tr>
                                `:s.map(n=>{var i,l;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${n.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${n.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${((i=n.customer)==null?void 0:i.name)||n.customerName||"Cliente"}</td>
                                        <td class="p-4 text-xs text-slate-500">${((l=n.items)==null?void 0:l.length)||0} items</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate(n.date)}</td>
                                        <td class="p-4 text-center" onclick="event.stopPropagation()">
                                            <button onclick="app.setReadyForPickup('${n.id}', event)" class="bg-brand-dark text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto">
                                                <i class="ph-bold ph-bell"></i> Notificar Listo
                                            </a>
                                        </td>
                                    </tr>
                                `}).join("")}
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
                                ${o.length===0?`
                                    <tr>
                                        <td colspan="4" class="p-12 text-center text-slate-400 italic">No hay pedidos esperando retiro.</td>
                                    </tr>
                                `:o.map(n=>{var i,l;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${n.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${n.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${((i=n.customer)==null?void 0:i.name)||n.customerName||"Cliente"}</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate((l=n.updated_at)!=null&&l.toDate?n.updated_at.toDate():n.updated_at||n.date)}</td>
                                        <td class="p-4 text-center" onclick="event.stopPropagation()">
                                            <button onclick="app.markAsDelivered('${n.id}', event)" class="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto">
                                                <i class="ph-bold ph-hand-tap"></i> Ya lo Retiró
                                            </a>
                                        </td>
                                    </tr>
                                `}).join("")}
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
                                ${r.slice(0,10).map(n=>`
                                    <tr>
                                        <td class="p-4 text-sm font-medium text-slate-400">#${n.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm text-slate-500">${n.customerName||"Cliente"}</td>
                                        <td class="p-4 text-right">
                                            <span class="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase">Entregado</span>
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;t.innerHTML=a},async setReadyForPickup(t,e){var s,o;try{const r=e||window.event,a=(s=r==null?void 0:r.target)==null?void 0:s.closest("button");if(a){a.disabled=!0;const l=a.innerHTML;a.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Notificando...'}const n=await fetch(`${R}/api/ready-for-pickup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t})}),i=await n.json();if(n.ok&&i.success){this.showToast("✅ Cliente notificado - El pedido está listo para retiro"),await this.loadData();const l=document.getElementById("unified-modal");l?(l.remove(),this.openUnifiedOrderDetailModal(t)):this.refreshCurrentView()}else throw new Error(i.error||i.message||"Error al notificar")}catch(r){console.error("Error in setReadyForPickup:",r),this.showToast("❌ Error: "+r.message,"error");const a=e||window.event,n=(o=a==null?void 0:a.target)==null?void 0:o.closest("button");n&&(n.disabled=!1,n.innerHTML='<i class="ph-bold ph-bell"></i> Notificar Listo')}},async markAsDelivered(t,e){var s;try{const o=e||window.event,r=(s=o==null?void 0:o.target)==null?void 0:s.closest("button");r&&(r.disabled=!0),await C.collection("sales").doc(t).update({status:"picked_up",fulfillment_status:"delivered",picked_up_at:firebase.firestore.FieldValue.serverTimestamp(),updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast("✅ Pedido retirado correctamente"),await this.loadData(),this.refreshCurrentView()}catch(o){this.showToast("❌ Error: "+o.message,"error")}},async deleteExpenseVAT(t){const e=this.state.expenses.find(s=>s.id===t);if(e!=null&&e.receiptUrl){if(!confirm(`⚠️ ATENCIÓN: Este gasto tiene un recibo adjunto.

¿Estás seguro de que quieres eliminarlo?`))return;if(!confirm(`🔒 CONFIRMACIÓN LEGAL REQUERIDA

La ley exige guardar documentos contables durante 5 AÑOS.

Fecha del gasto: `+(e.fecha_factura||e.date||"Desconocida")+`
Proveedor: `+(e.proveedor||"Sin nombre")+`
Monto: `+this.formatCurrency(e.monto_total||e.amount||0)+`

¿CONFIRMAS que deseas eliminar permanentemente este registro y su recibo?`)){this.showToast("ℹ️ Eliminación cancelada");return}}else if(!confirm("¿Estás seguro de que quieres eliminar este gasto?"))return;try{await C.collection("expenses").doc(t).delete(),this.showToast("✅ Gasto eliminado"),this.loadData()}catch(s){console.error("Error deleting expense:",s),this.showToast("❌ Error al eliminar gasto")}},renderVATReport(t){const e=new Date,s=Math.floor(e.getMonth()/3)+1,o=e.getFullYear(),r=this.state.vatReportQuarter!==void 0?this.state.vatReportQuarter:s,a=this.state.vatReportYear||o;let n,i;if(r===0)n=new Date(a,0,1),i=new Date(a,11,31,23,59,59);else{const x=(r-1)*3;n=new Date(a,x,1),i=new Date(a,x+3,0,23,59,59)}const l=this.state.sales.filter(x=>{var O;const T=(O=x.timestamp)!=null&&O.toDate?x.timestamp.toDate():new Date(x.timestamp||x.date);return T>=n&&T<=i});let c=[],p=[],b=[],d=0,v=0,h=0,f=0;l.forEach(x=>{var ae;const T=(ae=x.timestamp)!=null&&ae.toDate?x.timestamp.toDate():new Date(x.timestamp||x.date);(x.items||[]).forEach(L=>{const ie=L.priceAtSale||L.price||0;let de=L.costAtSale||L.cost||0;const H=L.productId||L.recordId,W=L.album;let V=L.productCondition||L.condition;if(de===0||!V){const P=this.state.inventory.find(q=>H&&(q.id===H||q.sku===H)||W&&q.album===W);P&&(de===0&&(de=P.cost||0),V||(V=P.product_condition||P.condition||"Second-hand"))}V||(V="Second-hand");const F=L.qty||L.quantity||1,U=ie*F,z=de*F;if(V==="New"){const P=U*.2;d+=P,c.push({date:T,productId:L.productId||L.album||"N/A",album:L.album||"N/A",salePrice:U,vat:P})}else{const P=U-z,q=P>0?P*.2:0;v+=q,p.push({date:T,productId:L.productId||L.album||"N/A",album:L.album||"N/A",cost:z,salePrice:U,margin:P,vat:q})}});const se=parseFloat(x.shipping_income||x.shipping||x.shipping_cost||0);if(se>0){const L=se*.2;h+=L,f+=se,b.push({date:T,orderId:x.orderNumber||(x.id&&typeof x.id=="string"?x.id.slice(-8):"N/A"),income:se,vat:L})}}),(this.state.extraIncome||[]).filter(x=>{const T=new Date(x.date);return T>=n&&T<=i}).forEach(x=>{const T=Number(x.amount)||0,O=Number(x.vatAmount)||0;d+=O,c.push({date:new Date(x.date),productId:"EXTRA",album:`💰 ${x.description||"Ingreso Extra"} (${x.category||"other"})`,salePrice:T,vat:O})});const u=d+v+h,g=this.state.expenses.filter(x=>{var se;const T=x.fecha_factura?new Date(x.fecha_factura):(se=x.timestamp)!=null&&se.toDate?x.timestamp.toDate():new Date(x.timestamp||x.date);return(x.categoria_tipo==="operativo"||x.categoria_tipo==="stock_nuevo"||x.is_vat_deductible)&&T>=n&&T<=i}),$=g.filter(x=>x.categoria!=="envios"),E=g.filter(x=>x.categoria==="envios"),S=$.reduce((x,T)=>x+(parseFloat(T.monto_iva)||0),0),I=E.reduce((x,T)=>x+(parseFloat(T.monto_iva)||0),0);E.reduce((x,T)=>x+(parseFloat(T.monto_total)||0),0);const y=(this.state.inventory||[]).filter(x=>{if(!x.item_phantom_vat||x.item_phantom_vat<=0||x.provider_origin!=="EU_B2B")return!1;const T=x.acquisition_date?new Date(x.acquisition_date):null;return T?T>=n&&T<=i:!1}),D=y.reduce((x,T)=>x+(T.item_phantom_vat||0),0),_=(this.state.inventory||[]).filter(x=>{if(!x.item_real_vat||x.item_real_vat<=0||x.provider_origin!=="DK_B2B")return!1;const T=x.acquisition_date?new Date(x.acquisition_date):null;return T?T>=n&&T<=i:!1}),M=_.reduce((x,T)=>x+(T.item_real_vat||0),0),N=u+D,Y=S+I+D+M,J=N-Y,Z={0:`Resumen anual ${a}`,1:`1 de junio, ${a}`,2:`1 de septiembre, ${a}`,3:`1 de diciembre, ${a}`,4:`1 de marzo, ${a+1}`}[r],te=`
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
                                <span class="${r===0?"bg-blue-100 text-blue-600":"bg-slate-100 text-slate-500"} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${r===0?"Anual":"Pendiente"}</span>
                            </div>
                            <p class="text-xs text-slate-400 uppercase font-bold tracking-wider mt-0.5">Régimen de IVA Dinamarca</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div class="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1">
                            <select id="vat-year-select" onchange="app.updateVATQuarter()" class="bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600 outline-none cursor-pointer">
                                ${[o,o-1,o-2].map(x=>`<option value="${x}" ${x===a?"selected":""}>${x}</option>`).join("")}
                            </select>
                            <select id="vat-quarter-select" onchange="app.updateVATQuarter()" class="bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600 outline-none cursor-pointer">
                                <option value="0" ${r===0?"selected":""}>Todo el año</option>
                                <option value="1" ${r===1?"selected":""}>Q1</option>
                                <option value="2" ${r===2?"selected":""}>Q2</option>
                                <option value="3" ${r===3?"selected":""}>Q3</option>
                                <option value="4" ${r===4?"selected":""}>Q4</option>
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
                    <div class="${J>0?"bg-red-50 border-red-100":"bg-emerald-50 border-emerald-100"} rounded-3xl p-8 border shadow-sm relative overflow-hidden group">
                        <p class="${J>0?"text-red-700/60":"text-emerald-700/60"} text-xs font-bold uppercase tracking-widest mb-4">Moms Tilsvar</p>
                        <p class="text-4xl font-display font-bold mb-2 ${J>0?"text-red-700":"text-emerald-700"}">${this.formatCurrency(J)}</p>
                        <p class="text-[11px] ${J>0?"text-red-600/70":"text-emerald-600/70"} mt-4 italic font-medium">
                            <i class="ph-bold ph-calendar"></i> Límite de pago: ${Z}
                        </p>
                    </div>

                    <!-- Tarjeta B: Salgsmoms + Rubrik A (IVA Liability Total) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Salgsmoms + Rubrik A</p>
                            <span class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-bold ph-arrow-up-right"></i></span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(N)}</p>
                        <div class="mt-3 space-y-1">
                            <p class="text-[11px] text-slate-400 font-medium">Ventas + Envíos: ${this.formatCurrency(u)}</p>
                            ${D>0?`<p class="text-[11px] text-blue-500 font-bold">Rubrik A (EU-Moms): + ${this.formatCurrency(D)}</p>`:""}
                        </div>
                    </div>

                    <!-- Tarjeta C: Købsmoms (IVA Deducible) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Købsmoms</p>
                            <span class="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-bold ph-arrow-down-left"></i></span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(Y)}</p>
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
                                        <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Monto: ${this.formatCurrency(c.reduce((x,T)=>x+T.salePrice,0))}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-lg font-bold text-blue-600">${this.formatCurrency(d)}</p>
                                        <p class="text-[10px] text-slate-400 font-bold">IVA (25%)</p>
                                    </div>
                                </div>
                                <div class="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div class="h-full bg-blue-500 rounded-full" style="width: ${u>0?d/u*100:0}%"></div>
                                </div>

                                <!-- Margin Scheme Sales -->
                                <div class="pt-4 border-t border-slate-50">
                                    <div class="flex items-center justify-between mb-1">
                                        <div>
                                            <p class="font-bold text-brand-dark">Régimen Margen (Usados)</p>
                                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Margen total: ${this.formatCurrency(p.reduce((x,T)=>x+T.margin,0))}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-amber-600">${this.formatCurrency(v)}</p>
                                            <p class="text-[10px] text-slate-400 font-bold">IVA s/Margen</p>
                                        </div>
                                    </div>
                                    ${p.some(x=>x.margin<0)?`
                                        <div class="flex items-center gap-1.5 text-red-500 text-[11px] font-bold bg-red-50 px-3 py-1.5 rounded-lg mt-2 border border-red-100/50">
                                            <i class="ph-bold ph-warning-circle"></i>
                                            Alerta: Se detectaron ventas con margen negativo.
                                        </div>
                                    `:""}
                                </div>

                                <!-- Shipping Revenue -->
                                <div class="pt-4 border-t border-slate-50">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <p class="font-bold text-brand-dark">Ingresos por Envío</p>
                                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Total cobrado: ${this.formatCurrency(f)}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-indigo-500">${this.formatCurrency(h)}</p>
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
                                        <p class="text-2xl font-display font-bold ${h-I>=0?"text-emerald-400":"text-red-400"}">
                                            ${this.formatCurrency(h-I)}
                                        </p>
                                    </div>
                                    <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">
                                        <i class="ph-bold ph-scales"></i>
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex justify-between text-xs">
                                        <span class="text-slate-400 italic">IVA Cobrado (Ingreso)</span>
                                        <span class="font-bold text-emerald-400">+ ${this.formatCurrency(h)}</span>
                                    </div>
                                    <div class="flex justify-between text-xs">
                                        <span class="text-slate-400 italic">IVA Pagado (Gasto)</span>
                                        <span class="font-bold text-red-400">- ${this.formatCurrency(I)}</span>
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
                                ${Object.entries($.reduce((x,T)=>{const O=T.categoria||"otros";return x[O]=(x[O]||0)+(parseFloat(T.monto_iva)||0),x},{})).sort((x,T)=>T[1]-x[1]).map(([x,T])=>`
                                    <div class="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <i class="ph-bold ph-tag"></i>
                                            </div>
                                            <span class="font-bold text-slate-600 capitalize text-sm">${x.replace("_"," ")}</span>
                                        </div>
                                        <span class="font-bold text-slate-900 text-sm">${this.formatCurrency(T)}</span>
                                    </div>
                                `).join("")||`
                                    <div class="p-8 text-center text-slate-400 italic text-sm">No se registraron otros gastos deducibles.</div>
                                `}
                            </div>
                        </div>

                        ${D>0?`
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
                                            <p class="text-[10px] text-blue-500 uppercase font-bold tracking-tighter">${y.length} producto${y.length>1?"s":""} EU B2B · Efecto neto: 0</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xl font-bold text-blue-700">${this.formatCurrency(D)}</p>
                                        <p class="text-[10px] text-blue-500 font-bold">± Ambos lados</p>
                                    </div>
                                </div>
                                <div class="px-5 py-2 bg-blue-100/40 border-b border-blue-100 flex gap-6 text-[10px] font-bold">
                                    <span class="text-red-500">▲ Liability: +${this.formatCurrency(D)}</span>
                                    <span class="text-emerald-600">▼ Købsmoms: -${this.formatCurrency(D)}</span>
                                    <span class="text-blue-600">= Neto: ${this.formatCurrency(0)}</span>
                                </div>
                                <div class="divide-y divide-blue-100/50 max-h-48 overflow-y-auto">
                                    ${y.map(x=>`
                                    <div class="px-5 py-3 flex items-center justify-between hover:bg-blue-100/30 transition-colors">
                                        <div>
                                            <p class="text-xs font-bold text-blue-800">${x.artist||""} — ${x.album||""}</p>
                                            <p class="text-[10px] text-blue-500">Costo: ${this.formatCurrency(x.cost||0)} · Factura: ${x.acquisition_date||"-"}</p>
                                        </div>
                                        <span class="text-xs font-bold text-blue-700">${this.formatCurrency(x.item_phantom_vat)}</span>
                                    </div>
                                    `).join("")}
                                </div>
                            </div>
                        </div>
                        `:""}

                        ${M>0?`
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
                                            <p class="text-[10px] text-emerald-500 uppercase font-bold tracking-tighter">${_.length} producto${_.length>1?"s":""} DK B2B</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xl font-bold text-emerald-700">${this.formatCurrency(M)}</p>
                                        <p class="text-[10px] text-emerald-500 font-bold">Deducción pura</p>
                                    </div>
                                </div>
                                <div class="divide-y divide-emerald-100/50 max-h-48 overflow-y-auto">
                                    ${_.map(x=>`
                                    <div class="px-5 py-3 flex items-center justify-between hover:bg-emerald-100/30 transition-colors">
                                        <div>
                                            <p class="text-xs font-bold text-emerald-800">${x.artist||""} — ${x.album||""}</p>
                                            <p class="text-[10px] text-emerald-500">Costo: ${this.formatCurrency(x.cost||0)} · Factura: ${x.acquisition_date||"-"}</p>
                                        </div>
                                        <span class="text-xs font-bold text-emerald-700">${this.formatCurrency(x.item_real_vat)}</span>
                                    </div>
                                    `).join("")}
                                </div>
                            </div>
                        </div>
                        `:""}
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
                                    ${c.length>0?c.map(x=>`
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-slate-500 tabular-nums">${x.date.toLocaleDateString("es-DK")}</td>
                                            <td class="px-6 py-4 font-bold text-brand-dark">${x.album}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-600">${this.formatCurrency(x.salePrice)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-blue-600">${this.formatCurrency(x.vat)}</td>
                                        </tr>
                                    `).join(""):`
                                        <tr><td colspan="4" class="px-6 py-12 text-center text-slate-400 italic">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-slate-50/30 font-bold">
                                    <tr class="text-brand-dark">
                                        <td colspan="3" class="px-6 py-4 text-right text-xs uppercase tracking-wider">Total IVA Estándar:</td>
                                        <td class="px-6 py-4 text-right text-lg text-blue-600">${this.formatCurrency(d)}</td>
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
                                    ${p.length>0?p.map(x=>`
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-slate-500 tabular-nums">${x.date.toLocaleDateString("es-DK")}</td>
                                            <td class="px-6 py-4 font-bold text-brand-dark">${x.album}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-400">${this.formatCurrency(x.cost)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-600">${this.formatCurrency(x.salePrice)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums ${x.margin>0?"text-emerald-600":"text-red-500"}">${this.formatCurrency(x.margin)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-amber-600">${this.formatCurrency(x.vat)}</td>
                                        </tr>
                                    `).join(""):`
                                        <tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 italic">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-slate-50/30 font-bold">
                                    <tr class="text-brand-dark">
                                        <td colspan="5" class="px-6 py-4 text-right text-xs uppercase tracking-wider">Total IVA Margen:</td>
                                        <td class="px-6 py-4 text-right text-lg text-amber-600">${this.formatCurrency(v)}</td>
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
                                    ${b.length>0?b.map(x=>`
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-slate-500 tabular-nums">${x.date.toLocaleDateString("es-DK")}</td>
                                            <td class="px-6 py-4 font-bold text-brand-dark">#${x.orderId}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-600">${this.formatCurrency(x.income)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-blue-600">${this.formatCurrency(x.vat)}</td>
                                        </tr>
                                    `).join(""):`
                                        <tr><td colspan="4" class="px-6 py-12 text-center text-slate-400 italic">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-slate-50/30 font-bold">
                                    <tr class="text-brand-dark">
                                        <td colspan="3" class="px-6 py-4 text-right text-xs uppercase tracking-wider">Total IVA Envíos:</td>
                                        <td class="px-6 py-4 text-right text-lg text-blue-600">${this.formatCurrency(h)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;t.innerHTML=te},updateVATQuarter(){const t=parseInt(document.getElementById("vat-quarter-select").value),e=parseInt(document.getElementById("vat-year-select").value);this.state.vatReportQuarter=t,this.state.vatReportYear=e,this.renderVATReport(document.getElementById("app-content"))},downloadVATAuditReport(){const t=new Date,e=Math.floor(t.getMonth()/3)+1,s=t.getFullYear(),o=this.state.vatReportQuarter||e,r=this.state.vatReportYear||s,a=(o-1)*3,n=new Date(r,a,1),i=new Date(r,a+3,0,23,59,59),l=this.state.sales.filter(y=>{var _;const D=(_=y.timestamp)!=null&&_.toDate?y.timestamp.toDate():new Date(y.timestamp||y.date);return D>=n&&D<=i}),c=[];let p=1;l.forEach(y=>{var J;const D=(J=y.timestamp)!=null&&J.toDate?y.timestamp.toDate():new Date(y.timestamp||y.date),_=D.toISOString().slice(0,10).replace(/-/g,""),M=y.channel||"N/A";(y.items||[]).forEach(G=>{const Z=G.priceAtSale||G.price||0;let Q=G.costAtSale||G.cost||0;const ee=G.productId||G.recordId,te=G.album;let x="Local_Used",T="N/A";const O=this.state.inventory.find(q=>ee&&(q.id===ee||q.sku===ee)||te&&q.album===te);O&&(Q=Q===0?O.cost||0:Q,x=O.provider_origin||"Local_Used",O.acquisition_date&&(T=new Date(O.acquisition_date).toISOString().slice(0,10)));const se=G.qty||G.quantity||1,ae=G.productCondition||"Second-hand",L=ae==="New",ie=Z*se,de=Q*se;let H,W,V;if(L)H=ie,W=ie*.2,V="Standard Rate";else{const q=ie-de;H=q>0?q:0,W=q>0?q*.2:0,V="Margin Scheme"}const F=O&&O.acquisition_date?new Date(O.acquisition_date):null,U=F&&F>=n&&F<=i,z=U&&x==="EU_B2B"&&O.item_phantom_vat||0,P=U?x==="DK_B2B"?O.item_real_vat||0:z:0;c.push({transactionId:`ECR-${_}-${String(p).padStart(4,"0")}`,date:D.toISOString().slice(0,10),channel:M,productName:`${G.album||"N/A"} - ${G.artist||"N/A"}`,sku:G.sku||ee||"N/A",providerOrigin:x,acquisitionDate:T,condition:ae,costPrice:de.toFixed(2),salesPrice:ie.toFixed(2),calculationBasis:H.toFixed(2),schemeApplied:V,outputVat:W.toFixed(2),euPhantomVat:z.toFixed(2),inputVat:P.toFixed(2)}),p++});const Y=parseFloat(y.shipping_income||y.shipping||y.shipping_cost||0);Y>0&&(c.push({transactionId:`ECR-SHIP-${_}-${String(p).padStart(4,"0")}`,date:D.toISOString().slice(0,10),channel:M,productName:`Envío Cobrado - Orden: ${y.orderNumber||"N/A"}`,sku:"SHIPPING",providerOrigin:"N/A",acquisitionDate:"N/A",condition:"Service",costPrice:"0.00",salesPrice:Y.toFixed(2),calculationBasis:Y.toFixed(2),schemeApplied:"Standard Rate",outputVat:(Y*.2).toFixed(2),euPhantomVat:"0.00",inputVat:"0.00"}),p++)});const b=[];let d=1;this.state.expenses.filter(y=>{var M;const D=y.fecha_factura?new Date(y.fecha_factura):(M=y.timestamp)!=null&&M.toDate?y.timestamp.toDate():new Date(y.timestamp||y.date);return(y.categoria_tipo==="operativo"||y.categoria_tipo==="stock_nuevo"||y.is_vat_deductible)&&D>=n&&D<=i}).forEach(y=>{var M;const D=y.fecha_factura?new Date(y.fecha_factura):(M=y.timestamp)!=null&&M.toDate?y.timestamp.toDate():new Date(y.timestamp||y.date),_=D.toISOString().slice(0,10).replace(/-/g,"");b.push({transactionId:`ECP-EXP-${_}-${String(d).padStart(4,"0")}`,invoiceDate:D.toISOString().slice(0,10),category:y.categoria==="envios"?"Shipping Expense":"Operational Expense",vendor:y.proveedor||y.nombre||"N/A",description:y.descripcion||y.categoria||"N/A",sku:"N/A",grossAmount:parseFloat(y.monto_total||0).toFixed(2),euPhantomVat:"0.00",inputVat:parseFloat(y.monto_iva||0).toFixed(2)}),d++}),(this.state.inventory||[]).filter(y=>{if(!(y.provider_origin==="EU_B2B"||y.provider_origin==="DK_B2B"))return!1;const _=y.acquisition_date?new Date(y.acquisition_date):null;return _?_>=n&&_<=i:!1}).forEach(y=>{const D=new Date(y.acquisition_date),_=D.toISOString().slice(0,10).replace(/-/g,""),M=parseFloat(y.cost||0),N=y.provider_origin==="EU_B2B"&&y.item_phantom_vat||0,Y=y.provider_origin==="DK_B2B"?y.item_real_vat||0:N;b.push({transactionId:`ECP-INV-${_}-${String(d).padStart(4,"0")}`,invoiceDate:D.toISOString().slice(0,10),category:`Stock Import (${y.provider_origin})`,vendor:y.provider_origin,description:`${y.album||"N/A"} - ${y.artist||"N/A"}`,sku:y.sku||"N/A",grossAmount:M.toFixed(2),euPhantomVat:N.toFixed(2),inputVat:Y.toFixed(2)}),d++});const f="\uFEFF",w=(y,D)=>[y.join(","),...D.map(_=>y.map(M=>{const N=Object.keys(_)[y.indexOf(M)];return`"${String(_[N]||"").replace(/"/g,'""')}"`}).join(","))].join(`
`),u=["Transaction ID","Transaction Date","Sales Channel","Product Name","SKU / Item ID","Provider Origin","Acquisition Date","Condition","Cost Price (DKK)","Sales Price (DKK)","Calculation Basis (DKK)","VAT Scheme Applied","Output VAT / Salgsmoms (DKK)","EU Phantom VAT / Rubrik A (DKK)","Input VAT / Købsmoms (DKK)"],g=["Transaction ID","Invoice Date","Category","Vendor / Origin","Description","SKU / Item ID","Gross Amount / Cost (DKK)","EU Phantom VAT / Rubrik A (DKK)","Input VAT / Købsmoms (DKK)"],$=w(u,c),E=w(g,b),S=new Blob([f+$],{type:"text/csv;charset=utf-8;"}),I=document.createElement("a");I.href=URL.createObjectURL(S),I.download=`Sales_VAT_Ledger_Q${o}_${r}.csv`,I.style.display="none",document.body.appendChild(I),I.click(),setTimeout(()=>{const y=new Blob([f+E],{type:"text/csv;charset=utf-8;"}),D=document.createElement("a");D.href=URL.createObjectURL(y),D.download=`Purchases_VAT_Ledger_Q${o}_${r}.csv`,D.style.display="none",document.body.appendChild(D),D.click(),document.body.removeChild(I),document.body.removeChild(D),URL.revokeObjectURL(I.href),URL.revokeObjectURL(D.href)},300),this.showToast(`✅ Exported ${c.length} sales & ${b.length} purchase records.`)},renderInvestments(t){const e=["Alejo","Facundo","Rafael"],s=this.state.investments||[],o=e.reduce((n,i)=>(n[i]=s.filter(l=>l.partner===i).reduce((l,c)=>l+(parseFloat(c.amount)||0),0),n),{}),r=Object.values(o).reduce((n,i)=>n+i,0),a=`
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 pt-6">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h2 class="font-display text-3xl font-bold text-brand-dark">💰 Inversiones</h2>
                        <p class="text-slate-500 text-sm">Registro de inversiones de los socios</p>
                    </div>
                    <button onclick="app.openAddInvestmentModal()" class="bg-brand-dark text-white px-5 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg">
                        <i class="ph-bold ph-plus"></i> Nueva Inversión
                    </a>
                </div>

                <!-- Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    ${e.map(n=>`
                        <div class="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 hover:shadow-md transition-shadow">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-lg">
                                    ${n.charAt(0)}
                                </div>
                                <h3 class="font-bold text-brand-dark">${n}</h3>
                            </div>
                            <p class="text-2xl font-display font-bold text-brand-dark">${this.formatCurrency(o[n])}</p>
                            <p class="text-xs text-slate-400">${s.filter(i=>i.partner===n).length} inversiones</p>
                        </div>
                    `).join("")}
                    <div class="bg-brand-dark rounded-2xl shadow-lg p-5 text-white">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                <i class="ph-bold ph-coins"></i>
                            </div>
                            <h3 class="font-bold">Total Invertido</h3>
                        </div>
                        <p class="text-2xl font-display font-bold">${this.formatCurrency(r)}</p>
                        <p class="text-xs text-white/60">${s.length} inversiones totales</p>
                    </div>
                </div>

                <!-- Investments per Partner -->
                ${e.map(n=>{const i=s.filter(l=>l.partner===n).sort((l,c)=>new Date(c.date)-new Date(l.date));return`
                    <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden mb-6">
                        <div class="p-5 border-b border-orange-50 bg-orange-50/30 flex justify-between items-center">
                            <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                <span class="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold">${n.charAt(0)}</span>
                                ${n}
                            </h3>
                            <span class="text-lg font-display font-bold text-brand-orange">${this.formatCurrency(o[n])}</span>
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
                                    ${i.length===0?`
                                        <tr>
                                            <td colspan="4" class="p-8 text-center text-slate-400 italic">
                                                Sin inversiones registradas
                                            </td>
                                        </tr>
                                    `:i.map(l=>`
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-4 text-sm text-slate-500">${this.formatDate(l.date)}</td>
                                            <td class="p-4 text-sm font-medium text-brand-dark">${l.description}</td>
                                            <td class="p-4 text-sm font-bold text-brand-orange text-right">${this.formatCurrency(l.amount)}</td>
                                            <td class="p-4 text-center">
                                                <button onclick="app.deleteInvestment('${l.id}')" class="text-slate-400 hover:text-red-500 transition-colors">
                                                    <i class="ph-bold ph-trash"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    `}).join("")}
            </div>
        `;t.innerHTML=a},openAddInvestmentModal(){const t=["Alejo","Facundo","Rafael"],e=new Date().toISOString().split("T")[0],s=`
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
                                ${t.map(o=>`<option value="${o}">${o}</option>`).join("")}
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
                            <input type="date" name="date" required value="${e}"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-brand-orange transition-all">
                        </div>
                        <div class="flex gap-3 pt-4">
                            <button type="button" onclick="document.getElementById('add-investment-modal').remove()" 
                                class="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                Cancelar
                            </a>
                            <button type="submit" class="flex-1 py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                <i class="ph-bold ph-plus"></i> Guardar
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        `;document.body.insertAdjacentHTML("beforeend",s)},async saveInvestment(t){t.preventDefault();const e=t.target,s={partner:e.partner.value,amount:parseFloat(e.amount.value),description:e.description.value,date:e.date.value,created_at:firebase.firestore.FieldValue.serverTimestamp()};try{await C.collection("investments").add(s),document.getElementById("add-investment-modal").remove(),this.showToast("✅ Inversión registrada"),await this.loadInvestments(),this.refreshCurrentView()}catch(o){this.showToast("❌ Error: "+o.message,"error")}},async deleteInvestment(t){if(confirm("¿Eliminar esta inversión?"))try{await C.collection("investments").doc(t).delete(),this.showToast("🗑️ Inversión eliminada"),await this.loadInvestments(),this.refreshCurrentView()}catch(e){this.showToast("❌ Error: "+e.message,"error")}},async loadInvestments(){const t=await C.collection("investments").get();this.state.investments=t.docs.map(e=>({id:e.id,...e.data()}))},renderShipping(t){const e=l=>{var c;return((c=l.shipping_method)==null?void 0:c.id)==="local_pickup"||l.shipping_method&&typeof l.shipping_method=="string"&&l.shipping_method.toLowerCase().includes("pickup")||l.shippingMethod&&l.shippingMethod.toLowerCase().includes("pickup")||Number(l.shipping)===0||Number(l.shipping_cost)===0||Number(l.shipping_income)===0},s=l=>!e(l),o=l=>!["shipped","picked_up","delivered","fulfilled"].includes(l.fulfillment_status),r=this.state.sales.filter(l=>{var c;return(l.channel==="online"||((c=l.channel)==null?void 0:c.toLowerCase())==="discogs")&&e(l)&&o(l)}).sort((l,c)=>new Date(l.date)-new Date(c.date)),a=this.state.sales.filter(l=>{var c;return(l.channel==="online"||((c=l.channel)==null?void 0:c.toLowerCase())==="discogs")&&s(l)&&o(l)}).sort((l,c)=>new Date(l.date)-new Date(c.date)),n=this.state.sales.filter(l=>{var c;return(l.channel==="online"||((c=l.channel)==null?void 0:c.toLowerCase())==="discogs")&&!o(l)}).sort((l,c)=>{var p,b;return new Date((p=c.updated_at)!=null&&p.toDate?c.updated_at.toDate():c.updated_at||c.date)-new Date((b=l.updated_at)!=null&&b.toDate?l.updated_at.toDate():l.updated_at||l.date)}).slice(0,20),i=`
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
                                <p class="text-2xl font-display font-bold">${this.formatCurrency(this.state.sales.reduce((l,c)=>l+parseFloat(c.shipping||c.shipping_cost||0),0))}</p>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-2 rounded-xl shadow-sm border border-orange-100 flex items-center gap-3">
                            <i class="ph-fill ph-clock text-brand-orange text-xl"></i>
                            <div>
                                <p class="text-[10px] text-slate-400 font-bold uppercase leading-none">Pendientes</p>
                                <p class="text-xl font-display font-bold text-brand-dark">${r.length+a.length}</p>
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
                            <span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">${r.length}</span>
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
                                ${r.length>0?r.map(l=>{var g;const c=this.getCustomerInfo(l),p=l.fulfillment_status||"unfulfilled";let b=p==="unfulfilled"?`onclick="app.notifyPreparingDiscogs('${l.id}')"`:"disabled",d=p==="unfulfilled"?"bg-blue-500 text-white shadow-sm hover:bg-blue-600":p==="preparing"||p==="ready_for_pickup"?"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-75":"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-50",v=p==="preparing"?`onclick="app.notifyPickupReadyDiscogs('${l.id}')"`:"disabled",h=p==="preparing"?"bg-brand-orange text-white shadow-sm hover:bg-orange-600":p==="ready_for_pickup"?"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-75":"bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed opacity-50",f=p==="ready_for_pickup"?`onclick="app.markPickedUpDiscogs('${l.id}')"`:"disabled",u=`
                <div class="flex flex-col gap-2 relative pl-2">
                    <div class="flex items-center absolute left-0 top-4 bottom-4 py-0 w-1">
                        <div class="w-1 bg-blue-100 rounded-full h-full relative overflow-hidden">
                            <div class="w-1 bg-blue-500 rounded-full transition-all duration-300 absolute top-0" style="height: ${p==="ready_for_pickup"?"100%":p==="preparing"?"50%":"0%"}"></div>
                        </div>
                    </div>
                    
                    <button ${b} class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${d}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ${p!=="unfulfilled"&&p?"ph-check-circle text-green-500":"ph-package"} text-sm"></i> 
                            1. En preparación
                        </span>
                        ${p!=="unfulfilled"&&p?'<span class="text-[9px] uppercase font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Hecho</span>':""}
                    </button>

                    <button ${v} class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${h}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ${p==="ready_for_pickup"?"ph-check-circle text-green-500":"ph-bell-ringing"} text-sm"></i> 
                            2. Lista para pickup
                        </span>
                        ${p==="ready_for_pickup"?'<span class="text-[9px] uppercase font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Hecho</span>':""}
                    </button>

                    <button ${f} class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${p==="ready_for_pickup"?"bg-brand-dark text-white shadow-sm hover:bg-black":"bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed opacity-50"}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ph-check-circle text-sm"></i> 
                            3. Orden recogida
                        </span>
                    </button>
                </div>
            `;return`
                                    <tr class="hover:bg-blue-50/20 transition-colors">
                                        <td class="p-4 font-bold text-brand-dark">
                                            #${l.orderNumber||l.id.slice(0,6)}
                                            <div class="text-[10px] text-slate-400 font-normal mt-0.5">${this.formatDate(l.date)}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="font-bold text-sm text-brand-dark">${c.name}</div>
                                            <div class="text-xs text-slate-500 truncate max-w-[150px]" title="${c.email}">${c.email}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="flex -space-x-2 overflow-hidden">
                                                ${(l.items||[]).slice(0,3).map($=>`<img src="${$.image||$.cover_image||"https://elcuartito.dk/default-vinyl.png"}" 
                                                         class="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                                                         title="${$.album}">`).join("")}
                                                ${(l.items||[]).length>3?`<span class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] ring-2 ring-white text-slate-500 font-bold">+${l.items.length-3}</span>`:""}
                                            </div>
                                            <div class="text-[10px] text-slate-400 mt-1">${((g=l.items)==null?void 0:g.length)||0} items</div>
                                        </td>
                                        <td class="p-4 hidden md:table-cell">
                                            <span class="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                ${l.channel||"Online"}
                                            </span>
                                        </td>
                                        <td class="p-4">
                                            ${u}
                                        </td>
                                    </tr>
                                    `}).join(""):`
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
                            <span class="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">${a.length}</span>
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
                                ${a.length>0?a.map(l=>{var u;const c=this.getCustomerInfo(l),p=l.fulfillment_status||"unfulfilled";let b=p==="unfulfilled"?`onclick="app.notifyPreparingDiscogs('${l.id}')"`:"disabled",d=p==="unfulfilled"?"bg-brand-orange text-white shadow-sm hover:bg-orange-600":p==="preparing"||p==="in_transit"?"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-75":"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-50",v=p==="in_transit"?`onclick="app.markDispatchedDiscogs('${l.id}')"`:"disabled",h=p==="in_transit"?"bg-brand-dark text-white shadow-sm hover:bg-black":"bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed opacity-50",f="";p==="preparing"?f=`
                    <div class="w-full bg-orange-50 border border-orange-100 rounded-lg p-2 flex flex-col gap-2 shadow-sm relative z-10">
                        <div class="flex items-center gap-2 text-xs font-bold text-orange-800 px-1">
                            <i class="ph-bold ph-truck text-sm"></i> 2. En camino
                        </div>
                        <input type="text" id="tracking-${l.id}" placeholder="Tracking #" 
                            value="${l.tracking_number||""}"
                            class="w-full text-xs border border-orange-200 rounded px-2 py-1.5 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none font-mono">
                        <input type="text" id="tracking-link-${l.id}" placeholder="Link (Opcional)" 
                            class="w-full text-xs border border-orange-200 rounded px-2 py-1.5 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none font-mono text-slate-500">
                        <button onclick="app.notifyShippedDiscogs('${l.id}', 'tracking-${l.id}', 'tracking-link-${l.id}')" 
                                class="w-full bg-orange-600 hover:bg-orange-700 text-white px-2 py-1.5 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2">
                            <i class="ph-bold ph-paper-plane-right text-sm"></i> Enviar Tracking al cliente
                        </button>
                    </div>
                `:f=`
                    <button disabled class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${p==="in_transit"?"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-75":"bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed opacity-50"}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ${p==="in_transit"?"ph-check-circle text-green-500":"ph-truck"} text-sm"></i> 
                            2. En camino
                        </span>
                        ${p==="in_transit"?'<span class="text-[9px] uppercase font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Hecho</span>':""}
                    </button>
                `;let w=`
                <div class="flex flex-col gap-2 relative pl-2">
                    <div class="flex items-center absolute left-0 top-4 bottom-4 py-0 w-1">
                        <div class="w-1 bg-orange-100 rounded-full h-full relative overflow-hidden">
                            <div class="w-1 bg-brand-orange rounded-full transition-all duration-300 absolute top-0" style="height: ${p==="in_transit"?"100%":p==="preparing"?"50%":"0%"}"></div>
                        </div>
                    </div>

                    <button ${b} class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${d}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ${p!=="unfulfilled"&&p?"ph-check-circle text-green-500":"ph-package"} text-sm"></i> 
                            1. En preparación
                        </span>
                        ${p!=="unfulfilled"&&p?'<span class="text-[9px] uppercase font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Hecho</span>':""}
                    </button>

                    ${f}

                    <button ${v} class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${h}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ph-archive text-sm"></i> 
                            3. Orden despachada
                        </span>
                    </button>
                </div>
            `;return`
                                    <tr class="hover:bg-orange-50/20 transition-colors">
                                        <td class="p-4 font-bold text-brand-dark">
                                            #${l.orderNumber||l.id.slice(0,6)}
                                            <div class="text-[10px] text-slate-400 font-normal mt-0.5">${this.formatDate(l.date)}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="font-bold text-sm text-brand-dark">${c.name}</div>
                                            <div class="text-xs text-slate-500 truncate max-w-[150px]" title="${c.email}">${c.email}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="flex -space-x-2 overflow-hidden">
                                                ${(l.items||[]).slice(0,3).map(g=>`<img src="${g.image||g.cover_image||"https://elcuartito.dk/default-vinyl.png"}" 
                                                         class="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                                                         title="${g.album}">`).join("")}
                                                ${(l.items||[]).length>3?`<span class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] ring-2 ring-white text-slate-500 font-bold">+${l.items.length-3}</span>`:""}
                                            </div>
                                            <div class="text-[10px] text-slate-400 mt-1">${((u=l.items)==null?void 0:u.length)||0} items</div>
                                        </td>
                                        <td class="p-4 hidden md:table-cell text-xs text-slate-500">
                                            ${l.city||""}, ${l.country||"DK"}
                                        </td>
                                        <td class="p-4">
                                            ${w}
                                        </td>
                                    </tr>
                                    `}).join(""):`
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
                                ${n.map(l=>{var c;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${l.id}')" title="Ver historial">
                                        <td class="p-4 text-sm font-medium text-slate-500">
                                            #${l.orderNumber||l.id.slice(0,8)}
                                            <i class="ph-bold ph-clock-counter-clockwise text-xs ml-1 text-slate-300"></i>
                                        </td>
                                        <td class="p-4 text-xs text-slate-400">
                                            ${this.formatDate((c=l.updated_at)!=null&&c.toDate?l.updated_at.toDate():l.updated_at||l.date)}
                                        </td>
                                        <td class="p-4 text-right">
                                            <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${l.fulfillment_status==="shipped"?"bg-green-100 text-green-700":"bg-blue-100 text-blue-700"}">
                                                ${l.fulfillment_status==="shipped"?"Despachado":"Retirado"}
                                            </span>
                                        </td>
                                    </tr>
                                `}).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;t.innerHTML=i},openOrderHistoryModal(t){var l,c,p,b,d,v;const e=this.state.sales.find(h=>h.id===t);if(!e)return;const s=e.history||[],o=(l=e.timestamp)!=null&&l.toDate?e.timestamp.toDate():new Date(e.date);let r=[];s.length>0?r=s.map(h=>({status:h.status,timestamp:new Date(h.timestamp),note:h.note})).sort((h,f)=>f.timestamp-h.timestamp):r.push({status:e.fulfillment_status,timestamp:(c=e.updated_at)!=null&&c.toDate?e.updated_at.toDate():new Date,note:"Última actualización"}),r.push({status:"created",timestamp:o,note:`Orden recibida via ${e.channel||"Online"}`});const a=h=>h==="created"?"bg-slate-100 text-slate-500":h==="preparing"?"bg-blue-100 text-blue-600":h==="ready_for_pickup"?"bg-emerald-100 text-emerald-600":h==="in_transit"?"bg-orange-100 text-orange-600":h==="shipped"||h==="picked_up"?"bg-green-100 text-green-600":"bg-slate-100",n=h=>({created:"Orden Creada",preparing:"En Preparación",ready_for_pickup:"Listo para Retiro",in_transit:"En Tránsito",shipped:"Despachado",picked_up:"Retirado"})[h]||h,i=document.createElement("div");i.className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4",i.onclick=h=>{h.target===i&&i.remove()},i.innerHTML=`
            <div class="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div class="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-xl text-brand-dark">Historial de Orden</h3>
                        <p class="text-sm text-slate-500">#${e.orderNumber||e.id.slice(0,8)}</p>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <i class="ph-bold ph-x"></i>
                    </a>
                </div>
                
                <div class="p-8 max-h-[60vh] overflow-y-auto">
                    <div class="relative pl-4 border-l-2 border-slate-100 space-y-8">
                        ${r.map((h,f)=>`
                            <div class="relative">
                                <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${f===0?"bg-brand-orange ring-4 ring-orange-50":"bg-slate-300"}"></div>
                                
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-bold px-2 py-0.5 rounded-full ${a(h.status)}">
                                            ${n(h.status)}
                                        </span>
                                        <span class="text-xs text-slate-400 font-mono">
                                            ${h.timestamp.toLocaleString("es-AR",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"})}
                                        </span>
                                    </div>
                                    <p class="text-sm text-slate-600 mt-1">${h.note||"-"}</p>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                    
                    <div class="mt-8 pt-6 border-t border-slate-50 flex justify-between items-end">
                       <div class="text-xs text-slate-400">
                            Cliente: <span class="font-bold text-slate-600">${e.customerName||((p=e.customer)==null?void 0:p.name)||((b=e.customer)==null?void 0:b.firstName)+" "+((d=e.customer)==null?void 0:d.lastName)}</span><br>
                            Email: ${e.customerEmail||((v=e.customer)==null?void 0:v.email)}
                       </div>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(i)},fetchDiscogsById(t=null){const e=t||document.getElementById("discogs-search-input").value.trim(),s=document.getElementById("discogs-results");if(!e||!/^\d+$/.test(e)){this.showToast("⚠️ Ingresa un ID numérico válido","error");return}if(!localStorage.getItem("discogs_token")){this.showToast("⚠️ Token no configurado","error");return}s&&(s.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Importando Release por ID...</p>',s.classList.remove("hidden")),fetch(`${R}/discogs/release/${e}`).then(r=>{if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()}).then(r=>{var i;const a=r.release||r,n={id:a.id,title:`${a.artists_sort||((i=a.artists[0])==null?void 0:i.name)} - ${a.title}`,year:a.year,thumb:a.thumb,cover_image:a.images?a.images[0].uri:null,label:a.labels?[a.labels[0].name]:[],format:a.formats?[a.formats[0].name]:[]};this.handleDiscogsSelection(n),s&&s.classList.add("hidden"),this.showToast("✅ Datos importados con éxito")}).catch(r=>{console.error(r),this.showToast("❌ Error al importar ID: "+r.message,"error"),s&&s.classList.add("hidden")})},openBulkImportModal(){const t=document.createElement("div");t.id="bulk-import-modal",t.className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4",t.innerHTML=`
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
        `,document.body.appendChild(t)},async handleBulkImportBatch(){const t=document.getElementById("bulk-csv-data").value.trim();if(!t){this.showToast("Por favor, pega el contenido del CSV.","error");return}const e=document.getElementById("start-bulk-import-btn");e.innerHTML,e.disabled=!0,e.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> Importando...';try{const s=await fetch(`${R}/discogs/bulk-import`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({csvData:t})}),o=await s.json();s.ok&&(this.showToast(`✅ ${o.summary}`),document.getElementById("bulk-import-modal").remove(),await this.loadData(),this.refreshCurrentView())}catch(s){console.error("Bulk import error:",s),this.showToast("❌ "+s.message,"error");const o=document.getElementById("start-bulk-import-btn");o&&(o.disabled=!1,o.innerHTML='<i class="ph-bold ph-rocket-launch"></i> Comenzar Importación')}},async refreshProductMetadata(t){const e=document.getElementById("refresh-metadata-btn");if(!e)return;const s=e.innerHTML;e.disabled=!0,e.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> ...';try{let o=t;const r=this.state.inventory.find(i=>i.sku===t||i.id===t);r&&r.id&&(o=r.id);const a=await fetch(`${R}/discogs/refresh-metadata/${o}`,{method:"POST",headers:{"Content-Type":"application/json"}}),n=await a.json();if(a.ok){this.showToast("✅ Metadata actualizada correctamente");const i=document.getElementById("modal-overlay");i&&i.remove(),await this.loadData(),this.refreshCurrentView(),r&&this.openProductModal(r.sku)}else throw new Error(n.error||"Error al actualizar metadata")}catch(o){console.error("Refresh metadata error:",o),this.showToast("❌ "+o.message,"error"),e.disabled=!1,e.innerHTML=s}}};window.app=Pe;document.addEventListener("DOMContentLoaded",()=>{Pe.init()});
