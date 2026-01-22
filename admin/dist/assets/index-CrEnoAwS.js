(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))o(l);new MutationObserver(l=>{for(const a of l)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function s(l){const a={};return l.integrity&&(a.integrity=l.integrity),l.referrerPolicy&&(a.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?a.credentials="include":l.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(l){if(l.ep)return;l.ep=!0;const a=s(l);fetch(l.href,a)}})();const f=firebase.firestore(),j=window.auth,L={async createSale(t){return f.runTransaction(async e=>{const s=[];for(const a of t.items){const r=f.collection("products").doc(a.recordId||a.productId),n=await e.get(r);if(!n.exists)throw new Error(`Producto ${a.recordId} no encontrado`);const p=n.data();if(p.stock<a.quantity)throw new Error(`Stock insuficiente para ${p.artist||"Sin Artista"} - ${p.album||"Sin Album"}. Disponible: ${p.stock}`);s.push({ref:r,data:p,quantity:a.quantity,price:p.price,cost:p.cost||0})}const o=s.reduce((a,r)=>a+r.price*r.quantity,0),l=f.collection("sales").doc();e.set(l,{...t,total:o,date:new Date().toISOString().split("T")[0],timestamp:firebase.firestore.FieldValue.serverTimestamp(),items:s.map(a=>({productId:a.ref.id,artist:a.data.artist,album:a.data.album,sku:a.data.sku,unitPrice:a.price,costAtSale:a.cost,qty:a.quantity}))});for(const a of s){e.update(a.ref,{stock:a.data.stock-a.quantity});const r=f.collection("inventory_logs").doc();e.set(r,{type:"SOLD",sku:a.data.sku||"Unknown",album:a.data.album||"Unknown",artist:a.data.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:"Venta registrada (Admin)"})}})}},M={state:{inventory:[],sales:[],expenses:[],consignors:[],cart:[],viewMode:"list",selectedItems:new Set,currentView:"dashboard",filterMonths:[new Date().getMonth()],filterYear:new Date().getFullYear(),inventorySearch:"",salesHistorySearch:"",expensesSearch:"",events:[],selectedDate:new Date,vatActive:localStorage.getItem("el-cuartito-settings")?JSON.parse(localStorage.getItem("el-cuartito-settings")).vatActive:!1},async init(){j.onAuthStateChanged(async t=>{if(t)try{document.getElementById("login-view").classList.add("hidden"),document.getElementById("main-app").classList.remove("hidden"),document.getElementById("mobile-nav").classList.remove("hidden"),await this.loadData(),this._pollInterval&&clearInterval(this._pollInterval),this._pollInterval=setInterval(()=>this.loadData(),3e4),this.renderDashboard(document.getElementById("app-content")),this.setupMobileMenu(),this.setupNavigation()}catch(e){console.error("Auth token error:",e),this.logout()}else{document.getElementById("login-view").classList.remove("hidden"),document.getElementById("main-app").classList.add("hidden"),document.getElementById("mobile-nav").classList.add("hidden");const e=document.getElementById("login-btn");e&&(e.disabled=!1,e.innerHTML="<span>Entrar</span>")}})},async handleLogin(t){t.preventDefault();const e=t.target.email.value,s=t.target.password.value,o=document.getElementById("login-error"),l=document.getElementById("login-btn");o.classList.add("hidden"),l.disabled=!0,l.innerHTML="<span>Cargando...</span>";try{await j.signInWithEmailAndPassword(e,s)}catch(a){console.error("Login error:",a),o.innerText="Error: "+a.message,o.classList.remove("hidden"),l.disabled=!1,l.innerHTML='<span>Ingresar</span><i class="ph-bold ph-arrow-right"></i>'}},async updateFulfillmentStatus(t,e,s){var o,l,a;try{const r=((o=t==null?void 0:t.target)==null?void 0:o.closest("button"))||((a=(l=window.event)==null?void 0:l.target)==null?void 0:a.closest("button"));if(r){r.disabled=!0;const n=r.innerHTML;r.innerHTML='<i class="ph ph-circle-notch animate-spin"></i>'}await f.collection("sales").doc(e).update({fulfillment_status:s}),await this.loadData(),document.getElementById("modal-overlay")&&(document.getElementById("modal-overlay").remove(),this.openOnlineSaleDetailModal(e)),this.showToast("Estado de envío actualizado")}catch(r){console.error("Fulfillment update error:",r),this.showToast("Error al actualizar estado: "+r.message,"error")}},async logout(){try{await j.signOut(),location.reload()}catch(t){console.error("Sign out error:",t),location.reload()}},setupListeners(){},async loadData(){try{const[t,e,s,o,l]=await Promise.all([f.collection("products").get(),f.collection("sales").get(),f.collection("expenses").orderBy("date","desc").get(),f.collection("events").orderBy("date","desc").get(),f.collection("consignors").get()]);this.state.inventory=t.docs.map(a=>{const r=a.data();return{id:a.id,...r,condition:r.condition||"VG",owner:r.owner||"El Cuartito",label:r.label||"Desconocido",storageLocation:r.storageLocation||"Tienda",cover_image:r.cover_image||r.coverImage||null}}),this.state.sales=e.docs.map(a=>{var p,i;const r=a.data(),n={id:a.id,...r,date:r.date||((p=r.timestamp)!=null&&p.toDate?r.timestamp.toDate().toISOString().split("T")[0]:(i=r.created_at)!=null&&i.toDate?r.created_at.toDate().toISOString().split("T")[0]:new Date().toISOString().split("T")[0])};return r.total_amount!==void 0&&r.total===void 0&&(n.total=r.total_amount),r.payment_method&&!r.paymentMethod&&(n.paymentMethod=r.payment_method),n.items&&Array.isArray(n.items)&&(n.items=n.items.map(c=>({...c,priceAtSale:c.priceAtSale!==void 0?c.priceAtSale:c.unitPrice||0,qty:c.qty!==void 0?c.qty:c.quantity||1,costAtSale:c.costAtSale!==void 0?c.costAtSale:c.cost||0}))),n}).sort((a,r)=>{const n=new Date(a.date);return new Date(r.date)-n}),this.state.expenses=s.docs.map(a=>({id:a.id,...a.data()})),this.state.events=o.docs.map(a=>({id:a.id,...a.data()})),this.state.consignors=l.docs.map(a=>{const r=a.data();return{id:a.id,...r,agreementSplit:r.split||r.agreementSplit||(r.percentage?Math.round(r.percentage*100):70)}}),this.refreshCurrentView()}catch(t){console.error("Failed to load data:",t),this.showToast("❌ Error de conexión: "+t.message,"error")}},refreshCurrentView(){const t=document.getElementById("app-content");if(t)switch(this.state.currentView){case"dashboard":this.renderDashboard(t);break;case"inventory":this.renderInventory(t);break;case"sales":this.renderSales(t);break;case"onlineSales":this.renderOnlineSales(t);break;case"discogsSales":this.renderDiscogsSales(t);break;case"expenses":this.renderExpenses(t);break;case"consignments":this.renderConsignments(t);break;case"vat":this.renderVAT(t);break;case"backup":this.renderBackup(t);break;case"settings":this.renderSettings(t);break;case"calendar":this.renderCalendar(t);break}},navigate(t){this.state.currentView=t,document.querySelectorAll(".nav-item, .nav-item-m").forEach(l=>{l.classList.remove("bg-orange-50","text-brand-orange"),l.classList.add("text-slate-500")});const e=document.getElementById(`nav-d-${t}`);e&&(e.classList.remove("text-slate-500"),e.classList.add("bg-orange-50","text-brand-orange"));const s=document.getElementById(`nav-m-${t}`);s&&(s.classList.remove("text-slate-400"),s.classList.add("text-brand-orange"));const o=document.getElementById("app-content");o.innerHTML="",this.refreshCurrentView()},renderCalendar(t){const e=this.state.selectedDate||new Date,s=e.getFullYear(),o=e.getMonth(),l=new Date(s,o,1),r=new Date(s,o+1,0).getDate(),n=l.getDay()===0?6:l.getDay()-1,p=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],i=b=>{const d=`${s}-${String(o+1).padStart(2,"0")}-${String(b).padStart(2,"0")}`,u=this.state.sales.some(v=>v.date===d),g=this.state.expenses.some(v=>v.date===d),h=this.state.events.some(v=>v.date===d);return{hasSales:u,hasExpenses:g,hasEvents:h}},c=`
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6">
                <div class="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
                    <!-- Calendar Grid -->
                    <div class="flex-1 bg-white rounded-2xl shadow-sm border border-orange-100 p-6 flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="font-display text-2xl font-bold text-brand-dark capitalize">
                                ${p[o]} <span class="text-brand-orange">${s}</span>
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
                            ${Array(n).fill('<div class="bg-slate-50/50 rounded-xl"></div>').join("")}
                            ${Array.from({length:r},(b,d)=>{const u=d+1,g=`${s}-${String(o+1).padStart(2,"0")}-${String(u).padStart(2,"0")}`,h=e.getDate()===u,v=i(u),y=new Date().toDateString()===new Date(s,o,u).toDateString();return`
                                    <button onclick="app.selectCalendarDate('${g}')" 
                                        class="relative rounded-xl p-2 flex flex-col items-center justify-start gap-1 transition-all border-2
                                        ${h?"border-brand-orange bg-orange-50":"border-transparent hover:bg-slate-50"}
                                        ${y?"bg-blue-50":""}">
                                        <span class="text-sm font-bold ${h?"text-brand-orange":"text-slate-700"} ${y?"text-blue-600":""}">${u}</span>
                                        <div class="flex gap-1 mt-1">
                                            ${v.hasSales?'<div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>':""}
                                            ${v.hasExpenses?'<div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>':""}
                                            ${v.hasEvents?'<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>':""}
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
        `;t.innerHTML=c},renderCalendarDaySummary(t){const e=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,s=t.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}),o=this.state.sales.filter(p=>p.date===e),l=this.state.expenses.filter(p=>p.date===e),a=this.state.events.filter(p=>p.date===e),r=o.reduce((p,i)=>p+i.total,0),n=l.reduce((p,i)=>p+i.amount,0);return`
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
                        <p class="text-lg font-bold text-brand-dark">${this.formatCurrency(n)}</p>
                    </div>
                </div>

                <!-- Events -->
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Eventos / Notas</h4>
                    ${a.length>0?`
                        <div class="space-y-2">
                            ${a.map(p=>`
                                <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 group relative">
                                    <p class="text-sm font-medium text-brand-dark">${p.title}</p>
                                    ${p.description?`<p class="text-xs text-slate-500 mt-1">${p.description}</p>`:""}
                                    <button onclick="app.deleteEvent('${p.id}')" class="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600">
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
                            ${o.map(p=>`
                                <div class="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg text-xs">
                                    <div class="truncate flex-1 pr-2">
                                        <span class="font-bold text-slate-700 block truncate">${p.album||"Venta rápida"}</span>
                                        <span class="text-slate-400 text-[10px]">${p.sku||"-"}</span>
                                    </div>
                                    <span class="font-bold text-brand-dark">${this.formatCurrency(p.total)}</span>
                                </div>
                            `).join("")}
                        </div>
                    `:'<p class="text-xs text-slate-400 italic">Sin ventas</p>'}
                </div>

                <!-- Expenses List -->
                <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle Gastos (${l.length})</h4>
                    ${l.length>0?`
                        <div class="space-y-2">
                            ${l.map(p=>`
                                <div class="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg text-xs">
                                    <div class="truncate flex-1 pr-2">
                                        <span class="font-bold text-slate-700 block truncate">${p.description}</span>
                                        <span class="text-slate-400 text-[10px]">${p.category}</span>
                                    </div>
                                    <span class="font-bold text-brand-dark">${this.formatCurrency(p.amount)}</span>
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
        `;document.body.insertAdjacentHTML("beforeend",e)},handleAddEvent(t){t.preventDefault();const e=new FormData(t.target),s={date:e.get("date"),title:e.get("title"),description:e.get("description"),createdAt:new Date().toISOString()};f.collection("events").add(s).then(()=>{this.showToast("✅ Evento agregado"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>console.error(o))},deleteEvent(t){confirm("¿Eliminar este evento?")&&f.collection("events").doc(t).delete().then(()=>{this.showToast("✅ Evento eliminado"),this.loadData()}).catch(e=>console.error(e))},renderBackup(t){const e=`
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
        `;t.innerHTML=s},saveSettings(t){t.preventDefault();const s=new FormData(t.target).get("discogs_token").trim();s?(localStorage.setItem("discogs_token",s),localStorage.setItem("discogs_token_warned","true"),this.showToast("Configuración guardada correctamente")):(localStorage.removeItem("discogs_token"),this.showToast("Token eliminado"))},exportData(){const t={inventory:this.state.inventory,sales:this.state.sales,expenses:this.state.expenses,consignors:this.state.consignors,customGenres:this.state.customGenres,customCategories:this.state.customCategories,timestamp:new Date().toISOString()},e="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(t)),s=document.createElement("a");s.setAttribute("href",e),s.setAttribute("download","el_cuartito_backup_"+new Date().toISOString().slice(0,10)+".json"),document.body.appendChild(s),s.click(),s.remove()},importData(t){const e=t.files[0];if(!e)return;const s=new FileReader;s.onload=o=>{try{const l=JSON.parse(o.target.result);if(!confirm("¿Estás seguro de restaurar este backup? Se sobrescribirán los datos actuales."))return;const a=f.batch();alert("La importación completa sobrescribiendo datos en la nube es compleja. Por seguridad, esta función solo agrega/actualiza items de inventario por ahora."),l.inventory&&l.inventory.forEach(r=>{const n=f.collection("products").doc(r.sku);a.set(n,r)}),a.commit().then(()=>{this.showToast("Datos importados (Inventario)")})}catch(l){alert("Error al leer el archivo de respaldo"),console.error(l)}},s.readAsText(e)},resetApplication(){if(!confirm(`⚠️ ¡ADVERTENCIA! ⚠️

Esto borrará PERMANENTEMENTE todo el inventario, ventas, gastos y socios de la base de datos.

¿Estás absolutamente seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Iniciando borrado completo...");const e=s=>f.collection(s).get().then(o=>{const l=f.batch();return o.docs.forEach(a=>{l.delete(a.ref)}),l.commit()});Promise.all([e("inventory"),e("sales"),e("expenses"),e("consignors"),f.collection("settings").doc("general").delete()]).then(()=>{this.showToast("♻️ Aplicación restablecida de fábrica"),setTimeout(()=>location.reload(),1500)}).catch(s=>{console.error(s),alert("Error al borrar datos: "+s.message)})},resetSales(){if(!confirm(`⚠️ ADVERTENCIA ⚠️

Esto borrará PERMANENTEMENTE todas las ventas (manuales y online) de la base de datos.

El inventario, gastos y socios NO serán afectados.

¿Estás seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Borrando todas las ventas..."),f.collection("sales").get().then(e=>{const s=f.batch();return e.docs.forEach(o=>{s.delete(o.ref)}),s.commit()}).then(()=>{this.showToast("✅ Todas las ventas han sido eliminadas"),setTimeout(()=>location.reload(),1500)}).catch(e=>{console.error(e),alert("Error al borrar ventas: "+e.message)})},async findProductBySku(t){try{const e=await f.collection("products").where("sku","==",t).get();if(e.empty)return null;const s=e.docs[0];return{id:s.id,ref:s.ref,data:s.data()}}catch(e){return console.error("Error finding product by SKU:",e),null}},logInventoryMovement(t,e){let s="";t==="EDIT"?s="Producto actualizado":t==="ADD"?s="Ingreso de inventario":t==="DELETE"?s="Egreso manual":t==="SOLD"&&(s="Venta registrada"),f.collection("inventory_logs").add({type:t,sku:e.sku||"Unknown",album:e.album||"Unknown",artist:e.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:s}).catch(o=>console.error("Error logging movement:",o))},openInventoryLogModal(){f.collection("inventory_logs").orderBy("timestamp","desc").limit(50).get().then(t=>{const s=`
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
                                    ${t.docs.map(o=>({id:o.id,...o.data()})).map(o=>{let l="bg-slate-100 text-slate-600";o.type==="ADD"&&(l="bg-green-100 text-green-700"),o.type==="DELETE"&&(l="bg-red-100 text-red-700"),o.type==="EDIT"&&(l="bg-blue-100 text-blue-700"),o.type==="SOLD"&&(l="bg-purple-100 text-purple-700");const a=o.timestamp?o.timestamp.toDate?o.timestamp.toDate():new Date(o.timestamp):new Date;return`
                                            <tr>
                                                <td class="p-4 text-slate-500 whitespace-nowrap">
                                                    ${a.toLocaleDateString()} <span class="text-xs text-slate-400 opacity-75">${a.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                                                </td>
                                                <td class="p-4">
                                                    <span class="px-2 py-1 rounded-md text-[10px] font-bold uppercase ${l}">${o.type}</span>
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
        `;try{const o=await(await fetch("https://el-cuartito-completo.onrender.com/discogs/sync",{method:"POST",headers:{"Content-Type":"application/json"}})).json();if(o.success)this.showToast(`✅ Sincronizado: ${o.synced} productos (${o.created} nuevos, ${o.updated} actualizados)`),await this.loadData(),this.refreshCurrentView();else throw new Error(o.error||"Error desconocido")}catch(s){console.error("Sync error:",s),this.showToast(`❌ Error al sincronizar: ${s.message}`)}finally{t.disabled=!1,t.innerHTML=e}},formatCurrency(t){return new Intl.NumberFormat("da-DK",{style:"currency",currency:"DKK"}).format(t)},formatDate(t){return t?new Date(t).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}):"-"},getMonthName(t){return["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][t]},generateId(){return Date.now().toString(36)+Math.random().toString(36).substr(2)},showToast(t){const e=document.getElementById("toast");document.getElementById("toast-message").innerText=t,e.classList.remove("opacity-0","-translate-y-20","md:translate-y-20"),setTimeout(()=>{e.classList.add("opacity-0","-translate-y-20","md:translate-y-20")},3e3)},setupNavigation(){},setupMobileMenu(){},toggleMobileMenu(){const t=document.getElementById("mobile-menu"),e=document.getElementById("mobile-menu-overlay");!t||!e||(t.classList.contains("translate-y-full")?(t.classList.remove("translate-y-full"),e.classList.remove("hidden")):(t.classList.add("translate-y-full"),e.classList.add("hidden")))},getVatComponent(t){return this.state.vatActive?(parseFloat(t)||0)*.2:0},getNetPrice(t){return this.state.vatActive?t*.8:t},getRolling12MonthSales(){const t=new Date;return t.setFullYear(t.getFullYear()-1),this.state.sales.filter(e=>new Date(e.date)>=t).reduce((e,s)=>e+this.getNetPrice(s.total),0)},toggleMonthFilter(t){const e=this.state.filterMonths.indexOf(t);e===-1?this.state.filterMonths.push(t):this.state.filterMonths.length>1&&this.state.filterMonths.splice(e,1),this.state.filterMonths.sort((s,o)=>s-o),this.refreshCurrentView()},renderDashboard(t){const e=this.state.filterMonths,s=this.state.filterYear,o=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],l=this.state.sales.filter(m=>{const x=new Date(m.date);return x.getFullYear()===s&&e.includes(x.getMonth())}),a=[...l].sort((m,x)=>new Date(x.date)-new Date(m.date));let r=0,n=0,p=0,i=0;l.forEach(m=>{const x=Number(m.total_amount)||Number(m.total)||0,$=Number(m.shipping_cost)||0;r+=x,p+=$;const k=m.items||[];k.forEach(w=>{const S=Number(w.priceAtSale||w.unitPrice||w.price)||0,I=Number(w.quantity)||1;let E=Number(w.costAtSale||w.cost)||0;const C=(w.owner||"").toLowerCase(),T=this.state.products?this.state.products.find(D=>D.id===w.productId||D.id===w.recordId):null;if(C==="el cuartito")E=0;else if(C&&C!=="el cuartito"){if(E===0||isNaN(E)){const D=this.state.consignors?this.state.consignors.find(B=>(B.name||"").toLowerCase()===C):null,A=D&&(D.agreementSplit||D.split)||70;E=S*(Number(A)||70)/100}i+=E*I}else(E===0||isNaN(E))&&(E=T&&Number(T.cost)||0);n+=(S-E)*I}),k.length===0&&x>0&&(n+=x)});const c=this.state.vatActive?r-r/1.25:0;this.state.inventory.reduce((m,x)=>m+x.price*x.stock,0);const b=this.state.inventory.reduce((m,x)=>m+x.stock,0);let d=0,u=0,g=0;this.state.inventory.forEach(m=>{const x=(m.owner||"").toLowerCase(),$=parseInt(m.stock)||0,k=parseFloat(m.price)||0,w=parseFloat(m.cost)||0;if(x==="el cuartito"||x==="")d+=w*$,u+=(k-w)*$;else{let S=w;if(S===0){const E=this.state.consignors?this.state.consignors.find(T=>(T.name||"").toLowerCase()===x):null,C=E&&(E.agreementSplit||E.split)||70;S=k*(Number(C)||70)/100}const I=k-S;g+=I*$}});const h={};this.state.inventory.forEach(m=>{const x=m.owner||"El Cuartito";h[x]||(h[x]={count:0,value:0}),h[x].count+=parseInt(m.stock)||0,h[x].value+=(parseFloat(m.price)||0)*(parseInt(m.stock)||0)});const y=`
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
                            ${o.map((m,x)=>`
                                <button onclick="app.toggleMonthFilter(${x})" 
                                    class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm ${e.includes(x)?"bg-brand-orange text-white shadow-brand-orange/30":"bg-white border border-slate-100 text-slate-400 hover:text-brand-dark hover:bg-slate-50"}">
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
                                <p class="text-xl font-bold text-green-600">${this.formatCurrency(n)}</p>
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
                                <span class="text-sm font-bold text-green-700">El Cuartito</span>
                                <span class="font-bold text-green-700">${this.formatCurrency(n)}</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <span class="text-sm font-bold text-blue-700">Socios (Pagos)</span>
                                <span class="font-bold text-blue-700">${this.formatCurrency(i)}</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                                <span class="text-sm font-bold text-orange-700">Costos de Envío</span>
                                <span class="font-bold text-orange-700">${this.formatCurrency(p)}</span>
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
                                    <p class="text-lg font-bold text-slate-700">${this.formatCurrency(d)}</p>
                                </div>
                                <div class="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                                    <p class="text-[10px] text-green-600 font-bold uppercase">Ganancia Latente (Propia)</p>
                                    <p class="text-lg font-bold text-green-700">${this.formatCurrency(u)}</p>
                                </div>
                                <div class="p-4 bg-purple-50 rounded-xl border border-purple-100 text-center col-span-2">
                                    <p class="text-[10px] text-purple-600 font-bold uppercase">Ganancia Latente (Socios)</p>
                                    <p class="text-lg font-bold text-purple-700">${this.formatCurrency(g)}</p>
                                </div>
                            </div>

                            <div class="space-y-1 mb-4 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Por Dueño</h4>
                                ${Object.entries(h).sort((m,x)=>x[1].count-m[1].count).map(([m,x])=>`
                                <div class="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <span class="font-bold text-slate-700 truncate max-w-[120px]" title="${m}">${m}</span>
                                    <div class="text-right">
                                        <div class="font-bold text-brand-dark">${x.count} discos</div>
                                        <div class="text-[10px] text-slate-500">${this.formatCurrency(x.value)}</div>
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
    `;t.innerHTML=y,this.renderDashboardCharts(l)},renderInventoryCart(){const t=document.getElementById("inventory-cart-container");if(!t)return;if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden");const e=this.state.cart.map((s,o)=>`
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
    `},renderInventoryContent(t,e,s,o,l){t.innerHTML=`
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
                                ${l.map(a=>`
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
`},renderInventory(t){const e=[...new Set(this.state.inventory.map(i=>i.genre).filter(Boolean))].sort(),s=[...new Set(this.state.inventory.map(i=>i.owner).filter(Boolean))].sort(),o=[...new Set(this.state.inventory.map(i=>i.label).filter(Boolean))].sort(),l=[...new Set(this.state.inventory.map(i=>i.storageLocation).filter(Boolean))].sort(),a=this.state.inventory.filter(i=>{const c=this.state.inventorySearch.toLowerCase(),b=i.artist.toLowerCase().includes(c)||i.album.toLowerCase().includes(c)||i.sku.toLowerCase().includes(c),d=this.state.filterGenre||"all",u=this.state.filterOwner||"all",g=this.state.filterLabel||"all",h=this.state.filterStorage||"all",v=this.state.filterDiscogs||"all",y=d==="all"||i.genre===d,m=u==="all"||i.owner===u,x=g==="all"||i.label===g,$=h==="all"||i.storageLocation===h,k=!!i.discogs_listing_id;return b&&y&&m&&x&&$&&(v==="all"||v==="yes"&&k||v==="no"&&!k)}),r=this.state.sortBy||"dateDesc";a.sort((i,c)=>{if(r==="priceDesc")return(c.price||0)-(i.price||0);if(r==="priceAsc")return(i.price||0)-(c.price||0);if(r==="stockDesc")return(c.stock||0)-(i.stock||0);const b=i.created_at?i.created_at.seconds?i.created_at.seconds*1e3:new Date(i.created_at).getTime():0,d=c.created_at?c.created_at.seconds?c.created_at.seconds*1e3:new Date(c.created_at).getTime():0;return r==="dateDesc"?d-b:r==="dateAsc"?b-d:0}),document.getElementById("inventory-layout-root")||(t.innerHTML=`
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
                ${this.state.inventory.map(i=>"<!-- Mobile Card Placeholder - Handled by renderInventoryContent actually? No, duplicate logic. Let's merge mobile into renderInventoryContent -->").join("")}
                <!-- Actually, let's let renderInventoryContent handle ALL content including mobile -->
            </div>
            <div id="inventory-content-container"></div>
        </div>
    </div>
                </div>
    `),this.renderInventoryCart();const n=document.getElementById("inventory-filters-container");n&&(n.innerHTML=`
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
                                ${e.map(i=>`<option value="${i}" ${this.state.filterGenre===i?"selected":""}>${i}</option>`).join("")}
                            </select>
                        </div>
                         <div>
                            <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">Label Disquería</label>
                            <select onchange="app.state.filterStorage = this.value; app.refreshCurrentView()" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-brand-orange">
                                <option value="all">Todas</option>
                                ${l.map(i=>`<option value="${i}" ${this.state.filterStorage===i?"selected":""}>${i}</option>`).join("")}
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
    `);const p=document.getElementById("inventory-content-container");p&&this.renderInventoryContent(p,a,e,s,l)},getStatusBadge(t){return`<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${{NM:"bg-green-100 text-green-700 border-green-200","VG+":"bg-blue-100 text-blue-700 border-blue-200",VG:"bg-yellow-100 text-yellow-700 border-yellow-200",G:"bg-orange-100 text-orange-700 border-orange-200",B:"bg-red-100 text-red-700 border-red-200",S:"bg-purple-100 text-purple-700 border-purple-200"}[t]||"bg-slate-100 text-slate-600 border-slate-200"}"> ${t}</span> `},renderCharts(t,e){const s=this.state.filterMonths;this.state.filterYear;const o=[],l=[],a=[];s.forEach(n=>{o.push(this.getMonthName(n).substring(0,3));const p=t.filter(c=>new Date(c.date).getMonth()===n).reduce((c,b)=>c+b.total,0),i=e.filter(c=>new Date(c.date).getMonth()===n).reduce((c,b)=>c+b.amount,0);l.push(p),a.push(i)});const r={};t.forEach(n=>{r[n.genre]=(r[n.genre]||0)+n.quantity}),new Chart(document.getElementById("financeChart"),{type:"bar",data:{labels:o,datasets:[{label:"Ventas",data:l,backgroundColor:"#F05A28",borderRadius:6},{label:"Gastos",data:a,backgroundColor:"#94a3b8",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom"}},scales:{y:{grid:{color:"#f1f5f9"},beginAtZero:!0},x:{grid:{display:!1}}}}})},renderDashboardCharts(t=[]){var i,c,b;const e=t.length>0?t:this.state.sales,s=(d,u)=>({type:"doughnut",data:{labels:Object.keys(d),datasets:[{data:Object.values(d),backgroundColor:["#F05A28","#FDE047","#8b5cf6","#10b981","#f43f5e","#64748b"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{boxWidth:10,font:{size:10}}}}}}),o={};e.forEach(d=>{const u=d.genre||"Desconocido";o[u]=(o[u]||0)+d.quantity}),this.genreChartInstance&&this.genreChartInstance.destroy();const l=(i=document.getElementById("genreChart"))==null?void 0:i.getContext("2d");l&&(this.genreChartInstance=new Chart(l,s(o)));const a={};e.forEach(d=>{const u=d.paymentMethod||"Desconocido";a[u]=(a[u]||0)+d.quantity}),this.paymentChartInstance&&this.paymentChartInstance.destroy();const r=(c=document.getElementById("paymentChart"))==null?void 0:c.getContext("2d");r&&(this.paymentChartInstance=new Chart(r,s(a)));const n={};e.forEach(d=>{const u=d.channel||"Local";n[u]=(n[u]||0)+d.quantity}),this.channelChartInstance&&this.channelChartInstance.destroy();const p=(b=document.getElementById("channelChart"))==null?void 0:b.getContext("2d");p&&(this.channelChartInstance=new Chart(p,s(n)))},updateFilter(t,e){t==="month"&&(this.state.filterMonth=parseInt(e)),t==="year"&&(this.state.filterYear=parseInt(e)),this.renderDashboard(document.getElementById("app-content"))},renderSales(t){var b;const e=this.state.filterYear,s=this.state.filterMonths,o=((b=document.getElementById("sales-payment-filter"))==null?void 0:b.value)||"all",l=this.state.salesHistorySearch.toLowerCase(),a=this.state.sales.filter(d=>{const u=new Date(d.date),g=u.getFullYear()===e&&s.includes(u.getMonth()),h=o==="all"||d.paymentMethod===o,v=!l||d.items&&d.items.some(y=>{const m=y.record||{};return(m.album||"").toLowerCase().includes(l)||(m.artist||"").toLowerCase().includes(l)||(m.sku||"").toLowerCase().includes(l)});return g&&h&&v}),r=a.reduce((d,u)=>d+(parseFloat(u.total)||0),0),n=a.reduce((d,u)=>{const g=parseFloat(u.total)||0;let h=0;return u.items&&Array.isArray(u.items)?h=u.items.reduce((v,y)=>{var $;const m=parseFloat(y.costAtSale||(($=y.record)==null?void 0:$.cost)||0),x=parseInt(y.quantity||y.qty)||1;return v+m*x},0):h=(parseFloat(u.cost)||0)*(parseInt(u.quantity)||1),d+(g-h)},0),p=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],i=`
    <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 pt-6">
                <!--Header & Filters-->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 class="font-display text-2xl font-bold text-brand-dark">Gestión de Ventas</h2>
                        <p class="text-xs text-slate-500">Periodo: <span class="font-bold text-brand-orange">${s.map(d=>this.getMonthName(d)).join(", ")} ${e}</span></p>
                    </div>
                    
                    <!-- Date Selectors -->
                    <div class="flex flex-col gap-2 mt-4 md:mt-0">
                         <div class="flex gap-2 bg-white p-1 rounded-lg border border-orange-100 shadow-sm">
                            <select id="sales-year" onchange="app.updateFilter('year', this.value)" class="bg-transparent text-sm font-medium text-slate-600 p-2 outline-none">
                                <option value="2026" ${this.state.filterYear===2026?"selected":""}>2026</option>
                            </select>
                        </div>
                        <div class="flex flex-wrap gap-1 max-w-md justify-end">
                            ${p.map((d,u)=>`
                                <button onclick="app.toggleMonthFilter(${u})" 
                                    class="px-2 py-1 rounded text-[10px] font-bold transition-all ${s.includes(u)?"bg-brand-orange text-white":"bg-white border border-orange-100 text-slate-400 hover:text-brand-orange"}">
                                    ${d}
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
                            <h3 class="text-3xl font-display font-bold text-brand-dark">${this.formatCurrency(n)}</h3>
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
                                ${this.state.cart.map((d,u)=>`
                                    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <div class="truncate pr-2">
                                            <p class="font-bold text-xs text-brand-dark truncate">${d.album}</p>
                                            <p class="text-[10px] text-slate-500 truncate">${d.artist}</p>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold text-xs text-brand-orange">${this.formatCurrency(d.price)}</span>
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
                                <span class="font-display font-bold text-brand-dark text-xl">${this.formatCurrency(this.state.cart.reduce((d,u)=>d+u.price,0))}</span>
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
                            ${["El Cuartito",...this.state.consignors.map(d=>d.name)].map(d=>{const u=this.state.inventory.filter(m=>m.owner===d).reduce((m,x)=>m+x.stock,0),g=a.reduce((m,x)=>{if(x.owner===d){const $=x.items&&Array.isArray(x.items)?x.items.reduce((k,w)=>k+(parseInt(w.quantity||w.qty)||1),0):parseInt(x.quantity)||1;return m+$}return x.items&&Array.isArray(x.items)?m+x.items.filter($=>$.owner===d).length:m},0),h=u+g,v=h>0?u/h*100:0,y=h>0?g/h*100:0;return`
                                    <div>
                                        <div class="flex justify-between items-end mb-1">
                                            <span class="font-bold text-sm text-brand-dark">${d}</span>
                                            <span class="text-xs text-slate-500">Stock: ${u} | Vendidos: ${g}</span>
                                        </div>
                                        <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                            <div style="width: ${v}%" class="h-full bg-blue-500"></div>
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
                                            <th class="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-orange-50">
                                        ${a.sort((d,u)=>{const g=d.date&&d.date.toDate?d.date.toDate():new Date(d.date);return(u.date&&u.date.toDate?u.date.toDate():new Date(u.date))-g}).map(d=>{var u,g;return`
                                            <tr class="hover:bg-orange-50/30 transition-colors cursor-pointer" onclick="app.openSaleDetailModal('${d.id}')">
                                                <td class="p-4 text-xs text-slate-500 whitespace-nowrap">
                                                    ${this.formatDate(d.date)}
                                                    <span class="block text-[10px] text-slate-400">${new Date(d.date).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                                                </td>
                                                <td class="p-4">
                                                    <div class="flex flex-col">
                                                        ${d.items&&d.items.length>0?d.items.length===1?`<span class="font-bold text-brand-dark text-sm truncate max-w-[180px]">${d.items[0].album||((u=d.items[0].record)==null?void 0:u.album)||"Desconocido"}</span>
                     <span class="text-[10px] text-slate-400 truncate max-w-[180px]">${d.items[0].artist||((g=d.items[0].record)==null?void 0:g.artist)||"-"}</span>`:`<span class="font-bold text-brand-dark text-sm truncate max-w-[180px]">${d.items.length} items</span>
                     <span class="text-[10px] text-slate-400 truncate max-w-[180px]">${d.items.map(h=>{var v;return h.album||((v=h.record)==null?void 0:v.album)}).filter(Boolean).join(", ")}</span>`:`<span class="font-bold text-brand-dark text-sm truncate max-w-[180px]">${d.album||"Venta Manual"}</span>
                 <span class="text-[10px] text-slate-400 truncate max-w-[180px]">${d.artist||"-"}</span>`}
                                                    </div>
                                                </td>
                                                <td class="p-4 text-center text-sm text-slate-600">${d.quantity||(d.items?d.items.reduce((h,v)=>h+(parseInt(v.quantity||v.qty)||1),0):1)}</td>
                                                <td class="p-4 text-right font-bold text-brand-dark">${this.formatCurrency(d.total)}</td>
                                                <td class="p-4 text-center">
                                                    <span class="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wide">${d.paymentMethod}</span>
                                                </td>
                                                <td class="p-4 text-center" onclick="event.stopPropagation()">
                                                    <button onclick="app.deleteSale('${d.id}')" class="text-slate-300 hover:text-red-500 transition-colors" title="Eliminar Venta">
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
    `;t.innerHTML=i;const c=t.querySelector('input[placeholder="Buscar en historial..."]');c&&(c.focus(),c.setSelectionRange(c.value.length,c.value.length))},searchSku(t){const e=document.getElementById("sku-results");if(t.length<2){e.classList.add("hidden");return}const s=this.state.inventory.filter(o=>o.artist.toLowerCase().includes(t.toLowerCase())||o.album.toLowerCase().includes(t.toLowerCase())||o.sku.toLowerCase().includes(t.toLowerCase()));s.length>0?(e.innerHTML=s.map(o=>`
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
    `).join(""),e.classList.remove("hidden")):e.classList.add("hidden")},selectSku(t){const e=this.state.inventory.find(i=>i.sku===t);if(!e)return;const s=document.getElementById("input-price"),o=document.getElementById("input-qty");document.getElementById("form-total"),s&&(s.value=e.price),o&&(o.value=1),document.getElementById("input-sku").value=e.sku,document.getElementById("input-cost").value=e.cost,document.getElementById("input-genre").value=e.genre,document.getElementById("input-artist").value=e.artist,document.getElementById("input-album").value=e.album,document.getElementById("input-owner").value=e.owner,setTimeout(()=>{const i=document.getElementById("sku-results");i&&i.classList.add("hidden")},200);const l=document.getElementById("sku-search");l&&(l.value=`${e.artist} - ${e.album} `),this.updateTotal();const a=document.getElementById("btn-submit-sale"),r=document.getElementById("btn-submit-sale-modal"),n=e.stock<=0,p=i=>{i&&(n?(i.disabled=!0,i.classList.add("opacity-50","cursor-not-allowed"),i.innerHTML='<i class="ph-bold ph-warning"></i> Sin Stock'):(i.disabled=!1,i.classList.remove("opacity-50","cursor-not-allowed"),i.innerHTML='<i class="ph-bold ph-check"></i> Registrar Venta'))};p(a),p(r),n&&this.showToast("⚠️ Producto sin stock")},updateTotal(){const t=parseFloat(document.getElementById("input-price").value)||0,e=parseInt(document.getElementById("input-qty").value)||1,s=t*e;document.getElementById("form-total").innerText=this.formatCurrency(s)},openAddVinylModal(t=null){let e={sku:"",artist:"",album:"",genre:"Minimal",status:"NM",price:"",cost:"",stock:1,owner:"El Cuartito"},s=!1;if(t){const r=this.state.inventory.find(n=>n.sku===t);r&&(e=r,s=!0)}if(!s){const r=this.state.inventory.map(p=>{const i=p.sku.match(/^SKU\s*-\s*(\d+)/);return i?parseInt(i[1]):0}),n=Math.max(0,...r);e.sku=`SKU-${String(n+1).padStart(3,"0")}`}const o=["Minimal","Techno","House","Deep House","Electro"],l=[...new Set([...o,...this.state.customGenres||[]])],a=`
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
                        <p class="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                            <i class="ph-bold ph-music-notes"></i> Tracklist (Referencia)
                        </p>
                        <div id="tracklist-preview-content" class="space-y-1 text-xs text-slate-600"></div>
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
                                                        ${l.map(r=>`<option ${e.genre===r?"selected":""}>${r}</option>`).join("")}
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
                                                        ${l.map(r=>`<option ${e.genre2===r?"selected":""}>${r}</option>`).join("")}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género Terciario</label>
                                                    <select name="genre3" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${l.map(r=>`<option ${e.genre3===r?"selected":""}>${r}</option>`).join("")}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género 4</label>
                                                    <select name="genre4" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${l.map(r=>`<option ${e.genre4===r?"selected":""}>${r}</option>`).join("")}
                                                    </select>
                                                </div>

                                                <div class="col-span-2 md:col-span-1">
                                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Género 5</label>
                                                    <select name="genre5" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-orange outline-none text-sm appearance-none cursor-pointer">
                                                        <option value="">(Opcional)</option>
                                                        ${l.map(r=>`<option ${e.genre5===r?"selected":""}>${r}</option>`).join("")}
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
                `;document.body.insertAdjacentHTML("beforeend",a)},openProductModal(t){console.log("Attempting to open modal for:",t);try{const e=this.state.inventory.find(l=>l.sku===t);if(!e){console.error("Item not found:",t),alert("Error: No se encontró el disco. Intenta recargar.");return}const s=document.getElementById("modal-overlay");s&&s.remove();const o=`
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
                `;document.body.insertAdjacentHTML("beforeend",o)}catch(e){console.error("Error opening product modal:",e),alert("Hubo un error al abrir la ficha. Por favor recarga la página.")}},handleCostChange(){const t=parseFloat(document.getElementById("modal-cost").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),o=document.getElementById("modal-margin"),l=document.getElementById("modal-price");if(s){const a=parseFloat(s)/100;if(a>0){const r=t/a;l.value=Math.ceil(r)}}else{const r=1-(parseFloat(o.value)||0)/100;if(r>0){const n=t/r;l.value=Math.ceil(n)}}},handlePriceChange(){const t=parseFloat(document.getElementById("modal-price").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),o=document.getElementById("modal-margin"),l=document.getElementById("modal-cost"),a=document.getElementById("cost-helper");if(s){const r=parseFloat(s)/100,n=t*r;l.value=Math.round(n),o.value=100-parseFloat(s),o.readOnly=!0,o.classList.add("opacity-50"),a&&(a.innerText=`Consignación: ${s}% Socio`)}else{const r=parseFloat(l.value)||0;if(r>0&&t>0){const n=(t-r)/r*100;o.value=Math.round(n)}o.readOnly=!1,o.classList.remove("opacity-50"),a&&(a.innerText="Modo Propio: Margen variable")}},handleMarginChange(){const t=parseFloat(document.getElementById("modal-margin").value)||0,e=parseFloat(document.getElementById("modal-cost").value)||0,s=document.getElementById("modal-price");if(e>0){const o=e*(1+t/100);s.value=Math.ceil(o)}},checkCustomInput(t,e){const s=document.getElementById(e);t.value==="other"?(s.classList.remove("hidden"),s.querySelector("input").required=!0,s.querySelector("input").focus()):(s.classList.add("hidden"),s.querySelector("input").required=!1)},toggleCollectionNote(t){const e=document.getElementById("collection-note-container");e&&t&&t!==""?e.classList.remove("hidden"):e&&e.classList.add("hidden")},handleCollectionChange(t){var o;const e=document.getElementById("custom-collection-container"),s=document.getElementById("collection-note-container");t==="other"?(e==null||e.classList.remove("hidden"),(o=e==null?void 0:e.querySelector("input"))==null||o.focus()):e==null||e.classList.add("hidden"),t&&t!==""?s==null||s.classList.remove("hidden"):s==null||s.classList.add("hidden")},openAddSaleModal(){const t=this.state.cart.length>0?this.state.cart.map(s=>`
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
                                                    `;document.body.insertAdjacentHTML("beforeend",e),setTimeout(()=>document.getElementById("sku-search").focus(),100)},addToCart(t,e){e&&e.stopPropagation(),this.openAddSaleModal(),setTimeout(()=>{const s=document.getElementById("sku-search");s.value=t,this.searchSku(t),setTimeout(()=>{const o=document.getElementById("sku-results").firstElementChild;o&&o.click()},500)},200)},openSaleDetailModal(t){const e=this.state.sales.find(l=>l.id===t);if(!e)return;const s=new Date(e.date),o=`
                                                    <div id="sale-detail-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                                                        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                                                            <div class="bg-brand-dark p-6 text-white relative">
                                                                <button onclick="document.getElementById('sale-detail-modal').remove()" class="absolute top-4 right-4 text-white/70 hover:text-white">
                                                                    <i class="ph-bold ph-x text-2xl"></i>
                                                                </button>
                                                                <h2 class="font-display font-bold text-2xl mb-1">Detalle de Venta</h2>
                                                                <p class="text-brand-orange font-bold text-sm uppercase tracking-wider">#${e.id.slice(0,8)}</p>
                                                            </div>

                                                            <div class="p-6 space-y-6">
                                                                <!-- Info Grid -->
                                                                <div class="grid grid-cols-2 gap-6">
                                                                    <div>
                                                                        <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Fecha y Hora</label>
                                                                        <p class="font-bold text-brand-dark">${s.toLocaleDateString()}</p>
                                                                        <p class="text-xs text-slate-500">${s.toLocaleTimeString()}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Vendedor</label>
                                                                        <p class="font-bold text-brand-dark">${e.seller||"Sistema"}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Cliente</label>
                                                                        <p class="font-bold text-brand-dark">${e.customerName||"No registrado"}</p>
                                                                        <p class="text-xs text-slate-500">${e.customerEmail||""}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Canal / Pago</label>
                                                                        <span class="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wide mr-1">${e.channel||"Tienda"}</span>
                                                                        <span class="px-2 py-1 rounded bg-brand-orange/10 text-[10px] font-bold text-brand-orange uppercase tracking-wide">${e.paymentMethod}</span>
                                                                    </div>
                                                                </div>

                                                                <!-- Items List -->
                                                                <div>
                                                                    <label class="text-xs font-bold text-slate-400 uppercase block mb-2">Items Vendidos</label>
                                                                    <div class="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                                                        ${e.items&&e.items.length>0?e.items.map(l=>`
                                    <div class="p-3 flex justify-between items-center">
                                        <div class="truncate pr-4">
                                            <p class="font-bold text-sm text-brand-dark truncate">${l.album}</p>
                                            <p class="text-xs text-slate-500 truncate">${l.artist}</p>
                                        </div>
                                        <span class="font-bold text-brand-dark text-sm">${this.formatCurrency(l.price)}</span>
                                    </div>
                                `).join(""):`
                                    <div class="p-3 flex justify-between items-center">
                                        <div class="truncate pr-4">
                                            <p class="font-bold text-sm text-brand-dark truncate">${e.album||"Venta Manual"}</p>
                                            <p class="text-xs text-slate-500 truncate">${e.artist||"-"}</p>
                                        </div>
                                        <div class="text-right">
                                            <span class="block font-bold text-brand-dark text-sm">${this.formatCurrency(e.total/(e.quantity||1))}</span>
                                            ${e.quantity>1?`<span class="text-[10px] text-slate-500">x${e.quantity}</span>`:""}
                                        </div>
                                    </div>
                                `}
                                                                    </div>
                                                                </div>

                                                                <!-- Financials -->
                                                                <div class="flex justify-between items-end pt-4 border-t border-slate-100">
                                                                    <div>
                                                                        <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Nota</label>
                                                                        <p class="text-sm text-brand-dark">${e.comment||"Sin notas"}</p>
                                                                    </div>
                                                                    <div class="text-right">
                                                                        <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Total Venta</label>
                                                                        <p class="font-display font-bold text-3xl text-brand-orange">${this.formatCurrency(e.total)}</p>
                                                                    </div>
                                                                </div>

                                                                <div class="flex gap-4 pt-2">
                                                                    <button onclick="document.getElementById('sale-detail-modal').remove()" class="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                                                        Cerrar
                                                                    </button>
                                                                    <button onclick="app.deleteSale('${e.id}'); document.getElementById('sale-detail-modal').remove()" class="flex-1 py-3 bg-white border-2 border-red-50 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors">
                                                                        Eliminar Venta
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    `;document.body.insertAdjacentHTML("beforeend",o)},navigateInventoryFolder(t,e){t==="genre"&&(this.state.filterGenre=e),t==="owner"&&(this.state.filterOwner=e),t==="label"&&(this.state.filterLabel=e),t==="storage"&&(this.state.filterStorage=e),this.refreshCurrentView()},toggleSelection(t){this.state.selectedItems.has(t)?this.state.selectedItems.delete(t):this.state.selectedItems.add(t),this.refreshCurrentView()},openPrintLabelModal(t){const e=this.state.inventory.find(o=>o.sku===t);if(!e)return;const s=`
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
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},toggleSelectAll(){this.state.filterYear;const t=this.state.inventorySearch.toLowerCase(),e=this.state.inventory.filter(s=>{const o=this.state.filterGenre==="all"||s.genre===this.state.filterGenre,l=this.state.filterOwner==="all"||s.owner===this.state.filterOwner,a=this.state.filterLabel==="all"||s.label===this.state.filterLabel,r=this.state.filterStorage==="all"||s.storageLocation===this.state.filterStorage,n=!t||s.album.toLowerCase().includes(t)||s.artist.toLowerCase().includes(t)||s.sku.toLowerCase().includes(t);return o&&l&&a&&r&&n});this.state.selectedItems.size===e.length?this.state.selectedItems.clear():e.forEach(s=>this.state.selectedItems.add(s.sku)),this.refreshCurrentView()},addSelectionToCart(){this.state.selectedItems.forEach(t=>{const e=this.state.inventory.find(s=>s.sku===t);e&&e.stock>0&&(this.state.cart.find(s=>s.sku===t)||this.state.cart.push(e))}),this.state.selectedItems.clear(),this.showToast(`${this.state.cart.length} items agregados al carrito`),this.refreshCurrentView()},deleteSelection(){if(!confirm(`¿Estás seguro de eliminar ${this.state.selectedItems.size} productos ? `))return;const t=f.batch(),e=[];this.state.selectedItems.forEach(s=>{const o=f.collection("products").doc(s),l=this.state.inventory.find(a=>a.sku===s);l&&e.push(l),t.delete(o)}),t.commit().then(()=>{this.showToast("Productos eliminados"),e.forEach(s=>this.logInventoryMovement("DELETE",s)),this.state.selectedItems.clear()}).catch(s=>{console.error("Error logging movement:",s),alert("Error al eliminar")})},openAddExpenseModal(){const t=["Alquiler","Servicios","Marketing","Suministros","Honorarios"],s=`
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
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},async handleAddVinyl(t,e){t.preventDefault();const s=new FormData(t.target);let o=s.get("genre");o==="other"&&(o=s.get("custom_genre"));let l=s.get("collection");l==="other"&&(l=s.get("custom_collection"));const a=s.get("sku"),r=s.get("publish_webshop")==="on",n=s.get("publish_discogs")==="on",p=s.get("publish_local")==="on",i={sku:a,artist:s.get("artist"),album:s.get("album"),genre:o,genre2:s.get("genre2")||null,genre3:s.get("genre3")||null,genre4:s.get("genre4")||null,genre5:s.get("genre5")||null,label:s.get("label"),collection:l||null,collectionNote:s.get("collectionNote")||null,condition:s.get("status"),sleeveCondition:s.get("sleeveCondition")||"",comments:s.get("comments")||"",price:parseFloat(s.get("price")),cost:parseFloat(s.get("cost"))||0,stock:parseInt(s.get("stock")),storageLocation:s.get("storageLocation"),owner:s.get("owner"),is_online:r,publish_webshop:r,publish_discogs:n,publish_local:p,cover_image:s.get("cover_image")||null,created_at:firebase.firestore.FieldValue.serverTimestamp()};try{let c=null,b=null;if(e){const d=await this.findProductBySku(e);if(!d){this.showToast("❌ Producto no encontrado","error");return}b=d.data,c=d.id,await d.ref.update(i),this.showToast("✅ Disco actualizado")}else c=(await f.collection("products").add(i)).id,this.showToast("✅ Disco agregado al inventario");if(n){const d=s.get("discogs_release_id");if(b&&b.discogs_listing_id)try{const g=await(await fetch(`https://el-cuartito-completo.onrender.com/discogs/update-listing/${b.discogs_listing_id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({product:i})})).json();if(g.success)this.showToast("💿 Listing de Discogs actualizado");else throw new Error(g.error||"Error desconocido")}catch(u){console.error("Error updating Discogs listing:",u),this.showToast(`⚠️ Error Discogs: ${u.message}`,"error")}else if(d)try{const g=await(await fetch("https://el-cuartito-completo.onrender.com/discogs/create-listing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({releaseId:parseInt(d),product:i})})).json();if(g.success&&g.listingId)await f.collection("products").doc(c).update({discogs_listing_id:String(g.listingId),discogs_release_id:parseInt(d)}),this.showToast("💿 Publicado en Discogs correctamente");else throw new Error(g.error||"Error desconocido")}catch(u){console.error("Error creating Discogs listing:",u);let g=u.message;(g.toLowerCase().includes("mp3")||g.toLowerCase().includes("digital")||g.toLowerCase().includes("format"))&&(g="Discogs solo permite formatos físicos (Vinyl, CD, Cassette). Este release es digital o MP3."),this.showToast(`⚠️ Error Discogs: ${g}`,"error")}else this.showToast("⚠️ Necesitas buscar el disco en Discogs primero para publicarlo","warning")}document.getElementById("modal-overlay").remove(),this.loadData()}catch(c){console.error(c),this.showToast("❌ Error: "+(c.message||"desconocido"),"error")}},deleteVinyl(t){const e=this.state.inventory.find(o=>o.sku===t);if(!e){alert("Error: Item not found");return}const s=`
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
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},async confirmDelete(t){const e=document.getElementById("delete-confirm-modal");e&&e.remove();const s=document.getElementById("modal-overlay");s&&s.remove();try{const o=await this.findProductBySku(t);if(!o){this.showToast("❌ Producto no encontrado","error");return}if(console.log("Product to delete:",o.data),console.log("Has discogs_listing_id?",o.data.discogs_listing_id),o.data.discogs_listing_id){console.log("Attempting to delete from Discogs:",o.data.discogs_listing_id);try{const l=await fetch(`https://el-cuartito-completo.onrender.com/discogs/delete-listing/${o.data.discogs_listing_id}`,{method:"DELETE"});console.log("Discogs delete response status:",l.status);const a=await l.json();console.log("Discogs delete result:",a),a.success?(console.log("Discogs listing deleted successfully"),this.showToast("💿 Eliminado de Discogs")):this.showToast("⚠️ "+(a.error||"Error en Discogs"),"warning")}catch(l){console.error("Error deleting from Discogs:",l),this.showToast("⚠️ Error eliminando de Discogs, pero continuando...","warning")}}else console.log("No discogs_listing_id found, skipping Discogs deletion");await o.ref.delete(),this.showToast("✅ Disco eliminado"),await this.loadData()}catch(o){console.error("Error removing document: ",o),this.showToast("❌ Error al eliminar: "+o.message,"error")}},handleSaleSubmit(t){var h,v,y,m,x,$,k;t.preventDefault();const e=new FormData(t.target);let s=e.get("sku");s||(s=(h=document.getElementById("input-sku"))==null?void 0:h.value);let o=parseInt(e.get("quantity"));isNaN(o)&&(o=parseInt((v=document.getElementById("input-qty"))==null?void 0:v.value)||1);let l=parseFloat(e.get("price"));isNaN(l)&&(l=parseFloat((y=document.getElementById("input-price"))==null?void 0:y.value)||0),parseFloat(e.get("cost")),e.get("date")||new Date().toISOString();const a=e.get("paymentMethod");e.get("soldAt"),e.get("comment");let r=e.get("artist");r||(r=(m=document.getElementById("input-artist"))==null?void 0:m.value);let n=e.get("album");n||(n=(x=document.getElementById("input-album"))==null?void 0:x.value);let p=e.get("genre");p||(p=($=document.getElementById("input-genre"))==null?void 0:$.value);let i=e.get("owner");i||(i=(k=document.getElementById("input-owner"))==null?void 0:k.value);const c=e.get("customerName"),b=e.get("customerEmail"),d=e.get("requestInvoice")==="on",u=this.state.inventory.find(w=>w.sku===s);if(!u){alert(`Producto con SKU "${s}" no encontrado en inventario`);return}const g={items:[{recordId:u.id,quantity:o}],paymentMethod:a||"CASH",customerName:c||"Venta Manual",customerEmail:b||null,source:"STORE"};L.createSale(g).then(()=>{this.showToast(d?"Venta registrada (Factura Solicitada)":"Venta registrada");const w=document.getElementById("modal-overlay");w&&w.remove();const S=t.target;S&&S.reset();const I=document.getElementById("form-total");I&&(I.innerText="$0.00");const E=document.getElementById("sku-search");E&&(E.value=""),this.loadData()}).catch(w=>{console.error("Error adding sale: ",w),alert("Error al registrar venta: "+(w.message||""))})},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(l=>l.sku===t);if(!s)return;if(this.state.cart.filter(l=>l.sku===t).length>=s.stock){this.showToast("⚠️ No hay más stock disponible");return}this.state.cart.push(s),document.getElementById("inventory-cart-container")?this.renderInventoryCart():this.renderCartWidget(),this.showToast("Agregado al carrito")},removeFromCart(t){this.state.cart.splice(t,1),this.renderCartWidget()},clearCart(){this.state.cart=[],this.renderCartWidget()},renderOnlineSales(t){const e=this.state.sales.filter(a=>a.channel==="online"),s=e.filter(a=>a.status==="completed"),o=e.filter(a=>a.status==="PENDING"),l=s.reduce((a,r)=>a+(parseFloat(r.total_amount||r.total)||0),0);t.innerHTML=`
        <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="font-display text-3xl font-bold text-brand-dark mb-2">🌐 Ventas WebShop</h1>
                    <p class="text-slate-500">Pedidos realizados a través de la tienda online</p>
                </div>
                <div class="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl">
                    <div class="text-sm font-medium opacity-90">Ingresos Totales</div>
                    <div class="text-3xl font-bold">DKK ${l.toFixed(2)}</div>
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
                                ${e.map(a=>{var n;const r=(n=a.timestamp)!=null&&n.toDate?a.timestamp.toDate():new Date(a.date||0);return{...a,_sortDate:r.getTime()}}).sort((a,r)=>r._sortDate-a._sortDate).map(a=>{var u,g,h,v,y,m,x;const r=a.customer||{},n=a.orderNumber||"N/A",p=(u=a.timestamp)!=null&&u.toDate?a.timestamp.toDate():new Date(a.date),c=((g=a.completed_at)!=null&&g.toDate?a.completed_at.toDate():null)||p,b={completed:"bg-green-50 text-green-700 border-green-200",PENDING:"bg-yellow-50 text-yellow-700 border-yellow-200",failed:"bg-red-50 text-red-700 border-red-200"},d={completed:"✅ Completado",PENDING:"⏳ Pendiente",failed:"❌ Fallido"};return`
                                        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openOnlineSaleDetailModal('${a.id}')">
                                            <td class="px-6 py-4">
                                                <div class="font-mono text-sm font-bold text-brand-orange">${n}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="font-semibold text-brand-dark">${r.name||(r.firstName?`${r.firstName} ${r.lastName||""}`:"")||((h=r.stripe_info)==null?void 0:h.name)||"Cliente"}</div>
                                                <div class="text-xs text-slate-500">${r.email||((v=r.stripe_info)==null?void 0:v.email)||"No email"}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-slate-600 truncate max-w-[200px]">
                                                    ${((y=r.shipping)==null?void 0:y.line1)||r.address||((x=(m=r.stripe_info)==null?void 0:m.shipping)==null?void 0:x.line1)||"Sin dirección"}
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
    `},openOnlineSaleDetailModal(t){var p,i,c;const e=this.state.sales.find(b=>b.id===t);if(!e)return;const s=e.customer||{},o=s.stripe_info||{},l=s.shipping||o.shipping||{},a={line1:l.line1||s.address||"Sin dirección",line2:l.line2||"",city:l.city||s.city||"",postal:l.postal_code||s.postalCode||"",country:l.country||s.country||"Denmark"},r=`
            <p class="font-medium">${a.line1}</p>
            ${a.line2?`<p class="font-medium">${a.line2}</p>`:""}
            <p class="text-slate-500">${a.postal} ${a.city}</p>
            <p class="text-slate-500 font-bold mt-1 uppercase tracking-wider">${a.country}</p>
        `,n=`
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
                                    <p class="font-bold text-brand-dark text-base">${s.name||(s.firstName?`${s.firstName} ${s.lastName||""}`:"")||((p=s.stripe_info)==null?void 0:p.name)||"Cliente"}</p>
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
                                    <span class="font-bold">${new Date((i=e.timestamp)!=null&&i.toDate?e.timestamp.toDate():(c=e.completed_at)!=null&&c.toDate?e.completed_at.toDate():e.date).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</span>
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
                                    ${(e.items||[]).map(b=>{var d,u,g;return`
                                        <tr>
                                            <td class="px-4 py-3">
                                                <p class="font-bold text-brand-dark">${b.album||((d=b.record)==null?void 0:d.album)||"Unknown"}</p>
                                                <p class="text-xs text-slate-500">${b.artist||((u=b.record)==null?void 0:u.artist)||""}</p>
                                            </td>
                                            <td class="px-4 py-3 text-center font-medium">${b.quantity||1}</td>
                                            <td class="px-4 py-3 text-right font-bold text-brand-dark">DKK ${(b.unitPrice||((g=b.record)==null?void 0:g.price)||0).toFixed(2)}</td>
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
    `;document.body.insertAdjacentHTML("beforeend",n)},renderCartWidget(){const t=document.getElementById("cart-widget");if(!t)return;const e=document.getElementById("cart-count"),s=document.getElementById("cart-items-mini"),o=document.getElementById("cart-total-mini");if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden"),e.innerText=this.state.cart.length;const l=this.state.cart.reduce((a,r)=>a+r.price,0);o.innerText=this.formatCurrency(l),s.innerHTML=this.state.cart.map((a,r)=>`
                                                                <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                                                    <div class="truncate pr-2">
                                                                        <p class="font-bold text-xs text-brand-dark truncate">${a.album}</p>
                                                                        <p class="text-[10px] text-slate-500 truncate">${a.price} kr.</p>
                                                                    </div>
                                                                    <button onclick="app.removeFromCart(${r})" class="text-red-400 hover:text-red-600">
                                                                        <i class="ph-bold ph-x"></i>
                                                                    </button>
                                                                </div>
                                                                `).join("")},openCheckoutModal(){if(this.state.cart.length===0)return;const t=this.state.cart.reduce((s,o)=>s+o.price,0),e=`
                                                                <div id="modal-overlay" class="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl transform scale-100 transition-all border border-orange-100 max-h-[90vh] overflow-y-auto">
                                                                        <div class="flex justify-between items-center mb-6">
                                                                            <h3 class="font-display text-xl font-bold text-brand-dark">Finalizar Venta (${this.state.cart.length} items)</h3>
                                                                            <button onclick="document.getElementById('modal-overlay').remove()" class="text-slate-400 hover:text-slate-600">
                                                                                <i class="ph-bold ph-x text-xl"></i>
                                                                            </button>
                                                                        </div>

                                                                        <div class="bg-orange-50/50 rounded-xl p-4 mb-6 border border-orange-100 max-h-40 overflow-y-auto custom-scrollbar">
                                                                            ${this.state.cart.map(s=>`
                            <div class="flex justify-between py-1 border-b border-orange-100/50 last:border-0 text-sm">
                                <span class="truncate pr-4 font-medium text-slate-700">${s.album}</span>
                                <span class="font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(s.price)}</span>
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
                                                                                    </select>
                                                                                </div>
                                                                            </div>

                                                                            <div>
                                                                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Canal</label>
                                                                                <select name="soldAt" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-orange outline-none text-sm">
                                                                                    <option>Tienda</option>
                                                                                    <option>Discogs</option>
                                                                                    <option>Feria</option>
                                                                                </select>
                                                                            </div>

                                                                            <div class="flex items-center justify-between p-4 bg-brand-dark text-white rounded-xl shadow-lg shadow-brand-dark/10">
                                                                                <span class="text-sm font-medium">Total a Pagar</span>
                                                                                <span class="font-display font-bold text-2xl">${this.formatCurrency(t)}</span>
                                                                            </div>

                                                                            <button type="submit" class="w-full py-3.5 bg-brand-orange text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2">
                                                                                <i class="ph-bold ph-check-circle text-xl"></i>
                                                                                Confirmar Venta
                                                                            </button>
                                                                        </form>
                                                                    </div>
                                                                </div>
                                                                `;document.body.insertAdjacentHTML("beforeend",e)},handleCheckoutSubmit(t){t.preventDefault();const e=new FormData(t.target),s={items:this.state.cart.map(o=>({recordId:o.id,quantity:1})),paymentMethod:e.get("paymentMethod"),customerName:e.get("customerName"),customerEmail:e.get("customerEmail"),source:"STORE"};L.createSale(s).then(()=>{this.showToast(`Venta de ${this.state.cart.length} items registrada!`),this.clearCart(),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>{console.error("Error checkout",o),alert("Error al procesar venta: "+o.message)})},handleSalesViewCheckout(){if(this.state.cart.length===0){this.showToast("El carrito está vacío");return}this.openCheckoutModal()},async deleteSale(t){var s;if(!confirm("¿Eliminar esta venta y restaurar stock?"))return;const e=this.state.sales.find(o=>o.id===t);if(!e){this.showToast("❌ Venta no encontrada","error");return}try{const o=f.batch(),l=f.collection("sales").doc(t);if(o.delete(l),e.items&&Array.isArray(e.items))for(const a of e.items){const r=a.productId||a.recordId,n=a.sku||((s=a.record)==null?void 0:s.sku),p=parseInt(a.quantity||a.qty)||1;let i=null;if(r)try{const c=await f.collection("products").doc(r).get();c.exists&&(i={ref:c.ref,data:c.data()})}catch{console.warn("Could not find product by ID:",r)}!i&&n&&(i=await this.findProductBySku(n)),i?o.update(i.ref,{stock:firebase.firestore.FieldValue.increment(p)}):console.warn("Could not restore stock for item:",a)}else if(e.sku){const a=await this.findProductBySku(e.sku);if(a){const r=parseInt(e.quantity)||1;o.update(a.ref,{stock:firebase.firestore.FieldValue.increment(r)})}}await o.commit(),this.showToast("✅ Venta eliminada y stock restaurado"),this.loadData()}catch(o){console.error("Error deleting sale:",o),this.showToast("❌ Error al eliminar venta: "+o.message,"error")}},renderExpenses(t){const e=["Alquiler","Servicios","Marketing","Suministros","Honorarios"],s=[...new Set([...e,...this.state.customCategories||[]])],o=(this.state.expensesSearch||"").toLowerCase(),l=this.state.expenses.filter(n=>!o||(n.description||"").toLowerCase().includes(o)||(n.category||"").toLowerCase().includes(o)),a=`
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
                                                                                                ${s.map(n=>`<option>${n}</option>`).join("")}
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
                                                                                        ${l.slice().reverse().map(n=>`
                                        <tr class="hover:bg-orange-50/30 transition-colors group">
                                            <td class="p-4 text-xs text-slate-500">${this.formatDate(n.date)}</td>
                                            <td class="p-4">
                                                <p class="text-sm font-bold text-brand-dark">${n.description}</p>
                                                <p class="text-xs text-slate-500">${n.category}</p>
                                            </td>
                                            <td class="p-4 text-right font-medium text-brand-dark">${this.formatCurrency(n.amount)}</td>
                                            <td class="p-4 text-center">
                                                ${n.hasVat?'<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Sí</span>':'<span class="text-xs bg-slate-100 text-slate-400 px-2 py-1 rounded">No</span>'}
                                            </td>
                                            <td class="p-4 text-center">
                                                <div class="flex gap-1 justify-center">
                                                    <button onclick="app.editExpense('${n.id}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-orange transition-all p-2" title="Editar">
                                                        <i class="ph-fill ph-pencil-simple"></i>
                                                    </button>
                                                    <button onclick="app.deleteExpense('${n.id}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-2" title="Eliminar">
                                                        <i class="ph-fill ph-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join("")}
                                                                                        ${l.length===0?`
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
                                                                `;t.innerHTML=a;const r=t.querySelector('input[placeholder="Buscar gasto..."]');r&&(r.focus(),r.setSelectionRange(r.value.length,r.value.length))},editExpense(t){if(!confirm("¿Seguro que deseas editar este gasto?"))return;const e=this.state.expenses.find(o=>o.id===t);if(!e)return;document.getElementById("expense-id").value=e.id,document.getElementById("expense-description").value=e.description,document.getElementById("expense-amount").value=e.amount,document.getElementById("hasVat").checked=e.hasVat;const s=document.getElementById("expense-category");[...s.options].some(o=>o.value===e.category)?s.value=e.category:(s.value="other",M.checkCustomInput(s,"custom-expense-category-container"),document.querySelector('[name="custom_category"]').value=e.category),document.getElementById("expense-form-title").innerText="Editar Gasto",document.getElementById("expense-submit-btn").innerText="Actualizar",document.getElementById("expense-cancel-btn").classList.remove("hidden")},resetExpenseForm(){document.getElementById("expense-form").reset(),document.getElementById("expense-id").value="",document.getElementById("expense-form-title").innerText="Nuevo Gasto",document.getElementById("expense-submit-btn").innerText="Guardar",document.getElementById("expense-cancel-btn").classList.add("hidden"),document.getElementById("custom-expense-category-container").classList.add("hidden")},handleExpenseSubmit(t){t.preventDefault();const e=new FormData(t.target);let s=e.get("category");if(s==="other"&&(s=e.get("custom_category"),this.state.customCategories||(this.state.customCategories=[]),!this.state.customCategories.includes(s))){const a=[...this.state.customCategories,s];f.collection("settings").doc("general").set({customCategories:a},{merge:!0})}const o={description:e.get("description"),category:s,amount:parseFloat(e.get("amount")),hasVat:e.get("hasVat")==="on",date:new Date().toISOString()},l=e.get("id");if(l){const a=this.state.expenses.find(r=>r.id===l);a&&(o.date=a.date),f.collection("expenses").doc(l).update(o).then(()=>{this.showToast("✅ Gasto actualizado"),this.loadData()}).catch(r=>console.error(r))}else f.collection("expenses").add(o).then(()=>{this.showToast("✅ Gasto registrado"),this.loadData()}).catch(a=>console.error(a));this.resetExpenseForm()},deleteExpense(t){confirm("¿Eliminar este gasto?")&&f.collection("expenses").doc(t).delete().then(()=>{this.showToast("✅ Gasto eliminado"),this.loadData()}).catch(e=>console.error(e))},renderConsignments(t){if(!t)return;const e=`
                                                                <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-8 pt-6 animate-fadeIn">
                                                                    <div class="flex justify-between items-center mb-8">
                                                                        <h2 class="font-display text-2xl font-bold text-brand-dark">Socios y Consignación</h2>
                                                                        <button onclick="app.openAddConsignorModal()" class="bg-brand-dark text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                                            <i class="ph-bold ph-plus"></i>
                                                                            Nuevo Socio
                                                                        </button>
                                                                    </div>

                                                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        ${this.state.consignors.map(s=>{const o=s.name,a=this.state.inventory.filter(c=>c.owner===o).reduce((c,b)=>c+b.stock,0),r=[];this.state.sales.forEach(c=>{(c.items||[]).filter(d=>{if((d.owner||"").toLowerCase()===o.toLowerCase())return!0;const u=this.state.inventory.find(g=>g.id===(d.productId||d.recordId));return u&&(u.owner||"").toLowerCase()===o.toLowerCase()}).forEach(d=>{const u=Number(d.priceAtSale||d.unitPrice||0),g=s.agreementSplit||s.split||70,h=u*g/100;r.push({...d,id:c.id,date:c.date,cost:d.costAtSale||d.cost||h,payoutStatus:c.payoutStatus||"pending",payoutDate:c.payoutDate||null})}),(!c.items||c.items.length===0)&&(c.owner||"").toLowerCase()===o.toLowerCase()&&r.push({...c,album:c.album||c.sku||"Record",cost:c.cost||(Number(c.total)||0)*(s.agreementSplit||70)/100})}),r.sort((c,b)=>new Date(b.date)-new Date(c.date)),r.reduce((c,b)=>c+(Number(b.qty||b.quantity)||1),0);const n=r.reduce((c,b)=>c+(Number(b.cost)||0),0),p=r.filter(c=>c.payoutStatus==="paid").reduce((c,b)=>c+(Number(b.cost)||0),0),i=n-p;return`
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
                                    <span class="text-xs text-slate-500 font-medium">Pagado: ${this.formatCurrency(p)}</span>
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

                                                                    `)},handleAddConsignor(t){t.preventDefault();const e=new FormData(t.target),s={name:e.get("name"),agreementSplit:parseFloat(e.get("split")),email:e.get("email"),phone:e.get("phone")};f.collection("consignors").add(s).then(()=>{this.showToast("✅ Socio registrado correctamente"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(o=>{console.error(o),this.showToast("❌ Error al crear socio: "+o.message,"error")})},deleteConsignor(t){confirm("¿Eliminar este socio?")&&f.collection("consignors").doc(t).delete().then(()=>{this.showToast("✅ Socio eliminado"),this.loadData()}).catch(e=>{console.error(e),this.showToast("❌ Error al eliminar socio: "+e.message,"error")})},saveData(){try{const t={vatActive:this.state.vatActive};localStorage.setItem("el-cuartito-settings",JSON.stringify(t))}catch(t){console.error("Error saving settings:",t)}},renderVAT(t){const e=p=>p?p.toDate?p.toDate().getFullYear():new Date(p).getFullYear():0,s=this.state.sales.filter(p=>e(p.date)===this.state.filterYear),o=this.state.expenses.filter(p=>e(p.date)===this.state.filterYear);let l=0,a=0;this.state.vatActive&&(l=s.reduce((p,i)=>p+this.getVatComponent(i.total),0),a=o.filter(p=>p.hasVat).reduce((p,i)=>p+this.getVatComponent(i.amount),0));const r=l-a,n=`
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
                                                                                        <span class="font-medium">${this.formatCurrency(s.reduce((p,i)=>p+i.total,0))}</span>
                                                                                    </div>
                                                                                    <div class="flex justify-between text-sm pt-3 border-t border-slate-100">
                                                                                        <span class="font-bold text-brand-orange">Total VAT (25%)</span>
                                                                                        <span class="font-bold text-brand-orange">${this.formatCurrency(l)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                                                                                <h3 class="font-bold text-lg mb-4 text-brand-dark">VAT Deducible (Gastos)</h3>
                                                                                <div class="space-y-3">
                                                                                    <div class="flex justify-between text-sm">
                                                                                        <span class="text-slate-500">Gastos con VAT</span>
                                                                                        <span class="font-medium">${this.formatCurrency(o.filter(p=>p.hasVat).reduce((p,i)=>p+i.amount,0))}</span>
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
                                                                `;t.innerHTML=n},toggleVAT(){this.state.vatActive=!this.state.vatActive,this.saveData(),this.renderVAT(document.getElementById("app-content"))},searchDiscogs(){const t=document.getElementById("discogs-search-input").value,e=document.getElementById("discogs-results");if(!t)return;const s=localStorage.getItem("discogs_token");if(!s){e.innerHTML=`
                <div class="text-center py-4 px-3">
                    <p class="text-xs text-red-500 font-bold mb-2">⚠️ Token de Discogs no configurado</p>
                    <button onclick="app.navigate('settings'); document.getElementById('modal-overlay').remove()" 
                        class="text-xs font-bold text-brand-orange hover:underline">
                        Ir a Configuración →
                    </button>
                </div>
            `,e.classList.remove("hidden");return}e.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Buscando en Discogs...</p>',e.classList.remove("hidden"),fetch(`https://api.discogs.com/database/search?q=${encodeURIComponent(t)}&type=release&token=${s}`).then(o=>{if(o.status===401)throw new Error("Token inválido o expirado");if(!o.ok)throw new Error(`Error ${o.status}`);return o.json()}).then(o=>{o.results&&o.results.length>0?e.innerHTML=o.results.slice(0,10).map(l=>`
                        <div onclick='app.handleDiscogsSelection(${JSON.stringify(l).replace(/'/g,"&#39;")})' class="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-brand-orange hover:shadow-sm transition-all">
                            <img src="${l.thumb||"logo.jpg"}" class="w-12 h-12 rounded object-cover bg-slate-100 flex-shrink-0">
                            <div class="flex-1 min-w-0">
                                <p class="font-bold text-xs text-brand-dark leading-tight mb-1">${l.title}</p>
                                <p class="text-[10px] text-slate-500">${l.year||"?"} · ${l.format?l.format.join(", "):"Vinyl"} · ${l.country||""}</p>
                                <p class="text-[10px] text-slate-400">${l.label?l.label[0]:""}</p>
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
                `})},resyncMusic(){["input-discogs-id","input-discogs-release-id","input-discogs-url","input-cover-image"].forEach(o=>{const l=document.getElementById(o);l&&(l.value="")});const t=document.querySelector('input[name="artist"]').value,e=document.querySelector('input[name="album"]').value,s=document.getElementById("discogs-search-input");s&&t&&e?(s.value=`${t} - ${e}`,this.searchDiscogs(),this.showToast("✅ Música desvinculada. Selecciona una nueva edición.","success")):this.showToast("⚠️ Falta Artista o Álbum para buscar.","error")},handleDiscogsSelection(t){const e=t.title.split(" - "),s=e[0]||"",o=e.slice(1).join(" - ")||t.title,l=document.querySelector("#modal-overlay form");if(!l)return;if(l.artist&&(l.artist.value=s),l.album&&(l.album.value=o),l.year&&t.year&&(l.year.value=t.year),l.label&&t.label&&t.label.length>0&&(l.label.value=t.label[0]),t.thumb||t.cover_image){const n=t.cover_image||t.thumb,p=document.getElementById("input-cover-image"),i=document.getElementById("cover-preview");p&&(p.value=n),i&&(i.querySelector("img").src=n,i.classList.remove("hidden"))}const a=document.getElementById("input-discogs-release-id");a&&t.id&&(a.value=t.id);const r=localStorage.getItem("discogs_token");if(r&&t.id)this.showToast("⏳ Cargando géneros...","info"),fetch(`https://api.discogs.com/releases/${t.id}?token=${r}`).then(n=>n.json()).then(n=>{console.log("Full Discogs Release:",n);const p=[...n.styles||[],...n.genres||[]];console.log("ALL Genres/Styles from full release:",p);const i=[...new Set(p)];if(i.length>0){const d=l.querySelector('select[name="genre"]'),u=l.querySelector('select[name="genre2"]'),g=l.querySelector('select[name="genre3"]'),h=l.querySelector('select[name="genre4"]'),v=l.querySelector('select[name="genre5"]'),y=[d,u,g,h,v];i.slice(0,5).forEach((m,x)=>{if(y[x]){let $=!1;for(let k of y[x].options)if(k.value===m){y[x].value=m,$=!0;break}if(!$){const k=document.createElement("option");k.value=m,k.text=m,k.selected=!0,y[x].add(k)}}}),this.showToast(`✅ ${i.length} géneros cargados`,"success")}if(n.images&&n.images.length>0){const d=n.images[0].uri,u=document.getElementById("input-cover-image"),g=document.getElementById("cover-preview");u&&(u.value=d),g&&(g.querySelector("img").src=d)}const c=document.getElementById("tracklist-preview"),b=document.getElementById("tracklist-preview-content");c&&b&&n.tracklist&&n.tracklist.length>0&&(b.innerHTML=n.tracklist.map(d=>`
                            <div class="flex items-center gap-2 py-1 border-b border-slate-100 last:border-0">
                                <span class="text-[10px] font-mono text-slate-400 w-6">${d.position||""}</span>
                                <span class="flex-1">${d.title}</span>
                                <span class="text-[10px] text-slate-400">${d.duration||""}</span>
                            </div>
                        `).join(""),c.classList.remove("hidden"))}).catch(n=>{console.error("Error fetching full release:",n),this.showToast("⚠️ No se pudieron cargar todos los géneros","warning")});else{const n=[...t.style||[],...t.genre||[]];console.log("Fallback Genres (limited, no token):",n);const p=[...new Set(n)];if(p.length>0){const i=l.querySelector('select[name="genre"]');if(i){const c=p[0];let b=!1;for(let d of i.options)if(d.value===c){i.value=c,b=!0;break}if(!b){const d=document.createElement("option");d.value=c,d.text=c,d.selected=!0,i.add(d)}}}}if(t.uri||t.resource_url){const n=t.uri||t.resource_url,p=n.startsWith("http")?n:"https://www.discogs.com"+n,i=document.getElementById("input-discogs-url");i&&(i.value=p)}if(t.id){const n=document.getElementById("input-discogs-id");n&&(n.value=t.id)}document.getElementById("discogs-results").classList.add("hidden")},openTracklistModal(t){const e=this.state.inventory.find(a=>a.sku===t);if(!e)return;let s=e.discogsId;document.body.insertAdjacentHTML("beforeend",`
                                                                <div id="tracklist-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-fadeIn">
                                                                        <h3 class="font-display text-xl font-bold text-brand-dark mb-4">Lista de Temas (Tracklist)</h3>
                                                                        <div class="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                                                            <i class="ph-bold ph-spinner animate-spin text-4xl text-brand-orange"></i>
                                                                            <p class="font-medium">Cargando tracks desde Discogs...</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `);const l=a=>{const r=localStorage.getItem("discogs_token")||"hSIAXlFqQzYEwZzzQzXlFqQzYEwZzz";fetch(`https://api.discogs.com/releases/${a}?token=${r}`).then(n=>{if(!n.ok)throw new Error("Release not found");return n.json()}).then(n=>{const p=n.tracklist||[],i=p.map(b=>`
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
                                                                        ${p.length>0?i:'<p class="text-center text-slate-500 py-8">No se encontraron temas para esta edición.</p>'}
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
                                                                `})};if(s)l(s);else{const a=`${e.artist} - ${e.album}`,r=localStorage.getItem("discogs_token")||"hSIAXlFqQzYEwZzzQzXlFqQzYEwZzz";fetch(`https://api.discogs.com/database/search?q=${encodeURIComponent(a)}&type=release&token=${r}`).then(n=>n.json()).then(n=>{if(n.results&&n.results.length>0)l(n.results[0].id);else throw new Error("No results found in fallback search")}).catch(()=>{document.getElementById("tracklist-overlay").innerHTML=`
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
                    `})}},renderDiscogsSales(t){const e=this.state.sales.filter(l=>l.channel==="discogs"),s=e.reduce((l,a)=>l+(parseFloat(a.total_amount||a.total)||0),0),o=e.reduce((l,a)=>{const r=parseFloat(a.total_amount||a.total)||0;let n=0;return a.items&&Array.isArray(a.items)&&(n=a.items.reduce((p,i)=>{const c=parseFloat(i.costAtSale||0),b=parseInt(i.qty||i.quantity)||1;return p+c*b},0)),l+(r-n)},0);t.innerHTML=`
        <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="font-display text-3xl font-bold text-brand-dark mb-2">💿 Ventas Discogs</h1>
                    <p class="text-slate-500">Ventas realizadas a través de Discogs Marketplace</p>
                </div>
                <div class="bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-2xl shadow-xl">
                    <div class="text-sm font-medium opacity-90">Ingresos Totales</div>
                    <div class="text-3xl font-bold">DKK ${s.toFixed(2)}</div>
                    <div class="text-xs opacity-75">${e.length} ventas</div>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-brand-dark">${e.length}</div>
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wide">Total Ventas</div>
                        </div>
                        <div class="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                            <i class="ph-fill ph-vinyl-record text-2xl text-purple-500"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-brand-dark">DKK ${s.toFixed(2)}</div>
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wide">Ingresos</div>
                        </div>
                        <div class="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                            <i class="ph-fill ph-trend-up text-2xl text-green-500"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-2xl font-bold text-brand-dark">DKK ${o.toFixed(2)}</div>
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wide">Ganancia</div>
                        </div>
                        <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                            <i class="ph-fill ph-coins text-2xl text-blue-500"></i>
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
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cantidad</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Precio</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ganancia</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${e.map(l=>{var r;const a=(r=l.timestamp)!=null&&r.toDate?l.timestamp.toDate():new Date(l.date||0);return{...l,_sortDate:a.getTime()}}).sort((l,a)=>a._sortDate-l._sortDate).map(l=>{var b;const a=(b=l.timestamp)!=null&&b.toDate?l.timestamp.toDate():new Date(l.date),r=l.items&&l.items[0],n=(r==null?void 0:r.qty)||(r==null?void 0:r.quantity)||1,p=(r==null?void 0:r.priceAtSale)||l.total_amount/n||0,i=(r==null?void 0:r.costAtSale)||0,c=(p-i)*n;return`
                                        <tr class="border-b border-slate-50 hover:bg-purple-50/30 transition-colors">
                                            <td class="px-6 py-4 text-sm text-slate-600">${a.toLocaleDateString("es-ES")}</td>
                                            <td class="px-6 py-4">
                                                <div class="font-bold text-brand-dark text-sm">${(r==null?void 0:r.album)||"Producto"}</div>
                                                <div class="text-xs text-slate-500">${(r==null?void 0:r.artist)||"-"}</div>
                                            </td>
                                            <td class="px-6 py-4 text-sm font-medium text-slate-700">${n}</td>
                                            <td class="px-6 py-4 text-sm font-bold text-brand-dark">DKK ${p.toFixed(2)}</td>
                                            <td class="px-6 py-4 text-sm font-bold text-purple-600">DKK ${l.total_amount.toFixed(2)}</td>
                                            <td class="px-6 py-4 text-sm font-bold ${c>0?"text-green-600":"text-slate-400"}">DKK ${c.toFixed(2)}</td>
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
                        <p class="font-bold mb-1">¿Cómo funciona?</p>
                        <p class="text-purple-700">Las ventas de Discogs se detectan automáticamente cuando sincronizas tu inventario. Si el stock de un producto disminuye, se crea automáticamente un registro de venta.</p>
                    </div>
                </div>
            </div>
        </div>
        `}};window.app=M;document.addEventListener("DOMContentLoaded",()=>{M.init()});
