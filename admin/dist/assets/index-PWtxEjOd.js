(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function s(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=s(i);fetch(i.href,r)}})();const v=firebase.firestore(),M=window.auth,V=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1",S=V?"http://localhost:3001":"https://el-cuartito-shop.up.railway.app",B={async createSale(t){let e=[];if(await v.runTransaction(async s=>{const n=[];for(const a of t.items){const l=v.collection("products").doc(a.recordId||a.productId),d=await s.get(l);if(!d.exists)throw new Error(`Producto ${a.recordId} no encontrado`);const c=d.data();if(c.stock<a.quantity)throw new Error(`Stock insuficiente para ${c.artist||"Sin Artista"} - ${c.album||"Sin Album"}. Disponible: ${c.stock}`);n.push({ref:l,data:c,quantity:a.quantity,price:c.price,cost:c.cost||0})}const i=n.reduce((a,l)=>a+l.price*l.quantity,0),r=t.customTotal!==void 0?t.customTotal:i,o=v.collection("sales").doc();s.set(o,{...t,status:"completed",fulfillment_status:"fulfilled",total:r,date:new Date().toISOString().split("T")[0],timestamp:firebase.firestore.FieldValue.serverTimestamp(),items:n.map(a=>({productId:a.ref.id,artist:a.data.artist,album:a.data.album,sku:a.data.sku,unitPrice:a.price,costAtSale:a.cost,qty:a.quantity}))});for(const a of n){s.update(a.ref,{stock:a.data.stock-a.quantity});const l=v.collection("inventory_logs").doc();s.set(l,{type:"SOLD",sku:a.data.sku||"Unknown",album:a.data.album||"Unknown",artist:a.data.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:`Venta registrada (Admin) - Canal: ${t.channel||"Tienda"}`})}e=n.map(a=>({discogs_listing_id:a.data.discogs_listing_id,artist:a.data.artist,album:a.data.album}))}),t.channel&&t.channel.toLowerCase()==="discogs"){for(const s of e)if(s.discogs_listing_id)try{const n=await fetch(`${S}/discogs/delete-listing/${s.discogs_listing_id}`,{method:"DELETE"});n.ok?console.log(`✅ Discogs listing ${s.discogs_listing_id} deleted for ${s.artist} - ${s.album}`):console.warn(`⚠️ Could not delete Discogs listing ${s.discogs_listing_id}:`,await n.text())}catch(n){console.error(`❌ Error deleting Discogs listing ${s.discogs_listing_id}:`,n)}}}},A={state:{inventory:[],sales:[],expenses:[],consignors:[],cart:[],viewMode:"list",selectedItems:new Set,currentView:"dashboard",filterMonths:[new Date().getMonth()],filterYear:new Date().getFullYear(),inventorySearch:"",salesHistorySearch:"",expensesSearch:"",events:[],selectedDate:new Date,vatActive:localStorage.getItem("el-cuartito-settings")?JSON.parse(localStorage.getItem("el-cuartito-settings")).vatActive:!1},async init(){M.onAuthStateChanged(async t=>{if(t)try{document.getElementById("login-view").classList.add("hidden"),document.getElementById("main-app").classList.remove("hidden"),document.getElementById("mobile-nav").classList.remove("hidden"),await this.loadData(),this._pollInterval&&clearInterval(this._pollInterval),this._pollInterval=setInterval(()=>this.loadData(),3e4),this.renderDashboard(document.getElementById("app-content")),this.setupMobileMenu(),this.setupNavigation()}catch(e){console.error("Auth token error:",e),this.logout()}else{document.getElementById("login-view").classList.remove("hidden"),document.getElementById("main-app").classList.add("hidden"),document.getElementById("mobile-nav").classList.add("hidden");const e=document.getElementById("login-btn");e&&(e.disabled=!1,e.innerHTML="<span>Entrar</span>")}})},async handleLogin(t){t.preventDefault();const e=t.target.email.value,s=t.target.password.value,n=document.getElementById("login-error"),i=document.getElementById("login-btn");n.classList.add("hidden"),i.disabled=!0,i.innerHTML="<span>Cargando...</span>";try{await M.signInWithEmailAndPassword(e,s)}catch(r){console.error("Login error:",r),n.innerText="Error: "+r.message,n.classList.remove("hidden"),i.disabled=!1,i.innerHTML='<span>Ingresar</span><i class="ph-bold ph-arrow-right"></i>'}},async updateFulfillmentStatus(t,e,s){var n,i,r;try{const o=((n=t==null?void 0:t.target)==null?void 0:n.closest("button"))||((r=(i=window.event)==null?void 0:i.target)==null?void 0:r.closest("button"));if(o){o.disabled=!0;const a=o.innerHTML;o.innerHTML='<i class="ph ph-circle-notch animate-spin"></i>'}await v.collection("sales").doc(e).update({fulfillment_status:s}),await this.loadData(),document.getElementById("modal-overlay")&&(document.getElementById("modal-overlay").remove(),this.openOnlineSaleDetailModal(e)),this.showToast("Estado de envío actualizado")}catch(o){console.error("Fulfillment update error:",o),this.showToast("Error al actualizar estado: "+o.message,"error")}},async manualShipOrder(t){var e,s,n,i,r,o;try{const a=prompt("Introduce el número de seguimiento:");if(!a)return;const l=((e=event==null?void 0:event.target)==null?void 0:e.closest("button"))||((n=(s=window.event)==null?void 0:s.target)==null?void 0:n.closest("button"));l&&(l.disabled=!0,l.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Guardando...');const d=await fetch(`${S}/api/manual-ship`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t,trackingNumber:a})}),c=await d.json();if(d.ok&&c.success){if(this.showToast("✅ Pedido marcado como enviado"),c.emailSent)this.showToast("📧 Cliente notificado por email","success");else{const u=typeof c.emailError=="object"?JSON.stringify(c.emailError):c.emailError;this.showToast("⚠️ Pedido marcado pero EL EMAIL FALLÓ: "+u,"warning")}await this.loadData();const m=document.getElementById("sale-detail-modal");m&&(m.remove(),this.openSaleDetailModal(t))}else throw new Error(c.error||c.message||"Error desconocido")}catch(a){console.error("Error shipping manually:",a),this.showToast("❌ Error: "+(a.message||"No se pudo procesar el envío"),"error");const l=((i=event==null?void 0:event.target)==null?void 0:i.closest("button"))||((o=(r=window.event)==null?void 0:r.target)==null?void 0:o.closest("button"));l&&(l.disabled=!1,l.innerHTML='<i class="ph-bold ph-truck"></i> Ingresar Tracking y Cerrar')}},async logout(){try{await M.signOut(),location.reload()}catch(t){console.error("Sign out error:",t),location.reload()}},setupListeners(){},async loadData(){try{const[t,e,s,n,i]=await Promise.all([v.collection("products").get(),v.collection("sales").get(),v.collection("expenses").orderBy("date","desc").get(),v.collection("events").orderBy("date","desc").get(),v.collection("consignors").get()]);this.state.inventory=t.docs.map(r=>{const o=r.data();return{id:r.id,...o,condition:o.condition||"VG",owner:o.owner||"El Cuartito",label:o.label||"Desconocido",storageLocation:o.storageLocation||"Tienda",cover_image:o.cover_image||o.coverImage||null}}),this.state.sales=e.docs.map(r=>{var l,d;const o=r.data(),a={id:r.id,...o,date:o.date||((l=o.timestamp)!=null&&l.toDate?o.timestamp.toDate().toISOString().split("T")[0]:(d=o.created_at)!=null&&d.toDate?o.created_at.toDate().toISOString().split("T")[0]:new Date().toISOString().split("T")[0])};return o.total_amount!==void 0&&o.total===void 0&&(a.total=o.total_amount),o.payment_method&&!o.paymentMethod&&(a.paymentMethod=o.payment_method),a.items&&Array.isArray(a.items)&&(a.items=a.items.map(c=>({...c,priceAtSale:c.priceAtSale!==void 0?c.priceAtSale:c.unitPrice||0,qty:c.qty!==void 0?c.qty:c.quantity||1,costAtSale:c.costAtSale!==void 0?c.costAtSale:c.cost||0}))),a}).filter(r=>r.status!=="PENDING"&&r.status!=="failed").sort((r,o)=>{const a=new Date(r.date);return new Date(o.date)-a}),this.state.expenses=s.docs.map(r=>({id:r.id,...r.data()})),this.state.events=n.docs.map(r=>({id:r.id,...r.data()})),this.state.consignors=i.docs.map(r=>{const o=r.data();return{id:r.id,...o,agreementSplit:o.split||o.agreementSplit||(o.percentage?Math.round(o.percentage*100):70)}}),await this.loadInvestments(),this.refreshCurrentView()}catch(t){console.error("Failed to load data:",t),this.showToast("❌ Error de conexión: "+t.message,"error")}},refreshCurrentView(){const t=document.getElementById("app-content");if(t)switch(this.state.currentView){case"dashboard":this.renderDashboard(t);break;case"inventory":this.renderInventory(t);break;case"sales":this.renderSales(t);break;case"onlineSales":this.renderOnlineSales(t);break;case"discogsSales":this.renderDiscogsSales(t);break;case"expenses":this.renderExpenses(t);break;case"consignments":this.renderConsignments(t);break;case"vat":this.renderVAT(t);break;case"backup":this.renderBackup(t);break;case"settings":this.renderSettings(t);break;case"calendar":this.renderCalendar(t);break;case"shipping":this.renderShipping(t);break;case"pickups":this.renderPickups(t);break;case"investments":this.renderInvestments(t);break}},navigate(t){this.state.currentView=t,document.querySelectorAll(".nav-item, .nav-item-m").forEach(i=>{i.classList.remove("bg-orange-50","text-brand-orange"),i.classList.add("text-slate-500")});const e=document.getElementById(`nav-d-${t}`);e&&(e.classList.remove("text-slate-500"),e.classList.add("bg-orange-50","text-brand-orange"));const s=document.getElementById(`nav-m-${t}`);s&&(s.classList.remove("text-slate-400"),s.classList.add("text-brand-orange"));const n=document.getElementById("app-content");n.innerHTML="",this.refreshCurrentView()},renderCalendar(t){const e=this.state.selectedDate||new Date,s=e.getFullYear(),n=e.getMonth(),i=new Date(s,n,1),o=new Date(s,n+1,0).getDate(),a=i.getDay()===0?6:i.getDay()-1,l=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],d=m=>{const u=`${s}-${String(n+1).padStart(2,"0")}-${String(m).padStart(2,"0")}`,b=this.state.sales.some(f=>f.date===u),p=this.state.expenses.some(f=>f.date===u),x=this.state.events.some(f=>f.date===u);return{hasSales:b,hasExpenses:p,hasEvents:x}},c=`
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <div class="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
                    <!-- Calendar Grid -->
                    <div class="flex-1 bg-white rounded-2xl shadow-sm border border-orange-100 p-6 flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="font-display text-2xl font-bold text-brand-dark capitalize">
                                ${l[n]} <span class="text-brand-orange">${s}</span>
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
                            ${["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(m=>`
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider py-2">${m}</div>
                            `).join("")}
                        </div>

                        <div class="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                            ${Array(a).fill('<div class="bg-slate-50/50 rounded-xl"></div>').join("")}
                            ${Array.from({length:o},(m,u)=>{const b=u+1,p=`${s}-${String(n+1).padStart(2,"0")}-${String(b).padStart(2,"0")}`,x=e.getDate()===b,f=d(b),y=new Date().toDateString()===new Date(s,n,b).toDateString();return`
                                    <button onclick="app.selectCalendarDate('${p}')" 
                                        class="relative rounded-xl p-2 flex flex-col items-center justify-start gap-1 transition-all border-2
                                        ${x?"border-brand-orange bg-orange-50":"border-transparent hover:bg-slate-50"}
                                        ${y?"bg-blue-50":""}">
                                        <span class="text-sm font-bold ${x?"text-brand-orange":"text-slate-700"} ${y?"text-blue-600":""}">${b}</span>
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
        `;t.innerHTML=c},getCustomerInfo(t){const e=t.customer||{},s=t.customerName||e.name||(e.firstName?`${e.firstName} ${e.lastName||""}`.trim():"")||"Cliente",n=t.customerEmail||e.email||"-";let i=t.address||e.address||"-";if(e.shipping){const r=e.shipping;i=`${r.line1||""} ${r.line2||""}, ${r.city||""}, ${r.postal_code||""}, ${r.country||""}`.trim().replace(/^,|,$/g,"")}return{name:s,email:n,address:i}},renderCalendarDaySummary(t){const e=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,s=t.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}),n=this.state.sales.filter(l=>l.date===e),i=this.state.expenses.filter(l=>l.date===e),r=this.state.events.filter(l=>l.date===e),o=n.reduce((l,d)=>l+d.total,0),a=i.reduce((l,d)=>l+d.amount,0);return`
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
                        <p class="text-lg font-bold text-brand-dark">${this.formatCurrency(o)}</p>
                    </div>
                    <div class="bg-red-50 p-3 rounded-xl border border-red-100">
                        <p class="text-[10px] font-bold text-red-600 uppercase">Gastos</p>
                        <p class="text-lg font-bold text-brand-dark">${this.formatCurrency(a)}</p>
                    </div>
                </div>

                <!-- Events -->
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Eventos / Notas</h4>
                    ${r.length>0?`
                        <div class="space-y-2">
                            ${r.map(l=>`
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
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle Ventas (${n.length})</h4>
                    ${n.length>0?`
                        <div class="space-y-2">
                            ${n.map(l=>`
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
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle Gastos (${i.length})</h4>
                    ${i.length>0?`
                        <div class="space-y-2">
                            ${i.map(l=>`
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
        `;document.body.insertAdjacentHTML("beforeend",e)},handleAddEvent(t){t.preventDefault();const e=new FormData(t.target),s={date:e.get("date"),title:e.get("title"),description:e.get("description"),createdAt:new Date().toISOString()};v.collection("events").add(s).then(()=>{this.showToast("✅ Evento agregado"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(n=>console.error(n))},deleteEvent(t){confirm("¿Eliminar este evento?")&&v.collection("events").doc(t).delete().then(()=>{this.showToast("✅ Evento eliminado"),this.loadData()}).catch(e=>console.error(e))},renderBackup(t){const e=`
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
        `;t.innerHTML=s},saveSettings(t){t.preventDefault();const s=new FormData(t.target).get("discogs_token").trim();s?(localStorage.setItem("discogs_token",s),localStorage.setItem("discogs_token_warned","true"),this.showToast("Configuración guardada correctamente")):(localStorage.removeItem("discogs_token"),this.showToast("Token eliminado"))},exportData(){const t={inventory:this.state.inventory,sales:this.state.sales,expenses:this.state.expenses,consignors:this.state.consignors,customGenres:this.state.customGenres,customCategories:this.state.customCategories,timestamp:new Date().toISOString()},e="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(t)),s=document.createElement("a");s.setAttribute("href",e),s.setAttribute("download","el_cuartito_backup_"+new Date().toISOString().slice(0,10)+".json"),document.body.appendChild(s),s.click(),s.remove()},importData(t){const e=t.files[0];if(!e)return;const s=new FileReader;s.onload=n=>{try{const i=JSON.parse(n.target.result);if(!confirm("¿Estás seguro de restaurar este backup? Se sobrescribirán los datos actuales."))return;const r=v.batch();alert("La importación completa sobrescribiendo datos en la nube es compleja. Por seguridad, esta función solo agrega/actualiza items de inventario por ahora."),i.inventory&&i.inventory.forEach(o=>{const a=v.collection("products").doc(o.sku);r.set(a,o)}),r.commit().then(()=>{this.showToast("Datos importados (Inventario)")})}catch(i){alert("Error al leer el archivo de respaldo"),console.error(i)}},s.readAsText(e)},resetApplication(){if(!confirm(`⚠️ ¡ADVERTENCIA! ⚠️

Esto borrará PERMANENTEMENTE todo el inventario, ventas, gastos y socios de la base de datos.

¿Estás absolutamente seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Iniciando borrado completo...");const e=s=>v.collection(s).get().then(n=>{const i=v.batch();return n.docs.forEach(r=>{i.delete(r.ref)}),i.commit()});Promise.all([e("inventory"),e("sales"),e("expenses"),e("consignors"),v.collection("settings").doc("general").delete()]).then(()=>{this.showToast("♻️ Aplicación restablecida de fábrica"),setTimeout(()=>location.reload(),1500)}).catch(s=>{console.error(s),alert("Error al borrar datos: "+s.message)})},resetSales(){if(!confirm(`⚠️ ADVERTENCIA ⚠️

Esto borrará PERMANENTEMENTE todas las ventas (manuales y online) de la base de datos.

El inventario, gastos y socios NO serán afectados.

¿Estás seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Borrando todas las ventas..."),v.collection("sales").get().then(e=>{const s=v.batch();return e.docs.forEach(n=>{s.delete(n.ref)}),s.commit()}).then(()=>{this.showToast("✅ Todas las ventas han sido eliminadas"),setTimeout(()=>location.reload(),1500)}).catch(e=>{console.error(e),alert("Error al borrar ventas: "+e.message)})},async findProductBySku(t){try{const e=await v.collection("products").where("sku","==",t).get();if(e.empty)return null;const s=e.docs[0];return{id:s.id,ref:s.ref,data:s.data()}}catch(e){return console.error("Error finding product by SKU:",e),null}},logInventoryMovement(t,e){let s="";t==="EDIT"?s="Producto actualizado":t==="ADD"?s="Ingreso de inventario":t==="DELETE"?s="Egreso manual":t==="SOLD"&&(s="Venta registrada"),v.collection("inventory_logs").add({type:t,sku:e.sku||"Unknown",album:e.album||"Unknown",artist:e.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:s}).catch(n=>console.error("Error logging movement:",n))},openInventoryLogModal(){v.collection("inventory_logs").orderBy("timestamp","desc").limit(50).get().then(t=>{const s=`
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
                                    ${t.docs.map(n=>({id:n.id,...n.data()})).map(n=>{let i="bg-slate-100 text-slate-600";n.type==="ADD"&&(i="bg-green-100 text-green-700"),n.type==="DELETE"&&(i="bg-red-100 text-red-700"),n.type==="EDIT"&&(i="bg-blue-100 text-blue-700"),n.type==="SOLD"&&(i="bg-purple-100 text-purple-700");const r=n.timestamp?n.timestamp.toDate?n.timestamp.toDate():new Date(n.timestamp):new Date;return`
                                            <tr>
                                                <td class="p-4 text-slate-500 whitespace-nowrap">
                                                    ${r.toLocaleDateString()} <span class="text-xs text-slate-400 opacity-75">${r.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                                                </td>
                                                <td class="p-4">
                                                    <span class="px-2 py-1 rounded-md text-[10px] font-bold uppercase ${i}">${n.type}</span>
                                                </td>
                                                <td class="p-4 font-bold text-brand-dark">${n.album||"Unknown"}</td>
                                                <td class="p-4 font-mono text-xs text-slate-400">${n.sku||"N/A"}</td>
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
        `;try{const s=S,i=await(await fetch(`${s}/discogs/sync`,{method:"POST",headers:{"Content-Type":"application/json"}})).json(),o=await(await fetch(`${s}/discogs/sync-orders`,{method:"POST",headers:{"Content-Type":"application/json"}})).json();if(i.success||o&&o.success){let a=`✅ Sincronizado: ${i.synced||0} productos`;o&&o.salesCreated>0&&(a+=`. ¡Detectadas ${o.salesCreated} nuevas ventas!`),this.showToast(a),await this.loadData(),this.refreshCurrentView()}else throw new Error(i.error||o&&o.error||"Error desconocido")}catch(s){console.error("Sync error:",s),this.showToast(`❌ Error al sincronizar: ${s.message}`)}finally{t.disabled=!1,t.innerHTML=e}},formatCurrency(t){return new Intl.NumberFormat("da-DK",{style:"currency",currency:"DKK"}).format(t)},formatDate(t){return t?new Date(t).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}):"-"},getMonthName(t){return["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][t]},generateId(){return Date.now().toString(36)+Math.random().toString(36).substr(2)},showToast(t){const e=document.getElementById("toast");document.getElementById("toast-message").innerText=t,e.classList.remove("opacity-0","-translate-y-20","md:translate-y-20"),setTimeout(()=>{e.classList.add("opacity-0","-translate-y-20","md:translate-y-20")},3e3)},setupNavigation(){},setupMobileMenu(){},toggleMobileMenu(){const t=document.getElementById("mobile-menu"),e=document.getElementById("mobile-menu-overlay");!t||!e||(t.classList.contains("translate-y-full")?(t.classList.remove("translate-y-full"),e.classList.remove("hidden")):(t.classList.add("translate-y-full"),e.classList.add("hidden")))},getVatComponent(t){return this.state.vatActive?(parseFloat(t)||0)*.2:0},getNetPrice(t){return this.state.vatActive?t*.8:t},getRolling12MonthSales(){const t=new Date;return t.setFullYear(t.getFullYear()-1),this.state.sales.filter(e=>new Date(e.date)>=t).reduce((e,s)=>e+this.getNetPrice(s.total),0)},toggleMonthFilter(t){const e=this.state.filterMonths.indexOf(t);e===-1?this.state.filterMonths.push(t):this.state.filterMonths.length>1&&this.state.filterMonths.splice(e,1),this.state.filterMonths.sort((s,n)=>s-n),this.refreshCurrentView()},async setReadyForPickup(t){var e,s,n,i,r,o;try{const a=((e=event==null?void 0:event.target)==null?void 0:e.closest("button"))||((n=(s=window.event)==null?void 0:s.target)==null?void 0:n.closest("button"));a&&(a.disabled=!0,a.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Guardando...');const l=await fetch(`${S}/api/ready-for-pickup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t})}),d=await l.json();if(l.ok&&d.success){this.showToast("✅ Pedido listo para retiro"),this.showToast("📧 Cliente notificado por email"),await this.loadData();const c=document.getElementById("sale-detail-modal");c&&(c.remove(),this.openSaleDetailModal(t))}else throw new Error(d.error||d.message||"Error desconocido")}catch(a){console.error("Error setting ready for pickup:",a),this.showToast("❌ Error: "+(a.message||"No se pudo procesar el estado"),"error");const l=((i=event==null?void 0:event.target)==null?void 0:i.closest("button"))||((o=(r=window.event)==null?void 0:r.target)==null?void 0:o.closest("button"));l&&(l.disabled=!1,l.innerHTML='<i class="ph-bold ph-storefront"></i> Listo para Retiro')}},renderDashboard(t){const e=this.state.filterMonths,s=this.state.filterYear,n=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],i=this.state.sales.filter(h=>{const g=new Date(h.date);return g.getFullYear()===s&&e.includes(g.getMonth())}),r=[...i].sort((h,g)=>new Date(g.date)-new Date(h.date));let o=0,a=0,l=0,d=0;i.forEach(h=>{const g=h.channel==="discogs",w=Number(h.originalTotal)||Number(h.total_amount)||Number(h.total)||0,k=Number(h.total)||Number(h.total_amount)||0,$=g?w-k:0,I=Number(h.shipping_cost)||0;o+=w,l+=I;let E=0;const C=h.items||[];C.length>0?C.forEach(D=>{const j=Number(D.priceAtSale||D.unitPrice||D.price)||0,L=Number(D.qty||D.quantity)||1;let T=Number(D.costAtSale||D.cost)||0;const P=(D.owner||"").toLowerCase();if(P==="el cuartito"||P==="")T=Number(D.costAtSale||D.cost)||0;else if(T===0||isNaN(T)){const _=this.state.consignors?this.state.consignors.find(N=>(N.name||"").toLowerCase()===P):null,F=_&&(_.agreementSplit||_.split)||70;T=j*(Number(F)||70)/100,d+=T*L}else d+=T*L;E+=(j-T)*L}):E=w,a+=E-$});const c=this.state.vatActive?o-o/1.25:0;this.state.inventory.reduce((h,g)=>h+g.price*g.stock,0);const m=this.state.inventory.reduce((h,g)=>h+g.stock,0);let u=0,b=0,p=0;this.state.inventory.forEach(h=>{const g=(h.owner||"").toLowerCase(),w=parseInt(h.stock)||0,k=parseFloat(h.price)||0,$=parseFloat(h.cost)||0;if(g==="el cuartito"||g==="")u+=$*w,b+=(k-$)*w;else{let I=$;if(I===0){const C=this.state.consignors?this.state.consignors.find(j=>(j.name||"").toLowerCase()===g):null,D=C&&(C.agreementSplit||C.split)||70;I=k*(Number(D)||70)/100}const E=k-I;p+=E*w}});const x={};this.state.inventory.forEach(h=>{const g=h.owner||"El Cuartito";x[g]||(x[g]={count:0,value:0}),x[g].count+=parseInt(h.stock)||0,x[g].value+=(parseFloat(h.price)||0)*(parseInt(h.stock)||0)});const y=`
    <div class="max-w-7xl mx-auto space-y-6 pb-24 md:pb-8 px-4 md:px-8 pt-6">
                <!--Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="flex items-center gap-4">
                        <button onclick="app.navigate('dashboard')" class="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center text-white text-2xl shadow-lg shadow-brand-orange/30 hover:scale-105 transition-transform">
                            <i class="ph-fill ph-vinyl-record"></i>
                        </button>
                        <div>
                            <h2 class="font-display text-3xl font-bold text-brand-dark">Dashboard</h2>
                            <p class="text-slate-500">Resumen de <span class="font-bold text-brand-orange">${e.length===12?`Año ${s} `:`${e.map(h=>this.getMonthName(h)).join(", ")} ${s} `}</span></p>
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
                            ${n.map((h,g)=>`
                                <button onclick="app.toggleMonthFilter(${g})" 
                                    class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm ${e.includes(g)?"bg-brand-orange text-white shadow-brand-orange/30":"bg-white border border-slate-100 text-slate-400 hover:text-brand-dark hover:bg-slate-50"}">
                                    ${h}
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
                                <p class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(o)}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-slate-400 uppercase font-bold">Ganancia Neta</p>
                                <p class="text-xl font-bold text-green-600">${this.formatCurrency(a)}</p>
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
                                    <span class="text-2xl font-display font-bold text-brand-dark">${Math.min((o/5e4*100).toFixed(1),100)}<span class="text-sm text-slate-400 ml-0.5">%</span></span>
                                </div>
                            </div>
                            <div class="h-5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                                <!-- Marker for 50k -->
                                <div class="absolute right-0 top-0 bottom-0 w-0.5 bg-red-300 z-10 opacity-50"></div>
                                <div class="h-full bg-gradient-to-r from-brand-orange via-orange-400 to-red-500 transition-all duration-1000 ease-out shadow-[0_2px_10px_rgba(249,115,22,0.3)]" style="width: ${Math.min(o/5e4*100,100)}%">
                                    <div class="w-full h-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InN0cmlwZXMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVybkVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDAgMEgyMHY0MHptMjAgLTIwTDIwIDIwHDAiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjc3RyaXBlcykiLz48L3N2Zz4')] animate-[slide_2s_linear_infinite]"></div>
                                </div>
                            </div>
                            <div class="flex justify-between items-center mt-3">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">0 kr</p>
                                <p class="text-xs text-brand-orange font-bold bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                    ${o>=5e4?"⚠️ Límite Alcanzado":`Faltan ${this.formatCurrency(5e4-o)}`}
                                </p>
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">50.000 kr</p>
                            </div>
                        </div>
                    </div>

                        <div class="space-y-3">
                            <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                                <span class="text-sm font-bold text-green-700">Ganancia El Cuartito</span>
                                <span class="font-bold text-green-700">${this.formatCurrency(a)}</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <span class="text-sm font-bold text-blue-700">Share Socios (Pagar)</span>
                                <span class="font-bold text-blue-700">${this.formatCurrency(d)}</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                                <span class="text-sm font-bold text-orange-700">Costos de Envío</span>
                                <span class="font-bold text-orange-700">${this.formatCurrency(l)}</span>
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
                                    <p class="text-lg font-bold text-slate-700">${this.formatCurrency(u)}</p>
                                </div>
                                <div class="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                                    <p class="text-[10px] text-green-600 font-bold uppercase">Ganancia Latente (Propia)</p>
                                    <p class="text-lg font-bold text-green-700">${this.formatCurrency(b)}</p>
                                </div>
                                <div class="p-4 bg-purple-50 rounded-xl border border-purple-100 text-center col-span-2">
                                    <p class="text-[10px] text-purple-600 font-bold uppercase">Ganancia Latente (Socios)</p>
                                    <p class="text-lg font-bold text-purple-700">${this.formatCurrency(p)}</p>
                                </div>
                            </div>

                            <div class="space-y-1 mb-4 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Por Dueño</h4>
                                ${Object.entries(x).sort((h,g)=>g[1].count-h[1].count).map(([h,g])=>`
                                <div class="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <span class="font-bold text-slate-700 truncate max-w-[120px]" title="${h}">${h}</span>
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
                            <span class="text-2xl font-bold text-purple-700">${m}</span>
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
                    ${r.slice(0,5).map(h=>`
                                    <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                        <td class="py-3 font-medium text-brand-dark max-w-[200px] truncate">
                                            ${h.album||(h.items&&h.items[0]?h.items[0].album:"Venta rápida")}
                                        </td>
                                        <td class="py-3 text-slate-500">${this.formatDate(h.date)}</td>
                                        <td class="py-3 font-bold text-brand-dark text-right">${this.formatCurrency(h.total)}</td>
                                    </tr>
                                `).join("")||'<tr><td colspan="3" class="p-8 text-center text-slate-400">No hay ventas recientes</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
            </div>
    `;t.innerHTML=y,this.renderDashboardCharts(i)},renderInventoryCart(){const t=document.getElementById("inventory-cart-container");if(!t)return;if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden");const e=this.state.cart.map((s,n)=>`
    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                <div class="truncate pr-2">
                    <p class="font-bold text-xs text-brand-dark truncate">${s.album}</p>
                    <p class="text-[10px] text-slate-500 truncate">${this.formatCurrency(s.price)}</p>
                </div>
                <button onclick="app.removeFromCart(${n})" class="text-red-400 hover:text-red-600">
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
                     <span class="font-bold text-brand-dark text-lg">${this.formatCurrency(this.state.cart.reduce((s,n)=>s+n.price,0))}</span>
                </div>
                <button onclick="app.openCheckoutModal()" class="w-full py-2 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 text-sm hover:scale-[1.02] transition-transform">
                    Finalizar Venta
                </button>
            </div>
    `},renderInventoryContent(t,e,s,n,i){t.innerHTML=`
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
                                ${s.map(r=>`
                                    <div onclick="app.navigateInventoryFolder('genre', '${r}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange cursor-pointer transition-all group text-center">
                                        <div class="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-orange group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-folder-notch text-2xl"></i>
                                        </div>
                                        <h4 class="font-bold text-brand-dark text-sm truncate">${r}</h4>
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(o=>o.genre===r).length} items</p>
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
                                ${n.map(r=>`
                                    <div onclick="app.navigateInventoryFolder('owner', '${r}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange cursor-pointer transition-all group text-center">
                                        <div class="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500 group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-folder-user text-2xl"></i>
                                        </div>
                                        <h4 class="font-bold text-brand-dark text-sm truncate">${r}</h4>
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(o=>o.owner===r).length} items</p>
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
                                ${i.map(r=>`
                                    <div onclick="app.navigateInventoryFolder('storage', '${r.replace(/'/g,"\\'")}')" class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-orange cursor-pointer transition-all group text-center">
                                        <div class="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-500 group-hover:scale-110 transition-transform">
                                            <i class="ph-bold ph-tag text-2xl"></i>
                                        </div>
                                        <h4 class="font-bold text-brand-dark text-sm truncate">${r}</h4>
                                        <p class="text-xs text-slate-500">${this.state.inventory.filter(o=>o.storageLocation===r).length} items</p>
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

                        ${e.map(r=>`
                            <!-- Item Card -->
                            <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
                                onclick="app.openProductModal('${r.sku.replace(/'/g,"\\'")}')">
                                <div class="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-4 relative shadow-inner">
                                     ${r.cover_image?`<img src="${r.cover_image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`:'<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-fill ph-disc text-5xl"></i></div>'}
                                     <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                         <button onclick="event.stopPropagation(); app.addToCart('${r.sku.replace(/'/g,"\\'")}', event)" class="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-shopping-cart text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openProductModal('${r.sku.replace(/'/g,"\\'")}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-eye text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openPrintLabelModal('${r.sku.replace(/'/g,"\\'")}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-printer text-lg"></i>
                                         </button>
                                     </div>
                                     <div class="absolute top-2 right-2">
                                         ${this.getStatusBadge(r.condition)}
                                     </div>
                                </div>
                                <div class="flex-1 flex flex-col">
                                    <h3 class="font-bold text-brand-dark leading-tight mb-1 line-clamp-1" title="${r.album}">${r.album}</h3>
                                    <p class="text-xs text-slate-500 font-bold uppercase mb-3 truncate">${r.artist}</p>
                                    <div class="mt-auto flex justify-between items-center pt-3 border-t border-slate-50">
                                        <span class="font-display font-bold text-xl text-brand-orange">${this.formatCurrency(r.price)}</span>
                                        <span class="text-xs font-bold ${r.stock>0?"text-green-600 bg-green-50":"text-red-500 bg-red-50"} px-2 py-1 rounded-md">
                                            Stock: ${r.stock}
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
                                        ${e.length>0&&e.every(r=>this.state.selectedItems.has(r.sku))?"checked":""}>
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
                            ${e.map(r=>`
                                <tr class="hover:bg-orange-50/30 transition-colors group cursor-pointer relative ${this.state.selectedItems.has(r.sku)?"bg-orange-50/50":""}" 
                                    onclick="app.openProductModal('${r.sku.replace(/'/g,"\\'")}')">
                                    <td class="p-3" onclick="event.stopPropagation()">
                                        <input type="checkbox" onchange="app.toggleSelection('${r.sku.replace(/'/g,"\\'")}')"
                                            class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                            ${this.state.selectedItems.has(r.sku)?"checked":""}>
                                    </td>
                                    <td class="p-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 shrink-0 overflow-hidden shadow-sm border border-slate-100">
                                                ${r.cover_image?`<img src="${r.cover_image}" class="w-full h-full object-cover">`:'<i class="ph-fill ph-disc text-lg"></i>'}
                                            </div>
                                            <div class="min-w-0">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[180px]" title="${r.album}">${r.album}</div>
                                                <div class="text-xs text-slate-500 font-medium truncate max-w-[180px]">${r.artist}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-3 text-xs text-slate-500 font-medium max-w-[80px] truncate">${r.label||"-"}</td>
                                    <td class="p-3 text-center">${this.getStatusBadge(r.condition)}</td>
                                    <td class="p-3 text-right font-bold text-brand-dark font-display text-sm">${this.formatCurrency(r.price)}</td>
                                    <td class="p-3 text-center">
                                        <span class="px-2 py-0.5 rounded-full text-xs font-bold ${r.stock>0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}">
                                            ${r.stock}
                                        </span>
                                    </td>
                                    <td class="p-3 text-center">
                                        ${r.discogs_listing_id?'<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-purple-100 text-purple-600" title="Publicado en Discogs"><i class="ph-bold ph-check text-xs"></i></span>':'<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-300" title="No publicado"><i class="ph-bold ph-minus text-xs"></i></span>'}
                                    </td>
                                    <td class="p-3 text-right" onclick="event.stopPropagation()">
                                        <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onclick="event.stopPropagation(); app.openAddVinylModal('${r.sku.replace(/'/g,"\\'")}')" class="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-brand-dark hover:border-brand-dark transition-all flex items-center justify-center shadow-sm" title="Editar">
                                                <i class="ph-bold ph-pencil-simple text-sm"></i>
                                            </button>
                                            <button onclick="event.stopPropagation(); app.addToCart('${r.sku.replace(/'/g,"\\'")}', event)" class="w-7 h-7 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform" title="Añadir">
                                                <i class="ph-bold ph-shopping-cart text-sm"></i>
                                            </button>
                                            <button onclick="event.stopPropagation(); app.deleteVinyl('${r.sku.replace(/'/g,"\\'")}')" class="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-500 transition-all flex items-center justify-center shadow-sm" title="Eliminar">
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
`},renderInventory(t){const e=[...new Set(this.state.inventory.map(d=>d.genre).filter(Boolean))].sort(),s=[...new Set(this.state.inventory.map(d=>d.owner).filter(Boolean))].sort(),n=[...new Set(this.state.inventory.map(d=>d.label).filter(Boolean))].sort(),i=[...new Set(this.state.inventory.map(d=>d.storageLocation).filter(Boolean))].sort(),r=this.getFilteredInventory(),o=this.state.sortBy||"dateDesc";r.sort((d,c)=>{if(o==="priceDesc")return(c.price||0)-(d.price||0);if(o==="priceAsc")return(d.price||0)-(c.price||0);if(o==="stockDesc")return(c.stock||0)-(d.stock||0);const m=d.created_at?d.created_at.seconds?d.created_at.seconds*1e3:new Date(d.created_at).getTime():0,u=c.created_at?c.created_at.seconds?c.created_at.seconds*1e3:new Date(c.created_at).getTime():0;return o==="dateDesc"?u-m:o==="dateAsc"?m-u:0}),document.getElementById("inventory-layout-root")||(t.innerHTML=`
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
                ${this.state.inventory.map(d=>"<!-- Mobile Card Placeholder - Handled by renderInventoryContent actually? No, duplicate logic. Let's merge mobile into renderInventoryContent -->").join("")}
                <!-- Actually, let's let renderInventoryContent handle ALL content including mobile -->
            </div>
            <div id="inventory-content-container"></div>
        </div>
    </div>
                </div>
    `),this.renderInventoryCart();const a=document.getElementById("inventory-filters-container");a&&(a.innerHTML=`
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
                                ${e.map(d=>`<option value="${d}" ${this.state.filterGenre===d?"selected":""}>${d}</option>`).join("")}
                            </select>
                        </div>
                         <div>
                            <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">Label Disquería</label>
                            <select onchange="app.state.filterStorage = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todas</option>
                                ${i.map(d=>`<option value="${d}" ${this.state.filterStorage===d?"selected":""}>${d}</option>`).join("")}
                            </select>
                        </div>
                         <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-1 block">Sello (Discogs)</label>
                            <select onchange="app.state.filterLabel = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todos</option>
                                ${n.map(d=>`<option value="${d}" ${this.state.filterLabel===d?"selected":""}>${d}</option>`).join("")}
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
    `);const l=document.getElementById("inventory-content-container");l&&this.renderInventoryContent(l,r,e,s,i)},getStatusBadge(t){return`<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${{NM:"bg-green-100 text-green-700 border-green-200","VG+":"bg-blue-100 text-blue-700 border-blue-200",VG:"bg-yellow-100 text-yellow-700 border-yellow-200",G:"bg-orange-100 text-orange-700 border-orange-200",B:"bg-red-100 text-red-700 border-red-200",S:"bg-purple-100 text-purple-700 border-purple-200"}[t]||"bg-slate-100 text-slate-600 border-slate-200"}"> ${t}</span> `},renderCharts(t,e){const s=this.state.filterMonths;this.state.filterYear;const n=[],i=[],r=[];s.forEach(a=>{n.push(this.getMonthName(a).substring(0,3));const l=t.filter(c=>new Date(c.date).getMonth()===a).reduce((c,m)=>c+m.total,0),d=e.filter(c=>new Date(c.date).getMonth()===a).reduce((c,m)=>c+m.amount,0);i.push(l),r.push(d)});const o={};t.forEach(a=>{o[a.genre]=(o[a.genre]||0)+a.quantity}),new Chart(document.getElementById("financeChart"),{type:"bar",data:{labels:n,datasets:[{label:"Ventas",data:i,backgroundColor:"#F05A28",borderRadius:6},{label:"Gastos",data:r,backgroundColor:"#94a3b8",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom"}},scales:{y:{grid:{color:"#f1f5f9"},beginAtZero:!0},x:{grid:{display:!1}}}}})},renderDashboardCharts(t=[]){var d,c,m;const e=t.length>0?t:this.state.sales,s=(u,b)=>({type:"doughnut",data:{labels:Object.keys(u),datasets:[{data:Object.values(u),backgroundColor:["#F05A28","#FDE047","#8b5cf6","#10b981","#f43f5e","#64748b"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{boxWidth:10,font:{size:10}}}}}}),n={};e.forEach(u=>{const b=u.genre||"Desconocido";n[b]=(n[b]||0)+u.quantity}),this.genreChartInstance&&this.genreChartInstance.destroy();const i=(d=document.getElementById("genreChart"))==null?void 0:d.getContext("2d");i&&(this.genreChartInstance=new Chart(i,s(n)));const r={};e.forEach(u=>{const b=u.paymentMethod||"Desconocido";r[b]=(r[b]||0)+u.quantity}),this.paymentChartInstance&&this.paymentChartInstance.destroy();const o=(c=document.getElementById("paymentChart"))==null?void 0:c.getContext("2d");o&&(this.paymentChartInstance=new Chart(o,s(r)));const a={};e.forEach(u=>{const b=u.channel||"Local";a[b]=(a[b]||0)+u.quantity}),this.channelChartInstance&&this.channelChartInstance.destroy();const l=(m=document.getElementById("channelChart"))==null?void 0:m.getContext("2d");l&&(this.channelChartInstance=new Chart(l,s(a)))},updateFilter(t,e){t==="month"&&(this.state.filterMonth=parseInt(e)),t==="year"&&(this.state.filterYear=parseInt(e)),this.renderDashboard(document.getElementById("app-content"))},renderSales(t){var b;const e=this.state.filterYear,s=this.state.filterMonths,n=((b=document.getElementById("sales-payment-filter"))==null?void 0:b.value)||"all",i=this.state.salesHistorySearch.toLowerCase(),r=this.state.sales.filter(p=>{const x=new Date(p.date),f=x.getFullYear()===e&&s.includes(x.getMonth()),y=n==="all"||p.paymentMethod===n,h=!i||p.items&&p.items.some(g=>{const w=g.record||{};return(w.album||"").toLowerCase().includes(i)||(w.artist||"").toLowerCase().includes(i)||(w.sku||"").toLowerCase().includes(i)});return f&&y&&h}),o=r.reduce((p,x)=>p+parseFloat(x.shipping||x.shipping_cost||0),0),l=r.reduce((p,x)=>p+(parseFloat(x.total)||0),0)-o,d=r.reduce((p,x)=>{const f=parseFloat(x.total)||0,y=parseFloat(x.shipping||x.shipping_cost||0),h=f-y;let g=0;return x.items&&Array.isArray(x.items)?g=x.items.reduce((w,k)=>{var E;const $=parseFloat(k.costAtSale||((E=k.record)==null?void 0:E.cost)||0),I=parseInt(k.quantity||k.qty)||1;return w+$*I},0):g=(parseFloat(x.cost)||0)*(parseInt(x.quantity)||1),p+(h-g)},0),c=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],m=`
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
                            ${c.map((p,x)=>`
                                <button onclick="app.toggleMonthFilter(${x})" 
                                    class="px-2 py-1 rounded text-[10px] font-bold transition-all ${s.includes(x)?"bg-brand-orange text-white":"bg-white border border-orange-100 text-slate-400 hover:text-brand-orange"}">
                                    ${p}
                                </button>
                            `).join("")}
                        </div>
                    </div>
                </div>
                
                
                 <!--Sales Summary Cards(Moved to Top)-->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-brand-orange text-white p-5 rounded-2xl shadow-lg shadow-brand-orange/20 relative overflow-hidden">
                        <div class="relative z-10">
                            <p class="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1">Ventas Productos</p>
                            <h3 class="text-3xl font-display font-bold">${this.formatCurrency(l)}</h3>
                        </div>
                        <i class="ph-fill ph-trend-up absolute -right-4 -bottom-4 text-8xl text-white/10"></i>
                    </div>
                    <div class="bg-indigo-500 text-white p-5 rounded-2xl shadow-lg shadow-indigo-500/20 relative overflow-hidden">
                        <div class="relative z-10">
                            <p class="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Fondos de Envío</p>
                            <h3 class="text-3xl font-display font-bold">${this.formatCurrency(o)}</h3>
                        </div>
                        <i class="ph-fill ph-truck absolute -right-4 -bottom-4 text-8xl text-white/10"></i>
                    </div>
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden col-span-2 md:col-span-1">
                        <div class="relative z-10">
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Ganancia Neta</p>
                            <h3 class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(d)}</h3>
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
                                ${this.state.cart.map((p,x)=>`
                                    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <div class="truncate pr-2">
                                            <p class="font-bold text-xs text-brand-dark truncate">${p.album}</p>
                                            <p class="text-[10px] text-slate-500 truncate">${p.artist}</p>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold text-xs text-brand-orange">${this.formatCurrency(p.price)}</span>
                                            <button onclick="app.removeFromCart(${x}); app.renderSales(document.getElementById('app-content'))" class="text-slate-400 hover:text-red-500">
                                                <i class="ph-bold ph-x"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join("")}
                            </div>

                            <!-- Cart Total -->
                            <div class="pt-3 border-t border-slate-100 flex justify-between items-center mb-4">
                                <span class="text-sm font-bold text-slate-500">Total a Pagar</span>
                                <span class="font-display font-bold text-brand-dark text-xl">${this.formatCurrency(this.state.cart.reduce((p,x)=>p+x.price,0))}</span>
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
                            ${["El Cuartito",...this.state.consignors.map(p=>p.name)].map(p=>{const x=this.state.inventory.filter(w=>w.owner===p).reduce((w,k)=>w+k.stock,0),f=r.reduce((w,k)=>{if(k.owner===p){const $=k.items&&Array.isArray(k.items)?k.items.reduce((I,E)=>I+(parseInt(E.quantity||E.qty)||1),0):parseInt(k.quantity)||1;return w+$}return k.items&&Array.isArray(k.items)?w+k.items.filter($=>$.owner===p).length:w},0),y=x+f,h=y>0?x/y*100:0,g=y>0?f/y*100:0;return`
                                    <div>
                                        <div class="flex justify-between items-end mb-1">
                                            <span class="font-bold text-sm text-brand-dark">${p}</span>
                                            <span class="text-xs text-slate-500">Stock: ${x} | Vendidos: ${f}</span>
                                        </div>
                                        <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                            <div style="width: ${h}%" class="h-full bg-blue-500"></div>
                                            <div style="width: ${g}%" class="h-full bg-brand-orange"></div>
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
                                        <option value="all" ${n==="all"?"selected":""}>Todos</option>
                                        <option value="MobilePay" ${n==="MobilePay"?"selected":""}>MobilePay</option>
                                        <option value="Efectivo" ${n==="Efectivo"?"selected":""}>Efectivo</option>
                                        <option value="Tarjeta" ${n==="Tarjeta"?"selected":""}>Tarjeta</option>
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
                                            <th class="p-4 text-right">Envío</th>
                                            <th class="p-4 text-right">Total</th>
                                            <th class="p-4 text-center">Pago</th>
                                            <th class="p-4 text-center">Estado</th>
                                            <th class="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-orange-50">
                                        ${r.sort((p,x)=>{const f=p.date&&p.date.toDate?p.date.toDate():new Date(p.date);return(x.date&&x.date.toDate?x.date.toDate():new Date(x.date))-f}).map(p=>{var x,f;return`
                                             <tr class="hover:bg-orange-50/30 transition-colors cursor-pointer" onclick="app.openSaleDetailModal('${p.id}')">
                                                <td class="p-4 text-xs text-slate-500 whitespace-nowrap">
                                                     ${this.formatDate(p.date)}
                                                     <span class="block text-[10px] text-slate-400">${new Date(p.date).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                                                </td>
                                                <td class="p-4">
                                                    <div class="flex flex-col">
                                                        ${p.items&&p.items.length>0?p.items.length===1?`<span class="font-bold text-brand-dark text-sm truncate max-w-[180px]">${p.items[0].album||((x=p.items[0].record)==null?void 0:x.album)||"Desconocido"}</span>
                                                                 <span class="text-[10px] text-slate-400 truncate max-w-[180px]">${p.items[0].artist||((f=p.items[0].record)==null?void 0:f.artist)||"-"}</span>`:`<span class="font-bold text-brand-dark text-sm truncate max-w-[180px]">${p.items.length} items</span>
                                                                 <span class="text-[10px] text-slate-400 truncate max-w-[180px]">${p.items.map(y=>{var h;return y.album||((h=y.record)==null?void 0:h.album)}).filter(Boolean).join(", ")}</span>`:`<span class="font-bold text-brand-dark text-sm truncate max-w-[180px]">${p.album||"Venta Manual"}</span>
                                                             <span class="text-[10px] text-slate-400 truncate max-w-[180px]">${p.artist||"-"}</span>`}
                                                    </div>
                                                </td>
                                                <td class="p-4 text-center text-sm text-slate-600">${p.quantity||(p.items?p.items.reduce((y,h)=>y+(parseInt(h.quantity||h.qty)||1),0):1)}</td>
                                                <td class="p-4 text-right text-xs font-medium text-slate-500">${this.formatCurrency(p.shipping||p.shipping_cost||0)}</td>
                                                <td class="p-4 text-right font-bold text-brand-dark">${this.formatCurrency((parseFloat(p.total)||0)-parseFloat(p.shipping||p.shipping_cost||0))}</td>
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
                                        ${r.length===0?`
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
    `;t.innerHTML=m;const u=t.querySelector('input[placeholder="Buscar en historial..."]');u&&(u.focus(),u.setSelectionRange(u.value.length,u.value.length))},searchSku(t){const e=document.getElementById("sku-results");if(t.length<2){e.classList.add("hidden");return}const s=this.state.inventory.filter(n=>n.artist.toLowerCase().includes(t.toLowerCase())||n.album.toLowerCase().includes(t.toLowerCase())||n.sku.toLowerCase().includes(t.toLowerCase()));s.length>0?(e.innerHTML=s.map(n=>`
    <div onclick="app.selectSku('${n.sku}')" class="p-3 hover:bg-orange-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center">
                    <div>
                        <p class="font-bold text-sm text-brand-dark">${n.album}</p>
                        <p class="text-xs text-slate-500">${n.artist}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-sm text-brand-orange">${this.formatCurrency(n.price)}</p>
                        <p class="text-xs ${n.stock>0?"text-green-500":"text-red-500"}">Stock: ${n.stock}</p>
                    </div>
                </div>
    `).join(""),e.classList.remove("hidden")):e.classList.add("hidden")},selectSku(t){const e=this.state.inventory.find(d=>d.sku===t);if(!e)return;const s=document.getElementById("input-price"),n=document.getElementById("input-qty");document.getElementById("form-total"),s&&(s.value=e.price),n&&(n.value=1),document.getElementById("input-sku").value=e.sku,document.getElementById("input-cost").value=e.cost,document.getElementById("input-genre").value=e.genre,document.getElementById("input-artist").value=e.artist,document.getElementById("input-album").value=e.album,document.getElementById("input-owner").value=e.owner,setTimeout(()=>{const d=document.getElementById("sku-results");d&&d.classList.add("hidden")},200);const i=document.getElementById("sku-search");i&&(i.value=`${e.artist} - ${e.album} `),this.updateTotal();const r=document.getElementById("btn-submit-sale"),o=document.getElementById("btn-submit-sale-modal"),a=e.stock<=0,l=d=>{d&&(a?(d.disabled=!0,d.classList.add("opacity-50","cursor-not-allowed"),d.innerHTML='<i class="ph-bold ph-warning"></i> Sin Stock'):(d.disabled=!1,d.classList.remove("opacity-50","cursor-not-allowed"),d.innerHTML='<i class="ph-bold ph-check"></i> Registrar Venta'))};l(r),l(o),a&&this.showToast("⚠️ Producto sin stock")},updateTotal(){const t=parseFloat(document.getElementById("input-price").value)||0,e=parseInt(document.getElementById("input-qty").value)||1,s=t*e;document.getElementById("form-total").innerText=this.formatCurrency(s)},openAddVinylModal(t=null){let e={sku:"",artist:"",album:"",genre:"Minimal",condition:"NM",price:"",cost:"",stock:1,owner:"El Cuartito"},s=!1;if(t){const o=this.state.inventory.find(a=>a.sku===t);o&&(e=o,s=!0)}if(!s){const o=this.state.inventory.map(l=>{const d=l.sku.match(/^SKU\s*-\s*(\d+)/);return d?parseInt(d[1]):0}),a=Math.max(0,...o);e.sku=`SKU-${String(a+1).padStart(3,"0")}`}const n=["Minimal","Techno","House","Deep House","Electro"],i=[...new Set([...n,...this.state.customGenres||[]])],r=`
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
                                                        ${i.map(o=>`<option ${e.genre===o?"selected":""}>${o}</option>`).join("")}
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
                                                        ${i.map(o=>`<option ${e.genre2===o?"selected":""}>${o}</option>`).join("")}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género Terciario</label>
                                                    <select name="genre3" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${i.map(o=>`<option ${e.genre3===o?"selected":""}>${o}</option>`).join("")}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género 4</label>
                                                    <select name="genre4" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${i.map(o=>`<option ${e.genre4===o?"selected":""}>${o}</option>`).join("")}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género 5</label>
                                                    <select name="genre5" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${i.map(o=>`<option ${e.genre5===o?"selected":""}>${o}</option>`).join("")}
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
                                                        ${this.state.consignors.map(o=>`<option value="${o.name}" data-split="${o.split||o.agreementSplit||70}" ${e.owner===o.name?"selected":""}>${o.name} (${o.split||o.agreementSplit||70}%)</option>`).join("")}
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
                `;document.body.insertAdjacentHTML("beforeend",r)},openProductModal(t){console.log("Attempting to open modal for:",t);try{const e=this.state.inventory.find(i=>i.sku===t);if(!e){console.error("Item not found:",t),alert("Error: No se encontró el disco. Intenta recargar.");return}const s=document.getElementById("modal-overlay");s&&s.remove();const n=`
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
                `;document.body.insertAdjacentHTML("beforeend",n)}catch(e){console.error("Error opening product modal:",e),alert("Hubo un error al abrir la ficha. Por favor recarga la página.")}},handleCostChange(){const t=parseFloat(document.getElementById("modal-cost").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),n=document.getElementById("modal-margin"),i=document.getElementById("modal-price");if(s){const r=parseFloat(s)/100;if(r>0){const o=t/r;i.value=Math.ceil(o)}}else{const o=1-(parseFloat(n.value)||0)/100;if(o>0){const a=t/o;i.value=Math.ceil(a)}}},handlePriceChange(){const t=parseFloat(document.getElementById("modal-price").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),n=document.getElementById("modal-margin"),i=document.getElementById("modal-cost"),r=document.getElementById("cost-helper");if(s){const o=parseFloat(s)/100,a=t*o;i.value=Math.round(a),n.value=100-parseFloat(s),n.readOnly=!0,n.classList.add("opacity-50"),r&&(r.innerText=`Consignación: ${s}% Socio`)}else{const o=parseFloat(i.value)||0;if(o>0&&t>0){const a=(t-o)/o*100;n.value=Math.round(a)}n.readOnly=!1,n.classList.remove("opacity-50"),r&&(r.innerText="Modo Propio: Margen variable")}},handleMarginChange(){const t=parseFloat(document.getElementById("modal-margin").value)||0,e=parseFloat(document.getElementById("modal-cost").value)||0,s=document.getElementById("modal-price");if(e>0){const n=e*(1+t/100);s.value=Math.ceil(n)}},checkCustomInput(t,e){const s=document.getElementById(e);t.value==="other"?(s.classList.remove("hidden"),s.querySelector("input").required=!0,s.querySelector("input").focus()):(s.classList.add("hidden"),s.querySelector("input").required=!1)},toggleCollectionNote(t){const e=document.getElementById("collection-note-container");e&&t&&t!==""?e.classList.remove("hidden"):e&&e.classList.add("hidden")},handleCollectionChange(t){var n;const e=document.getElementById("custom-collection-container"),s=document.getElementById("collection-note-container");t==="other"?(e==null||e.classList.remove("hidden"),(n=e==null?void 0:e.querySelector("input"))==null||n.focus()):e==null||e.classList.add("hidden"),t&&t!==""?s==null||s.classList.remove("hidden"):s==null||s.classList.add("hidden")},openAddSaleModal(){const t=this.state.cart.length>0?this.state.cart.map(s=>`
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
                                    <span class="text-xl font-bold text-brand-dark">${this.formatCurrency(this.state.cart.reduce((s,n)=>s+n.price,0))}</span>
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
                                                    `;document.body.insertAdjacentHTML("beforeend",e),setTimeout(()=>document.getElementById("sku-search").focus(),100)},addToCart(t,e){e&&e.stopPropagation(),this.openAddSaleModal(),setTimeout(()=>{const s=document.getElementById("sku-search");s.value=t,this.searchSku(t),setTimeout(()=>{const n=document.getElementById("sku-results").firstElementChild;n&&n.click()},500)},200)},openSaleDetailModal(t){var c,m,u;const e=this.state.sales.find(b=>b.id===t);if(!e)return;const s=this.getCustomerInfo(e),n=e.items?e.items.reduce((b,p)=>b+(p.unitPrice||p.priceAtSale||0)*(p.qty||p.quantity||1),0):e.total||0,i=parseFloat(e.shipping_cost||e.shipping||0),r=e.total||n+i,o=b=>({shipped:'<span class="px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold uppercase">Enviado</span>',picked_up:'<span class="px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold uppercase">Retirado</span>',ready_for_pickup:'<span class="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase">Listo Retiro</span>',completed:'<span class="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold uppercase">Pagado</span>',paid:'<span class="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold uppercase">Pagado</span>'})[b]||"",a=b=>b?(b.toDate?b.toDate():new Date(b)).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):null,l=((c=e.shipping_method)==null?void 0:c.id)==="local_pickup",d=`
            <div id="sale-detail-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onclick="if(event.target === this) this.remove()">
                <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
                    <!-- Header -->
                    <div class="bg-brand-dark p-6 text-white relative shrink-0">
                        <button onclick="document.getElementById('sale-detail-modal').remove()" class="absolute top-4 right-4 text-white/70 hover:text-white">
                            <i class="ph-bold ph-x text-2xl"></i>
                        </button>
                        <h2 class="font-display font-bold text-2xl mb-1">Detalle de Orden</h2>
                        <div class="flex items-center gap-2 flex-wrap">
                            <p class="text-brand-orange font-bold text-sm uppercase tracking-wider">#${e.orderNumber||e.id.slice(0,8)}</p>
                            ${o(e.status)}
                            ${l?'<span class="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-bold uppercase">Local Pickup</span>':""}
                        </div>
                    </div>

                    <!-- Scrollable Content -->
                    <div class="overflow-y-auto flex-1 p-6 space-y-6">
                        
                        <!-- Customer Info -->
                        <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <i class="ph-bold ph-user-circle text-brand-orange"></i> Cliente
                            </h3>
                            <div class="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <label class="text-[9px] font-bold text-slate-400 uppercase block">Nombre</label>
                                    <p class="font-bold text-brand-dark">${s.name}</p>
                                </div>
                                <div>
                                    <label class="text-[9px] font-bold text-slate-400 uppercase block">Email</label>
                                    <p class="text-slate-600">${s.email}</p>
                                </div>
                                <div>
                                    <label class="text-[9px] font-bold text-slate-400 uppercase block">Teléfono</label>
                                    <p class="text-slate-600">${((m=e.customer)==null?void 0:m.phone)||"-"}</p>
                                </div>
                                <div>
                                    <label class="text-[9px] font-bold text-slate-400 uppercase block">Dirección</label>
                                    <p class="text-slate-600">${s.address}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Items -->
                        <div class="bg-white rounded-xl border border-slate-200">
                            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest p-4 border-b border-slate-100 flex items-center gap-2">
                                <i class="ph-bold ph-vinyl-record text-brand-orange"></i> Items (${((u=e.items)==null?void 0:u.length)||0})
                            </h3>
                            <div class="divide-y divide-slate-100">
                                ${e.items&&e.items.length>0?e.items.map(b=>`
                                    <div class="p-4 flex justify-between items-center">
                                        <div>
                                            <p class="font-bold text-brand-dark">${b.album||b.title||"Item"}</p>
                                            <p class="text-xs text-slate-500">${b.artist||""} ${b.sku?"• "+b.sku:""}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="font-bold text-brand-dark">${this.formatCurrency(b.unitPrice||b.priceAtSale||0)}</p>
                                            <p class="text-[10px] text-slate-400">x${b.qty||b.quantity||1}</p>
                                        </div>
                                    </div>
                                `).join(""):'<p class="p-4 text-slate-400 italic text-sm">Sin items detallados</p>'}
                            </div>
                        </div>

                        <!-- Totals -->
                        <div class="bg-orange-50 rounded-xl p-4 border border-orange-100">
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between text-slate-600">
                                    <span>Subtotal</span>
                                    <span>${this.formatCurrency(n)}</span>
                                </div>
                                <div class="flex justify-between text-slate-600">
                                    <span>Envío</span>
                                    <span>${i>0?this.formatCurrency(i):"Gratis"}</span>
                                </div>
                                <div class="flex justify-between font-bold text-brand-dark text-lg pt-2 border-t border-orange-200">
                                    <span>Total</span>
                                    <span>${this.formatCurrency(r)}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Timeline -->
                        <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <i class="ph-bold ph-clock-counter-clockwise text-brand-orange"></i> Historial
                            </h3>
                            <div class="space-y-3">
                                ${e.timestamp||e.created_at?`
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <i class="ph-bold ph-credit-card text-sm"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm font-bold text-brand-dark">Pago recibido</p>
                                            <p class="text-[10px] text-slate-500">${a(e.timestamp||e.created_at)}</p>
                                        </div>
                                    </div>
                                `:""}
                                ${e.status==="ready_for_pickup"||e.status==="picked_up"?`
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                            <i class="ph-bold ph-bell-ringing text-sm"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm font-bold text-brand-dark">Notificado listo para retiro</p>
                                            <p class="text-[10px] text-slate-500">${e.ready_at?a(e.ready_at):"Cliente notificado"}</p>
                                        </div>
                                    </div>
                                `:""}
                                ${e.status==="picked_up"?`
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                            <i class="ph-bold ph-hand-tap text-sm"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm font-bold text-brand-dark">Retirado por cliente</p>
                                            <p class="text-[10px] text-slate-500">${e.picked_up_at?a(e.picked_up_at):a(e.updated_at)||"Entregado"}</p>
                                        </div>
                                    </div>
                                `:""}
                                ${e.status==="shipped"&&e.shipment?`
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                            <i class="ph-bold ph-truck text-sm"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm font-bold text-brand-dark">Enviado</p>
                                            <p class="text-[10px] text-slate-500">Tracking: ${e.shipment.tracking_number}</p>
                                        </div>
                                    </div>
                                `:""}
                            </div>
                        </div>

                        <!-- Shipping/Tracking Info (if shipped) -->
                        ${e.shipment?`
                            <div class="bg-green-50 p-4 rounded-xl border border-green-100 flex justify-between items-center">
                                <div>
                                    <label class="text-[10px] font-bold text-green-600 uppercase block mb-0.5">Número de Seguimiento</label>
                                    <p class="font-mono font-bold text-brand-dark">${e.shipment.tracking_number}</p>
                                    <p class="text-[10px] text-slate-500">${e.shipment.carrier||"Correo"}</p>
                                </div>
                                <a href="${e.shipment.label_url||"#"}" target="_blank" class="bg-white p-3 rounded-xl border border-green-200 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm" title="Ver Etiqueta">
                                    <i class="ph-bold ph-file-pdf text-xl"></i>
                                </a>
                            </div>
                        `:""}

                    </div>

                    <!-- Actions Footer -->
                    <div class="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                        <div class="flex gap-3">
                            ${!e.shipment&&(e.status==="completed"||e.status==="paid")?`
                                <button onclick="app.setReadyForPickup('${e.id}')" class="flex-1 py-3 bg-orange-100 text-brand-orange font-bold rounded-xl hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="ph-bold ph-storefront"></i> Notificar Listo
                                </button>
                            `:""}
                            ${e.status==="ready_for_pickup"&&l?`
                                <button onclick="app.markAsDelivered('${e.id}')" class="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="ph-bold ph-hand-tap"></i> Ya lo Retiró
                                </button>
                            `:""}
                            ${!e.shipment&&!l&&(e.status==="completed"||e.status==="paid"||e.status==="ready_for_pickup")?`
                                <button onclick="app.manualShipOrder('${e.id}')" class="flex-1 py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm">
                                    <i class="ph-bold ph-truck"></i> Despachar
                                </button>
                            `:""}
                            <button onclick="document.getElementById('sale-detail-modal').remove()" class="px-6 py-3 bg-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-300 transition-colors text-sm">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;document.body.insertAdjacentHTML("beforeend",d)},navigateInventoryFolder(t,e){t==="genre"&&(this.state.filterGenre=e),t==="owner"&&(this.state.filterOwner=e),t==="label"&&(this.state.filterLabel=e),t==="storage"&&(this.state.filterStorage=e),this.refreshCurrentView()},toggleSelection(t){this.state.selectedItems.has(t)?this.state.selectedItems.delete(t):this.state.selectedItems.add(t),this.refreshCurrentView()},openPrintLabelModal(t){const e=this.state.inventory.find(n=>n.sku===t);if(!e)return;const s=`
    < div id = "print-label-modal" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" >
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
                                                    </div >
    `;document.body.insertAdjacentHTML("beforeend",s)},getFilteredInventory(){const t=(this.state.inventorySearch||"").toLowerCase(),e=this.state.filterGenre||"all",s=this.state.filterOwner||"all",n=this.state.filterLabel||"all",i=this.state.filterStorage||"all",r=this.state.filterDiscogs||"all";return this.state.inventory.filter(o=>{const a=!t||o.artist.toLowerCase().includes(t)||o.album.toLowerCase().includes(t)||o.sku.toLowerCase().includes(t),l=e==="all"||o.genre===e,d=s==="all"||o.owner===s,c=n==="all"||o.label===n,m=i==="all"||o.storageLocation===i,u=!!o.discogs_listing_id;return a&&l&&d&&c&&m&&(r==="all"||r==="yes"&&u||r==="no"&&!u)})},toggleSelectAll(){const t=this.getFilteredInventory();t.length>0&&t.every(e=>this.state.selectedItems.has(e.sku))?t.forEach(e=>this.state.selectedItems.delete(e.sku)):t.forEach(e=>this.state.selectedItems.add(e.sku)),this.refreshCurrentView()},addSelectionToCart(){this.state.selectedItems.forEach(t=>{const e=this.state.inventory.find(s=>s.sku===t);e&&e.stock>0&&(this.state.cart.find(s=>s.sku===t)||this.state.cart.push(e))}),this.state.selectedItems.clear(),this.showToast(`${this.state.cart.length} items agregados al carrito`),this.refreshCurrentView()},deleteSelection(){if(!confirm(`¿Estás seguro de eliminar ${this.state.selectedItems.size} productos ? `))return;const t=v.batch(),e=[];this.state.selectedItems.forEach(s=>{const n=v.collection("products").doc(s),i=this.state.inventory.find(r=>r.sku===s);i&&e.push(i),t.delete(n)}),t.commit().then(()=>{this.showToast("Productos eliminados"),e.forEach(s=>this.logInventoryMovement("DELETE",s)),this.state.selectedItems.clear()}).catch(s=>{console.error("Error logging movement:",s),alert("Error al eliminar")})},openAddExpenseModal(){const t=["Alquiler","Servicios","Marketing","Suministros","Honorarios"],s=`
    < div id = "modal-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" >
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
                                ${[...new Set([...t,...this.state.customCategories||[]])].map(n=>`<option>${n}</option>`).join("")}
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
                                                    </div >
    `;document.body.insertAdjacentHTML("beforeend",s)},async handleAddVinyl(t,e){t.preventDefault();const s=new FormData(t.target);let n=s.get("genre");n==="other"&&(n=s.get("custom_genre"));let i=s.get("collection");i==="other"&&(i=s.get("custom_collection"));const r=s.get("sku"),o=s.get("publish_webshop")==="on",a=s.get("publish_discogs")==="on",l=s.get("publish_local")==="on",d={sku:r,artist:s.get("artist"),album:s.get("album"),genre:n,genre2:s.get("genre2")||null,genre3:s.get("genre3")||null,genre4:s.get("genre4")||null,genre5:s.get("genre5")||null,label:s.get("label"),collection:i||null,collectionNote:s.get("collectionNote")||null,condition:s.get("condition"),sleeveCondition:s.get("sleeveCondition")||"",comments:s.get("comments")||"",price:parseFloat(s.get("price")),cost:parseFloat(s.get("cost"))||0,stock:parseInt(s.get("stock")),storageLocation:s.get("storageLocation"),owner:s.get("owner"),is_online:o,publish_webshop:o,publish_discogs:a,publish_local:l,cover_image:s.get("cover_image")||null,created_at:firebase.firestore.FieldValue.serverTimestamp()};try{let c=null,m=null;if(e){const u=await this.findProductBySku(e);if(!u){this.showToast("❌ Producto no encontrado","error");return}m=u.data,c=u.id,await u.ref.update(d),this.showToast("✅ Disco actualizado")}else c=(await v.collection("products").add(d)).id,this.showToast("✅ Disco agregado al inventario");if(a){const u=s.get("discogs_release_id");if(m&&m.discogs_listing_id)try{const p=await(await fetch(`https://el-cuartito-completo.onrender.com/discogs/update-listing/${m.discogs_listing_id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({product:d})})).json();if(p.success)this.showToast("💿 Listing de Discogs actualizado");else throw new Error(p.error||"Error desconocido")}catch(b){console.error("Error updating Discogs listing:",b),this.showToast(`⚠️ Error Discogs: ${b.message}`,"error")}else if(u)try{const p=await(await fetch("https://el-cuartito-completo.onrender.com/discogs/create-listing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({releaseId:parseInt(u),product:d})})).json();if(p.success&&p.listingId)await v.collection("products").doc(c).update({discogs_listing_id:String(p.listingId),discogs_release_id:parseInt(u)}),this.showToast("💿 Publicado en Discogs correctamente");else throw new Error(p.error||"Error desconocido")}catch(b){console.error("Error creating Discogs listing:",b);let p=b.message;(p.toLowerCase().includes("mp3")||p.toLowerCase().includes("digital")||p.toLowerCase().includes("format"))&&(p="Discogs solo permite formatos físicos (Vinyl, CD, Cassette). Este release es digital o MP3."),this.showToast(`⚠️ Error Discogs: ${p}`,"error")}else this.showToast("⚠️ Necesitas buscar el disco en Discogs primero para publicarlo","warning")}document.getElementById("modal-overlay").remove(),this.loadData()}catch(c){console.error(c),this.showToast("❌ Error: "+(c.message||"desconocido"),"error")}},deleteVinyl(t){const e=this.state.inventory.find(n=>n.sku===t);if(!e){alert("Error: Item not found");return}const s=`
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
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},async confirmDelete(t){const e=document.getElementById("delete-confirm-modal");e&&e.remove();const s=document.getElementById("modal-overlay");s&&s.remove();try{const n=await this.findProductBySku(t);if(!n){this.showToast("❌ Producto no encontrado","error");return}if(console.log("Product to delete:",n.data),console.log("Has discogs_listing_id?",n.data.discogs_listing_id),n.data.discogs_listing_id){console.log("Attempting to delete from Discogs:",n.data.discogs_listing_id);try{const i=await fetch(`https://el-cuartito-completo.onrender.com/discogs/delete-listing/${n.data.discogs_listing_id}`,{method:"DELETE"});console.log("Discogs delete response status:",i.status);const r=await i.json();console.log("Discogs delete result:",r),r.success?(console.log("Discogs listing deleted successfully"),this.showToast("💿 Eliminado de Discogs")):this.showToast("⚠️ "+(r.error||"Error en Discogs"),"warning")}catch(i){console.error("Error deleting from Discogs:",i),this.showToast("⚠️ Error eliminando de Discogs, pero continuando...","warning")}}else console.log("No discogs_listing_id found, skipping Discogs deletion");await n.ref.delete(),this.showToast("✅ Disco eliminado"),await this.loadData()}catch(n){console.error("Error removing document: ",n),this.showToast("❌ Error al eliminar: "+n.message,"error")}},handleSaleSubmit(t){var x,f,y,h,g,w,k;t.preventDefault();const e=new FormData(t.target);let s=e.get("sku");s||(s=(x=document.getElementById("input-sku"))==null?void 0:x.value);let n=parseInt(e.get("quantity"));isNaN(n)&&(n=parseInt((f=document.getElementById("input-qty"))==null?void 0:f.value)||1);let i=parseFloat(e.get("price"));isNaN(i)&&(i=parseFloat((y=document.getElementById("input-price"))==null?void 0:y.value)||0),parseFloat(e.get("cost")),e.get("date")||new Date().toISOString();const r=e.get("paymentMethod");e.get("soldAt"),e.get("comment");let o=e.get("artist");o||(o=(h=document.getElementById("input-artist"))==null?void 0:h.value);let a=e.get("album");a||(a=(g=document.getElementById("input-album"))==null?void 0:g.value);let l=e.get("genre");l||(l=(w=document.getElementById("input-genre"))==null?void 0:w.value);let d=e.get("owner");d||(d=(k=document.getElementById("input-owner"))==null?void 0:k.value);const c=e.get("customerName"),m=e.get("customerEmail"),u=e.get("requestInvoice")==="on",b=this.state.inventory.find($=>$.sku===s);if(!b){alert(`Producto con SKU "${s}" no encontrado en inventario`);return}const p={items:[{recordId:b.id,quantity:n}],paymentMethod:r||"CASH",customerName:c||"Venta Manual",customerEmail:m||null,source:"STORE"};B.createSale(p).then(()=>{this.showToast(u?"Venta registrada (Factura Solicitada)":"Venta registrada");const $=document.getElementById("modal-overlay");$&&$.remove();const I=t.target;I&&I.reset();const E=document.getElementById("form-total");E&&(E.innerText="$0.00");const C=document.getElementById("sku-search");C&&(C.value=""),this.loadData()}).catch($=>{console.error("Error adding sale: ",$),alert("Error al registrar venta: "+($.message||""))})},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(i=>i.sku===t);if(!s)return;if(this.state.cart.filter(i=>i.sku===t).length>=s.stock){this.showToast("⚠️ No hay más stock disponible");return}this.state.cart.push(s),document.getElementById("inventory-cart-container")?this.renderInventoryCart():this.renderCartWidget(),this.showToast("Agregado al carrito")},removeFromCart(t){this.state.cart.splice(t,1),this.renderCartWidget()},clearCart(){this.state.cart=[],this.renderCartWidget()},renderOnlineSales(t){const e=this.state.sales.filter(r=>r.channel==="online"),s=e.filter(r=>r.status==="completed"),n=e.filter(r=>r.status==="PENDING"),i=s.reduce((r,o)=>r+(parseFloat(o.total_amount||o.total)||0),0);t.innerHTML=`
        <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="font-display text-3xl font-bold text-brand-dark mb-2">🌐 Ventas WebShop</h1>
                    <p class="text-slate-500">Pedidos realizados a través de la tienda online</p>
                </div>
                <div class="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl">
                    <div class="text-sm font-medium opacity-90">Ingresos Totales</div>
                    <div class="text-3xl font-bold">DKK ${i.toFixed(2)}</div>
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
                            <div class="text-2xl font-bold text-brand-dark">${n.length}</div>
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
                                ${e.map(r=>{var a;const o=(a=r.timestamp)!=null&&a.toDate?r.timestamp.toDate():new Date(r.date||0);return{...r,_sortDate:o.getTime()}}).sort((r,o)=>o._sortDate-r._sortDate).map(r=>{var b,p,x,f,y,h,g;const o=r.customer||{},a=r.orderNumber||"N/A",l=(b=r.timestamp)!=null&&b.toDate?r.timestamp.toDate():new Date(r.date),c=((p=r.completed_at)!=null&&p.toDate?r.completed_at.toDate():null)||l,m={completed:"bg-green-50 text-green-700 border-green-200",PENDING:"bg-yellow-50 text-yellow-700 border-yellow-200",failed:"bg-red-50 text-red-700 border-red-200"},u={completed:"✅ Completado",PENDING:"⏳ Pendiente",failed:"❌ Fallido"};return`
                                        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openOnlineSaleDetailModal('${r.id}')">
                                            <td class="px-6 py-4">
                                                <div class="font-mono text-sm font-bold text-brand-orange">${a}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-semibold text-brand-dark">${o.name||(o.firstName?`${o.firstName} ${o.lastName||""}`:"")||((x=o.stripe_info)==null?void 0:x.name)||"Cliente"}</div>
                                                <div class="text-xs text-slate-500">${o.email||((f=o.stripe_info)==null?void 0:f.email)||"No email"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-slate-600 truncate max-w-[200px]">
                                                    ${((y=o.shipping)==null?void 0:y.line1)||o.address||((g=(h=o.stripe_info)==null?void 0:h.shipping)==null?void 0:g.line1)||"Sin dirección"}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm">
                                                    ${r.shipping_method?`
                                                        <div class="font-semibold text-brand-dark">${r.shipping_method.method||"Standard"}</div>
                                                        <div class="text-xs text-slate-500">DKK ${(r.shipping_method.price||0).toFixed(2)}</div>
                                                        ${r.shipping_method.estimatedDays?`<div class="text-[10px] text-slate-400">${r.shipping_method.estimatedDays} días</div>`:""}
                                                    `:'<span class="text-xs text-slate-400">No especificado</span>'}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm">
                                                    <div class="font-medium capitalize text-xs">${r.payment_method||r.paymentMethod||"card"}</div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark">DKK ${(r.total_amount||r.total||0).toFixed(2)}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full border ${m[r.status]||"bg-slate-50 text-slate-700"}">
                                                    ${u[r.status]||r.status}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${r.fulfillment_status==="shipped"?"bg-blue-100 text-blue-700":r.fulfillment_status==="preparing"?"bg-orange-100 text-orange-700":r.fulfillment_status==="delivered"?"bg-green-100 text-green-700":"bg-slate-100 text-slate-600"}">
                                                    ${(r.fulfillment_status||"pendiente").toUpperCase()}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-xs text-slate-600">
                                                    ${c.toLocaleDateString("es-ES")}
                                                    <div class="text-[10px] text-slate-400">${c.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-center" onclick="event.stopPropagation()">
                                                <button onclick="app.deleteSale('${r.id}')" class="text-slate-300 hover:text-red-500 transition-colors" title="Eliminar Pedido">
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
    `},openOnlineSaleDetailModal(t){var l,d,c;const e=this.state.sales.find(m=>m.id===t);if(!e)return;const s=e.customer||{},n=s.stripe_info||{},i=s.shipping||n.shipping||{},r={line1:i.line1||s.address||"Sin dirección",line2:i.line2||"",city:i.city||s.city||"",postal:i.postal_code||s.postalCode||"",country:i.country||s.country||"Denmark"},o=`
            <p class="font-medium">${r.line1}</p>
            ${r.line2?`<p class="font-medium">${r.line2}</p>`:""}
            <p class="text-slate-500">${r.postal} ${r.city}</p>
            <p class="text-slate-500 font-bold mt-1 uppercase tracking-wider">${r.country}</p>
        `,a=`
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
                                        ${o}
                                    </div>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Contacto</p>
                                    <p class="font-medium text-brand-dark">${s.email||n.email||"Sin email"}</p>
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
                                    ${(e.items||[]).map(m=>{var u,b,p;return`
                                        <tr>
                                            <td class="px-4 py-3">
                                                <p class="font-bold text-brand-dark">${m.album||((u=m.record)==null?void 0:u.album)||"Unknown"}</p>
                                                <p class="text-xs text-slate-500">${m.artist||((b=m.record)==null?void 0:b.artist)||""}</p>
                                            </td>
                                            <td class="px-4 py-3 text-center font-medium">${m.quantity||1}</td>
                                            <td class="px-4 py-3 text-right font-bold text-brand-dark">DKK ${(m.unitPrice||((p=m.record)==null?void 0:p.price)||0).toFixed(2)}</td>
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
    `;document.body.insertAdjacentHTML("beforeend",a)},renderCartWidget(){const t=document.getElementById("cart-widget");if(!t)return;const e=document.getElementById("cart-count"),s=document.getElementById("cart-items-mini"),n=document.getElementById("cart-total-mini");if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden"),e.innerText=this.state.cart.length;const i=this.state.cart.reduce((r,o)=>r+o.price,0);n.innerText=this.formatCurrency(i),s.innerHTML=this.state.cart.map((r,o)=>`
                                                                <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                                                    <div class="truncate pr-2">
                                                                        <p class="font-bold text-xs text-brand-dark truncate">${r.album}</p>
                                                                        <p class="text-[10px] text-slate-500 truncate">${r.price} kr.</p>
                                                                    </div>
                                                                    <button onclick="app.removeFromCart(${o})" class="text-red-400 hover:text-red-600">
                                                                        <i class="ph-bold ph-x"></i>
                                                                    </button>
                                                                </div>
                                                                `).join("")},openCheckoutModal(){if(this.state.cart.length===0)return;const t=this.state.cart.reduce((a,l)=>a+l.price,0),e=`
                                                                <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl transform scale-100 transition-all border border-orange-100 max-h-[90vh] overflow-y-auto">
                                                                        <div class="flex justify-between items-center mb-6">
                                                                            <h3 class="font-display text-xl font-bold text-brand-dark">Finalizar Venta (${this.state.cart.length} items)</h3>
                                                                            <button onclick="document.getElementById('modal-overlay').remove()" class="text-slate-400 hover:text-slate-600">
                                                                                <i class="ph-bold ph-x text-xl"></i>
                                                                            </button>
                                                                        </div>

                                                                        <div class="bg-orange-50/50 rounded-xl p-4 mb-6 border border-orange-100 max-h-40 overflow-y-auto custom-scrollbar">
                                                                            ${this.state.cart.map(a=>`
                            <div class="flex justify-between py-1 border-b border-orange-100/50 last:border-0 text-sm">
                                <span class="truncate pr-4 font-medium text-slate-700">${a.album}</span>
                                <span class="font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(a.price)}</span>
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
                                                                `;document.body.insertAdjacentHTML("beforeend",e);const s=t,n=document.getElementById("checkout-final-price"),i=document.getElementById("discogs-fee-section"),r=document.getElementById("discogs-fee-value"),o=()=>{const a=parseFloat(n.value)||0,l=s-a;document.getElementById("checkout-total-value").innerText=this.formatCurrency(a),l>0?(i.classList.remove("hidden"),r.innerText=`- kr. ${l.toFixed(0)}`):i.classList.add("hidden")};n.addEventListener("input",o)},onCheckoutChannelChange(t){},handleCheckoutSubmit(t){t.preventDefault();const e=new FormData(t.target),s=parseFloat(e.get("finalPrice"))||0,n=this.state.cart.reduce((r,o)=>r+o.price,0),i={items:this.state.cart.map(r=>({recordId:r.id,quantity:1})),paymentMethod:e.get("paymentMethod"),customerName:e.get("customerName"),customerEmail:e.get("customerEmail"),channel:e.get("soldAt")||"Tienda",source:"STORE",customTotal:s,originalTotal:n,feeDeducted:n-s};B.createSale(i).then(()=>{const r=i.channel==="Discogs"?" (Discogs listing eliminado)":"",o=i.feeDeducted>0?` | Fee: ${this.formatCurrency(i.feeDeducted)}`:"";this.showToast(`Venta de ${this.state.cart.length} items por ${this.formatCurrency(s)} registrada!${r}${o}`),this.clearCart(),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(r=>{console.error("Error checkout",r),alert("Error al procesar venta: "+r.message)})},handleSalesViewCheckout(){if(this.state.cart.length===0){this.showToast("El carrito está vacío");return}this.openCheckoutModal()},async deleteSale(t){var s;if(!confirm("¿Eliminar esta venta y restaurar stock?"))return;const e=this.state.sales.find(n=>n.id===t);if(!e){this.showToast("❌ Venta no encontrada","error");return}try{const n=v.batch(),i=v.collection("sales").doc(t);if(n.delete(i),e.items&&Array.isArray(e.items))for(const r of e.items){const o=r.productId||r.recordId,a=r.sku||((s=r.record)==null?void 0:s.sku),l=parseInt(r.quantity||r.qty)||1;let d=null;if(o)try{const c=await v.collection("products").doc(o).get();c.exists&&(d={ref:c.ref,data:c.data()})}catch{console.warn("Could not find product by ID:",o)}!d&&a&&(d=await this.findProductBySku(a)),d?n.update(d.ref,{stock:firebase.firestore.FieldValue.increment(l)}):console.warn("Could not restore stock for item:",r)}else if(e.sku){const r=await this.findProductBySku(e.sku);if(r){const o=parseInt(e.quantity)||1;n.update(r.ref,{stock:firebase.firestore.FieldValue.increment(o)})}}await n.commit(),this.showToast("✅ Venta eliminada y stock restaurado"),this.loadData()}catch(n){console.error("Error deleting sale:",n),this.showToast("❌ Error al eliminar venta: "+n.message,"error")}},renderExpenses(t){const e=["Alquiler","Servicios","Marketing","Suministros","Honorarios"],s=[...new Set([...e,...this.state.customCategories||[]])],n=(this.state.expensesSearch||"").toLowerCase(),i=this.state.expenses.filter(a=>!n||(a.description||"").toLowerCase().includes(n)||(a.category||"").toLowerCase().includes(n)),r=`
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
                                                                                                ${s.map(a=>`<option>${a}</option>`).join("")}
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
                                                                                        ${i.slice().reverse().map(a=>`
                                        <tr class="hover:bg-orange-50/30 transition-colors group">
                                            <td class="p-4 text-xs text-slate-500">${this.formatDate(a.date)}</td>
                                            <td class="p-4">
                                                <p class="text-sm font-bold text-brand-dark">${a.description}</p>
                                                <p class="text-xs text-slate-500">${a.category}</p>
                                            </td>
                                            <td class="p-4 text-right font-medium text-brand-dark">${this.formatCurrency(a.amount)}</td>
                                            <td class="p-4 text-center">
                                                ${a.hasVat?'<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Sí</span>':'<span class="text-xs bg-slate-100 text-slate-400 px-2 py-1 rounded">No</span>'}
                                            </td>
                                            <td class="p-4 text-center">
                                                <div class="flex gap-1 justify-center">
                                                    <button onclick="app.editExpense('${a.id}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-orange transition-all p-2" title="Editar">
                                                        <i class="ph-fill ph-pencil-simple"></i>
                                                    </button>
                                                    <button onclick="app.deleteExpense('${a.id}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-2" title="Eliminar">
                                                        <i class="ph-fill ph-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join("")}
                                                                                        ${i.length===0?`
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
                                                                `;t.innerHTML=r;const o=t.querySelector('input[placeholder="Buscar gasto..."]');o&&(o.focus(),o.setSelectionRange(o.value.length,o.value.length))},editExpense(t){if(!confirm("¿Seguro que deseas editar este gasto?"))return;const e=this.state.expenses.find(n=>n.id===t);if(!e)return;document.getElementById("expense-id").value=e.id,document.getElementById("expense-description").value=e.description,document.getElementById("expense-amount").value=e.amount,document.getElementById("hasVat").checked=e.hasVat;const s=document.getElementById("expense-category");[...s.options].some(n=>n.value===e.category)?s.value=e.category:(s.value="other",A.checkCustomInput(s,"custom-expense-category-container"),document.querySelector('[name="custom_category"]').value=e.category),document.getElementById("expense-form-title").innerText="Editar Gasto",document.getElementById("expense-submit-btn").innerText="Actualizar",document.getElementById("expense-cancel-btn").classList.remove("hidden")},resetExpenseForm(){document.getElementById("expense-form").reset(),document.getElementById("expense-id").value="",document.getElementById("expense-form-title").innerText="Nuevo Gasto",document.getElementById("expense-submit-btn").innerText="Guardar",document.getElementById("expense-cancel-btn").classList.add("hidden"),document.getElementById("custom-expense-category-container").classList.add("hidden")},handleExpenseSubmit(t){t.preventDefault();const e=new FormData(t.target);let s=e.get("category");if(s==="other"&&(s=e.get("custom_category"),this.state.customCategories||(this.state.customCategories=[]),!this.state.customCategories.includes(s))){const r=[...this.state.customCategories,s];v.collection("settings").doc("general").set({customCategories:r},{merge:!0})}const n={description:e.get("description"),category:s,amount:parseFloat(e.get("amount")),hasVat:e.get("hasVat")==="on",date:new Date().toISOString()},i=e.get("id");if(i){const r=this.state.expenses.find(o=>o.id===i);r&&(n.date=r.date),v.collection("expenses").doc(i).update(n).then(()=>{this.showToast("✅ Gasto actualizado"),this.loadData()}).catch(o=>console.error(o))}else v.collection("expenses").add(n).then(()=>{this.showToast("✅ Gasto registrado"),this.loadData()}).catch(r=>console.error(r));this.resetExpenseForm()},deleteExpense(t){confirm("¿Eliminar este gasto?")&&v.collection("expenses").doc(t).delete().then(()=>{this.showToast("✅ Gasto eliminado"),this.loadData()}).catch(e=>console.error(e))},renderConsignments(t){if(!t)return;const e=`
                                                                <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6 animate-fadeIn">
                                                                    <div class="flex justify-between items-center mb-8">
                                                                        <h2 class="font-display text-2xl font-bold text-brand-dark">Socios y Consignación</h2>
                                                                        <button onclick="app.openAddConsignorModal()" class="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                                            <i class="ph-bold ph-plus"></i>
                                                                            Nuevo Socio
                                                                        </button>
                                                                    </div>

                                                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        ${this.state.consignors.map(s=>{const n=s.name,r=this.state.inventory.filter(c=>c.owner===n).reduce((c,m)=>c+m.stock,0),o=[];this.state.sales.forEach(c=>{(c.items||[]).filter(u=>{if((u.owner||"").toLowerCase()===n.toLowerCase())return!0;const b=this.state.inventory.find(p=>p.id===(u.productId||u.recordId));return b&&(b.owner||"").toLowerCase()===n.toLowerCase()}).forEach(u=>{const b=Number(u.priceAtSale||u.unitPrice||0),p=s.agreementSplit||s.split||70,x=b*p/100;o.push({...u,id:c.id,date:c.date,cost:u.costAtSale||u.cost||x,payoutStatus:c.payoutStatus||"pending",payoutDate:c.payoutDate||null})}),(!c.items||c.items.length===0)&&(c.owner||"").toLowerCase()===n.toLowerCase()&&o.push({...c,album:c.album||c.sku||"Record",cost:c.cost||(Number(c.total)||0)*(s.agreementSplit||70)/100})}),o.sort((c,m)=>new Date(m.date)-new Date(c.date)),o.reduce((c,m)=>c+(Number(m.qty||m.quantity)||1),0);const a=o.reduce((c,m)=>c+(Number(m.cost)||0),0),l=o.filter(c=>c.payoutStatus==="paid").reduce((c,m)=>c+(Number(m.cost)||0),0),d=a-l;return`
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
                                    <p class="font-display font-bold text-xl text-brand-dark">${r}</p>
                                </div>
                                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Pendiente Pago</p>
                                    <p class="font-display font-bold text-xl ${d>0?"text-brand-orange":"text-slate-500"}">${this.formatCurrency(d)}</p>
                                </div>
                            </div>

                            <div class="border-t border-slate-100 pt-4">
                                <div class="flex justify-between items-center mb-4">
                                    <h4 class="font-bold text-sm text-brand-dark">Historial de Ventas</h4>
                                    <span class="text-xs text-slate-500 font-medium">Pagado: ${this.formatCurrency(l)}</span>
                                </div>
                                <div class="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                    ${o.length>0?o.map(c=>`
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

                                                                    `)},handleAddConsignor(t){t.preventDefault();const e=new FormData(t.target),s={name:e.get("name"),agreementSplit:parseFloat(e.get("split")),email:e.get("email"),phone:e.get("phone")};v.collection("consignors").add(s).then(()=>{this.showToast("✅ Socio registrado correctamente"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(n=>{console.error(n),this.showToast("❌ Error al crear socio: "+n.message,"error")})},deleteConsignor(t){confirm("¿Eliminar este socio?")&&v.collection("consignors").doc(t).delete().then(()=>{this.showToast("✅ Socio eliminado"),this.loadData()}).catch(e=>{console.error(e),this.showToast("❌ Error al eliminar socio: "+e.message,"error")})},saveData(){try{const t={vatActive:this.state.vatActive};localStorage.setItem("el-cuartito-settings",JSON.stringify(t))}catch(t){console.error("Error saving settings:",t)}},renderVAT(t){const e=l=>l?l.toDate?l.toDate().getFullYear():new Date(l).getFullYear():0,s=this.state.sales.filter(l=>e(l.date)===this.state.filterYear),n=this.state.expenses.filter(l=>e(l.date)===this.state.filterYear);let i=0,r=0;this.state.vatActive&&(i=s.reduce((l,d)=>l+this.getVatComponent(d.total),0),r=n.filter(l=>l.hasVat).reduce((l,d)=>l+this.getVatComponent(d.amount),0));const o=i-r,a=`
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
                                                                                <h2 class="text-6xl font-display font-bold mb-2">${this.formatCurrency(o)}</h2>
                                                                                <p class="text-sm text-slate-400">${o>0?"A pagar a Skat":"A reclamar"}</p>
                                                                            </div>
                                                                        </div>

                                                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                            <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                                                                                <h3 class="font-bold text-lg mb-4 text-brand-dark">VAT Recaudado (Ventas)</h3>
                                                                                <div class="space-y-3">
                                                                                    <div class="flex justify-between text-sm">
                                                                                        <span class="text-slate-500">Ventas Brutas</span>
                                                                                        <span class="font-medium">${this.formatCurrency(s.reduce((l,d)=>l+d.total,0))}</span>
                                                                                    </div>
                                                                                    <div class="flex justify-between text-sm pt-3 border-t border-slate-100">
                                                                                        <span class="font-bold text-brand-orange">Total VAT (25%)</span>
                                                                                        <span class="font-bold text-brand-orange">${this.formatCurrency(i)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                                                                                <h3 class="font-bold text-lg mb-4 text-brand-dark">VAT Deducible (Gastos)</h3>
                                                                                <div class="space-y-3">
                                                                                    <div class="flex justify-between text-sm">
                                                                                        <span class="text-slate-500">Gastos con VAT</span>
                                                                                        <span class="font-medium">${this.formatCurrency(n.filter(l=>l.hasVat).reduce((l,d)=>l+d.amount,0))}</span>
                                                                                    </div>
                                                                                    <div class="flex justify-between text-sm pt-3 border-t border-slate-100">
                                                                                        <span class="font-bold text-green-600">Total Deducible</span>
                                                                                        <span class="font-bold text-green-600">${this.formatCurrency(r)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `;t.innerHTML=a},toggleVAT(){this.state.vatActive=!this.state.vatActive,this.saveData(),this.renderVAT(document.getElementById("app-content"))},searchDiscogs(){const t=document.getElementById("discogs-search-input").value,e=document.getElementById("discogs-results");if(!t)return;const s=localStorage.getItem("discogs_token");if(!s){e.innerHTML=`
                <div class="text-center py-4 px-3">
                    <p class="text-xs text-red-500 font-bold mb-2">⚠️ Token de Discogs no configurado</p>
                    <button onclick="app.navigate('settings'); document.getElementById('modal-overlay').remove()" 
                        class="text-xs font-bold text-brand-orange hover:underline">
                        Ir a Configuración →
                    </button>
                </div>
            `,e.classList.remove("hidden");return}if(e.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Buscando en Discogs...</p>',e.classList.remove("hidden"),/^\d+$/.test(t.trim())){this.fetchDiscogsById(t.trim());return}fetch(`https://api.discogs.com/database/search?q=${encodeURIComponent(t)}&type=release&token=${s}`).then(n=>{if(n.status===401)throw new Error("Token inválido o expirado");if(!n.ok)throw new Error(`Error ${n.status}`);return n.json()}).then(n=>{n.results&&n.results.length>0?e.innerHTML=n.results.slice(0,10).map(i=>`
                        <div onclick='app.handleDiscogsSelection(${JSON.stringify(i).replace(/'/g,"&#39;")})' class="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-brand-orange hover:shadow-sm transition-all">
                            <img src="${i.thumb||"logo.jpg"}" class="w-12 h-12 rounded object-cover bg-slate-100 flex-shrink-0">
                            <div class="flex-1 min-w-0">
                                <p class="font-bold text-xs text-brand-dark leading-tight mb-1">${i.title}</p>
                                <p class="text-[10px] text-slate-500">${i.year||"?"} · ${i.format?i.format.join(", "):"Vinyl"} · ${i.country||""}</p>
                                <p class="text-[10px] text-slate-400">${i.label?i.label[0]:""}</p>
                            </div>
                            <i class="ph-bold ph-plus-circle text-brand-orange text-lg flex-shrink-0"></i>
                        </div>
                    `).join(""):e.innerHTML='<p class="text-xs text-slate-400 p-2">No se encontraron resultados.</p>'}).catch(n=>{console.error(n),e.innerHTML=`
                    <div class="text-center py-4 px-3">
                        <p class="text-xs text-red-500 font-bold mb-2">❌ ${n.message}</p>
                        <button onclick="app.navigate('settings'); document.getElementById('modal-overlay').remove()" 
                            class="text-xs font-bold text-brand-orange hover:underline">
                            Verificar Token en Configuración →
                        </button>
                    </div>
                `})},resyncMusic(){["input-discogs-id","input-discogs-release-id","input-discogs-url","input-cover-image"].forEach(n=>{const i=document.getElementById(n);i&&(i.value="")});const t=document.querySelector('input[name="artist"]').value,e=document.querySelector('input[name="album"]').value,s=document.getElementById("discogs-search-input");s&&t&&e?(s.value=`${t} - ${e}`,this.searchDiscogs(),this.showToast("✅ Música desvinculada. Selecciona una nueva edición.","success")):this.showToast("⚠️ Falta Artista o Álbum para buscar.","error")},handleDiscogsSelection(t){const e=t.title.split(" - "),s=e[0]||"",n=e.slice(1).join(" - ")||t.title,i=document.querySelector("#modal-overlay form");if(!i)return;if(i.artist&&(i.artist.value=s),i.album&&(i.album.value=n),i.year&&t.year&&(i.year.value=t.year),i.label&&t.label&&t.label.length>0&&(i.label.value=t.label[0]),t.thumb||t.cover_image){const a=t.cover_image||t.thumb,l=document.getElementById("input-cover-image"),d=document.getElementById("cover-preview");l&&(l.value=a),d&&(d.querySelector("img").src=a,d.classList.remove("hidden"))}const r=document.getElementById("input-discogs-release-id");r&&t.id&&(r.value=t.id);const o=localStorage.getItem("discogs_token");if(o&&t.id)this.showToast("⏳ Cargando géneros...","info"),fetch(`https://api.discogs.com/releases/${t.id}?token=${o}`).then(a=>a.json()).then(a=>{console.log("Full Discogs Release:",a);const l=[...a.styles||[],...a.genres||[]];console.log("ALL Genres/Styles from full release:",l);const d=[...new Set(l)];if(d.length>0){const x=i.querySelector('select[name="genre"]'),f=i.querySelector('select[name="genre2"]'),y=i.querySelector('select[name="genre3"]'),h=i.querySelector('select[name="genre4"]'),g=i.querySelector('select[name="genre5"]'),w=[x,f,y,h,g];d.slice(0,5).forEach((k,$)=>{if(w[$]){let I=!1;for(let E of w[$].options)if(E.value===k){w[$].value=k,I=!0;break}if(!I){const E=document.createElement("option");E.value=k,E.text=k,E.selected=!0,w[$].add(E)}}}),this.showToast(`✅ ${d.length} géneros cargados`,"success")}if(a.images&&a.images.length>0){const x=a.images[0].uri,f=document.getElementById("input-cover-image"),y=document.getElementById("cover-preview");f&&(f.value=x),y&&(y.querySelector("img").src=x)}const c=document.getElementById("tracklist-preview"),m=document.getElementById("tracklist-preview-content");c&&m&&a.tracklist&&a.tracklist.length>0&&(m.innerHTML=a.tracklist.map(x=>`
                            <div class="flex items-center gap-2 py-1 border-b border-slate-100 last:border-0">
                                <span class="text-[10px] font-mono text-slate-400 w-6">${x.position||""}</span>
                                <span class="flex-1">${x.title}</span>
                                <span class="text-[10px] text-slate-400">${x.duration||""}</span>
                            </div>
                        `).join(""),c.classList.remove("hidden"));const u=document.getElementById("price-suggestions-preview"),b=document.getElementById("price-suggestions-content"),p=document.getElementById("discogs-release-link");if(p&&a.uri){const x=a.uri.startsWith("http")?a.uri:"https://www.discogs.com"+a.uri;p.href=x,p.classList.remove("hidden")}u&&b&&(b.innerHTML='<div class="col-span-2 text-[10px] text-slate-400 animate-pulse">Consultando mercado...</div>',u.classList.remove("hidden"),fetch(`${S}/discogs/price-suggestions/${t.id}`).then(f=>f.json()).then(f=>{if(f.success&&f.suggestions){const y=f.suggestions,h=y.currency==="DKK"?" kr.":y.currency==="USD"?" $":" "+y.currency,g=(w,k)=>{const $=y[k];return`
                                            <div class="bg-white p-2 rounded-lg border border-brand-orange/10">
                                                <span class="text-[9px] text-slate-400 block leading-none mb-1">${w}</span>
                                                <span class="font-bold text-brand-dark">${$?$.value.toFixed(0)+h:"N/A"}</span>
                                            </div>
                                        `};b.innerHTML=`
                                        ${g("Mint (M)","Mint (M)")}
                                        ${g("Near Mint (NM)","Near Mint (NM or M-)")}
                                        ${g("Very Good Plus (VG+)","Very Good Plus (VG+)")}
                                        ${g("Very Good (VG)","Very Good (VG)")}
                                    `}else b.innerHTML='<div class="col-span-2 text-[10px] text-slate-400">Precios no disponibles para este release</div>'}).catch(f=>{console.error("Price suggestion error:",f),b.innerHTML='<div class="col-span-2 text-[10px] text-red-400 italic">Error al consultar precios</div>'}))}).catch(a=>{console.error("Error fetching full release:",a),this.showToast("⚠️ No se pudieron cargar todos los géneros","warning")});else{const a=[...t.style||[],...t.genre||[]];console.log("Fallback Genres (limited, no token):",a);const l=[...new Set(a)];if(l.length>0){const d=i.querySelector('select[name="genre"]');if(d){const c=l[0];let m=!1;for(let u of d.options)if(u.value===c){d.value=c,m=!0;break}if(!m){const u=document.createElement("option");u.value=c,u.text=c,u.selected=!0,d.add(u)}}}}if(t.uri||t.resource_url){const a=t.uri||t.resource_url,l=a.startsWith("http")?a:"https://www.discogs.com"+a,d=document.getElementById("input-discogs-url");d&&(d.value=l)}if(t.id){const a=document.getElementById("input-discogs-id");a&&(a.value=t.id)}document.getElementById("discogs-results").classList.add("hidden")},openTracklistModal(t){const e=this.state.inventory.find(r=>r.sku===t);if(!e)return;let s=e.discogsId;document.body.insertAdjacentHTML("beforeend",`
                                                                <div id="tracklist-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-fadeIn">
                                                                        <h3 class="font-display text-xl font-bold text-brand-dark mb-4">Lista de Temas (Tracklist)</h3>
                                                                        <div class="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                                                            <i class="ph-bold ph-spinner animate-spin text-4xl text-brand-orange"></i>
                                                                            <p class="font-medium">Cargando tracks desde Discogs...</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `);const i=r=>{const o=localStorage.getItem("discogs_token")||"hSIAXlFqQzYEwZzzQzXlFqQzYEwZzz";fetch(`https://api.discogs.com/releases/${r}?token=${o}`).then(a=>{if(!a.ok)throw new Error("Release not found");return a.json()}).then(a=>{const l=a.tracklist||[],d=l.map(m=>`
                                                                <div class="flex items-center justify-between py-3 border-b border-slate-50 hover:bg-slate-50 px-2 transition-colors rounded-lg group">
                                                                    <div class="flex items-center gap-3">
                                                                        <span class="text-xs font-mono font-bold text-slate-400 w-8">${m.position}</span>
                                                                        <span class="text-sm font-bold text-brand-dark group-hover:text-brand-orange transition-colors">${m.title}</span>
                                                                    </div>
                                                                    <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">${m.duration||"--:--"}</span>
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
                                                                        ${l.length>0?d:'<p class="text-center text-slate-500 py-8">No se encontraron temas para esta edición.</p>'}
                                                                    </div>
                                                                    <div class="p-3 bg-slate-50 text-center shrink-0 border-t border-slate-100">
                                                                        <a href="https://www.discogs.com/release/${r}" target="_blank" class="text-xs font-bold text-brand-orange hover:underline flex items-center justify-center gap-1">
                                                                            Ver release completo en Discogs <i class="ph-bold ph-arrow-square-out"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                `;document.getElementById("tracklist-overlay").innerHTML=c}).catch(a=>{console.error(a),document.getElementById("tracklist-overlay").innerHTML=`
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
                                                                `})};if(s)i(s);else{const r=`${e.artist} - ${e.album}`,o=localStorage.getItem("discogs_token")||"hSIAXlFqQzYEwZzzQzXlFqQzYEwZzz";fetch(`https://api.discogs.com/database/search?q=${encodeURIComponent(r)}&type=release&token=${o}`).then(a=>a.json()).then(a=>{if(a.results&&a.results.length>0)i(a.results[0].id);else throw new Error("No results found in fallback search")}).catch(()=>{document.getElementById("tracklist-overlay").innerHTML=`
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
                    `})}},renderDiscogsSales(t){const e=this.state.sales.filter(l=>l.channel==="discogs"),s=l=>parseFloat(l.total)||0,n=l=>parseFloat(l.originalTotal)||parseFloat(l.total)+(parseFloat(l.discogsFee||0)+parseFloat(l.paypalFee||0)),i=l=>n(l)-s(l),r=e.reduce((l,d)=>l+s(d),0),o=e.reduce((l,d)=>l+i(d),0),a=e.reduce((l,d)=>{const c=s(d);let m=0;return d.items&&Array.isArray(d.items)&&(m=d.items.reduce((u,b)=>{const p=parseFloat(b.costAtSale||0),x=parseInt(b.qty||b.quantity)||1;return u+p*x},0)),l+(c-m)},0);t.innerHTML=`
        <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="font-display text-3xl font-bold text-brand-dark mb-2">💿 Ventas Discogs</h1>
                    <p class="text-slate-500">Ventas realizadas a través de Discogs Marketplace</p>
                </div>
                <div class="bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-2xl shadow-xl">
                    <div class="text-sm font-medium opacity-90">Ingresos Netos (Caja)</div>
                    <div class="text-3xl font-bold">${this.formatCurrency(r)}</div>
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
                            <div class="text-2xl font-bold text-red-600">${this.formatCurrency(o)}</div>
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
                            <div class="text-2xl font-bold text-green-600">${this.formatCurrency(a)}</div>
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
                                ${e.map(l=>{var c;const d=(c=l.timestamp)!=null&&c.toDate?l.timestamp.toDate():l.date?new Date(l.date):new Date(0);return{...l,_sortDate:d.getTime()}}).sort((l,d)=>d._sortDate-l._sortDate).map(l=>{var p;const d=(p=l.timestamp)!=null&&p.toDate?l.timestamp.toDate():new Date(l.date),c=l.items&&l.items[0],m=l.originalTotal||l.total+(l.discogsFee||0)+(l.paypalFee||0);l.discogsFee,l.paypalFee;const u=l.total,b=l.status==="pending_review"||l.needsReview;return`
                                        <tr class="border-b border-slate-50 hover:bg-purple-50/30 transition-colors ${b?"bg-orange-50/50":""}">
                                            <td class="px-6 py-4 text-sm text-slate-600">${d.toLocaleDateString("es-ES")}</td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark text-sm truncate max-w-[200px]">${(c==null?void 0:c.album)||"Producto"}</div>
                                                <div class="text-xs text-slate-500">${(c==null?void 0:c.artist)||"-"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-xs text-slate-500">Precio Lista: <span class="font-bold text-slate-700">${this.formatCurrency(m)}</span></div>
                                                ${l.discogs_order_id?`<div class="text-[10px] text-purple-600 font-medium">Order: ${l.discogs_order_id}</div>`:""}
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-[10px] text-red-500 font-bold">Total Fees: -${this.formatCurrency(m-u)}</div>
                                                <div class="text-[10px] text-slate-400 font-medium">
                                                    ${m>0?`(${((m-u)/m*100).toFixed(1)}%)`:""}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm font-bold text-brand-dark">${this.formatCurrency(u)}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="flex flex-col gap-2">
                                                    ${b?`
                                                        <span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider text-center">Pendiente</span>
                                                    `:`
                                                        <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider text-center">Confirmado</span>
                                                    `}
                                                    <button onclick="app.openUpdateSaleValueModal('${l.id}', ${m}, ${u})" class="w-full py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1">
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
        `;document.body.insertAdjacentHTML("beforeend",s)},calculateModalFee(t,e){const s=parseFloat(t)||0,n=e-s,i=e>0?n/e*100:0,r=document.getElementById("modal-fee-display"),o=document.getElementById("modal-fee-value");if(n>0){r.classList.remove("hidden"),o.innerText=`- kr. ${n.toFixed(2)}`;const a=document.getElementById("modal-fee-percent");a&&(a.innerText=`${i.toFixed(1)}%`)}else r.classList.add("hidden")},async handleSaleValueUpdate(t,e,s){t.preventDefault();const i=new FormData(t.target).get("netReceived"),r=document.getElementById("update-sale-submit-btn");if(i){r.disabled=!0,r.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Guardando...';try{const o=S,a=await M.currentUser.getIdToken(),l=await fetch(`${o}/firebase/sales/${e}/value`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${a}`},body:JSON.stringify({netReceived:i})}),d=l.headers.get("content-type");if(!d||!d.includes("application/json")){const m=await l.text();throw console.error("Non-JSON response received:",m),new Error(`Server returned non-JSON response (${l.status})`)}const c=await l.json();if(c.success)this.showToast("✅ Venta actualizada y fee registrado"),document.getElementById("update-sale-modal").remove(),await this.loadData(),this.refreshCurrentView();else throw new Error(c.error||"Error al actualizar")}catch(o){console.error("Update sale error:",o),this.showToast(`❌ Error: ${o.message}`),r.disabled=!1,r.innerText="Confirmar Ajuste"}}},renderPickups(t){const e=this.state.sales.filter(o=>{var a;return o.channel==="online"&&(((a=o.shipping_method)==null?void 0:a.id)==="local_pickup"||o.shipping_cost===0&&o.status!=="failed")}),s=e.filter(o=>o.status==="completed"||o.status==="paid"||o.status==="paid_pending"),n=e.filter(o=>o.status==="ready_for_pickup"),i=e.filter(o=>o.status==="shipped"||o.status==="delivered"||o.status==="picked_up"),r=`
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
                                <p class="text-xl font-display font-bold">${n.length}</p>
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
                                `:s.map(o=>{var a,l;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openSaleDetailModal('${o.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${o.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${((a=o.customer)==null?void 0:a.name)||o.customerName||"Cliente"}</td>
                                        <td class="p-4 text-xs text-slate-500">${((l=o.items)==null?void 0:l.length)||0} items</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate(o.date)}</td>
                                        <td class="p-4 text-center" onclick="event.stopPropagation()">
                                            <button onclick="app.setReadyForPickup('${o.id}')" class="bg-brand-dark text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto">
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
                                ${n.length===0?`
                                    <tr>
                                        <td colspan="4" class="p-12 text-center text-slate-400 italic">No hay pedidos esperando retiro.</td>
                                    </tr>
                                `:n.map(o=>{var a,l;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openSaleDetailModal('${o.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${o.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${((a=o.customer)==null?void 0:a.name)||o.customerName||"Cliente"}</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate((l=o.updated_at)!=null&&l.toDate?o.updated_at.toDate():o.updated_at||o.date)}</td>
                                        <td class="p-4 text-center" onclick="event.stopPropagation()">
                                            <button onclick="app.markAsDelivered('${o.id}')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto">
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
                                ${i.slice(0,10).map(o=>`
                                    <tr>
                                        <td class="p-4 text-sm font-medium text-slate-400">#${o.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm text-slate-500">${o.customerName||"Cliente"}</td>
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
        `;t.innerHTML=r},async setReadyForPickup(t){var e;try{const s=(e=event==null?void 0:event.target)==null?void 0:e.closest("button");if(s&&(s.disabled=!0),(await fetch(`${S}/shipping/ready-for-pickup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t})})).ok)this.showToast("✅ Cliente notificado - El pedido está listo para retiro"),await this.loadData(),this.refreshCurrentView();else throw new Error("Error al notificar")}catch(s){this.showToast("❌ error: "+s.message,"error")}},async markAsDelivered(t){var e;try{const s=(e=event==null?void 0:event.target)==null?void 0:e.closest("button");s&&(s.disabled=!0),await v.collection("sales").doc(t).update({status:"picked_up",fulfillment_status:"delivered",picked_up_at:firebase.firestore.FieldValue.serverTimestamp(),updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast("✅ Pedido retirado correctamente"),await this.loadData(),this.refreshCurrentView()}catch(s){this.showToast("❌ Error: "+s.message,"error")}},renderInvestments(t){const e=["Alejo","Facundo","Rafael"],s=this.state.investments||[],n=e.reduce((o,a)=>(o[a]=s.filter(l=>l.partner===a).reduce((l,d)=>l+(parseFloat(d.amount)||0),0),o),{}),i=Object.values(n).reduce((o,a)=>o+a,0),r=`
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
                    ${e.map(o=>`
                        <div class="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 hover:shadow-md transition-shadow">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-lg">
                                    ${o.charAt(0)}
                                </div>
                                <h3 class="font-bold text-brand-dark">${o}</h3>
                            </div>
                            <p class="text-2xl font-display font-bold text-brand-dark">${this.formatCurrency(n[o])}</p>
                            <p class="text-xs text-slate-400">${s.filter(a=>a.partner===o).length} inversiones</p>
                        </div>
                    `).join("")}
                    <div class="bg-brand-dark rounded-2xl shadow-lg p-5 text-white">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                <i class="ph-bold ph-coins"></i>
                            </div>
                            <h3 class="font-bold">Total Invertido</h3>
                        </div>
                        <p class="text-2xl font-display font-bold">${this.formatCurrency(i)}</p>
                        <p class="text-xs text-white/60">${s.length} inversiones totales</p>
                    </div>
                </div>

                <!-- Investments per Partner -->
                ${e.map(o=>{const a=s.filter(l=>l.partner===o).sort((l,d)=>new Date(d.date)-new Date(l.date));return`
                    <div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden mb-6">
                        <div class="p-5 border-b border-orange-50 bg-orange-50/30 flex justify-between items-center">
                            <h3 class="font-bold text-brand-dark flex items-center gap-2">
                                <span class="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold">${o.charAt(0)}</span>
                                ${o}
                            </h3>
                            <span class="text-lg font-display font-bold text-brand-orange">${this.formatCurrency(n[o])}</span>
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
                                    ${a.length===0?`
                                        <tr>
                                            <td colspan="4" class="p-8 text-center text-slate-400 italic">
                                                Sin inversiones registradas
                                            </td>
                                        </tr>
                                    `:a.map(l=>`
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
        `;t.innerHTML=r},openAddInvestmentModal(){const t=["Alejo","Facundo","Rafael"],e=new Date().toISOString().split("T")[0],s=`
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
                                ${t.map(n=>`<option value="${n}">${n}</option>`).join("")}
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
        `;document.body.insertAdjacentHTML("beforeend",s)},async saveInvestment(t){t.preventDefault();const e=t.target,s={partner:e.partner.value,amount:parseFloat(e.amount.value),description:e.description.value,date:e.date.value,created_at:firebase.firestore.FieldValue.serverTimestamp()};try{await v.collection("investments").add(s),document.getElementById("add-investment-modal").remove(),this.showToast("✅ Inversión registrada"),await this.loadInvestments(),this.refreshCurrentView()}catch(n){this.showToast("❌ Error: "+n.message,"error")}},async deleteInvestment(t){if(confirm("¿Eliminar esta inversión?"))try{await v.collection("investments").doc(t).delete(),this.showToast("🗑️ Inversión eliminada"),await this.loadInvestments(),this.refreshCurrentView()}catch(e){this.showToast("❌ Error: "+e.message,"error")}},async loadInvestments(){const t=await v.collection("investments").get();this.state.investments=t.docs.map(e=>({id:e.id,...e.data()}))},renderShipping(t){const e=this.state.sales.filter(a=>{var l;return a.channel==="online"&&((l=a.shipping_method)==null?void 0:l.id)!=="local_pickup"||a.fulfillment_status==="shipped"||a.shipment&&a.shipment.tracking_number}),s=this.state.sales.filter(a=>{var l;return a.channel==="online"&&((l=a.shipping_method)==null?void 0:l.id)==="local_pickup"&&["completed","paid","ready_for_pickup"].includes(a.status)}),n=this.state.sales.filter(a=>{var l;return a.channel==="online"&&((l=a.shipping_method)==null?void 0:l.id)==="local_pickup"&&a.status==="picked_up"}),i=e.filter(a=>a.status==="completed"||a.status==="paid"||a.status==="ready_for_pickup"),r=e.filter(a=>a.status==="shipped"),o=`
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 pt-6">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h2 class="font-display text-3xl font-bold text-brand-dark">Gestión de Envíos</h2>
                        <p class="text-slate-500 text-sm">Administra y notifica el estado de tus despachos online.</p>
                    </div>
                    <div class="flex gap-4">
                        <div class="bg-indigo-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center gap-4">
                            <i class="ph-fill ph-hand-coins text-2xl opacity-80"></i>
                            <div>
                                <p class="text-[10px] text-indigo-100 font-bold uppercase leading-none mb-1">Dinero acumulado para envíos</p>
                                <p class="text-2xl font-display font-bold">${this.formatCurrency(this.state.sales.reduce((a,l)=>a+parseFloat(l.shipping||l.shipping_cost||0),0))}</p>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-2 rounded-xl shadow-sm border border-orange-100 flex items-center gap-3">
                            <i class="ph-fill ph-clock text-brand-orange text-xl"></i>
                            <div>
                                <p class="text-[10px] text-slate-400 font-bold uppercase leading-none">Pendientes</p>
                                <p class="text-xl font-display font-bold text-brand-dark">${i.length+s.filter(a=>a.status!=="ready_for_pickup").length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pickup Orders Section -->
                ${s.length>0?`
                <div class="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden mb-8">
                    <div class="p-6 bg-blue-50/30">
                        <h3 class="font-bold text-brand-dark mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-storefront text-blue-500"></i> Pedidos para Retiro (Local Pickup)
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left">
                                <thead class="bg-blue-50/50 text-xs uppercase text-slate-500 font-bold">
                                    <tr>
                                        <th class="p-4">Orden</th>
                                        <th class="p-4">Cliente</th>
                                        <th class="p-4">Items</th>
                                        <th class="p-4">Estado</th>
                                        <th class="p-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-blue-50">
                                    ${s.sort((a,l)=>new Date(l.date)-new Date(a.date)).map(a=>{const l=this.getCustomerInfo(a),d=a.status==="ready_for_pickup";return`
                                        <tr class="hover:bg-blue-50/30 transition-colors">
                                            <td class="p-4 text-sm font-bold text-brand-dark">#${a.orderNumber||a.id.slice(0,8)}</td>
                                            <td class="p-4">
                                                <div class="text-sm font-bold text-brand-dark">${l.name}</div>
                                                <div class="text-xs text-slate-500">${l.email}</div>
                                            </td>
                                            <td class="p-4 text-xs text-slate-600">
                                                <div class="flex flex-col gap-2">
                                                    ${a.items?a.items.map(c=>`
                                                        <div class="leading-tight">
                                                            <span class="font-bold text-slate-700 block">${c.album}</span>
                                                            <span class="text-[10px] text-slate-500">${c.artist}</span>
                                                        </div>
                                                    `).join(""):"-"}
                                                </div>
                                                <div class="mt-2 font-bold text-brand-dark border-t border-blue-200 pt-1">
                                                    ${this.formatCurrency(a.total)}
                                                </div>
                                            </td>
                                            <td class="p-4">
                                                ${d?'<span class="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold border border-green-200">Listo para retirar</span>':'<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold border border-yellow-200">Pendiente de preparación</span>'}
                                            </td>
                                            <td class="p-4 text-center">
                                                ${d?`
                                                    <button onclick="event.stopPropagation(); app.markAsDelivered('${a.id}')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 flex items-center gap-2 mx-auto">
                                                        <i class="ph-bold ph-hand-tap"></i> Ya lo Retiró
                                                    </button>
                                                `:`
                                                    <button onclick="app.setReadyForPickup('${a.id}')" class="bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 mx-auto">
                                                        <i class="ph-bold ph-bell-ringing"></i> Notificar Cliente
                                                    </button>
                                                `}
                                            </td>
                                        </tr>
                                        `}).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                `:""}

                <!-- Retiros Recientes Section -->
                ${n.length>0?`
                <div class="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden mb-8 opacity-80">
                    <div class="p-6 bg-green-50/30 border-b border-green-100">
                        <h3 class="font-bold text-green-700 flex items-center gap-2">
                            <i class="ph-fill ph-check-circle"></i> Retiros Recientes
                        </h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <tbody class="divide-y divide-green-50">
                                ${n.slice(0,10).sort((a,l)=>{var d,c;return new Date((d=l.updated_at)!=null&&d.toDate?l.updated_at.toDate():l.updated_at)-new Date((c=a.updated_at)!=null&&c.toDate?a.updated_at.toDate():a.updated_at)}).map(a=>{var d;const l=this.getCustomerInfo(a);return`
                                    <tr class="hover:bg-green-50/30 transition-colors cursor-pointer" onclick="app.openSaleDetailModal('${a.id}')">
                                        <td class="p-4 text-sm font-medium text-slate-400">#${a.orderNumber||a.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm text-slate-500">${l.name}</td>
                                        <td class="p-4 text-xs text-slate-400">${this.formatDate((d=a.updated_at)!=null&&d.toDate?a.updated_at.toDate():a.updated_at||a.date)}</td>
                                        <td class="p-4 text-right">
                                            <span class="px-2 py-1 rounded bg-green-100 text-green-600 text-[10px] font-bold uppercase">Retirado</span>
                                        </td>
                                    </tr>
                                    `}).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
                `:""}

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
                                    ${i.length===0?`
                                        <tr>
                                            <td colspan="5" class="p-12 text-center">
                                                <i class="ph-duotone ph-package text-5xl text-slate-200 mb-3 block"></i>
                                                <p class="text-slate-400 italic">No hay envíos pendientes. ¡Todo al día! 🎉</p>
                                            </td>
                                        </tr>
                                    `:i.sort((a,l)=>{var d,c;return new Date((d=l.timestamp)!=null&&d.toDate?l.timestamp.toDate():l.timestamp)-new Date((c=a.timestamp)!=null&&c.toDate?a.timestamp.toDate():a.timestamp)}).map(a=>{const l=this.getCustomerInfo(a);return`
                                        <tr class="hover:bg-orange-50/30 transition-colors cursor-pointer" onclick="app.openSaleDetailModal('${a.id}')">
                                            <td class="p-4 text-sm font-bold text-brand-orange">#${a.id.slice(0,8)}</td>
                                            <td class="p-4">
                                                <div class="text-sm font-bold text-brand-dark">${l.name}</div>
                                            </td>
                                            <td class="p-4 text-sm text-slate-500">${l.email}</td>
                                            <td class="p-4">
                                                <div class="text-xs text-slate-600 truncate max-w-[200px]">${l.address}</div>
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
                                 ${r.slice(0,10).sort((a,l)=>{var d,c;return new Date((d=l.updated_at)!=null&&d.toDate?l.updated_at.toDate():l.updated_at)-new Date((c=a.updated_at)!=null&&c.toDate?a.updated_at.toDate():a.updated_at)}).map(a=>{var d;const l=this.getCustomerInfo(a);return`
                                    <tr class="hover:bg-slate-50/50 transition-colors cursor-pointer" onclick="app.openSaleDetailModal('${a.id}')">
                                        <td class="p-4 text-sm font-medium text-slate-400">#${a.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm text-slate-500">${l.name}</td>
                                        <td class="p-4 text-sm font-mono text-slate-400">${((d=a.shipment)==null?void 0:d.tracking_number)||"-"}</td>
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
        `;t.innerHTML=o},fetchDiscogsById(t=null){const e=t||document.getElementById("discogs-search-input").value.trim(),s=document.getElementById("discogs-results");if(!e||!/^\d+$/.test(e)){this.showToast("⚠️ Ingresa un ID numérico válido","error");return}const n=localStorage.getItem("discogs_token");if(!n){this.showToast("⚠️ Token no configurado","error");return}s&&(s.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Importando Release por ID...</p>',s.classList.remove("hidden")),fetch(`https://api.discogs.com/releases/${e}?token=${n}`).then(i=>{if(!i.ok)throw new Error(`Error ${i.status}`);return i.json()}).then(i=>{var o;const r={id:i.id,title:`${i.artists_sort||((o=i.artists[0])==null?void 0:o.name)} - ${i.title}`,year:i.year,thumb:i.thumb,cover_image:i.images?i.images[0].uri:null,label:i.labels?[i.labels[0].name]:[],format:i.formats?[i.formats[0].name]:[]};this.handleDiscogsSelection(r),s&&s.classList.add("hidden"),this.showToast("✅ Datos importados con éxito")}).catch(i=>{console.error(i),this.showToast("❌ Error al importar ID: "+i.message,"error"),s&&s.classList.add("hidden")})},openBulkImportModal(){const t=document.createElement("div");t.id="bulk-import-modal",t.className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4",t.innerHTML=`
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
        `,document.body.appendChild(t)},async handleBulkImportBatch(){const t=document.getElementById("bulk-csv-data").value.trim();if(!t){this.showToast("Por favor, pega el contenido del CSV.","error");return}const e=document.getElementById("start-bulk-import-btn");e.innerHTML,e.disabled=!0,e.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> Importando...';try{const s=await fetch(`${S}/discogs/bulk-import`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({csvData:t})}),n=await s.json();s.ok&&(this.showToast(`✅ ${n.summary}`),document.getElementById("bulk-import-modal").remove(),await this.loadData(),this.refreshCurrentView())}catch(s){console.error("Bulk import error:",s),this.showToast("❌ "+s.message,"error");const n=document.getElementById("start-bulk-import-btn");n&&(n.disabled=!1,n.innerHTML='<i class="ph-bold ph-rocket-launch"></i> Comenzar Importación')}},async refreshProductMetadata(t){const e=document.getElementById("refresh-metadata-btn");if(!e)return;const s=e.innerHTML;e.disabled=!0,e.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> ...';try{let n=t;const i=this.state.inventory.find(a=>a.sku===t||a.id===t);i&&i.id&&(n=i.id);const r=await fetch(`${S}/discogs/refresh-metadata/${n}`,{method:"POST",headers:{"Content-Type":"application/json"}}),o=await r.json();if(r.ok){this.showToast("✅ Metadata actualizada correctamente");const a=document.getElementById("modal-overlay");a&&a.remove(),await this.loadData(),this.refreshCurrentView(),i&&this.openProductModal(i.sku)}else throw new Error(o.error||"Error al actualizar metadata")}catch(n){console.error("Refresh metadata error:",n),this.showToast("❌ "+n.message,"error"),e.disabled=!1,e.innerHTML=s}}};window.app=A;document.addEventListener("DOMContentLoaded",()=>{A.init()});
