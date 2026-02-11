(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function s(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(n){if(n.ep)return;n.ep=!0;const a=s(n);fetch(n.href,a)}})();const D=firebase.firestore(),H=window.auth,ue=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1",M=ue?"http://localhost:3001":"https://el-cuartito-shop.up.railway.app",be="K85403890688957",Y={async createSale(t){let e=[];if(await D.runTransaction(async s=>{const o=[];for(const c of t.items){const l=D.collection("products").doc(c.recordId||c.productId),i=await s.get(l);if(!i.exists)throw new Error(`Producto ${c.recordId} no encontrado`);const d=i.data();if(d.stock<c.quantity)throw new Error(`Stock insuficiente para ${d.artist||"Sin Artista"} - ${d.album||"Sin Album"}. Disponible: ${d.stock}`);o.push({ref:l,data:d,quantity:c.quantity,price:d.price,cost:d.cost||0})}const n=o.reduce((c,l)=>c+l.price*l.quantity,0),a=t.customTotal!==void 0?t.customTotal:n,r=D.collection("sales").doc();s.set(r,{...t,status:"completed",fulfillment_status:t.channel&&t.channel.toLowerCase()==="discogs"?"preparing":"fulfilled",total:a,date:new Date().toISOString().split("T")[0],timestamp:firebase.firestore.FieldValue.serverTimestamp(),items:o.map(c=>({productId:c.ref.id,artist:c.data.artist,album:c.data.album,sku:c.data.sku,unitPrice:c.price,costAtSale:c.cost,qty:c.quantity}))});for(const c of o){s.update(c.ref,{stock:c.data.stock-c.quantity});const l=D.collection("inventory_logs").doc();s.set(l,{type:"SOLD",sku:c.data.sku||"Unknown",album:c.data.album||"Unknown",artist:c.data.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:`Venta registrada (Admin) - Canal: ${t.channel||"Tienda"}`})}e=o.map(c=>({discogs_listing_id:c.data.discogs_listing_id,artist:c.data.artist,album:c.data.album}))}),t.channel&&t.channel.toLowerCase()==="discogs"){for(const s of e)if(s.discogs_listing_id)try{const o=await fetch(`${M}/discogs/delete-listing/${s.discogs_listing_id}`,{method:"DELETE"});o.ok?console.log(`✅ Discogs listing ${s.discogs_listing_id} deleted for ${s.artist} - ${s.album}`):console.warn(`⚠️ Could not delete Discogs listing ${s.discogs_listing_id}:`,await o.text())}catch(o){console.error(`❌ Error deleting Discogs listing ${s.discogs_listing_id}:`,o)}}},async notifyPreparing(t){const e=await H.currentUser.getIdToken(),s=await fetch(`${M}/sales/${t}/notify-preparing`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async updateTracking(t,e){const s=await H.currentUser.getIdToken(),o=await fetch(`${M}/sales/${t}/update-tracking`,{method:"POST",headers:{Authorization:`Bearer ${s}`,"Content-Type":"application/json"},body:JSON.stringify({trackingNumber:e})});if(!o.ok)throw new Error(await o.text());return o.json()},async notifyShipped(t,e,s=null){const o=await H.currentUser.getIdToken(),n={trackingNumber:e};s&&(n.trackingLink=s);const a=await fetch(`${M}/sales/${t}/notify-shipped`,{method:"POST",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"},body:JSON.stringify(n)});if(!a.ok)throw new Error(await a.text());return a.json()},async markDispatched(t){const e=await H.currentUser.getIdToken(),s=await fetch(`${M}/sales/${t}/mark-dispatched`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async notifyPickupReady(t){const e=await H.currentUser.getIdToken(),s=await fetch(`${M}/sales/${t}/notify-pickup-ready`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async markPickedUp(t){const e=await H.currentUser.getIdToken(),s=await fetch(`${M}/sales/${t}/mark-picked-up`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()}},ce={state:{inventory:[],sales:[],expenses:[],consignors:[],cart:[],viewMode:"list",selectedItems:new Set,currentView:"dashboard",filterMonths:[new Date().getMonth()],filterYear:new Date().getFullYear(),inventorySearch:"",salesHistorySearch:"",expensesSearch:"",events:[],selectedDate:new Date,vatActive:!1,manualSaleSearch:"",posCondition:"Used",posSelectedItemSku:null,orderFeedFilter:"all"},async init(){this._initialized||(this._initialized=!0,H.onAuthStateChanged(async t=>{if(t)try{document.getElementById("login-view").classList.add("hidden"),document.getElementById("main-app").classList.remove("hidden"),document.getElementById("mobile-nav").classList.remove("hidden"),await this.loadData(),this._pollInterval&&clearInterval(this._pollInterval),this._pollInterval=setInterval(()=>this.loadData(),6e4),this.setupMobileMenu(),this.setupNavigation()}catch(e){console.error("Auth token error:",e),this.logout()}else{document.getElementById("login-view").classList.remove("hidden"),document.getElementById("main-app").classList.add("hidden"),document.getElementById("mobile-nav").classList.add("hidden");const e=document.getElementById("login-btn");e&&(e.disabled=!1,e.innerHTML="<span>Entrar</span>")}}))},async handleLogin(t){t.preventDefault();const e=t.target.email.value,s=t.target.password.value,o=document.getElementById("login-error"),n=document.getElementById("login-btn");o.classList.add("hidden"),n.disabled=!0,n.innerHTML="<span>Cargando...</span>";try{await H.signInWithEmailAndPassword(e,s)}catch(a){console.error("Login error:",a),o.innerText="Error: "+a.message,o.classList.remove("hidden"),n.disabled=!1,n.innerHTML='<span>Ingresar</span><i class="ph-bold ph-arrow-right"></i>'}},async updateFulfillmentStatus(t,e,s){var o,n,a;try{const r=((o=t==null?void 0:t.target)==null?void 0:o.closest("button"))||((a=(n=window.event)==null?void 0:n.target)==null?void 0:a.closest("button"));if(r){r.disabled=!0;const c=r.innerHTML;r.innerHTML='<i class="ph ph-circle-notch animate-spin"></i>'}await D.collection("sales").doc(e).update({fulfillment_status:s}),await this.loadData(),document.getElementById("modal-overlay")&&(document.getElementById("modal-overlay").remove(),this.openOnlineSaleDetailModal(e)),this.showToast("Estado de envío actualizado")}catch(r){console.error("Fulfillment update error:",r),this.showToast("Error al actualizar estado: "+r.message,"error")}},async manualShipOrder(t){var e,s,o,n,a,r;try{const c=prompt("Introduce el número de seguimiento:");if(!c)return;const l=((e=event==null?void 0:event.target)==null?void 0:e.closest("button"))||((o=(s=window.event)==null?void 0:s.target)==null?void 0:o.closest("button"));l&&(l.disabled=!0,l.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Guardando...');const i=await fetch(`${M}/api/manual-ship`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t,trackingNumber:c})}),d=await i.json();if(i.ok&&d.success){if(this.showToast("✅ Pedido marcado como enviado"),d.emailSent)this.showToast("📧 Cliente notificado por email","success");else{const m=typeof d.emailError=="object"?JSON.stringify(d.emailError):d.emailError;this.showToast("⚠️ Pedido marcado pero EL EMAIL FALLÓ: "+m,"warning")}await this.loadData();const u=document.getElementById("sale-detail-modal");u&&(u.remove(),this.openUnifiedOrderDetailModal(t))}else throw new Error(d.error||d.message||"Error desconocido")}catch(c){console.error("Error shipping manually:",c),this.showToast("❌ Error: "+(c.message||"No se pudo procesar el envío"),"error");const l=((n=event==null?void 0:event.target)==null?void 0:n.closest("button"))||((r=(a=window.event)==null?void 0:a.target)==null?void 0:r.closest("button"));l&&(l.disabled=!1,l.innerHTML='<i class="ph-bold ph-truck"></i> Ingresar Tracking y Cerrar')}},async logout(){try{await H.signOut(),location.reload()}catch(t){console.error("Sign out error:",t),location.reload()}},setupListeners(){},async loadData(){try{const[t,e,s,o,n]=await Promise.all([D.collection("products").get(),D.collection("sales").get(),D.collection("expenses").get(),D.collection("events").orderBy("date","desc").get(),D.collection("consignors").get()]);this.state.inventory=t.docs.map(a=>{const r=a.data();return{id:a.id,...r,condition:r.condition||"VG",owner:r.owner||"El Cuartito",label:r.label||"Desconocido",storageLocation:r.storageLocation||"Tienda",cover_image:r.cover_image||r.coverImage||null}}),this.state.sales=e.docs.map(a=>{var l,i;const r=a.data(),c={id:a.id,...r,date:r.date||((l=r.timestamp)!=null&&l.toDate?r.timestamp.toDate().toISOString().split("T")[0]:(i=r.created_at)!=null&&i.toDate?r.created_at.toDate().toISOString().split("T")[0]:new Date().toISOString().split("T")[0])};return r.total_amount!==void 0&&r.total===void 0&&(c.total=r.total_amount),r.payment_method&&!r.paymentMethod&&(c.paymentMethod=r.payment_method),c.items&&Array.isArray(c.items)&&(c.items=c.items.map(d=>({...d,priceAtSale:d.priceAtSale!==void 0?d.priceAtSale:d.unitPrice||0,qty:d.qty!==void 0?d.qty:d.quantity||1,costAtSale:d.costAtSale!==void 0?d.costAtSale:d.cost||0}))),c}).filter(a=>a.status!=="PENDING"&&a.status!=="failed").sort((a,r)=>{const c=new Date(a.date);return new Date(r.date)-c}),this.state.expenses=s.docs.map(a=>{var c;const r=a.data();return{id:a.id,...r,date:r.fecha_factura||r.date||((c=r.timestamp)==null?void 0:c.split("T")[0])||new Date().toISOString().split("T")[0]}}).sort((a,r)=>new Date(r.date)-new Date(a.date)),this.state.events=o.docs.map(a=>({id:a.id,...a.data()})),this.state.consignors=n.docs.map(a=>{const r=a.data();return{id:a.id,...r,agreementSplit:r.split||r.agreementSplit||(r.percentage?Math.round(r.percentage*100):70)}}),await this.loadInvestments(),this.initFuse(),this.refreshCurrentView()}catch(t){console.error("Failed to load data:",t),this.showToast("❌ Error de conexión: "+t.message,"error")}},refreshCurrentView(){const t=document.getElementById("app-content");if(t)switch(this.state.currentView){case"dashboard":this.renderDashboard(t);break;case"inventory":this.renderInventory(t);break;case"sales":this.renderSales(t);break;case"onlineSales":this.renderOnlineSales(t);break;case"discogsSales":this.renderDiscogsSales(t);break;case"expenses":this.renderExpenses(t);break;case"consignments":this.renderConsignments(t);break;case"backup":this.renderBackup(t);break;case"settings":this.renderSettings(t);break;case"calendar":this.renderCalendar(t);break;case"shipping":this.renderShipping(t);break;case"pickups":this.renderPickups(t);break;case"investments":this.renderInvestments(t);break;case"vatReport":this.renderVATReport(t);break;case"datosLegales":this.renderDatosLegales(t);break}},renderDatosLegales(t){const e=`
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
        `;t.innerHTML=e},navigate(t){this.state.currentView=t,document.querySelectorAll(".nav-item, .nav-item-m").forEach(n=>{n.classList.remove("bg-orange-50","text-brand-orange"),n.classList.add("text-slate-500")});const e=document.getElementById(`nav-d-${t}`);e&&(e.classList.remove("text-slate-500"),e.classList.add("bg-orange-50","text-brand-orange"));const s=document.getElementById(`nav-m-${t}`);s&&(s.classList.remove("text-slate-400"),s.classList.add("text-brand-orange"));const o=document.getElementById("app-content");o.innerHTML="",this.refreshCurrentView()},renderCalendar(t){const e=this.state.selectedDate||new Date,s=e.getFullYear(),o=e.getMonth(),n=new Date(s,o,1),r=new Date(s,o+1,0).getDate(),c=n.getDay()===0?6:n.getDay()-1,l=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],i=u=>{const m=`${s}-${String(o+1).padStart(2,"0")}-${String(u).padStart(2,"0")}`,x=this.state.sales.some(k=>k.date===m),b=this.state.expenses.some(k=>k.date===m),y=this.state.events.some(k=>k.date===m);return{hasSales:x,hasExpenses:b,hasEvents:y}},d=`
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
                                </button>
                                <button onclick="app.changeCalendarMonth(1)" class="w-10 h-10 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-brand-orange transition-colors flex items-center justify-center">
                                    <i class="ph-bold ph-caret-right"></i>
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-7 gap-2 mb-2 text-center">
                            ${["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(u=>`
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider py-2">${u}</div>
                            `).join("")}
                        </div>

                        <div class="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                            ${Array(c).fill('<div class="bg-slate-50/50 rounded-xl"></div>').join("")}
                            ${Array.from({length:r},(u,m)=>{const x=m+1,b=`${s}-${String(o+1).padStart(2,"0")}-${String(x).padStart(2,"0")}`,y=e.getDate()===x,k=i(x),p=new Date().toDateString()===new Date(s,o,x).toDateString();return`
                                    <button onclick="app.selectCalendarDate('${b}')" 
                                        class="relative rounded-xl p-2 flex flex-col items-center justify-start gap-1 transition-all border-2
                                        ${y?"border-brand-orange bg-orange-50":"border-transparent hover:bg-slate-50"}
                                        ${p?"bg-blue-50":""}">
                                        <span class="text-sm font-bold ${y?"text-brand-orange":"text-slate-700"} ${p?"text-blue-600":""}">${x}</span>
                                        <div class="flex gap-1 mt-1">
                                            ${k.hasSales?'<div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>':""}
                                            ${k.hasExpenses?'<div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>':""}
                                            ${k.hasEvents?'<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>':""}
                                        </div>
                                    </button>
                                `}).join("")}
                        </div>
                    </div>

                    <!-- Day Summary -->
                    <div class="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-orange-100 p-6 flex flex-col h-full overflow-hidden">
                        ${this.renderCalendarDaySummary(e)}
                    </div>
                </div>
            </div>
        `;t.innerHTML=d},getCustomerInfo(t){const e=t.customer||{},s=t.customerName||e.name||(e.firstName?`${e.firstName} ${e.lastName||""}`.trim():"")||"Cliente",o=t.customerEmail||e.email||"-";let n=t.address||e.address||"-";if(e.shipping){const a=e.shipping;n=`${a.line1||""} ${a.line2||""}, ${a.city||""}, ${a.postal_code||""}, ${a.country||""}`.trim().replace(/^,|,$/g,"")}return{name:s,email:o,address:n}},renderCalendarDaySummary(t){const e=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,s=t.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}),o=this.state.sales.filter(l=>l.date===e),n=this.state.expenses.filter(l=>l.date===e),a=this.state.events.filter(l=>l.date===e),r=o.reduce((l,i)=>l+i.total,0),c=n.reduce((l,i)=>l+i.amount,0);return`
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h3 class="font-display text-xl font-bold text-brand-dark capitalize">${s}</h3>
                    <p class="text-xs text-slate-500 mt-1">Resumen del día</p>
                </div>
                <button onclick="app.openAddEventModal('${e}')" class="text-brand-orange hover:bg-orange-50 p-2 rounded-lg transition-colors" title="Agregar Evento">
                    <i class="ph-bold ph-plus"></i>
                </button>
            </div>

            <div class="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                <!-- Financial Summary -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-green-50 p-3 rounded-xl border border-green-100">
                        <p class="text-[10px] font-bold text-green-600 uppercase">Ventas</p>
                        <p class="text-lg font-bold text-brand-dark">${this.formatCurrency(r)}</p>
                    </div>
                    <div class="bg-red-50 p-3 rounded-xl border border-red-100">
                        <p class="text-[10px] font-bold text-red-600 uppercase">Gastos</p>
                        <p class="text-lg font-bold text-brand-dark">${this.formatCurrency(c)}</p>
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
                                    </button>
                                </div>
                            `).join("")}
                        </div>
                    `:`
                        <div class="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p class="text-xs text-slate-400">No hay eventos registrados</p>
                            <button onclick="app.openAddEventModal('${e}')" class="text-xs text-brand-orange font-bold mt-2 hover:underline">Agregar nota</button>
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
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle Gastos (${n.length})</h4>
                    ${n.length>0?`
                        <div class="space-y-2">
                            ${n.map(l=>`
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
                        </button>
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
                        </button>
                    </form>
                </div>
            </div>
        `;document.body.insertAdjacentHTML("beforeend",e)},handleAddEvent(t){t.preventDefault();const e=new FormData(t.target),s={date:e.get("date"),title:e.get("title"),description:e.get("description"),createdAt:new Date().toISOString()};D.collection("events").add(s).then(()=>{this.showToast("✅ Evento agregado"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>console.error(o))},deleteEvent(t){confirm("¿Eliminar este evento?")&&D.collection("events").doc(t).delete().then(()=>{this.showToast("✅ Evento eliminado"),this.loadData()}).catch(e=>console.error(e))},renderBackup(t){const e=`
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
        `;t.innerHTML=s},saveSettings(t){t.preventDefault();const s=new FormData(t.target).get("discogs_token").trim();s?(localStorage.setItem("discogs_token",s),localStorage.setItem("discogs_token_warned","true"),this.showToast("Configuración guardada correctamente")):(localStorage.removeItem("discogs_token"),this.showToast("Token eliminado"))},async migrateProductCondition(){if(confirm('¿Estás seguro? Esto marcará TODOS los productos como "Usado (Second-hand)".')){this.showToast("⏳ Migrando productos...","info");try{const t=await D.collection("products").get();let e=0;const s=D.batch();t.docs.forEach(o=>{o.data().product_condition||(s.update(o.ref,{product_condition:"Second-hand"}),e++)}),await s.commit(),this.showToast(`✅ ${e} productos marcados como "Usado"`),await this.loadData()}catch(t){console.error("Migration error:",t),this.showToast("❌ Error durante la migración: "+t.message,"error")}}},async migrateSalesData(){if(confirm("¿Migrar datos de ventas? Esto agregará información de costo y condición a ventas antiguas.")){this.showToast("⏳ Migrando ventas...","info");try{const t=await D.collection("sales").get();let e=0,s=0,o=D.batch();for(const n of t.docs){const r=n.data().items||[];let c=!1;const l=[];for(const i of r){const d={...i};if(!i.costAtSale&&i.costAtSale!==0){c=!0;const u=i.productId||i.recordId,m=i.album,x=this.state.inventory.find(b=>u&&(b.id===u||b.sku===u)||m&&b.album===m);x?(d.costAtSale=x.cost||0,d.productCondition=x.product_condition||"Second-hand",d.productId=x.id||u,d.album||(d.album=x.album)):(d.costAtSale=0,d.productCondition="Second-hand")}l.push(d)}c&&(o.update(n.ref,{items:l}),e++,s++,s>=450&&(await o.commit(),o=D.batch(),s=0))}s>0&&await o.commit(),this.showToast(`✅ ${e} ventas actualizadas con datos de producto`),await this.loadData()}catch(t){console.error("Sales migration error:",t),this.showToast("❌ Error: "+t.message,"error")}}},exportData(){const t={inventory:this.state.inventory,sales:this.state.sales,expenses:this.state.expenses,consignors:this.state.consignors,customGenres:this.state.customGenres,customCategories:this.state.customCategories,timestamp:new Date().toISOString()},e="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(t)),s=document.createElement("a");s.setAttribute("href",e),s.setAttribute("download","el_cuartito_backup_"+new Date().toISOString().slice(0,10)+".json"),document.body.appendChild(s),s.click(),s.remove()},exportInventoryToExcel(){this.showToast("⏳ Generando Excel...","info");try{const t=this.state.inventory.map(n=>{const a=[n.genre,n.genre2,n.genre3,n.genre4,n.genre5].filter(Boolean).join(", ");return{SKU:n.sku||"",Artista:n.artist||"",Álbum:n.album||"",Sello:n.label||"",Año:n.year||"",Géneros:a,"Condición Vinilo":n.status||"","Condición Cover":n.sleeveCondition||"","Condición Producto":n.product_condition||"Second-hand","Precio (DKK)":n.price||0,"Costo (DKK)":n.cost||0,Stock:n.stock||0,"En Web":n.is_online?"Sí":"No","En Discogs":n.discogs_listing_id?"Sí":"No","Discogs Listing ID":n.discogs_listing_id||"","Discogs Release ID":n.discogs_release_id||n.discogsId||"",Consignatario:n.consignor||"",Ubicación:n.location||"",Notas:n.notes||"","Fecha Creación":n.createdAt?new Date(n.createdAt).toLocaleDateString("es-ES"):"","URL Imagen":n.imageUrl||""}}),e=XLSX.utils.book_new(),s=XLSX.utils.json_to_sheet(t);s["!cols"]=[{wch:12},{wch:25},{wch:30},{wch:20},{wch:6},{wch:30},{wch:12},{wch:12},{wch:15},{wch:10},{wch:10},{wch:6},{wch:8},{wch:10},{wch:15},{wch:15},{wch:15},{wch:12},{wch:30},{wch:12},{wch:40}],XLSX.utils.book_append_sheet(e,s,"Inventario");const o=`ElCuartito_Inventario_${new Date().toISOString().slice(0,10)}.xlsx`;XLSX.writeFile(e,o),this.showToast(`✅ Excel exportado: ${this.state.inventory.length} discos`)}catch(t){console.error("Error exporting to Excel:",t),this.showToast("❌ Error al exportar: "+t.message,"error")}},importData(t){const e=t.files[0];if(!e)return;const s=new FileReader;s.onload=o=>{try{const n=JSON.parse(o.target.result);if(!confirm("¿Estás seguro de restaurar este backup? Se sobrescribirán los datos actuales."))return;const a=D.batch();alert("La importación completa sobrescribiendo datos en la nube es compleja. Por seguridad, esta función solo agrega/actualiza items de inventario por ahora."),n.inventory&&n.inventory.forEach(r=>{const c=D.collection("products").doc(r.sku);a.set(c,r)}),a.commit().then(()=>{this.showToast("Datos importados (Inventario)")})}catch(n){alert("Error al leer el archivo de respaldo"),console.error(n)}},s.readAsText(e)},resetApplication(){if(!confirm(`⚠️ ¡ADVERTENCIA! ⚠️

Esto borrará PERMANENTEMENTE todo el inventario, ventas, gastos y socios de la base de datos.

¿Estás absolutamente seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Iniciando borrado completo...");const e=s=>D.collection(s).get().then(o=>{const n=D.batch();return o.docs.forEach(a=>{n.delete(a.ref)}),n.commit()});Promise.all([e("inventory"),e("sales"),e("expenses"),e("consignors"),D.collection("settings").doc("general").delete()]).then(()=>{this.showToast("♻️ Aplicación restablecida de fábrica"),setTimeout(()=>location.reload(),1500)}).catch(s=>{console.error(s),alert("Error al borrar datos: "+s.message)})},resetSales(){if(!confirm(`⚠️ ADVERTENCIA ⚠️

Esto borrará PERMANENTEMENTE todas las ventas (manuales y online) de la base de datos.

El inventario, gastos y socios NO serán afectados.

¿Estás seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Borrando todas las ventas..."),D.collection("sales").get().then(e=>{const s=D.batch();return e.docs.forEach(o=>{s.delete(o.ref)}),s.commit()}).then(()=>{this.showToast("✅ Todas las ventas han sido eliminadas"),setTimeout(()=>location.reload(),1500)}).catch(e=>{console.error(e),alert("Error al borrar ventas: "+e.message)})},async findProductBySku(t){try{const e=await D.collection("products").where("sku","==",t).get();if(e.empty)return null;const s=e.docs[0];return{id:s.id,ref:s.ref,data:s.data()}}catch(e){return console.error("Error finding product by SKU:",e),null}},logInventoryMovement(t,e){let s="";t==="EDIT"?s="Producto actualizado":t==="ADD"?s="Ingreso de inventario":t==="DELETE"?s="Egreso manual":t==="SOLD"&&(s="Venta registrada"),D.collection("inventory_logs").add({type:t,sku:e.sku||"Unknown",album:e.album||"Unknown",artist:e.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:s}).catch(o=>console.error("Error logging movement:",o))},openInventoryLogModal(){D.collection("inventory_logs").orderBy("timestamp","desc").limit(50).get().then(t=>{const s=`
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
                                    ${t.docs.map(o=>({id:o.id,...o.data()})).map(o=>{let n="bg-slate-100 text-slate-600";o.type==="ADD"&&(n="bg-green-100 text-green-700"),o.type==="DELETE"&&(n="bg-red-100 text-red-700"),o.type==="EDIT"&&(n="bg-blue-100 text-blue-700"),o.type==="SOLD"&&(n="bg-purple-100 text-purple-700");const a=o.timestamp?o.timestamp.toDate?o.timestamp.toDate():new Date(o.timestamp):new Date;return`
                                            <tr>
                                                <td class="p-4 text-slate-500 whitespace-nowrap">
                                                    ${a.toLocaleDateString()} <span class="text-xs text-slate-400 opacity-75">${a.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                                                </td>
                                                <td class="p-4">
                                                    <span class="px-2 py-1 rounded-md text-[10px] font-bold uppercase ${n}">${o.type}</span>
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
        `;try{const s=M,n=await(await fetch(`${s}/discogs/sync`,{method:"POST",headers:{"Content-Type":"application/json"}})).json(),r=await(await fetch(`${s}/discogs/sync-orders`,{method:"POST",headers:{"Content-Type":"application/json"}})).json();if(n.success||r&&r.success){let c=`✅ Sincronizado: ${n.synced||0} productos`;r&&r.salesCreated>0&&(c+=`. ¡Detectadas ${r.salesCreated} nuevas ventas!`),this.showToast(c),await this.loadData(),this.refreshCurrentView()}else throw new Error(n.error||r&&r.error||"Error desconocido")}catch(s){console.error("Sync error:",s),this.showToast(`❌ Error al sincronizar: ${s.message}`)}finally{t.disabled=!1,t.innerHTML=e}},formatCurrency(t){return new Intl.NumberFormat("da-DK",{style:"currency",currency:"DKK"}).format(t)},formatDate(t){return t?new Date(t).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}):"-"},getMonthName(t){return["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][t]},generateId(){return Date.now().toString(36)+Math.random().toString(36).substr(2)},showToast(t){const e=document.getElementById("toast");document.getElementById("toast-message").innerText=t,e.classList.remove("opacity-0","-translate-y-20","md:translate-y-20"),setTimeout(()=>{e.classList.add("opacity-0","-translate-y-20","md:translate-y-20")},3e3)},setupNavigation(){},setupMobileMenu(){},toggleMobileMenu(){const t=document.getElementById("mobile-menu"),e=document.getElementById("mobile-menu-overlay");!t||!e||(t.classList.contains("translate-y-full")?(t.classList.remove("translate-y-full"),e.classList.remove("hidden")):(t.classList.add("translate-y-full"),e.classList.add("hidden")))},toggleMonthFilter(t){const e=this.state.filterMonths.indexOf(t);e===-1?this.state.filterMonths.push(t):this.state.filterMonths.length>1&&this.state.filterMonths.splice(e,1),this.state.filterMonths.sort((s,o)=>s-o),this.refreshCurrentView()},async setReadyForPickup(t){var e,s,o,n,a,r;try{const c=((e=event==null?void 0:event.target)==null?void 0:e.closest("button"))||((o=(s=window.event)==null?void 0:s.target)==null?void 0:o.closest("button"));c&&(c.disabled=!0,c.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Guardando...');const l=await fetch(`${M}/api/ready-for-pickup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t})}),i=await l.json();if(l.ok&&i.success){this.showToast("✅ Pedido listo para retiro"),this.showToast("📧 Cliente notificado por email"),await this.loadData();const d=document.getElementById("sale-detail-modal");d&&(d.remove(),this.openUnifiedOrderDetailModal(t))}else throw new Error(i.error||i.message||"Error desconocido")}catch(c){console.error("Error setting ready for pickup:",c),this.showToast("❌ Error: "+(c.message||"No se pudo procesar el estado"),"error");const l=((n=event==null?void 0:event.target)==null?void 0:n.closest("button"))||((r=(a=window.event)==null?void 0:a.target)==null?void 0:r.closest("button"));l.disabled=!1,l.innerHTML='<i class="ph-bold ph-storefront"></i> Listo para Retiro'}},renderDashboard(t){try{const e=this.state.filterMonths,s=this.state.filterYear,o=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],n=this.state.sales.filter(h=>{var L;const w=(L=h.timestamp)!=null&&L.toDate?h.timestamp.toDate():new Date(h.timestamp||h.date);return w.getFullYear()===s&&e.includes(w.getMonth())}),a=[...n].sort((h,w)=>{var j,A;const L=(j=h.timestamp)!=null&&j.toDate?h.timestamp.toDate():new Date(h.timestamp||h.date);return((A=w.timestamp)!=null&&A.toDate?w.timestamp.toDate():new Date(w.timestamp||w.date))-L}),r=[...this.state.sales.map(h=>({...h,type:"sale",sortDate:new Date(h.date)})),...this.state.expenses.map(h=>({...h,type:"expense",sortDate:new Date(h.date||h.fecha_factura)}))].sort((h,w)=>w.sortDate-h.sortDate).slice(0,5),c=[],l=[];for(let h=29;h>=0;h--){const w=new Date;w.setDate(w.getDate()-h);const L=w.toISOString().split("T")[0];c.push(w.getDate());const O=this.state.sales.filter(j=>j.date===L).reduce((j,A)=>j+(Number(A.total||A.total_amount)||0),0);l.push(O)}const i=new Date,d=i.getMonth(),u=i.getFullYear(),m=d===0?11:d-1,x=d===0?u-1:u,b=this.state.sales.filter(h=>{const w=new Date(h.date);return w.getMonth()===d&&w.getFullYear()===u}).reduce((h,w)=>h+(Number(w.originalTotal||w.total_amount||w.total)||0),0),y=this.state.sales.filter(h=>{const w=new Date(h.date);return w.getMonth()===m&&w.getFullYear()===x}).reduce((h,w)=>h+(Number(w.originalTotal||w.total_amount||w.total)||0),0),k=y>0?(b-y)/y*100:0,p=`${k>=0?"+":""}${k.toFixed(1)}% vs ${this.getMonthName(m)}`;let g=0,v=0,E=0,$=0,I=0,S=0,_=0,F=0;n.forEach(h=>{var ie;const w=((ie=h.channel)==null?void 0:ie.toLowerCase())==="discogs",L=Number(h.originalTotal)||Number(h.total_amount)||Number(h.total)||0,O=Number(h.total)||Number(h.total_amount)||0,j=w?L-O:0,A=Number(h.shipping_cost)||0;g+=L,E+=A;let se=0;const le=h.items||[];le.length>0?le.forEach(B=>{const oe=Number(B.priceAtSale||B.unitPrice||B.price)||0,X=Number(B.qty||B.quantity)||1;let U=Number(B.costAtSale||B.cost)||0;const re=(B.owner||"").toLowerCase(),pe=B.productCondition||B.condition||"Used",de=oe*X;if(U===0){const q=B.productId||B.recordId,ee=B.album,te=this.state.inventory.find(ne=>q&&(ne.id===q||ne.sku===q)||ee&&ne.album===ee);te&&(U=te.cost||0)}if(pe==="New")I+=de*.2;else{const q=de-U*X;S+=q>0?q*.2:0}if(re==="el cuartito"||re==="")U=Number(B.costAtSale||B.cost)||0;else{if(U===0||isNaN(U)){const q=this.state.consignors?this.state.consignors.find(te=>(te.name||"").toLowerCase()===re):null,ee=q&&(q.agreementSplit||q.split)||70;U=oe*(Number(ee)||70)/100}$+=U*X}se+=(oe-U)*X}):(se=L,I+=L*.2);const ae=parseFloat(h.shipping_income||h.shipping||h.shipping_cost||0);ae>0&&(_+=ae*.2,F+=ae),v+=se-j});const K=this.state.expenses.filter(h=>{var O;const w=h.fecha_factura?new Date(h.fecha_factura):(O=h.timestamp)!=null&&O.toDate?h.timestamp.toDate():new Date(h.timestamp||h.date);return(h.categoria_tipo==="operativo"||h.categoria_tipo==="stock_nuevo"||h.is_vat_deductible)&&w.getFullYear()===s&&e.includes(w.getMonth())}).reduce((h,w)=>h+(parseFloat(w.monto_iva)||0),0),z=I+S+_-K,f=this.state.expenses.filter(h=>{const w=new Date(h.date||h.fecha_factura);return w.getFullYear()===s&&e.includes(w.getMonth())}).reduce((h,w)=>h+(Number(w.monto_total||w.amount)||0),0),C=v-z-f,R=v-z,V=this.state.inventory.reduce((h,w)=>h+w.price*w.stock,0),J=this.state.inventory.reduce((h,w)=>h+w.stock,0),P=this.state.inventory.filter(h=>h.stock>0&&h.stock<1),N=this.state.sales.filter(h=>{var w;return h.fulfillment_status==="preparing"||h.status==="paid"||((w=h.channel)==null?void 0:w.toLowerCase())==="discogs"&&h.status!=="shipped"&&h.fulfillment_status!=="shipped"}),G=z,Z=`
            <div class="max-w-7xl mx-auto space-y-8 pb-24 md:pb-8 px-4 md:px-8 pt-6">
                <!-- Header with Navigation and Filter -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-brand-orange rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl shadow-brand-orange/20">
                            <i class="ph-fill ph-house-line"></i>
                        </div>
                        <div>
                            <h2 class="font-display text-3xl font-bold text-brand-dark">Resumen Operativo</h2>
                            <p class="text-slate-500 text-sm">Monitor de actividad: <span class="font-bold text-brand-orange">${e.length===12?`Año ${s} `:`${e.map(h=>this.getMonthName(h)).join(", ")} ${s} `}</span></p>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                        <select id="dashboard-year" onchange="app.updateFilter('year', this.value)" class="bg-slate-50 text-xs font-bold text-brand-dark px-3 py-2 rounded-xl border-none outline-none cursor-pointer">
                            <option value="2026" ${this.state.filterYear===2026?"selected":""}>2026</option>
                            <option value="2025" ${this.state.filterYear===2025?"selected":""}>2025</option>
                        </select>
                        <div class="h-6 w-px bg-slate-100 mx-1"></div>
                        <div class="flex gap-1 overflow-x-auto max-w-[300px] md:max-w-none no-scrollbar">
                            ${o.map((h,w)=>`
                                <button onclick="app.toggleMonthFilter(${w})" 
                                    class="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${e.includes(w)?"bg-brand-orange text-white shadow-lg shadow-brand-orange/20":"text-slate-400 hover:text-brand-dark hover:bg-slate-50"}">
                                    ${h}
                                </button>
                            `).join("")}
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
                        <p class="text-4xl font-display font-bold text-brand-dark mb-2">${this.formatCurrency(b)}</p>
                        <div class="flex items-center gap-2">
                             <span class="text-[10px] font-bold ${k>=0?"text-emerald-500 bg-emerald-50":"text-red-500 bg-red-50"} px-2 py-0.5 rounded-full border ${k>=0?"border-emerald-100":"border-red-100"}">
                                ${p}
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
                        <p class="text-4xl font-display font-bold text-emerald-600 mb-2">${this.formatCurrency(C)}</p>
                        <p class="text-[10px] text-slate-400 font-medium">Incluye costos, fees y gastos operativos.</p>
                    </div>

                    <!-- Card 3: Alerta de Pedidos -->
                    <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 ${N.length>0?"bg-red-50 text-red-500":"bg-green-50 text-green-500"} rounded-xl flex items-center justify-center">
                                <i class="ph-bold ${N.length>0?"ph-package":"ph-check-circle"} text-xl"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Alerta de Pedidos</span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            ${N.length>0?`<p class="text-5xl font-display font-bold text-red-500">${N.length}</p>`:'<p class="text-3xl font-display font-bold text-green-600">Al día</p>'}
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
                                        ${r.map(h=>{const w=h.type==="sale",L=w?h.album||"Venta de Items":h.proveedor||h.description||"Gasto registrado",O=w?h.channel||"Tienda Local":h.categoria||"Operativo";let j="ph-receipt";if(w){const A=(h.channel||"").toLowerCase();A.includes("web")&&(j="ph-globe-simple"),A.includes("discogs")&&(j="ph-vinyl-record")}else j="ph-credit-card";return`
                                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                                    <td class="px-6 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <div class="w-10 h-10 rounded-xl ${w?"bg-orange-50 text-brand-orange":"bg-slate-100 text-slate-400"} flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                                                                 <i class="ph-bold ${j} text-lg"></i>
                                                             </div>
                                                             <div class="min-w-0">
                                                                 <div class="font-bold text-sm text-brand-dark truncate max-w-[200px]" title="${L}">${L}</div>
                                                                 <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${O}</div>
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
                                        <span class="text-xl font-display font-bold text-brand-orange">${this.formatCurrency(G)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;t.innerHTML=Z,this.renderDashboardCharts(n,c,l)}catch(e){console.error("Dashboard render error:",e),t.innerHTML=`<div class="p-12 text-center text-red-500 font-bold bg-red-50 rounded-3xl m-8 border border-red-100">
                <i class="ph-bold ph-warning-circle text-4xl mb-4"></i>
                <p>Error al cargar el dashboard: ${e.message}</p>
                <button onclick="app.loadData()" class="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl">Intentar de nuevo</button>
            </div>`}},renderInventoryCart(){const t=document.getElementById("inventory-cart-container");if(!t)return;if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden");const e=this.state.cart.map((s,o)=>`
    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                <div class="truncate pr-2">
                    <p class="font-bold text-xs text-brand-dark truncate">${s.album}</p>
                    <p class="text-[10px] text-slate-500 truncate">${this.formatCurrency(s.price)}</p>
                </div>
                <button onclick="app.removeFromCart(${o})" class="text-red-400 hover:text-red-600">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
    `).join("");t.innerHTML=`
    <div id="cart-widget" class="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-bold text-brand-dark flex items-center gap-2">
                        <i class="ph-fill ph-shopping-cart text-brand-orange"></i> Carrito 
                        <span class="bg-brand-orange text-white text-xs px-1.5 py-0.5 rounded-full">${this.state.cart.length}</span>
                    </h3>
                    <button onclick="app.clearCart()" class="text-xs text-red-500 font-bold hover:underline">Vaciar</button>
                </div>
                <div class="space-y-2 mb-4 max-h-40 overflow-y-auto text-sm custom-scrollbar">
                    ${e}
                </div>
                <div class="pt-3 border-t border-slate-50 flex justify-between items-center mb-3">
                     <span class="text-xs font-bold text-slate-500">Total</span>
                     <span class="font-bold text-brand-dark text-lg">${this.formatCurrency(this.state.cart.reduce((s,o)=>s+o.price,0))}</span>
                </div>
                <button onclick="app.openCheckoutModal()" class="w-full py-2 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 text-sm hover:scale-[1.02] transition-transform">
                    Finalizar Venta
                </button>
            </div>
    `},renderInventoryContent(t,e,s,o,n){t.innerHTML=`
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
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(r=>r.genre===a).length} items</p>
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
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(r=>r.owner===a).length} items</p>
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
                                ${n.map(a=>`
                                    <div onclick="app.navigateInventoryFolder('storage', '${a.replace(/'/g,"\\'")}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange cursor-pointer transition-all group text-center">
                                        <div class="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-500 group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-tag text-2xl"></i>
                                        </div>
                                        <h4 class="font-bold text-brand-dark text-sm truncate">${a}</h4>
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(r=>r.storageLocation===a).length} items</p>
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
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openProductModal('${a.sku.replace(/'/g,"\\'")}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-eye text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openPrintLabelModal('${a.sku.replace(/'/g,"\\'")}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-printer text-lg"></i>
                                         </button>
                                     </div>
                                     <div class="absolute top-2 right-2">
                                         ${this.getStatusBadge(a.condition)}
                                     </div>
                                </div>
                                <div class="flex-1 flex flex-col">
                                    <h3 class="font-bold text-brand-dark leading-tight mb-1 line-clamp-1" title="${a.album}">${a.album}</h3>
                                    <p class="text-xs text-slate-500 font-bold uppercase mb-3 truncate">${a.artist}</p>
                                    <div class="mt-auto flex justify-between items-center pt-3 border-t border-slate-50">
                                        <span class="font-display font-bold text-xl text-brand-orange">${this.formatCurrency(a.price)}</span>
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
                <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden relative">
                    <!-- Bulk Action Bar -->
                    ${this.state.selectedItems.size>0?`
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
                    `:""}

                    <table class="w-full text-left">
                        <thead class="bg-orange-50/50 border-b border-orange-100 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th class="p-4 w-10">
                                    <input type="checkbox" onchange="app.toggleSelectAll()" 
                                        class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                        ${e.length>0&&e.every(a=>this.state.selectedItems.has(a.sku))?"checked":""}>
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
                            ${e.map(a=>`
                                <tr class="hover:bg-orange-50/30 transition-colors group cursor-pointer relative ${this.state.selectedItems.has(a.sku)?"bg-orange-50/50":""}" 
                                    onclick="app.openProductModal('${a.sku.replace(/'/g,"\\'")}')">
                                    <td class="p-3" onclick="event.stopPropagation()">
                                        <input type="checkbox" onchange="app.toggleSelection('${a.sku.replace(/'/g,"\\'")}')"
                                            class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                            ${this.state.selectedItems.has(a.sku)?"checked":""}>
                                    </td>
                                    <td class="p-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 shrink-0 overflow-hidden shadow-sm border border-slate-100">
                                                ${a.cover_image?`<img src="${a.cover_image}" class="w-full h-full object-cover">`:'<i class="ph-fill ph-disc text-lg"></i>'}
                                            </div>
                                            <div class="min-w-0">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[180px]" title="${a.album}">${a.album}</div>
                                                <div class="text-xs text-slate-500 font-medium truncate max-w-[180px]">${a.artist}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-3 text-xs text-slate-500 font-medium max-w-[80px] truncate">${a.label||"-"}</td>
                                    <td class="p-3 text-center">${this.getStatusBadge(a.condition)}</td>
                                    <td class="p-3 text-right font-bold text-brand-dark font-display text-sm">${this.formatCurrency(a.price)}</td>
                                    <td class="p-3 text-center">
                                        <span class="px-2 py-0.5 rounded-full text-xs font-bold ${a.stock>0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}">
                                            ${a.stock}
                                        </span>
                                    </td>
                                    <td class="p-3 text-center">
                                        ${a.discogs_listing_id?'<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-purple-100 text-purple-600" title="Publicado en Discogs"><i class="ph-bold ph-check text-xs"></i></span>':'<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-300" title="No publicado"><i class="ph-bold ph-minus text-xs"></i></span>'}
                                    </td>
                                    <td class="p-3 text-right" onclick="event.stopPropagation()">
                                        <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onclick="event.stopPropagation(); app.openAddVinylModal('${a.sku.replace(/'/g,"\\'")}')" class="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-brand-dark hover:border-brand-dark transition-all flex items-center justify-center shadow-sm" title="Editar">
                                                <i class="ph-bold ph-pencil-simple text-sm"></i>
                                            </button>
                                            <button onclick="event.stopPropagation(); app.addToCart('${a.sku.replace(/'/g,"\\'")}', event)" class="w-7 h-7 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform" title="Añadir">
                                                <i class="ph-bold ph-shopping-cart text-sm"></i>
                                            </button>
                                            <button onclick="event.stopPropagation(); app.deleteVinyl('${a.sku.replace(/'/g,"\\'")}')" class="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-500 transition-all flex items-center justify-center shadow-sm" title="Eliminar">
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
`},renderInventory(t){const e=[...new Set(this.state.inventory.map(i=>i.genre).filter(Boolean))].sort(),s=[...new Set(this.state.inventory.map(i=>i.owner).filter(Boolean))].sort(),o=[...new Set(this.state.inventory.map(i=>i.label).filter(Boolean))].sort(),n=[...new Set(this.state.inventory.map(i=>i.storageLocation).filter(Boolean))].sort(),a=this.getFilteredInventory(),r=this.state.sortBy||"dateDesc";a.sort((i,d)=>{if(r==="priceDesc")return(d.price||0)-(i.price||0);if(r==="priceAsc")return(i.price||0)-(d.price||0);if(r==="stockDesc")return(d.stock||0)-(i.stock||0);const u=i.created_at?i.created_at.seconds?i.created_at.seconds*1e3:new Date(i.created_at).getTime():0,m=d.created_at?d.created_at.seconds?d.created_at.seconds*1e3:new Date(d.created_at).getTime():0;return r==="dateDesc"?m-u:r==="dateAsc"?u-m:0}),document.getElementById("inventory-layout-root")||(t.innerHTML=`
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
                <button onclick="app.state.viewMode='list'; app.refreshCurrentView()" class="p-2 rounded-lg transition-colors ${this.state.viewMode!=="grid"?"bg-brand-dark text-white":"bg-white text-slate-400"}"><i class="ph-bold ph-list-dashes text-lg"></i></button>
                <button onclick="app.state.viewMode='grid'; app.refreshCurrentView()" class="p-2 rounded-lg transition-colors ${this.state.viewMode==="grid"?"bg-brand-dark text-white":"bg-white text-slate-400"}"><i class="ph-bold ph-squares-four text-lg"></i></button>
            </div>
            <div class="space-y-4 md:hidden">
                <!-- Mobile Items (Simplified) -->
                ${this.state.inventory.map(i=>"<!-- Mobile Card Placeholder - Handled by renderInventoryContent actually? No, duplicate logic. Let's merge mobile into renderInventoryContent -->").join("")}
                <!-- Actually, let's let renderInventoryContent handle ALL content including mobile -->
            </div>
            <div id="inventory-content-container"></div>
        </div>
    </div>
                </div>
    `),this.renderInventoryCart();const c=document.getElementById("inventory-filters-container");c&&(c.innerHTML=`
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
                    <h3 class="font-bold text-brand-dark mb-4 flex items-center gap-2"><i class="ph-bold ph-funnel text-slate-400"></i> Filtros</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Ordenar por</label>
                            <select onchange="app.state.sortBy = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-medium outline-none focus:border-brand-orange">
                                <option value="dateDesc" ${this.state.sortBy==="dateDesc"?"selected":""}>Más Recientes</option>
                                <option value="dateAsc" ${this.state.sortBy==="dateAsc"?"selected":""}>Más Antiguos</option>
                                <option value="priceDesc" ${this.state.sortBy==="priceDesc"?"selected":""}>Precio: Mayor a Menor</option>
                                <option value="priceAsc" ${this.state.sortBy==="priceAsc"?"selected":""}>Precio: Menor a Mayor</option>
                                <option value="stockDesc" ${this.state.sortBy==="stockDesc"?"selected":""}>Stock: Mayor a Menor</option>
                            </select>
                        </div>
                        <hr class="border-slate-50">
                        <!-- Simplified Filters -->
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Género</label>
                            <select onchange="app.state.filterGenre = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todos</option>
                                ${e.map(i=>`<option value="${i}" ${this.state.filterGenre===i?"selected":""}>${i}</option>`).join("")}
                            </select>
                        </div>
                         <div>
                            <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">Label Disquería</label>
                            <select onchange="app.state.filterStorage = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todas</option>
                                ${n.map(i=>`<option value="${i}" ${this.state.filterStorage===i?"selected":""}>${i}</option>`).join("")}
                            </select>
                        </div>
                         <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Sello (Discogs)</label>
                            <select onchange="app.state.filterLabel = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todos</option>
                                ${o.map(i=>`<option value="${i}" ${this.state.filterLabel===i?"selected":""}>${i}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Dueño</label>
                            <select onchange="app.state.filterOwner = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todos</option>
                                ${s.map(i=>`<option value="${i}" ${this.state.filterOwner===i?"selected":""}>${i}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Publicado en Discogs</label>
                            <select onchange="app.state.filterDiscogs = this.value; app.refreshCurrentView()" class="w-full bg-purple-50 border border-purple-200 rounded-lg p-2 text-sm outline-none focus:border-purple-500">
                                <option value="all" ${(this.state.filterDiscogs||"all")==="all"?"selected":""}>Todos</option>
                                <option value="yes" ${this.state.filterDiscogs==="yes"?"selected":""}>✅ Sí</option>
                                <option value="no" ${this.state.filterDiscogs==="no"?"selected":""}>❌ No</option>
                            </select>
                        </div>
                    </div>
                </div>
    `);const l=document.getElementById("inventory-content-container");l&&this.renderInventoryContent(l,a,e,s,n)},getStatusBadge(t){return`<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${{NM:"bg-green-100 text-green-700 border-green-200","VG+":"bg-blue-100 text-blue-700 border-blue-200",VG:"bg-yellow-100 text-yellow-700 border-yellow-200",G:"bg-orange-100 text-orange-700 border-orange-200",B:"bg-red-100 text-red-700 border-red-200",S:"bg-purple-100 text-purple-700 border-purple-200"}[t]||"bg-slate-100 text-slate-600 border-slate-200"}"> ${t}</span> `},renderCharts(t,e){const s=this.state.filterMonths;this.state.filterYear;const o=[],n=[],a=[];s.forEach(c=>{o.push(this.getMonthName(c).substring(0,3));const l=t.filter(d=>new Date(d.date).getMonth()===c).reduce((d,u)=>d+u.total,0),i=e.filter(d=>new Date(d.date).getMonth()===c).reduce((d,u)=>d+u.amount,0);n.push(l),a.push(i)});const r={};t.forEach(c=>{r[c.genre]=(r[c.genre]||0)+c.quantity}),new Chart(document.getElementById("financeChart"),{type:"bar",data:{labels:o,datasets:[{label:"Ventas",data:n,backgroundColor:"#F05A28",borderRadius:6},{label:"Gastos",data:a,backgroundColor:"#94a3b8",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom"}},scales:{y:{grid:{color:"#f1f5f9"},beginAtZero:!0},x:{grid:{display:!1}}}}})},renderDashboardCharts(t=[],e=[],s=[]){var x,b,y,k,p;const o=t,n=(x=document.getElementById("last30DaysChart"))==null?void 0:x.getContext("2d");n&&(this.last30ChartInstance&&this.last30ChartInstance.destroy(),this.last30ChartInstance=new Chart(n,{type:"line",data:{labels:e,datasets:[{label:"Ventas ($)",data:s,borderColor:"#F05A28",backgroundColor:g=>{const v=g.chart,{ctx:E,chartArea:$}=v;if(!$)return null;const I=E.createLinearGradient(0,$.top,0,$.bottom);return I.addColorStop(0,"rgba(240, 90, 40, 0.2)"),I.addColorStop(1,"rgba(240, 90, 40, 0)"),I},borderWidth:3,fill:!0,tension:.4,pointRadius:0,pointHoverRadius:6,pointBackgroundColor:"#F05A28",pointBorderColor:"#fff",pointBorderWidth:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{mode:"index",intersect:!1,backgroundColor:"#1e293b",titleFont:{size:10},bodyFont:{size:12,weight:"bold"},padding:12,cornerRadius:12,displayColors:!1,callbacks:{label:g=>this.formatCurrency(g.parsed.y)}}},scales:{y:{beginAtZero:!0,grid:{color:"#f8fafc"},ticks:{font:{size:10},color:"#94a3b8"}},x:{grid:{display:!1},ticks:{font:{size:10},color:"#94a3b8",autoSkip:!0,maxRotation:0,callback:function(g,v){return v%5===0?this.getLabelForValue(g):""}}}},interaction:{mode:"index",intersect:!1}}}));const a=(g,v)=>({type:"doughnut",data:{labels:Object.keys(g),datasets:[{data:Object.values(g),backgroundColor:["#F05A28","#FDE047","#8b5cf6","#10b981","#f43f5e","#64748b"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{boxWidth:10,font:{size:10}}}}}}),r={};o.forEach(g=>{const v=g.genre||"Otros";let E=Number(g.quantity)||0;E===0&&g.items&&Array.isArray(g.items)&&(E=g.items.reduce(($,I)=>$+(Number(I.qty||I.quantity)||1),0)),E<=0&&(E=1),r[v]=(r[v]||0)+Number(E)}),this.genreChartInstance&&this.genreChartInstance.destroy();const c=(b=document.getElementById("genreChart"))==null?void 0:b.getContext("2d");c&&(this.genreChartInstance=new Chart(c,a(r)));const l={};o.forEach(g=>{const v=g.paymentMethod||"Otros";let E=Number(g.quantity)||0;E===0&&g.items&&Array.isArray(g.items)&&(E=g.items.reduce(($,I)=>$+(Number(I.qty||I.quantity)||1),0)),E<=0&&(E=1),l[v]=(l[v]||0)+Number(E)}),this.paymentChartInstance&&this.paymentChartInstance.destroy();const i=(y=document.getElementById("paymentChart"))==null?void 0:y.getContext("2d");i&&(this.paymentChartInstance=new Chart(i,a(l)));const d={};o.forEach(g=>{const v=g.channel||"Tienda";let E=Number(g.quantity)||0;E===0&&g.items&&Array.isArray(g.items)&&(E=g.items.reduce(($,I)=>$+(Number(I.qty||I.quantity)||1),0)),E<=0&&(E=1),d[v]=(d[v]||0)+Number(E)}),this.channelChartInstance&&this.channelChartInstance.destroy();const u=(k=document.getElementById("channelChart"))==null?void 0:k.getContext("2d");u&&(this.channelChartInstance=new Chart(u,a(d)));const m=(p=document.getElementById("salesTrendChart"))==null?void 0:p.getContext("2d");if(m){const g=new Array(31).fill(0).map((E,$)=>$+1),v=new Array(31).fill(0);o.forEach(E=>{const $=new Date(E.date);isNaN($.getDate())||(v[$.getDate()-1]+=parseFloat(E.total)||0)}),this.trendChartInstance&&this.trendChartInstance.destroy(),this.trendChartInstance=new Chart(m,{type:"line",data:{labels:g,datasets:[{label:"Ventas ($)",data:v,borderColor:"#F05A28",backgroundColor:"rgba(240, 90, 40, 0.1)",borderWidth:3,fill:!0,tension:.4,pointRadius:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,grid:{color:"#f1f5f9"}},x:{grid:{display:!1}}}}})}},updateFilter(t,e){if(t==="month"){const s=parseInt(e);this.state.filterMonth=s,this.state.filterMonths=[s]}t==="year"&&(this.state.filterYear=parseInt(e)),this.renderDashboard(document.getElementById("app-content"))},renderSales(t){var k;const e=new Date().toISOString().split("T")[0],s=new Date(Date.now()-864e5).toISOString().split("T")[0],o=this.state.sales.filter(p=>p.date===e).reduce((p,g)=>p+(parseFloat(g.total)||0),0),n=this.state.sales.filter(p=>p.date===s).reduce((p,g)=>p+(parseFloat(g.total)||0),0),a=this.state.sales.filter(p=>p.fulfillment_status==="preparing"||p.status==="paid"||p.channel==="Discogs"&&p.status!=="shipped").length,r=this.state.filterYear,c=this.state.filterMonths,l=((k=document.getElementById("sales-payment-filter"))==null?void 0:k.value)||"all",d=this.state.salesHistorySearch.toLowerCase().split(" ").filter(p=>p.length>0),u=this.state.orderFeedFilter||"all",m=this.state.sales.filter(p=>{const g=new Date(p.date),v=g.getFullYear()===r&&c.includes(g.getMonth()),E=l==="all"||p.paymentMethod===l;let $=!0;d.length>0&&($=d.every(S=>{const _=p.items&&p.items.some(T=>(T.album||"").toLowerCase().includes(S)||(T.artist||"").toLowerCase().includes(S)||(T.label||"").toLowerCase().includes(S)||(T.sku||"").toLowerCase().includes(S)),F=(p.album||"").toLowerCase().includes(S)||(p.sku||"").toLowerCase().includes(S);return _||F}));let I=!0;return u==="to_ship"?I=p.status!=="shipped"&&p.source!=="STORE":u==="completed"?I=p.status==="shipped":u==="store"&&(I=p.source==="STORE"),v&&E&&$&&I}),x=m.reduce((p,g)=>p+(parseFloat(g.total)||0),0),b=m.length>0?x/m.length:0,y=`
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
                                <option value="2026" ${r===2026?"selected":""}>2026</option>
                                <option value="2025" ${r===2025?"selected":""}>2025</option>
                            </select>
                        </div>
                        <div class="flex flex-wrap gap-1">
                            ${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((p,g)=>`
                                <button onclick="app.toggleMonthFilter(${g})" 
                                    class="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${c.includes(g)?"bg-brand-dark text-white":"bg-slate-50 text-slate-400 hover:bg-slate-100"}">
                                    ${p}
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
                            <span class="text-xs font-bold ${o>=n?"text-emerald-500":"text-slate-400"}">
                                ${o>=n?'<i class="ph-bold ph-trend-up mr-1"></i>':'<i class="ph-bold ph-trend-down mr-1"></i>'}
                                vs. ayer (${this.formatCurrency(n)})
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
                        <h3 class="text-2xl font-display font-bold text-brand-dark mb-1">${this.formatCurrency(b)}</h3>
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

                        ${this.state.cart.length>0?this.renderSalesCartWidget():this.renderQuickPOS()}

                        <!-- Partners Quick Summary -->
                        <div class="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Stock por Dueño</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                ${["El Cuartito",...this.state.consignors.map(p=>p.name)].map(p=>{const g=this.state.inventory.filter(v=>v.owner===p).reduce((v,E)=>v+E.stock,0);return`
                                        <div class="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                            <span class="text-xs font-bold text-slate-600 truncate mr-2">${p}</span>
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
                            ${[{id:"all",label:"Todos",icon:"ph-list"},{id:"to_ship",label:"Por Enviar",icon:"ph-package"},{id:"completed",label:"Completados",icon:"ph-check-circle"},{id:"store",label:"Tienda Física",icon:"ph-storefront"}].map(p=>`
                                <button onclick="app.updateOrderFeedFilter('${p.id}')" 
                                    class="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all ${u===p.id?"bg-white text-brand-dark shadow-sm ring-1 ring-slate-200":"text-slate-400 hover:text-slate-600"}">
                                    <i class="ph-bold ${p.icon} ${u===p.id?"text-brand-orange":""}"></i>
                                    ${p.label.toUpperCase()}
                                </button>
                            `).join("")}
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
                                <option value="all" ${l==="all"?"selected":""}>Todos Pagos</option>
                                <option value="MobilePay" ${l==="MobilePay"?"selected":""}>MobilePay</option>
                                <option value="Efectivo" ${l==="Efectivo"?"selected":""}>Efectivo</option>
                                <option value="Tarjeta" ${l==="Tarjeta"?"selected":""}>Tarjeta</option>
                            </select>
                        </div>

                        <!-- Feed List -->
                        <div class="space-y-3 max-h-[1200px] overflow-y-auto pr-2 custom-scrollbar">
                            ${m.map(p=>{const g=p.status==="shipped",v=p.status==="paid"||p.source==="STORE"||p.paymentMethod!=="Pending",E=p.channel==="Discogs",$=p.source==="STORE",I=p.items&&p.items.length>0?p.items[0]:{album:p.album||"Venta Manual",artist:p.artist||"Desconocido"},S=p.items&&p.items.length>1?p.items.length-1:0;return`
                                <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all cursor-pointer group flex items-center gap-4 relative" onclick="app.openUnifiedOrderDetailModal('${p.id}')">
                                    <!-- Source Icon -->
                                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${E?"bg-slate-900 text-white":$?"bg-orange-100 text-brand-orange":"bg-blue-100 text-blue-600"}">
                                        <i class="ph-bold ${E?"ph-disc":$?"ph-storefront":"ph-globe"} text-xl"></i>
                                    </div>

                                    <!-- Details -->
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-0.5">
                                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${this.formatDate(p.date)}</span>
                                            <div class="h-1 w-1 rounded-full bg-slate-200"></div>
                                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${p.paymentMethod}</span>
                                        </div>
                                        <h4 class="font-bold text-brand-dark truncate pr-2">
                                            ${I.album} 
                                            ${S>0?`<span class="text-brand-orange font-medium text-xs ml-1">y ${S} más</span>`:""}
                                        </h4>
                                        
                                        <!-- Status Badges -->
                                        <div class="flex items-center gap-2 mt-2">
                                            <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${v?"bg-emerald-50 text-emerald-600":"bg-amber-50 text-amber-600"}">
                                                ${v?"Pagado":"Pendiente"}
                                            </span>
                                            <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${g?"bg-slate-100 text-slate-500":"bg-rose-50 text-rose-500"}">
                                                ${g?"Enviado":"Por Enviar"}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Economic Breakdown -->
                                    <div class="text-right shrink-0 border-l border-slate-50 pl-4 py-1">
                                        <p class="font-display font-bold text-brand-dark text-base">${this.formatCurrency(p.total)}</p>
                                        ${p.shipping_cost>0?`<p class="text-[10px] text-slate-400 font-bold">Envío: ${this.formatCurrency(p.shipping_cost)}</p>`:""}
                                    </div>

                                    <!-- Quick Action -->
                                    <div class="relative ml-2">
                                        <button onclick="event.stopPropagation(); app.toggleOrderActionMenu('${p.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-50 text-slate-300 hover:text-brand-dark transition-colors flex items-center justify-center">
                                            <i class="ph-bold ph-dots-three-vertical text-xl"></i>
                                        </button>
                                        
                                        <!-- Dropdown (Hidden by default) -->
                                        <div id="action-menu-${p.id}" class="hidden absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 space-y-1 py-2">
                                            <button onclick="event.stopPropagation(); app.openInvoiceModal('${p.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                <i class="ph ph-file-text text-blue-500"></i> Ver Factura
                                            </button>
                                            <button onclick="event.stopPropagation(); app.openInvoiceModal('${p.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                <i class="ph ph-printer text-indigo-500"></i> Imprimir Etiqueta
                                            </button>
                                            ${g?"":`
                                                <button onclick="event.stopPropagation(); app.markOrderAsShipped('${p.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                                    <i class="ph ph-truck text-emerald-500"></i> Marcar Enviado
                                                </button>
                                            `}
                                            <div class="h-px bg-slate-50 mx-2 my-1"></div>
                                            <button onclick="event.stopPropagation(); app.deleteSale('${p.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors">
                                                <i class="ph ph-trash"></i> Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `}).join("")}
                            ${m.length===0?`
                                <div class="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p class="text-slate-400 italic text-sm">No hay pedidos en esta categoría.</p>
                                </div>
                            `:""}
                        </div>
                    </div>
                </div>
            </div>
        `;t.innerHTML=y},renderSalesCartWidget(){return`
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
                        <div class="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100 group">
                            <div class="truncate pr-4 flex-1">
                                <p class="font-bold text-sm text-brand-dark truncate">${t.album}</p>
                                <p class="text-[10px] text-slate-400 truncate uppercase tracking-tighter font-bold">${t.artist}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="font-bold text-sm text-brand-dark">${this.formatCurrency(t.price)}</span>
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
                        <span class="font-bold text-slate-600">${this.formatCurrency(this.state.cart.reduce((t,e)=>t+e.price,0))}</span>
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
                    Completar Venta (${this.formatCurrency(this.state.cart.reduce((t,e)=>t+e.price,0))})
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
        `},updatePOSCondition(t){this.state.posCondition=t,this.renderSales(document.getElementById("app-content"))},selectPOSPayment(t){const e=document.getElementById("input-payment-method");e&&(e.value=t),["MobilePay","Tarjeta","Efectivo"].forEach(s=>{const o=document.getElementById(`pay-${s}`);if(o)if(s===t){o.classList.add("border-brand-dark","bg-slate-50","ring-2","ring-brand-dark/10"),o.classList.remove("border-slate-100","bg-white");const n=o.querySelector("i"),a=o.querySelector("span");n&&(n.classList.add(s==="MobilePay"?"text-blue-500":s==="Tarjeta"?"text-indigo-500":"text-emerald-500"),n.classList.remove("text-slate-400")),a&&(a.classList.add(s==="MobilePay"?"text-blue-600":s==="Tarjeta"?"text-indigo-600":"text-emerald-600"),a.classList.remove("text-slate-500"))}else{o.classList.remove("border-brand-dark","bg-slate-50","ring-2","ring-brand-dark/10"),o.classList.add("border-slate-100","bg-white");const n=o.querySelector("i"),a=o.querySelector("span");n&&(n.className=n.className.replace(/text-(blue|indigo|emerald)-500/g,"text-slate-400")),a&&(a.className=a.className.replace(/text-(blue|indigo|emerald)-600/g,"text-slate-500"))}})},async handleQuickPOSAction(){const t=document.getElementById("btn-pos-action"),e=document.getElementById("input-sku"),s=document.getElementById("input-price"),o=document.getElementById("input-payment-method"),n=document.getElementById("input-artist"),a=document.getElementById("input-album"),r=document.getElementById("input-cost"),c=document.getElementById("input-cost-pos"),l=e==null?void 0:e.value,i=parseFloat(s==null?void 0:s.value),d=(o==null?void 0:o.value)||"MobilePay",u=n==null?void 0:n.value,m=a==null?void 0:a.value,x=this.state.posCondition==="Used";let b=parseFloat(r==null?void 0:r.value)||0;if(x){const y=parseFloat(c==null?void 0:c.value);isNaN(y)||(b=y)}if(!i||isNaN(i)){this.showToast("⚠️ Debes ingresar un precio válido","error");return}if(!l&&!this.state.manualSaleSearch){this.showToast("⚠️ Debes buscar un producto o ingresar un nombre","error");return}try{t&&(t.disabled=!0,t.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Procesando...');const y=this.state.inventory.find(p=>p.sku===l),k={items:[{recordId:y?y.id:"manual-"+Date.now(),quantity:1,unitPrice:i,costAtSale:b,artist:u||"Desconocido",album:m||this.state.manualSaleSearch||"Venta Manual",sku:l||"N/A"}],paymentMethod:d,customerName:"Venta Mostrador",total_amount:i,source:"STORE",channel:"tienda",condition:this.state.posCondition||"New",timestamp:firebase.firestore.FieldValue.serverTimestamp()};await Y.createSale(k),this.showToast("✅ Venta registrada correctamente"),this.printTicket(k),this.state.manualSaleSearch="",this.state.posSelectedItemSku=null,this.loadData()}catch(y){console.error("POS Action Error:",y),this.showToast("❌ Error: "+y.message,"error")}finally{t&&(t.disabled=!1,t.innerHTML='<i class="ph-bold ph-printer text-xl"></i> Cobrar e Imprimir Ticket')}},printTicket(t){const e=window.open("","_blank","width=300,height=600");if(!e){this.showToast("⚠️ El bloqueador de ventanas emergentes impidió imprimir el ticket","warning");return}const s=t.items[0];e.document.write(`
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
                        <span>1 x ${this.formatCurrency(s.unitPrice)}</span>
                        <span class="bold">${this.formatCurrency(s.unitPrice)}</span>
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
        `),e.document.close()},updateOrderFeedFilter(t){this.state.orderFeedFilter=t,this.renderSales(document.getElementById("app-content"))},toggleOrderActionMenu(t){const e=document.getElementById(`action-menu-${t}`);document.querySelectorAll('[id^="action-menu-"]').forEach(s=>{s.id!==`action-menu-${t}`&&s.classList.add("hidden")}),e&&e.classList.toggle("hidden")},async markOrderAsShipped(t){try{await D.collection("sales").doc(t).update({status:"shipped",fulfillment_status:"fulfilled",shipped_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast("✅ Pedido marcado como enviado"),this.loadData()}catch(e){console.error("Error marking order as shipped:",e),this.showToast("❌ Error al actualizar estado","error")}},searchSku(t){this.state.manualSaleSearch=t;const e=document.getElementById("sku-results");if(t.length<2){e.classList.add("hidden");return}const s=this.state.inventory.filter(o=>o.artist.toLowerCase().includes(t.toLowerCase())||o.album.toLowerCase().includes(t.toLowerCase())||o.sku.toLowerCase().includes(t.toLowerCase()));s.length>0?(e.innerHTML=s.map(o=>`
    <div onclick="app.selectSku('${o.sku}')" class="p-3 hover:bg-orange-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center">
                    <div>
                        <p class="font-bold text-sm text-brand-dark">${o.album}</p>
                        <p class="text-xs text-slate-500">${o.artist}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-sm text-brand-orange">${this.formatCurrency(o.price)}</p>
                        <p class="text-xs ${o.stock>0?"text-green-500":"text-red-500"}">Stock: ${o.stock}</p>
                    </div>
                </div>
    `).join(""),e.classList.remove("hidden")):e.classList.add("hidden")},selectSku(t){const e=this.state.inventory.find(s=>s.sku===t);e&&(this.state.posSelectedItemSku=e.sku,this.renderSales(document.getElementById("app-content")),setTimeout(()=>{const s=document.getElementById("input-price"),o=document.getElementById("input-sku"),n=document.getElementById("input-cost"),a=document.getElementById("input-artist"),r=document.getElementById("input-album"),c=document.getElementById("input-genre"),l=document.getElementById("input-owner"),i=document.getElementById("sku-search");s&&(s.value=e.price),o&&(o.value=e.sku),n&&(n.value=e.cost||0),a&&(a.value=e.artist),r&&(r.value=e.album),c&&(c.value=e.genre),l&&(l.value=e.owner),i&&(i.value=`${e.artist} - ${e.album}`,this.state.manualSaleSearch=i.value);const d=document.getElementById("sku-results");d&&d.classList.add("hidden")},50),e.stock<=0&&this.showToast("⚠️ Este producto no tiene stock disponible","warning"))},updateTotal(){const t=parseFloat(document.getElementById("input-price").value)||0,e=parseInt(document.getElementById("input-qty").value)||1,s=t*e;document.getElementById("form-total").innerText=this.formatCurrency(s)},openAddVinylModal(t=null){let e={sku:"",artist:"",album:"",genre:"Minimal",condition:"NM",product_condition:"Second-hand",price:"",cost:"",stock:1,owner:"El Cuartito"},s=!1;if(t){const r=this.state.inventory.find(c=>c.sku===t);r&&(e=r,s=!0)}if(!s){const r=this.state.inventory.map(l=>{const i=l.sku.match(/^SKU\s*-\s*(\d+)/);return i?parseInt(i[1]):0}),c=Math.max(0,...r);e.sku=`SKU-${String(c+1).padStart(3,"0")}`}const o=["Minimal","Techno","House","Deep House","Electro"],n=[...new Set([...o,...this.state.customGenres||[]])],a=`
    <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-5xl p-6 md:p-8 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div class="flex justify-between items-center mb-6 shrink-0">
                <h3 class="font-display text-2xl font-bold text-brand-dark">${s?"Editar Vinilo":"Agregar Nuevo Vinilo"}</h3>
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
                                ${s?'<button onclick="app.resyncMusic()" class="text-xs font-bold text-slate-400 hover:text-brand-orange ml-4 flex items-center gap-1"><i class="ph-bold ph-arrows-clockwise"></i> Resync Music</button>':""}
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
                        <div id="cover-preview" class="${e.cover_image?"":"hidden"} w-full h-full relative">
                            <img src="${e.cover_image||""}" class="w-full h-full object-cover">
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span class="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">Portada</span>
                                </div>
                        </div>
                        <div class="${e.cover_image?"hidden":""} text-center p-6 text-slate-300">
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
                    <form onsubmit="app.handleAddVinyl(event, '${s?e.sku:""}')" class="space-y-5">

                        <!-- Hidden Fields -->
                        <input type="hidden" name="cover_image" id="input-cover-image" value="${e.cover_image||""}">
                        <input type="hidden" name="discogs_release_id" id="input-discogs-release-id" value="${e.discogs_release_id||""}">
                            <input type="hidden" name="discogsUrl" id="input-discogs-url" value="${e.discogsUrl||""}">
                                <input type="hidden" name="discogsId" id="input-discogs-id" value="${e.discogsId||""}">
                                    <!-- Fixed: Add hidden SKU input for form data -->
                                    <input type="hidden" name="sku" value="${e.sku}">

                                        <!-- Main Info Group -->
                                        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                                            <h4 class="text-sm font-bold text-brand-dark flex items-center gap-2 border-b border-slate-50 pb-2">
                                                <i class="ph-fill ph-info text-brand-orange"></i> Información Principal
                                            </h4>

                                            <div class="grid grid-cols-2 gap-5">
                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Artista</label>
                                                    <input name="artist" value="${e.artist}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none font-bold text-brand-dark transition-all focus:bg-white text-sm">
                                                </div>
                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Álbum</label>
                                                    <input name="album" value="${e.album}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none font-bold text-brand-dark transition-all focus:bg-white text-sm">
                                                </div>
                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Sello / Label</label>
                                                    <input name="label" id="input-label" value="${e.label||""}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm">
                                                </div>
                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Collection</label>
                                                    <select name="collection" id="input-collection" onchange="app.handleCollectionChange(this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">Sin Colección</option>
                                                        <option value="Detroit Techno" ${e.collection==="Detroit Techno"?"selected":""}>Detroit Techno</option>
                                                        <option value="Ambient Essentials" ${e.collection==="Ambient Essentials"?"selected":""}>Ambient Essentials</option>
                                                        <option value="Staff Picks" ${e.collection==="Staff Picks"?"selected":""}>Staff Picks</option>
                                                        <option value="other" ${e.collection&&!["Detroit Techno","Ambient Essentials","Staff Picks"].includes(e.collection)?"selected":""}>Otro...</option>
                                                    </select>
                                                    <div id="custom-collection-container" class="${e.collection&&!["Detroit Techno","Ambient Essentials","Staff Picks"].includes(e.collection)?"":"hidden"} mt-2">
                                                        <input name="custom_collection" id="custom-collection-input" value="${e.collection&&!["Detroit Techno","Ambient Essentials","Staff Picks"].includes(e.collection)?e.collection:""}" placeholder="Nombre de la colección" class="w-full bg-white border border-brand-orange rounded-xl p-2 text-sm focus:outline-none">
                                                    </div>
                                                </div>
                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género Principal</label>
                                                    <select name="genre" onchange="app.checkCustomInput(this, 'custom-genre-container')" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">Seleccionar...</option>
                                                        ${n.map(r=>`<option ${e.genre===r?"selected":""}>${r}</option>`).join("")}
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
                                                        ${n.map(r=>`<option ${e.genre2===r?"selected":""}>${r}</option>`).join("")}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género Terciario</label>
                                                    <select name="genre3" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${n.map(r=>`<option ${e.genre3===r?"selected":""}>${r}</option>`).join("")}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género 4</label>
                                                    <select name="genre4" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${n.map(r=>`<option ${e.genre4===r?"selected":""}>${r}</option>`).join("")}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género 5</label>
                                                    <select name="genre5" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${n.map(r=>`<option ${e.genre5===r?"selected":""}>${r}</option>`).join("")}
                                                    </select>
                                                </div>
                                                
                                                <!-- Collection Note (conditional) -->
                                                <div id="collection-note-container" class="col-span-2 ${e.collection?"":"hidden"}">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Collection Note</label>
                                                    <textarea name="collectionNote" id="input-collection-note" placeholder="¿Por qué elegiste este disco para esta colección?" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm resize-none">${e.collectionNote||""}</textarea>
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
                                                        <option value="El Cuartito" ${e.owner==="El Cuartito"?"selected":""}>El Cuartito (Propio)</option>
                                                        ${this.state.consignors.map(r=>`<option value="${r.name}" data-split="${r.split||r.agreementSplit||70}" ${e.owner===r.name?"selected":""}>${r.name} (${r.split||r.agreementSplit||70}%)</option>`).join("")}
                                                    </select>
                                                </div>
                                                <div class="col-span-3 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Label Disquería</label>
                                                    <input name="storageLocation" value="${e.storageLocation||""}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm" placeholder="A1">
                                                </div>
                                                <div class="col-span-3 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Estado del Vinilo</label>
                                                    <select name="condition" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm font-bold">
                                                        <option value="M" ${e.condition==="M"?"selected":""}>Mint (M)</option>
                                                        <option value="NM" ${e.condition==="NM"?"selected":""}>Near Mint (NM)</option>
                                                        <option value="VG+" ${e.condition==="VG+"?"selected":""}>Very Good Plus (VG+)</option>
                                                        <option value="VG" ${e.condition==="VG"?"selected":""}>Very Good (VG)</option>
                                                        <option value="G+" ${e.condition==="G+"?"selected":""}>Good Plus (G+)</option>
                                                        <option value="G" ${e.condition==="G"?"selected":""}>Good (G)</option>
                                                        <option value="F" ${e.condition==="F"?"selected":""}>Fair (F)</option>
                                                        <option value="P" ${e.condition==="P"?"selected":""}>Poor (P)</option>
                                                    </select>
                                                </div>
                                                <div class="col-span-3 md:col-span-2">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Condición Producto</label>
                                                    <select name="product_condition" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm font-bold">
                                                        <option value="New" ${e.product_condition==="New"?"selected":""}>🆕 Nuevo (New)</option>
                                                        <option value="Second-hand" ${e.product_condition==="Second-hand"||!e.product_condition?"selected":""}>📦 Usado (Second-hand)</option>
                                                    </select>
                                                </div>
                                                <div class="col-span-3 md:col-span-2">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Estado de la Funda</label>
                                                    <select name="sleeveCondition" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm font-bold">
                                                        <option value="" ${e.sleeveCondition?"":"selected"}>Not Graded</option>
                                                        <option value="Generic" ${e.sleeveCondition==="Generic"?"selected":""}>Generic</option>
                                                        <option value="No Cover" ${e.sleeveCondition==="No Cover"?"selected":""}>No Cover</option>
                                                        <option value="M" ${e.sleeveCondition==="M"?"selected":""}>Mint (M)</option>
                                                        <option value="NM" ${e.sleeveCondition==="NM"?"selected":""}>Near Mint (NM)</option>
                                                        <option value="VG+" ${e.sleeveCondition==="VG+"?"selected":""}>Very Good Plus (VG+)</option>
                                                        <option value="VG" ${e.sleeveCondition==="VG"?"selected":""}>Very Good (VG)</option>
                                                        <option value="G+" ${e.sleeveCondition==="G+"?"selected":""}>Good Plus (G+)</option>
                                                        <option value="G" ${e.sleeveCondition==="G"?"selected":""}>Good (G)</option>
                                                        <option value="F" ${e.sleeveCondition==="F"?"selected":""}>Fair (F)</option>
                                                        <option value="P" ${e.sleeveCondition==="P"?"selected":""}>Poor (P)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div class="p-4 bg-orange-50/50 rounded-xl border border-orange-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Costo Adquisición</label>
                                                    <input name="cost" id="modal-cost" type="number" step="0.5" value="${e.cost}" required oninput="app.handleCostChange()" class="w-full bg-white border border-slate-200 rounded-xl p-2 focus:border-brand-orange outline-none text-center shadow-sm text-sm font-bold text-slate-600">
                                                </div>
                                                <div>
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ganancia %</label>
                                                    <input name="margin" id="modal-margin" type="number" step="1" value="30" oninput="app.handleMarginChange()" class="w-full bg-white border border-slate-200 rounded-xl p-2 focus:border-brand-orange outline-none text-center shadow-sm text-sm font-bold text-brand-orange">
                                                </div>
                                                <div>
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Precio Venta (Bruto)</label>
                                                    <input name="price" id="modal-price" type="number" step="0.5" value="${e.price}" required oninput="app.handlePriceChange()" class="w-full bg-white border border-slate-200 rounded-xl p-2 focus:border-brand-orange outline-none font-bold text-brand-dark text-lg text-center shadow-sm">
                                                </div>
                                                <div>
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Stock</label>
                                                    <input name="stock" type="number" value="${e.stock}" required class="w-full bg-white border border-slate-200 rounded-xl p-2 focus:border-brand-orange outline-none font-bold text-center shadow-sm">
                                                </div>
                                            </div>
                                            <div class="flex justify-between items-center px-1">
                                                <p class="text-[10px] text-slate-400" id="cost-helper">Ingresa Costo y Margen para calcular precio.</p>
                                                <p class="text-[10px] text-slate-400 font-mono">${e.sku}</p>
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
                                                >${e.comments||""}</textarea>
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
                                                <input type="checkbox" id="channel-webshop" name="publish_webshop" ${e.publish_webshop!==!1&&e.is_online!==!1?"checked":""} class="w-6 h-6 text-green-600 rounded border-green-300 focus:ring-green-500 cursor-pointer">
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
                                                <input type="checkbox" id="channel-discogs" name="publish_discogs" ${e.publish_discogs===!0||e.discogs_listing_id?"checked":""} class="w-6 h-6 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer">
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
                                                <input type="checkbox" id="channel-local" name="publish_local" ${e.publish_local!==!1?"checked":""} class="w-6 h-6 text-blue-600 rounded border-blue-300 focus:ring-blue-500 cursor-pointer">
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
                `;document.body.insertAdjacentHTML("beforeend",a)},openProductModal(t){console.log("Attempting to open modal for:",t);try{const e=this.state.inventory.find(n=>n.sku===t);if(!e){console.error("Item not found:",t),alert("Error: No se encontró el disco. Intenta recargar.");return}const s=document.getElementById("modal-overlay");s&&s.remove();const o=`
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
                                    <p class="text-3xl font-bold text-brand-dark">${this.formatCurrency(e.price)}</p>
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
                            </div>

                            <div class="pt-4 flex flex-wrap gap-3">
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openAddVinylModal('${e.sku}')" class="flex-1 min-w-[120px] bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/20 text-sm">
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
                                <button onclick="app.addToCart('${e.sku}'); document.getElementById('modal-overlay').remove()" class="flex-1 min-w-[120px] bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 text-sm">
                                    <i class="ph-bold ph-shopping-cart"></i>
                                    Vender
                                </button>
                                <button onclick="app.deleteVinyl('${e.sku}'); document.getElementById('modal-overlay').remove()" class="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm" title="Eliminar Disco">
                                    <i class="ph-bold ph-trash text-xl"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                `;document.body.insertAdjacentHTML("beforeend",o)}catch(e){console.error("Error opening product modal:",e),alert("Hubo un error al abrir la ficha. Por favor recarga la página.")}},handleCostChange(){const t=parseFloat(document.getElementById("modal-cost").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),o=document.getElementById("modal-margin"),n=document.getElementById("modal-price");if(s){const a=parseFloat(s)/100;if(a>0){const r=t/a;n.value=Math.ceil(r)}}else{const r=1-(parseFloat(o.value)||0)/100;if(r>0){const c=t/r;n.value=Math.ceil(c)}}},handlePriceChange(){const t=parseFloat(document.getElementById("modal-price").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),o=document.getElementById("modal-margin"),n=document.getElementById("modal-cost"),a=document.getElementById("cost-helper");if(s){const r=parseFloat(s)/100,c=t*r;n.value=Math.round(c),o.value=100-parseFloat(s),o.readOnly=!0,o.classList.add("opacity-50"),a&&(a.innerText=`Consignación: ${s}% Socio`)}else{const r=parseFloat(n.value)||0;if(r>0&&t>0){const c=(t-r)/r*100;o.value=Math.round(c)}o.readOnly=!1,o.classList.remove("opacity-50"),a&&(a.innerText="Modo Propio: Margen variable")}},handleMarginChange(){const t=parseFloat(document.getElementById("modal-margin").value)||0,e=parseFloat(document.getElementById("modal-cost").value)||0,s=document.getElementById("modal-price");if(e>0){const o=e*(1+t/100);s.value=Math.ceil(o)}},checkCustomInput(t,e){const s=document.getElementById(e);t.value==="other"?(s.classList.remove("hidden"),s.querySelector("input").required=!0,s.querySelector("input").focus()):(s.classList.add("hidden"),s.querySelector("input").required=!1)},toggleCollectionNote(t){const e=document.getElementById("collection-note-container");e&&t&&t!==""?e.classList.remove("hidden"):e&&e.classList.add("hidden")},handleCollectionChange(t){var o;const e=document.getElementById("custom-collection-container"),s=document.getElementById("collection-note-container");t==="other"?(e==null||e.classList.remove("hidden"),(o=e==null?void 0:e.querySelector("input"))==null||o.focus()):e==null||e.classList.add("hidden"),t&&t!==""?s==null||s.classList.remove("hidden"):s==null||s.classList.add("hidden")},openAddSaleModal(){const t=this.state.cart.length>0?this.state.cart.map(s=>`
                <div class="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <div class="min-w-0 pr-2">
                        <p class="font-bold text-xs text-brand-dark truncate">${s.album}</p>
                        <p class="text-[10px] text-slate-500">${this.formatCurrency(s.price)}</p>
                    </div>
                </div>`).join(""):'<p class="text-sm text-slate-400 italic text-center py-4">El carrito está vacío</p>',e=`
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
                                        ${t}
                                    </div>
                                    ${this.state.cart.length>0?`
                                <div class="flex justify-between items-center mb-4 pt-2 border-t border-slate-200">
                                    <span class="text-sm font-bold text-slate-500">Total</span>
                                    <span class="text-xl font-bold text-brand-dark">${this.formatCurrency(this.state.cart.reduce((s,o)=>s+o.price,0))}</span>
                                </div>
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openCheckoutModal()" class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20 flex items-center justify-center gap-2">
                                    <i class="ph-bold ph-check-circle"></i> Finalizar Compra Carrito
                                </button>
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
                                                                </button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                    `;document.body.insertAdjacentHTML("beforeend",e),setTimeout(()=>document.getElementById("sku-search").focus(),100)},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(n=>n.sku===t);if(!s)return;if(this.state.cart.filter(n=>n.sku===t).length>=s.stock){this.showToast(`⚠️ No queda más stock de "${s.album}"`,"warning");return}this.openAddSaleModal(),setTimeout(()=>{const n=document.getElementById("sku-search");n.value=t,this.searchSku(t),setTimeout(()=>{const a=document.getElementById("sku-results").firstElementChild;a&&a.click()},500)},200)},openUnifiedOrderDetailModal(t){var x,b,y,k;const e=this.state.sales.find(p=>p.id===t);if(!e)return;const s=this.getCustomerInfo(e),o=e.history||[],n=(x=e.timestamp)!=null&&x.toDate?e.timestamp.toDate():e.date?new Date(e.date):new Date;let a=[];o.length>0?a=o.map(p=>({status:p.status,timestamp:new Date(p.timestamp),note:p.note})).sort((p,g)=>g.timestamp-p.timestamp):a.push({status:e.fulfillment_status||"pending",timestamp:(b=e.updated_at)!=null&&b.toDate?e.updated_at.toDate():e.updated_at?new Date(e.updated_at):new Date,note:"Última actualización"}),a.push({status:"created",timestamp:n,note:`Orden recibida via ${e.channel||e.soldAt||"Sistema"}`});const r=p=>({created:{icon:"ph-shopping-cart",color:"bg-slate-100 text-slate-500",label:"Recibido"},preparing:{icon:"ph-package",color:"bg-blue-100 text-blue-600",label:"En Preparación"},ready_for_pickup:{icon:"ph-storefront",color:"bg-emerald-100 text-emerald-600",label:"Listo para Retiro"},in_transit:{icon:"ph-truck",color:"bg-orange-100 text-orange-600",label:"En Tránsito"},shipped:{icon:"ph-archive",color:"bg-green-100 text-green-600",label:"Despachado"},picked_up:{icon:"ph-check-circle",color:"bg-green-100 text-green-600",label:"Retirado"},completed:{icon:"ph-check-circle",color:"bg-green-100 text-green-600",label:"Confirmado"},failed:{icon:"ph-x-circle",color:"bg-red-100 text-red-600",label:"Fallido"},PENDING:{icon:"ph-clock",color:"bg-yellow-100 text-yellow-600",label:"Pendiente"}})[p]||{icon:"ph-info",color:"bg-slate-100",label:p},c=e.items?e.items.reduce((p,g)=>{var v;return p+(g.unitPrice||g.priceAtSale||((v=g.record)==null?void 0:v.price)||0)*(g.qty||g.quantity||1)},0):e.total||0,l=parseFloat(e.shipping_income||e.shipping_cost||e.shipping||((y=e.shipping_method)==null?void 0:y.price)||0),i=l*.2,d=(e.discogsFee||0)+(e.paypalFee||0),u=e.total_amount||e.total||c+l,m=`
        <div id="unified-modal" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative animate-fadeIn flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] font-bold text-brand-orange uppercase tracking-widest">Orden #${e.orderNumber||e.id.slice(0,8)}</span>
                            <span class="px-2 py-0.5 rounded-full ${r(e.status).color} text-[9px] font-bold uppercase">${r(e.status).label}</span>
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
                                            ${(e.items||[]).map(p=>{var g,v,E,$,I;return`
                                                <tr>
                                                    <td class="px-4 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <img src="${p.image||p.cover_image||((g=p.record)==null?void 0:g.cover_image)||"https://elcuartito.dk/default-vinyl.png"}" class="w-10 h-10 rounded-lg object-cover shadow-sm">
                                                            <div>
                                                                <p class="font-bold text-brand-dark">${p.album||((v=p.record)==null?void 0:v.album)||"Desconocido"}</p>
                                                                <p class="text-[10px] text-slate-500">${p.artist||((E=p.record)==null?void 0:E.artist)||""}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-4 py-4 text-center font-mono text-xs text-slate-400">${p.sku||(($=p.record)==null?void 0:$.sku)||"-"}</td>
                                                    <td class="px-4 py-4 text-center font-medium">${p.quantity||p.qty||1}</td>
                                                    <td class="px-4 py-4 text-right font-bold text-brand-dark">${this.formatCurrency(p.unitPrice||p.priceAtSale||((I=p.record)==null?void 0:I.price)||0)}</td>
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
                                            <span class="font-medium text-brand-dark">${this.formatCurrency(c)}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-slate-500">Envío (Gross)</span>
                                            <span class="font-medium text-brand-dark">${this.formatCurrency(l)}</span>
                                        </div>
                                        <div class="flex justify-between text-blue-600 text-[10px] font-bold">
                                            <span>↳ Salgsmoms Envío (25%)</span>
                                            <span>${this.formatCurrency(i)}</span>
                                        </div>
                                        ${d!==0?`
                                            <div class="flex justify-between text-red-500">
                                                <span>Fees (Discogs/PayPal)</span>
                                                <span class="font-medium">-${this.formatCurrency(d)}</span>
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
                                        Registrado el ${n.toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"})}
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
                                        <p class="text-sm font-medium text-slate-600">${((k=e.customer)==null?void 0:k.phone)||"-"}</p>
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
                                        </button>
                                        <button onclick="app.updateFulfillmentStatus(event, '${e.id}', 'ready_for_pickup')" class="w-full px-4 py-2.5 rounded-xl border ${e.fulfillment_status==="ready_for_pickup"?"bg-emerald-600 text-white border-emerald-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"} text-xs font-bold transition-all flex items-center gap-2">
                                            <i class="ph ph-storefront"></i> Listo para Retiro
                                        </button>
                                        <button onclick="app.updateFulfillmentStatus(event, '${e.id}', 'shipped')" class="w-full px-4 py-2.5 rounded-xl border ${e.fulfillment_status==="shipped"?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"} text-xs font-bold transition-all flex items-center gap-2">
                                            <i class="ph ph-paper-plane-tilt"></i> Enviado / Despachado
                                        </button>
                                    </div>
                                </div>
                            `:""}

                            <!-- History Timeline -->
                            <div class="space-y-4">
                                <h4 class="font-bold text-brand-dark flex items-center gap-2">
                                    <i class="ph-fill ph-clock-counter-clockwise text-brand-orange"></i> Movimientos
                                </h4>
                                <div class="relative pl-4 border-l-2 border-slate-100 space-y-6">
                                    ${a.map((p,g)=>{const v=r(p.status);return`
                                            <div class="relative">
                                                <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${g===0?"bg-brand-orange ring-4 ring-orange-50":"bg-slate-300"}"></div>
                                                <div class="flex flex-col gap-0.5">
                                                    <div class="flex items-center gap-2">
                                                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${v.color}">
                                                            ${v.label}
                                                        </span>
                                                        <span class="text-[9px] text-slate-400 font-mono">
                                                            ${p.timestamp.toLocaleDateString("es-ES",{day:"2-digit",month:"short"})} ${p.timestamp.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
                                                        </span>
                                                    </div>
                                                    <p class="text-xs text-slate-500">${p.note||"-"}</p>
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
                    </button>
                </div>
            </div>
        </div>
        `;document.body.insertAdjacentHTML("beforeend",m)},openInvoiceModal(t){var g;const e=this.state.sales.find(v=>v.id===t);if(!e){this.showToast("Sale not found","error");return}const s=e.items||[],o=(g=e.date)!=null&&g.toDate?e.date.toDate():new Date(e.date||e.timestamp),n=o.toISOString().slice(0,10).replace(/-/g,""),a=e.invoiceNumber||`ECR-${n}-${t.slice(-4).toUpperCase()}`,r=s.filter(v=>v.productCondition==="New"),c=s.filter(v=>v.productCondition!=="New");let l=0,i=0;const d=(v,E)=>v.map($=>{const I=$.priceAtSale||$.price||0,S=$.qty||$.quantity||1,_=I*S;if(i+=_,E){const F=_*.2;return l+=F,`
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${$.album||"Product"}</div>
                                <div style="font-size: 11px; color: #666;">${$.artist||""}</div>
                                <div style="font-size: 11px; color: #2563eb; margin-top: 4px;">✓ Moms (25%): DKK ${F.toFixed(2)}</div>
                            </td>
                            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eee;">${S}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee;">DKK ${I.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">DKK ${_.toFixed(2)}</td>
                        </tr>
                    `}else return`
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${$.album||"Product"}</div>
                                <div style="font-size: 11px; color: #666;">${$.artist||""}</div>
                                <div style="font-size: 10px; color: #d97706; margin-top: 4px; font-style: italic;">Brugtmoms - Køber har ikke fradrag for momsen</div>
                            </td>
                            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eee;">${S}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee;">DKK ${I.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">DKK ${_.toFixed(2)}</td>
                        </tr>
                    `}).join("");let u="";r.length>0&&c.length>0?u=`
                <tr><td colspan="4" style="padding: 15px 0 8px 0; font-size: 12px; font-weight: bold; color: #2563eb; text-transform: uppercase;">🆕 New Products (VAT Deductible)</td></tr>
                ${d(r,!0)}
                <tr><td colspan="4" style="padding: 20px 0 8px 0; font-size: 12px; font-weight: bold; color: #d97706; text-transform: uppercase;">📦 Used Products (Margin Scheme / Brugtmoms)</td></tr>
                ${d(c,!1)}
            `:u=d(r,!0)+d(c,!1);const m=parseFloat(e.shipping_income||e.shipping||e.shipping_cost||0),x=m*.2,b=i+m,y=e.customer?`${e.customer.firstName||""} ${e.customer.lastName||""}`.trim():e.customerName||"Customer",k=e.customer?`${e.customer.address||""}<br>${e.customer.postalCode||""} ${e.customer.city||""}<br>${e.customer.country||""}`:"",p=`
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
                                    <p style="color: #666; margin: 0;">${y}</p>
                                    ${k?`<p style="color: #666; margin: 5px 0; font-size: 12px;">${k}</p>`:""}
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
                                    <span>DKK ${i.toFixed(2)}</span>
                                </div>
                                ${l>0?`
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #2563eb; font-size: 13px;">
                                    <span>↳ Heraf moms (25%):</span>
                                    <span>DKK ${l.toFixed(2)}</span>
                                </div>
                                `:""}
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>Shipping (incl. 25% VAT):</span>
                                    <span>DKK ${m.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #2563eb; font-size: 11px;">
                                    <span>↳ Shipping VAT (25%):</span>
                                    <span>DKK ${x.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #333; font-weight: 900; font-size: 18px;">
                                    <span>Total:</span>
                                    <span>DKK ${b.toFixed(2)}</span>
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
        `;document.body.insertAdjacentHTML("beforeend",p)},printInvoice(){const t=document.getElementById("invoice-content").innerHTML,e=window.open("","_blank");e.document.write(`
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
        `),e.document.close()},navigateInventoryFolder(t,e){t==="genre"&&(this.state.filterGenre=e),t==="owner"&&(this.state.filterOwner=e),t==="label"&&(this.state.filterLabel=e),t==="storage"&&(this.state.filterStorage=e),this.refreshCurrentView()},toggleSelection(t){this.state.selectedItems.has(t)?this.state.selectedItems.delete(t):this.state.selectedItems.add(t),this.refreshCurrentView()},openPrintLabelModal(t){const e=this.state.inventory.find(o=>o.sku===t);if(!e)return;const s=`
    <div id="print-label-modal" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" >
                                                        <div class="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-orange-100 overflow-hidden max-h-[90vh] flex flex-col relative">

                                                            <!-- Header -->
                                                            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                                                <div>
                                                                    <h2 class="text-2xl font-display font-bold text-brand-dark">Imprimir Etiqueta</h2>
                                                                    <p class="text-slate-500 text-sm">Configura e imprime la etiqueta para ${e.sku}</p>
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
                                                                                        <div style="font-size: 10pt; font-weight: bold; margin-bottom: 2px; line-height: 1.1; letter-spacing: -0.3px;">${e.album}</div>
                                                                                        <div style="font-size: 8pt; margin-bottom: 12px; letter-spacing: -0.2px;">${e.artist}</div>
                                                                                        <div style="font-size: 8pt; color: #444; font-weight: bold; font-style: italic;">${e.genre||""}</div>
                                                                                    </div>

                                                                                    <!-- Comment Section -->
                                                                                    <div style="position: absolute; top: 21mm; left: 4mm; width: calc(100% - 8mm); height: 9mm; display: flex; align-items: start;">
                                                                                        <p id="preview-comment" style="font-size: 7pt; line-height: 1.4; padding-top: 3px; margin: 0; white-space: pre-wrap; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                                                                                            
                                                                                        </p>
                                                                                    </div>

                                                                                    <!-- Footer Section -->
                                                                                    <div style="position: absolute; bottom: 1.5mm; left: 4mm; width: calc(100% - 8mm);">
                                                                                        <div style="font-size: 11pt; font-weight: bold; letter-spacing: -0.5px; line-height: 0.9; margin-bottom: 2px;">${e.sku}</div>
                                                                                        <div style="font-size: 7pt; font-weight: normal; text-transform: uppercase; color: #555; line-height: 1;">${e.storageLocation||"Sin Ubicación"}</div>
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
    `;document.body.insertAdjacentHTML("beforeend",s)},initFuse(){if(typeof Fuse>"u"){console.warn("Fuse.js not loaded yet");return}const t={keys:[{name:"artist",weight:.4},{name:"album",weight:.3},{name:"label",weight:.2},{name:"sku",weight:.1},{name:"genre",weight:.05},{name:"notes",weight:.05}],threshold:.4,distance:100,ignoreLocation:!0,minMatchCharLength:2};this.fuse=new Fuse(this.state.inventory,t)},getFilteredInventory(){const t=(this.state.inventorySearch||"").trim().toLowerCase(),e=this.state.filterGenre||"all",s=this.state.filterOwner||"all",o=this.state.filterLabel||"all",n=this.state.filterStorage||"all",a=this.state.filterDiscogs||"all";let r=this.state.inventory;if(t.length>=2)if(this.fuse)r=this.fuse.search(t).map(c=>c.item);else{const c=t.split(" ").filter(l=>l.length>0);r=r.filter(l=>c.every(i=>(l.artist||"").toLowerCase().includes(i)||(l.album||"").toLowerCase().includes(i)||(l.label||"").toLowerCase().includes(i)||(l.genre||"").toLowerCase().includes(i)||(l.notes||"").toLowerCase().includes(i)||(l.sku||"").toLowerCase().includes(i)))}return r.filter(c=>{const l=e==="all"||c.genre===e,i=s==="all"||c.owner===s,d=o==="all"||c.label===o,u=n==="all"||c.storageLocation===n,m=!!c.discogs_listing_id;return l&&i&&d&&u&&(a==="all"||a==="yes"&&m||a==="no"&&!m)})},toggleSelectAll(){const t=this.getFilteredInventory();t.length>0&&t.every(e=>this.state.selectedItems.has(e.sku))?t.forEach(e=>this.state.selectedItems.delete(e.sku)):t.forEach(e=>this.state.selectedItems.add(e.sku)),this.refreshCurrentView()},addSelectionToCart(){this.state.selectedItems.forEach(t=>{const e=this.state.inventory.find(s=>s.sku===t);e&&e.stock>0&&(this.state.cart.find(s=>s.sku===t)||this.state.cart.push(e))}),this.state.selectedItems.clear(),this.showToast(`${this.state.cart.length} items agregados al carrito`),this.refreshCurrentView()},deleteSelection(){if(!confirm(`¿Estás seguro de eliminar ${this.state.selectedItems.size} productos ? `))return;const t=D.batch(),e=[];this.state.selectedItems.forEach(s=>{const o=D.collection("products").doc(s),n=this.state.inventory.find(a=>a.sku===s);n&&e.push(n),t.delete(o)}),t.commit().then(()=>{this.showToast("Productos eliminados"),e.forEach(s=>this.logInventoryMovement("DELETE",s)),this.state.selectedItems.clear()}).catch(s=>{console.error("Error logging movement:",s),alert("Error al eliminar")})},openAddExpenseModal(){const t=["Alquiler","Servicios","Marketing","Suministros","Honorarios"],s=`
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
                    </button>
            </form>
        </div>
                                                    </div>
    `;document.body.insertAdjacentHTML("beforeend",s)},async handleAddVinyl(t,e){t.preventDefault();const s=new FormData(t.target);let o=s.get("genre");o==="other"&&(o=s.get("custom_genre"));let n=s.get("collection");n==="other"&&(n=s.get("custom_collection"));const a=s.get("sku"),r=s.get("publish_webshop")==="on",c=s.get("publish_discogs")==="on",l=s.get("publish_local")==="on",i={sku:a,artist:s.get("artist"),album:s.get("album"),genre:o,genre2:s.get("genre2")||null,genre3:s.get("genre3")||null,genre4:s.get("genre4")||null,genre5:s.get("genre5")||null,label:s.get("label"),collection:n||null,collectionNote:s.get("collectionNote")||null,condition:s.get("condition"),product_condition:s.get("product_condition")||"Second-hand",sleeveCondition:s.get("sleeveCondition")||"",comments:s.get("comments")||"",price:parseFloat(s.get("price")),cost:parseFloat(s.get("cost"))||0,stock:parseInt(s.get("stock")),storageLocation:s.get("storageLocation"),owner:s.get("owner"),is_online:r,publish_webshop:r,publish_discogs:c,publish_local:l,cover_image:s.get("cover_image")||null,created_at:firebase.firestore.FieldValue.serverTimestamp()};try{let d=null,u=null;if(e){const m=await this.findProductBySku(e);if(!m){this.showToast("❌ Producto no encontrado","error");return}u=m.data,d=m.id,await m.ref.update(i),this.showToast("✅ Disco actualizado")}else d=(await D.collection("products").add(i)).id,this.showToast("✅ Disco agregado al inventario");if(c){const m=s.get("discogs_release_id");if(u&&u.discogs_listing_id)try{const b=await(await fetch(`${M}/discogs/update-listing/${u.discogs_listing_id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({product:i})})).json();if(b.success)this.showToast("💿 Listing de Discogs actualizado");else throw new Error(b.error||"Error desconocido")}catch(x){console.error("Error updating Discogs listing:",x),this.showToast(`⚠️ Error Discogs: ${x.message}`,"error")}else if(m)try{const b=await(await fetch(`${M}/discogs/create-listing`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({releaseId:parseInt(m),product:i})})).json();if(b.success&&b.listingId)await D.collection("products").doc(d).update({discogs_listing_id:String(b.listingId),discogs_release_id:parseInt(m)}),this.showToast("💿 Publicado en Discogs correctamente");else throw new Error(b.error||"Error desconocido")}catch(x){console.error("Error creating Discogs listing:",x);let b=x.message;(b.toLowerCase().includes("mp3")||b.toLowerCase().includes("digital")||b.toLowerCase().includes("format"))&&(b="Discogs solo permite formatos físicos (Vinyl, CD, Cassette). Este release es digital o MP3."),this.showToast(`⚠️ Error Discogs: ${b}`,"error")}else this.showToast("⚠️ Necesitas buscar el disco en Discogs primero para publicarlo","warning")}document.getElementById("modal-overlay").remove(),this.loadData()}catch(d){console.error(d),this.showToast("❌ Error: "+(d.message||"desconocido"),"error")}},deleteVinyl(t){const e=this.state.inventory.find(o=>o.sku===t);if(!e){alert("Error: Item not found");return}const s=`
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
                                                                </button>
                                                                <button onclick="app.confirmDelete('${e.sku}')" class="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},async confirmDelete(t){const e=document.getElementById("delete-confirm-modal");e&&e.remove();const s=document.getElementById("modal-overlay");s&&s.remove();try{const o=await this.findProductBySku(t);if(!o){this.showToast("❌ Producto no encontrado","error");return}if(console.log("Product to delete:",o.data),console.log("Has discogs_listing_id?",o.data.discogs_listing_id),o.data.discogs_listing_id){console.log("Attempting to delete from Discogs:",o.data.discogs_listing_id);try{const n=await fetch(`${M}/discogs/delete-listing/${o.data.discogs_listing_id}`,{method:"DELETE"});console.log("Discogs delete response status:",n.status);const a=await n.json();console.log("Discogs delete result:",a),a.success?(console.log("Discogs listing deleted successfully"),this.showToast("💿 Eliminado de Discogs")):this.showToast("⚠️ "+(a.error||"Error en Discogs"),"warning")}catch(n){console.error("Error deleting from Discogs:",n),this.showToast("⚠️ Error eliminando de Discogs, pero continuando...","warning")}}else console.log("No discogs_listing_id found, skipping Discogs deletion");await o.ref.delete(),this.showToast("✅ Disco eliminado"),await this.loadData()}catch(o){console.error("Error removing document: ",o),this.showToast("❌ Error al eliminar: "+o.message,"error")}},handleSaleSubmit(t){var v,E,$,I,S,_,F;t.preventDefault();const e=new FormData(t.target);let s=e.get("sku");s||(s=(v=document.getElementById("input-sku"))==null?void 0:v.value);const o=this.state.inventory.find(T=>T.sku===s);if(!o){this.showToast("⚠️ Debes seleccionar un producto válido del listado","error");const T=document.getElementById("sku-search");T&&(T.focus(),T.classList.add("border-red-500","animate-pulse"),setTimeout(()=>T.classList.remove("border-red-500","animate-pulse"),2e3));return}let n=parseInt(e.get("quantity"));if(isNaN(n)&&(n=parseInt((E=document.getElementById("input-qty"))==null?void 0:E.value)||1),o.stock<n){this.showToast(`❌ Stock insuficiente. Disponible: ${o.stock}`,"error");return}let a=parseFloat(e.get("price"));isNaN(a)&&(a=parseFloat(($=document.getElementById("input-price"))==null?void 0:$.value)||0);const r=parseFloat(e.get("cost"))||0,c=parseFloat(e.get("shipping_income"))||0,l=a*n+c;e.get("date")||new Date().toISOString();const i=e.get("paymentMethod"),d=e.get("soldAt");e.get("comment");let u=e.get("artist");u||(u=(I=document.getElementById("input-artist"))==null?void 0:I.value);let m=e.get("album");m||(m=(S=document.getElementById("input-album"))==null?void 0:S.value);let x=e.get("genre");x||(x=(_=document.getElementById("input-genre"))==null?void 0:_.value);let b=e.get("owner");b||(b=(F=document.getElementById("input-owner"))==null?void 0:F.value);const y=e.get("customerName"),k=e.get("customerEmail"),p=e.get("requestInvoice")==="on",g={items:[{recordId:o.id,quantity:n,unitPrice:a,costAtSale:r}],paymentMethod:i||"CASH",customerName:y||"Venta Manual",customerEmail:k||null,shipping_income:c,total_amount:l,source:"STORE",channel:(d==null?void 0:d.toLowerCase())||"store"};Y.createSale(g).then(()=>{this.showToast(p?"Venta registrada (Factura Solicitada)":"Venta registrada");const T=document.getElementById("modal-overlay");T&&T.remove();const K=t.target;K&&K.reset();const W=document.getElementById("form-total");W&&(W.innerText="$0.00");const z=document.getElementById("sku-search");z&&(z.value=""),this.state.manualSaleSearch="",this.loadData()}).catch(T=>{console.error("Error adding sale: ",T),this.showToast("❌ Error al registrar venta: "+(T.message||""),"error")})},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(n=>n.sku===t);if(!s)return;if(this.state.cart.filter(n=>n.sku===t).length>=s.stock){this.showToast("⚠️ No hay más stock disponible");return}this.state.cart.push(s),document.getElementById("inventory-cart-container")?this.renderInventoryCart():this.renderCartWidget(),this.showToast("Agregado al carrito")},removeFromCart(t){this.state.cart.splice(t,1),this.renderCartWidget()},clearCart(){this.state.cart=[],this.renderCartWidget()},renderOnlineSales(t){const e=this.state.sales.filter(a=>a.channel==="online"),s=e.filter(a=>a.status==="completed"),o=e.filter(a=>a.status==="PENDING"),n=s.reduce((a,r)=>a+(parseFloat(r.total_amount||r.total)||0),0);t.innerHTML=`
        <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="font-display text-3xl font-bold text-brand-dark mb-2">🌐 Ventas WebShop</h1>
                    <p class="text-slate-500">Pedidos realizados a través de la tienda online</p>
                </div>
                <div class="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl">
                    <div class="text-sm font-medium opacity-90">Ingresos Totales</div>
                    <div class="text-3xl font-bold">DKK ${n.toFixed(2)}</div>
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
                                ${e.map(a=>{var c;const r=(c=a.timestamp)!=null&&c.toDate?a.timestamp.toDate():new Date(a.date||0);return{...a,_sortDate:r.getTime()}}).sort((a,r)=>r._sortDate-a._sortDate).map(a=>{var x,b,y,k,p,g,v;const r=a.customer||{},c=a.orderNumber||"N/A",l=(x=a.timestamp)!=null&&x.toDate?a.timestamp.toDate():new Date(a.date),d=((b=a.completed_at)!=null&&b.toDate?a.completed_at.toDate():null)||l,u={completed:"bg-green-50 text-green-700 border-green-200",PENDING:"bg-yellow-50 text-yellow-700 border-yellow-200",failed:"bg-red-50 text-red-700 border-red-200"},m={completed:"✅ Completado",PENDING:"⏳ Pendiente",failed:"❌ Fallido"};return`
                                        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${a.id}')">
                                            <td class="px-6 py-4">
                                                <div class="font-mono text-sm font-bold text-brand-orange">${c}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-semibold text-brand-dark">${r.name||(r.firstName?`${r.firstName} ${r.lastName||""}`:"")||((y=r.stripe_info)==null?void 0:y.name)||"Cliente"}</div>
                                                <div class="text-xs text-slate-500">${r.email||((k=r.stripe_info)==null?void 0:k.email)||"No email"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-slate-600 truncate max-w-[200px]">
                                                    ${((p=r.shipping)==null?void 0:p.line1)||r.address||((v=(g=r.stripe_info)==null?void 0:g.shipping)==null?void 0:v.line1)||"Sin dirección"}
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
                                                    ${m[a.status]||a.status}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${a.fulfillment_status==="shipped"?"bg-blue-100 text-blue-700":a.fulfillment_status==="preparing"?"bg-orange-100 text-orange-700":a.fulfillment_status==="delivered"?"bg-green-100 text-green-700":"bg-slate-100 text-slate-600"}">
                                                    ${(a.fulfillment_status||"pendiente").toUpperCase()}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-xs text-slate-600">
                                                    ${d.toLocaleDateString("es-ES")}
                                                    <div class="text-[10px] text-slate-400">${d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-center" onclick="event.stopPropagation()">
                                                <button onclick="app.deleteSale('${a.id}')" class="text-slate-300 hover:text-red-500 transition-colors" title="Eliminar Pedido">
                                                    <i class="ph-fill ph-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `}).join("")}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        </div>
    `},openOnlineSaleDetailModal(t){var l,i,d;const e=this.state.sales.find(u=>u.id===t);if(!e)return;const s=e.customer||{},o=s.stripe_info||{},n=s.shipping||o.shipping||{},a={line1:n.line1||s.address||"Sin dirección",line2:n.line2||"",city:n.city||s.city||"",postal:n.postal_code||s.postalCode||"",country:n.country||s.country||"Denmark"},r=`
            <p class="font-medium">${a.line1}</p>
            ${a.line2?`<p class="font-medium">${a.line2}</p>`:""}
            <p class="text-slate-500">${a.postal} ${a.city}</p>
            <p class="text-slate-500 font-bold mt-1 uppercase tracking-wider">${a.country}</p>
        `,c=`
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
                    </button>
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
                            </button>
                            <button onclick="app.updateFulfillmentStatus(event, '${e.id}', 'shipped')" class="px-4 py-2 rounded-lg border ${e.fulfillment_status==="shipped"?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"} text-xs font-bold transition-all flex items-center gap-2">
                                <i class="ph ph-paper-plane-tilt"></i> Enviado
                            </button>
                            <button onclick="app.updateFulfillmentStatus(event, '${e.id}', 'delivered')" class="px-4 py-2 rounded-lg border ${e.fulfillment_status==="delivered"?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"} text-xs font-bold transition-all flex items-center gap-2">
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
                                    <p class="font-bold text-brand-dark text-base">${s.name||(s.firstName?`${s.firstName} ${s.lastName||""}`:"")||((l=s.stripe_info)==null?void 0:l.name)||"Cliente"}</p>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección</p>
                                    <div class="text-brand-dark space-y-0.5">
                                        ${r}
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
                                    <span class="font-bold">${new Date((i=e.timestamp)!=null&&i.toDate?e.timestamp.toDate():(d=e.completed_at)!=null&&d.toDate?e.completed_at.toDate():e.date).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</span>
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
                                    ${(e.items||[]).map(u=>{var m,x,b;return`
                                        <tr>
                                            <td class="px-4 py-3">
                                                <p class="font-bold text-brand-dark">${u.album||((m=u.record)==null?void 0:m.album)||"Unknown"}</p>
                                                <p class="text-xs text-slate-500">${u.artist||((x=u.record)==null?void 0:x.artist)||""}</p>
                                            </td>
                                            <td class="px-4 py-3 text-center font-medium">${u.quantity||1}</td>
                                            <td class="px-4 py-3 text-right font-bold text-brand-dark">DKK ${(u.unitPrice||((b=u.record)==null?void 0:b.price)||0).toFixed(2)}</td>
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
                    </button>
                    <button onclick="document.getElementById('modal-overlay').remove()" class="flex-1 bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;document.body.insertAdjacentHTML("beforeend",c)},renderCartWidget(){const t=document.getElementById("cart-widget");if(!t)return;const e=document.getElementById("cart-count"),s=document.getElementById("cart-items-mini"),o=document.getElementById("cart-total-mini");if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden"),e.innerText=this.state.cart.length;const n=this.state.cart.reduce((a,r)=>a+r.price,0);o.innerText=this.formatCurrency(n),s.innerHTML=this.state.cart.map((a,r)=>`
                                                                <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                                                    <div class="truncate pr-2">
                                                                        <p class="font-bold text-xs text-brand-dark truncate">${a.album}</p>
                                                                        <p class="text-[10px] text-slate-500 truncate">${a.price} kr.</p>
                                                                    </div>
                                                                    <button onclick="app.removeFromCart(${r})" class="text-red-400 hover:text-red-600">
                                                                        <i class="ph-bold ph-x"></i>
                                                                    </button>
                                                                </div>
                                                                `).join("")},openCheckoutModal(t,e){if(this.state.cart.length===0)return;const s=this.state.cart.reduce((i,d)=>i+d.price,0),o=`
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
                        ${this.state.cart.map(i=>`
                            <div class="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                                <span class="truncate pr-4 font-bold text-slate-700">${i.album}</span>
                                <span class="font-mono font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(i.price)}</span>
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
                                <span class="text-[10px] text-slate-500 font-bold uppercase">Precio Lista: ${this.formatCurrency(s)}</span>
                            </div>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold text-lg">kr.</span>
                                <input type="number" name="finalPrice" id="checkout-final-price" step="0.01" min="0" value="${s}"
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
        `;document.body.insertAdjacentHTML("beforeend",o);const n=s,a=document.getElementById("checkout-final-price"),r=document.getElementById("discogs-fee-section"),c=document.getElementById("discogs-fee-value"),l=()=>{const i=parseFloat(a.value)||0,d=n-i;document.getElementById("checkout-total-value").innerText=this.formatCurrency(i),d>0?(r.classList.remove("hidden"),c.innerText=`- kr.${d.toFixed(0)} `):r.classList.add("hidden")};a.addEventListener("input",l)},onCheckoutChannelChange(t){},handleCheckoutSubmit(t){t.preventDefault();const e=new FormData(t.target),s=parseFloat(e.get("finalPrice"))||0,o=this.state.cart.reduce((a,r)=>a+r.price,0),n={items:this.state.cart.map(a=>({recordId:a.id,quantity:1})),paymentMethod:e.get("paymentMethod"),customerName:e.get("customerName"),customerEmail:e.get("customerEmail"),channel:e.get("soldAt")||"Tienda",source:"STORE",customTotal:s,originalTotal:o,feeDeducted:o-s};Y.createSale(n).then(()=>{const a=n.channel==="Discogs"?" (Discogs listing eliminado)":"",r=n.feeDeducted>0?` | Fee: ${this.formatCurrency(n.feeDeducted)} `:"";this.showToast(`Venta de ${this.state.cart.length} items por ${this.formatCurrency(s)} registrada!${a}${r} `),this.clearCart(),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(a=>{console.error("Error checkout",a),alert("Error al procesar venta: "+a.message)})},handleSalesViewCheckout(){var s,o;if(this.state.cart.length===0){this.showToast("El carrito está vacío");return}const t=(s=document.getElementById("cart-payment"))==null?void 0:s.value,e=(o=document.getElementById("cart-channel"))==null?void 0:o.value;this.openCheckoutModal(t,e)},async notifyPreparingDiscogs(t){try{this.showToast('Enviando notificación "Preparando"...',"info"),await Y.notifyPreparing(t),this.showToast("✅ Cliente notificado (Preparando Orden)"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in notifyPreparingDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async notifyShippedDiscogs(t,e,s){try{const o=document.getElementById(e),n=o?o.value.trim():"",a=s?document.getElementById(s):null,r=a?a.value.trim():null;if(!n){this.showToast("⚠️ Ingresa un número de seguimiento","warning");return}this.showToast("Enviando notificación de envío...","info"),await Y.notifyShipped(t,n,r),this.showToast("✅ Cliente notificado y Tracking guardado"),await this.loadData(),this.refreshCurrentView()}catch(o){console.error("Error in notifyShippedDiscogs:",o),this.showToast("❌ Error: "+o.message,"error")}},async markDispatchedDiscogs(t){try{if(!confirm("¿Marcar como despachado? Esto moverá la orden al historial."))return;this.showToast("Marcando como despachado...","info"),await Y.markDispatched(t),this.showToast("✅ Orden despachada y archivada"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in markDispatchedDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async notifyPickupReadyDiscogs(t){try{this.showToast('Enviando notificación "Listo para Retirar"...',"info"),await Y.notifyPickupReady(t),this.showToast("✅ Cliente notificado (Listo para Retirar)"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in notifyPickupReadyDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async markPickedUpDiscogs(t){try{if(!confirm("¿El cliente ya retiró el pedido? Esto moverá la orden al historial."))return;this.showToast("Marcando como retirado...","info"),await Y.markPickedUp(t),this.showToast("✅ Orden retirada y archivada"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in markPickedUpDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async deleteSale(t){var s;if(!confirm("¿Eliminar esta venta y restaurar stock?"))return;const e=this.state.sales.find(o=>o.id===t);if(!e){this.showToast("❌ Venta no encontrada","error");return}try{const o=D.batch(),n=D.collection("sales").doc(t);if(o.delete(n),e.items&&Array.isArray(e.items))for(const a of e.items){const r=a.productId||a.recordId,c=a.sku||((s=a.record)==null?void 0:s.sku),l=parseInt(a.quantity||a.qty)||1;let i=null;if(r)try{const d=await D.collection("products").doc(r).get();d.exists&&(i={ref:d.ref,data:d.data()})}catch{console.warn("Could not find product by ID:",r)}!i&&c&&(i=await this.findProductBySku(c)),i?o.update(i.ref,{stock:firebase.firestore.FieldValue.increment(l)}):console.warn("Could not restore stock for item:",a)}else if(e.sku){const a=await this.findProductBySku(e.sku);if(a){const r=parseInt(e.quantity)||1;o.update(a.ref,{stock:firebase.firestore.FieldValue.increment(r)})}}await o.commit(),this.showToast("✅ Venta eliminada y stock restaurado"),this.loadData()}catch(o){console.error("Error deleting sale:",o),this.showToast("❌ Error al eliminar venta: "+o.message,"error")}},renderExpenses(t){const e=[{value:"alquiler",label:"Alquiler",type:"operativo"},{value:"servicios",label:"Servicios (internet, luz)",type:"operativo"},{value:"marketing",label:"Marketing",type:"operativo"},{value:"envios",label:"Envíos/Packaging",type:"operativo"},{value:"software",label:"Software/Suscripciones",type:"operativo"},{value:"honorarios",label:"Honorarios Profesionales",type:"operativo"},{value:"oficina",label:"Material de Oficina",type:"operativo"},{value:"transporte",label:"Transporte",type:"operativo"},{value:"otros_op",label:"Otros Gastos Operativos",type:"operativo"},{value:"stock_nuevo",label:"📦 Stock: Vinilos NUEVOS (Distribuidor)",type:"stock_nuevo"},{value:"stock_usado",label:"📦 Stock: Vinilos USADOS (Particular/Brugtmoms)",type:"stock_usado"}];window.expenseCategories=e;const s=(this.state.expensesSearch||"").toLowerCase(),o=this.state.expenses.filter(a=>!s||(a.description||a.proveedor||"").toLowerCase().includes(s)||(a.category||a.categoria||"").toLowerCase().includes(s)||(a.proveedor||"").toLowerCase().includes(s)),n=`
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
                                        ${o.length>0?o.map(a=>{var r;return`
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
                                                        ${((r=e.find(c=>c.value===(a.categoria||a.category)))==null?void 0:r.label)||a.categoria||a.category||"-"}
                                                    </span>
                                                    ${a.categoria==="stock_nuevo"||a.categoria==="stock_usado"||a.category==="Inventario (compra de vinilos)"?`
                                                        <button onclick="app.openInventoryIngest('${a.id}')" 
                                                            class="ml-2 text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded hover:bg-orange-600 transition-colors">
                                                            Ingresar Stock
                                                        </button>
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
                                                        </button>
                                                        <button onclick="app.deleteExpense('${a.id}')" 
                                                            class="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all" 
                                                            title="Eliminar">
                                                            <i class="ph-fill ph-trash"></i>
                                                        </button>
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
                                                ${this.formatCurrency(o.reduce((a,r)=>a+(r.monto_iva||0),0))}
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
                            `:""}
                        </div>
                    </div>
                </div>
            </div>
    `;t.innerHTML=n},editExpense(t){if(!confirm("¿Seguro que deseas editar esta compra?"))return;const e=this.state.expenses.find(o=>o.id===t);if(!e)return;document.getElementById("expense-id").value=e.id,document.getElementById("expense-proveedor").value=e.proveedor||e.description||"",document.getElementById("expense-fecha").value=e.fecha_factura||(e.date?e.date.split("T")[0]:""),document.getElementById("expense-monto").value=e.monto_total||e.amount||0,document.getElementById("expense-iva").value=e.monto_iva||0,document.getElementById("expense-categoria").value=e.categoria||e.category||"Otros",document.getElementById("expense-descripcion").value=e.descripcion||"";const s=document.getElementById("expense-categoria");s&&(s.value=e.categoria||e.category||"",this.handleExpenseCategoryChange(s)),e.receiptUrl&&(document.getElementById("receipt-url").value=e.receiptUrl,document.getElementById("upload-placeholder").classList.add("hidden"),document.getElementById("upload-preview").classList.remove("hidden"),document.getElementById("receipt-preview-img").src=e.receiptUrl,document.getElementById("receipt-filename").textContent="Recibo guardado"),document.getElementById("expense-form-title").innerHTML='<i class="ph-duotone ph-pencil-simple text-brand-orange"></i> Editar Compra',document.getElementById("expense-submit-btn").innerHTML='<i class="ph-bold ph-floppy-disk"></i> Actualizar',document.getElementById("expense-cancel-btn").classList.remove("hidden")},resetExpenseForm(){document.getElementById("expense-form").reset(),document.getElementById("expense-id").value="",document.getElementById("expense-fecha").value=new Date().toISOString().split("T")[0],document.getElementById("expense-iva").value="0",document.getElementById("expense-form-title").innerHTML='<i class="ph-duotone ph-plus-circle text-brand-orange"></i> Nueva Compra',document.getElementById("expense-submit-btn").innerHTML='<i class="ph-bold ph-floppy-disk"></i> Guardar',document.getElementById("expense-cancel-btn").classList.add("hidden"),document.getElementById("receipt-url").value="",document.getElementById("receipt-file").value="",document.getElementById("upload-placeholder").classList.remove("hidden"),document.getElementById("upload-preview").classList.add("hidden"),document.getElementById("receipt-preview-img").src="",document.getElementById("receipt-filename").textContent=""},handleExpenseSubmit(t){t.preventDefault();const e=new FormData(t.target),s=e.get("categoria"),o=(window.expenseCategories||[]).find(r=>r.value===s),n={proveedor:e.get("proveedor"),fecha_factura:e.get("fecha_factura"),date:e.get("fecha_factura"),monto_total:parseFloat(e.get("monto_total"))||0,monto_iva:parseFloat(e.get("monto_iva"))||0,categoria:s,categoria_label:(o==null?void 0:o.label)||s,categoria_tipo:(o==null?void 0:o.type)||"operativo",is_vat_deductible:(o==null?void 0:o.type)==="operativo"||(o==null?void 0:o.type)==="stock_nuevo",descripcion:e.get("descripcion")||"",receiptUrl:document.getElementById("receipt-url").value||"",timestamp:new Date().toISOString()},a=e.get("id");a?D.collection("expenses").doc(a).update(n).then(()=>{this.showToast("✅ Compra actualizada"),this.loadData()}).catch(r=>console.error(r)):D.collection("expenses").add(n).then(()=>{this.showToast("✅ Compra registrada"),this.loadData()}).catch(r=>console.error(r)),this.resetExpenseForm()},handleExpenseCategoryChange(t){const e=t.value,s=(window.expenseCategories||[]).find(a=>a.value===e),o=document.getElementById("expense-iva"),n=document.getElementById("category-warning");(s==null?void 0:s.type)==="stock_usado"?(o.value="0",o.disabled=!0,o.classList.add("bg-slate-100","cursor-not-allowed"),n.classList.remove("hidden")):(o.disabled=!1,o.classList.remove("bg-slate-100","cursor-not-allowed"),n.classList.add("hidden"))},openInventoryIngest(t){this.state.expenses.find(s=>s.id===t)&&(this.navigate("inventory"),this.showToast('ℹ️ Usa "Añadir Disco" para ingresar el stock de esta compra.'))},deleteExpense(t){const e=this.state.expenses.find(s=>s.id===t);if(e!=null&&e.receiptUrl){if(!confirm(`⚠️ ATENCIÓN: Este gasto tiene un recibo adjunto.

¿Estás seguro de que quieres eliminarlo?`))return;if(!confirm(`🔒 CONFIRMACIÓN LEGAL REQUERIDA

La ley exige guardar documentos contables durante 5 AÑOS.

Fecha del gasto: `+(e.fecha_factura||e.date||"Desconocida")+`
Proveedor: `+(e.proveedor||"Sin nombre")+`
Monto: `+this.formatCurrency(e.monto_total||e.amount||0)+`

¿CONFIRMAS que deseas eliminar permanentemente este registro y su recibo?`)){this.showToast("ℹ️ Eliminación cancelada");return}}else if(!confirm("¿Eliminar esta compra?"))return;D.collection("expenses").doc(t).delete().then(()=>{this.showToast("✅ Compra eliminada"),this.loadData()}).catch(s=>console.error(s))},async downloadReceiptsZip(){const t=new Date,e=t.getFullYear(),s=t.getMonth(),o=this.state.expenses.filter(n=>{const a=new Date(n.fecha_factura||n.date);return a.getFullYear()===e&&a.getMonth()===s&&n.receiptUrl});if(o.length===0){this.showToast("ℹ️ No hay comprobantes con recibo este mes");return}this.showToast(`📦 Preparando ZIP con ${o.length} comprobantes...`);try{const n=new JSZip,a=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],r=`Comprobantes_${e}_${String(s+1).padStart(2,"0")}_${a[s]}`,c=n.folder(r);let l=`RESUMEN DE COMPROBANTES - ${a[s]} ${e}
`;l+=`${"=".repeat(50)}

`,l+=`Generado: ${t.toLocaleString("es-ES")}
`,l+=`Total comprobantes: ${o.length}
`,l+=`Total gastos: ${this.formatCurrency(o.reduce((x,b)=>x+(b.monto_total||b.amount||0),0))}
`,l+=`Total IVA: ${this.formatCurrency(o.reduce((x,b)=>x+(b.monto_iva||0),0))}

`,l+=`${"=".repeat(50)}

`,l+=`DETALLE:

`;let i=0,d=0;for(let x=0;x<o.length;x++){const b=o[x],k=new Date(b.fecha_factura||b.date).toISOString().split("T")[0],p=(b.proveedor||"SinNombre").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,"").replace(/\s+/g,"-").substring(0,20).trim(),g=Math.round(b.monto_total||b.amount||0);let v="jpg";b.receiptUrl.includes(".pdf")?v="pdf":b.receiptUrl.includes(".png")&&(v="png");const E=`${String(x+1).padStart(3,"0")}_${k}_${p}_${g}DKK.${v}`;try{const $=await fetch(b.receiptUrl);if(!$.ok)throw new Error("Fetch failed");const I=await $.blob();c.file(E,I),i++,l+=`${String(x+1).padStart(3,"0")}. ${k} | ${p}
`,l+=`    Total: ${this.formatCurrency(b.monto_total||b.amount||0)} | IVA: ${this.formatCurrency(b.monto_iva||0)}
`,l+=`    Archivo: ${E}

`}catch($){console.warn(`Could not fetch receipt for ${b.proveedor}:`,$),d++,l+=`${String(x+1).padStart(3,"0")}. ${k} | ${p} - ⚠️ ERROR: No se pudo descargar

`}}c.file("_INDICE.txt",l);const u=await n.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}}),m=`${r}.zip`;saveAs(u,m),d>0?this.showToast(`⚠️ ZIP generado: ${i} OK, ${d} con error`):this.showToast(`✅ ZIP descargado: ${i} comprobantes`)}catch(n){console.error("ZIP generation error:",n),this.showToast("❌ Error al generar ZIP")}},async handleReceiptUpload(t){const e=t.files[0];if(!e)return;const s=document.getElementById("upload-placeholder"),o=document.getElementById("upload-preview"),n=document.getElementById("receipt-preview-img"),a=document.getElementById("receipt-filename"),r=document.getElementById("receipt-url");s.innerHTML='<i class="ph-duotone ph-spinner text-4xl text-brand-orange animate-spin mb-2"></i><p class="text-sm text-slate-500">Subiendo...</p>';try{this._pendingReceiptFile=e,this._pendingReceiptOriginalName=e.name;const c=e.name.split(".").pop().toLowerCase(),{structuredPath:l,structuredFilename:i}=this.generateReceiptPath(c),u=firebase.storage().ref().child(l);await u.put(e);const m=await u.getDownloadURL();if(r.value=m,document.getElementById("receipt-url").dataset.structuredPath=l,document.getElementById("receipt-url").dataset.structuredFilename=i,e.type.startsWith("image/"))n.src=URL.createObjectURL(e),n.classList.remove("hidden");else if(e.type==="application/pdf"){n.src="",n.classList.add("hidden");const x=n.parentNode.querySelector(".ph-file-pdf");x&&x.remove();const b=document.createElement("i");b.className="ph-duotone ph-file-pdf text-6xl text-red-500 mb-2 block mx-auto",n.parentNode.insertBefore(b,n)}a.textContent=i,s.classList.add("hidden"),o.classList.remove("hidden"),s.innerHTML=`
                <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                    Subir Factura/Recibo
                </p>
                <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
            `,this.showToast("✅ Archivo subido - procesando OCR..."),this.processReceiptOCR(m)}catch(c){console.error("Upload error details:",c),alert("Error al subir: "+c.message),s.innerHTML=`
                <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                    Subir Factura/Recibo
                </p>
                <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
            `,this.showToast("❌ Error: "+c.message)}},generateReceiptPath(t){var e,s;try{const o=new Date,n=o.getFullYear(),a=o.getMonth()+1,r=o.getDate(),c=((e=document.getElementById("expense-proveedor"))==null?void 0:e.value)||"Proveedor",l=((s=document.getElementById("expense-monto"))==null?void 0:s.value)||"0",i=c.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,"").replace(/\s+/g,"-").substring(0,20).trim()||"Proveedor",d=Math.round(parseFloat(l)||0)+"dkk",u=Math.random().toString(36).substring(2,7).toUpperCase(),x=`${`${n}-${String(a).padStart(2,"0")}-${String(r).padStart(2,"0")}`}_${i}_${d}_${u}.${t}`,b=`receipts/${x}`;return console.log("📁 Structured Receipt Path:",b),{structuredPath:b,structuredFilename:x}}catch(o){console.error("Error in generateReceiptPath:",o);const n=`receipt_${Date.now()}.${t}`;return{structuredPath:`receipts/${n}`,structuredFilename:n}}},async processReceiptOCR(t){var e,s;try{const o=document.getElementById("expense-form-title"),n=o.innerHTML;o.innerHTML='<i class="ph-duotone ph-scan text-brand-orange animate-pulse"></i> Escaneando recibo...';const a=new FormData;a.append("url",t),a.append("language","dan"),a.append("isOverlayRequired","false"),a.append("OCREngine","2"),a.append("scale","true"),a.append("isTable","false");const c=await(await fetch("https://api.ocr.space/parse/image",{method:"POST",headers:{apikey:be},body:a})).json();if(c.IsErroredOnProcessing)throw new Error(c.ErrorMessage||"OCR processing failed");const l=((s=(e=c.ParsedResults)==null?void 0:e[0])==null?void 0:s.ParsedText)||"";console.log("OCR Raw Text:",l);const i=this.parseReceiptText(l);this.autoFillExpenseForm(i),o.innerHTML='<i class="ph-duotone ph-check-circle text-green-500"></i> Datos extraídos - verifica';const d=Object.values(i).filter(u=>u).length;d>=3?this.showToast("✨ Datos extraídos correctamente"):d>0?this.showToast("⚠️ Algunos datos extraídos - completa manualmente"):(this.showToast("ℹ️ No se detectaron datos - ingresa manualmente"),o.innerHTML=n)}catch(o){console.error("OCR Error:",o),this.showToast("⚠️ OCR no disponible - ingresa datos manualmente");const n=document.getElementById("expense-form-title");n.innerHTML='<i class="ph-duotone ph-plus-circle text-brand-orange"></i> Nueva Compra'}},fileToBase64(t){return new Promise((e,s)=>{const o=new FileReader;o.onload=()=>e(o.result),o.onerror=s,o.readAsDataURL(t)})},parseReceiptText(t){const e={fecha:null,proveedor:null,monto_total:null,monto_iva:null},s=t.replace(/\r\n/g,`
`).replace(/\s+/g," "),o=t.split(/\r?\n/).map(i=>i.trim()).filter(i=>i),n=[/(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/,/(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2})/,/(\d{1,2}\.\s?\w+\.?\s?\d{2,4})/i];for(const i of n){const d=s.match(i);if(d){e.fecha=this.normalizeDate(d[1]);break}}const a=[/(?:i\s*alt|total|sum|totalt|att\s*betala)[:\s]*(\d+[.,]\d{2})/i,/(?:total|sum)[:\s]*(?:kr\.?|dkk)?\s*(\d+[.,]\d{2})/i,/(\d+[.,]\d{2})\s*(?:dkk|kr)/i];for(const i of a){const d=s.match(i);if(d){e.monto_total=parseFloat(d[1].replace(",","."));break}}const r=[/(?:moms|25%|heraf\s*moms)[:\s]*(\d+[.,]\d{2})/i,/(?:vat|iva|tax)[:\s]*(\d+[.,]\d{2})/i,/moms\s*(?:kr\.?|dkk)?\s*(\d+[.,]\d{2})/i];for(const i of r){const d=s.match(i);if(d){e.monto_iva=parseFloat(d[1].replace(",","."));break}}e.monto_total&&!e.monto_iva&&(e.monto_iva=Math.round(e.monto_total*.2*100)/100);const c=["kvittering","receipt","bon","faktura","invoice","kopi","copy"];for(const i of o.slice(0,5)){const d=i.trim();if(d.length>2&&d.length<50&&!c.some(u=>d.toLowerCase().includes(u))&&!/^\d+$/.test(d)&&!/^[\d\s\-\/\.]+$/.test(d)){e.proveedor=d;break}}const l=s.match(/(?:cvr|org\.?\s*nr)[:\s]*(\d{8})/i);if(l&&o.length>0){const i=o.findIndex(d=>d.includes(l[0]));i>0&&!e.proveedor&&(e.proveedor=o[i-1])}return console.log("Parsed Receipt Data:",e),e},normalizeDate(t){try{const s=t.replace(/\s/g,"").replace(/[\.\/]/g,"-").split("-");if(s.length>=3){let o,n,a;return s[0].length===4?[a,n,o]=s:([o,n,a]=s,a.length===2&&(a="20"+a)),o=o.padStart(2,"0"),n=n.padStart(2,"0"),`${a}-${n}-${o}`}}catch{console.warn("Date normalization failed:",t)}return null},autoFillExpenseForm(t){if(t.fecha){const e=document.getElementById("expense-fecha");e&&(e.value=t.fecha,this.highlightAutoFilled(e))}if(t.proveedor){const e=document.getElementById("expense-proveedor");e&&(e.value=t.proveedor,this.highlightAutoFilled(e))}if(t.monto_total){const e=document.getElementById("expense-monto");e&&(e.value=t.monto_total.toFixed(2),this.highlightAutoFilled(e))}if(t.monto_iva){const e=document.getElementById("expense-iva");e&&!e.disabled&&(e.value=t.monto_iva.toFixed(2),this.highlightAutoFilled(e))}},highlightAutoFilled(t){t.classList.add("ring-2","ring-green-400","bg-green-50");const e=()=>{t.classList.remove("ring-2","ring-green-400","bg-green-50"),t.removeEventListener("focus",e)};t.addEventListener("focus",e),setTimeout(e,5e3)},clearReceiptUpload(){document.getElementById("receipt-file").value="",document.getElementById("receipt-url").value="",document.getElementById("upload-placeholder").classList.remove("hidden"),document.getElementById("upload-preview").classList.add("hidden"),document.getElementById("receipt-preview-img").src="",document.getElementById("receipt-filename").textContent=""},renderConsignments(t){if(!t)return;const e=`
    <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6 animate-fadeIn" >
                                                                    <div class="flex justify-between items-center mb-8">
                                                                        <h2 class="font-display text-2xl font-bold text-brand-dark">Socios y Consignación</h2>
                                                                        <button onclick="app.openAddConsignorModal()" class="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                                            <i class="ph-bold ph-plus"></i>
                                                                            Nuevo Socio
                                                                        </button>
                                                                    </div>

                                                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        ${this.state.consignors.map(s=>{const o=s.name,a=this.state.inventory.filter(d=>d.owner===o).reduce((d,u)=>d+u.stock,0),r=[];this.state.sales.forEach(d=>{(d.items||[]).filter(m=>{if((m.owner||"").toLowerCase()===o.toLowerCase())return!0;const x=this.state.inventory.find(b=>b.id===(m.productId||m.recordId));return x&&(x.owner||"").toLowerCase()===o.toLowerCase()}).forEach(m=>{const x=Number(m.priceAtSale||m.unitPrice||0),b=s.agreementSplit||s.split||70,y=x*b/100;r.push({...m,id:d.id,date:d.date,cost:m.costAtSale||m.cost||y,payoutStatus:d.payoutStatus||"pending",payoutDate:d.payoutDate||null})}),(!d.items||d.items.length===0)&&(d.owner||"").toLowerCase()===o.toLowerCase()&&r.push({...d,album:d.album||d.sku||"Record",cost:d.cost||(Number(d.total)||0)*(s.agreementSplit||70)/100})}),r.sort((d,u)=>new Date(u.date)-new Date(d.date)),r.reduce((d,u)=>d+(Number(u.qty||u.quantity)||1),0);const c=r.reduce((d,u)=>d+(Number(u.cost)||0),0),l=r.filter(d=>d.payoutStatus==="paid").reduce((d,u)=>d+(Number(u.cost)||0),0),i=c-l;return`
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
                                    <p class="font-display font-bold text-xl ${i>0?"text-brand-orange":"text-slate-500"}">${this.formatCurrency(i)}</p>
                                </div>
                            </div>

                            <div class="border-t border-slate-100 pt-4">
                                <div class="flex justify-between items-center mb-4">
                                    <h4 class="font-bold text-sm text-brand-dark">Historial de Ventas</h4>
                                    <span class="text-xs text-slate-500 font-medium">Pagado: ${this.formatCurrency(l)}</span>
                                </div>
                                <div class="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                    ${r.length>0?r.map(d=>`
                                        <div class="flex items-center justify-between p-3 rounded-xl border ${d.payoutStatus==="paid"?"bg-slate-50 border-slate-100 opacity-60":"bg-white border-orange-100 shadow-sm"} transition-all">
                                            <div class="flex-1 min-w-0 pr-3">
                                                <div class="font-bold text-xs truncate text-brand-dark">${d.album||d.sku}</div>
                                                <div class="text-[10px] text-slate-400">${this.formatDate(d.date)} • ${this.formatCurrency(d.cost)}</div>
                                                ${d.payoutStatus==="paid"&&d.payoutDate?`<div class="text-[9px] text-green-600 font-bold mt-0.5"><i class="ph-bold ph-check"></i> Pagado: ${this.formatDate(d.payoutDate)}</div>`:""}
                                            </div>
                                            <button 
                                                onclick="app.togglePayoutStatus('${d.id}', '${d.payoutStatus||"pending"}')"
                                                class="shrink-0 h-8 px-3 rounded-lg text-[10px] font-bold border transition-colors ${d.payoutStatus==="paid"?"bg-slate-200 border-slate-300 text-slate-500 hover:bg-slate-300":"bg-green-100 border-green-200 text-green-700 hover:bg-green-200"}"
                                            >
                                                ${d.payoutStatus==="paid"?"PAGADO":"PAGAR"}
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
    `;t.innerHTML=e},togglePayoutStatus(t,e){if(!confirm(`¿Marcar esta venta como ${e==="paid"?"PENDIENTE":"PAGADA"}?`))return;(e==="paid"?"pending":"paid")==="paid"&&new Date().toISOString(),console.warn("updateSaleStatus not yet migrated to API"),this.showToast("Esta función aún no está migrada al nuevo backend")},openAddConsignorModal(){document.body.insertAdjacentHTML("beforeend",`
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

`)},handleAddConsignor(t){t.preventDefault();const e=new FormData(t.target),s={name:e.get("name"),agreementSplit:parseFloat(e.get("split")),email:e.get("email"),phone:e.get("phone")};D.collection("consignors").add(s).then(()=>{this.showToast("✅ Socio registrado correctamente"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>{console.error(o),this.showToast("❌ Error al crear socio: "+o.message,"error")})},deleteConsignor(t){confirm("¿Eliminar este socio?")&&D.collection("consignors").doc(t).delete().then(()=>{this.showToast("✅ Socio eliminado"),this.loadData()}).catch(e=>{console.error(e),this.showToast("❌ Error al eliminar socio: "+e.message,"error")})},saveData(){try{const t={};localStorage.setItem("el-cuartito-settings",JSON.stringify(t))}catch(t){console.error("Error saving settings:",t)}},searchDiscogs(){const t=document.getElementById("discogs-search-input").value,e=document.getElementById("discogs-results");if(t){if(e.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Buscando en Discogs...</p>',e.classList.remove("hidden"),/^\d+$/.test(t.trim())){this.fetchDiscogsById(t.trim());return}fetch(`${M}/discogs/search?q=${encodeURIComponent(t)}`).then(s=>{if(!s.ok)throw new Error(`Error ${s.status}`);return s.json()}).then(s=>{const o=s.results||[];o.length>0?e.innerHTML=o.slice(0,10).map(n=>`
                        <div onclick='app.handleDiscogsSelection(${JSON.stringify(n).replace(/'/g,"&#39;")})' class="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-brand-orange hover:shadow-sm transition-all">
                            <img src="${n.thumb||"logo.jpg"}" class="w-12 h-12 rounded object-cover bg-slate-100 flex-shrink-0">
                            <div class="flex-1 min-w-0">
                                <p class="font-bold text-xs text-brand-dark leading-tight mb-1">${n.title}</p>
                                <p class="text-[10px] text-slate-500">${n.year||"?"} · ${n.format?n.format.join(", "):"Vinyl"} · ${n.country||""}</p>
                                <p class="text-[10px] text-slate-400">${n.label?n.label[0]:""}</p>
                            </div>
                            <i class="ph-bold ph-plus-circle text-brand-orange text-lg flex-shrink-0"></i>
                        </div>
                    `).join(""):e.innerHTML='<p class="text-xs text-slate-400 p-2">No se encontraron resultados.</p>'}).catch(s=>{console.error(s),e.innerHTML=`
                    <div class="text-center py-4 px-3">
                        <p class="text-xs text-red-500 font-bold mb-2">❌ ${s.message}</p>
                        <p class="text-[10px] text-slate-400">Hubo un error al buscar en Discogs a través del servidor.</p>
                    </div>
                `})}},resyncMusic(){["input-discogs-id","input-discogs-release-id","input-discogs-url","input-cover-image"].forEach(o=>{const n=document.getElementById(o);n&&(n.value="")});const t=document.querySelector('input[name="artist"]').value,e=document.querySelector('input[name="album"]').value,s=document.getElementById("discogs-search-input");s&&t&&e?(s.value=`${t} - ${e}`,this.searchDiscogs(),this.showToast("✅ Música desvinculada. Selecciona una nueva edición.","success")):this.showToast("⚠️ Falta Artista o Álbum para buscar.","error")},handleDiscogsSelection(t){const e=t.title.split(" - "),s=e[0]||"",o=e.slice(1).join(" - ")||t.title,n=document.querySelector("#modal-overlay form");if(!n)return;if(n.artist&&(n.artist.value=s),n.album&&(n.album.value=o),n.year&&t.year&&(n.year.value=t.year),n.label&&t.label&&t.label.length>0&&(n.label.value=t.label[0]),t.thumb||t.cover_image){const r=t.cover_image||t.thumb,c=document.getElementById("input-cover-image"),l=document.getElementById("cover-preview");c&&(c.value=r),l&&(l.querySelector("img").src=r,l.classList.remove("hidden"))}const a=document.getElementById("input-discogs-release-id");if(a&&t.id&&(a.value=t.id),t.id)this.showToast("⏳ Cargando géneros...","info"),fetch(`${M}/discogs/release/${t.id}`).then(r=>r.json()).then(r=>{console.log("Full Discogs Release:",r);const c=[...r.styles||[],...r.genres||[]];console.log("ALL Genres/Styles from full release:",c);const l=[...new Set(c)];if(l.length>0){const b=n.querySelector('select[name="genre"]'),y=n.querySelector('select[name="genre2"]'),k=n.querySelector('select[name="genre3"]'),p=n.querySelector('select[name="genre4"]'),g=n.querySelector('select[name="genre5"]'),v=[b,y,k,p,g];l.slice(0,5).forEach((E,$)=>{if(v[$]){let I=!1;for(let S of v[$].options)if(S.value===E){v[$].value=E,I=!0;break}if(!I){const S=document.createElement("option");S.value=E,S.text=E,S.selected=!0,v[$].add(S)}}}),this.showToast(`✅ ${l.length} géneros cargados`,"success")}if(r.images&&r.images.length>0){const b=r.images[0].uri,y=document.getElementById("input-cover-image"),k=document.getElementById("cover-preview");y&&(y.value=b),k&&(k.querySelector("img").src=b)}const i=document.getElementById("tracklist-preview"),d=document.getElementById("tracklist-preview-content");i&&d&&r.tracklist&&r.tracklist.length>0&&(d.innerHTML=r.tracklist.map(b=>`
                            <div class="flex items-center gap-2 py-1 border-b border-slate-100 last:border-0">
                                <span class="text-[10px] font-mono text-slate-400 w-6">${b.position||""}</span>
                                <span class="flex-1">${b.title}</span>
                                <span class="text-[10px] text-slate-400">${b.duration||""}</span>
                            </div>
                        `).join(""),i.classList.remove("hidden"));const u=document.getElementById("price-suggestions-preview"),m=document.getElementById("price-suggestions-content"),x=document.getElementById("discogs-release-link");if(x&&r.uri){const b=r.uri.startsWith("http")?r.uri:"https://www.discogs.com"+r.uri;x.href=b,x.classList.remove("hidden")}u&&m&&(m.innerHTML='<div class="col-span-2 text-[10px] text-slate-400 animate-pulse">Consultando mercado...</div>',u.classList.remove("hidden"),fetch(`${M}/discogs/price-suggestions/${t.id}`).then(y=>y.json()).then(y=>{if(y.success&&y.suggestions){const k=y.suggestions,p=k.currency==="DKK"?" kr.":k.currency==="USD"?" $":" "+k.currency,g=(v,E)=>{const $=k[E];return`
                                            <div class="bg-white p-2 rounded-lg border border-brand-orange/10">
                                                <span class="text-[9px] text-slate-400 block leading-none mb-1">${v}</span>
                                                <span class="font-bold text-brand-dark">${$?$.value.toFixed(0)+p:"N/A"}</span>
                                            </div>
                                        `};m.innerHTML=`
                                        ${g("Mint (M)","Mint (M)")}
                                        ${g("Near Mint (NM)","Near Mint (NM or M-)")}
                                        ${g("Very Good Plus (VG+)","Very Good Plus (VG+)")}
                                        ${g("Very Good (VG)","Very Good (VG)")}
                                    `}else m.innerHTML='<div class="col-span-2 text-[10px] text-slate-400">Precios no disponibles para este release</div>'}).catch(y=>{console.error("Price suggestion error:",y),m.innerHTML='<div class="col-span-2 text-[10px] text-red-400 italic">Error al consultar precios</div>'}))}).catch(r=>{console.error("Error fetching full release:",r),this.showToast("⚠️ No se pudieron cargar todos los géneros","warning")});else{const r=[...t.style||[],...t.genre||[]];console.log("Fallback Genres (limited, no token):",r);const c=[...new Set(r)];if(c.length>0){const l=n.querySelector('select[name="genre"]');if(l){const i=c[0];let d=!1;for(let u of l.options)if(u.value===i){l.value=i,d=!0;break}if(!d){const u=document.createElement("option");u.value=i,u.text=i,u.selected=!0,l.add(u)}}}}if(t.uri||t.resource_url){const r=t.uri||t.resource_url,c=r.startsWith("http")?r:"https://www.discogs.com"+r,l=document.getElementById("input-discogs-url");l&&(l.value=c)}if(t.id){const r=document.getElementById("input-discogs-id");r&&(r.value=t.id)}document.getElementById("discogs-results").classList.add("hidden")},openTracklistModal(t){const e=this.state.inventory.find(a=>a.sku===t);if(!e)return;let s=e.discogsId;document.body.insertAdjacentHTML("beforeend",`
                                                                <div id="tracklist-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-fadeIn">
                                                                        <h3 class="font-display text-xl font-bold text-brand-dark mb-4">Lista de Temas (Tracklist)</h3>
                                                                        <div class="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                                                            <i class="ph-bold ph-spinner animate-spin text-4xl text-brand-orange"></i>
                                                                            <p class="font-medium">Cargando tracks desde Discogs...</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `);const n=a=>{fetch(`${M}/discogs/release/${a}`).then(r=>{if(!r.ok)throw new Error("Release not found");return r.json()}).then(r=>{const c=r.tracklist||[],l=c.map(d=>`
                                                                <div class="flex items-center justify-between py-3 border-b border-slate-50 hover:bg-slate-50 px-2 transition-colors rounded-lg group">
                                                                    <div class="flex items-center gap-3">
                                                                        <span class="text-xs font-mono font-bold text-slate-400 w-8">${d.position}</span>
                                                                        <span class="text-sm font-bold text-brand-dark group-hover:text-brand-orange transition-colors">${d.title}</span>
                                                                    </div>
                                                                    <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">${d.duration||"--:--"}</span>
                                                                </div>
                                                                `).join(""),i=`
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
                                                                        ${c.length>0?l:'<p class="text-center text-slate-500 py-8">No se encontraron temas para esta edición.</p>'}
                                                                    </div>
                                                                    <div class="p-3 bg-slate-50 text-center shrink-0 border-t border-slate-100">
                                                                        <a href="https://www.discogs.com/release/${a}" target="_blank" class="text-xs font-bold text-brand-orange hover:underline flex items-center justify-center gap-1">
                                                                            Ver release completo en Discogs <i class="ph-bold ph-arrow-square-out"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                `;document.getElementById("tracklist-overlay").innerHTML=i}).catch(r=>{console.error(r),document.getElementById("tracklist-overlay").innerHTML=`
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
                                                                `})};if(s)n(s);else{const a=`${e.artist} - ${e.album}`;fetch(`${M}/discogs/search?q=${encodeURIComponent(a)}`).then(r=>r.json()).then(r=>{if(r.results&&r.results.length>0)n(r.results[0].id);else throw new Error("No results found in fallback search")}).catch(()=>{document.getElementById("tracklist-overlay").innerHTML=`
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
                    `})}},renderDiscogsSales(t){const e=this.state.sales.filter(l=>l.channel==="discogs"),s=l=>parseFloat(l.total)||0,o=l=>parseFloat(l.originalTotal)||parseFloat(l.total)+(parseFloat(l.discogsFee||0)+parseFloat(l.paypalFee||0)),n=l=>o(l)-s(l),a=e.reduce((l,i)=>l+s(i),0),r=e.reduce((l,i)=>l+n(i),0),c=e.reduce((l,i)=>{const d=s(i);let u=0;return i.items&&Array.isArray(i.items)&&(u=i.items.reduce((m,x)=>{const b=parseFloat(x.costAtSale||0),y=parseInt(x.qty||x.quantity)||1;return m+b*y},0)),l+(d-u)},0);t.innerHTML=`
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
                            <div class="text-2xl font-bold text-red-600">${this.formatCurrency(r)}</div>
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
                            <div class="text-2xl font-bold text-green-600">${this.formatCurrency(c)}</div>
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
                                ${e.map(l=>{var d;const i=(d=l.timestamp)!=null&&d.toDate?l.timestamp.toDate():l.date?new Date(l.date):new Date(0);return{...l,_sortDate:i.getTime()}}).sort((l,i)=>i._sortDate-l._sortDate).map(l=>{var b;const i=(b=l.timestamp)!=null&&b.toDate?l.timestamp.toDate():new Date(l.date),d=l.items&&l.items[0],u=l.originalTotal||l.total+(l.discogsFee||0)+(l.paypalFee||0);l.discogsFee,l.paypalFee;const m=l.total,x=l.status==="pending_review"||l.needsReview;return`
                                        <tr class="border-b border-slate-50 hover:bg-purple-50/30 transition-colors cursor-pointer ${x?"bg-orange-50/50":""}" onclick="app.openUnifiedOrderDetailModal('${l.id}')">
                                            <td class="px-6 py-4 text-sm text-slate-600">${i.toLocaleDateString("es-ES")}</td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[200px]">${(d==null?void 0:d.album)||"Producto"}</div>
                                                <div class="text-xs text-slate-500">${(d==null?void 0:d.artist)||"-"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-xs text-slate-500">Precio Lista: <span class="font-bold text-slate-700">${this.formatCurrency(u)}</span></div>
                                                ${l.discogs_order_id?`<div class="text-[10px] text-purple-600 font-medium">Order: ${l.discogs_order_id}</div>`:""}
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-[10px] text-red-500 font-bold">Total Fees: -${this.formatCurrency(u-m)}</div>
                                                <div class="text-[10px] text-slate-400 font-medium">
                                                    ${u>0?`(${((u-m)/u*100).toFixed(1)}%)`:""}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm font-bold text-brand-dark">${this.formatCurrency(m)}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="flex flex-col gap-2">
                                                    ${x?`
                                                        <span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider text-center">Pendiente</span>
                                                    `:`
                                                        <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider text-center">Confirmado</span>
                                                    `}
                                                    <button onclick="app.openUpdateSaleValueModal('${l.id}', ${u}, ${m})" class="w-full py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1">
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
        `;document.body.insertAdjacentHTML("beforeend",s)},calculateModalFee(t,e){const s=parseFloat(t)||0,o=e-s,n=e>0?o/e*100:0,a=document.getElementById("modal-fee-display"),r=document.getElementById("modal-fee-value");if(o>0){a.classList.remove("hidden"),r.innerText=`- kr. ${o.toFixed(2)}`;const c=document.getElementById("modal-fee-percent");c&&(c.innerText=`${n.toFixed(1)}%`)}else a.classList.add("hidden")},async handleSaleValueUpdate(t,e,s){t.preventDefault();const n=new FormData(t.target).get("netReceived"),a=document.getElementById("update-sale-submit-btn");if(n){a.disabled=!0,a.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Guardando...';try{const r=M,c=await H.currentUser.getIdToken(),l=await fetch(`${r}/firebase/sales/${e}/value`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify({netReceived:n})}),i=l.headers.get("content-type");if(!i||!i.includes("application/json")){const u=await l.text();throw console.error("Non-JSON response received:",u),new Error(`Server returned non-JSON response (${l.status})`)}const d=await l.json();if(d.success)this.showToast("✅ Venta actualizada y fee registrado"),document.getElementById("update-sale-modal").remove(),await this.loadData(),this.refreshCurrentView();else throw new Error(d.error||"Error al actualizar")}catch(r){console.error("Update sale error:",r),this.showToast(`❌ Error: ${r.message}`),a.disabled=!1,a.innerText="Confirmar Ajuste"}}},renderPickups(t){const e=this.state.sales.filter(r=>{var c;return r.channel==="online"&&(((c=r.shipping_method)==null?void 0:c.id)==="local_pickup"||r.shipping_cost===0&&r.status!=="failed")}),s=e.filter(r=>r.status==="completed"||r.status==="paid"||r.status==="paid_pending"),o=e.filter(r=>r.status==="ready_for_pickup"),n=e.filter(r=>r.status==="shipped"||r.status==="delivered"||r.status==="picked_up"),a=`
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
                                `:s.map(r=>{var c,l;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${r.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${r.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${((c=r.customer)==null?void 0:c.name)||r.customerName||"Cliente"}</td>
                                        <td class="p-4 text-xs text-slate-500">${((l=r.items)==null?void 0:l.length)||0} items</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate(r.date)}</td>
                                        <td class="p-4 text-center" onclick="event.stopPropagation()">
                                            <button onclick="app.setReadyForPickup('${r.id}')" class="bg-brand-dark text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto">
                                                <i class="ph-bold ph-bell"></i> Notificar Listo
                                            </button>
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
                                `:o.map(r=>{var c,l;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${r.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${r.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${((c=r.customer)==null?void 0:c.name)||r.customerName||"Cliente"}</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate((l=r.updated_at)!=null&&l.toDate?r.updated_at.toDate():r.updated_at||r.date)}</td>
                                        <td class="p-4 text-center" onclick="event.stopPropagation()">
                                            <button onclick="app.markAsDelivered('${r.id}')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto">
                                                <i class="ph-bold ph-hand-tap"></i> Ya lo Retiró
                                            </button>
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
                                ${n.slice(0,10).map(r=>`
                                    <tr>
                                        <td class="p-4 text-sm font-medium text-slate-400">#${r.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm text-slate-500">${r.customerName||"Cliente"}</td>
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
        `;t.innerHTML=a},async setReadyForPickup(t){var e;try{const s=(e=event==null?void 0:event.target)==null?void 0:e.closest("button");if(s&&(s.disabled=!0),(await fetch(`${M}/shipping/ready-for-pickup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t})})).ok)this.showToast("✅ Cliente notificado - El pedido está listo para retiro"),await this.loadData(),this.refreshCurrentView();else throw new Error("Error al notificar")}catch(s){this.showToast("❌ error: "+s.message,"error")}},async markAsDelivered(t){var e;try{const s=(e=event==null?void 0:event.target)==null?void 0:e.closest("button");s&&(s.disabled=!0),await D.collection("sales").doc(t).update({status:"picked_up",fulfillment_status:"delivered",picked_up_at:firebase.firestore.FieldValue.serverTimestamp(),updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast("✅ Pedido retirado correctamente"),await this.loadData(),this.refreshCurrentView()}catch(s){this.showToast("❌ Error: "+s.message,"error")}},async deleteExpenseVAT(t){const e=this.state.expenses.find(s=>s.id===t);if(e!=null&&e.receiptUrl){if(!confirm(`⚠️ ATENCIÓN: Este gasto tiene un recibo adjunto.

¿Estás seguro de que quieres eliminarlo?`))return;if(!confirm(`🔒 CONFIRMACIÓN LEGAL REQUERIDA

La ley exige guardar documentos contables durante 5 AÑOS.

Fecha del gasto: `+(e.fecha_factura||e.date||"Desconocida")+`
Proveedor: `+(e.proveedor||"Sin nombre")+`
Monto: `+this.formatCurrency(e.monto_total||e.amount||0)+`

¿CONFIRMAS que deseas eliminar permanentemente este registro y su recibo?`)){this.showToast("ℹ️ Eliminación cancelada");return}}else if(!confirm("¿Estás seguro de que quieres eliminar este gasto?"))return;try{await D.collection("expenses").doc(t).delete(),this.showToast("✅ Gasto eliminado"),this.loadData()}catch(s){console.error("Error deleting expense:",s),this.showToast("❌ Error al eliminar gasto")}},renderVATReport(t){const e=new Date,s=Math.floor(e.getMonth()/3)+1,o=e.getFullYear(),n=this.state.vatReportQuarter||s,a=this.state.vatReportYear||o,r=(n-1)*3,c=new Date(a,r,1),l=new Date(a,r+3,0,23,59,59),i=this.state.sales.filter(f=>{var R;const C=(R=f.timestamp)!=null&&R.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date);return C>=c&&C<=l});let d=[],u=[],m=[],x=0,b=0,y=0,k=0;i.forEach(f=>{var J;const C=(J=f.timestamp)!=null&&J.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date);(f.items||[]).forEach(P=>{const N=P.priceAtSale||P.price||0;let G=P.costAtSale||P.cost||0;const Q=P.productId||P.recordId,Z=P.album;if(G===0){const j=this.state.inventory.find(A=>Q&&(A.id===Q||A.sku===Q)||Z&&A.album===Z);j&&(G=j.cost||0)}const h=P.qty||P.quantity||1,w=P.productCondition||"Second-hand",L=N*h,O=G*h;if(w==="New"){const j=L*.2;x+=j,d.push({date:C,productId:P.productId||P.album||"N/A",album:P.album||"N/A",salePrice:L,vat:j})}else{const j=L-O,A=j>0?j*.2:0;b+=A,u.push({date:C,productId:P.productId||P.album||"N/A",album:P.album||"N/A",cost:O,salePrice:L,margin:j,vat:A})}});const V=parseFloat(f.shipping_income||f.shipping||f.shipping_cost||0);if(V>0){const P=V*.2;y+=P,k+=V,m.push({date:C,orderId:f.orderNumber||(f.id&&typeof f.id=="string"?f.id.slice(-8):"N/A"),income:V,vat:P})}});const p=x+b+y,g=this.state.expenses.filter(f=>{var V;const C=f.fecha_factura?new Date(f.fecha_factura):(V=f.timestamp)!=null&&V.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date);return(f.categoria_tipo==="operativo"||f.categoria_tipo==="stock_nuevo"||f.is_vat_deductible)&&C>=c&&C<=l}),v=g.filter(f=>f.categoria!=="envios"),E=g.filter(f=>f.categoria==="envios"),$=v.reduce((f,C)=>f+(parseFloat(C.monto_iva)||0),0),I=E.reduce((f,C)=>f+(parseFloat(C.monto_iva)||0),0);E.reduce((f,C)=>f+(parseFloat(C.monto_total)||0),0);const S=$+I,_=p-S,T={1:`1 de junio, ${a}`,2:`1 de septiembre, ${a}`,3:`1 de diciembre, ${a}`,4:`1 de marzo, ${a+1}`}[n],z=`
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
                                <span class="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Pendiente</span>
                            </div>
                            <p class="text-xs text-slate-400 uppercase font-bold tracking-wider mt-0.5">Régimen de IVA Dinamarca</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div class="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                            <select id="vat-quarter-select" onchange="app.updateVATQuarter()" class="bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600 outline-none cursor-pointer">
                                <option value="1" ${n===1?"selected":""}>Q1 ${a}</option>
                                <option value="2" ${n===2?"selected":""}>Q2 ${a}</option>
                                <option value="3" ${n===3?"selected":""}>Q3 ${a}</option>
                                <option value="4" ${n===4?"selected":""}>Q4 ${a}</option>
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
                    <div class="${_>0?"bg-red-50 border-red-100":"bg-emerald-50 border-emerald-100"} rounded-3xl p-8 border shadow-sm relative overflow-hidden group">
                        <p class="${_>0?"text-red-700/60":"text-emerald-700/60"} text-xs font-bold uppercase tracking-widest mb-4">Moms Tilsvar</p>
                        <p class="text-4xl font-display font-bold mb-2 ${_>0?"text-red-700":"text-emerald-700"}">${this.formatCurrency(_)}</p>
                        <p class="text-[11px] ${_>0?"text-red-600/70":"text-emerald-600/70"} mt-4 italic font-medium">
                            <i class="ph-bold ph-calendar"></i> Límite de pago: ${T}
                        </p>
                    </div>

                    <!-- Tarjeta B: Salgsmoms (IVA Recaudado) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Salgsmoms</p>
                            <span class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-bold ph-arrow-up-right"></i></span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(p)}</p>
                        <p class="text-[11px] text-slate-400 mt-4 leading-relaxed font-medium">IVA generado por Ventas + Envíos Cobrados.</p>
                    </div>

                    <!-- Tarjeta C: Købsmoms (IVA Deducible) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Købsmoms</p>
                            <span class="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-xl shadow-inner"><i class="ph-bold ph-arrow-down-left"></i></span>
                        </div>
                        <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(S)}</p>
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
                                        <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Monto: ${this.formatCurrency(d.reduce((f,C)=>f+C.salePrice,0))}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-lg font-bold text-blue-600">${this.formatCurrency(x)}</p>
                                        <p class="text-[10px] text-slate-400 font-bold">IVA (25%)</p>
                                    </div>
                                </div>
                                <div class="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div class="h-full bg-blue-500 rounded-full" style="width: ${p>0?x/p*100:0}%"></div>
                                </div>

                                <!-- Margin Scheme Sales -->
                                <div class="pt-4 border-t border-slate-50">
                                    <div class="flex items-center justify-between mb-1">
                                        <div>
                                            <p class="font-bold text-brand-dark">Régimen Margen (Usados)</p>
                                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Margen total: ${this.formatCurrency(u.reduce((f,C)=>f+C.margin,0))}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-amber-600">${this.formatCurrency(b)}</p>
                                            <p class="text-[10px] text-slate-400 font-bold">IVA s/Margen</p>
                                        </div>
                                    </div>
                                    ${u.some(f=>f.margin<0)?`
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
                                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Total cobrado: ${this.formatCurrency(k)}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-indigo-500">${this.formatCurrency(y)}</p>
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
                                        <p class="text-2xl font-display font-bold ${y-I>=0?"text-emerald-400":"text-red-400"}">
                                            ${this.formatCurrency(y-I)}
                                        </p>
                                    </div>
                                    <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">
                                        <i class="ph-bold ph-scales"></i>
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex justify-between text-xs">
                                        <span class="text-slate-400 italic">IVA Cobrado (Ingreso)</span>
                                        <span class="font-bold text-emerald-400">+ ${this.formatCurrency(y)}</span>
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
                                ${Object.entries(v.reduce((f,C)=>{const R=C.categoria||"otros";return f[R]=(f[R]||0)+(parseFloat(C.monto_iva)||0),f},{})).sort((f,C)=>C[1]-f[1]).map(([f,C])=>`
                                    <div class="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <i class="ph-bold ph-tag"></i>
                                            </div>
                                            <span class="font-bold text-slate-600 capitalize text-sm">${f.replace("_"," ")}</span>
                                        </div>
                                        <span class="font-bold text-slate-900 text-sm">${this.formatCurrency(C)}</span>
                                    </div>
                                `).join("")||`
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
                                    ${d.length>0?d.map(f=>`
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-slate-500 tabular-nums">${f.date.toLocaleDateString("es-DK")}</td>
                                            <td class="px-6 py-4 font-bold text-brand-dark">${f.album}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-600">${this.formatCurrency(f.salePrice)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-blue-600">${this.formatCurrency(f.vat)}</td>
                                        </tr>
                                    `).join(""):`
                                        <tr><td colspan="4" class="px-6 py-12 text-center text-slate-400 italic">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-slate-50/30 font-bold">
                                    <tr class="text-brand-dark">
                                        <td colspan="3" class="px-6 py-4 text-right text-xs uppercase tracking-wider">Total IVA Estándar:</td>
                                        <td class="px-6 py-4 text-right text-lg text-blue-600">${this.formatCurrency(x)}</td>
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
                                    ${u.length>0?u.map(f=>`
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-slate-500 tabular-nums">${f.date.toLocaleDateString("es-DK")}</td>
                                            <td class="px-6 py-4 font-bold text-brand-dark">${f.album}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-400">${this.formatCurrency(f.cost)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-600">${this.formatCurrency(f.salePrice)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums ${f.margin>0?"text-emerald-600":"text-red-500"}">${this.formatCurrency(f.margin)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-amber-600">${this.formatCurrency(f.vat)}</td>
                                        </tr>
                                    `).join(""):`
                                        <tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 italic">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-slate-50/30 font-bold">
                                    <tr class="text-brand-dark">
                                        <td colspan="5" class="px-6 py-4 text-right text-xs uppercase tracking-wider">Total IVA Margen:</td>
                                        <td class="px-6 py-4 text-right text-lg text-amber-600">${this.formatCurrency(b)}</td>
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
                                    ${m.length>0?m.map(f=>`
                                        <tr class="hover:bg-slate-50/50 transition-colors">
                                            <td class="px-6 py-4 text-slate-500 tabular-nums">${f.date.toLocaleDateString("es-DK")}</td>
                                            <td class="px-6 py-4 font-bold text-brand-dark">#${f.orderId}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-slate-600">${this.formatCurrency(f.income)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-blue-600">${this.formatCurrency(f.vat)}</td>
                                        </tr>
                                    `).join(""):`
                                        <tr><td colspan="4" class="px-6 py-12 text-center text-slate-400 italic">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-slate-50/30 font-bold">
                                    <tr class="text-brand-dark">
                                        <td colspan="3" class="px-6 py-4 text-right text-xs uppercase tracking-wider">Total IVA Envíos:</td>
                                        <td class="px-6 py-4 text-right text-lg text-blue-600">${this.formatCurrency(y)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;t.innerHTML=z},updateVATQuarter(){const t=parseInt(document.getElementById("vat-quarter-select").value),e=parseInt(document.getElementById("vat-year-select").value);this.state.vatReportQuarter=t,this.state.vatReportYear=e,this.renderVATReport(document.getElementById("app-content"))},downloadVATAuditReport(){const t=new Date,e=Math.floor(t.getMonth()/3)+1,s=t.getFullYear(),o=this.state.vatReportQuarter||e,n=this.state.vatReportYear||s,a=(o-1)*3,r=new Date(n,a,1),c=new Date(n,a+3,0,23,59,59),l=this.state.sales.filter(p=>{var v;const g=(v=p.timestamp)!=null&&v.toDate?p.timestamp.toDate():new Date(p.timestamp||p.date);return g>=r&&g<=c}),i=[];let d=1;l.forEach(p=>{var I;const g=(I=p.timestamp)!=null&&I.toDate?p.timestamp.toDate():new Date(p.timestamp||p.date),v=g.toISOString().slice(0,10).replace(/-/g,"");(p.items||[]).forEach(S=>{const _=S.priceAtSale||S.price||0;let F=S.costAtSale||S.cost||0;const T=S.productId||S.recordId,K=S.album;if(F===0){const N=this.state.inventory.find(G=>T&&(G.id===T||G.sku===T)||K&&G.album===K);N&&(F=N.cost||0)}const W=S.qty||S.quantity||1,f=(S.productCondition||"Second-hand")==="New",C=_*W,R=F*W;let V,J;if(f)V=C,J=C*.2;else{const N=C-R;V=N>0?N:0,J=N>0?N*.2:0}const P=`ECR-${v}-${String(d).padStart(4,"0")}`;d++,i.push({transactionId:P,date:g.toISOString().slice(0,10),productName:`${S.album||"N/A"} - ${S.artist||"N/A"}`,sku:S.sku||T||"N/A",condition:f?"New":"Second-hand",costPrice:R.toFixed(2),salesPrice:C.toFixed(2),calculationBasis:V.toFixed(2),outputVAT:J.toFixed(2)})});const $=parseFloat(p.shipping_income||p.shipping||p.shipping_cost||0);if($>0){const S=`ECR-SHIP-${v}-${String(d).padStart(4,"0")}`;d++,i.push({transactionId:S,date:g.toISOString().slice(0,10),productName:`Envío - Orden: ${p.orderNumber||(p.id&&typeof p.id=="string"?p.id.slice(-8):"N/A")}`,sku:"SHIPPING",condition:"Service",costPrice:"0.00",salesPrice:$.toFixed(2),calculationBasis:$.toFixed(2),outputVAT:($*.2).toFixed(2)})}});const m=[["Transaction ID","Date","Product Name","SKU","Condition","Cost Price (DKK)","Sales Price (DKK)","Calculation Basis (DKK)","Output VAT / Salgsmoms (DKK)"].join(","),...i.map(p=>[p.transactionId,p.date,`"${p.productName.replace(/"/g,'""')}"`,p.sku,p.condition,p.costPrice,p.salesPrice,p.calculationBasis,p.outputVAT].join(","))].join(`
`),x="\uFEFF",b=new Blob([x+m],{type:"text/csv;charset=utf-8;"}),y=URL.createObjectURL(b),k=document.createElement("a");k.href=y,k.download=`VAT_Audit_Report_Q${o}_${n}.csv`,document.body.appendChild(k),k.click(),document.body.removeChild(k),URL.revokeObjectURL(y),this.showToast(`✅ Audit report downloaded: ${i.length} transactions`)},renderInvestments(t){const e=["Alejo","Facundo","Rafael"],s=this.state.investments||[],o=e.reduce((r,c)=>(r[c]=s.filter(l=>l.partner===c).reduce((l,i)=>l+(parseFloat(i.amount)||0),0),r),{}),n=Object.values(o).reduce((r,c)=>r+c,0),a=`
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
                    ${e.map(r=>`
                        <div class="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 hover:shadow-md transition-shadow">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-lg">
                                    ${r.charAt(0)}
                                </div>
                                <h3 class="font-bold text-brand-dark">${r}</h3>
                            </div>
                            <p class="text-2xl font-display font-bold text-brand-dark">${this.formatCurrency(o[r])}</p>
                            <p class="text-xs text-slate-400">${s.filter(c=>c.partner===r).length} inversiones</p>
                        </div>
                    `).join("")}
                    <div class="bg-brand-dark rounded-2xl shadow-lg p-5 text-white">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                <i class="ph-bold ph-coins"></i>
                            </div>
                            <h3 class="font-bold">Total Invertido</h3>
                        </div>
                        <p class="text-2xl font-display font-bold">${this.formatCurrency(n)}</p>
                        <p class="text-xs text-white/60">${s.length} inversiones totales</p>
                    </div>
                </div>

                <!-- Investments per Partner -->
                ${e.map(r=>{const c=s.filter(l=>l.partner===r).sort((l,i)=>new Date(i.date)-new Date(l.date));return`
                    <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden mb-6">
                        <div class="p-5 border-b border-orange-50 bg-orange-50/30 flex justify-between items-center">
                            <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                <span class="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold">${r.charAt(0)}</span>
                                ${r}
                            </h3>
                            <span class="text-lg font-display font-bold text-brand-orange">${this.formatCurrency(o[r])}</span>
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
                                    ${c.length===0?`
                                        <tr>
                                            <td colspan="4" class="p-8 text-center text-slate-400 italic">
                                                Sin inversiones registradas
                                            </td>
                                        </tr>
                                    `:c.map(l=>`
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-4 text-sm text-slate-500">${this.formatDate(l.date)}</td>
                                            <td class="p-4 text-sm font-medium text-brand-dark">${l.description}</td>
                                            <td class="p-4 text-sm font-bold text-brand-orange text-right">${this.formatCurrency(l.amount)}</td>
                                            <td class="p-4 text-center">
                                                <button onclick="app.deleteInvestment('${l.id}')" class="text-slate-400 hover:text-red-500 transition-colors">
                                                    <i class="ph-bold ph-trash"></i>
                                                </button>
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
                            </button>
                            <button type="submit" class="flex-1 py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                <i class="ph-bold ph-plus"></i> Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;document.body.insertAdjacentHTML("beforeend",s)},async saveInvestment(t){t.preventDefault();const e=t.target,s={partner:e.partner.value,amount:parseFloat(e.amount.value),description:e.description.value,date:e.date.value,created_at:firebase.firestore.FieldValue.serverTimestamp()};try{await D.collection("investments").add(s),document.getElementById("add-investment-modal").remove(),this.showToast("✅ Inversión registrada"),await this.loadInvestments(),this.refreshCurrentView()}catch(o){this.showToast("❌ Error: "+o.message,"error")}},async deleteInvestment(t){if(confirm("¿Eliminar esta inversión?"))try{await D.collection("investments").doc(t).delete(),this.showToast("🗑️ Inversión eliminada"),await this.loadInvestments(),this.refreshCurrentView()}catch(e){this.showToast("❌ Error: "+e.message,"error")}},async loadInvestments(){const t=await D.collection("investments").get();this.state.investments=t.docs.map(e=>({id:e.id,...e.data()}))},renderShipping(t){const e=l=>{var i;return((i=l.shipping_method)==null?void 0:i.id)==="local_pickup"||l.shipping_method&&typeof l.shipping_method=="string"&&l.shipping_method.toLowerCase().includes("pickup")||l.shippingMethod&&l.shippingMethod.toLowerCase().includes("pickup")},s=l=>!e(l),o=l=>!["shipped","picked_up"].includes(l.fulfillment_status),n=this.state.sales.filter(l=>{var i;return(l.channel==="online"||((i=l.channel)==null?void 0:i.toLowerCase())==="discogs")&&e(l)&&o(l)}).sort((l,i)=>new Date(l.date)-new Date(i.date)),a=this.state.sales.filter(l=>{var i;return(l.channel==="online"||((i=l.channel)==null?void 0:i.toLowerCase())==="discogs")&&s(l)&&o(l)}).sort((l,i)=>new Date(l.date)-new Date(i.date)),r=this.state.sales.filter(l=>{var i;return(l.channel==="online"||((i=l.channel)==null?void 0:i.toLowerCase())==="discogs")&&!o(l)}).sort((l,i)=>{var d,u;return new Date((d=i.updated_at)!=null&&d.toDate?i.updated_at.toDate():i.updated_at||i.date)-new Date((u=l.updated_at)!=null&&u.toDate?l.updated_at.toDate():l.updated_at||l.date)}).slice(0,20),c=`
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
                                <p class="text-2xl font-display font-bold">${this.formatCurrency(this.state.sales.reduce((l,i)=>l+parseFloat(i.shipping||i.shipping_cost||0),0))}</p>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-2 rounded-xl shadow-sm border border-orange-100 flex items-center gap-3">
                            <i class="ph-fill ph-clock text-brand-orange text-xl"></i>
                            <div>
                                <p class="text-[10px] text-slate-400 font-bold uppercase leading-none">Pendientes</p>
                                <p class="text-xl font-display font-bold text-brand-dark">${n.length+a.length}</p>
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
                            <span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">${n.length}</span>
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
                                ${n.length>0?n.map(l=>{var m;const i=this.getCustomerInfo(l),d=l.fulfillment_status||"unfulfilled";let u="";return d==="preparing"?u=`
                                            <div class="flex flex-col gap-2 items-center">
                                                <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">En Preparación</span>
                                                <button onclick="app.notifyPickupReadyDiscogs('${l.id}')" 
                                                        class="w-full bg-brand-orange hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                                                    <i class="ph-bold ph-bell-ringing"></i> Listo para Retirar
                                                </button>
                                            </div>
                                        `:d==="ready_for_pickup"?u=`
                                            <div class="flex flex-col gap-2 items-center">
                                                <span class="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Esperando Retiro</span>
                                                <button onclick="app.markPickedUpDiscogs('${l.id}')" 
                                                        class="w-full bg-brand-dark hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                                                    <i class="ph-bold ph-check-circle"></i> Ya Retiró
                                                </button>
                                            </div>
                                        `:u=`
                                            <button onclick="app.notifyPreparingDiscogs('${l.id}')" 
                                                    class="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                                                <i class="ph-bold ph-package"></i> Avisar Preparando
                                            </button>
                                        `,`
                                    <tr class="hover:bg-blue-50/20 transition-colors">
                                        <td class="p-4 font-bold text-brand-dark">
                                            #${l.orderNumber||l.id.slice(0,6)}
                                            <div class="text-[10px] text-slate-400 font-normal mt-0.5">${this.formatDate(l.date)}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="font-bold text-sm text-brand-dark">${i.name}</div>
                                            <div class="text-xs text-slate-500 truncate max-w-[150px]" title="${i.email}">${i.email}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="flex -space-x-2 overflow-hidden">
                                                ${(l.items||[]).slice(0,3).map(x=>`<img src="${x.image||x.cover_image||"https://elcuartito.dk/default-vinyl.png"}" 
                                                         class="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                                                         title="${x.album}">`).join("")}
                                                ${(l.items||[]).length>3?`<span class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] ring-2 ring-white text-slate-500 font-bold">+${l.items.length-3}</span>`:""}
                                            </div>
                                            <div class="text-[10px] text-slate-400 mt-1">${((m=l.items)==null?void 0:m.length)||0} items</div>
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
                                ${a.length>0?a.map(l=>{var m;const i=this.getCustomerInfo(l),d=l.fulfillment_status||"unfulfilled";let u="";return d==="preparing"?u=`
                                            <div class="flex flex-col gap-2">
                                                 <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 text-center">En Preparación</span>
                                                 <div class="flex flex-col gap-1 w-full">
                                                     <input type="text" id="tracking-${l.id}" placeholder="Tracking #" 
                                                           value="${l.tracking_number||""}"
                                                           class="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:border-brand-orange outline-none font-mono">
                                                     
                                                     <div class="flex gap-1">
                                                         <input type="text" id="tracking-link-${l.id}" placeholder="Link (Opcional)" 
                                                               class="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:border-brand-orange outline-none font-mono text-slate-500">
                                                         <button onclick="app.notifyShippedDiscogs('${l.id}', 'tracking-${l.id}', 'tracking-link-${l.id}')" 
                                                                 class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors shrink-0" title="Enviar Tracking">
                                                             <i class="ph-bold ph-paper-plane-right"></i>
                                                         </button>
                                                     </div>
                                                </div>
                                            </div>
                                        `:d==="in_transit"?u=`
                                            <div class="flex flex-col gap-2 items-center">
                                                <span class="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">En Tránsito</span>
                                                <div class="text-[10px] font-mono text-slate-500">${l.tracking_number}</div>
                                                <button onclick="app.markDispatchedDiscogs('${l.id}')" 
                                                        class="w-full bg-brand-dark hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                                                    <i class="ph-bold ph-archive"></i> Finalizar (Despachado)
                                                </button>
                                            </div>
                                        `:u=`
                                            <button onclick="app.notifyPreparingDiscogs('${l.id}')" 
                                                    class="w-full bg-brand-orange hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                                                <i class="ph-bold ph-package"></i> Avisar Preparando
                                            </button>
                                        `,`
                                    <tr class="hover:bg-orange-50/20 transition-colors">
                                        <td class="p-4 font-bold text-brand-dark">
                                            #${l.orderNumber||l.id.slice(0,6)}
                                            <div class="text-[10px] text-slate-400 font-normal mt-0.5">${this.formatDate(l.date)}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="font-bold text-sm text-brand-dark">${i.name}</div>
                                            <div class="text-xs text-slate-500 truncate max-w-[150px]" title="${i.email}">${i.email}</div>
                                        </td>
                                        <td class="p-4">
                                            <div class="flex -space-x-2 overflow-hidden">
                                                ${(l.items||[]).slice(0,3).map(x=>`<img src="${x.image||x.cover_image||"https://elcuartito.dk/default-vinyl.png"}" 
                                                         class="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                                                         title="${x.album}">`).join("")}
                                                ${(l.items||[]).length>3?`<span class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] ring-2 ring-white text-slate-500 font-bold">+${l.items.length-3}</span>`:""}
                                            </div>
                                            <div class="text-[10px] text-slate-400 mt-1">${((m=l.items)==null?void 0:m.length)||0} items</div>
                                        </td>
                                        <td class="p-4 hidden md:table-cell text-xs text-slate-500">
                                            ${l.city||""}, ${l.country||"DK"}
                                        </td>
                                        <td class="p-4">
                                            ${u}
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
                                ${r.map(l=>{var i;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${l.id}')" title="Ver historial">
                                        <td class="p-4 text-sm font-medium text-slate-500">
                                            #${l.orderNumber||l.id.slice(0,8)}
                                            <i class="ph-bold ph-clock-counter-clockwise text-xs ml-1 text-slate-300"></i>
                                        </td>
                                        <td class="p-4 text-xs text-slate-400">
                                            ${this.formatDate((i=l.updated_at)!=null&&i.toDate?l.updated_at.toDate():l.updated_at||l.date)}
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
        `;t.innerHTML=c},openOrderHistoryModal(t){var l,i,d,u,m,x;const e=this.state.sales.find(b=>b.id===t);if(!e)return;const s=e.history||[],o=(l=e.timestamp)!=null&&l.toDate?e.timestamp.toDate():new Date(e.date);let n=[];s.length>0?n=s.map(b=>({status:b.status,timestamp:new Date(b.timestamp),note:b.note})).sort((b,y)=>y.timestamp-b.timestamp):n.push({status:e.fulfillment_status,timestamp:(i=e.updated_at)!=null&&i.toDate?e.updated_at.toDate():new Date,note:"Última actualización"}),n.push({status:"created",timestamp:o,note:`Orden recibida via ${e.channel||"Online"}`});const a=b=>b==="created"?"bg-slate-100 text-slate-500":b==="preparing"?"bg-blue-100 text-blue-600":b==="ready_for_pickup"?"bg-emerald-100 text-emerald-600":b==="in_transit"?"bg-orange-100 text-orange-600":b==="shipped"||b==="picked_up"?"bg-green-100 text-green-600":"bg-slate-100",r=b=>({created:"Orden Creada",preparing:"En Preparación",ready_for_pickup:"Listo para Retiro",in_transit:"En Tránsito",shipped:"Despachado",picked_up:"Retirado"})[b]||b,c=document.createElement("div");c.className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4",c.onclick=b=>{b.target===c&&c.remove()},c.innerHTML=`
            <div class="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div class="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-xl text-brand-dark">Historial de Orden</h3>
                        <p class="text-sm text-slate-500">#${e.orderNumber||e.id.slice(0,8)}</p>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
                
                <div class="p-8 max-h-[60vh] overflow-y-auto">
                    <div class="relative pl-4 border-l-2 border-slate-100 space-y-8">
                        ${n.map((b,y)=>`
                            <div class="relative">
                                <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${y===0?"bg-brand-orange ring-4 ring-orange-50":"bg-slate-300"}"></div>
                                
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-bold px-2 py-0.5 rounded-full ${a(b.status)}">
                                            ${r(b.status)}
                                        </span>
                                        <span class="text-xs text-slate-400 font-mono">
                                            ${b.timestamp.toLocaleString("es-AR",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"})}
                                        </span>
                                    </div>
                                    <p class="text-sm text-slate-600 mt-1">${b.note||"-"}</p>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                    
                    <div class="mt-8 pt-6 border-t border-slate-50 flex justify-between items-end">
                       <div class="text-xs text-slate-400">
                            Cliente: <span class="font-bold text-slate-600">${e.customerName||((d=e.customer)==null?void 0:d.name)||((u=e.customer)==null?void 0:u.firstName)+" "+((m=e.customer)==null?void 0:m.lastName)}</span><br>
                            Email: ${e.customerEmail||((x=e.customer)==null?void 0:x.email)}
                       </div>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(c)},fetchDiscogsById(t=null){const e=t||document.getElementById("discogs-search-input").value.trim(),s=document.getElementById("discogs-results");if(!e||!/^\d+$/.test(e)){this.showToast("⚠️ Ingresa un ID numérico válido","error");return}if(!localStorage.getItem("discogs_token")){this.showToast("⚠️ Token no configurado","error");return}s&&(s.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Importando Release por ID...</p>',s.classList.remove("hidden")),fetch(`${M}/discogs/release/${e}`).then(n=>{if(!n.ok)throw new Error(`Error ${n.status}`);return n.json()}).then(n=>{var r;const a={id:n.id,title:`${n.artists_sort||((r=n.artists[0])==null?void 0:r.name)} - ${n.title}`,year:n.year,thumb:n.thumb,cover_image:n.images?n.images[0].uri:null,label:n.labels?[n.labels[0].name]:[],format:n.formats?[n.formats[0].name]:[]};this.handleDiscogsSelection(a),s&&s.classList.add("hidden"),this.showToast("✅ Datos importados con éxito")}).catch(n=>{console.error(n),this.showToast("❌ Error al importar ID: "+n.message,"error"),s&&s.classList.add("hidden")})},openBulkImportModal(){const t=document.createElement("div");t.id="bulk-import-modal",t.className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4",t.innerHTML=`
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
        `,document.body.appendChild(t)},async handleBulkImportBatch(){const t=document.getElementById("bulk-csv-data").value.trim();if(!t){this.showToast("Por favor, pega el contenido del CSV.","error");return}const e=document.getElementById("start-bulk-import-btn");e.innerHTML,e.disabled=!0,e.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> Importando...';try{const s=await fetch(`${M}/discogs/bulk-import`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({csvData:t})}),o=await s.json();s.ok&&(this.showToast(`✅ ${o.summary}`),document.getElementById("bulk-import-modal").remove(),await this.loadData(),this.refreshCurrentView())}catch(s){console.error("Bulk import error:",s),this.showToast("❌ "+s.message,"error");const o=document.getElementById("start-bulk-import-btn");o&&(o.disabled=!1,o.innerHTML='<i class="ph-bold ph-rocket-launch"></i> Comenzar Importación')}},async refreshProductMetadata(t){const e=document.getElementById("refresh-metadata-btn");if(!e)return;const s=e.innerHTML;e.disabled=!0,e.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> ...';try{let o=t;const n=this.state.inventory.find(c=>c.sku===t||c.id===t);n&&n.id&&(o=n.id);const a=await fetch(`${M}/discogs/refresh-metadata/${o}`,{method:"POST",headers:{"Content-Type":"application/json"}}),r=await a.json();if(a.ok){this.showToast("✅ Metadata actualizada correctamente");const c=document.getElementById("modal-overlay");c&&c.remove(),await this.loadData(),this.refreshCurrentView(),n&&this.openProductModal(n.sku)}else throw new Error(r.error||"Error al actualizar metadata")}catch(o){console.error("Refresh metadata error:",o),this.showToast("❌ "+o.message,"error"),e.disabled=!1,e.innerHTML=s}}};window.app=ce;document.addEventListener("DOMContentLoaded",()=>{ce.init()});
