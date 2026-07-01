/* ── Detect slow connection & disable animations ── */
if (navigator.connection?.effectiveType === '3g' || navigator.connection?.effectiveType === '2g' || navigator.connection?.saveData) {
  document.documentElement.style.setProperty('--animation-duration', '0.01ms');
}

/* ── Scroll reveal ── */
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));
}

/* ── Min date ── */
const dateInput = document.getElementById('f-date');
if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

/* ── Mobile nav ── */
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');
hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  mobileNav.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', String(open));
  hamburger.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  mobileNav.setAttribute('aria-hidden', String(!open));
});
document.querySelectorAll('.mobile-nav a').forEach(a => a.addEventListener('click', () => {
  hamburger.classList.remove('open');
  mobileNav.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-label', 'Open navigation menu');
  mobileNav.setAttribute('aria-hidden', 'true');
}));

/* ── Section nav highlight ── */
const sectionNavLinks = [...document.querySelectorAll('[data-nav-link]')];
const sectionTargets = sectionNavLinks
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const setActiveSection = id => {
  sectionNavLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
  });
};

const sectionObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (visible) setActiveSection(visible.target.id);
}, { rootMargin: '-38% 0px -48% 0px', threshold: [0.08, 0.2, 0.4] });

sectionTargets.forEach(section => sectionObserver.observe(section));
setActiveSection('home');

/* ── WhatsApp submit ── */
document.getElementById('booking-form').addEventListener('submit', submitToWhatsApp);

function submitToWhatsApp(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const bookingStatus = document.getElementById('booking-status');
  if (!form.checkValidity()) {
    bookingStatus.textContent = 'Please complete the required fields before continuing.';
    form.reportValidity();
    return;
  }
  const name     = document.getElementById('f-name').value.trim();
  const phone    = document.getElementById('f-phone').value.trim();
  const email    = document.getElementById('f-email').value.trim();
  const branch   = document.getElementById('f-branch').value;
  const pickup   = document.getElementById('f-pickup').value.trim();
  const delivery = document.getElementById('f-delivery').value.trim();
  const service  = document.getElementById('f-service').value;
  const date     = document.getElementById('f-date').value;
  const time     = document.getElementById('f-time').value;
  const notes    = document.getElementById('f-notes').value.trim();

  const required = [
    { val: name,    id: 'f-name' },
    { val: phone,   id: 'f-phone' },
    { val: branch,  id: 'f-branch' },
    { val: pickup,  id: 'f-pickup' },
    { val: service, id: 'f-service' },
    { val: date,    id: 'f-date' },
    { val: time,    id: 'f-time' },
  ];

  let hasError = false;
  required.forEach(f => {
    const el = document.getElementById(f.id);
    if (!f.val && el) {
      el.style.borderColor = '#E24B4A';
      el.addEventListener('input',  () => el.style.borderColor = '', { once: true });
      el.addEventListener('change', () => el.style.borderColor = '', { once: true });
      hasError = true;
    }
  });
  if (hasError) return;

  const fmtTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return (hr > 12 ? hr - 12 : hr || 12) + ':' + m + ' ' + (hr >= 12 ? 'PM' : 'AM');
  };

  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  let msg = "🧺 *RESAYLE Laundry — Pickup Booking*\n";
  msg += '━━━━━━━━━━━━━━━━━━━━━━\n\n';
  msg += '*👤 Name:* ' + name + '\n';
  msg += '*📞 Phone:* ' + phone + '\n';
  if (email) msg += '*📧 Email:* ' + email + '\n';
  msg += '\n';
  msg += '*📍 Branch:* ' + branch + '\n';
  msg += '*🏠 Pickup Location:* ' + pickup + '\n';
  if (delivery) msg += '*🚚 Delivery Address:* ' + delivery + '\n';
  msg += '\n';
  msg += '*🫧 Service:* ' + service + '\n';
  msg += '*📅 Date:* ' + fmtDate(date) + '\n';
  msg += '*⏰ Time:* ' + fmtTime(time) + '\n';
  if (notes) msg += '\n*📝 Notes:* ' + notes + '\n';
  msg += '\n━━━━━━━━━━━━━━━━━━━━━━\n';
  msg += '_Sent via RESAYLE_';

  // Save booking to Google Sheets first
  bookingStatus.textContent = 'Saving your booking...';

  const bookingData = {
    action: 'savePickupBooking',
    name,
    phone,
    email,
    branch,
    pickupLocation: pickup,
    deliveryAddress: delivery,
    service,
    bookingDate: date,
    bookingTime: time,
    notes,
    submittedAt: new Date().toISOString(),
    status: 'Pending'
  };

  if (ADMIN_SCRIPT_URL === 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
    bookingStatus.textContent = 'Your booking message is ready in WhatsApp.';
    form.reset();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  fetch(ADMIN_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(bookingData),
    signal: controller.signal
  })
    .then(response => {
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return response.json();
    })
    .then(result => {
      if (result.success) {
        bookingStatus.textContent = 'Booking saved! Now opening WhatsApp to confirm...';
        form.reset();
        setTimeout(() => {
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
        }, 800);
      } else {
        throw new Error(result.error || 'Booking save failed');
      }
    })
    .catch(error => {
      clearTimeout(timeout);
      console.warn('Booking save error, opening WhatsApp anyway:', error);
      bookingStatus.textContent = 'Your booking message is ready in WhatsApp.';
      form.reset();
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    });
}

// ════════════════════════════════════════════════════════════════════════════
// PRICING SECTION - CART FUNCTIONALITY
// ════════════════════════════════════════════════════════════════════════════

// The embedded pricing and tracking tools must not depend on config.js loading.
const APP_CONFIG = window.YASSERS_CONFIG || {};
const ADMIN_SCRIPT_URL = APP_CONFIG.APPS_SCRIPT_URL || 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
const TRACK_SCRIPT_URL = ADMIN_SCRIPT_URL;
const WHATSAPP_NUMBER = APP_CONFIG.WHATSAPP_NUMBER || '255713438485';
const USD_TO_TZS = Number(APP_CONFIG.USD_TO_TZS) || 2600;
document.querySelectorAll('a[href^="https://wa.me/"]').forEach(link => {
  link.href = `https://wa.me/${WHATSAPP_NUMBER}`;
});
const BRANCHES = Array.isArray(APP_CONFIG.BRANCHES) && APP_CONFIG.BRANCHES.length
  ? APP_CONFIG.BRANCHES
  : ['Nungwi — North Zanzibar (24/7)', 'Mbweni — Stone Town Area', 'Taveta — South Region'];

const FALLBACK_PRICE_LIST = [
  ['Shirt','Men\'s Clothing',1500,1000],['T-Shirt','Men\'s Clothing',1500,1000],['Jeans Trousers','Men\'s Clothing',2000,1000],['Normal Trousers','Men\'s Clothing',2000,1000],['Short Trousers','Men\'s Clothing',1500,1000],['Pajamas','Men\'s Clothing',2000,1500],['Training Suit','Men\'s Clothing',2500,1500],['Overall','Men\'s Clothing',3000,2000],['Overcoat','Men\'s Clothing',4000,3000],['Bush Shirt','Men\'s Clothing',2000,1500],['Sweater','Men\'s Clothing',2000,1500],['Sports Jacket','Men\'s Clothing',3000,2000],['Blazer','Men\'s Clothing',4000,3000],['2 Piece Full Suit','Men\'s Clothing',6000,5000],['3 Piece Full Suit','Men\'s Clothing',8000,6000],['Kofia','Men\'s Clothing',1000,500],['Seruni','Men\'s Clothing',1500,1000],['Scarf','Men\'s Clothing',1000,800],['Kandura','Men\'s Clothing',2500,2000],['Safari Suit','Men\'s Clothing',3500,2500],['Pants','Men\'s Clothing',1500,1000],['Suit Trousers','Men\'s Clothing',2500,2000],['Socks','Men\'s Clothing',500,null],['Vest','Men\'s Clothing',1000,500],['Punjabi Suit','Men\'s Clothing',3000,2000],['Vest (Kizibao)','Men\'s Clothing',1000,500],['Tie','Men\'s Clothing',1000,800],['Cap','Men\'s Clothing',1000,500],['Underwear','Men\'s Clothing',500,null],['Boxer','Men\'s Clothing',500,null],['Sports Trousers','Men\'s Clothing',1500,1000],
  ['Plain Blouse','Women\'s Clothing',1500,1000],['Kanga','Women\'s Clothing',1000,500],['Jeans Skirt','Women\'s Clothing',2000,1500],['Plain Dress','Women\'s Clothing',2000,1500],['Night Dress','Women\'s Clothing',2000,1500],['Abaya','Women\'s Clothing',3000,2500],['Burqa','Women\'s Clothing',3000,2500],['Hijab','Women\'s Clothing',1000,800],['Hijab with Stones','Women\'s Clothing',2000,1500],['Punjabi Suit','Women\'s Clothing',3000,2000],['Ladies Suit','Women\'s Clothing',4000,3000],['Slip','Women\'s Clothing',1000,800],['Swimsuit','Women\'s Clothing',1500,1000],['Camisole','Women\'s Clothing',1000,500],['Special Dress','Women\'s Clothing',5000,4000],
  ['Napkin','Hotel & Hospitality',500,300],['Duvet','Hotel & Hospitality',5000,4000],['Bath Towel Medium','Hotel & Hospitality',2000,1500],['Bath Towel Large','Hotel & Hospitality',2500,2000],['Face Towel','Hotel & Hospitality',500,null],['Hand Towel','Hotel & Hospitality',1000,500],['Bathrobe','Hotel & Hospitality',3000,2500],['Pillow Cover','Hotel & Hospitality',1000,500],['Heavy Pillow Cover','Hotel & Hospitality',1500,1000],['Decorated Pillow Cover','Hotel & Hospitality',2000,1500],['Single Bedsheet','Hotel & Hospitality',2500,2000],['Double Bedsheet','Hotel & Hospitality',3500,3000],['Mosquito Net','Hotel & Hospitality',3000,null],['Single Blanket','Hotel & Hospitality',4000,3000],['Double Blanket','Hotel & Hospitality',6000,5000],['Heavy Curtains','Hotel & Hospitality',5000,4000],['Light Curtains','Hotel & Hospitality',3000,2500],['Pillow','Hotel & Hospitality',3000,2000],
  ['Door Mat','Household & Specialty',2000,null],['Sofa Seat Cover','Household & Specialty',3000,2500],['Bags','Household & Specialty',2000,1500],['Shoes','Household & Specialty',3000,null]
].map(([item,category,washPress,dryOnly])=>({item,category,washPress,dryOnly}));

let PRICE_LIST = FALLBACK_PRICE_LIST;
let service='washPress', quantity=1, cart=[], currency='TZS';
let pricingReady=false;
const money=n=>Number(n).toLocaleString('en-US');
const displayAmount=tzs=>currency==='USD' ? `US$${(Number(tzs)/USD_TO_TZS).toFixed(2)}` : `${money(tzs)} TSh`;
const currentItem=()=>PRICE_LIST.find(x=>x.category===document.getElementById('category').value&&x.item===document.getElementById('item').value);

function initPricing(){
  const categoryEl=document.getElementById('category'),itemEl=document.getElementById('item');
  const washBtn=document.getElementById('wash-btn'),dryBtn=document.getElementById('dry-btn');
  if(!pricingReady){
    const branchEl=document.getElementById('customer-branch');
    if(branchEl.options.length===1)BRANCHES.forEach(branch=>branchEl.add(new Option(branch,branch)));
    categoryEl.addEventListener('change',()=>populateItems());
    itemEl.addEventListener('change',updatePicker);
    [washBtn,dryBtn].forEach(btn=>btn.addEventListener('click',()=>{if(btn.disabled)return;service=btn.dataset.service;updatePicker()}));
    document.querySelectorAll('#pricing .currency-btn').forEach(btn=>btn.addEventListener('click',()=>{currency=btn.dataset.currency;renderCurrency()}));
    document.getElementById('minus').onclick=()=>{quantity=Math.max(1,quantity-1);updatePicker()};
    document.getElementById('plus').onclick=()=>{quantity=Math.min(99,quantity+1);updatePicker()};
    document.getElementById('add-btn').onclick=addToCart;
    pricingReady=true;
  }
  rebuildPricing();
  renderCart();
}

function rebuildPricing(preferredCategory=document.getElementById('category').value,preferredItem=document.getElementById('item').value){
  const categoryEl=document.getElementById('category');
  const categories=[...new Set(PRICE_LIST.map(x=>x.category))];
  categoryEl.innerHTML='';
  categories.forEach(cat=>categoryEl.add(new Option(cat,cat)));
  if(categories.includes(preferredCategory))categoryEl.value=preferredCategory;
  populateItems(preferredItem);
}

async function loadPriceList(){
  // Built-in prices render immediately; Sheets refreshes them in the background.
  initPricing();
  if(ADMIN_SCRIPT_URL!=='PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5000);
    try{
      const response=await fetch(`${ADMIN_SCRIPT_URL}?action=getPrices`,{signal:controller.signal});
      if(!response.ok)throw new Error(`Price request failed: ${response.status}`);
      const data=await response.json();
      if(data.prices&&data.prices.length){
        const selectedCategory=document.getElementById('category').value;
        const selectedItem=document.getElementById('item').value;
        const sheetPrices=data.prices.map(row=>({item:row.item,category:row.category,washPress:Number(String(row.washPress).replace(/,/g,'')),dryOnly:row.dryOnly===''||row.dryOnly==null?null:Number(String(row.dryOnly).replace(/,/g,''))})).filter(row=>row.item&&row.category&&row.washPress);
        if(sheetPrices.length){
          PRICE_LIST=sheetPrices;
          rebuildPricing(selectedCategory,selectedItem);
        }
      }
    }catch(error){console.warn('Using built-in price list');}
    finally{clearTimeout(timeout);}
  }
}

function populateItems(preferredItem=''){
  const itemEl=document.getElementById('item');
  const items=PRICE_LIST.filter(x=>x.category===document.getElementById('category').value);
  itemEl.innerHTML='';
  items.forEach(x=>itemEl.add(new Option(x.item,x.item)));
  if(items.some(x=>x.item===preferredItem))itemEl.value=preferredItem;
  service='washPress';updatePicker();
}

function updatePicker(){
  const item=currentItem();
  if(!item)return;
  if(service==='dryOnly'&&!item.dryOnly)service='washPress';
  document.getElementById('wash-btn').classList.toggle('active',service==='washPress');
  document.getElementById('dry-btn').classList.toggle('active',service==='dryOnly');
  document.getElementById('wash-btn').setAttribute('aria-pressed',service==='washPress');
  document.getElementById('dry-btn').setAttribute('aria-pressed',service==='dryOnly');
  document.getElementById('dry-btn').disabled=!item.dryOnly;
  document.getElementById('wash-price').textContent=`${displayAmount(item.washPress)} / item`;
  document.getElementById('dry-price').textContent=item.dryOnly?`${displayAmount(item.dryOnly)} / item`:'Not available for this item';
  document.getElementById('quantity').textContent=quantity;
  document.getElementById('add-price').textContent=displayAmount(item[service]*quantity);
}

function renderCurrency(){
  document.querySelectorAll('#pricing .currency-btn').forEach(btn=>{const active=btn.dataset.currency===currency;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active)});
  updatePicker();renderCart();
}

function resetPricingForm(){
  quantity=1;
  service='washPress';
  const categoryEl=document.getElementById('category');
  if(categoryEl&&categoryEl.options.length>0){categoryEl.selectedIndex=0;}
  populateItems();
  updatePicker();
}

function addToCart(){
  const item=currentItem(),key=`${item.category}|${item.item}|${service}`,existing=cart.find(x=>x.key===key);
  if(existing)existing.qty+=quantity;else cart.push({key,item:item.item,category:item.category,service,unitPrice:item[service],qty:quantity});
  quantity=1;updatePicker();renderCart();resetPricingForm();document.getElementById('cart-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function changeCart(key,delta){const row=cart.find(x=>x.key===key);if(!row)return;row.qty+=delta;if(row.qty<=0)cart=cart.filter(x=>x.key!==key);renderCart()}

function cartTotal(){return cart.reduce((sum,x)=>sum+x.unitPrice*x.qty,0)}

function renderCart(){
  const list=document.getElementById('cart-list'),count=cart.reduce((sum,x)=>sum+x.qty,0);
  document.getElementById('total').textContent=displayAmount(cartTotal());
  document.getElementById('checkout-btn').disabled=!cart.length;
  if(!cart.length){
    list.innerHTML='<div style="padding: 42px 24px; text-align: center; color: var(--gray-500); font-size: 12px; font-weight: 300;"><span style="display: block; font-size: 28px; margin-bottom: 10px; opacity: 0.4; letter-spacing: .1em;">✓</span><span style="display: block; line-height: 1.5;">Your cart is waiting<br>for its first item.</span></div>';
    return;
  }
  list.innerHTML=cart.map(x=>`<div style="padding: 18px 28px; border-bottom: 1px solid var(--gray-100); display: grid; grid-template-columns: 1fr auto; gap: 12px;"><div><div style="font-size: 14px; font-weight: 500; color: var(--text); margin-bottom: 4px;">${x.qty}× ${x.item}</div><div style="font-size: 11px; color: var(--gray-500); letter-spacing: .05em;">${x.service==='washPress'?'Wash & Press':'Dry'} · ${displayAmount(x.unitPrice)}/item</div></div><div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: center;"><div style="text-align: right; color: var(--navy); font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; white-space: nowrap; margin-bottom: 8px;">${displayAmount(x.unitPrice*x.qty)}</div><div style="display: flex; justify-content: flex-end; align-items: center; gap: 6px;"><button type="button" aria-label="Decrease quantity" onclick="changeCart('${x.key.replace(/'/g,"\\'")}',-1)" style="width: 28px; height: 28px; border: 1px solid var(--gray-300); border-radius: 50%; background: #fff; color: var(--navy); cursor: pointer; transition: all .2s; font-size: 14px; display: flex; align-items: center; justify-content: center;">−</button><button type="button" aria-label="Increase quantity" onclick="changeCart('${x.key.replace(/'/g,"\\'")}',1)" style="width: 28px; height: 28px; border: 1px solid var(--gray-300); border-radius: 50%; background: #fff; color: var(--navy); cursor: pointer; transition: all .2s; font-size: 14px; display: flex; align-items: center; justify-content: center;">+</button><button class="remove" type="button" onclick="changeCart('${x.key.replace(/'/g,"\\'")}',-${x.qty})" style="border: 0; width: auto; margin-left: 6px; color: #b83a35; font: 500 10px Inter, sans-serif; text-transform: uppercase; letter-spacing: .08em; cursor: pointer; transition: color .2s;">Remove</button></div></div></div>`).join('');
}

const dialog=document.getElementById('checkout-dialog');
document.getElementById('checkout-btn').onclick=()=>{document.getElementById('dialog-total').textContent=displayAmount(cartTotal());dialog.showModal()};
document.getElementById('close-dialog').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
document.getElementById('checkout-form').addEventListener('submit',submitOrder);

async function submitOrder(e){
  e.preventDefault();
  if(!cart.length)return;
  const sendBtn=document.getElementById('send-btn'),status=document.getElementById('checkout-status');
  const phone=document.getElementById('customer-phone').value.trim();
  const email=document.getElementById('customer-email').value.trim();
  const phoneRegex=/^\+[1-9]\d{1,14}$/;const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!phone&&!email){status.style.color='#b83a35';status.textContent='Please enter either a phone number or email address.';return;}
  if(phone&&!phoneRegex.test(phone.replace(/\s/g,''))){status.style.color='#b83a35';status.textContent='Please enter a valid international phone number with country code (e.g., +255 712 345 678 or +1 555 123 4567).';return;}
  if(email&&!emailRegex.test(email)){status.style.color='#b83a35';status.textContent='Please enter a valid email address.';return;}
  sendBtn.disabled=true;sendBtn.textContent='Saving to Google Sheets…';status.textContent='';status.style.color='var(--green)';
  const now=new Date();
  const items=cart.map(x=>({item:x.item,category:x.category,qty:x.qty,service:x.service==='washPress'?'Wash & Press':'Dry',unitPrice:x.unitPrice,subtotal:x.qty*x.unitPrice}));
  const orderTotal=cartTotal(),selectedCurrency=currency;
  const formatOrderAmount=tzs=>selectedCurrency==='USD'?`US$${(Number(tzs)/USD_TO_TZS).toFixed(2)}`:`${money(tzs)} TSh`;
  const order={customerName:document.getElementById('customer-name').value.trim(),phone,branch:document.getElementById('customer-branch').value,pickupLocation:document.getElementById('pickup-location').value.trim(),notes:document.getElementById('customer-notes').value.trim(),dateReceived:now.toISOString().split('T')[0],createdAt:now.toISOString(),items,total:orderTotal,currency:selectedCurrency,quotedTotal:selectedCurrency==='USD'?Number((orderTotal/USD_TO_TZS).toFixed(2)):orderTotal,status:'Received',source:'Website Checkout',serviceType:'Mixed laundry',form_loaded_checkout:document.getElementById('checkout-form-loaded').value,website_checkout:document.getElementById('website_checkout').value};

  try{
    if(ADMIN_SCRIPT_URL==='PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')throw new Error('Google Sheets is not connected yet.');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    let response;
    try{
      response=await fetch(ADMIN_SCRIPT_URL,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'customerOrder',...order}),signal:controller.signal});
    }finally{clearTimeout(timeout);}
    if(!response.ok)throw new Error(`Order save failed: ${response.status}`);
    const result=await response.json();
    if(!result.success)throw new Error(result.error||'Google Sheets did not confirm the order.');

    const orderId=result.orderId;
    order.orderId=orderId;
    const lines=items.map(x=>`• ${x.qty}x ${x.item} — ${x.service} (${formatOrderAmount(x.subtotal)})`).join('\n');
    const message=`Hello RESAYLE Laundry, I would like to place an order.\n\nOrder: ${orderId}\nName: ${order.customerName}\nPhone: ${order.phone}\nBranch: ${order.branch}\nPickup: ${order.pickupLocation}\n\n${lines}\n\nEstimated total: ${formatOrderAmount(order.total)}${selectedCurrency==='USD'?` (rate: 1 USD = ${money(USD_TO_TZS)} TSh)`:''}${order.notes?`\nNotes: ${order.notes}`:''}\n\nPlease confirm my pickup. Thank you.`;

    try{const saved=JSON.parse(localStorage.getItem('yassersCustomerOrders')||'[]');saved.unshift(order);localStorage.setItem('yassersCustomerOrders',JSON.stringify(saved.slice(0,100)))}catch(error){}
    cart=[];quantity=1;renderCart();
    status.textContent=`Order ${orderId} is saved and available in the staff portal. Tap below to finish on WhatsApp.`;
    sendBtn.disabled=false;sendBtn.type='button';sendBtn.textContent='Submit via WhatsApp';
    sendBtn.onclick=()=>{
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,'_blank','noopener');
      dialog.close();e.target.reset();
      sendBtn.onclick=null;sendBtn.type='submit';sendBtn.textContent='Save order to continue';
    };
  }catch(error){
    status.style.color='#b83a35';
    status.textContent=error.name==='AbortError'
      ? 'The connection timed out. Please retry so your order reaches our staff.'
      : error.message==='Google Sheets is not connected yet.'
        ? error.message
        : 'We could not save the order to Google Sheets. Please retry before continuing to WhatsApp.';
    sendBtn.disabled=false;sendBtn.textContent='Retry saving order';
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TRACK SECTION - ORDER TRACKING FUNCTIONALITY
// ════════════════════════════════════════════════════════════════════════════

const STATUSES = ["Received", "Washing", "Dry Cleaning", "Pressing", "Ready For Pickup", "Delivered"];
const STATUS_INDEX = {
  "received": 0, "washing": 1, "dry cleaning": 2,
  "pressing": 3, "ready for pickup": 4, "delivered": 5
};

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const order = params.get('order');
  if (order) {
    document.getElementById('order-input').value = order;
    trackOrder();
  }
  document.getElementById('order-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') trackOrder();
  });
});

function renderProgress(statusStr) {
  const container = document.getElementById('progress-steps');
  const currentIdx = STATUS_INDEX[statusStr.toLowerCase()] ?? 0;
  container.innerHTML = '';
  STATUSES.forEach((s, i) => {
    const step = document.createElement('div');
    step.style.cssText = 'display: flex; flex-direction: column; align-items: center; flex: 1;';
    const dot = document.createElement('div');
    dot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; background: var(--gray-300); transition: background 0.3s; position: relative; z-index: 1;`;
    if (i < currentIdx) dot.style.background = 'var(--green)';
    else if (i === currentIdx) {
      dot.style.background = 'var(--navy)';
      dot.style.boxShadow = '0 0 0 3px rgba(10,31,68,0.15)';
    }
    const name = document.createElement('div');
    name.style.cssText = `font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gray-500); margin-top: 8px; text-align: center;`;
    if (i === currentIdx) {
      name.style.color = 'var(--navy)';
      name.style.fontWeight = '500';
    }
    name.textContent = s;
    step.appendChild(dot);
    step.appendChild(name);
    container.appendChild(step);
    if (i < STATUSES.length - 1) {
      const line = document.createElement('div');
      line.style.cssText = 'flex: 1; height: 1px; background: var(--gray-300); margin: 0 -2px;';
      if (i < currentIdx) line.style.background = 'var(--green)';
      container.appendChild(line);
    }
  });
}

function statusBadgeClass(s) {
  const sl = s.toLowerCase();
  if (sl.includes('ready')) return 'status-ready';
  if (sl.includes('deliver')) return 'status-delivered';
  if (sl.includes('wash')) return 'status-washing';
  if (sl.includes('press')) return 'status-pressing';
  return 'status-received';
}

async function trackOrder() {
  const input = document.getElementById('order-input');
  const orderId = input.value.trim().toUpperCase();
  if (!orderId) return;

  const btn = document.getElementById('search-btn');
  const resultCard = document.getElementById('result-card');
  const notFound = document.getElementById('not-found');

  resultCard.style.display = 'none';
  notFound.style.display = 'none';
  btn.disabled = true;
  btn.textContent = '…';

  try {
    let order = null;

    if (TRACK_SCRIPT_URL !== "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(`${TRACK_SCRIPT_URL}?action=trackOrder&orderId=${encodeURIComponent(orderId)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Tracking request failed: ${res.status}`);
        const data = await res.json();
        if (data.found) order = data.order;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!order) {
      try {
        const localOrders = JSON.parse(localStorage.getItem('yassersCustomerOrders') || '[]');
        order = localOrders.find(row => String(row.orderId).toUpperCase() === orderId) || null;
      } catch (error) { }
    }

    if (order) {
      document.getElementById('res-order-id').textContent = order.orderId || orderId;
      document.getElementById('res-customer').textContent = order.customerName || '—';
      document.getElementById('res-date-received').textContent = order.dateReceived || '—';
      document.getElementById('res-pickup-date').textContent = order.pickupDate || '—';
      document.getElementById('res-branch').textContent = order.branch || '—';
      document.getElementById('res-service').textContent = order.serviceType || '—';

      const amt = order.amountDue || order.total;
      document.getElementById('res-amount').textContent = amt ? parseInt(amt).toLocaleString() + ' TZS' : 'Pending';

      const status = order.status || 'Received';
      const badge = document.getElementById('res-status-badge');
      badge.textContent = status;
      badge.className = 'result-status-badge ' + statusBadgeClass(status);

      // Show completion notification if delivered
      const completionBanner = document.getElementById('completion-banner');
      if (status.toLowerCase().includes('deliver')) {
        completionBanner.style.display = 'block';
        // Store order info for notification (simulate real notification system)
        const notifKey = `notif_${orderId}`;
        if (!localStorage.getItem(notifKey)) {
          localStorage.setItem(notifKey, JSON.stringify({
            orderId, customerName: order.customerName, phone: order.phone || '', email: order.email || '', status, timestamp: Date.now()
          }));
          // In production, this would trigger real WhatsApp/Email notifications
        }
      } else {
        completionBanner.style.display = 'none';
      }

      if (order.notes) {
        document.getElementById('res-notes').textContent = order.notes;
        document.getElementById('res-notes-row').style.display = 'flex';
      }

      renderProgress(status);
      resultCard.style.display = 'block';
    } else {
      document.getElementById('not-found-id').textContent = orderId;
      notFound.style.display = 'block';
    }
  } catch (e) {
    document.getElementById('not-found-id').textContent = orderId;
    notFound.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Track';
  }
}

// Load pricing on page load
loadPriceList();
