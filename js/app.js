// Enkla hjälpfunktioner för varukorgen (namespacad nyckel)
const FALLBACK_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'><rect width='600' height='800' fill='%23eeeeee'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23777' font-size='24' font-family='sans-serif'>Bild saknas</text></svg>";
function setImgFallback(img){ try{ img.onerror=null; img.src=FALLBACK_IMG; img.alt='Bild saknas'; }catch{} }
const LS_KEY = 'lumora.cart.v1';
function getCart(){
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveCart(c){
  try { localStorage.setItem(LS_KEY, JSON.stringify(c || [])); } catch {}
}
function updateCartBadge(){
  const badge = document.querySelector('.cart-badge');
  const count = getCart().reduce((sum, it) => sum + (it.qty || 1), 0);
  if (!badge) return;
  badge.hidden = count <= 0;
  if (count > 0) badge.textContent = String(count);
  const live = document.getElementById('cartLive');
  if (live) live.textContent = `Varukorg: ${count} artikel${count===1?'':'r'}`;
}

// Tillstånd för paginerad rendering
let ALL_PRODUCTS = [];
let RENDER_INDEX = 0;
const PAGE_SIZE = 8;
let FILTERED = null; // null = ingen sökning; array = filtrerad lista
const LS_WISHLIST = 'lumora.wishlist.v1';

function normalizeProduct(p){
  return {
    id: p.id || (globalThis.crypto?.randomUUID?.() || `p-${Math.random().toString(36).slice(2,7)}`),
    name: p.name?.trim() || 'Produkt',
    scent: p.scent?.trim() || '',
    price: Number.isFinite(p.price) ? p.price : 0,
    image: p.image?.trim() || '',
    description: p.description?.trim() || '',
    mood: p.mood?.trim() || ''
  };
}

/*
  Utvecklarkommentar: Skapar ett produktkort (DOM-nod) för galleriet.
  Innehåller: bild, namn, doft, känsla, pris och en Läs mer-sektion.
*/
function buildProductCard(p){
  const card = document.createElement('div');
  card.className = `ljus-item ${p.id}`;
  const hasPrice = Number.isFinite(p.price) && p.price > 0;
  const priceHtml = hasPrice ? `Pris: ${formatSEK(p.price)}` : 'Pris saknas';
  const scentHtml = p.scent ? `Doft: ${p.scent}` : 'Doft: —';
  const descHtml = p.description || 'Beskrivning saknas';
  const moodHtml = p.mood ? `Känsla: ${p.mood}` : '';
  card.innerHTML = `
    <img class="ljus-img"
         src="${p.image}"
         alt="${p.name}"
         loading="lazy" decoding="async"
         width="1280" height="720"
         referrerpolicy="no-referrer"
         onerror="setImgFallback(this)">
    <div class="product-meta">
      <h3 class="product-title">${p.name}</h3>
      <p class="product-scent">${scentHtml}</p>
      ${moodHtml ? `<p class=\"product-mood\">${moodHtml}</p>` : ''}
      <p class="product-price">${priceHtml}</p>
      <div id="extra-${p.id}" class="product-extra collapsed" aria-hidden="true"></div>
      <button class="btn-read-more" type="button"
              data-id="${p.id}" data-desc="${encodeURIComponent(descHtml)}"
              aria-expanded="false" aria-controls="extra-${p.id}">Läs mer</button>
      <div class="product-actions">
        <button class="btn-add-cart" type="button" data-id="${p.id}">Lägg i varukorg</button>
      </div>
    </div>
  `;
  return card;
}

// Visa/dölj "Visa mer"-knappen beroende på hur många produkter som återstår
function updateLoadMoreVisibility() {
  const btn = document.getElementById('btnLoadMore');
  if (!btn) return;
  const arr = FILTERED || ALL_PRODUCTS;
  btn.hidden = RENDER_INDEX >= arr.length;
}

function appendProductsChunk(count = PAGE_SIZE) {
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;
  const src = FILTERED || ALL_PRODUCTS;
  const end = Math.min(RENDER_INDEX + count, src.length);
  for (let i = RENDER_INDEX; i < end; i++) {
    const card = buildProductCard(src[i]);
    grid.appendChild(card);
  }
  RENDER_INDEX = end;
  updateLoadMoreVisibility();
}

// Hämta produkter och rendera första sidan. Kopplar eventhanterare en gång.
async function loadProducts(){
  try {
    const res = await fetch('data/products.json?v=1');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
  ALL_PRODUCTS = Array.isArray(raw) ? raw.map(normalizeProduct) : [];
    const grid = document.querySelector('.gallery-grid'); if (!grid) return;
    grid.innerHTML = '';
    RENDER_INDEX = 0;
  FILTERED = null;
    appendProductsChunk();
    bindGridOnce(grid);
    bindLoadMoreOnce();
  bindSearchOnce();
    updateLoadMoreVisibility();
    updateCartBadge();
  } catch (err) {
    console.error('Failed to load products:', err);
    document.querySelector('.gallery-grid')?.insertAdjacentHTML('beforeend',
      `<p class="text-danger">Kunde inte ladda produkter. Försök igen.</p>`);
  }
}

function bindGridOnce(grid){
  if (grid.dataset.cartBound) return;
  grid.addEventListener('click', (e) => {
    const btnAdd = e.target.closest('.btn-add-cart');
    if (btnAdd) {
      const id = btnAdd.getAttribute('data-id');
      const cart = getCart();
      const idx = cart.findIndex(i => i.id === id);
      if (idx >= 0) cart[idx].qty = (cart[idx].qty || 1) + 1;
      else cart.push({ id, qty: 1 });
      saveCart(cart);
      updateCartBadge();
      return;
    }
    const btnMore = e.target.closest('.btn-read-more');
    if (btnMore) {
      const card = btnMore.closest('.product-meta');
      if (!card) return;
      const extra = card.querySelector('.product-extra');
      if (!extra) return;
      if (!extra.dataset.populated) {
        const raw = btnMore.getAttribute('data-desc') || '';
        const text = decodeURIComponent(raw);
        const pEl = document.createElement('p');
        pEl.className = 'product-desc';
        pEl.textContent = text;
        extra.appendChild(pEl);
        extra.dataset.populated = '1';
      }
      const collapsed = extra.classList.toggle('collapsed');
      const expanded = !collapsed;
      extra.setAttribute('aria-hidden', String(!expanded));
      btnMore.setAttribute('aria-expanded', String(expanded));
      btnMore.textContent = expanded ? 'Visa mindre' : 'Läs mer';
      return;
    }
  });
  grid.dataset.cartBound = '1';
}

function bindLoadMoreOnce(){
  const btnMore = document.getElementById('btnLoadMore');
  if (!btnMore || btnMore.dataset.bound) return;
  btnMore.addEventListener('click', (e) => {
    e.preventDefault();
    appendProductsChunk(PAGE_SIZE);
  });
  btnMore.dataset.bound = '1';
}

function normalizeText(s){
  try { return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  catch { return (s || '').toString().toLowerCase(); }
}

function filterProducts(query){
  const q = normalizeText(query);
  if (!q) return null;
  return ALL_PRODUCTS.filter(p => {
    const hay = [p.name, p.scent, p.mood, p.description].map(normalizeText).join(' ');
    return hay.includes(q);
  });
}

function renderSearch(query){
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;
  FILTERED = filterProducts(query);
  grid.innerHTML = '';
  RENDER_INDEX = 0;
  appendProductsChunk();
}

function bindSearchOnce(){
  const form = document.getElementById('siteSearchForm');
  const input = document.getElementById('siteSearchInput');
  if (!form || form.dataset.bound) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    renderSearch(input?.value || '');
  });
  input?.addEventListener('input', (e) => {
    const val = e.target.value || '';
    if (!val.trim()) { // återställ
      FILTERED = null;
      const grid = document.querySelector('.gallery-grid');
      if (grid) { grid.innerHTML = ''; RENDER_INDEX = 0; appendProductsChunk(); updateLoadMoreVisibility(); }
    }
  });
  form.dataset.bound = '1';
}

function parseQuery(){
  try {
    const u = new URL(location.href);
    return Object.fromEntries(u.searchParams.entries());
  } catch { return {}; }
}

function setupSearchOverlay(){
  const overlay = document.getElementById('searchOverlay');
  const btnOpen = document.getElementById('btnOpenSearch');
  const closeEls = overlay ? overlay.querySelectorAll('[data-overlay-close]') : null;
  const overlayForm = document.getElementById('overlaySearchForm');
  const overlayInput = document.getElementById('overlaySearchInput');
  if (overlay && btnOpen && !overlay.dataset.bound) {
    const open = () => { overlay.classList.add('active'); setTimeout(()=>overlayInput?.focus(), 0); };
    const close = () => { overlay.classList.remove('active'); };
    btnOpen.addEventListener('click', open);
    closeEls?.forEach(el=> el.addEventListener('click', close));
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
    overlayForm?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const q = overlayInput?.value || '';
      close();
      // Kör sök direkt mot galleriet om det finns
      renderSearch(q);
      // Synka inmatningar om sidans sökfält finns
      const siteInput = document.getElementById('siteSearchInput');
      if (siteInput) siteInput.value = q;
      // Uppdatera URL för deep link
      try { const u = new URL(location.href); u.searchParams.set('q', q); history.replaceState({}, '', u.toString()); } catch {}
    });
    overlay.dataset.bound = '1';
  }
  // Deep link: kör sök om ?q= finns vid laddning
  const params = parseQuery();
  if (params.q) {
    const q = params.q;
    const siteInput = document.getElementById('siteSearchInput');
    const overlayInput2 = document.getElementById('overlaySearchInput');
    if (siteInput) siteInput.value = q;
    if (overlayInput2) overlayInput2.value = q;
    renderSearch(q);
  }
}

function getWishlist(){ try{ return JSON.parse(localStorage.getItem(LS_WISHLIST)||'[]'); } catch{ return []; } }
function saveWishlist(arr){ try{ localStorage.setItem(LS_WISHLIST, JSON.stringify(arr||[])); } catch{} }
function updateWishlistBadge(){
  const b = document.querySelector('.wishlist-badge');
  if (!b) return;
  const count = getWishlist().length;
  b.hidden = count <= 0;
  if (count>0) b.textContent = String(count);
}

function productMap(products) {
  const map = new Map();
  for (const p of products) map.set(p.id, p);
  return map;
}

function formatSEK(v){
  try{ return new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK'}).format(Number(v)||0); }
  catch{ return `${v} kr`; }
}

function renderCart(productsRaw) {
  const products = (productsRaw || []).map(normalizeProduct);
  const itemsEl = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!itemsEl || !totalEl) return;
  const cart = getCart();
  const pmap = productMap(products);
  itemsEl.innerHTML = '';
  let total = 0;
  for (const it of cart) {
    const p = pmap.get(it.id);
    if (!p) continue;
    const qty = it.qty || 1;
    const price = typeof p.price === 'number' ? p.price : 0;
    const line = price * qty;
    total += line;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img class="cart-thumb" src="${p.image}" alt="${p.name}">
      <div>
        <p class="cart-item-title">${p.name}</p>
        ${p.scent ? `<p class=\"cart-item-scent\">Doft: ${p.scent}</p>` : ''}
        ${p.mood ? `<p class=\"cart-item-mood\">Känsla: ${p.mood}</p>` : ''}
        <div class="qty-controls" data-id="${p.id}">
          <button class="qty-btn" type="button" data-action="dec">-</button>
          <span class="qty-val">${qty}</span>
          <button class="qty-btn" type="button" data-action="inc">+</button>
          <button class="remove-btn" type="button" data-action="remove" title="Ta bort">Ta bort</button>
        </div>
      </div>
      <div class="cart-item-price">${formatSEK(line)}</div>
    `;
    itemsEl.appendChild(row);
  }
  totalEl.textContent = formatSEK(total);

  // Knappar i varukorgen (öka/minska/ta bort)
  itemsEl.onclick = (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const wrap = btn.closest('.qty-controls');
    if (!wrap) return;
    const id = wrap.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx < 0) return;
    if (action === 'inc') cart[idx].qty = (cart[idx].qty || 1) + 1;
    if (action === 'dec') cart[idx].qty = Math.max(1, (cart[idx].qty || 1) - 1);
    if (action === 'remove') cart.splice(idx, 1);
    saveCart(cart);
    updateCartBadge();
    renderCart(products);
  };

  // Töm varukorg-knappen
  const clearBtn = document.getElementById('btnClearCart');
  if (clearBtn) clearBtn.onclick = () => {
    saveCart([]);
    updateCartBadge();
    renderCart(products);
  };
}

window.addEventListener('DOMContentLoaded', async () => {
  // Se till att sök och badge funkar även på sidor utan galleri
  bindSearchOnce();
  setupSearchOverlay();
  updateCartBadge();
  updateWishlistBadge();
  await loadProducts();
  // Uppdatera varukorgens innehåll när offcanvas öppnas
  const cartCanvas = document.getElementById('cartOffcanvas');
  if (cartCanvas) {
    cartCanvas.addEventListener('show.bs.offcanvas', async () => {
      try {
        // Använd redan laddade produkter om de finns; annars hämta igen
        if (ALL_PRODUCTS && ALL_PRODUCTS.length) {
          renderCart(ALL_PRODUCTS);
        } else {
          const res = await fetch('data/products.json');
          const products = await res.json();
          renderCart(products);
        }
      } catch (e) {
        console.error('Kunde inte rendera varukorg', e);
      }
    });
  }
  // Lägg till swipe-to-close på hamburgarmenyn (offcanvas från höger)
  try {
    const menu = document.getElementById('offcanvasDarkNavbar');
    if (menu && !menu.dataset.swipeBound) {
      let startX = 0, startY = 0, tracking = false;
      const threshold = 40; // px för att trigga stängning
      menu.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        tracking = true;
      }, { passive: true });
      menu.addEventListener('touchmove', (e) => {
        if (!tracking) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        // Horisontell gest åt höger (panel är på högersidan)
        if (Math.abs(dx) > Math.abs(dy) && dx > threshold) {
          const inst = bootstrap.Offcanvas.getOrCreateInstance(menu);
          inst.hide();
          tracking = false;
        }
      }, { passive: true });
      menu.addEventListener('touchend', () => { tracking = false; }, { passive: true });
      menu.dataset.swipeBound = '1';
    }
  } catch {}
});
