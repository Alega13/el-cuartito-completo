(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const n of a.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&o(n)}).observe(document,{childList:!0,subtree:!0});function s(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(r){if(r.ep)return;r.ep=!0;const a=s(r);fetch(r.href,a)}})();const _=firebase.firestore(),Ne="2026.03.20.1";console.log("🚀 El Cuartito Admin v"+Ne+" loaded");const ee=window.auth,Ve=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1",R=Ve?"http://localhost:3001":"https://el-cuartito-shop.up.railway.app",Oe="K85403890688957",ve={async createSale(t){let e=[];if(await _.runTransaction(async s=>{const o=[];for(const l of t.items){const i=_.collection("products").doc(l.recordId||l.productId),p=await s.get(i);if(!p.exists)throw new Error(`Producto ${l.recordId} no encontrado`);const c=p.data();if(c.stock<l.quantity)throw new Error(`Stock insuficiente para ${c.artist||"Sin Artista"} - ${c.album||"Sin Album"}. Disponible: ${c.stock}`);o.push({ref:i,data:c,quantity:l.quantity,price:c.price,cost:c.cost||0,providerOrigin:c.provider_origin||"Local_Used",productCondition:l.productCondition||l.condition||c.product_condition||c.condition||"Used"})}const r=o.reduce((l,i)=>l+i.price*i.quantity,0),a=t.customTotal!==void 0?t.customTotal:r,n=_.collection("sales").doc();s.set(n,{...t,status:"completed",fulfillment_status:t.channel&&t.channel.toLowerCase()==="discogs"?"preparing":"fulfilled",total:a,date:new Date().toISOString().split("T")[0],timestamp:firebase.firestore.FieldValue.serverTimestamp(),items:o.map(l=>({productId:l.ref.id,artist:l.data.artist,album:l.data.album,sku:l.data.sku,unitPrice:l.price,costAtSale:l.cost,qty:l.quantity,providerOrigin:l.providerOrigin||"Local_Used",productCondition:l.productCondition||"Used"}))});for(const l of o){s.update(l.ref,{stock:firebase.firestore.FieldValue.increment(-l.quantity)});const i=_.collection("inventory_logs").doc();s.set(i,{type:"SOLD",sku:l.data.sku||"Unknown",album:l.data.album||"Unknown",artist:l.data.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:`Venta registrada (Admin) - Canal: ${t.channel||"Tienda"}`})}e=o.map(l=>({discogs_listing_id:l.data.discogs_listing_id,artist:l.data.artist,album:l.data.album}))}),t.channel&&t.channel.toLowerCase()==="discogs"){for(const s of e)if(s.discogs_listing_id)try{const o=await fetch(`${R}/discogs/delete-listing/${s.discogs_listing_id}`,{method:"DELETE"});o.ok?console.log(`✅ Discogs listing ${s.discogs_listing_id} deleted for ${s.artist} - ${s.album}`):console.warn(`⚠️ Could not delete Discogs listing ${s.discogs_listing_id}:`,await o.text())}catch(o){console.error(`❌ Error deleting Discogs listing ${s.discogs_listing_id}:`,o)}}},async notifyPreparing(t){const e=await ee.currentUser.getIdToken(),s=await fetch(`${R}/sales/${t}/notify-preparing`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async cancelOrder(t){const e=await ee.currentUser.getIdToken(),s=await fetch(`${R}/sales/${t}/cancel-order`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async updateTracking(t,e){const s=await ee.currentUser.getIdToken(),o=await fetch(`${R}/sales/${t}/update-tracking`,{method:"POST",headers:{Authorization:`Bearer ${s}`,"Content-Type":"application/json"},body:JSON.stringify({trackingNumber:e})});if(!o.ok)throw new Error(await o.text());return o.json()},async notifyShipped(t,e,s=null){const o=await ee.currentUser.getIdToken(),r={trackingNumber:e};s&&(r.trackingLink=s);const a=await fetch(`${R}/sales/${t}/notify-shipped`,{method:"POST",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"},body:JSON.stringify(r)});if(!a.ok)throw new Error(await a.text());return a.json()},async markDispatched(t){const e=await ee.currentUser.getIdToken(),s=await fetch(`${R}/sales/${t}/mark-dispatched`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async notifyPickupReady(t){const e=await ee.currentUser.getIdToken(),s=await fetch(`${R}/sales/${t}/notify-pickup-ready`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async markPickedUp(t){const e=await ee.currentUser.getIdToken(),s=await fetch(`${R}/sales/${t}/mark-picked-up`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()}},Se={async runSkuFix_v3(){if(!localStorage.getItem("sku_fix_run_v3")){localStorage.setItem("sku_fix_run_v3","true"),console.log("🔍 Buscando el SKU histórico más alto absoluto...");try{const t=await _.collection("products").get();let e=0;const s=/^SKU-(\d+)$/;t.docs.forEach(l=>{const i=l.data().sku;if(i){const p=i.match(s);p&&(e=Math.max(e,parseInt(p[1])))}});const o=await _.collection("sales").get();o.docs.forEach(l=>{(l.data().items||[]).forEach(p=>{const c=p.sku;if(c){const u=c.match(s);u&&(e=Math.max(e,parseInt(u[1])))}})}),console.log("✅ El SKU histórico más alto encontrado es:",e);const r=new Set;o.docs.forEach(l=>{(l.data().items||[]).forEach(i=>{i.sku&&r.add(i.sku)})});const a=[],n=t.docs.map(l=>({id:l.id,ref:l.ref,data:l.data()})).sort((l,i)=>{var p,c;return(((p=l.data.created_at)==null?void 0:p.seconds)||0)-(((c=i.data.created_at)==null?void 0:c.seconds)||0)});for(const l of n){const i=l.data.sku;i&&(r.has(i)?a.push(l):r.add(i))}if(a.length>0){console.log(`⚠️ Encontrados ${a.length} productos con SKU en conflicto. Arreglando...`);let l=e,i="";await _.runTransaction(async p=>{const c=_.collection("metadata").doc("vinylCounter");for(const u of a){l++;const d=`SKU-${String(l).padStart(3,"0")}`,y=String(l).padStart(4,"0");p.update(u.ref,{sku:d,quickId:y}),i+=`- ${u.data.album} (era ${u.data.sku}) -> ahora es ${d}
`}p.set(c,{current:l},{merge:!0})}),alert(`🛠️ Arreglo histórico completado!
Se reasignaron los SKUs que chocaban con discos viejos vendidos:

`+i+`
Por favor, recarga la página.`)}else{const l=_.collection("metadata").doc("vinylCounter"),i=await l.get(),p=i.exists&&i.data().current||0;e>p&&(await l.set({current:e},{merge:!0}),console.log(`🆙 Contador actualizado a ${e}`)),console.log("✅ No hay conflictos de SKU.")}}catch(t){console.error("❌ Error en script histórico:",t)}}},state:{inventory:[],sales:[],expenses:[],consignors:[],cart:[],viewMode:"list",selectedItems:new Set,currentView:"dashboard",filterMonths:[new Date().getMonth()],filterYear:new Date().getFullYear(),inventorySearch:"",salesHistorySearch:"",expensesSearch:"",events:[],selectedDate:new Date,vatActive:!1,manualSaleSearch:"",posCondition:"Used",posSelectedItemSku:null,orderFeedFilter:"all",filterGenre:"all",filterOwner:"all",filterLabel:"all",filterStorage:"all",filterDiscogs:"all",filterStock:"all",filterCondition:"all",filterStockTime:[],showStats:!1,showAdvancedFilters:!1,privacyMode:!1,rsdExtraDiscount:!1,dashboardAnalysisMode:"genre"},getEffectivePrice(t){return t.is_rsd_discount?Math.round(t.price*.9):t.price},async init(){this.runSkuFix_v3(),!this._initialized&&(this._initialized=!0,ee.onAuthStateChanged(async t=>{if(t)try{document.getElementById("login-view").classList.add("hidden"),document.getElementById("main-app").classList.remove("hidden"),document.getElementById("mobile-nav").classList.remove("hidden"),await this.loadData(),this._pollInterval&&clearInterval(this._pollInterval),this._pollInterval=setInterval(()=>this.loadData(),6e4),this.setupListeners(),this.setupMobileMenu(),this.setupNavigation()}catch(e){console.error("Auth token error:",e),this.logout()}else{document.getElementById("login-view").classList.remove("hidden"),document.getElementById("main-app").classList.add("hidden"),document.getElementById("mobile-nav").classList.add("hidden");const e=document.getElementById("login-btn");e&&(e.disabled=!1,e.innerHTML="<span>Entrar</span>")}}),document.addEventListener("click",t=>{const e=document.getElementById("discogs-results"),s=document.getElementById("discogs-search-input");e&&!e.contains(t.target)&&t.target!==s&&e.classList.add("hidden");const o=document.getElementById("sku-results"),r=document.getElementById("sku-search");o&&!o.contains(t.target)&&t.target!==r&&o.classList.add("hidden")}))},async handleLogin(t){t.preventDefault();const e=t.target.email.value,s=t.target.password.value,o=document.getElementById("login-error"),r=document.getElementById("login-btn");o.classList.add("hidden"),r.disabled=!0,r.innerHTML="<span>Cargando...</span>";try{await ee.signInWithEmailAndPassword(e,s)}catch(a){console.error("Login error:",a),o.innerText="Error: "+a.message,o.classList.remove("hidden"),r.disabled=!1,r.innerHTML='<span>Ingresar</span><i class="ph-bold ph-arrow-right"></i>'}},async updateFulfillmentStatus(t,e,s){var o,r,a;try{const n=((o=t==null?void 0:t.target)==null?void 0:o.closest("button"))||((a=(r=window.event)==null?void 0:r.target)==null?void 0:a.closest("button"));if(n){n.disabled=!0;const l=n.innerHTML;n.innerHTML='<i class="ph ph-circle-notch animate-spin"></i>'}await _.collection("sales").doc(e).update({fulfillment_status:s}),await this.loadData(),document.getElementById("modal-overlay")&&(document.getElementById("modal-overlay").remove(),this.openOnlineSaleDetailModal(e)),this.showToast("Estado de envío actualizado")}catch(n){console.error("Fulfillment update error:",n),this.showToast("Error al actualizar estado: "+n.message,"error")}},async manualShipOrder(t){var e,s,o,r,a,n;try{const l=prompt("Introduce el número de seguimiento:");if(!l)return;const i=((e=event==null?void 0:event.target)==null?void 0:e.closest("button"))||((o=(s=window.event)==null?void 0:s.target)==null?void 0:o.closest("button"));i&&(i.disabled=!0,i.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Guardando...');const p=await fetch(`${R}/api/manual-ship`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t,trackingNumber:l})}),c=await p.json();if(p.ok&&c.success){if(this.showToast("✅ Pedido marcado como enviado"),c.emailSent)this.showToast("📧 Cliente notificado por email","success");else{const d=typeof c.emailError=="object"?JSON.stringify(c.emailError):c.emailError;this.showToast("⚠️ Pedido marcado pero EL EMAIL FALLÓ: "+d,"warning")}await this.loadData();const u=document.getElementById("sale-detail-modal");u&&(u.remove(),this.openUnifiedOrderDetailModal(t))}else throw new Error(c.error||c.message||"Error desconocido")}catch(l){console.error("Error shipping manually:",l),this.showToast("❌ Error: "+(l.message||"No se pudo procesar el envío"),"error");const i=((r=event==null?void 0:event.target)==null?void 0:r.closest("button"))||((n=(a=window.event)==null?void 0:a.target)==null?void 0:n.closest("button"));i&&(i.disabled=!1,i.innerHTML='<i class="ph-bold ph-truck"></i> Ingresar Tracking y Cerrar')}},async logout(){try{await ee.signOut(),location.reload()}catch(t){console.error("Sign out error:",t),location.reload()}},setupListeners(){this._unsubscribeProducts&&this._unsubscribeProducts(),this._unsubscribeProducts=_.collection("products").onSnapshot(t=>{this.state.inventory=t.docs.map(e=>{const s=e.data();return{id:e.id,...s,condition:s.condition||"VG",owner:s.owner||"El Cuartito",label:s.label||"Desconocido",storageLocation:s.storageLocation||"Tienda",cover_image:s.cover_image||s.coverImage||null}}),(this.state.currentTab==="inventory"||this.state.currentTab==="dashboard")&&this.renderCurrentTab()},t=>{console.error("Inventory listener error:",t)})},async loadData(){try{const[t,e,s,o,r,a]=await Promise.all([_.collection("products").get(),_.collection("sales").get(),_.collection("expenses").get(),_.collection("events").orderBy("date","desc").get(),_.collection("consignors").get(),_.collection("extra_income").get()]);this.state.inventory=t.docs.map(n=>{const l=n.data();return{id:n.id,...l,condition:l.condition||"VG",owner:l.owner||"El Cuartito",label:l.label||"Desconocido",storageLocation:l.storageLocation||"Tienda",cover_image:l.cover_image||l.coverImage||null}}),this.state.sales=e.docs.map(n=>{var p,c;const l=n.data(),i={id:n.id,...l,date:l.date||((p=l.timestamp)!=null&&p.toDate?l.timestamp.toDate().toISOString().split("T")[0]:(c=l.created_at)!=null&&c.toDate?l.created_at.toDate().toISOString().split("T")[0]:new Date().toISOString().split("T")[0])};return l.total_amount!==void 0&&l.total===void 0&&(i.total=l.total_amount),l.payment_method&&!l.paymentMethod&&(i.paymentMethod=l.payment_method),i.items&&Array.isArray(i.items)&&(i.items=i.items.map(u=>({...u,priceAtSale:u.priceAtSale!==void 0?u.priceAtSale:u.unitPrice||0,qty:u.qty!==void 0?u.qty:u.quantity||1,costAtSale:u.costAtSale!==void 0?u.costAtSale:u.cost||0}))),i}).filter(n=>n.status!=="PENDING"&&n.status!=="failed").sort((n,l)=>{const i=new Date(n.date);return new Date(l.date)-i}),this.state.expenses=s.docs.map(n=>{var i;const l=n.data();return{id:n.id,...l,date:l.fecha_factura||l.date||((i=l.timestamp)==null?void 0:i.split("T")[0])||new Date().toISOString().split("T")[0]}}).sort((n,l)=>new Date(l.date)-new Date(n.date)),this.state.events=o.docs.map(n=>({id:n.id,...n.data()})),this.state.consignors=r.docs.map(n=>{const l=n.data();return{id:n.id,...l,agreementSplit:l.split||l.agreementSplit||(l.percentage?Math.round(l.percentage*100):70)}}),await this.loadInvestments(),this.state.extraIncome=a.docs.map(n=>({id:n.id,...n.data()})).sort((n,l)=>new Date(l.date)-new Date(n.date)),this.initFuse(),this.refreshCurrentView()}catch(t){console.error("Failed to load data:",t),this.showToast("❌ Error de conexión: "+t.message,"error")}},refreshCurrentView(){const t=document.getElementById("app-content");if(t)switch(this.state.currentView){case"dashboard":this.renderDashboard(t);break;case"inventory":this.renderInventory(t);break;case"sales":this.renderSales(t);break;case"onlineSales":this.renderOnlineSales(t);break;case"discogsSales":this.renderDiscogsSales(t);break;case"expenses":this.renderExpenses(t);break;case"consignments":this.renderConsignments(t);break;case"backup":this.renderBackup(t);break;case"settings":this.renderSettings(t);break;case"calendar":this.renderCalendar(t);break;case"shipping":this.renderShipping(t);break;case"pickups":this.renderPickups(t);break;case"investments":this.renderInvestments(t);break;case"vatReport":this.renderVATReport(t);break;case"datosLegales":this.renderDatosLegales(t);break;case"contabilidad":this.renderContabilidad(t);break;case"facturasManual":this.renderFacturasManual(t);break;case"extraIncome":this.renderExtraIncome(t);break}},renderDatosLegales(t){const e=`
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
        `;t.innerHTML=e},renderContabilidad(t){const e=new Date().getFullYear(),s=Math.floor(new Date().getMonth()/3)+1;this.state.contabilidadYear||(this.state.contabilidadYear=e),this.state.contabilidadQuarter||(this.state.contabilidadQuarter=s),this.state.contabilidadInvoices||(this.state.contabilidadInvoices=[]),this.state.contabilidadLoading||(this.state.contabilidadLoading=!1);const o=this.state.contabilidadYear,r=this.state.contabilidadQuarter,a=this.state.contabilidadInvoices,n=this.state.contabilidadLoading,l=p=>{const c={local:"bg-emerald-100 text-emerald-700",online:"bg-blue-100 text-blue-700",discogs:"bg-purple-100 text-purple-700"},u={local:"Tienda",online:"Webshop",discogs:"Discogs"};return`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${c[p]||"bg-slate-100 text-slate-600"}">${u[p]||p}</span>`},i=`
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
                                ${[e,e-1,e-2].map(p=>`<option value="${p}" ${p===o?"selected":""}>${p}</option>`).join("")}
                            </select>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-xs font-bold text-slate-400 uppercase">Trimestre</label>
                            <select id="contab-quarter" onchange="app.state.contabilidadQuarter = parseInt(this.value); app.loadInvoices()" class="dashboard-input bg-white h-10 px-3 rounded-lg border border-slate-200 font-semibold text-sm">
                                ${[1,2,3,4].map(p=>`<option value="${p}" ${p===r?"selected":""}>Q${p} (${["Ene-Mar","Abr-Jun","Jul-Sep","Oct-Dic"][p-1]})</option>`).join("")}
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
                        <div class="text-2xl font-bold text-brand-orange">${this.formatCurrency(a.reduce((p,c)=>p+(c.totalAmount||0),0))}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Tienda</div>
                        <div class="text-2xl font-bold text-emerald-600">${a.filter(p=>p.channel==="local").length}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Online + Discogs</div>
                        <div class="text-2xl font-bold text-blue-600">${a.filter(p=>p.channel!=="local").length}</div>
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
                                    ${a.map((p,c)=>`
                                        <tr class="inv-row border-b border-slate-50 ${c%2===0?"bg-white":"bg-slate-50/30"}">
                                            <td class="px-5 py-3 text-sm font-mono font-bold text-brand-dark">${p.invoiceNumber||"-"}</td>
                                            <td class="px-5 py-3 text-sm text-slate-600">${p.date||"-"}</td>
                                            <td class="px-5 py-3">${l(p.channel)}</td>
                                            <td class="px-5 py-3 text-sm font-medium text-slate-700 max-w-[150px] truncate">${p.customerName||"Butikskunde"}</td>
                                            <td class="px-5 py-3 text-sm text-slate-500 max-w-[200px] truncate">${p.itemsSummary||"-"}</td>
                                            <td class="px-5 py-3 text-sm font-bold text-brand-dark text-right">${this.formatCurrency(p.totalAmount||0)}</td>
                                            <td class="px-5 py-3 text-center">
                                                <a href="${p.downloadUrl||"#"}" target="_blank" class="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange hover:bg-brand-orange hover:text-white transition-all flex items-center justify-center mx-auto" title="Descargar PDF">
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
        `;t.innerHTML=i,this.state.contabilidadLoaded||this.loadInvoices()},async loadInvoices(){this.state.contabilidadLoading=!0,this.state.contabilidadLoaded=!0,this.refreshCurrentView();try{const t=this.state.contabilidadYear,e=this.state.contabilidadQuarter,s=await ee.currentUser.getIdToken(),o=await fetch(`${R}/invoices?year=${t}&quarter=${e}`,{headers:{Authorization:`Bearer ${s}`}});if(!o.ok)throw new Error("Error cargando facturas");const r=await o.json();this.state.contabilidadInvoices=r.invoices||[]}catch(t){console.error("Error loading invoices:",t),alert("Error cargando facturas: "+t.message),this.showToast("Error cargando facturas","error"),this.state.contabilidadInvoices=[]}this.state.contabilidadLoading=!1,this.refreshCurrentView()},async downloadInvoicePdf(t){try{const e=await ee.currentUser.getIdToken(),s=await fetch(`${R}/invoices/${t}/download`,{headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error("Error descargando factura");const o=await s.json();o.downloadUrl&&window.open(o.downloadUrl,"_blank")}catch(e){console.error("Error downloading invoice:",e),alert("Error descargando factura: "+e.message),this.showToast("Error descargando factura","error")}},async downloadQuarterInvoices(){try{const t=this.state.contabilidadYear,e=this.state.contabilidadQuarter,s=await ee.currentUser.getIdToken();this.showToast(`Preparando descarga Q${e} ${t}...`);const o=await fetch(`${R}/invoices/quarter-download?year=${t}&quarter=${e}`,{headers:{Authorization:`Bearer ${s}`}});if(!o.ok)throw new Error("Error descargando trimestre");const r=await o.json();if(!r.invoices||r.invoices.length===0){this.showToast("No hay facturas para este trimestre","error");return}const a=new JSZip,n=a.folder(`Contabilidad_ElCuartito_${t}_Q${e}`);for(const i of r.invoices)try{const p=await fetch(`${R}/invoices/${i.id}/file`,{headers:{Authorization:`Bearer ${s}`}});if(!p.ok)throw new Error(`Fetch failed for ${i.invoiceNumber}`);const c=await p.blob();n.file(i.fileName,c)}catch(p){console.error(`Error downloading ${i.fileName}:`,p)}const l=await a.generateAsync({type:"blob"});saveAs(l,`Contabilidad_ElCuartito_${t}_Q${e}.zip`),this.showToast(`✅ ${r.invoices.length} facturas descargadas`)}catch(t){console.error("Error downloading quarter:",t),alert("Error descargando trimestre: "+t.message),this.showToast("Error descargando trimestre","error")}},async backfillInvoices(){if(confirm(`¿Generar facturas PDF para todas las ventas anteriores que no tienen factura?

Esto se hará por lotes para evitar errores.`))try{this.showToast("🔄 Verificando conexión...");const t=await ee.currentUser.getIdToken();try{if(!(await fetch(`${R}/api/health`)).ok)throw new Error("Servidor responde con error")}catch(l){console.error("Health check failed:",l)}this.showToast("🔄 Iniciando backfill (Modo Seguro)...");let e=0,s=0,o=0,r=1;const a=1;for(;r>0;){const l=await fetch(`${R}/invoices/backfill`,{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"},body:JSON.stringify({limit:a})});if(!l.ok){const p=await l.text();try{const c=JSON.parse(p);throw new Error(c.error||`Error ${l.status}: ${l.statusText}`)}catch{throw new Error(`Error ${l.status}: ${p.slice(0,100)}`)}}const i=await l.json();if(!i.success)throw new Error(i.error||"Unknown error from backend");e+=i.generated,s+=i.skipped,r=i.remaining,i.errors&&(o+=i.errors.length),this.showToast(`✅ Lote procesado: +${i.generated} facturas. Restantes: ${r}`),r>0&&await new Promise(p=>setTimeout(p,1e3))}const n=`✅ Backfill completado!
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
        `;t.innerHTML=s,this.state.manualInvoicesLoaded||this.loadManualInvoices()},async loadManualInvoices(){try{const t=await ee.currentUser.getIdToken(),e=await fetch(`${R}/invoices?year=${new Date().getFullYear()}`,{headers:{Authorization:`Bearer ${t}`}});if(!e.ok)throw new Error("Error cargando facturas");const s=await e.json();this.state.contabilidadInvoices=s.invoices||[],this.state.manualInvoicesLoaded=!0,this.state.currentView==="facturasManual"&&this.refreshCurrentView()}catch(t){console.error("Error loading manual invoices:",t)}},async submitManualInvoice(t){t.preventDefault();const e=document.getElementById("manual-invoice-form"),s=document.getElementById("manual-invoice-btn"),o=new FormData(e),r={customerName:o.get("customerName"),customerVAT:o.get("customerVAT")||void 0,customerAddress:o.get("customerAddress")||void 0,description:o.get("description"),amount:parseFloat(o.get("amount")),vatAmount:o.get("vatAmount")?parseFloat(o.get("vatAmount")):void 0,date:o.get("date"),paymentMethod:o.get("paymentMethod")};if(!r.customerName||!r.description||!r.amount||!r.date){this.showToast("Completa todos los campos obligatorios","error");return}s.disabled=!0,s.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Generando...';try{const a=await ee.currentUser.getIdToken(),n=await fetch(`${R}/invoices/manual`,{method:"POST",headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json"},body:JSON.stringify(r)});if(!n.ok){const p=await n.json();throw new Error(p.error||"Error generando factura")}const l=await n.json(),i=document.getElementById("manual-invoice-result");document.getElementById("result-invoice-number").textContent=`Factura ${l.invoiceNumber} generada`,document.getElementById("result-download-link").href=l.downloadUrl,i.classList.remove("hidden"),this.showToast(`✅ Factura ${l.invoiceNumber} generada correctamente`),e.reset(),document.querySelector('[name="date"]').value=new Date().toISOString().split("T")[0],this.state.manualInvoicesLoaded=!1,this.loadManualInvoices()}catch(a){console.error("Error generating manual invoice:",a),this.showToast("❌ Error: "+a.message,"error"),alert("Error generando factura: "+a.message)}s.disabled=!1,s.innerHTML='<i class="ph-bold ph-file-pdf"></i> Generar Factura PDF'},renderExtraIncome(t){const e=this.state.extraIncome||[],s=e.reduce((n,l)=>n+(Number(l.amount)||0),0),o=e.reduce((n,l)=>n+(Number(l.vatAmount)||0),0),r=n=>({event:"🎵 Evento",service:"🔧 Servicio",other:"📦 Otro"})[n]||n,a=e.map(n=>`
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
        `},async addExtraIncome(t){t.preventDefault();const e=t.target,s=new FormData(e),o={description:s.get("description"),category:s.get("category"),amount:parseFloat(s.get("amount")),vatAmount:s.get("vatAmount")?parseFloat(s.get("vatAmount")):0,date:s.get("date"),paymentMethod:s.get("paymentMethod")||"Transfer",createdAt:firebase.firestore.FieldValue.serverTimestamp()};try{await _.collection("extra_income").add(o),this.showToast("✅ Ingreso extra registrado correctamente");const r=await _.collection("extra_income").get();this.state.extraIncome=r.docs.map(a=>({id:a.id,...a.data()})).sort((a,n)=>new Date(n.date)-new Date(a.date)),this.renderExtraIncome(document.getElementById("app-content"))}catch(r){console.error("Error adding extra income:",r),this.showToast("❌ Error: "+r.message,"error")}},async deleteExtraIncome(t){if(confirm("¿Eliminar este ingreso extra?"))try{await _.collection("extra_income").doc(t).delete(),this.state.extraIncome=this.state.extraIncome.filter(e=>e.id!==t),this.showToast("🗑️ Ingreso eliminado"),this.renderExtraIncome(document.getElementById("app-content"))}catch(e){console.error("Error deleting extra income:",e),this.showToast("❌ Error: "+e.message,"error")}},navigate(t){this.state.currentView=t,document.querySelectorAll(".nav-item, .nav-item-m").forEach(r=>{r.classList.remove("bg-orange-50","text-brand-orange"),r.classList.add("text-slate-500")});const e=document.getElementById(`nav-d-${t}`);e&&(e.classList.remove("text-slate-500"),e.classList.add("bg-orange-50","text-brand-orange"));const s=document.getElementById(`nav-m-${t}`);s&&(s.classList.remove("text-slate-400"),s.classList.add("text-brand-orange"));const o=document.getElementById("app-content");o.innerHTML="",this.refreshCurrentView()},renderCalendar(t){const e=this.state.selectedDate||new Date,s=e.getFullYear(),o=e.getMonth(),r=new Date(s,o,1),n=new Date(s,o+1,0).getDate(),l=r.getDay()===0?6:r.getDay()-1,i=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],p=u=>{const d=`${s}-${String(o+1).padStart(2,"0")}-${String(u).padStart(2,"0")}`,y=this.state.sales.some($=>$.date===d),m=this.state.expenses.some($=>$.date===d),E=this.state.events.some($=>$.date===d);return{hasSales:y,hasExpenses:m,hasEvents:E}},c=`
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <div class="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
                    <!-- Calendar Grid -->
                    <div class="flex-1 bg-white rounded-2xl shadow-sm border border-orange-100 p-6 flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="font-display text-2xl font-bold text-brand-dark capitalize">
                                ${i[o]} <span class="text-brand-orange">${s}</span>
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
                            ${["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(u=>`
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider py-2">${u}</div>
                            `).join("")}
                        </div>

                        <div class="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                            ${Array(l).fill('<div class="bg-slate-50/50 rounded-xl"></div>').join("")}
                            ${Array.from({length:n},(u,d)=>{const y=d+1,m=`${s}-${String(o+1).padStart(2,"0")}-${String(y).padStart(2,"0")}`,E=e.getDate()===y,$=p(y),b=new Date().toDateString()===new Date(s,o,y).toDateString();return`
                                    <button onclick="app.selectCalendarDate('${m}')" 
                                        class="relative rounded-xl p-2 flex flex-col items-center justify-start gap-1 transition-all border-2
                                        ${E?"border-brand-orange bg-orange-50":"border-transparent hover:bg-slate-50"}
                                        ${b?"bg-blue-50":""}">
                                        <span class="text-sm font-bold ${E?"text-brand-orange":"text-slate-700"} ${b?"text-blue-600":""}">${y}</span>
                                        <div class="flex gap-1 mt-1">
                                            ${$.hasSales?'<div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>':""}
                                            ${$.hasExpenses?'<div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>':""}
                                            ${$.hasEvents?'<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>':""}
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
        `;t.innerHTML=c},getCustomerInfo(t){const e=t.customer||{},s=t.customerName||e.name||(e.firstName?`${e.firstName} ${e.lastName||""}`.trim():"")||"Cliente",o=t.customerEmail||e.email||"-";let r=t.address||e.address||"-";if(e.shipping){const a=e.shipping;r=`${a.line1||""} ${a.line2||""}, ${a.city||""}, ${a.postal_code||""}, ${a.country||""}`.trim().replace(/^,|,$/g,"")}return{name:s,email:o,address:r}},renderCalendarDaySummary(t){const e=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,s=t.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}),o=this.state.sales.filter(i=>i.date===e),r=this.state.expenses.filter(i=>i.date===e),a=this.state.events.filter(i=>i.date===e),n=o.reduce((i,p)=>i+p.total,0),l=r.reduce((i,p)=>i+p.amount,0);return`
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
                        <p class="text-lg font-bold text-brand-dark">${this.formatCurrency(l)}</p>
                    </div>
                </div>

                <!-- Events -->
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Eventos / Notas</h4>
                    ${a.length>0?`
                        <div class="space-y-2">
                            ${a.map(i=>`
                                <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 group relative">
                                    <p class="text-sm font-medium text-brand-dark">${i.title}</p>
                                    ${i.description?`<p class="text-xs text-slate-500 mt-1">${i.description}</p>`:""}
                                    <button onclick="app.deleteEvent('${i.id}')" class="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600">
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
                            ${o.map(i=>`
                                <div class="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg text-xs">
                                    <div class="truncate flex-1 pr-2">
                                        <span class="font-bold text-slate-700 block truncate">${i.album||"Venta rápida"}</span>
                                        <span class="text-slate-400 text-[10px]">${i.sku||"-"}</span>
                                    </div>
                                    <span class="font-bold text-brand-dark">${this.formatCurrency(i.total)}</span>
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
                            ${r.map(i=>`
                                <div class="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg text-xs">
                                    <div class="truncate flex-1 pr-2">
                                        <span class="font-bold text-slate-700 block truncate">${i.description}</span>
                                        <span class="text-slate-400 text-[10px]">${i.category}</span>
                                    </div>
                                    <span class="font-bold text-brand-dark">${this.formatCurrency(i.amount)}</span>
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
        `;document.body.insertAdjacentHTML("beforeend",e)},handleAddEvent(t){t.preventDefault();const e=new FormData(t.target),s={date:e.get("date"),title:e.get("title"),description:e.get("description"),createdAt:new Date().toISOString()};_.collection("events").add(s).then(()=>{this.showToast("✅ Evento agregado"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>console.error(o))},deleteEvent(t){confirm("¿Eliminar este evento?")&&_.collection("events").doc(t).delete().then(()=>{this.showToast("✅ Evento eliminado"),this.loadData()}).catch(e=>console.error(e))},renderBackup(t){const e=`
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
        `;t.innerHTML=s},saveSettings(t){t.preventDefault();const s=new FormData(t.target).get("discogs_token").trim();s?(localStorage.setItem("discogs_token",s),localStorage.setItem("discogs_token_warned","true"),this.showToast("Configuración guardada correctamente")):(localStorage.removeItem("discogs_token"),this.showToast("Token eliminado"))},async migrateProductCondition(){if(confirm('¿Estás seguro? Esto marcará TODOS los productos como "Usado (Second-hand)".')){this.showToast("⏳ Migrando productos...","info");try{const t=await _.collection("products").get();let e=0;const s=_.batch();t.docs.forEach(o=>{o.data().product_condition||(s.update(o.ref,{product_condition:"Second-hand"}),e++)}),await s.commit(),this.showToast(`✅ ${e} productos marcados como "Usado"`),await this.loadData()}catch(t){console.error("Migration error:",t),this.showToast("❌ Error durante la migración: "+t.message,"error")}}},async normalizeAllSkus(){const t=/^SKU\s*-\s*(\d+)$/,e=this.state.inventory.filter(r=>!t.test(r.sku)),s=this.state.inventory.map(r=>{const a=r.sku.match(t);return a?parseInt(a[1]):0});let o=Math.max(0,...s);if(e.length===0){this.showToast("✅ Todos los SKUs ya tienen formato SKU-xxx");return}if(confirm(`Se encontraron ${e.length} productos con SKU irregular.

Se les asignará un nuevo SKU desde SKU-${String(o+1).padStart(3,"0")} en adelante.

¿Continuar?`)){this.showToast("⏳ Normalizando SKUs...","info");try{for(let r=0;r<e.length;r+=500){const a=_.batch(),n=e.slice(r,r+500);for(const l of n){o++;const i=`SKU-${String(o).padStart(3,"0")}`,p=await this.findProductBySku(l.sku);p&&(a.update(p.ref,{sku:i,old_sku:l.sku}),console.log(`  → ${l.sku} → ${i} (${l.artist} - ${l.album})`))}await a.commit()}this.showToast(`✅ ${e.length} SKUs normalizados`),await this.loadData()}catch(r){console.error("SKU normalization error:",r),this.showToast("❌ Error: "+r.message,"error")}}},async backfillQuickIds(){const t=this.state.inventory.filter(e=>!e.quickId);if(t.length===0){this.showToast("✅ Todos los productos ya tienen quickId");return}if(t.sort((e,s)=>{const o=e.created_at?e.created_at.seconds?e.created_at.seconds*1e3:new Date(e.created_at).getTime():0,r=s.created_at?s.created_at.seconds?s.created_at.seconds*1e3:new Date(s.created_at).getTime():0;return o-r}),!!confirm(`Se encontraron ${t.length} productos sin quickId.

Se les asignará un ID secuencial (0001, 0002...).

¿Continuar?`)){this.showToast("⏳ Asignando QuickIDs...","info");try{const e=_.collection("metadata").doc("vinylCounter"),s=await e.get();let o=s.exists&&s.data().current||0;for(let r=0;r<t.length;r+=500){const a=_.batch(),n=t.slice(r,r+500);for(const l of n){o++;const i=String(o).padStart(4,"0"),p=await this.findProductBySku(l.sku);p&&(a.update(p.ref,{quickId:i}),console.log(`  → ${i}: ${l.artist} - ${l.album}`))}await a.commit()}await e.set({current:o},{merge:!0}),this.showToast(`✅ ${t.length} QuickIDs asignados (hasta ${String(o).padStart(4,"0")})`),await this.loadData()}catch(e){console.error("QuickID backfill error:",e),this.showToast("❌ Error: "+e.message,"error")}}},async migrateSalesData(){if(confirm("¿Migrar datos de ventas? Esto agregará información de costo y condición a ventas antiguas.")){this.showToast("⏳ Migrando ventas...","info");try{const t=await _.collection("sales").get();let e=0,s=0,o=_.batch();for(const r of t.docs){const n=r.data().items||[];let l=!1;const i=[];for(const p of n){const c={...p};if(!p.costAtSale&&p.costAtSale!==0){l=!0;const u=p.productId||p.recordId,d=p.album,y=this.state.inventory.find(m=>u&&(m.id===u||m.sku===u)||d&&m.album===d);y?(c.costAtSale=y.cost||0,c.productCondition=y.product_condition||"Second-hand",c.productId=y.id||u,c.album||(c.album=y.album)):(c.costAtSale=0,c.productCondition="Second-hand")}i.push(c)}l&&(o.update(r.ref,{items:i}),e++,s++,s>=450&&(await o.commit(),o=_.batch(),s=0))}s>0&&await o.commit(),this.showToast(`✅ ${e} ventas actualizadas con datos de producto`),await this.loadData()}catch(t){console.error("Sales migration error:",t),this.showToast("❌ Error: "+t.message,"error")}}},exportData(){const t={inventory:this.state.inventory,sales:this.state.sales,expenses:this.state.expenses,consignors:this.state.consignors,customGenres:this.state.customGenres,customCategories:this.state.customCategories,timestamp:new Date().toISOString()},e="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(t)),s=document.createElement("a");s.setAttribute("href",e),s.setAttribute("download","el_cuartito_backup_"+new Date().toISOString().slice(0,10)+".json"),document.body.appendChild(s),s.click(),s.remove()},exportInventoryToExcel(){this.showToast("⏳ Generando Excel...","info");try{const t=this.state.inventory.map(r=>{const a=[r.genre,r.genre2,r.genre3,r.genre4,r.genre5].filter(Boolean).join(", ");return{SKU:r.sku||"",Artista:r.artist||"",Álbum:r.album||"",Sello:r.label||"",Año:r.year||"",Géneros:a,"Condición Vinilo":r.status||"","Condición Cover":r.sleeveCondition||"","Condición Producto":r.product_condition||"Second-hand","Precio (DKK)":r.price||0,"Costo (DKK)":r.cost||0,Stock:r.stock||0,"En Web":r.is_online?"Sí":"No","En Discogs":r.discogs_listing_id?"Sí":"No","Discogs Listing ID":r.discogs_listing_id||"","Discogs Release ID":r.discogs_release_id||r.discogsId||"",Consignatario:r.consignor||"","Label Disquería":r.storageLocation||"",Ubicación:r.location||"",Notas:r.notes||"","Fecha Creación":r.createdAt?new Date(r.createdAt).toLocaleDateString("es-ES"):"","URL Imagen":r.imageUrl||""}}),e=XLSX.utils.book_new(),s=XLSX.utils.json_to_sheet(t);s["!cols"]=[{wch:12},{wch:25},{wch:30},{wch:20},{wch:6},{wch:30},{wch:12},{wch:12},{wch:15},{wch:10},{wch:10},{wch:6},{wch:8},{wch:10},{wch:15},{wch:15},{wch:15},{wch:15},{wch:12},{wch:30},{wch:12},{wch:40}],XLSX.utils.book_append_sheet(e,s,"Inventario");const o=`ElCuartito_Inventario_${new Date().toISOString().slice(0,10)}.xlsx`;XLSX.writeFile(e,o),this.showToast(`✅ Excel exportado: ${this.state.inventory.length} discos`)}catch(t){console.error("Error exporting to Excel:",t),this.showToast("❌ Error al exportar: "+t.message,"error")}},importData(t){const e=t.files[0];if(!e)return;const s=new FileReader;s.onload=o=>{try{const r=JSON.parse(o.target.result);if(!confirm("¿Estás seguro de restaurar este backup? Se sobrescribirán los datos actuales."))return;const a=_.batch();alert("La importación completa sobrescribiendo datos en la nube es compleja. Por seguridad, esta función solo agrega/actualiza items de inventario por ahora."),r.inventory&&r.inventory.forEach(n=>{const l=_.collection("products").doc(n.sku);a.set(l,n)}),a.commit().then(()=>{this.showToast("Datos importados (Inventario)")})}catch(r){alert("Error al leer el archivo de respaldo"),console.error(r)}},s.readAsText(e)},resetApplication(){if(!confirm(`⚠️ ¡ADVERTENCIA! ⚠️

Esto borrará PERMANENTEMENTE todo el inventario, ventas, gastos y socios de la base de datos.

¿Estás absolutamente seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Iniciando borrado completo...");const e=s=>_.collection(s).get().then(o=>{const r=_.batch();return o.docs.forEach(a=>{r.delete(a.ref)}),r.commit()});Promise.all([e("inventory"),e("sales"),e("expenses"),e("consignors"),_.collection("settings").doc("general").delete()]).then(()=>{this.showToast("♻️ Aplicación restablecida de fábrica"),setTimeout(()=>location.reload(),1500)}).catch(s=>{console.error(s),alert("Error al borrar datos: "+s.message)})},resetSales(){if(!confirm(`⚠️ ADVERTENCIA ⚠️

Esto borrará PERMANENTEMENTE todas las ventas (manuales y online) de la base de datos.

El inventario, gastos y socios NO serán afectados.

¿Estás seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Borrando todas las ventas..."),_.collection("sales").get().then(e=>{const s=_.batch();return e.docs.forEach(o=>{s.delete(o.ref)}),s.commit()}).then(()=>{this.showToast("✅ Todas las ventas han sido eliminadas"),setTimeout(()=>location.reload(),1500)}).catch(e=>{console.error(e),alert("Error al borrar ventas: "+e.message)})},async findProductBySku(t){try{const e=await _.collection("products").where("sku","==",t).get();if(e.empty)return null;const s=e.docs[0];return{id:s.id,ref:s.ref,data:s.data()}}catch(e){return console.error("Error finding product by SKU:",e),null}},logInventoryMovement(t,e){let s="";t==="EDIT"?s="Producto actualizado":t==="ADD"?s="Ingreso de inventario":t==="DELETE"?s="Egreso manual":t==="SOLD"&&(s="Venta registrada"),_.collection("inventory_logs").add({type:t,sku:e.sku||"Unknown",album:e.album||"Unknown",artist:e.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:s}).catch(o=>console.error("Error logging movement:",o))},openInventoryLogModal(){_.collection("inventory_logs").orderBy("timestamp","desc").limit(50).get().then(t=>{const s=`
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
        `;try{const s=R,r=await(await fetch(`${s}/discogs/sync`,{method:"POST",headers:{"Content-Type":"application/json"}})).json(),n=await(await fetch(`${s}/discogs/sync-orders`,{method:"POST",headers:{"Content-Type":"application/json"}})).json();if(r.success||n&&n.success){let l=`✅ Sincronizado: ${r.synced||0} productos`;n&&n.salesCreated>0&&(l+=`. ¡Detectadas ${n.salesCreated} nuevas ventas!`),this.showToast(l),await this.loadData(),this.refreshCurrentView()}else throw new Error(r.error||n&&n.error||"Error desconocido")}catch(s){console.error("Sync error:",s),this.showToast(`❌ Error al sincronizar: ${s.message}`)}finally{t.disabled=!1,t.innerHTML=e}},formatCurrency(t,e=!0){const s=new Intl.NumberFormat("da-DK",{style:"currency",currency:"DKK"}).format(t);return e?`<span class="blur-money">${s}</span>`:`<span>${s}</span>`},formatDate(t){return t?new Date(t).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}):"-"},getMonthName(t){return["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][t]},generateId(){return Date.now().toString(36)+Math.random().toString(36).substr(2)},showToast(t){const e=document.getElementById("toast");document.getElementById("toast-message").innerHTML=t,e.classList.remove("opacity-0","-translate-y-20","md:translate-y-20"),setTimeout(()=>{e.classList.add("opacity-0","-translate-y-20","md:translate-y-20")},3e3)},setupNavigation(){},setupMobileMenu(){},togglePrivacyMode(){this.state.privacyMode=!this.state.privacyMode,this.state.privacyMode?document.body.classList.add("privacy-active"):document.body.classList.remove("privacy-active");const t=this.state.privacyMode?"ph-bold ph-eye-slash":"ph-bold ph-eye",e=document.querySelector("#privacy-toggle-desktop i"),s=document.querySelector("#privacy-toggle-mobile i");e&&(e.className=t),s&&(s.className=t),this.showToast(this.state.privacyMode?"🔒 Modo Privacidad Activado":"👁️ Modo Privacidad Desactivado")},toggleMobileMenu(){const t=document.getElementById("mobile-menu"),e=document.getElementById("mobile-menu-overlay");!t||!e||(t.classList.contains("translate-y-full")?(t.classList.remove("translate-y-full"),e.classList.remove("hidden")):(t.classList.add("translate-y-full"),e.classList.add("hidden")))},showFinancialReportModal(){const t="financialReportModal";document.getElementById(t)&&document.getElementById(t).remove();const e=new Date,s=new Date(e.getFullYear(),e.getMonth(),1).toISOString().split("T")[0],o=e.toISOString().split("T")[0],r=`
            <div id="${t}" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
                    <button onclick="document.getElementById('${t}').remove()" class="absolute top-4 right-4 text-slate-400 hover:text-brand-dark transition-colors">
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
                                <input type="date" id="reportStartDate" value="${s}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fecha Hasta</label>
                                <input type="date" id="reportEndDate" value="${o}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all">
                            </div>
                        </div>

                        <div class="mt-8 flex gap-3">
                            <button onclick="document.getElementById('${t}').remove()" class="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">
                                Cancelar
                            </button>
                            <button id="btnDownloadReport" onclick="app.downloadFinancialReport()" class="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all flex justify-center items-center gap-2">
                                <i class="ph-bold ph-download-simple"></i> Descargar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;document.body.insertAdjacentHTML("beforeend",r)},async downloadFinancialReport(){const t=document.getElementById("reportStartDate").value,e=document.getElementById("reportEndDate").value,s=document.getElementById("btnDownloadReport");if(!t||!e){Se.showToast("Por favor, selecciona ambas fechas","error");return}if(t>e){Se.showToast('La fecha "Desde" no puede ser mayor a "Hasta"',"error");return}const o=s.innerHTML;s.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> Procesando...',s.disabled=!0,s.classList.add("opacity-70","cursor-not-allowed");try{const r=ee.currentUser?await ee.currentUser.getIdToken():"",a=`${R}/api/reports/financial?startDate=${t}&endDate=${e}`,n=await fetch(a,{method:"GET",headers:{Authorization:`Bearer ${r}`}});if(!n.ok)throw new Error(`Error al generar el reporte: ${n.statusText}`);const l=await n.blob(),i=window.URL.createObjectURL(l),p=document.createElement("a");p.href=i,p.download=`Reporte_Financiero_${t}_al_${e}.xlsx`,document.body.appendChild(p),p.click(),document.body.removeChild(p),window.URL.revokeObjectURL(i),document.getElementById("financialReportModal").remove(),Se.showToast("Reporte descargado con éxito")}catch(r){console.error("Error downloading report:",r),Se.showToast(r.message,"error")}finally{document.getElementById("btnDownloadReport")&&(s.innerHTML=o,s.disabled=!1,s.classList.remove("opacity-70","cursor-not-allowed"))}},toggleMonthFilter(t){const e=this.state.filterMonths.indexOf(t);e===-1?this.state.filterMonths.push(t):this.state.filterMonths.length>1&&this.state.filterMonths.splice(e,1),this.state.filterMonths.sort((s,o)=>s-o),this.refreshCurrentView()},renderDashboard(t){var e,s;try{const o=this.state.filterMonths,r=this.state.filterYear,a=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],n=this.state.sales.filter(h=>{var J;const w=(J=h.timestamp)!=null&&J.toDate?h.timestamp.toDate():new Date(h.timestamp||h.date);return w.getFullYear()===r&&o.includes(w.getMonth())}),l=[...n].sort((h,w)=>{var F,A;const J=(F=h.timestamp)!=null&&F.toDate?h.timestamp.toDate():new Date(h.timestamp||h.date);return((A=w.timestamp)!=null&&A.toDate?w.timestamp.toDate():new Date(w.timestamp||w.date))-J}),i=[...this.state.sales.map(h=>({...h,type:"sale",sortDate:new Date(h.date)})),...this.state.expenses.map(h=>({...h,type:"expense",sortDate:new Date(h.date||h.fecha_factura)}))].sort((h,w)=>w.sortDate-h.sortDate).slice(0,5),p=[],c=[];for(let h=29;h>=0;h--){const w=new Date;w.setDate(w.getDate()-h);const J=w.toISOString().split("T")[0];p.push(w.getDate());const B=this.state.sales.filter(F=>F.date===J).reduce((F,A)=>F+(Number(A.total||A.total_amount)||0),0);c.push(B)}const u=new Date,d=u.getMonth(),y=u.getFullYear(),m=d===0?11:d-1,E=d===0?y-1:y,$=this.state.sales.filter(h=>{const w=new Date(h.date);return w.getMonth()===d&&w.getFullYear()===y}).reduce((h,w)=>h+(Number(w.originalTotal||w.total_amount||w.total)||0),0)+(this.state.extraIncome||[]).filter(h=>{const w=new Date(h.date);return w.getMonth()===d&&w.getFullYear()===y}).reduce((h,w)=>h+(Number(w.amount)||0),0),b=this.state.sales.filter(h=>{const w=new Date(h.date);return w.getMonth()===m&&w.getFullYear()===E}).reduce((h,w)=>h+(Number(w.originalTotal||w.total_amount||w.total)||0),0)+(this.state.extraIncome||[]).filter(h=>{const w=new Date(h.date);return w.getMonth()===m&&w.getFullYear()===E}).reduce((h,w)=>h+(Number(w.amount)||0),0),v=b>0?($-b)/b*100:0,k=`${v>=0?"+":""}${v.toFixed(1)}% vs ${this.getMonthName(m)}`;let I=0,C=0,g=0,f=0,S=0,D=0,T=0,L=0;n.forEach(h=>{var we;const w=((we=h.channel)==null?void 0:we.toLowerCase())==="discogs",J=Number(h.originalTotal)||Number(h.total_amount)||Number(h.total)||0,B=Number(h.total)||Number(h.total_amount)||0,F=w?J-B:0,A=Number(h.shipping_cost)||0;I+=J,g+=A;let re=0;const be=h.items||[];be.length>0?be.forEach(se=>{const ue=Number(se.priceAtSale||se.unitPrice||se.price)||0,Ee=Number(se.qty||se.quantity)||1;let he=Number(se.costAtSale||se.cost)||0;const Ae=(se.owner||"").toLowerCase();let ke=se.providerOrigin||se.provider_origin;const Fe=ue*Ee;if(he===0||!ke){const ge=se.productId||se.recordId,_e=se.album,Ie=this.state.inventory.find(je=>ge&&(je.id===ge||je.sku===ge)||_e&&je.album===_e);Ie&&(he===0&&(he=Ie.cost||0),ke||(ke=Ie.provider_origin))}if(ke||(ke="Local_Used"),ke==="EU_B2B"||ke==="DK_B2B")S+=Fe*.2;else{const ge=Fe-he*Ee;D+=ge>0?ge*.2:0}if(Ae==="el cuartito"||Ae==="")he=Number(se.costAtSale||se.cost)||0;else{if(he===0||isNaN(he)){const ge=this.state.consignors?this.state.consignors.find(Ie=>(Ie.name||"").toLowerCase()===Ae):null,_e=ge&&(ge.agreementSplit||ge.split)||70;he=ue*(Number(_e)||70)/100}f+=he*Ee}re+=(ue-he)*Ee}):(re=J,S+=J*.2);const pe=parseFloat(h.shipping_income||h.shipping||h.shipping_cost||0);pe>0&&(T+=pe*.2,L+=pe),C+=re-F});const q=(this.state.extraIncome||[]).filter(h=>{const w=new Date(h.date);return w.getFullYear()===r&&o.includes(w.getMonth())});let P=0;q.forEach(h=>{const w=Number(h.amount)||0,J=Number(h.vatAmount)||0;P+=w,I+=w,C+=w,S+=J});const K=this.state.expenses.filter(h=>{var B;const w=h.fecha_factura?new Date(h.fecha_factura):(B=h.timestamp)!=null&&B.toDate?h.timestamp.toDate():new Date(h.timestamp||h.date);return(h.categoria_tipo==="operativo"||h.categoria_tipo==="stock_nuevo"||h.is_vat_deductible)&&w.getFullYear()===r&&o.includes(w.getMonth())}).reduce((h,w)=>h+(parseFloat(w.monto_iva)||0),0),Q=(this.state.inventory||[]).filter(h=>{if(!h.item_phantom_vat||h.item_phantom_vat<=0||h.provider_origin!=="EU_B2B")return!1;const w=h.acquisition_date?new Date(h.acquisition_date):null;return w?w.getFullYear()===r&&o.includes(w.getMonth()):!1}).reduce((h,w)=>h+(w.item_phantom_vat||0),0),Z=(this.state.inventory||[]).filter(h=>{if(!h.item_real_vat||h.item_real_vat<=0||h.provider_origin!=="DK_B2B")return!1;const w=h.acquisition_date?new Date(h.acquisition_date):null;return w?w.getFullYear()===r&&o.includes(w.getMonth()):!1}).reduce((h,w)=>h+(w.item_real_vat||0),0),ae=S+D+T+Q,x=K+Q+Z,V=ae-x,oe=this.state.expenses.filter(h=>{const w=new Date(h.date||h.fecha_factura);return w.getFullYear()===r&&o.includes(w.getMonth())}).reduce((h,w)=>h+(Number(w.monto_total||w.amount)||0),0),te=C-V-oe,N=C-V,le=this.state.inventory.reduce((h,w)=>h+w.price*w.stock,0),ie=this.state.inventory.reduce((h,w)=>h+w.stock,0),X=this.state.inventory.filter(h=>h.stock>0&&h.stock<1),Y=this.state.sales.filter(h=>{var w;return h.fulfillment_status==="preparing"||h.status==="paid"||((w=h.channel)==null?void 0:w.toLowerCase())==="discogs"&&h.status!=="shipped"&&h.fulfillment_status!=="shipped"}),O=V,G=o.length===12?`Año ${r} `:`${o.map(h=>this.getMonthName(h)).join(", ")} ${r} `,z=this.state.dashboardAnalysisMode||"genre",W={},H={};let U=0,me=0,fe=0;n.forEach(h=>{const w=h.items||[],J=(B,F)=>{const A=this.state.inventory.find(ue=>B&&(ue.id===B||ue.sku===B)||F&&ue.album===F);if(!A)return null;if(z==="storage")return A.storageLocation||null;const re=[A.genre,A.genre2,A.genre3,A.genre4,A.genre5].filter(Boolean),be=[];re.forEach(ue=>{be.push(...ue.split(",").map(Ee=>Ee.trim()).filter(Boolean))});const pe=[...new Set(be)],we=pe.filter(ue=>ue.toLowerCase()!=="electronic");return(we.length>0?we:pe.length>0?pe:["Otros"])[0]||null};if(w.length>0)w.forEach(B=>{const F=B.productId||B.recordId,A=J(F,B.album)||(z==="storage"?"Sin ubicación":h.genre||"Otros"),re=Number(B.qty||B.quantity)||1,be=Number(B.priceAtSale||B.unitPrice||B.price)||0;W[A]=(W[A]||0)+re,H[A]=(H[A]||0)+be*re,U+=re,(B.productCondition||B.condition||"Used")==="New"?me+=re:fe+=re});else{const B=Number(h.quantity)||1,F=Number(h.originalTotal||h.total_amount||h.total)||0,A=z==="storage"?"Sin ubicación":h.genre||"Otros";W[A]=(W[A]||0)+B,H[A]=(H[A]||0)+F,U+=B,fe+=B}});const ne=Object.entries(W).sort((h,w)=>w[1]-h[1]),ye=Object.entries(H).sort((h,w)=>w[1]-h[1]),De=ye.length>0?{name:ye[0][0],revenue:ye[0][1]}:{name:"N/A",revenue:0},Te=n.length>0?I/n.length:0,de=U>0?Math.round(me/U*100):0,xe=U>0?Math.round(fe/U*100):0,ce=["#FF6B4A","#F59E0B","#14B8A6","#8B5CF6","#F43F5E","#0EA5E9","#84CC16","#D946EF","#64748B"],$e=z==="storage"?"Análisis por Ubicación":"Análisis por Género Musical",Me=z==="storage"?"ph-map-pin":"ph-music-notes-simple",Be=z==="storage"?"Ubicación Más Rentable":"Género Más Rentable",Le=`
            <div class="max-w-7xl mx-auto space-y-8 pb-24 md:pb-8 px-4 md:px-8 pt-6">
                <!-- Header with Navigation and Filter -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div class="flex flex-wrap items-center gap-4">
                        <div class="w-14 h-14 bg-brand-orange rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl shadow-brand-orange/20">
                            <i class="ph-fill ph-house-line"></i>
                        </div>
                        <div>
                            <h2 class="font-display text-3xl font-bold text-brand-dark">Resumen Operativo</h2>
                            <p class="text-slate-500 text-sm">Monitor de actividad: <span class="font-bold text-brand-orange">${G}</span></p>
                        </div>
                        <button onclick="app.showFinancialReportModal()" class="ml-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm">
                            <i class="ph-bold ph-microsoft-excel-logo text-lg"></i> Exportar Informe
                        </button>
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
                            ${a.map((h,w)=>`
                                <button onclick="app.toggleMonthFilter(${w})" 
                                    class="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${o.includes(w)?"bg-brand-orange text-white shadow-lg shadow-brand-orange/20":"text-slate-400 hover:text-brand-dark hover:bg-slate-50"}">
                                    ${h}
                                </button>
                            `).join("")}
                        </div>
                    </div>
                </div>

                <!-- KPI Top Grid (3 Status Cards) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Card 1: Ingresos del Período -->
                    <div class="relative group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <!-- Tooltip Custom -->
                        <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max min-w-[200px] bg-brand-dark text-white text-xs rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl pointer-events-none">
                            <div class="flex justify-between gap-4 mb-1">
                                <span class="text-slate-400">Ventas:</span>
                                <span>${this.formatCurrency(I-P)}</span>
                            </div>
                            <div class="flex justify-between gap-4 mb-2 pb-2 border-b border-slate-700">
                                <span class="text-slate-400">Ingresos Extra:</span>
                                <span>${this.formatCurrency(P)}</span>
                            </div>
                            <div class="flex justify-between gap-4 font-bold">
                                <span>Total:</span>
                                <span>${this.formatCurrency(I)}</span>
                            </div>
                            <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-brand-dark"></div>
                        </div>

                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-brand-orange">
                                <i class="ph-bold ph-chart-line-up text-xl"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Ingresos del Período</span>
                        </div>
                        <p class="text-4xl font-display font-bold text-brand-dark mb-2">${this.formatCurrency(I)}</p>
                        <div class="flex items-center gap-2">
                             <span class="text-[10px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                ${n.length} ventas · ${U} uds
                             </span>
                        </div>
                    </div>

                    <!-- Card 2: Beneficio Neto Estimado -->
                    <div class="relative group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <!-- Tooltip Custom -->
                        <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max min-w-[250px] bg-brand-dark text-white text-xs rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl pointer-events-none">
                            <div class="flex justify-between gap-4 mb-1">
                                <span class="text-slate-400">Beneficio Bruto:</span>
                                <span>${this.formatCurrency(C-P)}</span>
                            </div>
                            <div class="flex justify-between gap-4 mb-1">
                                <span class="text-slate-400">Ingresos Extra:</span>
                                <span class="text-green-400">+${this.formatCurrency(P)}</span>
                            </div>
                            <div class="flex justify-between gap-4 mb-1">
                                <span class="text-slate-400">Impuestos (IVA):</span>
                                <span class="text-red-400">-${this.formatCurrency(V)}</span>
                            </div>
                            <div class="flex justify-between gap-4 mb-2 pb-2 border-b border-slate-700">
                                <span class="text-slate-400">Gastos Operativos:</span>
                                <span class="text-red-400">-${this.formatCurrency(oe)}</span>
                            </div>
                            <div class="flex justify-between gap-4 font-bold text-emerald-400">
                                <span>Beneficio Neto:</span>
                                <span>${this.formatCurrency(te)}</span>
                            </div>
                            <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-brand-dark"></div>
                        </div>

                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                <i class="ph-bold ph-hand-coins text-xl"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Beneficio Neto</span>
                        </div>
                        <p class="text-4xl font-display font-bold text-emerald-600 mb-2">${this.formatCurrency(te)}</p>
                        <p class="text-[10px] text-slate-400 font-medium">Incluye costos, fees y gastos operativos.</p>
                    </div>

                    <!-- Card 3: Alerta de Pedidos -->
                    <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 ${Y.length>0?"bg-red-50 text-red-500":"bg-green-50 text-green-500"} rounded-xl flex items-center justify-center">
                                <i class="ph-bold ${Y.length>0?"ph-package":"ph-check-circle"} text-xl"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Alerta de Pedidos</span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            ${Y.length>0?`<p class="text-5xl font-display font-bold text-red-500">${Y.length}</p>`:'<p class="text-3xl font-display font-bold text-green-600">Al día</p>'}
                        </div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Pedidos por despachar</p>
                    </div>
                </div>

                <!-- Análisis por Categoría (Género / Ubicación) -->
                <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                        <h3 class="font-bold text-lg text-brand-dark flex items-center gap-3">
                            <div class="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-brand-orange">
                                <i class="ph-bold ${Me} text-xl"></i>
                            </div>
                            ${$e}
                        </h3>
                        <div class="flex items-center gap-3">
                            <select onchange="app.state.dashboardAnalysisMode = this.value; app.renderDashboard(document.getElementById('app-content'))"
                                class="bg-slate-50 text-xs font-bold text-brand-dark px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer hover:border-brand-orange transition-colors">
                                <option value="genre" ${z==="genre"?"selected":""}>🎵 Por Género</option>
                                <option value="storage" ${z==="storage"?"selected":""}>📍 Por Ubicación</option>
                            </select>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <i class="ph-bold ph-vinyl-record mr-1"></i> ${U} unidades vendidas
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
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${Be}</span>
                        </div>
                        <p class="text-2xl font-display font-bold text-brand-dark mb-1">${De.name}</p>
                        <p class="text-sm font-bold text-amber-500">${this.formatCurrency(De.revenue)} en ingresos</p>
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
                                    <div class="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-700 ease-out" style="width: ${de}%"></div>
                                </div>
                            </div>
                            <div class="flex justify-between mt-2.5">
                                <span class="text-[10px] font-bold text-teal-600 flex items-center gap-1">
                                    <span class="inline-block w-2 h-2 rounded-full bg-teal-500"></span> Nuevo ${de}% (${me})
                                </span>
                                <span class="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    <span class="inline-block w-2 h-2 rounded-full bg-slate-300"></span> Usado ${xe}% (${fe})
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
                                        ${i.map(h=>{const w=h.type==="sale",J=w?h.album||"Venta de Items":h.proveedor||h.description||"Gasto registrado",B=w?h.channel||"Tienda Local":h.categoria||"Operativo";let F="ph-receipt";if(w){const A=(h.channel||"").toLowerCase();A.includes("web")&&(F="ph-globe-simple"),A.includes("discogs")&&(F="ph-vinyl-record")}else F="ph-credit-card";return`
                                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                                    <td class="px-6 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <div class="w-10 h-10 rounded-xl ${w?"bg-orange-50 text-brand-orange":"bg-slate-100 text-slate-400"} flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                                                                 <i class="ph-bold ${F} text-lg"></i>
                                                             </div>
                                                             <div class="min-w-0">
                                                                 <div class="font-bold text-sm text-brand-dark truncate max-w-[200px]" title="${J}">${J}</div>
                                                                 <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${B}</div>
                                                             </div>
                                                         </div>
                                                     </td>
                                                     <td class="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                         ${this.formatDate(h.date||h.fecha_factura)}
                                                     </td>
                                                     <td class="px-6 py-4 text-right">
                                                         <span class="font-bold text-sm ${w?"text-brand-dark":"text-red-500"}">
                                                            ${w?"":"-"}${this.formatCurrency(h.total||h.monto_total||h.amount||0)}
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
                                        <span class="text-xl font-display font-bold text-brand-orange">${this.formatCurrency(O)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;t.innerHTML=Le,this.renderDashboardCharts(n,p,c);const Ce=(e=document.getElementById("genreDonutChart"))==null?void 0:e.getContext("2d");if(Ce&&ne.length>0){this.genreDonutChartInstance&&this.genreDonutChartInstance.destroy();const h=ne.map(B=>B[0]),w=ne.map(B=>B[1]),J=ne.map((B,F)=>ce[F%ce.length]);this.genreDonutChartInstance=new Chart(Ce,{type:"doughnut",data:{labels:h,datasets:[{data:w,backgroundColor:J,borderWidth:0,hoverOffset:8}]},options:{responsive:!0,maintainAspectRatio:!1,cutout:"62%",plugins:{legend:{position:"bottom",labels:{boxWidth:12,boxHeight:12,borderRadius:3,useBorderRadius:!0,padding:14,font:{size:11,weight:"600",family:"'DM Sans', sans-serif"},color:"#334155"}},tooltip:{backgroundColor:"#1e293b",titleFont:{size:11,weight:"700"},bodyFont:{size:13,weight:"700"},padding:14,cornerRadius:12,callbacks:{label:B=>{const F=B.dataset.data.reduce((re,be)=>re+be,0),A=(B.parsed/F*100).toFixed(1);return` ${B.parsed} uds — ${A}%`}}}}},plugins:[{id:"centerText",beforeDraw(B){const{ctx:F,chartArea:A}=B;if(!A)return;F.save();const re=(A.left+A.right)/2,be=(A.top+A.bottom)/2,pe=Math.min(A.right-A.left,A.bottom-A.top)/7;F.font=`bold ${pe}px 'DM Sans', sans-serif`,F.textBaseline="middle",F.textAlign="center",F.fillStyle="#1e293b";const we=B.data.datasets[0].data.reduce((se,ue)=>se+ue,0);F.fillText(we,re,be-pe*.35),F.font=`600 ${pe*.42}px 'DM Sans', sans-serif`,F.fillStyle="#94a3b8",F.fillText("unidades",re,be+pe*.55),F.restore()}}]})}const Pe=(s=document.getElementById("genreBarChart"))==null?void 0:s.getContext("2d");if(Pe&&ne.length>0){this.genreBarChartInstance&&this.genreBarChartInstance.destroy();const h=ne.map(B=>B[0]),w=ne.map(B=>B[1]),J=ne.map((B,F)=>ce[F%ce.length]);this.genreBarChartInstance=new Chart(Pe,{type:"bar",data:{labels:h,datasets:[{label:"Unidades",data:w,backgroundColor:J.map(B=>B+"30"),borderColor:J,borderWidth:2,borderRadius:8,borderSkipped:!1,barThickness:28}]},options:{responsive:!0,maintainAspectRatio:!1,indexAxis:"y",plugins:{legend:{display:!1},tooltip:{backgroundColor:"#1e293b",titleFont:{size:11,weight:"700"},bodyFont:{size:13,weight:"700"},padding:14,cornerRadius:12,callbacks:{label:B=>` ${B.parsed.x} unidades vendidas`}}},scales:{x:{beginAtZero:!0,grid:{color:"#f1f5f9"},ticks:{font:{size:10,weight:"600"},color:"#94a3b8"}},y:{grid:{display:!1},ticks:{font:{size:11,weight:"700",family:"'DM Sans', sans-serif"},color:"#334155",padding:8}}}}})}}catch(o){console.error("Dashboard render error:",o),t.innerHTML=`<div class="p-12 text-center text-red-500 font-bold bg-red-50 rounded-3xl m-8 border border-red-100">
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
                            <div onclick="app.clearAllFilters()" 
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
                                onclick="app.openProductModal('${a.id}')">
                                <div class="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-4 relative shadow-inner">
                                     ${a.cover_image?`<img src="${a.cover_image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`:'<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-fill ph-disc text-5xl"></i></div>'}
                                     <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                         <button onclick="event.stopPropagation(); app.addToCart('${a.id}', event)" class="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-shopping-cart text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openProductModal('${a.id}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-eye text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openPrintLabelModal('${a.id}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-printer text-lg"></i>
                                         </button>
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
                                <tr class="inv-row cursor-pointer ${this.state.selectedItems.has(a.id)?"bg-orange-50/50":""}" 
                                    onclick="app.openProductModal('${a.id}')">
                                    <td class="p-3" onclick="event.stopPropagation()">
                                        <input type="checkbox" onchange="app.toggleSelection('${a.id}')"
                                            class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                            ${this.state.selectedItems.has(a.id)?"checked":""}>
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
                                        <button onclick="app.toggleProductTag('${a.id}', 'hero')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center ${a.tags&&a.tags.includes("hero")?"bg-amber-50 text-amber-500 shadow-sm border border-amber-100":"text-slate-200 hover:bg-slate-50 hover:text-slate-400"}" 
                                            title="Marcar como Destacado">
                                            <i class="ph-fill ph-star text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.toggleProductTag('${a.id}', 'new_arrival')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center ${a.tags&&a.tags.includes("new_arrival")?"bg-blue-50 text-blue-500 shadow-sm border border-blue-100":"text-slate-200 hover:bg-slate-50 hover:text-slate-400"}" 
                                            title="Marcar como Novedad">
                                            <i class="ph-fill ph-sketch-logo text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.openPrintLabelModal('${a.id}')" 
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
                                            <button onclick="event.stopPropagation(); app.openAddVinylModal('${a.id}')" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-brand-dark hover:bg-slate-100 transition-all flex items-center justify-center" title="Editar">
                                                <i class="ph-bold ph-pencil-simple text-sm"></i>
                                            </button>

                                            <button onclick="event.stopPropagation(); app.addToCart('${a.id}')" class="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange hover:bg-brand-orange hover:text-white transition-all flex items-center justify-center" title="Agregar al carrito">
                                                <i class="ph-bold ph-shopping-cart text-sm"></i>
                                            </button>
                                            <button onclick="event.stopPropagation(); app.deleteVinyl('${a.id}')" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center" title="Eliminar">
                                                <i class="ph-bold ph-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

            `}
        `},renderInventory(t){const e=[...new Set(this.state.inventory.flatMap(g=>{const f=[g.genre,g.genre2,g.genre3,g.genre4,g.genre5].filter(Boolean),S=[];f.forEach(L=>{S.push(...L.split(",").map(q=>q.trim()).filter(Boolean))});const D=[...new Set(S)],T=D.filter(L=>L.toLowerCase()!=="electronic");return T.length>0?T:D.length>0?D:["Otros"]}))].sort(),s=[...new Set(this.state.inventory.map(g=>g.owner).filter(Boolean))].sort(),o=[...new Set(this.state.inventory.map(g=>g.label).filter(Boolean))].sort(),r=[...new Set(this.state.inventory.map(g=>g.storageLocation).filter(Boolean))].sort(),a=this.getFilteredInventory(),n=this.state.sortBy||"dateDesc";a.sort((g,f)=>{if(n==="priceDesc")return(f.price||0)-(g.price||0);if(n==="priceAsc")return(g.price||0)-(f.price||0);if(n==="stockDesc")return(f.stock||0)-(g.stock||0);const S=g.created_at?g.created_at.seconds?g.created_at.seconds*1e3:new Date(g.created_at).getTime():0,D=f.created_at?f.created_at.seconds?f.created_at.seconds*1e3:new Date(f.created_at).getTime():0;return n==="dateDesc"?D-S:n==="dateAsc"?S-D:0});const l=this.state.inventory.length,i=a.length,p=a.reduce((g,f)=>{const S=Number(f.stock)||0;return g+(S>0?(parseFloat(f.price)||0)*S:0)},0),c=a.filter(g=>(g.stock||0)>0).length,u=a.filter(g=>g.discogs_listing_id).length,d=[];if(this.state.filterStock==="inStock"&&d.push({key:"filterStock",label:"Solo en Stock",icon:"ph-check-circle"}),this.state.filterStock==="outOfStock"&&d.push({key:"filterStock",label:"Solo Agotados",icon:"ph-x-circle"}),this.state.filterDiscogs==="yes"&&d.push({key:"filterDiscogs",label:"En Discogs",icon:"ph-disc"}),this.state.filterDiscogs==="no"&&d.push({key:"filterDiscogs",label:"No en Discogs",icon:"ph-disc"}),this.state.filterCondition==="used"&&d.push({key:"filterCondition",label:"Brugtmoms (Usados)",icon:"ph-recycle"}),this.state.filterCondition==="new"&&d.push({key:"filterCondition",label:"Nuevos",icon:"ph-sparkle"}),this.state.filterGenre!=="all"&&d.push({key:"filterGenre",label:`Género: ${this.state.filterGenre}`,icon:"ph-music-notes"}),this.state.filterLabel!=="all"&&d.push({key:"filterLabel",label:`Sello: ${this.state.filterLabel}`,icon:"ph-vinyl-record"}),this.state.filterOwner!=="all"&&d.push({key:"filterOwner",label:`Dueño: ${this.state.filterOwner}`,icon:"ph-user"}),this.state.filterStorage!=="all"&&d.push({key:"filterStorage",label:`Disquería: ${this.state.filterStorage}`,icon:"ph-tag"}),this.state.filterHero==="yes"&&d.push({key:"filterHero",label:"Destacados",icon:"ph-star"}),this.state.filterHero==="no"&&d.push({key:"filterHero",label:"No Destacados",icon:"ph-star"}),this.state.filterStockTime.length>0){const g={green:"0-2m",orange:"2-4m",red:"4-6m",purple:"+6m"};d.push({key:"filterStockTime",label:`Antigüedad: ${this.state.filterStockTime.map(f=>g[f]).join(", ")}`,icon:"ph-clock",resetValue:"stockTime"})}d.length>0||this.state.inventorySearch.length>0;const y=d.length>0;document.getElementById("inventory-layout-root")||(t.innerHTML=`
    <div id="inventory-layout-root" class="max-w-7xl mx-auto pb-24 md:pb-8 px-4 md:px-8 pt-10">
                    <!--Header -->
                    <div class="sticky top-0 bg-slate-50 z-20 pb-4 pt-4 -mx-4 px-4 md:mx-0 md:px-0">
                         <div class="flex justify-between items-center mb-5">
                            <div>
                                <h2 class="font-display text-2xl font-bold text-brand-dark">Inventario</h2>
                                <p class="text-xs text-slate-400 mt-1" id="inventory-subtitle">${l} discos registrados</p>
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
                                <button onclick="app.openAddVinylModal()" class="bg-brand-dark text-white px-4 h-10 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-dark/20 hover:scale-105 transition-transform">
                                    <i class="ph-bold ph-plus text-lg"></i>
                                    <span class="text-xs font-bold hidden sm:inline">Nuevo</span>
                                </button>
                            </div>
                        </div>

                        <!-- Search Bar -->
                        <div class="relative group mb-4">
                            <i class="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-orange transition-colors text-lg"></i>
                            <input type="text" placeholder="Buscar artista, álbum, sello, SKU..." value="${this.state.inventorySearch}" oninput="app.state.inventorySearch = this.value; app.refreshCurrentView()" class="w-full bg-white border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 text-brand-dark placeholder:text-slate-400 focus:border-brand-orange outline-none transition-colors font-medium shadow-sm">
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
                            <p class="text-xs font-bold text-slate-400" id="inventory-results-count">${a.length} resultado${a.length!==1?"s":""}</p>
                            <div class="hidden lg:flex items-center gap-2">
                                <button onclick="app.state.viewMode='list'; app.refreshCurrentView()" class="p-2 rounded-lg transition-colors ${this.state.viewMode!=="grid"?"bg-brand-dark text-white":"bg-white text-slate-400 border border-slate-200"}"><i class="ph-bold ph-list-dashes text-sm"></i></button>
                                <button onclick="app.state.viewMode='grid'; app.refreshCurrentView()" class="p-2 rounded-lg transition-colors ${this.state.viewMode==="grid"?"bg-brand-dark text-white":"bg-white text-slate-400 border border-slate-200"}"><i class="ph-bold ph-squares-four text-sm"></i></button>
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
    `);const m=document.getElementById("inventory-kpi-container");if(m){const g=y?'<span class="ml-1.5 text-[9px] bg-orange-100 text-brand-orange px-1.5 py-0.5 rounded-full font-bold"><i class="ph-bold ph-funnel text-[8px]"></i> Filtrado</span>':"";m.innerHTML=`
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Discos ${g}</p>
                    <p class="text-xl font-bold text-brand-dark font-display mt-1">${i}${y?` <span class="text-xs text-slate-400 font-normal">/ ${l}</span>`:""}</p>
                </div>
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total ${g}</p>
                    <p class="text-xl font-bold text-brand-orange font-display mt-1">${this.formatCurrency(p)}</p>
                </div>
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Stock ${g}</p>
                    <p class="text-xl font-bold text-emerald-600 font-display mt-1">${c} <span class="text-xs text-slate-400 font-normal">/ ${i}</span></p>
                </div>
                <div class="kpi-card">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Discogs ${g}</p>
                    <p class="text-xl font-bold text-purple-600 font-display mt-1">${u} <span class="text-xs text-slate-400 font-normal">/ ${i}</span></p>
                </div>
            `}const E=document.getElementById("inventory-filters-container");E&&(E.innerHTML=`
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

                <div class="h-6 w-px bg-slate-200 mx-1"></div>

                <!-- Quick Filter Pills -->
                <button onclick="app.toggleQuickFilter('filterStock', 'inStock')" class="quick-pill ${this.state.filterStock==="inStock"?"active":""}">
                    <i class="ph-bold ph-check-circle text-xs"></i> En Stock
                </button>
                <button onclick="app.toggleQuickFilter('filterStock', 'outOfStock')" class="quick-pill ${this.state.filterStock==="outOfStock"?"active":""}">
                    <i class="ph-bold ph-x-circle text-xs"></i> Agotados
                </button>
                <button onclick="app.toggleQuickFilter('filterDiscogs', 'yes')" class="quick-pill ${this.state.filterDiscogs==="yes"?"active":""}">
                    <i class="ph-bold ph-disc text-xs"></i> Discogs
                </button>
                <button onclick="app.toggleQuickFilter('filterCondition', 'used')" class="quick-pill ${this.state.filterCondition==="used"?"active":""}">
                    <i class="ph-bold ph-recycle text-xs"></i> Brugtmoms
                </button>
                <button onclick="app.toggleQuickFilter('filterCondition', 'new')" class="quick-pill ${this.state.filterCondition==="new"?"active":""}">
                    <i class="ph-bold ph-sparkle text-xs"></i> Nuevos
                </button>

                <div class="h-6 w-px bg-slate-200 mx-1"></div>

                <!-- Advanced Filters button -->
                <button onclick="app.toggleAdvancedFilters()" class="quick-pill ${y&&d.some(g=>["filterGenre","filterLabel","filterOwner","filterStorage","filterHero","filterStockTime"].includes(g.key))?"active":""}">
                    <i class="ph-bold ph-sliders-horizontal text-xs"></i> Más Filtros
                    ${(()=>{const g=d.filter(f=>["filterGenre","filterLabel","filterOwner","filterStorage","filterHero","filterStockTime"].includes(f.key)).length;return g>0?`<span class="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[10px]">${g}</span>`:""})()}
                </button>

                <!-- Stats Toggle -->
                <button onclick="app.toggleStats()" class="quick-pill ${this.state.showStats?"active":""}">
                    <i class="ph-bold ph-chart-bar text-xs"></i> Estadísticas
                </button>
            `);const $=document.getElementById("inventory-active-tags");$&&(d.length>0?$.innerHTML=`
                    <div class="flex flex-wrap items-center gap-2 mt-2 animate-fade-in">
                        ${d.map(g=>`
                            <span class="active-tag">
                                <i class="ph-bold ${g.icon} text-[10px]"></i>
                                ${g.label}
                                <span class="tag-remove" onclick="app.clearSingleFilter('${g.key}'${g.resetValue?", '"+g.resetValue+"'":""})">
                                    <i class="ph-bold ph-x"></i>
                                </span>
                            </span>
                        `).join("")}
                        <button onclick="app.clearAllFilters()" class="active-tag hover:!bg-red-100 hover:!border-red-300 hover:!text-red-600" style="background:#fee2e2;border-color:#fca5a5;color:#ef4444;">
                            <i class="ph-bold ph-x text-[10px]"></i> Limpiar todo (${d.length})
                        </button>
                    </div>
                `:$.innerHTML="");const b=document.getElementById("advanced-filters-content");b&&(b.innerHTML=`
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Género</label>
                    <select onchange="app.state.filterGenre = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los géneros</option>
                        ${e.map(g=>`<option value="${g}" ${this.state.filterGenre===g?"selected":""}>${g}</option>`).join("")}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Sello</label>
                    <select onchange="app.state.filterLabel = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los sellos</option>
                        ${o.map(g=>`<option value="${g}" ${this.state.filterLabel===g?"selected":""}>${g}</option>`).join("")}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Dueño</label>
                    <select onchange="app.state.filterOwner = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los dueños</option>
                        ${s.map(g=>`<option value="${g}" ${this.state.filterOwner===g?"selected":""}>${g}</option>`).join("")}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Disquería</label>
                    <select onchange="app.state.filterStorage = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todas las disquerías</option>
                        ${r.map(g=>`<option value="${g}" ${this.state.filterStorage===g?"selected":""}>${g}</option>`).join("")}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Héroe / Destacado</label>
                    <select onchange="app.state.filterHero = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all" ${(this.state.filterHero||"all")==="all"?"selected":""}>Todos</option>
                        <option value="yes" ${this.state.filterHero==="yes"?"selected":""}>🌟 Destacados</option>
                        <option value="no" ${this.state.filterHero==="no"?"selected":""}>➖ Normales</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Antigüedad en Stock</label>
                    <div class="flex items-center gap-3">
                        <button onclick="app.toggleStockTimeFilter('green'); " class="flex items-center gap-2 px-3 py-2 rounded-xl border ${this.state.filterStockTime.includes("green")?"border-emerald-500 bg-emerald-50 text-emerald-700":"border-slate-200 bg-white text-slate-500"} hover:border-emerald-400 transition-all text-xs font-bold">
                            <span class="w-3 h-3 rounded-full bg-emerald-500"></span> 0-2m
                        </button>
                        <button onclick="app.toggleStockTimeFilter('orange'); " class="flex items-center gap-2 px-3 py-2 rounded-xl border ${this.state.filterStockTime.includes("orange")?"border-orange-500 bg-orange-50 text-orange-700":"border-slate-200 bg-white text-slate-500"} hover:border-orange-400 transition-all text-xs font-bold">
                            <span class="w-3 h-3 rounded-full bg-orange-500"></span> 2-4m
                        </button>
                        <button onclick="app.toggleStockTimeFilter('red'); " class="flex items-center gap-2 px-3 py-2 rounded-xl border ${this.state.filterStockTime.includes("red")?"border-red-500 bg-red-50 text-red-700":"border-slate-200 bg-white text-slate-500"} hover:border-red-400 transition-all text-xs font-bold">
                            <span class="w-3 h-3 rounded-full bg-red-500"></span> 4-6m
                        </button>
                        <button onclick="app.toggleStockTimeFilter('purple'); " class="flex items-center gap-2 px-3 py-2 rounded-xl border ${this.state.filterStockTime.includes("purple")?"border-purple-500 bg-purple-50 text-purple-700":"border-slate-200 bg-white text-slate-500"} hover:border-purple-400 transition-all text-xs font-bold">
                            <span class="w-3 h-3 rounded-full bg-purple-500"></span> +6m
                        </button>
                    </div>
                </div>
            `);const v=document.getElementById("inventory-stats-section");if(v)if(this.state.showStats){const g={};a.forEach(P=>{const j=[P.genre,P.genre2,P.genre3,P.genre4,P.genre5].filter(Boolean),K=[];j.forEach(x=>{K.push(...x.split(",").map(M=>M.trim()).filter(Boolean))});const Q=[...new Set(K)],Z=Q.filter(x=>x.toLowerCase()!=="electronic");(Z.length>0?Z:Q.length>0?Q:["Otros"]).forEach(x=>{g[x]=(g[x]||0)+1})});const f=Object.entries(g).sort((P,j)=>j[1]-P[1]).slice(0,10),S=f.length>0?f[0][1]:1,D=["#F05A28","#e04d1c","#f97316","#fb923c","#fdba74","#8b5cf6","#a78bfa","#3b82f6","#60a5fa","#22c55e"],T=a.reduce((P,j)=>{const K=Number(j.stock)||0;return P+(K>0?(parseFloat(j.price)||0)*K:0)},0),L=a.reduce((P,j)=>{const K=Number(j.stock)||0;return P+(K<=0&&parseFloat(j.price)||0)},0),q=Math.max(T,L,1);v.innerHTML=`
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <!-- Genre Distribution -->
                        <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                            <h4 class="font-bold text-brand-dark text-sm mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-music-notes-simple text-brand-orange"></i> Distribución por Género
                                <span class="text-[10px] text-slate-400 font-normal">(Top 10)</span>
                            </h4>
                            <div class="space-y-2.5">
                                ${f.map(([P,j],K)=>`
                                    <div>
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="text-xs font-bold text-slate-600 truncate max-w-[160px]">${P}</span>
                                            <span class="text-xs font-bold text-slate-400">${j}</span>
                                        </div>
                                        <div class="stat-bar-track">
                                            <div class="stat-bar-fill" style="width: ${Math.max(j/S*100,8)}%; background: ${D[K%D.length]};"></div>
                                        </div>
                                    </div>
                                `).join("")}
                                ${f.length===0?'<p class="text-xs text-slate-400 text-center py-4">Sin datos</p>':""}
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
                                        <span class="text-sm font-bold text-brand-dark font-display">${this.formatCurrency(T)}</span>
                                    </div>
                                    <div class="stat-bar-track">
                                        <div class="stat-bar-fill" style="width: ${Math.max(T/q*100,5)}%; background: linear-gradient(90deg, #22c55e, #4ade80);"></div>
                                    </div>
                                </div>
                                <div>
                                    <div class="flex justify-between items-center mb-1.5">
                                        <span class="text-xs font-bold text-slate-500 flex items-center gap-1.5"><i class="ph-fill ph-shopping-cart text-sm"></i> Vendido (Agotado)</span>
                                        <span class="text-sm font-bold text-brand-dark font-display">${this.formatCurrency(L)}</span>
                                    </div>
                                    <div class="stat-bar-track">
                                        <div class="stat-bar-fill" style="width: ${Math.max(L/q*100,5)}%; background: linear-gradient(90deg, #94a3b8, #cbd5e1);"></div>
                                    </div>
                                </div>
                                <div class="pt-3 border-t border-slate-100">
                                    <div class="flex justify-between items-center">
                                        <span class="text-xs font-bold text-slate-400">Valor Total Registrado</span>
                                        <span class="text-lg font-bold text-brand-orange font-display">${this.formatCurrency(T+L)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `,v.classList.add("open")}else v.classList.remove("open");const k=document.getElementById("inventory-results-count");k&&(k.textContent=`${a.length} resultado${a.length!==1?"s":""}`);const I=document.getElementById("inventory-subtitle");I&&(I.textContent=`${l} discos registrados`),this.renderInventoryCart();const C=document.getElementById("inventory-content-container");C&&this.renderInventoryContent(C,a,e,s,r)},getTimeInStockCategory(t){if(!t)return"unknown";const e=t.seconds?new Date(t.seconds*1e3):new Date(t);if(isNaN(e.getTime()))return"unknown";const o=Math.abs(new Date-e),a=Math.ceil(o/(1e3*60*60*24))/30.44;return a<=2?"green":a<=4?"orange":a<=6?"red":"purple"},getTimeInStockBadge(t){switch(t){case"green":return'<span class="w-3 h-3 block rounded-full bg-emerald-500 shadow-sm" title="Antigüedad: 0 a 2 meses"></span>';case"orange":return'<span class="w-3 h-3 block rounded-full bg-orange-500 shadow-sm" title="Antigüedad: 2 a 4 meses"></span>';case"red":return'<span class="w-3 h-3 block rounded-full bg-red-500 shadow-sm" title="Antigüedad: 4 a 6 meses"></span>';case"purple":return'<span class="w-3 h-3 block rounded-full bg-purple-500 shadow-sm" title="Antigüedad: Más de 6 meses"></span>';default:return'<span class="w-3 h-3 block rounded-full bg-slate-300 shadow-sm" title="Antigüedad: Desconocida"></span>'}},toggleStockTimeFilter(t){const e=this.state.filterStockTime.indexOf(t);e===-1?this.state.filterStockTime.push(t):this.state.filterStockTime.splice(e,1),this.refreshCurrentView()},toggleQuickFilter(t,e){this.state[t]===e?this.state[t]="all":this.state[t]=e,this.refreshCurrentView()},toggleAdvancedFilters(){this.state.showAdvancedFilters=!this.state.showAdvancedFilters;const t=document.getElementById("advanced-filters-backdrop"),e=document.getElementById("advanced-filters-panel");t&&e&&(this.state.showAdvancedFilters?(t.classList.add("open"),e.classList.add("open")):(t.classList.remove("open"),e.classList.remove("open")))},toggleStats(){this.state.showStats=!this.state.showStats;const t=document.getElementById("inventory-stats-section");t&&(this.state.showStats?t.classList.add("open"):t.classList.remove("open")),this.refreshCurrentView()},clearSingleFilter(t,e){e==="stockTime"?this.state.filterStockTime=[]:this.state[t]=e!==void 0?e:"all",this.refreshCurrentView()},clearAllFilters(){this.state.filterGenre="all",this.state.filterOwner="all",this.state.filterLabel="all",this.state.filterStorage="all",this.state.filterDiscogs="all",this.state.filterHero="all",this.state.filterStock="all",this.state.filterCondition="all",this.state.filterStockTime=[],this.refreshCurrentView()},getStatusBadge(t){return`<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${{NM:"bg-green-100 text-green-700 border-green-200","VG+":"bg-blue-100 text-blue-700 border-blue-200",VG:"bg-yellow-100 text-yellow-700 border-yellow-200",G:"bg-orange-100 text-orange-700 border-orange-200",B:"bg-red-100 text-red-700 border-red-200",S:"bg-purple-100 text-purple-700 border-purple-200"}[t]||"bg-slate-100 text-slate-600 border-slate-200"}"> ${t}</span> `},renderCharts(t,e){const s=this.state.filterMonths;this.state.filterYear;const o=[],r=[],a=[];s.forEach(l=>{o.push(this.getMonthName(l).substring(0,3));const i=t.filter(c=>new Date(c.date).getMonth()===l).reduce((c,u)=>c+u.total,0),p=e.filter(c=>new Date(c.date).getMonth()===l).reduce((c,u)=>c+u.amount,0);r.push(i),a.push(p)});const n={};t.forEach(l=>{n[l.genre]=(n[l.genre]||0)+l.quantity}),new Chart(document.getElementById("financeChart"),{type:"bar",data:{labels:o,datasets:[{label:"Ventas",data:r,backgroundColor:"#F05A28",borderRadius:6},{label:"Gastos",data:a,backgroundColor:"#94a3b8",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom"}},scales:{y:{grid:{color:"#f1f5f9"},beginAtZero:!0},x:{grid:{display:!1}}}}})},renderDashboardCharts(t=[],e=[],s=[]){var y,m,E,$,b;const o=t,r=(y=document.getElementById("last30DaysChart"))==null?void 0:y.getContext("2d");r&&(this.last30ChartInstance&&this.last30ChartInstance.destroy(),this.last30ChartInstance=new Chart(r,{type:"line",data:{labels:e,datasets:[{label:"Ventas ($)",data:s,borderColor:"#F05A28",backgroundColor:v=>{const k=v.chart,{ctx:I,chartArea:C}=k;if(!C)return null;const g=I.createLinearGradient(0,C.top,0,C.bottom);return g.addColorStop(0,"rgba(240, 90, 40, 0.2)"),g.addColorStop(1,"rgba(240, 90, 40, 0)"),g},borderWidth:3,fill:!0,tension:.4,pointRadius:0,pointHoverRadius:6,pointBackgroundColor:"#F05A28",pointBorderColor:"#fff",pointBorderWidth:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{mode:"index",intersect:!1,backgroundColor:"#1e293b",titleFont:{size:10},bodyFont:{size:12,weight:"bold"},padding:12,cornerRadius:12,displayColors:!1,callbacks:{label:v=>this.formatCurrency(v.parsed.y)}}},scales:{y:{beginAtZero:!0,grid:{color:"#f8fafc"},ticks:{font:{size:10},color:"#94a3b8"}},x:{grid:{display:!1},ticks:{font:{size:10},color:"#94a3b8",autoSkip:!0,maxRotation:0,callback:function(v,k){return k%5===0?this.getLabelForValue(v):""}}}},interaction:{mode:"index",intersect:!1}}}));const a=(v,k)=>({type:"doughnut",data:{labels:Object.keys(v),datasets:[{data:Object.values(v),backgroundColor:["#F05A28","#FDE047","#8b5cf6","#10b981","#f43f5e","#64748b"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{boxWidth:10,font:{size:10}}}}}}),n={};o.forEach(v=>{const k=v.genre||"Otros";let I=Number(v.quantity)||0;I===0&&v.items&&Array.isArray(v.items)&&(I=v.items.reduce((C,g)=>C+(Number(g.qty||g.quantity)||1),0)),I<=0&&(I=1),n[k]=(n[k]||0)+Number(I)}),this.genreChartInstance&&this.genreChartInstance.destroy();const l=(m=document.getElementById("genreChart"))==null?void 0:m.getContext("2d");l&&(this.genreChartInstance=new Chart(l,a(n)));const i={};o.forEach(v=>{const k=v.paymentMethod||"Otros";let I=Number(v.quantity)||0;I===0&&v.items&&Array.isArray(v.items)&&(I=v.items.reduce((C,g)=>C+(Number(g.qty||g.quantity)||1),0)),I<=0&&(I=1),i[k]=(i[k]||0)+Number(I)}),this.paymentChartInstance&&this.paymentChartInstance.destroy();const p=(E=document.getElementById("paymentChart"))==null?void 0:E.getContext("2d");p&&(this.paymentChartInstance=new Chart(p,a(i)));const c={};o.forEach(v=>{const k=v.channel||"Tienda";let I=Number(v.quantity)||0;I===0&&v.items&&Array.isArray(v.items)&&(I=v.items.reduce((C,g)=>C+(Number(g.qty||g.quantity)||1),0)),I<=0&&(I=1),c[k]=(c[k]||0)+Number(I)}),this.channelChartInstance&&this.channelChartInstance.destroy();const u=($=document.getElementById("channelChart"))==null?void 0:$.getContext("2d");u&&(this.channelChartInstance=new Chart(u,a(c)));const d=(b=document.getElementById("salesTrendChart"))==null?void 0:b.getContext("2d");if(d){const v=new Array(31).fill(0).map((I,C)=>C+1),k=new Array(31).fill(0);o.forEach(I=>{const C=new Date(I.date);isNaN(C.getDate())||(k[C.getDate()-1]+=parseFloat(I.total)||0)}),this.trendChartInstance&&this.trendChartInstance.destroy(),this.trendChartInstance=new Chart(d,{type:"line",data:{labels:v,datasets:[{label:"Ventas ($)",data:k,borderColor:"#F05A28",backgroundColor:"rgba(240, 90, 40, 0.1)",borderWidth:3,fill:!0,tension:.4,pointRadius:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,grid:{color:"#f1f5f9"}},x:{grid:{display:!1}}}}})}},updateFilter(t,e){if(t==="month"){const s=parseInt(e);this.state.filterMonth=s,this.state.filterMonths=[s]}t==="year"&&(this.state.filterYear=parseInt(e)),this.renderDashboard(document.getElementById("app-content"))},renderSales(t){var $;const e=new Date().toISOString().split("T")[0],s=new Date(Date.now()-864e5).toISOString().split("T")[0],o=this.state.sales.filter(b=>b.date===e).reduce((b,v)=>b+(parseFloat(v.total)||0),0),r=this.state.sales.filter(b=>b.date===s).reduce((b,v)=>b+(parseFloat(v.total)||0),0),a=this.state.sales.filter(b=>b.fulfillment_status==="preparing"||b.status==="paid"||b.channel==="Discogs"&&b.status!=="shipped").length,n=this.state.filterYear,l=this.state.filterMonths,i=(($=document.getElementById("sales-payment-filter"))==null?void 0:$.value)||"all",c=this.state.salesHistorySearch.toLowerCase().split(" ").filter(b=>b.length>0),u=this.state.orderFeedFilter||"all",d=this.state.sales.filter(b=>{const v=new Date(b.date),k=v.getFullYear()===n&&l.includes(v.getMonth()),I=i==="all"||b.paymentMethod===i;let C=!0;c.length>0&&(C=c.every(f=>{const S=Array.isArray(b.items)&&b.items.some(T=>{var K,Q,Z,ae;const L=(T.album||((K=T.record)==null?void 0:K.album)||"").toLowerCase(),q=(T.artist||((Q=T.record)==null?void 0:Q.artist)||"").toLowerCase(),P=(T.label||((Z=T.record)==null?void 0:Z.label)||"").toLowerCase(),j=(T.sku||((ae=T.record)==null?void 0:ae.sku)||"").toLowerCase();return L.includes(f)||q.includes(f)||P.includes(f)||j.includes(f)}),D=(b.album||"").toLowerCase().includes(f)||(b.sku||"").toLowerCase().includes(f)||(b.customerName||"").toLowerCase().includes(f)||(b.orderNumber||"").toLowerCase().includes(f);return S||D}));let g=!0;return u==="to_ship"?g=b.status!=="shipped"&&b.source!=="STORE":u==="completed"?g=b.status==="shipped":u==="store"&&(g=b.source==="STORE"),k&&I&&C&&g}),y=d.reduce((b,v)=>b+(parseFloat(v.total)||0),0),m=d.length>0?y/d.length:0,E=`
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
                            ${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((b,v)=>`
                                <button onclick="app.toggleMonthFilter(${v})" 
                                    class="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${l.includes(v)?"bg-brand-dark text-white":"bg-slate-50 text-slate-400 hover:bg-slate-100"}">
                                    ${b}
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
                        <h3 class="text-2xl font-display font-bold text-brand-dark mb-1">${this.formatCurrency(m)}</h3>
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
                                ${["El Cuartito",...this.state.consignors.map(b=>b.name)].map(b=>{const v=this.state.inventory.filter(k=>k.owner===b).reduce((k,I)=>k+I.stock,0);return`
                                        <div class="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                            <span class="text-xs font-bold text-slate-600 truncate mr-2">${b}</span>
                                            <span class="bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-slate-400">${v}</span>
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
                            ${[{id:"all",label:"Todos",icon:"ph-list"},{id:"to_ship",label:"Por Enviar",icon:"ph-package"},{id:"completed",label:"Completados",icon:"ph-check-circle"},{id:"store",label:"Tienda Física",icon:"ph-storefront"}].map(b=>`
                                <button onclick="app.updateOrderFeedFilter('${b.id}')" 
                                    class="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all ${u===b.id?"bg-white text-brand-dark shadow-sm ring-1 ring-slate-200":"text-slate-400 hover:text-slate-600"}">
                                    <i class="ph-bold ${b.icon} ${u===b.id?"text-brand-orange":""}"></i>
                                    ${b.label.toUpperCase()}
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
                                <option value="all" ${i==="all"?"selected":""}>Todos Pagos</option>
                                <option value="MobilePay" ${i==="MobilePay"?"selected":""}>MobilePay</option>
                                <option value="Efectivo" ${i==="Efectivo"?"selected":""}>Efectivo</option>
                                <option value="Tarjeta" ${i==="Tarjeta"?"selected":""}>Tarjeta</option>
                            </select>
                        </div>

                        <!-- Feed List -->
                        <div class="space-y-3 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar pb-10">
                            ${d.map(b=>{const v=b.status==="shipped",k=b.status==="paid"||b.source==="STORE"||b.paymentMethod!=="Pending",I=b.channel==="Discogs",C=b.source==="STORE",g=b.items&&b.items.length>0?b.items[0]:{album:b.album||"Venta Manual",artist:b.artist||"Desconocido"},f=b.items&&b.items.length>1?b.items.length-1:0;return`
                                <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all cursor-pointer group flex items-center gap-4 relative" onclick="app.openUnifiedOrderDetailModal('${b.id}')">
                                    <!-- Source Icon -->
                                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${I?"bg-slate-900 text-white":C?"bg-orange-100 text-brand-orange":"bg-blue-100 text-blue-600"}">
                                        <i class="ph-bold ${I?"ph-disc":C?"ph-storefront":"ph-globe"} text-xl"></i>
                                    </div>

                                    <!-- Details -->
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-0.5">
                                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${this.formatDate(b.date)}</span>
                                            <div class="h-1 w-1 rounded-full bg-slate-200"></div>
                                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${b.paymentMethod}</span>
                                        </div>
                                        <h4 class="font-bold text-brand-dark truncate pr-2">
                                            ${g.album} 
                                            ${f>0?`<span class="text-brand-orange font-medium text-xs ml-1">y ${f} más</span>`:""}
                                        </h4>
                                        
                                        <!-- Status Badges -->
                                        <div class="flex items-center gap-2 mt-2">
                                            <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${k?"bg-emerald-50 text-emerald-600":"bg-amber-50 text-amber-600"}">
                                                ${k?"Pagado":"Pendiente"}
                                            </span>
                                            <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${v?"bg-slate-100 text-slate-500":"bg-rose-50 text-rose-500"}">
                                                ${v?"Enviado":"Por Enviar"}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Economic Breakdown -->
                                    <div class="text-right shrink-0 border-l border-slate-50 pl-4 py-1">
                                        <p class="font-display font-bold text-brand-dark text-base">${this.formatCurrency(b.total)}</p>
                                        ${b.shipping_cost>0?`<p class="text-[10px] text-slate-400 font-bold">Envío: ${this.formatCurrency(b.shipping_cost)}</p>`:""}
                                    </div>

                                    <!-- Quick Action -->
                                    <div class="relative ml-2" onclick="event.stopPropagation()">
                                        <button onclick="app.toggleOrderActionMenu('${b.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-50 text-slate-300 hover:text-brand-dark transition-colors flex items-center justify-center">
                                            <i class="ph-bold ph-dots-three-vertical text-xl"></i>
                                        </button>
                                        
                                        <!-- Dropdown (Hidden by default) -->
                                        <div id="action-menu-${b.id}" class="hidden absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 z-[100] p-2 space-y-1">
                                            <button onclick="app.openInvoiceModal('${b.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                <i class="ph ph-file-text text-blue-500"></i> Ver Factura
                                            </button>
                                            <button onclick="app.openInvoiceModal('${b.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                <i class="ph ph-printer text-indigo-500"></i> Imprimir Etiqueta
                                            </button>
                                            ${v?"":`
                                                <button onclick="app.markOrderAsShipped('${b.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                    <i class="ph ph-truck text-emerald-500"></i> Marcar Enviado
                                                </button>
                                            `}
                                            <div class="h-px bg-slate-100 mx-2 my-1"></div>
                                            <button onclick="app.deleteSale('${b.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors">
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
        `;if(t.innerHTML=E,this.state.salesHistorySearch){const b=document.getElementById("sales-history-search");if(b){b.focus();const v=b.value;b.value="",b.value=v}}},renderSalesCartWidget(){return`
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
        `},updatePOSCondition(t){this.state.posCondition=t,this.renderSales(document.getElementById("app-content"))},selectPOSPayment(t){const e=document.getElementById("input-payment-method");e&&(e.value=t),["MobilePay","Tarjeta","Efectivo"].forEach(s=>{const o=document.getElementById(`pay-${s}`);if(o)if(s===t){o.classList.add("border-brand-dark","bg-slate-50","ring-2","ring-brand-dark/10"),o.classList.remove("border-slate-100","bg-white");const r=o.querySelector("i"),a=o.querySelector("span");r&&(r.classList.add(s==="MobilePay"?"text-blue-500":s==="Tarjeta"?"text-indigo-500":"text-emerald-500"),r.classList.remove("text-slate-400")),a&&(a.classList.add(s==="MobilePay"?"text-blue-600":s==="Tarjeta"?"text-indigo-600":"text-emerald-600"),a.classList.remove("text-slate-500"))}else{o.classList.remove("border-brand-dark","bg-slate-50","ring-2","ring-brand-dark/10"),o.classList.add("border-slate-100","bg-white");const r=o.querySelector("i"),a=o.querySelector("span");r&&(r.className=r.className.replace(/text-(blue|indigo|emerald)-500/g,"text-slate-400")),a&&(a.className=a.className.replace(/text-(blue|indigo|emerald)-600/g,"text-slate-500"))}})},async handleQuickPOSAction(){const t=document.getElementById("btn-pos-action"),e=document.getElementById("input-sku"),s=document.getElementById("input-price"),o=document.getElementById("input-payment-method"),r=document.getElementById("input-artist"),a=document.getElementById("input-album"),n=document.getElementById("input-cost"),l=document.getElementById("input-cost-pos"),i=e==null?void 0:e.value,p=parseFloat(s==null?void 0:s.value),c=(o==null?void 0:o.value)||"MobilePay",u=r==null?void 0:r.value,d=a==null?void 0:a.value,y=this.state.posCondition==="Used";let m=parseFloat(n==null?void 0:n.value)||0;if(y){const E=parseFloat(l==null?void 0:l.value);isNaN(E)||(m=E)}if(!p||isNaN(p)){this.showToast("⚠️ Debes ingresar un precio válido","error");return}if(!i&&!this.state.manualSaleSearch){this.showToast("⚠️ Debes buscar un producto o ingresar un nombre","error");return}try{t&&(t.disabled=!0,t.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Procesando...');const E=this.state.inventory.find(b=>b.sku===i),$={items:[{recordId:E?E.id:"manual-"+Date.now(),quantity:1,unitPrice:p,costAtSale:m,artist:u||"Desconocido",album:d||this.state.manualSaleSearch||"Venta Manual",sku:i||"N/A",providerOrigin:(E==null?void 0:E.provider_origin)||"Local_Used",productCondition:(E==null?void 0:E.product_condition)||this.state.posCondition||"New"}],paymentMethod:c,customerName:"Venta Mostrador",total_amount:p,source:"STORE",channel:"tienda",condition:this.state.posCondition||"New",timestamp:firebase.firestore.FieldValue.serverTimestamp()};await ve.createSale($),this.showToast("✅ Venta registrada correctamente"),this.printTicket($),this.state.manualSaleSearch="",this.state.posSelectedItemSku=null,this.loadData()}catch(E){console.error("POS Action Error:",E),this.showToast("❌ Error: "+E.message,"error")}finally{t&&(t.disabled=!1,t.innerHTML='<i class="ph-bold ph-printer text-xl"></i> Cobrar e Imprimir Ticket')}},printTicket(t){const e=window.open("","_blank","width=300,height=600");if(!e){this.showToast("⚠️ El bloqueador de ventanas emergentes impidió imprimir el ticket","warning");return}const s=t.items[0];e.document.write(`
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
        `),e.document.close()},updateOrderFeedFilter(t){this.state.orderFeedFilter=t,this.renderSales(document.getElementById("app-content"))},toggleOrderActionMenu(t){const e=document.getElementById(`action-menu-${t}`);document.querySelectorAll('[id^="action-menu-"]').forEach(s=>{s.id!==`action-menu-${t}`&&s.classList.add("hidden")}),e&&e.classList.toggle("hidden")},async markOrderAsShipped(t){try{await _.collection("sales").doc(t).update({status:"shipped",fulfillment_status:"fulfilled",shipped_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast("✅ Pedido marcado como enviado"),this.loadData()}catch(e){console.error("Error marking order as shipped:",e),this.showToast("❌ Error al actualizar estado","error")}},searchSku(t){this.state.manualSaleSearch=t;const e=document.getElementById("sku-results");if(t.length<2){e.classList.add("hidden");return}const s=this.state.inventory.filter(o=>o.artist.toLowerCase().includes(t.toLowerCase())||o.album.toLowerCase().includes(t.toLowerCase())||o.sku.toLowerCase().includes(t.toLowerCase()));s.length>0?(e.innerHTML=s.map(o=>`
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
    `).join(""),e.classList.remove("hidden")):e.classList.add("hidden")},selectSku(t){const e=this.state.inventory.find(s=>s.id===t||s.sku===t);e&&(this.state.posSelectedItemSku=e.sku,this.renderSales(document.getElementById("app-content")),setTimeout(()=>{const s=document.getElementById("input-price"),o=document.getElementById("input-sku"),r=document.getElementById("input-cost"),a=document.getElementById("input-artist"),n=document.getElementById("input-album"),l=document.getElementById("input-genre"),i=document.getElementById("input-owner"),p=document.getElementById("sku-search");s&&(s.value=e.price),o&&(o.value=e.sku),r&&(r.value=e.cost||0),a&&(a.value=e.artist),n&&(n.value=e.album),l&&(l.value=e.genre),i&&(i.value=e.owner),p&&(p.value=`${e.artist} - ${e.album}`,this.state.manualSaleSearch=p.value);const c=document.getElementById("sku-results");c&&c.classList.add("hidden")},50),e.stock<=0&&this.showToast("⚠️ Este producto no tiene stock disponible","warning"))},updateTotal(){const t=parseFloat(document.getElementById("input-price").value)||0,e=parseInt(document.getElementById("input-qty").value)||1,s=t*e;document.getElementById("form-total").innerText=this.formatCurrency(s)},openAddVinylModal(t=null){let e={sku:"",artist:"",album:"",genre:"Minimal",condition:"NM",provider_origin:"EU_B2B",acquisition_date:"",item_phantom_vat:0,item_real_vat:0,price:"",cost:"",stock:1,owner:"El Cuartito"},s=!1;if(t){const a=this.state.inventory.find(n=>n.id===t||n.sku===t);a&&(e=a,s=!0)}if(!s){const a=this.state.inventory.map(l=>{const i=l.sku.match(/^SKU\s*-\s*(\d+)/);return i?parseInt(i[1]):0}),n=Math.max(0,...a);e.sku=`SKU-${String(n+1).padStart(3,"0")}`}const o=["Minimal","Techno","House","Deep House","Electro"];[...new Set([...o,...this.state.customGenres||[]])];const r=`
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
                            <div class="space-y-3 mb-3">
                                <div class="space-y-1">
                                    <label class="text-[9px] font-bold text-slate-400 uppercase block">Buy Cost</label>
                                    <input name="cost" id="modal-cost" type="number" step="0.5" value="${e.cost||0}" oninput="app.onCostChange()" class="dashboard-input w-full h-10">
                                </div>
                                <div id="multiplier-row" class="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-100">
                                    <i class="ph-bold ph-x text-[10px] text-slate-400"></i>
                                    <input type="number" id="modal-multiplier" step="0.1" min="1" value="${(()=>{const a=parseFloat(e.cost)||0,n=parseFloat(e.price)||0;return a>0&&n>0?(n/a).toFixed(1):a>100?"2.2":"2.5"})()}" oninput="app.applyPriceMultiplier()" class="w-16 text-center font-black text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 focus:border-[#FF6B00] focus:bg-white outline-none transition-all">
                                    <span id="multiplier-label" class="text-[9px] font-bold uppercase tracking-wider ${(parseFloat(e.cost)||0)>100?"text-amber-600":"text-emerald-600"}">${(parseFloat(e.cost)||0)>100?"Disco caro (+100kr)":"Disco barato (≤100kr)"}</span>
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
                                            <option value="Local_Used" ${e.provider_origin==="Local_Used"||!e.provider_origin?"selected":""}>🏪 Local</option>
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
                `;document.body.insertAdjacentHTML("beforeend",r)},openProductModal(t){console.log("Attempting to open modal for:",t);try{const e=this.state.inventory.find(r=>r.id===t||r.sku===t);if(!e){console.error("Item not found:",t),alert("Error: No se encontró el disco. Intenta recargar.");return}const s=document.getElementById("modal-overlay");s&&s.remove();const o=`
                <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-fadeIn" style="animation: fadeIn 0.3s forwards;">

                        <!-- Cover Image Header -->
                        <div class="h-64 w-full bg-slate-100 relative group">
                            ${e.cover_image?`<img src="${e.cover_image}" class="w-full h-full object-cover">`:'<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-fill ph-music-note text-6xl"></i></div>'}
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                            <button onclick="document.getElementById('modal-overlay').remove()" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm">
                                <i class="ph-bold ph-x text-xl"></i>
                            </button>

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
                                    <span class="text-sm font-bold ${e.provider_origin==="EU_B2B"?"text-blue-600":e.provider_origin==="DK_B2B"?"text-emerald-600":"text-brand-dark"}">${e.provider_origin==="EU_B2B"?"🇪🇺 EU B2B":e.provider_origin==="DK_B2B"?"🇩🇰 DK B2B":"🏪 Local"}</span>
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
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openAddVinylModal('${e.id}')" class="flex-1 min-w-[120px] bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/20 text-sm">
                                    <i class="ph-bold ph-pencil-simple"></i>
                                    Editar
                                </button>
                                <button id="refresh-metadata-btn" onclick="app.refreshProductMetadata('${e.id||e.sku}')" 
                                    class="flex-1 min-w-[120px] bg-emerald-50 text-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 border border-emerald-100 text-sm"
                                    title="Actualizar datos desde Discogs">
                                    <i class="ph-bold ph-arrows-clockwise"></i>
                                    Re-sync
                                </button>
                                ${e.discogsUrl?`<a href="${e.discogsUrl}" target="_blank" class="flex-1 min-w-[120px] bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="ph-bold ph-disc"></i> Discogs
                                   </a>`:`<a href="https://www.discogs.com/search/?q=${encodeURIComponent(e.artist+" "+e.album)}&type=release" target="_blank" class="flex-1 min-w-[120px] bg-slate-50 text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="ph-bold ph-magnifying-glass"></i> Buscar
                                   </a>`}
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openTracklistModal('${e.sku}')" class="flex-1 min-w-[120px] bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border border-indigo-100 text-sm">
                                    <i class="ph-bold ph-list-numbers"></i> Tracks
                                </button>
                                <button onclick="app.addToCart('${e.id}'); document.getElementById('modal-overlay').remove()" class="flex-1 min-w-[120px] bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 text-sm">
                                    <i class="ph-bold ph-shopping-cart"></i>
                                    Vender
                                </button>
                                <button onclick="app.deleteVinyl('${e.id}'); document.getElementById('modal-overlay').remove()" class="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm" title="Eliminar Disco">
                                    <i class="ph-bold ph-trash text-xl"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                `;document.body.insertAdjacentHTML("beforeend",o)}catch(e){console.error("Error opening product modal:",e),alert("Hubo un error al abrir la ficha. Por favor recarga la página.")}},calculateMargin(){const t=document.getElementById("modal-cost"),e=document.getElementById("modal-price"),s=document.getElementById("profit-percent"),o=document.getElementById("profit-label");if(!t||!e||!s||!o)return;const r=parseFloat(t.value)||0,a=parseFloat(e.value)||0;if(a>0){const n=a-r,l=n/a*100;s.innerText=`${Math.round(l)}%`,o.innerText=`${n>=0?"+":""}$${n.toFixed(2)}`,n>=0?o.className="profit-tag":o.className="profit-tag bg-red-50 text-red-600 border-red-100"}else s.innerText="0%",o.innerText="+$0.00",o.className="profit-tag"},calculateProfit(){this.calculateMargin()},onCostChange(){const t=document.getElementById("modal-cost"),e=document.getElementById("modal-multiplier"),s=document.getElementById("multiplier-label");if(!t||!e)return;const o=parseFloat(t.value)||0;document.activeElement!==e&&(o>100?(e.value="2.2",s&&(s.textContent="Disco caro (+100kr)",s.className="text-[9px] font-bold uppercase tracking-wider text-amber-600")):(e.value="2.5",s&&(s.textContent="Disco barato (≤100kr)",s.className="text-[9px] font-bold uppercase tracking-wider text-emerald-600"))),this.applyPriceMultiplier(),this.updatePhantomVatPreview()},applyPriceMultiplier(){const t=document.getElementById("modal-cost"),e=document.getElementById("modal-multiplier"),s=document.getElementById("modal-price");if(!t||!e||!s)return;const o=parseFloat(t.value)||0,r=parseFloat(e.value)||1;if(o>0){const a=o*r,n=Math.round(a/5)*5;s.value=n}this.calculateMargin()},onProviderOriginChange(){var r;const t=(r=document.getElementById("modal-provider-origin"))==null?void 0:r.value,e=document.getElementById("acquisition-date-container"),s=document.getElementById("phantom-vat-preview"),o=document.getElementById("real-vat-preview");t==="EU_B2B"?(e==null||e.classList.remove("hidden"),s==null||s.classList.remove("hidden"),o==null||o.classList.add("hidden"),this.updatePhantomVatPreview()):t==="DK_B2B"?(e==null||e.classList.remove("hidden"),s==null||s.classList.add("hidden"),o==null||o.classList.remove("hidden"),this.updatePhantomVatPreview()):(e==null||e.classList.add("hidden"),s==null||s.classList.add("hidden"),o==null||o.classList.add("hidden"))},updatePhantomVatPreview(){var o,r;const t=parseFloat((o=document.getElementById("modal-cost"))==null?void 0:o.value)||0,e=(r=document.getElementById("modal-provider-origin"))==null?void 0:r.value,s=Math.round(t*.25*100)/100;if(e==="EU_B2B"){const a=document.getElementById("phantom-vat-amount");a&&(a.textContent=s.toFixed(2)+" DKK")}else if(e==="DK_B2B"){const a=document.getElementById("real-vat-amount");a&&(a.textContent=s.toFixed(2)+" DKK")}},handleCostChange(){const t=parseFloat(document.getElementById("modal-cost").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),o=document.getElementById("modal-margin"),r=document.getElementById("modal-price");if(s){const a=parseFloat(s)/100;if(a>0){const n=t/a;r.value=Math.ceil(n)}}else{const n=1-(parseFloat(o.value)||0)/100;if(n>0){const l=t/n;r.value=Math.ceil(l)}}},handlePriceChange(){const t=parseFloat(document.getElementById("modal-price").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),o=document.getElementById("modal-margin"),r=document.getElementById("modal-cost"),a=document.getElementById("cost-helper");if(s){const n=parseFloat(s)/100,l=t*n;r.value=Math.round(l),o.value=100-parseFloat(s),o.readOnly=!0,o.classList.add("opacity-50"),a&&(a.innerText=`Consignación: ${s}% Socio`)}else{const n=parseFloat(r.value)||0;if(n>0&&t>0){const l=(t-n)/n*100;o.value=Math.round(l)}o.readOnly=!1,o.classList.remove("opacity-50"),a&&(a.innerText="Modo Propio: Margen variable")}},handleMarginChange(){const t=parseFloat(document.getElementById("modal-margin").value)||0,e=parseFloat(document.getElementById("modal-cost").value)||0,s=document.getElementById("modal-price");if(e>0){const o=e*(1+t/100);s.value=Math.ceil(o)}},checkCustomInput(t,e){const s=document.getElementById(e);t.value==="other"?(s.classList.remove("hidden"),s.querySelector("input").required=!0,s.querySelector("input").focus()):(s.classList.add("hidden"),s.querySelector("input").required=!1)},toggleCollectionNote(t){const e=document.getElementById("collection-note-container");e&&t&&t!==""?e.classList.remove("hidden"):e&&e.classList.add("hidden")},handleCollectionChange(t){var o;const e=document.getElementById("custom-collection-container"),s=document.getElementById("collection-note-container");t==="other"?(e==null||e.classList.remove("hidden"),(o=e==null?void 0:e.querySelector("input"))==null||o.focus()):e==null||e.classList.add("hidden"),t&&t!==""?s==null||s.classList.remove("hidden"):s==null||s.classList.add("hidden")},openAddSaleModal(){const t=this.state.cart.length>0?this.state.cart.map(s=>`
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
                                                    `;document.body.insertAdjacentHTML("beforeend",e),setTimeout(()=>document.getElementById("sku-search").focus(),100)},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(r=>r.id===t||r.sku===t);if(!s)return;if(this.state.cart.filter(r=>r.sku===t).length>=s.stock){this.showToast(`⚠️ No queda más stock de "${s.album}"`,"warning");return}this.openAddSaleModal(),setTimeout(()=>{const r=document.getElementById("sku-search");r.value=t,this.searchSku(t),setTimeout(()=>{const a=document.getElementById("sku-results").firstElementChild;a&&a.click()},500)},200)},openUnifiedOrderDetailModal(t){var y,m,E,$;const e=this.state.sales.find(b=>b.id===t);if(!e)return;const s=this.getCustomerInfo(e),o=e.history||[],r=(y=e.timestamp)!=null&&y.toDate?e.timestamp.toDate():e.date?new Date(e.date):new Date;let a=[];o.length>0?a=o.map(b=>({status:b.status,timestamp:new Date(b.timestamp),note:b.note})).sort((b,v)=>v.timestamp-b.timestamp):a.push({status:e.fulfillment_status||"pending",timestamp:(m=e.updated_at)!=null&&m.toDate?e.updated_at.toDate():e.updated_at?new Date(e.updated_at):new Date,note:"Última actualización"}),a.push({status:"created",timestamp:r,note:`Orden recibida via ${e.channel||e.soldAt||"Sistema"}`});const n=b=>({created:{icon:"ph-shopping-cart",color:"bg-slate-100 text-slate-500",label:"Recibido"},preparing:{icon:"ph-package",color:"bg-blue-100 text-blue-600",label:"En Preparación"},ready_for_pickup:{icon:"ph-storefront",color:"bg-emerald-100 text-emerald-600",label:"Listo para Retiro"},in_transit:{icon:"ph-truck",color:"bg-orange-100 text-orange-600",label:"En Tránsito"},shipped:{icon:"ph-archive",color:"bg-green-100 text-green-600",label:"Despachado"},picked_up:{icon:"ph-check-circle",color:"bg-green-100 text-green-600",label:"Retirado"},completed:{icon:"ph-check-circle",color:"bg-green-100 text-green-600",label:"Confirmado"},failed:{icon:"ph-x-circle",color:"bg-red-100 text-red-600",label:"Fallido"},PENDING:{icon:"ph-clock",color:"bg-yellow-100 text-yellow-600",label:"Pendiente"}})[b]||{icon:"ph-info",color:"bg-slate-100",label:b},l=e.items?e.items.reduce((b,v)=>{var k;return b+(v.unitPrice||v.priceAtSale||((k=v.record)==null?void 0:k.price)||0)*(v.qty||v.quantity||1)},0):e.total||0,i=parseFloat(e.shipping_income||e.shipping_cost||e.shipping||((E=e.shipping_method)==null?void 0:E.price)||0),p=i*.2,c=(e.discogsFee||0)+(e.paypalFee||0),u=e.total_amount||e.total||l+i,d=`
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
                                    <div class="text-xl font-bold">${this.formatCurrency(u)}</div>
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
                                            ${(e.items||[]).map(b=>{var v,k,I,C,g;return`
                                                <tr>
                                                    <td class="px-4 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <img src="${b.image||b.cover_image||((v=b.record)==null?void 0:v.cover_image)||"https://elcuartito.dk/default-vinyl.png"}" class="w-10 h-10 rounded-lg object-cover shadow-sm">
                                                            <div>
                                                                <p class="font-bold text-brand-dark">${b.album||((k=b.record)==null?void 0:k.album)||"Desconocido"}</p>
                                                                <p class="text-[10px] text-slate-500">${b.artist||((I=b.record)==null?void 0:I.artist)||""}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-4 py-4 text-center font-mono text-xs text-slate-400">${b.sku||((C=b.record)==null?void 0:C.sku)||"-"}</td>
                                                    <td class="px-4 py-4 text-center font-medium">${b.quantity||b.qty||1}</td>
                                                    <td class="px-4 py-4 text-right font-bold text-brand-dark">${this.formatCurrency(b.unitPrice||b.priceAtSale||((g=b.record)==null?void 0:g.price)||0)}</td>
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
                                            <span class="font-medium text-brand-dark">${this.formatCurrency(l)}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-slate-500">Envío (Gross)</span>
                                            <span class="font-medium text-brand-dark">${this.formatCurrency(i)}</span>
                                        </div>
                                        <div class="flex justify-between text-blue-600 text-[10px] font-bold">
                                            <span>↳ Salgsmoms Envío (25%)</span>
                                            <span>${this.formatCurrency(p)}</span>
                                        </div>
                                        ${c!==0?`
                                            <div class="flex justify-between text-red-500">
                                                <span>Fees (Discogs/PayPal)</span>
                                                <span class="font-medium">-${this.formatCurrency(c)}</span>
                                            </div>
                                        `:""}
                                        <div class="flex justify-between font-bold text-brand-dark pt-2 border-t border-slate-200">
                                            <span>Monto Final</span>
                                            <span>${this.formatCurrency(u)}</span>
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
                                        <p class="text-sm font-medium text-slate-600">${(($=e.customer)==null?void 0:$.phone)||"-"}</p>
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
                                    ${a.map((b,v)=>{const k=n(b.status);return`
                                            <div class="relative">
                                                <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${v===0?"bg-brand-orange ring-4 ring-orange-50":"bg-slate-300"}"></div>
                                                <div class="flex flex-col gap-0.5">
                                                    <div class="flex items-center gap-2">
                                                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${k.color}">
                                                            ${k.label}
                                                        </span>
                                                        <span class="text-[9px] text-slate-400 font-mono">
                                                            ${b.timestamp.toLocaleDateString("es-ES",{day:"2-digit",month:"short"})} ${b.timestamp.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
                                                        </span>
                                                    </div>
                                                    <p class="text-xs text-slate-500">${b.note||"-"}</p>
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
        `;document.body.insertAdjacentHTML("beforeend",d)},openInvoiceModal(t){var v;const e=this.state.sales.find(k=>k.id===t);if(!e){this.showToast("Sale not found","error");return}const s=e.items||[],o=(v=e.date)!=null&&v.toDate?e.date.toDate():new Date(e.date||e.timestamp),r=o.toISOString().slice(0,10).replace(/-/g,""),a=e.invoiceNumber||`ECR-${r}-${t.slice(-4).toUpperCase()}`,n=s.filter(k=>k.productCondition==="New"),l=s.filter(k=>k.productCondition!=="New");let i=0,p=0;const c=(k,I)=>k.map(C=>{const g=C.priceAtSale||C.price||0,f=C.qty||C.quantity||1,S=g*f;if(p+=S,I){const D=S*.2;return i+=D,`
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${C.album||"Product"}</div>
                                <div style="font-size: 11px; color: #666;">${C.artist||""}</div>
                                <div style="font-size: 11px; color: #2563eb; margin-top: 4px;">✓ Moms (25%): DKK ${D.toFixed(2)}</div>
                            </td>
                            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eee;">${f}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee;">DKK ${g.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">DKK ${S.toFixed(2)}</td>
                        </tr>
                    `}else return`
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${C.album||"Product"}</div>
                                <div style="font-size: 11px; color: #666;">${C.artist||""}</div>
                                <div style="font-size: 10px; color: #d97706; margin-top: 4px; font-style: italic;">Brugtmoms - Køber har ikke fradrag for momsen</div>
                            </td>
                            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eee;">${f}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee;">DKK ${g.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">DKK ${S.toFixed(2)}</td>
                        </tr>
                    `}).join("");let u="";n.length>0&&l.length>0?u=`
                <tr><td colspan="4" style="padding: 15px 0 8px 0; font-size: 12px; font-weight: bold; color: #2563eb; text-transform: uppercase;">🆕 New Products (VAT Deductible)</td></tr>
                ${c(n,!0)}
                <tr><td colspan="4" style="padding: 20px 0 8px 0; font-size: 12px; font-weight: bold; color: #d97706; text-transform: uppercase;">📦 Used Products (Margin Scheme / Brugtmoms)</td></tr>
                ${c(l,!1)}
            `:u=c(n,!0)+c(l,!1);const d=parseFloat(e.shipping_income||e.shipping||e.shipping_cost||0),y=d*.2,m=p+d,E=e.customer?`${e.customer.firstName||""} ${e.customer.lastName||""}`.trim():e.customerName||"Customer",$=e.customer?`${e.customer.address||""}<br>${e.customer.postalCode||""} ${e.customer.city||""}<br>${e.customer.country||""}`:"",b=`
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
                                    <p style="color: #666; margin: 0;">${E}</p>
                                    ${$?`<p style="color: #666; margin: 5px 0; font-size: 12px;">${$}</p>`:""}
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
                                    ${u}
                                </tbody>
                            </table>

                            <div style="border-top: 2px solid #eee; padding-top: 15px; font-size: 14px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>Subtotal:</span>
                                    <span>DKK ${p.toFixed(2)}</span>
                                </div>
                                ${i>0?`
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #2563eb; font-size: 13px;">
                                    <span>↳ Heraf moms (25%):</span>
                                    <span>DKK ${i.toFixed(2)}</span>
                                </div>
                                `:""}
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>Shipping (incl. 25% VAT):</span>
                                    <span>DKK ${d.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #2563eb; font-size: 11px;">
                                    <span>↳ Shipping VAT (25%):</span>
                                    <span>DKK ${y.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #333; font-weight: 900; font-size: 18px;">
                                    <span>Total:</span>
                                    <span>DKK ${m.toFixed(2)}</span>
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
        `;document.body.insertAdjacentHTML("beforeend",b)},printInvoice(){const t=document.getElementById("invoice-content").innerHTML,e=window.open("","_blank");e.document.write(`
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
        `),e.document.close()},navigateInventoryFolder(t,e){t==="genre"&&(this.state.filterGenre=e),t==="owner"&&(this.state.filterOwner=e),t==="label"&&(this.state.filterLabel=e),t==="storage"&&(this.state.filterStorage=e),this.refreshCurrentView()},toggleSelection(t){this.state.selectedItems.has(t)?this.state.selectedItems.delete(t):this.state.selectedItems.add(t),this.refreshCurrentView()},async openPrintLabelModal(t){const e=this.state.inventory.find(n=>n.id===t||n.sku===t);if(!e)return;let s={...e};try{const n=await _.collection("products").doc(e.id).get();n.exists&&(s={...e,...n.data()})}catch(n){console.warn("[printLabel] Could not fetch fresh product data, using state copy",n)}const o=s.year&&Number(s.year)!==0?String(s.year):"—",r=s.price?Number(s.price).toLocaleString("da-DK"):"—",a=`
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
`;document.body.insertAdjacentHTML("beforeend",a),setTimeout(()=>{const n=document.getElementById("qr-container");n&&typeof QRCode<"u"&&(n.innerHTML="",new QRCode(n,{text:s.sku,width:57,height:57,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M}))},50)},closePrintLabelModal(){const t=document.getElementById("print-label-modal");if(t){const e=document.getElementById("label-comment");e&&(e.value=""),t.remove()}},setLabelOrientation(t){const e=document.getElementById("print-label-modal");if(!e)return;e.dataset.orientation=t;const s=document.getElementById("orient-h"),o=document.getElementById("orient-v"),r="flex-1 py-2 bg-white text-brand-dark font-bold rounded-lg text-sm shadow-sm flex items-center justify-center gap-1.5 transition-all",a="flex-1 py-2 text-slate-500 font-bold rounded-lg text-sm flex items-center justify-center gap-1.5 transition-all";s&&(s.className=t==="landscape"?r:a),o&&(o.className=t==="portrait"?r:a);const n=document.getElementById("printable-label");n&&n.classList.toggle("label-b--portrait",t==="portrait")},async confirmPrintLabel(){const t=document.getElementById("label-comment"),e=document.getElementById("preview-comment"),s=t?t.value:"";t&&e&&(e.innerText=s);const o=document.querySelector('#print-label-modal button[onclick="app.confirmPrintLabel()"]');o&&(o.disabled=!0,o.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Imprimiendo…');try{const r=document.getElementById("print-label-modal"),a=r&&r.dataset.orientation||"landscape",l=(await this._drawLabelCanvas(s,a)).toDataURL("image/png").split(",")[1],i=await fetch(`${R}/api/print-label`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:l})}),p=await i.json();if(!i.ok)throw new Error(p.error||"Error desconocido");o&&(o.innerHTML='<i class="ph-bold ph-check"></i> ¡Enviado!',o.classList.replace("bg-brand-dark","bg-green-600")),this.showToast("✅ Etiqueta enviada a la impresora"),setTimeout(()=>this.closePrintLabelModal(),1500)}catch(r){o&&(o.disabled=!1,o.innerHTML='<i class="ph-bold ph-printer"></i> Imprimir'),this.showToast("Error al imprimir: "+r.message,"error")}},async _drawLabelCanvas(t,e="landscape"){const s=document.getElementById("print-label-modal"),o=s?s.dataset.sku:null,r=o?this.state.inventory.find($=>$.id===o||$.sku===o)||{}:{},a=($,b)=>{const v=document.getElementById($);return v&&v.value.trim()?v.value.trim():b},n={...r,album:a("label-edit-title",r.album),artist:a("label-edit-artist",r.artist),year:a("label-edit-year",r.year),price:a("label-edit-price",r.price),genre:a("label-edit-genre1",r.genre),genre2:a("label-edit-genre2",r.genre2),condition:a("label-edit-cond",r.condition),storageLocation:a("label-edit-loc",r.storageLocation)},l=300/25.4,i=e==="portrait",p=Math.round((i?40:62)*l),c=Math.round((i?62:40)*l),u=document.createElement("canvas");u.width=p,u.height=c;const d=u.getContext("2d");"wordSpacing"in d&&(d.wordSpacing="0px"),"letterSpacing"in d&&(d.letterSpacing="0px"),d.fillStyle="#ffffff",d.fillRect(0,0,p,c);const y=Math.round(5.5*l);d.fillStyle="#000000",d.fillRect(0,0,p,y);const m=Math.round(2.2*l);d.fillStyle="#ffffff",d.font=`800 ${m}px "DM Sans", Arial, sans-serif`,d.textBaseline="middle",d.textAlign="left";const E=((n.genre||"VINYL")+(n.genre2?" / "+n.genre2:"")).toUpperCase();d.fillText(E,Math.round(1.6*l),y/2);try{const $=await new Promise(b=>{const v=new Image;v.crossOrigin="anonymous",v.onload=()=>b(v),v.onerror=()=>b(null),v.src="logo-broadsheet.png"});if($){const b=Math.round(3*l),v=Math.round($.naturalWidth*(b/$.naturalHeight)),k=document.createElement("canvas");k.width=$.naturalWidth,k.height=$.naturalHeight;const I=k.getContext("2d");I.drawImage($,0,0);const C=I.getImageData(0,0,k.width,k.height),g=C.data;for(let L=0;L<g.length;L+=4)g[L+3]>0&&(g[L]=255,g[L+1]=255,g[L+2]=255);I.putImageData(C,0,0);const S=Math.round(18*l),D=p-S+Math.round((S-v)/2),T=(y-b)/2;d.drawImage(k,D,T,v,b)}}catch{}if(i){const $=Math.round(1.6*l),b=p-$*2;d.textAlign="left",d.textBaseline="top";const v=Math.round(3.8*l);d.font=`800 ${v}px "DM Sans", Arial, sans-serif`,d.fillStyle="#000000";const k=this._wrapText(d,n.album||"",b,2);let I=y+Math.round(1.1*l);k.forEach((W,H)=>{d.fillText(W,$,I+H*Math.round(v*1.1))}),I+=k.length*Math.round(v*1.1);const C=Math.round(2.4*l);if(d.font=`600 ${C}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.5)",I+=Math.round(.5*l),d.fillText(this._truncateText(d,n.artist||"",b),$,I),I+=C,n.label&&n.label!=="Desconocido"){const W=Math.round(2.2*l);I+=Math.round(.6*l),d.font=`700 ${Math.round(1.9*l)}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.35)",d.fillText("LABEL",$,I);const H=d.measureText("LABEL ").width;d.font=`600 ${W}px "DM Sans", Arial, sans-serif`,d.fillStyle="#333333",d.fillText(this._truncateText(d,n.label,b-H),$+H,I),I+=W}if(t){const W=Math.round(2.1*l);d.font=`italic 600 ${W}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.4)",d.textBaseline="top";const H=b-Math.round(3*l),U=this._wrapText(d,t,H,5),me=Math.round(W*1.35),fe=I+Math.round(1.8*l);U.forEach((ne,ye)=>{d.fillText(ne,$+Math.round(1.5*l),fe+ye*me)})}const g=Math.round(12*l),f=Math.round(20*l),S=Math.round((p-f)/2),D=c-g-Math.round(1.6*l),T=D-Math.round(4.5*l),L=T-Math.round(2.2*l);d.strokeStyle="rgba(0,0,0,0.15)",d.lineWidth=1,d.beginPath(),d.moveTo($,T),d.lineTo(p-$,T),d.stroke();const q=Math.round(2*l),P=Math.round(1.8*l),j=b/3;d.textBaseline="middle";const K=(W,H,U)=>{d.textAlign="left",d.font=`700 ${P}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.45)",d.fillText(W+" ",U,L);const me=d.measureText(W+" ").width;d.font=`700 ${q}px "DM Mono", "Courier New", monospace`,d.fillStyle="rgba(0,0,0,0.7)",d.fillText(H,U+me,L)};K("Loc",n.storageLocation||"—",$),K("Cond",n.condition||"—",$+j),K("Year",n.year&&Number(n.year)!==0?String(n.year):"—",$+j*2);const Q=Math.round(13*l),Z=Math.round((p-Q)/2),ae=Math.round(1.9*l),x=I+Math.round(2.5*l),M=L-Math.round(ae+Math.round(.4*l)+4),V=x+Math.max(0,Math.round((M-x-Q)/2)),oe=document.getElementById("qr-container"),te=oe?oe.querySelector("canvas"):null;te?d.drawImage(te,Z,V,Q,Q):(d.strokeStyle="#ccc",d.lineWidth=1,d.strokeRect(Z,V,Q,Q)),d.font=`600 ${ae}px "DM Mono", "Courier New", monospace`,d.fillStyle="rgba(0,0,0,0.45)",d.textAlign="center",d.textBaseline="top",d.fillText(n.sku||"",p/2,V+Q+Math.round(.4*l)),d.fillStyle="#000000";const N=Math.round(.8*l);d.beginPath(),d.moveTo(S+N,D),d.lineTo(S+f-N,D),d.quadraticCurveTo(S+f,D,S+f,D+N),d.lineTo(S+f,D+g-N),d.quadraticCurveTo(S+f,D+g,S+f-N,D+g),d.lineTo(S+N,D+g),d.quadraticCurveTo(S,D+g,S,D+g-N),d.lineTo(S,D+N),d.quadraticCurveTo(S,D,S+N,D),d.closePath(),d.fill();const le=n.price?Number(n.price).toLocaleString("da-DK"):"—",ie=Math.round(4.8*l),X=Math.round(2.2*l),Y=ie*1.1,O=X*1.1,G=D+(g-Y-O)/2+Y/2,z=G+Y/2+O/2;d.textAlign="center",d.textBaseline="middle",d.font=`800 ${ie}px "DM Mono", "Courier New", monospace`,d.fillStyle="#ffffff",d.fillText(le,S+f/2,G),d.font=`700 ${X}px "DM Sans", Arial, sans-serif`,d.fillStyle="#ffffff",d.fillText("DKK",S+f/2,z)}else{const $=y,b=Math.round(18*l),v=p-b,k=Math.round(1.6*l),I=Math.round(1.1*l);d.textAlign="left",d.textBaseline="top";const C=Math.round(3.8*l);d.font=`800 ${C}px "DM Sans", Arial, sans-serif`,d.fillStyle="#000000";const g=v-k-Math.round(.95*l),f=this._wrapText(d,n.album||"",g,2);f.forEach((de,xe)=>{d.fillText(de,k,$+I+xe*Math.round(C*1.1))});const S=Math.round(2.4*l);d.font=`600 ${S}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.5)";const D=$+I+f.length*Math.round(C*1.1)+Math.round(.5*l),T=this._truncateText(d,n.artist||"",g);d.fillText(T,k,D);let L=D+S;if(n.label&&n.label!=="Desconocido"){const de=Math.round(2.2*l),xe=L+Math.round(.6*l);d.font=`700 ${Math.round(1.9*l)}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.35)",d.fillText("LABEL",k,xe),d.font=`600 ${de}px "DM Sans", Arial, sans-serif`,d.fillStyle="#333333";const ce=k+d.measureText("LABEL ").width;d.fillText(this._truncateText(d,n.label,g-ce+k),ce,xe),L=xe+de}const q=c-Math.round(5*l);if(t){const de=Math.round(2.1*l);d.font=`italic 600 ${de}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.4)",d.textBaseline="top";const xe=g-Math.round(2*l),ce=this._wrapText(d,t,xe,5),$e=Math.round(de*1.35),Me=ce.length*$e,Be=L+(q-L-Me)/2;ce.forEach((Le,Ce)=>{d.fillText(Le,k+Math.round(1.5*l),Be+Ce*$e)})}const P=Math.round(2*l),j=Math.round(1.8*l),K=c-Math.round(2.5*l),Z=(v-k-Math.round(.95*l))/3;d.strokeStyle="rgba(0,0,0,0.15)",d.lineWidth=1,d.beginPath(),d.moveTo(k,q),d.lineTo(v-Math.round(.95*l),q),d.stroke(),d.textBaseline="middle",d.textAlign="left";const ae=(de,xe,ce)=>{d.font=`700 ${j}px "DM Sans", Arial, sans-serif`,d.fillStyle="rgba(0,0,0,0.45)",d.fillText(de+" ",ce,K);const $e=d.measureText(de+" ").width;d.font=`700 ${P}px "DM Mono", "Courier New", monospace`,d.fillStyle="rgba(0,0,0,0.7)",d.fillText(xe,ce+$e,K)};ae("Loc",n.storageLocation||"—",k),ae("Cond",n.condition||"—",k+Z),ae("Year",n.year&&Number(n.year)!==0?String(n.year):"—",k+Z*2);const x=v;d.strokeStyle="rgba(0,0,0,0.12)",d.lineWidth=1,d.beginPath(),d.moveTo(x,$),d.lineTo(x,c),d.stroke();const M=document.getElementById("qr-container"),V=M?M.querySelector("canvas"):null,te=Math.round(15*l),N=x+Math.round((b-te)/2),le=$+Math.round(1.1*l);V?d.drawImage(V,N,le,te,te):(d.strokeStyle="#ccc",d.strokeRect(N,le,te,te));const ie=Math.round(1.9*l);d.font=`600 ${ie}px "DM Mono", "Courier New", monospace`,d.fillStyle="rgba(0,0,0,0.45)",d.textAlign="center",d.textBaseline="top",d.fillText(n.sku||"",x+b/2,le+te+Math.round(.4*l));const X=Math.round(12*l),Y=Math.round(15*l),O=x+Math.round((b-Y)/2),G=c-X-Math.round(1.6*l);d.fillStyle="#000000";const z=Math.round(.8*l);d.beginPath(),d.moveTo(O+z,G),d.lineTo(O+Y-z,G),d.quadraticCurveTo(O+Y,G,O+Y,G+z),d.lineTo(O+Y,G+X-z),d.quadraticCurveTo(O+Y,G+X,O+Y-z,G+X),d.lineTo(O+z,G+X),d.quadraticCurveTo(O,G+X,O,G+X-z),d.lineTo(O,G+z),d.quadraticCurveTo(O,G,O+z,G),d.closePath(),d.fill();const W=n.price?Number(n.price).toLocaleString("da-DK"):"—",H=Math.round(4.8*l),U=Math.round(2*l),me=H*1.1,fe=U*1.1,ne=me+fe,ye=G+(X-ne)/2+me/2,De=ye+me/2+fe/2;d.textAlign="center",d.textBaseline="middle",d.font=`800 ${H}px "DM Mono", "Courier New", monospace`,d.fillStyle="#ffffff",d.fillText(W,O+Y/2,ye);const Te=Math.round(2.2*l);d.font=`700 ${Te}px "DM Sans", Arial, sans-serif`,d.fillStyle="#ffffff",d.fillText("DKK",O+Y/2,De)}return u},_wrapText(t,e,s,o){const r=e.split(" "),a=[];let n="";for(const l of r){const i=n?n+" "+l:l;if(t.measureText(i).width>s&&n){if(a.push(n),n=l,a.length>=o)break}else n=i}if(n&&a.length<o&&a.push(n),a.length>0){const l=a[a.length-1];a[a.length-1]=this._truncateText(t,l,s)}return a},_truncateText(t,e,s){if(t.measureText(e).width<=s)return e;let o=e;for(;o.length>1&&t.measureText(o+"…").width>s;)o=o.slice(0,-1);return o+"…"},initFuse(){if(typeof Fuse>"u"){console.warn("Fuse.js not loaded yet");return}const t={keys:[{name:"artist",weight:.35},{name:"album",weight:.25},{name:"label",weight:.15},{name:"storageLocation",weight:.15},{name:"sku",weight:.1},{name:"quickId",weight:.1},{name:"genre",weight:.03},{name:"notes",weight:.02}],threshold:.4,distance:100,ignoreLocation:!0,minMatchCharLength:2};this.fuse=new Fuse(this.state.inventory,t)},getFilteredInventory(){const t=(this.state.inventorySearch||"").trim().toLowerCase(),e=this.state.filterGenre||"all",s=this.state.filterOwner||"all",o=this.state.filterLabel||"all",r=this.state.filterStorage||"all",a=this.state.filterDiscogs||"all",n=this.state.filterHero||"all",l=this.state.filterStock||"all",i=this.state.filterCondition||"all";let p=this.state.inventory;if(t.length>=2)if(this.fuse)p=this.fuse.search(t).map(c=>c.item);else{const c=t.split(" ").filter(u=>u.length>0);p=p.filter(u=>c.every(d=>(u.artist||"").toLowerCase().includes(d)||(u.album||"").toLowerCase().includes(d)||(u.label||"").toLowerCase().includes(d)||(u.storageLocation||"").toLowerCase().includes(d)||(u.genre||"").toLowerCase().includes(d)||(u.notes||"").toLowerCase().includes(d)||(u.sku||"").toLowerCase().includes(d)))}return p.filter(c=>{const u=[c.genre,c.genre2,c.genre3,c.genre4,c.genre5].filter(Boolean),d=[];u.forEach(j=>{d.push(...j.split(",").map(K=>K.trim()).filter(Boolean))});const y=[...new Set(d)],m=y.filter(j=>j.toLowerCase()!=="electronic"),E=m.length>0?m:y.length>0?y:["Otros"],$=e==="all"||E.includes(e),b=s==="all"||c.owner===s,v=o==="all"||c.label===o,k=r==="all"||c.storageLocation===r,I=!!c.discogs_listing_id,C=a==="all"||a==="yes"&&I||a==="no"&&!I,g=c.tags&&(Array.isArray(c.tags),c.tags.includes("hero")),f=n==="all"||n==="yes"&&g||n==="no"&&!g,S=this.getTimeInStockCategory(c.created_at||null),D=this.state.filterStockTime.length===0||this.state.filterStockTime.includes(S),T=Number(c.stock)||0,L=l==="all"||l==="inStock"&&T>0||l==="outOfStock"&&T<=0,q=c.product_condition||"Second-hand";return $&&b&&v&&k&&C&&f&&D&&L&&(i==="all"||i==="used"&&q==="Second-hand"||i==="new"&&q!=="Second-hand")})},toggleSelectAll(){const t=this.getFilteredInventory();t.length>0&&t.every(e=>this.state.selectedItems.has(e.sku))?t.forEach(e=>this.state.selectedItems.delete(e.sku)):t.forEach(e=>this.state.selectedItems.add(e.sku)),this.refreshCurrentView()},addSelectionToCart(){this.state.selectedItems.forEach(t=>{const e=this.state.inventory.find(s=>s.id===t||s.sku===t);e&&e.stock>0&&(this.state.cart.find(s=>s.sku===t)||this.state.cart.push(e))}),this.state.selectedItems.clear(),this.showToast(`${this.state.cart.length} items agregados al carrito`),this.refreshCurrentView()},deleteSelection(){if(!confirm(`¿Estás seguro de eliminar ${this.state.selectedItems.size} productos ? `))return;const t=_.batch(),e=[];this.state.selectedItems.forEach(s=>{const o=_.collection("products").doc(s),r=this.state.inventory.find(a=>a.id===s||a.sku===s);r&&e.push(r),t.delete(o)}),t.commit().then(()=>{this.showToast("Productos eliminados"),e.forEach(s=>this.logInventoryMovement("DELETE",s)),this.state.selectedItems.clear()}).catch(s=>{console.error("Error logging movement:",s),alert("Error al eliminar")})},openAddExpenseModal(){const t=["Alquiler","Servicios","Marketing","Suministros","Honorarios"],s=`
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
    `;document.body.insertAdjacentHTML("beforeend",s)},async handleAddVinyl(t,e){t.preventDefault();const s=new FormData(t.target);let o=s.get("genre"),r=s.get("collection");r==="other"&&(r=s.get("custom_collection"));const a=s.get("sku"),n=s.get("is_online")==="on",l=s.get("publish_discogs")==="on",i=s.get("publish_local")==="on",p={sku:a,artist:s.get("artist"),album:s.get("album"),genre:o,genre2:s.get("genre2")||null,genre3:s.get("genre3")||null,genre4:s.get("genre4")||null,genre5:s.get("genre5")||null,label:s.get("label"),collection:r||null,collectionNote:s.get("collectionNote")||null,year:s.get("year")?parseInt(s.get("year")):null,condition:s.get("condition"),provider_origin:s.get("provider_origin")||"Local_Used",sleeveCondition:s.get("sleeveCondition")||"",comments:s.get("comments")||"",price:parseFloat(s.get("price")),cost:parseFloat(s.get("cost"))||0,stock:parseInt(s.get("stock")),storageLocation:s.get("storageLocation"),owner:s.get("owner"),is_online:n,publish_webshop:n,publish_discogs:l,publish_local:i,cover_image:s.get("cover_image")||null,updated_at:firebase.firestore.FieldValue.serverTimestamp(),tags:[s.get("tag_hero")?"hero":null,s.get("tag_new")?"new_arrival":null,s.get("collection_tag")?s.get("collection_tag").trim():null].filter(Boolean),is_rsd_discount:s.get("is_rsd_discount")==="on",discogsUrl:s.get("discogsUrl"),discogsId:s.get("discogsId"),discogs_release_id:s.get("discogs_release_id")||s.get("discogsId"),tracks:(()=>{try{return JSON.parse(s.get("tracks")||"[]")}catch{return[]}})()};p.provider_origin==="EU_B2B"?(p.item_phantom_vat=Math.round(p.cost*.25*100)/100,p.item_real_vat=0,p.acquisition_date=s.get("acquisition_date")||new Date().toISOString().split("T")[0]):p.provider_origin==="DK_B2B"?(p.item_phantom_vat=0,p.item_real_vat=Math.round(p.cost*.25*100)/100,p.acquisition_date=s.get("acquisition_date")||new Date().toISOString().split("T")[0]):(p.item_phantom_vat=0,p.item_real_vat=0,p.acquisition_date=null),console.log(`[handleAddVinyl] editSku: ${e}, recordData:`,p);try{let c=null,u=null;if(e){const d=await this.findProductBySku(e);if(!d){this.showToast("❌ Producto no encontrado","error");return}u=d.data,c=d.id,await d.ref.update(p),this.showToast("✅ Disco actualizado")}else{const d=this.state.inventory.map(m=>{const E=m.sku&&typeof m.sku=="string"?m.sku.match(/^SKU\s*-\s*(\d+)/):null;return E?parseInt(E[1]):0}),y=Math.max(0,...d);p.created_at=firebase.firestore.FieldValue.serverTimestamp(),c=await _.runTransaction(async m=>{const E=_.collection("metadata").doc("vinylCounter"),$=await m.get(E);let b=0;$.exists&&(b=$.data().current||0);const v=Math.max(b,y)+1,k=String(v).padStart(4,"0");m.set(E,{current:v},{merge:!0}),p.quickId=k,p.sku=`SKU-${String(v).padStart(3,"0")}`;const I=_.collection("products").doc();return m.set(I,p),I.id}),this.showToast(`✅ Disco agregado (ID: ${p.quickId})`)}if(l){const d=s.get("discogs_release_id")||s.get("discogsId");if(u&&u.discogs_listing_id)try{const m=await(await fetch(`${R}/discogs/update-listing/${u.discogs_listing_id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({product:p})})).json();if(m.success)this.showToast("💿 Listing de Discogs actualizado");else throw new Error(m.error||"Error desconocido")}catch(y){console.error("Error updating Discogs listing:",y),this.showToast(`⚠️ Error Discogs: ${y.message}`,"error")}else if(d)try{const m=await(await fetch(`${R}/discogs/create-listing`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({releaseId:parseInt(d),product:p})})).json();if(m.success&&m.listingId)await _.collection("products").doc(c).update({discogs_listing_id:String(m.listingId),discogs_release_id:parseInt(d)}),this.showToast("💿 Publicado en Discogs correctamente");else throw new Error(m.error||"Error desconocido")}catch(y){console.error("Error creating Discogs listing:",y);let m=y.message;(m.toLowerCase().includes("mp3")||m.toLowerCase().includes("digital")||m.toLowerCase().includes("format"))&&(m="Discogs solo permite formatos físicos (Vinyl, CD, Cassette). Este release es digital o MP3."),this.showToast(`⚠️ Error Discogs: ${m}`,"error")}else this.showToast("⚠️ Necesitas buscar el disco en Discogs primero para publicarlo","warning")}document.getElementById("modal-overlay").remove(),this.loadData()}catch(c){console.error(c),this.showToast("❌ Error: "+(c.message||"desconocido"),"error")}},async toggleProductTag(t,e){try{const s=this.state.inventory.find(n=>n.id===t||n.sku===t);if(!s){this.showToast("❌ Producto no encontrado","error");return}let o=s.tags||[];o.includes(e)?o=o.filter(n=>n!==e):o.push(e);const r=_.collection("products").doc(s.id);if(!(await r.get()).exists){this.showToast("❌ Error: Documento no encontrado","error");return}await r.update({tags:o,updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast(`✅ ${e==="hero"?"Héroe":"Novedad"} actualizado`),s.tags=o,this.refreshCurrentView()}catch(s){console.error("Error toggling product tag:",s),this.showToast("❌ Error al actualizar tag","error")}},async toggleRsdDiscount(t){try{const e=this.state.inventory.find(a=>a.id===t||a.sku===t);if(!e){this.showToast("❌ Producto no encontrado","error");return}const s=!e.is_rsd_discount,o=_.collection("products").doc(e.id);if(!(await o.get()).exists){this.showToast("❌ Error: Documento no encontrado","error");return}await o.update({is_rsd_discount:s,updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast(`✅ RSD ${s?"activado":"desactivado"} — ${e.album}`),e.is_rsd_discount=s,this.refreshCurrentView()}catch(e){console.error("Error toggling RSD discount:",e),this.showToast("❌ Error al actualizar RSD","error")}},deleteVinyl(t){const e=this.state.inventory.find(o=>o.id===t||o.sku===t);if(!e){alert("Error: Item not found");return}const s=`
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
                                                                <button onclick="app.confirmDelete('${e.id}')" class="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                                                                    Eliminar
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},async confirmDelete(t){const e=document.getElementById("delete-confirm-modal");e&&e.remove();const s=document.getElementById("modal-overlay");s&&s.remove();try{const o=this.state.inventory.find(l=>l.id===t||l.sku===t),r=o?o.id:t,a=await _.collection("products").doc(r).get();if(!a.exists){this.showToast("❌ Producto no encontrado","error");return}const n={id:a.id,ref:a.ref,data:a.data()};if(console.log("Product to delete:",n.data),console.log("Has discogs_listing_id?",n.data.discogs_listing_id),n.data.discogs_listing_id){console.log("Attempting to delete from Discogs:",n.data.discogs_listing_id);try{const l=await fetch(`${R}/discogs/delete-listing/${n.data.discogs_listing_id}`,{method:"DELETE"});console.log("Discogs delete response status:",l.status);const i=await l.json();console.log("Discogs delete result:",i),i.success?(console.log("Discogs listing deleted successfully"),this.showToast("💿 Eliminado de Discogs")):this.showToast("⚠️ "+(i.error||"Error en Discogs"),"warning")}catch(l){console.error("Error deleting from Discogs:",l),this.showToast("⚠️ Error eliminando de Discogs, pero continuando...","warning")}}else console.log("No discogs_listing_id found, skipping Discogs deletion");await n.ref.delete(),this.showToast("✅ Disco eliminado"),await this.loadData()}catch(o){console.error("Error removing document: ",o),this.showToast("❌ Error al eliminar: "+o.message,"error")}},handleSaleSubmit(t){var k,I,C,g,f,S,D;t.preventDefault();const e=new FormData(t.target);let s=e.get("sku");s||(s=(k=document.getElementById("input-sku"))==null?void 0:k.value);const o=this.state.inventory.find(T=>T.sku===s);if(!o){this.showToast("⚠️ Debes seleccionar un producto válido del listado","error");const T=document.getElementById("sku-search");T&&(T.focus(),T.classList.add("border-red-500","animate-pulse"),setTimeout(()=>T.classList.remove("border-red-500","animate-pulse"),2e3));return}let r=parseInt(e.get("quantity"));if(isNaN(r)&&(r=parseInt((I=document.getElementById("input-qty"))==null?void 0:I.value)||1),o.stock<r){this.showToast(`❌ Stock insuficiente. Disponible: ${o.stock}`,"error");return}let a=parseFloat(e.get("price"));isNaN(a)&&(a=parseFloat((C=document.getElementById("input-price"))==null?void 0:C.value)||0);const n=parseFloat(e.get("cost"))||0,l=parseFloat(e.get("shipping_income"))||0,i=a*r+l;e.get("date")||new Date().toISOString();const p=e.get("paymentMethod"),c=e.get("soldAt");e.get("comment");let u=e.get("artist");u||(u=(g=document.getElementById("input-artist"))==null?void 0:g.value);let d=e.get("album");d||(d=(f=document.getElementById("input-album"))==null?void 0:f.value);let y=e.get("genre");y||(y=(S=document.getElementById("input-genre"))==null?void 0:S.value);let m=e.get("owner");m||(m=(D=document.getElementById("input-owner"))==null?void 0:D.value);const E=e.get("customerName"),$=e.get("customerEmail"),b=e.get("requestInvoice")==="on",v={items:[{recordId:o.id,quantity:r,unitPrice:a,costAtSale:n}],paymentMethod:p||"CASH",customerName:E||"Venta Manual",customerEmail:$||null,shipping_income:l,total_amount:i,source:"STORE",channel:(c==null?void 0:c.toLowerCase())||"store"};ve.createSale(v).then(()=>{this.showToast(b?"Venta registrada (Factura Solicitada)":"Venta registrada");const T=document.getElementById("modal-overlay");T&&T.remove();const L=t.target;L&&L.reset();const q=document.getElementById("form-total");q&&(q.innerText="$0.00");const P=document.getElementById("sku-search");P&&(P.value=""),this.state.manualSaleSearch="",this.loadData()}).catch(T=>{console.error("Error adding sale: ",T),this.showToast("❌ Error al registrar venta: "+(T.message||""),"error")})},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(r=>r.id===t||r.sku===t);if(!s)return;if(this.state.cart.filter(r=>r.sku===t).length>=s.stock){this.showToast("⚠️ No hay más stock disponible");return}this.state.cart.push(s),document.getElementById("inventory-cart-container")?this.renderInventoryCart():this.renderCartWidget(),this.showToast("Agregado al carrito")},removeFromCart(t){this.state.cart.splice(t,1),this.renderCartWidget()},clearCart(){this.state.cart=[],this.renderCartWidget()},renderOnlineSales(t){const e=this.state.sales.filter(a=>a.channel==="online"),s=e.filter(a=>a.status==="completed"),o=e.filter(a=>a.status==="PENDING"),r=s.reduce((a,n)=>a+(parseFloat(n.total_amount||n.total)||0),0);t.innerHTML=`
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
                                ${e.map(a=>{var l;const n=(l=a.timestamp)!=null&&l.toDate?a.timestamp.toDate():new Date(a.date||0);return{...a,_sortDate:n.getTime()}}).sort((a,n)=>n._sortDate-a._sortDate).map(a=>{var y,m,E,$,b,v,k;const n=a.customer||{},l=a.orderNumber||"N/A",i=(y=a.timestamp)!=null&&y.toDate?a.timestamp.toDate():new Date(a.date),c=((m=a.completed_at)!=null&&m.toDate?a.completed_at.toDate():null)||i,u={completed:"bg-green-50 text-green-700 border-green-200",PENDING:"bg-yellow-50 text-yellow-700 border-yellow-200",failed:"bg-red-50 text-red-700 border-red-200"},d={completed:"✅ Completado",PENDING:"⏳ Pendiente",failed:"❌ Fallido"};return`
                                        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${a.id}')">
                                            <td class="px-6 py-4">
                                                <div class="font-mono text-sm font-bold text-brand-orange">${l}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-semibold text-brand-dark">${n.name||(n.firstName?`${n.firstName} ${n.lastName||""}`:"")||((E=n.stripe_info)==null?void 0:E.name)||"Cliente"}</div>
                                                <div class="text-xs text-slate-500">${n.email||(($=n.stripe_info)==null?void 0:$.email)||"No email"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-slate-600 truncate max-w-[200px]">
                                                    ${((b=n.shipping)==null?void 0:b.line1)||n.address||((k=(v=n.stripe_info)==null?void 0:v.shipping)==null?void 0:k.line1)||"Sin dirección"}
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
                                                <span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full border ${u[a.status]||"bg-slate-50 text-slate-700"}">
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
                                                    ${c.toLocaleDateString("es-ES")}
                                                    <div class="text-[10px] text-slate-400">${c.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</div>
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
    `},openOnlineSaleDetailModal(t){var i,p,c;const e=this.state.sales.find(u=>u.id===t);if(!e)return;const s=e.customer||{},o=s.stripe_info||{},r=s.shipping||o.shipping||{},a={line1:r.line1||s.address||"Sin dirección",line2:r.line2||"",city:r.city||s.city||"",postal:r.postal_code||s.postalCode||"",country:r.country||s.country||"Denmark"},n=`
            <p class="font-medium">${a.line1}</p>
            ${a.line2?`<p class="font-medium">${a.line2}</p>`:""}
            <p class="text-slate-500">${a.postal} ${a.city}</p>
            <p class="text-slate-500 font-bold mt-1 uppercase tracking-wider">${a.country}</p>
        `,l=`
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
                                    <p class="font-bold text-brand-dark text-base">${s.name||(s.firstName?`${s.firstName} ${s.lastName||""}`:"")||((i=s.stripe_info)==null?void 0:i.name)||"Cliente"}</p>
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
                                    <span class="font-bold">${new Date((p=e.timestamp)!=null&&p.toDate?e.timestamp.toDate():(c=e.completed_at)!=null&&c.toDate?e.completed_at.toDate():e.date).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</span>
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
                                    ${(e.items||[]).map(u=>{var d,y,m;return`
                                        <tr>
                                            <td class="px-4 py-3">
                                                <p class="font-bold text-brand-dark">${u.album||((d=u.record)==null?void 0:d.album)||"Unknown"}</p>
                                                <p class="text-xs text-slate-500">${u.artist||((y=u.record)==null?void 0:y.artist)||""}</p>
                                            </td>
                                            <td class="px-4 py-3 text-center font-medium">${u.quantity||1}</td>
                                            <td class="px-4 py-3 text-right font-bold text-brand-dark">DKK ${(u.unitPrice||((m=u.record)==null?void 0:m.price)||0).toFixed(2)}</td>
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
    `;document.body.insertAdjacentHTML("beforeend",l)},renderCartWidget(){const t=document.getElementById("cart-widget");if(!t)return;const e=document.getElementById("cart-count"),s=document.getElementById("cart-items-mini"),o=document.getElementById("cart-total-mini");if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden"),e.innerText=this.state.cart.length;const r=this.state.cart.reduce((a,n)=>a+n.price,0);o.innerText=this.formatCurrency(r),s.innerHTML=this.state.cart.map((a,n)=>`
                                                                <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                                                    <div class="truncate pr-2">
                                                                        <p class="font-bold text-xs text-brand-dark truncate">${a.album}</p>
                                                                        <p class="text-[10px] text-slate-500 truncate">${a.price} kr.</p>
                                                                    </div>
                                                                    <button onclick="app.removeFromCart(${n})" class="text-red-400 hover:text-red-600">
                                                                        <i class="ph-bold ph-x"></i>
                                                                    </a>
                                                                </div>
                                                                `).join("")},openCheckoutModal(t,e,s=0){if(this.state.cart.length===0)return;const o=this.state.cart.reduce((u,d)=>u+this.getEffectivePrice(d),0),r=s>0?Math.round(o*(1-s)*100)/100:o,a=`
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
                        ${this.state.cart.map(u=>`
                            <div class="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                                <span class="truncate pr-4 font-bold text-slate-700">${u.album} ${u.is_rsd_discount?'<span class="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-black">RSD</span>':""}</span>
                                ${u.is_rsd_discount?`<span class="whitespace-nowrap"><span class="text-[10px] text-slate-400 line-through mr-1">${this.formatCurrency(u.price,!1)}</span><span class="font-mono font-bold text-orange-600">${this.formatCurrency(this.getEffectivePrice(u),!1)}</span></span>`:`<span class="font-mono font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(u.price,!1)}</span>`}
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
        `;document.body.insertAdjacentHTML("beforeend",a);const n=r,l=document.getElementById("checkout-final-price"),i=document.getElementById("discogs-fee-section"),p=document.getElementById("discogs-fee-value"),c=()=>{const u=parseFloat(l.value)||0,d=n-u;document.getElementById("checkout-total-value").innerText=this.formatCurrency(u),d>0?(i.classList.remove("hidden"),p.innerHTML=`- ${this.formatCurrency(d)}`):i.classList.add("hidden")};l.addEventListener("input",c)},onCheckoutChannelChange(t){},handleCheckoutSubmit(t){t.preventDefault();const e=new FormData(t.target),s=parseFloat(e.get("finalPrice"))||0,o=this.state.cart.reduce((a,n)=>a+this.getEffectivePrice(n),0),r={items:this.state.cart.map(a=>({recordId:a.id,quantity:1})),paymentMethod:e.get("paymentMethod"),customerName:e.get("customerName"),customerEmail:e.get("customerEmail"),channel:e.get("soldAt")||"Tienda",source:"STORE",customTotal:s,originalTotal:o,feeDeducted:o-s};ve.createSale(r).then(()=>{const a=r.channel==="Discogs"?" (Discogs listing eliminado)":"",n=r.feeDeducted>0?` | Fee: ${this.formatCurrency(r.feeDeducted)} `:"";this.showToast(`Venta de ${this.state.cart.length} items por ${this.formatCurrency(s)} registrada!${a}${n} `),this.clearCart(),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(a=>{console.error("Error checkout",a),alert("Error al procesar venta: "+a.message)})},handleSalesViewCheckout(){var o,r;if(this.state.cart.length===0){this.showToast("El carrito está vacío");return}const t=(o=document.getElementById("cart-payment"))==null?void 0:o.value,e=(r=document.getElementById("cart-channel"))==null?void 0:r.value,s=this.state.rsdExtraDiscount&&this.state.cart.length>=3?.05:0;this.openCheckoutModal(t,e,s)},async notifyPreparingDiscogs(t){try{this.showToast('Enviando notificación "Preparando"...',"info"),await ve.notifyPreparing(t),this.showToast("✅ Cliente notificado (Preparando Orden)"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in notifyPreparingDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async cancelOrderDiscogs(t){if(confirm("¿Estás seguro que deseas cancelar esta orden? Esta acción cambiará el estado a cancelado."))try{this.showToast("Cancelando orden...","info"),await ve.cancelOrder(t),this.showToast("✅ Orden cancelada correctamente"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in cancelOrderDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async notifyShippedDiscogs(t,e,s){try{const o=document.getElementById(e),r=o?o.value.trim():"",a=s?document.getElementById(s):null,n=a?a.value.trim():null;if(!r){this.showToast("⚠️ Ingresa un número de seguimiento","warning");return}this.showToast("Enviando notificación de envío...","info"),await ve.notifyShipped(t,r,n),this.showToast("✅ Cliente notificado y Tracking guardado"),await this.loadData(),this.refreshCurrentView()}catch(o){console.error("Error in notifyShippedDiscogs:",o),this.showToast("❌ Error: "+o.message,"error")}},async markDispatchedDiscogs(t){try{if(!confirm("¿Marcar como despachado? Esto moverá la orden al historial."))return;this.showToast("Marcando como despachado...","info"),await ve.markDispatched(t),this.showToast("✅ Orden despachada y archivada"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in markDispatchedDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async notifyPickupReadyDiscogs(t){try{this.showToast('Enviando notificación "Listo para Retirar"...',"info"),await ve.notifyPickupReady(t),this.showToast("✅ Cliente notificado (Listo para Retirar)"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in notifyPickupReadyDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async markPickedUpDiscogs(t){try{if(!confirm("¿El cliente ya retiró el pedido? Esto moverá la orden al historial."))return;this.showToast("Marcando como retirado...","info"),await ve.markPickedUp(t),this.showToast("✅ Orden retirada y archivada"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in markPickedUpDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async deleteSale(t){var s;if(!confirm("¿Eliminar esta venta y restaurar stock?"))return;const e=this.state.sales.find(o=>o.id===t);if(!e){this.showToast("❌ Venta no encontrada","error");return}try{const o=_.batch(),r=_.collection("sales").doc(t);if(o.delete(r),e.items&&Array.isArray(e.items))for(const a of e.items){const n=a.productId||a.recordId,l=a.sku||((s=a.record)==null?void 0:s.sku),i=parseInt(a.quantity||a.qty)||1;let p=null;if(n)try{const c=await _.collection("products").doc(n).get();c.exists&&(p={ref:c.ref,data:c.data()})}catch{console.warn("Could not find product by ID:",n)}!p&&l&&(p=await this.findProductBySku(l)),p?o.update(p.ref,{stock:firebase.firestore.FieldValue.increment(i)}):console.warn("Could not restore stock for item:",a)}else if(e.sku){const a=await this.findProductBySku(e.sku);if(a){const n=parseInt(e.quantity)||1;o.update(a.ref,{stock:firebase.firestore.FieldValue.increment(n)})}}await o.commit(),this.showToast("✅ Venta eliminada y stock restaurado"),this.loadData()}catch(o){console.error("Error deleting sale:",o),this.showToast("❌ Error al eliminar venta: "+o.message,"error")}},renderExpenses(t){const e=[{value:"alquiler",label:"Alquiler",type:"operativo"},{value:"servicios",label:"Servicios (internet, luz)",type:"operativo"},{value:"marketing",label:"Marketing",type:"operativo"},{value:"envios",label:"Envíos/Packaging",type:"operativo"},{value:"software",label:"Software/Suscripciones",type:"operativo"},{value:"honorarios",label:"Honorarios Profesionales",type:"operativo"},{value:"oficina",label:"Material de Oficina",type:"operativo"},{value:"transporte",label:"Transporte",type:"operativo"},{value:"otros_op",label:"Otros Gastos Operativos",type:"operativo"},{value:"stock_nuevo",label:"📦 Stock: Vinilos NUEVOS (Distribuidor)",type:"stock_nuevo"},{value:"stock_usado",label:"📦 Stock: Vinilos USADOS (Particular/Brugtmoms)",type:"stock_usado"}];window.expenseCategories=e;const s=(this.state.expensesSearch||"").toLowerCase(),o=this.state.expenses.filter(a=>!s||(a.description||a.proveedor||"").toLowerCase().includes(s)||(a.category||a.categoria||"").toLowerCase().includes(s)||(a.proveedor||"").toLowerCase().includes(s)),r=`
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
                                                        ${((n=e.find(l=>l.value===(a.categoria||a.category)))==null?void 0:n.label)||a.categoria||a.category||"-"}
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
    `;t.innerHTML=r},editExpense(t){if(!confirm("¿Seguro que deseas editar esta compra?"))return;const e=this.state.expenses.find(r=>r.id===t);if(!e)return;document.getElementById("expense-id").value=e.id,document.getElementById("expense-proveedor").value=e.proveedor||e.description||"",document.getElementById("expense-fecha").value=e.fecha_factura||(e.date?e.date.split("T")[0]:""),document.getElementById("expense-monto").value=e.monto_total||e.amount||0,document.getElementById("expense-iva").value=e.monto_iva||0,document.getElementById("expense-categoria").value=e.categoria||e.category||"Otros",document.getElementById("expense-descripcion").value=e.descripcion||"";const s=document.getElementById("expense-inventory-invoice");s&&(s.checked=!!e.is_inventory_invoice);const o=document.getElementById("expense-categoria");o&&(o.value=e.categoria||e.category||"",s&&s.checked?this.handleInventoryInvoiceToggle(s):this.handleExpenseCategoryChange(o)),e.receiptUrl&&(document.getElementById("receipt-url").value=e.receiptUrl,document.getElementById("upload-placeholder").classList.add("hidden"),document.getElementById("upload-preview").classList.remove("hidden"),document.getElementById("receipt-preview-img").src=e.receiptUrl,document.getElementById("receipt-filename").textContent="Recibo guardado"),document.getElementById("expense-form-title").innerHTML='<i class="ph-duotone ph-pencil-simple text-brand-orange"></i> Editar Compra',document.getElementById("expense-submit-btn").innerHTML='<i class="ph-bold ph-floppy-disk"></i> Actualizar',document.getElementById("expense-cancel-btn").classList.remove("hidden")},resetExpenseForm(){document.getElementById("expense-form").reset(),document.getElementById("expense-id").value="",document.getElementById("expense-fecha").value=new Date().toISOString().split("T")[0],document.getElementById("expense-iva").value="0",document.getElementById("expense-iva").disabled=!1,document.getElementById("expense-iva").classList.remove("bg-slate-100","cursor-not-allowed"),document.getElementById("expense-form-title").innerHTML='<i class="ph-duotone ph-plus-circle text-brand-orange"></i> Nueva Compra',document.getElementById("expense-submit-btn").innerHTML='<i class="ph-bold ph-floppy-disk"></i> Guardar Gasto',document.getElementById("expense-cancel-btn").classList.add("hidden"),document.getElementById("receipt-url").value="",document.getElementById("receipt-file").value="",document.getElementById("upload-placeholder").classList.remove("hidden"),document.getElementById("upload-preview").classList.add("hidden"),document.getElementById("receipt-preview-img").src="",document.getElementById("receipt-filename").textContent=""},handleExpenseSubmit(t){t.preventDefault();const e=new FormData(t.target),s=e.get("categoria"),o=(window.expenseCategories||[]).find(l=>l.value===s),r=e.get("is_inventory_invoice")==="on",a={proveedor:e.get("proveedor"),fecha_factura:e.get("fecha_factura"),date:e.get("fecha_factura"),monto_total:parseFloat(e.get("monto_total"))||0,monto_iva:parseFloat(e.get("monto_iva"))||0,categoria:s,categoria_label:(o==null?void 0:o.label)||s,categoria_tipo:(o==null?void 0:o.type)||"operativo",is_vat_deductible:(o==null?void 0:o.type)==="operativo"||(o==null?void 0:o.type)==="stock_nuevo",is_inventory_invoice:r,descripcion:e.get("descripcion")||"",receiptUrl:document.getElementById("receipt-url").value||"",timestamp:new Date().toISOString()};r&&(a.monto_iva=0,a.is_vat_deductible=!1,a.categoria_tipo="stock_factura_global");const n=e.get("id");n?_.collection("expenses").doc(n).update(a).then(()=>{this.showToast("✅ Compra actualizada"),this.loadData()}).catch(l=>console.error(l)):_.collection("expenses").add(a).then(()=>{this.showToast("✅ Compra registrada"),this.loadData()}).catch(l=>console.error(l)),this.resetExpenseForm()},handleInventoryInvoiceToggle(t){const e=document.getElementById("expense-iva");if(t.checked)e.value="0",e.disabled=!0,e.classList.add("bg-slate-100","cursor-not-allowed");else{const s=document.getElementById("expense-categoria");this.handleExpenseCategoryChange(s)}},handleExpenseCategoryChange(t){const e=t.value,s=(window.expenseCategories||[]).find(n=>n.value===e),o=document.getElementById("expense-iva"),r=document.getElementById("category-warning"),a=document.getElementById("expense-inventory-invoice");if(a&&a.checked){o.value="0",o.disabled=!0,o.classList.add("bg-slate-100","cursor-not-allowed");return}(s==null?void 0:s.type)==="stock_usado"?(o.value="0",o.disabled=!0,o.classList.add("bg-slate-100","cursor-not-allowed"),r.classList.remove("hidden")):(o.disabled=!1,o.classList.remove("bg-slate-100","cursor-not-allowed"),r.classList.add("hidden"))},openInventoryIngest(t){this.state.expenses.find(s=>s.id===t)&&(this.navigate("inventory"),this.showToast('ℹ️ Usa "Añadir Disco" para ingresar el stock de esta compra.'))},deleteExpense(t){const e=this.state.expenses.find(s=>s.id===t);if(e!=null&&e.receiptUrl){if(!confirm(`⚠️ ATENCIÓN: Este gasto tiene un recibo adjunto.

¿Estás seguro de que quieres eliminarlo?`))return;if(!confirm(`🔒 CONFIRMACIÓN LEGAL REQUERIDA

La ley exige guardar documentos contables durante 5 AÑOS.

Fecha del gasto: `+(e.fecha_factura||e.date||"Desconocida")+`
Proveedor: `+(e.proveedor||"Sin nombre")+`
Monto: `+this.formatCurrency(e.monto_total||e.amount||0)+`

¿CONFIRMAS que deseas eliminar permanentemente este registro y su recibo?`)){this.showToast("ℹ️ Eliminación cancelada");return}}else if(!confirm("¿Eliminar esta compra?"))return;_.collection("expenses").doc(t).delete().then(()=>{this.showToast("✅ Compra eliminada"),this.loadData()}).catch(s=>console.error(s))},async downloadReceiptsZip(){const t=new Date,e=t.getFullYear(),s=t.getMonth(),o=this.state.expenses.filter(r=>{const a=new Date(r.fecha_factura||r.date);return a.getFullYear()===e&&a.getMonth()===s&&r.receiptUrl});if(o.length===0){this.showToast("ℹ️ No hay comprobantes con recibo este mes");return}this.showToast(`📦 Preparando ZIP con ${o.length} comprobantes...`);try{const r=new JSZip,a=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],n=`Comprobantes_${e}_${String(s+1).padStart(2,"0")}_${a[s]}`,l=r.folder(n);let i=`RESUMEN DE COMPROBANTES - ${a[s]} ${e}
`;i+=`${"=".repeat(50)}

`,i+=`Generado: ${t.toLocaleString("es-ES")}
`,i+=`Total comprobantes: ${o.length}
`,i+=`Total gastos: ${this.formatCurrency(o.reduce((y,m)=>y+(m.monto_total||m.amount||0),0))}
`,i+=`Total IVA: ${this.formatCurrency(o.reduce((y,m)=>y+(m.monto_iva||0),0))}

`,i+=`${"=".repeat(50)}

`,i+=`DETALLE:

`;let p=0,c=0;for(let y=0;y<o.length;y++){const m=o[y],$=new Date(m.fecha_factura||m.date).toISOString().split("T")[0],b=(m.proveedor||"SinNombre").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,"").replace(/\s+/g,"-").substring(0,20).trim(),v=Math.round(m.monto_total||m.amount||0);let k="jpg";m.receiptUrl.includes(".pdf")?k="pdf":m.receiptUrl.includes(".png")&&(k="png");const I=`${String(y+1).padStart(3,"0")}_${$}_${b}_${v}DKK.${k}`;try{const C=await fetch(m.receiptUrl);if(!C.ok)throw new Error("Fetch failed");const g=await C.blob();l.file(I,g),p++,i+=`${String(y+1).padStart(3,"0")}. ${$} | ${b}
`,i+=`    Total: ${this.formatCurrency(m.monto_total||m.amount||0)} | IVA: ${this.formatCurrency(m.monto_iva||0)}
`,i+=`    Archivo: ${I}

`}catch(C){console.warn(`Could not fetch receipt for ${m.proveedor}:`,C),c++,i+=`${String(y+1).padStart(3,"0")}. ${$} | ${b} - ⚠️ ERROR: No se pudo descargar

`}}l.file("_INDICE.txt",i);const u=await r.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}}),d=`${n}.zip`;saveAs(u,d),c>0?this.showToast(`⚠️ ZIP generado: ${p} OK, ${c} con error`):this.showToast(`✅ ZIP descargado: ${p} comprobantes`)}catch(r){console.error("ZIP generation error:",r),this.showToast("❌ Error al generar ZIP")}},async handleReceiptUpload(t){const e=t.files[0];if(!e)return;const s=document.getElementById("upload-placeholder"),o=document.getElementById("upload-preview"),r=document.getElementById("receipt-preview-img"),a=document.getElementById("receipt-filename"),n=document.getElementById("receipt-url");s.innerHTML='<i class="ph-duotone ph-spinner text-4xl text-brand-orange animate-spin mb-2"></i><p class="text-sm text-slate-500">Subiendo...</p>';try{const l=e.name.split(".").pop().toLowerCase(),{structuredPath:i,structuredFilename:p}=this.generateReceiptPath(l),u=firebase.storage().ref().child(i);await u.put(e);const d=await u.getDownloadURL();if(n.value=d,document.getElementById("receipt-url").dataset.structuredPath=i,document.getElementById("receipt-url").dataset.structuredFilename=p,e.type.startsWith("image/"))r.src=URL.createObjectURL(e),r.classList.remove("hidden");else if(e.type==="application/pdf"){r.src="",r.classList.add("hidden");const y=r.parentNode.querySelector(".ph-file-pdf");y&&y.remove();const m=document.createElement("i");m.className="ph-duotone ph-file-pdf text-6xl text-red-500 mb-2 block mx-auto",r.parentNode.insertBefore(m,r)}a.textContent=p,s.classList.add("hidden"),o.classList.remove("hidden"),s.innerHTML=`
                <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                    Subir Factura/Recibo
                </p>
                <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
            `,this.showToast("✅ Archivo subido correctamente")}catch(l){console.error("Upload error details:",l),alert("Error al subir: "+l.message),s.innerHTML=`
                <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                    Subir Factura/Recibo
                </p>
                <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
            `,this.showToast("❌ Error: "+l.message)}},generateReceiptPath(t){var e,s;try{const o=new Date,r=o.getFullYear(),a=o.getMonth()+1,n=o.getDate(),l=((e=document.getElementById("expense-proveedor"))==null?void 0:e.value)||"Proveedor",i=((s=document.getElementById("expense-monto"))==null?void 0:s.value)||"0",p=l.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,"").replace(/\s+/g,"-").substring(0,20).trim()||"Proveedor",c=Math.round(parseFloat(i)||0)+"dkk",u=Math.random().toString(36).substring(2,7).toUpperCase(),y=`${`${r}-${String(a).padStart(2,"0")}-${String(n).padStart(2,"0")}`}_${p}_${c}_${u}.${t}`,m=`receipts/${y}`;return console.log("📁 Structured Receipt Path:",m),{structuredPath:m,structuredFilename:y}}catch(o){console.error("Error in generateReceiptPath:",o);const r=`receipt_${Date.now()}.${t}`;return{structuredPath:`receipts/${r}`,structuredFilename:r}}},async processReceiptOCR(t){var e,s;try{const o=document.getElementById("expense-form-title"),r=o.innerHTML;o.innerHTML='<i class="ph-duotone ph-scan text-brand-orange animate-pulse"></i> Escaneando recibo...';const a=new FormData;a.append("url",t),a.append("language","dan"),a.append("isOverlayRequired","false"),a.append("OCREngine","2"),a.append("scale","true"),a.append("isTable","false");const l=await(await fetch("https://api.ocr.space/parse/image",{method:"POST",headers:{apikey:Oe},body:a})).json();if(l.IsErroredOnProcessing)throw new Error(l.ErrorMessage||"OCR processing failed");const i=((s=(e=l.ParsedResults)==null?void 0:e[0])==null?void 0:s.ParsedText)||"";console.log("OCR Raw Text:",i);const p=this.parseReceiptText(i);this.autoFillExpenseForm(p),o.innerHTML='<i class="ph-duotone ph-check-circle text-green-500"></i> Datos extraídos - verifica';const c=Object.values(p).filter(u=>u).length;c>=3?this.showToast("✨ Datos extraídos correctamente"):c>0?this.showToast("⚠️ Algunos datos extraídos - completa manualmente"):(this.showToast("ℹ️ No se detectaron datos - ingresa manualmente"),o.innerHTML=r)}catch(o){console.error("OCR Error:",o),this.showToast("⚠️ OCR no disponible - ingresa datos manualmente");const r=document.getElementById("expense-form-title");r.innerHTML='<i class="ph-duotone ph-plus-circle text-brand-orange"></i> Nueva Compra'}},fileToBase64(t){return new Promise((e,s)=>{const o=new FileReader;o.onload=()=>e(o.result),o.onerror=s,o.readAsDataURL(t)})},parseReceiptText(t){const e={fecha:null,proveedor:null,monto_total:null,monto_iva:null},s=t.replace(/\r\n/g,`
`).replace(/\s+/g," "),o=t.split(/\r?\n/).map(p=>p.trim()).filter(p=>p),r=[/(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/,/(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2})/,/(\d{1,2}\.\s?\w+\.?\s?\d{2,4})/i];for(const p of r){const c=s.match(p);if(c){e.fecha=this.normalizeDate(c[1]);break}}const a=[/(?:i\s*alt|total|sum|totalt|att\s*betala)[:\s]*(\d+[.,]\d{2})/i,/(?:total|sum)[:\s]*(?:kr\.?|dkk)?\s*(\d+[.,]\d{2})/i,/(\d+[.,]\d{2})\s*(?:dkk|kr)/i];for(const p of a){const c=s.match(p);if(c){e.monto_total=parseFloat(c[1].replace(",","."));break}}const n=[/(?:moms|25%|heraf\s*moms)[:\s]*(\d+[.,]\d{2})/i,/(?:vat|iva|tax)[:\s]*(\d+[.,]\d{2})/i,/moms\s*(?:kr\.?|dkk)?\s*(\d+[.,]\d{2})/i];for(const p of n){const c=s.match(p);if(c){e.monto_iva=parseFloat(c[1].replace(",","."));break}}e.monto_total&&!e.monto_iva&&(e.monto_iva=Math.round(e.monto_total*.2*100)/100);const l=["kvittering","receipt","bon","faktura","invoice","kopi","copy"];for(const p of o.slice(0,5)){const c=p.trim();if(c.length>2&&c.length<50&&!l.some(u=>c.toLowerCase().includes(u))&&!/^\d+$/.test(c)&&!/^[\d\s\-\/\.]+$/.test(c)){e.proveedor=c;break}}const i=s.match(/(?:cvr|org\.?\s*nr)[:\s]*(\d{8})/i);if(i&&o.length>0){const p=o.findIndex(c=>c.includes(i[0]));p>0&&!e.proveedor&&(e.proveedor=o[p-1])}return console.log("Parsed Receipt Data:",e),e},normalizeDate(t){try{const s=t.replace(/\s/g,"").replace(/[\.\/]/g,"-").split("-");if(s.length>=3){let o,r,a;return s[0].length===4?[a,r,o]=s:([o,r,a]=s,a.length===2&&(a="20"+a)),o=o.padStart(2,"0"),r=r.padStart(2,"0"),`${a}-${r}-${o}`}}catch{console.warn("Date normalization failed:",t)}return null},autoFillExpenseForm(t){if(t.fecha){const e=document.getElementById("expense-fecha");e&&(e.value=t.fecha,this.highlightAutoFilled(e))}if(t.proveedor){const e=document.getElementById("expense-proveedor");e&&(e.value=t.proveedor,this.highlightAutoFilled(e))}if(t.monto_total){const e=document.getElementById("expense-monto");e&&(e.value=t.monto_total.toFixed(2),this.highlightAutoFilled(e))}if(t.monto_iva){const e=document.getElementById("expense-iva");e&&!e.disabled&&(e.value=t.monto_iva.toFixed(2),this.highlightAutoFilled(e))}},highlightAutoFilled(t){t.classList.add("ring-2","ring-green-400","bg-green-50");const e=()=>{t.classList.remove("ring-2","ring-green-400","bg-green-50"),t.removeEventListener("focus",e)};t.addEventListener("focus",e),setTimeout(e,5e3)},clearReceiptUpload(){document.getElementById("receipt-file").value="",document.getElementById("receipt-url").value="",document.getElementById("upload-placeholder").classList.remove("hidden"),document.getElementById("upload-preview").classList.add("hidden"),document.getElementById("receipt-preview-img").src="",document.getElementById("receipt-filename").textContent=""},renderConsignments(t){if(!t)return;const e=`
    <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6 animate-fadeIn" >
                                                                    <div class="flex justify-between items-center mb-8">
                                                                        <h2 class="font-display text-2xl font-bold text-brand-dark">Socios y Consignación</h2>
                                                                        <button onclick="app.openAddConsignorModal()" class="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                                            <i class="ph-bold ph-plus"></i>
                                                                            Nuevo Socio
                                                                        </button>
                                                                    </div>

                                                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        ${this.state.consignors.map(s=>{const o=s.name,a=this.state.inventory.filter(c=>c.owner===o).reduce((c,u)=>c+u.stock,0),n=[];this.state.sales.forEach(c=>{(c.items||[]).filter(d=>{if((d.owner||"").toLowerCase()===o.toLowerCase())return!0;const y=this.state.inventory.find(m=>m.id===(d.productId||d.recordId));return y&&(y.owner||"").toLowerCase()===o.toLowerCase()}).forEach(d=>{const y=Number(d.priceAtSale||d.unitPrice||0),m=s.agreementSplit||s.split||70,E=y*m/100;n.push({...d,id:c.id,date:c.date,cost:d.costAtSale||d.cost||E,payoutStatus:c.payoutStatus||"pending",payoutDate:c.payoutDate||null})}),(!c.items||c.items.length===0)&&(c.owner||"").toLowerCase()===o.toLowerCase()&&n.push({...c,album:c.album||c.sku||"Record",cost:c.cost||(Number(c.total)||0)*(s.agreementSplit||70)/100})}),n.sort((c,u)=>new Date(u.date)-new Date(c.date)),n.reduce((c,u)=>c+(Number(u.qty||u.quantity)||1),0);const l=n.reduce((c,u)=>c+(Number(u.cost)||0),0),i=n.filter(c=>c.payoutStatus==="paid").reduce((c,u)=>c+(Number(u.cost)||0),0),p=l-i;return`
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
                                    <p class="font-display font-bold text-xl ${p>0?"text-brand-orange":"text-slate-500"}">${this.formatCurrency(p)}</p>
                                </div>
                            </div>

                            <div class="border-t border-slate-100 pt-4">
                                <div class="flex justify-between items-center mb-4">
                                    <h4 class="font-bold text-sm text-brand-dark">Historial de Ventas</h4>
                                    <span class="text-xs text-slate-500 font-medium">Pagado: ${this.formatCurrency(i)}</span>
                                </div>
                                <div class="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                    ${n.length>0?n.map(c=>`
                                        <div class="flex items-center justify-between p-3 rounded-xl border ${c.payoutStatus==="paid"?"bg-slate-50 border-slate-100 opacity-60":"bg-white border-orange-100 shadow-sm"} transition-all">
                                            <div class="flex-1 min-w-0 pr-3">
                                                <div class="font-bold text-xs truncate text-brand-dark">${c.album||c.sku}</div>
                                                <div class="text-[10px] text-slate-400">${this.formatDate(c.date)} • ${this.formatCurrency(c.cost)}</div>
                                                ${c.payoutStatus==="paid"&&c.payoutDate?`<div class="text-[9px] text-green-600 font-bold mt-0.5"><i class="ph-bold ph-check"></i> Pagado: ${this.formatDate(c.payoutDate)}</div>`:""}
                                            </div>
                                            <button 
                                                onclick="app.togglePayoutStatus('${c.id}', '${c.payoutStatus||"pending"}')"
                                                class="shrink-0 h-8 px-3 rounded-lg text-[10px] font-bold border transition-colors ${c.payoutStatus==="paid"?"bg-slate-200 border-slate-300 text-slate-500 hover:bg-slate-300":"bg-green-100 border-green-200 text-green-700 hover:bg-green-200"}"
                                            >
                                                ${c.payoutStatus==="paid"?"PAGADO":"PAGAR"}
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
    `;t.innerHTML=e},togglePayoutStatus(t,e){if(!confirm(`¿Marcar esta venta como ${e==="paid"?"PENDIENTE":"PAGADA"}?`))return;const s=e==="paid"?"pending":"paid",o={payoutStatus:s};s==="paid"?o.payoutDate=new Date().toISOString():o.payoutDate=null,_.collection("sales").doc(t).update(o).then(()=>{this.showToast(s==="paid"?"✅ Venta marcada como PAGADA":"✅ Venta marcada como PENDIENTE"),this.loadData()}).catch(r=>{console.error(r),this.showToast("❌ Error al actualizar: "+r.message,"error")})},openAddConsignorModal(){document.body.insertAdjacentHTML("beforeend",`
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

`)},handleAddConsignor(t){t.preventDefault();const e=new FormData(t.target),s={name:e.get("name"),agreementSplit:parseFloat(e.get("split")),email:e.get("email"),phone:e.get("phone")};_.collection("consignors").add(s).then(()=>{this.showToast("✅ Socio registrado correctamente"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>{console.error(o),this.showToast("❌ Error al crear socio: "+o.message,"error")})},deleteConsignor(t){confirm("¿Eliminar este socio?")&&_.collection("consignors").doc(t).delete().then(()=>{this.showToast("✅ Socio eliminado"),this.loadData()}).catch(e=>{console.error(e),this.showToast("❌ Error al eliminar socio: "+e.message,"error")})},saveData(){try{const t={};localStorage.setItem("el-cuartito-settings",JSON.stringify(t))}catch(t){console.error("Error saving settings:",t)}},searchDiscogs(){const t=document.getElementById("discogs-search-input").value,e=document.getElementById("discogs-results");if(t){if(e.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Buscando en Discogs...</p>',e.classList.remove("hidden"),/^\d+$/.test(t.trim())){this.fetchDiscogsById(t.trim());return}fetch(`${R}/discogs/search?q=${encodeURIComponent(t)}`).then(s=>{if(!s.ok)throw new Error(`Error ${s.status}`);return s.json()}).then(s=>{const o=s.results||[];o.length>0?e.innerHTML=o.slice(0,10).map(r=>`
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
                `})}},resyncMusic(){["input-discogs-id","input-discogs-release-id","input-discogs-url","input-cover-image"].forEach(o=>{const r=document.getElementById(o);r&&(r.value="")});const t=document.querySelector('input[name="artist"]').value,e=document.querySelector('input[name="album"]').value,s=document.getElementById("discogs-search-input");s&&t&&e?(s.value=`${t} - ${e}`,this.searchDiscogs(),this.showToast("✅ Música desvinculada. Selecciona una nueva edición.","success")):this.showToast("⚠️ Falta Artista o Álbum para buscar.","error")},handleDiscogsSelection(t){const e=document.getElementById("discogs-results");e&&e.classList.add("hidden");const s=t.title.split(" - "),o=s[0]||"",r=s.slice(1).join(" - ")||t.title,a=document.querySelector("#modal-overlay form");if(!a)return;if(a.artist&&(a.artist.value=o),a.album&&(a.album.value=r),a.year&&t.year&&(a.year.value=t.year),t.thumb||t.cover_image){const l=t.cover_image||t.thumb,i=document.getElementById("input-cover-image"),p=document.getElementById("cover-preview");if(i&&(i.value=l),p){const c=p.querySelector("img"),u=document.getElementById("cover-placeholder");c&&(c.src=l,c.classList.remove("hidden")),u&&u.classList.add("hidden")}}const n=document.getElementById("input-discogs-id");if(n&&t.id&&(n.value=t.id),t.uri||t.resource_url){const l=t.uri||t.resource_url,i=l.startsWith("http")?l:"https://www.discogs.com"+l,p=document.getElementById("input-discogs-url");p&&(p.value=i)}if(t.id){const l=document.getElementById("discogs-metadata-area"),i=document.getElementById("metadata-tracks"),p=document.getElementById("metadata-tags"),c=document.getElementById("discogs-link");console.log("Metadata Area Found:",!!l),l&&(l.classList.remove("hidden"),l.style.display="grid"),i&&(i.innerHTML='<p class="text-[10px] text-slate-400 animate-pulse">Loading tracks...</p>'),this.showToast("⏳ Cargando detalles...","info"),fetch(`${R}/discogs/release/${t.id}`).then(u=>u.json()).then(u=>{const d=u.release||u;if(console.log("Full Release Data:",d),l&&(l.classList.remove("hidden"),l.style.display="grid"),c&&d.uri){const E=d.uri.startsWith("http")?d.uri:"https://www.discogs.com"+d.uri;c.href=E,c.classList.remove("hidden"),c.style.display="flex"}const y=d.styles||[],m=[...new Set(y)];p&&(p.innerHTML=m.map(E=>`<span class="meta-chip border border-slate-200">${E}</span>`).join(""));for(let E=0;E<Math.min(m.length,3);E++){const $=document.getElementById(`genre-${E+1}`);$&&($.value=m[E])}if(i)if(d.tracklist&&d.tracklist.length>0){const E=document.getElementById("input-tracks");E&&(E.value=JSON.stringify(d.tracklist)),i.innerHTML=d.tracklist.map($=>`
                                <div class="track-item flex justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
                                    <span class="font-bold w-6 opacity-40 shrink-0 capitalize text-[9px]">${$.position||"•"}</span>
                                    <span class="flex-1 truncate font-medium text-slate-600 text-[10px]">${$.title}</span>
                                    <span class="opacity-40 text-[9px] font-mono shrink-0">${$.duration||""}</span>
                                </div>
                            `).join("")}else i.innerHTML='<p class="text-[10px] text-slate-400 italic">No tracks found.</p>';a.label&&d.labels&&d.labels.length>0&&(a.label.value=d.labels[0].name)}).catch(u=>{console.error("Error fetching full release:",u),i&&(i.innerHTML='<p class="text-[10px] text-red-400">Error loading tracklist.</p>')})}},openTracklistModal(t){const e=this.state.inventory.find(a=>a.id===t||a.sku===t);if(!e)return;let s=e.discogsId;document.body.insertAdjacentHTML("beforeend",`
                                                                <div id="tracklist-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-fadeIn">
                                                                        <h3 class="font-display text-xl font-bold text-brand-dark mb-4">Lista de Temas (Tracklist)</h3>
                                                                        <div class="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                                                            <i class="ph-bold ph-spinner animate-spin text-4xl text-brand-orange"></i>
                                                                            <p class="font-medium">Cargando tracks desde Discogs...</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `);const r=a=>{fetch(`${R}/discogs/release/${a}`).then(n=>{if(!n.ok)throw new Error("Release not found");return n.json()}).then(n=>{const i=(n.release||n).tracklist||[],p=i.map(u=>`
                                                                <div class="flex items-center justify-between py-3 border-b border-slate-50 hover:bg-slate-50 px-2 transition-colors rounded-lg group">
                                                                    <div class="flex items-center gap-3">
                                                                        <span class="text-xs font-mono font-bold text-slate-400 w-8">${u.position}</span>
                                                                        <span class="text-sm font-bold text-brand-dark group-hover:text-brand-orange transition-colors">${u.title}</span>
                                                                    </div>
                                                                    <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">${u.duration||"--:--"}</span>
                                                                </div>
                                                                `).join(""),c=`
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
                                                                        ${i.length>0?p:'<p class="text-center text-slate-500 py-8">No se encontraron temas para esta edición.</p>'}
                                                                    </div>
                                                                    <div class="p-3 bg-slate-50 text-center shrink-0 border-t border-slate-100">
                                                                        <a href="https://www.discogs.com/release/${a}" target="_blank" class="text-xs font-bold text-brand-orange hover:underline flex items-center justify-center gap-1">
                                                                            Ver release completo en Discogs <i class="ph-bold ph-arrow-square-out"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                `;document.getElementById("tracklist-overlay").innerHTML=c}).catch(n=>{console.error(n),document.getElementById("tracklist-overlay").innerHTML=`
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
                    `})}},renderDiscogsSales(t){const e=this.state.sales.filter(i=>i.channel==="discogs"),s=i=>parseFloat(i.total)||0,o=i=>parseFloat(i.originalTotal)||parseFloat(i.total)+(parseFloat(i.discogsFee||0)+parseFloat(i.paypalFee||0)),r=i=>o(i)-s(i),a=e.reduce((i,p)=>i+s(p),0),n=e.reduce((i,p)=>i+r(p),0),l=e.reduce((i,p)=>{const c=s(p);let u=0;return p.items&&Array.isArray(p.items)&&(u=p.items.reduce((d,y)=>{const m=parseFloat(y.costAtSale||0),E=parseInt(y.qty||y.quantity)||1;return d+m*E},0)),i+(c-u)},0);t.innerHTML=`
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
                            <div class="text-2xl font-bold text-green-600">${this.formatCurrency(l)}</div>
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
                                ${e.map(i=>{var c;const p=(c=i.timestamp)!=null&&c.toDate?i.timestamp.toDate():i.date?new Date(i.date):new Date(0);return{...i,_sortDate:p.getTime()}}).sort((i,p)=>p._sortDate-i._sortDate).map(i=>{var m;const p=(m=i.timestamp)!=null&&m.toDate?i.timestamp.toDate():new Date(i.date),c=i.items&&i.items[0],u=i.originalTotal||i.total+(i.discogsFee||0)+(i.paypalFee||0);i.discogsFee,i.paypalFee;const d=i.total,y=i.status==="pending_review"||i.needsReview;return`
                                        <tr class="border-b border-slate-50 hover:bg-purple-50/30 transition-colors cursor-pointer ${y?"bg-orange-50/50":""}" onclick="app.openUnifiedOrderDetailModal('${i.id}')">
                                            <td class="px-6 py-4 text-sm text-slate-600">${p.toLocaleDateString("es-ES")}</td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[200px]">${(c==null?void 0:c.album)||"Producto"}</div>
                                                <div class="text-xs text-slate-500">${(c==null?void 0:c.artist)||"-"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-xs text-slate-500">Precio Lista: <span class="font-bold text-slate-700">${this.formatCurrency(u)}</span></div>
                                                ${i.discogs_order_id?`<div class="text-[10px] text-purple-600 font-medium">Order: ${i.discogs_order_id}</div>`:""}
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-[10px] text-red-500 font-bold">Total Fees: -${this.formatCurrency(u-d)}</div>
                                                <div class="text-[10px] text-slate-400 font-medium">
                                                    ${u>0?`(${((u-d)/u*100).toFixed(1)}%)`:""}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm font-bold text-brand-dark">${this.formatCurrency(d)}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="flex flex-col gap-2">
                                                    ${y?`
                                                        <span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider text-center">Pendiente</span>
                                                    `:`
                                                        <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider text-center">Confirmado</span>
                                                    `}
                                                    <button onclick="app.openUpdateSaleValueModal('${i.id}', ${u}, ${d})" class="w-full py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1">
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
        `;document.body.insertAdjacentHTML("beforeend",s)},calculateModalFee(t,e){const s=parseFloat(t)||0,o=e-s,r=e>0?o/e*100:0,a=document.getElementById("modal-fee-display"),n=document.getElementById("modal-fee-value");if(o>0){a.classList.remove("hidden"),n.innerText=`- kr. ${o.toFixed(2)}`;const l=document.getElementById("modal-fee-percent");l&&(l.innerText=`${r.toFixed(1)}%`)}else a.classList.add("hidden")},async handleSaleValueUpdate(t,e,s){t.preventDefault();const r=new FormData(t.target).get("netReceived"),a=document.getElementById("update-sale-submit-btn");if(r){a.disabled=!0,a.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Guardando...';try{const n=R,l=await ee.currentUser.getIdToken(),i=await fetch(`${n}/firebase/sales/${e}/value`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${l}`},body:JSON.stringify({netReceived:r})}),p=i.headers.get("content-type");if(!p||!p.includes("application/json")){const u=await i.text();throw console.error("Non-JSON response received:",u),new Error(`Server returned non-JSON response (${i.status})`)}const c=await i.json();if(c.success)this.showToast("✅ Venta actualizada y fee registrado"),document.getElementById("update-sale-modal").remove(),await this.loadData(),this.refreshCurrentView();else throw new Error(c.error||"Error al actualizar")}catch(n){console.error("Update sale error:",n),this.showToast(`❌ Error: ${n.message}`),a.disabled=!1,a.innerText="Confirmar Ajuste"}}},renderPickups(t){const e=this.state.sales.filter(n=>{var l;return n.channel==="online"&&(((l=n.shipping_method)==null?void 0:l.id)==="local_pickup"||n.shipping_cost===0&&n.status!=="failed")}),s=e.filter(n=>n.status==="completed"||n.status==="paid"||n.status==="paid_pending"),o=e.filter(n=>n.status==="ready_for_pickup"),r=e.filter(n=>n.status==="shipped"||n.status==="delivered"||n.status==="picked_up"),a=`
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
                                `:s.map(n=>{var l,i;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${n.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${n.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${((l=n.customer)==null?void 0:l.name)||n.customerName||"Cliente"}</td>
                                        <td class="p-4 text-xs text-slate-500">${((i=n.items)==null?void 0:i.length)||0} items</td>
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
                                `:o.map(n=>{var l,i;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${n.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${n.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${((l=n.customer)==null?void 0:l.name)||n.customerName||"Cliente"}</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate((i=n.updated_at)!=null&&i.toDate?n.updated_at.toDate():n.updated_at||n.date)}</td>
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
        `;t.innerHTML=a},async setReadyForPickup(t,e){var s,o;try{const r=e||window.event,a=(s=r==null?void 0:r.target)==null?void 0:s.closest("button");if(a){a.disabled=!0;const i=a.innerHTML;a.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Notificando...'}const n=await fetch(`${R}/api/ready-for-pickup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t})}),l=await n.json();if(n.ok&&l.success){this.showToast("✅ Cliente notificado - El pedido está listo para retiro"),await this.loadData();const i=document.getElementById("unified-modal");i?(i.remove(),this.openUnifiedOrderDetailModal(t)):this.refreshCurrentView()}else throw new Error(l.error||l.message||"Error al notificar")}catch(r){console.error("Error in setReadyForPickup:",r),this.showToast("❌ Error: "+r.message,"error");const a=e||window.event,n=(o=a==null?void 0:a.target)==null?void 0:o.closest("button");n&&(n.disabled=!1,n.innerHTML='<i class="ph-bold ph-bell"></i> Notificar Listo')}},async markAsDelivered(t,e){var s;try{const o=e||window.event,r=(s=o==null?void 0:o.target)==null?void 0:s.closest("button");r&&(r.disabled=!0),await _.collection("sales").doc(t).update({status:"picked_up",fulfillment_status:"delivered",picked_up_at:firebase.firestore.FieldValue.serverTimestamp(),updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast("✅ Pedido retirado correctamente"),await this.loadData(),this.refreshCurrentView()}catch(o){this.showToast("❌ Error: "+o.message,"error")}},async deleteExpenseVAT(t){const e=this.state.expenses.find(s=>s.id===t);if(e!=null&&e.receiptUrl){if(!confirm(`⚠️ ATENCIÓN: Este gasto tiene un recibo adjunto.

¿Estás seguro de que quieres eliminarlo?`))return;if(!confirm(`🔒 CONFIRMACIÓN LEGAL REQUERIDA

La ley exige guardar documentos contables durante 5 AÑOS.

Fecha del gasto: `+(e.fecha_factura||e.date||"Desconocida")+`
Proveedor: `+(e.proveedor||"Sin nombre")+`
Monto: `+this.formatCurrency(e.monto_total||e.amount||0)+`

¿CONFIRMAS que deseas eliminar permanentemente este registro y su recibo?`)){this.showToast("ℹ️ Eliminación cancelada");return}}else if(!confirm("¿Estás seguro de que quieres eliminar este gasto?"))return;try{await _.collection("expenses").doc(t).delete(),this.showToast("✅ Gasto eliminado"),this.loadData()}catch(s){console.error("Error deleting expense:",s),this.showToast("❌ Error al eliminar gasto")}},renderVATReport(t){const e=new Date,s=Math.floor(e.getMonth()/3)+1,o=e.getFullYear(),r=this.state.vatReportQuarter!==void 0?this.state.vatReportQuarter:s,a=this.state.vatReportYear||o;let n,l;if(r===0)n=new Date(a,0,1),l=new Date(a,11,31,23,59,59);else{const x=(r-1)*3;n=new Date(a,x,1),l=new Date(a,x+3,0,23,59,59)}const i=this.state.sales.filter(x=>{var V;const M=(V=x.timestamp)!=null&&V.toDate?x.timestamp.toDate():new Date(x.timestamp||x.date);return M>=n&&M<=l});let p=[],c=[],u=[],d=0,y=0,m=0,E=0;i.forEach(x=>{var te;const M=(te=x.timestamp)!=null&&te.toDate?x.timestamp.toDate():new Date(x.timestamp||x.date);(x.items||[]).forEach(N=>{const le=N.priceAtSale||N.price||0;let ie=N.costAtSale||N.cost||0;const X=N.productId||N.recordId,Y=N.album;let O=N.providerOrigin||N.provider_origin;if(ie===0||!O){const H=this.state.inventory.find(U=>X&&(U.id===X||U.sku===X)||Y&&U.album===Y);H&&(ie===0&&(ie=H.cost||0),O||(O=H.provider_origin||"Local_Used"))}O||(O="Local_Used");const G=N.qty||N.quantity||1,z=le*G,W=ie*G;if(O==="EU_B2B"||O==="DK_B2B"){const H=z*.2;d+=H,p.push({date:M,productId:N.productId||N.album||"N/A",album:N.album||"N/A",salePrice:z,vat:H})}else{const H=z-W,U=H>0?H*.2:0;y+=U,c.push({date:M,productId:N.productId||N.album||"N/A",album:N.album||"N/A",cost:W,salePrice:z,margin:H,vat:U})}});const oe=parseFloat(x.shipping_income||x.shipping||x.shipping_cost||0);if(oe>0){const N=oe*.2;m+=N,E+=oe,u.push({date:M,orderId:x.orderNumber||(x.id&&typeof x.id=="string"?x.id.slice(-8):"N/A"),income:oe,vat:N})}}),(this.state.extraIncome||[]).filter(x=>{const M=new Date(x.date);return M>=n&&M<=l}).forEach(x=>{const M=Number(x.amount)||0,V=Number(x.vatAmount)||0;d+=V,p.push({date:new Date(x.date),productId:"EXTRA",album:`💰 ${x.description||"Ingreso Extra"} (${x.category||"other"})`,salePrice:M,vat:V})});const b=d+y+m,v=this.state.expenses.filter(x=>{var oe;const M=x.fecha_factura?new Date(x.fecha_factura):(oe=x.timestamp)!=null&&oe.toDate?x.timestamp.toDate():new Date(x.timestamp||x.date);return(x.categoria_tipo==="operativo"||x.categoria_tipo==="stock_nuevo"||x.is_vat_deductible)&&M>=n&&M<=l}),k=v.filter(x=>x.categoria!=="envios"),I=v.filter(x=>x.categoria==="envios"),C=k.reduce((x,M)=>x+(parseFloat(M.monto_iva)||0),0),g=I.reduce((x,M)=>x+(parseFloat(M.monto_iva)||0),0);I.reduce((x,M)=>x+(parseFloat(M.monto_total)||0),0);const f=(this.state.inventory||[]).filter(x=>{if(!x.item_phantom_vat||x.item_phantom_vat<=0||x.provider_origin!=="EU_B2B")return!1;const M=x.acquisition_date?new Date(x.acquisition_date):null;return M?M>=n&&M<=l:!1}),S=f.reduce((x,M)=>x+(M.item_phantom_vat||0),0),D=(this.state.inventory||[]).filter(x=>{if(!x.item_real_vat||x.item_real_vat<=0||x.provider_origin!=="DK_B2B")return!1;const M=x.acquisition_date?new Date(x.acquisition_date):null;return M?M>=n&&M<=l:!1}),T=D.reduce((x,M)=>x+(M.item_real_vat||0),0),L=b+S,q=C+g+S+T,P=L-q,K={0:`Resumen anual ${a}`,1:`1 de junio, ${a}`,2:`1 de septiembre, ${a}`,3:`1 de diciembre, ${a}`,4:`1 de marzo, ${a+1}`}[r],ae=`
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
                    <div class="${P>0?"bg-red-50 border-red-100":"bg-emerald-50 border-emerald-100"} rounded-3xl p-8 border shadow-sm relative overflow-hidden group">
                        <p class="${P>0?"text-red-700/60":"text-emerald-700/60"} text-xs font-bold uppercase tracking-widest mb-4">Moms Tilsvar</p>
                        <p class="text-4xl font-display font-bold mb-2 ${P>0?"text-red-700":"text-emerald-700"}">${this.formatCurrency(P)}</p>
                        <p class="text-[11px] ${P>0?"text-red-600/70":"text-emerald-600/70"} mt-4 italic font-medium">
                            <i class="ph-bold ph-calendar"></i> Límite de pago: ${K}
                        </p>
                    </div>

                    <!-- Tarjeta B: Salgsmoms + Rubrik A (IVA Liability Total) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Salgsmoms + Rubrik A</p>
                            <span class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-bold ph-arrow-up-right"></i></span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(L)}</p>
                        <div class="mt-3 space-y-1">
                            <p class="text-[11px] text-slate-400 font-medium">Ventas + Envíos: ${this.formatCurrency(b)}</p>
                            ${S>0?`<p class="text-[11px] text-blue-500 font-bold">Rubrik A (EU-Moms): + ${this.formatCurrency(S)}</p>`:""}
                        </div>
                    </div>

                    <!-- Tarjeta C: Købsmoms (IVA Deducible) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Købsmoms</p>
                            <span class="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-bold ph-arrow-down-left"></i></span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(q)}</p>
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
                                        <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Monto: ${this.formatCurrency(p.reduce((x,M)=>x+M.salePrice,0))}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-lg font-bold text-blue-600">${this.formatCurrency(d)}</p>
                                        <p class="text-[10px] text-slate-400 font-bold">IVA (25%)</p>
                                    </div>
                                </div>
                                <div class="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div class="h-full bg-blue-500 rounded-full" style="width: ${b>0?d/b*100:0}%"></div>
                                </div>

                                <!-- Margin Scheme Sales -->
                                <div class="pt-4 border-t border-slate-50">
                                    <div class="flex items-center justify-between mb-1">
                                        <div>
                                            <p class="font-bold text-brand-dark">Régimen Margen (Usados)</p>
                                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Margen total: ${this.formatCurrency(c.reduce((x,M)=>x+M.margin,0))}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-amber-600">${this.formatCurrency(y)}</p>
                                            <p class="text-[10px] text-slate-400 font-bold">IVA s/Margen</p>
                                        </div>
                                    </div>
                                    ${c.some(x=>x.margin<0)?`
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
                                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Total cobrado: ${this.formatCurrency(E)}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-indigo-500">${this.formatCurrency(m)}</p>
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
                                        <p class="text-2xl font-display font-bold ${m-g>=0?"text-emerald-400":"text-red-400"}">
                                            ${this.formatCurrency(m-g)}
                                        </p>
                                    </div>
                                    <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">
                                        <i class="ph-bold ph-scales"></i>
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex justify-between text-xs">
                                        <span class="text-slate-400 italic">IVA Cobrado (Ingreso)</span>
                                        <span class="font-bold text-emerald-400">+ ${this.formatCurrency(m)}</span>
                                    </div>
                                    <div class="flex justify-between text-xs">
                                        <span class="text-slate-400 italic">IVA Pagado (Gasto)</span>
                                        <span class="font-bold text-red-400">- ${this.formatCurrency(g)}</span>
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
                                ${Object.entries(k.reduce((x,M)=>{const V=M.categoria||"otros";return x[V]=(x[V]||0)+(parseFloat(M.monto_iva)||0),x},{})).sort((x,M)=>M[1]-x[1]).map(([x,M])=>`
                                    <div class="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <i class="ph-bold ph-tag"></i>
                                            </div>
                                            <span class="font-bold text-slate-600 capitalize text-sm">${x.replace("_"," ")}</span>
                                        </div>
                                        <span class="font-bold text-slate-900 text-sm">${this.formatCurrency(M)}</span>
                                    </div>
                                `).join("")||`
                                    <div class="p-8 text-center text-slate-400 italic text-sm">No se registraron otros gastos deducibles.</div>
                                `}
                            </div>
                        </div>

                        ${S>0?`
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
                                            <p class="text-[10px] text-blue-500 uppercase font-bold tracking-tighter">${f.length} producto${f.length>1?"s":""} EU B2B · Efecto neto: 0</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xl font-bold text-blue-700">${this.formatCurrency(S)}</p>
                                        <p class="text-[10px] text-blue-500 font-bold">± Ambos lados</p>
                                    </div>
                                </div>
                                <div class="px-5 py-2 bg-blue-100/40 border-b border-blue-100 flex gap-6 text-[10px] font-bold">
                                    <span class="text-red-500">▲ Liability: +${this.formatCurrency(S)}</span>
                                    <span class="text-emerald-600">▼ Købsmoms: -${this.formatCurrency(S)}</span>
                                    <span class="text-blue-600">= Neto: ${this.formatCurrency(0)}</span>
                                </div>
                                <div class="divide-y divide-blue-100/50 max-h-48 overflow-y-auto">
                                    ${f.map(x=>`
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

                        ${T>0?`
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
                                            <p class="text-[10px] text-emerald-500 uppercase font-bold tracking-tighter">${D.length} producto${D.length>1?"s":""} DK B2B</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xl font-bold text-emerald-700">${this.formatCurrency(T)}</p>
                                        <p class="text-[10px] text-emerald-500 font-bold">Deducción pura</p>
                                    </div>
                                </div>
                                <div class="divide-y divide-emerald-100/50 max-h-48 overflow-y-auto">
                                    ${D.map(x=>`
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
                                    ${p.length>0?p.map(x=>`
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
                                    ${c.length>0?c.map(x=>`
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
                                        <td class="px-6 py-4 text-right text-lg text-amber-600">${this.formatCurrency(y)}</td>
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
                                    ${u.length>0?u.map(x=>`
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
                                        <td class="px-6 py-4 text-right text-lg text-blue-600">${this.formatCurrency(m)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;t.innerHTML=ae},updateVATQuarter(){const t=parseInt(document.getElementById("vat-quarter-select").value),e=parseInt(document.getElementById("vat-year-select").value);this.state.vatReportQuarter=t,this.state.vatReportYear=e,this.renderVATReport(document.getElementById("app-content"))},downloadVATAuditReport(){const t=new Date,e=Math.floor(t.getMonth()/3)+1,s=t.getFullYear(),o=this.state.vatReportQuarter||e,r=this.state.vatReportYear||s,a=(o-1)*3,n=new Date(r,a,1),l=new Date(r,a+3,0,23,59,59),i=this.state.sales.filter(f=>{var D;const S=(D=f.timestamp)!=null&&D.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date);return S>=n&&S<=l}),p=[];let c=1;i.forEach(f=>{var P;const S=(P=f.timestamp)!=null&&P.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date),D=S.toISOString().slice(0,10).replace(/-/g,""),T=f.channel||"N/A";(f.items||[]).forEach(j=>{const K=j.priceAtSale||j.price||0;let Q=j.costAtSale||j.cost||0;const Z=j.productId||j.recordId,ae=j.album;let x="Local_Used",M="N/A";const V=this.state.inventory.find(U=>Z&&(U.id===Z||U.sku===Z)||ae&&U.album===ae);V&&(Q=Q===0?V.cost||0:Q,x=V.provider_origin||"Local_Used",V.acquisition_date&&(M=new Date(V.acquisition_date).toISOString().slice(0,10)));const oe=j.qty||j.quantity||1,te=j.providerOrigin||x,N=te==="EU_B2B"||te==="DK_B2B",le=K*oe,ie=Q*oe;let X,Y,O;if(N)X=le,Y=le*.2,O="Standard Rate";else{const U=le-ie;X=U>0?U:0,Y=U>0?U*.2:0,O="Margin Scheme"}const G=V&&V.acquisition_date?new Date(V.acquisition_date):null,z=G&&G>=n&&G<=l,W=z&&x==="EU_B2B"&&V.item_phantom_vat||0,H=z?x==="DK_B2B"?V.item_real_vat||0:W:0;p.push({transactionId:`ECR-${D}-${String(c).padStart(4,"0")}`,date:S.toISOString().slice(0,10),channel:T,productName:`${j.album||"N/A"} - ${j.artist||"N/A"}`,sku:j.sku||Z||"N/A",providerOrigin:x,acquisitionDate:M,condition,costPrice:ie.toFixed(2),salesPrice:le.toFixed(2),calculationBasis:X.toFixed(2),schemeApplied:O,outputVat:Y.toFixed(2),euPhantomVat:W.toFixed(2),inputVat:H.toFixed(2)}),c++});const q=parseFloat(f.shipping_income||f.shipping||f.shipping_cost||0);q>0&&(p.push({transactionId:`ECR-SHIP-${D}-${String(c).padStart(4,"0")}`,date:S.toISOString().slice(0,10),channel:T,productName:`Envío Cobrado - Orden: ${f.orderNumber||"N/A"}`,sku:"SHIPPING",providerOrigin:"N/A",acquisitionDate:"N/A",condition:"Service",costPrice:"0.00",salesPrice:q.toFixed(2),calculationBasis:q.toFixed(2),schemeApplied:"Standard Rate",outputVat:(q*.2).toFixed(2),euPhantomVat:"0.00",inputVat:"0.00"}),c++)});const u=[];let d=1;this.state.expenses.filter(f=>{var T;const S=f.fecha_factura?new Date(f.fecha_factura):(T=f.timestamp)!=null&&T.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date);return(f.categoria_tipo==="operativo"||f.categoria_tipo==="stock_nuevo"||f.is_vat_deductible)&&S>=n&&S<=l}).forEach(f=>{var T;const S=f.fecha_factura?new Date(f.fecha_factura):(T=f.timestamp)!=null&&T.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date),D=S.toISOString().slice(0,10).replace(/-/g,"");u.push({transactionId:`ECP-EXP-${D}-${String(d).padStart(4,"0")}`,invoiceDate:S.toISOString().slice(0,10),category:f.categoria==="envios"?"Shipping Expense":"Operational Expense",vendor:f.proveedor||f.nombre||"N/A",description:f.descripcion||f.categoria||"N/A",sku:"N/A",grossAmount:parseFloat(f.monto_total||0).toFixed(2),euPhantomVat:"0.00",inputVat:parseFloat(f.monto_iva||0).toFixed(2)}),d++}),(this.state.inventory||[]).filter(f=>{if(!(f.provider_origin==="EU_B2B"||f.provider_origin==="DK_B2B"))return!1;const D=f.acquisition_date?new Date(f.acquisition_date):null;return D?D>=n&&D<=l:!1}).forEach(f=>{const S=new Date(f.acquisition_date),D=S.toISOString().slice(0,10).replace(/-/g,""),T=parseFloat(f.cost||0),L=f.provider_origin==="EU_B2B"&&f.item_phantom_vat||0,q=f.provider_origin==="DK_B2B"?f.item_real_vat||0:L;u.push({transactionId:`ECP-INV-${D}-${String(d).padStart(4,"0")}`,invoiceDate:S.toISOString().slice(0,10),category:`Stock Import (${f.provider_origin})`,vendor:f.provider_origin,description:`${f.album||"N/A"} - ${f.artist||"N/A"}`,sku:f.sku||"N/A",grossAmount:T.toFixed(2),euPhantomVat:L.toFixed(2),inputVat:q.toFixed(2)}),d++});const E="\uFEFF",$=(f,S)=>[f.join(","),...S.map(D=>f.map(T=>{const L=Object.keys(D)[f.indexOf(T)];return`"${String(D[L]||"").replace(/"/g,'""')}"`}).join(","))].join(`
`),b=["Transaction ID","Transaction Date","Sales Channel","Product Name","SKU / Item ID","Provider Origin","Acquisition Date","Condition","Cost Price (DKK)","Sales Price (DKK)","Calculation Basis (DKK)","VAT Scheme Applied","Output VAT / Salgsmoms (DKK)","EU Phantom VAT / Rubrik A (DKK)","Input VAT / Købsmoms (DKK)"],v=["Transaction ID","Invoice Date","Category","Vendor / Origin","Description","SKU / Item ID","Gross Amount / Cost (DKK)","EU Phantom VAT / Rubrik A (DKK)","Input VAT / Købsmoms (DKK)"],k=$(b,p),I=$(v,u),C=new Blob([E+k],{type:"text/csv;charset=utf-8;"}),g=document.createElement("a");g.href=URL.createObjectURL(C),g.download=`Sales_VAT_Ledger_Q${o}_${r}.csv`,g.style.display="none",document.body.appendChild(g),g.click(),setTimeout(()=>{const f=new Blob([E+I],{type:"text/csv;charset=utf-8;"}),S=document.createElement("a");S.href=URL.createObjectURL(f),S.download=`Purchases_VAT_Ledger_Q${o}_${r}.csv`,S.style.display="none",document.body.appendChild(S),S.click(),document.body.removeChild(g),document.body.removeChild(S),URL.revokeObjectURL(g.href),URL.revokeObjectURL(S.href)},300),this.showToast(`✅ Exported ${p.length} sales & ${u.length} purchase records.`)},renderInvestments(t){const e=["Alejo","Facundo","Rafael"],s=this.state.investments||[],o=e.reduce((n,l)=>(n[l]=s.filter(i=>i.partner===l).reduce((i,p)=>i+(parseFloat(p.amount)||0),0),n),{}),r=Object.values(o).reduce((n,l)=>n+l,0),a=`
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
                            <p class="text-xs text-slate-400">${s.filter(l=>l.partner===n).length} inversiones</p>
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
                ${e.map(n=>{const l=s.filter(i=>i.partner===n).sort((i,p)=>new Date(p.date)-new Date(i.date));return`
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
                                    ${l.length===0?`
                                        <tr>
                                            <td colspan="4" class="p-8 text-center text-slate-400 italic">
                                                Sin inversiones registradas
                                            </td>
                                        </tr>
                                    `:l.map(i=>`
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-4 text-sm text-slate-500">${this.formatDate(i.date)}</td>
                                            <td class="p-4 text-sm font-medium text-brand-dark">${i.description}</td>
                                            <td class="p-4 text-sm font-bold text-brand-orange text-right">${this.formatCurrency(i.amount)}</td>
                                            <td class="p-4 text-center">
                                                <button onclick="app.deleteInvestment('${i.id}')" class="text-slate-400 hover:text-red-500 transition-colors">
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
        `;document.body.insertAdjacentHTML("beforeend",s)},async saveInvestment(t){t.preventDefault();const e=t.target,s={partner:e.partner.value,amount:parseFloat(e.amount.value),description:e.description.value,date:e.date.value,created_at:firebase.firestore.FieldValue.serverTimestamp()};try{await _.collection("investments").add(s),document.getElementById("add-investment-modal").remove(),this.showToast("✅ Inversión registrada"),await this.loadInvestments(),this.refreshCurrentView()}catch(o){this.showToast("❌ Error: "+o.message,"error")}},async deleteInvestment(t){if(confirm("¿Eliminar esta inversión?"))try{await _.collection("investments").doc(t).delete(),this.showToast("🗑️ Inversión eliminada"),await this.loadInvestments(),this.refreshCurrentView()}catch(e){this.showToast("❌ Error: "+e.message,"error")}},async loadInvestments(){const t=await _.collection("investments").get();this.state.investments=t.docs.map(e=>({id:e.id,...e.data()}))},renderShipping(t){const e=i=>{var p;return((p=i.shipping_method)==null?void 0:p.id)==="local_pickup"||i.shipping_method&&typeof i.shipping_method=="string"&&i.shipping_method.toLowerCase().includes("pickup")||i.shippingMethod&&i.shippingMethod.toLowerCase().includes("pickup")||Number(i.shipping)===0||Number(i.shipping_cost)===0||Number(i.shipping_income)===0},s=i=>!e(i),o=i=>!["shipped","picked_up","delivered","fulfilled","canceled"].includes(i.fulfillment_status),r=this.state.sales.filter(i=>{var p;return(i.channel==="online"||((p=i.channel)==null?void 0:p.toLowerCase())==="discogs")&&e(i)&&o(i)}).sort((i,p)=>new Date(i.date)-new Date(p.date)),a=this.state.sales.filter(i=>{var p;return(i.channel==="online"||((p=i.channel)==null?void 0:p.toLowerCase())==="discogs")&&s(i)&&o(i)}).sort((i,p)=>new Date(i.date)-new Date(p.date)),n=this.state.sales.filter(i=>{var p;return(i.channel==="online"||((p=i.channel)==null?void 0:p.toLowerCase())==="discogs")&&!o(i)}).sort((i,p)=>{var c,u;return new Date((c=p.updated_at)!=null&&c.toDate?p.updated_at.toDate():p.updated_at||p.date)-new Date((u=i.updated_at)!=null&&u.toDate?i.updated_at.toDate():i.updated_at||i.date)}).slice(0,20),l=`
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
                                <p class="text-2xl font-display font-bold">${this.formatCurrency(this.state.sales.reduce((i,p)=>i+parseFloat(p.shipping||p.shipping_cost||0),0))}</p>
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
                                ${r.length>0?r.map(i=>{var v;const p=this.getCustomerInfo(i),c=i.fulfillment_status||"unfulfilled";let u=c==="unfulfilled"?`onclick="app.notifyPreparingDiscogs('${i.id}')"`:"disabled",d=c==="unfulfilled"?"bg-blue-500 text-white shadow-sm hover:bg-blue-600":c==="preparing"||c==="ready_for_pickup"?"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-75":"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-50",y=c==="preparing"?`onclick="app.notifyPickupReadyDiscogs('${i.id}')"`:"disabled",m=c==="preparing"?"bg-brand-orange text-white shadow-sm hover:bg-orange-600":c==="ready_for_pickup"?"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-75":"bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed opacity-50",E=c==="ready_for_pickup"?`onclick="app.markPickedUpDiscogs('${i.id}')"`:"disabled",b=`
                <div class="flex flex-col gap-2 relative pl-2">
                    <div class="flex items-center absolute left-0 top-4 bottom-4 py-0 w-1">
                        <div class="w-1 bg-blue-100 rounded-full h-full relative overflow-hidden">
                            <div class="w-1 bg-blue-500 rounded-full transition-all duration-300 absolute top-0" style="height: ${c==="ready_for_pickup"?"100%":c==="preparing"?"50%":"0%"}"></div>
                        </div>
                    </div>
                    
                    <button ${u} class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${d}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ${c!=="unfulfilled"&&c?"ph-check-circle text-green-500":"ph-package"} text-sm"></i> 
                            1. En preparación
                        </span>
                        ${c!=="unfulfilled"&&c?'<span class="text-[9px] uppercase font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Hecho</span>':""}
                    </button>

                    <button ${y} class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${m}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ${c==="ready_for_pickup"?"ph-check-circle text-green-500":"ph-bell-ringing"} text-sm"></i> 
                            2. Lista para pickup
                        </span>
                        ${c==="ready_for_pickup"?'<span class="text-[9px] uppercase font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Hecho</span>':""}
                    </button>

                    <button ${E} class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${c==="ready_for_pickup"?"bg-brand-dark text-white shadow-sm hover:bg-black":"bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed opacity-50"}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ph-check-circle text-sm"></i> 
                            3. Orden recogida
                        </span>
                    </button>

                    ${c!=="canceled"&&c!=="picked_up"?`
                    <button onclick="app.cancelOrderDiscogs('${i.id}')" class="w-full text-left px-3 py-1.5 mt-1 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2 border border-transparent hover:border-red-100">
                        <i class="ph-bold ph-x-circle text-sm"></i> Cancelar orden
                    </button>`:""}
                </div>
            `;return`
                                    <tr class="hover:bg-blue-50/20 transition-colors">
                                        <td class="p-4 font-bold text-brand-dark">
                                            #${i.orderNumber||i.id.slice(0,6)}
                                            <div class="text-[10px] text-slate-400 font-normal mt-0.5">${this.formatDate(i.date)}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="font-bold text-sm text-brand-dark">${p.name}</div>
                                            <div class="text-xs text-slate-500 truncate max-w-[150px]" title="${p.email}">${p.email}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="flex -space-x-2 overflow-hidden">
                                                ${(i.items||[]).slice(0,3).map(k=>`<img src="${k.image||k.cover_image||"https://elcuartito.dk/default-vinyl.png"}" 
                                                         class="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                                                         title="${k.album}">`).join("")}
                                                ${(i.items||[]).length>3?`<span class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] ring-2 ring-white text-slate-500 font-bold">+${i.items.length-3}</span>`:""}
                                            </div>
                                            <div class="text-[10px] text-slate-400 mt-1">${((v=i.items)==null?void 0:v.length)||0} items</div>
                                        </td>
                                        <td class="p-4 hidden md:table-cell">
                                            <span class="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                ${i.channel||"Online"}
                                            </span>
                                        </td>
                                        <td class="p-4">
                                            ${b}
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
                                ${a.length>0?a.map(i=>{var b;const p=this.getCustomerInfo(i),c=i.fulfillment_status||"unfulfilled";let u=c==="unfulfilled"?`onclick="app.notifyPreparingDiscogs('${i.id}')"`:"disabled",d=c==="unfulfilled"?"bg-brand-orange text-white shadow-sm hover:bg-orange-600":c==="preparing"||c==="in_transit"?"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-75":"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-50",y=c==="in_transit"?`onclick="app.markDispatchedDiscogs('${i.id}')"`:"disabled",m=c==="in_transit"?"bg-brand-dark text-white shadow-sm hover:bg-black":"bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed opacity-50",E="";c==="preparing"?E=`
                    <div class="w-full bg-orange-50 border border-orange-100 rounded-lg p-2 flex flex-col gap-2 shadow-sm relative z-10">
                        <div class="flex items-center gap-2 text-xs font-bold text-orange-800 px-1">
                            <i class="ph-bold ph-truck text-sm"></i> 2. En camino
                        </div>
                        <input type="text" id="tracking-${i.id}" placeholder="Tracking #" 
                            value="${i.tracking_number||""}"
                            class="w-full text-xs border border-orange-200 rounded px-2 py-1.5 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none font-mono">
                        <input type="text" id="tracking-link-${i.id}" placeholder="Link (Opcional)" 
                            class="w-full text-xs border border-orange-200 rounded px-2 py-1.5 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none font-mono text-slate-500">
                        <button onclick="app.notifyShippedDiscogs('${i.id}', 'tracking-${i.id}', 'tracking-link-${i.id}')" 
                                class="w-full bg-orange-600 hover:bg-orange-700 text-white px-2 py-1.5 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2">
                            <i class="ph-bold ph-paper-plane-right text-sm"></i> Enviar Tracking al cliente
                        </button>
                    </div>
                `:E=`
                    <button disabled class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${c==="in_transit"?"bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed opacity-75":"bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed opacity-50"}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ${c==="in_transit"?"ph-check-circle text-green-500":"ph-truck"} text-sm"></i> 
                            2. En camino
                        </span>
                        ${c==="in_transit"?'<span class="text-[9px] uppercase font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Hecho</span>':""}
                    </button>
                `;let $=`
                <div class="flex flex-col gap-2 relative pl-2">
                    <div class="flex items-center absolute left-0 top-4 bottom-4 py-0 w-1">
                        <div class="w-1 bg-orange-100 rounded-full h-full relative overflow-hidden">
                            <div class="w-1 bg-brand-orange rounded-full transition-all duration-300 absolute top-0" style="height: ${c==="in_transit"?"100%":c==="preparing"?"50%":"0%"}"></div>
                        </div>
                    </div>

                    <button ${u} class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${d}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ${c!=="unfulfilled"&&c?"ph-check-circle text-green-500":"ph-package"} text-sm"></i> 
                            1. En preparación
                        </span>
                        ${c!=="unfulfilled"&&c?'<span class="text-[9px] uppercase font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Hecho</span>':""}
                    </button>

                    ${E}

                    <button ${y} class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${m}">
                        <span class="flex items-center gap-2">
                            <i class="ph-bold ph-archive text-sm"></i> 
                            3. Orden despachada
                        </span>
                    </button>

                    ${c!=="canceled"&&c!=="shipped"?`
                    <button onclick="app.cancelOrderDiscogs('${i.id}')" class="w-full text-left px-3 py-1.5 mt-1 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2 border border-transparent hover:border-red-100">
                        <i class="ph-bold ph-x-circle text-sm"></i> Cancelar orden
                    </button>`:""}
                </div>
            `;return`
                                    <tr class="hover:bg-orange-50/20 transition-colors">
                                        <td class="p-4 font-bold text-brand-dark">
                                            #${i.orderNumber||i.id.slice(0,6)}
                                            <div class="text-[10px] text-slate-400 font-normal mt-0.5">${this.formatDate(i.date)}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="font-bold text-sm text-brand-dark">${p.name}</div>
                                            <div class="text-xs text-slate-500 truncate max-w-[150px]" title="${p.email}">${p.email}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="flex -space-x-2 overflow-hidden">
                                                ${(i.items||[]).slice(0,3).map(v=>`<img src="${v.image||v.cover_image||"https://elcuartito.dk/default-vinyl.png"}" 
                                                         class="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                                                         title="${v.album}">`).join("")}
                                                ${(i.items||[]).length>3?`<span class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] ring-2 ring-white text-slate-500 font-bold">+${i.items.length-3}</span>`:""}
                                            </div>
                                            <div class="text-[10px] text-slate-400 mt-1">${((b=i.items)==null?void 0:b.length)||0} items</div>
                                        </td>
                                        <td class="p-4 hidden md:table-cell text-xs text-slate-500">
                                            ${i.city||""}, ${i.country||"DK"}
                                        </td>
                                        <td class="p-4">
                                            ${$}
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
                                ${n.map(i=>{var p;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${i.id}')" title="Ver historial">
                                        <td class="p-4 text-sm font-medium text-slate-500">
                                            #${i.orderNumber||i.id.slice(0,8)}
                                            <i class="ph-bold ph-clock-counter-clockwise text-xs ml-1 text-slate-300"></i>
                                        </td>
                                        <td class="p-4 text-xs text-slate-400">
                                            ${this.formatDate((p=i.updated_at)!=null&&p.toDate?i.updated_at.toDate():i.updated_at||i.date)}
                                        </td>
                                        <td class="p-4 text-right">
                                            <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${i.fulfillment_status==="shipped"?"bg-green-100 text-green-700":"bg-blue-100 text-blue-700"}">
                                                ${i.fulfillment_status==="shipped"?"Despachado":"Retirado"}
                                            </span>
                                        </td>
                                    </tr>
                                `}).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;t.innerHTML=l},openOrderHistoryModal(t){var i,p,c,u,d,y;const e=this.state.sales.find(m=>m.id===t);if(!e)return;const s=e.history||[],o=(i=e.timestamp)!=null&&i.toDate?e.timestamp.toDate():new Date(e.date);let r=[];s.length>0?r=s.map(m=>({status:m.status,timestamp:new Date(m.timestamp),note:m.note})).sort((m,E)=>E.timestamp-m.timestamp):r.push({status:e.fulfillment_status,timestamp:(p=e.updated_at)!=null&&p.toDate?e.updated_at.toDate():new Date,note:"Última actualización"}),r.push({status:"created",timestamp:o,note:`Orden recibida via ${e.channel||"Online"}`});const a=m=>m==="created"?"bg-slate-100 text-slate-500":m==="preparing"?"bg-blue-100 text-blue-600":m==="ready_for_pickup"?"bg-emerald-100 text-emerald-600":m==="in_transit"?"bg-orange-100 text-orange-600":m==="shipped"||m==="picked_up"?"bg-green-100 text-green-600":"bg-slate-100",n=m=>({created:"Orden Creada",preparing:"En Preparación",ready_for_pickup:"Listo para Retiro",in_transit:"En Tránsito",shipped:"Despachado",picked_up:"Retirado"})[m]||m,l=document.createElement("div");l.className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4",l.onclick=m=>{m.target===l&&l.remove()},l.innerHTML=`
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
                        ${r.map((m,E)=>`
                            <div class="relative">
                                <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${E===0?"bg-brand-orange ring-4 ring-orange-50":"bg-slate-300"}"></div>
                                
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-bold px-2 py-0.5 rounded-full ${a(m.status)}">
                                            ${n(m.status)}
                                        </span>
                                        <span class="text-xs text-slate-400 font-mono">
                                            ${m.timestamp.toLocaleString("es-AR",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"})}
                                        </span>
                                    </div>
                                    <p class="text-sm text-slate-600 mt-1">${m.note||"-"}</p>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                    
                    <div class="mt-8 pt-6 border-t border-slate-50 flex justify-between items-end">
                       <div class="text-xs text-slate-400">
                            Cliente: <span class="font-bold text-slate-600">${e.customerName||((c=e.customer)==null?void 0:c.name)||((u=e.customer)==null?void 0:u.firstName)+" "+((d=e.customer)==null?void 0:d.lastName)}</span><br>
                            Email: ${e.customerEmail||((y=e.customer)==null?void 0:y.email)}
                       </div>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(l)},fetchDiscogsById(t=null){const e=t||document.getElementById("discogs-search-input").value.trim(),s=document.getElementById("discogs-results");if(!e||!/^\d+$/.test(e)){this.showToast("⚠️ Ingresa un ID numérico válido","error");return}if(!localStorage.getItem("discogs_token")){this.showToast("⚠️ Token no configurado","error");return}s&&(s.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Importando Release por ID...</p>',s.classList.remove("hidden")),fetch(`${R}/discogs/release/${e}`).then(r=>{if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()}).then(r=>{var l;const a=r.release||r,n={id:a.id,title:`${a.artists_sort||((l=a.artists[0])==null?void 0:l.name)} - ${a.title}`,year:a.year,thumb:a.thumb,cover_image:a.images?a.images[0].uri:null,label:a.labels?[a.labels[0].name]:[],format:a.formats?[a.formats[0].name]:[]};this.handleDiscogsSelection(n),s&&s.classList.add("hidden"),this.showToast("✅ Datos importados con éxito")}).catch(r=>{console.error(r),this.showToast("❌ Error al importar ID: "+r.message,"error"),s&&s.classList.add("hidden")})},openBulkImportModal(){const t=document.createElement("div");t.id="bulk-import-modal",t.className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4",t.innerHTML=`
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
        `,document.body.appendChild(t)},async handleBulkImportBatch(){const t=document.getElementById("bulk-csv-data").value.trim();if(!t){this.showToast("Por favor, pega el contenido del CSV.","error");return}const e=document.getElementById("start-bulk-import-btn");e.innerHTML,e.disabled=!0,e.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> Importando...';try{const s=await fetch(`${R}/discogs/bulk-import`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({csvData:t})}),o=await s.json();s.ok&&(this.showToast(`✅ ${o.summary}`),document.getElementById("bulk-import-modal").remove(),await this.loadData(),this.refreshCurrentView())}catch(s){console.error("Bulk import error:",s),this.showToast("❌ "+s.message,"error");const o=document.getElementById("start-bulk-import-btn");o&&(o.disabled=!1,o.innerHTML='<i class="ph-bold ph-rocket-launch"></i> Comenzar Importación')}},async refreshProductMetadata(t){const e=document.getElementById("refresh-metadata-btn");if(!e)return;const s=e.innerHTML;e.disabled=!0,e.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> ...';try{let o=t;const r=this.state.inventory.find(l=>l.sku===t||l.id===t);r&&r.id&&(o=r.id);const a=await fetch(`${R}/discogs/refresh-metadata/${o}`,{method:"POST",headers:{"Content-Type":"application/json"}}),n=await a.json();if(a.ok){this.showToast("✅ Metadata actualizada correctamente");const l=document.getElementById("modal-overlay");l&&l.remove(),await this.loadData(),this.refreshCurrentView(),r&&this.openProductModal(r.sku)}else throw new Error(n.error||"Error al actualizar metadata")}catch(o){console.error("Refresh metadata error:",o),this.showToast("❌ "+o.message,"error"),e.disabled=!1,e.innerHTML=s}}};window.app=Se;document.addEventListener("DOMContentLoaded",()=>{Se.init()});window.migrateAllData=async function(t=!0){const e=firebase.firestore();console.log(`🚀 Iniciando Migración Total... (Dry Run: ${t})`);try{const s=await e.collection("products").get(),o=await e.collection("sales").get();let r=[],a=[];const n=new Map;for(const l of s.docs){const i=l.data();let p=!1,c={};i.sku&&n.set(i.sku,i),n.set(l.id,i),(!i.provider_origin||i.provider_origin==="Local_Used")&&(i.product_condition==="New"||i.condition==="New"?i.provider_origin!=="EU_B2B"&&(c.provider_origin="EU_B2B",p=!0):i.provider_origin||(c.provider_origin="Local_Used",p=!0)),p&&(r.push({id:l.id,changes:c,name:i.album}),Object.assign(i,c))}for(const l of o.docs){const i=l.data();let p=!1;if(!i.items||!Array.isArray(i.items))continue;let c=i.items.map(u=>{let d={...u},y=null;if(u.productCondition==="New"||u.condition==="New")y="EU_B2B";else if(u.productCondition==="Second-hand"||u.productCondition==="Used")y="Local_Used";else{const m=u.productId||u.recordId,E=n.get(u.sku)||n.get(m);E?y=E.provider_origin||"Local_Used":y="Local_Used"}return d.providerOrigin!==y&&(d.providerOrigin=y,p=!0),d});p&&a.push({id:l.id,items:c})}if(console.log(`📦 Discos de inventario a corregir: ${r.length}`),r.length>0&&console.log("Ejemplo de disco:",r[0]),console.log(`🧾 Ventas a corregir: ${a.length}`),t)console.log("⚠️ MODO DRY RUN. Escribí window.migrateAllData(false) para aplicar los cambios.");else{console.log("💾 Guardando en Firestore...");const l=e.batch();let i=0;const p=async()=>{i>0&&(await l.commit(),console.log(`✅ Batch commited (${i} operaciones)`),i=0)};for(const c of r)l.update(e.collection("products").doc(c.id),c.changes),i++,i>=450&&await p();for(const c of a)l.update(e.collection("sales").doc(c.id),{items:c.items}),i++,i>=450&&await p();await p(),console.log("🎉 Migración Total Finalizada!")}}catch(s){console.error("❌ Error en la migración:",s)}};window.migrateAllData(!0);
