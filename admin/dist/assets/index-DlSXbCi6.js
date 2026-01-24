(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function s(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(n){if(n.ep)return;n.ep=!0;const a=s(n);fetch(n.href,a)}})();const v=firebase.firestore(),M=window.auth,V=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1",T=V?"http://localhost:3001":"https://el-cuartito-shop.up.railway.app",_={async createSale(t){let e=[];if(await v.runTransaction(async s=>{const o=[];for(const l of t.items){const i=v.collection("products").doc(l.recordId||l.productId),d=await s.get(i);if(!d.exists)throw new Error(`Producto ${l.recordId} no encontrado`);const c=d.data();if(c.stock<l.quantity)throw new Error(`Stock insuficiente para ${c.artist||"Sin Artista"} - ${c.album||"Sin Album"}. Disponible: ${c.stock}`);o.push({ref:i,data:c,quantity:l.quantity,price:c.price,cost:c.cost||0})}const n=o.reduce((l,i)=>l+i.price*i.quantity,0),a=t.customTotal!==void 0?t.customTotal:n,r=v.collection("sales").doc();s.set(r,{...t,total:a,date:new Date().toISOString().split("T")[0],timestamp:firebase.firestore.FieldValue.serverTimestamp(),items:o.map(l=>({productId:l.ref.id,artist:l.data.artist,album:l.data.album,sku:l.data.sku,unitPrice:l.price,costAtSale:l.cost,qty:l.quantity}))});for(const l of o){s.update(l.ref,{stock:l.data.stock-l.quantity});const i=v.collection("inventory_logs").doc();s.set(i,{type:"SOLD",sku:l.data.sku||"Unknown",album:l.data.album||"Unknown",artist:l.data.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:`Venta registrada (Admin) - Canal: ${t.channel||"Tienda"}`})}e=o.map(l=>({discogs_listing_id:l.data.discogs_listing_id,artist:l.data.artist,album:l.data.album}))}),t.channel&&t.channel.toLowerCase()==="discogs"){for(const s of e)if(s.discogs_listing_id)try{const o=await fetch(`${T}/discogs/delete-listing/${s.discogs_listing_id}`,{method:"DELETE"});o.ok?console.log(`✅ Discogs listing ${s.discogs_listing_id} deleted for ${s.artist} - ${s.album}`):console.warn(`⚠️ Could not delete Discogs listing ${s.discogs_listing_id}:`,await o.text())}catch(o){console.error(`❌ Error deleting Discogs listing ${s.discogs_listing_id}:`,o)}}}},P={state:{inventory:[],sales:[],expenses:[],consignors:[],cart:[],viewMode:"list",selectedItems:new Set,currentView:"dashboard",filterMonths:[new Date().getMonth()],filterYear:new Date().getFullYear(),inventorySearch:"",salesHistorySearch:"",expensesSearch:"",events:[],selectedDate:new Date,vatActive:localStorage.getItem("el-cuartito-settings")?JSON.parse(localStorage.getItem("el-cuartito-settings")).vatActive:!1},async init(){M.onAuthStateChanged(async t=>{if(t)try{document.getElementById("login-view").classList.add("hidden"),document.getElementById("main-app").classList.remove("hidden"),document.getElementById("mobile-nav").classList.remove("hidden"),await this.loadData(),this._pollInterval&&clearInterval(this._pollInterval),this._pollInterval=setInterval(()=>this.loadData(),3e4),this.renderDashboard(document.getElementById("app-content")),this.setupMobileMenu(),this.setupNavigation()}catch(e){console.error("Auth token error:",e),this.logout()}else{document.getElementById("login-view").classList.remove("hidden"),document.getElementById("main-app").classList.add("hidden"),document.getElementById("mobile-nav").classList.add("hidden");const e=document.getElementById("login-btn");e&&(e.disabled=!1,e.innerHTML="<span>Entrar</span>")}})},async handleLogin(t){t.preventDefault();const e=t.target.email.value,s=t.target.password.value,o=document.getElementById("login-error"),n=document.getElementById("login-btn");o.classList.add("hidden"),n.disabled=!0,n.innerHTML="<span>Cargando...</span>";try{await M.signInWithEmailAndPassword(e,s)}catch(a){console.error("Login error:",a),o.innerText="Error: "+a.message,o.classList.remove("hidden"),n.disabled=!1,n.innerHTML='<span>Ingresar</span><i class="ph-bold ph-arrow-right"></i>'}},async updateFulfillmentStatus(t,e,s){var o,n,a;try{const r=((o=t==null?void 0:t.target)==null?void 0:o.closest("button"))||((a=(n=window.event)==null?void 0:n.target)==null?void 0:a.closest("button"));if(r){r.disabled=!0;const l=r.innerHTML;r.innerHTML='<i class="ph ph-circle-notch animate-spin"></i>'}await v.collection("sales").doc(e).update({fulfillment_status:s}),await this.loadData(),document.getElementById("modal-overlay")&&(document.getElementById("modal-overlay").remove(),this.openOnlineSaleDetailModal(e)),this.showToast("Estado de envío actualizado")}catch(r){console.error("Fulfillment update error:",r),this.showToast("Error al actualizar estado: "+r.message,"error")}},async manualShipOrder(t){var e,s,o,n,a,r;try{const l=prompt("Introduce el número de seguimiento:");if(!l)return;const i=((e=event==null?void 0:event.target)==null?void 0:e.closest("button"))||((o=(s=window.event)==null?void 0:s.target)==null?void 0:o.closest("button"));i&&(i.disabled=!0,i.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Guardando...');const d=await fetch(`${T}/api/manual-ship`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t,trackingNumber:l})}),c=await d.json();if(d.ok&&c.success){this.showToast("✅ Pedido marcado como enviado"),this.showToast("📧 Cliente notificado por email"),await this.loadData();const b=document.getElementById("sale-detail-modal");b&&(b.remove(),this.openSaleDetailModal(t))}else throw new Error(c.error||c.message||"Error desconocido")}catch(l){console.error("Error shipping manually:",l),this.showToast("❌ Error: "+(l.message||"No se pudo procesar el envío"),"error");const i=((n=event==null?void 0:event.target)==null?void 0:n.closest("button"))||((r=(a=window.event)==null?void 0:a.target)==null?void 0:r.closest("button"));i&&(i.disabled=!1,i.innerHTML='<i class="ph-bold ph-truck"></i> Ingresar Tracking y Cerrar')}},async logout(){try{await M.signOut(),location.reload()}catch(t){console.error("Sign out error:",t),location.reload()}},setupListeners(){},async loadData(){try{const[t,e,s,o,n]=await Promise.all([v.collection("products").get(),v.collection("sales").get(),v.collection("expenses").orderBy("date","desc").get(),v.collection("events").orderBy("date","desc").get(),v.collection("consignors").get()]);this.state.inventory=t.docs.map(a=>{const r=a.data();return{id:a.id,...r,condition:r.condition||"VG",owner:r.owner||"El Cuartito",label:r.label||"Desconocido",storageLocation:r.storageLocation||"Tienda",cover_image:r.cover_image||r.coverImage||null}}),this.state.sales=e.docs.map(a=>{var i,d;const r=a.data(),l={id:a.id,...r,date:r.date||((i=r.timestamp)!=null&&i.toDate?r.timestamp.toDate().toISOString().split("T")[0]:(d=r.created_at)!=null&&d.toDate?r.created_at.toDate().toISOString().split("T")[0]:new Date().toISOString().split("T")[0])};return r.total_amount!==void 0&&r.total===void 0&&(l.total=r.total_amount),r.payment_method&&!r.paymentMethod&&(l.paymentMethod=r.payment_method),l.items&&Array.isArray(l.items)&&(l.items=l.items.map(c=>({...c,priceAtSale:c.priceAtSale!==void 0?c.priceAtSale:c.unitPrice||0,qty:c.qty!==void 0?c.qty:c.quantity||1,costAtSale:c.costAtSale!==void 0?c.costAtSale:c.cost||0}))),l}).sort((a,r)=>{const l=new Date(a.date);return new Date(r.date)-l}),this.state.expenses=s.docs.map(a=>({id:a.id,...a.data()})),this.state.events=o.docs.map(a=>({id:a.id,...a.data()})),this.state.consignors=n.docs.map(a=>{const r=a.data();return{id:a.id,...r,agreementSplit:r.split||r.agreementSplit||(r.percentage?Math.round(r.percentage*100):70)}}),this.refreshCurrentView()}catch(t){console.error("Failed to load data:",t),this.showToast("❌ Error de conexión: "+t.message,"error")}},refreshCurrentView(){const t=document.getElementById("app-content");if(t)switch(this.state.currentView){case"dashboard":this.renderDashboard(t);break;case"inventory":this.renderInventory(t);break;case"sales":this.renderSales(t);break;case"onlineSales":this.renderOnlineSales(t);break;case"discogsSales":this.renderDiscogsSales(t);break;case"expenses":this.renderExpenses(t);break;case"consignments":this.renderConsignments(t);break;case"vat":this.renderVAT(t);break;case"backup":this.renderBackup(t);break;case"settings":this.renderSettings(t);break;case"calendar":this.renderCalendar(t);break;case"shipping":this.renderShipping(t);break}},navigate(t){this.state.currentView=t,document.querySelectorAll(".nav-item, .nav-item-m").forEach(n=>{n.classList.remove("bg-orange-50","text-brand-orange"),n.classList.add("text-slate-500")});const e=document.getElementById(`nav-d-${t}`);e&&(e.classList.remove("text-slate-500"),e.classList.add("bg-orange-50","text-brand-orange"));const s=document.getElementById(`nav-m-${t}`);s&&(s.classList.remove("text-slate-400"),s.classList.add("text-brand-orange"));const o=document.getElementById("app-content");o.innerHTML="",this.refreshCurrentView()},renderCalendar(t){const e=this.state.selectedDate||new Date,s=e.getFullYear(),o=e.getMonth(),n=new Date(s,o,1),r=new Date(s,o+1,0).getDate(),l=n.getDay()===0?6:n.getDay()-1,i=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],d=b=>{const p=`${s}-${String(o+1).padStart(2,"0")}-${String(b).padStart(2,"0")}`,u=this.state.sales.some(f=>f.date===p),x=this.state.expenses.some(f=>f.date===p),h=this.state.events.some(f=>f.date===p);return{hasSales:u,hasExpenses:x,hasEvents:h}},c=`
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
                                </button>
                                <button onclick="app.changeCalendarMonth(1)" class="w-10 h-10 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-brand-orange transition-colors flex items-center justify-center">
                                    <i class="ph-bold ph-caret-right"></i>
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-7 gap-2 mb-2 text-center">
                            ${["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(b=>`
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider py-2">${b}</div>
                            `).join("")}
                        </div>

                        <div class="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                            ${Array(l).fill('<div class="bg-slate-50/50 rounded-xl"></div>').join("")}
                            ${Array.from({length:r},(b,p)=>{const u=p+1,x=`${s}-${String(o+1).padStart(2,"0")}-${String(u).padStart(2,"0")}`,h=e.getDate()===u,f=d(u),y=new Date().toDateString()===new Date(s,o,u).toDateString();return`
                                    <button onclick="app.selectCalendarDate('${x}')" 
                                        class="relative rounded-xl p-2 flex flex-col items-center justify-start gap-1 transition-all border-2
                                        ${h?"border-brand-orange bg-orange-50":"border-transparent hover:bg-slate-50"}
                                        ${y?"bg-blue-50":""}">
                                        <span class="text-sm font-bold ${h?"text-brand-orange":"text-slate-700"} ${y?"text-blue-600":""}">${u}</span>
                                        <div class="flex gap-1 mt-1">
                                            ${f.hasSales?'<div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>':""}
                                            ${f.hasExpenses?'<div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>':""}
                                            ${f.hasEvents?'<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>':""}
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
        `;t.innerHTML=c},getCustomerInfo(t){const e=t.customer||{},s=t.customerName||e.name||(e.firstName?`${e.firstName} ${e.lastName||""}`.trim():"")||"Cliente",o=t.customerEmail||e.email||"-";let n=t.address||e.address||"-";if(e.shipping){const a=e.shipping;n=`${a.line1||""} ${a.line2||""}, ${a.city||""}, ${a.postal_code||""}, ${a.country||""}`.trim().replace(/^,|,$/g,"")}return{name:s,email:o,address:n}},renderCalendarDaySummary(t){const e=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,s=t.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}),o=this.state.sales.filter(i=>i.date===e),n=this.state.expenses.filter(i=>i.date===e),a=this.state.events.filter(i=>i.date===e),r=o.reduce((i,d)=>i+d.total,0),l=n.reduce((i,d)=>i+d.amount,0);return`
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
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle Gastos (${n.length})</h4>
                    ${n.length>0?`
                        <div class="space-y-2">
                            ${n.map(i=>`
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
        `;document.body.insertAdjacentHTML("beforeend",e)},handleAddEvent(t){t.preventDefault();const e=new FormData(t.target),s={date:e.get("date"),title:e.get("title"),description:e.get("description"),createdAt:new Date().toISOString()};v.collection("events").add(s).then(()=>{this.showToast("✅ Evento agregado"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>console.error(o))},deleteEvent(t){confirm("¿Eliminar este evento?")&&v.collection("events").doc(t).delete().then(()=>{this.showToast("✅ Evento eliminado"),this.loadData()}).catch(e=>console.error(e))},renderBackup(t){const e=`
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
            </div>
        `;t.innerHTML=s},saveSettings(t){t.preventDefault();const s=new FormData(t.target).get("discogs_token").trim();s?(localStorage.setItem("discogs_token",s),localStorage.setItem("discogs_token_warned","true"),this.showToast("Configuración guardada correctamente")):(localStorage.removeItem("discogs_token"),this.showToast("Token eliminado"))},exportData(){const t={inventory:this.state.inventory,sales:this.state.sales,expenses:this.state.expenses,consignors:this.state.consignors,customGenres:this.state.customGenres,customCategories:this.state.customCategories,timestamp:new Date().toISOString()},e="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(t)),s=document.createElement("a");s.setAttribute("href",e),s.setAttribute("download","el_cuartito_backup_"+new Date().toISOString().slice(0,10)+".json"),document.body.appendChild(s),s.click(),s.remove()},importData(t){const e=t.files[0];if(!e)return;const s=new FileReader;s.onload=o=>{try{const n=JSON.parse(o.target.result);if(!confirm("¿Estás seguro de restaurar este backup? Se sobrescribirán los datos actuales."))return;const a=v.batch();alert("La importación completa sobrescribiendo datos en la nube es compleja. Por seguridad, esta función solo agrega/actualiza items de inventario por ahora."),n.inventory&&n.inventory.forEach(r=>{const l=v.collection("products").doc(r.sku);a.set(l,r)}),a.commit().then(()=>{this.showToast("Datos importados (Inventario)")})}catch(n){alert("Error al leer el archivo de respaldo"),console.error(n)}},s.readAsText(e)},resetApplication(){if(!confirm(`⚠️ ¡ADVERTENCIA! ⚠️

Esto borrará PERMANENTEMENTE todo el inventario, ventas, gastos y socios de la base de datos.

¿Estás absolutamente seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Iniciando borrado completo...");const e=s=>v.collection(s).get().then(o=>{const n=v.batch();return o.docs.forEach(a=>{n.delete(a.ref)}),n.commit()});Promise.all([e("inventory"),e("sales"),e("expenses"),e("consignors"),v.collection("settings").doc("general").delete()]).then(()=>{this.showToast("♻️ Aplicación restablecida de fábrica"),setTimeout(()=>location.reload(),1500)}).catch(s=>{console.error(s),alert("Error al borrar datos: "+s.message)})},resetSales(){if(!confirm(`⚠️ ADVERTENCIA ⚠️

Esto borrará PERMANENTEMENTE todas las ventas (manuales y online) de la base de datos.

El inventario, gastos y socios NO serán afectados.

¿Estás seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Borrando todas las ventas..."),v.collection("sales").get().then(e=>{const s=v.batch();return e.docs.forEach(o=>{s.delete(o.ref)}),s.commit()}).then(()=>{this.showToast("✅ Todas las ventas han sido eliminadas"),setTimeout(()=>location.reload(),1500)}).catch(e=>{console.error(e),alert("Error al borrar ventas: "+e.message)})},async findProductBySku(t){try{const e=await v.collection("products").where("sku","==",t).get();if(e.empty)return null;const s=e.docs[0];return{id:s.id,ref:s.ref,data:s.data()}}catch(e){return console.error("Error finding product by SKU:",e),null}},logInventoryMovement(t,e){let s="";t==="EDIT"?s="Producto actualizado":t==="ADD"?s="Ingreso de inventario":t==="DELETE"?s="Egreso manual":t==="SOLD"&&(s="Venta registrada"),v.collection("inventory_logs").add({type:t,sku:e.sku||"Unknown",album:e.album||"Unknown",artist:e.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:s}).catch(o=>console.error("Error logging movement:",o))},openInventoryLogModal(){v.collection("inventory_logs").orderBy("timestamp","desc").limit(50).get().then(t=>{const s=`
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
        `;try{const s=T,n=await(await fetch(`${s}/discogs/sync`,{method:"POST",headers:{"Content-Type":"application/json"}})).json(),r=await(await fetch(`${s}/discogs/sync-orders`,{method:"POST",headers:{"Content-Type":"application/json"}})).json();if(n.success||r&&r.success){let l=`✅ Sincronizado: ${n.synced||0} productos`;r&&r.salesCreated>0&&(l+=`. ¡Detectadas ${r.salesCreated} nuevas ventas!`),this.showToast(l),await this.loadData(),this.refreshCurrentView()}else throw new Error(n.error||r&&r.error||"Error desconocido")}catch(s){console.error("Sync error:",s),this.showToast(`❌ Error al sincronizar: ${s.message}`)}finally{t.disabled=!1,t.innerHTML=e}},formatCurrency(t){return new Intl.NumberFormat("da-DK",{style:"currency",currency:"DKK"}).format(t)},formatDate(t){return t?new Date(t).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}):"-"},getMonthName(t){return["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][t]},generateId(){return Date.now().toString(36)+Math.random().toString(36).substr(2)},showToast(t){const e=document.getElementById("toast");document.getElementById("toast-message").innerText=t,e.classList.remove("opacity-0","-translate-y-20","md:translate-y-20"),setTimeout(()=>{e.classList.add("opacity-0","-translate-y-20","md:translate-y-20")},3e3)},setupNavigation(){},setupMobileMenu(){},toggleMobileMenu(){const t=document.getElementById("mobile-menu"),e=document.getElementById("mobile-menu-overlay");!t||!e||(t.classList.contains("translate-y-full")?(t.classList.remove("translate-y-full"),e.classList.remove("hidden")):(t.classList.add("translate-y-full"),e.classList.add("hidden")))},getVatComponent(t){return this.state.vatActive?(parseFloat(t)||0)*.2:0},getNetPrice(t){return this.state.vatActive?t*.8:t},getRolling12MonthSales(){const t=new Date;return t.setFullYear(t.getFullYear()-1),this.state.sales.filter(e=>new Date(e.date)>=t).reduce((e,s)=>e+this.getNetPrice(s.total),0)},toggleMonthFilter(t){const e=this.state.filterMonths.indexOf(t);e===-1?this.state.filterMonths.push(t):this.state.filterMonths.length>1&&this.state.filterMonths.splice(e,1),this.state.filterMonths.sort((s,o)=>s-o),this.refreshCurrentView()},async setReadyForPickup(t){var e,s,o,n,a,r;try{const l=((e=event==null?void 0:event.target)==null?void 0:e.closest("button"))||((o=(s=window.event)==null?void 0:s.target)==null?void 0:o.closest("button"));l&&(l.disabled=!0,l.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Guardando...');const i=await fetch(`${T}/api/ready-for-pickup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t})}),d=await i.json();if(i.ok&&d.success){this.showToast("✅ Pedido listo para retiro"),this.showToast("📧 Cliente notificado por email"),await this.loadData();const c=document.getElementById("sale-detail-modal");c&&(c.remove(),this.openSaleDetailModal(t))}else throw new Error(d.error||d.message||"Error desconocido")}catch(l){console.error("Error setting ready for pickup:",l),this.showToast("❌ Error: "+(l.message||"No se pudo procesar el estado"),"error");const i=((n=event==null?void 0:event.target)==null?void 0:n.closest("button"))||((r=(a=window.event)==null?void 0:a.target)==null?void 0:r.closest("button"));i&&(i.disabled=!1,i.innerHTML='<i class="ph-bold ph-storefront"></i> Listo para Retiro')}},renderDashboard(t){const e=this.state.filterMonths,s=this.state.filterYear,o=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],n=this.state.sales.filter(m=>{const g=new Date(m.date);return g.getFullYear()===s&&e.includes(g.getMonth())}),a=[...n].sort((m,g)=>new Date(g.date)-new Date(m.date));let r=0,l=0,i=0,d=0;n.forEach(m=>{const g=m.channel==="discogs",w=Number(m.originalTotal)||Number(m.total_amount)||Number(m.total)||0,$=Number(m.total)||Number(m.total_amount)||0,k=g?w-$:0,C=Number(m.shipping_cost)||0;r+=w,i+=C;let E=0;const D=m.items||[];D.length>0?D.forEach(S=>{const j=Number(S.priceAtSale||S.unitPrice||S.price)||0,L=Number(S.qty||S.quantity)||1;let I=Number(S.costAtSale||S.cost)||0;const A=(S.owner||"").toLowerCase();if(A==="el cuartito"||A==="")I=Number(S.costAtSale||S.cost)||0;else if(I===0||isNaN(I)){const B=this.state.consignors?this.state.consignors.find(N=>(N.name||"").toLowerCase()===A):null,F=B&&(B.agreementSplit||B.split)||70;I=j*(Number(F)||70)/100,d+=I*L}else d+=I*L;E+=(j-I)*L}):E=w,l+=E-k});const c=this.state.vatActive?r-r/1.25:0;this.state.inventory.reduce((m,g)=>m+g.price*g.stock,0);const b=this.state.inventory.reduce((m,g)=>m+g.stock,0);let p=0,u=0,x=0;this.state.inventory.forEach(m=>{const g=(m.owner||"").toLowerCase(),w=parseInt(m.stock)||0,$=parseFloat(m.price)||0,k=parseFloat(m.cost)||0;if(g==="el cuartito"||g==="")p+=k*w,u+=($-k)*w;else{let C=k;if(C===0){const D=this.state.consignors?this.state.consignors.find(j=>(j.name||"").toLowerCase()===g):null,S=D&&(D.agreementSplit||D.split)||70;C=$*(Number(S)||70)/100}const E=$-C;x+=E*w}});const h={};this.state.inventory.forEach(m=>{const g=m.owner||"El Cuartito";h[g]||(h[g]={count:0,value:0}),h[g].count+=parseInt(m.stock)||0,h[g].value+=(parseFloat(m.price)||0)*(parseInt(m.stock)||0)});const y=`
    <div class="max-w-7xl mx-auto space-y-6 pb-24 md:pb-8 px-4 md:px-8 pt-6">
                <!--Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="flex items-center gap-4">
                        <button onclick="app.navigate('dashboard')" class="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center text-white text-2xl shadow-lg shadow-brand-orange/30 hover:scale-105 transition-transform">
                            <i class="ph-fill ph-vinyl-record"></i>
                        </button>
                        <div>
                            <h2 class="font-display text-3xl font-bold text-brand-dark">Dashboard</h2>
                            <p class="text-slate-500">Resumen de <span class="font-bold text-brand-orange">${e.length===12?`Año ${s} `:`${e.map(m=>this.getMonthName(m)).join(", ")} ${s} `}</span></p>
                        </div>
                    </div>

                    <!-- Date Selectors -->
                    <!-- Date Selectors -->
                    <div class="flex flex-wrap md:flex-nowrap items-center gap-3">
                         <div class="bg-white p-1 rounded-lg border border-orange-100 shadow-sm">
                            <select id="dashboard-year" onchange="app.updateFilter('year', this.value)" class="bg-transparent text-sm font-bold text-brand-dark p-2 outline-none cursor-pointer">
                                <option value="2026" ${this.state.filterYear===2026?"selected":""}>2026</option>
                            </select>
                        </div>
                        <div class="flex flex-wrap gap-1">
                            ${o.map((m,g)=>`
                                <button onclick="app.toggleMonthFilter(${g})" 
                                    class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm ${e.includes(g)?"bg-brand-orange text-white shadow-brand-orange/30":"bg-white border border-slate-100 text-slate-400 hover:text-brand-dark hover:bg-slate-50"}">
                                    ${m}
                                </button>
                            `).join("")}
                        </div>
                    </div>
                </div>

                <!--Quick Actions(Top)-->
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

                <!--Main Metrics Grid-->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    <!-- Financial Breakdown -->
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 class="font-bold text-lg text-brand-dark mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-chart-pie-slice text-brand-orange"></i> Desglose Financiero
                        </h3>
                        
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <p class="text-sm text-slate-500 uppercase font-bold">Ventas Totales</p>
                                <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(r)}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-slate-400 uppercase font-bold">Ganancia Neta</p>
                                <p class="text-xl font-bold text-green-600">${this.formatCurrency(l)}</p>
                            </div>
                        
                        <!-- VAT Limit Progress -->
                        <!-- VAT Limit Progress -->
                        <div class="mt-8 pt-6 border-t border-slate-100">
                             <div class="flex justify-between items-end mb-3">
                                <div>
                                    <p class="text-xs text-brand-dark uppercase font-bold tracking-wider mb-1">Límite VAT (50.000 kr)</p>
                                    <p class="text-[10px] text-slate-400 font-medium">Ventas acumuladas (12 meses)</p>
                                </div>
                                <div class="text-right">
                                    <span class="text-2xl font-display font-bold text-brand-dark">${Math.min((r/5e4*100).toFixed(1),100)}<span class="text-sm text-slate-400 ml-0.5">%</span></span>
                                </div>
                            </div>
                            <div class="h-5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                                <!-- Marker for 50k -->
                                <div class="absolute right-0 top-0 bottom-0 w-0.5 bg-red-300 z-10 opacity-50"></div>
                                <div class="h-full bg-gradient-to-r from-brand-orange via-orange-400 to-red-500 transition-all duration-1000 ease-out shadow-[0_2px_10px_rgba(249,115,22,0.3)]" style="width: ${Math.min(r/5e4*100,100)}%">
                                    <div class="w-full h-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InN0cmlwZXMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVybkVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDAgMEgyMHY0MHptMjAgLTIwTDIwIDIwHDAiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjc3RyaXBlcykiLz48L3N2Zz4')] animate-[slide_2s_linear_infinite]"></div>
                                </div>
                            </div>
                            <div class="flex justify-between items-center mt-3">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">0 kr</p>
                                <p class="text-xs text-brand-orange font-bold bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                    ${r>=5e4?"⚠️ Límite Alcanzado":`Faltan ${this.formatCurrency(5e4-r)}`}
                                </p>
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">50.000 kr</p>
                            </div>
                        </div>
                    </div>

                        <div class="space-y-3">
                            <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                                <span class="text-sm font-bold text-green-700">Ganancia El Cuartito</span>
                                <span class="font-bold text-green-700">${this.formatCurrency(l)}</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <span class="text-sm font-bold text-blue-700">Share Socios (Pagar)</span>
                                <span class="font-bold text-blue-700">${this.formatCurrency(d)}</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                                <span class="text-sm font-bold text-orange-700">Costos de Envío</span>
                                <span class="font-bold text-orange-700">${this.formatCurrency(i)}</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <span class="text-sm font-bold text-slate-600">Impuestos (Estimado)</span>
                                <span class="font-bold text-slate-600">${this.formatCurrency(c)}</span>
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
                                    <p class="text-[10px] text-slate-500 font-bold uppercase">Inversión (Stock Propio)</p>
                                    <p class="text-lg font-bold text-slate-700">${this.formatCurrency(p)}</p>
                                </div>
                                <div class="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                                    <p class="text-[10px] text-green-600 font-bold uppercase">Ganancia Latente (Propia)</p>
                                    <p class="text-lg font-bold text-green-700">${this.formatCurrency(u)}</p>
                                </div>
                                <div class="p-4 bg-purple-50 rounded-xl border border-purple-100 text-center col-span-2">
                                    <p class="text-[10px] text-purple-600 font-bold uppercase">Ganancia Latente (Socios)</p>
                                    <p class="text-lg font-bold text-purple-700">${this.formatCurrency(x)}</p>
                                </div>
                            </div>

                            <div class="space-y-1 mb-4 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Por Dueño</h4>
                                ${Object.entries(h).sort((m,g)=>g[1].count-m[1].count).map(([m,g])=>`
                                <div class="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <span class="font-bold text-slate-700 truncate max-w-[120px]" title="${m}">${m}</span>
                                    <div class="text-right">
                                        <div class="font-bold text-brand-dark">${g.count} discos</div>
                                        <div class="text-[10px] text-slate-500">${this.formatCurrency(g.value)}</div>
                                    </div>
                                </div>
                                `).join("")}
                            </div>
                        </div>

                        <div class="p-4 bg-purple-50 rounded-xl border border-purple-100 flex justify-between items-center mt-auto">
                            <span class="text-sm font-bold text-purple-700 uppercase">Total Discos</span>
                            <span class="text-2xl font-bold text-purple-700">${b}</span>
                        </div>
                    </div>
                </div>

                <!--Charts Section-->
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

                <!--Recent Sales-->
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
                    ${a.slice(0,5).map(m=>`
                                    <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td class="py-3 font-medium text-brand-dark max-w-[200px] truncate">
                                            ${m.album||(m.items&&m.items[0]?m.items[0].album:"Venta rápida")}
                                        </td>
                                        <td class="py-3 text-slate-500">${this.formatDate(m.date)}</td>
                                        <td class="py-3 font-bold text-brand-dark text-right">${this.formatCurrency(m.total)}</td>
                                    </tr>
                                `).join("")||'<tr><td colspan="3" class="p-8 text-center text-slate-400">No hay ventas recientes</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
            </div>
    `;t.innerHTML=y,this.renderDashboardCharts(n)},renderInventoryCart(){const t=document.getElementById("inventory-cart-container");if(!t)return;if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden");const e=this.state.cart.map((s,o)=>`
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
`},renderInventory(t){const e=[...new Set(this.state.inventory.map(d=>d.genre).filter(Boolean))].sort(),s=[...new Set(this.state.inventory.map(d=>d.owner).filter(Boolean))].sort(),o=[...new Set(this.state.inventory.map(d=>d.label).filter(Boolean))].sort(),n=[...new Set(this.state.inventory.map(d=>d.storageLocation).filter(Boolean))].sort(),a=this.state.inventory.filter(d=>{const c=this.state.inventorySearch.toLowerCase(),b=d.artist.toLowerCase().includes(c)||d.album.toLowerCase().includes(c)||d.sku.toLowerCase().includes(c),p=this.state.filterGenre||"all",u=this.state.filterOwner||"all",x=this.state.filterLabel||"all",h=this.state.filterStorage||"all",f=this.state.filterDiscogs||"all",y=p==="all"||d.genre===p,m=u==="all"||d.owner===u,g=x==="all"||d.label===x,w=h==="all"||d.storageLocation===h,$=!!d.discogs_listing_id;return b&&y&&m&&g&&w&&(f==="all"||f==="yes"&&$||f==="no"&&!$)}),r=this.state.sortBy||"dateDesc";a.sort((d,c)=>{if(r==="priceDesc")return(c.price||0)-(d.price||0);if(r==="priceAsc")return(d.price||0)-(c.price||0);if(r==="stockDesc")return(c.stock||0)-(d.stock||0);const b=d.created_at?d.created_at.seconds?d.created_at.seconds*1e3:new Date(d.created_at).getTime():0,p=c.created_at?c.created_at.seconds?c.created_at.seconds*1e3:new Date(c.created_at).getTime():0;return r==="dateDesc"?p-b:r==="dateAsc"?b-p:0}),document.getElementById("inventory-layout-root")||(t.innerHTML=`
    <div id="inventory-layout-root" class="max-w-7xl mx-auto pb-24 md:pb-8 px-4 md:px-8 pt-10">
                    <!--Header(Search) -->
                    <div class="sticky top-0 bg-slate-50 z-20 pb-4 pt-4 -mx-4 px-4 md:mx-0 md:px-0">
                         <div class="flex justify-between items-center mb-4">
                            <div><h2 class="font-display text-2xl font-bold text-brand-dark">Inventario</h2></div>
                             <div class="flex gap-2">
                                <button onclick="app.openInventoryLogModal()" class="bg-white border border-slate-200 text-slate-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm hover:text-brand-orange hover:border-brand-orange transition-colors">
                                    <i class="ph-bold ph-clock-counter-clockwise text-2xl"></i>
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
                ${this.state.inventory.map(d=>"<!-- Mobile Card Placeholder - Handled by renderInventoryContent actually? No, duplicate logic. Let's merge mobile into renderInventoryContent -->").join("")}
                <!-- Actually, let's let renderInventoryContent handle ALL content including mobile -->
            </div>
            <div id="inventory-content-container"></div>
        </div>
    </div>
                </div>
    `),this.renderInventoryCart();const l=document.getElementById("inventory-filters-container");l&&(l.innerHTML=`
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
                    <h3 class="font-bold text-brand-dark mb-4 flex items-center gap-2"><i class="ph-bold ph-funnel text-slate-400"></i> Filtros</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">Ordenar por</label>
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
                                ${e.map(d=>`<option value="${d}" ${this.state.filterGenre===d?"selected":""}>${d}</option>`).join("")}
                            </select>
                        </div>
                         <div>
                            <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">Label Disquería</label>
                            <select onchange="app.state.filterStorage = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todas</option>
                                ${n.map(d=>`<option value="${d}" ${this.state.filterStorage===d?"selected":""}>${d}</option>`).join("")}
                            </select>
                        </div>
                         <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Sello (Discogs)</label>
                            <select onchange="app.state.filterLabel = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todos</option>
                                ${o.map(d=>`<option value="${d}" ${this.state.filterLabel===d?"selected":""}>${d}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Dueño</label>
                            <select onchange="app.state.filterOwner = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todos</option>
                                ${s.map(d=>`<option value="${d}" ${this.state.filterOwner===d?"selected":""}>${d}</option>`).join("")}
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
    `);const i=document.getElementById("inventory-content-container");i&&this.renderInventoryContent(i,a,e,s,n)},getStatusBadge(t){return`<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${{NM:"bg-green-100 text-green-700 border-green-200","VG+":"bg-blue-100 text-blue-700 border-blue-200",VG:"bg-yellow-100 text-yellow-700 border-yellow-200",G:"bg-orange-100 text-orange-700 border-orange-200",B:"bg-red-100 text-red-700 border-red-200",S:"bg-purple-100 text-purple-700 border-purple-200"}[t]||"bg-slate-100 text-slate-600 border-slate-200"}"> ${t}</span> `},renderCharts(t,e){const s=this.state.filterMonths;this.state.filterYear;const o=[],n=[],a=[];s.forEach(l=>{o.push(this.getMonthName(l).substring(0,3));const i=t.filter(c=>new Date(c.date).getMonth()===l).reduce((c,b)=>c+b.total,0),d=e.filter(c=>new Date(c.date).getMonth()===l).reduce((c,b)=>c+b.amount,0);n.push(i),a.push(d)});const r={};t.forEach(l=>{r[l.genre]=(r[l.genre]||0)+l.quantity}),new Chart(document.getElementById("financeChart"),{type:"bar",data:{labels:o,datasets:[{label:"Ventas",data:n,backgroundColor:"#F05A28",borderRadius:6},{label:"Gastos",data:a,backgroundColor:"#94a3b8",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom"}},scales:{y:{grid:{color:"#f1f5f9"},beginAtZero:!0},x:{grid:{display:!1}}}}})},renderDashboardCharts(t=[]){var d,c,b;const e=t.length>0?t:this.state.sales,s=(p,u)=>({type:"doughnut",data:{labels:Object.keys(p),datasets:[{data:Object.values(p),backgroundColor:["#F05A28","#FDE047","#8b5cf6","#10b981","#f43f5e","#64748b"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{boxWidth:10,font:{size:10}}}}}}),o={};e.forEach(p=>{const u=p.genre||"Desconocido";o[u]=(o[u]||0)+p.quantity}),this.genreChartInstance&&this.genreChartInstance.destroy();const n=(d=document.getElementById("genreChart"))==null?void 0:d.getContext("2d");n&&(this.genreChartInstance=new Chart(n,s(o)));const a={};e.forEach(p=>{const u=p.paymentMethod||"Desconocido";a[u]=(a[u]||0)+p.quantity}),this.paymentChartInstance&&this.paymentChartInstance.destroy();const r=(c=document.getElementById("paymentChart"))==null?void 0:c.getContext("2d");r&&(this.paymentChartInstance=new Chart(r,s(a)));const l={};e.forEach(p=>{const u=p.channel||"Local";l[u]=(l[u]||0)+p.quantity}),this.channelChartInstance&&this.channelChartInstance.destroy();const i=(b=document.getElementById("channelChart"))==null?void 0:b.getContext("2d");i&&(this.channelChartInstance=new Chart(i,s(l)))},updateFilter(t,e){t==="month"&&(this.state.filterMonth=parseInt(e)),t==="year"&&(this.state.filterYear=parseInt(e)),this.renderDashboard(document.getElementById("app-content"))},renderSales(t){var b;const e=this.state.filterYear,s=this.state.filterMonths,o=((b=document.getElementById("sales-payment-filter"))==null?void 0:b.value)||"all",n=this.state.salesHistorySearch.toLowerCase(),a=this.state.sales.filter(p=>{const u=new Date(p.date),x=u.getFullYear()===e&&s.includes(u.getMonth()),h=o==="all"||p.paymentMethod===o,f=!n||p.items&&p.items.some(y=>{const m=y.record||{};return(m.album||"").toLowerCase().includes(n)||(m.artist||"").toLowerCase().includes(n)||(m.sku||"").toLowerCase().includes(n)});return x&&h&&f}),r=a.reduce((p,u)=>p+(parseFloat(u.total)||0),0),l=a.reduce((p,u)=>{const x=parseFloat(u.total)||0;let h=0;return u.items&&Array.isArray(u.items)?h=u.items.reduce((f,y)=>{var w;const m=parseFloat(y.costAtSale||((w=y.record)==null?void 0:w.cost)||0),g=parseInt(y.quantity||y.qty)||1;return f+m*g},0):h=(parseFloat(u.cost)||0)*(parseInt(u.quantity)||1),p+(x-h)},0),i=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],d=`
    <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 pt-6">
                <!--Header & Filters-->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 class="font-display text-2xl font-bold text-brand-dark">Gestión de Ventas</h2>
                        <p class="text-xs text-slate-500">Periodo: <span class="font-bold text-brand-orange">${s.map(p=>this.getMonthName(p)).join(", ")} ${e}</span></p>
                    </div>
                    
                    <!-- Date Selectors -->
                    <div class="flex flex-col gap-2 mt-4 md:mt-0">
                         <div class="flex gap-2 bg-white p-1 rounded-lg border border-orange-100 shadow-sm">
                            <select id="sales-year" onchange="app.updateFilter('year', this.value)" class="bg-transparent text-sm font-medium text-slate-600 p-2 outline-none">
                                <option value="2026" ${this.state.filterYear===2026?"selected":""}>2026</option>
                            </select>
                        </div>
                        <div class="flex flex-wrap gap-1 max-w-md justify-end">
                            ${i.map((p,u)=>`
                                <button onclick="app.toggleMonthFilter(${u})" 
                                    class="px-2 py-1 rounded text-[10px] font-bold transition-all ${s.includes(u)?"bg-brand-orange text-white":"bg-white border border-orange-100 text-slate-400 hover:text-brand-orange"}">
                                    ${p}
                                </button>
                            `).join("")}
                        </div>
                    </div>
                </div>
                
                
                 <!--Sales Summary Cards(Moved to Top)-->
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-brand-orange text-white p-5 rounded-2xl shadow-lg shadow-brand-orange/20 relative overflow-hidden">
                        <div class="relative z-10">
                            <p class="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1">Ventas Totales</p>
                            <h3 class="text-3xl font-display font-bold">${this.formatCurrency(r)}</h3>
                        </div>
                        <i class="ph-fill ph-trend-up absolute -right-4 -bottom-4 text-8xl text-white/10"></i>
                    </div>
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden">
                        <div class="relative z-10">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Ganancia Neta</p>
                            <h3 class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(l)}</h3>
                        </div>
                        <i class="ph-fill ph-coins absolute -right-4 -bottom-4 text-8xl text-brand-orange/5"></i>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-5 gap-8">
                <!-- Left Column: Forms & Cart (WIDER: col-span-2) -->
                <div class="md:col-span-2 space-y-6">
                    
                    <!-- 1. CART WIDGET (Priority if items exist) -->
                    ${this.state.cart.length>0?`
                        <div id="cart-widget-sales" class="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
                            <div class="flex justify-between items-center mb-3">
                                <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                    <i class="ph-fill ph-shopping-cart text-brand-orange"></i> Carrito 
                                    <span class="bg-brand-orange text-white text-xs px-2 py-0.5 rounded-full">${this.state.cart.length}</span>
                                </h3>
                                <button onclick="app.clearCart(); app.renderSales(document.getElementById('app-content'))" class="text-xs text-red-500 font-bold hover:underline">Vaciar</button>
                            </div>
                            
                            <!-- Cart Items List -->
                            <div class="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar px-1">
                                ${this.state.cart.map((p,u)=>`
                                    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <div class="truncate pr-2">
                                            <p class="font-bold text-xs text-brand-dark truncate">${p.album}</p>
                                            <p class="text-[10px] text-slate-500 truncate">${p.artist}</p>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold text-xs text-brand-orange">${this.formatCurrency(p.price)}</span>
                                            <button onclick="app.removeFromCart(${u}); app.renderSales(document.getElementById('app-content'))" class="text-slate-400 hover:text-red-500">
                                                <i class="ph-bold ph-x"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join("")}
                            </div>

                            <!-- Cart Total -->
                            <div class="pt-3 border-t border-slate-100 flex justify-between items-center mb-4">
                                <span class="text-sm font-bold text-slate-500">Total a Pagar</span>
                                <span class="font-display font-bold text-brand-dark text-xl">${this.formatCurrency(this.state.cart.reduce((p,u)=>p+u.price,0))}</span>
                            </div>

                            <!-- Checkout Form (Embedded) -->
                            <div class="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p class="text-xs font-bold text-slate-400 uppercase mb-2">Datos de Venta</p>
                                
                                <input type="text" id="cart-customer-name" placeholder="Cliente (Opcional)" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-orange outline-none">
                                <input type="email" id="cart-customer-email" placeholder="Email (Opcional)" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-orange outline-none">
                                
                                <div class="grid grid-cols-2 gap-2">
                                    <select id="cart-payment" class="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-orange outline-none">
                                        <option value="MobilePay">MobilePay</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                    </select>
                                    <select id="cart-channel" class="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-orange outline-none">
                                        <option value="Tienda">Tienda</option>
                                        <option value="Discogs">Discogs</option>
                                        <option value="Feria">Feria</option>
                                    </select>
                                </div>
                                <div class="flex items-center gap-2">
                                    <input type="checkbox" id="cart-invoice" class="rounded text-brand-orange focus:ring-brand-orange">
                                    <label for="cart-invoice" class="text-xs text-slate-500">Solicitar Factura</label>
                                </div>
                            </div>

                            <button onclick="app.handleSalesViewCheckout()" class="w-full mt-4 py-3 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 text-sm hover:scale-[1.02] transition-transform">
                                <i class="ph-bold ph-check"></i> Confirmar Venta (${this.state.cart.length})
                            </button>
                        </div>
                    `:`
                        <!-- 2. MANUAL SALE FORM (If Cart is Empty) -->
                         <div class="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden">
                            <div class="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <i class="ph-fill ph-cash-register text-6xl text-brand-orange"></i>
                            </div>
                            <h3 class="font-bold text-lg mb-4 text-brand-dark relative z-10">Registrar Venta</h3>
                            
                            <form onsubmit="app.handleSaleSubmit(event)" class="space-y-4 relative z-10">
                                <!-- Hidden Inputs for Manual Logic -->
                                <input type="hidden" name="sku" id="input-sku">
                                <input type="hidden" name="genre" id="input-genre">
                                <input type="hidden" name="artist" id="input-artist">
                                <input type="hidden" name="album" id="input-album">
                                <input type="hidden" name="owner" id="input-owner">

                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Producto / Concepto</label>
                                    <div class="relative">
                                        <input type="text" id="sku-search" oninput="app.searchSku(this.value)" onblur="setTimeout(() => document.getElementById('sku-results').classList.add('hidden'), 200)"
                                            placeholder="Buscar o escribir concepto..." 
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm font-medium">
                                        <div id="sku-results" class="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg hidden z-50 max-h-48 overflow-y-auto"></div>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Precio</label>
                                        <div class="relative">
                                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                            <input type="number" name="price" required min="0" step="0.01" onchange="app.updateTotal()" id="input-price"
                                                class="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm font-bold">
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Costo</label>
                                         <div class="relative">
                                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                            <input type="number" name="cost" id="input-cost" value="0" min="0" step="0.01"
                                                class="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha</label>
                                        <input type="date" name="date" required value="${new Date().toISOString().split("T")[0]}"
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ctd.</label>
                                        <input type="number" name="quantity" value="1" min="1" required onchange="app.updateTotal()" id="input-qty"
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-2 gap-4">
                                     <select name="paymentMethod" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                                        <option value="MobilePay">MobilePay</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                    </select>
                                    <select name="soldAt" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                                        <option>Tienda</option>
                                        <option>Discogs</option>
                                        <option>Feria</option>
                                    </select>
                                </div>

                                <div class="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p class="text-xs font-bold text-slate-400 uppercase mb-2">Datos del Cliente (Opcional)</p>
                                    <div class="grid grid-cols-2 gap-2">
                                        <input type="text" name="customerName" placeholder="Nombre del Cliente" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-orange outline-none">
                                        <input type="email" name="customerEmail" placeholder="Email" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-orange outline-none">
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <input type="checkbox" name="requestInvoice" id="check-invoice-manual" class="w-4 h-4 text-brand-orange rounded border-slate-300 focus:ring-brand-orange">
                                        <label for="check-invoice-manual" class="text-xs text-slate-500 font-medium">Solicitar Factura</label>
                                    </div>
                                </div>

                                    <button type="submit" id="btn-submit-sale" class="w-full py-3 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
                                        <i class="ph-bold ph-plus"></i> Registrar Venta Manual <span id="form-total" class="ml-2 font-mono bg-white/10 px-2 rounded">$0.00</span>
                                    </button>
                                </form>
                        </div>
                    `}

                    <!-- Partners Summary (Below Form/Cart) -->
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                        <h3 class="font-bold text-lg mb-4 text-brand-dark">Resumen de Socios</h3>
                         <div class="space-y-4">
                            ${["El Cuartito",...this.state.consignors.map(p=>p.name)].map(p=>{const u=this.state.inventory.filter(m=>m.owner===p).reduce((m,g)=>m+g.stock,0),x=a.reduce((m,g)=>{if(g.owner===p){const w=g.items&&Array.isArray(g.items)?g.items.reduce(($,k)=>$+(parseInt(k.quantity||k.qty)||1),0):parseInt(g.quantity)||1;return m+w}return g.items&&Array.isArray(g.items)?m+g.items.filter(w=>w.owner===p).length:m},0),h=u+x,f=h>0?u/h*100:0,y=h>0?x/h*100:0;return`
                                    <div>
                                        <div class="flex justify-between items-end mb-1">
                                            <span class="font-bold text-sm text-brand-dark">${p}</span>
                                            <span class="text-xs text-slate-500">Stock: ${u} | Vendidos: ${x}</span>
                                        </div>
                                        <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                            <div style="width: ${f}%" class="h-full bg-blue-500"></div>
                                            <div style="width: ${y}%" class="h-full bg-brand-orange"></div>
                                        </div>
                                    </div>
                                `}).join("")}
                        </div>
                    </div>
                </div>

                <!-- Right Column: History & Stats (col-span-3) -->
                <div class="md:col-span-3 space-y-6">
                        <!-- Summary Cards removed from here -->

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
                                        <option value="all" ${o==="all"?"selected":""}>Todos</option>
                                        <option value="MobilePay" ${o==="MobilePay"?"selected":""}>MobilePay</option>
                                        <option value="Efectivo" ${o==="Efectivo"?"selected":""}>Efectivo</option>
                                        <option value="Tarjeta" ${o==="Tarjeta"?"selected":""}>Tarjeta</option>
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
                                            <th class="p-4 text-center">Estado</th>
                                            <th class="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-orange-50">
                                        ${a.sort((p,u)=>{const x=p.date&&p.date.toDate?p.date.toDate():new Date(p.date);return(u.date&&u.date.toDate?u.date.toDate():new Date(u.date))-x}).map(p=>{var u,x;return`
                                            <tr class="hover:bg-orange-50/30 transition-colors cursor-pointer" onclick="app.openSaleDetailModal('${p.id}')">
                                                <td class="p-4 text-xs text-slate-500 whitespace-nowrap">
                                                    ${this.formatDate(p.date)}
                                                    <span class="block text-[10px] text-slate-400">${new Date(p.date).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                                                </td>
                                                <td class="p-4">
                                                    <div class="flex flex-col">
                                                        ${p.items&&p.items.length>0?p.items.length===1?`<span class="font-bold text-brand-dark text-sm truncate max-w-[180px]">${p.items[0].album||((u=p.items[0].record)==null?void 0:u.album)||"Desconocido"}</span>
                     <span class="text-[10px] text-slate-400 truncate max-w-[180px]">${p.items[0].artist||((x=p.items[0].record)==null?void 0:x.artist)||"-"}</span>`:`<span class="font-bold text-brand-dark text-sm truncate max-w-[180px]">${p.items.length} items</span>
                     <span class="text-[10px] text-slate-400 truncate max-w-[180px]">${p.items.map(h=>{var f;return h.album||((f=h.record)==null?void 0:f.album)}).filter(Boolean).join(", ")}</span>`:`<span class="font-bold text-brand-dark text-sm truncate max-w-[180px]">${p.album||"Venta Manual"}</span>
                 <span class="text-[10px] text-slate-400 truncate max-w-[180px]">${p.artist||"-"}</span>`}
                                                    </div>
                                                </td>
                                                <td class="p-4 text-center text-sm text-slate-600">${p.quantity||(p.items?p.items.reduce((h,f)=>h+(parseInt(f.quantity||f.qty)||1),0):1)}</td>
                                                <td class="p-4 text-right font-bold text-brand-dark">${this.formatCurrency(p.total)}</td>
                                                <td class="p-4 text-center">
                                                    <span class="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wide">${p.paymentMethod}</span>
                                                </td>
                                                <td class="p-4 text-center">
                                                    ${p.status==="shipped"?`
                                                        <span class="px-2 py-1 rounded bg-green-100 text-[10px] font-bold text-green-600 uppercase tracking-wide">Enviado</span>
                                                    `:p.status==="completed"||p.status==="paid"?`
                                                        <span class="px-2 py-1 rounded bg-blue-100 text-[10px] font-bold text-blue-600 uppercase tracking-wide">Pagado</span>
                                                    `:`
                                                        <span class="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wide">${p.status||"Pendiente"}</span>
                                                    `}
                                                </td>
                                                <td class="p-4 text-center" onclick="event.stopPropagation()">
                                                    <button onclick="app.deleteSale('${p.id}')" class="text-slate-300 hover:text-red-500 transition-colors" title="Eliminar Venta">
                                                        <i class="ph-fill ph-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `}).join("")}
                                        ${a.length===0?`
                                            <tr>
                                                <td colspan="6" class="p-8 text-center text-slate-400 italic">No hay ventas registradas en este periodo.</td>
                                            </tr>
                                        `:""}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    `;t.innerHTML=d;const c=t.querySelector('input[placeholder="Buscar en historial..."]');c&&(c.focus(),c.setSelectionRange(c.value.length,c.value.length))},searchSku(t){const e=document.getElementById("sku-results");if(t.length<2){e.classList.add("hidden");return}const s=this.state.inventory.filter(o=>o.artist.toLowerCase().includes(t.toLowerCase())||o.album.toLowerCase().includes(t.toLowerCase())||o.sku.toLowerCase().includes(t.toLowerCase()));s.length>0?(e.innerHTML=s.map(o=>`
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
    `).join(""),e.classList.remove("hidden")):e.classList.add("hidden")},selectSku(t){const e=this.state.inventory.find(d=>d.sku===t);if(!e)return;const s=document.getElementById("input-price"),o=document.getElementById("input-qty");document.getElementById("form-total"),s&&(s.value=e.price),o&&(o.value=1),document.getElementById("input-sku").value=e.sku,document.getElementById("input-cost").value=e.cost,document.getElementById("input-genre").value=e.genre,document.getElementById("input-artist").value=e.artist,document.getElementById("input-album").value=e.album,document.getElementById("input-owner").value=e.owner,setTimeout(()=>{const d=document.getElementById("sku-results");d&&d.classList.add("hidden")},200);const n=document.getElementById("sku-search");n&&(n.value=`${e.artist} - ${e.album} `),this.updateTotal();const a=document.getElementById("btn-submit-sale"),r=document.getElementById("btn-submit-sale-modal"),l=e.stock<=0,i=d=>{d&&(l?(d.disabled=!0,d.classList.add("opacity-50","cursor-not-allowed"),d.innerHTML='<i class="ph-bold ph-warning"></i> Sin Stock'):(d.disabled=!1,d.classList.remove("opacity-50","cursor-not-allowed"),d.innerHTML='<i class="ph-bold ph-check"></i> Registrar Venta'))};i(a),i(r),l&&this.showToast("⚠️ Producto sin stock")},updateTotal(){const t=parseFloat(document.getElementById("input-price").value)||0,e=parseInt(document.getElementById("input-qty").value)||1,s=t*e;document.getElementById("form-total").innerText=this.formatCurrency(s)},openAddVinylModal(t=null){let e={sku:"",artist:"",album:"",genre:"Minimal",status:"NM",price:"",cost:"",stock:1,owner:"El Cuartito"},s=!1;if(t){const r=this.state.inventory.find(l=>l.sku===t);r&&(e=r,s=!0)}if(!s){const r=this.state.inventory.map(i=>{const d=i.sku.match(/^SKU\s*-\s*(\d+)/);return d?parseInt(d[1]):0}),l=Math.max(0,...r);e.sku=`SKU-${String(l+1).padStart(3,"0")}`}const o=["Minimal","Techno","House","Deep House","Electro"],n=[...new Set([...o,...this.state.customGenres||[]])],a=`
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
                                <input type="text" id="discogs-search-input" onkeypress="if(event.key === 'Enter') app.searchDiscogs()" placeholder="Catálogo, Artista..." class="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm shadow-sm font-medium">
                                    <button onclick="app.searchDiscogs()" class="bg-brand-dark text-white w-10 rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-brand-dark/20">
                                        <i class="ph-bold ph-magnifying-glass"></i>
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
                                                    <select name="status" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-orange outline-none text-sm font-bold">
                                                        <option value="M" ${e.status==="M"?"selected":""}>Mint (M)</option>
                                                        <option value="NM" ${e.status==="NM"?"selected":""}>Near Mint (NM)</option>
                                                        <option value="VG+" ${e.status==="VG+"?"selected":""}>Very Good Plus (VG+)</option>
                                                        <option value="VG" ${e.status==="VG"?"selected":""}>Very Good (VG)</option>
                                                        <option value="G+" ${e.status==="G+"?"selected":""}>Good Plus (G+)</option>
                                                        <option value="G" ${e.status==="G"?"selected":""}>Good (G)</option>
                                                        <option value="F" ${e.status==="F"?"selected":""}>Fair (F)</option>
                                                        <option value="P" ${e.status==="P"?"selected":""}>Poor (P)</option>
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
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Costo</label>
                                                    <input name="cost" id="modal-cost" type="number" step="0.5" value="${e.cost}" required oninput="app.handleCostChange()" class="w-full bg-white border border-slate-200 rounded-xl p-2 focus:border-brand-orange outline-none text-center shadow-sm text-sm font-bold text-slate-600">
                                                </div>
                                                <div>
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ganancia %</label>
                                                    <input name="margin" id="modal-margin" type="number" step="1" value="30" oninput="app.handleMarginChange()" class="w-full bg-white border border-slate-200 rounded-xl p-2 focus:border-brand-orange outline-none text-center shadow-sm text-sm font-bold text-brand-orange">
                                                </div>
                                                <div>
                                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Precio Final</label>
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

                            <div class="pt-4 flex gap-3">
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openAddVinylModal('${e.sku}')" class="flex-1 bg-brand-dark text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/20">
                                    <i class="ph-bold ph-pencil-simple"></i>
                                    Editar
                                </button>
                                ${e.discogsUrl?`<a href="${e.discogsUrl}" target="_blank" class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                                    <i class="ph-bold ph-disc"></i> Discogs
                                   </a>`:`<a href="https://www.discogs.com/search/?q=${encodeURIComponent(e.artist+" "+e.album)}&type=release" target="_blank" class="flex-1 bg-slate-50 text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                                    <i class="ph-bold ph-magnifying-glass"></i> Buscar
                                   </a>`}
                                <button onclick="document.getElementById('modal-overlay').remove(); app.openTracklistModal('${e.sku}')" class="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border border-indigo-100">
                                    <i class="ph-bold ph-list-numbers"></i> Tracks
                                </button>
                                <button onclick="app.addToCart('${e.sku}'); document.getElementById('modal-overlay').remove()" class="flex-1 bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20">
                                    <i class="ph-bold ph-shopping-cart"></i>
                                    Vender (Carrito)
                                </button>
                                <button onclick="app.deleteVinyl('${e.sku}'); document.getElementById('modal-overlay').remove()" class="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm" title="Eliminar Disco">
                                    <i class="ph-bold ph-trash text-xl"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                `;document.body.insertAdjacentHTML("beforeend",o)}catch(e){console.error("Error opening product modal:",e),alert("Hubo un error al abrir la ficha. Por favor recarga la página.")}},handleCostChange(){const t=parseFloat(document.getElementById("modal-cost").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),o=document.getElementById("modal-margin"),n=document.getElementById("modal-price");if(s){const a=parseFloat(s)/100;if(a>0){const r=t/a;n.value=Math.ceil(r)}}else{const r=1-(parseFloat(o.value)||0)/100;if(r>0){const l=t/r;n.value=Math.ceil(l)}}},handlePriceChange(){const t=parseFloat(document.getElementById("modal-price").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),o=document.getElementById("modal-margin"),n=document.getElementById("modal-cost"),a=document.getElementById("cost-helper");if(s){const r=parseFloat(s)/100,l=t*r;n.value=Math.round(l),o.value=100-parseFloat(s),o.readOnly=!0,o.classList.add("opacity-50"),a&&(a.innerText=`Consignación: ${s}% Socio`)}else{const r=parseFloat(n.value)||0;if(r>0&&t>0){const l=(t-r)/r*100;o.value=Math.round(l)}o.readOnly=!1,o.classList.remove("opacity-50"),a&&(a.innerText="Modo Propio: Margen variable")}},handleMarginChange(){const t=parseFloat(document.getElementById("modal-margin").value)||0,e=parseFloat(document.getElementById("modal-cost").value)||0,s=document.getElementById("modal-price");if(e>0){const o=e*(1+t/100);s.value=Math.ceil(o)}},checkCustomInput(t,e){const s=document.getElementById(e);t.value==="other"?(s.classList.remove("hidden"),s.querySelector("input").required=!0,s.querySelector("input").focus()):(s.classList.add("hidden"),s.querySelector("input").required=!1)},toggleCollectionNote(t){const e=document.getElementById("collection-note-container");e&&t&&t!==""?e.classList.remove("hidden"):e&&e.classList.add("hidden")},handleCollectionChange(t){var o;const e=document.getElementById("custom-collection-container"),s=document.getElementById("collection-note-container");t==="other"?(e==null||e.classList.remove("hidden"),(o=e==null?void 0:e.querySelector("input"))==null||o.focus()):e==null||e.classList.add("hidden"),t&&t!==""?s==null||s.classList.remove("hidden"):s==null||s.classList.add("hidden")},openAddSaleModal(){const t=this.state.cart.length>0?this.state.cart.map(s=>`
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

                                                                <div class="grid grid-cols-2 gap-4">
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
                                                    `;document.body.insertAdjacentHTML("beforeend",e),setTimeout(()=>document.getElementById("sku-search").focus(),100)},addToCart(t,e){e&&e.stopPropagation(),this.openAddSaleModal(),setTimeout(()=>{const s=document.getElementById("sku-search");s.value=t,this.searchSku(t),setTimeout(()=>{const o=document.getElementById("sku-results").firstElementChild;o&&o.click()},500)},200)},openSaleDetailModal(t){var o,n;const e=this.state.sales.find(a=>a.id===t);if(!e)return;new Date(e.date);const s=`
                                                    <div id="sale-detail-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                                                        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                                                            <div class="bg-brand-dark p-6 text-white relative">
                                                                <button onclick="document.getElementById('sale-detail-modal').remove()" class="absolute top-4 right-4 text-white/70 hover:text-white">
                                                                    <i class="ph-bold ph-x text-2xl"></i>
                                                                </button>
                                                                <h2 class="font-display font-bold text-2xl mb-1">Detalle de Venta</h2>
                                                                <div class="flex items-center gap-2">
                                                                    <p class="text-brand-orange font-bold text-sm uppercase tracking-wider">#${e.id.slice(0,8)}</p>
                                                                    ${e.status==="shipped"?`
                                                                        <span class="px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">Enviado</span>
                                                                    `:e.status==="ready_for_pickup"?`
                                                                        <span class="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">Listo Retiro</span>
                                                                    `:e.status==="completed"||e.status==="paid"?`
                                                                        <span class="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">Pagado</span>
                                                                    `:""}
                                                                </div>
                                                            </div>

                                                                <!-- Customer & Shipping Info Section -->
                                                                <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                                                    <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                        <i class="ph-bold ph-user-circle text-base text-brand-orange"></i> Datos de Envío / Retiro
                                                                    </h3>
                                                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div class="md:col-span-2">
                                                                            <label class="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Nombre Completo</label>
                                                                            <p class="font-bold text-brand-dark flex items-center gap-2">
                                                                                ${this.getCustomerInfo(e).name}
                                                                                ${e.channel==="online"?'<span class="px-1.5 py-0.5 rounded bg-brand-orange/10 text-[9px] text-brand-orange">Comprador Web</span>':""}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <label class="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Email</label>
                                                                            <p class="text-sm text-brand-dark font-medium">${this.getCustomerInfo(e).email}</p>
                                                                        </div>
                                                                        <div>
                                                                            <label class="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Teléfono</label>
                                                                            <p class="text-sm text-brand-dark font-medium">${((o=e.customer)==null?void 0:o.phone)||"-"}</p>
                                                                        </div>
                                                                        <div class="md:col-span-2 pt-2 border-t border-slate-200/50">
                                                                            <label class="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Dirección de Entrega</label>
                                                                            <p class="text-sm text-brand-dark font-bold">${this.getCustomerInfo(e).address}</p>
                                                                            <p class="text-xs text-slate-500 font-medium">${e.postalCode||""} ${e.city||""}, ${e.country||""}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <!-- Shipmondo / Manual Tracking Status -->
                                                                ${e.shipment?`
                                                                    <div class="bg-orange-50 p-4 rounded-xl border border-orange-100 flex justify-between items-center animate-fade-in">
                                                                        <div>
                                                                            <label class="text-[10px] font-bold text-brand-orange uppercase block mb-0.5">Estado del Envío</label>
                                                                            <p class="text-sm font-bold text-brand-dark flex items-center gap-2">
                                                                                <i class="ph-bold ph-package text-brand-orange"></i>
                                                                                ${e.shipment.tracking_number}
                                                                            </p>
                                                                            <p class="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">${e.shipment.carrier} • ${new Date((n=e.shipment.created_at)!=null&&n.toDate?e.shipment.created_at.toDate():e.shipment.created_at).toLocaleDateString()}</p>
                                                                        </div>
                                                                        <a href="${e.shipment.label_url||`https://app.shipmondo.com/tracking/${e.shipment.tracking_number}`}" target="_blank" class="bg-white p-3 rounded-xl border border-orange-200 text-brand-orange hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all shadow-sm" title="Seguir Envío">
                                                                            <i class="ph-bold ph-magnifying-glass text-xl"></i>
                                                                        </a>
                                                                    </div>
                                                                `:e.status==="ready_for_pickup"?`
                                                                    <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4 animate-fade-in">
                                                                        <div class="bg-blue-500 text-white p-3 rounded-xl shadow-blue-200 shadow-lg">
                                                                            <i class="ph-bold ph-storefront text-2xl"></i>
                                                                        </div>
                                                                        <div>
                                                                            <label class="text-[10px] font-bold text-blue-500 uppercase block mb-0.5">Estado de Retiro</label>
                                                                            <p class="text-sm font-bold text-brand-dark uppercase">Listo para Retirar en Local</p>
                                                                            <p class="text-[10px] text-slate-500 font-medium">El cliente fue notificado por email.</p>
                                                                        </div>
                                                                    </div>
                                                                `:""}

                                                                <!-- Actions Section -->
                                                                <div class="flex flex-col gap-3 py-4 border-t border-slate-100">
                                                                    <div class="flex gap-3">
                                                                        ${!e.shipment&&e.customerEmail&&(e.status==="completed"||e.status==="paid")?`
                                                                            <button onclick="app.setReadyForPickup('${e.id}')" class="flex-1 py-4 bg-orange-100 text-brand-orange font-black rounded-2xl hover:bg-orange-500 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                                                                                <i class="ph-bold ph-storefront text-lg"></i> Listo para Retiro
                                                                            </button>
                                                                        `:""}
                                                                        
                                                                        ${!e.shipment&&e.customerEmail&&(e.status==="completed"||e.status==="paid"||e.status==="ready_for_pickup")?`
                                                                            <button onclick="app.manualShipOrder('${e.id}')" class="flex-1 py-4 bg-brand-dark text-white font-black rounded-2xl hover:bg-slate-800 transition-all transform hover:-translate-y-1 shadow-md flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                                                                                <i class="ph-bold ph-truck text-lg"></i> ${e.status==="ready_for_pickup"?"Finalmente Enviado":"Enviar por Correo"}
                                                                            </button>
                                                                        `:""}
                                                                    </div>

                                                                    <div class="flex gap-3">
                                                                        <button onclick="document.getElementById('sale-detail-modal').remove()" class="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs uppercase tracking-widest">
                                                                            Cerrar
                                                                        </button>
                                                                        <button onclick="app.deleteSale('${e.id}'); document.getElementById('sale-detail-modal').remove()" class="px-4 py-3 text-red-400 hover:text-red-600 transition-colors text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100">
                                                                            Eliminar
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},navigateInventoryFolder(t,e){t==="genre"&&(this.state.filterGenre=e),t==="owner"&&(this.state.filterOwner=e),t==="label"&&(this.state.filterLabel=e),t==="storage"&&(this.state.filterStorage=e),this.refreshCurrentView()},toggleSelection(t){this.state.selectedItems.has(t)?this.state.selectedItems.delete(t):this.state.selectedItems.add(t),this.refreshCurrentView()},openPrintLabelModal(t){const e=this.state.inventory.find(o=>o.sku===t);if(!e)return;const s=`
                                                    <div id="print-label-modal" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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

                                                        <!-- Injected Print Styles -->
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
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},toggleSelectAll(){this.state.filterYear;const t=this.state.inventorySearch.toLowerCase(),e=this.state.inventory.filter(s=>{const o=this.state.filterGenre==="all"||s.genre===this.state.filterGenre,n=this.state.filterOwner==="all"||s.owner===this.state.filterOwner,a=this.state.filterLabel==="all"||s.label===this.state.filterLabel,r=this.state.filterStorage==="all"||s.storageLocation===this.state.filterStorage,l=!t||s.album.toLowerCase().includes(t)||s.artist.toLowerCase().includes(t)||s.sku.toLowerCase().includes(t);return o&&n&&a&&r&&l});this.state.selectedItems.size===e.length?this.state.selectedItems.clear():e.forEach(s=>this.state.selectedItems.add(s.sku)),this.refreshCurrentView()},addSelectionToCart(){this.state.selectedItems.forEach(t=>{const e=this.state.inventory.find(s=>s.sku===t);e&&e.stock>0&&(this.state.cart.find(s=>s.sku===t)||this.state.cart.push(e))}),this.state.selectedItems.clear(),this.showToast(`${this.state.cart.length} items agregados al carrito`),this.refreshCurrentView()},deleteSelection(){if(!confirm(`¿Estás seguro de eliminar ${this.state.selectedItems.size} productos ? `))return;const t=v.batch(),e=[];this.state.selectedItems.forEach(s=>{const o=v.collection("products").doc(s),n=this.state.inventory.find(a=>a.sku===s);n&&e.push(n),t.delete(o)}),t.commit().then(()=>{this.showToast("Productos eliminados"),e.forEach(s=>this.logInventoryMovement("DELETE",s)),this.state.selectedItems.clear()}).catch(s=>{console.error("Error logging movement:",s),alert("Error al eliminar")})},openAddExpenseModal(){const t=["Alquiler","Servicios","Marketing","Suministros","Honorarios"],s=`
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
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},async handleAddVinyl(t,e){t.preventDefault();const s=new FormData(t.target);let o=s.get("genre");o==="other"&&(o=s.get("custom_genre"));let n=s.get("collection");n==="other"&&(n=s.get("custom_collection"));const a=s.get("sku"),r=s.get("publish_webshop")==="on",l=s.get("publish_discogs")==="on",i=s.get("publish_local")==="on",d={sku:a,artist:s.get("artist"),album:s.get("album"),genre:o,genre2:s.get("genre2")||null,genre3:s.get("genre3")||null,genre4:s.get("genre4")||null,genre5:s.get("genre5")||null,label:s.get("label"),collection:n||null,collectionNote:s.get("collectionNote")||null,condition:s.get("status"),sleeveCondition:s.get("sleeveCondition")||"",comments:s.get("comments")||"",price:parseFloat(s.get("price")),cost:parseFloat(s.get("cost"))||0,stock:parseInt(s.get("stock")),storageLocation:s.get("storageLocation"),owner:s.get("owner"),is_online:r,publish_webshop:r,publish_discogs:l,publish_local:i,cover_image:s.get("cover_image")||null,created_at:firebase.firestore.FieldValue.serverTimestamp()};try{let c=null,b=null;if(e){const p=await this.findProductBySku(e);if(!p){this.showToast("❌ Producto no encontrado","error");return}b=p.data,c=p.id,await p.ref.update(d),this.showToast("✅ Disco actualizado")}else c=(await v.collection("products").add(d)).id,this.showToast("✅ Disco agregado al inventario");if(l){const p=s.get("discogs_release_id");if(b&&b.discogs_listing_id)try{const x=await(await fetch(`https://el-cuartito-completo.onrender.com/discogs/update-listing/${b.discogs_listing_id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({product:d})})).json();if(x.success)this.showToast("💿 Listing de Discogs actualizado");else throw new Error(x.error||"Error desconocido")}catch(u){console.error("Error updating Discogs listing:",u),this.showToast(`⚠️ Error Discogs: ${u.message}`,"error")}else if(p)try{const x=await(await fetch("https://el-cuartito-completo.onrender.com/discogs/create-listing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({releaseId:parseInt(p),product:d})})).json();if(x.success&&x.listingId)await v.collection("products").doc(c).update({discogs_listing_id:String(x.listingId),discogs_release_id:parseInt(p)}),this.showToast("💿 Publicado en Discogs correctamente");else throw new Error(x.error||"Error desconocido")}catch(u){console.error("Error creating Discogs listing:",u);let x=u.message;(x.toLowerCase().includes("mp3")||x.toLowerCase().includes("digital")||x.toLowerCase().includes("format"))&&(x="Discogs solo permite formatos físicos (Vinyl, CD, Cassette). Este release es digital o MP3."),this.showToast(`⚠️ Error Discogs: ${x}`,"error")}else this.showToast("⚠️ Necesitas buscar el disco en Discogs primero para publicarlo","warning")}document.getElementById("modal-overlay").remove(),this.loadData()}catch(c){console.error(c),this.showToast("❌ Error: "+(c.message||"desconocido"),"error")}},deleteVinyl(t){const e=this.state.inventory.find(o=>o.sku===t);if(!e){alert("Error: Item not found");return}const s=`
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
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},async confirmDelete(t){const e=document.getElementById("delete-confirm-modal");e&&e.remove();const s=document.getElementById("modal-overlay");s&&s.remove();try{const o=await this.findProductBySku(t);if(!o){this.showToast("❌ Producto no encontrado","error");return}if(console.log("Product to delete:",o.data),console.log("Has discogs_listing_id?",o.data.discogs_listing_id),o.data.discogs_listing_id){console.log("Attempting to delete from Discogs:",o.data.discogs_listing_id);try{const n=await fetch(`https://el-cuartito-completo.onrender.com/discogs/delete-listing/${o.data.discogs_listing_id}`,{method:"DELETE"});console.log("Discogs delete response status:",n.status);const a=await n.json();console.log("Discogs delete result:",a),a.success?(console.log("Discogs listing deleted successfully"),this.showToast("💿 Eliminado de Discogs")):this.showToast("⚠️ "+(a.error||"Error en Discogs"),"warning")}catch(n){console.error("Error deleting from Discogs:",n),this.showToast("⚠️ Error eliminando de Discogs, pero continuando...","warning")}}else console.log("No discogs_listing_id found, skipping Discogs deletion");await o.ref.delete(),this.showToast("✅ Disco eliminado"),await this.loadData()}catch(o){console.error("Error removing document: ",o),this.showToast("❌ Error al eliminar: "+o.message,"error")}},handleSaleSubmit(t){var h,f,y,m,g,w,$;t.preventDefault();const e=new FormData(t.target);let s=e.get("sku");s||(s=(h=document.getElementById("input-sku"))==null?void 0:h.value);let o=parseInt(e.get("quantity"));isNaN(o)&&(o=parseInt((f=document.getElementById("input-qty"))==null?void 0:f.value)||1);let n=parseFloat(e.get("price"));isNaN(n)&&(n=parseFloat((y=document.getElementById("input-price"))==null?void 0:y.value)||0),parseFloat(e.get("cost")),e.get("date")||new Date().toISOString();const a=e.get("paymentMethod");e.get("soldAt"),e.get("comment");let r=e.get("artist");r||(r=(m=document.getElementById("input-artist"))==null?void 0:m.value);let l=e.get("album");l||(l=(g=document.getElementById("input-album"))==null?void 0:g.value);let i=e.get("genre");i||(i=(w=document.getElementById("input-genre"))==null?void 0:w.value);let d=e.get("owner");d||(d=($=document.getElementById("input-owner"))==null?void 0:$.value);const c=e.get("customerName"),b=e.get("customerEmail"),p=e.get("requestInvoice")==="on",u=this.state.inventory.find(k=>k.sku===s);if(!u){alert(`Producto con SKU "${s}" no encontrado en inventario`);return}const x={items:[{recordId:u.id,quantity:o}],paymentMethod:a||"CASH",customerName:c||"Venta Manual",customerEmail:b||null,source:"STORE"};_.createSale(x).then(()=>{this.showToast(p?"Venta registrada (Factura Solicitada)":"Venta registrada");const k=document.getElementById("modal-overlay");k&&k.remove();const C=t.target;C&&C.reset();const E=document.getElementById("form-total");E&&(E.innerText="$0.00");const D=document.getElementById("sku-search");D&&(D.value=""),this.loadData()}).catch(k=>{console.error("Error adding sale: ",k),alert("Error al registrar venta: "+(k.message||""))})},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(n=>n.sku===t);if(!s)return;if(this.state.cart.filter(n=>n.sku===t).length>=s.stock){this.showToast("⚠️ No hay más stock disponible");return}this.state.cart.push(s),document.getElementById("inventory-cart-container")?this.renderInventoryCart():this.renderCartWidget(),this.showToast("Agregado al carrito")},removeFromCart(t){this.state.cart.splice(t,1),this.renderCartWidget()},clearCart(){this.state.cart=[],this.renderCartWidget()},renderOnlineSales(t){const e=this.state.sales.filter(a=>a.channel==="online"),s=e.filter(a=>a.status==="completed"),o=e.filter(a=>a.status==="PENDING"),n=s.reduce((a,r)=>a+(parseFloat(r.total_amount||r.total)||0),0);t.innerHTML=`
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
                                ${e.map(a=>{var l;const r=(l=a.timestamp)!=null&&l.toDate?a.timestamp.toDate():new Date(a.date||0);return{...a,_sortDate:r.getTime()}}).sort((a,r)=>r._sortDate-a._sortDate).map(a=>{var u,x,h,f,y,m,g;const r=a.customer||{},l=a.orderNumber||"N/A",i=(u=a.timestamp)!=null&&u.toDate?a.timestamp.toDate():new Date(a.date),c=((x=a.completed_at)!=null&&x.toDate?a.completed_at.toDate():null)||i,b={completed:"bg-green-50 text-green-700 border-green-200",PENDING:"bg-yellow-50 text-yellow-700 border-yellow-200",failed:"bg-red-50 text-red-700 border-red-200"},p={completed:"✅ Completado",PENDING:"⏳ Pendiente",failed:"❌ Fallido"};return`
                                        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openOnlineSaleDetailModal('${a.id}')">
                                            <td class="px-6 py-4">
                                                <div class="font-mono text-sm font-bold text-brand-orange">${l}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-semibold text-brand-dark">${r.name||(r.firstName?`${r.firstName} ${r.lastName||""}`:"")||((h=r.stripe_info)==null?void 0:h.name)||"Cliente"}</div>
                                                <div class="text-xs text-slate-500">${r.email||((f=r.stripe_info)==null?void 0:f.email)||"No email"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-slate-600 truncate max-w-[200px]">
                                                    ${((y=r.shipping)==null?void 0:y.line1)||r.address||((g=(m=r.stripe_info)==null?void 0:m.shipping)==null?void 0:g.line1)||"Sin dirección"}
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
                                                    ${p[a.status]||a.status}
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
    `},openOnlineSaleDetailModal(t){var i,d,c;const e=this.state.sales.find(b=>b.id===t);if(!e)return;const s=e.customer||{},o=s.stripe_info||{},n=s.shipping||o.shipping||{},a={line1:n.line1||s.address||"Sin dirección",line2:n.line2||"",city:n.city||s.city||"",postal:n.postal_code||s.postalCode||"",country:n.country||s.country||"Denmark"},r=`
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
                                    <p class="font-bold text-brand-dark text-base">${s.name||(s.firstName?`${s.firstName} ${s.lastName||""}`:"")||((i=s.stripe_info)==null?void 0:i.name)||"Cliente"}</p>
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
                                    <span class="font-bold">${new Date((d=e.timestamp)!=null&&d.toDate?e.timestamp.toDate():(c=e.completed_at)!=null&&c.toDate?e.completed_at.toDate():e.date).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</span>
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
                                    ${(e.items||[]).map(b=>{var p,u,x;return`
                                        <tr>
                                            <td class="px-4 py-3">
                                                <p class="font-bold text-brand-dark">${b.album||((p=b.record)==null?void 0:p.album)||"Unknown"}</p>
                                                <p class="text-xs text-slate-500">${b.artist||((u=b.record)==null?void 0:u.artist)||""}</p>
                                            </td>
                                            <td class="px-4 py-3 text-center font-medium">${b.quantity||1}</td>
                                            <td class="px-4 py-3 text-right font-bold text-brand-dark">DKK ${(b.unitPrice||((x=b.record)==null?void 0:x.price)||0).toFixed(2)}</td>
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
    `;document.body.insertAdjacentHTML("beforeend",l)},renderCartWidget(){const t=document.getElementById("cart-widget");if(!t)return;const e=document.getElementById("cart-count"),s=document.getElementById("cart-items-mini"),o=document.getElementById("cart-total-mini");if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden"),e.innerText=this.state.cart.length;const n=this.state.cart.reduce((a,r)=>a+r.price,0);o.innerText=this.formatCurrency(n),s.innerHTML=this.state.cart.map((a,r)=>`
                                                                <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                                                    <div class="truncate pr-2">
                                                                        <p class="font-bold text-xs text-brand-dark truncate">${a.album}</p>
                                                                        <p class="text-[10px] text-slate-500 truncate">${a.price} kr.</p>
                                                                    </div>
                                                                    <button onclick="app.removeFromCart(${r})" class="text-red-400 hover:text-red-600">
                                                                        <i class="ph-bold ph-x"></i>
                                                                    </button>
                                                                </div>
                                                                `).join("")},openCheckoutModal(){if(this.state.cart.length===0)return;const t=this.state.cart.reduce((l,i)=>l+i.price,0),e=`
                                                                <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl transform scale-100 transition-all border border-orange-100 max-h-[90vh] overflow-y-auto">
                                                                        <div class="flex justify-between items-center mb-6">
                                                                            <h3 class="font-display text-xl font-bold text-brand-dark">Finalizar Venta (${this.state.cart.length} items)</h3>
                                                                            <button onclick="document.getElementById('modal-overlay').remove()" class="text-slate-400 hover:text-slate-600">
                                                                                <i class="ph-bold ph-x text-xl"></i>
                                                                            </button>
                                                                        </div>

                                                                        <div class="bg-orange-50/50 rounded-xl p-4 mb-6 border border-orange-100 max-h-40 overflow-y-auto custom-scrollbar">
                                                                            ${this.state.cart.map(l=>`
                            <div class="flex justify-between py-1 border-b border-orange-100/50 last:border-0 text-sm">
                                <span class="truncate pr-4 font-medium text-slate-700">${l.album}</span>
                                <span class="font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(l.price)}</span>
                            </div>
                        `).join("")}
                                                                        </div>

                                                                        <form onsubmit="app.handleCheckoutSubmit(event)" class="space-y-4">

                                                                            <!-- Customer Info -->
                                                                            <div class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                                                                                <h4 class="text-xs font-bold text-indigo-800 uppercase flex items-center gap-2">
                                                                                    <i class="ph-fill ph-user"></i> Cliente
                                                                                </h4>
                                                                                <div class="grid grid-cols-2 gap-3">
                                                                                    <div>
                                                                                        <input name="customerName" placeholder="Nombre" class="w-full bg-white border border-indigo-200 rounded-lg p-2 text-sm focus:border-indigo-500 outline-none">
                                                                                    </div>
                                                                                    <div>
                                                                                        <input name="customerEmail" type="email" placeholder="Email (para factura)" class="w-full bg-white border border-indigo-200 rounded-lg p-2 text-sm focus:border-indigo-500 outline-none">
                                                                                    </div>
                                                                                </div>
                                                                                <div class="flex items-center gap-2">
                                                                                    <input type="checkbox" name="requestInvoice" id="check-invoice-checkout" class="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500">
                                                                                        <label for="check-invoice-checkout" class="text-xs font-medium text-indigo-700">Solicitar Factura</label>
                                                                                </div>
                                                                            </div>

                                                                            <div class="grid grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha</label>
                                                                                    <input type="date" name="date" required value="${new Date().toISOString().split("T")[0]}"
                                                                                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                                                                                </div>
                                                                                <div>
                                                                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pago</label>
                                                                                    <select name="paymentMethod" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                                                                                        <option value="MobilePay">MobilePay</option>
                                                                                        <option value="Efectivo">Efectivo</option>
                                                                                        <option value="Tarjeta">Tarjeta</option>
                                                                                        <option value="Transferencia">Transferencia</option>
                                                                                        <option value="Discogs Payout">Discogs Payout</option>
                                                                                    </select>
                                                                                </div>
                                                                            </div>

                                                                            <div>
                                                                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Canal</label>
                                                                                <select name="soldAt" onchange="app.onCheckoutChannelChange(this.value)" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                                                                                    <option value="Tienda">Tienda</option>
                                                                                    <option value="Discogs">Discogs</option>
                                                                                    <option value="Feria">Feria</option>
                                                                                </select>
                                                                            </div>

                                                                            <!-- Editable Final Price -->
                                                                            <div class="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-3">
                                                                                <div class="flex items-center justify-between">
                                                                                    <label class="text-xs font-bold text-purple-800 uppercase flex items-center gap-2">
                                                                                        <i class="ph-fill ph-currency-circle-dollar"></i> Precio Final Recibido
                                                                                    </label>
                                                                                    <span class="text-xs text-purple-600 font-medium">Precio lista: ${this.formatCurrency(t)}</span>
                                                                                </div>
                                                                                <div class="relative">
                                                                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 font-bold">kr.</span>
                                                                                    <input type="number" name="finalPrice" id="checkout-final-price" step="0.01" min="0" value="${t}"
                                                                                        class="w-full pl-10 pr-3 py-3 bg-white border-2 border-purple-200 rounded-lg focus:border-purple-500 outline-none text-lg font-bold text-center">
                                                                                </div>
                                                                                
                                                                                <!-- Discogs Fee Display -->
                                                                                <div id="discogs-fee-section" class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200 hidden">
                                                                                    <span class="text-xs font-bold text-red-700 flex items-center gap-2">
                                                                                        <i class="ph-fill ph-percent"></i> Discogs Fee
                                                                                    </span>
                                                                                    <span id="discogs-fee-value" class="text-sm font-bold text-red-600">- kr. 0</span>
                                                                                </div>
                                                                            </div>

                                                                            <div id="checkout-total-display" class="flex items-center justify-between p-4 bg-brand-dark text-white rounded-xl shadow-lg shadow-brand-dark/10">
                                                                                <span class="text-sm font-medium">Total a Registrar</span>
                                                                                <span id="checkout-total-value" class="font-display font-bold text-2xl">${this.formatCurrency(t)}</span>
                                                                            </div>

                                                                            <button type="submit" class="w-full py-3.5 bg-brand-orange text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2">
                                                                                <i class="ph-bold ph-check-circle text-xl"></i>
                                                                                Confirmar Venta
                                                                            </button>
                                                                        </form>
                                                                    </div>
                                                                </div>
                                                                `;document.body.insertAdjacentHTML("beforeend",e);const s=t,o=document.getElementById("checkout-final-price"),n=document.getElementById("discogs-fee-section"),a=document.getElementById("discogs-fee-value"),r=()=>{const l=parseFloat(o.value)||0,i=s-l;document.getElementById("checkout-total-value").innerText=this.formatCurrency(l),i>0?(n.classList.remove("hidden"),a.innerText=`- kr. ${i.toFixed(0)}`):n.classList.add("hidden")};o.addEventListener("input",r)},onCheckoutChannelChange(t){},handleCheckoutSubmit(t){t.preventDefault();const e=new FormData(t.target),s=parseFloat(e.get("finalPrice"))||0,o=this.state.cart.reduce((a,r)=>a+r.price,0),n={items:this.state.cart.map(a=>({recordId:a.id,quantity:1})),paymentMethod:e.get("paymentMethod"),customerName:e.get("customerName"),customerEmail:e.get("customerEmail"),channel:e.get("soldAt")||"Tienda",source:"STORE",customTotal:s,originalTotal:o,feeDeducted:o-s};_.createSale(n).then(()=>{const a=n.channel==="Discogs"?" (Discogs listing eliminado)":"",r=n.feeDeducted>0?` | Fee: ${this.formatCurrency(n.feeDeducted)}`:"";this.showToast(`Venta de ${this.state.cart.length} items por ${this.formatCurrency(s)} registrada!${a}${r}`),this.clearCart(),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(a=>{console.error("Error checkout",a),alert("Error al procesar venta: "+a.message)})},handleSalesViewCheckout(){if(this.state.cart.length===0){this.showToast("El carrito está vacío");return}this.openCheckoutModal()},async deleteSale(t){var s;if(!confirm("¿Eliminar esta venta y restaurar stock?"))return;const e=this.state.sales.find(o=>o.id===t);if(!e){this.showToast("❌ Venta no encontrada","error");return}try{const o=v.batch(),n=v.collection("sales").doc(t);if(o.delete(n),e.items&&Array.isArray(e.items))for(const a of e.items){const r=a.productId||a.recordId,l=a.sku||((s=a.record)==null?void 0:s.sku),i=parseInt(a.quantity||a.qty)||1;let d=null;if(r)try{const c=await v.collection("products").doc(r).get();c.exists&&(d={ref:c.ref,data:c.data()})}catch{console.warn("Could not find product by ID:",r)}!d&&l&&(d=await this.findProductBySku(l)),d?o.update(d.ref,{stock:firebase.firestore.FieldValue.increment(i)}):console.warn("Could not restore stock for item:",a)}else if(e.sku){const a=await this.findProductBySku(e.sku);if(a){const r=parseInt(e.quantity)||1;o.update(a.ref,{stock:firebase.firestore.FieldValue.increment(r)})}}await o.commit(),this.showToast("✅ Venta eliminada y stock restaurado"),this.loadData()}catch(o){console.error("Error deleting sale:",o),this.showToast("❌ Error al eliminar venta: "+o.message,"error")}},renderExpenses(t){const e=["Alquiler","Servicios","Marketing","Suministros","Honorarios"],s=[...new Set([...e,...this.state.customCategories||[]])],o=(this.state.expensesSearch||"").toLowerCase(),n=this.state.expenses.filter(l=>!o||(l.description||"").toLowerCase().includes(o)||(l.category||"").toLowerCase().includes(o)),a=`
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
                                                                                                ${s.map(l=>`<option>${l}</option>`).join("")}
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
                                                                                        ${n.slice().reverse().map(l=>`
                                        <tr class="hover:bg-orange-50/30 transition-colors group">
                                            <td class="p-4 text-xs text-slate-500">${this.formatDate(l.date)}</td>
                                            <td class="p-4">
                                                <p class="text-sm font-bold text-brand-dark">${l.description}</p>
                                                <p class="text-xs text-slate-500">${l.category}</p>
                                            </td>
                                            <td class="p-4 text-right font-medium text-brand-dark">${this.formatCurrency(l.amount)}</td>
                                            <td class="p-4 text-center">
                                                ${l.hasVat?'<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Sí</span>':'<span class="text-xs bg-slate-100 text-slate-400 px-2 py-1 rounded">No</span>'}
                                            </td>
                                            <td class="p-4 text-center">
                                                <div class="flex gap-1 justify-center">
                                                    <button onclick="app.editExpense('${l.id}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-orange transition-all p-2" title="Editar">
                                                        <i class="ph-fill ph-pencil-simple"></i>
                                                    </button>
                                                    <button onclick="app.deleteExpense('${l.id}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-2" title="Eliminar">
                                                        <i class="ph-fill ph-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join("")}
                                                                                        ${n.length===0?`
                                        <tr>
                                            <td colspan="5" class="p-8 text-center text-slate-400 italic">No se encontraron gastos.</td>
                                        </tr>
                                    `:""}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `;t.innerHTML=a;const r=t.querySelector('input[placeholder="Buscar gasto..."]');r&&(r.focus(),r.setSelectionRange(r.value.length,r.value.length))},editExpense(t){if(!confirm("¿Seguro que deseas editar este gasto?"))return;const e=this.state.expenses.find(o=>o.id===t);if(!e)return;document.getElementById("expense-id").value=e.id,document.getElementById("expense-description").value=e.description,document.getElementById("expense-amount").value=e.amount,document.getElementById("hasVat").checked=e.hasVat;const s=document.getElementById("expense-category");[...s.options].some(o=>o.value===e.category)?s.value=e.category:(s.value="other",P.checkCustomInput(s,"custom-expense-category-container"),document.querySelector('[name="custom_category"]').value=e.category),document.getElementById("expense-form-title").innerText="Editar Gasto",document.getElementById("expense-submit-btn").innerText="Actualizar",document.getElementById("expense-cancel-btn").classList.remove("hidden")},resetExpenseForm(){document.getElementById("expense-form").reset(),document.getElementById("expense-id").value="",document.getElementById("expense-form-title").innerText="Nuevo Gasto",document.getElementById("expense-submit-btn").innerText="Guardar",document.getElementById("expense-cancel-btn").classList.add("hidden"),document.getElementById("custom-expense-category-container").classList.add("hidden")},handleExpenseSubmit(t){t.preventDefault();const e=new FormData(t.target);let s=e.get("category");if(s==="other"&&(s=e.get("custom_category"),this.state.customCategories||(this.state.customCategories=[]),!this.state.customCategories.includes(s))){const a=[...this.state.customCategories,s];v.collection("settings").doc("general").set({customCategories:a},{merge:!0})}const o={description:e.get("description"),category:s,amount:parseFloat(e.get("amount")),hasVat:e.get("hasVat")==="on",date:new Date().toISOString()},n=e.get("id");if(n){const a=this.state.expenses.find(r=>r.id===n);a&&(o.date=a.date),v.collection("expenses").doc(n).update(o).then(()=>{this.showToast("✅ Gasto actualizado"),this.loadData()}).catch(r=>console.error(r))}else v.collection("expenses").add(o).then(()=>{this.showToast("✅ Gasto registrado"),this.loadData()}).catch(a=>console.error(a));this.resetExpenseForm()},deleteExpense(t){confirm("¿Eliminar este gasto?")&&v.collection("expenses").doc(t).delete().then(()=>{this.showToast("✅ Gasto eliminado"),this.loadData()}).catch(e=>console.error(e))},renderConsignments(t){if(!t)return;const e=`
                                                                <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6 animate-fadeIn">
                                                                    <div class="flex justify-between items-center mb-8">
                                                                        <h2 class="font-display text-2xl font-bold text-brand-dark">Socios y Consignación</h2>
                                                                        <button onclick="app.openAddConsignorModal()" class="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                                            <i class="ph-bold ph-plus"></i>
                                                                            Nuevo Socio
                                                                        </button>
                                                                    </div>

                                                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        ${this.state.consignors.map(s=>{const o=s.name,a=this.state.inventory.filter(c=>c.owner===o).reduce((c,b)=>c+b.stock,0),r=[];this.state.sales.forEach(c=>{(c.items||[]).filter(p=>{if((p.owner||"").toLowerCase()===o.toLowerCase())return!0;const u=this.state.inventory.find(x=>x.id===(p.productId||p.recordId));return u&&(u.owner||"").toLowerCase()===o.toLowerCase()}).forEach(p=>{const u=Number(p.priceAtSale||p.unitPrice||0),x=s.agreementSplit||s.split||70,h=u*x/100;r.push({...p,id:c.id,date:c.date,cost:p.costAtSale||p.cost||h,payoutStatus:c.payoutStatus||"pending",payoutDate:c.payoutDate||null})}),(!c.items||c.items.length===0)&&(c.owner||"").toLowerCase()===o.toLowerCase()&&r.push({...c,album:c.album||c.sku||"Record",cost:c.cost||(Number(c.total)||0)*(s.agreementSplit||70)/100})}),r.sort((c,b)=>new Date(b.date)-new Date(c.date)),r.reduce((c,b)=>c+(Number(b.qty||b.quantity)||1),0);const l=r.reduce((c,b)=>c+(Number(b.cost)||0),0),i=r.filter(c=>c.payoutStatus==="paid").reduce((c,b)=>c+(Number(b.cost)||0),0),d=l-i;return`
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
                                    <p class="font-display font-bold text-xl ${d>0?"text-brand-orange":"text-slate-500"}">${this.formatCurrency(d)}</p>
                                </div>
                            </div>

                            <div class="border-t border-slate-100 pt-4">
                                <div class="flex justify-between items-center mb-4">
                                    <h4 class="font-bold text-sm text-brand-dark">Historial de Ventas</h4>
                                    <span class="text-xs text-slate-500 font-medium">Pagado: ${this.formatCurrency(i)}</span>
                                </div>
                                <div class="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                    ${r.length>0?r.map(c=>`
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
                                                                `;t.innerHTML=e},togglePayoutStatus(t,e){if(!confirm(`¿Marcar esta venta como ${e==="paid"?"PENDIENTE":"PAGADA"}?`))return;(e==="paid"?"pending":"paid")==="paid"&&new Date().toISOString(),console.warn("updateSaleStatus not yet migrated to API"),this.showToast("Esta función aún no está migrada al nuevo backend")},openAddConsignorModal(){document.body.insertAdjacentHTML("beforeend",`
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

                                                                    `)},handleAddConsignor(t){t.preventDefault();const e=new FormData(t.target),s={name:e.get("name"),agreementSplit:parseFloat(e.get("split")),email:e.get("email"),phone:e.get("phone")};v.collection("consignors").add(s).then(()=>{this.showToast("✅ Socio registrado correctamente"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>{console.error(o),this.showToast("❌ Error al crear socio: "+o.message,"error")})},deleteConsignor(t){confirm("¿Eliminar este socio?")&&v.collection("consignors").doc(t).delete().then(()=>{this.showToast("✅ Socio eliminado"),this.loadData()}).catch(e=>{console.error(e),this.showToast("❌ Error al eliminar socio: "+e.message,"error")})},saveData(){try{const t={vatActive:this.state.vatActive};localStorage.setItem("el-cuartito-settings",JSON.stringify(t))}catch(t){console.error("Error saving settings:",t)}},renderVAT(t){const e=i=>i?i.toDate?i.toDate().getFullYear():new Date(i).getFullYear():0,s=this.state.sales.filter(i=>e(i.date)===this.state.filterYear),o=this.state.expenses.filter(i=>e(i.date)===this.state.filterYear);let n=0,a=0;this.state.vatActive&&(n=s.reduce((i,d)=>i+this.getVatComponent(d.total),0),a=o.filter(i=>i.hasVat).reduce((i,d)=>i+this.getVatComponent(d.amount),0));const r=n-a,l=`
                                                                    <div class="max-w-4xl mx-auto px-4 md:px-8 pb-24 pt-6">
                                                                        <div class="flex justify-between items-center mb-6">
                                                                            <h2 class="font-display text-2xl font-bold text-brand-dark">Reporte VAT (Moms)</h2>
                                                                            <div class="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-orange-100">
                                                                                <span class="text-sm font-medium text-slate-600">VAT Activo</span>
                                                                                <button onclick="app.toggleVAT()" class="w-12 h-6 rounded-full transition-colors relative ${this.state.vatActive?"bg-brand-orange":"bg-slate-300"}">
                                                                                    <div class="w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${this.state.vatActive?"left-7":"left-1"}"></div>
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <div class="bg-brand-dark text-white rounded-3xl p-8 mb-8 relative overflow-hidden">
                                                                            <div class="absolute top-0 right-0 w-64 h-64 bg-brand-orange opacity-10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                                                            <div class="relative z-10 text-center">
                                                                                <p class="text-slate-400 font-medium mb-2">Balance VAT (${this.state.filterYear})</p>
                                                                                <h2 class="text-6xl font-display font-bold mb-2">${this.formatCurrency(r)}</h2>
                                                                                <p class="text-sm text-slate-400">${r>0?"A pagar a Skat":"A reclamar"}</p>
                                                                            </div>
                                                                        </div>

                                                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                            <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                                                                                <h3 class="font-bold text-lg mb-4 text-brand-dark">VAT Recaudado (Ventas)</h3>
                                                                                <div class="space-y-3">
                                                                                    <div class="flex justify-between text-sm">
                                                                                        <span class="text-slate-500">Ventas Brutas</span>
                                                                                        <span class="font-medium">${this.formatCurrency(s.reduce((i,d)=>i+d.total,0))}</span>
                                                                                    </div>
                                                                                    <div class="flex justify-between text-sm pt-3 border-t border-slate-100">
                                                                                        <span class="font-bold text-brand-orange">Total VAT (25%)</span>
                                                                                        <span class="font-bold text-brand-orange">${this.formatCurrency(n)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                                                                                <h3 class="font-bold text-lg mb-4 text-brand-dark">VAT Deducible (Gastos)</h3>
                                                                                <div class="space-y-3">
                                                                                    <div class="flex justify-between text-sm">
                                                                                        <span class="text-slate-500">Gastos con VAT</span>
                                                                                        <span class="font-medium">${this.formatCurrency(o.filter(i=>i.hasVat).reduce((i,d)=>i+d.amount,0))}</span>
                                                                                    </div>
                                                                                    <div class="flex justify-between text-sm pt-3 border-t border-slate-100">
                                                                                        <span class="font-bold text-green-600">Total Deducible</span>
                                                                                        <span class="font-bold text-green-600">${this.formatCurrency(a)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `;t.innerHTML=l},toggleVAT(){this.state.vatActive=!this.state.vatActive,this.saveData(),this.renderVAT(document.getElementById("app-content"))},searchDiscogs(){const t=document.getElementById("discogs-search-input").value,e=document.getElementById("discogs-results");if(!t)return;const s=localStorage.getItem("discogs_token");if(!s){e.innerHTML=`
                <div class="text-center py-4 px-3">
                    <p class="text-xs text-red-500 font-bold mb-2">⚠️ Token de Discogs no configurado</p>
                    <button onclick="app.navigate('settings'); document.getElementById('modal-overlay').remove()" 
                        class="text-xs font-bold text-brand-orange hover:underline">
                        Ir a Configuración →
                    </button>
                </div>
            `,e.classList.remove("hidden");return}e.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Buscando en Discogs...</p>',e.classList.remove("hidden"),fetch(`https://api.discogs.com/database/search?q=${encodeURIComponent(t)}&type=release&token=${s}`).then(o=>{if(o.status===401)throw new Error("Token inválido o expirado");if(!o.ok)throw new Error(`Error ${o.status}`);return o.json()}).then(o=>{o.results&&o.results.length>0?e.innerHTML=o.results.slice(0,10).map(n=>`
                        <div onclick='app.handleDiscogsSelection(${JSON.stringify(n).replace(/'/g,"&#39;")})' class="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-brand-orange hover:shadow-sm transition-all">
                            <img src="${n.thumb||"logo.jpg"}" class="w-12 h-12 rounded object-cover bg-slate-100 flex-shrink-0">
                            <div class="flex-1 min-w-0">
                                <p class="font-bold text-xs text-brand-dark leading-tight mb-1">${n.title}</p>
                                <p class="text-[10px] text-slate-500">${n.year||"?"} · ${n.format?n.format.join(", "):"Vinyl"} · ${n.country||""}</p>
                                <p class="text-[10px] text-slate-400">${n.label?n.label[0]:""}</p>
                            </div>
                            <i class="ph-bold ph-plus-circle text-brand-orange text-lg flex-shrink-0"></i>
                        </div>
                    `).join(""):e.innerHTML='<p class="text-xs text-slate-400 p-2">No se encontraron resultados.</p>'}).catch(o=>{console.error(o),e.innerHTML=`
                    <div class="text-center py-4 px-3">
                        <p class="text-xs text-red-500 font-bold mb-2">❌ ${o.message}</p>
                        <button onclick="app.navigate('settings'); document.getElementById('modal-overlay').remove()" 
                            class="text-xs font-bold text-brand-orange hover:underline">
                            Verificar Token en Configuración →
                        </button>
                    </div>
                `})},resyncMusic(){["input-discogs-id","input-discogs-release-id","input-discogs-url","input-cover-image"].forEach(o=>{const n=document.getElementById(o);n&&(n.value="")});const t=document.querySelector('input[name="artist"]').value,e=document.querySelector('input[name="album"]').value,s=document.getElementById("discogs-search-input");s&&t&&e?(s.value=`${t} - ${e}`,this.searchDiscogs(),this.showToast("✅ Música desvinculada. Selecciona una nueva edición.","success")):this.showToast("⚠️ Falta Artista o Álbum para buscar.","error")},handleDiscogsSelection(t){const e=t.title.split(" - "),s=e[0]||"",o=e.slice(1).join(" - ")||t.title,n=document.querySelector("#modal-overlay form");if(!n)return;if(n.artist&&(n.artist.value=s),n.album&&(n.album.value=o),n.year&&t.year&&(n.year.value=t.year),n.label&&t.label&&t.label.length>0&&(n.label.value=t.label[0]),t.thumb||t.cover_image){const l=t.cover_image||t.thumb,i=document.getElementById("input-cover-image"),d=document.getElementById("cover-preview");i&&(i.value=l),d&&(d.querySelector("img").src=l,d.classList.remove("hidden"))}const a=document.getElementById("input-discogs-release-id");a&&t.id&&(a.value=t.id);const r=localStorage.getItem("discogs_token");if(r&&t.id)this.showToast("⏳ Cargando géneros...","info"),fetch(`https://api.discogs.com/releases/${t.id}?token=${r}`).then(l=>l.json()).then(l=>{console.log("Full Discogs Release:",l);const i=[...l.styles||[],...l.genres||[]];console.log("ALL Genres/Styles from full release:",i);const d=[...new Set(i)];if(d.length>0){const h=n.querySelector('select[name="genre"]'),f=n.querySelector('select[name="genre2"]'),y=n.querySelector('select[name="genre3"]'),m=n.querySelector('select[name="genre4"]'),g=n.querySelector('select[name="genre5"]'),w=[h,f,y,m,g];d.slice(0,5).forEach(($,k)=>{if(w[k]){let C=!1;for(let E of w[k].options)if(E.value===$){w[k].value=$,C=!0;break}if(!C){const E=document.createElement("option");E.value=$,E.text=$,E.selected=!0,w[k].add(E)}}}),this.showToast(`✅ ${d.length} géneros cargados`,"success")}if(l.images&&l.images.length>0){const h=l.images[0].uri,f=document.getElementById("input-cover-image"),y=document.getElementById("cover-preview");f&&(f.value=h),y&&(y.querySelector("img").src=h)}const c=document.getElementById("tracklist-preview"),b=document.getElementById("tracklist-preview-content");c&&b&&l.tracklist&&l.tracklist.length>0&&(b.innerHTML=l.tracklist.map(h=>`
                            <div class="flex items-center gap-2 py-1 border-b border-slate-100 last:border-0">
                                <span class="text-[10px] font-mono text-slate-400 w-6">${h.position||""}</span>
                                <span class="flex-1">${h.title}</span>
                                <span class="text-[10px] text-slate-400">${h.duration||""}</span>
                            </div>
                        `).join(""),c.classList.remove("hidden"));const p=document.getElementById("price-suggestions-preview"),u=document.getElementById("price-suggestions-content"),x=document.getElementById("discogs-release-link");if(x&&l.uri){const h=l.uri.startsWith("http")?l.uri:"https://www.discogs.com"+l.uri;x.href=h,x.classList.remove("hidden")}p&&u&&(u.innerHTML='<div class="col-span-2 text-[10px] text-slate-400 animate-pulse">Consultando mercado...</div>',p.classList.remove("hidden"),fetch(`${T}/discogs/price-suggestions/${t.id}`).then(f=>f.json()).then(f=>{if(f.success&&f.suggestions){const y=f.suggestions,m=y.currency==="DKK"?" kr.":y.currency==="USD"?" $":" "+y.currency,g=(w,$)=>{const k=y[$];return`
                                            <div class="bg-white p-2 rounded-lg border border-brand-orange/10">
                                                <span class="text-[9px] text-slate-400 block leading-none mb-1">${w}</span>
                                                <span class="font-bold text-brand-dark">${k?k.value.toFixed(0)+m:"N/A"}</span>
                                            </div>
                                        `};u.innerHTML=`
                                        ${g("Mint (M)","Mint (M)")}
                                        ${g("Near Mint (NM)","Near Mint (NM or M-)")}
                                        ${g("Very Good Plus (VG+)","Very Good Plus (VG+)")}
                                        ${g("Very Good (VG)","Very Good (VG)")}
                                    `}else u.innerHTML='<div class="col-span-2 text-[10px] text-slate-400">Precios no disponibles para este release</div>'}).catch(f=>{console.error("Price suggestion error:",f),u.innerHTML='<div class="col-span-2 text-[10px] text-red-400 italic">Error al consultar precios</div>'}))}).catch(l=>{console.error("Error fetching full release:",l),this.showToast("⚠️ No se pudieron cargar todos los géneros","warning")});else{const l=[...t.style||[],...t.genre||[]];console.log("Fallback Genres (limited, no token):",l);const i=[...new Set(l)];if(i.length>0){const d=n.querySelector('select[name="genre"]');if(d){const c=i[0];let b=!1;for(let p of d.options)if(p.value===c){d.value=c,b=!0;break}if(!b){const p=document.createElement("option");p.value=c,p.text=c,p.selected=!0,d.add(p)}}}}if(t.uri||t.resource_url){const l=t.uri||t.resource_url,i=l.startsWith("http")?l:"https://www.discogs.com"+l,d=document.getElementById("input-discogs-url");d&&(d.value=i)}if(t.id){const l=document.getElementById("input-discogs-id");l&&(l.value=t.id)}document.getElementById("discogs-results").classList.add("hidden")},openTracklistModal(t){const e=this.state.inventory.find(a=>a.sku===t);if(!e)return;let s=e.discogsId;document.body.insertAdjacentHTML("beforeend",`
                                                                <div id="tracklist-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-fadeIn">
                                                                        <h3 class="font-display text-xl font-bold text-brand-dark mb-4">Lista de Temas (Tracklist)</h3>
                                                                        <div class="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                                                            <i class="ph-bold ph-spinner animate-spin text-4xl text-brand-orange"></i>
                                                                            <p class="font-medium">Cargando tracks desde Discogs...</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `);const n=a=>{const r=localStorage.getItem("discogs_token")||"hSIAXlFqQzYEwZzzQzXlFqQzYEwZzz";fetch(`https://api.discogs.com/releases/${a}?token=${r}`).then(l=>{if(!l.ok)throw new Error("Release not found");return l.json()}).then(l=>{const i=l.tracklist||[],d=i.map(b=>`
                                                                <div class="flex items-center justify-between py-3 border-b border-slate-50 hover:bg-slate-50 px-2 transition-colors rounded-lg group">
                                                                    <div class="flex items-center gap-3">
                                                                        <span class="text-xs font-mono font-bold text-slate-400 w-8">${b.position}</span>
                                                                        <span class="text-sm font-bold text-brand-dark group-hover:text-brand-orange transition-colors">${b.title}</span>
                                                                    </div>
                                                                    <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">${b.duration||"--:--"}</span>
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
                                                                        ${i.length>0?d:'<p class="text-center text-slate-500 py-8">No se encontraron temas para esta edición.</p>'}
                                                                    </div>
                                                                    <div class="p-3 bg-slate-50 text-center shrink-0 border-t border-slate-100">
                                                                        <a href="https://www.discogs.com/release/${a}" target="_blank" class="text-xs font-bold text-brand-orange hover:underline flex items-center justify-center gap-1">
                                                                            Ver release completo en Discogs <i class="ph-bold ph-arrow-square-out"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                `;document.getElementById("tracklist-overlay").innerHTML=c}).catch(l=>{console.error(l),document.getElementById("tracklist-overlay").innerHTML=`
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
                                                                `})};if(s)n(s);else{const a=`${e.artist} - ${e.album}`,r=localStorage.getItem("discogs_token")||"hSIAXlFqQzYEwZzzQzXlFqQzYEwZzz";fetch(`https://api.discogs.com/database/search?q=${encodeURIComponent(a)}&type=release&token=${r}`).then(l=>l.json()).then(l=>{if(l.results&&l.results.length>0)n(l.results[0].id);else throw new Error("No results found in fallback search")}).catch(()=>{document.getElementById("tracklist-overlay").innerHTML=`
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
                    `})}},renderDiscogsSales(t){const e=this.state.sales.filter(i=>i.channel==="discogs"),s=i=>parseFloat(i.total)||0,o=i=>parseFloat(i.originalTotal)||parseFloat(i.total)+(parseFloat(i.discogsFee||0)+parseFloat(i.paypalFee||0)),n=i=>o(i)-s(i),a=e.reduce((i,d)=>i+s(d),0),r=e.reduce((i,d)=>i+n(d),0),l=e.reduce((i,d)=>{const c=s(d);let b=0;return d.items&&Array.isArray(d.items)&&(b=d.items.reduce((p,u)=>{const x=parseFloat(u.costAtSale||0),h=parseInt(u.qty||u.quantity)||1;return p+x*h},0)),i+(c-b)},0);t.innerHTML=`
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
                                ${e.map(i=>{var c;const d=(c=i.timestamp)!=null&&c.toDate?i.timestamp.toDate():i.date?new Date(i.date):new Date(0);return{...i,_sortDate:d.getTime()}}).sort((i,d)=>d._sortDate-i._sortDate).map(i=>{var x;const d=(x=i.timestamp)!=null&&x.toDate?i.timestamp.toDate():new Date(i.date),c=i.items&&i.items[0],b=i.originalTotal||i.total+(i.discogsFee||0)+(i.paypalFee||0);i.discogsFee,i.paypalFee;const p=i.total,u=i.status==="pending_review"||i.needsReview;return`
                                        <tr class="border-b border-slate-50 hover:bg-purple-50/30 transition-colors ${u?"bg-orange-50/50":""}">
                                            <td class="px-6 py-4 text-sm text-slate-600">${d.toLocaleDateString("es-ES")}</td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[200px]">${(c==null?void 0:c.album)||"Producto"}</div>
                                                <div class="text-xs text-slate-500">${(c==null?void 0:c.artist)||"-"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-xs text-slate-500">Precio Lista: <span class="font-bold text-slate-700">${this.formatCurrency(b)}</span></div>
                                                ${i.discogs_order_id?`<div class="text-[10px] text-purple-600 font-medium">Order: ${i.discogs_order_id}</div>`:""}
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-[10px] text-red-500 font-bold">Total Fees: -${this.formatCurrency(b-p)}</div>
                                                <div class="text-[10px] text-slate-400 font-medium">
                                                    ${b>0?`(${((b-p)/b*100).toFixed(1)}%)`:""}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm font-bold text-brand-dark">${this.formatCurrency(p)}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="flex flex-col gap-2">
                                                    ${u?`
                                                        <span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider text-center">Pendiente</span>
                                                    `:`
                                                        <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider text-center">Confirmado</span>
                                                    `}
                                                    <button onclick="app.openUpdateSaleValueModal('${i.id}', ${b}, ${p})" class="w-full py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1">
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
        `;document.body.insertAdjacentHTML("beforeend",s)},calculateModalFee(t,e){const s=parseFloat(t)||0,o=e-s,n=e>0?o/e*100:0,a=document.getElementById("modal-fee-display"),r=document.getElementById("modal-fee-value");if(o>0){a.classList.remove("hidden"),r.innerText=`- kr. ${o.toFixed(2)}`;const l=document.getElementById("modal-fee-percent");l&&(l.innerText=`${n.toFixed(1)}%`)}else a.classList.add("hidden")},async handleSaleValueUpdate(t,e,s){t.preventDefault();const n=new FormData(t.target).get("netReceived"),a=document.getElementById("update-sale-submit-btn");if(n){a.disabled=!0,a.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Guardando...';try{const r=T,l=await M.currentUser.getIdToken(),i=await fetch(`${r}/firebase/sales/${e}/value`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${l}`},body:JSON.stringify({netReceived:n})}),d=i.headers.get("content-type");if(!d||!d.includes("application/json")){const b=await i.text();throw console.error("Non-JSON response received:",b),new Error(`Server returned non-JSON response (${i.status})`)}const c=await i.json();if(c.success)this.showToast("✅ Venta actualizada y fee registrado"),document.getElementById("update-sale-modal").remove(),await this.loadData(),this.refreshCurrentView();else throw new Error(c.error||"Error al actualizar")}catch(r){console.error("Update sale error:",r),this.showToast(`❌ Error: ${r.message}`),a.disabled=!1,a.innerText="Confirmar Ajuste"}}},renderShipping(t){const e=this.state.sales.filter(a=>a.channel==="online"||a.fulfillment_status==="shipped"||a.shipment&&a.shipment.tracking_number),s=e.filter(a=>a.status==="completed"||a.status==="paid"||a.status==="ready_for_pickup"),o=e.filter(a=>a.status==="shipped"),n=`
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 pt-6">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h2 class="font-display text-3xl font-bold text-brand-dark">Gestión de Envíos</h2>
                        <p class="text-slate-500 text-sm">Administra y notifica el estado de tus despachos online.</p>
                    </div>
                    <div class="flex gap-4">
                        <div class="bg-white px-4 py-2 rounded-xl shadow-sm border border-orange-100 flex items-center gap-3">
                            <i class="ph-fill ph-clock text-brand-orange text-xl"></i>
                            <div>
                                <p class="text-[10px] text-slate-400 font-bold uppercase leading-none">Pendientes</p>
                                <p class="text-xl font-display font-bold text-brand-dark">${s.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabs/Filters -->
                <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden mb-8">
                    <div class="p-6">
                        <h3 class="font-bold text-brand-dark mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-truck text-brand-orange"></i> Pedidos por Despachar
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left">
                                <thead class="bg-orange-50/50 text-xs uppercase text-slate-500 font-bold">
                                    <tr>
                                        <th class="p-4">Orden</th>
                                        <th class="p-4">Cliente</th>
                                        <th class="p-4">Email</th>
                                        <th class="p-4">Dirección / Destino</th>
                                        <th class="p-4">Fecha Pago</th>
                                        <th class="p-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-orange-50">
                                    ${s.length===0?`
                                        <tr>
                                            <td colspan="5" class="p-12 text-center">
                                                <i class="ph-duotone ph-package text-5xl text-slate-200 mb-3 block"></i>
                                                <p class="text-slate-400 italic">No hay envíos pendientes. ¡Todo al día! 🎉</p>
                                            </td>
                                        </tr>
                                    `:s.sort((a,r)=>{var l,i;return new Date((l=r.timestamp)!=null&&l.toDate?r.timestamp.toDate():r.timestamp)-new Date((i=a.timestamp)!=null&&i.toDate?a.timestamp.toDate():a.timestamp)}).map(a=>{const r=this.getCustomerInfo(a);return`
                                        <tr class="hover:bg-orange-50/30 transition-colors cursor-pointer" onclick="app.openSaleDetailModal('${a.id}')">
                                            <td class="p-4 text-sm font-bold text-brand-orange">#${a.id.slice(0,8)}</td>
                                            <td class="p-4">
                                                <div class="text-sm font-bold text-brand-dark">${r.name}</div>
                                            </td>
                                            <td class="p-4 text-sm text-slate-500">${r.email}</td>
                                            <td class="p-4">
                                                <div class="text-xs text-slate-600 truncate max-w-[200px]">${r.address}</div>
                                                <div class="text-[10px] text-slate-400 font-medium">${a.city||""} ${a.country||""}</div>
                                            </td>
                                            <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate(a.date)}</td>
                                            <td class="p-4 text-center" onclick="event.stopPropagation()">
                                                <div class="flex flex-col gap-2">
                                                    ${a.status!=="ready_for_pickup"?`
                                                        <button onclick="app.setReadyForPickup('${a.id}')" class="bg-orange-100 text-brand-orange px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-200 transition-colors flex items-center gap-2 mx-auto w-full justify-center">
                                                            <i class="ph-bold ph-storefront"></i> Listo Retiro
                                                        </button>
                                                    `:""}
                                                    <button onclick="app.manualShipOrder('${a.id}')" class="bg-brand-dark text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto w-full justify-center">
                                                        <i class="ph-bold ph-truck"></i> ${a.status==="ready_for_pickup"?"Enviado":"Despachar"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        `}).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Completed Section -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden opacity-80">
                    <div class="p-6 bg-slate-50/50 border-b border-slate-100">
                        <h3 class="font-bold text-slate-500 flex items-center gap-2">
                            <i class="ph-fill ph-check-circle text-green-500"></i> Despachos Recientes
                        </h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold">
                                <tr>
                                    <th class="p-4">Orden</th>
                                    <th class="p-4">Cliente</th>
                                    <th class="p-4">Tracking Number</th>
                                    <th class="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                 ${o.slice(0,10).sort((a,r)=>{var l,i;return new Date((l=r.updated_at)!=null&&l.toDate?r.updated_at.toDate():r.updated_at)-new Date((i=a.updated_at)!=null&&i.toDate?a.updated_at.toDate():a.updated_at)}).map(a=>{var l;const r=this.getCustomerInfo(a);return`
                                    <tr class="hover:bg-slate-50/50 transition-colors cursor-pointer" onclick="app.openSaleDetailModal('${a.id}')">
                                        <td class="p-4 text-sm font-medium text-slate-400">#${a.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm text-slate-500">${r.name}</td>
                                        <td class="p-4 text-sm font-mono text-slate-400">${((l=a.shipment)==null?void 0:l.tracking_number)||"-"}</td>
                                        <td class="p-4 text-right">
                                            <span class="px-2 py-1 rounded bg-green-100 text-green-600 text-[10px] font-bold uppercase">Enviado</span>
                                        </td>
                                    </tr>
                                    `}).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;t.innerHTML=n}};window.app=P;document.addEventListener("DOMContentLoaded",()=>{P.init()});
