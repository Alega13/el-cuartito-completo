(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))a(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&a(r)}).observe(document,{childList:!0,subtree:!0});function s(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(o){if(o.ep)return;o.ep=!0;const i=s(o);fetch(o.href,i)}})();const T=firebase.firestore(),nt="2026.03.20.1";console.log("🚀 El Cuartito Admin v"+nt+" loaded");const te=window.auth,Re=new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"]),Le=new Set(["shop","dao_shop","gls_shop","postnord_shop","dhl_shop","bring_shop"]);function Ge(t){const e=String(t||"").toLowerCase();return e.includes("dao")?"dao":e.includes("gls")?"gls":e.includes("postnord")?"postnord":e.includes("bring")?"bring":e.includes("dhl")?"dhl":""}const We=[["dao","DAO"],["gls","GLS"],["postnord","PostNord"],["bring","Bring"],["dhl","DHL"]],rt=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,Qe=t=>/[\p{L}]/u.test(t||""),lt=t=>/\d/.test(t||""),ct=t=>String(t||"").replace(/\D/g,""),Fe={"receiver.name":"Falta nombre","receiver.address1":"Falta dirección","receiver.zipcode":"Falta código postal","receiver.city":"Falta ciudad","receiver.country_code":"Falta país","receiver.email":"Falta email","receiver.phone":"Falta teléfono","parcel.weight":"Falta peso",shippingMethod:"Falta método","service_point.id":"Falta punto de retiro",customs:"Falta aduana"};function dt(t={}){const e=[],s=String(t.name||"").trim();s?Qe(s)||e.push({field:"receiver.name",message:"El nombre no puede contener solo caracteres especiales"}):e.push({field:"receiver.name",message:"Falta nombre del destinatario"});const a=String(t.address1||"").trim();a.length<=5?e.push({field:"receiver.address1",message:"La dirección debe tener más de 5 caracteres"}):(Qe(a)||e.push({field:"receiver.address1",message:"La dirección debe contener letras"}),lt(a)||e.push({field:"receiver.address1",message:"La dirección debe incluir el número de puerta"})),String(t.zipcode||"").trim()||e.push({field:"receiver.zipcode",message:"Falta código postal"}),String(t.city||"").trim()||e.push({field:"receiver.city",message:"Falta ciudad"});const o=String(t.country_code||"").trim();/^[A-Z]{2}$/.test(o)||e.push({field:"receiver.country_code",message:"El país debe ser ISO alpha-2 en mayúsculas (ej. DK)"});const i=String(t.email||"").trim();rt.test(i)||e.push({field:"receiver.email",message:"Email inválido"});const r=String(t.phone||"").trim();return(!/^\+?[0-9\s\-().]{8,20}$/.test(r)||ct(r).length<8)&&e.push({field:"receiver.phone",message:"Teléfono inválido: solo números con prefijo internacional (ej. +45) y mínimo 8 dígitos"}),e}function pt(t={}){const e=[],s=t.weight;return!Number.isInteger(s)||s<=0?e.push({field:"parcel.weight",message:"El peso debe ser un entero mayor a 0 (gramos)"}):s===500&&!t.weightConfirmed&&e.push({field:"parcel.weight",message:"Confirmá el peso del paquete (500 g pre-cargados)"}),e}function _e(t={}){var o,i;const e=[...dt(t.receiver),...pt(t.parcel)];String(t.shippingMethod||"").trim()||e.push({field:"shippingMethod",message:"Falta método de envío"}),Le.has(t.shippingMethod)&&!String(((o=t.service_point)==null?void 0:o.id)||"").trim()&&e.push({field:"service_point.id",message:"Este método exige retiro en tienda: ingresá el ID del punto de servicio"});const s=String(((i=t.receiver)==null?void 0:i.country_code)||"").trim(),a=t.customs||[];return s&&!Re.has(s)&&(a.length?a.forEach((r,n)=>{String(r.description||"").trim()||e.push({field:`customs.${n}.description`,message:"Falta descripción del ítem para aduana"}),Number(r.value)>0||e.push({field:`customs.${n}.value`,message:"El valor declarado debe ser mayor a 0"}),/^[A-Z]{3}$/.test(String(r.currency||""))||e.push({field:`customs.${n}.currency`,message:"Moneda ISO 4217 (ej. DKK, EUR)"})}):e.push({field:"customs",message:`Destino fuera de la UE (${s}): la declaración de aduana es obligatoria`})),e}function ut(t,e){const s=e.receiver,a={order_id:t.orderNumber||t.id,receiver_name:s.name,receiver_address1:s.address1,receiver_zipcode:s.zipcode,receiver_city:s.city,receiver_country_code:s.country_code,receiver_email:s.email,receiver_mobile:s.phone,parcels:[{weight:e.parcel.weight}],product_code:(()=>{const o=e.shippingMethod||"home";return o!=="home"&&o!=="shop"?o:o==="shop"?"SHOP_PRODUCT_CODE":"HOME_PRODUCT_CODE"})(),service_codes:"email_notification,sms_notification"};return e.service_point&&e.service_point.id&&(a.parties=[{type:"service_point",service_point_id:e.service_point.id}]),e.customs&&e.customs.length&&(a.customs=e.customs),a}const mt="1721",ht="DK",st="idle",Ye="loading",Je="error",Ze="ready",Xe="points",et="selected";function Ne(){return{status:st,rates:[],selectedRateId:null,servicePoints:[],selectedPointId:null,error:null}}function Ve(t){const e=Number(t);return Number.isFinite(e)?e.toLocaleString("da-DK",{minimumFractionDigits:2,maximumFractionDigits:2})+" kr.":"—"}function tt(t={}){const e=[],s=t.receiver||{};String(s.zipcode||"").trim()||e.push({field:"receiver.zipcode",message:"Falta código postal"});const a=String(s.country_code||"").trim();/^[A-Z]{2}$/.test(a)||e.push({field:"receiver.country_code",message:"Falta país válido (ISO alpha-2)"});const o=t.parcel?t.parcel.weight:void 0;return(!Number.isInteger(o)||o<=0)&&e.push({field:"parcel.weight",message:"Falta peso válido"}),e}function gt(t=[]){return t.slice().sort((e,s)=>Number(e.price)-Number(s.price))}function je(t={}){const e=(t.rates||[]).find(o=>o.id===t.selectedRateId)||null;if(!e)return{ready:!1,rate:null,needsPoint:!1,label:"Elegí una tarifa para continuar"};const s=e.serviceType==="shop";return{ready:!s||!!t.selectedPointId,rate:e,needsPoint:s,label:`Comprar Etiqueta — ${Ve(e.price)}`}}function F(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const ft=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1",j=ft?"http://localhost:3001":"https://el-cuartito-shop.up.railway.app",bt="K85403890688957",le={async createSale(t){let e=[];if(await T.runTransaction(async s=>{const a=[];for(const n of t.items){const c=T.collection("products").doc(n.recordId||n.productId),l=await s.get(c);if(!l.exists)throw new Error(`Producto ${n.recordId} no encontrado`);const d=l.data();if(d.stock<n.quantity)throw new Error(`Stock insuficiente para ${d.artist||"Sin Artista"} - ${d.album||"Sin Album"}. Disponible: ${d.stock}`);a.push({ref:c,data:d,quantity:n.quantity,price:d.price,cost:d.cost||0,providerOrigin:d.provider_origin||"Local_Used",productCondition:n.productCondition||n.condition||d.product_condition||d.condition||"Used"})}const o=a.reduce((n,c)=>n+c.price*c.quantity,0),i=t.customTotal!==void 0?t.customTotal:o,r=T.collection("sales").doc();s.set(r,{...t,status:"completed",fulfillment_status:t.channel&&t.channel.toLowerCase()==="discogs"?"preparing":"fulfilled",total:i,date:new Date().toISOString().split("T")[0],timestamp:firebase.firestore.FieldValue.serverTimestamp(),items:a.map(n=>({productId:n.ref.id,artist:n.data.artist,album:n.data.album,sku:n.data.sku,unitPrice:n.price,costAtSale:n.cost,qty:n.quantity,providerOrigin:n.providerOrigin||"Local_Used",productCondition:n.productCondition||"Used"}))});for(const n of a){s.update(n.ref,{stock:firebase.firestore.FieldValue.increment(-n.quantity)});const c=T.collection("inventory_logs").doc();s.set(c,{type:"SOLD",sku:n.data.sku||"Unknown",album:n.data.album||"Unknown",artist:n.data.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:`Venta registrada (Admin) - Canal: ${t.channel||"Tienda"}`})}e=a.map(n=>({discogs_listing_id:n.data.discogs_listing_id,artist:n.data.artist,album:n.data.album}))}),t.channel&&t.channel.toLowerCase()==="discogs"){for(const s of e)if(s.discogs_listing_id)try{const a=await fetch(`${j}/discogs/delete-listing/${s.discogs_listing_id}`,{method:"DELETE"});a.ok?console.log(`✅ Discogs listing ${s.discogs_listing_id} deleted for ${s.artist} - ${s.album}`):console.warn(`⚠️ Could not delete Discogs listing ${s.discogs_listing_id}:`,await a.text())}catch(a){console.error(`❌ Error deleting Discogs listing ${s.discogs_listing_id}:`,a)}}},async notifyPreparing(t){const e=await te.currentUser.getIdToken(),s=await fetch(`${j}/sales/${t}/notify-preparing`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async cancelOrder(t){const e=await te.currentUser.getIdToken(),s=await fetch(`${j}/sales/${t}/cancel-order`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async updateTracking(t,e){const s=await te.currentUser.getIdToken(),a=await fetch(`${j}/sales/${t}/update-tracking`,{method:"POST",headers:{Authorization:`Bearer ${s}`,"Content-Type":"application/json"},body:JSON.stringify({trackingNumber:e})});if(!a.ok)throw new Error(await a.text());return a.json()},async notifyShipped(t,e,s=null){const a=await te.currentUser.getIdToken(),o={trackingNumber:e};s&&(o.trackingLink=s);const i=await fetch(`${j}/sales/${t}/notify-shipped`,{method:"POST",headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json"},body:JSON.stringify(o)});if(!i.ok)throw new Error(await i.text());return i.json()},async markDispatched(t){const e=await te.currentUser.getIdToken(),s=await fetch(`${j}/sales/${t}/mark-dispatched`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async notifyPickupReady(t){const e=await te.currentUser.getIdToken(),s=await fetch(`${j}/sales/${t}/notify-pickup-ready`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async markPickedUp(t){const e=await te.currentUser.getIdToken(),s=await fetch(`${j}/sales/${t}/mark-picked-up`,{method:"POST",headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error(await s.text());return s.json()},async setLabelCreated(t,{trackingNumber:e,carrier:s="",labelUrl:a=""}){const o=await te.currentUser.getIdToken(),i=await fetch(`${j}/sales/${t}/label-created`,{method:"POST",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"},body:JSON.stringify({trackingNumber:e,carrier:s,labelUrl:a})});if(!i.ok)throw new Error(await i.text());return i.json()},async notifyCustomer(t,e){const s=await te.currentUser.getIdToken(),a=await fetch(`${j}/sales/${t}/notify`,{method:"POST",headers:{Authorization:`Bearer ${s}`,"Content-Type":"application/json"},body:JSON.stringify({type:e})});if(!a.ok)throw new Error(await a.text());return a.json()},async deleteSale(t){const e=await te.currentUser.getIdToken(),s=await fetch(`${j}/sales/${t}`,{method:"DELETE",headers:{Authorization:`Bearer ${e}`}});if(!s.ok){const a=new Error(await s.text());throw a.status=s.status,a}return s.json()},async buyShipmondoLabel({orderId:t,productCode:e,servicePointId:s,shipment:a,testMode:o=!0}){const i=await fetch(`${j}/api/shipmondo/shipments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t,productCode:e,servicePointId:s,shipment:a,testMode:o})}),r=await i.json().catch(()=>({}));if(!i.ok)throw new Error(r.error||`HTTP ${i.status}`);return r}},Se={async runSkuFix_v3(){if(!localStorage.getItem("sku_fix_run_v3")){localStorage.setItem("sku_fix_run_v3","true"),console.log("🔍 Buscando el SKU histórico más alto absoluto...");try{const t=await T.collection("products").get();let e=0;const s=/^SKU-(\d+)$/;t.docs.forEach(n=>{const c=n.data().sku;if(c){const l=c.match(s);l&&(e=Math.max(e,parseInt(l[1])))}});const a=await T.collection("sales").get();a.docs.forEach(n=>{(n.data().items||[]).forEach(l=>{const d=l.sku;if(d){const h=d.match(s);h&&(e=Math.max(e,parseInt(h[1])))}})}),console.log("✅ El SKU histórico más alto encontrado es:",e);const o=new Set;a.docs.forEach(n=>{(n.data().items||[]).forEach(c=>{c.sku&&o.add(c.sku)})});const i=[],r=t.docs.map(n=>({id:n.id,ref:n.ref,data:n.data()})).sort((n,c)=>{var l,d;return(((l=n.data.created_at)==null?void 0:l.seconds)||0)-(((d=c.data.created_at)==null?void 0:d.seconds)||0)});for(const n of r){const c=n.data.sku;c&&(o.has(c)?i.push(n):o.add(c))}if(i.length>0){console.log(`⚠️ Encontrados ${i.length} productos con SKU en conflicto. Arreglando...`);let n=e,c="";await T.runTransaction(async l=>{const d=T.collection("metadata").doc("vinylCounter");for(const h of i){n++;const u=`SKU-${String(n).padStart(3,"0")}`,p=String(n).padStart(4,"0");l.update(h.ref,{sku:u,quickId:p}),c+=`- ${h.data.album} (era ${h.data.sku}) -> ahora es ${u}
`}l.set(d,{current:n},{merge:!0})}),alert(`🛠️ Arreglo histórico completado!
Se reasignaron los SKUs que chocaban con discos viejos vendidos:

`+c+`
Por favor, recarga la página.`)}else{const n=T.collection("metadata").doc("vinylCounter"),c=await n.get(),l=c.exists&&c.data().current||0;e>l&&(await n.set({current:e},{merge:!0}),console.log(`🆙 Contador actualizado a ${e}`)),console.log("✅ No hay conflictos de SKU.")}}catch(t){console.error("❌ Error en script histórico:",t)}}},state:{inventory:[],sales:[],expenses:[],consignors:[],cart:[],viewMode:"list",selectedItems:new Set,currentView:"dashboard",filterMonths:[new Date().getMonth()],filterYear:new Date().getFullYear(),inventorySearch:"",salesHistorySearch:"",expensesSearch:"",expenseFilterYear:new Date().getFullYear(),expenseFilterMonths:[new Date().getMonth()],expenseCategoryFilter:"all",expenseWizard:null,incomeFilterYear:new Date().getFullYear(),incomeFilterMonths:[new Date().getMonth()],incomeSearch:"",incomeCategoryFilter:"all",incomeUninvoicedOnly:!1,showIncomeForm:!1,invoicePrefill:null,events:[],selectedDate:new Date,vatActive:!1,manualSaleSearch:"",posCondition:"Used",posSelectedItemSku:null,orderFeedFilter:"all",filterGenre:"all",filterOwner:"all",filterLabel:"all",filterLot:"all",filterStorage:"all",filterDiscogs:"all",filterStock:"all",filterCondition:"all",filterStockTime:[],showStats:!1,showAdvancedFilters:!1,privacyMode:!1,rsdExtraDiscount:!1,dashboardAnalysisMode:"genre"},getEffectivePrice(t){return t.is_rsd_discount?Math.round(t.price*.9):t.price},async init(){this.runSkuFix_v3(),!this._initialized&&(this._initialized=!0,te.onAuthStateChanged(async t=>{if(t)try{document.getElementById("login-view").classList.add("hidden"),document.getElementById("main-app").classList.remove("hidden"),document.getElementById("mobile-nav").classList.remove("hidden"),await this.loadData(),this._pollInterval&&clearInterval(this._pollInterval),this._pollInterval=setInterval(()=>this.loadData(),6e4),this.setupListeners(),this.setupMobileMenu(),this.setupNavigation()}catch(e){console.error("Auth token error:",e),this.logout()}else{document.getElementById("login-view").classList.remove("hidden"),document.getElementById("main-app").classList.add("hidden"),document.getElementById("mobile-nav").classList.add("hidden");const e=document.getElementById("login-btn");e&&(e.disabled=!1,e.innerHTML="<span>Entrar</span>")}}),document.addEventListener("click",t=>{const e=document.getElementById("discogs-results"),s=document.getElementById("discogs-search-input");e&&!e.contains(t.target)&&t.target!==s&&e.classList.add("hidden");const a=document.getElementById("sku-results"),o=document.getElementById("sku-search");a&&!a.contains(t.target)&&t.target!==o&&a.classList.add("hidden")}))},async handleLogin(t){t.preventDefault();const e=t.target.email.value,s=t.target.password.value,a=document.getElementById("login-error"),o=document.getElementById("login-btn");a.classList.add("hidden"),o.disabled=!0,o.innerHTML="<span>Cargando...</span>";try{await te.signInWithEmailAndPassword(e,s)}catch(i){console.error("Login error:",i),a.innerText="Error: "+i.message,a.classList.remove("hidden"),o.disabled=!1,o.innerHTML='<span>Ingresar</span><i class="ph-bold ph-arrow-right"></i>'}},async updateFulfillmentStatus(t,e,s){var a,o,i;try{const r=((a=t==null?void 0:t.target)==null?void 0:a.closest("button"))||((i=(o=window.event)==null?void 0:o.target)==null?void 0:i.closest("button"));let n="";if(r&&(r.disabled=!0,n=r.innerHTML,r.innerHTML='<i class="ph ph-circle-notch animate-spin"></i>'),["shipped","delivered","picked_up"].includes((s||"").toLowerCase())){const l=await this.decrementLinkedStock(e);if(!l.ok){r&&(r.disabled=!1,r.innerHTML=n),this.showToast("⚠️ "+l.message,"error");return}}await T.collection("sales").doc(e).update({fulfillment_status:s}),await this.loadData();const c=document.getElementById("unified-modal");c&&(c.remove(),this.openUnifiedOrderDetailModal(e)),this.showToast("Estado de envío actualizado")}catch(r){console.error("Fulfillment update error:",r),this.showToast("Error al actualizar estado: "+r.message,"error")}},async manualShipOrder(t){var e,s,a,o,i,r;try{const n=prompt("Introduce el número de seguimiento:");if(!n)return;const c=((e=event==null?void 0:event.target)==null?void 0:e.closest("button"))||((a=(s=window.event)==null?void 0:s.target)==null?void 0:a.closest("button"));c&&(c.disabled=!0,c.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Guardando...');const l=await fetch(`${j}/api/manual-ship`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t,trackingNumber:n})}),d=await l.json();if(l.ok&&d.success){if(this.showToast("✅ Pedido marcado como enviado"),d.emailSent)this.showToast("📧 Cliente notificado por email","success");else{const u=typeof d.emailError=="object"?JSON.stringify(d.emailError):d.emailError;this.showToast("⚠️ Pedido marcado pero EL EMAIL FALLÓ: "+u,"warning")}await this.loadData();const h=document.getElementById("sale-detail-modal");h&&(h.remove(),this.openUnifiedOrderDetailModal(t))}else throw new Error(d.error||d.message||"Error desconocido")}catch(n){console.error("Error shipping manually:",n),this.showToast("❌ Error: "+(n.message||"No se pudo procesar el envío"),"error");const c=((o=event==null?void 0:event.target)==null?void 0:o.closest("button"))||((r=(i=window.event)==null?void 0:i.target)==null?void 0:r.closest("button"));c&&(c.disabled=!1,c.innerHTML='<i class="ph-bold ph-truck"></i> Ingresar Tracking y Cerrar')}},async logout(){try{await te.signOut(),location.reload()}catch(t){console.error("Sign out error:",t),location.reload()}},setupListeners(){this._unsubscribeProducts&&this._unsubscribeProducts(),this._unsubscribeProducts=T.collection("products").onSnapshot(t=>{this.state.inventory=t.docs.map(e=>{const s=e.data();return{id:e.id,...s,condition:s.condition||"VG",owner:s.owner||"El Cuartito",label:s.label||"Desconocido",storageLocation:s.storageLocation||"Tienda",cover_image:s.cover_image||s.coverImage||null}}),(this.state.currentTab==="inventory"||this.state.currentTab==="dashboard")&&this.renderCurrentTab()},t=>{console.error("Inventory listener error:",t)})},async loadData(){try{const[t,e,s,a,o,i]=await Promise.all([T.collection("products").get(),T.collection("sales").get(),T.collection("expenses").get(),T.collection("events").orderBy("date","desc").get(),T.collection("consignors").get(),T.collection("extra_income").get()]);this.state.inventory=t.docs.map(r=>{const n=r.data();return{id:r.id,...n,condition:n.condition||"VG",owner:n.owner||"El Cuartito",label:n.label||"Desconocido",storageLocation:n.storageLocation||"Tienda",cover_image:n.cover_image||n.coverImage||null}}),this.state.sales=e.docs.map(r=>{var l,d;const n=r.data(),c={id:r.id,...n,date:n.date||((l=n.timestamp)!=null&&l.toDate?n.timestamp.toDate().toISOString().split("T")[0]:(d=n.created_at)!=null&&d.toDate?n.created_at.toDate().toISOString().split("T")[0]:new Date().toISOString().split("T")[0])};return n.total_amount!==void 0&&n.total===void 0&&(c.total=n.total_amount),n.payment_method&&!n.paymentMethod&&(c.paymentMethod=n.payment_method),c.items&&Array.isArray(c.items)&&(c.items=c.items.map(h=>({...h,priceAtSale:h.priceAtSale!==void 0?h.priceAtSale:h.unitPrice||0,qty:h.qty!==void 0?h.qty:h.quantity||1,costAtSale:h.costAtSale!==void 0?h.costAtSale:h.cost||0}))),c}).filter(r=>r.status!=="PENDING"&&r.status!=="failed").sort((r,n)=>{const c=new Date(r.date);return new Date(n.date)-c}),this.state.expenses=s.docs.map(r=>{var c;const n=r.data();return{id:r.id,...n,date:n.fecha_factura||n.date||((c=n.timestamp)==null?void 0:c.split("T")[0])||new Date().toISOString().split("T")[0]}}).sort((r,n)=>new Date(n.date)-new Date(r.date)),this.state.events=a.docs.map(r=>({id:r.id,...r.data()})),this.state.consignors=o.docs.map(r=>{const n=r.data();return{id:r.id,...n,agreementSplit:n.split||n.agreementSplit||(n.percentage?Math.round(n.percentage*100):70)}}),await this.loadInvestments(),this.state.extraIncome=i.docs.map(r=>({id:r.id,...r.data()})).sort((r,n)=>new Date(n.date)-new Date(r.date)),this.initFuse(),this.refreshCurrentView()}catch(t){console.error("Failed to load data:",t),this.showToast("❌ Error de conexión: "+t.message,"error")}},refreshCurrentView(){const t=document.getElementById("app-content");if(t)switch(this.state.currentView){case"dashboard":this.renderDashboard(t);break;case"inventory":this.renderInventory(t);break;case"sales":this.renderSales(t);break;case"pos":this.renderPOS(t);break;case"expenses":this.renderExpenses(t);break;case"consignments":this.renderConsignments(t);break;case"backup":this.renderBackup(t);break;case"settings":this.renderSettings(t);break;case"calendar":this.renderCalendar(t);break;case"shipping":this.renderShipping(t);break;case"pickups":this.renderPickups(t);break;case"investments":this.renderInvestments(t);break;case"vatReport":this.renderVATReport(t);break;case"datosLegales":this.renderDatosLegales(t);break;case"contabilidad":this.renderContabilidad(t);break;case"facturasManual":this.renderFacturasManual(t);break;case"extraIncome":this.renderExtraIncome(t);break;case"newsletter":this.renderNewsletter(t);break;case"webshop":this.renderWebshop(t);break}},async renderNewsletter(t){this.state.newsletterSelectedIds||(this.state.newsletterSelectedIds=[]);let e=0,s=[];try{const l=await T.collection("subscribers").where("active","==",!0).get();e=l.size,s=l.docs.map(d=>({id:d.id,...d.data()}))}catch(l){console.warn("Could not fetch subscribers count:",l)}this.state.subscribersList=s;let a=this.state.inventory&&this.state.inventory.length>0?[...this.state.inventory]:[...this.state.products||[]];if(a.length===0)try{a=(await T.collection("products").get()).docs.map(d=>({id:d.id,...d.data()})),this.state.inventory=a}catch(l){console.warn("Could not fetch products for newsletter:",l)}const o=l=>{if(l.created_at){const d=new Date(l.created_at).getTime();if(!isNaN(d))return d}if(l.createdAt){const d=new Date(l.createdAt).getTime();if(!isNaN(d))return d}if(l.timestamp){if(typeof l.timestamp.seconds=="number")return l.timestamp.seconds*1e3;const d=new Date(l.timestamp).getTime();if(!isNaN(d))return d}if(l.quickId){const d=parseInt(l.quickId,10);if(!isNaN(d))return d}if(l.sku&&l.sku.startsWith("SKU-")){const d=parseInt(l.sku.replace("SKU-",""),10);if(!isNaN(d))return d}return 0};a.sort((l,d)=>o(d)-o(l));const i=a.filter(l=>this.state.newsletterSelectedIds.includes(l.id)),r=this.state.newsletterSubject??"New This Week — El Cuartito Records",n=this.state.newsletterIntro??"Fresh drops just landed at El Cuartito Records. Here's what's new this week.",c=`
            <div class="cx-view">
            <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Drops & Newsletter",subtitle:"Elegí los discos nuevos y mandá el drop semanal a tus suscriptores",filters:`
                    <button onclick="app.showSubscribersModal()" class="cx-btn">
                        <i class="ph ph-users"></i> ${e} suscriptores activos <span class="text-stone-500 font-medium hidden sm:inline">· ver lista</span>
                    </button>`})}

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    <!-- Izquierda: mensaje + selección + envío -->
                    <div class="lg:col-span-7 space-y-4">
                        <section class="vf-card">
                            <h3 class="vf-h">El mail</h3>
                            <label class="vf-field"><span>Asunto</span>
                                <input type="text" id="newsletter-subject" value="${r.replace(/"/g,"&quot;")}"
                                    oninput="app.state.newsletterSubject = this.value"
                                    placeholder="Ej: Fresh Drops This Week" class="vf-input"></label>
                            <label class="vf-field mt-3"><span>Introducción</span>
                                <textarea id="newsletter-intro" rows="3" oninput="app.state.newsletterIntro = this.value"
                                    placeholder="Un par de líneas antes de los discos" class="vf-input !h-auto py-2.5 resize-none">${n}</textarea></label>
                        </section>

                        <section class="vf-card !p-2">
                            <div class="flex items-center justify-between px-3 pt-2 pb-1">
                                <h3 class="vf-h !mb-0">Discos del drop <span class="cx-count">${i.length}</span></h3>
                                ${i.length>0?`
                                    <button onclick="app.state.newsletterSelectedIds=[]; app.renderNewsletter(document.getElementById('app-content'));" class="text-xs font-semibold text-stone-500 hover:text-red-700">Quitar todos</button>
                                `:""}
                            </div>
                            ${i.length===0?`
                                <div class="m-2 rounded-2xl border border-dashed border-black/15 p-8 text-center">
                                    <i class="ph ph-vinyl-record text-3xl text-stone-400 block mb-2"></i>
                                    <p class="text-sm text-stone-600">Todavía no elegiste discos. Sumalos desde la lista de la derecha.</p>
                                </div>
                            `:`
                                <div class="max-h-80 overflow-y-auto custom-scrollbar">
                                    ${i.map(l=>`
                                        <div class="cx-feed-row !cursor-default">
                                            <span class="cx-cover"><img src="${l.cover_image||l.image||"logo.jpg"}" class="w-full h-full object-cover" alt=""></span>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-semibold truncate">${l.title||l.album||"Sin título"}</p>
                                                <p class="text-xs text-stone-500 truncate">${l.artist||"Desconocido"}</p>
                                            </div>
                                            <span class="text-sm font-semibold">${this.formatCurrency(Number(l.price)||0,!1)}</span>
                                            <button onclick="app.toggleNewsletterProduct('${l.id}')" class="cx-row-btn is-danger" aria-label="Quitar del drop"><i class="ph ph-x"></i></button>
                                        </div>
                                    `).join("")}
                                </div>
                            `}
                        </section>

                        <button onclick="app.sendNewsletterDrop()" id="send-drop-btn"
                            ${i.length===0||e===0?"disabled":""}
                            class="cx-pos-cta disabled:opacity-50 disabled:cursor-not-allowed">
                            <i class="ph-bold ph-paper-plane-tilt"></i>
                            <span>Enviar el drop a ${e} suscriptores</span>
                        </button>
                    </div>

                    <!-- Derecha: elegir discos -->
                    <section class="cx-panel lg:col-span-5 !p-4">
                        <h3 class="vf-h px-1">Elegir discos <span class="text-stone-500 font-medium text-sm">(${a.length}, los más nuevos primero)</span></h3>
                        <div class="cx-search mb-3">
                            <i class="ph ph-magnifying-glass"></i>
                            <input type="text" id="newsletter-product-search" oninput="app.filterNewsletterProducts(this.value)"
                                value="${(this.state.newsletterQuery||"").replace(/"/g,"&quot;")}" placeholder="Título, artista o sello">
                        </div>
                        <div id="newsletter-product-list" class="space-y-1 max-h-[560px] overflow-y-auto custom-scrollbar">
                            ${this.renderNewsletterProductList(a,this.state.newsletterQuery||"")}
                        </div>
                    </section>
                </div>
            </div>
            </div>
        `;t.innerHTML=c},renderNewsletterProductList(t,e){let s=t;if(e&&e.trim()){const o=e.toLowerCase().trim();s=t.filter(i=>i.title&&i.title.toLowerCase().includes(o)||i.album&&i.album.toLowerCase().includes(o)||i.artist&&i.artist.toLowerCase().includes(o)||i.label&&i.label.toLowerCase().includes(o))}const a=this.state.newsletterSelectedIds||[];return s.slice(0,50).map(o=>{const i=a.includes(o.id);return`
                <button type="button" onclick="app.toggleNewsletterProduct('${o.id}')" class="gs-row ${i?"is-picked":""}">
                    <span class="gs-thumb"><img src="${o.cover_image||o.image||"logo.jpg"}" alt=""></span>
                    <span class="gs-main"><b>${o.title||o.album||"Sin título"}</b><small>${o.artist||"Desconocido"} · ${this.formatCurrency(Number(o.price)||0,!1)}</small></span>
                    <span class="cx-stock ${Number(o.stock)>0?"":"is-out"}">${Number(o.stock)>0?"Stock "+o.stock:"Agotado"}</span>
                    <span class="cx-pick" aria-hidden="true"><i class="ph-bold ${i?"ph-check":"ph-plus"}"></i></span>
                </button>
            `}).join("")},filterNewsletterProducts(t){this.state.newsletterQuery=t;const e=document.getElementById("newsletter-product-list"),s=this.state.inventory&&this.state.inventory.length>0?this.state.inventory:this.state.products||[];e&&(e.innerHTML=this.renderNewsletterProductList(s,t))},async showSubscribersModal(){let t=this.state.subscribersList||[];try{t=(await T.collection("subscribers").get()).docs.map(o=>({id:o.id,...o.data()}))}catch(a){console.error("Error fetching subscribers list:",a)}const e=document.createElement("div");e.id="subscribers-modal",e.className="vf-overlay cx-dialog-wrap !z-[100]",e.onclick=a=>{a.target===e&&e.remove()};const s=`
            <div class="cx-dialog cx-view !max-w-xl flex flex-col !max-h-[85vh]" role="dialog" aria-modal="true" aria-labelledby="subs-title">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h2 id="subs-title" class="cx-dialog-title">Suscriptores</h2>
                        <p class="cx-sub !mt-1">${t.length} mails registrados, ${t.filter(a=>a.active!==!1).length} activos</p>
                    </div>
                    <button onclick="document.getElementById('subscribers-modal').remove()" class="cx-btn is-icon" aria-label="Cerrar"><i class="ph ph-x"></i></button>
                </div>
                <div class="overflow-y-auto flex-1 custom-scrollbar rounded-2xl bg-white/50 p-1">
                    ${t.length===0?`
                        <p class="p-8 text-center text-sm text-stone-500">Todavía no hay suscriptores.</p>
                    `:t.map(a=>`
                        <div class="flex items-center justify-between gap-4 px-3 py-2.5 border-b border-black/5 last:border-0">
                            <div class="flex items-center gap-3 min-w-0">
                                <span class="cx-sq !w-9 !h-9 !text-sm !rounded-xl uppercase font-bold">${(a.email||"U")[0]}</span>
                                <div class="min-w-0">
                                    <div class="text-sm font-semibold truncate">${a.email}</div>
                                    <div class="text-xs text-stone-500">Desde ${a.subscribedAt?new Date(a.subscribedAt).toLocaleDateString("es-ES"):"hace poco"}</div>
                                </div>
                            </div>
                            <span class="cx-state ${a.active!==!1?"is-ok":"is-done"}">${a.active!==!1?"Activo":"Inactivo"}</span>
                        </div>
                    `).join("")}
                </div>
                <div class="pt-4 flex justify-end">
                    <button onclick="document.getElementById('subscribers-modal').remove()" class="cx-btn is-primary">Cerrar</button>
                </div>
            </div>
        `;e.innerHTML=s,document.body.appendChild(e)},toggleNewsletterProduct(t){this.state.newsletterSelectedIds||(this.state.newsletterSelectedIds=[]);const e=this.state.newsletterSelectedIds.indexOf(t);e>-1?this.state.newsletterSelectedIds.splice(e,1):this.state.newsletterSelectedIds.push(t),this.renderNewsletter(document.getElementById("app-content"))},async sendNewsletterDrop(){var r,n;const t=this.state.newsletterSelectedIds||[];if(t.length===0){alert("Debes seleccionar al menos un disco");return}const e=((r=document.getElementById("newsletter-subject"))==null?void 0:r.value)||"New This Week — El Cuartito Records",s=((n=document.getElementById("newsletter-intro"))==null?void 0:n.value)||"Fresh drops just landed at El Cuartito Records.";if(!confirm("¿Estás seguro de enviar este Weekly Drop a todos los suscriptores?"))return;const a=document.getElementById("send-drop-btn");a&&(a.disabled=!0,a.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> Enviando newsletter...');const i=window.location.hostname==="localhost"?"http://localhost:3001":"https://el-cuartito-shop.up.railway.app";try{const l=await(await fetch(`${i}/api/newsletter/send-drop`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productIds:t,subject:e,intro:s})})).json();if(l.success)this.showToast(`🚀 Drop enviado exitosamente a ${l.sentCount} suscriptores`,"success"),this.state.newsletterSelectedIds=[],this.renderNewsletter(document.getElementById("app-content"));else throw new Error(l.error||"Error enviando newsletter")}catch(c){console.error("Error sending drop:",c),alert("Error al enviar el newsletter: "+c.message)}finally{a&&(a.disabled=!1)}},renderDatosLegales(t){const e=(o,i)=>`
            <div class="flex justify-between gap-4 py-2.5 border-b border-black/5 last:border-0">
                <span class="text-sm text-stone-500">${o}</span>
                <span class="text-sm font-semibold text-right">${i}</span>
            </div>`,s=(o,i,r,n)=>`
            <a href="${o}" target="_blank" rel="noopener" class="cx-feed-row !px-3 bg-white/50">
                <span class="cx-sq !w-10 !h-10 !text-lg !bg-white"><i class="ph ${i}"></i></span>
                <span class="flex-1 min-w-0"><span class="block text-xs text-stone-500">${r}</span><span class="block text-sm font-semibold truncate">${n}</span></span>
                <i class="ph ph-arrow-up-right text-stone-500"></i>
            </a>`,a=`
            <div class="cx-view">
            <div class="max-w-4xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Datos Legales",subtitle:"Datos de la empresa y canales de contacto"})}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <section class="vf-card">
                        <h3 class="vf-h">Empresa</h3>
                        <p class="cx-dialog-title mb-3">El Cuartito Records I/S</p>
                        ${e("CVR","45943216")}
                        ${e("VAT","DK45943216")}
                        ${e("Dirección","Dybbølsgade 14 st tv<br>1721 København V<br>Denmark")}
                    </section>

                    <section class="vf-card space-y-2">
                        <h3 class="vf-h">Contacto y canales</h3>
                        ${s("mailto:el.cuartito.cph@gmail.com","ph-envelope","Email","el.cuartito.cph@gmail.com")}
                        ${s("https://elcuartito.dk","ph-browser","Web","elcuartito.dk")}
                        ${s("https://instagram.com/el.cuartito.records","ph-instagram-logo","Instagram","@el.cuartito.records")}
                        ${s("https://www.discogs.com/es/user/elcuartitorecords.dk","ph-vinyl-record","Discogs","elcuartitorecords.dk")}
                        <a href="https://app.shipmondo.com/" target="_blank" rel="noopener" class="cx-tile cx-dark !min-h-0 !flex-row !items-center !justify-between mt-3">
                            <span class="flex items-center gap-3"><i class="ph ph-package text-xl text-[#F2E14C]"></i><span class="font-semibold text-sm">Abrir Shipmondo</span></span>
                            <i class="ph ph-arrow-up-right"></i>
                        </a>
                    </section>
                </div>
            </div>
            </div>
        `;t.innerHTML=a},renderContabilidad(t){const e=new Date().getFullYear(),s=Math.floor(new Date().getMonth()/3)+1;this.state.contabilidadYear||(this.state.contabilidadYear=e),this.state.contabilidadQuarter||(this.state.contabilidadQuarter=s),this.state.contabilidadInvoices||(this.state.contabilidadInvoices=[]),this.state.contabilidadLoading||(this.state.contabilidadLoading=!1);const a=this.state.contabilidadYear,o=this.state.contabilidadQuarter,i=this.state.contabilidadInvoices,r=this.state.contabilidadLoading,n=d=>`<span class="cx-channel is-${d}">${{local:"Tienda",online:"Web shop",discogs:"Discogs"}[d]||d||"—"}</span>`,c=["Ene a Mar","Abr a Jun","Jul a Sep","Oct a Dic"],l=`
            <div class="cx-view">
            <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Contabilidad",subtitle:"Facturas de venta por trimestre, con la leyenda de Brugtmoms",filters:`
                        <button onclick="app.loadInvoices()" class="cx-btn is-icon" title="Actualizar" aria-label="Actualizar"><i class="ph ph-arrows-clockwise"></i></button>
                        <button onclick="app.backfillInvoices()" class="cx-btn" title="Crear las facturas de ventas viejas que no tienen"><i class="ph ph-database"></i><span class="hidden sm:inline">Generar facturas anteriores</span></button>`,primary:{label:`Descargar Q${o}`,icon:"ph-download-simple",onclick:"app.downloadQuarterInvoices()"}})}

                <div class="flex flex-wrap items-center gap-2 mb-5">
                    <select id="contab-year" onchange="app.state.contabilidadYear = parseInt(this.value); app.loadInvoices()" class="cx-frost-pill !pr-10 appearance-none cursor-pointer" aria-label="Año"
                        style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2377736C' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E&quot;), linear-gradient(180deg, rgba(255,255,255,.62), rgba(255,255,255,.34)); background-repeat: no-repeat; background-position: right 16px center, 0 0;">
                        ${[e,e-1,e-2].map(d=>`<option value="${d}" ${d===a?"selected":""}>${d}</option>`).join("")}
                    </select>
                    <div class="cx-glass flex p-1 rounded-full" role="group" aria-label="Trimestre">
                        ${[1,2,3,4].map(d=>`
                            <button onclick="app.state.contabilidadQuarter = ${d}; app.loadInvoices()" class="cx-month ${d===o?"is-on":""}" title="${c[d-1]}">Q${d} <span class="hidden md:inline font-medium opacity-70">${c[d-1]}</span></button>
                        `).join("")}
                    </div>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <div class="cx-tile cx-yellow">
                        <span class="cx-tile-label">Facturas</span>
                        <b class="cx-tile-value">${i.length}</b>
                        <span class="cx-tile-stripes" aria-hidden="true"></span>
                    </div>
                    <div class="cx-tile cx-orange">
                        <span class="cx-tile-label">Ventas facturadas</span>
                        <b class="cx-tile-value">${this.formatCurrency(i.reduce((d,h)=>d+(h.totalAmount||0),0))}</b>
                    </div>
                    <div class="cx-tile cx-frost">
                        <span class="cx-tile-label">De la tienda</span>
                        <b class="cx-tile-value">${i.filter(d=>d.channel==="local").length}</b>
                    </div>
                    <div class="cx-tile cx-dark">
                        <span class="cx-tile-label">Web shop y Discogs</span>
                        <b class="cx-tile-value">${i.filter(d=>d.channel!=="local").length}</b>
                    </div>
                </div>

                <section class="cx-panel !p-0 overflow-hidden">
                    ${r?`
                        <div class="flex items-center justify-center py-20">
                            <div class="text-center">
                                <div class="animate-spin w-9 h-9 border-[3px] border-[#1A1A1A] border-t-transparent rounded-full mx-auto mb-3"></div>
                                <p class="text-sm text-stone-600">Cargando facturas…</p>
                            </div>
                        </div>
                    `:i.length===0?`
                        <div class="py-16 text-center">
                            <i class="ph ph-receipt text-4xl text-stone-400 block mb-2"></i>
                            <p class="text-sm text-stone-600">No hay facturas en Q${o} ${a}. Se crean solas con cada venta.</p>
                        </div>
                    `:`
                        <div class="overflow-x-auto">
                            <table class="cx-inv-table w-full text-left">
                                <thead>
                                    <tr><th>Número</th><th>Fecha</th><th>Canal</th><th>Cliente</th><th>Discos</th><th class="text-right">Total</th><th class="text-center">PDF</th></tr>
                                </thead>
                                <tbody>
                                    ${i.map(d=>`
                                        <tr class="inv-row">
                                            <td class="text-sm font-mono font-semibold">${d.invoiceNumber||"-"}</td>
                                            <td class="text-xs text-stone-500 whitespace-nowrap">${d.date?this.formatDate(d.date):"-"}</td>
                                            <td>${n(d.channel)}</td>
                                            <td class="text-sm font-semibold max-w-[160px] truncate">${d.customerName||"Butikskunde"}</td>
                                            <td class="text-sm text-stone-600 max-w-[220px] truncate" title="${(d.itemsSummary||"").replace(/"/g,"&quot;")}">${d.itemsSummary||"-"}</td>
                                            <td class="text-sm font-semibold text-right whitespace-nowrap">${this.formatCurrency(d.totalAmount||0)}</td>
                                            <td class="text-center">
                                                <a href="${d.downloadUrl||"#"}" target="_blank" rel="noopener" class="cx-row-btn mx-auto hover:!bg-[#1A1A1A] hover:!text-white" title="Descargar PDF" aria-label="Descargar PDF de la factura ${d.invoiceNumber||""}">
                                                    <i class="ph ph-file-pdf"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    `}
                </section>

                <div class="mt-4 vf-card flex items-start gap-3">
                    <span class="cx-sq !w-10 !h-10 !text-lg shrink-0"><i class="ph ph-scales"></i></span>
                    <div>
                        <p class="font-semibold text-sm mb-1">Brugtmoms (régimen de margen)</p>
                        <p class="text-sm text-stone-600">Todas las facturas llevan la frase legal: <em>"Varen sælges efter de særlige regler for brugte varer - køber har ikke fradrag for momsen."</em></p>
                    </div>
                </div>
            </div>
            </div>
        `;t.innerHTML=l,this.state.contabilidadLoaded||this.loadInvoices()},async loadInvoices(){this.state.contabilidadLoading=!0,this.state.contabilidadLoaded=!0,this.refreshCurrentView();try{const t=this.state.contabilidadYear,e=this.state.contabilidadQuarter,s=await te.currentUser.getIdToken(),a=await fetch(`${j}/invoices?year=${t}&quarter=${e}`,{headers:{Authorization:`Bearer ${s}`}});if(!a.ok)throw new Error("Error cargando facturas");const o=await a.json();this.state.contabilidadInvoices=o.invoices||[]}catch(t){console.error("Error loading invoices:",t),alert("Error cargando facturas: "+t.message),this.showToast("Error cargando facturas","error"),this.state.contabilidadInvoices=[]}this.state.contabilidadLoading=!1,this.refreshCurrentView()},async downloadInvoicePdf(t){try{const e=await te.currentUser.getIdToken(),s=await fetch(`${j}/invoices/${t}/download`,{headers:{Authorization:`Bearer ${e}`}});if(!s.ok)throw new Error("Error descargando factura");const a=await s.json();a.downloadUrl&&window.open(a.downloadUrl,"_blank")}catch(e){console.error("Error downloading invoice:",e),alert("Error descargando factura: "+e.message),this.showToast("Error descargando factura","error")}},async downloadQuarterInvoices(){try{const t=this.state.contabilidadYear,e=this.state.contabilidadQuarter,s=await te.currentUser.getIdToken();this.showToast(`Preparando descarga Q${e} ${t}...`);const a=await fetch(`${j}/invoices/quarter-download?year=${t}&quarter=${e}`,{headers:{Authorization:`Bearer ${s}`}});if(!a.ok)throw new Error("Error descargando trimestre");const o=await a.json();if(!o.invoices||o.invoices.length===0){this.showToast("No hay facturas para este trimestre","error");return}const i=new JSZip,r=i.folder(`Contabilidad_ElCuartito_${t}_Q${e}`);for(const c of o.invoices)try{const l=await fetch(`${j}/invoices/${c.id}/file`,{headers:{Authorization:`Bearer ${s}`}});if(!l.ok)throw new Error(`Fetch failed for ${c.invoiceNumber}`);const d=await l.blob();r.file(c.fileName,d)}catch(l){console.error(`Error downloading ${c.fileName}:`,l)}const n=await i.generateAsync({type:"blob"});saveAs(n,`Contabilidad_ElCuartito_${t}_Q${e}.zip`),this.showToast(`✅ ${o.invoices.length} facturas descargadas`)}catch(t){console.error("Error downloading quarter:",t),alert("Error descargando trimestre: "+t.message),this.showToast("Error descargando trimestre","error")}},async backfillInvoices(){if(confirm(`¿Generar facturas PDF para todas las ventas anteriores que no tienen factura?

Esto se hará por lotes para evitar errores.`))try{this.showToast("🔄 Verificando conexión...");const t=await te.currentUser.getIdToken();try{if(!(await fetch(`${j}/api/health`)).ok)throw new Error("Servidor responde con error")}catch(n){console.error("Health check failed:",n)}this.showToast("🔄 Iniciando backfill (Modo Seguro)...");let e=0,s=0,a=0,o=1;const i=1;for(;o>0;){const n=await fetch(`${j}/invoices/backfill`,{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"},body:JSON.stringify({limit:i})});if(!n.ok){const l=await n.text();try{const d=JSON.parse(l);throw new Error(d.error||`Error ${n.status}: ${n.statusText}`)}catch{throw new Error(`Error ${n.status}: ${l.slice(0,100)}`)}}const c=await n.json();if(!c.success)throw new Error(c.error||"Unknown error from backend");e+=c.generated,s+=c.skipped,o=c.remaining,c.errors&&(a+=c.errors.length),this.showToast(`✅ Lote procesado: +${c.generated} facturas. Restantes: ${o}`),o>0&&await new Promise(l=>setTimeout(l,1e3))}const r=`✅ Backfill completado!
Generadas: ${e}
Errores: ${a}
Omitidas: ${s}`;alert(r),this.showToast("Backfill completado"),await this.loadInvoices()}catch(t){console.error("Error in backfill:",t),alert(`❌ Error en backfill:

${t.message}`),this.showToast("Error en backfill","error")}},renderFacturasManual(t){const e=(this.state.contabilidadInvoices||[]).filter(r=>r.channel==="manual"||r.isManual),s=this.state.invoicePrefill||null,a=r=>String(r??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),o=(r,n,c="",l="")=>`<label class="vf-field ${c}"><span>${r}</span>${n}${l?`<small class="block text-xs text-stone-500 mt-1">${l}</small>`:""}</label>`,i=`
            <div class="cx-view">
            <div class="max-w-4xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Generar Factura",subtitle:"Facturas a mano para eventos, servicios y otros ingresos"})}

                ${s?`
                <div class="rounded-2xl bg-[#F2E14C] p-4 mb-5 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="cx-sq !bg-white/70 !w-10 !h-10 !text-lg shrink-0"><i class="ph ph-file-plus"></i></span>
                        <div class="min-w-0">
                            <p class="text-sm font-semibold">Factura para un ingreso extra</p>
                            <p class="text-xs truncate">${a(s.description||"")}${s.amount!==""&&s.amount!=null?" · "+this.formatCurrency(Number(s.amount)||0):""}</p>
                        </div>
                    </div>
                    <button onclick="app.cancelInvoicePrefill()" class="cx-btn !h-9 !bg-white/70">Cancelar</button>
                </div>`:""}

                <form id="manual-invoice-form" onsubmit="app.submitManualInvoice(event)" class="space-y-4 mb-6">
                    <section class="vf-card">
                        <h3 class="vf-h">Cliente</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${o("Nombre",`<input type="text" name="customerName" required placeholder="Ej: København Festival A/S" value="${a(s==null?void 0:s.customerName)}" class="vf-input">`)}
                            ${o("CVR o VAT <em>(opcional)</em>",`<input type="text" name="customerVAT" placeholder="Ej: DK12345678" value="${a(s==null?void 0:s.customerVAT)}" class="vf-input">`)}
                            ${o("Dirección <em>(opcional)</em>",`<input type="text" name="customerAddress" placeholder="Ej: Vesterbrogade 100, 1620 København V" value="${a(s==null?void 0:s.customerAddress)}" class="vf-input">`,"md:col-span-2")}
                        </div>
                    </section>
                    <section class="vf-card">
                        <h3 class="vf-h">Qué se factura</h3>
                        ${o("Descripción",`<textarea name="description" required rows="3" placeholder="Ej: DJ set para evento privado, 4 horas con equipo de sonido" class="vf-input !h-auto py-2.5 resize-none">${a(s==null?void 0:s.description)}</textarea>`)}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            ${o("Total (kr)",`<input type="number" name="amount" required step="0.01" min="0" placeholder="5000" value="${(s==null?void 0:s.amount)??""}" class="vf-input is-strong !h-12 !text-lg">`)}
                            ${o("Heraf moms (kr) <em>(opcional)</em>",`<input type="number" name="vatAmount" step="0.01" min="0" placeholder="1000" value="${(s==null?void 0:s.vatAmount)??""}" class="vf-input !h-12">`,"","El IVA incluido en el total.")}
                            ${o("Fecha de factura",`<input type="date" name="date" required value="${a(s==null?void 0:s.date)||new Date().toISOString().split("T")[0]}" class="vf-input">`)}
                            ${o("Método de pago",`<select name="paymentMethod" class="vf-input">
                                <option value="Transfer" ${((s==null?void 0:s.paymentMethod)||"Transfer")==="Transfer"?"selected":""}>Transferencia</option>
                                <option value="MobilePay" ${(s==null?void 0:s.paymentMethod)==="MobilePay"?"selected":""}>MobilePay</option>
                                <option value="CASH" ${(s==null?void 0:s.paymentMethod)==="CASH"?"selected":""}>Efectivo</option>
                                <option value="CARD" ${(s==null?void 0:s.paymentMethod)==="CARD"?"selected":""}>Tarjeta</option>
                            </select>`)}
                        </div>
                    </section>
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <p class="text-sm text-stone-500">Se genera el PDF y queda guardado en Contabilidad.</p>
                        <button type="submit" id="manual-invoice-btn" class="cx-btn is-primary !h-12 !px-6"><i class="ph-bold ph-file-pdf"></i> Generar factura PDF</button>
                    </div>
                </form>

                <div id="manual-invoice-result" class="hidden mb-6">
                    <div class="cx-tile cx-dark !min-h-0 !flex-row !items-center !justify-between flex-wrap">
                        <div>
                            <p class="font-semibold" id="result-invoice-number"></p>
                            <p class="text-sm opacity-70">Factura generada</p>
                        </div>
                        <a id="result-download-link" href="#" target="_blank" rel="noopener" class="cx-btn is-primary"><i class="ph-bold ph-download-simple"></i> Descargar PDF</a>
                    </div>
                </div>

                <section class="cx-panel !p-0 overflow-hidden">
                    <h3 class="cx-h px-6 pt-5 pb-2">Facturas manuales recientes</h3>
                    ${e.length===0?`
                        <div class="py-14 text-center">
                            <i class="ph ph-note-blank text-4xl text-stone-400 block mb-2"></i>
                            <p class="text-sm text-stone-600">Todavía no hay facturas manuales. Las que generes aparecen acá.</p>
                        </div>
                    `:`
                        <div class="overflow-x-auto">
                            <table class="cx-inv-table w-full text-left">
                                <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Concepto</th><th class="text-right">Total</th><th class="text-center">PDF</th></tr></thead>
                                <tbody>
                                    ${e.map(r=>`
                                        <tr class="inv-row">
                                            <td class="text-sm font-mono font-semibold">${r.invoiceNumber||"-"}</td>
                                            <td class="text-xs text-stone-500 whitespace-nowrap">${r.date?this.formatDate(r.date):"-"}</td>
                                            <td class="text-sm font-semibold max-w-[160px] truncate">${r.customerName||"-"}</td>
                                            <td class="text-sm text-stone-600 max-w-[220px] truncate">${r.itemsSummary||"-"}</td>
                                            <td class="text-sm font-semibold text-right whitespace-nowrap">${this.formatCurrency(r.totalAmount||0)}</td>
                                            <td class="text-center">
                                                <a href="${r.downloadUrl||"#"}" target="_blank" rel="noopener" class="cx-row-btn mx-auto hover:!bg-[#1A1A1A] hover:!text-white" title="Descargar PDF" aria-label="Descargar PDF"><i class="ph ph-file-pdf"></i></a>
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    `}
                </section>
            </div>
            </div>
        `;t.innerHTML=i,this.state.manualInvoicesLoaded||this.loadManualInvoices()},async loadManualInvoices(){try{const t=await te.currentUser.getIdToken(),e=await fetch(`${j}/invoices?year=${new Date().getFullYear()}`,{headers:{Authorization:`Bearer ${t}`}});if(!e.ok)throw new Error("Error cargando facturas");const s=await e.json();this.state.contabilidadInvoices=s.invoices||[],this.state.manualInvoicesLoaded=!0,this.state.currentView==="facturasManual"&&this.refreshCurrentView()}catch(t){console.error("Error loading manual invoices:",t)}},async submitManualInvoice(t){t.preventDefault();const e=document.getElementById("manual-invoice-form"),s=document.getElementById("manual-invoice-btn"),a=new FormData(e),o={customerName:a.get("customerName"),customerVAT:a.get("customerVAT")||void 0,customerAddress:a.get("customerAddress")||void 0,description:a.get("description"),amount:parseFloat(a.get("amount")),vatAmount:a.get("vatAmount")?parseFloat(a.get("vatAmount")):void 0,date:a.get("date"),paymentMethod:a.get("paymentMethod")};if(!o.customerName||!o.description||!o.amount||!o.date){this.showToast("Completa todos los campos obligatorios","error");return}const i=this.state.invoicePrefill;if(i&&i.extraIncomeId){const r=(this.state.extraIncome||[]).find(n=>n.id===i.extraIncomeId);if(r&&r.invoiced){this.showToast("⚠️ Este ingreso ya fue facturado","error");return}}s.disabled=!0,s.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Generando...';try{const r=await te.currentUser.getIdToken(),n=await fetch(`${j}/invoices/manual`,{method:"POST",headers:{Authorization:`Bearer ${r}`,"Content-Type":"application/json"},body:JSON.stringify(o)});if(!n.ok){const h=await n.json();throw new Error(h.error||"Error generando factura")}const c=await n.json(),l=this.state.invoicePrefill;if(l&&l.extraIncomeId){await this.markExtraIncomeInvoiced(l.extraIncomeId,c.invoiceNumber),this.state.invoicePrefill=null,c.downloadUrl&&window.open(c.downloadUrl,"_blank"),this.showToast(`✅ Factura ${c.invoiceNumber} generada y vinculada al ingreso`),s.disabled=!1,s.innerHTML='<i class="ph-bold ph-file-pdf"></i> Generar Factura PDF',this.state.manualInvoicesLoaded=!1,this.loadManualInvoices(),this.navigate("extraIncome");return}const d=document.getElementById("manual-invoice-result");document.getElementById("result-invoice-number").textContent=`Factura ${c.invoiceNumber} generada`,document.getElementById("result-download-link").href=c.downloadUrl,d.classList.remove("hidden"),this.showToast(`✅ Factura ${c.invoiceNumber} generada correctamente`),e.reset(),document.querySelector('[name="date"]').value=new Date().toISOString().split("T")[0],this.state.manualInvoicesLoaded=!1,this.loadManualInvoices()}catch(r){console.error("Error generating manual invoice:",r),this.showToast("❌ Error: "+r.message,"error"),alert("Error generando factura: "+r.message)}s.disabled=!1,s.innerHTML='<i class="ph-bold ph-file-pdf"></i> Generar Factura PDF'},renderExtraIncome(t){const e=this.state.extraIncome||[],s=m=>String(m??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");this.state.incomeFilterYear==null&&(this.state.incomeFilterYear=new Date().getFullYear()),this.state.incomeFilterMonths==null&&(this.state.incomeFilterMonths=[new Date().getMonth()]);const a=this.state.incomeFilterYear,o=this.state.incomeFilterMonths,i=e.filter(m=>{if(!m.date)return!1;const g=new Date(m.date+"T00:00:00");return g.getFullYear()===a&&o.includes(g.getMonth())}),r=this.cxPeriodLabel(a,o),n=i.reduce((m,g)=>m+(Number(g.amount)||0),0),c=i.reduce((m,g)=>m+(Number(g.vatAmount)||0),0),l=i.filter(m=>!m.invoiced),d=l.length,h=l.reduce((m,g)=>m+(Number(g.amount)||0),0),u=(this.state.incomeSearch||"").toLowerCase(),p=this.state.incomeCategoryFilter||"all",b=!!this.state.incomeUninvoicedOnly,y=i.filter(m=>!(b&&m.invoiced||p!=="all"&&(m.category||"")!==p||u&&!`${m.description||""} ${m.clientName||""} ${m.category||""}`.toLowerCase().includes(u))).sort((m,g)=>new Date(g.date)-new Date(m.date)),v=m=>`<span class="cx-state is-ok whitespace-nowrap">${{event:"Evento",service:"Servicio",other:"Otro"}[m]||m||"—"}</span>`,E=m=>m.invoiced?`<span class="cx-state is-done whitespace-nowrap">Facturado${m.invoiceNumber?" #"+s(m.invoiceNumber):""}</span>`:'<span class="cx-state is-wait whitespace-nowrap">Sin facturar</span>',$=y.map(m=>`
            <tr class="inv-row group">
                <td class="text-xs text-stone-500 whitespace-nowrap">${m.date?this.formatDate(m.date):"—"}</td>
                <td class="text-sm font-semibold">${s(m.clientName)||'<span class="text-stone-400">—</span>'}</td>
                <td class="text-sm text-stone-600 max-w-[220px] truncate" title="${s(m.description)}">${s(m.description)||"—"}</td>
                <td>${v(m.category)}</td>
                <td class="text-sm font-semibold text-right whitespace-nowrap">${this.formatCurrency(Number(m.amount)||0)}</td>
                <td class="text-sm text-stone-500 text-right whitespace-nowrap">${this.formatCurrency(Number(m.vatAmount)||0)}</td>
                <td>${E(m)}</td>
                <td>
                    <div class="flex items-center justify-end gap-1">
                        ${m.invoiced?`<button onclick="app.navigate('facturasManual')" class="cx-btn !h-8 !px-3 !text-xs" title="Ver factura ${s(m.invoiceNumber||"")}"><i class="ph ph-file-text"></i> Ver</button>`:`<button onclick="app.invoiceFromExtraIncome('${m.id}')" class="cx-btn is-primary !h-8 !px-3 !text-xs" title="Generar factura desde este ingreso"><i class="ph-bold ph-file-plus"></i> Facturar</button>
                               <button onclick="app.openLinkInvoiceModal('${m.id}')" class="cx-btn !h-8 !px-3 !text-xs" title="Vincular una factura ya generada"><i class="ph ph-link"></i> Vincular</button>`}
                        <button onclick="app.deleteExtraIncome('${m.id}')" class="cx-row-btn is-danger opacity-0 group-hover:opacity-100 focus:opacity-100" title="Eliminar" aria-label="Eliminar"><i class="ph ph-trash"></i></button>
                    </div>
                </td>
            </tr>`).join(""),I=!!this.state.showIncomeForm,C=(m,g,f="")=>`<label class="vf-field"><span>${m}</span>${g}${f?`<small class="block text-xs text-stone-500 mt-1">${f}</small>`:""}</label>`;t.innerHTML=`
            <div class="cx-view">
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Ingresos Extra",subtitle:"Eventos, servicios y otros ingresos que no son venta de discos",primary:{label:"Registrar ingreso",icon:"ph-plus",onclick:"app.toggleIncomeForm()"}})}

                <div class="mb-5">${this.cxPeriodPicker("income")}</div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div class="cx-tile cx-yellow">
                        <span class="cx-tile-label">Ingresado</span>
                        <b class="cx-tile-value">${this.formatCurrency(n)}</b>
                        <span class="cx-tile-sub">${r}, ${i.length} ingreso${i.length===1?"":"s"}</span>
                        <span class="cx-tile-stripes" aria-hidden="true"></span>
                    </div>
                    <button onclick="app.toggleIncomeUninvoiced()" class="cx-tile ${d>0?"cx-orange":"cx-frost"} text-left">
                        <span class="cx-tile-label">Sin facturar</span>
                        <b class="cx-tile-value">${d}</b>
                        <span class="cx-tile-sub">${d>0?this.formatCurrency(h)+", tocá para verlos":"Todo facturado"}</span>
                    </button>
                    <div class="cx-tile cx-dark">
                        <span class="cx-tile-label">IVA del período</span>
                        <b class="cx-tile-value">${this.formatCurrency(c)}</b>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2 mb-4">
                    <div class="cx-search flex-1 min-w-[240px]">
                        <i class="ph ph-magnifying-glass"></i>
                        <input type="text" id="income-search-input" value="${s(this.state.incomeSearch)}"
                            oninput="app.setIncomeSearch(this.value)" placeholder="Descripción o cliente">
                    </div>
                    <select onchange="app.setIncomeCategoryFilter(this.value)" class="cx-pill-select ${p!=="all"?"!bg-[#1A1A1A] !text-white":""}" aria-label="Categoría">
                        <option value="all">Todas las categorías</option>
                        <option value="event" ${p==="event"?"selected":""}>Evento</option>
                        <option value="service" ${p==="service"?"selected":""}>Servicio</option>
                        <option value="other" ${p==="other"?"selected":""}>Otro</option>
                    </select>
                    <button onclick="app.toggleIncomeUninvoiced()" class="cx-btn !h-12 ${b?"!bg-[#1A1A1A] !text-white !border-[#1A1A1A]":""}">
                        <i class="ph ph-file-text"></i> Sin facturar ${d>0?`<span class="cx-count">${d}</span>`:""}
                    </button>
                </div>

                <section class="cx-panel !p-0 overflow-hidden">
                    ${y.length===0?`
                        <div class="p-14 text-center">
                            <i class="ph ph-coins text-4xl text-stone-400 block mb-2"></i>
                            <p class="text-sm text-stone-600">No hay ingresos en este período. Usá "Registrar ingreso" para sumar uno.</p>
                        </div>
                    `:`
                        <div class="overflow-x-auto">
                            <table class="cx-inv-table w-full text-left">
                                <thead>
                                    <tr>
                                        <th>Fecha</th><th>Cliente</th><th>Descripción</th><th>Categoría</th>
                                        <th class="text-right">Monto</th><th class="text-right">IVA</th><th>Factura</th><th></th>
                                    </tr>
                                </thead>
                                <tbody>${$}</tbody>
                            </table>
                        </div>
                    `}
                </section>
            </div>
            </div>

            ${I?`
            <div class="vf-overlay" onclick="if (event.target === this) app.toggleIncomeForm()">
                <aside class="vf-panel cx-view" role="dialog" aria-modal="true" aria-labelledby="inc-title">
                    <header class="vf-head">
                        <div>
                            <h3 id="inc-title" class="vf-title">Registrar ingreso</h3>
                            <p class="cx-sub !mt-1">Un evento, un servicio u otro ingreso que no sea venta de discos.</p>
                        </div>
                        <button type="button" onclick="app.toggleIncomeForm()" class="cx-btn is-icon" aria-label="Cerrar"><i class="ph ph-x"></i></button>
                    </header>
                    <form onsubmit="app.addExtraIncome(event)" class="vf-form">
                        <div class="vf-body">
                            <section class="vf-card space-y-3">
                                ${C("Descripción",'<input type="text" name="description" required placeholder="DJ set en Bootleggers" class="vf-input">')}
                                ${C("Cliente u organizador",'<input type="text" name="clientName" placeholder="Ej: Jolene Bar" class="vf-input">',"Se usa para completar la factura.")}
                                <div class="vf-field"><span>Categoría</span>
                                    <div class="vf-segs is-wide">
                                        <label class="vf-seg"><input type="radio" name="category" value="event" checked><span>Evento</span></label>
                                        <label class="vf-seg"><input type="radio" name="category" value="service"><span>Servicio</span></label>
                                        <label class="vf-seg"><input type="radio" name="category" value="other"><span>Otro</span></label>
                                    </div>
                                </div>
                            </section>
                            <section class="vf-card">
                                <div class="grid grid-cols-2 gap-3">
                                    ${C("Monto total (kr)",'<input type="number" name="amount" required step="0.01" min="0" placeholder="3750" class="vf-input is-strong">')}
                                    ${C("IVA incluido (kr)",'<input type="number" name="vatAmount" step="0.01" min="0" placeholder="750" class="vf-input">',"Opcional.")}
                                    ${C("Fecha",`<input type="date" name="date" required value="${new Date().toISOString().split("T")[0]}" class="vf-input">`)}
                                    ${C("Método de pago",`<select name="paymentMethod" class="vf-input">
                                        <option value="Transfer">Transferencia</option>
                                        <option value="MobilePay">MobilePay</option>
                                        <option value="Cash">Efectivo</option>
                                        <option value="Card">Tarjeta</option>
                                    </select>`)}
                                </div>
                            </section>
                        </div>
                        <footer class="vf-foot">
                            <button type="button" onclick="app.toggleIncomeForm()" class="cx-btn">Cancelar</button>
                            <button type="submit" class="cx-btn is-primary"><i class="ph-bold ph-plus"></i> Registrar ingreso</button>
                        </footer>
                    </form>
                </aside>
            </div>`:""}
        `},async addExtraIncome(t){t.preventDefault();const e=t.target,s=new FormData(e),a={description:s.get("description"),clientName:(s.get("clientName")||"").trim(),category:s.get("category"),amount:parseFloat(s.get("amount")),vatAmount:s.get("vatAmount")?parseFloat(s.get("vatAmount")):0,date:s.get("date"),paymentMethod:s.get("paymentMethod")||"Transfer",createdAt:firebase.firestore.FieldValue.serverTimestamp()};try{await T.collection("extra_income").add(a),this.showToast("✅ Ingreso extra registrado correctamente"),this.state.showIncomeForm=!1;const o=await T.collection("extra_income").get();this.state.extraIncome=o.docs.map(i=>({id:i.id,...i.data()})).sort((i,r)=>new Date(r.date)-new Date(i.date)),this.renderExtraIncome(document.getElementById("app-content"))}catch(o){console.error("Error adding extra income:",o),this.showToast("❌ Error: "+o.message,"error")}},async deleteExtraIncome(t){if(confirm("¿Eliminar este ingreso extra?"))try{await T.collection("extra_income").doc(t).delete(),this.state.extraIncome=this.state.extraIncome.filter(e=>e.id!==t),this.showToast("🗑️ Ingreso eliminado"),this.renderExtraIncome(document.getElementById("app-content"))}catch(e){console.error("Error deleting extra income:",e),this.showToast("❌ Error: "+e.message,"error")}},navigate(t){(t==="onlineSales"||t==="discogsSales")&&(t="sales"),this.state.currentView=t,this.state.periodOpen=null;const e=document.querySelector(".cx-rail");e&&e.matches(":hover")&&e.classList.add("is-collapsed"),document.activeElement&&document.activeElement.closest&&document.activeElement.closest(".cx-rail")&&document.activeElement.blur(),t!=="expenses"&&(this.state.expenseMissingReceiptOnly=!1),t!=="facturasManual"&&(this.state.invoicePrefill=null),t!=="extraIncome"&&(this.state.incomeUninvoicedOnly=!1),document.querySelectorAll(".nav-item, .nav-item-m").forEach(i=>{i.classList.remove("bg-orange-50","text-brand-orange","is-active"),i.classList.add("text-slate-500")});const s=document.getElementById(`nav-d-${t}`);s&&(s.classList.remove("text-slate-500"),s.classList.add("bg-orange-50","text-brand-orange","is-active"));const a=document.getElementById(`nav-m-${t}`);a&&(a.classList.remove("text-slate-400"),a.classList.add("text-brand-orange"));const o=document.getElementById("app-content");o.innerHTML="",this.refreshCurrentView(),this.updateNavBadges()},renderCalendar(t){const e=this.state.selectedDate||new Date,s=e.getFullYear(),a=e.getMonth(),o=new Date(s,a,1),r=new Date(s,a+1,0).getDate(),n=o.getDay()===0?6:o.getDay()-1,c=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],l=h=>{const u=`${s}-${String(a+1).padStart(2,"0")}-${String(h).padStart(2,"0")}`,p=this.state.sales.some(v=>v.date===u&&this.normalizeSaleChannel(v)!=="manual"),b=this.state.expenses.some(v=>(v.date||v.fecha_factura)===u),y=this.state.events.some(v=>v.date===u);return{hasSales:p,hasExpenses:b,hasEvents:y}},d=`
            <div class="cx-view">
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:`${c[a]} ${s}`,subtitle:"Ventas, gastos y notas de cada día",filters:`
                        <div class="cx-glass flex p-1 rounded-full">
                            <button onclick="app.changeCalendarMonth(-1)" class="cx-month" aria-label="Mes anterior"><i class="ph-bold ph-caret-left"></i></button>
                            <button onclick="app.state.selectedDate = new Date(); app.refreshCurrentView()" class="cx-month">Hoy</button>
                            <button onclick="app.changeCalendarMonth(1)" class="cx-month" aria-label="Mes siguiente"><i class="ph-bold ph-caret-right"></i></button>
                        </div>`})}
                <div class="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-220px)] lg:min-h-[560px]">
                    <!-- Calendar Grid -->
                    <section class="cx-panel flex-1 flex flex-col !p-4">
                        <div class="grid grid-cols-7 gap-2 mb-2 text-center">
                            ${["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(h=>`<div class="text-xs font-semibold text-stone-500 py-1">${h}</div>`).join("")}
                        </div>
                        <div class="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                            ${Array(n).fill("<div></div>").join("")}
                            ${Array.from({length:r},(h,u)=>{const p=u+1,b=`${s}-${String(a+1).padStart(2,"0")}-${String(p).padStart(2,"0")}`,y=e.getDate()===p,v=l(p),E=new Date().toDateString()===new Date(s,a,p).toDateString();return`
                                    <button onclick="app.selectCalendarDate('${b}')" class="cx-day ${y?"is-selected":""} ${E?"is-today":""}" aria-label="${p} de ${c[a]}">
                                        <span>${p}</span>
                                        <i class="cx-day-dots">
                                            ${v.hasSales?'<b class="is-sale" title="Ventas"></b>':""}
                                            ${v.hasExpenses?'<b class="is-expense" title="Gastos"></b>':""}
                                            ${v.hasEvents?'<b class="is-event" title="Notas"></b>':""}
                                        </i>
                                    </button>
                                `}).join("")}
                        </div>
                        <div class="flex flex-wrap gap-4 pt-3 px-1 text-xs text-stone-600">
                            <span class="flex items-center gap-1.5"><b class="cx-legend-dot is-sale"></b>Ventas</span>
                            <span class="flex items-center gap-1.5"><b class="cx-legend-dot is-expense"></b>Gastos</span>
                            <span class="flex items-center gap-1.5"><b class="cx-legend-dot is-event"></b>Notas</span>
                        </div>
                    </section>

                    <!-- Day Summary -->
                    <section class="cx-panel w-full lg:w-[400px] flex flex-col lg:h-full overflow-hidden">
                        ${this.renderCalendarDaySummary(e)}
                    </section>
                </div>
            </div>
            </div>
        `;t.innerHTML=d},getCustomerInfo(t){const e=t.customer||{},s=t.customerName||e.name||(e.firstName?`${e.firstName} ${e.lastName||""}`.trim():"")||"Cliente",a=(t.customerEmail||e.email||"").trim(),o=(e.phone||t.customerPhone||t.phone||"").trim();let i="",r=!1;if(e.shipping&&(e.shipping.line1||e.shipping.city||e.shipping.postal_code)){const n=e.shipping,c=[n.line1,n.line2].filter(Boolean).join(" "),l=[n.postal_code||n.zip,n.city].filter(Boolean).join(" ");i=[c,l,n.country].filter(Boolean).join(", "),r=!0}else{const n=(t.address||e.address||"").trim();n&&n!=="-"&&(i=n,r=!0)}return{name:s,email:a,phone:o,address:i,hasAddress:r}},renderCalendarDaySummary(t){const e=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,s=t.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}),a=this.state.sales.filter(l=>l.date===e&&this.normalizeSaleChannel(l)!=="manual"),o=this.state.expenses.filter(l=>(l.date||l.fecha_factura)===e),i=this.state.events.filter(l=>l.date===e),r=a.reduce((l,d)=>l+(parseFloat(d.total)||0),0),n=o.reduce((l,d)=>l+(parseFloat(d.monto_total??d.amount)||0),0),c=l=>{const d=l.items||[];return`${(d[0]?d[0].album||d[0].title:l.album)||"Venta"}${d.length>1?` y ${d.length-1} más`:""}`};return`
            <div class="flex justify-between items-start gap-3 mb-4">
                <div>
                    <h3 class="cx-dialog-title first-letter:uppercase">${s}</h3>
                    <p class="cx-sub !mt-1">Resumen del día</p>
                </div>
                <button onclick="app.openAddEventModal('${e}')" class="cx-btn is-primary shrink-0"><i class="ph-bold ph-plus"></i>Nota</button>
            </div>

            <div class="space-y-5 overflow-y-auto pr-1 custom-scrollbar flex-1">
                <div class="grid grid-cols-2 gap-3">
                    <div class="cx-tile cx-yellow !min-h-0">
                        <span class="cx-tile-label">Ventas (${a.length})</span>
                        <b class="cx-tile-value !text-2xl">${this.formatCurrency(r)}</b>
                    </div>
                    <div class="cx-tile cx-dark !min-h-0">
                        <span class="cx-tile-label">Gastos (${o.length})</span>
                        <b class="cx-tile-value !text-2xl">${this.formatCurrency(n)}</b>
                    </div>
                </div>

                <div>
                    <h4 class="vf-mini-label block mb-2">Notas</h4>
                    ${i.length>0?`
                        <div class="space-y-2">
                            ${i.map(l=>`
                                <div class="p-3 rounded-2xl bg-[#F2E14C]/60 group relative">
                                    <p class="text-sm font-semibold pr-6">${l.title}</p>
                                    ${l.description?`<p class="text-xs text-stone-600 mt-1">${l.description}</p>`:""}
                                    <button onclick="app.deleteEvent('${l.id}')" class="absolute top-2.5 right-2.5 text-stone-500 hover:text-red-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" aria-label="Borrar nota">
                                        <i class="ph ph-trash"></i>
                                    </button>
                                </div>
                            `).join("")}
                        </div>
                    `:'<p class="text-sm text-stone-500">Sin notas. Usá "Nota" para agregar una.</p>'}
                </div>

                <div>
                    <h4 class="vf-mini-label block mb-1">Ventas</h4>
                    ${a.length>0?a.map(l=>{const d=l.items&&l.items[0]?this.resolveItemCover(l.items[0]):null;return`
                        <button onclick="app.openUnifiedOrderDetailModal('${l.id}')" class="cx-feed-row w-full text-left !px-2">
                            <span class="cx-cover !w-10 !h-10 !text-base">${d?`<img src="${d}" class="w-full h-full object-cover" alt="">`:'<i class="ph ph-vinyl-record"></i>'}</span>
                            <span class="flex-1 min-w-0">
                                <span class="block text-sm font-semibold truncate">${c(l)}</span>
                                <span class="block text-xs text-stone-500">${l.paymentMethod||""}</span>
                            </span>
                            <span class="text-sm font-semibold">${this.formatCurrency(l.total)}</span>
                        </button>`}).join(""):'<p class="text-sm text-stone-500">Sin ventas.</p>'}
                </div>

                <div>
                    <h4 class="vf-mini-label block mb-1">Gastos</h4>
                    ${o.length>0?o.map(l=>`
                        <div class="cx-feed-row !cursor-default !px-2">
                            <span class="cx-cover !w-10 !h-10 !text-base"><i class="ph ph-receipt"></i></span>
                            <span class="flex-1 min-w-0">
                                <span class="block text-sm font-semibold truncate">${l.proveedor||l.descripcion||l.description||"Gasto"}</span>
                                <span class="block text-xs text-stone-500 truncate">${l.categoria_label||l.categoria||l.category||""}</span>
                            </span>
                            <span class="text-sm font-semibold">${this.formatCurrency(parseFloat(l.monto_total??l.amount)||0)}</span>
                        </div>
                    `).join(""):'<p class="text-sm text-stone-500">Sin gastos.</p>'}
                </div>
            </div>
        `},changeCalendarMonth(t){const e=new Date(this.state.selectedDate||new Date);e.setDate(1),e.setMonth(e.getMonth()+t),this.state.selectedDate=e,this.renderCalendar(document.getElementById("app-content"))},selectCalendarDate(t){this.state.selectedDate=new Date(t),this.renderCalendar(document.getElementById("app-content"))},openAddEventModal(t){const s=`
            <div id="modal-overlay" class="vf-overlay cx-dialog-wrap" onclick="if (event.target === this) this.remove()">
                <div class="cx-dialog cx-view" role="dialog" aria-modal="true" aria-labelledby="ev-title">
                    <div class="flex justify-between items-start mb-5">
                        <div>
                            <h3 id="ev-title" class="cx-dialog-title">Nueva nota</h3>
                            <p class="cx-sub !mt-1 first-letter:uppercase">${new Date(t).toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}</p>
                        </div>
                        <button onclick="document.getElementById('modal-overlay').remove()" class="cx-btn is-icon" aria-label="Cerrar"><i class="ph ph-x"></i></button>
                    </div>
                    <form onsubmit="app.handleAddEvent(event)" class="space-y-3">
                        <input type="hidden" name="date" value="${t}">
                        <label class="vf-field"><span>Título</span>
                            <input name="title" required class="vf-input" placeholder="Ej. Funky Night en Bootleggers"></label>
                        <label class="vf-field"><span>Detalle</span>
                            <textarea name="description" rows="3" class="vf-input !h-auto py-2.5 resize-none" placeholder="Opcional"></textarea></label>
                        <div class="flex justify-end gap-2 pt-2">
                            <button type="button" onclick="document.getElementById('modal-overlay').remove()" class="cx-btn">Cancelar</button>
                            <button type="submit" class="cx-btn is-primary">Guardar nota</button>
                        </div>
                    </form>
                </div>
            </div>
        `;document.body.insertAdjacentHTML("beforeend",s),setTimeout(()=>{var a;return(a=document.querySelector('#modal-overlay input[name="title"]'))==null?void 0:a.focus()},50)},handleAddEvent(t){t.preventDefault();const e=new FormData(t.target),s={date:e.get("date"),title:e.get("title"),description:e.get("description"),createdAt:new Date().toISOString()};T.collection("events").add(s).then(()=>{this.showToast("✅ Evento agregado"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(a=>console.error(a))},deleteEvent(t){confirm("¿Eliminar este evento?")&&T.collection("events").doc(t).delete().then(()=>{this.showToast("✅ Evento eliminado"),this.loadData()}).catch(e=>console.error(e))},renderBackup(t){const e=`
            <div class="cx-view">
            <div class="max-w-3xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Respaldo",subtitle:"Copias de seguridad de tus datos"})}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <section class="cx-tile cx-yellow !min-h-[200px] !justify-between">
                        <div>
                            <span class="cx-tile-label">Descargar copia</span>
                            <p class="text-sm mt-2 relative z-10">Un archivo con todo el inventario, las ventas y los gastos. Sirve para guardarlo o pasarlo a otra compu.</p>
                        </div>
                        <button onclick="app.exportData()" class="cx-btn !bg-[#1A1A1A] !text-white !border-[#1A1A1A] self-start relative z-10"><i class="ph-bold ph-download-simple"></i> Descargar copia</button>
                        <span class="cx-tile-stripes" aria-hidden="true"></span>
                    </section>
                    <section class="cx-tile cx-frost !min-h-[200px] !justify-between">
                        <div>
                            <span class="cx-tile-label">Restaurar una copia</span>
                            <p class="text-sm text-stone-600 mt-2">Cargá un archivo .json descargado antes desde acá.</p>
                        </div>
                        <input type="file" id="import-file" accept=".json" class="hidden" onchange="app.importData(this)">
                        <button onclick="document.getElementById('import-file').click()" class="cx-btn self-start"><i class="ph ph-upload-simple"></i> Elegir archivo</button>
                    </section>
                </div>

                <section class="vf-card !bg-[#F2955E]/25 !border-[#F2955E]/50">
                    <h3 class="vf-h flex items-center gap-2"><i class="ph-bold ph-warning"></i> Zona de peligro</h3>
                    <p class="text-sm text-stone-700 mb-4">Estas acciones borran datos para siempre y no se pueden deshacer.</p>
                    <div class="flex flex-wrap gap-2">
                        <button type="button" onclick="app.resetSales()" class="cx-btn"><i class="ph ph-receipt-x"></i> Borrar todas las ventas</button>
                        <button type="button" onclick="app.resetApplication()" class="cx-btn is-danger"><i class="ph ph-trash"></i> Restablecer de fábrica</button>
                    </div>
                </section>
            </div>
            </div>
        `;t.innerHTML=e},renderSettings(t){const e=localStorage.getItem("discogs_token")||"",s=(o,i,r,n,c)=>`
            <div class="flex items-center justify-between gap-4 py-3 border-b border-black/5 last:border-0">
                <div class="min-w-0">
                    <p class="text-sm font-semibold">${o}</p>
                    <p class="text-xs text-stone-500">${i}</p>
                </div>
                <button onclick="${r}" class="cx-btn !h-9 shrink-0"><i class="ph ${n}"></i> ${c}</button>
            </div>`,a=`
            <div class="cx-view">
            <div class="max-w-3xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Configuración",subtitle:"Conexiones y herramientas del panel"})}

                <section class="vf-card mb-4">
                    <h3 class="vf-h">Discogs</h3>
                    <form onsubmit="app.saveSettings(event)" class="space-y-3">
                        <label class="vf-field"><span>Token personal de Discogs</span>
                            <input type="text" name="discogs_token" value="${e}" placeholder="Ej: hSIAXlFq..." class="vf-input font-mono"></label>
                        <p class="text-xs text-stone-500">Sirve para buscar tapas y datos de discos. <a href="https://www.discogs.com/settings/developers" target="_blank" rel="noopener" class="underline font-semibold">Generar un token</a></p>
                        <button type="submit" class="cx-btn is-primary">Guardar</button>
                    </form>
                </section>

                <section class="cx-tile cx-yellow !min-h-0 mb-4 !flex-row !items-center !justify-between flex-wrap">
                    <div class="relative z-10 max-w-md">
                        <span class="cx-tile-label">Inventario en Excel</span>
                        <p class="text-sm mt-1">Todos los discos con categoría, precio y si están en Discogs y en la web.</p>
                    </div>
                    <button onclick="app.exportInventoryToExcel()" class="cx-btn !bg-[#1A1A1A] !text-white !border-[#1A1A1A] relative z-10"><i class="ph-bold ph-file-xls"></i> Descargar Excel</button>
                </section>

                <section class="vf-card">
                    <h3 class="vf-h !mb-1">Arreglos de datos</h3>
                    <p class="text-xs text-stone-500 mb-2">Herramientas de mantenimiento. Usalas solo si sabés que hacen falta.</p>
                    ${s("Marcar productos como usados",'Pone "Second-hand" a los productos que no tienen condición.',"app.migrateProductCondition()","ph-database","Aplicar")}
                    ${s("Completar datos de ventas","Agrega costo y condición a las ventas que no los tienen.","app.migrateSalesData()","ph-receipt","Aplicar")}
                    ${s("Normalizar SKUs","Da formato SKU-001 a los productos que no lo tienen.","app.normalizeAllSkus()","ph-barcode","Aplicar")}
                    ${s("Completar QuickIDs","Asigna un número correlativo (0001, 0002…) a los productos sin QuickID.","app.backfillQuickIds()","ph-hash","Aplicar")}
                </section>
            </div>
            </div>
        `;t.innerHTML=a},saveSettings(t){t.preventDefault();const s=new FormData(t.target).get("discogs_token").trim();s?(localStorage.setItem("discogs_token",s),localStorage.setItem("discogs_token_warned","true"),this.showToast("Configuración guardada correctamente")):(localStorage.removeItem("discogs_token"),this.showToast("Token eliminado"))},async migrateProductCondition(){if(confirm('¿Estás seguro? Esto marcará TODOS los productos como "Usado (Second-hand)".')){this.showToast("⏳ Migrando productos...","info");try{const t=await T.collection("products").get();let e=0;const s=T.batch();t.docs.forEach(a=>{a.data().product_condition||(s.update(a.ref,{product_condition:"Second-hand"}),e++)}),await s.commit(),this.showToast(`✅ ${e} productos marcados como "Usado"`),await this.loadData()}catch(t){console.error("Migration error:",t),this.showToast("❌ Error durante la migración: "+t.message,"error")}}},async normalizeAllSkus(){const t=/^SKU\s*-\s*(\d+)$/,e=this.state.inventory.filter(o=>!t.test(o.sku)),s=this.state.inventory.map(o=>{const i=o.sku.match(t);return i?parseInt(i[1]):0});let a=Math.max(0,...s);if(e.length===0){this.showToast("✅ Todos los SKUs ya tienen formato SKU-xxx");return}if(confirm(`Se encontraron ${e.length} productos con SKU irregular.

Se les asignará un nuevo SKU desde SKU-${String(a+1).padStart(3,"0")} en adelante.

¿Continuar?`)){this.showToast("⏳ Normalizando SKUs...","info");try{for(let o=0;o<e.length;o+=500){const i=T.batch(),r=e.slice(o,o+500);for(const n of r){a++;const c=`SKU-${String(a).padStart(3,"0")}`,l=await this.findProductBySku(n.sku);l&&(i.update(l.ref,{sku:c,old_sku:n.sku}),console.log(`  → ${n.sku} → ${c} (${n.artist} - ${n.album})`))}await i.commit()}this.showToast(`✅ ${e.length} SKUs normalizados`),await this.loadData()}catch(o){console.error("SKU normalization error:",o),this.showToast("❌ Error: "+o.message,"error")}}},async backfillQuickIds(){const t=this.state.inventory.filter(e=>!e.quickId);if(t.length===0){this.showToast("✅ Todos los productos ya tienen quickId");return}if(t.sort((e,s)=>{const a=e.created_at?e.created_at.seconds?e.created_at.seconds*1e3:new Date(e.created_at).getTime():0,o=s.created_at?s.created_at.seconds?s.created_at.seconds*1e3:new Date(s.created_at).getTime():0;return a-o}),!!confirm(`Se encontraron ${t.length} productos sin quickId.

Se les asignará un ID secuencial (0001, 0002...).

¿Continuar?`)){this.showToast("⏳ Asignando QuickIDs...","info");try{const e=T.collection("metadata").doc("vinylCounter"),s=await e.get();let a=s.exists&&s.data().current||0;for(let o=0;o<t.length;o+=500){const i=T.batch(),r=t.slice(o,o+500);for(const n of r){a++;const c=String(a).padStart(4,"0"),l=await this.findProductBySku(n.sku);l&&(i.update(l.ref,{quickId:c}),console.log(`  → ${c}: ${n.artist} - ${n.album}`))}await i.commit()}await e.set({current:a},{merge:!0}),this.showToast(`✅ ${t.length} QuickIDs asignados (hasta ${String(a).padStart(4,"0")})`),await this.loadData()}catch(e){console.error("QuickID backfill error:",e),this.showToast("❌ Error: "+e.message,"error")}}},async migrateSalesData(){if(confirm("¿Migrar datos de ventas? Esto agregará información de costo y condición a ventas antiguas.")){this.showToast("⏳ Migrando ventas...","info");try{const t=await T.collection("sales").get();let e=0,s=0,a=T.batch();for(const o of t.docs){const r=o.data().items||[];let n=!1;const c=[];for(const l of r){const d={...l};if(!l.costAtSale&&l.costAtSale!==0){n=!0;const h=l.productId||l.recordId,u=l.album,p=this.state.inventory.find(b=>h&&(b.id===h||b.sku===h)||u&&b.album===u);p?(d.costAtSale=p.cost||0,d.productCondition=p.product_condition||"Second-hand",d.productId=p.id||h,d.album||(d.album=p.album)):(d.costAtSale=0,d.productCondition="Second-hand")}c.push(d)}n&&(a.update(o.ref,{items:c}),e++,s++,s>=450&&(await a.commit(),a=T.batch(),s=0))}s>0&&await a.commit(),this.showToast(`✅ ${e} ventas actualizadas con datos de producto`),await this.loadData()}catch(t){console.error("Sales migration error:",t),this.showToast("❌ Error: "+t.message,"error")}}},exportData(){const t={inventory:this.state.inventory,sales:this.state.sales,expenses:this.state.expenses,consignors:this.state.consignors,customGenres:this.state.customGenres,customCategories:this.state.customCategories,timestamp:new Date().toISOString()},e="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(t)),s=document.createElement("a");s.setAttribute("href",e),s.setAttribute("download","el_cuartito_backup_"+new Date().toISOString().slice(0,10)+".json"),document.body.appendChild(s),s.click(),s.remove()},exportInventoryToExcel(){this.showToast("⏳ Generando Excel...","info");try{const t=this.state.inventory.map(o=>{const i=[o.genre,o.genre2,o.genre3,o.genre4,o.genre5].filter(Boolean).join(", ");return{SKU:o.sku||"",Artista:o.artist||"",Álbum:o.album||"",Sello:o.label||"",Año:o.year||"",Géneros:i,"Condición Vinilo":o.status||"","Condición Cover":o.sleeveCondition||"","Condición Producto":o.product_condition||"Second-hand","Precio (DKK)":o.price||0,"Costo (DKK)":o.cost||0,Stock:o.stock||0,"En Web":o.is_online?"Sí":"No","En Discogs":o.discogs_listing_id?"Sí":"No","Discogs Listing ID":o.discogs_listing_id||"","Discogs Release ID":o.discogs_release_id||o.discogsId||"",Consignatario:o.consignor||"","Label Disquería":o.storageLocation||"",Ubicación:o.location||"",Notas:o.notes||"","Fecha Creación":o.createdAt?new Date(o.createdAt).toLocaleDateString("es-ES"):"","URL Imagen":o.imageUrl||""}}),e=XLSX.utils.book_new(),s=XLSX.utils.json_to_sheet(t);s["!cols"]=[{wch:12},{wch:25},{wch:30},{wch:20},{wch:6},{wch:30},{wch:12},{wch:12},{wch:15},{wch:10},{wch:10},{wch:6},{wch:8},{wch:10},{wch:15},{wch:15},{wch:15},{wch:15},{wch:12},{wch:30},{wch:12},{wch:40}],XLSX.utils.book_append_sheet(e,s,"Inventario");const a=`ElCuartito_Inventario_${new Date().toISOString().slice(0,10)}.xlsx`;XLSX.writeFile(e,a),this.showToast(`✅ Excel exportado: ${this.state.inventory.length} discos`)}catch(t){console.error("Error exporting to Excel:",t),this.showToast("❌ Error al exportar: "+t.message,"error")}},importData(t){const e=t.files[0];if(!e)return;const s=new FileReader;s.onload=a=>{try{const o=JSON.parse(a.target.result);if(!confirm("¿Estás seguro de restaurar este backup? Se sobrescribirán los datos actuales."))return;const i=T.batch();alert("La importación completa sobrescribiendo datos en la nube es compleja. Por seguridad, esta función solo agrega/actualiza items de inventario por ahora."),o.inventory&&o.inventory.forEach(r=>{const n=T.collection("products").doc(r.sku);i.set(n,r)}),i.commit().then(()=>{this.showToast("Datos importados (Inventario)")})}catch(o){alert("Error al leer el archivo de respaldo"),console.error(o)}},s.readAsText(e)},resetApplication(){if(!confirm(`⚠️ ¡ADVERTENCIA! ⚠️

Esto borrará PERMANENTEMENTE todo el inventario, ventas, gastos y socios de la base de datos.

¿Estás absolutamente seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Iniciando borrado completo...");const e=s=>T.collection(s).get().then(a=>{const o=T.batch();return a.docs.forEach(i=>{o.delete(i.ref)}),o.commit()});Promise.all([e("inventory"),e("sales"),e("expenses"),e("consignors"),T.collection("settings").doc("general").delete()]).then(()=>{this.showToast("♻️ Aplicación restablecida de fábrica"),setTimeout(()=>location.reload(),1500)}).catch(s=>{console.error(s),alert("Error al borrar datos: "+s.message)})},resetSales(){if(!confirm(`⚠️ ADVERTENCIA ⚠️

Esto borrará PERMANENTEMENTE todas las ventas (manuales y online) de la base de datos.

El inventario, gastos y socios NO serán afectados.

¿Estás seguro?`))return;if(prompt("Para confirmar, ingresa la contraseña de administrador:")!=="alejo13"){alert("Contraseña incorrecta. Operación cancelada.");return}this.showToast("Borrando todas las ventas..."),T.collection("sales").get().then(e=>{const s=T.batch();return e.docs.forEach(a=>{s.delete(a.ref)}),s.commit()}).then(()=>{this.showToast("✅ Todas las ventas han sido eliminadas"),setTimeout(()=>location.reload(),1500)}).catch(e=>{console.error(e),alert("Error al borrar ventas: "+e.message)})},async findProductBySku(t){try{const e=await T.collection("products").where("sku","==",t).get();if(e.empty)return null;const s=e.docs[0];return{id:s.id,ref:s.ref,data:s.data()}}catch(e){return console.error("Error finding product by SKU:",e),null}},logInventoryMovement(t,e){let s="";t==="EDIT"?s="Producto actualizado":t==="ADD"?s="Ingreso de inventario":t==="DELETE"?s="Egreso manual":t==="SOLD"&&(s="Venta registrada"),T.collection("inventory_logs").add({type:t,sku:e.sku||"Unknown",album:e.album||"Unknown",artist:e.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:s}).catch(a=>console.error("Error logging movement:",a))},openInventoryLogModal(){T.collection("inventory_logs").orderBy("timestamp","desc").limit(50).get().then(t=>{const s=`
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
                                    ${t.docs.map(a=>({id:a.id,...a.data()})).map(a=>{let o="bg-slate-100 text-slate-600";a.type==="ADD"&&(o="bg-green-100 text-green-700"),a.type==="DELETE"&&(o="bg-red-100 text-red-700"),a.type==="EDIT"&&(o="bg-blue-100 text-blue-700"),a.type==="SOLD"&&(o="bg-purple-100 text-purple-700");const i=a.timestamp?a.timestamp.toDate?a.timestamp.toDate():new Date(a.timestamp):new Date;return`
                                            <tr>
                                                <td class="p-4 text-slate-500 whitespace-nowrap">
                                                    ${i.toLocaleDateString()} <span class="text-xs text-slate-400 opacity-75">${i.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                                                </td>
                                                <td class="p-4">
                                                    <span class="px-2 py-1 rounded-md text-[10px] font-bold uppercase ${o}">${a.type}</span>
                                                </td>
                                                <td class="p-4 font-bold text-brand-dark">${a.album||"Unknown"}</td>
                                                <td class="p-4 font-mono text-xs text-slate-400">${a.sku||"N/A"}</td>
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
        `;try{const s=j,o=await(await fetch(`${s}/discogs/sync`,{method:"POST",headers:{"Content-Type":"application/json"}})).json(),r=await(await fetch(`${s}/discogs/sync-orders`,{method:"POST",headers:{"Content-Type":"application/json"}})).json();if(o.success||r&&r.success){let n=`✅ Sincronizado: ${o.synced||0} productos`;r&&r.salesCreated>0&&(n+=`. ¡Detectadas ${r.salesCreated} nuevas ventas!`),this.showToast(n),await this.loadData(),this.refreshCurrentView()}else throw new Error(o.error||r&&r.error||"Error desconocido")}catch(s){console.error("Sync error:",s),this.showToast(`❌ Error al sincronizar: ${s.message}`)}finally{t.disabled=!1,t.innerHTML=e}},formatCurrency(t,e=!0){const s=new Intl.NumberFormat("da-DK",{style:"currency",currency:"DKK"}).format(t);return e?`<span class="blur-money">${s}</span>`:`<span>${s}</span>`},formatDate(t){return t?new Date(t).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}):"-"},getMonthName(t){return["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][t]},generateId(){return Date.now().toString(36)+Math.random().toString(36).substr(2)},showToast(t){const e=document.getElementById("toast");document.getElementById("toast-message").innerHTML=t,e.classList.remove("opacity-0","-translate-y-20","md:translate-y-20"),setTimeout(()=>{e.classList.add("opacity-0","-translate-y-20","md:translate-y-20")},3e3)},setupNavigation(){var t;this.updateNavBadges(),(t=document.getElementById(`nav-d-${this.state.currentView}`))==null||t.classList.add("is-active"),document.addEventListener("keydown",e=>{var s;(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"&&(e.preventDefault(),(s=document.getElementById("gs-input"))==null||s.focus())}),document.addEventListener("click",e=>{e.target.closest("#gs-root")||this.gsClose(),this.state.periodOpen&&!e.target.closest(".cx-period")&&(this.state.periodOpen=null,document.querySelectorAll(".cx-period-pop").forEach(s=>s.classList.add("hidden")),document.querySelectorAll(".cx-period .cx-caret").forEach(s=>s.classList.remove("rotate-180")))})},setupMobileMenu(){},togglePrivacyMode(){this.state.privacyMode=!this.state.privacyMode,this.state.privacyMode?document.body.classList.add("privacy-active"):document.body.classList.remove("privacy-active");const t=this.state.privacyMode?"ph-bold ph-eye-slash":"ph-bold ph-eye",e=document.querySelector("#privacy-toggle-desktop i"),s=document.querySelector("#privacy-toggle-mobile i");e&&(e.className=t),s&&(s.className=t),this.showToast(this.state.privacyMode?"🔒 Modo Privacidad Activado":"👁️ Modo Privacidad Desactivado")},toggleMobileMenu(){const t=document.getElementById("mobile-menu"),e=document.getElementById("mobile-menu-overlay");!t||!e||(t.classList.contains("translate-y-full")?(t.classList.remove("translate-y-full"),e.classList.remove("hidden")):(t.classList.add("translate-y-full"),e.classList.add("hidden")))},toggleVinylAdvanced(){const t=document.getElementById("vinyl-advanced-options"),e=document.getElementById("vinyl-advanced-caret");if(!t)return;const s=t.classList.toggle("hidden");e&&(e.classList.toggle("ph-caret-down",s),e.classList.toggle("ph-caret-up",!s))},gsSearch(t){const e=document.getElementById("gs-panel"),s=document.getElementById("gs-input");if(!e)return;const a=this.normalizeText(t);if(!a){this.gsClose();return}const o=(...p)=>p.some(b=>this.normalizeText(String(b??"")).includes(a)),i=p=>String(p??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),r=[],n=[],c=[["dashboard","Dashboard","ph-squares-four"],["sales","Ventas","ph-shopping-cart"],["pos","POS","ph-cash-register"],["shipping","Envíos","ph-truck"],["calendar","Calendario","ph-calendar-blank"],["inventory","Inventario","ph-vinyl-record"],["newsletter","Drops & Newsletter","ph-paper-plane-tilt"],["consignments","Consignaciones","ph-handshake"],["webshop","Web shop","ph-storefront"],["expenses","Registro Compras","ph-file-text"],["extraIncome","Ingresos Extra","ph-coins"],["investments","Inversiones","ph-piggy-bank"],["contabilidad","Contabilidad","ph-receipt"],["vatReport","Reporte VAT","ph-bank"],["facturasManual","Generar Factura","ph-note-pencil"],["backup","Respaldo","ph-cloud-arrow-up"],["settings","Configuración","ph-gear"],["datosLegales","Datos Legales","ph-info"]].filter(([,p])=>o(p)).slice(0,4);c.length&&n.push({title:"Secciones",rows:c.map(([p,b,y])=>({html:`<span class="gs-thumb"><i class="ph ${y}"></i></span><span class="gs-main"><b>${b}</b><small>Ir a la sección</small></span>`,run:()=>this.navigate(p)}))});const l=(this.state.inventory||[]).filter(p=>o(p.artist,p.album,p.sku,p.label,p.lot)).sort((p,b)=>(Number(b.stock)>0)-(Number(p.stock)>0)).slice(0,6);l.length&&n.push({title:"Discos",rows:l.map(p=>({html:`<span class="gs-thumb">${p.cover_image?`<img src="${i(p.cover_image)}" alt="">`:'<i class="ph ph-vinyl-record"></i>'}</span>
                   <span class="gs-main"><b>${i(p.album)}</b><small>${i(p.artist)} · ${i(p.sku)}</small></span>
                   <span class="gs-side">${this.formatCurrency(p.price,!1)}<span class="cx-stock ${Number(p.stock)>0?"":"is-out"}">${Number(p.stock)>0?"Stock "+p.stock:"Agotado"}</span></span>`,run:()=>this.openProductModal(p.id)}))});const d=(this.state.sales||[]).filter(p=>o(p.customerName,p.customerEmail,p.id,...(p.items||[]).map(b=>b.album))).sort((p,b)=>new Date(b.date||0)-new Date(p.date||0)).slice(0,5);d.length&&n.push({title:"Ventas",rows:d.map(p=>({html:`<span class="gs-thumb"><i class="ph ph-shopping-cart"></i></span>
                   <span class="gs-main"><b>${i(p.items&&p.items[0]&&p.items[0].album||p.customerName||"Venta")}${p.items&&p.items.length>1?` y ${p.items.length-1} más`:""}</b><small>${i(p.customerName||"Sin cliente")} · ${this.formatDate(p.date)} · ${i(p.channel||"Tienda")}</small></span>
                   <span class="gs-side">${this.formatCurrency(Number(p.total_amount||p.total)||0)}</span>`,run:()=>{this.navigate("sales"),this.openUnifiedOrderDetailModal(p.id)}}))});const h=(this.state.expenses||[]).filter(p=>o(p.proveedor,p.descripcion,p.description,p.categoria_label)).sort((p,b)=>new Date(b.date||b.fecha_factura||0)-new Date(p.date||p.fecha_factura||0)).slice(0,4);h.length&&n.push({title:"Gastos",rows:h.map(p=>({html:`<span class="gs-thumb"><i class="ph ph-receipt"></i></span>
                   <span class="gs-main"><b>${i(p.proveedor||p.descripcion||"Gasto")}</b><small>${this.formatDate(p.date||p.fecha_factura)} · ${i(p.categoria_label||p.categoria||"")}</small></span>
                   <span class="gs-side">${this.formatCurrency(Number(p.monto_total||p.amount)||0)}</span>`,run:()=>{this.navigate("expenses"),this.editExpense(p.id)}}))});const u=(this.state.consignors||[]).filter(p=>o(p.name,p.email)).slice(0,3);u.length&&n.push({title:"Consignatarios",rows:u.map(p=>({html:`<span class="gs-thumb"><i class="ph ph-handshake"></i></span><span class="gs-main"><b>${i(p.name)}</b><small>${i(p.email||"Consignación")}</small></span>`,run:()=>this.navigate("consignments")}))}),this._gs={results:r,active:0},e.innerHTML=n.length?n.map(p=>`
            <p class="gs-group">${p.title}</p>
            ${p.rows.map(b=>{r.push(b);const y=r.length-1;return`<button type="button" role="option" data-gs="${y}" class="gs-row ${y===0?"is-active":""}" onmousedown="event.preventDefault()" onclick="app.gsGo(${y})">${b.html}</button>`}).join("")}
        `).join(""):`<p class="gs-empty">Nada coincide con "${i(t.trim())}". Probá con artista, título, SKU, cliente o proveedor.</p>`,e.classList.remove("hidden"),s==null||s.setAttribute("aria-expanded","true")},gsKey(t){var s;const e=this._gs;if(t.key==="Escape"){t.target.value="",this.gsClose(),t.target.blur();return}!e||!e.results.length||(t.key==="ArrowDown"||t.key==="ArrowUp"?(t.preventDefault(),e.active=(e.active+(t.key==="ArrowDown"?1:-1)+e.results.length)%e.results.length,document.querySelectorAll("#gs-panel .gs-row").forEach(a=>a.classList.toggle("is-active",Number(a.dataset.gs)===e.active)),(s=document.querySelector(`#gs-panel [data-gs="${e.active}"]`))==null||s.scrollIntoView({block:"nearest"})):t.key==="Enter"&&(t.preventDefault(),this.gsGo(e.active)))},gsGo(t){const e=this._gs&&this._gs.results[t];if(!e)return;const s=document.getElementById("gs-input");s&&(s.value="",s.blur()),this.gsClose(),e.run()},gsClose(){var t,e;(t=document.getElementById("gs-panel"))==null||t.classList.add("hidden"),(e=document.getElementById("gs-input"))==null||e.setAttribute("aria-expanded","false")},updateNavBadges(){const t=(o,i)=>{const r=document.getElementById(o);r&&(i>0?(r.textContent=i>99?"99+":i,r.classList.remove("hidden")):r.classList.add("hidden"))},e=(this.state.expenses||[]).filter(o=>!o.receiptUrl&&!o.comprobante&&o.receiptPending!==!1&&!o.receiptExempt).length;t("nav-badge-expenses",e);const s=["shipped","picked_up","delivered","fulfilled","canceled"],a=(this.state.sales||[]).filter(o=>this.isShippableChannel(o)?!s.includes((o.fulfillment_status||"").toLowerCase()):!1).length;t("nav-badge-shipping",a)},sectionHeader({title:t,subtitle:e="",primary:s=null,filters:a=""}){const o=s?`
            <button onclick="${s.onclick}" class="${s.class||"cx-btn is-primary"}">
                <i class="ph-bold ${s.icon||"ph-plus"}"></i>
                <span class="hidden sm:inline">${s.label}</span>
            </button>`:"";return`
            <div class="flex flex-wrap justify-between items-end gap-4 mb-6">
                <div>
                    <h2 class="cx-title">${t}</h2>
                    ${e?`<p class="cx-sub">${e}</p>`:""}
                </div>
                <div class="flex flex-wrap gap-2 items-center">
                    ${a}
                    ${o}
                </div>
            </div>`},showFinancialReportModal(){const t="financialReportModal";document.getElementById(t)&&document.getElementById(t).remove();const e=new Date,s=new Date(e.getFullYear(),e.getMonth(),1).toISOString().split("T")[0],a=e.toISOString().split("T")[0],o=`
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
                                <input type="date" id="reportEndDate" value="${a}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all">
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
        `;document.body.insertAdjacentHTML("beforeend",o)},async downloadFinancialReport(){const t=document.getElementById("reportStartDate").value,e=document.getElementById("reportEndDate").value,s=document.getElementById("btnDownloadReport");if(!t||!e){Se.showToast("Por favor, selecciona ambas fechas","error");return}if(t>e){Se.showToast('La fecha "Desde" no puede ser mayor a "Hasta"',"error");return}const a=s.innerHTML;s.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> Procesando...',s.disabled=!0,s.classList.add("opacity-70","cursor-not-allowed");try{const o=te.currentUser?await te.currentUser.getIdToken():"",i=`${j}/api/reports/financial?startDate=${t}&endDate=${e}`,r=await fetch(i,{method:"GET",headers:{Authorization:`Bearer ${o}`}});if(!r.ok)throw new Error(`Error al generar el reporte: ${r.statusText}`);const n=await r.blob(),c=window.URL.createObjectURL(n),l=document.createElement("a");l.href=c,l.download=`Reporte_Financiero_${t}_al_${e}.xlsx`,document.body.appendChild(l),l.click(),document.body.removeChild(l),window.URL.revokeObjectURL(c),document.getElementById("financialReportModal").remove(),Se.showToast("Reporte descargado con éxito")}catch(o){console.error("Error downloading report:",o),Se.showToast(o.message,"error")}finally{document.getElementById("btnDownloadReport")&&(s.innerHTML=a,s.disabled=!1,s.classList.remove("opacity-70","cursor-not-allowed"))}},cxPeriodKeys(t){return{main:{y:"filterYear",m:"filterMonths"},expenses:{y:"expenseFilterYear",m:"expenseFilterMonths"},income:{y:"incomeFilterYear",m:"incomeFilterMonths"}}[t]},cxPeriodLabel(t,e){const s=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],a=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],o=[...e].sort((r,n)=>r-n);return o.length===12?`Todo ${t}`:o.length===1?`${s[o[0]]} ${t}`:o.every((r,n)=>n===0||r===o[n-1]+1)?`${a[o[0]]} a ${a[o[o.length-1]]} ${t}`:o.length<=3?`${o.map(r=>a[r]).join(", ")} ${t}`:`${o.length} meses de ${t}`},cxPeriodPicker(t,e="left"){const s=this.cxPeriodKeys(t),a=this.state[s.y],o=this.state[s.m]||[],i=this.state.periodOpen===t,r=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],n=new Date,c=2025,l=n.getFullYear(),d=o.length===12;return`
        <div class="cx-period ${e==="right"?"is-right":""}" onclick="event.stopPropagation()">
            <button type="button" class="cx-frost-pill" onclick="app.cxPeriodOpen('${t}')" aria-haspopup="dialog" aria-expanded="${i}">
                <i class="ph ph-calendar-blank"></i>
                <span>${this.cxPeriodLabel(a,o)}</span>
                <i class="ph ph-caret-down cx-caret ${i?"rotate-180":""}"></i>
            </button>
            <div class="cx-period-pop ${i?"":"hidden"}" role="dialog" aria-label="Elegir meses">
                <div class="flex items-center justify-between mb-3">
                    <button type="button" class="cx-row-btn" onclick="app.cxPeriodYear('${t}', -1)" ${a<=c?'disabled style="opacity:.3"':""} aria-label="Año anterior"><i class="ph-bold ph-caret-left"></i></button>
                    <b class="text-lg font-semibold">${a}</b>
                    <button type="button" class="cx-row-btn" onclick="app.cxPeriodYear('${t}', 1)" ${a>=l?'disabled style="opacity:.3"':""} aria-label="Año siguiente"><i class="ph-bold ph-caret-right"></i></button>
                </div>
                <div class="grid grid-cols-4 gap-1.5">
                    ${r.map((h,u)=>{const p=a===l&&u>n.getMonth();return`<button type="button" class="cx-pm ${!d&&o.includes(u)?"is-on":""} ${d?"is-all":""} ${a===n.getFullYear()&&u===n.getMonth()?"is-now":""} ${p?"opacity-40":""}" onclick="app.cxPeriodToggle('${t}', ${u})">${h}</button>`}).join("")}
                </div>
                <p class="text-xs text-stone-500 mt-3">Tocá varios meses para sumarlos.</p>
                <div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-black/10">
                    <button type="button" class="cx-pm-preset" onclick="app.cxPeriodPreset('${t}', 'now')">Este mes</button>
                    <button type="button" class="cx-pm-preset" onclick="app.cxPeriodPreset('${t}', 'quarter')">Este trimestre</button>
                    <button type="button" class="cx-pm-preset ${d?"is-on":""}" onclick="app.cxPeriodPreset('${t}', 'all')">Todo el año</button>
                </div>
            </div>
        </div>`},cxPeriodOpen(t){this.state.periodOpen=this.state.periodOpen===t?null:t,this.refreshCurrentView()},cxPeriodToggle(t,e){const s=this.cxPeriodKeys(t);let a=[...this.state[s.m]||[]];a.length===12?a=[e]:a.includes(e)?a.length>1&&(a=a.filter(o=>o!==e)):a.push(e),this.state[s.m]=a.sort((o,i)=>o-i),this.refreshCurrentView()},cxPeriodPreset(t,e){const s=this.cxPeriodKeys(t),a=new Date;if(e==="all"&&(this.state[s.m]=[0,1,2,3,4,5,6,7,8,9,10,11]),e==="now"&&(this.state[s.y]=a.getFullYear(),this.state[s.m]=[a.getMonth()]),e==="quarter"){const o=Math.floor(a.getMonth()/3)*3;this.state[s.y]=a.getFullYear(),this.state[s.m]=[o,o+1,o+2]}this.refreshCurrentView()},cxPeriodYear(t,e){const s=this.cxPeriodKeys(t);this.state[s.y]=(Number(this.state[s.y])||new Date().getFullYear())+e,this.refreshCurrentView()},renderDashboard(t){var e,s;try{const a=this.state.filterMonths,o=this.state.filterYear,i=this.state.sales.filter(x=>{var J;if(this.normalizeSaleChannel(x)==="manual")return!1;const S=(J=x.timestamp)!=null&&J.toDate?x.timestamp.toDate():new Date(x.timestamp||x.date);return S.getFullYear()===o&&a.includes(S.getMonth())}),r=[...i].sort((x,S)=>{var R,N;const J=(R=x.timestamp)!=null&&R.toDate?x.timestamp.toDate():new Date(x.timestamp||x.date);return((N=S.timestamp)!=null&&N.toDate?S.timestamp.toDate():new Date(S.timestamp||S.date))-J}),n=[...this.state.sales.filter(x=>this.normalizeSaleChannel(x)!=="manual").map(x=>({...x,type:"sale",sortDate:new Date(x.date)})),...this.state.expenses.map(x=>({...x,type:"expense",sortDate:new Date(x.date||x.fecha_factura)}))].sort((x,S)=>S.sortDate-x.sortDate).slice(0,5),c=[],l=[];for(let x=29;x>=0;x--){const S=new Date;S.setDate(S.getDate()-x);const J=S.toISOString().split("T")[0];c.push(S.getDate());const L=this.state.sales.filter(R=>R.date===J).reduce((R,N)=>R+(Number(N.total||N.total_amount)||0),0);l.push(L)}const d=new Date,h=d.getMonth(),u=d.getFullYear(),p=h===0?11:h-1,b=h===0?u-1:u,y=this.state.sales.filter(x=>{const S=new Date(x.date);return S.getMonth()===h&&S.getFullYear()===u}).reduce((x,S)=>x+(Number(S.originalTotal||S.total_amount||S.total)||0),0)+(this.state.extraIncome||[]).filter(x=>{const S=new Date(x.date);return S.getMonth()===h&&S.getFullYear()===u}).reduce((x,S)=>x+(Number(S.amount)||0),0),v=this.state.sales.filter(x=>{const S=new Date(x.date);return S.getMonth()===p&&S.getFullYear()===b}).reduce((x,S)=>x+(Number(S.originalTotal||S.total_amount||S.total)||0),0)+(this.state.extraIncome||[]).filter(x=>{const S=new Date(x.date);return S.getMonth()===p&&S.getFullYear()===b}).reduce((x,S)=>x+(Number(S.amount)||0),0),E=v>0?(y-v)/v*100:0,$=`${E>=0?"+":""}${E.toFixed(1)}% vs ${this.getMonthName(p)}`;let I=0,C=0,m=0,g=0,f=0,k=0,_=0,M=0;i.forEach(x=>{var ke;const S=((ke=x.channel)==null?void 0:ke.toLowerCase())==="discogs",J=Number(x.originalTotal)||Number(x.total_amount)||Number(x.total)||0,L=Number(x.total)||Number(x.total_amount)||0,R=S?J-L:0,N=Number(x.shipping_cost)||0;I+=J,m+=N;let ne=0;const fe=x.items||[];fe.length>0?fe.forEach(ie=>{const he=Number(ie.priceAtSale||ie.unitPrice||ie.price)||0,Te=Number(ie.qty||ie.quantity)||1;let xe=Number(ie.costAtSale||ie.cost)||0;const Be=(ie.owner||"").toLowerCase();let $e=ie.providerOrigin||ie.provider_origin;const Ke=he*Te;if(xe===0||!$e){const ye=ie.productId||ie.recordId,Ae=ie.album,Me=this.state.inventory.find(Pe=>ye&&(Pe.id===ye||Pe.sku===ye)||Ae&&Pe.album===Ae);Me&&(xe===0&&(xe=Me.cost||0),$e||($e=Me.provider_origin))}if($e||($e="Local_Used"),$e==="EU_B2B"||$e==="DK_B2B")f+=Ke*.2;else{const ye=Ke-xe*Te;k+=ye>0?ye*.2:0}if(Be==="el cuartito"||Be==="")xe=Number(ie.costAtSale||ie.cost)||0;else{if(xe===0||isNaN(xe)){const ye=this.state.consignors?this.state.consignors.find(Me=>(Me.name||"").toLowerCase()===Be):null,Ae=ye&&(ye.agreementSplit||ye.split)||70;xe=he*(Number(Ae)||70)/100}g+=xe*Te}ne+=(he-xe)*Te}):(ne=J,f+=J*.2);const me=parseFloat(x.shipping_income||x.shipping||x.shipping_cost||0);me>0&&(_+=me*.2,M+=me),C+=ne-R});const A=(this.state.extraIncome||[]).filter(x=>{const S=new Date(x.date);return S.getFullYear()===o&&a.includes(S.getMonth())});let B=0;A.forEach(x=>{const S=Number(x.amount)||0,J=Number(x.vatAmount)||0;B+=S,I+=S,C+=S,f+=J});const P=this.state.expenses.filter(x=>{var L;const S=x.fecha_factura?new Date(x.fecha_factura):(L=x.timestamp)!=null&&L.toDate?x.timestamp.toDate():new Date(x.timestamp||x.date);return(x.categoria_tipo==="operativo"||x.categoria_tipo==="stock_nuevo"||x.is_vat_deductible)&&S.getFullYear()===o&&a.includes(S.getMonth())}).reduce((x,S)=>x+(parseFloat(S.monto_iva)||0),0),V=(this.state.inventory||[]).filter(x=>{if(!x.item_phantom_vat||x.item_phantom_vat<=0||x.provider_origin!=="EU_B2B")return!1;const S=x.acquisition_date?new Date(x.acquisition_date):null;return S?S.getFullYear()===o&&a.includes(S.getMonth()):!1}).reduce((x,S)=>x+(S.item_phantom_vat||0),0),H=(this.state.inventory||[]).filter(x=>{if(!x.item_real_vat||x.item_real_vat<=0||x.provider_origin!=="DK_B2B")return!1;const S=x.acquisition_date?new Date(x.acquisition_date):null;return S?S.getFullYear()===o&&a.includes(S.getMonth()):!1}).reduce((x,S)=>x+(S.item_real_vat||0),0),Z=f+k+_+V,Q=P+V+H,D=Z-Q,U=this.state.expenses.filter(x=>{const S=new Date(x.date||x.fecha_factura);return S.getFullYear()===o&&a.includes(S.getMonth())}).reduce((x,S)=>x+(Number(S.monto_total||S.amount)||0),0),se=C-U,ae=C,q=this.state.inventory.reduce((x,S)=>x+S.price*S.stock,0),ce=this.state.inventory.reduce((x,S)=>x+S.stock,0),re=this.state.sales.filter(x=>{var S;return this.isShippableChannel(x)&&(x.fulfillment_status==="preparing"||x.status==="paid"||((S=x.channel)==null?void 0:S.toLowerCase())==="discogs"&&x.status!=="shipped"&&x.fulfillment_status!=="shipped")}),X=D,ee=this.state.inventory.reduce((x,S)=>x+(parseFloat(S.cost)||0)*(Number(S.stock)||0),0),z=(this.state.expenses||[]).filter(x=>!x.receiptUrl&&!x.comprobante).length,G=new Set;let Y=0;(this.state.expenses||[]).forEach(x=>{const S=`${x.date||x.fecha_factura||""}|${(x.description||x.proveedor||"").toLowerCase().trim()}|${Number(x.monto_total||x.amount||0).toFixed(2)}`;G.has(S)?Y++:G.add(S)});const oe=a.length===12?`Año ${o} `:`${a.map(x=>this.getMonthName(x)).join(", ")} ${o} `,O=this.state.dashboardAnalysisMode||"genre",K={},de={};let pe=0,Ee=0,we=0;i.forEach(x=>{const S=x.items||[],J=(L,R)=>{const N=this.state.inventory.find(he=>L&&(he.id===L||he.sku===L)||R&&he.album===R);if(!N)return null;if(O==="storage")return N.storageLocation||null;const ne=[N.genre,N.genre2,N.genre3,N.genre4,N.genre5].filter(Boolean),fe=[];ne.forEach(he=>{fe.push(...he.split(",").map(Te=>Te.trim()).filter(Boolean))});const me=[...new Set(fe)],ke=me.filter(he=>he.toLowerCase()!=="electronic");return(ke.length>0?ke:me.length>0?me:["Otros"])[0]||null};if(S.length>0)S.forEach(L=>{const R=L.productId||L.recordId,N=J(R,L.album)||(O==="storage"?"Sin ubicación":x.genre||"Otros"),ne=Number(L.qty||L.quantity)||1,fe=Number(L.priceAtSale||L.unitPrice||L.price)||0;K[N]=(K[N]||0)+ne,de[N]=(de[N]||0)+fe*ne,pe+=ne,(L.productCondition||L.condition||"Used")==="New"?Ee+=ne:we+=ne});else{const L=Number(x.quantity)||1,R=Number(x.originalTotal||x.total_amount||x.total)||0,N=O==="storage"?"Sin ubicación":x.genre||"Otros";K[N]=(K[N]||0)+L,de[N]=(de[N]||0)+R,pe+=L,we+=L}});const ge=Object.entries(K).sort((x,S)=>S[1]-x[1]),De=Object.entries(de).sort((x,S)=>S[1]-x[1]),ue=De.length>0?{name:De[0][0],revenue:De[0][1]}:{name:"N/A",revenue:0},be=i.length>0?I/i.length:0,ve=pe>0?Math.round(Ee/pe*100):0,Ie=pe>0?Math.round(we/pe*100):0,Ce=["#F05A28","#E2C531","#1A1A1A","#F2955E","#8A857C","#5B4636","#C9B7A0","#B4532A","#6E8B74"],qe=O==="storage"?"Análisis por Ubicación":"Análisis por Género Musical",Ue=O==="storage"?"ph-map-pin":"ph-music-notes-simple",Oe=O==="storage"?"Ubicación Más Rentable":"Género Más Rentable",at=a.length===12?`todo ${o}`:`${a.map(x=>this.getMonthName(x)).join(", ")} ${o}`,ot=O==="storage"?"Ubicación más rentable":"Género más rentable",it=`
            <div class="cx-view">
            <div class="max-w-7xl mx-auto pb-24 md:pb-10 px-4 md:px-8 pt-8 space-y-4">
                <!-- Header -->
                <div class="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 pb-2">
                    <div>
                        <h2 class="cx-title">Dashboard</h2>
                        <p class="cx-sub">Actividad de ${at}</p>
                    </div>
                    <div class="flex items-center gap-2 max-w-full">
                        ${this.cxPeriodPicker("main","right")}
                        <button onclick="app.showFinancialReportModal()" class="cx-topbtn shrink-0" title="Exportar reporte" aria-label="Exportar reporte">
                            <i class="ph ph-download-simple"></i>
                        </button>
                    </div>
                </div>

                <!-- Bento -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">

                    <!-- Ventas -->
                    <button onclick="app.navigate('sales')" class="cx-card cx-yellow md:col-span-2 lg:col-span-5 text-left">
                        <span class="cx-card-head">Ventas</span>
                        <div class="cx-deco-y" aria-hidden="true"><span class="cx-stripes"></span><span class="cx-fade-tile"></span></div>
                        <p class="cx-big">${this.formatCurrency(I)}</p>
                        <p class="cx-delta ${E>=0?"":"is-down"}">${$}</p>
                        <div class="cx-steps">
                            <div style="--h:0"><b>${i.length}</b><span>Ventas</span></div>
                            <div style="--h:1"><b>${this.formatCurrency(be)}</b><span>Ticket promedio</span></div>
                            <div style="--h:2"><b class="${se>=0?"":"cx-neg"}">${this.formatCurrency(se)}</b><span>Margen</span></div>
                        </div>
                    </button>

                    <!-- Stock -->
                    <button onclick="app.navigate('inventory')" class="cx-card cx-orange lg:col-span-3 text-left">
                        <span class="cx-card-head">Stock</span>
                        <div class="cx-sun" aria-hidden="true"></div>
                        <p class="cx-big cx-big-sm">${this.formatCurrency(ee)}</p>
                        <p class="cx-delta">a costo</p>
                        <span class="cx-pill mt-3">${ce} discos</span>
                        <ul class="cx-legend">
                            <li><i class="cx-dot"></i>Vendido nuevo ${ve}%</li>
                            <li><i class="cx-dot is-ring"></i>Vendido usado ${Ie}%</li>
                        </ul>
                    </button>

                    <!-- Más rentable + Moms -->
                    <div class="cx-card cx-dark md:col-span-1 lg:col-span-4 lg:row-span-2">
                        <div class="cx-card-head">
                            <span>${ot}</span>
                            <button onclick="app.navigate('inventory')" class="cx-chip-icon" title="Ver inventario" aria-label="Ver inventario"><i class="ph ph-arrow-up-right"></i></button>
                        </div>
                        <div class="cx-vinyl-stage" aria-hidden="true">
                            <span class="cx-sleeve"></span>
                            <span class="cx-vinyl"><span></span></span>
                        </div>
                        <span class="cx-tag"><i class="ph-fill ph-fire"></i> ${pe} uds vendidas</span>
                        <p class="cx-feature">${ue.name}</p>
                        <p class="cx-feature-sub">${this.formatCurrency(ue.revenue)} en ingresos</p>

                        <button onclick="app.navigate('vatReport')" class="cx-moms">
                            <div class="min-w-0">
                                <span class="cx-moms-label">Moms tilsvar</span>
                                <b class="cx-moms-value ${X>0?"is-owed":"is-credit"}">${this.formatCurrency(X)}</b>
                                <div class="cx-moms-split">
                                    <span>Output<br><b>${this.formatCurrency(Z)}</b></span>
                                    <span>Input<br><b>-${this.formatCurrency(Q)}</b></span>
                                </div>
                            </div>
                            <span class="cx-sq"><i class="ph ph-bank"></i></span>
                        </button>
                    </div>

                    <!-- Ingresos 30 días + alertas -->
                    <div class="cx-panel md:col-span-1 lg:col-span-8">
                        <div class="flex flex-wrap justify-between items-start gap-3 mb-4">
                            <div>
                                <h3 class="cx-h">Ingresos</h3>
                                <p class="cx-sub !mt-0.5">Últimos 30 días</p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <button onclick="app.state.expenseMissingReceiptOnly = true; app.navigate('expenses')" class="cx-alert ${z>0?"is-hot":""}"><b>${z}</b>Gastos sin comprobante</button>
                                <button onclick="app.navigate('expenses')" class="cx-alert ${Y>0?"is-warn":""}"><b>${Y}</b>Posibles duplicados</button>
                                <button onclick="app.navigate('shipping')" class="cx-alert ${re.length>0?"is-hot":""}"><b>${re.length}</b>Envíos pendientes</button>
                            </div>
                        </div>
                        <div class="h-56">
                            <canvas id="last30DaysChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Análisis por Categoría (Género / Ubicación) -->
                <div class="cx-panel">
                    <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-3">
                        <div>
                            <h3 class="cx-h">${O==="storage"?"Ventas por ubicación":"Ventas por género"}</h3>
                            <p class="cx-sub !mt-0.5">${pe} unidades vendidas en el período</p>
                        </div>
                        <div class="cx-glass flex p-1 rounded-full">
                            <button onclick="app.state.dashboardAnalysisMode = 'genre'; app.renderDashboard(document.getElementById('app-content'))" class="cx-month ${O==="genre"?"is-on":""}">Género</button>
                            <button onclick="app.state.dashboardAnalysisMode = 'storage'; app.renderDashboard(document.getElementById('app-content'))" class="cx-month ${O==="storage"?"is-on":""}">Ubicación</button>
                        </div>
                    </div>
                    ${ge.length>0?`
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div class="lg:col-span-5">
                            <div class="h-80">
                                <canvas id="genreDonutChart"></canvas>
                            </div>
                        </div>
                        <div class="lg:col-span-7">
                            <div style="height: ${Math.max(280,ge.length*40)}px">
                                <canvas id="genreBarChart"></canvas>
                            </div>
                        </div>
                    </div>
                    `:`
                    <div class="text-center py-12">
                        <i class="ph ph-vinyl-record text-4xl text-stone-400 mb-3 block"></i>
                        <p class="text-sm text-stone-500 font-medium">No hay ventas en este período. Elegí otro mes arriba.</p>
                    </div>
                    `}
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <!-- Últimos movimientos -->
                    <div class="cx-panel lg:col-span-8 !p-0 overflow-hidden">
                        <div class="px-6 pt-6 pb-3">
                            <h3 class="cx-h">Últimos movimientos</h3>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="cx-table w-full text-left">
                                <thead>
                                    <tr><th>Concepto</th><th>Fecha</th><th>Tipo</th><th class="text-right">Monto</th></tr>
                                </thead>
                                <tbody>
                                    ${n.map(x=>{const S=x.type==="sale",J=S?x.album||"Venta de items":x.proveedor||x.description||"Gasto registrado",L=S?x.channel||"Tienda local":x.categoria||"Operativo";let R="ph-receipt";if(S){const N=(x.channel||"").toLowerCase();N.includes("web")&&(R="ph-globe-simple"),N.includes("discogs")&&(R="ph-vinyl-record")}else R="ph-credit-card";return`
                                        <tr>
                                            <td>
                                                <div class="flex items-center gap-3">
                                                    <span class="cx-thumb"><i class="ph ${R}"></i></span>
                                                    <div class="min-w-0">
                                                        <div class="font-semibold text-sm truncate max-w-[220px]" title="${J}">${J}</div>
                                                        <div class="text-[11px] text-stone-500 truncate max-w-[220px]">${L}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="text-xs text-stone-500 whitespace-nowrap">${this.formatDate(x.date||x.fecha_factura)}</td>
                                            <td><span class="cx-type ${S?"is-sale":"is-expense"}">${S?"Venta":"Gasto"}</span></td>
                                            <td class="text-right font-semibold text-sm whitespace-nowrap ${S?"":"cx-neg"}">${S?"":"-"}${this.formatCurrency(x.total||x.monto_total||x.amount||0)}</td>
                                        </tr>
                                    `}).join("")||'<tr><td colspan="4" class="!py-12 text-center text-stone-500">Todavía no hay movimientos. Registrá una venta o un gasto para verlos acá.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Accesos rápidos -->
                    <div class="cx-panel lg:col-span-4">
                        <h3 class="cx-h mb-4">Accesos rápidos</h3>
                        <div class="flex flex-col gap-2">
                            <button onclick="app.navigate('sales')" class="cx-action">
                                <span class="cx-sq"><i class="ph ph-shopping-cart"></i></span>
                                <span class="flex-1 min-w-0"><b>Nueva venta</b><small>Abrir el POS</small></span>
                                <i class="ph ph-caret-right text-stone-400"></i>
                            </button>
                            <button onclick="app.navigate('expenses')" class="cx-action">
                                <span class="cx-sq is-orange"><i class="ph ph-receipt"></i></span>
                                <span class="flex-1 min-w-0"><b>Cargar compra o gasto</b><small>Registrar una factura</small></span>
                                <i class="ph ph-caret-right text-stone-400"></i>
                            </button>
                            <button onclick="app.openAddVinylModal()" class="cx-action">
                                <span class="cx-sq is-ink"><i class="ph ph-plus"></i></span>
                                <span class="flex-1 min-w-0"><b>Agregar stock</b><small>Alta de discos o lotes</small></span>
                                <i class="ph ph-caret-right text-stone-400"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        `;t.innerHTML=it,this.renderDashboardCharts(i,c,l);const ze=(e=document.getElementById("genreDonutChart"))==null?void 0:e.getContext("2d");if(ze&&ge.length>0){this.genreDonutChartInstance&&this.genreDonutChartInstance.destroy();const x=ge.map(L=>L[0]),S=ge.map(L=>L[1]),J=ge.map((L,R)=>Ce[R%Ce.length]);this.genreDonutChartInstance=new Chart(ze,{type:"doughnut",data:{labels:x,datasets:[{data:S,backgroundColor:J,borderWidth:0,hoverOffset:8}]},options:{responsive:!0,maintainAspectRatio:!1,cutout:"62%",plugins:{legend:{position:"bottom",labels:{boxWidth:12,boxHeight:12,borderRadius:3,useBorderRadius:!0,padding:14,font:{size:11,weight:"600",family:"'Manrope', sans-serif"},color:"#1A1A1A"}},tooltip:{backgroundColor:"#1A1A1A",titleFont:{size:11,weight:"700"},bodyFont:{size:13,weight:"700"},padding:14,cornerRadius:12,callbacks:{label:L=>{const R=L.dataset.data.reduce((ne,fe)=>ne+fe,0),N=(L.parsed/R*100).toFixed(1);return` ${L.parsed} uds — ${N}%`}}}}},plugins:[{id:"centerText",beforeDraw(L){const{ctx:R,chartArea:N}=L;if(!N)return;R.save();const ne=(N.left+N.right)/2,fe=(N.top+N.bottom)/2,me=Math.min(N.right-N.left,N.bottom-N.top)/7;R.font=`bold ${me}px 'Manrope', sans-serif`,R.textBaseline="middle",R.textAlign="center",R.fillStyle="#1A1A1A";const ke=L.data.datasets[0].data.reduce((ie,he)=>ie+he,0);R.fillText(ke,ne,fe-me*.35),R.font=`600 ${me*.42}px 'Manrope', sans-serif`,R.fillStyle="#8A857C",R.fillText("unidades",ne,fe+me*.55),R.restore()}}]})}const He=(s=document.getElementById("genreBarChart"))==null?void 0:s.getContext("2d");if(He&&ge.length>0){this.genreBarChartInstance&&this.genreBarChartInstance.destroy();const x=ge.map(L=>L[0]),S=ge.map(L=>L[1]),J=ge.map((L,R)=>Ce[R%Ce.length]);this.genreBarChartInstance=new Chart(He,{type:"bar",data:{labels:x,datasets:[{label:"Unidades",data:S,backgroundColor:J,borderWidth:0,borderRadius:999,borderSkipped:!1,barThickness:16}]},options:{responsive:!0,maintainAspectRatio:!1,indexAxis:"y",plugins:{legend:{display:!1},tooltip:{backgroundColor:"#1A1A1A",titleFont:{size:11,weight:"700"},bodyFont:{size:13,weight:"700"},padding:14,cornerRadius:12,callbacks:{label:L=>` ${L.parsed.x} unidades vendidas`}}},scales:{x:{beginAtZero:!0,grid:{color:"rgba(26,26,26,0.07)"},ticks:{font:{size:10,weight:"600"},color:"#8A857C"}},y:{grid:{display:!1},ticks:{font:{size:11,weight:"600",family:"'Manrope', sans-serif"},color:"#1A1A1A",padding:8}}}}})}}catch(a){console.error("Dashboard render error:",a),t.innerHTML=`<div class="p-12 text-center text-red-500 font-bold bg-red-50 rounded-3xl m-8 border border-red-100">
                <i class="ph-bold ph-warning-circle text-4xl mb-4"></i>
                <p>Error al cargar el dashboard: ${a.message}</p>
                <button onclick="app.loadData()" class="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl">Intentar de nuevo</a>
            </div>`}},renderInventoryCart(){const t=document.getElementById("inventory-cart-container");if(!t)return;if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden");const e=this.state.cart.map((s,a)=>`
    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                <div class="truncate pr-2">
                    <p class="font-bold text-xs text-brand-dark truncate">${s.album}</p>
                    <p class="text-[10px] text-slate-500 truncate">${s.is_rsd_discount?`<span class="line-through opacity-50">${this.formatCurrency(s.price,!1)}</span> <span class="text-orange-600 font-bold">${this.formatCurrency(this.getEffectivePrice(s),!1)}</span>`:this.formatCurrency(s.price,!1)}</p>
                </div>
                <button onclick="app.removeFromCart(${a})" class="text-red-400 hover:text-red-600">
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
                     <span class="font-bold text-brand-dark text-lg">${this.formatCurrency(this.state.cart.reduce((s,a)=>s+this.getEffectivePrice(a),0))}</span>
                </div>
                <button onclick="app.openCheckoutModal()" class="w-full py-2 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 text-sm hover:scale-[1.02] transition-transform">
                    Finalizar Venta
                </a>
            </div>
    `},setInvPage(t){this.state.invPage=t,this.refreshCurrentView();const e=document.getElementById("inventory-content-container");e&&e.scrollIntoView({block:"start",behavior:"smooth"})},setInvPageSize(t){this.state.invPageSize=parseInt(t,10)||50,this.state.invPage=1,this.refreshCurrentView()},renderInvPagination(t,e){const s=this.state.invPageSize||50,a=Math.max(1,Math.ceil(t/s)),o=Math.min(Math.max(1,this.state.invPage||1),a),i=t===0?0:(o-1)*s+1,r=Math.min(o*s,t),n=(d,h,u={})=>`
            <button onclick="app.setInvPage(${d})" ${u.disabled?"disabled":""}
                class="min-w-[36px] h-9 px-2 rounded-lg text-xs font-bold transition-all ${u.active?"bg-brand-orange text-white shadow-lg shadow-brand-orange/20":"bg-white border border-slate-200 text-slate-500 hover:border-brand-orange hover:text-brand-orange"} ${u.disabled?"opacity-40 cursor-not-allowed":""}">
                ${h}
            </button>`;let c="";const l=[];for(let d=Math.max(1,o-2);d<=Math.min(a,o+2);d++)l.push(d);return l[0]>1&&(l.unshift(1),l[1]>2&&l.splice(1,0,"...")),l[l.length-1]<a&&(l[l.length-1]<a-1&&l.push("..."),l.push(a)),l.forEach(d=>{c+=d==="..."?'<span class="text-slate-300 text-xs px-1">…</span>':n(d,d,{active:d===o})}),`
            <div class="flex flex-wrap items-center justify-between gap-3 mt-4" data-pagination="${e}">
                <div class="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <span>Mostrando <b class="text-brand-dark">${i}–${r}</b> de <b class="text-brand-dark">${t}</b></span>
                    <select onchange="app.setInvPageSize(this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-brand-dark outline-none cursor-pointer">
                        ${[25,50,100,200].map(d=>`<option value="${d}" ${d===s?"selected":""}>${d}/pág</option>`).join("")}
                    </select>
                </div>
                <div class="flex items-center gap-1.5">
                    ${n(1,'<i class="ph-bold ph-caret-double-left"></i>',{disabled:o<=1})}
                    ${n(o-1,'<i class="ph-bold ph-caret-left"></i>',{disabled:o<=1})}
                    ${c}
                    ${n(o+1,'<i class="ph-bold ph-caret-right"></i>',{disabled:o>=a})}
                    ${n(a,'<i class="ph-bold ph-caret-double-right"></i>',{disabled:o>=a})}
                </div>
            </div>`},renderInventoryContent(t,e,s,a,o){t.innerHTML=`
            ${this.state.viewMode==="grid"?`
                <!-- GRID VIEW -->
                ${this.state.filterGenre==="all"&&this.state.filterOwner==="all"&&this.state.filterLabel==="all"&&this.state.filterLot==="all"&&this.state.filterStorage==="all"&&this.state.inventorySearch===""?`
                    
                    <div class="space-y-8 animate-fade-in">
                        <!-- Genres Folder -->
                        <div>
                            <h3 class="cx-h mb-4 flex items-center gap-2">
                                Géneros
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                ${s.map(i=>`
                                    <div onclick="app.navigateInventoryFolder('genre', '${i}')" class="cx-folder group">
                                        <div class="cx-folder-icon is-yellow">
                                            <i class="ph-bold ph-folder-notch text-2xl"></i>
                                        </div>
                                        <h4 class="font-semibold text-sm truncate">${i}</h4>
                                        <p class="text-xs text-stone-500">${this.state.inventory.filter(r=>r.genre===i).length} items</p>
                                    </div>
                                `).join("")}
                            </div>
                        </div>

                        <!-- Owners Folder -->
                         <div>
                            <h3 class="cx-h mb-4 flex items-center gap-2">
                                Dueños
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                ${a.map(i=>`
                                    <div onclick="app.navigateInventoryFolder('owner', '${i}')" class="cx-folder group">
                                        <div class="cx-folder-icon is-orange">
                                            <i class="ph-bold ph-folder-user text-2xl"></i>
                                        </div>
                                        <h4 class="font-semibold text-sm truncate">${i}</h4>
                                        <p class="text-xs text-stone-500">${this.state.inventory.filter(r=>r.owner===i).length} items</p>
                                    </div>
                                `).join("")}
                            </div>
                        </div>

                        <!-- Labels Folder (Label Disquería) -->
                         <div>
                            <h3 class="cx-h mb-4 flex items-center gap-2">
                                Label Disquería
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                ${o.map(i=>`
                                    <div onclick="app.navigateInventoryFolder('storage', '${i.replace(/'/g,"\\'")}')" class="cx-folder group">
                                        <div class="cx-folder-icon is-ink">
                                            <i class="ph-bold ph-tag text-2xl"></i>
                                        </div>
                                        <h4 class="font-semibold text-sm truncate">${i}</h4>
                                        <p class="text-xs text-stone-500">${this.state.inventory.filter(r=>r.storageLocation===i).length} items</p>
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    </div>

                    `:` <!-- ITEMS GRID (Filtered) -->
                    <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-fade-in">
                        <!-- Back Button if Filtered -->
                        ${this.state.filterGenre!=="all"||this.state.filterOwner!=="all"||this.state.filterLabel!=="all"||this.state.filterLot!=="all"||this.state.filterStorage!=="all"?`
                            <div onclick="app.clearAllFilters()" 
                                class="col-span-full mb-2 flex items-center gap-2 text-stone-600 hover:text-black cursor-pointer w-fit pl-1 group">
                                <div class="cx-btn is-icon">
                                    <i class="ph-bold ph-arrow-left"></i>
                                </div>
                                <span class="text-sm font-bold">Volver a Carpetas</span>
                            </div>
                        `:""}

                        ${e.map(i=>`
                            <!-- Item Card -->
                            <div class="cx-item group flex flex-col h-full"
                                onclick="app.openProductModal('${i.id}')">
                                <div class="aspect-square bg-stone-200 rounded-2xl overflow-hidden mb-4 relative">
                                     ${i.cover_image?`<img src="${i.cover_image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`:'<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="ph-fill ph-disc text-5xl"></i></div>'}
                                     <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                         <button onclick="event.stopPropagation(); app.addToCart('${i.id}', event)" class="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-shopping-cart text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openProductModal('${i.id}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-eye text-lg"></i>
                                         </button>
                                         <button onclick="event.stopPropagation(); app.openPrintLabelModal('${i.id}')" class="w-10 h-10 rounded-full bg-white text-brand-dark flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                            <i class="ph-bold ph-printer text-lg"></i>
                                         </button>
                                     </div>
                                     <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                         ${this.getStatusBadge(i.condition)}
                                         ${this.getTimeInStockBadge(this.getTimeInStockCategory(i.created_at))}
                                     </div>
                                </div>
                                <div class="flex-1 flex flex-col">
                                    <h3 class="font-semibold leading-tight mb-1 line-clamp-1" title="${i.album}">${i.album}</h3>
                                    <p class="text-xs text-stone-500 mb-3 truncate">${i.artist}</p>
                                    <div class="flex flex-wrap gap-1 mt-1">${this.stockStatusBadges(i)}</div>
                                    <div class="mt-auto flex justify-between items-center pt-3">
                                        <span class="text-xl font-light tracking-tight">${this.formatCurrency(i.price,!1)}</span>
                                        <span class="cx-stock ${i.stock>0?"":"is-out"}">Stock ${i.stock}</span>
                                    </div>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                `}
            `:`
                <!-- LIST VIEW (Table) -->
                <div class="cx-panel !p-0 overflow-hidden relative">
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

                    <table class="cx-inv-table w-full text-left">
                        <thead>
                            <tr>
                                <th class="p-4 w-10">
                                    <input type="checkbox" onchange="app.toggleSelectAll()" 
                                        class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                        ${e.length>0&&e.every(i=>this.state.selectedItems.has(i.sku))?"checked":""}>
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
                        <tbody>
                            ${(()=>{const i=this.state.invPageSize||50,r=Math.max(1,Math.ceil(e.length/i)),n=Math.min(Math.max(1,this.state.invPage||1),r);return this.state.invPage=n,e.slice((n-1)*i,n*i)})().map(i=>`
                                <tr class="inv-row cursor-pointer ${this.state.selectedItems.has(i.id)?"is-selected":""}" 
                                    onclick="app.openProductModal('${i.id}')">
                                    <td class="p-3" onclick="event.stopPropagation()">
                                        <input type="checkbox" onchange="app.toggleSelection('${i.id}')"
                                            class="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-slate-300 cursor-pointer"
                                            ${this.state.selectedItems.has(i.id)?"checked":""}>
                                    </td>
                                    <td class="p-3">
                                        <div class="flex items-center gap-3">
                                            <div class="relative">
                                                <div class="cx-cover">
                                                    ${i.cover_image?`<img src="${i.cover_image}" class="w-full h-full object-cover">`:'<i class="ph-fill ph-disc text-xl"></i>'}
                                                </div>
                                                <div class="absolute -top-1 -right-1 border-2 border-[#ECEAE4] rounded-full">
                                                    ${this.getTimeInStockBadge(this.getTimeInStockCategory(i.created_at))}
                                                </div>
                                            </div>
                                            <div class="min-w-0">
                                                <div class="font-semibold text-sm truncate max-w-[220px]" title="${i.album}">${i.album}</div>
                                                <div class="text-xs text-stone-500 truncate max-w-[220px]">${i.artist}</div>
                                                <div class="flex flex-wrap gap-1 mt-1">${this.stockStatusBadges(i)}</div>
                                                <div class="text-[10px] text-slate-300 font-mono mt-0.5 sm:hidden">${i.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-3 text-xs text-slate-500 font-medium max-w-[100px] truncate hidden md:table-cell">${i.label||"-"}</td>
                                    <td class="p-3 text-center hidden sm:table-cell">${this.getStatusBadge(i.condition)}</td>
                                    <td class="p-3 text-right">
                                        ${i.is_rsd_discount?`<div><span class="text-[10px] text-slate-400 line-through">${this.formatCurrency(i.price,!1)}</span><br><span class="font-bold text-orange-600 font-display text-sm">${this.formatCurrency(this.getEffectivePrice(i),!1)}</span></div>`:`<span class="font-semibold text-sm">${this.formatCurrency(i.price,!1)}</span>`}
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.toggleProductTag('${i.id}', 'hero')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center ${i.tags&&i.tags.includes("hero")?"bg-amber-50 text-amber-500 shadow-sm border border-amber-100":"text-slate-200 hover:bg-slate-50 hover:text-slate-400"}" 
                                            title="Marcar como Destacado">
                                            <i class="ph-fill ph-star text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.toggleProductTag('${i.id}', 'new_arrival')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center ${i.tags&&i.tags.includes("new_arrival")?"bg-blue-50 text-blue-500 shadow-sm border border-blue-100":"text-slate-200 hover:bg-slate-50 hover:text-slate-400"}" 
                                            title="Marcar como Novedad">
                                            <i class="ph-fill ph-sketch-logo text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell" onclick="event.stopPropagation()">
                                        <button onclick="app.openPrintLabelModal('${i.id}')" 
                                            class="w-7 h-7 rounded-lg transition-all flex items-center justify-center text-slate-200 hover:bg-purple-50 hover:text-purple-600" 
                                            title="Imprimir Etiqueta">
                                            <i class="ph-bold ph-printer text-sm"></i>
                                        </button>
                                    </td>
                                    <td class="p-3 text-center hidden sm:table-cell">
                                        <span class="cx-stock ${i.stock>0?"":"is-out"}">
                                            ${i.stock}
                                        </span>
                                    </td>
                                    <td class="p-3 text-center hidden md:table-cell">
                                        ${i.discogs_listing_id?'<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-[#1A1A1A] text-[#F2E14C]" title="Publicado en Discogs"><i class="ph-bold ph-check text-xs"></i></span>':'<span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-white/60 text-stone-400" title="No publicado"><i class="ph-bold ph-minus text-xs"></i></span>'}
                                    </td>
                                    <td class="p-3 text-right" onclick="event.stopPropagation()">
                                        <div class="flex justify-end gap-1">
                                            <button onclick="event.stopPropagation(); app.openAddVinylModal('${i.id}')" class="cx-row-btn" title="Editar">
                                                <i class="ph-bold ph-pencil-simple text-sm"></i>
                                            </button>

                                            <button onclick="event.stopPropagation(); app.addToCart('${i.id}')" class="cx-row-btn is-cart" title="Agregar al carrito">
                                                <i class="ph-bold ph-shopping-cart text-sm"></i>
                                            </button>
                                            <button onclick="event.stopPropagation(); app.deleteVinyl('${i.id}')" class="cx-row-btn is-danger" title="Eliminar">
                                                <i class="ph-bold ph-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
                <div class="cx-panel !px-4 !pt-0 !pb-4 mt-3">
                    ${this.renderInvPagination(e.length,"list")}
                </div>

            `}
        `},renderInventory(t){const e=[...new Set(this.state.inventory.flatMap(f=>{const k=[f.genre,f.genre2,f.genre3,f.genre4,f.genre5].filter(Boolean),_=[];k.forEach(B=>{_.push(...B.split(",").map(W=>W.trim()).filter(Boolean))});const M=[...new Set(_)],A=M.filter(B=>B.toLowerCase()!=="electronic");return A.length>0?A:M.length>0?M:["Otros"]}))].sort(),s=[...new Set(this.state.inventory.map(f=>f.owner).filter(Boolean))].sort(),a=[...new Set(this.state.inventory.map(f=>f.label).filter(Boolean))].sort(),o=[...new Set(this.state.inventory.map(f=>f.lot).filter(Boolean))].sort(),i=[...new Set(this.state.inventory.map(f=>f.storageLocation).filter(Boolean))].sort(),r=this.getFilteredInventory(),n=this.state.sortBy||"dateDesc";r.sort((f,k)=>{if(n==="priceDesc")return(k.price||0)-(f.price||0);if(n==="priceAsc")return(f.price||0)-(k.price||0);if(n==="stockDesc")return(k.stock||0)-(f.stock||0);const _=f.created_at?f.created_at.seconds?f.created_at.seconds*1e3:new Date(f.created_at).getTime():0,M=k.created_at?k.created_at.seconds?k.created_at.seconds*1e3:new Date(k.created_at).getTime():0;return n==="dateDesc"?M-_:n==="dateAsc"?_-M:0});const c=this.state.inventory.length,l=r.reduce((f,k)=>{const _=Number(k.stock)||0;return f+(_>0?(parseFloat(k.price)||0)*_:0)},0),d=r.filter(f=>(f.stock||0)>0).length,h=r.reduce((f,k)=>f+Math.max(Number(k.stock)||0,0),0),u=r.reduce((f,k)=>{const _=Number(k.stock)||0;return f+(_>0?(parseFloat(k.cost)||0)*_:0)},0),p=[];if(this.state.filterStock==="inStock"&&p.push({key:"filterStock",label:"Solo en Stock",icon:"ph-check-circle"}),this.state.filterStock==="outOfStock"&&p.push({key:"filterStock",label:"Solo Agotados",icon:"ph-x-circle"}),this.state.filterDiscogs==="yes"&&p.push({key:"filterDiscogs",label:"En Discogs",icon:"ph-disc"}),this.state.filterDiscogs==="no"&&p.push({key:"filterDiscogs",label:"No en Discogs",icon:"ph-disc"}),this.state.filterCondition==="used"&&p.push({key:"filterCondition",label:"Brugtmoms (Usados)",icon:"ph-recycle"}),this.state.filterCondition==="new"&&p.push({key:"filterCondition",label:"Nuevos",icon:"ph-sparkle"}),this.state.filterGenre!=="all"&&p.push({key:"filterGenre",label:`Género: ${this.state.filterGenre}`,icon:"ph-music-notes"}),this.state.filterLabel!=="all"&&p.push({key:"filterLabel",label:`Sello: ${this.state.filterLabel}`,icon:"ph-vinyl-record"}),this.state.filterLot!=="all"&&p.push({key:"filterLot",label:`Lote: ${this.state.filterLot}`,icon:"ph-package"}),this.state.filterOwner!=="all"&&p.push({key:"filterOwner",label:`Dueño: ${this.state.filterOwner}`,icon:"ph-user"}),this.state.filterStorage!=="all"&&p.push({key:"filterStorage",label:`Disquería: ${this.state.filterStorage}`,icon:"ph-tag"}),this.state.filterHero==="yes"&&p.push({key:"filterHero",label:"Destacados",icon:"ph-star"}),(this.state.filterPriceMin||this.state.filterPriceMax)&&p.push({key:"filterPrice",label:`Precio: ${this.state.filterPriceMin||"0"}–${this.state.filterPriceMax||"∞"} kr`,icon:"ph-currency-circle-dollar"}),this.state.filterHero==="no"&&p.push({key:"filterHero",label:"No Destacados",icon:"ph-star"}),this.state.filterStockTime.length>0){const f={green:"0-2m",orange:"2-4m",red:"4-6m",purple:"+6m"};p.push({key:"filterStockTime",label:`Antigüedad: ${this.state.filterStockTime.map(k=>f[k]).join(", ")}`,icon:"ph-clock",resetValue:"stockTime"})}p.length>0||this.state.inventorySearch.length>0;const b=p.length>0;document.getElementById("inventory-layout-root")||(t.innerHTML=`
    <div id="inventory-layout-root" class="cx-view">
    <div class="max-w-7xl mx-auto pb-24 md:pb-8 px-4 md:px-8 pt-6">
                    <!--Header -->
                    <div class="cx-sticky md:sticky top-0 z-20 pb-4 pt-4 -mx-4 px-4 md:-mx-8 md:px-8">
                         <div class="flex flex-wrap justify-between items-end gap-4 mb-5">
                            <div>
                                <h2 class="cx-title">Inventario</h2>
                                <p class="cx-sub" id="inventory-subtitle">${c} discos registrados</p>
                            </div>
                             <div class="flex flex-wrap gap-2">
                                <button onclick="app.openInventoryLogModal()" class="cx-btn is-icon" title="Historial" aria-label="Historial">
                                    <i class="ph ph-clock-counter-clockwise"></i>
                                </button>
                                <button onclick="app.openBulkImportModal()" class="cx-btn" title="Carga Masiva CSV">
                                    <i class="ph ph-file-csv"></i>
                                    <span class="hidden sm:inline">Importar</span>
                                </button>
                                <button onclick="app.syncWithDiscogs()" id="discogs-sync-btn" class="cx-btn" title="Sincronizar con Discogs">
                                    <i class="ph ph-cloud-arrow-down"></i>
                                    <span class="hidden sm:inline">Discogs</span>
                                </button>
                                <button onclick="app.openAddVinylModal()" class="cx-btn is-primary">
                                    <i class="ph-bold ph-plus"></i>
                                    <span class="hidden sm:inline">Nuevo</span>
                                </button>
                            </div>
                        </div>

                        <!-- Search Bar -->
                        <div class="cx-search mb-3">
                            <i class="ph ph-magnifying-glass"></i>
                            <input type="text" placeholder="Buscar artista, álbum, sello, SKU..." value="${this.state.inventorySearch}" oninput="app.state.inventorySearch = this.value; app.state.invPage = 1; app.refreshCurrentView()">
                        </div>

                        <!-- KPI Stats Row -->
                        <div id="inventory-kpi-container" class="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4"></div>

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
                            <p class="cx-sub !mt-0" id="inventory-results-count">${r.length} resultado${r.length!==1?"s":""}</p>
                            <div class="hidden lg:flex cx-glass p-1 rounded-full">
                                <button onclick="app.state.viewMode='list'; app.refreshCurrentView()" class="cx-month ${this.state.viewMode!=="grid"?"is-on":""}" title="Vista lista" aria-label="Vista lista"><i class="ph ph-list-dashes"></i></button>
                                <button onclick="app.state.viewMode='grid'; app.refreshCurrentView()" class="cx-month ${this.state.viewMode==="grid"?"is-on":""}" title="Vista grilla" aria-label="Vista grilla"><i class="ph ph-squares-four"></i></button>
                            </div>
                        </div>
                        <div id="inventory-content-container"></div>
                    </div>
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
    `);const y=document.getElementById("inventory-kpi-container");if(y){const f=b?'<span class="cx-mini"><i class="ph-bold ph-funnel"></i> Filtrado</span>':"";y.innerHTML=`
                <div class="cx-tile cx-yellow">
                    <span class="cx-tile-label">En stock ${f}</span>
                    <b class="cx-tile-value">${d}${h!==d?` <small>${h} copias</small>`:""}</b>
                    <span class="cx-tile-stripes" aria-hidden="true"></span>
                </div>
                <div class="cx-tile cx-orange">
                    <span class="cx-tile-label">Valor a costo ${f}</span>
                    <b class="cx-tile-value">${this.formatCurrency(u)}</b>
                    <span class="cx-tile-dots" aria-hidden="true"></span>
                </div>
                <div class="cx-tile cx-dark">
                    <span class="cx-tile-label">Valor de reventa ${f}</span>
                    <b class="cx-tile-value">${this.formatCurrency(l)}</b>
                    <span class="cx-tile-sub">Margen posible ${this.formatCurrency(l-u)}</span>
                </div>
            `}const v=document.getElementById("inventory-filters-container");v&&(v.innerHTML=`
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

                <div class="h-6 w-px bg-black/10 mx-1"></div>

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

                <div class="h-6 w-px bg-black/10 mx-1"></div>

                <!-- Advanced Filters button -->
                <button onclick="app.toggleAdvancedFilters()" class="quick-pill ${b&&p.some(f=>["filterGenre","filterLabel","filterLot","filterOwner","filterStorage","filterHero","filterStockTime"].includes(f.key))?"active":""}">
                    <i class="ph-bold ph-sliders-horizontal text-xs"></i> Más Filtros
                    ${(()=>{const f=p.filter(k=>["filterGenre","filterLabel","filterLot","filterOwner","filterStorage","filterHero","filterStockTime"].includes(k.key)).length;return f>0?`<span class="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[10px]">${f}</span>`:""})()}
                </button>

                <!-- Stats Toggle -->
                <button onclick="app.toggleStats()" class="quick-pill ${this.state.showStats?"active":""}">
                    <i class="ph-bold ph-chart-bar text-xs"></i> Estadísticas
                </button>
            `);const E=document.getElementById("inventory-active-tags");E&&(p.length>0?E.innerHTML=`
                    <div class="flex flex-wrap items-center gap-2 mt-2 animate-fade-in">
                        ${p.map(f=>`
                            <span class="active-tag">
                                <i class="ph-bold ${f.icon} text-[10px]"></i>
                                ${f.label}
                                <span class="tag-remove" onclick="app.clearSingleFilter('${f.key}'${f.resetValue?", '"+f.resetValue+"'":""})">
                                    <i class="ph-bold ph-x"></i>
                                </span>
                            </span>
                        `).join("")}
                        <button onclick="app.clearAllFilters()" class="active-tag hover:!bg-red-100 hover:!border-red-300 hover:!text-red-600" style="background:#fee2e2;border-color:#fca5a5;color:#ef4444;">
                            <i class="ph-bold ph-x text-[10px]"></i> Limpiar todo (${p.length})
                        </button>
                    </div>
                `:E.innerHTML="");const $=document.getElementById("advanced-filters-content");$&&($.innerHTML=`
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Género</label>
                    <select onchange="app.state.filterGenre = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los géneros</option>
                        ${e.map(f=>`<option value="${f}" ${this.state.filterGenre===f?"selected":""}>${f}</option>`).join("")}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Sello</label>
                    <select onchange="app.state.filterLabel = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los sellos</option>
                        ${a.map(f=>`<option value="${f}" ${this.state.filterLabel===f?"selected":""}>${f}</option>`).join("")}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Lote</label>
                    <select onchange="app.state.filterLot = this.value; app.state.invPage = 1; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los lotes</option>
                        ${o.map(f=>`<option value="${f}" ${this.state.filterLot===f?"selected":""}>${f}</option>`).join("")}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Dueño</label>
                    <select onchange="app.state.filterOwner = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todos los dueños</option>
                        ${s.map(f=>`<option value="${f}" ${this.state.filterOwner===f?"selected":""}>${f}</option>`).join("")}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Disquería</label>
                    <select onchange="app.state.filterStorage = this.value; app.refreshCurrentView()" class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <option value="all">Todas las disquerías</option>
                        ${i.map(f=>`<option value="${f}" ${this.state.filterStorage===f?"selected":""}>${f}</option>`).join("")}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Rango de precio (DKK)</label>
                    <div class="flex items-center gap-2">
                        <input type="number" min="0" placeholder="Mín" value="${this.state.filterPriceMin||""}"
                            onchange="app.state.filterPriceMin = this.value; app.state.invPage = 1; app.refreshCurrentView()"
                            class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                        <span class="text-slate-300 font-bold">–</span>
                        <input type="number" min="0" placeholder="Máx" value="${this.state.filterPriceMax||""}"
                            onchange="app.state.filterPriceMax = this.value; app.state.invPage = 1; app.refreshCurrentView()"
                            class="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium text-brand-dark focus:border-brand-orange outline-none">
                    </div>
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
            `);const I=document.getElementById("inventory-stats-section");if(I)if(this.state.showStats){const f={};r.forEach(P=>{const V=[P.genre,P.genre2,P.genre3,P.genre4,P.genre5].filter(Boolean),H=[];V.forEach(D=>{H.push(...D.split(",").map(U=>U.trim()).filter(Boolean))});const Z=[...new Set(H)],Q=Z.filter(D=>D.toLowerCase()!=="electronic");(Q.length>0?Q:Z.length>0?Z:["Otros"]).forEach(D=>{f[D]=(f[D]||0)+1})});const k=Object.entries(f).sort((P,V)=>V[1]-P[1]).slice(0,10),_=k.length>0?k[0][1]:1,M=["#F05A28","#E2C531","#1A1A1A","#F2955E","#8A857C","#5B4636","#C9B7A0","#B4532A","#6E8B74","#D9A441"],A=r.reduce((P,V)=>{const H=Number(V.stock)||0;return P+(H>0?(parseFloat(V.price)||0)*H:0)},0),B=r.reduce((P,V)=>{const H=Number(V.stock)||0;return P+(H<=0&&parseFloat(V.price)||0)},0),W=Math.max(A,B,1);I.innerHTML=`
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <!-- Genre Distribution -->
                        <div class="cx-panel !p-5">
                            <h4 class="font-bold text-brand-dark text-sm mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-music-notes-simple text-brand-orange"></i> Distribución por Género
                                <span class="text-[10px] text-slate-400 font-normal">(Top 10)</span>
                            </h4>
                            <div class="space-y-2.5">
                                ${k.map(([P,V],H)=>`
                                    <div>
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="text-xs font-bold text-slate-600 truncate max-w-[160px]">${P}</span>
                                            <span class="text-xs font-bold text-slate-400">${V}</span>
                                        </div>
                                        <div class="stat-bar-track">
                                            <div class="stat-bar-fill" style="width: ${Math.max(V/_*100,8)}%; background: ${M[H%M.length]};"></div>
                                        </div>
                                    </div>
                                `).join("")}
                                ${k.length===0?'<p class="text-xs text-slate-400 text-center py-4">Sin datos</p>':""}
                            </div>
                        </div>

                        <!-- Stock vs Sold Value -->
                        <div class="cx-panel !p-5">
                            <h4 class="font-bold text-brand-dark text-sm mb-4 flex items-center gap-2">
                                <i class="ph-fill ph-chart-bar text-brand-orange"></i> Valor de Inventario
                            </h4>
                            <div class="space-y-4">
                                <div>
                                    <div class="flex justify-between items-center mb-1.5">
                                        <span class="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><i class="ph-fill ph-package text-sm"></i> En Stock</span>
                                        <span class="text-sm font-bold text-brand-dark font-display">${this.formatCurrency(A)}</span>
                                    </div>
                                    <div class="stat-bar-track">
                                        <div class="stat-bar-fill" style="width: ${Math.max(A/W*100,5)}%; background: #1A1A1A;"></div>
                                    </div>
                                </div>
                                <div>
                                    <div class="flex justify-between items-center mb-1.5">
                                        <span class="text-xs font-bold text-slate-500 flex items-center gap-1.5"><i class="ph-fill ph-shopping-cart text-sm"></i> Vendido (Agotado)</span>
                                        <span class="text-sm font-bold text-brand-dark font-display">${this.formatCurrency(B)}</span>
                                    </div>
                                    <div class="stat-bar-track">
                                        <div class="stat-bar-fill" style="width: ${Math.max(B/W*100,5)}%; background: #B9B4AA;"></div>
                                    </div>
                                </div>
                                <div class="pt-3 border-t border-slate-100">
                                    <div class="flex justify-between items-center">
                                        <span class="text-xs font-bold text-slate-400">Valor Total Registrado</span>
                                        <span class="text-lg font-bold text-brand-orange font-display">${this.formatCurrency(A+B)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `,I.classList.add("open")}else I.classList.remove("open");const C=document.getElementById("inventory-results-count");C&&(C.textContent=`${r.length} resultado${r.length!==1?"s":""}`);const m=document.getElementById("inventory-subtitle");m&&(m.textContent=`${c} discos registrados`),this.renderInventoryCart();const g=document.getElementById("inventory-content-container");g&&this.renderInventoryContent(g,r,e,s,i)},getTimeInStockCategory(t){if(!t)return"unknown";const e=t.seconds?new Date(t.seconds*1e3):new Date(t);if(isNaN(e.getTime()))return"unknown";const a=Math.abs(new Date-e),i=Math.ceil(a/(1e3*60*60*24))/30.44;return i<=2?"green":i<=4?"orange":i<=6?"red":"purple"},getTimeInStockBadge(t){switch(t){case"green":return'<span class="w-3 h-3 block rounded-full bg-emerald-500 shadow-sm" title="Antigüedad: 0 a 2 meses"></span>';case"orange":return'<span class="w-3 h-3 block rounded-full bg-orange-500 shadow-sm" title="Antigüedad: 2 a 4 meses"></span>';case"red":return'<span class="w-3 h-3 block rounded-full bg-red-500 shadow-sm" title="Antigüedad: 4 a 6 meses"></span>';case"purple":return'<span class="w-3 h-3 block rounded-full bg-purple-500 shadow-sm" title="Antigüedad: Más de 6 meses"></span>';default:return'<span class="w-3 h-3 block rounded-full bg-slate-300 shadow-sm" title="Antigüedad: Desconocida"></span>'}},toggleStockTimeFilter(t){const e=this.state.filterStockTime.indexOf(t);e===-1?this.state.filterStockTime.push(t):this.state.filterStockTime.splice(e,1),this.refreshCurrentView()},toggleQuickFilter(t,e){this.state[t]===e?this.state[t]="all":this.state[t]=e,this.state.invPage=1,this.refreshCurrentView()},toggleAdvancedFilters(){this.state.showAdvancedFilters=!this.state.showAdvancedFilters;const t=document.getElementById("advanced-filters-backdrop"),e=document.getElementById("advanced-filters-panel");t&&e&&(this.state.showAdvancedFilters?(t.classList.add("open"),e.classList.add("open")):(t.classList.remove("open"),e.classList.remove("open")))},toggleStats(){this.state.showStats=!this.state.showStats;const t=document.getElementById("inventory-stats-section");t&&(this.state.showStats?t.classList.add("open"):t.classList.remove("open")),this.refreshCurrentView()},clearSingleFilter(t,e){e==="stockTime"?this.state.filterStockTime=[]:t==="filterPrice"?(this.state.filterPriceMin="",this.state.filterPriceMax="",this.state.invPage=1):this.state[t]=e!==void 0?e:"all",this.refreshCurrentView()},clearAllFilters(){this.state.filterGenre="all",this.state.filterOwner="all",this.state.filterLabel="all",this.state.filterLot="all",this.state.filterStorage="all",this.state.filterDiscogs="all",this.state.filterHero="all",this.state.filterStock="all",this.state.filterCondition="all",this.state.filterStockTime=[],this.state.filterPriceMin="",this.state.filterPriceMax="",this.state.invPage=1,this.refreshCurrentView()},getStatusBadge(t){return`<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${{NM:"bg-green-100 text-green-700 border-green-200","VG+":"bg-blue-100 text-blue-700 border-blue-200",VG:"bg-yellow-100 text-yellow-700 border-yellow-200",G:"bg-orange-100 text-orange-700 border-orange-200",B:"bg-red-100 text-red-700 border-red-200",S:"bg-purple-100 text-purple-700 border-purple-200"}[t]||"bg-slate-100 text-slate-600 border-slate-200"}"> ${t}</span> `},renderCharts(t,e){const s=this.state.filterMonths;this.state.filterYear;const a=[],o=[],i=[];s.forEach(n=>{a.push(this.getMonthName(n).substring(0,3));const c=t.filter(d=>new Date(d.date).getMonth()===n).reduce((d,h)=>d+h.total,0),l=e.filter(d=>new Date(d.date).getMonth()===n).reduce((d,h)=>d+h.amount,0);o.push(c),i.push(l)});const r={};t.forEach(n=>{r[n.genre]=(r[n.genre]||0)+n.quantity}),new Chart(document.getElementById("financeChart"),{type:"bar",data:{labels:a,datasets:[{label:"Ventas",data:o,backgroundColor:"#F05A28",borderRadius:6},{label:"Gastos",data:i,backgroundColor:"#94a3b8",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom"}},scales:{y:{grid:{color:"#f1f5f9"},beginAtZero:!0},x:{grid:{display:!1}}}}})},renderDashboardCharts(t=[],e=[],s=[]){var p,b,y,v,E;const a=t,o=(p=document.getElementById("last30DaysChart"))==null?void 0:p.getContext("2d");o&&(this.last30ChartInstance&&this.last30ChartInstance.destroy(),this.last30ChartInstance=new Chart(o,{type:"line",data:{labels:e,datasets:[{label:"Ventas ($)",data:s,borderColor:"#F05A28",backgroundColor:$=>{const I=$.chart,{ctx:C,chartArea:m}=I;if(!m)return null;const g=C.createLinearGradient(0,m.top,0,m.bottom);return g.addColorStop(0,"rgba(240, 90, 40, 0.2)"),g.addColorStop(1,"rgba(240, 90, 40, 0)"),g},borderWidth:2.5,fill:!0,tension:.4,pointRadius:0,pointHoverRadius:6,pointBackgroundColor:"#F05A28",pointBorderColor:"#fff",pointBorderWidth:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{mode:"index",intersect:!1,backgroundColor:"#1A1A1A",titleFont:{size:10},bodyFont:{size:12,weight:"bold"},padding:12,cornerRadius:12,displayColors:!1,callbacks:{label:$=>new Intl.NumberFormat("da-DK",{style:"currency",currency:"DKK"}).format($.parsed.y)}}},scales:{y:{beginAtZero:!0,grid:{color:"rgba(26,26,26,0.07)"},ticks:{font:{size:10},color:"#8A857C"}},x:{grid:{display:!1},ticks:{font:{size:10},color:"#8A857C",autoSkip:!0,maxRotation:0,callback:function($,I){return I%5===0?this.getLabelForValue($):""}}}},interaction:{mode:"index",intersect:!1}}}));const i=($,I)=>({type:"doughnut",data:{labels:Object.keys($),datasets:[{data:Object.values($),backgroundColor:["#F05A28","#FDE047","#8b5cf6","#10b981","#f43f5e","#64748b"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{boxWidth:10,font:{size:10}}}}}}),r={};a.forEach($=>{const I=$.genre||"Otros";let C=Number($.quantity)||0;C===0&&$.items&&Array.isArray($.items)&&(C=$.items.reduce((m,g)=>m+(Number(g.qty||g.quantity)||1),0)),C<=0&&(C=1),r[I]=(r[I]||0)+Number(C)}),this.genreChartInstance&&this.genreChartInstance.destroy();const n=(b=document.getElementById("genreChart"))==null?void 0:b.getContext("2d");n&&(this.genreChartInstance=new Chart(n,i(r)));const c={};a.forEach($=>{const I=$.paymentMethod||"Otros";let C=Number($.quantity)||0;C===0&&$.items&&Array.isArray($.items)&&(C=$.items.reduce((m,g)=>m+(Number(g.qty||g.quantity)||1),0)),C<=0&&(C=1),c[I]=(c[I]||0)+Number(C)}),this.paymentChartInstance&&this.paymentChartInstance.destroy();const l=(y=document.getElementById("paymentChart"))==null?void 0:y.getContext("2d");l&&(this.paymentChartInstance=new Chart(l,i(c)));const d={};a.forEach($=>{const I=$.channel||"Tienda";let C=Number($.quantity)||0;C===0&&$.items&&Array.isArray($.items)&&(C=$.items.reduce((m,g)=>m+(Number(g.qty||g.quantity)||1),0)),C<=0&&(C=1),d[I]=(d[I]||0)+Number(C)}),this.channelChartInstance&&this.channelChartInstance.destroy();const h=(v=document.getElementById("channelChart"))==null?void 0:v.getContext("2d");h&&(this.channelChartInstance=new Chart(h,i(d)));const u=(E=document.getElementById("salesTrendChart"))==null?void 0:E.getContext("2d");if(u){const $=new Array(31).fill(0).map((C,m)=>m+1),I=new Array(31).fill(0);a.forEach(C=>{const m=new Date(C.date);isNaN(m.getDate())||(I[m.getDate()-1]+=parseFloat(C.total)||0)}),this.trendChartInstance&&this.trendChartInstance.destroy(),this.trendChartInstance=new Chart(u,{type:"line",data:{labels:$,datasets:[{label:"Ventas ($)",data:I,borderColor:"#F05A28",backgroundColor:"rgba(240, 90, 40, 0.1)",borderWidth:3,fill:!0,tension:.4,pointRadius:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,grid:{color:"#f1f5f9"}},x:{grid:{display:!1}}}}})}},renderSales(t){var m;const e=new Date().toISOString().split("T")[0],s=new Date(Date.now()-864e5).toISOString().split("T")[0],a=this.state.salesChannelFilter||"all",o=g=>a==="all"||this.normalizeSaleChannel(g)===a,i=g=>this.normalizeSaleChannel(g)!=="manual",r=this.state.sales.filter(g=>g.date===e&&o(g)&&i(g)).reduce((g,f)=>g+(parseFloat(f.total)||0),0),n=this.state.sales.filter(g=>g.date===s&&o(g)&&i(g)).reduce((g,f)=>g+(parseFloat(f.total)||0),0),c=this.state.sales.filter(g=>o(g)&&this.isShippableChannel(g)&&(g.fulfillment_status==="preparing"||g.status==="paid"||this.normalizeSaleChannel(g)==="discogs"&&g.status!=="shipped"||this.normalizeSaleChannel(g)==="manual"&&!["shipped","fulfilled","delivered","canceled"].includes((g.fulfillment_status||"").toLowerCase()))).length,l=this.state.filterYear,d=this.state.filterMonths,h=((m=document.getElementById("sales-payment-filter"))==null?void 0:m.value)||"all",p=(this.state.salesHistorySearch||"").toLowerCase().split(" ").filter(g=>g.length>0),b=this.state.orderFeedFilter||"all",y=this.state.sales.filter(g=>{const f=new Date(g.date),k=f.getFullYear()===l&&d.includes(f.getMonth()),_=h==="all"||g.paymentMethod===h;let M=!0;p.length>0&&(M=p.every(B=>{const W=Array.isArray(g.items)&&g.items.some(V=>{var D,U,se,ae;const H=(V.album||((D=V.record)==null?void 0:D.album)||"").toLowerCase(),Z=(V.artist||((U=V.record)==null?void 0:U.artist)||"").toLowerCase(),Q=(V.label||((se=V.record)==null?void 0:se.label)||"").toLowerCase(),w=(V.sku||((ae=V.record)==null?void 0:ae.sku)||"").toLowerCase();return H.includes(B)||Z.includes(B)||Q.includes(B)||w.includes(B)}),P=(g.album||"").toLowerCase().includes(B)||(g.sku||"").toLowerCase().includes(B)||(g.customerName||"").toLowerCase().includes(B)||(g.orderNumber||"").toLowerCase().includes(B);return W||P}));let A=!0;return b==="to_ship"?A=g.status!=="shipped"&&this.normalizeSaleChannel(g)!=="local":b==="completed"&&(A=g.status==="shipped"),k&&_&&M&&A&&o(g)}),v=y.filter(i),E=v.reduce((g,f)=>g+(parseFloat(f.total)||0),0),$=v.length>0?E/v.length:0,I={all:0,local:0,online:0,discogs:0,manual:0};this.state.sales.forEach(g=>{const f=new Date(g.date);f.getFullYear()===l&&d.includes(f.getMonth())&&(I.all++,I[this.normalizeSaleChannel(g)]++)});const C=`
            <div class="cx-view">
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Ventas",subtitle:"Local, Web shop, Discogs y envíos manuales en una sola bandeja",filters:`
                        <button onclick="app.syncWithDiscogs()" class="cx-btn">
                            <i class="ph ph-arrows-clockwise"></i>
                            <span class="hidden sm:inline">Sincronizar Discogs</span>
                        </button>`})}

                <div class="mb-5">${this.cxPeriodPicker("main")}</div>

                <!-- KPIs: calculados sobre el conjunto filtrado -->
                <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
                    <div class="cx-tile cx-yellow">
                        <span class="cx-tile-label">Hoy</span>
                        <b class="cx-tile-value">${this.formatCurrency(r)}</b>
                        <span class="cx-tile-sub">${r>=n?"Igual o más que ayer":"Menos que ayer"} (${this.formatCurrency(n)})</span>
                        <span class="cx-tile-stripes" aria-hidden="true"></span>
                    </div>
                    <div class="cx-tile cx-orange">
                        <span class="cx-tile-label">Período</span>
                        <b class="cx-tile-value">${this.formatCurrency(E)}</b>
                        <span class="cx-tile-sub">${v.length} ventas en el filtro</span>
                        <span class="cx-tile-dots" aria-hidden="true"></span>
                    </div>
                    <button onclick="app.navigate('shipping')" class="cx-tile cx-dark text-left">
                        <span class="cx-tile-label">Por despachar</span>
                        <b class="cx-tile-value">${c} <small>pedidos</small></b>
                        <span class="cx-tile-sub">${c>0?"Abrir Envíos":"Nada pendiente"}</span>
                    </button>
                    <div class="cx-tile cx-frost">
                        <span class="cx-tile-label">Ticket promedio</span>
                        <b class="cx-tile-value">${this.formatCurrency($)}</b>
                        <span class="cx-tile-sub">Por venta</span>
                    </div>
                </div>

                <!-- Bandeja unificada -->
                <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
                    <h3 class="cx-h">Bandeja de ventas</h3>
                    <div class="flex flex-wrap gap-2">
                        <div class="cx-glass flex p-1 rounded-full overflow-x-auto no-scrollbar max-w-full">
                            ${[{id:"all",label:"Todos"},{id:"local",label:"Local"},{id:"online",label:"Web shop"},{id:"discogs",label:"Discogs"},{id:"manual",label:"Manual"}].map(g=>`
                                <button onclick="app.updateSalesChannelFilter('${g.id}')" class="cx-month ${a===g.id?"is-on":""}">
                                    ${g.label} <span class="cx-count">${I[g.id]}</span>
                                </button>
                            `).join("")}
                        </div>
                        <div class="cx-glass flex p-1 rounded-full">
                            ${[{id:"all",label:"Todos"},{id:"to_ship",label:"Por enviar"},{id:"completed",label:"Completados"}].map(g=>`
                                <button onclick="app.updateOrderFeedFilter('${g.id}')" class="cx-month ${b===g.id?"is-on":""}">${g.label}</button>
                            `).join("")}
                        </div>
                    </div>
                </div>

                <!-- Buscador + pago -->
                <div class="flex gap-2 mb-4">
                    <div class="cx-search flex-1">
                        <i class="ph ph-magnifying-glass"></i>
                        <input type="text" id="sales-history-search" value="${this.state.salesHistorySearch}"
                            oninput="app.state.salesHistorySearch = this.value; app.renderSales(document.getElementById('app-content'))"
                            placeholder="Buscar por disco, artista, SKU, cliente o número de pedido">
                    </div>
                    <select id="sales-payment-filter" onchange="app.renderSales(document.getElementById('app-content'))" class="cx-pill-select" aria-label="Método de pago">
                        <option value="all" ${h==="all"?"selected":""}>Todos los pagos</option>
                        <option value="MobilePay" ${h==="MobilePay"?"selected":""}>MobilePay</option>
                        <option value="Efectivo" ${h==="Efectivo"?"selected":""}>Efectivo</option>
                        <option value="Tarjeta" ${h==="Tarjeta"?"selected":""}>Tarjeta</option>
                    </select>
                </div>

                <!-- Lista -->
                <div class="cx-panel !p-2">
                    <div class="max-h-[80vh] overflow-y-auto custom-scrollbar">
                    ${y.map(g=>{const f=g.status==="shipped",k=g.status==="paid"||g.source==="STORE"||g.paymentMethod!=="Pending",_=g.channel==="Discogs",M=g.source==="STORE",A=g.items&&g.items.length>0?g.items[0]:{album:g.album||"Venta Manual",artist:g.artist||"Desconocido"},B=g.items&&g.items.length>1?g.items.length-1:0,W=this.resolveItemCover(A);return`
                        <div class="cx-feed-row group" onclick="app.openUnifiedOrderDetailModal('${g.id}')">
                            <span class="cx-cover">
                                ${W?`<img src="${W}" class="w-full h-full object-cover" alt="">`:`<i class="ph ${_?"ph-vinyl-record":M?"ph-storefront":"ph-globe"}"></i>`}
                            </span>
                            <div class="flex-1 min-w-0">
                                <p class="font-semibold text-sm truncate">
                                    ${A.album}${B>0?`<span class="text-stone-500 font-medium"> y ${B} más</span>`:""}
                                </p>
                                <p class="text-xs text-stone-500 truncate">${this.formatDate(g.date)} · ${g.paymentMethod||"Sin método"}${g.customerName?" · "+g.customerName:""}</p>
                                <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    ${this.saleChannelBadge(g)}
                                    <span class="cx-state ${k?"is-ok":"is-wait"}">${k?"Pagado":"Pago pendiente"}</span>
                                    ${this.isShippableChannel(g)?`<span class="cx-state ${f?"is-done":"is-hot"}">${f?"Enviado":"Por enviar"}</span>`:""}
                                </div>
                            </div>
                            <div class="text-right shrink-0">
                                <p class="font-semibold">${this.formatCurrency(g.total)}</p>
                                ${g.shipping_cost>0?`<p class="text-[11px] text-stone-500">Envío ${this.formatCurrency(g.shipping_cost)}</p>`:""}
                            </div>
                            <div class="relative" onclick="event.stopPropagation()">
                                <button onclick="app.toggleOrderActionMenu('${g.id}')" class="cx-row-btn" aria-label="Acciones del pedido">
                                    <i class="ph-bold ph-dots-three-vertical"></i>
                                </button>
                                <div id="action-menu-${g.id}" class="hidden cx-menu">
                                    <button onclick="app.openInvoiceModal('${g.id}')"><i class="ph ph-file-text"></i> Ver factura</button>
                                    <button onclick="app.openInvoiceModal('${g.id}')"><i class="ph ph-printer"></i> Imprimir etiqueta</button>
                                    ${f?"":`<button onclick="app.markOrderAsShipped('${g.id}')"><i class="ph ph-truck"></i> Marcar enviado</button>`}
                                    <hr>
                                    <button onclick="app.deleteSale('${g.id}')" class="is-danger"><i class="ph ph-trash"></i> Eliminar</button>
                                </div>
                            </div>
                        </div>
                    `}).join("")}
                    ${y.length===0?`
                        <div class="text-center py-16">
                            <i class="ph ph-shopping-cart text-3xl text-stone-400 block mb-2"></i>
                            <p class="text-sm text-stone-500">No hay ventas con estos filtros. Cambiá el mes, el canal o la búsqueda.</p>
                        </div>
                    `:""}
                    </div>
                </div>
            </div>
            </div>
        `;if(t.innerHTML=C,this.state.salesHistorySearch){const g=document.getElementById("sales-history-search");if(g){g.focus();const f=g.value;g.value="",g.value=f}}},renderPOS(t){const e=`
            <div class="cx-view">
            <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"POS",subtitle:"Caja del local: escaneá o buscá el disco, elegí cómo paga y cobrá"})}
                ${this.state.cart.length>0?this.renderSalesCartWidget():this.renderQuickPOS()}
            </div>
            </div>
        `;t.innerHTML=e},renderSalesCartWidget(){const t=this.state.cart.reduce((a,o)=>a+this.getEffectivePrice(o),0),e=this.state.rsdExtraDiscount&&this.state.cart.length>=3,s=t*(e?.95:1);return`
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <section class="cx-panel lg:col-span-7 !p-2">
                    <div class="flex justify-between items-center px-3 pt-2 pb-2">
                        <h3 class="cx-h">Venta en curso <span class="cx-count">${this.state.cart.length}</span></h3>
                        <button onclick="app.clearCart(); app.refreshCurrentView()" class="text-xs font-semibold text-stone-500 hover:text-red-700">Vaciar carrito</button>
                    </div>
                    <div class="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    ${this.state.cart.map((a,o)=>`
                        <div class="cx-feed-row !cursor-default">
                            <span class="cx-cover">${a.cover_image?`<img src="${a.cover_image}" class="w-full h-full object-cover" alt="">`:'<i class="ph ph-vinyl-record"></i>'}</span>
                            <div class="flex-1 min-w-0">
                                <p class="font-semibold text-sm truncate">${a.album}</p>
                                <p class="text-xs text-stone-500 truncate">${a.artist}</p>
                                ${a.is_rsd_discount?'<span class="cx-state is-hot mt-1">RSD -10%</span>':""}
                            </div>
                            ${a.is_rsd_discount?`<div class="text-right"><span class="text-xs text-stone-400 line-through block">${this.formatCurrency(a.price,!1)}</span><span class="font-semibold text-sm">${this.formatCurrency(this.getEffectivePrice(a),!1)}</span></div>`:`<span class="font-semibold text-sm">${this.formatCurrency(a.price,!1)}</span>`}
                            <button onclick="app.removeFromCart(${o}); app.refreshCurrentView()" class="cx-row-btn is-danger" title="Quitar del carrito" aria-label="Quitar del carrito"><i class="ph ph-trash"></i></button>
                        </div>
                    `).join("")}
                    </div>
                </section>

                <section class="lg:col-span-5 space-y-3">
                    <div class="vf-card">
                        <div class="flex justify-between text-sm"><span class="text-stone-500">Subtotal</span><span class="font-semibold">${this.formatCurrency(t)}</span></div>
                        <label class="vf-switch-row mt-2 ${this.state.cart.length>=3?"":"opacity-50 !cursor-not-allowed"}">
                            <span><b>5% extra RSD</b><small>${this.state.cart.length>=3?"Descuento por llevar 3 o más":"Se habilita con 3 discos o más"}</small></span>
                            <input type="checkbox" id="rsd-extra-toggle" ${this.state.rsdExtraDiscount?"checked":""} ${this.state.cart.length<3?"disabled":""}
                                onchange="app.state.rsdExtraDiscount = this.checked; app.refreshCurrentView()">
                            <i class="vf-switch" aria-hidden="true"></i>
                        </label>
                        ${e?`<div class="flex justify-between text-sm mt-1"><span class="text-stone-500">Descuento RSD 5%</span><span class="font-semibold">- ${this.formatCurrency(t*.05)}</span></div>`:""}
                        <div class="grid grid-cols-2 gap-3 mt-4">
                            <label class="vf-field"><span>Pago</span>
                                <select id="cart-payment" class="vf-input">
                                    <option value="MobilePay">MobilePay</option>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                </select></label>
                            <label class="vf-field"><span>Canal</span>
                                <select id="cart-channel" class="vf-input">
                                    <option value="Tienda">Tienda</option>
                                    <option value="Discogs">Discogs</option>
                                    <option value="Feria">Feria</option>
                                </select></label>
                        </div>
                    </div>
                    <div class="cx-tile cx-dark !min-h-0">
                        <span class="cx-tile-label">Total a cobrar</span>
                        <b class="cx-tile-value">${this.formatCurrency(s)}</b>
                    </div>
                    <button onclick="app.handleSalesViewCheckout()" class="cx-pos-cta">
                        <i class="ph-bold ph-check-circle"></i> Completar venta
                    </button>
                </section>
            </div>
        `},renderQuickPOS(){const t=this.state.posCondition==="Used",e=!this.state.posSelectedItemSku&&(this.state.manualSaleSearch||"").length>0,s=t&&(e||!this.state.posSelectedItemSku),a=this.state.posSelectedItemSku?this.state.inventory.find(i=>i.sku===this.state.posSelectedItemSku):null,o=(i,r,n)=>`
            <button onclick="app.selectPOSPayment('${i}')" id="pay-${i}" class="cx-pay ${n?"is-on":""}">
                <i class="ph ${r}"></i><span>${i}</span>
            </button>`;return`
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <section class="vf-card lg:col-span-7 !p-5">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <h3 class="cx-h">Qué se vende</h3>
                        <div class="vf-segs">
                            <button onclick="app.updatePOSCondition('New')" class="vf-seg-btn ${t?"":"is-on"}">Nuevo</button>
                            <button onclick="app.updatePOSCondition('Used')" class="vf-seg-btn ${t?"is-on":""}">Usado</button>
                        </div>
                    </div>
                    <div class="cx-search relative">
                        <i class="ph ph-barcode"></i>
                        <input type="text" id="sku-search" value="${this.state.manualSaleSearch||""}"
                            oninput="app.searchSku(this.value)"
                            onblur="setTimeout(() => document.getElementById('sku-results').classList.add('hidden'), 200)"
                            placeholder="Escaneá el código o escribí artista, título o SKU" class="!h-14 !text-base">
                        <div id="sku-results" class="hidden cx-gs-panel !top-[62px]"></div>
                    </div>
                    ${a?`
                    <div class="flex items-center gap-3 mt-4 p-3 rounded-2xl bg-white/70">
                        <span class="cx-cover">${a.cover_image?`<img src="${a.cover_image}" class="w-full h-full object-cover" alt="">`:'<i class="ph ph-vinyl-record"></i>'}</span>
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-sm truncate">${a.album}</p>
                            <p class="text-xs text-stone-500 truncate">${a.artist} · ${a.sku}</p>
                        </div>
                        <span class="cx-stock ${Number(a.stock)>0?"":"is-out"}">${Number(a.stock)>0?"Stock "+a.stock:"Sin stock"}</span>
                    </div>`:""}

                    <div class="grid grid-cols-2 gap-3 mt-5">
                        <label class="vf-field"><span>Precio de venta (kr)</span>
                            <input type="number" id="input-price" step="0.5" class="vf-input !h-14 !text-2xl !font-light tracking-tight"></label>
                        <label id="cost-container" class="vf-field ${s?"":"hidden"}"><span>Costo original (kr)</span>
                            <input type="number" id="input-cost-pos" step="0.5" class="vf-input !h-14 !text-2xl !font-light tracking-tight"></label>
                    </div>
                    <!-- Hidden inputs for submission -->
                    <input type="hidden" id="input-sku" value="${this.state.posSelectedItemSku||""}">
                    <input type="hidden" id="input-cost">
                    <input type="hidden" id="input-artist">
                    <input type="hidden" id="input-album">
                    <input type="hidden" id="input-genre">
                    <input type="hidden" id="input-owner">
                </section>

                <section class="lg:col-span-5 space-y-3">
                    <div class="vf-card">
                        <h3 class="cx-h mb-3">Cómo paga</h3>
                        <div class="grid grid-cols-3 gap-2">
                            ${o("MobilePay","ph-device-mobile",!0)}
                            ${o("Tarjeta","ph-credit-card",!1)}
                            ${o("Efectivo","ph-money",!1)}
                        </div>
                        <input type="hidden" id="input-payment-method" value="MobilePay">
                    </div>
                    <button onclick="app.handleQuickPOSAction()" id="btn-pos-action" class="cx-pos-cta">
                        <i class="ph-bold ph-printer"></i> Cobrar e imprimir ticket
                    </button>
                </section>
            </div>
        `},updatePOSCondition(t){this.state.posCondition=t,this.refreshCurrentView()},selectPOSPayment(t){const e=document.getElementById("input-payment-method");e&&(e.value=t),["MobilePay","Tarjeta","Efectivo"].forEach(s=>{var a;(a=document.getElementById(`pay-${s}`))==null||a.classList.toggle("is-on",s===t)})},async handleQuickPOSAction(){const t=document.getElementById("btn-pos-action"),e=document.getElementById("input-sku"),s=document.getElementById("input-price"),a=document.getElementById("input-payment-method"),o=document.getElementById("input-artist"),i=document.getElementById("input-album"),r=document.getElementById("input-cost"),n=document.getElementById("input-cost-pos"),c=e==null?void 0:e.value,l=parseFloat(s==null?void 0:s.value),d=(a==null?void 0:a.value)||"MobilePay",h=o==null?void 0:o.value,u=i==null?void 0:i.value,p=this.state.posCondition==="Used";let b=parseFloat(r==null?void 0:r.value)||0;if(p){const y=parseFloat(n==null?void 0:n.value);isNaN(y)||(b=y)}if(!l||isNaN(l)){this.showToast("⚠️ Debes ingresar un precio válido","error");return}if(!c&&!this.state.manualSaleSearch){this.showToast("⚠️ Debes buscar un producto o ingresar un nombre","error");return}try{t&&(t.disabled=!0,t.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Procesando...');const y=this.state.inventory.find(E=>E.sku===c),v={items:[{recordId:y?y.id:"manual-"+Date.now(),quantity:1,unitPrice:l,costAtSale:b,artist:h||"Desconocido",album:u||this.state.manualSaleSearch||"Venta Manual",sku:c||"N/A",providerOrigin:(y==null?void 0:y.provider_origin)||"Local_Used",productCondition:(y==null?void 0:y.product_condition)||this.state.posCondition||"New"}],paymentMethod:d,customerName:"Venta Mostrador",total_amount:l,source:"STORE",channel:"tienda",condition:this.state.posCondition||"New",timestamp:firebase.firestore.FieldValue.serverTimestamp()};await le.createSale(v),this.showToast("✅ Venta registrada correctamente"),this.printTicket(v),this.state.manualSaleSearch="",this.state.posSelectedItemSku=null,this.loadData()}catch(y){console.error("POS Action Error:",y),this.showToast("❌ Error: "+y.message,"error")}finally{t&&(t.disabled=!1,t.innerHTML='<i class="ph-bold ph-printer text-xl"></i> Cobrar e Imprimir Ticket')}},printTicket(t){const e=window.open("","_blank","width=300,height=600");if(!e){this.showToast("⚠️ El bloqueador de ventanas emergentes impidió imprimir el ticket","warning");return}const s=t.items[0];e.document.write(`
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
        `),e.document.close()},updateOrderFeedFilter(t){this.state.orderFeedFilter=t,this.renderSales(document.getElementById("app-content"))},normalizeSaleChannel(t){const e=(t.channel||"").toString().toLowerCase().trim();if(e==="manual")return"manual";if(e.includes("discogs"))return"discogs";if(e==="online"||e.includes("web")||e.includes("shop"))return"online";if(e==="local"||e==="tienda"||e==="store"||t.source==="STORE")return"local";const s=(t.orderNumber||"").toString();return/^#?WEB-/i.test(s)?"online":t.discogs_order_id||t.discogsOrderId?"discogs":t.customer&&(t.customer.email||t.shipping_method)?"online":(t.source==="STORE","local")},isShippableChannel(t){const e=this.normalizeSaleChannel(t);return e==="online"||e==="discogs"||e==="manual"},saleChannelBadge(t){const e=this.normalizeSaleChannel(t),s={local:{label:"Local"},online:{label:"Web shop"},discogs:{label:"Discogs"},manual:{label:"Manual"}},a=s[e]||s.local;return`<span class="cx-channel is-${e in s?e:"local"}">${a.label}</span>`},_normCoverKey(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()},_buildCoverCache(){const t=this.state.inventory||[];if(this._coverCache&&this._coverCacheSrc===t)return this._coverCache;const e={},s={};for(const a of t){const o=a.cover_image||a.image||null;if(!o)continue;const i=String(a.sku||"").trim().toUpperCase();i&&!e[i]&&(e[i]=o);const r=this._normCoverKey(a.album||a.title),n=this._normCoverKey(a.artist);if(r){const c=r+"|"+n;s[c]||(s[c]=o),s[r]||(s[r]=o)}}return this._coverCache={bySku:e,byTitle:s},this._coverCacheSrc=t,this._coverCache},resolveItemCover(t){if(!t)return null;const e=t.image||t.cover_image||t.record&&t.record.cover_image;if(e)return e;const{bySku:s,byTitle:a}=this._buildCoverCache(),o=String(t.sku||t.record&&t.record.sku||"").trim().toUpperCase();if(o&&s[o])return s[o];const i=this._normCoverKey(t.album||t.title||t.record&&(t.record.album||t.record.title)),r=this._normCoverKey(t.artist||t.record&&t.record.artist);return i&&a[i+"|"+r]?a[i+"|"+r]:i&&a[i]?a[i]:null},updateSalesChannelFilter(t){this.state.salesChannelFilter=t,this.renderSales(document.getElementById("app-content"))},toggleOrderActionMenu(t){const e=document.getElementById(`action-menu-${t}`);document.querySelectorAll('[id^="action-menu-"]').forEach(s=>{s.id!==`action-menu-${t}`&&s.classList.add("hidden")}),e&&e.classList.toggle("hidden")},async markOrderAsShipped(t){try{await T.collection("sales").doc(t).update({status:"shipped",fulfillment_status:"fulfilled",shipped_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast("✅ Pedido marcado como enviado"),this.loadData()}catch(e){console.error("Error marking order as shipped:",e),this.showToast("❌ Error al actualizar estado","error")}},searchSku(t){this.state.manualSaleSearch=t;const e=document.getElementById("sku-results");if(t.length<2){e.classList.add("hidden");return}const s=this.state.inventory.filter(a=>a.artist.toLowerCase().includes(t.toLowerCase())||a.album.toLowerCase().includes(t.toLowerCase())||a.sku.toLowerCase().includes(t.toLowerCase()));s.length>0?(e.innerHTML=s.map(a=>`
    <div onclick="app.selectSku('${a.sku}')" class="gs-row cursor-pointer">
                    <span class="gs-thumb">${a.cover_image?`<img src="${a.cover_image}" alt="">`:'<i class="ph ph-vinyl-record"></i>'}</span>
                    <span class="gs-main"><b>${a.album}</b><small>${a.artist} · ${a.sku}</small></span>
                    <span class="gs-side">${this.formatCurrency(a.price,!1)}<span class="cx-stock ${a.stock>0?"":"is-out"}">${a.stock>0?"Stock "+a.stock:"Sin stock"}</span></span>
                </div>
    `).join(""),e.classList.remove("hidden")):e.classList.add("hidden")},selectSku(t){const e=this.state.inventory.find(s=>s.id===t||s.sku===t);e&&(this.state.posSelectedItemSku=e.sku,this.refreshCurrentView(),setTimeout(()=>{const s=document.getElementById("input-price"),a=document.getElementById("input-sku"),o=document.getElementById("input-cost"),i=document.getElementById("input-artist"),r=document.getElementById("input-album"),n=document.getElementById("input-genre"),c=document.getElementById("input-owner"),l=document.getElementById("sku-search");s&&(s.value=e.price),a&&(a.value=e.sku),o&&(o.value=e.cost||0),i&&(i.value=e.artist),r&&(r.value=e.album),n&&(n.value=e.genre),c&&(c.value=e.owner),l&&(l.value=`${e.artist} - ${e.album}`,this.state.manualSaleSearch=l.value);const d=document.getElementById("sku-results");d&&d.classList.add("hidden")},50),e.stock<=0&&this.showToast("⚠️ Este producto no tiene stock disponible","warning"))},updateTotal(){const t=parseFloat(document.getElementById("input-price").value)||0,e=parseInt(document.getElementById("input-qty").value)||1,s=t*e;document.getElementById("form-total").innerHTML=this.formatCurrency(s)},openQuickAddWizard(t="",e=""){this.openAddVinylModal(null,{lot:t,provider_origin:e})},closeVinylForm(){var t;(t=document.getElementById("modal-overlay"))==null||t.remove()},async vfSubmit(t,e){var r,n,c,l;t.preventDefault();const s=t.target,o=!!(t.submitter&&t.submitter.dataset.again==="1")?{lot:((r=s.lot)==null?void 0:r.value)||"",provider_origin:((n=s.provider_origin)==null?void 0:n.value)||"",owner:((c=s.owner)==null?void 0:c.value)||"",acquisition_date:((l=s.acquisition_date)==null?void 0:l.value)||""}:null,i=s.querySelectorAll('button[type="submit"]');if(i.forEach(d=>d.disabled=!0),await this.handleAddVinyl(t,e),document.getElementById("modal-overlay")){i.forEach(d=>d.disabled=!1);return}o&&this.openAddVinylModal(null,o)},vfSetOrigin(t){const e=document.getElementById("modal-provider-origin");e&&(e.value=t,document.querySelectorAll("[data-origin]").forEach(s=>s.classList.toggle("is-on",s.dataset.origin===t)),this.onProviderOriginChange())},vfSetMultiplier(t){const e=document.getElementById("modal-multiplier");e&&(e.value=t,this.applyPriceMultiplier())},vfStep(t){const e=document.querySelector('#vinyl-form input[name="stock"]');e&&(e.value=Math.max(0,(parseInt(e.value,10)||0)+t))},vfAddGenre(t){const e=[1,2,3].map(a=>document.getElementById(`genre-${a}`)).filter(Boolean);if(e.some(a=>a.value.trim().toLowerCase()===t.toLowerCase()))return;const s=e.find(a=>!a.value.trim());s?s.value=t:this.showToast("Ya hay 3 géneros. Borrá uno para agregar otro.")},vfCheckDuplicates(){var n;const t=document.getElementById("vf-dup"),e=document.getElementById("vinyl-form");if(!t||!e||e.dataset.edit==="1")return;const s=c=>this.normalizeText(c||""),a=s(e.artist.value),o=s(e.album.value),i=((n=document.getElementById("input-discogs-id"))==null?void 0:n.value)||"",r=(this.state.inventory||[]).find(c=>i&&String(c.discogs_release_id||c.discogsId||"")===String(i)||a&&o&&s(c.artist)===a&&s(c.album)===o);if(!r){t.innerHTML="";return}t.innerHTML=`
            <div class="vf-dup">
                <p><b>Ya tenés este disco:</b> ${r.artist} — ${r.album} (${r.sku||"sin SKU"}, stock ${r.stock||0}).</p>
                <div class="flex flex-wrap gap-2 mt-3">
                    <button type="button" onclick="app.vfIncreaseStock('${r.id}')" class="cx-btn is-primary">Sumar al stock</button>
                    <button type="button" onclick="app.closeVinylForm(); app.openAddVinylModal('${r.id}')" class="cx-btn">Editar ese disco</button>
                    <button type="button" onclick="document.getElementById('vf-dup').innerHTML=''" class="cx-btn">Es otra edición</button>
                </div>
            </div>`},async vfIncreaseStock(t){var s;const e=parseInt((s=document.querySelector('#vinyl-form input[name="stock"]'))==null?void 0:s.value,10)||1;try{const a=T.collection("products").doc(t),i=((await a.get()).data()||{}).stock||0;await a.update({stock:i+e,updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast(`Stock actualizado: ${i} → ${i+e}`),this.closeVinylForm(),this.loadData()}catch(a){console.error(a),this.showToast("Error actualizando stock: "+a.message)}},openAddVinylModal(t=null,e=null){var I,C;let s={sku:"",artist:"",album:"",genre:"",condition:"NM",product_condition:"Second-hand",provider_origin:"EU_B2B",acquisition_date:"",item_phantom_vat:0,item_real_vat:0,price:"",cost:"",stock:1,owner:"El Cuartito"},a=!1;if(t){const m=this.state.inventory.find(g=>g.id===t||g.sku===t);m&&(s=m,a=!0)}if(!a){const m=this.state.inventory.map(f=>{const k=(f.sku||"").match(/^SKU\s*-\s*(\d+)/);return k?parseInt(k[1]):0}),g=Math.max(0,...m);s.sku=`SKU-${String(g+1).padStart(3,"0")}`,e&&["lot","provider_origin","owner","acquisition_date"].forEach(f=>{e[f]&&(s[f]=e[f])})}(I=document.getElementById("modal-overlay"))==null||I.remove();const o=m=>String(m??"").replace(/"/g,"&quot;"),i=s.provider_origin||"Local_Used",r=parseFloat(s.cost)||0,n=parseFloat(s.price)||0,c=r>0&&n>0?(n/r).toFixed(1):r>100?"2.2":"2.5",l=s.tags||[],d=a?l.includes("new_arrival"):!0,h=[["M","Mint"],["NM","Near Mint"],["VG+","Very Good Plus"],["VG","Very Good"],["G","Good"]],u=(m,g,f,k,_="")=>`
            <label class="vf-seg" ${_?`title="${_}"`:""}><input type="radio" name="${m}" value="${g}" ${k?"checked":""}><span>${f}</span></label>`,p=(m,g,f,k)=>`
            <label class="vf-switch-row">
                <span><b>${g}</b><small>${f}</small></span>
                <input type="checkbox" name="${m}" ${k?"checked":""}>
                <i class="vf-switch" aria-hidden="true"></i>
            </label>`,b=(m,g,f,k)=>`
            <label class="vf-chip"><input type="checkbox" name="${m}" ${g?`value="${g}"`:""} ${k?"checked":""}><span>${f}</span></label>`,y=((s.genre||"")+(s.styles?", "+s.styles:"")).split(",").map(m=>m.trim()).filter(Boolean),v=l.find(m=>m!=="hero"&&m!=="new_arrival")||"",E=!!(s.year||s.storageLocation||s.comments||s.lot||v||s.tracks&&s.tracks.length),$=`
    <div id="modal-overlay" class="vf-overlay">
        <aside class="vf-panel cx-view" role="dialog" aria-modal="true" aria-labelledby="vf-title">
            <header class="vf-head">
                <div>
                    <h3 id="vf-title" class="vf-title">${a?"Editar disco":"Cargar disco"}</h3>
                    <p class="cx-sub !mt-1">${a?s.sku:"Buscalo en Discogs o completá los datos a mano"}</p>
                </div>
                <button type="button" onclick="app.closeVinylForm()" class="cx-btn is-icon" aria-label="Cerrar"><i class="ph ph-x"></i></button>
            </header>

            <form id="vinyl-form" data-edit="${a?"1":"0"}" onsubmit="app.vfSubmit(event, '${a?s.sku:""}')" class="vf-form">
                <div class="vf-body">

                    <!-- Buscar -->
                    <div>
                        <div class="cx-search">
                            <i class="ph ph-magnifying-glass"></i>
                            <input type="text" id="discogs-search-input" autocomplete="off" spellcheck="false"
                                placeholder="Buscar en Discogs: artista, título o ID"
                                onkeydown="if(event.key === 'Enter') { event.preventDefault(); app.searchDiscogs(); }">
                        </div>
                        <div id="discogs-results" class="hidden vf-results"></div>
                        <div id="vf-dup"></div>
                    </div>

                    <!-- El disco -->
                    <section class="vf-card">
                        <h4 class="vf-h">El disco</h4>
                        <div class="flex gap-4">
                            <div id="cover-preview" class="vf-cover">
                                <img src="${o(s.cover_image)}" alt="" class="${s.cover_image?"":"hidden"} w-full h-full object-cover">
                                <div id="cover-placeholder" class="${s.cover_image?"hidden":""}"><i class="ph ph-vinyl-record"></i></div>
                            </div>
                            <div class="flex-1 min-w-0 space-y-3">
                                <label class="vf-field"><span>Artista</span>
                                    <input name="artist" value="${o(s.artist)}" required class="vf-input" onchange="app.vfCheckDuplicates()"></label>
                                <label class="vf-field"><span>Título</span>
                                    <input name="album" value="${o(s.album)}" required class="vf-input" onchange="app.vfCheckDuplicates()"></label>
                            </div>
                        </div>
                        <label class="vf-field mt-3"><span>Sello</span>
                            <input name="label" value="${o(s.label)}" class="vf-input"></label>

                        <div class="vf-field mt-3"><span>Géneros <em>(hasta 3, el primero es el principal)</em></span>
                            <div class="grid grid-cols-3 gap-2">
                                <input name="genre" id="genre-1" value="${o(s.genre)}" placeholder="Principal" class="vf-input">
                                <input name="genre2" id="genre-2" value="${o(s.genre2)}" placeholder="Opcional" class="vf-input">
                                <input name="genre3" id="genre-3" value="${o(s.genre3)}" placeholder="Opcional" class="vf-input">
                            </div>
                            <div id="metadata-tags" class="vf-suggest">${y.map(m=>`<button type="button" class="vf-suggest-chip" onclick="app.vfAddGenre('${m.replace(/'/g,"\\'")}')">${m}</button>`).join("")}</div>
                        </div>

                        <div class="vf-field mt-3"><span>Estado del vinilo</span>
                            <div class="vf-segs">${h.map(([m,g])=>u("condition",m,m,(s.condition||"NM")===m,g)).join("")}</div>
                        </div>
                        <div class="vf-field mt-3"><span>Estado de la funda</span>
                            <div class="vf-segs">
                                ${u("sleeveCondition","","—",!s.sleeveCondition,"Sin indicar")}
                                ${h.map(([m,g])=>u("sleeveCondition",m,m,s.sleeveCondition===m,g)).join("")}
                                ${u("sleeveCondition","Generic","Genérica",s.sleeveCondition==="Generic")}
                                ${u("sleeveCondition","No Cover","Sin funda",s.sleeveCondition==="No Cover")}
                            </div>
                        </div>
                    </section>

                    <!-- Precio -->
                    <section class="vf-card">
                        <h4 class="vf-h">Precio y stock</h4>
                        <div class="grid grid-cols-2 gap-3">
                            <label class="vf-field"><span>Costo (kr)</span>
                                <input name="cost" id="modal-cost" type="number" step="0.5" min="0" value="${s.cost||0}" oninput="app.onCostChange()" class="vf-input"></label>
                            <label class="vf-field"><span>Precio de venta (kr)</span>
                                <input name="price" id="modal-price" type="number" step="0.5" min="0" value="${s.price||0}" oninput="app.calculateProfit()" class="vf-input is-strong"></label>
                        </div>
                        <div id="multiplier-row" class="vf-mult">
                            <span class="vf-mini-label">Multiplicar costo</span>
                            ${["2","2.2","2.5","3"].map(m=>`<button type="button" data-mult="${m}" onclick="app.vfSetMultiplier('${m}')" class="vf-mult-chip ${String(parseFloat(c))===m?"is-on":""}">×${m}</button>`).join("")}
                            <input type="number" id="modal-multiplier" step="0.1" min="1" value="${c}" oninput="app.applyPriceMultiplier()" class="vf-mult-input" aria-label="Multiplicador personalizado">
                            <span id="multiplier-label" class="vf-hint">${r>100?"Disco caro (+100kr)":"Disco barato (≤100kr)"}</span>
                        </div>
                        <div class="vf-margin">
                            <div><span class="vf-mini-label">Margen</span><p id="profit-percent">0%</p></div>
                            <span id="profit-label" class="profit-tag">+0 kr</span>
                        </div>

                        <div class="grid grid-cols-2 gap-3 mt-4">
                            <div class="vf-field"><span>Stock</span>
                                <div class="vf-stepper">
                                    <button type="button" onclick="app.vfStep(-1)" aria-label="Restar uno"><i class="ph ph-minus"></i></button>
                                    <input name="stock" type="number" min="0" value="${s.stock??1}">
                                    <button type="button" onclick="app.vfStep(1)" aria-label="Sumar uno"><i class="ph ph-plus"></i></button>
                                </div>
                            </div>
                            <label class="vf-field"><span>Dueño</span>
                                <select name="owner" id="modal-owner" class="vf-input">
                                    <option value="El Cuartito" ${s.owner==="El Cuartito"||!s.owner?"selected":""}>El Cuartito</option>
                                    ${this.state.consignors.map(m=>`<option value="${o(m.name)}" data-split="${m.agreementSplit}" ${s.owner===m.name?"selected":""}>${m.name} (consignación)</option>`).join("")}
                                </select></label>
                        </div>

                        <div class="vf-field mt-4"><span>Origen de la compra</span>
                            <input type="hidden" name="provider_origin" id="modal-provider-origin" value="${i}">
                            <div class="vf-segs is-wide">
                                <button type="button" data-origin="Local_Used" onclick="app.vfSetOrigin('Local_Used')" class="vf-seg-btn ${i==="Local_Used"?"is-on":""}">Local / usado</button>
                                <button type="button" data-origin="EU_B2B" onclick="app.vfSetOrigin('EU_B2B')" class="vf-seg-btn ${i==="EU_B2B"?"is-on":""}">Factura UE</button>
                                <button type="button" data-origin="DK_B2B" onclick="app.vfSetOrigin('DK_B2B')" class="vf-seg-btn ${i==="DK_B2B"?"is-on":""}">Factura DK</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3 mt-3 items-end">
                            <label id="acquisition-date-container" class="vf-field ${i==="EU_B2B"||i==="DK_B2B"?"":"hidden"}"><span>Fecha de factura</span>
                                <input name="acquisition_date" id="modal-acquisition-date" type="date" value="${s.acquisition_date||new Date().toISOString().split("T")[0]}" class="vf-input"></label>
                            <div id="phantom-vat-preview" class="vf-vat ${i==="EU_B2B"?"":"hidden"}">
                                <span>Reverse charge UE 25%</span><b id="phantom-vat-amount">${s.item_phantom_vat?s.item_phantom_vat.toFixed(2)+" DKK":"0.00 DKK"}</b>
                            </div>
                            <div id="real-vat-preview" class="vf-vat ${i==="DK_B2B"?"":"hidden"}">
                                <span>IVA factura DK 25%</span><b id="real-vat-amount">${s.item_real_vat?s.item_real_vat.toFixed(2)+" DKK":"0.00 DKK"}</b>
                            </div>
                        </div>
                    </section>

                    <!-- Dónde se vende -->
                    <section class="vf-card">
                        <h4 class="vf-h">Dónde se vende</h4>
                        ${p("publish_local","Tienda","Disponible en la caja (POS)",s.publish_local!==!1)}
                        ${p("is_online","Web shop","Visible en elcuartito.dk",s.is_online!==!1)}
                        ${p("publish_discogs","Discogs","Crea o actualiza el listing al guardar. Necesita un release elegido arriba.",!!(s.publish_discogs||s.discogs_listing_id))}
                        <div class="flex flex-wrap gap-2 mt-4">
                            ${b("tag_hero","hero","Destacado",l.includes("hero"))}
                            ${b("tag_new","new_arrival","Novedad",d)}
                            ${b("is_rsd_discount","","10% RSD",!!s.is_rsd_discount)}
                        </div>
                    </section>

                    <!-- Más detalles -->
                    <div>
                        <button type="button" onclick="app.toggleVinylAdvanced()" class="vf-more">
                            <span>Más detalles <em>año, ubicación, lote, colección, notas, tracklist</em></span>
                            <i id="vinyl-advanced-caret" class="ph ${E?"ph-caret-up":"ph-caret-down"}"></i>
                        </button>
                        <section id="vinyl-advanced-options" class="${E?"":"hidden"} vf-card mt-3">
                            <div class="grid grid-cols-2 gap-3">
                                <label class="vf-field"><span>Año / prensaje</span>
                                    <input name="year" value="${o(s.year)}" placeholder="2023" class="vf-input"></label>
                                <label class="vf-field"><span>Ubicación</span>
                                    <input name="storageLocation" value="${o(s.storageLocation)}" placeholder="Estante A" class="vf-input"></label>
                                <label class="vf-field"><span>Lote</span>
                                    <input name="lot" list="vinyl-lot-list" value="${o(s.lot)}" placeholder="RUSHOUR-123" class="vf-input">
                                    <datalist id="vinyl-lot-list">${this.getRecentLots(20).map(m=>`<option value="${o(m)}">`).join("")}</datalist></label>
                                <label class="vf-field"><span>Colección</span>
                                    <input name="collection_tag" list="collections-list" value="${o(v)}" placeholder="Nueva o existente" class="vf-input">
                                    <datalist id="collections-list">${[...new Set(this.state.inventory.flatMap(m=>m.tags||[]).filter(m=>m!=="hero"&&m!=="new_arrival"))].map(m=>`<option value="${o(m)}">`).join("")}</datalist></label>
                            </div>
                            <label class="vf-field mt-3"><span>Notas</span>
                                <input name="comments" value="${o(s.comments)}" placeholder="Opcional" class="vf-input"></label>
                            <div id="discogs-metadata-area" class="${s.tracks&&s.tracks.length?"":"hidden"} mt-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="vf-mini-label">Tracklist</span>
                                    <a id="discogs-link" href="${o(s.discogsUrl||"#")}" target="_blank" rel="noopener" class="${s.discogsUrl?"":"hidden"} text-xs font-semibold underline">Ver en Discogs</a>
                                </div>
                                <div id="metadata-tracks" class="vf-tracks">
                                    ${(s.tracks||[]).map(m=>`<div class="track-item flex justify-between gap-4"><span class="w-8 opacity-50 shrink-0">${m.position||"•"}</span><span class="flex-1 truncate">${m.title}</span><span class="opacity-50 shrink-0">${m.duration||""}</span></div>`).join("")}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <!-- Hidden Fields -->
                <input type="hidden" name="cover_image" id="input-cover-image" value="${o(s.cover_image)}">
                <input type="hidden" name="discogs_release_id" id="input-discogs-release-id" value="${o(s.discogs_release_id)}">
                <input type="hidden" name="discogsUrl" id="input-discogs-url" value="${o(s.discogsUrl)}">
                <input type="hidden" name="discogsId" id="input-discogs-id" value="${o(s.discogsId)}">
                <input type="hidden" name="sku" value="${o(s.sku)}">
                <input type="hidden" name="tracks" id="input-tracks" value='${s.tracks?JSON.stringify(s.tracks).replace(/'/g,"&#39;"):""}'>

                <footer class="vf-foot">
                    <button type="button" onclick="app.closeVinylForm()" class="cx-btn">Cancelar</button>
                    <div class="flex gap-2">
                        ${a?"":'<button type="submit" data-again="1" class="cx-btn">Guardar y cargar otro</button>'}
                        <button type="submit" class="cx-btn is-primary">${a?"Guardar cambios":"Guardar disco"}</button>
                    </div>
                </footer>
            </form>
        </aside>
    </div>`;document.body.insertAdjacentHTML("beforeend",$),this.calculateMargin(),a||(C=document.getElementById("discogs-search-input"))==null||C.focus()},openProductModal(t){console.log("Attempting to open modal for:",t);try{const e=this.state.inventory.find(o=>o.id===t||o.sku===t);if(!e){console.error("Item not found:",t),alert("Error: No se encontró el disco. Intenta recargar.");return}const s=document.getElementById("modal-overlay");s&&s.remove();const a=`
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
                                ${e.lot?`
                                <div class="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span class="text-sm text-slate-500 font-medium">Lote</span>
                                    <button onclick="document.getElementById('modal-overlay').remove(); app.gotoInventoryLot('${e.lot}')" class="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-all" title="Ver discos de este lote">
                                        <i class="ph-bold ph-package"></i>${e.lot}
                                    </button>
                                </div>`:""}
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
                `;document.body.insertAdjacentHTML("beforeend",a)}catch(e){console.error("Error opening product modal:",e),alert("Hubo un error al abrir la ficha. Por favor recarga la página.")}},calculateMargin(){const t=document.getElementById("modal-cost"),e=document.getElementById("modal-price"),s=document.getElementById("profit-percent"),a=document.getElementById("profit-label");if(!t||!e||!s||!a)return;const o=parseFloat(t.value)||0,i=parseFloat(e.value)||0;if(i>0){const r=i-o,n=r/i*100;s.innerText=`${Math.round(n)}%`,a.innerText=`${r>=0?"+":""}${Math.round(r)} kr`,r>=0?a.className="profit-tag":a.className="profit-tag bg-red-50 text-red-600 border-red-100"}else s.innerText="0%",a.innerText="+0 kr",a.className="profit-tag"},calculateProfit(){this.calculateMargin()},onCostChange(){const t=document.getElementById("modal-cost"),e=document.getElementById("modal-multiplier"),s=document.getElementById("multiplier-label");if(!t||!e)return;const a=parseFloat(t.value)||0;document.activeElement!==e&&(a>100?(e.value="2.2",s&&(s.textContent="Disco caro (+100kr)",s.className="vf-hint")):(e.value="2.5",s&&(s.textContent="Disco barato (≤100kr)",s.className="vf-hint"))),this.applyPriceMultiplier(),this.updatePhantomVatPreview()},applyPriceMultiplier(){const t=document.getElementById("modal-cost"),e=document.getElementById("modal-multiplier"),s=document.getElementById("modal-price");if(!t||!e||!s)return;const a=parseFloat(t.value)||0,o=parseFloat(e.value)||1;if(a>0){const i=a*o,r=Math.round(i/5)*5;s.value=r}document.querySelectorAll("[data-mult]").forEach(i=>i.classList.toggle("is-on",parseFloat(i.dataset.mult)===o)),this.calculateMargin()},onProviderOriginChange(){var o;const t=(o=document.getElementById("modal-provider-origin"))==null?void 0:o.value,e=document.getElementById("acquisition-date-container"),s=document.getElementById("phantom-vat-preview"),a=document.getElementById("real-vat-preview");t==="EU_B2B"?(e==null||e.classList.remove("hidden"),s==null||s.classList.remove("hidden"),a==null||a.classList.add("hidden"),this.updatePhantomVatPreview()):t==="DK_B2B"?(e==null||e.classList.remove("hidden"),s==null||s.classList.add("hidden"),a==null||a.classList.remove("hidden"),this.updatePhantomVatPreview()):(e==null||e.classList.add("hidden"),s==null||s.classList.add("hidden"),a==null||a.classList.add("hidden"))},updatePhantomVatPreview(){var a,o;const t=parseFloat((a=document.getElementById("modal-cost"))==null?void 0:a.value)||0,e=(o=document.getElementById("modal-provider-origin"))==null?void 0:o.value,s=Math.round(t*.25*100)/100;if(e==="EU_B2B"){const i=document.getElementById("phantom-vat-amount");i&&(i.textContent=s.toFixed(2)+" DKK")}else if(e==="DK_B2B"){const i=document.getElementById("real-vat-amount");i&&(i.textContent=s.toFixed(2)+" DKK")}},handleCostChange(){const t=parseFloat(document.getElementById("modal-cost").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),a=document.getElementById("modal-margin"),o=document.getElementById("modal-price");if(s){const i=parseFloat(s)/100;if(i>0){const r=t/i;o.value=Math.ceil(r)}}else{const r=1-(parseFloat(a.value)||0)/100;if(r>0){const n=t/r;o.value=Math.ceil(n)}}},handlePriceChange(){const t=parseFloat(document.getElementById("modal-price").value)||0,e=document.getElementById("modal-owner"),s=e.options[e.selectedIndex].getAttribute("data-split"),a=document.getElementById("modal-margin"),o=document.getElementById("modal-cost"),i=document.getElementById("cost-helper");if(s){const r=parseFloat(s)/100,n=t*r;o.value=Math.round(n),a.value=100-parseFloat(s),a.readOnly=!0,a.classList.add("opacity-50"),i&&(i.innerText=`Consignación: ${s}% Socio`)}else{const r=parseFloat(o.value)||0;if(r>0&&t>0){const n=(t-r)/r*100;a.value=Math.round(n)}a.readOnly=!1,a.classList.remove("opacity-50"),i&&(i.innerText="Modo Propio: Margen variable")}},handleMarginChange(){const t=parseFloat(document.getElementById("modal-margin").value)||0,e=parseFloat(document.getElementById("modal-cost").value)||0,s=document.getElementById("modal-price");if(e>0){const a=e*(1+t/100);s.value=Math.ceil(a)}},checkCustomInput(t,e){const s=document.getElementById(e);t.value==="other"?(s.classList.remove("hidden"),s.querySelector("input").required=!0,s.querySelector("input").focus()):(s.classList.add("hidden"),s.querySelector("input").required=!1)},toggleCollectionNote(t){const e=document.getElementById("collection-note-container");e&&t&&t!==""?e.classList.remove("hidden"):e&&e.classList.add("hidden")},handleCollectionChange(t){var a;const e=document.getElementById("custom-collection-container"),s=document.getElementById("collection-note-container");t==="other"?(e==null||e.classList.remove("hidden"),(a=e==null?void 0:e.querySelector("input"))==null||a.focus()):e==null||e.classList.add("hidden"),t&&t!==""?s==null||s.classList.remove("hidden"):s==null||s.classList.add("hidden")},openAddSaleModal(){const t=this.state.cart.length>0?this.state.cart.map(s=>`
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
                                    <span class="text-xl font-bold text-brand-dark">${this.formatCurrency(this.state.cart.reduce((s,a)=>s+a.price,0))}</span>
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
                                                    `;document.body.insertAdjacentHTML("beforeend",e),setTimeout(()=>document.getElementById("sku-search").focus(),100)},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(o=>o.id===t||o.sku===t);if(!s)return;if(this.state.cart.filter(o=>o.sku===t).length>=s.stock){this.showToast(`⚠️ No queda más stock de "${s.album}"`,"warning");return}this.openAddSaleModal(),setTimeout(()=>{const o=document.getElementById("sku-search");o.value=t,this.searchSku(t),setTimeout(()=>{const i=document.getElementById("sku-results").firstElementChild;i&&i.click()},500)},200)},openUnifiedOrderDetailModal(t){var p,b,y;const e=this.state.sales.find(v=>v.id===t);if(!e)return;const s=e.history||[],a=(p=e.timestamp)!=null&&p.toDate?e.timestamp.toDate():e.date?new Date(e.date):new Date;let o=[];s.length>0?o=s.map(v=>({status:v.status,timestamp:new Date(v.timestamp),note:v.note})).sort((v,E)=>E.timestamp-v.timestamp):o.push({status:e.fulfillment_status||"pending",timestamp:(b=e.updated_at)!=null&&b.toDate?e.updated_at.toDate():e.updated_at?new Date(e.updated_at):new Date,note:"Última actualización"}),o.push({status:"created",timestamp:a,note:`Orden recibida via ${e.channel||e.soldAt||"Sistema"}`});const i=v=>({created:{cls:"is-done",label:"Recibido"},preparing:{cls:"is-wait",label:"En preparación"},ready_for_pickup:{cls:"is-ok",label:"Listo para retiro"},in_transit:{cls:"is-wait",label:"En tránsito"},label_created:{cls:"is-wait",label:"Etiqueta creada"},shipped:{cls:"is-ok",label:"Despachado"},picked_up:{cls:"is-ok",label:"Retirado"},completed:{cls:"is-ok",label:"Confirmado"},failed:{cls:"is-hot",label:"Fallido"},PENDING:{cls:"is-wait",label:"Pendiente"}})[v]||{cls:"is-done",label:v},r=e.items?e.items.reduce((v,E)=>{var $;return v+(E.unitPrice||E.priceAtSale||(($=E.record)==null?void 0:$.price)||0)*(E.qty||E.quantity||1)},0):e.total||0,n=parseFloat(e.shipping_income||e.shipping_cost||e.shipping||((y=e.shipping_method)==null?void 0:y.price)||0),c=n*.2,l=(e.discogsFee||0)+(e.paypalFee||0),d=e.total_amount||e.total||r+n,h=(v,E,$,I)=>`
            <button onclick="${E}" class="vf-seg-btn ${v?"is-on":""}"><i class="ph ${$}"></i> ${I}</button>`,u=`
        <div id="unified-modal" class="vf-overlay" onclick="if (event.target === this) this.remove()">
            <aside class="vf-panel cx-view !max-w-[640px]" role="dialog" aria-modal="true" aria-labelledby="order-title">
                <header class="vf-head">
                    <div class="min-w-0">
                        <h3 id="order-title" class="vf-title">Pedido #${e.orderNumber||e.id.slice(0,8)}</h3>
                        <div class="flex items-center gap-1.5 mt-2 flex-wrap">
                            ${this.saleChannelBadge(e)}
                            <span class="cx-state ${i(e.status).cls}">${i(e.status).label}</span>
                            <span class="text-xs text-stone-500 ml-1">${a.toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"})}</span>
                        </div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button onclick="window.print()" class="cx-btn is-icon" title="Imprimir" aria-label="Imprimir"><i class="ph ph-printer"></i></button>
                        <button onclick="document.getElementById('unified-modal').remove()" class="cx-btn is-icon" aria-label="Cerrar"><i class="ph ph-x"></i></button>
                    </div>
                </header>

                <div class="vf-body">
                    <!-- Resumen -->
                    <div class="grid grid-cols-3 gap-3">
                        <div class="cx-tile cx-dark col-span-3 sm:col-span-1">
                            <span class="cx-tile-label">Total</span>
                            <b class="cx-tile-value">${this.formatCurrency(d)}</b>
                        </div>
                        <div class="cx-tile cx-frost">
                            <span class="cx-tile-label">Canal</span>
                            <b class="text-lg font-semibold capitalize">${e.channel||e.soldAt||"Local"}</b>
                        </div>
                        <div class="cx-tile cx-frost">
                            <span class="cx-tile-label">Envío</span>
                            <b class="text-lg font-semibold capitalize">${(e.fulfillment_status||"Pendiente").replace("_"," ")}</b>
                        </div>
                    </div>

                    <!-- Discos -->
                    <section class="vf-card !p-2">
                        <h4 class="vf-h px-3 pt-2 !mb-1">Discos (${(e.items||[]).reduce((v,E)=>v+(Number(E.quantity||E.qty)||1),0)})</h4>
                        ${(e.items||[]).map(v=>{var E,$,I,C,m;return`
                            <div class="flex items-center gap-3 px-3 py-2.5">
                                <span class="cx-cover !w-11 !h-11"><img src="${this.resolveItemCover(v)||"https://elcuartito.dk/default-vinyl.png"}" class="w-full h-full object-cover" alt=""></span>
                                <div class="flex-1 min-w-0">
                                    <p class="font-semibold text-sm truncate">${v.album||((E=v.record)==null?void 0:E.album)||"Desconocido"}</p>
                                    <p class="text-xs text-stone-500 truncate">${v.artist||(($=v.record)==null?void 0:$.artist)||""}${v.sku||(I=v.record)!=null&&I.sku?" · "+(v.sku||((C=v.record)==null?void 0:C.sku)):""}</p>
                                </div>
                                <span class="text-xs text-stone-500">×${v.quantity||v.qty||1}</span>
                                <span class="font-semibold text-sm w-24 text-right">${this.formatCurrency(v.unitPrice||v.priceAtSale||((m=v.record)==null?void 0:m.price)||0)}</span>
                            </div>
                        `}).join("")}
                    </section>

                    <!-- Dinero -->
                    <section class="vf-card">
                        <h4 class="vf-h">Resumen</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between"><span class="text-stone-500">Subtotal</span><span class="font-medium">${this.formatCurrency(r)}</span></div>
                            <div class="flex justify-between"><span class="text-stone-500">Envío cobrado</span><span class="font-medium">${this.formatCurrency(n)}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-stone-500 pl-3">Moms del envío (incluido)</span><span class="text-stone-500">${this.formatCurrency(c)}</span></div>
                            ${l!==0?`<div class="flex justify-between"><span class="text-stone-500">Comisiones Discogs / PayPal</span><span class="font-medium text-red-700">-${this.formatCurrency(l)}</span></div>`:""}
                            <div class="flex justify-between font-semibold pt-2 border-t border-black/10"><span>Total final</span><span>${this.formatCurrency(d)}</span></div>
                        </div>
                        <div class="flex items-center gap-3 mt-4 p-3 rounded-2xl bg-white/70">
                            <span class="cx-sq !w-10 !h-10 !text-lg"><i class="ph ph-credit-card"></i></span>
                            <div>
                                <p class="text-sm font-semibold capitalize">${e.payment_method||e.paymentMethod||"Tarjeta"}</p>
                                <p class="text-xs text-stone-500">${e.paymentId?"ID "+e.paymentId.slice(0,15)+"…":"Venta directa"}</p>
                            </div>
                        </div>
                    </section>

                    <!-- Cliente -->
                    <section class="vf-card">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="vf-h !mb-0">Cliente</h4>
                            <button onclick="app.toggleCustomerEdit('${e.id}')" class="cx-row-btn" title="Editar datos del cliente" aria-label="Editar datos del cliente"><i class="ph ph-pencil-simple"></i></button>
                        </div>
                        <div id="ci-view">${this.renderCustomerInfoView(e)}</div>
                        <div id="ci-form" class="hidden">${this.renderCustomerInfoForm(e)}</div>
                    </section>

                    ${e.channel==="online"||e.channel==="discogs"?`
                    <!-- Envío -->
                    <section class="vf-card">
                        <h4 class="vf-h">Estado del envío</h4>
                        <div class="vf-segs is-wide">
                            ${h(e.fulfillment_status==="preparing",`app.updateFulfillmentStatus(event, '${e.id}', 'preparing')`,"ph-package","Preparando")}
                            ${h(e.fulfillment_status==="ready_for_pickup",`app.setReadyForPickup('${e.id}', event)`,"ph-storefront","Para retiro")}
                            ${h(e.fulfillment_status==="shipped",`app.updateFulfillmentStatus(event, '${e.id}', 'shipped')`,"ph-paper-plane-tilt","Enviado")}
                        </div>
                    </section>`:""}

                    <!-- Movimientos -->
                    <section class="vf-card">
                        <h4 class="vf-h">Movimientos</h4>
                        <div class="relative pl-5 border-l-2 border-black/10 space-y-5 ml-1">
                            ${o.map((v,E)=>{const $=i(v.status);return`
                                <div class="relative">
                                    <span class="absolute -left-[27px] top-1 w-3 h-3 rounded-full ${E===0?"bg-[#F05A28] ring-4 ring-[#F05A28]/20":"bg-[#B9B4AA]"}"></span>
                                    <div class="flex items-center gap-2">
                                        <span class="cx-state ${$.cls}">${$.label}</span>
                                        <span class="text-xs text-stone-500">${v.timestamp.toLocaleDateString("es-ES",{day:"2-digit",month:"short"})} ${v.timestamp.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</span>
                                    </div>
                                    <p class="text-sm text-stone-600 mt-1">${v.note||"—"}</p>
                                </div>`}).join("")}
                        </div>
                    </section>
                </div>

                <footer class="vf-foot">
                    <span class="text-xs text-stone-500">Registrado el ${a.toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"})}</span>
                    <button onclick="document.getElementById('unified-modal').remove()" class="cx-btn is-primary">Cerrar</button>
                </footer>
            </aside>
        </div>
        `;document.body.insertAdjacentHTML("beforeend",u)},renderCustomerInfoView(t){const e=this.getCustomerInfo(t),s=(a,o)=>`
                <div class="flex justify-between gap-4 py-2 border-b border-black/5 last:border-0">
                    <span class="text-sm text-stone-500 shrink-0">${a}</span>
                    <span class="text-sm font-medium text-right min-w-0 break-words">${o}</span>
                </div>`;return`
            <div>
                ${s("Nombre",`<b class="font-semibold">${e.name}</b>`)}
                ${s("Email",e.email||"—")}
                ${s("Teléfono",e.phone||"—")}
                ${s("Dirección",`${e.address||"Sin dirección registrada"}${e.hasAddress?`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address)}" target="_blank" rel="noopener" class="block text-xs underline mt-1">Ver en Maps</a>`:""}`)}
            </div>`},renderCustomerInfoForm(t){const e=c=>String(c??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),s=t.customer||{},a=s.shipping||{},o=t.customerName||s.name||"",i=t.customerEmail||s.email||"",r=s.phone||t.customerPhone||t.phone||"",n=(c,l,d,h="text",u="")=>`
            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">${l}</label>
                <input id="${c}" type="${h}" value="${e(d)}" placeholder="${u}"
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-orange outline-none text-sm font-medium text-brand-dark">
            </div>`;return`
            <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                ${n("ci-name","Nombre",o,"text","Nombre del cliente")}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${n("ci-email","Email",i,"email","cliente@mail.com")}
                    ${n("ci-phone","Teléfono",r,"tel","+45 ...")}
                </div>
                ${n("ci-addr1","Dirección (línea 1)",a.line1||"","text","Calle y número")}
                ${n("ci-addr2","Dirección (línea 2)",a.line2||"","text","Piso, puerta (opcional)")}
                <div class="grid grid-cols-2 gap-3">
                    ${n("ci-city","Ciudad",a.city||"","text","Copenhague")}
                    ${n("ci-zip","Código postal",a.postal_code||a.zip||"","text","1050")}
                </div>
                ${n("ci-country","País",a.country||"","text","Dinamarca")}
                <div class="flex gap-2 pt-1">
                    <button onclick="app.saveCustomerInfo('${t.id}')"
                        class="flex-1 py-2.5 bg-brand-dark text-white text-xs font-bold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2">
                        <i class="ph-bold ph-check"></i> Guardar datos
                    </button>
                    <button onclick="app.toggleCustomerEdit('${t.id}')"
                        class="px-4 py-2.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors">
                        Cancelar
                    </button>
                </div>
            </div>`},toggleCustomerEdit(t){const e=document.getElementById("ci-view"),s=document.getElementById("ci-form");!e||!s||(e.classList.toggle("hidden"),s.classList.toggle("hidden"))},async saveCustomerInfo(t){const e=this.state.sales.find(b=>b.id===t);if(!e)return;const s=b=>{var y;return(((y=document.getElementById(b))==null?void 0:y.value)||"").trim()},a=s("ci-name"),o=s("ci-email"),i=s("ci-phone"),r=s("ci-addr1"),n=s("ci-addr2"),c=s("ci-city"),l=s("ci-zip"),d=s("ci-country");if(o&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o)){this.showToast("⚠️ El email no tiene un formato válido");return}const h={"customer.name":a,"customer.email":o,"customer.phone":i,"customer.shipping.line1":r,"customer.shipping.line2":n,"customer.shipping.city":c,"customer.shipping.postal_code":l,"customer.shipping.country":d};e.customerName!==void 0&&(h.customerName=a),e.customerEmail!==void 0&&(h.customerEmail=o),e.customerPhone!==void 0&&(h.customerPhone=i),e.phone!==void 0&&(h.phone=i);const u=!!(e.customer&&e.customer.shipping),p=[[r,n].filter(Boolean).join(" "),[l,c].filter(Boolean).join(" "),d].filter(Boolean).join(", ");u||(e.address!==void 0?h.address=p:e.customer&&e.customer.address!==void 0&&(h["customer.address"]=p));try{await T.collection("sales").doc(t).update(h),e.customer=e.customer||{},e.customer.name=a,e.customer.email=o,e.customer.phone=i,e.customer.shipping={line1:r,line2:n,city:c,postal_code:l,country:d},e.customerName!==void 0&&(e.customerName=a),e.customerEmail!==void 0&&(e.customerEmail=o),e.customerPhone!==void 0&&(e.customerPhone=i),e.phone!==void 0&&(e.phone=i),u||(e.address!==void 0?e.address=p:e.customer.address!==void 0&&(e.customer.address=p)),this.refreshCurrentView();const b=document.getElementById("ci-view"),y=document.getElementById("ci-form");b&&(b.innerHTML=this.renderCustomerInfoView(e),b.classList.remove("hidden")),y&&(y.innerHTML=this.renderCustomerInfoForm(e),y.classList.add("hidden")),this.showToast("✅ Datos del cliente actualizados")}catch(b){console.error("saveCustomerInfo:",b),this.showToast("⚠️ Error al guardar: "+b.message)}},openInvoiceModal(t){var $;const e=this.state.sales.find(I=>I.id===t);if(!e){this.showToast("Sale not found","error");return}const s=e.items||[],a=($=e.date)!=null&&$.toDate?e.date.toDate():new Date(e.date||e.timestamp),o=a.toISOString().slice(0,10).replace(/-/g,""),i=e.invoiceNumber||`ECR-${o}-${t.slice(-4).toUpperCase()}`,r=s.filter(I=>I.productCondition==="New"),n=s.filter(I=>I.productCondition!=="New");let c=0,l=0;const d=(I,C)=>I.map(m=>{const g=m.priceAtSale||m.price||0,f=m.qty||m.quantity||1,k=g*f;if(l+=k,C){const _=k*.2;return c+=_,`
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${m.album||"Product"}</div>
                                <div style="font-size: 11px; color: #666;">${m.artist||""}</div>
                                <div style="font-size: 11px; color: #2563eb; margin-top: 4px;">✓ Moms (25%): DKK ${_.toFixed(2)}</div>
                            </td>
                            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eee;">${f}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee;">DKK ${g.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">DKK ${k.toFixed(2)}</td>
                        </tr>
                    `}else return`
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${m.album||"Product"}</div>
                                <div style="font-size: 11px; color: #666;">${m.artist||""}</div>
                                <div style="font-size: 10px; color: #d97706; margin-top: 4px; font-style: italic;">Brugtmoms - Køber har ikke fradrag for momsen</div>
                            </td>
                            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #eee;">${f}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee;">DKK ${g.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">DKK ${k.toFixed(2)}</td>
                        </tr>
                    `}).join("");let h="";r.length>0&&n.length>0?h=`
                <tr><td colspan="4" style="padding: 15px 0 8px 0; font-size: 12px; font-weight: bold; color: #2563eb; text-transform: uppercase;">🆕 New Products (VAT Deductible)</td></tr>
                ${d(r,!0)}
                <tr><td colspan="4" style="padding: 20px 0 8px 0; font-size: 12px; font-weight: bold; color: #d97706; text-transform: uppercase;">📦 Used Products (Margin Scheme / Brugtmoms)</td></tr>
                ${d(n,!1)}
            `:h=d(r,!0)+d(n,!1);const u=parseFloat(e.shipping_income||e.shipping||e.shipping_cost||0),p=u*.2,b=l+u,y=e.customer?`${e.customer.firstName||""} ${e.customer.lastName||""}`.trim():e.customerName||"Customer",v=e.customer?`${e.customer.address||""}<br>${e.customer.postalCode||""} ${e.customer.city||""}<br>${e.customer.country||""}`:"",E=`
            <div id="invoice-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick="if(event.target.id === 'invoice-modal') this.remove()">
                <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div class="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                        <h3 class="font-bold text-lg text-brand-dark flex items-center gap-2">
                            <i class="ph-fill ph-file-text text-brand-orange"></i>
                            Invoice ${i}
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
                                    <p style="color: #666; margin: 0;">${y}</p>
                                    ${v?`<p style="color: #666; margin: 5px 0; font-size: 12px;">${v}</p>`:""}
                                </div>
                                <div style="text-align: right;">
                                    <p style="margin: 0;"><strong>Invoice:</strong> ${i}</p>
                                    <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${a.toLocaleDateString("en-GB")}</p>
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
                                    ${h}
                                </tbody>
                            </table>

                            <div style="border-top: 2px solid #eee; padding-top: 15px; font-size: 14px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>Subtotal:</span>
                                    <span>DKK ${l.toFixed(2)}</span>
                                </div>
                                ${c>0?`
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #2563eb; font-size: 13px;">
                                    <span>↳ Heraf moms (25%):</span>
                                    <span>DKK ${c.toFixed(2)}</span>
                                </div>
                                `:""}
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>Shipping (incl. 25% VAT):</span>
                                    <span>DKK ${u.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #2563eb; font-size: 11px;">
                                    <span>↳ Shipping VAT (25%):</span>
                                    <span>DKK ${p.toFixed(2)}</span>
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
        `;document.body.insertAdjacentHTML("beforeend",E)},printInvoice(){const t=document.getElementById("invoice-content").innerHTML,e=window.open("","_blank");e.document.write(`
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
        `),e.document.close()},navigateInventoryFolder(t,e){t==="genre"&&(this.state.filterGenre=e),t==="owner"&&(this.state.filterOwner=e),t==="label"&&(this.state.filterLabel=e),t==="storage"&&(this.state.filterStorage=e),this.refreshCurrentView()},toggleSelection(t){this.state.selectedItems.has(t)?this.state.selectedItems.delete(t):this.state.selectedItems.add(t),this.refreshCurrentView()},async openPrintLabelModal(t){const e=this.state.inventory.find(r=>r.id===t||r.sku===t);if(!e)return;let s={...e};try{const r=await T.collection("products").doc(e.id).get();r.exists&&(s={...e,...r.data()})}catch(r){console.warn("[printLabel] Could not fetch fresh product data, using state copy",r)}const a=s.year&&Number(s.year)!==0?String(s.year):"—",o=s.price?Number(s.price).toLocaleString("da-DK"):"—",i=`
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
                                <input id="label-edit-year" type="text" value="${a!=="—"?a:""}" 
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
                                            <span class="label-b__meta-item label-b__meta-item--right"><span class="label-b__meta-key">Year </span><span class="label-b__meta-mono" id="preview-meta-year">${a}</span></span>
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
                                        <div class="label-b__price" id="preview-price">${o}</div>
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
`;document.body.insertAdjacentHTML("beforeend",i),setTimeout(()=>{const r=document.getElementById("qr-container");r&&typeof QRCode<"u"&&(r.innerHTML="",new QRCode(r,{text:s.sku,width:57,height:57,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M}))},50)},closePrintLabelModal(){const t=document.getElementById("print-label-modal");if(t){const e=document.getElementById("label-comment");e&&(e.value=""),t.remove()}},setLabelOrientation(t){const e=document.getElementById("print-label-modal");if(!e)return;e.dataset.orientation=t;const s=document.getElementById("orient-h"),a=document.getElementById("orient-v"),o="flex-1 py-2 bg-white text-brand-dark font-bold rounded-lg text-sm shadow-sm flex items-center justify-center gap-1.5 transition-all",i="flex-1 py-2 text-slate-500 font-bold rounded-lg text-sm flex items-center justify-center gap-1.5 transition-all";s&&(s.className=t==="landscape"?o:i),a&&(a.className=t==="portrait"?o:i);const r=document.getElementById("printable-label");r&&r.classList.toggle("label-b--portrait",t==="portrait")},async confirmPrintLabel(){const t=document.getElementById("label-comment"),e=document.getElementById("preview-comment"),s=t?t.value:"";t&&e&&(e.innerText=s);const a=document.querySelector('#print-label-modal button[onclick="app.confirmPrintLabel()"]');a&&(a.disabled=!0,a.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Imprimiendo…');try{const o=document.getElementById("print-label-modal"),i=o&&o.dataset.orientation||"landscape",n=(await this._drawLabelCanvas(s,i)).toDataURL("image/png").split(",")[1],c=await fetch(`${j}/api/print-label`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:n})}),l=await c.json();if(!c.ok)throw new Error(l.error||"Error desconocido");a&&(a.innerHTML='<i class="ph-bold ph-check"></i> ¡Enviado!',a.classList.replace("bg-brand-dark","bg-green-600")),this.showToast("✅ Etiqueta enviada a la impresora"),setTimeout(()=>this.closePrintLabelModal(),1500)}catch(o){a&&(a.disabled=!1,a.innerHTML='<i class="ph-bold ph-printer"></i> Imprimir'),this.showToast("Error al imprimir: "+o.message,"error")}},async _drawLabelCanvas(t,e="landscape"){const s=document.getElementById("print-label-modal"),a=s?s.dataset.sku:null,o=a?this.state.inventory.find(v=>v.id===a||v.sku===a)||{}:{},i=(v,E)=>{const $=document.getElementById(v);return $&&$.value.trim()?$.value.trim():E},r={...o,album:i("label-edit-title",o.album),artist:i("label-edit-artist",o.artist),year:i("label-edit-year",o.year),price:i("label-edit-price",o.price),genre:i("label-edit-genre1",o.genre),genre2:i("label-edit-genre2",o.genre2),condition:i("label-edit-cond",o.condition),storageLocation:i("label-edit-loc",o.storageLocation)},n=300/25.4,c=e==="portrait",l=Math.round((c?40:62)*n),d=Math.round((c?62:40)*n),h=document.createElement("canvas");h.width=l,h.height=d;const u=h.getContext("2d");"wordSpacing"in u&&(u.wordSpacing="0px"),"letterSpacing"in u&&(u.letterSpacing="0px"),u.fillStyle="#ffffff",u.fillRect(0,0,l,d);const p=Math.round(5.5*n);u.fillStyle="#000000",u.fillRect(0,0,l,p);const b=Math.round(2.2*n);u.fillStyle="#ffffff",u.font=`800 ${b}px "DM Sans", Arial, sans-serif`,u.textBaseline="middle",u.textAlign="left";const y=((r.genre||"VINYL")+(r.genre2?" / "+r.genre2:"")).toUpperCase();u.fillText(y,Math.round(1.6*n),p/2);try{const v=await new Promise(E=>{const $=new Image;$.crossOrigin="anonymous",$.onload=()=>E($),$.onerror=()=>E(null),$.src="logo-broadsheet.png"});if(v){const E=Math.round(3*n),$=Math.round(v.naturalWidth*(E/v.naturalHeight)),I=document.createElement("canvas");I.width=v.naturalWidth,I.height=v.naturalHeight;const C=I.getContext("2d");C.drawImage(v,0,0);const m=C.getImageData(0,0,I.width,I.height),g=m.data;for(let A=0;A<g.length;A+=4)g[A+3]>0&&(g[A]=255,g[A+1]=255,g[A+2]=255);C.putImageData(m,0,0);const k=Math.round(18*n),_=l-k+Math.round((k-$)/2),M=(p-E)/2;u.drawImage(I,_,M,$,E)}}catch{}if(c){const v=Math.round(1.6*n),E=l-v*2;u.textAlign="left",u.textBaseline="top";const $=Math.round(3.8*n);u.font=`800 ${$}px "DM Sans", Arial, sans-serif`,u.fillStyle="#000000";const I=this._wrapText(u,r.album||"",E,2);let C=p+Math.round(1.1*n);I.forEach((oe,O)=>{u.fillText(oe,v,C+O*Math.round($*1.1))}),C+=I.length*Math.round($*1.1);const m=Math.round(2.4*n);if(u.font=`600 ${m}px "DM Sans", Arial, sans-serif`,u.fillStyle="rgba(0,0,0,0.5)",C+=Math.round(.5*n),u.fillText(this._truncateText(u,r.artist||"",E),v,C),C+=m,r.label&&r.label!=="Desconocido"){const oe=Math.round(2.2*n);C+=Math.round(.6*n),u.font=`700 ${Math.round(1.9*n)}px "DM Sans", Arial, sans-serif`,u.fillStyle="rgba(0,0,0,0.35)",u.fillText("LABEL",v,C);const O=u.measureText("LABEL ").width;u.font=`600 ${oe}px "DM Sans", Arial, sans-serif`,u.fillStyle="#333333",u.fillText(this._truncateText(u,r.label,E-O),v+O,C),C+=oe}if(t){const oe=Math.round(2.1*n);u.font=`italic 600 ${oe}px "DM Sans", Arial, sans-serif`,u.fillStyle="rgba(0,0,0,0.4)",u.textBaseline="top";const O=E-Math.round(3*n),K=this._wrapText(u,t,O,5),de=Math.round(oe*1.35),pe=C+Math.round(1.8*n);K.forEach((Ee,we)=>{u.fillText(Ee,v+Math.round(1.5*n),pe+we*de)})}const g=Math.round(12*n),f=Math.round(20*n),k=Math.round((l-f)/2),_=d-g-Math.round(1.6*n),M=_-Math.round(4.5*n),A=M-Math.round(2.2*n);u.strokeStyle="rgba(0,0,0,0.15)",u.lineWidth=1,u.beginPath(),u.moveTo(v,M),u.lineTo(l-v,M),u.stroke();const B=Math.round(2*n),W=Math.round(1.8*n),P=E/3;u.textBaseline="middle";const V=(oe,O,K)=>{u.textAlign="left",u.font=`700 ${W}px "DM Sans", Arial, sans-serif`,u.fillStyle="rgba(0,0,0,0.45)",u.fillText(oe+" ",K,A);const de=u.measureText(oe+" ").width;u.font=`700 ${B}px "DM Mono", "Courier New", monospace`,u.fillStyle="rgba(0,0,0,0.7)",u.fillText(O,K+de,A)};V("Loc",r.storageLocation||"—",v),V("Cond",r.condition||"—",v+P),V("Year",r.year&&Number(r.year)!==0?String(r.year):"—",v+P*2);const H=Math.round(13*n),Z=Math.round((l-H)/2),Q=Math.round(1.9*n),w=C+Math.round(2.5*n),D=A-Math.round(Q+Math.round(.4*n)+4),U=w+Math.max(0,Math.round((D-w-H)/2)),se=document.getElementById("qr-container"),ae=se?se.querySelector("canvas"):null;ae?u.drawImage(ae,Z,U,H,H):(u.strokeStyle="#ccc",u.lineWidth=1,u.strokeRect(Z,U,H,H)),u.font=`600 ${Q}px "DM Mono", "Courier New", monospace`,u.fillStyle="rgba(0,0,0,0.45)",u.textAlign="center",u.textBaseline="top",u.fillText(r.sku||"",l/2,U+H+Math.round(.4*n)),u.fillStyle="#000000";const q=Math.round(.8*n);u.beginPath(),u.moveTo(k+q,_),u.lineTo(k+f-q,_),u.quadraticCurveTo(k+f,_,k+f,_+q),u.lineTo(k+f,_+g-q),u.quadraticCurveTo(k+f,_+g,k+f-q,_+g),u.lineTo(k+q,_+g),u.quadraticCurveTo(k,_+g,k,_+g-q),u.lineTo(k,_+q),u.quadraticCurveTo(k,_,k+q,_),u.closePath(),u.fill();const ce=r.price?Number(r.price).toLocaleString("da-DK"):"—",re=Math.round(4.8*n),X=Math.round(2.2*n),ee=re*1.1,z=X*1.1,G=_+(g-ee-z)/2+ee/2,Y=G+ee/2+z/2;u.textAlign="center",u.textBaseline="middle",u.font=`800 ${re}px "DM Mono", "Courier New", monospace`,u.fillStyle="#ffffff",u.fillText(ce,k+f/2,G),u.font=`700 ${X}px "DM Sans", Arial, sans-serif`,u.fillStyle="#ffffff",u.fillText("DKK",k+f/2,Y)}else{const v=p,E=Math.round(18*n),$=l-E,I=Math.round(1.6*n),C=Math.round(1.1*n);u.textAlign="left",u.textBaseline="top";const m=Math.round(3.8*n);u.font=`800 ${m}px "DM Sans", Arial, sans-serif`,u.fillStyle="#000000";const g=$-I-Math.round(.95*n),f=this._wrapText(u,r.album||"",g,2);f.forEach((ue,be)=>{u.fillText(ue,I,v+C+be*Math.round(m*1.1))});const k=Math.round(2.4*n);u.font=`600 ${k}px "DM Sans", Arial, sans-serif`,u.fillStyle="rgba(0,0,0,0.5)";const _=v+C+f.length*Math.round(m*1.1)+Math.round(.5*n),M=this._truncateText(u,r.artist||"",g);u.fillText(M,I,_);let A=_+k;if(r.label&&r.label!=="Desconocido"){const ue=Math.round(2.2*n),be=A+Math.round(.6*n);u.font=`700 ${Math.round(1.9*n)}px "DM Sans", Arial, sans-serif`,u.fillStyle="rgba(0,0,0,0.35)",u.fillText("LABEL",I,be),u.font=`600 ${ue}px "DM Sans", Arial, sans-serif`,u.fillStyle="#333333";const ve=I+u.measureText("LABEL ").width;u.fillText(this._truncateText(u,r.label,g-ve+I),ve,be),A=be+ue}const B=d-Math.round(5*n);if(t){const ue=Math.round(2.1*n);u.font=`italic 600 ${ue}px "DM Sans", Arial, sans-serif`,u.fillStyle="rgba(0,0,0,0.4)",u.textBaseline="top";const be=g-Math.round(2*n),ve=this._wrapText(u,t,be,5),Ie=Math.round(ue*1.35),Ce=ve.length*Ie,qe=A+(B-A-Ce)/2;ve.forEach((Ue,Oe)=>{u.fillText(Ue,I+Math.round(1.5*n),qe+Oe*Ie)})}const W=Math.round(2*n),P=Math.round(1.8*n),V=d-Math.round(2.5*n),Z=($-I-Math.round(.95*n))/3;u.strokeStyle="rgba(0,0,0,0.15)",u.lineWidth=1,u.beginPath(),u.moveTo(I,B),u.lineTo($-Math.round(.95*n),B),u.stroke(),u.textBaseline="middle",u.textAlign="left";const Q=(ue,be,ve)=>{u.font=`700 ${P}px "DM Sans", Arial, sans-serif`,u.fillStyle="rgba(0,0,0,0.45)",u.fillText(ue+" ",ve,V);const Ie=u.measureText(ue+" ").width;u.font=`700 ${W}px "DM Mono", "Courier New", monospace`,u.fillStyle="rgba(0,0,0,0.7)",u.fillText(be,ve+Ie,V)};Q("Loc",r.storageLocation||"—",I),Q("Cond",r.condition||"—",I+Z),Q("Year",r.year&&Number(r.year)!==0?String(r.year):"—",I+Z*2);const w=$;u.strokeStyle="rgba(0,0,0,0.12)",u.lineWidth=1,u.beginPath(),u.moveTo(w,v),u.lineTo(w,d),u.stroke();const D=document.getElementById("qr-container"),U=D?D.querySelector("canvas"):null,ae=Math.round(15*n),q=w+Math.round((E-ae)/2),ce=v+Math.round(1.1*n);U?u.drawImage(U,q,ce,ae,ae):(u.strokeStyle="#ccc",u.strokeRect(q,ce,ae,ae));const re=Math.round(1.9*n);u.font=`600 ${re}px "DM Mono", "Courier New", monospace`,u.fillStyle="rgba(0,0,0,0.45)",u.textAlign="center",u.textBaseline="top",u.fillText(r.sku||"",w+E/2,ce+ae+Math.round(.4*n));const X=Math.round(12*n),ee=Math.round(15*n),z=w+Math.round((E-ee)/2),G=d-X-Math.round(1.6*n);u.fillStyle="#000000";const Y=Math.round(.8*n);u.beginPath(),u.moveTo(z+Y,G),u.lineTo(z+ee-Y,G),u.quadraticCurveTo(z+ee,G,z+ee,G+Y),u.lineTo(z+ee,G+X-Y),u.quadraticCurveTo(z+ee,G+X,z+ee-Y,G+X),u.lineTo(z+Y,G+X),u.quadraticCurveTo(z,G+X,z,G+X-Y),u.lineTo(z,G+Y),u.quadraticCurveTo(z,G,z+Y,G),u.closePath(),u.fill();const oe=r.price?Number(r.price).toLocaleString("da-DK"):"—",O=Math.round(4.8*n),K=Math.round(2*n),de=O*1.1,pe=K*1.1,Ee=de+pe,we=G+(X-Ee)/2+de/2,ge=we+de/2+pe/2;u.textAlign="center",u.textBaseline="middle",u.font=`800 ${O}px "DM Mono", "Courier New", monospace`,u.fillStyle="#ffffff",u.fillText(oe,z+ee/2,we);const De=Math.round(2.2*n);u.font=`700 ${De}px "DM Sans", Arial, sans-serif`,u.fillStyle="#ffffff",u.fillText("DKK",z+ee/2,ge)}return h},_wrapText(t,e,s,a){const o=e.split(" "),i=[];let r="";for(const n of o){const c=r?r+" "+n:n;if(t.measureText(c).width>s&&r){if(i.push(r),r=n,i.length>=a)break}else r=c}if(r&&i.length<a&&i.push(r),i.length>0){const n=i[i.length-1];i[i.length-1]=this._truncateText(t,n,s)}return i},_truncateText(t,e,s){if(t.measureText(e).width<=s)return e;let a=e;for(;a.length>1&&t.measureText(a+"…").width>s;)a=a.slice(0,-1);return a+"…"},initFuse(){if(typeof Fuse>"u"){console.warn("Fuse.js not loaded yet");return}const t={keys:[{name:"artist",weight:.35},{name:"album",weight:.25},{name:"label",weight:.15},{name:"storageLocation",weight:.15},{name:"sku",weight:.1},{name:"lot",weight:.1},{name:"quickId",weight:.1},{name:"genre",weight:.03},{name:"notes",weight:.02}],threshold:.4,distance:100,ignoreLocation:!0,minMatchCharLength:2};this.fuse=new Fuse(this.state.inventory,t)},stockStatusBadges(t){const e=[];(Number(t.stock)||0)<=0&&e.push('<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold"><i class="ph-bold ph-x-circle"></i>Agotado</span>'),(this.state.cart||[]).some(o=>o.id===t.id||o.sku===t.sku)&&e.push('<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-bold"><i class="ph-bold ph-handshake"></i>Reservado</span>');const a=t.created_at?t.created_at.seconds?t.created_at.seconds*1e3:new Date(t.created_at).getTime():0;return a&&Date.now()-a<14*24*60*60*1e3&&e.push('<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold"><i class="ph-bold ph-sparkle"></i>Nuevo</span>'),e.join(" ")},getFilteredInventory(){const t=(this.state.inventorySearch||"").trim().toLowerCase(),e=this.state.filterGenre||"all",s=this.state.filterOwner||"all",a=this.state.filterLabel||"all",o=this.state.filterLot||"all",i=this.state.filterStorage||"all",r=this.state.filterDiscogs||"all",n=this.state.filterHero||"all",c=this.state.filterStock||"all",l=this.state.filterCondition||"all",d=this.state.filterPriceMin!==void 0&&this.state.filterPriceMin!==""?parseFloat(this.state.filterPriceMin):null,h=this.state.filterPriceMax!==void 0&&this.state.filterPriceMax!==""?parseFloat(this.state.filterPriceMax):null;let u=this.state.inventory;if((d!==null||h!==null)&&(u=u.filter(p=>{const b=parseFloat(p.price)||0;return(d===null||b>=d)&&(h===null||b<=h)})),t.length>=2)if(this.fuse)u=this.fuse.search(t).map(p=>p.item);else{const p=t.split(" ").filter(b=>b.length>0);u=u.filter(b=>p.every(y=>(b.artist||"").toLowerCase().includes(y)||(b.album||"").toLowerCase().includes(y)||(b.label||"").toLowerCase().includes(y)||(b.storageLocation||"").toLowerCase().includes(y)||(b.genre||"").toLowerCase().includes(y)||(b.notes||"").toLowerCase().includes(y)||(b.lot||"").toLowerCase().includes(y)||(b.sku||"").toLowerCase().includes(y)))}return u.filter(p=>{const b=[p.genre,p.genre2,p.genre3,p.genre4,p.genre5].filter(Boolean),y=[];b.forEach(Q=>{y.push(...Q.split(",").map(w=>w.trim()).filter(Boolean))});const v=[...new Set(y)],E=v.filter(Q=>Q.toLowerCase()!=="electronic"),$=E.length>0?E:v.length>0?v:["Otros"],I=e==="all"||$.includes(e),C=s==="all"||p.owner===s,m=a==="all"||p.label===a,g=o==="all"||(p.lot||"")===o,f=i==="all"||p.storageLocation===i,k=!!p.discogs_listing_id,_=r==="all"||r==="yes"&&k||r==="no"&&!k,M=p.tags&&(Array.isArray(p.tags),p.tags.includes("hero")),A=n==="all"||n==="yes"&&M||n==="no"&&!M,B=this.getTimeInStockCategory(p.created_at||null),W=this.state.filterStockTime.length===0||this.state.filterStockTime.includes(B),P=Number(p.stock)||0,V=c==="all"||c==="inStock"&&P>0||c==="outOfStock"&&P<=0,H=p.product_condition||"Second-hand";return I&&C&&m&&g&&f&&_&&A&&W&&V&&(l==="all"||l==="used"&&H==="Second-hand"||l==="new"&&H!=="Second-hand")})},toggleSelectAll(){const t=this.getFilteredInventory();t.length>0&&t.every(e=>this.state.selectedItems.has(e.sku))?t.forEach(e=>this.state.selectedItems.delete(e.sku)):t.forEach(e=>this.state.selectedItems.add(e.sku)),this.refreshCurrentView()},addSelectionToCart(){this.state.selectedItems.forEach(t=>{const e=this.state.inventory.find(s=>s.id===t||s.sku===t);e&&e.stock>0&&(this.state.cart.find(s=>s.sku===t)||this.state.cart.push(e))}),this.state.selectedItems.clear(),this.showToast(`${this.state.cart.length} items agregados al carrito`),this.refreshCurrentView()},deleteSelection(){if(!confirm(`¿Estás seguro de eliminar ${this.state.selectedItems.size} productos ? `))return;const t=T.batch(),e=[];this.state.selectedItems.forEach(s=>{const a=T.collection("products").doc(s),o=this.state.inventory.find(i=>i.id===s||i.sku===s);o&&e.push(o),t.delete(a)}),t.commit().then(()=>{this.showToast("Productos eliminados"),e.forEach(s=>this.logInventoryMovement("DELETE",s)),this.state.selectedItems.clear()}).catch(s=>{console.error("Error logging movement:",s),alert("Error al eliminar")})},async handleAddVinyl(t,e){var d;t.preventDefault();const s=new FormData(t.target);let a=s.get("genre"),o=s.get("collection");o==="other"&&(o=s.get("custom_collection"));const i=s.get("sku"),r=s.get("is_online")==="on",n=s.get("publish_discogs")==="on",c=s.get("publish_local")==="on",l={sku:i,artist:s.get("artist"),album:s.get("album"),genre:a,genre2:s.get("genre2")||null,genre3:s.get("genre3")||null,genre4:s.get("genre4")||null,genre5:s.get("genre5")||null,label:s.get("label"),collection:o||null,lot:(s.get("lot")||"").trim(),collectionNote:s.get("collectionNote")||null,year:s.get("year")?parseInt(s.get("year")):null,condition:s.get("condition"),provider_origin:s.get("provider_origin")||"Local_Used",sleeveCondition:s.get("sleeveCondition")||"",comments:s.get("comments")||"",price:parseFloat(s.get("price")),cost:parseFloat(s.get("cost"))||0,stock:parseInt(s.get("stock")),storageLocation:s.get("storageLocation"),owner:s.get("owner"),is_online:r,publish_webshop:r,publish_discogs:n,publish_local:c,cover_image:s.get("cover_image")||null,updated_at:firebase.firestore.FieldValue.serverTimestamp(),tags:[s.get("tag_hero")?"hero":null,s.get("tag_new")?"new_arrival":null,s.get("collection_tag")?s.get("collection_tag").trim():null].filter(Boolean),is_rsd_discount:s.get("is_rsd_discount")==="on",discogsUrl:s.get("discogsUrl"),discogsId:s.get("discogsId"),discogs_release_id:s.get("discogs_release_id")||s.get("discogsId"),tracks:(()=>{try{return JSON.parse(s.get("tracks")||"[]")}catch{return[]}})()};l.provider_origin==="EU_B2B"?(l.item_phantom_vat=Math.round(l.cost*.25*100)/100,l.item_real_vat=0,l.acquisition_date=s.get("acquisition_date")||new Date().toISOString().split("T")[0]):l.provider_origin==="DK_B2B"?(l.item_phantom_vat=0,l.item_real_vat=Math.round(l.cost*.25*100)/100,l.acquisition_date=s.get("acquisition_date")||new Date().toISOString().split("T")[0]):(l.item_phantom_vat=0,l.item_real_vat=0,l.acquisition_date=null),console.log(`[handleAddVinyl] editSku: ${e}, recordData:`,l);try{let h=null,u=null;if(e){const p=await this.findProductBySku(e);if(!p){this.showToast("❌ Producto no encontrado","error");return}u=p.data,h=p.id,await p.ref.update(l),this.showToast("✅ Disco actualizado")}else{const p=this.state.inventory.map(y=>{const v=y.sku&&typeof y.sku=="string"?y.sku.match(/^SKU\s*-\s*(\d+)/):null;return v?parseInt(v[1]):0}),b=Math.max(0,...p);l.created_at=firebase.firestore.FieldValue.serverTimestamp(),h=await T.runTransaction(async y=>{const v=T.collection("metadata").doc("vinylCounter"),E=await y.get(v);let $=0;E.exists&&($=E.data().current||0);const I=Math.max($,b)+1,C=String(I).padStart(4,"0");y.set(v,{current:I},{merge:!0}),l.quickId=C,l.sku=`SKU-${String(I).padStart(3,"0")}`;const m=T.collection("products").doc();return y.set(m,l),m.id}),this.showToast(`✅ Disco agregado (ID: ${l.quickId})`)}if(n){const p=s.get("discogs_release_id")||s.get("discogsId");if(u&&u.discogs_listing_id)try{const y=await(await fetch(`${j}/discogs/update-listing/${u.discogs_listing_id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({product:l})})).json();if(y.success)this.showToast("💿 Listing de Discogs actualizado");else throw new Error(y.error||"Error desconocido")}catch(b){console.error("Error updating Discogs listing:",b),this.showToast(`⚠️ Error Discogs: ${b.message}`,"error")}else if(p)try{const y=await(await fetch(`${j}/discogs/create-listing`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({releaseId:parseInt(p),product:l})})).json();if(y.success&&y.listingId)await T.collection("products").doc(h).update({discogs_listing_id:String(y.listingId),discogs_release_id:parseInt(p)}),this.showToast("💿 Publicado en Discogs correctamente");else throw new Error(y.error||"Error desconocido")}catch(b){console.error("Error creating Discogs listing:",b);let y=b.message;(y.toLowerCase().includes("mp3")||y.toLowerCase().includes("digital")||y.toLowerCase().includes("format"))&&(y="Discogs solo permite formatos físicos (Vinyl, CD, Cassette). Este release es digital o MP3."),this.showToast(`⚠️ Error Discogs: ${y}`,"error")}else this.showToast("⚠️ Necesitas buscar el disco en Discogs primero para publicarlo","warning")}(d=document.getElementById("modal-overlay"))==null||d.remove(),this.loadData()}catch(h){console.error(h),this.showToast("❌ Error: "+(h.message||"desconocido"),"error")}},async _writeProductTags(t,e){const s=T.collection("products").doc(t.id);return(await s.get()).exists?(await s.update({tags:e,updated_at:firebase.firestore.FieldValue.serverTimestamp()}),t.tags=e,!0):(this.showToast("❌ Error: Documento no encontrado","error"),!1)},async toggleProductTag(t,e){try{const s=this.state.inventory.find(o=>o.id===t||o.sku===t);if(!s){this.showToast("❌ Producto no encontrado","error");return}let a=s.tags||[];if(a.includes(e)?a=a.filter(o=>o!==e):a.push(e),!await this._writeProductTags(s,a))return;this.showToast(`✅ ${e==="hero"?"Héroe":"Novedad"} actualizado`),this.refreshCurrentView()}catch(s){console.error("Error toggling product tag:",s),this.showToast("❌ Error al actualizar tag","error")}},wsFilterByTag(t,e){return(t||[]).filter(s=>Array.isArray(s.tags)&&s.tags.includes(e))},wsIsEligible(t){return Number(t.stock)>0&&!!t.is_online},wsCountLegacyNuevos(t){return this.wsFilterByTag(t,"Nuevos").length},wsTabLabel(t){return t==="hero"?"Hero":"New Arrivals"},_wsSort(t,e){const s=`${t.artist||""} ${t.album||""}`.toLowerCase(),a=`${e.artist||""} ${e.album||""}`.toLowerCase();return s<a?-1:s>a?1:0},wsSetTab(t){this.state.webshopTab=t,this.refreshCurrentView()},async renderWebshop(t){const e=this.state.webshopTab||"hero";let s=this.state.inventory||[];if(!s.length)try{s=(await T.collection("products").get()).docs.map(d=>({id:d.id,...d.data()})),this.state.inventory=s}catch(l){console.warn("Webshop: no se pudo cargar el inventario",l)}const a=this.wsFilterByTag(s,"hero").slice().sort(this._wsSort),o=this.wsFilterByTag(s,"new_arrival").slice().sort(this._wsSort),i=this.wsCountLegacyNuevos(s),r=e==="hero"?"hero":"new_arrival",n=e==="hero"?a:o,c=this.wsTabLabel(r);t.innerHTML=`
        <div class="cx-view">
        <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
            ${this.sectionHeader({title:"Web shop",subtitle:"Qué discos aparecen en el Hero y en New Arrivals de elcuartito.dk",filters:'<a href="https://elcuartito.dk" target="_blank" rel="noopener" class="cx-btn"><i class="ph ph-arrow-square-out"></i>Ver la tienda</a>'})}

            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div class="cx-glass flex p-1 rounded-full">
                    ${[{id:"hero",tag:"hero"},{id:"new_arrivals",tag:"new_arrival"}].map(l=>{const d=l.id==="hero"?a.length:o.length;return`<button onclick="app.wsSetTab('${l.id}')" class="cx-month ${e===l.id?"is-on":""}">${this.wsTabLabel(l.tag)} <span class="cx-count">${d}</span></button>`}).join("")}
                </div>
                <div class="cx-search flex-1 min-w-[260px] max-w-md">
                    <i class="ph ph-plus"></i>
                    <input id="ws-search" type="text" oninput="app.wsInvSearch('${r}', this.value)" autocomplete="off"
                        placeholder="Sumar un disco a ${c}: artista, título o SKU" aria-describedby="ws-hint">
                    <div id="ws-search-results" class="hidden absolute z-20 left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg max-h-64 overflow-y-auto"></div>
                </div>
            </div>
            <p id="ws-hint" class="text-xs text-stone-500 mb-5 md:text-right">Solo se pueden sumar discos con stock y publicados online.</p>

            ${e==="new_arrivals"&&i>0?`
            <div class="mb-5 flex items-start gap-3 rounded-2xl bg-[#F2E14C] px-4 py-3">
                <i class="ph-bold ph-warning text-lg mt-0.5"></i>
                <p class="text-sm leading-relaxed">
                    <b>${i} disco${i===1?"":"s"} con el tag 'Nuevos'</b>, que la tienda no usa (solo lee 'new_arrival'). No se borró nada automáticamente.
                </p>
            </div>`:""}

            ${n.length===0?`
            <div class="rounded-3xl border border-dashed border-black/15 p-12 text-center">
                <i class="ph ph-vinyl-record text-4xl text-stone-400"></i>
                <p class="text-sm text-stone-600 mt-3">Todavía no hay discos en ${e==="hero"?"el Hero":"New Arrivals"}. Sumalos con el buscador de arriba.</p>
            </div>`:`
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                ${n.map(l=>this._wsCardHTML(l,r)).join("")}
            </div>`}
        </div>
        </div>`},_wsCardHTML(t,e){const s=t.cover_image||t.image||"logo.jpg",a=!!t.is_online,o=Number(t.stock)||0;return`
        <div class="cx-item relative group">
            <div class="aspect-square rounded-2xl overflow-hidden bg-stone-200 mb-3">
                <img src="${s}" onerror="this.onerror=null;this.src='logo.jpg'" class="w-full h-full object-cover" alt="">
            </div>
            <button onclick="app.wsRemoveProduct('${t.id}', '${e}')" title="Quitar de ${this.wsTabLabel(e)}" aria-label="Quitar de ${this.wsTabLabel(e)}"
                class="cx-btn is-icon !w-9 !h-9 absolute top-5 right-5 !bg-white/90">
                <i class="ph-bold ph-x"></i>
            </button>
            <p class="text-sm font-semibold truncate px-1">${F(t.album||"Sin título")}</p>
            <p class="text-xs text-stone-500 truncate px-1">${F(t.artist||"Sin artista")} · ${F(t.sku||"")}</p>
            <div class="flex items-center gap-1.5 mt-2 px-1 pb-1 flex-wrap">
                <span class="text-base font-light tracking-tight mr-1">${this.formatCurrency(t.price||0,!1)}</span>
                ${a?"":'<span class="cx-state is-wait">No online</span>'}
                ${o<=0?'<span class="cx-state is-hot">Sin stock</span>':""}
            </div>
        </div>`},wsInvSearch(t,e){const s=document.getElementById("ws-search-results");if(!s)return;const a=this.invSearchResultsHTML(e,`app.wsAddProduct('{ID}', '${t}')`);s.innerHTML=a,s.classList.toggle("hidden",!a)},async wsAddProduct(t,e){const s=(this.state.inventory||[]).find(i=>i.id===t);if(!s)return;const a=this.wsTabLabel(e);if((s.tags||[]).includes(e)){this.showToast(`ℹ️ Ya está en ${a}`);return}const o=[];if(Number(s.stock)>0||o.push("no tiene stock"),s.is_online||o.push("no está publicado online"),o.length){this.showToast(`⚠️ No se puede agregar: ${o.join(" y ")}`);return}try{const i=[...s.tags||[],e];if(!await this._writeProductTags(s,i))return;this.showToast(`✅ Agregado a ${a}`),this.refreshCurrentView()}catch(i){console.error("wsAddProduct:",i),this.showToast("❌ Error al agregar")}},async wsRemoveProduct(t,e){const s=(this.state.inventory||[]).find(o=>o.id===t);if(!s)return;const a=this.wsTabLabel(e);try{const o=(s.tags||[]).filter(i=>i!==e);if(!await this._writeProductTags(s,o))return;this.showToast(`Quitado de ${a}`),this.refreshCurrentView()}catch(o){console.error("wsRemoveProduct:",o),this.showToast("❌ Error al quitar")}},async toggleRsdDiscount(t){try{const e=this.state.inventory.find(i=>i.id===t||i.sku===t);if(!e){this.showToast("❌ Producto no encontrado","error");return}const s=!e.is_rsd_discount,a=T.collection("products").doc(e.id);if(!(await a.get()).exists){this.showToast("❌ Error: Documento no encontrado","error");return}await a.update({is_rsd_discount:s,updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast(`✅ RSD ${s?"activado":"desactivado"} — ${e.album}`),e.is_rsd_discount=s,this.refreshCurrentView()}catch(e){console.error("Error toggling RSD discount:",e),this.showToast("❌ Error al actualizar RSD","error")}},deleteVinyl(t){const e=this.state.inventory.find(a=>a.id===t||a.sku===t);if(!e){alert("Error: Item not found");return}const s=`
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
                                                    `;document.body.insertAdjacentHTML("beforeend",s)},async confirmDelete(t){const e=document.getElementById("delete-confirm-modal");e&&e.remove();const s=document.getElementById("modal-overlay");s&&s.remove();try{const a=this.state.inventory.find(n=>n.id===t||n.sku===t),o=a?a.id:t,i=await T.collection("products").doc(o).get();if(!i.exists){this.showToast("❌ Producto no encontrado","error");return}const r={id:i.id,ref:i.ref,data:i.data()};if(console.log("Product to delete:",r.data),console.log("Has discogs_listing_id?",r.data.discogs_listing_id),r.data.discogs_listing_id){console.log("Attempting to delete from Discogs:",r.data.discogs_listing_id);try{const n=await fetch(`${j}/discogs/delete-listing/${r.data.discogs_listing_id}`,{method:"DELETE"});console.log("Discogs delete response status:",n.status);const c=await n.json();console.log("Discogs delete result:",c),c.success?(console.log("Discogs listing deleted successfully"),this.showToast("💿 Eliminado de Discogs")):this.showToast("⚠️ "+(c.error||"Error en Discogs"),"warning")}catch(n){console.error("Error deleting from Discogs:",n),this.showToast("⚠️ Error eliminando de Discogs, pero continuando...","warning")}}else console.log("No discogs_listing_id found, skipping Discogs deletion");await r.ref.delete(),this.showToast("✅ Disco eliminado"),await this.loadData()}catch(a){console.error("Error removing document: ",a),this.showToast("❌ Error al eliminar: "+a.message,"error")}},handleSaleSubmit(t){var I,C,m,g,f,k,_;t.preventDefault();const e=new FormData(t.target);let s=e.get("sku");s||(s=(I=document.getElementById("input-sku"))==null?void 0:I.value);const a=this.state.inventory.find(M=>M.sku===s);if(!a){this.showToast("⚠️ Debes seleccionar un producto válido del listado","error");const M=document.getElementById("sku-search");M&&(M.focus(),M.classList.add("border-red-500","animate-pulse"),setTimeout(()=>M.classList.remove("border-red-500","animate-pulse"),2e3));return}let o=parseInt(e.get("quantity"));if(isNaN(o)&&(o=parseInt((C=document.getElementById("input-qty"))==null?void 0:C.value)||1),a.stock<o){this.showToast(`❌ Stock insuficiente. Disponible: ${a.stock}`,"error");return}let i=parseFloat(e.get("price"));isNaN(i)&&(i=parseFloat((m=document.getElementById("input-price"))==null?void 0:m.value)||0);const r=parseFloat(e.get("cost"))||0,n=parseFloat(e.get("shipping_income"))||0,c=i*o+n;e.get("date")||new Date().toISOString();const l=e.get("paymentMethod"),d=e.get("soldAt");e.get("comment");let h=e.get("artist");h||(h=(g=document.getElementById("input-artist"))==null?void 0:g.value);let u=e.get("album");u||(u=(f=document.getElementById("input-album"))==null?void 0:f.value);let p=e.get("genre");p||(p=(k=document.getElementById("input-genre"))==null?void 0:k.value);let b=e.get("owner");b||(b=(_=document.getElementById("input-owner"))==null?void 0:_.value);const y=e.get("customerName"),v=e.get("customerEmail"),E=e.get("requestInvoice")==="on",$={items:[{recordId:a.id,quantity:o,unitPrice:i,costAtSale:r}],paymentMethod:l||"CASH",customerName:y||"Venta Manual",customerEmail:v||null,shipping_income:n,total_amount:c,source:"STORE",channel:(d==null?void 0:d.toLowerCase())||"store"};le.createSale($).then(()=>{this.showToast(E?"Venta registrada (Factura Solicitada)":"Venta registrada");const M=document.getElementById("modal-overlay");M&&M.remove();const A=t.target;A&&A.reset();const B=document.getElementById("form-total");B&&(B.innerText="$0.00");const W=document.getElementById("sku-search");W&&(W.value=""),this.state.manualSaleSearch="",this.loadData()}).catch(M=>{console.error("Error adding sale: ",M),this.showToast("❌ Error al registrar venta: "+(M.message||""),"error")})},addToCart(t,e){e&&e.stopPropagation();const s=this.state.inventory.find(o=>o.id===t||o.sku===t);if(!s)return;if(this.state.cart.filter(o=>o.sku===t).length>=s.stock){this.showToast("⚠️ No hay más stock disponible");return}this.state.cart.push(s),document.getElementById("inventory-cart-container")?this.renderInventoryCart():this.renderCartWidget(),this.showToast("Agregado al carrito")},removeFromCart(t){this.state.cart.splice(t,1),this.renderCartWidget()},clearCart(){this.state.cart=[],this.renderCartWidget()},renderCartWidget(){const t=document.getElementById("cart-widget");if(!t)return;const e=document.getElementById("cart-count"),s=document.getElementById("cart-items-mini"),a=document.getElementById("cart-total-mini");if(this.state.cart.length===0){t.classList.add("hidden");return}t.classList.remove("hidden"),e.innerText=this.state.cart.length;const o=this.state.cart.reduce((i,r)=>i+r.price,0);a.innerHTML=this.formatCurrency(o),s.innerHTML=this.state.cart.map((i,r)=>`
                                                                <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                                                    <div class="truncate pr-2">
                                                                        <p class="font-bold text-xs text-brand-dark truncate">${i.album}</p>
                                                                        <p class="text-[10px] text-slate-500 truncate">${i.price} kr.</p>
                                                                    </div>
                                                                    <button onclick="app.removeFromCart(${r})" class="text-red-400 hover:text-red-600">
                                                                        <i class="ph-bold ph-x"></i>
                                                                    </a>
                                                                </div>
                                                                `).join("")},openCheckoutModal(t,e,s=0){if(this.state.cart.length===0)return;const a=this.state.cart.reduce((h,u)=>h+this.getEffectivePrice(u),0),o=s>0?Math.round(a*(1-s)*100)/100:a,i=`
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
                        ${this.state.cart.map(h=>`
                            <div class="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                                <span class="truncate pr-4 font-bold text-slate-700">${h.album} ${h.is_rsd_discount?'<span class="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-black">RSD</span>':""}</span>
                                ${h.is_rsd_discount?`<span class="whitespace-nowrap"><span class="text-[10px] text-slate-400 line-through mr-1">${this.formatCurrency(h.price,!1)}</span><span class="font-mono font-bold text-orange-600">${this.formatCurrency(this.getEffectivePrice(h),!1)}</span></span>`:`<span class="font-mono font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(h.price,!1)}</span>`}
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
                                <span class="text-[10px] text-slate-500 font-bold uppercase">Precio Lista: ${this.formatCurrency(o)}</span>
                            </div>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold text-lg">kr.</span>
                                <input type="number" name="finalPrice" id="checkout-final-price" step="0.01" min="0" value="${o}"
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
        `;document.body.insertAdjacentHTML("beforeend",i);const r=o,n=document.getElementById("checkout-final-price"),c=document.getElementById("discogs-fee-section"),l=document.getElementById("discogs-fee-value"),d=()=>{const h=parseFloat(n.value)||0,u=r-h;document.getElementById("checkout-total-value").innerHTML=this.formatCurrency(h),u>0?(c.classList.remove("hidden"),l.innerHTML=`- ${this.formatCurrency(u)}`):c.classList.add("hidden")};n.addEventListener("input",d)},onCheckoutChannelChange(t){},handleCheckoutSubmit(t){t.preventDefault();const e=new FormData(t.target),s=parseFloat(e.get("finalPrice"))||0,a=this.state.cart.reduce((i,r)=>i+this.getEffectivePrice(r),0),o={items:this.state.cart.map(i=>({recordId:i.id,quantity:1})),paymentMethod:e.get("paymentMethod"),customerName:e.get("customerName"),customerEmail:e.get("customerEmail"),channel:e.get("soldAt")||"Tienda",source:"STORE",customTotal:s,originalTotal:a,feeDeducted:a-s};le.createSale(o).then(()=>{const i=o.channel==="Discogs"?" (Discogs listing eliminado)":"",r=o.feeDeducted>0?` | Fee: ${this.formatCurrency(o.feeDeducted)} `:"";this.showToast(`Venta de ${this.state.cart.length} items por ${this.formatCurrency(s)} registrada!${i}${r} `),this.clearCart(),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(i=>{console.error("Error checkout",i),alert("Error al procesar venta: "+i.message)})},handleSalesViewCheckout(){var a,o;if(this.state.cart.length===0){this.showToast("El carrito está vacío");return}const t=(a=document.getElementById("cart-payment"))==null?void 0:a.value,e=(o=document.getElementById("cart-channel"))==null?void 0:o.value,s=this.state.rsdExtraDiscount&&this.state.cart.length>=3?.05:0;this.openCheckoutModal(t,e,s)},async notifyPreparingDiscogs(t){try{this.showToast('Enviando notificación "Preparando"...',"info"),await le.notifyPreparing(t),this.showToast("✅ Cliente notificado (Preparando Orden)"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in notifyPreparingDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async cancelOrderDiscogs(t){if(confirm("¿Estás seguro que deseas cancelar esta orden? Esta acción cambiará el estado a cancelado."))try{this.showToast("Cancelando orden...","info"),await le.cancelOrder(t),this.showToast("✅ Orden cancelada correctamente"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in cancelOrderDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async notifyShippedDiscogs(t,e,s){try{const a=document.getElementById(e),o=a?a.value.trim():"",i=s?document.getElementById(s):null,r=i?i.value.trim():null;if(!o){this.showToast("⚠️ Ingresa un número de seguimiento","warning");return}this.showToast("Enviando notificación de envío...","info"),await le.notifyShipped(t,o,r),this.showToast("✅ Cliente notificado y Tracking guardado"),await this.loadData(),this.refreshCurrentView()}catch(a){console.error("Error in notifyShippedDiscogs:",a),this.showToast("❌ Error: "+a.message,"error")}},async markDispatchedDiscogs(t){try{if(!confirm("¿Marcar como despachado? Esto moverá la orden al historial."))return;this.showToast("Marcando como despachado...","info"),await le.markDispatched(t),this.showToast("✅ Orden despachada y archivada"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in markDispatchedDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async notifyPickupReadyDiscogs(t){try{this.showToast('Enviando notificación "Listo para Retirar"...',"info"),await le.notifyPickupReady(t),this.showToast("✅ Cliente notificado (Listo para Retirar)"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in notifyPickupReadyDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async markPickedUpDiscogs(t){try{if(!confirm("¿El cliente ya retiró el pedido? Esto moverá la orden al historial."))return;this.showToast("Marcando como retirado...","info"),await le.markPickedUp(t),this.showToast("✅ Orden retirada y archivada"),await this.loadData(),this.refreshCurrentView()}catch(e){console.error("Error in markPickedUpDiscogs:",e),this.showToast("❌ Error: "+e.message,"error")}},async deleteSale(t){var s;if(!confirm("¿Eliminar esta venta y restaurar stock?"))return;const e=this.state.sales.find(a=>a.id===t);if(!e){this.showToast("❌ Venta no encontrada","error");return}try{const a=T.batch(),o=T.collection("sales").doc(t);if(a.delete(o),e.items&&Array.isArray(e.items))for(const i of e.items){const r=i.productId||i.recordId,n=i.sku||((s=i.record)==null?void 0:s.sku),c=parseInt(i.quantity||i.qty)||1;let l=null;if(r)try{const d=await T.collection("products").doc(r).get();d.exists&&(l={ref:d.ref,data:d.data()})}catch{console.warn("Could not find product by ID:",r)}!l&&n&&(l=await this.findProductBySku(n)),l?a.update(l.ref,{stock:firebase.firestore.FieldValue.increment(c)}):console.warn("Could not restore stock for item:",i)}else if(e.sku){const i=await this.findProductBySku(e.sku);if(i){const r=parseInt(e.quantity)||1;a.update(i.ref,{stock:firebase.firestore.FieldValue.increment(r)})}}await a.commit(),this.showToast("✅ Venta eliminada y stock restaurado"),this.loadData()}catch(a){console.error("Error deleting sale:",a),this.showToast("❌ Error al eliminar venta: "+a.message,"error")}},getExpenseCategories(){return[{value:"alquiler",label:"Alquiler",type:"operativo"},{value:"servicios",label:"Servicios (internet, luz)",type:"operativo"},{value:"marketing",label:"Marketing",type:"operativo"},{value:"envios",label:"Envíos/Packaging",type:"operativo"},{value:"software",label:"Software/Suscripciones",type:"operativo"},{value:"honorarios",label:"Honorarios Profesionales",type:"operativo"},{value:"oficina",label:"Material de Oficina",type:"operativo"},{value:"transporte",label:"Transporte",type:"operativo"},{value:"otros_op",label:"Otros Gastos Operativos",type:"operativo"},{value:"stock_nuevo",label:"Stock: Vinilos NUEVOS (Distribuidor)",type:"stock_nuevo"},{value:"stock_usado",label:"Stock: Vinilos USADOS (Particular/Brugtmoms)",type:"stock_usado"}]},toggleExpenseMissingReceipt(){this.state.expenseMissingReceiptOnly=!this.state.expenseMissingReceiptOnly,this.refreshCurrentView()},setIncomeSearch(t){this.state.incomeSearch=t,this.refreshCurrentView();const e=document.getElementById("income-search-input");e&&(e.focus(),e.setSelectionRange(e.value.length,e.value.length))},setIncomeCategoryFilter(t){this.state.incomeCategoryFilter=t,this.refreshCurrentView()},toggleIncomeUninvoiced(){this.state.incomeUninvoicedOnly=!this.state.incomeUninvoicedOnly,this.refreshCurrentView()},toggleIncomeForm(){this.state.showIncomeForm=!this.state.showIncomeForm,this.refreshCurrentView()},invoiceFromExtraIncome(t){const e=(this.state.extraIncome||[]).find(a=>a.id===t);if(!e)return;if(e.invoiced){this.navigate("facturasManual");return}const s={Transfer:"Transfer",MobilePay:"MobilePay",Cash:"CASH",Card:"CARD"};this.state.invoicePrefill={extraIncomeId:e.id,customerName:e.clientName||"",description:e.description||"",amount:e.amount??"",vatAmount:e.vatAmount??"",date:e.date||new Date().toISOString().split("T")[0],paymentMethod:s[e.paymentMethod]||"Transfer"},this.navigate("facturasManual"),this.showToast("Datos del ingreso cargados en la factura")},cancelInvoicePrefill(){this.state.invoicePrefill=null,this.refreshCurrentView()},async markExtraIncomeInvoiced(t,e){try{await T.collection("extra_income").doc(t).update({invoiced:!0,invoiceNumber:e||""});const s=(this.state.extraIncome||[]).find(a=>a.id===t);s&&(s.invoiced=!0,s.invoiceNumber=e||"")}catch(s){console.error("Error marcando ingreso como facturado:",s),this.showToast("⚠️ Factura generada, pero no se pudo marcar el ingreso","error")}},async openLinkInvoiceModal(t){const e=(this.state.extraIncome||[]).find(r=>r.id===t);if(!e||e.invoiced)return;if(!this.state.manualInvoicesLoaded)try{await this.loadManualInvoices()}catch(r){console.error(r)}const s=(this.state.contabilidadInvoices||[]).slice().sort((r,n)=>new Date(n.date||0)-new Date(r.date||0)),a=r=>String(r??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),o=s.length===0?'<div class="py-10 text-center"><i class="ph-duotone ph-note-blank text-4xl text-slate-300 mb-2 block"></i><p class="text-sm text-slate-400 font-medium">No hay facturas en el sistema</p></div>':s.map(r=>{const n=a(r.invoiceNumber||"s/n"),c=`${r.invoiceNumber||""} ${r.customerName||""} ${r.itemsSummary||""}`.toLowerCase().replace(/"/g,"");return`
                <div class="link-inv-row flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-orange hover:bg-orange-50/30 cursor-pointer transition-colors" data-search="${a(c)}" onclick="app.linkInvoiceToExtraIncome('${t}', '${n}')">
                    <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><i class="ph-bold ph-file-text"></i></div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-bold text-brand-dark">#${n}</p>
                        <p class="text-xs text-slate-500 truncate">${a(r.customerName||"—")} · ${a(r.date||"")}</p>
                    </div>
                    <span class="text-sm font-bold text-brand-dark whitespace-nowrap">${this.formatCurrency(r.totalAmount||0)}</span>
                </div>`}).join(""),i=`
            <div id="link-invoice-modal" class="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onclick="if(event.target === this) this.remove()">
                <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
                    <div class="p-5 border-b border-slate-100">
                        <h3 class="font-bold text-brand-dark text-lg">Vincular factura</h3>
                        <p class="text-sm text-slate-500 mt-0.5 truncate">${a(e.description||"Ingreso")} · ${this.formatCurrency(Number(e.amount)||0)}</p>
                        <input id="link-invoice-search" placeholder="Buscar por nº, cliente..." oninput="app.filterLinkInvoiceList(this.value)"
                            class="mt-3 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange">
                    </div>
                    <div id="link-invoice-list" class="overflow-y-auto flex-1 p-3 space-y-2">
                        ${o}
                    </div>
                    <div class="p-5 border-t border-slate-100 bg-slate-50">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">¿La factura no está en el sistema?</p>
                        <div class="flex gap-2">
                            <input id="manual-invoice-number" placeholder="Nº de factura (ej. 2026-014)"
                                class="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange">
                            <button onclick="app.markExtraIncomeManual('${t}')"
                                class="px-4 py-2.5 bg-brand-dark text-white text-sm font-bold rounded-xl hover:bg-black transition-colors whitespace-nowrap">
                                Marcar facturado
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",i)},filterLinkInvoiceList(t){const e=(t||"").toLowerCase();document.querySelectorAll("#link-invoice-list .link-inv-row").forEach(s=>{s.style.display=(s.dataset.search||"").toLowerCase().includes(e)?"":"none"})},async linkInvoiceToExtraIncome(t,e){var a;const s=(this.state.extraIncome||[]).find(o=>o.id===t);if(!s||s.invoiced){this.showToast("Este ingreso ya está facturado","error");return}try{await T.collection("extra_income").doc(t).update({invoiced:!0,invoiceNumber:e||"",linkedManually:!0}),s.invoiced=!0,s.invoiceNumber=e||"",s.linkedManually=!0,(a=document.getElementById("link-invoice-modal"))==null||a.remove(),this.refreshCurrentView(),this.showToast(`✅ Factura ${e} vinculada al ingreso`)}catch(o){console.error("Error vinculando factura:",o),this.showToast("⚠️ Error al vincular: "+o.message,"error")}},async markExtraIncomeManual(t){var s;const e=(((s=document.getElementById("manual-invoice-number"))==null?void 0:s.value)||"").trim();if(!e){this.showToast("Ingresá el número de factura","error");return}await this.linkInvoiceToExtraIncome(t,e)},setExpenseCategoryFilter(t){this.state.expenseCategoryFilter=t,this.refreshCurrentView()},setExpensesSearch(t){this.state.expensesSearch=t,this.refreshCurrentView();const e=document.getElementById("expenses-search-input");e&&(e.focus(),e.setSelectionRange(e.value.length,e.value.length))},renderExpenses(t){const e=this.getExpenseCategories();window.expenseCategories=e;const s=(this.state.expensesSearch||"").toLowerCase(),a=!!this.state.expenseMissingReceiptOnly,o=this.state.expenseCategoryFilter||"all",i=this.state.expenseFilterYear,r=this.state.expenseFilterMonths||[],n=m=>{const g=new Date(m.fecha_factura||m.date||m.timestamp);return isNaN(g.getTime())?!0:g.getFullYear()===i&&r.includes(g.getMonth())},c=m=>!m.receiptUrl&&!m.comprobante,l=(this.state.expenses||[]).filter(n),d=l.reduce((m,g)=>m+(Number(g.monto_total||g.amount)||0),0),h=l.filter(c).length,u=l.reduce((m,g)=>m+(Number(g.monto_iva)||0),0),p=(this.state.expenses||[]).filter(m=>!n(m)||a&&!c(m)||o!=="all"&&(m.categoria||m.category)!==o?!1:!s||(m.description||m.proveedor||"").toLowerCase().includes(s)||(m.category||m.categoria||"").toLowerCase().includes(s)||(m.lotRef||"").toLowerCase().includes(s)||(m.proveedor||"").toLowerCase().includes(s)),b=this.cxPeriodLabel(i,r),y={};p.forEach(m=>{var f;const g=((f=e.find(k=>k.value===(m.categoria||m.category)))==null?void 0:f.label)||m.categoria||m.category||"Sin categoría";y[g]=(y[g]||0)+(Number(m.monto_total||m.amount)||0)});const v=Object.values(y).reduce((m,g)=>m+g,0),E=p.reduce((m,g)=>m+(Number(g.monto_iva)||0),0),$=Object.entries(y).sort((m,g)=>g[1]-m[1]).slice(0,6),I=p.filter(m=>m.receiptUrl).length,C=`
    <div class="cx-view">
    <div class="max-w-6xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Registro Compras",subtitle:"Gastos del negocio con su comprobante, categoría e IVA",primary:{label:"Registrar compra",icon:"ph-plus",onclick:"app.openExpenseWizard()"}})}

                <div class="mb-5">${this.cxPeriodPicker("expenses")}</div>

                <!-- KPIs del período -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div class="cx-tile cx-yellow">
                        <span class="cx-tile-label">Gastado</span>
                        <b class="cx-tile-value">${this.formatCurrency(d)}</b>
                        <span class="cx-tile-sub">${b}, ${l.length} compra${l.length===1?"":"s"}</span>
                        <span class="cx-tile-stripes" aria-hidden="true"></span>
                    </div>
                    <button onclick="app.state.expenseMissingReceiptOnly = true; app.refreshCurrentView()" class="cx-tile ${h>0?"cx-orange":"cx-frost"} text-left">
                        <span class="cx-tile-label">Sin comprobante</span>
                        <b class="cx-tile-value">${h}</b>
                        <span class="cx-tile-sub">${h>0?"Tocá para ver cuáles":"Todo respaldado"}</span>
                    </button>
                    <div class="cx-tile cx-dark">
                        <span class="cx-tile-label">IVA recuperable</span>
                        <b class="cx-tile-value">${this.formatCurrency(u)}</b>
                        <span class="cx-tile-sub">Del período</span>
                    </div>
                </div>

                <!-- Filtros -->
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <div class="cx-search flex-1 min-w-[240px]">
                        <i class="ph ph-magnifying-glass"></i>
                        <input type="text" id="expenses-search-input"
                            value="${(this.state.expensesSearch||"").replace(/"/g,"&quot;")}"
                            oninput="app.setExpensesSearch(this.value)"
                            placeholder="Proveedor, categoría o lote">
                    </div>
                    <select onchange="app.setExpenseCategoryFilter(this.value)" class="cx-pill-select ${o!=="all"?"!bg-[#1A1A1A] !text-white":""}" aria-label="Categoría">
                        <option value="all">Todas las categorías</option>
                        ${e.map(m=>`<option value="${m.value}" ${o===m.value?"selected":""}>${m.label}</option>`).join("")}
                    </select>
                    <button onclick="app.toggleExpenseMissingReceipt()" class="cx-btn !h-12 ${a?"!bg-[#1A1A1A] !text-white !border-[#1A1A1A]":""}">
                        <i class="ph ph-paperclip"></i> Sin comprobante ${h>0?`<span class="cx-count">${h}</span>`:""}
                    </button>
                </div>

                <!-- Resumen del filtro -->
                <div class="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
                    <p class="text-sm text-stone-600">
                        ${p.length} registro${p.length===1?"":"s"} · <b class="text-[#1A1A1A]">${this.formatCurrency(v)}</b> · IVA ${this.formatCurrency(E)} · ${I}/${p.length} con comprobante
                        ${a?'<button onclick="app.state.expenseMissingReceiptOnly = false; app.refreshCurrentView()" class="ml-2 underline font-semibold">Ver todos</button>':""}
                    </p>
                    <div class="flex gap-2">
                        <button onclick="app.exportExpensesToCSV()" class="cx-btn"><i class="ph ph-download-simple"></i>CSV</button>
                        <button onclick="app.downloadReceiptsZip()" class="cx-btn"><i class="ph ph-file-zip"></i>Comprobantes (ZIP)</button>
                    </div>
                </div>
                ${$.length>1?`
                <div class="flex flex-wrap gap-2 mb-4 px-1">
                    ${$.map(([m,g])=>`<span class="cx-channel !py-1 !px-3 !text-xs">${m} <b class="font-semibold text-stone-600">${this.formatCurrency(g)}</b></span>`).join("")}
                </div>`:""}

                <section class="cx-panel !p-0 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="cx-inv-table w-full text-left">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Proveedor</th>
                                    <th>Categoría</th>
                                    <th class="text-right">Total</th>
                                    <th class="text-right">IVA</th>
                                    <th class="text-center">Comprobante</th>
                                    <th class="w-24"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.length>0?p.map(m=>{var _;const g=((_=e.find(M=>M.value===(m.categoria||m.category)))==null?void 0:_.label)||m.categoria||m.category||"-",f=m.categoria==="stock_nuevo"?m.vat_treatment==="dk"?"dk":m.vat_treatment==="eu"||m.is_inventory_invoice?"eu":null:null,k=m.categoria==="stock_nuevo"||m.categoria==="stock_usado"||m.category==="Inventario (compra de vinilos)";return`
                                    <tr id="expense-${m.id}" class="inv-row group ${this.state.expenseIdHighlight===m.id?"is-selected":""}">
                                        <td class="text-xs text-stone-500 whitespace-nowrap py-3">${this.formatDate(m.fecha_factura||m.date)}</td>
                                        <td class="py-3">
                                            <p class="text-sm font-semibold">${m.proveedor||m.description||"-"}</p>
                                            ${m.descripcion?`<p class="text-xs text-stone-500 truncate max-w-[220px]">${m.descripcion}</p>`:""}
                                            ${m.lotRef?`
                                            <button onclick="app.gotoInventoryLot('${m.lotRef}')" class="mt-1.5 cx-channel !text-[11px] hover:!bg-[#F2E14C]" title="Ver discos de este lote">
                                                ${m.lotRef} · ${Se.countDiscsInLot(m.lotRef)} discos
                                            </button>`:""}
                                        </td>
                                        <td class="py-3">
                                            <span class="cx-state is-ok">${g}</span>
                                            ${f?`<span class="block mt-1 text-[11px] text-stone-500">${f==="dk"?"DK, 25%":"UE, reverse charge"}</span>`:""}
                                            ${k?`<button onclick="app.openInventoryIngest('${m.id}')" class="block mt-1.5 text-xs font-semibold underline underline-offset-2 hover:text-[#F05A28]">Ingresar stock</button>`:""}
                                        </td>
                                        <td class="text-right font-semibold whitespace-nowrap">${this.formatCurrency(m.monto_total||m.amount||0)}</td>
                                        <td class="text-right text-sm whitespace-nowrap ${(m.monto_iva||0)>0?"":"text-stone-400"}">${this.formatCurrency(m.monto_iva||0)}</td>
                                        <td class="text-center">
                                            ${m.receiptPending&&!m.receiptUrl?`
                                                <span class="cx-state is-wait" title="Comprobante pendiente de subir">En revisión</span>
                                            `:m.receiptUrl?`
                                                <div class="relative inline-block group/preview">
                                                    <a href="${m.receiptUrl}" target="_blank" rel="noopener" class="cx-state is-ok gap-1 hover:!bg-[#1A1A1A] hover:!text-white" title="Abrir comprobante">
                                                        <i class="ph-bold ph-paperclip"></i> Ver
                                                    </a>
                                                    <div class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 invisible group-hover/preview:opacity-100 group-hover/preview:visible transition-all duration-200 pointer-events-none">
                                                        <div class="bg-white rounded-2xl shadow-2xl p-2 w-48">
                                                            <img src="${m.receiptUrl}" alt="" class="w-full h-32 object-cover rounded-xl" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                                            <div class="hidden items-center justify-center h-32 bg-stone-100 rounded-xl"><i class="ph ph-file-pdf text-4xl"></i></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `:`
                                                <span class="cx-state is-hot gap-1" title="Falta el comprobante"><i class="ph-bold ph-warning"></i> Falta</span>
                                            `}
                                        </td>
                                        <td class="py-3">
                                            <div class="flex gap-1 justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                <button onclick="app.editExpense('${m.id}')" class="cx-row-btn" title="Editar" aria-label="Editar"><i class="ph ph-pencil-simple"></i></button>
                                                <button onclick="app.deleteExpense('${m.id}')" class="cx-row-btn is-danger" title="Eliminar" aria-label="Eliminar"><i class="ph ph-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>`}).join(""):`
                                    <tr>
                                        <td colspan="7" class="!py-14 text-center">
                                            <i class="ph ph-receipt text-4xl text-stone-400 block mb-2"></i>
                                            <p class="text-sm text-stone-600">No hay compras con estos filtros. Cambiá el mes o registrá una compra nueva.</p>
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
            </div>
    `;t.innerHTML=C},editExpense(t){this.openExpenseWizard(t)},expenseWizardSteps(){return[{n:1,label:"Compra",icon:"ph-receipt"},{n:2,label:"Importes",icon:"ph-calculator"},{n:3,label:"Revisión",icon:"ph-check-circle"}]},vatTreatmentStorageKey(){return"ec_vat_treatment_by_supplier"},getRememberedVatTreatment(t){try{return JSON.parse(localStorage.getItem(this.vatTreatmentStorageKey())||"{}")[this.normalizeLotSupplier(t)]||null}catch{return null}},rememberVatTreatment(t,e){if(!(!t||!e))try{const s=this.vatTreatmentStorageKey(),a=JSON.parse(localStorage.getItem(s)||"{}");a[this.normalizeLotSupplier(t)]=e,localStorage.setItem(s,JSON.stringify(a))}catch{}},deriveVatTreatment(t){return t?t.vat_treatment==="dk"||t.vat_treatment==="eu"?t.vat_treatment:t.is_inventory_invoice?"eu":(Number(t.monto_iva)||0)>0?"dk":"eu":"eu"},setExpenseVatTreatment(t){const e=this.state.expenseWizard;e&&(e.vatTreatment=t,e.vatTreatmentTouched=!0,this.refreshExpenseVatTreatmentUI())},refreshExpenseVatTreatmentUI(){const t=this.state.expenseWizard,e=document.getElementById("expense-vat-treatment-options");t&&e&&(e.innerHTML=this.expenseVatTreatmentOptionsHTML(t))},expenseVatTreatmentOptionsHTML(t){const e=t.vatTreatment||"eu",s=(a,o,i,r)=>{const n=e===a;return`<button type="button" onclick="app.setExpenseVatTreatment('${a}')"
                class="text-left p-3 rounded-2xl transition-all ${n?"bg-[#1A1A1A] text-white":"bg-white/75 hover:bg-white"}">
                <span class="flex items-center gap-2 font-semibold text-sm">
                    <i class="ph ${r} ${n?"text-[#F2E14C]":""}"></i> ${o}
                </span>
                <span class="block text-xs mt-1 leading-snug ${n?"text-stone-300":"text-stone-500"}">${i}</span>
            </button>`};return s("eu","UE, reverse charge","El distribuidor factura sin IVA. Se declara y se deduce en el Reporte VAT (neto 0).","ph-globe")+s("dk","Dinamarca, 25% moms","Proveedor danés con IVA en la factura. Se deduce en el Reporte VAT.","ph-bank")},expenseSupplierChanged(t){const e=this.state.expenseWizard;if(e&&(e.proveedor=t),this.updateLotPreview(),e&&!e.vatTreatmentTouched&&e.categoria==="stock_nuevo"){const s=this.getRememberedVatTreatment(t);s&&s!==e.vatTreatment&&(e.vatTreatment=s,this.refreshExpenseVatTreatmentUI())}},openExpenseWizard(t=null){const e=this.getExpenseCategories();window.expenseCategories=e;const s=t?(this.state.expenses||[]).find(r=>r.id===t):null,a=new Date().toISOString().split("T")[0];if(this.state.expenseWizard={step:1,id:t||null,fecha:s&&(s.fecha_factura||(s.date||"").slice(0,10))||a,proveedor:s&&(s.proveedor||s.description)||"",descripcion:s&&s.descripcion||"",categoria:s&&(s.categoria||s.category)||"",invoiceNumber:s&&s.invoiceNumber||"",total:s&&(s.monto_total||s.amount)||"",iva:s&&s.monto_iva||0,vatTreatment:this.deriveVatTreatment(s),vatTreatmentTouched:!1,noReceipt:s?!!s.receiptPending:!1,receiptUrl:s&&s.receiptUrl||"",dupAck:!1},document.getElementById("expensewizard-overlay"))return;const o=[...new Set((this.state.expenses||[]).map(r=>r.proveedor).filter(Boolean))].sort(),i=document.createElement("div");i.id="expensewizard-overlay",i.className="vf-overlay",i.innerHTML=`
        <aside class="vf-panel cx-view" role="dialog" aria-modal="true" aria-labelledby="ew-title">
            <header class="vf-head !pb-3">
                <div class="min-w-0 flex-1">
                    <h3 id="ew-title" class="vf-title">${s?"Editar compra":"Registrar compra"}</h3>
                    <div class="flex items-center gap-1 mt-4" id="expensewizard-steps"></div>
                </div>
                <button onclick="app.closeExpenseWizard()" class="cx-btn is-icon" aria-label="Cerrar"><i class="ph ph-x"></i></button>
            </header>
            <div class="vf-body" id="expensewizard-body"></div>
            <footer class="vf-foot" id="expensewizard-footer"></footer>
            <datalist id="expense-supplier-list">
                ${o.map(r=>`<option value="${String(r).replace(/"/g,"&quot;")}">`).join("")}
            </datalist>
        </aside>`,i.addEventListener("click",r=>{r.target===i&&this.closeExpenseWizard()}),document.body.appendChild(i),this.renderExpenseWizardStep()},closeExpenseWizard(){var t;(t=document.getElementById("expensewizard-overlay"))==null||t.remove(),this.state.expenseWizard=null},renderExpenseWizardStep(){const t=this.state.expenseWizard,e=document.getElementById("expensewizard-steps"),s=document.getElementById("expensewizard-body"),a=document.getElementById("expensewizard-footer");if(!t||!e||!s||!a)return;const o=this.expenseWizardSteps();e.innerHTML=o.map(i=>`
            <div class="flex-1 flex items-center gap-2 ${i.n<=t.step?"":"opacity-50"}">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i.n<t.step?"bg-[#1A1A1A] text-white":i.n===t.step?"bg-[#F2E14C] text-[#1A1A1A]":"bg-black/10 text-stone-600"}">
                    ${i.n<t.step?'<i class="ph-bold ph-check"></i>':i.n}
                </div>
                <span class="text-sm font-semibold ${i.n===t.step?"":"text-stone-500"}">${i.label}</span>
                ${i.n<o.length?'<div class="flex-1 h-px bg-black/10 mx-1"></div>':""}
            </div>`).join(""),s.innerHTML=t.step===1?this.expenseWizardStepWhat(t):t.step===2?this.expenseWizardStepAmounts(t):this.expenseWizardStepReview(t),a.innerHTML=`
            ${t.step>1?`<button onclick="app.expenseWizardGo(${t.step-1})" class="cx-btn"><i class="ph ph-arrow-left"></i> Atrás</button>`:'<button onclick="app.closeExpenseWizard()" class="cx-btn">Cancelar</button>'}
            ${t.step<3?`<button onclick="app.expenseWizardGo(${t.step+1})" class="cx-btn !bg-[#1A1A1A] !text-white !border-[#1A1A1A]">Continuar <i class="ph ph-arrow-right"></i></button>`:`<button onclick="app.saveExpenseWizard()" class="cx-btn is-primary"><i class="ph-bold ph-check"></i> ${t.id?"Guardar cambios":"Guardar compra"}</button>`}`,t.step===3&&this.renderExpenseWizardReview(),t.step===2&&this.expenseWizardUpdateNet()},captureExpenseWizardFields(){const t=this.state.expenseWizard;if(!t)return;const e=s=>document.getElementById(s);e("expense-fecha")&&(t.fecha=e("expense-fecha").value),e("expense-proveedor")&&(t.proveedor=e("expense-proveedor").value),e("expense-descripcion")&&(t.descripcion=e("expense-descripcion").value),e("expense-categoria")&&(t.categoria=e("expense-categoria").value),e("expense-invoice-number")&&(t.invoiceNumber=e("expense-invoice-number").value),e("expense-monto")&&(t.total=e("expense-monto").value),e("expense-iva")&&(t.iva=e("expense-iva").value),e("expense-no-receipt")&&(t.noReceipt=e("expense-no-receipt").checked),e("expense-dup-ack")&&(t.dupAck=e("expense-dup-ack").checked),e("receipt-url")&&e("receipt-url").value&&(t.receiptUrl=e("receipt-url").value)},expenseWizardGo(t){const e=this.state.expenseWizard;if(e){if(this.captureExpenseWizardFields(),t>1&&e.step===1&&(!e.fecha||!(e.proveedor||"").trim()||!e.categoria)){this.showToast("Completá fecha, proveedor y categoría para continuar.");return}if(t>2&&e.step===2){const s=parseFloat(e.total),o=e.categoria==="stock_usado"||e.categoria==="stock_nuevo"&&(e.vatTreatment||"eu")==="eu"?0:parseFloat(e.iva)||0;if(isNaN(s)||s<=0){this.showToast("El monto total debe ser mayor a 0.");return}if(o<0||o>s){this.showToast("El IVA debe estar entre 0 y el total.");return}e.iva=o}e.step=t,this.renderExpenseWizardStep()}},expenseWizardCategoryChanged(t){const e=this.state.expenseWizard;e&&(e.categoria=t.value),this.toggleExpenseLotFields(),e&&e.categoria==="stock_usado"&&(e.iva=0)},expenseWizardCalcVat(){var o;const t=this.state.expenseWizard,e=parseFloat(t==null?void 0:t.total)||parseFloat((o=document.getElementById("expense-monto"))==null?void 0:o.value)||0;if(!e){this.showToast("Ingresá primero el monto total.");return}const s=Math.round((e-e/1.25)*100)/100;t&&(t.iva=s);const a=document.getElementById("expense-iva");a&&(a.value=s),this.expenseWizardUpdateNet()},expenseWizardUpdateNet(){var o,i;const t=parseFloat((o=document.getElementById("expense-monto"))==null?void 0:o.value)||0,e=parseFloat((i=document.getElementById("expense-iva"))==null?void 0:i.value)||0,s=document.getElementById("expense-neto");s&&(s.innerHTML=this.formatCurrency(t-e));const a=document.getElementById("expense-iva-warn");a&&a.classList.toggle("hidden",!(t>0&&e>t*.2+.005))},expenseWizardStepWhat(t){const e=this.getExpenseCategories(),s=t.categoria==="stock_nuevo"||t.categoria==="stock_usado",a=i=>String(i||"").replace(/"/g,"&quot;"),o=i=>String(i||"").replace(/</g,"&lt;");return`
            <input type="hidden" id="expense-id" value="${t.id||""}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="vf-mini-label block mb-1.5">Fecha de factura *</label>
                    <input type="date" id="expense-fecha" value="${t.fecha||""}"
                        oninput="app.state.expenseWizard.fecha=this.value;app.updateLotPreview()"
                        class="vf-input">
                </div>
                <div>
                    <label class="vf-mini-label block mb-1.5">Proveedor *</label>
                    <input id="expense-proveedor" list="expense-supplier-list" value="${a(t.proveedor)}"
                        placeholder="Nombre de tienda/empresa"
                        oninput="app.expenseSupplierChanged(this.value)"
                        class="vf-input">
                </div>
            </div>
            <div class="mt-4">
                <label class="vf-mini-label block mb-1.5">Categoría del gasto *</label>
                <select id="expense-categoria" onchange="app.expenseWizardCategoryChanged(this)"
                    class="vf-input">
                    <option value="" disabled ${t.categoria?"":"selected"}>Seleccionar categoría...</option>
                    ${e.map(i=>`<option value="${i.value}" ${t.categoria===i.value?"selected":""}>${i.label}</option>`).join("")}
                </select>
            </div>
            <div id="expense-lot-fields" class="${s?"":"hidden"} mt-4 p-4 rounded-2xl bg-white/50">
                <label class="vf-mini-label block mb-1.5">
                    Nº de Factura <span class="font-medium opacity-75">(del proveedor)</span>
                </label>
                <input id="expense-invoice-number" value="${a(t.invoiceNumber)}" placeholder="Ej. 12345"
                    oninput="app.state.expenseWizard.invoiceNumber=this.value;app.updateLotPreview()"
                    class="vf-input">
                <div class="mt-2 flex items-center gap-2 text-xs">
                    <span class="text-stone-500 font-semibold">Lote</span>
                    <span id="expense-lot-preview" class="cx-channel">${this.buildLotRef(t.proveedor,t.invoiceNumber,t.fecha,t.id||null)||"—"}</span>
                </div>
                <p class="text-xs text-stone-500 mt-1.5">Une esta factura con los discos que cargues al inventario.</p>
                <div id="expense-vat-treatment" class="${t.categoria==="stock_nuevo"?"":"hidden"} mt-4 pt-4 border-t border-black/10">
                    <label class="vf-mini-label block mb-2">Tratamiento de IVA</label>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2" id="expense-vat-treatment-options">
                        ${this.expenseVatTreatmentOptionsHTML(t)}
                    </div>
                </div>
            </div>
            <div class="mt-4">
                <label class="vf-mini-label block mb-1.5">Notas / Descripción</label>
                <textarea id="expense-descripcion" rows="2" placeholder="Detalles adicionales (opcional)"
                    oninput="app.state.expenseWizard.descripcion=this.value"
                    class="vf-input !h-auto py-2.5 resize-none">${o(t.descripcion)}</textarea>
            </div>`},expenseWizardStepAmounts(t){const e=t.categoria==="stock_usado",s=t.vatTreatment||"eu",a=t.categoria==="stock_nuevo"&&s==="eu",o=t.categoria==="stock_nuevo"&&s==="dk",i=e||a,r=i||t.iva===""||t.iva==null?0:t.iva;return`
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="vf-mini-label block mb-1.5">Monto total (DKK) *</label>
                    <input type="number" id="expense-monto" step="0.01" min="0" value="${t.total===""||t.total==null?"":t.total}"
                        placeholder="0.00"
                        oninput="app.state.expenseWizard.total=this.value;app.expenseWizardUpdateNet()"
                        class="vf-input !h-12 !text-lg !font-semibold">
                </div>
                <div>
                    <label class="vf-mini-label block mb-1.5">Monto IVA / Moms (DKK)</label>
                    <div class="flex gap-2">
                        <input type="number" id="expense-iva" step="0.01" min="0" value="${r}"
                            placeholder="0.00" ${i?"disabled":""}
                            oninput="app.state.expenseWizard.iva=this.value;app.expenseWizardUpdateNet()"
                            class="vf-input flex-1 ${i?"opacity-60 cursor-not-allowed":""}">
                        ${i?"":'<button type="button" onclick="app.expenseWizardCalcVat()" class="vf-mult-chip !h-[42px] !rounded-[14px] shrink-0" title="Calcular IVA 25% incluido en el total">25%</button>'}
                    </div>
                    <p class="text-xs text-stone-500 mt-1.5 flex items-center gap-1">
                        <i class="ph-bold ph-info"></i> ${o?"Factura danesa: ingresá el 25% de IVA incluido en el total.":"Puede ser 0 si el proveedor es extranjero o particular"}
                    </p>
                </div>
            </div>
            ${e?`
            <p class="mt-3 text-sm bg-[#F2E14C] rounded-2xl px-3 py-2.5 flex items-center gap-2">
                <i class="ph-bold ph-warning"></i> Vinilos usados (Brugtmoms): sin IVA deducible.
            </p>`:""}
            ${a?`
            <p class="mt-3 text-sm bg-white/70 rounded-2xl px-3 py-2.5 flex items-center gap-2">
                <i class="ph-bold ph-info"></i> Reverse charge UE: la factura viene al 0%. El IVA se autoliquida por disco en el Reporte VAT (se declara y se deduce, neto 0).
            </p>`:""}
            <div class="vf-margin">
                <span class="vf-mini-label">Subtotal neto</span>
                <span id="expense-neto" class="text-2xl font-light tracking-tight"></span>
            </div>
            <p id="expense-iva-warn" class="hidden mt-2 text-xs font-semibold text-[#B42318] flex items-center gap-1">
                <i class="ph-bold ph-warning"></i> El IVA supera el 25% danés. Revisá los importes.
            </p>`},expenseWizardStepReview(t){return`
            <div class="mb-4">
                <label class="vf-mini-label block mb-2">Factura / Recibo *</label>
                <div id="upload-zone" onclick="document.getElementById('receipt-file').click()"
                    class="border-2 border-dashed border-black/15 rounded-3xl p-8 text-center cursor-pointer bg-white/40 hover:bg-[#F2E14C]/40 hover:border-[#1A1A1A]/30 transition-all group">
                    <input type="file" id="receipt-file" accept="image/*,.pdf" class="hidden" onchange="app.handleReceiptUpload(this)">
                    <div id="upload-placeholder">
                        <i class="ph ph-upload-simple text-4xl text-stone-500 mb-2"></i>
                        <p class="text-sm font-semibold">Subir la factura o el recibo</p>
                        <p class="text-xs text-stone-500 mt-1">JPG, PNG o PDF</p>
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
                <label class="mt-3 flex items-start gap-3 p-3 rounded-2xl bg-white/60 cursor-pointer hover:bg-white transition-all">
                    <input type="checkbox" id="expense-no-receipt" ${t.noReceipt?"checked":""} onchange="app.state.expenseWizard.noReceipt=this.checked" class="mt-0.5 w-4 h-4 accent-black">
                    <span class="text-sm text-stone-600">
                        <span class="font-semibold text-[#1A1A1A]">Guardar sin comprobante por ahora</span><br>
                        Queda marcada como "en revisión" hasta que lo subas.
                    </span>
                </label>
            </div>
            <div id="expensewizard-dup"></div>
            <div id="expensewizard-summary"></div>`},renderExpenseWizardReview(){var p,b,y,v,E;const t=this.state.expenseWizard;if(!t)return;const e=this.findDuplicateExpense(t.fecha,t.total,t.proveedor,t.descripcion,t.id||null),s=document.getElementById("expensewizard-dup");s&&(s.innerHTML=e?`
                <div class="mb-4 p-4 rounded-2xl bg-[#F2955E]">
                    <p class="text-sm font-semibold flex items-center gap-2"><i class="ph-bold ph-warning"></i> Posible duplicado</p>
                    <p class="text-sm mt-1">Ya existe <strong>${e.proveedor||e.description||""}</strong> el ${this.formatDate(e.fecha_factura||e.date)} por ${this.formatCurrency(Number(e.monto_total||e.amount||0))}.</p>
                    <label class="mt-3 flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" id="expense-dup-ack" ${t.dupAck?"checked":""} onchange="app.state.expenseWizard.dupAck=this.checked" class="mt-0.5 w-4 h-4 accent-black">
                        <span class="text-sm font-semibold">Es otra compra, guardar igual</span>
                    </label>
                </div>`:"");const o=((p=this.getExpenseCategories().find($=>$.value===t.categoria))==null?void 0:p.label)||t.categoria||"—",i=parseFloat(t.total)||0,r=t.vatTreatment||"eu",c=t.categoria==="stock_usado"||t.categoria==="stock_nuevo"&&r==="eu"?0:parseFloat(t.iva)||0,d=(t.categoria==="stock_nuevo"||t.categoria==="stock_usado")&&(t.proveedor||"").trim()?this.buildLotRef(t.proveedor,t.invoiceNumber,t.fecha,t.id||null)||"—":null,h=((b=document.getElementById("receipt-url"))==null?void 0:b.value)||t.receiptUrl||"",u=document.getElementById("expensewizard-summary");if(u){const $=(I,C)=>`<div class="flex justify-between gap-4 py-2 border-b border-black/5 last:border-0"><span class="text-sm text-stone-500">${I}</span><span class="text-sm font-semibold text-right">${C}</span></div>`;u.innerHTML=`
                <h4 class="vf-h">Resumen</h4>
                <div class="vf-card !py-2">
                    ${$("Fecha",this.formatDate(t.fecha))}
                    ${$("Proveedor",t.proveedor||"—")}
                    ${$("Categoría",o)}
                    ${$("Total",this.formatCurrency(i))}
                    ${$("IVA",this.formatCurrency(c))}
                    ${t.categoria==="stock_nuevo"?$("Tratamiento IVA",r==="dk"?"Dinamarca, 25%":"UE, reverse charge"):""}
                    ${$("Subtotal neto",this.formatCurrency(i-c))}
                    ${d?$("Lote",d):""}
                    ${$("Comprobante",h?'<span class="cx-state is-ok">Subido</span>':t.noReceipt?'<span class="cx-state is-wait">En revisión</span>':'<span class="cx-state is-hot">Falta</span>')}
                </div>`}if(t.receiptUrl&&!((y=document.getElementById("receipt-url"))!=null&&y.value)){const $=document.getElementById("receipt-url");$&&($.value=t.receiptUrl),(v=document.getElementById("upload-placeholder"))==null||v.classList.add("hidden"),(E=document.getElementById("upload-preview"))==null||E.classList.remove("hidden");const I=document.getElementById("receipt-preview-img");I&&(I.src=t.receiptUrl);const C=document.getElementById("receipt-filename");C&&(C.textContent="Comprobante guardado")}},saveExpenseWizard(){var l;const t=this.state.expenseWizard;if(!t)return;this.captureExpenseWizardFields();const e=((l=document.getElementById("receipt-url"))==null?void 0:l.value)||t.receiptUrl||"";if(!e&&!t.noReceipt){this.showToast('Subí el comprobante o marcá "Cargar sin comprobante por ahora".');return}if(this.findDuplicateExpense(t.fecha,t.total,t.proveedor,t.descripcion,t.id||null)&&!t.dupAck){this.showToast('Posible duplicado: revisá el aviso y marcá "guardar igual" para continuar.');return}const a=(window.expenseCategories||[]).find(d=>d.value===t.categoria),o=t.categoria==="stock_nuevo"?t.vatTreatment||"eu":"",i=t.categoria==="stock_usado"||o==="eu",r={proveedor:(t.proveedor||"").trim(),fecha_factura:t.fecha,date:t.fecha,monto_total:parseFloat(t.total)||0,monto_iva:i?0:parseFloat(t.iva)||0,categoria:t.categoria,categoria_label:(a==null?void 0:a.label)||t.categoria,categoria_tipo:(a==null?void 0:a.type)||"operativo",is_vat_deductible:(a==null?void 0:a.type)==="operativo"||(a==null?void 0:a.type)==="stock_nuevo",vat_treatment:o,descripcion:(t.descripcion||"").trim(),receiptUrl:e,timestamp:new Date().toISOString(),receiptPending:!e&&!!t.noReceipt,invoiceNumber:(t.invoiceNumber||"").trim(),supplier:(t.proveedor||"").trim(),lotRef:(t.categoria==="stock_nuevo"||t.categoria==="stock_usado")&&(t.proveedor||"").trim()?this.buildLotRef(t.proveedor,t.invoiceNumber,t.fecha,t.id||null):""};o&&this.rememberVatTreatment(t.proveedor,o);const n=()=>{this.showToast(t.id?"Compra actualizada":"Compra registrada"),this.closeExpenseWizard(),this.loadData()},c=d=>{console.error(d),this.showToast("Error al guardar")};t.id?T.collection("expenses").doc(t.id).update(r).then(n).catch(c):T.collection("expenses").add(r).then(n).catch(c)},normalizeText(t){return(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()},findDuplicateExpense(t,e,s,a,o){const i=this.normalizeText(`${s||""} ${a||""}`),r=(t||"").slice(0,10),n=Number(e)||0;return!r||!n?null:(this.state.expenses||[]).find(c=>{if(o&&c.id===o||(c.fecha_factura||c.date||"").slice(0,10)!==r||Math.abs((Number(c.monto_total||c.amount)||0)-n)>.005)return!1;const l=this.normalizeText(`${c.proveedor||c.description||""} ${c.descripcion||""}`);return!i||!l?!1:l.includes(i)||i.includes(l)})||null},normalizeLotSupplier(t){return(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"").toUpperCase()},buildLotRef(t,e,s,a){const o=this.normalizeLotSupplier(t);if(!o)return"";const i=(e||"").trim().replace(/[^a-zA-Z0-9-]/g,"").toUpperCase(),r=(s||"").slice(0,10).replace(/-/g,"");let n=i?`${o}-${i}`:`${o}-${r||"SINF"}`,c=n,l=2;const d=new Set((this.state.expenses||[]).filter(h=>h.id!==a).map(h=>h.lotRef).filter(Boolean));for(;d.has(c);)c=`${n}-${l++}`;return c},getRecentLots(t=20){const e=new Map;return(this.state.expenses||[]).forEach(s=>{s.lotRef&&e.set(s.lotRef,(s.fecha_factura||s.date||"").slice(0,10))}),(this.state.inventory||[]).forEach(s=>{s.lot&&!e.has(s.lot)&&e.set(s.lot,"")}),[...e.keys()].slice(0,t)},countDiscsInLot(t){return t?(this.state.inventory||[]).filter(e=>(e.lot||"")===t).length:0},gotoInventoryLot(t){t&&(this.state.filterLot=t,this.state.invPage=1,this.navigate("inventory"))},toggleExpenseLotFields(){var o;const t=((o=document.getElementById("expense-categoria"))==null?void 0:o.value)||"",e=document.getElementById("expense-lot-fields");if(!e)return;const s=t==="stock_nuevo"||t==="stock_usado";e.classList.toggle("hidden",!s);const a=document.getElementById("expense-vat-treatment");a&&a.classList.toggle("hidden",t!=="stock_nuevo"),s&&this.updateLotPreview()},updateLotPreview(){var r,n,c,l;const t=document.getElementById("expense-lot-preview");if(!t)return;const e=((r=document.getElementById("expense-proveedor"))==null?void 0:r.value)||"",s=((n=document.getElementById("expense-invoice-number"))==null?void 0:n.value)||"",a=((c=document.getElementById("expense-fecha"))==null?void 0:c.value)||"",o=((l=document.getElementById("expense-id"))==null?void 0:l.value)||null,i=this.buildLotRef(e,s,a,o);t.textContent=i||"—"},exportExpensesToCSV(){const t=this.state.expenses||[],e=n=>`"${String(n??"").replace(/"/g,'""')}"`,a=[["Fecha","Proveedor","N Factura","Lote","Descripcion","Categoria","Tratamiento IVA","Total (kr)","IVA (kr)","Comprobante"].map(e).join(";")],o=n=>{if(n.categoria!=="stock_nuevo")return"";const c=n.vat_treatment==="dk"?"dk":n.vat_treatment==="eu"||n.is_inventory_invoice?"eu":null;return c==="dk"?"Dinamarca 25%":c==="eu"?"UE reverse charge":""};t.forEach(n=>{a.push([e((n.fecha_factura||n.date||"").slice(0,10)),e(n.proveedor||n.description||""),e(n.invoiceNumber||""),e(n.lotRef||""),e(n.descripcion||""),e(n.categoria_label||n.categoria||n.category||""),e(o(n)),e(Number(n.monto_total||n.amount||0).toFixed(2)),e(Number(n.monto_iva||0).toFixed(2)),e(n.receiptUrl?"Si":n.receiptPending?"En revision":"No")].join(";"))});const i=new Blob(["\uFEFF"+a.join(`
`)],{type:"text/csv;charset=utf-8"}),r=document.createElement("a");r.href=URL.createObjectURL(i),r.download=`registro_compras_${new Date().toISOString().slice(0,10)}.csv`,r.click(),URL.revokeObjectURL(r.href),this.showToast("✅ CSV exportado ("+t.length+" registros)")},openInventoryIngest(t){const e=this.state.expenses.find(a=>a.id===t);if(!e)return;const s=e.categoria==="stock_nuevo"?e.vat_treatment==="dk"?"DK_B2B":"EU_B2B":"";this.openQuickAddWizard(e.lotRef||"",s),e.lotRef&&this.showToast(`Cargando discos del lote ${e.lotRef}`)},deleteExpense(t){const e=this.state.expenses.find(s=>s.id===t);if(e!=null&&e.receiptUrl){if(!confirm(`⚠️ ATENCIÓN: Este gasto tiene un recibo adjunto.

¿Estás seguro de que quieres eliminarlo?`))return;if(!confirm(`🔒 CONFIRMACIÓN LEGAL REQUERIDA

La ley exige guardar documentos contables durante 5 AÑOS.

Fecha del gasto: `+(e.fecha_factura||e.date||"Desconocida")+`
Proveedor: `+(e.proveedor||"Sin nombre")+`
Monto: `+this.formatCurrency(e.monto_total||e.amount||0)+`

¿CONFIRMAS que deseas eliminar permanentemente este registro y su recibo?`)){this.showToast("ℹ️ Eliminación cancelada");return}}else if(!confirm("¿Eliminar esta compra?"))return;T.collection("expenses").doc(t).delete().then(()=>{this.showToast("✅ Compra eliminada"),this.loadData()}).catch(s=>console.error(s))},async downloadReceiptsZip(){const t=new Date,e=t.getFullYear(),s=t.getMonth(),a=this.state.expenses.filter(o=>{const i=new Date(o.fecha_factura||o.date);return i.getFullYear()===e&&i.getMonth()===s&&o.receiptUrl});if(a.length===0){this.showToast("ℹ️ No hay comprobantes con recibo este mes");return}this.showToast(`📦 Preparando ZIP con ${a.length} comprobantes...`);try{const o=new JSZip,i=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],r=`Comprobantes_${e}_${String(s+1).padStart(2,"0")}_${i[s]}`,n=o.folder(r);let c=`RESUMEN DE COMPROBANTES - ${i[s]} ${e}
`;c+=`${"=".repeat(50)}

`,c+=`Generado: ${t.toLocaleString("es-ES")}
`,c+=`Total comprobantes: ${a.length}
`,c+=`Total gastos: ${this.formatCurrency(a.reduce((p,b)=>p+(b.monto_total||b.amount||0),0))}
`,c+=`Total IVA: ${this.formatCurrency(a.reduce((p,b)=>p+(b.monto_iva||0),0))}

`,c+=`${"=".repeat(50)}

`,c+=`DETALLE:

`;let l=0,d=0;for(let p=0;p<a.length;p++){const b=a[p],v=new Date(b.fecha_factura||b.date).toISOString().split("T")[0],E=(b.proveedor||"SinNombre").replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,"").replace(/\s+/g,"-").substring(0,20).trim(),$=Math.round(b.monto_total||b.amount||0);let I="jpg";b.receiptUrl.includes(".pdf")?I="pdf":b.receiptUrl.includes(".png")&&(I="png");const C=`${String(p+1).padStart(3,"0")}_${v}_${E}_${$}DKK.${I}`;try{const m=await fetch(b.receiptUrl);if(!m.ok)throw new Error("Fetch failed");const g=await m.blob();n.file(C,g),l++,c+=`${String(p+1).padStart(3,"0")}. ${v} | ${E}
`,c+=`    Total: ${this.formatCurrency(b.monto_total||b.amount||0)} | IVA: ${this.formatCurrency(b.monto_iva||0)}
`,c+=`    Archivo: ${C}

`}catch(m){console.warn(`Could not fetch receipt for ${b.proveedor}:`,m),d++,c+=`${String(p+1).padStart(3,"0")}. ${v} | ${E} - ⚠️ ERROR: No se pudo descargar

`}}n.file("_INDICE.txt",c);const h=await o.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}}),u=`${r}.zip`;saveAs(h,u),d>0?this.showToast(`⚠️ ZIP generado: ${l} OK, ${d} con error`):this.showToast(`✅ ZIP descargado: ${l} comprobantes`)}catch(o){console.error("ZIP generation error:",o),this.showToast("❌ Error al generar ZIP")}},async handleReceiptUpload(t){const e=t.files[0];if(!e)return;const s=document.getElementById("upload-placeholder"),a=document.getElementById("upload-preview"),o=document.getElementById("receipt-preview-img"),i=document.getElementById("receipt-filename"),r=document.getElementById("receipt-url");s.innerHTML='<i class="ph-duotone ph-spinner text-4xl text-brand-orange animate-spin mb-2"></i><p class="text-sm text-slate-500">Subiendo...</p>';try{const n=e.name.split(".").pop().toLowerCase(),{structuredPath:c,structuredFilename:l}=this.generateReceiptPath(n),h=firebase.storage().ref().child(c);await h.put(e);const u=await h.getDownloadURL();if(r.value=u,document.getElementById("receipt-url").dataset.structuredPath=c,document.getElementById("receipt-url").dataset.structuredFilename=l,e.type.startsWith("image/"))o.src=URL.createObjectURL(e),o.classList.remove("hidden");else if(e.type==="application/pdf"){o.src="",o.classList.add("hidden");const p=o.parentNode.querySelector(".ph-file-pdf");p&&p.remove();const b=document.createElement("i");b.className="ph-duotone ph-file-pdf text-6xl text-red-500 mb-2 block mx-auto",o.parentNode.insertBefore(b,o)}i.textContent=l,s.classList.add("hidden"),a.classList.remove("hidden"),s.innerHTML=`
                <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                    Subir Factura/Recibo
                </p>
                <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
            `,this.showToast("✅ Archivo subido correctamente")}catch(n){console.error("Upload error details:",n),alert("Error al subir: "+n.message),s.innerHTML=`
                <i class="ph-duotone ph-upload-simple text-4xl text-slate-300 group-hover:text-brand-orange transition-colors mb-2"></i>
                <p class="text-sm text-slate-500 group-hover:text-brand-orange transition-colors font-medium">
                    Subir Factura/Recibo
                </p>
                <p class="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
            `,this.showToast("❌ Error: "+n.message)}},generateReceiptPath(t){var e,s;try{const a=new Date,o=a.getFullYear(),i=a.getMonth()+1,r=a.getDate(),n=((e=document.getElementById("expense-proveedor"))==null?void 0:e.value)||"Proveedor",c=((s=document.getElementById("expense-monto"))==null?void 0:s.value)||"0",l=n.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,"").replace(/\s+/g,"-").substring(0,20).trim()||"Proveedor",d=Math.round(parseFloat(c)||0)+"dkk",h=Math.random().toString(36).substring(2,7).toUpperCase(),p=`${`${o}-${String(i).padStart(2,"0")}-${String(r).padStart(2,"0")}`}_${l}_${d}_${h}.${t}`,b=`receipts/${p}`;return console.log("📁 Structured Receipt Path:",b),{structuredPath:b,structuredFilename:p}}catch(a){console.error("Error in generateReceiptPath:",a);const o=`receipt_${Date.now()}.${t}`;return{structuredPath:`receipts/${o}`,structuredFilename:o}}},async processReceiptOCR(t){var e,s;try{const a=document.getElementById("expense-form-title"),o=a.innerHTML;a.innerHTML='<i class="ph-duotone ph-scan text-brand-orange animate-pulse"></i> Escaneando recibo...';const i=new FormData;i.append("url",t),i.append("language","dan"),i.append("isOverlayRequired","false"),i.append("OCREngine","2"),i.append("scale","true"),i.append("isTable","false");const n=await(await fetch("https://api.ocr.space/parse/image",{method:"POST",headers:{apikey:bt},body:i})).json();if(n.IsErroredOnProcessing)throw new Error(n.ErrorMessage||"OCR processing failed");const c=((s=(e=n.ParsedResults)==null?void 0:e[0])==null?void 0:s.ParsedText)||"";console.log("OCR Raw Text:",c);const l=this.parseReceiptText(c);this.autoFillExpenseForm(l),a.innerHTML='<i class="ph-duotone ph-check-circle text-green-500"></i> Datos extraídos - verifica';const d=Object.values(l).filter(h=>h).length;d>=3?this.showToast("✨ Datos extraídos correctamente"):d>0?this.showToast("⚠️ Algunos datos extraídos - completa manualmente"):(this.showToast("ℹ️ No se detectaron datos - ingresa manualmente"),a.innerHTML=o)}catch(a){console.error("OCR Error:",a),this.showToast("⚠️ OCR no disponible - ingresa datos manualmente");const o=document.getElementById("expense-form-title");o.innerHTML='<i class="ph-duotone ph-plus-circle text-brand-orange"></i> Nueva Compra'}},fileToBase64(t){return new Promise((e,s)=>{const a=new FileReader;a.onload=()=>e(a.result),a.onerror=s,a.readAsDataURL(t)})},parseReceiptText(t){const e={fecha:null,proveedor:null,monto_total:null,monto_iva:null},s=t.replace(/\r\n/g,`
`).replace(/\s+/g," "),a=t.split(/\r?\n/).map(l=>l.trim()).filter(l=>l),o=[/(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/,/(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2})/,/(\d{1,2}\.\s?\w+\.?\s?\d{2,4})/i];for(const l of o){const d=s.match(l);if(d){e.fecha=this.normalizeDate(d[1]);break}}const i=[/(?:i\s*alt|total|sum|totalt|att\s*betala)[:\s]*(\d+[.,]\d{2})/i,/(?:total|sum)[:\s]*(?:kr\.?|dkk)?\s*(\d+[.,]\d{2})/i,/(\d+[.,]\d{2})\s*(?:dkk|kr)/i];for(const l of i){const d=s.match(l);if(d){e.monto_total=parseFloat(d[1].replace(",","."));break}}const r=[/(?:moms|25%|heraf\s*moms)[:\s]*(\d+[.,]\d{2})/i,/(?:vat|iva|tax)[:\s]*(\d+[.,]\d{2})/i,/moms\s*(?:kr\.?|dkk)?\s*(\d+[.,]\d{2})/i];for(const l of r){const d=s.match(l);if(d){e.monto_iva=parseFloat(d[1].replace(",","."));break}}e.monto_total&&!e.monto_iva&&(e.monto_iva=Math.round(e.monto_total*.2*100)/100);const n=["kvittering","receipt","bon","faktura","invoice","kopi","copy"];for(const l of a.slice(0,5)){const d=l.trim();if(d.length>2&&d.length<50&&!n.some(h=>d.toLowerCase().includes(h))&&!/^\d+$/.test(d)&&!/^[\d\s\-\/\.]+$/.test(d)){e.proveedor=d;break}}const c=s.match(/(?:cvr|org\.?\s*nr)[:\s]*(\d{8})/i);if(c&&a.length>0){const l=a.findIndex(d=>d.includes(c[0]));l>0&&!e.proveedor&&(e.proveedor=a[l-1])}return console.log("Parsed Receipt Data:",e),e},normalizeDate(t){try{const s=t.replace(/\s/g,"").replace(/[\.\/]/g,"-").split("-");if(s.length>=3){let a,o,i;return s[0].length===4?[i,o,a]=s:([a,o,i]=s,i.length===2&&(i="20"+i)),a=a.padStart(2,"0"),o=o.padStart(2,"0"),`${i}-${o}-${a}`}}catch{console.warn("Date normalization failed:",t)}return null},autoFillExpenseForm(t){if(t.fecha){const e=document.getElementById("expense-fecha");e&&(e.value=t.fecha,this.highlightAutoFilled(e))}if(t.proveedor){const e=document.getElementById("expense-proveedor");e&&(e.value=t.proveedor,this.highlightAutoFilled(e))}if(t.monto_total){const e=document.getElementById("expense-monto");e&&(e.value=t.monto_total.toFixed(2),this.highlightAutoFilled(e))}if(t.monto_iva){const e=document.getElementById("expense-iva");e&&!e.disabled&&(e.value=t.monto_iva.toFixed(2),this.highlightAutoFilled(e))}},highlightAutoFilled(t){t.classList.add("ring-2","ring-green-400","bg-green-50");const e=()=>{t.classList.remove("ring-2","ring-green-400","bg-green-50"),t.removeEventListener("focus",e)};t.addEventListener("focus",e),setTimeout(e,5e3)},clearReceiptUpload(){document.getElementById("receipt-file").value="",document.getElementById("receipt-url").value="",document.getElementById("upload-placeholder").classList.remove("hidden"),document.getElementById("upload-preview").classList.add("hidden"),document.getElementById("receipt-preview-img").src="",document.getElementById("receipt-filename").textContent=""},renderConsignments(t){if(!t)return;const e=`
    <div class="cx-view">
    <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Consignaciones",subtitle:"Discos de socios: cuánto tienen en stock y cuánto les debés",primary:{label:"Nuevo socio",icon:"ph-plus",onclick:"app.openAddConsignorModal()"}})}
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    ${this.state.consignors.map(s=>{const a=s.name,o=this.state.inventory.filter(p=>p.owner===a),i=o.reduce((p,b)=>p+b.stock,0),r=[];this.state.sales.forEach(p=>{(p.items||[]).filter(y=>{if((y.owner||"").toLowerCase()===a.toLowerCase())return!0;const v=this.state.inventory.find(E=>E.id===(y.productId||y.recordId));return v&&(v.owner||"").toLowerCase()===a.toLowerCase()}).forEach(y=>{const v=Number(y.priceAtSale||y.unitPrice||0),E=s.agreementSplit||s.split||70,$=v*E/100;r.push({...y,id:p.id,date:p.date,cost:y.costAtSale||y.cost||$,payoutStatus:p.payoutStatus||"pending",payoutDate:p.payoutDate||null})}),(!p.items||p.items.length===0)&&(p.owner||"").toLowerCase()===a.toLowerCase()&&r.push({...p,album:p.album||p.sku||"Record",cost:p.cost||(Number(p.total)||0)*(s.agreementSplit||70)/100})}),r.sort((p,b)=>new Date(b.date)-new Date(p.date));const n=r.reduce((p,b)=>p+(Number(b.qty||b.quantity)||1),0),c=r.reduce((p,b)=>p+(Number(b.cost)||0),0),l=r.filter(p=>p.payoutStatus==="paid").reduce((p,b)=>p+(Number(b.cost)||0),0),d=c-l,h=o.filter(p=>p.stock>0).map(p=>`
                <div class="flex items-center gap-2 p-1.5 rounded-xl bg-white/5">
                    <img src="${p.cover_image||p.image||"https://elcuartito.dk/default-vinyl.png"}" class="w-10 h-10 rounded-lg object-cover shrink-0" onerror="this.src='https://elcuartito.dk/default-vinyl.png'" alt="">
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-semibold text-white truncate">${p.album||p.title||"Sin título"}</p>
                        <p class="text-[11px] text-stone-400 truncate">${p.artist||""}${p.location?" · "+p.location:""}</p>
                        <p class="text-[11px] text-[#F2E14C] font-semibold">${this.formatCurrency(p.price||0)} × ${p.stock}</p>
                    </div>
                </div>
            `).join(""),u=s.agreementSplit||s.split||70;return`
                        <section class="vf-card flex flex-col !p-5">
                            <div class="flex justify-between items-start gap-3">
                                <div class="min-w-0">
                                    <h3 class="cx-dialog-title truncate">${s.name}</h3>
                                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-stone-600">
                                        <span class="cx-state is-split">${u}% para el socio</span>
                                        ${s.email?`<a href="mailto:${s.email}" class="hover:underline truncate"><i class="ph ph-envelope-simple"></i> ${s.email}</a>`:""}
                                        ${s.phone?`<a href="tel:${s.phone}" class="hover:underline"><i class="ph ph-phone"></i> ${s.phone}</a>`:""}
                                    </div>
                                </div>
                                <button onclick="app.deleteConsignor('${s.id}')" class="cx-row-btn is-danger shrink-0" title="Eliminar socio" aria-label="Eliminar socio ${s.name}"><i class="ph ph-trash"></i></button>
                            </div>

                            <div class="grid grid-cols-2 gap-3 mt-4">
                                <div class="relative group/stock cx-tile cx-yellow !min-h-0 !overflow-visible cursor-default">
                                    <span class="cx-tile-label">En stock</span>
                                    <b class="cx-tile-value !text-2xl">${i} <small>discos</small></b>
                                    ${i>0?`
                                    <div class="absolute bottom-full left-0 pb-2 w-72 opacity-0 invisible group-hover/stock:opacity-100 group-hover/stock:visible focus-within:opacity-100 focus-within:visible transition-opacity duration-150 z-50">
                                        <div class="bg-[#1A1A1A] rounded-2xl shadow-2xl p-3">
                                            <p class="text-xs font-semibold text-stone-400 mb-2">Discos en stock (${i})</p>
                                            <div class="space-y-1.5 max-h-64 overflow-y-auto overscroll-contain custom-scrollbar pr-1">
                                                ${h||'<p class="text-xs text-stone-500 text-center py-2">Sin discos</p>'}
                                            </div>
                                        </div>
                                    </div>`:""}
                                </div>
                                <div class="cx-tile ${d>0?"cx-dark":"cx-frost"} !min-h-0">
                                    <span class="cx-tile-label">A pagarle</span>
                                    <b class="cx-tile-value !text-2xl">${this.formatCurrency(d)}</b>
                                </div>
                            </div>

                            <div class="flex justify-between items-center mt-5 mb-2">
                                <h4 class="text-sm font-semibold">Ventas de sus discos <span class="cx-count">${n}</span></h4>
                                <span class="text-xs text-stone-500">Ya pagado ${this.formatCurrency(l)}</span>
                            </div>
                            <div class="max-h-64 overflow-y-auto custom-scrollbar -mx-2">
                                ${r.length>0?r.map(p=>`
                                    <div class="cx-feed-row !cursor-default ${p.payoutStatus==="paid"?"opacity-60":""}">
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm font-semibold truncate">${p.album||p.sku}</p>
                                            <p class="text-xs text-stone-500">${this.formatDate(p.date)} · le corresponde ${this.formatCurrency(p.cost)}${p.payoutStatus==="paid"&&p.payoutDate?` · pagado el ${this.formatDate(p.payoutDate)}`:""}</p>
                                        </div>
                                        <button onclick="app.togglePayoutStatus('${p.id}', '${p.payoutStatus||"pending"}')"
                                            class="cx-btn !h-8 !px-3 !text-xs ${p.payoutStatus==="paid"?"":"is-primary"}"
                                            title="${p.payoutStatus==="paid"?"Marcar como no pagado":"Marcar como pagado"}">
                                            ${p.payoutStatus==="paid"?'<i class="ph-bold ph-check"></i> Pagado':"Pagar"}
                                        </button>
                                    </div>
                                `).join(""):'<p class="text-sm text-stone-500 px-2 py-3">Todavía no se vendió ningún disco de este socio.</p>'}
                            </div>
                        </section>
                        `}).join("")}
                        ${this.state.consignors.length===0?`
                        <div class="col-span-full text-center py-16 rounded-3xl border border-dashed border-black/15">
                            <span class="cx-sq mx-auto mb-4"><i class="ph ph-handshake"></i></span>
                            <h3 class="cx-h mb-2">Todavía no hay socios</h3>
                            <p class="text-sm text-stone-600 mb-6 max-w-md mx-auto">Sumá a quienes te dejan discos en consignación y el sistema calcula cuánto le debés a cada uno.</p>
                            <button onclick="app.openAddConsignorModal()" class="cx-btn is-primary"><i class="ph-bold ph-plus"></i>Agregar socio</button>
                        </div>
                    `:""}
                    </div>
                </div>
                </div>
    `;t.innerHTML=e},togglePayoutStatus(t,e){if(!confirm(`¿Marcar esta venta como ${e==="paid"?"PENDIENTE":"PAGADA"}?`))return;const s=e==="paid"?"pending":"paid",a={payoutStatus:s};s==="paid"?a.payoutDate=new Date().toISOString():a.payoutDate=null,T.collection("sales").doc(t).update(a).then(()=>{this.showToast(s==="paid"?"✅ Venta marcada como PAGADA":"✅ Venta marcada como PENDIENTE"),this.loadData()}).catch(o=>{console.error(o),this.showToast("❌ Error al actualizar: "+o.message,"error")})},openAddConsignorModal(){document.body.insertAdjacentHTML("beforeend",`
    <div id="modal-overlay" class="vf-overlay cx-dialog-wrap" onclick="if (event.target === this) this.remove()">
        <div class="cx-dialog cx-view" role="dialog" aria-modal="true" aria-labelledby="cons-title">
            <div class="flex justify-between items-start mb-5">
                <h3 id="cons-title" class="cx-dialog-title">Nuevo socio</h3>
                <button type="button" onclick="document.getElementById('modal-overlay').remove()" class="cx-btn is-icon" aria-label="Cerrar"><i class="ph ph-x"></i></button>
            </div>
            <form onsubmit="app.handleAddConsignor(event)" class="space-y-3">
                <label class="vf-field"><span>Nombre y apellido</span>
                    <input name="name" required class="vf-input"></label>
                <label class="vf-field"><span>Porcentaje para el socio (%)</span>
                    <input name="split" type="number" min="0" max="100" value="70" required class="vf-input"></label>
                <p class="text-xs text-stone-500 -mt-1">La parte de cada venta que se queda el dueño del disco.</p>
                <div class="grid grid-cols-2 gap-3">
                    <label class="vf-field"><span>Email <em>(opcional)</em></span>
                        <input name="email" type="email" class="vf-input"></label>
                    <label class="vf-field"><span>Teléfono <em>(opcional)</em></span>
                        <input name="phone" type="tel" class="vf-input"></label>
                </div>
                <div class="pt-3 flex justify-end gap-2">
                    <button type="button" onclick="document.getElementById('modal-overlay').remove()" class="cx-btn">Cancelar</button>
                    <button type="submit" class="cx-btn is-primary">Guardar socio</button>
                </div>
            </form>
        </div>
    </div>
`),setTimeout(()=>{var e;return(e=document.querySelector('#modal-overlay input[name="name"]'))==null?void 0:e.focus()},50)},handleAddConsignor(t){t.preventDefault();const e=new FormData(t.target),s={name:e.get("name"),agreementSplit:parseFloat(e.get("split")),email:e.get("email"),phone:e.get("phone")};T.collection("consignors").add(s).then(()=>{this.showToast("✅ Socio registrado correctamente"),document.getElementById("modal-overlay").remove(),this.loadData()}).catch(a=>{console.error(a),this.showToast("❌ Error al crear socio: "+a.message,"error")})},deleteConsignor(t){confirm("¿Eliminar este socio?")&&T.collection("consignors").doc(t).delete().then(()=>{this.showToast("✅ Socio eliminado"),this.loadData()}).catch(e=>{console.error(e),this.showToast("❌ Error al eliminar socio: "+e.message,"error")})},saveData(){try{const t={};localStorage.setItem("el-cuartito-settings",JSON.stringify(t))}catch(t){console.error("Error saving settings:",t)}},searchDiscogs(){const t=document.getElementById("discogs-search-input").value,e=document.getElementById("discogs-results");if(t){if(e.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Buscando en Discogs...</p>',e.classList.remove("hidden"),/^\d+$/.test(t.trim())){this.fetchDiscogsById(t.trim());return}fetch(`${j}/discogs/search?q=${encodeURIComponent(t)}`).then(s=>{if(!s.ok)throw new Error(`Error ${s.status}`);return s.json()}).then(s=>{const a=s.results||[];a.length>0?e.innerHTML=a.slice(0,10).map(o=>`
                        <div onclick='app.handleDiscogsSelection(${JSON.stringify(o).replace(/'/g,"&#39;")})' class="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-brand-orange hover:shadow-sm transition-all">
                            <img src="${o.thumb||"logo.jpg"}" class="w-12 h-12 rounded object-cover bg-slate-100 flex-shrink-0">
                            <div class="flex-1 min-w-0">
                                <p class="font-bold text-xs text-brand-dark leading-tight mb-1">${o.title}</p>
                                <p class="text-[10px] text-slate-500">${o.year||"?"} · ${o.format?o.format.join(", "):"Vinyl"} · ${o.country||""}</p>
                                <p class="text-[10px] text-slate-400">${o.label?o.label[0]:""}</p>
                            </div>
                            <i class="ph-bold ph-plus-circle text-brand-orange text-lg flex-shrink-0"></i>
                        </div>
                    `).join(""):e.innerHTML='<p class="text-xs text-slate-400 p-2">No se encontraron resultados.</p>'}).catch(s=>{console.error(s),e.innerHTML=`
                    <div class="text-center py-4 px-3">
                        <p class="text-xs text-red-500 font-bold mb-2">❌ ${s.message}</p>
                        <p class="text-[10px] text-slate-400">Hubo un error al buscar en Discogs a través del servidor.</p>
                    </div>
                `})}},resyncMusic(){["input-discogs-id","input-discogs-release-id","input-discogs-url","input-cover-image"].forEach(a=>{const o=document.getElementById(a);o&&(o.value="")});const t=document.querySelector('input[name="artist"]').value,e=document.querySelector('input[name="album"]').value,s=document.getElementById("discogs-search-input");s&&t&&e?(s.value=`${t} - ${e}`,this.searchDiscogs(),this.showToast("✅ Música desvinculada. Selecciona una nueva edición.","success")):this.showToast("⚠️ Falta Artista o Álbum para buscar.","error")},handleDiscogsSelection(t){const e=document.getElementById("discogs-results");e&&e.classList.add("hidden");const s=t.title.split(" - "),a=s[0]||"",o=s.slice(1).join(" - ")||t.title,i=document.querySelector("#modal-overlay form");if(!i)return;if(i.artist&&(i.artist.value=a),i.album&&(i.album.value=o),i.year&&t.year&&(i.year.value=t.year),t.thumb||t.cover_image){const n=t.cover_image||t.thumb,c=document.getElementById("input-cover-image"),l=document.getElementById("cover-preview");if(c&&(c.value=n),l){const d=l.querySelector("img"),h=document.getElementById("cover-placeholder");d&&(d.src=n,d.classList.remove("hidden")),h&&h.classList.add("hidden")}}const r=document.getElementById("input-discogs-id");if(r&&t.id&&(r.value=t.id),this.vfCheckDuplicates(),t.uri||t.resource_url){const n=t.uri||t.resource_url,c=n.startsWith("http")?n:"https://www.discogs.com"+n,l=document.getElementById("input-discogs-url");l&&(l.value=c)}if(t.id){const n=document.getElementById("discogs-metadata-area"),c=document.getElementById("metadata-tracks"),l=document.getElementById("metadata-tags"),d=document.getElementById("discogs-link");console.log("Metadata Area Found:",!!n),n&&(n.classList.remove("hidden"),n.style.display="grid"),c&&(c.innerHTML='<p class="text-[10px] text-slate-400 animate-pulse">Loading tracks...</p>'),this.showToast("⏳ Cargando detalles...","info"),fetch(`${j}/discogs/release/${t.id}`).then(h=>h.json()).then(h=>{const u=h.release||h;if(console.log("Full Release Data:",u),n&&(n.classList.remove("hidden"),n.style.display="grid"),d&&u.uri){const y=u.uri.startsWith("http")?u.uri:"https://www.discogs.com"+u.uri;d.href=y,d.classList.remove("hidden"),d.style.display="flex"}const p=u.styles||[],b=[...new Set(p)];l&&(l.innerHTML=b.map(y=>`<button type="button" class="vf-suggest-chip" onclick="app.vfAddGenre('${y.replace(/'/g,"\\'")}')">${y}</button>`).join(""));for(let y=0;y<Math.min(b.length,3);y++){const v=document.getElementById(`genre-${y+1}`);v&&(v.value=b[y])}if(c)if(u.tracklist&&u.tracklist.length>0){const y=document.getElementById("input-tracks");y&&(y.value=JSON.stringify(u.tracklist)),c.innerHTML=u.tracklist.map(v=>`
                                <div class="track-item flex justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
                                    <span class="font-bold w-6 opacity-40 shrink-0 capitalize text-[9px]">${v.position||"•"}</span>
                                    <span class="flex-1 truncate font-medium text-slate-600 text-[10px]">${v.title}</span>
                                    <span class="opacity-40 text-[9px] font-mono shrink-0">${v.duration||""}</span>
                                </div>
                            `).join("")}else c.innerHTML='<p class="text-[10px] text-slate-400 italic">No tracks found.</p>';i.label&&u.labels&&u.labels.length>0&&(i.label.value=u.labels[0].name)}).catch(h=>{console.error("Error fetching full release:",h),c&&(c.innerHTML='<p class="text-[10px] text-red-400">Error loading tracklist.</p>')})}},openTracklistModal(t){const e=this.state.inventory.find(i=>i.id===t||i.sku===t);if(!e)return;let s=e.discogsId;document.body.insertAdjacentHTML("beforeend",`
                                                                <div id="tracklist-overlay" class="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                                                                    <div class="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-fadeIn">
                                                                        <h3 class="font-display text-xl font-bold text-brand-dark mb-4">Lista de Temas (Tracklist)</h3>
                                                                        <div class="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                                                            <i class="ph-bold ph-spinner animate-spin text-4xl text-brand-orange"></i>
                                                                            <p class="font-medium">Cargando tracks desde Discogs...</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                `);const o=i=>{fetch(`${j}/discogs/release/${i}`).then(r=>{if(!r.ok)throw new Error("Release not found");return r.json()}).then(r=>{const c=(r.release||r).tracklist||[],l=c.map(h=>`
                                                                <div class="flex items-center justify-between py-3 border-b border-slate-50 hover:bg-slate-50 px-2 transition-colors rounded-lg group">
                                                                    <div class="flex items-center gap-3">
                                                                        <span class="text-xs font-mono font-bold text-slate-400 w-8">${h.position}</span>
                                                                        <span class="text-sm font-bold text-brand-dark group-hover:text-brand-orange transition-colors">${h.title}</span>
                                                                    </div>
                                                                    <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">${h.duration||"--:--"}</span>
                                                                </div>
                                                                `).join(""),d=`
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
                                                                        <a href="https://www.discogs.com/release/${i}" target="_blank" class="text-xs font-bold text-brand-orange hover:underline flex items-center justify-center gap-1">
                                                                            Ver release completo en Discogs <i class="ph-bold ph-arrow-square-out"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                `;document.getElementById("tracklist-overlay").innerHTML=d}).catch(r=>{console.error(r),document.getElementById("tracklist-overlay").innerHTML=`
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
                                                                `})};if(s)o(s);else{const i=`${e.artist} - ${e.album}`;fetch(`${j}/discogs/search?q=${encodeURIComponent(i)}`).then(r=>r.json()).then(r=>{if(r.results&&r.results.length>0)o(r.results[0].id);else throw new Error("No results found in fallback search")}).catch(()=>{document.getElementById("tracklist-overlay").innerHTML=`
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
                    `})}},calculateModalFee(t,e){const s=parseFloat(t)||0,a=e-s,o=e>0?a/e*100:0,i=document.getElementById("modal-fee-display"),r=document.getElementById("modal-fee-value");if(a>0){i.classList.remove("hidden"),r.innerText=`- kr. ${a.toFixed(2)}`;const n=document.getElementById("modal-fee-percent");n&&(n.innerText=`${o.toFixed(1)}%`)}else i.classList.add("hidden")},async handleSaleValueUpdate(t,e,s){t.preventDefault();const o=new FormData(t.target).get("netReceived"),i=document.getElementById("update-sale-submit-btn");if(o){i.disabled=!0,i.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Guardando...';try{const r=j,n=await te.currentUser.getIdToken(),c=await fetch(`${r}/firebase/sales/${e}/value`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({netReceived:o})}),l=c.headers.get("content-type");if(!l||!l.includes("application/json")){const h=await c.text();throw console.error("Non-JSON response received:",h),new Error(`Server returned non-JSON response (${c.status})`)}const d=await c.json();if(d.success)this.showToast("✅ Venta actualizada y fee registrado"),document.getElementById("update-sale-modal").remove(),await this.loadData(),this.refreshCurrentView();else throw new Error(d.error||"Error al actualizar")}catch(r){console.error("Update sale error:",r),this.showToast(`❌ Error: ${r.message}`),i.disabled=!1,i.innerText="Confirmar Ajuste"}}},renderPickups(t){const e=this.state.sales.filter(r=>{var n;return r.channel==="online"&&(((n=r.shipping_method)==null?void 0:n.id)==="local_pickup"||r.shipping_cost===0&&r.status!=="failed")}),s=e.filter(r=>r.status==="completed"||r.status==="paid"||r.status==="paid_pending"),a=e.filter(r=>r.status==="ready_for_pickup"),o=e.filter(r=>r.status==="shipped"||r.status==="delivered"||r.status==="picked_up"),i=`
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
                                <p class="text-xl font-display font-bold">${a.length}</p>
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
                                `:s.map(r=>{var n,c;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${r.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${r.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${((n=r.customer)==null?void 0:n.name)||r.customerName||"Cliente"}</td>
                                        <td class="p-4 text-xs text-slate-500">${((c=r.items)==null?void 0:c.length)||0} items</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate(r.date)}</td>
                                        <td class="p-4 text-center" onclick="event.stopPropagation()">
                                            <button onclick="app.setReadyForPickup('${r.id}', event)" class="bg-brand-dark text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto">
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
                                ${a.length===0?`
                                    <tr>
                                        <td colspan="4" class="p-12 text-center text-slate-400 italic">No hay pedidos esperando retiro.</td>
                                    </tr>
                                `:a.map(r=>{var n,c;return`
                                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="app.openUnifiedOrderDetailModal('${r.id}')">
                                        <td class="p-4 text-sm font-bold text-brand-orange">#${r.id.slice(0,8)}</td>
                                        <td class="p-4 text-sm font-bold text-brand-dark">${((n=r.customer)==null?void 0:n.name)||r.customerName||"Cliente"}</td>
                                        <td class="p-4 text-xs text-slate-500 font-medium">${this.formatDate((c=r.updated_at)!=null&&c.toDate?r.updated_at.toDate():r.updated_at||r.date)}</td>
                                        <td class="p-4 text-center" onclick="event.stopPropagation()">
                                            <button onclick="app.markAsDelivered('${r.id}', event)" class="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto">
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
                                ${o.slice(0,10).map(r=>`
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
        `;t.innerHTML=i},async notifyCustomerUI(t,e,s){const a={preparing:"tu pedido está en preparación",label_created:"tu etiqueta fue creada",shipped:"tu paquete fue despachado",pickup_ready:"tu paquete está listo para recoger"},o=(this.state.sales||[]).find(n=>n.id===t);if(!(o?this.getCustomerInfo(o):{}).email){this.showToast("⚠️ Esta venta no tiene email del cliente","error");return}const r=s?s.innerHTML:"";try{s&&(s.disabled=!0,s.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Enviando...');const n=await le.notifyCustomer(t,e);o&&(o.notifications={...o.notifications||{},[e]:{status:"sent",sentAt:new Date().toISOString()}}),this.refreshCurrentView(),this.showToast(n&&n.alreadySent?"ℹ️ El cliente ya había sido avisado":`✅ Cliente notificado: ${a[e]||e}`)}catch(n){console.error("notifyCustomerUI:",n),this.showToast("Error al notificar: "+(n.message||n),"error"),s&&(s.disabled=!1,s.innerHTML=r)}},openDeleteShipmentModal(t){const e=(this.state.sales||[]).find(r=>r.id===t);if(!e){this.showToast("La ficha ya no existe","error");return}const s=this.getCustomerInfo(e),a=s.name&&s.name!=="Cliente"?s.name:s.email||"Cliente",o=this.shipDeleteStockWarning(e),i=`
        <div id="delete-shipment-modal" class="vf-overlay cx-dialog-wrap !z-[200]">
            <div class="cx-dialog cx-view">
                <div class="flex items-center gap-4 mb-4">
                    <div class="cx-sq !bg-[#F05A28] !text-white">
                        <i class="ph-bold ph-trash"></i>
                    </div>
                    <div>
                        <h3 class="cx-dialog-title">¿Eliminar ficha?</h3>
                        <p class="cx-sub !mt-1">No se puede deshacer.</p>
                    </div>
                </div>
                <div class="rounded-2xl bg-white/70 p-4 mb-4">
                    <p class="font-semibold mb-1">${F(a)}</p>
                    <p class="text-xs text-stone-500">Se va a eliminar la ficha de ${F(a)}.</p>
                </div>
                ${o.willReturn?`
                <div class="rounded-2xl bg-[#F2E14C] p-3 mb-4 flex items-start gap-2">
                    <i class="ph-bold ph-warning mt-0.5"></i>
                    <p class="text-xs">Se va a devolver <b>1 unidad</b> al stock de <b>${F(o.label)}</b>.</p>
                </div>`:""}
                <div class="flex gap-3">
                    <button onclick="document.getElementById('delete-shipment-modal').remove()" class="cx-btn flex-1 justify-center">Cancelar</button>
                    <button onclick="app.confirmDeleteShipment('${t}')" class="cx-btn is-danger flex-1 justify-center">Eliminar</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",i)},async confirmDeleteShipment(t){const e=document.getElementById("delete-shipment-modal");e&&e.remove();try{let s;try{s=await le.deleteSale(t)}catch(o){if(o&&o.status===404)s=await this.deleteShipmentDirect(t);else throw o}this.state.sales=(this.state.sales||[]).filter(o=>o.id!==t);const a=document.querySelector(`[data-sale-id="${t}"]`);a&&a.remove(),this.showToast(s&&s.stockReturned?"✅ Ficha eliminada — 1 unidad devuelta al stock":"✅ Ficha eliminada")}catch(s){console.error("confirmDeleteShipment:",s),this.showToast("Error al eliminar: "+(s.message||s),"error")}},async deleteShipmentDirect(t){const e=T.collection("sales").doc(t);let s=!1;return await T.runTransaction(async a=>{const o=await a.get(e);if(!o.exists)throw new Error("La ficha ya no existe.");const i=o.data(),r=i.linkedInventory;if(i.stockDecremented&&r&&r.productId){const n=T.collection("products").doc(r.productId),c=await a.get(n);if(c.exists){const l=c.data();a.update(n,{stock:firebase.firestore.FieldValue.increment(1)}),a.set(T.collection("inventory_logs").doc(),{type:"STOCK_RETURN",sku:l.sku||"Unknown",album:l.album||"Unknown",artist:l.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:`Ficha de envío eliminada (${i.orderNumber||t}) — stock devuelto`}),s=!0}}a.delete(e)}),{success:!0,stockReturned:s}},async setReadyForPickup(t,e){var s,a;try{const o=e||window.event,i=(s=o==null?void 0:o.target)==null?void 0:s.closest("button");if(i){i.disabled=!0;const c=i.innerHTML;i.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Notificando...'}const r=await fetch(`${j}/api/ready-for-pickup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t})}),n=await r.json();if(r.ok&&n.success){this.showToast("✅ Cliente notificado - El pedido está listo para retiro"),await this.loadData();const c=document.getElementById("unified-modal");c?(c.remove(),this.openUnifiedOrderDetailModal(t)):this.refreshCurrentView()}else throw new Error(n.error||n.message||"Error al notificar")}catch(o){console.error("Error in setReadyForPickup:",o),this.showToast("❌ Error: "+o.message,"error");const i=e||window.event,r=(a=i==null?void 0:i.target)==null?void 0:a.closest("button");r&&(r.disabled=!1,r.innerHTML='<i class="ph-bold ph-bell"></i> Notificar Listo')}},async markAsDelivered(t,e){var s;try{const a=e||window.event,o=(s=a==null?void 0:a.target)==null?void 0:s.closest("button");o&&(o.disabled=!0),await T.collection("sales").doc(t).update({status:"picked_up",fulfillment_status:"delivered",picked_up_at:firebase.firestore.FieldValue.serverTimestamp(),updated_at:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast("✅ Pedido retirado correctamente"),await this.loadData(),this.refreshCurrentView()}catch(a){this.showToast("❌ Error: "+a.message,"error")}},async deleteExpenseVAT(t){const e=this.state.expenses.find(s=>s.id===t);if(e!=null&&e.receiptUrl){if(!confirm(`⚠️ ATENCIÓN: Este gasto tiene un recibo adjunto.

¿Estás seguro de que quieres eliminarlo?`))return;if(!confirm(`🔒 CONFIRMACIÓN LEGAL REQUERIDA

La ley exige guardar documentos contables durante 5 AÑOS.

Fecha del gasto: `+(e.fecha_factura||e.date||"Desconocida")+`
Proveedor: `+(e.proveedor||"Sin nombre")+`
Monto: `+this.formatCurrency(e.monto_total||e.amount||0)+`

¿CONFIRMAS que deseas eliminar permanentemente este registro y su recibo?`)){this.showToast("ℹ️ Eliminación cancelada");return}}else if(!confirm("¿Estás seguro de que quieres eliminar este gasto?"))return;try{await T.collection("expenses").doc(t).delete(),this.showToast("✅ Gasto eliminado"),this.loadData()}catch(s){console.error("Error deleting expense:",s),this.showToast("❌ Error al eliminar gasto")}},renderVATReport(t){const e=new Date,s=Math.floor(e.getMonth()/3)+1,a=e.getFullYear(),o=this.state.vatReportQuarter!==void 0?this.state.vatReportQuarter:s,i=this.state.vatReportYear||a;let r,n;if(o===0)r=new Date(i,0,1),n=new Date(i,11,31,23,59,59);else{const w=(o-1)*3;r=new Date(i,w,1),n=new Date(i,w+3,0,23,59,59)}const c=this.state.sales.filter(w=>{var U;const D=(U=w.timestamp)!=null&&U.toDate?w.timestamp.toDate():new Date(w.timestamp||w.date);return D>=r&&D<=n});let l=[],d=[],h=[],u=0,p=0,b=0,y=0;c.forEach(w=>{var ae;const D=(ae=w.timestamp)!=null&&ae.toDate?w.timestamp.toDate():new Date(w.timestamp||w.date);(w.items||[]).forEach(q=>{const ce=q.priceAtSale||q.price||0;let re=q.costAtSale||q.cost||0;const X=q.productId||q.recordId,ee=q.album;let z=q.providerOrigin||q.provider_origin;if(re===0||!z){const O=this.state.inventory.find(K=>X&&(K.id===X||K.sku===X)||ee&&K.album===ee);O&&(re===0&&(re=O.cost||0),z||(z=O.provider_origin||"Local_Used"))}z||(z="Local_Used");const G=q.qty||q.quantity||1,Y=ce*G,oe=re*G;if(z==="EU_B2B"||z==="DK_B2B"){const O=Y*.2;u+=O,l.push({date:D,productId:q.productId||q.album||"N/A",album:q.album||"N/A",salePrice:Y,vat:O})}else{const O=Y-oe,K=O>0?O*.2:0;p+=K,d.push({date:D,productId:q.productId||q.album||"N/A",album:q.album||"N/A",cost:oe,salePrice:Y,margin:O,vat:K})}});const se=parseFloat(w.shipping_income||w.shipping||w.shipping_cost||0);if(se>0){const q=se*.2;b+=q,y+=se,h.push({date:D,orderId:w.orderNumber||(w.id&&typeof w.id=="string"?w.id.slice(-8):"N/A"),income:se,vat:q})}}),(this.state.extraIncome||[]).filter(w=>{const D=new Date(w.date);return D>=r&&D<=n}).forEach(w=>{const D=Number(w.amount)||0,U=Number(w.vatAmount)||0;u+=U,l.push({date:new Date(w.date),productId:"EXTRA",album:`💰 ${w.description||"Ingreso Extra"} (${w.category||"other"})`,salePrice:D,vat:U})});const E=u+p+b,$=this.state.expenses.filter(w=>{var se;const D=w.fecha_factura?new Date(w.fecha_factura):(se=w.timestamp)!=null&&se.toDate?w.timestamp.toDate():new Date(w.timestamp||w.date);return(w.categoria_tipo==="operativo"||w.categoria_tipo==="stock_nuevo"||w.is_vat_deductible)&&D>=r&&D<=n}),I=$.filter(w=>w.categoria!=="envios"),C=$.filter(w=>w.categoria==="envios"),m=I.reduce((w,D)=>w+(parseFloat(D.monto_iva)||0),0),g=C.reduce((w,D)=>w+(parseFloat(D.monto_iva)||0),0);C.reduce((w,D)=>w+(parseFloat(D.monto_total)||0),0);const f=(this.state.inventory||[]).filter(w=>{if(!w.item_phantom_vat||w.item_phantom_vat<=0||w.provider_origin!=="EU_B2B")return!1;const D=w.acquisition_date?new Date(w.acquisition_date):null;return D?D>=r&&D<=n:!1}),k=f.reduce((w,D)=>w+(D.item_phantom_vat||0),0),_=new Set((this.state.expenses||[]).filter(w=>w.vat_treatment==="dk"&&w.lotRef).map(w=>w.lotRef)),M=(this.state.inventory||[]).filter(w=>{if(!w.item_real_vat||w.item_real_vat<=0||w.provider_origin!=="DK_B2B"||w.lot&&_.has(w.lot))return!1;const D=w.acquisition_date?new Date(w.acquisition_date):null;return D?D>=r&&D<=n:!1}),A=M.reduce((w,D)=>w+(D.item_real_vat||0),0),B=E+k,W=m+g+k+A,P=B-W,H={0:`Resumen anual ${i}`,1:`1 de junio, ${i}`,2:`1 de septiembre, ${i}`,3:`1 de diciembre, ${i}`,4:`1 de marzo, ${i+1}`}[o],Z=o===0?"Anual":"Pendiente",Q=`
            <div class="cx-view">
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Reporte VAT",subtitle:"Moms del período según el régimen danés",primary:{label:"Exportar auditoría",icon:"ph-file-csv",onclick:"app.downloadVATAuditReport()"}})}

                <div class="flex flex-wrap items-center gap-2 mb-5">
                    <select id="vat-year-select" onchange="app.updateVATQuarter()" class="cx-pill-select !h-[54px] !rounded-[22px]" aria-label="Año">
                        ${[a,a-1,a-2].map(w=>`<option value="${w}" ${w===i?"selected":""}>${w}</option>`).join("")}
                    </select>
                    <select id="vat-quarter-select" onchange="app.updateVATQuarter()" class="cx-pill-select !h-[54px] !rounded-[22px]" aria-label="Trimestre">
                        <option value="0" ${o===0?"selected":""}>Todo el año</option>
                        <option value="1" ${o===1?"selected":""}>Q1, Ene a Mar</option>
                        <option value="2" ${o===2?"selected":""}>Q2, Abr a Jun</option>
                        <option value="3" ${o===3?"selected":""}>Q3, Jul a Sep</option>
                        <option value="4" ${o===4?"selected":""}>Q4, Oct a Dic</option>
                    </select>
                    <span class="cx-state ${o===0?"is-ok":"is-wait"} ml-1">${Z}</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                    <div class="cx-tile cx-dark !min-h-[150px]">
                        <span class="cx-tile-label">Moms tilsvar</span>
                        <b class="cx-tile-value !text-4xl ${P>0?"!text-[#FFB089]":"!text-[#A7E0B5]"}">${this.formatCurrency(P)}</b>
                        <span class="cx-tile-sub">${P>0?"A pagar":"A favor"}. Límite de pago: ${H}</span>
                    </div>
                    <div class="cx-tile cx-orange !min-h-[150px]">
                        <span class="cx-tile-label">Salgsmoms + Rubrik A</span>
                        <b class="cx-tile-value">${this.formatCurrency(B)}</b>
                        <span class="cx-tile-sub">Ventas y envíos ${this.formatCurrency(E)}${k>0?`, Rubrik A (EU) + ${this.formatCurrency(k)}`:""}</span>
                        <span class="cx-tile-dots" aria-hidden="true"></span>
                    </div>
                    <div class="cx-tile cx-yellow !min-h-[150px]">
                        <span class="cx-tile-label">Købsmoms</span>
                        <b class="cx-tile-value">${this.formatCurrency(W)}</b>
                        <span class="cx-tile-sub">IVA de gastos, envíos, stock DK y reverse charge UE</span>
                        <span class="cx-tile-stripes" aria-hidden="true"></span>
                    </div>
                </div>

                <!-- Breakdown Panels Section (Prompt 2) -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    
                    <!-- LEFT COLUMN: Origen del IVA (Ingresos) -->
                    <div class="space-y-6">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="cx-h">De dónde sale el IVA (salgsmoms)</h3>
                            
                        </div>

                        <!-- Income Breakdown Card -->
                        <div class="cx-panel !p-0 overflow-hidden">
                            <div class="p-6 space-y-6">
                                <!-- Standard Sales -->
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="font-semibold">Ventas Estándar (Nuevos)</p>
                                        <p class="text-xs text-stone-500">Monto: ${this.formatCurrency(l.reduce((w,D)=>w+D.salePrice,0))}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-lg font-bold text-[#1A1A1A]">${this.formatCurrency(u)}</p>
                                        <p class="text-xs text-stone-500">IVA (25%)</p>
                                    </div>
                                </div>
                                <div class="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                                    <div class="h-full bg-[#1A1A1A] rounded-full" style="width: ${E>0?u/E*100:0}%"></div>
                                </div>

                                <!-- Margin Scheme Sales -->
                                <div class="pt-4 border-t border-black/5">
                                    <div class="flex items-center justify-between mb-1">
                                        <div>
                                            <p class="font-semibold">Régimen Margen (Usados)</p>
                                            <p class="text-xs text-stone-500">Margen total: ${this.formatCurrency(d.reduce((w,D)=>w+D.margin,0))}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-[#1A1A1A]">${this.formatCurrency(p)}</p>
                                            <p class="text-xs text-stone-500">IVA s/Margen</p>
                                        </div>
                                    </div>
                                    ${d.some(w=>w.margin<0)?`
                                        <div class="flex items-center gap-1.5 text-red-500 text-[11px] font-bold bg-red-50 px-3 py-1.5 rounded-lg mt-2 border border-red-100/50">
                                            <i class="ph-bold ph-warning-circle"></i>
                                            Alerta: Se detectaron ventas con margen negativo.
                                        </div>
                                    `:""}
                                </div>

                                <!-- Shipping Revenue -->
                                <div class="pt-4 border-t border-black/5">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <p class="font-semibold">Ingresos por Envío</p>
                                            <p class="text-xs text-stone-500">Total cobrado: ${this.formatCurrency(y)}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-[#1A1A1A]">${this.formatCurrency(b)}</p>
                                            <p class="text-xs text-stone-500">IVA (25%)</p>
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
                                <h3 class="cx-h">Balance de envíos</h3>
                                
                            </div>
                            
                            <!-- Logistics P&L Panel -->
                            <div class="cx-dark !min-h-0 rounded-[28px] p-6">
                                <div class="flex justify-between items-center mb-6">
                                    <div class="space-y-1">
                                        <p class="text-stone-400 text-xs font-semibold">Balance Neto IVA</p>
                                        <p class="text-2xl font-display font-bold ${b-g>=0?"text-[#A7E0B5]":"text-[#FFB089]"}">
                                            ${this.formatCurrency(b-g)}
                                        </p>
                                    </div>
                                    <div class="cx-sq">
                                        <i class="ph-bold ph-scales"></i>
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex justify-between text-xs">
                                        <span class="text-stone-500">IVA Cobrado (Ingreso)</span>
                                        <span class="font-bold text-[#A7E0B5]">+ ${this.formatCurrency(b)}</span>
                                    </div>
                                    <div class="flex justify-between text-xs">
                                        <span class="text-stone-500">IVA Pagado (Gasto)</span>
                                        <span class="font-bold text-[#FFB089]">- ${this.formatCurrency(g)}</span>
                                    </div>
                                    <div class="pt-3 border-t border-white/10 text-[11px] text-stone-500 flex items-center gap-2">
                                        <i class="ph-bold ph-info"></i>
                                        Balance operativo de impuestos en logística.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div class="flex items-center gap-2 mb-4">
                                <h3 class="cx-h">Otros gastos (købsmoms)</h3>
                                
                            </div>

                            <!-- Categorized Deductions Panel -->
                            <div class="cx-panel !p-0 overflow-hidden divide-y divide-black/5">
                                ${Object.entries(I.reduce((w,D)=>{const U=D.categoria||"otros";return w[U]=(w[U]||0)+(parseFloat(D.monto_iva)||0),w},{})).sort((w,D)=>D[1]-w[1]).map(([w,D])=>`
                                    <div class="p-4 flex items-center justify-between hover:bg-white/50 transition-colors">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center">
                                                <i class="ph-bold ph-tag"></i>
                                            </div>
                                            <span class="font-semibold capitalize text-sm">${w.replace("_"," ")}</span>
                                        </div>
                                        <span class="font-semibold text-sm">${this.formatCurrency(D)}</span>
                                    </div>
                                `).join("")||`
                                    <div class="p-8 text-center text-stone-500 text-sm">No se registraron otros gastos deducibles.</div>
                                `}
                            </div>
                        </div>

                        ${k>0?`
                        <div>
                            <div class="flex items-center gap-2 mb-4">
                                <h3 class="cx-h">EU Reverse Charge (Rubrik A)</h3>
                                
                            </div>
                            <div class="cx-panel !p-0 overflow-hidden">
                                <div class="p-5 flex items-center justify-between border-b border-black/5">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-[#F2E14C] rounded-xl flex items-center justify-center text-[#1A1A1A] text-lg">
                                            <i class="ph-bold ph-arrows-left-right"></i>
                                        </div>
                                        <div>
                                            <p class="font-bold text-[#1A1A1A]">Moms af varekøb i udlandet</p>
                                            <p class="text-xs text-stone-500">${f.length} producto${f.length>1?"s":""} EU B2B · Efecto neto: 0</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xl font-bold text-[#1A1A1A]">${this.formatCurrency(k)}</p>
                                        <p class="text-[10px] text-stone-500 font-bold">± Ambos lados</p>
                                    </div>
                                </div>
                                <div class="px-5 py-2 bg-white/40 border-b border-black/5 flex gap-6 text-[10px] font-bold">
                                    <span class="text-red-500">▲ Liability: +${this.formatCurrency(k)}</span>
                                    <span class="text-[#1A1A1A]">▼ Købsmoms: -${this.formatCurrency(k)}</span>
                                    <span class="text-[#1A1A1A]">= Neto: ${this.formatCurrency(0)}</span>
                                </div>
                                <div class="divide-y divide-black/5 max-h-48 overflow-y-auto">
                                    ${f.map(w=>`
                                    <div class="px-5 py-3 flex items-center justify-between hover:bg-white/50 transition-colors">
                                        <div>
                                            <p class="text-xs font-bold text-[#1A1A1A]">${w.artist||""} — ${w.album||""}</p>
                                            <p class="text-[10px] text-stone-500">Costo: ${this.formatCurrency(w.cost||0)} · Factura: ${w.acquisition_date||"-"}</p>
                                        </div>
                                        <span class="text-xs font-bold text-[#1A1A1A]">${this.formatCurrency(w.item_phantom_vat)}</span>
                                    </div>
                                    `).join("")}
                                </div>
                            </div>
                        </div>
                        `:""}

                        ${A>0?`
                        <div>
                            <div class="flex items-center gap-2 mb-4">
                                <h3 class="cx-h">Stock DK B2B (Købsmoms)</h3>
                                
                            </div>
                            <div class="cx-panel !p-0 overflow-hidden">
                                <div class="p-5 flex items-center justify-between border-b border-black/5">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-[#F2E14C] rounded-xl flex items-center justify-center text-[#1A1A1A] text-lg">
                                            <i class="ph-bold ph-receipt"></i>
                                        </div>
                                        <div>
                                            <p class="font-bold text-[#1A1A1A]">IVA Facturas DK Deducible</p>
                                            <p class="text-xs text-stone-500">${M.length} producto${M.length>1?"s":""} DK B2B</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xl font-bold text-[#1A1A1A]">${this.formatCurrency(A)}</p>
                                        <p class="text-[10px] text-stone-500 font-bold">Deducción pura</p>
                                    </div>
                                </div>
                                <div class="divide-y divide-black/5 max-h-48 overflow-y-auto">
                                    ${M.map(w=>`
                                    <div class="px-5 py-3 flex items-center justify-between hover:bg-white/50 transition-colors">
                                        <div>
                                            <p class="text-xs font-bold text-[#1A1A1A]">${w.artist||""} — ${w.album||""}</p>
                                            <p class="text-[10px] text-stone-500">Costo: ${this.formatCurrency(w.cost||0)} · Factura: ${w.acquisition_date||"-"}</p>
                                        </div>
                                        <span class="text-xs font-bold text-[#1A1A1A]">${this.formatCurrency(w.item_real_vat)}</span>
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
                    <div class="cx-panel !p-0 overflow-hidden">
                        <div class="px-6 pt-6 pb-2 flex justify-between items-center">
                            <div>
                                <h3 class="font-semibold flex items-center gap-2">
                                    <span class="w-8 h-8 rounded-xl bg-[#F2E14C] flex items-center justify-center text-[#1A1A1A] text-sm">N</span>
                                    Discos nuevos (venta estándar)
                                </h3>
                                <p class="text-[11px] text-stone-500 mt-1">IVA 25% incluido en el precio total de venta</p>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="text-stone-500 text-xs font-semibold border-b border-black/5">
                                    <tr>
                                        <th class="px-6 py-4 text-left">Fecha</th>
                                        <th class="px-6 py-4 text-left">Producto</th>
                                        <th class="px-6 py-4 text-right">Venta</th>
                                        <th class="px-6 py-4 text-right">IVA (25%)</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-black/5">
                                    ${l.length>0?l.map(w=>`
                                        <tr class="hover:bg-white/50 transition-colors">
                                            <td class="px-6 py-4 text-stone-500 tabular-nums">${w.date.toLocaleDateString("es-DK")}</td>
                                            <td class="px-6 py-4 font-semibold">${w.album}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-stone-600">${this.formatCurrency(w.salePrice)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-[#1A1A1A]">${this.formatCurrency(w.vat)}</td>
                                        </tr>
                                    `).join(""):`
                                        <tr><td colspan="4" class="px-6 py-12 text-center text-stone-500">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="font-semibold border-t border-black/10">
                                    <tr class="text-brand-dark">
                                        <td colspan="3" class="px-6 py-4 text-right text-sm">Total IVA estándar</td>
                                        <td class="px-6 py-4 text-right text-lg text-[#1A1A1A]">${this.formatCurrency(u)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <!-- Table 2: Margin -->
                    <div class="cx-panel !p-0 overflow-hidden">
                        <div class="px-6 pt-6 pb-2 flex justify-between items-center">
                            <div>
                                <h3 class="font-semibold flex items-center gap-2">
                                    <span class="w-8 h-8 rounded-xl bg-[#F2955E] flex items-center justify-center text-[#1A1A1A] text-sm">M</span>
                                    Discos usados (Brugtmoms)
                                </h3>
                                <p class="text-[11px] text-stone-500 mt-1">IVA 25% calculado únicamente sobre el margen de beneficio</p>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="text-stone-500 text-xs font-semibold border-b border-black/5">
                                    <tr>
                                        <th class="px-6 py-4 text-left">Fecha</th>
                                        <th class="px-6 py-4 text-left">Producto</th>
                                        <th class="px-6 py-4 text-right">Costo</th>
                                        <th class="px-6 py-4 text-right">Venta</th>
                                        <th class="px-6 py-4 text-right">Margen</th>
                                        <th class="px-6 py-4 text-right">IVA s/Margen</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-black/5">
                                    ${d.length>0?d.map(w=>`
                                        <tr class="hover:bg-white/50 transition-colors">
                                            <td class="px-6 py-4 text-stone-500 tabular-nums">${w.date.toLocaleDateString("es-DK")}</td>
                                            <td class="px-6 py-4 font-semibold">${w.album}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-stone-500">${this.formatCurrency(w.cost)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-stone-600">${this.formatCurrency(w.salePrice)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums ${w.margin>0?"text-[#1A1A1A]":"text-red-500"}">${this.formatCurrency(w.margin)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-[#1A1A1A]">${this.formatCurrency(w.vat)}</td>
                                        </tr>
                                    `).join(""):`
                                        <tr><td colspan="6" class="px-6 py-12 text-center text-stone-500">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="font-semibold border-t border-black/10">
                                    <tr class="text-brand-dark">
                                        <td colspan="5" class="px-6 py-4 text-right text-sm">Total IVA sobre margen</td>
                                        <td class="px-6 py-4 text-right text-lg text-[#1A1A1A]">${this.formatCurrency(p)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <!-- Table 3: Shipping -->
                    <div class="cx-panel !p-0 overflow-hidden">
                        <div class="px-6 pt-6 pb-2 flex justify-between items-center">
                            <div>
                                <h3 class="font-semibold flex items-center gap-2">
                                    <span class="w-8 h-8 rounded-xl bg-[#F2E14C] flex items-center justify-center text-[#1A1A1A] text-sm">E</span>
                                    Envíos cobrados
                                </h3>
                                <p class="text-[11px] text-stone-500 mt-1">IVA Estándar 25% incluido en el cobro de transporte</p>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="text-stone-500 text-xs font-semibold border-b border-black/5">
                                    <tr>
                                        <th class="px-6 py-4 text-left">Fecha</th>
                                        <th class="px-6 py-4 text-left">Orden</th>
                                        <th class="px-6 py-4 text-right">Ingreso</th>
                                        <th class="px-6 py-4 text-right">IVA (25%)</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-black/5">
                                    ${h.length>0?h.map(w=>`
                                        <tr class="hover:bg-white/50 transition-colors">
                                            <td class="px-6 py-4 text-stone-500 tabular-nums">${w.date.toLocaleDateString("es-DK")}</td>
                                            <td class="px-6 py-4 font-semibold">#${w.orderId}</td>
                                            <td class="px-6 py-4 text-right tabular-nums text-stone-600">${this.formatCurrency(w.income)}</td>
                                            <td class="px-6 py-4 text-right tabular-nums font-bold text-[#1A1A1A]">${this.formatCurrency(w.vat)}</td>
                                        </tr>
                                    `).join(""):`
                                        <tr><td colspan="4" class="px-6 py-12 text-center text-stone-500">Sin movimientos</td></tr>
                                    `}
                                </tbody>
                                <tfoot class="font-semibold border-t border-black/10">
                                    <tr class="text-brand-dark">
                                        <td colspan="3" class="px-6 py-4 text-right text-sm">Total IVA de envíos</td>
                                        <td class="px-6 py-4 text-right text-lg text-[#1A1A1A]">${this.formatCurrency(b)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        `;t.innerHTML=Q},updateVATQuarter(){const t=parseInt(document.getElementById("vat-quarter-select").value),e=parseInt(document.getElementById("vat-year-select").value);this.state.vatReportQuarter=t,this.state.vatReportYear=e,this.renderVATReport(document.getElementById("app-content"))},downloadVATAuditReport(){const t=new Date,e=Math.floor(t.getMonth()/3)+1,s=t.getFullYear(),a=this.state.vatReportQuarter||e,o=this.state.vatReportYear||s,i=(a-1)*3,r=new Date(o,i,1),n=new Date(o,i+3,0,23,59,59),c=this.state.sales.filter(f=>{var _;const k=(_=f.timestamp)!=null&&_.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date);return k>=r&&k<=n}),l=[];let d=1;c.forEach(f=>{var W;const k=(W=f.timestamp)!=null&&W.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date),_=k.toISOString().slice(0,10).replace(/-/g,""),M=f.channel||"N/A";(f.items||[]).forEach(P=>{const V=P.priceAtSale||P.price||0;let H=P.costAtSale||P.cost||0;const Z=P.productId||P.recordId,Q=P.album;let w="Local_Used",D="N/A";const U=this.state.inventory.find(K=>Z&&(K.id===Z||K.sku===Z)||Q&&K.album===Q);U&&(H=H===0?U.cost||0:H,w=U.provider_origin||"Local_Used",U.acquisition_date&&(D=new Date(U.acquisition_date).toISOString().slice(0,10)));const se=P.qty||P.quantity||1,ae=P.providerOrigin||w,q=ae==="EU_B2B"||ae==="DK_B2B",ce=V*se,re=H*se;let X,ee,z;if(q)X=ce,ee=ce*.2,z="Standard Rate";else{const K=ce-re;X=K>0?K:0,ee=K>0?K*.2:0,z="Margin Scheme"}const G=U&&U.acquisition_date?new Date(U.acquisition_date):null,Y=G&&G>=r&&G<=n,oe=Y&&w==="EU_B2B"&&U.item_phantom_vat||0,O=Y?w==="DK_B2B"?U.item_real_vat||0:oe:0;l.push({transactionId:`ECR-${_}-${String(d).padStart(4,"0")}`,date:k.toISOString().slice(0,10),channel:M,productName:`${P.album||"N/A"} - ${P.artist||"N/A"}`,sku:P.sku||Z||"N/A",providerOrigin:w,acquisitionDate:D,condition,costPrice:re.toFixed(2),salesPrice:ce.toFixed(2),calculationBasis:X.toFixed(2),schemeApplied:z,outputVat:ee.toFixed(2),euPhantomVat:oe.toFixed(2),inputVat:O.toFixed(2)}),d++});const B=parseFloat(f.shipping_income||f.shipping||f.shipping_cost||0);B>0&&(l.push({transactionId:`ECR-SHIP-${_}-${String(d).padStart(4,"0")}`,date:k.toISOString().slice(0,10),channel:M,productName:`Envío Cobrado - Orden: ${f.orderNumber||"N/A"}`,sku:"SHIPPING",providerOrigin:"N/A",acquisitionDate:"N/A",condition:"Service",costPrice:"0.00",salesPrice:B.toFixed(2),calculationBasis:B.toFixed(2),schemeApplied:"Standard Rate",outputVat:(B*.2).toFixed(2),euPhantomVat:"0.00",inputVat:"0.00"}),d++)});const h=[];let u=1;this.state.expenses.filter(f=>{var M;const k=f.fecha_factura?new Date(f.fecha_factura):(M=f.timestamp)!=null&&M.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date);return(f.categoria_tipo==="operativo"||f.categoria_tipo==="stock_nuevo"||f.is_vat_deductible)&&k>=r&&k<=n}).forEach(f=>{var M;const k=f.fecha_factura?new Date(f.fecha_factura):(M=f.timestamp)!=null&&M.toDate?f.timestamp.toDate():new Date(f.timestamp||f.date),_=k.toISOString().slice(0,10).replace(/-/g,"");h.push({transactionId:`ECP-EXP-${_}-${String(u).padStart(4,"0")}`,invoiceDate:k.toISOString().slice(0,10),category:f.categoria==="envios"?"Shipping Expense":"Operational Expense",vendor:f.proveedor||f.nombre||"N/A",description:f.descripcion||f.categoria||"N/A",sku:"N/A",grossAmount:parseFloat(f.monto_total||0).toFixed(2),euPhantomVat:"0.00",inputVat:parseFloat(f.monto_iva||0).toFixed(2)}),u++}),(this.state.inventory||[]).filter(f=>{if(!(f.provider_origin==="EU_B2B"||f.provider_origin==="DK_B2B"))return!1;const _=f.acquisition_date?new Date(f.acquisition_date):null;return _?_>=r&&_<=n:!1}).forEach(f=>{const k=new Date(f.acquisition_date),_=k.toISOString().slice(0,10).replace(/-/g,""),M=parseFloat(f.cost||0),A=f.provider_origin==="EU_B2B"&&f.item_phantom_vat||0,B=f.provider_origin==="DK_B2B"?f.item_real_vat||0:A;h.push({transactionId:`ECP-INV-${_}-${String(u).padStart(4,"0")}`,invoiceDate:k.toISOString().slice(0,10),category:`Stock Import (${f.provider_origin})`,vendor:f.provider_origin,description:`${f.album||"N/A"} - ${f.artist||"N/A"}`,sku:f.sku||"N/A",grossAmount:M.toFixed(2),euPhantomVat:A.toFixed(2),inputVat:B.toFixed(2)}),u++});const y="\uFEFF",v=(f,k)=>[f.join(","),...k.map(_=>f.map(M=>{const A=Object.keys(_)[f.indexOf(M)];return`"${String(_[A]||"").replace(/"/g,'""')}"`}).join(","))].join(`
`),E=["Transaction ID","Transaction Date","Sales Channel","Product Name","SKU / Item ID","Provider Origin","Acquisition Date","Condition","Cost Price (DKK)","Sales Price (DKK)","Calculation Basis (DKK)","VAT Scheme Applied","Output VAT / Salgsmoms (DKK)","EU Phantom VAT / Rubrik A (DKK)","Input VAT / Købsmoms (DKK)"],$=["Transaction ID","Invoice Date","Category","Vendor / Origin","Description","SKU / Item ID","Gross Amount / Cost (DKK)","EU Phantom VAT / Rubrik A (DKK)","Input VAT / Købsmoms (DKK)"],I=v(E,l),C=v($,h),m=new Blob([y+I],{type:"text/csv;charset=utf-8;"}),g=document.createElement("a");g.href=URL.createObjectURL(m),g.download=`Sales_VAT_Ledger_Q${a}_${o}.csv`,g.style.display="none",document.body.appendChild(g),g.click(),setTimeout(()=>{const f=new Blob([y+C],{type:"text/csv;charset=utf-8;"}),k=document.createElement("a");k.href=URL.createObjectURL(f),k.download=`Purchases_VAT_Ledger_Q${a}_${o}.csv`,k.style.display="none",document.body.appendChild(k),k.click(),document.body.removeChild(g),document.body.removeChild(k),URL.revokeObjectURL(g.href),URL.revokeObjectURL(k.href)},300),this.showToast(`✅ Exported ${l.length} sales & ${h.length} purchase records.`)},renderInvestments(t){const e=["Alejo","Facundo","Rafael"],s=this.state.investments||[],a=e.reduce((n,c)=>(n[c]=s.filter(l=>l.partner===c).reduce((l,d)=>l+(parseFloat(d.amount)||0),0),n),{}),o=Object.values(a).reduce((n,c)=>n+c,0),i=["cx-yellow","cx-orange","cx-frost"],r=`
            <div class="cx-view">
            <div class="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-6">
                ${this.sectionHeader({title:"Inversiones",subtitle:"Lo que puso cada socio en el negocio",primary:{label:"Nueva inversión",icon:"ph-plus",onclick:"app.openAddInvestmentModal()"}})}

                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                    ${e.map((n,c)=>`
                        <div class="cx-tile ${i[c%i.length]}">
                            <span class="cx-tile-label">${n}</span>
                            <b class="cx-tile-value">${this.formatCurrency(a[n])}</b>
                            <span class="cx-tile-sub">${s.filter(l=>l.partner===n).length} aportes${o>0?`, ${Math.round(a[n]/o*100)}% del total`:""}</span>
                        </div>
                    `).join("")}
                    <div class="cx-tile cx-dark">
                        <span class="cx-tile-label">Total invertido</span>
                        <b class="cx-tile-value">${this.formatCurrency(o)}</b>
                        <span class="cx-tile-sub">${s.length} aportes</span>
                    </div>
                </div>

                <div class="space-y-4">
                ${e.map(n=>{const c=s.filter(l=>l.partner===n).sort((l,d)=>new Date(d.date)-new Date(l.date));return`
                    <section class="cx-panel !p-0 overflow-hidden">
                        <div class="flex justify-between items-center px-5 pt-5 pb-3">
                            <h3 class="cx-h flex items-center gap-3">
                                <span class="cx-sq !w-9 !h-9 !text-sm !rounded-xl font-bold">${n.charAt(0)}</span>
                                ${n}
                            </h3>
                            <span class="text-xl font-light tracking-tight">${this.formatCurrency(a[n])}</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="cx-inv-table w-full text-left">
                                <thead>
                                    <tr><th>Fecha</th><th>Descripción</th><th>Gasto vinculado</th><th class="text-right">Monto</th><th></th></tr>
                                </thead>
                                <tbody>
                                    ${c.length===0?`
                                        <tr><td colspan="5" class="!py-8 text-center text-sm text-stone-500">Todavía no hay aportes de ${n}.</td></tr>
                                    `:c.map(l=>{const d=l.expenseId?(this.state.expenses||[]).find(h=>h.id===l.expenseId):null;return`
                                        <tr class="inv-row group">
                                            <td class="text-xs text-stone-500 whitespace-nowrap">${this.formatDate(l.date)}</td>
                                            <td class="text-sm font-semibold">${l.description}</td>
                                            <td>${this.investmentExpenseBadge(l,d)}</td>
                                            <td class="text-sm font-semibold text-right whitespace-nowrap">${this.formatCurrency(l.amount)}</td>
                                            <td>
                                                <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <button onclick="app.openEditInvestmentModal('${l.id}')" class="cx-row-btn" title="Editar" aria-label="Editar"><i class="ph ph-pencil-simple"></i></button>
                                                    <button onclick="app.deleteInvestment('${l.id}')" class="cx-row-btn is-danger" title="Eliminar" aria-label="Eliminar"><i class="ph ph-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>`}).join("")}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    `}).join("")}
                </div>
            </div>
            </div>
        `;t.innerHTML=r},investmentExpenseBadge(t,e){if(!t.expenseId)return'<span class="text-stone-400 text-xs">—</span>';if(!e)return'<span class="cx-state is-done whitespace-nowrap">Gasto no encontrado</span>';const s=e.proveedor||e.supplier||"Gasto",a=this.formatCurrency(e.monto_total||0),o=e.receiptUrl||e.comprobante||"",i=(e.descripcion||"").slice(0,40);return`
            <div class="flex items-center gap-1.5">
                <button onclick="app.goToExpense('${e.id}')" class="cx-channel hover:!bg-[#F2E14C]" title="${i?i+", ":""}ir al gasto">
                    ${s} · ${a}
                </button>
                ${o?`<a href="${o}" target="_blank" rel="noopener" class="cx-row-btn !w-7 !h-7" title="Abrir comprobante" aria-label="Abrir comprobante"><i class="ph ph-paperclip"></i></a>`:""}
            </div>`},goToExpense(t){const e=(this.state.expenses||[]).find(s=>s.id===t);if(e){const s=new Date((e.fecha_factura||e.date||"")+"T00:00:00");isNaN(s)||(this.state.expenseFilterYear=s.getFullYear(),this.state.expenseFilterMonths=[0,1,2,3,4,5,6,7,8,9,10,11])}this.state.expensesSearch="",this.state.expenseCategoryFilter="all",this.state.expenseMissingReceiptOnly=!1,this.state.expenseIdHighlight=t,this.navigate("expenses"),setTimeout(()=>{const s=document.getElementById("expense-"+t);s&&s.scrollIntoView({behavior:"smooth",block:"center"})},250)},openAddInvestmentModal(){this.openInvestmentModal(null)},openEditInvestmentModal(t){this.openInvestmentModal(t)},openInvestmentModal(t){const e=["Alejo","Facundo","Rafael"],s=new Date().toISOString().split("T")[0],a=t?(this.state.investments||[]).find(l=>l.id===t):null,o=!!a,i=l=>String(l??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),n=(this.state.expenses||[]).slice().sort((l,d)=>new Date(d.fecha_factura||d.date||0)-new Date(l.fecha_factura||l.date||0)).map(l=>{const d=l.proveedor||l.supplier||"Sin proveedor",h=l.fecha_factura||l.date||"",u=(l.descripcion||"").slice(0,35),p=a&&a.expenseId===l.id?"selected":"";return`<option value="${l.id}" ${p}>${i(h)} · ${i(d)} · ${i(u)} · ${this.formatCurrency(l.monto_total||0)}</option>`}).join(""),c=`
            <div id="add-investment-modal" class="vf-overlay" onclick="if(event.target === this) this.remove()">
                <aside class="vf-panel cx-view" role="dialog" aria-modal="true" aria-labelledby="invm-title">
                    <header class="vf-head">
                        <div>
                            <h3 id="invm-title" class="vf-title">${o?"Editar inversión":"Nueva inversión"}</h3>
                            <p class="cx-sub !mt-1">${o?"Cambiá el aporte del socio":"Registrá un aporte de un socio"}</p>
                        </div>
                        <button type="button" onclick="document.getElementById('add-investment-modal').remove()" class="cx-btn is-icon" aria-label="Cerrar"><i class="ph ph-x"></i></button>
                    </header>
                    <form onsubmit="app.saveInvestment(event)" class="vf-form">
                        <div class="vf-body">
                            <input type="hidden" name="investmentId" value="${a?a.id:""}">
                            <section class="vf-card space-y-3">
                                <div class="vf-field"><span>Socio</span>
                                    <div class="vf-segs is-wide">
                                        ${e.map((l,d)=>`<label class="vf-seg"><input type="radio" name="partner" value="${l}" required ${(a?a.partner===l:d===0)?"checked":""}><span>${l}</span></label>`).join("")}
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <label class="vf-field"><span>Monto (kr)</span>
                                        <input type="number" name="amount" required step="0.01" min="0" placeholder="1000" value="${a?i(a.amount):""}" class="vf-input is-strong"></label>
                                    <label class="vf-field"><span>Fecha</span>
                                        <input type="date" name="date" required value="${a?i(a.date):s}" class="vf-input"></label>
                                </div>
                                <label class="vf-field"><span>Descripción</span>
                                    <input type="text" name="description" required placeholder="Compra de vinilos, alquiler del local..." value="${a?i(a.description):""}" class="vf-input"></label>
                            </section>
                            <section class="vf-card">
                                <label class="vf-field"><span>Gasto vinculado <em>(opcional)</em></span>
                                    <select name="expenseId" class="vf-input">
                                        <option value="">Sin vincular</option>
                                        ${n}
                                    </select></label>
                                <p class="text-xs text-stone-500 mt-2">Une el aporte con la compra de Registro Compras y su factura.</p>
                            </section>
                        </div>
                        <footer class="vf-foot">
                            <button type="button" onclick="document.getElementById('add-investment-modal').remove()" class="cx-btn">Cancelar</button>
                            <button type="submit" class="cx-btn is-primary"><i class="ph-bold ${o?"ph-check":"ph-plus"}"></i> ${o?"Guardar cambios":"Guardar inversión"}</button>
                        </footer>
                    </form>
                </aside>
            </div>
        `;document.body.insertAdjacentHTML("beforeend",c)},async saveInvestment(t){t.preventDefault();const e=t.target,s=e.investmentId&&e.investmentId.value?e.investmentId.value:null,a={partner:e.partner.value,amount:parseFloat(e.amount.value),description:e.description.value,date:e.date.value,expenseId:e.expenseId.value||null};try{s?(await T.collection("investments").doc(s).update(a),document.getElementById("add-investment-modal").remove(),this.showToast("✅ Inversión actualizada")):(a.created_at=firebase.firestore.FieldValue.serverTimestamp(),await T.collection("investments").add(a),document.getElementById("add-investment-modal").remove(),this.showToast("✅ Inversión registrada")),await this.loadInvestments(),this.refreshCurrentView()}catch(o){this.showToast("❌ Error: "+o.message,"error")}},async deleteInvestment(t){if(confirm("¿Eliminar esta inversión?"))try{await T.collection("investments").doc(t).delete(),this.showToast("🗑️ Inversión eliminada"),await this.loadInvestments(),this.refreshCurrentView()}catch(e){this.showToast("❌ Error: "+e.message,"error")}},async loadInvestments(){const t=await T.collection("investments").get();this.state.investments=t.docs.map(e=>({id:e.id,...e.data()}))},isPickupOrder(t){var e;return((e=t.shipping_method)==null?void 0:e.id)==="local_pickup"||t.shipping_method&&typeof t.shipping_method=="string"&&t.shipping_method.toLowerCase().includes("pickup")||t.shippingMethod&&t.shippingMethod.toLowerCase().includes("pickup")||Number(t.shipping)===0||Number(t.shipping_cost)===0||Number(t.shipping_income)===0},getShippingIssues(t){var a;const e=[],s=this.getCustomerInfo(t);if(!this.isPickupOrder(t)&&!s.hasAddress&&e.push("Falta dirección de envío"),!s.email&&!s.phone&&e.push("Sin datos de contacto"),(a=t.linkedInventory)!=null&&a.productId&&!t.stockDecremented){const o=(this.state.inventory||[]).find(i=>i.id===t.linkedInventory.productId);o&&(Number(o.stock)||0)<1&&e.push("Sin stock del disco vinculado")}return e},shipKanbanColumn(t){const e=(t.fulfillment_status||"").toLowerCase(),s=["shipped","picked_up","delivered","fulfilled","canceled"];return!s.includes(e)&&this.getShippingIssues(t).length>0?"excepcion":["preparing","ready_for_pickup","in_transit","label_created"].includes(e)?"etiqueta":s.includes(e)?"despachado":"preparar"},shipNotifyState(t,e){const s=t&&t.notifications&&t.notifications[e];return s&&s.status==="sent"?"sent":"idle"},shipDeleteStockWarning(t){const e=t&&t.linkedInventory,s=!!(t&&t.stockDecremented&&e&&e.productId);return{willReturn:s,label:s?`${e.artist||"Sin artista"} — ${e.album||"Sin título"}`:""}},renderShipCard(t){const e=this.getCustomerInfo(t),s=this.shipKanbanColumn(t),a=(t.fulfillment_status||"").toLowerCase(),o=this.isPickupOrder(t),i=this.getShippingIssues(t),r=t.items||[],n=e.name&&e.name!=="Cliente"?e.name:e.email||"Cliente",c=r[0]?r[0].album||r[0].title||r[0].name||"Item":"",l=r[0]?this.resolveItemCover(r[0]):null,d=e.hasAddress||e.phone||e.email?`
            <div class="mt-3">
                <div class="text-xs font-semibold text-stone-500 mb-1.5">Destinatario</div>
                <div class="space-y-1">
                    ${e.hasAddress?`
                    <div class="flex items-start gap-2">
                        <i class="ph ph-map-pin text-stone-400 text-sm mt-0.5 shrink-0"></i>
                        <span class="text-xs text-stone-700 leading-snug">${e.address}</span>
                    </div>`:""}
                    ${e.phone?`<div class="flex items-center gap-2 text-xs text-stone-700"><i class="ph ph-phone text-stone-400"></i><a href="tel:${e.phone}" class="hover:underline">${e.phone}</a></div>`:""}
                    ${e.email?`<div class="flex items-center gap-2 text-xs text-stone-700 truncate"><i class="ph ph-envelope-simple text-stone-400"></i><span class="truncate" title="${e.email}">${e.email}</span></div>`:""}
                </div>
            </div>`:"",h=v=>this.shipNotifyState(t,v)==="sent"?`
            <button disabled class="cx-kbtn is-done">
                <i class="ph-bold ph-check-circle"></i>Cliente avisado
            </button>`:`
            <button onclick="event.stopPropagation();app.notifyCustomerUI('${t.id}', '${v}', this)" class="cx-kbtn">
                <i class="ph ph-bell-ringing"></i>Avisar al cliente
            </button>`;let u="";s==="preparar"?u=`<button onclick="app.updateFulfillmentStatus(event, '${t.id}', 'preparing')" class="cx-kbtn is-ink"><i class="ph-bold ph-package"></i>Iniciar preparación</button>`+h("preparing"):s==="etiqueta"?o&&a==="ready_for_pickup"?u=`<button onclick="app.markPickedUpDiscogs('${t.id}')" class="cx-kbtn is-ink"><i class="ph-bold ph-check-circle"></i>Confirmar recogida</button>`:o?u=`<button onclick="app.setReadyForPickup('${t.id}', event)" class="cx-kbtn is-ink"><i class="ph-bold ph-bell-ringing"></i>Marcar listo para retiro</button>`:a==="label_created"?u=`<button onclick="app.updateFulfillmentStatus(event, '${t.id}', 'shipped')" class="cx-kbtn is-yellow"><i class="ph-bold ph-paper-plane-tilt"></i>Marcar despachado</button>`+h("label_created"):a==="in_transit"?u=`<button onclick="app.updateFulfillmentStatus(event, '${t.id}', 'shipped')" class="cx-kbtn is-yellow"><i class="ph-bold ph-paper-plane-tilt"></i>Marcar despachado</button>`+h("shipped"):u=`<button onclick="app.openLabelModal('${t.id}')" class="cx-kbtn is-ink"><i class="ph-bold ph-tag"></i>Generar etiqueta</button>`+h("preparing"):s==="despachado"&&a==="shipped"?u=h("shipped"):s==="excepcion"&&(u=`<button onclick="app.openUnifiedOrderDetailModal('${t.id}')" class="cx-kbtn is-hot"><i class="ph-bold ph-warning-circle"></i>Resolver problema</button>`);const p=t.linkedInventory,b=this.normalizeSaleChannel(t)==="manual",y=p?`
            <div class="mt-2 flex items-center justify-between gap-2 bg-[#F2E14C]/50 rounded-xl px-2.5 py-1.5">
                <span class="min-w-0 text-[11px] font-semibold truncate" title="${F(p.artist||"")} — ${F(p.album||"")}"><i class="ph-bold ph-disc"></i> ${F(p.artist||"Sin artista")} — ${F(p.album||"Sin título")}</span>
                ${b?`<button onclick="event.stopPropagation();app.unlinkInventory('${t.id}')" class="text-stone-600 hover:text-black shrink-0" title="Desvincular disco"><i class="ph-bold ph-x"></i></button>`:""}
            </div>`:b?`
            <button onclick="event.stopPropagation();app.openLinkInventoryModal('${t.id}')" class="mt-2 text-xs font-semibold text-stone-500 hover:text-black transition-colors flex items-center gap-1"><i class="ph ph-link"></i>Vincular disco del inventario</button>`:"";return`
        <div data-sale-id="${t.id}" class="cx-kcard">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    ${this.saleChannelBadge(t)}
                    <span class="text-xs font-semibold text-stone-500 truncate">#${t.orderNumber||t.id.slice(0,6)}</span>
                </div>
                <span class="text-[11px] text-stone-500 font-medium whitespace-nowrap">${this.formatDate(t.date)}</span>
            </div>
            <div class="mt-2 text-base font-semibold truncate" title="${n}">${n}</div>
            <div class="mt-2 flex items-center gap-2 text-xs text-stone-600">
                ${l?`<img src="${l}" class="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm" alt="">`:'<span class="cx-cover !w-10 !h-10 !text-base"><i class="ph ph-vinyl-record"></i></span>'}
                <span>${r.length} ${r.length===1?"disco":"discos"}</span>
                ${c?`<span class="truncate text-stone-500">· ${c}${r.length>1?` +${r.length-1}`:""}</span>`:""}
            </div>
            ${y}
            <div class="mt-1.5">
                <span class="cx-state ${o?"is-ok":"is-wait"} gap-1">
                    <i class="ph-bold ${o?"ph-storefront":"ph-truck"}"></i>${o?"Retiro en tienda":"Envío"}
                </span>
            </div>
            ${d}
            ${a==="label_created"&&t.tracking_number?`
            <div class="mt-2 flex items-center gap-2 bg-black/5 rounded-xl px-2.5 py-1.5">
                <i class="ph ph-barcode"></i>
                <span class="text-[11px] font-mono font-semibold truncate">${t.tracking_number}</span>
                ${t.label_carrier?`<span class="text-[11px] font-semibold text-stone-500 ml-auto shrink-0">${t.label_carrier}</span>`:""}
            </div>`:""}
            ${!o&&s!=="despachado"?this.ecPreflightBlock(t):""}
            ${o&&s!=="despachado"?`<div data-quote-section="${t.id}"></div>`:""}
            ${i.length>0?`<div class="mt-3 flex flex-wrap gap-1.5">${i.map(v=>`<span class="cx-state is-hot gap-1"><i class="ph-bold ph-warning"></i>${v}</span>`).join("")}</div>`:""}
            ${u}
            <div class="mt-3 flex items-center justify-between gap-3">
                <button onclick="app.openUnifiedOrderDetailModal('${t.id}')" class="text-xs font-semibold text-stone-600 hover:text-black underline-offset-2 hover:underline">Ver detalle</button>
                <button onclick="event.stopPropagation();app.openDeleteShipmentModal('${t.id}')" class="text-xs font-semibold text-stone-400 hover:text-red-700 flex items-center gap-1"><i class="ph ph-trash"></i>Eliminar</button>
            </div>
        </div>`},async shipOrderFromKanban(t,e){try{const s=await this.decrementLinkedStock(t);if(!s.ok){this.showToast("⚠️ "+s.message,"error");return}const a=document.getElementById(e),o=a?a.value.trim():"",i=(this.state.sales||[]).find(n=>n.id===t),r=i?this.normalizeSaleChannel(i):"";o&&r==="discogs"?(await le.notifyShipped(t,o,null),this.showToast("Cliente notificado con el tracking")):o&&await T.collection("sales").doc(t).update({tracking_number:o}),await T.collection("sales").doc(t).update({fulfillment_status:"shipped"}),this.showToast("Pedido marcado como despachado"),await this.loadData(),this.refreshCurrentView()}catch(s){console.error("shipOrderFromKanban:",s),this.showToast("Error al despachar: "+s.message,"error")}},exportShippingList(){const t=this.state.sales.filter(i=>this.isShippableChannel(i)),e=i=>`"${String(i??"").replace(/"/g,'""')}"`,s=[["Orden","Fecha","Canal","Cliente","Email","Teléfono","Dirección","Items","Total","Estado"].join(";")];t.forEach(i=>{const r=this.getCustomerInfo(i);s.push([i.orderNumber||i.id.slice(0,8),i.date||"",this.normalizeSaleChannel(i),r.name,r.email,r.phone,r.address,(i.items||[]).length,i.total||0,i.fulfillment_status||"pendiente"].map(e).join(";"))});const a=new Blob(["\uFEFF"+s.join(`
`)],{type:"text/csv;charset=utf-8"}),o=document.createElement("a");o.href=URL.createObjectURL(a),o.download=`envios-${new Date().toISOString().split("T")[0]}.csv`,o.click(),this.showToast("Lista de envíos exportada")},ecShipUI(t){return this._shipUI=this._shipUI||{},this._shipUI[t]||(this._shipUI[t]={}),this._shipUI[t]},ecBuildShipmentInput(t,e={}){const s=t.customer||{},a=s.shipping||{};let o=a.line1||"",i=a.line2||"",r=a.postal_code||a.zip||"",n=a.city||"",c=a.country||"";if(!o&&!n&&!r){const l=String(t.address||s.address||"").split(",").map(d=>d.trim()).filter(Boolean);if(l[0]&&(o=l[0]),l[1]){const d=l[1].split(/\s+/);r=d[0]||"",n=d.slice(1).join(" ")}l[2]&&(c=l[2])}return{receiver:{name:String(t.customerName||s.name||"").trim(),address1:[o,i].filter(Boolean).join(", "),zipcode:String(r).trim(),city:String(n).trim(),country_code:String(c).trim().toUpperCase(),email:String(t.customerEmail||s.email||"").trim(),phone:String(s.phone||t.customerPhone||t.phone||"").trim()},parcel:{weight:Number.isInteger(e.weight)?e.weight:Number.isInteger(t.parcel_weight)?t.parcel_weight:500,weightConfirmed:e.weightConfirmed===!0||t.weight_confirmed===!0},shippingMethod:e.shippingMethod||t.shipping_method||"home",service_point:e.servicePointId?{id:e.servicePointId}:t.service_point&&t.service_point.id?{id:t.service_point.id}:void 0,customs:e.customs||void 0}},ecShipmentBlockers(t){const e=(this.state.sales||[]).find(s=>s.id===t);return e?_e(this.ecBuildShipmentInput(e,this.ecShipUI(t))):[]},ecReadinessAlerts(t){const e=this.ecShipmentBlockers(t);return e.length?e.map(s=>{const a=s.field.startsWith("customs")?"customs":s.field,o=Fe[a]||"Falta dato",i=s.message.replace(/"/g,"&quot;");return`<button onclick="app.openQuickFixModal('${t}', '${a}')" title="${i}"
                class="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full cursor-pointer hover:bg-red-100 transition-colors">
                <i class="ph-bold ph-warning-circle"></i>${o}</button>`}).join(""):'<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full"><i class="ph-bold ph-check-circle"></i>Listo para etiqueta</span>'},ecPreflightBlock(t){const e=this.ecShipUI(t.id),s=this.ecBuildShipmentInput(t,e),a=_e(s);a.length;const o=Le.has(s.shippingMethod),i=s.receiver.country_code,r=i&&!Re.has(i);a.length&&a[0].message.replace(/"/g,"&quot;");const n=!!e.weightConfirmed;return`
        <div class="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3" onclick="event.stopPropagation()">
            <div class="flex flex-wrap gap-1.5 mb-3">${this.ecReadinessAlerts(t.id)}</div>
            <div class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Paquete</div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Peso (g)</label>
                    <div class="flex gap-1 mt-1">
                        <input type="number" min="1" step="1" value="${s.parcel.weight}"
                            onchange="app.ecOnWeightChange('${t.id}', this.value)" onclick="event.stopPropagation()"
                            class="w-full text-xs font-bold border ${n?"border-emerald-300 bg-emerald-50/50":"border-slate-200 bg-white"} rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange">
                        <button onclick="app.ecConfirmWeight('${t.id}')" title="Confirmar peso"
                            class="shrink-0 w-8 rounded-lg text-sm font-black transition-colors ${n?"bg-emerald-100 text-emerald-700":"bg-slate-200 text-slate-500 hover:bg-slate-300"}">
                            <i class="ph-bold ${n?"ph-check":"ph-question"}"></i>
                        </button>
                    </div>
                </div>
                <div>
                    <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Método</label>
                    <select onchange="app.ecSetShippingMethod('${t.id}', this.value)" onclick="event.stopPropagation()"
                        class="mt-1 w-full text-xs font-bold border border-slate-200 bg-white rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange">
                        <option value="home" ${s.shippingMethod==="home"?"selected":""}>Envío a domicilio</option>
                        <option value="shop" ${o?"selected":""}>Retiro en punto de servicio</option>
                    </select>
                </div>
            </div>
            ${o?this.ecServicePointBlockHTML(t.id,e,s):""}
            ${r?`
            <div class="mt-2 flex items-center justify-between gap-2 rounded-lg ${e.customs?"bg-emerald-50 border border-emerald-200":"bg-amber-50 border border-amber-200"} px-2.5 py-2">
                <span class="text-[10px] font-extrabold uppercase tracking-wider ${e.customs?"text-emerald-700":"text-amber-700"}">
                    <i class="ph-bold ${e.customs?"ph-check-circle":"ph-warning"}"></i>
                    ${e.customs?`Aduana lista (${e.customs.length} ítems)`:`Fuera de la UE (${i}): falta aduana`}
                </span>
                ${e.customs?"":`<button onclick="app.openQuickFixModal('${t.id}', 'customs')" class="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 underline hover:text-amber-900">Completar</button>`}
            </div>`:""}
            <div data-quote-section="${t.id}"></div>
        </div>`},ecOnWeightChange(t,e){const s=this.ecShipUI(t),a=parseInt(e,10);s.weight=Number.isInteger(a)?a:500,s.weightConfirmed=!1,this.ecInvalidateQuote(t),this.refreshCurrentView()},ecConfirmWeight(t){const e=this.ecShipUI(t),s=Number.isInteger(e.weight)?e.weight:500;if(!Number.isInteger(s)||s<=0){this.showToast("⚠️ El peso debe ser un entero mayor a 0");return}e.weight=s,e.weightConfirmed=!0,this.showToast("✅ Peso confirmado: "+s+" g"),this.refreshCurrentView()},ecSetShippingMethod(t,e){const s=this.ecShipUI(t);s.shippingMethod=e,Le.has(e)||(delete s.servicePointId,delete s.spSelected),s.spSearchStatus="idle",s.spPoints=[],s.spManual=!1,this.ecInvalidateQuote(t),this.refreshCurrentView()},ecSetServicePoint(t,e){const s=this.ecShipUI(t);s.servicePointId=String(e||"").trim(),delete s.spSelected,this.refreshCurrentView()},ecSpCarrier(t,e){return Ge(e)||String(t.spCarrier||"").toLowerCase()},ecSetSpCarrier(t,e){const s=this.ecShipUI(t);s.spCarrier=String(e||"").toLowerCase(),s.spSearchStatus="idle",s.spPoints=[],this.refreshCurrentView()},async ecSearchServicePoints(t){const e=(this.state.sales||[]).find(n=>n.id===t);if(!e)return;const s=this.ecShipUI(t),a=this.ecBuildShipmentInput(e,s),o=this.ecSpCarrier(s,a.shippingMethod),i=String(a.receiver.country_code||"").trim().toUpperCase(),r=String(a.receiver.zipcode||"").trim();if(!o||!i||!r){this.showToast("⚠️ Para buscar puntos completá transportista, país y código postal");return}s.spSearchStatus="loading",s.spPoints=[],this.refreshCurrentView();try{const n=new URLSearchParams({country_code:i,zipcode:r,carrier:o,limit:"5"}),c=await fetch(`${j}/api/shipmondo/service-points?${n.toString()}`);if(!c.ok)throw new Error(`HTTP ${c.status}`);const l=await c.json();s.spPoints=(l.servicePoints||[]).slice(0,5),s.spSearchStatus="ready",s.spPoints.length||this.showToast("ℹ️ No se encontraron puntos cercanos — podés ingresar el ID manual")}catch(n){console.error("ecSearchServicePoints:",n),s.spSearchStatus="error",s.spPoints=[],this.showToast("⚠️ No se pudo buscar puntos — podés ingresar el ID manual","error")}this.refreshCurrentView()},ecPickServicePoint(t,e){const s=this.ecShipUI(t),a=(s.spPoints||[]).find(o=>String(o.id)===String(e));a&&(s.servicePointId=String(a.id),s.spSelected={id:String(a.id),name:a.name||"",address1:a.address1||"",city:a.city||""},s.spSearchStatus="idle",s.spPoints=[],s.spManual=!1,this.refreshCurrentView())},ecClearServicePoint(t){const e=this.ecShipUI(t),s=e.servicePointId;delete e.servicePointId,delete e.spSelected,e.spSearchStatus="idle",e.spPoints=[],e.spManual=!1;const a=this.ecQuoteUI(t);a&&String(a.selectedPointId)===String(s)&&(a.selectedPointId=null),this.refreshCurrentView()},ecToggleSpManual(t){const e=this.ecShipUI(t);e.spManual=!e.spManual,this.refreshCurrentView()},ecServicePointBlockHTML(t,e,s){const a=String(t).replace(/"/g,"&quot;");if(e.servicePointId){const h=e.spSelected||{},u=h.name||"Punto "+e.servicePointId,p=[h.address1,h.city].filter(Boolean).join(", ");return`
            <div class="mt-2">
                <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Punto de retiro</label>
                <div class="mt-1 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2" onclick="event.stopPropagation()">
                    <i class="ph-bold ph-check-circle text-emerald-600 shrink-0"></i>
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-brand-dark truncate">${F(u)}</p>
                        <p class="text-[10px] text-slate-500 truncate">${p?F(p)+" · ":""}<span class="font-mono">ID ${F(String(e.servicePointId))}</span></p>
                    </div>
                    <button onclick="app.ecClearServicePoint('${a}')" class="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-brand-orange underline">Cambiar</button>
                </div>
            </div>`}const o=Ge(s.shippingMethod),i=o||String(e.spCarrier||"").toLowerCase(),r=String(s.receiver.country_code||"").trim(),n=String(s.receiver.zipcode||"").trim(),c=!!(i&&r&&n),l=e.spSearchStatus||"idle",d=e.spManual||l==="error"||l==="ready"&&!(e.spPoints||[]).length;return(We.find(h=>h[0]===i)||[])[1],`
        <div class="mt-2">
            <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Punto de retiro</label>
            <div class="mt-1 flex gap-2" onclick="event.stopPropagation()">
                ${o?"":`
                <select onchange="app.ecSetSpCarrier('${a}', this.value)"
                    class="shrink-0 text-xs font-bold border border-slate-200 bg-white rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange max-w-[130px]">
                    <option value="">Transportista</option>
                    ${We.map(h=>`<option value="${h[0]}" ${i===h[0]?"selected":""}>${h[1]}</option>`).join("")}
                </select>`}
                <button onclick="app.ecSearchServicePoints('${a}')" ${c&&l!=="loading"?"":"disabled"}
                    class="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${c&&l!=="loading"?"bg-brand-dark text-white hover:bg-black":"bg-slate-100 text-slate-400 cursor-not-allowed"}">
                    <i class="ph-bold ${l==="loading"?"ph-circle-notch ph-spin":"ph-magnifying-glass"}"></i>${l==="loading"?"Buscando…":"Buscar puntos cercanos"}
                </button>
            </div>
            ${c?"":`<p class="text-[10px] text-slate-400 mt-1">Para buscar puntos completá ${o?"":"transportista, "}país y código postal del destinatario.</p>`}
            ${l==="ready"&&(e.spPoints||[]).length?`
            <span class="sp-list" role="radiogroup" aria-label="Punto de retiro" onclick="event.stopPropagation()">
                ${(e.spPoints||[]).map(h=>`
                <label class="sp-item">
                    <input type="radio" name="pf-sp-${a}" value="${F(String(h.id))}" class="sr-only"
                        onchange="app.ecPickServicePoint('${a}', this.value)" />
                    <span class="sp-radio" aria-hidden="true"></span>
                    <span class="sp-name">${F(h.name||"Punto de retiro")}</span>
                    <span class="sp-addr">${F([h.address1,h.zipcode,h.city].filter(Boolean).join(", "))}</span>
                    <span class="sp-dist">${h.distanceKm!=null?F(String(h.distanceKm))+" km":""}</span>
                </label>`).join("")}
            </span>`:""}
            ${d?`
            <input type="text" value="" placeholder="ID manual (Ej. 9743)"
                onchange="app.ecSetServicePoint('${a}', this.value)" onclick="event.stopPropagation()"
                class="mt-2 w-full text-xs font-bold border border-slate-200 bg-white rounded-lg px-2 py-1.5 outline-none focus:border-brand-orange font-mono">
            ${l==="error"||l==="ready"&&!(e.spPoints||[]).length?'<p class="text-[10px] text-slate-400 mt-1">No se encontraron puntos — ingresá el ID manual.</p>':""}
            <button onclick="app.ecToggleSpManual('${a}')" class="mt-1.5 text-[10px] font-bold text-slate-400 hover:text-brand-orange underline">← volver a buscar puntos</button>`:`
            <button onclick="app.ecToggleSpManual('${a}')" class="mt-1.5 text-[10px] font-bold text-slate-400 hover:text-brand-orange underline">o ingresar el ID manual</button>`}
        </div>`},ecQuickFixConfig(t){return{"receiver.name":{label:"Nombre del destinatario",placeholder:"Piotr Zaleś",type:"text"},"receiver.email":{label:"Email",placeholder:"cliente@mail.com",type:"email"},"receiver.phone":{label:"Teléfono",placeholder:"+45 31 22 33 44",type:"tel"},"receiver.address1":{label:"Dirección",placeholder:"Kartuska 104/1",type:"text"},"receiver.zipcode":{label:"Código postal",placeholder:"80-111",type:"text"},"receiver.city":{label:"Ciudad",placeholder:"Gdańsk",type:"text"},"receiver.country_code":{label:"País (ISO alpha-2)",placeholder:"PL",type:"text",maxlength:2,upper:!0},"parcel.weight":{label:"Peso (gramos)",placeholder:"500",type:"number"},"service_point.id":{label:"ID del punto de servicio",placeholder:"Ej. 9743",type:"text",note:"Si no conocés el ID, en la tarjeta del envío podés buscar el punto con el selector."},shippingMethod:{label:"Método de envío",type:"select",options:[["home","Envío a domicilio"],["shop","Retiro en punto de servicio"]]}}[t]||null},ecQuickFixCurrentValue(t,e){const s=this.ecShipUI(t.id);if(e==="parcel.weight")return s.weight??500;if(e==="service_point.id")return s.servicePointId||"";if(e==="shippingMethod")return this.ecBuildShipmentInput(t,s).shippingMethod;const a=e.split(".");let o=this.ecBuildShipmentInput(t,s);for(const i of a)o=o==null?void 0:o[i];return o??""},openQuickFixModal(t,e){if(e==="customs"){this.openCustomsFixModal(t);return}const s=this.ecQuickFixConfig(e);if(!s)return;const a=(this.state.sales||[]).find(c=>c.id===t);if(!a)return;const o=this.ecQuickFixCurrentValue(a,e),i=Fe[e]||"Completar dato";let r;s.type==="select"?r=`<select id="qf-input" class="vf-input">
                ${s.options.map(([c,l])=>`<option value="${c}" ${String(o)===c?"selected":""}>${l}</option>`).join("")}
            </select>`:r=`<input id="qf-input" type="${s.type}" value="${String(o).replace(/"/g,"&quot;")}"
                placeholder="${s.placeholder||""}" ${s.maxlength?`maxlength="${s.maxlength}"`:""}
                class="vf-input">`;const n=`
        <div id="qf-modal-overlay" class="vf-overlay cx-dialog-wrap" onclick="if(event.target.id==='qf-modal-overlay')app.closeQuickFixModal()">
            <div class="cx-dialog cx-view !max-w-sm" onclick="event.stopPropagation()">
                <h3 class="cx-dialog-title">Completar dato</h3>
                <p class="cx-sub !mt-1 mb-5">Pedido <b>#${a.orderNumber||a.id.slice(0,6)}</b> · ${i} · se valida al guardar</p>
                <label class="vf-mini-label block mb-1.5">${s.label}</label>
                ${r}
                ${s.note?`<p class="text-[11px] text-slate-400 mt-2">${s.note}</p>`:""}
                <p id="qf-error" class="hidden text-xs text-red-600 font-semibold mt-2"></p>
                <div class="flex justify-end gap-2 mt-5">
                    <button onclick="app.closeQuickFixModal()" class="cx-btn">Cancelar</button>
                    <button onclick="app.saveQuickFix('${t}', '${e}')" class="cx-btn is-primary">Guardar</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",n),setTimeout(()=>{var c;return(c=document.getElementById("qf-input"))==null?void 0:c.focus()},50)},closeQuickFixModal(){var t,e;(t=document.getElementById("qf-modal-overlay"))==null||t.remove(),(e=document.getElementById("qf-customs-overlay"))==null||e.remove()},ecQuickFixUpdates(t,e,s){const a={};switch(e){case"receiver.name":a["customer.name"]=s,t.customerName!==void 0&&(a.customerName=s);break;case"receiver.email":a["customer.email"]=s,t.customerEmail!==void 0&&(a.customerEmail=s);break;case"receiver.phone":a["customer.phone"]=s,t.customerPhone!==void 0&&(a.customerPhone=s),t.phone!==void 0&&(a.phone=s);break;case"receiver.address1":a["customer.shipping.line1"]=s;break;case"receiver.zipcode":a["customer.shipping.postal_code"]=s;break;case"receiver.city":a["customer.shipping.city"]=s;break;case"receiver.country_code":a["customer.shipping.country"]=s.toUpperCase();break}return a},ecQuickFixApplyMemory(t,e,s){t.customer=t.customer||{};const a={"receiver.name":"name","receiver.email":"email","receiver.phone":"phone"},o={"receiver.address1":"line1","receiver.zipcode":"postal_code","receiver.city":"city","receiver.country_code":"country"};a[e]&&(t.customer[a[e]]=s,e==="receiver.name"&&t.customerName!==void 0&&(t.customerName=s),e==="receiver.email"&&t.customerEmail!==void 0&&(t.customerEmail=s),e==="receiver.phone"&&(t.customerPhone!==void 0&&(t.customerPhone=s),t.phone!==void 0&&(t.phone=s))),o[e]&&(t.customer.shipping=t.customer.shipping||{},t.customer.shipping[o[e]]=s)},async saveQuickFix(t,e){const s=this.ecQuickFixConfig(e);if(!s)return;let a=document.getElementById("qf-input").value;s.upper&&(a=a.trim().toUpperCase());const o=(this.state.sales||[]).find(l=>l.id===t);if(!o)return;const i=this.ecShipUI(t),r=document.getElementById("qf-error"),n=this.ecBuildShipmentInput(o,{...i});if(e==="parcel.weight")n.parcel.weight=parseInt(a,10),n.parcel.weightConfirmed=!0;else if(e==="service_point.id")n.service_point={id:a.trim()};else if(e==="shippingMethod")n.shippingMethod=a;else{const l=e.split(".");let d=n;for(let h=0;h<l.length-1;h++)d=d[l[h]];d[l[l.length-1]]=a.trim()}const c=_e(n).filter(l=>l.field===e||l.field.startsWith(e+"."));if(c.length){r.textContent=c[0].message,r.classList.remove("hidden");return}try{e==="parcel.weight"?(i.weight=parseInt(a,10),i.weightConfirmed=!0,this.ecInvalidateQuote(t)):e==="service_point.id"?i.servicePointId=a.trim():e==="shippingMethod"?(i.shippingMethod=a,Le.has(a)||delete i.servicePointId):(await T.collection("sales").doc(t).update(this.ecQuickFixUpdates(o,e,a.trim())),this.ecQuickFixApplyMemory(o,e,a.trim()),(e==="receiver.zipcode"||e==="receiver.city"||e==="receiver.country_code")&&this.ecInvalidateQuote(t)),this.closeQuickFixModal(),this.showToast("✅ Dato guardado"),this.refreshCurrentView()}catch(l){console.error("saveQuickFix:",l),r.textContent="⚠️ Error al guardar: "+l.message,r.classList.remove("hidden")}},msCountryOptions(){const t=["GB","US","NO","CH","CA","AU","JP","AR","BR","CL","MX","UY"];return[...new Set([...Re,...t])].sort().map(s=>`<option value="${s}" ${s==="DK"?"selected":""}>${s}</option>`).join("")},openManualShipmentModal(){var a;(a=document.getElementById("ms-modal-overlay"))==null||a.remove(),this._msLinkedItem=null;const t="vf-input",e=(o,i,r="")=>`<label class="vf-field ${r}"><span>${o}</span>${i}</label>`,s=`
        <div id="ms-modal-overlay" class="vf-overlay" onclick="if(event.target.id==='ms-modal-overlay')app.closeManualShipmentModal()">
            <aside class="vf-panel cx-view" role="dialog" aria-modal="true" aria-labelledby="ms-title" onclick="event.stopPropagation()">
                <header class="vf-head">
                    <div>
                        <h3 id="ms-title" class="vf-title">Crear envío</h3>
                        <p class="cx-sub !mt-1">Para pedidos que no vienen de Discogs ni del Web shop. Entra directo a Preparar.</p>
                    </div>
                    <button onclick="app.closeManualShipmentModal()" class="cx-btn is-icon" aria-label="Cerrar"><i class="ph ph-x"></i></button>
                </header>
                <div class="vf-body">
                    <div id="ms-errors" class="hidden flex flex-wrap gap-1.5"></div>

                    <section class="vf-card">
                        <h4 class="vf-h">Destinatario</h4>
                        <div class="grid grid-cols-2 gap-3">
                            ${e("Nombre",`<input id="ms-name" type="text" oninput="app.msRevalidate()" class="${t}" placeholder="Nombre y apellido">`,"col-span-2")}
                            ${e("Dirección",`<input id="ms-address" type="text" oninput="app.msRevalidate()" class="${t}" placeholder="Calle y número, piso/puerta">`,"col-span-2")}
                            ${e("Código postal",`<input id="ms-zip" type="text" oninput="app.msRevalidate()" class="${t}" placeholder="1050">`)}
                            ${e("Ciudad",`<input id="ms-city" type="text" oninput="app.msRevalidate()" class="${t}" placeholder="København K">`)}
                            ${e("País",`<select id="ms-country" onchange="app.msRevalidate()" class="${t} cursor-pointer">${this.msCountryOptions()}</select>`)}
                            ${e("Teléfono",`<input id="ms-phone" type="tel" oninput="app.msRevalidate()" class="${t}" placeholder="+45 12 34 56 78">`)}
                            ${e("Email",`<input id="ms-email" type="email" oninput="app.msRevalidate()" class="${t}" placeholder="cliente@mail.com">`,"col-span-2")}
                        </div>
                        <p class="text-xs text-stone-500 mt-3">Todos los campos son obligatorios.</p>
                    </section>

                    <section class="vf-card">
                        <h4 class="vf-h">Contenido</h4>
                        ${e("Qué se envía",`<textarea id="ms-desc" rows="2" oninput="app.msRevalidate()" class="${t} !h-auto py-2.5 resize-none" placeholder="Ej: 2 vinilos, artista / título"></textarea>`)}
                        <div class="vf-field mt-3"><span>Disco del inventario (opcional)</span>
                            <div class="relative">
                                <div id="ms-linked-chip"></div>
                                <input id="ms-inv-search" type="text" oninput="app.msInvSearch(this.value)" class="${t}" placeholder="Buscar por artista, título o SKU" autocomplete="off">
                                <div id="ms-inv-results" class="hidden absolute z-20 left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg max-h-56 overflow-y-auto custom-scrollbar"></div>
                            </div>
                        </div>
                        <p class="text-xs text-stone-500 mt-2">Al despachar, se descuenta 1 del stock de este disco.</p>
                    </section>

                    <section class="vf-card">
                        <h4 class="vf-h">Paquete y método</h4>
                        <div class="grid grid-cols-2 gap-3">
                            ${e("Peso (g)",`<input id="ms-weight" type="number" min="1" step="1" value="500" oninput="app.msRevalidate()" class="${t}">`)}
                            <div class="flex items-end pb-2"><label class="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                                <input id="ms-weight-ok" type="checkbox" onchange="app.msRevalidate()" class="w-4 h-4 accent-black">Peso confirmado</label></div>
                            ${e("Método de envío",`<input id="ms-method" type="text" oninput="app.msRevalidate()" class="${t}" placeholder="home (opcional)">`)}
                            ${e("ID punto de retiro",`<input id="ms-servicepoint" type="text" oninput="app.msRevalidate()" class="${t}" placeholder="Solo shop delivery">`)}
                        </div>
                        <p class="text-xs text-stone-500 mt-3">Se valida con las mismas reglas del Pre-Flight. El punto de retiro y la aduana (fuera de la UE) se pueden completar después desde la tarjeta del envío.</p>
                    </section>
                </div>
                <footer class="vf-foot">
                    <button onclick="app.closeManualShipmentModal()" class="cx-btn">Cancelar</button>
                    <button id="ms-save-btn" onclick="app.saveManualShipment()" class="cx-btn is-primary"><i class="ph-bold ph-plus"></i>Crear envío</button>
                </footer>
            </aside>
        </div>`;document.body.insertAdjacentHTML("beforeend",s),setTimeout(()=>{var o;return(o=document.getElementById("ms-name"))==null?void 0:o.focus()},50)},closeManualShipmentModal(){var t;(t=document.getElementById("ms-modal-overlay"))==null||t.remove(),this._msLinkedItem=null},msBuildShipmentInput(){var a;const t=o=>{var i;return(((i=document.getElementById(o))==null?void 0:i.value)||"").trim()},e=parseInt(t("ms-weight"),10),s=t("ms-servicepoint");return{receiver:{name:t("ms-name"),address1:t("ms-address"),zipcode:t("ms-zip"),city:t("ms-city"),country_code:t("ms-country").toUpperCase(),email:t("ms-email"),phone:t("ms-phone")},parcel:{weight:Number.isInteger(e)?e:NaN,weightConfirmed:((a=document.getElementById("ms-weight-ok"))==null?void 0:a.checked)===!0},shippingMethod:t("ms-method")||"home",service_point:s?{id:s}:void 0,customs:void 0}},msValidate(){const t=this.msBuildShipmentInput(),e=_e(t),s=t.parcel.weight,a=o=>o.field==="service_point.id"||o.field.startsWith("customs")||o.field==="parcel.weight"&&s===500&&!t.parcel.weightConfirmed;return{input:t,hard:e.filter(o=>!a(o)),soft:e.filter(a)}},msRenderBlockers(){const{input:t,hard:e,soft:s}=this.msValidate(),a=document.getElementById("ms-errors");if(!a)return{input:t,hard:e,soft:s};const o=(r,n)=>{const c=r.field.startsWith("customs")?"customs":r.field,l=Fe[c]||"Falta dato",d=n?"is-wait":"is-hot",h=n?"ph-warning":"ph-warning-circle";return`<span title="${r.message.replace(/"/g,"&quot;")}" class="cx-state ${d} gap-1"><i class="ph-bold ${h}"></i>${l}</span>`},i=[...e.map(r=>o(r,!1)),...s.map(r=>o(r,!0))];return a.innerHTML=i.join(""),a.classList.toggle("hidden",i.length===0),{input:t,hard:e,soft:s}},msRevalidate(){const t=document.getElementById("ms-errors");t&&!t.classList.contains("hidden")&&this.msRenderBlockers()},invSearchResultsHTML(t,e){if(t=(t||"").trim().toLowerCase(),t.length<2)return"";const s=(this.state.inventory||[]).filter(a=>`${a.artist||""} ${a.album||""} ${a.sku||""}`.toLowerCase().includes(t)).slice(0,8);return s.length?s.map(a=>`
            <button type="button" onclick="${e.split("{ID}").join(a.id)}"
                class="w-full text-left px-3 py-2.5 hover:bg-[#F2E14C]/40 flex items-center justify-between gap-2 border-b border-black/5 last:border-0">
                <span class="min-w-0">
                    <span class="block text-xs font-bold text-brand-dark truncate">${F(a.artist||"Sin artista")} — ${F(a.album||"Sin título")}</span>
                    <span class="block text-[10px] text-slate-400 font-mono">${F(a.sku||"")}</span>
                </span>
                <span class="cx-stock ${Number(a.stock)>0?"":"is-out"} shrink-0">Stock ${Number(a.stock)||0}</span>
            </button>`).join(""):'<div class="px-3 py-2.5 text-xs text-slate-400 font-semibold">Sin resultados</div>'},msInvSearch(t){const e=document.getElementById("ms-inv-results");if(!e)return;const s=this.invSearchResultsHTML(t,"app.msSelectLinkedItem('{ID}')");e.innerHTML=s,e.classList.toggle("hidden",!s)},msSelectLinkedItem(t){const e=(this.state.inventory||[]).find(o=>o.id===t);if(!e)return;this._msLinkedItem={productId:e.id,artist:e.artist||"",album:e.album||"",sku:e.sku||""};const s=document.getElementById("ms-inv-search");s&&(s.value="");const a=document.getElementById("ms-inv-results");a&&(a.classList.add("hidden"),a.innerHTML=""),this.msRenderLinkedChip()},msClearLinkedItem(){this._msLinkedItem=null,this.msRenderLinkedChip()},msRenderLinkedChip(){const t=document.getElementById("ms-linked-chip");if(!t)return;const e=this._msLinkedItem;t.innerHTML=e?`
            <div class="flex items-center justify-between gap-2 bg-[#F2E14C]/60 rounded-2xl px-3 py-2 mb-2">
                <span class="min-w-0 text-xs font-semibold truncate" title="${F(e.artist)} — ${F(e.album)}"><i class="ph-bold ph-disc"></i> ${F(e.artist||"Sin artista")} — ${F(e.album||"Sin título")} <span class="font-mono font-medium text-stone-600">${F(e.sku)}</span></span>
                <button type="button" onclick="app.msClearLinkedItem()" class="text-stone-600 hover:text-black shrink-0" title="Quitar vínculo"><i class="ph-bold ph-x"></i></button>
            </div>`:""},openLinkInventoryModal(t){var s;(s=document.getElementById("li-modal-overlay"))==null||s.remove();const e=`
        <div id="li-modal-overlay" class="vf-overlay cx-dialog-wrap" onclick="if(event.target.id==='li-modal-overlay')app.closeLinkInventoryModal()">
            <div class="cx-dialog cx-view" onclick="event.stopPropagation()">
                <h3 class="cx-dialog-title">Vincular disco del inventario</h3>
                <p class="cx-sub !mt-1 mb-5">Al despachar el envío, el stock de este disco se descuenta en 1.</p>
                <div class="relative">
                    <input id="li-inv-search" type="text" oninput="app.liInvSearch('${t}', this.value)"
                        class="vf-input"
                        placeholder="Buscar por artista, título o SKU…" autocomplete="off">
                    <div id="li-inv-results" class="hidden absolute z-20 left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg max-h-56 overflow-y-auto custom-scrollbar"></div>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button onclick="app.closeLinkInventoryModal()" class="cx-btn">Cancelar</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",e),setTimeout(()=>{var a;return(a=document.getElementById("li-inv-search"))==null?void 0:a.focus()},50)},closeLinkInventoryModal(){var t;(t=document.getElementById("li-modal-overlay"))==null||t.remove()},liInvSearch(t,e){const s=document.getElementById("li-inv-results");if(!s)return;const a=this.invSearchResultsHTML(e,`app.liSelectItem('${t}', '{ID}')`);s.innerHTML=a,s.classList.toggle("hidden",!a)},async liSelectItem(t,e){const s=(this.state.inventory||[]).find(r=>r.id===e);if(!s)return;const a=(this.state.sales||[]).find(r=>r.id===t),o=((a==null?void 0:a.fulfillment_status)||"").toLowerCase(),i=["shipped","picked_up","delivered","fulfilled","canceled"].includes(o);try{await T.collection("sales").doc(t).update({linkedInventory:{productId:s.id,artist:s.artist||"",album:s.album||"",sku:s.sku||""},stockDecremented:!!i}),this.closeLinkInventoryModal(),this.showToast(i?"Disco vinculado (sin descontar: el envío ya estaba despachado)":"✅ Disco vinculado al envío"),await this.loadData(),this.refreshCurrentView()}catch(r){console.error("liSelectItem:",r),this.showToast("Error al vincular: "+r.message,"error")}},async unlinkInventory(t){const e=(this.state.sales||[]).find(a=>a.id===t),s=!!(e!=null&&e.stockDecremented);try{await T.collection("sales").doc(t).update({linkedInventory:null}),this.showToast(s?"Vínculo eliminado (el stock ya descontado no se restaura)":"Vínculo eliminado"),await this.loadData(),this.refreshCurrentView()}catch(a){console.error("unlinkInventory:",a),this.showToast("Error al desvincular: "+a.message,"error")}},async decrementLinkedStock(t){const e=T.collection("sales").doc(t);try{return await T.runTransaction(async s=>{const a=await s.get(e);if(!a.exists)throw new Error("La venta ya no existe.");const o=a.data(),i=o.linkedInventory;if(!i||!i.productId||o.stockDecremented)return;const r=T.collection("products").doc(i.productId),n=await s.get(r);if(!n.exists){const d=[i.artist,i.album].filter(Boolean).join(" — ")||"vinculado";throw new Error(`El disco ${d} ya no existe en el inventario. Desvincúlalo o elige otro antes de despachar.`)}const c=n.data(),l=Number(c.stock)||0;if(l<1){const d=[c.artist,c.album].filter(Boolean).join(" — ")||"Sin título";throw new Error(`Sin stock para ${d} (stock: ${l}). No se despachó ni se movió el stock.`)}s.update(r,{stock:firebase.firestore.FieldValue.increment(-1)}),s.update(e,{stockDecremented:!0}),s.set(T.collection("inventory_logs").doc(),{type:"SHIPPED",sku:c.sku||"Unknown",album:c.album||"Unknown",artist:c.artist||"Unknown",timestamp:firebase.firestore.FieldValue.serverTimestamp(),details:`Envío manual despachado (${o.orderNumber||t})`})}),{ok:!0}}catch(s){return console.error("decrementLinkedStock:",s),{ok:!1,message:s.message}}},async saveManualShipment(){var l,d,h,u,p;const t=document.getElementById("ms-save-btn"),{input:e,hard:s}=this.msRenderBlockers();if(s.length){(d=(l=document.getElementById("ms-modal-overlay"))==null?void 0:l.querySelector(".max-w-lg"))==null||d.scrollTo({top:0,behavior:"smooth"}),(u=(h=document.getElementById("ms-name"))!=null&&h.value?document.querySelector("#ms-modal-overlay input"):document.getElementById("ms-name"))==null||u.focus();return}const a=e.receiver,o=(((p=document.getElementById("ms-desc"))==null?void 0:p.value)||"").trim()||"Envío manual",i=e.shippingMethod||"home",r=new Date,n=`${a.address1}, ${a.zipcode} ${a.city}, ${a.country_code}`,c={channel:"manual",source:"ADMIN",orderNumber:"MAN-"+r.getTime().toString(36).toUpperCase(),customerName:a.name,customerEmail:a.email,customer:{name:a.name,email:a.email,phone:a.phone,address:n,shipping:{line1:a.address1,line2:"",postal_code:a.zipcode,city:a.city,country:a.country_code}},address:n,items:[{title:o,album:o,name:o,quantity:1,unitPrice:0}],total:0,total_amount:0,status:"pending",fulfillment_status:"pending",paymentMethod:"N/A",shipping_method:i,service_point:e.service_point||null,parcel_weight:e.parcel.weight,weight_confirmed:e.parcel.weightConfirmed,linkedInventory:this._msLinkedItem||null,stockDecremented:!1,date:r.toISOString().split("T")[0],timestamp:firebase.firestore.FieldValue.serverTimestamp(),note:"Envío manual creado desde Envíos"};try{t&&(t.disabled=!0,t.innerHTML='<i class="ph ph-circle-notch animate-spin"></i> Creando...'),await T.collection("sales").add(c),this.closeManualShipmentModal(),this.showToast("✅ Envío manual creado en PREPARAR"),this.loadData()}catch(b){console.error("saveManualShipment:",b),t&&(t.disabled=!1,t.innerHTML='<i class="ph-bold ph-plus"></i>Crear envío'),this.showToast("⚠️ Error al crear el envío: "+b.message)}},openCustomsFixModal(t){const e=(this.state.sales||[]).find(r=>r.id===t);if(!e)return;const a=(e.items||[]).map(r=>{const n=r.album||r.title||r.name||"Vinilo",c=r.artist?` — ${r.artist}`:"",l=r.qty||r.quantity||1,d=Number(r.priceAtSale||r.price||0);return{description:`Vinyl record: ${n}${c}`.slice(0,120),value:Math.round(d*l*100)/100,currency:"DKK"}}),o=a.map((r,n)=>`
            <div class="grid grid-cols-[1fr_90px_70px] gap-2 items-center">
                <input id="qc-desc-${n}" type="text" value="${r.description.replace(/"/g,"&quot;")}" class="vf-input !h-10 !text-xs">
                <input id="qc-val-${n}" type="number" min="0" step="0.01" value="${r.value}" class="vf-input !h-10 !text-xs">
                <input id="qc-cur-${n}" type="text" value="${r.currency}" maxlength="3" class="vf-input !h-10 !text-xs uppercase">
            </div>`).join(""),i=`
        <div id="qf-customs-overlay" class="vf-overlay cx-dialog-wrap" onclick="if(event.target.id==='qf-customs-overlay')app.closeQuickFixModal()">
            <div class="cx-dialog cx-view" onclick="event.stopPropagation()">
                <h3 class="cx-dialog-title">Declaración de aduana</h3>
                <p class="cx-sub !mt-1 mb-5">Pedido <b>#${e.orderNumber||e.id.slice(0,6)}</b> · destino fuera de la UE · revisá y confirmá</p>
                <div class="grid grid-cols-[1fr_90px_70px] gap-2 mb-1.5 vf-mini-label">
                    <span>Descripción</span><span>Valor</span><span>Moneda</span>
                </div>
                <div class="space-y-2 max-h-64 overflow-y-auto">${o||'<p class="text-xs text-slate-400">Sin ítems en el pedido.</p>'}</div>
                <p id="qf-error" class="hidden text-xs text-red-600 font-semibold mt-2"></p>
                <div class="flex justify-end gap-2 mt-5">
                    <button onclick="app.closeQuickFixModal()" class="cx-btn">Cancelar</button>
                    <button onclick="app.saveCustomsFix('${t}', ${a.length})" class="cx-btn is-primary">Confirmar aduana</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",i)},saveCustomsFix(t,e){const s=[];for(let c=0;c<e;c++)s.push({description:document.getElementById(`qc-desc-${c}`).value.trim(),value:Number(document.getElementById(`qc-val-${c}`).value),currency:document.getElementById(`qc-cur-${c}`).value.trim().toUpperCase()});const a=this.ecShipUI(t),o=(this.state.sales||[]).find(c=>c.id===t),i=this.ecBuildShipmentInput(o,{...a,customs:s}),r=_e(i).filter(c=>c.field.startsWith("customs")),n=document.getElementById("qf-error");if(r.length){n.textContent=r[0].message,n.classList.remove("hidden");return}a.customs=s,this.closeQuickFixModal(),this.showToast("✅ Aduana confirmada"),this.refreshCurrentView()},ecGenerateLabel(t){return this.openLabelModal(t)},ecCopyPayload(){const t=document.getElementById("ec-payload-pre"),e=t?t.innerText:"",s=()=>this.showToast("✅ Payload copiado al portapapeles");if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(e).then(s).catch(()=>this.showToast("⚠️ No se pudo copiar"));else{const a=document.createElement("textarea");a.value=e,document.body.appendChild(a),a.select();try{document.execCommand("copy"),s()}catch{this.showToast("⚠️ No se pudo copiar")}a.remove()}},ecQuoteUI(t){return this._quoteUI=this._quoteUI||{},this._quoteUI[t]||(this._quoteUI[t]=Ne()),this._quoteUI[t]},ecInvalidateQuote(t){this._quoteUI&&(this._quoteUI[t]=Ne()),this.renderQuoteSection(t)},ecRestoreQuoteSections(){this._quoteUI=this._quoteUI||{},!(typeof document>"u")&&document.querySelectorAll("[data-quote-section]").forEach(t=>{const e=t.getAttribute("data-quote-section");e&&this.renderQuoteSection(e)})},async fetchLiveRates(t){const e=(this.state.sales||[]).find(r=>r.id===t);if(!e)return;const s=this.ecShipUI(t),a=this.ecBuildShipmentInput(e,s),o=tt(a);if(o.length){this.showToast("⚠️ Completá CP, país y peso para cotizar: "+o[0].message);return}const i=this._quoteUI[t]=Ne();i.status=Ye,this.renderQuoteSection(t);try{const r=await fetch(`${j}/api/shipmondo/quotes`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:t,sender:{country_code:ht,zipcode:mt},receiver:{country_code:a.receiver.country_code,zipcode:a.receiver.zipcode},parcels:[{weight:a.parcel.weight}]})});if(!r.ok)throw new Error(`HTTP ${r.status}`);const n=await r.json();if(i.rates=gt(n.rates||[]),!i.rates.length)throw new Error("Sin tarifas");i.status=Ze}catch{i.status=Je,i.error="No se pudieron cargar las tarifas. Revisá la conexión e intentá de nuevo."}this.renderQuoteSection(t)},renderQuoteSection(t){const e=document.querySelector(`[data-quote-section="${t}"]`);if(!e)return;const s=(this.state.sales||[]).find(i=>i.id===t);if(s&&this.isPickupOrder(s)){e.innerHTML=`
            <div class="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3" onclick="event.stopPropagation()">
                <div class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <i class="ph-bold ph-tag"></i>Cotización
                </div>
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5">
                        <i class="ph-bold ph-storefront text-emerald-600 text-lg"></i>
                        <div>
                            <p class="text-xs font-extrabold text-brand-dark">Retiro en tienda</p>
                            <p class="text-[11px] text-slate-500">El cliente pasa a buscarlo</p>
                        </div>
                    </div>
                    <p class="text-base font-extrabold text-emerald-700 whitespace-nowrap">0,00 kr</p>
                </div>
            </div>`;return}const a=this.ecQuoteUI(t),o=`
            <div class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <i class="ph-bold ph-tag"></i>Cotización en tiempo real
            </div>`;if(a.status===st){const i=(this.state.sales||[]).find(n=>n.id===t),r=i?tt(this.ecBuildShipmentInput(i,this.ecShipUI(t))):[{message:""}];e.innerHTML=`
            <div class="mt-2.5 rounded-xl border border-dashed border-slate-200 bg-white/60 p-3" onclick="event.stopPropagation()">
                ${o}
                ${r.length?'<p class="text-[11px] text-slate-400 font-semibold">Completá código postal, país y peso para cotizar las tarifas.</p>':`<button onclick="app.fetchLiveRates('${t}')" class="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:border-brand-orange hover:text-brand-orange transition-colors flex items-center justify-center gap-2">
                        <i class="ph-bold ph-tag"></i>Cotizar envío</button>
                       <p class="text-[10px] text-slate-400 mt-1.5 text-center">Tarifas en vivo de Shipmondo según peso y destino</p>`}
            </div>`;return}if(a.status===Ye){e.innerHTML=`
            <div class="mt-2.5 rounded-xl border border-slate-200 bg-white/60 p-3" onclick="event.stopPropagation()">
                ${o}
                <div class="rate-group" aria-hidden="true">
                    ${[1,2,3].map(()=>'<div class="rate-card skeleton"><div class="sk-line"></div><div class="sk-line short"></div></div>').join("")}
                </div>
            </div>`;return}if(a.status===Je){e.innerHTML=`
            <div class="mt-2.5 rounded-xl border border-slate-200 bg-white/60 p-3" onclick="event.stopPropagation()">
                ${o}
                <div class="quote-error">
                    <i class="ph-bold ph-warning-circle text-base shrink-0"></i>
                    <span class="flex-1">${F(a.error)}</span>
                    <button onclick="app.fetchLiveRates('${t}')" class="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-[11px] font-bold hover:bg-red-50 transition-colors">Reintentar</button>
                </div>
            </div>`;return}e.innerHTML=`
        <div class="mt-2.5 rounded-xl border border-slate-200 bg-white/60 p-3" onclick="event.stopPropagation()">
            <div class="flex items-center justify-between mb-1">
                <div class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <i class="ph-bold ph-tag"></i>Cotización en tiempo real
                </div>
                <button onclick="app.fetchLiveRates('${t}')" title="Actualizar tarifas" class="text-[10px] font-bold text-slate-400 hover:text-brand-orange uppercase tracking-wider flex items-center gap-1">
                    <i class="ph-bold ph-arrows-clockwise"></i>Actualizar
                </button>
            </div>
            <p class="quote-title">Elegí el método de envío</p>
            <div class="rate-group" role="radiogroup" aria-label="Métodos de envío">
                ${a.rates.map(i=>this.ecRateCardHTML(t,i,a)).join("")}
            </div>
            ${this.ecBuyButtonHTML(t,a)}
        </div>`},ecRateCardHTML(t,e,s){const a=s.selectedRateId===e.id,o=e.serviceType==="shop";return`
        <label class="rate-card ${a?"selected":""}">
            <input type="radio" name="rate-${t}" value="${F(e.id)}" class="sr-only"
                ${a?"checked":""} onchange="app.selectRate('${t}', '${F(e.id)}')" />
            <span class="rate-radio" aria-hidden="true"></span>
            <span class="rate-carrier" data-carrier="${F(e.carrier)}">${F(e.carrierName||e.carrier)}</span>
            <span class="rate-service">${F(e.serviceLabel||"")}</span>
            <span class="rate-eta">${F(e.deliveryEstimate||"")}</span>
            <span class="rate-price">${Ve(e.price)}</span>
            ${a&&o?this.ecServicePointPickerHTML(t,s):""}
        </label>`},ecServicePointPickerHTML(t,e){return e.status===Xe?'<span class="sp-loading">Buscando puntos cercanos…</span>':e.servicePoints.length?`
        <span class="sp-list" role="radiogroup" aria-label="Punto de retiro">
            ${e.servicePoints.map(s=>`
            <label class="sp-item ${e.selectedPointId===s.id?"selected":""}">
                <input type="radio" name="sp-${t}" value="${F(s.id)}" class="sr-only"
                    ${e.selectedPointId===s.id?"checked":""}
                    onchange="app.selectServicePoint('${t}', '${F(s.id)}')" />
                <span class="sp-radio" aria-hidden="true"></span>
                <span class="sp-name">${F(s.name)}</span>
                <span class="sp-addr">${F(s.address1)}, ${F(s.zipcode)} ${F(s.city)}</span>
                <span class="sp-dist">${s.distanceKm!=null?F(s.distanceKm)+" km":""}</span>
            </label>`).join("")}
        </span>`:'<span class="sp-empty">No se encontraron puntos cercanos.</span>'},ecBuyButtonHTML(t,e){const s=je(e);return s.rate?`
        <button onclick="app.buyLabel('${t}')" ${s.ready?"":"disabled"}
            class="w-full mt-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${s.ready?"bg-brand-dark text-white hover:bg-black":"bg-slate-200 text-slate-400 cursor-not-allowed"}">
            <i class="ph-bold ph-tag"></i>${s.label}</button>
        <p class="buy-hint">${s.ready?"Se descuenta de tu saldo de Shipmondo":s.needsPoint?"Elegí un punto de retiro para continuar":"Elegí una tarifa para continuar"}</p>`:'<button class="w-full mt-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-400 cursor-not-allowed" disabled>Elegí una tarifa para continuar</button>'},async selectRate(t,e){const s=this.ecQuoteUI(t),a=(s.rates||[]).find(i=>i.id===e);if(!a)return;if(s.selectedRateId=e,s.selectedPointId=null,s.servicePoints=[],a.serviceType==="shop"){s.status=Xe,this.renderQuoteSection(t);try{const i=(this.state.sales||[]).find(h=>h.id===t),n=(i&&i.customer||{}).shipping||{},c=new URLSearchParams({country_code:String(n.country||"").trim().toUpperCase(),zipcode:String(n.postal_code||n.zip||"").trim(),carrier:a.carrier||"",limit:"3"}),l=await fetch(`${j}/api/shipmondo/service-points?${c.toString()}`);if(!l.ok)throw new Error(`HTTP ${l.status}`);const d=await l.json();s.servicePoints=(d.servicePoints||[]).slice(0,3)}catch{s.servicePoints=[]}s.status=Ze}else s.status=et;const o=this.ecShipUI(t);o.shippingMethod=a.productCode||a.id,a.serviceType!=="shop"&&delete o.servicePointId,this.refreshCurrentView()},selectServicePoint(t,e){const s=this.ecQuoteUI(t),a=(s.servicePoints||[]).find(i=>i.id===e);if(!a)return;s.selectedPointId=e,s.status=et;const o=this.ecShipUI(t);o.servicePointId=e,o.spSelected={id:String(a.id),name:a.name||"",address1:a.address1||"",city:a.city||""},this.refreshCurrentView()},buyLabel(t){return this.openLabelModal(t)},ecExtractTracking(t){const e=t&&t.shipment||t||{};return e.tracking_number||e.trackingNumber||e.tracking_code||e.trackingCode||e.consignment_number||e.consignmentNumber||""},ecExtractLabelUrl(t){const e=t&&t.shipment||t||{};return e.label_url||e.labelUrl||e.label_pdf||e.labelPdf||""},openLabelModal(t){const e=(this.state.sales||[]).find(l=>l.id===t);if(!e)return;const s=this.ecShipUI(t),a=this.ecBuildShipmentInput(e,s),o=_e(a);if(o.length){this.showToast("⚠️ Faltan datos para generar la etiqueta: "+o[0].message);return}const i=this.ecQuoteUI(t),r=je(i),n=r.ready?r.rate:null,c=`
        <div id="qf-modal-overlay" class="vf-overlay" onclick="if(event.target.id==='qf-modal-overlay')app.closeQuickFixModal()">
            <aside class="vf-panel cx-view" role="dialog" aria-modal="true" aria-labelledby="lbl-title" onclick="event.stopPropagation()">
                <header class="vf-head">
                    <div>
                        <h3 id="lbl-title" class="vf-title">Generar etiqueta</h3>
                        <p class="cx-sub !mt-1">Pedido #${e.orderNumber||e.id.slice(0,6)}. Al guardar, pasa a Etiqueta creada.</p>
                    </div>
                    <button onclick="app.closeQuickFixModal()" class="cx-btn is-icon" aria-label="Cerrar"><i class="ph ph-x"></i></button>
                </header>
                <div class="vf-body">
                    <section class="vf-card">
                        <h4 class="vf-h">Comprar con Shipmondo</h4>
                        ${n?`<div class="vf-margin !mt-0 mb-3">
                            <div><span class="vf-mini-label">${F(n.carrierName||n.carrier)}</span><p class="text-sm font-semibold">${F(n.serviceLabel||"")}</p></div>
                            <span class="text-2xl font-light tracking-tight">${Ve(n.price)}</span>
                        </div>`:'<p class="text-sm text-stone-600 mb-3">No hay tarifa elegida. Elegí una en la cotización de la tarjeta o cargá el tracking a mano abajo.</p>'}
                        <p class="text-xs font-semibold mb-3 flex items-center gap-2"><i class="ph ph-flask"></i>Por defecto es una prueba y no se cobra.</p>
                        <label class="flex items-start gap-2 mb-4 cursor-pointer p-3 rounded-2xl bg-white/70">
                            <input type="checkbox" id="label-real-${t}" class="mt-0.5 accent-red-600" onclick="event.stopPropagation()">
                            <span class="text-sm"><b>Compra real.</b> Genera una etiqueta de verdad y usa saldo de Shipmondo. Te va a pedir confirmación.</span>
                        </label>
                        <button ${n?"":"disabled"} onclick="app.buyLabelViaAPI('${t}', this)" class="cx-kbtn is-ink !mt-0 ${n?"":"opacity-40 cursor-not-allowed"}">
                            <i class="ph-bold ph-tag"></i>Comprar etiqueta
                        </button>
                        <div id="label-api-result-${t}" class="mt-2"></div>
                    </section>

                    <section class="vf-card">
                        <h4 class="vf-h">O cargar el tracking a mano</h4>
                        <p class="text-xs text-stone-500 mb-3">Si hiciste la etiqueta directamente en Shipmondo, pegá el código acá.</p>
                        <label class="vf-field"><span>Código de seguimiento</span>
                            <input id="lbl-track-${t}" onclick="event.stopPropagation()" class="vf-input font-mono"></label>
                        <div class="grid grid-cols-2 gap-3 mt-3">
                            <label class="vf-field"><span>Transportista</span>
                                <input id="lbl-carrier-${t}" placeholder="DAO" onclick="event.stopPropagation()" class="vf-input"></label>
                            <label class="vf-field"><span>URL o PDF de la etiqueta</span>
                                <input id="lbl-url-${t}" placeholder="Opcional" onclick="event.stopPropagation()" class="vf-input"></label>
                        </div>
                        <button onclick="app.saveManualTracking('${t}', this)" class="cx-kbtn !mt-4">
                            <i class="ph-bold ph-check"></i>Guardar y marcar etiqueta creada
                        </button>
                    </section>
                </div>
                <footer class="vf-foot">
                    <span></span>
                    <button onclick="app.closeQuickFixModal()" class="cx-btn">Cerrar</button>
                </footer>
            </aside>
        </div>`;document.body.insertAdjacentHTML("beforeend",c)},async buyLabelViaAPI(t,e){var n;const s=(this.state.sales||[]).find(c=>c.id===t);if(!s)return;const a=this.ecQuoteUI(t),o=je(a);if(!o.ready){this.showToast("⚠️ Elegí una tarifa"+(o.needsPoint?" y un punto de retiro":"")+" para comprar por API");return}const i=((n=document.getElementById(`label-real-${t}`))==null?void 0:n.checked)===!0;if(i&&!confirm(`⚠️ COMPRA REAL

Esto genera una etiqueta de verdad y gasta saldo de Shipmondo.

¿Confirmás la compra real?`))return;const r=e.innerHTML;try{e.disabled=!0,e.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Comprando...';const c=this.ecShipUI(t),l=this.ecBuildShipmentInput(s,c),d=ut(s,l),h=o.rate,u=o.needsPoint?(a.servicePoints||[]).find(E=>E.id===a.selectedPointId):null,p=await le.buyShipmondoLabel({orderId:s.id,productCode:h.productCode,servicePointId:u?u.id:void 0,shipment:d,testMode:!i}),b=this.ecExtractTracking(p),y=this.ecExtractLabelUrl(p),v=h.carrierName||h.carrier||"";if(!b){const E=document.getElementById(`label-api-result-${t}`);E&&(E.innerHTML=`<div class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700">⚠️ La API no devolvió tracking (modo ${p.testMode?"prueba":"real"}). Pegalo manual abajo para completar.</div>`),this.showToast("⚠️ Sin tracking en la respuesta — pegalo manual","error");return}await le.setLabelCreated(t,{trackingNumber:b,carrier:v,labelUrl:y}),this.showToast(`✅ Etiqueta creada · tracking ${b}${p.testMode?" (modo prueba)":""}`),this.closeQuickFixModal(),await this.loadData(),this.refreshCurrentView()}catch(c){console.error("buyLabelViaAPI:",c),this.showToast("Error al comprar la etiqueta: "+(c.message||c),"error")}finally{e.disabled=!1,e.innerHTML=r}},async saveManualTracking(t,e){var r,n,c;const s=((r=document.getElementById(`lbl-track-${t}`))==null?void 0:r.value.trim())||"",a=((n=document.getElementById(`lbl-carrier-${t}`))==null?void 0:n.value.trim())||"",o=((c=document.getElementById(`lbl-url-${t}`))==null?void 0:c.value.trim())||"";if(!s){this.showToast("⚠️ Pegá el código de seguimiento","error");return}const i=e.innerHTML;try{e.disabled=!0,e.innerHTML='<i class="ph-bold ph-circle-notch animate-spin"></i> Guardando...',await le.setLabelCreated(t,{trackingNumber:s,carrier:a,labelUrl:o}),this.showToast(`✅ Etiqueta creada · tracking ${s}`),this.closeQuickFixModal(),await this.loadData(),this.refreshCurrentView()}catch(l){console.error("saveManualTracking:",l),this.showToast("Error al guardar: "+(l.message||l),"error")}finally{e.disabled=!1,e.innerHTML=i}},renderShipping(t){const e=this.state.sales.filter(c=>this.isShippableChannel(c)),s={preparar:[],etiqueta:[],despachado:[],excepcion:[]};e.forEach(c=>{s[this.shipKanbanColumn(c)].push(c)});const a=(c,l)=>new Date(c.date)-new Date(l.date);s.preparar.sort(a),s.etiqueta.sort(a),s.excepcion.sort(a),s.despachado.sort((c,l)=>{var d,h;return new Date((d=l.updated_at)!=null&&d.toDate?l.updated_at.toDate():l.updated_at||l.date)-new Date((h=c.updated_at)!=null&&h.toDate?c.updated_at.toDate():c.updated_at||c.date)});const o=s.despachado.slice(0,12),i=s.preparar.length+s.etiqueta.length+s.excepcion.length,r=[{key:"preparar",label:"Preparar",dot:"#B9B4AA",hint:"Pedidos nuevos por preparar"},{key:"etiqueta",label:"Etiqueta creada",dot:"#E2C531",hint:"Listos para despachar o retirar"},{key:"despachado",label:"Despachado",dot:"#1A1A1A",hint:"Últimos 12 cerrados"},{key:"excepcion",label:"Excepción",dot:"#F05A28",hint:"Requieren acción"}],n=`
            <div class="cx-view">
            <div class="max-w-[1600px] mx-auto px-4 md:px-8 pb-24 pt-6">
                ${this.sectionHeader({title:"Envíos",subtitle:"Pedidos de Web shop, Discogs y envíos manuales, de la preparación al despacho",filters:`
                        <button onclick="app.exportShippingList()" class="cx-btn">
                            <i class="ph ph-download-simple"></i><span class="hidden sm:inline">Exportar lista</span>
                        </button>`,primary:{label:"Crear envío",icon:"ph-plus",onclick:"app.openManualShipmentModal()"}})}

                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <div class="cx-tile cx-yellow">
                        <span class="cx-tile-label">Pendientes</span>
                        <b class="cx-tile-value">${i} <small>pedidos</small></b>
                        <span class="cx-tile-stripes" aria-hidden="true"></span>
                    </div>
                    <div class="cx-tile cx-orange">
                        <span class="cx-tile-label">Cobrado en envíos (aprox.)</span>
                        <b class="cx-tile-value">${this.formatCurrency(e.reduce((c,l)=>c+parseFloat(l.shipping||l.shipping_cost||0),0))}</b>
                        <span class="cx-tile-dots" aria-hidden="true"></span>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                    ${r.map(c=>{const l=c.key==="despachado"?o:s[c.key];return`
                        <div class="cx-kcol">
                            <div class="flex items-center justify-between px-2 pt-1 pb-3">
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${c.dot}"></span>
                                    <span class="text-sm font-semibold">${c.label}</span>
                                    ${c.key==="preparar"?'<button onclick="event.stopPropagation();app.openManualShipmentModal()" title="Crear envío manual" aria-label="Crear envío manual" class="cx-row-btn !w-6 !h-6 !text-xs"><i class="ph-bold ph-plus"></i></button>':""}
                                </div>
                                <span class="cx-count !h-6 !min-w-[26px] !text-xs">${l.length}</span>
                            </div>
                            <div class="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                ${l.length>0?l.map(d=>this.renderShipCard(d)).join(""):`
                                <div class="rounded-2xl border border-dashed border-black/15 py-10 px-4 text-center">
                                    <p class="text-xs text-stone-500">${c.hint}. Nada por ahora.</p>
                                </div>`}
                            </div>
                        </div>`}).join("")}
                </div>
            </div>
            </div>
        `;t.innerHTML=n,this.ecRestoreQuoteSections()},openOrderHistoryModal(t){var c,l,d,h,u,p;const e=this.state.sales.find(b=>b.id===t);if(!e)return;const s=e.history||[],a=(c=e.timestamp)!=null&&c.toDate?e.timestamp.toDate():new Date(e.date);let o=[];s.length>0?o=s.map(b=>({status:b.status,timestamp:new Date(b.timestamp),note:b.note})).sort((b,y)=>y.timestamp-b.timestamp):o.push({status:e.fulfillment_status,timestamp:(l=e.updated_at)!=null&&l.toDate?e.updated_at.toDate():new Date,note:"Última actualización"}),o.push({status:"created",timestamp:a,note:`Orden recibida via ${e.channel||"Online"}`});const i=b=>b==="created"?"bg-slate-100 text-slate-500":b==="preparing"?"bg-blue-100 text-blue-600":b==="ready_for_pickup"?"bg-emerald-100 text-emerald-600":b==="in_transit"?"bg-orange-100 text-orange-600":b==="shipped"||b==="picked_up"?"bg-green-100 text-green-600":"bg-slate-100",r=b=>({created:"Orden Creada",preparing:"En Preparación",ready_for_pickup:"Listo para Retiro",in_transit:"En Tránsito",shipped:"Despachado",picked_up:"Retirado"})[b]||b,n=document.createElement("div");n.className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4",n.onclick=b=>{b.target===n&&n.remove()},n.innerHTML=`
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
                        ${o.map((b,y)=>`
                            <div class="relative">
                                <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${y===0?"bg-brand-orange ring-4 ring-orange-50":"bg-slate-300"}"></div>
                                
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-bold px-2 py-0.5 rounded-full ${i(b.status)}">
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
                            Cliente: <span class="font-bold text-slate-600">${e.customerName||((d=e.customer)==null?void 0:d.name)||((h=e.customer)==null?void 0:h.firstName)+" "+((u=e.customer)==null?void 0:u.lastName)}</span><br>
                            Email: ${e.customerEmail||((p=e.customer)==null?void 0:p.email)}
                       </div>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(n)},fetchDiscogsById(t=null){const e=t||document.getElementById("discogs-search-input").value.trim(),s=document.getElementById("discogs-results");if(!e||!/^\d+$/.test(e)){this.showToast("⚠️ Ingresa un ID numérico válido","error");return}if(!localStorage.getItem("discogs_token")){this.showToast("⚠️ Token no configurado","error");return}s&&(s.innerHTML='<p class="text-xs text-slate-400 animate-pulse p-2">Importando Release por ID...</p>',s.classList.remove("hidden")),fetch(`${j}/discogs/release/${e}`).then(o=>{if(!o.ok)throw new Error(`Error ${o.status}`);return o.json()}).then(o=>{var n;const i=o.release||o,r={id:i.id,title:`${i.artists_sort||((n=i.artists[0])==null?void 0:n.name)} - ${i.title}`,year:i.year,thumb:i.thumb,cover_image:i.images?i.images[0].uri:null,label:i.labels?[i.labels[0].name]:[],format:i.formats?[i.formats[0].name]:[]};this.handleDiscogsSelection(r),s&&s.classList.add("hidden"),this.showToast("✅ Datos importados con éxito")}).catch(o=>{console.error(o),this.showToast("❌ Error al importar ID: "+o.message,"error"),s&&s.classList.add("hidden")})},openBulkImportModal(){const t=document.createElement("div");t.id="bulk-import-modal",t.className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4",t.innerHTML=`
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
        `,document.body.appendChild(t)},async handleBulkImportBatch(){const t=document.getElementById("bulk-csv-data").value.trim();if(!t){this.showToast("Por favor, pega el contenido del CSV.","error");return}const e=document.getElementById("start-bulk-import-btn");e.innerHTML,e.disabled=!0,e.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> Importando...';try{const s=await fetch(`${j}/discogs/bulk-import`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({csvData:t})}),a=await s.json();s.ok&&(this.showToast(`✅ ${a.summary}`),document.getElementById("bulk-import-modal").remove(),await this.loadData(),this.refreshCurrentView())}catch(s){console.error("Bulk import error:",s),this.showToast("❌ "+s.message,"error");const a=document.getElementById("start-bulk-import-btn");a&&(a.disabled=!1,a.innerHTML='<i class="ph-bold ph-rocket-launch"></i> Comenzar Importación')}},async refreshProductMetadata(t){const e=document.getElementById("refresh-metadata-btn");if(!e)return;const s=e.innerHTML;e.disabled=!0,e.innerHTML='<i class="ph-bold ph-spinner animate-spin"></i> ...';try{let a=t;const o=this.state.inventory.find(n=>n.sku===t||n.id===t);o&&o.id&&(a=o.id);const i=await fetch(`${j}/discogs/refresh-metadata/${a}`,{method:"POST",headers:{"Content-Type":"application/json"}}),r=await i.json();if(i.ok){this.showToast("✅ Metadata actualizada correctamente");const n=document.getElementById("modal-overlay");n&&n.remove(),await this.loadData(),this.refreshCurrentView(),o&&this.openProductModal(o.sku)}else throw new Error(r.error||"Error al actualizar metadata")}catch(a){console.error("Refresh metadata error:",a),this.showToast("❌ "+a.message,"error"),e.disabled=!1,e.innerHTML=s}}};window.app=Se;document.addEventListener("DOMContentLoaded",()=>{Se.init()});window.migrateAllData=async function(t=!0){const e=firebase.firestore();console.log(`🚀 Iniciando Migración Total... (Dry Run: ${t})`);try{const s=await e.collection("products").get(),a=await e.collection("sales").get();let o=[],i=[];const r=new Map;for(const n of s.docs){const c=n.data();let l=!1,d={};c.sku&&r.set(c.sku,c),r.set(n.id,c),(!c.provider_origin||c.provider_origin==="Local_Used")&&(c.product_condition==="New"||c.condition==="New"?c.provider_origin!=="EU_B2B"&&(d.provider_origin="EU_B2B",l=!0):c.provider_origin||(d.provider_origin="Local_Used",l=!0)),l&&(o.push({id:n.id,changes:d,name:c.album}),Object.assign(c,d))}for(const n of a.docs){const c=n.data();let l=!1;if(!c.items||!Array.isArray(c.items))continue;let d=c.items.map(h=>{let u={...h},p=null;if(h.productCondition==="New"||h.condition==="New")p="EU_B2B";else if(h.productCondition==="Second-hand"||h.productCondition==="Used")p="Local_Used";else{const b=h.productId||h.recordId,y=r.get(h.sku)||r.get(b);y?p=y.provider_origin||"Local_Used":p="Local_Used"}return u.providerOrigin!==p&&(u.providerOrigin=p,l=!0),u});l&&i.push({id:n.id,items:d})}if(console.log(`📦 Discos de inventario a corregir: ${o.length}`),o.length>0&&console.log("Ejemplo de disco:",o[0]),console.log(`🧾 Ventas a corregir: ${i.length}`),t)console.log("⚠️ MODO DRY RUN. Escribí window.migrateAllData(false) para aplicar los cambios.");else{console.log("💾 Guardando en Firestore...");const n=e.batch();let c=0;const l=async()=>{c>0&&(await n.commit(),console.log(`✅ Batch commited (${c} operaciones)`),c=0)};for(const d of o)n.update(e.collection("products").doc(d.id),d.changes),c++,c>=450&&await l();for(const d of i)n.update(e.collection("sales").doc(d.id),{items:d.items}),c++,c>=450&&await l();await l(),console.log("🎉 Migración Total Finalizada!")}}catch(s){console.error("❌ Error en la migración:",s)}};window.migrateAllData(!0);
